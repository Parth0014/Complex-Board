# Phase C: unified appearance rendering and persistence

Implemented on `feat/tweakpane-phase0-audit`, 2026-10-11. Phase A/B were accepted
by the user. This phase activates document v3 and appearance v1 together; Phase D
and Tweakpane integration have not started. No dependency changes were required.

## Commits and changed files

- `d330bff`: expanded legacy fixture and canvas/PNG references, captured before activation.
- `dbb414b`: archived-page and actual multipage PDF/page references, captured before activation.
- `d0849f0`: `feat: activate unified appearance rendering and persistence`. It contains the
  rendering, writers, factories, loading, persistence, recovery and tests together.
- A following documentation/evidence commit records this report and final captures.

Exact Phase C inventory (including reference commits):

| Area                               | Files                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model, import boundaries, commands | `src/vision/document.ts`; `src/vision/appearance/{activation,capabilities,controls,defaults,legacy,legacyValidation,migration,types,update}.ts`                                                                                                                                                                                                           |
| Shared renderer and adapter        | `src/vision/canvas/{appearance,KonvaCanvasAdapter}.ts`; `src/vision/canvas/{ItemContent,KonvaStage,RichText,renderPage}.tsx`; `src/vision/contracts.ts`                                                                                                                                                                                                   |
| Existing controls and thumbnail    | `src/studio/{EditorFeatures,SelectionToolbar}.tsx`; `src/studio/boards/BoardPreview.tsx`                                                                                                                                                                                                                                                                  |
| Storage and template boundary      | `src/vision/storage.ts`; `src/vision/collageTemplates.ts`                                                                                                                                                                                                                                                                                                 |
| Unit coverage                      | `src/vision/appearance/{appearance,loading,runtime}.test.ts`; `src/vision/{storage,connectors}.test.ts`; `src/vision/canvas/interaction.test.ts`                                                                                                                                                                                                          |
| Browser coverage                   | `tests/appearance-helpers.ts`; `tests/{appearance-legacy,appearance-phase-c,appearance-preview,appearance-recovery,ui-refactor}.spec.ts`                                                                                                                                                                                                                  |
| Legacy fixtures                    | `tests/fixtures/{appearance-phase-c-v2,appearance-archive-v2,appearance-multipage-v2}.json`                                                                                                                                                                                                                                                               |
| Capture/recovery tools             | `scripts/capture-appearance-{baseline,multipage}.mjs`; `scripts/appearance-recovery.mjs`; `scripts/appearance-recovery-browser.mjs`; `scripts/appearance-recovery.d.mts`                                                                                                                                                                                  |
| Documentation                      | `docs/{APPEARANCE_WRITE_PATHS,UNIFIED_APPEARANCE_PLAN,UNIFIED_APPEARANCE_PHASE_C_REPORT}.md`; `src/vision/appearance/README.md`                                                                                                                                                                                                                           |
| Evidence                           | `exports/appearance-legacy/{phase-c,archive,multipage-first,multipage-second}.png` and corresponding `-canvas.png`; `exports/appearance-legacy/multipage.pdf`; `exports/appearance-canonical/{cards,styles,phase-c,multipage-first,multipage-second}.png` and corresponding `-canvas.png`; `exports/appearance-canonical/{multipage.pdf,comparison.json}` |

`git diff --name-only cb8de09..HEAD` is the machine-readable committed inventory.
Existing `exports/tweakpane-phase0/current-ui-tests/` was left untouched.

## Authoritative model and Konva mapping

Every editable text, shape and drawing stores exactly one `appearance` object.
The discriminant is `text`, `closed-shape`, `open-shape` or `drawing`; version is 1.
Assets retain the separate existing media schema. Editable legacy style fields are
rejected by canonical validation and by generic `patchItems` writes.

- Fill: `{enabled, paint}`. Paint is solid or a two-color linear/radial tuple.
- Stroke: color, width, solid/dashed/dotted style, cap, join and transform/fixed scaling.
- Common: opacity, explicit shadow values, existing effect identifier and silhouette outline.
- Text alone: background color or null. Glyph stroke, text fill and background are independent.
- Open shapes/drawings: stroke only; no artificial fill model.

`canvas/appearance.ts` converts canonical paint/stroke/shadow values into Konva
properties. Existing gradient coordinates, dash patterns, geometry and path scaling
are retained. Outer object groups apply opacity once. `ItemContent` owns the existing
effect branches, text background and silhouette rendering; both live canvas and
page/export rendering use it. No alternative renderer was introduced.

Open drawing Lines retain Konva's existing fill-enabled compositing flag because it
affects perfectDraw buffering with shadow/opacity. Their scene remains stroke-only;
the appearance schema does not gain a fill. Removing that flag produced a measurable
legacy mismatch during validation and was corrected before acceptance.

