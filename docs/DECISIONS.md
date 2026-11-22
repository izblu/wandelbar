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

## MD Klickbarer Prototyp (2026-11-14)

### D-025 Der Prototyp ist die App

Der klickbare Prototyp der Kernabläufe ersetzt den M0-Platzhalter unter `index.html` (Nutzerentscheidung). Gerüst, Schritte, Kamera und Gesten liegen in `src/app/` und bleiben; alles Gespielte (Beispielwohnung, Erkennung, Draufsicht, Puppenhaus, Papierplan) liegt getrennt in `src/app/prototype/` und fällt mit M1 bis M3 weg. Ein Hinweis unten links sagt „Prototyp: Änderungen werden nicht gespeichert“ statt des Speicherstands.
**Grund:** Die Bedienung wird an der echten Bühne erprobt und muss später nicht umziehen.

### D-026 Zoom-Tasten Plus, Minus und 0 ohne Strg

Stufenloser Zoom von 25 bis 800 % der eingepassten Größe; Knöpfe und Tasten zoomen um ×1,25, 0 passt ein. Die Tasten wirken ohne Strg und nicht in Eingabefeldern oder offenen Dialogen.
**Grund:** Strg+Plus bleibt der Zoom des Browsers, den Menschen mit Sehschwäche brauchen (WCAG 1.4.4). Abweichung vom Plan, bei der Vorführung genannt.

### D-027 Projektmenü als natives Popover

Marke und Wohnungsname öffnen ein Menü mit dem HTML-Attribut `popover` (`popovertarget`). Esc und Tippen daneben schließen es ohne eigenen Code; die Einblendung läuft per CSS (`@starting-style`).
**Grund:** wie D-020: keine Bibliothek, CSP-verträglich, Barrierefreiheit vom Browser.

### D-028 Puppenhaus und Papierplan als SVG-Platzhalter

Das Puppenhaus ist eine schräge Parallelprojektion in SVG (`src/app/prototype/dollhouse.ts`, `DollhouseScene.tsx`): Wände bei 1,15 m abgeschnitten und in 0,6-m-Stücke geteilt; Seiten und Kappen der Wände bekommen einen Rand in eigener Farbe, damit keine Nähte sichtbar sind. Die Reihenfolge beim Malen vergleicht je zwei Teile, die sich auf dem Bildschirm überdecken können (`compareForPaint`): Flaches zuerst, wer ganz über dem anderen liegt zuletzt (Kissen auf dem Bett), sonst entscheidet eine trennende senkrechte Ebene, wer vorn steht (Satz der trennenden Achsen, bis 5 cm Überlappung gilt als Berührung). Daraus wird topologisch sortiert; nur bei sich durchdringenden Teilen (Wandecken) entscheidet die Tiefe der Mitte. Die frühere Sortierung allein nach der Mitte ließ beim Drehen Kissen verschwinden und Tischkanten unter Stühlen auftauchen (Feedback des Nutzers). Abends wird nur das Modell per CSS-Filter dunkler, nicht die ganze Bühne, damit Texte darauf lesbar bleiben. Drehen per Ziehen: Das Modell folgt der Hand, nach unten ziehen zeigt mehr von oben, wie später bei three.js (`OrbitControls`). Kamera und Zoom sind reine Rechnung in `src/app/viewport.ts`. Schatten und Unschärfe, die nicht mitskalieren sollen, stehen in Bildschirmpixeln (CSS-Filter wirken in SVG im lokalen Maßstab, also in Metern).
**Grund:** zeigt Ablauf und Licht ohne das 3D aus M3; die Bedienung darüber bleibt.

### D-029 Farben von Wänden, Böden und Papier als Tokens

