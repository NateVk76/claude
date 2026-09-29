import { ATHLETES } from '../data/athletes';
import { Card } from '../components/Card';
import { RARITIES, isIcon, rarityOf } from '../engine/cards';
import { FREE_PACK, SHOP_PACKS, sportPack } from '../engine/packs';
import { SPORTS } from '../data/sports';
import { PackArt } from '../components/PackArt';
import { CardBack } from '../overlays/PackOpening';
import { Flag, COUNTRY_NAMES } from '../components/Flag';

// Page de contrôle visuel (#galerie) : un échantillon de cartes et tous les drapeaux.
const SAMPLE = ['messi', 'mbappe', 'cristiano-ronaldo', 'lebron', 'bolt', 'pele', 'federer', 'zidane', 'maradona', 'djokovic', 'jordan', 'nadal', 'duplantis', 'kante', 'collet', 'gasquet'];

export function Gallery() {
  const sample = SAMPLE.map((id) => ATHLETES.find((a) => a.id === id)!).filter(Boolean);
  // un athlète actuel par rareté (bronze → légende), pour comparer les matières
  const tiers = (['commune', 'peu-commune', 'rare', 'epique', 'legendaire'] as const)
    .map((id) => ATHLETES.find((a) => !isIcon(a) && rarityOf(a).id === id))
    .filter((a) => a !== undefined);
  return (
    <div style={{ padding: 24, display: 'grid', gap: 32 }}>
      <div style={{ width: 210, aspectRatio: '100 / 140' }}>
        <CardBack />
      </div>
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
        {Object.keys(COUNTRY_NAMES).map((code) => (
          <figure key={code} style={{ margin: 0, width: 64, textAlign: 'center', fontSize: 10, color: '#9ba5bb' }}>
            <Flag code={code} className="gallery-flag" />
            {code}
          </figure>
        ))}
      </section>
    </div>
  );
}