RichText resolves character paint and typography without rewriting runs. Explicit
run colors are solid even when equal to a gradient's first stop; unformatted runs
keep the object gradient. Explicit false formatting overrides object defaults.
This corrects the documented old gradient/run-color precedence bug. It is intentional
and separately tested rather than disguised as legacy pixel equivalence.

## Appearance writer replacement inventory

| Previous writer                                                                            | Current authoritative operation                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| SelectionToolbar color/fill/stroke/opacity                                                 | `changeAppearance` or `setAppearanceField` to `updateAppearance`                                            |
| EditorFeatures fill, noFill, gradients, borders, shadows, backgrounds, effects, silhouette | Typed canonical field projection to the same validated update function                                      |
| ContextActions Copy/Paste Style                                                            | Canonical whole-style command; target stroke scaling preserved; typography included in one existing gesture |
| ContextActions duplicate/group and other object operations                                 | Preserve canonical appearance while existing geometry/identity operations run                               |
| Text/Quick Shape/Drawing/connector creation                                                | Canonical factory values directly                                                                           |
| Legacy template definitions                                                                | `migrateItem` at the actual import boundary only                                                            |
| Generic editable-object style patches                                                      | Rejected; content, typography, runs, geometry and media patches remain valid                                |
| Shape converted into photo frame                                                           | Explicit kind conversion to existing media fields, removing canonical appearance                            |

Photo controls keep their existing asset-only fields. Curated assets are ineligible
for canonical updates; saved curated records remain unchanged. This is the existing
object-kind boundary, with no origin/provenance markers. Explicit text range edits
remain run-data commands; object defaults never overwrite those runs.

Glow/outline selection materializes preset values into canonical shadow/stroke.
Leaving a preset clears its preset values; explicit shadow/stroke customization
leaves that preset tag so a later effect removal does not erase manual settings.
Mixed selections apply only capabilities supported by each member. Locked/stale
objects and no-ops do not create empty history entries. Continuous gestures still
coalesce into one undo command.

## Migration, save/reload and activation

The same deterministic migration validates every document boundary: normal URL
loading, library listing/extraction, backup restoration, system clipboard, internal
copy/duplication and multipage current/archived collections. Portable media envelopes
and existing provider validation stay in their original loader. Migration is
nonmutating, versioned, idempotent and tested across JSON serialization.

New objects/documents use canonical properties directly. Normal saves validate v3.
Before first overwriting a v1/v2 stored record, storage preserves the exact original
under `appearance-recovery:v2:<key>` in the same transaction. Multipage library
extraction preserves the raw original record as well. Later saves cannot overwrite
that recovery snapshot. Current library listings exclude recovery keys.

`VITE_APPEARANCE_PERSISTENCE=preview` provides a validation build using the same
canonical renderer and in-memory migration while suppressing board persistence and
library extraction writes. It displays `Preview (not saved)`. This is not a second
rendering/editing architecture. Normal builds activate v3 persistence and rendering
together in the coordinated commit.

Tests cover immediate canvas updates, selection changes, save/reopen, undo/redo,
groups, duplicate, style paste, rich runs, unrelated/locked objects, preserved
geometry, actual IndexedDB recovery snapshots and new-format backup/clipboard
round trips. Existing AI affirmation insertion and marquee preview tests pass.

## Before/after evidence

Legacy references were committed before the renderer switch. Final evidence and
SHA-256 comparisons are in `exports/appearance-canonical/comparison.json`.

| Required category                                                   | Evidence                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Solid text, gradient text, mixed rich text, text outline/background | Expanded `phase-c` fixture plus original `styles`                          |
| Rectangles/rounded rectangles; circles/stars/hearts/complex shapes  | Expanded fixture, including triangle/cloud/blob/burst and vector paths     |
| Linear/radial two-color gradients; shape borders/dashes/shadows     | Expanded and original style fixtures                                       |
| Open drawing strokes/opacity/width; scaled/rotated shapes           | Expanded fixture and real control/node assertions                          |
| Existing goal/affirmation card objects                              | Original saved-card fixture, migration/edit tests and `cards` capture      |
| Multipage output                                                    | Current and archived canvas/PNG references and actual all-pages PDF export |

All six final exports (`cards`, `styles`, `phase-c`, both multipage PNGs and PDF)
are **byte-identical** to legacy output. Five matched canvas captures have **zero
changed pixels** in the fixed viewport region x=80..1439, y=150..939 (artwork and
canvas; excludes header/footer hover/status). The browser expanded test also compares
the actual board bounds with maximum channel difference 0. No rendering tolerance
was needed. The saved-card screenshot uses the same closed-panel viewport as its
reference. The explicit rich-gradient precedence correction has separate real-node
assertions and is excluded from claims of equivalence to the old bug.

