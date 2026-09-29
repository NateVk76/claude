import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGame, formatBalles } from '../store/game';
import { useUi } from '../store/ui';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import { isIcon, overallOf, quickSellValue, rarityOf } from '../engine/cards';
import type { CardFace } from '../engine/types';
import { Card } from '../components/Card';
import { PackArt } from '../components/PackArt';
import { Logo } from '../components/Logo';
import { Flag, COUNTRY_NAMES } from '../components/Flag';
import { SportIcon } from '../components/SportIcon';
import { Confetti, type ConfettiHandle } from '../components/Confetti';
import { sfx } from '../audio/sfx';
import { usePhoto } from '../photos';

type Stage = 'pack' | 'tearing' | 'cards' | 'walkout' | 'summary';

const RARITY_GLOW: Record<string, string> = {
  commune: '#d19a6a',
  'peu-commune': '#dfe6ef',
  rare: '#f2c94c',
  epique: '#b98cff',
  legendaire: '#ffd76a',
};

function tierOf(card: CardFace): number {
  return rarityOf(ATHLETES_BY_ID[card.athleteId]).order;
}

function isSpecial(card: CardFace): boolean {
  return tierOf(card) >= 3 || card.variant === 'prime';
}

function glowOf(card: CardFace): string {
  if (card.variant === 'prime') return '#ff9ad5';
  return RARITY_GLOW[rarityOf(ATHLETES_BY_ID[card.athleteId]).id];
}

function confettiColors(card: CardFace): string[] {
  if (card.variant === 'prime') return ['#ff9ad5', '#ffe27a', '#8dffcf', '#8fd3ff', '#d9a2ff', '#ffffff'];
  if (tierOf(card) === 4) return ['#ffd76a', '#fff3c4', '#e0a93a', '#ffffff', '#ff9ad5', '#8fd3ff'];
  return ['#b98cff', '#e3d2ff', '#ffd66b', '#ffffff'];
}

export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`card-back ${className}`}>
      <div className="card-back__bg" />
      <div className="card-back__streak" />
      <div className="card-back__holo" />
      <div className="card-back__crest">
        <i className="card-back__mark" />
        <Logo />
      </div>
      <div className="card-back__frame" />
    </div>
  );
}

function Walkout({ card, onDone }: { card: CardFace; onDone: () => void }) {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const rarity = rarityOf(athlete);
  const [step, setStep] = useState(0);
  const confetti = useRef<ConfettiHandle>(null);
  const prime = card.variant === 'prime';
  const title = prime ? 'PRIME' : rarity.name.toUpperCase();
  const photo = usePhoto(athlete);
  const silhouette = photo.src && photo.cutout ? photo.src : null;
  // étapes : 0 drapeau, 1 sport, 2 note, (2.5 silhouette si photo détourée), 3 carte
  const [shadow, setShadow] = useState(false);

  useEffect(() => {
    if (step >= 3) return;
    if (step === 0) sfx.drumroll(silhouette ? 3.6 : 2.6);
    const id = window.setTimeout(
      () => {
        if (step === 2 && silhouette && !shadow) {
          setShadow(true);
          return;
        }
        setStep((s) => s + 1);
      },
      step === 0 ? 1100 : 950,
    );
    return () => window.clearTimeout(id);
  }, [step, silhouette, shadow]);

  useEffect(() => {
    if (!shadow) return;
    sfx.burst();
    const id = window.setTimeout(() => setStep(3), 1100);
    return () => window.clearTimeout(id);
  }, [shadow]);

  useEffect(() => {
    if (step === 3) {
      sfx.fanfare();
      confetti.current?.burst(confettiColors(card), rarity.order === 4 || prime ? 70 : 40);
    } else if (step > 0) {
      sfx.pulse();
    }
  }, [step, card, prime, rarity.order]);

  const skip = useCallback(() => {
    if (step < 3) setStep(3);
    else onDone();
  }, [step, onDone]);

  return (
    <div
      className={`walkout walkout--${prime ? 'prime' : rarity.id} walkout--step-${step}`}
      style={{ ['--beam' as string]: glowOf(card) }}
      role="dialog"
      aria-modal="true"
      aria-label={`Révélation ${title}`}
      onClick={skip}
    >
      <div className="walkout__beams" aria-hidden="true" />
      <div className="walkout__floor" aria-hidden="true" />
      {step < 3 && (
        <div className="walkout__clue" key={`${step}-${shadow}`}>
          {step === 0 && (
            <>
              <Flag code={athlete.country} className="walkout__flag" />
              <span className="walkout__label">{COUNTRY_NAMES[athlete.country]}</span>
            </>
          )}
          {step === 1 && (
            <>
              <SportIcon sport={athlete.sport} className="walkout__sport" />
              <span className="walkout__label">{SPORTS[athlete.sport].name}</span>
            </>
          )}
          {step === 2 && !shadow && (
            <>
              <span className="walkout__ovr">{overallOf(athlete, card.variant)}</span>
              <span className="walkout__label">{isIcon(athlete) ? 'Icône' : athlete.role}</span>
            </>
          )}
          {step === 2 && shadow && silhouette && <img className="walkout__silhouette" src={silhouette} alt="" />}
        </div>
      )}
      {step === 3 && (
        <div className="walkout__reveal">
          <p className="walkout__title" data-text={title}>
            {title}
          </p>
          <Card card={card} size="xl" tilt className="walkout__card" />
          <p className="walkout__name">
            {athlete.first} {athlete.last}
            {prime && athlete.prime && <span> · Prime {athlete.prime.year}</span>}
          </p>
          <button type="button" className="btn btn--primary" onClick={onDone}>
            Continuer
          </button>
        </div>
      )}
      {step < 3 && (
        <button
          type="button"
          className="walkout__skip"
          onClick={(event) => {
            event.stopPropagation();
            setStep(3);
          }}
        >
          Passer
        </button>
      )}
      <Confetti ref={confetti} />
    </div>
  );
}

