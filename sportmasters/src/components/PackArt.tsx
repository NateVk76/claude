import { useId, useState, type CSSProperties } from 'react';
import type { PackDef } from '../engine/packs';
import type { SportId } from '../engine/types';
import { SPORTS } from '../data/sports';
import { ATHLETES } from '../data/athletes';
import { getAthlete } from '../engine/cards';
import { photoCredit, usePhoto } from '../photos';
import { SportIcon } from './SportIcon';
import { Logo } from './Logo';

// Booster façon paquet de cartes Topps : sachet en feuille métallisée froissée, soudures crantées
// en haut et en bas, cartouche du logo, star du pack dans un cadre blanc incliné sur des rayons,
// nom du pack sur un bandeau en biais et pastille étoilée avec le nombre de cartes.
// Repère SVG 120 × 170 ; les textes sont en HTML, en unités cqw (largeur du sachet).

type Tone = PackDef['tone'];

interface Look {
  /** feuille métallisée : 5 teintes, de la plus claire à la plus sombre, alternées en diagonale */
  foil: [string, string, string, string, string];
  /** texte posé directement sur la feuille (série, garantie) */
  ink: string;
  ribbon: string;
  ribbonInk: string;
  burst: string;
  burstInk: string;
  /** couleur des rayons derrière la photo */
  rays: string;
}

const LOOKS: Record<Exclude<Tone, 'sport'>, Look> = {
  bronze: {
    foil: ['#f2c192', '#c47a3f', '#7a4020', '#e3a56f', '#95552c'],
    ink: '#2c1608',
    ribbon: 'var(--accent)',
    ribbonInk: '#ffffff',
    burst: '#fff4e6',
    burstInk: '#1e7a3c',
    rays: 'rgba(255, 236, 214, 0.28)',
  },
  silver: {
    foil: ['#ffffff', '#cdd4dc', '#7d8896', '#eef1f5', '#9ca7b4'],
    ink: '#141b24',
    ribbon: 'var(--accent)',
    ribbonInk: '#ffffff',
    burst: '#1e7a3c',
    burstInk: '#ffffff',
    rays: 'rgba(255, 255, 255, 0.4)',
  },
  gold: {
    foil: ['#fff4c4', '#e6ba4f', '#9c6c12', '#ffe38c', '#bb8a20'],
    ink: '#241802',
    ribbon: '#121212',
    ribbonInk: '#ffd86b',
    burst: '#d7263d',
    burstInk: '#ffffff',
    rays: 'rgba(255, 248, 214, 0.35)',
  },
  violet: {
    foil: ['#eadcff', '#9f70ff', '#3b128f', '#caaeff', '#5d2cc4'],
    ink: '#ffffff',
    ribbon: '#ffd66b',
    ribbonInk: '#2a1600',
    burst: '#ffffff',
    burstInk: '#4b1fb0',
    rays: 'rgba(240, 225, 255, 0.22)',
  },
  icon: {
    foil: ['#fffaf0', '#efe2c2', '#c8ad72', '#fbf3df', '#dcc79a'],
    ink: '#3a2a10',
    ribbon: '#8b1e1e',
    ribbonInk: '#fff4dc',
    burst: '#1f3d7a',
    burstInk: '#fff4dc',
    rays: 'rgba(139, 30, 30, 0.12)',
  },
  prime: {
    foil: ['#ffc6e8', '#fff1a8', '#b9ffe1', '#b7e1ff', '#dcc2ff'],
    ink: '#16121f',
    ribbon: '#111016',
    ribbonInk: '#ffffff',
    burst: '#ffffff',
    burstInk: '#111016',
    rays: 'rgba(255, 255, 255, 0.55)',
  },
  black: {
    foil: ['#4a4130', '#1a160f', '#050403', '#332b1d', '#0d0b07'],
    ink: '#f3d58a',
    ribbon: '#e9c46a',
    ribbonInk: '#140e02',
    burst: '#e9c46a',
    burstInk: '#140e02',
    rays: 'rgba(233, 196, 106, 0.22)',
  },
};

