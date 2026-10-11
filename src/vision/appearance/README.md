# Canonical appearance — staged Phase B module

This module is deliberately **not imported by the live app**. Version 2 storage,
history and Konva rendering remain active until Phase C switches the format,
writers and renderer together. There are no dual writes, reverse-format adapter,
new history stack, Tweakpane dependency or second live inspector.

## Authoritative format

Canonical documents use `version: 3`; each editable object's `appearance` uses
`version: 1`. Editable kinds remain `text`, `shape`, and `drawing`, with an
appearance discriminant of `text`, `closed-shape`, `open-shape`, or `drawing`.

| Property     | Semantics                                                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fill`       | Text/closed shapes only. `{enabled, paint}`; paint is solid color or linear/radial tuple of exactly two colors at positions 0 and 1. Disabled fill preserves its inactive paint.             |
| `stroke`     | Glyph outline for text, geometric border for closed shapes, actual stroke for lines/arrows/drawings. Explicit color, width, dash style, cap, join and scaling. No sticker-outline confusion. |
| `background` | Textbox background color or null; geometry/padding/radius remain object data.                                                                                                                |
| `opacity`    | A single 0–1 value in appearance, applied to the outer object Group at activation.                                                                                                           |
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

- `createAppearance(kind)` creates fresh canonical defaults for future object creation.
- `normalizeAppearance(value)` strictly validates/normalizes a complete appearance. Invalid values, unknown fields/enums, and unsupported schema versions throw; input is not mutated.
- `migrateDocument(value)` validates and migrates v1/v2 boards or validates already canonical v3. Every current and archived page collection is converted; source is untouched. Repeated migration and JSON round trips are idempotent.
- `migrateBackup(value)` migrates the document and preserves its portable media envelope for the existing media validator.
- `migrateClipboard(value, target)` validates legacy v1/canonical v2 selection envelopes and calls the same document migration core. Identity/group/connector remapping remains the existing adapter's responsibility.
- `updateAppearance(document, selectedIds, id, change)` is the one future appearance update pipeline. It checks current single selection/existence/locking, applies only the named change, enforces capabilities, validates the result, and returns the same document for no-ops/rejected eligibility. The existing adapter will commit changed results and own gesture coalescing in C/D.
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

## Activation boundaries and remaining verification

Phase B tests cover fixture data/effective style preservation, all load paths,
the independent update function, JSON serialization, and migration of existing
coalesced history snapshots. They intentionally do not activate v3 saving or
test v3 inside the live DocumentHistory type. C must update its document type
without replacing its infrastructure, then test canonical commands in that same
history. New-format backup/clipboard media limits and provider checks must remain
in the existing loaders.

Actual migrated-renderer PNG parity is a **Phase C gate**. Current browser tests
prove unchanged legacy rendering/export and saved-card survival. Do not claim
that canonical documents are already rendered by Konva.

One known legacy conflict: RichText currently retains gradient fillPriority even
when a run has its own color. The approved explicit-character precedence rule is
tested in the canonical resolver; C must deliberately implement/test that case.
Full rich/curved-text gradient support must be capability-gated until proven.

Tweakpane lifecycle, accessible controls, external refresh, style copying across
surfaces and continuous-input history finalization are later C/D integration
requirements. No future phase is started by adding these model tests.
