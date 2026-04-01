import { collection, addDoc, updateDoc, doc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "../config/firebase";

export async function addListing(data, userId) {
  return await addDoc(collection(db, "listings"), {
    ...data,
    sellerId:  userId,
    createdAt: serverTimestamp(),
    views:     0,
    status:    "active",
  });
}

export async function incrementViews(listingId) {
  try {
    await updateDoc(doc(db, "listings", listingId), { views: increment(1) });
  } catch (e) { console.log(e); }
}
