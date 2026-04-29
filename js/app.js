/* ═══════════════════════════════════════════════════════
   Planify — js/app.js  v3
   Navigace, inicializace, dashboard, guest mode,
   cookie consent, XP bar, chybové zprávy
═══════════════════════════════════════════════════════ */

let currentUser = null;
let _isGuest    = false; // Přihlášen jako host?

const SECTION_NAMES = {
  dashboard: 'Dashboard',
  tasks:     'Úkoly',
  calendar:  'Kalendář',
  habits:    'Sledování návyků',
  pomodoro:  'Pomodoro',
  finance:   'Finance',
  goals:     'Cíle',
  notes:     'Poznámky',
  shop:      'XP Obchod',
  settings:  'Nastavení',
};

/* ══ NAVIGACE ══ */
function navigate(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`section-${section}`);
  if (!target) return;
  target.classList.add('active');

  document.querySelectorAll('.nav-item').forEach(a => {
    const isActive = a.dataset.section === section;
    a.classList.toggle('active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = SECTION_NAMES[section] || section;

  switch (section) {
    case 'dashboard': renderDashboard(); break;
    case 'calendar':  renderCalendar(); break;
    case 'finance':   renderFinance(); break;
    case 'pomodoro':  renderPomodoroHistory(); break;
    case 'shop':      if (typeof renderShop === 'function') renderShop(); break;
    case 'settings':  if (typeof renderSettings === 'function') renderSettings(); break;
  }

  if (window.innerWidth <= 960) closeSidebar();
  document.getElementById('mainContent')?.scrollTo(0, 0);
}

document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.section); });
});

document.addEventListener('click', e => {
  const el = e.target.closest('[data-goto]');
  if (el && !e.defaultPrevented) navigate(el.dataset.goto);
});

/* ══ SIDEBAR MOBIL ══ */
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'true');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
}
document.getElementById('menuToggle')?.addEventListener('click', openSidebar);
document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

/* ══ TÉMA & LOGO ══ */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('planify_theme', theme);

  const labelEl = document.getElementById('themeLabel');
  if (labelEl) labelEl.textContent = theme === 'dark' ? 'Světlý režim' : 'Tmavý režim';

  const src = theme === 'light' ? 'img/logo-text-svet.png' : 'img/logo-text-tmav.png';
  const logoImg     = document.getElementById('sidebarLogoImg');
  const loadingLogo = document.getElementById('loadingLogoImg');
  if (logoImg)     logoImg.src     = src;
  if (loadingLogo) loadingLogo.src = src;

  if (typeof renderFinanceCharts === 'function') {
    try { renderFinanceCharts(); } catch {}
  }
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

/* ══ XP BAR ══ */
function ensureXpBar() {
  if (document.getElementById('xpBarContainer')) return;
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  const bar = document.createElement('div');
  bar.className = 'xp-bar-container';
  bar.id        = 'xpBarContainer';
  bar.innerHTML = `
    <div class="xp-bar-header">
      <span class="xp-level-badge" id="xpLevelBadge">🌱 Úr. 1</span>
      <span class="xp-points" id="xpPoints">0 XP</span>
    </div>
    <div class="xp-bar-track">
      <div class="xp-bar-fill" id="xpBarFill" style="width:0%"></div>
    </div>`;
  const userPanel = footer.querySelector('.user-panel');
  footer.insertBefore(bar, userPanel);
}

/* ══ DATETIME ══ */
function updateDatetime() {
  const el = document.getElementById('datetimeDisplay');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('cs-CZ', {
    weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit',
  });
}

/* ══ ODHLÁŠENÍ ══ */
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  if (_isGuest) {
    // Host se "odhlásí" — smazat guest data a jít na přihlášení
    if (typeof exitGuestMode === 'function') exitGuestMode();
    window.location.replace('index.html');
    return;
  }
  try { await window.supabaseClient.auth.signOut(); } catch {}
  window.location.replace('index.html');
});

/* ══ GUEST BANNER ══ */
function showGuestBanner() {
  const banner = document.getElementById('guestBanner');
  if (!banner) return;
  banner.classList.remove('hidden');
  // Přidat třídu na body pro posunutí obsahu dolů
  document.body.classList.add('has-guest-banner');

  // Tlačítko "Zaregistrovat se"
  document.getElementById('guestRegisterBtn')?.addEventListener('click', () => {
    if (typeof exitGuestMode === 'function') exitGuestMode();
    window.location.href = 'index.html';
  });

  // Zavřít banner
  document.getElementById('guestDismissBtn')?.addEventListener('click', () => {
    banner.style.display = 'none';
    document.body.classList.remove('has-guest-banner');
  });
}

