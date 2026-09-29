import { describe, expect, it } from 'vitest';
import { ATHLETES_BY_ID } from '../../data/athletes';
import { rarityOf, primeRecordStart } from '../cards';
import { FREE_PACK, SHOP_PACKS, openPack } from '../packs';
import { advanceMarket, createMarket, createMyListing, marketPrice, netAfterTax, TARGET_LISTINGS, type MarketState } from '../market';
import { createMatch, matchResult, playRound, ROUNDS, type MatchCard } from '../match';
import { mulberry32 } from '../random';

const MINUTE = 60_000;

describe('boosters', () => {
  it('donne le bon nombre de cartes, triées de la moins rare à la plus rare', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const cards = openPack(FREE_PACK, rng);
      expect(cards).toHaveLength(5);
      const orders = cards.map((c) => rarityOf(ATHLETES_BY_ID[c.athleteId]).order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it('respecte la carte garantie des packs payants', () => {
    const rng = mulberry32(7);
    const elite = SHOP_PACKS.find((p) => p.id === 'elite')!;
    const legende = SHOP_PACKS.find((p) => p.id === 'legende')!;
    const prime = SHOP_PACKS.find((p) => p.id === 'prime')!;
    for (let i = 0; i < 100; i++) {
      const best = openPack(elite, rng).at(-1)!;
      expect(rarityOf(ATHLETES_BY_ID[best.athleteId]).order).toBeGreaterThanOrEqual(3);
      const legend = openPack(legende, rng).at(-1)!;
      expect(rarityOf(ATHLETES_BY_ID[legend.athleteId]).id).toBe('legendaire');
      expect(openPack(prime, rng).some((c) => c.variant === 'prime')).toBe(true);
    }
  });

  it('rend les légendaires vraiment rares dans le booster gratuit', () => {
    const rng = mulberry32(2024);
    let legendary = 0;
    let total = 0;
    let messi = 0;
    let duplantis = 0;
    for (let i = 0; i < 20_000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (rarityOf(ATHLETES_BY_ID[card.athleteId]).id === 'legendaire') legendary += 1;
        if (card.athleteId === 'messi') messi += 1;
        if (card.athleteId === 'duplantis') duplantis += 1;
      }
    }
    const share = legendary / total;
    expect(share).toBeGreaterThan(0.005);
    expect(share).toBeLessThan(0.011);
    // plus un athlète est célèbre, plus sa carte est rare : Messi sort bien moins souvent que Duplantis
    expect(messi).toBeLessThan(duplantis);
  });

  it('inscrit le record de Duplantis sur sa carte', () => {
    expect(primeRecordStart(ATHLETES_BY_ID.duplantis)).toBe(630);
    expect(primeRecordStart(ATHLETES_BY_ID.messi)).toBeUndefined();
  });
});

describe('marché des transferts', () => {
  const t0 = Date.UTC(2026, 8, 29, 12);

  it('garde un marché rempli en permanence, même après une longue absence', () => {
    const rng = mulberry32(1);
    const market = createMarket(t0, rng);
    expect(market.listings).toHaveLength(TARGET_LISTINGS);
    const { state } = advanceMarket(market, t0 + 8 * 60 * MINUTE, rng);
    expect(state.listings.length).toBe(TARGET_LISTINGS);
    expect(state.listings.every((l) => l.expiresAt > t0 + 8 * 60 * MINUTE)).toBe(true);
    expect(state.news.length).toBeGreaterThan(0);
  });

  it('vend vite une carte proposée sous la cote, et pas une carte hors de prix', () => {
    const rng = mulberry32(99);
    const card = { uid: 'u1', athleteId: 'kante', variant: 'base' as const, obtainedAt: t0 };
    const price = marketPrice(card, t0);
    let sold = 0;
    let overpricedSold = 0;
    for (let i = 0; i < 40; i++) {
      const cheap: MarketState = { ...createMarket(t0, rng), myListings: [createMyListing(card, Math.round(price * 0.6), Math.round(price * 0.9), 15, t0)] };
      if (advanceMarket(cheap, t0 + 15 * MINUTE, rng).events.some((e) => e.type === 'sold')) sold += 1;
      const pricey: MarketState = { ...createMarket(t0, rng), myListings: [createMyListing(card, price * 3, price * 4, 15, t0)] };
      if (advanceMarket(pricey, t0 + 15 * MINUTE, rng).events.some((e) => e.type === 'sold')) overpricedSold += 1;
    }
    expect(sold).toBeGreaterThan(30);
    expect(overpricedSold).toBeLessThan(4);
  });

  it('prélève la taxe de 5 % sur les ventes', () => {
    expect(netAfterTax(10_000)).toBe(9_500);
  });

  it('rembourse le joueur quand une IA surenchérit', () => {
    const rng = mulberry32(5);
    const market = createMarket(t0, rng);
    const target = market.listings[0];
    const cheapBid = { ...target, currentBid: 50, bidder: 'me' as const, bidCount: 1, expiresAt: t0 + 30 * MINUTE };
    let refunded = false;
    for (let i = 0; i < 20 && !refunded; i++) {
      const { events } = advanceMarket({ ...market, listings: [cheapBid, ...market.listings.slice(1)] }, t0 + 10 * MINUTE, mulberry32(i));
      refunded = events.some((e) => e.type === 'outbid' && e.refund === 50);
    }
    expect(refunded).toBe(true);
  });
});

describe('matchs', () => {
  const team = (ids: string[]): MatchCard[] => ids.map((id, i) => ({ uid: `u${i}`, athleteId: id, variant: 'base' }));

  it('se joue en 5 manches et désigne un résultat', () => {
    const rng = mulberry32(3);
    let match = createMatch(team(['collet', 'kante', 'ngapeth', 'gasquet', 'mbappe']), 10, rng);
    for (let round = 0; round < ROUNDS; round++) {
      expect(match.finished).toBe(false);
      match = playRound(match, round, false, rng).state;
    }
    expect(match.finished).toBe(true);
    expect(match.log).toHaveLength(ROUNDS);
    expect(['win', 'draw', 'loss']).toContain(matchResult(match));
  });

  it('consomme de l’énergie pour un ulti et interdit de rejouer un athlète', () => {
    const rng = mulberry32(8);
    const match = createMatch(team(['messi', 'lebron', 'bolt', 'riner', 'biles']), 5, rng);
    const { state } = playRound(match, 0, true, rng);
    expect(state.me.energy).toBeLessThanOrEqual(match.me.energy);
    expect(() => playRound(state, 0, false, rng)).toThrow();
  });

  it('fait grimper le record de Duplantis d’un centimètre à chaque ulti', () => {
    const rng = mulberry32(11);
    const cards = team(['duplantis', 'kante', 'ngapeth', 'gasquet', 'collet']);
    cards[0].record = 630;
    const match = createMatch(cards, 8, rng);
    const { state, log } = playRound(match, 0, true, rng);
    expect(log.records).toEqual(['u0']);
    expect(state.me.cards[0].record).toBe(631);
  });

  it('donne l’avantage à une équipe de légendes contre une division faible', () => {
    let wins = 0;
    for (let seed = 0; seed < 40; seed++) {
      const rng = mulberry32(seed);
      let match = createMatch(team(['messi', 'lebron', 'bolt', 'riner', 'biles']), 10, rng);
      for (let round = 0; round < ROUNDS; round++) match = playRound(match, round, round >= 3, rng).state;
      if (matchResult(match) === 'win') wins += 1;
    }
    expect(wins).toBeGreaterThan(32);
  });
});
