# UNITY · 3D-Logistikmodelle

## Healthcare Simulation Suite (neu)

Im Ordner [`hss/`](hss/README.md): Baukasten für Krankenhaus-Campus in 3D (Gebäude mit anpassbaren Fassaden und Rundungen, Brücken, Gelände, Wege, Verkehr, Etagen-Innenausbau, AWT) mit Objektbibliothek, Stationsplaner (Grundriss nach Gebäudetiefe, vollständig eingerichtete Räume), Flächenansicht nach DIN 277 und Simulation der Material-, Waren- und Personenflüsse inklusive Hotspot-Analyse, Fahrzeugbedarf und Ich-Perspektive. Demo-Modus „UNITY Hospital“; Standortmodelle BwZK Koblenz und Klinikum Hanau (Bestand und Variante) als bearbeitbare Projekte.

Am einfachsten: `Healthcare_Simulation_Suite.html` per Doppelklick öffnen (eine Datei, läuft offline). Projektdateien aus [`projekte/`](projekte) (BwZK Koblenz, Klinikum Hanau, Klinikum Bielefeld-Mitte – je Bestand und Variante) ins Fenster ziehen. Varianten für den Koblenzer Neubau K2 (neben K1, anstelle von C, D, C+D oder A/B/HT/C/D) liegen in [`projekte/Koblenz_K2`](projekte/Koblenz_K2), Varianten für den Hanauer Neubau BT1 in [`projekte/Hanau_BT1`](projekte/Hanau_BT1).

```bash
python3 start.py          # öffnet die Healthcare Simulation Suite
python3 start.py kbm      # öffnet das bisherige Modell Klinikum Bielefeld-Mitte
```

---

# Klinikum Bielefeld-Mitte · Logistikmodell 3D

Interaktives 3D-Strukturmodell des Campus Klinikum Bielefeld-Mitte mit Schwerpunkt Ver- und Entsorgungslogistik. Die Anwendung ist eine einzige Datei (`index.html`) und läuft auch offline, weil three.js r160 am Dateiende eingebettet ist.

## Start über localhost

```bash
python3 start.py kbm          # wählt einen freien Port und öffnet den Browser
python3 start.py kbm 8090     # alternativ mit festem Port
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
