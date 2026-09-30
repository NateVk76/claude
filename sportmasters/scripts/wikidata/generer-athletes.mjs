#!/usr/bin/env node
// Ajoute des athlètes réels depuis Wikidata, sport par sport, avec une célébrité calée sur la base
// manuelle d'après les vues de leur page Wikipédia en français sur les 12 derniers mois.
//
//   node scripts/wikidata/generer-athletes.mjs --contact "https://github.com/…" [--echelle 1] [--sortie src/data/athletes.generated.json]
//   node scripts/wikidata/generer-athletes.mjs --recaler     (sans réseau : recalcule célébrité et note)
//
// --contact : Wikimedia demande un moyen de contact dans l'en-tête User-Agent (l'adresse du dépôt suffit).
// --echelle : multiplie les quotas par sport (1 ≈ 500 athlètes, 20 ≈ 10 000).
// Tourne dans la GitHub Action .github/workflows/athletes.yml (il faut un accès à Wikimedia).
//
// Pour chaque sport : les athlètes les plus présents dans les Wikipédias du monde (Wikidata), dont la
// description confirme le sport, qui ne sont pas déjà dans la base manuelle ni dans exclus.json
// (identifiant Wikidata ou identifiant de carte, avec la raison) ;
// parmi eux, les plus consultés sur Wikipédia en français. Leur célébrité est celle des athlètes
// manuels qui ont la même popularité (vues en France × notoriété mondiale) : même popularité, même rareté.
// Les mesures (vues, nombre de Wikipédias) sont gardées dans le fichier : --recaler refait le calcul
// hors ligne, après une retouche de la formule, de celebrite.json ou de la base manuelle.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  archetypeFor,
  deathConfirmed,
  defaultFact,
  describesAthlete,
  factFrom,
  fameFromAnchors,
  fameFromRank,
  isCoach,
  levelFromSitelinksRank,
  normalizeName,
  pickCountry,
  retirementClue,
  SEARCH_WORDS,
  slugify,
  SPORT_KEYWORDS,
  splitName,
} from './helpers.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const path = (p) => join(ROOT, p);
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
const RECALIBRATE = process.argv.includes('--recaler');
if (!args.contact && !RECALIBRATE) {
  console.error('Précise un contact : --contact "https://github.com/ton-compte/ton-depot"');
  process.exit(1);
}
const SCALE = Number(args.echelle ?? 1);
const OUTPUT = resolve(ROOT, args.sortie ?? 'src/data/athletes.generated.json');
const USER_AGENT = `AthleticardsGenerator/1.0 (${args.contact})`;
const EXCLUDED = JSON.parse(readFileSync(new URL('./exclus.json', import.meta.url), 'utf8'));
// retouches à la main de la célébrité, par identifiant de carte : { "ferran-torres": 50 }
const FAME_OVERRIDES = JSON.parse(readFileSync(new URL('./celebrite.json', import.meta.url), 'utf8'));
const ANCHORS_FILE = new URL('./reperes.json', import.meta.url);
// noms d'usage quand le libellé Wikidata est l'état civil : { "francisco-roman-alarcon": { "first": "", "last": "Isco" } }
const NAME_OVERRIDES = JSON.parse(readFileSync(new URL('./noms.json', import.meta.url), 'utf8'));
const TITLE_OVERRIDES = JSON.parse(readFileSync(path('scripts/photos/titres.json'), 'utf8'));

