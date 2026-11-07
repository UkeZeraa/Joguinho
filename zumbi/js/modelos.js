// Modelos 3D: armas detalhadas, mãos em primeira pessoa, zumbis e chefes.
// Cada parte (corpo da arma, braço do zumbi...) é feita de muitas peças pequenas que
// são juntadas numa única malha com cores por vértice: muito detalhe e poucas chamadas de desenho.
import * as THREE from 'three';
import { TIERS, CAMOS, ZUMBIS } from './dados.js';

const rand = (a, b) => a + Math.random() * (b - a);
const escolher = a => a[Math.floor(Math.random() * a.length)];

// ======================================================================= MESCLAGEM
const GEOS = {
  box: new THREE.BoxGeometry(1, 1, 1).toNonIndexed(),
  cil: new THREE.CylinderGeometry(0.5, 0.5, 1, 12).toNonIndexed(),
  cil6: new THREE.CylinderGeometry(0.5, 0.5, 1, 6).toNonIndexed(),
  cone: new THREE.CylinderGeometry(0, 0.5, 1, 8).toNonIndexed(),
  esf: new THREE.SphereGeometry(0.5, 10, 7).toNonIndexed(),
  oct: new THREE.OctahedronGeometry(0.5, 0).toNonIndexed(),
  anel: new THREE.TorusGeometry(0.5, 0.12, 6, 16).toNonIndexed(),
};
const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Color();
const Z = new THREE.Vector3(0, 0, 1);

// partes: [{g, w,h,d, x,y,z, rx,ry,rz | q, cor, var}]  ->  BufferGeometry com cor por vértice e UV projetada
export function mesclar(partes, uvEsc = 6) {
  let total = 0;
  for (const p of partes) total += GEOS[p.g || 'box'].attributes.position.count;
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3), uv = new Float32Array(total * 2);
  let o = 0;
  for (const p of partes) {
    const g = GEOS[p.g || 'box'];
    if (p.q) _q.copy(p.q); else _q.setFromEuler(_e.set(p.rx || 0, p.ry || 0, p.rz || 0));
    _m.compose(_p.set(p.x || 0, p.y || 0, p.z || 0), _q, _s.set(p.w, p.h, p.d));
    _nm.getNormalMatrix(_m);
    const P = g.attributes.position.array, N = g.attributes.normal.array, cnt = g.attributes.position.count;
    _c.set(p.cor ?? 0xffffff);
    const varia = p.var ?? 0.06;
    let jit = 1;
    for (let v = 0; v < cnt; v++) {
      if (v % 6 === 0) jit = 1 + (Math.random() - 0.5) * 2 * varia;
      _v.set(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]).applyMatrix4(_m);
      _n.set(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]).applyMatrix3(_nm).normalize();
      pos[o * 3] = _v.x; pos[o * 3 + 1] = _v.y; pos[o * 3 + 2] = _v.z;
      nor[o * 3] = _n.x; nor[o * 3 + 1] = _n.y; nor[o * 3 + 2] = _n.z;
      const ao = 0.78 + 0.22 * (_n.y * 0.5 + 0.5); // embaixo fica mais escuro
      col[o * 3] = Math.min(1, _c.r * jit * ao); col[o * 3 + 1] = Math.min(1, _c.g * jit * ao); col[o * 3 + 2] = Math.min(1, _c.b * jit * ao);
      const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z);
      if (ax >= ay && ax >= az) { uv[o * 2] = _v.z * uvEsc; uv[o * 2 + 1] = _v.y * uvEsc; }
      else if (ay >= az) { uv[o * 2] = _v.x * uvEsc; uv[o * 2 + 1] = _v.z * uvEsc; }
      else { uv[o * 2] = _v.x * uvEsc; uv[o * 2 + 1] = _v.y * uvEsc; }
      o++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}

// Montador: agrupa peças por material
function montador() {
  const grupos = {};
  const add = (k, p) => (grupos[k] ||= []).push(p);
  return {
    grupos,
    b: (k, w, h, d, x = 0, y = 0, z = 0, o = {}) => add(k, { g: 'box', w, h, d, x, y, z, ...o }),
    // cilindro deitado ao longo do eixo z (canos)
    t: (k, r, len, x = 0, y = 0, z = 0, o = {}) => add(k, { g: 'cil', w: r * 2, h: len, d: r * 2, x, y, z, rx: Math.PI / 2, ...o }),
    // cilindro em pé
    c: (k, r, h, x = 0, y = 0, z = 0, o = {}) => add(k, { g: 'cil', w: r * 2, h, d: r * 2, x, y, z, ...o }),
    e: (k, r, x = 0, y = 0, z = 0, o = {}) => add(k, { g: 'esf', w: r * 2, h: r * 2, d: r * 2, x, y, z, ...o }),
    g: (k, geo, w, h, d, x = 0, y = 0, z = 0, o = {}) => add(k, { g: geo, w, h, d, x, y, z, ...o }),
    // barra entre dois pontos (braços, alças)
    barra: (k, a, b, w, h, o = {}) => {
      const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const len = dir.length(); dir.normalize();
      add(k, { g: o.g || 'box', w, h, d: len, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, z: (a[2] + b[2]) / 2, q: new THREE.Quaternion().setFromUnitVectors(Z, dir), ...o });
    },
    malhas(mats, grupo = new THREE.Group()) {
      for (const k in grupos) {
        if (!mats[k]) continue;
        const m = new THREE.Mesh(mesclar(grupos[k], mats[k].userData?.uvEsc || 6), mats[k]);
        m.name = k;
        grupo.add(m);
      }
      return grupo;
    },
  };
}

// ======================================================================= TEXTURAS
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
function manchas(g, w, h, cores, n, rMin, rMax) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = escolher(cores);
    const x = Math.random() * w, y = Math.random() * h, rx = rand(rMin, rMax), ry = rx * rand(0.4, 0.9), a = rand(0, 3);
    for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) { g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, a, 0, 7); g.fill(); }
  }
}
function arranhoes(g, w, h, n, cor = 'rgba(255,255,255,0.12)') {
  g.strokeStyle = cor; g.lineWidth = 1;
  for (let i = 0; i < n; i++) { const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + rand(-12, 12), y + rand(-4, 4)); g.stroke(); }
}
function granulado(g, w, h, forca) {
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - 0.5) * forca; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
  g.putImageData(img, 0, 0);
}
const camoCache = {};
// Retorna { map, emissiveMap?, metal, rugo }
export function texCamo(id) {
  if (camoCache[id]) return camoCache[id];
  let r = { metal: 0.35, rugo: 0.55 };
  const T = 128;
  const mk = desenha => canvasTex(T, T, desenha);
  switch (id) {
    case 'deserto': r.map = mk((g) => { g.fillStyle = '#b39a6a'; g.fillRect(0, 0, T, T); manchas(g, T, T, ['#8f7a50', '#d2bd92', '#7a6440'], 26, 8, 22); granulado(g, T, T, 18); arranhoes(g, T, T, 20); }); break;
    case 'floresta': r.map = mk((g) => { g.fillStyle = '#4a5a3a'; g.fillRect(0, 0, T, T); manchas(g, T, T, ['#2e3a26', '#6a5a3a', '#1a1c14', '#5a6a40'], 34, 7, 20); granulado(g, T, T, 16); }); break;
    case 'urbano': r.map = mk((g) => {
      g.fillStyle = '#5a5e64'; g.fillRect(0, 0, T, T);
      for (let y = 0; y < T; y += 8) for (let x = 0; x < T; x += 8) { if (Math.random() < 0.45) { g.fillStyle = escolher(['#7a7e84', '#3a3d42', '#9a9ea4', '#4a4d52']); g.fillRect(x, y, 8, 8); } }
      granulado(g, T, T, 10);
    }); break;
    case 'sangue': r.map = mk((g) => {
      g.fillStyle = '#3a0a0a'; g.fillRect(0, 0, T, T); manchas(g, T, T, ['#6a1010', '#200404', '#8a1414'], 30, 4, 16);
      g.fillStyle = '#7a0c0c'; for (let i = 0; i < 12; i++) g.fillRect(Math.random() * T, Math.random() * T, 2, rand(8, 30));
      granulado(g, T, T, 14);
    }); r.rugo = 0.35; break;
    case 'gelo': r.map = mk((g) => {
      g.fillStyle = '#a8d4e6'; g.fillRect(0, 0, T, T); manchas(g, T, T, ['#d8f0fa', '#7ab0c8', '#ffffff'], 24, 6, 18);
      g.strokeStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 14; i++) { let x = Math.random() * T, y = Math.random() * T; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += rand(-14, 14); y += rand(-14, 14); g.lineTo(x, y); } g.stroke(); }
    }); r.rugo = 0.2; r.metal = 0.5; break;
    case 'ouro': r.map = mk((g) => {
      const gr = g.createLinearGradient(0, 0, T, T); gr.addColorStop(0, '#f0c850'); gr.addColorStop(0.5, '#b88a20'); gr.addColorStop(1, '#f6d870');
      g.fillStyle = gr; g.fillRect(0, 0, T, T);
      g.strokeStyle = 'rgba(90,60,0,0.6)'; g.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) { g.beginPath(); const x = Math.random() * T, y = Math.random() * T; g.arc(x, y, rand(6, 16), rand(0, 3), rand(3, 6)); g.stroke(); }
    }); r.metal = 1; r.rugo = 0.22; break;
    case 'obsidiana': {
      const veias = [];
      for (let i = 0; i < 12; i++) { const pts = [[Math.random() * T, Math.random() * T]]; for (let k = 0; k < 6; k++) { const l = pts[pts.length - 1]; pts.push([l[0] + rand(-16, 16), l[1] + rand(-16, 16)]); } veias.push(pts); }
      const traca = (g, cor, lw) => { g.strokeStyle = cor; g.lineWidth = lw; for (const v of veias) { g.beginPath(); g.moveTo(...v[0]); v.forEach(p => g.lineTo(...p)); g.stroke(); } };
      r.map = mk((g) => { g.fillStyle = '#120c1a'; g.fillRect(0, 0, T, T); granulado(g, T, T, 10); traca(g, '#6a20a0', 2); });
      r.emissiveMap = mk((g) => { g.fillStyle = '#000'; g.fillRect(0, 0, T, T); traca(g, '#c040ff', 1.5); });
      r.metal = 0.6; r.rugo = 0.18; break;
    }
    default: r.map = mk((g) => { g.fillStyle = '#2b2e33'; g.fillRect(0, 0, T, T); granulado(g, T, T, 14); arranhoes(g, T, T, 40, 'rgba(200,200,200,0.15)'); }); r.metal = 0.45; r.rugo = 0.5;
  }
  return (camoCache[id] = r);
}
let texMadeiraC = null;
function texMadeira() {
  if (texMadeiraC) return texMadeiraC;
  return (texMadeiraC = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#6a4024'; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '40,20,8' : '140,90,50'},${rand(0.1, 0.35)})`; g.fillRect(x, 0, 1, h); }
    for (let i = 0; i < 4; i++) { g.strokeStyle = 'rgba(30,14,4,0.5)'; g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(3, 8), rand(8, 20), 0, 0, 7); g.stroke(); }
  }));
}
let texTecidoC = null;
function texTecido() {
  if (texTecidoC) return texTecidoC;
  return (texTecidoC = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#3e4632'; g.fillRect(0, 0, w, h);
    manchas(g, w, h, ['#2a3022', '#545a3e', '#33291c'], 14, 4, 12);
    for (let y = 0; y < h; y += 2) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, w, 1); }
  }));
}

