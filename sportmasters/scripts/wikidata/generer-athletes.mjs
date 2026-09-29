#!/usr/bin/env node
// Ajoute des athlètes réels depuis Wikidata, sport par sport, avec une célébrité calée sur la base
// manuelle d'après les vues de leur page Wikipédia en français sur les 12 derniers mois.
//
//   node scripts/wikidata/generer-athletes.mjs --contact "https://github.com/…" [--echelle 1] [--sortie src/data/athletes.generated.json]
//
// --contact : Wikimedia demande un moyen de contact dans l'en-tête User-Agent (l'adresse du dépôt suffit).
// --echelle : multiplie les quotas par sport (1 ≈ 500 athlètes, 20 ≈ 10 000).
// Tourne dans la GitHub Action .github/workflows/athletes.yml (il faut un accès à Wikimedia).
//
// Pour chaque sport : les athlètes les plus présents dans les Wikipédias du monde (Wikidata), dont la
// description confirme le sport, qui ne sont pas déjà dans la base manuelle ni dans exclus.json
// (identifiant Wikidata ou identifiant de carte, avec la raison) ;
// parmi eux, les plus consultés sur Wikipédia en français. Leur célébrité est celle des athlètes
// manuels qui ont autant de vues : à audience égale, même rareté.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  archetypeFor,
  describesAthlete,
  factFrom,
  fameFromAnchors,
  fameFromRank,
  levelFromSitelinksRank,
  normalizeName,
  pickCountry,
  slugify,
  splitName,
} from './helpers.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const path = (p) => join(ROOT, p);
const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
if (!args.contact) {
  console.error('Précise un contact : --contact "https://github.com/ton-compte/ton-depot"');
  process.exit(1);
}
const SCALE = Number(args.echelle ?? 1);
const OUTPUT = resolve(ROOT, args.sortie ?? 'src/data/athletes.generated.json');
const USER_AGENT = `AthleticardsGenerator/1.0 (${args.contact})`;
const EXCLUDED = JSON.parse(readFileSync(new URL('./exclus.json', import.meta.url), 'utf8'));
const TITLE_OVERRIDES = JSON.parse(readFileSync(path('scripts/photos/titres.json'), 'utf8'));

// Métiers Wikidata (P106) et nombre d'athlètes à ajouter par métier (à l'échelle 1).
const SPORTS = [
  { sport: 'foot', occupation: 'Q937857', quota: 120 }, // footballeur
  { sport: 'basket', occupation: 'Q3665646', quota: 45 }, // basketteur
  { sport: 'tennis', occupation: 'Q10833314', quota: 40 }, // joueur de tennis
  { sport: 'athle', occupation: 'Q11513337', quota: 40 }, // athlète (athlétisme)
  { sport: 'natation', occupation: 'Q10843402', quota: 25 }, // nageur
  { sport: 'cyclisme', occupation: 'Q2309784', quota: 30 }, // coureur cycliste
  { sport: 'auto', occupation: 'Q10841764', quota: 15, forced: { archetype: 'pilote-f1', role: 'Formule 1' } }, // pilote de F1
  { sport: 'auto', occupation: 'Q3014296', quota: 10, forced: { archetype: 'pilote-moto', role: 'Moto' } }, // pilote de moto
  { sport: 'combat', occupation: 'Q11338576', quota: 12, forced: { archetype: 'boxeur', role: 'Boxe' } }, // boxeur
  { sport: 'combat', occupation: 'Q11607585', quota: 10, forced: { archetype: 'mma', role: 'MMA' } }, // combattant de MMA
  { sport: 'combat', occupation: 'Q6665249', quota: 10, forced: { archetype: 'judoka', role: 'Judo' } }, // judoka
  { sport: 'rugby', occupation: 'Q14089670', quota: 30 }, // joueur de rugby à XV
  { sport: 'hand', occupation: 'Q12840545', quota: 20 }, // handballeur
  { sport: 'volley', occupation: 'Q15117302', quota: 20 }, // volleyeur
  { sport: 'hiver', occupation: 'Q4270517', quota: 10, forced: { archetype: 'skieur', role: 'Ski alpin' } }, // skieur alpin
  { sport: 'hiver', occupation: 'Q16029547', quota: 8, forced: { archetype: 'biathlete', role: 'Biathlon' } }, // biathlète
  { sport: 'hiver', occupation: 'Q13219587', quota: 7, forced: { archetype: 'patineur', role: 'Patinage artistique' } }, // patineur
  { sport: 'gym', occupation: 'Q13381572', quota: 15 }, // gymnaste artistique
  { sport: 'golf', occupation: 'Q11303721', quota: 15 }, // golfeur
  { sport: 'glisse', occupation: 'Q13561328', quota: 8, forced: { archetype: 'surfeur', role: 'Surf' } }, // surfeur
  { sport: 'us', occupation: 'Q19204627', quota: 8 }, // joueur de football américain
  { sport: 'us', occupation: 'Q10871364', quota: 6, forced: { archetype: 'baseball', role: 'Baseball (MLB)' } }, // joueur de baseball
  { sport: 'us', occupation: 'Q11774891', quota: 8, forced: { archetype: 'hockey', role: 'Hockey (NHL)' } }, // hockeyeur
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
      if (page.description && !describesAthlete(athlete.sport, page.description)) continue;
      resolved.set(athlete.id, { title: page.title, qid: page.pageprops?.wikibase_item });
    }
  }
  const entries = [...resolved.entries()];
  const views = await mapLimit(entries, 8, ([, info]) => pageviews(info.title));
  entries.forEach(([, info], i) => (info.views = views[i]));
  return resolved;
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
SELECT ?athlete (SAMPLE(?label) AS ?name) (SAMPLE(?description) AS ?desc) (SAMPLE(?title) AS ?page)
  (SAMPLE(?birth) AS ?born) (SAMPLE(?death) AS ?died)
  (GROUP_CONCAT(DISTINCT ?cc; separator=",") AS ?citizen)
  (GROUP_CONCAT(DISTINCT ?sc; separator=",") AS ?sportCountry)
  (GROUP_CONCAT(DISTINCT ?posLabel; separator=" | ") AS ?positions)
  (GROUP_CONCAT(DISTINCT ?discLabel; separator=" | ") AS ?disciplines)
