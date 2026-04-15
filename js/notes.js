/* ═══════════════════════════════════════════════════════
   Planify — js/notes.js
   Správa poznámek — Markdown, vyhledávání, CRUD
═══════════════════════════════════════════════════════ */

/* ─────────────────────────────────────────────────────
   STAV MODULU
───────────────────────────────────────────────────── */
let noteEditId      = null;   // ID editované poznámky
let notePreviewMode = false;  // Je aktivní náhled?
let noteSearchQuery = '';     // Aktuální hledaný text

/* ═══════════════════════════════════════════════════════
   RENDER MŘÍŽKY POZNÁMEK
═══════════════════════════════════════════════════════ */
function renderNotes() {
  const D    = window.APP_DATA;
  const list = document.getElementById('notesList');
  if (!list) return;

  // Seřadit od nejnovější (updated_at)
  let notes = [...D.notes].sort(
    (a, b) => new Date(b.updated_at) - new Date(a.updated_at)
  );

  // Filtr dle vyhledávání
  if (noteSearchQuery) {
    const q = noteSearchQuery.toLowerCase();
    notes = notes.filter(n =>
      (n.title   || '').toLowerCase().includes(q) ||
      (n.content || '').toLowerCase().includes(q) ||
      (n.category|| '').toLowerCase().includes(q)
    );
  }

  if (notes.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">◧</div>
        <div class="empty-state-title">
          ${noteSearchQuery ? 'Žádné výsledky' : 'Žádné poznámky'}
        </div>
        <div class="empty-state-sub">
          ${noteSearchQuery
            ? `Pro „${escHtml(noteSearchQuery)}" nebylo nic nalezeno.`
            : 'Vytvořte první poznámku kliknutím na „+ Poznámka".'}
        </div>
      </div>`;
    return;
  }

  list.innerHTML = notes.map(n => {
    // Datum poslední úpravy
    const dateStr = n.updated_at
      ? new Date(n.updated_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    // Náhled textu — strip Markdown syntaxe
    const preview = stripMarkdown(n.content || '').slice(0, 180);

    // Zvýraznění hledaného textu v preview
    const highlightedPreview = noteSearchQuery
      ? _highlightText(preview, noteSearchQuery)
      : escHtml(preview);

    return `
    <div class="note-card"
         role="listitem"
         data-note-id="${escHtml(n.id)}"
         tabindex="0"
         aria-label="Poznámka: ${escHtml(n.title || 'Bez názvu')}">

      <!-- Akční tlačítka (zobrazí se při hoveru) -->
      <div class="note-card-actions">
        <button class="icon-btn"
                data-edit-note="${escHtml(n.id)}"
                title="Upravit"
                aria-label="Upravit poznámku">✎</button>
        <button class="icon-btn del"
                data-del-note="${escHtml(n.id)}"
                title="Smazat"
                aria-label="Smazat poznámku">✕</button>
      </div>

      <!-- Titulek -->
      <div class="note-card-title">
        ${noteSearchQuery
          ? _highlightText(escHtml(n.title || 'Bez názvu'), noteSearchQuery)
          : escHtml(n.title || 'Bez názvu')}
      </div>

      <!-- Náhled obsahu -->
      <div class="note-card-preview">${highlightedPreview || '<em style="color:var(--text-muted)">Prázdná poznámka</em>'}</div>

      <!-- Patička karty -->
      <div class="note-card-footer">
        <span class="note-card-date">${dateStr}</span>
        ${n.category
          ? `<span class="note-card-cat">${escHtml(n.category)}</span>`
          : ''}
      </div>

    </div>`;
  }).join('');

  // ── Events ───────────────────────────────────────────

  // Klik na kartu = otevřít editaci
  list.querySelectorAll('.note-card').forEach(card => {
    const openNote = () => {
      // Ignorovat klik na akční tlačítka
      openEditNote(card.dataset.noteId);
    };
    card.addEventListener('click', e => {
      if (!e.target.closest('.note-card-actions')) openNote();
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNote(); }
    });
  });

  // Editace
  list.querySelectorAll('[data-edit-note]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEditNote(btn.dataset.editNote);
    });
  });

  // Smazání
  list.querySelectorAll('[data-del-note]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const note = window.APP_DATA.notes.find(n => n.id === btn.dataset.delNote);
      confirmDelete(
        `Opravdu smazat poznámku „${note?.title || 'Bez názvu'}"?`,
        () => deleteNote(btn.dataset.delNote)
      );
    });
  });
}

/* ═══════════════════════════════════════════════════════
   VYHLEDÁVÁNÍ V POZNÁMKÁCH
═══════════════════════════════════════════════════════ */
document.getElementById('noteSearch')?.addEventListener('input', e => {
  noteSearchQuery = e.target.value.trim();
  renderNotes();
});

