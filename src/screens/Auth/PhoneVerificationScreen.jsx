// src/screens/Auth/PhoneVerificationScreen.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
  KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import firebaseAuth from "@react-native-firebase/auth";
import firebaseMessaging from "@react-native-firebase/messaging";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { C } from "../../constants/theme";
import { useLanguage } from "../../i18n/languagecontext";
import { initVendorSubscription } from "../../services/subscription.service";

const formatPhone = (p) => {
  if (!p) return "";
  return `+213${p.replace(/\s/g, "").replace(/^0/, "")}`;
};

export default function PhoneVerificationScreen({ route, navigation }) {
  const { isRTL } = useLanguage();
  const { phone, name, email, wilaya, password, role } = route.params || {};

  const [confirm, setConfirm]     = useState(null);
  const [code, setCode]           = useState("");
  const [sending, setSending]     = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent]   = useState(false);
  const isVerifyingRef            = useRef(false);

  const formattedPhone = formatPhone(phone);
  // Use the REAL email the user typed. This is what Firebase Auth registers,
  // which means "Forgot password" works (Firebase sends the reset to this email).
  const firebaseEmail  = (email || "").trim().toLowerCase();

  useEffect(() => {
    if (Platform.OS === "ios") {
      firebaseMessaging()
        .registerDeviceForRemoteMessages()
        .catch((e) => console.log("[messaging]", e.message));
    }
  }, []);

  const sendCode = async () => {
    if (sending) return;
    setSending(true);
    try {
      const confirmation = await firebaseAuth().signInWithPhoneNumber(formattedPhone);
      setConfirm(confirmation);
      setCodeSent(true);
      setCode("");
      Alert.alert("SMS envoyé ✅", `Code envoyé au ${formattedPhone}`);
    } catch (e) {
      console.log("[sendCode]", e.code, e.message, JSON.stringify(e));
      // DEBUG : montre le détail natif EXACT pour diagnostiquer l'envoi du SMS.
      const debugInfo =
`Code: ${e.code || "N/A"}
Message: ${e.message || "N/A"}
NativeErrorMessage: ${e.nativeErrorMessage || "N/A"}
NativeErrorCode: ${e.nativeErrorCode || "N/A"}
UserInfo: ${JSON.stringify(e.userInfo || {})}`;
      Alert.alert("🔍 Détail erreur ENVOI (DEBUG)", debugInfo);
    }
    setSending(false);
  };

  const verifyCode = async () => {
    if (isVerifyingRef.current) return;
    if (!code || code.length < 6) { Alert.alert("Erreur", "Entrez le code à 6 chiffres"); return; }
    if (!confirm) { Alert.alert("Erreur", "Renvoyez le SMS d'abord"); return; }

    isVerifyingRef.current = true;
    setVerifying(true);

    try {
      await confirm.confirm(code);

      try {
        const userCred = await createUserWithEmailAndPassword(auth, firebaseEmail, password);
        const uid = userCred.user.uid;
        await setDoc(doc(db, "users", uid), {
          uid, displayName: name, phone,
          email, firebaseEmail,
          wilaya: wilaya || "",        // ← wilaya pour le calcul livraison
          role: role || "client",
          phoneVerified: true, verified: false,
          createdAt: serverTimestamp(),
        });
        if (role === "vendeur") await initVendorSubscription(uid);
      } catch (e) {
        if (e.code === "auth/email-already-in-use") {
          await signInWithEmailAndPassword(auth, firebaseEmail, password);
        } else throw e;
      }

      navigation.reset({ index: 0, routes: [{ name: "Main" }] });

    } catch (e) {
      console.log("[verifyCode]", e.code, e.message);
      let msg = e.message;
      if (e.code === "auth/invalid-verification-code") msg = "Code incorrect. Réessayez.";
      if (e.code === "auth/code-expired") {
        msg = "Code expiré. Renvoyez le SMS.";
        setCodeSent(false); setConfirm(null); setCode("");
      }
      Alert.alert("Erreur", msg);
    } finally {
      setVerifying(false);
      isVerifyingRef.current = false;
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
        </TouchableOpacity>
        <View style={s.iconWrap}>
          <Ionicons name="phone-portrait-outline" size={36} color={C.accent} />
        </View>
        <Text style={[s.title, { textAlign: isRTL ? "right" : "left" }]}>
          {isRTL ? "تحقق من رقم هاتفك" : "Vérification du numéro"}
        </Text>
        <Text style={[s.sub, { textAlign: isRTL ? "right" : "left" }]}>
          {isRTL ? `سيتم إرسال رمز إلى ${phone}` : `Un SMS sera envoyé au ${phone}`}
        </Text>
        <View style={s.phoneBox}>
          <Ionicons name="call-outline" size={16} color={C.accent} />
          <Text style={s.phoneText}>{formattedPhone}</Text>
        </View>
        <View style={s.emailBox}>
          <Ionicons name="mail-outline" size={14} color={C.success} />
          <Text style={s.emailTxt}>{isRTL ? `الحساب سيُربط بـ ${email}` : `Compte lié à ${email}`}</Text>
        </View>
        {!codeSent ? (
          <TouchableOpacity style={[s.btn, sending && { opacity: 0.7 }]}
            onPress={sendCode} disabled={sending} activeOpacity={0.8}>
            {sending ? <ActivityIndicator color="#000" />
              : <><Ionicons name="send-outline" size={18} color="#000" />
                  <Text style={s.btnTxt}>{isRTL ? "إرسال رمز التحقق" : "Envoyer le code SMS"}</Text></>}
          </TouchableOpacity>
        ) : (
          <View>
            <Text style={[s.codeLabel, { textAlign: isRTL ? "right" : "left" }]}>
              {isRTL ? "أدخل الرمز المرسل إليك" : "Entrez le code reçu par SMS"}
            </Text>
            <TextInput
              style={s.codeInput} value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
              keyboardType="number-pad" maxLength={6}
              placeholder="• • • • • •" placeholderTextColor={C.textDim}
              textAlign="center" autoFocus
            />
            <TouchableOpacity
              style={[s.btn, (verifying || code.length < 6) && { opacity: 0.6 }]}
              onPress={verifyCode} disabled={verifying || code.length < 6} activeOpacity={0.8}>
              {verifying ? <ActivityIndicator color="#000" />
                : <><Ionicons name="checkmark-circle-outline" size={18} color="#000" />
                    <Text style={s.btnTxt}>{isRTL ? "تأكيد وإنشاء الحساب" : "Confirmer et créer le compte"}</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={s.resendBtn}
              onPress={() => { setCodeSent(false); setConfirm(null); setCode(""); }}>
              <Text style={s.resendTxt}>{isRTL ? "إعادة إرسال الرمز" : "Renvoyer le code"}</Text>
            </TouchableOpacity>
          </View>
        )}
        {role === "vendeur" && (
          <View style={s.trialBox}>
            <Ionicons name="gift-outline" size={16} color={C.accent} />
            <Text style={s.trialTxt}>
              {isRTL ? "ستستفيد من شهرين مجانيين كبائع !" : "2 mois d'essai gratuit en tant que vendeur !"}
            </Text>
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg },
  inner:      { paddingHorizontal: 28, paddingTop: 60 },
  back:       { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  iconWrap:   { width: 70, height: 70, borderRadius: 22, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:      { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 8 },
  sub:        { fontSize: 14, color: C.textMuted, marginBottom: 16, lineHeight: 22 },
  phoneBox:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 10 },
  phoneText:  { fontSize: 16, fontWeight: "700", color: C.text, letterSpacing: 1 },
  emailBox:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.success + "10", borderWidth: 1, borderColor: C.success + "30", borderRadius: 10, padding: 10, marginBottom: 20 },
  emailTxt:   { fontSize: 12, color: C.success, fontWeight: "600", flex: 1 },
  btn:        { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 },
  btnTxt:     { fontSize: 16, fontWeight: "900", color: "#000" },
  codeLabel:  { fontSize: 13, fontWeight: "700", color: C.textMuted, marginBottom: 12 },
  codeInput:  { backgroundColor: C.surface, borderWidth: 2, borderColor: C.accent, borderRadius: 14, padding: 16, color: C.text, fontSize: 28, fontWeight: "900", letterSpacing: 12, marginBottom: 20 },
  resendBtn:  { alignItems: "center", paddingVertical: 12 },
  resendTxt:  { fontSize: 14, color: C.accent, fontWeight: "600" },
  trialBox:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.accent + "12", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 12, padding: 14, marginTop: 16 },
  trialTxt:   { flex: 1, fontSize: 13, color: C.accent, fontWeight: "600", lineHeight: 19 },
});