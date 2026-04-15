/* ═══════════════════════════════════════════════════════
   Planify — js/tasks.js
   Správa úkolů — CRUD, filtry, řazení
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   STAV MODULU
───────────────────────────────────────────────────── */
let taskEditId    = null;   // ID editovaného úkolu (null = nový)
let taskFilter    = 'all';  // all | today | active | done
let taskCatFilter = '';     // kategorie filter
let taskSort      = 'due-asc'; // due-asc | due-desc | priority | name

/* Popisky kategorií a priorit */
const CAT_LABELS = {
  work: 'Práce', personal: 'Osobní',
  health: 'Zdraví', finance: 'Finance', other: 'Ostatní',
};

const PRIO_LABELS = { high: 'Vysoká', medium: 'Střední', low: 'Nízká' };

/* ═══════════════════════════════════════════════════════
   RENDER SEZNAMU ÚKOLŮ
═══════════════════════════════════════════════════════ */
function renderTasks() {
  let tasks = [...window.APP_DATA.tasks];

  // ── Filtrování ───────────────────────────────────────
  if (taskFilter === 'today') {
    tasks = tasks.filter(t => isToday(t.due_date));
  } else if (taskFilter === 'active') {
    tasks = tasks.filter(t => !t.done);
  } else if (taskFilter === 'done') {
    tasks = tasks.filter(t => t.done);
  }

  if (taskCatFilter) {
    tasks = tasks.filter(t => t.category === taskCatFilter);
  }

  // ── Řazení ───────────────────────────────────────────
  tasks.sort((a, b) => {
    switch (taskSort) {
      case 'due-asc':
        // Bez termínu jdou na konec
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date < b.due_date ? -1 : 1;

      case 'due-desc':
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date > b.due_date ? -1 : 1;

      case 'priority': {
        const order = { high: 0, medium: 1, low: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      }

      case 'name':
        return (a.name || '').localeCompare(b.name || '', 'cs');

      default:
        return 0;
    }
  });

  const list = document.getElementById('taskList');
  if (!list) return;

  // ── Prázdný stav ─────────────────────────────────────
  if (tasks.length === 0) {
    const emptyMessages = {
      all:    'Žádné úkoly. Přidejte první kliknutím na „+ Nový úkol".',
      today:  'Dnes nemáte žádné úkoly.',
      active: 'Výborně! Žádné nesplněné úkoly.',
      done:   'Zatím jste nesplnili žádný úkol.',
    };
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✓</div>
        <div class="empty-state-title">${
          taskCatFilter ? 'Žádné úkoly v této kategorii' : 'Žádné úkoly'
        }</div>
        <div class="empty-state-sub">${emptyMessages[taskFilter] || ''}</div>
      </div>`;
    return;
  }

  // ── Render každého úkolu ─────────────────────────────
  list.innerHTML = tasks.map(t => {
    const overdue  = t.due_date && isPast(t.due_date) && !t.done;
    const catLabel = CAT_LABELS[t.category] || t.category || 'Ostatní';
    const prioLabel = PRIO_LABELS[t.priority] || 'Střední';

    return `
    <div class="task-item ${t.done ? 'completed' : ''}"
         role="listitem"
         data-task-id="${escHtml(t.id)}">

      <div class="task-check ${t.done ? 'done' : ''}"
           data-check="${escHtml(t.id)}"
           role="checkbox"
           aria-checked="${t.done}"
           tabindex="0"
           aria-label="Označit jako ${t.done ? 'nesplněný' : 'splněný'}">
        ${t.done ? '✓' : ''}
      </div>

      <div class="task-content">
        <div class="task-name ${t.done ? 'done' : ''}">${escHtml(t.name)}</div>
        <div class="task-meta">
          <span class="task-tag tag-${t.category || 'other'}">${catLabel}</span>
          <span class="priority-badge prio-${t.priority || 'medium'}">${prioLabel}</span>
          ${t.due_date ? `
            <span class="task-due ${overdue ? 'overdue' : ''}"
                  title="${overdue ? 'Termín prošel' : 'Termín'}">
              ${overdue ? '⚠ ' : ''}${formatDateShort(t.due_date)}
            </span>` : ''}
          ${t.description ? `
            <span style="color:var(--text-muted);font-size:11px"
                  title="${escHtml(t.description)}">📝</span>` : ''}
        </div>
      </div>

      <div class="task-actions">
        <button class="icon-btn"
                data-edit-task="${escHtml(t.id)}"
                title="Upravit úkol"
                aria-label="Upravit úkol ${escHtml(t.name)}">✎</button>
        <button class="icon-btn del"
                data-del-task="${escHtml(t.id)}"
                title="Smazat úkol"
                aria-label="Smazat úkol ${escHtml(t.name)}">✕</button>
      </div>
    </div>`;
  }).join('');

  // ── Bind events ──────────────────────────────────────
  // Checkbox — toggle done
  list.querySelectorAll('[data-check]').forEach(el => {
    const doToggle = () => toggleTask(el.dataset.check);
    el.addEventListener('click', doToggle);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doToggle(); }
    });
  });

  // Tlačítko Upravit
  list.querySelectorAll('[data-edit-task]').forEach(el => {
    el.addEventListener('click', () => openEditTask(el.dataset.editTask));
  });

  // Tlačítko Smazat
  list.querySelectorAll('[data-del-task]').forEach(el => {
    el.addEventListener('click', () => {
      const task = window.APP_DATA.tasks.find(t => t.id === el.dataset.delTask);
      confirmDelete(
        `Opravdu smazat úkol „${task?.name || ''}"?`,
        () => deleteTask(el.dataset.delTask)
      );
    });
  });

  // Aktualizovat badge a pomodoro select
  _updateTasksBadge();
  if (typeof updatePomoTaskSelect === 'function') updatePomoTaskSelect();
}

