import type { Strings } from '../lib/i18n';
import type { Place } from '../lib/types';

interface Props {
  places: Place[];
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (place: Place) => void;
  onClose: () => void;
  t: Strings;
}

export function SearchList({ places, query, onQueryChange, onPick, onClose, t }: Props) {
  return (
    <div className="list">
      <div className="list__search">
        <input
          type="search"
          role="searchbox"
          className="list__input"
          placeholder={t.search}
          aria-label={t.search}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <button type="button" className="btn btn--ghost mobile-only" onClick={onClose}>
          {t.close}
        </button>
      </div>
      <p className="list__count">{places.length === 0 ? t.noResults : t.results(places.length)}</p>
      <ul className="list__items">
        {places.map((p) => (
          <li key={`${p.properties.kind}-${p.properties.id}`}>
            <button type="button" className={`list__item list__item--${p.properties.kind}`} onClick={() => onPick(p)}>
              <span className="chip__dot" aria-hidden="true" />
              <span className="list__name">{p.properties.naam}</span>
              <span className="list__town">{p.properties.plaats}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
