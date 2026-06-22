// ─────────────────────────────────────────────────────────────────────────────
// In-memory + AsyncStorage cache with TTL.
// Réduit drastiquement les lectures Firestore : un user profile lu 50× par
// session ne coûtera qu'1 read au lieu de 50.
//
// Usage :
//   const profile = await cachedFetch(`user:${uid}`, () => getDoc(...), 5*60_000);
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from "@react-native-async-storage/async-storage";

const memory = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

export async function cachedFetch(key, fetcher, ttl = DEFAULT_TTL) {
  const now = Date.now();

  // 1. Cache mémoire (le plus rapide)
  const mem = memory.get(key);
  if (mem && mem.expiresAt > now) return mem.value;

  // 2. Cache disque (persistant entre les sessions)
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (raw) {
      const { value, expiresAt } = JSON.parse(raw);
      if (expiresAt > now) {
        memory.set(key, { value, expiresAt });
        return value;
      }
    }
  } catch (_) {}

  // 3. Fetch réseau (Firestore / Firebase Storage)
  const value = await fetcher();
  const expiresAt = now + ttl;
  memory.set(key, { value, expiresAt });
  AsyncStorage.setItem(`cache:${key}`, JSON.stringify({ value, expiresAt })).catch(() => {});
  return value;
}

// Vider le cache d'une clé spécifique (après update)
export function invalidateCache(key) {
  memory.delete(key);
  AsyncStorage.removeItem(`cache:${key}`).catch(() => {});
}

// Vider TOUT le cache (à la déconnexion par exemple)
export async function clearCache() {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith("cache:"));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch (_) {}
}

// Stats — utile pour debug en dev
export function getCacheStats() {
  return {
    memoryEntries: memory.size,
    keys: Array.from(memory.keys()),
  };
}
