import type { MetadataRoute } from "next";

// Required for `output: "export"` (the Capacitor Android build, see
// scripts/build-capacitor.mjs) — without it Next treats this as a dynamic
// route. The manifest content is fully static anyway, so this is a no-op
// for the regular web build.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dining Car — stop throwing money in the bin",
    short_name: "Dining Car",
    description: "Forward a grocery receipt or scan your fridge. AI sets eat-by alarms and plans dinners so nothing rots.",
    start_url: "/",
    display: "standalone",
    background_color: "#231d15",
    theme_color: "#231d15",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
