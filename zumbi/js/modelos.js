// Modelos low-poly feitos com caixas: armas, zumbis e texturas procedurais.
import * as THREE from 'three';
import { TIERS, CAMOS, ZUMBIS } from './dados.js';

const geoCaixa = new THREE.BoxGeometry(1, 1, 1);
const geoCil = new THREE.CylinderGeometry(0.5, 0.5, 1, 10);

function caixa(mat, w, h, d, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geoCaixa, mat);
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  return m;
}
function cano(mat, r, len, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geoCil, mat);
  m.scale.set(r * 2, len, r * 2);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

// ---------------- ARMAS ----------------
export function criarArma(arma) {
  const tier = TIERS[arma.tier];
  const camo = CAMOS.find(c => c.id === arma.camo) || CAMOS[0];
  const corpo = new THREE.MeshStandardMaterial({ color: camo.cor, roughness: 0.55, metalness: camo.id === 'ouro' ? 0.9 : 0.4 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.35, metalness: 0.8 });
  const madeira = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.8 });
  const brilho = new THREE.MeshBasicMaterial({ color: tier.cor });
  const g = new THREE.Group();
  let ponta = -0.5;

  switch (arma.tipo) {
    case 'pistola':
      g.add(caixa(corpo, 0.05, 0.06, 0.24, 0, 0.03, -0.08));
      g.add(caixa(metal, 0.044, 0.04, 0.2, 0, -0.005, -0.07));
      const cabo = caixa(corpo, 0.045, 0.14, 0.06, 0, -0.07, 0.01); cabo.rotation.x = -0.25; g.add(cabo);
      g.add(caixa(brilho, 0.052, 0.012, 0.18, 0, 0.045, -0.08));
      g.add(caixa(brilho, 0.012, 0.016, 0.012, 0, 0.068, -0.18));
      ponta = -0.21;
      break;
    case 'submetralhadora':
      g.add(caixa(corpo, 0.07, 0.09, 0.36, 0, 0, -0.12));
      g.add(cano(metal, 0.016, 0.14, 0, 0.01, -0.36));
      g.add(caixa(metal, 0.04, 0.18, 0.05, 0, -0.12, -0.16));
      const cb = caixa(corpo, 0.05, 0.12, 0.06, 0, -0.09, 0.02); cb.rotation.x = -0.2; g.add(cb);
      g.add(caixa(metal, 0.04, 0.05, 0.16, 0, -0.01, 0.12));
      g.add(caixa(brilho, 0.074, 0.014, 0.3, 0, 0.04, -0.12));
      g.add(caixa(metal, 0.03, 0.03, 0.08, 0, 0.065, -0.1));
      ponta = -0.43;
      break;
    case 'fuzil':
      g.add(caixa(corpo, 0.07, 0.1, 0.5, 0, 0, -0.15));
      g.add(cano(metal, 0.018, 0.32, 0, 0.015, -0.55));
      g.add(caixa(corpo, 0.06, 0.07, 0.18, 0, 0.01, -0.45));
      const mag = caixa(metal, 0.045, 0.2, 0.07, 0, -0.13, -0.18); mag.rotation.x = 0.25; g.add(mag);
      const cf = caixa(corpo, 0.05, 0.12, 0.06, 0, -0.1, 0.02); cf.rotation.x = -0.25; g.add(cf);
      g.add(caixa(corpo, 0.06, 0.1, 0.24, 0, -0.02, 0.2));
      g.add(caixa(brilho, 0.075, 0.014, 0.42, 0, 0.044, -0.15));
      g.add(caixa(metal, 0.035, 0.05, 0.12, 0, 0.08, -0.12));
      g.add(caixa(brilho, 0.02, 0.02, 0.005, 0, 0.09, -0.185));
      ponta = -0.71;
      break;
    case 'escopeta':
      g.add(caixa(corpo, 0.075, 0.1, 0.34, 0, 0, -0.08));
      g.add(cano(metal, 0.024, 0.6, 0, 0.02, -0.5));
      g.add(cano(metal, 0.02, 0.5, 0, -0.03, -0.45));
      g.add(caixa(madeira, 0.07, 0.07, 0.18, 0, -0.035, -0.45));
      const ce = caixa(madeira, 0.055, 0.12, 0.06, 0, -0.1, 0.06); ce.rotation.x = -0.3; g.add(ce);
      g.add(caixa(madeira, 0.065, 0.11, 0.26, 0, -0.03, 0.24));
      g.add(caixa(brilho, 0.08, 0.016, 0.3, 0, 0.05, -0.08));
      ponta = -0.8;
      break;
    case 'sniper':
      g.add(caixa(corpo, 0.07, 0.09, 0.5, 0, 0, -0.1));
      g.add(cano(metal, 0.016, 0.6, 0, 0.015, -0.65));
      g.add(cano(metal, 0.03, 0.08, 0, 0.015, -0.98));
      g.add(cano(metal, 0.035, 0.32, 0, 0.11, -0.1));
      g.add(cano(brilho, 0.04, 0.03, 0, 0.11, -0.27));
      g.add(caixa(metal, 0.02, 0.05, 0.02, 0, 0.065, -0.03));
      g.add(caixa(metal, 0.02, 0.05, 0.02, 0, 0.065, -0.17));
      g.add(caixa(metal, 0.04, 0.12, 0.06, 0, -0.1, -0.12));
      const cs = caixa(corpo, 0.05, 0.12, 0.06, 0, -0.1, 0.06); cs.rotation.x = -0.3; g.add(cs);
      g.add(caixa(corpo, 0.06, 0.13, 0.3, 0, -0.03, 0.28));
      g.add(caixa(brilho, 0.075, 0.014, 0.44, 0, 0.042, -0.1));
      ponta = -1.03;
      break;
    case 'metralhadora':
    default:
      g.add(caixa(corpo, 0.1, 0.13, 0.55, 0, 0, -0.12));
      g.add(cano(metal, 0.03, 0.46, 0, 0.01, -0.62));
      g.add(cano(corpo, 0.042, 0.22, 0, 0.01, -0.5));
      g.add(caixa(metal, 0.12, 0.16, 0.16, 0.0, -0.13, -0.14));
      const cm = caixa(corpo, 0.06, 0.13, 0.07, 0, -0.12, 0.06); cm.rotation.x = -0.25; g.add(cm);
      g.add(caixa(corpo, 0.07, 0.12, 0.26, 0, -0.02, 0.27));
      g.add(caixa(metal, 0.04, 0.09, 0.06, 0, 0.11, -0.3));
      g.add(caixa(brilho, 0.104, 0.016, 0.46, 0, 0.068, -0.12));
      ponta = -0.86;
      break;
  }

  // Míticas e lendárias ganham um núcleo brilhante extra
  if (arma.tier >= 4) {
    const nucleo = caixa(brilho, 0.03, 0.03, 0.03, 0, -0.02, -0.02);
    nucleo.userData.pulsa = true;
    g.add(nucleo);
    g.add(caixa(brilho, 0.012, 0.012, Math.abs(ponta) * 0.5, 0.045, 0.0, ponta * 0.45));
    g.add(caixa(brilho, 0.012, 0.012, Math.abs(ponta) * 0.5, -0.045, 0.0, ponta * 0.45));
  }

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.015, ponta - 0.02);
  g.add(muzzle);
  g.userData.muzzle = muzzle;
  g.userData.brilho = brilho;
  g.userData.comprimento = Math.abs(ponta);
  return g;
}

