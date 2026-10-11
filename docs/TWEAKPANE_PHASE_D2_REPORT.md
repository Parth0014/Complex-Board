# Phase D2 — Unified hybrid appearance editor

Date: 2026-10-11. Repository: Complex-Board / VisBo.
Branch: `feat/tweakpane-phase0-audit`.
Starting commit: `da90ad3e7720ec86fd05bf871f3e509978c2f142`.

Implemented an opt-in, shared appearance experience for Text, closed/open Shapes
and Drawings. React owns the contextual quick bar, creative palettes, section
navigation, typography and adaptive presentation. Tweakpane owns technical values,
sliders, toggles and numeric color editing. All object appearance changes use the
existing validated canonical pipeline. The feature remains disabled by default.
Phase E and merging to master are outside this implementation.

## Audit, inventory and baseline

Pulled with `git pull --ff-only origin feat/tweakpane-phase0-audit`; origin and local
HEAD matched the requested starting commit. Tracked files were clean. The existing
untracked `exports/tweakpane-phase0/current-ui-tests/` was preserved.

Read the unified plan, Phase C report and D1 report. Inspected Editor,
EditorFeatures, SelectionToolbar, the appearance UI and canonical appearance
modules, adapter contracts, history gestures, shared UI primitives, studio shell,
toolbar placement and mobile styles. No legacy appearance-field architecture was
used as a new editing source.

| Existing surface / control                                  | D2 treatment                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Text font, size, bold, italic, underline, color, alignment  | Retained as concise React quick actions; advanced typography in Text section                              |
| Character range formatting                                  | Relocated to Text section, using existing formatRange/isRangeActive and textRuns commands                 |
| Solid fill, gradient mode and two colors                    | React mode choices and palette; shared Tweakpane technical bindings                                       |
| Border, glyph outline and open-path stroke                  | One capability-driven Stroke/Outline/Border section; quick access for shapes/drawings                     |
| Opacity                                                     | Shared canonical slider projection, also available through useful quick actions                           |
| Shadow and existing effects                                 | Effects section; React preset choices, Tweakpane measurements; unsupported choices omitted                |
| Long editable-object Formatting popover                     | Replaced in the enabled D2 path; retained only for required disabled-flag rollback                        |
| D1 closed-shape pane                                        | Binding/lifecycle infrastructure extracted once; standalone D1 flag remains regression/rollback isolation |
| Bounds, fit-to-content, flip, corner radius, shape-to-frame | Retained under collapsed Object settings using existing commands                                          |
| Images, curated Elements, asset discovery, layers, AI       | Original UI and implementations retained                                                                  |

Baseline before D2 changes: **116 unit tests in 19 files**, lint and TypeScript/build
passed; **18 disabled/legacy/Phase C/UI browser tests and all 10 D1 tests passed**.
The existing large-chunk build warning remains. Historical unrelated browser setup
failures and untouched-file formatting failures remain those documented in the
Phase C/D1 reports; no claim is made that the entire historical browser suite passes.
Use `--configLoader runner` for the previously recorded Windows config-loader issue.

## One engine, two contextual presentations

```text
React quick action / creative choice     Tweakpane technical binding
                  \                       /
                 current selected canonical item
                  -> typed AppearanceChange
                  -> adapter.changeAppearance
                  -> validated updateAppearance
                  -> existing DocumentHistory
                  -> shared Konva rendering
                  -> existing v3 storage / export
```

`selectedAppearance` selects exactly one editable object by its existing kind.
It excludes assets without adding origin markers. Canonical capabilities determine
fill, gradients, stroke semantics, caps/joins, shadow and allowed effects.
`appearanceControls` contains UI-only value projections and typed command
translation. React and Tweakpane use the same projection; input drafts are never
persisted as appearance data.

`bindingPane` is the extracted D1 lifecycle, refresh, accessibility and event
infrastructure. Both the original D1 configuration and the unified D2 configuration
delegate to it. Text and Drawing do not copy shapePane into separate engines.
`TweakpaneSession` accepts the relevant selection resolver and reuses existing
begin/end/cancel gesture APIs. No history implementation or new adapter method
was introduced in D2. Tweakpane remains pinned to 4.0.5 and core typings to 2.0.5;
dependencies and lockfile are unchanged from D1.

No control mutates a Konva node. No obsolete appearance field is written.
Typography, content, explicit character runs and object bounds keep their existing,
separate non-appearance commands. The canonical schema, normalization/migration,
Konva renderer, geometry/interaction engine, document/storage infrastructure,
export and AI implementations are unchanged.

