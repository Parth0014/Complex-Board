import { memo } from 'react';
import { itemOpacity, primaryColor } from '../../vision/appearance/capabilities';
import type { BoardDocument } from '../../vision/document';
export const BoardPreview = memo(function BoardPreview({
  document,
  maxItems = 100,
}: {
  document: BoardDocument;
  maxItems?: number;
}) {
  return (
    <svg
      viewBox={'0 0 ' + document.width + ' ' + document.height}
      aria-hidden="true"
      style={{ background: document.color }}
    >
      <rect width={document.width} height={document.height} fill={document.color} />
      {document.items.slice(0, maxItems).map((item) => (
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
          ) : item.asset?.previewUrl.startsWith('data:') ? (
            <image
              href={item.asset.previewUrl}
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
      ))}
    </svg>
  );
});
