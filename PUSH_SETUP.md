# Push Notifications (FCM) — Setup & Deploy

The app now registers each device for FCM and saves the token to
`users/{uid}.fcmTokens`. A Cloud Function (`functions/index.js`) sends a real
push every time `createNotif()` writes to `notifications/{uid}/items`.

You only need to do the steps below **once**. After that, every notification
your app already creates (new order, rating, subscription warning, …) will also
arrive as a push.

---

## 1. Enable billing (required for Cloud Functions)
Firebase Console → upgrade the project to the **Blaze** (pay-as-you-go) plan.
Push volume for a marketplace is tiny; you'll stay within the free tier.

## 2. iOS only — APNs key (required, else iOS push silently fails)
1. Apple Developer → Certificates, IDs & Profiles → **Keys** → create an
   **APNs Auth Key** (.p8). Note the **Key ID** and your **Team ID**.
2. Firebase Console → Project settings → **Cloud Messaging** → *Apple app
   configuration* → upload the `.p8`, Key ID, Team ID.

Android needs nothing extra — `google-services.json` is already in place.

## 3. Set the function region to match your database
Open `functions/index.js` and check the `REGION` constant.
Firebase Console → Firestore Database shows your location group:
- `nam5` / US  → `us-central1` (current default)
- `eur3` / EU  → `europe-west1`

The Firestore database id is the named DB **`tahar2`** (already set — do not change).

## 4. Deploy the Cloud Function
```bash
cd functions
npm install
cd ..
npx firebase login          # once
npx firebase deploy --only functions
```
Watch logs with: `npx firebase functions:log`

## 5. Rebuild the app (FCM does NOT work in Expo Go)
```bash
eas build --profile development --platform android   # or ios / production
```
Install the build on a real device, log in → you should see
`[push] token saved` in the logs and a row in `users/{uid}.fcmTokens`.

---

## Test it
1. Log in on a real device (token gets saved).
2. From another account, place an order from that seller (or create any notif).
3. The Cloud Function fires → push arrives:
   - **app in background/closed** → system notification (tap → opens the screen)
   - **app in foreground** → in-app banner (tap → opens the screen)

Manual test from the Firebase Console → Cloud Messaging → "Send test message",
paste a device token from `users/{uid}.fcmTokens`.

## Notes
- Foreground display uses `src/components/NotifBanner.jsx` (FCM never shows
  foreground messages itself).
- Background/quit display is handled by the OS from the `notification` payload.
- Stale tokens are auto-pruned by the function.
- Routing: the function copies `notif.data.screen` into the push `data`, and
  `routeFromData()` in `push.service.js` maps it to a screen on tap.
