// src/hooks/useSubscription.js
import { useAuthContext } from "../context/AuthContext";
import { getSubscriptionStatus, getDaysLeft } from "../services/subscription.service";

export function useSubscription() {
  try {
    const { profile } = useAuthContext();
    const sub = profile?.subscription || null;
    const status = getSubscriptionStatus(sub);
    const daysLeft = getDaysLeft(sub);
    const isActive = status === "trial" || status === "active";
    const isExpired = status === "expired";
    const isTrial = status === "trial";
    const isExpiringSoon = isActive && daysLeft <= 7;

    return { sub, status, daysLeft, isActive, isExpired, isTrial, isExpiringSoon };
  } catch (e) {
    return { sub: null, status: "none", daysLeft: 0, isActive: false, isExpired: false, isTrial: false, isExpiringSoon: false };
  }
}