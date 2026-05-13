/* ═══════════════════════════════════════════════════════
   Planify — js/calendar.js  v3
   Kalendář — měsíční/týdenní pohled, události, guest mode
═══════════════════════════════════════════════════════ */

let calDate            = new Date();
let calView            = 'month';
let eventEditId        = null;
let selectedEventColor = '#6366F1';

/* ═══════════════════════════════════════════════════════
   HLAVNÍ RENDER
═══════════════════════════════════════════════════════ */
function renderCalendar() {
  _updateCalTitle();
  if (calView === 'month') _renderMonthView();
  else                     _renderWeekView();
  _renderUpcomingEvents();
}

/* ─────────────────────────────────────────────────────
   NADPIS
───────────────────────────────────────────────────── */
function _updateCalTitle() {
  const titleEl = document.getElementById('calTitle');
  if (!titleEl) return;
  if (calView === 'month') {
    titleEl.textContent = calDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  } else {
    const start = _getWeekStart(calDate);
    const end   = new Date(start); end.setDate(end.getDate() + 6);
    const opts  = { day: 'numeric', month: 'short' };
    titleEl.textContent = `${start.toLocaleDateString('cs-CZ', opts)} – ${end.toLocaleDateString('cs-CZ', { ...opts, year: 'numeric' })}`;
  }
}

/* ═══════════════════════════════════════════════════════
   MĚSÍČNÍ POHLED
═══════════════════════════════════════════════════════ */
function _renderMonthView() {
  const container = document.getElementById('calendarContainer');
  if (!container) return;

  const year        = calDate.getFullYear();
  const month       = calDate.getMonth();
  const firstDow    = new Date(year, month, 1).getDay();
  const startOffset = (firstDow + 6) % 7;          // Po = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays    = new Date(year, month, 0).getDate();
  const todayStr    = today();
  const dayNames    = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  let html = `
    <div class="calendar-grid">
      <div class="cal-weekdays">
        ${dayNames.map(d => `<div class="cal-weekday">${d}</div>`).join('')}
      </div>
      <div class="cal-days">`;

  // Předchozí měsíc
  for (let i = startOffset - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month"><div class="day-num">${prevDays - i}</div></div>`;
  }

  // Aktuální měsíc
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr   = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isT       = dateStr === todayStr;
    const dayEvents = _getEventsForDate(dateStr);
    const dayTasks  = window.APP_DATA.tasks.filter(t => t.due_date === dateStr && !t.done);
    const extra     = Math.max(0, dayEvents.length + dayTasks.length - 2);

    const chips = [
      ...dayEvents.slice(0, 2).map(ev =>
        `<div class="day-event-chip" style="background:${ev.color || '#6366F1'}" title="${escHtml(ev.name)}">${escHtml(ev.name)}</div>`
      ),
      ...dayTasks.slice(0, Math.max(0, 2 - dayEvents.length)).map(t =>
        `<div class="day-event-chip" style="background:var(--accent)" title="${escHtml(t.name)}">${escHtml(t.name)}</div>`
      ),
    ];

    html += `
      <div class="cal-day${isT ? ' today' : ''}"
           data-cal-date="${dateStr}"
           role="gridcell"
           aria-label="${formatDate(dateStr)}${isT ? ' (dnes)' : ''}">
        <div class="day-num">${d}</div>
        <div class="day-events">
          ${chips.join('')}
          ${extra > 0 ? `<div style="font-size:9.5px;color:var(--text-muted);padding-left:3px">+${extra} další</div>` : ''}
        </div>
      </div>`;
  }

  // Příští měsíc
  const totalCells = startOffset + daysInMonth;
  const endFill    = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= endFill; d++) {
    html += `<div class="cal-day other-month"><div class="day-num">${d}</div></div>`;
  }

  html += '</div></div>';
  container.innerHTML = html;

  // Klik na den = přidat událost
  container.querySelectorAll('[data-cal-date]').forEach(cell => {
    cell.addEventListener('click', () => _openAddEventModal(cell.dataset.calDate));
  });
}