Wandfarben (`--paint-*`), Böden (`--floor-*`), Papier (`--paper*`) und Szenenfarben stehen in `tokens.css` mit hellem und dunklem Wert; die Daten verweisen per `var(--…)` darauf. Der hochgeladene Plan bleibt auch im dunklen Design Papier; die Erkennung zeichnet darauf mit festen Palettenfarben (Fjordblau, Sonne), weil das Papier immer hell ist.
**Grund:** Der Farbwert-Test (D-021) gilt weiter, hell und dunkel stimmen überall.

### D-030 Kleinere Festlegungen im Prototyp

- **`parseHit` in `src/app/hits.ts`:** Dateien mit Komponenten exportieren nur Komponenten (Fast Refresh).
- **Befehle der Suche ohne `useMemo`:** Die Liste wird bei jedem Rendern neu gebaut; das Filtern über gut 40 Einträge ist billig, und der React Compiler konnte die Memoisierung mit dem Zoom-Ref nicht erhalten.
- **Lichtbefehle aus der Suche** wechseln nach Erleben, wenn der aktuelle Schritt kein Licht zeigt.
- **Handy, Schritt Bauen:** Die Werkzeugpalette hat acht Knöpfe und wird unter 440 px Breite 40 statt 46 px groß, damit sie auf die Bühne passt (Ziel weiter über 24 px, WCAG 2.5.8).

### D-031 Puppenhaus: Drehpunkt und Werkzeug Verschieben

- **Drehpunkt** (Nutzerentscheidung): Gedreht und geneigt wird um die Mitte des sichtbaren Teils der Wohnung, gemessen auf dem Boden innerhalb der freien Fläche (`visibleCenter`). Dieser Punkt bleibt beim Drehen an seiner Stelle auf dem Bildschirm (`orbitDollhouseAround`) und gilt für eine ganze Geste. Im Überblick ist das die Mitte der Wohnung, herangezoomt der Teil vor dem Betrachter. Bisher war es die Bildmitte; nach dem Zoomen zum Zeiger hin lag die oft neben der Wohnung, und die Wohnung kreiste beim Drehen aus dem Bild (Feedback des Nutzers).
- **Sperre:** Die Bildmitte bleibt immer über dem Umriss der Wohnung (`keepOverApartment`). Am Rand gleitet die Ansicht an der Kante entlang. So geht die Wohnung nie ganz verloren, auch am Handy ohne Knopf „Einpassen“.
- **Werkzeug „Verschieben“** (Nutzerentscheidung): Hand (Lucide `Hand`, Icon `pan`), Taste H, in Erleben nach „Umsehen“ und in Einrichten nach „Auswählen“. Ziehen verschiebt dann überall, auch über Möbeln; Antippen wählt weiter aus, ein gewähltes Möbel bleibt gewählt. Pfeiltasten verschieben, solange kein Möbel gewählt ist. Der Zeiger zeigt Kreuzpfeile (`cursor: move`), damit man Verschieben vom Drehen (Hand) unterscheidet.
- **Kürzel wie bei `OrbitControls`:** rechte oder mittlere Maustaste, Strg oder Umschalt beim Ziehen verschieben; ein Finger dreht, zwei Finger verschieben und zoomen. Dazu Leertaste halten (wie die Hand in Grafikprogrammen; nicht, solange ein Knopf, Feld oder Regler den Fokus hat) und Umschalt + Pfeiltasten. Das Kontextmenü ist auf der Bühne aus. Mit gewähltem Möbel bewegen die Pfeiltasten im Puppenhaus jetzt das Möbel, wie in der Draufsicht, statt die Ansicht zu drehen.
- **Touchpad:** Wischen mit zwei Fingern zoomt weiter, wie bei Google Maps. Der Browser kann Touchpad und Mausrad nicht sicher unterscheiden; ein falsch erkanntes Mausrad würde sonst verschieben statt zoomen.
- **Technik:** Drehung und Mitte liegen in zwei Zuständen; `useDollhouseCamera` führt beide in einem Ref nach (`live`), damit mehrere Zeigerbewegungen vor dem nächsten Bild aufeinander aufbauen. Der Zeiger für das Verschieben hängt als `data-grab` an der Szene und wird von der Ansicht (`SceneViews`) gesetzt, nicht von der SVG-Szene, die in M3 wegfällt.
- **Für M3:** `OrbitControls` dreht nur um sein `target` in der Bildmitte. Für den Drehpunkt braucht es eine kleine Ergänzung: Zu Beginn einer Geste den Punkt bestimmen und Kamera samt `target` um ihn drehen. Alternativ bietet die Bibliothek camera-controls (MIT) mit `setOrbitPoint` genau das. Die Sperre entspricht `target.clamp()`.

