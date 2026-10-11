import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, IconButton } from './Button';
import { createElement } from 'react';

describe('shared button semantics', () => {
  it('disables loading actions and keeps the original label in layout', () => {
    const markup = renderToStaticMarkup(createElement(Button, { loading: true }, 'Create board'));
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('gs-button__label');
    expect(markup).toContain('Create board');
    expect(markup).toContain('gs-button__spinner');
  });
  it('uses one accessible tooltip rather than a native title', () => {
    const markup = renderToStaticMarkup(createElement(IconButton, { 'aria-label': 'Undo', title: 'Undo last change' }));
    expect(markup).toContain('aria-label="Undo"');
    expect(markup).toContain('data-tip="Undo"');
    expect(markup).not.toContain(' title=');
  });
});
