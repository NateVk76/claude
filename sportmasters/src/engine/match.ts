import type { CardFace, EventId, StatKey, UltiEffect } from './types';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { EVENTS, EVENT_ORDER, SPORTS } from '../data/sports';
import { overallOf, popularityOf, primeRecordStart, rarityOf, statsOf, ultiOf } from './cards';
import { makeUid, pick, shuffle, type Rng } from './random';

// Matchs : 5 manches, chacune est une épreuve (Sprint, Bras de fer, Money time…).
// À chaque manche, chaque équipe envoie un athlète pas encore utilisé. Puissance =
// stats de l'épreuve + particularité du sport + ulti éventuel + un peu de hasard.

export const TEAM_SIZE = 5;
export const ROUNDS = 5;
export const MAX_ENERGY = 3;

export interface MatchCard extends CardFace {
  uid: string;
}

export interface SideState {
  name: string;
  cards: MatchCard[];
  used: number[];
  energy: number;
  score: number;
  wins: number;
  /** bonus permanent accumulé (ultis de type « toute l'équipe ») */
  buff: number;
  wonLast: boolean;
}

export interface PowerPart {
  label: string;
  value: number;
}

export interface Play {
  index: number;
  ulti: boolean;
  /** ulti annulé par un contre adverse */
  cancelled: boolean;
  power: number;
  parts: PowerPart[];
}

export interface RoundLog {
  round: number;
  event: EventId;
  me: Play;
  opp: Play;
  winner: 'me' | 'opp' | 'draw';
  points: number;
  /** cartes dont le record a progressé (Duplantis) */
  records: string[];
}

export interface MatchState {
  id: string;
  division: number;
  events: EventId[];
  round: number;
  me: SideState;
  opp: SideState;
  log: RoundLog[];
  finished: boolean;
}

const CLUB_NAMES = [
  'FC Tartiflette', 'Olympique de Pétanque', 'Racing Croissant', 'AS Baguette', 'Stade des Légendes', 'Dynamo Raclette',
  'Sporting Chocolatine', 'Inter Camembert', 'Real Cassoulet', 'Athletic Madeleine', 'US Quiche', 'Red Star Crêpe',
  'Juventus Choucroute', 'Galaxy Fondue', 'Bayern Bouillabaisse', 'Ajax Ratatouille',
];

export function divisionTarget(division: number): number {
  return 64 + (10 - division) * 3.2;
}

/** Équipe adverse d'un niveau proche de la division. */
export function createOpponent(division: number, rng: Rng): { name: string; cards: MatchCard[] } {
  const target = divisionTarget(division);
  let pool = ATHLETES.filter((a) => Math.abs(overallOf(a) - target) <= 3);
  if (pool.length < TEAM_SIZE) pool = ATHLETES.slice().sort((a, b) => Math.abs(overallOf(a) - target) - Math.abs(overallOf(b) - target)).slice(0, 20);
  const chosen = shuffle(rng, pool).slice(0, TEAM_SIZE);
  const cards = chosen.map((athlete) => {
    const variant = division <= 3 && rng() < 0.15 ? ('prime' as const) : ('base' as const);
    const record = primeRecordStart(athlete);
    return { uid: makeUid('o'), athleteId: athlete.id, variant, ...(record ? { record } : {}) };
  });
  return { name: pick(rng, CLUB_NAMES), cards };
}

function newSide(name: string, cards: MatchCard[]): SideState {
  return { name, cards, used: [], energy: 2, score: 0, wins: 0, buff: 0, wonLast: false };
}

export function createMatch(myCards: MatchCard[], division: number, rng: Rng, myName = 'Mon équipe'): MatchState {
  const opponent = createOpponent(division, rng);
  return {
    id: makeUid('match'),
    division,
    events: shuffle(rng, EVENT_ORDER).slice(0, ROUNDS),
    round: 0,
    me: newSide(myName, myCards),
    opp: newSide(opponent.name, opponent.cards),
    log: [],
    finished: false,
  };
}

function effectsOf(card: CardFace): UltiEffect[] {
  return ultiOf(ATHLETES_BY_ID[card.athleteId], card.variant).effects;
}

