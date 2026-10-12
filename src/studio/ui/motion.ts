/** Read the CSS duration in its owning window; reduced motion closes immediately. */
export function readDuration(element: HTMLElement, token = '--gs-duration-exit'): number {
  const ownerWindow = element.ownerDocument.defaultView;
  if (!ownerWindow || ownerWindow.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  const value = ownerWindow.getComputedStyle(element).getPropertyValue(token).trim();
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? Math.max(0, amount * (value.endsWith('ms') ? 1 : 1000)) : 0;
}
