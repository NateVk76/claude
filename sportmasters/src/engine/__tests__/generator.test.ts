import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript sans types (script Node)
import { archetypeFor, describesAthlete, factFrom, fameFromAnchors, fameFromRank, isCoach, levelFromSitelinksRank, pickCountry, slugify, splitName } from '../../../scripts/wikidata/helpers.mjs';

describe('générateur d’athlètes (Wikidata)', () => {
  it('garde très peu de légendaires même sur 10 000 athlètes', () => {
    const total = 10_000;
    const fames = Array.from({ length: total }, (_, rank) => fameFromRank(rank, total));
    const legendary = fames.filter((f) => f >= 90).length;
    const epic = fames.filter((f) => f >= 75 && f < 90).length;
    const rare = fames.filter((f) => f >= 60 && f < 75).length;
    expect(legendary).toBeGreaterThan(20);
    expect(legendary).toBeLessThan(40);
    expect(epic).toBeGreaterThan(100);
    expect(epic).toBeLessThan(140);
    expect(rare).toBeGreaterThan(500);
    expect(fames[0]).toBe(99);
    expect(fames[total - 1]).toBe(5);
    // la célébrité ne remonte jamais quand le rang baisse
    for (let i = 1; i < total; i++) expect(fames[i]).toBeLessThanOrEqual(fames[i - 1]);
  });

  it('estime une note entre 72 et 98', () => {
    expect(levelFromSitelinksRank(0, 1000)).toBe(98);
    expect(levelFromSitelinksRank(999, 1000)).toBe(72);
  });

  it('cale la célébrité des nouveaux athlètes sur celle de la base manuelle', () => {
    const anchors = [
      { views: 2_000, fame: 10 },
      { views: 20_000, fame: 35 },
      { views: 200_000, fame: 60 },
      { views: 2_000_000, fame: 92 },
    ];
    // autant de vues qu'un athlète manuel : la même célébrité
    expect(fameFromAnchors(20_000, anchors)).toBe(35);
    expect(fameFromAnchors(2_000_000, anchors)).toBe(92);
    // plus de vues, jamais moins de célébrité
    let previous = 0;
    for (const views of [0, 10, 500, 2_000, 9_000, 50_000, 700_000, 5_000_000]) {
      const fame = fameFromAnchors(views, anchors);
      expect(fame).toBeGreaterThanOrEqual(previous);
      previous = fame;
    }
    // très peu vu : bien en dessous, sans descendre sous 3
    expect(fameFromAnchors(20, anchors)).toBeLessThan(10);
    expect(fameFromAnchors(0, anchors)).toBeGreaterThanOrEqual(3);
  });

  it('ne garde que les joueurs du bon sport', () => {
    expect(describesAthlete('foot', 'footballeur international français')).toBe(true);
    expect(describesAthlete('foot', 'footballeur puis entraîneur français')).toBe(true);
    expect(describesAthlete('foot', 'entraîneur de football portugais')).toBe(false);
    expect(describesAthlete('foot', 'joueur de football américain')).toBe(false);
    expect(describesAthlete('us', 'joueur de football américain')).toBe(true);
    expect(describesAthlete('tennis', '')).toBe(false);
    expect(isCoach('Footballeur et entraîneur espagnol')).toBe(true);
    expect(isCoach('Footballeur français')).toBe(false);
  });

  it('choisit le pays sportif et écrit le nom comme la base manuelle', () => {
    expect(pickCountry(['GB-ENG'], ['GB'], 'footballeur anglais')).toBe('GB-ENG');
    expect(pickCountry([], ['GB'], 'footballeur international écossais')).toBe('GB-SCT');
    expect(pickCountry([], ['FR', 'DZ'], 'footballeur international algérien')).toBe('DZ');
    expect(pickCountry([], ['FR', 'DZ'], 'footballeur international français')).toBe('FR');
    expect(pickCountry([], [], 'judoka')).toBeNull();
    // la description l'emporte sur une nationalité seule : rugbyman irlandais né aux États-Unis
    expect(pickCountry([], ['US'], 'joueur de rugby à XV international irlandais')).toBe('IE');
    expect(pickCountry([], ['GB', 'IE'], 'golfeur nord-irlandais')).toBe('GB-NIR');
    expect(pickCountry([], ['US', 'CL'], 'surfeur', ['US'])).toBe('US');
    expect(pickCountry(['DD'], [], 'patineuse artistique')).toBe('DE');
    expect(splitName('Son Heung-min', 'KR')).toEqual({ first: 'Heung-min', last: 'Son' });
    expect(splitName('Marc-André ter Stegen (footballeur)', 'DE')).toEqual({ first: 'Marc-André', last: 'ter Stegen' });
    expect(splitName('Kaká', 'BR')).toEqual({ first: '', last: 'Kaká' });
  });

  it('devine le profil et le poste depuis la description', () => {
    expect(archetypeFor('athle', 'athlète suédois spécialiste du saut à la perche').archetype).toBe('perchiste');
    expect(archetypeFor('foot', 'gardien de but international français').archetype).toBe('gardien');
    expect(archetypeFor('rugby', 'joueur de rugby, demi de mêlée').archetype).toBe('demi');
    expect(archetypeFor('tennis', 'joueuse de tennis').archetype).toBe('tennis-complet');
    expect(archetypeFor('auto', '', { archetype: 'pilote-moto', role: 'Moto' }).archetype).toBe('pilote-moto');
    expect(archetypeFor('athle', 'athlète kényan | 800 mètres').archetype).toBe('demi-fond');
    expect(archetypeFor('athle', 'athlète spécialiste du demi-fond').archetype).toBe('demi-fond');
    expect(archetypeFor('athle', 'marathonien éthiopien').archetype).toBe('fond');
    expect(archetypeFor('basket', 'joueur de basket-ball | ailier fort').archetype).toBe('pivot');
    expect(archetypeFor('hand', 'handballeur | ailier gauche').archetype).toBe('hand-ailier');
    // un combattant de MMA qui a aussi boxé reste un combattant de MMA
    expect(archetypeFor('combat', 'pratiquant irlandais d’arts martiaux mixtes', { archetype: 'boxeur', role: 'Boxe' }).archetype).toBe('mma');
    expect(archetypeFor('auto', 'pilote automobile canadien', { archetype: 'pilote-moto', role: 'Moto' }).archetype).toBe('pilote-f1');
    expect(archetypeFor('us', 'joueur de football américain | quarterback', { archetype: 'baseball', role: 'Baseball (MLB)' }).archetype).toBe('quarterback');
  });

  it('produit des identifiants et des phrases propres', () => {
    expect(slugify('Armand « Mondo » Duplantis')).toBe('armand-mondo-duplantis');
    expect(slugify('Nikola Karabatić')).toBe('nikola-karabatic');
    expect(factFrom('footballeur international français', 'Football')).toBe('Footballeur international français.');
  });
});
