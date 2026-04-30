/* ═══════════════════════════════════════════════════════
   Planify — js/xp-hooks.js  v2
   XP + Planify Mince (oddělená měna pro obchod)
   Synchronizace mezi zařízeními přes Supabase
   Anti-farming ochrana
   Oprava: velikost písma, téma sync

   Načíst jako POSLEDNÍ skript v app.html
═══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   KONFIGURACE
══════════════════════════════════════════════════════ */
const _XP_CFG = {
  TASK_DONE:        20,
  TASK_DONE_ONTIME: 35,
  HABIT_CHECK:      15,
  HABIT_STREAK_7:   75,
  HABIT_STREAK_14: 150,
  HABIT_STREAK_21: 250,
  HABIT_STREAK_30: 500,
  GOAL_50PCT:       25,
  GOAL_75PCT:       50,
  GOAL_DONE:       200,
  POMODORO_DONE:    25,
  NOTE_CREATED:     10,
  TRANSACTION:       5,
  LOGIN_DAILY:      10,
};

// Mince se vydělávají spolu s XP (menší množství)
const _COIN_CFG = {
  TASK_DONE:        5,
  TASK_DONE_ONTIME: 8,
  HABIT_CHECK:      3,
  HABIT_STREAK_7:  20,
  HABIT_STREAK_14: 40,
  HABIT_STREAK_21: 60,
  HABIT_STREAK_30:100,
  GOAL_50PCT:       8,
  GOAL_75PCT:      15,
  GOAL_DONE:       50,
  POMODORO_DONE:    6,
  NOTE_CREATED:     2,
  TRANSACTION:      1,
  LOGIN_DAILY:      3,
};

const _XP_LEVELS = [
  { level:1,  xp:0,    title:'Nováček',      icon:'🌱' },
  { level:2,  xp:100,  title:'Začátečník',   icon:'⚡' },
  { level:3,  xp:250,  title:'Produktivní',  icon:'🔥' },
  { level:4,  xp:500,  title:'Zaměřený',     icon:'🎯' },
  { level:5,  xp:850,  title:'Odhodlaný',    icon:'💪' },
  { level:6,  xp:1300, title:'Mistr plánů',  icon:'🧩' },
  { level:7,  xp:1900, title:'Průkopník',    icon:'🚀' },
  { level:8,  xp:2700, title:'Legenda',      icon:'⭐' },
  { level:9,  xp:3700, title:'Šampion',      icon:'🏆' },
  { level:10, xp:5000, title:'Grand Master', icon:'👑' },
];

const _DATA_KEY   = 'planify_player';   // { xp, coins, lastLogin }
const _EVENTS_KEY = 'planify_xp_ev';    // anti-farming log
const _SYNC_KEY   = 'planify_sync_ts';  // poslední sync timestamp

/* ══════════════════════════════════════════════════════
   PLAYER DATA (localStorage + Supabase sync)
══════════════════════════════════════════════════════ */
function _loadPlayer() {
  try {
    const raw = localStorage.getItem(_DATA_KEY);
    return raw ? JSON.parse(raw) : { xp:0, coins:0, lastLogin:'' };
  } catch { return { xp:0, coins:0, lastLogin:'' }; }
}

function _savePlayer(p) {
  try { localStorage.setItem(_DATA_KEY, JSON.stringify(p)); } catch {}
  _syncPlayerToSupabase(p);
}

async function _syncPlayerToSupabase(player) {
  const client = window.supabaseClient;
  const user   = typeof currentUser !== 'undefined' ? currentUser : null;
  if (!client || !user) return;
  try {
    await client.auth.updateUser({
      data: { planify_player: player }
    });
  } catch {}
}

async function _loadPlayerFromSupabase() {
  const client = window.supabaseClient;
  if (!client) return null;
  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return null;
    return user.user_metadata?.planify_player || null;
  } catch { return null; }
}

