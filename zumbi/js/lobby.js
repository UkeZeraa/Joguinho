// Base / lobby: personalizar equipamento, arsenal, loja e escolher a raid.
import * as THREE from 'three';
import {
  TIERS, PERKS, TIPOS, CAMOS, COLETES, CONSUMIVEIS, CAIXAS, ZONAS,
  stats, barras, rolarTier, novaArma, carregar, salvar, resetar, armaPorUid, fmt,
} from './dados.js';
import { criarArma } from './modelos.js';
import { iniciarAudio, som, setSom } from './audio.js';
import { iniciarRaid } from './raid.js';

const $ = id => document.getElementById(id);
const mobile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (mobile) document.body.classList.add('mobile');

let save = carregar();
setSom(save.opcoes.som);
const MAX_INV = 40;

let aba = 'equip';
let slotFoco = 'primaria';
let armaFoco = null;        // uid em destaque na vitrine
let filtroTier = -1;
let zonaSel = 0;
let raidAtual = null;

// ---------------- miniaturas e vitrine 3D ----------------
const thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
thumbR.setSize(240, 120);
thumbR.outputColorSpace = THREE.SRGBColorSpace;
const thumbCena = new THREE.Scene();
thumbCena.add(new THREE.AmbientLight(0xffffff, 0.9));
const tl = new THREE.DirectionalLight(0xffffff, 2.5); tl.position.set(1, 2, 2); thumbCena.add(tl);
const thumbCam = new THREE.PerspectiveCamera(30, 2, 0.1, 20);
const thumbCache = new Map();

function enquadrar(obj, cam, margem = 1.1) {
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  obj.position.sub(c);
  const raio = Math.max(s.x / cam.aspect, s.y, s.z / cam.aspect) * 0.5;
  const dist = raio / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * margem;
  return dist;
}

function miniatura(arma) {
  const k = `${arma.tipo}|${arma.tier}|${arma.camo}`;
  if (thumbCache.has(k)) return thumbCache.get(k);
  const m = criarArma(arma);
  const piv = new THREE.Group(); piv.add(m);
  m.rotation.y = Math.PI / 2;
  thumbCena.add(piv);
  piv.updateMatrixWorld(true);
  const d = enquadrar(m, thumbCam, 1.0);
  thumbCam.position.set(0, 0.02, d); thumbCam.lookAt(0, 0, 0);
  thumbR.setClearColor(0x000000, 0);
  thumbR.render(thumbCena, thumbCam);
  const url = thumbR.domElement.toDataURL();
  thumbCena.remove(piv);
  m.traverse(o => { if (o.material) o.material.dispose(); });
  thumbCache.set(k, url);
  return url;
}

const prevCanvas = $('preview');
const prevR = new THREE.WebGLRenderer({ canvas: prevCanvas, antialias: true, alpha: true });
prevR.setPixelRatio(Math.min(devicePixelRatio, 2));
prevR.outputColorSpace = THREE.SRGBColorSpace;
const prevCena = new THREE.Scene();
prevCena.add(new THREE.AmbientLight(0xffffff, 0.6));
const pl = new THREE.DirectionalLight(0xffffff, 2.5); pl.position.set(2, 3, 2); prevCena.add(pl);
const pl2 = new THREE.DirectionalLight(0xff9070, 1.0); pl2.position.set(-2, 0, -2); prevCena.add(pl2);
const prevLuzTier = new THREE.PointLight(0xffffff, 3, 3, 1); prevLuzTier.position.set(0, -0.4, 0.5); prevCena.add(prevLuzTier);
const prevCam = new THREE.PerspectiveCamera(30, 2, 0.1, 20);
const prevPiv = new THREE.Group(); prevCena.add(prevPiv);
let prevModelo = null, prevArrasto = null, prevGiro = 0.6, prevAuto = true;