// ---------------- ZUMBIS ----------------
const ROUPAS = [0x4a5a7a, 0x7a3a3a, 0x3a5a3a, 0x6a6a5a, 0x2a2a2a, 0x7a6a4a, 0x5a3a6a, 0x8a8a8a];

export function criarZumbi(tipo) {
  const def = ZUMBIS[tipo];
  const pele = new THREE.MeshLambertMaterial({ color: def.pele });
  const roupa = new THREE.MeshLambertMaterial({ color: tipo === 'chefe' ? 0x3a0a14 : ROUPAS[Math.floor(Math.random() * ROUPAS.length)] });
  const calca = new THREE.MeshLambertMaterial({ color: tipo === 'chefe' ? 0x2a0a10 : 0x2a3040 });
  const olho = new THREE.MeshBasicMaterial({ color: def.olho });
  const sangue = new THREE.MeshLambertMaterial({ color: 0x5a0a0a });
  const mats = [pele, roupa, calca, sangue];

  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);

  const largura = tipo === 'inchado' ? 0.75 : tipo === 'corredor' ? 0.42 : 0.5;
  const tronco = caixa(roupa, largura, 0.62, tipo === 'inchado' ? 0.55 : 0.28, 0, 1.12, 0);
  corpo.add(tronco);
  corpo.add(caixa(sangue, largura * 0.5, 0.2, 0.02, 0.06, 1.05, -(tipo === 'inchado' ? 0.28 : 0.15)));

  const cabeca = new THREE.Group();
  cabeca.position.set(0, 1.58, 0);
  cabeca.add(caixa(pele, 0.3, 0.32, 0.3, 0, 0, 0));
  cabeca.add(caixa(olho, 0.06, 0.04, 0.02, -0.07, 0.03, -0.155));
  cabeca.add(caixa(olho, 0.06, 0.04, 0.02, 0.07, 0.03, -0.155));
  cabeca.add(caixa(sangue, 0.14, 0.05, 0.02, 0, -0.08, -0.155));
  if (tipo === 'cuspidor') cabeca.add(caixa(olho, 0.16, 0.08, 0.04, 0, -0.08, -0.16));
  if (tipo === 'chefe') {
    for (let i = -1; i <= 1; i++) {
      const esp = caixa(olho, 0.05, 0.18, 0.05, i * 0.1, 0.22, 0.03);
      esp.rotation.z = i * 0.3;
      cabeca.add(esp);
    }
  }
  cabeca.rotation.z = (Math.random() - 0.5) * 0.4;
  corpo.add(cabeca);

  if (tipo === 'inchado') {
    for (let i = 0; i < 5; i++) {
      corpo.add(caixa(new THREE.MeshBasicMaterial({ color: 0xc8d040 }), 0.12, 0.12, 0.12,
        (Math.random() - 0.5) * 0.7, 0.9 + Math.random() * 0.45, -0.28 + Math.random() * 0.05));
    }
  }
  if (tipo === 'bruto' || tipo === 'chefe') {
    corpo.add(caixa(pele, largura * 1.5, 0.22, 0.38, 0, 1.38, 0));
  }

  function membro(mat, w, h, x, y) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    p.add(caixa(mat, w, h, w, 0, -h / 2, 0));
    return p;
  }
  const bracoE = membro(pele, 0.14, 0.62, -(largura / 2 + 0.08), 1.4);
  const bracoD = membro(pele, 0.14, 0.62, (largura / 2 + 0.08), 1.4);
  const bracoL = tipo === 'bruto' || tipo === 'chefe' ? 0.24 : 0.14;
  bracoE.children[0].scale.x = bracoE.children[0].scale.z = bracoL;
  bracoD.children[0].scale.x = bracoD.children[0].scale.z = bracoL;
  const pernaE = membro(calca, 0.18, 0.8, -0.13, 0.8);
  const pernaD = membro(calca, 0.18, 0.8, 0.13, 0.8);
  corpo.add(bracoE, bracoD, pernaE, pernaD);

  g.scale.setScalar(def.escala * (0.95 + Math.random() * 0.1));
  g.userData = { corpo, cabeca, bracoE, bracoD, pernaE, pernaD, mats, pele };
  return g;
}

