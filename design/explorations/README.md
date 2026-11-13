# Design-Entwürfe (MD)

## Runde 1: drei Richtungen

Drei Richtungen für den Schritt „Einrichten“, jeweils für PC und Handy, hell und dunkel:

- `a-morgenlicht.html`: ruhig, hell und wohnlich
- `b-supergrafik.html`: mutig und editorial
- `c-spielhaus.html`: verspielt und farbig
- `index.html`: Übersicht zum Vergleichen
- `a-mix.html`: zusätzlich gezeigte Mischung „A mit Anleihen“ (nicht gewählt, bleibt zum Nachvollziehen der Entscheidung)

**Gewählt:** A „Morgenlicht“ pur (2026-11-13), in Runde 2 verfeinert zu A4 „Sonnenstand“.

## Runde 2: Verfeinerungen von A

Jede Variante lädt `styles/a-morgenlicht.css` und danach ein eigenes Stylesheet, das nur die Unterschiede enthält:

- `a2-fruehlicht.html`: kühler und klarer, Petrol, leichter Schriftschnitt, scharfe Fensterbilder
- `a3-honiglicht.html`: wärmer und wohnlicher, Moos, kräftiger Schnitt, Lichtstrahlen und Lampeninseln
- `a4-sonnenstand.html`: deckende Flächen ohne Milchglas, Tageszeit-Regler für den Sonnenstand
- `runde-2.html`: Vergleich mit A pur

Das Licht berechnet `shared/dollhouse.js` aus Sonnenstand und Fenstern, sobald das CSS einer Variante `--light-model: windows` setzt. A, B und C aus Runde 1 bleiben unverändert.

## Ansehen

```bash
npm run dev
```

Dann <http://localhost:5173/wandelbar/design/explorations/> öffnen. Mit `?theme=dark` oder `?theme=light` lässt sich das Design einer Seite festlegen, sonst folgt es dem System.

## Aufbau

- `shared/dollhouse.js`: Beispielwohnung „Lindenstraße 12“ und Puppenhaus-Darstellung in SVG
- `shared/explore.js`: Bedienung (Auswahl, Karte am Möbel, Strg+K, Handy-Karte, hell/dunkel)
- `shared/base.css`, `shared/icons.svg`: gemeinsame Grundlage und eigene Icons
- `styles/`: das Aussehen je Richtung
- `fonts/`: freie Schriften (OFL-1.1), siehe `THIRD_PARTY_LICENSES.md`

Die Entwürfe gehören nicht zum App-Build und nutzen dieselbe CSP wie die App.
