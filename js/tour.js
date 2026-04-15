/* ═══════════════════════════════════════════════════════
   Planify — js/tour.js
   Interaktivní průvodce — komiksové bubliny, kroky,
   zvýraznění prvků, animace přechodů
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   KROKY PRŮVODCE
───────────────────────────────────────────────────── */
const TOUR_STEPS = [
  {
    targetId:  'sidebarLogoLink',
    section:   null,
    icon:      '👋',
    title:     'Vítejte v Planify!',
    text:      'Toto je váš osobní dashboard pro produktivitu. Pojďme si ukázat, co všechno umí. Průvodce vás provede hlavními funkcemi — trvá jen pár minut.',
    position:  'right',
  },
  {
    targetId:  'tourNav',
    section:   'dashboard',
    icon:      '⊞',
    title:     'Navigace',
    text:      'V levém panelu najdete přístup ke všem sekcím: Úkoly, Kalendář, Návyky, Pomodoro, Finance, Cíle a Poznámky. Kliknutím přejdete do dané sekce.',
    position:  'right',
  },
  {
    targetId:  'tourStats',
    section:   'dashboard',
    icon:      '📊',
    title:     'Dashboard — přehled',
    text:      'Na hlavním dashboardu vidíte okamžitý přehled: kolik máte úkolů dnes, kolik návyků jste splnili, váš finanční zůstatek a počet aktivních cílů.',
    position:  'bottom',
  },
  {
    targetId:  'section-tasks',
    section:   'tasks',
    icon:      '✓',
    title:     'Správa úkolů',
    text:      'Přidávejte úkoly s termíny, prioritami a kategoriemi. Filtrujte je podle stavu nebo kategorie, řaďte dle termínu nebo priority. Splněné úkoly označte kliknutím na kroužek.',
    position:  'top',
  },
  {
    targetId:  'section-finance',
    section:   'finance',
    icon:      '◈',
    title:     'Finance',
    text:      'Sledujte příjmy a výdaje, nastavte si měsíční rozpočty a dostávejte upozornění při překročení. Grafy zobrazují přehled za posledních 6 měsíců a rozložení výdajů dle kategorií.',
    position:  'top',
  },
  {
    targetId:  'section-habits',
    section:   'habits',
    icon:      '◎',
    title:     'Návyky a streaky',
    text:      'Sledujte denní návyky a budujte sérii (streak). Každý den označte splněné návyky — vizuální tečky ukazují posledních 7 dní. Při splnění 7, 14 nebo 21 dní dostanete odměnu!',
    position:  'top',
  },
  {
    targetId:  'section-pomodoro',
    section:   'pomodoro',
    icon:      '◷',
    title:     'Pomodoro časovač',
    text:      'Pracujte ve 25minutových blocích s krátkými přestávkami. Po každém 4. sezení automaticky nastane dlouhá přestávka. Přiřaďte si úkol ke každému sezení pro lepší přehled.',
    position:  'top',
  },
  {
    targetId:  'tourStartBtn',
    section:   null,
    icon:      '🎉',
    title:     'Jste připraveni!',
    text:      'To je vše! Průvodce si můžete kdykoli spustit znovu kliknutím na tlačítko „Nápověda" v levém panelu. Hodně úspěchů s Planify!',
    position:  'right',
  },
];

/* ─────────────────────────────────────────────────────
   STAV PRŮVODCE
───────────────────────────────────────────────────── */
let _tourActive  = false;
let _tourStep    = 0;

/* ═══════════════════════════════════════════════════════
   SPUŠTĚNÍ PRŮVODCE
═══════════════════════════════════════════════════════ */
function startTour() {
  _tourActive = true;
  _tourStep   = 0;

  // Zobrazit stínové pruhy
  document.querySelectorAll('.tour-shadow').forEach(el => el.classList.add('visible'));
  document.getElementById('tourHighlightRing')?.classList.add('visible');

  _showStep(0);
}

/* ═══════════════════════════════════════════════════════
   ZOBRAZENÍ KROKU
═══════════════════════════════════════════════════════ */
function _showStep(index, direction = 'next') {
  if (index < 0 || index >= TOUR_STEPS.length) return;

  _tourStep = index;
  const step = TOUR_STEPS[index];

  // Navigovat na správnou sekci
  if (step.section) navigate(step.section);

  // Krátká prodleva pro render sekce
  setTimeout(() => {
    _positionBubble(step, direction);
    _updateBubbleContent(step, index);
  }, step.section ? 180 : 30);
}

