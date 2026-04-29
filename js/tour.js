/* ═══════════════════════════════════════════════════════
   Planify — js/tour.js  v3 final
   Interaktivní průvodce — mobile first, XP krok,
   správné stíny, klávesová navigace
═══════════════════════════════════════════════════════ */

const TOUR_STEPS = [
  {
    targetId: 'sidebarLogoLink',
    section:  null,
    icon:     '👋',
    title:    'Vítejte v Planify!',
    text:     'Toto je váš osobní dashboard pro produktivitu. Průvodce vás provede hlavními funkcemi — trvá jen pár minut. Pomocí šipek nebo tlačítek se přesunujte mezi kroky.',
    position: 'right',
  },
  {
    targetId: 'tourNav',
    section:  'dashboard',
    icon:     '⊞',
    title:    'Navigace',
    text:     'V levém panelu najdete přístup ke všem sekcím: Úkoly, Kalendář, Návyky, Pomodoro, Finance, Cíle a Poznámky. Na mobilu otevřete menu ikonou ☰ nahoře.',
    position: 'right',
  },
  {
    targetId: 'tourStats',
    section:  'dashboard',
    icon:     '📊',
    title:    'Dashboard — přehled',
    text:     'Okamžitý přehled dne: dnešní úkoly, splněné návyky, zůstatek a cíle. Kliknutím na kartu přejdete přímo do dané sekce.',
    position: 'bottom',
  },
  {
    targetId: 'section-tasks',
    section:  'tasks',
    icon:     '✓',
    title:    'Správa úkolů',
    text:     'Přidávejte úkoly s termíny, prioritami a kategoriemi. Splněné označte kliknutím na kroužek. Za každý splněný úkol získáte XP body!',
    position: 'top',
  },
  {
    targetId: 'section-habits',
    section:  'habits',
    icon:     '◎',
    title:    'Návyky a streaky',
    text:     'Sledujte denní návyky a budujte streak. Nastavte si připomínku v konkrétní čas — upozorní vás, i když aplikace neběží.',
    position: 'top',
  },
  {
    targetId: 'section-finance',
    section:  'finance',
    icon:     '◈',
    title:    'Finance',
    text:     'Sledujte příjmy a výdaje, nastavte měsíční rozpočty. Při překročení 80 % limitu dostanete varování. Grafy ukazují trend za 6 měsíců.',
    position: 'top',
  },
  {
    targetId: 'xpBarContainer',
    section:  'dashboard',
    icon:     '⭐',
    title:    'XP a achievementy',
    text:     'Za každou aktivitu získáváte XP body — od Nováčka až po Grand Mastera! Sbírejte achievementy za splněné milníky a vraťte se každý den pro denní bonus.',
    position: 'right',
  },
  {
    targetId: 'tourStartBtn',
    section:  null,
    icon:     '🎉',
    title:    'Vše připraveno!',
    text:     'Průvodce lze kdykoli spustit znovu přes „? Nápověda" v menu. Hodně XP a úspěchů s Planify!',
    position: 'right',
  },
];

let _tourActive = false;
let _tourStep   = 0;

/* ═══════════════════════════════════════════════════════
   START
═══════════════════════════════════════════════════════ */
function startTour() {
  _tourActive = true;
  _tourStep   = 0;
  document.querySelectorAll('.tour-shadow').forEach(el => el.classList.add('visible'));
  document.getElementById('tourHighlightRing')?.classList.add('visible');
  _showStep(0);
}

/* ═══════════════════════════════════════════════════════
   ZOBRAZIT KROK
═══════════════════════════════════════════════════════ */
function _showStep(index, direction = 'next') {
  if (index < 0 || index >= TOUR_STEPS.length) return;
  _tourStep = index;
  const step = TOUR_STEPS[index];

  // Na mobilu otevřít sidebar pro kroky se sidebar targety
  const sidebarTargets = ['sidebarLogoLink','tourNav','xpBarContainer','tourStartBtn'];
  if (window.innerWidth <= 960 && sidebarTargets.includes(step.targetId)) {
    if (typeof openSidebar === 'function') openSidebar();
  }

  if (step.section && typeof navigate === 'function') navigate(step.section);

  const delay = step.section ? 220 : 40;
  setTimeout(() => {
    _updateBubbleContent(step, index, direction);
    _positionBubble(step);
  }, delay);
}

