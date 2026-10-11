# Phase D1: Tweakpane proof of concept

Date: 2026-10-11. Branch: `feat/tweakpane-phase0-audit`.
Starting commit: `40d691e9e4a8576902b4f0a65bd9b983f4358fa6`.

Implemented a working, default-disabled Tweakpane inspector for one selected
closed Quick Shape. Phase D2 and Text/Drawings inspector migration are not started.
The canonical appearance model, document v3, renderer, storage and history remain
the Phase C implementations. Existing saved cards remain ordinary editable objects;
no provenance markers were introduced.

## Initial audit and baseline

Verified local HEAD and origin at the starting commit; `git pull --ff-only origin
feat/tweakpane-phase0-audit` reported already up to date. Read the unified plan,
Phase C report, appearance README and canonical types, validation, normalization,
migration, activation, capabilities and updates. Inspected EditorFeatures,
SelectionToolbar, editor shell, shared React UI primitives and existing gesture APIs.

The smallest integration point was the existing Appearance popover. Its React
controls already use Phase C; the new inspector must use that same pathway. The
toolbar's solid fill and opacity controls would compete with the new inspector, so
they are suppressed only for the opted-in single closed-shape selection. Other
selections continue to use existing controls. Editor input focus listeners also
needed to exclude Tweakpane-owned inputs to avoid two owners of the same gesture.

Baseline results before implementation:

| Check                                                     | Result                      |
| --------------------------------------------------------- | --------------------------- |
| Unit tests, `npm test -- --configLoader runner`           | 109 passed, 18 files        |
| `npm run lint`                                            | Passed                      |
| `npm run build -- --configLoader runner`                  | TypeScript and build passed |
| Appearance legacy, Phase C and UI-refactor browser suites | 17 passed                   |

Previously recorded unrelated limitations remain separate: the default Vite config
loader has a sandbox/Windows directory-access failure (runner works); an older
full-browser invocation had three setup failures and 63 unrun tests; whole-project
formatting had three untouched-file failures. These are not introduced D1 failures
and were not repaired. The pre-existing large-chunk build warning remains. The
optional AI backend was absent during isolated tests; AI regression uses its
existing mocked response. No claim is made that the entire browser suite passed.

## Dependencies and distribution

