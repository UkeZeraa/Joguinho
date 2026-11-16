// Junta o jogo (zumbi/) num único HTML embutido no app: assets/jogo.js exporta a string do HTML.
// Rode sempre que mudar o jogo:  npm run empacotar
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const zumbi = join(aqui, '..', '..', 'zumbi');
const lib = join(zumbi, 'lib');

const r = await build({
  entryPoints: [join(zumbi, 'js', 'lobby.js')],
  bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none',
  plugins: [{ name: 'three', setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: join(lib, 'three.module.min.js') }));
    b.onResolve({ filter: /^three\/addons\// }, a => ({ path: join(lib, 'jsm', a.path.slice('three/addons/'.length)) }));
  } }],
});
let js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile(join(zumbi, 'style.css'), 'utf8');
let html = await readFile(join(zumbi, 'index.html'), 'utf8');
html = html
  .replace(/<script type="importmap">[\s\S]*?<\/script>/, '')
  .replace(/<link rel="manifest"[^>]*>\s*/g, '')
  .replace(/<script>if \("serviceWorker"[\s\S]*?<\/script>/, '')
  .replace(/<link rel="stylesheet" href="style.css">/, () => `<style>${css}</style>`)
  .replace(/<script type="module" src="js\/lobby.js"><\/script>/, () => `<script>${js}</script>`);
const saida = join(aqui, '..', 'assets', 'jogo.js');
await writeFile(saida, 'export default ' + JSON.stringify(html) + ';\n');
console.log(`Pacote pronto: ${(html.length / 1024).toFixed(0)} KB -> assets/jogo.js`);
