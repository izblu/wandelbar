# Wandelbar

Aus einem Grundriss ein begehbares 3D-Modell der eigenen Wohnung: hochladen, einrichten, durchlaufen.

Wandelbar ist eine installierbare Web-App (PWA). Sie läuft komplett im Browser und offline. Grundrisse, Projekte und Fotos verlassen nie das Gerät: Es gibt keine Konten, keine Server und kein Tracking.

> **Stand:** in Entwicklung. Der Plan steht in [`docs/PLAN.md`](docs/PLAN.md), der aktuelle Stand in [`docs/STATUS.md`](docs/STATUS.md).

## Entwickeln

Voraussetzung ist Node.js 24 oder neuer.

```bash
npm install
npx playwright install --only-shell chromium
npm run dev
```

Die App läuft dann unter `http://localhost:5173/wandelbar/`. Alle Befehle und Konventionen stehen in [`CLAUDE.md`](CLAUDE.md).

## Lizenz

MIT, siehe [`LICENSE`](LICENSE). Fremde Bestandteile: [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).
