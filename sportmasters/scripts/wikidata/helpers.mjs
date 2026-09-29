// Fonctions pures utilisées par le générateur d'athlètes et le script des photos
// (testées dans src/engine/__tests__/generator.test.ts).

/** Identifiant lisible : « Armand Duplantis » → « armand-duplantis ». */
export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Nom normalisé, pour repérer les athlètes déjà présents dans la base manuelle. */
export function normalizeName(text) {
  return slugify(text).replace(/-/g, ' ');
}

// ───────────── Célébrité ─────────────

/**
 * Paliers de célébrité par percentile de vues Wikipédia (du plus vu au moins vu), utilisés
 * quand la base manuelle ne suffit pas à caler l'échelle.
 * Sur 10 000 athlètes : ~30 légendaires, ~120 épiques, ~600 rares, ~1 750 peu communes.
 */
export const FAME_BANDS = [
  { share: 0.003, min: 90, max: 99 },
  { share: 0.012, min: 75, max: 89 },
  { share: 0.06, min: 60, max: 74 },
  { share: 0.175, min: 44, max: 59 },
  { share: 1, min: 5, max: 43 },
];

/** Célébrité (0-100) à partir du rang (0 = le plus vu) sur un total d'athlètes. */
export function fameFromRank(rank, total) {
  const position = total <= 1 ? 0 : rank / (total - 1);
  let start = 0;
  for (const band of FAME_BANDS) {
    const end = Math.min(1, start + band.share);
    if (position <= end || band.share >= 1) {
      const within = end > start ? (position - start) / (end - start) : 0;
      return Math.round(band.max - Math.min(1, Math.max(0, within)) * (band.max - band.min));
    }
    start = end;
  }
  return 5;
}

/**
 * Célébrité d'un nouvel athlète calée sur la base manuelle : on le place parmi les athlètes
 * manuels selon ses vues Wikipédia, et il reçoit la célébrité qui occupe la même place.
 * À vues égales, même célébrité, donc même rareté. anchors : [{ views, fame }].
 */
export function fameFromAnchors(views, anchors) {
  const logs = anchors.map((anchor) => Math.log10(anchor.views + 1)).sort((a, b) => a - b);
  const fames = anchors.map((anchor) => anchor.fame).sort((a, b) => a - b);
  const n = logs.length;
  const v = Math.log10(Math.max(0, views) + 1);
  // moins vu que tous les athlètes manuels : la célébrité continue de baisser, jusqu'à 3
  if (v <= logs[0]) return Math.max(3, Math.round(fames[0] - (logs[0] - v) * 6));
  if (v >= logs[n - 1]) return fames[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (logs[mid] <= v) lo = mid;
    else hi = mid;
  }
  const position = lo + (logs[hi] === logs[lo] ? 0 : (v - logs[lo]) / (logs[hi] - logs[lo]));
  const below = Math.floor(position);
  const above = Math.min(n - 1, below + 1);
  return Math.round(fames[below] + (fames[above] - fames[below]) * (position - below));
}

/** Note sportive estimée : les athlètes présents dans beaucoup de Wikipédias ont souvent le plus beau palmarès. */
export function levelFromSitelinksRank(rank, total) {
  const position = total <= 1 ? 0 : rank / (total - 1);
  return Math.round(72 + 26 * Math.pow(1 - position, 1.6));
}

// ───────────── Sport et poste ─────────────

