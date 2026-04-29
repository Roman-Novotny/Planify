/* ═══════════════════════════════════════════════════════
   Planify — js/notes.js  v3
   WYSIWYG editor — tučné = tučné, žádné hvězdičky
   Používá contenteditable div místo textarea
═══════════════════════════════════════════════════════ */

let noteEditId      = null;
let noteSearchQuery = '';

/* ═══════════════════════════════════════════════════════
   RENDER MŘÍŽKY
═══════════════════════════════════════════════════════ */
function renderNotes() {
  const D    = window.APP_DATA;
  const list = document.getElementById('notesList');
  if (!list) return;

  let notes = [...D.notes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

  if (noteSearchQuery) {
    const q = noteSearchQuery.toLowerCase();
    notes = notes.filter(n =>
      (n.title    || '').toLowerCase().includes(q) ||
      (n.content  || '').toLowerCase().includes(q) ||
      (n.category || '').toLowerCase().includes(q)
    );
  }

  if (notes.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">◧</div>
        <div class="empty-state-title">${noteSearchQuery ? 'Nic nenalezeno' : 'Žádné poznámky'}</div>
        <div class="empty-state-sub">
          ${noteSearchQuery
            ? `Pro „${escHtml(noteSearchQuery)}" nebyly nalezeny žádné poznámky.`
            : 'Vytvořte první poznámku kliknutím na „+ Poznámka".'}
        </div>
      </div>`;
    return;
  }

  list.innerHTML = notes.map(n => {
    const dateStr   = n.updated_at
      ? new Date(n.updated_at).toLocaleDateString('cs-CZ', { day:'numeric', month:'short', year:'numeric' })
      : '';
    // Preview: z HTML obsahu vytrhnout čistý text
    const plainText = _htmlToPlainText(n.content || '').slice(0, 180);
    const titleHl   = noteSearchQuery ? _highlight(escHtml(n.title || 'Bez názvu'), noteSearchQuery) : escHtml(n.title || 'Bez názvu');
    const previewHl = noteSearchQuery ? _highlight(escHtml(plainText), noteSearchQuery) : escHtml(plainText);

    return `
    <div class="note-card" role="listitem"
         data-note-id="${escHtml(n.id)}"
         tabindex="0">

      <div class="note-card-actions">
        <button class="icon-btn" data-edit-note="${escHtml(n.id)}" title="Upravit">✎</button>
        <button class="icon-btn del" data-del-note="${escHtml(n.id)}" title="Smazat">✕</button>
      </div>

      <div class="note-card-title">${titleHl}</div>
      <div class="note-card-preview">${previewHl || '<em style="color:var(--text-muted)">Prázdná poznámka</em>'}</div>

      <div class="note-card-footer">
        <span class="note-card-date">${dateStr}</span>
        ${n.category ? `<span class="note-card-cat">${escHtml(n.category)}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('.note-card-actions')) openEditNote(card.dataset.noteId);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditNote(card.dataset.noteId); }
    });
  });

  list.querySelectorAll('[data-edit-note]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openEditNote(btn.dataset.editNote); });
  });

  list.querySelectorAll('[data-del-note]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const note = window.APP_DATA.notes.find(n => n.id === btn.dataset.delNote);
      confirmDelete(`Opravdu smazat poznámku „${note?.title || 'Bez názvu'}"?`, () => deleteNote(btn.dataset.delNote));
    });
  });
}

