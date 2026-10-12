# VisBo design system

The editor and home screen share the Microsoft Fluent light palette, one interface font, and one CSS entry point. Board artwork retains its own colors and fonts.

## Phase G: Craft Pass (2026-10-12)

**Contrast tokens** (corrected, see `src/studio/design-system/foundations.css` for values):
- Text/surface, text-secondary/surface and /workspace, placeholder/surface and /surface-muted ≥ 4.5:1
- Control borders, focus ring ≥ 3:1; UI icons ≥ 3:1 against their surface
- Canvas tokens (`--gs-canvas-*`) consumed via `colors.ts` for Konva; locked by `foundations.contrast.test.ts`

**Motion** (see `foundations.css`):
- Durations: `--gs-duration-overlay`, `--gs-duration-pop` (160ms), `--gs-duration-toast`
- Easing: `--gs-ease`, `--gs-ease-out`; `prefers-reduced-motion` disables animation
- No `transition: all`; no width/height animations on layout

**The 12 gates** (measured per phase, see final report):
1. Contrast ≥ 4.5:1 (text), ≥ 3:1 (borders/focus)
2. CSS rule count decreases (components.css + studio-v2.css)
3. No `transition: all`
4. Hover only under `(hover: hover)` media
5. No `outline: none` without visible ring
6. Type scale compliance (no off-scale font sizes)
7. Spacing on 4pt scale
8. Icon-only controls have `aria-label` + `data-tip`, no `title`
9. Focus visible on all interactive elements
10. Reduced motion respected
11. Copy: sentence case, verbs first, errors say what+what-to-do
12. No dead code (unused CSS rules removed)

**CSS rule**: Every rule added to `components.css` must remove the older duplicate of the same selector — net rule count goes DOWN.

## Sources of truth

- `src/studio/design-system/fluentTheme.ts` installs official Fluent tokens on the document root, including portals.
- `foundations.css` maps them to application `--gs-*` tokens. Palette literals belong here; the color-picker spectrum is intentionally color-accurate.
- `index.css` declares the cascade: tokens, base, components, utilities.
- `primitives.css` owns shared button and overlay presentation, focus, and reduced motion.
- `components.css` owns home, library, toolbar, formatting, and export layouts. The previous v5 sheets and interaction override stack have been removed.

## Foundations

| Foundation     | Rule                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------- |
| Interface font | Fluent system sans-serif; no external UI font download                                                        |
| Type scale     | 11px metadata, 13px controls, 15px subheadings, 18px titles, 24px main headings                               |
| Display font   | Georgia for affirmation previews; board text presets remain independent                                       |
| Palette        | Neutral surfaces and text; Fluent blue for actions and selection; semantic success, warning, and error states |
| Spacing        | 4, 8, 12, 16, 24, 32, 40px tokens                                                                             |
| Corners        | Fluent control and surface radii; pill and circular swatches are explicit exceptions                          |
| Elevation      | Floating menus, toolbar, pickers, and dialogs; ordinary controls stay flat                                    |
| Motion         | Shared feedback and overlay durations, one easing curve; reduced motion disables animation                    |
| Layers         | Canvas 0, panels 10, toolbar 20, menus and formatting 30, nested picker 35, modal 40, tooltip 50              |

## Shared controls

`src/studio/ui/` supplies Button, IconButton, TooltipProvider, Menu/Submenu, Popover, and Dialog.

Buttons preserve native disabled, keyboard, form, and ref behavior. Icon buttons require accessible names. One global tooltip provider reads `data-tip`, shows on hover and focus, connects through `aria-describedby`, and dismisses on activation or Escape.

Popover owns viewport positioning, edge flipping, resizing, scroll tracking, outside dismissal, and Escape. Formatting, opacity, and the shared color picker use it. Formatting recognizes its owned color-picker portal so changing a color keeps formatting open.

Dialog owns focus entry, Tab containment, Escape, and focus restoration. Export uses it instead of a document-wide query for the first dialog.

Menu allows one active submenu at a time. Layer and alignment open on hover. Pointer movement between trigger and submenu is supported; Arrow Right opens, Up/Down/Home/End navigate, and Arrow Left or Escape returns to the parent. Touch users can tap the trigger. Menus flip at viewport edges.

## Editor hierarchy

The board is the focus against a neutral workspace. The floating selection toolbar changes with the selected object: text gets typography, shapes get fill, images get applicable crop/replace controls, and all selections get opacity. Clipboard, layer order, alignment, grouping, locking, and deletion live in the context menu.

Formatting is a compact, scrollable popup with labeled fields. It does not resize the canvas. The footer contains zoom and canvas settings; page and board-item controls are absent.

A new board opens theme artwork once. Reopening or reloading preserves the saved board URL and leaves the library closed. Home lists saved boards and provides topic/year and orientation setup.

## Checks

- `npm run lint` checks CSS token references, rejects competing palettes and `!important`, and requires shared buttons and tooltips in the editor UI.
- `npm run format:check` checks formatting.
- `tests/ui-refactor.spec.ts` covers board creation/search/reload, formatting and nested pickers, hover and keyboard menus, export focus, mocked AI affirmation insertion, and narrow-screen layout.

The older v4/v5 design documents are historical proposals. This document describes the current implementation.
