/* ═══════════════════════════════════════════════════════
   Planify — js/auth.js  v4
   Přihlášení, registrace, guest mode, souhlas
═══════════════════════════════════════════════════════ */

/* ── Logo dle tématu ── */
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

/* ── Taby ── */
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

/* ── Toggle hesla ── */
document.querySelectorAll('.toggle-pw').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const icon = btn.querySelector('.eye-icon');
    if (icon) icon.textContent = show ? '🙈' : '👁';
  });
});

/* ── Síla hesla ── */
document.getElementById('regPassword')?.addEventListener('input', e => {
  const val = e.target.value;
  const bar = document.getElementById('pwStrengthBar');
  if (!bar) return;
  let s = 0;
  if (val.length >= 8) s++;
  if (val.length >= 12) s++;
  if (/[A-Z]/.test(val)) s++;
  if (/[0-9]/.test(val)) s++;
  if (/[^A-Za-z0-9]/.test(val)) s++;
  const levels = [
    { w:'0%', c:'transparent' },
    { w:'25%', c:'#F87171' },
    { w:'50%', c:'#FBBF24' },
    { w:'75%', c:'#60A5FA' },
    { w:'90%', c:'#34D399' },
    { w:'100%', c:'#34D399' },
  ];
  const cfg = levels[Math.min(s, 5)];
  bar.style.width      = val.length > 0 ? cfg.w : '0%';
  bar.style.background = cfg.c;
});

/* ── Validace ── */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function clearAllErrors() {
  document.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  document.querySelectorAll('.form-error, .form-success').forEach(el => {
    el.classList.add('hidden'); el.textContent = '';
  });
  document.querySelectorAll('input').forEach(i => i.classList.remove('invalid'));
}

document.querySelectorAll('input').forEach(inp => {
  inp.addEventListener('input', () => {
    inp.classList.remove('invalid');
    inp.closest('.form-group')?.querySelector('.field-error')?.textContent === '';
  });
});

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id); if (!btn) return;
  btn.disabled = loading;
  btn.querySelector('.btn-label')?.style && (btn.querySelector('.btn-label').style.display = loading ? 'none' : 'inline');
  btn.querySelector('.btn-spinner')?.classList.toggle('hidden', !loading);
}

/* ── Překlad chyb ── */
function translateAuthError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid email or password'))
    return 'Nesprávný e-mail nebo heslo.';
  if (m.includes('email not confirmed'))
    return 'E-mail není potvrzený — zkontrolujte schránku.';
  if (m.includes('user already registered') || m.includes('already been registered'))
    return 'Tento e-mail je již zaregistrován.';
  if (m.includes('password should be at least'))
    return 'Heslo musí mít alespoň 8 znaků.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Příliš mnoho pokusů — počkejte chvíli.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Problém s připojením — zkontrolujte internet.';
  if (m.includes('signup disabled'))
    return 'Registrace je momentálně zakázána.';
  return 'Chyba: ' + msg;
}

/* ── PŘIHLÁŠENÍ ── */
document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  let valid = true;

  if (!validateEmail(email)) {
    document.getElementById('loginEmailErr').textContent = 'Zadejte platný e-mail.';
    document.getElementById('loginEmail').classList.add('invalid');
    valid = false;
  }
  if (!password) {
    document.getElementById('loginPasswordErr').textContent = 'Zadejte heslo.';
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
      localStorage.removeItem('planify_guest_mode');
      window.location.replace('app.html');
    }
  } catch {
    const errEl = document.getElementById('loginError');
    errEl.textContent = 'Nepodařilo se připojit k serveru.';
    errEl.classList.remove('hidden');
  } finally {
    setBtnLoading('loginBtn', false);
  }
});

/* ── REGISTRACE — consent validace (capture phase) ── */
document.getElementById('registerForm')?.addEventListener('submit', function(e) {
  const cb  = document.getElementById('consentTerms');
  const err = document.getElementById('consentErr');
  if (cb && !cb.checked) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (err) err.textContent = 'Musíte souhlasit s podmínkami.';
    return false;
  }
  if (err) err.textContent = '';
}, true);

document.getElementById('registerForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  clearAllErrors();

  const email = document.getElementById('regEmail').value.trim();
  const pw1   = document.getElementById('regPassword').value;
  const pw2   = document.getElementById('regPassword2').value;
  let valid = true;

  if (!validateEmail(email)) {
    document.getElementById('regEmailErr').textContent = 'Zadejte platný e-mail.';
    document.getElementById('regEmail').classList.add('invalid');
    valid = false;
  }
  if (pw1.length < 8) {
    document.getElementById('regPasswordErr').textContent = 'Heslo musí mít alespoň 8 znaků.';
    document.getElementById('regPassword').classList.add('invalid');
    valid = false;
  }
  if (pw1 !== pw2) {
    document.getElementById('regPassword2Err').textContent = 'Hesla se neshodují.';
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
        successEl.textContent = '✓ Účet vytvořen! Zkontrolujte e-mail pro potvrzení.';
        successEl.classList.remove('hidden');
        document.getElementById('registerForm').reset();
      } else {
        successEl.textContent = '✓ Vítejte v Planify! Přesměrovávám…';
        successEl.classList.remove('hidden');
        localStorage.removeItem('planify_guest_mode');
        setTimeout(() => window.location.replace('app.html'), 1200);
      }
    }
  } catch {
    const errEl = document.getElementById('registerError');
    errEl.textContent = 'Nepodařilo se vytvořit účet.';
    errEl.classList.remove('hidden');
  } finally {
    setBtnLoading('registerBtn', false);
  }
});

/* ── GUEST MODE ── */
document.getElementById('guestModeBtn')?.addEventListener('click', () => {
  localStorage.setItem('planify_guest_mode', '1');
  window.location.href = 'app.html';
});

/* ── Consent checkbox ── */
document.getElementById('consentTerms')?.addEventListener('change', function() {
  const err = document.getElementById('consentErr');
  if (err && this.checked) err.textContent = '';
});

/* ── Modaly podmínek ── */
document.getElementById('openTermsBtn')?.addEventListener('click', () => {
  document.getElementById('termsOverlay')?.classList.remove('hidden');
});
document.getElementById('openPrivacyBtn')?.addEventListener('click', () => {
  document.getElementById('privacyOverlay')?.classList.remove('hidden');
});
document.getElementById('closeTermsBtn')?.addEventListener('click', () => {
  document.getElementById('termsOverlay')?.classList.add('hidden');
});
document.getElementById('closePrivacyBtn')?.addEventListener('click', () => {
  document.getElementById('privacyOverlay')?.classList.add('hidden');
});
document.getElementById('acceptTermsBtn')?.addEventListener('click', () => {
  document.getElementById('termsOverlay')?.classList.add('hidden');
  const cb = document.getElementById('consentTerms');
  if (cb) cb.checked = true;
});
document.getElementById('acceptPrivacyBtn')?.addEventListener('click', () => {
  document.getElementById('privacyOverlay')?.classList.add('hidden');
  const cb = document.getElementById('consentTerms');
  if (cb) cb.checked = true;
});

/* ── Session check ── */
async function checkExistingSession() {
  // Pokud je guest mode, přejít na app
  if (localStorage.getItem('planify_guest_mode') === '1') return;

  try {
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
      localStorage.removeItem('planify_guest_mode');
      window.location.replace('app.html');
    }
  } catch (err) {
    console.error('[Planify] Session check error:', err);
  }
}

checkExistingSession();
