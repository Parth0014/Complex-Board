import type { EditorAdapter } from '../vision/contracts';

export const BOARD_SIZES = [
  ['1080x1080', 'Square'],
  ['1920x1080', 'Wide'],
  ['1080x1920', 'Phone wallpaper'],
] as const;

export function BoardSizeControl({ adapter }: { adapter: EditorAdapter }) {
  const document = adapter.history.document;
  const value = `${document.width}x${document.height}`;
  return (
    <label className="vs-board-size">
      <span>Size</span>
      <select
        aria-label="Board size"
        value={value}
        onChange={(event) => {
          const [width, height] = event.target.value.split('x').map(Number);
          adapter.commit({ ...document, width, height });
          adapter.fitBoard();
        }}
      >
        {!BOARD_SIZES.some(([size]) => size === value) && (
          <option value={value} disabled hidden>Current board</option>
        )}
        {BOARD_SIZES.map(([size, label]) => (
          <option key={size} value={size}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
