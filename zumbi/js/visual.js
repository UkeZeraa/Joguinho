// Visual da raid: pós-processamento, céu, clima, névoa, texturas do cenário, objetos e marcas no chão.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const rand = (a, b) => a + Math.random() * (b - a);
const escolher = a => a[Math.floor(Math.random() * a.length)];

// ------------------------------------------------------------------ qualidade
export function qualidade(opcoes, mobile) {
  return opcoes.qualidade || (mobile ? 'medio' : 'alto');
}

// ------------------------------------------------------------------ pós-processamento
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTempo: { value: 0 },
    uBaixa: { value: 0 },   // 0..1: pouca vida (dessatura e pulsa vermelho)
    uDano: { value: 0 },    // 0..1: levou dano agora (aberração cromática)
    uGrao: { value: 0.05 },
    uTint: { value: new THREE.Color(1, 1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTempo, uBaixa, uDano, uGrao; uniform vec3 uTint; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float ab = 0.0015 + uDano * 0.014;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + c * ab).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - c * ab).b;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, vec3(l), uBaixa * 0.7);
      col = mix(col, col * uTint * 1.3, 0.2);
      col = (col - 0.5) * 1.08 + 0.5;
      float v = smoothstep(0.9, 0.28, length(c * vec2(1.0, 0.85)));
      col *= mix(0.45, 1.0, v);
      col = mix(col, vec3(0.45, 0.0, 0.0), (1.0 - v) * uBaixa * 0.6 * (0.6 + 0.4 * sin(uTempo * 5.0)));
      col = mix(col, vec3(0.6, 0.0, 0.0), (1.0 - v) * uDano * 0.5);
      col += (rnd(vUv * 731.7 + fract(uTempo * 7.3)) - 0.5) * uGrao;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export function criarPos(R, cena, camera, vmCena, vmCam, qual, tint) {
  R.toneMapping = THREE.ACESFilmicToneMapping;
  R.toneMappingExposure = 1.25;
  R.shadowMap.enabled = qual === 'alto';
  R.shadowMap.type = THREE.PCFSoftShadowMap;
  // reflexos para as armas (metal brilhando)
  const pmrem = new THREE.PMREMGenerator(R);
  const env = pmrem.fromScene(new RoomEnvironment(R), 0.04).texture;
  vmCena.environment = env;
  pmrem.dispose();

  if (qual === 'baixo') {
    return {
      render() { R.clear(); R.render(cena, camera); R.clearDepth(); R.render(vmCena, vmCam); },
      resize() {}, dispose() { env.dispose(); }, grade: null,
    };
  }
  const composer = new EffectComposer(R);
  const rp = new RenderPass(cena, camera);
  composer.addPass(rp);
  const vp = new RenderPass(vmCena, vmCam);
  vp.clear = false; vp.clearDepth = true;
  composer.addPass(vp);
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.72);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uTint.value.set(tint);
  composer.addPass(grade);
  return {
    render() { composer.render(); },
    resize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
    },
    dispose() { composer.dispose(); bloom.dispose(); env.dispose(); },
    grade, bloom,
  };
}

// ------------------------------------------------------------------ céu
export function criarCeu(cena, corTopo, corHorizonte, corNuvem, luaDir) {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      cTopo: { value: new THREE.Color(corTopo) }, cHor: { value: new THREE.Color(corHorizonte) },
      cNuv: { value: new THREE.Color(corNuvem) }, luaDir: { value: luaDir.clone().normalize() },
      uTempo: { value: 0 }, uFlash: { value: 0 },
    },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 cTopo, cHor, cNuv, luaDir; uniform float uTempo, uFlash; varying vec3 vDir;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main(){
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(cHor, cTopo, pow(h, 0.5));
        vec2 uv = d.xz / (d.y + 0.2) * 1.4 + vec2(uTempo * 0.012, uTempo * 0.005);
        float n = fbm(uv);
        float nuv = smoothstep(0.42, 0.85, n) * smoothstep(0.0, 0.2, d.y);
        float dl = max(dot(d, luaDir), 0.0);
        float halo = pow(dl, 80.0) * 0.8 + pow(dl, 10.0) * 0.18;
        float disco = smoothstep(0.99935, 0.9996, dl);
        float est = step(0.9975, hash(floor(d.xz / (d.y + 0.3) * 260.0))) * smoothstep(0.1, 0.4, d.y) * (1.0 - nuv);
        col += est * vec3(0.8) * (0.6 + 0.4 * sin(uTempo * 3.0 + d.x * 90.0));
        col += vec3(0.75, 0.8, 1.0) * halo;
        col = mix(col, cNuv * (0.7 + 0.6 * n) + vec3(0.6, 0.65, 0.8) * halo * 1.2, nuv * 0.9);
        col += disco * vec3(2.4, 2.4, 2.2) * (1.0 - nuv * 0.85);
        col += uFlash * vec3(0.5, 0.55, 0.75) * (0.2 + nuv * 1.5);
        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const ceu = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), mat);
  ceu.renderOrder = -10;
  ceu.frustumCulled = false;
  cena.add(ceu);
  return {
    mat,
    update(dt, pos) { mat.uniforms.uTempo.value += dt; ceu.position.copy(pos); },
    flash(v) { mat.uniforms.uFlash.value = v; },
  };
}

