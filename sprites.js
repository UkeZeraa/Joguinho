'use strict';
// ===== Pixel art dos personagens =====
// Cada string é uma linha de 16 pixels; cada letra é uma cor da paleta ('.' = transparente).

const PX = rows => rows.map(r => (r + '................').slice(0, 16));

// ---------- Flávio ----------
const FLAVIO_HEAD = PX([
  '....hhhhhhh.....',
  '...hhhhhhhhhh...',
  '..hhhhhhhhhhh...',
  '..hhhsssssssh...',
  '..hhssesssess...',
  '..hsssssssssss..',
  '...sssssssssss..',
  '...ssssskkkss...',
  '....sssssssss...',
  '......ssss......',
]);

// Tronco segurando o passaporte (P) na mão
const TORSO = PX([
  '....jjwwtwwjj...',
  '...jjjjwtwjjjj..',
  '...jjjjjtjjjjj..',
  '...jjjjjtjjjjj..',
  '...jjjjjjjjjjjPP',
  '...sjjjjjjjjjsP.',
]);

// Tronco do pulo: o braço da frente vai pra cima (pixels extras em JUMP_ARM)
const TORSO_JUMP = PX([
  '....jjwwtwwjjj..',
  '...jjjjwtwjjjj..',
  '...jjjjjtjjjjj..',
  '...jjjjjtjjjjj..',
  '...jjjjjjjjjjj..',
  '...sjjjjjjjjjj..',
]);
const JUMP_ARM = [[14, 9, 'j'], [14, 8, 'j'], [14, 7, 'j'], [14, 6, 's'],
  [14, 4, 'P'], [15, 4, 'P'], [14, 5, 'P'], [15, 5, 'P']];

const LEGS_IDLE = PX([
  '.....pppppppp...',
  '.....pppppppp...',
  '.....ppp..ppp...',
  '.....ppp..ppp...',
  '.....ppp..ppp...',
  '.....ppp..ppp...',
  '.....bbb..bbbb..',
  '....bbbb..bbbbb.',
]);
const LEGS_RUN1 = PX([
  '.....pppppppp...',
  '....pppppppppp..',
  '...pppp...pppp..',
  '..ppp......ppp..',
  '..pp.......ppp..',
  '.ppp.......ppp..',
  '.bb........bbbb.',
  'bbb........bbbbb',
]);
const LEGS_RUN2 = PX([
  '.....pppppppp...',
  '.....pppppppp...',
  '......pppppp....',
  '......ppppp.....',
  '.......pppp.....',
  '.......ppp......',
  '......bbbbb.....',
  '......bbbbbb....',
]);
const LEGS_JUMP = PX([
  '.....pppppppp...',
  '....pppppppppp..',
  '...ppp....pppp..',
  '..ppp......ppp..',
  '..bbb......ppp..',
  '..bb.......ppp..',
  '...........bbbb.',
  '...........bbbbb',
]);

const FRAMES = {
  idle: { torso: TORSO, legs: LEGS_IDLE },
  run1: { torso: TORSO, legs: LEGS_RUN1 },
  run2: { torso: TORSO, legs: LEGS_RUN2 },
  jump: { torso: TORSO_JUMP, legs: LEGS_JUMP, extra: JUMP_ARM },
};

const FLAVIO_BASE = { s: '#f1b089', e: '#111111', k: '#7a2d1a', h: '#2b1d12', P: '#1a2c74' };

// ---------- Lula ----------
const LULA_HEAD = PX([
  '....hhhhhhh.....',
  '...hhhhhhhhhh...',
  '..hhsssssssss...',
  '..hsKKKsKKKss...',
  '..hssesssesss...',
  '..Bssssssssss...',
  '..BBsssssssss...',
  '..BBBBkkkkBBB...',
  '...BBBBBBBBBB...',
  '....BBBBBBBB....',
]);
// Braço esticado pra frente tentando agarrar
const LULA_TORSO = PX([
  '....rrrrrrrrr...',
  '...rrrrrrrrrrrrs',
  '...rrrrrrwrrr...',
  '...rrrrrwwwrr...',
  '...rrrrrrwrrr...',
  '...srrrrrrrrr...',
]);
const LULA_PAL = { h: '#dcdcdc', B: '#c4c4c4', K: '#555555', s: '#e0a07a', e: '#111111',
  k: '#6b2a1a', r: '#d01c1c', w: '#ffffff', p: '#3a3a4a', b: '#222222' };

