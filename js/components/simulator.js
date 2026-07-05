/* js/components/simulator.js — Simulator View */

import { ICS, GATE_SYM }          from '../data/ics.js';
import { computePinStates }        from '../simulation/engine.js';
import { renderChipSVG }           from './icchip.js';

/* ── helpers ──────────────────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function currentGate(state) {
  const ic = ICS[state.simICId];
  return ic && ic.gates.length ? ic.gates[state.activeGate] : null;
}

/* ── truth table body (highlighted on current inputs) ─────── */
export function renderTruthTableBody(ic, inputVals) {
  const tt = ic.truthTable;
  const hasNote = tt.rows.some(r => r.note);

  return tt.rows.map(row => {
    const rowInputs = row.i || [];
    const hl = inputVals !== null
      && rowInputs.every((v, j) => String(v) === String((inputVals || [])[j]));

    const cells = [
      ...rowInputs.map(v =>
        `<td${hl ? '' : ''}>${esc(String(v))}</td>`),
      ...(row.o || []).map(v =>
        `<td class="out-cell">${esc(String(v))}</td>`),
      hasNote ? `<td class="note-cell">${esc(row.note || '')}</td>` : ''
    ].join('');

    return `<tr class="${hl ? 'hl' : ''}">${cells}</tr>`;
  }).join('');
}

/* ── output readout panel ─────────────────────────────────── */
export function renderOutputReadout(ic, state) {
  const gate      = currentGate(state);
  if (!gate) return '';

  const computed  = computePinStates(ic, state.activeGate, state.pinStates);
  const outputVal = computed[gate.output] || 0;
  const inputVals = gate.inputs.map(p => state.pinStates[p] || 0);

  const pinRows = gate.inputs.map((pin, i) => {
    const v = inputVals[i];
    return `<div class="pin-row">
              <span class="pin-row-lbl">P${pin} (${esc(ic.pinNames[pin] || '')})</span>
              <span class="pin-badge ${v ? 'high' : 'low'}">${v}</span>
            </div>`;
  }).join('');

  return `
    <div class="output-readout">
      <div>
        <div class="out-label">OUTPUT Y =</div>
        <div class="out-num ${outputVal ? 'high' : 'low'}">${outputVal}</div>
        <div class="out-state ${outputVal ? 'high' : 'low'}">
          ${outputVal ? 'HIGH (Logic 1)' : 'LOW (Logic 0)'}
        </div>
      </div>
      <div class="out-inputs">
        <div class="out-inputs-lbl">INPUTS</div>
        ${pinRows}
      </div>
    </div>`;
}