/* ══ VAROVÁNÍ PŘI AKCÍCH HOSTA ══ */
let _guestActionCount = 0;

function guestActionWarning(actionName = 'Tato akce') {
  _guestActionCount++;
  // Každé 3. akci připomenout
  if (_guestActionCount % 3 !== 1) return;

  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast warning guest-save-toast';
  toast.innerHTML = `
    <span>⚠️</span>
    <span>${escHtml(actionName)} je uložena pouze lokálně. 
      <strong style="cursor:pointer;text-decoration:underline" id="guestToastLogin">
        Přihlaste se
      </strong> pro trvalé uložení.</span>`;
  container.appendChild(toast);

  toast.querySelector('#guestToastLogin')?.addEventListener('click', () => {
    if (typeof exitGuestMode === 'function') exitGuestMode();
    window.location.href = 'index.html';
  });

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 6000);
}

/* ══ NAČTENÍ DAT ══ */
async function loadAllData() {
  const D = window.APP_DATA;

  // ── Režim hosta — načíst z localStorage ──────────
  if (_isGuest) {
    try {
      const gNotes  = localStorage.getItem('planify_guest_notes');
      const gTasks  = localStorage.getItem('planify_guest_tasks');
      const gHabits = localStorage.getItem('planify_guest_habits');
      const gGoals  = localStorage.getItem('planify_guest_goals');
      if (gNotes)  D.notes  = JSON.parse(gNotes);
      if (gTasks)  D.tasks  = JSON.parse(gTasks);
      if (gHabits) D.habits = JSON.parse(gHabits);
      if (gGoals)  D.goals  = JSON.parse(gGoals);
    } catch {}
    loadPomodoroState();
    return;
  }

  // ── Přihlášený uživatel — Supabase ────────────────
  const uid = currentUser.id;
  const [tasksR, eventsR, habitsR, habitLogsR, txR, catR, budgetsR, goalsR, notesR] =
    await Promise.all([
      window.supabaseClient.from('tasks')              .select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      window.supabaseClient.from('events')             .select('*').eq('user_id', uid).order('event_date'),
      window.supabaseClient.from('habits')             .select('*').eq('user_id', uid).order('created_at'),
      window.supabaseClient.from('habit_logs')         .select('*').eq('user_id', uid),
      window.supabaseClient.from('finance_records')    .select('*').eq('user_id', uid).order('date', { ascending: false }),
      window.supabaseClient.from('finance_categories') .select('*').eq('user_id', uid),
      window.supabaseClient.from('budgets')            .select('*').eq('user_id', uid),
      window.supabaseClient.from('goals')              .select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      window.supabaseClient.from('notes')              .select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
    ]);

  D.tasks         = tasksR.data        || [];
  D.events        = eventsR.data       || [];
  D.habits        = habitsR.data       || [];
  D.transactions  = txR.data           || [];
  D.finCategories = catR.data          || [];
  D.budgets       = budgetsR.data      || [];
  D.goals         = goalsR.data        || [];
  D.notes         = notesR.data        || [];

  D.habitLogs = {};
  (habitLogsR.data || []).forEach(log => {
    D.habitLogs[`${log.habit_id}_${log.log_date}`] = true;
  });

  loadPomodoroState();
}

/* ══ RENDER VŠECH SEKCÍ ══ */
function renderAll() {
  renderDashboard();
  if (typeof renderTasks    === 'function') renderTasks();
  if (typeof renderHabits   === 'function') renderHabits();
  if (typeof renderGoals    === 'function') renderGoals();
  if (typeof renderNotes    === 'function') renderNotes();
  if (typeof renderPomodoro === 'function') renderPomodoro();
}

