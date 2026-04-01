import React, { useState } from "react";
import { View, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";

export default function Input({ icon, placeholder, value, onChangeText, secureTextEntry, keyboardType = "default", autoCapitalize = "sentences", style }) {
  const [show, setShow] = useState(false);
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, gap: 10, height: 52 }, style]}>
      {icon ? <Ionicons name={icon} size={18} color={C.textMuted} /> : null}
      <TextInput
        style={{ flex: 1, color: C.text, fontSize: 14, height: "100%" }}
        placeholder={placeholder}
        placeholderTextColor={C.textDim}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry && !show}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {secureTextEntry ? (
        <TouchableOpacity onPress={() => setShow(!show)}>
          <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
