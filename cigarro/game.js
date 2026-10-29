'use strict';
(() => {
// ===== Constantes =====
const VH = 180, GROUND = 150, PX = 56;
let VW = 320, SCALE = 3;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const hash = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

const SAVE_KEY = 'cadeMeuCigarro_v1';
let best = 0, muted = false;
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
  best = s.best || 0; muted = !!s.muted;
} catch (e) { /* sem storage */ }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best, muted })); } catch (e) { /* ignora */ } };

// ===== Pixel art =====
const PAD = w => rows => rows.map(r => (r + ' '.repeat(w)).slice(0, w));
const P20 = PAD(20), P8 = PAD(8);

// Seu Tonhão: careca, bigode, regata e barriga de fora
const TONHAO_TOP = P20([
  '.......ssssss.......',
  '.....ssssssssss.....',
  '....sssssssssss.....',
  '....hssssesssses....',
  '....hssssssssssss...',
  '....ssssssmmmmmss...',
  '.....sssssskkkss....',
  '......ssssssss......',
  '.......ssssss.......',
  '.....wwwwwwwwww.....',
  '....swwwwwwwwwwws...',
  '...sswwwwwwwwwwwss..',
  '...sswwwwwwwwwwwwss.',
  '...sswwwwwwwwwwwwwss',
  '...s.wwwwwwwwwwwwww.',
  '.....wwwwwwwwwwwwww.',
  '.....wwwwwwwwwwwwww.',
  '.....wwwwwwwwwwwww..',
  '......sssssssssss...',
  '.......ppppppppp....',
  '.......ppppppppp....',
]);
const TONHAO_LEGS = {
  idle: P20(['.......ss....ss.....', '.......ss....ss.....', '.......ss....ss.....', '......ccc...ccc.....']),
  run1: P20(['......ss......ss....', '.....ss........ss...', '....ss..........ss..', '...ccc.........ccc..']),
  run2: P20(['........ss.ss.......', '.........sss........', '.........ss.........', '........cccc........']),
  jump: P20(['......ss.....ss.....', '.....ss.......ss....', '....ccc........ccc..', '....................']),
};
const TONHAO_PAL = { s: '#f0b48a', h: '#d8966a', e: '#111111', m: '#3a2414', k: '#7a2d1a',
  w: '#f4f4f4', p: '#2a62c8', c: '#2bb34a' };

// Cigarro com perninhas
const CIG_TOP = P8([
  '...rr...',
  '..rRRr..',
  '..gggg..',
  '..wwww..',
  '..KwwK..',
  '..wwww..',
  '.awkkwa.',
  'a.wwww.a',
  '..wwww..',
  '..wwww..',
  '..oooo..',
  '..oOoo..',
  '..ooOo..',
  '..oooo..',
]);
const CIG_LEGS = [P8(['..l..l..', '.l....l.']), P8(['...ll...', '..l..l..'])];
const CIG_PAL = { r: '#ff5a1a', R: '#ffd23a', g: '#8a8a8a', w: '#ffffff', K: '#111111', k: '#7a2d1a',
  a: '#ffffff', o: '#e0801a', O: '#b8600a', l: '#222222' };

const cache = new Map();
function sprite(key, rows, pal) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
  cache.set(key, c);
  return c;
}
const tonhao = f => sprite('t_' + f, TONHAO_TOP.concat(TONHAO_LEGS[f]), TONHAO_PAL);
const cigarro = f => sprite('c_' + f, CIG_TOP.concat(CIG_LEGS[f]), CIG_PAL);