function mostrarPreview(arma) {
  if (prevModelo) { prevPiv.remove(prevModelo); prevModelo.traverse(o => o.material && o.material.dispose()); prevModelo = null; }
  if (!arma) return;
  prevModelo = criarArma(arma);
  prevPiv.add(prevModelo);
  prevPiv.rotation.set(0, 0, 0);
  prevPiv.updateMatrixWorld(true);
  prevCam.aspect = 1.6;
  const d = enquadrar(prevModelo, prevCam, 1.25);
  prevCam.userData.dist = d;
  prevLuzTier.color.set(TIERS[arma.tier].cor);
  prevLuzTier.intensity = 1 + arma.tier * 0.8;
}
prevCanvas.addEventListener('pointerdown', e => { prevArrasto = e.clientX; prevAuto = false; prevCanvas.setPointerCapture(e.pointerId); });
prevCanvas.addEventListener('pointermove', e => { if (prevArrasto !== null) { prevGiro += (e.clientX - prevArrasto) * 0.01; prevArrasto = e.clientX; } });
prevCanvas.addEventListener('pointerup', () => { prevArrasto = null; setTimeout(() => prevAuto = true, 2500); });

function loopPreview(t) {
  requestAnimationFrame(loopPreview);
  if (raidAtual || aba !== 'equip' || !prevModelo) return;
  const w = prevCanvas.clientWidth, h = prevCanvas.clientHeight;
  if (!w || !h) return;
  if (prevCanvas.width !== Math.floor(w * prevR.getPixelRatio()) || prevCanvas.height !== Math.floor(h * prevR.getPixelRatio())) prevR.setSize(w, h, false);
  prevCam.aspect = w / h; prevCam.updateProjectionMatrix();
  const d = (prevCam.userData.dist || 1) * Math.max(1, 1.6 / prevCam.aspect);
  prevCam.position.set(0, d * 0.18, d); prevCam.lookAt(0, 0, 0);
  if (prevAuto) prevGiro += 0.008;
  prevPiv.rotation.y = prevGiro + Math.PI / 2;
  prevModelo.traverse(o => { if (o.userData.pulsa) o.scale.setScalar(0.03 * (1 + Math.sin(t / 160) * 0.35)); });
  prevR.render(prevCena, prevCam);
}
requestAnimationFrame(loopPreview);

// ---------------- helpers de UI ----------------
function tagTier(t) { return `<span class="tag" style="background:${TIERS[t].cor}">${TIERS[t].nome}</span>`; }
function equipadaEm(uid) {
  if (save.equip.primaria === uid) return 'primaria';
  if (save.equip.secundaria === uid) return 'secundaria';
  return null;
}
function gravar() { salvar(save); $('grana').textContent = fmt(save.grana); }
function ordenarInv() { save.inv.sort((a, b) => b.tier - a.tier || a.tipo.localeCompare(b.tipo)); }

function cartaArma(a, extras = '') {
  const t = TIERS[a.tier];
  return `<div class="carta ${a.tier === 5 ? 'mitico' : ''}" style="--cor:${t.cor}" data-uid="${a.uid}">
    ${equipadaEm(a.uid) ? '<span class="eqTag">EQUIPADA</span>' : ''}
    <img src="${miniatura(a)}" alt="">
    <div class="t">${t.nome} · ${TIPOS[a.tipo].nome}</div>
    <div class="n">${a.nome}</div>${extras}</div>`;
}

// ---------------- abas ----------------
document.querySelectorAll('#abas button').forEach(b => b.addEventListener('click', () => { iniciarAudio(); som.clique(); trocarAba(b.dataset.aba); }));
function trocarAba(id) {
  aba = id;
  document.querySelectorAll('#abas button').forEach(b => b.classList.toggle('on', b.dataset.aba === id));
  document.querySelectorAll('.aba').forEach(s => s.classList.toggle('on', s.id === 'aba-' + id));
  render();
}
function render() {
  gravar();
  if (aba === 'equip') renderEquip();
  if (aba === 'arsenal') renderArsenal();
  if (aba === 'loja') renderLoja();
  if (aba === 'raid') renderRaid();
}

