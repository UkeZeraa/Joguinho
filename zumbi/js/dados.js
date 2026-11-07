// Dados do jogo: tiers, armas, zonas, zumbis e o save (localStorage).

export const TIERS = [
  { id: 'comum',    nome: 'Comum',    cor: '#a7adb4', mult: 1.00, venda: 40 },
  { id: 'incomum',  nome: 'Incomum',  cor: '#3fd35e', mult: 1.18, venda: 110 },
  { id: 'raro',     nome: 'Raro',     cor: '#3c8dff', mult: 1.40, venda: 300 },
  { id: 'epico',    nome: 'Épico',    cor: '#b44dff', mult: 1.70, venda: 800 },
  { id: 'lendario', nome: 'Lendário', cor: '#ffa020', mult: 2.10, venda: 2200 },
  { id: 'mitico',   nome: 'Mítico',   cor: '#ff2f4a', mult: 2.70, venda: 6000 },
];

// Vantagens desbloqueadas por tier
export const PERKS = [
  [],
  ['Recarga rápida'],
  ['Recarga rápida', 'Perfurante (1 zumbi)'],
  ['Recarga rápida', 'Perfurante (1 zumbi)', 'Balas incendiárias'],
  ['Recarga rápida', 'Perfurante (2 zumbis)', 'Balas incendiárias'],
  ['Recarga rápida', 'Perfurante (2 zumbis)', 'Balas incendiárias', 'Balas explosivas', 'Roubo de vida'],
];

// slot: 'primaria' | 'secundaria'
export const TIPOS = {
  pistola:      { nome: 'Pistola',        slot: 'secundaria', dano: 26, rpm: 320, auto: false, pente: 12,  recarga: 1.2, disp: 0.012, alcance: 45, projeteis: 1, recuo: 0.020, zoom: 1.25, modelos: ['M9', 'Glock 17', 'Desert Hawk', 'P250'] },
  submetralhadora: { nome: 'Submetralhadora', slot: 'secundaria', dano: 15, rpm: 820, auto: true,  pente: 30,  recarga: 1.8, disp: 0.034, alcance: 32, projeteis: 1, recuo: 0.010, zoom: 1.3, modelos: ['MP5', 'Vector', 'UZI', 'P90'] },
  fuzil:        { nome: 'Fuzil de Assalto', slot: 'primaria', dano: 28, rpm: 600, auto: true,  pente: 30,  recarga: 2.2, disp: 0.018, alcance: 70, projeteis: 1, recuo: 0.014, zoom: 1.6, modelos: ['AK-47', 'M4A1', 'SCAR-H', 'FAL'] },
  escopeta:     { nome: 'Escopeta',       slot: 'primaria',   dano: 16, rpm: 75,  auto: false, pente: 6,   recarga: 2.6, disp: 0.085, alcance: 22, projeteis: 9, recuo: 0.060, zoom: 1.2, modelos: ['Pump 870', 'SPAS-12', 'Boa Noite', 'AA-12'] },
  sniper:       { nome: 'Sniper',         slot: 'primaria',   dano: 160, rpm: 45, auto: false, pente: 5,   recarga: 3.0, disp: 0.002, alcance: 140, projeteis: 1, recuo: 0.070, zoom: 4.0, modelos: ['AWP', 'Barrett', 'Dragunov', 'M24'] },
  metralhadora: { nome: 'Metralhadora',   slot: 'primaria',   dano: 22, rpm: 760, auto: true,  pente: 100, recarga: 4.2, disp: 0.042, alcance: 60, projeteis: 1, recuo: 0.012, zoom: 1.4, lenta: 0.85, modelos: ['M249', 'PKM', 'Minimi', 'RPK'] },
};

const APELIDOS = [
  [''],
  ['Veterana', 'Tática', 'Reforçada', 'Batida'],
  ['Falcão', 'Cobalto', 'Lâmina', 'Sentinela'],
  ['Víbora', 'Tempestade', 'Corvo', 'Eclipse'],
  ['Fênix', 'Titã', 'Lobo Alfa', 'Dragão'],
  ['Apocalipse', 'Ragnarök', 'Fim dos Tempos', 'Ceifadora'],
];

