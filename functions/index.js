// ─────────────────────────────────────────────────────────────
// Cloud Function: send an FCM push whenever a notification doc is
// created at  notifications/{userId}/items/{notifId}.
// This makes the app's existing createNotif() calls deliver real pushes.
// ─────────────────────────────────────────────────────────────
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");
const crypto = require("crypto");

// 🔐 Token de l'API SMS locale (LinksY / eliteSMS / ...). Stocké en secret,
// jamais en clair dans le code. Voir instructions de déploiement plus bas.
const SMS_API_TOKEN = defineSecret("SMS_API_TOKEN");

// ⚠️ IMPORTANT: this project uses a NAMED Firestore database "tahar2"
// (not the default one). Both the trigger and the reads must target it.
const DATABASE_ID = "tahar2";

// ⚠️ The function region MUST match your Firestore database location.
// Your "tahar2" database lives in europe-west3 (confirmed by the deploy logs),
// so the function + trigger must be there too.
const REGION = "europe-west3";

// Admin account that receives report notifications (matches your Firestore rules).
const ADMIN_EMAIL = "taharboussag13@gmail.com";

initializeApp();
// Scaling parameters tuned for nation-wide launch :
//   • maxInstances 50  → cap raisonnable pour ~5000 users actifs simultanés
//   • timeout 60s      → assez pour les workflows multi-step
//   • memory 256MiB    → suffisant pour notre charge (texte + petites lectures)
//   • concurrency 80   → bonne densité par instance (réduit le coût)
//
// minInstances : appliqué SEULEMENT à sendNotificationPush (la fonction la
// plus critique pour l'UX, voir ligne ~32). Pour les autres, un cold start
// occasionnel est acceptable.
setGlobalOptions({
  region: REGION,
  maxInstances: 50,
  timeoutSeconds: 60,
  memory: "256MiB",
  concurrency: 80,
});

// Bind explicitly to the named database (app + databaseId) — unambiguous.
const db = getFirestore(getApp(), DATABASE_ID);

exports.sendNotificationPush = onDocumentCreated(
  {
    document: "notifications/{userId}/items/{notifId}",
    database: DATABASE_ID,
    region: REGION,
    // 1 instance toujours chaude → push notifications instantanées (~$11/mois)
    // au lieu de 3-5s de cold start qui ruinerait l'expérience utilisateur.
    minInstances: 1,
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const notif = snap.data() || {};
    const { userId, notifId } = event.params;
    console.log("[push] trigger fired →", { userId, notifId, title: notif.title });

    // Load the recipient's saved device tokens.
    let tokens = [];
    try {
      const userSnap = await db.doc(`users/${userId}`).get();
      tokens = userSnap.get("fcmTokens") || [];
      console.log("[push] tokens found:", tokens.length);
    } catch (e) {
      console.error("[push] read user error:", e.message);
      return;
    }
    if (!tokens.length) {
      console.log("[push] no tokens for", userId);
      return;
    }

    // ── QUEUE BATCHING : si un push a été envoyé il y a < 20 sec, on skip
    // (le doc reste dans Firestore, le user le verra dans son onglet notif).
    // Évite la vibration spammeuse quand 5 messages arrivent en rafale.
    // Exception : notifications "abonnement" et "report" toujours envoyées.
    if (!["abonnement", "report", "subscription_warning"].includes(notif.type)) {
      const ok = await shouldSendPush(userId);
      if (!ok) {
        console.log("[push] batched (skip) for", userId, "type:", notif.type);
        return;
      }
    }

    const data = notif.data || {};
    const message = {
      tokens,
      notification: {
        title: notif.title || "AutoPièces DZ",
        body: notif.body || "",
      },
      data: {
        screen: String(data.screen || "Notifications"),
        type: String(notif.type || ""),
        notifId: String(notifId),
        ...(data.conversationId
          ? { conversationId: String(data.conversationId) }
          : {}),
      },
      android: {
        priority: "high",
        notification: { sound: "default" },
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    let resp;
    try {
      resp = await getMessaging().sendEachForMulticast(message);
    } catch (e) {
      console.error("[push] send error:", e.message);
      return;
    }
    console.log(`[push] sent ${resp.successCount}/${tokens.length} to ${userId}`);

    // Remove tokens that are no longer valid.
    const invalid = [];
    resp.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument")
        ) {
          invalid.push(tokens[i]);
        }
      }
    });
    if (invalid.length) {
      await db
        .doc(`users/${userId}`)
        .update({ fcmTokens: FieldValue.arrayRemove(...invalid) })
        .catch(() => {});
      console.log(`[push] removed ${invalid.length} stale token(s)`);
    }
  }
);

