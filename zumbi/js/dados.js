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
  granadas: { nome: 'Granada', preco: 150, max: 5 },
  kits:     { nome: 'Kit Médico', preco: 200, max: 5 },
};

// Caixas da loja: pesos para [comum, incomum, raro, épico, lendário, mítico]
export const CAIXAS = [
  { id: 'sup', nome: 'Caixa de Suprimentos', preco: 300,  pesos: [55, 28, 12, 4, 0.9, 0.1] },
  { id: 'mil', nome: 'Caixa Militar',        preco: 1200, pesos: [0, 45, 32, 16, 6, 1] },
  { id: 'bio', nome: 'Caixa Biológica',      preco: 4000, pesos: [0, 0, 40, 35, 20, 5] },
];

export const ZONAS = [
  { id: 'suburbio', nome: 'Subúrbio Abandonado', dif: 1.0, ondas: 5, recompensa: 1.0,
    descricao: 'Ruas vazias e poucos infectados. Bom para começar.',
    neblina: 0x1b2530, chao: '#3a3f44', ceu: 0x0b1018, luz: 0x8fa8ff,
    loot: [60, 28, 9, 2.5, 0.45, 0.05] },
  { id: 'centro', nome: 'Centro em Chamas', dif: 1.6, ondas: 7, recompensa: 1.8,
    descricao: 'Carros pegando fogo e hordas de corredores.',
    neblina: 0x2a1812, chao: '#34302d', ceu: 0x170a06, luz: 0xffa070,
    loot: [35, 35, 18, 8, 3.5, 0.5] },
  { id: 'lab', nome: 'Laboratório X-13', dif: 2.4, ondas: 10, recompensa: 3.0,
    descricao: 'Onde tudo começou. Mutantes e a Abominação.',
    neblina: 0x0d2216, chao: '#2c3530', ceu: 0x03100a, luz: 0x70ffa0,
    loot: [10, 30, 30, 18, 9, 3] },
];

export const ZUMBIS = {
  errante:  { nome: 'Errante',      hp: 100, vel: 2.1, dano: 12, raio: 0.42, escala: 1.0,  grana: 10,  pele: 0x6f8a62, olho: 0xffd23a },
  corredor: { nome: 'Corredor',     hp: 60,  vel: 5.0, dano: 8,  raio: 0.38, escala: 0.92, grana: 14,  pele: 0x8f9a7a, olho: 0xff3a3a },
  cuspidor: { nome: 'Cuspidor',     hp: 90,  vel: 2.0, dano: 14, raio: 0.42, escala: 1.0,  grana: 18,  pele: 0x7fbf3a, olho: 0x9cff3a },
  inchado:  { nome: 'Inchado',      hp: 80,  vel: 2.7, dano: 40, raio: 0.6,  escala: 1.05, grana: 16,  pele: 0xb0a65a, olho: 0xffa020 },
  bruto:    { nome: 'Brutamontes',  hp: 650, vel: 1.6, dano: 30, raio: 0.75, escala: 1.6,  grana: 60,  pele: 0x5a6a5a, olho: 0xff5020 },
  chefe:    { nome: 'Abominação',   hp: 5000,vel: 2.5, dano: 45, raio: 1.2,  escala: 2.5,  grana: 600, pele: 0x7a3040, olho: 0xff0030 },
};

export const BOSS_PESOS = [0, 0, 0, 60, 32, 8];

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
    granadas: 2, kits: 2,
    stats: { raids: 0, extracoes: 0, mortes: 0, abates: 0, melhorOnda: 0 },
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
