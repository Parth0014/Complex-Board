import { PhotoSelectionGrid } from './PhotoSelectionGrid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { StudioAdapter } from '../vision/contracts';
import type { MediaRecord } from '../vision/media';
import { type CollagePresetId } from '../vision/photoCollages';
import {
  collageLayoutsForBoard,
  COLLAGE_LAYOUT_VERSION,
  COLLAGE_MIN_PHOTOS,
  COLLAGE_MAX_PHOTOS,
} from '../vision/collagePresets';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { CloseIcon, CheckIcon } from './icons';
import { errorMessage } from './errors';

type SavedSelection = {
  ids?: string[];
  key?: string;
  orders?: Record<string, string[]>;
  preset?: string;
};

// Keep the user's photo batch and its immutable previews across modal/sidebar remounts.
// Each board adapter owns its own session; closing a board allows it to be collected.
const arrangementSessions = new WeakMap<
  StudioAdapter,
  {
    ids: string[];
    key: string;
    previews?: Record<string, string>;
    orders?: Record<string, string[]>;
    pending?: Map<string, Promise<string>>;
  }
>();

export function PhotoLayoutBuilder({
  adapter,
  photos,
  onClose,
  initialIds,
}: {
  adapter: StudioAdapter;
  photos: Array<{ record: MediaRecord; url: string }>;
  onClose: () => void;
  initialIds?: string[];
}) {
  const { width, height } = adapter.history.document;
  const storageKey = `visbo-arrange:${new URL(adapter.ownerWindow.location.href).searchParams.get('board') || 'current'}`;
  const [savedSelection] = useState<SavedSelection>(() => {
    try {
      const saved = JSON.parse(adapter.ownerWindow.localStorage.getItem(storageKey) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      const ids: string[] = Array.isArray(saved.ids)
        ? saved.ids.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      const orders =
        saved.orders && typeof saved.orders === 'object'
          ? (Object.fromEntries(
              Object.entries(saved.orders).filter(
                ([, order]) =>
                  Array.isArray(order) &&
                  order.length === ids.length &&
                  new Set(order).size === ids.length &&
                  order.every((id) => ids.includes(id)),
              ),
            ) as Record<string, string[]>)
          : {};
      return {
        ids,
        orders,
        key: typeof saved.key === 'string' ? saved.key : undefined,
        preset: typeof saved.preset === 'string' ? saved.preset : undefined,
      };
    } catch {
      return {};
    }
  });
  const resolution = useMemo(() => ({ width, height }), [width, height]);
  const [selected, setSelected] = useState<string[]>(() => {
    const available = new Set(photos.map((photo) => photo.record.id));
    return [
      ...new Set(initialIds ?? arrangementSessions.get(adapter)?.ids ?? savedSelection.ids ?? []),
    ]
      .filter((id) => available.has(id))
      .slice(0, COLLAGE_MAX_PHOTOS);
  });
  const [step, setStep] = useState<'photos' | 'presets'>(
    !initialIds && selected.length >= COLLAGE_MIN_PHOTOS ? 'presets' : 'photos',
  );
  const knownPhotos = useRef(new Set(photos.map(({ record }) => record.id)));
  useEffect(() => {
    const available = new Set(photos.map(({ record }) => record.id));
    const added = [...available].filter((id) => !knownPhotos.current.has(id));
    knownPhotos.current = available;
    if (added.length)
      setSelected((current) =>
        [...new Set([...current.filter((id) => available.has(id)), ...added])].slice(
          0,
          COLLAGE_MAX_PHOTOS,
        ),
      );
  }, [photos]);
  const availablePresets = useMemo(
    () => collageLayoutsForBoard(resolution.width, resolution.height),
    [resolution],
  );
  const hasPresets = availablePresets.length > 0;
  const [preset, setPreset] = useState<CollagePresetId>(
    availablePresets.find((p) => p.id === savedSelection.preset)?.id || availablePresets[0]?.id,
  );
  const previewKey = JSON.stringify({
    version: COLLAGE_LAYOUT_VERSION,
    ids: selected,
    resolution,
    presets: availablePresets.map((preset) => preset.id),
  });
  const [previews, setPreviews] = useState<Record<string, string>>(() => {
    const saved = arrangementSessions.get(adapter);
    return saved?.key === previewKey ? saved.previews || {} : {};
  });
  const [previewing, setPreviewing] = useState(false);
  const [failedPreviews, setFailedPreviews] = useState<Record<string, string>>({});
  const [retry, setRetry] = useState(0);
  const [family, setFamily] = useState('All');
  const [orders, setOrders] = useState<Record<string, string[]>>(() =>
    arrangementSessions.get(adapter)?.key === previewKey
      ? arrangementSessions.get(adapter)?.orders || {}
      : savedSelection.key === previewKey
        ? savedSelection.orders || {}
        : {},
  );
  const [ordersKey, setOrdersKey] = useState(previewKey);
  const activeOrders = useMemo(
    () => (ordersKey === previewKey ? orders : {}),
    [ordersKey, previewKey, orders],
  );
  const [shuffling, setShuffling] = useState<string[]>([]);
  const activePreviewKey = useRef(previewKey);
  activePreviewKey.current = previewKey;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const applying = useRef(false);
  const idsKey = JSON.stringify(selected);
  useEffect(() => {
    const previous = arrangementSessions.get(adapter);
    arrangementSessions.set(adapter, {
      ids: JSON.parse(idsKey),
      key: previewKey,
      previews: previous?.key === previewKey ? previous.previews : undefined,
      orders: previous?.key === previewKey ? previous.orders : undefined,
      pending: previous?.key === previewKey ? previous.pending : undefined,
    });
  }, [adapter, idsKey, previewKey]);
  useEffect(() => {
    try {
      adapter.ownerWindow.localStorage.setItem(
        storageKey,
        JSON.stringify({
          ids: selected,
          key: previewKey,
          orders: activeOrders,
          preset,
        }),
      );
    } catch {
      // Storage can be unavailable; the in-memory session still works.
    }
  }, [adapter, storageKey, selected, previewKey, activeOrders, preset]);
  useEffect(() => {
    if (
      step !== 'presets' ||
      selected.length < COLLAGE_MIN_PHOTOS ||
      selected.length > COLLAGE_MAX_PHOTOS ||
      !availablePresets.length
    )
      return;
    const cached = arrangementSessions.get(adapter);
    if (
      cached?.key === previewKey &&
      availablePresets.every((option) => cached.previews?.[option.id])
    ) {
      setPreviews(cached.previews || {});
      setOrders(cached.orders || {});
      setOrdersKey(previewKey);
      setPreviewing(false);
      setError('');
      return;
    }
    let live = true;
    const session = cached?.key === previewKey ? cached : { ids: selected, key: previewKey };
    session.previews ||= {};
    session.orders ||= savedSelection.key === previewKey ? savedSelection.orders || {} : {};
    session.pending ||= new Map();
    arrangementSessions.set(adapter, session);
    setOrders(session.orders);
    setOrdersKey(previewKey);
    setShuffling([]);
    setPreviews({ ...session.previews });
    setFailedPreviews({});
    setError('');
    setPreviewing(true);
    const ids: string[] = JSON.parse(idsKey);
    let cursor = 0;
    const worker = async () => {
      while (live && cursor < availablePresets.length) {
        const option = availablePresets[cursor++];
        if (session.previews![option.id]) continue;
        let pending = session.pending!.get(option.id);
        if (!pending) {
          pending = Promise.resolve()
            .then(() =>
              adapter.previewPhotoArrangement(
                session.orders![option.id] || ids,
                option.id as CollagePresetId,
              ),
            )
            .then((preview) => {
              session.previews![option.id] = preview;
              return preview;
            })
            .finally(() => session.pending!.delete(option.id));
          session.pending!.set(option.id, pending);
        }
        try {
          const preview = await pending;
          if (live) setPreviews((old) => ({ ...old, [option.id]: preview }));
        } catch (e) {
          // One unavailable image must not stop the queue or discard ready work.
          if (live) setFailedPreviews((old) => ({ ...old, [option.id]: errorMessage(e) }));
        }
      }
    };
    void Promise.all([worker(), worker(), worker()])
      .then(() => {
        if (live) {
          setPreviews({ ...session.previews });
        }
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setPreviewing(false);
      });
    return () => {
      live = false;
    };
  }, [adapter, idsKey, previewKey, availablePresets, step, savedSelection, selected, retry]);
  const current = availablePresets.find((p) => p.id === preset) || availablePresets[0];
  const shuffle = async (id: CollagePresetId) => {
    if (busy || !previews[id] || shuffling.includes(id) || selected.length < 2) return;
    const previous = activeOrders[id] || selected;
    const next = [...previous];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    if (next.every((value, index) => value === previous[index])) {
      next.push(next.shift()!);
    }
    const key = previewKey;
    setShuffling((old) => [...old, id]);
    setError('');
    try {
      const preview = await adapter.previewPhotoArrangement(next, id);
      if (activePreviewKey.current !== key) return;
      setOrders((old) => ({ ...old, [id]: next }));
      setPreviews((old) => ({ ...old, [id]: preview }));
      const saved = arrangementSessions.get(adapter);
      if (saved?.key === key) {
        saved.orders = { ...saved.orders, [id]: next };
        saved.previews = { ...saved.previews, [id]: preview };
      }
    } catch (e) {
      if (activePreviewKey.current === key) setError(errorMessage(e));
    } finally {
      if (activePreviewKey.current === key)
        setShuffling((old) => old.filter((value) => value !== id));
    }
  };
  const apply = async () => {
    if (
      !current ||
      applying.current ||
      selected.length < COLLAGE_MIN_PHOTOS ||
      selected.length > COLLAGE_MAX_PHOTOS ||
      !previews[current.id]
    )
      return;
    applying.current = true;
    setBusy(true);
    setError('');
    try {
      await adapter.arrangePhotos(activeOrders[current.id] || selected, current.id);
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      applying.current = false;
      setBusy(false);
    }
  };
  return createPortal(
    <div className="vs vs-veil photo-layout-veil">
      <Dialog
        className={`vs-dialog photo-layout-dialog scrapbook-dialog${hasPresets ? '' : ' scrapbook-dialog--empty'}`}
        aria-label="Create photo collage"
        dismissible={!busy}
        onClose={() => {
          if (!applying.current) onClose();
        }}
      >
        <header className="photo-layout-header">
          <div>
            <p className="photo-layout-eyebrow">
              {!hasPresets
                ? 'Photo layouts'
                : step === 'photos'
                  ? '1 · Your photos'
                  : '2 · Your collages'}
            </p>
            <h2>
              {!hasPresets
                ? 'Create photo collage'
                : step === 'photos'
                  ? 'Select your photos'
                  : 'Choose a collage'}
            </h2>
          </div>
          <Button
            className="gs-icon-button"
            aria-label="Close photo arranger"
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </Button>
        </header>
        <div className="scrapbook-dialog-body">
          {!hasPresets ? (
            <p className="scrapbook-empty-message" role="status">
              No presets available for this board size.
            </p>
          ) : step === 'photos' ? (
            <>
              <PhotoSelectionGrid photos={photos} selected={selected} setSelected={setSelected} />
              {!photos.length && <p>No photos yet. Upload photos to begin.</p>}
            </>
          ) : (
            <>
              <div className="scrapbook-browser-tools">
                <div className="scrapbook-families" role="group" aria-label="Collage families">
                  {['All', 'Flow', 'Cut', 'Inlay'].map((name) => (
                    <Button
                      key={name}
                      aria-pressed={family === name}
                      onClick={() => setFamily(name)}
                    >
                      {name === 'Cut' ? 'Cuts' : name}
                    </Button>
                  ))}
                </div>
                <p className="scrapbook-help" role="status">
                  {previewing
                    ? `${Object.keys(previews).length} of ${availablePresets.length} previews ready`
                    : `${availablePresets.length} layouts · ${selected.length} photos`}
                </p>
              </div>
              <div className="scrapbook-preset-grid" role="group" aria-label="Photo collages">
                {availablePresets
                  .filter((option) => family === 'All' || option.family === family)
                  .map((option) => (
                    <div key={option.id} className="scrapbook-preset-card">
                      <Button
                        key={option.id}
                        className="scrapbook-preset"
                        aria-label={option.label}
                        aria-pressed={current?.id === option.id}
                        disabled={busy}
                        onClick={() => setPreset(option.id as CollagePresetId)}
                      >
                        <span
                          className="scrapbook-preset-art"
                          style={{
                            aspectRatio: `${option.resolution.width}/${option.resolution.height}`,
                          }}
                        >
                          {previews[option.id] ? (
                            <img
                              src={previews[option.id]}
                              alt={`${option.label} with your photos`}
                              draggable={false}
                              decoding="async"
                            />
                          ) : (
                            <span
                              className={`scrapbook-preview-placeholder${failedPreviews[option.id] ? '' : ' gs-skeleton'}`}
                            >
                              {failedPreviews[option.id]
                                ? 'Preview unavailable'
                                : 'Preparing preview…'}
                            </span>
                          )}
                        </span>
                        <span className="scrapbook-preset-caption">
                          <strong>{option.label}</strong>
                          {current?.id === option.id && <CheckIcon size={18} />}
                        </span>
                        <small>{option.description}</small>
                      </Button>
                      {failedPreviews[option.id] ? (
                        <Button
                          className="scrapbook-shuffle"
                          size="sm"
                          aria-label={`Retry ${option.label} preview`}
                          onClick={() => setRetry((value) => value + 1)}
                        >
                          Retry preview
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="scrapbook-shuffle"
                          aria-label={`Shuffle photos in ${option.label}`}
                          loading={shuffling.includes(option.id)}
                          disabled={busy || selected.length < 2 || !previews[option.id]}
                          onClick={() => void shuffle(option.id as CollagePresetId)}
                        >
                          Shuffle
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
        <footer className="photo-layout-footer">
          {!hasPresets ? (
            <Button onClick={onClose}>Close</Button>
          ) : (
            <>
              <div>
                {error ? (
                  <p className="panel-inline-error" role="alert">
                    {error}
                  </p>
                ) : (
                  <p>
                    {step === 'photos'
                      ? `${selected.length} ${selected.length === 1 ? 'photo' : 'photos'} selected`
                      : `${current?.label} · All photos stay editable`}
                  </p>
                )}
                {step === 'photos' && (
                  <span role="status">
                    {selected.length < COLLAGE_MIN_PHOTOS
                      ? `Choose ${COLLAGE_MIN_PHOTOS - selected.length} more to preview. `
                      : selected.length > COLLAGE_MAX_PHOTOS
                        ? `Remove ${selected.length - COLLAGE_MAX_PHOTOS} to preview. `
                        : ''}
                    These layouts are designed for 5–10 photos to keep every frame balanced.
                  </span>
                )}
              </div>
              <div className="scrapbook-footer-actions">
                {step === 'presets' && (
                  <Button disabled={busy} onClick={() => setStep('photos')}>
                    Back to photos
                  </Button>
                )}
                <Button
                  variant="primary"
                  loading={busy}
                  disabled={
                    selected.length < COLLAGE_MIN_PHOTOS ||
                    selected.length > COLLAGE_MAX_PHOTOS ||
                    (step === 'presets' &&
                      (shuffling.includes(current?.id || '') || !previews[current?.id || '']))
                  }
                  onClick={() => (step === 'photos' ? setStep('presets') : void apply())}
                >
                  {step === 'photos' ? 'Next' : 'Add to canvas'}
                </Button>
              </div>
            </>
          )}
        </footer>
      </Dialog>
    </div>,
    adapter.ownerWindow.document.body,
  );
}
