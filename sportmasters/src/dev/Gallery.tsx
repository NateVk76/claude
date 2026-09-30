import { ATHLETES } from '../data/athletes';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { Card } from '../components/Card';
import { Flag, FLAG_CODES } from '../components/Flag';
import { SportIcon } from '../components/SportIcon';

// Page de contrôle visuel (#galerie) : un échantillon de cartes, les icônes de sport et tous les drapeaux.
const SAMPLE = ['messi', 'mbappe', 'cristiano-ronaldo', 'lebron', 'bolt', 'pele', 'federer', 'zidane', 'maradona', 'djokovic', 'jordan', 'nadal', 'duplantis', 'kante', 'collet', 'gasquet'];
// tennis de table, échecs, esport, et l'ordre des noms d'Asie de l'Est
const NEW_SPORTS = ['ma-long', 'felix-lebrun', 'waldner', 'carlsen', 'fischer', 'firouzja', 'faker', 'zywoo', 'daigo', 'yao', 'son', 'eileen-gu'];

export function Gallery() {
  const sample = SAMPLE.map((id) => ATHLETES.find((a) => a.id === id)!).filter(Boolean);
  return (
    <div style={{ padding: 24, display: 'grid', gap: 32 }}>
      <style>{'.gallery-icons svg { width: 40px; height: 40px; }'}</style>
      <section className="gallery-icons" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {SPORT_ORDER.map((id) => (
          <figure key={id} style={{ margin: 0, width: 64, textAlign: 'center', fontSize: 10, color: SPORTS[id].color }}>
            <SportIcon sport={id} />
            <div>{SPORTS[id].short}</div>
          </figure>
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {NEW_SPORTS.map((id) => (
          <Card key={id} card={{ athleteId: id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <Card card={{ athleteId: 'messi', variant: 'base' }} size="lg" />
        <Card card={{ athleteId: 'mbappe', variant: 'base' }} size="lg" />
        <Card card={{ athleteId: 'pele', variant: 'base' }} size="lg" />
        <Card card={{ athleteId: 'lebron', variant: 'prime' }} size="lg" />
        <Card card={{ athleteId: 'duplantis', variant: 'base', record: 630 }} size="lg" />
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {sample.map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {sample.map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="sm" />
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {[...FLAG_CODES, 'PE', 'GB-XYZ'].map((code) => (
          <figure key={code} style={{ margin: 0, width: 64, textAlign: 'center', fontSize: 10, color: '#9ba5bb' }}>
            <Flag code={code} className="gallery-flag" />
            {code}
          </figure>
        ))}
      </section>
    </div>
  );
}
