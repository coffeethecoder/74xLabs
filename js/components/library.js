/* js/components/library.js — Library View */

import { ICS, CATEGORIES, CAT_COLOR } from '../data/ics.js';

/* ── helpers ──────────────────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function filterICs(state) {
  const q = (state.search || '').toLowerCase();
  return Object.values(ICS).filter(ic => {
    const catOk = state.category === 'All' || ic.category === state.category;
    const srcOk = !q
      || ic.id.toLowerCase().includes(q)
      || ic.name.toLowerCase().includes(q)
      || ic.category.toLowerCase().includes(q)
      || ic.description.toLowerCase().includes(q)
      || (ic.booleanExpr || '').toLowerCase().includes(q)
      || ic.applications.some(a => a.toLowerCase().includes(q));
    return catOk && srcOk;
  });
}

/* ── sub-renderers ────────────────────────────────────────── */
function renderCatPills(active) {
  return CATEGORIES.map(cat => {
    const color = cat === 'All' ? '#22c55e' : (CAT_COLOR[cat] || '#22c55e');
    const isActive = cat === active;
    const style = isActive
      ? `background:${color};color:#000;border-color:${color};opacity:1`
      : `color:${color};border-color:${color}`;
    return `<button class="cat-pill${isActive ? ' active' : ''}"
                    data-cat="${esc(cat)}"
                    style="${style}">${esc(cat)}</button>`;
  }).join('');
}

export function renderICGrid(ics, selectedId) {
  if (!ics.length) {
    return `<div class="empty-state">No ICs match your search.</div>`;
  }
  return ics.map(ic => {
    const color = CAT_COLOR[ic.category] || '#22c55e';
    const sel   = ic.id === selectedId;
    const border= sel ? color : '#1f2937';
    const bg    = sel ? '#0a1a0a' : '#080d08';
    return `
      <div class="ic-card${sel ? ' selected' : ''}"
           data-ic-id="${ic.id}"
           style="border-color:${border};background:${bg}">
        <div class="ic-card-cat"
             style="background:${color}22;color:${color};border:1px solid ${color}44">
          ${esc(ic.category)}
        </div>
        <div class="ic-card-id" style="color:${color}">${esc(ic.id)}</div>
        <div class="ic-card-name">${esc(ic.name)}</div>
        <div class="ic-card-meta">
          <span>${esc(ic.package)}</span>
          <span>${ic.pinCount} pins</span>
          ${ic.gates.length ? `<span>${ic.gates.length} gates</span>` : ''}
        </div>
        ${ic.booleanExpr
          ? `<div class="ic-card-expr" style="color:${color}">${esc(ic.booleanExpr)}</div>`
          : ''}
      </div>`;
  }).join('');
}