// ===== Som =====
const Sfx = (() => {
  let ac = null, master, sfxG, musG, noiseBuf, timer = null, step = 0, nextT = 0, tempo = 1;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    sfxG = ac.createGain(); sfxG.gain.value = 0.5; sfxG.connect(master);
    musG = ac.createGain(); musG.gain.value = 0.2; musG.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  function osc(type, f0, f1, t, dur, vol, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, freq, type, dest) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = type || 'highpass'; f.frequency.value = freq || 3000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG); s.start(t); s.stop(t + dur + 0.02);
  }
  const seq = (notes, st, type, vol) => notes.forEach((n, i) => osc(type || 'square', midi(n), 0, ac.currentTime + i * st, st * 1.1, vol || 0.12));
  const FX = {
    jump: () => osc('square', 200, 480, ac.currentTime, 0.18, 0.1),
    hit: () => { const t = ac.currentTime; osc('sawtooth', 300, 80, t, 0.25, 0.15); noise(t, 0.12, 0.3, 800, 'lowpass'); },
    catch: () => seq([72, 76, 79, 84], 0.06),
    puff: () => { const t = ac.currentTime; noise(t, 0.5, 0.25, 600, 'lowpass'); osc('sine', 90, 60, t, 0.3, 0.2); },
    slurp: () => { const t = ac.currentTime; noise(t, 0.35, 0.2, 1500, 'bandpass'); osc('sine', 400, 900, t, 0.3, 0.08); },
    good: () => seq([67, 72, 76, 79, 84], 0.07),
    bad: () => seq([60, 55, 52], 0.12, 'sawtooth', 0.1),
    over: () => seq([67, 66, 65, 64, 52], 0.22, 'triangle', 0.25),
    bark: () => { const t = ac.currentTime; osc('square', 520, 260, t, 0.09, 0.1); osc('square', 480, 240, t + 0.13, 0.09, 0.1); },
  };
  const _ = null;
  const MEL = [64, _, 67, 69, 71, _, 69, 67, 64, _, 62, 64, 67, _, _, _, 64, _, 67, 69, 71, _, 74, 71, 69, 67, 64, 62, 64, _, _, _];
  const BASS = [40, _, 40, 47, 45, _, 45, 52, 43, _, 43, 50, 38, _, 45, 47];
  function schedule() {
    while (nextT < ac.currentTime + 0.12) {
      const d = 60 / (155 * tempo) / 2;
      const m = MEL[step % MEL.length], b = BASS[step % BASS.length];
      if (m) osc('square', midi(m), 0, nextT, d * 0.85, 0.08, musG);
      if (b) osc('triangle', midi(b), 0, nextT, d * 0.95, 0.3, musG);
      if (step % 2) noise(nextT, 0.03, 0.12, 7000, 'highpass', musG);
      if (step % 4 === 0) osc('sine', 130, 45, nextT, 0.12, 0.5, musG);
      nextT += d; step++;
    }
  }
  return {
    init,
    play: n => { if (ac && !muted && FX[n]) FX[n](); },
    music(on) {
      if (timer) { clearInterval(timer); timer = null; }
      if (on && ac) { step = 0; nextT = ac.currentTime + 0.05; timer = setInterval(schedule, 25); }
    },
    tempo: v => { tempo = v; },
    mute: m => { if (master) master.gain.value = m ? 0 : 1; },
  };
})();

// Falas: arquivos mp3 em vozes/, uma de cada vez (ninguém fala por cima)
const LINES = {
  tonhao_cade: 'Cadê meu cigarro?!', tonhao_volta: 'Volta aqui, cigarrinho!', tonhao_ahh: 'Aaah... agora sim.',
  tonhao_cafe: 'Agora um cafezinho!', tonhao_bom: 'Que cafezinho bom!', tonhao_lingua: 'Ai! Queimei a língua!',
  tonhao_surtando: 'Tô surtando!', tonhao_ai: 'Ai!', cig_pega: 'Me pega se for capaz!', cig_tchau: 'Tchauzinho!',
};
let vQueue = [], vCur = null;
function say(id, interrupt) {
  if (interrupt) { vQueue = []; if (vCur) { vCur.pause(); vCur = null; } }
  vQueue = vQueue.filter(q => q.id !== id);
  vQueue.push({ id, t: Date.now() });
  if (vQueue.length > 2) vQueue.shift();
  nextVoice();
}
function nextVoice() {
  if (vCur) return;
  while (vQueue.length && Date.now() - vQueue[0].t > 4000) vQueue.shift();
  const q = vQueue.shift();
  if (!q) return;
  bubbles = bubbles.filter(b => b.who !== q.id.split('_')[0]);
  bubbles.push({ who: q.id.split('_')[0], text: LINES[q.id], t: 140 });
  if (muted) { setTimeout(nextVoice, 1200); return; }
  const a = new Audio('vozes/' + q.id + '.mp3');
  vCur = a;
  let finished = false;
  const done = () => { if (finished) return; finished = true; if (vCur === a) vCur = null; setTimeout(nextVoice, 200); };
  a.onended = done; a.onerror = done;
  setTimeout(done, 6000);
  a.play().catch(done);
}
function stopVoices() { vQueue = []; if (vCur) { vCur.pause(); vCur = null; } }

