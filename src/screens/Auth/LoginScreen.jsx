// src/screens/Auth/LoginScreen.jsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import Input from "../../components/Input";
import Btn from "../../components/Btn";
import { login, getErrorMessage } from "../../services/auth.service";
import { useLanguage } from "../../i18n/languagecontext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase";

// Accepte tout numéro algérien à 10 chiffres commençant par 0
// (mobile 05/06/07 + futurs préfixes éventuels).
const isPhone = (val) => /^0\d{9}$/.test(val.replace(/\s/g, ""));

const FAKE_DOMAIN = "@autopiecesdz.com";

// Returns ALL possible emails for an identifier, ordered by likelihood.
// We'll try each one until login() succeeds.
async function getEmailCandidates(identifier) {
  const raw = identifier.trim();
  const cleaned = raw.replace(/\s/g, "");

  // Direct email input → just use it.
  if (!isPhone(cleaned)) return [cleaned.toLowerCase()];

  // Phone input: search Firestore for any user doc matching the phone in
  // various formats, then collect every email/firebaseEmail value we find.
  const withSpaces = cleaned.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  const intl       = "+213" + cleaned.replace(/^0/, "");
  const phoneForms = Array.from(new Set([cleaned, raw, withSpaces, intl]));

  const collected = new Set();
  for (const candidate of phoneForms) {
    try {
      const snap = await getDocs(
        query(collection(db, "users"), where("phone", "==", candidate))
      );
      snap.docs.forEach((d) => {
        const data = d.data() || {};
        const e1 = (data.email || "").trim().toLowerCase();
        const e2 = (data.firebaseEmail || "").trim().toLowerCase();
        if (e1 && e1.includes("@")) collected.add(e1);
        if (e2 && e2.includes("@")) collected.add(e2);
      });
    } catch (_) {}
  }

  // Order: real emails first (password resets land here), then legacy fake,
  // then the legacy pattern as last-resort fallback.
  const arr = Array.from(collected);
  const real   = arr.filter((e) => !e.endsWith(FAKE_DOMAIN));
  const fake   = arr.filter((e) =>  e.endsWith(FAKE_DOMAIN));
  const legacy = `${cleaned}${FAKE_DOMAIN}`;
  return Array.from(new Set([...real, ...fake, legacy]));
}

export default function LoginScreen({ navigation }) {
  const { t, isRTL } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const align = isRTL ? "right" : "left";

  const handleLogin = async () => {
    if (!identifier.trim()) { setError(isRTL ? "أدخل رقم هاتفك أو بريدك الإلكتروني" : "Entrez votre téléphone ou email"); return; }
    if (!password) { setError(isRTL ? "أدخل كلمة المرور" : "Entrez votre mot de passe"); return; }
    setError(""); setLoading(true);
    try {
      const candidates = await getEmailCandidates(identifier);
      let lastError = null;
      for (const email of candidates) {
        try {
          await login(email, password);
          navigation.reset({ index: 0, routes: [{ name: "Main" }] });
          setLoading(false);
          return;
        } catch (e) {
          lastError = e;
          // Try next candidate
        }
      }
      // None of the candidates worked
      throw lastError || new Error("auth/invalid-credential");
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
        <View style={s.logoIcon}><Ionicons name="car-sport" size={30} color={C.accent} /></View>
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
        <Text style={[s.label, { textAlign: align }]}>{isRTL ? "الهاتف أو البريد الإلكتروني" : "Téléphone ou Email"}</Text>
        <Input
          icon={isPhone(identifier) ? "call-outline" : "mail-outline"}
          placeholder={isRTL ? "0655 123 456 أو email@..." : "0655 123 456 ou email@..."}
          value={identifier} onChangeText={setIdentifier}
          keyboardType="email-address" autoCapitalize="none" rtl={isRTL}
        />
        {identifier.length > 3 && (
          <View style={s.typeIndicator}>
            <Ionicons name={isPhone(identifier) ? "call-outline" : "mail-outline"} size={12} color={C.accent} />
            <Text style={s.typeText}>
              {isPhone(identifier)
                ? (isRTL ? "تسجيل دخول برقم الهاتف" : "Connexion par téléphone")
                : (isRTL ? "تسجيل دخول بالبريد الإلكتروني" : "Connexion par email")}
            </Text>
          </View>
        )}
        <Text style={[s.label, { marginTop: 14, textAlign: align }]}>{t("password")}</Text>
        <Input icon="lock-closed-outline" placeholder={t("password")}
          value={password} onChangeText={setPassword} secureTextEntry rtl={isRTL} />
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}
          style={[s.forgotBtn, { alignSelf: isRTL ? "flex-start" : "flex-end" }]}>
          <Text style={s.forgotTxt}>{t("forgotPassword")}</Text>
        </TouchableOpacity>
      </View>
      <Btn onPress={handleLogin} loading={loading}>{t("login")}</Btn>
      <View style={s.divider}>
        <View style={s.divLine} /><Text style={s.divTxt}>{isRTL ? "أو" : "OU"}</Text><View style={s.divLine} />
      </View>
      <TouchableOpacity onPress={() => navigation.navigate("Register")} style={s.regBtn}>
        <Text style={[s.regTxt, { textAlign: "center" }]}>
          {t("noAccount")}{" "}<Text style={{ color: C.accent, fontWeight: "800" }}>{t("register")}</Text>
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.bg },
  inner:         { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  back:          { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  header:        { alignItems: "center", marginBottom: 32, gap: 8 },
  logoIcon:      { width: 60, height: 60, borderRadius: 18, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  title:         { fontSize: 26, fontWeight: "900", color: C.text },
  sub:           { fontSize: 13, color: C.textMuted },
  errorBox:      { alignItems: "center", gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:      { fontSize: 13, color: C.danger, flex: 1 },
  form:          { marginBottom: 24 },
  label:         { fontSize: 12, fontWeight: "700", color: C.textMuted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  typeIndicator: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 4 },
  typeText:      { fontSize: 11, color: C.accent, fontWeight: "600" },
  forgotBtn:     { marginTop: 12 },
  forgotTxt:     { fontSize: 13, color: C.accent, fontWeight: "700" },
  divider:       { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  divLine:       { flex: 1, height: 1, backgroundColor: C.border },
  divTxt:        { fontSize: 11, color: C.textDim, fontWeight: "700" },
  regBtn:        { alignItems: "center", paddingVertical: 8 },
  regTxt:        { fontSize: 14, color: C.textMuted },
});