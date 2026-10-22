
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp, getApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { getAuth } = require("firebase-admin/auth");

const DATABASE_ID = "******";
const REGION = "europe-west3";

const ADMIN_EMAIL = "taharboussag13@gmail.com";

initializeApp();

setGlobalOptions({
  region: REGION,
  maxInstances: 50,
  timeoutSeconds: 60,
  memory: "256MiB",
  concurrency: 80,
});

const db = getFirestore(getApp(), DATABASE_ID);

exports.sendNotificationPush = onDocumentCreated(
  {
    document: "notifications/{userId}/items/{notifId}",
    database: DATABASE_ID,
    region: REGION,
  
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
    if (!["abonnement", "report", "subscription_warning", "message", "commande"].includes(notif.type)) { 
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
        title: "Abonnement activé ",
        body: "Votre abonnement vendeur est maintenant actif. Bonnes ventes sur AutoPièces DZ !",
        data: { screen: "Subscription" },
      }).catch((e) => console.error("[sub] notif error:", e.message));
    }
  }
);

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
exports.notifyOnNewMessage = onDocumentCreated(
  {
    document: "conversations/{convId}/messages/{msgId}",
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    const msg = event.data?.data() || {};
    if (!msg.senderId) return;
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

exports.applySubscriptionApproval = onDocumentUpdated(
  { document: "subscription_requests/{requestId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const before = event.data?.before?.data() || {};
    const after = event.data?.after?.data() || {};
    if (before.status === after.status) return;
    if (after.status !== "approved") return;
    if (!after.userId) return;
    if (after.appliedAt) {
      console.log("[sub-approve] already applied, skipping");
      return;
    }
    const months = Number(after.months) || 1;

    let userSub = {};
    try {
      userSub = (await db.doc(`users/${after.userId}`).get()).get("subscription") || {};
    } catch (e) {
      console.error("[sub-approve] read user error:", e.message);
      return;
    }
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
      await event.data.after.ref.update({
        appliedAt: FieldValue.serverTimestamp(),
        appliedMonths: months,
        appliedNewEnd: newEnd.toISOString(),
      });
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

async function shouldSendPush(userId) {
  try {
    const ref = db.doc(`users/${userId}/_inbox/state`);
    const snap = await ref.get();
    const lastPush = snap.exists ? (snap.get("lastPushAt")?.toMillis?.() || 0) : 0;
    const now = Date.now();
    if (now - lastPush < 20_000) return false;
    await ref.set({ lastPushAt: new Date() }, { merge: true });
    return true;
  } catch (e) {
    console.error("[batch] error:", e.message);
    return true; 
}

exports.antiSpamNotifications = onDocumentCreated(
  { document: "notifications/{userId}/items/{itemId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const { userId, itemId } = event.params;
    const notif = event.data?.data() || {};
    const ref = event.data?.ref;
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

exports.validateNewListing = onDocumentCreated(
  { document: "listings/{listingId}", database: DATABASE_ID, region: REGION },
  async (event) => {
    const l = event.data?.data() || {};
    const ref = event.data?.ref;
    const issues = [];
    if (!l.title || typeof l.title !== "string" || l.title.length < 3) {
      issues.push("title too short");
    }
    if (l.title && l.title.length > 200) issues.push("title too long");
    if (!l.sellerId) issues.push("missing sellerId");
    if (l.price == null || typeof l.price !== "number" || l.price <= 0 || l.price > 50_000_000) {
      issues.push("invalid price");
    }
    if (l.description && l.description.length > 5000) issues.push("description too long");

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

