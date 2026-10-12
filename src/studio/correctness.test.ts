import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';
import { readDuration } from './ui/motion';

describe('user-facing errors', () => {
  it('shows useful messages without Error prefixes', () => {
    expect(errorMessage(new Error('Upload failed'))).toBe('Upload failed');
    expect(errorMessage('Error: Restore failed')).toBe('Restore failed');
  });
  it('uses a readable fallback for unknown or empty values', () => {
    expect(errorMessage({ code: 500 })).toBe('Something went wrong. Try again.');
    expect(errorMessage(new Error(' '), 'Try another file.')).toBe('Try another file.');
  });
});

describe('exit timing', () => {
  function element(duration: string, reduced = false) {
    return {
      ownerDocument: {
        defaultView: {
          matchMedia: () => ({ matches: reduced }),
          getComputedStyle: () => ({ getPropertyValue: () => duration }),
        },
      },
    } as unknown as HTMLElement;
  }
  it('supports CSS milliseconds and seconds', () => {
    expect(readDuration(element('120ms'))).toBe(120);
    expect(readDuration(element('0.12s'))).toBe(120);
  });
  it('skips motion when requested and handles missing tokens', () => {
    expect(readDuration(element('120ms', true))).toBe(0);
    expect(readDuration(element(''))).toBe(0);
  });
});