/** Valeur de base d'un athlète pour une épreuve. */
export function eventBase(card: CardFace, eventId: EventId, swap?: StatKey | 'best'): number {
  const event = EVENTS[eventId];
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const stats = statsOf(athlete, card.variant);
  if (swap === 'best') {
    return Math.max(...Object.values(stats));
  }
  if (swap) {
    return stats[swap] * 0.7 + (event.blend ? stats[event.secondary] : stats[event.secondary]) * 0.3;
  }
  if (event.blend) return event.blend.reduce((sum, key) => sum + stats[key], 0) / event.blend.length;
  if (event.popularity) return stats.aur * 0.5 + popularityOf(athlete) * 0.5;
  return stats[event.primary] * 0.7 + stats[event.secondary] * 0.3;
}

/** Bonus de la particularité du sport. */
function passiveBonus(side: SideState, other: SideState, card: CardFace, eventId: EventId, round: number): PowerPart | null {
  const sport = ATHLETES_BY_ID[card.athleteId].sport;
  const label = SPORTS[sport].passive.name;
  switch (sport) {
    case 'foot': {
      const mates = side.cards.filter((c) => c !== card && ATHLETES_BY_ID[c.athleteId].sport === 'foot').length;
      return mates ? { label, value: Math.min(8, mates * 2) } : null;
    }
    case 'basket':
      return side.wonLast ? { label, value: 6 } : null;
    case 'tennis':
      return eventId === 'face-a-face' || eventId === 'money-time' ? { label, value: 5 } : null;
    case 'athle':
      return round === 0 || eventId === 'sprint' ? { label, value: 6 } : null;
    case 'cyclisme':
      return { label, value: 2 * (round + 1) };
    case 'auto':
      return side.score < other.score ? { label, value: 7 } : null;
    case 'rugby':
      return eventId === 'bras-de-fer' || eventId === 'decathlon' ? { label, value: 6 } : null;
    case 'hand':
      return side.wonLast ? { label, value: 5 } : null;
    case 'hiver':
      return eventId === 'money-time' || eventId === 'marathon' ? { label, value: 5 } : null;
    case 'gym':
      return eventId === 'geste-technique' ? { label, value: 6 } : null;
    case 'glisse':
      return eventId === 'geste-technique' || eventId === 'bain-de-foule' ? { label, value: 6 } : null;
    case 'us':
      return eventId === 'bain-de-foule' || eventId === 'face-a-face' ? { label, value: 5 } : null;
    default:
      return null;
  }
}

function variance(card: CardFace): number {
  const sport = ATHLETES_BY_ID[card.athleteId].sport;
  if (sport === 'golf') return 1.5;
  if (sport === 'gym') return 2;
  return 6;
}

interface Computed {
  power: number;
  parts: PowerPart[];
  debuff: number;
  double: boolean;
  teamBoost: number;
  cancels: boolean;
  record: boolean;
}

/** Calcule la puissance d'une carte pour la manche (sans le hasard si rng est absent). */
export function computePower(
  side: SideState,
  other: SideState,
  index: number,
  eventId: EventId,
  round: number,
  useUlti: boolean,
  ultiCancelled: boolean,
  rng?: Rng,
): Computed {
  const card = side.cards[index];
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const ulti = ultiOf(athlete, card.variant);
  const effects = useUlti && !ultiCancelled ? effectsOf(card) : [];
  const parts: PowerPart[] = [];
  let debuff = 0;
  let double = false;
  let teamBoost = 0;
  let cancels = false;
  let record = false;

  const swapEffect = effects.find((e) => e.kind === 'stat-swap' || e.kind === 'best-stat');
  const swap = swapEffect?.kind === 'stat-swap' ? swapEffect.stat : swapEffect?.kind === 'best-stat' ? 'best' : undefined;
  const base = eventBase(card, eventId, swap);
  parts.push({ label: swap ? `${EVENTS[eventId].name} (stat de l’ulti)` : EVENTS[eventId].name, value: base });

  const passive = passiveBonus(side, other, card, eventId, round);
  if (passive) parts.push(passive);
  if (side.buff) parts.push({ label: 'Bonus d’équipe', value: side.buff });

  let ultiBonus = 0;
  for (const effect of effects) {
    switch (effect.kind) {
      case 'boost':
      case 'stat-swap':
      case 'best-stat':
        ultiBonus += effect.value;
        break;
      case 'debuff':
        debuff += effect.value;
        break;
      case 'double':
        double = true;
        ultiBonus += effect.value;
        break;
      case 'team-buff':
        ultiBonus += effect.value;
        teamBoost += effect.boost;
        break;
      case 'comeback':
        ultiBonus += effect.value + (side.score < other.score ? effect.bonus : 0);
        break;
      case 'last-round':
        ultiBonus += effect.value + (round === ROUNDS - 1 ? effect.bonus : 0);
        break;
      case 'event':
        ultiBonus += effect.value + (effect.events.includes(eventId) ? effect.bonus : 0);
        break;
      case 'cancel':
        ultiBonus += effect.value;
        cancels = true;
        break;
      case 'streak':
        ultiBonus += effect.value + effect.perWin * side.wins;
        break;
      case 'record': {
        const start = primeRecordStart(athlete) ?? 630;
        ultiBonus += effect.value + Math.floor(((card.record ?? start) - start) / 5);
        record = true;
        break;
      }
    }
  }
  if (effects.length) parts.push({ label: `Ulti : ${ulti.name}`, value: ultiBonus });

  let power = parts.reduce((sum, part) => sum + part.value, 0);
  if (rng) {
    const spread = variance(card);
    const luck = (rng() * 2 - 1) * spread;
    parts.push({ label: 'Forme du jour', value: luck });
    power += luck;
  }
  return { power, parts, debuff, double, teamBoost, cancels, record };
}

