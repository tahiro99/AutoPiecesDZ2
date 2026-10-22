
import AsyncStorage from "@react-native-async-storage/async-storage";

const memory = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 min

export async function cachedFetch(key, fetcher, ttl = DEFAULT_TTL) {
  const now = Date.now();

  const mem = memory.get(key);
  if (mem && mem.expiresAt > now) return mem.value;

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

  const value = await fetcher();
  const expiresAt = now + ttl;
  memory.set(key, { value, expiresAt });
  AsyncStorage.setItem(`cache:${key}`, JSON.stringify({ value, expiresAt })).catch(() => {});
  return value;
}

export function invalidateCache(key) {
  memory.delete(key);
  AsyncStorage.removeItem(`cache:${key}`).catch(() => {});
}

export async function clearCache() {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith("cache:"));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch (_) {}
}

export function getCacheStats() {
  return {
    memoryEntries: memory.size,
    keys: Array.from(memory.keys()),
  };
}
