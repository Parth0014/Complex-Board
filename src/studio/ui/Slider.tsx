import type { ComponentPropsWithRef, CSSProperties } from 'react';

type SliderProps = Omit<ComponentPropsWithRef<'input'>, 'type'> & { spectrum?: boolean };

/** Native range behavior with one shared visual treatment across editor surfaces. */
export function Slider({
  value,
  min = 0,
  max = 100,
  className = '',
  style,
  spectrum = false,
  ...props
}: SliderProps) {
  const lower = Number(min),
    upper = Number(max);
  const percent =
    upper > lower
      ? Math.max(0, Math.min(100, ((Number(value ?? lower) - lower) / (upper - lower)) * 100))
      : 0;
  return (
    <input
      {...props}
      type="range"
      min={min}
      max={max}
      value={value}
      className={`gs-slider vs-range ${className}`}
      data-spectrum={spectrum || undefined}
      style={{ '--gs-range-fill': `${percent}%`, ...style } as CSSProperties}
    />
  );
}