// ======================================================================= ARMAS
const INT_BRILHO = [0.6, 1.0, 1.5, 2.4, 3.0, 3.8];

function materiaisArma(arma) {
  const tier = TIERS[arma.tier];
  const camo = CAMOS.find(c => c.id === arma.camo) || CAMOS[0];
  const tc = texCamo(camo.id);
  const corpo = new THREE.MeshStandardMaterial({ map: tc.map, color: 0xffffff, vertexColors: true, roughness: tc.rugo, metalness: tc.metal });
  if (tc.emissiveMap) { corpo.emissiveMap = tc.emissiveMap; corpo.emissive = new THREE.Color(0xffffff); corpo.emissiveIntensity = 1.4; }
  corpo.userData.uvEsc = 7;
  return {
    corpo,
    metal: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.32, metalness: 0.9 }),
    polimero: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.78, metalness: 0.1 }),
    madeira: Object.assign(new THREE.MeshStandardMaterial({ map: texMadeira(), color: 0xffffff, vertexColors: true, roughness: 0.6, metalness: 0.05 }), { userData: { uvEsc: 5 } }),
    brilho: new THREE.MeshStandardMaterial({ color: tier.cor, emissive: tier.cor, emissiveIntensity: INT_BRILHO[arma.tier], roughness: 0.4 }),
    vidro: new THREE.MeshStandardMaterial({ color: 0x0c1420, emissive: new THREE.Color(tier.cor).multiplyScalar(0.12), roughness: 0.05, metalness: 1 }),
    mira: new THREE.MeshBasicMaterial({ color: arma.tier >= 3 ? tier.cor : 0xff2a1a, toneMapped: false }),
    ouro: new THREE.MeshStandardMaterial({ color: 0xd8a838, roughness: 0.25, metalness: 1 }),
  };
}

const CINZA = 0x26282c, PRETO = 0x161718, ESCURO = 0x0a0a0b, LATAO = 0xc8a040, CINZA_CLARO = 0x4a4d52;

// trilho picatinny ao longo do eixo z
function trilho(A, x, y, z0, z1, larg = 0.026) {
  A.b('metal', larg, 0.008, Math.abs(z1 - z0), x, y, (z0 + z1) / 2, { cor: PRETO });
  for (let z = Math.min(z0, z1) + 0.006; z < Math.max(z0, z1) - 0.004; z += 0.012) A.b('metal', larg + 0.006, 0.006, 0.006, x, y + 0.006, z, { cor: CINZA });
}
// fendas de ventilação num guarda-mão
function fendas(A, x, y, z0, n, passo, w = 0.006, h = 0.016, d = 0.026) {
  for (let i = 0; i < n; i++) { A.b('metal', w, h, d, x, y, z0 - i * passo, { cor: ESCURO, var: 0 }); A.b('metal', w, h, d, -x, y, z0 - i * passo, { cor: ESCURO, var: 0 }); }
}
// mira red dot / holográfica / luneta pequena
function otica(A, tier, y, z) {
  if (tier === 2) {
    A.b('metal', 0.03, 0.012, 0.05, 0, y + 0.006, z, { cor: PRETO });
    A.t('metal', 0.017, 0.055, 0, y + 0.03, z, { cor: CINZA });
    A.t('vidro', 0.014, 0.004, 0, y + 0.03, z - 0.028);
    A.t('vidro', 0.014, 0.004, 0, y + 0.03, z + 0.028);
    A.b('metal', 0.012, 0.01, 0.012, 0.018, y + 0.03, z, { cor: CINZA_CLARO });
    A.b('mira', 0.004, 0.004, 0.002, 0, y + 0.03, z + 0.02);
  } else if (tier === 3) {
    A.b('metal', 0.044, 0.014, 0.075, 0, y + 0.007, z, { cor: PRETO });
    A.b('metal', 0.006, 0.042, 0.06, 0.02, y + 0.035, z, { cor: CINZA });
    A.b('metal', 0.006, 0.042, 0.06, -0.02, y + 0.035, z, { cor: CINZA });
    A.b('metal', 0.046, 0.006, 0.06, 0, y + 0.058, z, { cor: CINZA });
    A.b('vidro', 0.034, 0.034, 0.003, 0, y + 0.035, z - 0.025);
    A.b('mira', 0.012, 0.0025, 0.002, 0, y + 0.035, z + 0.01);
    A.b('mira', 0.0025, 0.012, 0.002, 0, y + 0.035, z + 0.01);
    A.b('brilho', 0.048, 0.003, 0.04, 0, y + 0.0145, z);
  } else if (tier >= 4) {
    // mira de energia: tubo com anéis brilhando
    A.b('metal', 0.03, 0.014, 0.08, 0, y + 0.007, z, { cor: PRETO });
    A.t('metal', 0.02, 0.1, 0, y + 0.036, z, { cor: tier === 5 ? 0x2a1014 : 0x2a2014 });
    A.t('brilho', 0.022, 0.006, 0, y + 0.036, z - 0.035);
    A.t('brilho', 0.022, 0.006, 0, y + 0.036, z + 0.035);
    A.t('vidro', 0.017, 0.004, 0, y + 0.036, z - 0.052);
    A.t('mira', 0.004, 0.003, 0, y + 0.036, z + 0.052);
    A.b('ouro', 0.034, 0.004, 0.02, 0, y + 0.058, z);
  }
}
function gatilho(A, z, y = -0.03) {
  A.b('polimero', 0.012, 0.008, 0.06, 0, y - 0.022, z - 0.005, { cor: PRETO });
  A.b('polimero', 0.012, 0.03, 0.008, 0, y - 0.006, z - 0.035, { cor: PRETO });
  A.b('metal', 0.006, 0.022, 0.006, 0, y - 0.004, z + 0.005, { cor: CINZA_CLARO, rx: 0.35 });
}
function empunhadura(A, z, y = -0.03, ang = -0.28, h = 0.11) {
  A.b('polimero', 0.034, h, 0.048, 0, y - h / 2 + 0.01, z + 0.02, { rx: ang, cor: PRETO });
  for (let i = 0; i < 3; i++) A.b('polimero', 0.036, 0.008, 0.01, 0, y - 0.02 - i * 0.028, z - 0.005 + i * 0.008, { rx: ang, cor: 0x222325 });
  for (let i = 0; i < 6; i++) A.b('polimero', 0.0365, 0.004, 0.035, 0, y - 0.015 - i * 0.014, z + 0.025 + i * 0.004, { rx: ang, cor: 0x1c1d1f, var: 0.12 });
}
// detalhes por tier: faixas de brilho, gravações
function faixas(A, tier, larg, y, z0, comp) {
  if (tier < 1) return;
  A.b('brilho', larg + 0.002, 0.003, comp, 0, y, z0 - comp / 2);
  if (tier >= 3) {
    for (let i = 0; i < (tier - 1) * 2; i++) {
      const z = z0 - rand(0.02, comp - 0.02);
      A.b('brilho', larg + 0.003, rand(0.006, 0.018), 0.003, 0, y - rand(0.005, 0.02), z);
    }
  }
}

