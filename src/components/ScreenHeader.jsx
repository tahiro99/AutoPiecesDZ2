import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C } from "../constants/theme";

export default function ScreenHeader({ title, onBack, right }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flexDirection: "row", alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: insets.top + 10,
      paddingBottom: 14,
      backgroundColor: C.surface,
      borderBottomWidth: 1, borderBottomColor: C.border,
      gap: 12,
    }}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={{
          width: 38, height: 38, borderRadius: 10,
          backgroundColor: C.surfaceAlt, borderWidth: 1,
          borderColor: C.border, alignItems: "center", justifyContent: "center",
        }}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
      ) : null}
      <Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: C.text }}>{title}</Text>
      {right || <View style={{ width: 38 }} />}
    </View>
  );
}