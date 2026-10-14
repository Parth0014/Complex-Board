import { memo, useEffect, useState } from 'react';
import { loadPreviewMedia, previewAssetUrl } from './previewMedia';
import { itemOpacity, primaryColor } from '../../vision/appearance/capabilities';
import type { BoardDocument } from '../../vision/document';
export const BoardPreview = memo(function BoardPreview({
  document,
  maxItems = 100,
}: {
  document: BoardDocument;
  maxItems?: number;
}) {
  const [media, setMedia] = useState<{ document: BoardDocument; urls: Record<string, string> }>();
  useEffect(
    () =>
      loadPreviewMedia(
        window,
        [document.background, ...document.items.flatMap((item) => [item.asset, item.contentAsset])],
        (urls) => setMedia({ document, urls }),
      ),
    [document],
  );
  const uploads = media?.document === document ? media.urls : {};
  const background = previewAssetUrl(document.background, uploads);
  return (
    <svg
      viewBox={'0 0 ' + document.width + ' ' + document.height}
      aria-hidden="true"
      style={{ background: document.color }}
    >
      <rect width={document.width} height={document.height} fill={document.color} />
      {background && (
        <image
          href={background}
          width={document.width}
          height={document.height}
          preserveAspectRatio="xMidYMid slice"
        />
      )}
      {document.items
        .filter((item) => !item.hidden)
        .slice(0, maxItems)
        .map((item) => {
          const image = previewAssetUrl(item.contentAsset || item.asset, uploads);
          return (
            <g
              key={item.id}
              transform={'translate(' + item.x + ' ' + item.y + ') rotate(' + item.rotation + ')'}
              opacity={itemOpacity(item)}
            >
              {item.kind === 'text' ? (
                <text
                  y={item.fontSize || 34}
                  fontSize={item.fontSize || 34}
                  fill={primaryColor(item.appearance)}
                >
                  {item.text?.slice(0, 100)}
                </text>
              ) : image ? (
                <image
                  href={image}
                  width={item.width}
                  height={item.height}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <rect
                  width={item.width}
                  height={item.height}
                  fill={
                    item.kind === 'asset'
                      ? item.color || '#d9d3e8'
                      : 'fill' in item.appearance && !item.appearance.fill.enabled
                        ? 'transparent'
                        : primaryColor(item.appearance)
                  }
                  rx={item.radius || 0}
                />
              )}
            </g>
          );
        })}
    </svg>
  );
});
