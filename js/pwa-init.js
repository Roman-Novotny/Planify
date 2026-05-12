/* ═══════════════════════════════════════════════════════
   Planify — js/pwa-init.js
   Service Worker registrace + PWA install prompt
═══════════════════════════════════════════════════════ */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

window._pwaInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  window._pwaInstallPrompt = e;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'flex';
  if (typeof renderSettings === 'function') {
    const s = document.getElementById('section-settings');
    if (s && s.classList.contains('active')) renderSettings();
  }
});

window.addEventListener('appinstalled', () => {
  window._pwaInstallPrompt = null;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'none';
});

window._triggerPwaInstall = function() {
  if (window._pwaInstallPrompt) window._pwaInstallPrompt.prompt();
};
