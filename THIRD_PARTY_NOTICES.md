# Third-party notices

The editor retains code adapted from the Excalidraw/Gratitude-Board implementation, including Studio panels and vision definitions. Applicable Excalidraw MIT terms are preserved in [licenses/Excalidraw-MIT.txt](licenses/Excalidraw-MIT.txt). Removing the engine does not remove notices for retained code.

## Bundled fonts

The following font files were retained from the previous repository. Their upstream families are licensed under SIL OFL 1.1; the corresponding complete notices are included here. No font binaries have been modified in this change.

Actual binary metadata and the Virgil upstream SHA-256 match were inspected; see [font provenance](licenses/FONT_PROVENANCE.md), including the legacy embedded license wording.

| File                             | Family / upstream                                           | License text                                |
| -------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| `public/Assistant-Regular.woff2` | [Assistant](https://github.com/hafontia/Assistant)          | [Assistant OFL](licenses/Assistant-OFL.txt) |
| `public/Cascadia.woff2`          | [Cascadia Code](https://github.com/microsoft/cascadia-code) | [Cascadia OFL](licenses/Cascadia-OFL.txt)   |
| `public/Virgil.woff2`            | [Virgil](https://github.com/excalidraw/virgil)              | [Virgil OFL](licenses/Virgil-OFL.md)        |

Arial and Georgia are browser/system font choices and are not bundled. Older `comic-shanns` and `playfair-display` document IDs are compatibility aliases for Cascadia Code and Georgia respectively; they do not represent bundled copies of those named fonts.

## Runtime dependencies

React, React DOM, Konva and react-konva are MIT-licensed. Their upstream notices remain in the installed packages; the production build includes those notices in `dist/THIRD_PARTY_LICENSES.txt`.

## Artwork

The Elements gallery and its 250 bundled SVGs have been removed. Template artwork retains its separate notices.

## Project license

Original contributions owned by Parth Patil are proprietary, copyright (c) 2026 Parth Patil, all rights reserved; see [LICENSE](LICENSE). This restriction does not apply to third-party materials or revoke previously granted permissions. The notices above apply to their respective third-party components.