export const CAMOS = [
  { id: 'padrao',   nome: 'Padrão',   cor: '#2b2e33', preco: 0 },
  { id: 'deserto',  nome: 'Deserto',  cor: '#9c8456', preco: 250 },
  { id: 'floresta', nome: 'Floresta', cor: '#3f5a34', preco: 250 },
  { id: 'urbano',   nome: 'Urbano',   cor: '#6b7078', preco: 250 },
  { id: 'sangue',   nome: 'Sangue',   cor: '#6a1414', preco: 600 },
  { id: 'gelo',     nome: 'Gelo',     cor: '#a8d4e6', preco: 600 },
  { id: 'ouro',     nome: 'Ouro',     cor: '#d4a52a', preco: 2500 },
  { id: 'obsidiana',nome: 'Obsidiana',cor: '#120c1a', preco: 2500 },
];

export const COLETES = [
  { id: 'nenhum', nome: 'Sem colete',      armadura: 0,   preco: 0 },
  { id: 'leve',   nome: 'Colete Leve',     armadura: 30,  preco: 500 },
  { id: 'medio',  nome: 'Colete Tático',   armadura: 60,  preco: 1500 },
  { id: 'pesado', nome: 'Colete Pesado',   armadura: 100, preco: 3500 },
  { id: 'jugger', nome: 'Armadura Juggernaut', armadura: 160, preco: 9000 },
];

export const CONSUMIVEIS = {
  granadas: { nome: 'Granada', preco: 150, max: 5, icone: '💣', desc: 'Explode em área. Ótima contra hordas e armaduras.' },
  kits:     { nome: 'Kit Médico', preco: 200, max: 5, icone: '✚', desc: 'Recupera 60 de vida.' },
  torretas: { nome: 'Torreta Sentinela', preco: 600, max: 2, icone: '⚙', desc: 'Atira sozinha nos zumbis por 30 segundos.' },
};

export const CAIXAS = [
  { id: 'sup', nome: 'Caixa de Suprimentos', preco: 300,  pesos: [55, 28, 12, 4, 0.9, 0.1] },
  { id: 'mil', nome: 'Caixa Militar',        preco: 1200, pesos: [0, 45, 32, 16, 6, 1] },
  { id: 'bio', nome: 'Caixa Biológica',      preco: 4000, pesos: [0, 0, 40, 35, 20, 5] },
];

