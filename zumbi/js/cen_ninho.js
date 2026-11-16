// Ninho da Rainha: caverna viva de carne, ovos que eclodem, piscinas de ácido, casulos para incinerar e cogumelos que brilham.
import * as THREE from 'three';
import { rand, escolher, b, grupos, adicionar, fechar, parede, bloco, salaCofre } from './cen_util.js';

export function ninho(A) {
  const L = A.L, G = grupos(), cena = A.cena, T = A.tinta, VIS = A.VIS;

  // ---------------- parede da caverna (rocha viva ao redor)
  for (const lado of [0, 1, 2, 3]) {
    let p = -L;
    while (p < L) {
      const larg = Math.min(rand(7, 13), L - p), prof = rand(5, 10), h = rand(8, 15), meio = p + larg / 2;
      const nome = Math.random() < 0.6 ? 'rocha' : 'carne';
      const cor = escolher([0xffffff, 0xe0d0e0, 0xc0a8c0]);
      if (lado === 0) bloco(A, G, nome, meio, -L + prof / 2, larg, prof, h, cor, 'predio');
      if (lado === 1) bloco(A, G, nome, meio, L - prof / 2, larg, prof, h, cor, 'predio');
      if (lado === 2) bloco(A, G, nome, -L + prof / 2, meio, prof, larg, h, cor, 'predio');
      if (lado === 3) bloco(A, G, nome, L - prof / 2, meio, prof, larg, h, cor, 'predio');
      p += larg;
    }
  }
  // ---------------- cristas de carne que formam câmaras
  let tent = 0, nCrista = 0;
  while (nCrista < Math.round(16 * A.pouco) && tent++ < 400) {
    const horiz = Math.random() < 0.5, comp = rand(9, 18);
    const cx = rand(-L + 14, L - 14), cz = rand(-L + 14, L - 14);
    const w = horiz ? comp : 1.8, d = horiz ? 1.8 : comp;
    if (!A.livre(cx, cz, w, d, 4.5)) continue;
    const h = rand(3.2, 4.4);
    // as cristas têm um vão no meio ou na ponta para sempre haver passagem
    const gap = [[(horiz ? cx : cz) + rand(-comp / 4, comp / 4), 4.2]];
    parede(A, G, 'carne', horiz ? cx - comp / 2 : cx, horiz ? cz : cz - comp / 2, horiz ? cx + comp / 2 : cx, horiz ? cz : cz + comp / 2, 1.8, h, gap, escolher([0xffffff, 0xe8d0e8]), 'parede', 99);
    nCrista++;
  }
  // ---------------- pilares / estalagmites
  const nPil = Math.round(34 * A.pouco);
  for (let i = 0, t = 0; i < nPil && t < 500; t++) {
    const x = rand(-L + 8, L - 8), z = rand(-L + 8, L - 8), r = rand(0.8, 2.0), h = rand(5, 10);
    if (!A.livre(x, z, r * 2, r * 2, 2.4)) continue;
    adicionar(G, Math.random() < 0.5 ? 'carne' : 'rocha', b(x, h / 2, z, r * 2, h, r * 2, escolher([0xffffff, 0xd8c0d8]), { g: 'cil' }), b(x, h * 0.9, z, r * 2.6, h * 0.22, r * 2.6, 0xe0c8e0, { g: 'cone', rx: Math.PI }));
    A.addObst(x, z, r * 1.7, r * 1.7, h, 'pilar'); i++;
  }

  // ---------------- piscinas de ácido (perigo!)
  const acidos = [];
  const geoPlano = new THREE.CircleGeometry(1, 28);
  for (let i = 0, t = 0; i < Math.round(8 * A.pouco) && t < 200; t++) {
    const x = rand(-L + 14, L - 14), z = rand(-L + 14, L - 14), r = rand(3, 5.5);
    if (!A.livre(x, z, r * 2, r * 2, 2)) continue;
    T.push({ t: 'poca', x, z, r, cor: 'acido', ry: 1 });
    const m = new THREE.Mesh(geoPlano, new THREE.MeshBasicMaterial({ color: 0x60ff40, transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); m.scale.setScalar(r * 0.96);
    cena.add(m); acidos.push({ m, x, z, r, ph: rand(0, 6) });
    A.perigo({ x, z, r: r * 0.92, dps: 10, tipo: 'acido' });
    A.fonte(x, 1.2, z, 0x60ff40, 10, 18);
    i++;
  }
  A.anim.push((dt, t) => {
    for (const a of acidos) {
      a.m.material.opacity = 0.45 + Math.sin(t * 2 + a.ph) * 0.1;
      if (Math.random() < dt * 3) A.particula(a.x + rand(-a.r, a.r) * 0.8, 0.1, a.z + rand(-a.r, a.r) * 0.8, 0, rand(0.6, 1.4), 0, 0.8, 0.18, 0x80ff50, -0.4);
    }
  });

  // ---------------- ovos (eclodem quando você chega perto ou quando levam tiro)
  const matOvo = new THREE.MeshLambertMaterial({ color: 0xd8c8a0, emissive: 0x3a2410 });
  const matMancha = new THREE.MeshBasicMaterial({ color: 0xd060ff, toneMapped: false });
  const geoEsf = new THREE.SphereGeometry(0.5, 12, 10);
  const ovos = [];
  const nGrupos = Math.round(7 * A.pouco);
  for (let gi = 0, t = 0; gi < nGrupos && t < 200; t++) {
    const gx = rand(-L + 14, L - 14), gz = rand(-L + 14, L - 14);
    if (!A.livre(gx, gz, 5, 5, 2)) continue;
    const n = Math.floor(rand(3, 6));
    for (let k = 0; k < n; k++) {
      const x = gx + rand(-2, 2), z = gz + rand(-2, 2), s = rand(0.8, 1.3);
      if (!A.livre(x, z, 0.9 * s, 0.9 * s, 0.2)) continue;
      const g = new THREE.Group();
      const e = new THREE.Mesh(geoEsf, matOvo); e.scale.set(0.9 * s, 1.4 * s, 0.9 * s); e.position.y = 0.7 * s; g.add(e);
      const mc = new THREE.Mesh(geoEsf, matMancha); mc.scale.setScalar(0.18 * s); mc.position.set(0.3 * s, 0.9 * s, 0.3 * s); g.add(mc);
      g.position.set(x, 0, z); cena.add(g);
      const o = A.addObst(x, z, 0.8 * s, 0.8 * s, 1.3 * s, 'ovo'); o.mesh = g;
      A.quebravel(o, { hp: 38, ovo: true });
      ovos.push({ g, e, o, x, z, ph: rand(0, 6), s, tremendo: 0 });
    }
    A.fonte(gx, 1.2, gz, 0xd060ff, 8, 14);
    gi++;
  }
  A.anim.push((dt, t) => {
    for (const ov of ovos) {
      if (ov.o.estourado) continue;
      const jog = A.jog, d = Math.hypot(jog.x - ov.x, jog.z - ov.z);
      ov.e.scale.y = 1.4 * ov.s * (1 + Math.sin(t * 2.4 + ov.ph) * 0.03);
      if (d < 5 && !jog.morto) { ov.tremendo += dt; ov.g.position.x = ov.x + Math.sin(t * 40) * 0.03 * Math.min(1, ov.tremendo * 2); if (ov.tremendo > 1.1) A.quebrarAgora(ov.o); }
      else ov.tremendo = Math.max(0, ov.tremendo - dt);
    }
  });

  // ---------------- casulos (objetivo): incinere todos
  const nCas = A.zona.objetivo.qtd;
  for (let i = 0, t = 0; i < nCas && t < 300; t++) {
    const x = rand(-L + 16, L - 16), z = rand(-L + 16, L - 16);
    if (!A.livre(x, z, 2.6, 2.6, 3)) continue;
    const g = new THREE.Group();
    const e = new THREE.Mesh(geoEsf, new THREE.MeshLambertMaterial({ color: 0x7a2a58, emissive: 0x401030 })); e.scale.set(1.8, 3.2, 1.8); e.position.y = 1.6; g.add(e);
    const core = new THREE.Mesh(geoEsf, new THREE.MeshBasicMaterial({ color: 0xff60d0, toneMapped: false, transparent: true, opacity: 0.8 })); core.scale.set(0.8, 1.5, 0.8); core.position.y = 1.6; g.add(core);
    g.position.set(x, 0, z); cena.add(g);
    A.addObst(x, z, 1.8, 1.8, 3.2, 'caixa');
    A.objetivo({ x, z, mesh: g, nome: 'Casulo', verbo: 'Incinerar casulo', luz: [0xff60d0, 10, 12], efeito: 'casulo', pulso: core });
    A.anim.push((dt, tt) => { e.scale.y = 3.2 * (1 + Math.sin(tt * 1.6 + x) * 0.04); core.material.opacity = 0.6 + Math.sin(tt * 3 + z) * 0.25; });
    i++;
  }
  // ---------------- tumores pulsantes e cogumelos que brilham
  const tum = [];
  for (let i = 0, t = 0; i < Math.round(24 * A.pouco) && t < 300; t++) {
    const x = rand(-L + 6, L - 6), z = rand(-L + 6, L - 6);
    if (!A.livre(x, z, 1.4, 1.4, 0.5)) continue;
    const m = VIS.tumor(Math.random() < 0.7 ? 'roxo' : 'verde'); m.position.set(x, 0, z); m.rotation.y = rand(0, 6.28); cena.add(m);
    tum.push({ m, ph: rand(0, 6) }); i++;
  }
  for (let i = 0, t = 0; i < Math.round(26 * A.pouco) && t < 300; t++) {
    const x = rand(-L + 6, L - 6), z = rand(-L + 6, L - 6);
    if (!A.livre(x, z, 0.8, 0.8, 0.3)) continue;
    const cor = escolher([0x60e0ff, 0xd060ff, 0x80ff80]);
    const m = A.malhaVC([b(0, 0.25, 0, 0.12, 0.5, 0.12, 0xd8d0c8, { g: 'cil' }), b(0, 0.55, 0, 0.6, 0.3, 0.6, cor, { g: 'cup' })]);
    m.material = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });
    m.position.set(x, 0, z); m.scale.setScalar(rand(0.8, 2.2)); cena.add(m);
    if (i % 2 === 0) A.fonte(x, 0.8, z, cor, 9, 15);
    i++;
  }
  A.anim.push((dt, t) => { const k = 1 + Math.max(0, Math.sin(t * 2.2)) ** 6 * 0.14; for (const o of tum) o.m.scale.setScalar(k * (1 + Math.sin(t + o.ph) * 0.03)); });
  A.espalharBaus(6, ['casulo'], 56);
  A.decorar(VIS.cadaver, Math.round(14 * A.pouco));
  A.espalhar('barril', 2, 50);
  salaCofre(A, G, 'carne', -L + 14, 8, 'E', { cor: 0xffffff, nome: 'Câmara Real', corLuz: 0xff60d0, corPorta: 0x5a1a40, estilo: 'casulo' });
  fechar(A, G);
  A.ajustes.neblina = 0.03; A.ajustes.hemi = 1.25; A.ajustes.lua = 0.9;
}
