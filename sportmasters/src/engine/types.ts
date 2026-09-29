// Types centraux du jeu. Tout le moteur (raretés, marché, matchs) s'appuie dessus.

export type StatKey = 'vit' | 'for' | 'end' | 'tec' | 'int' | 'aur';
export type Stats = Record<StatKey, number>;

export type RarityId = 'commune' | 'peu-commune' | 'rare' | 'epique' | 'legendaire';

export type SportId =
  | 'foot'
  | 'basket'
  | 'tennis'
  | 'athle'
  | 'natation'
  | 'cyclisme'
  | 'auto'
  | 'combat'
  | 'rugby'
  | 'hand'
  | 'volley'
  | 'hiver'
  | 'gym'
  | 'golf'
  | 'glisse'
  | 'us';

/** Profil de stats : décalages appliqués à la note de l'athlète pour chaque stat physique/mentale. */
export type ArchetypeId =
  // football
  | 'gardien' | 'defenseur' | 'milieu' | 'ailier' | 'buteur'
  // basket
  | 'meneur' | 'ailier-bk' | 'pivot'
  // tennis
  | 'tennis-attaque' | 'tennis-complet' | 'tennis-defense'
  // athlétisme
  | 'sprinter' | 'haies' | 'demi-fond' | 'fond' | 'sauteur' | 'perchiste' | 'lanceur' | 'epreuves-combinees'
  // natation
  | 'nage-sprint' | 'nage-fond' | 'nage-complet'
  // cyclisme
  | 'grimpeur' | 'sprinteur-velo' | 'rouleur' | 'puncheur'
  // sports mécaniques
  | 'pilote-f1' | 'pilote-moto' | 'pilote-rallye'
  // combat
  | 'boxeur' | 'mma' | 'judoka'
  // rugby
  | 'avant' | 'demi' | 'trois-quart'
  // handball
  | 'hand-arriere' | 'hand-gardien' | 'hand-ailier' | 'hand-pivot'
  // volley
  | 'volley-attaquant' | 'volley-passeur'
  // hiver
  | 'skieur' | 'biathlete' | 'patineur'
  // gym
  | 'gymnaste'
  // golf
  | 'golfeur'
  // glisse
  | 'surfeur' | 'skateur' | 'grimpeur-esc'
  // sports US
  | 'quarterback' | 'receveur' | 'baseball' | 'hockey';

/** Effet d'un ulti pendant une manche de match. */
export type UltiEffect =
  | { kind: 'boost'; value: number } // + puissance
  | { kind: 'stat-swap'; stat: StatKey; value: number } // remplace la stat principale de l'épreuve
  | { kind: 'best-stat'; value: number } // utilise la meilleure stat de l'athlète
  | { kind: 'debuff'; value: number } // − puissance adverse
  | { kind: 'double'; value: number } // la manche compte double si gagnée
  | { kind: 'team-buff'; value: number; boost: number } // bonus sur toutes les manches suivantes
  | { kind: 'comeback'; value: number; bonus: number } // bonus supplémentaire si l'équipe est menée
  | { kind: 'last-round'; value: number; bonus: number } // bonus supplémentaire à la dernière manche
  | { kind: 'event'; value: number; events: EventId[]; bonus: number } // bonus supplémentaire sur certaines épreuves
  | { kind: 'cancel'; value: number } // annule l'ulti adverse
  | { kind: 'streak'; value: number; perWin: number } // + par manche déjà gagnée
  | { kind: 'record'; value: number }; // Duplantis : +1 cm à chaque utilisation

export interface Ulti {
  id: string;
  name: string;
  desc: string;
  effects: UltiEffect[];
  signature?: boolean;
}

/** Modèle d'ulti de sport : la valeur est fixée selon la rareté de la carte ({v} dans le texte). */
export interface SportUltiTemplate {
  name: string;
  desc: string;
  effect: UltiEffect;
}

/** Version d'une carte : classique, ou Prime (meilleure saison de l'athlète, plus rare et plus forte). */
export type Variant = 'base' | 'prime';

export interface Athlete {
  id: string;
  first: string;
  last: string;
  nick?: string;
  sport: SportId;
  /** discipline ou poste affiché sur la carte */
  role: string;
  archetype: ArchetypeId;
  country: string;
  /** 0-100 : célébrité (≈ audience Wikipédia). Détermine la rareté. */
  fame: number;
  /** 0-100 : niveau sportif. C'est la note affichée sur la carte. */
  level: number;
  retired?: boolean;
  /** années de naissance / décès, affichées sur les cartes Icône des légendes disparues */
  born?: number;
  died?: number;
  fact: string;
  /** saison de référence de la version Prime */
  prime?: { year: string; note: string };
  /** numéro de maillot / dossard pour l'illustration */
  num?: number;
  stats?: Partial<Stats>;
  ulti?: Ulti;
  /** identifiant Wikidata (athlètes générés automatiquement) */
  wikidata?: string;
  /** titre de la page Wikipédia en français (athlètes générés automatiquement) */
  wiki?: string;
}

export interface Rarity {
  id: RarityId;
  name: string;
  minFame: number;
  /** valeur marchande de base en Balles */
  baseValue: number;
  /** puissance bonus des ultis génériques */
  ultiPower: number;
  order: number;
}

export type EventId =
  | 'sprint'
  | 'bras-de-fer'
  | 'marathon'
  | 'coup-de-genie'
  | 'geste-technique'
  | 'money-time'
  | 'face-a-face'
  | 'bain-de-foule'
  | 'decathlon';

export interface MatchEvent {
  id: EventId;
  name: string;
  desc: string;
  primary: StatKey;
  secondary: StatKey;
  /** si défini, moyenne de ces stats à la place de primaire/secondaire */
  blend?: StatKey[];
  /** la célébrité de l'athlète compte dans l'épreuve */
  popularity?: boolean;
}

export interface SportDef {
  id: SportId;
  name: string;
  short: string;
  color: string;
  passive: { name: string; desc: string };
  ultis: SportUltiTemplate[];
}

/** Ce qui définit l'apparence d'une carte. */
export interface CardFace {
  athleteId: string;
  variant: Variant;
  /** progression propre à l'exemplaire (ex. record de Duplantis en cm) */
  record?: number;
}

/** Exemplaire possédé d'une carte (on peut avoir des doublons). */
export interface OwnedCard extends CardFace {
  uid: string;
  obtainedAt: number;
  /** carte verrouillée : ne peut pas être vendue par erreur */
  locked?: boolean;
}