/* ═══════════════════════════════════════════════════════
   AKTUALIZACE OBSAHU BUBLINY
═══════════════════════════════════════════════════════ */
function _updateBubbleContent(step, index) {
  const bubble = document.getElementById('tourBubble');
  if (!bubble) return;

  // Counter
  const counterEl = document.getElementById('tourStepCounter');
  if (counterEl) counterEl.textContent = `${index + 1} / ${TOUR_STEPS.length}`;

  // Ikona
  const iconEl = document.getElementById('tourIcon');
  if (iconEl) iconEl.textContent = step.icon || '⊞';

  // Titulek a text
  const titleEl = document.getElementById('tourTitle');
  const textEl  = document.getElementById('tourText');
  if (titleEl) titleEl.textContent = step.title;
  if (textEl)  textEl.textContent  = step.text;

  // Progress tečky
  const dotsEl = document.getElementById('tourDots');
  if (dotsEl) {
    dotsEl.innerHTML = TOUR_STEPS.map((_, i) => `
      <div class="tour-dot ${i === index ? 'active' : ''}"
           data-tour-dot="${i}"
           title="Krok ${i + 1}"
           tabindex="0"
           role="button"
           aria-label="Přejít na krok ${i + 1}"></div>`
    ).join('');

    // Klik na tečku = přejít na krok
    dotsEl.querySelectorAll('[data-tour-dot]').forEach(dot => {
      dot.addEventListener('click', () => {
        const targetStep = parseInt(dot.dataset.tourDot);
        _showStep(targetStep, targetStep > _tourStep ? 'next' : 'prev');
      });
    });
  }

  // Tlačítko Zpět
  const prevBtn = document.getElementById('tourPrev');
  if (prevBtn) prevBtn.disabled = index === 0;

  // Tlačítko Další / Hotovo
  const nextBtn = document.getElementById('tourNext');
  if (nextBtn) {
    const isLast = index === TOUR_STEPS.length - 1;
    nextBtn.textContent = isLast ? 'Hotovo ✓' : 'Další ›';
    nextBtn.classList.toggle('is-last', isLast);
  }

  // Zobrazit bublinu
  bubble.classList.remove('hiding');
  bubble.classList.add('visible');
}

/* ═══════════════════════════════════════════════════════
   POZICOVÁNÍ BUBLINY A HIGHLIGHT RINGU
═══════════════════════════════════════════════════════ */
function _positionBubble(step, direction = 'next') {
  const bubble    = document.getElementById('tourBubble');
  const ring      = document.getElementById('tourHighlightRing');
  if (!bubble) return;

  const target = step.targetId ? document.getElementById(step.targetId) : null;

  if (!target) {
    // Žádný cíl — zobrazit uprostřed
    _centerBubble(bubble);
    _hideRing();
    _setFullShadow();
    return;
  }

  // Získat rozměry a pozici cíle
  const rect    = target.getBoundingClientRect();
  const padding = 8; // px mezera kolem zvýrazněného prvku

  // Pozicovat highlight ring
  if (ring) {
    ring.style.top    = `${rect.top    - padding}px`;
    ring.style.left   = `${rect.left   - padding}px`;
    ring.style.width  = `${rect.width  + padding * 2}px`;
    ring.style.height = `${rect.height + padding * 2}px`;
    ring.classList.add('visible');
  }

  // Nastavit stínové pruhy (4 obdélníky kolem prvku)
  _setShadowsAroundRect(rect, padding);

  // Scroll prvku do viditelné oblasti
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Animace přechodu
  bubble.classList.add(direction === 'next' ? 'step-next' : 'step-prev');
  setTimeout(() => bubble.classList.remove('step-next', 'step-prev'), 300);

  // Vypočítat pozici bubliny
  const bubbleW = 310;
  const bubbleH = 280; // Odhadovaná výška
  const margin  = 16;  // Mezera od zvýrazněného prvku
  const vw      = window.innerWidth;
  const vh      = window.innerHeight;

  let top, left;
  let arrowClass = '';
  const pos = step.position || 'right';

  switch (pos) {
    case 'right':
      left      = rect.right + margin + padding;
      top       = rect.top + rect.height / 2 - bubbleH / 2;
      arrowClass = 'arrow-left';
      // Přetečení doprava
      if (left + bubbleW > vw - margin) {
        left      = rect.left - bubbleW - margin - padding;
        arrowClass = 'arrow-right';
      }
      break;

    case 'left':
      left      = rect.left - bubbleW - margin - padding;
      top       = rect.top + rect.height / 2 - bubbleH / 2;
      arrowClass = 'arrow-right';
      if (left < margin) {
        left      = rect.right + margin + padding;
        arrowClass = 'arrow-left';
      }
      break;

    case 'bottom':
      top       = rect.bottom + margin + padding;
      left      = rect.left + rect.width / 2 - bubbleW / 2;
      arrowClass = 'arrow-top';
      if (top + bubbleH > vh - margin) {
        top       = rect.top - bubbleH - margin - padding;
        arrowClass = 'arrow-bottom';
      }
      break;

    case 'top':
      top       = rect.top - bubbleH - margin - padding;
      left      = rect.left + rect.width / 2 - bubbleW / 2;
      arrowClass = 'arrow-bottom';
      if (top < margin) {
        top       = rect.bottom + margin + padding;
        arrowClass = 'arrow-top';
      }
      break;
  }

  // Clamp do okna
  top  = Math.max(margin, Math.min(top,  vh - bubbleH - margin));
  left = Math.max(margin, Math.min(left, vw - bubbleW - margin));

  bubble.style.top    = `${top}px`;
  bubble.style.left   = `${left}px`;
  bubble.style.width  = `${bubbleW}px`;

  // Nastavit třídu šipky
  bubble.className = `tour-bubble visible ${arrowClass}`;
}

