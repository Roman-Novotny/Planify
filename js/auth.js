/* ═══════════════════════════════════════════════════════
   Planify — js/auth.js  v3 final
   Přihlášení, registrace, consent validace, session check
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   LOGO dle tématu
───────────────────────────────────────────────────── */
function applyAuthTheme() {
  const theme = document.documentElement.dataset.theme || 'dark';
  const img   = document.getElementById('authLogoImg');
  if (!img) return;
  img.src = theme === 'light' ? 'img/logo-text-svet.png' : 'img/logo-text-tmav.png';
}

document.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('planify_theme') || 'dark';
  document.documentElement.dataset.theme = saved;
  applyAuthTheme();
});

/* ─────────────────────────────────────────────────────
   PŘEPÍNÁNÍ TABŮ
───────────────────────────────────────────────────── */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => {
      t.classList.remove('active'); t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');

    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    const form = document.getElementById(tab.dataset.tab === 'login' ? 'loginForm' : 'registerForm');
    if (form) form.classList.add('active');
    clearAllErrors();
  });
});

/* ─────────────────────────────────────────────────────
   TOGGLE HESLA
───────────────────────────────────────────────────── */
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const icon = btn.querySelector('.eye-icon');
    if (icon) icon.textContent = show ? '🙈' : '👁';
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
  if (val.length >= 8)          strength++;
  if (val.length >= 12)         strength++;
  if (/[A-Z]/.test(val))        strength++;
  if (/[0-9]/.test(val))        strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;

  const levels = [
    { w: '0%',   c: 'transparent' },
    { w: '25%',  c: '#F87171' },
    { w: '50%',  c: '#FBBF24' },
    { w: '75%',  c: '#60A5FA' },
    { w: '90%',  c: '#34D399' },
    { w: '100%', c: '#34D399' },
  ];
  const cfg = levels[Math.min(strength, 5)];
  bar.style.width      = val.length > 0 ? cfg.w : '0%';
  bar.style.background = cfg.c;
});

/* ─────────────────────────────────────────────────────
   VALIDACE
───────────────────────────────────────────────────── */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function setFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.form-error, .form-success').forEach(el => {
    el.classList.add('hidden'); el.textContent = '';
  });
  document.querySelectorAll('input').forEach(inp => inp.classList.remove('invalid'));
}

document.querySelectorAll('input').forEach(inp => {
  inp.addEventListener('input', () => {
    inp.classList.remove('invalid');
    const errEl = inp.closest('.form-group')?.querySelector('.field-error');
    if (errEl) errEl.textContent = '';
  });
});

/* ─────────────────────────────────────────────────────
   LOADING STAV TLAČÍTKA
───────────────────────────────────────────────────── */
function setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  const label   = btn.querySelector('.btn-label');
  const spinner = btn.querySelector('.btn-spinner');
  if (label)   label.style.display = loading ? 'none' : 'inline';
  if (spinner) spinner.classList.toggle('hidden', !loading);
}

/* ─────────────────────────────────────────────────────
   PŘEKLAD SUPABASE CHYB
───────────────────────────────────────────────────── */
function translateAuthError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid email or password'))
    return 'Nesprávný e-mail nebo heslo. Zkontrolujte prosím přihlašovací údaje.';
  if (m.includes('email not confirmed'))
    return 'Váš e-mail ještě není potvrzen. Zkontrolujte doručenou poštu a klikněte na odkaz.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Tento e-mail je již zaregistrován. Přihlaste se nebo použijte jiný e-mail.';
  if (m.includes('password should be at least'))
    return 'Heslo je příliš krátké — musí mít alespoň 8 znaků.';
  if (m.includes('rate limit') || m.includes('too many requests'))
    return 'Příliš mnoho pokusů. Počkejte chvíli a zkuste to znovu.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Problém s připojením k internetu. Zkontrolujte síť a zkuste znovu.';
  if (m.includes('signup disabled'))
    return 'Registrace je momentálně zakázána. Kontaktujte správce aplikace.';
  if (m.includes('weak password'))
    return 'Heslo je příliš slabé. Použijte kombinaci písmen, číslic a symbolů.';
  return 'Nastala neočekávaná chyba: ' + msg;
}

