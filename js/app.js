/* ═══════════════════════════════════════════════════════
   Planify — js/app.js
   Hlavní logika aplikace:
   inicializace, navigace, načítání dat, dashboard,
   vyhledávání, téma, přepínání loga
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   GLOBÁLNÍ PROMĚNNÉ
───────────────────────────────────────────────────── */
let currentUser = null; // aktuálně přihlášený uživatel

const SECTION_NAMES = {
  dashboard: 'Dashboard',
  tasks:     'Úkoly',
  calendar:  'Kalendář',
  habits:    'Sledování návyků',
  pomodoro:  'Pomodoro',
  finance:   'Finance',
  goals:     'Cíle',
  notes:     'Poznámky',
};

/* ═══════════════════════════════════════════════════════
   NAVIGACE
═══════════════════════════════════════════════════════ */

/**
 * Přejde na danou sekci aplikace
 * @param {string} section  klíč sekce (dashboard, tasks, …)
 */
function navigate(section) {
  // Schovat všechny sekce
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Zobrazit cílovou sekci
  const target = document.getElementById(`section-${section}`);
  if (!target) { console.warn('[Planify] navigate: sekce nenalezena:', section); return; }
  target.classList.add('active');

  // Aktualizovat navigaci v sidebarú
  document.querySelectorAll('.nav-item').forEach(a => {
    const isActive = a.dataset.section === section;
    a.classList.toggle('active', isActive);
    a.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Aktualizovat nadpis v topbaru
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = SECTION_NAMES[section] || section;

  // Sekce-specifické akce při navigaci
  switch (section) {
    case 'dashboard': renderDashboard();       break;
    case 'calendar':  renderCalendar();        break;
    case 'finance':   renderFinance();         break;
    case 'pomodoro':  renderPomodoroHistory(); break;
  }

  // Zavřít sidebar na mobilu
  if (window.innerWidth <= 960) closeSidebar();

  // Scroll na vrch
  document.getElementById('mainContent')?.scrollTo(0, 0);
}

// Kliknutí na nav položky
document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    navigate(a.dataset.section);
  });
});

// Kliknutí na [data-goto] (widgety, stat karty…)
document.addEventListener('click', e => {
  const el = e.target.closest('[data-goto]');
  if (el && !e.defaultPrevented) {
    navigate(el.dataset.goto);
  }
});

/* ═══════════════════════════════════════════════════════
   SIDEBAR — mobilní ovládání
═══════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════
   TÉMA & LOGO
═══════════════════════════════════════════════════════ */

/**
 * Aplikuje téma a přepne logo obrázek
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('planify_theme', theme);

  // Aktualizovat popis tlačítka
  const labelEl = document.getElementById('themeLabel');
  if (labelEl) labelEl.textContent = theme === 'dark' ? 'Světlý režim' : 'Tmavý režim';

  // Přepnout logo v sidebarú
  const logoImg = document.getElementById('sidebarLogoImg');
  if (logoImg) {
    logoImg.src = theme === 'light' ? 'img/logo-text-svet.png' : 'img/logo-text-tmav.png';
  }

  // Přepnout logo na loading screenu (pro konzistenci)
  const loadingLogo = document.getElementById('loadingLogoImg');
  if (loadingLogo) {
    loadingLogo.src = theme === 'light' ? 'img/logo-text-svet.png' : 'img/logo-text-tmav.png';
  }

  // Překreslit finance grafy (Chart.js barvy)
  if (typeof renderFinanceCharts === 'function') {
    try { renderFinanceCharts(); } catch (e) { /* grafy nemusí být inicializovány */ }
  }
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* ═══════════════════════════════════════════════════════
   DATETIME DISPLAY
═══════════════════════════════════════════════════════ */
function updateDatetime() {
  const el = document.getElementById('datetimeDisplay');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('cs-CZ', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
    hour:    '2-digit',
    minute:  '2-digit',
  });
}

/* ═══════════════════════════════════════════════════════
   ODHLÁŠENÍ
═══════════════════════════════════════════════════════ */
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) { /* ignorovat */ }
  window.location.replace('index.html');
});

/* ═══════════════════════════════════════════════════════
   NAČÍTÁNÍ DAT Z DATABÁZE
═══════════════════════════════════════════════════════ */

/**
 * Načte všechna data uživatele z Supabase paralelně
 */