/* ══ DASHBOARD ══ */
function renderDashboard() {
  const D    = window.APP_DATA;
  const hour = new Date().getHours();
  let emoji  = '🌙';
  if (hour >= 5  && hour < 12) emoji = '🌅';
  if (hour >= 12 && hour < 17) emoji = '☀️';
  if (hour >= 17 && hour < 21) emoji = '🌆';

  const greetEl = document.getElementById('greetEmoji');
  if (greetEl) greetEl.textContent = emoji;
  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = formatDate(today());

  const todayTasks = D.tasks.filter(t => isToday(t.due_date) && !t.done);
  const statT = document.getElementById('statTasks');
  if (statT) statT.textContent = todayTasks.length;

  const doneHabits = D.habits.filter(h => D.habitLogs[`${h.id}_${today()}`]);
  const statH = document.getElementById('statHabits');
  if (statH) statH.textContent = `${doneHabits.length} / ${D.habits.length}`;

  const balance = D.transactions.reduce((s, t) => s + (t.type === 'income' ? +t.amount : -t.amount), 0);
  const statB = document.getElementById('statBalance');
  if (statB) statB.textContent = formatCurrency(balance);

  const activeGoals = D.goals.filter(g => g.target_value > 0 && g.current_value / g.target_value < 1);
  const statG = document.getElementById('statGoals');
  if (statG) statG.textContent = activeGoals.length;

  const badge   = document.getElementById('tasksBadge');
  const pending = D.tasks.filter(t => !t.done).length;
  if (badge) badge.textContent = pending > 0 ? String(pending) : '';

  // Tasks widget
  const dashTasksEl = document.getElementById('dashTasksList');
  if (dashTasksEl) {
    const shown = D.tasks.filter(t => isToday(t.due_date) || (!t.due_date && !t.done)).slice(0, 6);
    if (shown.length === 0) {
      dashTasksEl.innerHTML = '<div class="empty-state-small">Žádné úkoly na dnes 🎉</div>';
    } else {
      dashTasksEl.innerHTML = shown.map(t => `
        <div class="dash-task-item">
          <div class="dash-check ${t.done ? 'done' : ''}" data-quick-check="${escHtml(t.id)}"
               role="checkbox" aria-checked="${t.done}" tabindex="0">
            ${t.done ? '✓' : ''}
          </div>
          <span class="dash-task-name ${t.done ? 'done' : ''}">${escHtml(t.name)}</span>
        </div>`).join('');

      dashTasksEl.querySelectorAll('[data-quick-check]').forEach(el => {
        const toggle = async () => {
          const id   = el.dataset.quickCheck;
          const task = D.tasks.find(t => t.id === id);
          if (!task) return;
          const wasNotDone = !task.done;
          task.done = !task.done;
          renderDashboard();
          if (typeof renderTasks === 'function') renderTasks();

          if (_isGuest) {
            _persistGuestDataFromApp();
            if (wasNotDone) guestActionWarning('Úkol');
            return;
          }

          const { error } = await window.supabaseClient.from('tasks').update({ done: task.done }).eq('id', id);
          if (error) { task.done = !task.done; renderDashboard(); return; }
          if (wasNotDone && typeof xpTaskCompleted === 'function') xpTaskCompleted(task);
        };
        el.addEventListener('click', toggle);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      });
    }
  }

  // Habits widget
  const dashHabitsEl = document.getElementById('dashHabitsList');
  if (dashHabitsEl) {
    if (D.habits.length === 0) {
      dashHabitsEl.innerHTML = '<div class="empty-state-small">Žádné návyky</div>';
    } else {
      dashHabitsEl.innerHTML = D.habits.slice(0, 5).map(h => {
        const done = !!D.habitLogs[`${h.id}_${today()}`];
        return `
          <div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid var(--border-subtle);font-size:12.5px">
            <span style="font-size:15px">${h.icon || '◎'}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(h.name)}</span>
            <span style="font-size:11px;color:var(--orange);font-weight:700">🔥 ${h.streak || 0}</span>
            <span style="color:${done ? 'var(--green)' : 'var(--text-muted)'}">${done ? '✓' : '○'}</span>
          </div>`;
      }).join('');
    }
  }

  // Notes widget
  const dashNotesEl = document.getElementById('dashNotesList');
  if (dashNotesEl) {
    const recent = [...D.notes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3);
    if (recent.length === 0) {
      dashNotesEl.innerHTML = '<div class="empty-state-small">Žádné poznámky</div>';
    } else {
      dashNotesEl.innerHTML = recent.map(n => {
        const plain = typeof _htmlToPlainText === 'function'
          ? _htmlToPlainText(n.content || '').slice(0, 90)
          : (n.content || '').replace(/<[^>]+>/g, '').slice(0, 90);
        return `
          <div class="dash-note-item" data-goto="notes">
            <div class="dash-note-title">${escHtml(n.title || 'Bez názvu')}</div>
            <div class="dash-note-preview">${escHtml(plain)}</div>
          </div>`;
      }).join('');
    }
  }

  // Goals widget
  const dashGoalsEl = document.getElementById('dashGoalsList');
  if (dashGoalsEl) {
    if (D.goals.length === 0) {
      dashGoalsEl.innerHTML = '<div class="empty-state-small">Žádné cíle</div>';
    } else {
      dashGoalsEl.innerHTML = D.goals.slice(0, 4).map(g => {
        const pct = g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0;
        return `
          <div class="dash-goal-item">
            <div class="dash-goal-name">${escHtml(g.name)}</div>
            <div class="mini-progress"><div class="mini-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join('');
    }
  }
}

function _persistGuestDataFromApp() {
  try {
    localStorage.setItem('planify_guest_notes',  JSON.stringify(window.APP_DATA.notes));
    localStorage.setItem('planify_guest_tasks',  JSON.stringify(window.APP_DATA.tasks));
    localStorage.setItem('planify_guest_habits', JSON.stringify(window.APP_DATA.habits));
    localStorage.setItem('planify_guest_goals',  JSON.stringify(window.APP_DATA.goals));
  } catch {}
}

/* ══ VYHLEDÁVÁNÍ ══ */
let _searchTimeout = null;

document.getElementById('globalSearch')?.addEventListener('input', e => {
  clearTimeout(_searchTimeout);
  const q = e.target.value.trim().toLowerCase();
  if (!q) { closeSearch(); return; }
  _searchTimeout = setTimeout(() => performSearch(q), 280);
});

document.getElementById('globalSearch')?.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeSearch(); e.target.value = ''; }
});

document.getElementById('closeSearch')?.addEventListener('click', closeSearch);
document.getElementById('searchOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('searchOverlay')) closeSearch();
});

function performSearch(q) {
  const D = window.APP_DATA;
  const results = [];

  D.tasks.forEach(t => { if (t.name.toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q)) results.push({type:'Úkol',text:t.name,section:'tasks'}); });
  D.notes.forEach(n => {
    const plain = typeof _htmlToPlainText === 'function' ? _htmlToPlainText(n.content||'') : (n.content||'').replace(/<[^>]+>/g,'');
    if ((n.title||'').toLowerCase().includes(q) || plain.toLowerCase().includes(q)) results.push({type:'Poznámka',text:n.title||'Bez názvu',section:'notes'});
  });
  D.habits.forEach(h => { if (h.name.toLowerCase().includes(q)) results.push({type:'Návyk',text:h.name,section:'habits'}); });
  D.goals.forEach(g => { if (g.name.toLowerCase().includes(q)) results.push({type:'Cíl',text:g.name,section:'goals'}); });
  D.transactions.forEach(t => { if (t.description.toLowerCase().includes(q)) results.push({type:'Transakce',text:t.description,section:'finance'}); });
  D.events.forEach(ev => { if (ev.name.toLowerCase().includes(q)) results.push({type:'Událost',text:ev.name,section:'calendar'}); });

  const titleEl   = document.getElementById('searchResultsTitle');
  const resultsEl = document.getElementById('searchResults');
  if (titleEl) titleEl.textContent = results.length ? `Nalezeno: ${results.length} výsledků` : 'Žádné výsledky';

  if (results.length === 0) {
    resultsEl.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13.5px">Nic nebylo nalezeno pro „${escHtml(q)}"</div>`;
  } else {
    resultsEl.innerHTML = results.slice(0,16).map(r => `
      <div class="search-result-item" data-goto="${r.section}">
        <span class="search-result-type">${r.type}</span>
        <span class="search-result-text">${escHtml(r.text)}</span>
      </div>`).join('');
    resultsEl.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        navigate(el.dataset.goto); closeSearch();
        document.getElementById('globalSearch').value = '';
      });
    });
  }
  document.getElementById('searchOverlay').classList.add('open');
}