**Grund:** Der Drehpunkt behebt die Ursache, ohne dass man etwas lernen muss. Das Werkzeug macht Verschieben für Laien auffindbar und funktioniert mit Maus, Touchpad, Finger und Tastatur. Die Kürzel entsprechen dem, was Geübte von 3D-Programmen kennen.

**Nachtrag (2026-11-18, Nutzerentscheidung):** Drehpunkt und Sperre bissen sich. Saß die Bildmitte nach dem Herauszoomen am Rand fest, klemmte die Sperre sie beim Drehen, und der Drehpunkt wanderte (im E2E-Test 71 px). Jetzt gilt:

- **Drehen und Neigen** ohne Sperre. Der Drehpunkt bleibt genau stehen; weil er in der Wohnung liegt, geht sie dabei nicht verloren.
- **Verschieben und Zoomen** mit `keepNearApartment` (`viewport.ts`) statt `keepOverApartment`. Die Sperre springt nicht zurück: Liegt die Bildmitte nach einer Drehung neben der Wohnung, ist jede Bewegung erlaubt, die sie nicht weiter wegbringt; sonst gleitet sie am Rand des erlaubten Bereichs entlang (Grenzen um den bisherigen Abstand erweitert, Ecken gerundet). Liegt sie über der Wohnung, gleitet sie wie bisher an der Kante.
- **Maß:** Abstand auf dem Boden mal Zoom, also wie auf dem Bildschirm. Heranzoomen neben der Wohnung zieht die Ansicht deshalb anteilig zu ihr hin, statt sie aus dem Bild zu schieben; so geht sie auch am Handy ohne „Einpassen“ nie verloren.
- `keepOverApartment` bleibt als strenge Fassung bestehen. Für M3: beim Drehen kein `target.clamp()`, beim Verschieben und Zoomen dieselbe Regel.

### D-032 Puppenhaus: Licht im ganzen Raum (Lampen, Tageslicht, Sonne)

Feedback des Nutzers (drei Runden): Der Schein der Stehlampen fiel je nach Blickwinkel durch oder über die Wände in andere Räume, und die Sonne fehlte auf Teppichen. Nach einer ersten Korrektur mit Maske wirkte das Licht noch unnatürlich: Es lag nur auf dem Boden, zog harte Kanten über das Sofa, und die hintere Lampe sah aus wie aus. Licht soll alles im Raum aufhellen, auch Möbel und Wände. Nach der Freigabe des Lampenlichts: Die Sonne soll sich genauso verhalten. Was sie trifft, wird hell; was kein Sonnenlicht bekommt, bleibt dunkler, damit man dunkle Ecken sieht. Lampenlicht, Tageslicht und Sonne sind am 2026-11-16 vom Nutzer freigegeben.

Das Licht steht in `dollhouseLight.ts` (`sceneLight`), das Modell in `dollhouse.ts`.

