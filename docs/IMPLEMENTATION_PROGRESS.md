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

ESLint/Prettier setup is still pending and is not claimed as a completed tooling package. Optional Plan/Track, broader design/accessibility and performance work remain to be implemented.

Latest local verification: production build, 31 unit/architecture tests, 7 server tests, 24 Edge browser tests and the exact-250 check pass. Upload tests prove independent-context backup restoration, original-byte recovery, working-image downscaling, deduplication, frame cropping, image/PDF export, delayed-insertion guards and IndexedDB migration. The Uploads panel screenshot was inspected.

Font provenance now records metadata from all three actual binaries and a SHA-256 match between the bundled Virgil font and its official upstream OFL distribution. The legacy embedded Virgil wording is documented rather than omitted.

Public deployment is not verified. Live AI remains unverified. CI results must be established by a GitHub run, not inferred from local tests.
