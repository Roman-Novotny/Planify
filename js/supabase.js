/* ═══════════════════════════════════════════════════════
   Planify — js/supabase.js  v2
   Konfigurace, sdílené utility, gamifikace (XP systém)
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   ⚠️  NASTAVENÍ — vyplňte vaše Supabase credentials
───────────────────────────────────────────────────── */
const SUPABASE_URL  = 'https://jjmuolhqtfddjsrhwlnn.supabase.co';
const SUPABASE_ANON = 'sb_publishable_WuC8bsQceIeAMXhCKE7zYQ_Jk0NrGBu';

/* ─────────────────────────────────────────────────────
   INICIALIZACE SUPABASE
───────────────────────────────────────────────────── */
if (!window.supabase) {
  console.error('[Planify] Supabase CDN není načtena');
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    {
      auth: {
        autoRefreshToken: true,
        persistSession:   true,
        detectSessionInUrl: false,
      },
    }
  );
}

if (SUPABASE_URL.includes('XXXX') || SUPABASE_ANON.includes('XXXX')) {
  document.addEventListener('DOMContentLoaded', () => {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#F87171;color:#fff;padding:12px 20px;font-family:monospace;font-size:13px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.3)';
    banner.innerHTML = '⚠️ <strong>Planify:</strong> Nastavte SUPABASE_URL a SUPABASE_ANON v souboru <code>js/supabase.js</code>';
    document.body.prepend(banner);
  });
}

/* ═══════════════════════════════════════════════════════
   GLOBÁLNÍ STAV
═══════════════════════════════════════════════════════ */
window.APP_DATA = {
  tasks:           [],
  events:          [],
  habits:          [],
  habitLogs:       {},
  transactions:    [],
  finCategories:   [],
  budgets:         [],
  goals:           [],
  notes:           [],
  pomodoroSessions: 0,
  pomodoroHistory:  [],
};

window.DEFAULT_FIN_CATEGORIES = [
  { id: 'food',          name: 'Jídlo',       icon: '🍕', type: 'expense' },
  { id: 'transport',     name: 'Doprava',      icon: '🚗', type: 'expense' },
  { id: 'housing',       name: 'Bydlení',      icon: '🏠', type: 'expense' },
  { id: 'health',        name: 'Zdraví',       icon: '💊', type: 'expense' },
  { id: 'entertainment', name: 'Zábava',       icon: '🎬', type: 'expense' },
  { id: 'shopping',      name: 'Nákupy',       icon: '🛍️', type: 'expense' },
  { id: 'salary',        name: 'Plat',         icon: '💼', type: 'income'  },
  { id: 'freelance',     name: 'Freelance',    icon: '💻', type: 'income'  },
  { id: 'investment',    name: 'Investice',    icon: '📈', type: 'income'  },
  { id: 'other',         name: 'Ostatní',      icon: '📦', type: 'expense' },
];

/* ═══════════════════════════════════════════════════════
   UTILITY FUNKCE
═══════════════════════════════════════════════════════ */
function today() { return new Date().toISOString().slice(0, 10); }

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function isToday(dateStr)  { return dateStr === today(); }
function isPast(dateStr)   { return dateStr < today(); }

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('cs-CZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('cs-CZ', {
      day: 'numeric', month: 'short',
    });
  } catch { return dateStr; }
}

function formatCurrency(n) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency', currency: 'CZK', maximumFractionDigits: 0,
  }).format(n || 0);
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function getCatIcon(catId) {
  return [...window.DEFAULT_FIN_CATEGORIES, ...(window.APP_DATA.finCategories||[])]
    .find(c => c.id === catId)?.icon || '📦';
}

function getCatName(catId) {
  return [...window.DEFAULT_FIN_CATEGORIES, ...(window.APP_DATA.finCategories||[])]
    .find(c => c.id === catId)?.name || catId;
}

