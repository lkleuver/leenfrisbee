import type { Lang, Strings } from '../lib/i18n';
import type { Place } from '../lib/types';

interface Props {
  place: Place;
  lang: Lang;
  t: Strings;
  onBack: () => void;
}

const routeUrl = ([lon, lat]: number[]) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

export function DetailPanel({ place, lang, t, onBack }: Props) {
  const p = place.properties;
  const description = (lang === 'en' && p.omschrijving_en) || p.omschrijving;
  return (
    <article className="detail">
      <button type="button" className="btn btn--ghost" onClick={onBack}>
        ← {t.back}
      </button>
      <p className={`detail__kind detail__kind--${p.kind}`}>{p.kind === 'kastje' ? t.kastje : t.club}</p>
      <h2 className="detail__title">{p.naam}</h2>
      <p className="detail__town">
        {p.plaats}
        {p.adres ? ` · ${p.adres}` : ''}
      </p>
      {p.foto_url && <img className="detail__photo" src={p.foto_url} alt={p.naam} loading="lazy" />}
      {description && <p className="detail__text">{description}</p>}
      <div className="detail__actions">
        <a className="btn" href={routeUrl(place.geometry.coordinates)} target="_blank" rel="noopener noreferrer">
          {t.route}
        </a>
        {p.website && (
          <a className="btn btn--ghost" href={p.website} target="_blank" rel="noopener noreferrer">
            {t.website}
          </a>
        )}
      </div>
    </article>
  );
}