function sportLook(sport: SportId): Look {
  const c = SPORTS[sport].color;
  return {
    foil: [`color-mix(in srgb, ${c} 45%, #fff)`, c, `color-mix(in srgb, ${c} 45%, #000)`, `color-mix(in srgb, ${c} 70%, #fff)`, `color-mix(in srgb, ${c} 75%, #000)`],
    ink: '#ffffff',
    ribbon: '#ffffff',
    ribbonInk: '#0d1422',
    burst: '#0d1422',
    burstInk: '#ffffff',
    rays: 'rgba(255, 255, 255, 0.3)',
  };
}

/** Star en photo sur chaque sachet. */
const HEROES: Record<Exclude<Tone, 'sport'>, string> = {
  bronze: 'mbappe',
  silver: 'wembanyama',
  gold: 'lebron',
  violet: 'duplantis',
  icon: 'pele',
  prime: 'bolt',
  black: 'cristiano-ronaldo',
};

/** Pour un pack de sport : l'athlète le plus célèbre du sport qui a une photo. */
function sportHero(sport: SportId): string | undefined {
  return ATHLETES.filter((a) => a.sport === sport && photoCredit(a.id))
    .sort((a, b) => b.fame - a.fame)[0]?.id;
}

// Soudures crantées (zigzag) du haut et du bas.
const CRIMP_TOP = Array.from({ length: 13 }, (_, i) => `L${6 + i * 9 + 4.5},${i % 2 ? 3 : 0}`).join(' ');
const CRIMP_BOTTOM = Array.from({ length: 13 }, (_, i) => `L${114 - i * 9 - 4.5},${i % 2 ? 167 : 170}`).join(' ');
const PACK_PATH = `M6,3 ${CRIMP_TOP} L114,3 L115,12 L116.5,85 L115,158 L114,167 ${CRIMP_BOTTOM} L6,167 L5,158 L3.5,85 L5,12 Z`;

// Plis de la feuille : lignes brisées tirées d'une suite pseudo-aléatoire fixe (même rendu partout).
function crinkles(): string[] {
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 22 }, () => {
    let x = rand() * 120;
    let y = 12 + rand() * 146;
    const angle = (rand() - 0.5) * 1.6 + (rand() > 0.5 ? 0.5 : -0.5);
    const points = [`${x.toFixed(1)},${y.toFixed(1)}`];
    for (let k = 0; k < 4; k++) {
      const step = 6 + rand() * 12;
      x += Math.cos(angle + (rand() - 0.5) * 0.9) * step;
      y += Math.sin(angle + (rand() - 0.5) * 0.9) * step;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return points.join(' ');
  });
}
const CRINKLES = crinkles();

// Rayons derrière la photo, centrés sur (60, 64).
const RAYS = Array.from({ length: 18 }, (_, i) => {
  const a = (i / 18) * Math.PI * 2;
  const b = a + Math.PI / 18;
  const r = 110;
  return `M60,64 L${(60 + Math.cos(a) * r).toFixed(1)},${(64 + Math.sin(a) * r).toFixed(1)} L${(60 + Math.cos(b) * r).toFixed(1)},${(64 + Math.sin(b) * r).toFixed(1)} Z`;
}).join(' ');

function shortName(name: string): string {
  return name.replace(/^Pack /, '').replace(/^Booster /, '');
}

