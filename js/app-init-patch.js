/* ═══════════════════════════════════════════════════════
   Planify — js/app-init-patch.js
   Opravy pro starší verzi app.js:
   - Guest mode (přihlášení jako host)
   - Nastavení + XP Obchod sekce
   - Téma sync
   - Font size aplikace

   Načíst PO app.js:
   <script src="js/app-init-patch.js"></script>
═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Rozšířit SECTION_NAMES ── */
  if (typeof SECTION_NAMES !== 'undefined') {
    SECTION_NAMES['shop']     = 'XP Obchod';
    SECTION_NAMES['settings'] = 'Nastavení';
  }

  /* ── 2. Patch navigate() – přidat shop + settings ── */
  function _patchNavigate() {
    if (typeof navigate !== 'function') return;
    const _orig = window.navigate || navigate;

    window.navigate = function (section) {
      _orig(section);

      if (section === 'shop'     && typeof renderShop     === 'function') renderShop();
      if (section === 'settings' && typeof renderSettings === 'function') renderSettings();

      // Opravit topbar title pokud zobrazuje surový klíč
      const titleEl = document.getElementById('topbarTitle');
      if (titleEl) {
        const names = { shop: 'XP Obchod', settings: 'Nastavení' };
        if (names[section]) titleEl.textContent = names[section];
      }
    };
  }

  /* ── 3. Guest mode ──
     Pokud localStorage obsahuje planify_guest_mode=1
     a initApp přesměrovává na index.html, interceptujeme to.
  ── */
  function _patchInitAppForGuest() {
    // Přepsat window.location.replace aby nezasahoval při guest modu
    const _origReplace = window.location.replace.bind(window.location);

    // Monkey-patch initApp pokud ještě nebyl volán
    const _origInitApp = window.initApp;

    window.initApp = async function () {
      const isGuest = localStorage.getItem('planify_guest_mode') === '1';

      if (isGuest) {
        await _runGuestApp();
        return;
      }

      // Normální flow
      if (typeof _origInitApp === 'function') {
        return _origInitApp();
      }
    };
  }

  /* ── 4. Spustit aplikaci jako host ── */
  async function _runGuestApp() {
    const D = window.APP_DATA;

    // 1. Téma
    const savedTheme = localStorage.getItem('planify_theme') || 'dark';
    if (typeof applyTheme === 'function') applyTheme(savedTheme);

    // 2. Uživatel info
    const emailEl  = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');
    if (emailEl)  emailEl.textContent  = 'Režim hosta';
    if (avatarEl) avatarEl.textContent = '👤';

    // 3. DateTime
    if (typeof updateDatetime === 'function') {
      updateDatetime();
      setInterval(updateDatetime, 60_000);
    }

    // 4. Načíst guest data z localStorage
    if (D) {
      const keys = {
        notes:  'planify_guest_notes',
        tasks:  'planify_guest_tasks',
        habits: 'planify_guest_habits',
        goals:  'planify_guest_goals',
      };
      Object.entries(keys).forEach(([key, storageKey]) => {
        try {
          const raw = localStorage.getItem(storageKey);
          if (raw) D[key] = JSON.parse(raw);
        } catch {}
      });
      if (typeof loadPomodoroState === 'function') loadPomodoroState();
    }

    // 5. Render
    if (typeof renderAll === 'function') renderAll();
    if (typeof initSettings    === 'function') initSettings();
    if (typeof initShopEffects === 'function') initShopEffects();

    // 6. Skrýt loading
    const loadingEl = document.getElementById('appLoading');
    if (loadingEl) {
      loadingEl.classList.add('fade-out');
      setTimeout(() => { loadingEl.style.display = 'none'; }, 400);
    }

    // 7. Navigovat na dashboard
    if (typeof navigate === 'function') navigate('dashboard');

    // 8. Guest banner
    _showGuestBanner();

    // 9. Toast
    setTimeout(() => {
      if (typeof showToast === 'function') {
        showToast('👤 Režim hosta — data se neukládají na server.', 'warning', 5000);
      }
    }, 1200);

    // 10. Notifikace
    if (typeof initNotifications === 'function') initNotifications();

    // 11. Reminder scheduler
    if (typeof startReminderScheduler === 'function') startReminderScheduler();

    // 12. Auth state - reagovat na přihlášení
    if (window.supabaseClient) {
      window.supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          localStorage.removeItem('planify_guest_mode');
          window.location.replace('app.html');
        }
      });
    }
  }

  /* ── 5. Guest banner ── */
  function _showGuestBanner() {
    const banner = document.getElementById('guestBanner');
    if (!banner) {
      // Vytvořit dynamicky pokud neexistuje v HTML
      const div = document.createElement('div');
      div.id = 'guestBanner';
      div.className = 'guest-banner';
      div.innerHTML = `
        <span class="guest-banner-icon">⚠️</span>
        <div class="guest-banner-text">
          <strong>Režim hosta:</strong> Data se <strong>neukládají</strong> — zmizí po zavření záložky.
        </div>
        <div class="guest-banner-actions">
          <button class="guest-banner-login" id="guestRegisterBtn">Zaregistrovat se →</button>
          <button class="guest-banner-dismiss" id="guestDismissBtn">✕</button>
        </div>`;
      const topbar = document.querySelector('.topbar');
      if (topbar) topbar.parentNode.insertBefore(div, topbar.nextSibling);
      else document.body.prepend(div);
    } else {
      banner.classList.remove('hidden');
    }

    document.body.classList.add('has-guest-banner');

    document.getElementById('guestRegisterBtn')?.addEventListener('click', () => {
      localStorage.removeItem('planify_guest_mode');
      window.location.href = 'index.html';
    });
    document.getElementById('guestDismissBtn')?.addEventListener('click', () => {
      const b = document.getElementById('guestBanner');
      if (b) b.style.display = 'none';
      document.body.classList.remove('has-guest-banner');
    });
  }

  /* ── 6. Opravit patch initApp IHNED (synchronně) ── */
  // Musíme to udělat před tím než se DOMContentLoaded spustí
  _patchInitAppForGuest();

  /* ── 7. Po načtení DOM ── */
  function _onReady() {
    _patchNavigate();

    // Téma fix
    const theme = localStorage.getItem('planify_theme') || 'dark';
    const labelEl = document.getElementById('themeLabel');
    const iconEl  = document.getElementById('themeIcon');
    if (labelEl) labelEl.textContent = theme === 'dark' ? 'Světlý režim' : 'Tmavý režim';
    if (iconEl)  iconEl.textContent  = theme === 'dark' ? '☽' : '☀';

    // Font size fix
    try {
      const s = JSON.parse(localStorage.getItem('planify_settings') || '{}');
      const map = { small: '13px', normal: '15px', large: '17px' };
      document.documentElement.style.fontSize = map[s.fontSize] || '15px';
    } catch {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _onReady);
  } else {
    _onReady();
  }

})();
