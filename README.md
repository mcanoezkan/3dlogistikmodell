# Logistikmodelle 3D · Klinikum Bielefeld-Mitte und Klinikum Hanau

Interaktive 3D-Strukturmodelle von Klinik-Campus mit Schwerpunkt Ver- und Entsorgungslogistik. Jedes Modell ist eine einzige Datei und läuft auch offline, weil three.js r160 am Dateiende eingebettet ist.

| Datei | Modell | Ist / Soll |
|---|---|---|
| `index.html` | Klinikum Bielefeld-Mitte | Bestand / Optimierungsvariante mit Neubau |
| `hanau.html` | Klinikum Hanau | Bestand / **Variante 2** des baulichen Konzepts (Zielvariante) |

## Start über localhost

```bash
python3 start.py hanau          # Klinikum Hanau, wählt einen freien Port und öffnet den Browser
python3 start.py hanau 8090     # Klinikum Hanau auf festem Port
python3 start.py                # Klinikum Bielefeld-Mitte
```

Ohne Startskript geht es auch so:

```bash
python3 -m http.server 0 --bind 127.0.0.1   # 0 = freien Port wählen, Port steht in der Ausgabe
# dann http://localhost:<port>/hanau.html bzw. /index.html öffnen
```

Die Dateien lassen sich auch direkt per Doppelklick öffnen. Über localhost bleiben die gespeicherten Befunde aber zuverlässiger im Browser erhalten.

## Funktionen

| Bereich | Inhalt |
|---|---|
| Warenströme | Speisen, Wäsche, Sterilgut, Arzneimittel, Verbrauchsgüter, Betten, Abfall, Patiententransport, Post & Proben. Einzeln ein- und ausblendbar, farbcodiert, mit animierten Transporten |
| Prozess-Tour | Automatische Kamerafahrt je Strom von der Quelle zur Senke, mit Erläuterungen (je Szenario) sowie Zwischenhalten an Aufzügen und Außenwegen |
| Bereiche | Klick zeigt Fläche, Lage/Ebene, angebundene Bereiche, Fahrten/Tag, Anlieferfenster und Engpässe |
| Gebäude (Hanau) | Klick auf das Gebäudekürzel (oder auf die Hülle in der Darstellung „massiv“) zeigt den Steckbrief: Baujahr, Sanierungen, BGF, NGF, DIN-13080-Nutzung, Aufzüge, Bereiche und Status in Variante 2 |
| Messung | Weg zwischen zwei Bereichen mit Geschosswechseln: Distanz, geschätzte Zeit, genutzte Aufzüge und Vergleich Ist/Soll |
| Heatmap und Tagesachse | Auslastung von Fluren, Außenwegen, Rampe und Aufzügen; stündliche Transportspitzen, abspielbar |
| Filter und Suche | Kategorien, Gebäude, Bereiche, Aufzüge, Treppenhäuser, Ströme |
| Ist/Soll | Umschalter oben; im Soll erscheinen Neubauten, rückgebaute Gebäude als rote, gestrichelte Umrisse |
| Analyse | Kennzahlenvergleich Ist/Soll, Befundliste mit Maßnahmen, Export und Import als JSON |
| Darstellung | Orbit, Zoom, Pan, Explosionsansicht, Ebenenfilter, Gebäudehülle transparent, massiv oder ausgeblendet |

## Klinikum Hanau (`hanau.html`)

**Ist:** 23 Bestandsgebäude (HC, HB, HA, B1, B2, W, A, A1, M, M17, K1, K2, Z, D, I, N, T, P1, P2, Q, R, Parkhaus, Trafos) mit Baujahr, BGF und NGF laut Plan. 20 Funktionsbereiche, 13 Aufzüge. Die Ver- und Entsorgung läuft im Ist über D (Rampe, Zentrallager, Wäsche) und den offenen Wirtschaftshof; die Küche liegt im obersten Geschoss des Hochhauses HC.