// ------------------------------------------------------------------ texturas
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, repetir = true) {
  const t = new THREE.CanvasTexture(c);
  if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function ruido(g, w, h, forca, n = w * h / 40) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() < 0.5 ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * forca})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
}
const softCache = {};
export function texSuave(cor = '#fff') {
  if (softCache[cor]) return softCache[cor];
  const [c, g] = canvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, cor); gr.addColorStop(0.4, cor.replace(')', ',0.5)').replace('rgb', 'rgba'));
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return (softCache[cor] = tex(c, false));
}
function texNuvemSuave() {
  const [c, g] = canvas(128, 128);
  for (let i = 0; i < 18; i++) {
    const x = rand(30, 98), y = rand(40, 88), r = rand(18, 40);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  return tex(c, false);
}

// Fachadas: concreto, tijolo, reboco e vidro. Retorna { map, emissiveMap }
const ESTILOS = [
  { base: '#5d5853', linhas: '#3e3a36', tipo: 'concreto' },
  { base: '#6a3a2c', linhas: '#3a1e16', tipo: 'tijolo' },
  { base: '#8a7a62', linhas: '#5a4e3e', tipo: 'reboco' },
  { base: '#2a333c', linhas: '#151a20', tipo: 'vidro' },
  { base: '#4d5a52', linhas: '#2e3631', tipo: 'concreto' },
];
export function texFachada(i) {
  const e = ESTILOS[i % ESTILOS.length];
  const W = 256, H = 512;
  const [c, g] = canvas(W, H), [ce, ge] = canvas(W, H);
  g.fillStyle = e.base; g.fillRect(0, 0, W, H);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  if (e.tipo === 'tijolo') {
    for (let y = 0; y < H; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < W; x += 16) {
      g.fillStyle = `hsl(${12 + Math.random() * 8},${35 + Math.random() * 10}%,${22 + Math.random() * 8}%)`;
      g.fillRect(x + 1, y + 1, 14, 6);
    }
  }
  ruido(g, W, H, 0.12);
  // manchas de sujeira escorrendo
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * W, w = rand(6, 30);
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(rand(0.3, 0.9), 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x, 0, w, H);
  }
  // andares
  const vidro = e.tipo === 'vidro';
  const colunas = vidro ? 4 : 4, linhas = 5;
  const cw = W / colunas, ch = H / linhas;
  for (let r = 0; r < linhas; r++) {
    g.fillStyle = e.linhas; g.fillRect(0, r * ch + ch - 6, W, 6);
    for (let k = 0; k < colunas; k++) {
      const x = k * cw + (vidro ? 3 : 14), y = r * ch + (vidro ? 8 : 22);
      const w = cw - (vidro ? 6 : 28), h = ch - (vidro ? 20 : 44);
      const sorte = Math.random();
      // moldura
      g.fillStyle = '#1a1a1a'; g.fillRect(x - 3, y - 3, w + 6, h + 6);
      if (sorte < 0.1) {
        // janela acesa
        const cor = escolher(['#ffcc70', '#ffb050', '#ffd890', '#90b8ff', '#ff6a4a']);
        g.fillStyle = cor; g.fillRect(x, y, w, h);
        ge.fillStyle = cor; ge.fillRect(x, y, w, h);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, y, w * rand(0.2, 0.5), h); // cortina
        ge.fillStyle = 'rgba(0,0,0,0.6)'; ge.fillRect(x, y, w * rand(0.2, 0.5), h);
      } else if (sorte < 0.22 && !vidro) {
        // tábuas pregadas
        g.fillStyle = '#0c0d0f'; g.fillRect(x, y, w, h);
        for (let t = 0; t < 3; t++) {
          g.save(); g.translate(x + w / 2, y + 10 + t * (h / 3)); g.rotate(rand(-0.25, 0.25));
          g.fillStyle = `hsl(28,${30 + Math.random() * 15}%,${22 + Math.random() * 10}%)`; g.fillRect(-w / 2 - 4, -5, w + 8, 10);
          g.restore();
        }
      } else if (sorte < 0.35) {
        // vidro quebrado
        g.fillStyle = '#07080a'; g.fillRect(x, y, w, h);
        g.strokeStyle = 'rgba(160,180,200,0.5)'; g.lineWidth = 1;
        const cx = x + rand(0.2, 0.8) * w, cy = y + rand(0.2, 0.8) * h;
        for (let t = 0; t < 7; t++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + rand(-w, w), cy + rand(-h, h)); g.stroke(); }
      } else {
        // vidro escuro com reflexo
        const gr = g.createLinearGradient(x, y, x + w, y + h);
        gr.addColorStop(0, vidro ? '#22303e' : '#151a22'); gr.addColorStop(0.5, vidro ? '#344658' : '#1f2732'); gr.addColorStop(1, '#0d1016');
        g.fillStyle = gr; g.fillRect(x, y, w, h);
      }
      if (!vidro) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x - 5, y + h + 3, w + 10, 4); } // peitoril
    }
  }
  // pichações
  if (Math.random() < 0.7) {
    g.save(); g.translate(rand(20, 120), H - rand(20, 60)); g.rotate(rand(-0.15, 0.15));
    g.font = `bold ${Math.floor(rand(18, 28))}px Impact, sans-serif`;
    g.fillStyle = escolher(['#c02020', '#e0e0e0', '#30a040', '#e0a020']);
    g.fillText(escolher(['FUJAM', 'SOS', 'NÃO ENTRE', 'ELES OUVEM', 'AJUDA', 'Z', 'FIM', 'SOBREVIVA']), 0, 0);
    g.restore();
  }
  return { map: tex(c), emissiveMap: tex(ce) };
}

