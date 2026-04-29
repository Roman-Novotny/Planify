/* ═══════════════════════════════════════════════════════
   Planify — js/shop.js
   XP Obchod — avatary, skiny, tituly, power-upy
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   KATALOG PŘEDMĚTŮ
───────────────────────────────────────────────────── */
const SHOP_ITEMS = [
  // ── AVATARY ────────────────────────────────────────
  {
    id:       'avatar_rocket',
    category: 'avatar',
    icon:     '🚀',
    name:     'Vesmírník',
    desc:     'Raketa pro ambiciózní průzkumníky',
    price:    100,
    badge:    'new',
  },
  {
    id:       'avatar_wizard',
    category: 'avatar',
    icon:     '🧙',
    name:     'Čaroděj',
    desc:     'Mistr produktivity a kouzel',
    price:    150,
    badge:    null,
  },
  {
    id:       'avatar_ninja',
    category: 'avatar',
    icon:     '🥷',
    name:     'Ninja',
    desc:     'Tichý a efektivní jako stín',
    price:    200,
    badge:    'popular',
  },
  {
    id:       'avatar_robot',
    category: 'avatar',
    icon:     '🤖',
    name:     'Robot',
    desc:     'Naprogramovaný pro úspěch',
    price:    175,
    badge:    null,
  },
  {
    id:       'avatar_crown',
    category: 'avatar',
    icon:     '👑',
    name:     'Král/Královna',
    desc:     'Pro ty kdo vládnou svému času',
    price:    300,
    badge:    null,
  },
  {
    id:       'avatar_dragon',
    category: 'avatar',
    icon:     '🐲',
    name:     'Drak',
    desc:     'Legendární síla a odhodlání',
    price:    500,
    badge:    null,
  },
  {
    id:       'avatar_unicorn',
    category: 'avatar',
    icon:     '🦄',
    name:     'Jednorožec',
    desc:     'Výjimečný ve všem co dělá',
    price:    400,
    badge:    null,
  },
  {
    id:       'avatar_phoenix',
    category: 'avatar',
    icon:     '🦅',
    name:     'Fénix',
    desc:     'Vždy povstane z popela',
    price:    750,
    badge:    null,
  },

  // ── TITULY ─────────────────────────────────────────
  {
    id:       'title_early_bird',
    category: 'title',
    icon:     '🌅',
    name:     'Ranní ptáče',
    desc:     'Zobrazí se pod vaším jménem',
    price:    80,
    badge:    null,
  },
  {
    id:       'title_night_owl',
    category: 'title',
    icon:     '🦉',
    name:     'Noční sova',
    desc:     'Pro ty kdo pracují do noci',
    price:    80,
    badge:    null,
  },
  {
    id:       'title_machine',
    category: 'title',
    icon:     '⚡',
    name:     'Výkonnostní stroj',
    desc:     'Produktivita na maximum',
    price:    200,
    badge:    'popular',
  },
  {
    id:       'title_zen',
    category: 'title',
    icon:     '🧘',
    name:     'Mistr zen',
    desc:     'Klid a soustředění',
    price:    150,
    badge:    null,
  },
  {
    id:       'title_legend',
    category: 'title',
    icon:     '🏆',
    name:     'Legenda',
    desc:     'Pro skutečné mistry Planify',
    price:    1000,
    badge:    null,
  },

  // ── POWER-UPY ──────────────────────────────────────
  {
    id:       'powerup_xp2',
    category: 'powerup',
    icon:     '✨',
    name:     '2× XP (24h)',
    desc:     'Dvojnásobné XP za vše na 24 hodin',
    price:    200,
    badge:    'new',
    consumable: true,
  },
  {
    id:       'powerup_streak',
    category: 'powerup',
    icon:     '🛡️',
    name:     'Štít streaku',
    desc:     'Ochrání váš streak před přerušením (1×)',
    price:    150,
    badge:    null,
    consumable: true,
  },
  {
    id:       'powerup_reminder',
    category: 'powerup',
    icon:     '⏰',
    name:     'Chytrá připomínka',
    desc:     'Připomínka úkolů 30 min před termínem',
    price:    100,
    badge:    null,
    consumable: false,
  },

  // ── SKINY APLIKACE ──────────────────────────────────
  {
    id:       'theme_sunset',
    category: 'theme',
    icon:     '🌅',
    name:     'Západ slunce',
    desc:     'Teplé oranžové a růžové tóny',
    price:    300,
    badge:    null,
  },
  {
    id:       'theme_ocean',
    category: 'theme',
    icon:     '🌊',
    name:     'Oceán',
    desc:     'Klidné modré a tyrkysové barvy',
    price:    300,
    badge:    'popular',
  },
  {
    id:       'theme_forest',
    category: 'theme',
    icon:     '🌲',
    name:     'Les',
    desc:     'Uklidňující zelené odstíny',
    price:    300,
    badge:    null,
  },
  {
    id:       'theme_galaxy',
    category: 'theme',
    icon:     '🌌',
    name:     'Galaxie',
    desc:     'Mystické fialové a tmavé barvy',
    price:    500,
    badge:    null,
  },
];

