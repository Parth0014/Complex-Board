# Vercel team preview

Import `Parth0014/Complex-Board` into Vercel, selecting branch `muse/craft-pass` for the preview. Root directory is the repository root. The checked-in configuration uses Vite, `npm run build`, and `dist`, with API routes handled by a Node.js Vercel Function. No localhost API server is needed in production.

## Environment variables

Set these under Vercel Project Settings > Environment Variables for Preview and Production, then redeploy:

- `UNSPLASH_ACCESS_KEY`: enables photo search.
- `IMAGE_TOKEN_SECRET`: a stable random secret (at least 32 characters); keep it unchanged between instances. If omitted, the Unsplash access key is used for signing.
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`: enable AI image and affirmation generation.
- `ENABLE_AI_VIDEO=false`: keep video disabled for the team preview.

Do not use `VITE_` prefixes for secrets. Do not upload `.env`. `AI_PORT` is local-only. `APP_ORIGIN` is optional for an additional allowed origin; the current Vercel deployment origin is accepted automatically, including previews.

Optional background removal and upscaling require externally hosted HTTPS services (`REMBG_URL`, `UPSCALE_URL`, `UPSCALE_TOKEN`); a localhost service is unavailable from Vercel. Leave these unset until hosted. Never copy the localhost REMBG example into Vercel.

## Team testing

Enable Vercel Deployment Protection and give teammates access to the preview. The app has no shared workspace or account sync: boards and uploads live in IndexedDB in each browser and origin. A different preview URL gets separate browser storage. Use board-file export/import to share test boards.

After deployment, test creating/reopening a board, uploading and reusing a photo on another board, Unsplash search/insertion, generation, crop, and export. `/api/images/status` and `/api/ai/status` report configured features without exposing keys.

## Limits

The function has a 120-second duration budget. Hosted API request/response bodies are capped conservatively at 4 MB to stay below Vercel's 4.5 MB limit. Large AI image edits may need smaller input images; normal local uploads remain in browser storage and do not use the function. Search caching and concurrency limits are per instance, not a global quota system. Deployment Protection is appropriate for this internal team preview.

References: https://vercel.com/docs/frameworks/frontend/vite and https://vercel.com/docs/functions/limitations.
