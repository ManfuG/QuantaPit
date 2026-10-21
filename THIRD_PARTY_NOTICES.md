# Third-party notices

Review date: 2026-10-21. Project-owned code is MIT under [LICENSE](LICENSE), copyright 2026 ManfuG. This does not relicense third-party software/assets and is not a legal guarantee of originality or a trademark clearance.

## Browser software and publication

The emitted browser package inventory includes React, React DOM, React Router and Scheduler, all retaining their upstream MIT copyright and permission texts. `package-lock.json` records locked versions, provenance and integrity hashes. React Router DOM's re-exports may be removed by tree shaking; build/test dependencies are not automatically distributed browser libraries.

Standalone web/Android builds ship complete runtime notices in `public/THIRD_PARTY_LICENSES.txt` and retain both font licenses. The sibling portfolio publisher also generates its combined distribution notices in `projects/quantapit/THIRD_PARTY_LICENSES.txt` and links them from `licenses.html`. Builds emit `_bundled-packages.json` for the included-package inventory; source-only dependency tables are not replacements for full distribution notices.

## Fonts

| Assets | Copyright / upstream | License |
| --- | --- | --- |
| `public/fonts/syne-variable.ttf` | Copyright 2017 The Syne Project Authors; [Syne](https://gitlab.com/bonjour-monde/fonderie/syne-typeface) | SIL OFL 1.1; [Syne-OFL.txt](public/fonts/Syne-OFL.txt) |
| `public/fonts/fraunces-latin.woff2`, `public/fonts/fraunces-italic-latin.woff2` | Copyright 2018 The Fraunces Project Authors; [Fraunces](https://github.com/undercasetype/Fraunces) | SIL OFL 1.1; [Fraunces-OFL.txt](public/fonts/Fraunces-OFL.txt) |

Font software keeps its own copyright and OFL terms, not the project MIT terms. Preserve both notice files whenever distributing the font binaries. No external font service is used.

## Interface, questions and documentation media

Orbital/botanical illustrations are defined in the project SVG/source; the Android entry's adapted constellation is attributed below. No imported painting, photo or game-art pack is included. The question and Fermi-estimation banks declare project-authored editorial content rather than an imported interview dataset. Familiar mathematical facts and methods are not represented as exclusive project inventions; this review does not authenticate every historical wording/authoring input.

`assets/quantapit-demo.gif` and `.mp4` are project-generated recordings of the running application for GitHub documentation, not imported footage. The MP4 contains a video stream and no audio stream; sampled frames show the application rather than private account overlays. Neither recording is copied into the static site build. There is no implication of endorsement by third-party platforms or tool owners.

The Android opening screen adapts the portfolio's orbital/botanical geometry through HanPit's prerendered `entry-art.svg`, recolored to QuantaPit's plum/peach/sage palette. Its Taurus figure is a stylized adaptation of [Taurus Pattern](https://noirlab.edu/public/products/line-art/taurus-pattern/), credited to **NOIRLab**, with the NOIRLab / Sky & Telescope constellation-pattern context. [NOIRLab's policy](https://noirlab.edu/public/copyright/) supplies [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), including the [legal code](https://creativecommons.org/licenses/by/4.0/legalcode). Geometry, scale, colors and presentation were modified; no photograph/logo or endorsement is included. Preserve the shipped attribution in `public/THIRD_PARTY_LICENSES.txt`.

## Android software

Capacitor 8.5.3 is MIT-licensed; its Android runtime also retains the bundled Cordova Apache-2.0 license and NOTICE. Complete notices for the shipped web runtime, original project code and artwork accompany the offline APK in `public/THIRD_PARTY_LICENSES.txt`; fonts retain their separate OFL records. The Android footer links these notices. SDK/build tools are build prerequisites, not application assets.

## Private-data boundary

The public site ships no backend, private vault, academic attachment, practice-history export or account secret. Sessions stay in the browser's IndexedDB and move between origins only through the user's explicit export/import. Publishing arbitrary local backups or repository history would require a separate privacy review.