// pool: tipo -> [onda mínima, peso inicial, peso extra por onda]
export const ZONAS = [
  { id: 'suburbio', nome: 'Subúrbio Abandonado', dif: 1.0, ondas: 5, recompensa: 1.0,
    descricao: 'Ruas vazias e poucos infectados. Bom para começar.',
    neblina: 0x1b2530, chao: '#3a3f44', ceu: 0x0b1018, luz: 0x8fa8ff,
    loot: [60, 28, 9, 2.5, 0.45, 0.05], chefes: ['acougueiro'],
    pool: { errante: [1, 1, 0], corredor: [2, 0.3, 0.05], rastejante: [2, 0.2, 0.03], cuspidor: [3, 0.2, 0], inchado: [3, 0.15, 0], blindado: [4, 0.1, 0.03], bruto: [4, 0.07, 0.01] } },
  { id: 'centro', nome: 'Centro em Chamas', dif: 1.6, ondas: 7, recompensa: 1.8,
    descricao: 'Carros pegando fogo, escudeiros e gritadores.',
    neblina: 0x2a1812, chao: '#34302d', ceu: 0x170a06, luz: 0xffa070,
    loot: [35, 35, 18, 8, 3.5, 0.5], chefes: ['chefe'],
    pool: { errante: [1, 1, 0], corredor: [1, 0.4, 0.05], rastejante: [2, 0.2, 0.02], cuspidor: [2, 0.2, 0], inchado: [3, 0.18, 0], escudeiro: [3, 0.15, 0.02], blindado: [3, 0.12, 0.03], gritador: [4, 0.08, 0.01], toxico: [5, 0.1, 0.02], bruto: [4, 0.08, 0.01] } },
  { id: 'lab', nome: 'Laboratório X-13', dif: 2.4, ondas: 10, recompensa: 3.0,
    descricao: 'Onde tudo começou. Espectros invisíveis e dois chefes no final.',
    neblina: 0x0d2216, chao: '#2c3530', ceu: 0x03100a, luz: 0x70ffa0,
    loot: [10, 30, 30, 18, 9, 3], chefes: ['chefe', 'acougueiro'],
    pool: { errante: [1, 0.8, 0], corredor: [1, 0.4, 0.04], espectro: [2, 0.15, 0.03], toxico: [3, 0.15, 0.02], cuspidor: [2, 0.2, 0], inchado: [2, 0.15, 0], gritador: [3, 0.1, 0.01], escudeiro: [4, 0.12, 0.02], blindado: [3, 0.15, 0.03], bruto: [3, 0.1, 0.01], rastejante: [2, 0.2, 0.02] } },
  { id: 'base', nome: 'Base Militar Caída', dif: 3.2, ondas: 10, recompensa: 4.5, requer: 'lab',
    descricao: 'Soldados infectados com colete e escudo. O Colosso Blindado guarda a base.',
    neblina: 0x1c1f14, chao: '#3a3a2c', ceu: 0x0a0c06, luz: 0xd8e090,
    loot: [0, 22, 34, 25, 14, 5], chefes: ['colosso'],
    pool: { errante: [1, 0.5, 0], blindado: [1, 0.5, 0.05], escudeiro: [1, 0.35, 0.04], corredor: [1, 0.3, 0.03], gritador: [2, 0.1, 0.01], bruto: [2, 0.15, 0.02], inchado: [2, 0.15, 0], toxico: [4, 0.1, 0.02], espectro: [5, 0.1, 0.02] } },
  { id: 'ninho', nome: 'Ninho da Rainha', dif: 4.2, ondas: 12, recompensa: 6.5, requer: 'base',
    descricao: 'O coração da infecção. Gás tóxico, espectros e a Rainha Infectada.',
    neblina: 0x1e0c22, chao: '#2e2430', ceu: 0x0c0310, luz: 0xd080ff,
    loot: [0, 10, 30, 32, 20, 8], chefes: ['rainha'],
    pool: { errante: [1, 0.4, 0], rastejante: [1, 0.5, 0.04], espectro: [1, 0.3, 0.04], toxico: [1, 0.3, 0.03], cuspidor: [1, 0.3, 0.02], inchado: [1, 0.25, 0.01], gritador: [2, 0.12, 0.01], blindado: [2, 0.25, 0.03], escudeiro: [3, 0.2, 0.02], bruto: [3, 0.15, 0.02] } },
];

// Modificadores que deixam a raid mais difícil em troca de mais recompensa
export const MODIFICADORES = [
  { id: 'lua', nome: 'Lua de Sangue', icone: '🌕', bonus: 0.5, desc: 'Zumbis com +60% de vida. Céu vermelho.' },
  { id: 'frenesi', nome: 'Frenesi', icone: '⚡', bonus: 0.4, desc: 'Zumbis 30% mais rápidos e com mais força.' },
  { id: 'blindagem', nome: 'Blindagem Total', icone: '🛡', bonus: 0.5, desc: 'Todos os zumbis usam colete.' },
  { id: 'elite', nome: 'Caçada de Elite', icone: '👑', bonus: 0.4, desc: 'Muitos zumbis de Elite (dourados, 3× vida, sempre soltam arma).' },
  { id: 'escuridao', nome: 'Escuridão', icone: '🌑', bonus: 0.35, desc: 'Neblina fechada e lanterna fraca.' },
];

