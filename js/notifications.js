/* ═══════════════════════════════════════════════════════
   Planify — js/notifications.js  v3
   Browser notifikace + Service Worker registrace
   pro notifikace na pozadí (když aplikace neběží)
═══════════════════════════════════════════════════════ */

let _notifPermission    = 'default';
let _notifCheckInterval = null;
let _shownNotifications = new Set();
let _swRegistration     = null; // Service Worker registrace

/* ═══════════════════════════════════════════════════════
   INICIALIZACE
═══════════════════════════════════════════════════════ */
function initNotifications() {
  if (!('Notification' in window)) {
    console.info('[Planify] Notifikace nejsou podporovány.');
    return;
  }

  _notifPermission = Notification.permission;

  // Registrovat Service Worker pro notifikace na pozadí
  _registerServiceWorker();

  if (_notifPermission === 'granted') {
    _startNotificationChecks();
  }

  _updateNotifDot();
}

/* ═══════════════════════════════════════════════════════
   SERVICE WORKER REGISTRACE
   SW umožní notifikace i když je aplikace zavřená
═══════════════════════════════════════════════════════ */
async function _registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    _swRegistration = await navigator.serviceWorker.register('sw.js', { scope: './' });
    console.info('[Planify] Service Worker registrován:', _swRegistration.scope);

    // Naslouchat zprávám ze SW
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        // Uživatel klikl na notifikaci z pozadí → fokus na aplikaci
        window.focus();
        if (event.data.section) navigate(event.data.section);
      }
    });

  } catch (err) {
    console.warn('[Planify] Service Worker se nepodařilo registrovat:', err.message);
    // Aplikace funguje i bez SW, jen bez pozadních notifikací
  }
}

/* ═══════════════════════════════════════════════════════
   NAPLÁNOVAT PŘIPOMÍNKY NÁVYKŮ PŘES SW
   Uloží data do SW pro budoucí notifikace
═══════════════════════════════════════════════════════ */
function syncRemindersToSW() {
  if (!_swRegistration || !navigator.serviceWorker.controller) return;

  const HABIT_REMINDERS_KEY = 'planify_habit_reminders';
  let reminders = {};
  try {
    const raw = localStorage.getItem(HABIT_REMINDERS_KEY);
    if (raw) reminders = JSON.parse(raw);
  } catch {}

  const D = window.APP_DATA;
  const reminderData = [];

  Object.entries(reminders).forEach(([habitId, time]) => {
    const habit = D.habits.find(h => h.id === habitId);
    if (!habit || !time) return;
    reminderData.push({ habitId, habitName: habit.name, habitIcon: habit.icon || '◎', time });
  });

  // Poslat data do Service Workeru
  navigator.serviceWorker.controller.postMessage({
    type: 'SYNC_REMINDERS',
    reminders: reminderData,
    today: today(),
    checkedToday: Object.entries(window.APP_DATA.habitLogs)
      .filter(([k, v]) => k.endsWith(`_${today()}`) && v)
      .map(([k]) => k.split('_')[0]),
  });
}

/* ═══════════════════════════════════════════════════════
   ŽÁDOST O POVOLENÍ
═══════════════════════════════════════════════════════ */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Tento prohlížeč nepodporuje notifikace.', 'warning'); return;
  }
  if (Notification.permission === 'granted') {
    showToast('Notifikace jsou již povoleny. 🔔', 'info'); return;
  }
  if (Notification.permission === 'denied') {
    showToast('Notifikace jsou zakázány v nastavení prohlížeče. Povolte je tam.', 'warning', 5000); return;
  }

  try {
    const result = await Notification.requestPermission();
    _notifPermission = result;

    if (result === 'granted') {
      showToast('Notifikace povoleny! 🔔 Budeme vás upozorňovat.', 'success');
      _startNotificationChecks();
      // Testovací notifikace
      setTimeout(() => {
        sendBrowserNotification('Planify 👋', 'Notifikace jsou aktivní. Dostanete připomínky úkolů a návyků.', {
          tag: 'planify-welcome',
        });
      }, 600);
      // Sync připomínek do SW
      setTimeout(syncRemindersToSW, 1000);
    } else {
      showToast('Notifikace nebyly povoleny.', 'info');
    }
  } catch (err) {
    console.error('[Planify] Chyba při žádosti o notifikace:', err);
  }
}

