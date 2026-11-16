// Raid em primeira pessoa: mapa, jogador, armas, zumbis, ondas e extração.
import * as THREE from 'three';
import { TIPOS, TIERS, ZUMBIS, BOSS_PESOS, MODIFICADORES, EVENTOS, CARTAS, MODS, MOD_POR_ID, stats, rolarTier, novaArma, fmt } from './dados.js';
import { criarArma, criarZumbi, criarFacao, criarTorreta, texCaixa, texBrilho, mesclar } from './modelos.js';
import { montarCenario } from './cenarios.js';
import { modeloBau } from './cen_util.js';
import { texChaoZona } from './terreno.js';
import * as VIS from './visual.js';
import { som, ambiente, pararAmbiente } from './audio.js';

const ALTURA_OLHO = 1.62;
const RAIO_JOG = 0.4;

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
const escolher = a => a[Math.floor(Math.random() * a.length)];

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

export function iniciarRaid({ canvas, zona, loadout, opcoes, mobile, onFim, modo = 'raid', mods = [] }) {
  const R = pegarRenderer(canvas);
  const DBG = location.search.includes('debug'), T0 = performance.now();
  const marca = n => { if (DBG) console.log(`[raid] ${n}: ${(performance.now() - T0).toFixed(0)} ms`); };
  const L = zona.tam || 42;        // metade do tamanho do mapa (m)
  const N = L * 2;                 // células do grid de navegação (1 m)
  const CEL_HELI = { x: 0, z: -(L - 14) };
  const INICIO = { x: 0, z: L - 14 };
  const mod = new Set(mods);
  const sobrevivencia = modo === 'sobrevivencia';
  const per = loadout.pericias || {};
  const nv = k => per[k] || 0;
  const bonusMods = MODIFICADORES.filter(m => mod.has(m.id)).reduce((a, m) => a + m.bonus, 0);
  const recompensa = zona.recompensa * (1 + bonusMods);
  const TOTAL_ONDAS = sobrevivencia ? Infinity : zona.ondas;
  const qual = VIS.qualidade(opcoes, mobile);
  const alto = qual === 'alto';
  const cena = new THREE.Scene();
  const corCeu = mod.has('lua') ? 0x2a0404 : zona.ceu;
  const corNeblina = mod.has('lua') ? 0x3a0808 : zona.neblina;
  cena.background = new THREE.Color(corNeblina);
  cena.fog = new THREE.FogExp2(corNeblina, mod.has('escuridao') ? 0.07 : 0.03);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.05, 200);
  camera.rotation.order = 'YXZ';
  cena.add(camera);

  // Cena separada só para a arma na mão (não atravessa paredes)
  const vmCena = new THREE.Scene();
  const vmCam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
  vmCena.add(vmCam);
  vmCena.add(new THREE.AmbientLight(0xffffff, 0.35));
  vmCena.add(new THREE.HemisphereLight(mod.has('lua') ? 0xff8070 : zona.luz, 0x201810, 0.6));
  const vmSol = new THREE.DirectionalLight(0xfff0e0, 2.4);
  vmSol.position.set(0.6, 1, 0.4);
  vmCena.add(vmSol);
  const vmLuzTier = new THREE.PointLight(0xffffff, 0.8, 1.4, 1);
  vmLuzTier.position.set(0.2, -0.1, -0.5);
  vmCena.add(vmLuzTier);
  const vmLuzTiro = new THREE.PointLight(0xffb060, 0, 2, 1);
  vmLuzTiro.position.set(0.15, -0.1, -0.9);
  vmCena.add(vmLuzTiro);

  // ---------- luzes ----------
  const luaDir = new THREE.Vector3(-0.45, 0.55, -0.7).normalize();
  const hemi = new THREE.HemisphereLight(mod.has('lua') ? 0xff4030 : zona.luz, 0x2a2420, mod.has('escuridao') ? 0.3 : 0.75);
  cena.add(hemi);
  const lua = new THREE.DirectionalLight(mod.has('lua') ? 0xff7060 : zona.luz, alto ? 0.8 : 0.5);
  lua.position.copy(luaDir).multiplyScalar(50);
  cena.add(lua); cena.add(lua.target);
  if (alto) {
    lua.castShadow = true;
    lua.shadow.mapSize.set(2048, 2048);
    Object.assign(lua.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 120 });
    lua.shadow.bias = -0.0006;
  }
  const lanterna = new THREE.SpotLight(0xfff4dd, mod.has('escuridao') ? 18 : 30, mod.has('escuridao') ? 22 : 40, 0.5, 0.6, 1.4);
  lanterna.position.set(0.15, -0.1, 0);
  camera.add(lanterna);
  const alvoLanterna = new THREE.Object3D();
  alvoLanterna.position.set(0, -0.05, -5);
  camera.add(alvoLanterna);
  lanterna.target = alvoLanterna;
  if (alto) { lanterna.castShadow = true; lanterna.shadow.mapSize.set(512, 512); lanterna.shadow.bias = -0.0008; lanterna.shadow.camera.near = 0.5; }
  const luzTiro = new THREE.PointLight(0xffc070, 0, 14, 1.5);
  camera.add(luzTiro);

  const descartaveis = [];
  const reg = o => { descartaveis.push(o); return o; };
  const sombra = (o, recebe = true) => { if (alto) o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = recebe; } }); return o; };

  // céu, clima e névoa
  const nCeu = new THREE.Color(corNeblina);
  const ceu = VIS.criarCeu(cena, new THREE.Color(corCeu).multiplyScalar(0.6), nCeu.clone().multiplyScalar(1.3), nCeu.clone().multiplyScalar(1.6), luaDir);
  const clima = VIS.criarClima(cena, zona.id, qual, mod.has('lua'));
  const nevoa = VIS.criarNevoa(cena, new THREE.Color(corNeblina).multiplyScalar(2.2).getHex(), qual);
  const marcas = VIS.criarMarcas(cena, qual);
  let relampago = 0, proxRelampago = rand(6, 14);

  // ---------- mapa ----------
  const obst = [];      // {minx,maxx,minz,maxz,h,tipo,mesh}
  const tCaixa = reg(texCaixa());
  const matCaixa = new THREE.MeshLambertMaterial({ map: tCaixa });
  const geoCaixa = new THREE.BoxGeometry(1, 1, 1);
  const matVC = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }); // peças mescladas com cor por vértice
  const malhaVC = (partes, mat = matVC) => sombra(new THREE.Mesh(mesclar(partes), mat));
  const malhaMat = (partes, mat, uvEsc = 1) => { const m = new THREE.Mesh(mesclar(partes, uvEsc), mat); cena.add(sombra(m)); return m; };
  const fogos = [], piscas = [], neons = [], anim = [], tinta = [], arvores = [], cofres = [], aoCompletar = [], ajustes = {};
  const quebraveis = [], interativos = [], baus = [], objetivos = [], portas = [], portasAnim = [], perigos = [], alarmes = [], vapores = [], semaforos = [];
  const pouco = qual === 'baixo' ? 0.5 : 1;
  let energia = 1;      // 0 = apagão (lâmpadas apagadas)

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
    return Math.abs(cx) + w / 2 < L - 5 && Math.abs(cz) + d / 2 < L - 5;
  }

  // ---- luzes: só algumas luzes reais (pool) seguem as fontes mais próximas do jogador
  const fontes = [];
  function fonte(x, y, z, cor, int, dist, o = {}) {
    const f = { x, y, z, cor: new THREE.Color(cor), int, base: int, dist, fase: rand(0, 6), off: false, tF: rand(0.5, 4), d2: 0, ...o };
    fontes.push(f);
    return f;
  }
  const nPool = qual === 'alto' ? 9 : qual === 'medio' ? 6 : 4;
  const pool = [];
  for (let i = 0; i < nPool; i++) { const l = new THREE.PointLight(0xffffff, 0, 20, 1.4); cena.add(l); pool.push({ l, f: null }); }
  let tPool = 0;
  function atualizarFontes(dt) {
    tPool -= dt;
    if (tPool <= 0) {
      tPool = 0.12;
      for (const f of fontes) f.d2 = (f.x - jog.x) ** 2 + (f.z - jog.z) ** 2;
      const ord = fontes.filter(f => f.int > 0).sort((a, b) => a.d2 - b.d2);
      pool.forEach((p, i) => {
        const f = ord[i] && ord[i].d2 < 90 * 90 ? ord[i] : null;
        p.f = f;
        if (f) { p.l.position.set(f.x, f.y, f.z); p.l.color.copy(f.cor); p.l.distance = f.dist; }
      });
    }
    for (const p of pool) {
      const f = p.f;
      if (!f) { p.l.intensity = 0; continue; }
      let k = 1;
      if (f.fogo) k = 0.7 + Math.random() * 0.5;
      if (f.pisca) { f.tF -= dt; if (f.tF <= 0) { f.off = !f.off; f.tF = f.off ? rand(0.04, 0.22) : rand(1, 5); } if (f.off) k = 0.05; }
      if (f.blink) k = Math.floor(tempo * (f.rapido || 3) + f.fase) % 2 === 0 ? 1 : 0.05;
      if (f.lamp) k *= energia;
      p.l.intensity = f.int * k;
    }
  }

  // ---- interativos (E / botão ✋)
  function registrarInter(d) { interativos.push(d); return d; }

  // ---- peças quebráveis (barris, bombas, tubos, ovos)
  function quebravel(o, cfg) { o.hp = cfg.hp; o.cfg = cfg; quebraveis.push(o); }

    // prédios com fachadas, telhado, lojas e letreiros
  const fachadas = zona.id !== 'centro' ? [] : [0, 1, 2, 3, 4].map(i => { const f = VIS.texFachada(i); reg(f.map); reg(f.emissiveMap); return f; });
  const texTeto = reg(VIS.texTelhado());
  const matTeto = new THREE.MeshLambertMaterial({ map: texTeto });
  const texLojas = zona.id !== 'centro' ? [] : [VIS.texLoja(), VIS.texLoja(), VIS.texLoja()].map(reg);
  const NOMES = { suburbio: ['FARMÁCIA', 'MERCADO', 'BAR', 'LANCHES', 'PADARIA'], centro: ['HOTEL', 'CINEMA', 'BAR 24H', 'BANCO', 'BOATE'],
    lab: ['X-13', 'BIOLAB', 'SETOR C', 'QUARENTENA'], base: ['QG', 'ARSENAL', 'ENFERMARIA', 'HANGAR'], ninho: ['HOSPITAL', 'IGREJA', 'MOTEL', 'ABRIGO'] }[zona.id] || ['BAR'];
  const CORES_NEON = ['#ff3a60', '#40e0ff', '#ffd040', '#60ff80', '#ff60ff', '#ff8020'];
  let nLetreiros = 0;
  function matFachada(i, rx, ry) {
    const f = fachadas[i];
    const map = f.map.clone(), em = f.emissiveMap.clone();
    map.needsUpdate = em.needsUpdate = true;
    map.repeat.set(rx, ry); em.repeat.set(rx, ry);
    reg(map); reg(em);
    return new THREE.MeshLambertMaterial({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: mod.has('escuridao') ? 0.6 : 1 });
  }
  function predio(cx, cz, w, d, h, faces) {
    const est = Math.floor(Math.random() * fachadas.length);
    const ry = Math.max(1, Math.round(h / 9)), mx = matFachada(est, Math.max(1, Math.round(d / 7)), ry), mz = matFachada(est, Math.max(1, Math.round(w / 7)), ry);
    const m = new THREE.Mesh(geoCaixa, [mx, mx, matTeto, matTeto, mz, mz]);
    m.scale.set(w, h, d);
    m.position.set(cx, h / 2, cz);
    cena.add(sombra(m));
    addObst(cx, cz, w, d, h, 'predio', m);
    // mureta e coisas no telhado
    const pt = [];
    const cor = 0x3a3836;
    pt.push({ w: w, h: 0.6, d: 0.25, x: 0, y: h + 0.3, z: -d / 2 + 0.12, cor }, { w: w, h: 0.6, d: 0.25, x: 0, y: h + 0.3, z: d / 2 - 0.12, cor },
      { w: 0.25, h: 0.6, d: d, x: -w / 2 + 0.12, y: h + 0.3, z: 0, cor }, { w: 0.25, h: 0.6, d: d, x: w / 2 - 0.12, y: h + 0.3, z: 0, cor });
    for (let i = 0; i < Math.floor(rand(1, 4)); i++) pt.push({ w: rand(0.8, 1.6), h: rand(0.6, 1.0), d: rand(0.8, 1.4), x: rand(-w / 3, w / 3), y: h + 0.4, z: rand(-d / 3, d / 3), cor: 0x6a6e72 });
    if (Math.random() < 0.4) pt.push({ g: 'cil', w: 1.6, h: 1.8, d: 1.6, x: rand(-w / 4, w / 4), y: h + 1.6, z: rand(-d / 4, d / 4), cor: 0x4a3a2a }, { w: 0.1, h: 1.2, d: 0.1, x: 0, y: h + 0.6, z: 0, cor: 0x2a2a2a });
    if (Math.random() < 0.3) pt.push({ w: 0.08, h: 3, d: 0.08, x: rand(-w / 3, w / 3), y: h + 1.5, z: rand(-d / 3, d / 3), cor: 0x8a8a8a });
    const topo = malhaVC(pt);
    topo.position.set(cx, 0, cz);
    cena.add(topo);
    // lojas no térreo e letreiros de neon nas faces voltadas para a rua
    for (const [nx, nz] of faces) {
      const larg = Math.min(nx ? d : w, 8);
      const loja = new THREE.Mesh(new THREE.PlaneGeometry(larg, 3.4), new THREE.MeshLambertMaterial({ map: escolher(texLojas) }));
      loja.position.set(cx + nx * (w / 2 + 0.02), 1.7, cz + nz * (d / 2 + 0.02));
      loja.rotation.y = Math.atan2(nx, nz);
      cena.add(loja);
      const toldo = new THREE.Mesh(geoCaixa, new THREE.MeshLambertMaterial({ color: escolher([0x8a2020, 0x204a8a, 0x2a6a2a, 0x7a5a20]) }));
      toldo.scale.set(nx ? 1.2 : larg, 0.12, nz ? 1.2 : larg);
      toldo.position.set(cx + nx * (w / 2 + 0.6), 3.55, cz + nz * (d / 2 + 0.6));
      toldo.rotation[nx ? 'z' : 'x'] = (nx || nz) * -0.25;
      cena.add(toldo);
      if (nLetreiros < (qual === 'baixo' ? 4 : 9) && Math.random() < 0.7) {
        nLetreiros++;
        const corN = escolher(CORES_NEON);
        const placa = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: reg(VIS.texLetreiro(escolher(NOMES), corN)), toneMapped: false }));
        placa.position.set(cx + nx * (w / 2 + 0.05), 4.3, cz + nz * (d / 2 + 0.05));
        placa.rotation.y = Math.atan2(nx, nz);
        cena.add(placa);
        neons.push({ m: placa, pisca: Math.random() < 0.45, t: rand(0, 5) });
      }
    }
  }
  // carros detalhados (peças mescladas)
  const coresCarro = [0x7a1a1a, 0x1a3a6a, 0x2a2a2a, 0x8a8a8a, 0x5a5a20, 0x1a4a2a, 0xa06010, 0xd0d0d0, 0x3a1a4a];
  function carro(cx, cz, giro, queimado) {
    const cor = queimado ? 0x1c1612 : escolher(coresCarro), vidro = queimado ? 0x050505 : 0x0e141c, preto = 0x111111, cromo = queimado ? 0x2a2a2a : 0x9a9a9a;
    const p = [];
    p.push({ w: 4.2, h: 0.55, d: 1.85, x: 0, y: 0.6, cor }, { w: 4.25, h: 0.12, d: 1.88, x: 0, y: 0.35, cor: preto });
    p.push({ w: 2.2, h: 0.55, d: 1.7, x: -0.25, y: 1.15, cor }, { w: 2.25, h: 0.4, d: 1.72, x: -0.25, y: 1.17, cor: vidro });
    p.push({ w: 0.6, h: 0.45, d: 1.6, x: 0.95, y: 1.05, rz: 0.8, cor: vidro }, { w: 0.5, h: 0.4, d: 1.6, x: -1.45, y: 1.05, rz: -0.7, cor: vidro });
    p.push({ w: 0.15, h: 0.25, d: 1.9, x: 2.12, y: 0.55, cor: cromo }, { w: 0.15, h: 0.25, d: 1.9, x: -2.12, y: 0.55, cor: cromo });
    for (const s of [-1, 1]) {
      p.push({ w: 0.06, h: 0.12, d: 0.35, x: 2.18, y: 0.72, z: s * 0.65, cor: queimado ? preto : 0xf0f0d0 });
      p.push({ w: 0.06, h: 0.12, d: 0.3, x: -2.18, y: 0.72, z: s * 0.65, cor: queimado ? preto : 0x9a1010 });
      p.push({ w: 0.02, h: 0.4, d: 0.02, x: 0.2, y: 0.75, z: s * 0.93, cor: preto }, { w: 0.02, h: 0.4, d: 0.02, x: -0.8, y: 0.75, z: s * 0.93, cor: preto });
      p.push({ w: 0.12, h: 0.1, d: 0.12, x: 0.55, y: 1.0, z: s * 1.0, cor });
      for (const x of [1.3, -1.3]) {
        p.push({ g: 'cil', w: 0.72, h: 0.26, d: 0.72, x, y: 0.36, z: s * 0.85, rx: Math.PI / 2, cor: preto });
        p.push({ g: 'cil', w: 0.4, h: 0.27, d: 0.4, x, y: 0.36, z: s * 0.85, rx: Math.PI / 2, cor: cromo });
      }
    }
    if (!queimado && Math.random() < 0.5) p.push({ w: 0.9, h: 0.05, d: 0.7, x: 1.3, y: 0.9, z: 0, rz: 0.4, cor }); // capô aberto
    if (queimado) for (let i = 0; i < 8; i++) p.push({ w: rand(0.3, 0.8), h: 0.02, d: rand(0.3, 0.8), x: rand(-1.8, 1.8), y: 0.89, z: rand(-0.8, 0.8), cor: 0x5a3010 });
    const m = malhaVC(p);
    m.position.set(cx, 0, cz);
    m.rotation.y = (giro ? Math.PI / 2 : 0) + rand(-0.06, 0.06);
    cena.add(m);
    addObst(cx, cz, giro ? 1.9 : 4.2, giro ? 4.2 : 1.9, 1.65, 'carro', m);
    if (queimado) {
      const f = fonte(cx, 2.2, cz, 0xff6a20, 25, 16, { fogo: true });
      fogos.push({ fonte: f, x: cx, z: cz, larg: 1.2 });
    }
    return m;
  }

  // peças do cenário usadas pelos construtores de zona
  function decorar(fabrica, n, raio = L - 10) {
    for (let i = 0, t = 0; i < n && t < n * 20; t++) {
      const x = rand(-raio, raio), z = rand(-raio, raio);
      if (!livre(x, z, 0.8, 0.8, 0.4)) continue;
      const o = fabrica(); o.position.set(x, 0, z); o.rotation.y = rand(0, 6.28); cena.add(o); i++;
    }
  }
  function espalhar(tipo, n, raio, cx0 = 0, cz0 = 0) {
    const lim = L - 10;
    let feitos = 0, tent = 0;
    while (feitos < n && tent++ < n * 40 + 40) {
      const cx = clamp(cx0 + rand(-raio, raio), -lim, lim), cz = clamp(cz0 + rand(-raio, raio), -lim, lim);
      if (tipo === 'caixa') {
        const s = rand(1.0, 1.4);
        if (!livre(cx, cz, s, s, 2.2)) continue;
        const pilha = Math.random() < 0.4 ? 2 : 1;
        for (let i = 0; i < pilha; i++) {
          const m = new THREE.Mesh(geoCaixa, matCaixa);
          m.scale.setScalar(s * (i ? 0.85 : 1));
          m.position.set(cx + rand(-0.05, 0.05), s / 2 + i * s * 0.92, cz);
          m.rotation.y = rand(-0.2, 0.2);
          cena.add(sombra(m));
        }
        addObst(cx, cz, s, s, s * pilha, 'caixa');
      } else if (tipo === 'barreira') {
        const giro = Math.random() < 0.5, w = giro ? 0.6 : 3, d = giro ? 3 : 0.6;
        if (!livre(cx, cz, w, d, 2.5)) continue;
        const p = [{ w: 3, h: 0.35, d: 0.7, x: 0, y: 0.175, cor: 0x8a8a82 }, { w: 3, h: 0.65, d: 0.32, x: 0, y: 0.67, cor: 0x92928a }];
        for (let i = 0; i < 4; i++) p.push({ w: 0.25, h: 0.2, d: 0.33, x: -1.1 + i * 0.75, y: 0.8, rz: 0.6, cor: i % 2 ? 0xd0a020 : 0x1a1a1a });
        const m = malhaVC(p);
        m.position.set(cx, 0, cz); m.rotation.y = giro ? Math.PI / 2 : 0;
        cena.add(m);
        addObst(cx, cz, w, d, 1.0, 'barreira');
      } else if (tipo === 'sacos') {
        const giro = Math.random() < 0.5, comp = rand(2.4, 3.6), w = giro ? 0.5 : comp, d = giro ? comp : 0.5;
        if (!livre(cx, cz, w, d, 2.5)) continue;
        const sacos = VIS.sacosDeAreia(comp);
        sacos.position.set(cx, 0, cz); sacos.rotation.y = giro ? Math.PI / 2 : 0;
        cena.add(sombra(sacos));
        addObst(cx, cz, w, d, 0.9, 'barreira');
      } else if (tipo === 'barril') {
        if (!livre(cx, cz, 0.84, 0.84, 2)) continue;
        const p = [
          { g: 'cil', w: 0.84, h: 1.15, d: 0.84, y: 0.575, cor: 0xb02010 },
          { g: 'cil', w: 0.87, h: 0.06, d: 0.87, y: 0.3, cor: 0x7a1408 }, { g: 'cil', w: 0.87, h: 0.06, d: 0.87, y: 0.85, cor: 0x7a1408 },
          { g: 'cil', w: 0.86, h: 0.12, d: 0.86, y: 0.6, cor: 0xffd020 },
          { g: 'cil', w: 0.7, h: 0.02, d: 0.7, y: 1.16, cor: 0x5a1008 }, { g: 'cil', w: 0.12, h: 0.06, d: 0.12, x: 0.2, y: 1.18, cor: 0x3a3a3a },
        ];
        const g = malhaVC(p);
        g.position.set(cx, 0, cz);
        cena.add(g);
        const o = addObst(cx, cz, 0.84, 0.84, 1.15, 'barril', g);
        quebravel(o, { hp: 40, explode: { raio: 5.5, dano: 220 } });
      } else if (tipo === 'cacamba') {
        const giro = Math.random() < 0.5;
        if (!livre(cx, cz, giro ? 1.2 : 2, giro ? 2 : 1.2, 2.2)) continue;
        const c = VIS.cacamba(); c.position.set(cx, 0, cz); c.rotation.y = giro ? Math.PI / 2 : 0; cena.add(sombra(c));
        addObst(cx, cz, giro ? 1.2 : 2, giro ? 2 : 1.2, 1.2, 'caixa');
      }
      feitos++;
    }
  }
  function espalharBaus(n, estilos, raio, cx0 = 0, cz0 = 0) {
    let feitos = 0, tent = 0;
    const lim = L - 10;
    while (feitos < n && tent++ < n * 60) {
      const x = clamp(cx0 + rand(-raio, raio), -lim, lim), z = clamp(cz0 + rand(-raio, raio), -lim, lim);
      if (!livre(x, z, 1.4, 1.4, 1.2)) continue;
      bau({ x, z, rot: rand(0, 6.28), estilo: escolher(estilos) });
      feitos++;
    }
  }
  function poste(px, pz, quebrado, rot = 0) {
    const p = VIS.poste(quebrado);
    p.position.set(px, 0, pz); p.rotation.y = rot;
    cena.add(sombra(p));
    if (!quebrado) fonte(px + Math.cos(rot) * 1.2, 5.6, pz - Math.sin(rot) * 1.2, 0xffd9a0, 30, 20, { lamp: true });
    addObst(px, pz, 0.3, 0.3, 6, 'poste');
    return p;
  }
  function barrilFogo(x, z) {
    if (!livre(x, z, 0.7, 0.7, 1)) return;
    const b = VIS.barrilFogo();
    b.remove(b.userData.luz);
    b.position.set(x, 0, z); cena.add(b);
    addObst(x, z, 0.66, 0.66, 0.9, 'caixa');
    const f = fonte(x, 1.4, z, 0xff7020, 18, 11, { fogo: true });
    fogos.push({ fonte: f, x, z, larg: 0.25, y: 0.95 });
  }
  function viatura(cx, cz, giro) {
    const v = VIS.viatura();
    v.remove(v.userData.luz);
    v.position.set(cx, 0, cz); v.rotation.y = giro ? Math.PI / 2 : 0;
    cena.add(sombra(v));
    addObst(cx, cz, giro ? 1.9 : 4.3, giro ? 4.3 : 1.9, 1.6, 'carro', v);
    const f = fonte(cx, 2.4, cz, 0xff2020, 20, 14, {});
    piscas.push({ vermelho: v.userData.vermelho, azul: v.userData.azul, fonte: f });
    return v;
  }
  function semaforo(x, z) {
    const m = malhaVC([{ w: 0.18, h: 5, d: 0.18, x: 0, y: 2.5, z: 0, cor: 0x3a3a38 }, { w: 0.5, h: 1.3, d: 0.4, x: 0, y: 4.8, z: 0, cor: 0x1a1a1a }]);
    m.position.set(x, 0, z); cena.add(m);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb020, toneMapped: false }));
    lamp.scale.setScalar(0.14); lamp.position.set(x, 4.8, z + 0.22); cena.add(lamp);
    semaforos.push(lamp);
    addObst(x, z, 0.3, 0.3, 5, 'poste');
  }
  function mastro(x, z) {
    const m = malhaVC([{ g: 'cil', w: 0.18, h: 9, d: 0.18, x: 0, y: 4.5, z: 0, cor: 0xb0b0b0 }, { g: 'esf', w: 0.3, h: 0.3, d: 0.3, x: 0, y: 9.1, z: 0, cor: 0xd0b020 }]);
    m.position.set(x, 0, z); cena.add(m);
    addObst(x, z, 0.4, 0.4, 9, 'poste');
    const geo = new THREE.PlaneGeometry(3.2, 1.9, 14, 6);
    const bandeira = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: zona.id === 'base' ? 0x3a5a2a : 0x8a2a2a, side: THREE.DoubleSide }));
    bandeira.position.set(x + 1.7, 8.0, z); cena.add(bandeira);
    const base0 = geo.attributes.position.array.slice();
    anim.push((dt, t) => {
      const p = geo.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) { const kx = (base0[i] + 1.6) / 3.2; p[i + 2] = Math.sin(base0[i] * 2.2 - t * 5) * 0.28 * kx; p[i + 1] = base0[i + 1] - Math.sin(base0[i] * 1.5 - t * 4) * 0.05 * kx; }
      geo.attributes.position.needsUpdate = true;
    });
  }
  function vapor(x, z) { vapores.push({ x, z, t: rand(0, 1) }); }
  function corvos(n, altura) {
    const geoA = new THREE.BoxGeometry(1, 0.04, 0.4), matC = new THREE.MeshBasicMaterial({ color: 0x0a0a0c });
    const lista = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const corpo = new THREE.Mesh(geoCaixa, matC); corpo.scale.set(0.15, 0.12, 0.4); g.add(corpo);
      const aE = new THREE.Mesh(geoA, matC), aD = new THREE.Mesh(geoA, matC);
      aE.position.x = -0.5; aD.position.x = 0.5; g.add(aE, aD);
      cena.add(g);
      lista.push({ g, aE, aD, cx: rand(-L * 0.6, L * 0.6), cz: rand(-L * 0.6, L * 0.6), r: rand(10, 24), v: rand(0.25, 0.5) * (Math.random() < 0.5 ? 1 : -1), a: rand(0, 6.28), y: altura + rand(-4, 6), fase: rand(0, 6) });
    }
    anim.push((dt, t) => lista.forEach(c => {
      c.a += c.v * dt;
      const x = c.cx + Math.cos(c.a) * c.r, z = c.cz + Math.sin(c.a) * c.r;
      c.g.position.set(x, c.y + Math.sin(t * 0.7 + c.fase) * 1.2, z);
      c.g.rotation.y = -c.a + (c.v > 0 ? 0 : Math.PI) - Math.PI / 2;
      const f = Math.sin(t * 9 + c.fase) * 0.6;
      c.aE.rotation.z = f; c.aD.rotation.z = -f;
    }));
  }

  // ---- portas
  function porta(def) {
    const esp = 0.28, h = def.h || 3, eixoX = def.eixo === 'x';
    const dw = eixoX ? def.w : esp, dd = eixoX ? esp : def.w;
    const mat = new THREE.MeshLambertMaterial({ color: def.cor ?? 0x5a4632 });
    const slab = new THREE.Mesh(geoCaixa, mat);
    slab.scale.set(dw, h, dd);
    const piv = new THREE.Group();
    if (def.modo === 'gira') {
      piv.position.set(eixoX ? def.x - def.w / 2 : def.x, h / 2, eixoX ? def.z : def.z - def.w / 2);
      slab.position.set(eixoX ? def.w / 2 : 0, 0, eixoX ? 0 : def.w / 2);
    } else piv.position.set(def.x, h / 2, def.z);
    piv.add(slab);
    const maca = new THREE.Mesh(geoCaixa, new THREE.MeshLambertMaterial({ color: 0xc8a040 }));
    maca.scale.set(eixoX ? 0.12 : esp + 0.12, 0.12, eixoX ? esp + 0.12 : 0.12);
    maca.position.set(slab.position.x + (eixoX ? def.w * 0.38 : 0), 0, slab.position.z + (eixoX ? 0 : def.w * 0.38));
    piv.add(maca);
    if (def.trancada) { // faixa de aviso nas portas trancadas
      const fx = new THREE.Mesh(geoCaixa, new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false }));
      fx.scale.set(eixoX ? def.w * 0.7 : esp + 0.04, 0.12, eixoX ? esp + 0.04 : def.w * 0.7); fx.position.set(slab.position.x, h * 0.28, slab.position.z); piv.add(fx);
    }
    cena.add(sombra(piv));
    const o = addObst(def.x, def.z, dw, dd, h, 'porta');
    const p = { def, piv, slab, o, aberta: false, anim: 0, trancada: !!def.trancada, chave: def.chave, x: def.x, z: def.z, eixoX, w: def.w, h };
    p.inter = registrarInter({ tipo: 'porta', x: def.x, z: def.z, r: Math.max(2.6, def.w * 0.55 + 1.4),
      label: () => p.aberta ? null : p.trancada ? 'Trancada' : (def.aviso || 'Abrir porta'), usar: () => abrirPorta(p) });
    portas.push(p);
    return p;
  }
  function abrirPorta(p) {
    if (p.aberta) return;
    if (p.trancada) { feed(`Trancada! Cumpra o objetivo: ${zona.objetivo.nome}.`, '#ff8a60'); som.seco(); return; }
    p.aberta = true; p.anim = 0.0001;
    const i = obst.indexOf(p.o); if (i >= 0) obst.splice(i, 1);
    refazerGrid(); desenharMapaBase();
    som.porta(p.def.modo === 'desliza');
    portasAnim.push(p);
  }

  // ---- baús
  function bau(def) {
    const g = modeloBau(API, def.estilo || 'madeira');
    const y = def.y || 0;
    g.position.set(def.x, y, def.z); g.rotation.y = def.rot || 0;
    cena.add(sombra(g));
    if (!def.y) { const t = g.userData.tam * 0.85; addObst(def.x, def.z, t, t, g.userData.altura * 0.8, 'bau'); }
    const cor = def.cofre ? 0xff4040 : def.premium ? 0xffd040 : 0x60c8ff;
    const col = new THREE.Mesh(geoColuna, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    col.position.set(def.x, y + 2.4, def.z); cena.add(col);
    const b = { def, g, aberto: false, x: def.x, z: def.z, y, col, premium: !!def.premium, cofre: !!def.cofre, trancado: !!def.cofre };
    b.inter = registrarInter({ tipo: 'bau', x: def.x, z: def.z, y, r: 2.6,
      label: () => b.aberto ? null : b.trancado ? 'Cofre trancado' : def.cofre ? 'Abrir cofre' : 'Abrir ' + (def.estilo === 'armario' ? 'armário' : def.estilo === 'casulo' ? 'casulo' : 'baú'),
      usar: () => abrirBau(b) });
    baus.push(b);
    return b;
  }
  const geoColuna = new THREE.CylinderGeometry(0.45, 0.45, 4.8, 12, 1, true);

  // ---- objetivo da zona
  const objTotal = zona.objetivo ? zona.objetivo.qtd : 0;
  let objFeitos = 0, objCompleto = false;
  function objetivo(def) {
    const o = { def, mesh: def.mesh, x: def.x, z: def.z, ligado: false, canal: 0, tCanal: 0 };
    o.inter = registrarInter({ tipo: 'objetivo', x: def.x, z: def.z, r: 3, label: () => o.ligado ? null : o.canal > 0 ? 'Ativando... fique perto!' : def.verbo, usar: () => iniciarObjetivo(o) });
    objetivos.push(o);
    return o;
  }
  function alarme(def) {
    const al = { def, x: def.x, z: def.z, usado: false, t: 0, f: null };
    al.inter = registrarInter({ tipo: 'alarme', x: def.x, z: def.z, r: 2.8, label: () => al.usado ? null : 'Disparar alarme do carro',
      usar: () => { al.usado = true; al.t = 16; distracao = al; som.alarme(); feed('ALARME! A horda corre até o som.', '#ffcc60'); al.f = fonte(al.x, 1.5, al.z, 0xff3020, 16, 16, { blink: true, rapido: 4 }); } });
    alarmes.push(al);
  }
  function perigo(def) { perigos.push({ ...def, tick: 0 }); }

  const API = {
    THREE, VIS, cena, L, zona, qual, alto, mod, pouco, INICIO, CEL_HELI,
    reg, sombra, malhaVC, malhaMat, mesclar, addObst, livre, predio, carro, fonte, fontes, porta, bau, objetivo, alarme, perigo, quebravel,
    quebrarAgora: o => quebrar(o), fogos, piscas, neons, anim, tinta, arvores, cofres, aoCompletar, ajustes,
    decorar, espalhar, espalharBaus, poste, barrilFogo, viatura, semaforo, mastro, vapor, corvos,
    particula: (...a) => particula(...a), anunciar: (...a) => anunciar(...a), som,
    get jog() { return jog; },
  };
  marca('antes do cenário');
  montarCenario(zona.id, API);
  marca('cenário montado (' + obst.length + ' obstáculos)');
  if (ajustes.neblina && !mod.has('escuridao')) cena.fog.density = ajustes.neblina;
  const hemiBase = ajustes.hemi ?? (mod.has('escuridao') ? 0.3 : 0.75);
  hemi.intensity = hemiBase;
  if (ajustes.lua !== undefined) lua.intensity = ajustes.lua;

  // chão desenhado com o mapa inteiro (ruas, pisos, poças)
  const PRIO = { terra: 0, grama: 0, calc: 1, concreto: 2, piso: 2, rua: 3, pista: 3 };
  tinta.push({ t: 'concreto', x: CEL_HELI.x, z: CEL_HELI.z, w: 12, d: 12, cor: '#4a4a46', passo: 3 });
  if (zona.id !== 'lab') tinta.sort((a, b) => (PRIO[a.t] ?? 5) - (PRIO[b.t] ?? 5));
  const tamChao = qual === 'baixo' ? 1536 : qual === 'medio' ? 2560 : 3072;
  const tc = texChaoZona(zona.id, L, tamChao, tinta);
  reg(tc.map); reg(tc.roughnessMap);
  marca('textura do chão');
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(L * 2, L * 2),
    qual === 'baixo' ? new THREE.MeshLambertMaterial({ map: tc.map }) : new THREE.MeshStandardMaterial({ map: tc.map, roughnessMap: tc.roughnessMap, roughness: 1, metalness: 0.05 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = alto;
  cena.add(chao);

  // heliponto
  const heli = new THREE.Group();
  const disco = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), new THREE.MeshLambertMaterial({ color: 0x24282c }));
  disco.rotation.x = -Math.PI / 2; disco.position.y = 0.02; disco.receiveShadow = alto; heli.add(disco);
  const anel = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 40), new THREE.MeshBasicMaterial({ color: 0xffd020 }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.03; heli.add(anel);
  const matH = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const [x, z, w, d] of [[-0.9, 0, 0.35, 2.6], [0.9, 0, 0.35, 2.6], [0, 0, 1.5, 0.35]]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matH); b.rotation.x = -Math.PI / 2; b.position.set(x, 0.04, z); heli.add(b);
  }
  // luzes de pouso piscando em volta
  const luzesPouso = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0x40ff80, toneMapped: false }));
    l.position.set(Math.cos(a) * 4.3, 0.1, Math.sin(a) * 4.3);
    heli.add(l); luzesPouso.push(l);
  }
  const feixe = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 40, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x40ff80, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  feixe.position.y = 20; feixe.visible = false; heli.add(feixe);
  heli.position.set(CEL_HELI.x, 0, CEL_HELI.z);
  cena.add(heli);



  // pós-processamento (brilho, cor, vinheta, grão)
  const TINTS = { suburbio: 0xc8d8ff, centro: 0xffc8a0, lab: 0xc0ffd0, base: 0xe8e8c8, ninho: 0xe8c0ff };
  const pos = VIS.criarPos(R, cena, camera, vmCena, vmCam, qual, mod.has('lua') ? 0xffb0a0 : TINTS[zona.id] || 0xffffff);

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
    x: INICIO.x, z: INICIO.z, yaw: 0, pitch: 0, hp: 100 + 15 * nv('vida'), hpMax: 100 + 15 * nv('vida'),
    torretas: loadout.torretas || 0, invul: 0, dash: 0, dashX: 0, dashZ: 0, cdEsq: 0, cdFaca: 0, faca: 0, semDano: 0,
    armadura: loadout.armadura, armaduraMax: loadout.armadura,
    granadas: loadout.granadas, kits: loadout.kits, curando: 0, passo: 0, morto: false,
    y: 0, vy: 0, noChao: true, pousou: 0,
  };
  const armas = loadout.armas.filter(Boolean).map(a => {
    const st = stats(a);
    st.recarga *= 1 - 0.08 * nv('recarga');
    const mesh = criarArma(a, { maos: true });
    mesh.visible = false;
    vmCam.add(mesh);
    return { def: a, st, mesh, pente: st.pente, reserva: st.pente * 4, reservaMax: st.pente * 7, kills: 0 };
  });
  let atual = 0;
  armas[0].mesh.visible = true;
  let cadencia = 0, recarregando = 0, trocando = 0, recuoV = 0, chute = 0, disparoSolto = true, abrirFogo = 0;
  let mira = 0; // 0..1 (ADS)
  const bonus = { vel: 1, crit: 1, grana: 1 };   // cartas de melhoria escolhidas nesta raid
  const cartasPegas = [];
  let escolhendo = false;
  let inspec = 0, swayY = 0, swayP = 0, lean = 0, flinch = 0, ultYaw = 0, ultPitch = 0;
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
  function spawnZumbi(tipo, pos, eliteForcado) {
    let x = 0, z = 0, ok = false;
    if (pos) {
      for (let t = 0; t < 12 && !ok; t++) {
        x = clamp(pos.x + rand(-2.5, 2.5), -L + 3, L - 3); z = clamp(pos.z + rand(-2.5, 2.5), -L + 3, L - 3);
        ok = !bloq[Math.floor(z + L) * N + Math.floor(x + L)];
      }
    }
    for (let t = 0; t < 90 && !ok; t++) {
      const ang = rand(0, 6.283), rd = t < 60 ? rand(24, 46) : rand(12, 30);
      x = clamp(jog.x + Math.cos(ang) * rd, -L + 4, L - 4); z = clamp(jog.z + Math.sin(ang) * rd, -L + 4, L - 4);
      const cx = Math.floor(x + L), cz = Math.floor(z + L);
      ok = !bloq[cz * N + cx] && distG[cz * N + cx] < 1e8 && Math.hypot(x - jog.x, z - jog.z) > (t < 60 ? 20 : 10);
    }
    if (!ok) return null;
    const def = ZUMBIS[tipo];
    const chanceElite = mod.has('elite') ? 0.2 : zona.dif >= 3 ? 0.05 : onda >= 3 ? 0.02 : 0;
    const elite = !def.boss && (eliteForcado || Math.random() < chanceElite);
    const g = criarZumbi(tipo, { elite });
    g.position.set(x, 0, z);
    cena.add(sombra(g, false));
    const escalaOnda = 1 + 0.1 * (Math.min(onda, 30) - 1) + (sobrevivencia ? 0.04 * Math.max(0, onda - 10) : 0);
    const forca = 0.7 + 0.3 * zona.dif;
    let hp = def.hp * escalaOnda * forca * (def.boss ? 0.6 + 0.4 * zona.dif : 1) * (mod.has('lua') ? 1.6 : 1) * (elite ? 3 : 1);
    const rast = tipo === 'rastejante';
    const zb = {
      tipo, def, g, x, z, hp, hpMax: hp, vivo: true, morte: 0, elite,
      vel: def.vel * Math.min(1.35, 1 + 0.025 * onda) * rand(0.9, 1.1) * (mod.has('frenesi') ? 1.3 : 1),
      dano: def.dano * (0.8 + 0.2 * zona.dif) * (mod.has('frenesi') ? 1.25 : 1) * (elite ? 1.3 : 1),
      raio: def.raio * (elite ? 1.15 : 1), escala: g.scale.x,
      ataque: 0, cdAtaque: 0, cdCuspe: rand(1, 3), fogo: 0, fogoDps: 0, flash: 0,
      gemido: rand(1, 6), fase: Math.random() * 10, yaw: 0,
      // hitbox: altura da cabeça, deslocamento para a frente e altura do corpo (em escala 1)
      cabY: rast ? 0.5 : 1.58, cabFrente: rast ? 0.75 : 0, corpoAlt: rast ? 0.6 : 1.42,
      armadura: (def.armadura || 0) * forca * (elite ? 2 : 1), capacete: (def.capacete || 0) * forca,
      escudo: (def.escudo || 0) * forca, buff: 0, revelado: 0, cdGrito: rand(3, 5), cdGas: rand(1, 3),
      ia: 'normal', iaT: 0, cdEsp: rand(3, 5), dir: { x: 0, z: 0 }, fase2: false, invocou: 0, tonto: 0, surgir: pos && !def.boss ? 1.1 : 0, ultimaArma: null,
    };
    if (mod.has('blindagem') && !zb.armadura && !def.boss) zb.armadura = 90 * forca;
    zb.armaduraMax = zb.armadura;
    zumbis.push(zb);
    if (def.boss) {
      som.rugido(tipo); tremor = 0.6; falar('chefe', true);
      anunciar(`${def.nome.toUpperCase()} CHEGOU!`, '#ff3050', 3);
      feed(`Dica: ${def.dica}`, '#ffb070');
    }
    return zb;
  }

  // ---------- projéteis (cuspe e granada) ----------
  const projeteis = [];
  const matCuspe = new THREE.MeshBasicMaterial({ color: 0x9cff3a });
  const matGranada = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
  function lancarGranada() {
    if (jog.granadas <= 0 || jog.morto) return;
    jog.granadas--; falar('granada');
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
    } else if (tipo === 'mod') {
      const md = MOD_POR_ID[extra], cor = TIERS[md.tier].cor;
      m = new THREE.Group();
      const nucleo = new THREE.Mesh(geoCaixa, new THREE.MeshBasicMaterial({ color: cor, toneMapped: false }));
      nucleo.scale.set(0.32, 0.32, 0.32); nucleo.rotation.set(0.6, 0.6, 0); nucleo.position.y = 0.7; m.add(nucleo);
      const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 6, 10, 1, true), new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      coluna.position.y = 3; m.add(coluna);
      m.userData.girar = nucleo;
    } else {
      m = new THREE.Mesh(geoCaixa, tipo === 'grana' ? matGrana : tipo === 'municao' ? matMun : tipo === 'granada' ? matGranada : matVida);
      m.scale.set(tipo === 'grana' ? 0.35 : 0.5, tipo === 'grana' ? 0.18 : tipo === 'granada' ? 0.4 : 0.32, tipo === 'granada' ? 0.4 : 0.35);
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
  let ganho = 0, abates = 0, extracao = 0, tempo = 0, timerFluxo = 0, timerTrickle = 0, janela = 0;
  const armasAchadas = [], modsAchados = [];
  const fogosTemp = [];
  let pausado = false, acabou = false, raf = 0;

  function montarOnda(n) {
    const total = Math.round((6 + Math.min(n, 25) * 4) * (0.8 + 0.2 * zona.dif));
    const pesos = {};
    for (const [tipo, [min, base, extra]] of Object.entries(zona.pool)) {
      if (n >= min) pesos[tipo] = base + extra * (n - min);
    }
    const soma = Object.values(pesos).reduce((a, b) => a + b, 0);
    const f = [];
    for (let i = 0; i < total; i++) {
      let r = Math.random() * soma;
      for (const k in pesos) { r -= pesos[k]; if (r <= 0) { f.push(k); break; } }
    }
    // chefes: na última onda da raid, ou a cada 5 ondas na Sobrevivência
    let chefes = [];
    if (!sobrevivencia && n === zona.ondas) chefes = zona.chefes;
    if (sobrevivencia && n % 5 === 0) {
      const lista = ['acougueiro', 'chefe', 'colosso', 'rainha'];
      chefes = [lista[(n / 5 - 1) % lista.length]];
      if (n >= 20) chefes.push(lista[(n / 5) % lista.length]);
    }
    chefes.forEach((c, i) => f.splice(Math.floor(f.length * (0.3 + 0.3 * i)), 0, c));
    return f;
  }

  // ---------- HUD ----------
  const hud = {
    hp: $('hpFill'), hpTxt: $('hpTxt'), arm: $('armFill'), armTxt: $('armTxt'),
    onda: $('hudOnda'), vivos: $('hudVivos'), grana: $('hudGrana'), arma: $('hudArma'), mun: $('hudMun'),
    rec: $('hudRec'), recFill: $('hudRecFill'), itens: $('hudItens'), anuncio: $('anuncio'), feed: $('feed'),
    mira: $('mira'), hit: $('hitmarker'), dano: $('vinheta'), mapa: $('minimapa'), luneta: $('luneta'),
    ext: $('hudExt'), extFill: $('hudExtFill'), danoNums: $('danoNums'), bossBar: $('bossBar'), bossFill: $('bossFill'),
    bossNome: $('bossNome'), bossArm: $('bossArm'),
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
      if (o.tipo === 'arvore' || o.tipo === 'poste') continue;
      g.fillStyle = o.tipo === 'predio' ? '#4a525a' : o.tipo === 'parede' ? '#5a626a' : o.tipo === 'porta' ? '#c0a040' : o.tipo === 'barril' || o.tipo === 'bomba' ? '#c03020' : o.tipo === 'ovo' ? '#c070c0' : '#6a6a60';
      g.fillRect((o.minx + L) * s, (o.minz + L) * s, Math.max(1, (o.maxx - o.minx) * s), Math.max(1, (o.maxz - o.minz) * s));
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
  function falar(id, livre) {
    const t = som.fala(id, livre);
    if (t) feed('🎙 ' + t, '#9fd8ff');
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
    hud.itens.innerHTML = `💣 ${jog.granadas} &nbsp; ✚ ${jog.kits} &nbsp; ⚙ ${jog.torretas}`;
    const bg = $('btnGranada'), bk = $('btnKit'), bt = $('btnTorreta');
    if (bg) bg.querySelector('span').textContent = jog.granadas;
    if (bk) bk.querySelector('span').textContent = jog.kits;
    if (bt) bt.querySelector('span').textContent = jog.torretas;
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
  function numeroDano(x, y, z, v, cabeca, cor, texto) {
    const n = numsPool[numIdx]; numIdx = (numIdx + 1) % numsPool.length;
    n.x = x + rand(-0.2, 0.2); n.y = y; n.z = z + rand(-0.2, 0.2); n.vida = 0.8;
    n.el.textContent = texto && !v ? texto : (texto || '') + Math.round(v);
    n.el.style.color = cor || (cabeca ? '#ffd020' : '#fff');
    n.el.style.fontSize = cabeca ? '20px' : '15px';
  }

  // ---------- combate ----------
  const placar = { porTipo: {}, headshots: 0, facao: 0, elite: 0, chefes: [], xp: 0 };

  // Defesas dos zumbis. dir = direção do golpe (do jogador para o zumbi). Retorna o dano que chega na vida.
  function defesa(z, dano, cabeca, origem, dir, perfura = 0) {
    if (origem === 'fogo') return dano; // fogo passa por tudo
    const fz = { x: -Math.sin(z.yaw), z: -Math.cos(z.yaw) };       // para onde o zumbi olha
    const frente = dir ? dir.x * fz.x + dir.z * fz.z : 0;          // < 0: golpe de frente; > 0: pelas costas
    const ud = z.g.userData;
    // escudo antimotim: bloqueia balas de frente no corpo
    if (z.escudo > 0 && origem === 'bala' && !cabeca && frente < -0.35) {
      z.escudo -= dano * (1 + 0.5 * perfura);
      som.escudo();
      if (z.escudo <= 0) { if (ud.escudo) ud.escudo.visible = false; som.quebra(); feed('Escudo destruído!', '#9cf'); }
      return -1; // bloqueado
    }
    if (z.escudo > 0 && origem === 'explosao') { z.escudo -= dano * 1.5; if (z.escudo <= 0 && ud.escudo) { ud.escudo.visible = false; som.quebra(); } }
    // Colosso: núcleo nas costas
    if (z.tipo === 'colosso' && dir && frente > 0.3 && origem !== 'explosao') return dano * 2.5;
    // capacete
    if (cabeca && z.capacete > 0 && origem !== 'explosao') {
      z.capacete -= dano * (1 + 0.5 * perfura);
      som.armadura();
      if (z.capacete <= 0) { if (ud.capacete) ud.capacete.visible = false; som.quebra(); }
      return dano * 0.3;
    }
    // colete / blindagem
    if (z.armadura > 0 && !(cabeca && origem === 'bala' && z.tipo !== 'colosso')) {
      const mult = origem === 'explosao' ? 1.6 : origem === 'faca' ? 0.6 : 1 + 0.5 * perfura;
      z.armadura -= dano * mult;
      if (origem === 'bala') som.armadura();
      if (z.armadura <= 0) {
        if (ud.placas) ud.placas.visible = false;
        som.quebra(); feed(`Armadura do ${z.def.nome} quebrou!`, '#9cf');
      }
      return dano * (origem === 'explosao' ? 0.5 : z.def.boss ? 0.15 : 0.2);
    }
    return dano;
  }

  function danoZumbi(z, valor, cabeca, px, py, pz, origem, dir, perfura) {
    if (!z.vivo) return 0;
    let v = defesa(z, valor, cabeca, origem, dir, perfura);
    if (v < 0) { numeroDano(px, py, pz, 0, false, '#7ab0ff', 'BLOQ'); return -1; }
    if (z.tonto > 0) v *= 1.6;
    z.hp -= v;
    z.flash = 0.08;
    if (z.tipo === 'espectro') z.revelado = 2.5;
    if (origem !== 'fogo') {
      const fraco = z.tipo === 'colosso' && v >= valor * 2;
      const cor = origem === 'explosao' ? '#ff9a40' : fraco ? '#ff4040' : v < valor * 0.5 ? '#9aa8b8' : null;
      numeroDano(px, py, pz, v, cabeca, cor, fraco ? 'CRÍTICO ' : '');
    }
    if (z.hp <= 0) matar(z, cabeca, origem);
    return v;
  }

  function matar(z, cabeca, origem) {
    if (!z.vivo) return;
    z.vivo = false; z.morte = 0;
    z.queda = Math.random() < 0.5 ? -1 : 1; z.giroQueda = rand(-0.5, 0.5);
    marcas.sangue(z.x, z.z, 1.2 * z.escala);
    if (cabeca && !z.def.boss && origem === 'bala' && z.g.userData.cabeca) {
      z.g.userData.cabeca.visible = false;
      const hy = z.cabY * z.escala;
      sangue(z.x, hy, z.z, 26);
      for (let i = 0; i < 6; i++) particula(z.x, hy, z.z, rand(-3, 3), rand(1, 5), rand(-3, 3), rand(0.6, 1.2), rand(0.06, 0.1), 0x8a7a6a);
    }
    abates++;
    if (z.ultimaArma) z.ultimaArma.kills++;
    placar.porTipo[z.tipo] = (placar.porTipo[z.tipo] || 0) + 1;
    if (origem === 'faca') placar.facao++;
    if (z.elite) placar.elite++;
    placar.xp += Math.round((z.def.grana * 1.5 + 5) * (z.elite ? 3 : 1));
    const g = Math.round(z.def.grana * recompensa * (cabeca ? 1.5 : 1) * (z.elite ? 3 : 1) * bonus.grana);
    ganho += g;
    som.abate();
    if (Math.random() < 0.3) som.zumbiMorte(Math.hypot(z.x - jog.x, z.z - jog.z), 0);
    feed(`${z.elite ? 'ELITE ' : ''}${z.def.nome} eliminado${cabeca ? ' (headshot)' : origem === 'faca' ? ' (facão)' : ''}  +${fmt(g)}`, z.elite ? '#ffd040' : cabeca ? '#ffd020' : '#cfe');
    sangue(z.x, 1.2 * z.escala, z.z, 14, z.tipo === 'toxico' || z.tipo === 'cuspidor' ? 0x6aaa20 : 0x8a0a0a);
    if (z.tipo === 'inchado') explodir(z.x, 1, z.z, 4.5, z.dano * 1.4, 'zumbi');
    if (z.tipo === 'toxico') criarNuvem(z.x, z.z, 3.5, 12, 8);
    // drops
    const sorte = 1 + 0.15 * nv('sorte');
    const r = Math.random();
    if (z.def.boss) {
      placar.chefes.push(z.tipo);
      const t = rolarTier(BOSS_PESOS);
      soltarLoot('arma', z.x, z.z, novaArma(null, Math.min(5, t + (zona.dif >= 3 ? 1 : 0))));
      for (let i = 0; i < 5; i++) soltarLoot('grana', z.x + rand(-2, 2), z.z + rand(-2, 2), Math.round(80 * recompensa));
      soltarLoot('municao', z.x + 1, z.z); soltarLoot('vida', z.x - 1, z.z);
      if (!zumbis.some(o => o.vivo && o.def.boss)) hud.bossBar.style.display = 'none';
      anunciar(`${z.def.nome.toUpperCase()} DERROTADO!`, '#ffd020');
      som.raro(); falar('chefe_morto', true);
    } else if (z.elite) {
      soltarLoot('arma', z.x, z.z, novaArma(null, Math.min(5, rolarTier(zona.loot) + 1)));
    } else if (r < (z.tipo === 'bruto' ? 0.25 : ['blindado', 'escudeiro', 'gritador', 'espectro', 'toxico'].includes(z.tipo) ? 0.08 : 0.035) * sorte) {
      soltarLoot('arma', z.x, z.z, novaArma(null, rolarTier(zona.loot)));
    } else if (r < 0.14) soltarLoot('municao', z.x, z.z);
    else if (r < 0.2) soltarLoot('vida', z.x, z.z);
    else if (r < 0.32) soltarLoot('grana', z.x, z.z, Math.round(rand(15, 40) * recompensa));
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
    if (origem !== 'bala' && dj < raio) danoJogador(dano * (1 - 0.7 * dj / raio) * (origem === 'granada' ? 0.5 : 1), false, { x, z });
    for (const q of quebraveis) {
      if (q.hp > 0 && !q.estourado && Math.hypot((q.minx + q.maxx) / 2 - x, (q.minz + q.maxz) / 2 - z) < raio) {
        q.hp = 0;
        setTimeout(() => quebrar(q), 120);
      }
    }
  }
  function quebrar(o) {
    if (o.estourado) return;
    o.estourado = true; o.hp = 0;
    const cx = (o.minx + o.maxx) / 2, cz = (o.minz + o.maxz) / 2, cfg = o.cfg || {};
    if (o.mesh) cena.remove(o.mesh);
    const i = obst.indexOf(o); if (i >= 0) obst.splice(i, 1);
    refazerGrid(); desenharMapaBase();
    if (cfg.explode) {
      explodir(cx, 0.8, cz, cfg.explode.raio, cfg.explode.dano, 'barril');
      if (cfg.explode.fogo) { perigo({ x: cx, z: cz, r: 2.4, dps: 9, tipo: 'fogo', t: 9 }); fogosTemp.push({ x: cx, z: cz, t: 9 }); }
    }
    if (cfg.gas) { criarNuvem(cx, cz, 3.2, 9, 7); som.cuspe(); for (let k = 0; k < 10; k++) particula(cx, 1.5, cz, rand(-3, 3), rand(1, 4), rand(-3, 3), 0.6, 0.07, 0xc8ffd8, 10); }
    if (cfg.tubo) { som.quebra(); const t = escolher(['errante', 'toxico', 'corredor']); spawnZumbi(t, { x: cx, z: cz }); feed('Algo escapou do tubo de contenção!', '#9fe8b0'); }
    if (cfg.ovo) { criarNuvem(cx, cz, 2.2, 8, 4); sangue(cx, 0.6, cz, 14, 0xb0ff60); som.cuspe(); spawnZumbi('rastejante', { x: cx, z: cz }); }
    if (!cfg.explode && !cfg.gas && !cfg.ovo) for (let k = 0; k < 10; k++) particula(cx, 0.8, cz, rand(-3, 3), rand(1, 4), rand(-3, 3), 0.6, 0.08, 0x8a8a82);
  }
  const dirEls = [];
  $('dirDano').innerHTML = '';
  for (let i = 0; i < 4; i++) { const e = document.createElement('i'); $('dirDano').appendChild(e); dirEls.push(e); }
  let iDir = 0;
  function mostrarDirecao(x, z) {
    const dx = x - jog.x, dz = z - jog.z;
    const f = -dx * Math.sin(jog.yaw) - dz * Math.cos(jog.yaw);
    const r = dx * Math.cos(jog.yaw) - dz * Math.sin(jog.yaw);
    const e = dirEls[iDir]; iDir = (iDir + 1) % dirEls.length;
    e.style.transform = `rotate(${Math.atan2(r, f)}rad)`;
    e.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => e.classList.remove('on')));
  }
  function danoJogador(v, silencioso, fonte) {
    if (jog.morto || acabou) return;
    if (fonte && !silencioso && jog.invul <= 0) mostrarDirecao(fonte.x, fonte.z);
    if (jog.invul > 0) { if (!silencioso) numeroDano(jog.x + Math.sin(jog.yaw) * -2, jog.y + 1.8, jog.z - Math.cos(jog.yaw) * 2, 0, false, '#9cf', 'ESQUIVOU'); return; }
    v *= 1 - 0.05 * nv('resistencia');
    if (jog.armadura > 0) {
      const absorve = Math.min(jog.armadura, v * 0.6);
      jog.armadura -= absorve; v -= absorve;
    }
    jog.hp -= v;
    jog.semDano = 0;
    flashDano = Math.min(1, flashDano + (silencioso ? 0.08 : 0.35) + v / 60);
    if (jog.hp < jog.hpMax * 0.3 && jog.hp > 0) falar('vida_baixa');
    if (!silencioso) { tremor = Math.max(tremor, 0.15); som.dano(); flinch = Math.min(1, flinch + 0.5 + v / 80); }
    if (jog.hp <= 0) { jog.hp = 0; morrer(); }
    atualizarHudVida();
  }
  function empurrarJogador(dx, dz, forca) {
    const d = Math.hypot(dx, dz) || 1;
    jog.dashX = dx / d * forca; jog.dashZ = dz / d * forca; jog.dash = 0.15;
  }

  const dirTiro = new THREE.Vector3(), origemTiro = new THREE.Vector3(), pontaW = new THREE.Vector3(), fimT = new THREE.Vector3();
  function atirar() {
    const a = armas[atual], st = a.st;
    if (a.pente <= 0) { som.seco(); if (a.reserva > 0) recarregar(); else falar('sem_municao'); return; }
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
    flashT = st.silencioso ? 0 : 0.05;
    luzTiro.intensity = st.silencioso ? 2 : 14;
    vmLuzTiro.intensity = st.silencioso ? 0.8 : 4;
    ultimoTiro = tempo;
    marcas.fumaca(pontaW.x, pontaW.y, pontaW.z, a.def.tipo === 'escopeta' || a.def.tipo === 'sniper' ? 0.7 : 0.35);
    if (a.def.tipo === 'escopeta') setTimeout(() => !acabou && ejetarCapsula(true), 280); else ejetarCapsula(false);
    som.tiro(a.def.tipo, a.def.tier >= 5, st.silencioso);
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
      const hx = z.x - Math.sin(z.yaw) * z.cabFrente * s, hy = z.cabY * s, hz = z.z - Math.cos(z.yaw) * z.cabFrente * s;
      const tc = raioEsfera(o.x, o.y, o.z, d.x, d.y, d.z, hx, hy, hz, 0.2 * s);
      if (tc >= 0 && tc < tObst) { hits.push({ z, t: tc, cabeca: true }); continue; }
      const w = z.raio * 0.85;
      const tb = raioCaixa(o.x, o.y, o.z, d.x, d.y, d.z, z.x - w, 0, z.z - w, z.x + w, z.corpoAlt * s, z.z + w, tObst);
      if (tb >= 0) hits.push({ z, t: tb, cabeca: false });
    }
    hits.sort((p, q) => p.t - q.t);
    let tFim = tObst;
    const maxHits = 1 + st.perfura;
    let bloqueou = false;
    for (let i = 0; i < hits.length && i < maxHits; i++) {
      const h = hits[i], z = h.z;
      const px = o.x + d.x * h.t, py = o.y + d.y * h.t, pz = o.z + d.z * h.t;
      const multCab = (a.def.tipo === 'sniper' ? 2.5 : 2) * (1 + 0.12 * nv('critico')) * bonus.crit;
      let dano = st.dano * (h.t > st.alcance ? 0.55 : 1) * (h.cabeca ? multCab : 1) * (i > 0 ? 0.7 : 1);
      if (z.def.boss && h.cabeca) dano *= 0.75;
      z.ultimaArma = a;
      const res = danoZumbi(z, dano, h.cabeca, px, py, pz, 'bala', d, st.perfura);
      if (res < 0) { faiscas(px, py, pz); tFim = h.t; bloqueou = true; break; } // bateu no escudo
      if (h.cabeca) placar.headshots++;
      sangue(px, py, pz, h.cabeca ? 8 : 4, z.tipo === 'cuspidor' || z.tipo === 'toxico' ? 0x6aaa20 : 0x8a0a0a);
      hitmarker = 0.12; hitCabeca = h.cabeca;
      som.hit(h.cabeca);
      if (st.fogo) { z.fogo = 3; z.fogoDps = st.dano * 0.18 * st.projeteis; }
      if (st.vampiro) { jog.hp = Math.min(jog.hpMax, jog.hp + dano * st.vampiro); atualizarHudVida(); }
      if (st.explosivo && principal) explodir(px, py, pz, 2.6, st.dano * 0.45 * Math.max(1, st.projeteis / 3), 'bala');
      if (st.eletrico && principal && i === 0) {
        let n = 0;
        for (const o2 of zumbis) {
          if (n >= 3) break;
          if (!o2.vivo || o2 === z || Math.hypot(o2.x - z.x, o2.z - z.z) > 5) continue;
          n++; o2.ultimaArma = a;
          danoZumbi(o2, st.dano * 0.35, false, o2.x, 1.2 * o2.escala, o2.z, 'fogo');
          tracante(tmpA.set(px, py, pz), tmpB.set(o2.x, 1.2 * o2.escala, o2.z), 0x80d0ff);
          faiscas(o2.x, 1.2 * o2.escala, o2.z);
        }
      }
      tFim = h.t;
    }
    if (hits.length < maxHits && !bloqueou) {
      tFim = tObst;
      if (tFim < st.alcance * 1.6) {
        const ix = o.x + d.x * tFim, iy = o.y + d.y * tFim, iz = o.z + d.z * tFim;
        faiscas(ix, iy, iz);
        if (principal || Math.random() < 0.3) {
          if (!obstAtingido) marcas.furo(ix, 0.01, iz, 0, 1, 0);
          else {
            const b = obstAtingido;
            const dd = [[Math.abs(ix - b.minx), -1, 0, 0], [Math.abs(ix - b.maxx), 1, 0, 0], [Math.abs(iz - b.minz), 0, 0, -1], [Math.abs(iz - b.maxz), 0, 0, 1], [Math.abs(iy - b.h), 0, 1, 0]];
            dd.sort((p, q) => p[0] - q[0]);
            marcas.furo(ix, iy, iz, dd[0][1], dd[0][2], dd[0][3]);
          }
          particula(ix, iy, iz, rand(-1, 1), rand(0.5, 1.5), rand(-1, 1), 0.5, 0.12, 0x5a5650, 2);
        }
        if (obstAtingido && obstAtingido.cfg && !obstAtingido.estourado) {
          obstAtingido.hp -= st.dano;
          if (obstAtingido.hp <= 0) quebrar(obstAtingido);
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
      if (z.tipo === 'espectro' && z.revelado <= 0 && dist > 5) continue;
      const ty = z.tipo === 'rastejante' ? 0.45 : (dist < 6 ? 1.2 : 1.45) * s; // peito de perto, mais alto de longe
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

  // ---------- linha de visão ----------
  function visivel(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz) || 1;
    for (const b of obst) {
      const t = raioCaixa(ax, ay, az, dx / d, dy / d, dz / d, b.minx, 0, b.minz, b.maxx, b.h, b.maxz, d);
      if (t >= 0 && t < d - 0.5) return false;
    }
    return true;
  }

  // ---------- facão ----------
  const facaMesh = criarFacao();
  facaMesh.visible = false;
  vmCam.add(facaMesh);
  function facada() {
    if (jog.cdFaca > 0 || jog.morto || pausado) return;
    jog.cdFaca = 0.55; jog.faca = 0.32;
    som.faca();
    setTimeout(() => { if (!acabou) acertarFaca(); }, 110);
  }
  function acertarFaca() {
    const fx = -Math.sin(jog.yaw), fz = -Math.cos(jog.yaw);
    let acertou = false;
    for (const z of zumbis) {
      if (!z.vivo) continue;
      const dx = z.x - jog.x, dz = z.z - jog.z, d = Math.hypot(dx, dz) || 0.01;
      if (d > 2.1 + z.raio || (d > 0.4 && (dx * fx + dz * fz) / d < 0.45)) continue;
      const dano = 95 * (1 + 0.4 * nv('facao')) * (1 + 0.04 * Math.min(onda, 20));
      danoZumbi(z, dano, false, z.x, 1.3 * z.escala, z.z, 'faca', { x: dx / d, z: dz / d });
      sangue(z.x, 1.1 * z.escala, z.z, 10);
      if (z.vivo && !z.def.boss) { z.x += dx / d * 1.2; z.z += dz / d * 1.2; colidir(z, z.raio); z.ataque = 0; z.cdAtaque = 0.9; }
      acertou = true;
    }
    if (acertou) { som.facaHit(); hitmarker = 0.12; hitCabeca = false; tremor = Math.max(tremor, 0.08); }
  }

  // ---------- esquiva ----------
  function esquivar() {
    if (jog.cdEsq > 0 || jog.morto || pausado) return;
    let dx = mov.x, dz = mov.z;
    if (Math.hypot(dx, dz) < 0.1) { dx = -Math.sin(jog.yaw); dz = -Math.cos(jog.yaw); }
    const d = Math.hypot(dx, dz);
    jog.dashX = dx / d * 22; jog.dashZ = dz / d * 22; jog.dash = 0.17; jog.invul = 0.4;
    jog.cdEsq = 2.6 * (1 - 0.15 * nv('esquiva'));
    som.esquiva();
  }

  // ---------- torreta ----------
  const torretas = [];
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function colocarTorreta() {
    if (jog.torretas <= 0 || jog.morto || pausado) return;
    const p = { x: jog.x - Math.sin(jog.yaw) * 2.4 + Math.cos(jog.yaw) * 1.2, z: jog.z - Math.cos(jog.yaw) * 2.4 - Math.sin(jog.yaw) * 1.2 };
    colidir(p, 0.5);
    const m = criarTorreta();
    m.position.set(p.x, 0, p.z);
    cena.add(m);
    jog.torretas--;
    torretas.push({ x: p.x, z: p.z, m, t: 30, cd: 0, alvo: null, busca: 0 });
    som.recarga();
    feed('Torreta posicionada (30s)', '#7f7');
    atualizarHudItens();
  }
  function atualizarTorretas(dt) {
    for (let i = torretas.length - 1; i >= 0; i--) {
      const t = torretas[i];
      t.t -= dt; t.cd -= dt; t.busca -= dt;
      if (t.t <= 0) { cena.remove(t.m); torretas.splice(i, 1); feed('Torreta desligou', '#aaa'); continue; }
      if (t.busca <= 0) {
        t.busca = 0.25; t.alvo = null;
        let melhor = 22;
        for (const z of zumbis) {
          if (!z.vivo || (z.tipo === 'espectro' && z.revelado <= 0)) continue;
          const d = Math.hypot(z.x - t.x, z.z - t.z);
          if (d < melhor && visivel(t.x, 1.0, t.z, z.x, 1.0 * z.escala, z.z)) { melhor = d; t.alvo = z; }
        }
      }
      const z = t.alvo;
      if (z && z.vivo) {
        t.m.userData.topo.rotation.y = Math.atan2(-(z.x - t.x), -(z.z - t.z));
        if (t.cd <= 0) {
          t.cd = 0.18;
          const dd = Math.hypot(z.x - t.x, z.z - t.z) || 1;
          const yAlvo = (z.tipo === 'rastejante' ? 0.4 : 1.1) * z.escala;
          danoZumbi(z, 26 * (1 + 0.05 * Math.min(onda, 20)), false, z.x, yAlvo + 0.3, z.z, 'bala', { x: (z.x - t.x) / dd, z: (z.z - t.z) / dd }, 1);
          tracante(tmpA.set(t.x, 1.0, t.z), tmpB.set(z.x, yAlvo, z.z), 0x80ffa0);
          som.torreta();
        }
      }
      if (t.t < 5) t.m.visible = Math.sin(tempo * 12) > -0.3; // pisca quando vai acabar
    }
  }

  // ---------- gás tóxico ----------
  const nuvens = [];
  const matNuvem = new THREE.MeshBasicMaterial({ color: 0x8cff40, transparent: true, opacity: 0.22, depthWrite: false });
  function criarNuvem(x, z, r, dps, dur) {
    const m = new THREE.Mesh(geoEsf, matNuvem.clone());
    m.scale.set(r, r * 0.35, r); m.position.set(x, 0.3, z);
    cena.add(m);
    nuvens.push({ x, z, r, dps, t: dur, m, tick: 0 });
  }
  function atualizarNuvens(dt) {
    for (let i = nuvens.length - 1; i >= 0; i--) {
      const n = nuvens[i];
      n.t -= dt;
      n.m.material.opacity = 0.22 * Math.min(1, n.t / 1.5);
      if (Math.random() < dt * 6) particula(n.x + rand(-n.r, n.r) * 0.7, 0.3, n.z + rand(-n.r, n.r) * 0.7, 0, rand(0.3, 0.8), 0, 1, 0.14, 0x7adf30, -0.5);
      if (Math.hypot(jog.x - n.x, jog.z - n.z) < n.r && jog.y < 1.6) {
        n.tick -= dt;
        if (n.tick <= 0) { n.tick = 0.5; danoJogador(n.dps * 0.5 * (0.8 + 0.2 * zona.dif), true); }
      }
      if (n.t <= 0) { cena.remove(n.m); n.m.material.dispose(); nuvens.splice(i, 1); }
    }
  }

  // ---------- ondas de choque (Colosso) ----------
  const choques = [];
  const geoChoque = new THREE.CylinderGeometry(1, 1, 0.6, 48, 1, true);
  function ondaDeChoque(x, z, dano) {
    const m = new THREE.Mesh(geoChoque, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, 0.3, z);
    cena.add(m);
    choques.push({ x, z, r: 0.5, m, dano, atingiu: false });
    som.pisao();
    tremor = Math.max(tremor, 0.5);
  }
  function atualizarChoques(dt) {
    for (let i = choques.length - 1; i >= 0; i--) {
      const c = choques[i];
      c.r += 12 * dt;
      c.m.scale.set(c.r, 1, c.r);
      c.m.material.opacity = 0.8 * Math.max(0, 1 - c.r / 18);
      const dj = Math.hypot(jog.x - c.x, jog.z - c.z);
      if (!c.atingiu && Math.abs(dj - c.r) < 0.8 && jog.y < 0.45) {
        c.atingiu = true;
        danoJogador(c.dano, false, c);
        empurrarJogador(jog.x - c.x, jog.z - c.z, 14);
      }
      if (c.r > 18) { cena.remove(c.m); c.m.material.dispose(); choques.splice(i, 1); }
    }
  }

  // ---------- projéteis dos chefes ----------
  const matPedra = new THREE.MeshLambertMaterial({ color: 0x5a5048 });
  const matAcido = new THREE.MeshBasicMaterial({ color: 0xd040ff });
  function lancarProjetil(x, y, z, alvoX, alvoZ, vel, dano, tipo, espalhar = 0) {
    const dx = alvoX - x, dz = alvoZ - z, dist = Math.hypot(dx, dz) || 1;
    const ang = Math.atan2(dx, dz) + espalhar;
    const tVoo = Math.max(0.3, dist / vel);
    const m = new THREE.Mesh(geoEsf, tipo === 'pedra' ? matPedra : matAcido);
    m.scale.setScalar(tipo === 'pedra' ? 0.45 : 0.2);
    const p = { tipo, m, x, y, z, vx: Math.sin(ang) * vel, vz: Math.cos(ang) * vel, vy: (1.2 - y) / tVoo + 0.5 * 9 * tVoo, t: 4, dano };
    m.position.set(x, y, z);
    cena.add(m);
    projeteis.push(p);
    som.cuspe();
  }

  // ---------- suprimento aéreo ----------
  const suprimentos = [];
  let proxSuprimento = 0;
  function lancarSuprimento() {
    let x = 0, z = 0;
    for (let t = 0; t < 50; t++) {
      const ang = rand(0, 6.283), d = rand(10, 30);
      x = clamp(jog.x + Math.cos(ang) * d, -L + 5, L - 5); z = clamp(jog.z + Math.sin(ang) * d, -L + 5, L - 5);
      if (!bloq[Math.floor(z + L) * N + Math.floor(x + L)] && distG[Math.floor(z + L) * N + Math.floor(x + L)] < 1e8) break;
    }
    const g = new THREE.Group();
    const cx = new THREE.Mesh(geoCaixa, new THREE.MeshLambertMaterial({ color: 0x3a5a2a, emissive: 0x102008 }));
    cx.scale.set(1.2, 0.9, 1.2); g.add(cx);
    const para = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe0e0e0, side: THREE.DoubleSide }));
    para.position.y = 3; g.add(para);
    const luz = new THREE.PointLight(0xff3020, 25, 12, 1.4); luz.position.y = 1; g.add(luz);
    g.position.set(x, 35, z);
    cena.add(g);
    suprimentos.push({ g, x, z, y: 35 });
    anunciar('SUPRIMENTO AÉREO! Siga o sinal vermelho', '#ff8040', 3); falar('suprimento');
    som.aviao();
  }
  function atualizarSuprimentos(dt) {
    if (proxSuprimento > 0) { proxSuprimento -= dt; if (proxSuprimento <= 0) lancarSuprimento(); }
    for (let i = suprimentos.length - 1; i >= 0; i--) {
      const sp = suprimentos[i];
      sp.y -= 5 * dt;
      sp.g.position.y = Math.max(0.45, sp.y);
      if (Math.random() < dt * 20) particula(sp.x + rand(-0.3, 0.3), sp.g.position.y + 0.5, sp.z + rand(-0.3, 0.3), rand(-0.3, 0.3), rand(1, 2), rand(-0.3, 0.3), 1.2, 0.15, 0xff4030, -0.8);
      if (sp.y <= 0.45) {
        cena.remove(sp.g);
        soltarLoot('arma', sp.x, sp.z, novaArma(null, Math.min(5, rolarTier(zona.loot) + 1)));
        soltarLoot('municao', sp.x + 1.2, sp.z);
        soltarLoot('vida', sp.x - 1.2, sp.z);
        suprimentos.splice(i, 1);
      }
    }
  }

  // ---------- inteligência dos chefes ----------
  // Retorna {mx, mz} quando controla o movimento, ou null para seguir o caminho normal.
  function iaChefe(z, dt, dx, dz, dist) {
    z.cdEsp -= dt; z.iaT -= dt;
    const vida = z.hp / z.hpMax;
    const d = dist || 1;
    if (z.tonto > 0) { z.tonto -= dt; return { mx: 0, mz: 0 }; }
    if (z.tipo === 'acougueiro') {
      if (z.ia === 'prep') {
        if (z.iaT > 0.3) { z.dir.x = dx / d; z.dir.z = dz / d; }
        if (z.iaT <= 0) { z.ia = 'carga'; z.iaT = 1.3; z.acertou = false; }
        return { mx: 0, mz: 0 };
      }
      if (z.ia === 'carga') {
        const ax = z.x, az = z.z, passo = 15 * dt;
        z.x += z.dir.x * passo; z.z += z.dir.z * passo;
        colidir(z, z.raio);
        const andou = Math.hypot(z.x - ax, z.z - az);
        if (!z.acertou && Math.hypot(jog.x - z.x, jog.z - z.z) < z.raio + 1.0) {
          z.acertou = true;
          danoJogador(z.dano * 1.3, false, z);
          empurrarJogador(z.dir.x, z.dir.z, 16);
          z.ia = 'normal'; z.cdEsp = rand(4, 6) * (vida < 0.4 ? 0.6 : 1);
          return { mx: 0, mz: 0 };
        }
        if (andou < passo * 0.3) {
          z.ia = 'normal'; z.tonto = 2.2; z.cdEsp = rand(4, 6);
          som.pisao(); tremor = Math.max(tremor, 0.3);
          anunciar('ATORDOADO! Ataque agora!', '#ffd020', 1.5);
        } else if (z.iaT <= 0) { z.ia = 'normal'; z.cdEsp = rand(4, 6) * (vida < 0.4 ? 0.6 : 1); }
        return { mx: 0, mz: 0 };
      }
      if (z.cdEsp <= 0 && dist > 4 && dist < 26 && visivel(z.x, 1.5, z.z, jog.x, jog.y + 1, jog.z)) {
        z.ia = 'prep'; z.iaT = 0.9;
        som.investida();
        anunciar('INVESTIDA! Saia da frente!', '#ff6040', 1.2);
        return { mx: 0, mz: 0 };
      }
      return null;
    }
    if (z.tipo === 'colosso') {
      if (z.ia === 'pisao') {
        if (z.iaT <= 0) {
          z.ia = 'normal'; z.cdEsp = rand(5, 7) * (vida < 0.5 ? 0.7 : 1);
          ondaDeChoque(z.x, z.z, z.dano * 0.8);
          if (!z.avisouPulo) { z.avisouPulo = true; anunciar('PULE a onda de choque!', '#ffa040', 2); }
        }
        return { mx: 0, mz: 0 };
      }
      if (z.cdEsp <= 0 && dist < 15) { z.ia = 'pisao'; z.iaT = 1.2; som.investida(); return { mx: 0, mz: 0 }; }
      if (vida < 0.5) {
        z.cdPedra = (z.cdPedra ?? 3) - dt;
        if (z.cdPedra <= 0 && dist > 6) { z.cdPedra = 4; lancarProjetil(z.x, 3, z.z, jog.x, jog.z, 15, z.dano * 0.7, 'pedra'); }
      }
      return null;
    }
    if (z.tipo === 'chefe') {
      if (!z.fase2 && vida < 0.5) {
        z.fase2 = true; z.vel *= 1.4;
        anunciar('A ABOMINAÇÃO ESTÁ FURIOSA!', '#ff3050', 2.5);
        som.rugido();
        for (let i = 0; i < 4; i++) spawnZumbi('corredor', z);
      }
      if (z.fase2 && z.cdEsp <= 0 && dist > 5) {
        z.cdEsp = 3.5;
        for (const e of [-0.25, 0, 0.25]) lancarProjetil(z.x, 3.2, z.z, jog.x, jog.z, 14, z.dano * 0.4, 'acido', e);
      }
      return null;
    }
    if (z.tipo === 'rainha') {
      if ((vida < 0.66 && z.invocou < 1) || (vida < 0.33 && z.invocou < 2)) {
        z.invocou++;
        anunciar('A RAINHA INVOCOU A NINHADA!', '#ff60ff', 2.5);
        som.grito();
        for (let i = 0; i < 4; i++) spawnZumbi('rastejante', z);
        for (let i = 0; i < 2; i++) spawnZumbi('cuspidor', z);
      }
      const furia = vida < 0.5;
      if (z.cdEsp <= 0 && dist < 30) {
        z.cdEsp = furia ? 1.8 : 2.8;
        const n = furia ? 7 : 5;
        for (let i = 0; i < n; i++) lancarProjetil(z.x, 3.2, z.z, jog.x, jog.z, 13, z.dano * 0.35, 'acido', (i - (n - 1) / 2) * 0.16);
      }
      if (dist < 8) return { mx: -dx / d, mz: -dz / d };   // foge
      if (dist < 16) return { mx: -dz / d * 0.6, mz: dx / d * 0.6 }; // anda em círculo
      return null;
    }
    return null;
  }

  function iaGritador(z, dt, dx, dz, dist) {
    z.cdGrito -= dt; z.iaT -= dt;
    if (z.cdGrito <= 0 && dist < 28) {
      z.cdGrito = 8; z.iaT = 1;
      som.grito();
      feed('Um Gritador fortaleceu a horda!', '#ff9090');
      for (const o of zumbis) if (o.vivo && o !== z && Math.hypot(o.x - z.x, o.z - z.z) < 16) o.buff = 6;
      if (zumbis.filter(o => o.vivo).length < 30) for (let i = 0; i < 2; i++) spawnZumbi(Math.random() < 0.5 ? 'corredor' : 'errante', z);
      for (let i = 0; i < 24; i++) particula(z.x, 1.6 * z.escala, z.z, Math.cos(i / 24 * 6.28) * 7, rand(0, 1), Math.sin(i / 24 * 6.28) * 7, 0.5, 0.06, 0xffffff, 0);
    }
    if (z.iaT > 0) return { mx: 0, mz: 0 };
    const d = dist || 1;
    if (dist < 10) return { mx: -dx / d, mz: -dz / d };
    if (dist < 17) return { mx: 0, mz: 0 };
    return null;
  }

  // cápsulas ejetadas (na cena da arma, em coordenadas da câmera)
  let ultimoTiro = -9;
  const capsulas = [];
  const matLatao = new THREE.MeshStandardMaterial({ color: 0xd0a040, metalness: 1, roughness: 0.3 });
  const matCartucho = new THREE.MeshStandardMaterial({ color: 0xb01810, roughness: 0.6 });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8), matLatao);
    m.visible = false; vmCam.add(m);
    capsulas.push({ m, vida: 0, v: new THREE.Vector3(), w: 0 });
  }
  let iCap = 0;
  function ejetarCapsula(cartucho) {
    const c = capsulas[iCap]; iCap = (iCap + 1) % capsulas.length;
    const am = armas[atual].mesh;
    c.m.material = cartucho ? matCartucho : matLatao;
    c.m.scale.set(cartucho ? 2.4 : 1, cartucho ? 2 : 1, cartucho ? 2.4 : 1);
    c.m.position.set(am.position.x + 0.03, am.position.y + 0.03, am.position.z + 0.12);
    c.v.set(rand(1.0, 1.6), rand(0.9, 1.4), rand(0.1, 0.4));
    c.w = rand(15, 25); c.vida = 0.55; c.m.visible = true;
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
    jog.morto = true; som.morteJogador();
    anunciar('VOCÊ FOI INFECTADO', '#ff3040', 5);
    setTimeout(() => terminar(false), 2200);
  }
  function terminar(extraido) {
    if (acabou) return;
    acabou = true;
    $('cartas').style.display = 'none';
    cancelAnimationFrame(raf);
    removerInput();
    if (document.pointerLockElement) document.exitPointerLock();
    const bonusExt = Math.round((sobrevivencia ? 100 * onda : 150 * zona.ondas) * recompensa);
    const resultado = {
      extraido, abates, onda, ondas: sobrevivencia ? '∞' : zona.ondas, modo, zonaId: zona.id, mods: [...mod],
      ganho: Math.round(extraido ? ganho + bonusExt : ganho * 0.3),
      bonus: extraido ? bonusExt : 0,
      armas: extraido ? armasAchadas : [],
      perdidas: extraido ? [] : armasAchadas,
      acessorios: extraido ? modsAchados : [], modsPerdidos: extraido ? [] : modsAchados,
      kills: armas.map(a => ({ uid: a.def.uid, kills: a.kills })),
      cartas: cartasPegas,
      objetivo: { completo: objCompleto, feitos: objFeitos, total: objTotal, nome: zona.objetivo ? zona.objetivo.nome : '' },
      granadas: jog.granadas, kits: jog.kits, torretas: jog.torretas,
      placar, xp: placar.xp + (extraido ? Math.round(200 * recompensa) : 0),
    };
    limpar();
    onFim(resultado);
  }
  function limpar() {
    pararAmbiente();
    armas.forEach(a => vmCam.remove(a.mesh));
    cena.traverse(o => {
      if (o.geometry && o.geometry !== geoCaixa) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    vmCena.traverse(o => { if (o.material) o.material.dispose(); });
    geoCaixa.dispose();
    descartaveis.forEach(d => d.dispose && d.dispose());
    pos.dispose();
    R.clear();
  }

  // ---------- input ----------
  const btnEsq = $('btnEsquiva'), btnFaca = $('btnFacao');
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
    if (e.code === 'KeyE') { if (!interagir()) facada(); }
    if (e.code === 'KeyV') facada();
    if (e.code === 'KeyY' && !gatilho && mira < 0.1 && !recarregando && !jog.morto) inspec = 2.6;
    if (e.code === 'KeyC' || e.code === 'ControlLeft' || e.code === 'AltLeft') { e.preventDefault(); esquivar(); }
    if (e.code === 'KeyT') colocarTorreta();
    if (e.code === 'KeyP' && !escolhendo) pausar(!pausado);
    if (escolhendo && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { const b = $('cartasLista').children[+e.code.slice(5) - 1]; if (b) b.click(); }
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
    if (!mobile && !acabou && document.pointerLockElement !== canvas && !pausado && !escolhendo) pausar(true);
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
        else if (acao === 'facao') facada();
        else if (acao === 'interagir') interagir();
        else if (acao === 'esquiva') esquivar();
        else if (acao === 'torreta') colocarTorreta();
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
    const pr = Math.min(window.devicePixelRatio || 1, qual === 'alto' ? 1.5 : qual === 'medio' ? 1.25 : 1);
    R.setPixelRatio(pr);
    R.setSize(w, h, false);
    pos.resize(w, h, pr);
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

  // ---------- interação com o cenário: baús, portas, objetivos, alarmes, perigos ----------
  let distracao = null;
  let interAtual = null;
  const hudInter = $('hudInter'), hudCanal = $('hudCanal'), hudCanalFill = $('hudCanalFill'), hudObj = $('hudObj'), btnInter = $('btnInteragir'), hudEvento = $('hudEvento');
  function melhorInter() {
    let melhor = null, md = 1e9;
    for (const it of interativos) {
      const d = Math.hypot(it.x - jog.x, it.z - jog.z);
      if (d > it.r || d >= md) continue;
      if (it.y !== undefined && Math.abs(jog.y - it.y) > 2.4) continue;
      const lab = it.label(); if (!lab) continue;
      md = d; melhor = it; melhor._lab = lab;
    }
    return melhor;
  }
  function interagir() {
    if (jog.morto || pausado || !interAtual) return false;
    interAtual.usar();
    return true;
  }
  function rolarMod(bonus = 0) {
    const t = rolarTier([0, 50, 30, 15 + zona.dif * 2, 4 + zona.dif * 2 + bonus * 6]);
    const lista = MODS.filter(m => m.tier === t);
    return escolher(lista.length ? lista : MODS).id;
  }
  function abrirBau(b) {
    if (b.aberto) return;
    if (b.trancado) { feed(`Trancado! Complete o objetivo: ${zona.objetivo.nome}.`, '#ff8a60'); som.seco(); return; }
    b.aberto = true; b.g.userData.abrir(); b.col.visible = false;
    som.bau();
    placar.baus = (placar.baus || 0) + 1; placar.xp += b.premium ? 120 : 25;
    const x = b.x, z = b.z, sorte = 1 + 0.15 * nv('sorte'), prem = b.premium;
    const sp = () => rand(-1.4, 1.4);
    const nG = prem ? 5 : 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < nG; i++) soltarLoot('grana', x + sp(), z + sp(), Math.round(rand(35, 85) * recompensa * (prem ? 2.2 : 1)));
    soltarLoot('municao', x + sp(), z + sp());
    if (Math.random() < (prem ? 1 : 0.45)) soltarLoot('vida', x + sp(), z + sp());
    if (Math.random() < (prem ? 0.9 : 0.35)) soltarLoot('kit', x + sp(), z + sp());
    if (Math.random() < (prem ? 0.9 : 0.4)) soltarLoot('granada', x + sp(), z + sp());
    if (Math.random() < (b.cofre ? 1 : prem ? 0.85 : 0.22 * sorte)) soltarLoot('arma', x + sp(), z + sp(), novaArma(null, Math.min(5, rolarTier(zona.loot) + (b.cofre ? 2 : prem ? 1 : 0))));
    if (Math.random() < (b.cofre ? 1 : prem ? 0.8 : 0.3 * sorte)) soltarLoot('mod', x + sp(), z + sp(), rolarMod(b.cofre ? 1 : 0));
    if (b.cofre) { soltarLoot('mod', x + sp(), z + sp(), rolarMod(1)); anunciar(`${zona.objetivo.cofre.toUpperCase()} ABERTO!`, '#ffd040', 3); som.raro(); }
  }
  function iniciarObjetivo(o) {
    if (o.ligado || o.canal > 0 || jog.morto) return;
    o.canal = 1; o.tCanal = o.def.efeito === 'casulo' ? 3.4 : 3.8; o.tTotal = o.tCanal;
    som.alarme();
    const n = 3 + Math.floor(zona.dif) + (onda > 3 ? 1 : 0);
    const tipos = Object.keys(zona.pool).filter(k => zona.pool[k][0] <= Math.max(1, onda));
    for (let i = 0; i < n; i++) { const ang = rand(0, 6.28), rd = rand(14, 24); spawnZumbi(escolher(tipos.length ? tipos : ['errante']), { x: o.x + Math.cos(ang) * rd, z: o.z + Math.sin(ang) * rd }); }
    feed('Ativando... a horda ouviu! Fique perto!', '#ffcc60');
    anunciar('ATIVANDO — FIQUE PERTO', '#ffcc60', 2);
  }
  function atualizarObjHud() {
    if (!hudObj || !objTotal) return;
    hudObj.innerHTML = objCompleto ? `✔ ${zona.objetivo.nome} <b>${objFeitos}/${objTotal}</b><br><span style="color:#ffd040">${zona.objetivo.cofre} liberado — marcado no mapa</span>`
      : `◆ ${zona.objetivo.nome}: <b>${objFeitos}/${objTotal}</b><br><span class="sub">Abre: ${zona.objetivo.cofre}</span>`;
    hudObj.classList.toggle('feito', objCompleto);
  }
  function completarObjetivo(o) {
    o.canal = 0; o.ligado = true; objFeitos++;
    hudCanal.style.display = 'none';
    const d = o.def;
    if (d.luz) o.f = fonte(o.x, 1.5, o.z, d.luz[0], d.luz[1], d.luz[2], {});
    if (d.tela) d.tela.material.color.setHex(0x30ff60);
    if (d.girar) d.girar.rotation.y += 2.4;
    if (d.efeito === 'casulo') {
      bolaFogo(o.x, 1.2, o.z, 3, 0xff60d0); som.explosao(); criarNuvem(o.x, o.z, 3.4, 8, 5);
      for (let k = 0; k < 24; k++) particula(o.x, 1.4, o.z, rand(-5, 5), rand(1, 6), rand(-5, 5), rand(0.5, 1), rand(0.08, 0.18), Math.random() < 0.5 ? 0xff60d0 : 0xb0ff60);
      cena.remove(o.mesh);
      const ob = obst.find(q => q.tipo === 'caixa' && Math.abs((q.minx + q.maxx) / 2 - o.x) < 0.2 && Math.abs((q.minz + q.maxz) / 2 - o.z) < 0.2);
      if (ob) { obst.splice(obst.indexOf(ob), 1); refazerGrid(); desenharMapaBase(); }
      for (let k = 0; k < 2; k++) spawnZumbi('rastejante', { x: o.x, z: o.z });
    }
    som.ligar(); falar('objetivo_ok');
    feed(`${d.nome} ativado (${objFeitos}/${objTotal})`, '#7dff8e');
    placar.xp += 80;
    if (objFeitos >= objTotal && !objCompleto) { objCompleto = true; liberarCofres(); }
    atualizarObjHud();
  }
  function liberarCofres() {
    for (const c of cofres) { c.porta.trancada = false; c.bau.trancado = false; if (c.led) c.led.material.color.setHex(0x30ff60); if (c.bau.col) c.bau.col.material.color.setHex(0xffd040); }
    anunciar(`${zona.objetivo.cofre.toUpperCase()} LIBERADO!`, '#7dff8e', 4);
    som.raro(); falar('cofre_liberado', true);
    feed(`Vá até: ${zona.objetivo.cofre} (marcado no mapa)`, '#7dff8e');
    aoCompletar.forEach(f => f());
    placar.xp += 300; placar.objetivo = true;
  }

  // ---------- eventos de onda ----------
  let evento = null;       // { id, t, prox }
  const bombas = [];
  const geoAnel = new THREE.RingGeometry(0.82, 1, 36);
  function sortearEvento(n) {
    if (!zona.eventos || n < 2 || (!sobrevivencia && n >= zona.ondas) || (sobrevivencia && n % 5 === 0)) return null;
    return Math.random() < 0.4 ? escolher(zona.eventos) : null;
  }
  function iniciarEvento(id) {
    const ev = EVENTOS[id];
    evento = { id, t: 0, prox: 2 };
    anunciar(ev.nome, ev.cor, 3.4);
    feed(ev.desc, ev.cor);
    som.evento(id); falar('evento_' + id, true);
    if (id === 'horda') { const n = Math.round(filaSpawn.length * 0.45); for (let i = 0; i < n; i++) filaSpawn.splice(Math.floor(Math.random() * filaSpawn.length), 0, Math.random() < 0.7 ? 'corredor' : 'errante'); }
    if (id === 'apagao') {
      energia = 0;
      const n = Math.round(filaSpawn.length * 0.25); for (let i = 0; i < n; i++) filaSpawn.splice(Math.floor(Math.random() * filaSpawn.length), 0, zona.pool.espectro ? 'espectro' : 'corredor');
    }
  }
  function terminarEvento() {
    if (!evento) return;
    const ev = EVENTOS[evento.id];
    const bonus = Math.round(40 * Math.min(onda, 30) * recompensa * ev.bonus * 2);
    ganho += bonus; feed(`${ev.nome} sobrevivido! +${fmt(bonus)}`, ev.cor);
    placar.eventos = (placar.eventos || 0) + 1; placar.xp += 60;
    if (Math.random() < 0.5) soltarLoot('mod', 0, 3, rolarMod(0));
    energia = 1; evento = null;
    if (hudEvento) hudEvento.style.display = 'none';
  }
  function atualizarEvento(dt) {
    if (!evento) return;
    evento.t += dt; evento.prox -= dt;
    if (hudEvento) { hudEvento.style.display = 'block'; hudEvento.textContent = EVENTOS[evento.id].nome; hudEvento.style.color = EVENTOS[evento.id].cor; }
    if (evento.id === 'esporos' && evento.prox <= 0) {
      evento.prox = 3.2;
      for (let k = 0; k < 2; k++) { const a = rand(0, 6.28), d = rand(4, 22); criarNuvem(clamp(jog.x + Math.cos(a) * d, -L + 4, L - 4), clamp(jog.z + Math.sin(a) * d, -L + 4, L - 4), rand(3, 4.5), 9, 11); }
    }
    if (evento.id === 'bombardeio' && evento.prox <= 0) {
      evento.prox = 2.4;
      const a = rand(0, 6.28), d = Math.random() < 0.45 ? rand(0, 3) : rand(4, 20);
      const x = clamp(jog.x + Math.cos(a) * d, -L + 4, L - 4), z = clamp(jog.z + Math.sin(a) * d, -L + 4, L - 4);
      const m = new THREE.Mesh(geoAnel, new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); m.scale.setScalar(5); cena.add(m);
      bombas.push({ x, z, t: 1.7, m });
      som.apito();
    }
    for (let i = bombas.length - 1; i >= 0; i--) {
      const b = bombas[i];
      b.t -= dt;
      b.m.material.opacity = 0.4 + Math.abs(Math.sin(b.t * 10)) * 0.5;
      if (b.t <= 0) { cena.remove(b.m); b.m.material.dispose(); bombas.splice(i, 1); explodir(b.x, 0.5, b.z, 5, 160, 'artilharia'); }
    }
  }

  function atualizarInteracao(dt) {
    interAtual = jog.morto ? null : melhorInter();
    if (interAtual) { hudInter.style.display = 'block'; hudInter.textContent = (mobile ? '' : '[E] ') + interAtual._lab; } else hudInter.style.display = 'none';
    if (btnInter) btnInter.style.display = interAtual ? 'flex' : 'none';
    // canais de ativação
    let canalAtivo = false;
    for (const o of objetivos) {
      if (o.canal <= 0) continue;
      if (jog.morto || Math.hypot(jog.x - o.x, jog.z - o.z) > 5.5) { o.canal = 0; feed('Ativação interrompida!', '#f88'); continue; }
      o.tCanal -= dt; canalAtivo = true;
      hudCanalFill.style.width = ((1 - o.tCanal / o.tTotal) * 100) + '%';
      if (Math.random() < dt * 14) particula(o.x + rand(-0.6, 0.6), rand(0.5, 1.6), o.z + rand(-0.6, 0.6), 0, rand(1, 3), 0, 0.5, 0.07, 0xffe060, -1);
      if (o.tCanal <= 0) completarObjetivo(o);
    }
    hudCanal.style.display = canalAtivo ? 'block' : 'none';
    // portas
    for (let i = portasAnim.length - 1; i >= 0; i--) {
      const p = portasAnim[i];
      p.anim += dt / 0.7;
      const k = Math.min(1, p.anim), e = k * k * (3 - 2 * k);
      if (p.def.modo === 'gira') p.piv.rotation.y = (p.eixoX ? -1 : 1) * e * 1.75;
      else { if (p.eixoX) p.piv.position.x = p.x + e * (p.w - 0.1); else p.piv.position.z = p.z + e * (p.w - 0.1); }
      if (k >= 1) portasAnim.splice(i, 1);
    }
    // alarme que distrai a horda
    if (distracao) {
      distracao.t -= dt;
      if (distracao.f) distracao.f.int = 16;
      if (distracao.t <= 0) { if (distracao.f) distracao.f.int = 0; distracao = null; }
    }
    // piscinas de ácido, fogo no chão
    for (let i = perigos.length - 1; i >= 0; i--) {
      const p = perigos[i];
      if (p.t !== undefined) { p.t -= dt; if (p.t <= 0) { perigos.splice(i, 1); continue; } }
      if (Math.hypot(jog.x - p.x, jog.z - p.z) < p.r && jog.y < 0.7 && !jog.morto) {
        p.tick -= dt;
        if (p.tick <= 0) { p.tick = 0.5; danoJogador(p.dps * 0.5 * (0.8 + 0.2 * zona.dif), true); if (!p.avisou || tempo - p.avisou > 3) { p.avisou = tempo; feed(p.tipo === 'fogo' ? 'Você está queimando!' : 'Ácido! Saia da poça!', '#9cff3a'); } }
      }
      if (p.tipo === 'fogo' && Math.random() < dt * 20) particula(p.x + rand(-p.r, p.r) * 0.7, 0.3, p.z + rand(-p.r, p.r) * 0.7, 0, rand(1, 2.5), 0, rand(0.4, 0.8), rand(0.1, 0.2), Math.random() < 0.5 ? 0xff6a10 : 0xffc020, -1);
    }
    for (const v of vapores) { v.t -= dt; if (v.t <= 0) { v.t = rand(0.25, 0.5); marcas.fumaca(v.x + rand(-0.2, 0.2), 0.3, v.z + rand(-0.2, 0.2), 0.9); if (Math.random() < 0.5) particula(v.x, 0.3, v.z, rand(-0.4, 0.4), rand(2, 3.5), rand(-0.4, 0.4), 0.7, 0.07, 0xe8f4f0, -0.5); } }
    for (let i = 0; i < semaforos.length; i++) semaforos[i].visible = Math.floor(tempo * 1.4 + i * 0.3) % 2 === 0;
    for (let i = fogosTemp.length - 1; i >= 0; i--) { const f = fogosTemp[i]; f.t -= dt; if (f.t <= 0) fogosTemp.splice(i, 1); }
    for (let i = 0; i < anim.length; i++) anim[i](dt, tempo);
    for (let i = 0; i < arvores.length; i++) { const a = arvores[i]; a.copa.rotation.z = Math.sin(tempo * 0.8 + a.fase) * 0.03; a.copa.rotation.x = Math.cos(tempo * 0.6 + a.fase) * 0.02; }
    for (const b of baus) if (!b.aberto && b.col.visible) b.col.material.opacity = 0.11 + Math.sin(tempo * 2 + b.x) * 0.05;
    atualizarFontes(dt);
  }

  // ---------- cartas de melhoria entre ondas ----------
  function aplicarCarta(id) {
    const todas = f => armas.forEach(a => f(a.st, a));
    if (id === 'dano') todas(st => { st.dano *= 1.2; });
    if (id === 'rpm') todas(st => { st.rpm *= 1.15; });
    if (id === 'recarga') todas(st => { st.recarga *= 0.75; });
    if (id === 'pente') todas((st, a) => { st.pente = Math.round(st.pente * 1.3); a.reservaMax = st.pente * 7; a.reserva = a.reservaMax; a.pente = st.pente; });
    if (id === 'vel') bonus.vel *= 1.12;
    if (id === 'vida') { jog.hpMax += 30; jog.hp = jog.hpMax; }
    if (id === 'armadura') { jog.armadura += 50; jog.armaduraMax = Math.max(jog.armaduraMax, jog.armadura); }
    if (id === 'crit') bonus.crit *= 1.3;
    if (id === 'vampiro') todas(st => { st.vampiro += 0.03; });
    if (id === 'grana') bonus.grana *= 1.4;
    if (id === 'granadas') jog.granadas += 2;
    if (id === 'kits') jog.kits += 2;
    if (id === 'torreta') jog.torretas += 1;
    if (id === 'fogo') todas(st => { st.fogo = true; });
    if (id === 'perfura') todas(st => { st.perfura += 1; });
    cartasPegas.push(id);
    atualizarHudVida(); atualizarHudItens(); atualizarHudArma();
  }
  function oferecerCartas() {
    if (jog.morto || acabou) return;
    const unicas = new Set(['fogo']);
    const pool = CARTAS.filter(c => !(unicas.has(c.id) && cartasPegas.includes(c.id)) && !(c.id === 'fogo' && armas.every(a => a.st.fogo)));
    const op = [...pool].sort(() => Math.random() - 0.5).slice(0, 3);
    escolhendo = true;
    gatilho = false; mirando = false;
    for (const k in teclas) teclas[k] = false;
    if (document.pointerLockElement) document.exitPointerLock();
    $('cartasLista').innerHTML = op.map((c, i) => `<button class="cartaM" data-carta="${c.id}"><i>${c.icone}</i><b>${c.nome}</b><span>${c.desc}</span><small>${mobile ? 'toque' : 'tecla ' + (i + 1)}</small></button>`).join('');
    $('cartas').style.display = 'flex';
    som.raro();
    $('cartasLista').querySelectorAll('[data-carta]').forEach(b => b.addEventListener('click', () => {
      if (!escolhendo) return;
      aplicarCarta(b.dataset.carta);
      const c = CARTAS.find(x => x.id === b.dataset.carta);
      feed(`Melhoria: ${c.nome}`, '#ffd86a');
      escolhendo = false;
      $('cartas').style.display = 'none';
      som.pegar();
      ultimo = performance.now();
      if (!mobile) canvas.requestPointerLock?.();
    }));
  }

  // ---------- loop ----------
  const vecProj = new THREE.Vector3();
  let ultimo = performance.now();
  function quadro(agora) {
    raf = requestAnimationFrame(quadro);
    let dt = (agora - ultimo) / 1000;
    ultimo = agora;
    if (dt > 0.05) dt = 0.05;
    if (!pausado && !escolhendo) atualizar(dt);
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
    let vel = 5.2 * st.lenta * (correndo ? 1.45 : 1) * (1 - mira * 0.4) * (jog.curando > 0 ? 0.6 : 1) * (1 + 0.04 * nv('velocidade')) * bonus.vel;
    const sy = Math.sin(jog.yaw), cy = Math.cos(jog.yaw);
    mov.x = (-sy * f + cy * s) * vel;
    mov.z = (-cy * f - sy * s) * vel;
    if (!jog.noChao) { mov.x *= 0.92; mov.z *= 0.92; }
    jog.x += mov.x * dt; jog.z += mov.z * dt;
    if (jog.dash > 0) { jog.dash -= dt; jog.x += jog.dashX * dt; jog.z += jog.dashZ * dt; }
    jog.invul = Math.max(0, jog.invul - dt);
    jog.cdEsq = Math.max(0, jog.cdEsq - dt);
    jog.cdFaca = Math.max(0, jog.cdFaca - dt);
    jog.faca = Math.max(0, jog.faca - dt);
    jog.semDano += dt;
    if (nv('regen') && jog.semDano > 4 && jog.hp < jog.hpMax && !jog.morto) {
      jog.hp = Math.min(jog.hpMax, jog.hp + nv('regen') * dt);
      if (Math.floor(tempo * 4) !== Math.floor((tempo - dt) * 4)) atualizarHudVida();
    }
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
    if (mag > 0.1 && jog.noChao) { const antes = Math.floor(jog.passo / Math.PI); jog.passo += dt * vel * 1.6; if (Math.floor(jog.passo / Math.PI) !== antes) som.passo(zona.id, correndo); }

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
    if (!jog.morto && (gatilho || autoDispara) && cadencia <= 0 && recarregando <= 0 && trocando <= 0 && !correndo && jog.faca <= 0) {
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
        const k = Math.min(1, z.morte * 3.2);
        const queda = k * k * (Math.PI / 2) * (z.queda || -1);
        ud.corpo.rotation.x = queda;
        ud.corpo.rotation.z = (z.giroQueda || 0) * k;
        ud.corpo.position.y = Math.sin(k * Math.PI) * 0.15 + 0.12 * k - Math.max(0, z.morte - 3.5) * 0.5;
        if (ud.bracoE) { ud.bracoE.rotation.x = 2.6 * k; ud.bracoD.rotation.x = 2.2 * k; }
        if (z.morte > 4.6) { cena.remove(z.g); z.g.userData.mats.forEach(m => m.dispose()); zumbis.splice(i, 1); }
        continue;
      }
      vivos++;
      if (z.def.boss && (!chefeVivo || z.hp / z.hpMax < chefeVivo.hp / chefeVivo.hpMax)) chefeVivo = z;
      const dx = jog.x - z.x, dz = jog.z - z.z, dist = Math.hypot(dx, dz);
      let mx = 0, mz = 0;
      const alcance = z.raio + RAIO_JOG + 0.45;

      if (z.fogo > 0) {
        z.fogo -= dt;
        danoZumbi(z, z.fogoDps * dt, false, z.x, 1, z.z, 'fogo');
        if (Math.random() < dt * 25) particula(z.x + rand(-0.3, 0.3), rand(0.4, 1.6) * z.escala, z.z + rand(-0.3, 0.3), 0, rand(1, 3), 0, 0.4, 0.08, Math.random() < 0.5 ? 0xff6a10 : 0xffc020, -2);
        if (!z.vivo) continue;
      }

      // comportamentos especiais
      if (z.buff > 0) z.buff -= dt;
      if (z.revelado > 0) z.revelado -= dt;
      if (z.tipo === 'toxico') { z.cdGas -= dt; if (z.cdGas <= 0) { z.cdGas = 3; criarNuvem(z.x, z.z, 2.2, 8, 6); } }
      if (z.tipo === 'espectro') {
        const alvoOp = z.revelado > 0 || dist < 5 ? 1 : (st.termico && mira > 0.35) ? 0.85 : 0.06;
        const op = ud.mats[0].opacity + (alvoOp - ud.mats[0].opacity) * Math.min(1, dt * 5);
        ud.mats.forEach(m => { m.opacity = op; });
      }
      let ctrl = null;
      if (!jog.morto) {
        if (z.def.boss) ctrl = iaChefe(z, dt, dx, dz, dist);
        else if (z.tipo === 'gritador') ctrl = iaGritador(z, dt, dx, dz, dist);
        if (!z.vivo) continue;
      }
      const cuspindo = !ctrl && z.tipo === 'cuspidor' && dist < 14 && dist > 4 && !jog.morto;
      if (ctrl) { mx = ctrl.mx; mz = ctrl.mz; }
      else if (cuspindo) {
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
      } else if (distracao && distracao.t > 0 && !z.def.boss && dist > 6 && Math.hypot(z.x - distracao.x, z.z - distracao.z) < 60) {
        const ax = distracao.x - z.x, az = distracao.z - z.z, ad = Math.hypot(ax, az);
        if (ad > 3.5) { mx = ax / ad; mz = az / ad; }
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
      const v = z.vel * (z.ataque > 0 ? 0.3 : 1) * (z.buff > 0 ? 1.4 : 1) * (z.surgir > 0 ? 0.15 : 1);
      z.x += mx * v * dt; z.z += mz * v * dt;
      colidir(z, z.raio);
      z.g.position.set(z.x, 0, z.z);
      if (z.surgir > 0) { z.surgir -= dt; z.g.position.y = -1.5 * Math.min(1, z.surgir); }
      const yawAlvo = z.ia === 'carga' || z.ia === 'prep' && z.iaT <= 0.3 ? Math.atan2(-z.dir.x, -z.dir.z) : ctrl && (ctrl.mx || ctrl.mz) && z.tipo === 'gritador' ? Math.atan2(-mx, -mz) : Math.atan2(-dx, -dz);
      let dy = yawAlvo - z.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      z.yaw += dy * Math.min(1, dt * 8);
      z.g.rotation.y = z.yaw;

      // ataque corpo a corpo
      z.cdAtaque -= dt;
      if (z.tipo === 'inchado' && dist < 1.9 && !jog.morto) { z.hp = 0; matar(z, false); continue; }
      if (dist < alcance && z.cdAtaque <= 0 && z.ataque <= 0 && !jog.morto && z.ia === 'normal' && z.tonto <= 0 && !(z.surgir > 0)) z.ataque = 0.45;
      if (z.ataque > 0) {
        z.ataque -= dt;
        if (z.ataque <= 0) {
          z.cdAtaque = z.tipo === 'corredor' ? 0.7 : 1.1;
          if (dist < alcance + 0.4) danoJogador(z.dano * (z.buff > 0 ? 1.3 : 1), false, z);
          if (Math.random() < 0.25) som.zumbiAtaque(dist, 0);
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
      if (ud.canE) { ud.canE.rotation.x = -Math.max(0, passo) * 0.9 - 0.05; ud.canD.rotation.x = -Math.max(0, -passo) * 0.9 - 0.05; }
      if (ud.antE) { ud.antE.rotation.x = 0.25 + Math.sin(z.fase * 0.7) * 0.15 - golpe * 0.2; ud.antD.rotation.x = 0.3 - Math.sin(z.fase * 0.6) * 0.15 - golpe * 0.2; }
      if (ud.mandibula) ud.mandibula.rotation.x = 0.12 + Math.abs(Math.sin(tempo * 7 + z.fase)) * 0.18 + golpe * 0.4 + (z.tipo === 'gritador' && z.iaT > 0 ? 0.7 : 0);
      if (ud.cabeca) { ud.cabeca.rotation.y = Math.sin(tempo * 1.3 + z.fase) * 0.25 + (Math.sin(tempo * 13 + z.fase * 3) > 0.97 ? 0.3 : 0); ud.cabeca.rotation.x = Math.sin(tempo * 0.9 + z.fase) * 0.12; }
      if (ud.asas) ud.asas.forEach((a, j) => { a.rotation.y = (j ? 1 : -1) * (0.4 + Math.sin(tempo * 6) * 0.25); });
      ud.corpo.position.y = Math.abs(passo) * 0.05;
      if (z.tipo === 'rastejante') {
        ud.corpo.rotation.x = -1.25; ud.corpo.position.z = 0.75; ud.corpo.position.y = 0;
        ud.bracoE.rotation.x = 1.9 + Math.sin(z.fase) * 0.5 + golpe;
        ud.bracoD.rotation.x = 1.9 - Math.sin(z.fase) * 0.5 + golpe;
        ud.pernaE.rotation.x = -0.2 + passo * 0.2; ud.pernaD.rotation.x = -0.2 - passo * 0.2;
      }
      if (z.ia === 'pisao' || (z.tipo === 'gritador' && z.iaT > 0)) { ud.bracoE.rotation.x = ud.bracoD.rotation.x = 2.9; }
      if (z.ia === 'prep') { ud.bracoD.rotation.x = 2.8; ud.corpo.rotation.x = 0.15; }
      if (z.ia === 'carga') { ud.corpo.rotation.x = -0.5; ud.bracoD.rotation.x = 1.6; }
      if (z.tonto > 0) { ud.corpo.rotation.z = Math.sin(tempo * 8) * 0.15; } else ud.corpo.rotation.z = 0;

      z.flash -= dt;
      const aviso = z.ia === 'prep' || z.ia === 'pisao';
      const emis = z.flash > 0 ? 0x802020 : aviso ? (Math.sin(tempo * 30) > 0 ? 0xa02000 : 0x400000) : z.fogo > 0 ? (Math.random() < 0.5 ? 0x602000 : 0x301000)
        : z.buff > 0 ? 0x401808 : z.elite ? 0x403000 : 0x000000;
      if (ud.ultimoEmis !== emis) { ud.mats.forEach(m => m.emissive.setHex(emis)); ud.ultimoEmis = emis; }

      z.gemido -= dt;
      if (z.gemido <= 0) {
        z.gemido = rand(3, 8);
        if (dist < 26) {
          const pan = clamp((dx * Math.cos(jog.yaw) - dz * Math.sin(jog.yaw)) / (dist + 1) * -1, -1, 1);
          if (z.def.boss) som.rugido(z.tipo);
          else if (z.tipo === 'corredor' && Math.random() < 0.4 && som.corredor(dist, pan)) { /* grito do corredor */ }
          else som.gemido(dist, pan);
        }
      }
    }
    hud.vivos.textContent = estado === 'onda' ? `Zumbis: ${vivos + filaSpawn.length}` : estado === 'extracao' ? 'VÁ PARA O HELIPONTO' : 'Prepare-se';
    if (chefeVivo) {
      hud.bossBar.style.display = 'block';
      hud.bossFill.style.width = (chefeVivo.hp / chefeVivo.hpMax * 100) + '%';
      hud.bossArm.style.width = chefeVivo.armaduraMax ? (Math.max(0, chefeVivo.armadura) / chefeVivo.armaduraMax * 100) + '%' : '0%';
      hud.bossArm.parentElement.style.display = chefeVivo.armaduraMax ? '' : 'none';
      if (hud.bossNome.textContent !== chefeVivo.def.nome.toUpperCase()) hud.bossNome.textContent = chefeVivo.def.nome.toUpperCase();
    }
    atualizarInteracao(dt);
    atualizarEvento(dt);
    atualizarTorretas(dt);
    atualizarNuvens(dt);
    atualizarChoques(dt);
    atualizarSuprimentos(dt);

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
        const cor = p.tipo === 'pedra' ? 0x6a6050 : p.tipo === 'acido' ? 0xd040ff : 0x9cff3a;
        if (Math.random() < 0.6) particula(p.x, p.y, p.z, 0, 0, 0, 0.3, p.tipo === 'pedra' ? 0.12 : 0.06, cor, 0);
        const dj = Math.hypot(p.x - jog.x, p.z - jog.z);
        const raioP = p.tipo === 'pedra' ? 1.1 : 0.7;
        let caiu = false;
        if (dj < raioP && p.y > jog.y - 0.2 && p.y < jog.y + 2) { danoJogador(p.dano, false, { x: p.x - p.vx, z: p.z - p.vz }); sangue(p.x, p.y, p.z, 6, cor); remover = true; }
        else if (p.y < 0 || p.t <= 0) { sangue(p.x, 0.1, p.z, 8, cor); remover = true; caiu = true; }
        else for (const b of obst) if (p.x > b.minx && p.x < b.maxx && p.z > b.minz && p.z < b.maxz && p.y < b.h) { remover = true; caiu = true; break; }
        if (caiu && p.tipo === 'pedra') { bolaFogo(p.x, 0.5, p.z, 2.5, 0x8a7a60); tremor = Math.max(tremor, 0.2); if (dj < 3) danoJogador(p.dano * 0.5, false, p); }
        if (caiu && p.tipo === 'acido') criarNuvem(p.x, p.z, 1.8, 10, 3.5);
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
        } else if (l.tipo === 'kit') { jog.kits = Math.min(5, jog.kits + 1); atualizarHudItens(); feed('+1 Kit médico', '#f88'); som.pegar();
        } else if (l.tipo === 'granada') { jog.granadas = Math.min(5, jog.granadas + 1); atualizarHudItens(); feed('+1 Granada', '#fd6'); som.pegar();
        } else if (l.tipo === 'mod') {
          const md = MOD_POR_ID[l.valor]; modsAchados.push(l.valor);
          feed(`MOD: ${md.nome}`, TIERS[md.tier].cor); anunciar(`Acessório encontrado: ${md.nome}`, TIERS[md.tier].cor, 2); som.raro();
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
    const nomeOnda = n => sobrevivencia ? `Sobrevivência — onda ${n}` : `Onda ${n}/${zona.ondas}`;
    if (estado === 'preparo') {
      timerEstado -= dt;
      hud.onda.textContent = onda === 0 ? `${sobrevivencia ? 'Sobrevivência' : 'Raid'}: ${zona.nome}` : `${nomeOnda(onda)} concluída`;
      if (timerEstado <= 0) {
        onda++;
        filaSpawn = montarOnda(onda);
        estado = 'onda';
        const evId = sortearEvento(onda);
        if (evId) iniciarEvento(evId);
        const final = onda === TOTAL_ONDAS;
        const chefeNaOnda = filaSpawn.some(t => ZUMBIS[t].boss);
        anunciar(final ? `ONDA FINAL ${onda}` : chefeNaOnda ? `ONDA ${onda} — CHEFE!` : `ONDA ${onda}`, final || chefeNaOnda ? '#ff4050' : '#fff');
        som.onda();
        falar(final ? 'onda_final' : 'onda');
        if (onda === 2 || onda % 3 === 0) proxSuprimento = rand(10, 18);
      } else if (timerEstado < 3.2 && Math.floor(timerEstado + dt) !== Math.floor(timerEstado)) {
        anunciar(`Próxima onda em ${Math.ceil(timerEstado)}`, '#ccc', 1);
      }
    } else if (estado === 'onda') {
      hud.onda.textContent = nomeOnda(onda) + (evento ? ' · ' + EVENTOS[evento.id].nome : '');
      timerSpawn -= dt;
      const maxVivos = Math.min(30, 12 + onda * 1.5) + (evento && evento.id === 'horda' ? 6 : 0);
      if (filaSpawn.length && timerSpawn <= 0 && vivos < maxVivos) {
        spawnZumbi(filaSpawn.shift());
        timerSpawn = Math.max(0.3, 1.1 - onda * 0.07) * (evento && evento.id === 'horda' ? 0.55 : 1);
      }
      if (!filaSpawn.length && vivos === 0) {
        const bonus = Math.round(60 * Math.min(onda, 30) * recompensa);
        ganho += bonus;
        feed(`Onda ${onda} limpa +${fmt(bonus)}`, '#9f9');
        terminarEvento();
        soltarLoot('municao', 0, 2);
        if (onda % 2 === 0) soltarLoot('vida', 2, 0);
        if (!sobrevivencia && onda >= zona.ondas) {
          estado = 'extracao';
          feixe.visible = true;
          hud.ext.style.display = 'block';
          anunciar('EXTRAÇÃO LIBERADA! Vá ao heliponto', '#40ff80', 4); falar('extracao', true);
          som.raro();
        } else if (sobrevivencia && onda % 5 === 0) {
          estado = 'extracao'; janela = 30;
          feixe.visible = true;
          hud.ext.style.display = 'block';
          anunciar('Helicóptero por 30s! Extraia ou continue lutando', '#40ff80', 4);
          som.raro();
        } else { estado = 'preparo'; timerEstado = 7; oferecerCartas(); }
      }
    } else if (estado === 'extracao') {
      hud.onda.textContent = sobrevivencia ? `EXTRAÇÃO (${Math.ceil(janela)}s)` : 'EXTRAÇÃO';
      timerTrickle -= dt;
      if (timerTrickle <= 0 && vivos < 12) { spawnZumbi(Math.random() < 0.3 ? 'corredor' : 'errante'); timerTrickle = 2.2; }
      const dh = Math.hypot(jog.x - CEL_HELI.x, jog.z - CEL_HELI.z);
      if (dh < 4 && !jog.morto) extracao += dt / 6; else extracao = Math.max(0, extracao - dt / 12);
      hud.extFill.style.width = (extracao * 100) + '%';
      feixe.material.opacity = 0.1 + Math.sin(tempo * 4) * 0.05;
      if (extracao >= 1) { anunciar('EXTRAÍDO!', '#40ff80'); terminar(true); return; }
      if (sobrevivencia) {
        janela -= dt;
        if (janela <= 0) {
          estado = 'preparo'; timerEstado = 3; extracao = 0;
          feixe.visible = false; hud.ext.style.display = 'none';
          anunciar('O helicóptero foi embora... continue sobrevivendo!', '#ff9060', 3);
        }
      }
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
      if (fg.apagado) continue;
      const lg = fg.larg || 1.2;
      if (Math.random() < dt * 30) particula(fg.x + rand(-lg, lg), fg.y || 1.6, fg.z + rand(-lg * 0.5, lg * 0.5), rand(-0.3, 0.3), rand(1.5, 3.5), rand(-0.3, 0.3), rand(0.4, 0.9), rand(0.1, 0.22), Math.random() < 0.6 ? 0xff6a10 : 0xffb020, -1);
      if (Math.random() < dt * 4) marcas.fumaca(fg.x + rand(-0.3, 0.3), (fg.y || 1.6) + 1.2, fg.z, 1.2);
    }
    ceu.update(dt, camera.position);
    clima.update(dt, camera.position);
    nevoa.update(dt, camera.position);
    marcas.update(dt);
    for (const n of neons) {
      if (!n.pisca) continue;
      n.t -= dt;
      if (n.t <= 0) { n.t = Math.random() < 0.8 ? rand(0.03, 0.12) : rand(1, 4); n.m.visible = !n.m.visible || Math.random() < 0.3; }
    }
    for (const v of piscas) {
      const fase = Math.floor(tempo * 4) % 2;
      v.vermelho.visible = fase === 0; v.azul.visible = fase === 1;
      v.fonte.cor.setHex(fase ? 0x2040ff : 0xff2020);
    }
    luzesPouso.forEach((l, i) => { l.visible = estado === 'extracao' ? Math.floor(tempo * 6 + i) % 2 === 0 : i % 2 === 0; });
    if (zona.id === 'base' || mod.has('lua')) {
      proxRelampago -= dt;
      if (proxRelampago <= 0) { relampago = 1; proxRelampago = rand(8, 18); setTimeout(() => !acabou && som.pisao(), rand(300, 1200)); }
    }
    relampago = Math.max(0, relampago - dt * 3);
    const flashR = relampago > 0.6 || (relampago > 0.2 && relampago < 0.35) ? relampago : 0;
    ceu.flash(flashR);
    hemi.intensity = hemiBase * (0.4 + 0.6 * energia) + flashR * 2.5;
    if (alto) {
      lua.position.set(jog.x + luaDir.x * 50, luaDir.y * 50, jog.z + luaDir.z * 50);
      lua.target.position.set(jog.x, 0, jog.z);
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
    const dYaw = jog.yaw - ultYaw, dPitch = jog.pitch - ultPitch; ultYaw = jog.yaw; ultPitch = jog.pitch;
    swayY += (-clamp(dYaw, -0.15, 0.15) * 1.6 - swayY) * Math.min(1, dt * 9);   // a arma "atrasa" ao virar
    swayP += (clamp(dPitch, -0.15, 0.15) * 1.2 - swayP) * Math.min(1, dt * 9);
    const lateral = (mov.x * Math.cos(jog.yaw) - mov.z * Math.sin(jog.yaw));
    lean += (clamp(-lateral * 0.004, -0.03, 0.03) - lean) * Math.min(1, dt * 8);  // inclina ao andar de lado
    flinch = Math.max(0, flinch - dt * 4);
    camera.position.set(jog.x, (jog.morto ? 0.5 : jog.y + ALTURA_OLHO - jog.pousou * 0.12) + Math.sin(jog.passo * 2) * 0.035 * bob * (1 - mira) * (jog.noChao ? 1 : 0) * (correndo ? 1.5 : 1), jog.z);
    camera.rotation.set(jog.pitch + rand(-1, 1) * tremor * 0.03 - flinch * 0.05, jog.yaw + rand(-1, 1) * tremor * 0.03 + Math.sin(tempo * 40) * flinch * 0.01, jog.morto ? 0.5 : lean + Math.sin(jog.passo) * 0.004 * bob * (correndo ? 2 : 1) + flinch * 0.03);
    const fovAlvo = 75 / (1 + (a.st.zoom - 1) * mira) + (correndo ? 6 : 0) + (jog.dash > 0 ? 10 : 0);
    if (Math.abs(camera.fov - fovAlvo) > 0.05) { camera.fov += (fovAlvo - camera.fov) * Math.min(1, dt * 14); camera.updateProjectionMatrix(); }
    vmCam.position.copy(camera.position);
    vmCam.quaternion.copy(camera.quaternion);

    // arma na mão
    chute = Math.max(0, chute - dt * 9);
    const comp = a.mesh.userData.comprimento;
    const pist = a.def.tipo === 'pistola';
    const base = pist ? { x: 0.13, y: -0.13, z: -0.32 } : { x: 0.15, y: -0.155, z: -0.3 - comp * 0.08 };
    const ads = { x: 0, y: -(a.mesh.userData.miraY || 0.08), z: pist ? -0.38 : -0.3 };
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
    if (jog.faca > 0) py -= 0.35; // abaixa a arma para o golpe do facão
    if (jog.dash > 0) { rz += 0.3; px -= 0.05; }
    // respiração, balanço ao virar e animação de inspeção da arma (tecla Y)
    const resp = (1 - mira * 0.8);
    py += Math.sin(tempo * 1.7) * 0.0016 * resp; px += Math.sin(tempo * 0.9) * 0.0012 * resp;
    ry += swayY * 0.7 * resp; rx += swayP * 0.6 * resp; px += swayY * 0.018 * resp; py += swayP * 0.012 * resp; rz += lean * 6;
    if (inspec > 0) {
      if (gatilho || mira > 0.3 || correndo || recarregando > 0) inspec = 0;
      else {
        inspec -= dt;
        const t0 = 1 - inspec / 2.6, k = Math.sin(Math.min(1, t0 * 1.15) * Math.PI);
        px -= 0.07 * k; py += 0.025 * k; pz += 0.1 * k;
        ry += k * 1.25 * Math.sin(t0 * 6.28); rz += k * 0.5 * Math.sin(t0 * 6.28 * 1.5); rx -= k * 0.25;
      }
    }
    a.mesh.position.set(px, py, pz);
    a.mesh.rotation.set(rx, ry, rz);
    // golpe do facão: corta da direita para a esquerda
    facaMesh.visible = jog.faca > 0 && !jog.morto;
    if (facaMesh.visible) {
      const k = 1 - jog.faca / 0.32;
      facaMesh.position.set(0.28 - k * 0.5, -0.12 - Math.sin(k * Math.PI) * 0.06, -0.38);
      facaMesh.rotation.set(-0.3, 0.6 - k * 1.6, -0.9 + k * 0.4);
    }
    const sniperMira = a.def.tipo === 'sniper' && mira > 0.85;
    a.mesh.visible = !sniperMira && !jog.morto;
    hud.luneta.style.display = sniperMira ? 'block' : 'none';
    const uda = a.mesh.userData;
    uda.animar(tempo);
    if (a.def.tipo === 'escopeta') {
      const kp = clamp((tempo - ultimoTiro - 0.12) / 0.38, 0, 1);
      uda.ferrolho.position.z = Math.sin(kp * Math.PI) * uda.ferroCurso;
    } else uda.ferrolho.position.z = chute * uda.ferroCurso;
    if (recarregando > 0) {
      const kr = 1 - recarregando / a.st.recarga;
      uda.carregador.position.y = -Math.sin(Math.min(1, kr * 1.25) * Math.PI) * 0.2;
      uda.carregador.visible = !(kr > 0.32 && kr < 0.55);
    } else { uda.carregador.position.y = 0; uda.carregador.visible = true; }
    for (const c of capsulas) {
      if (c.vida <= 0) continue;
      c.vida -= dt;
      c.v.y -= 7 * dt;
      c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += c.w * dt; c.m.rotation.z += c.w * 0.6 * dt;
      if (c.vida <= 0) c.m.visible = false;
    }
    vmLuzTiro.intensity = Math.max(0, vmLuzTiro.intensity - dt * 60);

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

    if (pos.grade) {
      pos.grade.uniforms.uTempo.value = tempo;
      pos.grade.uniforms.uBaixa.value = jog.morto ? 1 : clamp(1 - jog.hp / (jog.hpMax * 0.35), 0, 1);
      pos.grade.uniforms.uDano.value = Math.min(1, flashDano);
    }
    pos.render();

    // HUD por quadro
    const spread = (a.st.disp * (1 - mira * 0.7) * (Math.hypot(mov.x, mov.z) > 0.1 ? 1.5 : 1) * (1 + Math.min(abrirFogo, 1) * 0.8)) * 900 + 6;
    hud.mira.style.setProperty('--abre', (a.def.tipo === 'sniper' && mira < 0.9 ? 40 : spread) + 'px');
    hud.mira.style.opacity = sniperMira ? 0 : (1 - mira * 0.6);
    hud.mira.classList.toggle('travada', !!(alvoAssist && alvoAssist.naMira));
    hud.hit.style.opacity = hitmarker > 0 ? 1 : 0;
    if (mobile) {
      btnEsq.style.opacity = jog.cdEsq > 0 ? 0.35 : 1;
      btnFaca.style.opacity = jog.cdFaca > 0 ? 0.5 : 1;
    }
    hud.hit.classList.toggle('cabeca', hitCabeca);
    hud.dano.style.opacity = pos.grade ? flashDano * 0.5 : Math.max(flashDano, jog.hp < 30 ? 0.35 + Math.sin(tempo * 5) * 0.15 : 0);

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
    for (const b of baus) if (!b.aberto) { mctx.fillStyle = b.cofre ? (b.trancado ? '#ff5050' : '#ffd040') : b.premium ? '#ffd040' : '#60c8ff'; mctx.fillRect((b.x + L) * s - 2, (b.z + L) * s - 2, 4, 4); }
    for (const o of objetivos) if (!o.ligado) { mctx.fillStyle = '#ffd040'; mctx.beginPath(); mctx.arc((o.x + L) * s, (o.z + L) * s, 3.2, 0, 7); mctx.fill(); mctx.strokeStyle = '#000'; mctx.lineWidth = 1; mctx.stroke(); }
    for (const sp of suprimentos) { mctx.fillStyle = '#ff4030'; mctx.fillRect((sp.x + L) * s - 3, (sp.z + L) * s - 3, 6, 6); }
    for (const t of torretas) { mctx.fillStyle = '#7f7'; mctx.fillRect((t.x + L) * s - 2, (t.z + L) * s - 2, 4, 4); }
    for (const z of zumbis) {
      if (!z.vivo || (z.tipo === 'espectro' && z.revelado <= 0 && !a.st.termico)) continue;
      mctx.fillStyle = z.def.boss ? '#f0f' : z.elite ? '#fd3' : '#f33';
      const r = z.def.boss ? 5 : z.tipo === 'bruto' || z.elite ? 3 : 2;
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
  $('cartas').style.display = 'none';
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
  ambiente(zona.id);
  atualizarObjHud();
  setTimeout(() => !acabou && falar('inicio_' + zona.id, true), 3200);
  marca('pronto');
  raf = requestAnimationFrame(t => { ultimo = t; quadro(t); });

  if (location.search.includes('debug')) window.__raid = { baus, portas, objetivos, interativos, perigos, quebraveis, fontes, cofres, obst, tp(x, z) { jog.x = x; jog.z = z; jog.y = 0; }, interagir, abrirPorta, abrirBau, iniciarObjetivo, completarObjetivo, iniciarEvento, terminarEvento, get evento() { return evento; }, oferecerCartas, aplicarCarta, bonus, get escolhendo() { return escolhendo; }, get energia() { return energia; }, get objFeitos() { return objFeitos; }, get interAtual() { return interAtual; }, modsAchados, get placar2() { return placar; }, falar, jog, zumbis, armas, spawnZumbi, set onda(v) { onda = v; }, get estado() { return estado; }, fire(v) { gatilho = v; disparoSolto = true; }, pular() { timerEstado = 0; }, matarTodos() { filaSpawn = []; zumbis.forEach(z => z.vivo && matar(z, false)); }, mirar(v) { mirando = v; }, pularAgora: pular, get alvo() { return alvoAssist; }, facada, esquivar, colocarTorreta, lancarSuprimento, placar, get ganho() { return ganho; } };
  return {
    pausar,
    abandonar() { pausado = false; terminar(false); },
    continuar() { pausar(false); },
  };
}
