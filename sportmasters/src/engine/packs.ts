import type { Athlete, CardFace, RarityId, SportId, Variant } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { PRIME_CHANCE, RARITY_ORDER, dropWeight, primeRecordStart, rarityOf } from './cards';
import { weightedPick, type Rng } from './random';

export type Odds = Record<RarityId, number>;

export interface PackDef {
  id: string;
  name: string;
  tagline: string;
  price: number;
  size: number;
  odds: Odds;
  primeChance: number;
  /** rareté minimale garantie sur la dernière carte */
  guaranteed?: { min: RarityId; odds?: Partial<Odds>; prime?: boolean };
  filter?: (athlete: Athlete) => boolean;
  /** couleur dominante de l'emballage */
  tone: 'bronze' | 'silver' | 'gold' | 'violet' | 'black' | 'icon' | 'prime' | 'sport';
  sport?: SportId;
}

export const FREE_ODDS: Odds = { commune: 60, 'peu-commune': 26, rare: 10, epique: 3.2, legendaire: 0.8 };

export const FREE_PACK: PackDef = {
  id: 'gratuit',
  name: 'Booster gratuit',
  tagline: '5 cartes, un nouveau toutes les 10 minutes',
  price: 0,
  size: 5,
  odds: FREE_ODDS,
  primeChance: PRIME_CHANCE * 0.75,
  tone: 'bronze',
};

export const SHOP_PACKS: PackDef[] = [
  {
    id: 'decouverte',
    name: 'Pack Découverte',
    tagline: '5 cartes, mêmes chances que le booster gratuit',
    price: 600,
    size: 5,
    odds: FREE_ODDS,
    primeChance: PRIME_CHANCE * 0.75,
    tone: 'silver',
  },
  {
    id: 'pro',
    name: 'Pack Pro',
    tagline: '5 cartes dont 1 Rare ou mieux garantie',
    price: 2_500,
    size: 5,
    odds: { commune: 40, 'peu-commune': 32, rare: 19, epique: 7, legendaire: 2 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'rare', odds: { rare: 80, epique: 16, legendaire: 4 } },
    tone: 'gold',
  },
  {
    id: 'elite',
    name: 'Pack Élite',
    tagline: '5 cartes dont 1 Épique ou mieux garantie',
    price: 10_000,
    size: 5,
    odds: { commune: 10, 'peu-commune': 35, rare: 38, epique: 13, legendaire: 4 },
    primeChance: PRIME_CHANCE * 1.5,
    guaranteed: { min: 'epique', odds: { epique: 84, legendaire: 16 } },
    tone: 'violet',
  },
  {
    id: 'icones',
    name: 'Pack Icônes',
    tagline: '3 légendes retraitées ou disparues, 1 Rare ou mieux garantie',
    price: 15_000,
    size: 3,
    odds: { commune: 25, 'peu-commune': 35, rare: 27, epique: 10, legendaire: 3 },
    primeChance: PRIME_CHANCE * 1.5,
    guaranteed: { min: 'rare', odds: { rare: 60, epique: 30, legendaire: 10 } },
    filter: (athlete) => !!athlete.retired,
    tone: 'icon',
  },
  {
    id: 'prime',
    name: 'Pack Prime',
    tagline: '3 cartes dont 1 version Prime garantie (Rare ou mieux)',
    price: 45_000,
    size: 3,
    odds: { commune: 10, 'peu-commune': 35, rare: 40, epique: 12, legendaire: 3 },
    primeChance: PRIME_CHANCE,
    guaranteed: { min: 'rare', odds: { rare: 62, epique: 28, legendaire: 10 }, prime: true },
    tone: 'prime',
  },
  {
    id: 'legende',
    name: 'Pack Légende',
    tagline: '3 cartes dont 1 Légendaire garantie',
    price: 90_000,
    size: 3,
    odds: { commune: 0, 'peu-commune': 30, rare: 50, epique: 17, legendaire: 3 },
    primeChance: PRIME_CHANCE * 1.5,
    guaranteed: { min: 'legendaire', odds: { legendaire: 100 } },
    tone: 'black',
  },
];

export function sportPack(sport: SportId, sportName: string): PackDef {
  return {
    id: `sport-${sport}`,
    name: `Pack ${sportName}`,
    tagline: `5 cartes, uniquement ${sportName.toLowerCase()}`,
    price: 1_500,
    size: 5,
    odds: { commune: 50, 'peu-commune': 30, rare: 14, epique: 4.8, legendaire: 1.2 },
    primeChance: PRIME_CHANCE,
    filter: (athlete) => athlete.sport === sport,
    tone: 'sport',
    sport,
  };
}

const poolCache = new Map<string, Record<RarityId, Athlete[]>>();

function poolFor(pack: PackDef): Record<RarityId, Athlete[]> {
  const cached = poolCache.get(pack.id);
  if (cached) return cached;
  const pool = { commune: [], 'peu-commune': [], rare: [], epique: [], legendaire: [] } as Record<RarityId, Athlete[]>;
  for (const athlete of ATHLETES) {
    if (!pack.filter || pack.filter(athlete)) pool[rarityOf(athlete).id].push(athlete);
  }
  poolCache.set(pack.id, pool);
  return pool;
}

function rollRarity(rng: Rng, odds: Partial<Odds>, pool: Record<RarityId, Athlete[]>): RarityId {
  const available = RARITY_ORDER.filter((id) => (odds[id] ?? 0) > 0 && pool[id].length > 0);
  if (available.length === 0) {
    // repli : la rareté disponible la plus proche
    return RARITY_ORDER.find((id) => pool[id].length > 0) ?? 'commune';
  }
  return weightedPick(rng, available, (id) => odds[id] ?? 0);
}

function drawCard(rng: Rng, pack: PackDef, odds: Partial<Odds>, forcePrime: boolean, pool: Record<RarityId, Athlete[]>): CardFace {
  const rarity = rollRarity(rng, odds, pool);
  const athlete = weightedPick(rng, pool[rarity], dropWeight);
  const variant: Variant = forcePrime || rng() < pack.primeChance ? 'prime' : 'base';
  const record = primeRecordStart(athlete);
  return { athleteId: athlete.id, variant, ...(record ? { record: variant === 'prime' ? record + 4 : record } : {}) };
}

/** Ouvre un booster. Les cartes sont renvoyées de la moins rare à la plus rare (suspense garanti). */
export function openPack(pack: PackDef, rng: Rng): CardFace[] {
  const pool = poolFor(pack);
  const cards: CardFace[] = [];
  for (let i = 0; i < pack.size; i++) {
    const isLast = i === pack.size - 1;
    if (isLast && pack.guaranteed) {
      cards.push(drawCard(rng, pack, pack.guaranteed.odds ?? { [pack.guaranteed.min]: 1 }, !!pack.guaranteed.prime, pool));
    } else {
      cards.push(drawCard(rng, pack, pack.odds, false, pool));
    }
  }
  return sortByRarity(cards);
}

export function cardRank(card: CardFace): number {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  return rarityOf(athlete).order * 10 + (card.variant === 'prime' ? 5 : 0) + athlete.fame / 100;
}

export function sortByRarity(cards: CardFace[]): CardFace[] {
  return cards.slice().sort((a, b) => cardRank(a) - cardRank(b));
}

export function allPacks(): PackDef[] {
  return [FREE_PACK, ...SHOP_PACKS];
}
