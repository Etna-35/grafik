// Service worker кабинета Etna — ТОЛЬКО network-first.
//
// ВАЖНО (см. CLAUDE.md §8 «Статика запечена в Docker-образ»): статика (app.js/styles.css/index.html)
// обновляется пересборкой образа, а не версионированием файлов. Поэтому кэш здесь НИКОГДА не должен
// маскировать свежую сеть — это чисто офлайн-фолбэк. Если сеть жива, всегда отдаём сетевой ответ
// (и обновляем кэш "по пути"). Кэш используется ТОЛЬКО когда сеть недоступна (fetch упал).
//
// Не кэшируем /api/* — это динамические данные, кэш для них не нужен и опасен (утечка между
// пользователями через общий Cache Storage, см. §8 clearSessionData()).
//
// SW_VERSION — поднимать при структурных изменениях самого sw.js (не при правках app.js/styles.css —
// они и так всегда идут через сеть при живом интернете).
const SW_VERSION = "v1";
const CACHE_NAME = `etna-static-${SW_VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Только GET, только наш origin, никогда /api/.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(networkFirst(request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    // Кэшируем только успешные ответы (не кладём в кэш ошибки/редиректы на логин и т.п.).
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (networkError) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw networkError;
  }
}