/* ── Markdown ── */
function renderMarkdown(raw) {
  if (!raw) return '';
  const lines = String(raw).split('\n');
  const out   = [];
  let inList   = false;
  for (const line of lines) {
    if (/^#{1,2}\s+/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push(`<h2>${inlineMarkdown(line.replace(/^#{1,2}\s+/,''))}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inlineMarkdown(line.replace(/^[-*]\s+/,''))}</li>`);
    } else if (/^---+$/.test(line.trim())) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr>');
    } else if (line.trim() === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<br>');
    } else {
      out.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

function inlineMarkdown(text) {
  let s = String(text ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  s = s.replace(/\*([^*\n]+?)\*/g,'<em>$1</em>');
  return s;
}

function stripMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/^#{1,3}\s+/gm,'').replace(/\*\*(.+?)\*\*/g,'$1')
    .replace(/\*([^*]+?)\*/g,'$1').replace(/^[-*]\s+/gm,'• ')
    .replace(/---+/g,'').replace(/\n{2,}/g,' ').trim();
}

/* ── Toast ── */
function showToast(msg, type = 'info', duration = 3200) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const icons = { info:'ℹ', success:'✓', error:'✕', warning:'⚠' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||'ℹ'}</span><span>${escHtml(msg)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Modaly ── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  setTimeout(() => {
    const first = el.querySelector('input:not([type=hidden]),select,textarea');
    if (first) first.focus();
  }, 80);
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

document.addEventListener('click', e => {
  const cb = e.target.closest('[data-close]');
  if (cb) { closeModal(cb.dataset.close); return; }
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const open = document.querySelector('.modal-overlay.open');
  if (open) { open.classList.remove('open'); return; }
  document.getElementById('searchOverlay')?.classList.remove('open');
});

/* ── Confirm ── */
let _confirmCallback = null;
function confirmDelete(message, callback) {
  const msgEl = document.getElementById('confirmMsg');
  if (msgEl) msgEl.textContent = message;
  _confirmCallback = callback;
  openModal('confirmModal');
}
document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
  if (typeof _confirmCallback === 'function') _confirmCallback();
  closeModal('confirmModal');
  _confirmCallback = null;
});

/* ── Pomodoro localStorage ── */
const POMO_STORAGE_KEY = 'planify_pomodoro';
function savePomodoroState() {
  try { localStorage.setItem(POMO_STORAGE_KEY, JSON.stringify({ sessions: window.APP_DATA.pomodoroSessions, history: window.APP_DATA.pomodoroHistory })); } catch {}
}
function loadPomodoroState() {
  try {
    const raw = localStorage.getItem(POMO_STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    window.APP_DATA.pomodoroSessions = p.sessions || 0;
    window.APP_DATA.pomodoroHistory  = p.history  || [];
  } catch {}
}

/* ═══════════════════════════════════════════════════════
   ██████  GAMIFIKACE — XP & LEVEL SYSTÉM  ██████
═══════════════════════════════════════════════════════ */

/* ── Konfigurace levelů ── */
const XP_LEVELS = [
  { level: 1,  xpNeeded: 0,    title: 'Nováček',       icon: '🌱' },
  { level: 2,  xpNeeded: 100,  title: 'Začátečník',    icon: '⚡' },
  { level: 3,  xpNeeded: 250,  title: 'Produktivní',   icon: '🔥' },
  { level: 4,  xpNeeded: 500,  title: 'Zaměřený',      icon: '🎯' },
  { level: 5,  xpNeeded: 850,  title: 'Odhodlaný',     icon: '💪' },
  { level: 6,  xpNeeded: 1300, title: 'Mistr plánů',   icon: '🧩' },
  { level: 7,  xpNeeded: 1900, title: 'Průkopník',     icon: '🚀' },
  { level: 8,  xpNeeded: 2700, title: 'Legenda',       icon: '⭐' },
  { level: 9,  xpNeeded: 3700, title: 'Šampion',       icon: '🏆' },
  { level: 10, xpNeeded: 5000, title: 'Grand Master',  icon: '👑' },
];

/* ── XP za akce ── */
const XP_REWARDS = {
  TASK_DONE:        20,
  TASK_DONE_ONTIME: 30,  // splněno před termínem
  HABIT_CHECK:      15,
  HABIT_STREAK_7:   75,  // bonus za 7denní streak
  HABIT_STREAK_14: 150,
  HABIT_STREAK_21: 250,
  HABIT_STREAK_30: 500,
  NOTE_CREATED:     10,
  GOAL_PROGRESS:    10,
  GOAL_DONE:       200,
  POMODORO_DONE:    25,
  TRANSACTION_ADD:   5,
  EVENT_CREATED:     5,
  LOGIN_DAILY:      10,
};

/* ── Achievementy ── */
const ACHIEVEMENTS = [
  { id: 'first_task',      icon: '✅', name: 'První krok',       desc: 'Splnili jste první úkol',          condition: s => s.tasksCompleted >= 1 },
  { id: 'task_10',         icon: '🔟', name: 'Desítka!',         desc: 'Splnili jste 10 úkolů',            condition: s => s.tasksCompleted >= 10 },
  { id: 'task_50',         icon: '🌟', name: 'Padesátka!',       desc: 'Splnili jste 50 úkolů',            condition: s => s.tasksCompleted >= 50 },
  { id: 'habit_7',         icon: '🔥', name: 'Týden v řadě',     desc: '7 dní streak v návyku',            condition: s => s.maxStreak >= 7 },
  { id: 'habit_30',        icon: '💎', name: 'Měsíční výzva',    desc: '30 dní streak v návyku',           condition: s => s.maxStreak >= 30 },
  { id: 'pomodoro_10',     icon: '🍅', name: 'Pomodoro hrdina',  desc: '10 Pomodoro sezení',               condition: s => s.pomodoroTotal >= 10 },
  { id: 'pomodoro_50',     icon: '⏱️', name: 'Časový mistr',     desc: '50 Pomodoro sezení',               condition: s => s.pomodoroTotal >= 50 },
  { id: 'note_10',         icon: '📝', name: 'Kronikář',         desc: '10 poznámek vytvořeno',            condition: s => s.notesCreated >= 10 },
  { id: 'goal_done',       icon: '🎯', name: 'Cíl splněn',       desc: 'Splnili jste první cíl',           condition: s => s.goalsCompleted >= 1 },
  { id: 'goal_5',          icon: '🏅', name: 'Pět splněných cílů', desc: '5 cílů dokončeno',              condition: s => s.goalsCompleted >= 5 },
  { id: 'level_5',         icon: '⚡', name: 'Půl cesty',        desc: 'Dosáhli jste úrovně 5',           condition: s => s.level >= 5 },
  { id: 'level_10',        icon: '👑', name: 'Grand Master',     desc: 'Maximální úroveň!',                condition: s => s.level >= 10 },
];

/* ── localStorage klíče ── */
const XP_KEY          = 'planify_xp';
const STATS_KEY       = 'planify_stats';
const ACHIEVEMENTS_KEY = 'planify_achievements';

/* ── Načtení/uložení XP ── */
function loadXP() {
  try {
    const raw = localStorage.getItem(XP_KEY);
    return raw ? JSON.parse(raw) : { xp: 0, level: 1, lastLoginDate: '' };
  } catch { return { xp: 0, level: 1, lastLoginDate: '' }; }
}

function saveXP(data) {
  try { localStorage.setItem(XP_KEY, JSON.stringify(data)); } catch {}
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? JSON.parse(raw) : {
      tasksCompleted: 0, maxStreak: 0, pomodoroTotal: 0,
      notesCreated: 0, goalsCompleted: 0, level: 1,
    };
  } catch { return { tasksCompleted:0, maxStreak:0, pomodoroTotal:0, notesCreated:0, goalsCompleted:0, level:1 }; }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function loadUnlockedAchievements() {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveUnlockedAchievements(set) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...set])); } catch {}
}