/* ═══════════════════════════════════════════════════════
   OBSAH BUBLINY
═══════════════════════════════════════════════════════ */
function _updateBubbleContent(step, index, direction) {
  const bubble = document.getElementById('tourBubble');
  if (!bubble) return;

  const counterEl = document.getElementById('tourStepCounter');
  const iconEl    = document.getElementById('tourIcon');
  const titleEl   = document.getElementById('tourTitle');
  const textEl    = document.getElementById('tourText');
  const dotsEl    = document.getElementById('tourDots');
  const prevBtn   = document.getElementById('tourPrev');
  const nextBtn   = document.getElementById('tourNext');

  if (counterEl) counterEl.textContent = `${index + 1} / ${TOUR_STEPS.length}`;
  if (iconEl)    iconEl.textContent    = step.icon  || '⊞';
  if (titleEl)   titleEl.textContent   = step.title || '';
  if (textEl)    textEl.textContent    = step.text  || '';

  if (dotsEl) {
    dotsEl.innerHTML = TOUR_STEPS.map((_, i) => `
      <div class="tour-dot ${i === index ? 'active' : ''}"
           data-tour-dot="${i}" tabindex="0" role="button"
           aria-label="Krok ${i + 1}"></div>`).join('');
    dotsEl.querySelectorAll('[data-tour-dot]').forEach(dot => {
      dot.addEventListener('click', () => {
        const t = parseInt(dot.dataset.tourDot);
        _showStep(t, t > _tourStep ? 'next' : 'prev');
      });
      dot.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const t = parseInt(dot.dataset.tourDot);
          _showStep(t, t > _tourStep ? 'next' : 'prev');
        }
      });
    });
  }

  if (prevBtn) prevBtn.disabled = (index === 0);
  if (nextBtn) {
    const isLast = index === TOUR_STEPS.length - 1;
    nextBtn.textContent = isLast ? 'Hotovo ✓' : 'Další ›';
    nextBtn.classList.toggle('is-last', isLast);
  }

  bubble.classList.remove('hiding');
  void bubble.offsetWidth; // force reflow pro animaci
  bubble.classList.add('visible');
  bubble.classList.remove('step-next', 'step-prev');
  bubble.classList.add(direction === 'next' ? 'step-next' : 'step-prev');
  setTimeout(() => bubble.classList.remove('step-next', 'step-prev'), 320);
}

/* ═══════════════════════════════════════════════════════
   POZICOVÁNÍ
═══════════════════════════════════════════════════════ */
function _positionBubble(step) {
  const bubble = document.getElementById('tourBubble');
  const ring   = document.getElementById('tourHighlightRing');
  if (!bubble) return;

  const isMobile = window.innerWidth <= 640;

  if (isMobile) {
    _mobilePosition(bubble);
    _hideShadowsAndRing();
    return;
  }

  const target = step.targetId ? document.getElementById(step.targetId) : null;
  if (!target) {
    _centerBubble(bubble);
    _hideShadowsAndRing();
    return;
  }

  // Scroll cíle do zobrazení
  target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    const pad  = 8;

    // Ring
    if (ring) {
      ring.style.top    = `${rect.top    - pad}px`;
      ring.style.left   = `${rect.left   - pad}px`;
      ring.style.width  = `${rect.width  + pad * 2}px`;
      ring.style.height = `${rect.height + pad * 2}px`;
      ring.classList.add('visible');
    }

    // Stíny
    _setShadows(rect, pad);

    // Pozice bubliny
    const BW  = 318;
    const BH  = 300;
    const M   = 18;
    const vw  = window.innerWidth;
    const vh  = window.innerHeight;
    const pos = step.position || 'right';

    let top, left, arrowClass = '';

    switch (pos) {
      case 'right':
        left = rect.right + pad + M; top = rect.top + rect.height / 2 - BH / 2; arrowClass = 'arrow-left';
        if (left + BW > vw - M) { left = rect.left - BW - pad - M; arrowClass = 'arrow-right'; }
        break;
      case 'left':
        left = rect.left - BW - pad - M; top = rect.top + rect.height / 2 - BH / 2; arrowClass = 'arrow-right';
        if (left < M) { left = rect.right + pad + M; arrowClass = 'arrow-left'; }
        break;
      case 'bottom':
        top = rect.bottom + pad + M; left = rect.left + rect.width / 2 - BW / 2; arrowClass = 'arrow-top';
        if (top + BH > vh - M) { top = rect.top - BH - pad - M; arrowClass = 'arrow-bottom'; }
        break;
      case 'top':
        top = rect.top - BH - pad - M; left = rect.left + rect.width / 2 - BW / 2; arrowClass = 'arrow-bottom';
        if (top < M) { top = rect.bottom + pad + M; arrowClass = 'arrow-top'; }
        break;
    }

    top  = Math.max(M, Math.min(top,  vh - BH - M));
    left = Math.max(M, Math.min(left, vw - BW - M));

    bubble.style.top    = `${top}px`;
    bubble.style.left   = `${left}px`;
    bubble.style.width  = `${BW}px`;
    bubble.style.bottom = 'auto';
    bubble.style.right  = 'auto';
    bubble.className    = `tour-bubble visible ${arrowClass}`;
  });
}

/* ─────────────────────────────────────────────────────
   MOBILE — bublina dole uprostřed
───────────────────────────────────────────────────── */
function _mobilePosition(bubble) {
  bubble.style.cssText = [
    'position:fixed',
    'left:12px',
    'right:12px',
    'bottom:18px',
    'top:auto',
    `width:${Math.min(window.innerWidth - 24, 400)}px`,
  ].join(';');
  bubble.className = 'tour-bubble visible';
}