// ---------------- TEXTURAS ----------------
function canvasTex(w, h, desenha, repetir = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  desenha(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function texChao(cor) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3500; i++) {
      const v = Math.random() * 40 - 20;
      g.fillStyle = `rgba(${128 + v},${128 + v},${128 + v},0.08)`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      let x = Math.random() * w, y = Math.random() * h;
      g.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += Math.random() * 30 - 15; y += Math.random() * 30 - 15; g.lineTo(x, y); }
      g.stroke();
    }
    if (Math.random() < 0.9) {
      g.fillStyle = 'rgba(90,0,0,0.35)';
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 8 + Math.random() * 14, 0, 7); g.fill();
    }
  });
}

export function texPredio(base) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 800; i++) {
      g.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
    }
    for (let y = 12; y < h - 10; y += 32) {
      for (let x = 10; x < w - 10; x += 30) {
        const r = Math.random();
        g.fillStyle = r < 0.08 ? '#e8c060' : r < 0.12 ? '#c04020' : r < 0.3 ? '#1a1e24' : '#0c0e12';
        g.fillRect(x, y, 18, 20);
        if (r > 0.85) { g.strokeStyle = '#000'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y + 20); g.stroke(); }
      }
    }
  });
}

export function texCaixa() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#6a5030'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a2810'; g.lineWidth = 4; g.strokeRect(2, 2, w - 4, h - 4);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.stroke();
    for (let y = 0; y < h; y += 8) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, w, 1); }
  }, false);
}

export function texBrilho() {
  return canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.3, 'rgba(255,220,140,0.8)');
    gr.addColorStop(1, 'rgba(255,160,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, false);
}