/* ── Výpočet levelu z XP ── */
function getLevelInfo(xp) {
  let current = XP_LEVELS[0];
  let next    = XP_LEVELS[1];

  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].xpNeeded) {
      current = XP_LEVELS[i];
      next    = XP_LEVELS[i + 1] || null;
      break;
    }
  }

  const xpInLevel   = xp - current.xpNeeded;
  const xpForNext   = next ? next.xpNeeded - current.xpNeeded : 1;
  const progress    = next ? Math.min(100, Math.round((xpInLevel / xpForNext) * 100)) : 100;

  return { current, next, xp, xpInLevel, xpForNext, progress };
}

/* ── Přidat XP ── */
function addXP(amount, reason = '') {
  const data  = loadXP();
  const stats = loadStats();
  const oldLevel = getLevelInfo(data.xp).current.level;

  data.xp += amount;
  saveXP(data);

  const newInfo  = getLevelInfo(data.xp);
  const newLevel = newInfo.current.level;

  // Update stats level
  stats.level = newLevel;
  saveStats(stats);

  // Animace XP gain
  _showXpPopup(`+${amount} XP`);

  // Level up?
  if (newLevel > oldLevel) {
    setTimeout(() => _showLevelUpModal(newInfo), 600);
  }

  // Aktualizovat XP bar v sidebarú
  updateXpBar();

  // Zkontrolovat achievementy
  checkAchievements();
}