export const ZUMBIS = {
  errante:  { nome: 'Errante', hp: 100, vel: 2.1, dano: 12, raio: 0.42, escala: 1.0, grana: 10, pele: 0x6f8a62, olho: 0xffd23a,
    desc: 'O infectado comum. Lento, mas sempre em bando.', dica: 'Mire na cabeça: dano dobrado.' },
  corredor: { nome: 'Corredor', hp: 60, vel: 5.0, dano: 8, raio: 0.38, escala: 0.92, grana: 14, pele: 0x8f9a7a, olho: 0xff3a3a,
    desc: 'Rápido e frágil. Chega antes que você perceba.', dica: 'Escopetas e submetralhadoras resolvem.' },
  rastejante: { nome: 'Rastejante', hp: 70, vel: 3.4, dano: 10, raio: 0.4, escala: 1.0, grana: 15, pele: 0x7a7a5a, olho: 0xff5a5a,
    desc: 'Se arrasta pelo chão. Difícil de acertar.', dica: 'Mire para baixo ou use o facão.' },
  cuspidor: { nome: 'Cuspidor', hp: 90, vel: 2.0, dano: 14, raio: 0.42, escala: 1.0, grana: 18, pele: 0x7fbf3a, olho: 0x9cff3a,
    desc: 'Cospe ácido de longe.', dica: 'Desvie da bola verde andando para o lado.' },
  inchado:  { nome: 'Inchado', hp: 80, vel: 2.7, dano: 40, raio: 0.6, escala: 1.05, grana: 16, pele: 0xb0a65a, olho: 0xffa020,
    desc: 'Explode quando chega perto (ou quando morre).', dica: 'Mate de longe, de preferência no meio da horda.' },
  blindado: { nome: 'Blindado', hp: 220, vel: 1.9, dano: 18, raio: 0.5, escala: 1.1, grana: 35, pele: 0x5e6e58, olho: 0xff8a20,
    armadura: 260, capacete: 110,
    desc: 'Soldado infectado com colete e capacete. As balas quase não passam.', dica: 'Explosões e armas Perfurantes destroem a armadura. Fogo ignora a armadura.' },
  escudeiro: { nome: 'Escudeiro', hp: 180, vel: 2.0, dano: 16, raio: 0.5, escala: 1.05, grana: 32, pele: 0x6a7a62, olho: 0x40c0ff,
    escudo: 700,
    desc: 'Carrega um escudo antimotim que bloqueia tiros pela frente.', dica: 'Acerte a cabeça, ataque pelos lados, use granada ou facão.' },
  gritador: { nome: 'Gritador', hp: 120, vel: 2.6, dano: 6, raio: 0.4, escala: 0.95, grana: 40, pele: 0xa08a8a, olho: 0xffffff,
    desc: 'Fica longe e grita: fortalece a horda e chama reforços.', dica: 'Prioridade máxima! Mate antes do próximo grito.' },
  espectro: { nome: 'Espectro', hp: 140, vel: 3.3, dano: 20, raio: 0.42, escala: 1.0, grana: 40, pele: 0x8a9aa8, olho: 0x80e0ff,
    desc: 'Quase invisível até chegar perto. Só os olhos brilham.', dica: 'Procure os olhos azuis no escuro. Acertar revela o espectro.' },
  toxico:   { nome: 'Tóxico', hp: 160, vel: 1.8, dano: 10, raio: 0.5, escala: 1.05, grana: 30, pele: 0x8ab030, olho: 0xd0ff40,
    desc: 'Solta nuvens de gás venenoso por onde passa.', dica: 'Não fique parado no gás verde. Mate de longe.' },
  bruto:    { nome: 'Brutamontes', hp: 650, vel: 1.6, dano: 30, raio: 0.75, escala: 1.6, grana: 60, pele: 0x5a6a5a, olho: 0xff5020,
    desc: 'Enorme e resistente. Bate muito forte.', dica: 'Mantenha distância e descarregue o pente.' },
  // ----- chefes -----
  acougueiro: { nome: 'Açougueiro', boss: true, hp: 3800, vel: 2.6, dano: 35, raio: 0.9, escala: 1.9, grana: 500, pele: 0x9a7a6a, olho: 0xff2a00,
    desc: 'Chefe. Avança em investidas com o cutelo.', dica: 'Saia da frente quando ele brilhar. Se ele bater numa parede, fica tonto e leva mais dano.' },
  chefe:    { nome: 'Abominação', boss: true, hp: 5000, vel: 2.5, dano: 45, raio: 1.2, escala: 2.5, grana: 600, pele: 0x7a3040, olho: 0xff0030,
    desc: 'Chefe. Com metade da vida fica furiosa, chama corredores e cospe ácido.', dica: 'Guarde granadas para a segunda fase.' },
  colosso:  { nome: 'Colosso Blindado', boss: true, hp: 7000, vel: 1.7, dano: 50, raio: 1.3, escala: 2.7, grana: 900, pele: 0x4a5048, olho: 0xffa000,
    armadura: 5000,
    desc: 'Chefe. Coberto de blindagem, com um núcleo brilhante nas costas.', dica: 'PULE as ondas de choque! Tiros nas costas causam dano crítico.' },
  rainha:   { nome: 'Rainha Infectada', boss: true, hp: 9000, vel: 2.0, dano: 40, raio: 1.1, escala: 2.3, grana: 1200, pele: 0x6a3a7a, olho: 0xff40ff,
    desc: 'Chefe final. Lança rajadas de ácido e invoca a ninhada.', dica: 'Corra em círculos e mate a ninhada rápido.' },
};

