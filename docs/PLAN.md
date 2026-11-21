# Wandelbar – Umsetzungsplan

## Kontext

**Wandelbar** ist eine Web-App, die aus einem hochgeladenen Grundriss (Bild oder PDF vom Makler) ein maßstabsgetreues 3D-Modell einer Wohnung erzeugt. Darin richtest du ein (Möbel, Böden, Wände, Farben, Tapeten), vergleichst Varianten und bewegst dich frei.

- **Nutzer:** du, Familie und Freunde, ohne Technikkenntnisse.
- **Anspruch:** Design und Bedienung auf Award-Niveau.
- **Harte Randbedingungen:** keine Daten an Dritte, alles offline nutzbar. Hauptplattformen Windows und Android; iOS nach bestem Bemühen. Fokus auf **Wohnungen auf einer Etage**.

Der Projektordner `Room Planer 3D` ist leer (Neuentwicklung) und wird zu `Wandelbar`.

**Vorhandene Werkzeuge:**
- git
- gh (angemeldet)
- Python 3.14 unter `C:\Users\Guenay\AppData\Local\Programs\Python\Python314`, startbar über `py`
- **Node.js fehlt.**

## Produktumfang Version 1

- **Grundriss zu 3D:**
  - Bild- oder PDF-Upload, automatischer Vorschlag, Korrektur im 2D-Editor.
  - Maßstab per Texterkennungs-Vorschlag oder Referenzstrecke, mit m²-Plausibilitätsprüfung.
  - Bauteile: Wände, Türen, Fenster, Raumhöhe pro Raum.
  - Die Erkennung ist austauschbar: zuerst klassisch (OpenCV + Tesseract) plus Vektor-PDF-Auswertung, danach CubiCasa5k-KI (ONNX).
- **Navigation:**
  - Puppenhaus (Wände und Decke werden automatisch ausgeblendet)
  - Ego-Perspektive mit Kollision (Joystick auf dem Handy)
  - Flugkamera
  - 2D-Draufsicht
- **Licht und Grafik:**
  - Echtzeit-Grafik mit automatischen Qualitätsstufen.
  - **Lichtmodus umschaltbar:** *Planungslicht* (gleichmäßig, ohne Schatten, Standard beim Einrichten), *Tageslicht* und *Abend* (Lampen leuchten).
  - Jede Lampe lässt sich einzeln ein- und ausschalten, Schatten separat.
  - Fotorealistische Standbilder per Pathtracing (PC).
- **Oberflächen:**
  - Eine Wandseite lässt sich frei in Bereiche aufteilen, **in der Höhe** (Fliesenspiegel, Sockel) und **in der Breite** (z. B. nur links vom Fenster).
  - Böden und Decken pro Raum.
  - Materialbibliothek (CC0), eigene Fotos als Textur mit realer Kachelgröße, freier Farbwähler.
  - **Tapete:** echte Bahnbreite, Rapport, Ansatz (gerade oder versetzt). Anbringen bahnenweise ab einem gewählten Startpunkt oder auf eine Teilfläche; die Nähte sind optional sichtbar. Der Rollenbedarf erscheint in der Einkaufsliste.
- **Möbel:**
  - Import von GLB, OBJ und FBX mit Maßprüfung und Materialien pro Teil
  - Platzhalter aus Maßen
  - parametrische Bibliothek plus wenige CC0-Modelle
  - eigene Möbelsammlung über Projekte hinweg
- **Platzieren:** Ziehen, Drehen mit Einrasten, Einrasten an Wänden und Möbeln, Kollisionswarnung, Abstände, Rückgängig. Dazu Stapeln, Wand- und Deckenmontage, Maßband, Bewegungsflächen, Einkaufsliste pro Variante.
- **Varianten:** auf gemeinsamem Bau, Vergleich nebeneinander, Vorher/Nachher-Schieber.
- **Exporte:** Projektdatei `.wandelbar`, Screenshots, 2D-Plan mit Maßen (PNG/PDF), Einkaufsliste (CSV/PDF), GLB, Render-Bilder.
- **Offline-Status-Seite:**
  - Pro Modul: Status, Größe und die Knöpfe **„Laden“** und **„Entfernen“**. Entfernbar sind HD-Texturen und KI-Modelle; der Kern bleibt immer.
  - Schalter „Basis-Pakete automatisch vorladen“.
  - Anzeige des belegten Speichers (`navigator.storage.estimate()`).
