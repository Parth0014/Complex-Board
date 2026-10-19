import { useLayoutEffect, useRef } from 'react';
import { Button, IconButton } from './ui/Button';
import { CloseIcon } from './icons';

/** Follow the rendered board rather than the surrounding workspace or scroll area. */
export function CanvasIntroduction({
  width,
  height,
  onDismiss,
  onPhotos,
  onTemplates,
}: {
  width: number;
  height: number;
  onDismiss(): void;
  onPhotos(): void;
  onTemplates(): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const node = ref.current!;
    const host = node.parentElement!;
    const viewport = host.querySelector<HTMLElement>('.gs-artboard');
    const owner = node.ownerDocument.defaultView!;
    if (!viewport) return;
    const position = () => {
      const bounds = viewport.getBoundingClientRect();
      const parent = host.getBoundingClientRect();
      const scale = Number(viewport.dataset.scale);
      const centerX =
        bounds.left - parent.left + Number(viewport.dataset.pageLeft) + (width * scale) / 2;
      const centerY =
        bounds.top - parent.top + Number(viewport.dataset.pageTop) + (height * scale) / 2;
      const clamp = (point: number, start: number, end: number, half: number) =>
        Math.max(start + half, Math.min(end - half, point));
      node.style.left = `${clamp(centerX, 12, host.clientWidth - 12, node.offsetWidth / 2)}px`;
      node.style.top = `${clamp(centerY, bounds.top - parent.top + 12, bounds.bottom - parent.top - 12, node.offsetHeight / 2)}px`;
    };
    const resize = new owner.ResizeObserver(position);
    resize.observe(host);
    resize.observe(viewport);
    resize.observe(node);
    const camera = new owner.MutationObserver(position);
    camera.observe(viewport, {
      attributes: true,
      attributeFilter: ['data-page-left', 'data-page-top', 'data-scale'],
    });
    position();
    return () => {
      resize.disconnect();
      camera.disconnect();
    };
  }, [width, height]);
  return (
    <div ref={ref} className="vs-canvas-onboarding">
      <IconButton
        className="vs-canvas-onboarding__close"
        aria-label="Dismiss canvas introduction"
        onClick={onDismiss}
      >
        <CloseIcon />
      </IconButton>
      <h2>Make room for your vision</h2>
      <p>Drop photos or pick a template.</p>
      <div>
        <Button variant="primary" onClick={onPhotos}>
          Upload photos
        </Button>
        <Button variant="secondary" onClick={onTemplates}>
          Browse templates
        </Button>
      </div>
    </div>
  );
}
