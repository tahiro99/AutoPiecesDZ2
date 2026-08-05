import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, limit as fbLimit } from "firebase/firestore";
import { db } from "../config/firebase";

// Default cap to avoid loading the entire collection into memory.
// Override per-screen with the third argument when needed.
const DEFAULT_LIMIT = 100;

export function useCollection(collectionName, orderField = "createdAt", max = DEFAULT_LIMIT) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, collectionName),
      orderBy(orderField, "desc"),
      fbLimit(max)
    );
    const unsub = onSnapshot(q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.log("Firestore:", err.message); setData([]); setLoading(false); }
    );
    return () => unsub();
  }, [collectionName, orderField, max]);

  return { data, loading };
}