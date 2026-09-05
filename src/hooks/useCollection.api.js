import { useState, useEffect, useMemo, useCallback } from "react";
import { apiGet } from "../services/api.client";

// Traduit un appel useCollection en requête API
function buildRequest(name, opts) {
  const f = {};
  for (const [field, op, val] of (opts.filters || [])) {
    if (op === "==") f[field] = val;
    if (op === "array-contains") f[field] = val;
  }

  switch (name) {
    case "listings": {
      const p = new URLSearchParams();
      if (f.sellerId)  p.set("sellerId", f.sellerId);
      if (f.category)  p.set("category", f.category);
      if (f.wilaya)    p.set("wilaya", f.wilaya);
      if (f.condition) p.set("condition", f.condition);
      p.set("limit", String(opts.max || 100));
      return { path: `/listings?${p}`, pick: (d) => d.items };
    }

    case "favorites":
      return { path: "/favorites", pick: (d) => d };

    case "orders":
      // sellerId présent = vue vendeur
      return { path: f.sellerId ? "/orders?as=seller" : "/orders", pick: (d) => d };

    case "conversations":
      return { path: "/conversations", pick: (d) => d };

    case "notifications":
      return { path: "/notifications", pick: (d) => d };

    case "ratings":
      return f.sellerId
        ? { path: `/sellers/${f.sellerId}/ratings`, pick: (d) => d.items }
        : null;

    default:
      return null;
  }
}

export function useCollectionApi(collectionName, options = "createdAt", legacyMax = 100) {
  const opts = typeof options === "string"
    ? { orderField: options, max: legacyMax, filters: [] }
    : { orderField: "createdAt", max: 100, filters: [], ...(options || {}) };

  const enabled = opts.enabled !== false;
  const filterKey = useMemo(() => JSON.stringify(opts.filters || []), [opts.filters]);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick]       = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) { setData([]); setLoading(false); return; }

    let cancelled = false;
    const req = buildRequest(collectionName, {
      ...opts, filters: JSON.parse(filterKey),
    });

    if (!req) {
      console.warn(`[useCollection] "${collectionName}" non supporté par l'API`);
      setData([]);
      setLoading(false);
      return;
    }

        (async () => {
      try {
        const d = await apiGet(req.path);
        console.log(`>>> API ${collectionName}:`, req.path, "→", Array.isArray(d) ? d.length : typeof d);
        if (!cancelled) {
          setData(req.pick(d) || []);
          setLoading(false);
        }
      } catch (e) {
        console.log(`>>> API ${collectionName} ECHEC:`, e.status, e.message);
        if (!cancelled) {
          setData([]);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [collectionName, filterKey, opts.max, enabled, tick]);

  return { data, loading, truncated: false, refresh };
}