export const BOSS_PESOS = [0, 0, 0, 60, 32, 8];

// ---------- perícias (árvore de habilidades) ----------
export const PERICIAS = [
  { id: 'vida', nome: 'Vigor', icone: '❤', max: 5, desc: '+15 de vida máxima por nível' },
  { id: 'resistencia', nome: 'Couro Duro', icone: '🛡', max: 5, desc: '-5% de dano recebido por nível' },
  { id: 'regen', nome: 'Regeneração', icone: '♻', max: 5, desc: 'Recupera 1 de vida/s por nível (sem levar dano por 4s)' },
  { id: 'recarga', nome: 'Mãos Rápidas', icone: '⟳', max: 5, desc: '-8% no tempo de recarga por nível' },
  { id: 'critico', nome: 'Olho de Águia', icone: '🎯', max: 5, desc: '+12% de dano de headshot por nível' },
  { id: 'facao', nome: 'Açougue', icone: '🔪', max: 5, desc: '+40% de dano do facão por nível' },
  { id: 'esquiva', nome: 'Reflexos', icone: '»', max: 5, desc: '-15% no tempo de recarga da esquiva por nível' },
  { id: 'velocidade', nome: 'Pernas Leves', icone: '👟', max: 5, desc: '+4% de velocidade por nível' },
  { id: 'sorte', nome: 'Sortudo', icone: '🍀', max: 5, desc: '+15% de chance de achar armas por nível' },
];
export function xpProximo(nivel) { return Math.round(250 * Math.pow(nivel, 1.35)); }

// ---------- missões (contratos) ----------
const ALVOS_MISSAO = ['errante', 'corredor', 'rastejante', 'cuspidor', 'inchado', 'blindado', 'escudeiro', 'gritador', 'espectro', 'toxico', 'bruto'];
export function gerarMissao(save) {
  const lib = ZONAS.filter(z => zonaLiberada(save, z));
  const nivel = save.nivel || 1;
  const k = 1 + nivel * 0.08;
  const modelos = [
    () => { const t = rnd(ALVOS_MISSAO); const q = Math.round((['bruto', 'gritador', 'espectro'].includes(t) ? 5 : t === 'errante' ? 40 : 15) * k);
      return { tipo: 'matar', alvo: t, qtd: q, desc: `Elimine ${q} ${q > 1 ? plural(ZUMBIS[t].nome) : ZUMBIS[t].nome}`, grana: q * ZUMBIS[t].grana * 2, xp: q * 15 }; },
    () => { const q = Math.round(25 * k); return { tipo: 'headshot', qtd: q, desc: `Faça ${q} headshots`, grana: q * 25, xp: q * 12 }; },
    () => { const q = Math.round(10 * k); return { tipo: 'facao', qtd: q, desc: `Elimine ${q} zumbis com o facão`, grana: q * 50, xp: q * 25 }; },
    () => { const z = rnd(lib); const b = rnd(z.chefes); return { tipo: 'chefe', alvo: b, qtd: 1, desc: `Derrote ${ZUMBIS[b].nome}`, grana: Math.round(ZUMBIS[b].grana * 2.5), xp: 400, arma: true }; },
    () => { const z = rnd(lib); return { tipo: 'extrair', alvo: z.id, qtd: 1, desc: `Extraia com vida de ${z.nome}`, grana: Math.round(400 * z.recompensa), xp: Math.round(250 * z.recompensa) }; },
    () => { const q = 5 + Math.floor(nivel / 2) * 2; return { tipo: 'sobreviver', qtd: q, desc: `Chegue à onda ${q} no modo Sobrevivência`, grana: q * 120, xp: q * 40, arma: q >= 10 }; },
    () => { const q = Math.round(8 * k); return { tipo: 'elite', qtd: q, desc: `Elimine ${q} zumbis de Elite (ligue Caçada de Elite)`, grana: q * 120, xp: q * 40 }; },
  ];
  // evita repetir o mesmo tipo de contrato que já está ativo
  const ativos = new Set((save.missoes || []).map(x => x.tipo));
  let m = rnd(modelos)();
  for (let i = 0; i < 8 && ativos.has(m.tipo); i++) m = rnd(modelos)();
  m.id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  m.progresso = 0;
  return m;
}
export function plural(nome) {
  if (/s$/.test(nome)) return nome;
  if (/[rz]$/.test(nome)) return nome + 'es';
  return nome + 's';
}
export function zonaLiberada(save, z) {
  return !z.requer || (save.zonasExtraidas || []).includes(z.requer);
}

