'use strict';
// ===== Efeitos sonoros e música 8 bits (gerados com Web Audio, sem arquivos) =====
const Sfx = (() => {
  let ac = null, master, sfxG, musG, noiseBuf;
  let muted = false;

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    // celulares (principalmente iPhone) só liberam a voz sintetizada depois de um toque
    if ('speechSynthesis' in window) {
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* ignora */ }
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    sfxG = ac.createGain(); sfxG.gain.value = 0.5; sfxG.connect(master);
    musG = ac.createGain(); musG.gain.value = 0.22; musG.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function osc(type, f0, f1, t, dur, vol, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(t, dur, vol, freq, type, dest, f1) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type || 'highpass';
    f.frequency.setValueAtTime(freq || 3000, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const seq = (notes, step, type, vol) => {
    const t = ac.currentTime;
    notes.forEach((n, i) => osc(type || 'square', midi(n), 0, t + i * step, step * 1.1, vol || 0.12));
  };

  const FX = {
    jump: () => osc('square', 260, 640, ac.currentTime, 0.16, 0.1),
    coin: () => { const t = ac.currentTime; osc('square', 988, 0, t, 0.07, 0.1); osc('square', 1319, 0, t + 0.07, 0.25, 0.1); },
    stomp: () => { const t = ac.currentTime; osc('square', 320, 70, t, 0.13, 0.15); noise(t, 0.07, 0.25, 1500); },
    bump: () => osc('triangle', 150, 70, ac.currentTime, 0.12, 0.4),
    brick: () => { const t = ac.currentTime; noise(t, 0.25, 0.4, 900, 'lowpass'); osc('square', 220, 60, t, 0.15, 0.12); },
    appear: () => seq([60, 67, 72, 79], 0.05),
    power: () => seq([60, 64, 67, 72, 76, 79, 84], 0.05),
    hurt: () => osc('sawtooth', 520, 110, ac.currentTime, 0.4, 0.12),
    die: () => seq([71, 67, 64, 59, 55, 52], 0.13),
    flag: () => seq([67, 72, 76, 79, 76, 79], 0.08),
    win: () => seq([60, 64, 67, 72, 64, 67, 72, 76, 67, 72, 76, 84], 0.09),
    over: () => seq([67, 66, 65, 64, 52], 0.22, 'triangle', 0.25),
    engine: () => {
      const t = ac.currentTime;
      noise(t, 3.5, 0.35, 200, 'lowpass', sfxG, 2400);
      osc('sawtooth', 55, 160, t, 3.5, 0.05);
    },
    select: () => osc('square', 880, 0, ac.currentTime, 0.05, 0.08),
  };

  function play(name) {
    if (!ac || muted || !FX[name]) return;
    FX[name]();
  }

  // ---------- Música (um loop por fase) ----------
  const _ = null;
  const SONGS = [
    { bpm: 150, // Rio: sambinha 8 bits
      mel: [72, _, 76, 79, 77, 76, 74, _, 72, _, 74, 76, 74, 72, 67, _,
            69, _, 72, 76, 74, 72, 71, _, 72, 74, 76, 79, 77, 74, 72, _],
      bass: [48, _, 55, _, 48, _, 55, 52, 53, _, 60, _, 53, _, 55, _,
             57, _, 52, _, 50, _, 55, _, 48, _, 55, _, 43, _, 48, _] },
    { bpm: 140, // Brasília: tenso
      mel: [69, _, 72, 69, 76, _, 74, 72, 71, _, 72, 74, 76, _, _, _,
            69, _, 72, 69, 77, _, 76, 74, 72, 71, 69, 71, 69, _, _, _],
      bass: [45, _, 52, _, 45, _, 52, _, 41, _, 48, _, 40, _, 47, _] },
    { bpm: 165, // Aeroporto: correria
      mel: [64, 67, 71, 67, 72, 71, 67, 64, 62, 66, 69, 66, 71, 69, 66, 62,
            64, 67, 71, 74, 76, 74, 71, 67, 69, 71, 72, 74, 71, _, 67, _],
      bass: [40, _, 40, 52, 38, _, 38, 50, 40, _, 40, 52, 43, _, 45, 47] },
  ];

  let timer = null, song = null, step = 0, nextTime = 0, tempo = 1;

  function startMusic(i) {
    if (!ac) return;
    stopMusic();
    song = SONGS[i % SONGS.length];
    step = 0;
    nextTime = ac.currentTime + 0.05;
    timer = setInterval(schedule, 25);
  }

  function schedule() {
    while (nextTime < ac.currentTime + 0.12) {
      const d = 60 / (song.bpm * tempo) / 2;
      const m = song.mel[step % song.mel.length], b = song.bass[step % song.bass.length];
      if (m) osc('square', midi(m), 0, nextTime, d * 0.9, 0.09, musG);
      if (b) osc('triangle', midi(b), 0, nextTime, d * 0.95, 0.3, musG);
      if (step % 2 === 1) noise(nextTime, 0.03, 0.12, 7000, 'highpass', musG);
      if (step % 4 === 0) osc('sine', 130, 45, nextTime, 0.12, 0.5, musG);
      nextTime += d;
      step++;
    }
  }

  function stopMusic() { if (timer) clearInterval(timer); timer = null; }
  function setDanger(on) { tempo = on ? 1.3 : 1; }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
    if (m && 'speechSynthesis' in window) speechSynthesis.cancel();
  }

  return { init, play, startMusic, stopMusic, setDanger, setMuted, get muted() { return muted; } };
})();

// ===== Falas dos personagens =====
// Ordem de prioridade de cada fala: gravação feita no aparelho (tela VOZES),
// arquivo na pasta vozes/ do projeto, e por último a voz sintetizada do celular.
const Voice = (() => {
  const LINES = {
    lula_pegar: { who: 'lula', text: 'Vou te pegar, Flávio!' },
    lula_volta: { who: 'lula', text: 'Volta aqui, companheiro!' },
    lula_correr: { who: 'lula', text: 'Não adianta correr!' },
    lula_peguei: { who: 'lula', text: 'Peguei você!' },
    lula_aviao: { who: 'lula', text: 'Esse avião não vai sair!' },
    flavio_passaporte: { who: 'flavio', text: 'Não vai pegar meu passaporte!' },
    flavio_ninguem: { who: 'flavio', text: 'Ninguém me pega!' },
    flavio_fui: { who: 'flavio', text: 'Fui! Tchau, Brasil!' },
    flavio_ai: { who: 'flavio', text: 'Ai!' },
    militante_olha: { who: 'militante', text: 'Olha ele ali! Pega!' },
    militante_anistia: { who: 'militante', text: 'Sem anistia!' },
    pf_parado: { who: 'pf', text: 'Polícia Federal! Parado aí!' },
    pf_mandado: { who: 'pf', text: 'Temos um mandado para você, Flávio Bolsonaro!' },
    cf_iguais: { who: 'cf', text: 'Todos são iguais perante a lei!' },
    cf_acima: { who: 'cf', text: 'Ninguém está acima da Constituição!' },
  };
  const WHO = { lula: 'LULA', flavio: 'FLÁVIO', militante: 'MILITANTE', pf: 'POLÍCIA FEDERAL', cf: 'CONSTITUIÇÃO' };
  // jeito de falar de cada personagem na voz sintetizada
  const STYLE = { lula: [0.3, 0.95], flavio: [1.6, 1.15], militante: [1.1, 1.3], pf: [0.6, 1.0], cf: [0.9, 0.8] };
  const PREFIX = 'fugaFlavio_voz_';
  const hasTTS = 'speechSynthesis' in window;
  let voices = [];

  if (hasTTS) {
    const load = () => { voices = speechSynthesis.getVoices(); };
    load();
    speechSynthesis.onvoiceschanged = load;
  }
  const ptVoice = () => voices.find(v => /pt[-_]BR/i.test(v.lang)) || voices.find(v => /^pt/i.test(v.lang));

  // Áudios colocados na pasta vozes/ do projeto (ex.: vozes/lula_pegar.mp3)
  // valem para todo mundo que abrir o jogo. Gravações feitas no celular têm prioridade.
  const files = {};
  for (const id of Object.keys(LINES)) {
    const url = 'vozes/' + id + '.mp3';
    fetch(url, { method: 'HEAD' }).then(r => { if (r.ok) files[id] = url; }).catch(() => {});
  }

  function custom(id) { try { return localStorage.getItem(PREFIX + id); } catch (e) { return null; } }
  function setCustom(id, data) { try { localStorage.setItem(PREFIX + id, data); return true; } catch (e) { return false; } }
  function clearCustom(id) { try { localStorage.removeItem(PREFIX + id); } catch (e) { /* ignora */ } }
  const hasFile = id => !!files[id];

  // ----- Fila de falas: um personagem espera o outro terminar de falar -----
  let queue = [], cur = null;

  // opts.onStart: chamado quando a fala começa de verdade (para mostrar o balão junto)
  // opts.interrupt: corta o que estiver tocando (ex.: "Peguei você!")
  // opts.force: toca mesmo com o som desligado (botão de ouvir na tela de vozes)
  // opts.ifIdle: só fala se ninguém estiver falando (gritos dos inimigos)
  function play(id, opts) {
    opts = opts || {};
    if (!LINES[id]) return;
    if (Sfx.muted && !opts.force) { if (opts.onStart) opts.onStart(); return; }
    if (opts.ifIdle && (cur || queue.length)) return;
    if (opts.interrupt || opts.force) stop();
    queue = queue.filter(q => q.id !== id);
    queue.push({ id, onStart: opts.onStart, t: Date.now() });
    if (queue.length > 2) queue.shift(); // não acumula falas atrasadas
    next();
  }

  function next() {
    if (cur) return;
    while (queue.length && Date.now() - queue[0].t > 5000) queue.shift();
    const q = queue.shift();
    if (!q) return;
    const line = LINES[q.id];
    const me = cur = { audio: null, timer: 0 };
    const done = () => {
      if (cur !== me) return;
      clearTimeout(me.timer);
      cur = null;
      setTimeout(next, 250);
    };
    if (q.onStart) q.onStart();

    const src = custom(q.id) || files[q.id];
    if (src) {
      me.timer = setTimeout(done, 8000); // segurança caso o áudio trave
      try {
        me.audio = new Audio(src);
        me.audio.onended = done;
        me.audio.onerror = done;
        me.audio.play().catch(done);
      } catch (e) { done(); }
      return;
    }
    // segurança: alguns navegadores não avisam quando a voz sintetizada termina
    me.timer = setTimeout(done, 1500 + line.text.length * 110);
    if (!hasTTS) return;
    const u = new SpeechSynthesisUtterance(line.text);
    u.lang = 'pt-BR';
    const v = ptVoice();
    if (v) u.voice = v;
    [u.pitch, u.rate] = STYLE[line.who] || [1, 1];
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  }

  function stop() {
    queue = [];
    if (cur) {
      clearTimeout(cur.timer);
      if (cur.audio) cur.audio.pause();
      cur = null;
    }
    if (hasTTS) speechSynthesis.cancel();
  }

  return { LINES, WHO, play, stop, custom, setCustom, clearCustom, hasFile };
})();
