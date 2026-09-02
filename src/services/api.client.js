import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config/backend";

const ACCESS_KEY  = "@apz_access_token";
const REFRESH_KEY = "@apz_refresh_token";

let accessToken  = null;
let refreshToken = null;
let refreshing   = null;   // évite plusieurs rafraîchissements simultanés

export async function loadTokens() {
  const [[, a], [, r]] = await AsyncStorage.multiGet([ACCESS_KEY, REFRESH_KEY]);
  accessToken  = a;
  refreshToken = r;
  return { accessToken, refreshToken };
}

export async function saveTokens(a, r) {
  accessToken  = a;
  refreshToken = r;
  await AsyncStorage.multiSet([[ACCESS_KEY, a], [REFRESH_KEY, r]]);
}

export async function clearTokens() {
  accessToken = refreshToken = null;
  await AsyncStorage.multiRemove([ACCESS_KEY, REFRESH_KEY]);
}

export const getAccessToken = () => accessToken;

// Rafraîchit le jeton — une seule fois même si plusieurs appels échouent ensemble
async function doRefresh() {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) { await clearTokens(); return false; }

      const d = await res.json();
      await saveTokens(d.accessToken, d.refreshToken);
      return true;
    } catch (e) {
      return false;
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
}

/**
 * Appel API avec rafraîchissement automatique du jeton.
 * Lève une erreur enrichie : e.status et e.code sont disponibles.
 */
export async function api(path, options = {}, retry = true) {
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (e) {
    const err = new Error("Connexion impossible");
    err.status = 0;
    throw err;
  }

  // Jeton expiré → on rafraîchit et on rejoue une fois
  if (res.status === 401 && retry) {
    const ok = await doRefresh();
    if (ok) return api(path, options, false);
  }

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const err = new Error(data?.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.code   = data?.code;
    throw err;
  }

  return data;
}

// Raccourcis
export const apiGet    = (p)    => api(p);
export const apiPost   = (p, b) => api(p, { method: "POST",   body: JSON.stringify(b || {}) });
export const apiPatch  = (p, b) => api(p, { method: "PATCH",  body: JSON.stringify(b || {}) });
export const apiDelete = (p)    => api(p, { method: "DELETE" });

// Upload d'image
export async function apiUpload(uri, kind = "listing") {
  const form = new FormData();
  form.append("image", { uri, name: "photo.jpg", type: "image/jpeg" });
  form.append("kind", kind);
  return api("/upload", { method: "POST", body: form });
}