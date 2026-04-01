import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PhoneAuthProvider, signInWithCredential, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../config/firebase";
import { C } from "../../constants/theme";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";

export default function PhoneVerificationScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const { phone, name, role } = route.params || {};

  const [verificationId, setVerificationId] = useState(null);
  const [code, setCode]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [phoneInput, setPhoneInput] = useState(phone || "");

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
        isRTL ? "أدخل رقم هاتف جزائري صحيح" : "Entrez un numéro algérien valide (ex: 0555 123 456)");
      return;
    }
    setLoading(true);
    try {
      const provider = new PhoneAuthProvider(auth);
      // NOTE: needs reCAPTCHA verifier - will work after native build
      Alert.alert(
        isRTL ? "تنبيه" : "Info",
        isRTL ? "SMS يتطلب تطبيق مبني (APK). يعمل قريباً." : "Le SMS nécessite une build native (APK). Bientôt disponible."
      );
    } catch (e) {
      Alert.alert(isRTL ? "خطأ" : "Erreur", e.message);
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
        {isRTL ? "أدخل رقم هاتفك الجزائري" : "Entrez votre numéro algérien"}
      </Text>

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
        {isRTL ? "إرسال الكود" : "Envoyer le code"}
      </Btn>

      <View style={s.infoBox}>
        <Ionicons name="information-circle-outline" size={18} color={C.accent} />
        <Text style={[s.infoTxt, { textAlign: align }]}>
          {isRTL
            ? "سيتم تفعيل التحقق بالرسائل النصية بعد نشر التطبيق."
            : "La vérification SMS sera activée après la publication de l'application."}
        </Text>
      </View>
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
  infoBox:    { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: C.accent + "10", borderWidth: 1, borderColor: C.accent + "30", borderRadius: 12, padding: 14, marginTop: 24 },
  infoTxt:    { flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 20 },
});