// ===== Estado =====
let state = 'menu';   // menu | chase | smoke | coffeeRun | coffee | over | paused
let prevState = '';
let frame = 0, stateT = 0, scroll = 0, spd = 0;
let round = 0, meter = 0, cigs = 0, cafes = 0, surtouSaid = false;
let player, cig, obstacles = [], parts = [], bubbles = [];
let spawnT = 0, puffs = 0, puffAnim = 0, padX = 0, needle = 0, needleDir = 1, zone = { c: 0.5, w: 0.18 }, coffeeResult = '';
let held = false, jumpReq = false;

function resetPlayer() {
  player = { y: GROUND - 25, vy: 0, onGround: true, slowT: 0, hitT: 0, anim: 0 };
}

function startGame() {
  Sfx.init();
  round = 0; meter = 35; cigs = 0; cafes = 0; scroll = 0;
  resetPlayer();
  newRound();
  showScreen(null);
  Sfx.music(true);
  say('tonhao_cade', true);
}

function newRound() {
  state = 'chase'; stateT = 0;
  cig = { gap: 190, y: GROUND - 16, vy: 0, onGround: true, anim: 0 };
  obstacles = []; spawnT = 90; surtouSaid = false;
  say('cig_pega');
  if (round > 0) say('tonhao_volta');
}

const pts = () => cigs * 100 + cafes * 50;

function gameOver() {
  state = 'over';
  Sfx.music(false); Sfx.tempo(1); Sfx.play('over');
  say('tonhao_surtando', true);
  const p = pts();
  const recorde = p > best;
  if (recorde) { best = p; persist(); }
  $('over-text').innerHTML = `A abstinência venceu o Seu Tonhão!<br><br>` +
    `Cigarros fumados: <b>${cigs}</b><br>Cafezinhos: <b>${cafes}</b><br>Pontos: <b>${p}</b>` +
    (recorde ? '<br><br><b>NOVO RECORDE!</b>' : `<br>Recorde: <b>${best}</b>`);
  setTimeout(() => { if (state === 'over') showScreen('screen-over'); }, 1200);
}

// ===== Entrada =====
function action() {
  Sfx.init();
  if (state === 'chase') { jumpReq = true; held = true; }
  else if (state === 'smoke' && puffs < 5) {
    puffs++; puffAnim = 14;
    meter = Math.max(0, meter - 13);
    Sfx.play('puff');
    for (let i = 0; i < 6; i++) parts.push({ type: 'smoke', x: PX + 18 + rand(-2, 4), y: player.y + 10, vx: rand(0.2, 0.8), vy: rand(-0.8, -0.3), life: 70, r: rand(2, 4) });
    if (puffs === 5) { say('tonhao_ahh'); stateT = 0; }
  } else if (state === 'coffee' && !coffeeResult) {
    const ok = Math.abs(needle - zone.c) <= zone.w / 2;
    coffeeResult = ok ? 'bom' : 'ruim';
    stateT = 0;
    if (ok) { cafes++; meter = Math.max(0, meter - 20); Sfx.play('slurp'); Sfx.play('good'); say('tonhao_bom'); }
    else { meter = Math.min(99, meter + 10); Sfx.play('bad'); say('tonhao_lingua'); }
  }
}
function release() { held = false; }

const wrap = $('wrap');
wrap.addEventListener('pointerdown', e => {
  if (e.target.closest('button, a')) return;
  e.preventDefault();
  action();
});
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    if (!e.repeat) { if (state === 'menu') startGame(); else action(); }
  }
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'KeyM') toggleMute();
});
addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') release(); });

// ===== Atualização =====
const OBST = {
  cone: { w: 10, h: 14 },
  lixeira: { w: 14, h: 20 },
  banana: { w: 12, h: 5 },
  cachorro: { w: 20, h: 13, vx: 0.8 },
};