function _centerBubble(bubble) {
  const vw = window.innerWidth; const vh = window.innerHeight;
  bubble.style.top = `${Math.max(20, vh / 2 - 160)}px`;
  bubble.style.left = `${Math.max(20, vw / 2 - 159)}px`;
  bubble.style.width  = '318px';
  bubble.style.bottom = 'auto';
  bubble.style.right  = 'auto';
  bubble.className    = 'tour-bubble visible';
}

function _setShadows(rect, pad) {
  const vw = window.innerWidth; const vh = window.innerHeight;
  const t  = document.getElementById('tourShadowTop');
  const b  = document.getElementById('tourShadowBottom');
  const l  = document.getElementById('tourShadowLeft');
  const r  = document.getElementById('tourShadowRight');
  if (t) { t.style.top = '0'; t.style.height = `${Math.max(0, rect.top - pad)}px`; t.style.left = '0'; t.style.right = '0'; t.style.width = ''; }
  if (b) { b.style.top = `${rect.bottom + pad}px`; b.style.height = `${Math.max(0, vh - rect.bottom - pad)}px`; b.style.left = '0'; b.style.right = '0'; b.style.width = ''; }
  if (l) { l.style.top = `${rect.top - pad}px`; l.style.height = `${rect.height + pad*2}px`; l.style.left = '0'; l.style.width = `${Math.max(0, rect.left - pad)}px`; l.style.right = ''; }
  if (r) { r.style.top = `${rect.top - pad}px`; r.style.height = `${rect.height + pad*2}px`; r.style.left = `${rect.right + pad}px`; r.style.width = `${Math.max(0, vw - rect.right - pad)}px`; r.style.right = ''; }
}

function _hideShadowsAndRing() {
  const ring = document.getElementById('tourHighlightRing');
  if (ring) { ring.style.width = '0'; ring.style.height = '0'; }
  // Na mobilu — jen poloprůhledná vrstva nad vším krom bubliny
  const vh = window.innerHeight;
  const t  = document.getElementById('tourShadowTop');
  const b  = document.getElementById('tourShadowBottom');
  const l  = document.getElementById('tourShadowLeft');
  const r  = document.getElementById('tourShadowRight');
  if (t) { t.style.top = '0'; t.style.height = `${vh - 220}px`; t.style.left = '0'; t.style.right = '0'; t.style.width = ''; }
  if (b) { b.style.height = '0'; }
  if (l) { l.style.width = '0'; }
  if (r) { r.style.width = '0'; }
}

/* ═══════════════════════════════════════════════════════
   KONEC PRŮVODCE
═══════════════════════════════════════════════════════ */
function endTour() {
  _tourActive = false;
  if (window.innerWidth <= 960 && typeof closeSidebar === 'function') closeSidebar();

  document.querySelectorAll('.tour-shadow').forEach(el => el.classList.remove('visible'));
  const ring = document.getElementById('tourHighlightRing');
  if (ring) ring.classList.remove('visible');

  const bubble = document.getElementById('tourBubble');
  if (bubble) {
    bubble.classList.add('hiding');
    setTimeout(() => { bubble.className = 'tour-bubble'; }, 250);
  }

  localStorage.setItem('planify_tour_done', '1');
  showToast('Průvodce dokončen! Přejeme příjemné plánování. 🚀', 'success', 4000);
}

/* ═══════════════════════════════════════════════════════
   EVENTS
═══════════════════════════════════════════════════════ */
document.getElementById('tourStartBtn')?.addEventListener('click', () => {
  localStorage.removeItem('planify_tour_done');
  startTour();
});

document.getElementById('tourNext')?.addEventListener('click', () => {
  if (_tourStep >= TOUR_STEPS.length - 1) endTour();
  else _showStep(_tourStep + 1, 'next');
});

document.getElementById('tourPrev')?.addEventListener('click', () => {
  if (_tourStep > 0) _showStep(_tourStep - 1, 'prev');
});

document.getElementById('tourSkip')?.addEventListener('click', endTour);
document.getElementById('tourClose')?.addEventListener('click', endTour);

document.addEventListener('keydown', e => {
  if (!_tourActive) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight' || (e.key === 'Enter' && !e.target.closest('.tour-bubble [data-tour-dot]'))) {
    e.preventDefault();
    if (_tourStep >= TOUR_STEPS.length - 1) endTour();
    else _showStep(_tourStep + 1, 'next');
  }
  if (e.key === 'ArrowLeft') { e.preventDefault(); if (_tourStep > 0) _showStep(_tourStep - 1, 'prev'); }
  if (e.key === 'Escape')    { e.preventDefault(); endTour(); }
});

let _resizeTimer = null;
window.addEventListener('resize', () => {
  if (!_tourActive) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => _showStep(_tourStep), 220);
});

// Spustit scheduler připomínek
document.addEventListener('DOMContentLoaded', () => {
  if (typeof startReminderScheduler === 'function') startReminderScheduler();
});
