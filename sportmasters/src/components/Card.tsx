import { memo, useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Athlete, CardFace, MytheKind, OwnedCard, RarityId, StatKey, Stats } from '../engine/types';
import { getAthlete, isIcon, overallOf, rarityOf } from '../engine/cards';
import { SPORTS, STAT_KEYS } from '../data/sports';
import { usePhoto } from '../photos';
import { Flag } from './Flag';
import { Bust } from './Bust';
import { SportIcon } from './SportIcon';

// Carte au style « cadre métal » : fond métallisé selon le palier (bronze, argent, or…),
// cadre sombre avec code de l'athlète en onglet, pastille de note, sport écrit à la verticale,
// photo dans une fenêtre, médaillon du sport, bandeau du nom et plaque du poste.
// 1em = largeur de la carte / 24. Le cadre est un SVG en 100 × 140 (proportions de la carte).

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const WIDTHS: Record<CardSize, number> = { xs: 104, sm: 140, md: 196, lg: 250, xl: 300 };

/** Nom du palier affiché au-dessus de la note. */
const TIERS: Record<RarityId, string> = {
  commune: 'Bronze',
  'peu-commune': 'Argent',
  rare: 'Or',
  epique: 'Épique',
  legendaire: 'Légende',
};

interface CardProps {
  card: CardFace | OwnedCard;
  size?: CardSize;
  /** inclinaison 3D + reflet qui suit le doigt / la souris */
  tilt?: boolean;
  /** carte non possédée (album) */
  locked?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

/** Les deux points forts de l'athlète (utilisé par les fiches et les écrans). */
export function topStats(stats: Stats): StatKey[] {
  return STAT_KEYS.slice()
    .sort((a, b) => stats[b] - stats[a] || STAT_KEYS.indexOf(a) - STAT_KEYS.indexOf(b))
    .slice(0, 2);
}

function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, '');
}

