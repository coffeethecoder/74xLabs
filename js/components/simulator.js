/* js/components/simulator.js — Trainer Kit Simulator */

import { ICS } from '../data/ics.js';
import { simulateGate } from '../simulation/engine.js';
import { simulateComplexIC, getOutputPins } from '../simulation/complexEngine.js';

let nodes = [];
let wires = [];
let nextId = 1;
let isSimRunning = false;

let sockets = [
  { id: 'S1', type: 20, x: 150, y: 120, icNodeId: null },
  { id: 'S2', type: 20, x: 300, y: 120, icNodeId: null },
  { id: 'S3', type: 20, x: 450, y: 120, icNodeId: null },
  { id: 'S4', type: 20, x: 600, y: 120, icNodeId: null },
  { id: 'S5', type: 40, x: 750, y: 120, icNodeId: null }
];

let wireStart = null;
let mousePos = { x: 0, y: 0 };

const WIRE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#f97316", "#06b6d4"];
let nextWireColor = 0;

function initBoard() {
  nodes = [];
  wires = [];
  sockets.forEach(s => s.icNodeId = null);
  nextId = 1;
  nextWireColor = 0;
  isSimRunning = false;

  // 10 Output LEDs (Top)
  for (let i = 0; i < 10; i++) {
    nodes.push({ id: `out_${i}`, type: 'OUTPUT', x: 120 + i * 75, y: 40, value: 0, fixed: true, label: `L${9 - i}` });
  }

  // 10 Input Switches (Bottom)
  for (let i = 0; i < 10; i++) {
    nodes.push({ id: `in_${i}`, type: 'INPUT', x: 120 + i * 75, y: 600, value: 0, fixed: true, label: `SW${9 - i}` });
  }

  // 1 Push Button Pulser (Clock)
  nodes.push({ id: `pulser`, type: 'PULSER', x: 880, y: 600, value: 0, fixed: true, label: `CLOCK` });

  // VCC & GND (Right side panel)
  nodes.push({ id: `vcc`, type: 'POWER', x: 920, y: 200, value: 1, fixed: true, label: '+5V' });
  nodes.push({ id: `gnd`, type: 'POWER', x: 920, y: 300, value: 0, fixed: true, label: 'GND' });
}

// Initialize on load
initBoard();

function getPinPos(node, pinId) {
  if (node.type === 'INPUT') return { x: node.x + 20, y: node.y - 5 };
  if (node.type === 'OUTPUT') return { x: node.x + 20, y: node.y + 45 };
  if (node.type === 'POWER') return { x: node.x + 20, y: node.y + 15 };
  if (node.type === 'PULSER') return { x: node.x + 20, y: node.y - 5 };
  if (node.type === 'IC') {
    const icData = ICS[node.icId];
    const total = icData.pinCount || 14;
    const half = total / 2;
    const pIdx = parseInt(pinId, 10);
    let px, py;
    if (pIdx <= half) {
      px = 0;
      py = 20 * pIdx;
    } else {
      const topIdx = total - pIdx + 1;
      px = 80;
      py = 20 * topIdx;
    }
    return { x: node.x + px, y: node.y + py };
  }
  return { x: 0, y: 0 };
}

function stopSimulation() {
  isSimRunning = false;
  const runBtn = document.getElementById('toggle-run');
  if (runBtn) {
    runBtn.innerHTML = '▶ RUN';
    runBtn.style.color = '#22c55e';
    runBtn.style.borderColor = 'rgba(34,197,94,0.5)';
  }
}

