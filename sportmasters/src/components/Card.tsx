import { memo, useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Athlete, CardFace, OwnedCard, StatKey, Stats } from '../engine/types';
import { POSITION_CODES, getAthlete, isIcon, overallOf, rarityOf, statsOf } from '../engine/cards';
import { SPORTS, STAT_KEYS, STAT_LABELS } from '../data/sports';
import { usePhoto } from '../photos';
import { Flag } from './Flag';
import { Bust } from './Bust';
import { SportIcon } from './SportIcon';

// Carte au style « vignette » : photo de l'athlète en grand sur un fond métallisé,
// note et drapeau en haut à gauche, emblème du sport en haut à droite, surnom à la verticale,
// deux stats en pastilles et le nom dans un bandeau. 1em = largeur de la carte / 24.

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const WIDTHS: Record<CardSize, number> = { xs: 104, sm: 140, md: 196, lg: 250, xl: 300 };

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

/** Les deux points forts de l'athlète, affichés sur la carte. */
export function topStats(stats: Stats): StatKey[] {
  return STAT_KEYS.slice()
    .sort((a, b) => stats[b] - stats[a] || STAT_KEYS.indexOf(a) - STAT_KEYS.indexOf(b))
    .slice(0, 2);
}

/** Texte vertical : édition de la carte, sinon surnom, sinon rareté ou sport. */
function edition(athlete: Athlete, prime: boolean): string {
  if (prime) return athlete.prime ? `Prime ${athlete.prime.year}` : 'Prime';
  if (isIcon(athlete)) return 'Icône';
  if (athlete.nick && athlete.nick.length <= 14) return athlete.nick;
  const rarity = rarityOf(athlete);
  return rarity.order >= 2 ? rarity.name : SPORTS[athlete.sport].name;
}

function nameSize(name: string): number {
  if (name.length <= 10) return 1.55;
  if (name.length <= 14) return 1.3;
  if (name.length <= 18) return 1.1;
  if (name.length <= 22) return 0.95;
  return 0.82;
}

function formatRecord(cm: number): string {
  return `${Math.floor(cm / 100)},${String(cm % 100).padStart(2, '0')} m`;
}

export const Card = memo(function Card({ card, size = 'md', tilt = false, locked = false, onClick, className = '', style }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const athlete = getAthlete(card.athleteId);
  const variant = card.variant;
  const rarity = rarityOf(athlete);
  const stats = statsOf(athlete, variant);
  const icon = isIcon(athlete);
  const prime = variant === 'prime';
  const width = WIDTHS[size];
  const tiny = size === 'xs';
  const compact = size === 'xs' || size === 'sm';
  const record = 'record' in card ? card.record : undefined;
  const photo = usePhoto(athlete);
  const showPhoto = !!photo.src && !photoFailed;
  const fullName = athlete.first && !compact ? `${athlete.first} ${athlete.last}` : athlete.last;
  const label = edition(athlete, prime);

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
    icon ? 'is-icon' : '',
    prime ? 'is-prime' : '',
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

  const ariaLabel = `${athlete.first} ${athlete.last}, ${rarity.name}${prime ? ' Prime' : ''}${icon ? ', Icône' : ''}, note ${overallOf(athlete, variant)}`;

  return (
    <div
      ref={ref}
      className={classes}
      style={{ ['--card-w' as string]: `${width}px`, ['--sport' as string]: SPORTS[athlete.sport].color, ...style }}
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
        <div className="card__rings" />
        <div className="card__ghost" aria-hidden="true">
          {athlete.num ?? overallOf(athlete, variant)}
        </div>
        <div className="card__lines" />

        <div className="card__player">
          {showPhoto ? (
            <img className="card__photo" src={photo.src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setPhotoFailed(true)} />
          ) : (
            <Bust color={SPORTS[athlete.sport].color} num={athlete.num} className="card__bust" />
          )}
        </div>

        <div className="card__tile">
          <b className="card__ovr">{overallOf(athlete, variant)}</b>
          <span className="card__pos">{POSITION_CODES[athlete.archetype] ?? SPORTS[athlete.sport].short}</span>
        </div>
        <Flag code={athlete.country} className="card__flag" />
        <div className="card__crest" title={SPORTS[athlete.sport].name}>
          <SportIcon sport={athlete.sport} />
        </div>

        {!tiny && (
          <div className="card__vertical" aria-hidden="true" style={{ fontSize: `${label.length > 11 ? 1.75 : label.length > 8 ? 2.05 : 2.35}em` }}>
            {label}
          </div>
        )}

        {!tiny && (
          <div className="card__pills">
            {topStats(stats).map((key) => (
              <span key={key} className={`stat-pill stat-pill--${key}`} title={STAT_LABELS[key].name}>
                <small>{STAT_LABELS[key].short}</small>
                <b>{stats[key]}</b>
              </span>
            ))}
          </div>
        )}

        <div className="card__banner">
          <span className="card__name" style={{ fontSize: `${nameSize(fullName) * (compact ? 1.25 : 1)}em` }}>
            {fullName}
          </span>
          {record && !compact ? <span className="card__record">Record {formatRecord(record)}</span> : null}
          {athlete.died && !compact ? (
            <span className="card__record">
              {athlete.born}–{athlete.died}
            </span>
          ) : null}
        </div>
        <div className="card__mark" aria-hidden="true">
          <i className="card__gem" />
          {!compact && <span>SM</span>}
        </div>

        <div className="card__frame" />
        <div className="card__holo" aria-hidden="true" />
        <div className="card__shine" aria-hidden="true" />
      </div>
    </div>
  );
});
