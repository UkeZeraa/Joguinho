// Laboratório X-13: complexo fechado com corredores, salas de contenção, portas de segurança e terminais.
import * as THREE from 'three';
import { rand, escolher, b, grupos, adicionar, fechar, parede, bloco, salaCofre } from './cen_util.js';
import { texTeto } from './terreno.js';

export function lab(A) {
  const L = A.L, G = grupos(), cena = A.cena, T = A.tinta;
  const H = 4.4, ESP = 0.6;
  const PAR = 'lab';

  // ---------------- paredes externas
  const ext = 1.4;
  parede(A, G, PAR, -L, -L, L, -L, ext, H + 0.4, [], 0xffffff, 'parede', 99);
  parede(A, G, PAR, -L, L, L, L, ext, H + 0.4, [], 0xffffff, 'parede', 99);
  parede(A, G, PAR, -L, -L, -L, L, ext, H + 0.4, [], 0xffffff, 'parede', 99);
  parede(A, G, PAR, L, -L, L, L, ext, H + 0.4, [], 0xffffff, 'parede', 99);

  // pisos dos corredores e das salas
  T.push({ t: 'piso', x: 0, z: 0, w: 2 * L, d: 2 * L, cor: '#8d9896', passo: 2 });
  T.push({ t: 'piso', x: 0, z: 0, w: 10, d: 2 * L - 4, cor: '#a8b2b0', passo: 2 });
  T.push({ t: 'piso', x: 0, z: 0, w: 2 * L - 4, d: 10, cor: '#a8b2b0', passo: 2 });
  T.push({ t: 'perigo', x: 0, z: 0, w: 10, d: 0.9 }, { t: 'perigo', x: 0, z: 0, w: 0.9, d: 10 });
  T.push({ t: 'circulo', x: 0, z: 0, r: 4.4, cor: '#40d080', lw: 0.25 });

  // ---------------- salas por quadrante
  const portasSeg = [];
  const salas = [];
  const door = (x, z, eixo, aberta) => {
    if (aberta) return;
    portasSeg.push(A.porta({ x, z, eixo, w: 3, h: 3.4, modo: 'desliza', cor: 0x9aa4a6 }));
  };
  // paredes e vãos do quadrante (sx, sz): mapeia coordenadas locais (u,v>0) para o mundo
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const X = u => sx * u, Z = v => sz * v;
    const jit = () => rand(-5, 5);
    const gaps = {
      w0a: 17 + jit(), w0b: 44 + jit(),     // vãos da parede junto ao corredor vertical (u=5)
      w1a: 17 + jit(), w1b: 44 + jit(),     // junto ao corredor horizontal (v=5)
      m1a: 15 + jit(), m1b: 45 + jit(),     // parede do meio u=31 (R1|R2 e R3|R4)
      m2a: 17 + jit(), m2b: 45 + jit(),     // parede do meio v=31 (R1|R3 e R2|R4)
    };
    const ponto = (x, z) => [x, z];
    // parede u=5 (vertical): x fixo, vão em z
    const gz = v => sz * v;
    const gx = u => sx * u;
    parede(A, G, PAR, X(5), Z(5), X(5), Z(59.6), ESP, H, [[gz(gaps.w0a), 3], [gz(gaps.w0b), 3]].sort((p, q) => p[0] - q[0]), 0xffffff, 'parede');
    parede(A, G, PAR, X(5), Z(5), X(59.6), Z(5), ESP, H, [[gx(gaps.w1a), 3], [gx(gaps.w1b), 3]].sort((p, q) => p[0] - q[0]), 0xffffff, 'parede');
    parede(A, G, PAR, X(31), Z(5), X(31), Z(59.6), ESP, H, [[gz(gaps.m1a), 3], [gz(gaps.m1b), 3]].sort((p, q) => p[0] - q[0]), 0xffffff, 'parede');
    parede(A, G, PAR, X(5), Z(31), X(59.6), Z(31), ESP, H, [[gx(gaps.m2a), 3], [gx(gaps.m2b), 3]].sort((p, q) => p[0] - q[0]), 0xffffff, 'parede');
    // portas deslizantes (algumas fecham o vão)
    const talvez = () => Math.random() < 0.5;
    door(X(5), Z(gaps.w0a), 'z', !talvez()); door(X(5), Z(gaps.w0b), 'z', !talvez());
    door(X(gaps.w1a), Z(5), 'x', !talvez()); door(X(gaps.w1b), Z(5), 'x', !talvez());
    door(X(31), Z(gaps.m1a), 'z', Math.random() < 0.7); door(X(31), Z(gaps.m1b), 'z', Math.random() < 0.7);
    door(X(gaps.m2a), Z(31), 'x', Math.random() < 0.7); door(X(gaps.m2b), Z(31), 'x', Math.random() < 0.7);
    for (const [u0, u1, v0, v1] of [[5, 31, 5, 31], [31, 58, 5, 31], [5, 31, 31, 58], [31, 58, 31, 58]]) {
      const sala = { x0: Math.min(X(u0), X(u1)), x1: Math.max(X(u0), X(u1)), z0: Math.min(Z(v0), Z(v1)), z1: Math.max(Z(v0), Z(v1)) };
      sala.cx = (sala.x0 + sala.x1) / 2; sala.cz = (sala.z0 + sala.z1) / 2;
      salas.push(sala);
      T.push({ t: 'piso', x: sala.cx, z: sala.cz, w: sala.x1 - sala.x0 - 1, d: sala.z1 - sala.z0 - 1, cor: escolher(['#8f9a98', '#8a9a94', '#98948c', '#8a909c']), passo: 2, borda: 'rgba(40,200,120,0.45)' });
    }
  }

  // ---------------- teto e luminárias
  const tetoM = new THREE.Mesh(new THREE.PlaneGeometry(2 * L, 2 * L), new THREE.MeshLambertMaterial({ map: (() => { const t = A.reg(texTeto('lab')); t.repeat.set(L / 2, L / 2); return t; })(), color: 0x9aa4a4 }));
  tetoM.rotation.x = Math.PI / 2; tetoM.position.y = H + 0.9;
  cena.add(tetoM);
  const luminarias = [];
  const placas = [];
  for (const sala of salas) {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) placas.push(b(sala.cx + (i ? 6 : -6), H - 0.05, sala.cz + (j ? 6 : -6), 3.6, 0.1, 0.7, 0xe8fff0, { var: 0 }));
    A.fonte(sala.cx, H - 0.6, sala.cz, 0xcfffe8, 11, 26, { lamp: true, pisca: Math.random() < 0.3 });
  }
  for (let p = -48; p <= 48; p += 16) {
    placas.push(b(0, H - 0.05, p, 0.7, 0.1, 3.6, 0xe8fff0, { var: 0 }), b(p, H - 0.05, 0, 3.6, 0.1, 0.7, 0xe8fff0, { var: 0 }));
    if (Math.abs(p) > 2) { A.fonte(0, H - 0.6, p, 0xcfffe8, 9, 22, { lamp: true, pisca: Math.random() < 0.25 }); A.fonte(p, H - 0.6, 0, 0xcfffe8, 9, 22, { lamp: true }); }
  }
  for (const pl of placas) adicionar(G, 'brilho', pl);
  // luzes de emergência vermelhas giratórias
  const giratorias = [];
  for (const [x, z] of [[0, 20], [0, -20], [20, 0], [-20, 0]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xff2010, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    cone.geometry.translate(0, -4.5, 0); cone.rotation.z = Math.PI / 2.4;
    const piv = new THREE.Group(); piv.position.set(x, H - 0.3, z); piv.add(cone);
    piv.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3020, toneMapped: false })));
    cena.add(piv); giratorias.push(piv);
  }
  A.anim.push((dt, t) => { giratorias.forEach((p, i) => { p.rotation.y = t * 2.2 + i; }); });

  // ---------------- reator no centro
  {
    const m = A.malhaVC([b(0, 0.3, 0, 3.4, 0.6, 3.4, 0x2a3030, { g: 'cil' }), b(0, 2.6, 0, 1.8, 4.6, 1.8, 0x3a4a46, { g: 'cil' }), b(0, 5.1, 0, 3.0, 0.5, 3.0, 0x2a3030, { g: 'cil' })]);
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 4.2, 12), new THREE.MeshBasicMaterial({ color: 0x40ff90, transparent: true, opacity: 0.85, toneMapped: false }));
    nucleo.position.y = 2.6; m.add(nucleo);
    cena.add(m);
    A.addObst(0, 0, 3.2, 3.2, 5, 'predio');
    A.fonte(0, 2.6, 0, 0x40ff90, 26, 26);
    A.anim.push((dt, t) => { nucleo.material.opacity = 0.7 + Math.sin(t * 3) * 0.2; nucleo.scale.x = nucleo.scale.z = 1 + Math.sin(t * 6) * 0.06; });
  }

  // ---------------- equipamentos nas salas
  const props = [];
  const tubosLista = [];
  const bancada = (x, z, giro) => {
    const w = giro ? 1.2 : 4, d = giro ? 4 : 1.2;
    adicionar(G, 'liso', b(x, 0.45, z, w, 0.9, d, 0xc8d0d0), b(x, 0.95, z, w + 0.1, 0.1, d + 0.1, 0x2a3030));
    A.addObst(x, z, w, d, 1.0, 'caixa');
    for (let i = 0; i < 3; i++) adicionar(G, 'liso', b(x + (giro ? 0 : (i - 1) * 1.1), 1.2, z + (giro ? (i - 1) * 1.1 : 0), 0.3, 0.4, 0.3, escolher([0x40a0ff, 0xff6040, 0x40ff80, 0xe0e0e0])));
  };
  const servidores = (x, z, giro) => {
    const w = giro ? 0.9 : 3.6, d = giro ? 3.6 : 0.9;
    adicionar(G, 'liso', b(x, 1.1, z, w, 2.2, d, 0x1c2022));
    A.addObst(x, z, w, d, 2.2, 'caixa');
    for (let i = 0; i < 9; i++) adicionar(G, 'brilho', b(x + (giro ? 0.46 : (i - 4) * 0.38), 0.6 + (i % 3) * 0.5, z + (giro ? (i - 4) * 0.38 : 0.46), giro ? 0.03 : 0.12, 0.08, giro ? 0.12 : 0.03, escolher([0x40ff80, 0xff4030, 0x40a0ff]), { var: 0 }));
  };
  const maca = (x, z) => { adicionar(G, 'liso', b(x, 0.6, z, 0.9, 0.12, 2.0, 0xd8dcdc), b(x, 0.3, z, 0.7, 0.5, 1.8, 0x707878)); A.addObst(x, z, 0.9, 2.0, 0.7, 'caixa'); };
  const tubo = (x, z, conteudo) => {
    const g = new THREE.Group();
    g.add(A.malhaVC([b(0, 0.2, 0, 1.3, 0.4, 1.3, 0x303838, { g: 'cil' }), b(0, 3.0, 0, 1.3, 0.3, 1.3, 0x303838, { g: 'cil' })]));
    const vidro = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.6, 14, 1, true), new THREE.MeshBasicMaterial({ color: conteudo ? 0x60ff90 : 0x3a8a60, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    vidro.position.y = 1.6; g.add(vidro);
    if (conteudo) { // silhueta dentro do tubo
      const sil = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.1, 4, 8), new THREE.MeshBasicMaterial({ color: 0x1a3a22, transparent: true, opacity: 0.8 }));
      sil.position.y = 1.5; g.add(sil); g.userData.sil = sil;
    }
    g.position.set(x, 0, z); cena.add(g);
    const o = A.addObst(x, z, 1.1, 1.1, 3.0, 'tubo'); o.mesh = g;
    A.quebravel(o, { hp: 30, tubo: !!conteudo, gas: true });
    tubosLista.push({ g, conteudo, x, z });
    if (conteudo) A.fonte(x, 1.6, z, 0x60ff90, 7, 10);
    return o;
  };
  const caixaLab = (x, z) => { const s = rand(0.9, 1.3); adicionar(G, 'liso', b(x, s / 2, z, s, s, s, 0x8a9490)); A.addObst(x, z, s, s, s, 'caixa'); };

  const nBaus = Math.round(8 * (A.pouco === 1 ? 1 : 0.75));
  const salasMisturadas = [...salas].sort(() => Math.random() - 0.5);
  let baus = 0;
  for (const sala of salas) {
    const n = Math.floor(rand(5, 8) * A.pouco);
    for (let i = 0, t = 0; i < n && t < 60; t++) {
      const x = rand(sala.x0 + 3, sala.x1 - 3), z = rand(sala.z0 + 3, sala.z1 - 3);
      const r = Math.random();
      const giro = Math.random() < 0.5;
      if (!A.livre(x, z, 4.2, 4.2, 1.2)) continue;
      if (r < 0.25) bancada(x, z, giro);
      else if (r < 0.4) servidores(x, z, giro);
      else if (r < 0.55) maca(x, z);
      else if (r < 0.8) tubo(x, z, Math.random() < 0.55);
      else caixaLab(x, z);
      i++;
    }
    // vazamento de gás/vapor
    if (Math.random() < 0.6) A.vapor(sala.cx + rand(-6, 6), sala.cz + rand(-6, 6));
    if (Math.random() < 0.5) T.push({ t: 'poca', x: sala.cx + rand(-8, 8), z: sala.cz + rand(-8, 8), r: rand(1, 2.2), cor: 'sangue' });
  }
  for (const sala of salasMisturadas) {
    if (baus >= nBaus) break;
    const x = rand(sala.x0 + 2.5, sala.x1 - 2.5), z = rand(sala.z0 + 2.5, sala.z1 - 2.5);
    if (!A.livre(x, z, 1.4, 1.4, 0.8)) continue;
    A.bau({ x, z, rot: rand(0, 6.28), estilo: Math.random() < 0.5 ? 'armario' : 'maleta' }); baus++;
  }
  // corredores: algumas caixas e cadáveres
  A.decorar(A.VIS.cadaver, Math.round(8 * A.pouco));
  A.espalhar('barril', 4, 52);
  // ---------------- terminais (objetivo)
  const termSalas = [...salas].sort(() => Math.random() - 0.5).slice(0, A.zona.objetivo.qtd);
  for (const sala of termSalas) {
    let x = sala.cx, z = sala.cz;
    for (let t = 0; t < 40 && !A.livre(x, z, 2, 1.4, 0.8); t++) { x = rand(sala.x0 + 3, sala.x1 - 3); z = rand(sala.z0 + 3, sala.z1 - 3); }
    const m = A.malhaVC([b(0, 0.55, 0, 1.4, 1.1, 0.9, 0x2a3236), b(0, 1.3, -0.1, 1.2, 0.8, 0.12, 0x101416, { rx: -0.35 }), b(0, 0.9, 0.5, 1.2, 0.08, 0.35, 0x3a4246)]);
    const tela = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false }));
    tela.position.set(0, 1.3, 0.0); tela.rotation.x = -0.35; tela.position.z = -0.02 + 0.07; m.add(tela);
    m.position.set(x, 0, z); m.rotation.y = Math.PI; cena.add(m);
    A.addObst(x, z, 1.4, 0.9, 1.2, 'caixa');
    A.objetivo({ x, z, mesh: m, nome: 'Terminal', verbo: 'Hackear terminal', luz: [0x40e0ff, 8, 10], tela });
  }
  // ---------------- sala de armas (cofre) no canto da sala mais distante
  const longe = [...salas].sort((p, q) => Math.hypot(q.cx, q.cz - 46) - Math.hypot(p.cx, p.cz - 46))[0];
  salaCofre(A, G, PAR, longe.cx + (longe.cx > 0 ? 10 : -10), longe.cz + (longe.cz > 0 ? 10 : -10), longe.cx > 0 ? 'W' : 'E', { cor: 0xf0f0f0, nome: 'Sala de Armas X-13', corLuz: 0x40e0ff, corPorta: 0x4a5a5e });
  // ---------------- câmeras de segurança giratórias
  const cams = [];
  for (const [x, z] of [[3.5, 36], [-3.5, -36], [36, 3.5], [-36, -3.5]]) {
    const piv = new THREE.Group(); piv.position.set(x, H - 0.4, z);
    piv.add(A.malhaVC([b(0, 0, 0, 0.35, 0.3, 0.7, 0x3a4244), b(0, 0, 0.36, 0.14, 0.14, 0.04, 0xff2020, { var: 0 })]));
    cena.add(piv); cams.push(piv);
  }
  A.anim.push((dt, t) => cams.forEach((c, i) => { c.rotation.y = Math.sin(t * 0.6 + i) * 1.1; }));
  fechar(A, G);
  A.ajustes.lua = 0.12; A.ajustes.hemi = 0.55; A.ajustes.neblina = 0.022; A.ajustes.sombraTeto = true;
  A.ajustes.corPortas = 0x9aa4a6;
}