- **Optionaler letzter Meilenstein:** AR auf Android (WebXR); iOS wird probiert.
- **Später (Backlog):**
  - **Garten mit Terrasse**
  - Foto-zu-3D-KI (nur PC)
  - Supabase-Sync (opt-in, Ende-zu-Ende-verschlüsselt)
  - Video-Rundgang
  - Etagen, Dachschrägen, schräge und runde Wände (nur bei Bedarf; Version 1 hat bewusst keine Vorbereitung dafür)

## Design und Bedienung

**Designphase MD, vor den Funktionen:**
1. **Runde 1:** drei Richtungen, gezeigt jeweils am Bildschirm „Einrichten“ für PC und Handy:
   - *ruhig, hell und wohnlich*
   - *mutig und editorial*
   - *verspielt und farbig*

   Du wählst eine Richtung oder eine Mischung.
2. **Runde 2:** 2–3 Verfeinerungen des Gewinners (Farben, Schrift, Details).
3. **Design-System:** Tokens als CSS-Variablen (Farben, Typografie, Abstände, Radien, Schatten, Bewegung), Icons und Bausteine.
4. **Klickbarer Prototyp** der Kernabläufe auf PC und Handy, im echten Stack mit Beispieldaten, damit er zum App-Gerüst wird und nicht weggeworfen werden muss.
5. **Dein Feedback**, danach der Funktionsbau. Der Design-Skill `frontend-design` wird dabei genutzt.

Die Entwürfe liegen als HTML in `design/explorations/` und werden in der Browser-Vorschau gezeigt.

**Bedienkonzept:**
- Eine schlanke Schrittleiste: **Grundriss → Bauen → Einrichten → Erleben**.
- Pro Schritt nur die passenden Werkzeuge als schwebende Palette. Eigenschaften erscheinen direkt am ausgewählten Objekt.
- Befehlssuche mit Strg+K.
- Auf dem Handy: ausziehbare Karten von unten und Bedienung im Daumenbereich.

**Erster Start:**
- Eine fertig eingerichtete **Beispielwohnung**, in der man sofort herumlaufen kann.
- Eine Einführung mit 3–4 Schritten direkt in der Oberfläche, dazu kontextuelle Tipps beim ersten Benutzen eines Werkzeugs.
- Alles lässt sich überspringen und jederzeit wieder aufrufen.

**Standards:**
- Hell- und Dunkelmodus, folgt dem System und ist umschaltbar.
- WCAG 2.2 AA (Kontrast, Tastatur, Fokus, Rücksicht auf `prefers-reduced-motion`).
- Kurze Vibration beim Einrasten auf Android.
- Schriften frei lizenziert und **selbst gehostet**.

**Vorläufige UI-Technik** (wird nach der Designwahl bestätigt): Radix-Primitives für barrierefreie Bausteine, Tailwind CSS v4 mit den Tokens, Motion für Animationen, Lucide oder Phosphor als Icons (gebündelt), Schriften über @fontsource.

## Architektur

**Stack:** Vite, React, TypeScript (strict), three.js über @react-three/fiber und drei. Dazu:
- Zustand und Immer; Rückgängig/Wiederholen über Patches
- Dexie (IndexedDB)
- fflate für die Projektdatei (ZIP)
- vite-plugin-pwa (Workbox)
- Vitest, Playwright und axe-core für Tests
- npm als Paketmanager

**Datenschutz per Konstruktion:**
- Eine Content-Security-Policy erlaubt nur die eigene Adresse: `default-src 'self'; connect-src 'self'; img-src 'self' blob: data:; worker-src 'self' blob:; script-src 'self' 'wasm-unsafe-eval'`.
- Kein Tracking, alles selbst gehostet.
- **Bekannte Stellen, an denen Bibliotheken von fremden Servern laden; alle Pfade werden auf lokale Dateien umgestellt:**
  - Tesseract.js: worker-, core- und lang-Pfad
  - pdf.js: Worker, `cMapUrl` und `standardFontDataUrl`
  - drei `useGLTF`: Draco-, Meshopt- und KTX2-Decoder
  - drei `<Environment preset>`: nur eigene HDR-Dateien verwenden
  - troika/drei `<Text>`: immer eine lokale Schrift angeben
  - onnxruntime-web: WASM-Pfade
  - opencv.js: nur lokal einbinden

**Speicher:**
- Der Datenbankname enthält den Basis-Pfad (`wandelbar:${BASE_URL}`). Die Vorschau unter `/preview/` hat damit getrennten Speicher.
- Der Produktions-Service-Worker schließt `/preview/` aus (`navigateFallbackDenylist`).
- Die App ruft `navigator.storage.persist()` auf und erinnert an Sicherungen.

