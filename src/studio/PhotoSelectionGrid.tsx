import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction, PointerEvent as ReactPointerEvent } from 'react';
import type { MediaRecord } from '../vision/media';
import { Button } from './ui/Button';
import { COLLAGE_MAX_PHOTOS } from '../vision/collagePresets';

type Gesture = {
  pointer: number;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  originX: number;
  originY: number;
  base: string[];
  remove: boolean;
  moved: boolean;
};
const LIMIT = COLLAGE_MAX_PHOTOS;

export function PhotoSelectionGrid({
  photos,
  selected,
  setSelected,
}: {
  photos: Array<{ record: MediaRecord; url: string }>;
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
}) {
  const grid = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const animation = useRef<number | undefined>(undefined);
  const [dragging, setDragging] = useState(false);
  const update = () => {
    const active = gesture.current,
      node = grid.current;
    if (!active || !node || !active.moved) return;
    const bounds = node.getBoundingClientRect();
    const x = Math.max(0, Math.min(node.clientWidth, active.clientX - bounds.left));
    const y = Math.max(0, Math.min(node.scrollHeight, active.clientY - bounds.top));
    const box = {
      left: Math.min(active.originX, x),
      top: Math.min(active.originY, y),
      width: Math.abs(x - active.originX),
      height: Math.abs(y - active.originY),
    };
    const hits = Array.from(node.querySelectorAll<HTMLElement>('[data-photo-id]'))
      .filter((tile) => {
        const tileBounds = tile.getBoundingClientRect();
        const left = tileBounds.left - bounds.left,
          top = tileBounds.top - bounds.top;
        return (
          left <= box.left + box.width &&
          left + tileBounds.width >= box.left &&
          top <= box.top + box.height &&
          top + tileBounds.height >= box.top
        );
      })
      .map((tile) => tile.dataset.photoId!);
    const next = active.remove
      ? active.base.filter((id) => !hits.includes(id))
      : [...new Set([...active.base, ...hits])].slice(0, LIMIT);
    setSelected((old) =>
      old.length === next.length && old.every((id, i) => id === next[i]) ? old : next,
    );
  };
  const stop = (cancel = false) => {
    const active = gesture.current;
    gesture.current = null;
    if (cancel && active?.moved) setSelected(active.base);
    setDragging(false);
    const node = grid.current,
      win = node?.ownerDocument.defaultView;
    if (animation.current !== undefined) win?.cancelAnimationFrame(animation.current);
    animation.current = undefined;
    if (active && node?.hasPointerCapture(active.pointer))
      node.releasePointerCapture(active.pointer);
  };
  const scroll = () => {
    const node = grid.current,
      active = gesture.current;
    const win = node?.ownerDocument.defaultView;
    if (!node || !active?.moved || !win) return;
    const body = node.closest<HTMLElement>('.scrapbook-dialog-body');
    if (body) {
      const bounds = body.getBoundingClientRect();
      const edge = 40;
      const dy =
        active.clientY < bounds.top + edge
          ? -Math.min(18, (bounds.top + edge - active.clientY) / 3)
          : active.clientY > bounds.bottom - edge
            ? Math.min(18, (active.clientY - bounds.bottom + edge) / 3)
            : 0;
      if (dy && active.clientX >= bounds.left && active.clientX <= bounds.right) {
        const previous = body.scrollTop;
        body.scrollTop += dy;
        if (body.scrollTop !== previous) update();
      }
    }
    animation.current = win.requestAnimationFrame(scroll);
  };
  useEffect(() => {
    const node = grid.current,
      owner = node?.ownerDocument;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && gesture.current?.moved) {
        event.preventDefault();
        event.stopPropagation();
        const active = gesture.current;
        gesture.current = null;
        setSelected(active.base);
        setDragging(false);
        if (animation.current !== undefined)
          owner?.defaultView?.cancelAnimationFrame(animation.current);
        animation.current = undefined;
        if (node?.hasPointerCapture(active.pointer)) node.releasePointerCapture(active.pointer);
      }
    };
    owner?.addEventListener('keydown', key, true);
    return () => {
      owner?.removeEventListener('keydown', key, true);
      if (animation.current !== undefined)
        owner?.defaultView?.cancelAnimationFrame(animation.current);
    };
  }, [setSelected]);
  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    suppressClick.current = false;
    if (event.button !== 0 || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const tile = (event.target as HTMLElement).closest<HTMLElement>('[data-photo-id]');
    gesture.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      originX: event.clientX - bounds.left,
      originY: event.clientY - bounds.top,
      base: [...selected],
      remove: !!tile && selected.includes(tile.dataset.photoId!),
      moved: false,
    };
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const active = gesture.current;
    if (!active || event.pointerId !== active.pointer) return;
    active.clientX = event.clientX;
    active.clientY = event.clientY;
    if (
      !active.moved &&
      Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 5
    )
      return;
    event.preventDefault();
    if (!active.moved) {
      active.moved = true;
      setDragging(true);
      suppressClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      animation.current =
        event.currentTarget.ownerDocument.defaultView?.requestAnimationFrame(scroll);
    }
    update();
  };
  return (
    <>
      <div className="scrapbook-selection-tools">
        <p className="scrapbook-help">
          <span className="scrapbook-pointer-help">
            Choose 5 to 10 photos. Click or drag across photos to select. Drag from a selected photo
            to clear an area.
          </span>
          <span className="scrapbook-touch-help">
            Choose 5 to 10 photos. Tap photos to select, or use the button to select several at
            once.
          </span>
        </p>
        <div className="scrapbook-selection-actions">
          <Button
            disabled={!photos.length || selected.length === Math.min(LIMIT, photos.length)}
            onClick={() => setSelected(photos.slice(0, LIMIT).map((p) => p.record.id))}
          >
            {photos.length > LIMIT ? 'Select first 10' : 'Select all'}
          </Button>
          <Button disabled={!selected.length} onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      </div>
      <div
        ref={grid}
        className="photo-layout-selection scrapbook-photo-selection"
        role="group"
        aria-label="Choose photos"
        data-drag-selecting={dragging}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={(event) => {
          if (gesture.current?.pointer === event.pointerId) {
            update();
            stop();
          }
        }}
        onPointerCancel={() => stop(true)}
        onLostPointerCapture={() => {
          if (gesture.current?.moved) stop(true);
        }}
        onClickCapture={(event) => {
          if (suppressClick.current && event.detail > 0) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        {photos.map((p) => (
          <Button
            key={p.record.id}
            data-photo-id={p.record.id}
            aria-label={`Use ${p.record.name}`}
            aria-pressed={selected.includes(p.record.id)}
            aria-disabled={!selected.includes(p.record.id) && selected.length >= LIMIT}
            onClick={() =>
              setSelected((old) =>
                old.includes(p.record.id)
                  ? old.filter((id) => id !== p.record.id)
                  : old.length < LIMIT
                    ? [...old, p.record.id]
                    : old,
              )
            }
          >
            <img src={p.url} alt="" loading="lazy" draggable={false} />
            {selected.includes(p.record.id) && (
              <span className="photo-layout-photo-number">{selected.indexOf(p.record.id) + 1}</span>
            )}
          </Button>
        ))}
      </div>
      <p className="scrapbook-selection-status" role="status" aria-live="polite">
        {selected.length} {selected.length === 1 ? 'photo' : 'photos'} selected
        {selected.length === LIMIT ? ' · Maximum 10 photos' : ''}
      </p>
    </>
  );
}
