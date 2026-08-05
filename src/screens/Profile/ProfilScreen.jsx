import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Platform, TextInput, ActivityIndicator, Image, Modal,
  KeyboardAvoidingView, Linking,
} from "react-native";

const SITE_URL = "https://www.autopiecesdz.com";
const openWeb = (path) => Linking.openURL(`${SITE_URL}${path}`).catch(() => {});
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { C } from "../../constants/theme";
import { useCollection } from "../../hooks/useCollection";
import { useAuthContext } from "../../context/AuthContext";
import { logout } from "../../services/auth.service";
import { auth, db } from "../../config/firebase";
import {
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";
import { WILAYAS } from "../../constants/wilayas";

const WILAYAS_LIST = WILAYAS || [
  "Alger","Oran","Constantine","Blida","Sétif","Annaba","Tlemcen",
  "Batna","Béjaïa","Tizi Ouzou","Boumerdès","Tipaza","Médéa","Bouira",
];

export default function ProfilScreen({ navigation }) {
  const { t, isRTL, lang, toggleLang } = useLanguage();
  const { user, profile, setProfile }  = useAuthContext();
  const insets = useSafeAreaInsets();
  const { data: favDocs }  = useCollection("favorites");
  const { data: orders }   = useCollection("orders");
  const { data: listings } = useCollection("listings");
  const { data: ratings }  = useCollection("ratings");

  const [editing, setEditing]       = useState(false);
  const [editName, setEditName]     = useState("");
  const [editPhone, setEditPhone]   = useState("");
  const [editWilaya, setEditWilaya] = useState("");
  const [editPhoto, setEditPhoto]   = useState(null);
  const [saving, setSaving]         = useState(false);

  const [pwModal, setPwModal]       = useState(false);
  const [pwCurrent, setPwCurrent]   = useState("");
  const [pwNew, setPwNew]           = useState("");
  const [pwConfirm, setPwConfirm]   = useState("");
  const [pwLoading, setPwLoading]   = useState(false);

  const userId     = user?.uid || null;
  const myFavs     = (favDocs  || []).filter(f => f.userId   === userId);
  const myOrders   = (orders   || []).filter(o => o.buyerId  === userId);
  const myListings = (listings || []).filter(l => l.sellerId === userId);
  const isVendeur  = profile?.role === "vendeur";
  const myRatings  = (ratings  || []).filter(r => r.sellerId === userId);
  const avgRating  = myRatings.length > 0
    ? (myRatings.reduce((s,r) => s+(r.stars||0), 0) / myRatings.length).toFixed(1)
    : null;

  const row   = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";

  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Utilisateur";
  const initials    = displayName.split(" ").map(w=>w[0]||"").join("").toUpperCase().slice(0,2) || "U";
  const photoUrl    = profile?.photoURL || null;

  const openEdit = () => {
    setEditName(profile?.displayName || "");
    setEditPhone(profile?.phone || "");
    setEditWilaya(profile?.wilaya || "");
    setEditPhoto(null);
    setEditing(true);
  };

  const pickPhoto = async () => {
    Alert.alert(
      isRTL ? "تغيير الصورة" : "Photo de profil", "",
      [
        { text: isRTL ? "الكاميرا" : "Caméra", onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") return;
          const r = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1,1] });
          if (!r.canceled && r.assets?.[0]) setEditPhoto(r.assets[0].uri);
        }},
        { text: isRTL ? "المعرض" : "Galerie", onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") return;
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true, aspect: [1,1] });
          if (!r.canceled && r.assets?.[0]) setEditPhoto(r.assets[0].uri);
        }},
        { text: isRTL ? "إلغاء" : "Annuler", style: "cancel" },
      ]
    );
  };

  const uploadPhoto = async (uri) => {
    // Compress profile photo before upload (avatar = small, 600px max enough)
    const { compressImage } = await import("../../util/compressImage");
    uri = await compressImage(uri, "profile");

    const token  = await auth.currentUser?.getIdToken();
    const filename = `profiles/${userId}/${Date.now()}.jpg`;
    const encoded  = encodeURIComponent(filename);
    const url      = `https://firebasestorage.googleapis.com/v0/b/sustained-hold-486101-b9.firebasestorage.app/o?uploadType=media&name=${encoded}`;
    const res = await FileSystem.uploadAsync(url, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { "Content-Type": "image/jpeg", "Authorization": `Bearer ${token}` },
    });
    if (res.status !== 200) throw new Error("Upload failed");
    return `https://firebasestorage.googleapis.com/v0/b/sustained-hold-486101-b9.firebasestorage.app/o/${encoded}?alt=media`;
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("", isRTL ? "الاسم مطلوب" : "Le nom est obligatoire");
      return;
    }
    setSaving(true);
    try {
      let photoURL = profile?.photoURL || null;
      if (editPhoto) photoURL = await uploadPhoto(editPhoto);
      const updates = {
        displayName: editName.trim(),
        phone:       editPhone.trim(),
        wilaya:      editWilaya,
        ...(photoURL && { photoURL }),
      };
      await updateDoc(doc(db, "users", userId), updates);
      setProfile(prev => ({ ...prev, ...updates }));
      setEditing(false);
      Alert.alert("✅", isRTL ? "تم تحديث الملف الشخصي" : "Profil mis à jour avec succès");
    } catch (e) {
      console.log("[profile save]", e?.code, e?.message);
      Alert.alert("Erreur", isRTL ? "تعذر حفظ الملف الشخصي" : "Impossible d'enregistrer le profil");
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!pwCurrent || !pwNew || !pwConfirm) {
      Alert.alert("", isRTL ? "املأ جميع الحقول" : "Remplissez tous les champs");
      return;
    }
    if (pwNew.length < 6) {
      Alert.alert("", isRTL ? "كلمة المرور 6 أحرف على الأقل" : "Minimum 6 caractères");
      return;
    }
    if (pwNew !== pwConfirm) {
      Alert.alert("", isRTL ? "كلمتا المرور غير متطابقتين" : "Les mots de passe ne correspondent pas");
      return;
    }
    setPwLoading(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, pwCurrent);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwNew);
      setPwModal(false);
      setPwCurrent(""); setPwNew(""); setPwConfirm("");
      Alert.alert("✅", isRTL ? "تم تغيير كلمة المرور" : "Mot de passe changé avec succès");
    } catch (e) {
      console.log("[password change]", e?.code, e?.message);
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        Alert.alert("Erreur", isRTL ? "كلمة المرور الحالية غير صحيحة" : "Mot de passe actuel incorrect");
      } else if (e.code === "auth/weak-password") {
        Alert.alert("Erreur", isRTL ? "كلمة المرور ضعيفة جدًا" : "Mot de passe trop faible");
      } else {
        Alert.alert("Erreur", isRTL ? "تعذر تغيير كلمة المرور" : "Impossible de changer le mot de passe");
      }
    }
    setPwLoading(false);
  };

  const handleLogout = () => {
    Alert.alert(
      isRTL ? "تسجيل الخروج" : "Déconnexion",
      isRTL ? "هل تريد تسجيل الخروج؟" : "Voulez-vous vous déconnecter ?",
      [
        { text: t("cancel"), style: "cancel" },
        { text: isRTL ? "خروج" : "Déconnecter", style: "destructive",
          onPress: async () => {
            await logout();
            navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <View style={s.noAuth}>
        <View style={s.noAuthIcon}><Ionicons name="person-outline" size={40} color={C.textDim} /></View>
        <Text style={s.noAuthTitle}>{isRTL ? "غير متصل" : "Non connecté"}</Text>
        <Text style={[s.noAuthSub, { textAlign: "center" }]}>{t("loginToProfile")}</Text>
        <Btn onPress={() => navigation.navigate("Login")} style={{ marginTop: 20, width: 220 }}>{t("login")}</Btn>
        <Btn variant="ghost" onPress={() => navigation.navigate("Welcome")} style={{ marginTop: 10, width: 220 }}>{t("backToWelcome")}</Btn>
      </View>
    );
  }

  const statsData = isVendeur
    ? [[myListings.length, t("listings")], [myOrders.length, t("orders")], [avgRating ? `⭐ ${avgRating}` : "—", isRTL ? "التقييم" : "Note"]]
    : [[myOrders.length, t("orders")], [myFavs.length, t("favorites")]];

  const sections = isVendeur ? [
    { title: t("mySellerSpace"), items: [
      { label: t("dashboard"),      icon: "stats-chart-outline", count: null,              screen: "SellerDashboard" },
      { label: t("myListingsMenu"), icon: "megaphone-outline",   count: myListings.length, screen: "SellerDashboard" },
      { label: t("clientMessages"), icon: "chatbubbles-outline", count: null,              screen: "Messages" },
    ]},
    { title: t("myAccount"), items: [
      { label: t("myOrders"),      icon: "cube-outline",          count: myOrders.length, screen: "Orders" },
      { label: t("myFavorites"),   icon: "heart-outline",         count: myFavs.length,   screen: "Favorites" },
      { label: t("notifications"), icon: "notifications-outline", count: null,            screen: "Notifications" },
    ]},
    { title: isRTL ? "الإعدادات" : "Paramètres", items: [
      { label: isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe", icon: "lock-closed-outline", count: null, screen: null, onPress: () => setPwModal(true) },
      { label: isRTL ? "مركز المساعدة" : "Centre d'aide",               icon: "help-circle-outline",  count: null, screen: null, onPress: () => openWeb("/aide") },
      { label: isRTL ? "شروط الاستخدام" : "Conditions d'utilisation",   icon: "document-text-outline", count: null, screen: null, onPress: () => openWeb("/conditions") },
      { label: isRTL ? "سياسة الخصوصية" : "Politique de confidentialité", icon: "shield-checkmark-outline", count: null, screen: null, onPress: () => openWeb("/confidentialite") },
    ]},
  ] : [
    { title: t("myAccount"), items: [
      { label: t("myOrders"),      icon: "cube-outline",          count: myOrders.length, screen: "Orders" },
      { label: t("myFavorites"),   icon: "heart-outline",         count: myFavs.length,   screen: "Favorites" },
      { label: t("notifications"), icon: "notifications-outline", count: null,            screen: "Notifications" },
    ]},
    { title: isRTL ? "الإعدادات" : "Paramètres", items: [
      { label: isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe", icon: "lock-closed-outline", count: null, screen: null, onPress: () => setPwModal(true) },
      { label: isRTL ? "مركز المساعدة" : "Centre d'aide",               icon: "help-circle-outline",  count: null, screen: null, onPress: () => openWeb("/aide") },
      { label: isRTL ? "شروط الاستخدام" : "Conditions d'utilisation",   icon: "document-text-outline", count: null, screen: null, onPress: () => openWeb("/conditions") },
      { label: isRTL ? "سياسة الخصوصية" : "Politique de confidentialité", icon: "shield-checkmark-outline", count: null, screen: null, onPress: () => openWeb("/confidentialite") },
    ]},
  ];

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <View style={[s.profileHeader, { paddingTop: insets.top + 16 }]}>
          {/* Langue — positionné sous la barre de statut */}
          <TouchableOpacity
            onPress={toggleLang}
            style={[s.langBtn, { top: insets.top + 12 }]}>
            <Text style={s.langTxt}>{lang === "fr" ? "عربي" : "FR"}</Text>
          </TouchableOpacity>

          {/* Modifier — positionné sous la barre de statut */}
          <TouchableOpacity
            onPress={openEdit}
            style={[s.editBtn, { top: insets.top + 12 }]}>
            <Ionicons name="pencil-outline" size={15} color={C.accent} />
            <Text style={s.editBtnTxt}>{isRTL ? "تعديل" : "Modifier"}</Text>
          </TouchableOpacity>

          {/* AVATAR */}
          <TouchableOpacity onPress={openEdit} style={s.avatarWrap} activeOpacity={0.85}>
            {photoUrl
              ? <Image source={{ uri: photoUrl }} style={s.avatarImg} />
              : <View style={s.avatar}><Text style={s.avatarTxt}>{initials}</Text></View>
            }
            <View style={s.avatarEdit}>
              <Ionicons name="camera" size={11} color="#000" />
            </View>
            <View style={[s.roleDot, { backgroundColor: isVendeur ? C.accent : C.info }]} />
          </TouchableOpacity>

          <Text style={s.name}>{displayName}</Text>
          <Text style={s.meta}>{profile?.phone ? profile.phone + " · " : ""}{profile?.wilaya || "Algérie"}</Text>

          <View style={[s.roleBadge, { flexDirection: row }, isVendeur && s.roleBadgeVendeur]}>
            <Ionicons name={isVendeur ? "storefront-outline" : "person-outline"} size={12} color={isVendeur ? C.accent : C.info} />
            <Text style={[s.roleTxt, { color: isVendeur ? C.accent : C.info }]}>
              {isVendeur ? t("vendeur") : t("client")}
            </Text>
          </View>

          <View style={[s.statsRow, { flexDirection: row }]}>
            {statsData.map(([n,l]) => (
              <View key={l} style={s.stat}>
                <Text style={s.statN}>{n}</Text>
                <Text style={s.statL}>{l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Email */}
        <View style={[s.emailRow, { flexDirection: row }]}>
          <Ionicons name="mail-outline" size={14} color={C.textMuted} />
          <Text style={[s.emailTxt, { textAlign: align }]} numberOfLines={1}>{user.email}</Text>
          <View style={[s.verifiedBadge, { flexDirection: row, backgroundColor: (user.emailVerified ? C.success : C.warning) + "15" }]}>
            <Ionicons name={user.emailVerified ? "checkmark-circle" : "time-outline"} size={12} color={user.emailVerified ? C.success : C.warning} />
            <Text style={[s.verifiedTxt, { color: user.emailVerified ? C.success : C.warning }]}>
              {user.emailVerified ? t("verified") : t("notVerified")}
            </Text>
          </View>
        </View>

        {/* SECTIONS */}
        {sections.map(section => (
          <View key={section.title}>
            <Text style={[s.secTitle, { textAlign: align }]}>{section.title}</Text>
            <View style={s.menuBlock}>
              {section.items.map((item, i) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={() => item.onPress ? item.onPress() : item.screen && navigation.navigate(item.screen)}
                  style={[s.menuRow, { flexDirection: row }, i < section.items.length - 1 && s.menuRowBorder]}
                  activeOpacity={0.8}>
                  <View style={s.menuIconWrap}>
                    <Ionicons name={item.icon} size={18} color={C.textMuted} />
                  </View>
                  <Text style={[s.menuLabel, { textAlign: align }]}>{item.label}</Text>
                  <View style={{ flexDirection: row, alignItems: "center", gap: 8 }}>
                    {item.count > 0 ? <View style={s.countBadge}><Text style={s.countTxt}>{item.count}</Text></View> : null}
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={C.textDim} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={s.logoutWrap}>
          <Btn variant="ghost" onPress={handleLogout}>{t("logout")}</Btn>
        </View>
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>

      {/* ══ MODAL MODIFIER PROFIL ══ */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHdr}>
              <Text style={s.modalTitle}>{isRTL ? "تعديل الملف الشخصي" : "Modifier le profil"}</Text>
              <TouchableOpacity onPress={() => setEditing(false)} style={s.modalClose}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled">
              {/* PHOTO */}
              <TouchableOpacity onPress={pickPhoto} style={s.photoPickerWrap} activeOpacity={0.8}>
                {editPhoto
                  ? <Image source={{ uri: editPhoto }} style={s.photoPickerImg} />
                  : photoUrl
                    ? <Image source={{ uri: photoUrl }} style={s.photoPickerImg} />
                    : <View style={s.photoPickerPlaceholder}>
                        <Text style={s.photoPickerInitials}>{initials}</Text>
                      </View>
                }
                <View style={s.photoPickerOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                    {isRTL ? "تغيير الصورة" : "Changer"}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={s.fl}>{isRTL ? "الاسم الكامل *" : "Nom complet *"}</Text>
              <TextInput
                style={[s.fi, { textAlign: align }]}
                value={editName} onChangeText={setEditName}
                placeholder={isRTL ? "اسمك الكامل" : "Votre nom complet"}
                placeholderTextColor={C.textDim}
              />

              <Text style={s.fl}>{isRTL ? "رقم الهاتف" : "Téléphone"}</Text>
              <TextInput
                style={[s.fi, { textAlign: align }]}
                value={editPhone} onChangeText={setEditPhone}
                placeholder="06XXXXXXXX" placeholderTextColor={C.textDim}
                keyboardType="phone-pad"
              />

              <Text style={s.fl}>{isRTL ? "الولاية" : "Wilaya"}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {WILAYAS_LIST.map(w => (
                    <TouchableOpacity key={w} onPress={() => setEditWilaya(w)}
                      style={[s.wChip, editWilaya === w && s.wChipOn]}>
                      <Text style={[s.wChipTxt, editWilaya === w && { color: C.accent }]}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.7 }]}
                onPress={saveProfile} disabled={saving} activeOpacity={0.8}>
                {saving
                  ? <ActivityIndicator color="#000" />
                  : <><Ionicons name="checkmark-circle" size={18} color="#000" />
                      <Text style={s.saveBtnTxt}>{isRTL ? "حفظ التغييرات" : "Enregistrer"}</Text></>
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ MODAL MOT DE PASSE ══ */}
      <Modal visible={pwModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalBg}
          behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[s.modalBox, { maxHeight: "75%" }]}>
            <View style={s.modalHdr}>
              <Text style={s.modalTitle}>{isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe"}</Text>
              <TouchableOpacity
                onPress={() => { setPwModal(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
                style={s.modalClose}>
                <Ionicons name="close" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Text style={s.fl}>{isRTL ? "كلمة المرور الحالية" : "Mot de passe actuel"}</Text>
              <TextInput
                style={s.fi} value={pwCurrent} onChangeText={setPwCurrent}
                secureTextEntry placeholder="••••••" placeholderTextColor={C.textDim}
                returnKeyType="next"
              />

              <Text style={s.fl}>{isRTL ? "كلمة المرور الجديدة" : "Nouveau mot de passe"}</Text>
              <TextInput
                style={s.fi} value={pwNew} onChangeText={setPwNew}
                secureTextEntry placeholder="Minimum 6 caractères" placeholderTextColor={C.textDim}
                returnKeyType="next"
              />

              <Text style={s.fl}>{isRTL ? "تأكيد كلمة المرور" : "Confirmer le mot de passe"}</Text>
              <TextInput
                style={s.fi} value={pwConfirm} onChangeText={setPwConfirm}
                secureTextEntry placeholder="••••••" placeholderTextColor={C.textDim}
                returnKeyType="done" onSubmitEditing={changePassword}
              />

              <TouchableOpacity
                style={[s.saveBtn, pwLoading && { opacity: 0.7 }]}
                onPress={changePassword} disabled={pwLoading} activeOpacity={0.8}>
                {pwLoading
                  ? <ActivityIndicator color="#000" />
                  : <><Ionicons name="lock-closed" size={18} color="#000" />
                      <Text style={s.saveBtnTxt}>{isRTL ? "تغيير كلمة المرور" : "Changer le mot de passe"}</Text></>
                }
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:             { flex: 1, backgroundColor: C.bg },
  noAuth:                { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 10, backgroundColor: C.bg },
  noAuthIcon:            { width: 80, height: 80, borderRadius: 40, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  noAuthTitle:           { fontSize: 20, fontWeight: "800", color: C.text },
  noAuthSub:             { fontSize: 13, color: C.textMuted },
  profileHeader:         { backgroundColor: C.surface, paddingHorizontal: 28, paddingBottom: 28, alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.border },
  langBtn:               { position: "absolute", right: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.accent + "15", borderRadius: 10, borderWidth: 1, borderColor: C.accent + "40" },
  langTxt:               { fontSize: 13, fontWeight: "800", color: C.accent },
  editBtn:               { position: "absolute", left: 16, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  editBtnTxt:            { fontSize: 12, fontWeight: "700", color: C.accent },
  avatarWrap:            { position: "relative", marginBottom: 12, marginTop: 8 },
  avatar:                { width: 80, height: 80, borderRadius: 40, backgroundColor: C.accent + "20", borderWidth: 3, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  avatarImg:             { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: C.accent },
  avatarTxt:             { fontSize: 30, fontWeight: "900", color: C.accent },
  avatarEdit:            { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, borderWidth: 2, borderColor: C.surface, alignItems: "center", justifyContent: "center" },
  roleDot:               { position: "absolute", top: 0, left: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: C.surface },
  name:                  { fontSize: 22, fontWeight: "900", color: C.text, marginBottom: 4 },
  meta:                  { fontSize: 12, color: C.textMuted, marginBottom: 10 },
  roleBadge:             { alignItems: "center", gap: 5, backgroundColor: C.info + "15", borderWidth: 1, borderColor: C.info + "40", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 20 },
  roleBadgeVendeur:      { backgroundColor: C.accent + "15", borderColor: C.accent + "40" },
  roleTxt:               { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  statsRow:              { gap: 32 },
  stat:                  { alignItems: "center" },
  statN:                 { fontSize: 24, fontWeight: "900", color: C.accent },
  statL:                 { fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  emailRow:              { alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border, flexDirection: "row" },
  emailTxt:              { flex: 1, fontSize: 13, color: C.textMuted },
  verifiedBadge:         { alignItems: "center", gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row" },
  verifiedTxt:           { fontSize: 10, fontWeight: "700" },
  secTitle:              { fontSize: 10, color: C.textMuted, fontWeight: "800", letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 8 },
  menuBlock:             { backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border },
  menuRow:               { alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  menuRowBorder:         { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIconWrap:          { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceAlt, alignItems: "center", justifyContent: "center" },
  menuLabel:             { flex: 1, fontSize: 14, fontWeight: "600", color: C.text },
  countBadge:            { backgroundColor: C.accent + "20", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  countTxt:              { fontSize: 11, color: C.accent, fontWeight: "800" },
  logoutWrap:            { padding: 16, marginTop: 8 },
  modalBg:               { flex: 1, backgroundColor: "rgba(0,0,0,.6)", justifyContent: "flex-end" },
  modalBox:              { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: "92%", borderTopWidth: 1, borderColor: C.border },
  modalHdr:              { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle:            { fontSize: 18, fontWeight: "800", color: C.text },
  modalClose:            { width: 32, height: 32, borderRadius: 16, backgroundColor: C.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border },
  photoPickerWrap:       { width: 90, height: 90, borderRadius: 45, alignSelf: "center", marginBottom: 20, overflow: "hidden" },
  photoPickerImg:        { width: 90, height: 90, borderRadius: 45 },
  photoPickerPlaceholder:{ width: 90, height: 90, borderRadius: 45, backgroundColor: C.accent + "20", borderWidth: 3, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  photoPickerInitials:   { fontSize: 30, fontWeight: "900", color: C.accent },
  photoPickerOverlay:    { position: "absolute", bottom: 0, left: 0, right: 0, height: 34, backgroundColor: "rgba(0,0,0,.55)", alignItems: "center", justifyContent: "center", gap: 2 },
  fl:                    { fontSize: 11, fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  fi:                    { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, marginBottom: 14 },
  wChip:                 { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
  wChipOn:               { borderColor: C.accent, backgroundColor: C.accent + "15" },
  wChipTxt:              { fontSize: 12, fontWeight: "700", color: C.textMuted },
  saveBtn:               { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveBtnTxt:            { fontSize: 15, fontWeight: "800", color: "#000" },
});