async function loadAllData() {
  const uid = currentUser.id;
  const D   = window.APP_DATA;

  // Paralelní fetch — výrazně rychlejší než sekvenční
  const [
    tasksR, eventsR, habitsR, habitLogsR,
    txR, catR, budgetsR, goalsR, notesR,
  ] = await Promise.all([
    supabase.from('tasks')              .select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('events')             .select('*').eq('user_id', uid).order('event_date'),
    supabase.from('habits')             .select('*').eq('user_id', uid).order('created_at'),
    supabase.from('habit_logs')         .select('*').eq('user_id', uid),
    supabase.from('finance_records')    .select('*').eq('user_id', uid).order('date', { ascending: false }),
    supabase.from('finance_categories') .select('*').eq('user_id', uid),
    supabase.from('budgets')            .select('*').eq('user_id', uid),
    supabase.from('goals')              .select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('notes')              .select('*').eq('user_id', uid).order('updated_at', { ascending: false }),
  ]);

  // Logovat případné chyby (ne kritické — pokračujeme)
  [tasksR, eventsR, habitsR, habitLogsR, txR, catR, budgetsR, goalsR, notesR]
    .forEach((r, i) => { if (r.error) console.warn('[Planify] loadAllData warn #' + i, r.error.message); });

  // Uložit do globálního stavu
  D.tasks         = tasksR.data        || [];
  D.events        = eventsR.data       || [];
  D.habits        = habitsR.data       || [];
  D.transactions  = txR.data           || [];
  D.finCategories = catR.data          || [];
  D.budgets       = budgetsR.data      || [];
  D.goals         = goalsR.data        || [];
  D.notes         = notesR.data        || [];

  // Habit logy → hash mapa pro O(1) přístup
  D.habitLogs = {};
  (habitLogsR.data || []).forEach(log => {
    D.habitLogs[`${log.habit_id}_${log.log_date}`] = true;
  });

  // Pomodoro z localStorage
  loadPomodoroState();
}

