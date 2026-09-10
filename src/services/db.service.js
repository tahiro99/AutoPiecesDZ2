import { USE_API } from "../config/backend";
import * as fb from "./db.firebase";
import * as api from "./db.api";

const impl = USE_API ? api : fb;

export const addListing        = impl.addListing;
export const incrementViews    = impl.incrementViews;
export const startConversation = impl.startConversation;
export const sendMessage       = impl.sendMessage;
export const markAsRead        = impl.markAsRead;
export const placeOrder        = impl.placeOrder;
export const addFavorite       = impl.addFavorite;
export const removeFavorite    = impl.removeFavorite;
export const updateOrderStatus = impl.updateOrderStatus;
export const deleteListing     = impl.deleteListing;
export const updateListing     = impl.updateListing;
export const rateOrder         = impl.rateOrder;
export const blockUser   = impl.blockUser;
export const unblockUser = impl.unblockUser;
export const reportUser  = impl.reportUser;