// Synchronizovat ze Supabase při startu (vzít větší XP)
async function _initPlayerSync() {
  const remote = await _loadPlayerFromSupabase();
  if (!remote) return;

  const local = _loadPlayer();

  // Vzít maximum (bezpečné — nikdy nesnížit XP/coins)
  const merged = {
    xp:        Math.max(local.xp    || 0, remote.xp    || 0),
    coins:     Math.max(local.coins || 0, remote.coins || 0),
    lastLogin: remote.lastLogin || local.lastLogin || '',
  };

  // Uložit lokálně (bez zpětného syncu aby nevznikla smyčka)
  try { localStorage.setItem(_DATA_KEY, JSON.stringify(merged)); } catch {}

  // Aktualizovat UI
  window.updateXpBar();
  _updateCoinBar();
}

/* ══════════════════════════════════════════════════════
   ANTI-FARMING
══════════════════════════════════════════════════════ */
function _loadEvents() {
  try { return JSON.parse(localStorage.getItem(_EVENTS_KEY) || '{}'); } catch { return {}; }
}
function _saveEvents(e) {
  // Vyčistit záznamy > 7 dní
  const week = 7 * 24 * 60 * 60 * 1000;
  const now  = Date.now();
  Object.keys(e).forEach(k => { if (now - e[k] > week) delete e[k]; });
  try { localStorage.setItem(_EVENTS_KEY, JSON.stringify(e)); } catch {}
}

function _canAward(key, cooldownMs = 0) {
  const ev   = _loadEvents();
  const last = ev[key];
  if (!last) return true;
  if (cooldownMs === 0) return false;
  return (Date.now() - last) > cooldownMs;
}

function _markAwarded(key) {
  const ev = _loadEvents();
  ev[key]  = Date.now();
  _saveEvents(ev);
}

/* ══════════════════════════════════════════════════════
   AWARD XP + COINS
══════════════════════════════════════════════════════ */
function _award(xpAmount, coinAmount, reason) {
  // 2× boost?
  const boostUntil = parseInt(localStorage.getItem('planify_double_xp_until') || '0');
  if (boostUntil > Date.now()) {
    xpAmount   = xpAmount * 2;
    coinAmount = coinAmount * 2;
    reason     = reason + ' (2×)';
  }

  const player   = _loadPlayer();
  const oldLevel = _getLevelInfo(player.xp).level;

  player.xp    += xpAmount;
  player.coins  = (player.coins || 0) + coinAmount;
  _savePlayer(player);

  const newLevel = _getLevelInfo(player.xp).level;

  // Animace
  _showPopup(`+${xpAmount} XP`, '#F59E0B');
  if (coinAmount > 0) {
    setTimeout(() => _showPopup(`+${coinAmount} 🪙`, '#60A5FA'), 400);
  }

  // Level up?
  if (newLevel > oldLevel) {
    const info = _getLevelInfoFull(player.xp);
    setTimeout(() => _showLevelUpModal(info), 600);
  }

  window.updateXpBar();
  _updateCoinBar();
}

/* ══════════════════════════════════════════════════════
   GLOBÁLNÍ FUNKCE (pro shop.js, settings.js, supabase.js)
══════════════════════════════════════════════════════ */

window.addXP = function(amount, reason) {
  _award(amount, Math.round(amount * 0.3), reason || '');
};

window.spendCoins = function(amount) {
  const p = _loadPlayer();
  if ((p.coins || 0) < amount) return false;
  p.coins -= amount;
  _savePlayer(p);
  _updateCoinBar();
  return true;
};

window.getCoins = function() {
  return _loadPlayer().coins || 0;
};

window.getXP = function() {
  return _loadPlayer().xp || 0;
};

window.loadXP = function() {
  const p = _loadPlayer();
  return { xp: p.xp || 0, lastLoginDate: p.lastLogin || '' };
};

window.saveXP = function(data) {
  const p     = _loadPlayer();
  p.xp        = data.xp || 0;
  p.lastLogin = data.lastLoginDate || p.lastLogin;
  _savePlayer(p);
};

window.getLevelInfo = function(xp) {
  return _getLevelInfoFull(xp);
};

/* ══════════════════════════════════════════════════════
   LEVEL VÝPOČET
══════════════════════════════════════════════════════ */
function _getLevelInfo(xp) {
  let level = 1;
  for (let i = _XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= _XP_LEVELS[i].xp) { level = _XP_LEVELS[i].level; break; }
  }
  return level;
}

