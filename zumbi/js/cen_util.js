// Ferramentas compartilhadas pelos construtores de cenário (uma pasta de peças mescladas por material).
import * as THREE from 'three';
import { texParede, texTeto } from './terreno.js';

export const rand = (a, b) => a + Math.random() * (b - a);
export const escolher = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const b = (x, y, z, w, h, d, cor, o = {}) => ({ w, h, d, x, y, z, cor, ...o });

// ---------------------------------------------------------------- materiais (cache por raid)
export function mat(A, nome) {
  A._mats ||= {};
  if (A._mats[nome]) return A._mats[nome];
  const mk = (tipo, cor, uv) => {
    const t = A.reg(texParede(tipo, cor));
    const m = new THREE.MeshLambertMaterial({ map: t, vertexColors: true });
    m.userData.uvEsc = uv;
    return m;
  };
  const mt = (tipo, uv) => { const t = A.reg(texTeto(tipo)); const m = new THREE.MeshLambertMaterial({ map: t, vertexColors: true }); m.userData.uvEsc = uv; return m; };
  const defs = {
    casa: () => mk('casa', '#e4dcc8', 0.3125),
    tijolo: () => mk('tijolo', null, 0.25),
    concreto: () => mk('concreto', null, 0.25),
    lab: () => mk('lab', null, 0.3125),
    carne: () => mk('carne', null, 0.2),
    rocha: () => mk('rocha', null, 0.25),
    telha: () => mt('telha', 0.5),
    tetoLab: () => mt('lab', 0.25),
    metal: () => mt('metal', 0.5),
    liso: () => { const m = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }); m.userData.uvEsc = 1; return m; },
    brilho: () => { const m = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false }); m.userData.uvEsc = 1; return m; },
  };
  return (A._mats[nome] = defs[nome]());
}

// Grupos de peças por material: cada zona junta tudo e cria 1 malha por material
export function grupos() { return {}; }
export function adicionar(G, nome, parte) { (G[nome] ||= []).push(parte); }
export function fechar(A, G) {
  const meshes = {};
  for (const nome in G) {
    if (!G[nome].length) continue;
    const m = mat(A, nome);
    const mesh = A.malhaMat(G[nome], m, m.userData.uvEsc || 1);
    if (nome === 'brilho') mesh.castShadow = mesh.receiveShadow = false;
    meshes[nome] = mesh;
  }
  return meshes;
}

// ---------------------------------------------------------------- paredes
// Parede alinhada aos eixos com vãos: gaps = [[centro, largura], ...] medidos ao longo da parede.
export function parede(A, G, nome, x0, z0, x1, z1, esp, h, gaps = [], cor = 0xffffff, tipo = 'parede', altPortico = 3.2) {
  const horiz = z0 === z1;
  const a0 = horiz ? Math.min(x0, x1) : Math.min(z0, z1), a1 = horiz ? Math.max(x0, x1) : Math.max(z0, z1);
  const fixo = horiz ? z0 : x0;
  const lista = [...gaps].sort((p, q) => p[0] - q[0]);
  const obsts = [];
  const seg = (s, e) => {
    if (e - s < 0.05) return;
    const c = (s + e) / 2, len = e - s;
    const w = horiz ? len : esp, d = horiz ? esp : len;
    const cx = horiz ? c : fixo, cz = horiz ? fixo : c;
    adicionar(G, nome, b(cx, h / 2, cz, w, h, d, cor));
    obsts.push(A.addObst(cx, cz, w, d, h, tipo));
  };
  let cur = a0;
  for (const [c, w] of lista) {
    const s = c - w / 2, e = c + w / 2;
    if (s > cur) seg(cur, s);
    cur = Math.max(cur, e);
    if (h > altPortico + 0.2) { // verga em cima do vão
      const len = Math.min(e, a1) - Math.max(s, a0), cc = (Math.max(s, a0) + Math.min(e, a1)) / 2;
      adicionar(G, nome, b(horiz ? cc : fixo, altPortico + (h - altPortico) / 2, horiz ? fixo : cc, horiz ? len : esp, h - altPortico, horiz ? esp : len, cor));
    }
  }
  if (cur < a1) seg(cur, a1);
  return obsts;
}

