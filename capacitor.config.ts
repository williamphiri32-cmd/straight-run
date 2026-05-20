import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for wrapping the Lovable web app as a native Android/iOS app.
 *
 * Two modes:
 * 1. LIVE (default below): `server.url` points at the published Lovable URL,
 *    so the native shell loads the latest deployed web app. You keep iterating
 *    in Lovable and changes show up in the app after each Publish — no rebuild
 *    of the .aab needed for content updates.
 * 2. BUNDLED: comment out `server.url` and run `npm run build && npx cap sync`
 *    to ship the built `dist/` assets inside the app (works offline, but every
 *    update requires a new Play Store release).
 *
 * Setup (run locally after downloading the codebase):
 *   npm i -D @capacitor/cli
 *   npm i @capacitor/core @capacitor/android
 *   npx cap add android
 *   npx cap sync
 *   npx cap open android
 *
 * Then in Android Studio: Build → Generate Signed Bundle → Android App Bundle.
 */
const config: CapacitorConfig = {
  appId: "app.lovable.straightrun",
  appName: "Straight Run",
  webDir: "dist",
  server: {
    // Loads the live published site. Replace with your custom domain once connected.
    url: "https://straight-run.lovable.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
