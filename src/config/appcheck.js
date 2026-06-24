// src/config/appcheck.js
// ─────────────────────────────────────────────────────────────────────────────
// App Check prouve à Firebase que les requêtes viennent de TA vraie app sur un
// vrai appareil (App Attest/DeviceCheck sur iOS, Play Integrity sur Android),
// pas d'un bot. C'est ce qui débloque un GROS quota SMS pour Phone Auth et
// protège ton projet contre l'abus à l'échelle nationale.
//
// ⚠️ Nécessite un NOUVEAU build natif (eas build) — pas un simple eas update,
//    car on ajoute un module natif au binaire.
// ─────────────────────────────────────────────────────────────────────────────
import { firebase } from "@react-native-firebase/app-check";

let initialized = false;

export async function initAppCheck() {
  if (initialized) return;
  initialized = true;

  try {
    const provider = firebase.appCheck().newReactNativeFirebaseAppCheckProvider();

    provider.configure({
      // Android → Play Integrity en prod, "debug" en dev (émulateur/dev client)
      android: {
        provider: __DEV__ ? "debug" : "playIntegrity",
      },
      // iOS → App Attest avec repli DeviceCheck en prod, "debug" en dev
      apple: {
        provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
      },
    });

    await firebase.appCheck().initializeAppCheck({
      provider,
      isTokenAutoRefreshEnabled: true, // renouvelle le jeton tout seul
    });

    console.log("[appcheck] ✅ initialisé");
  } catch (e) {
    // On ne bloque jamais l'app si App Check échoue à s'init
    console.log("[appcheck] ⚠️ init error:", e.message);
  }
}
