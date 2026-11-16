// Terrenos e paredes por zona: texturas desenhadas em canvas (sem arquivos de imagem).
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);
const escolher = a => a[Math.floor(Math.random() * a.length)];

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, repetir = true) {
  const t = new THREE.CanvasTexture(c);
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function granulo(g, w, h, forca, n) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * forca})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}

// ---------------------------------------------------------------- paredes
// tipos: lab, concreto, carne, rocha, casa (cor), tijolo
export function texParede(tipo, cor = '#cfc3a8') {
  const W = 256, H = 256;
  const [c, g] = canvas(W, H);
  if (tipo === 'lab') {
    g.fillStyle = '#b9c4c4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8f9c9c'; g.fillRect(0, H - 40, W, 40);
    // painéis
    g.strokeStyle = 'rgba(40,50,50,0.55)'; g.lineWidth = 3;
    for (let x = 0; x <= W; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    g.beginPath(); g.moveTo(0, H - 40); g.lineTo(W, H - 40); g.stroke();
    g.beginPath(); g.moveTo(0, 90); g.lineTo(W, 90); g.stroke();
    // faixa de perigo
    for (let k = 0; k < 16; k++) { g.fillStyle = k % 2 ? '#15181a' : '#e0b820'; g.fillRect(k * 16, H - 14, 16, 14); }
    // placas e aberturas de ventilação
    g.fillStyle = '#3a4444'; for (let i = 0; i < 6; i++) g.fillRect(150 + i * 14, 30, 10, 3);
    g.fillStyle = '#2a8a5a'; g.fillRect(24, 40, 36, 20);
    g.fillStyle = '#e8f8f0'; g.font = 'bold 12px sans-serif'; g.fillText('X-13', 28, 55);
    // sujeira e sangue
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * W, gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(rand(0.4, 0.9), 'rgba(40,10,10,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x, 0, rand(6, 24), H);
    }
  } else if (tipo === 'concreto' || tipo === 'rocha') {
    g.fillStyle = tipo === 'rocha' ? '#4a3c44' : '#85857d'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
    for (let y = 0; y <= H; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let y = 0; y < H; y += 64) for (let x = (y / 64) % 2 ? 0 : 64; x < W; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); }
    if (tipo === 'concreto') { for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#101010' : '#d8b020'; g.fillRect(8 + k * 12, 10, 12, 10); } }
  } else if (tipo === 'carne') {
    g.fillStyle = '#6a2448'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { g.fillStyle = escolher(['#7a2a50', '#561a38', '#8a3258', '#40102a']); g.beginPath(); g.ellipse(Math.random() * W, Math.random() * H, rand(10, 40), rand(8, 24), rand(0, 3), 0, 7); g.fill(); }
    g.strokeStyle = 'rgba(220,70,160,0.55)'; g.lineWidth = 2.5;
    for (let i = 0; i < 12; i++) { let x = Math.random() * W, y = Math.random() * H; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += rand(-24, 24); y += rand(-24, 24); g.lineTo(x, y); } g.stroke(); }
  } else if (tipo === 'tijolo') {
    g.fillStyle = '#4a2a20'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < W; x += 32) {
      g.fillStyle = `hsl(${12 + Math.random() * 10},${35 + Math.random() * 12}%,${24 + Math.random() * 10}%)`; g.fillRect(x + 1, y + 1, 30, 14);
    }
  } else {
    // casa: reboco colorido com janelas e rodapé
    g.fillStyle = cor; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, H - 34, W, 34);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, H - 8, W, 8);
    const jan = (x, y, w, h) => {
      g.fillStyle = '#f2efe6'; g.fillRect(x - 6, y - 6, w + 12, h + 12);
      const acesa = Math.random() < 0.12;
      const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, acesa ? '#ffd890' : '#1c2630'); gr.addColorStop(1, acesa ? '#e8a850' : '#0a1018');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x + w / 2 - 2, y, 4, h); g.fillRect(x, y + h / 2 - 2, w, 4);
      if (Math.random() < 0.5) { g.fillStyle = 'rgba(70,30,20,0.7)'; g.fillRect(x, y, w * rand(0.3, 0.6), h); } // cortina
      if (Math.random() < 0.25) { g.strokeStyle = 'rgba(200,220,255,0.5)'; g.lineWidth = 1; for (let t = 0; t < 5; t++) { g.beginPath(); g.moveTo(x + w / 2, y + h / 2); g.lineTo(x + rand(0, w), y + rand(0, h)); g.stroke(); } }
    };
    jan(36, 70, 72, 92); jan(148, 70, 72, 92);
    granulo(g, W, H, 0.1, 700);
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * W, gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(rand(0.3, 0.9), 'rgba(0,0,0,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x, 0, rand(6, 22), H);
    }
  }
  granulo(g, W, H, 0.14, 900);
  return tex(c);
}

