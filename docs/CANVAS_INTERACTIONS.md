# Canvas interaction implementation

Research and implementation: 3 October 2026.

Primary references:

- [Konva selection and Transformer demo](https://konvajs.org/docs/select_and_transform/Basic_demo.html): rectangle selection, additive selection, shared selection transforms and scale normalization.
- [Konva snapping and alignment guides](https://konvajs.org/docs/sandbox/Objects_Snapping.html): moving bounding-box edges/centers against page and object guides, with a threshold.
- [Konva groups](https://konvajs.org/docs/groups_and_layers/Groups.html): collective transforms and movement. Our document stores flat group IDs and expands group selection while preserving the existing ordered item list.

## Implemented behavior

- Click an item to select it. Shift/Ctrl/Cmd-click adds/removes an item or its group. Click blank space to clear selection; drag blank space to select intersecting items. Ctrl/Cmd+A selects all.
- Drag any selected item to move the full selection. Group motion is committed as one history command; undo restores every member. Group bounds account for rotated items.
- Group and Ungroup are available in the toolbar and through Ctrl/Cmd+G and Ctrl/Cmd+Shift+G. Duplicated groups receive independent IDs. Nested groups and member editing are now supported through group scope and the Layers tree.
- Snapping compares selected bounds with page edges/center and other items' edges/centers. The threshold is six screen pixels at any zoom. Visible guides are transient. Alignment guides are enabled by default. Disable guides or hold Alt to bypass alignment snapping; hold Shift to constrain motion to one axis.
- Snap to edges is enabled by default and enforces artboard containment: rotated item/selection bounds cannot cross the white page during dragging or transforms. Numeric edits, insertion, duplication and page resizing are normalized inside the page; oversized items/groups shrink proportionally. Disabling guides or holding Alt does not bypass containment. Turning Snap to edges off allows overflow; turning it on brings existing items inside.
- Transformer resizes/rotates the selection; rotation snaps near 45-degree increments. Text resizing also adjusts its font size.
- Position aligns an individual item/group to the page, or multiple units against their shared bounds. Distribution spaces at least three units with equal gaps. Internal group layout is preserved.
- Lock disables move/resize/rotate/alignment of selected locked items. Unlock restores manipulation. This is a position lock; content deletion is still available.
- Drag a curated asset from the gallery onto the page to place it at that point. Only IDs in the uploaded pack resolve. Original SVG dimensions and aspect ratio are retained.
- Hand tool or held Space pans the zoomed viewport without changing the document. Scrollbars also provide navigation.
- X/Y numeric controls allow precise positioning of a single selected item. Arrow/Shift+Arrow nudges use one/ten document pixels.

## State and export

Document geometry is the source of truth. During a drag, the selected nodes preview their positions and commit together when the gesture ends. Selection, guides, marquee, pan and zoom stay outside the document. Export clones only the artboard, excluding these UI overlays.

Verification includes pure rotated-bounds/snapping tests; grouped selection, duplication and alignment tests; and browser gestures for marquee selection, grouped movement/undo, edge/object snapping, bypass/constrained drag, gallery drop, locks and hand-tool pan. Existing export, curated-count and mobile-overflow coverage is retained.

IndexedDB storage, nested groups and pinch zoom are now implemented. Resize alignment guides remain pending. See v1/README.md for the verified feature list.
