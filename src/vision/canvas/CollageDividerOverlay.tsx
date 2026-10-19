import { useEffect, useRef, useState } from 'react';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import type { Divider } from '../structuredDividers';
export function CollageDividerOverlay({
  adapter,
  left,
  top,
  scale,
  width,
  height,
}: {
  adapter: KonvaCanvasAdapter;
  left: number;
  top: number;
  scale: number;
  width: number;
  height: number;
}) {
  const base = adapter.collageAdjustment;
  const drag = useRef<{
    base: NonNullable<typeof base>;
    divider: Divider;
    x: number;
    y: number;
    pointer: number;
    target: SVGGElement;
  } | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [limited, setLimited] = useState(false);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (drag.current) {
        adapter.cancelGesture();
        drag.current = null;
        setActive(null);
      } else adapter.finishCollageAdjustment();
    };
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('keydown', escape, true);
      if (drag.current) {
        adapter.cancelGesture();
        drag.current = null;
      }
    };
  }, [adapter]);
  if (!base) return null;
  const bw = base.meta.width,
    bh = base.meta.height;
  const point = ([x, y]: number[]) => [left + x * bw * scale, top + y * bh * scale];
  const finish = (cancel = false) => {
    if (!drag.current) return;
    if (cancel) adapter.cancelGesture();
    else adapter.endGesture();
    drag.current = null;
    setActive(null);
    setLimited(false);
  };
  return (
    <svg
      className="vs-collage-dividers"
      width={width}
      height={height}
      aria-label="Collage dividers"
    >
      {base.result.dividers.map((d) => {
        const p = point(d.point),
          angle = (Math.atan2(d.normal[1], d.normal[0]) * 180) / Math.PI;
        const path = 'M' + d.points.map((v) => point(v).join(' ')).join('L');
        return (
          <g
            key={d.id}
            className={`vs-collage-divider ${active === d.id ? 'is-active' : ''} ${active === d.id && limited ? 'is-limited' : ''} ${d.type === 'outer' ? 'is-outer' : ''}`}
          >
            <path d={path} className="vs-collage-divider__line" />
            <g
              role="button"
              tabIndex={0}
              aria-label={d.label}
              data-collage-divider={d.id}
              className="vs-collage-divider__grip"
              transform={`translate(${p.join(' ')})`}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  base,
                  divider: d,
                  x: e.clientX,
                  y: e.clientY,
                  pointer: e.pointerId,
                  target: e.currentTarget,
                };
                adapter.beginGesture();
                setActive(d.id);
              }}
              onPointerMove={(e) => {
                const s = drag.current;
                if (!s || e.pointerId !== s.pointer) return;
                e.preventDefault();
                const distance =
                  ((e.clientX - s.x) * s.divider.normal[0] +
                    (e.clientY - s.y) * s.divider.normal[1]) /
                  (scale * bh);
                const r = adapter.moveCollageDivider(s.base, s.divider, distance);
                setLimited(!!r?.limited);
              }}
              onPointerUp={() => finish()}
              onPointerCancel={() => finish(true)}
              onLostPointerCapture={() => finish(true)}
              onKeyDown={(e) => {
                e.stopPropagation();
                const keys: Record<string, number[]> = {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                };
                const key = keys[e.key];
                if (!key) return;
                e.preventDefault();
                adapter.beginGesture();
                adapter.moveCollageDivider(
                  base,
                  d,
                  (key[0] * d.normal[0] + key[1] * d.normal[1]) *
                    (e.shiftKey ? 0.002 : 0.01) *
                    Math.min(1, bw / bh),
                );
                adapter.endGesture();
              }}
            >
              <title>{d.label}</title>
              <circle r="19" className="vs-collage-divider__hit" />
              <circle r="10" className="vs-collage-divider__knob" />
              <path
                transform={`rotate(${angle})`}
                d="M-5 0H5M-2-3L-5 0-2 3M2-3L5 0 2 3"
                className="vs-collage-divider__arrows"
              />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
