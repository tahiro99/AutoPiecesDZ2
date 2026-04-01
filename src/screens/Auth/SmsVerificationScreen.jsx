import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../../config/firebase";
import { C } from "../../constants/theme";
import Btn from "../../components/Btn";

export default function SmsVerificationScreen({ route, navigation }) {
  const { phone, email, name, role } = route.params || {};
  const [code, setCode]     = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]   = useState(60);
  const [error, setError]   = useState("");
  const inputs = useRef([]);

  useEffect(() => {
    const t = setInterval(() => setTimer((v) => v > 0 ? v - 1 : 0), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code]; next[idx] = val; setCode(next);
    if (val && idx < 5) inputs.current[idx + 1]?.focus();
    if (!val && idx > 0) inputs.current[idx - 1]?.focus();
  };

  const handleVerify = async () => {
    const fullCode = code.join("");
    if (fullCode.length < 6) { setError("Entrez le code à 6 chiffres"); return; }
    setError(""); setLoading(true);
    // In production: verify SMS code here
    // For now, accept any 6-digit code and proceed
    setTimeout(() => {
      setLoading(false);
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }, 800);
  };

  const resend = async () => {
    if (timer > 0) return;
    setTimer(60);
    setCode(["", "", "", "", "", ""]);
    try {
      const u = auth.currentUser;
      if (u) await sendEmailVerification(u);
    } catch (e) { console.log(e); }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name="chevron-back" size={20} color={C.text} />
      </TouchableOpacity>

      <View style={s.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={36} color={C.accent} />
      </View>

      <Text style={s.title}>Vérification du compte</Text>
      <Text style={s.sub}>
        Un code de vérification a été envoyé à{"\n"}
        <Text style={{ color: C.accent, fontWeight: "700" }}>{email}</Text>
      </Text>

      {error ? (
        <View style={s.errorBox}><Text style={s.errorTxt}>{error}</Text></View>
      ) : null}

      <View style={s.codeRow}>
        {code.map((digit, idx) => (
          <TextInput key={idx} ref={(r) => inputs.current[idx] = r}
            style={[s.codeInput, digit && s.codeInputFilled]}
            value={digit} onChangeText={(v) => handleChange(v, idx)}
            keyboardType="numeric" maxLength={1} selectTextOnFocus />
        ))}
      </View>

      <Btn onPress={handleVerify} loading={loading} style={s.btnVerify}>
        Vérifier le code
      </Btn>

      <TouchableOpacity onPress={resend} disabled={timer > 0} style={s.resendBtn}>
        <Text style={[s.resendTxt, timer > 0 && { color: C.textDim }]}>
          {timer > 0 ? `Renvoyer dans ${timer}s` : "Renvoyer le code"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })} style={s.skipBtn}>
        <Text style={s.skipTxt}>Vérifier plus tard</Text>
        <Ionicons name="chevron-forward" size={13} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 60 },
  back:           { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  iconWrap:       { width: 70, height: 70, borderRadius: 22, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 24, alignSelf: "center" },
  title:          { fontSize: 26, fontWeight: "900", color: C.text, textAlign: "center", marginBottom: 8 },
  sub:            { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  errorBox:       { backgroundColor: C.danger + "15", borderWidth: 1, borderColor: C.danger + "40", borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:       { fontSize: 13, color: C.danger, textAlign: "center" },
  codeRow:        { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 32 },
  codeInput:      { width: 46, height: 56, borderRadius: 12, backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, textAlign: "center", fontSize: 22, fontWeight: "900", color: C.text },
  codeInputFilled:{ borderColor: C.accent, backgroundColor: C.accent + "10" },
  btnVerify:      { marginBottom: 16 },
  resendBtn:      { alignItems: "center", paddingVertical: 10 },
  resendTxt:      { fontSize: 14, color: C.accent, fontWeight: "700" },
  skipBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 20, paddingVertical: 8 },
  skipTxt:        { fontSize: 13, color: C.textMuted },
});
