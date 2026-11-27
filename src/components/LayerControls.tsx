import type { LayerId, LayerVisibility } from '../domain/layers';
import { LAYER_LABEL } from '../domain/layers';

const ORDER: LayerId[] = ['base', 'saved', 'landmarks', 'verified'];

export function LayerControls({ visibility, counts, onToggle }: {
  visibility: LayerVisibility;
  counts: Partial<Record<LayerId, number>>;
  onToggle: (id: LayerId) => void;
}) {
  return (
    <fieldset className="layers">
      <legend>ชั้นข้อมูล</legend>
      {ORDER.map((id) => (
        <label key={id} className="layer-row">
          <input type="checkbox" checked={visibility[id]} onChange={() => onToggle(id)} />
          <span className={`swatch swatch-${id}`} aria-hidden />
          <span>{LAYER_LABEL[id]}</span>
          {counts[id] !== undefined && <span className="count">{counts[id]}</span>}
        </label>
      ))}
    </fieldset>
  );
}