## Adaptive UI and command map

The desktop inspector is an on-demand, fixed 320px region at the workspace's right
edge. It has a separate heading/navigation and one scrolling body. Opening it does
not resize the canvas or change zoom. Keeping the existing contextual bar at the
top of the workspace avoids relying on new canvas-transform plumbing or placing it
over selection handles. This is a deliberate placement tradeoff: the bar is
contextual but does not follow the selected object around the board.

At widths up to 700px, React presents a modal bottom sheet using the existing Dialog
primitive, a backdrop, focus trap and close action. It subscribes to matchMedia and
visualViewport resize/scroll, rather than relying only on responsive CSS. The body
scrolls independently; technical color pickers expand inline inside it. Desktop
and mobile share the same inspector contents and commands.

| Visible control                                     | Existing authoritative command / field                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Fill enable                                         | AppearanceChange.fill, preserving inactive paint                                        |
| Solid / Linear / Radial                             | AppearanceChange.fill with existing two-stop Paint                                      |
| Palette and technical first/second color            | appearanceChange fill.color / fill.endColor → AppearanceChange.fill                     |
| Open-path color                                     | AppearanceChange.stroke.color                                                           |
| Border / glyph-outline color, width, style          | AppearanceChange.stroke; semantic name comes from capabilities                          |
| Stroke cap and join                                 | AppearanceChange.stroke.cap / join, only for applicable open paths                      |
| Opacity (%)                                         | AppearanceChange.opacity, UI percentage projected to 0–1                                |
| Add / edit / clear text background                  | AppearanceChange.background, independently of fill/outline                              |
| Effect buttons                                      | AppearanceChange.effect, only canonical supported effects                               |
| Shadow enable, color, opacity, blur, offsets        | AppearanceChange.shadow; existing preset/manual semantics                               |
| Silhouette outline                                  | AppearanceChange.silhouette, distinct from the geometric/glyph stroke                   |
| Font, size, alignment, bold/italic/underline/strike | Existing patchItems typography commands                                                 |
| Character range styles/color/script                 | Existing formatRange/isRangeActive → patchItems.textRuns; existing curve reset retained |
| Bounds and fit-to-content                           | Existing resizeObjectBounds / fitObjectBounds                                           |
| Corner radius and flip                              | Existing object-data patchItems commands; no geometry algorithm changes                 |
| Convert shape to frame                              | Existing attachFrameContent and original curated/board-media options                    |

Text fill, outline and background are explicitly separate. Object-wide appearance
does not overwrite textRuns. Rich-text colors and explicit false styles retain
precedence, verified in actual Konva nodes. The curved-text gradient branch is
also checked in a real TextPath. There are no arbitrary stops, gradient angles,
new effects or artificial fill controls for Drawing/Line/Arrow. Existing stroke
scaling and drawing points/geometry are preserved.

Color, Stroke/Outline/Border and Effects form three primary sections; Text gets
one additional typography section. The Text section and Object settings use
small collapsed disclosures for less common actions. An unavailable saved effect
is explained, and can only be replaced with a supported choice.

## Gestures, synchronization and cleanup

Continuous slider and color adjustments use one existing undo gesture. Keyboard
changes, external undo/redo, Escape, pointer/touch cancellation, window blur,
selection switching and unmount are handled by the shared D1 session infrastructure.
It guards target ID, current selection, lock state and interruption status, rather
than trusting only Tweakpane's `event.last`.

The pinned vendor mouse helper is released during active-drag unmount only after
callbacks have been disabled and the session disposed. The generalized real
Strict Mode harness tests Text, Drawing and Line, verifying two mounts/cleanups,
no open gesture, zero tracked owned/vendor drag listeners and no late document
writes. The original D1 Strict Mode regression is retained as well.

Appearance keyboard events are isolated from canvas shortcuts: navigating tabs
with arrow keys must not move artwork. Undo/redo works inside both React and
Tweakpane controls. Escape restores numeric drafts or cancels an active appearance
gesture; it does not unexpectedly select a different object. Closing restores
focus to the current trigger, including when selection changed while a mobile
sheet stayed open. Locked controls are disabled and deleted selections disappear.

The quick bar and inspector may expose the same useful command, as requested,
but there is one active advanced inspector and one update pathway. The old long
Formatting interface cannot appear for editable-object selections in D2, including
a multiple selection left over from an open inspector. Multiple selections retain
the existing bulk toolbar; the advanced inspector requires one editable object.

