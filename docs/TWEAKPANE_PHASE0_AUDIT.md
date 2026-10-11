# Tweakpane Phase 0 audit — 2026-10-11

Status: **Phase 0 gate blocked. Phase 1 has not started.**

The attached `COMPLEX_BOARD_TWEAKPANE_CODEX_PLAN.md` was read completely. Its explicit hard-stop rule for ambiguous Quick Shape provenance applies. No application code, dependency declarations, lockfile, curated assets, renderer, schema, storage, history, or canvas interactions were changed.

## Repository and branch

- Origin: `https://github.com/Parth0014/Complex-Board.git`.
- Local HEAD and fetched `origin/master`: `fc4211d30520badf1d4b563c6abd1a03742d5628`.
- Initial working tree: clean.
- Dedicated branch: `feat/tweakpane-phase0-audit`.
- No deployment or updates to master.

## Baseline validation

| Command | Result |
| --- | --- |
| `git fetch origin master` | Pass; target matches reviewed commit. |
| `npm ci` | Failed: Windows EPERM unlinking an esbuild executable held by a running process. |
| `npm install --ignore-scripts` | Restored existing dependencies; no package/lockfile diff; 0 reported vulnerabilities. Cleanup warnings for locked esbuild/Rollup binaries remain. This does not substitute for a passing clean-install gate. |
| `npm run build` | Pass after restoration; existing bundle-size warning. |
| `npm test` | Pass: 15 files, 55 tests. |
| `npm run lint` | Pass, including shared-token/cascade checks. |
| `npx playwright test --max-failures=3` | Failed: 3 failures; 63 tests not run after failure cap. Not a full-suite pass. |
| `npx playwright test tests/ui-refactor.spec.ts --output=exports/tweakpane-phase0/current-ui-tests` | Pass: 7 tests. |
| `node tmp/tweakpane-baseline.mjs` | Pass after correcting the audit script's shape action label to Appearance and starting the preview server. Screenshot, PNG and backup captured. |

The three pre-existing browser failures are `tests/advanced.spec.ts:13`, `:55`, and `:81`. Each navigates to `/` and waits for Text/Create tools before creating or opening a board. The current home screen has no such tool buttons. All time out at this setup step, before testing their stated features. Their traces and error contexts are under `test-results/advanced-*`; no tests were rewritten to hide these failures.

The current regression checks pass marquee preview, board creation/search/reopen, text formatting/persistence, context-menu navigation, export focus, AI affirmation insertion, and narrow viewport placement. They do not prove new Tweakpane contracts because no Tweakpane implementation exists yet.

Baseline artifacts:

- `exports/tweakpane-phase0/rectangle-inspector.png`: existing inspector screenshot.
- `exports/tweakpane-phase0/rectangle-export.png`: existing PNG export, visually inspected.
- `exports/tweakpane-phase0/rectangle-board.json`: existing backup format with a Create rectangle.
- `tmp/tweakpane-baseline.mjs`: reproducible capture script; requires the local preview on port 4173.

Only a representative rectangle was captured; the full proposed fixture set and its export parity remain unverified.

## Blocking provenance conflict

`KonvaCanvasAdapter.createShape()` creates a shape with `shape`, `color`, `fill`, and group fields, but no creation-origin marker. `createCard()` creates rectangle/circle/heart/star decorations without template or goal provenance. Template shapes usually have `templateId`/`slotId`, which excludes those cases but does not exclude goal-card decorations after ungrouping.

Testing `fill` presence is unsafe: `copyStyle()` includes `fill`, and `pasteStyle()` copies it to any selected item of the same kind. A goal-card decoration can acquire the apparent Quick Shape signature; a saved Quick Shape can lose it. Dimensions, colors, grouping, and generated IDs are also editable or shared and are not trustworthy provenance.

Consequently a guard based only on kind/shape and absence of template fields would enable editing for out-of-scope decorations. A more restrictive heuristic would reject some existing saved Quick Shapes. Neither satisfies the plan's scope and backward-compatibility requirements.

The attachment explicitly says to stop if “A supposedly editable Quick Shape cannot be reliably distinguished from other shape provenance.” Phase 1 cannot proceed by silently guessing or adding a schema field.

Decision needed: approve a separately scoped provenance proposal, including how legacy ambiguous saved shapes are treated. A durable origin marker on newly created Quick Shapes is one possible proposal, but requires explicit schema-boundary approval and a legacy policy; it is **not implemented** here. Keeping ambiguous legacy shapes read-only would need acceptance of that limitation. No historical origin can be reconstructed reliably from the present fields alone.

## Property-support audit

This matrix describes code paths, not new experimentally verified Tweakpane capabilities. Everything beyond the four Phase 1 rectangle properties stays out of the initial integration.

