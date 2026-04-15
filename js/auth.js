const supabase = window.supabaseClient;
/* ═══════════════════════════════════════════════════════
   Planify — js/auth.js
   Přihlášení, registrace, správa session
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   PŘEPÍNÁNÍ LOGO při změně tématu (auth stránka)
───────────────────────────────────────────────────── */
function applyAuthTheme() {
  const theme = document.documentElement.dataset.theme || 'dark';
  const img   = document.getElementById('authLogoImg');
  if (!img) return;
  img.src = theme === 'light' ? 'img/logo-text-svet.png' : 'img/logo-text-tmav.png';
}

// Aplikovat hned při načtení
document.addEventListener('DOMContentLoaded', () => {
  // Načíst uložené téma
  const saved = localStorage.getItem('planify_theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  applyAuthTheme();
});

/* ─────────────────────────────────────────────────────
   PŘEPÍNÁNÍ TABŮ (Přihlásit se / Registrace)
───────────────────────────────────────────────────── */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    // Přepnout aktivní tab
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');

    // Přepnout formulář
    const target = tab.dataset.tab; // 'login' nebo 'register'
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    const form = document.getElementById(target === 'login' ? 'loginForm' : 'registerForm');
    if (form) form.classList.add('active');

    // Vyčistit chyby
    clearAllErrors();
  });
});

/* ─────────────────────────────────────────────────────
   TOGGLE ZOBRAZENÍ HESLA
───────────────────────────────────────────────────── */
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const eyeIcon = btn.querySelector('.eye-icon');
    if (eyeIcon) eyeIcon.textContent = show ? '🙈' : '👁';
    btn.setAttribute('aria-label', show ? 'Skrýt heslo' : 'Zobrazit heslo');
  });
});

/* ─────────────────────────────────────────────────────
   SÍLA HESLA
───────────────────────────────────────────────────── */
document.getElementById('regPassword')?.addEventListener('input', e => {
  const val = e.target.value;
  const bar = document.getElementById('pwStrengthBar');
  if (!bar) return;

  let strength = 0;
  if (val.length >= 8)  strength++;
  if (val.length >= 12) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;

  const configs = [
    { width: '0%',   color: 'transparent' },
    { width: '25%',  color: '#F87171' },   // slabé
    { width: '50%',  color: '#FBBF24' },   // střední
    { width: '75%',  color: '#60A5FA' },   // dobré
    { width: '90%',  color: '#34D399' },   // silné
    { width: '100%', color: '#34D399' },   // velmi silné
  ];

  const cfg = configs[Math.min(strength, 5)];
  bar.style.width    = val.length > 0 ? cfg.width : '0%';
  bar.style.background = cfg.color;
});

/* ─────────────────────────────────────────────────────
   VALIDACE
───────────────────────────────────────────────────── */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function setFieldError(errId, msg) {
  const el = document.getElementById(errId);
  if (el) el.textContent = msg;
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.form-error, .form-success').forEach(el => {
    el.classList.add('hidden');
    el.textContent = '';
  });
  document.querySelectorAll('input').forEach(inp => inp.classList.remove('invalid'));
}

// Vyčistit chybu při psaní
document.querySelectorAll('input').forEach(inp => {
  inp.addEventListener('input', () => {
    inp.classList.remove('invalid');
    // Vyčistit field-error za inputem
    const next = inp.closest('.input-wrap')?.parentElement?.querySelector('.field-error');
    if (next) next.textContent = '';
  });
});

/* ─────────────────────────────────────────────────────
   NASTAVENÍ TLAČÍTKA — loading stav
───────────────────────────────────────────────────── */
function setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (label)   label.style.display   = loading ? 'none' : 'inline';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

/* ─────────────────────────────────────────────────────
   PŘEKLAD CHYBOVÝCH HLÁŠEK SUPABASE
───────────────────────────────────────────────────── */
function translateAuthError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password')) {
    return 'Nesprávný e-mail nebo heslo. Zkontrolujte přihlašovací údaje.';
  }
  if (m.includes('email not confirmed')) {
    return 'Váš e-mail není potvrzen. Zkontrolujte doručenou poštu.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Tento e-mail je již zaregistrován. Přihlaste se nebo použijte jiný e-mail.';
  }
  if (m.includes('password should be at least')) {
    return 'Heslo musí mít alespoň 8 znaků.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Příliš mnoho pokusů. Počkejte chvíli a zkuste to znovu.';
  }
  if (m.includes('network') || m.includes('fetch')) {
    return 'Chyba připojení. Zkontrolujte internetové připojení.';
  }
  if (m.includes('signup disabled')) {
    return 'Registrace je momentálně zakázána. Kontaktujte správce.';
  }
  // Výchozí — vrátit původní zprávu
  return 'Nastala chyba: ' + msg;
}

