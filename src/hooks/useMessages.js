import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!conversationId) { setLoading(false); return; }
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q,
      (snap) => { setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); setLoading(false); },
      (err)  => { console.log("Messages:", err.message); setLoading(false); }
    );
    return () => unsub();
  }, [conversationId]);

  return { messages, loading };
}
