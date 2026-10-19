import type { InspectorTabProps } from './InspectorTabProps';
import { InspectorSection as Sec } from './InspectorSection';
import { Button } from '../ui/Button';
import { NumberField } from '../ui/NumberField';

import {
  AlignIcon,
  FitIcon,
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignMiddleIcon,
  AlignBottomIcon,
  SlidersIcon,
} from '../icons';
export function LayoutTab({
  adapter,
  item,
  selected,
  locked,
  sharedLayout,
  patch,
}: InspectorTabProps) {
  return (
    <>
      {' '}
      {
        <Sec title="Alignment" open icon={<AlignIcon />}>
          {' '}
          <div className="object-inspector-alignment" role="group" aria-label="Align selection">
            {(
              [
                ['left', 'Left', AlignLeftIcon],
                ['center', 'Horizontal center', AlignCenterHIcon],
                ['right', 'Right', AlignRightIcon],
                ['top', 'Top', AlignTopIcon],
                ['middle', 'Vertical center', AlignMiddleIcon],
                ['bottom', 'Bottom', AlignBottomIcon],
              ] as const
            ).map(([alignment, label, Icon]) => (
              <Button
                key={alignment}
                disabled={sharedLayout || locked}
                aria-label={`Align ${alignment}`}
                data-tip={label}
                onClick={() => adapter.alignSelection(alignment)}
              >
                <Icon />
              </Button>
            ))}
          </div>
        </Sec>
      }
      {!item.connector && (
        <Sec title="Size" open icon={<FitIcon />}>
          <div className="vs-row-2">
            {(['width', 'height'] as const).map((key) => (
              <label className="vs-field" key={key}>
                <span>{key === 'width' ? 'Width' : 'Height'}</span>
                <NumberField
                  key={item.id + key}
                  min={10}
                  max={10000}
                  unit="px"
                  label={`Bounds ${key}`}
                  onBegin={() => adapter.beginGesture()}
                  onEnd={() => adapter.endGesture()}
                  onCancel={() => adapter.cancelGesture()}
                  disabled={!!item.locked || sharedLayout || selected.length !== 1}
                  value={item[key]}
                  onCommit={(value) =>
                    adapter.resizeObjectBounds(
                      item.id,
                      key === 'width' ? value : item.width,
                      key === 'height' ? value : item.height,
                    )
                  }
                />
              </label>
            ))}
          </div>
          <Button
            variant="secondary"
            disabled={
              locked ||
              sharedLayout ||
              selected.length !== 1 ||
              (item.kind !== 'text' && !item.contentSize)
            }
            onClick={() => adapter.fitObjectBounds(item.id)}
          >
            Reset bounds
          </Button>
        </Sec>
      )}
      {item.connector && (
        <Sec title="Connector" open={false} icon={<SlidersIcon />}>
          <p className="inspector-help">This arrow follows its connected objects.</p>
          <Button
            variant="secondary"
            className="inspector-centered"
            onClick={() => patch({ connector: undefined })}
          >
            Detach connector
          </Button>
        </Sec>
      )}
    </>
  );
}
