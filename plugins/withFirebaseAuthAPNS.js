/**
 * Config plugin: forward the APNs device token to Firebase Auth on iOS.
 *
 * When @react-native-firebase/messaging (FCM) is integrated, FCM captures the
 * APNs device token and Firebase Auth may never receive it. Phone Auth then
 * fails at signInWithPhoneNumber with a generic:
 *   [auth/internal-error] "An internal error has occurred, print and inspect
 *    the error details for more information."
 *
 * The documented fix is to explicitly call Auth.auth().setAPNSToken(...) inside
 * application(_:didRegisterForRemoteNotificationsWithDeviceToken:).
 * We inject that into the managed Expo Swift AppDelegate at build time.
 *
 * See: https://github.com/invertase/react-native-firebase/issues/7420
 */
const { withAppDelegate } = require("@expo/config-plugins");

const APNS_METHOD = `
  // [withFirebaseAuthAPNS] Forward APNs token to Firebase Auth so Phone Auth
  // (SMS) works on iOS. Without this, FCM captures the token and Auth never
  // gets it -> auth/internal-error when sending the SMS code.
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    // .unknown lets Firebase auto-detect the sandbox/prod APNs environment.
    Auth.auth().setAPNSToken(deviceToken, type: .unknown)
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }
`;

module.exports = function withFirebaseAuthAPNS(config) {
  return withAppDelegate(config, (cfg) => {
    // Only the modern Swift AppDelegate (Expo SDK 50+)
    if (cfg.modResults.language !== "swift") return cfg;

    let src = cfg.modResults.contents;

    // 1) Ensure FirebaseAuth is imported (added right after `import Expo`)
    if (!src.includes("import FirebaseAuth")) {
      if (/import Expo\b.*\n/.test(src)) {
        src = src.replace(/(import Expo\b.*\n)/, `$1import FirebaseAuth\n`);
      } else {
        src = `import FirebaseAuth\n` + src;
      }
    }

    // 2) Inject the APNs-forwarding method as the first member of AppDelegate
    if (!src.includes("setAPNSToken")) {
      src = src.replace(
        /(class AppDelegate:\s*ExpoAppDelegate\s*\{)/,
        `$1\n${APNS_METHOD}`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
