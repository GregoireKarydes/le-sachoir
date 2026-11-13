// Service worker du Sachoir (v1.0) : appli disponible hors ligne, éditions mises à jour dès que possible.
const VERSION = "sachoir-v19";
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
  // API du Sachoir et autres services : jamais de cache (données de compte, mesures).
  if (url.origin !== location.origin && !url.hostname.endsWith("gstatic.com") && !url.hostname.endsWith("googleapis.com")) return;
  if (url.pathname.endsWith("/admin.html")) return;
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

// Notifications push : elles arrivent même appli fermée (le téléphone réveille ce service worker).
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Le Sachoir", {
    body: d.body || "L’édition du jour est servie.",
    icon: "assets/icon-192.png",
    tag: d.tag || "sachoir",
    lang: "fr",
    data: { url: d.url || "./" },
  }));
});
// Toucher la notification : on rouvre l'appli (ou on la ramène au premier plan) sur l'édition annoncée.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const c = list.find(w => w.url.startsWith(self.registration.scope));
    if (c) return c.focus().then(w => (w || c).navigate ? (w || c).navigate(url) : null).catch(() => clients.openWindow(url));
    return clients.openWindow(url);
  }));
});
