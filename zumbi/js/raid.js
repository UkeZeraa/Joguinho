// Raid em primeira pessoa: mapa, jogador, armas, zumbis, ondas e extração.
import * as THREE from 'three';
import { TIPOS, TIERS, ZUMBIS, BOSS_PESOS, stats, rolarTier, novaArma, fmt } from './dados.js';
import { criarArma, criarZumbi, texChao, texPredio, texCaixa, texBrilho } from './modelos.js';
import { som } from './audio.js';

const L = 42;            // metade do tamanho do mapa
const N = L * 2;         // células do grid (1 m)
const ALTURA_OLHO = 1.62;
const RAIO_JOG = 0.4;
const CEL_HELI = { x: 0, z: -28 };
const INICIO = { x: 0, z: 28 };

let renderer = null;
function pegarRenderer(canvas) {
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.autoClear = false;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
  return renderer;
}

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rand = (a, b) => a + Math.random() * (b - a);

// Raio x caixa alinhada (slab). Retorna t ou -1
function raioCaixa(ox, oy, oz, dx, dy, dz, minx, miny, minz, maxx, maxy, maxz, tmax) {
  let t0 = 0, t1 = tmax;
  const o = [ox, oy, oz], d = [dx, dy, dz], mn = [minx, miny, minz], mx = [maxx, maxy, maxz];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) {
      if (o[i] < mn[i] || o[i] > mx[i]) return -1;
    } else {
      let a = (mn[i] - o[i]) / d[i], b = (mx[i] - o[i]) / d[i];
      if (a > b) { const tt = a; a = b; b = tt; }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
      if (t0 > t1) return -1;
    }
  }
  return t0;
}
function raioEsfera(ox, oy, oz, dx, dy, dz, cx, cy, cz, r) {
  const lx = cx - ox, ly = cy - oy, lz = cz - oz;
  const tca = lx * dx + ly * dy + lz * dz;
  if (tca < 0) return -1;
  const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
  if (d2 > r * r) return -1;
  return tca - Math.sqrt(r * r - d2);
}

