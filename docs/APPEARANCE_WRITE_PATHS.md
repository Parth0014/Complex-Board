# Appearance write and load paths (Phase A audit)

## Editable object appearance writes to replace at Phase C/D activation

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
- Internal clipboard and duplication → clone current items → remap IDs/groups/connectors. Already canonical after future C activation; validate at the same import boundary when receiving legacy selections.
- `BoardDocument.items` is the current-page working mirror; `pages[*].items` includes archived collections. Migrate every collection without changing IDs, activePageId or reconciliation policy.

Phase B tests exercise the migration boundaries independently; these routes continue to use version 2 until C. Asset/provider/media checks remain in their existing code rather than being recreated by the appearance model.