const SHOP_STORAGE_KEY    = 'planify_shop_owned';
const SHOP_ACTIVE_AVATAR  = 'planify_active_avatar';
const SHOP_ACTIVE_TITLE   = 'planify_active_title';
const SHOP_ACTIVE_THEME   = 'planify_active_theme';

let _shopTab = 'avatar'; // aktuální záložka

/* ─────────────────────────────────────────────────────
   VLASTNICTVÍ
───────────────────────────────────────────────────── */
function getOwnedItems() {
  try { return new Set(JSON.parse(localStorage.getItem(SHOP_STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function setOwnedItems(set) {
  try { localStorage.setItem(SHOP_STORAGE_KEY, JSON.stringify([...set])); } catch {}
}

function ownsItem(id) {
  return getOwnedItems().has(id);
}

/* ─────────────────────────────────────────────────────
   NÁKUP
───────────────────────────────────────────────────── */
function buyItem(id) {
  const item = SHOP_ITEMS.find(i => i.id === id);
  if (!item) return;

  // Získat aktuální XP
  let xp = 0;
  if (typeof loadXP === 'function') {
    xp = loadXP().xp || 0;
  } else {
    xp = parseInt(localStorage.getItem('planify_xp_simple') || '0');
  }

  if (xp < item.price) {
    showToast(`Nemáte dost XP. Potřebujete ${item.price} XP, máte ${xp} XP.`, 'warning', 4000);
    return;
  }

  if (ownsItem(id) && !item.consumable) {
    showToast('Tento předmět již vlastníte.', 'info');
    return;
  }

  // Odečíst XP
  if (typeof loadXP === 'function' && typeof saveXP === 'function') {
    const data = loadXP();
    data.xp -= item.price;
    saveXP(data);
    if (typeof updateXpBar === 'function') updateXpBar();
  } else {
    const cur = parseInt(localStorage.getItem('planify_xp_simple') || '0');
    localStorage.setItem('planify_xp_simple', String(cur - item.price));
  }

  // Přidat do vlastněných
  if (!item.consumable) {
    const owned = getOwnedItems();
    owned.add(id);
    setOwnedItems(owned);
  }

  showToast(`🎉 Zakoupeno: ${item.icon} ${item.name}!`, 'success', 4000);

  // Automaticky aktivovat
  _autoActivate(item);

  renderShop();
}

function _autoActivate(item) {
  switch (item.category) {
    case 'avatar':
      localStorage.setItem(SHOP_ACTIVE_AVATAR, item.id);
      _applyAvatar(item);
      break;
    case 'title':
      localStorage.setItem(SHOP_ACTIVE_TITLE, item.id);
      _applyTitle(item);
      break;
    case 'theme':
      localStorage.setItem(SHOP_ACTIVE_THEME, item.id);
      _applyThemeSkin(item);
      break;
    case 'powerup':
      if (item.id === 'powerup_xp2') _activateDoubleXP();
      break;
  }
}

/* ─────────────────────────────────────────────────────
   APLIKACE PŘEDMĚTŮ
───────────────────────────────────────────────────── */
function _applyAvatar(item) {
  // Aktualizovat avatar v sidebarú
  const avatarEl = document.getElementById('userAvatar');
  if (avatarEl) {
    avatarEl.textContent = '';
    avatarEl.className   = 'user-avatar-img';
    avatarEl.style.fontSize = '18px';
    avatarEl.textContent = item.icon;
  }
  showToast(`Avatar změněn na ${item.icon} ${item.name}`, 'success');
}

function _applyTitle(item) {
  // Přidat titulek pod jméno
  const emailEl = document.getElementById('userEmail');
  if (emailEl) {
    let titleEl = document.getElementById('userTitle');
    if (!titleEl) {
      titleEl = document.createElement('div');
      titleEl.id = 'userTitle';
      titleEl.style.cssText = 'font-size:10px;color:var(--accent-light);font-weight:700;margin-top:-1px';
      emailEl.parentNode?.insertBefore(titleEl, emailEl.nextSibling);
    }
    titleEl.textContent = `${item.icon} ${item.name}`;
  }
}

function _applyThemeSkin(item) {
  // Témata skrze CSS proměnné
  const themes = {
    theme_sunset: { accent: '#F97316', accentLight: '#FB923C', accentDim: 'rgba(249,115,22,0.14)' },
    theme_ocean:  { accent: '#06B6D4', accentLight: '#22D3EE', accentDim: 'rgba(6,182,212,0.14)'  },
    theme_forest: { accent: '#10B981', accentLight: '#34D399', accentDim: 'rgba(16,185,129,0.14)' },
    theme_galaxy: { accent: '#8B5CF6', accentLight: '#A78BFA', accentDim: 'rgba(139,92,246,0.14)' },
  };
  const t = themes[item.id];
  if (!t) return;
  document.documentElement.style.setProperty('--accent',       t.accent);
  document.documentElement.style.setProperty('--accent-light', t.accentLight);
  document.documentElement.style.setProperty('--accent-dim',   t.accentDim);
  showToast(`${item.icon} Motiv aplikace změněn na ${item.name}`, 'success');
}

function _activateDoubleXP() {
  const expiry = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem('planify_double_xp_until', String(expiry));
  showToast('✨ 2× XP aktivováno na 24 hodin!', 'success', 5000);
}

/* ─────────────────────────────────────────────────────
   INICIALIZACE — aplikovat aktivní předměty po načtení
───────────────────────────────────────────────────── */
function initShopEffects() {
  const activeAvatar = localStorage.getItem(SHOP_ACTIVE_AVATAR);
  const activeTitle  = localStorage.getItem(SHOP_ACTIVE_TITLE);
  const activeTheme  = localStorage.getItem(SHOP_ACTIVE_THEME);

  if (activeAvatar) {
    const item = SHOP_ITEMS.find(i => i.id === activeAvatar);
    if (item && ownsItem(activeAvatar)) _applyAvatar(item);
  }

  if (activeTitle) {
    const item = SHOP_ITEMS.find(i => i.id === activeTitle);
    if (item && ownsItem(activeTitle)) _applyTitle(item);
  }

  if (activeTheme) {
    const item = SHOP_ITEMS.find(i => i.id === activeTheme);
    if (item && ownsItem(activeTheme)) _applyThemeSkin(item);
  }
}

/* ─────────────────────────────────────────────────────
   RENDER OBCHODU
───────────────────────────────────────────────────── */
function renderShop() {
  const section = document.getElementById('section-shop');
  if (!section) return;

  // Získat XP
  let currentXP = 0;
  if (typeof loadXP === 'function') {
    currentXP = loadXP().xp || 0;
  } else {
    currentXP = parseInt(localStorage.getItem('planify_xp_simple') || '0');
  }

  const owned = getOwnedItems();

  // Filtrovat dle záložky
  const items = SHOP_ITEMS.filter(i => i.category === _shopTab);

  const tabLabels = {
    avatar:  '🧑 Avatary',
    title:   '🏷️ Tituly',
    theme:   '🎨 Motivy',
    powerup: '⚡ Power-upy',
  };

  section.innerHTML = `
    <div class="section-header">
      <div>
        <h2>XP Obchod</h2>
        <div class="section-sub">Utrácejte XP body za odměny a vylepšení</div>
      </div>
    </div>

    <!-- XP přehled -->
    <div class="shop-xp-header">
      <div class="shop-xp-balance">
        <div class="shop-xp-icon">⭐</div>
        <div>
          <div class="shop-xp-amount">${currentXP.toLocaleString('cs-CZ')} XP</div>
          <div class="shop-xp-label">Váš aktuální zůstatek</div>
        </div>
      </div>
      <div class="shop-tabs">
        ${Object.entries(tabLabels).map(([key, label]) => `
          <button class="shop-tab ${_shopTab === key ? 'active' : ''}"
                  data-shop-tab="${key}">
            ${label}
          </button>`).join('')}
      </div>
    </div>

    <!-- Předměty -->
    <div class="shop-grid">
      ${items.map(item => {
        const isOwned   = owned.has(item.id);
        const canAfford = currentXP >= item.price;
        const isActive  = _isItemActive(item);

        return `
        <div class="shop-item ${isOwned ? 'owned' : ''} ${!canAfford && !isOwned ? 'locked' : ''}">
          ${item.badge ? `<div class="shop-item-badge ${item.badge}">${item.badge === 'new' ? 'Nové' : 'Populární'}</div>` : ''}

          <div class="avatar-preview">
            <span>${item.icon}</span>
          </div>

          <div class="shop-item-name">${escHtml(item.name)}</div>
          <div class="shop-item-desc">${escHtml(item.desc)}</div>

          ${!isOwned ? `
            <div class="shop-item-price">
              <span>⭐</span>
              <span>${item.price} XP</span>
            </div>` : ''}

          <button class="btn-buy ${isOwned ? 'is-owned' : canAfford ? 'can-buy' : 'cant-buy'}"
                  ${isOwned || !canAfford ? (isOwned ? '' : 'disabled') : ''}
                  data-buy-item="${item.id}">
            ${isOwned
              ? (isActive ? '✓ Aktivní' : '✓ Vlastním')
              : canAfford
                ? 'Koupit'
                : `Chybí ${item.price - currentXP} XP`}
          </button>

          ${isOwned && !isActive && item.category !== 'powerup' ? `
            <button class="btn-buy can-buy" style="margin-top:-4px;background:var(--accent-dim);color:var(--accent-light);box-shadow:none"
                    data-activate-item="${item.id}">
              Aktivovat
            </button>` : ''}
        </div>`;
      }).join('')}
    </div>
  `;

  // Events
  section.querySelectorAll('[data-shop-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      _shopTab = btn.dataset.shopTab;
      renderShop();
    });
  });

  section.querySelectorAll('[data-buy-item]').forEach(btn => {
    btn.addEventListener('click', () => buyItem(btn.dataset.buyItem));
  });

  section.querySelectorAll('[data-activate-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = SHOP_ITEMS.find(i => i.id === btn.dataset.activateItem);
      if (item) _autoActivate(item);
      renderShop();
    });
  });
}

function _isItemActive(item) {
  switch (item.category) {
    case 'avatar': return localStorage.getItem(SHOP_ACTIVE_AVATAR) === item.id;
    case 'title':  return localStorage.getItem(SHOP_ACTIVE_TITLE)  === item.id;
    case 'theme':  return localStorage.getItem(SHOP_ACTIVE_THEME)  === item.id;
    default: return false;
  }
}
