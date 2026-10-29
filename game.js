'use strict';
(() => {
// ===== Constantes =====
const TS = 16, LH = 12, VH = LH * TS;
const MAXV = 2.0, JUMP_V = -5.2, G_HOLD = 0.2, G_FALL = 0.42;
let VW = 320, SCALE = 3;

const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const hash = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ===== Save (dólares, skins compradas, fases liberadas) =====
const SAVE_KEY = 'fugaFlavio_save_v1';
const defSave = () => ({ coins: 0, owned: ['terno', 'selecao'], skin: 'terno', muted: false, unlocked: 1 });
let save = defSave();
try {
  const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
  if (s) save = Object.assign(defSave(), s);
} catch (e) { /* save corrompido: começa do zero */ }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sem storage */ } }
const currentSkin = () => SKINS.find(s => s.id === save.skin) || SKINS[0];
Sfx.setMuted(save.muted);

// ===== Temas das fases =====
const THEMES = [
  { name: 'Rio de Janeiro', sky: ['#5cc4f7', '#86d6fb', '#b4e8ff'], cloud: '#ffffff',
    grass: '#3cbf3c', grassDark: '#24852a', dirt: '#c27a3a', dirtDark: '#93552a', bg: 'rio' },
  { name: 'Brasília', sky: ['#f47c4c', '#ff9d5c', '#ffc77d'], cloud: '#ffe3c4',
    grass: '#8bb83a', grassDark: '#5f8a22', dirt: '#b9532c', dirtDark: '#8a3a1c', bg: 'bsb' },
  { name: 'Aeroporto', sky: ['#0e1233', '#161c48', '#24306a'], cloud: '#2e3870',
    grass: '#a0a0a8', grassDark: '#e0c020', dirt: '#55555e', dirtDark: '#44444c', bg: 'gru', stars: true },
];

const tileSets = new Map();
function tileSet(th) {
  if (tileSets.has(th)) return tileSets.get(th);
  const mk = fn => { const c = document.createElement('canvas'); c.width = c.height = 16; fn(c.getContext('2d')); return c; };
  const T = {};
  T[2] = mk(g => {
    g.fillStyle = th.dirt; g.fillRect(0, 0, 16, 16);
    g.fillStyle = th.dirtDark;
    for (const [x, y] of [[2, 3], [9, 1], [13, 6], [5, 9], [11, 12], [1, 13], [7, 14]]) g.fillRect(x, y, 2, 2);
  });
  T[1] = mk(g => {
    g.drawImage(T[2], 0, 0);
    g.fillStyle = th.grass; g.fillRect(0, 0, 16, 5);
    g.fillStyle = th.grassDark; g.fillRect(0, 5, 16, 1);
    for (const x of [1, 5, 9, 13]) g.fillRect(x, 6, 2, 1);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 0, 16, 1);
  });
  T[3] = mk(g => {
    g.fillStyle = '#c4501a'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#e8794a'; g.fillRect(0, 0, 16, 1);
    g.fillStyle = '#5a1e08';
    g.fillRect(0, 7, 16, 1); g.fillRect(0, 15, 16, 1);
    g.fillRect(7, 0, 1, 7); g.fillRect(15, 0, 1, 7);
    g.fillRect(3, 8, 1, 7); g.fillRect(11, 8, 1, 7);
  });
  const Q = ['.####.', '##..##', '....##', '...##.', '..##..', '..##..', '......', '..##..'];
  T[4] = ['#f8b800', '#ffd040', '#e09800'].map(base => mk(g => {
    g.fillStyle = '#7a3a00'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = base; g.fillRect(1, 1, 14, 14);
    g.fillStyle = '#7a3a00';
    for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]]) g.fillRect(x, y, 1, 1);
    for (let y = 0; y < Q.length; y++) for (let x = 0; x < 6; x++) {
      if (Q[y][x] !== '#') continue;
      g.fillStyle = '#7a3a00'; g.fillRect(5 + x + 1, 4 + y + 1, 1, 1);
      g.fillStyle = '#fff6d0'; g.fillRect(5 + x, 4 + y, 1, 1);
    }
  }));
  T[5] = mk(g => {
    g.fillStyle = '#5a3a1a'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#9a6a3a'; g.fillRect(1, 1, 14, 14);
    g.fillStyle = '#5a3a1a';
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) g.fillRect(x, y, 1, 1);
  });
  T[6] = mk(g => {
    g.fillStyle = '#686870'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#a8a8b0'; g.fillRect(0, 0, 15, 15);
    g.fillStyle = '#d8d8e0'; g.fillRect(0, 0, 15, 2); g.fillRect(0, 0, 2, 15);
  });
  tileSets.set(th, T);
  return T;
}

// ===== Geração das fases =====
const ENEMY = {
  paper: { w: 12, h: 15, speed: 0.5 },
  agent: { w: 12, h: 22, speed: 0.75, lines: ['pf_parado', 'pf_mandado'] },
  militante: { w: 12, h: 22, speed: 0.95, lines: ['militante_olha', 'militante_anistia'] },
  book: { w: 14, h: 14, speed: 0.9, lines: ['cf_iguais', 'cf_acima'] },
};
function mkEnemy(type, tx, top) {
  const d = ENEMY[type];
  // a Constituição voa na altura da cabeça do Flávio
  const y = type === 'book' ? (top - 2) * TS - 2 : top * TS - d.h;
  return { type, x: tx * TS + 2, y, baseY: y, w: d.w, h: d.h, vx: 0, vy: 0, dir: -1, speed: d.speed,
    onGround: false, active: false, dead: false, gone: false, anim: 0, t: 0, hop: 60 + Math.random() * 90 };
}

