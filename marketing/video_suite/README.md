# Demo-Video Healthcare Simulation Suite · Bielefeld-Mitte (60 s)

Ergebnisse im Ordner `marketing/`:

- `HSS_Bielefeld_Demo_60s_Cartoon.mp4` – Darstellungsstil Cartoon
- `HSS_Bielefeld_Demo_60s_Realistisch.mp4` – Darstellungsstil Realistisch, ohne Titel- und Abspannkarte (neutral, ohne Werbung; erzeugt mit `NOCARDS=1`)

  beide 1920×1080, 30 fps, H.264, genau 60,0 s, ohne Ton
- `Klinikum_Bielefeld-Mitte_Ansicht.html` – Kunden-HTML („HTML-Ansicht“, nur ansehen, offline per Doppelklick)

Grundlage ist der Stand von Branch `claude/sleepy-tesla-ouug0l` (Suite unter `hss/` und `suite/Klinikum_Bielefeld-Mitte.hss.json`, 05.11.2026). Die Kunden-HTML wurde mit der Exportfunktion der Suite (`HSS.ansicht.export`) erzeugt, alle Teile freigegeben (Rundgang, Materialfluss, Simulation).

| Zeit | Szene |
|---|---|
| 0–3,6 s | Titelkarte |
| 3,6–9,8 s | Drehen, Zoomen |
| 9,8–14,4 s | Klick auf das Hauptgebäude, Infokarte |
| 14,4–21 s | Warenströme: keine → Speisen, Sterilgut, Patiententransport → alle |
| 21–26,6 s | Explosionsansicht |
| 26,6–38,6 s | Prozess-Tour entlang einer Flusslinie: Patiententransport Hubschrauberlandeplatz → ZNA (Linie wird angeklickt, dann „Fluss abfahren“) |
| 38,6–46,2 s | Tagesablauf mit Auslastung (Wegenetz als Heatmap, Gebäudehülle transparent) |
| 46,2–52 s | Etage EG mit Räumen nach Bestandsplan |
| 52–56,4 s | Flächenplan |
| 56,4–60 s | Abspann |

## Neu erzeugen

```bash
# im Checkout von claude/sleepy-tesla-ouug0l
python3 -m http.server 8766 --bind 127.0.0.1
node marketing/video_suite/exp2.js        # schreibt Klinikum_Bielefeld-Mitte_Ansicht.html
# Ansicht ausliefern (Port 8767) und Bilder rendern, ca. 30–60 min ohne GPU
python3 -m http.server 8767 --bind 127.0.0.1
STIL=cartoon node marketing/video_suite/rec3.js frames 0 1800   # STIL=real für Realistisch; Vorschau: … frames 0 1800 15
ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart demo.mp4
```

Hinweis: Für die Auslastungsszene zeichnet `rec3.js` die Heatmap-Linien des Wegenetzes als dickere Röhren nach (gleiche Daten und Farben wie im Tool), damit sie im Video in 1080p gut erkennbar sind. Unbelastete (graue) Abschnitte werden dabei weggelassen.
