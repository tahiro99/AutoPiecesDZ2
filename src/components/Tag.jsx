import React from "react";
import { View, Text } from "react-native";
import { C } from "../constants/theme";
export default function Tag({ children, color = C.textMuted }) {
  return (
    <View style={{ backgroundColor: color + "22", borderWidth: 1, borderColor: color + "50", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ fontSize: 9, fontWeight: "800", color, letterSpacing: 0.5 }}>{children}</Text>
    </View>
  );
}
