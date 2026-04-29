/* ═══════════════════════════════════════════════════════
   Planify — js/finance.js  v3
   Finance — guest mode, XP při přidání, přátelská hlášení
═══════════════════════════════════════════════════════ */

let finBarChart   = null;
let finPieChart   = null;
let txTypeFilter  = 'all';
let txTypeInput   = 'expense';
let finMonth      = '';
let txEditId      = null;

/* ═══════════════════════════════════════════════════════
   HLAVNÍ RENDER
═══════════════════════════════════════════════════════ */
function renderFinance() {
  if (!finMonth) finMonth = currentMonthKey();
  renderFinanceOverview();
  renderBudgetWarnings();
  renderFinanceCharts();
  _populateMonthFilter();
  renderTransactions();
  _populateTxCategorySelect();
}

/* ═══════════════════════════════════════════════════════
   PŘEHLED
═══════════════════════════════════════════════════════ */
function renderFinanceOverview() {
  const D = window.APP_DATA;
  const totalBalance = D.transactions.reduce((s, t) => s + (t.type === 'income' ? +t.amount : -t.amount), 0);

  const balEl = document.getElementById('totalBalance');
  if (balEl) { balEl.textContent = formatCurrency(totalBalance); balEl.style.color = totalBalance >= 0 ? '' : 'var(--red)'; }

  const monthTxs = D.transactions.filter(t => (t.date||'').slice(0,7) === finMonth);
  const inc = monthTxs.filter(t => t.type === 'income') .reduce((s,t) => s + +t.amount, 0);
  const exp = monthTxs.filter(t => t.type === 'expense').reduce((s,t) => s + +t.amount, 0);

  const incEl = document.getElementById('monthIncome');
  const expEl = document.getElementById('monthExpense');
  if (incEl) incEl.textContent = formatCurrency(inc);
  if (expEl) expEl.textContent = formatCurrency(exp);
}

/* ═══════════════════════════════════════════════════════
   UPOZORNĚNÍ NA ROZPOČTY
═══════════════════════════════════════════════════════ */
function renderBudgetWarnings() {
  const container = document.getElementById('budgetWarnings');
  if (!container) return;
  container.innerHTML = '';

  const D        = window.APP_DATA;
  const monthTxs = D.transactions.filter(t => (t.date||'').slice(0,7) === finMonth && t.type === 'expense');

  D.budgets.filter(b => b.month === finMonth).forEach(budget => {
    const spent = monthTxs.filter(t => t.category === budget.category).reduce((s,t) => s + +t.amount, 0);
    const pct   = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
    if (pct < 80) return;

    const icon = getCatIcon(budget.category);
    const name = getCatName(budget.category);
    const div  = document.createElement('div');
    div.className = 'budget-warning';
    div.setAttribute('role', 'alert');
    div.innerHTML = `
      <span style="font-size:18px">${icon}</span>
      <div style="flex:1">
        <strong>${escHtml(name)}:</strong>
        utraceno ${formatCurrency(spent)} z ${formatCurrency(budget.amount)} (${pct} %)
        ${pct >= 100 ? ' — <strong style="color:var(--red)">PŘEKROČENO!</strong>' : ' — přibližujete se limitu'}
      </div>`;
    container.appendChild(div);

    if (pct >= 100 && typeof sendBrowserNotification === 'function') {
      sendBrowserNotification('💰 Překročen rozpočet!', `${name}: ${formatCurrency(spent)} z ${formatCurrency(budget.amount)}`);
    }
  });
}

