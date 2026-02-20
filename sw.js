// ════════════════════════════════════════════
//  مسيرة — Service Worker v1.0
//  يتيح العمل أوفلاين وتسريع التحميل
// ════════════════════════════════════════════

const CACHE_NAME = 'maseera-v1';
const ASSETS = [
  './maseera_final.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;900&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// ─── تثبيت: تخزين الملفات في الكاش ───
self.addEventListener('install', event => {
  console.log('[SW] Installing Maseera Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to cache:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── تفعيل: حذف الكاش القديم ───
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── الطلبات: Stale-While-Revalidate ───
self.addEventListener('fetch', event => {
  // تجاهل طلبات غير GET
  if (event.request.method !== 'GET') return;

  // استراتيجية: أعطِ الكاش أولاً، وحدّثه في الخلفية
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(event.request);

      const fetchPromise = fetch(event.request)
        .then(networkRes => {
          if (networkRes && networkRes.ok) {
            cache.put(event.request, networkRes.clone());
          }
          return networkRes;
        })
        .catch(() => null);

      // إذا في الكاش → أعطه فوراً، وحدّث في الخلفية
      if (cached) {
        fetchPromise; // تحديث خلفي
        return cached;
      }

      // غير موجود في الكاش → انتظر الشبكة
      const networkRes = await fetchPromise;
      if (networkRes) return networkRes;

      // لا شبكة ولا كاش → صفحة أوفلاين
      return new Response(
        `<!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>مسيرة — غير متصل</title>
          <style>
            body { font-family: 'Tajawal', sans-serif; background: #080d14; color: #e2e8f0;
                   display: flex; align-items: center; justify-content: center;
                   min-height: 100vh; margin: 0; text-align: center; }
            .box { padding: 2rem; }
            .ico { font-size: 4rem; margin-bottom: 1rem; }
            h1 { font-size: 1.5rem; color: #38bdf8; margin-bottom: .5rem; }
            p { color: #94a3b8; font-size: .95rem; margin-bottom: 1.5rem; }
            button { background: #0ea5e9; color: #fff; border: none; padding: .75rem 1.5rem;
                     border-radius: 10px; font-size: 1rem; cursor: pointer; font-family: inherit; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="ico">📡</div>
            <h1>أنت غير متصل بالإنترنت</h1>
            <p>بياناتك محفوظة — ستعود مسيرة فور اتصالك بالشبكة</p>
            <button onclick="location.reload()">🔄 إعادة المحاولة</button>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    })
  );
});

// ─── مزامنة في الخلفية (لو دعم المتصفح) ───
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Background sync triggered');
  }
});

// ─── إشعار عند تحديث التطبيق ───
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
