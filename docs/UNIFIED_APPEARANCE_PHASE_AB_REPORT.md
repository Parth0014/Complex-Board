# Unified appearance Phases A and B

Branch: `feat/tweakpane-phase0-audit`. The approved unified plan supersedes the
earlier provenance blocker. No origin markers or provenance eligibility were
introduced. Phase C and Tweakpane integration have not started.

## Phase A

Commit: `b4b479d`.

- Removed `CreatePanel` goal/affirmation creation UI, the `createCard` adapter
  contract and the generator implementation.
- Existing saved cards remain their original grouped text/shapes. No saved
  objects, styles, grouping, geometry or typography were deleted.
- AI affirmation insertion and all Quick Shapes remain intact. Curated assets,
  uploaded photos, selection, drawing interactions, storage and history remain
  unchanged.
- Captured a real generated legacy card board, representative style fixtures,
  original canvas screenshots and PNG exports before removal.
- Added a refined A–E plan and appearance-write/load-path audit.

Phase A checks: build/lint pass; 55 existing unit tests pass; 9 browser tests pass,
including exact PNG byte equality for saved cards and the representative style
fixture, save/reopen, and AI affirmation insertion.

## Phase B schema and migration

New independent module: `src/vision/appearance/`.

- `types.ts`: canonical document v3 and appearance v1; discriminated per-kind
  appearance, two-color paints, explicit stroke/shadow/opacity/effect/silhouette.
- `defaults.ts`: canonical defaults for future creation, not legacy-shaped data.
- `validation.ts`: strict schema validation and deterministic normalization.
- `capabilities.ts`: glyph-outline/geometric-border/open-path semantics and
  supported properties/effects.
- `migration.ts`: one immutable migration core for document/page collections,
  backup envelopes and clipboard imports. Assets remain byte-equivalent.
- `update.ts`: one independent validated update function and rich-text precedence.
- `appearance.test.ts`, `loading.test.ts`: schema/migration/semantics and real
  existing adapter/library load-path regression tests.
- `README.md`: invariants, mappings, activation requirements and limitations.

Canonical editable objects do not contain legacy color/fill/gradient/border/
opacity/shadow fields beside their appearance. Textbox backgrounds are separate
from glyph fill, and silhouettes are separate from strokes. Explicit text runs
override defaults. Drawings/line/arrow have no fill controls. Existing Path stroke
scaling is encoded and protected from ordinary style updates.

The migration is deterministic, versioned and idempotent. It preserves object
identity, geometry, content, runs, group hierarchy, every page collection and
effective renderer styles. Disabled fill retains its paint. Defaults, zero-width
fallbacks, shadow/glow parameters and text-versus-shape outlines are resolved
once. Invalid/mixed schemas reject rather than silently discard styles.

**Activation is deferred:** no live app import of the new module, no change to
`newBoard`, storage validators, backup/clipboard formats or rendering. Live
documents remain version 2. Canonical persistence and rendering must switch
together in Phase C. The staged module is not a second active editing system.

## Files changed

Phase A modified:

- `src/studio/CreatePanel.tsx`
- `src/vision/contracts.ts`
- `src/vision/canvas/KonvaCanvasAdapter.ts`

Phase A added:

- `docs/UNIFIED_APPEARANCE_PLAN.md`
- `docs/APPEARANCE_WRITE_PATHS.md`
- `scripts/capture-appearance-baseline.mjs`
- `tests/appearance-legacy.spec.ts`
- `tests/fixtures/legacy-cards.json`
- `tests/fixtures/appearance-v2.json`
- `tests/fixtures/appearance-multipage-v2.json`
- `exports/appearance-legacy/cards.png`, `cards-canvas.png`, `styles.png`, `styles-canvas.png`

Phase B added the nine files listed above under `src/vision/appearance/` and this
report. No dependencies or lockfile changes.

## Final checks

- `npm test`: **17 files, 97 tests passed** (42 new model/loading tests).
- `npm run lint`: passed, including shared-token/cascade rules.
- `npm run build`: passed; existing bundle-size warning remains. Bundle output
  matches Phase A, confirming the inactive model adds no live runtime code.
- `npx playwright test tests/appearance-legacy.spec.ts tests/ui-refactor.spec.ts`:
  **9 passed** after Phase A and again after Phase B.
- Captured documents migrate twice and survive JSON round trips without changing
  canonical state. All nonappearance properties are preserved.
- Real normal initialization/save, library page extraction, backup restore,
  system and internal clipboard, plain-text paste, duplication and multipage
  restoration keep their current version-2 behavior and equivalent migrated styles.
- Existing gesture history coalesces previews to one step; migrated undo/redo
  snapshots retain exact appearance. Canonical update→live history integration
  is intentionally deferred to C.

The earlier full browser baseline stopped after 3 pre-existing setup failures in
`advanced.spec.ts` (tests assume tools exist at `/` before board creation), leaving
63 unrun. Those tests/infrastructure were not rewritten and their failure is not
a new regression. The previous `npm ci` lock failure is recorded in the Phase 0
audit; package versions remain unchanged.

## Remaining Phase C work

1. Activate canonical document types, factories, loading boundaries and saves in
   one coordinated change; keep existing media security checks and page policy.
2. Replace legacy appearance reads/writes with the one update function across
   adapter creation, templates, style copy/paste, toolbar and context surfaces.
3. Implement one shared appearance-to-Konva mapping for the three editable kinds.
   Preserve geometry and stroke scaling, including text and vector-path branches.
4. Compare actual canonical-renderer output to captured PNGs for current/archived
   pages, plain/rich/curved text, shapes, drawings, effects and silhouettes.
5. Implement the approved explicit-character color precedence for the legacy
   RichText+gradient conflict and verify it as a deliberate rendering correction.
6. Test canonical update commands directly in existing history/storage/export;
   remove obsolete editable-object appearance fields/writers at activation.

No canonical renderer or Tweakpane pane is claimed to work yet. Those phases
remain gated, as requested. Current legacy rendering has exact export evidence;
migrated-renderer pixel equivalence cannot be demonstrated before C exists.

## Rollback

Both phases are isolated commits on the feature branch. `git switch master`
returns to the untouched application baseline. To remove B while keeping A,
revert only the Phase B commit after review; it contains inactive modules/report.
To restore card creation, revert Phase A as a separate action. No live v3 boards
have been saved, so no document rollback or reverse migration is required.
