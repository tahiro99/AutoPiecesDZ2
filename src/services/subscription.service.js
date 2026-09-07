// src/services/subscription.service.js

import { db, storage, auth } from "../config/firebase";
import {
  doc, updateDoc, getDoc, serverTimestamp,
  addDoc, collection, getDocs, query, orderBy, limit
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system/legacy";
import { USE_API } from "../config/backend";
import { apiPost, apiUpload } from "./api.client";

// ── Plans d'abonnement vendeur ────────────────────────────────────────────────
// Mensuel : 3500 DA chaque mois.
// Annuel  : 2500 DA/mois facturé d'un coup pour 12 mois → 30000 DA, économie 12000 DA.
export const PLANS = {
  monthly: {
    id:          "monthly",
    months:      1,
    monthlyDA:   3500,
    totalDA:     3500,
    label:       "Mensuel",
    labelAr:     "شهري",
    description: "Facturé tous les mois",
    descriptionAr: "تجديد كل شهر",
  },
  yearly: {
    id:          "yearly",
    months:      12,
    monthlyDA:   2500,
    totalDA:     2500 * 12, // 30000
    label:       "Annuel",
    labelAr:     "سنوي",
    description: "Facturé une fois pour 12 mois",
    descriptionAr: "دفعة واحدة لـ 12 شهر",
    savingsDA:   (3500 - 2500) * 12, // 12000
    badge:       "Économie 12 000 DA",
    badgeAr:     "وفر 12 000 دج",
  },
};

export const DEFAULT_PLAN = "monthly";

// Conservé pour rétro-compatibilité dans le reste du code (= prix mensuel par défaut)
export const SUBSCRIPTION_PRICE = PLANS.monthly.monthlyDA;

export const TRIAL_MONTHS = 2;
export const CCP_NUMBER   = "0027890277 23";

const STORAGE_BUCKET = "sustained-hold-486101-b9.firebasestorage.app";

// ── Init trial au register vendeur ──────────────────────────────────────────
export async function initVendorSubscription(userId) {
  // En mode API, l'essai est créé côté serveur par POST /me/role
  if (USE_API) return;

  try {
    const now      = new Date();
    const trialEnd = new Date(now);
    trialEnd.setMonth(trialEnd.getMonth() + TRIAL_MONTHS);

    await updateDoc(doc(db, "users", userId), {
      subscription: {
        status:           "trial",
        trialStart:       now.toISOString(),
        trialEnd:         trialEnd.toISOString(),
        currentPeriodEnd: trialEnd.toISOString(),
        plan:             "monthly",
        price:            SUBSCRIPTION_PRICE,
      },
    });

    await addDoc(collection(db, "subscription_history"), {
      userId,
      action:    "trial_started",
      trialEnd:  trialEnd.toISOString(),
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.log("[subscription] initVendorSubscription error:", e.message);
  }
}

// ── Vérifier le statut ────────────────────────────────────────────────────────
export function getSubscriptionStatus(subscription) {
  if (!subscription) return "none";
  try {
    const now    = new Date();
    const endRaw = subscription.currentPeriodEnd;
    const end    = endRaw?.toDate ? endRaw.toDate() : new Date(endRaw);
    if (isNaN(end.getTime())) return "expired";
    if (now < end) return subscription.status === "trial" ? "trial" : "active";
    return "expired";
  } catch (e) {
    return "expired";
  }
}

// ── Jours restants ───────────────────────────────────────────────────────────
export function getDaysLeft(subscription) {
  if (!subscription) return 0;
  try {
    const now    = new Date();
    const endRaw = subscription.currentPeriodEnd;
    const end    = endRaw?.toDate ? endRaw.toDate() : new Date(endRaw);
    if (isNaN(end.getTime())) return 0;
    return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  } catch (e) {
    return 0;
  }
}

// ── Upload photo reçu CCP ─────────────────────────────────────────────────────
export async function uploadReceiptPhoto(userId, photoUri) {
  // ── MODE API : le serveur compresse et convertit
  if (USE_API) {
    const { url } = await apiUpload(photoUri, "listing");
    return url;
  }

  // ── MODE FIREBASE ──
  try {
    const { compressImage } = await import("../util/compressImage");
    photoUri = await compressImage(photoUri, "receipt");

    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Non connecté");

    const filename    = `subscription_receipts/${userId}/${Date.now()}.jpg`;
    const encodedPath = encodeURIComponent(filename);
    const uploadUrl   = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`;

    const result = await FileSystem.uploadAsync(uploadUrl, photoUri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        "Content-Type": "image/jpeg",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (result.status !== 200) throw new Error(`Upload failed: ${result.status}`);

    let downloadToken = "";
    try {
      const meta = JSON.parse(result.body || "{}");
      downloadToken = (meta.downloadTokens || "").split(",")[0] || "";
    } catch (_) {}

    const base = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
    return downloadToken ? `${base}&token=${downloadToken}` : base;
  } catch (e) {
    console.log("[uploadReceiptPhoto] error:", e.message);
    throw e;
  }
}

// ── Demande de renouvellement avec photo ─────────────────────────────────────
export async function requestRenewal(userId, userName, userPhone, receiptUrl = null, planId = DEFAULT_PLAN) {
  const plan = PLANS[planId] || PLANS[DEFAULT_PLAN];

  // ── MODE API ──
  if (USE_API) {
    await apiPost("/me/subscription/renew", {
      plan:       plan.id,
      months:     plan.months,
      amount:     plan.totalDA,
      phone:      userPhone || "",
      receiptUrl: receiptUrl || null,
    });
    return;
  }

  // ── MODE FIREBASE ──
  try {
    await addDoc(collection(db, "subscription_requests"), {
      userId,
      userName,
      userPhone,
      plan:       plan.id,
      months:     plan.months,
      monthlyDA:  plan.monthlyDA,
      amount:     plan.totalDA,
      status:     "pending",
      receiptUrl: receiptUrl || null,
      createdAt:  serverTimestamp(),
    });

    await addDoc(collection(db, "subscription_history"), {
      userId,
      action:     "renewal_requested",
      plan:       plan.id,
      months:     plan.months,
      amount:     plan.totalDA,
      receiptUrl: receiptUrl || null,
      createdAt:  serverTimestamp(),
    });
  } catch (e) {
    console.log("[subscription] requestRenewal error:", e.message);
    throw e;
  }
}

// ── Envoyer notification expiration proche (7 jours) ─────────────────────────
export async function sendExpiryWarningIfNeeded(userId, daysLeft) {
  // En mode API, la tâche planifiée du serveur s'en charge
  if (USE_API) return;
  if (daysLeft !== 7) return;

  try {
    const snap = await getDocs(
      query(
        collection(db, "notifications", userId, "items"),
        orderBy("createdAt", "desc"),
        limit(10)
      )
    );
    const alreadySent = snap.docs.some((d) => d.data().type === "subscription_warning");
    if (alreadySent) return;

    await addDoc(collection(db, "notifications", userId, "items"), {
      type:      "subscription_warning",
      title:     "⚠️ Abonnement expire bientôt",
      body:      `Votre abonnement expire dans ${daysLeft} jours. Renouvelez maintenant pour éviter l'interruption.`,
      createdAt: serverTimestamp(),
      read:      false,
    });
  } catch (e) {
    console.log("[subscription] sendExpiryWarning error:", e.message);
  }
}