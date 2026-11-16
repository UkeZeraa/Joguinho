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


// ---------- modificações (acessórios) e maestria das armas ----------
// slots: o nível de maestria da arma libera cada espaço
export const SLOTS_MOD = [
  { id: 'mira',        nome: 'Mira',         icone: '◎', nivel: 1 },
  { id: 'cano',        nome: 'Cano / Bocal', icone: '▬', nivel: 2 },
  { id: 'carregador',  nome: 'Carregador',   icone: '▮', nivel: 3 },
  { id: 'empunhadura', nome: 'Empunhadura',  icone: '✋', nivel: 4 },
  { id: 'municao',     nome: 'Munição',      icone: '⁍', nivel: 6 },
];
export const MAESTRIA_MAX = 10;
export const TITULOS_MAESTRIA = ['Novata', 'Praticante', 'Conhecida', 'Veterana', 'Especialista', 'Letal', 'Elite', 'Lendária', 'Mestra', 'Perfeita'];
export function killsParaNivel(n) { return n <= 1 ? 0 : Math.round(30 * Math.pow(n - 1, 1.6)); }
export function maestria(arma) {
  const k = arma.kills || 0;
  let n = 1;
  while (n < MAESTRIA_MAX && k >= killsParaNivel(n + 1)) n++;
  const ini = killsParaNivel(n), fim = n >= MAESTRIA_MAX ? ini : killsParaNivel(n + 1);
  return { nivel: n, kills: k, ini, fim, prog: n >= MAESTRIA_MAX ? 1 : (k - ini) / (fim - ini), titulo: TITULOS_MAESTRIA[n - 1] };
}

