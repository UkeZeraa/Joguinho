// Subúrbio Abandonado: bairro residencial com casas, escola, igreja, parquinho, árvores e um abrigo antiaéreo trancado.
import * as THREE from 'three';
import { rand, escolher, b, grupos, adicionar, fechar, parede, edificio, bloco, salaCofre, arvore } from './cen_util.js';

const CORES_CASA = [0xe8d8b8, 0xc8d8e0, 0xd8b8b0, 0xb8d0b8, 0xe0c890, 0xd0c8e0, 0xe8e0d0];

export function suburbio(A) {
  const L = A.L, G = grupos(), cena = A.cena, T = A.tinta;
  const VIS = A.VIS;

  // ---------------- ruas e calçadas
  const ruas = [{ x: 0, z: 0, w: 9, d: 2 * L }, { x: 0, z: -22, w: 2 * L, d: 8 }, { x: 0, z: 16, w: 2 * L, d: 8 }];
  for (const s of [-1, 1]) T.push({ t: 'calc', x: s * 5.7, z: 0, w: 2.4, d: 2 * L });
  for (const zc of [-22, 16]) for (const s of [-1, 1]) T.push({ t: 'calc', x: 0, z: zc + s * 5.2, w: 2 * L, d: 2.4 });
  for (const r of ruas) T.push({ t: 'rua', ...r });
  T.push({ t: 'texto', x: 0, z: 40, texto: 'DEVAGAR', tam: 1.4, rot: 0, cor: 'rgba(230,230,200,0.7)' });

  // ---------------- casas
  const colunas = [-36, -17, 17, 36], linhas = [-50, -35, -9, 3, 28, 44];
  const reservado = (cx, cz) =>
    (cz === -50 && cx < 0) || (cx === 36 && cz === -35) || (cx < 0 && (cz === -9 || cz === 3));
  const slots = [];
  for (const cx of colunas) for (const cz of linhas) if (!reservado(cx, cz) && Math.random() > 0.1) slots.push({ cx, cz });
  slots.sort(() => Math.random() - 0.5);
  const nEntravel = Math.round(7 * (A.pouco === 1 ? 1 : 0.7));
  let nBaus = 0;
  slots.forEach((s, i) => {
    const w = rand(8, 10.5), d = rand(7, 9), cx = s.cx + rand(-1.5, 1.5), cz = s.cz + rand(-1.5, 1.5), h = 3.2;
    const cor = escolher(CORES_CASA);
    if (!A.livre(cx, cz, w, d, 0.5)) return;
    const lado = cx < 0 ? 'E' : 'W';
    if (i < nEntravel) {
      const casa = edificio(A, G, 'casa', cx, cz, w, d, h, [{ lado, pos: rand(-1.2, 1.2), larg: 1.8, modo: 'gira' }], { cor, esp: 0.4 });
      const bx = cx + (lado === 'E' ? -1 : 1) * (w / 2 - 1.1);
      A.bau({ x: bx, z: cz + rand(-2, 2), rot: lado === 'E' ? -Math.PI / 2 : Math.PI / 2, estilo: Math.random() < 0.5 ? 'armario' : 'madeira' });
      nBaus++;
      // sofá e mesa (obstáculos pequenos dentro de casa)
      adicionar(G, 'liso', b(cx + rand(-1.5, 1.5), 0.4, cz + rand(-2, 2), 1.8, 0.8, 0.8, 0x6a4a3a));
    } else {
      bloco(A, G, 'casa', cx, cz, w, d, h, cor, 'predio', 'telha');
    }
    // chaminé, garagem de concreto e calçada de entrada
    adicionar(G, 'liso', b(cx + rand(-w / 4, w / 4), h + 1.3, cz + rand(-d / 4, d / 4), 0.7, 1.8, 0.7, 0x7a5848));
    T.push({ t: 'concreto', x: cx + (lado === 'E' ? w / 2 + 4 : -w / 2 - 4), z: cz, w: 8, d: 3, cor: '#8a8a82', passo: 3 });
    if (Math.random() < 0.5) T.push({ t: 'poca', x: cx + rand(-w, w), z: cz + d / 2 + 4, r: rand(1, 2), cor: 'agua' });
  });

  // ---------------- escola (tijolo, 2 salas, 2 baús)
  {
    const cx = -29, cz = -51, w = 26, d = 9, h = 4.2;
    const esc = edificio(A, G, 'tijolo', cx, cz, w, d, h, [
      { lado: 'S', pos: -6, larg: 2.4, aberta: true },
      { lado: 'S', pos: 7, larg: 2.2, modo: 'gira', cor: 0x2a4a6a },
    ], { cor: 0xd8c8b0, telhado: 'plano', esp: 0.5 });
    parede(A, G, 'tijolo', cx - 4.3, esc.z0 + 0.25, cx - 4.3, esc.z1 - 0.25, 0.3, h, [[cz + 1, 2]], 0xd8c8b0);
    parede(A, G, 'tijolo', cx + 4.3, esc.z0 + 0.25, cx + 4.3, esc.z1 - 0.25, 0.3, h, [[cz - 1, 2]], 0xd8c8b0);
    A.bau({ x: cx - 9, z: cz - 2.5, rot: Math.PI, estilo: 'armario' });
    A.bau({ x: cx + 9, z: cz - 2.5, rot: Math.PI, estilo: 'militar' });
    for (let i = 0; i < 6; i++) { // carteiras
      const dx = cx + (i % 3) * 2 - 11 + (i < 3 ? 0 : 0), dz = cz + 1 + Math.floor(i / 3) * 2;
      A.addObst(dx, dz, 1.0, 0.6, 0.8, 'caixa');
      adicionar(G, 'liso', b(dx, 0.4, dz, 1.0, 0.8, 0.6, 0x8a6a3a));
    }
    T.push({ t: 'concreto', x: cx, z: cz + 11, w: w + 4, d: 12, cor: '#7a7a74', passo: 4 });
    T.push({ t: 'texto', x: cx, z: cz + 9, texto: 'ESCOLA', tam: 1.6, cor: 'rgba(230,200,60,0.8)' });
    // mastro com bandeira rasgada
    A.mastro(cx + w / 2 + 3, cz + 9);
  }

  // ---------------- igreja com campanário
  {
    const cx = 36, cz = -36, w = 9, d = 15, h = 5.5;
    edificio(A, G, 'tijolo', cx, cz, w, d, h, [{ lado: 'W', pos: 0, larg: 2.4, modo: 'gira', cor: 0x4a2a1a }], { cor: 0xd0c8c0, telhado: 'telha', corTelhado: 0x504848, esp: 0.5 });
    bloco(A, G, 'tijolo', cx - 4.4 - 1, cz, 3.2, 3.6, 12, 0xd0c8c0, 'predio', 'telha');
    A.bau({ x: cx + 3, z: cz - 4, rot: Math.PI, estilo: 'madeira' });
    adicionar(G, 'liso', b(cx - 4.4 - 1, 13.6, cz, 0.15, 1.4, 0.15, 0xe0e0d8), b(cx - 4.4 - 1, 13.9, cz, 0.8, 0.15, 0.15, 0xe0e0d8)); // cruz
    for (let i = 0; i < 3; i++) adicionar(G, 'liso', b(cx + 1, 0.5, cz - 4 + i * 3.4, 4.6, 0.9, 0.7, 0x5a3a22)); // bancos
  }

  // ---------------- parquinho (animado)
  {
    const px = -27, pz = -3;
    T.push({ t: 'terra', x: px, z: pz, w: 16, d: 12, cor: '#8a7a58' });
    // balanços
    const pe = [];
    pe.push(b(-2.1, 1.2, -0.7, 0.12, 2.4, 0.12, 0xb03030, { rz: 0.15, rx: 0.2 }), b(-2.1, 1.2, 0.7, 0.12, 2.4, 0.12, 0xb03030, { rz: 0.15, rx: -0.2 }));
    pe.push(b(2.1, 1.2, -0.7, 0.12, 2.4, 0.12, 0xb03030, { rz: -0.15, rx: 0.2 }), b(2.1, 1.2, 0.7, 0.12, 2.4, 0.12, 0xb03030, { rz: -0.15, rx: -0.2 }));
    pe.push(b(0, 2.35, 0, 4.4, 0.14, 0.14, 0xb03030));
    const quadro = A.malhaVC(pe); quadro.position.set(px - 3, 0, pz - 2); cena.add(quadro);
    A.addObst(px - 3, pz - 2, 4.4, 1.6, 2.4, 'caixa');
    const balancos = [];
    for (const dx of [-1, 1]) {
      const pv = new THREE.Group(); pv.position.set(px - 3 + dx, 2.3, pz - 2);
      const sp = A.malhaVC([b(0, -1.35, 0, 0.04, 2.7, 0.04, 0x707070), b(0, -2.55, 0, 0.55, 0.06, 0.28, 0x3a5a8a)]);
      pv.add(sp); cena.add(pv); balancos.push(pv);
    }
    A.anim.push((dt, t) => { balancos.forEach((p, i) => { p.rotation.x = Math.sin(t * 1.3 + i * 1.7) * 0.18 * (0.6 + 0.4 * Math.sin(t * 0.3)); }); });
    // carrossel
    const car = A.malhaVC([b(0, 0.45, 0, 2.8, 0.1, 2.8, 0x2a6aa0, { g: 'cil' }), b(0, 0.9, 0, 0.1, 1.0, 0.1, 0xc0c0c0), b(0, 0.8, 0.9, 0.08, 0.6, 0.08, 0xc0c0c0), b(0, 0.8, -0.9, 0.08, 0.6, 0.08, 0xc0c0c0), b(0.9, 0.8, 0, 0.08, 0.6, 0.08, 0xc0c0c0), b(-0.9, 0.8, 0, 0.08, 0.6, 0.08, 0xc0c0c0)]);
    car.position.set(px + 4, 0, pz + 2); cena.add(car);
    A.addObst(px + 4, pz + 2, 1.0, 1.0, 0.5, 'caixa');
    A.anim.push((dt, t) => { car.rotation.y = t * 0.6; });
    // escorregador
    adicionar(G, 'liso', b(px + 3, 0.9, pz - 3, 0.9, 1.8, 1.2, 0xd0a020));
    adicionar(G, 'liso', b(px + 3, 0.85, pz - 1.6, 0.8, 0.1, 2.4, 0xd0d0d0, { rx: -0.65 }));
    A.addObst(px + 3, pz - 3, 1.0, 1.4, 1.8, 'caixa');
  }

  // ---------------- caixa-d'água em pernas
  {
    const x = -52, z = 36;
    const p = [];
    for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) p.push(b(dx, 6, dz, 0.3, 12, 0.3, 0x6a6a64, { rx: dz * 0.03, rz: -dx * 0.03 }));
    p.push(b(0, 12.5, 0, 4.2, 3.2, 4.2, 0x7a7a74, { g: 'cil' }), b(0, 14.4, 0, 4.4, 0.6, 4.4, 0x5a5a54, { g: 'cone' }));
    const m = A.malhaVC(p); m.position.set(x, 0, z); cena.add(m);
    A.addObst(x, z, 3.0, 3.0, 12, 'predio');
  }

  // ---------------- bunker antiaéreo (cofre do objetivo)
  salaCofre(A, G, 'concreto', 51, -3, 'W', { cor: 0x8a8a80, nome: 'Abrigo Antiaéreo', corLuz: 0xff5a40 });

  // ---------------- geradores (objetivo)
  const pontosGer = [[-17, -42], [44, -22], [-36, 28], [42, 36], [-8, -52]];
  pontosGer.sort(() => Math.random() - 0.5);
  let nGer = 0;
  for (const [gx0, gz0] of pontosGer) {
    if (nGer >= A.zona.objetivo.qtd) break;
    let gx = gx0, gz = gz0;
    for (let t = 0; t < 30 && !A.livre(gx, gz, 2.2, 1.6, 0.5); t++) { gx = gx0 + rand(-5, 5); gz = gz0 + rand(-5, 5); }
    const m = A.malhaVC([
      b(0, 0.62, 0, 1.8, 1.0, 1.0, 0xc8a020), b(0, 1.2, 0, 1.4, 0.2, 0.8, 0x3a3a3a), b(0.55, 1.4, 0.2, 0.12, 0.5, 0.12, 0x2a2a2a, { g: 'cil' }),
      b(-0.6, 0.62, 0.52, 0.5, 0.7, 0.04, 0x2a2e30), b(-0.6, 0.8, 0.55, 0.3, 0.12, 0.03, 0x40e060, { var: 0 }),
      b(0, 0.12, 0, 2.0, 0.2, 1.2, 0x4a4a46),
    ]);
    m.position.set(gx, 0, gz); m.rotation.y = rand(0, 6.28); cena.add(m);
    A.addObst(gx, gz, 2.0, 1.6, 1.2, 'caixa');
    A.objetivo({ x: gx, z: gz, mesh: m, nome: 'Gerador', verbo: 'Ligar gerador', luz: [0xffd060, 14, 22] });
    nGer++;
  }

  // ---------------- carros, alarmes, postes, árvores, decoração
  let nCar = 0, tent = 0, nAlarme = 0;
  while (nCar < 16 && tent++ < 300) {
    const giro = Math.random() < 0.5, onRua = Math.random() < 0.7;
    const cx = onRua ? (Math.random() < 0.5 ? rand(-3, 3) : rand(-36, 36)) : rand(-45, 45), cz = onRua ? (Math.random() < 0.5 ? rand(-40, 40) : (Math.random() < 0.5 ? -22 : 16) + rand(-1.5, 1.5)) : rand(-45, 45);
    if (!A.livre(cx, cz, giro ? 1.9 : 4.2, giro ? 4.2 : 1.9, 2.2)) continue;
    const car = A.carro(cx, cz, giro, nCar < 1);
    if (nAlarme < 2 && nCar > 2) { A.alarme({ x: cx, z: cz, mesh: car }); nAlarme++; }
    nCar++;
  }
  for (const pz of [-44, -30, -8, 8, 28, 40]) for (const s of [-1, 1]) {
    if (!A.livre(s * 7, pz, 0.4, 0.4, 0.2)) continue;
    A.poste(s * 7.2, pz, Math.random() < 0.3, s < 0 ? Math.PI : 0);
  }
  const nArv = Math.round(70 * A.pouco);
  for (let i = 0, t = 0; i < nArv && t < nArv * 12; t++) {
    const x = rand(-L + 3, L - 3), z = rand(-L + 3, L - 3);
    if (Math.abs(x) < 6.5 || Math.abs(z + 22) < 5 || Math.abs(z - 16) < 5) continue;
    if (!A.livre(x, z, 1.2, 1.2, 0.6)) continue;
    const r = Math.random();
    arvore(A, x, z, r < 0.5 ? 'folha' : r < 0.7 ? 'pinho' : 'morta', rand(0.9, 1.3)); i++;
  }
  A.decorar(VIS.sacoLixo, Math.round(14 * A.pouco));
  A.decorar(VIS.cadaver, Math.round(8 * A.pouco));
  A.decorar(VIS.cone, Math.round(8 * A.pouco));
  // barris com fogo
  tent = 0; let nF = 0;
  while (nF < 2 && tent++ < 100) {
    const cx = rand(-30, 30), cz = rand(-45, 45);
    if (!A.livre(cx, cz, 0.7, 0.7, 2)) continue;
    A.barrilFogo(cx, cz); nF++;
  }
  // barreiras de concreto e barris explosivos espalhados
  A.espalhar('barreira', 6, 34);
  A.espalhar('barril', 7, 36);
  A.espalhar('caixa', 10, 40);
  // corvos
  A.corvos(7, 20);
  fechar(A, G);
  A.ajustes.neblina = 0.026;
}