function _getLevelInfoFull(xp) {
  let cur  = _XP_LEVELS[0];
  let next = _XP_LEVELS[1] || null;
  for (let i = _XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= _XP_LEVELS[i].xp) {
      cur  = _XP_LEVELS[i];
      next = _XP_LEVELS[i + 1] || null;
      break;
    }
  }
  const inLevel  = xp - cur.xp;
  const forNext  = next ? next.xp - cur.xp : 1;
  const progress = next ? Math.min(100, Math.round((inLevel / forNext) * 100)) : 100;
  return { cur, next, xp, level: cur.level, progress };
}

/* ══════════════════════════════════════════════════════
   XP BAR + COIN BAR UPDATE
══════════════════════════════════════════════════════ */
window.updateXpBar = function() {
  const player = _loadPlayer();
  const info   = _getLevelInfoFull(player.xp || 0);

  const levelEl  = document.getElementById('xpLevelBadge');
  const pointsEl = document.getElementById('xpPoints');
  const fillEl   = document.getElementById('xpBarFill');

  if (levelEl)  levelEl.textContent  = `${info.cur.icon} Úr. ${info.cur.level}`;
  if (pointsEl) pointsEl.textContent = info.next
    ? `${player.xp} / ${info.next.xp} XP`
    : `${player.xp} XP MAX`;
  if (fillEl)   fillEl.style.width   = `${info.progress}%`;
};

function _updateCoinBar() {
  const player  = _loadPlayer();
  const coinEl  = document.getElementById('coinBalance');
  if (coinEl) coinEl.textContent = `🪙 ${player.coins || 0}`;
}

// Vložit coin display do sidebaru pokud neexistuje
function _ensureCoinBar() {
  if (document.getElementById('coinBalance')) return;
  const xpContainer = document.getElementById('xpBarContainer');
  if (!xpContainer) return;

  const coinDiv = document.createElement('div');
  coinDiv.style.cssText = [
    'display:flex;align-items:center;justify-content:space-between',
    'background:var(--bg-elevated);border:1px solid var(--border)',
    'border-radius:var(--radius-sm);padding:7px 11px;margin-bottom:2px',
    'font-size:12px;font-weight:600',
  ].join(';');
  coinDiv.innerHTML = `
    <span style="color:var(--text-secondary);font-size:11px">Planify Mince</span>
    <span id="coinBalance" style="color:#60A5FA;font-weight:700">🪙 0</span>`;
  xpContainer.parentNode?.insertBefore(coinDiv, xpContainer);
  _updateCoinBar();
}

/* ══════════════════════════════════════════════════════
   POPUP ANIMACE
══════════════════════════════════════════════════════ */
let _popupOffset = 0;

function _showPopup(text, color) {
  if (!document.getElementById('_xpPopupStyle')) {
    const s = document.createElement('style');
    s.id = '_xpPopupStyle';
    s.textContent = '@keyframes _xpFloat{0%{opacity:0;transform:translateY(0) scale(.7)}20%{opacity:1;transform:translateY(-14px) scale(1.1)}80%{opacity:1;transform:translateY(-48px)}100%{opacity:0;transform:translateY(-68px) scale(.9)}}';
    document.head.appendChild(s);
  }

  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed;z-index:9999;pointer-events:none',
    `font-family:'Syne',sans-serif;font-size:15px;font-weight:800`,
    `color:${color || '#F59E0B'}`,
    `text-shadow:0 0 10px ${color || '#F59E0B'}88`,
    `right:${80 + _popupOffset * 60}px;bottom:70px`,
    'animation:_xpFloat 1.8s ease forwards',
  ].join(';');
  el.textContent = text;
  document.body.appendChild(el);
  _popupOffset = (_popupOffset + 1) % 3;
  setTimeout(() => { el.remove(); _popupOffset = 0; }, 1900);
}

