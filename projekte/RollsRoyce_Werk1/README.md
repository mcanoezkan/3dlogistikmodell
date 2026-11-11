# Werk 1 Friedrichshafen · Planungsmodell (Fabric Planning Suite)

`Werk1_Friedrichshafen.hss.json` in die **Fabric Planning Suite** ziehen (`Fabric_Planning_Suite.html`).

Modell auf Basis **öffentlich verfügbarer Informationen**. Es ist kein Abbild der tatsächlichen Werksbelegung.

## Was belegt ist und was angenommen

| Gebäude | Funktion im Modell | Grundlage |
|---|---|---|
| alle 92 Werksgebäude | Grundrisse, Namen „G xx“ | OpenStreetMap (Relation 13871377 „Rolls-Royce Solutions – Werk 1“), © OpenStreetMap-Mitwirkende, ODbL |
| Hauptverwaltung, Jean-Raebel-Haus, G 42 | Verwaltung / Büro | OSM (Adresse, Gebäudeart) |
| Werkskantine Karl-Maybach-Haus | Kantine | OSM |
| MTU Training Center | Ausbildungswerkstatt | OSM; mtu-Pressemitteilung 2019 (Ausbildung in Werk 1) |
| G 25/1 | Pleuelfertigung | OSM-Gebäudename |
| G 75 | Entwicklungsprüffeld, 7 Prüfstände | OSM; mtu-Pressemitteilung 2013 (F&E-Prüffeld, 7 Prüfstände) |
| Microgrid Validation Center (Westrand) | Batteriespeicher, Aggregate | Rolls-Royce-Pressemitteilung 10/2019; Lage aus OSM |
| G 43, G 62, G 63, G 16, G 36, G 30/1–4, G 29, G 10/2, G 73, G 11, G 60, G 12, G 13, G 41, G 64, G 67, G 72, G 68 | Montage Großmotoren, Kurbelgehäuse-, Kurbelwellen-, Zylinderkopffertigung, Vormontage, Prüffelder, Lackiererei, Werkstatt, Nacharbeit, Messraum, Logistik | **Planungsszenario (Annahme)** |
| übrige Gebäude | Lager, Werkstatt, Technik nach Größe | **Annahme** |

Wichtig: Nach Unternehmensangaben liegen die **Montage der Baureihe 4000 und die Lackiererei in Werk 2 (Manzell)**; das **Materialwirtschaftszentrum** liegt in Kluftern. Im Modell sind Werk 2, MWZ Kluftern, Rohteil-Lieferanten und Kunden als externe Orte angebunden. Die Montage in G 43 und die Lackiererei in G 30/1 sind ein Szenario für die angekündigte „Neuaufstellung von Werk 1 und 2“ (Pressemitteilung 02.03.2026).

## Mengen (Szenario)

- 1.700 Motoren je Jahr (≈ Mittelwert aus „über 26.000 Motoren der Baureihe 4000 in 15 Jahren“), 230 Arbeitstage
- Montage: 5.000 min Montageinhalt je Motor, 2 Schichten → Takt ≈ 110 min, 18 Stationen
- Kurbelgehäuse: 1.500 min Bearbeitung je Teil, 3 Schichten, OEE 75 % → 11 Portal-BAZ
- Prüffeld: 6 h Prüflauf + 2 h Rüsten je Motor → 4 + 2 Abnahmeprüfstände
- Motorabmessungen 16V/20V nach öffentlichen Datenblättern (20V ca. 4,0 × 1,5 × 2,4 m, rund 12 t)

Alle Werte lassen sich im **Produktionsplaner** nachrechnen und ändern.

## Neu erzeugen

```bash
python3 tools/build_einzeldatei.py fabrik
node tools/werk1_bauen.js projekte/RollsRoyce_Werk1/osm_werk1_quelldaten.json
```

`tools/werk1_aufbau.js` enthält Belegung, Mengen, Außenanlagen und die 30 Materialflüsse.

## Quellen

- rolls-royce.com, Pressemitteilungen 10/2019 (Microgrid Validation Center), 2023 (Montagewerk Baureihe 2000 Kluftern), 02.03.2026, 16.04.2026, 07.05.2026
- mtu-solutions.com, Pressemitteilungen 2001, 2010 (MWZ Kluftern), 2013 (F&E-Prüffeld), 2017 (Lackiererei Werk 2), 2019 (100 Jahre Ausbildung)
- Rolls-Royce-Story 2025 „Building precision into the Series 4000 engine“ (Kurbelgehäuse 20V4000)
- Schwäbische Zeitung, Berichte 2021–2026
- OpenStreetMap, Relation 13871377
