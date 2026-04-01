import React from "react";
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";
import { C } from "../constants/theme";
export default function Btn({ children, onPress, variant = "primary", small = false, loading = false, style: sx = {} }) {
  const map = {
    primary:   { bg: C.accent,      fg: "#000",   border: null              },
    secondary: { bg: C.surfaceAlt,  fg: C.text,   border: C.border          },
    danger:    { bg: C.danger,      fg: "#fff",   border: null              },
    ghost:     { bg: "transparent", fg: C.accent, border: C.accent + "50"   },
  };
  const v = map[variant] || map.primary;
  return (
    <TouchableOpacity onPress={onPress} disabled={loading} activeOpacity={0.8}
      style={[{ borderRadius: 12, alignItems: "center", justifyContent: "center",
        paddingHorizontal: 20, paddingVertical: small ? 9 : 15,
        backgroundColor: v.bg, opacity: loading ? 0.7 : 1,
        ...(v.border ? { borderWidth: 1.5, borderColor: v.border } : {}),
      }, sx]}>
      {loading
        ? <ActivityIndicator size="small" color={v.fg} />
        : <Text style={{ color: v.fg, fontSize: small ? 12 : 14, fontWeight: "800" }}>{children}</Text>}
    </TouchableOpacity>
  );
}