// ---------- utilidades ----------
const rnd = a => a[Math.floor(Math.random() * a.length)];

export function rolarTier(pesos) {
  const total = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pesos.length; i++) {
    r -= pesos[i];
    if (r <= 0 && pesos[i] > 0) return i;
  }
  return pesos.length - 1;
}

let contador = Date.now() % 100000;
export function novaArma(tipo, tier) {
  if (!tipo) tipo = rnd(Object.keys(TIPOS));
  const b = TIPOS[tipo];
  const apelido = rnd(APELIDOS[tier]);
  return {
    uid: 'a' + (contador++).toString(36) + Math.random().toString(36).slice(2, 6),
    tipo, tier,
    nome: b.modelo || (rnd(b.modelos) + (apelido ? ` "${apelido}"` : '')),
    camo: 'padrao',
  };
}

export function stats(arma) {
  const b = TIPOS[arma.tipo], t = TIERS[arma.tier], i = arma.tier;
  return {
    dano: b.dano * t.mult,
    rpm: b.rpm * (1 + 0.06 * i),
    pente: Math.round(b.pente * (1 + 0.12 * i)),
    recarga: b.recarga * (1 - 0.07 * i),
    disp: b.disp * (1 - 0.09 * i),
    alcance: b.alcance * (1 + 0.05 * i),
    projeteis: b.projeteis,
    auto: b.auto,
    recuo: b.recuo * (1 - 0.06 * i),
    zoom: b.zoom,
    lenta: b.lenta || 1,
    perfura: i >= 4 ? 2 : i >= 2 ? 1 : 0,
    fogo: i >= 3,
    explosivo: i >= 5,
    vampiro: i >= 5 ? 0.05 : 0,
  };
}

// Barras de 0..1 para a tela de equipamento
export function barras(arma) {
  const s = stats(arma);
  const dps = s.dano * s.projeteis * s.rpm / 60;
  return {
    Dano: Math.min(1, (s.dano * s.projeteis) / 420),
    'Dano/seg': Math.min(1, dps / 900),
    Cadência: Math.min(1, s.rpm / 1100),
    Precisão: Math.min(1, 1 - s.disp / 0.1),
    Alcance: Math.min(1, s.alcance / 160),
    Pente: Math.min(1, s.pente / 140),
    Recarga: Math.min(1, 1 - s.recarga / 4.6),
  };
}

// ---------- save ----------
const CHAVE = 'zumbi-apocalipse-v1';

function saveInicial() {
  const pistola = novaArma('pistola', 0);
  const fuzil = novaArma('fuzil', 0);
  const smg = novaArma('submetralhadora', 0);
  return {
    grana: 800,
    inv: [pistola, fuzil, smg],
    equip: { primaria: fuzil.uid, secundaria: pistola.uid },
    coletes: ['nenhum'], colete: 'nenhum',
    camos: ['padrao'],
    granadas: 2, kits: 2, torretas: 1,
    xp: 0, nivel: 1, pontos: 0, pericias: {}, missoes: [], zonasExtraidas: [],
    stats: { raids: 0, extracoes: 0, mortes: 0, abates: 0, melhorOnda: 0, melhorSobrevivencia: 0, headshots: 0, porTipo: {} },
    opcoes: { som: true, sens: 1 },
  };
}

export function carregar() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE));
    if (s && Array.isArray(s.inv)) {
      const base = saveInicial();
      return { ...base, ...s, stats: { ...base.stats, ...s.stats }, opcoes: { ...base.opcoes, ...s.opcoes } };
    }
  } catch (e) { /* save corrompido: recomeça */ }
  return saveInicial();
}

export function salvar(s) {
  try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) { /* sem espaço */ }
}

export function resetar() {
  localStorage.removeItem(CHAVE);
  return saveInicial();
}

export function armaPorUid(save, uid) {
  return save.inv.find(a => a.uid === uid) || null;
}

export function fmt(n) {
  return '$' + Math.floor(n).toLocaleString('pt-BR');
}
