import type { ArchetypeId, Athlete, Rarity, RarityId, StatKey, Stats, Ulti, UltiEffect, Variant } from './types';
import { SPORTS } from '../data/sports';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { clamp, hashString, hashUnit } from './random';

// ───────────── Raretés ─────────────
// La rareté vient uniquement de la célébrité (fame). Plus l'athlète est connu, plus sa carte est rare.
export const RARITIES: Record<RarityId, Rarity> = {
  commune: { id: 'commune', name: 'Commune', minFame: 0, baseValue: 150, ultiPower: 8, order: 0 },
  'peu-commune': { id: 'peu-commune', name: 'Peu commune', minFame: 44, baseValue: 450, ultiPower: 10, order: 1 },
  rare: { id: 'rare', name: 'Rare', minFame: 60, baseValue: 1_500, ultiPower: 12, order: 2 },
  epique: { id: 'epique', name: 'Épique', minFame: 75, baseValue: 6_000, ultiPower: 14, order: 3 },
  legendaire: { id: 'legendaire', name: 'Légendaire', minFame: 90, baseValue: 25_000, ultiPower: 18, order: 4 },
};

export const RARITY_ORDER: RarityId[] = ['commune', 'peu-commune', 'rare', 'epique', 'legendaire'];

export function rarityOf(athlete: Athlete): Rarity {
  for (let i = RARITY_ORDER.length - 1; i >= 0; i--) {
    const rarity = RARITIES[RARITY_ORDER[i]];
    if (athlete.fame >= rarity.minFame) return rarity;
  }
  return RARITIES.commune;
}

/** Plage de célébrité couverte par une rareté (pour graduer la rareté à l'intérieur d'un palier). */
function fameSpan(rarity: Rarity): [number, number] {
  const next = RARITY_ORDER[rarity.order + 1];
  return [rarity.minFame, next ? RARITIES[next].minFame : 101];
}

/**
 * Poids de tirage d'une carte à l'intérieur de sa rareté : plus l'athlète est célèbre,
 * plus il sort rarement. Messi sort ~5 fois moins souvent que Duplantis.
 */
export function dropWeight(athlete: Athlete): number {
  const rarity = rarityOf(athlete);
  return Math.exp(-(athlete.fame - rarity.minFame) / 6);
}

// ───────────── Prime ─────────────
/** Chance qu'une carte tirée dans un booster standard soit en version Prime. */
export const PRIME_CHANCE = 0.02;
export const PRIME_LEVEL_BOOST = 3;
export const PRIME_STAT_BOOST = 4;
export const PRIME_ULTI_BOOST = 4;
export const PRIME_VALUE_MULTIPLIER = 6;

// ───────────── Stats ─────────────
// Décalages par profil : vitesse, force, endurance, technique, intelligence, sang-froid.
// Le sang-froid ne s'affiche pas seul : il nourrit l'Aura avec la note et la célébrité.
type Offsets = [number, number, number, number, number, number]; // for, vit, end, tec, int, men

