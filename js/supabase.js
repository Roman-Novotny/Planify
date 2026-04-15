/* ═══════════════════════════════════════════════════════
   Planify — js/supabase.js
   Konfigurace Supabase + sdílené utility celé aplikace
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   ⚠️  NASTAVENÍ — vyplňte vaše Supabase credentials
   Najdete v: Supabase Dashboard → Settings → API
───────────────────────────────────────────────────── */
const SUPABASE_URL  = 'https://jjmuolhqtfddjsrhwlnn.supabase.co';  // ← váš Project URL
const SUPABASE_ANON = 'sb_publishable_WuC8bsQceIeAMXhCKE7zYQ_Jk0NrGBu'; // ← váš anon/public key

/* ─────────────────────────────────────────────────────
   INICIALIZACE KLIENTA
───────────────────────────────────────────────────── */
let supabase;

try {
  if (typeof window.supabase === 'undefined') {
    throw new Error('Supabase CDN library není načtena.');
  }
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      autoRefreshToken: true,
      persistSession:   true,
      detectSessionInUrl: false,
    },
  });
} catch (e) {
  console.error('[Planify] Supabase init chyba:', e.message);
  // Zobrazíme bannner pokud credentials nejsou nastaveny
  if (SUPABASE_URL.includes('XXXX') || SUPABASE_ANON.includes('XXXX')) {
    document.addEventListener('DOMContentLoaded', () => {
      const banner = document.createElement('div');
      banner.style.cssText = [
        'position:fixed;top:0;left:0;right:0;z-index:99999',
        'background:#F87171;color:#fff;padding:12px 20px',
        'font-family:monospace;font-size:13px;text-align:center',
        'box-shadow:0 2px 12px rgba(0,0,0,0.3)',
      ].join(';');
      banner.innerHTML = '⚠️ <strong>Planify:</strong> Nastavte SUPABASE_URL a SUPABASE_ANON v souboru <code>js/supabase.js</code>';
      document.body.prepend(banner);
    });
  }
}

/* ═══════════════════════════════════════════════════════
   GLOBÁLNÍ STAV APLIKACE
   Všechny moduly čtou/zapisují do window.APP_DATA
═══════════════════════════════════════════════════════ */
window.APP_DATA = {
  tasks:          [],   // pole úkolů
  events:         [],   // kalendářní události
  habits:         [],   // návyky
  habitLogs:      {},   // { "habitId_YYYY-MM-DD": true }
  transactions:   [],   // finanční záznamy
  finCategories:  [],   // vlastní finance kategorie
  budgets:        [],   // měsíční rozpočty
  goals:          [],   // cíle
  notes:          [],   // poznámky

  // Pomodoro — ukládáno do localStorage (není v DB)
  pomodoroSessions: 0,
  pomodoroHistory:  [],
};

/* ═══════════════════════════════════════════════════════
   VÝCHOZÍ FINANCE KATEGORIE
   Používají se pokud uživatel nemá vlastní
═══════════════════════════════════════════════════════ */
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

/**
 * Dnešní datum jako string YYYY-MM-DD
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Aktuální měsíc jako string YYYY-MM
 */
function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Je datum dnes?
 * @param {string} dateStr  YYYY-MM-DD
 */
function isToday(dateStr) {
  return dateStr === today();
}

/**
 * Je datum v minulosti (před dneškem)?
 * @param {string} dateStr  YYYY-MM-DD
 */
function isPast(dateStr) {
  return dateStr < today();
}

/**
 * Formátuje datum pro zobrazení
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {string}  např. "15. dubna 2025"
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return dateStr; }
}

/**
 * Krátké formátování data
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {string}  např. "15. dub"
 */
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric', month: 'short',
    });
  } catch { return dateStr; }
}

/**
 * Formátuje číslo jako českou měnu
 * @param {number} n
 * @returns {string}  např. "12 500 Kč"
 */