// Métiers Wikidata (P106) et nombre d'athlètes à ajouter par métier (à l'échelle 1).
const SPORTS = [
  { sport: 'foot', occupation: 'Q937857', quota: 120 }, // footballeur
  { sport: 'basket', occupation: 'Q3665646', quota: 45 }, // basketteur
  { sport: 'tennis', occupation: 'Q10833314', quota: 40 }, // joueur de tennis
  { sport: 'athle', occupation: 'Q11513337', quota: 40 }, // athlète (athlétisme)
  { sport: 'natation', occupation: 'Q10843402', quota: 25 }, // nageur
  { sport: 'cyclisme', occupation: 'Q2309784', quota: 30 }, // coureur cycliste
  { sport: 'auto', occupation: 'Q10841764', quota: 15, fallback: { archetype: 'pilote-f1', role: 'Formule 1' } }, // pilote de F1
  { sport: 'auto', occupation: 'Q3014296', quota: 10, fallback: { archetype: 'pilote-moto', role: 'Moto' } }, // pilote de moto
  { sport: 'combat', occupation: 'Q11338576', quota: 12, fallback: { archetype: 'boxeur', role: 'Boxe' } }, // boxeur
  { sport: 'combat', occupation: 'Q11607585', quota: 10, fallback: { archetype: 'mma', role: 'MMA' } }, // combattant de MMA
  { sport: 'combat', occupation: 'Q6665249', quota: 10, fallback: { archetype: 'judoka', role: 'Judo' } }, // judoka
  { sport: 'rugby', occupation: 'Q14089670', quota: 30 }, // joueur de rugby à XV
  { sport: 'hand', occupation: 'Q12840545', quota: 20 }, // handballeur
  { sport: 'volley', occupation: 'Q15117302', quota: 20 }, // volleyeur
  { sport: 'hiver', occupation: 'Q4270517', quota: 10, fallback: { archetype: 'skieur', role: 'Ski alpin' } }, // skieur alpin
  { sport: 'hiver', occupation: 'Q16029547', quota: 8, fallback: { archetype: 'biathlete', role: 'Biathlon' } }, // biathlète
  { sport: 'hiver', occupation: 'Q13219587', quota: 7, fallback: { archetype: 'patineur', role: 'Patinage artistique' } }, // patineur
  { sport: 'gym', occupation: 'Q13381572', quota: 15 }, // gymnaste artistique
  { sport: 'golf', occupation: 'Q11303721', quota: 15 }, // golfeur
  { sport: 'glisse', occupation: 'Q13561328', quota: 8, fallback: { archetype: 'surfeur', role: 'Surf' } }, // surfeur
  { sport: 'us', occupation: 'Q19204627', quota: 8 }, // joueur de football américain
  { sport: 'us', occupation: 'Q10871364', quota: 6, fallback: { archetype: 'baseball', role: 'Baseball (MLB)' } }, // joueur de baseball
  { sport: 'us', occupation: 'Q11774891', quota: 8, fallback: { archetype: 'hockey', role: 'Hockey (NHL)' } }, // hockeyeur
  // english : description anglaise acceptée faute de française (beaucoup de joueurs d'esport n'en ont pas)
  { sport: 'pingpong', occupation: 'Q13382519', quota: 20, english: true }, // pongiste
  { sport: 'echecs', occupation: 'Q10873124', quota: 20, english: true }, // joueur d'échecs
  { sport: 'esport', occupation: 'Q4379701', quota: 20, english: true }, // joueur professionnel de jeux vidéo
];

// ───────────── Réseau ─────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
let pausedUntil = 0;

async function fetchJson(url, attempt = 1) {
  await sleep(pausedUntil - Date.now());
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Api-User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (response.status === 404) return null;
  if ((response.status === 429 || response.status >= 500) && attempt < 7) {
    await response.body?.cancel();
    const asked = Number(response.headers.get('retry-after')) * 1000;
    pausedUntil = Math.max(pausedUntil, Date.now() + Math.min(60_000, asked > 0 ? asked : 2_000 * 2 ** (attempt - 1)));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} sur ${url.slice(0, 160)}`);
  return response.json();
}

async function sparql(query) {
  const data = await fetchJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`);
  return data?.results?.bindings ?? [];
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

/** Vues de la page Wikipédia en français sur les 12 derniers mois complets. */
async function pageviews(title) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
  const fmt = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}01`;
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, '_'))}/monthly/${fmt(start)}/${fmt(end)}`;
  const data = await fetchJson(url).catch(() => null);
  return (data?.items ?? []).reduce((sum, item) => sum + item.views, 0);
}

// ───────────── Base manuelle ─────────────