function genLevel(n) {
  const rnd = mulberry32(4242 + n * 977);
  const W = 230 + n * 50;
  const tiles = new Uint8Array(W * LH);
  const groundTop = new Int16Array(W).fill(-1);
  const contents = new Map();
  const enemies = [], coins = [];
  const set = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < LH) tiles[y * W + x] = t; };
  const col = (x, top) => { groundTop[x] = top; set(x, top, 1); for (let y = top + 1; y < LH; y++) set(x, y, 2); };
  const coin = (tx, ty) => coins.push({ x: tx * TS + 4, y: ty * TS + 2, w: 8, h: 12, taken: false });
  const endStart = W - 28, mid = Math.floor(W / 2);
  const shieldAt = [Math.floor(W * 0.2), Math.floor(W * 0.62)];
  let shieldIdx = 0, x = 0, top = 10, sinceGap = 0;
  const forced = x => x < 14 || x >= endStart || Math.abs(x - mid) < 4;

  while (x < W) {
    if (forced(x)) {
      if (x >= endStart) top = 10;
      col(x, top); x++; sinceGap++;
      continue;
    }
    const r = rnd();
    const gapChance = 0.3 + n * 0.06;
    if (r < gapChance && sinceGap > 3) {
      const gw = 2 + Math.floor(rnd() * Math.min(3, 1 + n));
      if (x + gw < endStart - 2 && (x + gw < mid - 5 || x > mid + 4)) {
        for (let i = 0; i < gw; i++) coin(x + i, top - 3 - (i > 0 && i < gw - 1 ? 1 : 0));
        x += gw; sinceGap = 0;
        if (rnd() < 0.35) top = clamp(top + (rnd() < 0.5 ? -1 : 1), 7, 10);
        continue;
      }
    }
    if (r > 0.74) top = clamp(top + (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2)), 7, 10);

    const segStart = x, want = 4 + Math.floor(rnd() * 5);
    while (x < segStart + want && !forced(x)) { col(x, top); x++; sinceGap++; }
    const len = x - segStart;
    if (len < 4) continue;

    const r2 = rnd();
    let stairs = false;
    if (r2 < 0.5) {
      // Fileira de tijolos e blocos "?" (com espaço por baixo para passar)
      const bl = Math.min(len - 3, 2 + Math.floor(rnd() * 3));
      const bs = segStart + 1 + Math.floor(rnd() * (len - 2 - bl));
      for (let i = 0; i < bl; i++) {
        const bx = bs + i, by = top - 3;
        let q = rnd() < 0.45;
        if (shieldIdx < shieldAt.length && bx >= shieldAt[shieldIdx]) {
          q = true; contents.set(bx + ',' + by, 'shield'); shieldIdx++;
        }
        set(bx, by, q ? 4 : 3);
        if (!q && rnd() < 0.5) coin(bx, by - 1);
      }
    } else if (r2 < 0.68 && len >= 6) {
      stairs = true;
      const h = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < h; i++) for (let k = 0; k <= i; k++) set(x - h + i, top - 1 - k, 6);
    } else if (r2 < 0.85) {
      for (let i = 1; i < len - 1; i++) coin(segStart + i, top - 2);
    }
    if (segStart > 18 && rnd() < 0.55 + n * 0.12) {
      const r3 = rnd();
      const type = r3 < 0.3 - n * 0.08 ? 'paper' : r3 < 0.7 - n * 0.06 ? 'militante' : 'agent';
      enemies.push(mkEnemy(type, segStart + Math.floor(len / 2) - (stairs ? 2 : 0), top));
      if (len >= 7 && rnd() < 0.3 + n * 0.1) enemies.push(mkEnemy(rnd() < 0.5 ? 'militante' : 'paper', segStart + 1, top));
    }
  }

  // Constituições voadoras aparecem de tempos em tempos
  for (let bx = 40; bx < endStart - 8; bx += 34 - n * 6 + Math.floor(rnd() * 8)) {
    enemies.push(mkEnemy('book', bx, groundTop[bx] >= 0 ? groundTop[bx] : 10));
  }

  const planeX = (W - 19) * TS;
  return {
    n, w: W, tiles, groundTop, contents, enemies, coins, items: [], theme: THEMES[n],
    flag: { x: mid * TS + 4, y: groundTop[mid] * TS, raised: false },
    signX: (endStart + 3) * TS,
    plane: { x: planeX, y: 10 * TS - 26, vx: 0, x0: planeX },
  };
}

// ===== Estado do jogo =====
let state = 'menu';           // menu | play | paused | dying | boarding | dialog
let L = null, player = null, lula = null, cam = { x: 0 };
let lives = 3, runCoins = 0, score = 0, stateT = 0, frame = 0, banner = 0;
let checkpoint = null, deathCause = '', lastShout = 0;
let parts = [], bubbles = [], speechQ = [];
const bumps = new Map();
let menuCam = 0;

// ===== Entrada (teclado + toque) =====
const kb = { left: false, right: false, jump: false };
const tk = { left: false, right: false, jump: false };
let jumpPressed = false;
const keys = {
  get left() { return kb.left || tk.left; },
  get right() { return kb.right || tk.right; },
  get jump() { return kb.jump || tk.jump; },
};

const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', ArrowUp: 'jump', KeyW: 'jump', KeyZ: 'jump', KeyK: 'jump' };
addEventListener('keydown', e => {
  Sfx.init();
  const k = KEYMAP[e.code];
  if (k) {
    if (state === 'play' || state === 'dying' || state === 'boarding') e.preventDefault();
    if (k === 'jump' && !kb.jump) jumpPressed = true;
    kb[k] = true;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  if (e.code === 'KeyM') toggleMute();
  if (e.code === 'Enter' && state === 'menu') startGame(0);
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) kb[k] = false; });

const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

function bindTouch() {
  const dpad = $('dpad'), ptrs = new Map();
  const upd = () => {
    let l = false, r = false;
    for (const v of ptrs.values()) { if (v < 0) l = true; else r = true; }
    tk.left = l; tk.right = r;
    $('pad-left').classList.toggle('on', l);
    $('pad-right').classList.toggle('on', r);
  };
  const side = e => { const rc = dpad.getBoundingClientRect(); return e.clientX - rc.left < rc.width / 2 ? -1 : 1; };
  dpad.addEventListener('pointerdown', e => {
    e.preventDefault(); Sfx.init();
    try { dpad.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    ptrs.set(e.pointerId, side(e)); upd();
  });
  dpad.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) { ptrs.set(e.pointerId, side(e)); upd(); } });
  const end = e => { ptrs.delete(e.pointerId); upd(); };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) dpad.addEventListener(ev, end);

  const jb = $('pad-jump');
  jb.addEventListener('pointerdown', e => {
    e.preventDefault(); Sfx.init();
    try { jb.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    if (!tk.jump) jumpPressed = true;
    tk.jump = true; jb.classList.add('on');
  });
  const jend = () => { tk.jump = false; jb.classList.remove('on'); };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jb.addEventListener(ev, jend);
  for (const el of [dpad, jb]) el.addEventListener('contextmenu', e => e.preventDefault());
}

function updateTouch() {
  $('touch').classList.toggle('show', isTouch && (state === 'play' || state === 'dying' || state === 'boarding'));
  $('topbar').classList.toggle('show', state !== 'menu');
}

// ===== Física =====
function solidAt(tx, ty) {
  if (ty >= LH) return false;
  if (tx < 0 || tx >= L.w) return true;
  if (ty < 0) return false;
  const t = L.tiles[ty * L.w + tx];
  return t >= 1 && t <= 6;
}
const tileAt = (tx, ty) => (tx < 0 || tx >= L.w || ty < 0 || ty >= LH ? 0 : L.tiles[ty * L.w + tx]);

function collideX(e) {
  const y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / TS);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { e.x = tx * TS - e.w; e.vx = 0; return true; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TS);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(tx, ty)) { e.x = (tx + 1) * TS; e.vx = 0; return true; }
  }
  return false;
}

function collideY(e) {
  e.onGround = false;
  const x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TS);
    for (let tx = x0; tx <= x1; tx++) {
      if (solidAt(tx, ty)) { e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; return null; }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TS);
    const cx = Math.floor((e.x + e.w / 2) / TS);
    let hit = -1;
    for (let tx = x0; tx <= x1; tx++) if (solidAt(tx, ty)) { if (hit < 0 || tx === cx) hit = tx; }
    if (hit >= 0) { e.y = (ty + 1) * TS; e.vy = 0; return { tx: hit, ty }; }
  }
  return null;
}

// ===== Falas e balões =====
// O balão aparece quando a fala começa de fato (as falas entram numa fila)
// ent: quem fala (para inimigos); ifIdle: só fala se ninguém estiver falando
function say(id, interrupt, ent, ifIdle) {
  const line = Voice.LINES[id];
  if (!line) return;
  Voice.play(id, { interrupt, ifIdle, onStart: () => {
    bubbles = bubbles.filter(b => b.who !== line.who);
    bubbles.push({ who: line.who, ent, text: line.text, t: 160 });
  } });
}

// inimigos gritam quando aparecem na tela (sem atropelar as outras falas)
function enemyShout(e) {
  const lines = ENEMY[e.type].lines;
  if (!lines || frame - lastShout < 200 || Math.random() > 0.6) return;
  lastShout = frame;
  say(pick(lines), false, e, true);
}
const queueSay = (id, delay) => speechQ.push({ id, delay });

// ===== Início de jogo / fase =====
function mkPlayer(x, y) {
  return { x, y, w: 10, h: 22, vx: 0, vy: 0, onGround: false, facing: 1, coyote: 0, jumpBuf: 0,
    invuln: 0, shield: false, anim: 0, hidden: false };
}

