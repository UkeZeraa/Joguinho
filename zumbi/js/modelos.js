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

const CORES_ROUPA_TIPO = {
  chefe: 0x3a0a14, blindado: 0x3a4430, escudeiro: 0x1a2430, acougueiro: 0xc8c0b0, colosso: 0x2a2e28, rainha: 0x2a0a30,
  espectro: 0x40505a, toxico: 0x4a5a20, gritador: 0x5a4a4a,
};

export function criarZumbi(tipo, opcoes = {}) {
  const def = ZUMBIS[tipo];
  const transparente = tipo === 'espectro';
  const lambert = cor => new THREE.MeshLambertMaterial({ color: cor, transparent: transparente });
  const pele = lambert(def.pele);
  const roupa = lambert(CORES_ROUPA_TIPO[tipo] ?? ROUPAS[Math.floor(Math.random() * ROUPAS.length)]);
  const calca = lambert(def.boss ? 0x1a1414 : tipo === 'blindado' || tipo === 'escudeiro' ? 0x2a3020 : 0x2a3040);
  const olho = new THREE.MeshBasicMaterial({ color: def.olho });
  const sangue = lambert(0x5a0a0a);
  const metal = new THREE.MeshLambertMaterial({ color: 0x6a7078 });
  const mats = [pele, roupa, calca, sangue, metal];
  const ud = { mats, pele, olhoMat: olho };

  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);

  const gordo = tipo === 'inchado' || tipo === 'toxico' || tipo === 'acougueiro';
  const largura = gordo ? 0.75 : tipo === 'corredor' || tipo === 'gritador' ? 0.42 : tipo === 'colosso' ? 0.7 : 0.5;
  const prof = gordo ? 0.55 : tipo === 'colosso' ? 0.45 : 0.28;
  corpo.add(caixa(roupa, largura, 0.62, prof, 0, 1.12, 0));
  corpo.add(caixa(sangue, largura * 0.5, 0.2, 0.02, 0.06, 1.05, -(prof / 2 + 0.01)));

  const cabeca = new THREE.Group();
  cabeca.position.set(0, 1.58, 0);
  const tamCab = tipo === 'gritador' ? 0.36 : 0.3;
  cabeca.add(caixa(pele, tamCab, 0.32, 0.3, 0, 0, 0));
  cabeca.add(caixa(olho, 0.06, 0.04, 0.02, -0.07, 0.03, -0.155));
  cabeca.add(caixa(olho, 0.06, 0.04, 0.02, 0.07, 0.03, -0.155));
  cabeca.add(caixa(sangue, 0.14, 0.05, 0.02, 0, -0.08, -0.155));
  if (tipo === 'cuspidor' || tipo === 'toxico') cabeca.add(caixa(olho, 0.16, 0.08, 0.04, 0, -0.08, -0.16));
  if (tipo === 'gritador') cabeca.add(caixa(new THREE.MeshBasicMaterial({ color: 0x200000 }), 0.16, 0.16, 0.04, 0, -0.07, -0.16));
  if (tipo === 'chefe' || tipo === 'rainha') {
    const n = tipo === 'rainha' ? 2 : 1;
    for (let i = -n; i <= n; i++) {
      const esp = caixa(olho, 0.05, tipo === 'rainha' ? 0.26 : 0.18, 0.05, i * 0.07, 0.22, 0.03);
      esp.rotation.z = i * 0.28;
      cabeca.add(esp);
    }
  }
  if (tipo === 'blindado') {
    ud.capacete = new THREE.Group();
    ud.capacete.add(caixa(metal, 0.36, 0.14, 0.36, 0, 0.13, 0));
    ud.capacete.add(caixa(metal, 0.38, 0.03, 0.4, 0, 0.07, -0.02));
    ud.capacete.add(caixa(new THREE.MeshBasicMaterial({ color: 0x101820 }), 0.3, 0.07, 0.02, 0, 0.03, -0.17));
    cabeca.add(ud.capacete);
  }
  if (tipo === 'colosso') cabeca.add(caixa(metal, 0.36, 0.2, 0.36, 0, 0.08, 0));
  cabeca.rotation.z = (Math.random() - 0.5) * 0.4;
  corpo.add(cabeca);

  if (tipo === 'inchado' || tipo === 'toxico') {
    const cor = tipo === 'toxico' ? 0x9cff3a : 0xc8d040;
    for (let i = 0; i < 6; i++) {
      corpo.add(caixa(new THREE.MeshBasicMaterial({ color: cor }), 0.12, 0.12, 0.12,
        (Math.random() - 0.5) * 0.7, 0.9 + Math.random() * 0.45, -0.28 + Math.random() * 0.05));
    }
  }
  if (tipo === 'bruto' || tipo === 'chefe' || tipo === 'colosso' || tipo === 'acougueiro') {
    corpo.add(caixa(tipo === 'colosso' ? metal : pele, largura * 1.5, 0.22, 0.38, 0, 1.38, 0));
  }
  // placas de armadura
  if (tipo === 'blindado' || tipo === 'colosso') {
    ud.placas = new THREE.Group();
    ud.placas.add(caixa(metal, largura + 0.08, 0.5, 0.06, 0, 1.15, -(prof / 2 + 0.03)));
    ud.placas.add(caixa(metal, largura + 0.08, 0.5, 0.06, 0, 1.15, prof / 2 + 0.03));
    ud.placas.add(caixa(metal, 0.12, 0.12, prof + 0.1, -(largura / 2 + 0.06), 1.38, 0));
    ud.placas.add(caixa(metal, 0.12, 0.12, prof + 0.1, largura / 2 + 0.06, 1.38, 0));
    corpo.add(ud.placas);
  }
  if (tipo === 'colosso') {
    // núcleo fraco nas costas
    ud.nucleo = caixa(new THREE.MeshBasicMaterial({ color: 0xffa000 }), 0.22, 0.22, 0.06, 0, 1.2, prof / 2 + 0.08);
    corpo.add(ud.nucleo);
  }
  if (tipo === 'acougueiro') {
    corpo.add(caixa(new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }), largura * 0.9, 0.7, 0.03, 0, 0.95, -(prof / 2 + 0.02)));
    corpo.add(caixa(sangue, largura * 0.5, 0.3, 0.035, -0.1, 0.9, -(prof / 2 + 0.03)));
  }
  if (tipo === 'rainha') {
    for (const lado of [-1, 1]) {
      const asa = caixa(new THREE.MeshLambertMaterial({ color: 0x3a1a4a, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), 0.9, 1.0, 0.03, lado * 0.6, 1.45, 0.25);
      asa.rotation.y = lado * 0.5; asa.rotation.z = lado * -0.3;
      corpo.add(asa);
    }
  }

  function membro(mat, w, h, x, y) {
    const p = new THREE.Group();
    p.position.set(x, y, 0);
    p.add(caixa(mat, w, h, w, 0, -h / 2, 0));
    return p;
  }
  const bracoE = membro(pele, 0.14, tipo === 'rainha' ? 0.9 : 0.62, -(largura / 2 + 0.08), 1.4);
  const bracoD = membro(pele, 0.14, tipo === 'rainha' ? 0.9 : 0.62, (largura / 2 + 0.08), 1.4);
  const grosso = ['bruto', 'chefe', 'colosso', 'acougueiro'].includes(tipo);
  const bracoL = grosso ? 0.24 : 0.14;
  bracoE.children[0].scale.x = bracoE.children[0].scale.z = bracoL;
  bracoD.children[0].scale.x = bracoD.children[0].scale.z = bracoL;
  const pernaE = membro(calca, 0.18, 0.8, -0.13, 0.8);
  const pernaD = membro(calca, 0.18, 0.8, 0.13, 0.8);
  corpo.add(bracoE, bracoD, pernaE, pernaD);

  if (tipo === 'acougueiro') {
    // cutelo na mão direita
    const cutelo = new THREE.Group();
    cutelo.add(caixa(new THREE.MeshLambertMaterial({ color: 0x3a2010 }), 0.06, 0.06, 0.25, 0, -0.62, -0.05));
    cutelo.add(caixa(new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.8, roughness: 0.3 }), 0.03, 0.35, 0.45, 0, -0.62, -0.38));
    bracoD.add(cutelo);
  }
  if (tipo === 'escudeiro') {
    // escudo antimotim preso ao braço esquerdo, na frente do corpo
    ud.escudo = new THREE.Group();
    ud.escudo.add(caixa(new THREE.MeshLambertMaterial({ color: 0x20262e }), 0.85, 1.25, 0.06, 0, 0, 0));
    ud.escudo.add(caixa(new THREE.MeshBasicMaterial({ color: 0x406080, transparent: true, opacity: 0.6 }), 0.6, 0.18, 0.07, 0, 0.38, 0));
    ud.escudo.add(caixa(new THREE.MeshBasicMaterial({ color: 0xffffff }), 0.5, 0.06, 0.07, 0, -0.2, 0));
    ud.escudo.position.set(0.05, 1.0, -0.45);
    corpo.add(ud.escudo);
  }
  if (opcoes.elite) {
    // brilho dourado e coroa
    const ouro = new THREE.MeshBasicMaterial({ color: 0xffd040 });
    cabeca.add(caixa(ouro, 0.32, 0.05, 0.32, 0, 0.2, 0));
    for (const x of [-0.12, 0, 0.12]) cabeca.add(caixa(ouro, 0.05, 0.1, 0.05, x, 0.26, -0.13));
  }

  g.scale.setScalar(def.escala * (def.boss ? 1 : 0.95 + Math.random() * 0.1) * (opcoes.elite ? 1.15 : 1));
  Object.assign(ud, { corpo, cabeca, bracoE, bracoD, pernaE, pernaD });
  g.userData = ud;
  return g;
}

