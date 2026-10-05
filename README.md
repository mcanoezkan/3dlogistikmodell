# Klinikum Bielefeld-Mitte · Logistikmodell 3D

Interaktives 3D-Strukturmodell des Campus Klinikum Bielefeld-Mitte mit Schwerpunkt Ver- und Entsorgungslogistik. Die Anwendung ist eine einzige Datei (`index.html`) und läuft auch offline, weil three.js r160 am Dateiende eingebettet ist. Gebäude, Höhen, Straßen und Außenwege stammen aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL).

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
| Ist/Soll | Ist: NIZ (Notaufnahme, Intensivmedizin) seit 12.06.2026 in Betrieb, zwei Warenannahmen laut OSM. Soll: gebündelte Anlieferung, getrennte Rein-/Unrein-Wege mit eigenem Entsorgungsausgang, Notfall-CT im NIZ, Verbindungssteg P1–NIZ als Prüfoption |
| Analyse | Kennzahlenvergleich Ist/Soll, Befundliste mit Maßnahmen, Export und Import als JSON |
| Darstellung | Orbit, Zoom, Pan, Explosionsansicht, Ebenenfilter, Gebäudehülle transparent, massiv oder ausgeblendet |

## Daten ersetzen

`index.html` enthält zwei Datenblöcke:

- `window.KBM_OSM` (zwischen `/* OSM-BEGIN */` und `/* OSM-END */`) wird aus OpenStreetMap erzeugt: Gebäudeteile mit Ebenen, umgebende Bebauung, Gelände, Straßen, Wege, Eingänge und das Außen-Wegenetz für das Routing.
- `KBM_DATA` wird von Hand gepflegt: `gebaeude` (Nummer, Name, Nutzung; Geometrie aus `KBM_OSM`), `levels`, `aussen`, `lifts`, `treppen`, `schaechte`, `nodes`/`edges` (Innenwegenetz), `areas`, `profiles`, `flows` und `scenarios`.

Die Renderlogik darunter liest nur diese Struktur.

### OSM-Daten neu abrufen

```bash
pip install shapely
python3 tools/osm_import.py --embed                          # lädt über die Overpass-API und bettet in index.html ein
python3 tools/osm_import.py --cache osm_raw.json --embed     # Rohdaten zwischenspeichern
```

Das Skript schreibt außerdem `tools/osm_data.js`. Die Zuordnung der Modellgebäude zu OSM-Objekten, die Namen wichtiger Gebäudeteile (`BT`, `HH`, `OB` …) und die festen Anschlusspunkte im Außen-Wegenetz (`WA_N`, `WA_ZL`, `HE`, `LKV`, `ABF`, `P1O` …) stehen oben in `tools/osm_import.py`. Innenwege, Aufzüge und Bereiche in `KBM_DATA` beziehen sich auf das Modellraster und auf diese Namen.

Was als belegt gilt und was als Annahme:

- `src`/`lage: 'osm'`: aus OpenStreetMap übernommen.
- `'lageplan'`: aus dem Lageplan oder der Legende übernommen.
- `'web'`: laut Veröffentlichung des Klinikums (Quellen in `KBM_DATA.meta.quellen`).
- `'erhoben'` kennzeichnet validierte Erhebungsdaten. Bei Bereichen markiert `daten: 'erhoben'` Fläche, Mengen und Zeiten als erhoben.
- Alles andere erscheint im UI mit dem Hinweis „Annahme“.

Fehlende Knoten, unbekannte Bereiche und nicht routbare Relationen zeigt die Datenprüfung im Reiter „Analyse“ an.

## Grundlage und Grenzen

- Gebäudeumrisse, Gebäudeteile und Höhen stammen aus OpenStreetMap (Klinikumsgelände: Weg 689365264, Haupthaus: Relation 18889904). Geschosse im Modell = OSM-Höhe / 3,8 m. Die Nutzungen der Häuser folgen der Legende des Lageplans „Klinikum Bielefeld – Mitte“ (Stand Okt. 2025).
- Das Modellraster folgt den Gebäudeachsen und ist gegenüber Nord um 115,4° gedreht; der Nordpfeil zeigt die tatsächliche Nordrichtung. Die frühere Digitalisierung aus dem Lageplan war um ca. 26 % zu groß und um ca. 90° falsch genordet.
- Belegt aus OSM sind außerdem: beide Warenannahmen („Steri (im UG) & Küche“, „Zentrallager“), Haupteingang im NIZ, Rettungszufahrt mit 2,4 m Durchfahrtshöhe und Hubschrauberlandeplatz auf Parkhaus P1.
- Das Notfall- und Intensivmedizinische Zentrum (NIZ) ist laut Klinikum seit dem 12.06.2026 in Betrieb und im Ist-Zustand abgebildet.
- Innenwege, Aufzüge, Treppenhäuser, die Lage der meisten Funktionsbereiche, Mengen und Zeiten sind Annahmen. Eine vollständige Liste steht in der App unter „Annahmen“.
- Die Soll-Variante dient der Veranschaulichung und ist keine Planung.
