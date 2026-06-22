import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";
import { registerForPush, unregisterFromPush } from "../services/push.service";

const AuthContext = createContext(null);
const ROLE_KEY    = "@apz_role";
const PROFILE_KEY = "@apz_profile";

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(undefined);
  const [profile, setProfile]   = useState(null);
  const profileUnsubRef         = useRef(null);
  const prevUidRef              = useRef(null);

  useEffect(() => {
    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      // Nettoyer le listener précédent
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      if (!firebaseUser) {
        // Retirer le token FCM de l'utilisateur qui se déconnecte
        if (prevUidRef.current) {
          unregisterFromPush(prevUidRef.current).catch(() => {});
          prevUidRef.current = null;
        }
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(firebaseUser);

      // Enregistrer ce device pour les notifications push (une fois par session)
      if (prevUidRef.current !== firebaseUser.uid) {
        prevUidRef.current = firebaseUser.uid;
        registerForPush(firebaseUser.uid).catch(() => {});
      }

      // Charger cache uniquement si pas encore de profil (premier affichage)
      try {
        const cached = await AsyncStorage.getItem(PROFILE_KEY + firebaseUser.uid);
        if (cached) {
          const parsed = JSON.parse(cached);
          setProfile(parsed);
        }
      } catch (_) {}

      // Listener Firestore — toujours prioritaire sur le cache
      profileUnsubRef.current = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        async (snap) => {
          if (snap.exists()) {
            const data = snap.data();

            // Toujours mettre à jour avec les données Firestore
            setProfile(data);

            // Mettre à jour le cache avec les données fraîches
            AsyncStorage.setItem(
              PROFILE_KEY + firebaseUser.uid,
              JSON.stringify(data)
            ).catch(() => {});

          } else {
            // Créer le profil s'il n'existe pas
            const roleStored = await AsyncStorage.getItem(ROLE_KEY + firebaseUser.uid).catch(() => null);
            const newProfile = {
              uid:         firebaseUser.uid,
              email:       firebaseUser.email || "",
              displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Utilisateur",
              role:        roleStored || "client",
              phone:       "",
              verified:    false,
              createdAt:   serverTimestamp(),
            };
            setProfile(newProfile);
            await setDoc(doc(db, "users", firebaseUser.uid), newProfile).catch(() => {});
            AsyncStorage.setItem(
              PROFILE_KEY + firebaseUser.uid,
              JSON.stringify(newProfile)
            ).catch(() => {});
          }
        },
        (error) => {
          console.log("[AuthContext] listener error:", error.message);
          // En cas d'erreur réseau, garder le profil actuel
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
    <AuthContext.Provider value={{ user: user ?? null, profile, loading, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext doit être dans <AuthProvider>");
  return ctx;
}