function update() {
  frame++; stateT++;
  if (state === 'menu') { scroll += 1.2; return; }
  if (state === 'paused') return;
  if (state === 'chase') updateChase();
  else if (state === 'smoke') updateSmoke();
  else if (state === 'coffeeRun') updateCoffeeRun();
  else if (state === 'coffee') updateCoffee();
  else if (state === 'over') { player.y = Math.min(GROUND - 25, player.y); }
  updateParts();
  for (const b of bubbles) b.t--;
  bubbles = bubbles.filter(b => b.t > 0);
}

function updatePlayer() {
  const p = player;
  if (jumpReq && p.onGround) { p.vy = -6; p.onGround = false; Sfx.play('jump'); }
  jumpReq = false;
  p.vy += held && p.vy < 0 ? 0.22 : 0.45;
  p.y += p.vy;
  if (p.y >= GROUND - 25) { p.y = GROUND - 25; p.vy = 0; p.onGround = true; }
  if (p.slowT > 0) p.slowT--;
  if (p.hitT > 0) p.hitT--;
  p.anim += spd * 0.06;
}

function updateChase() {
  const base = Math.min(3 + round * 0.15, 4.2);
  spd = player.slowT > 0 ? 1.4 : base;
  scroll += spd;
  updatePlayer();

  // cigarro foge um pouco mais devagar que o Tonhão correndo livre
  const cigSpd = base - 0.5;
  cig.gap = clamp(cig.gap + cigSpd - spd, 0, 260);
  cig.anim += 0.3;
  const cx = PX + 10 + cig.gap;
  if (cig.onGround && obstacles.some(o => !o.hit && o.x - cx > 0 && o.x - cx < 26)) { cig.vy = -5; cig.onGround = false; }
  cig.vy += 0.35; cig.y += cig.vy;
  if (cig.y >= GROUND - 16) { cig.y = GROUND - 16; cig.vy = 0; cig.onGround = true; }

  // obstáculos
  if (--spawnT <= 0) {
    const type = pick(round < 1 ? ['cone', 'cone', 'lixeira', 'banana'] : ['cone', 'lixeira', 'banana', 'cachorro']);
    const d = OBST[type];
    obstacles.push({ type, x: VW + 10, y: GROUND - d.h, w: d.w, h: d.h, vx: d.vx || 0, hit: false, kvx: 0, kvy: 0 });
    if (type === 'cachorro') Sfx.play('bark');
    spawnT = Math.max(45, rand(70, 140) - round * 6);
  }
  const pb = { x: PX + 4, y: player.y + 2, w: 12, h: 22 };
  for (const o of obstacles) {
    o.x -= spd + o.vx;
    if (o.hit) { o.x += o.kvx; o.y += o.kvy; o.kvy += 0.3; continue; }
    if (pb.x < o.x + o.w && pb.x + pb.w > o.x && pb.y < o.y + o.h && pb.y + pb.h > o.y && player.hitT === 0) {
      o.hit = true; o.kvx = 3; o.kvy = -4;
      player.slowT = 45; player.hitT = 60;
      meter += 10;
      Sfx.play('hit');
      if (Math.random() < 0.5) say('tonhao_ai');
      parts.push({ type: 'text', text: 'ARGH!', x: PX, y: player.y - 8, vx: 0, vy: -0.5, life: 40 });
    }
  }
  obstacles = obstacles.filter(o => o.x > -40 && o.y < VH + 20);

  // abstinência
  meter += 0.05 + round * 0.008;
  if (meter > 75 && !surtouSaid) { surtouSaid = true; say('tonhao_surtando'); }
  Sfx.tempo(meter > 75 ? 1.3 : 1);
  if (meter > 60 && frame % 10 === 0) {
    parts.push({ type: 'sweat', x: PX + rand(4, 16), y: player.y + 2, vx: rand(-0.6, 0.6), vy: -1.2, life: 30 });
  }
  if (meter >= 100) { meter = 100; gameOver(); return; }

  if (cig.gap <= 6 && Math.abs(cig.y + 16 - (player.y + 25)) < 20) {
    state = 'smoke'; stateT = 0; puffs = 0; spd = 0;
    player.y = GROUND - 25; player.vy = 0; player.onGround = true;
    obstacles = [];
    Sfx.play('catch'); Sfx.tempo(1);
    parts.push({ type: 'text', text: 'PEGUEI!', x: PX, y: player.y - 10, vx: 0, vy: -0.5, life: 50 });
  }
}

