#!/usr/bin/env node
// Planches de contact des photos du jeu, pour les vérifier d'un coup d'œil :
// tmp/photos/planches/01.jpg, 02.jpg… (48 photos par planche, avec l'identifiant de l'athlète).
//
//   node scripts/photos/planches.mjs [--seulement messi,duplantis]

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = join(ROOT, 'tmp/photos/planches');
const credits = JSON.parse(readFileSync(join(ROOT, 'src/data/photos.json'), 'utf8'));
const argv = process.argv.slice(2);
const only = argv.includes('--seulement') ? argv[argv.indexOf('--seulement') + 1].split(',') : null;

const ids = Object.keys(credits)
  .filter((id) => !id.startsWith('mythe-'))
  .filter((id) => !only || only.includes(id))
  .sort();

const [W, H, LABEL, COLS, PER] = [150, 200, 18, 8, 48];
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (let sheet = 0; sheet * PER < ids.length; sheet++) {
  const slice = ids.slice(sheet * PER, (sheet + 1) * PER);
  const layers = [];
  for (const [i, id] of slice.entries()) {
    const file = join(ROOT, 'public/photos', credits[id].file);
    if (!existsSync(file)) continue;
    const [x, y] = [(i % COLS) * W, Math.floor(i / COLS) * (H + LABEL)];
    const tile = await sharp(file).resize(W, H, { fit: 'cover', position: 'top' }).jpeg().toBuffer();
    const label = `<svg width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="13" font-family="sans-serif" font-size="12" fill="#fff">${id}</text></svg>`;
    layers.push({ input: tile, left: x, top: y }, { input: Buffer.from(label), left: x, top: y + H });
  }
  const rows = Math.ceil(slice.length / COLS);
  const name = String(sheet + 1).padStart(2, '0');
  await sharp({ create: { width: COLS * W, height: rows * (H + LABEL), channels: 3, background: '#111' } })
    .composite(layers)
    .jpeg({ quality: 70 })
    .toFile(join(OUT, `${name}.jpg`));
  console.log(`tmp/photos/planches/${name}.jpg : ${slice.length} photos`);
}
