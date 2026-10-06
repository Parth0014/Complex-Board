import type { BoardItem } from './document';
import type { VisionFontFamily } from './contracts';

export interface ReferenceElement {
  type: 'photo' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  text?: string;
  fontSize?: number;
  fontFamily?: VisionFontFamily;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  shape?: 'rectangle' | 'circle' | 'heart' | 'star';
}
export interface ReferenceLayout {
  width: number;
  height: number;
  background: string;
  elements: ReferenceElement[];
}
export const placeholderUrl =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#e6dfd5"/><path d="M100 420l130-150 90 90 70-80 110 140z" fill="#b8afa2"/><circle cx="390" cy="180" r="40" fill="#b8afa2"/></svg>',
  );

/** Compile only known properties; uploaded reference pixels never enter the document. */
export function compileReference(layout: ReferenceLayout, id: () => string): BoardItem[] {
  return layout.elements.map((element, index) => {
    const common = {
      id: id(),
      x: element.x * layout.width,
      y: element.y * layout.height,
      width: element.width * layout.width,
      height: element.height * layout.height,
      rotation: element.rotation,
      opacity: 1,
    };
    if (element.type === 'photo')
      return {
        ...common,
        kind: 'asset',
        slotId: `reference:${index}`,
        templatePlaceholder: true,
        imageFit: 'fill',
        asset: {
          id: 'reference-placeholder',
          provider: 'template-photo',
          type: 'photo',
          title: 'Replace with your photo',
          tags: [],
          previewUrl: placeholderUrl,
          assetUrl: placeholderUrl,
          width: 600,
          height: 600,
          mimeType: 'image/svg+xml',
          editable: { crop: true, filters: true },
          license: {
            tier: 'A',
            id: 'original-placeholder',
            label: 'Original placeholder graphic',
            attributionRequired: false,
          },
        },
      };
    if (element.type === 'text')
      return {
        ...common,
        kind: 'text',
        text: element.text,
        color: element.color,
        fontSize: (element.fontSize || 0.035) * layout.width,
        fontFamily: element.fontFamily || 'assistant',
        bold: element.bold,
        align: element.align || 'left',
      };
    return { ...common, kind: 'shape', shape: element.shape || 'rectangle', color: element.color };
  });
}
