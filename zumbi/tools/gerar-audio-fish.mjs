#!/usr/bin/env node
// Gera as vozes e os ruídos do Apocalipse Z com a API do Fish Audio (https://fish.audio).
//
//   export FISH_API_KEY="sua-chave"        # crie em fish.audio > Developers > API Keys (NUNCA suba a chave no GitHub)
//   node zumbi/tools/gerar-audio-fish.mjs  # gera tudo o que ainda não existe em zumbi/audio/
//
// Opções:
//   --so=zumbi_gemido,inicio_lab   gera só estas categorias/falas
//   --refazer                      apaga e gera de novo os arquivos escolhidos
//   --lista                        só mostra o que seria gerado (não gasta créditos)
//   --modelo=s1                    modelo do Fish Audio (padrão: s1)
//   --variantes=2                  quantas variações por categoria de ruído (padrão: usa todos os textos)
//
// As vozes (reference_id) vêm de zumbi/tools/fish-vozes.json (copie fish-vozes.exemplo.json).
// Cada "voz" (zumbi, chefe, rainha, soldado, radio, ambiente) pode usar um modelo de voz diferente da biblioteca do Fish.
// Sem reference_id o Fish usa uma voz padrão.
import { readFile, writeFile, mkdir, access, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATEGORIAS, FALAS } from '../js/audio.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const pastaAudio = join(aqui, '..', 'audio');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const MODELO = args.modelo || 's1';
const CHAVE = process.env.FISH_API_KEY;
const existe = async p => { try { await access(p); return true; } catch { return false; } };

let vozes = {};
try { vozes = JSON.parse(await readFile(join(aqui, 'fish-vozes.json'), 'utf8')); } catch { /* usa a voz padrão */ }

// monta a lista de trabalhos: { arquivo, texto, voz, tipo: 'cat'|'fala', chave }
const trabalhos = [];
for (const [cat, c] of Object.entries(CATEGORIAS)) {
  const textos = args.variantes ? c.textos.slice(0, +args.variantes) : c.textos;
  textos.forEach((t, i) => trabalhos.push({ arquivo: `${cat}_${i + 1}.mp3`, texto: t, voz: c.voz, tipo: 'cat', chave: cat }));
}
for (const [id, f] of Object.entries(FALAS)) trabalhos.push({ arquivo: `fala_${id}.mp3`, texto: `${f.tag} ${f.txt}`, voz: f.voz, tipo: 'fala', chave: id });
const filtro = args.so ? new Set(String(args.so).split(',')) : null;
const lista = trabalhos.filter(t => !filtro || filtro.has(t.chave));

if (args.lista) {
  for (const t of lista) console.log(`${t.arquivo.padEnd(36)} [${t.voz}] ${t.texto}`);
  console.log(`\n${lista.length} arquivos.`);
  process.exit(0);
}
if (!CHAVE) { console.error('Defina a variável FISH_API_KEY (veja o topo deste arquivo).'); process.exit(1); }
await mkdir(pastaAudio, { recursive: true });

async function gerar(t, tentativa = 1) {
  const corpo = { text: t.texto, format: 'mp3', mp3_bitrate: 128, normalize: true, latency: 'normal', temperature: 0.8, top_p: 0.8 };
  const ref = vozes[t.voz]; if (ref) corpo.reference_id = ref;
  const r = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CHAVE}`, 'Content-Type': 'application/json', model: MODELO },
    body: JSON.stringify(corpo),
  });
  if (r.status === 429 && tentativa < 5) { await new Promise(res => setTimeout(res, 2000 * tentativa)); return gerar(t, tentativa + 1); }
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return Buffer.from(await r.arrayBuffer());
}

let ok = 0, pulados = 0, falhas = 0;
for (const t of lista) {
  const destino = join(pastaAudio, t.arquivo);
  if (await existe(destino)) { if (args.refazer) await rm(destino); else { pulados++; continue; } }
  try {
    const mp3 = await gerar(t);
    await writeFile(destino, mp3);
    ok++; console.log('✔', t.arquivo, `(${(mp3.length / 1024).toFixed(0)} KB)`);
  } catch (e) { falhas++; console.error('✘', t.arquivo, String(e.message).slice(0, 160)); }
}

// manifest.json: lista só os arquivos que existem, para o jogo carregar
const manifesto = { categorias: {}, falas: {} };
for (const t of trabalhos) {
  if (!(await existe(join(pastaAudio, t.arquivo)))) continue;
  if (t.tipo === 'cat') (manifesto.categorias[t.chave] ||= []).push(t.arquivo); else manifesto.falas[t.chave] = t.arquivo;
}
await writeFile(join(pastaAudio, 'manifest.json'), JSON.stringify(manifesto, null, 2));
console.log(`\nPronto: ${ok} gerados, ${pulados} já existiam, ${falhas} falhas. manifest.json atualizado.`);
if (falhas) process.exit(2);