function readCurated() {
  const source = readFileSync(path('src/data/athletes.ts'), 'utf8');
  const pattern = /^\s*a\('([^']+)', '([^']*)', '([^']*)', '([a-z]+)', '[^']*', '[^']*', '[A-Z-]+', (\d+), (\d+)/gm;
  return [...source.matchAll(pattern)].map((m) => ({ id: m[1], first: m[2], last: m[3], sport: m[4], fame: Number(m[5]) }));
}

/**
 * La page parle-t-elle du bon sport ? Écarte les homonymes, sans filtrer les streameurs ni les entraîneurs :
 * les athlètes de la base manuelle sont choisis à la main.
 */
function aboutSport(sport, description = '') {
  if (!description) return true;
  if (sport === 'foot' && /football (am[ée]ricain|canadien|australien|ga[ée]lique)/i.test(description)) return false;
  return SPORT_KEYWORDS[sport]?.test(description) ?? false;
}

/** Page d'un athlète manuel introuvable sous son nom (pseudo d'esport, homonyme) : recherche Wikipédia. */
async function searchCurated(athlete) {
  const name = `${athlete.first} ${athlete.last}`.trim();
  const lastWord = normalizeName(athlete.last).split(/[\s-]/).pop();
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: `${name} ${SEARCH_WORDS.fr[athlete.sport] ?? ''}`,
    gsrlimit: '4',
    prop: 'pageprops|description',
    ppprop: 'wikibase_item|disambiguation',
  });
  const data = await fetchJson(`https://fr.wikipedia.org/w/api.php?${params}`);
  const pages = (data?.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  for (const page of pages) {
    if (!normalizeName(page.title).includes(lastWord) || 'disambiguation' in (page.pageprops ?? {})) continue;
    if (!page.description || !aboutSport(athlete.sport, page.description)) continue;
    return { title: page.title, qid: page.pageprops?.wikibase_item };
  }
  return null;
}

/** Page Wikipédia, identifiant Wikidata et vues de chaque athlète manuel (pour caler la célébrité et repérer les doublons). */
async function resolveCurated(curated) {
  const titleOf = (athlete) => (TITLE_OVERRIDES[athlete.id] ?? `${athlete.first} ${athlete.last}`.trim()).replace(/’/g, "'");
  const resolved = new Map();
  for (let i = 0; i < curated.length; i += 50) {
    const batch = curated.slice(i, i + 50);
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      formatversion: '2',
      redirects: '1',
      prop: 'pageprops|description',
      ppprop: 'wikibase_item|disambiguation',
      titles: batch.map(titleOf).join('|'),
    });
    const data = await fetchJson(`https://fr.wikipedia.org/w/api.php?${params}`);
    const hop = new Map();
    for (const step of [...(data?.query?.normalized ?? []), ...(data?.query?.redirects ?? [])]) hop.set(step.from, step.to);
    const pages = new Map((data?.query?.pages ?? []).map((page) => [page.title, page]));
    for (const athlete of batch) {
      let title = titleOf(athlete);
      for (let guard = 0; hop.has(title) && guard < 3; guard++) title = hop.get(title);
      const page = pages.get(title);
      if (!page || page.missing || page.invalid || 'disambiguation' in (page.pageprops ?? {})) continue;
      // la page doit bien parler de ce sport (sinon c'est un homonyme)
      if (!aboutSport(athlete.sport, page.description)) continue;
      resolved.set(athlete.id, { title: page.title, qid: page.pageprops?.wikibase_item });
    }
  }
  const lost = [];
  for (const athlete of curated.filter((a) => !resolved.has(a.id))) {
    const found = await searchCurated(athlete);
    if (found) resolved.set(athlete.id, found);
    else lost.push(athlete.id);
    await sleep(200);
  }
  if (lost.length) console.log(`  pages introuvables (titres.json) : ${lost.join(', ')}`);
  const entries = [...resolved.entries()];
  const views = await mapLimit(entries, 8, ([, info]) => pageviews(info.title));
  entries.forEach(([, info], i) => (info.views = views[i]));
  // nombre de Wikipédias qui ont une page sur l'athlète
  const qids = entries.map(([, info]) => info.qid).filter(Boolean);
  const links = new Map();
  for (let i = 0; i < qids.length; i += 200) {
    const rows = await sparql(`SELECT ?item ?sitelinks WHERE { VALUES ?item { ${qids.slice(i, i + 200).map((q) => `wd:${q}`).join(' ')} } ?item wikibase:sitelinks ?sitelinks . }`);
    for (const row of rows) links.set(row.item.value.split('/').pop(), Number(row.sitelinks.value));
  }
  for (const [, info] of entries) info.sitelinks = links.get(info.qid) ?? 0;
  return resolved;
}

