/* ═══════════════════════════════════════════════════════
   Planify — js/habits.js  v3
   Návyky — guest mode, připomínky, XP hooky
═══════════════════════════════════════════════════════ */

let habitEditId = null;

const HABIT_REMINDERS_KEY = 'planify_habit_reminders';

function loadHabitReminders() {
  try { return JSON.parse(localStorage.getItem(HABIT_REMINDERS_KEY) || '{}'); } catch { return {}; }
}
function saveHabitReminders(obj) {
  try { localStorage.setItem(HABIT_REMINDERS_KEY, JSON.stringify(obj)); } catch {}
}

/* ─────────────────────────────────────────────────────
   SCHEDULER připomínek (každou minutu)
───────────────────────────────────────────────────── */
let _reminderInterval = null;

function startReminderScheduler() {
  if (_reminderInterval) return;
  _reminderInterval = setInterval(_checkHabitReminders, 60_000);
}

function _checkHabitReminders() {
  const reminders = loadHabitReminders();
  const D         = window.APP_DATA;
  const now       = new Date();
  const curHHMM   = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const todayStr  = now.toISOString().slice(0, 10);

  Object.entries(reminders).forEach(([habitId, reminderTime]) => {
    if (reminderTime !== curHHMM) return;
    const habit = D.habits.find(h => h.id === habitId);
    if (!habit) return;
    if (D.habitLogs[`${habitId}_${todayStr}`]) return; // Již splněno

    showToast(`⏰ Připomínka: ${habit.name} — splňte dnešní návyk!`, 'info', 7000);
    if (typeof sendBrowserNotification === 'function') {
      sendBrowserNotification(
        `⏰ ${habit.icon || '◎'} ${habit.name}`,
        'Nezapomeňte na dnešní návyk!',
        { tag: `habit-reminder-${habitId}-${todayStr}`, data: { section: 'habits' } }
      );
    }
  });
}

