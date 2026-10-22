// src/screens/Auth/ChooseRoleScreen.jsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../config/firebase";
import { C } from "../../constants/theme";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";
import { WILAYAS } from "../../constants/wilayas";
import { useAuthContext } from "../../context/AuthContext";
import { initVendorSubscription } from "../../services/subscription.service";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { auth } from "../../config/firebase";
import { KeyboardAvoidingView, Platform } from "react-native";
export default function ChooseRoleScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const { user } = useAuthContext();
  const [role, setRole] = useState("client");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [wilayaModal, setWilayaModal] = useState(false);
  const [wilayaSearch, setWilayaSearch] = useState("");
  const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const [email, setEmail] = useState(user?.email || "");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
  const align = isRTL ? "right" : "left";
  const filtered = WILAYAS.filter(w => w.toLowerCase().includes(wilayaSearch.toLowerCase()));

  const handleContinue = async () => {
  if (!phone.trim()) { setError(isRTL ? "رقم الهاتف مطلوب" : "Téléphone requis"); return; }
  if (!wilaya) { setError(isRTL ? "اختر الولاية" : "Choisissez votre wilaya"); return; }
  if (!user?.email && !email.trim()) { setError(isRTL ? "البريد مطلوب" : "Email requis"); return; }
  if (email && !email.includes("@")) { setError(isRTL ? "بريد غير صالح" : "Email invalide"); return; }
  if (password.length < 6) { setError(isRTL ? "6 أحرف على الأقل" : "Mot de passe min. 6 caractères"); return; }
  if (password !== confirmPassword) { setError(isRTL ? "غير متطابقتين" : "Mots de passe différents"); return; }

  setLoading(true);
  try {
    const userEmail = (user.email || email.trim()).toLowerCase();
    
    const credential = EmailAuthProvider.credential(userEmail, password);
    await linkWithCredential(auth.currentUser, credential);

   await updateDoc(doc(db, "users", user.uid), {
  role, 
  phone: phone.trim(), 
  wilaya,
  email: userEmail,
  firebaseEmail: userEmail,
  displayName: user.displayName || email.split("@")[0] || "Utilisateur",  // ← Ajoute cette ligne
});

    if (role === "vendeur") await initVendorSubscription(user.uid);
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  } catch (e) {
    if (e.code === "auth/email-already-in-use") {
      setError(isRTL ? "هذا البريد مستخدم" : "Email déjà utilisé");
    } else {
      setError(e.message);
    }
  }
  setLoading(false);
};

const roles = [
  { v: "client", label: isRTL ? "مشتري" : "Client", icon: "person-outline", desc: isRTL ? "بحث وشراء" : "Rechercher & acheter" },
  { v: "vendeur", label: isRTL ? "بائع" : "Vendeur", icon: "storefront-outline", desc: isRTL ? "نشر وبيع" : "Publier & vendre" },
];
  return (
  <KeyboardAvoidingView 
    style={{ flex: 1, backgroundColor: C.bg }} 
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <ScrollView 
      style={s.container} 
      contentContainerStyle={s.inner} 
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.header}>
        <View style={s.iconWrap}><Ionicons name="checkmark-circle" size={40} color={C.accent} /></View>
        <Text style={s.title}>{isRTL ? "خطوة أخيرة" : "Dernière étape"}</Text>
        <Text style={s.sub}>{isRTL ? "أكمل ملفك الشخصي" : "Complétez votre profil"}</Text>
      </View>

      <Text style={[s.label, { textAlign: align }]}>{isRTL ? "نوع الحساب" : "Type de compte"}</Text>
      <View style={s.roleRow}>
        {roles.map(r => (
  <TouchableOpacity key={r.v} onPress={() => setRole(r.v)}
    style={[s.roleCard, role === r.v && s.roleCardActive]}>
    {role === r.v && <View style={s.checkBadge}><Ionicons name="checkmark" size={11} color="#000" /></View>}
    <Ionicons name={r.icon} size={28} color={role === r.v ? C.accent : C.textMuted} />
    <View style={{ flex: 1 }}>
      <Text style={[s.roleTxt, role === r.v && { color: C.accent }]}>{r.label}</Text>
      <Text style={s.roleDesc}>{r.desc}</Text>
    </View>
  </TouchableOpacity>
))}
      </View>

      {error ? <View style={s.errorBox}><Ionicons name="alert-circle-outline" size={16} color={C.danger} /><Text style={s.errorTxt}>{error}</Text></View> : null}

      <Text style={[s.label, { textAlign: align, marginTop: 20 }]}>{isRTL ? "رقم الهاتف" : "Téléphone"}</Text>
      <View style={s.inp}>
        <Ionicons name="call-outline" size={18} color={C.textDim} />
        <TextInput style={s.inpText} placeholder="0655 123 456" placeholderTextColor={C.textDim}
          value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </View>
<Text style={[s.label, { textAlign: align, marginTop: 14 }]}>{isRTL ? "الولاية" : "Wilaya"}</Text>
<TouchableOpacity onPress={() => setWilayaModal(true)} style={s.wilayaBtn}>
  <Ionicons name="location-outline" size={18} color={wilaya ? C.accent : C.textDim} />
  <Text style={[s.wilayaTxt, { color: wilaya ? C.text : C.textDim }]}>{wilaya || (isRTL ? "اختر ولايتك" : "Choisir...")}</Text>
  <Ionicons name="chevron-down" size={18} color={C.textDim} />
