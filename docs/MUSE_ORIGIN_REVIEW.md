# Muse origin review — 12 October 2026

Fetched `origin` and reviewed all six commits between local HEAD `5d525d1` and `origin/muse/craft-pass` at `5039cd1`. The working desktop refinement was preserved; improvements were applied selectively rather than merging overlapping CSS and docs changes.

| Commit    | Finding                                                                         | Decision                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `e0a1a3a` | Three-column inspector grid, context-menu height, and a 720–768px dock override | Grid/menu fixes already covered locally. Adopted and extended the breakpoint override.                                                            |
| `a1170a1` | Introduces `components-panels.css` and moves workspace/contextual styling       | Effective declaration comparison found no additional visual change beyond the explicit fixes.                                                     |
| `4e26d65` | Moves those rules out of `components.css`                                       | Keep the local consolidated stylesheet and existing refinement.                                                                                   |
| `c7e5dca` | Removes the replaced `components-b.css`                                         | Already removed locally.                                                                                                                          |
| `7e8015c` | Corrects Atelier docs and the bundle figure                                     | Already covered by the local design system/report. Its bundle-growth attribution was not independently established, so it was not copied as fact. |
| `5039cd1` | Caps the mobile inspector sheet                                                 | Excluded by the desktop-only instruction.                                                                                                         |

## Adopted improvement

Muse correctly identified a breakpoint conflict: the desktop grid begins at 720px, while the older bottom-sheet styling continues through 768px. Its more specific dock selector restores the right-hand column in that overlap.

A resize regression also exposed the neighboring 800px case: the old `max-width: 1100px` floating inspector rule still positioned the inspector over the canvas. The local adaptation applies the grid-bound geometry throughout the desktop range, overriding both conflicting rules. It preserves full workspace height and the inspector's own scroll area.

The regression checks settled geometry at 720, 744, 768, 800, and 1366px. Reduced motion is enabled for this geometry test so it does not sample a transient entry-animation position. Existing motion and rapid-switching tests retain their normal animation behavior.

## Validation

- All five `desktop-craft.spec.ts` cases passed, including the new resize regression and the existing 1366/1920px shape/text/image checks.
- Production build and lint passed.
- CSS audit: remote has 1,150 opening braces / 1,075 PostCSS rule nodes; the local result has 1,109 / 1,034. Both metrics are 41 lower than the fetched remote.
- The earlier full-suite audit remains historical: 41 passed, 60 failed, 28 skipped. This follow-up ran the affected desktop tests, not another full-suite audit.

Reproduce:

```powershell
node scripts/audit-css.mjs --baseline=5039cd1
node node_modules/@playwright/test/cli.js test tests/desktop-craft.spec.ts --output=tmp/muse-final-traces --reporter=line
```

See [Desktop craft report](DESKTOP_CRAFT_REPORT.md) for the broader implementation and its known limitations.