function updateSmoke() {
  if (puffAnim > 0) puffAnim--;
  if (frame % 9 === 0) parts.push({ type: 'smoke', x: PX + 19, y: player.y + 5, vx: 0.15, vy: -0.4, life: 50, r: 1.5 });
  if (puffs >= 5 && stateT > 80) {
    cigs++;
    state = 'coffeeRun'; stateT = 0; padX = VW + 20;
    say('tonhao_cafe');
  }
}

function updateCoffeeRun() {
  spd = 2.5;
  scroll += spd; padX -= spd;
  player.anim += spd * 0.06;
  if (padX <= PX + 6) {
    padX = PX + 6;
    state = 'coffee'; stateT = 0; spd = 0;
    needle = 0; needleDir = 1; coffeeResult = '';
    zone = { c: rand(0.35, 0.75), w: Math.max(0.08, 0.2 - round * 0.015) };
  }
}

function updateCoffee() {
  if (!coffeeResult) {
    needle += needleDir * (0.02 + round * 0.003);
    if (needle >= 1) { needle = 1; needleDir = -1; }
    if (needle <= 0) { needle = 0; needleDir = 1; }
  } else if (stateT > 90) {
    round++;
    newRound();
  }
}

function updateParts() {
  for (const q of parts) {
    q.life--; q.x += q.vx - (q.type === 'smoke' ? 0 : spd * 0.2); q.y += q.vy;
    if (q.type === 'sweat') q.vy += 0.15;
    if (q.type === 'smoke') q.r += 0.06;
  }
  parts = parts.filter(q => q.life > 0);
}

// ===== Desenho =====
function text(str, x, y, size, color, align, outline) {
  ctx.font = `${size || 8}px "Press Start 2P", monospace`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  if (outline !== false) {
    ctx.fillStyle = '#000';
    for (const [dx, dy] of [[-0.7, 0], [0.7, 0], [0, -0.7], [0, 0.7], [0.7, 0.7]]) ctx.fillText(str, x + dx, y + dy);
  }
  ctx.fillStyle = color || '#fff';
  ctx.fillText(str, x, y);
}
function disc(cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}
function repeat(factor, period, fn) {
  const off = scroll * factor;
  for (let k = Math.floor(off / period) - 1; k * period - off < VW + period; k++) fn(Math.round(k * period - off), k);
}

function drawBackground() {
  const bands = ['#ff9a5a', '#ffb070', '#ffc98a', '#ffe0a8'];
  bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, Math.floor(i * VH * 0.16), VW, VH); });
  disc(VW * 0.78, 50, 16, '#fff2b0');
  repeat(0.15, 46, (x, k) => {                       // prédios ao fundo
    const h = 50 + Math.round(hash(k) * 50);
    ctx.fillStyle = '#b06a7a'; ctx.fillRect(x, GROUND - 18 - h, 40, h + 18);
    ctx.fillStyle = '#ffd98a';
    for (let r = 6; r < h - 4; r += 9) for (let c = 5; c < 36; c += 9) if (hash(k * 13 + r + c) > 0.5) ctx.fillRect(x + c, GROUND - 18 - h + r, 4, 5);
  });
  repeat(0.45, 70, (x, k) => {                       // casinhas da rua
    const cols = ['#5ab0c8', '#e8c050', '#c8708a', '#8ac060', '#e88a50'];
    const h = 40 + Math.round(hash(k + 3) * 16);
    ctx.fillStyle = cols[((k % cols.length) + cols.length) % cols.length];
    ctx.fillRect(x, GROUND - h, 66, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, GROUND - h, 66, 4);
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x + 8, GROUND - 26, 14, 26);
    ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x + 32, GROUND - h + 12, 22, 14);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 42, GROUND - h + 12, 2, 14); ctx.fillRect(x + 32, GROUND - h + 18, 22, 2);
  });
  // calçada
  ctx.fillStyle = '#c8c0b8'; ctx.fillRect(0, GROUND, VW, VH - GROUND);
  ctx.fillStyle = '#a8a098';
  const off = Math.round(scroll) % 16;
  for (let x = -off; x < VW; x += 16) ctx.fillRect(x, GROUND, 1, 16);
  ctx.fillRect(0, GROUND, VW, 1);
  ctx.fillStyle = '#8a8580'; ctx.fillRect(0, GROUND + 16, VW, 3);
  ctx.fillStyle = '#444048'; ctx.fillRect(0, GROUND + 19, VW, VH);
  ctx.fillStyle = '#e8e0a0';
  const off2 = Math.round(scroll) % 40;
  for (let x = -off2; x < VW; x += 40) ctx.fillRect(x, GROUND + 25, 18, 2);
}

