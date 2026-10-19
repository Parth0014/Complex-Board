# Collage studies — shapes and layers

Open `index.html` directly in a browser, or visit
`http://127.0.0.1:5173/design/collage-studies/index.html` with the local server running.
This is a standalone design review. Nothing here is imported by the editor.

Use the count slider for every count from 5 through 10, switch board format,
inspect the ten user-selected photos, or hide photos to inspect numbered frame diagrams.
Click any design for a side-by-side 5 / 7 / 10 comparison. Stars shortlist designs
for the current review session.

## The 18 directions

- Shaped focal images: Orbit, Heartstrings, Portal, Bloom, Honeycomb,
  Diamond days, Cloud nine.
- Paired shapes: Lunar pair, Sweethearts, Arch & halo, Capsules.
- Photo layers: Cut & keep, Torn journal, Fan club, Offbeat.
- Shaped surfaces: Prism, Ripple, Fold.

Every selected photo is used once. All backgrounds contain selected photos;
they are not repeated or blurred copies of the foreground. White separators
are fine outlines. Images crop to fit using SVG's `xMidYMid slice`, preserving
their source proportions.

Overlapping designs allocate supporting frames by their exposed area. This
avoids placing an entire small photo behind the central shape. Foreground
footprints reduce in square format so they do not overwhelm the background.
Landscape layouts transpose the structure while keeping focal shapes upright.

## Review limits

These are compositions for review, not a claim that any arbitrary photograph
will crop well. Some supporting frames at 10 photos are wide; details and scenery
work better there than close-up portraits. The full photographs and numbered
diagrams expose that tradeoff. Capsules reads rounder in square format.

The geometric visibility review samples 324 combinations: 18 designs × 6 photo
counts × 3 board formats. It checks exact photo count, unique photo assignments,
uncovered areas and fully hidden photos. This is an approximation of visible
mask area, not face detection or a subjective aesthetic score.

## Design references

[Nielsen Norman Group's scale, hierarchy and balance principles](https://www.nngroup.com/articles/principles-visual-design/)
informed the focal/supporting relationship.
[Flickr's aspect-aware photo layout](https://flickr.github.io/justified-layout/)
informed the attention to frame proportions and consistent spacing. Neither
source establishes a universal formula for attractive collages.

Reference photos are the ten user-provided files in `photos/`. Original filenames
are preserved, including Unicode characters. Current filenames, dimensions and
hashes are recorded in `photos/sources.json`; the previous Pinterest links have
been removed because they no longer describe these images.