/* ═══════════════════════════════════════════════════════
   RENDER VŠECH SEKCÍ
═══════════════════════════════════════════════════════ */
function renderAll() {
  renderDashboard();
  if (typeof renderTasks    === 'function') renderTasks();
  if (typeof renderHabits   === 'function') renderHabits();
  if (typeof renderGoals    === 'function') renderGoals();
  if (typeof renderNotes    === 'function') renderNotes();
  if (typeof renderPomodoro === 'function') renderPomodoro();
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════ */
function renderDashboard() {
  const D = window.APP_DATA;

  // Pozdrav + emoji podle hodiny
  const hour = new Date().getHours();
  let emoji  = '🌙';
  if (hour >= 5  && hour < 12) emoji = '🌅';
  if (hour >= 12 && hour < 17) emoji = '☀️';
  if (hour >= 17 && hour < 21) emoji = '🌆';

  const greetEl = document.getElementById('greetEmoji');
  if (greetEl) greetEl.textContent = emoji;

  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = formatDate(today());

  // ── Stat karty ──────────────────────────────────────

  // Úkoly dnes
  const todayTasks = D.tasks.filter(t => isToday(t.due_date) && !t.done);
  const statT = document.getElementById('statTasks');
  if (statT) statT.textContent = todayTasks.length;

  // Návyky (splněno/celkem)
  const doneHabits = D.habits.filter(h => D.habitLogs[`${h.id}_${today()}`]);
  const statH = document.getElementById('statHabits');
  if (statH) statH.textContent = `${doneHabits.length} / ${D.habits.length}`;

  // Celkový zůstatek
  const balance = D.transactions.reduce(
    (s, t) => s + (t.type === 'income' ? +t.amount : -t.amount), 0
  );
  const statB = document.getElementById('statBalance');
  if (statB) statB.textContent = formatCurrency(balance);

  // Aktivní cíle (nenulový progress < 100%)
  const activeGoals = D.goals.filter(g => {
    const pct = g.target_value > 0 ? g.current_value / g.target_value : 0;
    return pct < 1;
  });
  const statG = document.getElementById('statGoals');
  if (statG) statG.textContent = activeGoals.length;

  // Badge počtu nesplněných úkolů
  const badge   = document.getElementById('tasksBadge');
  const pending = D.tasks.filter(t => !t.done).length;
  if (badge) badge.textContent = pending > 0 ? String(pending) : '';

  // ── Widget: Dnešní úkoly ────────────────────────────
  const dashTasksEl = document.getElementById('dashTasksList');
  if (dashTasksEl) {
    // Zobrazit dnešní + úkoly bez termínu (nesplněné)
    const shown = D.tasks
      .filter(t => isToday(t.due_date) || (!t.due_date && !t.done))
      .slice(0, 6);

    if (shown.length === 0) {
      dashTasksEl.innerHTML = '<div class="empty-state-small">Žádné úkoly na dnes 🎉</div>';
    } else {
      dashTasksEl.innerHTML = shown.map(t => `
        <div class="dash-task-item">
          <div class="dash-check ${t.done ? 'done' : ''}"
               data-quick-check="${escHtml(t.id)}"
               role="checkbox"
               aria-checked="${t.done}"
               tabindex="0">
            ${t.done ? '✓' : ''}
          </div>
          <span class="dash-task-name ${t.done ? 'done' : ''}">${escHtml(t.name)}</span>
        </div>`).join('');

      // Quick toggle z dashboardu
      dashTasksEl.querySelectorAll('[data-quick-check]').forEach(el => {
        const toggle = async () => {
          const id   = el.dataset.quickCheck;
          const task = D.tasks.find(t => t.id === id);
          if (!task) return;
          task.done = !task.done;
          // Okamžitá UI reakce
          renderDashboard();
          if (typeof renderTasks === 'function') renderTasks();
          // Sync DB
          const { error } = await supabase.from('tasks').update({ done: task.done }).eq('id', id);
          if (error) {
            task.done = !task.done; // revert
            renderDashboard();
            showToast('Chyba při ukládání', 'error');
          }
        };
        el.addEventListener('click', toggle);
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      });
    }
  }

  // ── Widget: Návyky ───────────────────────────────────
  const dashHabitsEl = document.getElementById('dashHabitsList');
  if (dashHabitsEl) {
    if (D.habits.length === 0) {
      dashHabitsEl.innerHTML = '<div class="empty-state-small">Žádné návyky</div>';
    } else {
      dashHabitsEl.innerHTML = D.habits.slice(0, 5).map(h => {
        const done = !!D.habitLogs[`${h.id}_${today()}`];
        return `
          <div style="display:flex;align-items:center;gap:9px;padding:6px 0;
                      border-bottom:1px solid var(--border-subtle);font-size:12.5px"
               class="${done ? '' : 'habit-pending'}">
            <span style="font-size:15px;line-height:1">${h.icon || '◎'}</span>
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              ${escHtml(h.name)}
            </span>
            <span style="font-size:11px;color:var(--orange);font-weight:700">
              🔥 ${h.streak || 0}
            </span>
            <span style="font-size:13px;color:${done ? 'var(--green)' : 'var(--text-muted)'}">
              ${done ? '✓' : '○'}
            </span>
          </div>`;
      }).join('');
    }
  }

  // ── Widget: Poslední poznámky ────────────────────────
  const dashNotesEl = document.getElementById('dashNotesList');
  if (dashNotesEl) {
    const recent = [...D.notes]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 3);

    if (recent.length === 0) {
      dashNotesEl.innerHTML = '<div class="empty-state-small">Žádné poznámky</div>';
    } else {
      dashNotesEl.innerHTML = recent.map(n => `
        <div class="dash-note-item" data-goto="notes" style="cursor:pointer">
          <div class="dash-note-title">${escHtml(n.title || 'Bez názvu')}</div>
          <div class="dash-note-preview">
            ${escHtml(stripMarkdown(n.content || '').slice(0, 90))}
          </div>
        </div>`).join('');
    }
  }

  // ── Widget: Cíle ─────────────────────────────────────
  const dashGoalsEl = document.getElementById('dashGoalsList');
  if (dashGoalsEl) {
    if (D.goals.length === 0) {
      dashGoalsEl.innerHTML = '<div class="empty-state-small">Žádné cíle</div>';
    } else {
      dashGoalsEl.innerHTML = D.goals.slice(0, 4).map(g => {
        const pct = g.target_value > 0
          ? Math.min(100, Math.round((g.current_value / g.target_value) * 100))
          : 0;
        return `
          <div class="dash-goal-item">
            <div class="dash-goal-name">${escHtml(g.name)}</div>
            <div class="mini-progress">
              <div class="mini-fill" style="width:${pct}%"></div>
            </div>
          </div>`;
      }).join('');
    }
  }
}

/* ═══════════════════════════════════════════════════════
   GLOBÁLNÍ VYHLEDÁVÁNÍ
═══════════════════════════════════════════════════════ */
let _searchTimeout = null;

document.getElementById('globalSearch')?.addEventListener('input', e => {
  clearTimeout(_searchTimeout);
  const q = e.target.value.trim().toLowerCase();
  if (!q) { closeSearch(); return; }
  _searchTimeout = setTimeout(() => performSearch(q), 280);
});

document.getElementById('globalSearch')?.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSearch();
    e.target.value = '';
  }
});

document.getElementById('closeSearch')?.addEventListener('click', closeSearch);

document.getElementById('searchOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('searchOverlay')) closeSearch();
});

/**
 * Provede vyhledávání ve všech datech
 * @param {string} q  Dotaz (lowercase)
 */
