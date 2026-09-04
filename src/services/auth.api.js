import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost, apiGet, saveTokens, clearTokens, loadTokens } from "./api.client";
import { emitAuthChange } from "./authEvents";

export const getErrorMessage = (e) => {
  if (e?.status === 409) return "Cet email est déjà utilisé.";
  if (e?.status === 401) return "Email ou mot de passe incorrect.";
  if (e?.status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (e?.status === 0)   return "Pas de connexion internet.";
  if (e?.status === 400) return e.message || "Données invalides.";
  return e?.message || "Erreur inattendue.";
};

export async function register(email, password, displayName, role, phone, wilaya) {
  const d = await apiPost("/auth/register", {
    email: email.trim().toLowerCase(),
    password,
    displayName: displayName.trim(),
    phone: phone?.trim() || "",
    wilaya: wilaya || "",
  });

  await saveTokens(d.accessToken, d.refreshToken);

  // Le rôle se définit après l'inscription — l'essai vendeur est créé côté serveur
  if (role) {
    try {
      await apiPost("/me/role", { role });
      d.user.role = role;
    } catch (e) {}
  }

  emitAuthChange(d.user);
  return d.user;
}

export async function login(email, password) {
  const d = await apiPost("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });

  await saveTokens(d.accessToken, d.refreshToken);
  emitAuthChange(d.user);
  return d.user;
}

export async function resetPassword(email) {
  await apiPost("/auth/forgot-password", { email: email.trim().toLowerCase() });
}

export async function logout() {
  const { refreshToken } = await loadTokens();
  try {
    await apiPost("/auth/logout", { refreshToken });
  } catch (e) {}
  await clearTokens();
  await AsyncStorage.multiRemove(["@apz_profile", "@apz_role"]).catch(() => {});
  emitAuthChange(null);
}

// Remplace onAuthStateChanged : vérifie au démarrage si les jetons sont valides
export async function restoreSession() {
  const { accessToken, refreshToken } = await loadTokens();
  console.log(">>> restore | tokens:", !!accessToken, !!refreshToken);
  if (!accessToken && !refreshToken) return null;

  try {
    const user = await apiGet("/auth/me");
    console.log(">>> restore OK:", user?.displayName, user?.role);
    await AsyncStorage.setItem("@apz_profile", JSON.stringify(user)).catch(() => {});
    return user;
  } catch (e) {
    console.log(">>> restore ECHEC:", e.status, e.message);
    if (e.status === 401) {
      await clearTokens();
      await AsyncStorage.removeItem("@apz_profile").catch(() => {});
      return null;
    }
    try {
      const cached = await AsyncStorage.getItem("@apz_profile");
      if (cached) return JSON.parse(cached);
    } catch (_) {}
    return null;
  }
}

export async function changePassword(current, next) {
  const d = await apiPost("/auth/change-password", { current, next });
  if (d?.refreshToken) {
    const { accessToken } = await loadTokens();
    await saveTokens(accessToken, d.refreshToken);
  }
  return d;
}