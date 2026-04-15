# Planify — Osobní produktivní dashboard

Moderní webová aplikace pro správu úkolů, návyků, financí, cílů a poznámek. Postavena na čistém HTML/CSS/JS s Supabase backendem.

---

## 🚀 Rychlý start

### 1. Supabase projekt

1. Vytvořte účet na [supabase.com](https://supabase.com)
2. Vytvořte nový projekt
3. V **SQL Editor** spusťte celý skript z `database.sql`
4. Zkopírujte **Project URL** a **anon/public key** z `Settings → API`

### 2. Konfigurace aplikace

Otevřete soubor `js/supabase.js` a vyplňte:

```javascript
const SUPABASE_URL  = 'https://VAŠE-ID.supabase.co';
const SUPABASE_ANON = 'eyVÁŠ-ANON-KLÍČ';
```

### 3. Přidejte loga

Do složky `img/` přidejte dva soubory:
- `logo-text-tmav.png` — logo pro tmavý režim (doporučená výška: 34–44 px)
- `logo-text-svet.png` — logo pro světlý režim

### 4. Spuštění

Otevřete `index.html` v prohlížeči, nebo nahrajte na GitHub Pages / Netlify / Vercel.

---

## 📁 Struktura souborů

```
planify/
├── index.html          ← Přihlašovací stránka
├── app.html            ← Hlavní aplikace
├── database.sql        ← SQL skript pro Supabase
├── img/
│   ├── logo-text-tmav.png
│   └── logo-text-svet.png
├── css/
│   ├── auth.css        ← Styly přihlašovací stránky
│   ├── app.css         ← Styly hlavní aplikace
│   └── tour.css        ← Styly interaktivního průvodce
└── js/
    ├── supabase.js     ← Konfigurace + sdílené utility
    ├── auth.js         ← Přihlášení / registrace
    ├── app.js          ← Navigace, inicializace, dashboard
    ├── tasks.js        ← Správa úkolů
    ├── finance.js      ← Finance, grafy, rozpočty
    ├── habits.js       ← Návyky a streaky
    ├── goals.js        ← Cíle a milníky
    ├── notes.js        ← Poznámky s Markdown
    ├── calendar.js     ← Kalendář (měsíc/týden)
    ├── pomodoro.js     ← Pomodoro časovač
    ├── notifications.js← Browser notifikace
    └── tour.js         ← Interaktivní průvodce
```

---

## 🗄️ Databázové tabulky

| Tabulka | Popis |
|---------|-------|
| `tasks` | Úkoly s termíny, prioritami a kategoriemi |
| `events` | Kalendářní události |
| `habits` | Návyky se streaky |
| `habit_logs` | Denní záznamy splnění návyků |
| `finance_records` | Příjmy a výdaje |
| `finance_categories` | Vlastní finance kategorie |
| `budgets` | Měsíční limity výdajů |
| `goals` | Dlouhodobé cíle s progress sledováním |
| `notes` | Poznámky s Markdown podporou |

Všechny tabulky mají **Row Level Security** — každý uživatel vidí pouze svá data.

---

## ✨ Funkce

### Úkoly
- Přidávání, úprava, mazání
- Kategorie (Práce, Osobní, Zdraví, Finance, Ostatní)
- Priority (Vysoká, Střední, Nízká)
- Termíny s upozorněním na prošlé
- Filtry: Vše / Dnes / Aktivní / Splněné
- Řazení dle termínu, priority nebo názvu

### Kalendář
- Měsíční a týdenní pohled
- Přidávání událostí s výběrem barvy
- Zobrazení úkolů s termíny v kalendáři
- Seznam nadcházejících událostí

### Návyky
- Denní označování splnění
- Streak (série) s automatickým počítáním
- Vizuální tečky posledních 7 dní
- Progress bar k cílovému počtu dní
- Milníkové notifikace (7, 14, 21 dní)

### Pomodoro
- 3 režimy: Práce (25 min), Krátká pauza (5 min), Dlouhá pauza (15 min)
- Animovaný SVG kruhový časovač
- Automatické přepínání po dokončení
- Každé 4. sezení = dlouhá pauza
- Přiřazení úkolu k sezení
- Historie sezení v localStorage

### Finance
- Příjmy a výdaje s kategoriemi
- Vlastní kategorie (CRUD)
- Měsíční rozpočty s upozorněním od 80 %
- Graf příjmů vs výdajů (6 měsíců)
- Doughnut graf výdajů dle kategorií
- Filtrování dle měsíce a typu

### Cíle
- Progress s libovolnou hodnotou a jednotkou
- Termín s odpočtem zbývajících dní
- Milníkové notifikace (50 %, 75 %, 100 %)
- Aktualizace pokroku přímo na kartě

### Poznámky
- Markdown editor: **tučné**, *kurzíva*, ## nadpis, - seznam, ---
- Live náhled vykresleného Markdownu
- Bez zobrazení syntaxe (`**` se nezobrazí)
- Vyhledávání s zvýrazněním nalezených slov
- Klávesová zkratka Ctrl+S pro uložení

### Interaktivní průvodce
- 8 kroků procházení aplikací
- Komiksové bubliny s šipkami
- Zvýrazňování prvků (ring + shadow overlay)
- Klávesové šipky pro navigaci
- Tečky pro přeskakování kroků
- Lze kdykoli spustit znovu tlačítkem „Nápověda"

### Notifikace
- Browser Notification API
- Upozornění na dnešní a prošlé úkoly
- Večerní připomínka nesplněných návyků
- Upozornění při překročení rozpočtu
- Notifikace po dokončení Pomodoro sezení

---

## 🌐 Nasazení na GitHub Pages

1. Vytvořte GitHub repository
2. Nahrajte všechny soubory
3. V nastavení repository: `Settings → Pages → Deploy from branch → main`
4. Po chvíli bude aplikace dostupná na `https://USERNAME.github.io/REPO`

### Důležité pro GitHub Pages
- Soubory musí být v kořeni repository nebo ve složce `/docs`
- Ujistěte se, že `js/supabase.js` má vyplněné credentials
- V Supabase: `Authentication → URL Configuration` přidejte GitHub Pages URL do **Allowed Origins**

---

## 🔧 Nastavení Supabase Auth

V Supabase Dashboard:
1. `Authentication → Providers` — Email je výchozí, povolte dle potřeby
2. `Authentication → URL Configuration`:
   - **Site URL**: URL vaší aplikace (např. `https://username.github.io/planify`)
   - **Redirect URLs**: stejná URL + `/app.html`
3. Pokud nechcete potvrzení emailem:
   `Authentication → Settings → Disable email confirmations`

---

## 🎨 Přizpůsobení

### Barvy (CSS proměnné v `css/app.css`)
```css
:root {
  --accent:       #6366F1;  /* Hlavní barva */
  --accent-light: #818CF8;  /* Světlejší varianta */
  --green:        #34D399;  /* Úspěch */
  --red:          #F87171;  /* Chyba / varování */
}
```

### Pomodoro délky (`js/pomodoro.js`)
```javascript
const POMO_DURATIONS = {
  work:  25 * 60,  // Změňte dle potřeby
  short:  5 * 60,
  long:  15 * 60,
};
```

---

## 📋 Požadavky prohlížeče

| Funkce | Podpora |
|--------|---------|
| CSS Grid / Flexbox | Všechny moderní prohlížeče |
| Notification API | Chrome, Firefox, Edge (ne Safari iOS) |
| localStorage | Všechny prohlížeče |
| ES2020+ | Chrome 80+, Firefox 75+, Edge 80+, Safari 13.1+ |

---

## 🔑 Přihlašovací údaje (demo)

Pro testování si zaregistrujte účet přímo v aplikaci. Každý uživatel má izolovaná data díky Row Level Security v Supabase.

---

*Planify — postaveno s ❤️ na HTML, CSS, JavaScript a Supabase*
