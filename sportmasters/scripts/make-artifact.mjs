// Transforme le build « un seul fichier » en page publiable :
// on retire doctype / html / head / body (la plateforme les ajoute) et on garde
// <title>, les styles, la racine React et le script, dans cet ordre.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('dist-single/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>SportMasters</title>';
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0].replace(/<style[^>]*>/, '<style>'));
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(/<script[^>]*>/, '<script type="module">'));
if (!scripts.length) throw new Error('Aucun script trouvé dans le build');

const page = [title, ...styles, '<div id="root"></div>', ...scripts].join('\n');
mkdirSync('artifact', { recursive: true });
writeFileSync('artifact/sportmasters.html', page);
console.log(`artifact/sportmasters.html : ${(page.length / 1024 / 1024).toFixed(2)} Mo`);
