import type { Strings } from '../lib/i18n';
import { KINDS, type Kind, type Visibility } from '../lib/types';

interface Props {
  visible: Visibility;
  onToggle: (kind: Kind) => void;
  t: Strings;
}

const LABEL: Record<Kind, keyof Pick<Strings, 'kastjes' | 'clubs'>> = { kastje: 'kastjes', club: 'clubs' };

export function LayerToggle({ visible, onToggle, t }: Props) {
  return (
    <div className="chips">
      {KINDS.map((kind) => (
        <button
          key={kind}
          type="button"
          className={`chip chip--${kind}`}
          aria-pressed={visible[kind]}
          onClick={() => onToggle(kind)}
        >
          <span className="chip__dot" aria-hidden="true" />
          {t[LABEL[kind]]}
        </button>
      ))}
    </div>
  );
}
