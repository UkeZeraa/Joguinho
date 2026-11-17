// Áudio do jogo.
//  1) Clipes de voz/ruídos gerados com o Fish Audio (pasta zumbi/audio/, veja tools/gerar-audio-fish.mjs).
//     Se os arquivos não existirem, o jogo usa os sons sintetizados abaixo (Web Audio) e nada quebra.
//  2) Ambientação procedural por zona (vento, zumbido elétrico, batimento do ninho, tempestade...).
let ctx = null, master = null, ruido = null, sfx = null, vozBus = null, ambBus = null;
let ligado = true;

// ---------------------------------------------------------------- catálogo (fonte única para o jogo e para o gerador)
// Os textos entre parênteses são marcas de emoção/efeito do Fish Audio (ex.: (groaning), (screaming), (whispering)).
export const CATEGORIAS = {
  zumbi_gemido: { voz: 'zumbi', textos: ['(groaning) Uuuuhhhhh...', '(groaning) Aaaarrrghh...', '(groaning) Hhhhnnnngh...', '(groaning) Uuurrrrgh... aaahh...', '(groaning) Mmmmaaahhhh...', '(groaning) Hhhaaaagh... uuhhh...'] },
  zumbi_ataque: { voz: 'zumbi', textos: ['(screaming) Aaaaargh!', '(screaming) Grrraaaah!', '(shouting) Raaaaargh!'] },
  zumbi_morte: { voz: 'zumbi', textos: ['(groaning) Uhhh...', '(sighing) Aaahh...', '(groaning) Hhhk... ahh.'] },
  corredor_grito: { voz: 'zumbi', textos: ['(screaming) Aaaaaaaaah!', '(screaming) Iiiiiaaaaah!'] },
  gritador: { voz: 'zumbi', textos: ['(screaming) AAAAAAAAAAAHHH!', '(screaming) IIIIIIIAAAAAAAHH!'] },
  chefe_acougueiro: { voz: 'chefe', textos: ['(angry) Carne fresca! Hahaha... carne fresca!', '(angry) Vou te picar em mil pedaços!'] },
  chefe_abominacao: { voz: 'chefe', textos: ['(angry) Grrraaaahhh! Eu... fome... fome!', '(screaming) RAAAAAAARGH!'] },
  chefe_colosso: { voz: 'chefe', textos: ['(angry) Nenhuma bala... vai me parar.', '(shouting) RAAAAAAAAAH!'] },
  chefe_rainha: { voz: 'rainha', textos: ['(whispering) Filhos... tragam ele... para mim.', '(angry) Você invadiu a minha casa!', '(whispering) Venha... venha para o ninho...'] },
  jogador_dor: { voz: 'soldado', textos: ['(groaning) Argh!', '(shouting) Aaargh!', '(gasping) Hhh! Ah!', '(groaning) Ugh... droga!'] },
  jogador_respira: { voz: 'soldado', textos: ['(panting) Hhh... hhh... hhh... hhh...', '(panting) Ah... ah... ah... hhh...'] },
  jogador_morte: { voz: 'soldado', textos: ['(groaning) Não... agora não... aaargh...', '(sobbing) Eu não consegui...'] },
  amb_suburbio: { voz: 'ambiente', textos: ['(whispering) Mamãe... cadê você?', '(sobbing) Por favor... alguém... me ajuda...', '(sad) Ele não voltou pra casa...'] },
  amb_centro: { voz: 'ambiente', textos: ['(shouting) Tem alguém na avenida! Corram!', '(scared) Não olhem para trás! Não olhem!', '(shouting) O banco está em chamas!'] },
  amb_lab: { voz: 'radio', textos: ['(calm) Atenção. Protocolo de quarentena ativado. Todos os setores estão selados.', '(calm) Falha de contenção no setor C. Evacuem imediatamente.', '(calm) Aviso. Os níveis de toxina estão acima do limite.'] },
  amb_base: { voz: 'radio', textos: ['(tired) Aqui é a torre. Perdemos o contato com o portão sul. Repito, perdemos o portão.', '(shouting) Qualquer unidade! Precisamos de apoio no hangar!', '(calm) Estática... estática... alguém na escuta?'] },
  amb_ninho: { voz: 'rainha', textos: ['(whispering) Venha... venha para casa...', '(whispering) Ela está acordada... ela vê você...', '(whispering) Mais um... para a ninhada...'] },
};
// Falas do rádio / do soldado. O texto também aparece no HUD, mesmo sem o arquivo de áudio.
export const FALAS = {
  inicio_suburbio: { voz: 'radio', quem: 'Rádio', tag: '(calm)', txt: 'Equipe, aqui é o resgate. O bairro foi tomado. Religuem os geradores e abram o abrigo.' },
  inicio_centro: { voz: 'radio', quem: 'Rádio', tag: '(calm)', txt: 'Centro em chamas. Fechem as válvulas de gás para apagar o fogo e alcancem o cofre do banco.' },
  inicio_lab: { voz: 'radio', quem: 'Rádio', tag: '(calm)', txt: 'Vocês estão dentro do X-13. Hackeiem os terminais para abrir a sala de armas. Cuidado com o escuro.' },
  inicio_base: { voz: 'radio', quem: 'Rádio', tag: '(tired)', txt: 'A base caiu. Sintonizem os rádios de comando e abram o paiol. O Colosso ainda patrulha o pátio.' },
  inicio_ninho: { voz: 'radio', quem: 'Rádio', tag: '(worried)', txt: 'Esse é o ninho. Queimem os casulos, destruam os ovos antes que eclodam. Boa sorte.' },
  onda: { voz: 'radio', quem: 'Rádio', tag: '(in a hurry tone)', txt: 'Contato! Horda se aproximando!' },
  onda_final: { voz: 'radio', quem: 'Rádio', tag: '(worried)', txt: 'Essa é a última onda. Aguentem firme!' },
  extracao: { voz: 'radio', quem: 'Rádio', tag: '(excited)', txt: 'Helicóptero a caminho! Vão para o ponto de extração!' },
  evento_horda: { voz: 'radio', quem: 'Rádio', tag: '(shouting)', txt: 'Sirene tocando! É uma horda, uma horda enorme!' },
  evento_apagao: { voz: 'radio', quem: 'Rádio', tag: '(worried)', txt: 'Perdemos a energia! Fiquem atentos aos olhos no escuro.' },
  evento_esporos: { voz: 'radio', quem: 'Rádio', tag: '(worried)', txt: 'Nuvens de esporos! Não fiquem parados no gás!' },
  evento_bombardeio: { voz: 'radio', quem: 'Rádio', tag: '(shouting)', txt: 'Artilharia a caminho! Saiam dos círculos vermelhos!' },
  objetivo_ok: { voz: 'radio', quem: 'Rádio', tag: '(excited)', txt: 'Ótimo trabalho! Mais um objetivo concluído.' },
  cofre_liberado: { voz: 'radio', quem: 'Rádio', tag: '(excited)', txt: 'Objetivo cumprido! O cofre foi liberado. Peguem o que for valioso!' },
  suprimento: { voz: 'radio', quem: 'Rádio', tag: '(calm)', txt: 'Suprimento lançado. Siga o sinal vermelho.' },
  chefe: { voz: 'radio', quem: 'Rádio', tag: '(scared)', txt: 'Isso é enorme! Cuidado com esse aí!' },
  vida_baixa: { voz: 'soldado', quem: 'Você', tag: '(panting)', txt: 'Estou ferido... preciso de um kit médico!' },
  sem_municao: { voz: 'soldado', quem: 'Você', tag: '(worried)', txt: 'Droga! Estou sem munição!' },
  granada: { voz: 'soldado', quem: 'Você', tag: '(shouting)', txt: 'Granada!' },
  recarregando: { voz: 'soldado', quem: 'Você', tag: '(in a hurry tone)', txt: 'Recarregando!' },
  achei_arma: { voz: 'soldado', quem: 'Você', tag: '(excited)', txt: 'Isso aqui vai ajudar!' },
  chefe_morto: { voz: 'soldado', quem: 'Você', tag: '(relaxed)', txt: 'Um a menos... vamos embora daqui.' },
};

