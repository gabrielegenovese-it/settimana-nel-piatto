// Tiene l'app in memoria sul telefono: si apre anche senza rete.
// Cambiare VERSIONE a ogni modifica dei file, così il telefono scarica quelli nuovi.
const VERSIONE = "piatto-v6";
const FILE = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
const FONT = "piatto-font";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSIONE).then(c => c.addAll(FILE)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(n => n !== VERSIONE && n !== FONT).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);

  // Caratteri di Google: la prima volta dalla rete, poi dalla memoria.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(FONT).then(c => c.match(r).then(m => m || fetch(r).then(risp => { c.put(r, risp.clone()); return risp; }))));
    return;
  }

  const base = new URL("./", self.registration.scope);
  const nome = "./" + url.pathname.slice(base.pathname.length);
  if (url.origin !== location.origin || !FILE.includes(nome)) return;
  // Prima la copia salvata (apertura istantanea), intanto aggiorna in sottofondo.
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(salvata => {
      const rete = fetch(r).then(risp => {
        if (risp.ok) { const copia = risp.clone(); caches.open(VERSIONE).then(c => c.put(r, copia)); }
        return risp;
      }).catch(() => salvata);
      return salvata || rete;
    })
  );
});