// ---------------- EQUIPAMENTO ----------------
function renderEquip() {
  const prim = armaPorUid(save, save.equip.primaria), sec = armaPorUid(save, save.equip.secundaria);
  const colete = COLETES.find(c => c.id === save.colete);
  const slotArma = (id, rot, a) => `<div class="slot ${slotFoco === id ? 'foco' : ''}" data-slot="${id}" style="border-left:4px solid ${a ? TIERS[a.tier].cor : '#444'}">
      <div class="rot">${rot}</div>
      <div class="nome" style="color:${a ? TIERS[a.tier].cor : '#777'}">${a ? a.nome : 'Vazio'}</div>
      <div class="sub">${a ? TIERS[a.tier].nome + ' · ' + TIPOS[a.tipo].nome : 'Toque para escolher'}</div>
      ${a ? `<img src="${miniatura(a)}">` : ''}</div>`;
  const qtd = (id) => {
    const c = CONSUMIVEIS[id];
    return `<div class="slot" data-slot="${id}"><div class="rot">${c.nome}s (${fmt(c.preco)} cada)</div>
      <div class="qtd"><b style="font-size:18px">${save[id]}</b>/${c.max}
      <button data-comprar="${id}">+</button></div></div>`;
  };
  $('slots').innerHTML =
    slotArma('primaria', 'Arma primária', prim) +
    slotArma('secundaria', 'Arma secundária', sec) +
    `<div class="slot ${slotFoco === 'colete' ? 'foco' : ''}" data-slot="colete"><div class="rot">Colete</div>
      <div class="nome">${colete.nome}</div><div class="sub">${colete.armadura ? '+' + colete.armadura + ' de armadura' : 'Sem proteção'}</div></div>` +
    qtd('granadas') + qtd('kits');

  $('slots').querySelectorAll('[data-slot]').forEach(el => el.addEventListener('click', e => {
    if (e.target.dataset.comprar) return;
    const s = el.dataset.slot;
    if (s === 'granadas' || s === 'kits') return;
    slotFoco = s; som.clique();
    if (s === 'primaria') armaFoco = save.equip.primaria;
    if (s === 'secundaria') armaFoco = save.equip.secundaria;
    renderEquip();
  }));
  $('slots').querySelectorAll('[data-comprar]').forEach(b => b.addEventListener('click', () => comprarConsumivel(b.dataset.comprar)));

  // lista de escolha
  const lista = $('escolhaLista');
  if (slotFoco === 'colete') {
    $('escolhaTitulo').textContent = 'Coletes';
    lista.innerHTML = COLETES.map(c => {
      const tem = save.coletes.includes(c.id);
      return `<div class="item ${save.colete === c.id ? 'on' : ''}" data-colete="${c.id}" style="--cor:${tem ? '#5ab0ff' : '#555'}">
        <div><div class="n">${c.nome}</div><div class="t">${c.armadura} armadura ${tem ? '' : '· ' + fmt(c.preco)}</div></div>
        ${save.colete === c.id ? '<span class="eq">EQUIPADO</span>' : tem ? '' : '<span class="eq" style="color:#fd6">COMPRAR</span>'}</div>`;
    }).join('');
    lista.querySelectorAll('[data-colete]').forEach(el => el.addEventListener('click', () => {
      const c = COLETES.find(x => x.id === el.dataset.colete);
      if (!save.coletes.includes(c.id)) {
        if (save.grana < c.preco) return aviso('Grana insuficiente');
        save.grana -= c.preco; save.coletes.push(c.id); som.pegar();
      }
      save.colete = c.id; som.clique();
      renderEquip();
    }));
    $('vitrineInfo').innerHTML = `<h2>${COLETES.find(c => c.id === save.colete).nome}</h2>
      <p style="color:var(--fraco);font-size:13px">A armadura absorve 60% do dano recebido até acabar.</p>`;
    mostrarPreview(null);
    return;
  }
  const slot = slotFoco;
  $('escolhaTitulo').textContent = slot === 'primaria' ? 'Armas primárias' : 'Armas secundárias';
  const compat = save.inv.filter(a => TIPOS[a.tipo].slot === slot);
  lista.innerHTML = compat.length ? compat.map(a => `<div class="item ${armaFoco === a.uid ? 'on' : ''}" data-uid="${a.uid}" style="--cor:${TIERS[a.tier].cor}">
      <img src="${miniatura(a)}"><div><div class="t">${TIERS[a.tier].nome} · ${TIPOS[a.tipo].nome}</div><div class="n">${a.nome}</div></div>
      ${save.equip[slot] === a.uid ? '<span class="eq">EQUIPADA</span>' : ''}</div>`).join('')
    : '<p style="color:var(--fraco);font-size:13px">Nenhuma arma deste tipo. Abra caixas na Loja ou ache nas raids!</p>';
  lista.querySelectorAll('[data-uid]').forEach(el => el.addEventListener('click', () => {
    armaFoco = el.dataset.uid; som.clique(); renderEquip();
  }));

  if (!armaFoco || !armaPorUid(save, armaFoco) || TIPOS[armaPorUid(save, armaFoco).tipo].slot !== slot) armaFoco = save.equip[slot] || (compat[0] && compat[0].uid);
  vitrine(armaPorUid(save, armaFoco), slot);
}

