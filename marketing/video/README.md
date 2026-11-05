# Demo-Video Logistikmodell Bielefeld-Mitte (60 s)

Ergebnis: [`../Logistikmodell_Bielefeld_Demo_60s.mp4`](../Logistikmodell_Bielefeld_Demo_60s.mp4) – 1920×1080, 30 fps, H.264, genau 60,0 s, ohne Ton.

| Zeit | Szene |
|---|---|
| 0–3,6 s | Titelkarte über dem drehenden Modell |
| 3,6–9,8 s | Drehen per Maus, Zoom über „+“ |
| 9,8–16,4 s | Warenströme: „keine“, dann Speisen, Sterilgut, Patiententransport, „alle“ |
| 16,4–22 s | Explosionsansicht per Regler |
| 22–26,6 s | Klick auf Bereich (Zentrale Notaufnahme) mit Infopanel |
| 26,6–38,6 s | Prozess-Tour Patiententransport (Hubschrauber → ZNA → CT → Aufnahme) |
| 38,6–46,2 s | Heatmap und abgespielte Tagesachse |
| 46,2–52 s | Ist/Soll-Umschaltung, Reiter Analyse |
| 52–56,4 s | Messung ZSVA → Intensivmedizin |
| 56,4–60 s | Abspann |

## Neu aufnehmen

Das Video wird nicht in Echtzeit aufgezeichnet, sondern Bild für Bild gerendert: `harness.js` ersetzt im Browser Uhr, `requestAnimationFrame` und Timer durch eine virtuelle Zeit und blendet Mauszeiger, Klick-Ringe, Untertitel und Titelkarten ein. `rec.js` steuert die App mit echten Maus-Ereignissen (Playwright) und speichert jedes Bild. Dadurch läuft das Video ruckelfrei, auch auf Rechnern ohne Grafikkarte.

```bash
python3 -m http.server 8765 --bind 127.0.0.1      # im Hauptordner des Repos
node marketing/video/rec.js frames 0 1800          # ca. 1 h ohne GPU; Vorschau: … frames 0 1800 15
ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart demo.mp4
```

Untertitel und Ablauf stehen in `rec.js` (Funktion `cap(...)` und die Zeitmarken `at(S(...))`).
