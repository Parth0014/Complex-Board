# Canvas editor UI/UX review files

Scope: desktop editor only. Exclude src/studio/HomePage.tsx, src/studio/home/, and src/studio/boards/. Shared styles contain some home selectors; review their editor selectors only.

## Read first

1. src/editor/Editor.tsx — editor composition, drawing controls, contextual toolbar, inspector selection.
2. src/studio/StudioShell.tsx — workspace structure, panels, header, export, and error feedback.
3. src/vision/canvas/KonvaStage.tsx — rendering and pointer/keyboard canvas interaction.
4. src/vision/canvas/KonvaCanvasAdapter.ts — editor actions, zoom, history, media, and persistence behavior.
5. src/studio/design-system/components.css — actual layout and editor component styling.
6. src/studio/design-system/foundations.css — palette, typography, dimensions, motion, and elevation.

## All editor UI components and styles

```text
src/editor/Editor.tsx
src/studio/AIPanel.tsx
src/studio/appearance/appearanceControls.ts
src/studio/appearance/AppearanceSurface.tsx
src/studio/appearance/bindingOptions.ts
src/studio/appearance/bindingPane.ts
src/studio/appearance/CommittedNumber.tsx
src/studio/appearance/CreativePalette.tsx
src/studio/appearance/feature.ts
src/studio/appearance/hybrid.css
src/studio/appearance/HybridQuickBar.tsx
src/studio/appearance/ObjectDock.tsx
src/studio/appearance/ObjectSettings.tsx
src/studio/appearance/QuickShapeInspector.tsx
src/studio/appearance/shapePane.ts
src/studio/appearance/TechnicalControls.tsx
src/studio/appearance/TextProperties.tsx
src/studio/appearance/tweakpane.css
src/studio/appearance/TweakpaneHost.tsx
src/studio/appearance/TweakpaneSession.ts
src/studio/appearance/UnifiedInspector.tsx
src/studio/BackgroundPanel.tsx
src/studio/BoardSizeControl.tsx
src/studio/chrome/StudioHeader.tsx
src/studio/chrome/StudioSidebar.tsx
src/studio/chrome/ZoomControls.tsx
src/studio/ColorPicker.tsx
src/studio/ContextActions.tsx
src/studio/CreatePanel.tsx
src/studio/CuratedPanel.tsx
src/studio/design-system/components.css
src/studio/design-system/fonts.css
src/studio/design-system/foundations.css
src/studio/design-system/index.css
src/studio/design-system/primitives.css
src/studio/EditorFeatures.tsx
src/studio/export/ExportDialog.tsx
src/studio/icons.tsx
src/studio/icon-set/Glyph.tsx
src/studio/icon-set/glyphs.ts
src/studio/palette.ts
src/studio/SelectionToolbar.tsx
src/studio/StudioShell.tsx
src/studio/studioTypes.ts
src/studio/TemplatesPanel.tsx
src/studio/TextPanel.tsx
src/studio/ui/Button.tsx
src/studio/ui/Dialog.tsx
src/studio/ui/Menu.tsx
src/studio/ui/Popover.tsx
src/studio/ui/Skeleton.tsx
src/studio/ui/Swatch.tsx
src/studio/ui/Toast.tsx
src/studio/ui/Tooltip.tsx
src/studio/UploadsPanel.tsx
src/studio/useAIStatus.ts
src/studio/useMenuPlacement.ts
```

## Canvas behavior, rendering, and supporting state

These files explain the interaction behavior behind the controls; storage, PDF, AI, and template utilities are supporting context rather than visual components.

```text
src/vision/aiClient.ts
src/vision/appearance/activation.ts
src/vision/appearance/capabilities.ts
src/vision/appearance/controls.ts
src/vision/appearance/defaults.ts
src/vision/appearance/legacy.ts
src/vision/appearance/legacyValidation.ts
src/vision/appearance/migration.ts
src/vision/appearance/types.ts
src/vision/appearance/update.ts
src/vision/appearance/validation.ts
src/vision/canvas/appearance.ts
src/vision/canvas/colors.ts
src/vision/canvas/geometry.ts
src/vision/canvas/ItemContent.tsx
src/vision/canvas/KonvaCanvasAdapter.ts
src/vision/canvas/KonvaStage.tsx
src/vision/canvas/renderPage.tsx
src/vision/canvas/RichText.tsx
src/vision/collageTemplates.ts
src/vision/compositions.ts
src/vision/connectors.ts
src/vision/contracts.ts
src/vision/crop.ts
src/vision/document.ts
src/vision/fonts.ts
src/vision/frames.ts
src/vision/layouts.ts
src/vision/legacyPlaceholder.ts
src/vision/media.ts
src/vision/pdf.ts
src/vision/shapeGeometry.ts
src/vision/storage.ts
src/vision/strokeAssist.ts
src/vision/svgColors.ts
src/vision/templates.ts
src/vision/templateStickers.ts
src/vision/text.ts
src/vision/typography.ts
```

## Entry points and artwork-library context

```text
src/main.tsx
src/App.tsx
src/assets/contracts.ts
src/assets/curatedPack.ts
src/assets/elementSearch.ts
src/assets/elementThemes.ts
package.json
vite.config.ts
```

main.tsx mounts the global tooltip provider. App.tsx mounts the editor and imports shared styles; its home route is outside this review. Artwork manifests and public SVGs are only needed for an artwork-catalog review.

## Verification and design context

```text
docs/DESIGN_SYSTEM.md
docs/DESKTOP_CRAFT_REPORT.md
docs/MUSE_ORIGIN_REVIEW.md
tests/desktop-craft.spec.ts
tests/board-layout.spec.ts
tests/ui-craft.spec.ts
tests/ui-refactor.spec.ts
tests/appearance-helpers.ts
tests/helpers/board.ts
tests/helpers/editor.ts
playwright.config.ts
```

## Suggested review prompt

> Review the desktop canvas editor only. Ignore the home screen and mobile. Trace the live Editor -> StudioShell -> KonvaStage path, including feature-gated inspector variants. Assess visual hierarchy, toolbar density, docking, focus and keyboard behavior, menu/picker positioning, selection/resize/zoom feedback, motion, error recovery, and consistency. Report concrete defects with file/line references and explain the user impact. Distinguish active controls from obsolete CSS or tests. Preserve artwork, saved-board compatibility, and the existing canvas engine. Use the actual code and screenshots rather than assuming the entire browser suite passes.