/* ══════════════════════════════════════════════════════
   LEVEL-UP MODAL
══════════════════════════════════════════════════════ */
function _showLevelUpModal(info) {
  let ov = document.getElementById('_xpLvlOv');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = '_xpLvlOv';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9990;padding:20px';
    if (!document.getElementById('_xpLvlStyle')) {
      const s = document.createElement('style');
      s.id = '_xpLvlStyle';
      s.textContent = '@keyframes _lvlIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(ov);
  }
  ov.innerHTML = `
    <div style="background:var(--bg-surface);border:2px solid #F59E0B;border-radius:24px;padding:36px 44px;text-align:center;box-shadow:0 0 60px rgba(245,158,11,.3);max-width:360px;width:100%;animation:_lvlIn .45s cubic-bezier(.34,1.4,.64,1)">
      <div style="font-size:52px;margin-bottom:10px">${info.cur.icon}</div>
      <div style="font-family:Syne,sans-serif;font-size:24px;font-weight:800;color:#F59E0B;margin-bottom:6px">Úroveň ${info.cur.level}!</div>
      <div style="font-size:14px;color:var(--text-secondary);margin-bottom:16px">Dosáhli jste titulu „${info.cur.title}"</div>
      <div style="background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:var(--text-primary)">
        ${info.next ? `Příště: <strong>${info.next.icon} ${info.next.title}</strong> za ${info.next.xp - info.xp} XP` : '<strong>🏆 Maximální úroveň!</strong>'}
      </div>
      <button onclick="document.getElementById('_xpLvlOv').style.display='none'"
              style="width:100%;padding:11px;background:#F59E0B;color:#18192A;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">
        🎉 Super!
      </button>
    </div>`;
  ov.style.display = 'flex';
}

/* ══════════════════════════════════════════════════════
   DAILY LOGIN BONUS
══════════════════════════════════════════════════════ */
function _checkDailyLogin() {
  const p       = _loadPlayer();
  const today   = new Date().toISOString().slice(0, 10);
  if (p.lastLogin === today) return;
  p.lastLogin = today;
  _savePlayer(p);
  setTimeout(() => {
    _award(_XP_CFG.LOGIN_DAILY, _COIN_CFG.LOGIN_DAILY, 'Denní přihlášení');
    showToast(`🌅 Denní bonus: +${_XP_CFG.LOGIN_DAILY} XP +${_COIN_CFG.LOGIN_DAILY} 🪙`, 'success', 4000);
  }, 2500);
}

/* ══════════════════════════════════════════════════════
   OPRAVA: TÉMA SYNCHRONIZACE
   Sidebar tlačítko "Tmavý/Světlý režim" ← vždy správné
══════════════════════════════════════════════════════ */
function _fixThemeButton() {
  const theme   = document.documentElement.dataset.theme || localStorage.getItem('planify_theme') || 'dark';
  const labelEl = document.getElementById('themeLabel');
  const iconEl  = document.getElementById('themeIcon');
  // Label = co se stane po kliknutí (přepnout na opačné)
  if (labelEl) labelEl.textContent = theme === 'dark' ? 'Světlý režim' : 'Tmavý režim';
  if (iconEl)  iconEl.textContent  = theme === 'dark' ? '☽' : '☀';
}

// Patch applyTheme aby vždy synchronizoval tlačítko
function _patchApplyTheme() {
  if (typeof applyTheme !== 'function') return;
  const _orig = window.applyTheme || applyTheme;
  window.applyTheme = function(theme) {
    _orig(theme);
    // Vždy sync po aplikaci tématu
    setTimeout(_fixThemeButton, 50);
  };
  // Opravit hned teď
  _fixThemeButton();
}

/* ══════════════════════════════════════════════════════
   OPRAVA: VELIKOST PÍSMA
   nastavení fontSize v settings.js nefunguje bez CSS var
══════════════════════════════════════════════════════ */
function _fixFontSize() {
  // Přečíst z uložených nastavení
  let fontSize = 'normal';
  try {
    const s = JSON.parse(localStorage.getItem('planify_settings') || '{}');
    fontSize = s.fontSize || 'normal';
  } catch {}

  const map = { small: '13px', normal: '15px', large: '17px' };
  const size = map[fontSize] || '15px';

  // Aplikovat na html element
  document.documentElement.style.fontSize = size;

  // Aplikovat jako CSS proměnnou (pro kompletní support)
  document.documentElement.style.setProperty('--base-font', size);
}