function vitrine(a, slot) {
  const info = $('vitrineInfo');
  if (!a) { info.innerHTML = ''; mostrarPreview(null); return; }
  mostrarPreview(a);
  const st = stats(a), br = barras(a), t = TIERS[a.tier];
  const valores = {
    Dano: Math.round(st.dano) + (st.projeteis > 1 ? '×' + st.projeteis : ''),
    'Dano/seg': Math.round(st.dano * st.projeteis * st.rpm / 60),
    Cadência: Math.round(st.rpm) + ' rpm',
    Precisão: Math.round((1 - st.disp / 0.1) * 100) + '%',
    Alcance: Math.round(st.alcance) + ' m',
    Pente: st.pente,
    Recarga: st.recarga.toFixed(1) + ' s',
  };
  const equipada = save.equip[slot] === a.uid;
  info.innerHTML = `${tagTier(a.tier)} <span style="color:var(--fraco);font-size:12px">${TIPOS[a.tipo].nome} · ${st.auto ? 'Automática' : 'Semi-automática'}</span>
    <h2 style="color:${t.cor}">${a.nome}</h2>
    <div class="perks">${PERKS[a.tier].map(p => `<span>★ ${p}</span>`).join('') || '<span>Sem vantagens</span>'}</div>
    <div class="barras">${Object.keys(br).map(k => `<span>${k}</span><div class="b"><i style="width:${br[k] * 100}%;background:linear-gradient(90deg,#666,${t.cor})"></i></div><span class="v">${valores[k]}</span>`).join('')}</div>
    <div class="camoSel">${CAMOS.map(c => `<button title="${c.nome}${save.camos.includes(c.id) ? '' : ' (compre na Loja)'}" data-camo="${c.id}" class="${a.camo === c.id ? 'on' : ''} ${save.camos.includes(c.id) ? '' : 'bloq'}" style="background:${c.cor}"></button>`).join('')}</div>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn verde" id="btnEquipar" ${equipada ? 'disabled' : ''}>${equipada ? 'Equipada' : 'Equipar'}</button>
    </div>`;
  info.querySelectorAll('[data-camo]').forEach(b => b.addEventListener('click', () => {
    if (!save.camos.includes(b.dataset.camo)) return aviso('Compre esta camuflagem na Loja');
    a.camo = b.dataset.camo; som.clique(); renderEquip();
  }));
  $('btnEquipar').addEventListener('click', () => { save.equip[slot] = a.uid; som.pegar(); renderEquip(); });
}

