import { useEffect, type ReactNode } from 'react';
import { useGame, MAX_FREE_PACKS } from './store/game';
import { useUi, type Tab } from './store/ui';
import { useNow, formatDuration } from './hooks/useNow';
import { Balles } from './components/Balles';
import { Logo } from './components/Logo';
import { setMuted, sfx } from './audio/sfx';
import { HomeScreen } from './screens/Home';
import { CollectionScreen } from './screens/Collection';
import { MarketScreen } from './screens/Market';
import { MatchScreen } from './screens/Match';
import { ShopScreen } from './screens/Shop';
import { PackOpening } from './overlays/PackOpening';
import { CardDetail } from './overlays/CardDetail';
import { Toasts } from './components/Toasts';

const NAV: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  {
    id: 'boosters',
    label: 'Boosters',
    icon: <path d="M7,3 H17 L18,5 V19 L17,21 H7 L6,19 V5 Z M9,9 H15 M9,13 H15" />,
  },
  {
    id: 'collection',
    label: 'Collection',
    icon: <path d="M8,4 H18 A1,1 0 0 1 19,5 V17 M5,7 H15 A1,1 0 0 1 16,8 V20 A1,1 0 0 1 15,21 H5 A1,1 0 0 1 4,20 V8 A1,1 0 0 1 5,7 Z" />,
  },
  {
    id: 'mercato',
    label: 'Mercato',
    icon: <path d="M4,8 H18 M14,4 L18,8 L14,12 M20,16 H6 M10,12 L6,16 L10,20" />,
  },
  {
    id: 'matchs',
    label: 'Matchs',
    icon: <path d="M8,4 H16 V9 A4,4 0 0 1 8,9 Z M8,6 H5 A3,3 0 0 0 8,11 M16,6 H19 A3,3 0 0 1 16,11 M12,13 V17 M8,20 H16 M9,17 H15 V20 H9 Z" />,
  },
  {
    id: 'boutique',
    label: 'Boutique',
    icon: <path d="M5,8 H19 L18,20 H6 Z M9,8 V6 A3,3 0 0 1 15,6 V8" />,
  },
];

function Topbar() {
  const balles = useGame((s) => s.balles);
  const freePacks = useGame((s) => s.freePacks);
  const nextFreePackAt = useGame((s) => s.nextFreePackAt);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const setTab = useUi((s) => s.setTab);
  const now = useNow(1000);
  const full = freePacks >= MAX_FREE_PACKS;

  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setTab('boosters')} aria-label="Athleticards, retour aux boosters">
        <Logo className="brand__logo" decorative />
      </button>
      <div className="topbar__right">
        <button type="button" className="chip chip--packs" onClick={() => setTab('boosters')} title="Boosters gratuits disponibles">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7,3 H17 L18,5 V19 L17,21 H7 L6,19 V5 Z" />
          </svg>
          <b>{freePacks}</b>
          <span className="chip__timer">{full ? 'plein' : formatDuration(nextFreePackAt - now)}</span>
        </button>
        <Balles value={balles} className="chip chip--balles" />
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            toggleMute();
            if (muted) {
              setMuted(false);
              sfx.click();
            }
          }}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
          aria-pressed={!muted}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4,9 H8 L13,5 V19 L8,15 H4 Z" />
            {muted ? <path d="M17,9 L22,14 M22,9 L17,14" /> : <path d="M16.5,8.5 A5,5 0 0 1 16.5,15.5 M19,6 A8.5,8.5 0 0 1 19,18" />}
          </svg>
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const freePacks = useGame((s) => s.freePacks);
  const activeSales = useGame((s) => s.market.myListings.filter((l) => l.status !== 'active').length);
  return (
    <nav className="bottomnav" aria-label="Navigation principale">
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`bottomnav__item${tab === item.id ? ' is-active' : ''}`}
          onClick={() => {
            sfx.click();
            setTab(item.id);
          }}
          aria-current={tab === item.id ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {item.icon}
          </svg>
          <span>{item.label}</span>
          {item.id === 'boosters' && freePacks > 0 && <i className="badge">{freePacks}</i>}
          {item.id === 'mercato' && activeSales > 0 && <i className="badge badge--good">{activeSales}</i>}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const tab = useUi((s) => s.tab);
  const tick = useGame((s) => s.tick);
  const muted = useGame((s) => s.muted);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  // le marché et les boosters avancent en temps réel (et rattrapent le temps passé hors du jeu)
  useEffect(() => {
    tick();
    const id = window.setInterval(() => tick(), 4000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tick]);

  return (
    <div className="app">
      <Topbar />
      <main className="content" id="contenu">
        {tab === 'boosters' && <HomeScreen />}
        {tab === 'collection' && <CollectionScreen />}
        {tab === 'mercato' && <MarketScreen />}
        {tab === 'matchs' && <MatchScreen />}
        {tab === 'boutique' && <ShopScreen />}
      </main>
      <BottomNav />
      <CardDetail />
      <PackOpening />
      <Toasts />
    </div>
  );
}