function startGame(n) {
  Sfx.init();
  lives = 3; score = 0; runCoins = 0;
  startLevel(n);
  try {
    if (isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  } catch (e) { /* sem tela cheia */ }
}

function startLevel(n) {
  L = genLevel(n);
  const sx = 3 * TS;
  player = mkPlayer(sx, L.groundTop[3] * TS - 22);
  checkpoint = { x: sx, y: player.y };
  lula = { x: sx - 130, y: player.y, w: 12, h: 22, base: 1.2 + n * 0.15, anim: 0, facing: 1, wait: 70, talk: 40 };
  parts = []; bubbles = []; speechQ = []; bumps.clear(); lastShout = 0;
  Voice.stop();
  cam.x = 0; frame = 0; banner = 160;
  state = 'play';
  showScreen(null);
  Sfx.startMusic(n);
  queueSay('flavio_passaporte', 150);
}

function addCoin() {
  save.coins++; runCoins++;
  Sfx.play('coin');
  if (save.coins % 10 === 0) persist();
}
function addScore(v, x, y) {
  score += v;
  parts.push({ type: 'text', text: '+' + v, x, y, vx: 0, vy: -0.6, life: 40 });
}

// ===== Atualização =====
function update() {
  frame++;
  if (state === 'menu') { menuCam += 1.1; return; }
  if (state === 'play') updatePlay();
  else if (state === 'dying') updateDying();
  else if (state === 'boarding') updateBoarding();
  jumpPressed = false;
}

function updatePlay() {
  if (banner > 0) banner--;
  updatePlayer();
  if (state !== 'play') return;
  updateEnemies();
  updateItems();
  updateCoins();
  updateLula();
  updateParticles();
  updateBubbles();
  updateSpeech();
  if (state !== 'play') return;

  if (!L.flag.raised && player.x > L.flag.x) {
    L.flag.raised = true;
    checkpoint = { x: L.flag.x + 4, y: L.flag.y - player.h };
    Sfx.play('flag');
    say('flavio_ninguem');
  }
  if (player.y > VH + 40) { die('fall'); return; }
  if (player.x + player.w / 2 >= L.plane.x + 22 && player.onGround) { board(); return; }
  updateCamera();
}

function updatePlayer() {
  const p = player;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (dir) {
    p.vx += dir * (p.onGround ? 0.14 : 0.09);
    p.facing = dir;
  } else {
    const f = p.onGround ? 0.16 : 0.04;
    p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
  }
  p.vx = clamp(p.vx, -MAXV, MAXV);

  // pulo com "coyote time" e buffer para ficar gostoso no touch
  if (jumpPressed) p.jumpBuf = 8; else if (p.jumpBuf > 0) p.jumpBuf--;
  if (p.onGround) p.coyote = 6; else if (p.coyote > 0) p.coyote--;
  if (p.jumpBuf > 0 && p.coyote > 0) {
    p.vy = JUMP_V; p.jumpBuf = 0; p.coyote = 0; p.onGround = false;
    Sfx.play('jump');
  }
  p.vy = Math.min(p.vy + (keys.jump && p.vy < 0 ? G_HOLD : G_FALL), 6);

  p.x += p.vx; collideX(p);
  if (p.x < cam.x) { p.x = cam.x; p.vx = Math.max(0, p.vx); }
  p.y += p.vy;
  const hit = collideY(p);
  if (hit) hitBlock(hit.tx, hit.ty);

  if (p.invuln > 0) p.invuln--;
  if (p.onGround && Math.abs(p.vx) > 0.2) p.anim += Math.abs(p.vx) * 0.09;
  if (p.shield && frame % 6 === 0) {
    parts.push({ type: 'spark', x: p.x + Math.random() * p.w, y: p.y + Math.random() * p.h, vx: 0, vy: -0.4, life: 20 });
  }
}

function hitBlock(tx, ty) {
  const t = tileAt(tx, ty), key = tx + ',' + ty;
  if (t === 4) {
    L.tiles[ty * L.w + tx] = 5;
    bumps.set(key, 8);
    if (L.contents.get(key) === 'shield') {
      L.items.push({ x: tx * TS + 2, y: ty * TS, w: 12, h: 14, vx: 0, vy: 0, dir: 1, rise: 18, onGround: false });
      Sfx.play('appear');
    } else {
      addCoin();
      parts.push({ type: 'coin', x: tx * TS + 4, y: ty * TS - 12, vx: 0, vy: -4.5, life: 28 });
    }
    Sfx.play('bump');
    bumpKill(tx, ty);
  } else if (t === 3) {
    L.tiles[ty * L.w + tx] = 0;
    Sfx.play('brick');
    for (let i = 0; i < 4; i++) {
      parts.push({ type: 'brick', x: tx * TS + 4 + (i % 2) * 8, y: ty * TS + 4 + (i >> 1) * 8,
        vx: i % 2 ? 1.5 : -1.5, vy: i >> 1 ? -3 : -4.5, life: 70 });
    }
    addScore(50, tx * TS, ty * TS);
    bumpKill(tx, ty);
  } else {
    Sfx.play('bump');
  }
}

// Bater num bloco derruba inimigos e pega moedas em cima dele
function bumpKill(tx, ty) {
  const r = { x: tx * TS, y: ty * TS - 16, w: TS, h: 16 };
  for (const e of L.enemies) {
    if (!e.dead && !e.gone && overlap(r, e)) {
      e.dead = true; e.flip = true; e.deadT = 90; e.vy = -4;
      Sfx.play('stomp'); addScore(100, e.x, e.y);
    }
  }
  for (const c of L.coins) if (!c.taken && overlap(r, c)) { c.taken = true; addCoin(); }
}

function updateEnemies() {
  const p = player;
  for (const e of L.enemies) {
    if (e.gone) continue;
    if (e.dead) {
      e.deadT--;
      if (e.flip) { e.vy += 0.3; e.y += e.vy; }
      if (e.deadT <= 0) e.gone = true;
      continue;
    }
    if (!e.active) {
      if (e.x < cam.x + VW + 24) { e.active = true; enemyShout(e); } else continue;
    }
    e.anim += 0.12;
    if (e.type === 'book') {
      // voa para a esquerda balançando e mirando a altura do Flávio
      e.t++;
      e.baseY += clamp(p.y + 4 - e.baseY, -0.2, 0.2);
      e.x -= e.speed;
      e.y = e.baseY + Math.sin(e.t * 0.06) * 10;
      if (e.x < cam.x - 80) { e.gone = true; continue; }
      if (state === 'play' && overlap(p, e)) {
        if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 6) stomp(e); else hurt();
      }
      continue;
    }
    e.vx = e.dir * e.speed;
    e.x += e.vx;
    if (collideX(e)) e.dir *= -1;
    // agentes da PF não caem dos buracos
    if (e.type === 'militante' && e.onGround && --e.hop <= 0) { e.vy = -3.6; e.hop = 80 + Math.random() * 100; }
    if (e.type !== 'paper' && e.onGround) {
      const fx = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
      if (!solidAt(Math.floor(fx / TS), Math.floor((e.y + e.h + 4) / TS))) e.dir *= -1;
    }
    e.vy = Math.min(e.vy + 0.35, 6);
    e.y += e.vy;
    collideY(e);
    if (e.y > VH + 40) { e.gone = true; continue; }
    if (state === 'play' && overlap(p, e)) {
      if (p.vy > 0 && p.y + p.h - p.vy <= e.y + 6) stomp(e);
      else hurt();
    }
  }
}

function stomp(e) {
  e.dead = true;
  e.flip = e.type !== 'paper';
  e.deadT = e.flip ? 90 : 30;
  e.vy = -2;
  player.vy = keys.jump ? -6 : -3.8;
  Sfx.play('stomp');
  addScore(100, e.x, e.y);
}