</TouchableOpacity>

{!user?.email && (
  <>
    <Text style={[s.label, { textAlign: align, marginTop: 14 }]}>Email</Text>
    <View style={s.inp}>
      <Ionicons name="mail-outline" size={18} color={C.textDim} />
      <TextInput style={s.inpText} 
        placeholder="votre@email.com" 
        placeholderTextColor={C.textDim}
        value={email} onChangeText={setEmail} 
        keyboardType="email-address" autoCapitalize="none" />
    </View>
  </>
)}

<Text style={[s.label, { textAlign: align, marginTop: 14 }]}>
  {isRTL ? "كلمة المرور" : "Mot de passe"}
</Text>
<View style={s.inp}>
  <Ionicons name="lock-closed-outline" size={18} color={C.textDim} />
  <TextInput style={s.inpText} 
    placeholder={isRTL ? "6 أحرف على الأقل" : "Min. 6 caractères"} 
    placeholderTextColor={C.textDim}
    value={password} onChangeText={setPassword} 
    secureTextEntry={!showPassword} />
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
    <Ionicons 
      name={showPassword ? "eye-off-outline" : "eye-outline"} 
      size={20} 
      color={C.textDim} 
    />
  </TouchableOpacity>
</View>

<Text style={[s.label, { textAlign: align, marginTop: 14 }]}>
  {isRTL ? "تأكيد كلمة المرور" : "Confirmer"}
</Text>
<View style={s.inp}>
  <Ionicons name="lock-closed-outline" size={18} color={C.textDim} />
  <TextInput style={s.inpText} 
    placeholder={isRTL ? "أعد كلمة المرور" : "Répéter"} 
    placeholderTextColor={C.textDim}
    value={confirmPassword} onChangeText={setConfirmPassword} 
    secureTextEntry={!showConfirmPassword} />
  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
    <Ionicons 
      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
      size={20} 
      color={C.textDim} 
    />
  </TouchableOpacity>
</View>

<View style={{ height: 24 }} />
<Btn onPress={handleContinue} loading={loading}>{isRTL ? "متابعة" : "Continuer"}</Btn>

      <Modal visible={wilayaModal} animationType="slide" transparent>
        <View style={s.mOv}>
          <View style={s.mSh}>
            <View style={s.mH} />
            <Text style={s.mT}>{isRTL ? "اختر ولايتك" : "Choisir wilaya"}</Text>
            <View style={s.sBox}>
              <Ionicons name="search-outline" size={16} color={C.textDim} />
              <TextInput style={s.sInp} placeholder="Rechercher..." placeholderTextColor={C.textDim}
                value={wilayaSearch} onChangeText={setWilayaSearch} autoFocus />
            </View>
            <FlatList data={filtered} keyExtractor={i => i} style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => { setWilaya(item); setWilayaModal(false); setWilayaSearch(""); }}
                  style={[s.mR, wilaya === item && { backgroundColor: C.accent + "10" }]}>
                  <Text style={[s.mRT, wilaya === item && { color: C.accent, fontWeight: "800" }]}>{item}</Text>
                  {wilaya === item && <Ionicons name="checkmark" size={18} color={C.accent} />}
                </TouchableOpacity>
              )} />
            <TouchableOpacity onPress={() => setWilayaModal(false)} style={s.mC}>
              <Text style={s.mCT}>{isRTL ? "إلغاء" : "Annuler"}</Text>
            </TouchableOpacity>
          </View>
        </View>
</Modal>
    </ScrollView>
  </KeyboardAvoidingView>
);
  
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 30, gap: 8 },
  iconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 26, fontWeight: "900", color: C.text },
  sub: { fontSize: 14, color: C.textMuted },
  label: { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  roleRow: { flexDirection: "row", gap: 12 },
  roleCard: { flex:1 ,backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 16, alignItems: "center", gap: 6, position: "relative" },
  roleCardActive: { borderColor: C.accent, backgroundColor: C.accent + "08" },
  checkBadge: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  roleTxt: { fontSize: 15, fontWeight: "800", color: C.textMuted, marginTop: 6 },
  roleDesc: { fontSize: 10, color: C.textDim, textAlign: "center" },
  errorBox: { flexDirection: "row", gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginTop: 16, alignItems: "center" },
  errorTxt: { fontSize: 13, color: C.danger, flex: 1 },
  inp: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  inpText: { flex: 1, color: C.text, fontSize: 14 },
  wilayaBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  wilayaTxt: { flex: 1, fontSize: 14, fontWeight: "600" },
  mOv: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  mSh: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 28, maxHeight: "85%" },
  mH: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  mT: { fontSize: 18, fontWeight: "900", color: C.text, marginBottom: 14, textAlign: "center" },
  sBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  sInp: { flex: 1, fontSize: 14, color: C.text },
  mR: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  mRT: { fontSize: 15, color: C.text },
  mC: { marginTop: 14, backgroundColor: C.surfaceAlt, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  mCT: { fontSize: 14, fontWeight: "700", color: C.textMuted },
});
