# Klinikum Bielefeld-Mitte · Logistikmodell 3D

Interaktives 3D-Strukturmodell des Campus Klinikum Bielefeld-Mitte mit Schwerpunkt Ver- und Entsorgungslogistik. Die Anwendung ist eine einzige Datei (`index.html`) und läuft auch offline, weil three.js r160 am Dateiende eingebettet ist.

## Start über localhost

```bash
python3 start.py          # wählt einen freien Port und öffnet den Browser
python3 start.py 8090     # alternativ mit festem Port
```

Ohne Startskript geht es auch so:

```bash
python3 -m http.server 0 --bind 127.0.0.1   # 0 = freien Port wählen, Port steht in der Ausgabe
# dann http://localhost:<port>/index.html öffnen
```

`index.html` lässt sich auch direkt per Doppelklick öffnen. Über localhost bleiben die gespeicherten Befunde aber zuverlässiger im Browser erhalten.

## Funktionen

| Bereich | Inhalt |
|---|---|
| Warenströme | Speisen, Wäsche, Sterilgut, Arzneimittel, Verbrauchsgüter, Betten, Abfall, Patiententransport, Post & Proben. Einzeln ein- und ausblendbar, farbcodiert, mit animierten Transporten |
| Prozess-Tour | Automatische Kamerafahrt je Strom von der Quelle zur Senke, mit Erläuterungen sowie Zwischenhalten an Aufzügen und Außenwegen |
| Bereiche | Klick zeigt Fläche, Lage/Ebene, angebundene Bereiche, Fahrten/Tag, Anlieferfenster und Engpässe |
| Messung | Weg zwischen zwei Bereichen mit Geschosswechseln: Distanz, geschätzte Zeit, genutzte Aufzüge und Vergleich Ist/Soll |
| Heatmap und Tagesachse | Auslastung von Fluren, Außenwegen, Rampe und Aufzügen; stündliche Transportspitzen, abspielbar |
| Filter und Suche | Kategorien, Gebäude, Bereiche, Aufzüge, Treppenhäuser, Ströme |
| Ist/Soll | Soll-Variante: Neubau (ZNA, Intensiv, Notfall-CT) in Betrieb, Zentrallager an der Rampe, gebündelte Anlieferung, getrennte Rein-/Unrein-Wege |
| Analyse | Kennzahlenvergleich Ist/Soll, Befundliste mit Maßnahmen, Export und Import als JSON |
| Darstellung | Orbit, Zoom, Pan, Explosionsansicht, Ebenenfilter, Gebäudehülle transparent, massiv oder ausgeblendet |

## Daten ersetzen

Alle fachlichen Inhalte stehen im Block `KBM_DATA` am Anfang von `index.html`: `gebaeude`, `levels`, `aussen` (Straßen, Wege, Außen-Wegenetz), `lifts`, `treppen`, `schaechte`, `nodes`/`edges` (Innenwegenetz), `areas`, `profiles`, `flows` und `scenarios`. Die Renderlogik darunter liest nur diese Struktur.

Was als belegt gilt und was als Annahme:

- `src: 'lageplan'` bzw. `lage: 'lageplan'` heißt: aus dem Lageplan oder der Legende übernommen.
- `'erhoben'` kennzeichnet validierte Erhebungsdaten. Bei Bereichen markiert `daten: 'erhoben'` Fläche, Mengen und Zeiten als erhoben.
- Alles andere erscheint im UI mit dem Hinweis „Annahme“.

Fehlende Knoten, unbekannte Bereiche und nicht routbare Relationen zeigt die Datenprüfung im Reiter „Analyse“ an.

## Grundlage und Grenzen

- Die Baukörper sind aus dem Lageplan „Klinikum Bielefeld – Mitte“ (Unternehmenskommunikation, Stand Okt. 2025) digitalisiert. Der Maßstab ist geschätzt (ca. ±15 %).
- Das Modellraster ist um 22,3° gegen Nord gedreht, damit die Gebäudeachsen parallel zur Eduard-Windthorst-Straße liegen. Der Nordpfeil im Modell zeigt die tatsächliche Nordrichtung.
- Geschosszahlen, Innenwege, Aufzüge, Treppenhäuser, Lage der meisten Funktionsbereiche, Mengen und Zeiten sind Annahmen. Eine vollständige Liste steht in der App unter „Annahmen“.
- Die Soll-Variante dient der Veranschaulichung und ist keine Planung.

## Healthcare Simulation Suite (Ordner `suite/`)

