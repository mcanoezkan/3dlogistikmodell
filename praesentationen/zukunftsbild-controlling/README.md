# Zukunftsbild Controlling · Punktwolken-Fassung

`Zukunftsbild_Controlling_Punktwolke.html` ist eine Einzeldatei, die offline läuft (Doppelklick, Edge oder Chrome). Alle 30 Folien des Workshops sind als interaktive 3D-Szenen aus Lichtpunkten gebaut (WebGL, Bloom, Kameraflug). Bei jedem Folienwechsel fliegen die Punkte in die neue Form.

| Bedienung | |
|---|---|
| ← / → / Leertaste | Folie zurück / weiter |
| 1–5 | Kapitel |
| O | Übersicht |
| F | Vollbild |
| Klick | Elemente der Szene anklicken (Hinweis oben rechts) |
| Ziehen / Mausrad / Doppelklick | Szene drehen / zoomen / Ansicht zurücksetzen |

Die Quellen liegen in `src/`. Nach Änderungen die Datei neu bauen:

```bash
python3 praesentationen/zukunftsbild-controlling/build.py
```

- `engine.js`: Partikelsystem, Kamera, WebGL-Renderer, Beschriftungen und Klickflächen
- `data.js`: Inhalte aller Folien
- `slides1.js` bis `slides3.js`: eine Szene je Folie
- `main.js`: Navigation und Steuerleiste