export function texTelhado() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, 128, 128);
  ruido(g, 128, 128, 0.25, 900);
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); }
  return tex(c);
}

export function texLoja() {
  const [c, g] = canvas(256, 128);
  g.fillStyle = '#222'; g.fillRect(0, 0, 256, 128);
  // porta de enrolar
  for (let y = 10; y < 128; y += 6) { g.fillStyle = y % 12 ? '#5a5e62' : '#484c50'; g.fillRect(8, y, 120, 5); }
  ruido(g, 256, 128, 0.2, 400);
  // vitrine
  const gr = g.createLinearGradient(140, 10, 250, 120);
  gr.addColorStop(0, '#1a2430'); gr.addColorStop(1, '#0a0e14');
  g.fillStyle = gr; g.fillRect(140, 14, 108, 110);
  g.strokeStyle = 'rgba(200,220,255,0.35)';
  for (let t = 0; t < 6; t++) { g.beginPath(); g.moveTo(190, 60); g.lineTo(190 + rand(-60, 60), 60 + rand(-50, 50)); g.stroke(); }
  g.fillStyle = 'rgba(200,30,30,0.6)'; g.font = 'bold 16px Impact, sans-serif'; g.fillText(escolher(['SAQUEADO', 'FECHADO', 'X']), 20, 70);
  return tex(c, false);
}

export function texLetreiro(texto, cor) {
  const [c, g] = canvas(256, 64);
  g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, 256, 64);
  g.font = 'bold 40px Impact, "Arial Black", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = cor; g.shadowBlur = 14;
  g.fillStyle = cor; g.fillText(texto, 128, 34);
  g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.5; g.fillText(texto, 128, 34);
  return tex(c, false);
}

