#!/usr/bin/env node
// Photos des athlètes depuis Wikimedia Commons (licences libres uniquement), avec crédits.
//
//   node scripts/photos/telecharger-photos.mjs telecharger [--tout] [--limite 20] [--seulement messi,duplantis]
//   python scripts/photos/detourer.py            (optionnel : détourage automatique avec rembg)
//   node scripts/photos/telecharger-photos.mjs finaliser
//
// Étape « telecharger » : pour chaque athlète, prend la première photo libre de Commons parmi
// l'image principale de sa page Wikipédia en français, celle de sa page en anglais, puis son
// image Wikidata. Les photos listées dans refus.json sont ignorées (plusieurs personnes, athlète
// de dos…). Par défaut, seuls les athlètes sans photo ou dont la photo est refusée sont traités ;
// --tout (ou "tout": true dans config.json) les refait tous.
// Étape « finaliser » : produit public/photos/<id>.webp (détourée si le détourage est propre,
// sinon cadrée en portrait) et met à jour src/data/photos.json (crédits affichés dans le jeu).
// Tourne dans la GitHub Action .github/workflows/photos.yml (il faut un accès à Wikimedia).

import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
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
const readJson = (name) => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const CONFIG = readJson('./config.json');
const OVERRIDES = readJson('./titres.json');
const REFUS = readJson('./refus.json');
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
    auto: 'pilote', combat: 'boxe OR judo OR MMA', rugby: 'rugby', hand: 'handball', volley: 'volley-ball',
    hiver: 'ski OR biathlon OR patinage OR snowboard', gym: 'gymnaste', golf: 'golfeur', glisse: 'surf OR skateboard OR escalade OR BMX',
    us: 'football américain OR baseball OR hockey',
  },
  en: {
    foot: 'footballer', basket: 'basketball', tennis: 'tennis', athle: 'athlete', natation: 'swimmer', cyclisme: 'cyclist',
    auto: 'racing driver', combat: 'boxer OR judoka OR fighter', rugby: 'rugby', hand: 'handball', volley: 'volleyball',
    hiver: 'skier OR biathlete OR skater OR snowboarder', gym: 'gymnast', golf: 'golfer', glisse: 'surfer OR skateboarder OR climber',
    us: 'american football OR baseball OR hockey',
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

// Wikimedia limite le débit : après un refus (429), tous les téléchargements font une pause.
let pausedUntil = 0;

async function request(url, attempt = 1) {
  await sleep(pausedUntil - Date.now());
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT } });
  if (response.status === 404) return null;
  if ((response.status === 429 || response.status >= 500) && attempt < 7) {
    await response.body?.cancel();
    const asked = Number(response.headers.get('retry-after')) * 1000;
    const wait = Math.min(60_000, asked > 0 ? asked : 2_000 * 2 ** (attempt - 1));
    pausedUntil = Math.max(pausedUntil, Date.now() + wait);
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

/** Nom de fichier Commons d'une page de crédit (https://commons.wikimedia.org/wiki/File:…). */
const fileOfPage = (url = '') => decodeURIComponent(url.split('File:')[1] ?? '').replace(/_/g, ' ');

/** Page Wikipédia (API MediaWiki) : titre, description, image principale, homonymie, Wikidata. */
async function lookup(lang, title) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'pageimages|description|pageprops|extracts|langlinks',
    piprop: 'original|name',
    exintro: '1',
    explaintext: '1',
    exsentences: '2',
    lllang: 'en',
    titles: title,
  });
  const data = await json(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  const page = data?.query?.pages?.[0];
  if (!page || page.missing || page.invalid) return null;
  return {
    lang,
    title: page.title,
    description: page.description ?? '',
    extract: page.extract ?? '',
    disambiguation: page.pageprops ? 'disambiguation' in page.pageprops : false,
    image: page.pageimage ?? null,
    item: page.pageprops?.wikibase_item ?? null,
    enTitle: page.langlinks?.[0]?.title ?? null,
  };
}