function comprarConsumivel(id) {
  const c = CONSUMIVEIS[id];
  if (save[id] >= c.max) return aviso('Limite atingido');
  if (save.grana < c.preco) return aviso('Grana insuficiente');
  save.grana -= c.preco; save[id]++; som.pegar();
  render();
}

// ---------------- ARSENAL ----------------
function renderArsenal() {
  ordenarInv();
  $('filtros').innerHTML = `<button data-f="-1" class="${filtroTier === -1 ? 'on' : ''}">Todas (${save.inv.length}/${MAX_INV})</button>` +
    TIERS.map((t, i) => `<button data-f="${i}" class="${filtroTier === i ? 'on' : ''}" style="color:${t.cor}">${t.nome} (${save.inv.filter(a => a.tier === i).length})</button>`).join('');
  $('filtros').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { filtroTier = +b.dataset.f; som.clique(); renderArsenal(); }));
  const lista = save.inv.filter(a => filtroTier < 0 || a.tier === filtroTier);
  $('arsenalGrade').innerHTML = lista.map(a => cartaArma(a, `<div class="acoes">
      <button class="btn mini" data-ver="${a.uid}">Ver</button>
      <button class="btn mini perigo" data-vender="${a.uid}" ${equipadaEm(a.uid) ? 'disabled' : ''}>Desmontar ${fmt(TIERS[a.tier].venda)}</button></div>`)).join('');
  $('arsenalGrade').querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => {
    const a = armaPorUid(save, b.dataset.ver);
    slotFoco = TIPOS[a.tipo].slot; armaFoco = a.uid; trocarAba('equip');
  }));
  $('arsenalGrade').querySelectorAll('[data-vender]').forEach(b => b.addEventListener('click', () => {
    const a = armaPorUid(save, b.dataset.vender);
    if (a.tier >= 3 && !confirm(`Desmontar ${a.nome} (${TIERS[a.tier].nome})?`)) return;
    save.inv = save.inv.filter(x => x.uid !== a.uid);
    save.grana += TIERS[a.tier].venda; som.pegar();
    renderArsenal();
  }));
}

