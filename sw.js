const CACHE = 'pe-inventario-v1';
const STATIC = [
    '/', '/Login2.html', '/Equipos.html', '/Dashboard.html',
    '/Usuarios.html', '/Areas.html', '/IPs.html', '/Reportes.html',
    '/login2.css', '/Dashboard.css',
    '/app.js', '/api-client.js', '/Java.js',
    '/manifest.json', '/icons/pe-icon.svg'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {}));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    if (e.request.url.includes('/api/')) return;
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
            return res;
        })).catch(() => caches.match('/Login2.html'))
    );
});
