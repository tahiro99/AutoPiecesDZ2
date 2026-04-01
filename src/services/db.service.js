import {
  collection, addDoc, updateDoc, doc, setDoc, deleteDoc,
  serverTimestamp, increment, writeBatch, getDocs, query, where,
} from "firebase/firestore";
import { db } from "../config/firebase";

// ─── LISTINGS ───────────────────────────────────────────────
export async function addListing(data, userId) {
  return await addDoc(collection(db, "listings"), {
    ...data, sellerId: userId, createdAt: serverTimestamp(), views: 0, status: "active",
  });
}
export async function incrementViews(listingId) {
  try { await updateDoc(doc(db, "listings", listingId), { views: increment(1) }); }
  catch (e) { console.log(e); }
}

// ─── MESSAGES ───────────────────────────────────────────────
// Retourne l'ID d'une conversation existante ou null (sans créer)
export async function startConversation(listing, buyerId) {
  const ex = await getDocs(query(collection(db, "conversations"),
    where("listingId", "==", listing.id), where("buyerId", "==", buyerId)));
  if (!ex.empty) return ex.docs[0].id;
  // Retourne un objet avec les infos pour créer la conv au premier message
  return { pending: true, listing, buyerId };
}

export async function sendMessage(conversationId, senderId, text) {
  // Si c'est un objet pending → créer la conversation d'abord
  if (conversationId?.pending) {
    const { listing, buyerId } = conversationId;
    const ref = await addDoc(collection(db, "conversations"), {
      participants: [buyerId, listing.sellerId], buyerId, sellerId: listing.sellerId,
      listingId: listing.id, listingTitle: listing.title, listingPrice: listing.price,
      sellerName: listing.sellerName, lastMessage: text, lastMessageAt: serverTimestamp(),
      unread: 1, createdAt: serverTimestamp(),
    });
    const msgRef = doc(collection(db, "conversations", ref.id, "messages"));
    await setDoc(msgRef, { senderId, text, type: "text", read: false, createdAt: serverTimestamp() });
    return ref.id;
  }

  const batch  = writeBatch(db);
  const msgRef = doc(collection(db, "conversations", conversationId, "messages"));
  batch.set(msgRef, { senderId, text, type: "text", read: false, createdAt: serverTimestamp() });
  batch.update(doc(db, "conversations", conversationId), { lastMessage: text, lastMessageAt: serverTimestamp(), unread: increment(1) });
  await batch.commit();
  return conversationId;
}
export async function markAsRead(conversationId) {
  try { await updateDoc(doc(db, "conversations", conversationId), { unread: 0 }); }
  catch (e) { console.log(e); }
}

// ─── ORDERS ─────────────────────────────────────────────────
export async function placeOrder(cartItems, buyerId, address, wilaya, paymentMethod, buyerPhone = "", buyerName = "", buyerEmail = "") {
  return await Promise.all(cartItems.map((item) =>
    addDoc(collection(db, "orders"), {
      buyerId,
      sellerId:     item.sellerId,
      listingId:    item.id,
      listingTitle: item.title,
      price:        item.price,
      qty:          item.qty || 1,
      sellerName:   item.sellerName,
      buyerName,
      buyerPhone,
      buyerEmail,
      status:        "pending",
      wilaya,
      address,
      paymentMethod,
      createdAt:     serverTimestamp(),
    })
  ));
}

// ─── FAVORITES ──────────────────────────────────────────────
export async function addFavorite(userId, listing) {
  await setDoc(doc(db, "favorites", `${userId}_${listing.id}`), {
    userId, listingId: listing.id, listingTitle: listing.title,
    listingPrice: listing.price, listingImg: listing.img,
    sellerName: listing.sellerName, wilaya: listing.wilaya,
    condition: listing.condition, createdAt: serverTimestamp(),
  });
}
export async function removeFavorite(userId, listingId) {
  await deleteDoc(doc(db, "favorites", `${userId}_${listingId}`));
}