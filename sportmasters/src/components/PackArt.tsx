import type { CSSProperties } from 'react';
import type { PackDef } from '../engine/packs';
import type { SportId } from '../engine/types';
import { SPORTS } from '../data/sports';
import { Logo } from './Logo';

// Booster au style « graphique sportswear » : fond uni profond avec trame de points et bandes
// diagonales, trois cartes en éventail (la dernière inclinée comme dans le logo), nombre de cartes
// en grand chiffre détouré et nom du pack en italique. 1 cqw = 1 % de la largeur du sachet.

type Tone = PackDef['tone'];

/** c1 : fond, c2 : bande et carte du milieu, c3 : liseré, chiffre et accents. */
const COLORS: Record<Exclude<Tone, 'sport'>, [string, string, string]> = {
  bronze: ['#0b5a31', '#27c26c', '#c6f36b'],
  silver: ['#1d2835', '#8fa6be', '#eef4fa'],
  gold: ['#3a2702', '#e0a82e', '#ffe08a'],
  violet: ['#2e1591', '#a84dff', '#ff6fd0'],
  icon: ['#4f1313', '#c9a24a', '#f3e2b8'],
  prime: ['#121118', '#ff4fa3', '#4fd6ff'],
  black: ['#140d03', '#d9a441', '#fff1b8'],
};

function colorsOf(tone: Tone, sport?: SportId): [string, string, string] {
  if (tone !== 'sport') return COLORS[tone];
  const c = sport ? SPORTS[sport].color : '#27c26c';
  return [`color-mix(in srgb, ${c} 38%, #050807)`, c, `color-mix(in srgb, ${c} 45%, #fff)`];
}

// Contour du sachet : bords crantés en haut et en bas.
const TEETH = 16;
const CRIMP = `polygon(${[
  ...Array.from({ length: TEETH + 1 }, (_, i) => `${(i / TEETH) * 100}% ${i % 2 ? 1.6 : 0}%`),
  ...Array.from({ length: TEETH + 1 }, (_, i) => `${100 - (i / TEETH) * 100}% ${i % 2 ? 98.4 : 100}%`),
].join(', ')})`;

interface PackArtProps {
  tone: Tone;
  name: string;
  sport?: SportId;
  /** nombre de cartes (grand chiffre détouré) */
  size?: number;
  /** mention sous le nom, ex. « 1 Épique garantie » ; sinon le nombre de cartes */
  guarantee?: string;
  className?: string;
}

export function PackArt({ tone, name, sport, size = 5, guarantee, className = '' }: PackArtProps) {
  const [c1, c2, c3] = colorsOf(tone, sport);
  const title = name.replace(/^Pack /, '').replace(/^Booster /, '');
  const style = {
    '--c1': c1,
    '--c2': c2,
    '--c3': c3,
    '--pk-title': `${Math.min(19, 125 / Math.max(title.length, 5))}cqw`,
  } as CSSProperties;

  return (
    <div className={`pack-art pack-art--${tone} ${className}`} style={style}>
      <div className="pack-art__sachet" style={{ clipPath: CRIMP }}>
        <div className="pack-art__bg" />
        <div className="pack-art__streak" />
        <div className="pack-art__big" aria-hidden="true">
          {String(size).padStart(2, '0')}
        </div>
        <div className="pack-art__emblem" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="pack-art__logo">
          <Logo />
        </div>
        <div className="pack-art__series">Série 1 · 2026</div>
        <div className="pack-art__name">{title}</div>
        <div className="pack-art__line">
          <span>{guarantee ?? `${size} cartes`}</span>
        </div>
        <div className="pack-art__seal pack-art__seal--top" />
        <div className="pack-art__seal pack-art__seal--bottom" />
        <div className="pack-art__shine" />
      </div>
    </div>
  );
}