export function criarArma(arma, opcoes = {}) {
  const tier = arma.tier;
  const mats = materiaisArma(arma);
  const A = montador();          // corpo fixo
  const F = montador();          // ferrolho / pente da escopeta (anima no tiro)
  const C = montador();          // carregador (anima na recarga)
  const g = new THREE.Group();
  const anim = [];
  let ponta = -0.5, ferroCurso = 0.025;
  const maoE = [0, -0.07, -0.3];
  let maoEnoFerrolho = false;

  switch (arma.tipo) {
    case 'pistola': {
      // armação
      A.b('polimero', 0.03, 0.03, 0.19, 0, -0.01, -0.085, { cor: PRETO });
      for (let i = 0; i < 3; i++) A.b('metal', 0.032, 0.005, 0.008, 0, -0.027, -0.13 - i * 0.015, { cor: CINZA });
      gatilho(A, -0.02, -0.02);
      empunhadura(A, 0.0, -0.02, -0.25, 0.11);
      A.b('polimero', 0.03, 0.014, 0.03, 0, -0.004, 0.044, { cor: PRETO, rx: -0.4 });
      // ferrolho (slide)
      F.b('corpo', 0.034, 0.032, 0.2, 0, 0.022, -0.085);
      F.b('corpo', 0.03, 0.006, 0.19, 0, 0.04, -0.085, { cor: 0xd0d0d0 });
      for (let i = 0; i < 6; i++) { F.b('metal', 0.0355, 0.024, 0.003, 0, 0.022, 0.005 - i * 0.006, { cor: ESCURO }); }
      for (let i = 0; i < 4; i++) { F.b('metal', 0.0355, 0.02, 0.003, 0, 0.022, -0.16 - i * 0.006, { cor: ESCURO }); }
      F.b('metal', 0.012, 0.014, 0.04, 0.012, 0.03, -0.06, { cor: ESCURO, var: 0 });
      F.b('metal', 0.012, 0.012, 0.03, 0.009, 0.03, -0.06, { cor: LATAO });
      F.b('metal', 0.03, 0.01, 0.008, 0, 0.044, 0.008, { cor: PRETO });
      F.b('metal', 0.007, 0.012, 0.007, 0, 0.045, -0.175, { cor: PRETO });
      F.b('brilho', 0.003, 0.003, 0.002, 0, 0.049, -0.179);
      F.t('metal', 0.009, 0.02, 0, 0.022, -0.188, { cor: CINZA_CLARO });
      F.t('metal', 0.004, 0.022, 0, 0.022, -0.188, { cor: ESCURO, var: 0 });
      faixas(F, tier, 0.034, 0.008, -0.01, 0.17);
      if (tier >= 2) {
        F.b('metal', 0.026, 0.018, 0.032, 0, 0.048, -0.01, { cor: PRETO });
        F.b('vidro', 0.02, 0.016, 0.002, 0, 0.056, -0.026);
        F.b('mira', 0.003, 0.003, 0.002, 0, 0.056, -0.015);
      }
      if (tier >= 3) {
        F.b('metal', 0.036, 0.036, 0.034, 0, 0.022, -0.205, { cor: CINZA });
        for (let i = 0; i < 3; i++) F.b('brilho', 0.02, 0.004, 0.006, 0, 0.041, -0.195 - i * 0.01);
        ponta = -0.225;
      } else ponta = -0.2;
      // carregador
      C.b('metal', 0.026, 0.1, 0.038, 0, -0.07, 0.022, { rx: -0.25, cor: CINZA });
      C.b('polimero', 0.032, 0.012, 0.05, 0, -0.123, 0.036, { rx: -0.25, cor: PRETO });
      ferroCurso = 0.03;
      maoE[0] = -0.02; maoE[1] = -0.075; maoE[2] = 0.0;
      break;
    }
    case 'submetralhadora': {
      A.b('corpo', 0.058, 0.07, 0.3, 0, 0, -0.12);
      A.b('corpo', 0.06, 0.012, 0.28, 0, -0.04, -0.12, { cor: 0xb0b0b0 });
      trilho(A, 0, 0.04, 0.02, -0.25);
      A.b('polimero', 0.064, 0.062, 0.13, 0, -0.005, -0.31, { cor: PRETO });
      fendas(A, 0.033, 0.0, -0.27, 4, 0.025);
      A.b('metal', 0.012, 0.024, 0.04, 0.03, 0.008, -0.08, { cor: ESCURO, var: 0 });
      A.t('metal', 0.013, 0.08, 0, 0.0, -0.4, { cor: CINZA });
      A.b('polimero', 0.044, 0.04, 0.06, 0, -0.05, -0.15, { cor: PRETO });
      gatilho(A, -0.05, -0.035);
      empunhadura(A, -0.02, -0.035, -0.22, 0.1);
      // coronha dobrável
      A.barra('metal', [0.022, -0.01, 0.03], [0.022, -0.02, 0.22], 0.008, 0.008, { cor: CINZA_CLARO });
      A.barra('metal', [-0.022, -0.01, 0.03], [-0.022, -0.02, 0.22], 0.008, 0.008, { cor: CINZA_CLARO });
      A.b('polimero', 0.056, 0.085, 0.016, 0, -0.035, 0.225, { cor: PRETO });
      if (tier < 2) {
        A.t('metal', 0.016, 0.006, 0, 0.055, -0.24, { cor: PRETO });
        A.b('metal', 0.004, 0.02, 0.004, 0, 0.06, -0.24, { cor: PRETO });
        A.c('metal', 0.012, 0.022, 0, 0.056, 0.01, { cor: PRETO, rz: Math.PI / 2 });
      } else otica(A, tier, 0.044, -0.08);
      faixas(A, tier, 0.058, 0.015, -0.0, 0.26);
      if (tier >= 3) {
        A.t('metal', 0.024, 0.17, 0, 0.0, -0.5, { cor: PRETO });
        for (let i = 0; i < 5; i++) A.t('brilho', 0.0245, 0.004, 0, 0.0, -0.44 - i * 0.03);
        ponta = -0.59;
      } else {
        A.t('metal', 0.017, 0.03, 0, 0, -0.45, { cor: PRETO });
        ponta = -0.47;
      }
      if (tier >= 1) A.b('polimero', 0.026, 0.06, 0.03, 0, -0.065, -0.32, { cor: PRETO });
      // alavanca de manejo (anima)
      F.t('metal', 0.007, 0.1, -0.028, 0.026, -0.2, { cor: CINZA });
      F.b('metal', 0.02, 0.012, 0.012, -0.04, 0.026, -0.25, { cor: PRETO });
      // carregador curvo
      for (let i = 0; i < 3; i++) C.b('metal', 0.034, 0.065, 0.05, 0, -0.08 - i * 0.055, -0.15 + i * 0.012, { rx: 0.1 + i * 0.1, cor: CINZA });
      C.b('metal', 0.038, 0.012, 0.056, 0, -0.245, -0.11, { rx: 0.35, cor: PRETO });
      maoE[1] = -0.055; maoE[2] = -0.3;
      ferroCurso = 0.035;
      break;
    }
    case 'fuzil': {
      // receptor superior e inferior
      A.b('corpo', 0.058, 0.058, 0.3, 0, 0.012, -0.08);
      A.b('corpo', 0.054, 0.05, 0.22, 0, -0.04, -0.05, { cor: 0xa8a8a8 });
      A.b('metal', 0.004, 0.02, 0.05, 0.03, 0.012, -0.05, { cor: ESCURO, var: 0 });
      A.c('metal', 0.008, 0.012, 0.032, 0.0, 0.01, { cor: CINZA_CLARO, rz: Math.PI / 2 });
      trilho(A, 0, 0.045, 0.06, -0.52);
      // guarda-mão
      A.b('corpo', 0.064, 0.064, 0.3, 0, 0.008, -0.38);
      fendas(A, 0.033, 0.008, -0.26, 8, 0.03);
      A.b('metal', 0.066, 0.01, 0.02, 0, 0.008, -0.24, { cor: PRETO });
      // bloco de gases, cano e quebra-chamas
      A.b('metal', 0.03, 0.034, 0.03, 0, 0.012, -0.55, { cor: PRETO });
      A.t('metal', 0.012, 0.16, 0, 0.012, -0.62, { cor: CINZA });
      A.t('metal', 0.018, 0.05, 0, 0.012, -0.71, { cor: PRETO });
      for (let i = 0; i < 3; i++) A.b('metal', 0.038, 0.006, 0.008, 0, 0.012, -0.695 - i * 0.012, { cor: ESCURO, var: 0 });
      ponta = -0.74;
      // pente do carregador
      A.b('polimero', 0.05, 0.04, 0.07, 0, -0.08, -0.12, { cor: PRETO });
      gatilho(A, -0.03, -0.065);
      empunhadura(A, 0.0, -0.065, -0.3, 0.11);
      // coronha
      A.t('metal', 0.016, 0.12, 0, 0.0, 0.12, { cor: PRETO });
      A.b('polimero', 0.044, 0.085, 0.17, 0, -0.03, 0.2, { cor: PRETO });
      A.b('polimero', 0.046, 0.03, 0.12, 0, 0.022, 0.2, { cor: 0x222325 });
      A.b('polimero', 0.05, 0.1, 0.022, 0, -0.035, 0.29, { cor: 0x101010, var: 0.15 });
      A.b('metal', 0.006, 0.02, 0.03, 0.025, -0.06, 0.24, { cor: CINZA });
      // miras
      if (tier < 2) {
        A.b('metal', 0.02, 0.03, 0.015, 0, 0.065, -0.5, { cor: PRETO });
        A.b('metal', 0.004, 0.016, 0.004, 0, 0.083, -0.5, { cor: PRETO });
        A.b('metal', 0.026, 0.026, 0.02, 0, 0.062, 0.03, { cor: PRETO });
        A.b('metal', 0.006, 0.01, 0.022, 0, 0.078, 0.03, { cor: ESCURO });
      } else otica(A, tier, 0.05, -0.06);
      faixas(A, tier, 0.058, 0.024, 0.06, 0.28);
      if (tier >= 1) { A.b('polimero', 0.028, 0.07, 0.032, 0, -0.06, -0.4, { cor: PRETO }); A.b('polimero', 0.034, 0.008, 0.038, 0, -0.098, -0.4, { cor: 0x222325 }); }
      if (tier >= 3) {
        // lanterna tática com laser
        A.b('metal', 0.022, 0.024, 0.07, 0.044, 0.008, -0.46, { cor: PRETO });
        A.t('brilho', 0.008, 0.004, 0.044, 0.008, -0.497);
      }
      if (tier >= 4) {
        // trilhos de energia no guarda-mão
        A.t('brilho', 0.004, 0.24, 0.034, 0.03, -0.38);
        A.t('brilho', 0.004, 0.24, -0.034, 0.03, -0.38);
      }
      // alavanca de manejo e ferrolho visível
      F.b('metal', 0.044, 0.01, 0.02, 0, 0.045, 0.07, { cor: PRETO });
      F.b('metal', 0.006, 0.016, 0.045, 0.028, 0.012, -0.05, { cor: CINZA_CLARO });
      // carregador curvo com nervuras
      for (let i = 0; i < 4; i++) {
        C.b('metal', 0.034, 0.055, 0.062, 0, -0.1 - i * 0.048, -0.12 + i * 0.016, { rx: 0.12 + i * 0.1, cor: CINZA });
        C.b('metal', 0.036, 0.006, 0.05, 0, -0.1 - i * 0.048, -0.12 + i * 0.016, { rx: 0.12 + i * 0.1, cor: PRETO });
      }
      C.b('metal', 0.038, 0.012, 0.066, 0, -0.29, -0.045, { rx: 0.5, cor: PRETO });
      C.b('metal', 0.012, 0.01, 0.04, 0, -0.058, -0.12, { cor: LATAO });
      maoE[1] = -0.05; maoE[2] = -0.38;
      break;
    }
    case 'escopeta': {
      A.b('corpo', 0.058, 0.068, 0.2, 0, 0.004, -0.06);
      A.b('metal', 0.004, 0.026, 0.06, 0.03, 0.01, -0.06, { cor: ESCURO, var: 0 });
      A.b('metal', 0.03, 0.006, 0.07, 0, -0.03, -0.08, { cor: ESCURO, var: 0 });
      A.t('metal', 0.016, 0.5, 0, 0.022, -0.41, { cor: CINZA });
      A.t('metal', 0.014, 0.42, 0, -0.022, -0.37, { cor: PRETO });
      A.b('metal', 0.006, 0.004, 0.46, 0, 0.042, -0.41, { cor: PRETO });
      for (let i = 0; i < 8; i++) A.b('metal', 0.004, 0.006, 0.004, 0, 0.038, -0.2 - i * 0.055, { cor: PRETO });
      A.b('metal', 0.04, 0.06, 0.02, 0, 0.0, -0.6, { cor: PRETO });
      A.e('brilho', 0.004, 0, 0.047, -0.64);
      gatilho(A, -0.0, -0.035);
      if (tier >= 2) {
        empunhadura(A, 0.03, -0.035, -0.3, 0.1);
        A.t('metal', 0.016, 0.12, 0, -0.005, 0.12, { cor: PRETO });
        A.b('polimero', 0.044, 0.09, 0.15, 0, -0.03, 0.2, { cor: PRETO });
        A.b('polimero', 0.05, 0.1, 0.02, 0, -0.03, 0.28, { cor: 0x101010 });
        otica(A, tier, 0.04, -0.06);
      } else {
        A.b('madeira', 0.042, 0.06, 0.12, 0, -0.03, 0.08, { rx: 0.25 });
        A.b('madeira', 0.046, 0.1, 0.2, 0, -0.06, 0.22, { rx: 0.08 });
        A.b('polimero', 0.05, 0.11, 0.02, 0, -0.065, 0.325, { cor: 0x2a1a10 });
      }
      // cartuchos na lateral
      if (tier >= 1) {
        A.b('polimero', 0.006, 0.05, 0.1, -0.032, 0.005, -0.06, { cor: PRETO });
        for (let i = 0; i < 4; i++) {
          A.c('polimero', 0.01, 0.045, -0.04, 0.005, -0.03 - i * 0.022, { cor: 0xa01a10, var: 0.05 });
          A.c('metal', 0.0105, 0.012, -0.04, -0.015, -0.03 - i * 0.022, { cor: LATAO });
        }
      }
      faixas(A, tier, 0.058, 0.025, 0.02, 0.17);
      if (tier >= 3) {
        A.t('metal', 0.022, 0.06, 0, 0.022, -0.69, { cor: PRETO });
        for (let k = 0; k < 4; k++) A.b('metal', 0.008, 0.02, 0.02, Math.cos(k * 1.57) * 0.022, 0.022 + Math.sin(k * 1.57) * 0.022, -0.725, { cor: PRETO });
        A.t('brilho', 0.0225, 0.006, 0, 0.022, -0.67);
        ponta = -0.74;
      } else ponta = -0.67;
      if (tier >= 4) A.t('brilho', 0.0045, 0.42, 0, -0.04, -0.37);
      // telha (pump) anima no tiro
      F.b(tier >= 2 ? 'polimero' : 'madeira', 0.054, 0.05, 0.15, 0, -0.02, -0.36, { cor: tier >= 2 ? PRETO : 0xffffff });
      for (let i = 0; i < 6; i++) F.b('polimero', 0.056, 0.006, 0.006, 0, -0.02 + (i % 2 ? 0.014 : -0.014), -0.31 - Math.floor(i / 2) * 0.04, { cor: 0x101010 });
      ferroCurso = 0.07;
      maoE[1] = -0.045; maoE[2] = -0.36; maoEnoFerrolho = true;
      break;
    }
    case 'sniper': {
      A.b('corpo', 0.056, 0.056, 0.26, 0, 0.004, -0.04);
      A.b('metal', 0.004, 0.02, 0.05, 0.03, 0.01, -0.02, { cor: ESCURO, var: 0 });
      A.b('corpo', 0.066, 0.06, 0.34, 0, -0.008, -0.34);
      fendas(A, 0.034, -0.008, -0.22, 7, 0.036, 0.006, 0.02, 0.022);
      A.t('metal', 0.011, 0.46, 0, 0.004, -0.72, { cor: CINZA });
      for (let i = 0; i < 4; i++) A.b('metal', 0.002, 0.024, 0.3, Math.cos(i * 1.57) * 0.01, 0.004 + Math.sin(i * 1.57) * 0.01, -0.72, { cor: ESCURO, var: 0 });
      A.t('metal', 0.02, 0.075, 0, 0.004, -0.98, { cor: PRETO });
      for (let i = 0; i < 4; i++) A.b('metal', 0.044, 0.008, 0.008, 0, 0.004, -0.955 - i * 0.015, { cor: ESCURO, var: 0 });
      ponta = -1.02;
      // luneta
      A.t('metal', 0.018, 0.28, 0, 0.075, -0.07, { cor: PRETO });
      A.t('metal', 0.027, 0.07, 0, 0.075, -0.24, { cor: PRETO });
      A.t('metal', 0.023, 0.06, 0, 0.075, 0.1, { cor: PRETO });
      A.t('vidro', 0.024, 0.004, 0, 0.075, -0.276);
      A.t('vidro', 0.02, 0.004, 0, 0.075, 0.131);
      A.c('metal', 0.012, 0.03, 0, 0.1, -0.07, { cor: CINZA });
      A.c('metal', 0.012, 0.03, 0.026, 0.075, -0.07, { cor: CINZA, rz: Math.PI / 2 });
      for (const z of [-0.14, 0.02]) { A.b('metal', 0.03, 0.05, 0.02, 0, 0.045, z, { cor: CINZA_CLARO }); }
      if (tier >= 2) A.t('brilho', 0.0275, 0.006, 0, 0.075, -0.215);
      if (tier >= 4) { A.t('brilho', 0.019, 0.004, 0, 0.075, -0.15); A.t('brilho', 0.019, 0.004, 0, 0.075, 0.0); }
      // bipé recolhido
      A.barra('metal', [0.015, -0.04, -0.42], [0.02, -0.04, -0.62], 0.01, 0.01, { cor: PRETO });
      A.barra('metal', [-0.015, -0.04, -0.42], [-0.02, -0.04, -0.62], 0.01, 0.01, { cor: PRETO });
      gatilho(A, -0.0, -0.025);
      empunhadura(A, 0.03, -0.025, -0.35, 0.1);
      A.b('corpo', 0.05, 0.11, 0.24, 0, -0.04, 0.2);
      A.b('corpo', 0.044, 0.035, 0.14, 0, 0.03, 0.2, { cor: 0xb0b0b0 });
      A.b('polimero', 0.054, 0.12, 0.024, 0, -0.04, 0.33, { cor: 0x101010 });
      A.barra('metal', [0, -0.09, 0.27], [0, -0.14, 0.27], 0.01, 0.01, { cor: PRETO });
      faixas(A, tier, 0.066, 0.016, -0.2, 0.3);
      // ferrolho
      F.barra('metal', [0.028, 0.012, 0.04], [0.07, 0.0, 0.05], 0.008, 0.008, { g: 'cil', cor: CINZA_CLARO });
      F.e('metal', 0.013, 0.074, -0.002, 0.052, { cor: PRETO });
      C.b('metal', 0.038, 0.06, 0.08, 0, -0.06, -0.06, { cor: CINZA });
      C.b('polimero', 0.042, 0.012, 0.084, 0, -0.092, -0.06, { cor: PRETO });
      maoE[1] = -0.06; maoE[2] = -0.32;
      ferroCurso = 0.04;
      break;
    }
    case 'metralhadora':
    default: {
      A.b('corpo', 0.076, 0.085, 0.33, 0, 0.0, -0.1);
      A.b('metal', 0.07, 0.02, 0.2, 0, 0.052, -0.08, { cor: PRETO });
      for (let i = 0; i < 6; i++) A.b('metal', 0.072, 0.006, 0.006, 0, 0.064, -0.0 - i * 0.03, { cor: CINZA });
      trilho(A, 0, 0.065, -0.2, -0.27);
      A.b('corpo', 0.052, 0.042, 0.22, 0, 0.026, -0.38, { cor: 0xb0b0b0 });
      for (let i = 0; i < 6; i++) A.b('metal', 0.054, 0.012, 0.02, 0, 0.03, -0.3 - i * 0.032, { cor: ESCURO, var: 0 });
      A.t('metal', 0.015, 0.34, 0, 0.0, -0.55, { cor: CINZA });
      A.t('metal', 0.02, 0.06, 0, 0.0, -0.75, { cor: PRETO });
      for (let i = 0; i < 4; i++) A.b('metal', 0.006, 0.042, 0.03, Math.cos(i * 0.785) * 0.012, Math.sin(i * 0.785) * 0.012, -0.75, { rz: i * 0.785, cor: ESCURO, var: 0 });
      ponta = -0.79;
      // alça de transporte
      A.barra('metal', [0, 0.07, -0.22], [0, 0.12, -0.24], 0.012, 0.012, { cor: PRETO });
      A.barra('metal', [0, 0.07, -0.36], [0, 0.12, -0.34], 0.012, 0.012, { cor: PRETO });
      A.b('polimero', 0.018, 0.018, 0.12, 0, 0.122, -0.29, { cor: PRETO });
      // bipé
      A.barra('metal', [0.012, -0.03, -0.55], [0.03, -0.05, -0.7], 0.01, 0.01, { cor: PRETO });
      A.barra('metal', [-0.012, -0.03, -0.55], [-0.03, -0.05, -0.7], 0.01, 0.01, { cor: PRETO });
      gatilho(A, -0.02, -0.042);
      empunhadura(A, 0.0, -0.042, -0.25, 0.11);
      // coronha esqueleto
      A.barra('metal', [0, 0.02, 0.06], [0, 0.0, 0.3], 0.016, 0.016, { g: 'cil', cor: PRETO });
      A.barra('metal', [0, -0.03, 0.06], [0, -0.06, 0.3], 0.016, 0.016, { g: 'cil', cor: PRETO });
      A.b('polimero', 0.052, 0.12, 0.022, 0, -0.025, 0.31, { cor: 0x101010 });
      if (tier < 2) { A.b('metal', 0.004, 0.02, 0.004, 0, 0.075, -0.45, { cor: PRETO }); } else otica(A, tier, 0.072, -0.05);
      faixas(A, tier, 0.076, 0.02, 0.0, 0.3);
      if (tier >= 4) { A.t('brilho', 0.004, 0.2, 0.027, 0.045, -0.38); A.t('brilho', 0.004, 0.2, -0.027, 0.045, -0.38); }
      // caixa de munição e cinta com balas
      C.b('polimero', 0.1, 0.12, 0.13, -0.035, -0.11, -0.12, { cor: tier >= 3 ? PRETO : 0x3a4030 });
      C.b('polimero', 0.104, 0.01, 0.134, -0.035, -0.05, -0.12, { cor: 0x101010 });
      for (let i = 0; i < 6; i++) {
        const t = i / 5;
        const x = -0.03 + t * 0.05, y = -0.045 + t * 0.06;
        C.c('metal', 0.006, 0.04, x, y, -0.12, { rz: Math.PI / 2, cor: LATAO });
        C.b('metal', 0.03, 0.008, 0.016, x - 0.005, y, -0.12, { cor: PRETO });
      }
      F.b('metal', 0.03, 0.014, 0.014, 0.05, 0.01, -0.12, { cor: PRETO });
      maoE[1] = -0.04; maoE[2] = -0.42;
      ferroCurso = 0.04;
      break;
    }
  }

  // Mítica: núcleo de energia e anéis girando no cano
  if (tier === 5) {
    const nucleo = new THREE.Mesh(GEOS.oct, mats.brilho);
    nucleo.scale.setScalar(0.03);
    nucleo.position.set(0.034, 0.0, arma.tipo === 'pistola' ? -0.05 : -0.08);
    g.add(nucleo);
    anim.push({ o: nucleo, tipo: 'pulsa', base: 0.03 });
    const nAneis = arma.tipo === 'pistola' ? 1 : 3;
    for (let i = 0; i < nAneis; i++) {
      const a = new THREE.Mesh(GEOS.anel, mats.brilho);
      const r = arma.tipo === 'pistola' ? 0.03 : 0.035;
      a.scale.set(r, r, r * 0.6);
      a.position.set(0, arma.tipo === 'escopeta' ? 0.022 : arma.tipo === 'fuzil' ? 0.012 : 0.004, ponta + 0.06 + i * 0.05);
      g.add(a);
      anim.push({ o: a, tipo: 'gira', fase: i });
    }
  }
  if (tier === 4) {
    // runas flutuando de lado
    const runa = new THREE.Mesh(GEOS.box, mats.brilho);
    runa.scale.set(0.004, 0.03, 0.03);
    runa.position.set(0.05, 0.02, -0.15);
    g.add(runa);
    anim.push({ o: runa, tipo: 'flutua' });
  }

  A.malhas(mats, g);
  const ferrolho = F.malhas(mats);
  g.add(ferrolho);
  const carregador = C.malhas(mats);
  g.add(carregador);

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, arma.tipo === 'escopeta' ? 0.022 : arma.tipo === 'fuzil' ? 0.012 : arma.tipo === 'pistola' ? 0.022 : 0.004, ponta - 0.01);
  g.add(muzzle);

  if (opcoes.maos) {
    const maos = criarMaos(arma.tipo, maoE);
    g.add(maos.direita);
    (maoEnoFerrolho ? ferrolho : g).add(maos.esquerda);
  }

  const MIRA = { pistola: [0.045, 0.056], submetralhadora: [0.058, 0.074], fuzil: [0.08, 0.085], escopeta: [0.047, 0.075], sniper: [0.075, 0.075], metralhadora: [0.08, 0.107] };
  const miraY = (MIRA[arma.tipo] || [0.08, 0.08])[tier >= 2 ? 1 : 0];
  g.userData = {
    muzzle, comprimento: Math.abs(ponta), ferrolho, carregador, ferroCurso, miraY,
    animar(t) {
      for (const a of anim) {
        if (a.tipo === 'pulsa') { a.o.scale.setScalar(a.base * (1 + Math.sin(t * 6) * 0.3)); a.o.rotation.y = t * 2; }
        if (a.tipo === 'gira') { a.o.rotation.z = t * (2 + a.fase) * (a.fase % 2 ? -1 : 1); a.o.position.y += Math.sin(t * 3 + a.fase) * 0.00005; }
        if (a.tipo === 'flutua') { a.o.position.y = 0.02 + Math.sin(t * 2) * 0.01; a.o.rotation.x = t; }
      }
      mats.brilho.emissiveIntensity = INT_BRILHO[tier] * (1 + Math.sin(t * 3) * 0.15);
    },
  };
  return g;
}

