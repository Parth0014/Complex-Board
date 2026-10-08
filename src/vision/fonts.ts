import assistant from '../../public/Assistant-Regular.woff2?url';
import virgil from '../../public/Virgil.woff2?url';
import mono from '../../public/Cascadia.woff2?url';
export const editorFonts = {
  helvetica: 'Arial',
  assistant: 'Assistant',
  virgil: 'Virgil',
  cascadia: 'Cascadia Code',
  georgia: 'Georgia',
  fraunces: 'Fraunces',
  'caveat-brush': 'Caveat Brush',
  'dm-sans': 'DM Sans',
};
// Retain the actual rendering of older boards with misleading font IDs.
export function canonicalFontId(id?: string): keyof typeof editorFonts {
  if (id === 'comic-shanns') return 'cascadia';
  return id && Object.hasOwn(editorFonts, id) ? (id as keyof typeof editorFonts) : 'georgia';
}
export function fontFamily(id?: string): string {
  return editorFonts[canonicalFontId(id)];
}
export async function loadEditorFonts(ownerWindow: Window & typeof globalThis) {
  for (const [assetPath, url] of Object.entries(
    import.meta.glob<string>('../../public/vision-board-assets/fonts/*.woff2', {
      eager: true,
      query: '?url',
      import: 'default',
    }),
  )) {
    const match = assetPath.match(/(fraunces|caveat-brush|dm-sans)-latin-(\d+)-(normal|italic)/);
    if (!match) continue;
    const family = editorFonts[match[1] as keyof typeof editorFonts];
    if (
      Array.from(ownerWindow.document.fonts).some(
        (font) => font.family === family && font.weight === match[2] && font.style === match[3],
      )
    )
      continue;
    const font = new ownerWindow.FontFace(family, 'url(' + url + ')', {
      weight: match[2],
      style: match[3],
    });
    await font.load();
    ownerWindow.document.fonts.add(font);
  }
  for (const [family, url] of [
    ['Assistant', assistant],
    ['Virgil', virgil],
    ['Cascadia Code', mono],
  ]) {
    const font = new ownerWindow.FontFace(family, `url(${url})`);
    await font.load();
    ownerWindow.document.fonts.add(font);
  }
}