export function texTeto(tipo) {
  const [c, g] = canvas(128, 128);
  if (tipo === 'lab') {
    g.fillStyle = '#6a7474'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(20,30,30,0.5)'; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
  } else if (tipo === 'telha') {
    g.fillStyle = '#6a2a1e'; g.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 12) { g.fillStyle = y % 24 ? '#5a2218' : '#7a3424'; g.fillRect(0, y, 128, 6); }
  } else if (tipo === 'metal') {
    g.fillStyle = '#5a5e58'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
  } else {
    g.fillStyle = '#3a2a30'; g.fillRect(0, 0, 128, 128);
  }
  granulo(g, 128, 128, 0.2, 500);
  return tex(c);
}

// ---------------------------------------------------------------- chão
const PALETAS = {
  suburbio: { base: '#41502c', calc: '#8d8b84', rua: '#33373b', linha: '#d8c040' },
  centro:   { base: '#2e2b29', calc: '#5e5650', rua: '#2e2b29', linha: '#d8a030' },
  lab:      { base: '#aab3b1', calc: '#8b9694', rua: '#7d8886', linha: '#40d080' },
  base:     { base: '#6a5d44', calc: '#8f8b7c', rua: '#3a3b3a', linha: '#e0c020' },
  ninho:    { base: '#6e3458', calc: '#6a3a58', rua: '#4a2038', linha: '#b060d0' },
};

