# Klinikum Hanau – Varianten für den Neubau BT1

Grundlage: Standortmodell „Klinikum Hanau – Bestand“, verortet (Modellraster um 45,8° gegen Nord gedreht) und mit Umgebung aus OpenStreetMap. Auf dem Klinikgelände gilt das Modell; OSM liefert nur die Umgebung. Jede Datei einfach in die Healthcare Simulation Suite ziehen.

| Datei | Variante | BT1 | BGF BT1 | Betten |
|---|---|---|---:|---:|
| `Klinikum_Hanau_V0_Bestand.hss.json` | **V0 · Bestand** | – | – | – |
| `Klinikum_Hanau_V1_BT1_10041.hss.json` | **V1** – Abriss von W, A (mit Nebengebäude A1), M und M17; BT1 an der heutigen Lage von W, ersetzt die Gesamtfläche von W, A, M und M17 (5.410 m² NF). 24 Betten aus Station M17 (MED1 Kardiologie), Anästhesie, Notfalllabor, Strahlentherapie aus A und M | 46 × 36,5 m · UG + EG + 4 OG | 10.074 m² (Soll mind. 10.041) | 24 |
| `Klinikum_Hanau_V2_BT1_12900.hss.json` | **V2** – wie V1, zusätzlich 65 Betten Neurologie aus Haus N (N34, N35): 65 × 24 m² NF = 1.560 m² NF × 1,86 ≈ 2.900 m² BGF | 46 × 40 m · UG + EG + 5 OG | 12.880 m² (Soll ca. 12.900) | 89 |

Gemeinsam:

- BT1 ist verbunden mit Hochhaus C (UG–3. OG), OP-Trakt B1 (EG, 1. OG), HB (UG–1. OG) und über eine Magistrale mit K1 (UG, EG) – sie ersetzt die bisherigen Wege über M und M17
- die Grundstücke von M und M17 werden Grünfläche
- Geschosse von BT1 als Flächenplanung (Fachbereiche mit m²): UG Strahlentherapie und Technik, EG Notfalllabor, Anästhesie, Allgemeine Dienste, 1. OG MED1 Kardiologie (24 Betten) mit Funktionsdiagnostik, darüber die Flächen aus W und M, Apotheke und Krankenhausmanagement; in V2 im 4. und 5. OG Neurologie N34 und N35. Die Geschosse 1 und 2 von Haus N sind in V2 als frei gekennzeichnet
- übernommene Räume (Labor, Apotheke, Pflegebereiche, Neurologie) behalten ihre Kennung – die Logistikflüsse laufen über BT1

Erzeugt mit `tools/hanau_bt1_varianten.py` (Geometrie) und `tools/bt1_flaechen.js` (Flächen in BT1).