function hurt() {
  const p = player;
  if (p.invuln > 0) return;
  if (p.shield) {
    p.shield = false; p.invuln = 100;
    Sfx.play('hurt'); say('flavio_ai');
  } else die('enemy');
}

function updateItems() {
  for (const it of L.items) {
    if (it.gone) continue;
    if (it.rise > 0) { it.y -= 0.9; it.rise--; continue; }
    it.vx = it.dir * 0.9;
    it.x += it.vx;
    if (collideX(it)) it.dir *= -1;
    it.vy = Math.min(it.vy + 0.3, 5);
    it.y += it.vy;
    collideY(it);
    if (it.y > VH + 20) it.gone = true;
    if (overlap(player, it)) {
      it.gone = true;
      player.shield = true;
      Sfx.play('power');
      say('flavio_passaporte');
      addScore(500, it.x, it.y);
    }
  }
}

function updateCoins() {
  for (const c of L.coins) {
    if (!c.taken && c.x > cam.x - 16 && c.x < cam.x + VW + 16 && overlap(player, c)) { c.taken = true; addCoin(); }
  }
}

function updateLula() {
  const p = player;
  if (lula.wait > 0) { lula.wait--; return; }
  if (state === 'boarding') {
    const stop = L.plane.x - 34;
    if (lula.x < stop) { lula.x = Math.min(stop, lula.x + 1.8); lula.anim += 0.25; lula.running = true; }
    else lula.running = false;
    return;
  }
  const dx = p.x - lula.x;
  const sp = dx > 230 ? 2.8 : lula.base;
  lula.x += Math.sign(dx) * Math.min(sp, Math.abs(dx));
  lula.facing = dx >= 0 ? 1 : -1;
  lula.anim += 0.22;
  lula.running = true;
  // corre pelo chão; nos buracos ele "flutua" (é perseguição de desenho animado!)
  const gt = L.groundTop[clamp(Math.floor((lula.x + 6) / TS), 0, L.w - 1)];
  const ty = gt >= 0 ? gt * TS - lula.h : lula.y;
  lula.y += (ty - lula.y) * 0.25;

  if (overlap(p, lula) && p.invuln === 0) {
    if (p.shield) {
      // o passaporte salva: Flávio escapa por um triz
      p.shield = false; p.invuln = 120;
      lula.x -= 110; lula.wait = 40;
      Sfx.play('hurt');
      say('lula_volta');
      queueSay('flavio_passaporte', 60);
    } else {
      die('lula');
      return;
    }
  }
  Sfx.setDanger(dx < 110);
  if (--lula.talk <= 0) {
    lula.talk = 420 + Math.floor(Math.random() * 300);
    if (dx < 320) {
      say(pick(['lula_pegar', 'lula_volta', 'lula_correr']));
      if (Math.random() < 0.6) queueSay(pick(['flavio_ninguem', 'flavio_passaporte']), 110);
    }
  }
}

function updateParticles() {
  for (const q of parts) {
    q.life--;
    q.x += q.vx; q.y += q.vy;
    if (q.type === 'brick' || q.type === 'coin') q.vy += 0.25;
  }
  parts = parts.filter(q => q.life > 0);
  for (const [k, v] of bumps) { if (v <= 1) bumps.delete(k); else bumps.set(k, v - 1); }
}

function updateBubbles() {
  for (const b of bubbles) b.t--;
  bubbles = bubbles.filter(b => b.t > 0);
}

function updateSpeech() {
  for (const s of speechQ) s.delay--;
  const ready = speechQ.filter(s => s.delay <= 0);
  speechQ = speechQ.filter(s => s.delay > 0);
  for (const s of ready) say(s.id);
}

function updateCamera() {
  cam.x = clamp(player.x + player.w / 2 - VW * 0.42, 0, L.w * TS - VW);
}

// ===== Morte / respawn / fim =====
function die(cause) {
  if (state !== 'play') return;
  state = 'dying'; stateT = 0; deathCause = cause;
  player.vy = -5; player.vx = 0;
  Sfx.stopMusic(); Sfx.setDanger(false); Sfx.play('die');
  say(cause === 'lula' ? 'lula_peguei' : 'flavio_ai', true);
  updateTouch();
}

function updateDying() {
  stateT++;
  if (stateT > 20) { player.vy += 0.3; player.y += player.vy; }
  updateParticles(); updateBubbles();
  if (stateT >= 130) {
    lives--;
    persist();
    if (lives <= 0) gameOver(); else respawn();
  }
}

function respawn() {
  player = mkPlayer(checkpoint.x, checkpoint.y);
  player.invuln = 120;
  cam.x = clamp(player.x - VW * 0.42, 0, L.w * TS - VW);
  lula.x = player.x - 180; lula.y = player.y; lula.wait = 60; lula.talk = 220;
  speechQ = [];
  Voice.stop();
  state = 'play';
  updateTouch();
  Sfx.startMusic(L.n);
}

function gameOver() {
  Sfx.play('over');
  const caught = deathCause === 'lula';
  showDialog(caught ? 'PEGO!' : 'FIM DE JOGO',
    (caught ? 'O Lula pegou o Flávio... e o passaporte!' : 'Acabaram as vidas!') +
    `<br><br>Dólares nesta fuga: <b>$ ${runCoins}</b><br>Pontos: <b>${score}</b>`,
    [{ label: 'TENTAR DE NOVO', primary: true, fn: () => startGame(L.n) },
     { label: 'MENU', fn: toMenu }]);
}

function board() {
  state = 'boarding'; stateT = 0;
  player.hidden = true;
  Sfx.setDanger(false); Sfx.stopMusic();
  speechQ = [];
  Voice.stop();
  queueSay('flavio_fui', 10);
  queueSay('lula_aviao', 120);
  updateTouch();
}

function updateBoarding() {
  stateT++;
  const pl = L.plane;
  if (stateT === 50) Sfx.play('engine');
  if (stateT > 50) {
    pl.vx = Math.min(pl.vx + 0.05, 6);
    pl.x += pl.vx;
    if (pl.x - pl.x0 > 90) pl.y -= pl.vx * 0.35;
  }
  updateLula(); updateParticles(); updateBubbles(); updateSpeech();
  if (stateT === 260) levelClear();
}

function levelClear() {
  Sfx.play('win');
  const n = L.n;
  save.unlocked = Math.max(save.unlocked, Math.min(3, n + 2));
  persist();
  if (n < 2) {
    showDialog('ESCAPOU!', `O Flávio fugiu de <b>${THEMES[n].name}</b>!<br><br>` +
      `Dólares nesta fuga: <b>$ ${runCoins}</b><br>Pontos: <b>${score}</b>`,
      [{ label: 'PRÓXIMA FASE ▶', primary: true, fn: () => startLevel(n + 1) },
       { label: 'MENU', fn: toMenu }]);
  } else {
    showDialog('LIVRE... POR ENQUANTO!', 'O avião decolou e o Flávio chegou em Miami com o passaporte no bolso!' +
      `<br><br>Dólares nesta fuga: <b>$ ${runCoins}</b><br>Pontos: <b>${score}</b>` +
      '<br><br>Use seus dólares para comprar novas skins!',
      [{ label: 'JOGAR DE NOVO', primary: true, fn: () => startGame(0) },
       { label: 'SKINS', fn: openSkins },
       { label: 'MENU', fn: toMenu }]);
  }
}

function togglePause() {
  if (state === 'play') {
    state = 'paused';
    Sfx.stopMusic();
    Voice.stop();
    persist();
    showDialog('PAUSA', 'O Lula está esperando...', [
      { label: 'CONTINUAR', primary: true, fn: resume },
      { label: 'REINICIAR FASE', fn: () => startLevel(L.n) },
      { label: 'MENU', fn: toMenu }]);
  } else if (state === 'paused') resume();
}
function resume() { state = 'play'; showScreen(null); Sfx.startMusic(L.n); }

