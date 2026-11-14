# Status – Wandelbar

**Stand:** 2026-11-14 – Design-System A4 „Sonnenstand“ gebaut, vom Nutzer freigegeben, per Code-Review geprüft, `npm run check` grün, in vier Commits auf `milestone/md-design`, gepusht, Vorschau live. Nächster Schritt: klickbarer Prototyp der Kernabläufe.

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

### Design-System – vom Nutzer freigegeben (2026-11-13)

- **Technik** (vom Nutzer bestätigt, Gründe in D-018 bis D-024): Lucide, Albert Sans über @fontsource, native Bausteine mit eigenen Hooks statt Radix oder React Aria (beide verletzen die CSP), eigenes CSS mit Tokens, Bewegung per CSS und Web Animations API.
- **Bausteine in `src/ui/`**, Sammel-Export `src/ui/index.ts`:
  - Bühne mit Plätzen (PC- und Handy-Anordnung per Container Query, Zwischenstufe bis 1100 px), Icons, Marke, Knöpfe, Tasten, Design-Umschalter, Speicherstand („nur auf diesem Gerät“, Symbol `SaveCheck` statt Wolke)
  - Schrittleiste, Werkzeugpalette (ein Tab-Halt, Pfeiltasten), Ansichtsleiste mit Tageszeit-Regler
  - Eigenschaftenkarte: am PC mit Spitze zum Objekt (`placeCard`), auf dem Handy als Blatt von unten mit Griff, Ziehen und selbst gerechneter Feder (`sheetPhysics`); eingeklappt ist der Körper `inert`
  - Befehlssuche (Strg+K, natives `<dialog>`, Combobox; findet Umlaute und ß auch ohne Sonderzeichen)
  - Felder für Text, Zahlen mit Einheit und Maße mit verständlichen Meldungen, Häkchen, Schalter, Farbfelder
- **Übersichtsseite `bausteine.html`** (zweiter Vite-Eintrag, im Build und im Vorab-Cache, D-023): „Am Werk“ mit PC- und Handy-Bühne nebeneinander und gemeinsamem Zustand, Wohnzimmer als Draufsicht mit wanderndem Sonnenlicht und Lampen am Abend; dazu Farben mit live gerechnetem Kontrast, Schrift, Maße, Bewegung, Icons und alle Bausteine mit Zuständen. Lokal unter `/wandelbar/bausteine.html`, nach dem nächsten Push auch unter `/wandelbar/preview/bausteine.html`.
- **Prüfungen:** `npm run check` grün (zuletzt 2026-11-14 nach dem Code-Review): 68 Unit-Tests (darunter der Farbwert-Test: feste Farben nur in `tokens.css`) und 25 E2E-Tests (7 planmäßig übersprungen). axe ohne Verstöße hell und dunkel an PC (1440×900) und Handy (390×844), auch mit offener Suche und aufgeklappter Handy-Karte. Tastatur-Tests für Werkzeugpalette, Befehlssuche, Regler, Farbfelder, Zahlenfeld und Griff der Handy-Karte. Keine Konsolenfehler, keine fremden Anfragen.
- Dabei korrigiert: Die Sonnenschrift hell ist minimal dunkler (Kontrast 3,86 → 4,61 : 1). Der OFL-Text von Albert Sans liegt jetzt im Build unter `licenses/`.
- Vergleichsbilder PC/Handy, hell/dunkel liegen außerhalb des Repos im Notizordner der Session.
- **Freigabe:** Der Nutzer hat die Übersichtsseite freigegeben, nachdem der abgeschnittene Auswahlring der Farbfelder im Handy-Blatt behoben war.
- **Code-Review** (`/code-review`, 2026-11-14): acht Funde, alle behoben.
  - Zahlenfelder übernehmen erst mit Enter oder beim Verlassen und runden nicht: Angezeigt und gespeichert wird der getippte Wert. Damit lange Werte in die Maßfelder passen, steht die Einheit einmal in der Überschrift („Maße in cm“). Beides hat der Nutzer entschieden (D-024).
  - Befehlssuche: Die Pfeiltasten folgen der angezeigten Reihenfolge, ein Befehl läuft erst nach der Fokus-Rückgabe.
  - Handy-Karte: Greift man sie während des Nachfederns, folgt sie sofort dem Finger; ein Halten vor dem Loslassen zählt nicht als Wischen.
  - Übersichtsseite: Duplizieren ohne `crypto.randomUUID`, das über http im WLAN fehlt; Kommazahlen bei Breite und Tiefe springen nicht mehr zurück.
- **Commits** (vom Nutzer bestätigt, 2026-11-14): 1. Abhängigkeiten, Tokens und Grundlage, 2. Bausteine, 3. Übersichtsseite und Tests, 4. Doku. Am 2026-11-14 nach Bestätigung gepusht; der Workflow war grün (Prüfen 2:09 min, 25 E2E bestanden). Die Übersicht ist live unter <https://izblu.github.io/wandelbar/preview/bausteine.html>: CSP wortgleich, keine fremden Anfragen, keine Konsolenfehler. Offline am Handy erst, nachdem `/wandelbar/preview/` einmal geöffnet wurde, denn erst die App meldet den Service Worker an.

### Als Nächstes: klickbarer Prototyp der Kernabläufe

Im echten Stack (Vite, React) mit den Bausteinen aus `src/ui/`: die Kernabläufe Grundriss → Bauen → Einrichten → Erleben zum Durchklicken, noch ohne echte Erkennung und echtes 3D. Danach Feedback des Nutzers. Der Skill `frontend-design` wird weiter genutzt.

## Offene Punkte

- **Wunsch des Nutzers für später: mehr Zoomstufen.** Die Übersichtsseite hat 8 (70 bis 140 % in 10-%-Schritten), das ist zu wenig. Wie es genau sein soll, ist noch zu klären, spätestens beim 3D bzw. beim Prototyp.
- **Kartenplatzierung am PC:** Bei sehr breiten Möbeln (z. B. Sofa 6 m) rutscht die Karte nach links unter die Werkzeugpalette. `placeCard` kennt bisher nur Ränder oben und unten (`safeTop`, `safeBottom`), nicht links. Im Prototyp beheben.
- **Vorläufig bis MD:** App-Icon, Grundstile und automatisches Service-Worker-Update. Mit Projektdaten ab M1 braucht es eine Update-Meldung (siehe D-006).
- **Rückfrage möglich:** CSP um `base-uri 'self'`, `form-action 'self'` und `object-src 'none'` härten (siehe D-005).
- TypeScript 7 einsetzen, sobald typescript-eslint ihn unterstützt (D-001).
- Neue Shells kennen Node.js nach der Installation; in schon offenen Terminals oder der Claude-App fehlt es bis zum Neustart im PATH.
- Commit, Push und Merge immer nur nach ausdrücklicher Bestätigung.
