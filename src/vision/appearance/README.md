# Canonical appearance ? active Phase C model

Text, Quick Shapes and Drawings use canonical document v3 and appearance v1.
The existing canvas, history and storage remain in place. All appearance controls
call one validated update function; canvas and exports share the same Konva mapping.
Assets retain their separate existing media schema. No Tweakpane is installed.

## Authoritative format

Canonical documents use `version: 3`; each editable object's `appearance` uses
`version: 1`. Editable kinds remain `text`, `shape`, and `drawing`, with an
appearance discriminant of `text`, `closed-shape`, `open-shape`, or `drawing`.

| Property     | Semantics                                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fill`       | Text/closed shapes only. `{enabled, paint}`; paint is solid color or linear/radial tuple of exactly two colors at positions 0 and 1. Disabled fill preserves its inactive paint.             |
| `stroke`     | Glyph outline for text, geometric border for closed shapes, actual stroke for lines/arrows/drawings. Explicit color, width, dash style, cap, join and scaling. No sticker-outline confusion. |
| `background` | Textbox background color or null; geometry/padding/radius remain object data.                                                                                                                |
| `opacity`    | A single 0–1 value in appearance, applied once to the outer object Group.                                                                                                                    |
| `shadow`     | Explicit enabled/color/opacity/blur/offsets. Migration materializes the legacy preset/glow values; no separate preset fallback competes with those fields.                                   |
| `effect`     | Existing effect identifier. Per-kind capabilities prevent newly choosing ineffective effects. Outline/glow commands materialize their stroke/shadow preset values.                           |
| `silhouette` | Existing alpha-outline width/color, independent of geometric or glyph stroke. Preserve saved settings rather than discard them.                                                              |

Typography, rich-text runs, text contents, shape/path geometry, corner radius,
drawing points/tension, grouping, IDs, locking and media metadata stay with the
object. Explicit character style overrides object defaults, including explicit
false values. Fill edits never rewrite rich-text runs.

Assets retain their original schema and are never eligible for canonical
appearance updates. That preserves existing curated flags and uploaded-photo
workflows; appearance migration does not resolve/rewrite assets or portable media.

## Entry points

- `createAppearance(kind)` creates fresh canonical defaults for object creation.
- `normalizeAppearance(value)` strictly validates/normalizes a complete appearance. Invalid values, unknown fields/enums, and unsupported schema versions throw; input is not mutated.
- `migrateDocument(value)` validates and migrates v1/v2 boards or validates already canonical v3. Every current and archived page collection is converted; source is untouched. Repeated migration and JSON round trips are idempotent.
- `migrateBackup(value)` migrates the document and preserves its portable media envelope for the existing media validator.
- `migrateClipboard(value, target)` validates legacy v1/canonical v2 selection envelopes and calls the same document migration core. Identity/group/connector remapping remains the existing adapter's responsibility.
- `updateAppearance(document, selectedIds, id, change)` is the sole appearance update pipeline. It checks selection membership/existence/locking, applies only the named change, enforces capabilities, validates the result, and returns the same document for no-ops/rejected eligibility. The existing adapter commits changed results and owns gesture coalescing. Selection batches are atomic and share one history command.
- `resolveTextStyle(item, index)` and `resolveTextPaint(item, index)` compute run
  precedence without mutating the document; explicit run colors resolve to solid
  paint, while unformatted characters retain the object gradient.

## Migration semantics

Legacy mappings are frozen to existing renderer behavior, independent of future
new-object defaults. `color` wins over `fill`; disabled fill retains gradients;
text backgrounds and silhouette outlines are separate. Line/arrow and drawing
stroke colors come from `color`, not borderColor. Zero line/drawing widths resolve
to the existing fallback 4. Simple text and RichText have different solid fallback
colors; migration accounts for that. Existing outline minimums are materialized,
including the text-versus-shape difference. Shapes rendered as scaled Paths retain
fixed stroke scaling; other primitives/text/drawings retain transform scaling.

All appearance fields on editable objects are replaced by one appearance object.
Legacy fields that the branch never rendered (e.g. fill on an open drawing or
borderColor on a line) do not become newly effective styling. Unsupported legacy
effect identifiers within the existing known enum are retained, but capabilities
do not offer them as new edits. Malformed colors/measurements fail explicitly
rather than being silently dropped. Provider/media validation remains in the
existing loader, not this module.

Canonical validation reuses the existing geometry validator through a temporary
validation-only view. That view is never rendered, serialized, or returned; it is
not a legacy-format editing adapter. Mixed canonical/legacy styling on editable
objects is rejected. No migration modifies asset records.

## Active integration and recovery

`document.ts` aliases the canonical types. Legacy definitions and geometry
validation are frozen in `legacy.ts`/`legacyValidation.ts` for import validation
only. Normal loading, library listing, backup restore, clipboard envelopes and
legacy template imports all use the same migration core. New objects use
canonical factories. Generic `patchItems` rejects appearance and legacy style
writes on editable objects. It continues to update content, typography, runs,
geometry, layers and the separate media schema.

`canvas/appearance.ts` maps paint, stroke, dash, scaling and literal shadow values
once for both `ItemContent` and archived-page exports. Rich text resolves each
character's paint before assigning Konva fillPriority: explicit run colors are
solid, other characters retain the object gradient. Equal first-stop/run colors
still create separate paint runs. Text outline and background remain independent.

Glow and outline selections materialize presets. Choosing another effect clears
the previous preset. Editing shadow or stroke explicitly exits its preset tag,
so later choosing none does not erase the custom values. Existing imported effect
values are preserved without rendering fallback styles. Typography defaults never
rewrite explicit character runs; explicit range editing remains a content command.

`VITE_APPEARANCE_PERSISTENCE=preview` builds use this same renderer and migration
but never persist board writes. Normal builds persist v3. The first overwrite of
a legacy board preserves its original record under `appearance-recovery:v2:<key>`
in the same transaction. Library extraction also preserves the source multipage
record. Recovery records are excluded from the current library.

The standalone `scripts/appearance-recovery.mjs` and browser recovery module are
explicit rollback boundaries, never imported by the app. They convert representable
v3 documents to a separate v2 backup or atomically convert existing stored projects.
Media stays in place; the browser utility downloads a v3 storage snapshot first.
Unsupported legacy semantics abort the whole operation without changing projects.
See `docs/UNIFIED_APPEARANCE_PHASE_C_REPORT.md` for exact commands and limitations.

Phase C tests verify exact legacy canvas/PNG/PDF pixels, active appearance commands,
new-format save/restore/clipboard, migration idempotence, selection/group/duplicate,
gesture undo/redo, asset exclusion, validation-mode persistence and actual old-renderer
rollback. The one intentional legacy correction is character formatting precedence
over object gradients. Tweakpane lifecycle and replacement of existing inspector
controls remain Phase D; it can bind to the current model and update API directly.