/* ═══════════════════════════════════════════════════════
   GRAFY
═══════════════════════════════════════════════════════ */
function renderFinanceCharts() {
  const isDark    = document.documentElement.dataset.theme !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#8A8DA8' : '#555770';
  const D         = window.APP_DATA;

  const barLabels = []; const barInc = []; const barExp = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = d.toLocaleDateString('cs-CZ', { month:'short', year:'2-digit' });
    barLabels.push(label);
    const txs = D.transactions.filter(t => (t.date||'').slice(0,7) === key);
    barInc.push(txs.filter(t => t.type === 'income') .reduce((s,t) => s + +t.amount, 0));
    barExp.push(txs.filter(t => t.type === 'expense').reduce((s,t) => s + +t.amount, 0));
  }

  const barCtx = document.getElementById('financeBarChart');
  if (barCtx) {
    if (finBarChart) finBarChart.destroy();
    finBarChart = new Chart(barCtx.getContext('2d'), {
      type: 'bar',
      data: { labels: barLabels, datasets: [
        { label:'Příjmy',  data: barInc, backgroundColor:'rgba(52,211,153,0.75)', borderRadius:5, borderSkipped:false },
        { label:'Výdaje', data: barExp, backgroundColor:'rgba(248,113,113,0.75)', borderRadius:5, borderSkipped:false },
      ]},
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color:textColor, font:{family:'DM Sans',size:12} } },
          tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed.y)}` } },
        },
        scales: {
          x: { grid:{color:gridColor}, ticks:{color:textColor, font:{family:'DM Sans'}} },
          y: { grid:{color:gridColor}, ticks:{color:textColor, font:{family:'DM Sans'}, callback:v => formatCurrency(v)}, beginAtZero:true },
        },
      },
    });
  }

  const expTxs    = D.transactions.filter(t => t.type === 'expense' && (t.date||'').slice(0,7) === finMonth);
  const catTotals = {};
  expTxs.forEach(t => { catTotals[t.category] = (catTotals[t.category]||0) + +t.amount; });
  const catKeys   = Object.keys(catTotals);
  const pieColors = ['#6366F1','#F87171','#34D399','#FBBF24','#60A5FA','#A78BFA','#FB923C','#2DD4BF','#F472B6','#94A3B8'];

  const pieCtx = document.getElementById('financePieChart');
  if (pieCtx) {
    if (finPieChart) finPieChart.destroy();
    finPieChart = new Chart(pieCtx.getContext('2d'), {
      type: 'doughnut',
      data: { labels: catKeys.map(k => `${getCatIcon(k)} ${getCatName(k)}`), datasets: [{
        data: catKeys.map(k => catTotals[k]),
        backgroundColor: pieColors.slice(0, catKeys.length),
        borderWidth: 0, hoverOffset: 6,
      }]},
      options: {
        responsive: true, cutout:'62%',
        plugins: {
          legend: { position:'right', labels:{color:textColor, font:{family:'DM Sans',size:12}, boxWidth:12, padding:10} },
          tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.parsed)}` } },
        },
      },
    });
  }
}

/* ═══════════════════════════════════════════════════════
   MĚSÍČNÍ FILTR
═══════════════════════════════════════════════════════ */
function _populateMonthFilter() {
  const sel = document.getElementById('financeMonthFilter');
  if (!sel) return;
  const curKey = currentMonthKey();
  const months = [...new Set([curKey, ...window.APP_DATA.transactions.map(t => (t.date||'').slice(0,7)).filter(Boolean)])].sort().reverse();
  sel.innerHTML = months.map(m => {
    const [y,mo] = m.split('-');
    const label  = new Date(+y, +mo-1, 1).toLocaleDateString('cs-CZ', { month:'long', year:'numeric' });
    return `<option value="${m}" ${m === finMonth ? 'selected' : ''}>${label}</option>`;
  }).join('');
}

document.getElementById('financeMonthFilter')?.addEventListener('change', e => {
  finMonth = e.target.value;
  renderFinanceOverview(); renderBudgetWarnings(); renderFinanceCharts(); renderTransactions();
});

/* ═══════════════════════════════════════════════════════
   SEZNAM TRANSAKCÍ
═══════════════════════════════════════════════════════ */
function renderTransactions() {
  const D = window.APP_DATA;
  let txs = D.transactions.filter(t => (t.date||'').slice(0,7) === finMonth);
  if (txTypeFilter !== 'all') txs = txs.filter(t => t.type === txTypeFilter);
  txs = txs.sort((a,b) => (b.date||'') < (a.date||'') ? -1 : 1);

  const list = document.getElementById('transactionList');
  if (!list) return;

  if (txs.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">◈</div>
      <div class="empty-state-title">Žádné transakce</div>
      <div class="empty-state-sub">${txTypeFilter !== 'all' ? `V tomto měsíci nemáte žádné ${txTypeFilter === 'income' ? 'příjmy' : 'výdaje'}.` : 'Přidejte první transakci.'}</div></div>`;
    return;
  }

  list.innerHTML = txs.map(t => `
    <div class="tx-item" role="listitem">
      <div class="tx-cat-icon" title="${escHtml(getCatName(t.category))}">${getCatIcon(t.category)}</div>
      <div class="tx-info">
        <div class="tx-desc">${escHtml(t.description)}</div>
        <div class="tx-meta">${escHtml(getCatName(t.category))} · ${formatDate(t.date)}</div>
      </div>
      <div class="tx-amount ${t.type}">${t.type === 'income' ? '+' : '−'}${formatCurrency(t.amount)}</div>
      <div class="tx-actions">
        <button class="icon-btn" data-edit-tx="${escHtml(t.id)}" title="Upravit">✎</button>
        <button class="icon-btn del" data-del-tx="${escHtml(t.id)}" title="Smazat">✕</button>
      </div>
    </div>`).join('');

  list.querySelectorAll('[data-edit-tx]').forEach(btn => btn.addEventListener('click', () => openEditTransaction(btn.dataset.editTx)));
  list.querySelectorAll('[data-del-tx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = D.transactions.find(t => t.id === btn.dataset.delTx);
      confirmDelete(`Opravdu smazat transakci „${tx?.description||''}"?`, () => deleteTransaction(btn.dataset.delTx));
    });
  });
}