/** Introductions (texte brut, deux phrases) de pages d'une Wikipédia, en suivant les redirections. */
async function wikiIntros(lang, titles, extra = {}) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'extracts',
    exintro: '1',
    explaintext: '1',
    exsentences: '2',
    exlimit: '20',
    titles: titles.join('|'),
    ...extra,
  });
  const data = await fetchJson(`https://${lang}.wikipedia.org/w/api.php?${params}`);
  const hop = new Map([...(data?.query?.normalized ?? []), ...(data?.query?.redirects ?? [])].map((step) => [step.from, step.to]));
  const pages = new Map((data?.query?.pages ?? []).map((page) => [page.title, page]));
  return (title) => {
    let current = title;
    for (let guard = 0; hop.has(current) && guard < 3; guard++) current = hop.get(current);
    return pages.get(current);
  };
}

/**
 * Lit l'introduction Wikipédia de chaque athlète retenu, en français et en anglais :
 * - un décès n'est gardé que si l'une d'elles le confirme (« … et mort le … », « was a … »), pour ne
 *   jamais enterrer un vivant sur une erreur de Wikidata ;
 * - « is a French former footballer » en fait un retraité, donc une Icône, comme les légendes retraitées
 *   de la base manuelle (voir retirementClue).
 */
async function readIntros(people) {
  const fr = new Map();
  const enTitles = new Map();
  for (let i = 0; i < people.length; i += 20) {
    const batch = people.slice(i, i + 20);
    const page = await wikiIntros('fr', batch.map((person) => person.title), { prop: 'extracts|langlinks', lllang: 'en', lllimit: 'max' });
    for (const person of batch) {
      fr.set(person.qid, page(person.title)?.extract ?? '');
      const en = page(person.title)?.langlinks?.[0]?.title;
      if (en) enTitles.set(person.qid, en);
    }
    await sleep(300);
  }
  const en = new Map();
  const withEn = people.filter((person) => enTitles.has(person.qid));
  for (let i = 0; i < withEn.length; i += 20) {
    const batch = withEn.slice(i, i + 20);
    const page = await wikiIntros('en', batch.map((person) => enTitles.get(person.qid)));
    for (const person of batch) en.set(person.qid, page(enTitles.get(person.qid))?.extract ?? '');
    await sleep(300);
  }
  const year = new Date().getUTCFullYear();
  for (const person of people) {
    const intro = { fr: fr.get(person.qid) ?? '', en: en.get(person.qid) ?? '' };
    if (person.died && (intro.fr || intro.en) && !deathConfirmed(intro.fr, intro.en)) {
      console.log(`  décès non confirmé par Wikipédia, carte laissée « en vie » : ${person.name} (${person.died})`);
      person.died = undefined;
    }
    const clue = retirementClue({ ...intro, born: person.born, died: person.died, year });
    person.retired = Boolean(clue);
    // de quoi relire les décisions dans le journal de l'Action
    if (clue) console.log(`  retraité (${clue}) : ${person.name}`);
    else if (person.born && year - person.born >= 36) console.log(`  en activité à ${year - person.born} ans : ${person.name} : ${(intro.en || intro.fr).slice(0, 140)}`);
  }
  console.log(`${people.filter((person) => person.retired).length} retraités sur ${people.length} (${en.size} pages en anglais)`);
}

// ───────────── Wikidata ─────────────

async function candidatesFor(config, limit) {
  // le football compte des centaines de milliers de joueurs : un seuil plus haut évite que la requête expire
  const minLinks = config.sport === 'foot' ? 20 : 6;
  const rows = await sparql(`
SELECT ?athlete ?sitelinks WHERE {
  ?athlete wdt:P106 wd:${config.occupation} ;
           wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= ${minLinks})
  ?article schema:about ?athlete ;
           schema:isPartOf <https://fr.wikipedia.org/> .
}
ORDER BY DESC(?sitelinks)
LIMIT ${limit}`);
  return rows.map((row) => ({ qid: row.athlete.value.split('/').pop(), sitelinks: Number(row.sitelinks.value) }));
}

