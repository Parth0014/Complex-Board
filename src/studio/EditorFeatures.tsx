import { EditTab } from './appearance/EditTab';
import { LayoutTab } from './appearance/LayoutTab';
import { LayersTab } from './appearance/LayersTab';
import { InspectorSections } from './appearance/InspectorSection';
import { NumberField } from './ui/NumberField';

// Canvas formatting and layer controls.
import { errorMessage } from './errors';
import { appearanceValue, type AppearanceField } from '../vision/appearance/controls';
import { capabilities } from '../vision/appearance/capabilities';
import { Button, IconButton } from './ui/Button';
import { ColorPicker } from './ColorPicker';

import { useId, useState } from 'react';
import type { EditorAdapter } from '../vision/contracts';
import type { BoardItem } from '../vision/document';

import { CloseIcon, SlidersIcon } from './icons';

export type EditorPanel = 'style' | 'layers' | null;

export function EditorFeatures({
  adapter,
  panel,
  setPanel,
  inline = false,
}: {
  adapter: EditorAdapter;
  panel: EditorPanel;
  inline?: boolean;
  setPanel: (panel: EditorPanel) => void;
}) {
  const [error, setError] = useState('');
  const [inspectorPage, setInspectorPage] = useState<'edit' | 'layout'>('edit');
  const inspectorId = useId();
  const runMedia = async (action: () => Promise<void>) => {
    setError('');
    try {
      await action();
    } catch (error) {
      setError(errorMessage(error));
    }
  };
  const item = adapter.history.document.items.find((item) => adapter.selectedIds.includes(item.id));
  const patch = (patch: Partial<BoardItem>) =>
    adapter.patchItems(adapter.selectedIds.map((id) => ({ id, patch })));

  const selected = adapter.history.document.items.filter((item) =>
    adapter.selectedIds.includes(item.id),
  );
  const allText = selected.every((entry) => entry.kind === 'text');
  const allAssets = selected.every((entry) => entry.kind === 'asset');
  const allDrawings = selected.every((entry) => entry.kind === 'drawing');
  const sharedFill = selected.every((entry) => entry.kind !== 'asset' && capabilities(entry)?.fill);
  const locked = selected.some((entry) => entry.locked);
  const sharedLayout = selected.some((entry) => entry.collageLayout);
  const selectionTitle =
    selected.length > 1
      ? `${selected.length} items`
      : item?.kind === 'text'
        ? 'Text'
        : item?.kind === 'asset'
          ? item.asset?.provider === 'curated-v1'
            ? 'Artwork'
            : 'Photo'
          : item?.kind === 'shape'
            ? 'Shape'
            : item?.kind === 'drawing'
              ? 'Drawing'
              : 'Style';
  const selectionMeta =
    selected.length > 1
      ? 'Edit shared properties or arrange the selection.'
      : item
        ? item.text || item.asset?.title || item.shape || 'Selected object'
        : 'Select an object on the board to see its properties.';
  type Field = keyof BoardItem | AppearanceField;
  const assetFields: Partial<Record<AppearanceField, keyof BoardItem>> = {
    'stroke.width': 'borderWidth',
    'stroke.color': 'borderColor',
    'stroke.style': 'borderStyle',
    'shadow.preset': 'shadow',
    'shadow.color': 'shadowColor',
    'shadow.opacity': 'shadowOpacity',
    'shadow.blur': 'shadowBlur',
    'shadow.offsetX': 'shadowOffsetX',
    'shadow.offsetY': 'shadowOffsetY',
    'silhouette.width': 'stickerWidth',
    'silhouette.color': 'stickerColor',
    opacity: 'opacity',
    effect: 'effect',
  };
  const isAppearance = (key: Field): key is AppearanceField =>
    key.includes('.') || ['opacity', 'effect', 'background'].includes(key);
  const read = (entry: BoardItem | undefined, key: Field): unknown => {
    if (!entry) return undefined;
    if (!isAppearance(key)) return entry[key];
    if (entry.kind !== 'asset') return appearanceValue(entry, key);
    const field = assetFields[key];
    if (!field) return undefined;
    if (entry[field] !== undefined) return entry[field];
    if (key === 'shadow.opacity') return 0.25;
    if (key === 'shadow.offsetX') return 3;
    if (key === 'shadow.offsetY') return 5;
    if (key === 'shadow.blur')
      return entry.shadow === 'soft' ? 20 : entry.shadow === 'medium' ? 10 : 0;
    return undefined;
  };
  const set = (key: Field, value: unknown) => {
    if (!isAppearance(key)) {
      patch({ [key]: value });
      return;
    }
    const ownGesture = !adapter.history.gestureActive;
    if (ownGesture) adapter.beginGesture();
    try {
      adapter.setAppearanceField(key, value);
      const assetField = assetFields[key];
      if (assetField)
        adapter.patchItems(
          selected
            .filter((entry) => entry.kind === 'asset')
            .map((entry) => ({
              id: entry.id,
              patch: {
                ...(key.startsWith('shadow.') &&
                key !== 'shadow.preset' &&
                (!entry.shadow || entry.shadow === 'none')
                  ? { shadow: 'soft' as const }
                  : {}),
                ...(key === 'shadow.preset'
                  ? {
                      shadowColor: undefined,
                      shadowOpacity: undefined,
                      shadowBlur: undefined,
                      shadowOffsetX: undefined,
                      shadowOffsetY: undefined,
                    }
                  : {}),
                [assetField]: value,
              },
            })),
        );
    } finally {
      if (ownGesture) adapter.endGesture();
    }
  };
  const mixed = (key: Field) => selected.some((other) => read(other, key) !== read(item, key));
  const number = (label: string, key: Field, min: number, max: number, step = 1) => {
    const scale = ['opacity', 'shadow.opacity', 'brightness', 'saturation'].includes(key) ? 100 : 1;
    const fallback = key === 'opacity' || key === 'lineHeight' ? 1 : key === 'fontWeight' ? 400 : 0;
    const value = mixed(key) ? undefined : Number(read(item, key) ?? fallback) * scale;
    return (
      <label className="vs-field">
        <span>{label}</span>
        <NumberField
          key={selected.map((entry) => entry.id).join(':') + key}
          unit={
            scale === 100
              ? '%'
              : key === 'fontSize'
                ? 'pt'
                : key === 'stroke.width'
                  ? 'px'
                  : undefined
          }
          label={label}
          value={value}
          min={min * scale}
          max={max * scale}
          step={Math.max(1, step * scale)}
          placeholder={mixed(key) ? 'Mixed' : undefined}
          disabled={
            ['rotation', 'width', 'height', 'x', 'y'].includes(key) &&
            (sharedLayout || selected.some((entry) => entry.locked || entry.connector))
          }
          onCommit={(next) => set(key, next / scale)}
          onBegin={() => adapter.beginGesture()}
          onEnd={() => adapter.endGesture()}
          onCancel={() => adapter.cancelGesture()}
        />
      </label>
    );
  };
  const color = (label: string, key: Field, fallback: string) => (
    <div className="vs-field">
      <span>
        {label}
        {mixed(key) && ' · Mixed'}
      </span>
      <span className="inspector-color-value">
        <ColorPicker
          label={label}
          value={String(read(item, key) || fallback)}
          onChange={(value) => set(key, value)}
        />
        <code>{String(read(item, key) || fallback).toUpperCase()}</code>
      </span>
    </div>
  );

  const tabProps = {
    adapter,
    selected,
    locked,
    sharedLayout,
    allText,
    allAssets,
    allDrawings,
    sharedFill,
    read,
    set,
    mixed,
    number,
    color,
    patch,
    runMedia,
  };
  return (
    <InspectorSections
      owner={adapter.ownerWindow}
      kind={selected.length > 1 ? 'mixed' : item?.kind || 'none'}
    >
      <div
        role="group"
        className={`vs-inspector object-inspector${inline ? ' vs-inspector--inline' : ''}${panel ? '' : ' is-collapsed'}`}
        aria-label="Object inspector"
        hidden={!panel}
      >
        <header className="object-inspector-header">
          <div>
            <h2>{panel === 'layers' ? 'Layers' : selectionTitle}</h2>
            <p>{selectionMeta}</p>
          </div>
          <IconButton aria-label="Close editor panel" onClick={() => setPanel(null)}>
            <CloseIcon />
          </IconButton>
        </header>
        <div className="object-inspector-tabs" role="tablist" aria-label="Object tools">
          {(['edit', 'layout', 'layers'] as const).map((id, index) => (
            <Button
              key={id}
              role="tab"
              id={`${inspectorId}-${id}`}
              aria-controls={`${inspectorId}-panel`}
              aria-selected={
                id === 'layers' ? panel === 'layers' : panel === 'style' && inspectorPage === id
              }
              tabIndex={
                (id === 'layers' ? panel === 'layers' : panel === 'style' && inspectorPage === id)
                  ? 0
                  : -1
              }
              onClick={() => {
                setPanel(id === 'layers' ? 'layers' : 'style');
                if (id !== 'layers') setInspectorPage(id);
              }}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const tabs = Array.from(
                  event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                    '[role="tab"]',
                  ),
                );
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? 2
                      : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                tabs[next].click();
                tabs[next].focus();
              }}
            >
              {id === 'edit' ? 'Edit' : id === 'layout' ? 'Layout' : 'Layers'}
            </Button>
          ))}
        </div>
        <div
          className="vs-inspector__body object-inspector-body"
          id={`${inspectorId}-panel`}
          role="tabpanel"
          aria-labelledby={`${inspectorId}-${panel === 'layers' ? 'layers' : inspectorPage}`}
        >
          {error && (
            <p className="vs-alert vs-alert--error" role="alert">
              {error}
            </p>
          )}

          {panel === 'style' && locked && (
            <div className="object-inspector-notice" role="status">
              Unlock the selection to edit its properties.
              <Button
                size="sm"
                onClick={() =>
                  adapter.patchItems(
                    selected.map((entry) => ({ id: entry.id, patch: { locked: false } })),
                  )
                }
              >
                Unlock selection
              </Button>
            </div>
          )}
          {panel === 'layers' && <LayersTab adapter={adapter} />}
          {(panel ?? 'style') === 'style' &&
            (!item ? (
              <div className="vs-inspector__empty">
                <span className="vs-empty__icon" aria-hidden="true">
                  <SlidersIcon />
                </span>
                <strong>Select an object</strong>
                <p>Choose an item on the canvas to edit it.</p>
              </div>
            ) : (
              <fieldset className="object-inspector-fields" disabled={locked}>
                {inspectorPage === 'edit' ? (
                  <EditTab {...tabProps} item={item} />
                ) : (
                  <LayoutTab {...tabProps} item={item} />
                )}
              </fieldset>
            ))}
        </div>
      </div>
    </InspectorSections>
  );
}
