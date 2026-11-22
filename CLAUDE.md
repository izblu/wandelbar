# Wandelbar – Arbeitsanleitung für Claude

Wandelbar ist eine installierbare Web-App (PWA): Aus einem Grundriss (Bild oder PDF) entsteht ein maßstabsgetreues 3D-Modell einer Wohnung, die man einrichten und begehen kann. Nutzer sind der Projektinhaber, seine Familie und Freunde, ohne Technikkenntnisse.

**Am Anfang jeder Session lesen:** `docs/STATUS.md` (Stand und nächster Schritt), `docs/PLAN.md` (freigegebener Plan, maßgeblich), bei Bedarf `docs/DECISIONS.md` (Technikentscheidungen).

## Harte Vorgaben

- **Keine Daten an Dritte, alles offline nutzbar.** Keine CDNs, keine externen Schriften, kein Tracking, keine Telemetrie. Alles wird selbst gehostet.
- **Design und Bedienung auf Award-Niveau.** Oberfläche deutsch und metrisch, WCAG 2.2 AA, hell und dunkel.
- **Stack:** Vite, React, TypeScript (strict), three.js über @react-three/fiber und drei. npm als Paketmanager.
- Hosting auf GitHub Pages aus dem öffentlichen Repo `wandelbar`, MIT-Lizenz.

## Arbeitsregeln

- **Commit, Push und PR-Merge nur nach ausdrücklicher Bestätigung, jedes Mal neu.** Auch in parallelen Sessions. Kleine, logische Commits mit fertiger deutscher Nachricht zur Freigabe vorlegen.
- **Branches:** ein Branch pro Meilenstein, am Ende ein Pull Request. `main` bleibt immer veröffentlichungsfähig, denn jeder Push auf `main` geht sofort live.
  - Meilenstein der Hauptsession: `milestone/<kürzel>-<thema>`, z. B. `milestone/md-design`. Nur diese Branches werden nach `/preview/` veröffentlicht.
  - Parallele Sessions: `parallel/<kürzel>-<thema>`, z. B. `parallel/m10-erkennung`. Sie werden über den PR geprüft, aber nicht veröffentlicht, damit sie sich die Vorschau nicht gegenseitig überschreiben.
- **Autonomie:** Technikentscheidungen selbst treffen und kurz in `docs/DECISIONS.md` festhalten. **Vorher fragen** bei allem Sichtbaren und der Bedienung, bei Planabweichungen, bei Lizenz- oder Datenschutzfolgen, bei neuen Abhängigkeiten über 1 MB und bei Kosten. Fragen einzeln stellen, jeweils mit Empfehlung.
- **Sprachen:** Bezeichner im Code englisch. Kommentare, Dokumentation, Commits und PRs deutsch. Mit dem Nutzer Deutsch sprechen.
- **Kontext:** möglichst ein Meilenstein pro Chat. `docs/STATUS.md` nach jedem Arbeitsblock aktualisieren. Am Ende eines Meilensteins wandern seine Einzelheiten nach `docs/archive/STATUS-<Kürzel>.md`; STATUS behält nur Stand, nächsten Schritt und offene Punkte. Ab etwa 200.000 Token den Stand in STATUS festhalten und an eine neue Session übergeben, die der Nutzer selbst startet (siehe „Sessions“).
- **Prüfen in zwei Stufen** (vom Nutzer so gewünscht, weil der volle Lauf vor allem durch die E2E-Tests lange dauert):
  - **Zwischendurch** während der Arbeit (Bau-Untersessions): `npm run check:fast`. Betrifft eine Änderung bestimmte E2E-Tests, startet die Tests-Session nur diese gezielt, z. B. `npx playwright test e2e/core-flows.spec.ts`.
  - **Vor jedem Commit-Vorschlag:** der volle `npm run check` mit allen E2E-Tests (Datenschutz, Offline, axe). Im Meilenstein läuft er in der Tests-Session.
  - **Sofort voll prüfen** nach Änderungen an CSP, Service Worker, `vite.config.ts` oder Abhängigkeiten. Fremde Anfragen und den Offline-Betrieb prüfen nur die E2E-Tests.
  - Im Bericht an den Nutzer sagen, welche Stufe gelaufen ist.