// ---------- Agente da PF ----------
const AGENT_HEAD = PX([
  '....kkkkkkk.....',
  '...kkkkkkkkkk...',
  '..yyyyyyyyyyyy..',
  '...ssssssssss...',
  '...sKKKKsKKKs...',
  '...ssssssssss...',
  '...sssssssssss..',
  '...sssssskkss...',
  '....sssssssss...',
  '......ssss......',
]);
const AGENT_TORSO = PX([
  '....kkkkkkkkk...',
  '...kkyykyykkkk..',
  '...kkyykykkkkk..',
  '...kkykkyykkkk..',
  '...kkykkykkkkk..',
  '...skkkkkkkkks..',
]);
const AGENT_PAL = { k: '#1c1c22', y: '#f2c200', s: '#c98a62', K: '#050505', p: '#222c3a', b: '#000000' };

// ---------- Intimação (papel que anda) ----------
const PAPER_TOP = PX([
  '...wwwwwwwww....',
  '...wkkkkkwwww...',
  '...wwwwwwwwwww..',
  '...wkkkkkkkkww..',
  '...wwwwwwwwwww..',
  '...wKKwwwwKKww..',
  '...wwkwwwwkwww..',
  '...wwwwwwwwwww..',
  '...wwwKKKKwwww..',
  '...wwwwwwwwwww..',
  '...wwrrrrrrwww..',
  '...wwrwwwwrwww..',
  '...wwrrrrrrwww..',
]);
const PAPER_LEGS = [
  PX(['....KK....KK....', '...KK......KK...', '..KKK.....KKK...']),
  PX(['.....KK..KK.....', '.....KK..KK.....', '....KKK..KKK....']),
];
const PAPER_PAL = { w: '#f4f1e4', k: '#8a8a8a', K: '#111111', r: '#d02020' };

// ---------- Chapéus (desenhados nas 6 primeiras linhas do sprite 16x28) ----------
const HATS = {
  palha: { pal: { y: '#e8c35a', r: '#c0392b', d: '#b08a2a' }, rows: PX([
    '................',
    '.....yyyyyy.....',
    '....yyyyyyyy....',
    '....rrrrrrrr....',
    '..yyyyyyyyyyyy..',
    '..dyyyyyyyyyyd..',
  ]) },
  fedora: { pal: { f: '#5a3b1e', k: '#1a1a1a' }, rows: PX([
    '................',
    '................',
    '.....ffffff.....',
    '....ffffffff....',
    '....kkkkkkkk....',
    '..ffffffffffff..',
  ]) },
  cartola: { pal: { k: '#151515', y: '#e0b020' }, rows: PX([
    '....kkkkkkk.....',
    '....kkkkkkk.....',
    '....kkkkkkk.....',
    '....kkkkkkk.....',
    '....yyyyyyy.....',
    '..kkkkkkkkkkk...',
  ]) },
  touca: { pal: { b: '#3a5fd0', w: '#ffffff' }, rows: PX([
    '................',
    '................',
    'w...bbbbbb......',
    '.bbbbbbbbbb.....',
    '..bbbbbbbbbbb...',
    '..wwwwwwwwwwww..',
  ]) },
  bone: { pal: { g: '#119944', y: '#ffd800' }, rows: PX([
    '................',
    '................',
    '....gggggggg....',
    '...gggyyyyggg...',
    '...gggggggggggg.',
    '..........ggggg.',
  ]) },
};