/* ─────────────────────────────────────────────────────
   POMOCNÉ — HTML → plain text pro preview
───────────────────────────────────────────────────── */
function _htmlToPlainText(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function _highlight(text, query) {
  if (!query) return text;
  const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(
    new RegExp(`(${esc})`, 'gi'),
    '<mark style="background:rgba(251,191,36,0.3);color:var(--text-primary);border-radius:2px;padding:0 2px">$1</mark>'
  );
}

/* ═══════════════════════════════════════════════════════
   VYHLEDÁVÁNÍ
═══════════════════════════════════════════════════════ */
document.getElementById('noteSearch')?.addEventListener('input', e => {
  noteSearchQuery = e.target.value.trim();
  renderNotes();
});

/* ═══════════════════════════════════════════════════════
   MODAL — WYSIWYG EDITOR
   Inicializace — přepnout textarea na contenteditable
═══════════════════════════════════════════════════════ */
function _initWysiwygEditor() {
  const modalBody = document.querySelector('#noteModal .modal-body');
  if (!modalBody) return;
  if (document.getElementById('noteEditor')) return; // Již inicializováno

  // Skrýt textarea pokud existuje
  const oldTextarea = document.getElementById('noteContent');
  if (oldTextarea) oldTextarea.style.display = 'none';

  // Skrýt preview div
  const oldPreview = document.getElementById('notePreview');
  if (oldPreview) oldPreview.style.display = 'none';

  // Nahradit toolbar
  const toolbar = document.querySelector('.note-toolbar');
  if (toolbar) {
    toolbar.innerHTML = `
      <button type="button" class="note-tool" data-cmd="bold"        title="Tučné (Ctrl+B)"><b>B</b></button>
      <button type="button" class="note-tool italic-btn" data-cmd="italic"      title="Kurzíva (Ctrl+I)"><i>I</i></button>
      <button type="button" class="note-tool" data-cmd="underline"   title="Podtržené (Ctrl+U)"><u>U</u></button>
      <button type="button" class="note-tool strike-btn" data-cmd="strikeThrough" title="Přeškrtnuté"><s>S</s></button>
      <span class="toolbar-sep"></span>
      <button type="button" class="note-tool" data-cmd="h2"          title="Nadpis">H2</button>
      <button type="button" class="note-tool" data-cmd="insertUnorderedList" title="Seznam s odrážkami">≡</button>
      <button type="button" class="note-tool" data-cmd="insertOrderedList"   title="Číslovaný seznam">1.</button>
      <span class="toolbar-sep"></span>
      <button type="button" class="note-tool" data-cmd="removeFormat" title="Odstranit formátování">✕ fmt</button>`;
  }

  // Vytvořit contenteditable editor
  const editorWrap = document.querySelector('.note-editor-wrap');
  if (editorWrap) {
    editorWrap.innerHTML = `
      <div id="noteEditor"
           class="note-wysiwyg-editor"
           contenteditable="true"
           role="textbox"
           aria-multiline="true"
           aria-label="Obsah poznámky"
           data-placeholder="Začněte psát… Tučné, kurzíva, nadpisy — vše funguje přímo.">
      </div>`;
  }

  // Bind toolbar tlačítka
  toolbar?.querySelectorAll('[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // Neztrácet focus z editoru
      const cmd = btn.dataset.cmd;
      if (cmd === 'h2') {
        _insertH2();
      } else {
        document.execCommand(cmd, false, null);
      }
      _updateToolbarState();
      _getEditor()?.focus();
    });
  });

  // Klávesové zkratky v editoru
  document.getElementById('noteEditor')?.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey)) {
      switch (e.key) {
        case 's': e.preventDefault(); saveNote(); break;
        case 'b': e.preventDefault(); document.execCommand('bold',      false, null); break;
        case 'i': e.preventDefault(); document.execCommand('italic',    false, null); break;
        case 'u': e.preventDefault(); document.execCommand('underline', false, null); break;
      }
    }
    _updateToolbarState();
  });

  // Aktualizovat stav tlačítek při výběru
  document.getElementById('noteEditor')?.addEventListener('mouseup', _updateToolbarState);
  document.getElementById('noteEditor')?.addEventListener('keyup',   _updateToolbarState);
}

/* ─────────────────────────────────────────────────────
   Vložit H2 jako blok
───────────────────────────────────────────────────── */
function _insertH2() {
  const editor = _getEditor();
  if (!editor) return;
  editor.focus();
  // Pokud je již H2 — přepnout na DIV
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const node = sel.getRangeAt(0).commonAncestorContainer;
  const block = _closestBlock(node);
  if (block && block.tagName === 'H2') {
    document.execCommand('formatBlock', false, 'div');
  } else {
    document.execCommand('formatBlock', false, 'h2');
  }
}