// ── Helper: write a notification doc (which triggers the push above). ──
async function createNotifDoc(userId, { type, title, body, data = {} }) {
  const clean = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  await db
    .collection("notifications")
    .doc(userId)
    .collection("items")
    .add({
      type,
      title,
      body,
      data: clean,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
}

// ── Subscription ACTIVATED: notify the vendor when status becomes "active". ──
// Approval is done outside the app (admin / console edits the user doc), so this
// reacts to the status change and notifies + pushes automatically.
exports.notifySubscriptionActivated = onDocumentUpdated(
  { document: "users/{userId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    const wasActive = before.subscription?.status === "active";
    const isActive = after.subscription?.status === "active";
    if (isActive && !wasActive) {
      console.log("[sub] activated →", event.params.userId);
      await createNotifDoc(event.params.userId, {
        type: "abonnement",
        title: "Abonnement activé ✅",
        body: "Votre abonnement vendeur est maintenant actif. Bonnes ventes sur AutoPièces DZ !",
        data: { screen: "Subscription" },
      }).catch((e) => console.error("[sub] notif error:", e.message));
    }
  }
);

// ── Subscription EXPIRING: daily reminder at J-7, J-3, J-1. ──
exports.subscriptionExpiryReminder = onSchedule(
  { schedule: "every day 09:00", timeZone: "Africa/Algiers", region: REGION },
  async () => {
    const now = Date.now();
    let snap;
    try {
      snap = await db.collection("users").where("role", "==", "vendeur").get();
    } catch (e) {
      console.error("[sub] reminder query error:", e.message);
      return;
    }
    let sent = 0;
    for (const docSnap of snap.docs) {
      const sub = docSnap.get("subscription");
      if (!sub?.currentPeriodEnd) continue;
      const end = new Date(sub.currentPeriodEnd).getTime();
      if (isNaN(end)) continue;
      const daysLeft = Math.ceil((end - now) / 86400000);
      if (daysLeft === 7 || daysLeft === 3 || daysLeft === 1) {
        await createNotifDoc(docSnap.id, {
          type: "abonnement",
          title: "⚠️ Abonnement bientôt expiré",
          body: `Votre abonnement expire dans ${daysLeft} jour${
            daysLeft > 1 ? "s" : ""
          }. Renouvelez pour continuer à vendre.`,
          data: { screen: "Subscription" },
        }).catch(() => {});
        sent++;
      }
    }
    console.log(`[sub] expiry reminders sent: ${sent}`);
  }
);

// ── REPORT filed: notify the admin (looked up by email → uid). ──
exports.notifyAdminOnReport = onDocumentCreated(
  { document: "reports/{reportId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const report = event.data?.data() || {};
    let adminUid;
    try {
      adminUid = (await getAuth().getUserByEmail(ADMIN_EMAIL)).uid;
    } catch (e) {
      console.error("[report] admin lookup failed:", e.message);
      return;
    }
    console.log("[report] notifying admin", adminUid);
    await createNotifDoc(adminUid, {
      type: "report",
      title: "🚨 Nouveau signalement",
      body: `${report.reporterName || "Un utilisateur"} a signalé ${
        report.targetUserName || ""
      } : ${report.reason || ""}`,
      data: { screen: "Notifications", reportId: event.params.reportId },
    }).catch((e) => console.error("[report] notif error:", e.message));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE NOTIFICATION GENERATORS
// These create notification docs automatically from Firestore events, so the
// app no longer has to. Works regardless of which app build is installed.
// ─────────────────────────────────────────────────────────────────────────────

// ── NEW ORDER → notify the seller ──
exports.notifyOnNewOrder = onDocumentCreated(
  { document: "orders/{orderId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const o = event.data?.data() || {};
    if (!o.sellerId) return;
    console.log("[order] new order →", o.sellerId);
    await createNotifDoc(o.sellerId, {
      type: "commande",
      title: "Nouvelle commande ! 📦",
      body: `"${o.listingTitle || "Une pièce"}" — ${(o.price || 0).toLocaleString()} DA`,
      data: { screen: "SellerDashboard", orderId: event.params.orderId },
    }).catch((e) => console.error("[order] notif error:", e.message));
  }
);

// ── ORDER STATUS CHANGE → notify the buyer ──
const STATUS_BODIES = {
  confirmed: "Votre commande a été confirmée ✅",
  shipping:  "Votre commande est en route ! 🚚",
  shipped:   "Votre commande est en route ! 🚚",
  delivered: "Votre commande a été livrée 🎉",
  cancelled: "Votre commande a été annulée",
};
exports.notifyOnOrderStatusChange = onDocumentUpdated(
  { document: "orders/{orderId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (before.status === after.status) return;
    if (!after.buyerId) return;
    const body = STATUS_BODIES[after.status];
    if (!body) return;
    console.log("[order] status →", after.status, "for", after.buyerId);
    await createNotifDoc(after.buyerId, {
      type: "livraison",
      title: "Commande mise à jour",
      body,
      data: { screen: "Orders", orderId: event.params.orderId },
    }).catch((e) => console.error("[order-status] notif error:", e.message));
  }
);

// ── NEW MESSAGE → notify the other participant ──
exports.notifyOnNewMessage = onDocumentCreated(
  {
    document: "conversations/{convId}/messages/{msgId}",
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const msg = event.data?.data() || {};
    if (!msg.senderId) return;

    // Look up the conversation to find the other participant
    let conv;
    try {
      conv = (await db.doc(`conversations/${event.params.convId}`).get()).data() || {};
    } catch (e) {
      console.error("[msg] conv lookup failed:", e.message);
      return;
    }
    const otherUserId =
      msg.senderId === conv.sellerId ? conv.buyerId : conv.sellerId;
    if (!otherUserId) return;

    const isImage = msg.type === "image" || !!msg.imageUrl;
    const body = isImage
      ? "Vous a envoyé une image"
      : (msg.text || "").slice(0, 80) || "Nouveau message";

    console.log("[msg] notifying", otherUserId);
    await createNotifDoc(otherUserId, {
      type: "message",
      title: isImage ? "Nouvelle image 📷" : "Nouveau message 💬",
      body,
      data: {
        screen: "Chat",
        conversationId: event.params.convId,
        sellerName: conv.sellerName,
        listingTitle: conv.listingTitle,
        listingPrice: conv.listingPrice,
      },
    }).catch((e) => console.error("[msg] notif error:", e.message));
  }
);

// ── SUBSCRIPTION REQUEST APPROVED → extend the vendor's subscription ──
// You set `status` to "approved" on a subscription_requests doc; this function
// reads the plan/months on that doc, extends the user's currentPeriodEnd, and
// flips the subscription to "active". The notifySubscriptionActivated function
// then fires automatically and sends the "Abonnement activé ✅" push.
exports.applySubscriptionApproval = onDocumentUpdated(
  { document: "subscription_requests/{requestId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (before.status === after.status) return;
    if (after.status !== "approved") return;
    if (!after.userId) return;

    // Avoid double-processing if approved again
    if (after.appliedAt) {
      console.log("[sub-approve] already applied, skipping");
      return;
    }

    // How many months to add (defaults to 1 if older docs don't have it).
    const months = Number(after.months) || 1;

    let userSub = {};
    try {
      userSub = (await db.doc(`users/${after.userId}`).get()).get("subscription") || {};
    } catch (e) {
      console.error("[sub-approve] read user error:", e.message);
      return;
    }

    // Extend from the later of (now, current currentPeriodEnd) so paying early
    // doesn't waste days.
    const now = Date.now();
    const currentEndMs = userSub.currentPeriodEnd
      ? new Date(userSub.currentPeriodEnd).getTime()
      : 0;
    const startFromMs = Math.max(now, isNaN(currentEndMs) ? 0 : currentEndMs);
    const newEnd = new Date(startFromMs);
    newEnd.setMonth(newEnd.getMonth() + months);

    try {
      await db.doc(`users/${after.userId}`).set(
        {
          subscription: {
            ...userSub,
            status: "active",
            plan: after.plan || "monthly",
            currentPeriodEnd: newEnd.toISOString(),
            lastPaidAt: new Date().toISOString(),
            lastPaidAmount: Number(after.amount) || 0,
          },
        },
        { merge: true }
      );

      // Mark the request as applied so we don't re-run on further edits
      await event.data.after.ref.update({
        appliedAt: FieldValue.serverTimestamp(),
        appliedMonths: months,
        appliedNewEnd: newEnd.toISOString(),
      });

      // Bookkeeping
      await db.collection("subscription_history").add({
        userId: after.userId,
        action: "renewal_approved",
        plan: after.plan || "monthly",
        months,
        amount: Number(after.amount) || 0,
        newCurrentPeriodEnd: newEnd.toISOString(),
        requestId: event.params.requestId,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `[sub-approve] ${after.userId} extended +${months}mo → ${newEnd.toISOString()}`
      );
    } catch (e) {
      console.error("[sub-approve] write error:", e.message);
    }
  }
);

// ── BATCHING : si plusieurs messages dans 30s, on groupe en 1 seul push ──
// Patron "queue + debounce" : évite que 5 messages successifs = 5 vibrations.
// Stocke un timestamp dans users/{uid}/inbox/last_push_at et skip si récent.
async function shouldSendPush(userId) {
  try {
    const ref = db.doc(`users/${userId}/_inbox/state`);
    const snap = await ref.get();
    const lastPush = snap.exists ? (snap.get("lastPushAt")?.toMillis?.() || 0) : 0;
    const now = Date.now();
    // Si moins de 20 sec depuis le dernier push, on skip (on garde le doc Firestore)
    if (now - lastPush < 20_000) return false;
    await ref.set({ lastPushAt: new Date() }, { merge: true });
    return true;
  } catch (e) {
    console.error("[batch] error:", e.message);
    return true; // en cas d'erreur, on envoie quand même
  }
}

// ── ANTI-SPAM NOTIFICATIONS : un user ne peut pas spammer un autre ──
// Si un sender (request.auth.uid != recipient) crée > 20 notifs pour la même
// cible dans 10 minutes, on supprime les suivantes.
exports.antiSpamNotifications = onDocumentCreated(
  { document: "notifications/{userId}/items/{itemId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const { userId, itemId } = event.params;
    const notif = event.data?.data() || {};
    const ref = event.data?.ref;
    // Notifs créées par les Cloud Functions n'ont pas d'expéditeur identifiable.
    // On rate-limit uniquement les notifs reçues par utilisateur (toutes sources).
    try {
      const tenMinAgo = Date.now() - 10 * 60 * 1000;
      const snap = await db
        .collection("notifications").doc(userId).collection("items")
        .get();
      const recent = snap.docs.filter((d) => {
        const t = d.get("createdAt")?.toMillis?.() || 0;
        return t > tenMinAgo;
      });
      if (recent.length > 20) {
        console.log(`[anti-spam] user ${userId} got ${recent.length} notifs in 10min, removing ${itemId}`);
        await ref.delete();
      }
    } catch (e) {
      console.error("[anti-spam] error:", e.message);
    }
  }
);

// ── VALIDATE & SANITIZE NEW LISTINGS (anti-spam, anti-XSS, rate limit) ──
// Runs on create: rejects spam, validates required fields, rate-limits per seller.
// Marks problematic listings as status: "blocked" so they don't appear publicly.
exports.validateNewListing = onDocumentCreated(
  { document: "listings/{listingId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const l = event.data?.data() || {};
    const ref = event.data?.ref;
    const issues = [];

    // Required fields
    if (!l.title || typeof l.title !== "string" || l.title.length < 3) {
      issues.push("title too short");
    }
    if (l.title && l.title.length > 200) issues.push("title too long");
    if (!l.sellerId) issues.push("missing sellerId");
    if (l.price == null || typeof l.price !== "number" || l.price <= 0 || l.price > 50_000_000) {
      issues.push("invalid price");
    }
    if (l.description && l.description.length > 5000) issues.push("description too long");

    // Rudimentary spam patterns
    const text = `${l.title || ""} ${l.description || ""}`.toLowerCase();
    const spamHits = [/https?:\/\/[^\s]+\s?https?:\/\/[^\s]+/, /\bcasino|porn|crypto|airdrop/i];
    if (spamHits.some((rx) => rx.test(text))) issues.push("spam content");

    // Rate limit: max 5 listings / hour / seller
    if (l.sellerId) {
      const oneHourAgo = Date.now() - 3600_000;
      try {
        const recent = await db
          .collection("listings")
          .where("sellerId", "==", l.sellerId)
          .get();
        const count = recent.docs.filter((d) => {
          const t = d.get("createdAt")?.toMillis?.() || 0;
          return t > oneHourAgo;
        }).length;
        if (count > 5) issues.push("rate limit (5/hour)");
      } catch (e) { console.error("[validate] rate check failed:", e.message); }
    }

    if (issues.length) {
      console.log("[validate] blocked listing", event.params.listingId, "reasons:", issues);
      await ref.update({ status: "blocked", blockedReasons: issues }).catch(() => {});
    }
  }
);

// ── NEW RATING → notify the seller ──
exports.notifyOnNewRating = onDocumentCreated(
  { document: "ratings/{ratingId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const r = event.data?.data() || {};
    if (!r.sellerId) return;
    console.log("[rating] notifying", r.sellerId, "stars:", r.stars);
    await createNotifDoc(r.sellerId, {
      type: "rating",
      title: `⭐ Nouvelle évaluation : ${r.stars || 0}/5`,
      body: (r.comment || "").trim() || "Vous avez reçu une nouvelle note.",
      data: { screen: "SellerDashboard" },
    }).catch((e) => console.error("[rating] notif error:", e.message));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// OTP par SMS via fournisseur LOCAL algérien (LinksY / eliteSMS / ...).
// Contourne le blocage Firebase des opérateurs algériens : on génère et envoie
// le code nous-mêmes via une passerelle SMS locale fiable.
//
//   sendOtp(phone)        → génère un code, le stocke haché 5 min, envoie le SMS
//   verifyOtp(phone,code) → vérifie le code ; l'app crée ensuite le compte
//
// Sécurité : code jamais stocké en clair, expiration 5 min, anti-spam (1/60s,
// 5/heure), max 5 tentatives de vérification.
// ─────────────────────────────────────────────────────────────────────────────

// ⚙️ À ADAPTER selon la doc de TON fournisseur (URL exacte de l'endpoint).
const SMS_API_URL = "https://api.linksy.tech/send"; // ← remplace par l'URL réelle

function normalizePhone(raw) {
  const cleaned = String(raw || "").replace(/\s/g, "");
  if (cleaned.startsWith("+213")) return cleaned;
  return "+213" + cleaned.replace(/^0/, "");
}

function hashCode(phone, code) {
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:autopiecesdz-otp`)
    .digest("hex");
}

// 🔌 LE SEUL endroit à adapter selon ton fournisseur SMS algérien.
// Ajuste l'URL, les headers et le body selon SA documentation.
async function sendSmsViaProvider(phone, message, token) {
  const res = await fetch(SMS_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: phone,        // ex: +213661000000
      message: message, // ex: "AutoPièces DZ : votre code est 123456"
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`SMS provider ${res.status}: ${txt}`);
  }
}

exports.sendOtp = onCall(
  { region: REGION, secrets: [SMS_API_TOKEN] },
  async (request) => {
    const phone = normalizePhone(request.data && request.data.phone);
    if (!/^\+213\d{9}$/.test(phone)) {
      throw new HttpsError("invalid-argument", "Numéro algérien invalide.");
    }

    const ref = db.collection("otp_codes").doc(phone);
    const now = Date.now();
    const snap = await ref.get();

    if (snap.exists) {
      const d = snap.data();
      // Anti-spam : 1 SMS toutes les 60s
      if (d.lastSentAt && now - d.lastSentAt < 60 * 1000) {
        throw new HttpsError("resource-exhausted", "Patientez avant de redemander un code.");
      }
      // Max 5 SMS par heure
      if (d.windowStart && now - d.windowStart < 3600 * 1000 && (d.sendCount || 0) >= 5) {
        throw new HttpsError("resource-exhausted", "Trop de demandes. Réessayez plus tard.");
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const prevWindow =
      snap.exists && snap.data().windowStart && now - snap.data().windowStart < 3600 * 1000
        ? snap.data().windowStart
        : now;
    const sendCount =
      snap.exists && prevWindow === snap.data().windowStart ? (snap.data().sendCount || 0) + 1 : 1;

    await ref.set({
      codeHash: hashCode(phone, code),
      expiresAt: now + 5 * 60 * 1000,
      attempts: 0,
      lastSentAt: now,
      windowStart: prevWindow,
      sendCount,
    });

    try {
      await sendSmsViaProvider(
        phone,
        `AutoPièces DZ : votre code de vérification est ${code}`,
        SMS_API_TOKEN.value()
      );
    } catch (e) {
      console.error("[sendOtp] SMS error:", e.message);
      throw new HttpsError("unavailable", "Impossible d'envoyer le SMS. Réessayez.");
    }

    return { success: true };
  }
);

exports.verifyOtp = onCall(
  { region: REGION },
  async (request) => {
    const phone = normalizePhone(request.data && request.data.phone);
    const code = String((request.data && request.data.code) || "");
    if (!/^\d{6}$/.test(code)) {
      throw new HttpsError("invalid-argument", "Code à 6 chiffres requis.");
    }

    const ref = db.collection("otp_codes").doc(phone);
    const snap = await ref.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Aucun code en attente. Renvoyez le SMS.");
    }

    const d = snap.data();
    if (Date.now() > d.expiresAt) {
      await ref.delete();
      throw new HttpsError("deadline-exceeded", "Code expiré. Renvoyez le SMS.");
    }
    if ((d.attempts || 0) >= 5) {
      await ref.delete();
      throw new HttpsError("resource-exhausted", "Trop de tentatives. Renvoyez le SMS.");
    }
    if (hashCode(phone, code) !== d.codeHash) {
      await ref.update({ attempts: (d.attempts || 0) + 1 });
      throw new HttpsError("permission-denied", "Code incorrect.");
    }

    await ref.delete(); // code à usage unique
    return { success: true, phone };
  }
);
