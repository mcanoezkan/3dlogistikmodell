# Klinikum Bielefeld-Mitte · Logistikmodell 3D

Interaktives 3D-Strukturmodell des Campus Klinikum Bielefeld-Mitte mit Schwerpunkt Ver- und Entsorgungslogistik. Die Anwendung ist eine einzige Datei (`index.html`) und läuft auch offline, weil three.js r160 am Dateiende eingebettet ist.

## Weiteres Modell im Repository

`recyclinghalle/` enthält im gleichen Stil das 3D-Modell einer Indoor-Recyclingannahmestelle (Machbarkeitsstudie mit Varianten A–D und Outdoor-Vergleich). Start: `python3 recyclinghalle/start.py`, Details in [`recyclinghalle/README.md`](recyclinghalle/README.md).

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