/** Nom, description, page, dates, pays, postes et disciplines, par paquets. */
async function details(qids) {
  const out = new Map();
  for (let i = 0; i < qids.length; i += 120) {
    const batch = qids.slice(i, i + 120);
    const rows = await sparql(`
SELECT ?athlete (SAMPLE(?label) AS ?name) (SAMPLE(?description) AS ?desc) (SAMPLE(?enDescription) AS ?enDesc)
  (SAMPLE(?title) AS ?page) (SAMPLE(?birth) AS ?born) (SAMPLE(?death) AS ?died) (SAMPLE(?gender) AS ?sex)
  (GROUP_CONCAT(DISTINCT ?cc; separator=",") AS ?citizen)
  (GROUP_CONCAT(DISTINCT ?sc; separator=",") AS ?sportCountry)
  (GROUP_CONCAT(DISTINCT ?bc; separator=",") AS ?birthCountry)
  (GROUP_CONCAT(DISTINCT ?posLabel; separator=" | ") AS ?positions)
  (GROUP_CONCAT(DISTINCT ?discLabel; separator=" | ") AS ?disciplines)
WHERE {
  VALUES ?athlete { ${batch.map((qid) => `wd:${qid}`).join(' ')} }
  ?article schema:about ?athlete ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?title .
  OPTIONAL { ?athlete rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  OPTIONAL { ?athlete schema:description ?description . FILTER(LANG(?description) = "fr") }
  OPTIONAL { ?athlete schema:description ?enDescription . FILTER(LANG(?enDescription) = "en") }
  OPTIONAL { ?athlete wdt:P21 ?gender . }
  OPTIONAL { ?athlete wdt:P569 ?birth . }
  OPTIONAL { ?athlete wdt:P570 ?death . }
  OPTIONAL { ?athlete wdt:P27 ?country . ?country wdt:P297 ?cc . }
  OPTIONAL { ?athlete wdt:P1532 ?forCountry . { ?forCountry wdt:P297 ?sc . } UNION { ?forCountry wdt:P300 ?sc . } }
  OPTIONAL { ?athlete wdt:P19 ?birthPlace . ?birthPlace wdt:P17 ?birthState . ?birthState wdt:P297 ?bc . }
  OPTIONAL { ?athlete wdt:P413 ?position . ?position rdfs:label ?posLabel . FILTER(LANG(?posLabel) = "fr") }
  OPTIONAL { ?athlete wdt:P2416 ?discipline . ?discipline rdfs:label ?discLabel . FILTER(LANG(?discLabel) = "fr") }
}
GROUP BY ?athlete`);
    const codes = (text) => (text ?? '').split(',').filter((code) => /^[A-Z]{2}(-[A-Z]{3})?$/.test(code));
    for (const row of rows) {
      const qid = row.athlete.value.split('/').pop();
      out.set(qid, {
        label: row.name?.value ?? row.page.value,
        description: row.desc?.value ?? '',
        // faute de description en français (joueurs d'esport, souvent), l'anglaise dit au moins le sport et le jeu
        enDescription: row.enDesc?.value ?? '',
        female: /\/(Q6581072|Q1052281)$/.test(row.sex?.value ?? ''),
        title: row.page.value,
        born: row.born ? Number(row.born.value.slice(0, 4)) : undefined,
        died: row.died ? Number(row.died.value.slice(0, 4)) : undefined,
        citizen: codes(row.citizen?.value),
        sportCountry: codes(row.sportCountry?.value),
        birthCountry: codes(row.birthCountry?.value),
        positions: row.positions?.value ?? '',
        disciplines: row.disciplines?.value ?? '',
      });
    }
    await sleep(500);
  }
  return out;
}

// ───────────── Célébrité et note ─────────────

