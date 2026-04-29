/* ═══════════════════════════════════════════════════════
   Planify — js/settings.js
   Nastavení aplikace — téma, barvy, notifikace, data, účet
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   NASTAVENÍ — klíče localStorage
───────────────────────────────────────────────────── */
const SETTINGS_KEY = 'planify_settings';

const DEFAULT_SETTINGS = {
  theme:             'dark',     // 'dark' | 'light'
  accentColor:       '#6366F1',  // hex barva
  fontSize:          'normal',   // 'small' | 'normal' | 'large'
  notifEnabled:      true,
  notifTasksToday:   true,
  notifHabitsEvening: true,
  animationsEnabled: true,
  compactMode:       false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

/* ─────────────────────────────────────────────────────
   APLIKOVAT NASTAVENÍ
───────────────────────────────────────────────────── */
function applySettings(settings) {
  // Font size
  const fontMap = { small: '13px', normal: '15px', large: '17px' };
  document.documentElement.style.setProperty(
    '--base-font-size',
    fontMap[settings.fontSize] || '15px'
  );
  document.documentElement.style.fontSize = fontMap[settings.fontSize] || '15px';

  // Animace
  if (!settings.animationsEnabled) {
    document.documentElement.classList.add('no-animations');
  } else {
    document.documentElement.classList.remove('no-animations');
  }

  // Compact mode
  document.documentElement.classList.toggle('compact-mode', !!settings.compactMode);
}

/* ─────────────────────────────────────────────────────
   RENDER SEKCE NASTAVENÍ
───────────────────────────────────────────────────── */
function renderSettings() {
  const section = document.getElementById('section-settings');
  if (!section) return;

  const settings = loadSettings();

  // Statistiky
  const D             = window.APP_DATA;
  const tasksTotal    = D.tasks.length;
  const tasksDone     = D.tasks.filter(t => t.done).length;
  const habitsTotal   = D.habits.length;
  const notesTotal    = D.notes.length;
  const goalsTotal    = D.goals.length;
  const txTotal       = D.transactions.length;

  let xpTotal = 0;
  let level   = 1;
  if (typeof loadXP === 'function') {
    const xpData = loadXP();
    xpTotal = xpData.xp || 0;
    if (typeof getLevelInfo === 'function') {
      level = getLevelInfo(xpTotal).current.level;
    }
  } else {
    xpTotal = parseInt(localStorage.getItem('planify_xp_simple') || '0');
  }

  const isGuest = typeof isGuestMode === 'function' && isGuestMode();

  const accentColors = [
    { hex: '#6366F1', name: 'Indigo (výchozí)' },
    { hex: '#8B5CF6', name: 'Fialová' },
    { hex: '#EC4899', name: 'Růžová' },
    { hex: '#F97316', name: 'Oranžová' },
    { hex: '#10B981', name: 'Zelená' },
    { hex: '#06B6D4', name: 'Tyrkysová' },
    { hex: '#F59E0B', name: 'Zlatá' },
    { hex: '#EF4444', name: 'Červená' },
  ];

  section.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Nastavení</h2>
        <div class="section-sub">Přizpůsobte aplikaci podle svých potřeb</div>
      </div>
    </div>

    <div class="settings-grid">

      <!-- Statistiky profilu -->
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon">👤</div>
          <div class="settings-card-title">Váš profil</div>
        </div>
        <div class="settings-rows">
          <div class="settings-row" style="padding-bottom:18px;flex-direction:column;align-items:flex-start;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="user-avatar-img" id="settingsAvatar" style="width:48px;height:48px;font-size:26px;border-radius:50%;background:var(--accent-dim);border:2px solid var(--accent);display:grid;place-items:center"></div>
              <div>
                <div style="font-size:14px;font-weight:600;color:var(--text-primary)" id="settingsEmail">
                  ${isGuest ? 'Režim hosta' : (typeof currentUser !== 'undefined' && currentUser?.email ? escHtml(currentUser.email) : '—')}
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
                  ${isGuest ? 'Data se neukládají na server' : 'Přihlášený uživatel'}
                </div>
              </div>
            </div>

            <div class="stats-overview" style="width:100%">
              <div class="stat-mini">
                <div class="stat-mini-val">${tasksDone}</div>
                <div class="stat-mini-label">Úkolů splněno</div>
              </div>
              <div class="stat-mini">
                <div class="stat-mini-val">${habitsTotal}</div>
                <div class="stat-mini-label">Návyků</div>
              </div>
              <div class="stat-mini">
                <div class="stat-mini-val" style="color:#F59E0B">${xpTotal}</div>
                <div class="stat-mini-label">XP celkem</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Vzhled -->
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon">🎨</div>
          <div class="settings-card-title">Vzhled</div>
        </div>
        <div class="settings-rows">

          <!-- Téma -->
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Barevný režim</div>
              <div class="settings-row-desc">Tmavý nebo světlý vzhled aplikace</div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="font-size-btn ${settings.theme === 'dark' ? 'active' : ''}"
                      data-set-theme="dark" style="font-size:12px">🌙 Tmavý</button>
              <button class="font-size-btn ${settings.theme === 'light' ? 'active' : ''}"
                      data-set-theme="light" style="font-size:12px">☀️ Světlý</button>
            </div>
          </div>

          <!-- Akcent barva -->
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Barva akcentu</div>
              <div class="settings-row-desc">Hlavní barevné zvýraznění aplikace</div>
            </div>
            <div class="accent-picker">
              ${accentColors.map(c => `
                <div class="accent-dot ${settings.accentColor === c.hex ? 'active' : ''}"
                     style="background:${c.hex}"
                     data-accent="${c.hex}"
                     title="${c.name}"></div>`).join('')}
            </div>
          </div>

          <!-- Velikost písma -->
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Velikost textu</div>
              <div class="settings-row-desc">Přizpůsobte čitelnost</div>
            </div>
            <div class="font-size-btns">
              <button class="font-size-btn ${settings.fontSize === 'small'  ? 'active' : ''}"
                      data-set-fontsize="small"  style="font-size:11px">A</button>
              <button class="font-size-btn ${settings.fontSize === 'normal' ? 'active' : ''}"
                      data-set-fontsize="normal" style="font-size:13px">A</button>
              <button class="font-size-btn ${settings.fontSize === 'large'  ? 'active' : ''}"
                      data-set-fontsize="large"  style="font-size:15px">A</button>
            </div>
          </div>

          <!-- Animace -->
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Animace</div>
              <div class="settings-row-desc">Přechody a efekty při interakci</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="settingsAnimations"
                     ${settings.animationsEnabled ? 'checked' : ''}/>
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
            </label>
          </div>

          <!-- Kompaktní režim -->
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Kompaktní režim</div>
              <div class="settings-row-desc">Menší mezery pro více obsahu na obrazovce</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="settingsCompact"
                     ${settings.compactMode ? 'checked' : ''}/>
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
            </label>
          </div>

        </div>
      </div>

      <!-- Notifikace -->
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon">🔔</div>
          <div class="settings-card-title">Notifikace</div>
        </div>
        <div class="settings-rows">

          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Stav notifikací</div>
              <div class="settings-row-desc" id="notifStatusDesc">
                ${Notification?.permission === 'granted'
                  ? '✓ Povoleny — upozorníme vás i na pozadí'
                  : Notification?.permission === 'denied'
                    ? '✕ Zakázány v prohlížeči — povolte v nastavení prohlížeče'
                    : 'Notifikace zatím nebyly povoleny'}
              </div>
            </div>
            ${Notification?.permission !== 'granted' && Notification?.permission !== 'denied' ? `
              <button class="btn btn-primary" id="enableNotifBtn" style="font-size:12px;padding:7px 14px">
                🔔 Povolit
              </button>` : ''}
            ${Notification?.permission === 'granted' ? `
              <span style="font-size:20px">✅</span>` : ''}
          </div>

          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Upozornění na dnešní úkoly</div>
              <div class="settings-row-desc">Při přihlášení zobrazit počet úkolů</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="settingsNotifTasks"
                     ${settings.notifTasksToday ? 'checked' : ''}/>
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
            </label>
          </div>

          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Večerní připomínka návyků</div>
              <div class="settings-row-desc">Po 18:00 připomenout nesplněné návyky</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="settingsNotifHabits"
                     ${settings.notifHabitsEvening ? 'checked' : ''}/>
              <div class="toggle-track"><div class="toggle-thumb"></div></div>
            </label>
          </div>

        </div>
      </div>

      <!-- Data -->
      <div class="settings-card">
        <div class="settings-card-header">
          <div class="settings-card-icon">💾</div>
          <div class="settings-card-title">Data a export</div>
        </div>
        <div class="settings-rows">

          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Export dat (JSON)</div>
              <div class="settings-row-desc">Stáhnout zálohu všech vašich dat</div>
            </div>
            <button class="btn btn-ghost" id="exportDataBtn" style="font-size:12px;padding:7px 14px">
              ⬇ Exportovat
            </button>
          </div>

          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Vymazat XP a postup</div>
              <div class="settings-row-desc">Resetuje XP body, levely a achievementy</div>
            </div>
            <button class="btn btn-ghost" id="resetXpBtn" style="font-size:12px;padding:7px 14px;color:var(--orange)">
              ↺ Resetovat XP
            </button>
          </div>

        </div>
      </div>

      <!-- Účet — jen pro přihlášené -->
      ${!isGuest ? `
      <div class="settings-card settings-danger">
        <div class="settings-card-header">
          <div class="settings-card-icon">⚠️</div>
          <div class="settings-card-title">Nebezpečná zóna</div>
        </div>
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Odhlásit se</div>
              <div class="settings-row-desc">Odhlásí vás z aplikace na tomto zařízení</div>
            </div>
            <button class="btn btn-ghost" id="settingsLogoutBtn" style="font-size:12px;padding:7px 14px;color:var(--red)">
              Odhlásit →
            </button>
          </div>
        </div>
      </div>` : `
      <div class="settings-card">
        <div class="settings-rows">
          <div class="settings-row">
            <div class="settings-row-info">
              <div class="settings-row-label">Zaregistrovat se</div>
              <div class="settings-row-desc">Vytvořte účet a uložte svá data trvale</div>
            </div>
            <button class="btn btn-primary" id="settingsRegisterBtn" style="font-size:12px;padding:7px 14px">
              Registrace →
            </button>
          </div>
        </div>
      </div>`}

    </div>
  `;

  // Inicializovat avatar v nastavení
  const settingsAvatar = document.getElementById('settingsAvatar');
  if (settingsAvatar) {
    const activeAvatarId = localStorage.getItem(SHOP_ACTIVE_AVATAR);
    const activeAvatar   = SHOP_ITEMS?.find(i => i.id === activeAvatarId);
    if (activeAvatar) {
      settingsAvatar.textContent = activeAvatar.icon;
    } else {
      const email = typeof currentUser !== 'undefined' ? currentUser?.email : '';
      settingsAvatar.textContent = isGuest ? '👤' : ((email || 'U')[0].toUpperCase());
      settingsAvatar.style.fontSize = '18px';
    }
  }

  // ── Events ──────────────────────────────────────────

  // Téma
  section.querySelectorAll('[data-set-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.setTheme;
      const s = loadSettings(); s.theme = t; saveSettings(s);
      if (typeof applyTheme === 'function') applyTheme(t);
      renderSettings();
      showToast(`Režim změněn na ${t === 'dark' ? 'tmavý 🌙' : 'světlý ☀️'}`, 'success');
    });
  });

  // Akcent barva
  section.querySelectorAll('[data-accent]').forEach(dot => {
    dot.addEventListener('click', () => {
      const hex = dot.dataset.accent;
      const s   = loadSettings(); s.accentColor = hex; saveSettings(s);
      document.documentElement.style.setProperty('--accent', hex);
      // Odvodit světlejší variantu
      document.documentElement.style.setProperty('--accent-light', hex + 'CC');
      document.documentElement.style.setProperty('--accent-dim', hex + '22');
      renderSettings();
      showToast('Barva akcentu změněna', 'success');
    });
  });

  // Velikost písma
  section.querySelectorAll('[data-set-fontsize]').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.setFontsize;
      const s    = loadSettings(); s.fontSize = size; saveSettings(s);
      applySettings(s);
      renderSettings();
      showToast('Velikost textu změněna', 'success');
    });
  });

  // Animace toggle
  section.querySelector('#settingsAnimations')?.addEventListener('change', function() {
    const s = loadSettings(); s.animationsEnabled = this.checked; saveSettings(s);
    applySettings(s);
    showToast(this.checked ? 'Animace zapnuty' : 'Animace vypnuty', 'info');
  });

  // Kompaktní mode
  section.querySelector('#settingsCompact')?.addEventListener('change', function() {
    const s = loadSettings(); s.compactMode = this.checked; saveSettings(s);
    applySettings(s);
    showToast(this.checked ? 'Kompaktní režim zapnut' : 'Kompaktní režim vypnut', 'info');
  });

  // Notifikace
  section.querySelector('#enableNotifBtn')?.addEventListener('click', () => {
    if (typeof requestNotificationPermission === 'function') requestNotificationPermission();
    setTimeout(renderSettings, 1200);
  });

  section.querySelector('#settingsNotifTasks')?.addEventListener('change', function() {
    const s = loadSettings(); s.notifTasksToday = this.checked; saveSettings(s);
  });

  section.querySelector('#settingsNotifHabits')?.addEventListener('change', function() {
    const s = loadSettings(); s.notifHabitsEvening = this.checked; saveSettings(s);
  });

  // Export dat
  section.querySelector('#exportDataBtn')?.addEventListener('click', () => {
    const D = window.APP_DATA;
    const exportData = {
      exported_at: new Date().toISOString(),
      tasks:       D.tasks,
      habits:      D.habits,
      goals:       D.goals,
      notes:       D.notes,
      events:      D.events,
      transactions: D.transactions,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `planify-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exportována ✓', 'success');
  });

  // Reset XP
  section.querySelector('#resetXpBtn')?.addEventListener('click', () => {
    confirmDelete('Opravdu resetovat XP, levely a achievementy? Tuto akci nelze vrátit.', () => {
      localStorage.removeItem('planify_xp');
      localStorage.removeItem('planify_xp_simple');
      localStorage.removeItem('planify_stats');
      localStorage.removeItem('planify_achievements');
      if (typeof updateXpBar === 'function') updateXpBar();
      showToast('XP a postup byl resetován', 'info');
      renderSettings();
    });
  });

  // Odhlásit
  section.querySelector('#settingsLogoutBtn')?.addEventListener('click', async () => {
    try { await window.supabaseClient?.auth.signOut(); } catch {}
    window.location.replace('index.html');
  });

  // Registrace (host)
  section.querySelector('#settingsRegisterBtn')?.addEventListener('click', () => {
    if (typeof exitGuestMode === 'function') exitGuestMode();
    window.location.href = 'index.html';
  });
}

/* ─────────────────────────────────────────────────────
   INICIALIZACE
───────────────────────────────────────────────────── */
function initSettings() {
  const settings = loadSettings();
  applySettings(settings);
  // Aplikovat uloženou akcent barvu
  if (settings.accentColor && settings.accentColor !== '#6366F1') {
    document.documentElement.style.setProperty('--accent', settings.accentColor);
  }
}