| Object branch | Existing mapping and support | Conflict/limitation | Phase 1 |
| --- | --- | --- | --- |
| Plain text | `color || fill` for fill, font properties, align, outline via `border*`, shadow via common mapping; opacity on outer Group. | Runs and range formatting must not be overwritten. Effects have branch-specific rendering. | No Tweakpane text controls. |
| Rich text | `RichText` renders runs, with run color overriding object color; uses common outline/shadow properties. | Common fallback and explicit run fill differ from plain text. A gradient or object color is not guaranteed to override runs. Preserve run content/styles. | No controls. |
| Curved text | TextPath receives text/common properties and curve geometry. | Separate branch; background, alignment and effects need independent preview/export validation. | No controls. |
| Closed Quick Shape rectangle | Solid `color || fill || '#b48ce3'`, `borderColor || '#33272b'`, width `borderWidth || 0`, opacity on Group. Two-color linear/radial gradients and no-fill already exist. | Provenance blocked. Outline effect enforces at least width 2; no-fill and gradients can mask solid edits. Sticker outline is a separate renderer path. | Proposed: solid fill, stroke color, stroke width 0–30, opacity 0–100%. Not implemented. |
| Other closed shapes | Common fill/stroke/shadow; some shapes are scaled Paths. | Path/stroke behavior and gradients need separate validation; radius applies to rectangle, not all shapes. | Deferred to Phase 2. |
| Line/arrow | Stroke/fill use `color`; width is `borderWidth || strokeWidth || 4`; dash from borderStyle. | `borderColor` does not define their stroke. Zero width falls back to 4. Closed fill/gradient controls would mislead. | No controls. |
| Drawing | Line color `color || '#33272b'`, width `strokeWidth || 4`, tension `strokeTension ?? 0.35`, opacity on Group. | Legacy inspector fallback color differs. Closed-shape fill/border semantics do not apply. | Deferred to Phase 4; width 1–50. |
| Curated Elements | Asset branch, curated editable flags false for colors/stroke/crop/filters. | No appearance editor eligibility. Do not touch source SVGs or provider flags. | Never eligible. |

## Integration contracts and conflicts

Existing flow:

```text
Selection → EditorFeatures / SelectionToolbar → adapter.patchItems
          → DocumentHistory → ItemContent → canvas / storage / export
```

Proposed Phase 1 flow, pending gate:

```text
Single eligible rectangle → temporary pane projection → validated exact patch
                         → existing adapter.patchItems / DocumentHistory
                         → same renderer / storage / export
External edit / undo / redo → projection refresh (no document write)
```

- Both stage and archived-page exports use `ItemContent`; opacity belongs to their outer Group. No renderer change is justified by the audit alone.
- The toolbar's **Solid fill** action writes `color`, clears `gradient`, and clears `noFill`. The legacy inspector's fill picker writes `color` alone. Phase 1 would need matching solid semantics and gate only duplicated rectangle controls; preserve other existing controls.
- `color` wins over legacy `fill`. Do not normalize by rewriting both on every pane update.
- `patchItems` rejects locked appearance fields, but still maps/commits items. A pane must reject locked/no-op edits before calling it to avoid meaningless history.
- The existing inspector initially finds the first selected item. The pane must enforce a single current selected ID and current document/page, and show read-only multi-selection state.
- `DocumentHistory` has one gesture slot, not nested transactions. Editor.tsx also begins/ends gestures on focus/range events. Pane lifecycle must coexist with that behavior rather than introduce a second history or leave a gesture open.
- Continuous events must finalize on `ev.last` plus interruption/cleanup; external updates and stale events must be distinguished. Keyboard, color dragging, selection switch, page/group changes, disposal and Strict Mode require actual tests.
- React main currently does not mount StrictMode, so a separate focused lifecycle test would be required; existing runtime behavior cannot stand in for that test.
- Inspector is in the current formatting Popover. Its containment and Escape handling must be respected. Inline/contained documented Tweakpane pickers should be checked before considering any event-boundary adjustment.
- Styling must use scoped documented `--tp-*` variables mapped to existing `--gs-*` tokens. No internal-class overrides or global suppression.
- Distribution notices currently collect MIT licenses for runtime dependencies. A future exact Tweakpane addition would also need the existing license-bundle list and notice updated, without unrelated dependency upgrades.

Official API references reviewed: [quick tour](https://tweakpane.github.io/docs/quick-tour/), [events/containers/refresh/disposal](https://tweakpane.github.io/docs/misc/), and [v4 migration](https://tweakpane.github.io/docs/migration/v4/). Use official v4 Pane/addBinding APIs only; no wrapper or direct core dependency is authorized by this audit.

## Gate and rollback

Phase 0 gate is not satisfied: provenance is unresolved, clean install did not pass, and the full browser baseline is not green. No Phase 1 dependency, feature flag, inspector or mapper has been introduced. Phase 2 is not authorized and has not started.

To leave the audit branch, use `git switch master`; there are no application changes to roll back. The baseline evidence/report can remain for review. Do not reset shared changes or modify saved user boards. The future Phase 1 rollback must be one flag OFF by default (`ENABLE_TWEAKPANE_APPEARANCE`) and retain the original controls, but that flag does not exist yet.

Before resuming: resolve the provenance policy explicitly; close the process holding the dependency binaries and rerun `npm ci`; agree how pre-existing browser setup failures will be treated without hiding them. Only then re-evaluate the Phase 0 gate and start the four-control, one-shape Phase 1.
