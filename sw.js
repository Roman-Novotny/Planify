/* ═══════════════════════════════════════════════════════
   Planify — sw.js (Service Worker)
   Umístění: KOŘEN projektu (vedle index.html)

   Funkce:
   - Notifikace na pozadí (i když aplikace neběží)
   - Připomínky návyků v nastavený čas
   - Cache pro offline fungování (základní)
═══════════════════════════════════════════════════════ */

const SW_VERSION    = 'planify-sw-v2';
const CACHE_NAME    = 'planify-cache-v2';

// Soubory pro offline cache
const CACHE_FILES = [
  './',
  './index.html',
  './app.html',
  './css/app.css',
  './css/auth.css',
  './css/tour.css',
  './css/cookie.css',
  './img/icon.svg',
  './img/logo-text-tmav.png',
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
let _reminders      = [];  // [{ habitId, habitName, habitIcon, time }]
let _taskReminders  = [];  // [{ taskId, taskName, time }]
let _checkedToday   = [];  // habitId[] — splněné dnes
let _notifiedToday  = [];  // taskId+time — oznámené dnes
let _reminderTimer  = null;
let _swToday        = '';

self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {

    case 'SYNC_REMINDERS':
      _reminders    = event.data.reminders || [];
      _checkedToday = event.data.checkedToday || [];
      _swToday      = event.data.today || '';
      _scheduleReminderCheck();
      break;

    case 'SYNC_TASK_REMINDERS':
      _taskReminders = event.data.reminders || [];
      if (event.data.today) _swToday = event.data.today;
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
  const now     = new Date();
  const curTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const todayStr = now.toISOString().slice(0, 10);

  // ── Návyky ──────────────────────────────────────────
  _reminders.forEach(reminder => {
    if (reminder.time !== curTime) return;
    if (_checkedToday.includes(reminder.habitId)) return;

    self.registration.showNotification(
      `${reminder.habitIcon} ${reminder.habitName}`,
      {
        body:    'Připomínka: nezapomeňte na dnešní návyk!',
        icon:    './img/icon.svg',
        badge:   './img/icon.svg',
        tag:     `habit-reminder-${reminder.habitId}-${todayStr}`,
        data:    { section: 'habits', habitId: reminder.habitId },
        actions: [
          { action: 'open',    title: '✓ Označit splněno' },
          { action: 'dismiss', title: 'Zavřít' },
        ],
      }
    ).catch(() => {});
  });

  // ── Task připomínky ──────────────────────────────────
  _taskReminders.forEach(reminder => {
    if (reminder.time !== curTime) return;
    const key = `${reminder.taskId}_${todayStr}_${curTime}`;
    if (_notifiedToday.includes(key)) return;
    _notifiedToday.push(key);

    self.registration.showNotification(
      `⏰ ${reminder.taskName}`,
      {
        body:  'Připomínka úkolu',
        icon:  './img/icon.svg',
        badge: './img/icon.svg',
        tag:   `task-reminder-${reminder.taskId}-${todayStr}`,
        data:  { section: 'tasks' },
      }
    ).catch(() => {});
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
