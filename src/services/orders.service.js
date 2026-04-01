import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase";

export async function placeOrder(cartItems, buyerId, address, wilaya, paymentMethod) {
  return await Promise.all(
    cartItems.map((item) =>
      addDoc(collection(db, "orders"), {
        buyerId,
        sellerId:     item.sellerId,
        listingId:    item.id,
        listingTitle: item.title,
        price:        item.price,
        qty:          item.qty || 1,
        sellerName:   item.sellerName,
        status:       "pending",
        wilaya,
        address,
        paymentMethod,
        createdAt:    serverTimestamp(),
      })
    )
  );
}