/* ─────────────────────────────────────────────────────
   PŘIHLÁŠENÍ
───────────────────────────────────────────────────── */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;

  // Validace
  if (!validateEmail(email)) {
    setFieldError('loginEmailErr', 'Zadejte platný e-mail.');
    document.getElementById('loginEmail').classList.add('invalid');
    valid = false;
  }

  if (!password) {
    setFieldError('loginPasswordErr', 'Zadejte heslo.');
    valid = false;
  }

  if (!valid) return;

  setBtnLoading('loginBtn', true);

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const errEl = document.getElementById('loginError');
      errEl.textContent = translateAuthError(error.message);
      errEl.classList.remove('hidden');

      // Zvýraznit pole
      document.getElementById('loginEmail').classList.add('invalid');
      document.getElementById('loginPassword').classList.add('invalid');
    } else {
      // Úspěch — přesměrovat
      window.location.replace('app.html');
    }
  } catch (err) {
    const errEl = document.getElementById('loginError');
    errEl.textContent = 'Nepodařilo se připojit k serveru. Zkontrolujte připojení.';
    errEl.classList.remove('hidden');
    console.error('[Planify] Login chyba:', err);
  } finally {
    setBtnLoading('loginBtn', false);
  }
});

/* ─────────────────────────────────────────────────────
   REGISTRACE
───────────────────────────────────────────────────── */
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email = document.getElementById('regEmail').value.trim();
  const pw1   = document.getElementById('regPassword').value;
  const pw2   = document.getElementById('regPassword2').value;
  let valid = true;

  // Validace
  if (!validateEmail(email)) {
    setFieldError('regEmailErr', 'Zadejte platný e-mail.');
    document.getElementById('regEmail').classList.add('invalid');
    valid = false;
  }

  if (pw1.length < 8) {
    setFieldError('regPasswordErr', 'Heslo musí mít alespoň 8 znaků.');
    document.getElementById('regPassword').classList.add('invalid');
    valid = false;
  }

  if (pw1 !== pw2) {
    setFieldError('regPassword2Err', 'Hesla se neshodují.');
    document.getElementById('regPassword2').classList.add('invalid');
    valid = false;
  }

  if (!valid) return;

  setBtnLoading('registerBtn', true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw1,
    });

    if (error) {
      const errEl = document.getElementById('registerError');
      errEl.textContent = translateAuthError(error.message);
      errEl.classList.remove('hidden');
    } else {
      // Zjistit, jestli Supabase vyžaduje potvrzení e-mailu
      const needsConfirm = !data.session;

      const successEl = document.getElementById('registerSuccess');

      if (needsConfirm) {
        successEl.textContent = '✓ Účet vytvořen! Zkontrolujte e-mail pro potvrzení registrace.';
        successEl.classList.remove('hidden');
        document.getElementById('registerForm').reset();
      } else {
        // Automatické přihlášení (pokud email confirm vypnutý)
        successEl.textContent = '✓ Vítejte v Planify! Přesměrovávám…';
        successEl.classList.remove('hidden');
        setTimeout(() => window.location.replace('app.html'), 1200);
      }
    }
  } catch (err) {
    const errEl = document.getElementById('registerError');
    errEl.textContent = 'Nepodařilo se vytvořit účet. Zkuste to znovu.';
    errEl.classList.remove('hidden');
    console.error('[Planify] Registrace chyba:', err);
  } finally {
    setBtnLoading('registerBtn', false);
  }
});

/* ─────────────────────────────────────────────────────
   KONTROLA EXISTUJÍCÍ SESSION
   Pokud je uživatel přihlášen → přesměrovat na app
───────────────────────────────────────────────────── */
async function checkExistingSession() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.location.replace('app.html');
    }
  } catch (err) {
    console.error('[Planify] Chyba kontroly session:', err);
  }
}

// Spustit po načtení
checkExistingSession();
