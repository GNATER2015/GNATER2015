// Service worker de Gestion Scolaire : coquille de l'application disponible hors connexion.
// Jamais mis en cache : appels Supabase (données, authentification, fonctions) et toute requête non GET.
const CACHE = 'gestion-scolaire-v1';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || !/^https?:$/.test(url.protocol)) return;
  if (/supabase\.(co|in)$/.test(url.hostname) || url.pathname.includes('/functions/v1/') || url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) return; // données : toujours le réseau
  if (req.mode === 'navigate') { // page : réseau d'abord, copie en cas de coupure
    e.respondWith(fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match(self.registration.scope) || Response.error())));
    return;
  }
  // bibliothèques, polices, icônes : copie d'abord, mise à jour en arrière-plan
  e.respondWith(caches.match(req).then(m => {
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); } return r; }).catch(() => m);
    return m || net;
  }));
});
