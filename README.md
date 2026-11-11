# UNITY · 3D-Logistikmodelle

## Drei Suiten aus einem Baukasten

| Datei (Doppelklick, offline) | Edition | Schwerpunkt |
|---|---|---|
| `Healthcare_Simulation_Suite.html` | `health` | Krankenhäuser: Stationsplaner, Klinik-Planer, Material-, Waren- und Personenflüsse (wie bisher) |
| `Fabric_Planning_Suite.html` | `fabrik` | Fabriken und Werke: Produktions-, Lager- und Hochregalhallen mit Shed-, Sattel- und Pultdach, Maschinen, Fördertechnik, Regale, Stapler, FTS, Silos, Tanks; Hallenausbau mit Fahr-/Gehwegen, Bodenmarkierung, FTS-Leitlinien, Rollenbahnen, Kran und bewegten Personen/Fahrzeugen; Zonen Wareneingang → Lager → Produktion → Montage → Versand; Standardflüsse der Fabrik mit Stapler, Routenzug, FTS und LKW; Demo „UNITY Werk“ |
| `Home_Planning_Suite.html` | `home` | Häuser und Wohnungen: Einfamilienhaus, Stadtvilla, Bungalow, Doppel-/Reihenhaus, Mehrfamilienhaus, Garage, Gartenhaus mit Dachformen; über 50 Möbel und Ausstattungen; „Grundriss vorschlagen“ legt Räume mit Türen und Möbeln an; Demo „Musterhaus“ |

Alle drei teilen denselben Quellcode in `hss/`; die Edition steuert Namen, Startfenster, Arbeitsbereiche, Gebäudebausteine, Raumtypen, Bibliothek, Demo und das Ziel des OpenStreetMap-Imports (**Nur Umgebung** oder **Umgebung mit Krankenhaus / Werk / Haus**). Projekte und Browser-Ablage sind je Edition getrennt.

```bash
python3 tools/build_einzeldatei.py          # baut alle drei Einzeldateien (oder: … fabrik / home / health)
python3 start.py fabrik                     # Entwicklungsstand im Browser (auch: home, ohne Angabe = Healthcare)
```

**Fabric Planning Suite 1.4 – Hallenausbau & Intralogistik, ohne Flackern, ohne Klinikbegriffe**

- **Hallenausbau** (Produktionsplaner → „Hallenausbau & Intralogistik“: *Halle ausbauen* / *Alle Hallen ausbauen*): Die Suite legt in jeder belegten Halle ein durchgehendes Wegenetz an und macht aus losen Maschineninseln eine zusammenhängende Fabrik:
  - **Wege und Bodenmarkierung** nach ASR A1.8/A1.3: Hauptfahrweg 4,5 m mit gelber Fahrwegbegrenzung, Mittellinie und Fahrtrichtungspfeilen, Querwege zu jedem Bereich, Nebengänge, grüner Gehweg (1,2 m) mit Fußgängersymbolen, Schutzgeländer und Zebrastreifen an jeder Einmündung, gelb gestrichelte Flächenmarkierung der Produktionsbereiche, weiß umrandete Bereitstell- und Pufferzonen mit Paletten, Gitterboxen und Leerpaletten.
  - **Intralogistik**: FTS-Leitlinie mit Stichstrecken in die Querwege, Haltemarken und Ladestation; Rollenbahnen von jedem Bereich zum Übergabeplatz am Gehweg; Brückenkran (Hallen ab 8,5 m) bzw. Elektrohängebahn über dem Fahrweg; Stützenraster mit gelb-schwarzem Anfahrschutz; Hallenleuchten; Sektionaltore.
  - **Ausstattung**: Verkehrsspiegel an Kreuzungen, Fluchtwegschilder, Feuerlöscher an den Stützen, Erste-Hilfe-Station, Abfalltrennstation, Teamtafel, Pausenzone, Spinde, Wasserspender.
  - **Hallenleben**: Gabelstapler (mit und ohne Palette), Routenzüge, Unterfahr-FTS mit KLT-Regal, Schwerlast-FTS mit Großmotor, Werker mit Behältern, Logistiker mit Kommissionierwagen bewegen sich auf ihren Wegen (Fahrzeuge halten Abstand zum Vordermann, Personen gehen rechts), KLT laufen über die Rollenbahnen, Gehänge über die Hängebahn, der Kran fährt. Der Fahrzeugmix folgt den Materialflüssen der Halle (Routenzug, Schwerlast-FTS, Stapler).
  - Hallen ab 20 m Breite: Der Produktionsplaner hält das Hauptverkehrsband (Fahrweg + Gehweg, 7,1 m) frei; zwischen Bereichen bleiben 4 m Querweg. Deckenebene (Kran, Hängebahn, Leuchten, Stützen in voller Höhe) erscheint bei „Wände voll“ und beim Begehen, im Etagenschnitt bleibt der Blick frei. Beides abschaltbar.
