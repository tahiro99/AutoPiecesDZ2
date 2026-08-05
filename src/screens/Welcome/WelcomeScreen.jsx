import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useLanguage } from "../../i18n/languagecontext";
import { useTheme } from "../../context/themeContext";
import { loginWithFacebook } from "../../services/facebook.service";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../config/firebase";
import { useGoogleLogin } from "../../services/google.service";

export default function WelcomeScreen({ navigation }) {
  const { t, isRTL, toggleLang, lang } = useLanguage();
  const [fbLoading, setFbLoading] = useState(false);
  const [realStats, setRealStats] = useState({ listings: 0, vendeurs: 0, wilayas: 58 });

  // ── Google (expo-auth-session) ──
  const {
    loginWithGoogle,
    loading: gLoading,
    error:   gError,
    result:  gResult,
    ready:   gReady,
  } = useGoogleLogin();

  useEffect(() => {
    if (!gResult) return;
    navigation.reset({
      index: 0,
      routes: [{ name: gResult.isNewUser ? "ChooseRole" : "Main" }],
    });
  }, [gResult]);

  useEffect(() => {
    if (gError) Alert.alert("Erreur", gError);
  }, [gError]);

  const stats = [
    [(realStats?.listings || 0).toLocaleString(), isRTL ? "إعلان" : "Annonces"],
    [(realStats?.vendeurs || 0).toLocaleString(), isRTL ? "بائع" : "Vendeurs"],
    ["4.8", isRTL ? "التقييم" : "Note moy."],
  ];

  useEffect(() => {
    const loadStats = async () => {
      try {
        const listingsSnap = await getCountFromServer(collection(db, "listings"));
        const vendeursSnap = await getCountFromServer(
          query(collection(db, "users"), where("role", "==", "vendeur"))
        );
        setRealStats({
          listings: listingsSnap.data().count,
          vendeurs: vendeursSnap.data().count,
          wilayas: 58,
        });
      } catch (e) {
        // Silent fail, garde valeurs par défaut
      }
    };
    loadStats();
  }, []);

  const handleFacebook = async () => {
    setFbLoading(true);
    try {
      const { isNewUser } = await loginWithFacebook();
      navigation.reset({
        index: 0,
        routes: [{ name: isNewUser ? "ChooseRole" : "Main" }],
      });
    } catch (e) {
      Alert.alert("Erreur", e.message || "Connexion Facebook annulée");
    }
    setFbLoading(false);
  };

  const busy = fbLoading || gLoading;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.topBar}>
        <TouchableOpacity onPress={toggleLang} style={s.langBtn}>
          <Text style={s.langTxt}>{lang === "fr" ? "عربي" : "FR"}</Text>
        </TouchableOpacity>
      </View>

      <View style={s.logoWrap}>
        <View style={s.logoIcon}>
          <Ionicons name="car-sport" size={44} color={C.accent} />
        </View>
        <Text style={s.logoTxt}>Auto<Text style={{ color: C.accent }}>Pieces</Text></Text>
        <Text style={s.logoDZ}>DZ</Text>
      </View>

      <View style={s.center}>
        <Text style={[s.tagline, { textAlign: "center" }]}>
          {isRTL ? "السوق الإلكتروني\n" : "La marketplace\n"}
          <Text style={{ color: C.accent }}>
            {isRTL ? "قطع غيار السيارات" : "pièces auto"}
          </Text>
          {isRTL ? "\nفي الجزائر" : "\nen Algérie"}
        </Text>
        <Text style={[s.sub, { textAlign: "center" }]}>
          {isRTL
            ? "58 ولاية · بائعون موثوقون · توصيل سريع"
            : "58 wilayas · vendeurs vérifiés · livraison rapide"}
        </Text>
        <View style={s.stats}>
          {stats.map(([n, l]) => (
            <View key={l} style={s.stat}>
              <Text style={s.statN}>{n}</Text>
              <Text style={s.statL}>{l}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.btns}>
        {/* Facebook */}
        <TouchableOpacity
          style={[s.btnFb, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={handleFacebook}
          disabled={busy}
          activeOpacity={0.85}>
          {fbLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-facebook" size={22} color="#fff" />
              <Text style={s.btnFbTxt}>
                {isRTL ? "المتابعة مع فيسبوك" : "Continuer avec Facebook"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Google */}
        <TouchableOpacity
          style={[s.btnGoogle, { flexDirection: isRTL ? "row-reverse" : "row" }, !gReady && { opacity: 0.6 }]}
          onPress={loginWithGoogle}
          disabled={busy || !gReady}
          activeOpacity={0.85}>
          {gLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="logo-google" size={22} color="#EA4335" />
              <Text style={s.btnGoogleTxt}>
                {isRTL ? "المتابعة مع جوجل" : "Continuer avec Google"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Login classique */}
        <TouchableOpacity
          style={[s.btnOutline, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          onPress={() => navigation.navigate("Login")}
          activeOpacity={0.85}>
          <Ionicons name="log-in-outline" size={18} color={C.accent} />
          <Text style={s.btnOutlineTxt}>{isRTL ? "لدي حساب" : "J'ai déjà un compte"}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("Main")}
          style={[s.skipBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={s.skipTxt}>
            {isRTL ? "المتابعة بدون حساب" : "Continuer sans compte"}
          </Text>
          <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color={C.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, justifyContent: "space-between", paddingTop: 60, paddingBottom: 50 },
  topBar:       { alignItems: "flex-end" },
  langBtn:      { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: C.accent + "15", borderRadius: 10, borderWidth: 1, borderColor: C.accent + "40" },
  langTxt:      { fontSize: 13, fontWeight: "800", color: C.accent },
  logoWrap:     { alignItems: "center", gap: 8 },
  logoIcon:     { width: 80, height: 80, borderRadius: 24, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  logoTxt:      { fontSize: 36, fontWeight: "900", color: C.text },
  logoDZ:       { fontSize: 13, fontWeight: "700", color: C.textMuted, letterSpacing: 4, marginTop: -4 },
  center:       { alignItems: "center", gap: 12 },
  tagline:      { fontSize: 30, fontWeight: "900", color: C.text, lineHeight: 40 },
  sub:          { fontSize: 13, color: C.textMuted },
  stats:        { flexDirection: "row", justifyContent: "space-around", width: "100%", backgroundColor: C.surface, borderRadius: 16, paddingVertical: 20, borderWidth: 1, borderColor: C.border, marginTop: 8 },
  stat:         { alignItems: "center", gap: 4 },
  statN:        { fontSize: 22, fontWeight: "900", color: C.accent },
  statL:        { fontSize: 10, color: C.textMuted, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  btns:         { gap: 12 },
  btnFb:        { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#1877F2", borderRadius: 14, paddingVertical: 16 },
  btnFbTxt:     { fontSize: 15, fontWeight: "800", color: "#fff" },
  btnGoogle:    { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16 },
  btnGoogleTxt: { fontSize: 15, fontWeight: "800", color: "#000" },
  btnOutline:   { alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 14, paddingVertical: 15, borderWidth: 1.5, borderColor: C.accent + "60" },
  btnOutlineTxt:{ fontSize: 15, fontWeight: "800", color: C.accent },
  skipBtn:      { alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 6 },
  skipTxt:      { fontSize: 13, color: C.textMuted },
});