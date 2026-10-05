# Bundled font provenance

Inspected the actual font binaries on 4 October 2026. Fonts are retained without modification. The `.woff2` filename of Cascadia is historical: its binary header is WOFF, which the browser FontFace loader accepts.

| File | SHA-256 | Evidence |
|---|---|---|
| Assistant-Regular.woff2 | `76945f09225aae65bdbd204cb4ac40d4caa4ff67150e5074bab1a04d1b778fc3` | Embedded family is Assistant; copyright names Assistant Project Authors and Source Sans Pro Authors; embedded license identifies SIL OFL 1.1. Complete upstream notice is in Assistant-OFL.txt. |
| Cascadia.woff2 | `6d27c0474bb6c7922911f90ae811918f6be943005f1c4a6ec0e5b70a2bfddf16` | Embedded family is Cascadia Code; copyright Microsoft 2019. Embedded metadata includes generic Microsoft supplied-font wording followed by an explicit OFL grant applying to this font and a link to the microsoft/cascadia-code license. Complete upstream notice is in Cascadia-OFL.txt. |
| Virgil.woff2 | `9976295bfe709bdea64839a4d4e9a1d436dd6eb67538399a5a0e8b8fadbcf1cf` | Binary SHA-256 matches the file downloaded from the official excalidraw/virgil repository, distributed there with LICENSE.md (SIL OFL 1.1). Complete notice is in Virgil-OFL.md. |

Virgil's embedded name table retains old Your Own Font Foundry personal-use text. That metadata alone is not the evidence used for redistribution: the byte-identical font is distributed by its official upstream with the OFL license. Preserve both the unmodified binary and the accompanying upstream notice.

Verified source for Virgil binary: https://raw.githubusercontent.com/excalidraw/virgil/main/Virgil.woff2

Upstream license sources:

- https://raw.githubusercontent.com/google/fonts/main/ofl/assistant/OFL.txt
- https://raw.githubusercontent.com/microsoft/cascadia-code/main/LICENSE
- https://raw.githubusercontent.com/excalidraw/virgil/main/LICENSE.md