/** Popularité : vues Wikipédia en français × (nombre de Wikipédias)², l'audience en France et la notoriété mondiale à parts égales. */
const popularity = (views, links) => (views + 1) * (links + 1) ** 2;

// Entraîneurs : leur célébrité de joueur ne dépasse pas « rare ».
const COACH_FAME_CAP = 74;

/**
 * Célébrité de chaque athlète (champ fame), calée sur la base manuelle, et note sportive (level)
 * d'après son rang de notoriété mondiale. anchors : [{ id, fame, vues, liens }].
 */
function calibrate(athletes, anchors) {
  const scale = anchors.filter((a) => a.vues > 0).map((a) => ({ views: popularity(a.vues, a.liens), fame: a.fame }));
  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const byPopularity = athletes.slice().sort((a, b) => popularity(b.vues, b.liens) - popularity(a.vues, a.liens) || byId(a, b));
  byPopularity.forEach((athlete, rank) => {
    let fame = scale.length >= 30 ? fameFromAnchors(popularity(athlete.vues, athlete.liens), scale) : fameFromRank(rank, athletes.length);
    if (athlete.entraineur) fame = Math.min(fame, COACH_FAME_CAP);
    athlete.fame = FAME_OVERRIDES[athlete.id] ?? fame;
  });
  athletes
    .slice()
    .sort((a, b) => b.liens - a.liens || b.vues - a.vues || byId(a, b))
    .forEach((athlete, rank) => (athlete.level = levelFromSitelinksRank(rank, athletes.length)));
  athletes.sort((a, b) => (a.sport < b.sport ? -1 : a.sport > b.sport ? 1 : b.fame - a.fame || (a.id < b.id ? -1 : 1)));
}

function report(athletes) {
  const tier = (fame) => (fame >= 90 ? 'légendaire' : fame >= 75 ? 'épique' : fame >= 60 ? 'rare' : fame >= 44 ? 'peu commune' : 'commune');
  const count = (key) => athletes.reduce((acc, a) => ((acc[key(a)] = (acc[key(a)] ?? 0) + 1), acc), {});
  console.log(`\n${athletes.length} athlètes écrits dans ${args.sortie ?? 'src/data/athletes.generated.json'}`);
  console.log('Raretés :', count((a) => tier(a.fame)));
  console.log('Sports :', count((a) => a.sport));
  console.log('Pays :', JSON.stringify(Object.entries(count((a) => a.country)).sort((a, b) => b[1] - a[1])));
  console.log('Les plus célèbres :', athletes.slice().sort((a, b) => b.fame - a.fame).slice(0, 40).map((a) => `${a.first} ${a.last} (${a.fame})`).join(', '));
}

/** --recaler : même calcul, sans réseau, à partir des mesures déjà enregistrées. */
function recalibrate() {
  const athletes = JSON.parse(readFileSync(OUTPUT, 'utf8'));
  const fames = new Map(readCurated().map((a) => [a.id, a.fame]));
  // la célébrité des repères suit la base manuelle telle qu'elle est aujourd'hui
  const anchors = JSON.parse(readFileSync(ANCHORS_FILE, 'utf8')).filter((a) => fames.has(a.id)).map((a) => ({ ...a, fame: fames.get(a.id) }));
  calibrate(athletes, anchors);
  writeFileSync(OUTPUT, `${JSON.stringify(athletes, null, 1)}\n`);
  report(athletes);
}

// ───────────── Programme ─────────────