// mãos com luva e mangas (só em primeira pessoa)
const matLuva = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.85, metalness: 0.05 });
const matManga = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.95, metalness: 0 });
function criarMaos(tipo, maoE) {
  matManga.map = texTecido(); matManga.userData.uvEsc = 9;
  const D = montador(), E = montador();
  const LUVA = 0x262422, NODOS = 0x3a3834, MANGA = 0xffffff, PUNHO = 0x1a1a1a;
  // mão direita no punho
  D.b('luva', 0.05, 0.065, 0.075, 0.0, -0.065, 0.03, { rx: -0.25, cor: LUVA });
  for (let i = 0; i < 4; i++) D.b('luva', 0.052, 0.016, 0.02, 0.0, -0.045 - i * 0.02, -0.012 + i * 0.004, { rx: -0.25, cor: i % 2 ? LUVA : NODOS });
  D.b('luva', 0.02, 0.016, 0.05, 0.028, -0.02, 0.0, { ry: 0.2, cor: LUVA }); // polegar
  D.b('luva', 0.016, 0.016, 0.04, -0.024, -0.04, -0.02, { cor: LUVA });     // indicador no gatilho
  D.b('luva', 0.056, 0.04, 0.05, 0.0, -0.1, 0.075, { rx: -0.4, cor: PUNHO }); // punho do casaco
  D.barra('manga', [0.0, -0.1, 0.08], [0.07, -0.3, 0.42], 0.075, 0.08, { cor: MANGA });
  D.barra('manga', [0.07, -0.3, 0.42], [0.1, -0.42, 0.7], 0.09, 0.095, { cor: 0xd8d8d8 });
  // mão esquerda segurando o guarda-mão
  const [lx, ly, lz] = maoE;
  if (tipo === 'pistola') {
    E.b('luva', 0.05, 0.06, 0.07, lx - 0.02, ly + 0.005, lz + 0.03, { rz: 0.3, cor: LUVA });
    for (let i = 0; i < 3; i++) E.b('luva', 0.05, 0.016, 0.02, lx + 0.012, ly - 0.0 - i * 0.02, lz - 0.01, { cor: NODOS });
    E.barra('manga', [lx - 0.03, ly - 0.02, lz + 0.07], [lx - 0.15, ly - 0.25, lz + 0.38], 0.075, 0.08, { cor: MANGA });
  } else {
    E.b('luva', 0.06, 0.03, 0.08, lx, ly - 0.005, lz, { cor: LUVA });
    for (let i = 0; i < 4; i++) E.b('luva', 0.018, 0.04, 0.018, lx + 0.03, ly + 0.02, lz - 0.03 + i * 0.02, { cor: i % 2 ? NODOS : LUVA });
    E.b('luva', 0.018, 0.035, 0.05, lx - 0.032, ly + 0.02, lz + 0.01, { cor: LUVA });
    E.b('luva', 0.06, 0.045, 0.05, lx - 0.02, ly - 0.035, lz + 0.05, { rx: -0.6, cor: PUNHO });
    E.barra('manga', [lx - 0.02, ly - 0.04, lz + 0.06], [lx - 0.17, ly - 0.24, lz + 0.42], 0.075, 0.08, { cor: MANGA });
    E.barra('manga', [lx - 0.17, ly - 0.24, lz + 0.42], [lx - 0.26, ly - 0.36, lz + 0.72], 0.09, 0.095, { cor: 0xd8d8d8 });
  }
  const mats = { luva: matLuva, manga: matManga };
  return { direita: D.malhas(mats), esquerda: E.malhas(mats) };
}

