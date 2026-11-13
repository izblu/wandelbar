# Status – Wandelbar

**Stand:** 2026-11-13 – MD Runde 2 abgeschlossen, Verfeinerung A4 „Sonnenstand“ gewählt. Als Nächstes das Design-System.

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

### Runde 2 – erledigt (2026-11-13)

- Drei Verfeinerungen von A am Bildschirm „Einrichten“, je für PC und Handy, hell und dunkel. Jede Variante lädt `styles/a-morgenlicht.css` und danach ein eigenes Stylesheet mit den Unterschieden. Der Vergleich mit A pur liegt in `runde-2.html` und ist von `index.html` aus verlinkt.
  - **A2 „Frühlicht“** (kühler und klarer): Porzellan, Nachtblau, Petrol, Albert Sans im leichten Schnitt, feineres Milchglas mit Glaskante, scharfe Fensterbilder.
  - **A3 „Honiglicht“** (wärmer und wohnlicher): Kalkputz, Umbra, Moosgrün, kräftiger Schnitt, Lichtstrahlen mit schwebendem Staub, abends Lampeninseln im Halbdunkel.
  - **A4 „Sonnenstand“** (deckend, Licht als Werkzeug): Farben und Schrift wie A, deckende Flächen statt Milchglas, Tageszeit-Regler (6–22 Uhr). Die Sonne wandert durch die Fenster, ab Sonnenuntergang leuchten die Lampen.
- Neue Lichtberechnung in `shared/dollhouse.js` (D-017). Sie greift nur, wenn das CSS `--light-model: windows` setzt. A, B und C aus Runde 1 bleiben unverändert.
- axe (WCAG 2.2 AA): 0 Verstöße in allen Varianten, PC und Handy, hell und dunkel, auch mit offener Befehlssuche und bei A4 am Abend. Runde 1 erneut geprüft, ebenfalls 0. Keine Konsolenfehler, keine fremden Anfragen. Keine neuen Schriften oder Dateien.
- Das Vergleichsbild (alle Varianten gegen A pur, PC/Handy, hell/dunkel, Sofa-Ausschnitt) wurde dem Nutzer gezeigt. Es liegt nicht im Repo.
- **Wahl des Nutzers: A4 „Sonnenstand“**, wie empfohlen.

**Was aus der Wahl folgt:**

- Deckende Flächen sind gesetzt: kein `backdrop-filter` über dem 3D. Kanten entstehen durch eine feine Linie und Schatten.
- Farben und Schrift bleiben wie in A: Kalkweiß, Schiefer, Fjordblau, Eiche und eine etwas sattere Sonne (`#f5cf68`). Dazu Albert Sans in mittleren Gewichten.
- **Planergänzung, vor dem Funktionsbau mit dem Nutzer bestätigen:**
  - Licht als Werkzeug braucht die Nordrichtung des Grundrisses, z. B. im Schritt „Grundriss“ oder „Bauen“.
  - Dazu kommt ein Sonnenstand im 3D: gerichtetes Licht nach Uhrzeit und Datum, abends Lampen.
  - Die Leistung auf Android-Mittelklasse ist dabei zu prüfen, z. B. Schattenwurf nur auf Wunsch.

### Als Nächstes: Design-System

Auf Grundlage von A4 „Sonnenstand“ (`design/explorations/a4-sonnenstand.html`, Stylesheets `a-morgenlicht.css` und `a4-sonnenstand.css`):

1. **Tokens** als CSS-Variablen: Farben hell/dunkel, Typografie (Albert Sans, Skala, Gewichte), Abstände, Radien, Schatten und Kanten, Bewegung (`--ease`, Dauer, reduzierte Bewegung).
2. **Icons:** einheitlicher Satz auf Basis von `shared/icons.svg`, Entscheidung Lucide oder Phosphor laut Plan.
3. **Bausteine:** Schrittleiste, Werkzeugpalette, Ansichtsleiste mit Tageszeit-Regler, Eigenschaftenkarte und Handy-Karte, Befehlssuche, Felder, Farbfelder, Knöpfe.

Danach folgt der klickbare Prototyp der Kernabläufe im echten Stack (Vite, React), dann das Feedback des Nutzers. Der Skill `frontend-design` wird weiter genutzt.

## Offene Punkte

- **Vorläufig bis MD:** App-Icon, Grundstile und automatisches Service-Worker-Update. Mit Projektdaten ab M1 braucht es eine Update-Meldung (siehe D-006).
- **Rückfrage möglich:** CSP um `base-uri 'self'`, `form-action 'self'` und `object-src 'none'` härten (siehe D-005).
- TypeScript 7 einsetzen, sobald typescript-eslint ihn unterstützt (D-001).
- Neue Shells kennen Node.js nach der Installation; in schon offenen Terminals oder der Claude-App fehlt es bis zum Neustart im PATH.
- Commit, Push und Merge immer nur nach ausdrücklicher Bestätigung.