## Validation results

- `npm test -- --configLoader runner`: **18 files, 109 tests passed**.
- `npm run lint`: passed, including shared UI-token/cascade checks.
- `npm run build -- --configLoader runner`: passed; TypeScript passed as part of build.
- Main focused browser run: **17 passed** (`appearance-legacy`, `appearance-phase-c`, `ui-refactor`).
- Preview-mode and actual old-renderer recovery browser run: **3 passed**.
- `git diff --check`: passed.
- Changed source/test/script/document formatting checks: passed. Whole-repo format
  check still reports untouched `src/vision/text.ts`, `tests/fixtures/appearance-v2.json`
  and `tests/fixtures/legacy-cards.json`; these were not reformatted out of scope.

Two concurrent final browser invocations initially collided in the shared Playwright
trace directory (`browserContext.close` ENOENT). Both suites were rerun sequentially
and all 20 passed. No application change was made for that collision.

Windows default Vite config loading hits sandbox directory-access errors; the
recorded `--configLoader runner` command avoids it. Browser/development processes
required sandbox escalation. The existing large-chunk build warning remains.
The historical full browser baseline's 3 setup failures in `advanced.spec.ts` and
63 unrun tests remain documented separately in the Phase A/B report. They were not
fixed or counted as new regressions; this report claims the focused 20-test suite.

## Recovery and rollback

**Old application code cannot read active v3 documents. Do not switch branches first.**
Use the explicit recovery tools before rolling back; no reverse converter is part
of live rendering or saving, and the editor never dual-writes v2.

1. Save portable backups for valuable projects through the existing File menu.
   Preserve these v3 files and verify that downloads finished. They include the
   portable media data; the raw recovery snapshot below is not a portable media backup.
2. Stop other editor tabs/server instances. On this Phase C branch, start a preview
   development server at the **same browser origin and port** used for those saved
   projects (IndexedDB is origin-specific):

   ```powershell
   $env:VITE_APPEARANCE_PERSISTENCE='preview'
   npm run dev -- --port 5173 --strictPort --configLoader runner
   ```

   Replace 5173 if your actual origin uses another port. Open that same origin.

3. In that tab's browser DevTools console run:

   ```js
   const recovery = await import('/scripts/appearance-recovery-browser.mjs');
   await recovery.rollbackBoardStore();
   ```

   The utility validates **every** v3 conversion before changing any project,
   initiates download of `appearance-storage-before-rollback.json`, then converts
   boards atomically after verifying none changed concurrently. Check the returned
   count and retain the downloaded snapshot. Media storage and original recovery
   records are untouched. Unsupported styles abort the entire operation.

4. Stop the validation server, clear its environment variable, then create a local
   rollback branch from accepted A/B code and run it at the same origin:

   ```powershell
   Remove-Item Env:VITE_APPEARANCE_PERSISTENCE
   git switch -c rollback/appearance-phase-c cb8de09
   npm run dev -- --port 5173 --strictPort --configLoader runner
   ```

   `cb8de09` keeps the accepted generator removal and inactive Phase B schema.
   The isolated browser test confirms converted storage loads in the actual legacy
   runtime and its representative PNG is byte-identical. Old library code may show
   extra original recovery snapshots because it predates their exclusion filter.

For a separate portable file, without touching storage:

```powershell
node scripts/appearance-recovery.mjs my-v3-backup.json recovered-v2-backup.json
```

The CLI refuses to overwrite its input or an existing destination. It retains media,
pages and object data. Downgrade refuses semantics old code cannot express: changed
stroke cap/join/scaling, zero-width open paths, line/arrow shadows, or rich gradients
with explicit character colors. Keep those v3 projects on this branch; do not
flatten or silently discard styles. Original pre-migration recovery records can
recover the old state, but do not contain edits made after migration. Preview mode
alone does not convert existing v3 storage. Automated rollback tests used isolated
browser storage; no user project was rolled back during implementation.

## Limitations and Phase D readiness

Only existing two-color gradients and effects are supported. Library thumbnails
remain the existing approximate SVG previews; full canvas/exports share Konva.
Existing controls remain in place, with semantic text outline/background/open-stroke
bindings; no new inspector component or Tweakpane dependency was added.

Phase C acceptance gates pass for the documented focused suite and fixtures.
Phase D can bind Tweakpane directly to `controls.ts` projections and adapter
`changeAppearance`/`setAppearanceField`, using existing gesture boundaries. It does
not need a new schema, renderer, persistence format or compatibility writer. Pane
lifecycle, mixed-selection presentation and control replacement remain Phase D.