/* ── full simulator render ────────────────────────────────── */
export function renderSimulator(state) {
  const ic       = ICS[state.simICId];
  const hasGates = ic.gates.length > 0;
  const gate     = hasGates ? ic.gates[state.activeGate] : null;

  /* IC selector dropdown */
  const options = Object.values(ICS).map(x =>
    `<option value="${x.id}" ${x.id === state.simICId ? 'selected' : ''}>
       ${esc(x.id)} — ${esc(x.name)}
     </option>`
  ).join('');

  /* Gate selector buttons */
  const gateBtns = hasGates
    ? `<div class="gate-btns-row">
         <div class="sec-label">GATE SELECT</div>
         ${ic.gates.map((g, i) => `
           <button class="gate-btn ${i === state.activeGate ? 'active' : ''}"
                   data-gate-idx="${i}">
             ${esc(g.label)} (${GATE_SYM[g.type] || g.type})
           </button>`).join('')}
       </div>`
    : '';

  /* computed state for chip colours */
  const computed = computePinStates(ic, state.activeGate, state.pinStates);
  const inputVals = gate ? gate.inputs.map(p => state.pinStates[p] || 0) : null;

  /* truth table */
  const tt   = ic.truthTable;
  const hasN = tt.rows.some(r => r.note);
  const ttHeaders = [
    ...tt.inputs.map(h  => `<th>${esc(String(h))}</th>`),
    ...tt.outputs.map(h => `<th class="out-col">${esc(String(h))}</th>`),
    hasN ? '<th class="note-col">Note</th>' : ''
  ].join('');

  return `
    <!-- Top row: IC selector -->
    <div class="sim-top-row">
      <span class="sim-sel-label">SELECT IC</span>
      <select id="ic-selector">${options}</select>
      ${!hasGates
        ? '<span class="ref-badge">Reference IC — truth table shown</span>'
        : ''}
    </div>

    <!-- Two-column layout -->
    <div class="sim-grid">

      <!-- LEFT: chip -->
      <div class="panel">
        ${gateBtns}
        <div class="chip-outer">
          <div id="chip-svg-wrapper">
            ${renderChipSVG(ic, computed, state.activeGate)}
          </div>
        </div>
        ${hasGates ? `
          <div class="chip-legend">
            <span><span style="color:#f97316">●</span> INPUT — click to toggle</span>
            <span><span style="color:#22c55e">●</span> OUTPUT — computed</span>
            <span><span style="color:#fbbf24">●</span> VCC / GND</span>
          </div>` : ''}
      </div>

      <!-- RIGHT: truth table + output + about -->
      <div class="sim-right">

        <!-- Truth table -->
        <div class="panel">
          <div class="sec-label">
            TRUTH TABLE${gate ? ` — ${esc(gate.label)} (${gate.type})` : ' (Reference)'}
          </div>
          <div class="tt-wrap">
            <table class="tt">
              <thead><tr>${ttHeaders}</tr></thead>
              <tbody id="tt-body">
                ${renderTruthTableBody(ic, inputVals)}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Output readout (gate ICs only) -->
        ${hasGates ? `
          <div class="panel" id="output-readout">
            ${renderOutputReadout(ic, state)}
          </div>` : ''}

        <!-- About this IC -->
        <div class="panel">
          <div class="sec-label">ABOUT ${esc(ic.id)}</div>
          <div class="about-desc">${esc(ic.description)}</div>
          ${ic.booleanExpr
            ? `<div class="about-expr">${esc(ic.booleanExpr)}</div>` : ''}
          ${ic.notes
            ? `<div class="about-notes">${esc(ic.notes)}</div>` : ''}
        </div>

      </div>
    </div>`;
}

/* ── partial update — only chip, output, tt-body ──────────── */
function updateChipArea(state) {
  const ic       = ICS[state.simICId];
  const computed = computePinStates(ic, state.activeGate, state.pinStates);
  const gate     = currentGate(state);
  const inputVals= gate ? gate.inputs.map(p => state.pinStates[p] || 0) : null;

  const chipWrap = document.getElementById('chip-svg-wrapper');
  if (chipWrap) chipWrap.innerHTML = renderChipSVG(ic, computed, state.activeGate);

  const ttBody = document.getElementById('tt-body');
  if (ttBody) ttBody.innerHTML = renderTruthTableBody(ic, inputVals);

  const readout = document.getElementById('output-readout');
  if (readout) readout.innerHTML = renderOutputReadout(ic, state);

  /* re-bind pin clicks after chip re-render */
  bindPinClicks(state);
}

/* ── pin click delegation ─────────────────────────────────── */
function bindPinClicks(state) {
  const wrapper = document.getElementById('chip-svg-wrapper');
  if (!wrapper) return;

  const fresh = wrapper.cloneNode(true);
  wrapper.parentNode.replaceChild(fresh, wrapper);

  fresh.addEventListener('click', e => {
    const target = e.target.closest('[data-pin]');
    if (!target) return;
    const pin = parseInt(target.dataset.pin, 10);
    if (!pin) return;

    const ic   = ICS[state.simICId];
    const gate = currentGate(state);
    if (!gate || !gate.inputs.includes(pin)) return;

    state.pinStates = {
      ...state.pinStates,
      [pin]: (state.pinStates[pin] || 0) ? 0 : 1
    };
    updateChipArea(state);
  });
}

/* ── event binding ────────────────────────────────────────── */
export function bindSimulatorEvents(state, setState) {

  /* IC selector */
  const sel = document.getElementById('ic-selector');
  if (sel) {
    sel.addEventListener('change', e => {
      setState({
        simICId:    e.target.value,
        activeGate: 0,
        pinStates:  {}
      });
    });
  }

  /* Gate buttons */
  document.querySelectorAll('.gate-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.gateIdx, 10);
      if (idx === state.activeGate) return;
      state.activeGate = idx;
      state.pinStates  = {};

      /* update button styles */
      document.querySelectorAll('.gate-btn').forEach((b, i) => {
        b.classList.toggle('active', i === idx);
      });
      updateChipArea(state);
    });
  });

  /* Pin clicks */
  bindPinClicks(state);
}
