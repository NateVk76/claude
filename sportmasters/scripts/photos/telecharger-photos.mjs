#!/usr/bin/env node
// Photos des athlètes depuis Wikimedia Commons (licences libres uniquement), avec crédits.
//
//   node scripts/photos/telecharger-photos.mjs telecharger [--tout] [--limite 20] [--seulement messi,duplantis]
//   python scripts/photos/detourer.py            (optionnel : détourage automatique avec rembg)
//   node scripts/photos/telecharger-photos.mjs finaliser
//
// Étape « telecharger » : pour chaque athlète, prend la première photo libre de Commons parmi
// l'image principale de sa page Wikipédia en français, celle de sa page en anglais, puis son
// image Wikidata. Une photo choisie à la main dans choix.json (éventuellement recadrée) passe avant tout ; celles listées
// dans refus.json sont ignorées (plusieurs personnes, athlète de dos…). Par défaut, seuls les
// athlètes sans photo, ou dont la photo est refusée ou n'est plus celle choisie, sont traités ;
// --tout (ou "tout": true dans config.json) les refait tous. Pour les athlètes listés dans
// "explorer" (config.json), une planche numérotée de leurs photos Commons est enregistrée dans
// scripts/photos/explorer/ pour aider à choisir.
// Étape « finaliser » : produit public/photos/<id>.webp, la photo entière avec son décor cadrée au format
// 3:4 de la fenêtre des cartes (ou détourée si "detourage": true dans config.json et que le détourage est
// propre), et met à jour src/data/photos.json (crédits affichés dans le jeu).
// Sous Windows, si sharp est bloqué par la politique de sécurité, les images sont gardées telles quelles :
// lancer scripts/photos/recadrer.ps1 entre les deux étapes (voir le README).
// Tourne dans la GitHub Action .github/workflows/photos.yml (il faut un accès à Wikimedia).

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEARCH_WORDS, SPORT_KEYWORDS } from '../wikidata/helpers.mjs';

// sharp (module natif) peut être bloqué par la politique de sécurité de Windows : on garde alors les
// images de Commons telles quelles (jpg), sans recadrage ni planches d'exploration.
let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('sharp indisponible : images gardées telles quelles, sans recadrage ni conversion.');
}

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
const CHOIX = readJson('./choix.json');
/** Photo choisie à la main : un nom de fichier, ou { fichier, recadrage: [x, y, largeur, hauteur] } en fractions de l'image. */
const choiceOf = (id) => {
  const choice = CHOIX[id];
  if (!choice) return null;
  return typeof choice === 'string' ? { file: choice } : { file: choice.fichier, crop: choice.recadrage };
};
const EXPLORE_DIR = path('scripts/photos/explorer');
const REPO = process.env.GITHUB_REPOSITORY ?? 'NateVk76/claude';
const USER_AGENT = `AthletiCardsPhotos/1.0 (https://github.com/${REPO}; jeu de fan non commercial)`;

const argv = process.argv.slice(2);
const step = argv[0];
const option = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

// Mots qui doivent apparaître dans la description Wikipédia pour être sûr d'avoir le bon athlète.
const KEYWORDS = SPORT_KEYWORDS;

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