/* ═══════════════════════════════════════════════════════
   TOGGLE DONE/UNDONE
═══════════════════════════════════════════════════════ */
async function toggleTask(id) {
  const task = window.APP_DATA.tasks.find(t => t.id === id);
  if (!task) return;

  // Optimistická aktualizace UI
  task.done = !task.done;
  renderTasks();
  renderDashboard();

  // Sync s DB
  const { error } = await window.supabaseClient
    .from('tasks')
    .update({ done: task.done, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    // Rollback při chybě
    task.done = !task.done;
    renderTasks();
    renderDashboard();
    showToast('Chyba při ukládání', 'error');
    return;
  }

  if (task.done) {
    showToast('Úkol splněn! 🎉', 'success');
    // Notifikace pokud povolena
    if (typeof sendBrowserNotification === 'function') {
      sendBrowserNotification('✓ Úkol splněn', task.name);
    }
  }
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ ÚKOLU
═══════════════════════════════════════════════════════ */
async function deleteTask(id) {
  const idx     = window.APP_DATA.tasks.findIndex(t => t.id === id);
  const removed = window.APP_DATA.tasks.splice(idx, 1)[0];

  // Optimistická aktualizace
  renderTasks();
  renderDashboard();
  if (typeof updatePomoTaskSelect === 'function') updatePomoTaskSelect();

  const { error } = await window.supabaseClient.from('tasks').delete().eq('id', id);

  if (error) {
    // Rollback
    window.APP_DATA.tasks.splice(idx, 0, removed);
    renderTasks();
    showToast('Chyba při mazání', 'error');
    return;
  }

  showToast('Úkol smazán', 'info');
}

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — nový úkol
═══════════════════════════════════════════════════════ */
document.getElementById('addTaskBtn')?.addEventListener('click', () => {
  taskEditId = null;
  document.getElementById('taskModalTitle').textContent = 'Nový úkol';
  document.getElementById('taskName').value      = '';
  document.getElementById('taskCategory').value  = 'work';
  document.getElementById('taskPriority').value  = 'medium';
  document.getElementById('taskDue').value       = today();
  document.getElementById('taskDesc').value      = '';
  _clearTaskErrors();
  openModal('taskModal');
});

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — editace úkolu
═══════════════════════════════════════════════════════ */
function openEditTask(id) {
  const task = window.APP_DATA.tasks.find(t => t.id === id);
  if (!task) return;

  taskEditId = id;
  document.getElementById('taskModalTitle').textContent  = 'Upravit úkol';
  document.getElementById('taskName').value      = task.name || '';
  document.getElementById('taskCategory').value  = task.category  || 'work';
  document.getElementById('taskPriority').value  = task.priority  || 'medium';
  document.getElementById('taskDue').value       = task.due_date  || '';
  document.getElementById('taskDesc').value      = task.description || '';
  _clearTaskErrors();
  openModal('taskModal');
}

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ ÚKOLU (nový + editace)
═══════════════════════════════════════════════════════ */
document.getElementById('saveTaskBtn')?.addEventListener('click', saveTask);

// Enter v poli Název = odeslat
document.getElementById('taskName')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveTask(); }
});

