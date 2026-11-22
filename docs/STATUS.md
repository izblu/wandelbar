# Status – Wandelbar

**Stand:** 2026-11-22 – M0 und MD abgeschlossen. Das Design-System „Sonnenstand“ und der klickbare Prototyp sind vom Nutzer abgenommen. Dazu kamen als Planergänzungen das Bedienkonzept „Auswahl, Ziehen und Ansicht“ und der Sonnenstand nach Uhrzeit und Jahreszeit (`docs/PLAN.md`, D-035 und D-036). Der Pull Request `milestone/md-design` → `main` macht den Prototyp zur Hauptversion unter <https://izblu.github.io/wandelbar/>. Einzelheiten zu den abgeschlossenen Meilensteinen stehen in `docs/archive/STATUS-M0.md` und `docs/archive/STATUS-MD.md`.

## Nächster Schritt

**Ordnung der Sessions:** Regeln in `CLAUDE.md` unter „Sessions“. Hauptsessions startet der Nutzer selbst mit einem kurzen Startsatz; den Auftrag finden sie hier. Bau und Tests legen beim Start je einen eigenen Abschnitt in dieser Datei an (`## M1 · Bau`, `## M1 · Tests`) und schreiben nur dort.

1. **„M1 · Bau“** (Startsatz: „Starte M1 laut `docs/STATUS.md`.“): Branch `milestone/m1-datenmodell` von `main` anlegen, Gruppe „Wandelbar · M1 Datenmodell“ anlegen und sich hineinverschieben, M1 laut `docs/PLAN.md` mit dem Nutzer in Features schneiden. Die Punkte „Für M1“ unter „Offene Punkte“ beachten.

## Offene Punkte

- **Für M1:**
  - **Neue eigene Wohnung ersetzt die alte ohne Rückfrage** (Code-Review 2026-11-19): „Neue Wohnung aus Grundriss“ verwirft eine vorhandene eigene Wohnung ohne Rückfrage und ohne Rückgängig (`newOwn` in `projects.ts`). Mit dem Speichern klären, ob es mehrere eigene Wohnungen gibt; sonst vorher fragen.
  - **Update-Meldung:** Mit Projektdaten braucht es statt des automatischen Service-Worker-Updates eine Meldung in der Oberfläche (`registerType: 'prompt'`, D-006). Die Gestaltung mit dem Nutzer klären.
  - **Datenmodell:** Nordrichtung `north` am Projekt, Uhrzeit und Jahreszeit für das Tageslicht an der Variante (`docs/PLAN.md`, „Datenmodell“).
- **Installation und Offline am Handy** (Rest der MD-Abnahme): Der Nutzer prüft es nach dem Merge an der Hauptversion. Bis dahin funktioniert die Vorschau nur unter `/wandelbar/preview/` mit Schrägstrich (D-035).
- **Prüfpunkte aus der MD-Abnahme (2026-11-22):**
  - **Bedienkonzept umsetzen** (`docs/PLAN.md` unter „Bedienkonzept“, D-036): M2 Wände, Türen und Fenster; M3 Kamera und Ansichtsleiste; M4 Werkzeug Flächen; M5b Möbel platzieren.
  - **M3:** Das Puppenhaus braucht eine Kamera mit Perspektive. Im Platzhalter wirkten hintere Wände breiter als vordere, weil er ohne Perspektive zeichnet.
  - **M5b:** Möbel ließen sich in eine Wand zwischen zwei Räumen stellen. Einrasten an Wänden und Kollisionswarnung prüfen.
- **Einführung (vertagt, Nutzerentscheidung 2026-11-19):** Sie wird erst geplant und umgesetzt, wenn die App fertig ist, und bleibt bis dahin wie im Prototyp. Dann beachten: Solange sie offen ist, zwingt sie bei jedem Schrittwechsel nach Erleben (`Tour.tsx`, Effekt mit `goTo('experience')`), und ihr Schritt 1 hat im Planungslicht kein Ziel (`.wb-sun-time` fehlt).
- **App-Icon:** noch das vorläufige aus M0. Im Stil „Sonnenstand“ neu gestalten; den Zeitpunkt mit dem Nutzer klären.
- **Rückfrage möglich:** CSP um `base-uri 'self'`, `form-action 'self'` und `object-src 'none'` härten (D-005).
- TypeScript 7 einsetzen, sobald typescript-eslint ihn unterstützt (D-001).
