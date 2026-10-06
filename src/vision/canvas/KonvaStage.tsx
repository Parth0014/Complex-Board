import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import Konva from 'konva';
import { Stage, Layer, Rect, Image, Transformer, Group, Line } from 'react-konva';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import type { BoardItem } from '../document';
import { boundsOf, unionBounds, snapMovement, snapResize, type Bounds } from './geometry';
import { GRATITUDE_ASSET_DRAG_TYPE } from '../../assets/contracts';
import { curatedPackProvider } from '../../assets/curatedPack';

import { ItemContent } from './ItemContent';
import { dragCrop } from '../crop';
import { updateConnectors } from '../connectors';

export function KonvaStage({
  adapter,
  zoom,
  onZoomChange,
  onScaleChange,
  drawMode = 'select',
  snappingContainer,
}: {
  adapter: KonvaCanvasAdapter;
  zoom: number | null;
  onZoomChange: (zoom: number | null) => void;
  onScaleChange: (percent: number) => void;
  drawMode?: string;
  snappingContainer?: HTMLDivElement | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    if (drawMode === 'select') {
      node.style.cursor = 'default';
      return;
    }
    // Reuse the selected toolbar SVG so the pointer and tool always match.
    const icon = node.ownerDocument.querySelector('.vs-drawing-menu > button svg');
    if (!icon) {
      node.style.cursor = 'crosshair';
      return;
    }
    const svg = icon.cloneNode(true) as SVGElement;
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('width', '24');
    svg.setAttribute('height', '24');
    svg.setAttribute('stroke', '#1b1d23');
    const encoded = encodeURIComponent(new XMLSerializer().serializeToString(svg));
    const hotspot = drawMode === 'eraser' ? '8 18' : '3 20';
    node.style.cursor = `url("data:image/svg+xml,${encoded}") ${hotspot}, crosshair`;
    return () => {
      node.style.cursor = 'default';
    };
  }, [drawMode]);
  const stageRef = useRef<Konva.Stage>(null);
  const dragPointer = useRef<{ x: number; y: number } | null>(null);
  const transformer = useRef<Konva.Transformer>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 800, height: 700 });
  const drag = useRef<{
    items: BoardItem[];
    origin: BoardItem;
    pointer: { x: number; y: number };
    box: Bounds;
    others: Bounds[];
    nodes: Map<string, Konva.Node>;
    selectedIds: Set<string>;
    hasConnectors: boolean;
  } | null>(null);
  const marquee = useRef<{ x: number; y: number; previous: string[] } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [guides, setGuides] = useState<{ vertical?: number; horizontal?: number }>({});
  const [snapping, setSnapping] = useState(true);
  const altHeld = useRef(false);
  const [keepRatio, setKeepRatio] = useState(true);
  const zoomAnchor = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null);
  const wheelZoom = useRef({ delta: 0, clientX: 0, clientY: 0, frame: 0 });
  useEffect(
    () => () => {
      if (wheelZoom.current.frame)
        adapter.ownerWindow.cancelAnimationFrame(wheelZoom.current.frame);
    },
    [adapter],
  );
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const [dropError, setDropError] = useState('');
  const stroke = useRef<number[]>([]);
  const [strokePreview, setStrokePreview] = useState<number[]>([]);
  const cropDrag = useRef<{
    x: number;
    y: number;
    crop: NonNullable<BoardItem['crop']>;
    item: BoardItem;
  } | null>(null);
  const document = adapter.history.document;
  const hoveredItem =
    drawMode === 'select' && !adapter.cropDraft && !selectionRect
      ? document.items.find(
          (item) =>
            item.id === hoveredId &&
            !item.hidden &&
            adapter.inScope(item) &&
            !adapter.selectedIds.includes(item.id),
        )
      : undefined;
  // Match the same scoped unit used by selection, including nested groups.
  const hoveredMembers = hoveredItem
    ? document.items.filter(
        (item) =>
          !item.hidden &&
          adapter.inScope(item) &&
          adapter.unitKey(item) === adapter.unitKey(hoveredItem),
      )
    : [];
  const hoverBounds =
    hoveredItem && !hoveredMembers.some((item) => adapter.selectedIds.includes(item.id))
      ? adapter.unitKey(hoveredItem) === hoveredItem.id
        ? hoveredItem
        : { ...unionBounds(hoveredMembers.map(boundsOf)), rotation: 0 }
      : undefined;
  const gradientStart = useMemo(() => ({ x: 0, y: 0 }), []);
  const gradientEnd = useMemo(
    () => ({ x: document.width, y: document.height }),
    [document.width, document.height],
  );
  const gradientCenter = useMemo(
    () => ({ x: document.width / 2, y: document.height / 2 }),
    [document.width, document.height],
  );
  const gradientStops = useMemo(
    () => [0, document.color, 1, document.gradient || document.color],
    [document.color, document.gradient],
  );
  const scale =
    zoom ??
    Math.max(
      0.05,
      Math.min((size.width - 64) / document.width, (size.height - 200) / document.height, 1),
    );
  // Object movement must never resize the scroll surface or move the board origin.
  const stageWidth = Math.max(size.width, document.width * scale + 96);
  const stageHeight = Math.max(size.height, document.height * scale + 80);
  const left = (stageWidth - document.width * scale) / 2;
  const top = (stageHeight - document.height * scale) / 2;
  const centeredView = useRef('');
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const viewKey = `${scale}:${document.width}:${document.height}:${size.width}:${size.height}`;
    const viewChanged = centeredView.current !== viewKey;
    centeredView.current = viewKey;
    if (anchor && container.current) {
      container.current.scrollTo(
        left + anchor.x * scale - anchor.viewX,
        top + anchor.y * scale - anchor.viewY,
      );
      zoomAnchor.current = null;
    } else if (container.current && viewChanged) {
      // Toolbar zoom and workspace resizing keep the board in the viewport center.
      container.current.scrollTo(
        left + (document.width * scale) / 2 - size.width / 2,
        top + (document.height * scale) / 2 - size.height / 2,
      );
    }
  }, [left, top, scale, document.width, document.height, size.width, size.height]);
  const zoomAt = (clientX: number, clientY: number, nextScale: number) => {
    const node = container.current;
    if (!node) return;
    const rect = node.getBoundingClientRect(),
      viewX = clientX - rect.left,
      viewY = clientY - rect.top;
    zoomAnchor.current = {
      x: (node.scrollLeft + viewX - left) / scale,
      y: (node.scrollTop + viewY - top) / scale,
      viewX,
      viewY,
    };
    onZoomChange(Math.max(0.1, Math.min(1.5, nextScale)));
  };

  useEffect(() => {
    onScaleChange(Math.round(scale * 100));
  }, [scale, onScaleChange]);
  useEffect(() => {
    const ownerDocument = container.current?.ownerDocument;
    const down = (event: KeyboardEvent) => {
      altHeld.current = event.altKey;
      if (event.altKey) setGuides({});
      const target = event.target as HTMLElement;
      if (
        event.code === 'Space' &&
        !target.isContentEditable &&
        !/INPUT|TEXTAREA|SELECT|BUTTON|SUMMARY/.test(target.tagName)
      ) {
        event.preventDefault();
      }
    };
    const up = (event: KeyboardEvent) => {
      altHeld.current = event.altKey;
    };
    const blur = () => {
      altHeld.current = false;
    };
    ownerDocument?.addEventListener('keydown', down);
    ownerDocument?.addEventListener('keyup', up);
    ownerDocument?.defaultView?.addEventListener('blur', blur);
    return () => {
      ownerDocument?.removeEventListener('keydown', down);
      ownerDocument?.removeEventListener('keyup', up);
      ownerDocument?.defaultView?.removeEventListener('blur', blur);
    };
  }, []);

  useLayoutEffect(() => {
    const node = container.current;
    const dock = node?.parentElement?.querySelector<HTMLElement>('.vs-bottom-dock');
    const ownerWindow = node?.ownerDocument.defaultView;
    if (!node || !dock || !ownerWindow) return;
    // The footer overlays the workspace; exclude its actual (possibly wrapped)
    // height so the scroll viewport and its scrollbar remain fully accessible.
    const update = () => {
      node.style.setProperty('--canvas-footer-height', `${dock.getBoundingClientRect().height}px`);
    };
    update();
    const observer = new ownerWindow.ResizeObserver(update);
    observer.observe(dock);
    return () => {
      observer.disconnect();
      node.style.removeProperty('--canvas-footer-height');
    };
  }, [adapter]);

  useLayoutEffect(() => {
    const node = container.current;
    const ownerWindow = node?.ownerDocument.defaultView;
    if (!node || !ownerWindow) return;
    const measure = () => {
      const width = node.clientWidth,
        height = node.clientHeight;
      if (!width || !height) return;
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };
    // Measure before the first paint instead of displaying the placeholder size.
    measure();
    // ResizeObserver runs before paint; commit its geometry in that same paint
    // cycle so sidebar layout and the canvas never show different viewport sizes.
    const observer = new ownerWindow.ResizeObserver(() => flushSync(measure));
    observer.observe(node);
    adapter.fit = () => {
      onZoomChange(null);
      node.scrollTo({ left: 0, top: 0 });
    };
    return () => {
      observer.disconnect();
      adapter.fit = undefined;
    };
  }, [adapter, onZoomChange]);

  useLayoutEffect(() => {
    // Resizing a Stage clears its canvas buffers and draws the previous node
    // positions. React-Konva then commits the new artboard geometry, scheduling
    // its redraw for the next frame. Finish that redraw before the browser can
    // paint a blank or misplaced board. Selection-only updates skip this effect.
    stageRef.current?.draw();
  }, [stageWidth, stageHeight, left, top, scale]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage || !transformer.current) return;
    const locked = document.items.some(
      (item) => adapter.selectedIds.includes(item.id) && item.locked,
    );
    transformer.current.nodes(
      locked
        ? []
        : adapter.selectedIds
            .map((id) => stage.findOne(`#${id}`))
            .filter((node): node is Konva.Node => !!node),
    );
    transformer.current.getLayer()?.draw();
  }, [adapter, document.items, adapter.selectedIds, scale, left, top]);

  useEffect(() => {
    adapter.exporter = (ratio, selectedOnly, transparent) => {
      if (adapter.cropDraft || adapter.originalPreview)
        throw new Error('Apply or cancel image editing before exporting.');
      const document = adapter.history.document;
      const stage = stageRef.current;
      const page = stage?.findOne('#artboard');
      if (!stage || !page) throw new Error('Canvas artboard is not ready.');
      const assets = [
        ...document.items.flatMap((item) =>
          [item.asset, item.contentAsset].filter(
            (asset): asset is NonNullable<typeof asset> => !!asset,
          ),
        ),
        ...(document.background ? [document.background] : []),
      ];
      if (assets.some((asset) => !adapter.images.has(asset.assetUrl)))
        throw new Error('An asset has not loaded; export is blocked.');
      const clone = page.clone({ x: 0, y: 0, scaleX: 1, scaleY: 1 }) as Konva.Group;
      try {
        clone.find('Image').forEach((node) => {
          const image = node as Konva.Image;
          if (image.filters()?.length) image.cache({ pixelRatio: Math.min(3, ratio) });
        });
        if (transparent) {
          clone.findOne('#page-background')?.destroy();
          clone.findOne('#page-texture')?.destroy();
        }
        if (selectedOnly) {
          if (!adapter.selectedIds.length) throw new Error('Select an item first.');
          clone.getChildren().forEach((node) => {
            if (!adapter.selectedIds.includes(node.id())) node.destroy();
          });
          const bounds = clone.getClientRect();
          return clone.toDataURL({ ...bounds, pixelRatio: ratio });
        }
        return clone.toDataURL({
          x: 0,
          y: 0,
          width: document.width,
          height: document.height,
          pixelRatio: ratio,
        });
      } finally {
        clone.destroy();
      }
    };
    return () => {
      adapter.exporter = undefined;
    };
  }, [adapter]);

  const choose = (id: string, shift = false) => {
    const item = document.items.find((item) => item.id === id);
    if (item && !adapter.inScope(item)) return;
    const unit = item
      ? document.items
          .filter(
            (other) => adapter.inScope(other) && adapter.unitKey(other) === adapter.unitKey(item),
          )
          .map((other) => other.id)
      : [id];
    if (shift)
      adapter.select(
        adapter.selectedIds.includes(id)
          ? adapter.selectedIds.filter((selected) => !unit.includes(selected))
          : [...adapter.selectedIds, ...unit],
      );
    else if (!adapter.selectedIds.includes(id)) adapter.select(unit);
  };
  const startMarquee = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const start = stageRef.current?.getPointerPosition();
    if (!start || ('button' in event.evt && event.evt.button !== 0)) return;
    const outside =
      start.x < left ||
      start.y < top ||
      start.x > left + document.width * scale ||
      start.y > top + document.height * scale;
    if (outside && (drawMode !== 'select' || adapter.cropDraft)) {
      if (
        start &&
        event.target === event.target.getStage() &&
        !adapter.cropDraft &&
        !('touches' in event.evt && event.evt.touches.length > 1) &&
        !('button' in event.evt && event.evt.button !== 0)
      )
        adapter.select([]);
      return;
    }
    if ('touches' in event.evt && event.evt.touches.length === 2) {
      const [a, b] = event.evt.touches;
      pinch.current = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), scale };
      marquee.current = null;
      stroke.current = [];
      stageRef.current?.find('Group').forEach((node) => node.stopDrag());
      return;
    }
    if (adapter.cropDraft) {
      const point = stageRef.current?.getPointerPosition(),
        item = document.items.find((item) => item.id === adapter.cropDraft?.id);
      if (point && item) {
        cropDrag.current = { x: point.x, y: point.y, crop: { ...adapter.cropDraft.crop }, item };
      }
      return;
    }
    if (drawMode === 'eraser') {
      const node = event.target.findAncestor((node: Konva.Node) => !!node.id());
      const item = document.items.find((item) => item.id === node?.id());
      if (item?.kind === 'drawing') adapter.delete([item.id]);
      return;
    }
    if (drawMode !== 'select') {
      const point = stageRef.current?.getPointerPosition();
      if (point) {
        stroke.current = [(point.x - left) / scale, (point.y - top) / scale];
        setStrokePreview([...stroke.current]);
      }
      return;
    }
    if (event.target !== event.target.getStage() && event.target.id() !== 'page-background') return;
    const point = stageRef.current?.getPointerPosition();
    if (!point) return;
    const additive =
      'shiftKey' in event.evt && (event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey);
    marquee.current = { ...point, previous: additive ? [...adapter.selectedIds] : [] };
    if (!additive) adapter.select([]);
    setSelectionRect({ ...point, width: 0, height: 0 });
  };
  const moveMarquee = (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if ('touches' in event.evt && event.evt.touches.length === 2 && pinch.current) {
      event.evt.preventDefault();
      const [a, b] = event.evt.touches;
      zoomAt(
        (a.clientX + b.clientX) / 2,
        (a.clientY + b.clientY) / 2,
        (pinch.current.scale * Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)) /
          pinch.current.distance,
      );
      return;
    }
    if (cropDrag.current) {
      const point = stageRef.current?.getPointerPosition(),
        start = cropDrag.current;
      if (point)
        adapter.updateCropDraft(
          dragCrop(start.crop, start.item, point.x - start.x, point.y - start.y, scale),
        );
      return;
    }
    if (stroke.current.length) {
      const point = stageRef.current?.getPointerPosition();
      if (point) {
        stroke.current.push(
          Math.max(0, Math.min(document.width, (point.x - left) / scale)),
          Math.max(0, Math.min(document.height, (point.y - top) / scale)),
        );
        setStrokePreview([...stroke.current]);
      }
      return;
    }
    const start = marquee.current,
      point = stageRef.current?.getPointerPosition();
    if (!start || !point) return;
    setSelectionRect({
      x: Math.min(start.x, point.x),
      y: Math.min(start.y, point.y),
      width: Math.abs(start.x - point.x),
      height: Math.abs(start.y - point.y),
    });
  };
  const finishMarquee = () => {
    if (cropDrag.current) {
      cropDrag.current = null;
      return;
    }
    if (pinch.current) {
      pinch.current = null;
      return;
    }
    if (stroke.current.length) {
      const points = stroke.current;
      stroke.current = [];
      setStrokePreview([]);
      adapter.createDrawing(
        points,
        drawMode === 'highlighter' ? '#f4c847' : '#573575',
        drawMode === 'pen' ? 4 : drawMode === 'marker' ? 12 : 28,
        drawMode === 'highlighter' ? 0.4 : 1,
      );
      return;
    }
    if (!marquee.current) return;
    const start = marquee.current,
      point = stageRef.current?.getPointerPosition();
    if (start && point && (Math.abs(start.x - point.x) > 3 || Math.abs(start.y - point.y) > 3)) {
      const box = {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(start.x - point.x),
        height: Math.abs(start.y - point.y),
      };
      const ids = document.items
        .filter((item) => {
          const node = stageRef.current?.findOne(`#${item.id}`);
          return node && Konva.Util.haveIntersection(box, node.getClientRect());
        })
        .map((item) => item.id);
      adapter.select([...start.previous, ...ids]);
    }
    marquee.current = null;
    setSelectionRect(null);
  };
  useEffect(() => {
    const ownerDocument = container.current?.ownerDocument;
    ownerDocument?.addEventListener('mouseup', finishMarquee);
    const moveOutside = (event: MouseEvent) => {
      const stage = stageRef.current;
      if (!marquee.current || !stage || stage.container().contains(event.target as Node)) return;
      stage.setPointersPositions(event);
      moveMarquee({ evt: event } as Konva.KonvaEventObject<MouseEvent>);
    };
    ownerDocument?.addEventListener('mousemove', moveOutside);
    ownerDocument?.addEventListener('touchend', finishMarquee);
    const cancel = () => {
      marquee.current = null;
      pinch.current = null;
      cropDrag.current = null;
      stroke.current = [];
      setStrokePreview([]);
      setSelectionRect(null);
    };
    ownerDocument?.addEventListener('touchcancel', cancel);
    return () => {
      ownerDocument?.removeEventListener('mouseup', finishMarquee);
      ownerDocument?.removeEventListener('mousemove', moveOutside);
      ownerDocument?.removeEventListener('touchend', finishMarquee);
      ownerDocument?.removeEventListener('touchcancel', cancel);
    };
  });
  const props = (item: BoardItem) => ({
    id: item.id,
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
    rotation: item.rotation,
    opacity: item.opacity,
    onMouseEnter: () => setHoveredId(item.id),
    onMouseLeave: () => setHoveredId((current) => (current === item.id ? null : current)),
    draggable:
      !adapter.cropDraft &&
      drawMode === 'select' &&
      adapter.inScope(item) &&
      !item.locked &&
      !document.items.some(
        (other) =>
          ((item.groupId && other.groupId === item.groupId) ||
            (adapter.selectedIds.includes(item.id) && adapter.selectedIds.includes(other.id))) &&
          other.locked,
      ),
    onClick: (event: Konva.KonvaEventObject<MouseEvent>) =>
      choose(item.id, event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey),
    onTap: () => choose(item.id),
    onDblClick: () => adapter.enterGroup(item.id),
    onDblTap: () => adapter.enterGroup(item.id),
    onMouseDown: () => {
      const pointer = stageRef.current?.getPointerPosition();
      dragPointer.current = pointer ? { ...pointer } : null;
    },
    onTouchStart: () => {
      const pointer = stageRef.current?.getPointerPosition();
      dragPointer.current = pointer ? { ...pointer } : null;
    },
    onDragStart: () => {
      setHoveredId(null);
      if (!adapter.selectedIds.includes(item.id)) choose(item.id);
      const items = adapter.history.document.items.filter((other) =>
        adapter.selectedIds.includes(other.id),
      );
      if (items.some((other) => other.locked)) {
        stageRef.current?.findOne(`#${item.id}`)?.stopDrag();
        return;
      }
      const stage = stageRef.current;
      const pointer = stage?.getPointerPosition();
      if (!stage || !pointer) return;
      const selectedIds = new Set(items.map((selected) => selected.id));
      const nodes = new Map<string, Konva.Node>();
      for (const selected of items) {
        const node = stage.findOne(`#${selected.id}`);
        if (node) nodes.set(selected.id, node);
      }
      drag.current = {
        items,
        origin: item,
        pointer: { ...(dragPointer.current ?? pointer) },
        nodes,
        selectedIds,
        box: unionBounds(items.map(boundsOf)),
        others: adapter.history.document.items
          .filter((other) => !selectedIds.has(other.id))
          .map(boundsOf),
        hasConnectors: adapter.history.document.items.some((other) => other.connector),
      };
    },
    onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => {
      const movement = drag.current;
      if (!movement) return;
      const pointer = stageRef.current?.getPointerPosition();
      if (!pointer) return;
      // Track the pointer independently of the snapped/clamped node position.
      let dx = (pointer.x - movement.pointer.x) / scale,
        dy = (pointer.y - movement.pointer.y) / scale;
      const keys = event.evt as unknown as MouseEvent;
      if (keys.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const { box, others } = movement;
      const snap =
        snapping && !keys.altKey
          ? snapMovement({ ...box, x: box.x + dx, y: box.y + dy }, others, document, 6 / scale)
          : { dx: 0, dy: 0, vertical: undefined, horizontal: undefined };
      if (keys.shiftKey) {
        if (dx === 0) {
          snap.dx = 0;
          snap.vertical = undefined;
        } else {
          snap.dy = 0;
          snap.horizontal = undefined;
        }
      }
      dx += snap.dx;
      dy += snap.dy;
      // Boundary containment is separate from alignment guides.
      if (adapter.snapToEdges) {
        dx = Math.max(-box.x, Math.min(document.width - box.x - box.width, dx));
        dy = Math.max(-box.y, Math.min(document.height - box.y - box.height, dy));
      }
      for (const selected of movement.items)
        movement.nodes.get(selected.id)?.position({ x: selected.x + dx, y: selected.y + dy });
      const preview = movement.hasConnectors
        ? updateConnectors(
            document.items.map((item) =>
              movement.selectedIds.has(item.id)
                ? { ...item, x: item.x + dx, y: item.y + dy }
                : item,
            ),
          )
        : [];
      for (const item of preview.filter((item) => item.connector)) {
        const node = stageRef.current?.findOne(`#${item.id}`) as Konva.Group | undefined;
        if (node) {
          node.position({ x: item.x, y: item.y });
          node.rotation(item.rotation);
          const arrow = node.findOne('Arrow') as Konva.Arrow | undefined;
          arrow?.points([0, item.height / 2, item.width, item.height / 2]);
        }
      }
      transformer.current?.forceUpdate();
      setGuides((current) =>
        current.vertical === snap.vertical && current.horizontal === snap.horizontal
          ? current
          : { vertical: snap.vertical, horizontal: snap.horizontal },
      );
    },
    onDragEnd: () => {
      const movement = drag.current;
      drag.current = null;
      setGuides({});
      if (!movement) return;
      const patches = movement.items.flatMap((selected) => {
        const node = stageRef.current?.findOne(`#${selected.id}`);
        return node ? [{ id: selected.id, patch: { x: node.x(), y: node.y() } }] : [];
      });
      if (
        patches.some(({ id, patch }) => {
          const original = movement.items.find((item) => item.id === id)!;
          return original.x !== patch.x || original.y !== patch.y;
        })
      )
        adapter.patchItems(patches);
    },
  });

  return (
    <div
      ref={container}
      className="v1-artboard"
      aria-label="Editable vision board"
      tabIndex={0}
      onMouseLeave={() => setHoveredId(null)}
      data-page-left={left}
      data-page-top={top}
      data-scale={scale}
      onDragOver={(event) => {
        if (
          event.dataTransfer.types.includes(GRATITUDE_ASSET_DRAG_TYPE) ||
          event.dataTransfer.types.includes('Files')
        ) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={async (event) => {
        const files = Array.from(event.dataTransfer.files);
        const id = event.dataTransfer.getData(GRATITUDE_ASSET_DRAG_TYPE);
        if (!id && !files.length) return;
        event.preventDefault();
        setDropError('');
        const rect = stageRef.current?.container().getBoundingClientRect();
        if (!rect) return;
        const point = {
          x: (event.clientX - rect.left - left) / scale,
          y: (event.clientY - rect.top - top) / scale,
        };
        if (point.x < 0 || point.y < 0 || point.x > document.width || point.y > document.height)
          return;
        try {
          if (files.length) {
            await adapter.uploadPhotos(files, point);
            return;
          }
          const asset = await curatedPackProvider.resolve(id, adapter.ownerWindow);
          const width = Math.min(320, asset.width || 240),
            height = (width * (asset.height || 240)) / (asset.width || 240);
          await adapter.insertAsset(asset, {
            x: Math.max(0, Math.min(document.width - width, point.x - width / 2)),
            y: Math.max(0, Math.min(document.height - height, point.y - height / 2)),
          });
        } catch (error) {
          setDropError(error instanceof Error ? error.message : 'Asset insertion failed.');
        }
      }}
    >
      {dropError && (
        <p className="canvas-message" role="alert">
          {dropError}
        </p>
      )}
      {snappingContainer &&
        createPortal(
          <div className="canvas-tools" aria-label="Canvas snapping options">
            <label className="snap-toggle" title="Clean up freehand geometry while drawing">
              <input
                type="checkbox"
                aria-label="Shape assist"
                defaultChecked={adapter.shapeAssist}
                onChange={(event) => {
                  adapter.shapeAssist = event.target.checked;
                }}
              />
              <span className="vs-switch__track" aria-hidden="true" />
              Shape assist
            </label>
            <label className="snap-toggle">
              <input
                type="checkbox"
                checked={snapping}
                onChange={(event) => setSnapping(event.target.checked)}
              />
              <span className="vs-switch__track" aria-hidden="true" />
              Alignment guides
            </label>
            <label className="snap-toggle">
              <input
                type="checkbox"
                checked={adapter.snapToEdges}
                onChange={(event) => adapter.setSnapToEdges(event.target.checked)}
              />
              <span className="vs-switch__track" aria-hidden="true" />
              Snap to edges
            </label>
            <label className="snap-toggle">
              <input
                type="checkbox"
                checked={keepRatio}
                onChange={(event) => setKeepRatio(event.target.checked)}
              />
              <span className="vs-switch__track" aria-hidden="true" />
              Keep ratio
            </label>
          </div>,
          snappingContainer,
        )}
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        onWheel={(event) => {
          const wheel = event.evt;
          // Trackpad pinch is a Ctrl-wheel gesture; plain wheel/two-finger motion scrolls.
          if (!wheel.ctrlKey) return;
          wheel.preventDefault();
          const pending = wheelZoom.current;
          // Normalize mouse notches and trackpad pixels, then batch canvas updates.
          const pixels =
            wheel.deltaY * (wheel.deltaMode === 1 ? 16 : wheel.deltaMode === 2 ? size.height : 1);
          pending.delta += Math.max(-80, Math.min(80, pixels));
          pending.clientX = wheel.clientX;
          pending.clientY = wheel.clientY;
          if (pending.frame || !pixels) return;
          pending.frame = adapter.ownerWindow.requestAnimationFrame(() => {
            const delta = Math.max(-80, Math.min(80, pending.delta));
            pending.delta = 0;
            pending.frame = 0;
            if (delta) zoomAt(pending.clientX, pending.clientY, scale * Math.exp(-delta * 0.014));
          });
        }}
        onMouseDown={startMarquee}
        onTouchStart={startMarquee}
        onMouseMove={moveMarquee}
        onTouchMove={moveMarquee}
        onMouseUp={finishMarquee}
        onTouchEnd={finishMarquee}
      >
        <Layer>
          <Rect
            x={left}
            y={top}
            width={document.width * scale}
            height={document.height * scale}
            fill="white"
            shadowColor="#29223b"
            shadowBlur={18}
            shadowOpacity={0.1}
            shadowOffsetY={5}
            listening={false}
          />
          <Group
            id="artboard"
            x={left}
            y={top}
            scaleX={scale}
            scaleY={scale}
            clipWidth={adapter.snapToEdges ? document.width : undefined}
            clipHeight={adapter.snapToEdges ? document.height : undefined}
          >
            <Rect
              id="page-background"
              width={document.width}
              height={document.height}
              fill={document.color}
              fillPriority={
                document.gradient
                  ? document.gradientType === 'radial'
                    ? 'radial-gradient'
                    : 'linear-gradient'
                  : 'color'
              }
              fillLinearGradientStartPoint={gradientStart}
              fillLinearGradientEndPoint={gradientEnd}
              fillLinearGradientColorStops={gradientStops}
              fillRadialGradientStartPoint={gradientCenter}
              fillRadialGradientEndPoint={gradientCenter}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndRadius={Math.max(document.width, document.height) / 2}
              fillRadialGradientColorStops={gradientStops}
            />
            {document.background && (
              <Image
                id="page-texture"
                image={adapter.images.get(document.background.assetUrl)}
                width={document.width}
                height={document.height}
                listening={false}
              />
            )}
            {document.items
              .filter((item) => !item.hidden)
              .map((item) => (
                <Group key={item.id} {...props(item)}>
                  <ItemContent
                    item={item}
                    adapter={adapter}
                    imageToken={adapter.images.get(
                      (!adapter.originalPreview && item.rendition) ||
                        (item.contentAsset || item.asset)?.assetUrl ||
                        '',
                    )}
                    previewToken={
                      adapter.originalPreview ||
                      (adapter.cropDraft?.id === item.id ? adapter.cropDraft.crop : false)
                    }
                  />
                </Group>
              ))}
            {strokePreview.length > 1 && (
              <Line
                points={strokePreview}
                stroke={drawMode === 'highlighter' ? '#f4c847' : '#573575'}
                strokeWidth={drawMode === 'pen' ? 4 : drawMode === 'marker' ? 12 : 28}
                opacity={drawMode === 'highlighter' ? 0.4 : 1}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            )}
          </Group>
        </Layer>
        <Layer>
          {hoverBounds && (
            <Rect
              x={left + hoverBounds.x * scale}
              y={top + hoverBounds.y * scale}
              width={hoverBounds.width * scale}
              height={hoverBounds.height * scale}
              rotation={hoverBounds.rotation}
              stroke="#8b3dff"
              strokeWidth={1}
              opacity={0.65}
              listening={false}
            />
          )}
          {guides.vertical !== undefined && (
            <Line
              points={[
                left + guides.vertical * scale,
                top,
                left + guides.vertical * scale,
                top + document.height * scale,
              ]}
              stroke="#e441be"
              strokeWidth={1}
              dash={[5, 4]}
              listening={false}
            />
          )}
          {guides.horizontal !== undefined && (
            <Line
              points={[
                left,
                top + guides.horizontal * scale,
                left + document.width * scale,
                top + guides.horizontal * scale,
              ]}
              stroke="#e441be"
              strokeWidth={1}
              dash={[5, 4]}
              listening={false}
            />
          )}
          {selectionRect && (
            <Rect
              {...selectionRect}
              fill="#8943e420"
              stroke="#8943e4"
              strokeWidth={1}
              listening={false}
            />
          )}
          <Transformer
            ref={transformer}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            rotationSnapTolerance={5}
            borderStroke="#8b3dff"
            anchorStroke="#8b3dff"
            anchorFill="white"
            anchorSize={9}
            anchorCornerRadius={4}
            rotateAnchorOffset={25}
            flipEnabled={false}
            keepRatio={keepRatio}
            enabledAnchors={
              keepRatio
                ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
                : [
                    'top-left',
                    'top-center',
                    'top-right',
                    'middle-left',
                    'middle-right',
                    'bottom-left',
                    'bottom-center',
                    'bottom-right',
                  ]
            }
            boundBoxFunc={(previous, next) => {
              if (snapping && !altHeld.current && Math.abs(next.rotation) < 0.001) {
                const local = {
                  x: (next.x - left) / scale,
                  y: (next.y - top) / scale,
                  width: next.width / scale,
                  height: next.height / scale,
                };
                const others = document.items
                  .filter((item) => !item.hidden && !adapter.selectedIds.includes(item.id))
                  .map(boundsOf);
                const snap = snapResize(
                  local,
                  transformer.current?.getActiveAnchor() || '',
                  others,
                  document,
                  6 / scale,
                  keepRatio,
                );
                next = {
                  ...next,
                  x: left + snap.box.x * scale,
                  y: top + snap.box.y * scale,
                  width: snap.box.width * scale,
                  height: snap.box.height * scale,
                };
                setGuides((current) =>
                  current.vertical === snap.vertical && current.horizontal === snap.horizontal
                    ? current
                    : { vertical: snap.vertical, horizontal: snap.horizontal },
                );
              }
              const box = boundsOf({ ...next, rotation: (next.rotation * 180) / Math.PI });
              return Math.abs(next.width) < 10 ||
                Math.abs(next.height) < 10 ||
                (adapter.snapToEdges &&
                  (box.x < left - 0.01 ||
                    box.y < top - 0.01 ||
                    box.x + box.width > left + document.width * scale + 0.01 ||
                    box.y + box.height > top + document.height * scale + 0.01))
                ? previous
                : next;
            }}
            onTransformEnd={() => {
              setGuides({});
              const patches = (transformer.current?.nodes() || []).map((node) => {
                const item = document.items.find((item) => item.id === node.id());
                const patch = {
                  x: node.x(),
                  y: node.y(),
                  width: Math.max(10, node.width() * node.scaleX()),
                  height: Math.max(10, node.height() * node.scaleY()),
                  rotation: node.rotation(),
                  ...(item?.kind === 'text'
                    ? { fontSize: Math.max(8, (item.fontSize || 40) * node.scaleY()) }
                    : {}),
                };
                node.scale({ x: 1, y: 1 });
                return { id: node.id(), patch };
              });
              if (patches.length) adapter.patchItems(patches);
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}