/* ── Aktualizovat XP bar ── */
function updateXpBar() {
  const data = loadXP();
  const info = getLevelInfo(data.xp);

  const levelEl    = document.getElementById('xpLevelBadge');
  const pointsEl   = document.getElementById('xpPoints');
  const fillEl     = document.getElementById('xpBarFill');

  if (levelEl)  levelEl.textContent  = `${info.current.icon} Úr. ${info.current.level}`;
  if (pointsEl) pointsEl.textContent = info.next
    ? `${data.xp} / ${info.next.xpNeeded} XP`
    : `${data.xp} XP — MAX`;
  if (fillEl)   fillEl.style.width   = `${info.progress}%`;
}

/* ── Popup +XP ── */
function _showXpPopup(text) {
  const el = document.createElement('div');
  el.className = 'xp-gain-popup';
  el.textContent = text;

  // Umístit poblíž XP baru v sidebarú
  const xpBar = document.getElementById('xpLevelBadge');
  if (xpBar) {
    const rect = xpBar.getBoundingClientRect();
    el.style.left = `${rect.right + 10}px`;
    el.style.top  = `${rect.top}px`;
  } else {
    el.style.right  = '30px';
    el.style.bottom = '80px';
  }

  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1900);
}

/* ── Level up modal ── */
function _showLevelUpModal(levelInfo) {
  // Vytvořit overlay pokud neexistuje
  let overlay = document.getElementById('levelUpOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id        = 'levelUpOverlay';
    overlay.className = 'level-up-overlay';
    overlay.innerHTML = `
      <div class="level-up-card">
        <div class="level-up-icon" id="luIcon"></div>
        <div class="level-up-title" id="luTitle"></div>
        <div class="level-up-sub"  id="luSub"></div>
        <div class="level-up-reward" id="luReward"></div>
        <button class="btn btn-primary" id="luClose" style="width:100%;justify-content:center">
          🎉 Pokračovat
        </button>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#luClose').addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }

  document.getElementById('luIcon').textContent  = levelInfo.current.icon;
  document.getElementById('luTitle').textContent = `Úroveň ${levelInfo.current.level}!`;
  document.getElementById('luSub').textContent   = `Dosáhli jste titulu „${levelInfo.current.title}"`;
  document.getElementById('luReward').innerHTML  = levelInfo.next
    ? `Další úroveň: <strong>${levelInfo.next.title}</strong> za ${levelInfo.next.xpNeeded - loadXP().xp} XP`
    : `<strong>Gratulujeme — dosáhli jste maximální úrovně!</strong>`;

  overlay.classList.add('show');
}

/* ── Denní přihlášení bonus ── */
function checkDailyLoginBonus() {
  const data = loadXP();
  const todayStr = today();
  if (data.lastLoginDate !== todayStr) {
    data.lastLoginDate = todayStr;
    saveXP(data);
    addXP(XP_REWARDS.LOGIN_DAILY, 'Denní přihlášení');
    showToast(`🌅 Denní bonus: +${XP_REWARDS.LOGIN_DAILY} XP!`, 'success', 4000);
  }
}

/* ── Achievementy ── */
function checkAchievements() {
  const unlocked = loadUnlockedAchievements();
  const stats    = loadStats();
  let   newUnlocks = false;

  ACHIEVEMENTS.forEach(ach => {
    if (unlocked.has(ach.id)) return;
    if (ach.condition(stats)) {
      unlocked.add(ach.id);
      newUnlocks = true;
      _showAchievementToast(ach);
    }
  });

  if (newUnlocks) saveUnlockedAchievements(unlocked);
}

function _showAchievementToast(ach) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'achievement-toast';
  el.innerHTML = `
    <div class="achievement-icon">${ach.icon}</div>
    <div class="achievement-text">
      <div class="achievement-label">Úspěch odemčen!</div>
      <div class="achievement-name">${escHtml(ach.name)}</div>
    </div>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, 5000);
}

/* ── Stat update helpers (volat z modulů) ── */
function xpTaskCompleted(task) {
  const stats = loadStats();
  stats.tasksCompleted = (stats.tasksCompleted || 0) + 1;
  saveStats(stats);
  // Extra XP za splnění před termínem
  const amount = (task?.due_date && !isPast(task.due_date))
    ? XP_REWARDS.TASK_DONE_ONTIME
    : XP_REWARDS.TASK_DONE;
  addXP(amount, 'Úkol splněn');
}

function xpHabitChecked(streak) {
  const stats = loadStats();
  if (streak > (stats.maxStreak || 0)) stats.maxStreak = streak;
  saveStats(stats);

  addXP(XP_REWARDS.HABIT_CHECK, 'Návyk splněn');

  // Streak bonusy
  if      (streak === 30) addXP(XP_REWARDS.HABIT_STREAK_30, '30denní streak!');
  else if (streak === 21) addXP(XP_REWARDS.HABIT_STREAK_21, '21denní streak!');
  else if (streak === 14) addXP(XP_REWARDS.HABIT_STREAK_14, '14denní streak!');
  else if (streak === 7)  addXP(XP_REWARDS.HABIT_STREAK_7,  '7denní streak!');
}

function xpPomodoroCompleted() {
  const stats = loadStats();
  stats.pomodoroTotal = (stats.pomodoroTotal || 0) + 1;
  saveStats(stats);
  addXP(XP_REWARDS.POMODORO_DONE, 'Pomodoro dokončeno');
}

function xpNoteCreated() {
  const stats = loadStats();
  stats.notesCreated = (stats.notesCreated || 0) + 1;
  saveStats(stats);
  addXP(XP_REWARDS.NOTE_CREATED, 'Poznámka přidána');
}

function xpGoalCompleted() {
  const stats = loadStats();
  stats.goalsCompleted = (stats.goalsCompleted || 0) + 1;
  saveStats(stats);
  addXP(XP_REWARDS.GOAL_DONE, 'Cíl splněn!');
}

function xpTransactionAdded() {
  addXP(XP_REWARDS.TRANSACTION_ADD, 'Transakce přidána');
}
