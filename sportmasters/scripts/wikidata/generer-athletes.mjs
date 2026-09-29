#!/usr/bin/env node
// Génère des milliers d'athlètes depuis Wikidata, avec une célébrité calculée
// d'après les vues de leur page Wikipédia en français sur les 12 derniers mois.
//
//   node scripts/wikidata/generer-athletes.mjs --contact "ton.adresse@exemple.fr" [--par-sport 700] [--sortie src/data/athletes.generated.json]
//
// --contact est obligatoire : Wikimedia demande un moyen de contact dans l'en-tête User-Agent.
// Les athlètes déjà présents dans src/data/athletes.ts (base manuelle) sont ignorés :
// la base manuelle garde toujours la main (ultis signatures, versions Prime, faits vérifiés).
// Ce script n'a pas pu être exécuté dans l'environnement où il a été écrit (réseau fermé) :
// lance-le une première fois avec --par-sport 50 pour vérifier le résultat.

import { readFileSync, writeFileSync } from 'node:fs';
import { archetypeFor, factFrom, fameFromRank, levelFromSitelinksRank, normalizeName, slugify } from './helpers.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs), []),
);
if (!args.contact) {
  console.error('Précise un contact : --contact "ton.adresse@exemple.fr"');
  process.exit(1);
}
const PER_SPORT = Number(args['par-sport'] ?? 700);
const OUTPUT = args.sortie ?? 'src/data/athletes.generated.json';
const USER_AGENT = `AthleticardsGenerator/1.0 (${args.contact})`;

// Métiers Wikidata (P106) par sport. Vérifie un identifiant sur https://www.wikidata.org/wiki/Q… en cas de doute.
const SPORTS = [
  { sport: 'foot', occupations: ['Q937857'] }, // joueur de football
  { sport: 'basket', occupations: ['Q3665646'] }, // joueur de basket-ball
  { sport: 'tennis', occupations: ['Q10833314'] }, // joueur de tennis
  { sport: 'athle', occupations: ['Q11513337'] }, // athlète (athlétisme)
  { sport: 'natation', occupations: ['Q10843402'] }, // nageur
  { sport: 'cyclisme', occupations: ['Q2309784'] }, // coureur cycliste
  { sport: 'auto', occupations: ['Q10841764'], forced: { archetype: 'pilote-f1', role: 'Formule 1' } }, // pilote de F1
  { sport: 'auto', occupations: ['Q3014296'], forced: { archetype: 'pilote-moto', role: 'Moto' } }, // pilote de moto
  { sport: 'combat', occupations: ['Q11338576'], forced: { archetype: 'boxeur', role: 'Boxe' } }, // boxeur
  { sport: 'combat', occupations: ['Q11607585'], forced: { archetype: 'mma', role: 'MMA' } }, // combattant de MMA
  { sport: 'combat', occupations: ['Q6665249'], forced: { archetype: 'judoka', role: 'Judo' } }, // judoka
  { sport: 'rugby', occupations: ['Q14089670'] }, // joueur de rugby à XV
  { sport: 'hand', occupations: ['Q12840545'] }, // handballeur
  { sport: 'volley', occupations: ['Q15117302'] }, // joueur de volley-ball
  { sport: 'hiver', occupations: ['Q4270517'], forced: { archetype: 'skieur', role: 'Ski alpin' } }, // skieur alpin
  { sport: 'hiver', occupations: ['Q16029547'], forced: { archetype: 'biathlete', role: 'Biathlon' } }, // biathlète
  { sport: 'hiver', occupations: ['Q13219587'], forced: { archetype: 'patineur', role: 'Patinage artistique' } }, // patineur artistique
  { sport: 'gym', occupations: ['Q13381572'] }, // gymnaste artistique
  { sport: 'golf', occupations: ['Q11303721'] }, // golfeur
  { sport: 'glisse', occupations: ['Q13561328'], forced: { archetype: 'surfeur', role: 'Surf' } }, // surfeur
  { sport: 'us', occupations: ['Q19204627'] }, // joueur de football américain
  { sport: 'us', occupations: ['Q10871364'], forced: { archetype: 'baseball', role: 'Baseball (MLB)' } }, // joueur de baseball
  { sport: 'us', occupations: ['Q11774891'], forced: { archetype: 'hockey', role: 'Hockey (NHL)' } }, // joueur de hockey sur glace
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, attempt = 1) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (response.status === 404) return null;
  if ((response.status === 429 || response.status >= 500) && attempt < 5) {
    await sleep(2_000 * attempt);
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok) throw new Error(`${response.status} sur ${url}`);
  return response.json();
}