function accepts(page, sport) {
  if (!page || page.disambiguation) return false;
  return KEYWORDS[sport].test(`${page.description} ${page.extract}`);
}

async function search(lang, query) {
  const params = new URLSearchParams({ action: 'query', format: 'json', list: 'search', srlimit: '4', srsearch: query });
  const data = await json(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  return (data?.query?.search ?? []).map((result) => result.title);
}

/** Page de l'athlète dans une langue : lien depuis la page française, titre imposé, nom, puis recherche. */
async function resolve(lang, athlete, log, hint) {
  const name = `${athlete.first} ${athlete.last}`.trim().replace(/’/g, "'");
  const lastWord = normalize(athlete.last).split(/[\s-]/).pop();
  for (const title of new Set([hint, OVERRIDES[athlete.id], name].filter(Boolean))) {
    const page = await lookup(lang, title);
    if (accepts(page, athlete.sport)) return page;
    log.push(`${lang}:« ${title} » ${page ? (page.disambiguation ? 'homonymie' : 'autre sport') : 'introuvable'}`);
  }
  for (const title of await search(lang, `${name} ${SEARCH_WORDS[lang][athlete.sport]}`)) {
    if (!normalize(title).includes(lastWord)) continue;
    const page = await lookup(lang, title);
    if (accepts(page, athlete.sport)) return page;
  }
  return null;
}

const isPhoto = (file) => /\.(jpe?g|png|webp)$/i.test(file);

/** Images Wikidata (P18) d'un élément, la préférée d'abord. */
async function wikidataImages(item) {
  const data = await json(`https://www.wikidata.org/w/api.php?action=wbgetclaims&format=json&entity=${item}&property=P18`);
  const rank = { preferred: 0, normal: 1 };
  return (data?.claims?.P18 ?? [])
    .filter((claim) => claim.rank in rank)
    .sort((a, b) => rank[a.rank] - rank[b.rank])
    .map((claim) => claim.mainsnak?.datavalue?.value)
    .filter((file) => typeof file === 'string' && isPhoto(file));
}

/** Photos possibles, dans l'ordre : page française, page anglaise, Wikidata. */
async function* candidates(athlete, log) {
  const seen = new Set();
  let item = null;
  let enTitle = null;
  for (const lang of ['fr', 'en']) {
    const page = await resolve(lang, athlete, log, lang === 'en' ? enTitle : null);
    if (!page) continue;
    item ??= page.item;
    enTitle ??= page.enTitle;
    const file = page.image?.replace(/_/g, ' ');
    if (!file || !isPhoto(file)) log.push(`${lang}:« ${page.title} » sans photo`);
    else if (!seen.has(file)) {
      seen.add(file);
      yield { file, source: `${lang}:${page.title}` };
    }
  }
  if (!item) return;
  for (const file of await wikidataImages(item)) {
    if (seen.has(file)) continue;
    seen.add(file);
    yield { file, source: `wikidata:${item}` };
  }
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

/** Informations Commons : la photo doit y être hébergée (donc libre) avec une licence déclarée. */
async function commonsInfo(file) {
  const data = await json(
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1280&titles=${encodeURIComponent(`File:${file}`)}`,
  );
  const page = data && Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return { reason: 'absente de Commons' };
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (meta.NonFree?.value === 'true' || !license) return { reason: `licence refusée (${license || 'aucune'})` };
  return {
    info: {
      thumb: info.thumburl ?? info.url,
      page: info.descriptionurl,
      author: stripHtml(meta.Artist?.value) || 'Auteur inconnu',
      license,
      licenseUrl: meta.LicenseUrl?.value ?? '',
    },
  };
}

async function download() {
  mkdirSync(RAW_DIR, { recursive: true });
  const all = argv.includes('--tout') || process.env.PHOTOS_TOUT === 'true' || CONFIG.tout === true;
  const only = (option('seulement') ?? process.env.PHOTOS_SEULEMENT ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const limit = Number(option('limite') ?? CONFIG.limite ?? 0);
  const current = existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) : {};
  const refused = (id, file) => (REFUS[id] ?? []).includes(file);
  let athletes = readAthletes();
  if (only.length) athletes = athletes.filter((a) => only.includes(a.id));
  else if (!all) athletes = athletes.filter((a) => !current[a.id] || refused(a.id, fileOfPage(current[a.id].page)));
  if (limit > 0) athletes = athletes.slice(0, limit);

  const photos = {};
  const none = [];
  const errors = [];
  let next = 0;
  let done = 0;

  async function worker() {
    while (next < athletes.length) {
      const athlete = athletes[next++];
      const log = [];
      try {
        for await (const { file, source } of candidates(athlete, log)) {
          if (refused(athlete.id, file)) {
            log.push(`« ${file} » refusée`);
            continue;
          }
          const { info, reason } = await commonsInfo(file);
          if (!info) {
            log.push(`« ${file} » ${reason}`);
            continue;
          }
          const response = await request(info.thumb);
          if (!response) {
            log.push(`« ${file} » introuvable au téléchargement`);
            continue;
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          // assez grand pour que les athlètes pris de loin restent nets une fois détourés
          await sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(join(RAW_DIR, `${athlete.id}.jpg`));
          photos[athlete.id] = { file, source, ...info };
          break;
        }
        if (!photos[athlete.id]) {
          none.push(athlete.id);
          console.log(`  ${athlete.id} : aucune photo libre (${log.join(' ; ') || 'page introuvable'})`);
        }
      } catch (error) {
        // erreur réseau : on garde la photo actuelle, s'il y en a une
        errors.push(athlete.id);
        console.warn(`  ${athlete.id} : ${error.message}`);
      }
      done += 1;
      if (done % 25 === 0) console.log(`  ${done}/${athletes.length}`);
      await sleep(250);
    }
  }

  console.log(`Recherche des photos de ${athletes.length} athlètes${all && !only.length ? ' (tous)' : ''}…`);
  await Promise.all(Array.from({ length: 3 }, worker));
  writeFileSync(META_FILE, JSON.stringify({ photos, none }, null, 1));
  console.log(`${Object.keys(photos).length} photos trouvées, ${none.length} sans photo libre : ${none.join(', ') || '-'}`);
  if (errors.length) console.log(`${errors.length} erreurs réseau (photo actuelle conservée) : ${errors.join(', ')}`);
}

async function finalize() {
  mkdirSync(OUT_DIR, { recursive: true });
  const { photos, none } = JSON.parse(readFileSync(META_FILE, 'utf8'));
  const known = new Set(readAthletes().map((a) => a.id));
  const credits = existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) : {};
  for (const id of Object.keys(credits)) if (!known.has(id) || none.includes(id)) delete credits[id];
  let cutouts = 0;
  for (const [id, info] of Object.entries(photos)) {
    const raw = join(RAW_DIR, `${id}.jpg`);
    if (!existsSync(raw)) continue;
    const target = join(OUT_DIR, `${id}.webp`);
    const cut = join(CUT_DIR, `${id}.png`);
    let cutout = false;
    if (existsSync(cut)) {
      // on ne garde le détourage que s'il a vraiment isolé l'athlète
      const { channels } = await sharp(cut).stats();
      const coverage = channels[3] ? channels[3].mean / 255 : 1;
      if (coverage > 0.05 && coverage < 0.85) {
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
  // images qui n'ont plus d'athlète
  const used = new Set(Object.values(credits).map((credit) => credit.file));
  for (const file of readdirSync(OUT_DIR)) if (!used.has(file)) unlinkSync(join(OUT_DIR, file));
  const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CREDITS_FILE, `${JSON.stringify(sorted, null, 1)}\n`);
  console.log(`${Object.keys(photos).length} photos traitées (${cutouts} détourées), ${Object.keys(sorted).length} au total dans public/photos`);
}

if (step === 'telecharger') await download();
else if (step === 'finaliser') await finalize();
else {
  console.error('Étape inconnue. Utilise « telecharger » ou « finaliser ».');
  process.exit(1);
}
