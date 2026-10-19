# Vision Layout Gen — art-directed templates for vision boards

A drop-in *replacement* for the user's original `grid_gen.py`, focused on expressive **vision boards**, not arbitrary photo grids. Offline, deterministic, fully Python, requires only **Pillow**.

## What changed

| Old generator | This version |
|---|---|
| Random BSP / masonry / staggered bricks | 14 art-directed vision-board archetypes |
| Slots are indistinguishable rectangles | Each photo has an editable role: `hero`, `feature`, `support`, `detail`, `background` |
| No story, goal semantics, or typography | Editable affirmation/headline, paper/frame, decorative shape, and path layers |
| Image preview only shows numbered gray boxes | Offline decorative preview art, or **your local images** cropped into polygon masks |
| Some rotated polygons extend beyond canvas | Validated bounds at portrait, square, landscape and 9:16 |
| Ambiguous normalized coordinate comments | Explicit legacy x=`0..1`, y=`0..aspect`, plus actual normalized polygons |
| Slot JSON doesn't describe render order | Ordered `z`, unique ids, role and style metadata |
| Templates look identical apart from random splits | Family-specific geometry, small boundary warps, horizontally mirrored variants |

## Install and generate

```bash
pip install pillow

# Generate 14 templates and an interactive gallery
python vision_layout_gen.py --json --aspect 1.3333 --width 500 -o vision_out

# Six seeded 9:16 variants of a dense maximalist dream wall
python vision_layout_gen.py -l maximalist -n 6 --aspect 1.7777778 --density dense --json -o vision_story

# Build layouts with your own images (images are assigned to slots in deterministic order)
python vision_layout_gen.py --images ./my_photos --json -o photos_demo

# Match photo filenames or subfolders to goal IDs
python vision_layout_gen.py --images ./my_photos --goals example_goals.json --json --labels

# A square board
python vision_layout_gen.py --aspect 1 -l scrapbook -n 4 --palette rose --json

# List every family
python vision_layout_gen.py --list
```

Open the output **`index.html`** to inspect the templates, or **`_contact_sheet.png`** to see all of them at once.

## The 14 families

- **Editorial** — cover-story layout, major hero photo, big affirmation, supporting photos.
- **Maximalist** — a dense irregular photo wall with up to 20–30 small pieces; close to the crowded real-world dream-board aesthetic. The `--density` option controls the number of small tiles.
- **Archways** — three tall architectural arches to represent possibility/destinations.
- **Compass** — meaningful focal circle with supporting intentions across the board.
- **Chapters** — three progression bands for a narrative vision (begin → grow → arrive).
- **Scrapbook** — intentional overlap, printed paper photos, rotated frames, little inscriptions.
- **Quilt** — tightly packed patchwork with a readable central affirmation.
- **Staircase** — visual upward milestones with connecting path.
- **Moonshot** — circular focal portal with photographic ribbons.
- **Ribbon** — densely packed columns with a strong typographic sweep.
- **Four corners** — four domains of life around one central personal 'why'.
- **Future diary** — a memory-from-the-future postcard, with hero and supporting details.
- **Sunburst** — radically different full-bleed radiating wedge photos around a central dream.
- **Paper cut** — expressive jagged polygon photographs joined with shared boundaries; no gaps.

## JSON format and compatibility

`templates.json` includes complete edit-ready layers for each layout:

```json
{
  "id": "editorial",
  "aspect": 1.3333333333333333,
  "coordinate_space": { "x": [0, 1], "y": [0, 1.3333333333333333] },
  "image_count": 7,
  "layers": [
    {
      "id": "layer_01",
      "kind": "photo",
      "role": "hero",
      "z": 10,
      "label": "MY FUTURE",
      "poly": [[0.004, 0.005333], [0.596, 0.005333], [0.596, 1.1013], [0.004, 1.1013]],
      "poly_normalized": [[0.004, 0.004], [0.596, 0.004], [0.596, 0.826], [0.004, 0.826]],
      "style": {"shape":"rect", "fit":"cover"}
    }
  ]
}
```

*Above is an illustrative abbreviated layer, not a verbatim output entry.*

**Correct coordinate conversion:** The *original* script describes both axes as 0..1, but its actual y coordinates range to `aspect`. This version keeps that same numeric convention for compatibility:

```ts
// The original engine's polygon coordinates: x * canvasWidth, y * canvasWidth
const points = layer.poly.map(([x, y]) => ({ x: x * canvasWidth, y: y * canvasWidth }));

// OR use fully normalized coordinates (0..1 on both axes)
const points2 = layer.poly_normalized.map(([x, y]) => ({ x: x * canvasWidth, y: y * canvasHeight }));
```

`legacy_photo_slots.json` keeps the previous `{"aspect":... ,"layouts": {name: [{"kind":"photo","poly":...}]}}` schema. **It drops frame/typography/decor metadata**, so use `templates.json` for full styling and intentional layering. The photo-only export includes scrapbook wallpaper photos as well as foreground photo windows.

For a Konva editor, iterate `layers` by ascending `z`: use `Group.clipFunc()` or clip paths for non-rectangular image polygons; render `frame` beneath its own `photo` window; turn `text` into editable text nodes; use `shape` for decorations, and `line` for connecting paths. Store IDs/roles in your scene graph for independent editing. Preserve the layer hierarchy so a user can replace images without losing the authored composition.

## Personalizing to actual vision goals

See `example_goals.json` for the expected schema. `vision_title` replaces the first title that fits in a top title zone; `affirmation` replaces the first available quote or hero affirmation; all photo layers receive weighted `goal_id`s (the hero slot is assigned first). If `--images` is provided, use filenames like `travel_01.jpg`, `career_cafe.webp`, `wellness_walk.png` or subfolders named `travel`, `career`, `wellness` for matching.

The generated `goal_id`, `role`, polygon mask, display order and text layers can be imported into your vision-board editor and used as defaults for suggested imagery, focus, and animation paths. Any goal title is editable after importing.

## Notes and constraints

- The offline template previews use **abstract illustrative placeholder art**, not actual photos. Pass `--images` to see more realistic vision boards.
- Geometry is normalized and resolution independent; text composition is a preview estimate. Your application's font metrics and text-layout engine will handle final typography.
- Only `maximalist` currently changes tile count significantly with `--density`; other families keep their authored composition and vary layout boundaries/ordering instead.
- Mirrored/semi-warped variants stay in the **same visual family**; choose different family names to achieve significantly different compositions.
- Story and collage templates can contain intentional overlaps. Never naively reorder layers by size, or you will break the intended depth.

## Test

```bash
python -m unittest -v test_vision_layout_gen.py
```

Tests cover 1,512 layouts (14 families x 6 canvas ratios x 6 variations x 3 densities), stability, finite in-bounds polygons, normalization, user goal assignment and preview rendering.

## Editor integration

All 42 variants appear in Arrange photos. Templates stays limited to the three original scrapbook designs.

From the repository root, regenerate the portrait, square and landscape datasets with:

```powershell
python tools/vision-layouts/export_for_editor.py
```

The editor reads `src/vision/generatedLayouts/*.json` through `src/vision/authoredLayouts.ts`. It preserves normalized polygon clips and ordered editable layers. The Python generator is an offline authoring tool; it is not required to run the web app.
