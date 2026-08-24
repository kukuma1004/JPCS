/* 기록실 서비스 워커
   ─────────────────────────────────────────────────────────────
   역할은 두 가지뿐입니다.
   ① 홈 화면에 앱으로 설치되게 한다 (브라우저가 이 파일을 요구합니다)
   ② 지하철이나 학교 와이파이가 끊겨도 화면은 뜨게 한다

   중요 — 캐시 우선이 아니라 "네트워크 우선"입니다.
   예전에 배포한 파일을 계속 쓰는 사고를 막기 위해서입니다.
   항상 새 파일을 먼저 받아보고, 못 받을 때만 지난번 것을 씁니다.
   Firebase 통신은 아예 건드리지 않습니다. */
const CACHE = 'girokshil-v5';
const SHELL = ['./', './index.html', './skills.js', './manifest.webmanifest'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  // 우리 파일이 아니면 손대지 않습니다 (Firebase, 폰트, AI API 전부 그대로 통과)
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r).then(hit => hit || caches.match('./index.html')))
  );
});