// ---------------------------------------------------------------- clipes (Fish Audio)
const clips = {};          // categoria -> [AudioBuffer]
const falasBuf = {};       // id -> AudioBuffer
let manifestoLido = false;
export async function carregarClips() {
  if (manifestoLido || !ctx) return;
  manifestoLido = true;
  try {
    const r = await fetch('audio/manifest.json', { cache: 'no-cache' });
    if (!r.ok) return;
    const m = await r.json();
    const baixar = async arq => {
      try { const b = await (await fetch('audio/' + arq)).arrayBuffer(); return await ctx.decodeAudioData(b); } catch (e) { return null; }
    };
    for (const [cat, lista] of Object.entries(m.categorias || {})) {
      const bufs = (await Promise.all(lista.map(baixar))).filter(Boolean);
      if (bufs.length) clips[cat] = bufs;
    }
    for (const [id, arq] of Object.entries(m.falas || {})) { const b = await baixar(arq); if (b) falasBuf[id] = b; }
  } catch (e) { /* sem clipes: usa os sons sintetizados */ }
}
export function temClips() { return Object.keys(clips).length + Object.keys(falasBuf).length > 0; }

function tocarBuf(buf, { vol = 1, pan = 0, taxa = 1, abafar = 0, bus = null } = {}) {
  if (!ctx || !buf) return null;
  const src = ctx.createBufferSource();
  src.buffer = buf; src.playbackRate.value = taxa;
  let no = src;
  if (abafar) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = abafar; no.connect(f); no = f; }
  const g = ctx.createGain(); g.gain.value = vol; no.connect(g); no = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); no.connect(p); no = p; }
  no.connect(bus || vozBus || master);
  src.start();
  return src;
}
const ultimoClip = {};
function clip(cat, o = {}) {
  const l = clips[cat];
  if (!l || !l.length) return false;
  let i = Math.floor(Math.random() * l.length);
  if (l.length > 1 && i === ultimoClip[cat]) i = (i + 1) % l.length;
  ultimoClip[cat] = i;
  tocarBuf(l[i], { ...o, taxa: (o.taxa || 1) * (0.94 + Math.random() * 0.12) });
  return true;
}

