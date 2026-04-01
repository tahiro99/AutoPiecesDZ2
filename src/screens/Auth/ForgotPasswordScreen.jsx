import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import Input from "../../components/Input";
import Btn from "../../components/Btn";
import { resetPassword, getErrorMessage } from "../../services/auth.service";
import { useLanguage } from "../../i18n/languagecontext";

export default function ForgotPasswordScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const align = isRTL ? "right" : "left";

  const handleReset = async () => {
    if (!email.trim()) { setError(isRTL ? "أدخل بريدك الإلكتروني" : "Entrez votre email"); return; }
    setError(""); setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <View style={s.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
        </TouchableOpacity>
        <View style={s.successWrap}>
          <View style={s.successIcon}>
            <Ionicons name="checkmark" size={36} color={C.success} />
          </View>
          <Text style={s.successTitle}>
            {isRTL ? "تم الإرسال!" : "Email envoyé !"}
          </Text>
          <Text style={[s.successSub, { textAlign: "center" }]}>
            {isRTL ? "تحقق من بريدك الإلكتروني" : "Vérifiez votre boîte mail"}{"\n"}
            <Text style={{ color: C.accent }}>{email}</Text>
            {"\n\n"}
            {isRTL
              ? "انقر على الرابط في البريد لإعادة تعيين كلمة المرور."
              : "Cliquez sur le lien dans l'email pour réinitialiser votre mot de passe."}
          </Text>
          <Btn onPress={() => navigation.navigate("Login")} style={{ marginTop: 24 }}>
            {isRTL ? "العودة لتسجيل الدخول" : "Retour à la connexion"}
          </Btn>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
      </TouchableOpacity>
      <View style={s.iconWrap}>
        <Ionicons name="lock-open-outline" size={36} color={C.accent} />
      </View>
      <Text style={[s.title, { textAlign: align }]}>
        {isRTL ? "نسيت كلمة المرور" : "Mot de passe oublié"}
      </Text>
      <Text style={[s.sub, { textAlign: align }]}>
        {isRTL
          ? "أدخل بريدك الإلكتروني لتلقي\nرابط إعادة التعيين"
          : "Entrez votre email pour recevoir\nun lien de réinitialisation"}
      </Text>

      {error ? (
        <View style={[s.errorBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={[s.errorTxt, { textAlign: align }]}>{error}</Text>
        </View>
      ) : null}

      <Text style={[s.label, { textAlign: align }]}>{t("email")}</Text>
      <Input
        icon="mail-outline"
        placeholder="votre@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        rtl={isRTL}
      />
      <Btn onPress={handleReset} loading={loading} style={{ marginTop: 20 }}>
        {isRTL ? "إرسال الرابط" : "Envoyer le lien"}
      </Btn>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 60 },
  back:         { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  iconWrap:     { width: 70, height: 70, borderRadius: 22, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:        { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 8 },
  sub:          { fontSize: 14, color: C.textMuted, lineHeight: 22, marginBottom: 24 },
  errorBox:     { alignItems: "center", gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:     { fontSize: 13, color: C.danger, flex: 1 },
  label:        { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  successWrap:  { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  successIcon:  { width: 80, height: 80, borderRadius: 40, backgroundColor: C.success + "20", borderWidth: 2, borderColor: C.success, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  successTitle: { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 8 },
  successSub:   { fontSize: 14, color: C.textMuted, lineHeight: 22 },
});