// Edifício com paredes, portas (com vão), telhado e luz interna. lados: 'N' (z-), 'S' (z+), 'W' (x-), 'E' (x+)
// portas: [{ lado, pos, larg, aberta, modo, trancada, chave, cor }]
export function edificio(A, G, nome, cx, cz, w, d, h, portas = [], o = {}) {
  const esp = o.esp || 0.45, cor = o.cor ?? 0xffffff;
  const por = { N: [], S: [], W: [], E: [] };
  for (const p of portas) por[p.lado].push(p);
  const gapsDe = lado => por[lado].map(p => [(lado === 'N' || lado === 'S' ? cx : cz) + (p.pos || 0), p.larg || 1.9]);
  const x0 = cx - w / 2, x1 = cx + w / 2, z0 = cz - d / 2, z1 = cz + d / 2;
  const alt = o.altPortico ?? 3.0;
  if (!(o.semLados || []).includes('N')) parede(A, G, nome, x0, z0, x1, z0, esp, h, gapsDe('N'), cor, 'parede', alt);
  if (!(o.semLados || []).includes('S')) parede(A, G, nome, x0, z1, x1, z1, esp, h, gapsDe('S'), cor, 'parede', alt);
  if (!(o.semLados || []).includes('W')) parede(A, G, nome, x0, z0, x0, z1, esp, h, gapsDe('W'), cor, 'parede', alt);
  if (!(o.semLados || []).includes('E')) parede(A, G, nome, x1, z0, x1, z1, esp, h, gapsDe('E'), cor, 'parede', alt);
  const entradas = [];
  for (const p of portas) {
    if (p.aberta) continue;
    const horiz = p.lado === 'N' || p.lado === 'S';
    const px = horiz ? cx + (p.pos || 0) : p.lado === 'W' ? x0 : x1;
    const pz = horiz ? (p.lado === 'N' ? z0 : z1) : cz + (p.pos || 0);
    entradas.push(A.porta({ x: px, z: pz, eixo: horiz ? 'x' : 'z', w: p.larg || 1.9, h: Math.min(h, 3), modo: p.modo || 'gira', cor: p.cor ?? o.corPorta ?? 0x5a4632, trancada: p.trancada, chave: p.chave }));
  }
  // teto / telhado
  const tel = o.telhado || 'telha';
  if (tel === 'telha') {
    const alto = Math.min(w, d) * 0.32;
    adicionar(G, 'telha', { g: 'pir', w: w + 0.9, h: alto, d: d + 0.9, x: cx, y: h + alto / 2, z: cz, cor: o.corTelhado ?? escolher([0xb06050, 0x805048, 0x906a58, 0x607080]) });
    adicionar(G, 'liso', b(cx, h - 0.05, cz, w - 0.2, 0.1, d - 0.2, 0xcfc8b8));
  } else if (tel === 'plano') {
    adicionar(G, nome, b(cx, h + 0.1, cz, w + 0.3, 0.3, d + 0.3, cor));
    adicionar(G, 'liso', b(cx, h - 0.05, cz, w - 0.2, 0.1, d - 0.2, 0x9a9a92));
  } else if (tel === 'metal') {
    adicionar(G, 'metal', b(cx, h + 0.15, cz, w + 0.6, 0.3, d + 0.6, o.corTelhado ?? 0x8a8e88));
    adicionar(G, 'liso', b(cx, h - 0.05, cz, w - 0.2, 0.1, d - 0.2, 0x6a6e68));
  }
  if (o.luz !== false) A.fonte(cx, Math.min(h, 3) - 0.3, cz, o.corLuz ?? 0xffd9a0, o.intLuz ?? 9, Math.max(w, d) * 0.9, { lamp: true });
  return { cx, cz, w, d, h, x0, x1, z0, z1, entradas };
}

// Bloco sólido (sem interior)
export function bloco(A, G, nome, cx, cz, w, d, h, cor, tipo = 'predio', telhado = null) {
  adicionar(G, nome, b(cx, h / 2, cz, w, h, d, cor));
  if (telhado === 'telha') {
    const alto = Math.min(w, d) * 0.32;
    adicionar(G, 'telha', { g: 'pir', w: w + 0.9, h: alto, d: d + 0.9, x: cx, y: h + alto / 2, z: cz, cor: escolher([0xb06050, 0x805048, 0x906a58, 0x607080]) });
  } else if (telhado === 'plano') adicionar(G, nome, b(cx, h + 0.1, cz, w + 0.3, 0.3, d + 0.3, cor));
  return A.addObst(cx, cz, w, d, h, tipo);
}