**Laden:**
- Der Kern (2–4 MB) wird vorab im Cache abgelegt.
- Import-Werkzeuge, Materialien und Modelle sind eigene Teilpakete und laden nach dem Start im Hintergrund.
- HD-Texturen und KI-Modelle gibt es nur auf Anfrage.
- Gesteuert wird das über die Offline-Status-Seite.

**Datenmodell** (intern Meter, Anzeige in cm/m; Schema versioniert, mit Migrationen):
- `Project`: Name, `schemaVersion`, `sourcePlan` (Datei, Kalibrierung), `level` (genau eine Etage), `variants[]` (mindestens eine), `activeVariantId`
- `Level`: `walls[]` (Start, Ende, Dicke, Höhe optional), `openings[]` (wallId, Typ Tür/Fenster, Abstand, Breite, Höhe, Brüstung, Anschlag), `rooms[]` (aus geschlossenen Wandzügen berechnet; Name, Deckenhöhe)
- `Variant`:
  - `wallFinishes`: Wandseiten-ID zu Bereichen `{x0, x1, y0, y1, finish}`
  - `finish`: Farbe, Material oder Tapete (Bahnbreite, Rapport, Ansatz, Startpunkt)
  - Böden und Decken pro Raum
  - `furniture[]`
  - `lights[]` (an/aus, Farbe, Helligkeit)
  - `lightMode`
- `FurnitureInstance`: Katalogbezug, Position, Drehung, Montageart (Boden, Wand, Decke oder auf einem anderen Möbel), Material-Überschreibungen, Preis und Link
- `CatalogItem`: Art (Box, parametrisch, eingebaut oder importiert), Parameter, Maße, Asset, Teil-Materialien. Die globale Sammlung liegt in einer eigenen Tabelle.

**Wand-Geometrie:**
- Mittellinien mit Gehrungsstößen.
- Jede Wandseite wird in Rechteckflächen zerlegt, entlang der Öffnungen *und* der Bereichsgrenzen, ohne CSG.
- Dadurch hat jeder Bereich eine stabile ID, eigene UV-Koordinaten in echten Metern (wichtig für Tapete und Fliesen) und ist performant.

**Ordnerstruktur in `src/`:**

| Ordner | Inhalt |
|---|---|
| `app/` | Gerüst, Schrittleiste, Onboarding, PWA, Offline-Status |
| `ui/` | Design-System-Bausteine |
| `model/` | Typen, Schema, Migrationen, Geometrie |
| `store/` | Zustandsspeicher |
| `persistence/` | Speicherung und Projektdatei |
| `editor2d/` | 2D-Editor |
| `scene3d/` | 3D-Szene, Kameras, Licht |
| `materials/` | Materialbibliothek, Tapeten-Logik |
| `furniture/` | Katalog, Generatoren, Import, Platzierung |
| `recognition/` | Erkennung, in Web Workern |
| `export/` | Exporte |
| `xr/` | AR |

**Erkennungs-Schnittstelle:** `recognize(plan: PlanInput) => Promise<DetectedPlan>`. Das Ergebnis enthält Wände, Öffnungen und Raumbeschriftungen mit Konfidenz sowie einen Maßstabsvorschlag. Es erscheint im Editor als Vorschlagsebene, die man übernehmen oder korrigieren kann.

**Kernbibliotheken:**
- MIT bzw. Apache-2.0: three, @react-three/fiber, drei, zustand, immer, dexie, fflate, pdfjs-dist, opencv.js (schlanker Build), tesseract.js (deutsche Sprachdaten), three-gpu-pathtracer, pdf-lib, vite-plugin-pwa; später onnxruntime-web
- Inhalte: ambientCG und Poly Haven (CC0); CubiCasa5k (CC BY-NC 4.0, mit Quellenangabe)

## Meilensteine und Agenten

**Fundament, nacheinander in der Hauptsession:**
- **M0 Einrichtung** (neue Session im Ordner `Wandelbar`):
  1. Node.js LTS per `winget install OpenJS.NodeJS.LTS` (nach deiner Bestätigung).
  2. `git init`, Vite-Gerüst, ESLint, Prettier, Vitest, Playwright, axe-core.
  3. CSP und PWA-Grundgerüst.
  4. Öffentliches GitHub-Repo `wandelbar` anlegen (nach deiner Bestätigung).
  5. GitHub Actions: `main` wird unter `…github.io/wandelbar/` veröffentlicht, Meilenstein-Branches unter `/preview/`.
  6. Dokumente und Lizenzen: `CLAUDE.md`, `docs/PLAN.md` (dieser Plan), `docs/STATUS.md`, `docs/DECISIONS.md`, `LICENSE` (MIT), `THIRD_PARTY_LICENSES.md`.
  7. Grundgerüste für den Datenschutz- und den Offline-Test.
