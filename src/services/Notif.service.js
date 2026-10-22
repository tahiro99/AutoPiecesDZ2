import {
  collection, addDoc, serverTimestamp,
  query, onSnapshot, limit,
  updateDoc, doc, writeBatch, getDocs, where,
} from "firebase/firestore";
import { db } from "../config/firebase";

export async function createNotif(userId, { type, title, body, data = {} }) {
  if (!userId) { console.log("[notif] no userId"); return; }


  const cleanData = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v !== undefined && v !== null) cleanData[k] = v;
  }

  try {
    const ref = await addDoc(collection(db, "notifications", userId, "items"), {
      type:  type  || "general",
      title: title || "Notification",
      body:  body  || "",
      data:  cleanData,
      read:  false,
      createdAt: serverTimestamp(),
    });
    console.log("[notif] created:", ref.id, "for user:", userId);
  } catch (e) {
    console.log("[notif] ERROR:", e.message);
  }
}

export function listenNotifs(userId, callback) {
  if (!userId) return () => {};
  const q = query(
    collection(db, "notifications", userId, "items"),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    console.log("[notif] received:", snap.docs.length, "notifs");
    const items = snap.docs
      .map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toMillis?.() ?? Date.now(),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(items);
  }, (err) => {
    console.log("[notif] listen ERROR:", err.message);
    callback([]);
  });
}

export async function markRead(userId, notifId) {
  if (!userId || !notifId) return;
  await updateDoc(doc(db, "notifications", userId, "items", notifId), { read: true });
}

export async function markAllRead(userId) {
  if (!userId) return;
  const q = query(
    collection(db, "notifications", userId, "items"),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}