/** Base manuelle (athletes.ts) puis athlètes générés depuis Wikidata (identifiant et page connus). */
function readAthletes() {
  const source = readFileSync(path('src/data/athletes.ts'), 'utf8');
  const out = [];
  const pattern = /^\s*a\('([^']+)', '([^']*)', '([^']*)', '([a-z]+)', '[^']*', '[^']*', '[A-Z-]+', (\d+), (\d+)/gm;
  for (const m of source.matchAll(pattern)) out.push({ id: m[1], first: m[2], last: m[3], sport: m[4], fame: Number(m[5]) });
  const ids = new Set(out.map((a) => a.id));
  const generated = JSON.parse(readFileSync(path('src/data/athletes.generated.json'), 'utf8'));
  for (const a of generated) {
    if (ids.has(a.id)) continue;
    ids.add(a.id);
    out.push({ id: a.id, first: a.first, last: a.last, sport: a.sport, fame: a.fame, wikidata: a.wikidata, wiki: a.wiki });
  }
  // cartes Mythe : M('id', 'Nom', 'sport', 'type', 'PAYS', célébrité, …) → identifiant « mythe-id »
  const mythes = /^\s*M\('([^']+)', '([^']*)', '([a-z]+)', '[a-z]+', '[A-Z-]+', (\d+)/gm;
  for (const m of source.matchAll(mythes)) out.push({ id: `mythe-${m[1]}`, first: '', last: m[2], sport: m[3], fame: Number(m[4]) });
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
  const choice = choiceOf(athlete.id);
  if (choice) {
    seen.add(choice.file);
    yield { file: choice.file, source: 'choix', crop: choice.crop };
  }
  // athlète généré : son élément Wikidata et sa page sont connus, on ne garde que des pages qui en parlent
  let item = athlete.wikidata ?? null;
  let enTitle = null;
  for (const lang of ['fr', 'en']) {
    const page = await resolve(lang, athlete, log, lang === 'en' ? enTitle : athlete.wiki);
    if (!page) continue;
    if (athlete.wikidata && page.item && page.item !== athlete.wikidata) {
      log.push(`${lang}:« ${page.title} » homonyme`);
      continue;
    }
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

/** Planche numérotée des photos Commons d'un athlète (une ou plusieurs recherches), pour en choisir une dans choix.json. */
async function explore(athlete, queries) {
  const pages = [];
  const seen = new Set();
  for (const query of queries) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      generator: 'search',
      gsrsearch: `${query} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: '40',
      prop: 'imageinfo',
      iiprop: 'url|size|extmetadata',
      iiurlwidth: '330',
    });
    const data = await json(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const page of (data?.query?.pages ?? []).sort((a, b) => a.index - b.index)) {
      if (seen.has(page.title)) continue;
      seen.add(page.title);
      pages.push(page);
    }
  }
  const [W, H, LABEL, COLS] = [220, 290, 22, 6];
  const layers = [];
  const list = [];
  for (const page of pages) {
    if (list.length >= 36) break;
    const info = page.imageinfo?.[0];
    const file = page.title.replace(/^File:/, '');
    const license = stripHtml(info?.extmetadata?.LicenseShortName?.value);
    if (!info || !isPhoto(file) || !license || info.extmetadata?.NonFree?.value === 'true') continue;
    const response = await request(info.thumburl ?? info.url);
    if (!response) continue;
    const n = list.length + 1;
    const [x, y] = [((n - 1) % COLS) * W, Math.floor((n - 1) / COLS) * (H + LABEL)];
    const tile = await sharp(Buffer.from(await response.arrayBuffer())).rotate().resize(W, H, { fit: 'contain', background: '#222' }).jpeg().toBuffer();
    const label = `<svg width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="#000"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="#fff">${n} · ${info.width}×${info.height}</text></svg>`;
    layers.push({ input: tile, left: x, top: y }, { input: Buffer.from(label), left: x, top: y + H });
    list.push({ n, file, license, width: info.width, height: info.height });
  }
  if (!list.length) {
    console.log(`  ${athlete.id} : aucune photo libre trouvée sur Commons`);
    return;
  }
  mkdirSync(EXPLORE_DIR, { recursive: true });
  const size = { width: COLS * W, height: Math.ceil(list.length / COLS) * (H + LABEL), channels: 3, background: '#111' };
  await sharp({ create: size }).composite(layers).jpeg({ quality: 72 }).toFile(join(EXPLORE_DIR, `${athlete.id}.jpg`));
  writeFileSync(join(EXPLORE_DIR, `${athlete.id}.json`), `${JSON.stringify(list, null, 1)}\n`);
  console.log(`  ${athlete.id} : ${list.length} photos sur la planche scripts/photos/explorer/${athlete.id}.jpg`);
}

async function download() {
  mkdirSync(RAW_DIR, { recursive: true });
  const all = argv.includes('--tout') || process.env.PHOTOS_TOUT === 'true' || CONFIG.tout === true;
  const only = (option('seulement') ?? process.env.PHOTOS_SEULEMENT ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  const limit = Number(option('limite') ?? CONFIG.limite ?? 0);
  const current = existsSync(CREDITS_FILE) ? JSON.parse(readFileSync(CREDITS_FILE, 'utf8')) : {};
  const refused = (id, file) => (REFUS[id] ?? []).includes(file);
  const currentFile = (id) => fileOfPage(current[id]?.page);
  const sameCrop = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const outdated = (a) => {
    const choice = choiceOf(a.id);
    if (!current[a.id] || refused(a.id, currentFile(a.id))) return true;
    return !!choice && (choice.file !== currentFile(a.id) || !sameCrop(choice.crop, current[a.id].crop));
  };
  let athletes = readAthletes();
  // "explorer" : une liste d'identifiants, ou { "identifiant": ["recherche", …] } pour chercher autre chose que le nom
  const explorer = Array.isArray(CONFIG.explorer) ? Object.fromEntries(CONFIG.explorer.map((id) => [id, []])) : (CONFIG.explorer ?? {});
  for (const athlete of athletes.filter((a) => sharp && a.id in explorer)) {
    const queries = [explorer[athlete.id]].flat().filter(Boolean);
    const search = queries.length ? queries : [`${athlete.first} ${athlete.last}`.trim()];
    await explore(athlete, search).catch((error) => console.warn(`  ${athlete.id} : ${error.message}`));
  }
  if (only.length) athletes = athletes.filter((a) => only.includes(a.id));
  else if (!all) athletes = athletes.filter(outdated);
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
        for await (const { file, source, crop } of candidates(athlete, log)) {
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
          // sans sharp, l'image est gardée telle quelle (ni redressée ni recadrée)
          let image = sharp ? sharp(await sharp(buffer).rotate().toBuffer()) : null;
          if (image && crop) {
            // recadrage choisi à la main : on ne garde que l'athlète (sans caméra ni voisin)
            const { width, height } = await image.metadata();
            const left = Math.round(crop[0] * width);
            const top = Math.round(crop[1] * height);
            image = image.extract({ left, top, width: Math.min(width - left, Math.round(crop[2] * width)), height: Math.min(height - top, Math.round(crop[3] * height)) });
          }
          // assez grand pour que les athlètes pris de loin restent nets une fois détourés
          const raw = join(RAW_DIR, `${athlete.id}.jpg`);
          if (image) await image.resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 90 }).toFile(raw);
          else writeFileSync(raw, buffer);
          photos[athlete.id] = { file, source, ...(crop && image ? { crop } : {}), ...info };
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
    if (!sharp) {
      copyFileSync(raw, join(OUT_DIR, `${id}.jpg`));
      credits[id] = { file: `${id}.jpg`, cutout: false, author: info.author, license: info.license, licenseUrl: info.licenseUrl, page: info.page };
      continue;
    }
    const target = join(OUT_DIR, `${id}.webp`);
    const cut = join(CUT_DIR, `${id}.png`);
    let cutout = false;
    if (CONFIG.detourage && existsSync(cut)) {
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
      // photo entière au format de la fenêtre des cartes (3:4), cadrée sur la zone la plus intéressante,
      // sauf cadrage imposé dans config.json (« cadrage »: { "messi": "top" }, positions de sharp : top, left, right…)
      const position = CONFIG.cadrage?.[id] ?? sharp.strategy.attention;
      await sharp(raw).resize(600, 800, { fit: 'cover', position }).webp({ quality: 80 }).toFile(target);
    }
    credits[id] = {
      file: `${id}.webp`,
      cutout,
      author: info.author,
      license: info.license,
      licenseUrl: info.licenseUrl,
      page: info.page,
      ...(info.crop ? { crop: info.crop } : {}),
    };
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