const ARCHETYPES: Record<ArchetypeId, Offsets> = {
  gardien: [0, -12, -8, 2, 3, 4],
  defenseur: [6, -4, 2, -6, 2, 2],
  milieu: [-4, -3, 4, 4, 6, 0],
  ailier: [-8, 8, 0, 4, -2, -2],
  buteur: [2, 4, -6, 3, 0, 3],
  meneur: [-8, 5, 0, 5, 6, 1],
  'ailier-bk': [2, 2, 1, 2, 1, 1],
  pivot: [8, -8, -2, -2, 1, 1],
  'tennis-attaque': [5, -2, -3, 2, -1, 1],
  'tennis-complet': [0, 1, 1, 4, 3, 3],
  'tennis-defense': [-4, 4, 6, 1, 2, 4],
  sprinter: [3, 10, -16, -2, -8, 2],
  haies: [-1, 7, -10, 6, -6, 1],
  'demi-fond': [-8, 3, 8, -2, 2, 2],
  fond: [-12, -4, 12, -4, 1, 5],
  sauteur: [3, 5, -12, 5, -5, 0],
  perchiste: [2, 4, -14, 8, -2, 4],
  lanceur: [12, -6, -14, 4, -6, 2],
  'epreuves-combinees': [2, 2, 2, 2, -2, 1],
  'nage-sprint': [6, 6, -8, 2, -6, 0],
  'nage-fond': [-4, -4, 12, 2, -2, 3],
  'nage-complet': [0, 2, 5, 6, -1, 2],
  grimpeur: [-10, -2, 12, -2, 2, 4],
  'sprinteur-velo': [8, 10, -4, 0, -4, 1],
  rouleur: [4, 1, 8, -2, -2, 2],
  puncheur: [3, 5, 4, 1, 1, 1],
  'pilote-f1': [-12, 8, -4, 6, 4, 6],
  'pilote-moto': [-8, 8, -4, 5, 0, 6],
  'pilote-rallye': [-8, 5, 0, 6, 3, 4],
  boxeur: [8, 3, 0, 2, -6, 3],
  mma: [7, 0, 2, 2, -2, 4],
  judoka: [8, -4, 1, 5, -2, 3],
  avant: [12, -10, 1, -6, -2, 3],
  demi: [-8, 3, 1, 6, 8, 3],
  'trois-quart': [0, 8, 0, 2, -2, 0],
  'hand-arriere': [5, 1, 0, 4, 1, 1],
  'hand-gardien': [-2, -6, -6, 2, 4, 7],
  'hand-ailier': [-6, 8, 1, 5, -2, 0],
  'hand-pivot': [10, -4, 0, -2, 0, 2],
  'volley-attaquant': [7, 1, -2, 3, -2, 1],
  'volley-passeur': [-6, 0, 0, 6, 7, 2],
  skieur: [3, 8, -2, 4, -4, 4],
  biathlete: [-6, 0, 10, 2, 0, 6],
  patineur: [-6, 2, -2, 9, -2, 4],
  gymnaste: [3, -2, -4, 10, -2, 5],
  golfeur: [-8, -14, -6, 8, 6, 8],
  surfeur: [-2, 2, 1, 6, -3, 2],
  skateur: [-8, 0, -4, 10, -2, 4],
  'grimpeur-esc': [6, -6, 4, 6, 2, 4],
  quarterback: [-2, -4, -4, 6, 8, 6],
  receveur: [6, 4, 0, 4, 2, 2],
  baseball: [6, 0, -4, 6, 1, 3],
  hockey: [4, 6, 1, 4, 3, 1],
};

/** Code court affiché sous la note, comme le poste sur une carte FUT. */
export const POSITION_CODES: Record<ArchetypeId, string> = {
  gardien: 'GB', defenseur: 'DC', milieu: 'MC', ailier: 'AIL', buteur: 'BU',
  meneur: 'MEN', 'ailier-bk': 'AIL', pivot: 'PIV',
  'tennis-attaque': 'ATT', 'tennis-complet': 'CPL', 'tennis-defense': 'DÉF',
  sprinter: 'SPR', haies: 'HAIES', 'demi-fond': 'DF', fond: 'FOND', sauteur: 'SAUT', perchiste: 'PERCHE',
  lanceur: 'LANC', 'epreuves-combinees': 'DÉCA',
  'nage-sprint': 'SPR', 'nage-fond': 'FOND', 'nage-complet': '4N',
  grimpeur: 'GRIM', 'sprinteur-velo': 'SPR', rouleur: 'ROUL', puncheur: 'PUNCH',
  'pilote-f1': 'F1', 'pilote-moto': 'MGP', 'pilote-rallye': 'WRC',
  boxeur: 'BOXE', mma: 'MMA', judoka: 'JUDO',
  avant: 'AV', demi: 'DEMI', 'trois-quart': '3/4',
  'hand-arriere': 'ARR', 'hand-gardien': 'GB', 'hand-ailier': 'AIL', 'hand-pivot': 'PIV',
  'volley-attaquant': 'ATT', 'volley-passeur': 'PASS',
  skieur: 'SKI', biathlete: 'BIATH', patineur: 'PATIN', gymnaste: 'GYM', golfeur: 'GOLF',
  surfeur: 'SURF', skateur: 'RIDE', 'grimpeur-esc': 'GRIMP',
  quarterback: 'QB', receveur: 'TE', baseball: 'MLB', hockey: 'NHL',
};

/** Note globale affichée en haut de la carte. */
export function overallOf(athlete: Athlete, variant: Variant = 'base'): number {
  return variant === 'prime' ? Math.min(99, athlete.level + PRIME_LEVEL_BOOST) : athlete.level;
}

const statCache = new Map<string, Stats>();

