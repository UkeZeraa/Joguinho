// Base Militar Caída: fortaleza murada com portão, quartéis, hangar, torres de vigia para escalar, pista e paiol.
import * as THREE from 'three';
import { rand, escolher, b, grupos, adicionar, fechar, parede, edificio, bloco, salaCofre, degraus } from './cen_util.js';

export function base(A) {
  const L = A.L, G = grupos(), cena = A.cena, T = A.tinta, VIS = A.VIS;
  const CO = 'concreto';

  // ---------------- muralha externa e muro interno com portão
  const ext = 1.6, hm = 5.2;
  parede(A, G, CO, -L, -L, L, -L, ext, hm, [], 0xffffff, 'parede', 99);
  parede(A, G, CO, -L, L, L, L, ext, hm, [], 0xffffff, 'parede', 99);
  parede(A, G, CO, -L, -L, -L, L, ext, hm, [], 0xffffff, 'parede', 99);
  parede(A, G, CO, L, -L, L, L, ext, hm, [], 0xffffff, 'parede', 99);
  const zMuro = 20;
  parede(A, G, CO, -L, zMuro, L, zMuro, 1.0, 3.8, [[0, 10], [-50, 6], [50, 6]], 0xd8d8d0, 'parede', 3.2);
  const portao = A.porta({ x: 0, z: zMuro, eixo: 'x', w: 10, h: 3.6, modo: 'desliza', cor: 0x4a5236, trancada: false });
  portao.aviso = 'Portão da base';
  // estradas e pátios
  T.push({ t: 'terra', x: 0, z: 0, w: 2 * L, d: 2 * L, cor: '#6a5d44' });
  T.push({ t: 'rua', x: 0, z: 0, w: 9, d: 2 * L });
  T.push({ t: 'concreto', x: 0, z: -2, w: 44, d: 30, cor: '#8a8678', passo: 5 });
  T.push({ t: 'circulo', x: 0, z: -2, r: 8, cor: '#e0c020', lw: 0.3 });
  T.push({ t: 'concreto', x: -26, z: 46, w: 28, d: 14, cor: '#777468', passo: 4 });
  T.push({ t: 'concreto', x: 26, z: 46, w: 28, d: 14, cor: '#777468', passo: 4 });
  T.push({ t: 'concreto', x: 52, z: 38, w: 30, d: 26, cor: '#6a6a60', passo: 5 });
  T.push({ t: 'concreto', x: -44, z: -46, w: 38, d: 30, cor: '#7a7a70', passo: 6 });
  T.push({ t: 'pista', x: 64, z: 0, w: 14, d: 2 * L - 6 });
  T.push({ t: 'perigo', x: 0, z: zMuro + 3, w: 10, d: 1.4 });
  T.push({ t: 'texto', x: 0, z: 56, texto: 'ENTRADA', tam: 1.5, cor: 'rgba(230,220,120,0.75)' });
  T.push({ t: 'poca', x: -10, z: 30, r: 3, cor: 'agua' }, { t: 'poca', x: 14, z: -30, r: 2.4, cor: 'sangue' });

  // ---------------- quartéis (sul)
  for (const sx of [-1, 1]) {
    const cx = sx * 27, cz = 46;
    edificio(A, G, CO, cx, cz, 24, 8, 3.8, [{ lado: sx < 0 ? 'E' : 'W', pos: -2, larg: 2, modo: 'desliza', cor: 0x4a5236 }, { lado: 'N', pos: 6, larg: 2, aberta: true }], { cor: 0xb8b8a8, telhado: 'metal', corTelhado: 0x5a6a4a, esp: 0.5 });
    A.bau({ x: cx + sx * 8, z: cz - 2.4, rot: Math.PI, estilo: 'militar' });
    A.bau({ x: cx - sx * 4, z: cz + 2.8, rot: 0, estilo: 'armario' });
    for (let i = 0; i < 4; i++) adicionar(G, 'liso', b(cx - 8 + i * 4.5, 0.35, cz - 2.8, 1.0, 0.5, 2.0, 0x4a5a3a)); // beliches
  }
  // tendas
  for (let i = 0; i < 7; i++) {
    const tx = -55 + (i % 4) * 7, tz = 32 + Math.floor(i / 4) * 10;
    if (!A.livre(tx, tz, 4.5, 4.5, 0.6)) continue;
    adicionar(G, 'liso', b(tx, 1.0, tz, 4, 2, 4, 0x5a6a3a), { g: 'pir', w: 4.6, h: 1.6, d: 4.6, x: tx, y: 2.8, z: tz, cor: 0x4a5a30 });
    A.addObst(tx, tz, 4, 4, 2, 'predio');
  }
  A.espalharBaus(2, ['militar'], 20, -55, 36);

  // ---------------- pátio de motores (tanques, jipes, combustível)
  for (const [tx, tz, giro] of [[46, 30, false], [58, 40, true]]) {
    const w = giro ? 3.4 : 7, d = giro ? 7 : 3.4;
    const tank = A.malhaVC([b(0, 0.7, 0, 6.6, 1.0, 3.2, 0x4a5236), b(0, 0.2, 1.9, 6.8, 0.5, 0.5, 0x2a2a26), b(0, 0.2, -1.9, 6.8, 0.5, 0.5, 0x2a2a26), b(0, 1.5, -0.1, 3.0, 0.8, 2.4, 0x56603e)]);
    const torre = A.malhaVC([b(0, 0.25, 0, 3.0, 0.8, 2.4, 0x56603e), b(2.6, 0.3, 0, 3.8, 0.28, 0.28, 0x2a2e26, { g: 'cil', rz: 1.5708 })]);
    const g = new THREE.Group(); g.add(tank); torre.position.y = 1.5; g.add(torre);
    g.position.set(tx, 0, tz); g.rotation.y = giro ? Math.PI / 2 : 0; cena.add(g);
    A.addObst(tx, tz, w, d, 2.2, 'carro');
    A.anim.push((dt, t) => { torre.rotation.y = Math.sin(t * 0.25 + tx) * 0.9; });
  }
  A.alarme({ x: 44, z: 42, mesh: A.carro(44, 42, false, false) });
  A.alarme({ x: 52, z: 28, mesh: A.carro(52, 28, true, false) });
  for (const [fx, fz] of [[62, 28], [62, 34], [62, 22]]) {
    const m = A.malhaVC([b(0, 1.0, 0, 2.4, 2.0, 2.4, 0x6a7a5a, { g: 'cil' }), b(0, 2.1, 0, 2.0, 0.2, 2.0, 0x4a5a3a, { g: 'cil' }), b(0, 1.0, 1.2, 0.3, 0.8, 0.05, 0xc03020)]);
    m.position.set(fx, 0, fz); cena.add(m);
    const o = A.addObst(fx, fz, 2.2, 2.2, 2.2, 'barril'); o.mesh = m;
    A.quebravel(o, { hp: 90, explode: { raio: 7, dano: 260, fogo: true } });
  }

  // ---------------- QG e arsenal (norte do portão)
  {
    const cx = -33, cz = -9;
    edificio(A, G, CO, cx, cz, 22, 12, 4.6, [{ lado: 'S', pos: -5, larg: 2.2, modo: 'desliza', cor: 0x3a4a5a }, { lado: 'E', pos: 0, larg: 2, aberta: true }], { cor: 0xb0b0a0, telhado: 'plano', esp: 0.5 });
    parede(A, G, CO, cx - 3, cz - 5.8, cx - 3, cz + 1, 0.3, 4.6, [[cz - 2.5, 2]], 0xb0b0a0);
    const radio = A.malhaVC([b(0, 0.45, 0, 1.4, 0.9, 0.8, 0x3a4236), b(0, 1.1, 0, 1.0, 0.5, 0.7, 0x2a2e2a), b(0.3, 1.5, 0, 0.05, 1.4, 0.05, 0xb0b0b0), b(-0.2, 1.1, 0.36, 0.5, 0.2, 0.04, 0x40ff80, { var: 0 })]);
    radio.position.set(cx - 8, 0, cz - 4.5); radio.rotation.y = 0; cena.add(radio);
    A.addObst(cx - 8, cz - 4.5, 1.4, 0.8, 1.0, 'caixa');
    A.objetivo({ x: cx - 8, z: cz - 4.5, mesh: radio, nome: 'Rádio', verbo: 'Sintonizar rádio de comando', luz: [0x40ff80, 8, 10] });
    A.bau({ x: cx + 6, z: cz - 4.5, rot: 0, estilo: 'armario' });
    adicionar(G, 'liso', b(cx + 4, 0.45, cz + 2, 5, 0.9, 1.4, 0x6a5a40)); A.addObst(cx + 4, cz + 2, 5, 1.4, 0.9, 'caixa'); // mesa de comando
  }
  {
    const cx = 36, cz = -9;
    edificio(A, G, CO, cx, cz, 14, 10, 4.0, [{ lado: 'W', pos: 0, larg: 2.4, modo: 'desliza', cor: 0x4a5236 }], { cor: 0x9a9a8a, telhado: 'plano', esp: 0.5 });
    A.bau({ x: cx + 5, z: cz - 3, rot: Math.PI, estilo: 'militar' }); A.bau({ x: cx + 5, z: cz + 3, rot: Math.PI, estilo: 'militar' }); A.bau({ x: cx - 3, z: cz - 3.6, rot: Math.PI, estilo: 'militar' });
  }

  // ---------------- hangar com helicóptero caído
  {
    const cx = -46, cz = -46;
    const h = edificio(A, G, 'metal', cx, cz, 28, 20, 9.5, [{ lado: 'E', pos: 0, larg: 14, aberta: true }], { cor: 0x9a9e98, telhado: 'metal', esp: 0.6, corTelhado: 0x707470, altPortico: 8.4 });
    const hel = A.malhaVC([b(0, 1.2, 0, 3.6, 1.8, 1.8, 0x3a4236), b(-3.2, 1.7, 0, 3.4, 0.4, 0.4, 0x3a4236), b(0, 2.3, 0, 8.0, 0.08, 0.5, 0x1a1a1a, { rz: 0.3 }), b(0, 0.15, 0.7, 3.0, 0.1, 0.1, 0x1a1a1a), b(0, 0.15, -0.7, 3.0, 0.1, 0.1, 0x1a1a1a)]);
    hel.position.set(cx - 4, 0, cz); hel.rotation.z = 0.0; hel.rotation.y = 0.5; cena.add(hel);
    A.addObst(cx - 4, cz, 4.2, 3.4, 2.4, 'carro');
    A.bau({ x: cx + 8, z: cz - 7, rot: Math.PI / 2, estilo: 'militar' });
    for (let i = 0; i < 4; i++) { const bx = cx - 10 + i * 2, bz = cz + 7; adicionar(G, 'liso', b(bx, 0.4, bz, 1.0, 0.8, 1.0, 0x7a6a30)); A.addObst(bx, bz, 1.0, 1.0, 0.8, 'caixa'); }
    A.fonte(cx + 6, 6, cz, 0xffe8b0, 14, 28, { lamp: true, pisca: true });
  }

  // ---------------- torres de vigia para escalar (degraus + plataforma)
  const torres = [[-62, -24], [62, -18], [-62, 56], [64, 62]];
  torres.forEach(([tx, tz], i) => {
    const sx = tx < 0 ? 1 : -1;
    bloco(A, G, CO, tx, tz, 5.4, 5.4, 3.4, 0xc0c0b0, 'predio');
    adicionar(G, 'liso', b(tx, 3.4 + 0.5, tz - 2.5, 5.4, 1.0, 0.5, 0x8a7a50), b(tx, 3.4 + 0.5, tz + 2.5, 5.4, 1.0, 0.5, 0x8a7a50), b(tx - 2.5, 3.4 + 0.5, tz, 0.5, 1.0, 4.5, 0x8a7a50), b(tx + 2.5, 3.4 + 0.5, tz, 0.5, 1.0, 4.5, 0x8a7a50)); // sacos no topo (visual)
    degraus(A, G, CO, tx + sx * 5.45, tz, sx > 0 ? 'W' : 'E', 2.4, [0.85, 1.7, 2.55], 1.1, 0xb0b0a0);
    A.bau({ x: tx, z: tz, y: 3.4, rot: 0, estilo: 'militar' });
    A.fonte(tx, 6, tz, 0xff8030, 8, 12, { lamp: true });
  });
  // ---------------- radar, rádio e mastro
  {
    const cx = 56, cz = -52;
    edificio(A, G, CO, cx, cz, 9, 7, 3.4, [{ lado: 'W', pos: 0, larg: 1.9, modo: 'gira', cor: 0x4a5236 }], { cor: 0xb8b8a8, telhado: 'plano', esp: 0.4 });
    const radio = A.malhaVC([b(0, 0.45, 0, 1.4, 0.9, 0.8, 0x3a4236), b(0, 1.1, 0, 1.0, 0.5, 0.7, 0x2a2e2a), b(-0.2, 1.1, 0.36, 0.5, 0.2, 0.04, 0xff8030, { var: 0 })]);
    radio.position.set(cx + 3, 0, cz); radio.rotation.y = -Math.PI / 2; cena.add(radio);
    A.addObst(cx + 3, cz, 0.9, 1.4, 1.0, 'caixa');
    A.objetivo({ x: cx + 3, z: cz, mesh: radio, nome: 'Rádio', verbo: 'Sintonizar rádio de comando', luz: [0x40ff80, 8, 10] });
    const prato = new THREE.Group();
    prato.add(A.malhaVC([b(0, 0, 0, 5.4, 0.3, 3.4, 0xd0d0c8, { g: 'cup', ry: 0 }), b(0, 0.9, 0, 0.12, 1.8, 0.12, 0x8a8a84)]));
    prato.children[0].rotation.x = -0.9;
    const pv = new THREE.Group(); pv.position.set(cx, 3.4 + 1.2, cz); pv.add(prato); cena.add(pv);
    A.anim.push((dt, t) => { pv.rotation.y = t * 0.7; });
    A.fonte(cx, 6.2, cz, 0xff3030, 5, 10, { lamp: true, pisca: true });
  }
  {
    const mx = -60, mz = -60;
    const m = A.malhaVC([b(0, 14, 0, 0.5, 28, 0.5, 0x8a8a84), b(0, 7, 0, 1.4, 0.2, 1.4, 0x6a6a64), b(0, 14, 0, 1.2, 0.2, 1.2, 0x6a6a64), b(0, 21, 0, 0.9, 0.2, 0.9, 0x6a6a64)]);
    m.position.set(mx, 0, mz); cena.add(m);
    A.addObst(mx, mz, 0.8, 0.8, 28, 'poste');
    const pisca = [];
    for (const y of [10, 20, 28]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false })); l.position.set(mx, y, mz); cena.add(l); pisca.push(l); }
    A.anim.push((dt, t) => pisca.forEach((l, i) => { l.visible = Math.floor(t * 1.2 + i * 0.5) % 2 === 0; }));
  }
  // bandeira no pátio
  A.mastro(0, -2);

  // ---------------- holofotes varrendo o pátio
  const holos = [];
  for (const [x, z] of [[-70, 70], [70, -70], [-70, -70], [70, 70]]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.5, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    cone.geometry.translate(0, -30, 0); cone.rotation.x = -0.9; cone.position.set(0, 0.0, 0);
    const piv = new THREE.Group(); piv.position.set(x, 12, z); piv.add(cone);
    piv.add(A.malhaVC([b(0, 0.0, 0, 1.2, 1.2, 1.6, 0x3a3e38), b(0, -6, 0, 0.4, 12, 0.4, 0x5a5a54)]));
    cena.add(piv); holos.push({ piv, fase: rand(0, 6) });
  }
  A.anim.push((dt, t) => holos.forEach((h, i) => { h.piv.rotation.y = t * 0.35 * (i % 2 ? 1 : -1) + h.fase; }));

  // ---------------- paiol de armas (cofre)
  salaCofre(A, G, CO, 62, -34, 'W', { cor: 0x6a7a5a, nome: 'Paiol de Armas', corLuz: 0xffa030, corPorta: 0x3a4236 });
  // ---------------- cercas, sacos de areia, carros e barris
  for (const [x, z, rot, len] of [[52, 18, 0, 26], [-22, -26, 0, 14], [40, 12, 0, 12]]) { const c = VIS.cercaArame(len); c.position.set(x, 0, z); c.rotation.y = rot; cena.add(c); }
  A.espalhar('sacos', 12, 70); A.espalhar('barril', 7, 70); A.espalhar('caixa', 12, 70); A.espalhar('barreira', 5, 70);
  A.decorar(VIS.cone, Math.round(8 * A.pouco)); A.decorar(VIS.cadaver, Math.round(12 * A.pouco));
  A.barrilFogo(-8, 12); A.barrilFogo(12, 40); A.barrilFogo(-30, 16);
  A.espalharBaus(3, ['militar', 'madeira'], 70);
  fechar(A, G);
  A.ajustes.neblina = 0.025;
}