function closeSearch() {
  document.getElementById('searchOverlay')?.classList.remove('open');
}

/* ══ PŘELOŽENÍ CHYB ══ */
function friendlyDbError(err) {
  if (!err) return 'Neznámá chyba.';
  const msg = (err.message || err.code || '').toLowerCase();
  if (msg.includes('jwt'))                     return 'Platnost přihlášení vypršela. Přihlaste se znovu.';
  if (msg.includes('network')||msg.includes('fetch')) return 'Problém s připojením. Zkontrolujte internet.';
  if (msg.includes('unique'))                  return 'Tento záznam již existuje.';
  if (msg.includes('foreign key'))             return 'Nelze smazat — na záznamu závisí jiná data.';
  if (msg.includes('row-level security')||msg.includes('rls')) return 'Nemáte oprávnění k této operaci.';
  if (msg.includes('too many requests'))       return 'Příliš mnoho požadavků. Počkejte chvíli.';
  if (msg.includes('not null'))                return 'Chybí povinné pole.';
  return 'Nastala chyba při ukládání. Zkuste to znovu.';
}

/* ══ NOTIF TLAČÍTKO ══ */
document.getElementById('notifBtn')?.addEventListener('click', () => {
  if (typeof requestNotificationPermission === 'function') requestNotificationPermission();
});

