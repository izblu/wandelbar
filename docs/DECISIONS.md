# Technikentscheidungen

Kurzprotokoll der Entscheidungen, die nicht im Plan stehen oder ihn technisch konkretisieren. Neueste unten. Format: Entscheidung, Grund, Folgen.

## M0 Einrichtung (2026-11-12)

### D-001 TypeScript 6.0 statt 7.0

Das Vite-Template bringt TypeScript 7 (die native Go-Version) mit. typescript-eslint 8.72 unterstützt aber nur TypeScript unter 6.1. Der Plan verlangt ESLint, deshalb nutzen wir **TypeScript ~6.0.3**. Das Template ist außerdem auf oxlint umgestiegen; wir bleiben wie geplant bei ESLint.
**Folgen:** Umstieg auf TypeScript 7, sobald typescript-eslint ihn unterstützt.

### D-002 ESLint-Regelwerk

ESLint 10 mit Flat-Config: `strictTypeChecked` und `stylisticTypeChecked` von typescript-eslint, React-Hooks (`recommended-latest`), React-Refresh und `eslint-config-prettier`. `eslint-plugin-jsx-a11y` unterstützt ESLint 10 noch nicht und fehlt deshalb. Barrierefreiheit prüft axe-core in den E2E-Tests.

### D-003 Strengere TypeScript-Optionen

Zusätzlich zu `strict`: `noUncheckedIndexedAccess` und `noImplicitOverride`. Das ist wichtig für Geometrie-Code mit vielen Array-Zugriffen.

### D-004 Kanal über Umgebungsvariable

`WANDELBAR_CHANNEL=production|preview` (alternativ `vite build --mode preview`) bestimmt `base` (`/wandelbar/` oder `/wandelbar/preview/`), den Namen im Manifest („Wandelbar“ oder „Wandelbar Vorschau“) und die Konstante `__APP_CHANNEL__`. Unbekannte Werte brechen den Build ab.
**Grund:** Beide Versionen lassen sich getrennt installieren und auf dem Handy auseinanderhalten (eigene Manifest-`id` und eigener `scope`).

### D-005 CSP genau wie im Plan, gelockert nur im Dev-Server

Die CSP steht wörtlich in `index.html` und wird so ausgeliefert. Das React-Plugin braucht im Dev-Server ein Inline-Skript (Fast Refresh) und Vite Inline-Styles (CSS-Hot-Reload). Ein kleines Vite-Plugin (`apply: 'serve'`) ergänzt deshalb nur dort `'unsafe-inline'` für `script-src` und `style-src`. Fremde Adressen bleiben auch im Dev-Server gesperrt.
**Folgen:** Der Datenschutz-Test prüft die CSP im Build wortgleich gegen den Plan.
**Offen zur Rückfrage:** `base-uri 'self'`, `form-action 'self'` und `object-src 'none'` würden die CSP weiter härten. `base-uri` und `form-action` fallen nicht auf `default-src` zurück. Das wäre eine Planänderung.

### D-006 Service Worker und Updates

`vite-plugin-pwa` 2.0 mit `generateSW`. Registrierung über `virtual:pwa-register` in `src/app/pwa.ts`, weil ein Inline-Registrierungsskript gegen die CSP verstoßen würde. Vorläufig `autoUpdate` mit `skipWaiting` und `clientsClaim`; beides muss bei `injectRegister: false` ausdrücklich gesetzt werden. Der Vorab-Cache umfasst JS, CSS, HTML, SVG, PNG, Manifest und WOFF2. Die Sperrliste `navigateFallbackDenylist: [/^\/wandelbar\/preview\//]` gilt nur im Produktionskanal.
**Folgen:** Sobald es Projektdaten gibt (M1), auf eine Update-Meldung in der Oberfläche umstellen (`registerType: 'prompt'`). Sonst kann ein automatischer Neustart mitten in der Arbeit stören. Die Gestaltung wird in MD geklärt.

### D-007 Speicher getrennt nach Basis-Pfad

`databaseName()` in `src/persistence/databaseName.ts` liefert `wandelbar:${BASE_URL}`.
**Grund:** Alle Projekte eines GitHub-Kontos liegen auf derselben Origin `<nutzer>.github.io`, auch Hauptversion und Vorschau. IndexedDB und localStorage werden pro Origin geteilt. Workbox trennt seine Caches schon selbst nach Scope.