- **Lampenlicht:** Jede Lampe ist ein Punktlicht in der Mitte ihres Schirms. Sie hellt jede Fläche ihres Raums auf, die ihr zugewandt ist: Boden, Teppiche, Möbel, die Innenseiten der Wände. Auf jeder Ebene ergibt das einen Kreis um den Fußpunkt der Lampe; die Parallelprojektion ist affin, deshalb ist er auf dem Bildschirm genau eine Ellipse, gezeichnet als `radialGradient` mit `gradientTransform` (ein Fleck je Lampe und Ebene, Wandstücke einer Seite teilen ihn). Die Helligkeit fällt mit der Entfernung weich auf null (Reichweite 2,5 m), schräg getroffene Flächen bekommen weniger (Lambert, gemildert), und der Schirm lenkt das Licht nach unten: Seitlich kommt die Hälfte an. Die Deckkraft je Stufe steht am Verlauf (`stop-opacity`), die Farbe als Token (`--scene-lamp`). Am Abend leuchtet der Schirm selbst.
- **Verdeckung:** Das Licht liegt in eigenen Ebenen über dem Modell. Sie werden in derselben Malreihenfolge gezeichnet wie das Modell, und jede Fläche deckt zuerst schwarz ab, was vor ihr gemalt wurde; Schwarz ändert in beiden Füllmodi nichts. So verdecken Wände, Kappen und Möbel das Licht dahinter in jedem Winkel genau wie im Modell, ohne Maske und ohne Zuschnitt auf den Bodenumriss (der machte die Kanten). Welche Fläche zu welchem Raum gehört, sagt `Face.room` (Möbel nach ihrer Mitte, Wandseiten je 0,6-m-Stück nach der Seite, Kappen, Laibungen und Glas gehören keinem Raum). Glas verdeckt wie gezeichnet zu 55 %. Lampen außerhalb aller Räume leuchten nicht.
- **Innen am Tag dunkler:** Mit Tageszeit ist am Tag alles Innere um 30 % dunkler (`INDOOR_SHADE`, Mischung mit `--scene-indoor` in `srgb`): Böden, Teppiche, Möbel, Innenseiten und Laibungen der Wände. Fassaden und Wandkappen bleiben hell. Zum Abend hin geht die Abdunklung zurück; am Abend gilt wie bisher nur der Filter auf `app-dh-model`, das freigegebene Lampenlicht bleibt unverändert. Im Planungslicht (ohne Tageszeit) bleibt alles wie gezeichnet.
- **Tageslicht:** Jedes Fenster einer Außenwand gibt Himmelslicht, gerechnet wie eine Lampe, die 1 m vor der Scheibe draußen sitzt (Reichweite 6,5 m, kleine Fenster schwächer). Es fällt schräg in den Raum, nimmt zur Tiefe hin ab und trifft die Fensterwand innen nicht. Es liegt in einer eigenen Ebene im Füllmodus `color-dodge` (`app-daylight`) mit weißem Licht (`--scene-daylight`) über schwarzem Grund: So hebt es die abgedunkelten Farben wieder an, ohne sie wie `screen` auszubleichen. Am Fenster erreichen Flächen knapp ihre eigentliche Farbe; was weit weg liegt oder dem Fenster abgewandt ist, bleibt dunkler. Räume ohne Fenster (Flur) bleiben am Tag dunkel.
- **Sonne:** Die Sonne fällt als Strahl durch jedes Außenfenster, vor dem sie steht (`exteriorWindows` in `geometry.ts`, gleiche Regeln wie `sunPatches`). Für jede Fläche, die zur Sonne zeigt, wird die Fensteröffnung entlang der Lichtrichtung auf ihre Ebene projiziert und mit der Fläche geschnitten (Sutherland-Hodgman). So liegt die Sonne auf Boden, Teppichen, Möbeln und Wänden, mit der Helligkeit nach dem Einfallswinkel. Möbel im Strahl werfen Schatten: Ihr Quader wird auf die Ebene projiziert (konvexe Hülle), und Schwarz nimmt dort nur die Sonne weg, weil die Schatten direkt nach der Sonne der Fläche und vor ihrem übrigen Licht gemalt werden. Auf Böden bekommt die Sonne weiche Kanten (5 cm), auf Möbeln und Wänden bleibt sie scharf. Sonne und Lampen teilen sich die Ebene im Füllmodus `screen` (`app-glow`). Die Sonne blendet zwischen 3° und 9° Sonnenhöhe ein.
- **Auswahlrand:** Über dem Rand des gewählten Möbels liegt in jeder Lichtebene ein schwarzer Strich (`app-light-keep`). So überstrahlt kein Licht den Rand, auch nicht auf einem Teppich in der Sonne; die Wiederholung `app-dh-outline` fällt weg.
- **Draufsicht:** unverändert, mit Sonnenflecken auf dem Boden (Teppiche liegen darunter). Von oben sieht man nur Böden und Oberseiten.
- **Farbwerte** in `tokens.css`: `--scene-light-block`, `--scene-indoor` (beide Schwarz, keine sichtbare Farbe) und `--scene-daylight` (Weiß). Der Farbwert-Test aus D-021 gilt.
- **Aufwand:** Nur Flächen über bereits beleuchteten kommen als Abdeckung in die Ebenen. Licht unter 3 % Stärke wird nicht gezeichnet. Beispielwohnung, ganze Wohnung bei 1440 × 900: am Tag rund 150 Verläufe und 620 Polygone, Modell 3,4 ms. Rechnen, React und Layout eines Bildes: am Tag 15–16 ms, in der Dämmerung (beide Ebenen) 22–23 ms, nachts 7 ms (Entwicklungsmodus, Median).

