# Deploy VisBo

The editor can run as a static site. Use Node.js 22.15 or later (asset verification
uses Node's TypeScript stripping API).

## Verify and build

```sh
npm ci
npm run lint
npm run format:check
npm test
node --test server/*.test.mjs
npm run build
npx playwright test
```

Local browser tests use Microsoft Edge. GitHub Actions installs Chromium and
uses it when `CI=true`.

## Static hosting

Configure your static host with build command `npm run build` and publish
directory `dist`. Serve from the domain root over HTTPS. Upload the complete
directory, including `THIRD_PARTY_LICENSES.txt`, so asset and font notices travel
with the build. No frontend secrets or backend are needed for editing, uploads,
backup/restore or PNG/PDF export.

The AI panel is shown only when the same-origin `/api/ai/status` endpoint reports
`configured: true`. With no backend it stays hidden. To enable AI, deploy the
server behind the same-origin `/api/ai` route and follow [AI_SETUP.md](AI_SETUP.md).
Keep provider credentials server-side.

Boards live in the browser's IndexedDB and are tied to the site origin. Before
moving between localhost, a preview URL and a public domain, save a portable
backup and restore it on the new origin.

## Release checks

On the deployed URL, verify photo upload, reload persistence, portable backup
restoration, and PNG/PDF download. Confirm AI is hidden without a configured
backend. Check the actual GitHub Actions run after pushing; local checks cannot
prove the remote workflow passed.

The bundled starter-photo notice identifies the Unsplash License, which permits
commercial use and distribution, prohibits selling unmodified photos and
compiling a competing image service. See the [photo notice](public/template-photos/NOTICE.md)
and [license](https://unsplash.com/license). The image URLs record provenance;
individual photo provenance has not been independently re-established.

No public deployment is recorded yet.