### D-008 Veröffentlichung über den Branch `gh-pages`

Ein Workflow (`pages.yml`) mit zwei Jobs: Der Job „Prüfen“ läuft bei jedem Push und PR (Format, Lint, Typen, Unit- und E2E-Tests). Der Job „Veröffentlichen“ läuft nur nach erfolgreicher Prüfung bei Pushes auf `main` oder `milestone/**`. Das Skript `scripts/deploy-gh-pages.sh` schreibt den Build mit reinen git-Befehlen in die Wurzel oder nach `preview/` von `gh-pages`, ohne fremde Deploy-Action. Die Schreibvorgänge laufen nacheinander (`concurrency: gh-pages`).
**Grund:** Der offizielle Pages-Weg über ein Artefakt veröffentlicht immer die ganze Seite. Zwei Kanäle wären dann nur mit doppeltem Build möglich. Fremde Actions sind per Commit-SHA festgelegt.
**Folgen:** Branch-Konvention `milestone/*` (wird veröffentlicht) und `parallel/*` (nur geprüft), siehe `CLAUDE.md`.

### D-009 Playwright-Aufbau

Chromium nur als Headless-Shell (`--only-shell`, kleiner Download). Zwei Projekte: `desktop-chromium` und `pixel` (Pixel 7). Getestet wird immer der Produktions-Build über `vite preview` auf Port 4317. Keine Wiederholungen bei Fehlschlägen.
Der Datenschutz-Wächter ist eine automatische Fixture in `e2e/fixtures.ts`. Er gilt damit für jeden künftigen E2E-Test, nicht nur für den Datenschutz-Test. Fremde Anfragen werden per `context.route` abgebrochen, bevor sie das Netz erreichen. CSP-Verstöße meldet ein `securitypolicyviolation`-Listener. Zwei Gegenproben zeigen, dass der Wächter wirklich anschlägt. Sie nutzen `tracker.invalid` (RFC 2606, nie auflösbar).

### D-010 Lizenzhinweise im Build

`build.license` von Vite erzeugt `third-party-licenses.md` mit den Lizenztexten aller eingebündelten Pakete und veröffentlicht die Datei mit der App. Der Minifier entfernt die Lizenzkommentare aus dem Bundle. `THIRD_PARTY_LICENSES.md` im Repo ist die gepflegte Übersicht, auch für Inhalte und Werkzeuge.

### D-011 Bekannte npm-audit-Meldungen

`npm audit` meldet 15 Fundstellen (moderat oder niedrig) in `glob`, `minimatch` und `deepmerge`. Sie stecken ausschließlich in Build- und Lint-Werkzeugen (workbox-build, ESLint, typescript-eslint), nicht im ausgelieferten Code. Die „Korrektur“ per `--force` würde auf ältere Hauptversionen zurückstufen. Wir akzeptieren das und prüfen es bei Updates erneut.

### D-012 Vorläufiges Icon und Grundstile

Ein schlichtes Grundriss-Symbol (`public/favicon.svg`), die PNGs werden mit `scripts/generate-icons.ts` erzeugt. Die Grundstile verwenden Systemschrift und Systemfarben (`Canvas` und `CanvasText`) für Hell und Dunkel. Beides ist nur ein Platzhalter bis zum Design-System aus MD.

### D-013 Zeilenenden und Node-Version

`.gitattributes` erzwingt LF, passend zu Prettier, auch unter Windows. `.node-version` (26) steuert die Node-Version in CI.

## MD Designphase (2026-11-13)

### D-014 Entwürfe als reine HTML-Seiten mit gemeinsamer Grundlage

Die Designrichtungen liegen in `design/explorations/` als eigenständige HTML-Seiten ohne Build: je Richtung eine Seite und ein Stylesheet (`styles/`), dazu gemeinsame Teile in `shared/`. `dollhouse.js` zeichnet die Beispielwohnung „Lindenstraße 12“ als Puppenhaus in SVG (eigene Projektion, topologisch sortierte Quader). `explore.js` übernimmt die Bedienung: Auswahl, Karte am Möbel, Strg+K, Handy-Karte, hell/dunkel.
**Grund:** Alle drei Richtungen zeigen exakt dieselbe Wohnung und dieselben Abläufe. Unterschiede entstehen nur durch Gestaltung, das macht den Vergleich fair. Jede Seite trägt die CSP der App und kommt ohne Inline-Skripte und `style`-Attribute aus.
**Folgen:** Die Entwürfe gehören nicht zum App-Build. ESLint prüft `design/**/*.js` mit Browser-Globals.

