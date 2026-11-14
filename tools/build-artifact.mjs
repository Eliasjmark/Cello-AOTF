// Bygger en fristående version av spelet (en enda HTML-fil med all kod inbakad),
// som går att publicera som en Claude-artifact eller skicka till någon.
// Kör: npm run build:artifact  →  build/play.html
import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const threeLocal = {
  name: 'three-local',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'lib/three/three.module.js') }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({
      path: path.join(root, 'lib/three/addons', a.path.slice('three/addons/'.length)),
    }));
  },
};

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'esm',
  minify: true,
  target: 'es2020',
  write: false,
  legalComments: 'eof',
  plugins: [threeLocal],
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = await readFile(path.join(root, 'index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>\s*/i, '')
  .replace(/<meta name="viewport"[^>]*>\s*/i, '')
  .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/i, '');
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)[1]
  .replace(/<script type="module"[^>]*><\/script>\s*/i, '');

// Hjältemodellen till startmenyn bakas in som base64 (artifacts serverar inga binärfiler)
const hero = (await readFile(path.join(root, 'models/cello-hero.bin'))).toString('base64');
// 0.13: modellpaketet (Elias skulpturer med skelett) bakas också in
const pack = (await readFile(path.join(root, 'models/pack.bin'))).toString('base64');
// 0.18: ljudeffekterna (sounds/sfx.json: namn → MP3 i base64)
const sfx = (await readFile(path.join(root, 'sounds/sfx.json'), 'utf8')).trim();
const out = `${head.trim()}\n${body.trim()}\n<script>window.CELLO_HERO_B64="${hero}";window.CELLO_PACK_B64="${pack}";window.CELLO_SFX=${sfx};</script>\n<script type="module">${js}</script>\n`;
await mkdir(path.join(root, 'build'), { recursive: true });
await writeFile(path.join(root, 'build/play.html'), out);
console.log(`build/play.html  ${(out.length / 1024).toFixed(0)} kB`);
