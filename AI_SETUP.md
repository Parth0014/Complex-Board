# AI setup

The editor has Cloudflare Workers AI integration for image generation (FLUX.1 Schnell), affirmations and editable board plans (Llama 3.1 8B). Live collaboration is excluded at the user's request. The curated gallery remains exactly 250 uploaded assets; generated images belong to board content and are never added to that gallery.

## Local setup

1. Create a Cloudflare account and a Workers AI API token with access to your account. Use the Free plan if you want its enforced free quota. The provider requires credentials; there is no embedded public key.
2. Copy `.env.example` to `.env` in the project root. Fill `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` locally. Do not share or commit the file, and never put tokens in a `VITE_` variable.
3. Run `npm run ai:server` in one terminal and `npm run dev` in another.
4. Open the **AI** panel, choose Complete vision board, Image, or Affirmation, enter a prompt, generate, review the preview, then apply it. Replacing a nonempty composition requires confirmation and can be undone.

Complete vision board first asks AI for goal captions, individual image prompts, and a matching palette. It then generates an original image for each goal, showing progress before presenting the full preview. Applying creates editable photos, cards, and text in one composition sized for the current board. It does not use the curated library as a fallback; an image failure leaves the current board untouched. This workflow makes several image requests, so it takes longer and consumes more provider quota than generating one image. Search curated assets remains a separate library-search tool. Restart `npm run ai:server` after updating server code.

The server listens on localhost port 8787; Vite proxies `/api/ai`. A provider failure or quota exhaustion is shown in the UI. Cancel generation aborts the browser request; an upstream request already running may still finish and consume provider quota. Generated raster data and its source metadata persist in IndexedDB/backups, so reopening a board does not regenerate images.

## Background removal

Background removal is integrated with a separate, free, self-hosted [rembg server](https://github.com/danielgatis/rembg). Run it with the documented `rembg s --host 127.0.0.1 --port 7000` command after installing its CPU/server extras in an appropriate Python environment. Set `REMBG_URL=http://127.0.0.1:7000/api/remove` and restart the AI server.

Choose a graphic/image, open Style, and use Remove background. The server sends PNG bytes to rembg's file endpoint; it does not send arbitrary image URLs. Original assets remain intact, with an undoable rendered cutout stored on the item. First use downloads the selected model through rembg. Different model/checkpoint licenses should be checked before changing rembg's default model. `Upscale 2x` uses browser interpolation and is explicitly not an AI super-resolution model.

## Deployment

A static frontend alone cannot keep provider credentials secret or host these API routes. Deploy `server/index.mjs` behind the same-origin `/api/ai` route, configure environment secrets on the server, and set `APP_ORIGIN` to the frontend origin. The provided server binds to loopback for use behind a reverse proxy. Add authenticated access, durable rate limits and a daily budget before exposing a shared public generation endpoint. No production backend or account configuration has been deployed by this change.

## Verified provider basis (4 October 2026)

- Cloudflare has a daily free allocation, with paid usage beyond it on paid plans. [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- FLUX.1 Schnell uses four steps by default and returns a base64 image. [Model reference](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/).
- Availability and speed depend on provider load and quota; this implementation does not promise unlimited free generation.
- Pollinations now requires an API key too. [Official API documentation](https://gen.pollinations.ai/docs).

Tests mock provider responses to verify image/board insertion and failure handling. Live Cloudflare generation and live rembg inference require local credentials/services and have not been verified in this workspace.

## Selected-image editing and layers

The AI panel now offers whole-image editing and a percentage-based rectangular region mask. These use Cloudflare's [Stable Diffusion image-to-image](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-v1-5-img2img/) and [inpainting](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-v1-5-inpainting/) endpoints. Inputs are resized to a maximum of 512 pixels; quality depends on the model. Apply preserves the original asset, stores an edited rendition, and refuses stale previews after document changes.

Style > Split foreground/background combines rembg extraction with inpainting and creates two independently editable layers in one undo command. This is a two-layer workflow, not arbitrary object-by-object Magic Layers. Match reference colors is local statistical color transfer: select two images; the lower layer is the target and the upper layer is the reference. Curated search generates tags and searches only the uploaded 250-item pack.

## Optional AI upscaling

Resample 2x is local browser interpolation. AI upscale 2x uses a separately deployed Images Worker with ESRGAN. Configure `server/upscale-worker.wrangler.jsonc`, deploy it with Wrangler, and set the Worker's `SECRET_TOKEN` secret. Set `UPSCALE_URL` and matching `UPSCALE_TOKEN` on the Node server. Never put the token in frontend variables. The route caps output dimensions at 4096 and stores a non-destructive rendition.

The implementation follows the [Images binding](https://developers.cloudflare.com/images/optimization/binding/) and [upscale=generate](https://developers.cloudflare.com/images/optimization/features/#upscale) references. Images transformations have their own quotas/billing; they are separate from the Workers AI generation allocation. No Worker has been deployed or live upscaling tested here.

## Optional image-to-video

`ENABLE_AI_VIDEO=false` is the default. Enabling it exposes Animate selected image in the AI panel, using [Wan 2.7 I2V](https://developers.cloudflare.com/ai/models/alibaba/wan-2.7-i2v/) for a two-second 720P MP4 preview/download. This model is paid and does not meet a free-only requirement. Keep it disabled for free-only operation. The server accepts a local PNG, keeps credentials upstream, validates the provider download host, and limits the returned MP4 to 32 MB. Failed or unfinished jobs do not automatically retry. Video is an export, not an editable timeline inside the board.

All external inference remains unverified with live credentials. Protocol, failure handling, original preservation and browser insertion/apply workflows use mocked responses in tests.