/* ═══════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════ */
function renderHabits() {
  const D         = window.APP_DATA;
  const list      = document.getElementById('habitsList');
  const reminders = loadHabitReminders();
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

  const DAY_NAMES = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

  list.innerHTML = D.habits.map(h => {
    const doneToday = !!D.habitLogs[`${h.id}_${today()}`];
    const goalDays  = h.goal_days || 30;
    const streak    = h.streak    || 0;
    const pct       = Math.min(100, Math.round((streak / goalDays) * 100));
    const reminder  = reminders[h.id] || '';

    const last7 = [];
    for (let i = 6; i >= 0; i--) {
      const d  = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      last7.push({ ds, done: !!D.habitLogs[`${h.id}_${ds}`], dayName: DAY_NAMES[d.getDay()] });
    }

    return `
    <div class="habit-card" role="listitem">
      <div class="habit-header">
        <div class="habit-title-row">
          <div class="habit-icon">${h.icon || '◎'}</div>
          <div class="habit-name">${escHtml(h.name)}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <div class="habit-streak" title="Aktuální streak">
            <span class="streak-count">${streak}</span> 🔥
          </div>
          <button class="icon-btn" data-edit-habit="${escHtml(h.id)}" title="Upravit">✎</button>
          <button class="icon-btn del" data-del-habit="${escHtml(h.id)}" title="Smazat">✕</button>
        </div>
      </div>

      <div class="habit-dots" role="group" aria-label="Posledních 7 dní">
        ${last7.map(d => `
          <div class="habit-dot ${d.done ? 'done' : ''}"
               style="${d.done ? `background:${h.color || '#6366F1'}` : ''}"
               title="${d.ds}${d.done ? ' ✓' : ''}">
            <span>${d.done ? '✓' : ''}</span>
            <span class="habit-dot-label">${d.dayName}</span>
          </div>`).join('')}
      </div>

      <div class="habit-progress-bar" role="progressbar"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="habit-progress-fill" style="width:${pct}%;background:${h.color || '#6366F1'}"></div>
      </div>
      <div class="habit-progress-label">
        <span>${streak} / ${goalDays} dní</span>
        <span>${pct} %</span>
      </div>

      <div class="habit-reminder">
        <span>⏰</span>
        <label for="rem-${escHtml(h.id)}" style="text-transform:none;font-size:12px;color:var(--text-secondary);font-weight:400">
          Připomínka:
        </label>
        <input type="time"
               class="habit-reminder-input"
               id="rem-${escHtml(h.id)}"
               data-habit-reminder="${escHtml(h.id)}"
               value="${escHtml(reminder)}"
               title="Čas denní připomínky"/>
        ${reminder ? `
          <button class="icon-btn del" style="width:22px;height:22px;font-size:10px"
                  data-clear-reminder="${escHtml(h.id)}" title="Zrušit připomínku">✕</button>` : ''}
      </div>

      <div class="habit-actions" style="margin-top:8px">
        <button class="btn-check-habit ${doneToday ? 'is-done' : 'not-done'}"
                data-habit-check="${escHtml(h.id)}"
                aria-pressed="${doneToday}">
          ${doneToday ? '✓ Splněno dnes' : '○ Označit jako splněno'}
        </button>
      </div>
    </div>`;
  }).join('');

  // Events
  list.querySelectorAll('[data-habit-check]').forEach(btn => {
    btn.addEventListener('click', () => toggleHabit(btn.dataset.habitCheck));
  });

  list.querySelectorAll('[data-edit-habit]').forEach(btn => {
    btn.addEventListener('click', () => openEditHabit(btn.dataset.editHabit));
  });

  list.querySelectorAll('[data-del-habit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const h = window.APP_DATA.habits.find(h => h.id === btn.dataset.delHabit);
      confirmDelete(
        `Opravdu smazat návyk „${h?.name || ''}"? Smaže se i celá historie.`,
        () => deleteHabit(btn.dataset.delHabit)
      );
    });
  });

  // Uložení připomínky
  list.querySelectorAll('[data-habit-reminder]').forEach(inp => {
    inp.addEventListener('change', () => {
      const id   = inp.dataset.habitReminder;
      const time = inp.value.trim();
      const rems = loadHabitReminders();
      if (time) { rems[id] = time; showToast(`⏰ Připomínka nastavena na ${time}`, 'success'); }
      else       { delete rems[id]; }
      saveHabitReminders(rems);
      if (typeof syncRemindersToSW === 'function') syncRemindersToSW();
      renderHabits();
    });
  });

  // Zrušení připomínky
  list.querySelectorAll('[data-clear-reminder]').forEach(btn => {
    btn.addEventListener('click', () => {
      const rems = loadHabitReminders();
      delete rems[btn.dataset.clearReminder];
      saveHabitReminders(rems);
      showToast('Připomínka zrušena', 'info');
      renderHabits();
    });
  });
}

/* ═══════════════════════════════════════════════════════
   TOGGLE SPLNĚNO / NESPLNĚNO
═══════════════════════════════════════════════════════ */
async function toggleHabit(id) {
  const habit      = window.APP_DATA.habits.find(h => h.id === id);
  if (!habit) return;

  const todayStr   = today();
  const logKey     = `${id}_${todayStr}`;
  const wasChecked = !!window.APP_DATA.habitLogs[logKey];

  if (wasChecked) {
    delete window.APP_DATA.habitLogs[logKey];
    habit.streak = Math.max(0, (habit.streak || 0) - 1);
    renderHabits(); renderDashboard();

    if (typeof isGuestMode === 'function' && isGuestMode()) {
      _persistHabitsGuest(); showToast('Návyk odoznačen', 'info'); return;
    }
    await window.supabaseClient.from('habit_logs').delete().eq('habit_id', id).eq('log_date', todayStr);
    await window.supabaseClient.from('habits').update({ streak: habit.streak }).eq('id', id);
    showToast('Návyk odoznačen', 'info');

  } else {
    window.APP_DATA.habitLogs[logKey] = true;

    const yesterday    = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const prev         = habit.streak || 0;
    habit.streak = (window.APP_DATA.habitLogs[`${id}_${yesterdayStr}`] || prev === 0) ? prev + 1 : 1;

    renderHabits(); renderDashboard();

    if (typeof isGuestMode === 'function' && isGuestMode()) {
      _persistHabitsGuest();
      if (typeof xpHabitChecked === 'function') xpHabitChecked(habit.streak);
      _habitStreakToast(habit);
      if (typeof guestActionWarning === 'function') guestActionWarning('Návyk');
      return;
    }

    await window.supabaseClient.from('habit_logs').upsert({ habit_id: id, user_id: currentUser.id, log_date: todayStr });
    await window.supabaseClient.from('habits').update({ streak: habit.streak }).eq('id', id);
    if (typeof xpHabitChecked === 'function') xpHabitChecked(habit.streak);
    _habitStreakToast(habit);
  }
}