document.getElementById('txTypeFilterTabs')?.addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab'); if (!tab) return;
  document.querySelectorAll('#txTypeFilterTabs .filter-tab').forEach(b => b.classList.remove('active'));
  tab.classList.add('active'); txTypeFilter = tab.dataset.type; renderTransactions();
});

/* ═══════════════════════════════════════════════════════
   KATEGORIE SELECT
═══════════════════════════════════════════════════════ */
function _populateTxCategorySelect() {
  const sel = document.getElementById('txCategory'); if (!sel) return;
  const all = [...window.DEFAULT_FIN_CATEGORIES, ...window.APP_DATA.finCategories];
  sel.innerHTML = all.map(c => `<option value="${escHtml(c.id)}">${c.icon} ${escHtml(c.name)}</option>`).join('');
}

document.getElementById('txTypeToggle')?.addEventListener('click', e => {
  const btn = e.target.closest('.toggle-btn'); if (!btn) return;
  document.querySelectorAll('#txTypeToggle .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); txTypeInput = btn.dataset.value;
});

/* ═══════════════════════════════════════════════════════
   PŘIDAT / EDITOVAT TRANSAKCI
═══════════════════════════════════════════════════════ */
document.getElementById('addTransactionBtn')?.addEventListener('click', () => {
  txEditId = null; txTypeInput = 'expense';
  document.getElementById('txModalTitle').textContent = 'Nová transakce';
  document.getElementById('txDesc').value   = '';
  document.getElementById('txAmount').value = '';
  document.getElementById('txDate').value   = today();
  document.querySelectorAll('#txTypeToggle .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.value === 'expense'));
  _populateTxCategorySelect(); _clearTxErrors(); openModal('transactionModal');
});

function openEditTransaction(id) {
  const tx = window.APP_DATA.transactions.find(t => t.id === id); if (!tx) return;
  txEditId = id; txTypeInput = tx.type;
  document.getElementById('txModalTitle').textContent = 'Upravit transakci';
  document.getElementById('txDesc').value   = tx.description || '';
  document.getElementById('txAmount').value = tx.amount      || '';
  document.getElementById('txDate').value   = tx.date        || today();
  document.querySelectorAll('#txTypeToggle .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.value === tx.type));
  _populateTxCategorySelect();
  document.getElementById('txCategory').value = tx.category || 'other';
  _clearTxErrors(); openModal('transactionModal');
}

document.getElementById('saveTxBtn')?.addEventListener('click', saveTransaction);

async function saveTransaction() {
  _clearTxErrors();
  const desc   = document.getElementById('txDesc').value.trim();
  const amount = parseFloat(document.getElementById('txAmount').value);

  if (!desc)              { document.getElementById('txDescErr').textContent   = 'Popis transakce je povinný.'; document.getElementById('txDesc').focus(); return; }
  if (!amount || amount <= 0) { document.getElementById('txAmountErr').textContent = 'Zadejte částku větší než nula.'; document.getElementById('txAmount').focus(); return; }

  const payload = {
    description: desc, amount, type: txTypeInput,
    date:     document.getElementById('txDate').value || today(),
    category: document.getElementById('txCategory').value,
    user_id:  typeof currentUser !== 'undefined' && currentUser?.id ? currentUser.id : 'guest',
  };

  const btn = document.getElementById('saveTxBtn');
  btn.disabled = true; btn.textContent = 'Ukládám…';

  try {
    // Guest mode — jen lokálně, finance ale neumí přežít reload bez více práce
    if (typeof isGuestMode === 'function' && isGuestMode()) {
      if (txEditId) {
        const idx = window.APP_DATA.transactions.findIndex(t => t.id === txEditId);
        if (idx !== -1) window.APP_DATA.transactions[idx] = { ...window.APP_DATA.transactions[idx], ...payload };
      } else {
        payload.id = 'guest_tx_' + Date.now(); payload.created_at = new Date().toISOString();
        window.APP_DATA.transactions.unshift(payload);
      }
      closeModal('transactionModal'); renderFinance(); renderDashboard();
      showToast(txEditId ? 'Transakce upravena (jen lokálně)' : 'Transakce přidána (jen lokálně)', 'warning', 3500);
      if (typeof guestActionWarning === 'function') guestActionWarning('Transakce');
      return;
    }

    if (txEditId) {
      const { data, error } = await window.supabaseClient.from('finance_records').update(payload).eq('id', txEditId).select().single();
      if (error) throw error;
      const idx = window.APP_DATA.transactions.findIndex(t => t.id === txEditId);
      if (idx !== -1) window.APP_DATA.transactions[idx] = data;
      showToast('Transakce upravena', 'success');
    } else {
      const { data, error } = await window.supabaseClient.from('finance_records').insert(payload).select().single();
      if (error) throw error;
      window.APP_DATA.transactions.unshift(data);
      showToast('Transakce přidána', 'success');
      if (typeof xpTransactionAdded === 'function') xpTransactionAdded();
    }
    closeModal('transactionModal'); renderFinance(); renderDashboard();
  } catch (err) {
    console.error('[Planify] saveTransaction:', err);
    document.getElementById('txDescErr').textContent = typeof friendlyDbError === 'function' ? friendlyDbError(err) : 'Chyba při ukládání.';
  } finally { btn.disabled = false; btn.textContent = 'Uložit transakci'; }
}

async function deleteTransaction(id) {
  const idx     = window.APP_DATA.transactions.findIndex(t => t.id === id);
  const removed = window.APP_DATA.transactions.splice(idx, 1)[0];
  renderFinance(); renderDashboard();

  if (typeof isGuestMode === 'function' && isGuestMode()) { showToast('Transakce smazána', 'info'); return; }

  const { error } = await window.supabaseClient.from('finance_records').delete().eq('id', id);
  if (error) { window.APP_DATA.transactions.splice(idx, 0, removed); renderFinance(); showToast(typeof friendlyDbError === 'function' ? friendlyDbError(error) : 'Chyba.', 'error'); return; }
  showToast('Transakce smazána', 'info');
}

/* ═══════════════════════════════════════════════════════
   SPRÁVA KATEGORIÍ
═══════════════════════════════════════════════════════ */
document.getElementById('manageCategoriesBtn')?.addEventListener('click', () => { _renderCategoriesList(); openModal('categoriesModal'); });

function _renderCategoriesList() {
  const list = document.getElementById('categoriesList'); if (!list) return;
  list.innerHTML = '';
  const defH = document.createElement('p');
  defH.style.cssText = 'font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px';
  defH.textContent = 'Výchozí kategorie'; list.appendChild(defH);
  window.DEFAULT_FIN_CATEGORIES.forEach(c => {
    const row = document.createElement('div'); row.className = 'cat-item';
    row.innerHTML = `<div class="cat-icon">${c.icon}</div><div class="cat-name">${escHtml(c.name)}</div><div class="cat-type">${c.type === 'income' ? 'Příjem' : 'Výdaj'}</div><span style="font-size:10.5px;color:var(--text-muted);padding:2px 7px;background:var(--bg-overlay);border-radius:99px">výchozí</span>`;
    list.appendChild(row);
  });
  const userCats = window.APP_DATA.finCategories;
  if (userCats.length > 0) {
    const h2 = document.createElement('p');
    h2.style.cssText = 'font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin:14px 0 8px';
    h2.textContent = 'Vlastní kategorie'; list.appendChild(h2);
    userCats.forEach(c => {
      const row = document.createElement('div'); row.className = 'cat-item';
      row.innerHTML = `<div class="cat-icon">${c.icon||'📦'}</div><div class="cat-name">${escHtml(c.name)}</div><div class="cat-type">${c.type === 'income' ? 'Příjem' : 'Výdaj'}</div><button class="icon-btn del" data-del-cat="${escHtml(c.id)}" aria-label="Smazat">✕</button>`;
      list.appendChild(row);
    });
    list.querySelectorAll('[data-del-cat]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (typeof isGuestMode === 'function' && isGuestMode()) { showToast('V režimu hosta nelze mazat kategorie.', 'warning'); return; }
        const { error } = await window.supabaseClient.from('finance_categories').delete().eq('id', btn.dataset.delCat);
        if (!error) { window.APP_DATA.finCategories = window.APP_DATA.finCategories.filter(c => c.id !== btn.dataset.delCat); _renderCategoriesList(); _populateTxCategorySelect(); showToast('Kategorie smazána', 'info'); }
        else showToast('Chyba při mazání.', 'error');
      });
    });
  }
}

