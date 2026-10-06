# Gratitude Studio

A local-first vision board editor built with React, TypeScript and Konva. The asset library contains exactly 250 curated SVGs. Boards save locally in IndexedDB.

Add your own PNG/JPEG/WebP photos through Uploads or by dropping files onto the board. Originals stay separate from canvas edits; portable JSON backups include referenced photos. Photos are board content and do not change the curated gallery count.

## Run

Use Node.js 22 or later. From this project directory:

```sh
npm ci
npm run dev
```

## Verify

```sh
npm run build
npm test
node --test server/ai.test.mjs server/edit.test.mjs server/media.test.mjs
node scripts/verify-curated-pack.mjs
npx playwright test
```

Browser tests use installed Microsoft Edge and the built preview.

## Features and setup

See [editor features and limits](docs/PASTED_FEATURE_STATUS.md), [canvas interactions](docs/CANVAS_INTERACTIONS.md), and [optional AI setup](AI_SETUP.md). AI requires server-side credentials; optional paid video generation is disabled by default. Live collaboration is excluded.

Keep asset license metadata and [the curated library notice](public/curated-v1/NOTICE.md) when distributing the app. Generated builds, dependencies, test reports and local credentials are excluded from Git.

See [third-party notices](THIRD_PARTY_NOTICES.md), [privacy and storage](docs/PRIVACY.md), and [implementation progress](docs/IMPLEMENTATION_PROGRESS.md). GitHub CI verifies the editor with Chromium; local browser tests use Edge.

## Copyright

Copyright (c) 2026 Parth Patil. All rights reserved for original contributions owned by Parth Patil. Written permission is required to use or redistribute those contributions; see [LICENSE](LICENSE). Third-party components retain their own licenses and notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
