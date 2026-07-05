/* js/components/icchip.js — DIP IC Package SVG Renderer */

import { GATE_SYM } from '../data/ics.js';

/**
 * Render a DIP IC chip as an SVG string.
 * Left  side : pins 1 … pinCount/2   (top → bottom)
 * Right side : pins pinCount … pinCount/2+1 (top → bottom)
 *
 * Input pins  → amber  (clickable, toggled by user)
 * Output pin  → green  (computed value)
 * VCC         → gold
 * GND         → gray
 *
 * @param {object} ic         — IC definition
 * @param {object} pinStates  — { pinNumber: 0|1, … }
 * @param {number} activeGate — index into ic.gates[]
 * @returns {string} SVG markup
 */
export function renderChipSVG(ic, pinStates, activeGate) {
  const pps    = ic.pinCount / 2;   // pins per side
  const rowH   = 34;
  const chipW  = 140;
  const pinLen = 26;
  const ox     = 36;               // left offset for pin circles
  const chipX  = ox + pinLen;
  const rightX = chipX + chipW;
  const chipH  = pps * rowH + 28;
  const svgW   = chipW + pinLen * 2 + ox * 2;
  const svgH   = chipH + 38;

  const gate      = ic.gates[activeGate];
  const inputPins = gate ? gate.inputs : [];
  const outputPin = gate ? gate.output : null;

  /* ── colour helpers ── */
  function fillCol(pin) {
    if (pin === ic.vccPin)         return '#fbbf24';
    if (pin === ic.gndPin)         return '#6b7280';
    if (inputPins.includes(pin))   return (pinStates[pin] || 0) ? '#f97316' : '#374151';
    if (pin === outputPin)         return (pinStates[pin] || 0) ? '#22c55e' : '#1f2937';
    return '#1a2a1a';
  }
  function strokeCol(pin) {
    if (pin === ic.vccPin)        return '#fbbf24';
    if (pin === ic.gndPin)        return '#6b7280';
    if (inputPins.includes(pin))  return '#f97316';
    if (pin === outputPin)        return '#22c55e';
    return '#374151';
  }
  function labelCol(pin) {
    if (pin === ic.vccPin)        return '#fbbf24';
    if (pin === ic.gndPin)        return '#6b7280';
    if (inputPins.includes(pin))  return '#f97316';
    if (pin === outputPin)        return '#22c55e';
    return '#2d4a2d';
  }

  /* ── single pin element ── */
  function pin(num, y, isLeft) {
    const fc   = fillCol(num);
    const sc   = strokeCol(num);
    const lc   = labelCol(num);
    const isIn = inputPins.includes(num);
    const isOut= num === outputPin;
    const st   = pinStates[num] || 0;
    const r    = isIn ? 9 : isOut ? 8 : 5;
    const nm   = ic.pinNames[num] || `P${num}`;

    /* positions */
    const lx1  = isLeft ? ox         : rightX;
    const lx2  = isLeft ? chipX      : rightX + pinLen;
    const cx   = isLeft ? ox         : rightX + pinLen;
    const lblX = isLeft ? chipX + 5  : rightX - 5;
    const lblA = isLeft ? 'start'    : 'end';
    const numX = isLeft ? ox - 18    : rightX + pinLen + 16;

    const stateText = (isIn || isOut)
      ? `<text x="${cx}" y="${y + 4}" text-anchor="middle"
              fill="${st ? '#000' : isIn ? '#9ca3af' : '#22c55e'}"
              font-size="10" font-family="monospace"
              style="pointer-events:none">${st}</text>`
      : '';

    const clickAttr = isIn
      ? `data-pin="${num}" class="pin-clickable" style="cursor:pointer"`
      : `style="cursor:default"`;

    return `
      <g ${clickAttr}>
        <line x1="${lx1}" y1="${y}" x2="${lx2}" y2="${y}"
              stroke="${fc}" stroke-width="${isIn || isOut ? 2.5 : 1.5}"/>
        <circle cx="${cx}" cy="${y}" r="${r}"
                fill="${fc}" stroke="${sc}" stroke-width="1.5"
                data-pin="${num}"/>
        ${stateText}
        <text x="${lblX}" y="${y + 4}" text-anchor="${lblA}"
              fill="${lc}" font-size="9" font-family="monospace">${nm}</text>
        <text x="${numX}" y="${y + 4}"
              fill="#1a3a1a" font-size="8" font-family="monospace">${num}</text>
      </g>`;
  }

  /* ── build left & right pin lists ── */
  const leftPins  = Array.from({ length: pps }, (_, i) => i + 1);
  const rightPins = Array.from({ length: pps }, (_, i) => ic.pinCount - i);

  const leftHTML  = leftPins .map((p, i) => pin(p, 16 + 28 + i * rowH, true )).join('');
  const rightHTML = rightPins.map((p, i) => pin(p, 16 + 28 + i * rowH, false)).join('');

  const gateLabel = gate
    ? `<text x="${chipX + chipW / 2}" y="80" text-anchor="middle"
             fill="#3b82f6" font-size="9" font-family="monospace">
         ${gate.label} · ${gate.type} ${GATE_SYM[gate.type] || ''}
       </text>`
    : '';

  return `
    <svg width="${svgW}" height="${svgH}" xmlns="http://www.w3.org/2000/svg">

      <!-- Chip body -->
      <rect x="${chipX}" y="16" width="${chipW}" height="${chipH}"
            rx="5" fill="#0f1f0f" stroke="#22c55e" stroke-width="1.5"/>

      <!-- Notch -->
      <ellipse cx="${chipX + chipW / 2}" cy="16" rx="13" ry="7"
               fill="#060c06" stroke="#22c55e" stroke-width="1.5"/>

      <!-- IC label -->
      <text x="${chipX + chipW / 2}" y="46" text-anchor="middle"
            fill="#22c55e" font-size="15" font-family="monospace"
            font-weight="bold">${ic.id}</text>
      <text x="${chipX + chipW / 2}" y="63" text-anchor="middle"
            fill="#2d4a2d" font-size="9" font-family="monospace">${ic.package}</text>
      ${gateLabel}

      <!-- Left pins -->
      ${leftHTML}

      <!-- Right pins -->
      ${rightHTML}
    </svg>`;
}