document.getElementById('addCatBtn')?.addEventListener('click', async () => {
  const name = document.getElementById('catName').value.trim();
  const icon = document.getElementById('catIcon').value.trim() || '📦';
  const type = document.getElementById('catType').value;
  const errEl = document.getElementById('catNameErr');
  if (!name) { errEl.textContent = 'Zadejte název kategorie.'; document.getElementById('catName').focus(); return; }
  errEl.textContent = '';
  if (typeof isGuestMode === 'function' && isGuestMode()) { showToast('V režimu hosta nelze přidávat vlastní kategorie. Přihlaste se.', 'warning', 4000); return; }
  const { data, error } = await window.supabaseClient.from('finance_categories').insert({ name, icon, type, user_id: currentUser.id }).select().single();
  if (error) { errEl.textContent = typeof friendlyDbError === 'function' ? friendlyDbError(error) : 'Chyba.'; return; }
  window.APP_DATA.finCategories.push(data);
  document.getElementById('catName').value = ''; document.getElementById('catIcon').value = '';
  _renderCategoriesList(); _populateTxCategorySelect(); showToast('Kategorie přidána', 'success');
});

/* ═══════════════════════════════════════════════════════
   SPRÁVA ROZPOČTŮ
═══════════════════════════════════════════════════════ */
document.getElementById('manageBudgetsBtn')?.addEventListener('click', () => { _renderBudgetsList(); openModal('budgetsModal'); });