// ======================================================================= ZUMBIS
const ROUPAS = [0x4a5a7a, 0x7a3a3a, 0x3a5a3a, 0x6a6a5a, 0x2a2a2a, 0x7a6a4a, 0x5a3a6a, 0x8a8a8a, 0x2a4a6a, 0x9a8a6a, 0x6a2a4a];
const CALCAS = [0x2a3040, 0x3a3a3a, 0x4a4030, 0x1e2a3a, 0x5a4a3a, 0x2a2a2a];
const SANGUE = 0x5a0808, SANGUE2 = 0x3a0404, OSSO = 0xd8d0b8, BURACO = 0x140606;

const VISUAL = {
  // largura do tronco, magreza, tipo de roupa...
  errante: { lw: 0.46 }, corredor: { lw: 0.4, descalco: true, rasgado: 0.8, magro: true },
  rastejante: { lw: 0.44, semPernas: true, rasgado: 0.7 }, cuspidor: { lw: 0.46, sacos: 0x9cff3a },
  inchado: { lw: 0.6, barriga: 1, pustulas: 0xd0d040 }, toxico: { lw: 0.56, barriga: 0.6, pustulas: 0x9cff3a, mascara: true, roupa: 0x8a9a20, calca: 0x6a7a18 },
  blindado: { lw: 0.48, militar: true, roupa: 0x4a5236, calca: 0x3e4630 }, escudeiro: { lw: 0.48, policia: true, roupa: 0x1a2232, calca: 0x161c28 },
  gritador: { lw: 0.38, magro: true, bocao: true, rasgado: 0.6 }, espectro: { lw: 0.42, magro: true, avental: true, roupa: 0x8aaab8, calca: 0x6a8a98 },
  bruto: { lw: 0.62, forte: true, rasgado: 0.9 },
  acougueiro: { lw: 0.66, forte: true, barriga: 0.8, avental: true, roupa: 0xb0a898, calca: 0x2a2420, capuz: true },
  chefe: { lw: 0.6, forte: true, mutante: true, rasgado: 1, roupa: 0x3a0a14, calca: 0x2a0a10 },
  colosso: { lw: 0.66, forte: true, armadura: true, roupa: 0x2a2e28, calca: 0x22251f },
  rainha: { lw: 0.44, magro: true, garras: true, asas: true, coroa: true, roupa: 0x2a0a30, calca: 0x1a0620 },
};

function variaCor(hex, v) {
  const c = new THREE.Color(hex);
  c.offsetHSL(rand(-0.02, 0.02), rand(-0.08, 0.08), rand(-v, v));
  return c.getHex();
}