// fx: multiplicadores (dano, rpm, pente, recarga, disp, alcance, recuo, lenta, ads) e extras (zoom, perfura, vampiro e flags)
// preco 0 = não vende na loja (só aparece como loot em baús, chefes e elites)
export const MODS = [
  // ---- miras
  { id: 'reddot',   slot: 'mira', nome: 'Mira Red Dot',        tier: 1, preco: 400,  desc: 'Ponto vermelho: mais precisão ao mirar.', fx: { disp: 0.92, zoom: 0.25 }, nao: ['sniper'] },
  { id: 'holo',     slot: 'mira', nome: 'Mira Holográfica',    tier: 2, preco: 900,  desc: 'Mira nítida com leve ampliação.',        fx: { disp: 0.86, zoom: 0.45 }, nao: ['sniper'] },
  { id: 'luneta4',  slot: 'mira', nome: 'Luneta 4×',           tier: 3, preco: 2200, desc: 'Ampliação alta e tiro mais certeiro; a mira fica mais lenta.', fx: { disp: 0.8, zoom: 1.5, ads: 0.75 }, so: ['fuzil', 'metralhadora', 'escopeta', 'submetralhadora'] },
  { id: 'termica',  slot: 'mira', nome: 'Luneta Térmica',      tier: 4, preco: 0,    desc: 'Enxerga o calor: Espectros ficam sempre visíveis e os zumbis brilham no radar.', fx: { zoom: 0.9, disp: 0.9, termico: true }, nao: ['pistola'] },
  // ---- canos / bocais
  { id: 'compensador', slot: 'cano', nome: 'Compensador',      tier: 1, preco: 350,  desc: 'Reduz o coice da arma.',                fx: { recuo: 0.65, disp: 0.96 } },
  { id: 'curto',    slot: 'cano', nome: 'Cano Curto',          tier: 1, preco: 500,  desc: 'Mais cadência e mobilidade, menos alcance e precisão.', fx: { rpm: 1.08, alcance: 0.8, disp: 1.18, lenta: 1.05 } },
  { id: 'longo',    slot: 'cano', nome: 'Cano Longo',          tier: 2, preco: 800,  desc: 'Mais alcance e precisão, um pouco mais lento.', fx: { alcance: 1.3, disp: 0.84, rpm: 0.96 } },
  { id: 'silenciador', slot: 'cano', nome: 'Silenciador',      tier: 2, preco: 1100, desc: 'Sem clarão e tiro abafado, mas perde 8% de dano.', fx: { dano: 0.92, alcance: 1.1, silencioso: true } },
  { id: 'choke',    slot: 'cano', nome: 'Choke Fechado',       tier: 2, preco: 700,  desc: 'Concentra os chumbos da escopeta.',     fx: { disp: 0.55, alcance: 1.2 }, so: ['escopeta'] },
  { id: 'freio',    slot: 'cano', nome: 'Freio de Boca',       tier: 3, preco: 1800, desc: 'Coice quase zero e um pouco mais de dano.', fx: { recuo: 0.45, disp: 0.9, dano: 1.03 } },
  { id: 'pesado',   slot: 'cano', nome: 'Cano Reforçado',      tier: 4, preco: 0,    desc: 'Cano militar: muito mais dano e alcance.', fx: { dano: 1.15, alcance: 1.15, rpm: 0.94 } },
  // ---- carregadores
  { id: 'estendido', slot: 'carregador', nome: 'Carregador Estendido', tier: 1, preco: 450,  desc: '+40% de balas no pente; recarga um pouco mais lenta.', fx: { pente: 1.4, recarga: 1.1 } },
  { id: 'rapido',   slot: 'carregador', nome: 'Recarga Rápida',       tier: 1, preco: 450,  desc: 'Recarrega 30% mais depressa.',        fx: { recarga: 0.7 } },
  { id: 'duplo',    slot: 'carregador', nome: 'Carregadores Duplos',  tier: 2, preco: 1000, desc: 'Dois pentes colados: recarga muito rápida.', fx: { recarga: 0.55, pente: 0.9 } },
  { id: 'tambor',   slot: 'carregador', nome: 'Tambor',               tier: 3, preco: 2400, desc: 'O dobro de balas, mas pesado de recarregar.', fx: { pente: 2.0, recarga: 1.3, rpm: 0.97 }, nao: ['sniper', 'escopeta'] },
  { id: 'bateria',  slot: 'carregador', nome: 'Câmara Aumentada',     tier: 4, preco: 0,    desc: '+60% de balas e recarga mais rápida.', fx: { pente: 1.6, recarga: 0.8 } },
  // ---- empunhaduras
  { id: 'vertical', slot: 'empunhadura', nome: 'Empunhadura Vertical',  tier: 1, preco: 400,  desc: 'Menos coice e menos dispersão.', fx: { recuo: 0.8, disp: 0.95 }, nao: ['pistola'] },
  { id: 'angular',  slot: 'empunhadura', nome: 'Empunhadura Angular',   tier: 1, preco: 400,  desc: 'Mira mais rápida e mais precisa.', fx: { ads: 1.35, disp: 0.92 }, nao: ['pistola'] },
  { id: 'coronha',  slot: 'empunhadura', nome: 'Coronha Pesada',        tier: 2, preco: 900,  desc: 'Muito mais estável, mas pesa na corrida.', fx: { recuo: 0.65, disp: 0.88, lenta: 0.96 } },
  { id: 'gatilho',  slot: 'empunhadura', nome: 'Gatilho Leve',          tier: 2, preco: 900,  desc: '+12% de cadência.', fx: { rpm: 1.12 } },
  { id: 'tatica',   slot: 'empunhadura', nome: 'Empunhadura Tática X',  tier: 4, preco: 0,    desc: 'Coice dominado, mira firme e cadência melhor.', fx: { recuo: 0.6, disp: 0.8, rpm: 1.05 } },
  // ---- munição
  { id: 'pontaoca', slot: 'municao', nome: 'Ponta Oca',        tier: 1, preco: 700,  desc: '+18% de dano, mas perde alcance.',    fx: { dano: 1.18, alcance: 0.9 } },
  { id: 'perfurante', slot: 'municao', nome: 'Perfurante',     tier: 2, preco: 1200, desc: 'Atravessa +1 zumbi e quebra armadura; −5% de dano.', fx: { perfura: 1, dano: 0.95 } },
  { id: 'incendiaria', slot: 'municao', nome: 'Incendiária',   tier: 3, preco: 2500, desc: 'Incendeia o alvo.',                   fx: { fogo: true } },
  { id: 'vampirica', slot: 'municao', nome: 'Vampírica',       tier: 3, preco: 3000, desc: 'Rouba 6% do dano como vida.',         fx: { vampiro: 0.06 } },
  { id: 'explosiva', slot: 'municao', nome: 'Explosiva',       tier: 4, preco: 0,    desc: 'Cada tiro explode em área; −15% de dano direto.', fx: { explosivo: true, dano: 0.85 } },
  { id: 'eletrica', slot: 'municao', nome: 'Elétrica',         tier: 4, preco: 0,    desc: 'O raio salta para até 3 zumbis perto do alvo.', fx: { eletrico: true } },
];
export const MOD_POR_ID = Object.fromEntries(MODS.map(m => [m.id, m]));
export function modCabe(mod, arma) {
  if (mod.so && !mod.so.includes(arma.tipo)) return false;
  if (mod.nao && mod.nao.includes(arma.tipo)) return false;
  return true;
}
export function slotLiberado(arma, slotId) {
  const s = SLOTS_MOD.find(x => x.id === slotId);
  return maestria(arma).nivel >= s.nivel;
}
const MULTS = ['dano', 'rpm', 'pente', 'recarga', 'disp', 'alcance', 'recuo', 'lenta', 'ads'];
// Soma os efeitos dos mods instalados (e liberados pela maestria)
function efeitosMods(arma, extra) {
  const fx = { dano: 1, rpm: 1, pente: 1, recarga: 1, disp: 1, alcance: 1, recuo: 1, lenta: 1, ads: 1, zoom: 0, perfura: 0, vampiro: 0 };
  const inst = { ...(arma.mods || {}), ...(extra || {}) };
  for (const slot of SLOTS_MOD) {
    const id = inst[slot.id];
    if (!id || !slotLiberado(arma, slot.id)) continue;
    const m = MOD_POR_ID[id];
    if (!m || !modCabe(m, arma)) continue;
    for (const k of MULTS) if (m.fx[k]) fx[k] *= m.fx[k];
    for (const k of ['zoom', 'perfura', 'vampiro']) if (m.fx[k]) fx[k] += m.fx[k];
    for (const k of ['fogo', 'explosivo', 'eletrico', 'silencioso', 'termico']) if (m.fx[k]) fx[k] = true;
  }
  return fx;
}

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
  { id: 'suburbio', nivelRec: 1, nome: 'Subúrbio Abandonado', dif: 1.0, ondas: 5, recompensa: 1.0, tam: 60,
    descricao: 'Bairro residencial: casas com quintal, cercas, árvores, escola e um abrigo antiaéreo trancado. Bom para começar.',
    eventos: ['horda', 'apagao'], objetivo: { tipo: 'gerador', nome: 'Geradores', qtd: 2, cofre: 'Abrigo Antiaéreo' },
    neblina: 0x1b2530, chao: '#3a3f44', ceu: 0x0b1018, luz: 0x8fa8ff,
    loot: [60, 28, 9, 2.5, 0.45, 0.05], chefes: ['acougueiro'],
    pool: { errante: [1, 1, 0], corredor: [2, 0.3, 0.05], rastejante: [2, 0.2, 0.03], cuspidor: [3, 0.2, 0], inchado: [3, 0.15, 0], blindado: [4, 0.1, 0.03], bruto: [4, 0.07, 0.01] } },
  { id: 'centro', nivelRec: 3, nome: 'Centro em Chamas', dif: 1.6, ondas: 7, recompensa: 1.8, tam: 64,
    descricao: 'Arranha-céus, avenida engarrafada, posto de gasolina, viaduto e metrô. Carros pegando fogo, escudeiros e gritadores.',
    eventos: ['horda', 'bombardeio'], objetivo: { tipo: 'valvula', nome: 'Válvulas de gás', qtd: 3, cofre: 'Cofre do Banco' },
    neblina: 0x2a1812, chao: '#34302d', ceu: 0x170a06, luz: 0xffa070,
    loot: [35, 35, 18, 8, 3.5, 0.5], chefes: ['chefe'],
    pool: { errante: [1, 1, 0], corredor: [1, 0.4, 0.05], rastejante: [2, 0.2, 0.02], cuspidor: [2, 0.2, 0], inchado: [3, 0.18, 0], escudeiro: [3, 0.15, 0.02], blindado: [3, 0.12, 0.03], gritador: [4, 0.08, 0.01], toxico: [5, 0.1, 0.02], bruto: [4, 0.08, 0.01] } },
  { id: 'lab', nivelRec: 6, nome: 'Laboratório X-13', dif: 2.4, ondas: 10, recompensa: 3.0, tam: 60,
    descricao: 'Complexo fechado: corredores, salas de contenção, geradores e portas de segurança. Espectros invisíveis e dois chefes no final.',
    eventos: ['apagao', 'esporos'], objetivo: { tipo: 'terminal', nome: 'Terminais de acesso', qtd: 3, cofre: 'Sala de Armas X-13' },
    neblina: 0x0d2216, chao: '#2c3530', ceu: 0x03100a, luz: 0x70ffa0,
    loot: [10, 30, 30, 18, 9, 3], chefes: ['chefe', 'acougueiro'],
    pool: { errante: [1, 0.8, 0], corredor: [1, 0.4, 0.04], espectro: [2, 0.15, 0.03], toxico: [3, 0.15, 0.02], cuspidor: [2, 0.2, 0], inchado: [2, 0.15, 0], gritador: [3, 0.1, 0.01], escudeiro: [4, 0.12, 0.02], blindado: [3, 0.15, 0.03], bruto: [3, 0.1, 0.01], rastejante: [2, 0.2, 0.02] } },
  { id: 'base', nivelRec: 10, nome: 'Base Militar Caída', dif: 3.2, ondas: 10, recompensa: 4.5, requer: 'lab', tam: 76,
    descricao: 'Fortaleza murada com torres de vigia, hangares, tanques, pista de pouso e paiol. O Colosso Blindado guarda a base.',
    eventos: ['bombardeio', 'horda'], objetivo: { tipo: 'radio', nome: 'Rádios de comando', qtd: 2, cofre: 'Paiol de Armas' },
    neblina: 0x1c1f14, chao: '#3a3a2c', ceu: 0x0a0c06, luz: 0xd8e090,
    loot: [0, 22, 34, 25, 14, 5], chefes: ['colosso'],
    pool: { errante: [1, 0.5, 0], blindado: [1, 0.5, 0.05], escudeiro: [1, 0.35, 0.04], corredor: [1, 0.3, 0.03], gritador: [2, 0.1, 0.01], bruto: [2, 0.15, 0.02], inchado: [2, 0.15, 0], toxico: [4, 0.1, 0.02], espectro: [5, 0.1, 0.02] } },
  { id: 'ninho', nivelRec: 14, nome: 'Ninho da Rainha', dif: 4.2, ondas: 12, recompensa: 6.5, requer: 'base', tam: 66,
    descricao: 'Caverna viva de carne e ovos pulsantes, piscinas de ácido e túneis. Gás tóxico, espectros e a Rainha Infectada.',
    eventos: ['esporos', 'horda'], objetivo: { tipo: 'casulo', nome: 'Casulos', qtd: 4, cofre: 'Câmara Real' },
    neblina: 0x2e1236, chao: '#2e2430', ceu: 0x0c0310, luz: 0xd080ff,
    loot: [0, 10, 30, 32, 20, 8], chefes: ['rainha'],
    pool: { errante: [1, 0.4, 0], rastejante: [1, 0.5, 0.04], espectro: [1, 0.3, 0.04], toxico: [1, 0.3, 0.03], cuspidor: [1, 0.3, 0.02], inchado: [1, 0.25, 0.01], gritador: [2, 0.12, 0.01], blindado: [2, 0.25, 0.03], escudeiro: [3, 0.2, 0.02], bruto: [3, 0.15, 0.02] } },
];