function Hero({ athleteId, sport }: { athleteId?: string; sport?: SportId }) {
  const athlete = athleteId ? getAthlete(athleteId) : undefined;
  const photo = usePhoto(athlete ?? ATHLETES[0]);
  const [failed, setFailed] = useState(false);
  const show = athlete && photo.src && !failed;
  return (
    <div className="pack-art__hero">
      {show ? (
        <img src={photo.src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <div className="pack-art__hero-empty">{sport ? <SportIcon sport={sport} /> : <b>AC</b>}</div>
      )}
    </div>
  );
}

interface PackArtProps {
  tone: Tone;
  name: string;
  sport?: SportId;
  /** nombre de cartes (pastille étoilée) */
  size?: number;
  /** mention de garantie sous le bandeau, ex. « 1 Épique garantie » */
  guarantee?: string;
  className?: string;
}

export function PackArt({ tone, name, sport, size = 5, guarantee, className = '' }: PackArtProps) {
  const id = useId().replace(/:/g, '');
  const look = tone === 'sport' && sport ? sportLook(sport) : LOOKS[tone === 'sport' ? 'silver' : tone];
  const hero = tone === 'sport' ? (sport ? sportHero(sport) : undefined) : HEROES[tone];
  const title = shortName(name);
  const style = {
    '--pk-ink': look.ink,
    '--pk-ribbon': look.ribbon,
    '--pk-ribbon-ink': look.ribbonInk,
    '--pk-burst': look.burst,
    '--pk-burst-ink': look.burstInk,
    '--pk-title': `${Math.min(15, 150 / Math.max(title.length, 4))}cqw`,
  } as CSSProperties;

  return (
    <div className={`pack-art pack-art--${tone} ${className}`} style={style}>
      <svg viewBox="0 0 120 170" aria-hidden="true">
        <defs>
          <linearGradient id={`pf-${id}`} x1="0" y1="0" x2="1" y2="1">
            {look.foil.map((color, i) => (
              <stop key={i} offset={i / 4} style={{ stopColor: color }} />
            ))}
          </linearGradient>
          <linearGradient id={`pe-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.4" />
            <stop offset="0.12" stopColor="#000" stopOpacity="0" />
            <stop offset="0.88" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id={`ps-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`ph-${id}`} x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="#ff6fc0" stopOpacity="0.35" />
            <stop offset="0.25" stopColor="#ffe36b" stopOpacity="0.3" />
            <stop offset="0.5" stopColor="#6bffc4" stopOpacity="0.3" />
            <stop offset="0.75" stopColor="#6bc6ff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#c28bff" stopOpacity="0.35" />
          </linearGradient>
          <clipPath id={`pc-${id}`}>
            <path d={PACK_PATH} />
          </clipPath>
        </defs>

        <path d={PACK_PATH} fill={`url(#pf-${id})`} />
        <g clipPath={`url(#pc-${id})`}>
          {/* rayons derrière la star */}
          <path d={RAYS} fill={look.rays} />
          {/* reflets irisés de la feuille */}
          <rect x={0} y={0} width={120} height={170} fill={`url(#ph-${id})`} className="pack-art__holo" />
          {/* plis de la feuille : un trait clair et un trait sombre décalés */}
          <g fill="none" strokeLinejoin="round">
            {CRINKLES.map((points, i) => (
              <g key={i}>
                <polyline points={points} stroke="#fff" strokeOpacity={0.35} strokeWidth={0.5} />
                <polyline points={points} stroke="#000" strokeOpacity={0.14} strokeWidth={0.6} transform="translate(0.5 0.6)" />
              </g>
            ))}
          </g>
          {/* soudures nervurées en haut et en bas */}
          {[0, 158].map((y) => (
            <g key={y}>
              <rect x={0} y={y} width={120} height={12} fill="#000" opacity={0.18} />
              {Array.from({ length: 60 }, (_, i) => (
                <line key={i} x1={i * 2 + 1} y1={y} x2={i * 2 + 1} y2={y + 12} stroke="#fff" strokeOpacity={0.22} strokeWidth={0.5} />
              ))}
              <line x1={0} y1={y === 0 ? 12 : 158} x2={120} y2={y === 0 ? 12 : 158} stroke="#000" strokeOpacity={0.35} strokeWidth={0.6} />
            </g>
          ))}
          {/* ombre des bords pincés et reflet qui passe */}
          <rect x={0} y={0} width={120} height={170} fill={`url(#pe-${id})`} />
          <rect className="pack-art__shine" x={-60} y={-20} width={34} height={220} fill={`url(#ps-${id})`} transform="rotate(20)" />
        </g>
        <path d={PACK_PATH} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.8} />
      </svg>

      <div className="pack-art__logo">
        <Logo />
      </div>
      <div className="pack-art__series">Série 1 · 2026</div>

      <Hero athleteId={hero} sport={sport} />

      <div className="pack-art__ribbon">
        <span>{title}</span>
      </div>

      <div className="pack-art__burst">
        <b>{size}</b>
        <small>cartes</small>
      </div>

      {guarantee && <div className="pack-art__guarantee">{guarantee}</div>}
    </div>
  );
}
