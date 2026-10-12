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
          const shrinking = width < document.width || height < document.height;
          const outsideCount = document.items.filter((item) => {
            const angle = (item.rotation * Math.PI) / 180;
            return [
              [0, 0],
              [item.width, 0],
              [0, item.height],
              [item.width, item.height],
            ].some(([x, y]) => {
              const px = item.x + x * Math.cos(angle) - y * Math.sin(angle);
              const py = item.y + x * Math.sin(angle) + y * Math.cos(angle);
              return px < 0 || py < 0 || px > width || py > height;
            });
          }).length;
          if (
            shrinking &&
            outsideCount > 0 &&
            !adapter.ownerWindow.confirm(
              `${outsideCount} object${outsideCount === 1 ? '' : 's'} will fall outside the new size. Change size anyway?`,
            )
          )
            return;
          adapter.commit({ ...document, width, height });
          adapter.fitBoard();
        }}
      >
        {!BOARD_SIZES.some(([size]) => size === value) && (
          <option value={value} disabled hidden>
            Current board
          </option>
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