function toggleMute() {
  save.muted = !save.muted;
  Sfx.setMuted(save.muted);
  persist();
  $('btn-mute').textContent = save.muted ? '✕' : '♪';
  $('btn-mute').classList.toggle('off', save.muted);
}

// ===== Desenho =====
function text(str, x, y, size, color, align, outline) {
  ctx.font = `${size || 8}px "Press Start 2P", monospace`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  if (outline !== false) {
    ctx.fillStyle = outline || '#000';
    for (const [dx, dy] of [[-0.7, 0], [0.7, 0], [0, -0.7], [0, 0.7], [0.7, 0.7]]) ctx.fillText(str, x + dx, y + dy);
  }
  ctx.fillStyle = color || '#fff';
  ctx.fillText(str, x, y);
}

function disc(cx, cy, r, col) {
  ctx.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1);
  }
}

// morro pixelado; "shape" < 1 deixa os lados mais retos (tipo Pão de Açúcar)
function hill(x, base, w, h, col, shape) {
  ctx.fillStyle = col;
  for (let i = 0; i < w; i += 2) {
    const t = (i / w) * 2 - 1;
    const hh = Math.round(h * Math.pow(Math.max(0, 1 - t * t), shape || 0.5));
    ctx.fillRect(Math.round(x + i), base - hh, 2, hh);
  }
}

function cloud(x, y, col) {
  disc(x + 8, y + 7, 6, col); disc(x + 18, y + 5, 8, col); disc(x + 29, y + 8, 5, col);
  ctx.fillRect(Math.round(x + 2), Math.round(y + 8), 32, 6);
}

function repeat(cx, factor, period, fn) {
  const off = cx * factor;
  for (let k = Math.floor(off / period) - 1; k * period - off < VW + period; k++) fn(Math.round(k * period - off), k);
}

function drawBackground(th, cx) {
  ctx.fillStyle = th.sky[0]; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = th.sky[1]; ctx.fillRect(0, Math.floor(VH * 0.32), VW, VH);
  ctx.fillStyle = th.sky[2]; ctx.fillRect(0, Math.floor(VH * 0.55), VW, VH);

  if (th.stars) {
    for (let i = 0; i < 50; i++) {
      const x = ((hash(i) * VW * 3 - cx * 0.03) % VW + VW) % VW;
      const y = hash(i + 99) * VH * 0.55;
      ctx.fillStyle = (frame + i * 7) % 90 < 8 ? '#556' : '#fff';
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    disc(VW - 46, 30, 11, '#f4f0d0'); disc(VW - 41, 27, 9, th.sky[0]);
  } else if (th.bg === 'rio') {
    disc(VW - 48, 32, 13, '#fff3a0'); disc(VW - 48, 32, 10, '#ffe14d');
  } else {
    disc(VW * 0.68, VH * 0.5, 22, '#ffd27a'); disc(VW * 0.68, VH * 0.5, 18, '#ffb347');
  }

  repeat(cx, 0.1, 150, (x, k) => cloud(x + hash(k) * 60, 14 + hash(k + 7) * 40, th.cloud));

  const gy = VH - 34;
  if (th.bg === 'rio') {
    repeat(cx, 0.22, 320, x => {
      hill(x + 10, gy, 70, 100, '#4a9f86', 0.3);        // Pão de Açúcar
      hill(x + 90, gy, 54, 62, '#4a9f86', 0.35);         // Morro da Urca
      ctx.fillStyle = '#2d5a4a';
      for (let i = 0; i < 50; i++) ctx.fillRect(x + 45 + i, gy - 100 + Math.round(i * 0.75), 1, 1); // bondinho
      ctx.fillRect(x + 66, gy - 86, 3, 3);
      hill(x + 170, gy, 110, 92, '#3f8f78', 0.6);        // Corcovado
      ctx.fillStyle = '#eef4f4';                        // Cristo Redentor
      ctx.fillRect(x + 224, gy - 104, 2, 13);
      ctx.fillRect(x + 219, gy - 100, 12, 2);
    });
    repeat(cx, 0.45, 200, (x, k) => {
      hill(x - 20, VH - 20, 140, 42, '#2f8f4a', 0.5);
      const px = x + 40 + hash(k) * 90;                   // coqueiro
      ctx.fillStyle = '#8a5a2a';
      for (let i = 0; i < 34; i++) ctx.fillRect(px + Math.round(Math.sin(i / 12) * 4), VH - 30 - i, 3, 1);
      ctx.fillStyle = '#1f7a2f';
      const tx = px + Math.round(Math.sin(34 / 12) * 4) + 1, ty = VH - 64;
      ctx.fillRect(tx - 12, ty, 25, 2); ctx.fillRect(tx - 9, ty - 3, 19, 3);
      ctx.fillRect(tx - 14, ty + 2, 4, 3); ctx.fillRect(tx + 10, ty + 2, 4, 3);
    });
  } else if (th.bg === 'bsb') {
    repeat(cx, 0.22, 380, x => {
      const c = '#9a4a34';
      ctx.fillStyle = c;
      ctx.fillRect(x + 20, gy - 6, 150, 6);                // plataforma do Congresso
      ctx.fillRect(x + 84, gy - 76, 8, 70);               // torres gêmeas
      ctx.fillRect(x + 96, gy - 76, 8, 70);
      ctx.fillRect(x + 84, gy - 52, 20, 3);
      for (let i = 0; i < 44; i += 2) {                    // Câmara (cúpula pra cima)
        const t = (i / 44) * 2 - 1;
        const h = 3 + Math.round(12 * t * t);
        ctx.fillRect(x + 32 + i, gy - 6 - h, 2, h);
      }
      for (let i = 0; i < 30; i += 2) {                    // Senado (cúpula pra baixo)
        const t = (i / 30) * 2 - 1;
        const h = Math.round(11 * Math.sqrt(1 - t * t));
        ctx.fillRect(x + 125 + i, gy - 6 - h, 2, h);
      }
    });
    repeat(cx, 0.45, 70, (x, k) => {                       // Esplanada dos Ministérios
      ctx.fillStyle = '#7a3424';
      const h = 34 + Math.round(hash(k) * 8);
      ctx.fillRect(x, VH - 26 - h, 30, h + 26);
      ctx.fillStyle = '#c2704a';
      for (let r = 0; r < h - 6; r += 5) ctx.fillRect(x + 3, VH - 22 - h + r, 24, 2);
    });
  } else {
    repeat(cx, 0.15, 40, (x, k) => {                       // cidade à noite
      const h = 30 + Math.round(hash(k) * 50);
      ctx.fillStyle = '#1e2552';
      ctx.fillRect(x, gy - h, 34, h + 40);
      ctx.fillStyle = '#f4d26a';
      for (let r = 6; r < h - 4; r += 7) for (let c = 4; c < 30; c += 7) {
        if (hash(k * 31 + r * 7 + c) > 0.55) ctx.fillRect(x + c, gy - h + r, 3, 3);
      }
    });
    repeat(cx, 0.4, 420, x => {
      ctx.fillStyle = '#2a3060';
      ctx.fillRect(x + 100, VH - 60, 170, 40);             // terminal
      ctx.fillStyle = '#7fd8ff';
      ctx.fillRect(x + 106, VH - 52, 158, 8);
      ctx.fillStyle = '#323a74';
      ctx.fillRect(x + 40, VH - 120, 12, 100);             // torre de controle
      ctx.fillRect(x + 32, VH - 136, 28, 16);
      ctx.fillStyle = '#9ff';
      ctx.fillRect(x + 35, VH - 132, 22, 6);
      ctx.fillStyle = frame % 60 < 30 ? '#ff3030' : '#601010';
      ctx.fillRect(x + 45, VH - 140, 3, 4);
    });
  }
}

function drawSprite(img, x, y, flip, flipY) {
  x = Math.round(x); y = Math.round(y);
  if (flip || flipY) {
    ctx.save();
    ctx.translate(x + (flip ? img.width : 0), y + (flipY ? img.height : 0));
    ctx.scale(flip ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  } else ctx.drawImage(img, x, y);
}

function drawCoin(x, y, t) {
  const w = Math.max(2, Math.round(8 * Math.abs(Math.cos(t))));
  const x0 = Math.round(x + 4 - w / 2);
  y = Math.round(y);
  ctx.fillStyle = '#9a5a00'; ctx.fillRect(x0, y + 1, w, 10); ctx.fillRect(x0 + 1, y, w - 2, 12);
  if (w > 2) {
    ctx.fillStyle = '#ffd030'; ctx.fillRect(x0 + 1, y + 1, w - 2, 10);
    if (w >= 6) { ctx.fillStyle = '#2f9e44'; ctx.fillRect(x0 + w / 2 - 1, y + 3, 2, 6); }
    ctx.fillStyle = '#fff6c0'; ctx.fillRect(x0 + 1, y + 2, 1, 4);
  }
}

function drawPassport(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#0e1640'; ctx.fillRect(x, y, 12, 14);
  ctx.fillStyle = '#1a2c74'; ctx.fillRect(x + 1, y + 1, 10, 12);
  disc(x + 6, y + 6, 2, '#e0b020');
  ctx.fillStyle = '#e0b020'; ctx.fillRect(x + 3, y + 10, 6, 1);
}

function drawPlane(x, y) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#c8ccd8';                        // cauda
  for (let i = 0; i < 14; i++) ctx.fillRect(x + i, y - 10 + Math.round(i * 0.9), 2, 18 - Math.round(i * 0.9));
  ctx.fillStyle = '#2f9e44'; ctx.fillRect(x + 2, y - 6, 6, 4);
  ctx.fillStyle = '#ffd800'; ctx.fillRect(x + 4, y - 5, 2, 2);
  ctx.fillStyle = '#f4f6fb'; ctx.fillRect(x + 4, y + 6, 82, 14);   // fuselagem
  ctx.fillRect(x + 86, y + 8, 4, 11); ctx.fillRect(x + 90, y + 11, 3, 7);
  ctx.fillStyle = '#1f4fbf'; ctx.fillRect(x + 88, y + 9, 3, 3);    // cabine
  ctx.fillStyle = '#2f9e44'; ctx.fillRect(x + 4, y + 16, 86, 2);
  ctx.fillStyle = '#ffd800'; ctx.fillRect(x + 4, y + 18, 86, 1);
  ctx.fillStyle = '#3a5fd0';
  for (let i = 32; i < 84; i += 6) ctx.fillRect(x + i, y + 9, 3, 3);
  ctx.fillStyle = '#5a6070'; ctx.fillRect(x + 20, y + 8, 7, 11);    // porta
  ctx.fillStyle = '#20242c'; ctx.fillRect(x + 21, y + 9, 5, 10);
  ctx.fillStyle = '#8a90a0'; ctx.fillRect(x + 38, y + 18, 26, 3);   // asa e turbina
  ctx.fillStyle = '#6a7080'; ctx.fillRect(x + 44, y + 20, 12, 5);
  ctx.fillStyle = '#111';
  ctx.fillRect(x + 16, y + 21, 4, 5); ctx.fillRect(x + 70, y + 21, 4, 5);
  text('FUGA AIR', x + 54, y + 13, 3, '#1f4fbf', 'center', false);
}

function drawFlag(f, cx) {
  const x = Math.round(f.x - cx), y = f.y;
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x, y - 52, 2, 52);
  disc(x + 1, y - 54, 2, '#ffd800');
  const fy = f.raised ? y - 50 : y - 14;
  ctx.fillStyle = '#2f9e44'; ctx.fillRect(x + 2, fy, 16, 11);
  ctx.fillStyle = '#ffd800';
  for (let i = 0; i < 5; i++) ctx.fillRect(x + 10 - i * 1.5, fy + 1 + i, i * 3 + 1, 1);
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 4 + i * 1.5, fy + 6 + i, 12 - i * 3, 1);
  disc(x + 10, fy + 5, 2, '#1f4fbf');
}