function performSearch(q) {
  const D       = window.APP_DATA;
  const results = [];

  // Prohledat každou sekci
  D.tasks.forEach(t => {
    if (t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)) {
      results.push({ type: 'Úkol', text: t.name, section: 'tasks' });
    }
  });

  D.notes.forEach(n => {
    if ((n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)) {
      results.push({ type: 'Poznámka', text: n.title || 'Bez názvu', section: 'notes' });
    }
  });

  D.habits.forEach(h => {
    if (h.name.toLowerCase().includes(q)) {
      results.push({ type: 'Návyk', text: h.name, section: 'habits' });
    }
  });

  D.goals.forEach(g => {
    if (g.name.toLowerCase().includes(q) || (g.description || '').toLowerCase().includes(q)) {
      results.push({ type: 'Cíl', text: g.name, section: 'goals' });
    }
  });

  D.transactions.forEach(t => {
    if (t.description.toLowerCase().includes(q)) {
      results.push({ type: 'Transakce', text: t.description, section: 'finance' });
    }
  });

  D.events.forEach(ev => {
    if (ev.name.toLowerCase().includes(q)) {
      results.push({ type: 'Událost', text: ev.name, section: 'calendar' });
    }
  });

  // Zobrazit výsledky
  const titleEl    = document.getElementById('searchResultsTitle');
  const resultsEl  = document.getElementById('searchResults');

  if (titleEl) titleEl.textContent = `Výsledky pro „${q}" (${results.length})`;

  if (results.length === 0) {
    resultsEl.innerHTML = `
      <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13.5px">
        Nic nenalezeno
      </div>`;
  } else {
    resultsEl.innerHTML = results.slice(0, 16).map(r => `
      <div class="search-result-item" data-goto="${r.section}" role="listitem">
        <span class="search-result-type">${r.type}</span>
        <span class="search-result-text">${escHtml(r.text)}</span>
      </div>`).join('');

    resultsEl.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        navigate(el.dataset.goto);
        closeSearch();
        const inp = document.getElementById('globalSearch');
        if (inp) inp.value = '';
      });
    });
  }

  document.getElementById('searchOverlay').classList.add('open');
}

function closeSearch() {
  document.getElementById('searchOverlay')?.classList.remove('open');
}

/* ═══════════════════════════════════════════════════════
   NOTIFICATION BUTTON
═══════════════════════════════════════════════════════ */
document.getElementById('notifBtn')?.addEventListener('click', () => {
  // Žádat o povolení notifikací pokud ještě není povoleno
  if (typeof requestNotificationPermission === 'function') {
    requestNotificationPermission();
  }
  showToast('Notifikace jsou aktivní', 'info');
});

/* ═══════════════════════════════════════════════════════
   INICIALIZACE APLIKACE
═══════════════════════════════════════════════════════ */
async function initApp() {
  // 1. Ověřit session
  let session;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (err) {
    console.error('[Planify] Chyba getSession:', err);
    window.location.replace('index.html');
    return;
  }

  if (!session) {
    window.location.replace('index.html');
    return;
  }

  currentUser = session.user;

  // 2. Aplikovat uložené téma (PŘED zobrazením obsahu)
  const savedTheme = localStorage.getItem('planify_theme') || 'dark';
  applyTheme(savedTheme);

  // 3. Zobrazit info o uživateli
  const emailEl  = document.getElementById('userEmail');
  const avatarEl = document.getElementById('userAvatar');
  if (emailEl)  emailEl.textContent  = currentUser.email || '—';
  if (avatarEl) avatarEl.textContent = (currentUser.email || 'U')[0].toUpperCase();

  // 4. Spustit datetime ticker
  updateDatetime();
  setInterval(updateDatetime, 60_000);

  // 5. Načíst data z DB
  try {
    await loadAllData();
  } catch (err) {
    console.error('[Planify] Chyba loadAllData:', err);
    showToast('Nepodařilo se načíst data. Zkuste obnovit stránku.', 'error', 5000);
  }

  // 6. Vykreslit všechny sekce
  renderAll();

  // 7. Inicializovat notifikace
  if (typeof initNotifications === 'function') {
    initNotifications();
  }

  // 8. Skrýt loading screen
  const loadingEl = document.getElementById('appLoading');
  if (loadingEl) {
    loadingEl.classList.add('fade-out');
    setTimeout(() => {
      loadingEl.style.display = 'none';
    }, 420);
  }

  // 9. Zobrazit dashboard
  navigate('dashboard');

  // 10. Tour průvodce při prvním spuštění
  const tourDone = localStorage.getItem('planify_tour_done');
  if (!tourDone && typeof startTour === 'function') {
    setTimeout(startTour, 900);
  }

  // 11. Reagovat na odhlášení
  supabase.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT' || !newSession) {
      window.location.replace('index.html');
    }
    if (event === 'TOKEN_REFRESHED') {
      currentUser = newSession.user;
    }
  });
}

// Spustit po načtení DOM
document.addEventListener('DOMContentLoaded', initApp);
