# Status – Wandelbar

**Stand:** 2026-11-13 – MD Runde 1 abgeschlossen, Richtung A „Morgenlicht“ gewählt. Als Nächstes Runde 2.

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
  - Öffentliches Repo [izblu/wandelbar](https://github.com/izblu/wandelbar). Commits laufen über die noreply-Adresse von GitHub (nur in diesem Repo eingestellt).
  - Der erste Workflow-Lauf war grün (Prüfen 1:32 min, Veröffentlichen 20 s). GitHub Pages liefert den Branch `gh-pages` aus.
  - **Live:** <https://izblu.github.io/wandelbar/>. Service Worker aktiv, CSP wortgleich, keine Konsolenfehler. `/preview/` ist noch leer und wird mit dem ersten `milestone/*`-Push befüllt.

## MD Designphase (Branch `milestone/md-design`)

### Runde 1 – erledigt (2026-11-13)

- Drei Richtungen am Bildschirm „Einrichten“, je für PC und Handy, hell und dunkel, in `design/explorations/`. Die Übersicht liegt in `index.html`, anzusehen über `npm run dev` unter `/wandelbar/design/explorations/`.
  - **A „Morgenlicht“** (ruhig, hell und wohnlich): Kalkweiß, Schiefer, Fjordblau, helle Eiche, Morgensonne. Albert Sans, Milchglas, große Radien, weiche Bewegung. Signatur: Licht (Sonnenflecken am Tag, Lampenkegel im dunklen Modus).
  - **B „Supergrafik“** (mutig und editorial): Kobalt, Papier, Tinte, Rosa. Archivo extra schmal, Raumnamen als Bodenschrift, schwarze Wandschnitte, Bildunterschrift mit Führungslinie.
  - **C „Spielhaus“** (verspielt und farbig): Flieder, Pflaume, bunte Akzente. Fredoka und Nunito, Bauklotz-Möbel, Aufkleber, federnde Bewegung.
- Alle Entwürfe teilen dieselbe Beispielwohnung „Lindenstraße 12“ (3 Zimmer, 82 m², SVG-Puppenhaus) und dieselbe Bedienung: Schrittleiste, schwebende Werkzeugpalette, Karte am ausgewählten Möbel, Strg+K, ausziehbare Handy-Karte.
- axe (WCAG 2.2 AA): 0 Verstöße in allen Varianten (3 Richtungen × PC/Handy × hell/dunkel). Keine fremden Anfragen, strenge CSP auch in den Entwürfen.
- Auf Wunsch zusätzlich gezeigt: die Mischung „A mit Anleihen“ (`a-mix.html`, `styles/a-mix.css`): dunkle Wandschnitte und kräftige Maßzahlen aus B, federnde Rückmeldung aus C.
- **Wahl des Nutzers: A „Morgenlicht“ pur**, ohne die Anleihen aus B und C.

### Als Nächstes: Runde 2

2–3 Verfeinerungen von A „Morgenlicht“ (Farben, Schrift, Details), wieder als HTML in `design/explorations/` mit Vergleich in der Browser-Vorschau. Ansatzpunkte aus der Bewertung von Runde 1:

- Die Licht-Signatur ist noch zu zart. Sonnenflecken und Lampenkegel deutlicher und eigenständiger gestalten.
- A wirkt auf den ersten Blick am wenigsten eigenständig. Varianten in Farbton (wärmer/kühler), Akzentfarbe und Schriftschnitt prüfen.
- Milchglas (`backdrop-filter`) kostet auf Android-Mittelklasse Leistung, wenn darunter echtes 3D läuft. Eine Variante mit deckenden Flächen zeigen.

Danach: Design-System (Tokens, Icons, Bausteine), klickbarer Prototyp im echten Stack, Feedback. Der Skill `frontend-design` wird genutzt.

## Offene Punkte

- **Vorläufig bis MD:** App-Icon, Grundstile und automatisches Service-Worker-Update. Mit Projektdaten ab M1 braucht es eine Update-Meldung (siehe D-006).
- **Rückfrage möglich:** CSP um `base-uri 'self'`, `form-action 'self'` und `object-src 'none'` härten (siehe D-005).
- TypeScript 7 einsetzen, sobald typescript-eslint ihn unterstützt (D-001).
- Neue Shells kennen Node.js nach der Installation; in schon offenen Terminals oder der Claude-App fehlt es bis zum Neustart im PATH.
- Commit, Push und Merge immer nur nach ausdrücklicher Bestätigung.
