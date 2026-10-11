/** Development-only test harness. Never imported into the application or its production build. */
import { StrictMode, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { TweakpaneHost } from '../../src/studio/appearance/TweakpaneHost';
import { createShapePane } from '../../src/studio/appearance/shapePane';
import { KonvaCanvasAdapter } from '../../src/vision/canvas/KonvaCanvasAdapter';
import { createAppearance } from '../../src/vision/appearance/defaults';
import { applyFluentTheme } from '../../src/studio/design-system/fluentTheme';
import '../../src/studio/design-system/index.css';
import '../../src/studio/appearance/tweakpane.css';

applyFluentTheme(document);
const adapter = new KonvaCanvasAdapter(window, 'isolated-d1-lifecycle');
adapter.history.document.items = [
  {
    id: 'test-shape',
    kind: 'shape',
    shape: 'rectangle',
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    rotation: 0,
    appearance: createAppearance('closed-shape'),
  },
];
adapter.select(['test-shape']);
const stats = { created: 0, disposed: 0 };
const documentListeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
const tracked = new Set([
  'mousedown',
  'mouseup',
  'mousemove',
  'pointerdown',
  'pointercancel',
  'touchend',
  'touchcancel',
  'keydown',
  'keyup',
]);
const addEvent = document.addEventListener.bind(document);
const removeEvent = document.removeEventListener.bind(document);
document.addEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean,
) => {
  if (tracked.has(type) && listener) {
    const listeners = documentListeners.get(type) || new Set();
    listeners.add(listener);
    documentListeners.set(type, listeners);
  }
  addEvent(type, listener, options);
}) as Document['addEventListener'];
document.removeEventListener = ((
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: EventListenerOptions | boolean,
) => {
  if (listener) documentListeners.get(type)?.delete(listener);
  removeEvent(type, listener, options);
}) as Document['removeEventListener'];
function Harness() {
  const create = useCallback((container: HTMLDivElement) => {
    stats.created++;
    const pane = createShapePane(container, adapter, 'test-shape');
    return {
      dispose() {
        stats.disposed++;
        pane.dispose();
      },
    };
  }, []);
  return (
    <section style={{ width: 340 }}>
      <TweakpaneHost create={create} />
    </section>
  );
}
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
Object.assign(window, {
  d1Harness: {
    adapter,
    stats,
    listeners: () => [...documentListeners.values()].reduce((n, entries) => n + entries.size, 0),
    unmount: () => root.unmount(),
  },
});