function _habitStreakToast(habit) {
  if (habit.streak > 0 && habit.streak % 7 === 0) {
    showToast(`🔥 ${habit.streak} dní v řadě! Skvělá práce!`, 'success', 5000);
    if (typeof sendBrowserNotification === 'function') {
      sendBrowserNotification(`🔥 ${habit.streak} dní streak!`, `${habit.name} — nevzdávej to!`);
    }
  } else if (habit.streak === 1) {
    showToast('Návyk zahájen! Začínáte sérii. 💪', 'success');
  } else {
    showToast('Návyk splněn ✓', 'success');
  }
}

function _persistHabitsGuest() {
  try { localStorage.setItem('planify_guest_habits', JSON.stringify(window.APP_DATA.habits)); } catch {}
}

/* ═══════════════════════════════════════════════════════
   MODAL — nový / editace
═══════════════════════════════════════════════════════ */
document.getElementById('addHabitBtn')?.addEventListener('click', () => {
  habitEditId = null;
  document.getElementById('habitModalTitle').textContent = 'Nový návyk';
  _fillHabitModal({ name: '', icon: '', color: '#6366F1', goal_days: 30 });
  if (document.getElementById('habitReminderTime')) document.getElementById('habitReminderTime').value = '';
  openModal('habitModal');
});

function openEditHabit(id) {
  const habit = window.APP_DATA.habits.find(h => h.id === id);
  if (!habit) return;
  habitEditId = id;
  document.getElementById('habitModalTitle').textContent = 'Upravit návyk';
  _fillHabitModal(habit);
  // Načíst uloženou připomínku
  const rems = loadHabitReminders();
  const inp  = document.getElementById('habitReminderTime');
  if (inp) inp.value = rems[id] || '';
  openModal('habitModal');
}

function _fillHabitModal(h) {
  document.getElementById('habitName').value  = h.name      || '';
  document.getElementById('habitIcon').value  = h.icon      || '';
  document.getElementById('habitColor').value = h.color     || '#6366F1';
  document.getElementById('habitGoal').value  = h.goal_days || 30;
  _clearHabitErrors();
}

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ
═══════════════════════════════════════════════════════ */
document.getElementById('saveHabitBtn')?.addEventListener('click', saveHabit);
document.getElementById('habitName')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveHabit(); }
});

