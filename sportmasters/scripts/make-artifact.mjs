// Transforme le build « un seul fichier » en page publiable :
// on retire doctype / html / head / body (la plateforme les ajoute) et on garde
// <title>, les styles, la racine React et le script, dans cet ordre.
// Les photos partent à côté, regroupées par sport (artifact/photos/<sport>.json),
// car la page publiée ne peut charger que ses propres fichiers.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>SportMasters</title>';
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0].replace(/<style[^>]*>/, '<style>'));
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/<script[^>]*>/, '<script type="module">'));
if (!scripts.length) throw new Error('Aucun script trouvé dans le build');

const page = [title, ...styles, '<div id="root"></div>', ...scripts].join('\n');
rmSync('artifact', { recursive: true, force: true });
mkdirSync('artifact/photos', { recursive: true });
writeFileSync('artifact/sportmasters.html', page);
console.log(`artifact/sportmasters.html : ${(page.length / 1024 / 1024).toFixed(2)} Mo`);

const credits = JSON.parse(readFileSync('src/data/photos.json', 'utf8'));
const source = readFileSync('src/data/athletes.ts', 'utf8');
const sportOf = Object.fromEntries([...source.matchAll(/^\s*a\('([^']+)', '[^']*', '[^']*', '([a-z]+)'/gm)].map((m) => [m[1], m[2]]));
const chunks = {};
for (const [id, credit] of Object.entries(credits)) {
  const file = `public/photos/${credit.file}`;
  const sport = sportOf[id];
  if (!sport || !existsSync(file)) continue;
  chunks[sport] ??= {};
  chunks[sport][id] = `data:image/webp;base64,${readFileSync(file).toString('base64')}`;
}
for (const [sport, map] of Object.entries(chunks)) {
  const text = JSON.stringify(map);
  writeFileSync(`artifact/photos/${sport}.json`, text);
  console.log(`artifact/photos/${sport}.json : ${Object.keys(map).length} photos, ${(text.length / 1024 / 1024).toFixed(2)} Mo`);
}