/** Code en 3 lettres de l'onglet : « DUP » pour Duplantis, « WZE » pour Warren Zaïre-Emery. */
export function athleteCode(athlete: Athlete): string {
  const parts = plain(athlete.last).split(/[\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const initials = parts.map((part) => part[0]).join('');
    return (plain(athlete.first).slice(0, 1) + initials).slice(-3);
  }
  const last = parts[0] ?? plain(athlete.first);
  return last.slice(0, 3);
}

function nameSize(name: string): number {
  return Math.min(2.05, 27 / Math.max(name.length, 1));
}

function formatRecord(cm: number): string {
  return `${Math.floor(cm / 100)},${String(cm % 100).padStart(2, '0')} m`;
}

/** Cadre sombre percé de deux fenêtres (photo et plaque du poste). */
const PANEL =
  'M6.8 2.6 H93.2 Q96.4 2.6 96.4 5.8 V133.8 Q96.4 137 93.2 137 H6.8 Q3.6 137 3.6 133.8 V5.8 Q3.6 2.6 6.8 2.6 Z';
const WINDOW =
  'M9.4 14 Q9.4 11.2 12.2 11.2 H21.5 C25.8 11.2 26.4 4.6 31 4.6 H91.6 Q94.2 4.6 94.2 7.2 V113.4 Q94.2 116 91.6 116 H12 Q9.4 116 9.4 113.4 Z';
const PLATE = 'M20 128.2 H92.4 Q94.2 128.2 94.2 130 V133 Q94.2 134.8 92.4 134.8 H20 Z';

function Frame() {
  return (
    <svg className="card__frame" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
      <path className="card__panel" d={`${PANEL} ${WINDOW} ${PLATE}`} fillRule="evenodd" />
      <path className="card__trim" d={PANEL} />
      <rect className="card__trim card__trim--thin" x="4.7" y="3.7" width="90.6" height="132.2" rx="2.4" />
      <path className="card__trim card__trim--window" d={WINDOW} />
      <rect className="card__trim card__trim--thin" x="25.5" y="117.6" width="68.7" height="9.2" rx="1.2" />
      <path className="card__trim" d={PLATE} />
      <g className="card__rail">
        <path d="M6.5 24 V36 M6.5 70 V81 M6.5 91 V105" />
        <path className="card__diamond" d="M6.5 83.2 L7.7 86 L6.5 88.8 L5.3 86 Z" />
      </g>
    </svg>
  );
}

export const Card = memo(function Card({ card, size = 'md', tilt = false, locked = false, onClick, className = '', style }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const athlete = getAthlete(card.athleteId);
  const variant = card.variant;
  const rarity = rarityOf(athlete);
  const icon = isIcon(athlete);
  const prime = variant === 'prime';
  const reverse = variant === 'reverse';
  const sport = SPORTS[athlete.sport];
  const width = WIDTHS[size];
  const tiny = size === 'xs';
  const compact = size === 'xs' || size === 'sm';
  const record = 'record' in card ? card.record : undefined;
  const photo = usePhoto(athlete);
  const showPhoto = !!photo.src && !photoFailed;
  const fullName = athlete.first && !compact ? `${athlete.first} ${athlete.last}` : athlete.last;
  const overall = overallOf(athlete, variant);
  const mythe = athlete.mythe;
  const tier = mythe ? 'Mythe' : prime ? 'Prime' : reverse ? 'Reverse' : icon ? 'Icône' : TIERS[rarity.id];
  // une carte Mythe affiche son bonus de match à la place de la note
  const rating = mythe ? `+${mythe.bonus.value}` : String(overall);
  const subtitle = [
    athlete.role,
    mythe ? mytheYear(mythe.kind, mythe.year) : '',
    record ? `Record ${formatRecord(record)}` : '',
    athlete.died ? `${athlete.born ?? ''}–${athlete.died}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  const handleMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!tilt || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * 20).toFixed(2)}deg`);
        el.dataset.active = 'true';
      });
    },
    [tilt],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.dataset.active = 'false';
  }, []);

  const classes = [
    'card',
    `card--${size}`,
    `r-${rarity.id}`,
    `s-${athlete.sport}`,
    icon ? 'is-icon' : '',
    prime ? 'is-prime' : '',
    reverse ? 'is-reverse' : '',
    athlete.mythe ? 'is-mythe' : '',
    compact ? 'is-compact' : '',
    tiny ? 'is-tiny' : '',
    locked ? 'is-locked' : '',
    tilt ? 'has-tilt' : '',
    onClick ? 'is-clickable' : '',
    showPhoto ? (photo.cutout ? 'has-cutout' : 'has-photo') : 'has-bust',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaLabel = athlete.mythe
    ? `${athlete.last}, carte Mythe, ${athlete.role}`
    : `${athlete.first} ${athlete.last}, ${rarity.name}${prime ? ' Prime' : ''}${reverse ? ' Reverse' : ''}${icon ? ', Icône' : ''}, note ${overall}`;

  return (
    <div
      ref={ref}
      className={classes}
      style={{ ['--card-w' as string]: `${width}px`, ['--sport' as string]: sport.color, ...style }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="card__body">
        <div className="card__bg" />

        <div className="card__window">
          <div className="card__scene" />
          <div className="card__player">
            {showPhoto ? (
              <img className="card__photo" src={photo.src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setPhotoFailed(true)} />
            ) : mythe ? (
              <span className="card__emblem">
                <SportIcon sport={athlete.sport} />
              </span>
            ) : (
              <Bust color={sport.color} num={athlete.num} className="card__bust" />
            )}
          </div>
        </div>

        <Frame />

        <div className="card__code metal-text">{athleteCode(athlete)}</div>

        <div className="card__badge">
          <span className="card__tier">
            <i>{tier}</i>
          </span>
          <span className="card__rating">
            <b className="metal-text">{rating}</b>
          </span>
        </div>

        {!tiny && <Flag code={athlete.country} className="card__flag" />}

        {!tiny && (
          <div className="card__sport" aria-hidden="true" style={{ fontSize: `${sport.name.length > 12 ? 0.62 : 0.8}em` }}>
            {sport.name}
          </div>
        )}

        <div className="card__medal" title={sport.name}>
          <span>
            <SportIcon sport={athlete.sport} />
          </span>
        </div>

        <div className="card__banner">
          <span className="card__name metal-text" style={{ fontSize: `${nameSize(fullName) * (compact ? 1.2 : 1)}em` }}>
            {fullName}
          </span>
        </div>

        {!tiny && (
          <div className="card__subtitle">
            <span>{subtitle}</span>
          </div>
        )}

        <div className="card__holo" aria-hidden="true" />
        <div className="card__shine" aria-hidden="true" />
      </div>
    </div>
  );
});

/** Libellé de l'année d'une carte Mythe selon son type. */
function mytheYear(kind: MytheKind, year: string): string {
  if (kind === 'club') return `Fondé en ${year}`;
  if (kind === 'competition') return `Depuis ${year}`;
  return year;
}
