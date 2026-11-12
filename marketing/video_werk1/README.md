# Demo-Video Fabric Planning Suite 1.4 · Werk 1 Friedrichshafen (60 s)

Ergebnis: [`../FPS_Werk1_Friedrichshafen_Demo_60s_Realistisch.mp4`](../FPS_Werk1_Friedrichshafen_Demo_60s_Realistisch.mp4) – 1920×1080, 30 fps, H.264, 60,0 s, ohne Ton, Darstellungsstil „Realistisch“.

| Zeit | Szene |
|---|---|
| 0–3,6 s | Titelkarte |
| 3,6–9 s | Werksgelände: 92 Gebäude aus OpenStreetMap, Drehen und Anflug |
| 9–16 s | Hallenausbau G 60: Hauptfahrweg, Querwege, Gehweg mit Überwegen, FTS-Leitlinie, Rollenbahn |
| 16–22 s | Hallenleben auf Augenhöhe in G 43: Stapler, Routenzüge, FTS, Werker |
| 22–29 s | Querweg und Fahrzeug anklicken – Angaben im Inspektor |
| 29–40 s | Eigenen Routenzug einzeichnen (2 Züge, Rundkurs um eine Bereitstellzone) |
| 40–47 s | Montage Großmotoren mit „Wände voll“: Stützen, Brückenkran, Leuchten |
| 47–53 s | Kurbelgehäusefertigung mit Wegen und Bereitstellung |
| 53–57 s | Materialflüsse |
| 57–60 s | Abspann |

Grundlage: Planungsmodell `projekte/RollsRoyce_Werk1/Werk1_Friedrichshafen.hss.json` (öffentliche Informationen, Belegung teils Szenario – siehe README dort).

## Neu aufnehmen

Wie beim Klinikum-Video: `harness.js` ersetzt Uhr, Timer und `requestAnimationFrame` durch eine virtuelle Zeit und blendet Mauszeiger, Klick-Ringe, Untertitel und Titelkarten ein; `rec.js` steuert die Suite (`Fabric_Planning_Suite.html`) und speichert jedes Bild.

```bash
node marketing/video_werk1/rec.js frames 0 1800          # Vorschau: … frames 0 1800 30 (jedes 30. Bild)
ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart demo.mp4
```

Abschnitte lassen sich parallel rendern (z. B. `… frames 0 450`, `… frames 450 900` usw.), weil jeder Lauf die virtuelle Zeit bis zum Startbild ohne Zeichnen vorspult.
