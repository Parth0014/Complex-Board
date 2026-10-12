import type { ComponentPropsWithRef } from 'react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  'data-tip'?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'primary' | 'secondary' | 'danger';
  /** Loading state: spinner glyph, aria-busy, disabled, width held. */
  loading?: boolean;
  /** Keeps an unavailable control focusable so its explanation is reachable. */
  disabledReason?: string;
};
/** Shared native button semantics; existing component classes remain composable. */
export function Button({
  type = 'button',
  variant = 'plain',
  className = '',
  size = 'md',
  title,
  loading = false,
  children,
  disabled,
  disabledReason,
  onClick,
  ...props
}: ButtonProps) {
  const unavailable =
    !!disabledReason || props['aria-disabled'] === true || props['aria-disabled'] === 'true';
  return (
    <button
      type={type}
      className={`gs-button gs-button--${variant} gs-button--${size}${loading ? ' gs-button--loading' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
      data-tip={disabledReason ?? props['data-tip'] ?? title}
      aria-disabled={unavailable || props['aria-disabled'] || undefined}
      onClick={(event) => {
        if (unavailable) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
    >
      {loading ? (
        <>
          <span className="gs-button__label" aria-hidden={true}>
            {children}
          </span>
          <span className="gs-spinner gs-button__spinner" aria-hidden={true} />
        </>
      ) : (
        children
      )}
    </button>
  );
}
export function IconButton({
  'aria-label': label,
  ...props
}: ButtonProps & { 'aria-label': string }) {
  return (
    <Button
      {...props}
      aria-label={label}
      data-tip={props['data-tip'] ?? label}
      className={`gs-icon-button ${props.className ?? ''}`}
    />
  );
}