// ---------------- LOJA ----------------
function renderLoja() {
  $('caixas').innerHTML = CAIXAS.map(c => {
    const tot = c.pesos.reduce((a, b) => a + b, 0);
    return `<div class="loja"><div class="caixaIcone ${c.id}">📦</div><h4>${c.nome}</h4>
      <div class="chances">${c.pesos.map((p, i) => p ? `<i style="width:${p / tot * 100}%;background:${TIERS[i].cor}"></i>` : '').join('')}</div>
      <div class="chancesTxt">${c.pesos.map((p, i) => p ? `<b style="color:${TIERS[i].cor}">${TIERS[i].nome}</b> ${(p / tot * 100).toFixed(p / tot < 0.01 ? 1 : 0)}%` : '').filter(Boolean).join(' · ')}</div>
      <button class="btn" data-caixa="${c.id}">Abrir · <span class="preco">${fmt(c.preco)}</span></button></div>`;
  }).join('');
  $('caixas').querySelectorAll('[data-caixa]').forEach(b => b.addEventListener('click', () => abrirCaixa(CAIXAS.find(c => c.id === b.dataset.caixa))));

  $('suprimentos').innerHTML = Object.entries(CONSUMIVEIS).map(([id, c]) => `<div class="loja"><h4>${id === 'granadas' ? '💣' : '✚'} ${c.nome}</h4>
    <div style="font-size:12px;color:var(--fraco)">${id === 'granadas' ? 'Explode em área. Ótima contra hordas.' : 'Recupera 60 de vida.'} Você tem ${save[id]}/${c.max}.</div>
    <button class="btn" data-sup="${id}" ${save[id] >= c.max ? 'disabled' : ''}>Comprar · <span class="preco">${fmt(c.preco)}</span></button></div>`).join('');
  $('suprimentos').querySelectorAll('[data-sup]').forEach(b => b.addEventListener('click', () => comprarConsumivel(b.dataset.sup)));

  $('coletes').innerHTML = COLETES.filter(c => c.preco).map(c => {
    const tem = save.coletes.includes(c.id);
    return `<div class="loja"><h4>🦺 ${c.nome}</h4><div style="font-size:12px;color:var(--fraco)">+${c.armadura} de armadura</div>
      <button class="btn" data-colete="${c.id}" ${tem ? 'disabled' : ''}>${tem ? 'Comprado' : 'Comprar · <span class="preco">' + fmt(c.preco) + '</span>'}</button></div>`;
  }).join('');
  $('coletes').querySelectorAll('[data-colete]').forEach(b => b.addEventListener('click', () => {
    const c = COLETES.find(x => x.id === b.dataset.colete);
    if (save.grana < c.preco) return aviso('Grana insuficiente');
    save.grana -= c.preco; save.coletes.push(c.id); save.colete = c.id; som.pegar(); render();
  }));

  $('camos').innerHTML = CAMOS.filter(c => c.preco).map(c => {
    const tem = save.camos.includes(c.id);
    return `<div class="loja" style="width:160px"><div style="height:40px;border-radius:4px;background:${c.cor};border:1px solid #555"></div><h4>${c.nome}</h4>
      <button class="btn mini" data-camo="${c.id}" ${tem ? 'disabled' : ''}>${tem ? 'Comprada' : fmt(c.preco)}</button></div>`;
  }).join('');
  $('camos').querySelectorAll('[data-camo]').forEach(b => b.addEventListener('click', () => {
    const c = CAMOS.find(x => x.id === b.dataset.camo);
    if (save.grana < c.preco) return aviso('Grana insuficiente');
    save.grana -= c.preco; save.camos.push(c.id); som.pegar(); render();
  }));
}

function abrirCaixa(caixa) {
  iniciarAudio();
  if (save.grana < caixa.preco) return aviso('Grana insuficiente');
  if (save.inv.length >= MAX_INV) return aviso('Arsenal cheio! Desmonte algumas armas.');
  save.grana -= caixa.preco;
  const tier = rolarTier(caixa.pesos);
  const premio = novaArma(null, tier);
  save.inv.push(premio);
  gravar();

  const fita = $('roletaFita');
  const itens = [];
  const VENC = 42;
  for (let i = 0; i < 50; i++) itens.push(i === VENC ? premio : novaArma(null, rolarTier(caixa.pesos)));
  fita.innerHTML = itens.map(a => cartaArma(a)).join('');
  fita.querySelectorAll('.eqTag').forEach(e => e.remove());
  fita.style.transition = 'none';
  fita.style.transform = 'translateX(0)';
  $('roletaPremio').innerHTML = '';
  $('roletaOk').style.display = 'none';
  $('roleta').classList.add('on');
  const janela = fita.parentElement.clientWidth, larg = 110;
  const alvo = VENC * larg + larg / 2 - janela / 2 + (Math.random() * 70 - 35);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fita.style.transition = 'transform 5s cubic-bezier(.12,.75,.15,1)';
    fita.style.transform = `translateX(${-alvo}px)`;
  }));
  let ultimoIdx = -1;
  const t0 = performance.now();
  (function tick() {
    const m = new DOMMatrix(getComputedStyle(fita).transform);
    const idx = Math.floor((-m.m41 + janela / 2) / larg);
    if (idx !== ultimoIdx) { ultimoIdx = idx; som.tick(); }
    if (performance.now() - t0 < 5100) requestAnimationFrame(tick);
    else {
      $('roletaPremio').innerHTML = cartaArma(premio) + `<div style="margin-top:8px">${PERKS[premio.tier].map(p => '★ ' + p).join(' &nbsp; ') || ''}</div>`;
      $('roletaOk').style.display = 'block';
      if (premio.tier >= 3) som.raro(); else som.pegar();
    }
  })();
}
$('roletaOk').addEventListener('click', () => { $('roleta').classList.remove('on'); render(); });