async function main() {
  const curated = readCurated();
  console.log(`Base manuelle : ${curated.length} athlètes, recherche de leurs pages…`);
  const resolved = await resolveCurated(curated);
  const curatedQids = new Set([...resolved.values()].map((info) => info.qid).filter(Boolean));
  // noms complets dans les deux ordres (« Ma Long »), noms de famille seuls et sans suffixe (« Neymar Jr » → « neymar »)
  const curatedNames = new Set(
    curated.flatMap((a) => {
      const last = normalizeName(a.last);
      const full = [normalizeName(`${a.first} ${a.last}`.trim()), normalizeName(`${a.last} ${a.first}`.trim())];
      return [...full, last, last.replace(/ (jr|junior|filho|neto|sr)$/, '')];
    }),
  );
  const curatedIds = new Set(curated.map((a) => a.id));
  const anchors = curated
    .filter((a) => resolved.get(a.id)?.views > 0)
    .map((a) => ({ id: a.id, fame: a.fame, vues: resolved.get(a.id).views, liens: resolved.get(a.id).sitelinks }));
  writeFileSync(ANCHORS_FILE, `${JSON.stringify(anchors, null, 1)}\n`);
  console.log(`  ${resolved.size} pages trouvées, ${anchors.length} servent à caler la célébrité`);

  // libellés des métiers Wikidata, pour vérifier les identifiants dans le journal
  const jobs = await sparql(`SELECT ?job ?label WHERE { VALUES ?job { ${[...new Set(SPORTS.map((c) => `wd:${c.occupation}`))].join(' ')} } ?job rdfs:label ?label . FILTER(LANG(?label) = "fr") }`);
  console.log(`Métiers : ${jobs.map((row) => `${row.job.value.split('/').pop()} ${row.label.value}`).join(', ')}`);

  const taken = new Set(curatedQids);
  const selected = [];
  for (const config of SPORTS) {
    const quota = Math.max(1, Math.round(config.quota * SCALE));
    const pool = await candidatesFor(config, Math.min(5000, Math.max(150, quota * 6)));
    const fresh = pool.filter((c) => !taken.has(c.qid) && !EXCLUDED[c.qid]);
    const info = await details(fresh.map((c) => c.qid));
    const eligible = [];
    for (const candidate of fresh) {
      const person = info.get(candidate.qid);
      if (!person || !describesAthlete(config.sport, person.description, config.english ? person.enDescription : '')) continue;
      const name = person.label.replace(/\s*\(.*\)\s*$/, '');
      if (curatedNames.has(normalizeName(name)) || EXCLUDED[slugify(name)]) continue;
      const country = pickCountry(person.sportCountry, person.citizen, person.description, person.birthCountry);
      if (!country) continue;
      eligible.push({ ...candidate, ...person, name, country });
      if (eligible.length >= quota * 3) break;
    }
    const views = await mapLimit(eligible, 8, (person) => pageviews(person.title));
    eligible.forEach((person, i) => (person.views = views[i]));
    const chosen = eligible.sort((a, b) => b.views - a.views).slice(0, quota);
    for (const person of chosen) {
      taken.add(person.qid);
      selected.push({ ...person, config });
    }
    console.log(`  ${config.sport} (${config.occupation}) : ${chosen.length}/${quota} (${pool.length} candidats, ${eligible.length} retenus)`);
    await sleep(1_000);
  }

  await readIntros(selected);

  const usedIds = new Set(curatedIds);
  const athletes = selected.map((person) => {
    let id = slugify(person.name) || person.qid.toLowerCase();
    if (usedIds.has(id)) id = `${id}-${person.qid.toLowerCase()}`;
    usedIds.add(id);
    const { first, last } = NAME_OVERRIDES[id] ?? splitName(person.name, person.country);
    const described = person.description || (person.config.english ? person.enDescription : '');
    const text = [described, person.positions, person.disciplines].filter(Boolean).join(' | ');
    const { archetype, role } = archetypeFor(person.config.sport, text, person.config.fallback);
    return {
      id,
      first,
      last,
      sport: person.config.sport,
      archetype,
      role,
      country: person.country,
      fame: 0,
      level: 0,
      fact: factFrom(person.description, defaultFact(person.config.sport, role, person.female)),
      ...(person.retired ? { retired: true } : {}),
      ...(person.died ? { born: person.born, died: person.died } : {}),
      wikidata: person.qid,
      wiki: person.title,
      // mesures gardées pour --recaler
      vues: person.views,
      liens: person.sitelinks,
      ...(isCoach(person.description) ? { entraineur: true } : {}),
    };
  });
  calibrate(athletes, anchors);
  writeFileSync(OUTPUT, `${JSON.stringify(athletes, null, 1)}\n`);
  report(athletes);
}

(RECALIBRATE ? Promise.resolve().then(recalibrate) : main()).catch((error) => {
  console.error(error);
  process.exit(1);
});
