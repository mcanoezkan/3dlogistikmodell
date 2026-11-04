# UNITY · 3D-Logistikmodelle

## Drei Suiten aus einem Baukasten

| Datei (Doppelklick, offline) | Edition | Schwerpunkt |
|---|---|---|
| `Healthcare_Simulation_Suite.html` | `health` | Krankenhäuser: Stationsplaner, Klinik-Planer, Material-, Waren- und Personenflüsse (wie bisher) |
| `Fabric_Planning_Suite.html` | `fabrik` | Fabriken und Werke: Produktions-, Lager- und Hochregalhallen mit Shed-, Sattel- und Pultdach, Maschinen, Fördertechnik, Regale, Stapler, FTS, Silos, Tanks; Zonen Wareneingang → Lager → Produktion → Montage → Versand; Standardflüsse der Fabrik mit Stapler, Routenzug, FTS und LKW; Demo „UNITY Werk“ |
| `Home_Planning_Suite.html` | `home` | Häuser und Wohnungen: Einfamilienhaus, Stadtvilla, Bungalow, Doppel-/Reihenhaus, Mehrfamilienhaus, Garage, Gartenhaus mit Dachformen; über 50 Möbel und Ausstattungen; „Grundriss vorschlagen“ legt Räume mit Türen und Möbeln an; Demo „Musterhaus“ |

Alle drei teilen denselben Quellcode in `hss/`; die Edition steuert Namen, Startfenster, Arbeitsbereiche, Gebäudebausteine, Raumtypen, Bibliothek, Demo und das Ziel des OpenStreetMap-Imports (**Nur Umgebung** oder **Umgebung mit Krankenhaus / Werk / Haus**). Projekte und Browser-Ablage sind je Edition getrennt.

```bash
python3 tools/build_einzeldatei.py          # baut alle drei Einzeldateien (oder: … fabrik / home / health)
python3 start.py fabrik                     # Entwicklungsstand im Browser (auch: home, ohne Angabe = Healthcare)
```

**Besserer Import für alle Editionen** (Details und weitere Vorschläge in [`hss/docs/IMPORT.md`](hss/docs/IMPORT.md)): Multipolygone und Innenhöfe, `building:part` mit eigenen Höhen und Dachformen, begradigte und rechtwinklig gestellte Umrisse (Rechtecke mit Griffen), Hallen als hohe Eingeschosser, Dachformen aus `roof:shape`, Einzelbäume, amtliche Grundrisse und Flurstücke aus ALKIS NRW, Luftbild als Unterlage (DOP NRW/Bayern, Esri), Ersatzweg über die OSM-API, wenn Overpass ausfällt, und die Herkunft jeder Angabe im Inspektor.


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

## Healthcare Simulation Suite (Ordner `suite/`)

| Datei | Inhalt |
|---|---|
| `Healthcare_Simulation_Suite.html` (Hauptordner) | Suite als Einzeldatei mit den Erweiterungen unten – die Erweiterungen stehen jetzt in den Quellen unter `hss/`, die frühere Kopie unter `suite/` entfällt |
| `suite/Klinikum_Bielefeld-Mitte.hss.json` | Projekt Bielefeld-Mitte (Bestand mit NIZ, U2, Bunker, EG Hauptgebäude), in der Suite über „Öffnen“ laden |
| `suite/quellen/` | Grundlagen: Bestandsplan HGMI Ebene E Teil 1 (PDF), Flucht- und Rettungsplan Haus 6/7 Kellergeschoss (PDF) und Fotos der NIZ-Vorfahrt |

Erweiterungen der Suite:

- **Gebäude ausblenden** (Ansichtsleiste, auch in der exportierten HTML-Ansicht): Beim ersten Klick die Gebäude wählen, danach blendet jeder Klick sie aus und wieder ein. ⚙ ändert die Auswahl. Auswahl und Zustand werden im Projekt (`settings.gebAus`) gespeichert und beim Export übernommen. Nur Darstellung, Wegenetz und Simulation rechnen mit allen Gebäuden.
- **Flächen**: Erhöhung `hoehe` (Verkehrsinsel, Mauer) und Art „Sperrfläche“ mit Schraffur (`markWinkel`).
- **Wege mit Steigung**: Höhe je Wegpunkt (dritter Wert des Punkts, im Inspektor in der Punktliste). Der Weg verläuft zwischen den Punkten linear, z. B. erst eben, dann Rampe. Option „Rampenwangen / Brüstung“ zeichnet Stützwände, wo der Weg vom Gelände abweicht.
- **Geländeniveaus** (`terrain.niveaus`): Flächen, auf denen das Gelände tiefer oder höher liegt, mit Böschung am Rand. Anlegen über eine Fläche → „Als Geländeniveau …“, Höhe und Böschungsbreite im Bereich „Gelände & Wege“. Im Bielefeld-Projekt nicht verwendet.
- **Anschluss nach Höhe** (Bauteiloption): Bauteile mit Geschossversatz werden im Wegenetz dort verbunden, wo die Fußbodenhöhen übereinstimmen.
- **Untergeschosse** (U1, U2) zeigen keine Außenwege, nur Tunnel und AWT-Trassen.
- **Grundstücksgrenze** ohne Zaun (`zaun: false`), z. B. an offenen Vorfahrten.
- **Bibliothek**: Zeichen 250 mit Zusatzzeichen, Zeichen 206, Hinweistafel, Einfahrtssäule.
- **Gebäude einfärben (Funktionseinheiten)**: Schaltfläche „🎨 Einfärben“ in der Ansichtsleiste, ⚙ daneben legt die Funktionseinheiten an (Name, Farbe, Modus **nur Dach** oder **ganzes Gebäude**) und ordnet Gebäude zu. Im Inspektor eines Bauteils lässt sich das Gebäude oder nur dieses Bauteil einer Einheit zuordnen. Eine Legende oben links zeigt die Einheiten; Klick auf einen Eintrag fährt zu den Gebäuden, ◉ blendet eine Einheit aus. Gespeichert in `settings.funktionseinheiten`, auch in der HTML-Ansicht. Nur Darstellung.
- **Flächen in beliebiger Form** (z. B. schräge Grünflächen): Beim Flächenwerkzeug entweder ein Rechteck aufziehen oder Eckpunkte nacheinander anklicken (Doppelklick, Enter oder Klick auf den Startpunkt beendet, Rücktaste nimmt eine Ecke zurück, Umschalt rastet 15°-Winkel ein). Eigene Kacheln „⬠ Grünfläche frei“ und „⬠ Platz frei“ im Bereich Gelände & Wege sowie „⬠ Grün frei“ in der 2D-Leiste. Vieleckflächen haben Griffe an jeder Ecke (ziehen), ＋ an den Kanten fügt eine Ecke ein, Alt+Klick oder „✕ Ecke“ löscht eine. Bestehende Rechtecke lassen sich im Inspektor „In Vieleck umwandeln“. Die Bepflanzungsdichte gilt auch für Vieleck-Grünflächen.

Änderungen am Projekt:

- **Hauptgebäude Ebene E (Teil 1)** nach Bestandsplan HGMI E (ART, 10.08.2023): rund 1.900 Wandsegmente und 188 Räume mit Raumnummer (HGMI-E.…). Georeferenz über die Rundkerne 1–4, die mit den Kernen der Ebene U2 auf wenige Zentimeter übereinstimmen.
- **Aufzüge 1–11** lagerichtig nach Plan (1–5 Bettenaufzüge am Kern 5, 6/7 Kleinaufzüge, 8/9 Bettenaufzüge an der Halle, 10/11 am Kern 4) und Treppenhaus Kern 5. Haltestellen (U1–12) und Nutzung sind Annahmen.
- Die angenommenen Räume Wäscheversorgung und Zentrallabor lagen auf Ebene E in laut Plan anders belegten Räumen und liegen jetzt im Breitfuß Ost (Lage weiter angenommen). Die Warenannahme Nord ist als Andockfläche vor der Nordfassade abgebildet.
- **NIZ-Vorfahrt** nach Fotos und OpenStreetMap: Gehweg mit Leitstreifen und roter Radweg, Pflaster-Vorfahrt zum Kurzzeitparkplatz, Asphalt-Rettungszufahrt, Verkehrsinsel mit Betonbrüstung und Säule, Stützmauern, Böschungen, Sperrfläche, Zeichen 250 und 206, Hinweistafeln, Fahnenmasten, Mastleuchten.