// ---------------- RAID ----------------
function renderRaid() {
  $('zonas').innerHTML = ZONAS.map((z, i) => {
    const cor = '#' + z.neblina.toString(16).padStart(6, '0'), luz = '#' + z.luz.toString(16).padStart(6, '0');
    const tot = z.loot.reduce((a, b) => a + b, 0);
    return `<div class="zona ${zonaSel === i ? 'on' : ''}" data-z="${i}">
      <div class="img" style="background:linear-gradient(180deg, ${cor}, #000), radial-gradient(circle at 70% 30%, ${luz}55, transparent 50%);background-blend-mode:screen"></div>
      <h4>${z.nome}</h4><div class="dif">${'☠'.repeat(Math.round(z.dif * 1.5))} · ${z.ondas} ondas · recompensa ×${z.recompensa}</div>
      <p>${z.descricao}</p>
      <div class="chances" style="margin-top:8px">${z.loot.map((p, k) => `<i style="width:${p / tot * 100}%;background:${TIERS[k].cor}"></i>`).join('')}</div>
      <div class="chancesTxt">Loot dos zumbis${i === 2 ? ' · chance de Mítico ' + (z.loot[5] / tot * 100).toFixed(0) + '%' : ''}</div></div>`;
  }).join('');
  $('zonas').querySelectorAll('[data-z]').forEach(el => el.addEventListener('click', () => { zonaSel = +el.dataset.z; som.clique(); renderRaid(); }));
  const prim = armaPorUid(save, save.equip.primaria), sec = armaPorUid(save, save.equip.secundaria);
  const col = COLETES.find(c => c.id === save.colete);
  $('resumoLoadout').innerHTML = [prim, sec].filter(Boolean).map(a => `<div class="item" style="--cor:${TIERS[a.tier].cor};cursor:default"><img src="${miniatura(a)}"><div><div class="t">${TIERS[a.tier].nome}</div><div class="n">${a.nome}</div></div></div>`).join('') +
    `<div class="item" style="--cor:#5ab0ff;cursor:default"><div><div class="t">Equipamento</div><div class="n">${col.nome} · 💣${save.granadas} · ✚${save.kits}</div></div></div>`;
  const s = save.stats;
  $('estatisticas').innerHTML = `Raids: ${s.raids} · Extrações: ${s.extracoes} · Mortes: ${s.mortes} · Zumbis abatidos: ${s.abates}`;
}

$('btnIniciar').addEventListener('click', () => {
  iniciarAudio();
  const prim = armaPorUid(save, save.equip.primaria), sec = armaPorUid(save, save.equip.secundaria);
  if (!prim && !sec) return aviso('Equipe pelo menos uma arma!');
  const zona = ZONAS[zonaSel];
  const col = COLETES.find(c => c.id === save.colete);
  const loadout = { armas: [prim, sec], armadura: col.armadura, granadas: save.granadas, kits: save.kits };
  // consumíveis vão para a raid
  save.granadas = 0; save.kits = 0;
  save.stats.raids++;
  gravar();
  $('lobby').style.display = 'none';
  $('raid').classList.add('on');
  if (mobile && document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => screen.orientation?.lock?.('landscape').catch(() => {})).catch(() => {});
  }
  raidAtual = iniciarRaid({ canvas: $('jogo'), zona, loadout, opcoes: save.opcoes, mobile, onFim: fimRaid });
});

