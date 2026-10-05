# Pasted editor proposal: implementation status

4 October 2026. Runtime: `v1/`. This maps the supplied proposal to actual product behavior. It does not treat every description of Canva's broader product as an instruction to replace the uploaded library or add collaboration.

The user's constraints remain: exactly 250 curated gallery assets, guides on by default, separate Snap to edges containment on by default, AI integration allowed, and no live collaboration.

| Proposal area | Implemented behavior | Limits / setup |
| --- | --- | --- |
| Selection | Click/modifier selection, marquee, select all and contextual controls | Layers also provides an accessible selection route |
| Move / resize / rotate | Drag, handles, ratio switch, numeric geometry, keyboard nudge and rotation snapping | Resize alignment guides currently apply to unrotated selections |
| Groups | Group/ungroup, nested groups, member scope, shared transforms and independent duplication | Children retain page-space geometry plus ancestry paths |
| Layers | Tree, expand/collapse, hide, position lock, group/member sibling drag reorder, four ordering actions | Cross-parent drag nesting is deliberately rejected |
| Lock | Individual/group position locks | Content styling/deletion remains available |
| Alignment / distribution | Page/selection alignment and equal horizontal/vertical gaps | Preserves internal group layout |
| Boundaries / guides | Default guides with six-screen-pixel tolerance; separate mandatory artboard containment | Alt bypasses guides only; export always clips to the page |
| Clipboard / duplicate | Native clipboard with session fallback; validated cross-tab payloads, text paste, identity remapping | Browser permissions can require the fallback |
| Fill / opacity / borders | Fill/color, opacity, width/color/patterns and rounding | Arbitrary frame masks use their declared geometry |
| Shadows / effects | Presets plus color, opacity, blur and offsets; glow/echo/glitch/outline where applicable; quick styles | Curved text and range formatting are separate modes |
| Text | Local fonts, size/weight, decorations, justify, spacing, case and curve | Small font selection; no external font library added |
| Advanced text | Range bold/italic/underline, superscript/subscript, kerning/ligature switches | Paragraph layout is deliberately narrower than a publishing app |
| Gradients | Linear/radial text, shape and page gradients | No brand/table-cell product systems |
| Image editing | Crop session, drag/apply/cancel, rotation/flip-aware positioning, fit/fill, adjustments, blur and presets | Original assets remain intact |
| Frames | Curated slot clipping, replace/detach; circle/heart/star/triangle/hexagon/cloud masks; eligible shape-to-frame conversion | No video content inside frames |
| Style transfer | Compatible copy style and local reference-image color matching | Color matching is statistical transfer, not AI reconstruction |
| Workspace | Pan/scroll, Hand/Space, wheel/pinch zoom and Fit around fixed pages | The exportable white board remains bounded as requested |
| Drawing | Pen, marker, highlighter, stroke eraser and simple shape assistance | Recognition currently targets simple closed rectangles/circles |
| Shapes / connectors | Procedural basic/decorative shapes, lines/arrows and bound arrows following objects | Straight connectors; no orthogonal graph-routing engine |
| Templates | Existing layouts plus themed editable vision-board compositions | Generic Canva flowchart/Kanban/business templates are not a separate library |
| Content library | Exactly 250 uploaded curated graphics, stickers, tape, doodles, frames, words and textures | No stock photo/video/audio providers added |
| Photos | Personal PNG/JPEG/WebP upload and board drop; immutable original storage, deduplicated working images, frames/crop/edits and portable backups; AI images remain supported | Up to 25 MB per file, 2560 px working edge, 50 MP decoded source; no stock search; stored originals are retained for history safety |
| Goal / affirmation cards | Editable grouped cards and quotes | Ritual/WOOP/Today screens remain outside this editor implementation |
| AI generation | Image, quote and editable board preview/insertion; generated backgrounds | Cloudflare account credentials required for live inference |
| AI search | Generated search tags query only the curated pack | No external image-provider search |
| AI edit / layers | Whole-image or masked-region editing; foreground extraction plus background reconstruction into two editable layers | Cloudflare/rembg setup needed; no arbitrary multi-object Magic Layers |
| Upscaling | Local resampling plus an ESRGAN Images Worker integration | AI service must be deployed; its quota/billing is separate |
| Image-to-video | Optional two-second 720P MP4 preview/download integration | Paid provider; disabled by default; live service unverified |
| Collaboration | Excluded by the user's explicit decision | No live cursors/comments/tags/following |
| Export | PNG/2x/4K, selection, transparent PNG, JPEG, current/all-page PDF, print and credits; wallpaper/social/print page presets | Video is an export, not a timeline editor |
| History / persistence | Gesture transactions, undo/redo, async revision guards, IndexedDB status, version migration and validated backup/restore | Local browser storage, no account sync |

Validation: production build; 31 unit/architecture tests; 24 browser tests; 7 server protocol tests; exact-250 asset integrity check. Browser tests cover native clipboard, rich text, multi-page PDF, connector identity, original-preserving AI edits, stale preview rejection, shape-mask pixels and editable/undoable layer extraction. External responses are mocked; live inference and cloud deployment are not verified.

See `v1/AI_SETUP.md` for provider configuration. The broader app still needs ritual integration and deployment; this work does not claim full Canva product parity.
