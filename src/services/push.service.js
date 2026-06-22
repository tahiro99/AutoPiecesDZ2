// ─────────────────────────────────────────────────────────────
// FCM push notifications (client side) — @react-native-firebase/messaging
// Token registration + handlers. Sending is done by the Cloud Function
// in /functions (triggered when createNotif writes a Firestore doc).
// ─────────────────────────────────────────────────────────────
import messaging from "@react-native-firebase/messaging";
import { Platform, PermissionsAndroid } from "react-native";
import {
  doc, setDoc, updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { navigate } from "../navigation/navigationRef";

// ── Background / quit handler ──────────────────────────────────
// Must be registered at module scope (runs in the headless JS context).
// When the message carries a `notification` block, the OS shows it
// automatically — we only need to be present to receive data messages.
messaging().setBackgroundMessageHandler(async () => {
  // No-op: system tray handles display. Tap routing handled on open.
  return Promise.resolve();
});

let tokenRefreshUnsub = null;
let currentToken = null;

async function requestPermission() {
  try {
    if (Platform.OS === "android") {
      // Android 13+ requires runtime permission
      if (Platform.Version >= 33) {
        const res = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return res === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    }
    // iOS
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (e) {
    console.log("[push] permission error:", e.message);
    return false;
  }
}

async function saveToken(userId, token) {
  if (!userId || !token) return;
  try {
    await setDoc(
      doc(db, "users", userId),
      { fcmTokens: arrayUnion(token) },
      { merge: true }
    );
    console.log("[push] token saved for", userId);
  } catch (e) {
    console.log("[push] saveToken error:", e.message);
  }
}

// Call on login.
export async function registerForPush(userId) {
  if (!userId) return;
  try {
    const granted = await requestPermission();
    if (!granted) {
      console.log("[push] permission not granted");
      return;
    }
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages().catch(() => {});
    }
    const token = await messaging().getToken();
    currentToken = token;
    await saveToken(userId, token);

    if (tokenRefreshUnsub) tokenRefreshUnsub();
    tokenRefreshUnsub = messaging().onTokenRefresh((t) => {
      currentToken = t;
      saveToken(userId, t);
    });
  } catch (e) {
    console.log("[push] register error:", e.message);
  }
}

// Call on logout — stop this device from receiving pushes for that user.
export async function unregisterFromPush(userId) {
  try {
    if (tokenRefreshUnsub) {
      tokenRefreshUnsub();
      tokenRefreshUnsub = null;
    }
    const token = currentToken || (await messaging().getToken().catch(() => null));
    if (userId && token) {
      await updateDoc(doc(db, "users", userId), {
        fcmTokens: arrayRemove(token),
      }).catch(() => {});
    }
  } catch (e) {
    console.log("[push] unregister error:", e.message);
  }
}

// Map a notification's data payload → in-app navigation.
export function routeFromData(data) {
  if (!data) return navigate("Notifications");
  switch (data.screen) {
    case "SellerDashboard":
      return navigate("SellerDashboard");
    case "Orders":
      return navigate("Orders");
    case "Chat":
      return navigate(
        "Chat",
        data.conversationId ? { conversationId: data.conversationId } : undefined
      );
    case "Subscription":
      return navigate("Subscription");
    default:
      return navigate("Notifications");
  }
}
