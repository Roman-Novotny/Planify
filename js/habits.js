/* ═══════════════════════════════════════════════════════
   Planify — js/habits.js
   Sledování návyků — streaky, logy, vizuální tečky
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   STAV MODULU
───────────────────────────────────────────────────── */
let habitEditId = null; // ID editovaného návyku (null = nový)

/* ═══════════════════════════════════════════════════════
   RENDER MŘÍŽKY NÁVYKŮ
═══════════════════════════════════════════════════════ */
function renderHabits() {
  const D    = window.APP_DATA;
  const list = document.getElementById('habitsList');
  if (!list) return;

  if (D.habits.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">◎</div>
        <div class="empty-state-title">Žádné návyky</div>
        <div class="empty-state-sub">Přidejte první návyk a začněte budovat lepší rutiny.</div>
      </div>`;
    return;
  }

  // Zkratky dnů v týdnu (česky, pondělí = index 1)
  const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

  list.innerHTML = D.habits.map(h => {
    const doneTodayKey = `${h.id}_${today()}`;
    const doneToday    = !!D.habitLogs[doneTodayKey];

    // Procento splnění cíle (dle streak)
    const goalDays = h.goal_days || 30;
    const streak   = h.streak    || 0;
    const pct      = Math.min(100, Math.round((streak / goalDays) * 100));

    // Posledních 7 dní pro vizuální tečky
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date();
      d.setDate(d.getDate() - i);
      const ds   = d.toISOString().slice(0, 10);
      const done = !!D.habitLogs[`${h.id}_${ds}`];
      last7.push({ ds, done, dayName: DAY_NAMES[d.getDay()] });
    }

    return `
    <div class="habit-card" role="listitem">

      <!-- Hlavička -->
      <div class="habit-header">
        <div class="habit-title-row">
          <div class="habit-icon">${h.icon || '◎'}</div>
          <div class="habit-name">${escHtml(h.name)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="habit-streak" title="Aktuální streak">
            <span class="streak-count">${streak}</span>
            🔥
          </div>
          <button class="icon-btn"
                  data-edit-habit="${escHtml(h.id)}"
                  title="Upravit návyk"
                  aria-label="Upravit ${escHtml(h.name)}">✎</button>
          <button class="icon-btn del"
                  data-del-habit="${escHtml(h.id)}"
                  title="Smazat návyk"
                  aria-label="Smazat ${escHtml(h.name)}">✕</button>
        </div>
      </div>

      <!-- Vizuální tečky — posledních 7 dní -->
      <div class="habit-dots" role="group" aria-label="Posledních 7 dní">
        ${last7.map(d => `
          <div class="habit-dot ${d.done ? 'done' : ''}"
               style="${d.done ? `background:${h.color || '#6366F1'}` : ''}"
               title="${d.ds}${d.done ? ' ✓' : ''}">
            <span>${d.done ? '✓' : ''}</span>
            <span class="habit-dot-label">${d.dayName}</span>
          </div>`).join('')}
      </div>

      <!-- Progress bar -->
      <div class="habit-progress-bar" role="progressbar"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"
           aria-label="Pokrok: ${pct}%">
        <div class="habit-progress-fill"
             style="width:${pct}%;background:${h.color || '#6366F1'}">
        </div>
      </div>
      <div class="habit-progress-label">
        <span>${streak} / ${goalDays} dní</span>
        <span>${pct} %</span>
      </div>

      <!-- Akce -->
      <div class="habit-actions">
        <button class="btn-check-habit ${doneToday ? 'is-done' : 'not-done'}"
                data-habit-check="${escHtml(h.id)}"
                aria-pressed="${doneToday}">
          ${doneToday ? '✓ Splněno dnes' : '○ Označit jako splněno'}
        </button>
      </div>

    </div>`;
  }).join('');

  // ── Events ───────────────────────────────────────────
  list.querySelectorAll('[data-habit-check]').forEach(btn => {
    btn.addEventListener('click', () => toggleHabit(btn.dataset.habitCheck));
  });

  list.querySelectorAll('[data-edit-habit]').forEach(btn => {
    btn.addEventListener('click', () => openEditHabit(btn.dataset.editHabit));
  });

  list.querySelectorAll('[data-del-habit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const habit = window.APP_DATA.habits.find(h => h.id === btn.dataset.delHabit);
      confirmDelete(
        `Opravdu smazat návyk „${habit?.name || ''}"? Smaže se i celá historie.`,
        () => deleteHabit(btn.dataset.delHabit)
      );
    });
  });
}

