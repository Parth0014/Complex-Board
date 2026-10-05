# Vision Studio — V5 Redesign Notes

A from-scratch UI/UX rebuild ("Graphite" system). New name, new visual language, new
layout. No references carried over from earlier designs.

## What changed

**Identity.** The app is now **Vision Studio** (was "Gratitude Studio"). Cool graphite +
paper + cobalt accent. Inter throughout.

**Layout — one zone per job, ordered by frequency.**
- **Header (dark, 56px):** brand mark + wordmark, editable board title with live save
  status, undo/redo segmented control, New, Share (primary), and a File menu holding
  Save/Restore backup plus the canvas-size selector.
- **Library dock (left floating card):** slim icon rail (Templates · Elements ·
  Uploads · Text · Create · Background) + content pane, AI below a divider with a
  badge. Collapses to the rail when closed; becomes a bottom sheet on mobile.
- **Tool pill (top-center, dark):** Select · Pan · Pen · Marker · Highlighter · Eraser.
- **Selection pill (top-center, dark, appears on selection):** type chip, inline text
  controls (content, size, color, style menu), graphic-style menu for media, Duplicate,
  Align/Distribute, Opacity, Group, Lock, Delete, and a Style button opening the
  inspector.
- **Inspector (right floating card):** Style/Layers segmented tabs. Style is organized
  into labeled collapsible sections — Quick actions · Position & size · Text ·
  Fill & gradient · Quick styles · Appearance · Image (AI tools, graphic colors,
  fit & crop, frame content) · Pen — instead of the old flat control soup. Layers
  keeps the nested tree, visibility/lock, drag-reorder, arrange, and exit-group.
- **Bottom-left pill:** board-items outline, page switcher, add/delete page, dimensions.
- **Bottom-right pill:** zoom out/slider/percent/in/ fit.
- **Snap chip (bottom-center, dark):** alignment guides / snap to edges / keep ratio.
- **Dialogs:** export dialog reorganized (Recommended → More formats → utilities →
  privacy note); new-board confirm; error banners.

**Icons — one library.** `lucide-react` is now a dependency. `src/studio/icons.tsx` is
the single icon surface: every chrome glyph is a Lucide icon on a consistent grid.
Zero emoji / text-glyphs anywhere in the UI (canvas tools, menus, layer rows, panels,
dialogs, shape previews).

**Tooltips everywhere.** Every icon-only control carries a `data-tip` tooltip (dark,
consistent, hover + keyboard-focus). Implemented so tooltip text never leaks into
accessible names.

## What did not change

All editor logic, adapter calls, keyboard shortcuts, document model, canvas engine,
export pipeline, and AI flows. Every Playwright-visible accessible name and button
text is preserved. One test assertion about the old toolbar-above-canvas layout was
updated to the new floating-toolbar behavior.

## Files

- `src/studio/v5/v5-tokens.css` — tokens, base, buttons/inputs/menus/switches, tooltip system
- `src/studio/v5/v5-chrome.css` — header, dock, pills, inspector, dialogs, responsive
- `src/studio/v5/v5-panels.css` — library panel interiors
- `src/studio/icons.tsx` — rewritten as the Lucide icon surface
- `src/studio/StudioShell.tsx`, `src/App.tsx`, `src/studio/EditorFeatures.tsx` — rebuilt chrome
- `docs/UI_UX_PLAN_V5.md` — the full placement plan this implements

## Verification

- `tsc --noEmit` clean (also fixed a pre-existing type gap: `copyStyle`/`pasteStyle`/
  `canPasteStyle` were missing from the `EditorAdapter` interface)
- `vite build` passes
- 31/31 unit tests pass
- Playwright suite: see run output