function verifyCircuit() {
  let uf = {};
  function find(i) {
    if (uf[i] === undefined) uf[i] = i;
    if (uf[i] !== i) uf[i] = find(uf[i]);
    return uf[i];
  }
  function union(i, j) {
    uf[find(i)] = find(j);
  }

  wires.forEach(w => {
    union(`${w.from.nodeId}_${w.from.pinId}`, `${w.to.nodeId}_${w.to.pinId}`);
  });

  let errors = [];
  let drivers = new Set();

  nodes.forEach(n => {
    if (n.type === 'INPUT' || n.type === 'POWER' || n.type === 'PULSER') {
      drivers.add(`${n.id}_out`);
    }
    if (n.type === 'IC') {
      const icData = ICS[n.icId];
      if (icData) {
        if (icData.gates && icData.gates.length > 0) {
          icData.gates.forEach(g => drivers.add(`${n.id}_${g.output}`));
        } else {
          getOutputPins(n.icId).forEach(p => drivers.add(`${n.id}_${p}`));
        }
      }
    }
  });

  let netDrivers = {};
  Object.keys(uf).forEach(pin => {
    let r = find(pin);
    if (!netDrivers[r]) netDrivers[r] = 0;
    if (drivers.has(pin)) netDrivers[r]++;
  });

  for (let r in netDrivers) {
    if (netDrivers[r] > 1) {
      errors.push("Short Circuit: Multiple output pins are connected together.");
      break;
    }
  }

  nodes.forEach(n => {
    if (n.type === 'IC') {
      const icData = ICS[n.icId];
      if (icData && icData.vccPin && icData.gndPin) {
        let vccRoot = find(`${n.id}_${icData.vccPin}`);
        let pVcc = find(`vcc_out`);
        let gndRoot = find(`${n.id}_${icData.gndPin}`);
        let pGnd = find(`gnd_out`);

        if (vccRoot !== pVcc) {
          errors.push(`IC ${n.icId} is missing VCC connection on Pin ${icData.vccPin}.`);
        }
        if (gndRoot !== pGnd) {
          errors.push(`IC ${n.icId} is missing GND connection on Pin ${icData.gndPin}.`);
        }
      }
    }
  });

  return [...new Set(errors)];
}

function runSimulation() {
  if (!isSimRunning) {
    nodes.forEach(n => {
      if (n.type === 'OUTPUT') n.value = 0;
      if (n.type === 'IC') {
        const icData = ICS[n.icId];
        if (icData) {
          for (let i = 1; i <= (icData.pinCount || 14); i++) {
            n.pins[i] = 0;
          }
        }
      }
    });
    return;
  }

  // Collect all pins that are connected by wires
  const wiredPins = new Set();
  wires.forEach(w => {
    wiredPins.add(`${w.from.nodeId}_${w.from.pinId}`);
    wiredPins.add(`${w.to.nodeId}_${w.to.pinId}`);
  });

  // Clear IC inputs and OUTPUT nodes to prevent floating states when wires are removed
  nodes.forEach(n => {
    if (n.type === 'OUTPUT') {
      if (!wiredPins.has(`${n.id}_in`)) {
        n.value = 0;
      }
    }
    if (n.type === 'IC') {
      const icData = ICS[n.icId];
      if (icData) {
        const outputPins = new Set();
        if (icData.gates && icData.gates.length > 0) {
          icData.gates.forEach(g => outputPins.add(g.output));
        } else {
          getOutputPins(n.icId).forEach(p => outputPins.add(p));
        }

        for (let i = 1; i <= (icData.pinCount || 14); i++) {
          if (!outputPins.has(i)) {
            // Only clear the pin if no wire is connected to it
            if (!wiredPins.has(`${n.id}_${i}`)) {
              n.pins[i] = 0;
            }
          }
        }
      }
    }
  });

  for (let pass = 0; pass < 5; pass++) {
    let driven = {};

    nodes.forEach(n => {
      if (n.type === 'INPUT' || n.type === 'POWER' || n.type === 'PULSER') {
        driven[`${n.id}_out`] = n.value;
      }

      if (n.type === 'IC') {
        const icData = ICS[n.icId];

        let hasPower = false;
        if (icData.vccPin && icData.gndPin) {
          if (n.pins[icData.vccPin] === 1 && n.pins[icData.gndPin] === 0) {
            hasPower = true;
          }
        } else {
          hasPower = true;
        }

        if (hasPower) {
          if (icData && icData.gates && icData.gates.length > 0) {
            icData.gates.forEach(gate => {
              const inputVals = gate.inputs.map(p => n.pins[p] || 0);
              const outVal = simulateGate(gate.type, inputVals);
              n.pins[gate.output] = outVal;
              driven[`${n.id}_${gate.output}`] = outVal;
            });
          } else {
            // Ensure state persists per node
            if (!n.state) n.state = {};
            simulateComplexIC(n.icId, n.pins, n.state);
            getOutputPins(n.icId).forEach(p => {
              driven[`${n.id}_${p}`] = n.pins[p] || 0;
            });
          }
        } else {
          if (icData && icData.gates && icData.gates.length > 0) {
            icData.gates.forEach(gate => {
              n.pins[gate.output] = 0;
              driven[`${n.id}_${gate.output}`] = 0;
            });
          } else {
            getOutputPins(n.icId).forEach(p => {
              n.pins[p] = 0;
              driven[`${n.id}_${p}`] = 0;
            });
          }
        }
      }
    });

    wires.forEach(w => {
      let val = driven[`${w.from.nodeId}_${w.from.pinId}`];
      if (val === undefined) {
        val = driven[`${w.to.nodeId}_${w.to.pinId}`];
        if (val !== undefined) {
          applyValue(w.from.nodeId, w.from.pinId, val);
        }
      } else {
        applyValue(w.to.nodeId, w.to.pinId, val);
      }
    });

    function applyValue(nId, pId, v) {
      const toNode = nodes.find(n => n.id === nId);
      if (toNode) {
        if (toNode.type === 'OUTPUT') toNode.value = v;
        else if (toNode.type === 'IC') toNode.pins[pId] = v;
      }
    }
  }
}

