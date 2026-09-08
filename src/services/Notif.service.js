import { USE_API } from "../config/backend";
import * as fb from "./notif.firebase";
import * as api from "./notif.api";

const impl = USE_API ? api : fb;

export const createNotif  = impl.createNotif;
export const listenNotifs = impl.listenNotifs;
export const markRead     = impl.markRead;
export const markAllRead  = impl.markAllRead;