| Datei | Inhalt |
|---|---|
| `suite/Healthcare_Simulation_Suite.html` | Suite als Einzeldatei (Stand „mit U2-Korrektur“) mit den Erweiterungen unten |
| `suite/Klinikum_Bielefeld-Mitte.hss.json` | Projekt Bielefeld-Mitte (Bestand mit NIZ, U2, Bunker, EG Hauptgebäude), in der Suite über „Öffnen“ laden |
| `suite/quellen/` | Grundlagen: Bestandsplan HGMI Ebene E Teil 1 (PDF) und Fotos der NIZ-Vorfahrt |

Erweiterungen der Suite:

- **Gebäude ausblenden** (Ansichtsleiste, auch in der exportierten HTML-Ansicht): Beim ersten Klick die Gebäude wählen, danach blendet jeder Klick sie aus und wieder ein. ⚙ ändert die Auswahl. Auswahl und Zustand werden im Projekt (`settings.gebAus`) gespeichert und beim Export übernommen. Nur Darstellung, Wegenetz und Simulation rechnen mit allen Gebäuden.
- **Flächen**: Erhöhung `hoehe` (Verkehrsinsel, Mauer) und Art „Sperrfläche“ mit Schraffur (`markWinkel`).
- **Wege mit Steigung**: Höhe je Wegpunkt (dritter Wert des Punkts, im Inspektor in der Punktliste). Der Weg verläuft zwischen den Punkten linear, z. B. erst eben, dann Rampe. Option „Rampenwangen / Brüstung“ zeichnet Stützwände, wo der Weg vom Gelände abweicht.
- **Geländeniveaus** (`terrain.niveaus`): Flächen, auf denen das Gelände tiefer oder höher liegt, mit Böschung am Rand. Anlegen über eine Fläche → „Als Geländeniveau …“, Höhe und Böschungsbreite im Bereich „Gelände & Wege“.
- **Grundstücksgrenze** ohne Zaun (`zaun: false`), z. B. an offenen Vorfahrten.
- **Bibliothek**: Zeichen 250 mit Zusatzzeichen, Zeichen 206, Hinweistafel, Einfahrtssäule.

Änderungen am Projekt:

- **Hauptgebäude Ebene E (Teil 1)** nach Bestandsplan HGMI E (ART, 10.08.2023): rund 1.900 Wandsegmente und 188 Räume mit Raumnummer (HGMI-E.…). Georeferenz über die Rundkerne 1–4, die mit den Kernen der Ebene U2 auf wenige Zentimeter übereinstimmen.
- **Aufzüge 1–11** lagerichtig nach Plan (1–5 Bettenaufzüge am Kern 5, 6/7 Kleinaufzüge, 8/9 Bettenaufzüge an der Halle, 10/11 am Kern 4) und Treppenhaus Kern 5. Haltestellen (U1–12) und Nutzung sind Annahmen.
- Die angenommenen Räume Wäscheversorgung und Zentrallabor lagen auf Ebene E in laut Plan anders belegten Räumen und liegen jetzt im Breitfuß Ost (Lage weiter angenommen). Die Warenannahme Nord ist als Andockfläche vor der Nordfassade abgebildet.
- **NIZ-Vorfahrt** nach Fotos und OpenStreetMap: Gehweg mit Leitstreifen und roter Radweg, Pflaster-Vorfahrt zum Kurzzeitparkplatz, Asphalt-Rettungszufahrt, Verkehrsinsel mit Betonbrüstung und Säule, Stützmauern, Böschungen, Sperrfläche, Zeichen 250 und 206, Hinweistafeln, Fahnenmasten, Mastleuchten.

- **Höhenlage an der Teutoburger Straße**: Straße, Geh- und Radweg und NIZ-Vorplatz liegen auf Niveau U1 (−3,80 m), das übrige Gelände auf Ebene E, dazwischen Böschungen. Die Pkw-Zufahrt zum Kurzzeitparkplatz bleibt eben auf U1. Die Rettungszufahrt ist bis zur überdachten Rampe eben und steigt dort auf ca. 27 m (14 %) zur Plattform. Die Wirtschaftszufahrt steigt von der Straße zum Wirtschaftshof. Die Klinikgebäude sind auf ihrer bisherigen Höhe festgehalten (`baseFixed`).
- **Wiederhergestellte Häuser** (Abgleich mit der letzten Bielefeld-Version im Repo, `index.html`, Lageplan Okt. 2025): Haus 2 (MVZ, STATTKlinik), Haus 5 (Ärztehaus Teutoburger Straße 60), Haus 8, Haus 10 (Personalwohnheim im Alten Städtischen Krankenhaus) und Haus 11 (Kita Kidstown 2). Umrisse und Höhen stammen aus OpenStreetMap. Sie sind als Auswahl für „Gebäude ausblenden“ vorbelegt. In Haus 8 ist der Raum der Technischen Abteilung wieder vorhanden, damit sind alle 852 Warenströme routbar.