// ---------------------------------------------------------------- núcleo
export function iniciarAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = ligado ? 0.6 : 0;
  master.connect(ctx.destination);
  sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
  vozBus = ctx.createGain(); vozBus.gain.value = 1.15; vozBus.connect(master);
  ambBus = ctx.createGain(); ambBus.gain.value = 0.9; ambBus.connect(master);
  ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  carregarClips();
}

export function setSom(v) {
  ligado = v;
  if (master) master.gain.value = v ? 0.6 : 0;
}

function env(g, t, a, dur, vol) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noise(dur, freq, vol, tipo = 'lowpass', q = 0.8, destino = sfx, atraso = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + atraso;
  const src = ctx.createBufferSource();
  src.buffer = ruido;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, 0.003, dur, vol);
  src.connect(f); f.connect(g); g.connect(destino || sfx);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

function tom(tipo, f0, f1, dur, vol, atraso = 0, destino = sfx) {
  if (!ctx) return;
  const t = ctx.currentTime + atraso;
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  env(g, t, 0.005, dur, vol);
  o.connect(g); g.connect(destino || sfx);
  o.start(t); o.stop(t + dur + 0.05);
}

const TIROS = {
  pistola:         () => { noise(0.18, 2600, 0.7); tom('square', 220, 60, 0.08, 0.25); },
  submetralhadora: () => { noise(0.10, 3200, 0.45); tom('square', 260, 80, 0.05, 0.15); },
  fuzil:           () => { noise(0.20, 2000, 0.6); tom('sawtooth', 160, 45, 0.10, 0.3); },
  escopeta:        () => { noise(0.45, 1200, 0.9); tom('sawtooth', 110, 30, 0.2, 0.45); },
  sniper:          () => { noise(0.7, 1500, 1.0); tom('sawtooth', 90, 25, 0.35, 0.5); noise(1.2, 400, 0.25); },
  metralhadora:    () => { noise(0.16, 1800, 0.55); tom('sawtooth', 140, 40, 0.08, 0.3); },
  lancachamas:     () => { noise(0.09, 600, 0.22, 'lowpass'); noise(0.06, 2400, 0.06, 'bandpass', 1.2); },
  lancagranadas:   () => { tom('sine', 220, 70, 0.16, 0.45); noise(0.22, 450, 0.45); },
  besta:           () => { noise(0.08, 3200, 0.22, 'highpass'); tom('triangle', 320, 110, 0.12, 0.22); },
};
const TIROS_ABAFADOS = {
  pistola:         () => { noise(0.12, 900, 0.22); tom('square', 140, 60, 0.05, 0.06); },
  submetralhadora: () => { noise(0.08, 1100, 0.16); },
  fuzil:           () => { noise(0.14, 800, 0.22); tom('sawtooth', 110, 50, 0.07, 0.08); },
  escopeta:        () => { noise(0.3, 600, 0.35); tom('sawtooth', 90, 35, 0.12, 0.14); },
  sniper:          () => { noise(0.35, 700, 0.4); tom('sawtooth', 80, 30, 0.18, 0.15); },
  metralhadora:    () => { noise(0.1, 800, 0.2); },
  lancachamas:     () => { noise(0.09, 600, 0.22, 'lowpass'); },
  lancagranadas:   () => { tom('sine', 220, 70, 0.16, 0.45); noise(0.22, 450, 0.45); },
  besta:           () => { noise(0.07, 3000, 0.16, 'highpass'); tom('triangle', 300, 110, 0.12, 0.18); },
};

