# Second UI review follow-up

## Shipped changes

- File has a Resize board dialog with consistent Square, Landscape and Portrait names. Objects retain their geometry, the dialog explains edge clipping, Cancel leaves the document intact, and resizing is undoable.
- Export uses one name throughout. Buttons are named by their visible content; the 2× PNG option describes its actual resolution.
- Discover checks availability before search, offers a retry, and uses readable unavailable/error states. Generation also waits for availability and avoids exposing setup messages.
- The home screen explains how to back up editable boards and what clearing browser data means. App loading and failures use existing Skeleton and Toast components.
- Fonts have search and typeface previews. Existing document commands still work from font options; the search field retains native text editing.
- Color controls accept bare or prefixed hex, offer recent colors and accessible saturation/brightness sliders, and expose screen sampling where the browser supports EyeDropper. Content fills support alpha; board backgrounds and SVG color replacement retain their existing opaque-color contract.
- Non-empty pages offer Add or Replace for scrapbook templates. Replacement commits atomically after preparation, preserves Undo, and cannot overwrite intervening edits. A revision-scoped Undo action prevents accidentally undoing unrelated later work.
- Photo arrangement explains the established 5–10 image requirement and the remaining selection count. That product constraint is intentionally preserved.
- Drawing controls use Select, Pen, Marker, Highlighter and Eraser consistently. Snap to edges has a direct toggle. Existing Canvas settings still contains the three distinct alignment/edge/ratio preferences.
- File ? Keyboard shortcuts and `?` open an accessible cheat sheet. Header history hints use platform-appropriate modifier names.
- README describes the real SVG library. Superseded V5 design plans are under `docs/archive/`.

## Review findings already addressed

The earlier pass consolidated numeric inputs, isolated experimental inspectors, split Edit/Layout/Layers and component CSS, added layer move buttons, raised zoom to 400%, added deletion Undo, and removed the Discover badge. Those findings do not require a second implementation. Inactive HybridQuickBar experiments are not production controls.

## Legacy browser suite triage

The earlier diagnostic (41 passed, 66 failed, 28 skipped) used a 10-second timeout and is not a current product-quality score. Its error traces include removed goal-card generators, old AI tab names, old inspector field names/landmarks, obsolete template catalogs, and expired export labels. Some failures are pixel/anchor assertions and require rendered checks rather than dismissing them as selector drift. Current focused coverage exercises export, clipping, saved previews, keyboard history, crop, zoom anchoring, sidebar layouts and the new flows. No legacy feature was restored merely to satisfy an obsolete test. The whole historical suite must not be described as green.

## Validation

The five preflight gates passed: format, lint, typecheck, 269 unit tests and production build. The focused browser run passed all 48 checks across twelve files, including responsive dialogs, resizing without image distortion, real PNG download, font selection, template replacement/Undo, unavailable search, saved previews, crop, keyboard history and canvas geometry. Older geometry tests now use viewport coordinates and respect the deliberate removal of horizontal wheel panning.

Native screen-sampling UI and live provider credentials are external capabilities; mocked availability checks do not prove those services are online. The entire historical browser suite was not rerun and is not claimed green.
