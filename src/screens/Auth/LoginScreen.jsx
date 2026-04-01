import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import Input from "../../components/Input";
import Btn from "../../components/Btn";
import { login, getErrorMessage } from "../../services/auth.service";
import { useLanguage } from "../../i18n/languagecontext";

export default function LoginScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const align = isRTL ? "right" : "left";

  const handleLogin = async () => {
    if (!email.trim())  { setError(isRTL ? "أدخل بريدك الإلكتروني" : "Veuillez entrer votre email"); return; }
    if (!password)      { setError(isRTL ? "أدخل كلمة المرور" : "Veuillez entrer votre mot de passe"); return; }
    setError(""); setLoading(true);
    try {
      await login(email, password);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    } catch (e) {
      setError(getErrorMessage(e));
    }
    setLoading(false);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
      </TouchableOpacity>

      <View style={s.header}>
        <View style={s.logoIcon}>
          <Ionicons name="car-sport" size={30} color={C.accent} />
        </View>
        <Text style={s.title}>{t("login")}</Text>
        <Text style={s.sub}>{isRTL ? "مرحباً بك في AutoPièces DZ" : "Bienvenue sur AutoPièces DZ"}</Text>
      </View>

      {error ? (
        <View style={[s.errorBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="alert-circle-outline" size={16} color={C.danger} />
          <Text style={[s.errorTxt, { textAlign: align }]}>{error}</Text>
        </View>
      ) : null}

      <View style={s.form}>
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
        <Text style={[s.label, { marginTop: 14, textAlign: align }]}>{t("password")}</Text>
        <Input
          icon="lock-closed-outline"
          placeholder={t("password")}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          rtl={isRTL}
        />
        <TouchableOpacity
          onPress={() => navigation.navigate("ForgotPassword")}
          style={[s.forgotBtn, { alignSelf: isRTL ? "flex-start" : "flex-end" }]}>
          <Text style={s.forgotTxt}>{t("forgotPassword")}</Text>
        </TouchableOpacity>
      </View>

      <Btn onPress={handleLogin} loading={loading}>{t("login")}</Btn>

      <View style={s.divider}>
        <View style={s.divLine} />
        <Text style={s.divTxt}>{isRTL ? "أو" : "OU"}</Text>
        <View style={s.divLine} />
      </View>

      <TouchableOpacity
        style={s.phoneBtn}
        onPress={() => navigation.navigate("PhoneVerification", {})}>
        <Ionicons name="phone-portrait-outline" size={20} color={C.accent} />
        <Text style={s.phoneBtnTxt}>
          {isRTL ? "الدخول برقم الهاتف" : "Se connecter avec le téléphone"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={s.regBtn}>
        <Text style={[s.regTxt, { textAlign: "center" }]}>
          {t("noAccount")}{" "}
          <Text style={{ color: C.accent, fontWeight: "800" }}>{t("register")}</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  inner:     { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  back:      { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  header:    { alignItems: "center", marginBottom: 32, gap: 8 },
  logoIcon:  { width: 60, height: 60, borderRadius: 18, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:     { fontSize: 26, fontWeight: "900", color: C.text },
  sub:       { fontSize: 13, color: C.textMuted },
  errorBox:  { alignItems: "center", gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:  { fontSize: 13, color: C.danger, flex: 1 },
  form:      { marginBottom: 24 },
  label:     { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  forgotBtn: { marginTop: 12 },
  forgotTxt: { fontSize: 13, color: C.accent, fontWeight: "700" },
  divider:   { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  divLine:   { flex: 1, height: 1, backgroundColor: C.border },
  divTxt:    { fontSize: 11, color: C.textDim, fontWeight: "700" },
  regBtn:    { alignItems: "center", paddingVertical: 8 },
  phoneBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1.5, borderColor: C.accent, borderRadius: 14, paddingVertical: 14, marginBottom: 12 },
  phoneBtnTxt: { fontSize: 14, fontWeight: "800", color: C.accent },
  regTxt:    { fontSize: 14, color: C.textMuted },
});