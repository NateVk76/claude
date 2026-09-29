// Fonctions pures utilisées par le générateur d'athlètes (testées dans src/engine/__tests__/generator.test.ts).

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

/**
 * Paliers de célébrité par percentile de vues Wikipédia (du plus vu au moins vu).
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

/** Note sportive estimée : les athlètes présents dans beaucoup de Wikipédias ont souvent le plus beau palmarès. */
export function levelFromSitelinksRank(rank, total) {
  const position = total <= 1 ? 0 : rank / (total - 1);
  return Math.round(72 + 26 * Math.pow(1 - position, 1.6));
}

const RULES = {
  foot: [
    [/gardien/, 'gardien', 'Gardien'],
    [/d[ée]fenseu|arri[èe]re|lat[ée]ral/, 'defenseur', 'Défenseur'],
    [/ailier/, 'ailier', 'Ailier'],
    [/milieu/, 'milieu', 'Milieu'],
    [/attaquant|avant-centre|buteu/, 'buteur', 'Attaquant'],
  ],
  basket: [
    [/meneu/, 'meneur', 'Meneur'],
    [/pivot/, 'pivot', 'Pivot'],
  ],
  athle: [
    [/perche/, 'perchiste', 'Saut à la perche'],
    [/haies/, 'haies', 'Haies'],
    [/d[ée]cathl|heptathl/, 'epreuves-combinees', 'Épreuves combinées'],
    [/javelot|lancer|poids|disque|marteau/, 'lanceur', 'Lancers'],
    [/hauteur|longueur|triple saut|sauteu/, 'sauteur', 'Sauts'],
    [/marathon|fond|10 ?000|5 ?000|cross/, 'fond', 'Fond'],
    [/demi-fond|800|1 ?500|steeple/, 'demi-fond', 'Demi-fond'],
  ],
  cyclisme: [
    [/sprint/, 'sprinteur-velo', 'Sprinteur'],
    [/grimpeu|montagne/, 'grimpeur', 'Grimpeur'],
    [/vtt|cyclo-cross|piste/, 'puncheur', 'Puncheur'],
  ],
  rugby: [
    [/pilier|talonneu|deuxi[èe]me ligne|troisi[èe]me ligne/, 'avant', 'Avant'],
    [/demi de m[êe]l[ée]e|ouvreu|demi d.ouverture/, 'demi', 'Demi'],
  ],
  hand: [[/gardien/, 'hand-gardien', 'Gardien']],
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

/** Profil de stats et libellé de poste à partir du sport et de la description Wikidata. */
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