/* ═══════════════════════════════════════════════════════
   ODESLÁNÍ NOTIFIKACE
═══════════════════════════════════════════════════════ */
function sendBrowserNotification(title, body, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    // Preferovat SW notifikace (zobrazí se i na pozadí)
    if (_swRegistration?.active) {
      _swRegistration.showNotification(title, {
        body,
        icon:  'img/logo.png',
        badge: 'img/logo.png',
        tag:   options.tag || `planify-${Date.now()}`,
        data:  options.data || {},
        ...options,
      });
    } else {
      // Fallback na klasické notifikace
      const notif = new Notification(title, {
        body, icon: 'img/logo.png',
        tag: options.tag || `planify-${Date.now()}`,
        ...options,
      });
      notif.onclick = () => { window.focus(); notif.close(); };
      setTimeout(() => notif.close(), 8000);
    }
  } catch (err) {
    console.warn('[Planify] Notifikace selhala:', err.message);
  }
}

/* ═══════════════════════════════════════════════════════
   PRAVIDELNÉ KONTROLY (každých 15 min)
═══════════════════════════════════════════════════════ */
function _startNotificationChecks() {
  checkNotifications();
  if (_notifCheckInterval) clearInterval(_notifCheckInterval);
  _notifCheckInterval = setInterval(checkNotifications, 15 * 60 * 1000);
}

function checkNotifications() {
  if (_notifPermission !== 'granted') return;
  _checkTaskNotifications();
  _checkHabitNotifications();
  _updateNotifDot();
  syncRemindersToSW();
}

/* ─────────────────────────────────────────────────────
   KONTROLA ÚKOLŮ
───────────────────────────────────────────────────── */
function _checkTaskNotifications() {
  const D        = window.APP_DATA;
  const todayStr = today();

  D.tasks.filter(t => !t.done && t.due_date).forEach(task => {
    if (task.due_date === todayStr) {
      const key = `task_today_${task.id}`;
      if (!_shownNotifications.has(key)) {
        _shownNotifications.add(key);
        sendBrowserNotification('📋 Úkol splatný dnes', task.name, { tag: key, data: { section: 'tasks' } });
      }
    }
    if (task.due_date < todayStr) {
      const key = `task_overdue_${task.id}_${todayStr}`;
      if (!_shownNotifications.has(key)) {
        _shownNotifications.add(key);
        sendBrowserNotification('⚠ Prošlý termín úkolu', `${task.name} — termín byl ${formatDate(task.due_date)}`, { tag: key, data: { section: 'tasks' } });
      }
    }
  });

  // In-app toast (max 1× denně)
  const todayTasks   = D.tasks.filter(t => !t.done && t.due_date === todayStr);
  const overdueTasks = D.tasks.filter(t => !t.done && t.due_date && t.due_date < todayStr);
  const alertKey     = `alert_tasks_${todayStr}`;
  if (!_shownNotifications.has(alertKey)) {
    _shownNotifications.add(alertKey);
    if (overdueTasks.length > 0) {
      showToast(`⚠ ${overdueTasks.length} úkol${overdueTasks.length > 1 ? 'ů' : ''} po termínu!`, 'warning', 5000);
    } else if (todayTasks.length > 0) {
      showToast(`📋 Dnes máte ${todayTasks.length} úkol${todayTasks.length > 1 ? 'ů' : ''} ke splnění`, 'info', 4000);
    }
  }
}

/* ─────────────────────────────────────────────────────
   KONTROLA NÁVYKŮ (večerní připomínka)
───────────────────────────────────────────────────── */
function _checkHabitNotifications() {
  const D        = window.APP_DATA;
  const todayStr = today();
  const hour     = new Date().getHours();
  if (hour < 18) return;

  const unfinished = D.habits.filter(h => !D.habitLogs[`${h.id}_${todayStr}`]);
  if (unfinished.length === 0) return;

  const key = `habit_evening_${todayStr}`;
  if (!_shownNotifications.has(key)) {
    _shownNotifications.add(key);
    sendBrowserNotification(
      '◎ Nezapomeňte na návyky!',
      `${unfinished.length} návyk${unfinished.length > 1 ? 'ů' : ''} ještě nesplněno dnes.`,
      { tag: key, data: { section: 'habits' } }
    );
  }
}

/* ═══════════════════════════════════════════════════════
   INDIKÁTOR V TOPBARU
═══════════════════════════════════════════════════════ */
function _updateNotifDot() {
  const dot      = document.getElementById('notifDot');
  const todayStr = today();
  const D        = window.APP_DATA;
  const hasUrgent = D.tasks.some(t => !t.done && t.due_date && t.due_date <= todayStr);
  if (dot) dot.classList.toggle('hidden', !hasUrgent);
}
