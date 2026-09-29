import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript sans types (script Node)
import { archetypeFor, factFrom, fameFromRank, levelFromSitelinksRank, slugify } from '../../../scripts/wikidata/helpers.mjs';

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

  it('devine le profil et le poste depuis la description', () => {
    expect(archetypeFor('athle', 'athlète suédois spécialiste du saut à la perche').archetype).toBe('perchiste');
    expect(archetypeFor('foot', 'gardien de but international français').archetype).toBe('gardien');
    expect(archetypeFor('rugby', 'joueur de rugby, demi de mêlée').archetype).toBe('demi');
    expect(archetypeFor('tennis', 'joueuse de tennis').archetype).toBe('tennis-complet');
    expect(archetypeFor('auto', '', { archetype: 'pilote-moto', role: 'Moto' }).archetype).toBe('pilote-moto');
  });

  it('produit des identifiants et des phrases propres', () => {
    expect(slugify('Armand « Mondo » Duplantis')).toBe('armand-mondo-duplantis');
    expect(slugify('Nikola Karabatić')).toBe('nikola-karabatic');
    expect(factFrom('footballeur international français', 'Football')).toBe('Footballeur international français.');
  });
});
