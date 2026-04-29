/* ═══════════════════════════════════════════════════════
   Planify — sw.js (Service Worker)
   Umístění: KOŘEN projektu (vedle index.html)

   Funkce:
   - Notifikace na pozadí (i když aplikace neběží)
   - Připomínky návyků v nastavený čas
   - Cache pro offline fungování (základní)
═══════════════════════════════════════════════════════ */

const SW_VERSION    = 'planify-sw-v1';
const CACHE_NAME    = 'planify-cache-v1';

// Soubory pro offline cache
const CACHE_FILES = [
  './',
  './index.html',
  './app.html',
  './css/app.css',
  './css/auth.css',
  './css/tour.css',
  './css/cookie.css',
  './img/logo.png',
];

/* ─────────────────────────────────────────────────────
   INSTALL — základní cache
───────────────────────────────────────────────────── */
self.addEventListener('install', event => {
  console.log('[SW] Instalace', SW_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_FILES).catch(() => {})) // Ignorovat chyby při cache
      .then(() => self.skipWaiting())
  );
});

/* ─────────────────────────────────────────────────────
   ACTIVATE — vyčistit staré cache
───────────────────────────────────────────────────── */
self.addEventListener('activate', event => {
  console.log('[SW] Aktivace', SW_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* ─────────────────────────────────────────────────────
   FETCH — Network first, cache fallback
───────────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  // Přeskočit non-GET a Supabase/CDN requesty
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || url.hostname.includes('jsdelivr')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Uložit do cache
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned)).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

/* ─────────────────────────────────────────────────────
   ZPRÁVY z hlavní aplikace
───────────────────────────────────────────────────── */

// Data od aplikace
let _reminders     = [];  // [{ habitId, habitName, habitIcon, time }]
let _checkedToday  = [];  // habitId[] — splněné dnes
let _reminderTimer = null;

self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {

    case 'SYNC_REMINDERS':
      // Aplikace nám poslala aktuální připomínky
      _reminders    = event.data.reminders || [];
      _checkedToday = event.data.checkedToday || [];
      console.log('[SW] Připomínky synchronizovány:', _reminders.length);
      _scheduleReminderCheck();
      break;
  }
});

/* ─────────────────────────────────────────────────────
   SCHEDULER PŘIPOMÍNEK — kontrola každou minutu
───────────────────────────────────────────────────── */
function _scheduleReminderCheck() {
  if (_reminderTimer) clearInterval(_reminderTimer);

  _reminderTimer = setInterval(() => {
    _checkReminders();
  }, 60_000); // Každou minutu

  // Hned jednou zkontrolovat
  _checkReminders();
}

function _checkReminders() {
  if (!_reminders.length) return;

  const now     = new Date();
  const curTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const today   = now.toISOString().slice(0, 10);

  _reminders.forEach(reminder => {
    if (reminder.time !== curTime) return;
    if (_checkedToday.includes(reminder.habitId)) return;

    // Odeslat notifikaci
    self.registration.showNotification(
      `${reminder.habitIcon} ${reminder.habitName}`,
      {
        body:    'Připomínka: nezapomeňte na dnešní návyk!',
        icon:    './img/logo.png',
        badge:   './img/logo.png',
        tag:     `habit-reminder-${reminder.habitId}-${today}`,
        silent:  false,
        data:    { section: 'habits', habitId: reminder.habitId },
        actions: [
          { action: 'open',    title: '✓ Označit splněno' },
          { action: 'dismiss', title: 'Zavřít' },
        ],
      }
    ).catch(err => console.warn('[SW] Notifikace selhala:', err));
  });
}

/* ─────────────────────────────────────────────────────
   KLIKNUTÍ NA NOTIFIKACI
───────────────────────────────────────────────────── */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const section  = event.notification.data?.section || 'dashboard';
  const habitId  = event.notification.data?.habitId;
  const action   = event.action;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Otevřít existující záložku
        for (const client of clients) {
          if (client.url.includes('app.html') || client.url.endsWith('/')) {
            client.focus();
            client.postMessage({ type: 'NOTIFICATION_CLICK', section, habitId, action });
            return;
          }
        }
        // Otevřít novou záložku pokud žádná není
        return self.clients.openWindow(`./app.html#${section}`);
      })
  );
});

/* ─────────────────────────────────────────────────────
   ZAVŘENÍ NOTIFIKACE
───────────────────────────────────────────────────── */
self.addEventListener('notificationclose', event => {
  // Zaznamenat zavření — nic speciálního
  console.log('[SW] Notifikace zavřena:', event.notification.tag);
});

console.log('[SW] Service Worker načten:', SW_VERSION);
