import { ATHLETES } from '../data/athletes';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { Card } from '../components/Card';
import { Flag, FLAG_CODES } from '../components/Flag';
import { SportIcon } from '../components/SportIcon';
import { RARITIES, isIcon, rarityOf } from '../engine/cards';
import { FREE_PACK, SHOP_PACKS, sportPack } from '../engine/packs';
import { PackArt } from '../components/PackArt';
import { CardBack } from '../overlays/PackOpening';

// Page de contrôle visuel (#galerie) : un échantillon de cartes, les icônes de sport et tous les drapeaux.
const SAMPLE = ['messi', 'mbappe', 'cristiano-ronaldo', 'lebron', 'bolt', 'pele', 'federer', 'zidane', 'maradona', 'djokovic', 'jordan', 'nadal', 'duplantis', 'kante', 'collet', 'gasquet'];
// tennis de table, échecs, esport, et l'ordre des noms d'Asie de l'Est
const NEW_SPORTS = ['ma-long', 'felix-lebrun', 'waldner', 'carlsen', 'fischer', 'firouzja', 'faker', 'zywoo', 'daigo', 'yao', 'son', 'eileen-gu'];

export function Gallery() {
  const sample = SAMPLE.map((id) => ATHLETES.find((a) => a.id === id)!).filter(Boolean);
  // un athlète actuel par rareté (bronze → légende), pour comparer les matières
  const tiers = (['commune', 'peu-commune', 'rare', 'epique', 'legendaire'] as const)
    .map((id) => ATHLETES.find((a) => !isIcon(a) && rarityOf(a).id === id))
    .filter((a) => a !== undefined);
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
      <div style={{ width: 210, aspectRatio: '100 / 140' }}>
        <CardBack />
      </div>
      <section id="mythes" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {ATHLETES.filter((a) => a.mythe).map((a, i) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size={i < 6 ? 'lg' : 'sm'} />
        ))}
      </section>
      <section id="reverse" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {['duplantis', 'zaire-emery', 'keyonte-george', 'clevenot', 'monar'].map((id) => (
          <Card key={id} card={{ athleteId: id, variant: 'reverse' }} size="lg" />
        ))}
      </section>
      <section id="nouveaux" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {['keyonte-george', 'zaire-emery', 'duplantis', 'van-assche', 'le-garrec', 'doohan', 'jack-shore', 'rozner', 'monar', 'clevenot'].map((id) => (
          <Card key={id} card={{ athleteId: id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section id="boosters" style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {[FREE_PACK, ...SHOP_PACKS, sportPack('foot', SPORTS.foot.name), sportPack('tennis', SPORTS.tennis.name)].map((pack) => (
          <div key={pack.id} style={{ width: 190 }}>
            <PackArt
              tone={pack.tone}
              name={pack.name}
              sport={pack.sport}
              size={pack.size}
              guarantee={pack.guaranteed && (pack.guaranteed.prime ? '1 Prime garantie' : `1 ${RARITIES[pack.guaranteed.min].name} garantie`)}
            />
          </div>
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {tiers.map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="lg" />
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
