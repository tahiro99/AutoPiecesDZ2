// src/services/google.service.js
import { useEffect, useState, useCallback } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID     = "268280059559-2l703vua3sct1lls0tn50bk7fn9oeh1q.apps.googleusercontent.com";
const ANDROID_CLIENT_ID = "268280059559-u4nm6vn3aj7klsialnpo49es9g1s9383.apps.googleusercontent.com";
const IOS_CLIENT_ID     = "268280059559-tusji4fgedrtldviu507b0fdv3io5lt4.apps.googleusercontent.com";

export function useGoogleLogin() {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [result, setResult]     = useState(null); // { isNewUser }

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:     WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId:     IOS_CLIENT_ID,
  });
 console.log("[google] redirectUri:", request?.redirectUri);
  useEffect(() => {
    if (!response) return;

    if (response.type !== "success") {
      if (response.type === "error") setError("Connexion Google échouée");
      setLoading(false);
      return;
    }

    const idToken = response.params?.id_token
      || response.authentication?.idToken;

    if (!idToken) {
      setError("Jeton Google introuvable");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const userCred   = await signInWithCredential(auth, credential);
        const user       = userCred.user;

        const ref  = doc(db, "users", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          await setDoc(ref, {
            uid:           user.uid,
            email:         (user.email || "").toLowerCase(),
            firebaseEmail: (user.email || "").toLowerCase(),
            displayName:   user.displayName || user.email?.split("@")[0] || "Utilisateur",
            role:          null,          // déclenche ChooseRoleScreen
            phone:         "",
            wilaya:        "",
            verified:      false,
            createdAt:     serverTimestamp(),
          });
          setResult({ isNewUser: true });
        } else {
          setResult({ isNewUser: !snap.data()?.role });
        }
      } catch (e) {
        console.log("[google] error:", e?.code, e?.message);
        setError("Erreur de connexion Google");
      }
      setLoading(false);
    })();
  }, [response]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    await promptAsync();
  }, [promptAsync]);

  return { loginWithGoogle, loading, error, result, ready: !!request };
}