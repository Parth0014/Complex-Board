# Appearance write and load paths (Phase C activation)

## Audited appearance writers

- `studio/SelectionToolbar.tsx`: text color/font/size/bold/italic/underline/strike/alignment; shape solid fill clears gradient/noFill; drawing color; opacity.
- `studio/EditorFeatures.tsx`: range text formatting, fill/gradient/noFill, borders, opacity, shadows/effects, drawing width, text background and typography. Preserve geometry, content editing and photo tools.
- `studio/ContextActions.tsx`: copy/paste style and property menus through adapter calls; preserve arrangement/group/layer actions.
- `vision/canvas/KonvaCanvasAdapter.ts`: createShape, createDrawing, createTextPreset, updateSelection, patchItems, copyStyle/pasteStyle, duplicate/internal clipboard, shape frame conversion, template instantiation and drawing cleanup.
- `vision/canvas/KonvaStage.tsx`: drawing creation passes color/width/opacity and retains brush geometry; transformations preserve visual scale. Do not rewrite the interaction algorithms.
- `vision/templates.ts`, `collageTemplates.ts` and template adaptation: saved style defaults must migrate without provenance guards.
- `studio/AIPanel.tsx`: AI affirmation insertion uses existing text creation; preserve it.

## Renderer authority

`ItemContent.tsx` reads common fill/border/shadow fields, with separate Text, RichText, TextPath, shape geometry and Line branches. Outer Groups in `KonvaStage.tsx` and `renderPage.tsx` apply opacity. StickerContent adds a distinct alpha-silhouette outline for any existing eligible content. Do not confuse that with text/shape strokes.

## Loading routes

- App URL restoration → adapter.initialize → loadBoard → prepareBoard → validateBoard.
- Home listBoards → validateBoard → existing multipage extraction → prepareBoard when opened.
- Backup restore → JSON envelope/media validation → validateBoard → prepareBoard → existing page split/save.
- System clipboard → selection-envelope validation → prepareBoard/validateBoard → pasteSelection.
- Internal clipboard and duplication → clone current items → remap IDs/groups/connectors. Already canonical after C activation; validate at the same import boundary when receiving legacy selections.
- `BoardDocument.items` is the current-page working mirror; `pages[*].items` includes archived collections. Migrate every collection without changing IDs, activePageId or reconciliation policy.

Phase B established the import semantics independently. Phase C activates these
routes together with canonical rendering and persistence. Asset/provider/media
validation remains in the existing loaders. See the Phase C report for the exact
replacement inventory and validation results.

## Phase C replacements

| Writer                                                                 | Active path                                                                                                |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| SelectionToolbar fill/stroke/opacity                                   | `changeAppearance` / `setAppearanceField` ? `updateAppearance`; rich runs retained                         |
| EditorFeatures fill/gradient/noFill/borders/shadows/effects/background | Canonical field projection ? typed command ? same update function                                          |
| EditorFeatures explicit range formatting, typography, content          | Existing non-appearance document-data patches; explicit runs remain authoritative                          |
| ContextActions selection commands                                      | Existing adapter operations preserve canonical appearances while remapping geometry/IDs/groups             |
| Copy/Paste Style                                                       | Canonical `style` command; target stroke scaling retained; typography in the same gesture; runs not copied |
| Quick Shapes / Text / Draw creation                                    | Canonical factories directly; no legacy style fields                                                       |
| Legacy collage template definitions                                    | `migrateItem` once at the actual template import boundary                                                  |
| Shape-to-photo frame conversion                                        | Deliberate kind conversion into the existing separate media schema; canonical appearance removed           |
| Generic patchItems                                                     | Throws on editable-object appearance/legacy style writes; retains content/geometry/media responsibilities  |

`BoardPreview` now reads canonical opacity/primary color; it retains the existing
approximate SVG thumbnail. Canvas artwork and exports use the shared Konva mapping.
The legacy style code still visible in ItemContent is confined to the unchanged
asset/photo branch. It is never an editable-object fallback.
