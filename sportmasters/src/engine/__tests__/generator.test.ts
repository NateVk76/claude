import { describe, expect, it } from 'vitest';
// @ts-expect-error module JavaScript sans types (script Node)
import { archetypeFor, deathConfirmed, defaultFact, describesAthlete, factFrom, fameFromAnchors, fameFromRank, isCoach, levelFromSitelinksRank, pickCountry, retirementClue, slugify, splitName } from '../../../scripts/wikidata/helpers.mjs';

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
    // pays disparu : le pays de naissance, même quand c'est la nationalité sportive
    expect(pickCountry(['SU'], ['SU', 'BY', 'US'], 'gymnaste soviétique', ['BY'])).toBe('BY');
    expect(pickCountry([], ['YU', 'RS'], 'basketteur yougoslave puis serbe', ['RS'])).toBe('RS');
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
    expect(slugify('Tarjei Bø')).toBe('tarjei-bo');
    expect(slugify('Anita Włodarczyk')).toBe('anita-wlodarczyk');
    expect(factFrom('footballeur international français', 'Football')).toBe('Footballeur international français.');
  });

  it('reconnaît les retraités (futures Icônes) à leur introduction Wikipédia', () => {
    const retired = (intro: { fr?: string; en?: string }, born?: number, died?: number) => retirementClue({ ...intro, born, died, year: 2026 }) !== null;
    // la page anglaise dit « former » pour un retraité, même quand la française parle au présent
    expect(retired({ en: 'Marcel Desailly (born 7 September 1968) is a French former professional footballer.', fr: 'Marcel Desailly est un footballeur international français évoluant au poste de défenseur.' }, 1968)).toBe(true);
    expect(retired({ en: 'Laurent Blanc is a French professional football manager and former player.' }, 1965)).toBe(true);
    expect(retired({ en: 'Kirsty Coventry is a Zimbabwean politician, sports administrator and former competitive swimmer.' }, 1983)).toBe(true);
    expect(retired({ en: 'Usain St Leo Bolt is a Jamaican retired sprinter.' }, 1986)).toBe(true);
    // … et jamais pour un joueur en activité, même à 59 ans ou quand la page française dit « ancien champion »
    expect(retired({ en: 'Kazuyoshi Miura is a Japanese professional footballer who plays as a forward.', fr: 'Kazuyoshi Miura est un footballeur ayant évolué à Santos.' }, 1967)).toBe(false);
    expect(retired({ en: 'Conor McGregor is an Irish professional mixed martial artist. He is a former UFC champion.' }, 1988)).toBe(false);
    expect(retired({ en: 'Caroline Wozniacki is a Danish professional tennis player. She is a former world No. 1.' }, 1990)).toBe(false);
    // « former » devant un titre ou un autre métier ne dit pas une retraite
    expect(retired({ en: 'Islam Makhachev is a Russian professional mixed martial artist and former UFC Lightweight Champion.' }, 1991)).toBe(false);
    expect(retired({ en: 'Manny Pacquiao is a Filipino former politician and professional boxer.' }, 1978)).toBe(false);
    expect(retired({ en: 'Veselin Topalov is a Bulgarian chess grandmaster and former FIDE World Champion.' }, 1975)).toBe(false);
    expect(retired({ en: 'George Weah is a Liberian politician and former professional footballer who served as president.' }, 1966)).toBe(true);
    expect(retired({ en: 'Giacomo Agostini is an Italian former Grand Prix motorcycle road racer.' }, 1942)).toBe(true);
    expect(retired({ en: 'Billie Jean King is an American former world No. 1 tennis player.' }, 1943)).toBe(true);
    expect(retired({ en: 'Aksel Lund Svindal is a Norwegian former World Cup alpine ski racer.' }, 1982)).toBe(true);
    // sans page anglaise : les tournures de la page française, puis l'âge
    expect(retired({ fr: 'Franck Ribéry, né le 7 avril 1983, est un ancien footballeur international français.' }, 1983)).toBe(true);
    expect(retired({ fr: 'Marion Bartoli est une joueuse de tennis française, professionnelle de février 2000 à août 2013.' }, 1984)).toBe(true);
    expect(retired({ fr: 'Philippe Gilbert est un coureur cycliste belge professionnel pendant 20 ans de 2003 à 2022.' }, 1982)).toBe(true);
    expect(retired({ fr: 'Tom Boonen est un coureur cycliste belge (2002-2017) et un pilote de rallye automobile.' }, 1980)).toBe(true);
    expect(retired({ fr: 'Guillaume Gille est un joueur international puis entraîneur français de handball.' }, 1976)).toBe(true);
    expect(retired({ fr: 'Michael Owen est un footballeur anglais évoluant au poste d’attaquant de la fin des années 1990 au début des années 2010.' }, 1979)).toBe(true);
    expect(retired({ fr: 'Conor McGregor est un pratiquant d’arts martiaux mixtes. Il est ancien champion de l’UFC.' }, 1988)).toBe(false);
    expect(retired({ fr: 'Björn Borg, né le 6 juin 1956, est un joueur de tennis suédois.' }, 1956)).toBe(true);
    expect(retired({ fr: 'Kylian Mbappé est un footballeur international français qui évolue au poste d’attaquant au Real Madrid.' }, 1998)).toBe(false);
    expect(retired({}, undefined, 2001)).toBe(true);
    // décès : confirmé par l'une des deux introductions
    expect(deathConfirmed('Eddie Aikau est un surfeur hawaïen disparu en mer en 1978.', '')).toBe(true);
    expect(deathConfirmed('', 'Eddie Aikau was a Hawaiian lifeguard and surfer.')).toBe(true);
    expect(deathConfirmed('Franz Beckenbauer est un footballeur allemand.', 'Franz Beckenbauer is a German footballer.')).toBe(false);
  });

  it('accueille les pongistes, joueurs d’échecs et joueurs d’esport', () => {
    expect(describesAthlete('pingpong', 'pongiste chinois')).toBe(true);
    expect(describesAthlete('echecs', 'joueur d’échecs norvégien')).toBe(true);
    expect(describesAthlete('esport', 'joueur professionnel sud-coréen de League of Legends')).toBe(true);
    expect(describesAthlete('esport', 'vidéaste web et streameur français')).toBe(false);
    // sans description en français, l'anglaise, plus sévèrement
    expect(describesAthlete('esport', '', 'Ukrainian professional Counter-Strike player')).toBe(true);
    expect(describesAthlete('esport', '', 'American YouTuber and gamer')).toBe(false);
    expect(archetypeFor('esport', 'joueur professionnel de League of Legends')).toEqual({ archetype: 'esport-moba', role: 'League of Legends' });
    expect(archetypeFor('esport', 'joueur de Counter-Strike: Global Offensive').archetype).toBe('esport-fps');
    expect(archetypeFor('esport', 'joueur professionnel de StarCraft II').archetype).toBe('esport-rts');
    expect(archetypeFor('esport', 'joueur de Street Fighter')).toEqual({ archetype: 'esport-versus', role: 'Jeux de combat' });
    // le jeu vient parfois seulement de Wikidata (P641) ou du poste
    expect(archetypeFor('esport', 'joueur professionnel de sport électronique | League of Legends')).toEqual({ archetype: 'esport-moba', role: 'League of Legends' });
    expect(archetypeFor('esport', 'joueur de jeux vidéo | mid laner').role).toBe('League of Legends');
    expect(archetypeFor('esport', 'joueur professionnel de jeux vidéo | Counter-Strike 2').role).toBe('Counter-Strike');
    expect(archetypeFor('esport', 'joueuse de sport électronique | StarCraft II | Dota 2').archetype).toBe('esport-rts');
    expect(archetypeFor('pingpong', 'pongiste suédois')).toEqual({ archetype: 'pong-attaque', role: 'Tennis de table' });
    expect(archetypeFor('echecs', 'joueur d’échecs russe').archetype).toBe('echecs-stratege');
    expect(defaultFact('esport', 'Counter-Strike', false)).toBe('Joueur professionnel de Counter-Strike');
    expect(defaultFact('echecs', 'Échecs', true)).toBe('Joueuse d’échecs');
  });

  it('remet dans l’ordre les noms d’Asie de l’Est et les pays disparus', () => {
    expect(splitName('Ma Long', 'CN')).toEqual({ first: 'Long', last: 'Ma' });
    // libellé écrit à l'occidentale : le nom de famille est à la fin
    expect(splitName('Yeon-Koung Kim', 'KR')).toEqual({ first: 'Yeon-Koung', last: 'Kim' });
    expect(splitName('Qinwen Zheng', 'CN')).toEqual({ first: 'Qinwen', last: 'Zheng' });
    // né en Azerbaïdjan soviétique, Arménien : la nationalité d'aujourd'hui l'emporte sur le lieu de naissance
    expect(pickCountry(['SU'], ['SU', 'AM'], 'gymnaste soviétique', ['AZ'])).toBe('AM');
  });
});