// Chão do mapa inteiro: asfalto, calçadas, faixas, bueiros, poças e sangue
export function texChaoMapa(obst, L, tema, px) {
  const S = px / (L * 2);
  const [c, g] = canvas(px, px), [cr, gr] = canvas(px, px);
  const T = {
    suburbio: { asf: '#33373b', calc: '#6a6a66', linha: '#d8c040' },
    centro: { asf: '#2e2b29', calc: '#5e5650', linha: '#d8a030' },
    lab: { asf: '#2a302d', calc: '#5a645e', linha: '#40d080' },
    base: { asf: '#3a3a30', calc: '#6a6a58', linha: '#e0c020' },
    ninho: { asf: '#2c2430', calc: '#4e4452', linha: '#b060d0' },
  }[tema] || { asf: '#33373b', calc: '#6a6a66', linha: '#d8c040' };
  g.fillStyle = T.asf; g.fillRect(0, 0, px, px);
  gr.fillStyle = '#d0d0d0'; gr.fillRect(0, 0, px, px); // asfalto áspero
  // granulado do asfalto
  const img = g.getImageData(0, 0, px, px), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() - 0.5) * 22;
    d[i] += v; d[i + 1] += v; d[i + 2] += v;
  }
  g.putImageData(img, 0, 0);
  const m = v => (v + L) * S;
  // calçadas ao redor dos prédios
  for (const o of obst) {
    if (o.tipo !== 'predio') continue;
    const b = 2.6;
    g.fillStyle = T.calc;
    g.fillRect(m(o.minx - b), m(o.minz - b), (o.maxx - o.minx + 2 * b) * S, (o.maxz - o.minz + 2 * b) * S);
    gr.fillStyle = '#e0e0e0';
    gr.fillRect(m(o.minx - b), m(o.minz - b), (o.maxx - o.minx + 2 * b) * S, (o.maxz - o.minz + 2 * b) * S);
  }
  // ladrilhos e meio-fio
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
  for (const o of obst) {
    if (o.tipo !== 'predio') continue;
    const b = 2.6, x0 = m(o.minx - b), z0 = m(o.minz - b), x1 = m(o.maxx + b), z1 = m(o.maxz + b);
    for (let x = x0; x < x1; x += S) { g.beginPath(); g.moveTo(x, z0); g.lineTo(x, z1); g.stroke(); }
    for (let z = z0; z < z1; z += S) { g.beginPath(); g.moveTo(x0, z); g.lineTo(x1, z); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = Math.max(2, S * 0.18);
    g.strokeRect(x0, z0, x1 - x0, z1 - z0);
    g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 1;
  }
  // faixas das avenidas (x = 0 e z = 0)
  g.fillStyle = T.linha;
  const tracejado = (horiz) => {
    for (let p = -L + 10; p < L - 10; p += 4) {
      if (Math.abs(p) < 6) continue;
      if (horiz) g.fillRect(m(p), m(-0.08), 2.2 * S, 0.16 * S); else g.fillRect(m(-0.08), m(p), 0.16 * S, 2.2 * S);
    }
  };
  tracejado(true); tracejado(false);
  g.fillStyle = 'rgba(230,230,230,0.8)';
  for (const [cx, cz, horiz] of [[0, 8, true], [0, -8, true], [8, 0, false], [-8, 0, false]]) {
    for (let k = -4; k <= 4; k++) {
      if (horiz) g.fillRect(m(cx + k * 0.9 - 0.3), m(cz - 1.4), 0.55 * S, 2.8 * S);
      else g.fillRect(m(cx - 1.4), m(cz + k * 0.9 - 0.3), 2.8 * S, 0.55 * S);
    }
  }
  // desgaste por cima das faixas
  ruido(g, px, px, 0.12, px * px / 90);
  // rachaduras
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.2;
  for (let i = 0; i < 90; i++) {
    let x = Math.random() * px, y = Math.random() * px;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < 7; j++) { x += rand(-1, 1) * S * 1.2; y += rand(-1, 1) * S * 1.2; g.lineTo(x, y); }
    g.stroke();
  }
  // bueiros
  for (let i = 0; i < 10; i++) {
    const x = rand(px * 0.15, px * 0.85), y = rand(px * 0.15, px * 0.85), r = S * 0.45;
    g.fillStyle = '#1c1c1c'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = '#444'; g.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(x - r * 0.8, y + k * r * 0.3); g.lineTo(x + r * 0.8, y + k * r * 0.3); g.stroke(); }
  }
  // poças d'água (escuras e lisas: refletem a luz)
  for (let i = 0; i < 26; i++) {
    const x = rand(0.1, 0.9) * px, y = rand(0.1, 0.9) * px, rx = rand(0.8, 2.6) * S, ry = rx * rand(0.4, 0.9), rot = rand(0, 3);
    g.fillStyle = 'rgba(8,10,14,0.55)'; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill();
    gr.fillStyle = '#181818'; gr.beginPath(); gr.ellipse(x, y, rx, ry, rot, 0, 7); gr.fill();
  }
  // manchas de óleo e sangue velho
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * px, y = Math.random() * px, r = rand(0.5, 2.2) * S;
    const sangue = Math.random() < 0.55;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, sangue ? 'rgba(70,4,4,0.75)' : 'rgba(5,5,5,0.6)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  // marcas de pneu
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = S * 0.18;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * px, y = Math.random() * px, a = rand(0, 6), l = rand(4, 10) * S;
    for (const off of [-0.8, 0.8]) {
      g.beginPath(); g.moveTo(x + Math.cos(a + 1.57) * off * S, y + Math.sin(a + 1.57) * off * S);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rand(-S, S), y + Math.sin(a) * l * 0.5 + rand(-S, S), x + Math.cos(a) * l + Math.cos(a + 1.57) * off * S, y + Math.sin(a) * l + Math.sin(a + 1.57) * off * S);
      g.stroke();
    }
  }
  if (tema === 'ninho') {
    // veias orgânicas da infecção
    g.strokeStyle = 'rgba(120,30,140,0.55)'; g.lineWidth = 3;
    for (let i = 0; i < 60; i++) {
      let x = Math.random() * px, y = Math.random() * px;
      g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 14; j++) { x += rand(-1, 1) * S; y += rand(-1, 1) * S; g.lineTo(x, y); }
      g.stroke();
    }
  }
  if (tema === 'lab' || tema === 'base') {
    // faixas de perigo pintadas
    for (let i = 0; i < 6; i++) {
      const x = rand(0.2, 0.8) * px, y = rand(0.2, 0.8) * px;
      g.save(); g.translate(x, y); g.rotate(rand(0, 3));
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? '#111' : T.linha; g.fillRect(k * S * 0.5, 0, S * 0.5, S * 0.8); }
      g.restore();
    }
  }
  const map = tex(c, false), rough = new THREE.CanvasTexture(cr);
  rough.anisotropy = 8;
  return { map, roughnessMap: rough };
}

