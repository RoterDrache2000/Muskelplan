// Muskelplan Offline-Speicher. Die App holt sich bei Internet immer die neueste Version,
// außer während eines laufenden Trainings: dann bleibt die Version, mit der du angefangen hast, bis du fertig bist.
// Deine Pläne und Trainings liegen getrennt davon im Speicher des Geräts und bleiben bei Updates erhalten.
const CACHE = "muskelplan-cache-v1";
const FLAGS = "muskelplan-flags";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== FLAGS).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function running(){
  try { const r = await (await caches.open(FLAGS)).match("./__running"); if (!r) return false; const t = +(await r.text()); return Date.now() - t < 6 * 3600 * 1000; } catch(e) { return false; }
}
const netFirst = req => fetch(req, { cache: "no-cache" }).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return res; })
  .catch(() => caches.match(req).then(m => m || caches.match("./index.html")));
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const scope = new URL(self.registration.scope);
    const isPage = req.mode === "navigate" || url.pathname === scope.pathname || url.pathname === scope.pathname + "index.html";
    if (isPage) {
      // Training läuft: keine neue Version laden, die gespeicherte weiter benutzen
      e.respondWith(running().then(async on => { if (on) { const m = (await caches.match(req)) || (await caches.match("./index.html")) || (await caches.match("./")); if (m) return m; } return netFirst(req); }));
      return;
    }
    e.respondWith(netFirst(req));
  } else {
    // Schriften und Bausteine (PDF, Druck): gespeicherte Kopie, sonst Internet
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
  }
});
self.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "run") e.waitUntil(caches.open(FLAGS).then(c => d.on ? c.put("./__running", new Response(String(Date.now()))) : c.delete("./__running")));
});
