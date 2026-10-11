# Atelier design-system continuation

Branch: `feat/tweakpane-phase0-audit`.

## Phase checkpoints

- A `e55ad6f`: shared Atelier tokens, bundled DM Sans/Fraunces fonts, Fluent removal, superseded V5 documentation.
- B `31c54fa`: button variants/sizes, shared Toast/Skeleton/Swatch primitives, tooltip and accessible-label conventions.
- C `7582608`: shell/header/rail styling, responsive library/dock sizing, canvas dot grid, zoom reset/notch, overlay feedback and reduced motion.
- D `2c25ddd`: panel/inspector styling, named palettes, upload drag-and-drop, disabled connection hint, shrink warning, default-open object settings, mobile inspector breakpoint.
- E `6819e8d`: shared Konva UI colors, preserved legacy content-color defaults, supplied custom glyphs, harmless stale-target technical controls.
- F: homepage token alias removal, thumbnail skeletons, focus cleanup, obsolete error-overlay CSS removal, updated browser regressions.

The existing Tweakpane D1/D2 flag logic, storage schema, appearance command pipeline, curated appearance restrictions, and canvas interaction architecture remain intact. No new editing system or package dependency was added.

## Validation

Lint, 122 unit tests, TypeScript checking (included in build), and production build pass at the phase checkpoints. Final browser regression run: **27 passed** across D1, D2, repeatable fit-to-screen, and editable `.visbo` restoration. These include rich-text precedence, undo/redo, save/reload, PNG parity, curated/photo exclusions, multipage switching, lifecycle disposal, and mobile touch controls.

Updated tests follow the existing export behavior (Original PNG is 2x), named color swatches, the ObjectDock complementary landmark, full-width mobile sheets, and default-open object settings. The development-only lifecycle fixture no longer imports the removed Fluent module.

Visual browser checks at 1366x768: canvas width 758px with both side panels open, DM Sans UI, no horizontal overflow. At 390x844: no horizontal overflow. With reduced motion: dock animation is `none`. Sampled rendered icon-button controls all have accessible labels and tooltip attributes.

CSS coverage sampled four compiled stylesheets: 266,516 text units, 117,881 exercised. This is sampled interaction coverage, not proof that all remaining rules are dead. Only the obsolete `.vs-error` rule was removed after source search confirmed no consumer. Broad CSS deletion and folding `studio-v2.css` remain deferred until broader state coverage proves them safe.

Existing build warning: large main bundle; no unrelated bundling changes were made.

## Local blank-screen recovery

The long-running Vite server on port 5173 served a stale ZoomControls module with no named export, despite the correct source file. Restarted the confirmed repository Vite process using `npm run dev -- --port 5173 --strictPort --configLoader runner`. Verified homepage startup and creation/rendering of a new board in an isolated browser profile. No user browser storage was cleared or migrated.

## Rollback

Changes are isolated in phase commits; revert the desired phase commits in reverse order rather than resetting the working tree. No storage rollback is required for this design-only continuation. Existing v3 recovery documentation remains unchanged. Refresh or restart the dev server after reverting. Changes have not been pushed.
