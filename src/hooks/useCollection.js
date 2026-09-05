import { USE_API } from "../config/backend";
import { useCollectionFirebase } from "./useCollection.firebase";
import { useCollectionApi } from "./useCollection.api";

export function useCollection(collectionName, options, legacyMax) {
  const opts = typeof options === "string"
    ? { orderField: options, max: legacyMax, filters: [] }
    : { ...(options || {}) };

  // Les deux hooks sont toujours appelés — React exige un ordre stable.
  // Celui qui ne sert pas est désactivé par `enabled: false`.
  const fb = useCollectionFirebase(
    collectionName,
    { ...opts, enabled: USE_API ? false : opts.enabled !== false },
    legacyMax
  );

  const api = useCollectionApi(
    collectionName,
    { ...opts, enabled: USE_API ? opts.enabled !== false : false },
    legacyMax
  );

  return USE_API ? api : fb;
}