// src/services/auth.service.js — VERSION ORIGINALE EXACTE
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../config/firebase";

const FR = {
  "auth/email-already-in-use":   "Cet email est déjà utilisé.",
  "auth/invalid-email":          "Format d'email invalide.",
  "auth/weak-password":          "Mot de passe minimum 6 caractères.",
  "auth/user-not-found":         "Aucun compte avec cet identifiant.",
  "auth/wrong-password":         "Mot de passe incorrect.",
  "auth/invalid-credential":     "Email ou mot de passe incorrect.",
  "auth/too-many-requests":      "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/network-request-failed": "Pas de connexion internet.",
  "auth/user-disabled":          "Ce compte est désactivé.",
  "auth/operation-not-allowed":  "Activez Email/Mot de passe dans Firebase Console.",
};
export const getErrorMessage = (e) => FR[e?.code] || e?.message || "Erreur inattendue.";

export async function register(email, password, displayName, role, phone) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await updateProfile(cred.user, { displayName: displayName.trim() });
  await AsyncStorage.setItem("@apz_role" + cred.user.uid, role);
  const profileData = {
    uid: cred.user.uid, email: email.trim().toLowerCase(),
    displayName: displayName.trim(), role, phone: phone?.trim() || "",
    verified: false, createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem("@apz_profile" + cred.user.uid, JSON.stringify(profileData));
  try { await setDoc(doc(db, "users", cred.user.uid), { ...profileData, createdAt: serverTimestamp() }); } catch (e) {}
  try { await sendEmailVerification(cred.user); } catch (e) {}
  return cred.user;
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return cred.user;
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function logout() {
  const uid = auth.currentUser?.uid;
  if (uid) await AsyncStorage.multiRemove(["@apz_role" + uid, "@apz_profile" + uid]).catch(() => {});
  await signOut(auth);
}