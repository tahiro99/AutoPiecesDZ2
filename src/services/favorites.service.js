import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export async function addFavorite(userId, listing) {
  await setDoc(doc(db, "favorites", `${userId}_${listing.id}`), {
    userId,
    listingId:    listing.id,
    listingTitle: listing.title,
    listingPrice: listing.price,
    listingImg:   listing.img,
    sellerName:   listing.sellerName,
    wilaya:       listing.wilaya,
    condition:    listing.condition,
    createdAt:    serverTimestamp(),
  });
}

export async function removeFavorite(userId, listingId) {
  await deleteDoc(doc(db, "favorites", `${userId}_${listingId}`));
}
