# Unified appearance implementation plan

This approved revision supersedes the Phase 0 provenance blocker and the original four-control Phase 1 restriction. All ordinary text, shape and drawing objects are in scope regardless of origin. Assets remain outside the canonical editable appearance system. No origin markers or provenance checks.

## Phases and gates

**A: Simplification.** Remove goal/affirmation card generators, their Create UI and adapter contract. Keep saved card objects and unrelated AI affirmation generation. Audit all style writers and preserve fixtures/exports before changes. Gate: build, lint, unit tests, saved-card reopening/export checks and AI regression pass.

**B: Independent model.** Introduce strongly typed canonical appearance, per-object capabilities, validators, normalization, a single immutable validated update function, and deterministic versioned migration. Test these without connecting them to live storage, history or rendering. Gate: migration idempotence, serialization, style preservation, per-kind semantics, all loading envelopes, and legacy runtime regressions pass. Keep document version 2 live; version 3 is staged only.

**C: Rendering and format activation (not authorized in this task).** Connect the shared appearance-to-Konva translation, canonical update pathway and version 3 document format together. Replace legacy field reads/writes throughout creation, rendering, clipboard, style copying, and imports. Preserve stroke scaling. Do not activate canonical persistence while the renderer still depends on legacy fields. Gate: migrated fixtures visually match their captured legacy PNGs, including archived pages and rich text.

**D: Tweakpane (not authorized in this task).** Add official pinned v4 dependency and one adapting inspector in the existing location. Route toolbar/context actions through the same update function. Remove replaced controls; handle refresh, stale selection, continuous history gestures, disposal and Strict Mode. No second inspector, storage or history.

**E: Verification and cleanup.** Full create/edit/switch/copy/duplicate/undo/redo/reload/export coverage, asset immutability, lifecycle and mobile tests. Remove obsolete editable-object appearance fields and paths after activation. Keep existing photo/asset appearance semantics outside this refactor.

## Six accepted refinements

1. **Every loading path:** audit normal IndexedDB loading, home library listing, backup restoration, portable/system clipboard import, internal clipboard duplication, and all multipage item collections. Use one migration core with separately validated envelopes; migrate before page extraction/media resolution at activation.
2. **Rich text:** character formatting overrides object defaults. Preserve text, runs and explicit false values. Object fill updates do not rewrite character runs. Plain text, RichText and TextPath need independent rendering parity checks.
3. **Stroke semantics/scaling:** closed shapes use geometric borders, text uses glyph outlines and separate backgrounds, open lines/arrows/drawings use stroke. Preserve the existing Path strokeScaleEnabled behavior, Group scale behavior and drawing geometry/tension. Keep silhouette outlines distinct from geometric/glyph strokes.
4. **Gradients:** exactly two stops at 0 and 1, linear/radial; existing geometry determines direction/radius. No angles, arbitrary stops or fake controls. Disabled fill retains its inactive paint in the same fill value so old no-fill styles are not lost.
5. **Legacy visual evidence:** capture real saved cards plus representative fixtures and PNG exports before migration. Unit-test exact resolved style semantics in Phase B; actual canonical-renderer pixel parity is a Phase C gate, not a Phase B claim.
6. **Existing failures:** record older browser tests that assume an editor at `/` separately. Do not change unrelated infrastructure to make them pass or describe them as new regressions. Clean-install baseline restriction remains documented.

## Source of truth and loading activation

```text
Current A/B runtime: legacy document v2 → existing patches/history → existing Konva renderer
Staged B module: validated legacy/envelope → pure migration → canonical document v3
Future C/D runtime: canonical document → one validated appearance update
                   → existing history → shared Konva appearance mapping → canvas/export
```

The staged model is not a second active editing architecture: nothing in the live app imports it. It replaces the legacy appearance system when C activates it. Migration is one-way; no reverse document format or dual writes are added.
