import { it, expect } from 'vitest';
import { validateBoard } from './storage';
import { newBoard } from './document';
it('migrates version 1 backups without mutating the original', () => {
  const legacy = { ...newBoard(), version: 1 };
  expect(validateBoard(legacy).version).toBe(2);
  expect(legacy.version).toBe(1);
  expect(() => validateBoard({ ...legacy, version: 99 })).toThrow('Invalid');
});
it('rejects invalid backups before mutation and clones accepted documents', () => {
  const board = newBoard();
  expect(validateBoard(board)).toEqual(board);
  expect(validateBoard(board)).not.toBe(board);
  expect(() => validateBoard({ ...board, width: Infinity })).toThrow('Invalid');
  expect(() =>
    validateBoard({
      ...board,
      items: [
        {
          id: 'a',
          kind: 'text',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          rotation: 0,
          opacity: 1,
          crop: { x: 0.8, y: 0, width: 0.8, height: 1 },
        },
      ],
    }),
  ).toThrow('crop');
});
it('validates nested group parent identity and page references', () => {
  const item = {
    id: 'a',
    kind: 'text',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    opacity: 1,
  };
  expect(() =>
    validateBoard({
      ...newBoard(),
      items: [
        { ...item, groupPath: ['one', 'child'] },
        { ...item, id: 'b', groupPath: ['two', 'child'] },
      ],
    }),
  ).toThrow('multiple parents');
  expect(() => validateBoard({ ...newBoard(), pages: [], activePageId: 'missing' })).toThrow(
    'pages',
  );
});
