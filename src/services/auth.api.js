import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiPost, saveTokens, clearTokens, loadTokens, apiGet } from "./api.client";

// Messages d'erreur adaptés aux réponses de l'API
export const getErrorMessage = (e) => {
  if (e?.status === 409) return "Cet email est déjà utilisé.";
  if (e?.status === 401) return "Email ou mot de passe incorrect.";
  if (e?.status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (e?.status === 0)   return "Pas de connexion internet.";
  if (e?.status === 400) return e.message || "Données invalides.";
  return e?.message || "Erreur inattendue.";
};

// L'API renvoie { user, accessToken, refreshToken }.
// On garde le rôle en attente : il sera envoyé après, via /me/role
export async function register(email, password, displayName, role, phone) {
  const d = await apiPost("/auth/register", {
    email: email.trim().toLowerCase(),
    password,
    displayName: displayName.trim(),
    phone: phone?.trim() || "",
  });

  await saveTokens(d.accessToken, d.refreshToken);

  if (role) {
    try {
      await apiPost("/me/role", { role });
      d.user.role = role;
    } catch (e) {}
  }

  return d.user;
}

export async function login(email, password) {
  const d = await apiPost("/auth/login", {
    email: email.trim().toLowerCase(),
    password,
  });

  await saveTokens(d.accessToken, d.refreshToken);
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
}

// Restaure la session au démarrage — remplace onAuthStateChanged
export async function restoreSession() {
  const { accessToken, refreshToken } = await loadTokens();
  if (!accessToken && !refreshToken) return null;
  try {
    return await apiGet("/auth/me");
  } catch (e) {
    await clearTokens();
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