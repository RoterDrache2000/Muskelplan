// Muskelplan Offline-Speicher. Die App selbst holt sich bei Internet immer die neueste Version,
// deine Pläne und Trainings liegen getrennt davon im Speicher des Geräts und bleiben bei Updates erhalten.
const CACHE = "muskelplan-cache-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Eigene Dateien: erst Internet (neueste Version), sonst gespeicherte Kopie
    e.respondWith(fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
      .catch(() => caches.match(req).then(m => m || caches.match("./index.html"))));
  } else {
    // Schriften und Bausteine (PDF, Druck): gespeicherte Kopie, sonst Internet
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
