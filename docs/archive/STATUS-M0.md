# Status-Archiv – M0 Einrichtung

Aus `docs/STATUS.md` hierher verschoben am 2026-11-22 (MD-Abschluss), unverändert. Der aktuelle Stand steht in `docs/STATUS.md`.

- Planungsgespräch abgeschlossen, Plan freigegeben (`docs/PLAN.md`).
- Name festgelegt: **Wandelbar** (Repo `wandelbar`, Endung `.wandelbar`).
- Arbeitsabsprachen im Claude-Gedächtnis und in `CLAUDE.md` festgehalten.
- **M0 Einrichtung:**
  - Node.js 26.13.1 (LTS) per winget installiert.
  - Vite 8, React 19 und TypeScript 6.0 (strict) direkt im Projektordner. Basis `/wandelbar/`, für die Vorschau `/wandelbar/preview/`, gesteuert über `WANDELBAR_CHANNEL`.
  - ESLint 10 (typgeprüft), Prettier, Vitest, Playwright (Desktop-Chromium und Pixel 7) und axe-core.
  - CSP als Meta-Tag genau wie im Plan, PWA mit vite-plugin-pwa (Manifest „Wandelbar“, Service Worker, Sperrliste für `/preview/`). Keine externen Ressourcen.
  - Tests: Unit-Test (Datenbankname mit Basis-Pfad), Datenschutz-Test mit zwei Gegenproben, Offline-Test, axe-Test hell und dunkel. Alle grün.
  - GitHub Actions `pages.yml`: Prüfen bei jedem Push und PR; `main` wird in die Wurzel und `milestone/*` nach `/preview/` des Branches `gh-pages` veröffentlicht.
  - `CLAUDE.md`, `docs/DECISIONS.md`, `LICENSE` (MIT), `THIRD_PARTY_LICENSES.md`, `README.md`, `.gitignore` (schließt `fixtures/private/` aus).
  - Öffentliches Repo [izblu/wandelbar](https://github.com/izblu/wandelbar). Commits laufen über die noreply-Adresse von GitHub (nur in diesem Repo eingestellt).
  - Der erste Workflow-Lauf war grün (Prüfen 1:32 min, Veröffentlichen 20 s). GitHub Pages liefert den Branch `gh-pages` aus.
  - **Live:** <https://izblu.github.io/wandelbar/>. Service Worker aktiv, CSP wortgleich, keine Konsolenfehler. `/preview/` ist noch leer und wird mit dem ersten `milestone/*`-Push befüllt.