// ---------------------------------------------------------------- falas (HUD + áudio)
let ultimaFala = -99;
function agora() { return ctx ? ctx.currentTime : 0; }

export const som = {
  tiro(tipo, mitico, silencioso) {
    ((silencioso ? TIROS_ABAFADOS : TIROS)[tipo] || TIROS.pistola)();
    if (mitico) tom('sine', 900, 1800, 0.12, 0.08);
  },
  seco() { tom('square', 900, 700, 0.03, 0.12); },
  recarga() { tom('square', 600, 400, 0.04, 0.15); tom('square', 1100, 900, 0.05, 0.15, 0.35); },
  troca() { noise(0.08, 3000, 0.2, 'highpass'); },
  hit(cabeca) { tom('square', cabeca ? 1600 : 1100, cabeca ? 1500 : 1000, 0.04, cabeca ? 0.22 : 0.12); },
  abate() { tom('triangle', 500, 120, 0.12, 0.2); },
  gemido(dist = 5, pan = 0) {
    if (!ctx) return;
    const vol = Math.max(0.02, 0.22 - dist * 0.012);
    if (clip('zumbi_gemido', { vol: vol * 2.4, pan, abafar: dist > 12 ? 1400 : 0 })) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const base = 70 + Math.random() * 60;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (0.7 + Math.random() * 0.6), t + 0.6);
    o.frequency.linearRampToValueAtTime(base * 0.8, t + 1.1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 400; f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + 1.1);
    o.connect(f); f.connect(g); g.connect(sfx);
    o.start(t); o.stop(t + 1.2);
  },
  zumbiAtaque(dist = 3, pan = 0) { clip('zumbi_ataque', { vol: Math.max(0.15, 0.7 - dist * 0.05), pan }); },
  zumbiMorte(dist = 3, pan = 0) { clip('zumbi_morte', { vol: Math.max(0.1, 0.5 - dist * 0.03), pan }); },
  corredor(dist = 8, pan = 0) { return clip('corredor_grito', { vol: Math.max(0.15, 0.8 - dist * 0.03), pan }); },
  rugido(tipo) {
    if (tipo) {
      const cat = { acougueiro: 'chefe_acougueiro', chefe: 'chefe_abominacao', colosso: 'chefe_colosso', rainha: 'chefe_rainha' }[tipo];
      if (cat && clip(cat, { vol: 1.3 })) { tom('sawtooth', 70, 35, 1.2, 0.25); return; }
    }
    tom('sawtooth', 90, 40, 1.4, 0.5); noise(1.2, 300, 0.5);
  },
  explosao() { noise(1.2, 700, 1.0); tom('sine', 120, 30, 0.8, 0.8); },
  dano() {
    tom('sine', 160, 60, 0.18, 0.4); noise(0.1, 800, 0.3);
    if (Math.random() < 0.45) clip('jogador_dor', { vol: 0.9 });
  },
  cuspe() { noise(0.25, 900, 0.3, 'bandpass', 4); },
  pegar() { tom('square', 660, 660, 0.06, 0.12); tom('square', 990, 990, 0.08, 0.12, 0.07); },
  raro() { [523, 659, 784, 1046].forEach((f, i) => tom('triangle', f, f, 0.18, 0.15, i * 0.08)); },
  onda() { tom('sawtooth', 110, 110, 0.6, 0.25); tom('sawtooth', 165, 165, 0.6, 0.18, 0.05); },
  pulo() { noise(0.12, 600, 0.15, 'bandpass', 1.5); },
  passo(zona, correndo) {
    if (!ctx) return;
    const v = correndo ? 1.25 : 1;
    if (typeof zona !== 'string') { noise(0.1, 300, 0.3); tom('sine', 90, 50, 0.08, 0.2); return; } // aterrissagem
    if (zona === 'lab') { noise(0.07, 2400, 0.07 * v, 'bandpass', 2); tom('sine', 140, 80, 0.06, 0.08 * v); }
    else if (zona === 'suburbio') { noise(0.12, 500, 0.1 * v, 'lowpass'); noise(0.05, 3000, 0.03 * v, 'highpass'); }
    else if (zona === 'ninho') { noise(0.14, 260, 0.14 * v, 'lowpass'); noise(0.08, 900, 0.06, 'bandpass', 5); }
    else if (zona === 'base') { noise(0.08, 1400, 0.09 * v, 'bandpass', 1.2); tom('sine', 100, 60, 0.05, 0.07 * v); }
    else { noise(0.09, 1100, 0.09 * v, 'bandpass', 1); tom('sine', 110, 70, 0.05, 0.06 * v); }
  },
  grito() {
    if (clip('gritador', { vol: 1.2 })) return;
    tom('sawtooth', 700, 1400, 0.9, 0.25); tom('square', 950, 1800, 0.8, 0.12, 0.05); noise(0.9, 2500, 0.25, 'bandpass', 2);
  },
  investida() { tom('sawtooth', 70, 140, 0.9, 0.45); noise(0.8, 500, 0.3); },
  pisao() { tom('sine', 60, 25, 1.0, 0.9); noise(0.8, 250, 0.8); },
  faca() { noise(0.12, 4000, 0.35, 'highpass'); },
  facaHit() { noise(0.1, 1200, 0.5, 'bandpass', 2); tom('square', 220, 90, 0.08, 0.25); },
  esquiva() { noise(0.22, 1800, 0.3, 'bandpass', 1); },
  torreta() { noise(0.06, 3500, 0.18); },
  escudo() { tom('square', 1800, 1500, 0.05, 0.12); tom('triangle', 2600, 2400, 0.08, 0.08); },
  armadura() { tom('triangle', 1300, 1100, 0.04, 0.1); },
  quebra() { noise(0.4, 2500, 0.5, 'highpass'); tom('square', 400, 120, 0.3, 0.25); },
  aviao() { tom('sawtooth', 90, 70, 2.5, 0.12); },
  clique() { tom('square', 1300, 1200, 0.02, 0.08); },
  tick() { tom('square', 2000, 1800, 0.015, 0.05); },
  cura() { [400, 600, 800].forEach((f, i) => tom('sine', f, f * 1.2, 0.15, 0.15, i * 0.08)); },
  // ---- cenário interativo
  porta(desliza) {
    if (desliza) { noise(0.7, 600, 0.22, 'bandpass', 3); tom('sawtooth', 120, 90, 0.6, 0.08); tom('square', 800, 400, 0.08, 0.1, 0.62); }
    else { tom('sawtooth', 200, 120, 0.5, 0.07); noise(0.4, 900, 0.14, 'bandpass', 6); tom('sine', 90, 55, 0.14, 0.2, 0.5); }
  },
  bau() { noise(0.12, 1800, 0.25, 'bandpass', 3); tom('square', 300, 160, 0.1, 0.18); tom('triangle', 700, 1000, 0.18, 0.12, 0.1); },
  alarme() { for (let i = 0; i < 12; i++) tom('square', i % 2 ? 1100 : 760, i % 2 ? 1100 : 760, 0.16, 0.1, i * 0.24); },
  ligar() { tom('sawtooth', 80, 320, 0.7, 0.2); tom('square', 660, 990, 0.2, 0.12, 0.6); tom('square', 990, 1320, 0.3, 0.12, 0.8); noise(0.5, 3000, 0.1, 'highpass'); },
  apito() { tom('sine', 1800, 300, 1.6, 0.1); },
  trem() { noise(2.6, 300, 0.22, 'lowpass'); tom('sawtooth', 50, 70, 2.8, 0.12); },
  evento(id) {
    if (id === 'horda') { for (let i = 0; i < 6; i++) tom('sawtooth', 500, 900, 0.5, 0.12, i * 0.55); }
    else if (id === 'apagao') { tom('sawtooth', 120, 30, 1.2, 0.3); noise(0.4, 300, 0.4); }
    else if (id === 'esporos') { noise(1.4, 700, 0.2, 'bandpass', 3); tom('sine', 90, 60, 1.4, 0.2); }
    else if (id === 'bombardeio') { tom('sine', 200, 40, 1.3, 0.25); }
    falaEvento(id);
  },
  // ---- vozes do rádio e do soldado: retorna o texto (para mostrar na tela)
  fala(id, livre) {
    const f = FALAS[id];
    if (!f) return null;
    if (!livre && agora() - ultimaFala < 5) return null;
    ultimaFala = agora();
    if (ctx) {
      if (falasBuf[id]) { tocarBuf(falasBuf[id], { vol: f.voz === 'radio' ? 1.25 : 1.1, abafar: f.voz === 'radio' ? 3800 : 0 }); }
      else if (f.voz === 'radio') { tom('square', 1500, 1500, 0.05, 0.06); tom('square', 1500, 1500, 0.05, 0.06, 0.14); noise(0.25, 2500, 0.06, 'bandpass', 2, sfx, 0.1); }
    }
    return `${f.quem}: ${f.txt}`;
  },
  respiracao() { return clip('jogador_respira', { vol: 0.7 }); },
  morteJogador() { clip('jogador_morte', { vol: 1 }); },
};
function falaEvento(id) { /* a fala do evento é chamada pela raid (precisa do HUD) */ }