/* ══════════════════════════════════════════════════════
   OPRAVA: GUEST MODE
══════════════════════════════════════════════════════ */
function _fixGuestMode() {
  const isGuest = localStorage.getItem('planify_guest_mode') === '1';
  if (!isGuest) return;

  // Načíst guest data pokud existují
  const D = window.APP_DATA;
  if (!D) return;

  const keys = { notes:'planify_guest_notes', tasks:'planify_guest_tasks', habits:'planify_guest_habits', goals:'planify_guest_goals' };
  Object.entries(keys).forEach(([key, storageKey]) => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw && D[key] && D[key].length === 0) {
        D[key] = JSON.parse(raw);
      }
    } catch {}
  });
}

/* ══════════════════════════════════════════════════════
   PATCHING FUNKCÍ
══════════════════════════════════════════════════════ */

function _patchTasks() {
  if (typeof toggleTask !== 'function') return;
  const _orig = window.toggleTask || toggleTask;
  window.toggleTask = async function(id) {
    const before = window.APP_DATA?.tasks?.find(t => t.id === id);
    const wasDone = before?.done;
    await _orig(id);
    const after  = window.APP_DATA?.tasks?.find(t => t.id === id);
    if (!wasDone && after?.done) {
      const k = `task_done_${id}`;
      if (_canAward(k, 0)) {
        _markAwarded(k);
        const today   = new Date().toISOString().slice(0, 10);
        const onTime  = after.due_date && after.due_date >= today;
        _award(
          onTime ? _XP_CFG.TASK_DONE_ONTIME   : _XP_CFG.TASK_DONE,
          onTime ? _COIN_CFG.TASK_DONE_ONTIME  : _COIN_CFG.TASK_DONE,
          onTime ? 'Úkol splněn včas' : 'Úkol splněn'
        );
      }
    }
  };
}

function _patchHabits() {
  if (typeof toggleHabit !== 'function') return;
  const _orig = window.toggleHabit || toggleHabit;
  window.toggleHabit = async function(id) {
    const today      = new Date().toISOString().slice(0, 10);
    const logKey     = `${id}_${today}`;
    const wasChecked = !!window.APP_DATA?.habitLogs?.[logKey];
    await _orig(id);
    const isChecked  = !!window.APP_DATA?.habitLogs?.[logKey];
    if (!wasChecked && isChecked) {
      const k = `habit_${id}_${today}`;
      if (_canAward(k, 0)) {
        _markAwarded(k);
        _award(_XP_CFG.HABIT_CHECK, _COIN_CFG.HABIT_CHECK, 'Návyk splněn');
        const streak = window.APP_DATA?.habits?.find(h => h.id === id)?.streak || 1;
        const milestones = [[7,_XP_CFG.HABIT_STREAK_7,_COIN_CFG.HABIT_STREAK_7],[14,_XP_CFG.HABIT_STREAK_14,_COIN_CFG.HABIT_STREAK_14],[21,_XP_CFG.HABIT_STREAK_21,_COIN_CFG.HABIT_STREAK_21],[30,_XP_CFG.HABIT_STREAK_30,_COIN_CFG.HABIT_STREAK_30]];
        milestones.forEach(([days, xp, coins]) => {
          if (streak === days) {
            const mk = `streak_${days}_${id}`;
            if (_canAward(mk, 0)) { _markAwarded(mk); _award(xp, coins, `${days}denní streak!`); }
          }
        });
      }
    }
  };
}

function _patchGoals() {
  if (typeof updateGoalProgress !== 'function') return;
  const _orig = window.updateGoalProgress || updateGoalProgress;
  window.updateGoalProgress = async function(id, newValue) {
    const goal   = window.APP_DATA?.goals?.find(g => g.id === id);
    const oldPct = goal ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
    await _orig(id, newValue);
    const goalAfter = window.APP_DATA?.goals?.find(g => g.id === id);
    if (!goalAfter) return;
    const newPct = Math.round((goalAfter.current_value / goalAfter.target_value) * 100);
    const milestones = [[50,_XP_CFG.GOAL_50PCT,_COIN_CFG.GOAL_50PCT,'50% cíle'],[75,_XP_CFG.GOAL_75PCT,_COIN_CFG.GOAL_75PCT,'75% cíle'],[100,_XP_CFG.GOAL_DONE,_COIN_CFG.GOAL_DONE,'Cíl splněn!']];
    milestones.forEach(([pct, xp, coins, reason]) => {
      if (newPct >= pct && oldPct < pct) {
        const k = `goal_${pct}_${id}`;
        if (_canAward(k, 0)) { _markAwarded(k); _award(xp, coins, reason); }
      }
    });
  };
}