/* ═══════════════════════════════════════════════════════
   TÝDENNÍ POHLED
═══════════════════════════════════════════════════════ */
function _renderWeekView() {
  const container = document.getElementById('calendarContainer');
  if (!container) return;

  const start    = _getWeekStart(calDate);
  const dayNames = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
  const todayStr = today();

  let headerHtml = `<div class="week-view"><div class="week-header"><div class="week-time-col"></div>`;
  let eventsHtml = `<div class="week-events-row"><div class="week-time-col" style="font-size:10px;color:var(--text-muted);padding:8px 4px">Celý den</div>`;

  for (let i = 0; i < 7; i++) {
    const d       = new Date(start); d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const isT     = dateStr === todayStr;

    headerHtml += `
      <div class="week-day-header ${isT ? 'today' : ''}">
        <div class="wdh-name">${dayNames[i]}</div>
        <div class="wdh-num">${d.getDate()}</div>
      </div>`;

    const dayEvents = _getEventsForDate(dateStr);
    const dayTasks  = window.APP_DATA.tasks.filter(t => t.due_date === dateStr && !t.done);
    eventsHtml += `
      <div class="week-day-col" data-cal-date="${dateStr}">
        ${dayEvents.map(ev => `<div class="day-event-chip" style="background:${ev.color || '#6366F1'}">${escHtml(ev.name)}</div>`).join('')}
        ${dayTasks.map(t => `<div class="day-event-chip" style="background:var(--accent)">${escHtml(t.name)}</div>`).join('')}
      </div>`;
  }

  headerHtml += '</div>';
  eventsHtml += '</div>';
  container.innerHTML = headerHtml + eventsHtml + '</div>';

  container.querySelectorAll('[data-cal-date]').forEach(col => {
    col.addEventListener('click', () => _openAddEventModal(col.dataset.calDate));
  });
}

/* ═══════════════════════════════════════════════════════
   NADCHÁZEJÍCÍ UDÁLOSTI
═══════════════════════════════════════════════════════ */
function _renderUpcomingEvents() {
  const container = document.getElementById('upcomingEvents');
  if (!container) return;

  const todayStr = today();
  const items = [
    ...window.APP_DATA.events
      .filter(ev => ev.event_date >= todayStr)
      .map(ev => ({ id: ev.id, name: ev.name, date: ev.event_date, time: ev.event_time, color: ev.color || '#6366F1', isTask: false })),
    ...window.APP_DATA.tasks
      .filter(t => t.due_date && t.due_date >= todayStr && !t.done)
      .map(t => ({ id: t.id, name: t.name, date: t.due_date, time: null, color: 'var(--accent)', isTask: true })),
  ].sort((a, b) => a.date < b.date ? -1 : 1).slice(0, 10);

  if (items.length === 0) {
    container.innerHTML = '<div class="empty-state-small">Žádné nadcházející události nebo úkoly</div>';
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="event-item">
      <div class="event-color-strip" style="background:${item.color}"></div>
      <div class="event-info">
        <div class="event-title">
          ${escHtml(item.name)}
          ${item.isTask ? '<span style="font-size:10px;color:var(--text-muted);margin-left:5px">[úkol]</span>' : ''}
        </div>
        <div class="event-meta">
          ${formatDate(item.date)}${item.time ? ' · ' + item.time.slice(0, 5) : ''}
        </div>
      </div>
      ${!item.isTask ? `
        <button class="icon-btn del" data-del-event="${escHtml(item.id)}" title="Smazat" aria-label="Smazat událost">✕</button>
      ` : ''}
    </div>`).join('');

  container.querySelectorAll('[data-del-event]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const ev = window.APP_DATA.events.find(e => e.id === btn.dataset.delEvent);
      confirmDelete(`Opravdu smazat událost „${ev?.name || ''}"?`, () => deleteEvent(btn.dataset.delEvent));
    });
  });
}

/* ─────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────── */
function _getEventsForDate(dateStr) {
  return window.APP_DATA.events.filter(ev => ev.event_date === dateStr);
}

