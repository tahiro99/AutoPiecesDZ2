// src/screens/Auth/ForgotPasswordScreen.jsx

import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
import { C } from "../../constants/theme";
import Input from "../../components/Input";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";

export default function ForgotPasswordScreen({ navigation }) {
  const { isRTL } = useLanguage();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Erreur", isRTL ? "أدخل بريدًا إلكترونيًا صحيحًا" : "Entrez un email valide");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      Alert.alert("Erreur", isRTL ? "لم يتم العثور على هذا البريد الإلكتروني" : "Aucun compte avec cet email");
    }
    setLoading(false);
  };

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
      </TouchableOpacity>

      <View style={s.iconWrap}>
        <Ionicons name="lock-open-outline" size={36} color={C.accent} />
      </View>

      {!sent ? (
        <>
          <Text style={[s.title, { textAlign: isRTL ? "right" : "left" }]}>
            {isRTL ? "نسيت كلمة المرور؟" : "Mot de passe oublié ?"}
          </Text>
          <Text style={[s.sub, { textAlign: isRTL ? "right" : "left" }]}>
            {isRTL
              ? "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
              : "Entrez votre email et nous vous enverrons un lien de réinitialisation"}
          </Text>

          <View style={s.form}>
            <Input
              icon="mail-outline"
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              rtl={isRTL}
            />
          </View>

          <Btn onPress={handleReset} loading={loading}>
            {isRTL ? "إرسال رابط الإعادة" : "Envoyer le lien"}
          </Btn>
        </>
      ) : (
        <>
          <View style={s.successIcon}>
            <Ionicons name="checkmark-circle" size={48} color={C.success} />
          </View>
          <Text style={[s.title, { textAlign: "center" }]}>
            {isRTL ? "تم الإرسال ✅" : "Email envoyé ✅"}
          </Text>
          <Text style={[s.sub, { textAlign: "center" }]}>
            {isRTL
              ? `تحقق من بريدك الإلكتروني ${email} واتبع التعليمات`
              : `Vérifiez votre email ${email} et suivez les instructions`}
          </Text>
          <Btn onPress={() => navigation.navigate("Login")} style={{ marginTop: 24 }}>
            {isRTL ? "العودة لتسجيل الدخول" : "Retour à la connexion"}
          </Btn>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 60 },
  back:        { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  iconWrap:    { width: 70, height: 70, borderRadius: 22, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:       { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 10 },
  sub:         { fontSize: 14, color: C.textMuted, lineHeight: 22, marginBottom: 28 },
  form:        { marginBottom: 20 },
  successIcon: { alignItems: "center", marginBottom: 16 },
});