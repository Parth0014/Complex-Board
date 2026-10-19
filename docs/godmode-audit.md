# Repository reliability pass

The subsequent fluidity/UI pass is documented in [the atomized audit](godmode-atomized-audit.md), including 28 passing current browser checks and the remaining legacy-suite limits.

## Verified changes

- Fixed deferred keyboard edits being omitted when `flushSave()` runs before key release.
- Gave complete duplicated/pasted collages independent layout membership while preserving their shared boundaries.
- Detached partial collage copies from the original layout so copying one photo does not invalidate the original.
- Removed an unused divider-engine parameter caught by repository-wide lint.
- Made the normal dev, preview, build and test commands use Vite's runner config loader, which avoids configuration bundling failures in this Windows workspace.
- Applied the existing formatter to files failing the repository's formatting check.
- Split the exhaustive collage geometry check into separately reported designs without removing count, format or coverage assertions.

## Evidence

- Godmode preflight: **5/5 gates passed**: formatting, lint, type-checking, unit tests and production build. The unit suite passed **269 tests in 38 files**.
- Four new unit regressions failed before the fixes and passed afterward.
- The **3 current browser regression tests passed** (21.6 seconds), covering collage copies, font selection, keyboard history, template caching and narrow reduced-motion layout.
- Local API smoke checks passed for status, unknown routes, unsupported content types, rejected origins, malformed JSON and private-image URL rejection. No paid generation calls were made.

## Browser-suite follow-up

**Full browser diagnostic result:** 41 passed, 66 failed, 28 skipped, 0 flaky, across the 135-test pre-existing suite. This run used two workers and a 10-second per-test timeout. Timeouts are not proof of a product defect; not all failures have been triaged.

The broad legacy browser suite includes expectations for removed controls such as `Add goal card`. These expectations must be migrated to supported flows, rather than restoring features that were intentionally removed. It must not be reported as a clean full-browser pass. The runner stalled during preview-server cleanup after its workers exited; its owned preview-server tree was stopped to let it finish writing the JSON report.

Local detailed logs are under `.godmode/logs/` and are ignored by Git. Saved-board storage IDs were preserved.

## Commands

```text
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The detailed browser result is `.godmode/logs/browser-baseline.json`; failure summaries are `.godmode/logs/browser-failures.json`. These logs are local and ignored, while the regression tests and this report are repository files.

## Copy behavior

A complete full-page collage is duplicated at its authored position with a new independent layout identity. Offsetting each polygon independently would break shared edges when canvas constraints clamp them. An individual copied frame becomes an independent photo. A complete collage pasted onto a differently sized board is likewise detached rather than retaining incompatible layout coordinates.
