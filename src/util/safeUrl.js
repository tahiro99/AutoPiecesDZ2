// Defense-in-depth : valide qu'une URL d'image vient bien d'une source HTTPS
// connue. Empêche l'injection de javascript:, file://, data: URIs et autres
// schémas dangereux si un champ Firestore venait à être manipulé.

const ALLOWED_HOSTS = [
  "firebasestorage.googleapis.com",
  "sustained-hold-486101-b9.firebasestorage.app",
  "lh3.googleusercontent.com",      // Google profile photos
  "graph.facebook.com",              // FB profile photos
];

export function safeImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed.startsWith("https://")) return null;
  try {
    const u = new URL(trimmed);
    if (!ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) {
      return null;
    }
    return trimmed;
  } catch (_) {
    return null;
  }
}
