import type { ReactNode } from 'react';
import type { CardFace } from '../engine/types';
import { getAthlete, isIcon, overallOf, rarityOf, statsOf, ultiOf } from '../engine/cards';
import { SPORTS, STAT_LABELS } from '../data/sports';
import { Flag, COUNTRY_NAMES } from './Flag';
import { topStats } from './Card';

// Fiche express d'une carte : nom, pays, sport, note, ses trois meilleures stats et l'ulti.
// Elle accompagne l'ouverture des boosters ; la fiche complète garde les six stats.

interface CardStatsProps {
  card: CardFace;
  /** action affichée en bas de la fiche (ex. ouvrir la fiche complète) */
  children?: ReactNode;
  className?: string;
}

export function CardStats({ card, children, className = '' }: CardStatsProps) {
  const athlete = getAthlete(card.athleteId);
  const rarity = rarityOf(athlete);
  const stats = statsOf(athlete, card.variant);
  const best = topStats(stats, 3);
  const ulti = ultiOf(athlete, card.variant);
  const prime = card.variant === 'prime';
  const overall = overallOf(athlete, card.variant);

  return (
    <section
      key={`${card.athleteId}-${card.variant}`}
      className={`card-stats card-stats--${prime ? 'prime' : rarity.id} ${className}`}
      aria-live="polite"
      aria-label={`${athlete.first} ${athlete.last}`.trim()}
    >
      <header className="card-stats__head">
        <div className="card-stats__who">
          <div className="card-stats__chips">
            <span className={`chip-rarity chip-rarity--${rarity.id}`}>{rarity.name}</span>
            {prime && <span className="chip-rarity chip-rarity--prime">Prime{athlete.prime ? ` ${athlete.prime.year}` : ''}</span>}
            {isIcon(athlete) && <span className="chip-rarity chip-rarity--icon">Icône</span>}
          </div>
          <h3 className="card-stats__name">
            {athlete.first} {athlete.last}
          </h3>
          <p className="card-stats__meta">
            <Flag code={athlete.country} className="card-stats__flag" />
            <span>
              {COUNTRY_NAMES[athlete.country]} · {SPORTS[athlete.sport].name} · {athlete.role}
            </span>
          </p>
        </div>
        <div className="card-stats__ovr">
          <b>{overall}</b>
          <span>Note</span>
        </div>
      </header>

      <ul className="card-stats__grid" aria-label="Ses trois meilleures stats">
        {best.map((key) => (
          <li key={key} className={`card-stats__stat card-stats__stat--${key}`} title={STAT_LABELS[key].desc}>
            <span className="card-stats__label">
              <span className="card-stats__long">{STAT_LABELS[key].name}</span>
              <span className="card-stats__short">{STAT_LABELS[key].short}</span>
            </span>
            <b>{stats[key]}</b>
            <span className="card-stats__track">
              <span style={{ width: `${stats[key]}%` }} />
            </span>
          </li>
        ))}
      </ul>

      <p className="card-stats__ulti">
        <span className="card-stats__ulti-label">{ulti.signature ? 'Ulti signature' : 'Ulti'}</span>
        <b>{ulti.name}</b>
        <small>{ulti.desc}</small>
      </p>
      {children}
    </section>
  );
}
