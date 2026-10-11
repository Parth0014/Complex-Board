import type { ComponentPropsWithRef } from 'react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  'data-tip'?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'plain' | 'primary' | 'secondary' | 'danger';
  loading?: boolean;
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
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`gs-button gs-button--${variant} gs-button--${size} ${loading ? 'gs-button--loading' : ''} ${className}`}
      data-tip={props['data-tip'] ?? title}
      {...props}
      disabled={loading || props.disabled}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <>
          <span className="gs-button__label">{children}</span>
          <span className="gs-button__spinner" aria-hidden="true" />
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
