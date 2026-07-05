/* js/components/problems.js — Problems View */

import { PROBLEMS } from '../data/problems.js';

/* ── helpers ──────────────────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

const DIFF_CLASS = { Easy:'diff-Easy', Medium:'diff-Medium', Hard:'diff-Hard' };

/* ── problem list sidebar ─────────────────────────────────── */
function renderProblemList(activeProbId) {
  return PROBLEMS.map(p => `
    <div class="prob-item ${p.id === activeProbId ? 'selected' : ''}"
         data-prob-id="${p.id}">
      <div class="prob-item-top">
        <span class="prob-cat">${esc(p.category)}</span>
        <span class="prob-diff ${DIFF_CLASS[p.difficulty] || ''}">${esc(p.difficulty)}</span>
      </div>
      <div class="prob-title">${esc(p.title)}</div>
      <div class="prob-ics">ICs: ${esc(p.ics.join(', '))}</div>
    </div>`
  ).join('');
}

/* ── IO toggle buttons ────────────────────────────────────── */
function renderIORow(prob, inputs) {
  const inBtns = prob.inputs.map((label, i) => `
    <div class="io-col">
      <span class="io-lbl">${esc(label)}</span>
      <button class="toggle-btn ${inputs[i] ? 'on' : 'off'}"
              data-input-idx="${i}">
        ${inputs[i]}
      </button>
    </div>`).join('');

  const results = prob.verify(inputs.slice(0, prob.inputs.length));

  const outLEDs = prob.outputs.map((label, i) => {
    const val = results[i];
    const isNum = typeof val === 'number';
    const ledClass = isNum ? (val ? 'on' : 'off') : 'str';
    return `
      <div class="io-col">
        <span class="io-lbl" style="color:#22c55e">${esc(label)}</span>
        <div class="out-led ${ledClass}">${esc(String(val))}</div>
      </div>`;
  }).join('');

  return `
    <div class="io-row">
      ${inBtns}
      <span class="io-arrow">→</span>
      ${outLEDs}
    </div>`;
}