function drawCanvas() {
  const svg = document.getElementById('sim-canvas');
  if (!svg) return;

  runSimulation();

  let html = '';

  html += `<rect x="50" y="100" width="850" height="460" fill="#1f2937" rx="10" stroke="#374151" stroke-width="4" pointer-events="none" />`;
  html += `<text x="475" y="330" fill="#374151" font-size="30" font-weight="bold" font-family="sans-serif" text-anchor="middle" pointer-events="none" opacity="0.6">DIGITAL LOGIC TRAINER BREADBOARD</text>`;

  sockets.forEach(s => {
    const h = (s.type / 2 + 1) * 20;
    html += `
      <g transform="translate(${s.x}, ${s.y})">
        <rect width="80" height="${h}" fill="#2d3748" stroke="#1a202c" stroke-width="2" rx="4" />
        <text x="40" y="${h / 2}" fill="#1a202c" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" transform="rotate(-90 40 ${h / 2})">${s.type}-PIN SOCKET</text>
    `;
    for (let i = 1; i <= s.type; i++) {
      let px, py;
      if (i <= s.type / 2) {
        px = 0; py = 20 * i;
      } else {
        px = 80; py = 20 * (s.type - i + 1);
      }
      html += `<rect x="${px - 4}" y="${py - 4}" width="8" height="8" fill="#1a202c" rx="2" />`;
    }
    html += `</g>`;
  });

  wires.forEach((w, index) => {
    const fromNode = nodes.find(n => n.id === w.from.nodeId);
    const toNode = nodes.find(n => n.id === w.to.nodeId);
    if (fromNode && toNode) {
      const p1 = getPinPos(fromNode, w.from.pinId);
      const p2 = getPinPos(toNode, w.to.pinId);

      let val = 0;
      if (fromNode.type === 'INPUT' || fromNode.type === 'POWER' || fromNode.type === 'PULSER') val = fromNode.value;
      else if (fromNode.type === 'IC') val = fromNode.pins[w.from.pinId] || 0;
      else if (toNode.type === 'INPUT' || toNode.type === 'POWER' || toNode.type === 'PULSER') val = toNode.value;
      else if (toNode.type === 'IC') val = toNode.pins[w.to.pinId] || 0;

      const opacity = val ? 1 : 0.35;
      const thickness = val ? 4 : 3;
      const shadow = val ? `filter="drop-shadow(0 0 3px ${w.color})"` : '';

      let d = `M ${p1.x} ${p1.y}`;
      if (w.points && w.points.length > 0) {
        w.points.forEach(pt => {
          d += ` L ${pt.x} ${pt.y}`;
        });
      }
      d += ` L ${p2.x} ${p2.y}`;

      html += `<path d="${d}" fill="none" stroke="${w.color}" stroke-width="${thickness}" opacity="${opacity}" ${shadow} class="wire" data-idx="${index}" style="cursor:pointer;" stroke-linejoin="round" stroke-linecap="round" />`;

      // Draw joint dots
      if (w.points && w.points.length > 0) {
        w.points.forEach(pt => {
          html += `<circle cx="${pt.x}" cy="${pt.y}" r="3" fill="${w.color}" opacity="${opacity}" pointer-events="none" />`;
        });
      }
    }
  });

  if (wireStart) {
    const p1 = getPinPos(nodes.find(n => n.id === wireStart.nodeId), wireStart.pinId);
    let d = `M ${p1.x} ${p1.y}`;
    if (wireStart.points && wireStart.points.length > 0) {
      wireStart.points.forEach(pt => {
        d += ` L ${pt.x} ${pt.y}`;
      });
    }
    d += ` L ${mousePos.x} ${mousePos.y}`;

    html += `<path d="${d}" fill="none" stroke="#f97316" stroke-width="3" stroke-dasharray="6,4" pointer-events="none" stroke-linejoin="round" />`;
  }

  nodes.forEach(n => {
    if (n.type === 'INPUT') {
      html += `
        <g transform="translate(${n.x}, ${n.y})" class="node" data-id="${n.id}">
          <text x="20" y="72" fill="#9ca3af" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" pointer-events="none">${n.label}</text>
          
          <circle cx="20" cy="-5" r="7" fill="#000" stroke="#a8a29e" stroke-width="2" class="pin" data-node="${n.id}" data-pin="out" style="cursor:crosshair;" />
          
          <!-- Switch Base Plate -->
          <rect x="6" y="10" width="28" height="44" fill="#1f2937" rx="3" stroke="#111827" stroke-width="2" />
          
          <!-- Screws -->
          <circle cx="20" cy="15" r="2" fill="#4b5563" />
          <circle cx="20" cy="49" r="2" fill="#4b5563" />
          
          <!-- Threaded Nut -->
          <circle cx="20" cy="32" r="10" fill="#6b7280" stroke="#4b5563" stroke-width="1.5" />
          <circle cx="20" cy="32" r="6" fill="#030712" />
          
          <!-- Metallic Lever -->
          ${n.value ?
          // UP (HIGH)
          `<path d="M 16 32 L 14 5 A 6 6 0 0 1 26 5 L 24 32 Z" fill="#e5e7eb" stroke="#d1d5db" stroke-width="1" />
             <path d="M 18 32 L 17 6" stroke="#ffffff" stroke-width="2" opacity="0.6" />`
          :
          // DOWN (LOW)
          `<path d="M 16 32 L 14 59 A 6 6 0 0 0 26 59 L 24 32 Z" fill="#9ca3af" stroke="#6b7280" stroke-width="1" />
             <path d="M 18 32 L 17 58" stroke="#e5e7eb" stroke-width="2" opacity="0.4" />`
        }
          
          <!-- Invisible Clickable Hitbox -->
          <rect x="0" y="0" width="40" height="65" fill="transparent" class="interactable toggle-btn" data-id="${n.id}" style="cursor:pointer;" />
        </g>
      `;
    } else if (n.type === 'PULSER') {
      html += `
        <g transform="translate(${n.x}, ${n.y})" class="node" data-id="${n.id}">
          <text x="20" y="65" fill="#9ca3af" text-anchor="middle" font-family="sans-serif" font-size="12" pointer-events="none">${n.label}</text>
          <circle cx="20" cy="-5" r="7" fill="#000" stroke="#a8a29e" stroke-width="2" class="pin" data-node="${n.id}" data-pin="out" style="cursor:crosshair;" />
          <circle cx="20" cy="30" r="18" fill="#111" stroke="#374151" stroke-width="2" />
          <circle cx="20" cy="30" r="12" fill="${n.value ? '#ef4444' : '#b91c1c'}" class="interactable pulser-btn" data-id="${n.id}" style="cursor:pointer;" />
        </g>
      `;
    } else if (n.type === 'OUTPUT') {
      const color = n.value ? '#ef4444' : '#374151';
      html += `
        <g transform="translate(${n.x}, ${n.y})" class="node" data-id="${n.id}">
          <text x="20" y="-12" fill="#9ca3af" text-anchor="middle" font-family="sans-serif" font-size="12" pointer-events="none">${n.label}</text>
          <circle cx="20" cy="15" r="14" fill="${color}" stroke="#111" stroke-width="3" />
          <circle cx="16" cy="11" r="4" fill="#fff" opacity="0.3" pointer-events="none" />
          <circle cx="20" cy="45" r="7" fill="#000" stroke="#a8a29e" stroke-width="2" class="pin" data-node="${n.id}" data-pin="in" style="cursor:crosshair;" />
        </g>
      `;
    } else if (n.type === 'POWER') {
      const color = n.value ? '#ef4444' : '#3b82f6';
      html += `
        <g transform="translate(${n.x}, ${n.y})" class="node" data-id="${n.id}">
          <rect x="-10" y="-10" width="60" height="40" fill="#111" stroke="#374151" stroke-width="2" rx="4" />
          <text x="20" y="-18" fill="${color}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" pointer-events="none">${n.label}</text>
          <circle cx="20" cy="10" r="10" fill="${color}" />
          <circle cx="20" cy="10" r="4" fill="#000" class="pin" data-node="${n.id}" data-pin="out" style="cursor:crosshair;" />
        </g>
      `;
    } else if (n.type === 'IC') {
      const icData = ICS[n.icId];
      const pinCount = icData.pinCount || 14;
      const h = (pinCount / 2 + 1) * 20;

      html += `
        <g transform="translate(${n.x}, ${n.y})" class="node" data-id="${n.id}">
          <rect width="80" height="${h}" fill="#030712" stroke="#1f2937" stroke-width="3" rx="6" class="ic-body" data-id="${n.id}" style="cursor:pointer;" />
          <path d="M 30 0 A 10 10 0 0 0 50 0" fill="#111827" pointer-events="none" />
          <text x="40" y="${h / 2 + 5}" fill="#d1d5db" text-anchor="middle" font-family="monospace" font-size="16" font-weight="bold" pointer-events="none" transform="rotate(-90 40 ${h / 2 + 5})">${n.icId}</text>
      `;

      for (let i = 1; i <= pinCount; i++) {
        const p = getPinPos({ type: 'IC', icId: n.icId, x: 0, y: 0 }, i);
        let tx = p.x === 0 ? 15 : 65;

        const val = n.pins[i];
        let pColor = '#9ca3af';
        if (val === 1) pColor = '#22c55e';
        else if (val === 0) pColor = '#4b5563';

        html += `
          <rect x="${p.x === 0 ? -10 : 80}" y="${p.y - 4}" width="10" height="8" fill="#6b7280" pointer-events="none" />
          <circle cx="${p.x}" cy="${p.y}" r="6" fill="#000" stroke="${pColor}" stroke-width="2" class="pin" data-node="${n.id}" data-pin="${i}" style="cursor:crosshair;" />
          <text x="${tx}" y="${p.y + 3}" fill="#4b5563" font-size="9" font-family="sans-serif" text-anchor="middle" pointer-events="none">${i}</text>
        `;
      }
      html += `</g>`;
    }
  });

  svg.innerHTML = html;
}