### D-015 Statische Auslieferung der Entwürfe im Dev-Server

Das Plugin `wandelbar:design-explorations` in `vite.config.ts` (nur `serve`) liefert `/wandelbar/design/explorations/` als reine Dateien mit `Cache-Control: no-store` aus.
**Grund:** Vite transformierte die Seiten (gelockerte CSP) und lieferte über `<link>` eingebundenes CSS nach Änderungen teils veraltet aus. Jetzt gilt in den Entwürfen die strenge CSP, wie später in der App.

### D-016 Schriften für die Entwürfe

Albert Sans (A), Archivo (B), Fredoka und Nunito (C) liegen als lateinische WOFF2-Teilmengen in `design/explorations/fonts/`, zusammen 0,23 MB, alle OFL-1.1 (vom Nutzer freigegeben). Für die App wird die Schrift der gewählten Richtung später über @fontsource eingebunden.

### D-017 Lichtberechnung in den Entwürfen

`shared/dollhouse.js` berechnet das Licht aus einem vereinfachten Sonnenstand (Sommertag in Mitteldeutschland, Uhrzeit als Eingabe). Die Sonne fällt durch die Fenster der Außenwände: Jede Scheibe wird auf den Boden projiziert und am Raum abgeschnitten (Sutherland-Hodgman). Dazu kommen Lichtschein, ein zarter Tagesschatten mit ausgesparten Sonnenflächen, Lichtstrahlen und Staub. Abends gibt es Lampeninseln, Lichtkegel und einen Abendschleier. Das CSS einer Variante schaltet die Berechnung mit `--light-model: windows` ein, die Uhrzeit kommt aus `--sun-time` oder einem Regler mit `data-sun-time`. Ohne diese Angabe zeichnet das Skript die festen Sonnenflecken aus Runde 1.
**Grund:** Die Licht-Signatur sollte deutlicher und glaubwürdig werden, ohne Runde 1 zu verändern. In der App übernimmt das später three.js mit einem gerichteten Licht nach Sonnenstand. Dafür braucht der Grundriss eine Nordrichtung.

## MD Design-System (2026-11-13)

Die folgenden Punkte weichen von der „vorläufigen UI-Technik“ im Plan ab. Der Nutzer hat jede Wahl nach Begründung bestätigt.

### D-018 Icons: Lucide

`lucide-react` (ISC). Die Icons setzen `aria-hidden` selbst und fügen keine Stile ein. `src/ui/icons/icons.ts` benennt sie nach Aufgabe statt nach Bild (`icons.rotate`, `icons.saved` …). Fehlt ein Symbol, wird es mit `createLucideIcon` im selben Stil ergänzt (bisher `FloorPlan`).
**Grund:** großer, ruhiger Satz mit einheitlichem Strich, baumschüttelbar, CSP-verträglich.

### D-019 Schrift: Albert Sans über @fontsource

`@fontsource-variable/albert-sans` (OFL-1.1), nur die aufrechten Schnitte für Latein und Latein erweitert (`wght.css`, 32 + 23 KB). Schriftname `'Albert Sans Variable'`. Die Dateien werden mitgebaut, nie als `data:`-URL eingebettet. Den OFL-Text legt das Plugin `bundleFontLicenses` in `vite.config.ts` als `licenses/albert-sans-OFL.txt` in den Build, denn `build.license` erfasst über CSS eingebundene Pakete nicht.
**Grund:** selbst gehostet ohne Handarbeit, Updates über npm.

### D-020 Bausteine nativ mit eigenen Hooks statt Radix oder React Aria

Dialoge sind native `<dialog>`-Elemente mit `showModal`, Auswahlen native Radios und Checkboxen, dazu eigene Hooks (`useRovingFocus`, `useHotkeys`, `useTheme`, `useMediaQuery`).
**Grund (gemessen):** Radix-Dialog fügt über `react-remove-scroll-bar` und `react-style-singleton` `<style>`-Elemente ein, React Aria 1.22 ebenfalls (`usePress` bei jedem Knopf, `usePreventScroll` auf iOS). Beides verletzt die CSP ohne `style-src`. React Aria hätte außerdem +79 KB gzip gekostet (mit allem für später +162 KB) bei 74 KB für React selbst. Beim späteren Farbwähler wird neu entschieden. Zusage an den Nutzer: Zu jedem Baustein mit eigenem Verhalten gibt es Tastatur-Tests in `e2e/design-system.spec.ts`, denn axe findet Verhaltensfehler nicht.

