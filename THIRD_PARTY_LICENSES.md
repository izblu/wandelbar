# Lizenzen von Drittanbietern

Wandelbar selbst steht unter der MIT-Lizenz (siehe `LICENSE`). Diese Datei listet fremde Software und Inhalte, die Wandelbar nutzt.

Die vollständigen Lizenztexte aller Pakete, die in die App eingebündelt werden, erzeugt der Build automatisch als `third-party-licenses.md` (Vite-Option `build.license`). Diese Datei wird mit der App veröffentlicht, zum Beispiel unter `…/wandelbar/third-party-licenses.md`.

**Pflege:** Bei jeder neuen Abhängigkeit, jeder Schrift und jedem Inhalt (Texturen, Modelle, HDRs, Testpläne) wird diese Datei ergänzt.

## In der ausgelieferten App enthalten

| Paket                                                                 | Version | Lizenz | Rechteinhaber                       |
| --------------------------------------------------------------------- | ------- | ------ | ----------------------------------- |
| react                                                                 | 19.3    | MIT    | Meta Platforms, Inc. and affiliates |
| react-dom                                                             | 19.3    | MIT    | Meta Platforms, Inc. and affiliates |
| scheduler (über react-dom)                                            | 0.28    | MIT    | Meta Platforms, Inc. and affiliates |
| workbox-window                                                        | 7.4     | MIT    | Google LLC                          |
| workbox-core, workbox-precaching, workbox-routing (im Service Worker) | 7.4     | MIT    | Google LLC                          |

## Nur Entwicklungswerkzeuge (nicht in der App enthalten)

| Paket                                                         | Lizenz     |
| ------------------------------------------------------------- | ---------- |
| vite, @vitejs/plugin-react, vitest                            | MIT        |
| vite-plugin-pwa, workbox-build                                | MIT        |
| typescript                                                    | Apache-2.0 |
| eslint, @eslint/js, typescript-eslint, eslint-plugin-react-\* | MIT        |
| eslint-config-prettier, prettier, globals                     | MIT        |
| @playwright/test (inkl. Chromium für Tests)                   | Apache-2.0 |
| @axe-core/playwright, axe-core                                | MPL-2.0    |

axe-core steht unter der MPL-2.0. Es wird nur in den Tests verwendet, nicht verändert und nicht mit der App ausgeliefert.

## Inhalte

| Inhalt                                              | Herkunft                    | Lizenz                |
| --------------------------------------------------- | --------------------------- | --------------------- |
| App-Icon (vorläufig, `public/favicon.svg` und PNGs) | eigene Arbeit für Wandelbar | MIT (wie das Projekt) |

Geplant laut `docs/PLAN.md`: Texturen von ambientCG und Poly Haven (CC0), CubiCasa5k-Modell (CC BY-NC 4.0, mit Quellenangabe), selbst gehostete Schriften über @fontsource (jeweils eigene freie Lizenz). Sie werden hier eingetragen, sobald sie hinzukommen.
