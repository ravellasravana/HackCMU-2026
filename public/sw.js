// Deliberately minimal: no caching. This only exists to satisfy "has a service worker" as
// part of PWA install criteria on browsers that still check for one. Every request just
// passes straight through to the network, so API responses and receipt data are never
// served stale from a cache.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
