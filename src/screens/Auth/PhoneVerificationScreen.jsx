import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../config/firebase";
import { C } from "../../constants/theme";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";

export default function PhoneVerificationScreen({ route, navigation }) {
  const { isRTL } = useLanguage();
  const { name, role } = route.params || {};

  const [phoneInput, setPhoneInput] = useState("");
  const [code, setCode]             = useState("");
  const [confirm, setConfirm]       = useState(null);
  const [loading, setLoading]       = useState(false);

  const align = isRTL ? "right" : "left";

  const formatPhone = (p) => {
    const cleaned = p.replace(/\s/g, "").replace(/-/g, "");
    if (cleaned.startsWith("0")) return "+213" + cleaned.slice(1);
    if (cleaned.startsWith("+")) return cleaned;
    return "+213" + cleaned;
  };

  const sendCode = async () => {
    const formatted = formatPhone(phoneInput);
    if (formatted.length < 12) {
      Alert.alert(isRTL ? "رقم غير صحيح" : "Numéro invalide",
        isRTL ? "أدخل رقم هاتف جزائري صحيح" : "Ex: 0555 123 456");
      return;
    }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(formatted);
      setConfirm(confirmation);
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Erreur", e.message);
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert(isRTL ? "الكود 6 أرقام" : "Le code fait 6 chiffres");
      return;
    }
    setLoading(true);
    try {
      const result = await confirm.confirm(code);
      const firebaseUser = result.user;

      await setDoc(doc(db, "users", firebaseUser.uid), {
        uid:         firebaseUser.uid,
        displayName: name || formatPhone(phoneInput),
        phone:       formatPhone(phoneInput),
        role:        role || "client",
        email:       "",
        verified:    true,
        createdAt:   serverTimestamp(),
      });

      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (e) {
      Alert.alert(isRTL ? "كود خاطئ" : "Code incorrect",
        isRTL ? "تحقق من الكود وأعد المحاولة" : "Vérifiez le code et réessayez");
    }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
      </TouchableOpacity>

      <View style={s.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={36} color={C.accent} />
      </View>

      <Text style={[s.title, { textAlign: align }]}>
        {isRTL ? "تحقق برقم الهاتف" : "Vérification par SMS"}
      </Text>
      <Text style={[s.sub, { textAlign: align }]}>
        {confirm
          ? (isRTL ? `أدخل الكود المرسل إلى ${formatPhone(phoneInput)}` : `Entrez le code envoyé au ${formatPhone(phoneInput)}`)
          : (isRTL ? "أدخل رقم هاتفك الجزائري" : "Entrez votre numéro algérien")}
      </Text>

      {!confirm ? (
        <>
          <Text style={[s.label, { textAlign: align }]}>
            {isRTL ? "رقم الهاتف" : "Numéro de téléphone"}
          </Text>
          <View style={[s.inputWrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={s.prefix}>
              <Text style={s.prefixTxt}>🇩🇿 +213</Text>
            </View>
            <TextInput
              style={[s.input, { textAlign: align }]}
              placeholder="0555 123 456"
              placeholderTextColor={C.textDim}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>
          <Btn onPress={sendCode} loading={loading} style={{ marginTop: 20 }}>
            {isRTL ? "إرسال الكود" : "Envoyer le code SMS"}
          </Btn>
        </>
      ) : (
        <>
          <Text style={[s.label, { textAlign: align }]}>
            {isRTL ? "كود التحقق (6 أرقام)" : "Code de vérification (6 chiffres)"}
          </Text>
          <TextInput
            style={[s.codeInput, { textAlign: "center" }]}
            placeholder="000000"
            placeholderTextColor={C.textDim}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
          <Btn onPress={verifyCode} loading={loading} style={{ marginTop: 20 }}>
            {isRTL ? "تأكيد" : "Confirmer"}
          </Btn>
          <TouchableOpacity onPress={() => setConfirm(null)} style={s.resend}>
            <Text style={s.resendTxt}>
              {isRTL ? "تغيير الرقم" : "Changer le numéro"}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 60 },
  back:       { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  iconWrap:   { width: 70, height: 70, borderRadius: 22, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:      { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 8 },
  sub:        { fontSize: 14, color: C.textMuted, lineHeight: 22, marginBottom: 24 },
  label:      { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  inputWrap:  { alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, overflow: "hidden" },
  prefix:     { backgroundColor: C.surfaceAlt, paddingHorizontal: 14, paddingVertical: 14, borderRightWidth: 1, borderRightColor: C.border },
  prefixTxt:  { fontSize: 14, fontWeight: "700", color: C.text },
  input:      { flex: 1, color: C.text, fontSize: 16, paddingHorizontal: 14, paddingVertical: 14 },
  codeInput:  { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 16, color: C.text, fontSize: 28, fontWeight: "900", letterSpacing: 8 },
  resend:     { alignItems: "center", paddingVertical: 14, marginTop: 8 },
  resendTxt:  { fontSize: 14, color: C.accent, fontWeight: "700" },
});