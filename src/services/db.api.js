import { apiGet, apiPost, apiPatch, apiDelete } from "./api.client";


export async function removeFavorite(userId, listingId) {
  await apiDelete(`/favorites/${listingId}`);
}

export async function incrementViews(listingId) {
  apiPost(`/listings/${listingId}/view`).catch(() => {});
}

export async function addListing(data, userId) {
  return await apiPost("/listings", data);
}

export async function startConversation(listing, buyerId, buyerName = "") {
  const conv = await apiPost("/conversations", { listingId: listing.id });
  return conv.id;
}

export async function sendMessage(conversationId, senderId, text) {
  await apiPost(`/conversations/${conversationId}/messages`, { text });
  return conversationId;
}

export async function markAsRead(conversationId) {
  // Le serveur marque les messages comme lus à leur lecture
}
export async function addFavorite(userId, listing) {
  try {
    await apiPost(`/favorites/${listing.id}`);
    console.log(">>> favori ajouté:", listing.id);
  } catch (e) {
    console.log(">>> favori ECHEC:", e.status, e.message, "| id:", listing.id);
    throw e;
  }
}

export async function placeOrder(
  cartItems, buyerId, address, wilaya, paymentMethod,
  buyerPhone = "", buyerName = "", buyerEmail = "", deliveryFee = 0
) {
  return await Promise.all(cartItems.map((item) =>
    apiPost("/orders", {
      listingId: item.id,
      qty: item.qty || 1,
      address, wilaya, buyerPhone,
      deliveryFee: Number(deliveryFee) || 0,
    })
  ));
  
}