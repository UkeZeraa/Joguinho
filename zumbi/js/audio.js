// Sons sintetizados com Web Audio (não precisa de arquivos).
let ctx = null, master = null, ruido = null;
let ligado = true;

export function iniciarAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = ligado ? 0.6 : 0;
  master.connect(ctx.destination);
  // buffer de ruído branco reutilizado
  ruido = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = ruido.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export function setSom(v) {
  ligado = v;
  if (master) master.gain.value = v ? 0.6 : 0;
}

function env(g, t, a, dur, vol) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function noise(dur, freq, vol, tipo = 'lowpass', q = 0.8, destino = master) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = ruido;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, 0.003, dur, vol);
  src.connect(f); f.connect(g); g.connect(destino);
  src.start(t, Math.random() * 1.5, dur + 0.05);
}

function tom(tipo, f0, f1, dur, vol, atraso = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + atraso;
  const o = ctx.createOscillator();
  o.type = tipo;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  env(g, t, 0.005, dur, vol);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

const TIROS = {
  pistola:         () => { noise(0.18, 2600, 0.7); tom('square', 220, 60, 0.08, 0.25); },
  submetralhadora: () => { noise(0.10, 3200, 0.45); tom('square', 260, 80, 0.05, 0.15); },
  fuzil:           () => { noise(0.20, 2000, 0.6); tom('sawtooth', 160, 45, 0.10, 0.3); },
  escopeta:        () => { noise(0.45, 1200, 0.9); tom('sawtooth', 110, 30, 0.2, 0.45); },
  sniper:          () => { noise(0.7, 1500, 1.0); tom('sawtooth', 90, 25, 0.35, 0.5); noise(1.2, 400, 0.25); },
  metralhadora:    () => { noise(0.16, 1800, 0.55); tom('sawtooth', 140, 40, 0.08, 0.3); },
};

export const som = {
  tiro(tipo, mitico) {
    (TIROS[tipo] || TIROS.pistola)();
    if (mitico) tom('sine', 900, 1800, 0.12, 0.08);
  },
  seco() { tom('square', 900, 700, 0.03, 0.12); },
  recarga() { tom('square', 600, 400, 0.04, 0.15); tom('square', 1100, 900, 0.05, 0.15, 0.35); },
  troca() { noise(0.08, 3000, 0.2, 'highpass'); },
  hit(cabeca) { tom('square', cabeca ? 1600 : 1100, cabeca ? 1500 : 1000, 0.04, cabeca ? 0.22 : 0.12); },
  abate() { tom('triangle', 500, 120, 0.12, 0.2); },
  gemido(dist = 5) {
    if (!ctx) return;
    const vol = Math.max(0.02, 0.22 - dist * 0.012);
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
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); o.stop(t + 1.2);
  },
  rugido() { tom('sawtooth', 90, 40, 1.4, 0.5); noise(1.2, 300, 0.5); },
  explosao() { noise(1.2, 700, 1.0); tom('sine', 120, 30, 0.8, 0.8); },
  dano() { tom('sine', 160, 60, 0.18, 0.4); noise(0.1, 800, 0.3); },
  cuspe() { noise(0.25, 900, 0.3, 'bandpass', 4); },
  pegar() { tom('square', 660, 660, 0.06, 0.12); tom('square', 990, 990, 0.08, 0.12, 0.07); },
  raro() { [523, 659, 784, 1046].forEach((f, i) => tom('triangle', f, f, 0.18, 0.15, i * 0.08)); },
  onda() { tom('sawtooth', 110, 110, 0.6, 0.25); tom('sawtooth', 165, 165, 0.6, 0.18, 0.05); },
  pulo() { noise(0.12, 600, 0.15, 'bandpass', 1.5); },
  passo() { noise(0.1, 300, 0.3); tom('sine', 90, 50, 0.08, 0.2); },
  clique() { tom('square', 1300, 1200, 0.02, 0.08); },
  tick() { tom('square', 2000, 1800, 0.015, 0.05); },
  cura() { [400, 600, 800].forEach((f, i) => tom('sine', f, f * 1.2, 0.15, 0.15, i * 0.08)); },
};