// Sala de cofre: bunker trancado que só abre depois de cumprir o objetivo da zona
export function salaCofre(A, G, nome, cx, cz, dir, o = {}) {
  const t = 6, h = 3.4, cor = o.cor ?? 0x8a8a82;
  const lado = dir;
  const gaps = l => l === lado ? [[l === 'N' || l === 'S' ? cx : cz, 2.2]] : [];
  parede(A, G, nome, cx - t / 2, cz - t / 2, cx + t / 2, cz - t / 2, 0.6, h, gaps('N'), cor, 'parede', 3.0);
  parede(A, G, nome, cx - t / 2, cz + t / 2, cx + t / 2, cz + t / 2, 0.6, h, gaps('S'), cor, 'parede', 3.0);
  parede(A, G, nome, cx - t / 2, cz - t / 2, cx - t / 2, cz + t / 2, 0.6, h, gaps('W'), cor, 'parede', 3.0);
  parede(A, G, nome, cx + t / 2, cz - t / 2, cx + t / 2, cz + t / 2, 0.6, h, gaps('E'), cor, 'parede', 3.0);
  adicionar(G, nome, b(cx, h + 0.15, cz, t + 0.5, 0.35, t + 0.5, cor));
  const horiz = lado === 'N' || lado === 'S';
  const px = horiz ? cx : lado === 'W' ? cx - t / 2 : cx + t / 2, pz = horiz ? (lado === 'N' ? cz - t / 2 : cz + t / 2) : cz;
  const porta = A.porta({ x: px, z: pz, eixo: horiz ? 'x' : 'z', w: 2.2, h: 3, modo: 'desliza', cor: o.corPorta ?? 0x3a3e40, trancada: true, chave: 'cofre' });
  A.fonte(cx, 2.6, cz, o.corLuz ?? 0xff5a40, 12, 11, { lamp: true });
  const bau = A.bau({ x: cx, z: cz, rot: horiz ? 0 : Math.PI / 2, estilo: o.estilo || 'cofre', premium: true, cofre: true });
  A.cofres.push({ x: cx, z: cz, porta, bau, nome: o.nome });
  // luzinha vermelha acima da porta (fica verde ao liberar)
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0xff2a20, toneMapped: false }));
  led.position.set(px + (horiz ? 0 : (lado === 'W' ? -0.4 : 0.4)), 3.3, pz + (horiz ? (lado === 'N' ? -0.4 : 0.4) : 0));
  A.cena.add(led);
  A.cofres[A.cofres.length - 1].led = led;
  return porta;
}

// ---------------------------------------------------------------- árvores
export function arvore(A, x, z, tipo = 'folha', escala = 1) {
  const tr = [], cp = [];
  const h = rand(3.6, 6) * escala;
  tr.push({ g: 'cil', w: 0.38 * escala, h, d: 0.38 * escala, x: 0, y: h / 2, z: 0, cor: 0x4a3a28 });
  if (tipo === 'morta') {
    for (let i = 0; i < 6; i++) {
      const comp = rand(1.1, 2.2) * escala;
      cp.push({ w: 0.1, h: comp, d: 0.1, x: rand(-0.5, 0.5), y: h * rand(0.55, 0.97), z: rand(-0.5, 0.5), rz: rand(-1.1, 1.1), rx: rand(-1.1, 1.1), cor: 0x3a2e22 });
    }
  } else if (tipo === 'pinho') {
    for (let i = 0; i < 4; i++) cp.push({ g: 'cone', w: (3.2 - i * 0.7) * escala, h: 2.2 * escala, d: (3.2 - i * 0.7) * escala, x: 0, y: h * 0.45 + i * 1.1 * escala, z: 0, cor: escolher([0x2a4a2a, 0x24402a, 0x305030]) });
  } else {
    for (let i = 0; i < 5; i++) {
      const r = rand(1.1, 1.8) * escala;
      cp.push({ g: 'esf', w: r * 2, h: r * 1.6, d: r * 2, x: rand(-1.1, 1.1) * escala, y: h + rand(-0.2, 1.3) * escala, z: rand(-1.1, 1.1) * escala, cor: escolher([0x3a5a2a, 0x486a30, 0x2e4a24, 0x56702e, 0x6a6a30]) });
    }
  }
  const g = new THREE.Group();
  const troncoM = A.malhaVC(tr);
  const copaM = A.malhaVC(cp);
  g.add(troncoM, copaM);
  g.position.set(x, 0, z);
  g.rotation.y = rand(0, 6.28);
  A.cena.add(g);
  A.addObst(x, z, 0.5, 0.5, h, 'arvore');
  const fase = rand(0, 10);
  A.arvores.push({ copa: copaM, fase });
  return g;
}