/** Mots qui doivent apparaître dans la description Wikipédia / Wikidata pour être sûr du sport. */
export const SPORT_KEYWORDS = {
  foot: /football|soccer/i,
  basket: /basket/i,
  tennis: /tennis/i,
  athle: /athl|sprint|perch|pole vault|saut|jump|lanc|throw|marath|coureu|runner|haies|hurdl|d[ée]cathl|heptathl|demi-fond|javelot|javelin|disque|discus|poids|shot put|marteau|marche|middle-distance|long-distance/i,
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

/** Descriptions de personnes connues d'abord pour autre chose (entraîneurs, dirigeants…). */
const NOT_A_PLAYER = /^(ancien |ex-)?(entra[iî]neu|s[ée]lectionneu|dirigeant|pr[ée]sident|arbitre|homme politique|femme politique|politicien|journaliste|consultant|commentateur|acteur|actrice|chanteu|agent|homme d.affaires|femme d.affaires|m[ée]decin|avocat|militaire|aviat|soldat|[ée]crivain|juge)/i;

/** La description (Wikidata, en français) correspond-elle bien à un joueur de ce sport ? */
export function describesAthlete(sport, description = '') {
  const text = description.trim();
  if (!text || NOT_A_PLAYER.test(text)) return false;
  if (sport === 'foot' && /football (am[ée]ricain|canadien|australien|ga[ée]lique)/i.test(text)) return false;
  return SPORT_KEYWORDS[sport]?.test(text) ?? false;
}

// Profil de stats et libellé de poste, d'après la description, les postes (P413) et les disciplines (P2416).
// L'ordre compte : la première règle qui correspond l'emporte.
const RULES = {
  foot: [
    [/gardien/, 'gardien', 'Gardien'],
    [/d[ée]fenseu|arri[èe]re|lat[ée]ral|libero/, 'defenseur', 'Défenseur'],
    [/ailier/, 'ailier', 'Ailier'],
    [/milieu/, 'milieu', 'Milieu'],
    [/attaquant|avant-centre|buteu/, 'buteur', 'Attaquant'],
  ],
  basket: [
    [/meneu/, 'meneur', 'Meneur'],
    [/pivot|ailier fort/, 'pivot', 'Pivot'],
    [/ailier|arri[èe]re/, 'ailier-bk', 'Ailier'],
  ],
  athle: [
    [/perche/, 'perchiste', 'Saut à la perche'],
    [/haies/, 'haies', 'Haies'],
    [/d[ée]cathl|heptathl|pentathl|[ée]preuves combin/, 'epreuves-combinees', 'Épreuves combinées'],
    [/javelot|lancer|poids|disque|marteau/, 'lanceur', 'Lancers'],
    [/hauteur|longueur|triple saut|sauteu/, 'sauteur', 'Sauts'],
    [/demi-fond|800|1 ?500|steeple|mile|3 ?000/, 'demi-fond', 'Demi-fond'],
    [/marathon|fond|10 ?000|5 ?000|cross|marche|route/, 'fond', 'Fond'],
  ],
  natation: [
    [/1 ?500|800|eau libre|10 km|fond/, 'nage-fond', 'Nage longue'],
    [/50 m|100 m|sprint/, 'nage-sprint', 'Sprint'],
  ],
  cyclisme: [
    [/sprint/, 'sprinteur-velo', 'Sprinteur'],
    [/grimpeu|montagne/, 'grimpeur', 'Grimpeur'],
    [/vtt|cyclo-cross|piste|bmx/, 'puncheur', 'Puncheur'],
  ],
  rugby: [
    [/pilier|talonneu|deuxi[èe]me ligne|troisi[èe]me ligne|2e ligne|3e ligne|flanker|num[ée]ro 8/, 'avant', 'Avant'],
    [/demi de m[êe]l[ée]e|ouvreu|demi d.ouverture/, 'demi', 'Demi'],
  ],
  hand: [
    [/gardien/, 'hand-gardien', 'Gardien'],
    [/ailier/, 'hand-ailier', 'Ailier'],
    [/pivot/, 'hand-pivot', 'Pivot'],
  ],
  volley: [[/passeu/, 'volley-passeur', 'Passeur']],
  us: [[/quarterback/, 'quarterback', 'Quarterback (NFL)']],
};

const DEFAULTS = {
  foot: ['milieu', 'Footballeur'],
  basket: ['ailier-bk', 'Basketteur'],
  tennis: ['tennis-complet', 'Tennis'],
  athle: ['sprinter', 'Sprint'],
  natation: ['nage-complet', 'Natation'],
  cyclisme: ['rouleur', 'Rouleur'],
  auto: ['pilote-f1', 'Pilote'],
  combat: ['boxeur', 'Combat'],
  rugby: ['trois-quart', 'Trois-quarts'],
  hand: ['hand-arriere', 'Arrière'],
  volley: ['volley-attaquant', 'Attaquant'],
  hiver: ['skieur', 'Sports d’hiver'],
  gym: ['gymnaste', 'Gymnastique artistique'],
  golf: ['golfeur', 'Golf'],
  glisse: ['surfeur', 'Glisse'],
  us: ['receveur', 'Football américain'],
};

/** Profil de stats et libellé de poste à partir du sport et d'un texte (description, postes, disciplines). */
export function archetypeFor(sport, description = '', forced) {
  if (forced) return forced;
  const text = description.toLowerCase();
  for (const [pattern, archetype, role] of RULES[sport] ?? []) {
    if (pattern.test(text)) return { archetype, role };
  }
  const [archetype, role] = DEFAULTS[sport] ?? ['milieu', 'Sportif'];
  return { archetype, role };
}

/** Met une majuscule à la description Wikidata pour en faire la phrase de la carte. */
export function factFrom(description, fallback) {
  const text = (description || fallback || '').trim();
  if (!text) return fallback;
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}${/[.!?]$/.test(text) ? '' : '.'}`;
}

// ───────────── Nom et pays ─────────────

// Pays où le nom de famille s'écrit en premier dans Wikipédia (« Son Heung-min », « Yao Ming »).
const FAMILY_NAME_FIRST = new Set(['CN', 'KR', 'KP', 'TW', 'VN', 'HK', 'MO']);

/**
 * Prénom et nom à partir du libellé Wikipédia. Comme dans la base manuelle, le nom de famille
 * va dans « last » (c'est lui qui s'affiche sur les petites cartes).
 */
export function splitName(label, country) {
  const name = label.replace(/\s*\(.*\)\s*$/, '').trim();
  const parts = name.split(/\s+/);
  if (parts.length === 1) return { first: '', last: name };
  if (FAMILY_NAME_FIRST.has(country)) return { first: parts.slice(1).join(' '), last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

// Gentilés (début de mot) pour choisir la nationalité sportive quand il y en a plusieurs.
const DEMONYMS = {
  FR: 'fran[çc]ais', DZ: 'alg[ée]rien', MA: 'marocain', TN: 'tunisien', SN: 's[ée]n[ée]galais', CI: 'ivoirien',
  CM: 'camerounais', ML: 'malien', GN: 'guin[ée]en', CD: 'congolais', GA: 'gabonais', NG: 'nig[ée]rian', GH: 'ghan[ée]en',
  ES: 'espagnol', PT: 'portugais', IT: 'italien', DE: 'allemand', BE: 'belge', NL: 'n[ée]erlandais|hollandais', CH: 'suisse',
  AT: 'autrichien', GB: 'britannique', 'GB-ENG': 'anglais', 'GB-SCT': '[ée]cossais', 'GB-WLS': 'gallois',
  'GB-NIR': 'nord-irlandais', IE: 'irlandais', US: 'am[ée]ricain|[ée]tats-unien', CA: 'canadien', MX: 'mexicain',
  BR: 'br[ée]silien', AR: 'argentin', UY: 'uruguayen', CO: 'colombien', CL: 'chilien', PE: 'p[ée]ruvien',
  EC: '[ée]quatorien', PY: 'paraguayen', VE: 'v[ée]n[ée]zu[ée]lien', JM: 'jama[ïi]cain', HR: 'croate', RS: 'serbe',
  SI: 'slov[èe]ne', BA: 'bosni', ME: 'mont[ée]n[ée]grin', MK: 'mac[ée]donien', AL: 'albanais', XK: 'kosovar',
  GR: 'grec', TR: 'turc|turque', PL: 'polonais', CZ: 'tch[èe]que', SK: 'slovaque', HU: 'hongrois', RO: 'roumain',
  BG: 'bulgare', UA: 'ukrainien', RU: 'russe', BY: 'bi[ée]lorusse', LT: 'lituanien', LV: 'letton', EE: 'estonien',
  SE: 'su[ée]dois', NO: 'norv[ée]gien', DK: 'danois', FI: 'finlandais', IS: 'islandais', EG: '[ée]gyptien',
  JP: 'japonais', KR: 'cor[ée]en', CN: 'chinois', AU: 'australien', NZ: 'n[ée]o-z[ée]landais', ZA: 'sud-africain',
  KE: 'k[ée]nyan', ET: '[ée]thiopien', IL: 'isra[ée]lien', IR: 'iranien', GE: 'g[ée]orgien', AM: 'arm[ée]nien',
};

/**
 * Pays affiché sur la carte : la nationalité sportive (P1532) d'abord, sinon la citoyenneté (P27).
 * S'il y en a plusieurs, celle que cite la description ; l'Angleterre, l'Écosse et le pays de Galles
 * remplacent le Royaume-Uni quand la description les nomme.
 */
export function pickCountry(sportCodes = [], citizenCodes = [], description = '') {
  const text = description.toLowerCase();
  // début de mot, accents compris (\b ne connaît que les lettres sans accent)
  const cites = (code) => DEMONYMS[code] && new RegExp(`(?<!\\p{L})(${DEMONYMS[code]})`, 'iu').test(text);
  const pool = sportCodes.length ? sportCodes : citizenCodes;
  if (!pool.length) return null;
  let code = pool.find(cites) ?? pool[0];
  if (code === 'GB') code = ['GB-ENG', 'GB-SCT', 'GB-WLS', 'GB-NIR'].find(cites) ?? 'GB';
  return code;
}
