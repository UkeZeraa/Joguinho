// Centro em Chamas: arranha-céus, avenidas engarrafadas, posto de gasolina que explode, metrô elevado e válvulas de gás.
import * as THREE from 'three';
import { rand, escolher, b, grupos, adicionar, fechar, parede, edificio, bloco, salaCofre } from './cen_util.js';

export function centro(A) {
  const L = A.L, G = grupos(), cena = A.cena, T = A.tinta;
  const calc = (cx, cz, w, d) => T.push({ t: 'calc', x: cx, z: cz, w: w + 5.2, d: d + 5.2 });

  // ---------------- ruas
  T.push({ t: 'rua', x: 0, z: 0, w: 12, d: 2 * L }, { t: 'rua', x: 0, z: 0, w: 2 * L, d: 12 });
  for (const s of [-1, 1]) T.push({ t: 'rua', x: s * 36, z: 0, w: 8, d: 2 * L }, { t: 'rua', x: 0, z: s * 36, w: 2 * L, d: 8 });
  for (const [cx, cz, h] of [[0, 9, true], [0, -9, true], [9, 0, false], [-9, 0, false]]) { // faixas de pedestre
    for (let k = -4; k <= 4; k++) T.push(h ? { t: 'concreto', x: cx + k * 1.3, z: cz, w: 0.7, d: 3, cor: '#cfcfc6', passo: 99 } : { t: 'concreto', x: cx, z: cz + k * 1.3, w: 3, d: 0.7, cor: '#cfcfc6', passo: 99 });
  }

  // ---------------- borda de arranha-céus
  for (const lado of [0, 1, 2, 3]) {
    let p = -L;
    const face = [[0, 1], [0, -1], [1, 0], [-1, 0]][lado];
    while (p < L) {
      const larg = Math.min(rand(11, 17), L - p), prof = rand(7, 10), h = rand(10, 30), meio = p + larg / 2;
      const faces = Math.abs(meio) < 36 && Math.random() < 0.6 ? [face] : [];
      if (lado === 0) A.predio(meio, -L + prof / 2, larg, prof, h, faces);
      if (lado === 1) A.predio(meio, L - prof / 2, larg, prof, h, faces);
      if (lado === 2) A.predio(-L + prof / 2, meio, prof, larg, h, faces);
      if (lado === 3) A.predio(L - prof / 2, meio, prof, larg, h, faces);
      p += larg;
    }
  }
  // ---------------- quarteirões
  const blocos = [];
  const pr = (x, z, w, d, h, faces) => { A.predio(x, z, w, d, h, faces); blocos.push([x, z, w, d]); };
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (!(sx === -1 && sz === 1) && !(sx === 1 && sz === -1)) pr(sx * 19, sz * 19, rand(15, 19), rand(15, 19), rand(12, 26), [[-sx, 0], [0, -sz]]); // (-19,19) é o posto; (19,-19) é o banco
    pr(sx * 47.5, sz * 19, 12, 22, rand(12, 28), [[-sx, 0], [0, -sz]]);
    pr(sx * 19, sz * 47.5, 18, 11, rand(10, 24), [[0, -sz], [-sx, 0]]);
    if (!(sx === 1 && sz === -1)) pr(sx * 47.5, sz * 47.5, 12, 11, rand(10, 22), [[-sx, 0]]); // (47.5,-47.5) guarda o cofre
  }
  pr(19, -19, 18, 18, 24, [[-1, 0], [0, 1]]); // banco
  salaCofre(A, G, 'tijolo', 47.5, -47.5, 'W', { cor: 0x7a4a3a, nome: 'Cofre do Banco', corLuz: 0xffc050, corPorta: 0x2a2a2e });
  blocos.forEach(([x, z, w, d]) => calc(x, z, w, d));

  // ---------------- posto de gasolina (bombas explodem em cadeia)
  {
    const cx = -19, cz = 19;
    T.push({ t: 'concreto', x: cx, z: cz, w: 26, d: 24, cor: '#5a5a56', passo: 4 });
    const p = [b(0, 4.6, 0, 15, 0.5, 9, 0xd8d8d0), b(0, 4.95, 0, 15.2, 0.2, 9.2, 0xc02820)];
    for (const [dx, dz] of [[-6.5, -3.5], [6.5, -3.5], [-6.5, 3.5], [6.5, 3.5]]) { p.push(b(dx, 2.2, dz, 0.6, 4.4, 0.6, 0xb8b8b0)); A.addObst(cx + dx, cz + dz, 0.6, 0.6, 4.4, 'pilar'); }
    const m = A.malhaVC(p); m.position.set(cx, 0, cz); cena.add(m);
    for (const dx of [-4, 0, 4]) A.fonte(cx + dx, 4.2, cz, 0xfff0c0, 10, 14, { lamp: true });
    for (const [dx, dz] of [[-3, -1.5], [-3, 1.5], [3, -1.5], [3, 1.5]]) {
      const bm = A.malhaVC([b(0, 0.85, 0, 0.9, 1.7, 0.6, 0xc03020), b(0, 1.2, 0.31, 0.6, 0.35, 0.02, 0x80c0ff, { var: 0 }), b(0.55, 1.1, 0, 0.1, 0.1, 0.1, 0x1a1a1a), b(0, 1.75, 0, 1.0, 0.1, 0.7, 0x2a2a2a)]);
      bm.position.set(cx + dx, 0, cz + dz); cena.add(bm);
      const o = A.addObst(cx + dx, cz + dz, 0.9, 0.6, 1.8, 'bomba');
      o.mesh = bm;
      A.quebravel(o, { hp: 55, explode: { raio: 6, dano: 180, fogo: true } });
    }
    // loja de conveniência
    const loja = edificio(A, G, 'concreto', cx, cz + 17, 11, 7, 3.6, [{ lado: 'N', pos: 0, larg: 2.2, modo: 'desliza', cor: 0x2a3a4a }], { cor: 0xb8c0b0, telhado: 'plano', esp: 0.5 });
    A.bau({ x: cx + 3.5, z: cz + 19, rot: Math.PI, estilo: 'armario' });
    adicionar(G, 'liso', b(cx - 1, 0.55, cz + 17, 4.5, 1.1, 0.9, 0x8a8a84)); // balcão
    A.addObst(cx - 1, cz + 17, 4.5, 0.9, 1.1, 'caixa');
    T.push({ t: 'texto', x: cx, z: cz - 6, texto: 'POSTO', tam: 2.2, cor: 'rgba(230,200,40,0.85)' });
  }

  // ---------------- metrô elevado (trilho no alto + trem passando)
  {
    const zT = -34;
    const pl = [b(0, 7.2, 0, 2 * L + 10, 1.0, 8.2, 0x6a6a64), b(0, 7.9, 3.9, 2 * L + 10, 0.6, 0.2, 0x4a4a46), b(0, 7.9, -3.9, 2 * L + 10, 0.6, 0.2, 0x4a4a46), b(0, 7.75, 0.9, 2 * L + 10, 0.06, 0.12, 0x8a7a50), b(0, 7.75, -0.9, 2 * L + 10, 0.06, 0.12, 0x8a7a50)];
    for (let x = -L + 2; x < L; x += 2) pl.push(b(x, 7.72, 0, 0.3, 0.06, 2.4, 0x3a2a1a));
    const m = A.malhaVC(pl); m.position.set(0, 0, zT); cena.add(m);
    for (const px of [-48, -24, 0, 24, 48]) {
      const pm = A.malhaVC([b(0, 3.3, 0, 1.6, 6.6, 1.6, 0x7a7a74), b(0, 6.8, 0, 3.4, 0.8, 5.2, 0x6a6a64)]);
      pm.position.set(px, 0, zT); cena.add(pm);
      A.addObst(px, zT, 1.6, 1.6, 6.6, 'pilar');
    }
    // trem
    const trem = new THREE.Group();
    const corpo = [], janelas = [];
    for (let v = 0; v < 4; v++) {
      const x = v * 11;
      corpo.push(b(x, 0, 0, 10.4, 2.8, 2.6, 0x9a9a98), b(x, -1.1, 0, 10.4, 0.5, 2.7, 0x2a2a30), b(x, 1.4, 0, 10.2, 0.2, 2.5, 0x606068));
      for (let k = 0; k < 5; k++) { janelas.push(b(x - 4 + k * 2, 0.35, 1.31, 1.4, 0.9, 0.05, 0xffe9b0, { var: 0 }), b(x - 4 + k * 2, 0.35, -1.31, 1.4, 0.9, 0.05, 0xffe9b0, { var: 0 })); }
    }
    trem.add(A.malhaVC(corpo));
    const jm = new THREE.Mesh(A.mesclar(janelas), new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false }));
    trem.add(jm);
    trem.position.set(-L - 60, 8.9, zT); cena.add(trem);
    let tT = rand(8, 18), x = -L - 60, ativo = false;
    A.anim.push((dt, t) => {
      tT -= dt;
      if (!ativo && tT <= 0) { ativo = true; x = -L - 50; A.som.trem?.(); }
      if (ativo) { x += 38 * dt; trem.position.x = x; if (x > L + 60) { ativo = false; tT = rand(25, 45); trem.position.x = -L - 90; } }
    });
  }

  // ---------------- barricada policial, engarrafamento e carros queimados
  A.viatura(-3, 24, true); A.viatura(3.2, 25.5, true); A.espalhar('barreira', 3, 7, 0, 28);
  A.bau({ x: 0, z: 27, rot: 0, estilo: 'militar' });
  A.viatura(2.5, -16, true); A.viatura(-2.5, -17, true);
  A.bau({ x: 0, z: -19.5, rot: 0, estilo: 'maleta' });
  const queimados = 4;
  let nCarros = 0, tent = 0, nAlarme = 0;
  while (nCarros < 30 && tent++ < 700) {
    const giro = Math.random() < 0.5;
    const naAv = Math.random() < 0.65, vertical = Math.random() < 0.5;
    const cx = naAv ? (vertical ? rand(-4.5, 4.5) : rand(-45, 45)) : rand(-45, 45), cz = naAv ? (vertical ? rand(-45, 45) : rand(-4.5, 4.5)) : rand(-45, 45);
    if (!A.livre(cx, cz, giro ? 1.9 : 4.2, giro ? 4.2 : 1.9, 2.2)) continue;
    const m = A.carro(cx, cz, giro, nCarros < queimados);
    if (nCarros >= queimados && nAlarme < 3) { A.alarme({ x: cx, z: cz, mesh: m }); nAlarme++; }
    nCarros++;
  }

  // ---------------- válvulas de gás (objetivo): ao fechar tudo os incêndios se apagam
  const nVal = A.zona.objetivo.qtd;
  const spots = [[8, -12], [-8, 14], [9, 40], [-10, -40], [30, 8], [-30, -8]].sort(() => Math.random() - 0.5);
  let nv = 0;
  for (const [x0, z0] of spots) {
    if (nv >= nVal) break;
    let x = x0, z = z0;
    for (let t = 0; t < 30 && !A.livre(x, z, 1.4, 1.4, 0.5); t++) { x = x0 + rand(-3, 3); z = z0 + rand(-3, 3); }
    const m = A.malhaVC([b(0, 0.12, 0, 1.4, 0.24, 1.4, 0x4a4a46), b(0, 0.75, 0, 0.36, 1.3, 0.36, 0xb01c10, { g: 'cil' }), b(0, 1.0, 0, 1.1, 0.1, 0.1, 0xb01c10), b(0, 1.0, 0, 0.1, 0.1, 1.1, 0xb01c10), b(0.5, 0.35, 0, 0.9, 0.22, 0.22, 0x707070), b(0.9, 0.5, 0, 0.3, 0.3, 0.3, 0xd8b020, { g: 'cil', rx: 1.57 })]);
    m.position.set(x, 0, z); cena.add(m);
    A.addObst(x, z, 1.4, 1.4, 1.3, 'caixa');
    A.objetivo({ x, z, mesh: m, nome: 'Válvula', verbo: 'Fechar válvula de gás', luz: [0x40ff60, 6, 8], girar: m.children[0] });
    nv++;
  }
  A.aoCompletar.push(() => {
    A.fogos.forEach(f => { f.apagado = true; if (f.fonte) f.fonte.int = 0; });
    A.anunciar('Os incêndios se apagaram!', '#9fe8ff', 3);
  });

  // ---------------- semáforos piscando
  for (const [x, z] of [[7, 7], [-7, -7], [7, -7], [-7, 7], [43, 7], [-43, -7], [7, 43], [-7, -43]]) A.semaforo(x, z);
  // ---------------- postes, decoração e caixas
  for (const [px, pz] of [[-8, 8], [8, -8], [-26, -4], [26, 6], [-10, -24], [12, 24], [-8, 44], [8, -44], [40, 6], [-40, -6]]) A.poste(px, pz, Math.random() < 0.3, rand(0, 6.28));
  A.decorar(A.VIS.cone, Math.round(12 * A.pouco));
  A.decorar(A.VIS.sacoLixo, Math.round(18 * A.pouco));
  A.decorar(A.VIS.cadaver, Math.round(8 * A.pouco));
  A.espalhar('caixa', 12, 44); A.espalhar('barril', 9, 44); A.espalhar('barreira', 7, 44); A.espalhar('cacamba', 4, 44);
  A.barrilFogo(-12, 6); A.barrilFogo(14, -26); A.barrilFogo(-28, 32);
  A.espalharBaus(4, ['madeira', 'maleta', 'militar'], 44);
  fechar(A, G);
  A.ajustes.neblina = 0.027;
}
