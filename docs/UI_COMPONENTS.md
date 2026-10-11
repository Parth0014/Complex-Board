# Modular UI

Screens compose components; reusable components receive data, callbacks, and child slots. Keep browser storage and navigation out of presentation components.

## Structure

- `src/App.tsx`: board navigation, restoration, and the active editor lifecycle.
- `src/editor/Editor.tsx`: canvas orchestration, selection, gestures, and editor state.
- `src/studio/HomePage.tsx`: home screen composition.
- `src/studio/home/useHomeBoards.ts`: home loading and board creation state.
- `src/studio/home/BoardSetup.tsx`: controlled board setup fields and actions.
- `src/studio/home/BoardLibrary.tsx`: loading, empty, and populated library states.
- `src/studio/boards/BoardCard.tsx`: board summary and open action.
- `src/studio/boards/BoardPreview.tsx`: preview rendering with a configurable item limit.
- `src/studio/StudioShell.tsx`: editor layout and share/error state.
- `src/studio/chrome/StudioHeader.tsx`: title, history, backup, and file actions.
- `src/studio/chrome/StudioSidebar.tsx`: tool navigation and panel composition, with drawing-tool slots, optional AI tools, and an initial theme.
- `src/studio/chrome/ZoomControls.tsx`: controlled zoom controls with configurable limits and increment.
- `src/studio/export/ExportDialog.tsx`: export actions and error presentation.
- `src/studio/ui/`: shared buttons, dialogs, menus, popovers, and tooltips.

## Vary behavior through props

Reuse the implementation and supply different data or callbacks:

```tsx
<BoardPreview document={board} maxItems={40} />
<BoardCard document={board} disabled={saving} onOpen={() => openBoard(id)} />
<ZoomControls
  value={zoomPercent}
  min={25}
  max={200}
  step={25}
  onChange={setCanvasScale}
  onFit={fitCanvas}
/>
```

`ZoomControls.value`, `min`, `max`, and `step` use percentages; `onChange` receives a scale (100% becomes `1`).

Components using editor operations depend on `EditorAdapter`, allowing a different implementation of those operations without duplicating their UI. Renderer-specific code stays in the editor container and `vision/canvas`.

Use the shared design-system styles and primitives when adding features. Add explicit props for variations rather than copying a component into a page. Keep screen-specific assembly in the screen container and stateful workflows in hooks or orchestration components.