// ------------------------------------------------------------------ clima por zona
export function criarClima(cena, tema, qual, extraVermelho) {
  const N = qual === 'baixo' ? 180 : qual === 'medio' ? 380 : 650;
  const R = 26, H = 18;
  const chuva = tema === 'base';
  const cfg = {
    suburbio: { cor: 0xbfc8d8, tam: 0.08, vel: [-0.3, -0.6], aditivo: false, opac: 0.5 },
    centro: { cor: 0xff7a20, tam: 0.12, vel: [0.6, 1.6], aditivo: true, opac: 0.9 },
    lab: { cor: 0x60ff90, tam: 0.12, vel: [-0.15, 0.25], aditivo: true, opac: 0.8 },
    ninho: { cor: 0xd060ff, tam: 0.13, vel: [-0.15, 0.3], aditivo: true, opac: 0.8 },
    base: { cor: 0x9ab0c8, tam: 0, vel: [-22, -16], aditivo: false, opac: 0.35 },
  }[tema];
  if (extraVermelho) { cfg.cor = 0xff3a20; cfg.aditivo = true; cfg.opac = 0.85; }
  const pos = new Float32Array(N * (chuva ? 6 : 3));
  const vel = new Float32Array(N), fase = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = rand(-R, R), y = rand(0, H), z = rand(-R, R);
    if (chuva) { pos.set([x, y, z, x + 0.05, y + 0.7, z], i * 6); } else pos.set([x, y, z], i * 3);
    vel[i] = rand(cfg.vel[0], cfg.vel[1]); fase[i] = Math.random() * 10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  let obj;
  if (chuva) {
    obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: cfg.cor, transparent: true, opacity: cfg.opac, depthWrite: false }));
  } else {
    obj = new THREE.Points(geo, new THREE.PointsMaterial({
      color: cfg.cor, size: cfg.tam, map: texSuave('rgb(255,255,255)'), transparent: true, opacity: cfg.opac, depthWrite: false,
      blending: cfg.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true,
    }));
  }
  obj.frustumCulled = false;
  cena.add(obj);
  let t = 0;
  return {
    update(dt, cam) {
      t += dt;
      const p = geo.attributes.position.array;
      const passo = chuva ? 6 : 3;
      for (let i = 0; i < N; i++) {
        const k = i * passo;
        let x = p[k], y = p[k + 1], z = p[k + 2];
        y += vel[i] * dt;
        if (!chuva) { x += Math.sin(t * 0.7 + fase[i]) * 0.3 * dt; z += Math.cos(t * 0.5 + fase[i]) * 0.3 * dt; }
        // recicla em volta da câmera
        if (y < 0) y += H; if (y > H) y -= H;
        if (x - cam.x > R) x -= 2 * R; if (x - cam.x < -R) x += 2 * R;
        if (z - cam.z > R) z -= 2 * R; if (z - cam.z < -R) z += 2 * R;
        p[k] = x; p[k + 1] = y; p[k + 2] = z;
        if (chuva) { p[k + 3] = x + 0.05; p[k + 4] = y + 0.7; p[k + 5] = z; }
      }
      geo.attributes.position.needsUpdate = true;
    },
    chuva,
  };
}