// ---------- Skins ----------
// c = cores (j paletó/camisa, t gravata, w gola, p calça, b sapato)
// pattern = estampa opcional; hat/glasses/bigode = acessórios
const SKINS = [
  { id: 'terno', name: 'Terno Clássico', price: 0,
    c: { j: '#1d2b53', t: '#d42020', w: '#ffffff', p: '#1d2b53', b: '#111111' } },
  { id: 'selecao', name: 'Camisa da Seleção', price: 0,
    c: { j: '#ffd800', t: '#ffd800', w: '#119944', p: '#1f4fbf', b: '#ffffff' }, hat: 'bone' },
  { id: 'miami', name: 'Turista em Miami', price: 25,
    c: { j: '#ff5fa2', t: '#ff5fa2', w: '#ffe14d', p: '#d8c08a', b: '#8b5a2b' },
    pattern: { keys: 'j', color: '#ffe14d', fn: (x, y) => (x * 3 + y * 2) % 5 === 0 },
    hat: 'palha', glasses: '#111111' },
  { id: 'disfarce', name: 'Disfarce Total', price: 40,
    c: { j: '#b5945b', t: '#7a5c2e', w: '#e8d9b0', p: '#5a4630', b: '#2a1a0a' },
    hat: 'fedora', glasses: '#111111', bigode: true },
  { id: 'pijama', name: 'Pijama de Fuga', price: 50,
    c: { j: '#8fc8ff', t: '#8fc8ff', w: '#ffffff', p: '#8fc8ff', b: '#ffffff' },
    pattern: { keys: 'jp', color: '#ffffff', fn: x => x % 3 === 0 }, hat: 'touca' },
  { id: 'agente', name: 'Agente Secreto', price: 60,
    c: { j: '#111111', t: '#111111', w: '#ffffff', p: '#111111', b: '#000000' }, glasses: '#050505' },
  { id: 'listrado', name: 'Uniforme Listrado', price: 80,
    c: { j: '#f0f0f0', t: '#f0f0f0', w: '#f0f0f0', p: '#f0f0f0', b: '#222222' },
    pattern: { keys: 'jtwp', color: '#222222', fn: (x, y) => y % 2 === 0 } },
  { id: 'ouro', name: 'Smoking de Ouro', price: 120,
    c: { j: '#e0b020', t: '#111111', w: '#ffffff', p: '#111111', b: '#111111' },
    hat: 'cartola', glasses: '#e0b020' },
];

const Sprites = (() => {
  const cache = new Map();
  const get = (key, build) => {
    let c = cache.get(key);
    if (!c) { c = build(); cache.set(key, c); }
    return c;
  };
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  function drawMap(g, rows, pal, ox, oy, pattern) {
    for (let y = 0; y < rows.length; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        let col = pal[ch];
        if (!col) continue;
        if (pattern && pattern.keys.includes(ch) && pattern.fn(x, y + oy)) col = pattern.color;
        g.fillStyle = col;
        g.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }

  // Sprites humanos têm 16x28: 4 linhas livres em cima para chapéus
  function buildHuman(head, torso, legs, pal, extra, pattern) {
    const c = canvas(16, 28), g = c.getContext('2d');
    drawMap(g, head, pal, 0, 4, pattern);
    drawMap(g, torso, pal, 0, 14, pattern);
    drawMap(g, legs, pal, 0, 20, pattern);
    if (extra) for (const [x, y, ch] of extra) { g.fillStyle = pal[ch]; g.fillRect(x, y + 4, 1, 1); }
    return { c, g };
  }

  function buildFlavio(skin, frame) {
    const pal = Object.assign({}, FLAVIO_BASE, skin.c);
    const f = FRAMES[frame] || FRAMES.idle;
    const { c, g } = buildHuman(FLAVIO_HEAD, f.torso, f.legs, pal, f.extra, skin.pattern);
    if (skin.glasses) {
      g.fillStyle = skin.glasses;
      g.fillRect(5, 8, 3, 2); g.fillRect(9, 8, 3, 2); g.fillRect(8, 8, 1, 1);
    }
    if (skin.bigode) { g.fillStyle = pal.h; g.fillRect(7, 10, 5, 1); }
    if (skin.hat) { const hat = HATS[skin.hat]; drawMap(g, hat.rows, hat.pal, 0, 0); }
    return c;
  }

  const legsFor = frame => ({ run1: LEGS_RUN1, run2: LEGS_RUN2, jump: LEGS_JUMP }[frame] || LEGS_IDLE);

  function buildPaper(i) {
    const c = canvas(16, 16), g = c.getContext('2d');
    drawMap(g, PAPER_TOP, PAPER_PAL, 0, 0);
    drawMap(g, PAPER_LEGS[i % 2], PAPER_PAL, 0, 13);
    return c;
  }

  return {
    flavio: (skin, frame) => get('f_' + skin.id + '_' + frame, () => buildFlavio(skin, frame)),
    lula: frame => get('l_' + frame, () => buildHuman(LULA_HEAD, LULA_TORSO, legsFor(frame), LULA_PAL).c),
    agent: frame => get('a_' + frame, () => buildHuman(AGENT_HEAD, AGENT_TORSO, legsFor(frame), AGENT_PAL).c),
    paper: i => get('p_' + (i % 2), () => buildPaper(i)),
  };
})();
