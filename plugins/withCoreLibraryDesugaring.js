/**
 * Config plugin: enable Android core library desugaring.
 * Required by @google-cloud/recaptcha-enterprise-react-native (used for phone auth).
 * expo-build-properties@1.0.10 doesn't support this, so we patch app/build.gradle.
 */
const { withAppBuildGradle } = require("@expo/config-plugins");

const DESUGAR_VERSION = "2.1.4";

module.exports = function withCoreLibraryDesugaring(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1) Enable in compileOptions (create the block if it doesn't exist)
    if (!src.includes("coreLibraryDesugaringEnabled")) {
      if (/compileOptions\s*\{/.test(src)) {
        src = src.replace(
          /compileOptions\s*\{/,
          (m) => `${m}\n        coreLibraryDesugaringEnabled true`
        );
      } else {
        src = src.replace(
          /android\s*\{/,
          (m) => `${m}\n    compileOptions {\n        coreLibraryDesugaringEnabled true\n    }`
        );
      }
    }

    // 2) Add the desugaring runtime dependency
    if (!src.includes("desugar_jdk_libs")) {
      src = src.replace(
        /dependencies\s*\{/,
        (m) =>
          `${m}\n    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:${DESUGAR_VERSION}"`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
