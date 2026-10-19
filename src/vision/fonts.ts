import assistant from '../../public/Assistant-Regular.woff2?url';
import virgil from '../../public/Virgil.woff2?url';
import mono from '../../public/Cascadia.woff2?url';
export const editorFonts = {
  'cormorant-garamond': 'Cormorant Garamond',
  'dancing-script': 'Dancing Script',
  cinzel: 'Cinzel',
  kalam: 'Kalam',
  outfit: 'Outfit',
  montserrat: 'Montserrat',
  fraunces: 'Fraunces',
  'caveat-brush': 'Caveat Brush',
  'scrapbook-caveat': 'Scrapbook Caveat',
  'scrapbook-playfair': 'Scrapbook Playfair',
  'scrapbook-poppins': 'Scrapbook Poppins',
  'dm-sans': 'DM Sans',
  virgil: 'Virgil',
  georgia: 'Georgia',
  cascadia: 'Cascadia Code',
  assistant: 'Assistant',
  helvetica: 'Arial',
  impact: 'Impact',
  'courier-new': 'Courier New',
  pacifico: 'Pacifico',
};
// Retain the actual rendering of older boards with misleading font IDs.
export function canonicalFontId(id?: string): keyof typeof editorFonts {
  if (id === 'comic-shanns') return 'cascadia';
  if (id === 'playfair-display') return 'georgia';
  if (id === 'nunito') return 'georgia';
  return id && Object.hasOwn(editorFonts, id) ? (id as keyof typeof editorFonts) : 'georgia';
}
export function fontFamily(id?: string): string {
  return editorFonts[canonicalFontId(id)];
}
async function loadFonts(ownerWindow: Window & typeof globalThis) {
  const fontLoads: Promise<void>[] = [];

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
    fontLoads.push(
      font.load().then((loaded) => {
        ownerWindow.document.fonts.add(loaded);
      }),
    );
  }

  for (const [family, url] of [
    ['Assistant', assistant],
    ['Virgil', virgil],
    ['Cascadia Code', mono],
  ]) {
    const font = new ownerWindow.FontFace(family, `url(${url})`);
    fontLoads.push(
      font.load().then((loaded) => {
        ownerWindow.document.fonts.add(loaded);
      }),
    );
  }

  const scrapbookUrls = import.meta.glob<string>('../../public/scrapbook-fonts/*.ttf', {
    eager: true,
    query: '?url',
    import: 'default',
  });
  for (const [family, file, weight] of [
    ['Scrapbook Caveat', 'caveat-700.ttf', '700'],
    ['Scrapbook Playfair', 'playfair-700.ttf', '700'],
    ['Scrapbook Poppins', 'poppins-400.ttf', '400'],
    ['Scrapbook Poppins', 'poppins-600.ttf', '600'],
    ['Scrapbook Poppins', 'poppins-700.ttf', '700'],
  ]) {
    if (
      Array.from(ownerWindow.document.fonts).some(
        (font) => font.family === family && font.weight === weight,
      )
    )
      continue;
    const font = new ownerWindow.FontFace(
      family,
      `url(${scrapbookUrls['../../public/scrapbook-fonts/' + file]})`,
      { weight },
    );
    fontLoads.push(
      font.load().then((loaded) => {
        ownerWindow.document.fonts.add(loaded);
      }),
    );
  }
  await Promise.all(fontLoads);
}

const fontTasks = new WeakMap<Window, Promise<void>>();
export function loadEditorFonts(ownerWindow: Window & typeof globalThis) {
  let task = fontTasks.get(ownerWindow);
  if (!task) {
    task = loadFonts(ownerWindow).catch((error) => {
      fontTasks.delete(ownerWindow);
      throw error;
    });
    fontTasks.set(ownerWindow, task);
  }
  return task;
}