function formatCurrency(n) {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'currency',
    currency: 'CZK',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

/**
 * HTML escape — zabraňuje XSS
 * @param {*} str
 * @returns {string}
 */
function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Vrátí ikonu finance kategorie
 * @param {string} catId
 */
function getCatIcon(catId) {
  const all = [
    ...window.DEFAULT_FIN_CATEGORIES,
    ...(window.APP_DATA.finCategories || []),
  ];
  return all.find(c => c.id === catId)?.icon || '📦';
}

/**
 * Vrátí název finance kategorie
 * @param {string} catId
 */
function getCatName(catId) {
  const all = [
    ...window.DEFAULT_FIN_CATEGORIES,
    ...(window.APP_DATA.finCategories || []),
  ];
  return all.find(c => c.id === catId)?.name || catId;
}

/* ═══════════════════════════════════════════════════════
   MARKDOWN → HTML RENDERER
   Bezpečný render pro poznámky
═══════════════════════════════════════════════════════ */

/**
 * Převede Markdown text na bezpečné HTML
 * Podporuje: ## nadpis, **tučné**, *kurzíva*, - seznam, ---
 * @param {string} raw  Surový markdown text
 * @returns {string}    HTML string
 */
function renderMarkdown(raw) {
  if (!raw) return '';

  const lines  = String(raw).split('\n');
  const output = [];
  let inList   = false;

  for (const line of lines) {
    // Nadpis ## nebo #
    if (/^#{1,2}\s+/.test(line)) {
      if (inList) { output.push('</ul>'); inList = false; }
      const text = line.replace(/^#{1,2}\s+/, '');
      output.push(`<h2>${inlineMarkdown(text)}</h2>`);
      continue;
    }

    // Odrážka - nebo *
    if (/^[-*]\s+/.test(line)) {
      if (!inList) { output.push('<ul>'); inList = true; }
      const text = line.replace(/^[-*]\s+/, '');
      output.push(`<li>${inlineMarkdown(text)}</li>`);
      continue;
    }

    // Horizontální čára ---
    if (/^---+$/.test(line.trim())) {
      if (inList) { output.push('</ul>'); inList = false; }
      output.push('<hr>');
      continue;
    }

    // Konec seznamu při prázdném řádku
    if (inList && line.trim() === '') {
      output.push('</ul>');
      inList = false;
    }

    // Prázdný řádek
    if (line.trim() === '') {
      output.push('<br>');
      continue;
    }

    // Normální odstavec
    output.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  // Uzavřít otevřený seznam
  if (inList) output.push('</ul>');

  return output.join('');
}

/**
 * Inline markdown: **tučné**, *kurzíva*
 * Nejdříve HTML-escapuje, pak aplikuje tagy
 * @param {string} text
 * @returns {string}
 */
function inlineMarkdown(text) {
  // Escape HTML znaků
  let s = String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // **tučné** — musí být před *kurzívou*
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *kurzíva*
  s = s.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');

  return s;
}

/**
 * Odstraní Markdown syntaxi pro preview v kartě
 * @param {string} text
 * @returns {string}
 */
function stripMarkdown(text) {
  if (!text) return '';
  return String(text)
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*([^*]+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/---+/g, '')
    .replace(/\n{2,}/g, ' ')
    .trim();
}

/* ═══════════════════════════════════════════════════════
   TOAST NOTIFIKACE
═══════════════════════════════════════════════════════ */

/**
 * Zobrazí toast notifikaci
 * @param {string} msg       Text zprávy
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration  Milisekundy (výchozí 3200)
 */
function showToast(msg, type = 'info', duration = 3200) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const icons = { info: 'ℹ', success: '✓', error: '✕', warning: '⚠' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type] || 'ℹ'}</span>
    <span class="toast-msg">${escHtml(msg)}</span>
  `;

  container.appendChild(toast);

  // Automatické odebrání
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ═══════════════════════════════════════════════════════
   MODALY — globální ovládání
═══════════════════════════════════════════════════════ */

/**
 * Otevře modal podle ID
 * @param {string} id  ID elementu .modal-overlay
 */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) { console.warn('[Planify] openModal: nenalezen', id); return; }
  el.classList.add('open');
  // Focus trap — focus na první input
  setTimeout(() => {
    const first = el.querySelector('input:not([type=hidden]), select, textarea');
    if (first) first.focus();
  }, 80);
}

/**
 * Zavře modal podle ID
 * @param {string} id
 */
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Zavření kliknutím na data-close nebo mimo modal
document.addEventListener('click', e => {
  // Tlačítko [data-close]
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) {
    closeModal(closeBtn.dataset.close);
    return;
  }
  // Klik přímo na overlay (tmavé pozadí)
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// Zavření Escapem
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  // Zavřít otevřený modal
  const openOverlay = document.querySelector('.modal-overlay.open');
  if (openOverlay) { openOverlay.classList.remove('open'); return; }
  // Zavřít search overlay
  const searchOv = document.getElementById('searchOverlay');
  if (searchOv?.classList.contains('open')) searchOv.classList.remove('open');
});

/* ═══════════════════════════════════════════════════════
   POTVRZOVACÍ DIALOG
═══════════════════════════════════════════════════════ */
let _confirmCallback = null;

/**
 * Zobrazí potvrzovací dialog pro mazání
 * @param {string}   message   Text zprávy
 * @param {Function} callback  Voláno po potvrzení
 */
function confirmDelete(message, callback) {
  const msgEl = document.getElementById('confirmMsg');
  if (msgEl) msgEl.textContent = message;
  _confirmCallback = callback;
  openModal('confirmModal');
}

// Klik na "Smazat" v confirm dialogu
document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
  if (typeof _confirmCallback === 'function') {
    _confirmCallback();
  }
  closeModal('confirmModal');
  _confirmCallback = null;
});

/* ═══════════════════════════════════════════════════════
   POMODORO — localStorage persistence
═══════════════════════════════════════════════════════ */
const POMO_STORAGE_KEY = 'planify_pomodoro';

/**
 * Uloží pomodoro stav do localStorage
 */
function savePomodoroState() {
  try {
    localStorage.setItem(POMO_STORAGE_KEY, JSON.stringify({
      sessions: window.APP_DATA.pomodoroSessions,
      history:  window.APP_DATA.pomodoroHistory,
    }));
  } catch (e) { /* ignorovat */ }
}

/**
 * Načte pomodoro stav z localStorage
 */
function loadPomodoroState() {
  try {
    const raw = localStorage.getItem(POMO_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    window.APP_DATA.pomodoroSessions = parsed.sessions || 0;
    window.APP_DATA.pomodoroHistory  = parsed.history  || [];
  } catch (e) { /* ignorovat */ }
}
