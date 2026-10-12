# VisBo design system

The current interface uses Atelier: DM Sans controls, Fraunces display typography, warm white surfaces, and violet actions. The desktop craft pass adds quieter chrome and short, restrained motion. Board artwork keeps its own colors and fonts. Mobile refinement is outside this pass.

## Sources of truth

- `src/studio/design-system/foundations.css`: palette, typography, spacing, dimensions, elevation, motion, and Konva color tokens.
- `index.css`: cascade order and imports. `components-b.css` has been consolidated into `components.css`.
- `primitives.css`: shared controls, overlay animation, focus, and reduced motion.
- `components.css`: editor, library, inspector, menus, and export presentation.
- `src/studio/home/home.css`: home and board setup. `fonts.css` loads bundled DM Sans and Fraunces.

## Foundations

| Foundation       | Current rule                                                                            |
| ---------------- | --------------------------------------------------------------------------------------- |
| Interface type   | DM Sans, with system sans-serif fallback; mostly 400 and 500 weights                    |
| Display type     | Fraunces for home headlines; inspector and library headings use interface type          |
| Type scale       | 11, 13, 15, 18, 24, 32px; fluid hero type                                               |
| Surfaces         | Workspace `#f5f5f7`, sheet `#fffdfc`, muted sheet `#f8f8fa`                             |
| Text and actions | Ink `#1e1a36`, secondary `#5f5a7a`, violet `#4a3fd8`                                    |
| Spacing          | 4, 8, 12, 16, 24, 32, 40px; 1px borders and optical adjustments are explicit exceptions |
| Geometry         | 72px tool rail; bounded library and inspector widths; ordinary controls stay flat       |
| Elevation        | Soft layered shadows for floating tools, menus, pickers, and dialogs                    |
| Material         | 94% sheet color with 20px blur on floating chrome; sheet color remains the fallback     |
| Motion           | Feedback 120ms, popovers 180ms, panel entry 240ms, exit 120ms; shared easing tokens     |

The desktop workspace has three explicit columns and one row: library, flexible canvas, inspector. Closing the inspector releases its column. The inspector docks on the right and scrolls independently; it is not a floating formatting dialog on desktop. Its sections use hairlines instead of nested cards.

The contextual toolbar stays within the canvas area. Typography controls, fill, flip, image operations, formatting, and opacity remain available. Clipboard, layer order, alignment, grouping, locking, and deletion live in the context menu. The floating footer contains canvas settings and zoom.

Library content fades and shifts slightly on entry. Closing preserves the column for the 120ms content fade, then releases it in one layout change. Width and height do not tween, keeping Konva geometry synchronized. Reduced motion removes animation and skips the sidebar exit delay. Popover animation uses individual scale/translate properties so viewport-positioning transforms remain intact.

## Shared controls and accessibility

`src/studio/ui/` supplies Button, IconButton, TooltipProvider, Menu/Submenu, Popover, and Dialog. Buttons preserve native form, disabled, keyboard, and ref behavior. Tooltips use `data-tip` and `aria-describedby`; icon buttons require accessible names.

Popover handles viewport positioning, edge flipping, resize, scroll, outside dismissal, and Escape. A nested color picker belongs to its inspector and does not dismiss it. Dialog handles focus entry, Tab containment, Escape, and focus restoration. Menus support hover and arrow-key navigation.

All seven `outline: none` declarations have replacements: button, icon button, input/select, segmented item, swatch, board-title input, and page select receive a focus shadow. The editor's `:focus-visible` rule supplies a 2px violet outline. `UnifiedInspector` passes `title` to `AppearanceSurface` as its visible heading, not a native DOM tooltip attribute.

## Verification

Run `node scripts/audit-css.mjs` for PostCSS rule-node counts (including keyframe steps) and the brief's literal opening-brace metric across all source CSS. They are different measurements; neither may be relabeled to improve the result. `--duplicates` lists repeated selector/context pairs for further consolidation.

Lint checks token references and shared-control use. Unit tests lock token contrast and canvas colors. Desktop browser tests verify inspector placement for shape/text/image at 1366 and 1920 pixels, useful fitted zoom, compact toolbar height, scrolling, repainting, keyboard focus, nested pickers, and reduced motion. Screenshots provide the visual review that build and unit tests cannot.

See [Desktop craft report](DESKTOP_CRAFT_REPORT.md) for measured results, artifacts, and remaining test limitations. Older Fluent and v4/v5 design documents are historical proposals.
