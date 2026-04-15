/* ═══════════════════════════════════════════════════════
   Planify — js/pomodoro.js
   Pomodoro časovač — SVG kruh, režimy, sezení, historie
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   KONFIGURACE
───────────────────────────────────────────────────── */
const POMO_DURATIONS = {
  work:  25 * 60,  // 25 minut práce
  short:  5 * 60,  // 5 minut krátká pauza
  long:  15 * 60,  // 15 minut dlouhá pauza
};

const POMO_LABELS = {
  work:  'Čas pracovat',
  short: 'Krátká přestávka',
  long:  'Dlouhá přestávka',
};

const POMO_COLORS = {
  work:  'var(--accent)',
  short: 'var(--green)',
  long:  'var(--blue)',
};

// SVG circumference pro r=88: 2 * π * 88 ≈ 553
const TIMER_CIRCUMFERENCE = 553;

/* ─────────────────────────────────────────────────────
   STAV ČASOVAČE
───────────────────────────────────────────────────── */
const pomoState = {
  mode:      'work',    // 'work' | 'short' | 'long'
  timeLeft:  25 * 60,  // Zbývající sekundy
  totalTime: 25 * 60,  // Celková délka aktuálního sezení
  running:   false,     // Běží?
  interval:  null,      // setInterval handle
};

/* ═══════════════════════════════════════════════════════
   INICIALIZACE (voláno z app.js po načtení dat)
═══════════════════════════════════════════════════════ */
function renderPomodoro() {
  _updateTimerDisplay();
  _updateTimerCircle();
  _renderSessionDots();
  updatePomoTaskSelect();
}

/* ═══════════════════════════════════════════════════════
   AKTUALIZACE ZOBRAZENÍ ČASU
═══════════════════════════════════════════════════════ */
function _updateTimerDisplay() {
  const timeStr = _formatTime(pomoState.timeLeft);

  const timeEl  = document.getElementById('pomodoroTime');
  const labelEl = document.getElementById('pomodoroLabel');
  const dashEl  = document.querySelector('#section-dashboard .mini-timer'); // pokud existuje

  if (timeEl)  timeEl.textContent  = timeStr;
  if (labelEl) labelEl.textContent = POMO_LABELS[pomoState.mode] || '';
  if (dashEl)  dashEl.textContent  = timeStr;
}

/* ═══════════════════════════════════════════════════════
   AKTUALIZACE SVG KRUHU
═══════════════════════════════════════════════════════ */
function _updateTimerCircle() {
  const progress = document.getElementById('timerProgress');
  if (!progress) return;

  const ratio  = pomoState.timeLeft / Math.max(pomoState.totalTime, 1);
  const offset = TIMER_CIRCUMFERENCE * (1 - ratio);

  progress.style.strokeDashoffset = offset;
  progress.style.stroke = POMO_COLORS[pomoState.mode] || 'var(--accent)';
}

/* ═══════════════════════════════════════════════════════
   FORMÁTOVÁNÍ ČASU mm:ss
═══════════════════════════════════════════════════════ */
function _formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/* ═══════════════════════════════════════════════════════
   TEČKY SEZENÍ
═══════════════════════════════════════════════════════ */
function _renderSessionDots() {
  const container = document.getElementById('sessionDots');
  const countEl   = document.getElementById('sessionCount');
  if (!container) return;

  const sessions = window.APP_DATA.pomodoroSessions || 0;

  // 4 tečky (1 Pomodoro cyklus = 4 sezení)
  let html = '';
  for (let i = 0; i < 4; i++) {
    const done = i < (sessions % 4) || (sessions > 0 && sessions % 4 === 0);
    html += `<div class="session-dot ${done ? 'done' : ''}" aria-hidden="true"></div>`;
  }
  container.innerHTML = html;

  if (countEl) countEl.textContent = String(sessions);
}

/* ═══════════════════════════════════════════════════════
   SELECT ÚKOLU PRO POMODORO
═══════════════════════════════════════════════════════ */
function updatePomoTaskSelect() {
  const sel = document.getElementById('pomoTaskSelect');
  if (!sel) return;

  const currentVal = sel.value;
  sel.innerHTML = '<option value="">— Vyberte úkol —</option>';

  window.APP_DATA.tasks
    .filter(t => !t.done)
    .forEach(t => {
      const opt = document.createElement('option');
      opt.value       = t.id;
      opt.textContent = t.name;
      sel.appendChild(opt);
    });

  // Zachovat předchozí výběr pokud ještě existuje
  if (currentVal && sel.querySelector(`option[value="${currentVal}"]`)) {
    sel.value = currentVal;
  }
}

/* ═══════════════════════════════════════════════════════
   PŘEPÍNÁNÍ REŽIMŮ (Práce / Krátká pauza / Dlouhá pauza)
═══════════════════════════════════════════════════════ */
document.querySelector('.pomo-modes')?.addEventListener('click', e => {
  const btn = e.target.closest('.pomo-mode');
  if (!btn || pomoState.running) return; // Neměnit za běhu

  document.querySelectorAll('.pomo-mode').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  _setMode(btn.dataset.mode);
});

