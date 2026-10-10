# VisBo design system

Status: Microsoft Fluent 2 foundations are active. The official `@fluentui/tokens` light theme drives shared editor controls, menus, pickers, and chrome through `fluentTheme.ts` and `fluent.css`. Existing React controls retain their behavior; this is a token integration, not a wholesale replacement with Fluent React components. Component consolidation and remaining panel migration are still pending.

The runtime theme uses Segoe UI, Fluent neutral surfaces, Microsoft blue for primary actions, 4px control corners, 8px popup corners, and Fluent elevation and interaction states. Tokens are installed on the document root so portal menus and color pickers inherit the same theme. The tables below describe the earlier foundation specification; runtime Fluent aliases take precedence for migrated visual values. See [Microsoft's token guidance](https://fluent2.microsoft.design/design-tokens).

## Product direction

A quiet workspace for making a personal board. The board is the visual focus; controls help people add, select, edit, and export without studying the interface. Familiar desktop-editor behavior matters more than decoration. The application chrome stays neutral while the user's board supplies color and personality.

## Principles

1. Content first. Keep artwork unobstructed and give chrome less visual weight than the board.
2. Recognition before recall. Use familiar names and icons; uncommon actions need labels. Expose useful controls at the point of work.
3. One meaning, one pattern. The same property uses the same name, unit, limits, component, and state in every surface.
4. Progressive disclosure. Common actions are immediately available; advanced controls appear when relevant. A settings form needs calm spacing even inside a compact menu.
5. Alignment before enclosure. Group with spacing and separators. Use cards for previews, not for every button.
6. Direct manipulation. Double-click to edit text, drag to move, use handles to resize. Every pointer operation has a keyboard route.
7. Feedback without spectacle. Show selection, saving, errors, and focus clearly. Keep animation brief and respect reduced motion.

These are app-specific choices informed by Apple's hierarchy and consistency guidance, Material's token-based foundations, and Carbon's spacing and typography structure. They do not prescribe copying those products' appearance.

## Foundations

| Foundation        | Rule                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Font              | Native system sans-serif. No additional UI font download. Board fonts are separate.                                              |
| Body and controls | 13px / 20px, weight 400                                                                                                          |
| Section label     | 12px / 18px, weight 500; sentence case                                                                                           |
| Panel heading     | 15px / 22px, weight 600                                                                                                          |
| Dialog title      | 18px / 26px, weight 600                                                                                                          |
| Metadata          | 12px / 18px; readable secondary color                                                                                            |
| Spacing           | 4, 8, 12, 16, 24, 32px. Use 8px between related controls and 16px between groups.                                                |
| Icons             | Lucide, 16px, stroke 1.5. Main navigation may use 18px. No emoji or Unicode substitutes.                                         |
| Corners           | 5px controls; 8px menus; 12px dialogs. Circles only for swatches and genuinely circular controls.                                |
| Borders           | 1px maximum for chrome; subtle separators, stronger field boundaries when needed for recognition. Artwork strokes are unrelated. |
| Shadows           | None on fixed chrome or ordinary controls. One soft shadow on floating surfaces.                                                 |
| Accent            | One violet, used for primary actions, active states, focus, and selection. No gradients in chrome.                               |
| Motion            | 100ms feedback, 150ms overlay; no spring or scaling effects.                                                                     |

Colors and dimensions live in `src/studio/design-system/foundations.css`. Decorative separator colors are not suitable for essential control boundaries. Active, error, and selected states must include a shape, label, icon, or outline rather than relying only on color.

## Editor layout

- Header: 48px, neutral background, title and save state left; undo/redo and Share/File right. Share is the only filled primary action.
- Navigation rail: 56px, thin icons and short labels. Active item uses a restrained tint. No framed button around every icon.
- Library: 272px with 16px padding. One heading row and a predictable close control. Shape tools use a compact three-column grid with 48px cells; preview images may use larger tiles.
- Selection toolbar: 32px controls, only frequently used properties for the selected type. Its appearance must not resize the stage. Commands duplicated in context menus use the same definitions.
- Footer: 40px, page controls left and zoom right. Put Shape assist, alignment guides, snap, and ratio into a single Canvas settings menu. At narrow widths collapse secondary controls before wrapping.
- Workspace: neutral gray; no decorative dot texture. The board is the dominant surface.

## Components and states

| Component          | Default                                                | Hover / active                            | Keyboard / touch                                         |
| ------------------ | ------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------- |
| Action button      | 32px high, transparent or muted background, 5px corner | Quiet gray hover; violet tint for toggles | Visible focus outline; 44px hit area on coarse pointers  |
| Primary button     | Solid violet, white label                              | Darker violet; no glow                    | Same focus rule                                          |
| Icon button        | 32px hit area, 16px icon                               | Gray hover                                | Accessible name and tooltip; tooltip also on focus       |
| Field / select     | 32px high, 1px boundary, 8px inset                     | Stable geometry; accent focus             | Label outside placeholder; native keyboard editing       |
| Color preview      | 28px rounded square, shared picker                     | Clear focus and selected outline          | Accessible property name; same picker everywhere         |
| Quick-style swatch | 26px circle, tooltip and accessible name               | Small outline; no scaling                 | One action per swatch                                    |
| Menu row           | 32px high, icon?label?shortcut?chevron columns         | Gray active row                           | Arrow keys navigate; Enter opens/executes; Escape closes |
| Dialog             | Content-sized with 24px padding; 12px corners          | No decorative animation                   | Focus enters, stays within modal, and returns to trigger |

Disabled actions keep readable labels and never execute. Prefer hiding inapplicable actions, such as Group for a single ungrouped item. Show a reason when an unavailable action is important to the task. Mixed selections show ?Mixed,? not a misleading first-item value.

## Context menus and property panels

The requested order is quick-style swatches, applicable style rows, clipboard actions, Layer/Group/Lock, and Delete last. Blank canvas gets its own short menu: Paste, Select all, Add page, Fit board.

Place object menus outside the selected bounds with a 12px gap, choosing the side with room. Clamp against header, footer, and viewport. Large selections that leave no side space need a viewport-clamped fallback rather than an offscreen menu.

Open hover submenus after 120ms; close after 250ms outside both the trigger and panel. Only one submenu is active. Preserve it while moving through the gap, dragging a control, editing a field, or using an owned color popup. Keep the panel steady while values change. Align its top with the trigger, shifting only to avoid viewport edges. Keyboard and touch open the same panel without hover.

Property panels use a 280px width, 12px padding, 12px between fields, and two-column grids for related small values. Tall panels scroll within available space. Text content is edited on the canvas; rich-text controls must clearly distinguish whole-object formatting from a selected text range.

The color picker uses palette circles, a color surface, an unlabeled spectrum bar, and one hex field with a live preview. All triggers are shared components. Preserve keyboard access to color adjustment; do not make pointer-only surfaces the only route.

## Shared property contract

| Property      | Label          | Unit / range          |
| ------------- | -------------- | --------------------- |
| fontSize      | Text size      | 8?240px               |
| opacity       | Opacity        | 0?100%; stored as 0?1 |
| borderWidth   | Border width   | 0?30px                |
| borderColor   | Border color   | Shared color picker   |
| letterSpacing | Letter spacing | ?5?30px               |
| lineHeight    | Line height    | 0.5?3 multiplier      |

Define controls once and render them in the toolbar or menu. Do not duplicate normalization, option lists, or default values in those surfaces. Text, shape, image, and multi-selection capabilities determine which controls appear.

## Accessibility and responsive behavior

Target WCAG 2.2 AA: 4.5:1 for normal text, 3:1 for essential non-text state indicators, visible keyboard focus, and meaningful names. Verify contrast rather than assuming the palette passes. Disabled controls and decorative dividers have different requirements. Keep compact visuals while expanding touch hit areas to 44px. Tooltips must not be the only accessible names. Do not reduce body text below 12px to make a panel fit.

Below 720px use one temporary library panel and tap-open settings sheets instead of hover flyouts. Keep canvas, selection, and export available. Respect reduced motion and support browser zoom without clipping controls.

## Migration and acceptance

1. Replace v5 base tokens with semantic foundations; remove competing declarations rather than appending another override layer.
2. Build shared Button, IconButton, Field, Select, ColorPreview, MenuRow, and PropertyPanel components.
3. Migrate library, header, selection toolbar, footer, and menus through those components.
4. Centralize shared property definitions and submenu ownership/positioning.
5. Remove obsolete CSS after each surface migrates.

Review at 1280?800, 1920?1080, and a narrow 390px viewport. Check empty, single, multiple, grouped, locked, and mixed selections. Verify keyboard navigation, submenu crossing, native selects, color popup ownership, inline text, drag cursors, and export. Confirm selection never changes stage size and menus avoid the footer. Compare screenshots for hierarchy and density; passing interaction tests alone does not establish visual quality.

## References

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines
- Apple layout guidance: https://developer.apple.com/design/human-interface-guidelines/layout
- Material foundations and design tokens: https://m3.material.io/foundations/
- Carbon spacing: https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview
- Carbon typography: https://www.carbondesignsystem.com/building-blocks/foundations/typography/type-sets

## Visual reference

Open `docs/design-system/reference.html` for a standalone specimen of the proposed foundations. It is a visual specification, not the production editor or a tested accessible component library.