## Enable and test

PowerShell from the repository root:

```powershell
$env:VITE_TWEAKPANE_D2='1'
npm run dev -- --port 4182 --strictPort --configLoader runner
```

Select Text, a Quick Shape, an open Line/Arrow or a Drawing on the existing canvas.
Use the quick actions or Appearance to open the dock/sheet. D2 takes precedence
if D1 is also enabled. Feature flags affect UI only; document v3 remains active.

For production, set the flag **before** building. It is compiled into the bundle.
Use an isolated output directory when comparing builds:

```powershell
$env:VITE_TWEAKPANE_D2='1'
npm run build -- --configLoader runner --outDir tmp/tweakpane-d2-dist
npm run preview -- --outDir tmp/tweakpane-d2-dist --port 4183 --strictPort --configLoader runner
```

In another terminal:

```powershell
$env:TWEAKPANE_D2_URL='http://127.0.0.1:4182'
npx playwright test tests/tweakpane-d2.spec.ts
```

For a compiled preview, use URL 4183 and set `TWEAKPANE_D2_PRODUCTION=1` to skip
the development-only Strict Mode harness. Relevant disabled tests use the normal
production preview at 4173; D1 tests use a separately flagged server at 4180.
All tests use isolated browser contexts; no user document or running 5173 editor
was modified.

## Verification

| Acceptance check                                                | Result                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------- |
| Unit tests                                                      | 121 passed in 20 files                                      |
| Lint, TypeScript and production builds                          | Passed with D2 disabled and enabled                         |
| Combined legacy / Phase C / UI / disabled / D1 / D2 browser run | 42 passed, 1 development-only harness skipped in production |
| Generalized development Strict Mode harness                     | Passed for Text, Drawing and Line                           |
| PNG export parity after D2 edits                                | Zero differing pixels                                       |
| UI-only navigation artwork redraws                              | Zero                                                        |

The combined run includes all 10 D1 regressions, 18 disabled/legacy/Phase C/UI
checks and 14 production D2 cases. The fifteenth D2 case uses the development
Strict Mode fixture and was verified separately against the flagged development
server. Seven final screenshots were visually inspected. The existing large-chunk
warning and optional AI backend connection refusal remain separate environment
limitations; the AI affirmation regression passes with its existing test mock.

Coverage includes all editable categories, palette/technical command equivalence,
rich-text precedence, curved text, supported effects/shadows, continuous history,
selection interruption, close/cancel, copy/paste style, duplicate/lock/delete,
saved-project reopening, v3 backup restore, actual multipage loading/switching,
curated Elements, uploaded photos, retained frame conversion, Strict Mode cleanup,
keyboard focus/navigation, touch and narrow viewports.

The PNG test compares an export after new-UI edits with the actual Konva artwork
and requires zero differing pixels. Existing legacy canvas/export parity, rich-text,
drawing, clipboard, recovery, multipage PDF, marquee and AI affirmation regressions
remain part of the disabled suite. UI-only inspector navigation is instrumented
against actual Konva Layer draw events and requires **zero artwork redraws**.
This is not an FPS benchmark or a low-end-device performance certification.

## Visual evidence and findings

| Required capture           | Screenshot                                                         |
| -------------------------- | ------------------------------------------------------------------ |
| Desktop Text and quick bar | [desktop-text.png](../exports/tweakpane-d2/desktop-text.png)       |
| Desktop Shape inspector    | [desktop-solid.png](../exports/tweakpane-d2/desktop-solid.png)     |
| Desktop Drawing inspector  | [desktop-drawing.png](../exports/tweakpane-d2/desktop-drawing.png) |
| Expanded advanced effects  | [desktop-effects.png](../exports/tweakpane-d2/desktop-effects.png) |
| Mobile Text, 360px         | [mobile-text.png](../exports/tweakpane-d2/mobile-text.png)         |
| Mobile Shape sheet, 390px  | [mobile-solid.png](../exports/tweakpane-d2/mobile-solid.png)       |
| Mobile Drawing, 430px      | [mobile-drawing.png](../exports/tweakpane-d2/mobile-drawing.png)   |

These are real running-browser captures, not mockups. Images were inspected and
corrected: an inline swatch initially collapsed to a thin line and now has explicit
block/flex dimensions; mobile focus return after changing categories was fixed;
mobile disclosures have 44px touch targets. Existing app font, surfaces, spacing,
radius, focus, accent and control tokens are used, with scoped CSS only.