Runtime `tweakpane` is pinned to **4.0.5**; development typings `@tweakpane/core`
are pinned to **2.0.5**, in package.json and package-lock.json. The published version
and package integrity were checked using npm metadata and the
[official getting-started documentation](https://tweakpane.github.io/docs/getting-started/).
The [upstream README](https://github.com/cocopon/tweakpane) calls for core typings
when using TypeScript. Installation audit reported zero vulnerabilities.

The exact 4.0.5 [upstream MIT notice](https://github.com/cocopon/tweakpane/blob/4.0.5/LICENSE.txt)
is stored in `licenses/Tweakpane-MIT.txt` because the npm package omits that file.
The existing distribution-notice plugin automatically includes it. Vite isolates
the library in its own lazy-loaded chunk: 152.16 kB minified / 31.47 kB gzip.
The shared vendor chunk stays 67.05 kB. A production browser test confirms that
opening original controls with the flag disabled does not fetch the Tweakpane chunk.

## Integration architecture

```text
selected canonical closed-shape appearance
    -> temporary flat Tweakpane binding values
    -> typed AppearanceChange using the current selected object
    -> adapter.changeAppearance(change, [selectedId])
    -> validated updateAppearance -> existing DocumentHistory
    -> shared Konva rendering -> existing save/export
```

TweakpaneHost owns initialization/disposal in a React layout effect and survives
actual Strict Mode setup/cleanup replay. QuickShapeInspector supplies the compact
React heading and close control; shapePane creates the imperative bindings.
TweakpaneSession owns only transient gesture status, subscription and selected ID.
It stores no independent editable appearance or history. Binding refreshes are
guarded against feedback and update only values that changed, avoiding repeated
full color-picker refreshes during continuous editing.

Every write calls the existing validated canonical update. No inspector callback
mutates Konva nodes, persists UI state, writes obsolete appearance fields or adds
a new schema. CSS named colors are resolved for picker display only; opening the
inspector does not rewrite stored colors. Alpha-capable color bindings are enabled.

The only adapter contract extension is exposing the **already implemented**
`cancelGesture()` method through StudioAdapter, allowing Escape to restore the
existing gesture snapshot. Its implementation and DocumentHistory were not changed.

Pointer, mouse/touch release, keyboard, focus, cancellation, selection changes,
external undo and unmount determine gesture boundaries alongside Tweakpane's
`event.last`. Selection/lock/delete interruption synchronously closes the gesture;
late events cannot write to either the old object or the new selection. Escape
cancels; pointer/touch cancellation and window blur finalize safely. Ctrl/Cmd+Z
and Shift+Z use the existing undo/redo even when an inspector input has focus.

Tweakpane v4 uses mouse/touch drag handlers. Completion waits until its release
handler finishes. An active mouse drag interrupted by unmount is released with a
standard document mouseup **after callbacks are disabled and the session disposed**,
then the pane is disposed. This prevents the vendor drag helper leaving document
listeners active; the real browser lifecycle test verifies zero tracked owned and
vendor drag listeners after unmount. No private vendor API is called.

## Controls and semantics

| Group      | Controls                                              | Canonical destination                      |
| ---------- | ----------------------------------------------------- | ------------------------------------------ |
| Fill       | Enabled, Solid/Linear/Radial, first and second colors | Closed-shape fill and its retained paint   |
| Border     | Color, width in 0.5 increments, Solid/Dashed/Dotted   | Geometric stroke; scaling unchanged        |
| Appearance | Opacity 0–100%, None/Glow/Outline                     | Opacity 0–1 and existing supported effects |
| Shadow     | Enabled, color, opacity, blur, X/Y offsets            | Existing shadow properties                 |

Disabled fill retains inactive paint; disabled shadows retain their settings.
The second color is hidden for solid fill. Two-stop gradients use the existing
renderer geometry; no angles or extra stops. Echo and Glitch identifiers from
legacy data can be displayed as unavailable, disabled options; they are not offered
as new edits. Border/shadow slider maxima accommodate larger existing values.
There are no text-background, text-outline or drawing controls in this proof of concept.

## Enable, test and rollback

PowerShell, from the repository root:

```powershell
$env:VITE_TWEAKPANE_D1='1'
npm run dev -- --port 4180 --strictPort --configLoader runner
```

Open the displayed URL, create/open a board, add a Create → Quick Shape, select it
on the canvas and click Appearance. Only exactly `VITE_TWEAKPANE_D1=1` enables D1.
For production, set the same variable before building; a running preview cannot
change a compiled flag. The enabled browser suite can be run in another terminal:

```powershell
$env:TWEAKPANE_D1_URL='http://127.0.0.1:4180'
npx playwright test tests/tweakpane-d1.spec.ts
```

To roll back the UI, stop the server, remove the flag and restart (or rebuild):

```powershell
Remove-Item Env:VITE_TWEAKPANE_D1 -ErrorAction SilentlyContinue
npm run build -- --configLoader runner
```

No document conversion, clearing IndexedDB or restoring old backups is required.
Keep Phase C document-v3 support. For a code rollback, revert the D1 UI/test commit
`28bbb9b` (`git revert 28bbb9b`) before reverting dependency isolation `dfd7e18`;
never downgrade live documents to v2. These focused commits are local to the feature
branch; no D1 push was performed.
The [Phase C recovery procedure](UNIFIED_APPEARANCE_PHASE_C_REPORT.md) and original
legacy recovery snapshots remain intact. Tests used isolated browser contexts and
ports; the user's running editor and documents were not modified.

## Validation after implementation

| Check                                                           | Result                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| Unit suite                                                      | 116 passed, 19 files (7 new session/control tests)      |
| TypeScript                                                      | Passed as part of both production builds                |
| Lint and shared-style checks                                    | Passed                                                  |
| Production build, flag disabled                                 | Passed                                                  |
| Production build, flag enabled, isolated output directory       | Passed                                                  |
| D1 enabled development browser suite                            | 10 passed                                               |
| Uploaded-photo extension to asset-isolation scenario            | Passed                                                  |
| Disabled production: legacy, Phase C, UI-refactor and flag test | 18 passed                                               |
| Enabled production application scenarios                        | 9 passed; development-only Strict Mode harness excluded |

Unit coverage includes coalescing and undo/redo, interruption, locking/deletion,
eligibility exclusion for text/drawing/multiple selections, cancel/disposal,
external undo/redo refresh and all projected canonical commands. Browser coverage
uses physical canvas selection, real Tweakpane controls and the actual mounted
adapter/Konva scene. It covers solid colors, border width/style, opacity, gradients,
fill enablement, shadows, observable effects, continuous slider/color gestures,
keyboard precision and undo/redo, different selections, duplication, deletion,
locking, Escape, pointer cancellation, closing/reopening, saved-project reload,
portable v3 backups, curated Elements and an actual uploaded PNG, Strict Mode,
unmount during drag, mobile touch and overflow. PNG export and a normalized clone
of actual canvas artwork compare with **zero differing pixels** after D1 edits.
Existing legacy parity, rich-text precedence, drawings, clipboard, recovery,
multipage PDF, marquee and AI affirmation regressions pass with the flag disabled.

## UI assessment and limitations

Working evidence: [desktop screenshot](../exports/tweakpane-d1/inspector-desktop.png)
and [mobile screenshot](../exports/tweakpane-d1/inspector-mobile.png).

| Criterion              | Assessment                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visual consistency     | Existing app font, surface, border, accent and focus tokens; React header and close button. Scoped CSS only.                                                                              |
| Density                | Compact 340px panel, grouped Fill/Border/Appearance, Shadow initially collapsed. Desktop rows use existing 32px control height.                                                           |
| Color picker           | Inline picker avoids nested external-popover clipping; precise numeric color text and alpha support. Technical hex/format presentation is less creative than curated React color choices. |
| Precision and keyboard | Native inputs/selects, labeled sliders, tested repeated numeric increments and undo/redo. Focus-visible outlines included.                                                                |
| Accessibility          | Explicit names for inputs, picker buttons and color regions; slider roles/current values. This is focused keyboard validation, not a screen-reader or full accessibility certification.   |
| Touch/mobile           | Coarse-pointer rows and close targets use existing 44px token. Real browser touch drag coalesces and undoes; 390×844 viewport and expanded-panel overflow verified.                       |
| Scrolling/placement    | Header stays separate from a bounded scrolling body; inline colors and expanded shadows remain within the viewport. Existing floating popover still covers artwork.                       |
| Continuous performance | Real slider and color drags update canvas without history flooding; only changed bindings refresh. No frame-time benchmark or low-end-device performance claim.                           |

**Recommendation: hybrid approach.** Tweakpane is effective for consistent numeric,
boolean and structured appearance bindings using the existing canonical pipeline.
The shared React components provide better creative affordances for contextual
tools, palettes, typography and media workflows. A hybrid presentation must still
have one appearance model, one update function and one rendering path; it does not
justify duplicate simultaneous inspectors or compatibility architectures.

Before any D2 rollout, assess a stable inspector region or mobile sheet rather than
expanding the floating formatting bar; perform screen-reader and low-end-device
checks, and evaluate richer creative color affordances. These are recommendations,
not implementations in D1. Multiple selections, open paths, Text and Drawings use
their existing React controls. No global toolbar redesign, schema migration,
advanced gradients, image-editor change or new effect renderer was made.

## Exact files

Modified:

- `package.json`, `package-lock.json`: exact dependency pins.
- `vite.config.ts`: isolate Tweakpane from the shared vendor chunk.
- `THIRD_PARTY_NOTICES.md`: dependency and license provenance.
- `src/vision/contracts.ts`: expose existing cancelGesture contract.
- `src/editor/Editor.tsx`: lazy flag-gated popover integration and gesture ownership.
- `src/studio/SelectionToolbar.tsx`: prevent competing Quick Shape controls.
- `docs/UNIFIED_APPEARANCE_PLAN.md`: record subsequent D1-only authorization.

Added:

- `licenses/Tweakpane-MIT.txt`.
- `src/studio/appearance/feature.ts`.
- `src/studio/appearance/QuickShapeInspector.tsx`.
- `src/studio/appearance/TweakpaneHost.tsx`.
- `src/studio/appearance/TweakpaneSession.ts`.
- `src/studio/appearance/shapePane.ts`.
- `src/studio/appearance/tweakpane.css`.
- `src/studio/appearance/TweakpaneSession.test.ts`.
- `tests/tweakpane-d1.spec.ts`, `tests/tweakpane-disabled.spec.ts`.
- `tests/fixtures/tweakpane-lifecycle.html`, `tests/fixtures/tweakpane-lifecycle.tsx`
  (development-only real Strict Mode harness, not imported by the application).
- `exports/tweakpane-d1/inspector-desktop.png`, `exports/tweakpane-d1/inspector-mobile.png`.
- `docs/TWEAKPANE_PHASE_D1_REPORT.md`.

The pre-existing untracked `exports/tweakpane-phase0/current-ui-tests/` directory
was left untouched and is excluded from D1 commits.
