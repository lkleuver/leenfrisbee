import { useEffect, useMemo, useState } from 'react';
import { DetailPanel } from './components/DetailPanel';
import { Header } from './components/Header';
import { LayerToggle } from './components/LayerToggle';
import { MapView } from './components/MapView';
import { SearchList } from './components/SearchList';
import { formatDeeplink, parseDeeplink } from './lib/deeplink';
import { filterByQuery } from './lib/filter';
import { detectLang, readStoredLang, storeLang, strings, type Lang } from './lib/i18n';
import { loadPlaces } from './lib/load';
import type { Kind, Place, Visibility } from './lib/types';

interface Data {
  kastjes: Place[];
  clubs: Place[];
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => detectLang(readStoredLang(), navigator.language));
  const t = strings[lang];
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [visible, setVisible] = useState<Visibility>({ kastje: true, club: false });
  const [selected, setSelected] = useState<Place | null>(null);
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadPlaces(import.meta.env.BASE_URL)
      .then(setData)
      .catch((err: unknown) => {
        console.error(err);
        setLoadError(true);
        setSheetOpen(true);
      });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (!data) return;
    const link = parseDeeplink(window.location.hash);
    if (!link) return;
    const pool = link.kind === 'kastje' ? data.kastjes : data.clubs;
    const place = pool.find((p) => p.properties.id === link.id);
    if (!place) return;
    setSelected(place);
    setVisible((v) => (v[link.kind] ? v : { ...v, [link.kind]: true }));
  }, [data]);

  useEffect(() => {
    const hash = formatDeeplink(selected);
    history.replaceState(null, '', hash || window.location.pathname + window.location.search);
  }, [selected]);

  const listed = useMemo(() => {
    if (!data) return [];
    const all = [...(visible.kastje ? data.kastjes : []), ...(visible.club ? data.clubs : [])];
    return filterByQuery(all, query);
  }, [data, visible, query]);

  const changeLang = (l: Lang) => {
    setLang(l);
    storeLang(l);
  };
  const toggle = (kind: Kind) => {
    setVisible((v) => ({ ...v, [kind]: !v[kind] }));
    setSelected((s) => (s?.properties.kind === kind && visible[kind] ? null : s));
  };
  const pick = (p: Place) => {
    setSelected(p);
    setSheetOpen(false);
  };

  const panelOpen = sheetOpen || selected !== null;

  const linkedClub =
    (selected?.properties.club_id &&
      data?.clubs.find((c) => c.properties.id === selected.properties.club_id)) ||
    null;

  return (
    <div className="app">
      <div className="topbar">
        <Header lang={lang} onLangChange={changeLang} t={t} />
        <LayerToggle visible={visible} onToggle={toggle} t={t} />
      </div>

      <aside className={`panel${panelOpen ? ' panel--open' : ''}`}>
        {loadError && <p className="notice" role="alert">{t.loadError}</p>}
        {mapError && <p className="notice" role="alert">{t.mapError}</p>}
        {!data && !loadError && <p className="notice">{t.loading}</p>}
        {selected ? (
          <DetailPanel place={selected} club={linkedClub} lang={lang} t={t} onBack={() => setSelected(null)} onPickClub={pick} />
        ) : (
          <SearchList places={listed} query={query} onQueryChange={setQuery} onPick={pick} onClose={() => setSheetOpen(false)} t={t} />
        )}
      </aside>

      <main className="mapwrap">
        <MapView
          t={t}
          kastjes={data?.kastjes ?? []}
          clubs={data?.clubs ?? []}
          visible={visible}
          selected={selected}
          onSelect={setSelected}
          onError={() => {
            setMapError(true);
            setSheetOpen(true);
          }}
        />
      </main>

      {!panelOpen && (
        <button type="button" className="fab mobile-only" aria-label={t.search} onClick={() => setSheetOpen(true)}>
          🔍
        </button>
      )}
    </div>
  );
}
