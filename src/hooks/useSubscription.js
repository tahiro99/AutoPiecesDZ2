// src/hooks/useSubscription.js
import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../context/AuthContext";
import { getSubscriptionStatus, getDaysLeft } from "../services/subscription.service";
import { USE_API } from "../config/backend";
import { apiGet } from "../services/api.client";

const EMPTY = {
  sub: null, status: "none", daysLeft: 0,
  isActive: false, isExpired: false, isTrial: false, isExpiringSoon: false,
  loading: false, refresh: () => {},
};

export function useSubscription() {
  const { profile, user } = useAuthContext();
  const [apiSub, setApiSub]   = useState(null);
  const [loading, setLoading] = useState(USE_API);
  const [tick, setTick]       = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!USE_API) return;

    // Seuls les vendeurs ont un abonnement
    if (!user || profile?.role !== "vendeur") {
      setApiSub(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const d = await apiGet("/me/subscription");
                
        console.log(">>> abonnement:", JSON.stringify(d));
        if (!cancelled) { setApiSub(d); setLoading(false); }
      } catch (e) {
        // En cas d'erreur réseau, ne pas bloquer le vendeur
        if (!cancelled) { setApiSub(null); setLoading(false); }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id, profile?.role, tick]);

  // ── MODE API ──
  if (USE_API) {
    if (!apiSub) return { ...EMPTY, loading, refresh };

    const status   = apiSub.status || "none";
    const daysLeft = Number(apiSub.daysLeft) || 0;
    const isActive = (status === "trial" || status === "active") && !apiSub.isExpired;

    return {
      sub: apiSub,
      status,
      daysLeft,
      isActive,
      isExpired: !!apiSub.isExpired,
      isTrial: status === "trial",
      isExpiringSoon: isActive && daysLeft <= 7,
      loading,
      refresh,
    };
  }

  // ── MODE FIREBASE ──
  try {
    const sub      = profile?.subscription || null;
    const status   = getSubscriptionStatus(sub);
    const daysLeft = getDaysLeft(sub);
    const isActive = status === "trial" || status === "active";

    return {
      sub, status, daysLeft, isActive,
      isExpired: status === "expired",
      isTrial: status === "trial",
      isExpiringSoon: isActive && daysLeft <= 7,
      loading: false,
      refresh,
    };
  } catch (e) {
    return { ...EMPTY, refresh };
  }
}