- **Testdaten:** In `fixtures/` liegen nur frei lizenzierte Pläne. Private Grundrisse und Projekte gehören nach `fixtures/private/` (per `.gitignore` ausgeschlossen) und kommen nie ins Repo.

## Sessions

Vom Nutzer am 2026-11-22 so festgelegt, damit er den Überblick behält und keine Ketten von Sessions entstehen.

- **Gruppen:** „Wandelbar“ für Projektweites (Lern-Chat, Gespräche, Abschlüsse). Je Meilenstein eine Gruppe „Wandelbar · M1 Datenmodell“; die Bau-Hauptsession legt sie beim Start an und verschiebt sich hinein. btw-Sessions in die Gruppe des laufenden Meilensteins.
- **Titel:** `M1 · Bau`, `M1 · Tests`, nach einer Übergabe `M1 · Bau 2`, Untersessions `M1 · Bau · Speichern`. Jede Session setzt ihren Titel beim Start.
- **Starten:** Hauptsessions startet der Nutzer mit einem Startsatz; der Auftrag steht in `docs/STATUS.md`. Untersessions pro Feature starten nur die Hauptsessions, und nur bei spürbar viel Arbeit; sie starten nie selbst Sessions. Es schreibt immer nur eine Session gleichzeitig Code.
- **Aufgaben:** Bau plant, startet Features und prüft im Browser; Bau-Untersessions nutzen `npm run check:fast`. Tests schreibt Unit- und E2E-Tests, prüft mit `npm run check`, sucht Fehler und macht das Code-Review. Kleine, unsichtbare Funde behebt Tests selbst und meldet sie, alles andere geht an Bau. Kein Fund bekommt eine eigene Session.
- **Meldungen:** Untersessions melden automatisch an ihre Hauptsession. Bau und Tests schreiben in ihren eigenen Abschnitt von `docs/STATUS.md` und schicken sich eine kurze Nachricht. Nichts wird weitergereicht.
- **Archivieren** nur nach Frage, gesammelt: Untersession nach Abnahme, btw nach Antwort, alte Session nach Übergabe, am Meilenstein-Ende alles samt Gruppe.

## Befehle

Node.js 26 (LTS) liegt unter `C:\Program Files\nodejs`. Kennt eine ältere Shell den PATH noch nicht, `export PATH="/c/Program Files/nodejs:$PATH"` (Bash) voranstellen.

| Befehl                           | Zweck                                                                        |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`                    | Dev-Server, App unter `http://localhost:5173/wandelbar/`                     |
| `npm run dev -- --host`          | Dev-Server im WLAN, zum Testen am Android-Handy                              |
| `npm run build`                  | Typprüfung und Produktions-Build nach `dist/` (Basis `/wandelbar/`)          |
| `npm run build:preview`          | Build für den Vorschau-Kanal (Basis `/wandelbar/preview/`)                   |
| `npm run preview`                | Den Build lokal ausliefern (mit Service Worker und strikter CSP)             |
| `npm run lint`                   | ESLint (typgeprüft, strict)                                                  |
| `npm run format`                 | Prettier schreibt alle Dateien; `format:check` prüft nur                     |
| `npm run typecheck`              | `tsc -b`                                                                     |
| `npm test`                       | Unit-Tests (Vitest), Dateien `src/**/*.test.ts(x)`                           |
| `npm run test:e2e`               | Playwright gegen den Produktions-Build, Desktop-Chromium und Pixel-Emulation |
| `npm run check:fast`             | Format, Lint, Typen und Unit-Tests, ohne E2E (für zwischendurch)             |
| `npm run check`                  | Alles inklusive E2E, wie in CI (vor jedem Commit-Vorschlag)                  |
| `node scripts/generate-icons.ts` | PWA-Icons aus `public/favicon.svg` neu erzeugen                              |

Playwright braucht einmalig `npx playwright install --only-shell chromium`.

## Kanäle und Veröffentlichung