/** Estimation (sans hasard) pour aider le joueur à choisir. */
export function estimatePower(state: MatchState, index: number, useUlti: boolean): number {
  const eventId = state.events[state.round];
  return computePower(state.me, state.opp, index, eventId, state.round, useUlti, false).power;
}

/** Choix de l'IA : plus la division est haute, plus elle joue juste. */
export function aiChoose(state: MatchState, rng: Rng): { index: number; ulti: boolean } {
  const side = state.opp;
  const eventId = state.events[state.round];
  const available = side.cards.map((_, i) => i).filter((i) => !side.used.includes(i));
  const precision = 0.45 + (10 - state.division) * 0.055; // 0.45 en D10 → 0.95 en D1
  const lastRound = state.round === ROUNDS - 1;
  const canUlti = side.energy > 0;
  const wantsUlti = canUlti && (lastRound || state.round >= 2 || side.energy >= 2 || side.score < state.me.score);
  if (rng() > precision) {
    return { index: pick(rng, available), ulti: wantsUlti && rng() < 0.5 };
  }
  // évalue l'épreuve actuelle en gardant les meilleures cartes pour les épreuves où elles brillent
  let best = available[0];
  let bestScore = -Infinity;
  for (const i of available) {
    const now = computePower(side, state.me, i, eventId, state.round, wantsUlti, false).power;
    const future = state.events.slice(state.round + 1).reduce((sum, ev) => sum + eventBase(side.cards[i], ev), 0) / Math.max(1, ROUNDS - state.round - 1);
    const score = now - (lastRound ? 0 : future * 0.35);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return { index: best, ulti: wantsUlti };
}

/** Joue la manche en cours. Le choix de l'IA se fait sans connaître celui du joueur. */
export function playRound(state: MatchState, myIndex: number, myUlti: boolean, rng: Rng): { state: MatchState; log: RoundLog } {
  if (state.finished) throw new Error('Match terminé');
  if (state.me.used.includes(myIndex)) throw new Error('Athlète déjà utilisé');
  const eventId = state.events[state.round];
  const ai = aiChoose(state, rng);
  const meUlti = myUlti && state.me.energy > 0;
  const oppUlti = ai.ulti && state.opp.energy > 0;

  const meCancels = meUlti && effectsOf(state.me.cards[myIndex]).some((e) => e.kind === 'cancel');
  const oppCancels = oppUlti && effectsOf(state.opp.cards[ai.index]).some((e) => e.kind === 'cancel');
  // un contre annule l'ulti adverse (deux contres s'annulent mutuellement leurs effets hors contre)
  const meCancelled = meUlti && oppCancels && !meCancels;
  const oppCancelled = oppUlti && meCancels && !oppCancels;

  const me = computePower(state.me, state.opp, myIndex, eventId, state.round, meUlti, meCancelled, rng);
  const opp = computePower(state.opp, state.me, ai.index, eventId, state.round, oppUlti, oppCancelled, rng);

  const meSport = ATHLETES_BY_ID[state.me.cards[myIndex].athleteId].sport;
  const oppSport = ATHLETES_BY_ID[state.opp.cards[ai.index].athleteId].sport;
  const passiveDebuff = (sport: string) => (sport === 'volley' ? 4 : 0);
  const meTaken = meSport === 'natation' ? 0 : opp.debuff + passiveDebuff(oppSport);
  const oppTaken = oppSport === 'natation' ? 0 : me.debuff + passiveDebuff(meSport);
  if (meTaken) me.parts.push({ label: 'Malus adverse', value: -meTaken });
  if (oppTaken) opp.parts.push({ label: 'Malus adverse', value: -oppTaken });
  const mePower = Math.max(1, me.power - meTaken);
  const oppPower = Math.max(1, opp.power - oppTaken);

  let winner: RoundLog['winner'] = 'draw';
  if (Math.abs(mePower - oppPower) >= 0.5) winner = mePower > oppPower ? 'me' : 'opp';
  const points = winner === 'me' ? (me.double ? 2 : 1) : winner === 'opp' ? (opp.double ? 2 : 1) : 0;

  const records: string[] = [];
  const nextMe: SideState = {
    ...state.me,
    cards: state.me.cards.map((card, i) => {
      if (i === myIndex && me.record) {
        records.push(card.uid);
        const start = primeRecordStart(ATHLETES_BY_ID[card.athleteId]) ?? 630;
        return { ...card, record: (card.record ?? start) + 1 };
      }
      return card;
    }),
    used: [...state.me.used, myIndex],
    energy: Math.min(MAX_ENERGY, state.me.energy - (meUlti ? 1 : 0) + (winner === 'opp' ? 1 : 0) + (winner === 'me' && meSport === 'combat' && mePower - oppPower >= 10 ? 1 : 0)),
    score: state.me.score + (winner === 'me' ? points : 0),
    wins: state.me.wins + (winner === 'me' ? 1 : 0),
    buff: state.me.buff + me.teamBoost,
    wonLast: winner === 'me',
  };
  const nextOpp: SideState = {
    ...state.opp,
    used: [...state.opp.used, ai.index],
    energy: Math.min(MAX_ENERGY, state.opp.energy - (oppUlti ? 1 : 0) + (winner === 'me' ? 1 : 0) + (winner === 'opp' && oppSport === 'combat' && oppPower - mePower >= 10 ? 1 : 0)),
    score: state.opp.score + (winner === 'opp' ? points : 0),
    wins: state.opp.wins + (winner === 'opp' ? 1 : 0),
    buff: state.opp.buff + opp.teamBoost,
    wonLast: winner === 'opp',
  };

  const log: RoundLog = {
    round: state.round,
    event: eventId,
    me: { index: myIndex, ulti: meUlti, cancelled: meCancelled, power: mePower, parts: me.parts },
    opp: { index: ai.index, ulti: oppUlti, cancelled: oppCancelled, power: oppPower, parts: opp.parts },
    winner,
    points,
    records,
  };
  const round = state.round + 1;
  return {
    state: { ...state, me: nextMe, opp: nextOpp, round, log: [...state.log, log], finished: round >= ROUNDS },
    log,
  };
}

export function matchResult(state: MatchState): 'win' | 'draw' | 'loss' {
  if (state.me.score > state.opp.score) return 'win';
  if (state.me.score < state.opp.score) return 'loss';
  return 'draw';
}

export function rewardFor(result: 'win' | 'draw' | 'loss', division: number): number {
  const scale = 1 + (10 - division) * 0.25;
  const base = result === 'win' ? 500 : result === 'draw' ? 200 : 80;
  return Math.round((base * scale) / 10) * 10;
}

export function teamRating(cards: CardFace[]): number {
  if (!cards.length) return 0;
  return Math.round(cards.reduce((sum, card) => sum + overallOf(ATHLETES_BY_ID[card.athleteId], card.variant), 0) / cards.length);
}

/** Synergies affichées dans l'écran d'équipe. */
export function teamSynergies(cards: CardFace[]): string[] {
  const out: string[] = [];
  const football = cards.filter((c) => ATHLETES_BY_ID[c.athleteId].sport === 'foot').length;
  if (football >= 2) out.push(`Collectif : +${Math.min(8, (football - 1) * 2)} pour chaque footballeur`);
  const sports = new Set(cards.map((c) => ATHLETES_BY_ID[c.athleteId].sport));
  if (sports.size >= 4) out.push('Équipe omnisport : chaque épreuve trouve son spécialiste');
  const legend = cards.filter((c) => rarityOf(ATHLETES_BY_ID[c.athleteId]).id === 'legendaire').length;
  if (legend) out.push(`${legend} légende${legend > 1 ? 's' : ''} dans l’équipe`);
  return out;
}
