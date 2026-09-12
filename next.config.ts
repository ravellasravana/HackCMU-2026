import type { NextConfig } from "next";

// CAPACITOR_BUILD=true selects a static export (see scripts/build-capacitor.sh),
// used only to produce the assets bundled into the Android app. The normal
// `next dev` / `next build` / `next start` flow (with the /api routes) is
// untouched.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  ...(isCapacitorBuild ? { output: "export" as const, images: { unoptimized: true } } : {}),
};

export default nextConfig;
