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

The three scrapbook presets additionally bundle unmodified Caveat (700), Playfair Display (700), and Poppins (400, 600, 700) from Google Fonts in `public/scrapbook-fonts/`. Their SIL OFL notices are included in [Caveat OFL](licenses/scrapbook-Caveat-OFL.txt), [Playfair Display OFL](licenses/scrapbook-PlayfairDisplay-OFL.txt), and [Poppins OFL](licenses/scrapbook-Poppins-OFL.txt). These use separate document font IDs so older boards retain their existing font rendering.

## Runtime dependencies

React, React DOM, Konva, react-konva and Tweakpane are MIT-licensed. The production build includes upstream notices in `dist/THIRD_PARTY_LICENSES.txt`. Tweakpane's npm package omits its license file; the exact 4.0.5 upstream notice is preserved in [licenses/Tweakpane-MIT.txt](licenses/Tweakpane-MIT.txt), from https://github.com/cocopon/tweakpane/blob/4.0.5/LICENSE.txt. Tweakpane 4.0.5 is isolated in the opt-in Phase D1 inspector chunk; `@tweakpane/core` 2.0.5 supplies its development-time TypeScript declarations.

## Artwork

The finished scrapbook templates bundle eight Unsplash photographs in `public/template-photos/` under the [Unsplash License](https://unsplash.com/license). Each photo's source URL and license are retained in `TEMPLATE_PHOTOS` in `src/vision/collageTemplates.ts`. They are bundled locally for previews, saved boards, and exports; adding a template does not download photos at runtime.

The Elements gallery and its 250 bundled SVGs have been removed. Template artwork retains its separate notices.

## Project license

Original contributions owned by Parth Patil are proprietary, copyright (c) 2026 Parth Patil, all rights reserved; see [LICENSE](LICENSE). This restriction does not apply to third-party materials or revoke previously granted permissions. The notices above apply to their respective third-party components.

## Pinterest template starter photos

Bundled from the pins below. Pinterest is the discovery source, not a reuse license; original creator rights apply. No open-license claim is made for these images.

- ocean: https://www.pinterest.com/pin/773915517255944565/ (image: https://i.pinimg.com/originals/7d/de/90/7dde90a9519207a449fa75238c11cdf6.jpg)
- beach: https://www.pinterest.com/pin/23995810509264341/ (image: https://i.pinimg.com/originals/71/50/c0/7150c0aa8cfff727e6317c8e865aa4f2.jpg)
- sky: https://www.pinterest.com/pin/861524603725361686/ (image: https://i.pinimg.com/originals/24/f5/06/24f506e3696b522b824ecff26291c61f.jpg)
- blue-shore: https://www.pinterest.com/pin/731412795772856167/ (image: https://i.pinimg.com/originals/d6/24/e6/d624e67c7cfd12b862889191132f3287.jpg)
- sand: https://www.pinterest.com/pin/901845894107135206/ (image: https://i.pinimg.com/originals/27/73/b0/2773b04e36aac010054b63102de7f62c.jpg)
- shoreline: https://www.pinterest.com/pin/839639924282603938/ (image: https://i.pinimg.com/originals/08/b5/f6/08b5f6e9f62eb581fcc4f282206f07e8.jpg)
- summer: https://www.pinterest.com/pin/426082814761713461/ (image: https://i.pinimg.com/originals/49/45/02/4945029ff2a19855698b18e619eb6429.jpg)
- blue-shell: https://www.pinterest.com/pin/158259374400709643/ (image: https://i.pinimg.com/originals/9a/c6/cb/9ac6cb1a253b1dcdc5d284d74f036073.jpg)
- books: https://www.pinterest.com/pin/659073726737524024/ (image: https://i.pinimg.com/originals/95/9f/b4/959fb44153b9542bb6f121a6f21bc028.jpg)
- flowers: https://www.pinterest.com/pin/529876712416842952/ (image: https://i.pinimg.com/originals/be/6c/89/be6c8970f7262a90512dd658348c96f4.jpg)
- tulips: https://www.pinterest.com/pin/695876579952195237/ (image: https://i.pinimg.com/originals/22/97/ab/2297abea5eb3cf49fe01bb7e88d2610e.jpg)
- berries: https://www.pinterest.com/pin/925419423432029933/ (image: https://i.pinimg.com/originals/68/59/91/6859910fcfb0a3555fa0fa4524b08c97.jpg)
- matcha: https://www.pinterest.com/pin/811844270358693195/ (image: https://i.pinimg.com/originals/ee/d8/35/eed83507a0ba25ce4ad75130eafbfec7.jpg)
- latte: https://www.pinterest.com/pin/775604367074536900/ (image: https://i.pinimg.com/originals/c6/a8/46/c6a846b7f4e19fc8d774c84bf56db04e.jpg)
- pastry: https://www.pinterest.com/pin/566679565629142226/ (image: https://i.pinimg.com/originals/75/6c/ee/756ceebd76c8e186cefb9b681c2a258b.jpg)
- croissant: https://www.pinterest.com/pin/842947255270336984/ (image: https://i.pinimg.com/originals/57/0e/e9/570ee95baf39b13e4d8001b4fbd30bde.jpg)
- desk: https://www.pinterest.com/pin/883620389368591413/ (image: https://i.pinimg.com/originals/51/11/b7/5111b7c5a64d8b93a502b986e13e5490.jpg)
- study: https://www.pinterest.com/pin/705657835384691067/ (image: https://i.pinimg.com/originals/e6/19/90/e61990e5300f4d1c566bc01e1a941bb1.jpg)
- notes: https://www.pinterest.com/pin/581034789440184210/ (image: https://i.pinimg.com/originals/00/c4/1a/00c41ad7ab0d32d05327141fefbe0d89.jpg)
- cafe: https://www.pinterest.com/pin/32440059822528985/ (image: https://i.pinimg.com/originals/5d/27/a6/5d27a64a48cfb6ec0280f37f1b42ae61.jpg)
- coffee-books: https://www.pinterest.com/pin/819936675942981027/ (image: https://i.pinimg.com/originals/aa/5a/2d/aa5a2d76d6633acc5067624c02bce71e.jpg)
- coffee-notes: https://www.pinterest.com/pin/515591857343591110/ (image: https://i.pinimg.com/originals/f6/1d/1a/f61d1a3926469b35c8a4585492866d99.jpg)
- coffee-study: https://www.pinterest.com/pin/22025485673208435/ (image: https://i.pinimg.com/originals/20/b2/f0/20b2f017cfccd085a88f3aa3ded777c2.jpg)
- reading: https://www.pinterest.com/pin/832251206138612595/ (image: https://i.pinimg.com/originals/48/94/cd/4894cd818f7bfdb5afb9112b55d82bdb.jpg)
- school-day: https://www.pinterest.com/pin/771030398727559991/ (image: https://i.pinimg.com/originals/a9/82/d6/a982d60eac703ae8e895f3155476d856.jpg)
- stationery: https://www.pinterest.com/pin/603834262569509381/ (image: https://i.pinimg.com/originals/ba/11/e1/ba11e1ec9d6ec525a7ac9489323095f1.jpg)
- notebooks: https://www.pinterest.com/pin/845410161300057459/ (image: https://i.pinimg.com/originals/c2/3b/49/c23b497c3b7ed67942815c63397afe7b.jpg)
- school-supplies: https://www.pinterest.com/pin/613334043026366268/ (image: https://i.pinimg.com/originals/7a/5a/9c/7a5a9c462561e38ea84c2a4730e41b7c.jpg)
- pastel-pens: https://www.pinterest.com/pin/1120270476048867263/ (image: https://i.pinimg.com/originals/c7/02/13/c702130038459542e4299a34b3d1cc8d.jpg)
- desk-details: https://www.pinterest.com/pin/114208540544168007/ (image: https://i.pinimg.com/originals/66/b2/ad/66b2adfcc43279aa0e9b5a83bbaf57d0.jpg)
- pink-headphones: https://www.pinterest.com/pin/50876670783387564/ (image: https://i.pinimg.com/originals/b7/98/74/b79874b8da4d746f91969124a302118a.jpg)
- work-cafe: https://www.pinterest.com/pin/480970435215262390/ (image: https://i.pinimg.com/originals/d9/a4/a3/d9a4a368e8db2de9a6f5c40111c81b7b.jpg)
- study-cafe: https://www.pinterest.com/pin/159948224260695824/ (image: https://i.pinimg.com/originals/65/4f/0e/654f0efdad4e624693853ab4f4ef9a4c.jpg)
- iced-coffee: https://www.pinterest.com/pin/578782989646965158/ (image: https://i.pinimg.com/originals/81/a7/95/81a7951123aee81b51e6cb8ce18e5195.jpg)
- brunch: https://www.pinterest.com/pin/663858801342347105/ (image: https://i.pinimg.com/originals/85/d6/47/85d6473af243e9a59ea94404719b4b3b.jpg)
- stationery-colors: https://www.pinterest.com/pin/515028907406115935/ (image: https://i.pinimg.com/736x/21/ff/62/21ff628cd411aa1cb5175b44320c47db.jpg)