- **MD Designphase:** Runde 1 (drei Richtungen), Runde 2 (Feinschliff), Design-System, klickbarer Prototyp, dein Feedback. Meist eine eigene Session.
- **M1 Datenmodell und Speicherung:** Schema und Migrationen, Dexie mit automatischem Speichern, Rückgängig/Wiederholen, Projektliste, Export und Import von `.wandelbar`, Erinnerung an Sicherungen.
- **M2 2D-Editor:**
  - Bild oder PDF als Hintergrund, Kalibrierung über eine Referenzstrecke
  - Wände zeichnen und bearbeiten mit Einrasten, Dicke einstellen
  - Türen und Fenster setzen
  - Raumerkennung mit Name, Fläche und Höhe; Bemaßung
  - Touch-Bedienung
- **M3 3D und Navigation:** Bau-Mesh, Böden und Decken, Türen und Fenster. Puppenhaus-, Ego-, Flug- und 2D-Kamera mit Kollision. Qualitätsstufen. Lichtmodus *Planungslicht* als Basis.

**Welle A, parallel, jeweils eigene Session mit eigenem Branch und PR:**
- **M4 Oberflächen** (Hauptsession):
  - Material-Pipeline: CC0-Texturen werden in zwei Auflösungen ins KTX2-Format gewandelt, dazu ein Manifest
  - Wandbereiche in Höhe und Breite
  - Tapete (Bahnen, Rapport, Ansatz, Startpunkt)
  - Böden und Decken, Farbwähler, eigene Foto-Texturen
- **M5a Parametrische Möbel** (parallele Session): reine Generatorfunktionen in `furniture/parametric/` mit Tests der Maßhaltigkeit.
- **M10 Erkennung Stufe 1** (parallele Session, isoliert in `recognition/`):
  - OCR für Maßzahlen und m², daraus Maßstabsvorschlag
  - OpenCV-Pipeline im Worker; Türbögen und Fenstermuster
  - Vektor-PDF-Erkennung
  - Benchmark mit freien Plänen und einem CubiCasa5k-Ausschnitt, Bericht in `docs/recognition-benchmark.md`
  - Die Einbindung in den Editor macht danach die Hauptsession.

**Danach nacheinander in der Hauptsession:**
- **M5b Möbel-Kern:** Katalog, Platzhalter, CC0-Modelle. Import mit Normalisierung (Einheiten, Achsen, Boden, Drehpunkt), Materialien pro Teil. Eigene Möbelsammlung, Grundfunktionen beim Platzieren.
- **M6 Platzierung erweitert:** Stapeln, Wand- und Deckenmontage, Maßband, Bewegungsflächen, Einkaufsliste inklusive Tapetenrollen.
- **M7 Varianten und Vergleich:** Varianten anlegen, kopieren und umschalten; geteilte Ansicht mit synchronisierter Kamera; Vorher/Nachher-Schieber.

**Welle B, parallel ab M5b:**
- **M8 Licht und Rendern** (parallele Session): Lichtmodi *Tageslicht* und *Abend*, Lampen einzeln an und aus, Lichtfarbe je Lichtquelle (warmweiß, neutralweiß, RGB) und eine gemeinsame Lichtfarbe für alle Lampen (ohne Sonnenlicht), Schattenbudget pro Qualitätsstufe, Pathtracer-Standbilder, Screenshots.
- **M9 Exporte** (parallele Session): 2D-Plan als PNG/PDF, Einkaufsliste als CSV/PDF, GLB.

**Danach:**
- **M11 Erkennung Stufe 2 (KI, parallele Session):**
  1. Eine virtuelle Python-Umgebung über `py` anlegen (vorher klären, ob PyTorch mit Python 3.14 läuft; bei Bedarf eine passende Version nach Rückfrage).
  2. CubiCasa5k-Modell zu ONNX umwandeln und quantisieren.
  3. onnxruntime-web im Worker einbinden, mit Download nur auf Anfrage.
  4. Benchmark gegen Stufe 1.
- **M12 (optional) AR auf Android:** WebXR mit Hit-Test; iOS-Versuch über USDZ und Quick Look.

