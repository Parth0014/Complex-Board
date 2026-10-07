# Gratitude Studio — V5 UI/UX Redesign Plan

Fresh identity: **Gratitude Studio** (consistent name, new visual system — no carry-over from the
previous warm/plum aesthetic). Cool graphite + paper + cobalt accent. Every glyph in the
chrome is a Lucide icon; every interactive control carries a tooltip.

## 1. Complete UI element inventory (from code audit)

### A. Document scope (header)
Brand mark + wordmark · editable board title · save status · undo/redo · canvas-size
selector · File menu (save backup / restore backup) · New board · Export/Share ·
global error banner.

### B. Add-to-board library (left)
Tabs: Templates · Elements · Uploads · Text · Create · Background · AI.
- Templates: layout starter cards with SVG previews, apply actions.
- Elements: search field, category select, result count, 250-asset grid (drag + click),
  empty state with filter reset.
- Uploads: photo picker (PNG/JPEG/WebP, 25 MB), drag-onto-canvas tip, status/error
  messages, download-original action, privacy note.
- Text: typographic preset list (live font/color samples), one-tap insert.
- Create: 10 quick shapes, connect-selection, goal/affirmation card composer,
  17 composition themes + apply/replace flow, clipboard copy/paste, shape-assist toggle.
- Background: page color picker + swatches, gradient end-color + linear/radial blend,
  textures hand-off to Elements.
- AI: mode select (image / affirmation / editable board / curated search / edit image /
  animate), prompt box, region-mask controls, generate/cancel, result preview,
  insert / replace / use-as-background, suggested assets.

### C. Canvas tools (drawing)
Select · Pan · Pen · Marker · Highlighter · Eraser.

### D. Selection scope (contextual)
Type/count summary · inline text edit · text size · text color · text-style menu
(bold/italic/underline/align/spacing/line-height) · graphic-style menu (flip/border/
shadow) · duplicate · position menu (align/distribute) · opacity slider · group/ungroup ·
lock/unlock · "open full properties".

### E. Inspector (right)
Style: quick actions (copy/paste/arrange/rotate/delete, style copy/paste), geometry
(X/Y/W/H/rotation), connector detach, rich text formatting (range bold/italic/underline/
super/sub, kerning, ligatures, font, text background, strike, case, weight, curve),
fill + gradient, quick-style presets, color/shadow/stroke/effects, shape→frame, no-fill,
pen width, media replace, frame shape, image AI tools (remove bg, resample, AI upscale,
split layers, match colors), SVG recolor, brightness/contrast/saturation/blur/warmth/tint,
filters, fit/fill/original preview, crop editor, frame content attach/detach.
Layers: nested group tree, select, visibility, lock, drag-reorder, arrange, group scope.

### F. View scope (bottom)
Board-items outline popover · page switcher · add/delete page · page dimensions ·
zoom out/slider/in/percent · fit.

### G. Dialogs
New-board confirm · Export dialog (PNG / 2× PNG featured; JPEG / transparent / PDF /
4K / PDF-all; asset credits; print; privacy note).

### H. Canvas-native
Snap toggles (rendered by KonvaStage) · artboard · canvas messages.

## 2. Placement plan — "Graphite" layout

Principle: one zone per scope, ordered by frequency. Document → Add → Draw → Select →
Refine → View. Floating cards keep the board visually dominant; dark pills for
canvas-floating controls, light cards for panels.

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER (56px, graphite)                                      │
│ [mark Gratitude Studio] [board title · saved]  [undo|redo][New] │
│                                         [Export][···]        │
├──────────┬───────────────────────────────────────┬───────────┤
│ LIBRARY  │  [tool pill: select·pan‖pen·…·eraser] │ INSPECTOR │
│ dock     │  [selection pill — only on selection] │ card      │
│ (float   │                                       │ (float   │
│ card,    │           B O A R D                   │ card,     │
│ 300px)   │        (dotted workspace)             │ 300px)    │
│ icon     │                                       │ Design│   │
│ rail +   │  [pages pill]              [zoom pill] │ Layers   │
│ panel    │  (bottom-left)            (bottom-right)│         │
└──────────┴───────────────────────────────────────┴───────────┘
```

- **Header (dark graphite):** brand left; title + save status center-left; undo/redo
  segmented control, New (ghost), Export (primary cobalt), overflow menu (File: backup/
  restore; canvas size) right. Canvas-size moves out of the header row into the menu.
- **Library dock:** single floating card — 52px icon rail + content pane. AI sits below a
  divider with a sparkle badge. Panel interiors keep all current controls, restyled.
- **Tool pill (top-center, dark):** icon-only tools with tooltips + labels via tooltip.
  Pen/marker/highlighter/eraser grouped after a divider.
- **Selection pill (top-center, attached under tool pill, dark):** type chip, quick text
  controls when a single text item is selected (B/I/U, size, color), Duplicate, Group,
  Align menu, Opacity menu, Lock, Delete, divider, "Design" button toggling the
  inspector. Overflow scrolls horizontally on narrow screens.
- **Inspector (right floating card):** segmented Design/Layers. Design is organized into
  labeled sections — Actions · Position · Text (text only) · Appearance · Image (asset
  only, advanced groups collapsed) — instead of the flat heading soup. Layers keeps the
  tree + arrange + exit-group.
- **Bottom-left pill:** board-items popover, page selector, add page, delete page.
  Page dimensions move into the page selector tooltip.
- **Bottom-right pill:** zoom out, slider, percent, zoom in, fit.
- **Snap toggles:** small floating chip, bottom-center of canvas.
- **Dialogs:** centered cards; export keeps every format + utility + privacy note.

## 3. Icon system — Lucide everywhere

- `lucide-react` added as a dependency. `src/studio/icons.tsx` becomes the single icon
  surface: one component per semantic icon (e.g. `SelectIcon`, `HandIcon`, `UndoIcon`),
  all rendering Lucide glyphs at a consistent 24-grid / 1.8 stroke.
- Zero emoji / text-glyphs in chrome (replaces ↖ ✋ ✎ ▰ ▱ ⌫ ↶ ↷ ♡ ✦ ⌕ ↑ ◇ ○ ● 🔒 ••• ↓).
  Shape *previews* in CreatePanel become Lucide geometry icons.
- **Tooltips everywhere:** every icon-only button gets `data-tip="…"`; a CSS-only
  tooltip system (`[data-tip]`) renders consistent dark tooltips on hover *and*
  keyboard focus. Text buttons keep `title` as well. No control is icon-only without
  an accessible name + tooltip.

## 4. Responsive

- ≥1280px: full layout above.
- 920–1280px: inspector overlays as a right sheet when open; library narrows.
- <920px: header condenses (title shrinks; canvas-size/backup move into ···);
  library becomes a bottom sheet with a horizontal tab bar; inspector becomes a
  bottom sheet; pills remain floating; selection pill scrolls.

## 5. What is NOT changing

All editor logic, adapter calls, keyboard shortcuts, document model, canvas engine,
export pipeline, AI flows, and every Playwright-visible accessible name / button text.
Only markup structure, class names, icons, tooltips, and CSS change.

## 6. Verification

`tsc --noEmit` → `vite build` → Playwright smoke (desktop 1440×900 + mobile 390×844):
open each library tab, select an object, open inspector Design/Layers, export dialog,
screenshot review. Zero page errors.
