/* ═══════════════════════════════════════════════════════
   Planify — js/goals.js
   Správa cílů — progress, milníky, CRUD
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   STAV MODULU
───────────────────────────────────────────────────── */
let goalEditId = null; // ID editovaného cíle (null = nový)

/* ═══════════════════════════════════════════════════════
   RENDER MŘÍŽKY CÍLŮ
═══════════════════════════════════════════════════════ */
function renderGoals() {
  const D    = window.APP_DATA;
  const list = document.getElementById('goalsList');
  if (!list) return;

  if (D.goals.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">◉</div>
        <div class="empty-state-title">Žádné cíle</div>
        <div class="empty-state-sub">Definujte první dlouhodobý cíl a sledujte svůj pokrok.</div>
      </div>`;
    return;
  }

  list.innerHTML = D.goals.map(g => {
    const current = +g.current_value || 0;
    const target  = +g.target_value  || 1;
    const pct     = Math.min(100, Math.round((current / target) * 100));
    const done    = pct >= 100;

    // Zbývající dny do termínu
    let deadlineText = '';
    if (g.deadline) {
      const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / 86_400_000);
      if (done) {
        deadlineText = '🎉 Splněno!';
      } else if (daysLeft < 0) {
        deadlineText = `<span style="color:var(--red)">Prošlý termín (${Math.abs(daysLeft)} dní)</span>`;
      } else if (daysLeft === 0) {
        deadlineText = `<span style="color:var(--orange)">Dnes je termín!</span>`;
      } else if (daysLeft <= 7) {
        deadlineText = `<span style="color:var(--orange)">Zbývá ${daysLeft} dní</span>`;
      } else {
        deadlineText = `Zbývá ${daysLeft} dní`;
      }
    }

    // Barva progress baru — dle procenta
    let barColor = 'linear-gradient(90deg, var(--accent), var(--accent-light))';
    if (done)    barColor = 'linear-gradient(90deg, var(--green), #2DD4BF)';
    if (pct < 25 && g.deadline && isPast(g.deadline)) {
      barColor = 'linear-gradient(90deg, var(--red), #F87171)';
    }

    return `
    <div class="goal-card ${done ? 'goal-done' : ''}" role="listitem">

      <!-- Hlavička -->
      <div class="goal-header">
        <div class="goal-title">${escHtml(g.name)}</div>
        <div class="goal-percent" style="${done ? 'color:var(--green)' : ''}">
          ${pct} %
        </div>
      </div>

      <!-- Popis -->
      ${g.description ? `<div class="goal-desc">${escHtml(g.description)}</div>` : ''}

      <!-- Progress bar -->
      <div class="goal-progress-bar"
           role="progressbar"
           aria-valuenow="${pct}"
           aria-valuemin="0"
           aria-valuemax="100"
           aria-label="Pokrok: ${pct} %">
        <div class="goal-progress-fill" style="width:${pct}%;background:${barColor}"></div>
      </div>

      <!-- Meta info -->
      <div class="goal-meta">
        <span>
          ${current} / ${target}
          ${g.unit ? escHtml(g.unit) : ''}
        </span>
        <span>${deadlineText}</span>
      </div>

      <!-- Aktualizace hodnoty + akce -->
      <div class="goal-actions">
        <div class="goal-input-row">
          <input type="number"
                 class="goal-update-input"
                 data-goal-input="${escHtml(g.id)}"
                 value="${current}"
                 min="0"
                 step="any"
                 aria-label="Aktuální hodnota pro ${escHtml(g.name)}"/>
          <button class="btn btn-ghost"
                  style="padding:6px 12px;font-size:12px;white-space:nowrap"
                  data-goal-save="${escHtml(g.id)}">
            Uložit
          </button>
        </div>
        <button class="icon-btn"
                data-edit-goal="${escHtml(g.id)}"
                title="Upravit cíl"
                aria-label="Upravit cíl ${escHtml(g.name)}">✎</button>
        <button class="icon-btn del"
                data-del-goal="${escHtml(g.id)}"
                title="Smazat cíl"
                aria-label="Smazat cíl ${escHtml(g.name)}">✕</button>
      </div>

    </div>`;
  }).join('');

  // ── Events ───────────────────────────────────────────

  // Uložit pokrok
  list.querySelectorAll('[data-goal-save]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.goalSave;
      const input = list.querySelector(`[data-goal-input="${id}"]`);
      if (!input) return;
      const val = parseFloat(input.value);
      if (isNaN(val)) {
        showToast('Zadejte platné číslo', 'warning');
        return;
      }
      updateGoalProgress(id, val);
    });
  });

  // Enter v input = uložit
  list.querySelectorAll('[data-goal-input]').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const id  = inp.dataset.goalInput;
      const val = parseFloat(inp.value);
      if (!isNaN(val)) updateGoalProgress(id, val);
    });
  });

  // Editace
  list.querySelectorAll('[data-edit-goal]').forEach(btn => {
    btn.addEventListener('click', () => openEditGoal(btn.dataset.editGoal));
  });

  // Smazání
  list.querySelectorAll('[data-del-goal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const goal = window.APP_DATA.goals.find(g => g.id === btn.dataset.delGoal);
      confirmDelete(
        `Opravdu smazat cíl „${goal?.name || ''}"?`,
        () => deleteGoal(btn.dataset.delGoal)
      );
    });
  });
}