- **NIZ-Höhenlage**: Das Gelände bleibt eben. Das NIZ steht mit Ebene U1 ebenerdig an der Teutoburger Straße (Kurzzeitparkplatz unter der Plattform, Eingangshalle). Die Pkw-Zufahrt ist ebenerdig. Die Liegendkrankenvorfahrt ist eine erhöhte Ebene des Gebäudes (Plattform auf Ebene E, 3,80 m über der Straße). Die Rettungszufahrt führt in der überdachten Rampe hinauf (ca. 27 m, 14 %, Höhenpunkte am Weg). Weil im übrigen Modell Ebene E auf Geländehöhe liegt, sind Hauptbaukörper, Plattform und Eingangshalle des NIZ eine Ebene höher gesetzt. Die Magistrale bleibt auf Höhe des Hauptgebäudes und schließt im Wegenetz über die Bauteiloption „Anschluss nach Höhe“ an.
- **Haus 6/7 Kellergeschoss** (Pathologie/Prosektur, Etage über dem Bunker) vereinfacht nach dem Flucht- und Rettungsplan „Haus 6/7 am Klinikum Mitte, Kellergeschoss“ (Stand Feb. 2023) als eigenes Bauteil `bie_H7_KG` (Ebene UG) mit 66 Räumen nach Raumnummern (U1 Sektionsraum, U2 Kühlraum/Kühlzellen, U16 Einsargung, U17 Aufbahrung, H6/7-KG.22 … KG.40) und vereinfachten Wänden, ohne Türen. Maßstab aus Raumflächen und Gebäudelänge (ca. 31 pt/m, ±5 %). Lage über die Bunkeraufzüge des Ärztehauses und den Tunnel zum Hauptgebäude eingepasst: Westende mit Ausgang zur Umfahrung zwischen Haus 6/7 und Parkhaus 2, Nordseite mit Verbindungsgang zum Neubau/Tunnel zum Hauptgebäude, Südseite mit Aufzügen zum Bunker und Treppenhaus. Das bisher angenommene Untergeschoss der OSM-Bauteile von Haus 7 entfällt; der Aufzug von Haus 7 steht an der Stelle laut Plan. Alle 852 Warenströme bleiben routbar.
- **Campus-Grün nach Luftbild**: 24 Grünflächen (ca. 1,9 ha: Park mit Teich, Rasen am Altbau, Gehölz südlich des Hauptgebäudes) und 240 Bäume (79 aus OpenStreetMap, 161 Baumkronen aus dem DOP NRW). Campuswege mit aktuellem OSM abgeglichen; Wegstücke durch Gebäude entfernt.
- **Keine Kollisionen**: Wände laufen nicht mehr durch Aufzugs- und Treppenschächte (Wand wird im Schacht ausgespart), angenommene Schächte und Einrichtung stehen wandfrei; neu gesetzte oder verschobene Objekte rücken automatisch an die nächste freie Stelle.
- **Etagen wie im Bestandsplan**: Fassaden und Fenster nur noch an echten Außenkanten (keine Fensterbänder, wo ein anderes Bauteil auf gleicher Höhe anschließt); in der Schnittansicht werden Aufzugs- und Treppenschächte wie die Wände geschnitten. Im Bielefeld-Projekt sind angenommene Schächte im Planbereich entfernt, Aufzugstüren zeigen zum Flur.
- **Etagenansicht Untergeschoss**: In U1/U2 erscheint nur dieses Geschoss, keine Sockel erhöhter Bauteile und keine tieferen Ebenen.
- **Häuser 2, 5, 8, 10, 11** aus der früheren Projektversion „Klinikum Bielefeld-Mitte – Bestand“ (15.10.2026) übernommen, inkl. Aufzügen, Treppen und dem Technik-Raum in Haus 8. Sie sind als Auswahl für „Gebäude ausblenden“ vorbelegt. Alle 852 Warenströme sind routbar.
