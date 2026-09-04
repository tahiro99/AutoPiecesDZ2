import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";
import { registerForPush, unregisterFromPush } from "../services/push.service";
import { USE_API } from "../config/backend";
import { restoreSession } from "../services/auth.api";
import { onAuthChange } from "../services/authEvents";
import { apiPost, loadTokens } from "../services/api.client";

const AuthContext = createContext(null);
const ROLE_KEY    = "@apz_role";
const PROFILE_KEY = "@apz_profile";

const hasStoredTokens = async () => {
  const { accessToken, refreshToken } = await loadTokens();
  return !!(accessToken || refreshToken);
};

// ══════════════ MODE API ══════════════
function ApiAuthProvider({ children }) {
  const [user, setUser]                 = useState(undefined);
  const [profile, setProfile]           = useState(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    (async () => {
      let u = null;
      try {
        u = await restoreSession();
      } catch (e) {}

      setUser(u || null);
      setProfile(u || null);

      // Si des jetons existent mais qu'on n'a pas récupéré le profil,
      // c'est une panne réseau — surtout ne pas conclure "pas de rôle".
      const stored = await hasStoredTokens();
      setProfileReady(!!u || !stored);
    })();
  }, []);

  useEffect(() => {
    return onAuthChange((u) => {
      setUser(u || null);
      setProfile(u || null);
      setProfileReady(true);
    });
  }, []);

  // Jeton FCM transmis à l'API après connexion
  const uid = user?.id;
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const messaging = (await import("@react-native-firebase/messaging")).default;
        const token = await messaging().getToken();
        if (token) await apiPost("/me/fcm-token", { token });
      } catch (e) {}
    })();
  }, [uid]);

  const loading = user === undefined;

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, profile, profileReady, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ══════════════ MODE FIREBASE ══════════════
function FirebaseAuthProvider({ children }) {
  const [user, setUser]                 = useState(undefined);
  const [profile, setProfile]           = useState(null);
  const [profileReady, setProfileReady] = useState(false);
  const profileUnsubRef = useRef(null);
  const prevUidRef      = useRef(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (!firebaseUser) {
        if (prevUidRef.current) {
          unregisterFromPush(prevUidRef.current).catch(() => {});
          prevUidRef.current = null;
        }
        setUser(null);
        setProfile(null);
        setProfileReady(true);
        return;
      }

      setUser(firebaseUser);
      setProfileReady(false);

      if (prevUidRef.current !== firebaseUser.uid) {
        prevUidRef.current = firebaseUser.uid;
        registerForPush(firebaseUser.uid).catch(() => {});
      }

      try {
        const cached = await AsyncStorage.getItem(PROFILE_KEY + firebaseUser.uid);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.role) setProfile(parsed);
          else await AsyncStorage.removeItem(PROFILE_KEY + firebaseUser.uid).catch(() => {});
        }
      } catch (_) {}

      profileUnsubRef.current = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        { includeMetadataChanges: true },
        async (snap) => {
          const fromCache = snap.metadata.fromCache;

          if (snap.exists()) {
            const data = snap.data();
            setProfile(data);
            if (data.role) {
              AsyncStorage.setItem(
                PROFILE_KEY + firebaseUser.uid, JSON.stringify(data)
              ).catch(() => {});
            }
            if (!fromCache) setProfileReady(true);
            return;
          }

          // Doc absent depuis le cache : ne rien conclure
          if (fromCache) return;

          let existing = null;
          const mail = (firebaseUser.email || "").toLowerCase();

          if (mail) {
            try {
              const { getDocs, query: q, where, collection: coll, limit } =
                await import("firebase/firestore");
              let s = await getDocs(q(coll(db, "users"), where("email", "==", mail), limit(1)));
              if (s.empty) {
                s = await getDocs(q(coll(db, "users"), where("firebaseEmail", "==", mail), limit(1)));
              }
              if (!s.empty) existing = s.docs[0].data();
            } catch (e) {
              console.log("[AuthContext] recherche par e-mail:", e.message);
            }
          }

          const roleStored = await AsyncStorage
            .getItem(ROLE_KEY + firebaseUser.uid).catch(() => null);

          const finalProfile = existing
            ? { ...existing, uid: firebaseUser.uid }
            : {
                uid:         firebaseUser.uid,
                email:       mail,
                displayName: firebaseUser.displayName || mail.split("@")[0] || "Utilisateur",
                role:        roleStored || null,
                phone:       "",
                wilaya:      "",
                verified:    false,
                createdAt:   serverTimestamp(),
              };

          setProfile(finalProfile);
          await setDoc(doc(db, "users", firebaseUser.uid), finalProfile).catch(() => {});

          if (finalProfile.role) {
            AsyncStorage.setItem(
              PROFILE_KEY + firebaseUser.uid, JSON.stringify(finalProfile)
            ).catch(() => {});
          }

          setProfileReady(true);
        },
        (error) => {
          console.log("[AuthContext] listener:", error.message);
          setProfileReady(true);
        }
      );
    });

    return () => {
      authUnsub();
      if (profileUnsubRef.current) profileUnsubRef.current();
    };
  }, []);

  const loading = user === undefined;

  return (
    <AuthContext.Provider
      value={{ user: user ?? null, profile, profileReady, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// ══════════════ AIGUILLAGE ══════════════
export function AuthProvider({ children }) {
  return USE_API
    ? <ApiAuthProvider>{children}</ApiAuthProvider>
    : <FirebaseAuthProvider>{children}</FirebaseAuthProvider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext doit être dans <AuthProvider>");
  return ctx;
}