/* ── verification truth table (highlighted row) ───────────── */
function renderVerifyTable(prob, inputs) {
  const headers = [
    ...prob.inputs.map(h  => `<th>${esc(h)}</th>`),
    ...prob.outputs.map(h => `<th class="out-col">${esc(h)}</th>`)
  ].join('');

  const rows = prob.rows.map(row => {
    const hl = (row.i || []).every((v, j) =>
      String(v) === String((inputs || [])[j])
    );
    const cells = [
      ...(row.i || []).map(v => `<td>${esc(String(v))}</td>`),
      ...(row.o || []).map(v => `<td class="out-cell">${esc(String(v))}</td>`)
    ].join('');
    return `<tr class="${hl ? 'hl' : ''}">${cells}</tr>`;
  }).join('');

  return `
    <div class="tt-wrap" style="max-height:220px">
      <table class="tt">
        <thead><tr>${headers}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ── problem detail panel ─────────────────────────────────── */
function renderProblemDetail(prob, inputs, showSolution) {
  return `
    <div class="prob-detail">
      <div class="prob-detail-title">${esc(prob.title)}</div>
      <div class="prob-detail-desc">${esc(prob.desc)}</div>

      <!-- Required ICs -->
      <div class="sec-label">REQUIRED ICs</div>
      <div class="ics-row">
        ${prob.ics.map(ic =>
          `<span class="ic-needed-tag">${esc(ic)}</span>`).join('')}
        ${prob.altIcs.length
          ? `<span class="ic-alt-lbl">Alt: ${esc(prob.altIcs.join(', '))}</span>`
          : ''}
      </div>

      <!-- Interactive Verification -->
      <div class="sec-label">INTERACTIVE VERIFICATION</div>
      <div class="verify-box" id="verify-box">
        ${renderIORow(prob, inputs)}
        ${renderVerifyTable(prob, inputs)}
      </div>

      <!-- Solution toggle -->
      <button class="btn-solution" id="btn-solution">
        ${showSolution ? '▼ Hide' : '▶ Show'} Circuit Solution
      </button>

      ${showSolution ? `
        <div class="solution-box">
          <div class="sec-label">CIRCUIT</div>
          <div class="sol-circuit">${esc(prob.circuit)}</div>
          <div class="sec-label">KEY INSIGHT</div>
          <div class="sol-insight">${esc(prob.insight)}</div>
        </div>` : ''}
    </div>`;
}

/* ── main render ──────────────────────────────────────────── */
export function renderProblems(state) {
  const prob = PROBLEMS.find(p => p.id === state.activeProbId);

  return `
    <div class="prob-hdr">
      <h2>PRACTICE PROBLEMS</h2>
      <p>Combinational and sequential design with live truth table verification</p>
    </div>

    <div class="prob-grid">
      <!-- Sidebar list -->
      <div id="prob-list">
        ${renderProblemList(state.activeProbId)}
      </div>

      <!-- Detail panel -->
      <div id="prob-detail">
        ${prob
          ? renderProblemDetail(prob, state.probInputs, state.showSolution)
          : '<div class="empty-state">← Select a problem to begin</div>'}
      </div>
    </div>`;
}

/* ── partial refresh helpers ──────────────────────────────── */
function refreshVerifyBox(prob, inputs) {
  const box = document.getElementById('verify-box');
  if (box) box.innerHTML = renderIORow(prob, inputs) + renderVerifyTable(prob, inputs);
}

function refreshDetail(state) {
  const prob   = PROBLEMS.find(p => p.id === state.activeProbId);
  const detail = document.getElementById('prob-detail');
  if (!detail) return;
  detail.innerHTML = prob
    ? renderProblemDetail(prob, state.probInputs, state.showSolution)
    : '<div class="empty-state">← Select a problem to begin</div>';
}

function refreshList(activeProbId) {
  const list = document.getElementById('prob-list');
  if (list) list.innerHTML = renderProblemList(activeProbId);
}

/* ── event binding ────────────────────────────────────────── */
export function bindProblemsEvents(state, setState) {
  /* Problem list click */
  const list = document.getElementById('prob-list');
  if (list) {
    // Replace to clear old listeners
    const fresh = list.cloneNode(true);
    list.parentNode.replaceChild(fresh, list);
    fresh.addEventListener('click', e => {
      const item = e.target.closest('.prob-item');
      if (!item) return;
      const id = item.dataset.probId;
      if (id === state.activeProbId) return;

      // Reset inputs for new problem
      const prob = PROBLEMS.find(p => p.id === id);
      state.activeProbId  = id;
      state.probInputs    = prob ? Array(prob.inputs.length).fill(0) : [];
      state.showSolution  = false;

      refreshList(state.activeProbId);
      refreshDetail(state);
      bindProblemsEvents(state, setState);
    });
  }

  /* Toggle input buttons */
  bindToggleButtons(state);

  /* Solution button */
  const btnSol = document.getElementById('btn-solution');
  if (btnSol) {
    btnSol.addEventListener('click', () => {
      state.showSolution = !state.showSolution;
      const prob = PROBLEMS.find(p => p.id === state.activeProbId);
      if (!prob) return;
      refreshDetail(state);
      bindToggleButtons(state);
      bindSolutionButton(state);
    });
  }
}

function bindToggleButtons(state) {
  const prob = PROBLEMS.find(p => p.id === state.activeProbId);
  if (!prob) return;

  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.inputIdx, 10);
      state.probInputs[idx] = state.probInputs[idx] ? 0 : 1;
      refreshVerifyBox(prob, state.probInputs);
      bindToggleButtons(state);
    });
  });
}

function bindSolutionButton(state) {
  const btnSol = document.getElementById('btn-solution');
  if (!btnSol) return;
  btnSol.addEventListener('click', () => {
    state.showSolution = !state.showSolution;
    const prob = PROBLEMS.find(p => p.id === state.activeProbId);
    if (!prob) return;
    refreshDetail(state);
    bindToggleButtons(state);
    bindSolutionButton(state);
  });
}
