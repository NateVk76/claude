import type { SportDef, SportId, StatKey, MatchEvent, EventId } from '../engine/types';

export const STAT_KEYS: StatKey[] = ['vit', 'for', 'end', 'tec', 'int', 'aur'];

export const STAT_LABELS: Record<StatKey, { short: string; name: string; desc: string }> = {
  vit: { short: 'VIT', name: 'Vitesse', desc: 'Pointe de vitesse, réactivité.' },
  for: { short: 'FOR', name: 'Force', desc: 'Puissance physique, explosivité.' },
  end: { short: 'END', name: 'Endurance', desc: 'Tenir la distance, récupérer.' },
  tec: { short: 'TEC', name: 'Technique', desc: 'Précision du geste, maîtrise.' },
  int: { short: 'INT', name: 'Intelligence', desc: 'Lecture du jeu, stratégie.' },
  aur: { short: 'AUR', name: 'Aura', desc: 'Sang-froid, charisme, présence dans les grands rendez-vous.' },
};

// Chaque sport a une particularité (passif en match) et une réserve d'ultis
// attribués aux cartes qui n'ont pas d'ulti signature.
export const SPORTS: Record<SportId, SportDef> = {
  foot: {
    id: 'foot',
    name: 'Football',
    short: 'FOOT',
    color: '#2fbf71',
    pose: 'foot-frappe',
    passive: { name: 'Collectif', desc: '+2 de puissance par autre footballeur dans l’équipe (max +8).' },
    ultis: [
      { name: 'Frappe de mule', desc: 'Une frappe qui déchire les filets. +{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Grand pont', desc: 'Humilie son vis-à-vis : l’adversaire perd {v} de puissance.', effect: { kind: 'debuff', value: 0 } },
      { name: 'Retourné acrobatique', desc: 'Utilise sa meilleure stat pour l’épreuve, +{v}.', effect: { kind: 'best-stat', value: 0 } },
      { name: 'Panenka', desc: 'Au culot : la manche compte double si elle est gagnée. +{v}.', effect: { kind: 'double', value: 0 } },
    ],
  },
  basket: {
    id: 'basket',
    name: 'Basketball',
    short: 'BASKET',
    color: '#f28c28',
    pose: 'basket-dunk',
    passive: { name: 'Main chaude', desc: 'Après une manche gagnée, le basketteur suivant gagne +6.' },
    ultis: [
      { name: 'Poster dunk', desc: 'Smash sur la tête du défenseur. +{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Tir du logo', desc: 'Encore plus fort à la dernière manche : +{v}, +8 en fin de match.', effect: { kind: 'last-round', value: 0, bonus: 8 } },
      { name: 'Contre rageur', desc: 'Renvoie tout dans les tribunes : annule l’ulti adverse, +{v}.', effect: { kind: 'cancel', value: 0 } },
      { name: 'Alley-oop', desc: 'Passe décisive : +{v} maintenant, puis +3 pour toute l’équipe.', effect: { kind: 'team-buff', value: 0, boost: 3 } },
    ],
  },
  tennis: {
    id: 'tennis',
    name: 'Tennis',
    short: 'TENNIS',
    color: '#d4e157',
    pose: 'tennis-service',
    passive: { name: 'Duelliste', desc: '+5 dans les épreuves Face-à-face et Money time.' },
    ultis: [
      { name: 'Ace', desc: 'Service imparable. +{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Amortie', desc: 'Fait courir l’adversaire pour rien : il perd {v}.', effect: { kind: 'debuff', value: 0 } },
      { name: 'Passing le long de la ligne', desc: 'TEC devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'tec', value: 0 } },
      { name: 'Tie-break', desc: 'Sous pression, il se transcende : +{v}, +8 à la dernière manche.', effect: { kind: 'last-round', value: 0, bonus: 8 } },
    ],
  },
  athle: {
    id: 'athle',
    name: 'Athlétisme',
    short: 'ATHLÉ',
    color: '#ef5350',
    pose: 'athle-sprint',
    passive: { name: 'Explosivité', desc: '+6 à la première manche et dans l’épreuve Sprint.' },
    ultis: [
      { name: 'Départ canon', desc: 'Sorti des starting-blocks avant tout le monde. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'Finish', desc: 'VIT devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'vit', value: 0 } },
      { name: 'Record personnel', desc: 'Utilise sa meilleure stat, +{v}.', effect: { kind: 'best-stat', value: 0 } },
    ],
  },
  natation: {
    id: 'natation',
    name: 'Natation',
    short: 'NAT',
    color: '#29b6f6',
    pose: 'natation',
    passive: { name: 'Fluidité', desc: 'Insensible aux malus adverses.' },
    ultis: [
      { name: 'Coulée de dauphin', desc: 'Quinze mètres sous l’eau. +{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Virage culbute', desc: 'Relance parfaite : END devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'end', value: 0 } },
      { name: 'Sprint à la touche', desc: '+{v}, +8 à la dernière manche.', effect: { kind: 'last-round', value: 0, bonus: 8 } },
    ],
  },
  cyclisme: {
    id: 'cyclisme',
    name: 'Cyclisme',
    short: 'VÉLO',
    color: '#ffca28',
    pose: 'cyclisme',
    passive: { name: 'Diesel', desc: '+2 de puissance par numéro de manche (+10 à la 5e).' },
    ultis: [
      { name: 'Attaque en danseuse', desc: 'Il se lève sur les pédales. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'Échappée au long cours', desc: 'END devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'end', value: 0 } },
      { name: 'Sprint massif', desc: '+{v}, +8 à la dernière manche.', effect: { kind: 'last-round', value: 0, bonus: 8 } },
    ],
  },
  auto: {
    id: 'auto',
    name: 'Sports mécaniques',
    short: 'MOTEUR',
    color: '#e53935',
    pose: 'auto',
    passive: { name: 'Aspiration', desc: '+7 quand son équipe est menée au score.' },
    ultis: [
      { name: 'Undercut', desc: 'Arrêt au stand parfait. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'DRS ouvert', desc: 'VIT devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'vit', value: 0 } },
      { name: 'Freinage tardif', desc: 'L’adversaire perd {v} de puissance.', effect: { kind: 'debuff', value: 0 } },
    ],
  },
  combat: {
    id: 'combat',
    name: 'Sports de combat',
    short: 'COMBAT',
    color: '#8d6e63',
    pose: 'combat-boxe',
    passive: { name: 'Instinct du tueur', desc: 'Une manche gagnée de 10 points ou plus rapporte +1 énergie.' },
    ultis: [
      { name: 'Uppercut', desc: 'Direct au menton. +{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'KO', desc: 'La manche compte double si elle est gagnée. +{v}.', effect: { kind: 'double', value: 0 } },
      { name: 'Clé de bras', desc: 'L’adversaire perd {v} de puissance.', effect: { kind: 'debuff', value: 0 } },
    ],
  },
  rugby: {
    id: 'rugby',
    name: 'Rugby',
    short: 'RUGBY',
    color: '#7cb342',
    pose: 'rugby',
    passive: { name: 'Rouleau compresseur', desc: '+6 dans les épreuves Bras de fer et Décathlon.' },
    ultis: [
      { name: 'Raffut', desc: 'Écarte le défenseur d’une main. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'Mêlée enfoncée', desc: 'FOR devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'for', value: 0 } },
      { name: 'Cadrage-débordement', desc: '+{v} maintenant, puis +3 pour toute l’équipe.', effect: { kind: 'team-buff', value: 0, boost: 3 } },
    ],
  },
  hand: {
    id: 'hand',
    name: 'Handball',
    short: 'HAND',
    color: '#26a69a',
    pose: 'hand',
    passive: { name: 'Combinaison', desc: '+5 si son équipe a gagné la manche précédente.' },
    ultis: [
      { name: 'Kung-fu', desc: 'Passe en l’air, tir en suspension. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'Roucoulette', desc: 'TEC devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'tec', value: 0 } },
      { name: 'Chabala', desc: 'Lob sur le gardien : l’adversaire perd {v}.', effect: { kind: 'debuff', value: 0 } },
    ],
  },
  volley: {
    id: 'volley',
    name: 'Volley-ball',
    short: 'VOLLEY',
    color: '#ffb74d',
    pose: 'volley',
    passive: { name: 'Contre', desc: 'L’adversaire perd 4 de puissance.' },
    ultis: [
      { name: 'Attaque en pipe', desc: 'Frappe du fond du terrain. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'Service smashé', desc: 'La manche compte double si elle est gagnée. +{v}.', effect: { kind: 'double', value: 0 } },
      { name: 'Feinte', desc: 'L’adversaire perd {v} de puissance.', effect: { kind: 'debuff', value: 0 } },
    ],
  },
  hiver: {
    id: 'hiver',
    name: 'Sports d’hiver',
    short: 'HIVER',
    color: '#90caf9',
    pose: 'hiver-ski',
    passive: { name: 'Sang-froid', desc: '+5 dans les épreuves Money time et Marathon.' },
    ultis: [
      { name: 'Schuss', desc: 'Tout droit dans la pente. +{v}.', effect: { kind: 'boost', value: 0 } },
      { name: 'Tir couché parfait', desc: 'AURA devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'aur', value: 0 } },
      { name: 'Ligne idéale', desc: 'Utilise sa meilleure stat, +{v}.', effect: { kind: 'best-stat', value: 0 } },
    ],
  },
  gym: {
    id: 'gym',
    name: 'Gymnastique',
    short: 'GYM',
    color: '#f06292',
    pose: 'gym',
    passive: { name: 'Perfection', desc: '+6 dans l’épreuve Geste technique. Résultats très réguliers.' },
    ultis: [
      { name: 'Double salto', desc: '+{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Réception plantée', desc: 'TEC devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'tec', value: 0 } },
    ],
  },
  golf: {
    id: 'golf',
    name: 'Golf',
    short: 'GOLF',
    color: '#66bb6a',
    pose: 'golf',
    passive: { name: 'Concentration', desc: 'Presque aucune part de hasard dans ses résultats.' },
    ultis: [
      { name: 'Trou en un', desc: '+{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Putt de 15 mètres', desc: 'AURA devient la stat principale, +{v}.', effect: { kind: 'stat-swap', stat: 'aur', value: 0 } },
      { name: 'Dimanche au Masters', desc: '+{v}, +8 à la dernière manche.', effect: { kind: 'last-round', value: 0, bonus: 8 } },
    ],
  },
  glisse: {
    id: 'glisse',
    name: 'Glisse & urbain',
    short: 'GLISSE',
    color: '#4dd0e1',
    pose: 'glisse-surf',
    passive: { name: 'Style', desc: '+6 dans les épreuves Geste technique et Bain de foule.' },
    ultis: [
      { name: 'Tube parfait', desc: '+{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Figure inédite', desc: 'Utilise sa meilleure stat, +{v}.', effect: { kind: 'best-stat', value: 0 } },
    ],
  },
  us: {
    id: 'us',
    name: 'Sports US',
    short: 'US',
    color: '#5c6bc0',
    pose: 'us-football',
    passive: { name: 'Showtime', desc: '+5 dans les épreuves Bain de foule et Face-à-face.' },
    ultis: [
      { name: 'Hail Mary', desc: '+{v}, +8 à la dernière manche.', effect: { kind: 'last-round', value: 0, bonus: 8 } },
      { name: 'Home run', desc: '+{v} de puissance.', effect: { kind: 'boost', value: 0 } },
      { name: 'Mise en échec', desc: 'L’adversaire perd {v} de puissance.', effect: { kind: 'debuff', value: 0 } },
    ],
  },
};

export const SPORT_ORDER: SportId[] = [
  'foot', 'basket', 'tennis', 'athle', 'natation', 'cyclisme', 'auto', 'combat',
  'rugby', 'hand', 'volley', 'hiver', 'gym', 'golf', 'glisse', 'us',
];

export const EVENTS: Record<EventId, MatchEvent> = {
  sprint: { id: 'sprint', name: 'Sprint', desc: 'Le plus rapide l’emporte.', primary: 'vit', secondary: 'aur' },
  'bras-de-fer': { id: 'bras-de-fer', name: 'Bras de fer', desc: 'La force brute.', primary: 'for', secondary: 'aur' },
  marathon: { id: 'marathon', name: 'Marathon', desc: 'Tenir jusqu’au bout.', primary: 'end', secondary: 'aur' },
  'coup-de-genie': { id: 'coup-de-genie', name: 'Coup de génie', desc: 'Voir avant les autres.', primary: 'int', secondary: 'tec' },
  'geste-technique': { id: 'geste-technique', name: 'Geste technique', desc: 'La précision absolue.', primary: 'tec', secondary: 'int' },
  'money-time': { id: 'money-time', name: 'Money time', desc: 'Dernière seconde, tout se joue.', primary: 'aur', secondary: 'int' },
  'face-a-face': { id: 'face-a-face', name: 'Face-à-face', desc: 'Les yeux dans les yeux.', primary: 'aur', secondary: 'for' },
  'bain-de-foule': { id: 'bain-de-foule', name: 'Bain de foule', desc: 'Le stade choisit son héros : la popularité compte.', primary: 'aur', secondary: 'aur', popularity: true },
  decathlon: { id: 'decathlon', name: 'Décathlon', desc: 'Le plus complet gagne.', primary: 'for', secondary: 'end', blend: ['vit', 'for', 'end', 'tec'] },
};

export const EVENT_ORDER: EventId[] = [
  'sprint', 'bras-de-fer', 'marathon', 'coup-de-genie', 'geste-technique',
  'money-time', 'face-a-face', 'bain-de-foule', 'decathlon',
];
