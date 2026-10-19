import { it, expect, vi } from 'vitest';
import { KonvaCanvasAdapter } from './canvas/KonvaCanvasAdapter';
import { renderPage } from './canvas/renderPage';
import { newBoard, type BoardItem } from './document';
vi.mock('./canvas/renderPage', () => ({
  renderPage: vi.fn(async () => 'data:image/jpeg;base64,preview'),
}));
it('shares in-flight preview work, renders thumbnails and reuses cached previews', async () => {
  const owner = {} as Window & typeof globalThis;
  const a = new KonvaCanvasAdapter(owner);
  a.commit({ ...newBoard(), width: 1080, height: 1920 });
  const build = vi
    .spyOn(
      a as unknown as { buildFinishedScrapbookItems(id: string): Promise<BoardItem[]> },
      'buildFinishedScrapbookItems',
    )
    .mockResolvedValue([]);
  const one = a.previewScrapbookTemplate('torn-scrapbook'),
    two = a.previewScrapbookTemplate('torn-scrapbook');
  expect(one).toBe(two);
  await one;
  await a.previewScrapbookTemplate('torn-scrapbook');
  expect(build).toHaveBeenCalledTimes(1);
  expect(renderPage).toHaveBeenCalledTimes(1);
  expect(vi.mocked(renderPage).mock.calls[0][2]).toEqual({ maxDimension: 640 });
  const b = new KonvaCanvasAdapter(owner);
  b.commit({ ...newBoard(), width: 1080, height: 1920 });
  expect(b.cachedScrapbookTemplatePreviews()['torn-scrapbook']).toContain('data:image');
  await b.previewScrapbookTemplate('torn-scrapbook');
  expect(renderPage).toHaveBeenCalledTimes(1);
});
