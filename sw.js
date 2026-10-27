// Mi Plata — service worker: permite usar la app sin internet.
// Al publicar una versión nueva, cambia VERSION aquí, APP_VERSION en app.js y ?v= en index.html.
const VERSION = '1.2.0';
const CACHE = 'miplata-' + VERSION;
const ASSETS = ['./', './index.html', './app.js?v=' + VERSION, './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  // cache: 'reload' evita guardar copias viejas que estén en la caché HTTP del navegador.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('miplata-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.mode === 'navigate') {
    // Red primero (para recibir actualizaciones), pero con señal mala usa la copia guardada a los 3 s.
    // Solo se guardan respuestas correctas: un 404 temporal de GitHub nunca reemplaza la app.
    const fromNet = fetch(req).then(res => {
      if (res.ok && res.type === 'basic') { const copy = res.clone(); return caches.open(CACHE).then(c => c.put('./index.html', copy)).then(() => res); }
      return null;
    }).catch(() => null);
    e.waitUntil(fromNet);
    e.respondWith((async () => {
      const cached = await caches.match('./index.html', { cacheName: CACHE }) || await caches.match('./index.html');
      const timer = new Promise(r => setTimeout(() => r(null), 3000));
      const first = await Promise.race([fromNet, cached ? timer : fromNet]);
      if (first) return first;
      if (cached) return cached;
      return (await fromNet) || fetch(req);
    })());
    return;
  }
  // Archivos: la URL exacta (con ?v=) evita mezclar index.html nuevo con app.js viejo.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