function drawSign(sx, cx) {
  const x = Math.round(sx - cx), y = 10 * TS;
  ctx.fillStyle = '#666'; ctx.fillRect(x + 6, y - 30, 3, 30); ctx.fillRect(x + 63, y - 30, 3, 30);
  ctx.fillStyle = '#1f4fbf'; ctx.fillRect(x, y - 44, 72, 18);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 1, y - 43, 70, 1);
  text('AEROPORTO', x + 36, y - 39, 5, '#fff', 'center', false);
  text('→ ✈', x + 36, y - 33, 5, '#ffd800', 'center', false);
}

function drawHeart(x, y, col) {
  const H = ['.rr.rr.', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
  ctx.fillStyle = col;
  for (let r = 0; r < H.length; r++) for (let c = 0; c < 7; c++) if (H[r][c] === 'r') ctx.fillRect(x + c, y + r, 1, 1);
}

function drawBubble(b, avoid) {
  const ent = b.who === 'lula' ? lula : b.who === 'flavio' ? player : b.ent;
  const cx = Math.round(cam.x);
  let ax = ent.x + ent.w / 2 - cx, ay = ent.y - 12;
  if (b.who === 'flavio' && player.hidden) { ax = L.plane.x + 60 - cx; ay = L.plane.y; }
  ctx.font = '6px "Press Start 2P", monospace';
  const tw = ctx.measureText(b.text).width;
  const bw = Math.ceil(tw + 8), bh = 13;
  const bx = Math.round(clamp(ax - bw / 2, 2, VW - bw - 2));
  let by = Math.round(clamp(ay - bh - 4, 18, VH - bh - 2));
  // se o outro balão está no mesmo lugar, sobe este
  if (avoid && bx < avoid.x + avoid.w && bx + bw > avoid.x && by < avoid.y + avoid.h + 6 && by + bh + 6 > avoid.y) {
    by = Math.max(18, avoid.y - bh - 8);
  }
  const tailX = Math.round(clamp(ax, bx + 4, bx + bw - 6));
  const border = { lula: '#d01c1c', flavio: '#1d2b53', militante: '#ff6a2a', pf: '#111111', cf: '#1f7a3a' }[b.who] || '#111';
  ctx.fillStyle = border;
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillRect(tailX - 1, by + bh, 5, 3); ctx.fillRect(tailX, by + bh + 3, 3, 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillRect(tailX, by + bh, 3, 2); ctx.fillRect(tailX + 1, by + bh + 2, 1, 2);
  text(b.text, bx + 4, by + 4, 6, '#111', 'left', false);
  return { x: bx, y: by, w: bw, h: bh };
}

function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = false;
  if (state === 'menu' || !L) { renderMenu(); return; }

  const th = L.theme, T = tileSet(th), cx = Math.round(cam.x);
  drawBackground(th, cx);

  // itens (atrás dos blocos para "nascerem" de dentro deles)
  for (const it of L.items) if (!it.gone) drawPassport(it.x - cx, it.y);

  // blocos
  const tx0 = Math.max(0, Math.floor(cx / TS)), tx1 = Math.min(L.w - 1, tx0 + Math.ceil(VW / TS) + 1);
  const qf = Math.floor(frame / 12) % 3;
  for (let ty = 0; ty < LH; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = L.tiles[ty * L.w + tx];
      if (!t) continue;
      const img = t === 4 ? T[4][qf] : T[t];
      const b = bumps.get(tx + ',' + ty);
      const off = b ? -Math.round(Math.sin((b / 8) * Math.PI) * 5) : 0;
      ctx.drawImage(img, tx * TS - cx, ty * TS + off);
    }
  }

  drawFlag(L.flag, cx);
  drawSign(L.signX, cx);
  // escada do avião (só enquanto está parado)
  if (L.plane.x === L.plane.x0) {
    const sx = L.plane.x - cx + 8;
    ctx.fillStyle = '#9aa0b0';
    for (let i = 0; i < 6; i++) ctx.fillRect(sx + i * 2, L.plane.y + 26 - i * 3, 14 - i * 2, 2);
  }
  drawPlane(L.plane.x - cx, L.plane.y);

  // moedas
  for (const c of L.coins) {
    if (c.taken || c.x < cx - 16 || c.x > cx + VW + 16) continue;
    drawCoin(c.x - cx, c.y, frame * 0.08 + c.x * 0.05);
  }

  // inimigos
  for (const e of L.enemies) {
    if (e.gone || (!e.active && e.x > cx + VW + 24)) continue;
    const fr = Math.floor(e.anim) % 2;
    if (e.type === 'paper') {
      const img = Sprites.paper(fr);
      if (e.dead && !e.flip) ctx.drawImage(img, 0, 0, 16, 16, Math.round(e.x - 2 - cx), Math.round(e.y + e.h - 6), 16, 6);
      else drawSprite(img, e.x - 2 - cx, e.y + e.h - 16, e.dir > 0, e.dead);
    } else if (e.type === 'book') {
      const bx = Math.round(e.x - 1 - cx), by = Math.round(e.y);
      if (!e.dead) {
        const up = fr ? -3 : 1;
        ctx.fillStyle = '#f4f1e4';
        ctx.fillRect(bx - 5, by + 4 + up, 5, 3); ctx.fillRect(bx - 3, by + 3 + up, 3, 1);
        ctx.fillRect(bx + 16, by + 4 + up, 5, 3); ctx.fillRect(bx + 16, by + 3 + up, 3, 1);
      }
      drawSprite(Sprites.book(), bx, by, false, e.dead);
    } else {
      const sx = e.x - 2 - cx, sy = e.y + e.h - 28;
      const fr2 = !e.onGround ? 'jump' : fr ? 'run1' : 'run2';
      if (e.type === 'militante') {
        drawSprite(Sprites.militante(fr2), sx, sy, e.dir < 0, e.dead);
        if (!e.dead) {
          // bandeira vermelha com estrela
          const px = Math.round(e.dir < 0 ? sx + 2 : sx + 13), py = Math.round(sy + 2);
          const wave = Math.floor(frame / 8) % 2;
          ctx.fillStyle = '#6a4a2a'; ctx.fillRect(px, py, 1, 18);
          const fx = e.dir < 0 ? px - 9 : px + 1;
          ctx.fillStyle = '#e02020'; ctx.fillRect(fx, py + wave, 9, 6);
          ctx.fillStyle = '#fff'; ctx.fillRect(fx + 4, py + 1 + wave, 1, 4); ctx.fillRect(fx + 3, py + 2 + wave, 3, 1);
        }
      } else {
        drawSprite(Sprites.agent(fr ? 'run1' : 'run2'), sx, sy, e.dir < 0, e.dead);
      }
    }
  }

  // Lula
  const lf = lula.running && lula.wait <= 0 ? (Math.floor(lula.anim) % 2 ? 'run1' : 'run2') : 'idle';
  drawSprite(Sprites.lula(lf), lula.x - 2 - cx, lula.y + lula.h - 28, lula.facing < 0);

  // Flávio
  const p = player;
  if (!p.hidden && !(p.invuln > 0 && (p.invuln >> 2) % 2)) {
    let fr = 'idle';
    if (state === 'dying' || !p.onGround) fr = 'jump';
    else if (Math.abs(p.vx) > 0.2) fr = Math.floor(p.anim) % 2 ? 'run1' : 'run2';
    if (p.shield) {
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(frame * 0.2);
      disc(p.x + p.w / 2 - cx, p.y + p.h / 2, 15, '#7fd8ff');
      ctx.globalAlpha = 1;
    }
    drawSprite(Sprites.flavio(currentSkin(), fr), p.x - 3 - cx, p.y + p.h - 28, p.facing < 0);
  }

  // partículas
  for (const q of parts) {
    if (q.type === 'coin') drawCoin(q.x - cx, q.y, frame * 0.4);
    else if (q.type === 'brick') { ctx.fillStyle = '#c4501a'; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y), 5, 5); }
    else if (q.type === 'spark') { ctx.fillStyle = '#bff0ff'; ctx.fillRect(Math.round(q.x - cx), Math.round(q.y), 1, 1); }
    else if (q.type === 'text') text(q.text, q.x - cx, q.y, 5, '#fff');
  }

  let prev = null;
  for (const b of bubbles) prev = drawBubble(b, prev);
  drawHUD();
}