function _patchPomodoro() {
  const _orig = window._timerComplete;
  if (typeof _orig !== 'function') return;
  window._timerComplete = function() {
    const mode = window.pomoState?.mode || 'work';
    _orig();
    if (mode === 'work') {
      const COOL = 20 * 60 * 1000;
      if (_canAward('pomodoro', COOL)) {
        _markAwarded('pomodoro');
        _award(_XP_CFG.POMODORO_DONE, _COIN_CFG.POMODORO_DONE, 'Pomodoro dokončeno');
      }
    }
  };
}

function _patchNotes() {
  if (typeof saveNote !== 'function') return;
  const _orig = window.saveNote || saveNote;
  window.saveNote = async function() {
    const isNew = !window.noteEditId;
    await _orig();
    if (isNew) {
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i < 5; i++) {
        const k = `note_${today}_${i}`;
        if (_canAward(k, 0)) { _markAwarded(k); _award(_XP_CFG.NOTE_CREATED, _COIN_CFG.NOTE_CREATED, 'Poznámka přidána'); break; }
      }
    }
  };
}

function _patchFinance() {
  if (typeof saveTransaction !== 'function') return;
  const _orig = window.saveTransaction || saveTransaction;
  window.saveTransaction = async function() {
    const isNew = !window.txEditId;
    await _orig();
    if (isNew) {
      const today = new Date().toISOString().slice(0, 10);
      for (let i = 0; i < 10; i++) {
        const k = `tx_${today}_${i}`;
        if (_canAward(k, 0)) { _markAwarded(k); _award(_XP_CFG.TRANSACTION, _COIN_CFG.TRANSACTION, 'Transakce'); break; }
      }
    }
  };
}

/* ══════════════════════════════════════════════════════
   SHOP COIN INTEGRATION
   Přepsat buyItem aby používal mince místo XP
══════════════════════════════════════════════════════ */
function _patchShopBuyItem() {
  if (typeof buyItem !== 'function') return;

  window.buyItem = function(id) {
    if (typeof SHOP_ITEMS === 'undefined') return;
    const item = SHOP_ITEMS.find(i => i.id === id);
    if (!item) return;

    const coins = window.getCoins();

    if (ownsItem && ownsItem(id) && !item.consumable) {
      showToast('Tento předmět již vlastníte.', 'info'); return;
    }

    if (coins < item.price) {
      showToast(`Nemáte dost mincí 🪙. Potřebujete ${item.price} 🪙, máte ${coins} 🪙.`, 'warning', 4000);
      return;
    }

    if (!window.spendCoins(item.price)) return;

    // Přidat do vlastněných
    if (!item.consumable && typeof setOwnedItems === 'function' && typeof getOwnedItems === 'function') {
      const owned = getOwnedItems();
      owned.add(id);
      setOwnedItems(owned);
    }

    showToast(`🎉 Zakoupeno: ${item.icon} ${item.name}!`, 'success', 4000);

    if (typeof _autoActivate === 'function') _autoActivate(item);
    if (typeof renderShop    === 'function') renderShop();
  };
}

/* ══════════════════════════════════════════════════════
   INICIALIZACE
══════════════════════════════════════════════════════ */
function _initAll() {
  // Opravy
  _patchApplyTheme();
  _fixThemeButton();
  _fixFontSize();
  _fixGuestMode();

  // XP patche
  _patchTasks();
  _patchHabits();
  _patchGoals();
  _patchPomodoro();
  _patchNotes();
  _patchFinance();
  _patchShopBuyItem();

  // UI
  window.updateXpBar();
  _ensureCoinBar();

  // Sync ze Supabase
  _initPlayerSync();

  // Denní bonus
  _checkDailyLogin();

  console.info('[Planify XP v2] ✓ XP + Mince systém načten');
}

// Spustit
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(_initAll, 800));
} else {
  setTimeout(_initAll, document.readyState === 'complete' ? 800 : 1200);
}
