# Gratitude Studio UI component map — v4

This document records the editor's UI inventory and the placement decision used for the v4 layout refactor.

## 1. Global/document actions — top bar

- Gratitude Studio identity
- Editable board name
- Save/autosave status
- Undo / redo
- Canvas/page size selector
- File menu
  - Save backup
  - Restore backup
- New board
- Share / export
- Global error surface

Reason: these affect the whole document, not one object or one insertion workflow.

## 2. Add-to-board library — left rail + library panel

### Templates
- Layout starters
- Template previews
- Apply template

### Elements
- Curated asset search
- Category filter
- Asset results
- Curated graphics / frames / symbols / surfaces

### Uploads
- Upload picker
- Local photo ingest
- Upload states and errors
- Original download utilities

### Text
- Heading, body, quote and other text presets
- Type previews

### Create
- Primitive shapes
- Lines and arrows
- Connect selected objects
- Goal card
- Affirmation card
- Ready compositions
- Cross-tab/system clipboard copy and paste
- Shape assist

### Background
- Solid page color
- Suggested swatches
- Gradient end color
- Linear/radial blend
- Surface/texture hand-off to Elements

### AI
- Generation mode/type
- Prompt
- Board/image/affirmation/search/edit/video modes
- Regional edit/mask workflow
- Generated results
- Suggested prompts
- Insert / replace / use-as-background actions

Reason: every item above starts or adds content. It therefore belongs on the insertion side of the editor instead of the properties side.

## 3. Direct manipulation — floating beside/over the canvas

### Canvas tool dock
- Select
- Hand/pan
- Pen
- Marker
- Highlighter
- Eraser

### Context bar (only when something is selected)
- Selection identity/count
- Inline text edit for selected text
- Text size/color and compact text-style menu
- Compact media style entry point
- Duplicate
- Position/alignment/distribution
- Opacity
- Group/ungroup
- Lock/unlock
- Open full properties

Reason: these are high-frequency actions performed while looking directly at the object, so they stay close to the board rather than inside a distant panel.

## 4. Object desk — right inspector

### Style / Properties
- Copy/paste object and style actions
- Arrangement and deletion
- X/Y, width/height, rotation
- Connector detachment
- Text range formatting
- Font, kerning, ligatures, weight, curve and case
- Fill, gradients, color and effects
- Border/stroke/shadow/corners
- Shape-to-frame conversion and no-fill
- Drawing width
- Media replacement
- Frame shape
- Background removal
- Resampling / AI upscale
- Split image layers
- Match reference colors
- Graphic recoloring
- Brightness / contrast / saturation / blur / temperature / tint
- Filters
- Fit / fill / original preview
- Crop controls
- Frame content

### Layers
- Nested group tree
- Select layer
- Visibility
- Lock
- Drag reorder
- Front/back/forward/backward
- Group scope and Exit group

Reason: these controls modify or organize content that already exists. They no longer compete with creation tools.

## 5. Canvas navigation — bottom floating clusters

- Quick Board items outline
- Active page selector
- Add page
- Delete page
- Page dimensions
- Zoom out / slider / zoom in
- Zoom percentage
- Fit board to view

Reason: page/viewport navigation belongs at the edge of the work surface and should remain available without occupying permanent toolbar height.

## 6. Dialogs

### New-board confirmation
- Destructive confirmation / cancel

### Share/export
- Recommended exports
- Additional formats
- Transparent export
- PDF/JPEG/etc.
- Credits/licensing utilities

Reason: these are infrequent, modal workflows and should not consume persistent editor space.

## Layout model

Desktop is intentionally four-zone:

`[ Add rail ][ content browser ][ canvas ][ Properties / Layers ]`

The top bar is global/document scope. The bottom clusters are navigation scope. Selection controls float over the canvas. On narrow screens, the add rail becomes a horizontally scrollable bottom tray and both the content browser and right inspector become temporary sheets so the canvas remains primary.