**Grund:** Behebt die Ursache und kommt echtem Licht so nah, wie es eine flache Zeichnung erlaubt. Schatten wirft nur die Sonne; für Lampen und Himmelslicht ersetzt die Raumgrenze sie. Im echten 3D (M3) übernehmen Lichtquellen, Schatten und Tiefenpuffer diese Arbeit; dann fallen die Lichtebenen weg. Die Rechnung je Lichtquelle ist schon so geschnitten, dass sich später eine Farbe je Lampe einsetzen lässt (Wunsch des Nutzers, siehe STATUS).

### D-033 Tests des Prototyps

Die Test-Session (2026-11-18) hat Unit- und E2E-Tests für den Prototyp geschrieben. Dabei gilt:

- **Malreihenfolge im Puppenhaus wird an dem gemessen, was man sieht,** nicht an einer festen Reihenfolge. Für je zwei Flächen, die sich auf dem Bildschirm überdecken (über 2 px²), rechnet der Test am Schwerpunkt der Überdeckung zurück, wie hoch jede Fläche auf dem Sehstrahl liegt; die vordere muss zuletzt gemalt sein (`dollhouse.test.ts`). Teile, die sich nicht überdecken, dürfen in beliebiger Reihenfolge stehen. Wand an Wand ist ausgenommen, weil sich Wände an Ecken und Stößen durchdringen (D-028).
- **Stühle am Esstisch:** Die Sitzfläche reichte bis unter die Lehne; die beiden Quader durchdrangen sich, und in manchen Winkeln lag ein Streifen der Sitzfläche (4 bis 12 px²) über der Lehne. Der Sitz endet jetzt an der Lehne (`furnitureParts`, Fall `dining`). Sichtbar ändert sich nur, dass der Streifen fehlt.
- **E2E-Hilfen** stehen in `e2e/app.ts`; `test` und `expect` kommen weiter aus `e2e/fixtures.ts`. Die Einführung gilt per Init-Skript im localStorage als gesehen, außer im Test, der sie prüft.
- **Selektoren:** Rollen und Namen, wo es sie gibt; `data-hit` für antippbare Teile der Szene. Für Teile der SVG-Zeichnung ohne eigene Bedeutung (Böden `.app-dh-floor`, Lichtebenen `.app-light-*`, Sonnenflecken auf dem Papier) nimmt der Test die Klasse. Diese Selektoren fallen mit dem 3D in M3 weg.
- **Kamera im E2E:** gemessen wird der Umriss aller Böden auf dem Bildschirm. Sein Mittelpunkt ist das Abbild der Wohnungsmitte, weil der Innenraum ein Rechteck ist; so lässt sich prüfen, dass die Wohnung beim Drehen stehen bleibt und beim Verschieben genau der Hand folgt.
- **Handy im E2E:** Das Mausrad zoomt dort schwächer (die Pixeldichte des Pixel 7 teilt die Schritte), der Test dreht deshalb so lange, bis die Wohnung klein genug ist. Aufgeklappte Handy-Karten liegen über der Werkzeugleiste und werden vorher eingeklappt, wie es ein Mensch auch täte.
- **Reine Funktionen aus Komponenten gezogen (Tests der Review-Korrekturen, 2026-11-21):** `nextFurnitureId` (vorher `nextId` in `FurnishStep.tsx`) steht jetzt in `prototype/apartment.ts`, die Messstrecke `referenceLine` (vorher in `PlanStep.tsx`) in `prototype/geometry.ts`, Länge in Metern. So lassen sie sich ohne React prüfen; ein Export aus der Komponentendatei verletzte `react-refresh/only-export-components`. Das Verhalten ist gleich. Der Kennungs-Test lädt `apartment.ts` mit `vi.resetModules()` frisch, denn der Zähler läuft über die ganze Sitzung: Ohne frischen Start wäre die Kennung des ersten Nachttischs nur zufällig frei gewesen, und der Test hätte den alten Fehler nicht gefunden.
- **Gegenprobe:** Ein Test für eine Korrektur gilt erst, wenn er bei zurückgedrehter Korrektur scheitert. Die Test-Session dreht dafür die Korrektur kurz zurück und stellt den Code danach wieder her.