export function iniciarRaid({ canvas, zona, loadout, opcoes, mobile, onFim }) {
  const R = pegarRenderer(canvas);
  const cena = new THREE.Scene();
  cena.background = new THREE.Color(zona.ceu);
  cena.fog = new THREE.FogExp2(zona.neblina, 0.032);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
  camera.rotation.order = 'YXZ';
  cena.add(camera);

  // Cena separada só para a arma na mão (não atravessa paredes)
  const vmCena = new THREE.Scene();
  const vmCam = new THREE.PerspectiveCamera(65, 1, 0.01, 10);
  vmCena.add(vmCam);
  vmCena.add(new THREE.AmbientLight(0xffffff, 0.7));
  const vmSol = new THREE.DirectionalLight(0xffffff, 2.2);
  vmSol.position.set(0.5, 1, 0.6);
  vmCena.add(vmSol);
  const vmLuzTier = new THREE.PointLight(0xffffff, 0.6, 1.2, 1);
  vmLuzTier.position.set(0.2, -0.1, -0.5);
  vmCena.add(vmLuzTier);

  // ---------- luzes ----------
  cena.add(new THREE.HemisphereLight(zona.luz, 0x202020, 0.55));
  const lua = new THREE.DirectionalLight(zona.luz, 0.45);
  lua.position.set(-20, 40, -10);
  cena.add(lua);
  const lanterna = new THREE.SpotLight(0xfff4dd, 60, 40, 0.48, 0.55, 1.2);
  lanterna.position.set(0.15, -0.1, 0);
  camera.add(lanterna);
  const alvoLanterna = new THREE.Object3D();
  alvoLanterna.position.set(0, -0.05, -5);
  camera.add(alvoLanterna);
  lanterna.target = alvoLanterna;
  const luzTiro = new THREE.PointLight(0xffc070, 0, 14, 1.5);
  camera.add(luzTiro);

  const descartaveis = [];
  const reg = o => { descartaveis.push(o); return o; };

  // ---------- mapa ----------
  const obst = [];      // {minx,maxx,minz,maxz,h,tipo,mesh}
  const chaoTex = reg(texChao(zona.chao));
  chaoTex.repeat.set(L / 4, L / 4);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(L * 2, L * 2), new THREE.MeshLambertMaterial({ map: chaoTex }));
  chao.rotation.x = -Math.PI / 2;
  cena.add(chao);

  const texPredios = ['#5a5550', '#4a4e58', '#6a5a48', '#3e4440'].map(c => reg(texPredio(c)));
  const tCaixa = reg(texCaixa());
  const matCaixa = new THREE.MeshLambertMaterial({ map: tCaixa });
  const geoCaixa = new THREE.BoxGeometry(1, 1, 1);

  function addObst(cx, cz, w, d, h, tipo, mesh) {
    const o = { minx: cx - w / 2, maxx: cx + w / 2, minz: cz - d / 2, maxz: cz + d / 2, h, tipo, mesh };
    obst.push(o);
    return o;
  }
  function livre(cx, cz, w, d, folga) {
    if (Math.hypot(cx - INICIO.x, cz - INICIO.z) < 6 + Math.max(w, d) / 2) return false;
    if (Math.hypot(cx - CEL_HELI.x, cz - CEL_HELI.z) < 7 + Math.max(w, d) / 2) return false;
    for (const o of obst) {
      if (cx + w / 2 + folga > o.minx && cx - w / 2 - folga < o.maxx && cz + d / 2 + folga > o.minz && cz - d / 2 - folga < o.maxz) return false;
    }
    return Math.abs(cx) + w / 2 < L - 9 && Math.abs(cz) + d / 2 < L - 9;
  }
  function predio(cx, cz, w, d, h) {
    const t = texPredios[Math.floor(Math.random() * texPredios.length)].clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(Math.max(w, d) / 5)), Math.max(1, Math.round(h / 8)));
    reg(t);
    const m = new THREE.Mesh(geoCaixa, new THREE.MeshLambertMaterial({ map: t }));
    m.scale.set(w, h, d);
    m.position.set(cx, h / 2, cz);
    cena.add(m);
    addObst(cx, cz, w, d, h, 'predio', m);
  }
  // borda da cidade
  for (const lado of [0, 1, 2, 3]) {
    let p = -L;
    while (p < L) {
      const larg = Math.min(rand(8, 14), L - p);
      const prof = rand(7, 10);
      const h = rand(7, 20);
      const meio = p + larg / 2;
      if (lado === 0) predio(meio, -L + prof / 2, larg, prof, h);
      if (lado === 1) predio(meio, L - prof / 2, larg, prof, h);
      if (lado === 2) predio(-L + prof / 2, meio, prof, larg, h);
      if (lado === 3) predio(L - prof / 2, meio, prof, larg, h);
      p += larg;
    }
  }
  // quarteirões internos
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) predio(sx * 17, sz * 17, rand(8, 11), rand(8, 11), rand(8, 16));

  // carros
  const coresCarro = [0x7a1a1a, 0x1a3a6a, 0x2a2a2a, 0x8a8a8a, 0x5a5a20, 0x1a4a2a, 0xa06010];
  const matVidro = new THREE.MeshLambertMaterial({ color: 0x0a0e14 });
  const matPneu = new THREE.MeshLambertMaterial({ color: 0x0b0b0b });
  const geoRoda = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10);
  const fogos = [];
  function carro(cx, cz, giro, queimado) {
    const g = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color: queimado ? 0x1a1410 : coresCarro[Math.floor(Math.random() * coresCarro.length)] });
    const base = new THREE.Mesh(geoCaixa, mat); base.scale.set(4.2, 0.75, 1.9); base.position.y = 0.68; g.add(base);
    const cab = new THREE.Mesh(geoCaixa, mat); cab.scale.set(2.2, 0.6, 1.75); cab.position.set(-0.2, 1.35, 0); g.add(cab);
    const vid = new THREE.Mesh(geoCaixa, matVidro); vid.scale.set(2.25, 0.45, 1.8); vid.position.set(-0.2, 1.36, 0); g.add(vid);
    for (const [x, z] of [[1.3, 0.85], [-1.3, 0.85], [1.3, -0.85], [-1.3, -0.85]]) {
      const r = new THREE.Mesh(geoRoda, matPneu); r.rotation.x = Math.PI / 2; r.position.set(x, 0.36, z); g.add(r);
    }
    g.position.set(cx, 0, cz);
    g.rotation.y = giro ? Math.PI / 2 : 0;
    g.rotation.y += rand(-0.05, 0.05);
    cena.add(g);
    addObst(cx, cz, giro ? 1.9 : 4.2, giro ? 4.2 : 1.9, 1.65, 'carro', g);
    if (queimado) {
      const luz = new THREE.PointLight(0xff6a20, 25, 16, 1.3);
      luz.position.set(cx, 2.2, cz);
      cena.add(luz);
      fogos.push({ luz, x: cx, z: cz });
    }
  }
  const queimados = zona.id === 'centro' ? 3 : zona.id === 'lab' ? 1 : 0;
  let nCarros = 0, tent = 0;
  while (nCarros < 14 && tent++ < 400) {
    const giro = Math.random() < 0.5;
    const cx = rand(-32, 32), cz = rand(-32, 32);
    if (livre(cx, cz, giro ? 1.9 : 4.2, giro ? 4.2 : 1.9, 2.2)) { carro(cx, cz, giro, nCarros < queimados); nCarros++; }
  }
  // caixas
  tent = 0; let nCx = 0;
  while (nCx < 12 && tent++ < 400) {
    const cx = rand(-32, 32), cz = rand(-32, 32), s = rand(1.0, 1.4);
    if (!livre(cx, cz, s, s, 2.2)) continue;
    const pilha = Math.random() < 0.4 ? 2 : 1;
    for (let i = 0; i < pilha; i++) {
      const m = new THREE.Mesh(geoCaixa, matCaixa);
      m.scale.setScalar(s * (i ? 0.85 : 1));
      m.position.set(cx + rand(-0.05, 0.05), s / 2 + i * s * 0.92, cz);
      m.rotation.y = rand(-0.2, 0.2);
      cena.add(m);
    }
    addObst(cx, cz, s, s, s * pilha, 'caixa');
    nCx++;
  }
  // barreiras de concreto
  const matConcreto = new THREE.MeshLambertMaterial({ color: 0x8a8a82 });
  tent = 0; let nB = 0;
  while (nB < 8 && tent++ < 300) {
    const giro = Math.random() < 0.5;
    const w = giro ? 0.6 : 3, d = giro ? 3 : 0.6;
    const cx = rand(-30, 30), cz = rand(-30, 30);
    if (!livre(cx, cz, w, d, 2.5)) continue;
    const m = new THREE.Mesh(geoCaixa, matConcreto);
    m.scale.set(w, 1.0, d); m.position.set(cx, 0.5, cz);
    cena.add(m);
    addObst(cx, cz, w, d, 1.0, 'barreira');
    nB++;
  }
  // barris explosivos
  const barris = [];
  const matBarril = new THREE.MeshLambertMaterial({ color: 0xb02010 });
  const matFaixa = new THREE.MeshBasicMaterial({ color: 0xffd020 });
  const geoBarril = new THREE.CylinderGeometry(0.42, 0.42, 1.15, 12);
  const geoFaixa = new THREE.CylinderGeometry(0.43, 0.43, 0.12, 12);
  tent = 0;
  while (barris.length < 9 && tent++ < 300) {
    const cx = rand(-30, 30), cz = rand(-30, 30);
    if (!livre(cx, cz, 0.84, 0.84, 2)) continue;
    const g = new THREE.Group();
    const b = new THREE.Mesh(geoBarril, matBarril); b.position.y = 0.575; g.add(b);
    const f = new THREE.Mesh(geoFaixa, matFaixa); f.position.y = 0.8; g.add(f);
    g.position.set(cx, 0, cz);
    cena.add(g);
    const o = addObst(cx, cz, 0.84, 0.84, 1.15, 'barril', g);
    o.hp = 40;
    barris.push(o);
  }
  // postes de luz
  const matPoste = new THREE.MeshLambertMaterial({ color: 0x30343a });
  const matLampada = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
  for (const [px, pz] of [[-8, 8], [8, -8], [-26, -4], [26, 6]]) {
    const poste = new THREE.Mesh(geoCaixa, matPoste); poste.scale.set(0.18, 6, 0.18); poste.position.set(px, 3, pz); cena.add(poste);
    const lamp = new THREE.Mesh(geoCaixa, matLampada); lamp.scale.set(0.6, 0.15, 0.3); lamp.position.set(px, 6, pz); cena.add(lamp);
    const luz = new THREE.PointLight(0xffd9a0, 30, 20, 1.4); luz.position.set(px, 5.6, pz); cena.add(luz);
    addObst(px, pz, 0.3, 0.3, 6, 'poste');
  }
  // heliponto
  const heli = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), new THREE.MeshLambertMaterial({ color: 0x24282c }));
  disco.rotation.x = -Math.PI / 2; disco.position.y = 0.02; heli.add(disco);
  const anel = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 40), new THREE.MeshBasicMaterial({ color: 0xffd020 }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.03; heli.add(anel);
  const matH = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [x, z, w, d] of [[-0.9, 0, 0.35, 2.6], [0.9, 0, 0.35, 2.6], [0, 0, 1.5, 0.35]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matH); b.rotation.x = -Math.PI / 2; b.position.set(x, 0.04, z); heli.add(b);
  }
  const feixe = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 40, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  feixe.position.y = 20; feixe.visible = false; heli.add(feixe);
  heli.position.set(CEL_HELI.x, 0, CEL_HELI.z);
  cena.add(heli);

  // estrelas
  {
    const pos = [];
    for (let i = 0; i < 500; i++) {
      const a = Math.random() * Math.PI * 2, e = rand(0.12, 1.4), r = 150;
      pos.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    cena.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, fog: false, sizeAttenuation: true })));
  }

  // ---------- grid de navegação (flow field) ----------
  const bloq = new Uint8Array(N * N);
  const distG = new Float32Array(N * N);
  function refazerGrid() {
    bloq.fill(0);
    for (const o of obst) {
      const x0 = Math.max(0, Math.floor(o.minx - 0.45 + L)), x1 = Math.min(N - 1, Math.floor(o.maxx + 0.45 + L));
      const z0 = Math.max(0, Math.floor(o.minz - 0.45 + L)), z1 = Math.min(N - 1, Math.floor(o.maxz + 0.45 + L));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) bloq[z * N + x] = 1;
    }
  }
  refazerGrid();
  const fila = new Int32Array(N * N);
  const VIZ = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  function fluxo(px, pz) {
    distG.fill(1e9);
    const sx = clamp(Math.floor(px + L), 0, N - 1), sz = clamp(Math.floor(pz + L), 0, N - 1);
    // Dijkstra simplificado (fila com re-inserção) — mapa pequeno, fica barato
    let ini = 0, fim = 0;
    distG[sz * N + sx] = 0; fila[fim++] = sz * N + sx;
    while (ini < fim) {
      const c = fila[ini++];
      const cx = c % N, cz = (c / N) | 0, dc = distG[c];
      for (const [dx, dz, custo] of VIZ) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
        const n = nz * N + nx;
        if (bloq[n]) continue;
        if (dx && dz && (bloq[cz * N + nx] || bloq[nz * N + cx])) continue;
        const nd = dc + custo;
        if (nd < distG[n] - 0.01) {
          distG[n] = nd;
          if (fim < fila.length) fila[fim++] = n; else { ini = 0; fim = 0; fila[fim++] = n; }
        }
      }
    }
  }

  function colidir(o, r, pe = -1) {
    for (const b of obst) {
      if (pe >= 0 && b.h <= pe + 0.05) continue; // está em cima deste obstáculo
      const cx = clamp(o.x, b.minx, b.maxx), cz = clamp(o.z, b.minz, b.maxz);
      const dx = o.x - cx, dz = o.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          o.x += dx / d * (r - d); o.z += dz / d * (r - d);
        } else {
          const e = [o.x - b.minx, b.maxx - o.x, o.z - b.minz, b.maxz - o.z];
          const m = Math.min(...e);
          if (m === e[0]) o.x = b.minx - r; else if (m === e[1]) o.x = b.maxx + r;
          else if (m === e[2]) o.z = b.minz - r; else o.z = b.maxz + r;
        }
      }
    }
    o.x = clamp(o.x, -L + 1, L - 1); o.z = clamp(o.z, -L + 1, L - 1);
  }

  // altura do que está embaixo do jogador (chão = 0, ou o topo de um carro/caixa)
  function alturaChao(x, z, r, pe) {
    let h = 0;
    for (const b of obst) {
      if (b.h > pe + 0.05 || b.h <= h) continue;
      const cx = clamp(x, b.minx, b.maxx), cz = clamp(z, b.minz, b.maxz);
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r * 0.5) h = b.h;
    }
    return h;
  }

  // ---------- partículas (instanciadas) ----------
  const MAXP = 400;
  const partGeo = new THREE.BoxGeometry(1, 1, 1);
  const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const parts = new THREE.InstancedMesh(partGeo, partMat, MAXP);
  parts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  parts.frustumCulled = false;
  const pData = [];
  const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
  for (let i = 0; i < MAXP; i++) { pData.push({ vida: 0 }); parts.setColorAt(i, tmpC.set(0)); tmpM.makeScale(0, 0, 0); parts.setMatrixAt(i, tmpM); }
  cena.add(parts);
  let pIdx = 0;
  function particula(x, y, z, vx, vy, vz, vida, tam, cor, grav = 14) {
    const p = pData[pIdx];
    p.x = x; p.y = y; p.z = z; p.vx = vx; p.vy = vy; p.vz = vz; p.vida = p.max = vida; p.tam = tam; p.grav = grav;
    parts.setColorAt(pIdx, tmpC.set(cor));
    pIdx = (pIdx + 1) % MAXP;
  }
  function sangue(x, y, z, n, cor = 0x8a0a0a) {
    for (let i = 0; i < n; i++) particula(x, y, z, rand(-2.5, 2.5), rand(0, 3.5), rand(-2.5, 2.5), rand(0.4, 0.8), rand(0.05, 0.11), cor);
  }
  function faiscas(x, y, z) {
    for (let i = 0; i < 5; i++) particula(x, y, z, rand(-3, 3), rand(0, 3), rand(-3, 3), rand(0.15, 0.3), 0.04, 0xffd070, 8);
  }

  // traçantes
  const tracers = [];
  const geoTr = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(geoTr, new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.visible = false; cena.add(m);
    tracers.push({ m, vida: 0 });
  }
  let trIdx = 0;
  function tracante(a, b, cor) {
    const t = tracers[trIdx]; trIdx = (trIdx + 1) % tracers.length;
    const len = a.distanceTo(b);
    t.m.position.copy(a).add(b).multiplyScalar(0.5);
    t.m.scale.set(0.025, 0.025, len);
    t.m.lookAt(b);
    t.m.material.color.set(cor);
    t.m.material.opacity = 0.9;
    t.m.visible = true; t.vida = 0.06;
  }

  // explosões visuais
  const geoEsf = new THREE.SphereGeometry(1, 16, 12);
  const bolhas = [];
  function bolaFogo(x, y, z, r, cor = 0xff8a20) {
    const m = new THREE.Mesh(geoEsf, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(x, y, z); m.scale.setScalar(0.3);
    cena.add(m);
    const luz = new THREE.PointLight(cor, 80, r * 5, 1.5); luz.position.set(x, y + 0.5, z); cena.add(luz);
    bolhas.push({ m, luz, vida: 0.45, max: 0.45, r });
  }

  // ---------- jogador ----------
  const jog = {
    x: INICIO.x, z: INICIO.z, yaw: 0, pitch: 0, hp: 100, hpMax: 100,
    armadura: loadout.armadura, armaduraMax: loadout.armadura,
    granadas: loadout.granadas, kits: loadout.kits, curando: 0, passo: 0, morto: false,
    y: 0, vy: 0, noChao: true, pousou: 0,
  };
  const armas = loadout.armas.filter(Boolean).map(a => {
    const st = stats(a);
    const mesh = criarArma(a);
    mesh.visible = false;
    vmCam.add(mesh);
    return { def: a, st, mesh, pente: st.pente, reserva: st.pente * 4, reservaMax: st.pente * 7 };
  });
  let atual = 0;
  armas[0].mesh.visible = true;
  let cadencia = 0, recarregando = 0, trocando = 0, recuoV = 0, chute = 0, disparoSolto = true, abrirFogo = 0;
  let mira = 0; // 0..1 (ADS)
  let tremor = 0, flashDano = 0, hitmarker = 0, hitCabeca = false;
  const muzzleSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: reg(texBrilho()), color: 0xffd090, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  muzzleSprite.scale.setScalar(0.25); muzzleSprite.visible = false;
  vmCena.add(muzzleSprite);
  let flashT = 0;

  function equiparVisual() {
    armas.forEach((a, i) => { a.mesh.visible = i === atual; });
    const a = armas[atual];
    vmLuzTier.color.set(TIERS[a.def.tier].cor);
    atualizarHudArma();
  }

  // ---------- zumbis ----------
  const zumbis = [];
  function spawnZumbi(tipo) {
    let x = 0, z = 0, ok = false;
    for (let t = 0; t < 60 && !ok; t++) {
      const lado = Math.floor(Math.random() * 4), p = rand(-31, 31), q = rand(27, 32.5);
      if (lado === 0) { x = p; z = -q; } else if (lado === 1) { x = p; z = q; } else if (lado === 2) { x = -q; z = p; } else { x = q; z = p; }
      const cx = Math.floor(x + L), cz = Math.floor(z + L);
      ok = !bloq[cz * N + cx] && Math.hypot(x - jog.x, z - jog.z) > (t < 40 ? 20 : 10);
    }
    if (!ok) return;
    const def = ZUMBIS[tipo];
    const g = criarZumbi(tipo);
    g.position.set(x, 0, z);
    cena.add(g);
    const escalaOnda = 1 + 0.1 * (onda - 1);
    const hp = def.hp * escalaOnda * (0.7 + 0.3 * zona.dif) * (tipo === 'chefe' ? zona.dif : 1);
    zumbis.push({
      tipo, def, g, x, z, hp, hpMax: hp, vivo: true, morte: 0,
      vel: def.vel * Math.min(1.35, 1 + 0.025 * onda) * rand(0.9, 1.1),
      dano: def.dano * (0.8 + 0.2 * zona.dif),
      raio: def.raio, escala: g.scale.x,
      ataque: 0, cdAtaque: 0, cdCuspe: rand(1, 3), fogo: 0, fogoDps: 0, flash: 0,
      gemido: rand(1, 6), fase: Math.random() * 10, yaw: 0,
    });
    if (tipo === 'chefe') { som.rugido(); anunciar('A ABOMINAÇÃO CHEGOU!', '#ff3050'); tremor = 0.6; }
  }

  // ---------- projéteis (cuspe e granada) ----------
  const projeteis = [];
  const matCuspe = new THREE.MeshBasicMaterial({ color: 0x9cff3a });
  const matGranada = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
  function lancarGranada() {
    if (jog.granadas <= 0 || jog.morto) return;
    jog.granadas--;
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const m = new THREE.Mesh(geoEsf, matGranada); m.scale.setScalar(0.12);
    const p = { tipo: 'granada', m, x: jog.x + dir.x * 0.5, y: ALTURA_OLHO - 0.1, z: jog.z + dir.z * 0.5, vx: dir.x * 17, vy: dir.y * 17 + 4.5, vz: dir.z * 17, t: 2.2 };
    m.position.set(p.x, p.y, p.z); cena.add(m);
    projeteis.push(p);
    som.troca();
    atualizarHudItens();
  }

  // ---------- loot ----------
  const loots = [];
  const matGrana = new THREE.MeshLambertMaterial({ color: 0x2a9a3a, emissive: 0x0a4010 });
  const matMun = new THREE.MeshLambertMaterial({ color: 0xc8a020, emissive: 0x403000 });
  const matVida = new THREE.MeshLambertMaterial({ color: 0xeeeeee, emissive: 0x401010 });
  function soltarLoot(tipo, x, z, extra) {
    let m;
    if (tipo === 'arma') {
      m = new THREE.Group();
      const arma = extra;
      const am = criarArma(arma); am.scale.setScalar(1.6); am.position.y = 0.9; m.add(am);
      const cor = TIERS[arma.tier].cor;
      const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      coluna.position.y = 4; m.add(coluna);
      const luz = new THREE.PointLight(cor, 10, 6, 1.5); luz.position.y = 1; m.add(luz);
      m.userData.girar = am;
    } else {
      m = new THREE.Mesh(geoCaixa, tipo === 'grana' ? matGrana : tipo === 'municao' ? matMun : matVida);
      m.scale.set(tipo === 'grana' ? 0.35 : 0.5, tipo === 'grana' ? 0.18 : 0.32, 0.35);
      m.position.y = 0.4;
    }
    const p = { x: clamp(x, -L + 2, L - 2), z: clamp(z, -L + 2, L - 2) };
    colidir(p, 0.5);
    m.position.x = p.x; m.position.z = p.z;
    cena.add(m);
    loots.push({ tipo, m, x: p.x, z: p.z, valor: extra, t: 0 });
  }

  // ---------- estado da raid ----------
  let onda = 0, estado = 'preparo', timerEstado = 5, filaSpawn = [], timerSpawn = 0, chefeAgendado = false;
  let ganho = 0, abates = 0, extracao = 0, tempo = 0, timerFluxo = 0, timerTrickle = 0;
  const armasAchadas = [];
  let pausado = false, acabou = false, raf = 0;

  function montarOnda(n) {
    const total = Math.round((6 + n * 4) * (0.8 + 0.2 * zona.dif));
    const pesos = {
      errante: 1,
      corredor: n >= 2 ? 0.3 + 0.05 * n : 0,
      cuspidor: n >= 3 ? 0.2 : 0,
      inchado: n >= 3 ? 0.18 : 0,
      bruto: n >= (zona.dif > 2 ? 3 : 4) ? 0.07 + 0.01 * n : 0,
    };
    const soma = Object.values(pesos).reduce((a, b) => a + b, 0);
    const f = [];
    for (let i = 0; i < total; i++) {
      let r = Math.random() * soma;
      for (const k in pesos) { r -= pesos[k]; if (r <= 0) { f.push(k); break; } }
    }
    if (n === zona.ondas) f.splice(Math.floor(f.length * 0.35), 0, 'chefe');
    return f;
  }

  // ---------- HUD ----------
  const hud = {
    hp: $('hpFill'), hpTxt: $('hpTxt'), arm: $('armFill'), armTxt: $('armTxt'),
    onda: $('hudOnda'), vivos: $('hudVivos'), grana: $('hudGrana'), arma: $('hudArma'), mun: $('hudMun'),
    rec: $('hudRec'), recFill: $('hudRecFill'), itens: $('hudItens'), anuncio: $('anuncio'), feed: $('feed'),
    mira: $('mira'), hit: $('hitmarker'), dano: $('vinheta'), mapa: $('minimapa'), luneta: $('luneta'),
    ext: $('hudExt'), extFill: $('hudExtFill'), danoNums: $('danoNums'), bossBar: $('bossBar'), bossFill: $('bossFill'),
  };
  hud.mapa.width = hud.mapa.height = 150;
  const mctx = hud.mapa.getContext('2d');
  const mapaBase = document.createElement('canvas');
  mapaBase.width = mapaBase.height = 150;
  function desenharMapaBase() {
    const g = mapaBase.getContext('2d'), s = 150 / (L * 2);
    g.clearRect(0, 0, 150, 150);
    g.fillStyle = 'rgba(20,24,28,0.85)'; g.fillRect(0, 0, 150, 150);
    for (const o of obst) {
      g.fillStyle = o.tipo === 'predio' ? '#4a525a' : o.tipo === 'barril' ? '#c03020' : '#6a6a60';
      g.fillRect((o.minx + L) * s, (o.minz + L) * s, (o.maxx - o.minx) * s, (o.maxz - o.minz) * s);
    }
  }
  desenharMapaBase();

  let anuncioT = 0;
  function anunciar(txt, cor = '#fff', dur = 2.5) {
    hud.anuncio.textContent = txt;
    hud.anuncio.style.color = cor;
    hud.anuncio.style.opacity = 1;
    anuncioT = dur;
  }
  function feed(txt, cor = '#ddd') {
    const d = document.createElement('div');
    d.textContent = txt; d.style.color = cor;
    hud.feed.prepend(d);
    while (hud.feed.children.length > 5) hud.feed.lastChild.remove();
    setTimeout(() => d.remove(), 4500);
  }
  function atualizarHudArma() {
    const a = armas[atual];
    hud.arma.textContent = a.def.nome;
    hud.arma.style.color = TIERS[a.def.tier].cor;
    hud.mun.innerHTML = `<b>${a.pente}</b> / ${a.reserva}`;
    hud.mun.classList.toggle('pouca', a.pente <= Math.ceil(a.st.pente * 0.25));
  }
  function atualizarHudItens() {
    hud.itens.innerHTML = `💣 ${jog.granadas} &nbsp; ✚ ${jog.kits}`;
    const bg = $('btnGranada'), bk = $('btnKit');
    if (bg) bg.querySelector('span').textContent = jog.granadas;
    if (bk) bk.querySelector('span').textContent = jog.kits;
  }
  function atualizarHudVida() {
    hud.hp.style.width = (jog.hp / jog.hpMax * 100) + '%';
    hud.hpTxt.textContent = Math.ceil(jog.hp);
    const temArm = jog.armaduraMax > 0;
    hud.arm.parentElement.style.display = temArm ? '' : 'none';
    if (temArm) {
      hud.arm.style.width = (jog.armadura / jog.armaduraMax * 100) + '%';
      hud.armTxt.textContent = Math.ceil(jog.armadura);
    }
  }
  const numsPool = [];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    hud.danoNums.appendChild(s);
    numsPool.push({ el: s, vida: 0, x: 0, y: 0, z: 0 });
  }
  let numIdx = 0;
  function numeroDano(x, y, z, v, cabeca, cor) {
    const n = numsPool[numIdx]; numIdx = (numIdx + 1) % numsPool.length;
    n.x = x + rand(-0.2, 0.2); n.y = y; n.z = z + rand(-0.2, 0.2); n.vida = 0.8;
    n.el.textContent = Math.round(v);
    n.el.style.color = cor || (cabeca ? '#ffd020' : '#fff');
    n.el.style.fontSize = cabeca ? '20px' : '15px';
  }

  // ---------- combate ----------
  function danoZumbi(z, valor, cabeca, px, py, pz, origem) {
    if (!z.vivo) return;
    z.hp -= valor;
    z.flash = 0.08;
    if (origem !== 'fogo') numeroDano(px, py, pz, valor, cabeca, origem === 'explosao' ? '#ff9a40' : null);
    if (z.hp <= 0) matar(z, cabeca);
  }
  function matar(z, cabeca) {
    z.vivo = false; z.morte = 0;
    abates++;
    const g = Math.round(z.def.grana * zona.recompensa * (cabeca ? 1.5 : 1));
    ganho += g;
    som.abate();
    feed(`${z.def.nome} eliminado${cabeca ? ' (headshot)' : ''}  +${fmt(g)}`, cabeca ? '#ffd020' : '#cfe');
    sangue(z.x, 1.2 * z.escala, z.z, 14);
    if (z.tipo === 'inchado') explodir(z.x, 1, z.z, 4.5, z.dano * 1.4, 'zumbi');
    // drops
    const r = Math.random();
    if (z.tipo === 'chefe') {
      const a = novaArma(null, rolarTier(BOSS_PESOS));
      soltarLoot('arma', z.x, z.z, a);
      for (let i = 0; i < 4; i++) soltarLoot('grana', z.x + rand(-2, 2), z.z + rand(-2, 2), 80 * zona.recompensa);
      $('bossBar').style.display = 'none';
      anunciar('ABOMINAÇÃO DERROTADA!', '#ffd020');
    } else if (r < (z.tipo === 'bruto' ? 0.25 : 0.035)) {
      soltarLoot('arma', z.x, z.z, novaArma(null, rolarTier(zona.loot)));
    } else if (r < 0.14) soltarLoot('municao', z.x, z.z);
    else if (r < 0.2) soltarLoot('vida', z.x, z.z);
    else if (r < 0.32) soltarLoot('grana', z.x, z.z, Math.round(rand(15, 40) * zona.recompensa));
  }

  function explodir(x, y, z, raio, dano, origem) {
    bolaFogo(x, y, z, raio);
    som.explosao();
    for (let i = 0; i < 30; i++) particula(x, y, z, rand(-8, 8), rand(2, 9), rand(-8, 8), rand(0.4, 0.9), rand(0.08, 0.2), Math.random() < 0.5 ? 0xff8a20 : 0x3a3a3a);
    const dj = Math.hypot(jog.x - x, jog.z - z);
    tremor = Math.max(tremor, clamp(1 - dj / 25, 0, 0.7));
    for (const zb of zumbis) {
      if (!zb.vivo) continue;
      const d = Math.hypot(zb.x - x, zb.z - z);
      if (d < raio + zb.raio) danoZumbi(zb, dano * (1 - 0.6 * d / (raio + zb.raio)) * (origem === 'zumbi' ? 0.5 : 1), false, zb.x, 1.4 * zb.escala, zb.z, 'explosao');
    }
    if (origem !== 'bala' && dj < raio) danoJogador(dano * (1 - 0.7 * dj / raio) * (origem === 'granada' ? 0.5 : 1));
    for (const b of barris) {
      if (b.hp > 0 && Math.hypot((b.minx + b.maxx) / 2 - x, (b.minz + b.maxz) / 2 - z) < raio) {
        b.hp = 0;
        setTimeout(() => estourarBarril(b), 120);
      }
    }
  }
  function estourarBarril(b) {
    if (b.estourado) return;
    b.estourado = true; b.hp = 0;
    const cx = (b.minx + b.maxx) / 2, cz = (b.minz + b.maxz) / 2;
    cena.remove(b.mesh);
    const i = obst.indexOf(b); if (i >= 0) obst.splice(i, 1);
    refazerGrid(); desenharMapaBase();
    explodir(cx, 0.8, cz, 5.5, 220, 'barril');
  }

  function danoJogador(v) {
    if (jog.morto || acabou) return;
    if (jog.armadura > 0) {
      const absorve = Math.min(jog.armadura, v * 0.6);
      jog.armadura -= absorve; v -= absorve;
    }
    jog.hp -= v;
    flashDano = Math.min(1, flashDano + 0.35 + v / 60);
    tremor = Math.max(tremor, 0.15);
    som.dano();
    if (jog.hp <= 0) { jog.hp = 0; morrer(); }
    atualizarHudVida();
  }

  const dirTiro = new THREE.Vector3(), origemTiro = new THREE.Vector3(), pontaW = new THREE.Vector3(), fimT = new THREE.Vector3();
  function atirar() {
    const a = armas[atual], st = a.st;
    if (a.pente <= 0) { som.seco(); if (a.reserva > 0) recarregar(); return; }
    a.pente--;
    cadencia = 60 / st.rpm;
    camera.updateMatrixWorld();
    origemTiro.setFromMatrixPosition(camera.matrixWorld);
    vmCam.updateMatrixWorld();
    a.mesh.userData.muzzle.getWorldPosition(pontaW);
    // posição da ponta da arma no mundo (vmCam acompanha a câmera)
    const movendo = Math.hypot(mov.x, mov.z) > 0.1;
    let disp = st.disp * (1 - mira * 0.7) * (movendo ? 1.5 : 1) * (1 + Math.min(abrirFogo, 1) * 0.8);
    if (a.def.tipo === 'sniper' && mira < 0.9) disp = 0.06;
    for (let p = 0; p < st.projeteis; p++) {
      camera.getWorldDirection(dirTiro);
      dirTiro.x += rand(-disp, disp); dirTiro.y += rand(-disp, disp); dirTiro.z += rand(-disp, disp);
      dirTiro.normalize();
      tiroRaio(a, st, origemTiro, dirTiro, p === 0);
    }
    abrirFogo += 0.25;
    recuoV += st.recuo * (1 - mira * 0.4);
    chute = 1;
    flashT = 0.05;
    luzTiro.intensity = 14;
    som.tiro(a.def.tipo, a.def.tier >= 5);
    atualizarHudArma();
    if (a.pente === 0 && a.reserva > 0) setTimeout(() => { if (!acabou) recarregar(); }, 200);
  }

  function tiroRaio(a, st, o, d, principal) {
    // obstáculo mais próximo
    let tObst = st.alcance * 1.6, obstAtingido = null;
    for (const b of obst) {
      const t = raioCaixa(o.x, o.y, o.z, d.x, d.y, d.z, b.minx, 0, b.minz, b.maxx, b.h, b.maxz, tObst);
      if (t >= 0 && t < tObst) { tObst = t; obstAtingido = b; }
    }
    if (d.y < 0) { const tc = -o.y / d.y; if (tc < tObst) { tObst = tc; obstAtingido = null; } }
    // zumbis no caminho
    const hits = [];
    for (const z of zumbis) {
      if (!z.vivo) continue;
      const s = z.escala;
      const hx = z.x, hy = 1.58 * s, hz = z.z;
      const tc = raioEsfera(o.x, o.y, o.z, d.x, d.y, d.z, hx, hy, hz, 0.2 * s);
      if (tc >= 0 && tc < tObst) { hits.push({ z, t: tc, cabeca: true }); continue; }
      const w = z.raio * 0.85;
      const tb = raioCaixa(o.x, o.y, o.z, d.x, d.y, d.z, z.x - w, 0, z.z - w, z.x + w, 1.42 * s, z.z + w, tObst);
      if (tb >= 0) hits.push({ z, t: tb, cabeca: false });
    }
    hits.sort((p, q) => p.t - q.t);
    let tFim = tObst;
    const maxHits = 1 + st.perfura;
    for (let i = 0; i < hits.length && i < maxHits; i++) {
      const h = hits[i], z = h.z;
      const px = o.x + d.x * h.t, py = o.y + d.y * h.t, pz = o.z + d.z * h.t;
      let dano = st.dano * (h.t > st.alcance ? 0.55 : 1) * (h.cabeca ? (a.def.tipo === 'sniper' ? 2.5 : 2) : 1) * (i > 0 ? 0.7 : 1);
      if (z.tipo === 'chefe' && h.cabeca) dano *= 0.75;
      danoZumbi(z, dano, h.cabeca, px, py, pz, 'bala');
      sangue(px, py, pz, h.cabeca ? 8 : 4, z.tipo === 'cuspidor' ? 0x6aaa20 : 0x8a0a0a);
      hitmarker = 0.12; hitCabeca = h.cabeca;
      som.hit(h.cabeca);
      if (st.fogo) { z.fogo = 3; z.fogoDps = st.dano * 0.18 * st.projeteis; }
      if (st.vampiro) { jog.hp = Math.min(jog.hpMax, jog.hp + dano * st.vampiro); atualizarHudVida(); }
      if (st.explosivo && principal) explodir(px, py, pz, 2.6, st.dano * 0.45 * Math.max(1, st.projeteis / 3), 'bala');
      tFim = h.t;
    }
    if (hits.length < maxHits) {
      tFim = tObst;
      if (tFim < st.alcance * 1.6) {
        faiscas(o.x + d.x * tFim, o.y + d.y * tFim, o.z + d.z * tFim);
        if (obstAtingido && obstAtingido.tipo === 'barril' && !obstAtingido.estourado) {
          obstAtingido.hp -= st.dano;
          if (obstAtingido.hp <= 0) estourarBarril(obstAtingido);
        }
      }
    }
    if (principal || Math.random() < 0.35) {
      fimT.set(o.x + d.x * tFim, o.y + d.y * tFim, o.z + d.z * tFim);
      tracante(pontaW, fimT, a.def.tier >= 3 ? TIERS[a.def.tier].cor : 0xffe0a0);
    }
  }

  const fwd = new THREE.Vector3();
  function procurarAlvo(st) {
    const ox = jog.x, oy = jog.y + ALTURA_OLHO, oz = jog.z;
    const cp = Math.cos(jog.pitch);
    fwd.set(-Math.sin(jog.yaw) * cp, Math.sin(jog.pitch), -Math.cos(jog.yaw) * cp);
    let melhor = null;
    for (const z of zumbis) {
      if (!z.vivo) continue;
      const s = z.escala;
      const dx = z.x - ox, dz = z.z - oz, dist = Math.hypot(dx, dz);
      if (dist > st.alcance * 1.1 || dist < 0.3) continue;
      const ty = (dist < 6 ? 1.2 : 1.45) * s; // peito de perto, mais alto de longe
      const dy = ty - oy, d3 = Math.hypot(dx, dy, dz);
      const ang = Math.acos(clamp((dx * fwd.x + dy * fwd.y + dz * fwd.z) / d3, -1, 1));
      if (ang > 0.2 || (melhor && ang >= melhor.ang)) continue;
      // tem parede no caminho?
      const ux = dx / d3, uy = dy / d3, uz = dz / d3;
      let bloqueado = false;
      for (const b of obst) {
        const t = raioCaixa(ox, oy, oz, ux, uy, uz, b.minx, 0, b.minz, b.maxx, b.h, b.maxz, d3);
        if (t >= 0 && t < d3 - z.raio) { bloqueado = true; break; }
      }
      if (bloqueado) continue;
      // a mira está em cima do corpo? (tamanho angular do zumbi)
      const raioAng = Math.atan((z.raio * 0.9 + 0.1) / d3);
      melhor = { z, ang, naMira: ang < raioAng, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(dy, dist) };
    }
    return melhor;
  }

  function recarregar() {
    const a = armas[atual];
    if (recarregando > 0 || trocando > 0 || a.pente >= a.st.pente || a.reserva <= 0) return;
    recarregando = a.st.recarga;
    som.recarga();
  }
  function trocarArma(i) {
    if (armas.length < 2) return;
    if (i === undefined) i = (atual + 1) % armas.length;
    if (i === atual || i >= armas.length) return;
    atual = i; recarregando = 0; trocando = 0.45;
    som.troca();
    equiparVisual();
  }
  function pular() {
    if (!jog.noChao || jog.morto || pausado) return;
    jog.vy = 7.6; jog.noChao = false;
    som.pulo();
  }
  function usarKit() {
    if (jog.kits <= 0 || jog.curando > 0 || jog.hp >= jog.hpMax || jog.morto) return;
    jog.kits--; jog.curando = 1.2;
    som.cura();
    atualizarHudItens();
  }

  function morrer() {
    if (jog.morto) return;
    jog.morto = true;
    anunciar('VOCÊ FOI INFECTADO', '#ff3040', 5);
    setTimeout(() => terminar(false), 2200);
  }
  function terminar(extraido) {
    if (acabou) return;
    acabou = true;
    cancelAnimationFrame(raf);
    removerInput();
    if (document.pointerLockElement) document.exitPointerLock();
    const resultado = {
      extraido, abates, onda, ondas: zona.ondas,
      ganho: Math.round(extraido ? ganho + 150 * zona.ondas * zona.recompensa : ganho * 0.3),
      bonus: extraido ? Math.round(150 * zona.ondas * zona.recompensa) : 0,
      armas: extraido ? armasAchadas : [],
      perdidas: extraido ? [] : armasAchadas,
      granadas: jog.granadas, kits: jog.kits,
    };
    limpar();
    onFim(resultado);
  }
  function limpar() {
    armas.forEach(a => vmCam.remove(a.mesh));
    cena.traverse(o => {
      if (o.geometry && o.geometry !== geoCaixa) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    vmCena.traverse(o => { if (o.material) o.material.dispose(); });
    geoCaixa.dispose();
    descartaveis.forEach(d => d.dispose && d.dispose());
    R.clear();
  }

  // ---------- input ----------
  const teclas = {};
  const mov = { x: 0, z: 0 };
  let gatilho = false, mirando = false, correndo = false;
  const joy = { id: null, x0: 0, y0: 0, dx: 0, dy: 0 };
  const olhar = new Map(); // pointerId -> {x,y}
  const opc = () => ({
    sens: opcoes.sens || 1,
    assist: opcoes.assist ?? mobile,
    autoTiro: opcoes.autoTiro ?? mobile,
  });
  let alvoAssist = null; // zumbi perto da mira (para a mira assistida)

  function girar(dx, dy, fator) {
    const z = 1 / (1 + (armas[atual].st.zoom - 1) * mira);
    // com a mira assistida, a câmera fica mais lenta em cima de um zumbi (fica fácil acertar)
    const freio = alvoAssist && alvoAssist.ang < 0.09 ? 0.55 : 1;
    const k = fator * opc().sens * z * freio;
    jog.yaw -= dx * k;
    jog.pitch = clamp(jog.pitch - dy * k, -1.45, 1.45);
  }
  const onKeyDown = e => {
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    teclas[e.code] = true;
    if (e.code === 'Space') pular();
    if (e.code === 'KeyR') recarregar();
    if (e.code === 'Digit1') trocarArma(0);
    if (e.code === 'Digit2') trocarArma(1);
    if (e.code === 'KeyQ') trocarArma();
    if (e.code === 'KeyG') lancarGranada();
    if (e.code === 'KeyH' || e.code === 'KeyF') usarKit();
    if (e.code === 'KeyP') pausar(!pausado);
  };
  const onKeyUp = e => { teclas[e.code] = false; };
  let arrastoMouse = false;
  const onMouseMove = e => {
    if (pausado) return;
    if (document.pointerLockElement === canvas) girar(e.movementX, e.movementY, 0.0022);
    else if (arrastoMouse) girar(e.movementX, e.movementY, 0.004); // sem mouse preso: arraste para olhar
  };
  const onMouseDown = e => {
    if (mobile || pausado) return;
    if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); arrastoMouse = true; }
    if (e.button === 0) gatilho = true;
    if (e.button === 2) mirando = true;
  };
  const onMouseUp = e => {
    if (e.button === 0) { gatilho = false; disparoSolto = true; }
    if (e.button === 2) mirando = false;
    if (!e.buttons) arrastoMouse = false;
  };
  const onWheel = e => { if (!pausado) trocarArma(); };
  const onLockChange = () => {
    if (!mobile && !acabou && document.pointerLockElement !== canvas && !pausado) pausar(true);
  };
  const onCtx = e => e.preventDefault();

  // toque
  const areaToque = $('toque');
  const joyBase = $('joyBase'), joyPino = $('joyPino');
  const onTouchStart = e => {
    for (const t of e.changedTouches) {
      const alvo = t.target.closest ? t.target.closest('[data-acao]') : null;
      if (alvo) {
        const acao = alvo.dataset.acao;
        if (acao === 'atirar') { gatilho = true; disparoSolto = true; olhar.set(t.identifier, { x: t.clientX, y: t.clientY, atirar: true }); }
        else if (acao === 'mirar') mirando = !mirando;
        else if (acao === 'recarregar') recarregar();
        else if (acao === 'trocar') trocarArma();
        else if (acao === 'granada') lancarGranada();
        else if (acao === 'kit') usarKit();
        else if (acao === 'pular') pular();
        else if (acao === 'pausa') pausar(true);
        alvo.classList.add('ativo');
        continue;
      }
      if (t.clientX < window.innerWidth * 0.4 && joy.id === null) {
        joy.id = t.identifier; joy.x0 = t.clientX; joy.y0 = t.clientY; joy.dx = joy.dy = 0;
        joyBase.style.display = 'block';
        joyBase.style.left = t.clientX + 'px'; joyBase.style.top = t.clientY + 'px';
        joyPino.style.transform = 'translate(-50%,-50%)';
      } else {
        olhar.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
    e.preventDefault();
  };
  const onTouchMove = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) {
        let dx = t.clientX - joy.x0, dy = t.clientY - joy.y0;
        const d = Math.hypot(dx, dy), max = 55;
        if (d > max) { dx = dx / d * max; dy = dy / d * max; }
        joy.dx = dx / max; joy.dy = dy / max;
        joyPino.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      } else if (olhar.has(t.identifier)) {
        const o = olhar.get(t.identifier);
        if (!pausado) girar(t.clientX - o.x, t.clientY - o.y, 0.006);
        o.x = t.clientX; o.y = t.clientY;
      }
    }
    e.preventDefault();
  };
  const onTouchEnd = e => {
    for (const t of e.changedTouches) {
      if (t.identifier === joy.id) { joy.id = null; joy.dx = joy.dy = 0; joyBase.style.display = 'none'; }
      const o = olhar.get(t.identifier);
      if (o && o.atirar) { gatilho = false; disparoSolto = true; }
      olhar.delete(t.identifier);
    }
    areaToque.querySelectorAll('.ativo').forEach(b => {
      let aindaTocado = false;
      for (const t of e.touches) if (t.target.closest && t.target.closest('[data-acao]') === b) aindaTocado = true;
      if (!aindaTocado) b.classList.remove('ativo');
    });
    e.preventDefault();
  };

  function adicionarInput() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('pointerlockchange', onLockChange);
    canvas.addEventListener('contextmenu', onCtx);
    if (mobile) {
      areaToque.style.display = 'block';
      areaToque.addEventListener('touchstart', onTouchStart, { passive: false });
      areaToque.addEventListener('touchmove', onTouchMove, { passive: false });
      areaToque.addEventListener('touchend', onTouchEnd, { passive: false });
      areaToque.addEventListener('touchcancel', onTouchEnd, { passive: false });
    }
    window.addEventListener('resize', redimensionar);
  }
  function removerInput() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('mousemove', onMouseMove);
    canvas.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    canvas.removeEventListener('wheel', onWheel);
    document.removeEventListener('pointerlockchange', onLockChange);
    canvas.removeEventListener('contextmenu', onCtx);
    areaToque.removeEventListener('touchstart', onTouchStart);
    areaToque.removeEventListener('touchmove', onTouchMove);
    areaToque.removeEventListener('touchend', onTouchEnd);
    areaToque.removeEventListener('touchcancel', onTouchEnd);
    areaToque.style.display = 'none';
    joyBase.style.display = 'none';
    window.removeEventListener('resize', redimensionar);
  }

  function redimensionar() {
    const w = window.innerWidth, h = window.innerHeight;
    R.setSize(w, h, false);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    camera.aspect = vmCam.aspect = w / h;
    camera.updateProjectionMatrix(); vmCam.updateProjectionMatrix();
  }

  function pausar(v) {
    if (acabou || jog.morto) return;
    pausado = v;
    gatilho = false; mirando = false;
    for (const k in teclas) teclas[k] = false;
    $('pausa').style.display = v ? 'flex' : 'none';
    if (!v && !mobile) canvas.requestPointerLock?.();
    ultimo = performance.now();
  }

  // ---------- loop ----------
  const vecProj = new THREE.Vector3();
  let ultimo = performance.now();
  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    let dt = (agora - ultimo) / 1000;
    ultimo = agora;
    if (dt > 0.05) dt = 0.05;
    if (!pausado) atualizar(dt);
    desenhar(dt);
  }

  function atualizar(dt) {
    tempo += dt;
    const a = armas[atual], st = a.st;

    // movimento
    let f = 0, s = 0;
    if (!jog.morto) {
      if (teclas.KeyW || teclas.ArrowUp) f += 1;
      if (teclas.KeyS || teclas.ArrowDown) f -= 1;
      if (teclas.KeyD || teclas.ArrowRight) s += 1;
      if (teclas.KeyA || teclas.ArrowLeft) s -= 1;
      if (joy.id !== null) { s += joy.dx; f -= joy.dy; }
    }
    const mag = Math.hypot(f, s);
    if (mag > 1) { f /= mag; s /= mag; }
    correndo = (teclas.ShiftLeft || teclas.ShiftRight || (mobile && Math.hypot(joy.dx, joy.dy) > 0.95)) && f > 0.5 && !gatilho && mira < 0.2;
    let vel = 5.2 * st.lenta * (correndo ? 1.45 : 1) * (1 - mira * 0.4) * (jog.curando > 0 ? 0.6 : 1);
    const sy = Math.sin(jog.yaw), cy = Math.cos(jog.yaw);
    mov.x = (-sy * f + cy * s) * vel;
    mov.z = (-cy * f - sy * s) * vel;
    if (!jog.noChao) { mov.x *= 0.92; mov.z *= 0.92; }
    jog.x += mov.x * dt; jog.z += mov.z * dt;
    colidir(jog, RAIO_JOG, jog.y);
    // gravidade / pulo / subir em carros e caixas
    const chao = alturaChao(jog.x, jog.z, RAIO_JOG, jog.y);
    if (jog.noChao && jog.y > chao + 0.01) jog.noChao = false; // saiu da beirada
    if (!jog.noChao) {
      jog.vy -= 22 * dt;
      jog.y += jog.vy * dt;
      if (jog.y <= chao) {
        if (jog.vy < -4) { jog.pousou = Math.min(1, -jog.vy / 12); som.passo(); }
        jog.y = chao; jog.vy = 0; jog.noChao = true;
      }
    }
    jog.pousou = Math.max(0, jog.pousou - dt * 4);
    if (mag > 0.1 && jog.noChao) jog.passo += dt * vel * 1.6;

    // mira assistida / tiro automático
    alvoAssist = null;
    const o = opc();
    if ((o.assist || o.autoTiro) && !jog.morto) alvoAssist = procurarAlvo(st);
    if (o.assist && alvoAssist && alvoAssist.ang < 0.16 && mira < 0.9) {
      // puxa a mira suavemente para o peito/cabeça do zumbi
      const forca = Math.min(1, dt * (mobile ? 4 : 2.2)) * (1 - alvoAssist.ang / 0.16);
      let dy = alvoAssist.yaw - jog.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      jog.yaw += dy * forca;
      jog.pitch += (alvoAssist.pitch - jog.pitch) * forca * 0.8;
    }

    // mira
    mirando = mirando && !correndo && recarregando <= 0;
    mira += ((mirando ? 1 : 0) - mira) * Math.min(1, dt * 12);

    // tiro
    cadencia -= dt;
    trocando = Math.max(0, trocando - dt);
    abrirFogo = Math.max(0, abrirFogo - dt * 2.2);
    const autoDispara = o.autoTiro && alvoAssist && alvoAssist.naMira && a.pente > 0;
    if (!jog.morto && (gatilho || autoDispara) && cadencia <= 0 && recarregando <= 0 && trocando <= 0 && !correndo) {
      if (st.auto || disparoSolto || mobile || autoDispara) { atirar(); disparoSolto = false; }
    }
    if (recarregando > 0) {
      recarregando -= dt;
      hud.rec.style.display = 'block';
      hud.recFill.style.width = ((1 - recarregando / st.recarga) * 100) + '%';
      if (recarregando <= 0) {
        const precisa = st.pente - a.pente, pega = Math.min(precisa, a.reserva);
        a.pente += pega; a.reserva -= pega;
        som.clique();
        atualizarHudArma();
      }
    } else hud.rec.style.display = 'none';
    recuoV *= Math.pow(0.0005, dt);
    if (recuoV > 0.0001) { const r = recuoV * dt * 18; jog.pitch = clamp(jog.pitch + r, -1.45, 1.45); }

    // cura
    if (jog.curando > 0) {
      jog.curando -= dt;
      jog.hp = Math.min(jog.hpMax, jog.hp + 60 * dt / 1.2);
      atualizarHudVida();
    }

    // fluxo
    timerFluxo -= dt;
    if (timerFluxo <= 0) { fluxo(jog.x, jog.z); timerFluxo = 0.3; }

    // zumbis
    let vivos = 0, chefeVivo = null;
    for (let i = zumbis.length - 1; i >= 0; i--) {
      const z = zumbis[i];
      const ud = z.g.userData;
      if (!z.vivo) {
        z.morte += dt;
        ud.corpo.rotation.x = Math.min(Math.PI / 2, z.morte * 5) * -1;
        ud.corpo.position.y = Math.min(z.morte * 3, 1) * 0.2 * z.escala - Math.max(0, z.morte - 1.5) * 0.6;
        if (z.morte > 2.6) { cena.remove(z.g); z.g.userData.mats.forEach(m => m.dispose()); zumbis.splice(i, 1); }
        continue;
      }
      vivos++;
      if (z.tipo === 'chefe') chefeVivo = z;
      const dx = jog.x - z.x, dz = jog.z - z.z, dist = Math.hypot(dx, dz);
      let mx = 0, mz = 0;
      const alcance = z.raio + RAIO_JOG + 0.45;

      if (z.fogo > 0) {
        z.fogo -= dt;
        danoZumbi(z, z.fogoDps * dt, false, z.x, 1, z.z, 'fogo');
        if (Math.random() < dt * 25) particula(z.x + rand(-0.3, 0.3), rand(0.4, 1.6) * z.escala, z.z + rand(-0.3, 0.3), 0, rand(1, 3), 0, 0.4, 0.08, Math.random() < 0.5 ? 0xff6a10 : 0xffc020, -2);
        if (!z.vivo) continue;
      }

      const cuspindo = z.tipo === 'cuspidor' && dist < 14 && dist > 4 && !jog.morto;
      if (cuspindo) {
        z.cdCuspe -= dt;
        if (z.cdCuspe <= 0) {
          z.cdCuspe = rand(2.2, 3.2);
          const m = new THREE.Mesh(geoEsf, matCuspe); m.scale.setScalar(0.16);
          const hy = 1.5 * z.escala, tVoo = dist / 13;
          const p = { tipo: 'cuspe', m, x: z.x, y: hy, z: z.z, vx: dx / dist * 13, vz: dz / dist * 13, vy: (1.2 - hy) / tVoo + 0.5 * 9 * tVoo, t: 3, dano: z.dano };
          m.position.set(p.x, p.y, p.z); cena.add(m);
          projeteis.push(p);
          som.cuspe();
        }
      } else if (dist > alcance * 0.85 && !jog.morto) {
        // segue o flow field
        const cx = clamp(Math.floor(z.x + L), 0, N - 1), cz = clamp(Math.floor(z.z + L), 0, N - 1);
        let bx = 0, bz = 0;
        if (dist < 3.5 || distG[cz * N + cx] >= 1e8) { bx = dx / dist; bz = dz / dist; }
        else {
          let melhor = distG[cz * N + cx], alvoX = 0, alvoZ = 0, achou = false;
          for (const [ox, oz] of VIZ) {
            const nx = cx + ox, nz = cz + oz;
            if (nx < 0 || nz < 0 || nx >= N || nz >= N) continue;
            const v = distG[nz * N + nx];
            if (v < melhor) { melhor = v; alvoX = nx - L + 0.5; alvoZ = nz - L + 0.5; achou = true; }
          }
          if (achou) { const ax = alvoX - z.x, az = alvoZ - z.z, ad = Math.hypot(ax, az) || 1; bx = ax / ad; bz = az / ad; }
          else { bx = dx / dist; bz = dz / dist; }
        }
        mx = bx; mz = bz;
      }
      // separação
      for (const o of zumbis) {
        if (o === z || !o.vivo) continue;
        const sx = z.x - o.x, sz = z.z - o.z, d2 = sx * sx + sz * sz, rr = z.raio + o.raio;
        if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); mx += sx / d * (rr - d) * 2.5; mz += sz / d * (rr - d) * 2.5; }
      }
      const andando = Math.hypot(mx, mz) > 0.05;
      const v = z.vel * (z.ataque > 0 ? 0.3 : 1);
      z.x += mx * v * dt; z.z += mz * v * dt;
      colidir(z, z.raio);
      z.g.position.set(z.x, 0, z.z);
      const yawAlvo = Math.atan2(-dx, -dz);
      let dy = yawAlvo - z.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      z.yaw += dy * Math.min(1, dt * 8);
      z.g.rotation.y = z.yaw;

      // ataque corpo a corpo
      z.cdAtaque -= dt;
      if (z.tipo === 'inchado' && dist < 1.9 && !jog.morto) { z.hp = 0; matar(z, false); continue; }
      if (dist < alcance && z.cdAtaque <= 0 && z.ataque <= 0 && !jog.morto) z.ataque = 0.45;
      if (z.ataque > 0) {
        z.ataque -= dt;
        if (z.ataque <= 0) {
          z.cdAtaque = z.tipo === 'corredor' ? 0.7 : 1.1;
          if (dist < alcance + 0.4) danoJogador(z.dano);
        }
      }

      // animação
      z.fase += dt * v * (z.tipo === 'corredor' ? 3.2 : 2.4);
      const passo = andando ? Math.sin(z.fase) : 0;
      ud.pernaE.rotation.x = passo * 0.7;
      ud.pernaD.rotation.x = -passo * 0.7;
      const golpe = z.ataque > 0 ? Math.sin((1 - z.ataque / 0.45) * Math.PI) * 0.9 : 0;
      ud.bracoE.rotation.x = 1.35 + Math.sin(z.fase * 0.5) * 0.12 + golpe;
      ud.bracoD.rotation.x = 1.45 - Math.sin(z.fase * 0.5) * 0.12 + golpe;
      ud.corpo.rotation.x = -0.12 - (z.tipo === 'corredor' ? 0.25 : 0) - golpe * 0.2;
      ud.corpo.position.y = Math.abs(passo) * 0.05;

      z.flash -= dt;
      const emis = z.flash > 0 ? 0x802020 : z.fogo > 0 ? (Math.random() < 0.5 ? 0x602000 : 0x301000) : 0x000000;
      if (ud.ultimoEmis !== emis) { ud.mats.forEach(m => m.emissive.setHex(emis)); ud.ultimoEmis = emis; }

      z.gemido -= dt;
      if (z.gemido <= 0) { z.gemido = rand(3, 8); if (dist < 22) { if (z.tipo === 'chefe') som.rugido(); else som.gemido(dist); } }
    }
    hud.vivos.textContent = estado === 'onda' ? `Zumbis: ${vivos + filaSpawn.length}` : estado === 'extracao' ? 'VÁ PARA O HELIPONTO' : 'Prepare-se';
    if (chefeVivo) { hud.bossBar.style.display = 'block'; hud.bossFill.style.width = (chefeVivo.hp / chefeVivo.hpMax * 100) + '%'; }

    // projéteis
    for (let i = projeteis.length - 1; i >= 0; i--) {
      const p = projeteis[i];
      p.t -= dt;
      p.vy -= (p.tipo === 'granada' ? 20 : 9) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      let remover = false;
      if (p.tipo === 'granada') {
        if (p.y < 0.12) { p.y = 0.12; p.vy = -p.vy * 0.35; p.vx *= 0.6; p.vz *= 0.6; }
        for (const b of obst) {
          if (p.x > b.minx && p.x < b.maxx && p.z > b.minz && p.z < b.maxz && p.y < b.h) {
            const ex = Math.min(p.x - b.minx, b.maxx - p.x), ez = Math.min(p.z - b.minz, b.maxz - p.z);
            if (ex < ez) { p.vx = -p.vx * 0.4; p.x += p.vx > 0 ? ex + 0.05 : -(ex + 0.05); }
            else { p.vz = -p.vz * 0.4; p.z += p.vz > 0 ? ez + 0.05 : -(ez + 0.05); }
          }
        }
        if (p.t <= 0) { explodir(p.x, p.y + 0.3, p.z, 6.5, 320, 'granada'); remover = true; }
      } else {
        if (Math.random() < 0.6) particula(p.x, p.y, p.z, 0, 0, 0, 0.3, 0.06, 0x9cff3a, 0);
        const dj = Math.hypot(p.x - jog.x, p.z - jog.z);
        if (dj < 0.7 && p.y > jog.y - 0.2 && p.y < jog.y + 2) { danoJogador(p.dano); sangue(p.x, p.y, p.z, 6, 0x9cff3a); remover = true; }
        else if (p.y < 0 || p.t <= 0) { sangue(p.x, 0.1, p.z, 8, 0x9cff3a); remover = true; }
        else for (const b of obst) if (p.x > b.minx && p.x < b.maxx && p.z > b.minz && p.z < b.maxz && p.y < b.h) { remover = true; break; }
      }
      p.m.position.set(p.x, p.y, p.z);
      if (remover) { cena.remove(p.m); projeteis.splice(i, 1); }
    }

    // loot
    for (let i = loots.length - 1; i >= 0; i--) {
      const l = loots[i];
      l.t += dt;
      if (l.m.userData.girar) { l.m.userData.girar.rotation.y += dt * 1.5; l.m.userData.girar.position.y = 0.9 + Math.sin(l.t * 2) * 0.1; }
      else { l.m.rotation.y += dt * 2; l.m.position.y = 0.4 + Math.sin(l.t * 3) * 0.08; }
      const d = Math.hypot(l.x - jog.x, l.z - jog.z);
      if (d < 1.5 && !jog.morto) {
        if (l.tipo === 'grana') { ganho += l.valor; feed(`+${fmt(l.valor)}`, '#6f6'); som.pegar(); }
        else if (l.tipo === 'vida') { jog.hp = Math.min(jog.hpMax, jog.hp + 25); atualizarHudVida(); feed('+25 de vida', '#f88'); som.cura(); }
        else if (l.tipo === 'municao') {
          armas.forEach((ar, k) => { ar.reserva = Math.min(ar.reservaMax, ar.reserva + Math.ceil(ar.st.pente * (k === 0 ? 1.5 : 1.0))); });
          atualizarHudArma(); feed('+Munição', '#fd6'); som.pegar();
        } else if (l.tipo === 'arma') {
          armasAchadas.push(l.valor);
          const t = TIERS[l.valor.tier];
          feed(`${t.nome.toUpperCase()}: ${l.valor.nome}`, t.cor);
          anunciar(`${TIPOS[l.valor.tipo].nome} ${t.nome} na mochila!`, t.cor, 2);
          if (l.valor.tier >= 3) som.raro(); else som.pegar();
        }
        cena.remove(l.m);
        l.m.traverse(o => { if (o.geometry && o.geometry !== geoCaixa) o.geometry.dispose(); });
        loots.splice(i, 1);
      }
    }

    // ondas
    if (estado === 'preparo') {
      timerEstado -= dt;
      hud.onda.textContent = onda === 0 ? `Raid: ${zona.nome}` : `Onda ${onda}/${zona.ondas} concluída`;
      if (timerEstado <= 0) {
        onda++;
        filaSpawn = montarOnda(onda);
        estado = 'onda';
        anunciar(onda === zona.ondas ? `ONDA FINAL ${onda}` : `ONDA ${onda}`, onda === zona.ondas ? '#ff4050' : '#fff');
        som.onda();
      } else if (timerEstado < 3.2 && Math.floor(timerEstado + dt) !== Math.floor(timerEstado)) {
        anunciar(`Próxima onda em ${Math.ceil(timerEstado)}`, '#ccc', 1);
      }
    } else if (estado === 'onda') {
      hud.onda.textContent = `Onda ${onda}/${zona.ondas}`;
      timerSpawn -= dt;
      const maxVivos = Math.min(28, 12 + onda * 1.5);
      if (filaSpawn.length && timerSpawn <= 0 && vivos < maxVivos) {
        spawnZumbi(filaSpawn.shift());
        timerSpawn = Math.max(0.3, 1.1 - onda * 0.07);
      }
      if (!filaSpawn.length && vivos === 0) {
        const bonus = Math.round(60 * onda * zona.recompensa);
        ganho += bonus;
        feed(`Onda ${onda} limpa +${fmt(bonus)}`, '#9f9');
        soltarLoot('municao', 0, 2);
        if (onda % 2 === 0) soltarLoot('vida', 2, 0);
        if (onda >= zona.ondas) {
          estado = 'extracao';
          feixe.visible = true;
          hud.ext.style.display = 'block';
          anunciar('EXTRAÇÃO LIBERADA! Vá ao heliponto', '#40ff80', 4);
          som.raro();
        } else { estado = 'preparo'; timerEstado = 7; }
      }
    } else if (estado === 'extracao') {
      hud.onda.textContent = 'EXTRAÇÃO';
      timerTrickle -= dt;
      if (timerTrickle <= 0 && vivos < 12) { spawnZumbi(Math.random() < 0.3 ? 'corredor' : 'errante'); timerTrickle = 2.2; }
      const dh = Math.hypot(jog.x - CEL_HELI.x, jog.z - CEL_HELI.z);
      if (dh < 4 && !jog.morto) extracao += dt / 6; else extracao = Math.max(0, extracao - dt / 12);
      hud.extFill.style.width = (extracao * 100) + '%';
      feixe.material.opacity = 0.1 + Math.sin(tempo * 4) * 0.05;
      if (extracao >= 1) { anunciar('EXTRAÍDO!', '#40ff80'); terminar(true); return; }
    }
    hud.grana.textContent = fmt(ganho);

    // efeitos
    for (let i = 0; i < MAXP; i++) {
      const p = pData[i];
      if (p.vida <= 0) continue;
      p.vida -= dt;
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02) { p.y = 0.02; p.vx *= 0.5; p.vz *= 0.5; p.vy = 0; }
      const s = p.vida > 0 ? p.tam * Math.min(1, p.vida / p.max * 2) : 0;
      tmpM.compose(tmpV.set(p.x, p.y, p.z), tmpQ, tmpS.set(s, s, s));
      parts.setMatrixAt(i, tmpM);
    }
    parts.instanceMatrix.needsUpdate = true;
    if (parts.instanceColor) parts.instanceColor.needsUpdate = true;
    for (const t of tracers) if (t.vida > 0) { t.vida -= dt; t.m.material.opacity = Math.max(0, t.vida / 0.06) * 0.9; if (t.vida <= 0) t.m.visible = false; }
    for (let i = bolhas.length - 1; i >= 0; i--) {
      const b = bolhas[i];
      b.vida -= dt;
      const k = 1 - b.vida / b.max;
      b.m.scale.setScalar(0.3 + k * b.r);
      b.m.material.opacity = 0.9 * (1 - k);
      b.luz.intensity = 80 * (1 - k);
      if (b.vida <= 0) { cena.remove(b.m); cena.remove(b.luz); b.m.material.dispose(); b.luz.dispose(); bolhas.splice(i, 1); }
    }
    for (const fg of fogos) {
      fg.luz.intensity = 20 + Math.random() * 12;
      if (Math.random() < dt * 30) particula(fg.x + rand(-1.2, 1.2), 1.6, fg.z + rand(-0.6, 0.6), rand(-0.3, 0.3), rand(1.5, 3.5), rand(-0.3, 0.3), rand(0.4, 0.9), rand(0.1, 0.22), Math.random() < 0.6 ? 0xff6a10 : 0xffb020, -1);
    }
    if (anuncioT > 0) { anuncioT -= dt; if (anuncioT <= 0) hud.anuncio.style.opacity = 0; }
    flashDano = Math.max(0, flashDano - dt * 1.5);
    hitmarker -= dt;
    tremor = Math.max(0, tremor - dt * 1.2);
  }

  function desenhar(dt) {
    const a = armas[atual];
    // câmera
    const bob = Math.hypot(mov.x, mov.z) > 0.1 ? 1 : 0;
    camera.position.set(jog.x, (jog.morto ? 0.5 : jog.y + ALTURA_OLHO - jog.pousou * 0.12) + Math.sin(jog.passo * 2) * 0.035 * bob * (1 - mira) * (jog.noChao ? 1 : 0), jog.z);
    camera.rotation.set(jog.pitch + rand(-1, 1) * tremor * 0.03, jog.yaw + rand(-1, 1) * tremor * 0.03, jog.morto ? 0.5 : 0);
    const fovAlvo = 75 / (1 + (a.st.zoom - 1) * mira) + (correndo ? 6 : 0);
    if (Math.abs(camera.fov - fovAlvo) > 0.05) { camera.fov += (fovAlvo - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix(); }
    vmCam.position.copy(camera.position);
    vmCam.quaternion.copy(camera.quaternion);

    // arma na mão
    chute = Math.max(0, chute - dt * 9);
    const comp = a.mesh.userData.comprimento;
    const base = { x: 0.2, y: -0.2, z: -0.5 - comp * 0.3 };
    const ads = { x: 0, y: a.def.tipo === 'sniper' ? -0.11 : -0.125, z: -0.55 - comp * 0.2 };
    const sw = Math.sin(jog.passo) * 0.012 * bob * (1 - mira), sh = Math.abs(Math.cos(jog.passo)) * 0.01 * bob * (1 - mira);
    let px = base.x + (ads.x - base.x) * mira + sw;
    let py = base.y + (ads.y - base.y) * mira - sh - jog.pousou * 0.04 + clamp(jog.vy, -8, 8) * -0.004;
    let pz = base.z + (ads.z - base.z) * mira + chute * 0.05;
    let rx = chute * 0.06, ry = 0.07 * (1 - mira), rz = 0;
    if (recarregando > 0) {
      const k = Math.sin((1 - recarregando / a.st.recarga) * Math.PI);
      rx -= k * 0.7; py -= k * 0.08; rz = k * 0.3;
    }
    if (trocando > 0) py -= (trocando / 0.45) * 0.35;
    if (correndo) { ry = 0.6; rx -= 0.25; px -= 0.04; py -= 0.04; }
    if (jog.curando > 0) py -= 0.3;
    a.mesh.position.set(px, py, pz);
    a.mesh.rotation.set(rx, ry, rz);
    const sniperMira = a.def.tipo === 'sniper' && mira > 0.85;
    a.mesh.visible = !sniperMira && !jog.morto;
    hud.luneta.style.display = sniperMira ? 'block' : 'none';
    a.mesh.traverse(o => { if (o.userData.pulsa) o.scale.setScalar(0.03 * (1 + Math.sin(tempo * 6) * 0.35)); });

    // clarão do tiro
    flashT -= dt;
    if (flashT > 0 && !sniperMira) {
      a.mesh.updateMatrixWorld();
      a.mesh.userData.muzzle.getWorldPosition(muzzleSprite.position);
      muzzleSprite.visible = true;
      muzzleSprite.material.rotation = Math.random() * 6;
      muzzleSprite.scale.setScalar(0.18 + Math.random() * 0.12);
    } else muzzleSprite.visible = false;
    luzTiro.intensity = Math.max(0, luzTiro.intensity - dt * 400);

    R.clear();
    R.render(cena, camera);
    R.clearDepth();
    R.render(vmCena, vmCam);

    // HUD por quadro
    const spread = (a.st.disp * (1 - mira * 0.7) * (Math.hypot(mov.x, mov.z) > 0.1 ? 1.5 : 1) * (1 + Math.min(abrirFogo, 1) * 0.8)) * 900 + 6;
    hud.mira.style.setProperty('--abre', (a.def.tipo === 'sniper' && mira < 0.9 ? 40 : spread) + 'px');
    hud.mira.style.opacity = sniperMira ? 0 : (1 - mira * 0.6);
    hud.mira.classList.toggle('travada', !!(alvoAssist && alvoAssist.naMira));
    hud.hit.style.opacity = hitmarker > 0 ? 1 : 0;
    hud.hit.classList.toggle('cabeca', hitCabeca);
    hud.dano.style.opacity = Math.max(flashDano, jog.hp < 30 ? 0.35 + Math.sin(tempo * 5) * 0.15 : 0);

    const w = window.innerWidth, h = window.innerHeight;
    for (const n of numsPool) {
      if (n.vida <= 0) { if (n.el.style.opacity !== '0') n.el.style.opacity = 0; continue; }
      n.vida -= dt; n.y += dt * 0.8;
      vecProj.set(n.x, n.y, n.z).project(camera);
      if (vecProj.z > 1) { n.el.style.opacity = 0; continue; }
      n.el.style.opacity = Math.min(1, n.vida * 2);
      n.el.style.transform = `translate(${(vecProj.x * 0.5 + 0.5) * w}px, ${(-vecProj.y * 0.5 + 0.5) * h}px)`;
    }

    // minimapa
    const s = 150 / (L * 2);
    mctx.drawImage(mapaBase, 0, 0);
    if (estado === 'extracao') {
      mctx.fillStyle = `rgba(64,255,128,${0.5 + Math.sin(tempo * 5) * 0.3})`;
      mctx.beginPath(); mctx.arc((CEL_HELI.x + L) * s, (CEL_HELI.z + L) * s, 4 * s + 2, 0, 7); mctx.fill();
    }
    for (const l of loots) {
      mctx.fillStyle = l.tipo === 'arma' ? TIERS[l.valor.tier].cor : l.tipo === 'grana' ? '#3f3' : l.tipo === 'vida' ? '#fff' : '#fd3';
      mctx.fillRect((l.x + L) * s - 2, (l.z + L) * s - 2, 4, 4);
    }
    for (const z of zumbis) {
      if (!z.vivo) continue;
      mctx.fillStyle = z.tipo === 'chefe' ? '#f0f' : '#f33';
      const r = z.tipo === 'chefe' ? 4 : z.tipo === 'bruto' ? 3 : 2;
      mctx.fillRect((z.x + L) * s - r / 2, (z.z + L) * s - r / 2, r, r);
    }
    mctx.save();
    mctx.translate((jog.x + L) * s, (jog.z + L) * s);
    mctx.rotate(-jog.yaw);
    mctx.fillStyle = '#4cf';
    mctx.beginPath(); mctx.moveTo(0, -6); mctx.lineTo(4, 4); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill();
    mctx.restore();
  }

  // ---------- início ----------
  $('pausa').style.display = 'none';
  hud.bossBar.style.display = 'none';
  hud.ext.style.display = 'none';
  hud.rec.style.display = 'none';
  hud.feed.innerHTML = '';
  hud.anuncio.style.opacity = 0;
  redimensionar();
  equiparVisual();
  atualizarHudVida();
  atualizarHudItens();
  adicionarInput();
  if (!mobile) canvas.requestPointerLock?.();
  anunciar(zona.nome.toUpperCase(), '#fff', 3);
  raf = requestAnimationFrame(t => { ultimo = t; quadro(t); });

  if (location.search.includes('debug')) window.__raid = { jog, zumbis, armas, spawnZumbi, set onda(v) { onda = v; }, get estado() { return estado; }, fire(v) { gatilho = v; disparoSolto = true; }, pular() { timerEstado = 0; }, matarTodos() { filaSpawn = []; zumbis.forEach(z => z.vivo && matar(z, false)); }, mirar(v) { mirando = v; }, pularAgora: pular, get alvo() { return alvoAssist; } };
  return {
    pausar,
    abandonar() { pausado = false; terminar(false); },
    continuar() { pausar(false); },
  };
}
