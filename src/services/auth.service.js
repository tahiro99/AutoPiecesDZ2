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

// ── ERREURS EN FRANÇAIS ───────────────────────────────────────────────────────
const FR = {
  "auth/email-already-in-use":   "Cet email est déjà utilisé.",
  "auth/invalid-email":          "Format d'email invalide.",
  "auth/weak-password":          "Mot de passe minimum 6 caractères.",
  "auth/user-not-found":         "Aucun compte avec cet email.",
  "auth/wrong-password":         "Mot de passe incorrect.",
  "auth/invalid-credential":     "Email ou mot de passe incorrect.",
  "auth/too-many-requests":      "Trop de tentatives. Réessayez dans quelques minutes.",
  "auth/network-request-failed": "Pas de connexion internet.",
  "auth/user-disabled":          "Ce compte est désactivé.",
  "auth/operation-not-allowed":  "Activez Email/Mot de passe dans Firebase Console > Authentication > Sign-in method.",
};
export const getErrorMessage = (e) => FR[e?.code] || e?.message || "Erreur inattendue.";

// ── INSCRIPTION ───────────────────────────────────────────────────────────────
export async function register(email, password, displayName, role, phone) {
  // 1. Firebase Auth
  const cred = await createUserWithEmailAndPassword(
    auth, email.trim().toLowerCase(), password
  );

  // 2. Mettre à jour le nom
  await updateProfile(cred.user, { displayName: displayName.trim() });

  // 3. ✅ Sauvegarder le rôle LOCALEMENT (toujours fiable, pas besoin Firestore)
  await AsyncStorage.setItem("@apz_role" + cred.user.uid, role);

  // 4. Créer le profil complet localement aussi
  const profileData = {
    uid:         cred.user.uid,
    email:       email.trim().toLowerCase(),
    displayName: displayName.trim(),
    role,
    phone:       phone.trim(),
    verified:    false,
    createdAt:   new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    "@apz_profile" + cred.user.uid,
    JSON.stringify(profileData)
  );

  // 5. Sauvegarder dans Firestore (peut échouer si règles pas configurées)
  try {
    await setDoc(doc(db, "users", cred.user.uid), {
      ...profileData,
      createdAt: serverTimestamp(),
    });
    console.log("[register] ✅ Firestore profile saved");
  } catch (e) {
    console.log("[register] ⚠️ Firestore failed (check rules):", e.message);
    // Pas grave — le rôle est dans AsyncStorage
  }

  // 6. ✅ Envoyer email de vérification
  try {
    await sendEmailVerification(cred.user);
    console.log("[register] ✅ Verification email sent to", email);
  } catch (e) {
    console.log("[register] ⚠️ Verification email error:", e.message);
  }

  return cred.user;
}

// ── CONNEXION ─────────────────────────────────────────────────────────────────
export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(
    auth, email.trim().toLowerCase(), password
  );
  return cred.user;
}

// ── MOT DE PASSE OUBLIÉ ───────────────────────────────────────────────────────
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

// ── DÉCONNEXION ───────────────────────────────────────────────────────────────
export async function logout() {
  const uid = auth.currentUser?.uid;
  if (uid) {
    await AsyncStorage.multiRemove([
      "@apz_role" + uid,
      "@apz_profile" + uid,
    ]).catch(() => {});
  }
  await signOut(auth);
}
