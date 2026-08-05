import React, { useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Modal, FlatList, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import Input from "../../components/Input";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";
import { WILAYAS } from "../../constants/wilayas";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";

export default function RegisterScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [role, setRole]         = useState("client");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [email, setEmail]       = useState("");
  const [wilaya, setWilaya]     = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");

  const filteredWilayas = WILAYAS.filter((w) =>
    w.toLowerCase().includes(wilayaSearch.toLowerCase())
  );

  const align = isRTL ? "right" : "left";

 const handleRegister = async () => {
  if (!name.trim())         { setError(isRTL ? "الاسم مطلوب" : "Le nom est obligatoire"); return; }
  if (!phone.trim())        { setError(isRTL ? "رقم الهاتف مطلوب" : "Le téléphone est obligatoire"); return; }
  if (!email.trim())        { setError(isRTL ? "البريد الإلكتروني مطلوب" : "L'email est obligatoire"); return; }
  if (!email.includes("@")) { setError(isRTL ? "بريد إلكتروني غير صالح" : "Email invalide"); return; }
  if (!wilaya)              { setError(isRTL ? "اختر ولايتك" : "Sélectionnez votre wilaya"); return; }
  if (password.length < 6)  { setError(isRTL ? "كلمة المرور 6 أحرف على الأقل" : "Mot de passe minimum 6 caractères"); return; }
  if (password !== confirm) { setError(isRTL ? "كلمتا المرور غير متطابقتين" : "Les mots de passe ne correspondent pas"); return; }

  setError("");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const uid = cred.user.uid;
    await setDoc(doc(db, "users", uid), {
      uid,
      displayName: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      firebaseEmail: email.trim().toLowerCase(),
      wilaya,
      role,
      verified: false,
      createdAt: serverTimestamp(),
    });
    if (role === "vendeur") {
      const { initVendorSubscription } = await import("../../services/subscription.service");
      await initVendorSubscription(uid);
    }
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  } catch (e) {
    setError(e.code === "auth/email-already-in-use" 
      ? (isRTL ? "هذا البريد مستخدم بالفعل" : "Cet email est déjà utilisé")
      : e.message);
  }
};

  const roles = [
    { v: "client",  label: isRTL ? "مشتري" : "Client",  icon: "person-outline",     desc: isRTL ? "بحث وشراء قطع الغيار" : "Rechercher & acheter des pièces" },
    { v: "vendeur", label: isRTL ? "بائع" : "Vendeur", icon: "storefront-outline", desc: isRTL ? "نشر وبيع قطع الغيار" : "Publier & vendre des pièces" },
  ];

  const roleInfo = role === "client"
    ? (isRTL ? "الوصول: البحث، المفضلة، الطلبات، المراسلة مع البائعين." : "Accès : recherche, favoris, commandes, messagerie avec les vendeurs.")
    : (isRTL ? "الوصول: نشر الإعلانات، لوحة المبيعات، مراسلة العملاء." : "Accès : publier annonces, dashboard ventes, messagerie clients.");

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
        </TouchableOpacity>

        <View style={[s.header, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
          <Text style={[s.title, { textAlign: align }]}>{t("register")}</Text>
          <Text style={[s.sub, { textAlign: align }]}>{isRTL ? "اختر نوع حسابك" : "Choisissez votre type de compte"}</Text>
        </View>

        <View style={[s.roleRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          {roles.map((r) => (
            <TouchableOpacity key={r.v} onPress={() => setRole(r.v)}
              style={[s.roleCard, role === r.v && s.roleCardActive]} activeOpacity={0.8}>
              {role === r.v && <View style={s.checkBadge}><Ionicons name="checkmark" size={11} color="#000" /></View>}
              <View style={[s.roleIconWrap, role === r.v && s.roleIconActive]}>
                <Ionicons name={r.icon} size={26} color={role === r.v ? "#000" : C.textMuted} />
              </View>
              <Text style={[s.roleTxt, role === r.v && s.roleTxtActive]}>{r.label}</Text>
              <Text style={s.roleDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[s.roleInfo, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="information-circle-outline" size={15} color={C.accent} />
          <Text style={[s.roleInfoTxt, { textAlign: align }]}>{roleInfo}</Text>
        </View>

        {error ? (
          <View style={[s.errorBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
            <Text style={[s.errorTxt, { textAlign: align }]}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <Text style={[s.label, { textAlign: align }]}>{t("fullName")}</Text>
          <Input icon="person-outline" placeholder={isRTL ? "اسمك الكامل" : "Votre nom"}
            value={name} onChangeText={setName} rtl={isRTL} />

          <Text style={[s.label, { marginTop: 14, textAlign: align }]}>{t("phone")}</Text>
          <Input icon="call-outline" placeholder="0555 123 456" value={phone}
            onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" rtl={isRTL} />

          <Text style={[s.label, { marginTop: 14, textAlign: align }]}>
            {t("email")} <Text style={{ color: C.danger, fontWeight: "700" }}>*</Text>
          </Text>
          <Input icon="mail-outline" placeholder="votre@email.com" value={email}
            onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" rtl={isRTL} />
          <Text style={[s.emailHint, { textAlign: align }]}>
            {isRTL ? "يُستخدم لاستعادة كلمة المرور" : "Utilisé pour récupérer votre mot de passe"}
          </Text>

          <Text style={[s.label, { marginTop: 14, textAlign: align }]}>
            {isRTL ? "ولايتك" : "Votre wilaya"} <Text style={{ color: C.danger, fontWeight: "700" }}>*</Text>
          </Text>
          <TouchableOpacity
            onPress={() => setWilayaModal(true)}
            style={[s.wilayaBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}
            activeOpacity={0.8}>
            <Ionicons name="location-outline" size={18} color={wilaya ? C.accent : C.textDim} />
            <Text style={[s.wilayaTxt, { color: wilaya ? C.text : C.textDim, textAlign: align }]}>
              {wilaya || (isRTL ? "اختر ولايتك" : "Choisir une wilaya...")}
            </Text>
            <Ionicons name="chevron-down" size={18} color={C.textDim} />
          </TouchableOpacity>
          <Text style={[s.emailHint, { textAlign: align }]}>
            {isRTL
              ? "نستخدمها لحساب رسوم التوصيل"
              : "Utilisée pour calculer les frais de livraison"}
          </Text>

          <Text style={[s.label, { marginTop: 14, textAlign: align }]}>{t("password")}</Text>
          <Input icon="lock-closed-outline"
            placeholder={isRTL ? "6 أحرف على الأقل" : "Minimum 6 caractères"}
            value={password} onChangeText={setPassword} secureTextEntry rtl={isRTL} />

          <Text style={[s.label, { marginTop: 14, textAlign: align }]}>
            {isRTL ? "تأكيد كلمة المرور" : "Confirmer mot de passe"}
          </Text>
          <Input icon="lock-closed-outline"
            placeholder={isRTL ? "أعد كتابة كلمة المرور" : "Répéter le mot de passe"}
            value={confirm} onChangeText={setConfirm} secureTextEntry rtl={isRTL} />
        </View>

        <Btn onPress={handleRegister}>
          {isRTL ? `إنشاء حساب ${role === "client" ? "مشتري" : "بائع"}` : `Créer mon compte ${role}`}
        </Btn>

        <TouchableOpacity onPress={() => navigation.navigate("Login")} style={s.loginBtn}>
          <Text style={[s.loginTxt, { textAlign: "center" }]}>
            {t("hasAccount")}{" "}
            <Text style={{ color: C.accent, fontWeight: "800" }}>{t("login")}</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal sélection wilaya ── */}
      <Modal visible={wilayaModal} animationType="slide" transparent
        onRequestClose={() => setWilayaModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>
              {isRTL ? "اختر ولايتك" : "Choisir votre wilaya"}
            </Text>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={16} color={C.textDim} />
              <TextInput
                style={[s.searchInput, { textAlign: align }]}
                placeholder={isRTL ? "بحث..." : "Rechercher..."}
                placeholderTextColor={C.textDim}
                value={wilayaSearch}
                onChangeText={setWilayaSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredWilayas}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setWilaya(item);
                    setWilayaModal(false);
                    setWilayaSearch("");
                  }}
                  style={[s.modalRow, wilaya === item && s.modalRowActive]}
                  activeOpacity={0.7}>
                  <Text style={[
                    s.modalRowTxt,
                    wilaya === item && { color: C.accent, fontWeight: "800" }
                  ]}>{item}</Text>
                  {wilaya === item && <Ionicons name="checkmark" size={18} color={C.accent} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ paddingVertical: 40, alignItems: "center" }}>
                  <Text style={{ color: C.textDim }}>
                    {isRTL ? "لا توجد نتائج" : "Aucun résultat"}
                  </Text>
                </View>
              }
            />
            <TouchableOpacity
              onPress={() => setWilayaModal(false)}
              style={s.modalClose}>
              <Text style={s.modalCloseTxt}>{isRTL ? "إلغاء" : "Annuler"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  inner:          { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  back:           { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  header:         { marginBottom: 20 },
  title:          { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 4 },
  sub:            { fontSize: 13, color: C.textMuted },
  roleRow:        { gap: 12, marginBottom: 14 },
  roleCard:       { flex: 1, backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 16, alignItems: "center", gap: 6, position: "relative" },
  roleCardActive: { borderColor: C.accent, backgroundColor: C.accent + "08" },
  checkBadge:     { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  roleIconWrap:   { width: 52, height: 52, borderRadius: 16, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  roleIconActive: { backgroundColor: C.accent },
  roleTxt:        { fontSize: 15, fontWeight: "800", color: C.textMuted },
  roleTxtActive:  { color: C.accent },
  roleDesc:       { fontSize: 10, color: C.textDim, textAlign: "center", lineHeight: 14 },
  roleInfo:       { gap: 8, backgroundColor: C.accent + "10", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 10, padding: 12, marginBottom: 20, alignItems: "flex-start" },
  roleInfoTxt:    { flex: 1, fontSize: 12, color: C.textMuted, lineHeight: 17 },
  errorBox:       { gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 16, alignItems: "center" },
  errorTxt:       { fontSize: 13, color: C.danger, flex: 1 },
  form:           { marginBottom: 24 },
  label:          { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  emailHint:      { fontSize: 11, color: C.textDim, marginTop: 4, marginBottom: 4 },
  loginBtn:       { alignItems: "center", paddingVertical: 14 },
  loginTxt:       { fontSize: 14, color: C.textMuted },
  // Wilaya picker
  wilayaBtn:      { alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  wilayaTxt:      { flex: 1, fontSize: 14, fontWeight: "600" },
  // Modal
  modalOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet:     { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: "85%" },
  modalHandle:    { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  modalTitle:     { fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 14, textAlign: "center" },
  searchBox:      { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput:    { flex: 1, fontSize: 14, color: C.text },
  modalRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  modalRowActive: { backgroundColor: C.accent + "10" },
  modalRowTxt:    { fontSize: 15, color: C.text },
  modalClose:     { marginTop: 14, backgroundColor: C.surfaceAlt, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  modalCloseTxt:  { fontSize: 14, fontWeight: "700", color: C.textMuted },
});