// ---------------------------------------------------------------- ambientação por zona
let amb = null;
function ruidoLoop(freq, q, tipo, vol, lfoHz = 0, lfoProf = 0) {
  const src = ctx.createBufferSource(); src.buffer = ruido; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(ambBus);
  src.start(0, Math.random());
  const nos = [src];
  if (lfoHz) { const lfo = ctx.createOscillator(); lfo.frequency.value = lfoHz; const lg = ctx.createGain(); lg.gain.value = lfoProf; lfo.connect(lg); lg.connect(g.gain); lfo.start(); nos.push(lfo); }
  return nos;
}
function drone(tipo, freq, vol, lfoHz = 0, lfoProf = 0, filtro = 0) {
  const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  let no = o;
  if (filtro) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filtro; o.connect(f); no = f; }
  no.connect(g); g.connect(ambBus); o.start();
  const nos = [o];
  if (lfoHz) { const lfo = ctx.createOscillator(); lfo.frequency.value = lfoHz; const lg = ctx.createGain(); lg.gain.value = lfoProf; lfo.connect(lg); lg.connect(g.gain); lfo.start(); nos.push(lfo); }
  return nos;
}
const EV = {
  latido() { for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { const t = i * 0.32; tom('sawtooth', 420, 220, 0.14, 0.05, t, ambBus); noise(0.12, 1200, 0.04, 'bandpass', 3, ambBus, t); } },
  sirene() { const t = ctx.currentTime; const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 1.5); g.gain.linearRampToValueAtTime(0.0001, t + 5); for (let i = 0; i < 6; i++) o.frequency.setValueAtTime(i % 2 ? 640 : 900, t + i * 0.8); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; o.connect(f); f.connect(g); g.connect(ambBus); o.start(t); o.stop(t + 5); },
  explosaoDist() { noise(1.6, 260, 0.35, 'lowpass', 0.8, ambBus); tom('sine', 80, 28, 1.2, 0.3, 0, ambBus); },
  vidro() { noise(0.5, 4200, 0.12, 'highpass', 1, ambBus); for (let i = 0; i < 4; i++) tom('triangle', 2600 + Math.random() * 1500, 1800, 0.12, 0.04, i * 0.07, ambBus); },
  radioEstatica() { noise(0.6, 2200, 0.08, 'bandpass', 1.5, ambBus); tom('square', 1100, 1100, 0.05, 0.035, 0.6, ambBus); },
  bip() { for (let i = 0; i < 3; i++) tom('sine', 1400, 1400, 0.1, 0.03, i * 0.5, ambBus); },
  vapor() { noise(1.6, 5000, 0.07, 'bandpass', 0.8, ambBus); },
  gota() { tom('sine', 1800, 700, 0.08, 0.03, 0, ambBus); tom('sine', 900, 500, 0.1, 0.02, 0.12, ambBus); },
  rangido() { const t = ctx.currentTime, o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(130, t); o.frequency.linearRampToValueAtTime(90, t + 1.1); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = 8; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + 1.1); o.connect(f); f.connect(g); g.connect(ambBus); o.start(t); o.stop(t + 1.2); },
  sussurro() { noise(1.2, 1500, 0.06, 'bandpass', 5, ambBus); noise(0.9, 2400, 0.04, 'bandpass', 8, ambBus, 0.4); },
  esguicho() { noise(0.35, 700, 0.09, 'lowpass', 1, ambBus); tom('sine', 220, 90, 0.2, 0.05, 0, ambBus); },
  jato() { noise(3, 900, 0.2, 'bandpass', 0.7, ambBus); },
  porta() { noise(0.1, 500, 0.1, 'lowpass', 1, ambBus); tom('sine', 80, 40, 0.15, 0.12, 0, ambBus); },
};
const AMB = {
  suburbio: { leitos: [['r', 500, 0.7, 'bandpass', 0.06, 0.12, 0.035], ['d', 'sine', 4300, 0.006, 16, 0.006]], eventos: [['latido', 16, 36], ['porta', 30, 70], ['rangido', 22, 50], ['sirene', 40, 90], ['explosaoDist', 50, 120]], clip: 'amb_suburbio' },
  centro: { leitos: [['r', 140, 0.8, 'lowpass', 0.14, 0.1, 0.06], ['r', 3500, 0.8, 'highpass', 0.012, 0.5, 0.008]], eventos: [['sirene', 14, 34], ['explosaoDist', 22, 60], ['vidro', 18, 45], ['radioEstatica', 25, 60]], clip: 'amb_centro' },
  lab: { leitos: [['d', 'sawtooth', 60, 0.014, 0.3, 0.004, 240], ['d', 'sine', 120, 0.01, 0, 0], ['r', 300, 0.7, 'lowpass', 0.08, 0.08, 0.02]], eventos: [['bip', 9, 22], ['vapor', 12, 30], ['gota', 6, 16], ['porta', 24, 60]], clip: 'amb_lab' },
  base: { leitos: [['r', 2600, 0.6, 'highpass', 0.04, 0.0, 0], ['r', 450, 0.7, 'bandpass', 0.07, 0.1, 0.04]], eventos: [['explosaoDist', 14, 36], ['radioEstatica', 16, 40], ['jato', 40, 90], ['sirene', 45, 100]], clip: 'amb_base' },
  ninho: { leitos: [['d', 'sine', 48, 0.1, 0.3, 0.04], ['d', 'sine', 50.6, 0.09, 0, 0], ['r', 220, 1.5, 'lowpass', 0.07, 0.06, 0.03]], eventos: [['sussurro', 8, 22], ['esguicho', 7, 18], ['gota', 6, 14], ['rangido', 20, 45]], clip: 'amb_ninho', batimento: true },
};
export function ambiente(zonaId) {
  pararAmbiente();
  if (!ctx) return;
  const cfg = AMB[zonaId]; if (!cfg) return;
  const token = {}; amb = { token, nos: [], timers: [] };
  for (const l of cfg.leitos) {
    if (l[0] === 'r') amb.nos.push(...ruidoLoop(l[1], l[2], l[3], l[4], l[5], l[6]));
    else amb.nos.push(...drone(l[1], l[2], l[3], l[4], l[5], l[6]));
  }
  const agenda = (fn, min, max) => {
    const rodar = () => { if (!amb || amb.token !== token) return; fn(); amb.timers.push(setTimeout(rodar, (min + Math.random() * (max - min)) * 1000)); };
    amb.timers.push(setTimeout(rodar, (min * 0.5 + Math.random() * (max - min)) * 1000));
  };
  for (const [nome, min, max] of cfg.eventos) agenda(() => EV[nome] && EV[nome](), min, max);
  // vozes distantes geradas com o Fish Audio (se existirem)
  agenda(() => clip(cfg.clip, { vol: 0.5, abafar: 2400, pan: Math.random() * 1.6 - 0.8, bus: ambBus }), 22, 55);
  if (cfg.batimento) {
    const bat = () => { tom('sine', 75, 38, 0.18, 0.22, 0, ambBus); tom('sine', 70, 36, 0.2, 0.16, 0.22, ambBus); };
    const loop = () => { if (!amb || amb.token !== token) return; bat(); amb.timers.push(setTimeout(loop, 1250)); };
    amb.timers.push(setTimeout(loop, 600));
  }
}
export function pararAmbiente() {
  if (!amb) return;
  amb.timers.forEach(clearTimeout);
  amb.nos.forEach(n => { try { n.stop(); } catch (e) { /* já parou */ } });
  amb = null;
}