export function statsOf(athlete: Athlete, variant: Variant = 'base'): Stats {
  const key = `${athlete.id}:${variant}`;
  const cached = statCache.get(key);
  if (cached) return cached;

  const [oFor, oVit, oEnd, oTec, oInt, oMen] = ARCHETYPES[athlete.archetype];
  const noise = (stat: string) => Math.round((hashUnit(`${athlete.id}:${stat}`) - 0.5) * 8);
  const skill = (offset: number, stat: string) => clamp(athlete.level + offset + noise(stat), 25, 99);
  const stats: Stats = {
    vit: skill(oVit, 'vit'),
    for: skill(oFor, 'for'),
    end: skill(oEnd, 'end'),
    tec: skill(oTec, 'tec'),
    int: skill(oInt, 'int'),
    aur: clamp(Math.round(athlete.level * 0.55 + athlete.fame * 0.35 + oMen * 0.8 + 6) + noise('aur'), 25, 99),
  };

  if (athlete.stats) {
    for (const [stat, value] of Object.entries(athlete.stats) as Array<[StatKey, number]>) stats[stat] = value;
  }
  if (variant === 'prime') {
    for (const stat of Object.keys(stats) as StatKey[]) stats[stat] = Math.min(99, stats[stat] + PRIME_STAT_BOOST);
  }
  statCache.set(key, stats);
  return stats;
}

/** Popularité (0-99), dérivée de la célébrité. Sert à la rareté et à l'épreuve Bain de foule. */
export function popularityOf(athlete: Athlete): number {
  return clamp(Math.round(20 + athlete.fame * 0.79), 20, 99);
}

// ───────────── Ultis ─────────────

function withValue(effect: UltiEffect, value: number): UltiEffect {
  return { ...effect, value } as UltiEffect;
}

/** Ulti de la carte : signature pour les légendes, sinon un ulti de son sport dont la force dépend de la rareté. */
export function ultiOf(athlete: Athlete, variant: Variant = 'base'): Ulti {
  const primeBoost = variant === 'prime' ? PRIME_ULTI_BOOST : 0;
  if (athlete.ulti) {
    if (!primeBoost) return athlete.ulti;
    const effects = athlete.ulti.effects.map((effect, i) => (i === 0 ? withValue(effect, effect.value + primeBoost) : effect));
    return { ...athlete.ulti, effects };
  }
  const sport = SPORTS[athlete.sport];
  const template = sport.ultis[hashString(`${athlete.id}:ulti`) % sport.ultis.length];
  const power = rarityOf(athlete).ultiPower + primeBoost;
  return {
    id: `${athlete.sport}-${template.name}`,
    name: template.name,
    desc: template.desc.replace('{v}', String(power)),
    effects: [withValue(template.effect, power)],
  };
}

// ───────────── Valeur marchande ─────────────

/** Valeur de référence d'une carte en Balles (sans les fluctuations du marché). */
export function baseValueOf(athlete: Athlete, variant: Variant = 'base'): number {
  const rarity = rarityOf(athlete);
  const [lo, hi] = fameSpan(rarity);
  const withinTier = (athlete.fame - lo) / (hi - lo); // 0 → 1
  const fameFactor = 1 + withinTier * 1.5;
  const levelFactor = 0.7 + Math.max(0, athlete.level - 70) / 60;
  const value = rarity.baseValue * fameFactor * levelFactor * (variant === 'prime' ? PRIME_VALUE_MULTIPLIER : 1);
  return roundPrice(value);
}

/** Arrondit un prix à une valeur "lisible" comme sur un vrai marché. */
export function roundPrice(value: number): number {
  if (value < 1_000) return Math.max(50, Math.round(value / 10) * 10);
  if (value < 10_000) return Math.round(value / 50) * 50;
  if (value < 100_000) return Math.round(value / 250) * 250;
  return Math.round(value / 1_000) * 1_000;
}

/** Valeur de vente rapide (au club) : immédiate mais peu intéressante. */
export function quickSellValue(athlete: Athlete, variant: Variant = 'base'): number {
  return roundPrice(baseValueOf(athlete, variant) * 0.3);
}

export function getAthlete(id: string): Athlete {
  const athlete = ATHLETES_BY_ID[id];
  if (!athlete) throw new Error(`Athlète inconnu : ${id}`);
  return athlete;
}

export function isIcon(athlete: Athlete): boolean {
  return !!athlete.retired;
}

export function displayName(athlete: Athlete): string {
  return athlete.first ? `${athlete.first} ${athlete.last}` : athlete.last;
}

export function athletesByRarity(): Record<RarityId, Athlete[]> {
  const out = { commune: [], 'peu-commune': [], rare: [], epique: [], legendaire: [] } as Record<RarityId, Athlete[]>;
  for (const athlete of ATHLETES) out[rarityOf(athlete).id].push(athlete);
  return out;
}

export function primeRecordStart(athlete: Athlete): number | undefined {
  // Duplantis : record inscrit sur la carte, en centimètres. Il grimpe à chaque ulti utilisé.
  return athlete.ulti?.effects.some((effect) => effect.kind === 'record') ? 630 : undefined;
}
