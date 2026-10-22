
import * as ImageManipulator from "expo-image-manipulator";

const TARGETS = {
  listing: { width: 1200, compress: 0.7 }, 
  chat:    { width: 1000, compress: 0.6 }, 
  profile: { width: 600,  compress: 0.7 }, 
  receipt: { width: 1400, compress: 0.7 }, 
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
