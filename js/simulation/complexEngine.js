/* js/simulation/complexEngine.js — Simulator for Advanced ICs */

export function getOutputPins(icId) {
  const map = {
    // Flip-Flops
    "7474": [5, 6, 9, 8],
    "7476": [6, 7, 9, 8],
    "7473": [12, 13, 9, 8],
    "7475": [16, 15, 10, 9],
    "74373": [2, 5, 6, 9, 12, 15, 16, 19],
    
    // Decoders
    "74138": [15, 14, 13, 12, 11, 10, 9, 7],
    "74139": [4, 5, 6, 7, 9, 10, 11, 12],
    "7442": [1, 2, 3, 4, 5, 6, 7, 9, 10, 11],
    "7447": [13, 12, 11, 10, 9, 15, 14], // a,b,c,d,e,f,g
    
    // MUX/Encoders
    "74151": [5, 6], // Y, W
    "74153": [7, 9], // 1Y, 2Y
    "74157": [4, 7, 9, 12], // 1Y, 2Y, 3Y, 4Y
    "74148": [9, 7, 6, 14, 15], // A2,A1,A0, GS, EO
    "74147": [9, 7, 6, 14], // D, C, B, A
    
    // Arithmetic
    "7483": [9, 6, 2, 15, 14], // S1, S2, S3, S4, C4
    "7485": [5, 6, 7], // A>B, A=B, A<B
    
    // Counters / Registers
    "7490": [12, 9, 8, 11], // QA, QB, QC, QD
    "7493": [12, 9, 8, 11], // QA, QB, QC, QD
    "74163": [14, 13, 12, 11, 15], // QA..QD, RCO
    "74192": [3, 2, 6, 7, 12, 13], // QA..QD, TCD, TCU
    "74164": [3, 4, 5, 6, 10, 11, 12, 13], // QA..QH
    "74165": [9, 7], // QH, QHb
    "7495": [13, 12, 11, 10] // QA..QD
  };
  return map[icId] || [];
}

