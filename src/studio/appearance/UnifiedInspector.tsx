import type { StudioAdapter } from '../../vision/contracts';
import { useState, type RefObject } from 'react';
import type { EditableItem } from '../../vision/appearance/types';
import { capabilities, primaryColor } from '../../vision/appearance/capabilities';
import { Button } from '../ui/Button';
import { applyControl, type InspectorArea } from './appearanceControls';
import { TechnicalControls } from './TechnicalControls';
import { CreativePalette } from './CreativePalette';
import { selectedAppearance } from './feature';
import { AppearanceSurface } from './AppearanceSurface';

export default function UnifiedInspector({
  adapter,
  onClose,
  trigger,
}: {
  adapter: StudioAdapter;
  onClose(): void;
  trigger: RefObject<HTMLButtonElement | null>;
}) {
  const item = selectedAppearance(adapter);
  if (!item) return null;
  return (
    <AppearanceSurface
      title={
        item.kind === 'text'
          ? 'Text'
          : item.kind === 'drawing'
            ? 'Drawing'
            : item.appearance.kind === 'open-shape'
              ? 'Line & arrow'
              : 'Shape'
      }
      ownerWindow={adapter.ownerWindow}
      onClose={onClose}
      trigger={trigger}
    >
      <InspectorBody key={item.id} adapter={adapter} item={item} />
    </AppearanceSurface>
  );
}

function InspectorBody({ adapter, item }: { adapter: StudioAdapter; item: EditableItem }) {
  const [area, setArea] = useState<InspectorArea>('color');
  const a = item.appearance;
  const cap = capabilities(item)!;
  const tabs: { id: InspectorArea; label: string }[] = [
    { id: 'color', label: cap.fill ? 'Fill & color' : 'Color' },
    { id: 'stroke', label: a.kind === 'text' ? 'Outline' : cap.fill ? 'Border' : 'Stroke' },
    ...(cap.shadow || cap.effects.length > 1 ? [{ id: 'effects' as const, label: 'Effects' }] : []),
  ];
  const paint = 'fill' in a ? a.fill.paint : undefined;
  return (
    <>
      <div className="gs-appearance-tabs" role="tablist" aria-label="Appearance sections">
        {tabs.map((tab, index) => (
          <Button
            key={tab.id}
            role="tab"
            id={`appearance-tab-${tab.id}`}
            aria-controls="appearance-properties"
            aria-selected={area === tab.id}
            tabIndex={area === tab.id ? 0 : -1}
            onClick={() => setArea(tab.id)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
              event.preventDefault();
              const next =
                tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
              setArea(next.id);
              adapter.ownerWindow.document.getElementById(`appearance-tab-${next.id}`)?.focus();
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div
        className="gs-appearance-body"
        id="appearance-properties"
        role="tabpanel"
        aria-labelledby={`appearance-tab-${area}`}
      >
        {item.locked && <p role="status">Unlock this object to edit its appearance.</p>}
        <fieldset disabled={!!item.locked} className="gs-appearance-fields">
          {area === 'color' && (
            <>
              {paint && (
                <div className="gs-paint-types" role="group" aria-label="Fill type">
                  {(['solid', 'linear', 'radial'] as const).map((kind) => (
                    <Button
                      key={kind}
                      aria-pressed={paint.kind === kind}
                      disabled={!cap.gradient && kind !== 'solid'}
                      onClick={() => applyControl(adapter, item.id, 'fillMode', kind)}
                    >
                      {kind === 'solid' ? 'Solid' : kind === 'linear' ? 'Linear' : 'Radial'}
                    </Button>
                  ))}
                </div>
              )}
              <h3>{cap.fill ? 'A color for your vision' : 'Stroke color'}</h3>
              <CreativePalette
                adapter={adapter}
                id={item.id}
                target={cap.fill ? 'fill.color' : 'stroke.color'}
                value={primaryColor(a)}
                label={cap.fill ? 'Fill' : 'Stroke'}
              />
              {a.kind === 'text' && (
                <p className="gs-appearance-note">
                  Character formatting stays in place. These colors set the object's defaults.
                </p>
              )}
              {a.kind === 'text' && a.background !== null && (
                <Button
                  className="gs-clear-background"
                  onClick={() => {
                    if (!item.locked)
                      adapter.changeAppearance({ property: 'background', value: null }, [item.id]);
                  }}
                >
                  Clear text background
                </Button>
              )}
            </>
          )}
          {area === 'effects' && (
            <>
              <h3>Finishing touches</h3>
              <div className="gs-effect-choices" role="group" aria-label="Appearance effect">
                {cap.effects.map((effect) => (
                  <Button
                    key={effect}
                    aria-pressed={a.effect === effect}
                    onClick={() => applyControl(adapter, item.id, 'effect', effect)}
                  >
                    {effect.charAt(0).toUpperCase() + effect.slice(1)}
                  </Button>
                ))}
              </div>
              <p className="gs-appearance-note">
                {a.shadow.enabled ? 'Shadow on' : 'No shadow'} · opacity{' '}
                {Math.round(a.opacity * 100)}%
              </p>
            </>
          )}
          <TechnicalControls
            key={`${area}:${paint?.kind ?? ''}`}
            adapter={adapter}
            id={item.id}
            area={area}
          />
        </fieldset>
      </div>
    </>
  );
}
