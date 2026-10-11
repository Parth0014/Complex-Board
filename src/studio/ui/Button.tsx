import type { ComponentPropsWithRef } from 'react';

export type ButtonProps = ComponentPropsWithRef<'button'> & {
  variant?: 'plain' | 'primary' | 'secondary' | 'danger';
};
/** Shared native button semantics; existing component classes remain composable. */
export function Button({
  type = 'button',
  variant = 'plain',
  className = '',
  title,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`gs-button gs-button--${variant} ${className}`}
      data-tip={title}
      {...props}
    />
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
      title={props.title ?? label}
      className={`gs-icon-button ${props.className ?? ''}`}
    />
  );
}