function renderTruthTable(tt) {
  const hasNote = tt.rows.some(r => r.note);
  const headers = [
    ...tt.inputs.map(h  => `<th>${esc(String(h))}</th>`),
    ...tt.outputs.map(h => `<th class="out-col">${esc(String(h))}</th>`),
    hasNote ? '<th class="note-col">Note</th>' : ''
  ].join('');

  const bodyRows = tt.rows.map(row => {
    const cells = [
      ...(row.i || []).map(v => `<td>${esc(String(v))}</td>`),
      ...(row.o || []).map(v => `<td class="out-cell">${esc(String(v))}</td>`),
      hasNote ? `<td class="note-cell">${esc(row.note || '')}</td>` : ''
    ].join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div class="tt-wrap">
      <table class="tt">
        <thead><tr>${headers}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

function renderPinMap(ic) {
  return Array.from({ length: ic.pinCount }, (_, i) => i + 1).map(pin => {
    const nm   = ic.pinNames[pin] || `P${pin}`;
    const isV  = pin === ic.vccPin;
    const isG  = pin === ic.gndPin;
    const isIn = ic.gates.some(g => g.inputs.includes(pin));
    const isOut= ic.gates.some(g => g.output === pin);
    const color= isV ? '#fbbf24' : isG ? '#6b7280'
               : isIn ? '#f97316' : isOut ? '#22c55e' : '#2d4a2d';
    return `<div class="pin-item">
               <span class="pin-num">${pin}</span>
               <span style="color:${color}">${esc(nm)}</span>
             </div>`;
  }).join('');
}

export function renderICDetail(ic) {
  const color  = CAT_COLOR[ic.category] || '#22c55e';
  const border = color + '33';

  const gatesHTML = ic.gates.length
    ? `<div class="sec-label" style="margin-top:12px">INTERNAL GATES</div>
       <div class="gates-list">
         ${ic.gates.map(g => `
           <div class="gate-tag">
             <span class="gate-tag-id">${g.label}</span>
             <span class="gate-tag-sep">|</span>
             <span style="color:${color}">${g.type}</span>
             <span class="gate-tag-pins"> [${g.inputs.join(',')}]→${g.output}</span>
           </div>`).join('')}
       </div>`
    : '';

  return `
    <div class="ic-detail" style="background:#080d08;border-color:${border}">
      <div class="ic-detail-hdr">
        <div>
          <div class="ic-card-cat"
               style="background:${color}22;color:${color};border:1px solid ${color}44">
            ${esc(ic.category)}
          </div>
          <div class="ic-detail-id" style="color:${color}">${esc(ic.id)}</div>
          <div class="ic-detail-name">${esc(ic.name)}</div>
          <div class="ic-detail-meta">
            <span>${esc(ic.package)}</span>
            <span>${ic.pinCount} pins</span>
            ${ic.gates.length ? `<span>${ic.gates.length} gates</span>` : ''}
          </div>
        </div>
        <div class="ic-detail-btns">
          <button class="btn-sim" id="btn-simulate-ic"
                  data-ic-id="${ic.id}"
                  style="background:${color};color:#000">
            → Simulate
          </button>
          <button class="btn-close" id="btn-close-detail">✕</button>
        </div>
      </div>

      <div class="ic-detail-desc">${esc(ic.description)}</div>

      ${ic.booleanExpr
        ? `<div class="bool-expr">${esc(ic.booleanExpr)}</div>` : ''}

      ${gatesHTML}

      <div class="sec-label" style="margin-top:12px">
        PIN CONFIGURATION — ${esc(ic.package)}
      </div>
      <div class="pin-map">${renderPinMap(ic)}</div>

      <div class="sec-label">TRUTH TABLE</div>
      ${renderTruthTable(ic.truthTable)}

      <div class="sec-label">APPLICATIONS</div>
      <div class="apps-list">
        ${ic.applications.map(a =>
          `<span class="app-tag">${esc(a)}</span>`).join('')}
      </div>

      ${ic.notes ? `
        <div class="sec-label" style="margin-top:12px">DESIGN NOTES</div>
        <div class="notes-box" style="border-color:${color}">
          ${esc(ic.notes)}
        </div>` : ''}
    </div>`;
}

/* ── main render ──────────────────────────────────────────── */
export function renderLibrary(state) {
  const filtered = filterICs(state);
  return `
    <div class="lib-search-row">
      <input type="text" id="search-input"
             value="${esc(state.search)}"
             placeholder="Search IC… (e.g. 7408, NAND, counter, parity, decoder)" />
      <span class="ic-count">${filtered.length} IC${filtered.length !== 1 ? 's' : ''} found</span>
    </div>

    <div class="cat-pills" id="cat-pills">
      ${renderCatPills(state.category)}
    </div>

    <div id="ic-detail-container">
      ${state.selectedIC ? renderICDetail(state.selectedIC) : ''}
    </div>

    <div class="ic-grid" id="ic-grid">
      ${renderICGrid(filtered, state.selectedIC ? state.selectedIC.id : null)}
    </div>`;
}

/* ── partial update helpers ───────────────────────────────── */
function refreshGrid(state) {
  const grid = document.getElementById('ic-grid');
  if (grid) grid.innerHTML = renderICGrid(filterICs(state), state.selectedIC ? state.selectedIC.id : null);
}

function refreshDetail(state) {
  const container = document.getElementById('ic-detail-container');
  if (container) container.innerHTML = state.selectedIC ? renderICDetail(state.selectedIC) : '';
}

function refreshCount(state) {
  const el = document.querySelector('.ic-count');
  if (el) {
    const n = filterICs(state).length;
    el.textContent = `${n} IC${n !== 1 ? 's' : ''} found`;
  }
}

/* ── event binding ────────────────────────────────────────── */
export function bindLibraryEvents(state, setState) {

  /* search */
  const searchEl = document.getElementById('search-input');
  if (searchEl) {
    // Restore cursor position after re-render
    searchEl.focus();
    searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length);

    searchEl.addEventListener('input', e => {
      state.search = e.target.value;
      refreshGrid(state);
      refreshCount(state);
      bindCardEvents(state, setState);
    });
  }

  /* category pills */
  document.querySelectorAll('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.category = pill.dataset.cat;
      // update pill styles without re-render
      document.querySelectorAll('.cat-pill').forEach(p => {
        const color = p.dataset.cat === 'All'
          ? '#22c55e' : (CAT_COLOR[p.dataset.cat] || '#22c55e');
        const active = p.dataset.cat === state.category;
        p.style.background   = active ? color : 'transparent';
        p.style.color        = active ? '#000' : color;
        p.style.borderColor  = color;
        p.style.opacity      = active ? '1' : '0.55';
        p.classList.toggle('active', active);
      });
      refreshGrid(state);
      refreshCount(state);
      bindCardEvents(state, setState);
    });
  });

  bindCardEvents(state, setState);
  bindDetailEvents(state, setState);
}

function bindCardEvents(state, setState) {
  const grid = document.getElementById('ic-grid');
  if (!grid) return;

  // Remove old listener by replacing with clone
  const newGrid = grid.cloneNode(true);
  grid.parentNode.replaceChild(newGrid, grid);

  newGrid.addEventListener('click', e => {
    const card = e.target.closest('.ic-card');
    if (!card) return;
    const ic = ICS[card.dataset.icId];
    if (!ic) return;

    const wasSelected = state.selectedIC && state.selectedIC.id === ic.id;
    state.selectedIC = wasSelected ? null : ic;

    refreshDetail(state);
    refreshGrid(state);
    bindCardEvents(state, setState);
    bindDetailEvents(state, setState);
  });
}

function bindDetailEvents(state, setState) {
  const btnSim = document.getElementById('btn-simulate-ic');
  if (btnSim) {
    btnSim.addEventListener('click', () => {
      const icId = btnSim.dataset.icId;
      setState({
        activeTab:    'simulator',
        simICId:      icId,
        activeGate:   0,
        pinStates:    {},
        selectedIC:   null
      });
    });
  }

  const btnClose = document.getElementById('btn-close-detail');
  if (btnClose) {
    btnClose.addEventListener('click', () => {
      state.selectedIC = null;
      refreshDetail(state);
      refreshGrid(state);
      bindCardEvents(state, setState);
    });
  }
}
