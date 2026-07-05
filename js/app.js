/* js/app.js — Main Application Entry Point */

import { ICS }                              from './data/ics.js';
import { renderLibrary, bindLibraryEvents } from './components/library.js';
import { renderSimulator, bindSimulatorEvents } from './components/simulator.js';
import { renderProblems, bindProblemsEvents }   from './components/problems.js';

/* ══════════════════════════════════════════════════════════
   GLOBAL APPLICATION STATE
   Single source of truth — every UI change goes through here
══════════════════════════════════════════════════════════ */
const state = {
  /* navigation */
  activeTab: 'library',

  /* library */
  search:     '',
  category:   'All',
  selectedIC: null,

  /* simulator */
  simICId:    '7408',
  activeGate: 0,
  pinStates:  {},

  /* problems */
  activeProbId:  null,
  probInputs:    [],
  showSolution:  false
};

/* ══════════════════════════════════════════════════════════
   RENDER — full page re-render (tab switch or IC change)
══════════════════════════════════════════════════════════ */
function render() {
  const main = document.getElementById('main');
  if (!main) return;

  switch (state.activeTab) {
    case 'library':
      main.innerHTML = renderLibrary(state);
      bindLibraryEvents(state, setState);
      break;

    case 'simulator':
      main.innerHTML = renderSimulator(state);
      bindSimulatorEvents(state, setState);
      break;

    case 'problems':
      main.innerHTML = renderProblems(state);
      bindProblemsEvents(state, setState);
      break;

    default:
      main.innerHTML = '<p style="color:#22c55e;padding:40px">Unknown tab.</p>';
  }
}

/* ══════════════════════════════════════════════════════════
   setState — merge partial state and decide render strategy
══════════════════════════════════════════════════════════ */
function setState(partial) {
  const tabChanged = partial.activeTab && partial.activeTab !== state.activeTab;

  Object.assign(state, partial);

  if (tabChanged) {
    /* update tab button styles */
    document.querySelectorAll('.tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
    });
  }

  render();
}

/* ══════════════════════════════════════════════════════════
   TAB NAVIGATION
══════════════════════════════════════════════════════════ */
function bindTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === state.activeTab) return;
      setState({ activeTab: btn.dataset.tab });
    });
  });
}

/* ══════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════ */
function bindKeyboard() {
  document.addEventListener('keydown', e => {
    /* Alt+1/2/3 — switch tabs */
    if (e.altKey && e.key === '1') setState({ activeTab: 'library' });
    if (e.altKey && e.key === '2') setState({ activeTab: 'simulator' });
    if (e.altKey && e.key === '3') setState({ activeTab: 'problems' });

    /* Escape — close IC detail in library */
    if (e.key === 'Escape' && state.activeTab === 'library' && state.selectedIC) {
      state.selectedIC = null;
      render();
    }

    /* / — focus search in library */
    if (e.key === '/' && state.activeTab === 'library') {
      const inp = document.getElementById('search-input');
      if (inp && document.activeElement !== inp) {
        e.preventDefault();
        inp.focus();
      }
    }
  });
}

/* ══════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  bindTabs();
  bindKeyboard();
  render();

  /* Console welcome */
  console.log(
    '%c⚡ LogicKit IC Simulator\n' +
    '%cDigital Electronics Reference · 74xx TTL Series\n' +
    'Shortcuts: Alt+1 Library  Alt+2 Simulator  Alt+3 Problems  / Search  Esc Close',
    'color:#22c55e;font-size:16px;font-weight:bold;',
    'color:#4b5563;font-size:11px;'
  );
  console.log(`%c${Object.keys(ICS).length} ICs loaded.`,
    'color:#22c55e;font-size:11px;');
});
