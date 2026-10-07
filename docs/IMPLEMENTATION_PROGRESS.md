# V1 implementation

## Release order

1. Licensing/provenance, accurate font labels and consistent Gratitude Studio naming.
2. Separate tooling/formatting changes, CI and deployment/privacy groundwork.
3. Shared immutable media storage, photo uploads and portable backups. Media cleanup must preserve undo/redo and snapshot references.
4. Editor design, keyboard/mobile accessibility and photo-heavy performance.
5. Optional per-board Plan and basic Track, off by default, with durable goal identities.

Advanced snapshots/recaps, public AI, offline service workers and asset replacement are separate later decisions. The gallery stays exactly 250 uploaded SVGs; guides and artboard containment stay on by default; no collaboration.

## In progress

Foundation work has started. Complete upstream font notices are included; misleading font IDs remain compatibility aliases and the UI presents the real font families. Owner confirmation is pending for the original-code license/holder. Existing third-party copyrights are retained.

The production build emits complete bundled-font, retained-code and runtime dependency licenses. The package name is `gratitude-studio`; AI setup uses the project root. GitHub CI now runs build, unit/server/asset checks and Chromium browser tests; local tests retain Edge. Architecture checks reject Excalidraw imports throughout the runtime and direct Konva imports outside the canvas implementation.

Photo storage and uploads are implemented: file picker and board drops, immutable originals, 2560-pixel working images, SHA-256 deduplication, original downloads, frame/crop/edit integration and portable backups with photos from all pages. Existing IndexedDB version-one boards migrate without deletion. Unsupported/oversized files, malformed photo references, corrupt media identities, quota failures and stale asynchronous insertions are rejected. Automatic media deletion is disabled to preserve history references.

ESLint and Prettier are installed, configured and enforced by CI. The Node unit
suite uses deterministic canvas text metrics while retaining Konva's layout
logic; actual rendering is exercised by browser tests. Curated-pack verification
resolves the provider's dependencies as modules and checks all 250 SVGs,
pagination, search, resolution and asset contracts. CI runs every server test.
Optional Plan/Track is deferred and excluded from this release-fix scope.

Local verification on 7 October 2026: lint, formatting, production build,
39 unit/architecture tests, 14 server tests and the exact-250 asset check pass.
The main production JS chunk is 422 KB (87 KB gzipped), below Vite's 500 KB warning;
curated SVG sources load only when requested. The AI panel stays hidden unless
the backend reports it is configured. All 59 Edge browser cases are verified:
56 passed in the full run, and the final three passed after test corrections in
a focused rerun. Coverage includes selection/deselection geometry and artwork
draw counts, uploads, original-byte downloads, independent-context backup
restoration, PNG/PDF export, templates, clipboard and optional AI.

The active app imports the v5 styles only. Older stylesheet generations are
retained as historical files and are not stacked into the production CSS.
Deployment instructions are in [DEPLOY.md](../DEPLOY.md).

Root-level UI preview PNGs have moved to `docs/previews/` as design references.
Selection hit-region callbacks now retain a stable identity so selection-only
updates redraw the overlay without redrawing the artwork layer. Browser coverage
checks both canvas geometry and image draw counts when selecting/deselecting.

Font provenance now records metadata from all three actual binaries and a SHA-256 match between the bundled Virgil font and its official upstream OFL distribution. The legacy embedded Virgil wording is documented rather than omitted.

Public deployment is not verified. Live AI remains unverified. CI results must be established by a GitHub run, not inferred from local tests.
