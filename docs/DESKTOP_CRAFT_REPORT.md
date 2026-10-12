# Desktop craft pass â€” 12 October 2026

## Scope and result

This pass follows the desktop portion of `MUSE_FIX_BRIEF.md` and the later request for Apple-like restraint and fluidity. Mobile redesign is excluded. The existing Atelier identity, board storage, artwork, and canvas engine remain in place.

The inspector now occupies an explicit third grid column and one workspace row. Shape, text, and image inspectors remain on the right at 1366Ã—768 and 1920Ã—1080. With both panels open, the captured landscape board fits at 35% at 1366 pixels. Closing either panel releases its column. The text toolbar fits in one compact row at both tested desktop widths.

Visual changes include a neutral workspace, quieter dots, softer layered shadows, translucent floating chrome, restrained button feedback, consistent interface headings, flat inspector sections, and left-aligned menus. Home keeps its Fraunces headline and colorful illustration with lighter typography and a simpler primary action. Palette swatches display their actual colors; rail labels and drawing-tool labels remain readable.

Library content enters with a short fade and small shift. Closing retains its column during the 120ms content fade, then releases it without tweening canvas dimensions. Rapid switching cancels stale exits; exiting content is inert. Reduced motion skips the exit delay. Popover animation no longer overwrites the transform used for viewport positioning.

## CSS audit

Reproduce the branch comparison with:

```powershell
node scripts/audit-css.mjs --baseline=5d525d1
node scripts/audit-css.mjs --duplicates
```

| Measurement, all source CSS                  | Branch HEAD `5d525d1` | Current | Change |
| -------------------------------------------- | --------------------: | ------: | -----: |
| Literal opening braces, the brief's metric   |                 1,149 |   1,109 |  âˆ’41 |
| PostCSS rule nodes, including keyframe steps |                 1,075 |   1,034 |  âˆ’42 |

The working checkout before this refinement already included the initial screenshot fixes: 1,152 opening braces and 1,077 PostCSS rules. Relative to that checkpoint, both counts decreased by 43. These numbers do not claim to be below the brief's historical master estimate of 859.

`components-b.css` is consolidated into `components.css`. Overridden declarations and 51 retired selection/page/export/context rules were removed after checking runtime class references. The audit still identifies 18 repeated selector/context pairs, including home and optional appearance overrides; it does not claim zero duplicates.

## Accessibility and compatibility

All seven outline resets have visible focus replacements. The desktop keyboard gate checks the first 25 Tab stops. `UnifiedInspector`'s `title` becomes a visible `AppearanceSurface` heading rather than a native tooltip. Nested picker dismissal, context-menu keyboard navigation, export focus containment/restoration, and reduced motion passed the focused browser checks.

The two legacy artwork fixtures export with zero changed pixels at document resolution. Their test now compares decoded pixels at 1Ã—, matching the references, rather than comparing an intentional 2Ã— Share export with old 1Ã— captures. Export implementation and saved board formats were not changed.

## Verification

- Production build passed with `npm run build -- --configLoader runner`.
- Lint passed with `npm run lint`.
- All 133 unit tests passed with `npm run test -- --configLoader runner`.
- The focused 31-case browser run passed 30 cases; its sole failure was a hard-coded Unix temporary path in a screenshot test. That path was corrected to `testInfo.outputPath`, and the test passed separately.
- Rapid library switching passed separately. Both legacy artwork pixel comparisons passed separately.
- Repository-wide formatting flags 45 untouched files. Changed files were formatted; this pass does not claim the whole repository passes `format:check`.
- `git diff --check` passed.

### Full Edge audit

The complete 129-case suite finished in 9.8 minutes: **41 passed, 60 failed, 28 skipped**, with no flaky cases. Command:

```powershell
$env:PLAYWRIGHT_JSON_OUTPUT_NAME='tmp/full-browser-results.json'
node node_modules/@playwright/test/cli.js test --workers=4 --output=tmp/full-browser-traces --reporter=line,json
```

The desktop target groups passed in that audit:

| Group                                         | Passed | Failed |
| --------------------------------------------- | -----: | -----: |
| Desktop craft, including rapid switching      |      4 |      0 |
| Board layout, scrolling, zoom, and repainting |      6 |      0 |
| Craft invariants and capture walkthroughs     |     16 |      0 |
| Desktop UI refactor flows                     |      6 |      0 |

The separate narrow-viewport UI refactor case failed and was left outside the requested desktop scope. Optional appearance-flag tests account for the skips. Most other failures time out on previous home/editor selectors or removed template/card/page controls. There are also canonical-state assertions and export comparisons that need further test maintenance or investigation; this pass does not claim every broad-suite failure is harmless or proven preexisting.

The audit started before the two legacy export tests were corrected to compare 1Ã— decoded pixels. Its two legacy failures were subsequently resolved in the separate **2/2 passing** rerun described above; the full 41/60/28 count is the actual recorded audit, not an adjusted estimate. The expanded phase-C export comparison remains unresolved in the broad suite.

JSON results and retained traces are under `tmp/full-browser-results.json` and `tmp/full-browser-traces/` (gitignored). The broad suite includes mobile checks for completeness, but this pass does not redesign mobile behavior. A fully green repository-wide browser suite remains outstanding.

The main production JS chunk is 882.44 KB (338.33 KB gzipped), still above Vite's 500 KB warning. The phase responsible for the earlier growth was not established in this pass. Local checks do not establish deployment or live AI behavior.

## Visual artifacts

Captured and inspected locally; artifacts are gitignored:

| Surface, 1366Ã—768 | Before refinement                                                                | After refinement                                                               |
| ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Home               | [Before](../../exports/craft/desktop-before/home-1366x768.png)                   | [After](../../exports/craft/desktop-after/home-1366x768.png)                   |
| Empty editor       | [Before](../../exports/craft/desktop-before/editor-empty-1366x768.png)           | [After](../../exports/craft/desktop-after/editor-empty-1366x768.png)           |
| Shape inspector    | [Before](../../exports/craft/desktop-before/editor-shape-inspector-1366x768.png) | [After](../../exports/craft/desktop-after/editor-shape-inspector-1366x768.png) |
| Text inspector     | [Before](../../exports/craft/desktop-before/editor-text-inspector-1366x768.png)  | [After](../../exports/craft/desktop-after/editor-text-inspector-1366x768.png)  |
| Photo inspector    | [Before](../../exports/craft/desktop-before/editor-image-inspector-1366x768.png) | [After](../../exports/craft/desktop-after/editor-image-inspector-1366x768.png) |

[File menu](../../exports/craft/desktop-after/editor-file-1366x768.png) Â· [Background palette](../../exports/craft/desktop-after/editor-background-1366x768.png) Â· [Board setup](../../exports/craft/desktop-after/setup-1366x768.png)