/* ═══════════════════════════════════════════════════════
   AKTUALIZACE POKROKU CÍLE
═══════════════════════════════════════════════════════ */
async function updateGoalProgress(id, newValue) {
  const goal = window.APP_DATA.goals.find(g => g.id === id);
  if (!goal) return;

  const oldValue   = goal.current_value;
  const wasFinished = oldValue >= goal.target_value;

  // Clamp na [0, target]
  const clamped = Math.max(0, Math.min(newValue, goal.target_value));

  // Optimistická aktualizace
  goal.current_value = clamped;
  renderGoals();
  renderDashboard();

  const { error } = await window.supabaseClient
    .from('goals')
    .update({
      current_value: clamped,
      updated_at:    new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    goal.current_value = oldValue;
    renderGoals();
    showToast('Chyba při ukládání', 'error');
    return;
  }

  // Milníkové toasty
  const pct = Math.round((clamped / goal.target_value) * 100);

  if (!wasFinished && clamped >= goal.target_value) {
    showToast(`🎉 Cíl „${goal.name}" splněn! Gratulujeme!`, 'success', 5000);
    if (typeof sendBrowserNotification === 'function') {
      sendBrowserNotification('🎉 Cíl splněn!', goal.name);
    }
  } else if (pct >= 75 && oldValue / goal.target_value < 0.75) {
    showToast(`💪 Již 75 % splněno: ${goal.name}`, 'success');
  } else if (pct >= 50 && oldValue / goal.target_value < 0.50) {
    showToast(`👏 Polovina cíle za sebou: ${goal.name}`, 'success');
  } else {
    showToast('Pokrok uložen', 'success');
  }
}

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — nový cíl
═══════════════════════════════════════════════════════ */
document.getElementById('addGoalBtn')?.addEventListener('click', () => {
  goalEditId = null;
  document.getElementById('goalModalTitle').textContent = 'Nový cíl';
  document.getElementById('goalName').value     = '';
  document.getElementById('goalDesc').value     = '';
  document.getElementById('goalCurrent').value  = '0';
  document.getElementById('goalTarget').value   = '100';
  document.getElementById('goalUnit').value     = '%';
  document.getElementById('goalDeadline').value = '';
  _clearGoalErrors();
  openModal('goalModal');
});

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — editace
═══════════════════════════════════════════════════════ */
function openEditGoal(id) {
  const goal = window.APP_DATA.goals.find(g => g.id === id);
  if (!goal) return;

  goalEditId = id;
  document.getElementById('goalModalTitle').textContent = 'Upravit cíl';
  document.getElementById('goalName').value     = goal.name         || '';
  document.getElementById('goalDesc').value     = goal.description  || '';
  document.getElementById('goalCurrent').value  = goal.current_value ?? 0;
  document.getElementById('goalTarget').value   = goal.target_value  ?? 100;
  document.getElementById('goalUnit').value     = goal.unit          || '';
  document.getElementById('goalDeadline').value = goal.deadline      || '';
  _clearGoalErrors();
  openModal('goalModal');
}

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ CÍLE
═══════════════════════════════════════════════════════ */
document.getElementById('saveGoalBtn')?.addEventListener('click', saveGoal);

document.getElementById('goalName')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveGoal(); }
});

async function saveGoal() {
  _clearGoalErrors();

  const name    = document.getElementById('goalName').value.trim();
  const target  = parseFloat(document.getElementById('goalTarget').value);
  const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
  let valid = true;

  if (!name) {
    document.getElementById('goalNameErr').textContent = 'Název cíle je povinný.';
    document.getElementById('goalName').focus();
    valid = false;
  }

  if (!target || target <= 0) {
    document.getElementById('goalTargetErr').textContent = 'Zadejte cílovou hodnotu větší než 0.';
    if (valid) document.getElementById('goalTarget').focus();
    valid = false;
  }

  if (!valid) return;

  const payload = {
    name,
    description:   document.getElementById('goalDesc').value.trim() || null,
    current_value: Math.max(0, Math.min(current, target)),
    target_value:  target,
    unit:          document.getElementById('goalUnit').value.trim() || null,
    deadline:      document.getElementById('goalDeadline').value    || null,
    user_id:       currentUser.id,
    updated_at:    new Date().toISOString(),
  };

  const btn = document.getElementById('saveGoalBtn');
  btn.disabled    = true;
  btn.textContent = 'Ukládám…';

  try {
    if (goalEditId) {
      // Aktualizace
      const { data, error } = await window.supabaseClient
        .from('goals')
        .update(payload)
        .eq('id', goalEditId)
        .select()
        .single();

      if (error) throw error;

      const idx = window.APP_DATA.goals.findIndex(g => g.id === goalEditId);
      if (idx !== -1) window.APP_DATA.goals[idx] = data;

      showToast('Cíl upraven', 'success');
    } else {
      // Nový
      payload.created_at = new Date().toISOString();

      const { data, error } = await window.supabaseClient
        .from('goals')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.APP_DATA.goals.unshift(data);
      showToast('Cíl přidán', 'success');
    }

    closeModal('goalModal');
    renderGoals();
    renderDashboard();

  } catch (err) {
    console.error('[Planify] saveGoal chyba:', err);
    document.getElementById('goalNameErr').textContent = 'Chyba: ' + err.message;
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Uložit cíl';
  }
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ CÍLE
═══════════════════════════════════════════════════════ */
async function deleteGoal(id) {
  const idx     = window.APP_DATA.goals.findIndex(g => g.id === id);
  const removed = window.APP_DATA.goals.splice(idx, 1)[0];

  renderGoals();
  renderDashboard();

  const { error } = await window.supabaseClient.from('goals').delete().eq('id', id);

  if (error) {
    window.APP_DATA.goals.splice(idx, 0, removed);
    renderGoals();
    showToast('Chyba při mazání', 'error');
    return;
  }

  showToast('Cíl smazán', 'info');
}

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
function _clearGoalErrors() {
  ['goalNameErr', 'goalTargetErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}