**Grund:** Tests prüfen Verhalten, nicht Umsetzung. Eine feste Reihenfolge hätte unsichtbare Unterschiede als Fehler gemeldet; die Messung am Bild fand dagegen den echten Fehler am Stuhl und wird auch mit dem 3D in M3 als Vorlage taugen.

### D-034 Tastenkürzel geben ungenutzte Tasten frei (Code-Review des Prototyps)

Das Code-Review vom 2026-11-18 fand, dass die Pfeil-Kürzel in Einrichten die Pfeiltasten auch dann sperrten, wenn kein Möbel gewählt war: Tageszeit-Regler und Farbfelder ließen sich nicht mehr mit der Tastatur bedienen, und Esc schloss das Projektmenü nicht. Seitdem gilt in `useHotkeys`:

- **Rückgabe `false`:** Hat ein Handler nichts zu tun, gibt er `false` zurück; dann bleibt die Taste dem Element mit dem Fokus und dem Browser. Nur behandelte Tasten bekommen `preventDefault()`. Handler ohne Rückgabe gelten wie bisher als erledigt.
- **Pfeiltasten, Pos1, Ende und Bild gehören Reglern und Radios** (`input[type="range"]`, `input[type="radio"]`), auch wenn ein Kürzel dieselbe Taste nutzt.
- **Kürzel ohne Strg ruhen, solange ein Menü (Popover) offen ist,** wie bisher bei modalen Dialogen. So schließt Esc das Menü, bevor es etwa die Auswahl aufhebt.
- **Maßstab:** `rescaleApartment` schreibt `Apartment.scale` fort; Messstrecke und Startwert beim Nachmessen kommen daraus. Vorher ging ein erneutes Nachmessen vom erkannten Maß aus und streckte doppelt.
- **E2E:** Der Speicherschlüssel der Einführung kommt aus `storageKey()`. Dafür kennt `tsconfig.node.json` die Typen `vite/client` (`import.meta.env` in `storageKey.ts`; zur Laufzeit wird es mit festem Basis-Pfad nicht gelesen).
- **Schritt je Wohnung (Nutzerentscheidung 2026-11-19):** Jede Wohnung merkt sich ihren zuletzt geöffneten Schritt (`Project.step`, Aktion `open` statt `reach`; sie hebt auch den weitesten erreichten Schritt an). Ein Wechsel der Wohnung führt dorthin zurück, bei der eigenen wie bei der Beispielwohnung; nur der Start der App liegt in Erleben. Vorher behielt die eigene Wohnung den Schritt der Beispielwohnung (leere Bühne in Erleben ohne Grundriss), und die Beispielwohnung öffnete über `goTo('experience')`, das noch die Wohnung vor dem Wechsel prüfte: Aus einer eigenen Wohnung ohne Grundriss kam fälschlich „Lade zuerst einen Grundriss …“.
- **Pfeiltasten im Puppenhaus nach Bildschirmrichtung (Nutzerentscheidung 2026-11-19):** Ein gewähltes Möbel wandert mit Pfeil rechts immer nach rechts im Bild, auch wenn das Puppenhaus gedreht ist; Schritt 5 cm, mit Umschalt 50 cm auf dem Boden (`screenStepOnFloor` in `viewport.ts`). Vorher schoben die Pfeile in Richtung der Wohnung; um 180° gedreht lief das Sofa mit Pfeil rechts nach links. Das erfüllt D-031 („wie in der Draufsicht“); die Draufsicht selbst ist unverändert.
- **Ein Rückgängig-Schritt pro Feld (Nutzerentscheidung 2026-11-19):** Aufeinanderfolgende Änderungen am selben Feld laufen zu einem Schritt zusammen; die Vorschau bleibt dabei live. `edit(update, merge)` nimmt einen Feldschlüssel, `Project.merging` merkt sich das Feld der letzten Änderung. Folgt eine Änderung mit demselben Schlüssel, ersetzt sie nur den Stand, ohne einen neuen Schritt anzulegen. Jede andere Änderung, Rückgängig und Wiederholen beenden das Zusammenfassen. Genutzt für den Raumnamen (`room-name:<id>`) und für Norden (`north`, Kompass und Regler sind ein Feld). Vorher war jeder Tastendruck und jede 5°-Stufe ein eigener Schritt: Lange Namen drängten ältere Änderungen aus dem Verlauf (60). Zahlenfelder brauchen das nicht, sie übernehmen erst mit Enter oder beim Verlassen.
- **Raumname ist ein Pflichtfeld (Nutzerentscheidung 2026-11-19):** `TextField` kennt `requiredMessage`. Ein leerer Wert wird nie übernommen: Solange das Feld leer ist, bleibt der Name von vor der Eingabe stehen (Plan und Karte zeigen ihn weiter, auch nach Löschen Zeichen für Zeichen). Das Feld bleibt leer und rot umrandet, darunter steht „Pflichtfeld: Gib dem Raum einen Namen.“, wie bei Zahlenfeldern erst mit Enter oder beim Verlassen. Mit dem ersten Zeichen verschwindet die Meldung. Nutzerwunsch: Ohne Hinweis sähe ein zurückspringender oder fehlender Name wie ein Fehler der App aus. Ändert sich der Wert von außen (Rückgängig, anderer Raum), gilt das leere Feld nicht mehr; das Namensfeld ist zusätzlich je Raum eigen (`key`).
- **Fokus nach dem Katalog (Nutzerentscheidung 2026-11-19, WCAG 2.4.3):** Schließt man den Möbelkatalog mit Esc oder X, kehrt der Fokus auf das Werkzeug „Möbel“ zurück (`FurnishStep`, `onClose`); vorher lag er auf `body`, Tab begann wieder oben auf der Seite. Nach dem Hinzufügen bleibt er bewusst ohne Ziel: Dann ist das neue Möbel gewählt, und die Pfeiltasten verschieben es sofort (`nudgeAllowed` lässt `body` zu). Auf einem Werkzeug wanderten sie durch die Leiste.
- **Raum im Hinweis mit Artikel (Nutzerentscheidung 2026-11-19):** Der Hinweis nach dem Hinzufügen heißt „… steht jetzt in der Küche“ bzw. „im Bad“ (vorher immer „im“, also „im Küche“). `inRoom` in `units.ts` nutzt dieselbe Endungsregel wie `toRoom` („zur Küche“, „zum Bad“ an Türen), beide aus `FEMININE_ROOM`. Grenze wie bisher: Namen außerhalb der Regel (etwa „Loggia“) bekommen „im“. Der zweite Satz heißt „Zieh das Möbel an seinen Platz.“ (vorher „Zieh es …“, falsch bei Sessel, Tisch, Lampe); so passt er zu jedem Möbel ohne Regel nach Geschlecht.

