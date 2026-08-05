import { LoginManager, AuthenticationToken, AccessToken } from "react-native-fbsdk-next";
import { FacebookAuthProvider, OAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

export async function loginWithFacebook() {
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
      hashedNonce  // ← hash envoyé à Facebook
    );

    if (result.isCancelled) throw new Error("Connexion annulée");

    const authToken = await AuthenticationToken.getAuthenticationTokenIOS();
    if (!authToken) throw new Error("Token Facebook introuvable");

    const provider = new OAuthProvider("facebook.com");
    credential = provider.credential({
      idToken: authToken.authenticationToken,
      rawNonce: rawNonce,  // ← nonce brut envoyé à Firebase
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