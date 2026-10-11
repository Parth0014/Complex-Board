import { useLayoutEffect, useRef } from 'react';

export interface PaneLifecycle {
  dispose(): void;
}

/** Own one imperative pane per mount, including Strict Mode setup/cleanup replay. */
export function TweakpaneHost({ create }: { create(container: HTMLDivElement): PaneLifecycle }) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = host.current!;
    const pane = create(container);
    return () => {
      pane.dispose();
      container.replaceChildren();
    };
  }, [create]);
  return <div ref={host} className="gs-tweakpane" data-gesture-owner="tweakpane" />;
}
