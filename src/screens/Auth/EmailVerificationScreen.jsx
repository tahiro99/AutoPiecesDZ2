import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { reload, sendEmailVerification } from "firebase/auth";
import { auth } from "../../config/firebase";
import { C } from "../../constants/theme";
import Btn from "../../components/Btn";
import { useLanguage } from "../../i18n/languagecontext";

function getEmailApp(email, t) {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  if (domain.includes("gmail"))   return { label: "Ouvrir Gmail",   url: "https://mail.google.com" };
  if (domain.includes("yahoo"))   return { label: "Ouvrir Yahoo",   url: "https://mail.yahoo.com"  };
  if (domain.includes("outlook") || domain.includes("hotmail") || domain.includes("live"))
                                  return { label: "Ouvrir Outlook", url: "https://outlook.live.com" };
  if (domain.includes("icloud"))  return { label: "Ouvrir iCloud",  url: "https://www.icloud.com/mail" };
  return { label: "Ouvrir ma messagerie", url: `https://${domain}` };
}

export default function EmailVerificationScreen({ route, navigation }) {
  const { t, isRTL } = useLanguage();
  const email   = route.params?.email || auth.currentUser?.email || "";
  const emailApp = getEmailApp(email, t);

  const [checking, setChecking]   = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer]         = useState(60);
  const [error, setError]         = useState("");
  const [resent, setResent]       = useState(false);

  const dir = isRTL ? "rtl" : "ltr";
  const align = isRTL ? "right" : "left";

  useEffect(() => {
    const interval = setInterval(() => setTimer((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const u = auth.currentUser;
      if (!u) return;
      try {
        await reload(u);
        if (u.emailVerified) {
          clearInterval(interval);
          navigation.reset({ index: 0, routes: [{ name: "Main" }] });
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCheck = async () => {
    setChecking(true); setError("");
    try {
      const u = auth.currentUser;
      if (!u) { setError(isRTL ? "انتهت الجلسة، أعد تسجيل الدخول." : "Session expirée, reconnectez-vous."); setChecking(false); return; }
      await reload(u);
      if (u.emailVerified) {
        navigation.reset({ index: 0, routes: [{ name: "Main" }] });
      } else {
        setError(isRTL ? "البريد غير مؤكد بعد. تحقق من صندوقك." : "Email pas encore vérifié. Vérifiez votre boîte mail.");
      }
    } catch (e) {
      setError(isRTL ? "خطأ في التحقق. أعد المحاولة." : "Erreur de vérification. Réessayez.");
    }
    setChecking(false);
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setResending(true); setError(""); setResent(false);
    try {
      const u = auth.currentUser;
      if (u) await sendEmailVerification(u);
      setResent(true);
      setTimer(60);
    } catch (e) {
      setError(isRTL ? "تعذر الإرسال. أعد المحاولة." : "Impossible de renvoyer. Réessayez.");
    }
    setResending(false);
  };

  const openEmailApp = () => {
    Linking.openURL(emailApp.url).catch(() => {
      setError(isRTL ? "تعذر فتح تطبيق البريد." : "Impossible d'ouvrir l'application mail.");
    });
  };

  const steps = isRTL ? [
    { n: "1", txt: `افتح تطبيق البريد (${email.split("@")[1]})` },
    { n: "2", txt: 'انقر على رابط "تأكيد البريد الإلكتروني"' },
    { n: "3", txt: "عد هنا — سيتم تسجيل دخولك تلقائياً" },
  ] : [
    { n: "1", txt: `Ouvrez votre application mail (${email.split("@")[1]})` },
    { n: "2", txt: 'Cliquez sur le lien "Vérifier l\'email"' },
    { n: "3", txt: "Revenez ici — vous serez connecté automatiquement" },
  ];

  return (
    <View style={s.container}>
      <View style={s.iconWrap}>
        <Ionicons name="mail" size={44} color={C.accent} />
        <View style={s.iconDot}>
          <Ionicons name="checkmark" size={14} color="#000" />
        </View>
      </View>

      <Text style={[s.title, { textAlign: "center" }]}>
        {isRTL ? "تحقق من بريدك الإلكتروني" : "Vérifiez votre email"}
      </Text>
      <Text style={[s.sub, { textAlign: "center" }]}>
        {isRTL ? "تم إرسال رابط إلى" : "Un lien a été envoyé à"}
      </Text>

      <TouchableOpacity onPress={openEmailApp} style={[s.emailBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Ionicons name="mail-outline" size={16} color={C.accent} />
        <Text style={[s.emailTxt, { textAlign: align }]}>{email}</Text>
        <Ionicons name="open-outline" size={14} color={C.accent} />
      </TouchableOpacity>

      <TouchableOpacity onPress={openEmailApp} style={[s.openMailBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]} activeOpacity={0.85}>
        <Ionicons name="arrow-forward-circle" size={20} color="#000" />
        <Text style={s.openMailTxt}>{emailApp.label}</Text>
      </TouchableOpacity>

      <View style={s.steps}>
        {steps.map((step) => (
          <View key={step.n} style={[s.stepRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={s.stepNum}><Text style={s.stepNumTxt}>{step.n}</Text></View>
            <Text style={[s.stepTxt, { textAlign: align }]}>{step.txt}</Text>
          </View>
        ))}
      </View>

      <View style={[s.autoCheck, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <ActivityIndicator size="small" color={C.accent} />
        <Text style={[s.autoCheckTxt, { textAlign: align }]}>
          {isRTL ? "جاري التحقق التلقائي..." : "Vérification automatique en cours..."}
        </Text>
      </View>

      {error ? (
        <View style={[s.errorBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
          <Text style={[s.errorTxt, { textAlign: align }]}>{error}</Text>
        </View>
      ) : null}

      {resent ? (
        <View style={[s.successBox, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Ionicons name="checkmark-circle-outline" size={15} color={C.success} />
          <Text style={[s.successTxt, { textAlign: align }]}>
            {isRTL ? "تم إعادة الإرسال!" : "Email renvoyé !"}
          </Text>
        </View>
      ) : null}

      <Btn onPress={handleCheck} loading={checking} style={{ marginBottom: 12 }}>
        {isRTL ? "لقد تحققت من بريدي" : "J'ai vérifié mon email"}
      </Btn>

      <TouchableOpacity onPress={handleResend} disabled={timer > 0 || resending} style={s.resendBtn}>
        {resending
          ? <ActivityIndicator size="small" color={C.accent} />
          : <Text style={[s.resendTxt, timer > 0 && { color: C.textDim }, { textAlign: "center" }]}>
              {timer > 0
                ? (isRTL ? `إعادة الإرسال خلال ${timer}ث` : `Renvoyer dans ${timer}s`)
                : (isRTL ? "إعادة إرسال بريد التحقق" : "Renvoyer l'email de vérification")
              }
            </Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })}
        style={[s.skipBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Text style={[s.skipTxt, { textAlign: align }]}>
          {isRTL ? "التحقق لاحقاً" : "Vérifier plus tard"}
        </Text>
        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={13} color={C.textDim} />
      </TouchableOpacity>

      <View style={[s.spamNote, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <Ionicons name="information-circle-outline" size={14} color={C.textDim} />
        <Text style={[s.spamTxt, { textAlign: align }]}>
          {isRTL ? "تحقق أيضاً من مجلد البريد غير المرغوب فيه" : "Vérifiez aussi votre dossier spam / indésirables"}
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24, paddingTop: 70, alignItems: "center" },
  iconWrap:     { width: 90, height: 90, borderRadius: 28, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 20, position: "relative" },
  iconDot:      { position: "absolute", bottom: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: C.bg },
  title:        { fontSize: 24, fontWeight: "900", color: C.text, marginBottom: 6 },
  sub:          { fontSize: 14, color: C.textMuted, marginBottom: 10 },
  emailBtn:     { alignItems: "center", gap: 8, backgroundColor: C.accent + "12", borderWidth: 1, borderColor: C.accent + "40", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, marginBottom: 14, width: "100%" },
  emailTxt:     { fontSize: 14, fontWeight: "800", color: C.accent, flex: 1 },
  openMailBtn:  { alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 24, width: "100%", marginBottom: 20 },
  openMailTxt:  { fontSize: 15, fontWeight: "900", color: "#000" },
  steps:        { width: "100%", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, gap: 12, marginBottom: 16 },
  stepRow:      { alignItems: "flex-start", gap: 12 },
  stepNum:      { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", marginTop: 1 },
  stepNumTxt:   { fontSize: 12, fontWeight: "900", color: "#000" },
  stepTxt:      { flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 20 },
  autoCheck:    { alignItems: "center", gap: 8, marginBottom: 16 },
  autoCheckTxt: { fontSize: 12, color: C.textMuted },
  errorBox:     { alignItems: "center", gap: 8, backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 12, width: "100%" },
  errorTxt:     { fontSize: 13, color: C.danger, flex: 1 },
  successBox:   { alignItems: "center", gap: 8, backgroundColor: C.success + "15", borderWidth: 1, borderColor: C.success + "40", borderRadius: 10, padding: 12, marginBottom: 12, width: "100%" },
  successTxt:   { fontSize: 13, color: C.success },
  resendBtn:    { paddingVertical: 12, marginBottom: 6, width: "100%" },
  resendTxt:    { fontSize: 14, color: C.accent, fontWeight: "700" },
  skipBtn:      { alignItems: "center", gap: 4, paddingVertical: 10, marginBottom: 14 },
  skipTxt:      { fontSize: 13, color: C.textMuted },
  spamNote:     { alignItems: "center", gap: 6, backgroundColor: C.surface, borderRadius: 10, padding: 12, width: "100%" },
  spamTxt:      { fontSize: 11, color: C.textDim, flex: 1 },
});