async function saveTask() {
  _clearTaskErrors();

  const name = document.getElementById('taskName').value.trim();
  if (!name) {
    document.getElementById('taskNameErr').textContent = 'Název úkolu je povinný.';
    document.getElementById('taskName').focus();
    return;
  }

  const payload = {
    name,
    category:    document.getElementById('taskCategory').value,
    priority:    document.getElementById('taskPriority').value,
    due_date:    document.getElementById('taskDue').value       || null,
    description: document.getElementById('taskDesc').value.trim() || null,
    user_id:     currentUser.id,
    updated_at:  new Date().toISOString(),
  };

  // Disable tlačítka
  const saveBtn = document.getElementById('saveTaskBtn');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Ukládám…';

  try {
    if (taskEditId) {
      // ── Aktualizace ─────────────────────────────────
      const { data, error } = await window.supabaseClient
        .from('tasks')
        .update(payload)
        .eq('id', taskEditId)
        .select()
        .single();

      if (error) throw error;

      const idx = window.APP_DATA.tasks.findIndex(t => t.id === taskEditId);
      if (idx !== -1) window.APP_DATA.tasks[idx] = data;

      showToast('Úkol upraven', 'success');

    } else {
      // ── Vložení nového ──────────────────────────────
      payload.done       = false;
      payload.created_at = new Date().toISOString();

      const { data, error } = await window.supabaseClient
        .from('tasks')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.APP_DATA.tasks.unshift(data);
      showToast('Úkol přidán', 'success');
    }

    closeModal('taskModal');
    renderTasks();
    renderDashboard();
    if (typeof updatePomoTaskSelect === 'function') updatePomoTaskSelect();

  } catch (err) {
    console.error('[Planify] saveTask chyba:', err);
    document.getElementById('taskNameErr').textContent = 'Chyba: ' + err.message;
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'Uložit úkol';
  }
}

/* ═══════════════════════════════════════════════════════
   FILTRY & ŘAZENÍ
═══════════════════════════════════════════════════════ */

// Filter tabs (Vše / Dnes / Aktivní / Splněné)
document.getElementById('taskFilterTabs')?.addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('#taskFilterTabs .filter-tab')
    .forEach(b => b.classList.remove('active'));
  tab.classList.add('active');
  taskFilter = tab.dataset.filter;
  renderTasks();
});

// Kategorie filter
document.getElementById('taskCategoryFilter')?.addEventListener('change', e => {
  taskCatFilter = e.target.value;
  renderTasks();
});

// Řazení
document.getElementById('taskSortSelect')?.addEventListener('change', e => {
  taskSort = e.target.value;
  renderTasks();
});

/* ═══════════════════════════════════════════════════════
   HELPER — badge + clear errors
═══════════════════════════════════════════════════════ */
function _updateTasksBadge() {
  const badge   = document.getElementById('tasksBadge');
  const pending = window.APP_DATA.tasks.filter(t => !t.done).length;
  if (badge) badge.textContent = pending > 0 ? String(pending) : '';
}

function _clearTaskErrors() {
  const err = document.getElementById('taskNameErr');
  if (err) err.textContent = '';
}