export function simulateComplexIC(icId, pins, state) {
  // state object persists per node across renders
  
  if (icId === "7474") {
    // Dual D Flip-Flop (Pos. Edge)
    const runFF = (clr, d, clk, pre, qPin, qbPin, stKey) => {
      let q = state[stKey] !== undefined ? state[stKey] : 0;
      const prevClk = state[stKey + '_clk'] || 0;
      const risingEdge = (prevClk === 0 && pins[clk] === 1);
      
      if (pins[pre] === 0 && pins[clr] === 1) q = 1;
      else if (pins[pre] === 1 && pins[clr] === 0) q = 0;
      else if (pins[pre] === 0 && pins[clr] === 0) q = 1; // Both low (unstable)
      else if (risingEdge) q = pins[d] || 0;
      
      state[stKey] = q;
      state[stKey + '_clk'] = pins[clk] || 0;
      
      pins[qPin] = q;
      pins[qbPin] = 1 - q;
    };
    runFF(1, 2, 3, 4, 5, 6, 'ff1');
    runFF(13, 12, 11, 10, 9, 8, 'ff2');
  }
  
  if (icId === "7476") {
    // Dual JK Flip-Flop (Neg. Edge)
    const runJK = (clk, pre, clr, j, k, qPin, qbPin, stKey) => {
      let q = state[stKey] !== undefined ? state[stKey] : 0;
      const prevClk = state[stKey + '_clk'] || 0;
      const fallingEdge = (prevClk === 1 && pins[clk] === 0);
      
      if (pins[pre] === 0 && pins[clr] === 1) q = 1;
      else if (pins[pre] === 1 && pins[clr] === 0) q = 0;
      else if (pins[pre] === 0 && pins[clr] === 0) q = 1; // Both low
      else if (fallingEdge) {
        let jj = pins[j] || 0, kk = pins[k] || 0;
        if (jj && !kk) q = 1;
        else if (!jj && kk) q = 0;
        else if (jj && kk) q = 1 - q;
      }
      
      state[stKey] = q;
      state[stKey + '_clk'] = pins[clk] || 0;
      
      pins[qPin] = q;
      pins[qbPin] = 1 - q;
    };
    runJK(1, 2, 3, 4, 16, 6, 7, 'jk1'); // FF1: CLK=1, PRE=2, CLR=3, J=4, K=16, Q=6, Qb=7
    runJK(14, 12, 11, 10, 15, 9, 8, 'jk2'); // FF2: CLK=14, PRE=12, CLR=11, J=10, K=15, Q=9, Qb=8
  }

  if (icId === "74138") {
    // 3-to-8 Decoder
    const a = pins[1]||0, b = pins[2]||0, c = pins[3]||0;
    const g2a = pins[4]||0, g2b = pins[5]||0, g1 = pins[6]||0;
    
    // Outputs default HIGH (active LOW decoder)
    [15,14,13,12,11,10,9,7].forEach(p => pins[p] = 1);
    
    if (g1 === 1 && g2a === 0 && g2b === 0) {
      const val = (c<<2) | (b<<1) | a;
      const outMap = [15,14,13,12,11,10,9,7];
      pins[outMap[val]] = 0; // Active LOW output
    }
  }

  if (icId === "7447") {
    // BCD to 7-Segment (Active LOW outputs for Common Anode display)
    const a = pins[7]||0, b = pins[1]||0, c = pins[2]||0, d = pins[6]||0;
    const val = (d<<3) | (c<<2) | (b<<1) | a;
    const lt = pins[3]!==0?1:0, bi = pins[4]!==0?1:0; // usually active low
    
    let segments = 0b1111111; // 7 bits (g,f,e,d,c,b,a), 1 means OFF (active low)
    if (bi === 0) segments = 0b1111111; // Blanked
    else if (lt === 0) segments = 0b0000000; // Lamp test (all on)
    else {
      // Decode BCD
      const font = [
        0b1000000, // 0
        0b1111001, // 1
        0b0100100, // 2
        0b0110000, // 3
        0b0011001, // 4
        0b0010010, // 5
        0b0000010, // 6
        0b1111000, // 7
        0b0000000, // 8
        0b0010000, // 9
        0b0001000, // A
        0b0000011, // b
        0b1000110, // C
        0b0100001, // d
        0b0000110, // E
        0b0001110  // F
      ];
      segments = font[val];
    }
    pins[13] = (segments & 0b0000001) ? 1 : 0; // a
    pins[12] = (segments & 0b0000010) ? 1 : 0; // b
    pins[11] = (segments & 0b0000100) ? 1 : 0; // c
    pins[10] = (segments & 0b0001000) ? 1 : 0; // d
    pins[9]  = (segments & 0b0010000) ? 1 : 0; // e
    pins[15] = (segments & 0b0100000) ? 1 : 0; // f
    pins[14] = (segments & 0b1000000) ? 1 : 0; // g
  }
  
  if (icId === "7483") {
    // 4-bit Full Adder
    const a1=pins[10]||0, a2=pins[8]||0, a3=pins[3]||0, a4=pins[1]||0;
    const b1=pins[11]||0, b2=pins[7]||0, b3=pins[4]||0;
    const cin=pins[13]||0;
    
    // Note: 7483 pinout:
    // A: A1=10, A2=8, A3=3, A4=1
    // B: B1=11, B2=7, B3=4, B4=16
    const b4_correct = pins[16]||0;
    
    const A = (a4<<3)|(a3<<2)|(a2<<1)|a1;
    const B = (b4_correct<<3)|(b3<<2)|(b2<<1)|b1;
    const sum = A + B + cin;
    
    pins[9]  = (sum & 1) ? 1 : 0; // S1
    pins[6]  = (sum & 2) ? 1 : 0; // S2
    pins[2]  = (sum & 4) ? 1 : 0; // S3
    pins[15] = (sum & 8) ? 1 : 0; // S4
    pins[14] = (sum & 16) ? 1 : 0; // C4 (Cout)
  }

  if (icId === "74151") {
    // 8:1 MUX
    const a = pins[11]||0, b = pins[10]||0, c = pins[9]||0;
    const strobe = pins[7]||0; // Active LOW enable
    const sel = (c<<2) | (b<<1) | a;
    const dataPins = [4,3,2,1,15,14,13,12]; // D0..D7
    
    if (strobe === 1) {
      pins[5] = 0; // Y
      pins[6] = 1; // W (Y-bar)
    } else {
      const val = pins[dataPins[sel]] || 0;
      pins[5] = val;
      pins[6] = 1 - val;
    }
  }

  if (icId === "7490") {
    // Decade Counter
    let q = state['cnt'] !== undefined ? state['cnt'] : 0;
    
    const clkA = pins[14]||0, prevClkA = state['clkA']||0;
    const clkB = pins[1]||0, prevClkB = state['clkB']||0;
    
    const r0_1 = pins[2]||0, r0_2 = pins[3]||0;
    const r9_1 = pins[6]||0, r9_2 = pins[7]||0;
    
    if (r9_1 && r9_2) q = 9;
    else if (r0_1 && r0_2) q = 0;
    else {
      // Split counter: mod-2 and mod-5
      // If external wired QA to CLKB, it counts 0..9
      // We simulate QA (bit 0) toggled by CLKA, and QB..QD toggled by CLKB
      
      let qa = q & 1;
      let qbcd = q >> 1; // 0..4
      
      if (prevClkA === 1 && clkA === 0) qa = 1 - qa;
      
      if (prevClkB === 1 && clkB === 0) {
        qbcd = (qbcd + 1) % 5;
      }
      
      q = (qbcd << 1) | qa;
    }
    
    state['cnt'] = q;
    state['clkA'] = clkA;
    state['clkB'] = clkB;
    
    pins[12] = (q & 1) ? 1 : 0; // QA
    pins[9]  = (q & 2) ? 1 : 0; // QB
    pins[8]  = (q & 4) ? 1 : 0; // QC
    pins[11] = (q & 8) ? 1 : 0; // QD
  }
}
