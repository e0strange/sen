/* sen service worker: keeps the game on the device so it opens offline.
   When you upload a new version, change VERSION so phones fetch fresh copies. */
const VERSION = 'sen-v0.725';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './fonts/SpaceMono-Regular.woff',
  './fonts/SpaceMono-Bold.woff',
  './fonts/LeagueSpartan-SemiBold.woff'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION)
    .then(c => Promise.allSettled(FILES.map(f => c.add(new Request(f, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* serve from the device first (instant + offline), refresh the stored copy in the background */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === 'navigate';
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(nav ? './index.html' : req, { ignoreSearch: true }) || (nav ? await c.match('./') : null);
    const net = fetch(req).then(res => {
      if (res && res.ok) c.put(nav ? './index.html' : req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || new Response('Offline', { status: 503, statusText: 'Offline' });
  }));
});
