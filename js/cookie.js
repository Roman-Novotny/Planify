/* ═══════════════════════════════════════════════════════
   Planify — js/cookie.js
   Cookie souhlas, GDPR modaly, režim hosta
═══════════════════════════════════════════════════════ */

const COOKIE_KEY      = 'planify_cookie_consent'; // 'all' | 'essential' | null
const GUEST_MODE_KEY  = 'planify_guest_mode';

/* ─────────────────────────────────────────────────────
   COOKIE BANNER — inicializace
───────────────────────────────────────────────────── */
function initCookieBanner() {
  const consent = localStorage.getItem(COOKIE_KEY);
  if (consent) return; // Již rozhodnuto

  const banner = document.getElementById('cookieBanner');
  if (!banner) return;

  banner.removeAttribute('aria-hidden');

  // Zobrazit s animací
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });
  });

  // Přijmout vše
  document.getElementById('cookieAcceptBtn')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, 'all');
    _hideCookieBanner();
  });

  // Jen nezbytné
  document.getElementById('cookieRejectBtn')?.addEventListener('click', () => {
    localStorage.setItem(COOKIE_KEY, 'essential');
    _hideCookieBanner();
  });

  // Odkaz na více informací — otevřít privacy modal
  document.getElementById('cookieDetailBtn')?.addEventListener('click', () => {
    _hideCookieBanner();
    openPrivacyOverlay();
  });
}

function _hideCookieBanner() {
  const banner = document.getElementById('cookieBanner');
  if (!banner) return;
  banner.style.transform = 'translateY(110%)';
  banner.style.transition = 'transform 0.3s ease';
  setTimeout(() => {
    banner.setAttribute('aria-hidden', 'true');
    banner.style.display = 'none';
  }, 320);
}

/* ─────────────────────────────────────────────────────
   LEGAL MODALY
───────────────────────────────────────────────────── */
function openTermsOverlay() {
  document.getElementById('termsOverlay')?.classList.remove('hidden');
}

function openPrivacyOverlay() {
  document.getElementById('privacyOverlay')?.classList.remove('hidden');
}

document.getElementById('openTermsBtn')?.addEventListener('click', openTermsOverlay);
document.getElementById('openPrivacyBtn')?.addEventListener('click', openPrivacyOverlay);

document.getElementById('closeTermsBtn')?.addEventListener('click', () => {
  document.getElementById('termsOverlay')?.classList.add('hidden');
});

document.getElementById('closePrivacyBtn')?.addEventListener('click', () => {
  document.getElementById('privacyOverlay')?.classList.add('hidden');
});

document.getElementById('acceptTermsBtn')?.addEventListener('click', () => {
  document.getElementById('termsOverlay')?.classList.add('hidden');
  // Automaticky zaškrtnout checkbox souhlasu
  const cb = document.getElementById('consentTerms');
  if (cb) cb.checked = true;
});

document.getElementById('acceptPrivacyBtn')?.addEventListener('click', () => {
  document.getElementById('privacyOverlay')?.classList.add('hidden');
  const cb = document.getElementById('consentTerms');
  if (cb) cb.checked = true;
});

// Zavřít kliknutím na overlay
document.getElementById('termsOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('termsOverlay')) {
    document.getElementById('termsOverlay').classList.add('hidden');
  }
});

document.getElementById('privacyOverlay')?.addEventListener('click', e => {
  if (e.target === document.getElementById('privacyOverlay')) {
    document.getElementById('privacyOverlay').classList.add('hidden');
  }
});

/* ─────────────────────────────────────────────────────
   REGISTRACE — validace souhlasu
───────────────────────────────────────────────────── */
// Přidat validaci do formuláře registrace
document.getElementById('registerForm')?.addEventListener('submit', function(e) {
  const cb  = document.getElementById('consentTerms');
  const err = document.getElementById('consentErr');
  if (cb && !cb.checked) {
    e.preventDefault();
    e.stopImmediatePropagation(); // Zastavit ostatní handlery
    if (err) err.textContent = 'Pro registraci musíte souhlasit s podmínkami.';
    cb.focus();
    return false;
  }
  if (err) err.textContent = '';
}, true); // capture phase — dřív než auth.js handler

/* ─────────────────────────────────────────────────────
   REŽIM HOSTA
───────────────────────────────────────────────────── */
document.getElementById('guestModeBtn')?.addEventListener('click', () => {
  // Označit jako hosta
  localStorage.setItem(GUEST_MODE_KEY, '1');
  // Přejít na aplikaci
  window.location.href = 'app.html';
});

/* ─────────────────────────────────────────────────────
   EXPORT: zjistit zda je guest mode
───────────────────────────────────────────────────── */
function isGuestMode() {
  return localStorage.getItem(GUEST_MODE_KEY) === '1';
}

function exitGuestMode() {
  localStorage.removeItem(GUEST_MODE_KEY);
}

/* ─────────────────────────────────────────────────────
   INICIALIZACE
───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', initCookieBanner);