- **Neues Bibliothekspaket „Hallenausstattung & Intralogistik“** (`hss/library/hallenausstattung.js`, 20 Objekte) in den Kategorien Fabrik/Intralogistik, Fabrik/Personen und Fabrik/Hallenausstattung.
- **Kein Flackern mehr**: Die Nahebene der Kamera wird mit dem Abstand zum Blickziel mitgeführt (Tiefenauflösung bei 300 m Abstand rund 20-mal feiner), Wände liegen 3 cm innerhalb des Grundrisses, Fensterbänder und Geschosslinien 2,5 cm davor – aneinanderstoßende Hallen, Fassadenbänder, Giebel und Bodenmarkierungen teilen sich keine Ebene mehr. Gilt für alle drei Editionen.
- **Keine Krankenhausbegriffe in der Fabric Planning Suite** (`hss/js/fabrik-begriffe.js`): klinikspezifische Bibliotheksobjekte ausgeblendet und Schlagworte bereinigt, Fachbereiche der Flächenplanung (Montage, Mechanische Fertigung, Lackiererei, Prüffeld, Wareneingang, Supermarkt, Versand …), zentrale Orte, Transportmittel und Quellen der Fabrikplanung; verbliebene Formulierungen werden auf allen Oberflächen ersetzt. Geprüft mit einem automatischen Durchlauf über Startfenster, alle Arbeitsbereiche und Reiter, Bibliothek, Stammdaten und Hilfe.
- **Werk 1 Friedrichshafen** neu erzeugt: 40 Hallen ausgebaut (Wege, Markierungen, FTS, Rollenbahnen, Krane, Ausstattung, Hallenleben); die Demo „UNITY Werk“ wird ebenfalls ausgebaut.

**Fabric Planning Suite 1.3 – Produktionsplaner und Werk 1 Friedrichshafen**