**Soll (Variante 2):** Rückbau von W, A, A1, M und M17. Neubau NB (UG–5. OG: ZNA und Radiologie, Zentral-OP, Intensiv, Pflege), Versorgungszentrum VZ (Zentrallager, Rampe, Wäsche, Küche, Labor, ZSVA, Apotheke) und Verbindungsbau mit getrennten Rein-/Unrein-Ebenen. Dazu neue Aufzüge, gebündelte Anlieferung und neue Aufzugsfreigaben.

Grundlage und Grenzen:

- Baukörper, Baujahre, Sanierungen, BGF/NGF und Funktionsfarben stammen aus „Bauliches Konzept – Bestandsanalyse Übersicht Isometrie“ und „Variante 2 Isometrie“ (DF Architekten). Die Grundrisse sind aus der Schrägansicht in Meter zurückgerechnet (ca. ±20 %). Gebäude sind als Rechtecke bzw. einfache Polygone vereinfacht.
- Die Nordrichtung und die Straßennamen sind im Plan nicht angegeben. Das Modell liegt im Raster der Isometrie, Straßen tragen funktionale Bezeichnungen.
- Die konkrete Lage der Funktionsbereiche ist aus den DIN-13080-Farben abgeleitet und angenommen. Innenwege, Verbindungsgänge, Aufzüge, Mengen und Zeiten sind Annahmen. Die vollständige Liste steht in der App unter „Annahmen“.

## Daten ersetzen

Alle fachlichen Inhalte stehen im Datenblock am Anfang der jeweiligen Datei (`KBM_DATA` in `index.html`, `KLH_DATA` in `hanau.html`): `gebaeude`, `levels`, `aussen` (Straßen, Wege, Außen-Wegenetz), `lifts`, `treppen`, `schaechte`, `nodes`/`edges` (Innenwegenetz), `areas`, `profiles`, `flows` und `scenarios`. Die Renderlogik darunter liest nur diese Struktur.

In `hanau.html` kommen hinzu:

- `gebaeude[].baujahr`, `sanierung`, `bgf`, `ngf`, `din` für den Gebäudesteckbrief.
- `gebaeude[].szenario: 'soll'` für Baukörper, die nur in der Soll-Variante existieren.
- `scenarios.soll.changes.gebaeudeRemove` für rückgebaute Gebäude. Ihre Knoten, Aufzüge und Kanten entfallen im Soll automatisch.
- `scenarios.soll.changes.areaGroups` für eine andere Verteilung der Stationsmengen im Soll.
- `meta.ansicht` (Startkamera), `meta.nordwinkel` (`null` = kein Nordpfeil), `meta.speicher` (Speicherschlüssel der Befunde).

Was als belegt gilt und was als Annahme:

- `src: 'lageplan'` bzw. `lage: 'lageplan'` heißt: aus dem Plan oder der Legende übernommen.
- `'erhoben'` kennzeichnet validierte Erhebungsdaten. Bei Bereichen markiert `daten: 'erhoben'` Fläche, Mengen und Zeiten als erhoben.
- Alles andere erscheint im UI mit dem Hinweis „Annahme“.

Fehlende Knoten, unbekannte Bereiche und nicht routbare Relationen zeigt die Datenprüfung im Reiter „Analyse“ an.

## Klinikum Bielefeld-Mitte (`index.html`): Grundlage und Grenzen

- Die Baukörper sind aus dem Lageplan „Klinikum Bielefeld – Mitte“ (Unternehmenskommunikation, Stand Okt. 2025) digitalisiert. Der Maßstab ist geschätzt (ca. ±15 %).
- Das Modellraster ist um 22,3° gegen Nord gedreht, damit die Gebäudeachsen parallel zur Eduard-Windthorst-Straße liegen. Der Nordpfeil im Modell zeigt die tatsächliche Nordrichtung.
- Geschosszahlen, Innenwege, Aufzüge, Treppenhäuser, Lage der meisten Funktionsbereiche, Mengen und Zeiten sind Annahmen. Eine vollständige Liste steht in der App unter „Annahmen“.
- Die Soll-Variante dient der Veranschaulichung und ist keine Planung.
