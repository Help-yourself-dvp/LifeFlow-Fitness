/* sw.js — служба офлайн-кэша веб-версии FitFlow (PWA для iPhone/iPad).
   0.9.55.

   Зачем файл нужен:
   – без него установленное веб-приложение на iPhone требует сети при каждом
     запуске, а FitFlow — офлайн-first: вода, еда и дневники обязаны быть
     доступны в самолёте и без интернета;
   – в APK (Android) этот файл не работает и не регистрируется: приложение
     и так установлено, а служба в WebView не нужна (регистрация в app.js
     закрыта проверкой !window.Capacitor).

   Как обновляется версия (важно, чтобы не «застрять» на старом коде):
   1. Страница при запуске сама запрашивает version.txt (этот файл служба
      НЕ кэширует — он всегда из сети).
   2. Если на сайте номер версии новее, страница шлёт службе
      'fitflow-refresh-shell' — служба перекачивает файлы оболочки мимо
      кэша и отвечает 'fitflow-shell-updated'.
   3. Страница один раз за сеанс перезагружается и работает уже на новой
      версии. Без интернета шаг пропускается — работает кэш.

   Никакие сторонние запросы (Open Food Facts, ИИ-провайдеры) служба не
   трогает: она перехватывает только GET своего сайта.
*/

const CACHE_PREFIX = 'fitflow-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v1';
const VERSION_URL = 'version.txt';

/* Оболочка приложения: всё, без чего приложение не запустится офлайн.
   Список обязан совпадать с тем, что реально лежит в веб-сборке (job
   «web» в tools/github-workflows/pages.yml копирует именно эти файлы). */
const SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './sqlite-bundle.js',
  './manifest.json',
  './icon.png',
  './assets/pwa/apple-touch-icon-180.png',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/icon-maskable-512.png',
  './assets/fonts/manrope.ttf',
  './assets/fonts/manrope-regular.ttf',
  './assets/fonts/manrope-bold.ttf',
  './assets/fonts/ptserif-regular.ttf',
  './assets/fonts/ptserif-bold.ttf',
  './assets/fonts/russoone.ttf',
  './assets/fonts/comfortaa.ttf'
];

/* Перекачиваем оболочку мимо кэша. Один не доехавший файл (например,
   шрифт) не должен ронять всю установку — поэтому each-с-перехватом, а не
   addAll. */
async function fillCache() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.all(SHELL.map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'reload' });
      if (res && res.ok) await cache.put(url, res.clone());
    } catch (e) {
      /* нет файла — не страшно: остальная оболочка важнее */
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    await fillCache();
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

/* Запрос от страницы: «на сайте новая версия — обнови оболочку». */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'fitflow-refresh-shell') return;
  const task = (async () => {
    await fillCache();
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({ type: 'fitflow-shell-updated', version: data.version || '' });
    }
  })();
  if (typeof event.waitUntil === 'function') event.waitUntil(task);
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  /* Чужие домены (Open Food Facts, облачный ИИ) — не наше дело. */
  if (url.origin !== self.location.origin) return;
  /* version.txt — всегда сеть: по нему узнаём о новой версии. */
  if (url.pathname.endsWith('/' + VERSION_URL)) return;

  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (e) {
      /* Офлайн и файла нет в кэше: для перехода отдаём главную страницу
         (приложение одностраничное), для остального — честную ошибку. */
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