// Eventos aleatórios que mudam uma onda (mais recompensa)
export const EVENTOS = {
  horda:      { nome: 'HORDA!', cor: '#ff5040', bonus: 0.35, desc: 'Uma sirene toca: enxame de corredores vindo de todos os lados.' },
  apagao:     { nome: 'APAGÃO', cor: '#8aa0ff', bonus: 0.30, desc: 'As luzes caem. Espectros caçam no escuro.' },
  esporos:    { nome: 'CHUVA DE ESPOROS', cor: '#9cff3a', bonus: 0.30, desc: 'Nuvens tóxicas se espalham pelo mapa.' },
  bombardeio: { nome: 'BOMBARDEIO', cor: '#ffb030', bonus: 0.35, desc: 'Artilharia cai no mapa. Corra dos círculos vermelhos!' },
};

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

// ---------- cartas de melhoria (escolha 1 de 3 ao limpar uma onda; valem até o fim da raid) ----------
export const CARTAS = [
  { id: 'dano', nome: 'Munição Pesada', icone: '💥', desc: '+20% de dano em todas as armas' },
  { id: 'rpm', nome: 'Gatilho Nervoso', icone: '⚡', desc: '+15% de cadência' },
  { id: 'recarga', nome: 'Mãos de Mágico', icone: '⟳', desc: 'Recarga 25% mais rápida' },
  { id: 'pente', nome: 'Bolsos Fundos', icone: '▮', desc: '+30% de balas no pente e munição reserva cheia' },
  { id: 'vel', nome: 'Adrenalina', icone: '👟', desc: '+12% de velocidade' },
  { id: 'vida', nome: 'Pele Grossa', icone: '❤', desc: '+30 de vida máxima e cura total' },
  { id: 'armadura', nome: 'Placas Extras', icone: '🛡', desc: '+50 de armadura' },
  { id: 'crit', nome: 'Olho Clínico', icone: '🎯', desc: '+30% de dano de headshot' },
  { id: 'vampiro', nome: 'Sanguessuga', icone: '🩸', desc: 'Rouba 3% do dano como vida' },
  { id: 'grana', nome: 'Saqueador', icone: '💰', desc: '+40% de grana dos abates' },
  { id: 'granadas', nome: 'Granadeiro', icone: '💣', desc: '+2 granadas' },
  { id: 'kits', nome: 'Paramédico', icone: '✚', desc: '+2 kits médicos' },
  { id: 'torreta', nome: 'Engenheiro', icone: '⚙', desc: '+1 torreta sentinela' },
  { id: 'fogo', nome: 'Balas em Brasa', icone: '🔥', desc: 'Todas as armas incendeiam os zumbis' },
  { id: 'perfura', nome: 'Núcleo de Tungstênio', icone: '➤', desc: 'Os tiros atravessam +1 zumbi' },
];

