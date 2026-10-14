# BwZK Koblenz – Varianten für den Neubau K2

Grundlage: aktuelles Standortmodell „Bundeswehrzentralkrankenhaus Koblenz – Bestand“ (mit OSM-Umgebung). Jede Datei einfach in die Healthcare Simulation Suite ziehen.

K2 ist mit rund **18.000 m² BGF** (inkl. UG) angesetzt. Die Geschosse von K2 sind als **Flächenplanung** belegt (Fachbereiche mit m², keine Räume) – Ansicht „Flächenplan“ in der Ansichtsleiste bzw. Arbeitsbereich „Flächenplanung“. Die Belegung ist ein Vorschlag (Annahme) und lässt sich im 3D-Bild an den Griffen ändern.

| Datei | Variante | K2 | BGF K2 | Rückbau |
|---|---|---|---:|---|
| `BwZK_Koblenz_V0_Bestand.hss.json` | **V0 · Bestand** – Bestand mit Neubau K1 (im Bau). Ausgangslage für die Varianten V1–V5. | – | – | – |
| `BwZK_Koblenz_V1_K2_neben_K1.hss.json` | **V1 · K2 neben K1** – K2 östlich neben K1 anstelle von Haus M (Unterkünfte Ausb-/SimZ SanRgt 2), dem Ausbildungs- und Simulationszentrum und kleinen Nebengebäuden. Brücken K2–K1 im 1. und 2. OG über die Erschließungsstraße. | 62 × 48 m · UG + EG + 4 OG | 17.856 m² | Ausb-/SimZ SanRgt 2, M |
| `BwZK_Koblenz_V2_K2_anstelle_C.hss.json` | **V2 · K2 anstelle von Haus C** – Rückbau von Haus C (Haupteingang, Information, Cafeteria, Patientenaufnahme, Untersuchung und Behandlung, Seelsorge). K2 übernimmt Haupteingang und Aufnahme. Verbindungen zu HT (UG bis 3. OG, von dort weiter zu A und B), zu D im EG und als Glasbrücke zu K1 westlich an Haus D vorbei (1. und 2. OG). | 47 × 54 m · UG + EG + 5 OG | 17.602 m² | C |
| `BwZK_Koblenz_V3_K2_anstelle_D.hss.json` | **V3 · K2 anstelle von Haus D** – Rückbau von Haus D (Chefarzt, Untersuchung und Behandlung, Warenannahme UG) samt Verbindungsbrücke D–K1. Das schmale Grundstück zwischen K1 und C/E trägt K2 nur als höheren Riegel mit kurzem Flügel (UG + EG + 6 OG); die Straße zwischen K1 und D entfällt. Verbindungen zu K1 (EG–3. OG), zu C (UG–2. OG; über C und A weiter zu HT), zu D/E und vom Flügel zu E. | 68 × 27 m + 18 × 21 m · UG + EG + 6 OG | 17.712 m² | D, Verbindungsbrücke D–K1 |
| `BwZK_Koblenz_V4_K2_anstelle_C_und_D.hss.json` | **V4 · K2 anstelle von Haus C und D** – Rückbau von Haus C und D. K2 als L-förmiger Baukörper: Riegel auf dem D-Grundstück direkt vor K1, Flügel auf dem C-Grundstück bis an HT. K2 wird zum Bindeglied zwischen K1 und dem Altbestand (HT, A, B). Freiflächen von C werden Grünfläche. | 62 × 28 m + 21 × 60 m · UG + EG + 4 OG | 17.976 m² | C, D, Verbindungsbrücke D–K1 |
| `BwZK_Koblenz_V5_K2_anstelle_A_B_HT_C_D.hss.json` | **V5 · K2 anstelle von A, B, HT, C und D** – Rückbau der Häuser A, B, HT (Hochturm), C und D. K2 als kompakter Breitfuß (UG + EG + 2 OG) im Zentrum des Altbestands; die frei werdenden Flächen von A, B und HT werden Grünfläche. Brücken zu K1, F1, B1 und zur Magistrale. | 60 × 75 m · UG + EG + 2 OG | 18.000 m² | A, B, C, D, HT, Verbindungsbrücke D–K1 |

Gemeinsam für alle Varianten:

- frei werdende Grundstücke der zurückgebauten Häuser sind als Grünfläche (Park mit Bäumen) angelegt; Wege und Flächen unter K2 sind gekürzt
- Brücken bzw. Verbindungsgänge von K2 zu K1 und HT (bzw. zu den verbleibenden Nachbarn), Brücken zu zurückgebauten Häusern entfallen
- Räume und Stationen aus zurückgebauten Häusern (Warenannahme D, Zentrallabor und Pflegestationen B) werden in K2 als Flächen mit gleicher Kennung übernommen – die Material- und Logistikflüsse laufen damit über K2
- K2 erhält Betten- und Versorgungsaufzug

Erzeugt mit `tools/koblenz_k2_varianten.py` (Geometrie) und `tools/k2_flaechen.js` (Flächen in K2).