/* ═══════════════════════════════════════════════════════
   TOGGLE SPLNĚNO/NESPLNĚNO
═══════════════════════════════════════════════════════ */
async function toggleHabit(id) {
  const habit  = window.APP_DATA.habits.find(h => h.id === id);
  if (!habit) return;

  const todayStr   = today();
  const logKey     = `${id}_${todayStr}`;
  const wasChecked = !!window.APP_DATA.habitLogs[logKey];

  if (wasChecked) {
    // ── Odoznačit ─────────────────────────────────────
    delete window.APP_DATA.habitLogs[logKey];
    habit.streak = Math.max(0, (habit.streak || 0) - 1);

    // Okamžitá UI reakce
    renderHabits();
    renderDashboard();

    // DB — smazat log
    await window.supabaseClient
      .from('habit_logs')
      .delete()
      .eq('habit_id', id)
      .eq('log_date', todayStr);

    // DB — aktualizovat streak
    await window.supabaseClient
      .from('habits')
      .update({ streak: habit.streak })
      .eq('id', id);

    showToast('Návyk odoznačen', 'info');

  } else {
    // ── Označit ───────────────────────────────────────
    window.APP_DATA.habitLogs[logKey] = true;

    // Streak logika:
    // Pokud byl yesterday také splněn → streak++
    // Pokud ne → streak = 1 (nový začátek)
    const yesterday    = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const ydKey        = `${id}_${yesterdayStr}`;

    const prevStreak = habit.streak || 0;
    if (window.APP_DATA.habitLogs[ydKey] || prevStreak === 0) {
      habit.streak = prevStreak + 1;
    } else {
      habit.streak = 1; // Přerušený streak — začínáme znovu
    }

    // Okamžitá UI reakce
    renderHabits();
    renderDashboard();

    // DB — vložit log (upsert kvůli unique constraint)
    const { error: logError } = await window.supabaseClient
      .from('habit_logs')
      .upsert({
        habit_id: id,
        user_id:  currentUser.id,
        log_date: todayStr,
      });

    if (logError) {
      console.error('[Planify] habit log error:', logError);
    }

    // DB — aktualizovat streak
    await window.supabaseClient
      .from('habits')
      .update({ streak: habit.streak })
      .eq('id', id);

    // Toast + milníkové notifikace
    if (habit.streak > 0 && habit.streak % 7 === 0) {
      showToast(`🔥 ${habit.streak} dní v řadě! Skvělá práce!`, 'success', 5000);
      if (typeof sendBrowserNotification === 'function') {
        sendBrowserNotification(
          `🔥 ${habit.streak} dní streak!`,
          `${habit.name} — nevzdávej to!`
        );
      }
    } else if (habit.streak === 1) {
      showToast(`Návyk zahájen! Začínáte sérii.`, 'success');
    } else {
      showToast('Návyk splněn ✓', 'success');
    }
  }
}

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — nový návyk
═══════════════════════════════════════════════════════ */
document.getElementById('addHabitBtn')?.addEventListener('click', () => {
  habitEditId = null;
  document.getElementById('habitModalTitle').textContent = 'Nový návyk';
  document.getElementById('habitName').value  = '';
  document.getElementById('habitIcon').value  = '';
  document.getElementById('habitColor').value = '#6366F1';
  document.getElementById('habitGoal').value  = '30';
  _clearHabitErrors();
  openModal('habitModal');
});

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — editace
═══════════════════════════════════════════════════════ */
function openEditHabit(id) {
  const habit = window.APP_DATA.habits.find(h => h.id === id);
  if (!habit) return;

  habitEditId = id;
  document.getElementById('habitModalTitle').textContent = 'Upravit návyk';
  document.getElementById('habitName').value  = habit.name        || '';
  document.getElementById('habitIcon').value  = habit.icon        || '';
  document.getElementById('habitColor').value = habit.color       || '#6366F1';
  document.getElementById('habitGoal').value  = habit.goal_days   || 30;
  _clearHabitErrors();
  openModal('habitModal');
}

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ NÁVYKU
═══════════════════════════════════════════════════════ */
document.getElementById('saveHabitBtn')?.addEventListener('click', saveHabit);