function drawHUD() {
  for (let i = 0; i < 3; i++) drawHeart(6 + i * 9, 6, i < lives ? '#ff3040' : '#44222a');
  drawCoin(5, 16, frame * 0.08);
  text('$' + save.coins, 16, 18, 6, '#ffe14d');
  if (player.shield) { drawPassport(36, 4); }

  // barra de progresso até o avião: Flávio (azul) x Lula (vermelho)
  const bw = Math.min(120, VW - 150), bx = Math.round(VW / 2 - bw / 2), by = 8;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 7);
  ctx.fillStyle = '#ffffff55'; ctx.fillRect(bx, by + 1, bw, 1);
  const total = L.plane.x0 + 22;
  const px = bx + clamp(player.x / total, 0, 1) * bw, lx = bx + clamp(lula.x / total, 0, 1) * bw;
  ctx.fillStyle = '#d01c1c'; ctx.fillRect(Math.round(lx) - 1, by - 1, 3, 5);
  ctx.fillStyle = '#7fd8ff'; ctx.fillRect(Math.round(px) - 1, by - 1, 3, 5);
  text('✈', bx + bw + 4, by - 2, 7, '#fff', 'left', false);

  // aviso do Lula fora da tela
  const lsx = lula.x - cam.x;
  if (lsx + lula.w < 0 && state === 'play') {
    const d = player.x - lula.x;
    if (d < 200 || frame % 40 < 30) {
      text('◀ LULA!', 4, 30, 6, d < 150 && frame % 10 < 5 ? '#ffe14d' : '#ff4040');
    }
  }
  if (banner > 0) {
    const a = Math.min(1, banner / 30);
    ctx.globalAlpha = a;
    text('FASE ' + (L.n + 1), VW / 2, VH / 2 - 30, 12, '#ffe14d', 'center');
    text(L.theme.name.toUpperCase(), VW / 2, VH / 2 - 12, 8, '#fff', 'center');
    text('Fuja do Lula e chegue ao avião!', VW / 2, VH / 2 + 4, 5, '#fff', 'center');
    ctx.globalAlpha = 1;
  }
}

function renderMenu() {
  const th = THEMES[0], T = tileSet(th);
  drawBackground(th, menuCam);
  const gy = 10 * TS, off = Math.round(menuCam % 16);
  for (let x = -off; x < VW; x += 16) { ctx.drawImage(T[1], x, gy); ctx.drawImage(T[2], x, gy + 16); }
  const fr = Math.floor(frame / 6) % 2 ? 'run1' : 'run2';
  const fx = Math.round(VW * 0.72);
  drawSprite(Sprites.flavio(currentSkin(), fr), fx, gy - 28, false);
  drawSprite(Sprites.lula(fr), fx - 64 + Math.round(Math.sin(frame / 50) * 14), gy - 28, false);
}

// ===== Telas (HTML) =====
function showScreen(id) {
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('show', s.id === id);
  updateTouch();
}

