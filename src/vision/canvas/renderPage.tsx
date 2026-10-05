import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Konva from 'konva';
import { Stage, Layer, Group, Rect, Image } from 'react-konva';
import type { BoardPage } from '../document';
import type { KonvaCanvasAdapter } from './KonvaCanvasAdapter';
import { ItemContent } from './ItemContent';

/** Render archived pages without switching the editor or adding history commands. */
export async function renderPage(adapter: KonvaCanvasAdapter, page: BoardPage) {
  const owner = adapter.ownerWindow,
    node = owner.document.createElement('div');
  node.style.cssText = 'position:fixed;left:-30000px;top:0;pointer-events:none';
  owner.document.body.append(node);
  const root = createRoot(node);
  let stage: Konva.Stage | null = null;
  try {
    await owner.document.fonts.ready;
    flushSync(() =>
      root.render(
        <Stage
          ref={(value) => {
            stage = value;
          }}
          width={page.width}
          height={page.height}
        >
          <Layer>
            <Group clipWidth={page.width} clipHeight={page.height}>
              <Rect
                width={page.width}
                height={page.height}
                fill={page.color}
                fillPriority={
                  page.gradient
                    ? page.gradientType === 'radial'
                      ? 'radial-gradient'
                      : 'linear-gradient'
                    : 'color'
                }
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: page.width, y: page.height }}
                fillLinearGradientColorStops={[0, page.color, 1, page.gradient || page.color]}
                fillRadialGradientStartPoint={{ x: page.width / 2, y: page.height / 2 }}
                fillRadialGradientEndPoint={{ x: page.width / 2, y: page.height / 2 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={Math.max(page.width, page.height) / 2}
                fillRadialGradientColorStops={[0, page.color, 1, page.gradient || page.color]}
              />
              {page.background && (
                <Image
                  image={adapter.images.get(page.background.assetUrl)}
                  width={page.width}
                  height={page.height}
                />
              )}
              {page.items
                .filter((item) => !item.hidden)
                .map((item) => (
                  <Group
                    key={item.id}
                    x={item.x}
                    y={item.y}
                    rotation={item.rotation}
                    opacity={item.opacity}
                  >
                    <ItemContent item={item} adapter={adapter} />
                  </Group>
                ))}
            </Group>
          </Layer>
        </Stage>,
      ),
    );
    await new Promise<void>((resolve) => owner.requestAnimationFrame(() => resolve()));
    const canvasStage = stage as Konva.Stage | null;
    if (!canvasStage) throw new Error('Page renderer is not ready.');
    canvasStage.find('Image').forEach((node) => {
      const image = node as Konva.Image;
      if (image.filters()?.length) image.cache({ pixelRatio: 1 });
    });
    return canvasStage.toDataURL({ mimeType: 'image/jpeg', quality: 0.95 });
  } finally {
    root.unmount();
    node.remove();
  }
}
