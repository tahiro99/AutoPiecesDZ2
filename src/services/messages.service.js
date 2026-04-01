import {
  collection, addDoc, updateDoc, doc,
  serverTimestamp, writeBatch, getDocs, query, where
} from "firebase/firestore";
import { db } from "../config/firebase";

export async function startConversation(listing, buyerId) {
  const existing = await getDocs(
    query(
      collection(db, "conversations"),
      where("listingId", "==", listing.id),
      where("buyerId", "==", buyerId)
    )
  );
  if (!existing.empty) return existing.docs[0].id;
  const ref = await addDoc(collection(db, "conversations"), {
    participants:  [buyerId, listing.sellerId],
    buyerId,
    sellerId:      listing.sellerId,
    listingId:     listing.id,
    listingTitle:  listing.title,
    listingPrice:  listing.price,
    sellerName:    listing.sellerName,
    lastMessage:   "",
    lastMessageAt: serverTimestamp(),
    unread:        0,
    createdAt:     serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessage(conversationId, senderId, text) {
  const batch  = writeBatch(db);
  const msgRef = doc(collection(db, "conversations", conversationId, "messages"));
  batch.set(msgRef, { senderId, text, type: "text", read: false, createdAt: serverTimestamp() });
  batch.update(doc(db, "conversations", conversationId), {
    lastMessage:   text,
    lastMessageAt: serverTimestamp(),
  });
  await batch.commit();
}

export async function markAsRead(conversationId) {
  try { await updateDoc(doc(db, "conversations", conversationId), { unread: 0 }); }
  catch (e) { console.log(e); }
}
