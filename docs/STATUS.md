# Status – Wandelbar

**Stand:** 2026-11-12

## Erledigt

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

## In Arbeit

- Commits, GitHub-Repo `wandelbar`, erster Push und Aktivierung von GitHub Pages (jeweils nach Bestätigung).

## Als Nächstes: MD Designphase

1. **Runde 1:** drei Richtungen (_ruhig, hell und wohnlich_ / _mutig und editorial_ / _verspielt und farbig_), jeweils am Bildschirm „Einrichten“ für PC und Handy, als HTML in `design/explorations/`, gezeigt in der Browser-Vorschau.
2. Runde 2: Verfeinerung des Gewinners.
3. Design-System (Tokens, Icons, Bausteine), klickbarer Prototyp im echten Stack, Feedback.

Branch dafür: `milestone/md-design`. Der Skill `frontend-design` wird genutzt.

## Offene Punkte

- **Vorläufig bis MD:** App-Icon, Grundstile und automatisches Service-Worker-Update. Mit Projektdaten ab M1 braucht es eine Update-Meldung (siehe D-006).
- **Rückfrage möglich:** CSP um `base-uri 'self'`, `form-action 'self'` und `object-src 'none'` härten (siehe D-005).
- TypeScript 7 einsetzen, sobald typescript-eslint ihn unterstützt (D-001).
- Den leeren alten Ordner `C:\Users\Guenay\Coding Projects\Room Planer 3D` löschen (**nach Bestätigung**).
- Commit, Push und Merge immer nur nach ausdrücklicher Bestätigung.