function _getWeekStart(d) {
  const date = new Date(d);
  const diff = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/* ═══════════════════════════════════════════════════════
   NAVIGACE
═══════════════════════════════════════════════════════ */
document.getElementById('calPrev')?.addEventListener('click', () => {
  if (calView === 'month') calDate.setMonth(calDate.getMonth() - 1);
  else calDate.setDate(calDate.getDate() - 7);
  renderCalendar();
});

document.getElementById('calNext')?.addEventListener('click', () => {
  if (calView === 'month') calDate.setMonth(calDate.getMonth() + 1);
  else calDate.setDate(calDate.getDate() + 7);
  renderCalendar();
});

document.querySelector('.cal-view-toggle')?.addEventListener('click', e => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  calView = btn.dataset.view;
  renderCalendar();
});

/* ═══════════════════════════════════════════════════════
   COLOR PICKER
═══════════════════════════════════════════════════════ */
document.getElementById('eventColorPicker')?.addEventListener('click', e => {
  const dot = e.target.closest('.color-dot');
  if (!dot) return;
  document.querySelectorAll('#eventColorPicker .color-dot').forEach(d => d.classList.remove('active'));
  dot.classList.add('active');
  selectedEventColor = dot.dataset.color;
});

/* ═══════════════════════════════════════════════════════
   MODAL — nová událost
═══════════════════════════════════════════════════════ */
document.getElementById('addEventBtn')?.addEventListener('click', () => {
  _openAddEventModal(today());
});

function _openAddEventModal(dateStr = '') {
  eventEditId        = null;
  selectedEventColor = '#6366F1';
  document.getElementById('eventModalTitle').textContent = 'Nová událost';
  document.getElementById('eventName').value    = '';
  document.getElementById('eventDate').value    = dateStr;
  document.getElementById('eventEndDate').value = dateStr;
  document.getElementById('eventTime').value    = '';
  document.getElementById('eventDesc').value    = '';
  const wg = document.getElementById('eventWorkdaysGroup');
  if (wg) wg.style.display = 'none';
  const wc = document.getElementById('eventWorkdaysOnly');
  if (wc) wc.checked = false;
  document.querySelectorAll('#eventColorPicker .color-dot').forEach((d, i) => d.classList.toggle('active', i === 0));
  _clearEventErrors();
  openModal('eventModal');
}

function _updateWorkdaysVisibility() {
  const startVal = document.getElementById('eventDate')?.value;
  const endVal   = document.getElementById('eventEndDate')?.value;
  const group    = document.getElementById('eventWorkdaysGroup');
  if (!group) return;
  if (endVal && startVal && endVal > startVal) {
    group.style.display = 'block';
  } else {
    group.style.display = 'none';
    const cb = document.getElementById('eventWorkdaysOnly');
    if (cb) cb.checked = false;
  }
}

document.getElementById('eventDate')?.addEventListener('change', () => {
  const startEl = document.getElementById('eventDate');
  const endEl   = document.getElementById('eventEndDate');
  if (endEl && startEl && endEl.value && endEl.value < startEl.value) {
    endEl.value = startEl.value;
  }
  _updateWorkdaysVisibility();
});

document.getElementById('eventEndDate')?.addEventListener('change', _updateWorkdaysVisibility);

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ UDÁLOSTI
═══════════════════════════════════════════════════════ */
document.getElementById('saveEventBtn')?.addEventListener('click', saveEvent);
document.getElementById('eventName')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); saveEvent(); }
});