- Der Kanal wird über `WANDELBAR_CHANNEL` (`production` oder `preview`) oder lokal über `--mode preview` gesteuert. Er legt den Vite-`base` fest: `/wandelbar/` oder `/wandelbar/preview/`. Im Code steht er als `appChannel` in `src/app/channel.ts` bereit.
- Der Workflow `.github/workflows/pages.yml` prüft jeden Push und PR (Format, Lint, Typen, Unit- und E2E-Tests). Danach baut er `main` in die Wurzel und `milestone/*` in den Ordner `preview/` des Branches `gh-pages` (Skript `scripts/deploy-gh-pages.sh`). GitHub Pages liefert `gh-pages` aus.
- **Getrennter Speicher:** Hauptversion und Vorschau teilen sich eine Origin. Deshalb enthält jeder Speichername den Basis-Pfad: IndexedDB heißt `databaseName()` aus `src/persistence/databaseName.ts`, also `wandelbar:${BASE_URL}`. Das gilt auch für alles Künftige (localStorage-Schlüssel, Cache-Namen). Der Service Worker der Hauptversion schließt `/wandelbar/preview/` per `navigateFallbackDenylist` aus.

## Datenschutz per Konstruktion

- Die CSP steht als Meta-Tag in `index.html`, **genau wie im Plan**: `default-src 'self'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'`. Nur der Dev-Server lockert sie für Inline-Skripte und -Styles (Plugin in `vite.config.ts`). Eine Änderung an der CSP ist eine Planabweichung und braucht Rückfrage.
- Die CSP hat kein `style-src`, also gilt `'self'`. Bibliotheken, die `<style>`-Elemente einfügen, verletzen sie und fallen im Datenschutz-Test auf. CSSOM-Zugriffe (`element.style.x = …`, React-`style`) sind erlaubt.
- Schriften werden nie als `data:`-URL eingebettet, denn `font-src` fällt auf `'self'` zurück.
- **Bekannte Stellen, an denen Bibliotheken fremd nachladen; immer auf lokale Pfade umstellen:**
  - Tesseract.js: worker-, core- und lang-Pfad
  - pdf.js: Worker, `cMapUrl`, `standardFontDataUrl`
  - drei `useGLTF`: Draco-, Meshopt- und KTX2-Decoder
  - drei `<Environment preset>`: nur eigene HDR-Dateien
  - troika/drei `<Text>`: immer eine lokale Schrift angeben
  - onnxruntime-web: WASM-Pfade
  - opencv.js: nur lokal einbinden
- **Jeder E2E-Test importiert `test` und `expect` aus `e2e/fixtures.ts`**, nie direkt aus `@playwright/test`. Der Datenschutz-Wächter läuft dann automatisch mit: Jede fremde Anfrage (wird abgebrochen) und jeder CSP-Verstoß lässt den Test scheitern.

## Konventionen

- **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Relative Importe mit Endung (`./App.tsx`). Kein `any`, keine Non-Null-Assertions ohne Not.
- **Format:** Prettier (einfache Anführungszeichen, Zeilenbreite 100), Zeilenenden LF (`.gitattributes`). `docs/PLAN.md` wird nicht umformatiert.
- **Ordner in `src/`:** `app/` (Gerüst, PWA, Onboarding), `ui/` (Design-System), `model/` (Typen, Schema, Geometrie), `store/`, `persistence/`, `editor2d/`, `scene3d/`, `materials/`, `furniture/`, `recognition/` (in Web Workern), `export/`, `xr/`. Siehe `docs/PLAN.md`.
- **Datenmodell:** intern Meter, Anzeige in cm/m, Schema versioniert mit Migrationen.
- **Tests:** Unit-Tests neben dem Code (`foo.ts` und `foo.test.ts`). E2E-Tests in `e2e/`. Keine Wiederholungen in Playwright (`retries: 0`), damit sporadische Datenschutz-Fehler nicht durchrutschen.
- **Lizenzen:** Jede neue Abhängigkeit, Schrift und jeden Inhalt in `THIRD_PARTY_LICENSES.md` eintragen.

## Abnahme pro Meilenstein

Unit- und E2E-Tests grün (inklusive Datenschutz und Offline), axe ohne AA-Verstöße, Code-Review per Subagent (`/code-review`), Vorführung in der Browser-Vorschau, danach die Abnahme-Checkliste des Nutzers (PC, Android über `npm run dev -- --host`, Installation und Offline-Betrieb über `/preview/`). Erst dann Commit-, Push- und PR-Vorschläge zur Bestätigung.