export function renderSimulator(state) {
  setTimeout(() => {
    drawCanvas();
  }, 0);

  const categories = {};
  Object.values(ICS).forEach(ic => {
    if (!categories[ic.category]) categories[ic.category] = [];
    categories[ic.category].push(ic);
  });

  const icOptions = Object.keys(categories).map(cat => {
    return `<optgroup label="${cat}">` +
      categories[cat].map(ic => `<option value="${ic.id}">${ic.id} - ${ic.name}</option>`).join('') +
      `</optgroup>`;
  }).join('');

  return `
    <div style="border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; display: flex; flex-direction: column;">
      <div class="sim-toolbar" style="padding: 12px; background: #0a0f0a; display: flex; gap: 12px; border-bottom: 1px solid var(--border); align-items: center; flex-wrap: wrap;">
        
        <div style="display:flex; align-items:center; gap: 8px;">
           <span style="color:var(--text-dim); font-size: 12px; font-weight: bold; letter-spacing: 1px;">LAB TRAINER KIT</span>
        </div>

        <div style="width: 1px; height: 24px; background: var(--border); margin: 0 10px;"></div>
        
        <select id="sim-ic-select" style="padding: 7px; background: #111; color: var(--green); border: 1px solid var(--border); border-radius: 4px; outline: none; min-width: 250px;">
          ${icOptions}
        </select>
        <button id="add-ic" class="tab" style="background: var(--bg-input); font-weight: bold;">+ PLACE IC IN SOCKET</button>
        
        <div style="margin-left:auto; display:flex; gap: 10px; align-items:center;">
          <button id="toggle-run" class="tab" style="color: #22c55e; border-color: rgba(34,197,94,0.5); font-weight: bold;">▶ RUN</button>
          <button id="clear-sim" class="tab" style="color: #ef4444; border-color: rgba(239,68,68,0.5);">RESET BOARD</button>
        </div>
      </div>

      <div style="background: #111827; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 700px;">
        <svg id="sim-canvas" viewBox="0 0 1000 700" style="width: 100%; max-width: 1200px; background: #0a0f0a; border: 2px solid #374151; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></svg>
      </div>
    </div>
  `;
}