function fimRaid(r) {
  raidAtual = null;
  save.granadas = Math.min(CONSUMIVEIS.granadas.max, r.granadas);
  save.kits = Math.min(CONSUMIVEIS.kits.max, r.kits);
  save.grana += r.ganho;
  save.stats.abates += r.abates;
  save.stats.melhorOnda = Math.max(save.stats.melhorOnda, r.onda);
  if (r.extraido) save.stats.extracoes++; else save.stats.mortes++;
  let vendidas = 0;
  for (const a of r.armas) {
    if (save.inv.length < MAX_INV) save.inv.push(a);
    else { save.grana += TIERS[a.tier].venda; vendidas++; }
  }
  gravar();
  $('raid').classList.remove('on');
  $('lobby').style.display = '';
  $('resTitulo').textContent = r.extraido ? 'EXTRAÍDO!' : 'VOCÊ MORREU';
  $('resTitulo').style.color = r.extraido ? '#40ff80' : '#ff4040';
  $('resInfo').innerHTML = `Onda alcançada: <b>${Math.min(r.onda, r.ondas)}/${r.ondas}</b> · Zumbis abatidos: <b>${r.abates}</b><br>
    Grana: <b style="color:#7dff8e">+${fmt(r.ganho)}</b>${r.bonus ? ` (inclui bônus de extração ${fmt(r.bonus)})` : ' (morto: só 30% da grana foi salva)'}<br>
    ${r.extraido ? (r.armas.length ? `Armas recuperadas: <b>${r.armas.length}</b>${vendidas ? ` (${vendidas} vendidas, arsenal cheio)` : ''}` : 'Nenhuma arma encontrada.')
      : (r.perdidas.length ? `<span style="color:#ff8080">${r.perdidas.length} arma(s) da mochila foram perdidas.</span>` : '')}`;
  $('resArmas').innerHTML = (r.extraido ? r.armas : r.perdidas).map(a => cartaArma(a)).join('');
  if (!r.extraido) $('resArmas').style.opacity = 0.4; else $('resArmas').style.opacity = 1;
  $('resultado').classList.add('on');
  if (r.extraido && r.armas.some(a => a.tier >= 3)) som.raro();
}
$('resOk').addEventListener('click', () => { $('resultado').classList.remove('on'); trocarAba('equip'); });

// pausa
$('btnContinuar').addEventListener('click', () => raidAtual && raidAtual.continuar());
$('btnAbandonar').addEventListener('click', () => { if (raidAtual && confirm('Abandonar a raid? Você perde o loot encontrado.')) raidAtual.abandonar(); });
$('btnSom').addEventListener('click', () => {
  save.opcoes.som = !save.opcoes.som; setSom(save.opcoes.som); gravar();
  $('btnSom').textContent = 'Som: ' + (save.opcoes.som ? 'ligado' : 'desligado');
});
$('btnSom').textContent = 'Som: ' + (save.opcoes.som ? 'ligado' : 'desligado');
$('sens').value = save.opcoes.sens;
$('sens').addEventListener('input', e => { save.opcoes.sens = +e.target.value; gravar(); });
$('btnReset').addEventListener('click', () => {
  if (confirm('Apagar todo o progresso (armas, grana, estatísticas)?')) { save = resetar(); armaFoco = null; render(); }
});

let avisoT = 0;
function aviso(msg) {
  som.seco();
  let el = $('aviso');
  if (!el) {
    el = document.createElement('div'); el.id = 'aviso';
    Object.assign(el.style, { position: 'fixed', left: '50%', bottom: '30px', transform: 'translateX(-50%)', background: '#400', border: '1px solid #f44', padding: '10px 18px', borderRadius: '4px', zIndex: 300, fontWeight: 700, transition: 'opacity .3s' });
    document.body.appendChild(el);
  }
  el.textContent = msg; el.style.opacity = 1;
  clearTimeout(avisoT); avisoT = setTimeout(() => el.style.opacity = 0, 1800);
}

document.addEventListener('pointerdown', () => iniciarAudio(), { once: true });
$('carregando').remove();
render();
