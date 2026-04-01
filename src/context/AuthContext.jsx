import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";

const AuthContext = createContext(null);

// Clé locale pour le rôle (ne dépend pas de Firestore)
const ROLE_KEY    = "@apz_role";
const PROFILE_KEY = "@apz_profile";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // ── ÉTAPE 1 : Charger depuis AsyncStorage (instantané, jamais bloqué) ──
        try {
          const cached = await AsyncStorage.getItem(PROFILE_KEY + firebaseUser.uid);
          if (cached) {
            setProfile(JSON.parse(cached));
          }
        } catch (_) {}

        // ── ÉTAPE 2 : Essayer Firestore pour avoir les données à jour ──
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const data = snap.data();
            setProfile(data);
            // Mettre à jour le cache local
            await AsyncStorage.setItem(
              PROFILE_KEY + firebaseUser.uid,
              JSON.stringify(data)
            ).catch(() => {});
          } else {
            // Profil absent dans Firestore → créer depuis le cache local
            const roleStored = await AsyncStorage.getItem(ROLE_KEY + firebaseUser.uid);
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
            // Tenter de créer dans Firestore
            await setDoc(doc(db, "users", firebaseUser.uid), newProfile).catch(() => {});
            // Sauvegarder localement
            await AsyncStorage.setItem(
              PROFILE_KEY + firebaseUser.uid,
              JSON.stringify(newProfile)
            ).catch(() => {});
          }
        } catch (e) {
          console.log("[AuthContext] Firestore error (check rules):", e.message);
          // Firestore bloqué → utiliser le rôle stocké localement
          const roleStored = await AsyncStorage.getItem(ROLE_KEY + firebaseUser.uid).catch(() => null);
          setProfile((prev) => prev || {
            uid:         firebaseUser.uid,
            email:       firebaseUser.email || "",
            displayName: firebaseUser.displayName || "Utilisateur",
            role:        roleStored || "client",
          });
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => unsub();
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
