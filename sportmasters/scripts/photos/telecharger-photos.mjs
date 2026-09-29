#!/usr/bin/env node
// Photos des athlètes depuis Wikimedia Commons (licences libres uniquement), avec crédits.
//
//   node scripts/photos/telecharger-photos.mjs telecharger [--limite 20] [--seulement messi,duplantis]
//   python scripts/photos/detourer.py            (optionnel : détourage automatique avec rembg)
//   node scripts/photos/telecharger-photos.mjs finaliser
//
// Étape « telecharger » : pour chaque athlète, trouve sa page Wikipédia (fr puis en), récupère
// la photo principale si elle est hébergée sur Commons sous licence libre, et note l'auteur.
// Étape « finaliser » : produit public/photos/<id>.webp (détourée si le détourage est propre,
// sinon cadrée en portrait) et src/data/photos.json (crédits affichés dans le jeu).
// Tourne dans la GitHub Action .github/workflows/photos.yml (il faut un accès à Wikimedia).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// chemins en texte : sharp n'accepte pas les objets URL
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const path = (p) => join(ROOT, p);
const RAW_DIR = path('tmp/photos/brut');
const CUT_DIR = path('tmp/photos/detoure');
const META_FILE = path('tmp/photos/meta.json');
const OUT_DIR = path('public/photos');
const CREDITS_FILE = path('src/data/photos.json');
const CONFIG = JSON.parse(readFileSync(new URL('./config.json', import.meta.url), 'utf8'));
const OVERRIDES = JSON.parse(readFileSync(new URL('./titres.json', import.meta.url), 'utf8'));
const REPO = process.env.GITHUB_REPOSITORY ?? 'NateVk76/claude';
const USER_AGENT = `SportMastersPhotos/1.0 (https://github.com/${REPO}; jeu de fan non commercial)`;

const argv = process.argv.slice(2);
const step = argv[0];
const option = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

// Mots qui doivent apparaître dans la description Wikipédia pour être sûr d'avoir le bon athlète.
const KEYWORDS = {
  foot: /football|soccer/i,
  basket: /basket/i,
  tennis: /tennis/i,
  athle: /athl|sprint|perch|pole vault|saut|jump|lanc|throw|marath|coureu|runner|haies|hurdl|d[ée]cathl|demi-fond|javelot|javelin|disque|discus|poids|shot put|middle-distance|long-distance/i,
  natation: /nag|swim/i,
  cyclisme: /cycl/i,
  auto: /pilote|driver|racer|formule|formula|rall|moto/i,
  combat: /box|judo|MMA|arts martiaux|mixed martial|combattant|fighter|lutt|wrestl/i,
  rugby: /rugby/i,
  hand: /hand/i,
  volley: /volley/i,
  hiver: /ski|biathl|patin|skat|snowboard|freestyle|bosses|mogul/i,
  gym: /gymnast/i,
  golf: /golf/i,
  glisse: /surf|skate|grimp|climb|escalad|BMX/i,
  us: /football am[ée]ricain|american football|baseball|hockey|quarterback|NFL|MLB|NHL|tight end/i,
};

const SEARCH_WORDS = {
  fr: {
    foot: 'footballeur', basket: 'basket-ball', tennis: 'tennis', athle: 'athlétisme', natation: 'nageur', cyclisme: 'cycliste',
    auto: 'pilote', combat: 'boxe OR judo OR MMA', rugby: 'rugby', hand: 'handball', volley: 'volley-ball', hiver: 'ski OR biathlon OR patinage',
    gym: 'gymnaste', golf: 'golfeur', glisse: 'surf OR skateboard OR escalade OR BMX', us: 'football américain OR baseball OR hockey',
  },
  en: {
    foot: 'footballer', basket: 'basketball', tennis: 'tennis', athle: 'athlete', natation: 'swimmer', cyclisme: 'cyclist',
    auto: 'racing driver', combat: 'boxer OR judoka OR fighter', rugby: 'rugby', hand: 'handball', volley: 'volleyball', hiver: 'skier OR biathlete OR skater',
    gym: 'gymnast', golf: 'golfer', glisse: 'surfer OR skateboarder OR climber', us: 'american football OR baseball OR hockey',
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url, attempt = 1) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
  if (response.status === 404) return null;
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    await sleep(1_500 * attempt);
    return request(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response;
}

async function json(url) {
  const response = await request(url);
  return response ? response.json() : null;
}

function readAthletes() {
  const source = readFileSync(path('src/data/athletes.ts'), 'utf8');
  const out = [];
  const pattern = /^\s*a\('([^']+)', '([^']*)', '([^']*)', '([a-z]+)', '[^']*', '[^']*', '[A-Z-]+', (\d+), (\d+)/gm;
  for (const m of source.matchAll(pattern)) out.push({ id: m[1], first: m[2], last: m[3], sport: m[4], fame: Number(m[5]) });
  return out.sort((a, b) => b.fame - a.fame);
}

const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, "'");

async function summary(lang, title) {
  return json(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`);
}

function accepts(page, sport) {
  if (!page || page.type === 'disambiguation') return false;
  return KEYWORDS[sport].test(`${page.description ?? ''} ${page.extract ?? ''}`);
}

async function search(lang, query) {
  const data = await json(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srlimit=4&format=json&srsearch=${encodeURIComponent(query)}`);
  return (data?.query?.search ?? []).map((result) => result.title);
}

