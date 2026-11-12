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