/**
 * Zvýrazní hledaný text v HTML stringu
 * @param {string} text  Již HTML-escapovaný text
 * @param {string} query Hledaný výraz
 */
function _highlightText(text, query) {
  if (!query) return text;
  // Escapovat regex speciální znaky v query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex   = new RegExp(`(${escaped})`, 'gi');
  return String(text).replace(regex,
    '<mark style="background:rgba(251,191,36,0.3);color:var(--text-primary);border-radius:2px;padding:0 2px">$1</mark>'
  );
}

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — nová poznámka
═══════════════════════════════════════════════════════ */
document.getElementById('addNoteBtn')?.addEventListener('click', () => {
  noteEditId      = null;
  notePreviewMode = false;

  document.getElementById('noteModalTitle').textContent = 'Nová poznámka';
  document.getElementById('noteTitle').value    = '';
  document.getElementById('noteContent').value  = '';
  document.getElementById('noteCategory').value = '';

  // Přepnout na editor (ne náhled)
  _switchToEditor();
  openModal('noteModal');
  // Focus na nadpis
  setTimeout(() => document.getElementById('noteTitle').focus(), 80);
});

/* ═══════════════════════════════════════════════════════
   OTEVŘENÍ MODALU — editace
═══════════════════════════════════════════════════════ */
function openEditNote(id) {
  const note = window.APP_DATA.notes.find(n => n.id === id);
  if (!note) return;

  noteEditId      = id;
  notePreviewMode = false;

  document.getElementById('noteModalTitle').textContent = 'Upravit poznámku';
  document.getElementById('noteTitle').value    = note.title    || '';
  document.getElementById('noteContent').value  = note.content  || '';
  document.getElementById('noteCategory').value = note.category || '';

  _switchToEditor();
  openModal('noteModal');
}

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ POZNÁMKY
═══════════════════════════════════════════════════════ */
document.getElementById('saveNoteBtn')?.addEventListener('click', saveNote);

// Ctrl+S v textové oblasti = uložit
document.getElementById('noteContent')?.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveNote();
  }
});