function showDialog(title, html, buttons) {
  if (state === 'play' || state === 'dying' || state === 'boarding') state = 'dialog';
  $('dlg-title').textContent = title;
  $('dlg-text').innerHTML = html;
  const box = $('dlg-buttons');
  box.innerHTML = '';
  for (const b of buttons) {
    const el = document.createElement('button');
    el.className = 'btn' + (b.primary ? ' primary' : '');
    el.textContent = b.label;
    el.onclick = () => { Sfx.init(); Sfx.play('select'); b.fn(); };
    box.appendChild(el);
  }
  showScreen('screen-dialog');
}

function toMenu() {
  Sfx.stopMusic(); Sfx.setDanger(false); Voice.stop();
  persist();
  state = 'menu'; L = null;
  refreshMenu();
  showScreen('screen-menu');
}

function refreshMenu() {
  $('wallet').textContent = save.coins;
  const pv = $('menu-preview').getContext('2d');
  pv.clearRect(0, 0, 16, 28);
  pv.drawImage(Sprites.flavio(currentSkin(), 'idle'), 0, 0);
  const row = $('level-row');
  row.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button');
    b.className = 'btn small';
    const locked = i + 1 > save.unlocked;
    b.textContent = locked ? '🔒' : 'FASE ' + (i + 1);
    b.disabled = locked;
    b.title = THEMES[i].name;
    b.onclick = () => { Sfx.init(); Sfx.play('select'); startGame(i); };
    row.appendChild(b);
  }
}

function openSkins() {
  state = 'menu'; L = null;
  Sfx.stopMusic();
  renderSkins();
  showScreen('screen-skins');
}

function renderSkins() {
  $('wallet2').textContent = save.coins;
  const grid = $('skin-grid');
  grid.innerHTML = '';
  for (const skin of SKINS) {
    const owned = save.owned.includes(skin.id), wearing = save.skin === skin.id;
    const card = document.createElement('div');
    card.className = 'skin-card' + (wearing ? ' wearing' : '');
    const c = document.createElement('canvas');
    c.width = 16; c.height = 28;
    c.getContext('2d').drawImage(Sprites.flavio(skin, 'idle'), 0, 0);
    const name = document.createElement('div');
    name.className = 'skin-name';
    name.textContent = skin.name;
    const btn = document.createElement('button');
    btn.className = 'btn small' + (wearing ? '' : owned ? ' primary' : '');
    if (wearing) { btn.textContent = 'VESTINDO'; btn.disabled = true; }
    else if (owned) {
      btn.textContent = 'VESTIR';
      btn.onclick = () => { save.skin = skin.id; persist(); Sfx.play('select'); renderSkins(); };
    } else {
      btn.textContent = '$ ' + skin.price;
      btn.disabled = save.coins < skin.price;
      btn.onclick = () => {
        if (save.coins < skin.price) return;
        save.coins -= skin.price;
        save.owned.push(skin.id);
        save.skin = skin.id;
        persist();
        Sfx.play('power');
        renderSkins();
      };
    }
    card.append(c, name, btn);
    grid.appendChild(card);
  }
}

// ----- Tela de sons: gravar a própria voz ou escolher arquivo para cada fala -----
let rec = null, recId = null, fileTarget = null;

function openSounds() { renderSounds(); showScreen('screen-sounds'); }

function blobToData(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
}

function storeVoice(id, data) {
  if (!Voice.setCustom(id, data)) alert('Sem espaço para salvar esse áudio. Apague alguma gravação ou use um áudio mais curto.');
  renderSounds();
}

async function toggleRecord(id) {
  Sfx.init();
  if (rec) { if (rec.state !== 'inactive') rec.stop(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) { alert('Seu navegador não permite gravar áudio. Use a opção ARQUIVO.'); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    const chunks = [];
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      rec = null; recId = null;
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      storeVoice(id, await blobToData(blob));
    };
    mr.start();
    rec = mr; recId = id;
    renderSounds();
    setTimeout(() => { if (rec === mr && mr.state !== 'inactive') mr.stop(); }, 4000);
  } catch (e) {
    alert('Não consegui acessar o microfone. Verifique a permissão do navegador (precisa ser https).');
  }
}

function renderSounds() {
  const list = $('sound-list');
  list.innerHTML = '';
  for (const [id, line] of Object.entries(Voice.LINES)) {
    const row = document.createElement('div');
    row.className = 'sound-row ' + line.who;
    const has = !!Voice.custom(id);
    const label = document.createElement('div');
    label.className = 'sound-label';
    label.innerHTML = `<b>${Voice.WHO[line.who]}</b> "${line.text}"` +
      `<small>${has ? '● gravação deste aparelho' : Voice.hasFile(id) ? '● áudio da pasta vozes/' : 'voz do celular'}</small>`;
    const btns = document.createElement('div');
    btns.className = 'sound-btns';
    const mk = (txt, fn, cls) => {
      const b = document.createElement('button');
      b.className = 'btn tiny' + (cls ? ' ' + cls : '');
      b.textContent = txt; b.onclick = fn;
      btns.appendChild(b);
      return b;
    };
    mk('▶', () => { Sfx.init(); Voice.play(id, { force: true }); });
    mk(recId === id ? '■ PARAR' : '● GRAVAR', () => toggleRecord(id), recId === id ? 'rec' : '');
    mk('ARQUIVO', () => { fileTarget = id; $('file-input').click(); });
    if (has) mk('✕', () => { Voice.clearCustom(id); renderSounds(); });
    row.append(label, btns);
    list.appendChild(row);
  }
}

$('file-input').addEventListener('change', async e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f || !fileTarget) return;
  if (f.size > 1.5 * 1024 * 1024) { alert('Arquivo muito grande. Use um áudio curto (até ~1,5 MB).'); return; }
  storeVoice(fileTarget, await blobToData(f));
});

// ===== Botões =====
$('btn-play').onclick = () => { Sfx.init(); Sfx.play('select'); startGame(0); };
$('btn-skins').onclick = () => { Sfx.init(); Sfx.play('select'); openSkins(); };
$('btn-sounds').onclick = () => { Sfx.init(); Sfx.play('select'); openSounds(); };
for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { Sfx.play('select'); if (rec) rec.stop(); toMenu(); };
$('btn-pause').onclick = () => { Sfx.init(); togglePause(); };
$('btn-mute').onclick = () => { Sfx.init(); toggleMute(); };
$('btn-mute').textContent = save.muted ? '✕' : '♪';
$('btn-mute').classList.toggle('off', save.muted);
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

// ===== Tela / loop =====
function resize() {
  const w = innerWidth, h = innerHeight;
  VW = Math.round(clamp(VH * (w / h), 256, 420));
  const s = Math.min(w / VW, h / VH);
  SCALE = Math.max(1, Math.ceil(s * (devicePixelRatio || 1)));
  cv.width = VW * SCALE; cv.height = VH * SCALE;
  cv.style.width = Math.floor(VW * s) + 'px';
  cv.style.height = Math.floor(VH * s) + 'px';
  if (L) cam.x = clamp(cam.x, 0, L.w * TS - VW);
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 200));

let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}

// Ganchos de teste: abra index.html?debug
if (/debug/.test(location.search)) {
  window.__dbg = {
    get state() { return state; }, get player() { return player; }, get L() { return L; },
    get lives() { return lives; }, get bubbles() { return bubbles; }, startGame, genLevel, say,
    toPlane() { player.x = L.plane.x - 30; player.y = 10 * TS - 30; lula.x = player.x - 200; },
    god() { player.invuln = 1e9; },
  };
}

resize();
bindTouch();
refreshMenu();
updateTouch();
requestAnimationFrame(loop);
if (document.fonts) document.fonts.ready.then(refreshMenu);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