export function criarZumbi(tipo, opcoes = {}) {
  const def = ZUMBIS[tipo];
  const V = VISUAL[tipo] || {};
  const transp = tipo === 'espectro';
  const matCorpo = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, transparent: transp });
  const matMetal = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true, transparent: transp });
  const matBrilho = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
  const mats = { c: matCorpo, m: matMetal, b: matBrilho };
  const ud = { mats: [matCorpo, matMetal], olhoMat: matBrilho };

  const PELE = variaCor(def.pele, 0.06), PELE2 = new THREE.Color(PELE).multiplyScalar(0.75).getHex();
  const ROUPA = V.roupa ? variaCor(V.roupa, 0.04) : escolher(ROUPAS), ROUPA2 = new THREE.Color(ROUPA).multiplyScalar(0.7).getHex();
  const CALCA = V.calca ? variaCor(V.calca, 0.04) : escolher(CALCAS);
  const OLHO = opcoes.elite ? 0xffd040 : def.olho;
  const lw = V.lw || 0.46, prof = 0.24 + (V.barriga || 0) * 0.18;
  const rasg = V.rasgado ?? rand(0.2, 0.6);

  const g = new THREE.Group();
  const corpo = new THREE.Group();
  g.add(corpo);

  // ---------------- tronco
  const T = montador();
  T.b('c', lw * 0.74, 0.2, 0.22, 0, 0.93, 0, { cor: CALCA });
  T.b('c', lw * 0.76, 0.04, 0.23, 0, 1.02, 0, { cor: 0x2a1e14 });
  T.b('m', 0.04, 0.03, 0.01, 0, 1.02, -0.118, { cor: 0x8a8a80 });
  if (V.barriga) T.e('c', 0.5, 0, 1.13, -0.06, { w: lw * 1.05, h: 0.38 + V.barriga * 0.12, d: prof + 0.12, cor: ROUPA });
  else T.b('c', lw * 0.7, 0.22, prof * 0.85, 0, 1.13, 0, { cor: ROUPA });
  T.b('c', lw, 0.3, prof, 0, 1.33, 0, { cor: ROUPA });
  T.b('c', lw * 0.92, 0.08, prof * 0.9, 0, 1.49, 0, { cor: ROUPA });
  T.b('c', 0.12, 0.1, 0.12, 0, 1.55, 0, { cor: PELE });
  if (V.forte) {
    T.b('c', lw * 0.45, 0.2, 0.08, -lw * 0.22, 1.36, -prof / 2 - 0.02, { cor: PELE }); // peitoral
    T.b('c', lw * 0.45, 0.2, 0.08, lw * 0.22, 1.36, -prof / 2 - 0.02, { cor: PELE });
    T.b('c', lw * 1.1, 0.14, prof * 0.95, 0, 1.47, 0, { cor: PELE });
  }
  // roupa rasgada: barra irregular, buracos mostrando a pele, manchas de sangue
  for (let x = -lw / 2 + 0.03; x < lw / 2; x += 0.06) {
    if (Math.random() < rasg) T.b('c', 0.055, rand(0.03, 0.1), 0.02, x, 1.0 - rand(0, 0.04), -prof * 0.43, { cor: ROUPA2 });
    if (Math.random() < rasg) T.b('c', 0.055, rand(0.03, 0.08), 0.02, x, 1.0 - rand(0, 0.03), prof * 0.43, { cor: ROUPA2 });
  }
  for (let i = 0; i < 2 + Math.floor(rasg * 4); i++) {
    T.b('c', rand(0.05, 0.1), rand(0.04, 0.08), 0.01, rand(-lw * 0.35, lw * 0.35), rand(1.08, 1.42), -prof / 2 - 0.004, { cor: Math.random() < 0.5 ? PELE : SANGUE });
  }
  for (let i = 0; i < 5; i++) T.b('c', rand(0.02, 0.07), rand(0.02, 0.09), 0.01, rand(-lw * 0.4, lw * 0.4), rand(1.05, 1.45), -prof / 2 - 0.006, { cor: Math.random() < 0.6 ? SANGUE : SANGUE2 });
  if (Math.random() < 0.35 || V.forte || tipo === 'gritador') {
    // costelas expostas
    const lado = Math.random() < 0.5 ? -1 : 1;
    T.b('c', 0.14, 0.16, 0.01, lado * lw * 0.2, 1.3, -prof / 2 - 0.007, { cor: SANGUE2 });
    for (let k = 0; k < 4; k++) T.b('c', 0.13, 0.014, 0.012, lado * lw * 0.2, 1.24 + k * 0.04, -prof / 2 - 0.012, { cor: OSSO, rz: lado * 0.15 });
  }
  if (Math.random() < 0.4 && !V.militar && !V.policia) {
    // jaqueta aberta
    const jaq = variaCor(escolher([0x3a2a1a, 0x1a2a3a, 0x2a2a2a, 0x4a3a2a]), 0.05);
    T.b('c', lw * 0.28, 0.5, 0.03, -lw * 0.38, 1.24, -prof / 2 - 0.012, { cor: jaq });
    T.b('c', lw * 0.28, 0.5, 0.03, lw * 0.38, 1.24, -prof / 2 - 0.012, { cor: jaq });
    T.b('c', lw + 0.04, 0.5, 0.03, 0, 1.24, prof / 2 + 0.012, { cor: jaq });
  }
  if (V.avental) {
    T.b('c', lw * 0.85, 0.75, 0.02, 0, 1.08, -prof / 2 - 0.03, { cor: tipo === 'espectro' ? 0x8aa0a8 : 0x8a8070 });
    for (let i = 0; i < 10; i++) T.b('c', rand(0.04, 0.16), rand(0.05, 0.24), 0.01, rand(-lw * 0.38, lw * 0.38), rand(0.75, 1.4), -prof / 2 - 0.042, { cor: Math.random() < 0.5 ? SANGUE : SANGUE2 });
    if (tipo === 'acougueiro') for (const x of [-0.18, 0.18]) { T.c('m', 0.008, 0.08, x, 0.96, -prof / 2 - 0.02, { cor: 0x9a9aa0 }); T.g('m', 'anel', 0.05, 0.05, 0.03, x, 0.9, -prof / 2 - 0.02, { cor: 0x9a9aa0 }); }
  }
  if (V.militar || V.policia) {
    // coldre, bolsos, rádio
    T.b('c', 0.08, 0.12, 0.06, lw * 0.42, 0.95, 0, { cor: 0x1a1a1a });
    T.b('c', 0.05, 0.08, 0.03, -lw * 0.3, 1.4, -prof / 2 - 0.02, { cor: 0x1a1a1a });
  }
  const B = montador(); // partes que brilham (olhos, pústulas)
  if (V.pustulas || V.sacos) {
    for (let i = 0; i < 9; i++) {
      const r = rand(0.03, 0.07);
      B.e('b', r, rand(-lw * 0.45, lw * 0.45), rand(0.95, 1.45), -prof / 2 - r * 0.4 + rand(-0.02, 0.02), { cor: V.pustulas || V.sacos });
    }
  }
  if (V.mutante) {
    for (let i = 0; i < 6; i++) T.e('c', rand(0.06, 0.12), rand(-lw * 0.5, lw * 0.5), rand(1.0, 1.5), rand(-0.1, 0.15), { cor: 0x8a2a3a });
    for (let i = 0; i < 5; i++) T.g('c', 'cone', 0.05, rand(0.18, 0.3), 0.05, rand(-0.12, 0.12), 1.35 + i * 0.03, prof / 2 + 0.05, { rx: 0.9, cor: OSSO });
    for (let i = 0; i < 6; i++) B.b('b', 0.01, rand(0.1, 0.25), 0.01, rand(-lw * 0.4, lw * 0.4), rand(1.0, 1.4), -prof / 2 - 0.008, { rz: rand(-0.6, 0.6), cor: 0xff2040 });
  }
  if (tipo === 'bruto') for (const s of [-1, 1]) T.g('c', 'cone', 0.06, 0.25, 0.06, s * lw * 0.5, 1.58, 0.02, { rz: -s * 0.6, cor: OSSO });
  if (opcoes.elite) {
    T.b('c', lw + 0.02, 0.025, prof + 0.02, 0, 1.2, 0, { cor: 0xd4a52a });
  }
  T.malhas(mats, corpo);

  // placas de armadura (podem quebrar)
  if (tipo === 'blindado' || tipo === 'colosso' || tipo === 'escudeiro') {
    const P = montador();
    const MET = tipo === 'blindado' ? 0x4a5236 : tipo === 'escudeiro' ? 0x1e2430 : 0x4a5048;
    const esc = tipo === 'colosso' ? 1.15 : 1;
    P.b('m', (lw + 0.08) * esc, 0.42, 0.06, 0, 1.25, -prof / 2 - 0.04, { cor: MET });
    P.b('m', (lw + 0.08) * esc, 0.42, 0.06, 0, 1.25, prof / 2 + 0.04, { cor: MET });
    P.b('m', 0.06, 0.38, prof + 0.1, -(lw / 2 + 0.05) * esc, 1.25, 0, { cor: MET });
    P.b('m', 0.06, 0.38, prof + 0.1, (lw / 2 + 0.05) * esc, 1.25, 0, { cor: MET });
    for (let i = 0; i < 3; i++) P.b('m', 0.08, 0.1, 0.05, -lw * 0.3 + i * lw * 0.3, 1.1, -prof / 2 - 0.09, { cor: new THREE.Color(MET).multiplyScalar(0.8).getHex() }); // bolsos
    P.b('m', 0.2, 0.04, 0.12, -lw / 2 - 0.05, 1.5, 0, { cor: MET, rz: 0.3 });
    P.b('m', 0.2, 0.04, 0.12, lw / 2 + 0.05, 1.5, 0, { cor: MET, rz: -0.3 });
    if (tipo === 'escudeiro') P.b('m', 0.2, 0.05, 0.02, 0, 1.35, -prof / 2 - 0.075, { cor: 0xd0d0d0 });
    if (tipo === 'colosso') {
      for (let i = 0; i < 6; i++) P.c('m', 0.012, 0.012, rand(-0.2, 0.2), rand(1.1, 1.4), -prof / 2 - 0.075, { rx: 1.57, cor: 0x8a8a80 }); // rebites
      P.barra('m', [-0.15, 1.45, prof / 2 + 0.07], [-0.25, 1.05, prof / 2 + 0.07], 0.03, 0.03, { g: 'cil', cor: 0x2a2a2a });
      P.barra('m', [0.15, 1.45, prof / 2 + 0.07], [0.25, 1.05, prof / 2 + 0.07], 0.03, 0.03, { g: 'cil', cor: 0x2a2a2a });
    }
    ud.placas = P.malhas(mats);
    corpo.add(ud.placas);
  }
  if (tipo === 'colosso') {
    const N = montador();
    N.g('b', 'oct', 0.2, 0.26, 0.12, 0, 1.25, prof / 2 + 0.12, { cor: 0xffa000 });
    N.b('m', 0.28, 0.04, 0.06, 0, 1.4, prof / 2 + 0.1, { cor: 0x2a2a2a });
    N.b('m', 0.28, 0.04, 0.06, 0, 1.1, prof / 2 + 0.1, { cor: 0x2a2a2a });
    ud.nucleo = N.malhas(mats);
    corpo.add(ud.nucleo);
  }

  // ---------------- cabeça
  const cabeca = new THREE.Group();
  cabeca.position.set(0, 1.58, 0);
  const H = montador();
  const largCab = tipo === 'gritador' ? 0.28 : 0.25;
  H.b('c', largCab, 0.27, 0.26, 0, 0.15, 0, { cor: PELE });
  H.b('c', largCab - 0.01, 0.03, 0.04, 0, 0.215, -0.122, { cor: PELE2 });
  H.b('c', 0.07, 0.045, 0.02, -0.055, 0.16, -0.128, { cor: BURACO, var: 0 });
  H.b('c', 0.07, 0.045, 0.02, 0.055, 0.16, -0.128, { cor: BURACO, var: 0 });
  H.b('c', 0.04, 0.05, 0.04, 0, 0.115, -0.14, { cor: Math.random() < 0.3 ? BURACO : PELE2 });
  H.b('c', 0.05, 0.03, 0.03, -0.085, 0.1, -0.12, { cor: PELE2 });
  H.b('c', 0.05, 0.03, 0.03, 0.085, 0.1, -0.12, { cor: PELE2 });
  H.b('c', 0.02, 0.06, 0.04, -largCab / 2 - 0.008, 0.14, 0.0, { cor: PELE2 });
  H.b('c', 0.02, 0.06, 0.04, largCab / 2 + 0.008, 0.14, 0.0, { cor: PELE2 });
  for (let i = 0; i < 5; i++) H.b('c', 0.018, 0.022, 0.01, -0.044 + i * 0.022, 0.055, -0.128, { cor: 0xc8c0a0, var: 0.15 });
  // cabelo
  const estilo = V.capuz || V.militar || V.policia || V.armadura ? 0 : Math.floor(rand(0, 4));
  const CAB = escolher([0x1a1410, 0x3a2a1a, 0x5a4a3a, 0x8a8a80, 0x2a1a10]);
  if (estilo === 1) for (let i = 0; i < 10; i++) H.b('c', rand(0.04, 0.08), rand(0.03, 0.06), rand(0.04, 0.08), rand(-0.1, 0.1), rand(0.27, 0.3), rand(-0.1, 0.1), { cor: CAB });
  if (estilo === 2) { H.b('c', largCab + 0.02, 0.06, 0.28, 0, 0.28, 0.01, { cor: CAB }); for (let i = 0; i < 8; i++) H.b('c', 0.03, rand(0.1, 0.25), 0.03, rand(-0.12, 0.12), rand(0.12, 0.2), 0.13, { cor: CAB }); }
  if (estilo === 3) H.b('c', largCab * 0.5, 0.04, 0.2, 0, 0.29, 0.02, { cor: CAB });
  // ferida na cabeça / crânio exposto
  if (Math.random() < 0.35) { H.b('c', 0.08, 0.06, 0.02, rand(-0.06, 0.06), 0.24, -0.11, { cor: SANGUE }); H.b('c', 0.05, 0.04, 0.02, rand(-0.06, 0.06), 0.26, -0.105, { cor: OSSO }); }
  // capacetes, capuz, máscara
  if (V.militar) {
    const capacete = montador();
    capacete.b('m', 0.3, 0.12, 0.31, 0, 0.27, 0.0, { cor: 0x3e4630 });
    capacete.b('m', 0.32, 0.03, 0.33, 0, 0.21, 0.0, { cor: 0x3e4630 });
    capacete.b('m', 0.18, 0.04, 0.03, 0, 0.27, -0.16, { cor: 0x1a1a1a });
    capacete.b('m', 0.07, 0.035, 0.02, -0.04, 0.27, -0.175, { cor: 0x40a0c0 });
    capacete.b('m', 0.07, 0.035, 0.02, 0.04, 0.27, -0.175, { cor: 0x40a0c0 });
    ud.capacete = capacete.malhas(mats);
  }
  if (V.policia) {
    const capacete = montador();
    capacete.b('m', 0.31, 0.15, 0.31, 0, 0.26, 0.0, { cor: 0x1a1e28 });
    capacete.b('m', 0.29, 0.12, 0.02, 0, 0.12, -0.16, { cor: 0x506878 });
    capacete.b('m', 0.32, 0.03, 0.32, 0, 0.19, 0, { cor: 0x101418 });
    ud.capacete = capacete.malhas(mats);
  }
  if (V.armadura) {
    H.b('m', 0.32, 0.3, 0.32, 0, 0.16, 0, { cor: 0x3a3e38 });
    H.b('m', 0.24, 0.05, 0.02, 0, 0.17, -0.165, { cor: 0x101010 });
    B.b('b', 0.2, 0.02, 0.01, 0, 1.58 + 0.17, -0.172, { cor: 0xffa000 });
  }
  if (V.capuz) {
    H.b('c', 0.29, 0.3, 0.29, 0, 0.16, 0.0, { cor: 0x3a2a1a });
    for (let i = 0; i < 4; i++) H.b('c', 0.003, 0.2, 0.004, -0.09 + i * 0.06, 0.16, -0.147, { cor: 0x1a1008 });
  }
  if (V.mascara) {
    H.b('m', 0.2, 0.14, 0.04, 0, 0.11, -0.14, { cor: 0x2a2a2a });
    H.c('m', 0.035, 0.05, 0, 0.06, -0.18, { rx: 1.57, cor: 0x4a4a40 });
    H.b('m', 0.06, 0.04, 0.01, -0.055, 0.16, -0.158, { cor: 0x3a5a3a });
    H.b('m', 0.06, 0.04, 0.01, 0.055, 0.16, -0.158, { cor: 0x3a5a3a });
  }
  if (V.coroa || opcoes.elite) {
    const cor = opcoes.elite ? 0xffd040 : 0xff40ff;
    B.b('b', 0.28, 0.03, 0.28, 0, 1.58 + 0.3, 0, { cor });
    for (let i = 0; i < 5; i++) B.g('b', 'cone', 0.04, 0.12 + (i === 2 ? 0.08 : 0), 0.04, -0.1 + i * 0.05, 1.58 + 0.37 + (i === 2 ? 0.04 : 0), -0.12, { cor });
  }
  if (tipo === 'chefe') for (let i = 0; i < 4; i++) B.b('b', 0.022, 0.016, 0.01, rand(-0.09, 0.09), 1.58 + rand(0.2, 0.26), -0.126, { cor: 0xff0030 });
  H.malhas(mats, cabeca);
  if (ud.capacete) cabeca.add(ud.capacete);
  // olhos brilhando
  const olhos = montador();
  olhos.b('b', 0.032, 0.022, 0.01, -0.055, 0.158, -0.137, { cor: OLHO, var: 0 });
  olhos.b('b', 0.032, 0.022, 0.01, 0.055, 0.158, -0.137, { cor: OLHO, var: 0 });
  if (!V.armadura) olhos.malhas(mats, cabeca);
  // mandíbula
  const mandibula = new THREE.Group();
  mandibula.position.set(0, 0.065, -0.02);
  const J = montador();
  const bocao = V.bocao ? 1.6 : 1;
  J.b('c', 0.2, 0.06 * bocao, 0.2, 0, -0.03 * bocao, -0.03, { cor: PELE });
  J.b('c', 0.18, 0.02, 0.02, 0, -0.005, -0.125, { cor: BURACO });
  for (let i = 0; i < 4; i++) J.b('c', 0.018, 0.02, 0.01, -0.033 + i * 0.022, 0.005, -0.126, { cor: 0xc8c0a0, var: 0.15 });
  if (V.sacos) B.b('b', 0.04, 0.06, 0.01, 0, 1.58 + 0.065 - 0.08, -0.15, { cor: 0x9cff3a });
  if (!V.mascara && !V.armadura) { J.malhas(mats, mandibula); cabeca.add(mandibula); }
  cabeca.rotation.z = rand(-0.2, 0.2);
  corpo.add(cabeca);

  // ---------------- braços (ombro -> cotovelo -> mão)
  function braco(lado) {
    const ombro = new THREE.Group();
    ombro.position.set(lado * (lw / 2 + 0.07), 1.45, 0);
    const forte = V.forte ? 1.7 : V.magro ? 0.85 : 1;
    const comp = V.garras ? 1.35 : 1;
    const U = montador();
    const manga = !V.forte && Math.random() > 0.3 * rasg;
    U.b('c', 0.11 * forte, 0.3 * comp, 0.12 * forte, 0, -0.15 * comp, 0, { cor: manga ? ROUPA : PELE });
    if (manga) for (let i = 0; i < 4; i++) U.b('c', 0.035 * forte, rand(0.03, 0.07), 0.035, rand(-0.04, 0.04) * forte, -0.29 * comp, rand(-0.04, 0.04), { cor: ROUPA2 });
    if (Math.random() < 0.4) U.b('c', 0.04, 0.06, 0.12 * forte + 0.004, lado * 0.02, -0.18, 0, { cor: SANGUE });
    if (tipo === 'colosso' || (tipo === 'escudeiro')) U.b('m', 0.14 * forte, 0.16, 0.15 * forte, 0, -0.08, 0, { cor: tipo === 'colosso' ? 0x4a5048 : 0x1e2430 });
    U.malhas(mats, ombro);
    const cotovelo = new THREE.Group();
    cotovelo.position.y = -0.3 * comp;
    const F = montador();
    F.b('c', 0.095 * forte, 0.27 * comp, 0.1 * forte, 0, -0.135 * comp, 0, { cor: PELE });
    for (let i = 0; i < 3; i++) F.b('c', 0.004, rand(0.06, 0.12), 0.004, rand(-0.03, 0.03), -rand(0.05, 0.2), -0.05 * forte, { cor: 0x3a2a4a }); // veias
    if (Math.random() < 0.3) { F.b('c', 0.05, 0.05, 0.102 * forte, 0, -0.12, 0, { cor: SANGUE }); F.b('c', 0.02, 0.06, 0.104 * forte, 0, -0.12, 0, { cor: OSSO }); }
    const hy = -0.29 * comp;
    F.b('c', 0.1 * forte, 0.1, 0.05 * forte, 0, hy - 0.02, -0.005, { cor: PELE2 });
    for (let i = 0; i < 4; i++) {
      const garra = V.garras ? 2.2 : 1;
      F.b('c', 0.018 * forte, 0.075 * garra, 0.02, -0.033 * forte + i * 0.022 * forte, hy - 0.1 - 0.02 * garra, -0.015, { rx: -0.35, cor: PELE });
      F.b('c', 0.016 * forte, 0.016, 0.018, -0.033 * forte + i * 0.022 * forte, hy - 0.14 - 0.06 * (garra - 1), -0.03, { rx: -0.35, cor: V.garras ? OSSO : 0x2a2020 });
    }
    F.b('c', 0.02, 0.06, 0.02, lado * 0.05 * forte, hy - 0.06, -0.02, { rz: lado * 0.4, cor: PELE });
    if (tipo === 'acougueiro' && lado === 1) {
      F.b('c', 0.04, 0.04, 0.22, 0, hy - 0.08, -0.08, { cor: 0x3a2010 });
      F.b('m', 0.025, 0.24, 0.32, 0, hy - 0.16, -0.32, { cor: 0xb0b8c0 });
      F.b('c', 0.026, 0.08, 0.1, 0, hy - 0.14, -0.38, { cor: SANGUE });
    }
    if (tipo === 'colosso') F.b('m', 0.12 * forte, 0.2, 0.12 * forte, 0, -0.12, 0, { cor: 0x4a5048 });
    F.malhas(mats, cotovelo);
    ombro.add(cotovelo);
    corpo.add(ombro);
    return [ombro, cotovelo];
  }
  const [bracoE, antE] = braco(-1);
  const [bracoD, antD] = braco(1);

  // ---------------- pernas (quadril -> joelho -> pé)
  function perna(lado) {
    const quadril = new THREE.Group();
    quadril.position.set(lado * 0.1, 0.92, 0);
    const forte = V.forte ? 1.35 : V.magro ? 0.85 : 1;
    const U = montador();
    U.b('c', 0.15 * forte, 0.42, 0.16 * forte, 0, -0.21, 0, { cor: CALCA });
    if (Math.random() < rasg) U.b('c', 0.1, 0.1, 0.162 * forte, 0, -0.36, -0.002, { cor: PELE });
    if (Math.random() < 0.5) U.b('c', 0.06, 0.12, 0.163 * forte, lado * 0.02, -0.2, 0, { cor: SANGUE2 });
    if (V.militar || V.policia) U.b('m', 0.06, 0.08, 0.06, lado * 0.08 * forte, -0.22, 0, { cor: 0x1a1a1a });
    U.malhas(mats, quadril);
    const joelho = new THREE.Group();
    joelho.position.y = -0.42;
    if (!V.semPernas) {
      const S = montador();
      S.b('c', 0.13 * forte, 0.38, 0.14 * forte, 0, -0.19, 0, { cor: CALCA });
      if (V.militar || V.policia) S.b('m', 0.14 * forte, 0.1, 0.06, 0, -0.04, -0.07 * forte, { cor: 0x1a1a1a });
      if (V.descalco || Math.random() < 0.15) {
        S.b('c', 0.12, 0.06, 0.22, 0, -0.42, -0.04, { cor: PELE2 });
        for (let i = 0; i < 4; i++) S.b('c', 0.022, 0.03, 0.03, -0.04 + i * 0.026, -0.43, -0.16, { cor: PELE2 });
      } else {
        const SAP = V.militar ? 0x2a2418 : V.policia ? 0x101010 : escolher([0x2a2018, 0x101010, 0x5a5a5a, 0x7a2a1a]);
        S.b('c', 0.14 * forte, 0.08, 0.27, 0, -0.42, -0.04, { cor: SAP });
        S.b('c', 0.145 * forte, 0.02, 0.28, 0, -0.455, -0.04, { cor: 0x8a8070 });
        for (let i = 0; i < 3; i++) S.b('c', 0.08, 0.008, 0.012, 0, -0.38, -0.08 - i * 0.03, { cor: 0xb0a890 });
      }
      S.malhas(mats, joelho);
    } else {
      // coto ensanguentado
      const S = montador();
      S.b('c', 0.13, 0.08, 0.14, 0, -0.02, 0, { cor: SANGUE });
      S.b('c', 0.04, 0.05, 0.04, 0, -0.07, 0, { cor: OSSO });
      S.malhas(mats, joelho);
    }
    quadril.add(joelho);
    corpo.add(quadril);
    return [quadril, joelho];
  }
  const [pernaE, canE] = perna(-1);
  const [pernaD, canD] = perna(1);

  if (B.grupos.b) B.malhas(mats, corpo);

  // escudo antimotim com texto
  if (tipo === 'escudeiro') {
    const tex = canvasTex(128, 192, (c, w, h) => {
      c.fillStyle = '#1a2028'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(120,160,200,0.35)'; c.fillRect(14, 20, w - 28, 50);
      c.strokeStyle = '#3a4048'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#e8e8e8'; c.font = 'bold 26px Impact, sans-serif'; c.textAlign = 'center'; c.fillText('POLÍCIA', w / 2, 120);
      for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`; c.fillRect(Math.random() * w, Math.random() * h, rand(4, 20), 1); }
      c.fillStyle = 'rgba(90,0,0,0.7)'; for (let i = 0; i < 6; i++) { c.beginPath(); c.arc(rand(10, 118), rand(80, 180), rand(3, 10), 0, 7); c.fill(); }
    }, false);
    const escudo = new THREE.Group();
    const placa = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.25, 0.05), [matMetal, matMetal, matMetal, matMetal, new THREE.MeshLambertMaterial({ color: 0x1a2028 }), new THREE.MeshLambertMaterial({ map: tex })]);
    escudo.add(placa);
    escudo.position.set(0.05, 1.0, -0.47);
    corpo.add(escudo);
    ud.escudo = escudo;
    ud.mats.push(placa.material[4], placa.material[5]);
  }
  if (V.asas) {
    for (const lado of [-1, 1]) {
      const forma = new THREE.Shape();
      forma.moveTo(0, 0); forma.lineTo(lado * 0.9, 0.5); forma.lineTo(lado * 1.2, -0.2); forma.lineTo(lado * 0.8, -0.1); forma.lineTo(lado * 0.9, -0.6); forma.lineTo(lado * 0.4, -0.3); forma.lineTo(lado * 0.3, -0.8); forma.lineTo(0, -0.2);
      const asa = new THREE.Mesh(new THREE.ShapeGeometry(forma), new THREE.MeshLambertMaterial({ color: 0x4a1a5a, emissive: 0x200828, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
      asa.position.set(lado * 0.1, 1.45, prof / 2 + 0.05);
      asa.rotation.y = lado * 0.4;
      corpo.add(asa);
      ud.mats.push(asa.material);
      (ud.asas ||= []).push(asa);
    }
  }

  g.scale.setScalar(def.escala * (def.boss ? 1 : 0.95 + Math.random() * 0.1) * (opcoes.elite ? 1.15 : 1));
  Object.assign(ud, { corpo, cabeca, mandibula, bracoE, bracoD, antE, antD, pernaE, pernaD, canE, canD, pele: matCorpo });
  g.userData = ud;
  return g;
}

// ======================================================================= FACÃO E TORRETA
export function criarFacao() {
  const A = montador();
  A.b('c', 0.034, 0.036, 0.13, 0, 0, 0.02, { cor: 0x2a1a10 });
  for (let i = 0; i < 5; i++) A.b('c', 0.036, 0.038, 0.006, 0, 0, -0.03 + i * 0.022, { cor: 0x1a0e08 });
  A.b('m', 0.07, 0.02, 0.02, 0, 0, -0.05, { cor: 0x3a3a3a });
  A.b('m', 0.01, 0.055, 0.3, 0, 0.005, -0.21, { cor: 0xc8d0d8 });
  A.b('m', 0.006, 0.03, 0.08, 0, 0.022, -0.34, { rx: -0.35, cor: 0xc8d0d8 });
  A.b('m', 0.011, 0.008, 0.26, 0, 0.03, -0.2, { cor: 0xf0f4f8 });
  A.b('c', 0.012, 0.02, 0.05, 0, -0.01, -0.24, { cor: 0x4a0606 });
  const mats = {
    c: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.8 }),
    m: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.2, metalness: 1 }),
  };
  return A.malhas(mats);
}

export function criarTorreta() {
  const A = montador(), T = montador();
  const MET = 0x4a5058, ESC = 0x1a1c20;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    A.barra('m', [0, 0.85, 0], [Math.cos(a) * 0.45, 0.0, Math.sin(a) * 0.45], 0.05, 0.05, { cor: MET });
    A.b('m', 0.1, 0.03, 0.1, Math.cos(a) * 0.45, 0.015, Math.sin(a) * 0.45, { cor: ESC });
  }
  A.c('m', 0.08, 0.2, 0, 0.85, 0, { cor: ESC });
  A.b('m', 0.25, 0.12, 0.2, 0, 0.3, 0.12, { cor: 0x3a4030 });
  T.b('m', 0.42, 0.26, 0.5, 0, 0, 0, { cor: MET });
  T.b('m', 0.44, 0.04, 0.52, 0, 0.14, 0, { cor: ESC });
  T.t('m', 0.045, 0.6, 0, 0.02, -0.52, { cor: ESC });
  T.t('m', 0.06, 0.12, 0, 0.02, -0.3, { cor: MET });
  T.t('m', 0.055, 0.08, 0, 0.02, -0.82, { cor: ESC });
  T.b('m', 0.14, 0.18, 0.2, 0.28, -0.02, 0.05, { cor: 0x3a4030 });
  T.b('m', 0.2, 0.1, 0.1, 0, 0.18, -0.1, { cor: ESC });
  T.b('b', 0.12, 0.04, 0.02, 0, 0.18, -0.152, { cor: 0x40ff80 });
  T.b('b', 0.04, 0.04, 0.02, 0.15, 0.05, -0.252, { cor: 0xff3020 });
  const mats = {
    m: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0.6 }),
    b: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false }),
  };
  const g = A.malhas(mats);
  const topo = T.malhas(mats);
  topo.position.y = 1.0;
  g.add(topo);
  g.userData.topo = topo;
  return g;
}

// ======================================================================= TEXTURAS SIMPLES (cenário)
export function texChao(cor) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = cor; g.fillRect(0, 0, w, h);
    granulado(g, w, h, 20);
  });
}
export function texPredio(base) {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 12; y < h - 10; y += 32) for (let x = 10; x < w - 10; x += 30) { g.fillStyle = Math.random() < 0.1 ? '#e8c060' : '#0c0e12'; g.fillRect(x, y, 18, 20); }
  });
}
export function texCaixa() {
  return canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#6a5030'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = `rgba(0,0,0,${rand(0.08, 0.2)})`; g.fillRect(0, y, w, 1); g.fillStyle = `rgba(255,220,160,${rand(0, 0.08)})`; g.fillRect(0, y + 1, w, 3); }
    g.strokeStyle = '#3a2810'; g.lineWidth = 5; g.strokeRect(2, 2, w - 4, h - 4);
    g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, h - 4); g.stroke();
    g.fillStyle = '#2a1a08'; for (const [x, y] of [[6, 6], [w - 8, 6], [6, h - 8], [w - 8, h - 8]]) g.fillRect(x, y, 3, 3);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.font = 'bold 10px monospace'; g.fillText('SUP-Z', 20, 36);
  }, false);
}
export function texBrilho() {
  return canvasTex(64, 64, (g) => {
    g.translate(32, 32);
    for (let i = 0; i < 6; i++) {
      g.rotate(Math.PI / 3);
      const gr = g.createLinearGradient(0, 0, 30, 0);
      gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(1, 'rgba(255,160,40,0)');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -3); g.lineTo(i % 2 ? 30 : 20, 0); g.lineTo(0, 3); g.fill();
    }
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,220,140,0.8)'); gr.addColorStop(1, 'rgba(255,160,40,0)');
    g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
  }, false);
}
