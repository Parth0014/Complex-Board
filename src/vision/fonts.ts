import assistant from '../../public/Assistant-Regular.woff2?url';
import virgil from '../../public/Virgil.woff2?url';
import mono from '../../public/Cascadia.woff2?url';
export const editorFonts = {
  helvetica: 'Arial',
  assistant: 'Assistant',
  virgil: 'Virgil',
  cascadia: 'Cascadia Code',
  georgia: 'Georgia',
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
