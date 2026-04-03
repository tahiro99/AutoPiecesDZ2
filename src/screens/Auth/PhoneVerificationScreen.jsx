import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../../constants/theme";
import { useLanguage } from "../../i18n/languagecontext";

export default function PhoneVerificationScreen({ navigation }) {
  const { isRTL } = useLanguage();
  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={20} color={C.text} />
      </TouchableOpacity>
      <View style={s.iconWrap}>
        <Ionicons name="phone-portrait-outline" size={36} color={C.accent} />
      </View>
      <Text style={s.title}>{isRTL ? "تحقق برقم الهاتف" : "Vérification par SMS"}</Text>
      <Text style={s.sub}>{isRTL ? "قريباً" : "Bientôt disponible"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 28, paddingTop: 60 },
  back:      { width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 32 },
  iconWrap:  { width: 70, height: 70, borderRadius: 22, backgroundColor: C.accent + "15", borderWidth: 2, borderColor: C.accent + "40", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title:     { fontSize: 26, fontWeight: "900", color: C.text, marginBottom: 8 },
  sub:       { fontSize: 14, color: C.textMuted },
});