export function PackOpening() {
  const opening = useGame((s) => s.opening);
  const close = useGame((s) => s.closeOpening);
  const quickSell = useGame((s) => s.quickSell);
  const freePacks = useGame((s) => s.freePacks);
  const openFreePack = useGame((s) => s.openFreePack);
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  const [stage, setStage] = useState<Stage>('pack');
  const [revealed, setRevealed] = useState(0);
  // carte affichée en grand (une seule à la fois) et sortie en cours vers la suivante
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [walkoutIndex, setWalkoutIndex] = useState<number | null>(null);
  const [soldDupes, setSoldDupes] = useState(false);
  const confetti = useRef<ConfettiHandle>(null);

  // nouvelle ouverture : on repart du sachet fermé
  useEffect(() => {
    if (opening) {
      setStage('pack');
      setRevealed(0);
      setCurrent(0);
      setLeaving(false);
      setWalkoutIndex(null);
      setSoldDupes(false);
    }
  }, [opening]);

  const cards = opening?.cards ?? [];
  const best = useMemo(() => cards[cards.length - 1], [cards]);

  const revealNext = useCallback(() => {
    if (!opening || revealed >= cards.length) return;
    const card = cards[revealed];
    if (isSpecial(card)) {
      setWalkoutIndex(revealed);
      setStage('walkout');
      return;
    }
    sfx.flip();
    window.setTimeout(() => sfx.reveal(tierOf(card)), 250);
    setRevealed((r) => r + 1);
  }, [opening, revealed, cards]);

  // un clic : retourne la carte affichée ; clic suivant : elle sort et la suivante entre
  const advance = useCallback(() => {
    if (stage !== 'cards' || leaving || !cards.length) return;
    if (revealed <= current) {
      revealNext();
      return;
    }
    if (current >= cards.length - 1) {
      setStage('summary');
      return;
    }
    setLeaving(true);
    sfx.deal();
    window.setTimeout(() => {
      setCurrent((c) => c + 1);
      setLeaving(false);
    }, 380);
  }, [stage, leaving, cards.length, revealed, current, revealNext]);

  const revealAll = useCallback(() => {
    // révèle tout jusqu'à la prochaine carte spéciale (qui a droit à sa mise en scène)
    let next = revealed;
    while (next < cards.length && !isSpecial(cards[next])) next += 1;
    if (next > revealed) {
      sfx.flip();
      sfx.reveal(tierOf(cards[next - 1]));
      setRevealed(next);
      setCurrent(next - 1);
    }
    if (next < cards.length) {
      window.setTimeout(
        () => {
          setCurrent(next);
          setWalkoutIndex(next);
          setStage('walkout');
        },
        next > revealed ? 600 : 0,
      );
    } else {
      window.setTimeout(() => setStage('summary'), 900);
    }
  }, [revealed, cards]);

  useEffect(() => {
    if (!opening) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stage === 'summary' && !useUi.getState().detail) close();
      const onButton = event.target instanceof HTMLElement && event.target.closest('button');
      if (stage === 'cards' && !onButton && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight')) {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opening, stage, close, advance]);

  if (!opening) return null;

  const tear = () => {
    if (stage !== 'pack') return;
    // la bande du haut glisse et s'efface, le sachet descend en fondu, puis les cartes apparaissent
    sfx.tear();
    setStage('tearing');
    window.setTimeout(() => sfx.burst(), 450);
    window.setTimeout(() => {
      setStage('cards');
      sfx.deal();
    }, 1100);
  };

  const dupes = cards.filter((c) => !c.isNew);
  const ownedDupes = dupes.filter((c) => collection.some((o) => o.uid === c.uid && !o.locked));
  const dupesValue = ownedDupes.reduce((sum, c) => sum + quickSellValue(ATHLETES_BY_ID[c.athleteId], c.variant), 0);
  const isFree = opening.packName === 'Booster gratuit';

  return (
    <div className={`opening opening--${stage}`} style={{ ['--teaser' as string]: best ? glowOf(best) : '#fff' }}>
      <div className="opening__backdrop" aria-hidden="true" />
      <div className="opening__rays" aria-hidden="true" />
      {(stage === 'pack' || stage === 'tearing') && (
        <div className="opening__stage">
          <button type="button" className="opening__pack" onClick={tear} aria-label={`Ouvrir le ${opening.packName}`}>
            {/* deux copies du sachet : le corps et la bande du haut, qui s'arrache à l'ouverture */}
            <span className="opening__pack-body">
              <PackArt tone={opening.tone} name={opening.packName} size={cards.length} />
            </span>
            <span className="opening__pack-top" aria-hidden="true">
              <PackArt tone={opening.tone} name={opening.packName} size={cards.length} />
            </span>
          </button>
          <div className="opening__flash" aria-hidden="true" />
          <p className="opening__hint">{stage === 'pack' ? 'Touche le pack pour l’ouvrir' : ''}</p>
        </div>
      )}

      {(stage === 'cards' || stage === 'walkout') && cards[current] && (
        <div className="opening__cards opening__cards--single">
          <p className="opening__progress">
            {opening.packName} · carte {current + 1} sur {cards.length}
          </p>

          {/* une seule carte, en grand : clic pour la retourner, puis pour passer à la suivante */}
          <div className="opening__spot">
            {(() => {
              const card = cards[current];
              const flipped = revealed > current;
              return (
                <div
                  key={card.uid}
                  className={`stage-card${flipped ? ' is-flipped' : ''}${leaving ? ' is-leaving' : ''}${!flipped && isSpecial(card) ? ' is-special' : ''}`}
                  style={{ ['--glow' as string]: glowOf(card) }}
                  onClick={advance}
                  role="button"
                  tabIndex={-1}
                  aria-label={flipped ? 'Carte suivante' : 'Retourner la carte'}
                >
                  <div className="flip__inner">
                    <div className="flip__back">
                      <CardBack />
                    </div>
                    <div className="flip__front">
                      <Card card={card} size="xl" />
                      {flipped && <span className={`tag ${card.isNew ? 'tag--new' : 'tag--dupe'}`}>{card.isNew ? 'Nouveau' : 'Doublon'}</span>}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <p className="opening__hint opening__hint--cards">
            {revealed <= current
              ? 'Touche la carte pour la retourner'
              : current < cards.length - 1
                ? 'Touche pour la carte suivante'
                : 'Touche pour voir le récapitulatif'}
          </p>

          {/* les cartes du paquet en miniature : révélées, en cours, à venir */}
          <div className="opening__tray" aria-hidden="true">
            {cards.map((card, i) => (
              <div key={card.uid} className={`tray-slot${i === current ? ' is-current' : ''}${i < revealed ? ' is-revealed' : ''}`}>
                {i < revealed ? <Card card={card} size="xs" /> : <CardBack />}
              </div>
            ))}
          </div>

          <div className="opening__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={advance} disabled={leaving}>
              {revealed <= current ? 'Retourner' : current < cards.length - 1 ? 'Suivante' : 'Récapitulatif'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={revealAll} disabled={revealed >= cards.length}>
              Tout révéler
            </button>
          </div>
        </div>
      )}

      {stage === 'walkout' && walkoutIndex !== null && (
        <Walkout
          card={cards[walkoutIndex]}
          onDone={() => {
            setRevealed(walkoutIndex + 1);
            setCurrent(walkoutIndex);
            setWalkoutIndex(null);
            setStage('cards');
          }}
        />
      )}

      {stage === 'summary' && (
        <div className="opening__summary" role="dialog" aria-modal="true" aria-labelledby="summary-heading">
          <h2 id="summary-heading">{opening.packName}</h2>
          <p className="muted">
            {cards.filter((c) => c.isNew).length} nouvelle{cards.filter((c) => c.isNew).length > 1 ? 's' : ''} carte
            {cards.filter((c) => c.isNew).length > 1 ? 's' : ''} · {dupes.length} doublon{dupes.length > 1 ? 's' : ''}
          </p>
          <div className="opening__grid">
            {cards.map((card) => (
              <div key={card.uid} className="opening__cell">
                <Card
                  card={card}
                  size="sm"
                  onClick={() => {
                    const owned = collection.find((c) => c.uid === card.uid);
                    if (owned) openDetail({ card: owned });
                  }}
                />
                <span className={`tag ${card.isNew ? 'tag--new' : 'tag--dupe'}`}>{card.isNew ? 'Nouveau' : 'Doublon'}</span>
              </div>
            ))}
          </div>
          <div className="opening__actions">
            {ownedDupes.length > 0 && !soldDupes && (
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => {
                  quickSell(ownedDupes.map((c) => c.uid));
                  setSoldDupes(true);
                }}
              >
                Vendre les doublons au club ({formatBalles(dupesValue)})
              </button>
            )}
            {isFree && freePacks > 0 && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  sfx.whoosh();
                  openFreePack();
                }}
              >
                Ouvrir le suivant ({freePacks})
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={close}>
              Terminer
            </button>
          </div>
        </div>
      )}
      <Confetti ref={confetti} />
    </div>
  );
}