WHERE {
  VALUES ?athlete { ${batch.map((qid) => `wd:${qid}`).join(' ')} }
  ?article schema:about ?athlete ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?title .
  OPTIONAL { ?athlete rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  OPTIONAL { ?athlete schema:description ?description . FILTER(LANG(?description) = "fr") }
  OPTIONAL { ?athlete wdt:P569 ?birth . }
  OPTIONAL { ?athlete wdt:P570 ?death . }
  OPTIONAL { ?athlete wdt:P27 ?country . ?country wdt:P297 ?cc . }
  OPTIONAL { ?athlete wdt:P1532 ?forCountry . { ?forCountry wdt:P297 ?sc . } UNION { ?forCountry wdt:P300 ?sc . } }
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
        title: row.page.value,
        born: row.born ? Number(row.born.value.slice(0, 4)) : undefined,
        died: row.died ? Number(row.died.value.slice(0, 4)) : undefined,
        citizen: codes(row.citizen?.value),
        sportCountry: codes(row.sportCountry?.value),
        positions: row.positions?.value ?? '',
        disciplines: row.disciplines?.value ?? '',
      });
    }
    await sleep(500);
  }
  return out;
}

// ───────────── Programme ─────────────

async function main() {
  const curated = readCurated();
  console.log(`Base manuelle : ${curated.length} athlètes, recherche de leurs pages…`);
  const resolved = await resolveCurated(curated);
  const curatedQids = new Set([...resolved.values()].map((info) => info.qid).filter(Boolean));
  // noms complets, noms de famille seuls et sans suffixe (« Neymar Jr » → « neymar »)
  const curatedNames = new Set(
    curated.flatMap((a) => {
      const last = normalizeName(a.last);
      return [normalizeName(`${a.first} ${a.last}`.trim()), last, last.replace(/ (jr|junior|filho|neto|sr)$/, '')];
    }),
  );
  const curatedIds = new Set(curated.map((a) => a.id));
  const anchors = curated.filter((a) => resolved.get(a.id)?.views > 0).map((a) => ({ views: resolved.get(a.id).views, fame: a.fame }));
  console.log(`  ${resolved.size} pages trouvées, ${anchors.length} servent à caler la célébrité`);

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
      if (!person || !describesAthlete(config.sport, person.description)) continue;
      const name = person.label.replace(/\s*\(.*\)\s*$/, '');
      if (curatedNames.has(normalizeName(name)) || EXCLUDED[slugify(name)]) continue;
      const country = pickCountry(person.sportCountry, person.citizen, person.description);
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

  // célébrité calée sur la base manuelle ; sinon, paliers par rang de vues
  const useAnchors = anchors.length >= 30;
  selected
    .slice()
    .sort((a, b) => b.views - a.views)
    .forEach((person, rank) => (person.fame = useAnchors ? fameFromAnchors(person.views, anchors) : fameFromRank(rank, selected.length)));
  selected
    .slice()
    .sort((a, b) => b.sitelinks - a.sitelinks)
    .forEach((person, rank) => (person.level = levelFromSitelinksRank(rank, selected.length)));

  const usedIds = new Set(curatedIds);
  const athletes = selected.map((person) => {
    let id = slugify(person.name) || person.qid.toLowerCase();
    if (usedIds.has(id)) id = `${id}-${person.qid.toLowerCase()}`;
    usedIds.add(id);
    const { first, last } = splitName(person.name, person.country);
    const text = [person.description, person.positions, person.disciplines].filter(Boolean).join(' | ');
    const { archetype, role } = archetypeFor(person.config.sport, text, person.config.forced);
    return {
      id,
      first,
      last,
      sport: person.config.sport,
      archetype,
      role,
      country: person.country,
      fame: person.fame,
      level: person.level,
      fact: factFrom(person.description, role),
      ...(person.died ? { retired: true, born: person.born, died: person.died } : {}),
      wikidata: person.qid,
      wiki: person.title,
    };
  });
  athletes.sort((a, b) => (a.sport < b.sport ? -1 : a.sport > b.sport ? 1 : b.fame - a.fame || (a.id < b.id ? -1 : 1)));
  writeFileSync(OUTPUT, `${JSON.stringify(athletes, null, 1)}\n`);

  const tier = (fame) => (fame >= 90 ? 'légendaire' : fame >= 75 ? 'épique' : fame >= 60 ? 'rare' : fame >= 44 ? 'peu commune' : 'commune');
  const count = (key) => athletes.reduce((acc, a) => ((acc[key(a)] = (acc[key(a)] ?? 0) + 1), acc), {});
  console.log(`\n${athletes.length} athlètes écrits dans ${args.sortie ?? 'src/data/athletes.generated.json'}`);
  console.log('Raretés :', count((a) => tier(a.fame)));
  console.log('Sports :', count((a) => a.sport));
  console.log('Pays :', JSON.stringify(Object.entries(count((a) => a.country)).sort((a, b) => b[1] - a[1])));
  console.log('Les plus célèbres :', athletes.slice().sort((a, b) => b.fame - a.fame).slice(0, 40).map((a) => `${a.first} ${a.last} (${a.fame})`).join(', '));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
