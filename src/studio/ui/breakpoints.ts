import values from '../design-system/breakpoints.json';
/** CSS uses these three native media widths; the style audit enforces this source. */
export const UI_BREAKPOINTS = values;
export const compactScreen = '(max-width: ' + values.compact + 'px)';
export const tabletScreen = '(max-width: ' + values.tablet + 'px)';