function _renderBudgetsList() {
  const list = document.getElementById('budgetsList'); if (!list) return;
  const expCats = [...window.DEFAULT_FIN_CATEGORIES, ...window.APP_DATA.finCategories].filter(c => c.type === 'expense');
  const existing = window.APP_DATA.budgets.filter(b => b.month === finMonth);
  list.innerHTML = expCats.map(c => {
    const ex = existing.find(b => b.category === c.id);
    return `<div class="budget-input-row"><div class="budget-cat-label">${c.icon} ${escHtml(c.name)}</div>
      <input type="number" class="filter-select budget-amount-input" data-budget-cat="${escHtml(c.id)}" value="${ex?.amount||''}" placeholder="Bez limitu" min="0" step="100"/></div>`;
  }).join('');
}

document.getElementById('saveBudgetsBtn')?.addEventListener('click', async () => {
  if (typeof isGuestMode === 'function' && isGuestMode()) { showToast('Rozpočty v režimu hosta nejsou dostupné. Přihlaste se.', 'warning', 4000); closeModal('budgetsModal'); return; }
  const rows    = document.querySelectorAll('[data-budget-cat]');
  const upserts = [];
  rows.forEach(inp => { const catId = inp.dataset.budgetCat; const amount = parseFloat(inp.value); if (amount > 0) upserts.push({ user_id: currentUser.id, category: catId, amount, month: finMonth }); });
  const btn = document.getElementById('saveBudgetsBtn');
  btn.disabled = true; btn.textContent = 'Ukládám…';
  try {
    await window.supabaseClient.from('budgets').delete().eq('user_id', currentUser.id).eq('month', finMonth);
    if (upserts.length > 0) {
      const { data, error } = await window.supabaseClient.from('budgets').insert(upserts).select();
      if (error) throw error;
      window.APP_DATA.budgets = [...window.APP_DATA.budgets.filter(b => b.month !== finMonth), ...data];
    } else { window.APP_DATA.budgets = window.APP_DATA.budgets.filter(b => b.month !== finMonth); }
    closeModal('budgetsModal'); renderBudgetWarnings(); showToast('Rozpočty uloženy', 'success');
  } catch (err) { showToast(typeof friendlyDbError === 'function' ? friendlyDbError(err) : 'Chyba.', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Uložit rozpočty'; }
});

function _clearTxErrors() {
  ['txDescErr','txAmountErr'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
}