**Grund:** Behebt die Ursache für alle Kürzel statt nur für die Pfeiltasten in Einrichten; ein Kürzel nimmt einem Element nie mehr eine Taste weg, die es selbst braucht (WCAG 2.1.1).

## MD Abschluss (2026-11-22)

### D-035 Service Worker: Vorschau auch ohne Schrägstrich ausgenommen

Bei der Abnahme zeigte das Handy unter `…/wandelbar/preview` die Platzhalter-Seite der Hauptversion. Ursache: Der Service Worker der Hauptversion (Bereich `/wandelbar/`) nahm nur `/wandelbar/preview/` mit Schrägstrich von seinem Navigations-Fallback aus; ohne Schrägstrich lieferte er seine eigene `index.html` aus. Im Browser nachgestellt. Die Regel in `navigateFallbackDenylist` heißt jetzt `^/wandelbar/preview(?:[/?]|$)`: mit und ohne Schrägstrich, auch mit Suchanfrage, aber nicht `/wandelbar/preview-…`. Ein E2E-Test in `offline.spec.ts` prüft alle drei Schreibweisen und als Gegenprobe einen anderen Pfad; mit der alten Regel schlägt er an.
**Folgen:** Wirkt erst, wenn `main` neu veröffentlicht ist; bis dahin `/wandelbar/preview/` mit Schrägstrich öffnen. Die Adresse ohne Schrägstrich liegt nie im Bereich des Service Workers der Vorschau (`/wandelbar/preview/`), sondern immer in dem der Hauptversion.