// ops de pintura registradas pelos construtores de cenário: { t, x, z, w, d, r, cor, dir }
export function texChaoZona(zonaId, L, px, ops) {
  const S = px / (L * 2), P = PALETAS[zonaId];
  const [c, g] = canvas(px), [cr, gr] = canvas(px);
  const m = v => (v + L) * S;
  g.fillStyle = P.base; g.fillRect(0, 0, px, px);
  gr.fillStyle = zonaId === 'lab' ? '#7a7a7a' : '#d6d6d6'; gr.fillRect(0, 0, px, px);

  // base por tema
  if (zonaId === 'suburbio') {
    for (let i = 0; i < px * px / 600; i++) { g.fillStyle = escolher(['#4c5c33', '#38461f', '#566638', '#3a3a22', '#5a5a34', '#2f3b1c']); g.beginPath(); g.ellipse(Math.random() * px, Math.random() * px, rand(3, 14) * S / 4, rand(2, 8) * S / 4, rand(0, 3), 0, 7); g.fill(); }
    for (let i = 0; i < px * px / 4000; i++) { g.fillStyle = 'rgba(20,28,12,0.6)'; g.fillRect(Math.random() * px, Math.random() * px, 1.5, rand(2, 6)); } // tufos
  } else if (zonaId === 'base') {
    for (let i = 0; i < px * px / 300; i++) { g.fillStyle = escolher(['#7a6c52', '#5a4e38', '#8a7c60', '#4a4030']); g.fillRect(Math.random() * px, Math.random() * px, rand(1, 3), rand(1, 3)); }
  } else if (zonaId === 'ninho') {
    for (let i = 0; i < px * px / 5000; i++) { g.fillStyle = escolher(['#7a3a62', '#4a1e38', '#8a4470']); g.beginPath(); g.ellipse(Math.random() * px, Math.random() * px, rand(8, 30) * S / 5, rand(6, 20) * S / 5, rand(0, 3), 0, 7); g.fill(); }
  }
  granulo(g, px, px, 0.1, px * px / 40);

  const rect = (cor, o, rugo) => {
    g.fillStyle = cor; g.fillRect(m(o.x - o.w / 2), m(o.z - o.d / 2), o.w * S, o.d * S);
    if (rugo) { gr.fillStyle = rugo; gr.fillRect(m(o.x - o.w / 2), m(o.z - o.d / 2), o.w * S, o.d * S); }
  };
  const juntas = (o, passo, cor = 'rgba(0,0,0,0.2)') => {
    g.strokeStyle = cor; g.lineWidth = 1;
    const x0 = m(o.x - o.w / 2), x1 = m(o.x + o.w / 2), z0 = m(o.z - o.d / 2), z1 = m(o.z + o.d / 2);
    for (let x = x0; x <= x1 + 0.1; x += passo * S) { g.beginPath(); g.moveTo(x, z0); g.lineTo(x, z1); g.stroke(); }
    for (let z = z0; z <= z1 + 0.1; z += passo * S) { g.beginPath(); g.moveTo(x0, z); g.lineTo(x1, z); g.stroke(); }
  };
  for (const o of ops) {
    if (o.t === 'rua') {
      rect(P.rua, o, '#c8c8c8');
      // granulado do asfalto
      for (let i = 0; i < o.w * o.d * S * S / 60; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.12})`; g.fillRect(m(o.x - o.w / 2) + Math.random() * o.w * S, m(o.z - o.d / 2) + Math.random() * o.d * S, 2, 2); }
      if (o.linha !== false) {
        g.fillStyle = P.linha;
        if (o.d >= o.w) for (let p = o.z - o.d / 2 + 1; p < o.z + o.d / 2 - 1; p += 4) g.fillRect(m(o.x - 0.08), m(p), 0.16 * S, 2.2 * S);
        else for (let p = o.x - o.w / 2 + 1; p < o.x + o.w / 2 - 1; p += 4) g.fillRect(m(p), m(o.z - 0.08), 2.2 * S, 0.16 * S);
      }
    } else if (o.t === 'calc') { rect(P.calc, o, '#e0e0e0'); juntas(o, 1.2); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = Math.max(2, S * 0.15); g.strokeRect(m(o.x - o.w / 2), m(o.z - o.d / 2), o.w * S, o.d * S); }
    else if (o.t === 'concreto') { rect(o.cor || P.calc, o, '#d0d0d0'); juntas(o, o.passo || 4, 'rgba(0,0,0,0.28)'); }
    else if (o.t === 'terra') rect(o.cor || '#6a5a40', o, '#f0f0f0');
    else if (o.t === 'grama') rect(o.cor || '#41502c', o, '#e8e8e8');
    else if (o.t === 'piso') {
      rect(o.cor || P.base, o, '#8a8a8a');
      juntas(o, o.passo || 2, 'rgba(30,40,40,0.35)');
      if (o.borda) { g.strokeStyle = o.borda; g.lineWidth = Math.max(2, S * 0.25); g.strokeRect(m(o.x - o.w / 2) + 2, m(o.z - o.d / 2) + 2, o.w * S - 4, o.d * S - 4); }
    } else if (o.t === 'perigo') {
      g.save(); g.beginPath(); g.rect(m(o.x - o.w / 2), m(o.z - o.d / 2), o.w * S, o.d * S); g.clip();
      for (let k = -40; k < 80; k++) { g.fillStyle = k % 2 ? '#111' : '#e0b820'; g.beginPath(); const sx = m(o.x - o.w / 2) + k * S * 0.5, sy = m(o.z - o.d / 2); g.moveTo(sx, sy); g.lineTo(sx + S * 0.5, sy); g.lineTo(sx + S * 0.5 + o.d * S, sy + o.d * S); g.lineTo(sx + o.d * S, sy + o.d * S); g.fill(); }
      g.restore();
    } else if (o.t === 'pista') {
      rect('#2c2d2e', o, '#c0c0c0');
      g.fillStyle = '#e8e8e0';
      if (o.d >= o.w) { for (let p = o.z - o.d / 2 + 3; p < o.z + o.d / 2 - 3; p += 8) g.fillRect(m(o.x - 0.3), m(p), 0.6 * S, 4 * S); for (const sx of [-1, 1]) g.fillRect(m(o.x + sx * (o.w / 2 - 0.6)), m(o.z - o.d / 2), 0.3 * S, o.d * S); }
      else { for (let p = o.x - o.w / 2 + 3; p < o.x + o.w / 2 - 3; p += 8) g.fillRect(m(p), m(o.z - 0.3), 4 * S, 0.6 * S); for (const sz of [-1, 1]) g.fillRect(m(o.x - o.w / 2), m(o.z + sz * (o.d / 2 - 0.6)), o.w * S, 0.3 * S); }
    } else if (o.t === 'poca') {
      const cor = o.cor === 'acido' ? 'rgba(90,255,60,0.85)' : o.cor === 'sangue' ? 'rgba(80,6,10,0.85)' : o.cor === 'roxo' ? 'rgba(170,60,220,0.8)' : 'rgba(8,12,18,0.6)';
      const grad = g.createRadialGradient(m(o.x), m(o.z), 0, m(o.x), m(o.z), o.r * S);
      grad.addColorStop(0, cor); grad.addColorStop(0.8, cor); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.beginPath(); g.ellipse(m(o.x), m(o.z), o.r * S, o.r * S * (o.ry || 0.8), o.rot || 0, 0, 7); g.fill();
      gr.fillStyle = '#101010'; gr.beginPath(); gr.ellipse(m(o.x), m(o.z), o.r * S, o.r * S * (o.ry || 0.8), o.rot || 0, 0, 7); gr.fill();
    } else if (o.t === 'texto') {
      g.save(); g.translate(m(o.x), m(o.z)); g.rotate(o.rot || 0);
      g.font = `bold ${o.tam * S}px Impact, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = o.cor || '#e8e8e0'; g.fillText(o.texto, 0, 0); g.restore();
    } else if (o.t === 'circulo') {
      g.strokeStyle = o.cor; g.lineWidth = o.lw * S; g.beginPath(); g.arc(m(o.x), m(o.z), o.r * S, 0, 7); g.stroke();
    }
  }

  // desgaste geral
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.2;
  const nRach = zonaId === 'ninho' ? 20 : 70;
  for (let i = 0; i < nRach; i++) {
    let x = Math.random() * px, y = Math.random() * px;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 7; j++) { x += rand(-1, 1) * S * 1.2; y += rand(-1, 1) * S * 1.2; g.lineTo(x, y); }
    g.stroke();
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * px, y = Math.random() * px, r = rand(0.5, 2.2) * S;
    const sangue = Math.random() < (zonaId === 'lab' ? 0.7 : 0.5);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, sangue ? 'rgba(70,4,4,0.7)' : 'rgba(5,5,5,0.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  if (zonaId === 'ninho') {
    g.strokeStyle = 'rgba(190,60,170,0.6)'; g.lineWidth = 3;
    for (let i = 0; i < 90; i++) {
      let x = Math.random() * px, y = Math.random() * px;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 14; j++) { x += rand(-1, 1) * S; y += rand(-1, 1) * S; g.lineTo(x, y); }
      g.stroke();
    }
  }
  const map = tex(c, false), rough = new THREE.CanvasTexture(cr);
  rough.anisotropy = 8;
  return { map, roughnessMap: rough };
}
