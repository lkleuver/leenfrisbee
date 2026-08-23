import { useEffect, useState } from 'react';
import { MapView } from './components/MapView';
import { loadPlaces } from './lib/load';
import { detectLang, readStoredLang, strings, type Lang } from './lib/i18n';
import type { Place, Visibility } from './lib/types';

interface Data {
  kastjes: Place[];
  clubs: Place[];
}

export default function App() {
  const [lang] = useState<Lang>(() => detectLang(readStoredLang(), navigator.language));
  const t = strings[lang];
  const [data, setData] = useState<Data | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [visible] = useState<Visibility>({ kastje: true, club: true });
  const [selected, setSelected] = useState<Place | null>(null);

  useEffect(() => {
    loadPlaces(import.meta.env.BASE_URL)
      .then(setData)
      .catch((err: unknown) => {
        console.error(err);
        setLoadError(true);
      });
  }, []);

  return (
    <div className="app">
      <aside className="panel">
        <h1>{t.title}</h1>
        {loadError && <p role="alert">{t.loadError}</p>}
        {mapError && <p role="alert">{t.mapError}</p>}
        {!data && !loadError && <p>{t.loading}</p>}
        {selected && <p>{selected.properties.naam}</p>}
      </aside>
      <MapView
        kastjes={data?.kastjes ?? []}
        clubs={data?.clubs ?? []}
        visible={visible}
        selected={selected}
        onSelect={setSelected}
        onError={() => setMapError(true)}
      />
    </div>
  );
}