/* ─────────────────────────────────────────────────────
   SHADOW HELPERS
───────────────────────────────────────────────────── */
function _setShadowsAroundRect(rect, padding = 8) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const p  = padding;

  const top    = document.getElementById('tourShadowTop');
  const bottom = document.getElementById('tourShadowBottom');
  const left   = document.getElementById('tourShadowLeft');
  const right  = document.getElementById('tourShadowRight');

  if (top) {
    top.style.top    = '0';
    top.style.height = `${Math.max(0, rect.top - p)}px`;
  }

  if (bottom) {
    bottom.style.top    = `${rect.bottom + p}px`;
    bottom.style.height = `${Math.max(0, vh - rect.bottom - p)}px`;
  }

  if (left) {
    left.style.top    = `${rect.top - p}px`;
    left.style.height = `${rect.height + p * 2}px`;
    left.style.width  = `${Math.max(0, rect.left - p)}px`;
  }

  if (right) {
    right.style.top    = `${rect.top - p}px`;
    right.style.height = `${rect.height + p * 2}px`;
    right.style.left   = `${rect.right + p}px`;
    right.style.width  = `${Math.max(0, vw - rect.right - p)}px`;
  }
}

function _setFullShadow() {
  // Celá obrazovka zakrytá (pro kroky bez cíle)
  ['tourShadowTop', 'tourShadowBottom', 'tourShadowLeft', 'tourShadowRight'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.cssText = '';
      el.style.inset = '0';
    }
  });
  _hideRing();
}

function _hideRing() {
  const ring = document.getElementById('tourHighlightRing');
  if (ring) {
    ring.style.width  = '0';
    ring.style.height = '0';
  }
}

function _centerBubble(bubble) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  bubble.style.top  = `${vh / 2 - 160}px`;
  bubble.style.left = `${vw / 2 - 155}px`;
  bubble.className  = 'tour-bubble visible';
}

/* ═══════════════════════════════════════════════════════
   UKONČENÍ PRŮVODCE
═══════════════════════════════════════════════════════ */
function endTour() {
  _tourActive = false;

  // Skrýt stíny a ring
  document.querySelectorAll('.tour-shadow').forEach(el => el.classList.remove('visible'));

  const ring = document.getElementById('tourHighlightRing');
  if (ring) ring.classList.remove('visible');

  // Skrýt bublinu s animací
  const bubble = document.getElementById('tourBubble');
  if (bubble) {
    bubble.classList.add('hiding');
    setTimeout(() => {
      bubble.classList.remove('visible', 'hiding');
      // Reset šipky
      bubble.className = 'tour-bubble';
    }, 220);
  }

  // Zapamatovat, že průvodce byl dokončen
  localStorage.setItem('planify_tour_done', '1');

  showToast('Průvodce dokončen! Přejeme příjemné plánování. 🚀', 'success', 4000);
}

/* ═══════════════════════════════════════════════════════
   EVENT LISTENERY PRŮVODCE
═══════════════════════════════════════════════════════ */

// Tlačítko Nápověda (spustit průvodce)
document.getElementById('tourStartBtn')?.addEventListener('click', () => {
  // Reset — znovu od začátku
  localStorage.removeItem('planify_tour_done');
  startTour();
});

// Tlačítko Další
document.getElementById('tourNext')?.addEventListener('click', () => {
  if (_tourStep >= TOUR_STEPS.length - 1) {
    endTour();
  } else {
    _showStep(_tourStep + 1, 'next');
  }
});

// Tlačítko Zpět
document.getElementById('tourPrev')?.addEventListener('click', () => {
  if (_tourStep > 0) _showStep(_tourStep - 1, 'prev');
});

// Přeskočit průvodce
document.getElementById('tourSkip')?.addEventListener('click', endTour);

// Zavřít průvodce (X tlačítko)
document.getElementById('tourClose')?.addEventListener('click', endTour);

// Klávesnice
document.addEventListener('keydown', e => {
  if (!_tourActive) return;

  if (e.key === 'ArrowRight' || e.key === 'Enter') {
    e.preventDefault();
    if (_tourStep >= TOUR_STEPS.length - 1) endTour();
    else _showStep(_tourStep + 1, 'next');
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (_tourStep > 0) _showStep(_tourStep - 1, 'prev');
  }

  if (e.key === 'Escape') {
    e.preventDefault();
    endTour();
  }
});

// Přepočítat pozici při resize okna
let _resizeTimer = null;
window.addEventListener('resize', () => {
  if (!_tourActive) return;
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    _showStep(_tourStep);
  }, 200);
});