// ---------- desafio diário: mesma raid para todo mundo no dia (zona, modificadores e armas fixos) ----------
function semente(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngDe(seed) { let a = seed; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function hojeStr(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function desafioDiario(data = hojeStr()) {
  const r = rngDe(semente('apocalipse-z-' + data));
  const pega = a => a[Math.floor(r() * a.length)];
  const zonaIdx = Math.floor(r() * ZONAS.length);
  const mods = [...MODIFICADORES].sort(() => r() - 0.5).slice(0, 1 + Math.floor(r() * 2)).map(m => m.id);
  const tier = Math.min(4, 1 + Math.floor(ZONAS[zonaIdx].dif) + (r() < 0.4 ? 1 : 0));
  const prim = { tipo: pega(['fuzil', 'escopeta', 'sniper', 'metralhadora']), tier };
  const sec = { tipo: pega(['pistola', 'submetralhadora']), tier: Math.max(1, tier - 1) };
  return { data, zonaIdx, mods, armas: [prim, sec] };
}
export function pontosDiario(r) { return r.abates * 10 + (r.onda || 0) * 100 + (r.extraido ? 1000 : 0) + (r.objetivo && r.objetivo.completo ? 500 : 0); }

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
    mods: {}, kills: 0,
  };
}

export function stats(arma, modExtra) {
  const b = TIPOS[arma.tipo], t = TIERS[arma.tier], i = arma.tier;
  const fx = efeitosMods(arma, modExtra);
  const ms = maestria(arma);
  const bonusM = ms.nivel - 1;   // maestria: +2% de dano e +1% de cadência por nível
  return {
    dano: b.dano * t.mult * fx.dano * (1 + 0.02 * bonusM),
    rpm: b.rpm * (1 + 0.06 * i) * fx.rpm * (1 + 0.01 * bonusM),
    pente: Math.max(1, Math.round(b.pente * (1 + 0.12 * i) * fx.pente)),
    recarga: b.recarga * (1 - 0.07 * i) * fx.recarga * (1 - 0.015 * bonusM),
    disp: b.disp * (1 - 0.09 * i) * fx.disp,
    alcance: b.alcance * (1 + 0.05 * i) * fx.alcance,
    projeteis: b.projeteis,
    auto: b.auto,
    recuo: b.recuo * (1 - 0.06 * i) * fx.recuo,
    zoom: b.zoom + fx.zoom,
    lenta: (b.lenta || 1) * fx.lenta,
    ads: fx.ads,
    perfura: Math.max(0, (i >= 4 ? 2 : i >= 2 ? 1 : 0) + fx.perfura),
    fogo: i >= 3 || !!fx.fogo,
    explosivo: i >= 5 || !!fx.explosivo,
    vampiro: (i >= 5 ? 0.05 : 0) + fx.vampiro,
    eletrico: !!fx.eletrico,
    silencioso: !!fx.silencioso,
    termico: !!fx.termico,
    maestria: ms.nivel,
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
    mods: { compensador: 1, estendido: 1 },
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
