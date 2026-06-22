// src/components/SubscriptionGate.jsx
//
// Wraps any vendeur screen/action.
// If subscription expired → shows SubscriptionScreen instead.
//
// Usage:
//   <SubscriptionGate navigation={navigation}>
//     <YourVendeurScreen />
//   </SubscriptionGate>
//
// Or as a function check before an action:
//   if (!checkSubscription(navigation)) return;

import React from "react";
import { useSubscription } from "../hooks/useSubscription";
import SubscriptionScreen from "../screens/Subscription/SubscriptionScreen";

export default function SubscriptionGate({ children, navigation }) {
  const { isActive } = useSubscription();

  if (!isActive) {
    return <SubscriptionScreen navigation={navigation} />;
  }

  return children;
}

// ── Fonction utilitaire pour vérifier avant une action ──
export function useSubscriptionCheck(navigation) {
  const { isActive } = useSubscription();

  return function checkSubscription() {
    if (!isActive) {
      navigation.navigate("Subscription");
      return false;
    }
    return true;
  };
}