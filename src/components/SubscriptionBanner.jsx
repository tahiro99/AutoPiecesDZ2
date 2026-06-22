// src/components/SubscriptionBanner.jsx
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../constants/theme";
import { useSubscription } from "../hooks/useSubscription";

export default function SubscriptionBanner({ navigation }) {
  try {
    const { isExpiringSoon, isExpired, daysLeft, isTrial } = useSubscription();

    if (!isExpiringSoon && !isExpired) return null;

    const isUrgent = daysLeft <= 3 || isExpired;

    return (
      <TouchableOpacity
        style={[s.banner, isUrgent ? s.urgent : s.warning]}
        onPress={() => navigation?.navigate("Subscription")}
        activeOpacity={0.8}>
        <Ionicons
          name={isExpired ? "lock-closed-outline" : "warning-outline"}
          size={18}
          color={isUrgent ? C.danger : C.warning}
        />
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: isUrgent ? C.danger : C.warning }]}>
            {isExpired
              ? "Abonnement expiré"
              : `Expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`}
          </Text>
          <Text style={s.sub}>
            {isExpired ? "Renouvelez pour continuer à vendre." : "Pensez à renouveler."}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </TouchableOpacity>
    );
  } catch (e) {
    return null;
  }
}

const s = StyleSheet.create({
  banner:   { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, marginHorizontal: 16, marginTop: 12, borderRadius: 14, borderWidth: 1 },
  warning:  { backgroundColor: C.warning + "10", borderColor: C.warning + "30" },
  urgent:   { backgroundColor: C.danger  + "10", borderColor: C.danger  + "30" },
  title:    { fontSize: 13, fontWeight: "800", marginBottom: 2 },
  sub:      { fontSize: 11, color: C.textMuted },
});