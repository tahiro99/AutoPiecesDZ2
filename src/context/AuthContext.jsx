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
    if (parsed.role) {
      setProfile(parsed);
    } else {
      // Cache invalide (pas de role) — le supprimer pour éviter le flash
      await AsyncStorage.removeItem(PROFILE_KEY + firebaseUser.uid).catch(() => {});
    }
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
  // Le doc n'existe pas pour cet UID — chercher par email d'abord
  let existingProfile = null;
  if (firebaseUser.email) {
    try {
      const { getDocs, query: q, where, collection: coll, limit } = await import("firebase/firestore");
      const snap = await getDocs(
        q(coll(db, "users"), where("email", "==", firebaseUser.email.toLowerCase()), limit(1))
      );
      if (!snap.empty) {
        existingProfile = snap.docs[0].data();
      } else {
        // Aussi chercher par firebaseEmail
        const snap2 = await getDocs(
          q(coll(db, "users"), where("firebaseEmail", "==", firebaseUser.email.toLowerCase()), limit(1))
        );
        if (!snap2.empty) existingProfile = snap2.docs[0].data();
      }
    } catch (e) {
      console.log("[AuthContext] search by email error:", e.message);
    }
  }

  if (existingProfile) {
    // Migrer le profil vers le nouvel UID
    const migratedProfile = { ...existingProfile, uid: firebaseUser.uid };
    setProfile(migratedProfile);
    await setDoc(doc(db, "users", firebaseUser.uid), migratedProfile).catch(() => {});
    AsyncStorage.setItem(
      PROFILE_KEY + firebaseUser.uid,
      JSON.stringify(migratedProfile)
    ).catch(() => {});
  } else {
    // Vraiment nouveau user → créer profil vide
    const roleStored = await AsyncStorage.getItem(ROLE_KEY + firebaseUser.uid).catch(() => null);
    const newProfile = {
      uid:         firebaseUser.uid,
      email:       firebaseUser.email || "",
      displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Utilisateur",
      role:        roleStored || null,
      phone:       "",
      verified:    false,
      createdAt:   serverTimestamp(),
    };
    setProfile(newProfile);
    await setDoc(doc(db, "users", firebaseUser.uid), newProfile).catch(() => {});
  }
  // Ne PAS mettre en cache un profil sans role (évite le flash au reload)
  if (newProfile.role) {
    AsyncStorage.setItem(
      PROFILE_KEY + firebaseUser.uid,
      JSON.stringify(newProfile)
    ).catch(() => {});
  }
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