// ---------------------------------------------------------------- baús (visual)
const ESTILOS_BAU = {
  madeira: { corpo: 0x6a4a2a, tampa: 0x7a5632, fita: 0x2a2a2a, w: 1.1, h: 0.55, d: 0.7 },
  militar: { corpo: 0x4a5236, tampa: 0x56603e, fita: 0xd0b020, w: 1.2, h: 0.55, d: 0.7 },
  armario: { corpo: 0x6a7480, tampa: 0x7a8490, fita: 0xc02020, w: 0.9, h: 1.7, d: 0.6 },
  maleta:  { corpo: 0xd0d4d6, tampa: 0xe0e4e6, fita: 0xc03020, w: 1.0, h: 0.5, d: 0.7 },
  casulo:  { corpo: 0x6a1e44, tampa: 0x7a2a52, fita: 0xe060c0, w: 1.0, h: 0.8, d: 0.9 },
  cofre:   { corpo: 0x2e3236, tampa: 0x3a4044, fita: 0xe0b020, w: 1.4, h: 0.9, d: 0.9 },
};
export function modeloBau(A, estilo) {
  const e = ESTILOS_BAU[estilo] || ESTILOS_BAU.madeira;
  const g = new THREE.Group();
  const base = [], tampa = [];
  const piv = new THREE.Group();
  if (estilo === 'armario') {
    base.push(b(0, e.h / 2, 0, e.w, e.h, e.d, e.corpo));
    for (let i = 0; i < 4; i++) base.push(b(0, 0.25 + i * 0.4, e.d / 2 + 0.005, e.w - 0.06, 0.02, 0.01, 0x222222));
    tampa.push(b(e.w / 2 - 0.02, 0, 0.02, e.w - 0.06, e.h - 0.1, 0.04, e.tampa), b(e.w - 0.2, 0, 0.06, 0.05, 0.22, 0.04, 0x202020));
    piv.position.set(-e.w / 2 + 0.03, e.h / 2, e.d / 2);
    g.userData.abrir = () => { piv.rotation.y = -1.9; };
  } else {
    base.push(b(0, e.h * 0.35, 0, e.w, e.h * 0.7, e.d, e.corpo),
      b(e.w / 2 - 0.1, e.h * 0.35, 0, 0.1, e.h * 0.72, e.d + 0.02, e.fita), b(-e.w / 2 + 0.1, e.h * 0.35, 0, 0.1, e.h * 0.72, e.d + 0.02, e.fita));
    tampa.push(b(0, e.h * 0.15, e.d / 2, e.w, e.h * 0.3, e.d, e.tampa), b(e.w / 2 - 0.1, e.h * 0.15, e.d / 2, 0.1, e.h * 0.32, e.d + 0.02, e.fita), b(-e.w / 2 + 0.1, e.h * 0.15, e.d / 2, 0.1, e.h * 0.32, e.d + 0.02, e.fita),
      b(0, 0.0, e.d - 0.02, 0.14, 0.14, 0.04, 0xc8a040));
    piv.position.set(0, e.h * 0.7, -e.d / 2);
    g.userData.abrir = () => { piv.rotation.x = -1.9; };
  }
  g.add(A.malhaVC(base));
  piv.add(A.malhaVC(tampa));
  g.add(piv);
  g.userData.altura = e.h;
  g.userData.tam = Math.max(e.w, e.d);
  return g;
}

// ---------------------------------------------------------------- escadinha de degraus (sobe em plataformas)
export function degraus(A, G, nome, x, z, dir, larg, alturas, passo, cor) {
  // dir: 'N','S','E','W' = para onde o jogador anda ao subir. Cada degrau é um bloco sólido
  const dx = dir === 'E' ? 1 : dir === 'W' ? -1 : 0, dz = dir === 'S' ? 1 : dir === 'N' ? -1 : 0;
  alturas.forEach((h, i) => {
    const cx = x + dx * passo * i, cz = z + dz * passo * i;
    const w = dx ? passo : larg, d = dz ? passo : larg;
    adicionar(G, nome, b(cx, h / 2, cz, w, h, d, cor));
    A.addObst(cx, cz, w, d, h, 'degrau');
  });
}