function drawObstacle(o) {
  const x = Math.round(o.x), y = Math.round(o.y);
  if (o.type === 'cone') {
    ctx.fillStyle = '#ff7a1a';
    for (let i = 0; i < 12; i++) ctx.fillRect(x + 5 - Math.floor(i / 2.4), y + i, Math.floor(i / 1.2) + 1, 1);
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 2, y + 6, 6, 2);
    ctx.fillStyle = '#c85a10'; ctx.fillRect(x, y + 12, 10, 2);
  } else if (o.type === 'lixeira') {
    ctx.fillStyle = '#2a8a4a'; ctx.fillRect(x + 1, y + 3, 12, 17);
    ctx.fillStyle = '#1a6a3a'; ctx.fillRect(x, y, 14, 4); ctx.fillRect(x + 4, y + 6, 1, 12); ctx.fillRect(x + 9, y + 6, 1, 12);
  } else if (o.type === 'banana') {
    ctx.fillStyle = '#ffd23a'; ctx.fillRect(x + 2, y + 2, 8, 3); ctx.fillRect(x, y + 3, 3, 2); ctx.fillRect(x + 9, y, 3, 3);
    ctx.fillStyle = '#6a4a1a'; ctx.fillRect(x + 11, y, 1, 1);
  } else {
    const leg = Math.floor(frame / 5) % 2;
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x + 4, y + 3, 12, 6); ctx.fillRect(x, y, 6, 6);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2, y - 1, 2, 3); ctx.fillRect(x + 15, y + 2, 4, 2);
    ctx.fillStyle = '#111'; ctx.fillRect(x + 1, y + 2, 1, 1); ctx.fillRect(x, y + 4, 1, 1);
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(x + 5 + leg, y + 9, 2, 4); ctx.fillRect(x + 13 - leg, y + 9, 2, 4);
    if (frame % 40 < 14) text('AU!', x - 4, y - 10, 5, '#fff');
  }
}

function drawPadaria(x) {
  x = Math.round(x);
  ctx.fillStyle = '#f4e4c0'; ctx.fillRect(x, GROUND - 56, 120, 56);
  for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#d42020'; ctx.fillRect(x - 4 + i * 16, GROUND - 46, 16, 9); }
  ctx.fillStyle = '#6a2a1a'; ctx.fillRect(x + 10, GROUND - 66, 100, 16);
  text('PADARIA', x + 60, GROUND - 62, 7, '#ffd23a', 'center', false);
  ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x + 6, GROUND - 24, 70, 24);       // balcão
  ctx.fillStyle = '#a87040'; ctx.fillRect(x + 4, GROUND - 26, 74, 4);
  ctx.fillStyle = '#bfe8ff'; ctx.fillRect(x + 84, GROUND - 34, 28, 22);
  if (!(state === 'coffee' && coffeeResult === 'bom')) drawCup(x + 20, GROUND - 35);
}

function drawCup(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 6, 9); ctx.fillRect(x - 1, y, 8, 1);
  ctx.fillStyle = '#5a2a0a'; ctx.fillRect(x, y + 1, 6, 2);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  const w = Math.floor(frame / 10) % 2;
  ctx.fillRect(x + 1 + w, y - 4, 1, 3); ctx.fillRect(x + 4 - w, y - 6, 1, 3);
}

