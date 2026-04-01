import React from "react";
import { View, ActivityIndicator } from "react-native";
import { C } from "../constants/theme";
export default function Spinner({ size = "large", style }) {
  return (
    <View style={[{ padding: 40, alignItems: "center", justifyContent: "center" }, style]}>
      <ActivityIndicator size={size} color={C.accent} />
    </View>
  );
}
