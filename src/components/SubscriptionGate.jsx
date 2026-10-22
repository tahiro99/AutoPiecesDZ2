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