/* ─────────────────────────────────────────────────────
   PŘIHLÁŠENÍ
───────────────────────────────────────────────────── */
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;

  if (!validateEmail(email)) {
    setFieldError('loginEmailErr', 'Zadejte platnou e-mailovou adresu.');
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
    const { error } = await window.supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
      const errEl = document.getElementById('loginError');
      errEl.textContent = translateAuthError(error.message);
      errEl.classList.remove('hidden');
      document.getElementById('loginEmail').classList.add('invalid');
      document.getElementById('loginPassword').classList.add('invalid');
    } else {
      // Úspěch — smazat guest mode pokud byl
      localStorage.removeItem('planify_guest_mode');
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
   REGISTRACE — consent validace v capture phase
   (musí být před submit handlerem níže)
───────────────────────────────────────────────────── */
document.getElementById('registerForm')?.addEventListener('submit', function validateConsent(e) {
  const cb  = document.getElementById('consentTerms');
  const err = document.getElementById('consentErr');
  if (cb && !cb.checked) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (err) {
      err.textContent = 'Pro registraci musíte souhlasit s podmínkami použití.';
      err.style.color = 'var(--red)';
    }
    cb.closest('.checkbox-label')?.classList.add('consent-error');
    return false;
  }
  if (err) err.textContent = '';
  cb?.closest('.checkbox-label')?.classList.remove('consent-error');
}, true); // ← capture phase!

document.getElementById('registerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email = document.getElementById('regEmail').value.trim();
  const pw1   = document.getElementById('regPassword').value;
  const pw2   = document.getElementById('regPassword2').value;
  let valid = true;

  if (!validateEmail(email)) {
    setFieldError('regEmailErr', 'Zadejte platnou e-mailovou adresu.');
    document.getElementById('regEmail').classList.add('invalid');
    valid = false;
  }
  if (pw1.length < 8) {
    setFieldError('regPasswordErr', 'Heslo musí mít alespoň 8 znaků.');
    document.getElementById('regPassword').classList.add('invalid');
    valid = false;
  }
  if (pw1 !== pw2) {
    setFieldError('regPassword2Err', 'Hesla se neshodují. Zkontrolujte je.');
    document.getElementById('regPassword2').classList.add('invalid');
    valid = false;
  }
  if (!valid) return;

  setBtnLoading('registerBtn', true);

  try {
    const { data, error } = await window.supabaseClient.auth.signUp({ email, password: pw1 });

    if (error) {
      const errEl = document.getElementById('registerError');
      errEl.textContent = translateAuthError(error.message);
      errEl.classList.remove('hidden');
    } else {
      const needsConfirm = !data.session;
      const successEl    = document.getElementById('registerSuccess');

      if (needsConfirm) {
        successEl.innerHTML = `
          ✓ Účet vytvořen! Zkontrolujte e-mail <strong>${escHtml ? escHtml(email) : email}</strong>
          pro potvrzení registrace.`;
        successEl.classList.remove('hidden');
        document.getElementById('registerForm').reset();
      } else {
        // Přímé přihlášení (email confirm vypnutý)
        successEl.textContent = '✓ Vítejte v Planify! Přesměrovávám…';
        successEl.classList.remove('hidden');
        localStorage.removeItem('planify_guest_mode');
        setTimeout(() => window.location.replace('app.html'), 1200);
      }
    }
  } catch (err) {
    const errEl = document.getElementById('registerError');
    errEl.textContent = 'Nepodařilo se vytvořit účet. Zkuste to prosím znovu.';
    errEl.classList.remove('hidden');
    console.error('[Planify] Registrace chyba:', err);
  } finally {
    setBtnLoading('registerBtn', false);
  }
});

/* ─────────────────────────────────────────────────────
   GUEST MODE TLAČÍTKO
───────────────────────────────────────────────────── */
document.getElementById('guestModeBtn')?.addEventListener('click', () => {
  localStorage.setItem('planify_guest_mode', '1');
  window.location.href = 'app.html';
});

/* ─────────────────────────────────────────────────────
   CHECKBOX — vizuální efekt při kliknutí
───────────────────────────────────────────────────── */
document.getElementById('consentTerms')?.addEventListener('change', function() {
  const label = this.closest('.checkbox-label');
  if (label) label.classList.remove('consent-error');
  const err = document.getElementById('consentErr');
  if (err && this.checked) err.textContent = '';
});

/* ─────────────────────────────────────────────────────
   KONTROLA EXISTUJÍCÍ SESSION — přesměrovat pokud přihlášen
───────────────────────────────────────────────────── */
async function checkExistingSession() {
  // Pokud přichází z guest módu → nezasahovat
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('from') === 'guest') return;

  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
      localStorage.removeItem('planify_guest_mode');
      window.location.replace('app.html');
    }
  } catch (err) {
    console.error('[Planify] Chyba kontroly session:', err);
  }
}

checkExistingSession();
