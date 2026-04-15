/* ═══════════════════════════════════════════════════════
   Planify — js/notifications.js
   Browser notifikace, připomínky, upozornění
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   STAV MODULU
───────────────────────────────────────────────────── */
let _notifPermission    = 'default';  // 'default' | 'granted' | 'denied'
let _notifCheckInterval = null;       // setInterval handle pro pravidelné kontroly
let _shownNotifications = new Set();  // Zabránit duplicitním notifikacím

/* ═══════════════════════════════════════════════════════
   INICIALIZACE
═══════════════════════════════════════════════════════ */
function initNotifications() {
  // Zjistit aktuální stav oprávnění
  if (!('Notification' in window)) {
    console.info('[Planify] Notifikace nejsou podporovány v tomto prohlížeči.');
    return;
  }

  _notifPermission = Notification.permission;

  // Pokud povoleno → spustit pravidelné kontroly
  if (_notifPermission === 'granted') {
    _startNotificationChecks();
  }

  // Indikátor v topbaru
  _updateNotifDot();
}

/* ═══════════════════════════════════════════════════════
   ŽÁDOST O POVOLENÍ
═══════════════════════════════════════════════════════ */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    showToast('Prohlížeč nepodporuje notifikace.', 'warning');
    return;
  }

  if (Notification.permission === 'granted') {
    showToast('Notifikace jsou již povoleny.', 'info');
    return;
  }

  if (Notification.permission === 'denied') {
    showToast('Notifikace jsou zakázány v nastavení prohlížeče.', 'warning', 4000);
    return;
  }

  try {
    const result = await Notification.requestPermission();
    _notifPermission = result;

    if (result === 'granted') {
      showToast('Notifikace povoleny! 🔔', 'success');
      _startNotificationChecks();
      // Testovací notifikace
      setTimeout(() => {
        sendBrowserNotification('Planify 👋', 'Notifikace jsou aktivní a budou vás upozorňovat na důležité úkoly.');
      }, 500);
    } else {
      showToast('Notifikace nebyly povoleny.', 'info');
    }
  } catch (err) {
    console.error('[Planify] Chyba při žádosti o notifikace:', err);
  }
}

/* ═══════════════════════════════════════════════════════
   ODESLÁNÍ BROWSER NOTIFIKACE
═══════════════════════════════════════════════════════ */
/**
 * Odešle browser notifikaci
 * @param {string} title   Nadpis
 * @param {string} body    Text
 * @param {Object} options Rozšířené možnosti
 */
function sendBrowserNotification(title, body, options = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      body,
      icon: 'img/logo-text-tmav.png',
      badge: 'img/logo-text-tmav.png',
      tag: options.tag || `planify-${Date.now()}`,
      silent: false,
      ...options,
    });

    // Kliknutí na notifikaci = focus na aplikaci
    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    // Auto-zavřít po 8 sekundách
    setTimeout(() => notif.close(), 8000);

  } catch (err) {
    console.warn('[Planify] Notifikace selhala:', err);
  }
}

/* ═══════════════════════════════════════════════════════
   PRAVIDELNÉ KONTROLY
═══════════════════════════════════════════════════════ */
function _startNotificationChecks() {
  // Ihned zkontrolovat
  checkNotifications();

  // Pak každých 15 minut
  if (_notifCheckInterval) clearInterval(_notifCheckInterval);
  _notifCheckInterval = setInterval(checkNotifications, 15 * 60 * 1000);
}

/**
 * Zkontroluje všechna data a odešle relevantní upozornění
 * Voláno po načtení dat a každých 15 minut
 */
function checkNotifications() {
  if (_notifPermission !== 'granted') return;

  _checkTaskNotifications();
  _checkHabitNotifications();
  _updateNotifDot();
}

/* ─────────────────────────────────────────────────────
   KONTROLA ÚKOLŮ
───────────────────────────────────────────────────── */
function _checkTaskNotifications() {
  const D       = window.APP_DATA;
  const todayStr = today();

  D.tasks
    .filter(t => !t.done && t.due_date)
    .forEach(task => {
      // Dnes splatné
      if (task.due_date === todayStr) {
        const key = `task_today_${task.id}`;
        if (!_shownNotifications.has(key)) {
          _shownNotifications.add(key);
          sendBrowserNotification(
            '📋 Úkol splatný dnes',
            task.name,
            { tag: key }
          );
        }
      }

      // Prošlý termín (dříve než dnes)
      if (task.due_date < todayStr) {
        const key = `task_overdue_${task.id}_${todayStr}`;
        if (!_shownNotifications.has(key)) {
          _shownNotifications.add(key);
          sendBrowserNotification(
            '⚠ Prošlý termín úkolu',
            `${task.name} — termín byl ${formatDate(task.due_date)}`,
            { tag: key }
          );
        }
      }
    });

  // In-app upozornění — oznámit i v UI
  const todayTasks   = D.tasks.filter(t => !t.done && t.due_date === todayStr);
  const overdueTasks = D.tasks.filter(t => !t.done && t.due_date && t.due_date < todayStr);

  // Toast při otevření aplikace (max 1× denně)
  const alertKey = `alert_tasks_${todayStr}`;
  if (!_shownNotifications.has(alertKey)) {
    _shownNotifications.add(alertKey);

    if (overdueTasks.length > 0) {
      showToast(
        `⚠ ${overdueTasks.length} úkol${overdueTasks.length > 1 ? 'ů' : ''} po termínu!`,
        'warning',
        5000
      );
    } else if (todayTasks.length > 0) {
      showToast(
        `📋 Dnes máte ${todayTasks.length} úkol${todayTasks.length > 1 ? 'ů' : ''} ke splnění`,
        'info',
        4000
      );
    }
  }
}

/* ─────────────────────────────────────────────────────
   KONTROLA NÁVYKŮ
───────────────────────────────────────────────────── */
function _checkHabitNotifications() {
  const D        = window.APP_DATA;
  const todayStr = today();

  // Zjistit kolik návyků ještě není splněno
  const unfinished = D.habits.filter(h => !D.habitLogs[`${h.id}_${todayStr}`]);

  if (unfinished.length === 0) return;

  // Notifikovat večer (po 18:00)
  const hour = new Date().getHours();
  if (hour < 18) return;

  const key = `habit_evening_${todayStr}`;
  if (!_shownNotifications.has(key)) {
    _shownNotifications.add(key);

    sendBrowserNotification(
      '◎ Nezapomeňte na návyky!',
      `${unfinished.length} návyk${unfinished.length > 1 ? 'ů' : ''} ještě nesplněno dnes.`,
      { tag: key }
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

  // Zobrazit tečku pokud jsou prošlé nebo dnešní úkoly
  const hasUrgent =
    D.tasks.some(t => !t.done && t.due_date && t.due_date <= todayStr);

  if (dot) dot.classList.toggle('hidden', !hasUrgent);
}