async function saveNote() {
  const title   = document.getElementById('noteTitle').value.trim();
  const content = document.getElementById('noteContent').value; // Neztrácet mezery
  const category = document.getElementById('noteCategory').value.trim();

  // Alespoň obsah nebo nadpis musí být vyplněn
  if (!title && !content.trim()) {
    showToast('Zadejte alespoň nadpis nebo obsah poznámky.', 'warning');
    document.getElementById('noteTitle').focus();
    return;
  }

  const now = new Date().toISOString();
  const payload = {
    title:      title    || null,
    content:    content  || null,
    category:   category || null,
    user_id:    currentUser.id,
    updated_at: now,
  };

  const btn = document.getElementById('saveNoteBtn');
  btn.disabled    = true;
  btn.textContent = 'Ukládám…';

  try {
    if (noteEditId) {
      // ── Aktualizace ─────────────────────────────────
      const { data, error } = await supabase
        .from('notes')
        .update(payload)
        .eq('id', noteEditId)
        .select()
        .single();

      if (error) throw error;

      const idx = window.APP_DATA.notes.findIndex(n => n.id === noteEditId);
      if (idx !== -1) window.APP_DATA.notes[idx] = data;

      showToast('Poznámka uložena', 'success');
    } else {
      // ── Nová poznámka ───────────────────────────────
      payload.created_at = now;

      const { data, error } = await supabase
        .from('notes')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.APP_DATA.notes.unshift(data);
      showToast('Poznámka přidána', 'success');
    }

    closeModal('noteModal');
    renderNotes();
    renderDashboard();

  } catch (err) {
    console.error('[Planify] saveNote chyba:', err);
    showToast('Chyba při ukládání: ' + err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Uložit poznámku';
  }
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ POZNÁMKY
═══════════════════════════════════════════════════════ */
async function deleteNote(id) {
  const idx     = window.APP_DATA.notes.findIndex(n => n.id === id);
  const removed = window.APP_DATA.notes.splice(idx, 1)[0];

  renderNotes();
  renderDashboard();

  const { error } = await supabase.from('notes').delete().eq('id', id);

  if (error) {
    window.APP_DATA.notes.splice(idx, 0, removed);
    renderNotes();
    showToast('Chyba při mazání', 'error');
    return;
  }

  showToast('Poznámka smazána', 'info');
}

/* ═══════════════════════════════════════════════════════
   MARKDOWN TOOLBAR
═══════════════════════════════════════════════════════ */
document.querySelector('.note-toolbar')?.addEventListener('click', e => {
  const btn = e.target.closest('[data-cmd]');
  if (!btn) return;
  _applyMarkdownCmd(btn.dataset.cmd);
});

/**
 * Aplikuje Markdown formátování na vybraný text v textarea
 * @param {string} cmd  bold | italic | h2 | li | hr
 */
function _applyMarkdownCmd(cmd) {
  const ta    = document.getElementById('noteContent');
  if (!ta) return;

  const start = ta.selectionStart;
  const end   = ta.selectionEnd;
  const sel   = ta.value.slice(start, end);
  const before = ta.value.slice(0, start);
  const after  = ta.value.slice(end);

  let insert  = '';
  let cursorOffset = 0; // Posun kursoru po vložení

  switch (cmd) {
    case 'bold':
      if (sel) {
        insert = `**${sel}**`;
        cursorOffset = insert.length;
      } else {
        insert = '**tučný text**';
        cursorOffset = 2; // Za **
      }
      break;

    case 'italic':
      if (sel) {
        insert = `*${sel}*`;
        cursorOffset = insert.length;
      } else {
        insert = '*kurzíva*';
        cursorOffset = 1;
      }
      break;

    case 'h2':
      // Pokud jsme uprostřed řádku — přeskočit na začátek řádku
      const lineStart = before.lastIndexOf('\n') + 1;
      const lineEnd   = after.indexOf('\n');
      const lineText  = ta.value.slice(lineStart, end + (lineEnd === -1 ? after.length : lineEnd));
      // Pokud řádek začíná ## — odebrat
      if (ta.value.slice(lineStart, lineStart + 3) === '## ') {
        ta.value = ta.value.slice(0, lineStart) + ta.value.slice(lineStart + 3);
      } else {
        ta.value = before + '## ' + (sel || 'Nadpis') + after;
      }
      _syncPreview();
      return;

    case 'li':
      if (sel && sel.includes('\n')) {
        // Více řádků — odrážka na každý
        insert = sel.split('\n').map(l => `- ${l}`).join('\n');
      } else {
        insert = `- ${sel || 'položka'}`;
      }
      cursorOffset = insert.length;
      break;

    case 'hr':
      insert = '\n---\n';
      cursorOffset = insert.length;
      break;

    default:
      return;
  }

  ta.value = before + insert + after;

  // Nastavit výběr / kursor
  if (cmd === 'bold' && !sel) {
    // Vybrat placeholder "tučný text"
    ta.selectionStart = start + 2;
    ta.selectionEnd   = start + 2 + 'tučný text'.length;
  } else if (cmd === 'italic' && !sel) {
    ta.selectionStart = start + 1;
    ta.selectionEnd   = start + 1 + 'kurzíva'.length;
  } else if (cmd === 'li' && !sel) {
    ta.selectionStart = start + 2;
    ta.selectionEnd   = start + 2 + 'položka'.length;
  } else {
    ta.selectionStart = start + cursorOffset;
    ta.selectionEnd   = start + cursorOffset;
  }

  ta.focus();
  _syncPreview();
}

/* ═══════════════════════════════════════════════════════
   NÁHLED (PREVIEW)
═══════════════════════════════════════════════════════ */

// Toggle náhled / editor
document.getElementById('previewToggle')?.addEventListener('click', () => {
  notePreviewMode = !notePreviewMode;
  if (notePreviewMode) {
    _syncPreview();
    _switchToPreview();
  } else {
    _switchToEditor();
  }
});

// Živý náhled při psaní (s debounce)
let _previewDebounce = null;
document.getElementById('noteContent')?.addEventListener('input', () => {
  clearTimeout(_previewDebounce);
  _previewDebounce = setTimeout(() => {
    if (notePreviewMode) _syncPreview();
  }, 300);
});

function _syncPreview() {
  const content    = document.getElementById('noteContent')?.value || '';
  const previewEl  = document.getElementById('notePreview');
  if (previewEl) previewEl.innerHTML = renderMarkdown(content) || '<p style="color:var(--text-muted);font-style:italic">Žádný obsah…</p>';
}

function _switchToPreview() {
  const ta        = document.getElementById('noteContent');
  const preview   = document.getElementById('notePreview');
  const toggleBtn = document.getElementById('previewToggle');
  if (ta)        ta.classList.add('hidden');
  if (preview)   preview.classList.remove('hidden');
  if (toggleBtn) toggleBtn.textContent = '✏ Editor';
  notePreviewMode = true;
}

function _switchToEditor() {
  const ta        = document.getElementById('noteContent');
  const preview   = document.getElementById('notePreview');
  const toggleBtn = document.getElementById('previewToggle');
  if (ta)        ta.classList.remove('hidden');
  if (preview)   preview.classList.add('hidden');
  if (toggleBtn) toggleBtn.textContent = '👁 Náhled';
  notePreviewMode = false;
}

// Při zavření modalu resetovat náhled
document.getElementById('noteModal')?.addEventListener('click', e => {
  if (e.target === document.getElementById('noteModal')) {
    _switchToEditor();
  }
});