async function resolve(athlete) {
  const name = `${athlete.first} ${athlete.last}`.trim().replace(/’/g, "'");
  const lastWord = normalize(athlete.last).split(/[\s-]/).pop();
  for (const lang of ['fr', 'en']) {
    const titles = lang === 'fr' && OVERRIDES[athlete.id] ? [OVERRIDES[athlete.id], name] : [name];
    for (const title of titles) {
      const page = await summary(lang, title);
      if (accepts(page, athlete.sport)) return page;
    }
    for (const title of await search(lang, `${name} ${SEARCH_WORDS[lang][athlete.sport]}`)) {
      if (!normalize(title).includes(lastWord)) continue;
      const page = await summary(lang, title);
      if (accepts(page, athlete.sport)) return page;
    }
  }
  return null;
}

/** Nom du fichier Commons de la photo principale (les images locales, souvent non libres, sont ignorées). */
function commonsFile(page) {
  const src = page.originalimage?.source ?? page.thumbnail?.source;
  if (!src || !src.includes('/wikipedia/commons/')) return null;
  const match = src.match(/\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  if (!match) return null;
  const file = decodeURIComponent(match[1]);
  return /\.(jpe?g|png|webp)$/i.test(file) ? file : null;
}

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

async function commonsInfo(file) {
  const data = await json(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=720&titles=${encodeURIComponent(`File:${file}`)}`,
  );
  const page = data && Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (meta.NonFree?.value === 'true' || !/CC|public domain|domaine public|PD|GFDL|FAL|Attribution/i.test(license)) return null;
  return {
    thumb: info.thumburl ?? info.url,
    page: info.descriptionurl,
    author: stripHtml(meta.Artist?.value) || 'Auteur inconnu',
    license,
    licenseUrl: meta.LicenseUrl?.value ?? '',
  };
}

async function download() {
  mkdirSync(RAW_DIR, { recursive: true });
  const only = option('seulement')?.split(',');
  const limit = Number(option('limite') ?? CONFIG.limite ?? 0);
  let athletes = readAthletes();
  if (only) athletes = athletes.filter((a) => only.includes(a.id));
  if (limit > 0) athletes = athletes.slice(0, limit);
  const meta = existsSync(META_FILE) ? JSON.parse(readFileSync(META_FILE, 'utf8')) : {};
  const missing = [];
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < athletes.length) {
      const athlete = athletes[next++];
      try {
        const page = await resolve(athlete);
        const file = page && commonsFile(page);
        const info = file && (await commonsInfo(file));
        if (!info) {
          missing.push(athlete.id);
        } else {
          const response = await request(info.thumb);
          const buffer = Buffer.from(await response.arrayBuffer());
          await sharp(buffer).rotate().resize({ width: 720, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(join(RAW_DIR, `${athlete.id}.jpg`));
          meta[athlete.id] = { title: page.title, lang: page.lang ?? '', file, ...info };
        }
      } catch (error) {
        missing.push(athlete.id);
        console.warn(`  ${athlete.id} : ${error.message}`);
      }
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${athletes.length}`);
      await sleep(120);
    }
  }

  console.log(`Recherche des photos de ${athletes.length} athlètes…`);
  await Promise.all(Array.from({ length: 4 }, worker));
  writeFileSync(META_FILE, JSON.stringify(meta, null, 1));
  console.log(`${Object.keys(meta).length} photos trouvées, ${missing.length} sans photo libre : ${missing.join(', ')}`);
}

async function finalize() {
  mkdirSync(OUT_DIR, { recursive: true });
  const meta = JSON.parse(readFileSync(META_FILE, 'utf8'));
  const credits = {};
  let cutouts = 0;
  for (const [id, info] of Object.entries(meta).sort(([a], [b]) => a.localeCompare(b))) {
    const raw = join(RAW_DIR, `${id}.jpg`);
    if (!existsSync(raw)) continue;
    const target = join(OUT_DIR, `${id}.webp`);
    const cut = join(CUT_DIR, `${id}.png`);
    let cutout = false;
    if (existsSync(cut)) {
      // on ne garde le détourage que s'il a vraiment isolé l'athlète
      const { channels } = await sharp(cut).stats();
      const coverage = channels[3] ? channels[3].mean / 255 : 1;
      if (coverage > 0.1 && coverage < 0.85) {
        await sharp(cut)
          .trim({ threshold: 12 })
          .resize({ width: 480, height: 640, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80, alphaQuality: 90 })
          .toFile(target);
        cutout = true;
        cutouts += 1;
      }
    }
    if (!cutout) {
      await sharp(raw).resize(480, 640, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 78 }).toFile(target);
    }
    credits[id] = { file: `${id}.webp`, cutout, author: info.author, license: info.license, licenseUrl: info.licenseUrl, page: info.page };
  }
  writeFileSync(CREDITS_FILE, `${JSON.stringify(credits, null, 1)}\n`);
  console.log(`${Object.keys(credits).length} photos prêtes (${cutouts} détourées) dans public/photos`);
}

if (step === 'telecharger') await download();
else if (step === 'finaliser') await finalize();
else {
  console.error('Étape inconnue. Utilise « telecharger » ou « finaliser ».');
  process.exit(1);
}