async function saveHabit() {
  _clearHabitErrors();
  const name     = document.getElementById('habitName').value.trim();
  const goalDays = parseInt(document.getElementById('habitGoal').value);

  if (!name) {
    document.getElementById('habitNameErr').textContent = 'Zadejte název návyku.';
    document.getElementById('habitName').focus(); return;
  }
  if (!goalDays || goalDays < 1) {
    document.getElementById('habitNameErr').textContent = 'Zadejte platný cíl (min. 1 den).'; return;
  }

  const payload = {
    name,
    icon:      document.getElementById('habitIcon').value.trim() || '◎',
    color:     document.getElementById('habitColor').value,
    goal_days: goalDays,
    user_id:   typeof currentUser !== 'undefined' && currentUser?.id ? currentUser.id : 'guest',
  };

  const btn = document.getElementById('saveHabitBtn');
  btn.disabled = true; btn.textContent = 'Ukládám…';

  try {
    // Přečíst připomínku z modalu
    const reminderTime = document.getElementById('habitReminderTime')?.value?.trim() || '';

    if (typeof isGuestMode === 'function' && isGuestMode()) {
      if (habitEditId) {
        const idx = window.APP_DATA.habits.findIndex(h => h.id === habitEditId);
        if (idx !== -1) window.APP_DATA.habits[idx] = { ...window.APP_DATA.habits[idx], ...payload };
        // Uložit připomínku
        if (reminderTime) {
          const rems = loadHabitReminders(); rems[habitEditId] = reminderTime; saveHabitReminders(rems);
        }
      } else {
        payload.streak = 0; payload.id = 'guest_habit_' + Date.now(); payload.created_at = new Date().toISOString();
        window.APP_DATA.habits.push(payload);
        if (reminderTime) {
          const rems = loadHabitReminders(); rems[payload.id] = reminderTime; saveHabitReminders(rems);
        }
      }
      _persistHabitsGuest();
      closeModal('habitModal'); renderHabits(); renderDashboard();
      showToast(habitEditId ? 'Návyk upraven (lokálně)' : 'Návyk přidán (lokálně)', 'warning', 3500);
      if (typeof guestActionWarning === 'function') guestActionWarning('Návyk');
      return;
    }

    if (habitEditId) {
      const { data, error } = await window.supabaseClient.from('habits').update(payload).eq('id', habitEditId).select().single();
      if (error) throw error;
      const idx = window.APP_DATA.habits.findIndex(h => h.id === habitEditId);
      if (idx !== -1) window.APP_DATA.habits[idx] = { ...window.APP_DATA.habits[idx], ...data };
      // Uložit připomínku
      const rems = loadHabitReminders();
      if (reminderTime) { rems[habitEditId] = reminderTime; showToast(`Návyk upraven · ⏰ ${reminderTime}`, 'success'); }
      else               { delete rems[habitEditId]; showToast('Návyk upraven', 'success'); }
      saveHabitReminders(rems);
    } else {
      payload.streak = 0;
      const { data, error } = await window.supabaseClient.from('habits').insert(payload).select().single();
      if (error) throw error;
      window.APP_DATA.habits.push(data);
      // Uložit připomínku pro nový návyk
      if (reminderTime) {
        const rems = loadHabitReminders(); rems[data.id] = reminderTime; saveHabitReminders(rems);
        showToast(`Návyk přidán · ⏰ ${reminderTime}`, 'success');
      } else {
        showToast('Návyk přidán', 'success');
      }
    }

    if (typeof syncRemindersToSW === 'function') syncRemindersToSW();
    closeModal('habitModal'); renderHabits(); renderDashboard();

  } catch (err) {
    console.error('[Planify] saveHabit:', err);
    document.getElementById('habitNameErr').textContent =
      typeof friendlyDbError === 'function' ? friendlyDbError(err) : 'Chyba při ukládání. Zkuste to znovu.';
  } finally {
    btn.disabled = false; btn.textContent = 'Uložit návyk';
  }
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ
═══════════════════════════════════════════════════════ */
async function deleteHabit(id) {
  const idx     = window.APP_DATA.habits.findIndex(h => h.id === id);
  const removed = window.APP_DATA.habits.splice(idx, 1)[0];
  Object.keys(window.APP_DATA.habitLogs).forEach(k => { if (k.startsWith(id + '_')) delete window.APP_DATA.habitLogs[k]; });
  const rems = loadHabitReminders(); delete rems[id]; saveHabitReminders(rems);
  renderHabits(); renderDashboard();

  if (typeof isGuestMode === 'function' && isGuestMode()) {
    _persistHabitsGuest(); showToast('Návyk smazán', 'info'); return;
  }

  const { error } = await window.supabaseClient.from('habits').delete().eq('id', id);
  if (error) {
    window.APP_DATA.habits.splice(idx, 0, removed); renderHabits();
    showToast(typeof friendlyDbError === 'function' ? friendlyDbError(error) : 'Chyba při mazání.', 'error'); return;
  }
  showToast('Návyk smazán', 'info');
}

function _clearHabitErrors() {
  const el = document.getElementById('habitNameErr'); if (el) el.textContent = '';
}
