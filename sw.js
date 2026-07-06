// =========================================================
// Service Worker — El Reto E×C×T=R
// Estrategia: precache del núcleo de la app + cache dinámico
// para el resto del sitio. La bitácora funciona sin conexión.
// =========================================================

const VERSION = 'reto-ectr-v4';
const NUCLEO = [
  'reto.html',
  'css/style.css',
  'css/reto.css',
  'js/main.js',
  'js/reto.js',
  'manifest.json',
  'images/app/icon-192.png',
  'images/app/icon-512.png'
];

// Instalación: guardamos el núcleo de la app
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(NUCLEO)).then(() => self.skipWaiting())
  );
});

// Activación: limpiamos versiones anteriores del cache
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Peticiones: red primero para HTML (contenido fresco),
// cache primero para todo lo demás (velocidad y offline).
self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const esHTML = peticion.headers.get('accept') && peticion.headers.get('accept').includes('text/html');

  if (esHTML) {
    evento.respondWith(
      fetch(peticion)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(VERSION).then((cache) => cache.put(peticion, copia));
          return resp;
        })
        .catch(() => caches.match(peticion).then((r) => r || caches.match('reto.html')))
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion).then((enCache) => {
      if (enCache) return enCache;
      return fetch(peticion).then((resp) => {
        // Solo cacheamos respuestas válidas del mismo origen o de fuentes
        if (resp && resp.status === 200 && (peticion.url.startsWith(self.location.origin) || peticion.url.includes('fonts.g'))) {
          const copia = resp.clone();
          caches.open(VERSION).then((cache) => cache.put(peticion, copia));
        }
        return resp;
      });
    })
  );
});

// Al tocar una notificación: abrimos (o enfocamos) la bitácora
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if (v.url.includes('reto.html') && 'focus' in v) return v.focus();
      }
      return clients.openWindow('reto.html?src=notificacion');
    })
  );
});