function sparql(occupations, limit) {
  return `
SELECT ?athlete ?label ?description ?countryCode ?sitelinks ?title ?birth ?death WHERE {
  VALUES ?occupation { ${occupations.map((q) => `wd:${q}`).join(' ')} }
  ?athlete wdt:P106 ?occupation ;
           wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= 6)
  ?article schema:about ?athlete ;
           schema:isPartOf <https://fr.wikipedia.org/> ;
           schema:name ?title .
  OPTIONAL { ?athlete wdt:P27 ?country . ?country wdt:P297 ?countryCode . }
  OPTIONAL { ?athlete wdt:P569 ?birth . }
  OPTIONAL { ?athlete wdt:P570 ?death . }
  OPTIONAL { ?athlete rdfs:label ?label . FILTER(LANG(?label) = "fr") }
  OPTIONAL { ?athlete schema:description ?description . FILTER(LANG(?description) = "fr") }
}
ORDER BY DESC(?sitelinks)
LIMIT ${limit}`;
}

async function queryWikidata(config) {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql(config.occupations, PER_SPORT * 2))}`;
  const data = await fetchJson(url);
  return (data?.results?.bindings ?? []).map((row) => ({
    qid: row.athlete.value.split('/').pop(),
    label: row.label?.value ?? row.title.value,
    description: row.description?.value ?? '',
    country: row.countryCode?.value ?? 'XX',
    sitelinks: Number(row.sitelinks.value),
    title: row.title.value,
    born: row.birth ? Number(row.birth.value.slice(0, 4)) : undefined,
    died: row.death ? Number(row.death.value.slice(0, 4)) : undefined,
    sport: config.sport,
    forced: config.forced,
  }));
}

async function pageviews(title) {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), 1));
  const fmt = (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}01`;
  const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia/all-access/user/${encodeURIComponent(title.replace(/ /g, '_'))}/monthly/${fmt(start)}/${fmt(end)}`;
  const data = await fetchJson(url);
  return (data?.items ?? []).reduce((sum, item) => sum + item.views, 0);
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if (i % 250 === 0) console.log(`  vues : ${i}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return out;
}

function curatedNames() {
  // lecture simple du fichier TypeScript : a('id', 'Prénom', 'Nom', ...
  const source = readFileSync(new URL('../../src/data/athletes.ts', import.meta.url), 'utf8');
  const names = new Set();
  for (const match of source.matchAll(/^\s*a\('([^']+)', '([^']*)', '([^']*)'/gm)) {
    names.add(normalizeName(`${match[2]} ${match[3]}`.trim()));
    names.add(normalizeName(match[3]));
  }
  return names;
}

async function main() {
  console.log(`Requêtes Wikidata (${PER_SPORT} athlètes max par métier)…`);
  const byQid = new Map();
  for (const config of SPORTS) {
    const rows = await queryWikidata(config);
    let kept = 0;
    for (const row of rows) {
      if (byQid.has(row.qid) || kept >= PER_SPORT) continue;
      byQid.set(row.qid, row);
      kept += 1;
    }
    console.log(`  ${config.sport} (${config.occupations.join(', ')}) : ${kept}`);
    await sleep(1_000);
  }

  const people = [...byQid.values()];
  console.log(`Vues Wikipédia pour ${people.length} athlètes…`);
  const views = await mapLimit(people, 12, (person) => pageviews(person.title).catch(() => 0));
  people.forEach((person, i) => (person.views = views[i]));

  // les rangs se calculent sur l'ensemble, base manuelle comprise, pour garder des paliers cohérents
  const byViews = people.slice().sort((a, b) => b.views - a.views);
  const bySitelinks = people.slice().sort((a, b) => b.sitelinks - a.sitelinks);
  byViews.forEach((person, rank) => (person.fame = fameFromRank(rank, people.length)));
  bySitelinks.forEach((person, rank) => (person.level = levelFromSitelinksRank(rank, people.length)));

  const curated = curatedNames();
  const usedIds = new Set();
  const athletes = [];
  for (const person of byViews) {
    const name = person.label.replace(/\s*\(.*\)$/, '');
    if (curated.has(normalizeName(name))) continue;
    const parts = name.split(' ');
    const last = parts.length > 1 ? parts.slice(1).join(' ') : name;
    const first = parts.length > 1 ? parts[0] : '';
    let id = slugify(name) || person.qid.toLowerCase();
    if (usedIds.has(id)) id = `${id}-${person.qid.toLowerCase()}`;
    usedIds.add(id);
    const { archetype, role } = archetypeFor(person.sport, person.description, person.forced);
    athletes.push({
      id,
      first,
      last,
      sport: person.sport,
      archetype,
      role,
      country: person.country,
      fame: person.fame,
      level: person.level,
      fact: factFrom(person.description, role),
      ...(person.died ? { retired: true, born: person.born, died: person.died } : {}),
      wikidata: person.qid,
    });
  }

  writeFileSync(OUTPUT, `${JSON.stringify(athletes, null, 1)}\n`);
  const tiers = athletes.reduce((acc, a) => {
    const tier = a.fame >= 90 ? 'légendaire' : a.fame >= 75 ? 'épique' : a.fame >= 60 ? 'rare' : a.fame >= 44 ? 'peu commune' : 'commune';
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${athletes.length} athlètes écrits dans ${OUTPUT}`, tiers);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
