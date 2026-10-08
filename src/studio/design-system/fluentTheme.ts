import { webLightTheme } from '@fluentui/tokens';

/** Put tokens on the document so portal menus and pickers share the editor theme. */
export function applyFluentTheme(document: Document) {
  for (const [name, value] of Object.entries(webLightTheme)) {
    document.documentElement.style.setProperty(`--fluent-${name}`, String(value));
  }
}