### D-021 Stile: eigenes CSS mit Tokens und Ebenen

Kein Tailwind. `src/ui/styles/index.css` legt die Ebenen fest (`reset, fonts, tokens, base, components, page`). Hell und dunkel stehen per `light-dark()` in einer Zeile; `color-scheme` am Element entscheidet, so kann ein Bereich auch einzeln dunkel sein. Die Handy-Anordnung hängt per Container Query an der Breite der Bühne (bis 720 px), nicht am Fenster, dazu eine Zwischenstufe bis 1100 px. Klassen tragen das Präfix `wb-`, Zustände stehen in `data-*` und `aria-*`. Feste Farbwerte stehen nur in `tokens.css`; `src/ui/styles/tokens.test.ts` prüft alle CSS-Dateien unter `src/`.
**Grund:** volle Kontrolle bei strikter CSP, PC und Handy lassen sich nebeneinander zeigen.

### D-022 Bewegung: CSS und Web Animations API

Kein Motion (fügt bei `popLayout` und View-Transitions `<style>` ein). Dauern und Kurven kommen aus Tokens; bei reduzierter Bewegung sind alle Dauern 0 ms und die Bausteine überspringen ihre Animationen. Die Feder der Handy-Karte rechnet `src/ui/card/sheetPhysics.ts` Bild für Bild und spielt sie als lineare Keyframes ab.
**Grund:** CSP-verträglich, keine Abhängigkeit, eine Stelle für reduzierte Bewegung.

### D-023 Übersichtsseite `bausteine.html`

Zweiter Vite-Eintrag (`build.rollupOptions.input`) mit derselben CSP wie `index.html`, Code in `src/ui/showcase/`. Die Seite ist im Build und im Vorab-Cache, damit die E2E-Tests sie mit axe prüfen und der Nutzer sie über `/preview/bausteine.html` auch offline am Handy sieht. Die Szene darin ist eine schlichte Draufsicht mit vereinfachtem Sonnenstand (wie D-017); sie fällt weg, sobald das 3D steht.
**Grund:** Ein Ort, an dem jeder Baustein in allen Zuständen sichtbar und prüfbar ist.

### D-024 Kleinere Festlegungen im Design-System

- **Speicherstand ohne Wolke:** A4 zeigte eine Wolke. Die widerspricht „nur auf diesem Gerät“, deshalb jetzt Lucide `SaveCheck`.
- **Tastenkürzel beim Tippen:** Kürzel greifen in Eingabefeldern nur, wenn ein Baustein es ausdrücklich erlaubt (Strg+K für die Suche). So gehört Strg+Z im Feld dem Feld.
- **Handy-Karte eingeklappt:** Der Körper ist `inert`, weil er außerhalb des Bildschirms liegt (WCAG 2.4.11, verdeckter Fokus).
- **Zahlenfelder:** Eingaben mit Komma oder Punkt; eine Meldung erscheint erst beim Verlassen des Feldes oder mit Enter und sagt, was zu tun ist.
- **Zahlenfelder übernehmen erst mit Enter oder beim Verlassen** (vom Nutzer nach dem Code-Review so entschieden): keine Zwischengrößen beim Tippen (94 → 2 → 22 → 228 cm) und ein Rückgängig-Schritt pro Eingabe. **Nichts wird gerundet** (ebenfalls Nutzerwunsch): Angezeigt und gespeichert wird genau der getippte Wert. Angezeigt werden bis zu sechs Nachkommastellen (`INPUT_DECIMALS`), damit Rauschen aus der Gleitkommarechnung nicht zu sehen ist.
- **Maße: Einheit in der Überschrift** (Nutzerentscheidung): „Maße in cm“ statt „cm“ in jedem der drei Felder. Am PC wird jedes Feld innen 40 → 62 px breit, Platz für ungerundete Werte bis „1.999,25“. Bildschirmleser hören weiter „Breite in cm“.
