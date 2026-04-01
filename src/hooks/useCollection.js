import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";

export function useCollection(collectionName, orderField = "createdAt") {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, collectionName), orderBy(orderField, "desc"));
    const unsub = onSnapshot(q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.log("Firestore:", err.message); setData([]); setLoading(false); }
    );
    return () => unsub();
  }, [collectionName]);

  return { data, loading };
}