### D-036 Bedienkonzept: Auswahl, Ziehen und Ansicht (Nutzerentscheidung)

Zwei Funde der Abnahme: Am Handy verschob man ein Möbel, wenn man beim Drehen des Puppenhauses auf ihm ansetzte, denn Ziehen griff jedes Möbel, auch ein nicht gewähltes. Am PC verdeckte die Karte beim Ziehen die Sicht. Der Nutzer wollte die Steuerung grundsätzlich klären und hat in vier Fragen entschieden (Konzept in `docs/PLAN.md` unter „Bedienkonzept“):

1. **Erst wählen, dann ziehen** statt „Halten zum Greifen“ oder direktem Greifen wie bisher.
2. **Die Karte blendet sich beim Ziehen aus** statt einer kleinen Leiste am Objekt oder einer festen Seitenleiste.
3. **Werkzeug- und Ansichtsleiste getrennt** statt nur neuer Namen. „Verschieben“ las sich in Einrichten als „Möbel verschieben“.
4. **Auswählen und Flächen bleiben getrennte Werkzeuge**, in Flächen sind Möbel für den Tipp durchlässig, statt alles mit Auswählen zu wählen.

**Grund:** Eine Regel für alle Eingaben, die sich in einem Satz erklären lässt, ohne versteckte Gesten. Im echten 3D liegen Wände und Böden überall; ein Tipp zum Abwählen darf dort keine Karte öffnen.
**Folgen:** Aus D-031 wandert das Werkzeug Verschieben aus der Palette als Schalter „Ansicht verschieben“ in die Ansichtsleiste; die übrigen Wege zum Verschieben (rechte oder mittlere Taste, Strg, Umschalt, Leertaste, zwei Finger) bleiben. Umsetzung in M2, M3, M4 und M5b, der Prototyp bleibt bis dahin unverändert. Die kleine Leiste statt der Karte lässt sich in M4 oder M5b neu prüfen, wenn die Karten mit Tapeten und Materialien voller werden.
