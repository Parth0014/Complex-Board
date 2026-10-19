# Live UI review follow-up

The app now defaults to a 1080 × 1920 portrait board, where all three scrapbook templates are available. Existing Landscape and Square boards keep their dimensions. The Templates empty state opens Resize board with Portrait preselected; resizing remains explicit and undoable.

## Home and creation

- New board opens a centered, scrollable dialog with Name focused. Cancel and Escape return to the launcher. Creation failures appear inside the dialog, preserve the entered name, and allow retry.
- The hero uses exported previews of the three actual finished scrapbook templates, bundled as static image assets. No new provider calls or live preview rendering is needed on the home page.
- The existing README now describes the real bundled SVG library. No fixed element count is promised because categories vary.

## Mobile chrome

- The 320px/390px header retains board name, save status, Undo and Redo. Preview and Export move into the existing keyboard-accessible overflow menu. Closing Preview after a desktop-to-mobile resize returns focus to that visible menu trigger.
- The bottom rail shows four complete tools at a time, with visible Previous/More arrows and native horizontal swiping. Background, Shapes, Draw and Discover remain reachable. Safe-area padding protects the bottom row.
- Library sheets use at most 40% of the viewport, sit directly above the tool rail, and have a handle that collapses on tap or downward drag. Floating selection and canvas-control pills stay hidden until the sheet closes. Compact template rows keep the full preview, name and Use template action visible together.
- Canvas controls use a single compact row at narrow widths.

## Editing

- Click-inserted artwork is centered in the visible canvas, accounting for a mobile library sheet. Its dimensions fit within 28% of each board dimension while retaining the source aspect ratio. Explicit drop locations, placeholder replacement, and background insertion retain their dedicated behavior.
- The normal selection toolbar includes Duplicate, Delete, Bring forward, Send backward and Lock/Unlock. Locked selections keep destructive/movement controls disabled. Crop and layout-adjustment modes retain their focused toolbars.
- Fit-to-screen uses smaller margins without changing artwork resolution, crop or image aspect ratios.
- Save text is larger and an editable-backup download sits beside it. Mobile browser theme color is light.

## Verification

The final preflight passed format, lint, typecheck, all 269 unit tests and the production build. All 57 focused browser checks passed across thirteen files. Behavioral coverage is in `tests/mobile-review.spec.ts` plus the focused editor, crop, preview, storage, keyboard, dialog and canvas regression suites. Screenshots are inspected at phone widths as well as desktop. This does not claim the entire historical browser suite is green.

## Desktop review and subsequent design correction

- The floating bar keeps the earlier compact editing controls and transparency dropdown. The added action row, inline opacity slider and More button were removed at the user's request. Duplicate, Delete, ordering, alignment, grouping and locking remain in the original right-click menu and existing shortcuts. The right-click menu component and its original styling are retained.
- The bar stays at the canvas top at the user's request; font menus align to their trigger. Number inputs use the shared committed-value control.
- Automatic fit follows workspace changes; manual zoom remains stable. Ctrl+0 fits and Ctrl+1 sets actual size. Zoom stays centered regardless of cursor position. Horizontal scrolling is available only when the board exceeds the viewport.
- Repeated click insertions cascade, with board-relative text and shape sizes. Explicit dragged shapes retain their previous dimensions.
- Drawing palettes dismiss on outside click and tool choice, Draw owns the active state, and active brushes expose color, size and opacity.
- Collages insert below existing items and remain one undoable edit. The agreed 5–10 photo limit remains; the picker explains how many more to choose and shows pending-preview skeletons.
- Upload messages dismiss, empty-board uploads offer an Add to board action, and an empty library disables Arrange.
- Export offers 1×, 2× and custom PNG sizes. Disabled Export is visibly muted. Home offers individual editable board backups with uploaded images included.
- Startup typography uses DM Sans. Small chrome labels are at least 12px; global reduced-motion rules suppress transitions and entrance animations.
- Explicit board resizing preserves artwork positions; ordinary numeric edits and placement retain edge constraints.

The earlier verification paragraph records that earlier pass, before these desktop changes. Current desktop coverage is in `tests/desktop-audit.spec.ts` and `tests/latest-review.spec.ts`.