// névoa rasteira (sprites grandes e transparentes em volta do jogador)
export function criarNevoa(cena, cor, qual) {
  if (qual === 'baixo') return { update() {} };
  const n = qual === 'alto' ? 26 : 16;
  const mapa = texNuvemSuave();
  const lista = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mapa, color: cor, transparent: true, opacity: rand(0.25, 0.45), depthWrite: false, fog: true }));
    const tam = rand(7, 13);
    s.scale.set(tam, tam * 0.45, 1);
    s.position.set(rand(-24, 24), rand(0.4, 1.4), rand(-24, 24));
    s.userData.v = rand(0.2, 0.6);
    cena.add(s);
    lista.push(s);
  }
  return {
    update(dt, cam) {
      for (const s of lista) {
        s.position.x += s.userData.v * dt;
        if (s.position.x - cam.x > 26) s.position.x -= 52; if (s.position.x - cam.x < -26) s.position.x += 52;
        if (s.position.z - cam.z > 26) s.position.z -= 52; if (s.position.z - cam.z < -26) s.position.z += 52;
      }
    },
  };
}

// ------------------------------------------------------------------ marcas: sangue no chão, furos de bala e fumaça
function texSangue() {
  const [c, g] = canvas(128, 128);
  for (let i = 0; i < 14; i++) {
    const x = 64 + rand(-34, 34), y = 64 + rand(-34, 34), r = rand(6, 26);
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(90,0,0,0.95)'); gr.addColorStop(0.7, 'rgba(60,0,0,0.85)'); gr.addColorStop(1, 'rgba(40,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(80,0,0,0.9)'; g.beginPath(); g.arc(64 + rand(-60, 60), 64 + rand(-60, 60), rand(1, 3), 0, 7); g.fill(); }
  return tex(c, false);
}
function texFuro() {
  const [c, g] = canvas(32, 32);
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 15);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.35, 'rgba(20,20,20,0.9)'); gr.addColorStop(0.6, 'rgba(60,55,50,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  return tex(c, false);
}
export function criarMarcas(cena, qual) {
  const nSangue = qual === 'baixo' ? 20 : 45, nFuro = qual === 'baixo' ? 30 : 80;
  const texS = [texSangue(), texSangue(), texSangue()];
  const geo = new THREE.PlaneGeometry(1, 1);
  const sangues = [], furos = [], fumacas = [];
  for (let i = 0; i < nSangue; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: texS[i % 3], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 1;
    cena.add(m); sangues.push(m);
  }
  const matFuro = new THREE.MeshBasicMaterial({ map: texFuro(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  for (let i = 0; i < nFuro; i++) {
    const m = new THREE.Mesh(geo, matFuro);
    m.scale.setScalar(0.14); m.visible = false;
    cena.add(m); furos.push(m);
  }
  const texFum = texSuave('rgb(200,200,200)');
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFum, color: 0x9a9a9a, transparent: true, opacity: 0, depthWrite: false }));
    s.visible = false; cena.add(s); fumacas.push({ s, vida: 0, v: 0 });
  }
  let iS = 0, iF = 0, iM = 0;
  const alvo = new THREE.Vector3();
  return {
    sangue(x, z, tam = 1.4) {
      const m = sangues[iS]; iS = (iS + 1) % sangues.length;
      m.position.set(x, 0.015 + iS * 0.0002, z); m.rotation.z = Math.random() * 6.28;
      m.scale.setScalar(tam * rand(0.8, 1.3)); m.visible = true;
    },
    furo(x, y, z, nx, ny, nz) {
      const m = furos[iF]; iF = (iF + 1) % furos.length;
      m.position.set(x + nx * 0.01, y + ny * 0.01, z + nz * 0.01);
      m.lookAt(alvo.set(x + nx, y + ny, z + nz));
      m.visible = true;
    },
    fumaca(x, y, z, tam = 0.5) {
      const f = fumacas[iM]; iM = (iM + 1) % fumacas.length;
      f.s.position.set(x, y, z); f.s.scale.setScalar(tam); f.vida = 1; f.v = rand(0.4, 0.8); f.s.visible = true;
    },
    update(dt) {
      for (const f of fumacas) {
        if (f.vida <= 0) continue;
        f.vida -= dt * 1.3;
        f.s.position.y += f.v * dt;
        f.s.scale.multiplyScalar(1 + dt * 1.6);
        f.s.material.opacity = Math.max(0, f.vida) * 0.35;
        if (f.vida <= 0) f.s.visible = false;
      }
    },
  };
}

