# Editor fluidity and UI audit — 18 October 2026

This pass builds on `godmode-audit.md`. It preserves saved-board identities, the three scrapbook templates, the 18 interlocking collages, photo cropping behavior, and the user's existing working changes.

## Changes delivered

| Area | Finding | Change and evidence |
| --- | --- | --- |
| Preview queue | A rejected preview stopped its worker and supplied no retry action. | Each preview handles its own failure; other work continues. Failed cards have a retry. Browser regression reproduced the missing retry before the fix. |
| Progressive previews | One slow preview blocked adding and shuffling a different, ready collage. | Actions depend on the selected card's readiness. Browser regression holds other requests pending while checking the ready actions remain enabled. |
| Saved Arrange selection | Valid JSON containing `null` crashed the chooser. | Validate stored state and photo permutations; recover to photo selection without clearing other saved data. Browser regression failed before the fix and passes afterward. |
| Collage navigation | Eighteen tall cards were difficult to compare. | Added All / Flow / Cuts / Inlay controls, a sticky browsing strip, four desktop columns, and two phone columns. All 18 previews remain cached. |
| Selection feedback | Cards relied heavily on a large accent fill. | Use a restrained outline and check mark; keep the photos visually dominant. |
| Card controls | Shuffle overlapped long descriptions in actual screenshots. | Keep Shuffle in document flow. The real-photo test checks description/button geometry at phone width. |
| Loading feedback | Placeholder dimensions and readiness were unclear. | Keep each preview's aspect ratio while loading and show a single readiness count. Template loading has a reserved skeleton and retry action. |
| Busy dialogs | Escape could animate away a dialog whose owner refused to close it. | Shared `dismissible` guard is checked before animation starts. Applied to Arrange, Replace image, and upload deletion. Browser test holds insertion pending and verifies Escape leaves the dialog visible. |
| Modal focus | Programmatic focus could move to the editor behind the dialog. | Shared focus containment respects nested dialogs and owned popovers. Existing Tab / Escape / focus-return checks also pass. |
| Replacement startup | Hidden Unsplash and generation panels mounted immediately. | Lazy-load and mount providers on their first visit; retain visited panels' state when switching sources. Browser test verifies zero provider requests when opening Uploads, then a status request when opening Unsplash. |
| Artwork startup | Catalog initialization encoded 330 SVGs with embedded fonts, including when Elements was closed. | Metadata stays available; each asset's encoded URL is created on first access and reused. Existing catalog, IDs, search and rendering tests pass. No numerical startup-speed claim is made without a controlled benchmark. |
| Pointer zoom | Fitted boards could request a negative horizontal scroll position, causing visible pointer drift. | Reserve horizontal camera travel. The previously failing pointer-anchor test now passes alongside the other five board geometry tests. |

## Audit coverage

| Part | Execution evidence in this pass |
| --- | --- |
| Collage geometry, counts and formats | Full unit suite, including exhaustive design coverage for the supported image counts and aspect ratios. |
| Photo selection and remembered batches | Real uploaded photos, saved-state recovery, cached reopening and insertion. |
| Shuffle | Real preview image changes; chosen layout inserts successfully after reopening. |
| Collage copy membership | Complete and partial copies retain the expected independent adjustment controls. |
| Text and font selection | Font changes retain selection; held-arrow edits undo and redo with Ctrl+Y. |
| Canvas camera | Pointer anchor, plain-wheel scrolling, scrollbar stability, resizing, centering and reachable board bottom. |
| Dialogs and menus | Busy Escape, focus containment, Tab trap, focus restoration and menu keyboard navigation. |
| Formatting | Live numeric updates, cancellation, Undo and accessible color errors. |
| Errors and unavailable actions | Persistent dismissible errors and focusable Share explanation. |
| Responsive chrome | No horizontal overflow at 1366×768, 1920×1080, 768×1024 and 390×844. |
| Accessibility | Rail labels, icon names, first 25 keyboard focus stops, footer/scrollbar separation and reduced motion. |
| UI visuals | Inspected real-photo desktop and mobile screenshots; corrected the overlap they revealed. |
| General code quality | Repository-wide formatting, lint, TypeScript, unit tests and production build. |

## Results

- Godmode preflight: **5 passed, 0 failed, 0 skipped**.
- Unit suite: **269 passed in 38 files**.
- Focused editor browser suite: **22 passed**.
- Responsive/accessibility browser suite: **6 passed**.
- `git diff --check`: no whitespace errors; Git reports line-ending conversion warnings for existing Windows working files.

The initial parallel browser invocation shared Playwright's default output folder and collided while writing traces. It was rerun with independent output folders; the results above are from those clean runs.

### Reproduce

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright test tests/fluidity.spec.ts tests/craft-audit.spec.ts tests/reliability.spec.ts tests/dialog.spec.ts tests/board-layout.spec.ts tests/editor-correctness.spec.ts tests/menu.spec.ts --workers=2 --output=.godmode/results/editor
npx playwright test tests/ui-craft.spec.ts -g "no horizontal overflow|rail tab labels|floating dock|icon-only|25 keyboard|reduced motion disables" --workers=1 --output=.godmode/results/accessibility
```

Local screenshots: `.godmode/screenshots/chooser-desktop.png` and `.godmode/screenshots/chooser-mobile.png`. Local logs: `.godmode/logs/atomized-preflight.log`, `atomized-browser-final.log`, and `accessibility-browser-final.log`. These artifacts are ignored by Git.

## Remaining limits

- This is **not** a claim that every issue in the repository has been eliminated. The earlier full-browser diagnostic had 66 failures and 28 skips. It includes obsolete routes, removed controls and exact historical export baselines. This pass fixed and reverified its pointer-zoom defect, but did not migrate or rerun that entire legacy suite. Its old totals are historical, not new results.
- Production still reports a large main JavaScript chunk. On-demand provider chunks now build separately; a broader catalog/module split needs its own measured rendering and saved-asset compatibility checks.
- Live paid generation, provider credentials, physical touch hardware and production deployment were not verified. The replacement-provider test checks when requests start using controlled responses.
- There is no new full export-pixel parity claim. The old baseline differences need separate renderer/browser-version triage; they were not hidden by widening tolerances or replacing baselines.