async function saveEvent() {
  _clearEventErrors();
  const name         = document.getElementById('eventName').value.trim();
  const startDate    = document.getElementById('eventDate').value;
  const endDate      = document.getElementById('eventEndDate').value;
  const workdaysOnly = document.getElementById('eventWorkdaysOnly')?.checked || false;

  if (!name) {
    document.getElementById('eventNameErr').textContent = 'Zadejte název události.';
    document.getElementById('eventName').focus(); return;
  }
  if (!startDate) {
    document.getElementById('eventNameErr').textContent = 'Vyberte datum.';
    return;
  }

  const effectiveEnd = endDate && endDate >= startDate ? endDate : startDate;
  const dates        = _getDatesInRange(startDate, effectiveEnd, workdaysOnly);

  if (dates.length === 0) {
    document.getElementById('eventNameErr').textContent = 'V zadaném rozsahu nejsou žádné pracovní dny.';
    return;
  }

  const basePayload = {
    name,
    event_time:  document.getElementById('eventTime').value || null,
    description: document.getElementById('eventDesc').value.trim() || null,
    color:       selectedEventColor,
    user_id:     typeof currentUser !== 'undefined' && currentUser?.id ? currentUser.id : 'guest',
  };

  const btn = document.getElementById('saveEventBtn');
  btn.disabled = true; btn.textContent = 'Ukládám…';

  try {
    if (typeof isGuestMode === 'function' && isGuestMode()) {
      const now = new Date().toISOString();
      dates.forEach((d, i) => {
        window.APP_DATA.events.push({
          ...basePayload,
          id:         'guest_ev_' + Date.now() + '_' + i,
          event_date: d,
          created_at: now,
        });
      });
      window.APP_DATA.events.sort((a, b) => a.event_date < b.event_date ? -1 : 1);
      closeModal('eventModal');
      renderCalendar();
      showToast(
        dates.length > 1 ? `${dates.length} událostí přidáno (jen lokálně)` : 'Událost přidána (jen lokálně)',
        'warning', 3500
      );
      if (typeof guestActionWarning === 'function') guestActionWarning('Událost');
      return;
    }

    const payloads = dates.map(d => ({ ...basePayload, event_date: d }));

    if (payloads.length === 1) {
      const { data, error } = await window.supabaseClient
        .from('events').insert(payloads[0]).select().single();
      if (error) throw error;
      window.APP_DATA.events.push(data);
    } else {
      const { data, error } = await window.supabaseClient
        .from('events').insert(payloads).select();
      if (error) throw error;
      window.APP_DATA.events.push(...data);
    }

    window.APP_DATA.events.sort((a, b) => a.event_date < b.event_date ? -1 : 1);
    closeModal('eventModal');
    renderCalendar();
    showToast(dates.length > 1 ? `${dates.length} událostí přidáno` : 'Událost přidána', 'success');
    if (typeof addXP === 'function') addXP(5, 'Událost přidána');

  } catch (err) {
    console.error('[Planify] saveEvent:', err);
    document.getElementById('eventNameErr').textContent =
      typeof friendlyDbError === 'function' ? friendlyDbError(err) : 'Chyba při ukládání.';
  } finally {
    btn.disabled = false; btn.textContent = 'Uložit událost';
  }
}

function _getDatesInRange(startStr, endStr, workdaysOnly) {
  const dates   = [];
  const current = new Date(startStr + 'T00:00:00');
  const end     = new Date(endStr + 'T00:00:00');
  while (current <= end) {
    const dow = current.getDay(); // 0=Ne, 1=Po … 5=Pá, 6=So
    if (!workdaysOnly || (dow >= 1 && dow <= 5)) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ UDÁLOSTI
═══════════════════════════════════════════════════════ */
async function deleteEvent(id) {
  const idx     = window.APP_DATA.events.findIndex(e => e.id === id);
  const removed = window.APP_DATA.events.splice(idx, 1)[0];
  renderCalendar();

  if (typeof isGuestMode === 'function' && isGuestMode()) {
    showToast('Událost smazána', 'info'); return;
  }

  const { error } = await window.supabaseClient.from('events').delete().eq('id', id);
  if (error) {
    window.APP_DATA.events.splice(idx, 0, removed);
    window.APP_DATA.events.sort((a, b) => a.event_date < b.event_date ? -1 : 1);
    renderCalendar();
    showToast(typeof friendlyDbError === 'function' ? friendlyDbError(error) : 'Chyba.', 'error');
    return;
  }
  showToast('Událost smazána', 'info');
}

function _clearEventErrors() {
  const err = document.getElementById('eventNameErr');
  if (err) err.textContent = '';
}