// ------------------------------------------------------------------ objetos do cenário
const geoB = new THREE.BoxGeometry(1, 1, 1);
const geoC = new THREE.CylinderGeometry(0.5, 0.5, 1, 12);
function bx(mat, w, h, d, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geoB, mat); m.scale.set(w, h, d); m.position.set(x, y, z); return m; }
function cil(mat, r, h, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geoC, mat); m.scale.set(r * 2, h, r * 2); m.position.set(x, y, z); return m; }
const M = {
  areia: new THREE.MeshLambertMaterial({ color: 0x8a7a54 }),
  areia2: new THREE.MeshLambertMaterial({ color: 0x7a6a46 }),
  laranja: new THREE.MeshLambertMaterial({ color: 0xe05a10 }),
  branco: new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }),
  preto: new THREE.MeshLambertMaterial({ color: 0x141414 }),
  verde: new THREE.MeshLambertMaterial({ color: 0x2a4a2a }),
  metal: new THREE.MeshLambertMaterial({ color: 0x4a5058 }),
  roupa: new THREE.MeshLambertMaterial({ color: 0x3a3440 }),
  pele: new THREE.MeshLambertMaterial({ color: 0x8a7a6a }),
  sangue: new THREE.MeshLambertMaterial({ color: 0x4a0606 }),
  vermelho: new THREE.MeshBasicMaterial({ color: 0xff2020 }),
  azul: new THREE.MeshBasicMaterial({ color: 0x2060ff }),
  roxo: new THREE.MeshLambertMaterial({ color: 0x5a1a6a, emissive: 0x30083a }),
  roxoBrilho: new THREE.MeshBasicMaterial({ color: 0xe060ff }),
  verdeBrilho: new THREE.MeshBasicMaterial({ color: 0x60ff80 }),
};
export function sacosDeAreia(comprimento) {
  const g = new THREE.Group();
  for (let fila = 0; fila < 3; fila++) {
    const n = Math.floor(comprimento / 0.62);
    for (let i = 0; i < n; i++) {
      const s = bx(Math.random() < 0.5 ? M.areia : M.areia2, 0.6, 0.3, 0.42, -comprimento / 2 + 0.31 + i * 0.62 + (fila % 2 ? 0.3 : 0), 0.15 + fila * 0.3, rand(-0.03, 0.03));
      s.rotation.y = rand(-0.08, 0.08);
      if (!(fila % 2 && i === n - 1)) g.add(s);
    }
  }
  return g;
}
export function cone() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.55, 10), M.laranja); c.position.y = 0.3; g.add(c);
  g.add(bx(M.laranja, 0.36, 0.04, 0.36, 0, 0.02, 0));
  const f = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10), M.branco); f.position.y = 0.33; g.add(f);
  return g;
}
export function sacoLixo() {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.preto);
  s.scale.set(1, rand(0.7, 1), rand(0.8, 1.1)); s.position.y = 0.22;
  const g = new THREE.Group(); g.add(s); return g;
}
export function cacamba() {
  const g = new THREE.Group();
  g.add(bx(M.verde, 2.0, 1.1, 1.2, 0, 0.6, 0));
  const tampa = bx(M.verde, 2.0, 0.06, 1.25, 0, 1.2, -0.1); tampa.rotation.x = -0.4; g.add(tampa);
  for (let i = 0; i < 3; i++) { const s = sacoLixo(); s.position.set(rand(-0.6, 0.6), 0.9, rand(-0.2, 0.2)); g.add(s); }
  return g;
}
export function cadaver() {
  const g = new THREE.Group();
  const roupa = new THREE.MeshLambertMaterial({ color: escolher([0x3a3440, 0x4a2a2a, 0x2a3a4a, 0x5a5a4a]) });
  g.add(bx(roupa, 0.5, 0.25, 0.75, 0, 0.13, 0));
  g.add(bx(M.pele, 0.28, 0.26, 0.28, 0, 0.14, -0.55));
  const b1 = bx(M.pele, 0.13, 0.12, 0.6, 0.38, 0.08, -0.1); b1.rotation.y = 0.5;
  const b2 = bx(M.pele, 0.13, 0.12, 0.6, -0.36, 0.08, 0.05); b2.rotation.y = -0.3;
  const p2 = bx(M.roupa, 0.18, 0.16, 0.8, -0.14, 0.09, 0.72); p2.rotation.y = 0.2;
  g.add(b1, b2, bx(M.roupa, 0.18, 0.16, 0.8, 0.12, 0.09, 0.75), p2);
  const poca = new THREE.Mesh(new THREE.CircleGeometry(rand(0.6, 1.1), 12), M.sangue);
  poca.rotation.x = -Math.PI / 2; poca.position.y = 0.012; g.add(poca);
  return g;
}
export function barrilFogo() {
  const g = new THREE.Group();
  g.add(cil(new THREE.MeshLambertMaterial({ color: 0x3a2a20 }), 0.32, 0.9, 0, 0.45, 0));
  const luz = new THREE.PointLight(0xff7020, 18, 11, 1.4); luz.position.y = 1.4; g.add(luz);
  g.userData.luz = luz;
  return g;
}
export function viatura() {
  const g = new THREE.Group();
  const branco = new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }), preto = new THREE.MeshLambertMaterial({ color: 0x151515 });
  g.add(bx(preto, 4.3, 0.55, 1.9, 0, 0.55, 0));
  g.add(bx(branco, 2.0, 0.42, 1.92, 0, 0.62, 0));
  g.add(bx(branco, 2.2, 0.55, 1.75, -0.2, 1.15, 0));
  g.add(bx(new THREE.MeshLambertMaterial({ color: 0x0a0e14 }), 2.25, 0.4, 1.78, -0.2, 1.17, 0));
  const vermelho = bx(M.vermelho, 0.5, 0.14, 0.3, -0.2, 1.5, -0.35), azul = bx(M.azul, 0.5, 0.14, 0.3, -0.2, 1.5, 0.35);
  g.add(vermelho, azul, bx(preto, 0.3, 0.12, 0.3, -0.2, 1.5, 0));
  const roda = new THREE.CylinderGeometry(0.36, 0.36, 0.25, 10);
  for (const [x, z] of [[1.35, 0.85], [-1.35, 0.85], [1.35, -0.85], [-1.35, -0.85]]) { const r = new THREE.Mesh(roda, preto); r.rotation.x = Math.PI / 2; r.position.set(x, 0.36, z); g.add(r); }
  const luz = new THREE.PointLight(0xff2020, 20, 14, 1.4); luz.position.set(-0.2, 2.0, 0); g.add(luz);
  g.userData = { luz, vermelho, azul };
  return g;
}
export function tumor(cor = 'roxo') {
  const g = new THREE.Group();
  const n = Math.floor(rand(3, 6));
  for (let i = 0; i < n; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(rand(0.25, 0.6), 10, 8), M.roxo);
    s.position.set(rand(-0.6, 0.6), rand(0.1, 0.5), rand(-0.6, 0.6)); g.add(s);
    if (Math.random() < 0.6) { const b = new THREE.Mesh(new THREE.SphereGeometry(rand(0.06, 0.12), 6, 5), cor === 'roxo' ? M.roxoBrilho : M.verdeBrilho); b.position.copy(s.position).add(new THREE.Vector3(0, s.scale.y * 0.4, 0.2)); g.add(b); }
  }
  return g;
}
export function tamborQuimico() {
  const g = new THREE.Group();
  const corpo = cil(new THREE.MeshLambertMaterial({ color: 0x2a5a2a }), 0.35, 1.0, 0, 0.5, 0);
  g.add(corpo, cil(M.verdeBrilho, 0.36, 0.08, 0, 0.75, 0));
  const poca = new THREE.Mesh(new THREE.CircleGeometry(0.8, 14), new THREE.MeshBasicMaterial({ color: 0x40e060, transparent: true, opacity: 0.6 }));
  poca.rotation.x = -Math.PI / 2; poca.position.set(0.5, 0.013, 0.3); g.add(poca);
  return g;
}
export function poste(quebrado) {
  const g = new THREE.Group();
  g.add(cil(M.metal, 0.09, 6, 0, 3, 0));
  const braco = bx(M.metal, 1.4, 0.1, 0.1, 0.6, 5.95, 0); g.add(braco);
  const lamp = bx(quebrado ? M.preto : new THREE.MeshBasicMaterial({ color: 0xffe0a0 }), 0.6, 0.12, 0.3, 1.2, 5.88, 0); g.add(lamp);
  g.userData.lamp = lamp;
  if (quebrado) g.rotation.z = rand(-0.12, 0.12);
  return g;
}
export function cercaArame(comprimento) {
  const g = new THREE.Group();
  const [c, gg] = canvas(64, 64);
  gg.strokeStyle = '#9aa0a6'; gg.lineWidth = 2;
  for (let i = -64; i < 128; i += 12) { gg.beginPath(); gg.moveTo(i, 0); gg.lineTo(i + 64, 64); gg.stroke(); gg.beginPath(); gg.moveTo(i + 64, 0); gg.lineTo(i, 64); gg.stroke(); }
  const t = tex(c); t.repeat.set(comprimento / 1.2, 2);
  const tela = new THREE.Mesh(new THREE.PlaneGeometry(comprimento, 2.2), new THREE.MeshLambertMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }));
  tela.position.y = 1.2; g.add(tela);
  for (let x = -comprimento / 2; x <= comprimento / 2 + 0.01; x += 2.5) g.add(cil(M.metal, 0.04, 2.4, x, 1.2, 0));
  return g;
}

export const MATS = M;