function _closestBlock(node) {
  let n = node;
  while (n && n !== document) {
    if (['H1','H2','H3','P','DIV','LI','BLOCKQUOTE'].includes(n.nodeName)) return n;
    n = n.parentNode;
  }
  return null;
}

/* ─────────────────────────────────────────────────────
   Aktualizovat vizuální stav toolbar tlačítek
───────────────────────────────────────────────────── */
function _updateToolbarState() {
  const cmds = ['bold','italic','underline','strikeThrough','insertUnorderedList','insertOrderedList'];
  const toolbar = document.querySelector('.note-toolbar');
  if (!toolbar) return;
  cmds.forEach(cmd => {
    const btn = toolbar.querySelector(`[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle('active-format', document.queryCommandState(cmd));
  });
}

function _getEditor() {
  return document.getElementById('noteEditor');
}

/* ═══════════════════════════════════════════════════════
   OTEVŘÍT MODAL — nová poznámka
═══════════════════════════════════════════════════════ */
document.getElementById('addNoteBtn')?.addEventListener('click', () => {
  noteEditId = null;
  document.getElementById('noteModalTitle').textContent = 'Nová poznámka';
  document.getElementById('noteTitle').value    = '';
  document.getElementById('noteCategory').value = '';

  _initWysiwygEditor();
  const editor = _getEditor();
  if (editor) editor.innerHTML = '';

  openModal('noteModal');
  setTimeout(() => document.getElementById('noteTitle')?.focus(), 80);
});

/* ═══════════════════════════════════════════════════════
   OTEVŘÍT MODAL — editace
═══════════════════════════════════════════════════════ */
function openEditNote(id) {
  const note = window.APP_DATA.notes.find(n => n.id === id);
  if (!note) return;

  noteEditId = id;
  document.getElementById('noteModalTitle').textContent = 'Upravit poznámku';
  document.getElementById('noteTitle').value    = note.title    || '';
  document.getElementById('noteCategory').value = note.category || '';

  _initWysiwygEditor();

  const editor = _getEditor();
  if (editor) {
    // Pokud je obsah uložen jako HTML → vložit přímo
    // Pokud jako markdown → převést na HTML
    const content = note.content || '';
    if (content.startsWith('<') || content.includes('</')) {
      // Vypadá jako HTML
      editor.innerHTML = content;
    } else {
      // Starý markdown → konvertovat
      editor.innerHTML = _markdownToHtml(content);
    }
  }

  openModal('noteModal');
}

/* ─────────────────────────────────────────────────────
   Konverze starého markdownu na HTML (migrace dat)
───────────────────────────────────────────────────── */
function _markdownToHtml(md) {
  if (!md) return '';
  const lines = md.split('\n');
  const out   = [];
  let inList   = false;

  for (const line of lines) {
    if (/^#{1,2}\s+/.test(line)) {
      if (inList) { out.push('</ul>'); inList = false; }
      const text = line.replace(/^#{1,2}\s+/, '');
      out.push(`<h2>${_inlineMdToHtml(text)}</h2>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${_inlineMdToHtml(line.replace(/^[-*]\s+/, ''))}</li>`);
    } else if (/^---+$/.test(line.trim())) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<hr>');
    } else if (line.trim() === '') {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<br>');
    } else {
      out.push(`<div>${_inlineMdToHtml(line)}</div>`);
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

function _inlineMdToHtml(text) {
  return String(text)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
}

/* ═══════════════════════════════════════════════════════
   ULOŽENÍ POZNÁMKY
═══════════════════════════════════════════════════════ */
document.getElementById('saveNoteBtn')?.addEventListener('click', saveNote);

async function saveNote() {
  const title    = document.getElementById('noteTitle').value.trim();
  const editor   = _getEditor();
  const category = document.getElementById('noteCategory').value.trim();

  // Získat HTML obsah z editoru
  const content = editor ? editor.innerHTML.trim() : '';
  const plainText = editor ? (editor.textContent || editor.innerText || '').trim() : '';

  if (!title && !plainText) {
    showToast('Zadejte alespoň nadpis nebo obsah poznámky.', 'warning');
    document.getElementById('noteTitle').focus();
    return;
  }

  const now     = new Date().toISOString();
  const payload = {
    title:      title    || null,
    content:    content  || null,  // Ukládáme jako HTML
    category:   category || null,
    user_id:    currentUser?.id || 'guest',
    updated_at: now,
  };

  const btn = document.getElementById('saveNoteBtn');
  btn.disabled = true; btn.textContent = 'Ukládám…';

  try {
    // Režim hosta — ukládat jen lokálně
    if (typeof isGuestMode === 'function' && isGuestMode()) {
      _saveNoteGuest(payload, now);
      closeModal('noteModal');
      renderNotes(); renderDashboard();
      return;
    }

    if (noteEditId) {
      const { data, error } = await window.supabaseClient
        .from('notes').update(payload).eq('id', noteEditId).select().single();
      if (error) throw error;
      const idx = window.APP_DATA.notes.findIndex(n => n.id === noteEditId);
      if (idx !== -1) window.APP_DATA.notes[idx] = data;
      showToast('Poznámka uložena', 'success');
    } else {
      payload.created_at = now;
      const { data, error } = await window.supabaseClient
        .from('notes').insert(payload).select().single();
      if (error) throw error;
      window.APP_DATA.notes.unshift(data);
      showToast('Poznámka přidána', 'success');
      if (typeof xpNoteCreated === 'function') xpNoteCreated();
    }

    closeModal('noteModal');
    renderNotes(); renderDashboard();

  } catch (err) {
    console.error('[Planify] saveNote:', err);
    showToast(typeof friendlyDbError === 'function' ? friendlyDbError(err) : 'Chyba při ukládání.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Uložit poznámku';
  }
}

/* ─────────────────────────────────────────────────────
   Ukládání pro hosta (localStorage)
───────────────────────────────────────────────────── */
function _saveNoteGuest(payload, now) {
  if (noteEditId) {
    const idx = window.APP_DATA.notes.findIndex(n => n.id === noteEditId);
    if (idx !== -1) window.APP_DATA.notes[idx] = { ...window.APP_DATA.notes[idx], ...payload };
  } else {
    payload.id         = 'guest_' + Date.now();
    payload.created_at = now;
    window.APP_DATA.notes.unshift(payload);
  }
  _persistGuestData();
  showToast('Poznámka uložena lokálně (režim hosta)', 'warning', 4000);
}

function _persistGuestData() {
  try {
    localStorage.setItem('planify_guest_notes', JSON.stringify(window.APP_DATA.notes));
    localStorage.setItem('planify_guest_tasks', JSON.stringify(window.APP_DATA.tasks));
    localStorage.setItem('planify_guest_habits', JSON.stringify(window.APP_DATA.habits));
    localStorage.setItem('planify_guest_goals', JSON.stringify(window.APP_DATA.goals));
  } catch {}
}

/* ═══════════════════════════════════════════════════════
   SMAZÁNÍ
═══════════════════════════════════════════════════════ */
async function deleteNote(id) {
  const idx     = window.APP_DATA.notes.findIndex(n => n.id === id);
  const removed = window.APP_DATA.notes.splice(idx, 1)[0];
  renderNotes(); renderDashboard();

  // Guest mode
  if (typeof isGuestMode === 'function' && isGuestMode()) {
    _persistGuestData();
    showToast('Poznámka smazána', 'info');
    return;
  }

  const { error } = await window.supabaseClient.from('notes').delete().eq('id', id);
  if (error) {
    window.APP_DATA.notes.splice(idx, 0, removed);
    renderNotes();
    showToast(typeof friendlyDbError === 'function' ? friendlyDbError(error) : 'Chyba.', 'error');
    return;
  }
  showToast('Poznámka smazána', 'info');
}