function drawBubble(b) {
  const isCig = b.who === 'cig';
  let ax = isCig ? PX + 14 + (cig ? cig.gap : 0) : PX + 10, ay = isCig ? (cig ? cig.y : GROUND - 16) : player.y;
  ctx.font = '6px "Press Start 2P", monospace';
  const bw = Math.ceil(ctx.measureText(b.text).width + 8), bh = 13;
  const bx = Math.round(clamp(ax - bw / 2, 2, VW - bw - 2));
  const by = Math.round(clamp(ay - bh - 8, 26, VH - bh - 2) - (isCig ? 16 : 0));
  const tx = Math.round(clamp(ax, bx + 4, bx + bw - 6));
  ctx.fillStyle = isCig ? '#e0801a' : '#6a2a8a';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2); ctx.fillRect(tx - 1, by + bh, 5, 3);
  ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh); ctx.fillRect(tx, by + bh, 3, 2);
  text(b.text, bx + 4, by + 4, 6, '#111', 'left', false);
}

function drawHUD() {
  // barra de abstinência
  text('ABSTINÊNCIA', 8, 6, 5, '#fff');
  ctx.fillStyle = '#000'; ctx.fillRect(7, 13, 92, 9);
  const col = meter < 45 ? '#3cd05a' : meter < 75 ? '#ffd23a' : (frame % 10 < 5 ? '#ff3030' : '#ff8a3a');
  ctx.fillStyle = '#333'; ctx.fillRect(8, 14, 90, 7);
  ctx.fillStyle = col; ctx.fillRect(8, 14, Math.round(90 * meter / 100), 7);
  text('CIGARROS ' + cigs + '  CAFÉS ' + cafes, 8, 26, 5, '#fff');
  text('PONTOS ' + pts(), 8, 34, 5, '#ffd23a');

  if (state === 'chase') {
    const cx = PX + 10 + cig.gap;
    if (cx > VW - 10) text('CIGARRO ▶ ' + Math.round(cig.gap / 8) + 'm', VW - 8, 52, 6, '#ffd23a', 'right');
    if (stateT < 120) text('PEGA O CIGARRO!', VW / 2, 60, 8, '#fff', 'center');
  }
  if (state === 'smoke') {
    text(puffs < 5 ? 'TOQUE RÁPIDO PARA TRAGAR!' : 'AAAH...', VW / 2, 52, 7, '#fff', 'center');
    for (let i = 0; i < 5; i++) disc(VW / 2 - 24 + i * 12, 70, 3, i < puffs ? '#ff5a1a' : '#555');
  }
  if (state === 'coffee') {
    const bw = 140, bx = Math.round(VW / 2 - bw / 2), by = 62;
    text(coffeeResult === 'bom' ? 'NO PONTO!' : coffeeResult === 'ruim' ? 'QUEIMOU!' : 'TOQUE NA HORA CERTA!',
      VW / 2, 48, 7, coffeeResult === 'ruim' ? '#ff5a3a' : '#fff', 'center');
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = '#c84a2a'; ctx.fillRect(bx, by, bw, 8);
    ctx.fillStyle = '#3cd05a'; ctx.fillRect(Math.round(bx + (zone.c - zone.w / 2) * bw), by, Math.round(zone.w * bw), 8);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(bx + needle * bw) - 1, by - 4, 3, 16);
  }
}

