import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { USE_API } from "../config/backend";
import { apiGet } from "../services/api.client";
import { getSocket } from "../services/socket.client";

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading]   = useState(true);

  // ── MODE API : chargement initial + WebSocket ──
  useEffect(() => {
    if (!USE_API) return;
    if (!conversationId) { setMessages([]); setLoading(false); return; }

    let cancelled = false;

    (async () => {
      try {
        const list = await apiGet(`/conversations/${conversationId}/messages`);
        if (!cancelled) { setMessages(list || []); setLoading(false); }
      } catch (e) {
        if (!cancelled) { console.log("[messages]", e.message); setLoading(false); }
      }
    })();

    const socket = getSocket();
    if (!socket) return () => { cancelled = true; };

    const join = () => socket.emit("join", conversationId);
    join();
    socket.on("connect", join);

    const onMessage = (msg) => {
      if (msg.conversationId !== conversationId) return;
      // Évite les doublons : le message peut arriver par la réponse HTTP ET par le socket
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
    };

    socket.on("message", onMessage);

    return () => {
      cancelled = true;
      socket.off("message", onMessage);
      socket.off("connect", join);
      socket.emit("leave", conversationId);
    };
  }, [conversationId]);

  // ── MODE FIREBASE ──
  useEffect(() => {
    if (USE_API) return;
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