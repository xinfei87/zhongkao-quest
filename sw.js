/* 离线缓存：更新代码或题库后，务必把 CACHE_VERSION 加 1 */
const CACHE_VERSION = 'zkq-v1';
const SHELL = [
  './',
  './index.html',
  './assets/app.css',
  './assets/icon.svg',
  './manifest.webmanifest',
  './src/main.js',
  './src/util.js',
  './src/data.js',
  './src/labs.js',
  './src/engine/judge.js',
  './src/engine/backtrack.js',
  './src/engine/scheduler.js',
  './src/store/local.js',
  './src/store/sync.js',
  './src/views/home.js',
  './src/views/chapters.js',
  './src/views/quiz.js',
  './src/views/labs.js',
  './src/views/me.js',
  './src/views/rewards.js',
  './src/views/parent.js',
  './data/index.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  // 页面导航：网络优先，离线回退首页
  if (request.mode === 'navigate') {
    e.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  // 题库与静态资源：先用缓存，后台更新
  e.respondWith(
    caches.match(request).then((hit) => {
      const refresh = fetch(request)
        .then((res) => {
          if (res.ok) caches.open(CACHE_VERSION).then((c) => c.put(request, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    }),
  );
});