function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  drawBackground();

  if (state === 'menu') {
    const f = Math.floor(frame / 6) % 2 ? 'run1' : 'run2';
    ctx.drawImage(tonhao(f), Math.round(VW * 0.3), GROUND - 25);
    ctx.drawImage(cigarro(Math.floor(frame / 5) % 2), Math.round(VW * 0.3 + 70 + Math.sin(frame / 40) * 12), GROUND - 16);
    return;
  }

  if (state === 'coffeeRun' || state === 'coffee') drawPadaria(padX);
  for (const o of obstacles) drawObstacle(o);

  if (state === 'chase' || state === 'over') {
    if (cig && state === 'chase') ctx.drawImage(cigarro(Math.floor(cig.anim) % 2), Math.round(PX + 10 + cig.gap), Math.round(cig.y));
  }

  // Tonhão (treme quando a abstinência está alta)
  const p = player;
  const shake = meter > 80 && state === 'chase' ? Math.round(rand(-1, 1)) : 0;
  let f = 'idle';
  if (state === 'chase' || state === 'coffeeRun') f = !p.onGround ? 'jump' : Math.floor(p.anim) % 2 ? 'run1' : 'run2';
  if (!(p.hitT > 0 && (p.hitT >> 2) % 2)) {
    const px = PX + shake, py = Math.round(p.y);
    ctx.drawImage(tonhao(f), px, py);
    if (state === 'smoke' && puffs < 5 || state === 'smoke' && stateT < 60) {
      // cigarro na boca
      ctx.fillStyle = '#e0801a'; ctx.fillRect(px + 15, py + 6, 2, 1);
      ctx.fillStyle = '#fff'; ctx.fillRect(px + 17, py + 6, 4, 1);
      ctx.fillStyle = puffAnim > 0 || frame % 20 < 10 ? '#ff3a1a' : '#c82a10'; ctx.fillRect(px + 21, py + 6, 1, 1);
      if (puffAnim > 0) { ctx.fillStyle = '#f0b48a'; ctx.fillRect(px + 14, py + 4, 2, 2); }
    }
    if (state === 'coffee' && coffeeResult === 'bom') drawCup(px + 17, py + 3);
    if (state === 'over') text('#@%!', px - 2, py - 10, 6, '#ff3a1a');
  }

  for (const q of parts) {
    if (q.type === 'smoke') {
      ctx.globalAlpha = Math.min(1, q.life / 40) * 0.8;
      disc(q.x, q.y, Math.round(q.r), '#d8d8e0');
      ctx.globalAlpha = 1;
    } else if (q.type === 'sweat') {
      ctx.fillStyle = '#7fd8ff'; ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, 2);
    } else if (q.type === 'text') text(q.text, q.x, q.y, 6, '#ffd23a');
  }
  for (const b of bubbles) drawBubble(b);
  drawHUD();
}

// ===== Telas =====
function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id);
  $('topbar').classList.toggle('show', !id);
}
function toMenu() {
  state = 'menu'; Sfx.music(false); stopVoices();
  $('best').textContent = best;
  showScreen('screen-menu');
}
function togglePause() {
  if (['chase', 'smoke', 'coffeeRun', 'coffee'].includes(state)) {
    prevState = state; state = 'paused';
    Sfx.music(false); stopVoices();
    showScreen('screen-pause');
  } else if (state === 'paused') resume();
}
function resume() { state = prevState; showScreen(null); Sfx.music(true); }
function toggleMute() {
  muted = !muted; Sfx.mute(muted); persist();
  if (muted) stopVoices();
  $('btn-mute').textContent = muted ? '✕' : '♪';
  $('btn-mute').classList.toggle('off', muted);
}

$('btn-play').onclick = startGame;
$('btn-again').onclick = startGame;
$('btn-menu').onclick = toMenu;
$('btn-menu2').onclick = toMenu;
$('btn-resume').onclick = resume;
$('btn-pause').onclick = () => { Sfx.init(); togglePause(); };
$('btn-mute').onclick = () => { Sfx.init(); toggleMute(); };
$('btn-mute').textContent = muted ? '✕' : '♪';
$('btn-mute').classList.toggle('off', muted);
$('best').textContent = best;
document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(); });

// ===== Tela / loop =====
function resize() {
  const w = innerWidth, h = innerHeight;
  VW = Math.round(clamp(VH * (w / h), 240, 400));
  const s = Math.min(w / VW, h / VH);
  SCALE = Math.max(1, Math.ceil(s * (devicePixelRatio || 1)));
  cv.width = VW * SCALE; cv.height = VH * SCALE;
  cv.style.width = Math.floor(VW * s) + 'px';
  cv.style.height = Math.floor(VH * s) + 'px';
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));

if (/debug/.test(location.search)) {
  window.__dbg = { get state() { return state; }, get cig() { return cig; }, get meter() { return meter; },
    set meter(v) { meter = v; }, get puffs() { return puffs; }, get needle() { return needle; }, get zone() { return zone; },
    get bubbles() { return bubbles; }, action };
}

resetPlayer();
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
resize();
requestAnimationFrame(loop);
})();
