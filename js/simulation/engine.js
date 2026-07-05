/* js/simulation/engine.js — Gate Logic Simulation Engine */

/**
 * Simulate a single logic gate.
 * @param {string} type  — AND | OR | NOT | NAND | NOR | XOR | XNOR
 * @param {number[]} inputs — array of 0/1 values
 * @returns {number} 0 or 1
 */
export function simulateGate(type, inputs) {
  switch (type) {
    case "AND":  return inputs.every(v => v === 1) ? 1 : 0;
    case "OR":   return inputs.some(v  => v === 1) ? 1 : 0;
    case "NOT":  return inputs[0] === 1 ? 0 : 1;
    case "NAND": return inputs.every(v => v === 1) ? 0 : 1;
    case "NOR":  return inputs.some(v  => v === 1) ? 0 : 1;
    case "XOR":  return inputs.reduce((a, b) => a ^ b, 0);
    case "XNOR": return inputs.reduce((a, b) => a ^ b, 0) === 1 ? 0 : 1;
    default:     return 0;
  }
}

/**
 * Compute all pin states for the active gate.
 * Merges user-set input pin states with the computed output pin state.
 * @param {object} ic        — IC definition from ICS
 * @param {number} gateIndex — which gate is active
 * @param {object} pinStates — current user-set pin states { pinNum: 0|1 }
 * @returns {object} merged pin states including computed output
 */
export function computePinStates(ic, gateIndex, pinStates) {
  const gate = ic.gates[gateIndex];
  if (!gate) return { ...pinStates };

  const inputVals = gate.inputs.map(p => pinStates[p] || 0);
  const outputVal = simulateGate(gate.type, inputVals);

  return { ...pinStates, [gate.output]: outputVal };
}

/**
 * Generate the complete truth table for a gate type.
 * @param {string} type     — gate type
 * @param {number} numInputs — number of inputs (1, 2, or 3)
 * @returns {Array<{inputs: number[], output: number}>}
 */
export function generateTruthTable(type, numInputs) {
  const rows = [];
  const total = Math.pow(2, numInputs);
  for (let i = 0; i < total; i++) {
    const inputs = Array.from({ length: numInputs }, (_, bit) =>
      (i >> (numInputs - 1 - bit)) & 1
    );
    rows.push({ inputs, output: simulateGate(type, inputs) });
  }
  return rows;
}
