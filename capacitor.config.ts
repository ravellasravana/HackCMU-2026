import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.diningcar.app",
  appName: "Dining Car",
  // Static export of the Next.js app (see scripts/build-capacitor.sh) — the
  // /api routes are excluded from this build; the app falls back to its
  // built-in local receipt normalizer + recipe library, matching the
  // "everything works offline" behavior described in the README.
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