The dock leaves the fixture artwork mostly visible instead of covering its center.
On small desktops it can cover the right edge of a large board; avoiding a canvas
reflow/zoom jump was prioritized. The mobile sheet can cover much of the board
while open; closing returns immediately to the selected canvas object. The bar
wraps on narrow viewports instead of extending beyond the viewport. Long bodies
and inline color controls remain scrollable inside their bounded surface.

Native control names, tab roles and slider values are explicitly supplied. Keyboard
tab navigation, visible focus, Escape and undo/redo are tested. Real touch events
drive sliders in mobile browser emulation. A full NVDA/VoiceOver audit and physical
device software-keyboard behavior are not certified by these automated tests;
visualViewport handling is implemented, and should still be checked on target devices.

## Rollback preserving documents

Stop the flagged server and remove the UI flags, then restart or rebuild:

```powershell
Remove-Item Env:VITE_TWEAKPANE_D2 -ErrorAction SilentlyContinue
Remove-Item Env:VITE_TWEAKPANE_D1 -ErrorAction SilentlyContinue
npm run build -- --configLoader runner
```

The original React UI returns; no IndexedDB clear, document conversion or schema
downgrade is required. Existing D1 isolation remains available by setting only its
flag. The [Phase C recovery procedure](UNIFIED_APPEARANCE_PHASE_C_REPORT.md) and
original v2 recovery snapshots are unchanged. Do not switch to a pre-v3 application
to roll back this UI.

The old editable-object UI code is retained exclusively for the explicitly required
flag-disabled fallback. Removing that code while requiring the original UI to work
when disabled would conflict; it is not mounted as a competing implementation in
the enabled path. Removing rollback code after a default rollout is deferred, rather
than beginning Phase E here.

## Milestones and exact files

- `c78e60c`: D2.1 adaptive dock/sheet shell and reversible flag.
- `f7036a2`: D2.2 shared binding lifecycle and closed/open Shape integration.
- `19c143c`: D2.3 Text appearance and character formatting.
- `4286b6a`: D2.4 Drawing capability/rendering/geometry evidence.
- `c959939`: D2.5 contextual quick bar and keyboard isolation.
- `21f2016`: D2.6 acceptance fixes and lifecycle/adaptive regression coverage.
- The documentation commit records the seven screenshots and this acceptance report.

Modified:

- `src/editor/Editor.tsx`: flag-gated quick bar, adaptive inspector and keyboard isolation.
- `src/studio/appearance/feature.ts`: D2 flag and editable-object selector.
- `src/studio/appearance/TweakpaneSession.ts`: generalize selection resolver while retaining D1 behavior.
- `src/studio/appearance/shapePane.ts`: delegate D1 bindings to shared lifecycle.
- `tests/fixtures/tweakpane-lifecycle.tsx`: reuse the real Strict Mode harness for all kinds.
- `tests/tweakpane-disabled.spec.ts`: explicitly assert D2 surfaces stay absent when disabled.
- `docs/UNIFIED_APPEARANCE_PLAN.md`: record subsequent D2 authorization.

Added:

- `src/studio/appearance/AppearanceSurface.tsx`.
- `src/studio/appearance/UnifiedInspector.tsx`.
- `src/studio/appearance/HybridQuickBar.tsx`.
- `src/studio/appearance/TechnicalControls.tsx`.
- `src/studio/appearance/bindingPane.ts`, `bindingOptions.ts`.
- `src/studio/appearance/appearanceControls.ts`, `appearanceControls.test.ts`.
- `src/studio/appearance/CreativePalette.tsx`.
- `src/studio/appearance/TextProperties.tsx`, `CommittedNumber.tsx`.
- `src/studio/appearance/ObjectSettings.tsx`.
- `src/studio/appearance/hybrid.css`.
- `tests/tweakpane-d2.spec.ts`.
- The seven PNGs listed above in `exports/tweakpane-d2/`.
- `docs/TWEAKPANE_PHASE_D2_REPORT.md`.

No files were removed. Historical D1 screenshots are retained unchanged; the
pre-existing untracked Phase 0 capture directory is excluded. A machine-readable
inventory is `git diff --name-only da90ad3..HEAD`.

## Default-readiness recommendation

The hybrid approach provides one coherent experience with the existing appearance
engine. Keep D2 opt-in for a controlled rollout while checking physical-device
keyboard behavior and assistive technology on target platforms. These are stated
validation limits, not alternate architectures or unimplemented engine work.
The feature remains default-disabled; no Phase E work or master merge is performed.
