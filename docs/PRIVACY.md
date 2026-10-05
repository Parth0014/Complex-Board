# Privacy and local storage

The core editor does not require an account. Boards are saved in IndexedDB in the browser on the current device and website origin. Saving locally does not create a cloud backup. Clearing site data, using a different browser/device, or moving to a different domain can make these boards unavailable. Download a JSON backup before clearing data or moving to another website origin.

The curated SVG library and bundled fonts are local build assets. Board editing and normal exports do not require an AI request. Hosting providers still receive ordinary requests for the website and may retain access logs under their own policies.

## Personal photos and backups

PNG, JPEG and WebP uploads are processed locally. Immutable original files and downscaled canvas images are kept separately in IndexedDB. Identical originals share a SHA-256-based media ID. JSON backups include original files and working images referenced by every board page, including frame content and backgrounds; these backups can restore photos in a different browser. Original files can contain camera metadata, and that metadata remains in original-photo downloads and backups.

Removing a photo from the current page does not immediately remove its stored original: undo, redo and clipboard references may still need it. Automatic media deletion is not currently enabled. Clearing this site's browser data removes both boards and original-photo storage. Storage persistence is requested after upload when supported, but browsers may deny it. Save failures and storage limits are surfaced; a downloaded backup remains the portable recovery mechanism.

## Optional AI

AI requests occur only after an explicit action. Image generation, affirmations, board suggestions and search keywords send the entered prompt to the configured server and Cloudflare Workers AI. Image editing/inpainting sends the selected rendered image, prompt and optional mask. Background removal sends the selected rendered image to the configured rembg service. AI upscale sends the selected rendered image through the configured Images Worker. Optional paid video sends an image and prompt and is disabled by default.

Generated outputs and applied edits are saved with the board locally. Canceling a browser request does not guarantee that an upstream provider stops processing or charging for it.

The current Node server is for local development behind a reverse proxy. It is not ready for an unauthenticated public deployment. Keep public AI unavailable until authentication, durable limits, spending limits and provider retention policies are established. Credentials belong only on the server, never in frontend environment variables or backups.

Live provider inference and provider retention/deletion settings have not been verified in this project. This document does not promise that external services retain no data.
