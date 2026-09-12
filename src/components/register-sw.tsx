"use client";

import { useEffect } from "react";

/** Registers the no-op service worker so the app meets PWA install criteria. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* not installable this session — the app works fine without it */
      });
    }
  }, []);
  return null;
}