**Rollen:**
- **Hauptsession:** Fundament, Design, Integration.
- **Parallele Sessions:** nur Module mit klarer Schnittstelle, höchstens 2–3 gleichzeitig. Jede bekommt einen Auftrag mit Verweis auf `CLAUDE.md`, den passenden Abschnitt in `docs/PLAN.md` und die Schnittstellen.
- **Subagenten:** Explore (günstigeres Modell) für Recherche; ein Code-Review (`/code-review`) am Ende jedes Meilensteins.

## Arbeitsregeln (kommen in `CLAUDE.md` und ins Gedächtnis)

- **Commit, Push und PR-Merge nur nach deiner ausdrücklichen Bestätigung, jedes Mal.** Kleine, logische Commits mit fertiger Nachricht. Ein Branch pro Meilenstein, `main` bleibt immer veröffentlichungsfähig. Das gilt auch in parallelen Sessions.
- **Kontext:** möglichst ein Meilenstein pro Chat. `docs/STATUS.md` wird nach jedem Arbeitsblock aktualisiert. Bei etwa 200.000 Token übergebe ich an eine neue Session mit `CLAUDE.md`, `docs/PLAN.md` und `docs/STATUS.md`.
- **Autonomie:** Technik entscheide ich selbst und protokolliere sie in `docs/DECISIONS.md`. Ich frage bei Sichtbarem und Bedienung, Planabweichungen, Lizenz- und Datenschutzfolgen, neuen Abhängigkeiten über 1 MB und bei Kosten.
- **Sprachen:** Bezeichner im Code englisch. Kommentare, Dokumentation, Commits und PRs deutsch. Oberfläche deutsch und metrisch.
- Testpläne in `fixtures/` haben nur freie Lizenzen; deine eigenen Daten kommen nie ins Repo.

## Prüfung und Abnahme (pro Meilenstein)

1. **Unit-Tests (Vitest):**
   - Geometrie: Stöße, Raumpolygone, Flächen, Wandbereiche
   - Tapetenberechnung: Bahnen, Rapport, Rollenbedarf
   - Migrationen
   - Rundlauf der `.wandelbar`-Datei
   - Maßhaltigkeit der Generatoren
   - Normalisierung beim Import
   - Messwerte der Erkennung
2. **E2E-Tests (Playwright, Desktop-Chromium und Pixel-Emulation):**
   - Hauptablauf
   - **Datenschutz-Test:** Jede fremde Anfrage und jeder CSP-Verstoß lässt den Test scheitern.
   - **Offline-Test:** Service Worker laden, dann `setOffline(true)` und neu laden; der Hauptablauf muss weiter funktionieren.
3. **Design und Barrierefreiheit:**
   - axe-core-Prüfung ohne Verstöße der Stufe AA
   - Screenshot-Vergleiche der Kernbildschirme in hell und dunkel, PC und Handy
   - Design-Prüfung gegen das Design-System
4. **Performance-Budget:** 3-Zimmer-Wohnung mit 50 Möbeln, mindestens 30 fps auf einem Android-Mittelklassegerät (Qualitätsstufe „mittel“).
5. **Code-Review** per Subagent; die Ergebnisse werden eingearbeitet.
6. **Vorführung** in der Browser-Vorschau mit Screenshots.
7. **Deine Abnahme-Checkliste:**
   - am PC
   - am Android-Handy über `npm run dev -- --host` im WLAN
   - Installation und Offline-Betrieb über `/preview/`
8. Danach die Commit-, Push- und PR-Vorschläge zur Bestätigung.

## Erste Schritte nach der Freigabe (in dieser Session)

1. Arbeitsabsprachen im Gedächtnis speichern: Commit und Push nur nach Bestätigung, Übergabe ab etwa 200.000 Token, Sprachen, Autonomie-Regeln, Ansprüche an Design und Datenschutz.
2. **Ordner umbenennen:** Den laufenden Ordner kann ich nicht umbenennen, weil die Session ihn benutzt. Stattdessen lege ich `C:\Users\Guenay\Coding Projects\Wandelbar` an, kopiere den Plan als `docs/PLAN.md` hinein und ziehe das Gedächtnis in den Projektschlüssel des neuen Ordners um.
3. Ich schlage dir eine **neue Session im Ordner `Wandelbar`** für M0 vor. Damit startet sie auch mit frischem Kontext.
4. Den leeren alten Ordner `Room Planer 3D` löschen, nach deiner Bestätigung, sobald diese Session beendet ist.
