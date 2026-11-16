// Service worker do Apocalipse Z: depois da primeira abertura o jogo roda sem internet.
// Arquivos do jogo: rede primeiro (pega atualizações), cache se estiver offline.
// Bibliotecas (three.js) e áudio: cache primeiro (são pesados e quase não mudam).
const CACHE = 'apocalipse-z-v1';
const CASA = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'js/lobby.js', 'js/raid.js', 'js/dados.js', 'js/audio.js', 'js/modelos.js', 'js/visual.js', 'js/terreno.js',
  'js/cenarios.js', 'js/cen_util.js', 'js/cen_suburbio.js', 'js/cen_centro.js', 'js/cen_lab.js', 'js/cen_base.js', 'js/cen_ninho.js',
  'lib/three.module.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CASA.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const pesado = /\/lib\/|\/audio\/.+\.mp3$/.test(req.url);
  if (pesado) {
    e.respondWith(caches.match(req).then(h => h || fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {}); return res; })));
    return;
  }
  e.respondWith(fetch(req).then(res => { caches.open(CACHE).then(c => c.put(req, res.clone())).catch(() => {}); return res; }).catch(() => caches.match(req)));
});
