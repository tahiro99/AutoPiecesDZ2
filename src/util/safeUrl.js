

const ALLOWED_HOSTS = [
  "firebasestorage.googleapis.com",
  "sustained-hold-486101-b9.firebasestorage.app",
  "lh3.googleusercontent.com",      
  "graph.facebook.com",              
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
