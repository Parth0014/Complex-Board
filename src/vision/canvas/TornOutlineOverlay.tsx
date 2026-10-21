import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Konva from 'konva';
import { Group, Line } from 'react-konva';
import type { BoardItem } from '../document';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import { TORN_SIDES, tornEdgePoint, tornOutlinePoints, type TornSide } from '../tornOutline';
import { canvasColors } from './colors';

export function TornOutlineOverlay({
  adapter,
  item,
  stage,
  left,
  top,
  scale,
}: {
  adapter: KonvaCanvasAdapter;
  item: BoardItem;
  stage: Konva.Stage;
  left: number;
  top: number;
  scale: number;
}) {
  const [, refresh] = useState(0);
  const dragging = useRef(false);
  useEffect(() => {
    const update = () => refresh((value) => value + 1);
    adapter.ownerWindow.addEventListener('scroll', update, true);
    adapter.ownerWindow.addEventListener('resize', update);
    return () => {
      adapter.ownerWindow.removeEventListener('scroll', update, true);
      adapter.ownerWindow.removeEventListener('resize', update);
      if (dragging.current) adapter.cancelGesture();
    };
  }, [adapter]);
  const outline = item.paperEdge?.outline;
  if (!outline || item.locked) return null;
  const rect = stage.getContent().getBoundingClientRect();
  const transform = new Konva.Transform()
    .translate(left + item.x * scale, top + item.y * scale)
    .rotate((item.rotation * Math.PI) / 180)
    .scale(scale, scale);
  const change = (side: TornSide, index: number, value: number) => {
    const current = adapter.history.document.items.find((entry) => entry.id === item.id);
    const edge = current?.paperEdge,
      shape = edge?.outline;
    if (!current || current.locked || !edge || !shape) return;
    const points = [...shape.points[side]];
    const limit = Math.min(0.4, Math.min(index / 4, 1 - index / 4) * 0.75);
    points[index] = Math.round(Math.max(0, Math.min(limit, value)) * 10000) / 10000;
    if (points[index] === shape.points[side][index]) return;
    adapter.patchItems([
      {
        id: item.id,
        patch: {
          paperEdge: {
            ...edge,
            outline: { ...shape, preset: 'custom', points: { ...shape.points, [side]: points } },
          },
        },
      },
    ]);
  };
  return (
    <>
      {createPortal(
        <>
          <div
            className="torn-outline-mobile-actions"
            role="toolbar"
            aria-label="Torn outline editing"
          >
            <span>Drag the edge handles</span>
            <button
              type="button"
              className="gs-button gs-button--primary gs-button--sm"
              onClick={() => adapter.finishTornOutline()}
            >
              Done editing outline
            </button>
          </div>
          {TORN_SIDES.filter((side) => outline.edges.includes(side)).flatMap((side) =>
            [1, 2, 3].map((index) => {
              const point = transform.point(
                tornEdgePoint(outline, side, index / 4, item.width, item.height),
              );
              return (
                <button
                  key={`${side}-${index}`}
                  type="button"
                  className="torn-outline-handle"
                  aria-label={`Tear ${side} bend ${index}`}
                  title="Drag to bend this edge. Use arrow keys for small changes."
                  style={{
                    left: rect.left + (point.x * rect.width) / stage.width(),
                    top: rect.top + (point.y * rect.height) / stage.height(),
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.currentTarget.focus();
                    event.currentTarget.setPointerCapture(event.pointerId);
                    dragging.current = true;
                    adapter.beginGesture();
                  }}
                  onPointerMove={(event) => {
                    if (
                      !dragging.current ||
                      !event.currentTarget.hasPointerCapture(event.pointerId)
                    )
                      return;
                    const local = transform
                      .copy()
                      .invert()
                      .point({
                        x: ((event.clientX - rect.left) * stage.width()) / rect.width,
                        y: ((event.clientY - rect.top) * stage.height()) / rect.height,
                      });
                    const value =
                      side === 'left'
                        ? local.x / item.width
                        : side === 'right'
                          ? 1 - local.x / item.width
                          : side === 'top'
                            ? local.y / item.height
                            : 1 - local.y / item.height;
                    change(side, index, value);
                  }}
                  onPointerUp={(event) => {
                    dragging.current = false;
                    if (event.currentTarget.hasPointerCapture(event.pointerId))
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    adapter.endGesture();
                  }}
                  onPointerCancel={() => {
                    dragging.current = false;
                    adapter.cancelGesture();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      adapter.finishTornOutline();
                      return;
                    }
                    const horizontal = side === 'left' || side === 'right';
                    const direction = horizontal
                      ? event.key === 'ArrowRight'
                        ? 1
                        : event.key === 'ArrowLeft'
                          ? -1
                          : 0
                      : event.key === 'ArrowDown'
                        ? 1
                        : event.key === 'ArrowUp'
                          ? -1
                          : 0;
                    if (!direction) return;
                    event.preventDefault();
                    event.stopPropagation();
                    adapter.beginGesture();
                    const value =
                      adapter.history.document.items.find((entry) => entry.id === item.id)
                        ?.paperEdge?.outline?.points[side][index] || 0;
                    change(
                      side,
                      index,
                      value +
                        direction *
                          (side === 'right' || side === 'bottom' ? -1 : 1) *
                          (event.shiftKey ? 0.04 : 0.01),
                    );
                  }}
                  onKeyUp={() => adapter.endGesture()}
                  onBlur={() => {
                    if (!dragging.current) adapter.endGesture();
                  }}
                />
              );
            }),
          )}
        </>,
        adapter.ownerWindow.document.body,
      )}
    </>
  );
}

export function TornOutlineGuide({
  adapter,
  item,
  left,
  top,
  scale,
}: {
  adapter: KonvaCanvasAdapter;
  item: BoardItem;
  left: number;
  top: number;
  scale: number;
}) {
  if (!item.paperEdge?.outline) return null;
  return (
    <Group
      name="torn-outline-guide"
      x={left + item.x * scale}
      y={top + item.y * scale}
      rotation={item.rotation}
      scaleX={scale}
      scaleY={scale}
      listening={false}
    >
      <Line
        points={tornOutlinePoints(item.paperEdge.outline, item.width, item.height, false)}
        closed
        stroke={canvasColors(adapter.ownerWindow.document).selection}
        strokeWidth={1.5 / scale}
        dash={[4 / scale, 4 / scale]}
      />
    </Group>
  );
}
