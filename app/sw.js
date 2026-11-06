// Service worker du Sachoir : appli disponible hors ligne, éditions mises à jour dès que possible.
const VERSION = "sachoir-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "assets/logo.png", "assets/icon-192.png", "assets/icon-512.png", "assets/books.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Index et éditions : réseau d'abord, cache en secours (lecture hors ligne).
  if (url.pathname.endsWith(".json") || e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
    return;
  }
  // Images, polices, assets : cache d'abord.
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok && (url.origin === location.origin || url.hostname.endsWith("gstatic.com") || url.hostname.endsWith("googleapis.com"))) {
      const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return r;
  })));
});