/* ══ INICIALIZACE ══ */
async function initApp() {
  // Nastavit téma co nejdříve
  const savedTheme = localStorage.getItem('planify_theme') || 'dark';
  applyTheme(savedTheme);

  // ── Zjistit zda je guest mode ──────────────────────
  _isGuest = (typeof isGuestMode === 'function') && isGuestMode();

  if (_isGuest) {
    // Spustit jako host — bez Supabase
    await _initAsGuest();
    return;
  }

  // ── Ověřit session ────────────────────────────────
  let session;
  try {
    const { data } = await window.supabaseClient.auth.getSession();
    session = data.session;
  } catch (err) {
    console.error('[Planify] getSession:', err);
    window.location.replace('index.html');
    return;
  }

  if (!session) {
    window.location.replace('index.html');
    return;
  }

  currentUser = session.user;

  // Uživatel
  const emailEl  = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');
  if (emailEl)  emailEl.textContent  = currentUser.email || '—';
  if (avatarEl) avatarEl.textContent = (currentUser.email || 'U')[0].toUpperCase();

  // DateTime
  updateDatetime();
  setInterval(updateDatetime, 60_000);

  // XP bar
  ensureXpBar();
  updateXpBar();

  // Načíst data
  try {
    await loadAllData();
  } catch (err) {
    console.error('[Planify] loadAllData:', err);
    showToast(friendlyDbError(err), 'error', 6000);
  }

  // Render
  renderAll();
  if (typeof initSettings     === 'function') initSettings();
  if (typeof initShopEffects  === 'function') initShopEffects();

  // Notifikace
  if (typeof initNotifications === 'function') initNotifications();

  // Skrýt loading
  const loadingEl = document.getElementById('appLoading');
  if (loadingEl) {
    loadingEl.classList.add('fade-out');
    setTimeout(() => { loadingEl.style.display = 'none'; }, 420);
  }

  navigate('dashboard');

  // Tour
  const tourDone = localStorage.getItem('planify_tour_done');
  if (!tourDone && typeof startTour === 'function') setTimeout(startTour, 900);

  // Denní XP bonus
  if (typeof checkDailyLoginBonus === 'function') setTimeout(checkDailyLoginBonus, 1500);

  // Auth changes
  window.supabaseClient.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT' || !newSession) window.location.replace('index.html');
    if (event === 'TOKEN_REFRESHED') currentUser = newSession.user;
  });
}

/* ─────────────────────────────────────────────────────
   INICIALIZACE JAKO HOST
───────────────────────────────────────────────────── */
async function _initAsGuest() {
  // Nastavit jméno
  const emailEl  = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');
  if (emailEl)  emailEl.textContent  = 'Režim hosta';
  if (avatarEl) avatarEl.textContent = '👤';

  // DateTime
  updateDatetime();
  setInterval(updateDatetime, 60_000);

  // Načíst data z localStorage
  await loadAllData();

  // Render
  renderAll();
  if (typeof initSettings     === 'function') initSettings();
  if (typeof initShopEffects  === 'function') initShopEffects();

  // Skrýt loading
  const loadingEl = document.getElementById('appLoading');
  if (loadingEl) {
    loadingEl.classList.add('fade-out');
    setTimeout(() => { loadingEl.style.display = 'none'; }, 420);
  }

  navigate('dashboard');

  // Zobrazit persistent banner
  showGuestBanner();

  // Ukázat toast po načtení
  setTimeout(() => {
    showToast('👤 Režim hosta: data se neukládají na server — jen v tomto prohlížeči.', 'warning', 6000);
  }, 1200);
}

/* ─────────────────────────────────────────────────────
   COOKIE BANNER pro app.html (pokud nebyl potvrzen)
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Cookie.js se načítá zvlášť — initCookieBanner se zavolá z něj
  // Zde jen spustit reminder scheduler
  if (typeof startReminderScheduler === 'function') {
    startReminderScheduler();
  }
});

document.addEventListener('DOMContentLoaded', initApp);
