import { memo, useEffect, useRef, useState } from 'react';
import type { BoardDocument } from '../../vision/document';
import { renderThumbnail } from './renderThumbnail';
export const BoardPreview = memo(function BoardPreview({ document }: { document: BoardDocument }) {
  const ref = useRef<SVGSVGElement>(null);
  const [result, setResult] = useState<{
    document: BoardDocument;
    url?: string;
    failed?: boolean;
  }>();
  useEffect(() => {
    let active = true,
      started = false;
    const start = () => {
      if (started) return;
      started = true;
      void renderThumbnail(document).then(
        (url) => {
          if (active) setResult({ document, url });
        },
        () => {
          if (active) setResult({ document, failed: true });
        },
      );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          start();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(ref.current!);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [document]);
  const current = result?.document === document ? result : undefined;
  return (
    <svg
      ref={ref}
      viewBox={'0 0 ' + document.width + ' ' + document.height}
      aria-hidden="true"
      data-preview-state={current?.url ? 'ready' : current?.failed ? 'error' : 'loading'}
      style={{ background: document.color }}
    >
      <rect width={document.width} height={document.height} fill={document.color} />
      {current?.url && <image href={current.url} width={document.width} height={document.height} />}
      {!current?.url && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          fontSize={Math.min(document.width, document.height) / 18}
          fill="#625a72"
        >
          {current?.failed ? 'Preview unavailable' : 'Loading preview...'}
        </text>
      )}
    </svg>
  );
});