document.getElementById('habitName')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveHabit(); }
});

async function saveHabit() {
  _clearHabitErrors();

  const name = document.getElementById('habitName').value.trim();
  if (!name) {
    document.getElementById('habitNameErr').textContent = 'Název návyku je povinný.';
    document.getElementById('habitName').focus();
    return;
  }

  const goalDays = parseInt(document.getElementById('habitGoal').value);
  if (!goalDays || goalDays < 1) {
    document.getElementById('habitNameErr').textContent = 'Zadejte platný počet dní (min. 1).';
    return;
  }

  const payload = {
    name,
    icon:      document.getElementById('habitIcon').value.trim() || '◎',
    color:     document.getElementById('habitColor').value,
    goal_days: goalDays,
    user_id:   currentUser.id,
  };

  const btn = document.getElementById('saveHabitBtn');
  btn.disabled    = true;
  btn.textContent = 'Ukládám…';

  try {
    if (habitEditId) {
      // Aktualizace
      const { data, error } = await window.supabaseClient
        .from('habits')
        .update(payload)
        .eq('id', habitEditId)
        .select()
        .single();

      if (error) throw error;

      const idx = window.APP_DATA.habits.findIndex(h => h.id === habitEditId);
      if (idx !== -1) window.APP_DATA.habits[idx] = { ...window.APP_DATA.habits[idx], ...data };

      showToast('Návyk upraven', 'success');
    } else {
      // Nový
      payload.streak = 0;

      const { data, error } = await window.supabaseClient
        .from('habits')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.APP_DATA.habits.push(data);
      showToast('Návyk přidán', 'success');
    }

    closeModal('habitModal');
    renderHabits();
    renderDashboard();

  } catch (err) {
    console.error('[Planify] saveHabit chyba:', err);
    document.getElementById('habitNameErr').textContent = 'Chyba: ' + err.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Uložit návyk';
  }
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ NÁVYKU
═══════════════════════════════════════════════════════ */
async function deleteHabit(id) {
  const idx     = window.APP_DATA.habits.findIndex(h => h.id === id);
  const removed = window.APP_DATA.habits.splice(idx, 1)[0];

  // Vyčistit logy z APP_DATA
  Object.keys(window.APP_DATA.habitLogs).forEach(key => {
    if (key.startsWith(id + '_')) delete window.APP_DATA.habitLogs[key];
  });

  renderHabits();
  renderDashboard();

  // DB — kaskádové mazání habit_logs probíhá automaticky (ON DELETE CASCADE)
  const { error } = await window.supabaseClient.from('habits').delete().eq('id', id);

  if (error) {
    // Rollback
    window.APP_DATA.habits.splice(idx, 0, removed);
    renderHabits();
    showToast('Chyba při mazání', 'error');
    return;
  }

  showToast('Návyk smazán', 'info');
}

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
function _clearHabitErrors() {
  const err = document.getElementById('habitNameErr');
  if (err) err.textContent = '';
}
