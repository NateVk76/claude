import { memo, useCallback, useRef, type CSSProperties, type PointerEvent } from 'react';
import type { CardFace, OwnedCard } from '../engine/types';
import { POSITION_CODES, getAthlete, isIcon, overallOf, rarityOf, statsOf, ultiOf } from '../engine/cards';
import { SPORTS, STAT_LABELS } from '../data/sports';
import { Flag, COUNTRY_NAMES } from './Flag';
import { Pictogram, poseFor } from './Pictogram';
import { SportIcon } from './SportIcon';

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

const LEFT_STATS = ['vit', 'for', 'end'] as const;
const RIGHT_STATS = ['tec', 'int', 'aur'] as const;

function nameSize(name: string): number {
  if (name.length <= 8) return 2.15;
  if (name.length <= 11) return 1.85;
  if (name.length <= 14) return 1.55;
  if (name.length <= 17) return 1.3;
  return 1.12;
}

function formatRecord(cm: number): string {
  return `${Math.floor(cm / 100)},${String(cm % 100).padStart(2, '0')} m`;
}

export const Card = memo(function Card({ card, size = 'md', tilt = false, locked = false, onClick, className = '', style }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const athlete = getAthlete(card.athleteId);
  const variant = card.variant;
  const rarity = rarityOf(athlete);
  const stats = statsOf(athlete, variant);
  const ulti = ultiOf(athlete, variant);
  const icon = isIcon(athlete);
  const prime = variant === 'prime';
  const width = WIDTHS[size];
  const compact = size === 'xs' || size === 'sm';
  const record = 'record' in card ? card.record : undefined;

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
    locked ? 'is-locked' : '',
    tilt ? 'has-tilt' : '',
    onClick ? 'is-clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const label = `${athlete.first} ${athlete.last}, ${rarity.name}${prime ? ' Prime' : ''}${icon ? ', Icône' : ''}, note ${overallOf(athlete, variant)}`;

  return (
    <div
      ref={ref}
      className={classes}
      style={{ ['--card-w' as string]: `${width}px`, ...style }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={label}
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
        <div className="card__texture" />
        {athlete.num !== undefined && (
          <div className="card__watermark" aria-hidden="true">
            {athlete.num}
          </div>
        )}
        <div className="card__art">
          <Pictogram pose={poseFor(athlete)} className="card__picto" />
        </div>

        <div className="card__side">
          <div className="card__ovr">{overallOf(athlete, variant)}</div>
          <div className="card__pos">{POSITION_CODES[athlete.archetype] ?? SPORTS[athlete.sport].short}</div>
          <Flag code={athlete.country} className="card__flag" />
          <SportIcon sport={athlete.sport} className="card__sport" title={SPORTS[athlete.sport].name} />
        </div>

        {prime && (
          <div className="card__prime" aria-hidden="true">
            <span>PRIME</span>
            {athlete.prime && !compact && <small>{athlete.prime.year}</small>}
          </div>
        )}
        {icon && !prime && (
          <div className="card__iconmark" aria-hidden="true">
            ICÔNE
          </div>
        )}

        <div className="card__name" style={{ fontSize: `${nameSize(athlete.last) * (compact ? 1.12 : 1)}em` }}>
          {athlete.last}
        </div>
        {!compact && (
          <div className="card__sub">
            {athlete.died ? `${athlete.born} – ${athlete.died}` : record ? `Record ${formatRecord(record)}` : athlete.first || athlete.role}
          </div>
        )}

        {!compact && (
          <>
            <div className="card__stats">
              <div className="card__col">
                {LEFT_STATS.map((key) => (
                  <div key={key} className="card__stat">
                    <b>{stats[key]}</b>
                    <span>{STAT_LABELS[key].short}</span>
                  </div>
                ))}
              </div>
              <div className="card__sep" />
              <div className="card__col">
                {RIGHT_STATS.map((key) => (
                  <div key={key} className="card__stat">
                    <b>{stats[key]}</b>
                    <span>{STAT_LABELS[key].short}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className={`card__ulti${ulti.signature ? ' is-signature' : ''}`}>
              <svg viewBox="0 0 12 16" aria-hidden="true">
                <path d="M7,0 L1,9 H5.5 L4,16 L11,6 H6.5 Z" />
              </svg>
              <span>{ulti.name}</span>
            </div>
          </>
        )}
        <div className="card__gem" aria-hidden="true" />
        <div className="card__holo" aria-hidden="true" />
        <div className="card__shine" aria-hidden="true" />
      </div>
      <svg className="card__frame" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
        <path className="card__frame-outer" d={CARD_PATH} vectorEffect="non-scaling-stroke" />
        <path className="card__frame-inner" d={CARD_PATH} transform="translate(4.2 5.6) scale(0.916)" vectorEffect="non-scaling-stroke" />
      </svg>
      {locked && (
        <div className="card__lock">
          <span>{COUNTRY_NAMES[athlete.country] ?? ''}</span>
        </div>
      )}
    </div>
  );
});

// Silhouette de la carte (repère 100 × 140) : épaules biseautées, couronne centrale, pointe en bas.
export const CARD_PATH =
  'M0,11 Q0,5 7,4.5 L33,4.5 Q37,4.5 40,1.8 Q42,0 45,0 L55,0 Q58,0 60,1.8 Q63,4.5 67,4.5 L93,4.5 Q100,5 100,11 L100,121 Q100,127 94,129 L62,135.5 Q56,136.8 52.5,139.2 Q50,140.6 47.5,139.2 Q44,136.8 38,135.5 L6,129 Q0,127 0,121 Z';

/** Définition du clip SVG (à inclure une fois dans la page). */
export function CardClipDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <clipPath id="card-clip" clipPathUnits="objectBoundingBox">
          <path d={CARD_PATH} transform="scale(0.01 0.0071428571)" />
        </clipPath>
        <linearGradient id="gold-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff4c9" />
          <stop offset="0.3" stopColor="#d6a43a" />
          <stop offset="0.5" stopColor="#fff0b0" />
          <stop offset="0.72" stopColor="#b3831f" />
          <stop offset="1" stopColor="#ffe49c" />
        </linearGradient>
        <linearGradient id="prime-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7ac8" />
          <stop offset="0.22" stopColor="#ffe27a" />
          <stop offset="0.45" stopColor="#7dffc9" />
          <stop offset="0.68" stopColor="#7cc8ff" />
          <stop offset="0.86" stopColor="#d38bff" />
          <stop offset="1" stopColor="#ff7ac8" />
          <animateTransform attributeName="gradientTransform" type="rotate" from="0 0.5 0.5" to="360 0.5 0.5" dur="6s" repeatCount="indefinite" />
        </linearGradient>
      </defs>
    </svg>
  );
}
