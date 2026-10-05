import React from 'react';

import { TabIcon } from './icons';
import { STUDIO_TABS, STUDIO_TAB_LABELS } from './studioTypes';

import type { StudioTab } from './studioTypes';

export interface StudioDockProps {
  activeTab: StudioTab | null;
  onSelectTab: (tab: StudioTab | null) => void;
  /** When true, the dock gracefully exits (e.g. selection pill takes over). */
  hidden?: boolean;
}

/**
 * Atelier dock: the six studio tools float bottom-center over the canvas
 * as a frosted-glass bar. Tapping a tool toggles its panel, which slides
 * in as a floating card docked to the left edge — clear of the canvas.
 */
export const StudioDock = ({ activeTab, onSelectTab, hidden = false }: StudioDockProps) => (
  <nav className="studio-dock" aria-label="Studio tools" aria-hidden={hidden} data-hidden={hidden}>
    {STUDIO_TABS.map((tab) => {
      const active = activeTab === tab;
      return (
        <button
          key={tab}
          type="button"
          aria-pressed={active}
          aria-label={STUDIO_TAB_LABELS[tab]}
          title={STUDIO_TAB_LABELS[tab]}
          className={`studio-dock__tab${active ? ' is-active' : ''}`}
          onClick={() => onSelectTab(active ? null : tab)}
        >
          <TabIcon tab={tab} />
          <span className="studio-dock__label">{STUDIO_TAB_LABELS[tab]}</span>
        </button>
      );
    })}
  </nav>
);
