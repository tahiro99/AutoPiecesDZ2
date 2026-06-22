// Compresse + redimensionne avant upload pour éviter l'explosion de bandwidth/coûts.
// Une photo iPhone fait 5-8 MB. Après compression : ~200-400 KB.
// → 20× moins de bandwidth + chargement 10× plus rapide chez les users.

import * as ImageManipulator from "expo-image-manipulator";

const TARGETS = {
  listing: { width: 1200, compress: 0.7 }, // photos d'annonce (qualité visible)
  chat:    { width: 1000, compress: 0.6 }, // photos de chat (moins critique)
  profile: { width: 600,  compress: 0.7 }, // photos de profil (petit avatar)
  receipt: { width: 1400, compress: 0.7 }, // reçus CCP (texte lisible)
};

export async function compressImage(uri, type = "listing") {
  const target = TARGETS[type] || TARGETS.listing;
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: target.width } }],
      { compress: target.compress, format: ImageManipulator.SaveFormat.JPEG }
    );
    return result.uri;
  } catch (e) {
    console.log("[compress] failed, using original:", e.message);
    return uri; // fallback : utilise l'image originale si erreur
  }
}
