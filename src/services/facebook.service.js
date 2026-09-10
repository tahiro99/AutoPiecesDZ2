import { LoginManager, AuthenticationToken, AccessToken } from "react-native-fbsdk-next";
import { FacebookAuthProvider, OAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { USE_API } from "../config/backend";
import { loginWithFacebook as apiLoginWithFacebook } from "./auth.api";

export async function loginWithFacebook() {

    if (!data?.accessToken) throw new Error("Token Facebook introuvable");
  // ══════════════ MODE API ══════════════
  // Le serveur vérifie le jeton auprès de Facebook et crée sa propre session
  if (USE_API) {
    const result = await LoginManager.logInWithPermissions(["public_profile", "email"]);
    if (result.isCancelled) throw new Error("Connexion annulée");

    const data = await AccessToken.getCurrentAccessToken();
    if (!data?.accessToken) throw new Error("Token Facebook introuvable");

    const u = await apiLoginWithFacebook(data.accessToken);
    return { uid: u.id, isNewUser: !u.role, user: u };
  }

  // ══════════════ MODE FIREBASE ══════════════
  let credential;

  if (Platform.OS === "ios") {
    // Nonce brut + hash SHA256 (Facebook exige les deux)
    const rawNonce = "autopieces_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const result = await LoginManager.logInWithPermissions(
      ["public_profile", "email"],
      "limited",
      hashedNonce
    );

    if (result.isCancelled) throw new Error("Connexion annulée");

    const authToken = await AuthenticationToken.getAuthenticationTokenIOS();
    if (!authToken) throw new Error("Token Facebook introuvable");

    const provider = new OAuthProvider("facebook.com");
    credential = provider.credential({
      idToken: authToken.authenticationToken,
      rawNonce: rawNonce,
    });
  } else {
    const result = await LoginManager.logInWithPermissions(["public_profile", "email"]);
    if (result.isCancelled) throw new Error("Connexion annulée");

    const data = await AccessToken.getCurrentAccessToken();
    if (!data) throw new Error("Token Facebook introuvable");

    credential = FacebookAuthProvider.credential(data.accessToken);
  }

  const userCred = await signInWithCredential(auth, credential);
  const uid = userCred.user.uid;

  const snap = await getDoc(doc(db, "users", uid));
  const isNewUser = !snap.exists();

  if (isNewUser) {
    await setDoc(doc(db, "users", uid), {
      uid,
      displayName: userCred.user.displayName || "Utilisateur",
      email: userCred.user.email || "",
      photoURL: userCred.user.photoURL || "",
      role: null,
      phone: "",
      wilaya: "",
      verified: false,
      authProvider: "facebook",
      createdAt: serverTimestamp(),
    });
  }

  return { uid, isNewUser, user: userCred.user };
}