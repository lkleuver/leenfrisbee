import type { Strings } from '../lib/i18n';
import { KINDS, type Kind, type Visibility } from '../lib/types';

interface Props {
  visible: Visibility;
  counts: Record<Kind, number>;
  onToggle: (kind: Kind) => void;
  t: Strings;
}

const LABEL: Record<Kind, keyof Pick<Strings, 'kastjes' | 'clubs'>> = { kastje: 'kastjes', club: 'clubs' };

export function LayerToggle({ visible, counts, onToggle, t }: Props) {
  return (
    <div className="tabs">
      {KINDS.map((kind) => (
        <button key={kind} type="button" className="tab" aria-pressed={visible[kind]} onClick={() => onToggle(kind)}>
          <span className={`mk mk--${kind}`} aria-hidden="true" />
          {t[LABEL[kind]]}
          {counts[kind] > 0 && (
            <span className="tab__count" aria-hidden="true">
              {counts[kind]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