function _setMode(mode) {
  // Zastavit aktuální běh
  if (pomoState.interval) {
    clearInterval(pomoState.interval);
    pomoState.interval = null;
  }
  pomoState.running = false;

  const btn = document.getElementById('pomoStartStop');
  if (btn) btn.textContent = '▶ Start';

  pomoState.mode      = mode;
  pomoState.timeLeft  = POMO_DURATIONS[mode];
  pomoState.totalTime = POMO_DURATIONS[mode];

  _updateTimerDisplay();
  _updateTimerCircle();

  // Aktivní tlačítko
  document.querySelectorAll('.pomo-mode').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

/* ═══════════════════════════════════════════════════════
   START / PAUZA
═══════════════════════════════════════════════════════ */
document.getElementById('pomoStartStop')?.addEventListener('click', () => {
  if (pomoState.running) {
    _pauseTimer();
  } else {
    _startTimer();
  }
});

function _startTimer() {
  pomoState.running  = true;
  const btn = document.getElementById('pomoStartStop');
  if (btn) btn.textContent = '⏸ Pauza';

  pomoState.interval = setInterval(() => {
    pomoState.timeLeft = Math.max(0, pomoState.timeLeft - 1);
    _updateTimerDisplay();
    _updateTimerCircle();

    // Aktualizovat titulek záložky
    document.title = `${_formatTime(pomoState.timeLeft)} — Planify`;

    if (pomoState.timeLeft === 0) {
      _timerComplete();
    }
  }, 1000);
}

function _pauseTimer() {
  clearInterval(pomoState.interval);
  pomoState.interval = null;
  pomoState.running  = false;
  const btn = document.getElementById('pomoStartStop');
  if (btn) btn.textContent = '▶ Pokračovat';
}

/* ═══════════════════════════════════════════════════════
   RESET
═══════════════════════════════════════════════════════ */
document.getElementById('pomoReset')?.addEventListener('click', () => {
  clearInterval(pomoState.interval);
  pomoState.interval = null;
  pomoState.running  = false;
  pomoState.timeLeft = POMO_DURATIONS[pomoState.mode];

  const btn = document.getElementById('pomoStartStop');
  if (btn) btn.textContent = '▶ Start';

  document.title = 'Planify';
  _updateTimerDisplay();
  _updateTimerCircle();
});

/* ═══════════════════════════════════════════════════════
   PŘESKOČIT
═══════════════════════════════════════════════════════ */
document.getElementById('pomoSkip')?.addEventListener('click', () => {
  clearInterval(pomoState.interval);
  pomoState.interval = null;
  pomoState.timeLeft = 0;
  _timerComplete();
});

/* ═══════════════════════════════════════════════════════
   DOKONČENÍ SEZENÍ
═══════════════════════════════════════════════════════ */
function _timerComplete() {
  clearInterval(pomoState.interval);
  pomoState.interval = null;
  pomoState.running  = false;
  document.title     = 'Planify';

  const isWork = pomoState.mode === 'work';

  if (isWork) {
    // ── Pracovní sezení dokončeno ──────────────────────
    window.APP_DATA.pomodoroSessions = (window.APP_DATA.pomodoroSessions || 0) + 1;

    // Získat název vybraného úkolu
    const taskId   = document.getElementById('pomoTaskSelect')?.value;
    const taskName = taskId
      ? (window.APP_DATA.tasks.find(t => t.id === taskId)?.name || '')
      : '';

    // Přidat do historie
    const histItem = {
      type: 'work',
      task: taskName || 'Bez úkolu',
      time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      date: today(),
    };
    window.APP_DATA.pomodoroHistory.unshift(histItem);

    // Uložit do localStorage
    savePomodoroState();

    // Aktualizovat UI
    _renderSessionDots();
    renderPomodoroHistory();

    showToast('🍅 Pomodoro dokončeno! Čas na přestávku.', 'success', 4000);

    // Browser notifikace
    if (typeof sendBrowserNotification === 'function') {
      sendBrowserNotification('🍅 Pomodoro dokončeno!', 'Čas na přestávku.');
    }

    // Auto-přepnout na přestávku
    const sessions = window.APP_DATA.pomodoroSessions;
    if (sessions % 4 === 0) {
      // Každé 4. sezení = dlouhá pauza
      setTimeout(() => {
        _setMode('long');
        showToast('☕ Čas na dlouhou přestávku (15 min)!', 'info');
      }, 800);
    } else {
      setTimeout(() => {
        _setMode('short');
        showToast('Krátká přestávka (5 min) — odpočiňte si!', 'info');
      }, 800);
    }

  } else {
    // ── Přestávka dokončena ────────────────────────────
    const histItem = {
      type: 'break',
      task: '',
      time: new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }),
      date: today(),
    };
    window.APP_DATA.pomodoroHistory.unshift(histItem);
    savePomodoroState();
    renderPomodoroHistory();

    showToast('Přestávka skončila! Čas na práci. 💪', 'info');

    if (typeof sendBrowserNotification === 'function') {
      sendBrowserNotification('Přestávka skončila!', 'Čas se vrátit k práci.');
    }

    setTimeout(() => _setMode('work'), 600);
  }
}

/* ═══════════════════════════════════════════════════════
   RENDER HISTORIE SEZENÍ
═══════════════════════════════════════════════════════ */
function renderPomodoroHistory() {
  const container = document.getElementById('pomodoroHistory');
  if (!container) return;

  const history = window.APP_DATA.pomodoroHistory.slice(0, 12);

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Žádná sezení zatím</div>';
    return;
  }

  container.innerHTML = history.map(item => `
    <div class="pomo-history-item">
      <span class="pomo-hist-type ${item.type === 'work' ? 'pomo-hist-work' : 'pomo-hist-break'}">
        ${item.type === 'work' ? '🍅 Práce' : '☕ Pauza'}
      </span>
      <span style="flex:1;font-size:12px;color:var(--text-secondary);
                   padding:0 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        ${escHtml(item.task || '')}
      </span>
      <span style="font-size:11px;color:var(--text-muted);flex-shrink:0">
        ${item.time || ''}
      </span>
    </div>`).join('');
}