- **Produktionsplaner** (Arbeitsbereich links, wie der Stationsplaner): Fertigungsprinzip wählen – Montagelinie (Fließ-/Taktmontage), Serienfertigung (verkettete Bearbeitung), Fertigungsinseln, Werkstattfertigung, Lackiererei, Prüffeld, Lager –, Stückzahl, Zeiten, Schichten, OEE angeben und Halle wählen. Die Suite rechnet Takt, Werker, Stationen, Maschinen, Prüfstände und Fläche mit Rechenweg und Grundlagen (REFA, VDMA 66412, ASR A1.8/A1.2, Fabrikplanung, Herstellerangaben) und legt das Layout mit allen Maschinen, Linienmodulen und Umfeld in die Halle; mehrere Bereiche hintereinander in einer Halle.
- **Großmotoren-Module**: 12V/16V/20V-Motoren (Baureihen-Klassen 2000/4000), Schwerlast-FTS, Montagestation im 8-m-Raster mit Arbeitsbühnen, Puffer, FTS-Kurven, Portal-BAZ für Kurbelgehäuse, Kurbelwellen-Dreh-Fräszentrum, Prüfzelle mit Leitwarte, Lackiererei (Vorbehandlung, Spritzkabine, Trockner, Abkleben, Skidförderer, Mischraum). Linienleiste erkennt die Familie (Pkw 3-m-Takt / Großmotor 8-m-Raster).
- **Hallenboden**: Gelände und Flächen unter Gebäuden liegen jetzt immer unter der Bodenplatte – auch bei neu gesetzten Hallen.
- **Planungsmodell Werk 1 Friedrichshafen** in [`projekte/RollsRoyce_Werk1`](projekte/RollsRoyce_Werk1): alle Werksgebäude aus OpenStreetMap, ausgestattet, mit 30 Materialflüssen; belegte und angenommene Funktionen getrennt dokumentiert. Demo-Video: [`marketing/FPS_Werk1_Friedrichshafen_Demo_60s_Realistisch.mp4`](marketing/FPS_Werk1_Friedrichshafen_Demo_60s_Realistisch.mp4).

**Fabric Planning Suite 1.2 – Produktionsmodule (Motorenwerk)**: Neue Bibliothekssektion **Produktionsmodule** mit Größen im Maßstab eines Motorenwerks (Horizontal-BAZ ca. 2,8 × 5,6 × 3,2 m, Taktlänge der Montagelinie 3,0 m, Werkstückträger 0,8 × 0,8 m):

- **Produktionsinseln**: Fertigungsinsel Zylinderkopf (2 BAZ, Roboter, Be-/Entladeband, Schutzzaun, Waschen, SPC-Messplatz, Schaltschränke, KSS, Späne), Fertigungsinsel Kurbelwelle (Drehen, 2× Schleifen, Portallader), Montageinsel U-Form, Roboterzelle mit Wendetisch
- **Produktionsstationen (Werkstattfertigung)**: Fräsen, Drehen, Honen, Messraum mit KMG, Motorenprüfstand (Heißtest-Zelle mit Leitwarte), Nacharbeit – jeweils mit Werkzeugschrank, Werkbank, Kran, Gitterboxen, Bodenmarkierung und Werker
- **Produktionslinie aus Modulen**: Linienanfang, Montagestation (beid-/einseitig), Automatikstation, Prüfstation, Förderstrecken 3 m / 1,5 m, Drehmodul 90° rechts/links, Wendemodul 180° (Achsabstand 9 m mit Versorgungsgang), Linienende. Am gewählten Modul hängen **＋ Station**, **＋ Förderer**, **↱ / ↰ 90°**, **⮌ 180°** und **⏹ Ende** das nächste Modul passend an; **⚙ Linie** am Linienanfang baut eine ganze Linie (Anzahl Stationen, optional U-Form)
- **Hardware**: Bearbeitungszentren, Drehmaschine, Schleifmaschine, KMG, Waschanlage, Roboter, Säulenschwenkkran, Durchlaufregal, Schrauber am Balancer, Motor, Motorblock, Zylinderkopf u. a.

**Erdgeschoss-Ansicht korrigiert (alle Editionen)**: In der Etagenansicht zeigt jedes Gebäude seinen Boden; Gelände und Flächen (Grünfläche, Platz, Parkplatz …) unter dem Grundriss scheinen nicht mehr durch, Bäume und Sträucher werden in Gebäudegrundrissen nicht mehr gesetzt.

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
- **Außenwege** bleiben in der Etagenansicht bis U1 sichtbar.
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
- **Häuser 2, 5, 8, 10, 11** aus der früheren Projektversion „Klinikum Bielefeld-Mitte – Bestand“ (15.10.2026) übernommen, inkl. Aufzügen, Treppen und dem Technik-Raum in Haus 8. Sie sind als Auswahl für „Gebäude ausblenden“ vorbelegt. Alle 852 Warenströme sind routbar.
