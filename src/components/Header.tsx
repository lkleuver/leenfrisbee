import type { Lang, Strings } from '../lib/i18n';

interface Props {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  t: Strings;
}

const LANGS: readonly Lang[] = ['nl', 'en'];

export function Header({ lang, onLangChange, t }: Props) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="disc" aria-hidden="true" />
        <div>
          <h1 className="header__title">{t.title}</h1>
          <p className="header__tagline">{t.tagline}</p>
        </div>
      </div>
      <div className="lang" role="group" aria-label={t.language}>
        {LANGS.map((l) => (
          <button key={l} type="button" className="lang__btn" aria-pressed={l === lang} onClick={() => onLangChange(l)}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