// facão para a mão (primeira pessoa)
export function criarFacao() {
  const g = new THREE.Group();
  const lamina = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.9, roughness: 0.25 });
  const cabo = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.8 });
  g.add(caixa(cabo, 0.035, 0.035, 0.13, 0, 0, 0.02));
  g.add(caixa(new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6 }), 0.07, 0.02, 0.02, 0, 0, -0.05));
  g.add(caixa(lamina, 0.012, 0.055, 0.32, 0, 0.005, -0.22));
  return g;
}

// torreta sentinela
export function criarTorreta() {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: 0x4a5058 });
  const escuro = new THREE.MeshLambertMaterial({ color: 0x1a1c20 });
  for (let i = 0; i < 3; i++) {
    const perna = caixa(metal, 0.06, 0.9, 0.06, Math.cos(i * 2.1) * 0.3, 0.4, Math.sin(i * 2.1) * 0.3);
    perna.rotation.z = Math.cos(i * 2.1) * 0.35; perna.rotation.x = -Math.sin(i * 2.1) * 0.35;
    g.add(perna);
  }
  const topo = new THREE.Group();
  topo.position.y = 0.95;
  topo.add(caixa(metal, 0.4, 0.28, 0.5, 0, 0, 0));
  topo.add(cano(escuro, 0.04, 0.6, 0, 0.02, -0.5));
  topo.add(caixa(new THREE.MeshBasicMaterial({ color: 0x40ff80 }), 0.1, 0.05, 0.02, 0, 0.1, -0.26));
  g.add(topo);
  g.userData.topo = topo;
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