export function bindSimulatorEvents(state, setState) {
  const runBtn = document.getElementById('toggle-run');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      if (isSimRunning) {
        stopSimulation();
        drawCanvas();
      } else {
        const errors = verifyCircuit();
        if (errors.length > 0) {
          alert("CIRCUIT ERRORS DETECTED:\n\n" + errors.join('\n'));
        } else {
          isSimRunning = true;
          runBtn.innerHTML = '⏹ STOP';
          runBtn.style.color = '#f59e0b';
          runBtn.style.borderColor = 'rgba(245,158,11,0.5)';
          drawCanvas();
        }
      }
    });
  }

  document.getElementById('add-ic')?.addEventListener('click', () => {
    stopSimulation();
    const icId = document.getElementById('sim-ic-select').value;
    const icData = ICS[icId];
    const reqPins = icData.pinCount || 14;

    const emptySocket = sockets.find(s => s.icNodeId === null && s.type >= reqPins);
    if (!emptySocket) {
      alert("No empty sockets available that can fit a " + reqPins + "-pin IC!");
      return;
    }

    const newNodeId = `node_${nextId++}`;
    emptySocket.icNodeId = newNodeId;

    nodes.push({
      id: newNodeId,
      type: 'IC',
      icId,
      x: emptySocket.x,
      y: emptySocket.y,
      pins: {},
      socketId: emptySocket.id,
      fixed: true
    });
    drawCanvas();
  });

  document.getElementById('clear-sim')?.addEventListener('click', () => {
    stopSimulation();
    nodes.filter(n => n.fixed).forEach(n => {
      if (n.type === 'INPUT') n.value = 0;
      if (n.type === 'OUTPUT') n.value = 0;
      if (n.type === 'PULSER') n.value = 0;
    });
    nodes = nodes.filter(n => n.fixed);
    wires = [];
    sockets.forEach(s => s.icNodeId = null);
    wireStart = null;
    drawCanvas();
  });

  const svg = document.getElementById('sim-canvas');
  if (!svg) return;

  function getMousePt(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const cursorPt = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: cursorPt.x, y: cursorPt.y };
  }

  svg.addEventListener('mousedown', e => {
    const pt = getMousePt(e);

    if (wireStart) {
      if (e.target.classList.contains('pin')) {
        const nodeId = e.target.getAttribute('data-node');
        const pinId = e.target.getAttribute('data-pin');

        if (nodeId !== wireStart.nodeId || pinId !== wireStart.pinId) {
          wires.push({
            from: { nodeId: wireStart.nodeId, pinId: wireStart.pinId },
            to: { nodeId, pinId },
            points: [...wireStart.points],
            color: WIRE_COLORS[nextWireColor++ % WIRE_COLORS.length]
          });
        }
        wireStart = null;
        stopSimulation();
      } else {
        // Add a joint
        wireStart.points.push({ x: pt.x, y: pt.y });
      }
      drawCanvas();
      return;
    }

    // Start wiring
    if (e.target.classList.contains('pin')) {
      const nodeId = e.target.getAttribute('data-node');
      const pinId = e.target.getAttribute('data-pin');
      wireStart = { nodeId, pinId, points: [] };
      mousePos = pt;
      stopSimulation();
      drawCanvas();
      return;
    }

    // Delete wire
    if (e.target.classList.contains('wire')) {
      const idx = e.target.getAttribute('data-idx');
      wires.splice(idx, 1);
      stopSimulation();
      drawCanvas();
      return;
    }

    // Pulser logic
    if (e.target.classList.contains('pulser-btn')) {
      const nodeId = e.target.getAttribute('data-id');
      const n = nodes.find(nd => nd.id === nodeId);
      if (n && n.type === 'PULSER') {
        n.value = 1;
        drawCanvas();
        return;
      }
    }
  });

  svg.addEventListener('mousemove', e => {
    if (wireStart) {
      mousePos = getMousePt(e);
      drawCanvas();
    }
  });

  svg.addEventListener('mouseup', e => {
    // Only process toggle and pulser release if NOT routing wire
    if (!wireStart) {
      // Toggle Switch
      if (e.target.classList.contains('interactable') && e.target.classList.contains('toggle-btn')) {
        const nodeId = e.target.getAttribute('data-id');
        const n = nodes.find(nd => nd.id === nodeId);
        if (n && n.type === 'INPUT') {
          n.value = n.value ? 0 : 1;
          drawCanvas();
        }
      }
    }

    // Always check for Pulser release
    let didReleasePulser = false;
    nodes.filter(n => n.type === 'PULSER').forEach(n => {
      if (n.value === 1) {
        n.value = 0;
        didReleasePulser = true;
      }
    });
    if (didReleasePulser) {
      drawCanvas();
    }
  });

  let currentContextMenu = null;

  // Cancel wire routing with Right Click
  svg.addEventListener('contextmenu', e => {
    e.preventDefault(); // prevent context menu from opening
    if (wireStart) {
      wireStart = null;
      drawCanvas();
    } else {
      const nodeEl = e.target.closest('.node');
      if (nodeEl) {
        const nodeId = nodeEl.getAttribute('data-id');
        const n = nodes.find(nd => nd.id === nodeId);
        if (n && n.type === 'IC') {
          if (currentContextMenu) currentContextMenu.remove();

          const menu = document.createElement('div');
          menu.style.position = 'fixed';
          menu.style.left = e.clientX + 'px';
          menu.style.top = e.clientY + 'px';
          menu.style.background = '#1f2937';
          menu.style.border = '1px solid #374151';
          menu.style.padding = '5px 0';
          menu.style.borderRadius = '4px';
          menu.style.zIndex = '1000';
          menu.style.boxShadow = '0 4px 6px rgba(0,0,0,0.5)';
          menu.style.color = '#fff';
          menu.style.fontFamily = 'sans-serif';
          menu.style.fontSize = '14px';

          const item = document.createElement('div');
          item.textContent = 'View Info for ' + n.icId;
          item.style.padding = '8px 16px';
          item.style.cursor = 'pointer';
          item.addEventListener('mouseenter', () => item.style.background = '#374151');
          item.addEventListener('mouseleave', () => item.style.background = 'transparent');
          item.addEventListener('click', () => {
            menu.remove();
            currentContextMenu = null;
            const icData = ICS[n.icId];
            if (icData) {
              setState({ activeTab: 'library', selectedIC: icData, search: n.icId });
            }
          });

          menu.appendChild(item);
          document.body.appendChild(menu);
          currentContextMenu = menu;

          const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
              menu.remove();
              currentContextMenu = null;
              document.removeEventListener('click', closeMenu);
              document.removeEventListener('contextmenu', closeMenu);
            }
          };
          
          setTimeout(() => {
            document.addEventListener('click', closeMenu);
            document.addEventListener('contextmenu', closeMenu);
          }, 0);
        }
      }
    }
  });

  svg.addEventListener('mouseleave', () => {
    let changed = false;
    nodes.filter(n => n.type === 'PULSER').forEach(n => {
      if (n.value === 1) {
        n.value = 0;
        changed = true;
      }
    });
    if (changed) drawCanvas();
  });

  // Double click to remove IC
  svg.addEventListener('dblclick', e => {
    if (e.target.classList.contains('ic-body')) {
      const nodeId = e.target.getAttribute('data-id');
      if (confirm("Remove this IC?")) {
        stopSimulation();
        nodes = nodes.filter(n => n.id !== nodeId);
        const socket = sockets.find(s => s.icNodeId === nodeId);
        if (socket) socket.icNodeId = null;
        wires = wires.filter(w => w.from.nodeId !== nodeId && w.to.nodeId !== nodeId);
        drawCanvas();
      }
    }
  });
}
