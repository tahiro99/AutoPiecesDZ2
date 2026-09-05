import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, where, limit as fbLimit } from "firebase/firestore";
import { db } from "../config/firebase";

const DEFAULT_LIMIT = 100;

/**
 * Ancien usage (inchangé) :
 *   useCollection("listings")
 *   useCollection("conversations", "lastMessageAt")
 *
 * Nouvel usage — filtrage CÔTÉ SERVEUR :
 *   useCollection("orders", { filters: [["sellerId", "==", uid]], enabled: !!uid })
 */
export function useCollectionFirebase(collectionName, options = "createdAt", legacyMax = DEFAULT_LIMIT) {
  const opts = typeof options === "string"
    ? { orderField: options, max: legacyMax, filters: [] }
    : { orderField: "createdAt", max: DEFAULT_LIMIT, filters: [], ...options };

  const { orderField, max, filters, enabled = true } = opts;

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [truncated, setTruncated] = useState(false);

  const filterKey = useMemo(() => JSON.stringify(filters), [filters]);

  useEffect(() => {
    if (!enabled) { setData([]); setLoading(false); return; }

    const cons = JSON.parse(filterKey).map(([f, op, v]) => where(f, op, v));
    if (orderField) cons.push(orderBy(orderField, "desc"));
    cons.push(fbLimit(max));

    const unsub = onSnapshot(
      query(collection(db, collectionName), ...cons),
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        const hit = snap.docs.length >= max;
        setTruncated(hit);
        if (hit) console.warn(`[useCollection] "${collectionName}" plafonné à ${max}`);
        setLoading(false);
      },
      (err) => {
        console.log(`[useCollection] ${collectionName}:`, err.message);
        setData([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [collectionName, orderField, max, filterKey, enabled]);

  return { data, loading, truncated };
}