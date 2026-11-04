# Import aus OpenStreetMap und amtlichen Daten

Gilt für alle drei Editionen (Healthcare Simulation Suite, Fabric Planning Suite, Home Planning Suite). Aufruf über das Startfenster („Krankenhaus / Werk / Haus aus OpenStreetMap“) oder über **Gelände & Wege → Umgebung aus OpenStreetMap**.

## Ablauf

1. Adresse, Klinik oder Firma tippen. Die Vorschläge kommen aus Deutschland, Österreich und der Schweiz (Photon, ersatzweise Nominatim).
2. Unter „Genauigkeit“ wählen: amtliche Grundrisse (ALKIS NRW), Luftbild als Unterlage, Räume bzw. Zonen vorschlagen und (nur Home) das Raster am Haus ausrichten.
3. **Nur Umgebung** oder **Umgebung mit Krankenhaus / Werk / Haus**. Mit Ziel wird das Objekt als bearbeitbares Modell angelegt. Die Umgebung kommt als schlichte, nicht beschriftete Bebauung dazu.

| Edition | Ziel „mit …“ | Wie das Ziel gefunden wird |
|---|---|---|
| Healthcare | Krankenhaus | Klinikgelände `amenity=hospital` (gewählter Treffer, sonst Gelände am Punkt, sonst nächstes in 400 m) |
| Fabric | Werk / Fabrik | `man_made=works`, `industrial=*`, `power=plant`, sonst `landuse=industrial` bis 25 ha. Ist das Gewerbegebiet größer, gilt die zusammenhängende Gebäudegruppe (Abstand ≤ 14 m) um die Adresse |
| Home | Haus | Gebäude mit passender Hausnummer, sonst das Gebäude am Punkt, sonst das nächste in 35 m. Grundstück aus dem Flurstück (ALKIS) oder geschätzt |

Fabric übernimmt zusätzlich Tanks, Silos, Gasbehälter und Wassertürme als Rundbauten, Schornsteine, Türme und Krane als Objekte, dazu Werkszaun und Gleisanschluss. Home übernimmt Garage, Carport und Gartenhaus, Garten, Zäune, Hecken und Mauern auf dem Grundstück sowie Einzelbäume.

## Was der Import jetzt genauer macht

| Problem bisher | Lösung |
|---|---|
| Gebäude aus Multipolygonen (mehrere Teilstücke) wurden zerstückelt oder als Dreiecksfächer falsch gezeichnet | Die Teilstücke (`outer`/`inner`) werden zu geschlossenen Ringen zusammengesetzt |
| Innenhöfe waren zugebaut | Innenringe bleiben als Hof offen (`polyHoles` im Bauteil) |
| Gebäude mit gestaffelten Höhen (Sockel, Turm, Brücke) kamen als ein Klotz mit einer Höhe | `building:part` wird genutzt: jedes Teil mit eigener Höhe, `min_height`/`building:min_level` (schwebende Teile, Brücken) und Dachform |
| Zackige, schiefe Umrisse mit vielen Punkten, die man von Hand begradigen musste | Doppelpunkte, Zacken < 0,1 m und fast gerade Ecken (< 2°) werden entfernt. Nur Modellgebäude (Ziel des Imports) werden rechtwinklig gestellt, und nur wenn ≥ 90 % des Umfangs fast achsparallel liegen (± 4°) und keine Ecke um mehr als 0,35 m wandert. Gebäude der Umgebung bleiben lagetreu, damit Grenzbebauung, gemeinsame Wände und Lücken zwischen Nachbarn stimmen |
| Rechteckige Gebäude waren freie Vielecke ohne Griffe für Länge und Tiefe | Rechtecke werden als Rechteck-Bauteil mit Drehung angelegt (Griffe ⇔ ⇕ funktionieren). Vielecke liegen lokal in der Gebäudeachse |
| Hallen mit 3 × 3,8 m statt einer hohen Halle | `industrial`, `warehouse`, `manufacture`, `hangar` … werden zu Eingeschossern mit 5,5–11 m (bzw. `height` minus Dach) |
| Höhe ignorierte Dach und Sockel | Wandhöhe = `height` − `min_height` − `roof:height` (oder `roof:levels`). Ohne Dachhöhe wird sie für geneigte Dächer geschätzt |
| Nur Flachdächer | `roof:shape` → Satteldach, Walmdach, Zeltdach, Pultdach, Sheddach. Ohne Angabe: Wohnhäuser Satteldach, Nebengebäude flach bzw. Pult. `roof:angle`, `roof:height`, `roof:colour`, `building:colour` werden übernommen |
| Overpass überlastet → Import bricht ab | Ersatzweg über die OSM-API (`api.openstreetmap.org/api/0.6/map`), kachelweise bis 450 m Radius |
| Nicht erkennbar, was aus OSM stammt | Inspektor zeigt die Herkunft je Gebäude: Grundriss (OSM oder ALKIS), Geschosse (laut OSM, aus Höhe geschätzt, **angenommen – bitte prüfen**), Dachform |

## Nachbesserung Genauigkeit (Nov. 2026)

| Beobachtung | Ursache | Änderung |
|---|---|---|
| Umgebung wirkte gröber als vorher | Die automatische Leistungsanpassung schaltete auf „sparsam“ (75 % Bildauflösung), sobald mehr Gebäude und geneigte Dächer im Bild waren | Automatisch nie unter volle Auflösung („mittel“); „sparsam“ nur noch von Hand bzw. „maximal flüssig“ |
| Nachbargebäude verschoben, Lücken oder Überlappungen zwischen Reihenhäusern | Jedes Gebäude wurde einzeln rechtwinklig gestellt (± 9°), gemeinsame Wände wanderten unterschiedlich | Umgebung lagetreu; Modellgebäude nur bei kleiner Abweichung (± 4°, max. 0,35 m) |
| Garagen, Schuppen, Kioske fehlten | Mindestfläche der Umgebung 12 m² | Mindestfläche 5 m² |
| Werks- bzw. Klinikgelände nach dem Import leer (keine Wege, Parkplätze, Grün) | Auf dem Zielgelände wurden OSM-Wege und -Flächen immer verworfen; zusätzlich fiel alles in der konvexen Hülle der Modellgebäude weg (auch Nachbarn in Einbuchtungen) | Gelände nur dann ausgespart, wenn das Projekt dort schon eigene Außenanlagen hat; Hülle nur noch ohne Geländegrenze |
| Häuser mit roten Dächern sahen wie Backsteinbauten aus | Standardfarbe geneigter Dächer war Ziegelrot | Standard anthrazit/grau; Rot nur, wenn OSM `roof:colour=red` angibt. Bausteine ohne Klinker (Doppelhaus, Energiezentrale) |
| Bäume und Sträucher auf Wegen oder im Teich | Zufällige Bepflanzung prüfte nur Gebäude | Bepflanzung hält Abstand zu Wegen, Straßen, Wasser, Plätzen, Parkplätzen und Einzelbäumen |

## Amtliche Daten (bereits eingebaut)

| Quelle | Inhalt | Nutzung in der Suite |
|---|---|---|
| ALKIS NRW, WFS „ALKIS vereinfacht“ (`wfs.nrw.de/geobasis/wfs_nw_alkis_vereinfacht`), dl-de/zero-2.0 | amtliche Gebäudegrundrisse mit Funktion („Wohnhaus“, „Gebäude für Gewerbe“, „Garage“ …) und Lagebezeichnung; Flurstücke mit Nummer und Fläche | Grundrisse ersetzen die OSM-Umrisse; Geschosse und Dachform kommen weiter aus dem passenden OSM-Gebäude. Gebäude mit `building:part` behalten die detaillierteren OSM-Teile. Home: das Flurstück wird zum Grundstück |
| DOP NRW 10 cm (WMS), dl-de/zero-2.0 | Orthofoto | Luftbild-Unterlage („🛰 Luftbild“ in der Ansichtsleiste) |
| DOP Bayern 20 cm (WMS), CC BY 4.0 | Orthofoto | Luftbild-Unterlage |
| Esri World Imagery | Luftbild weltweit | Unterlage außerhalb NRW/Bayern (Nutzungsbedingungen von Esri beachten, für kommerzielle Projekte prüfen) |

Die Unterlage wird über ein Web-Mercator-Raster exakt aufs Modell projiziert (Nordwinkel und Lage stimmen) und folgt dem Gelände. Gespeichert wird nur die Einstellung (`settings.unterlage`), das Bild lädt bei Bedarf neu. Zum Prüfen „Umgebung: aus“ stellen, dann liegen nur die Modellgebäude auf dem Luftbild.

## Vorschläge für weitere Verbesserungen

Nach Nutzen für die Genauigkeit geordnet. Die ersten drei lassen sich mit vertretbarem Aufwand ergänzen.

1. **Gebäudehöhen aus 3D-Gebäudemodellen (LoD1/LoD2).** Die Bundesländer stellen 3D-Gebäudemodelle offen bereit (NRW, Bayern, Berlin, Hamburg, Brandenburg, Sachsen, Thüringen, Niedersachsen, Hessen, Baden-Württemberg). Sie enthalten gemessene Trauf- und Firsthöhen sowie die Dachform je Gebäude und ersetzen die geschätzten Geschosse. Meist gibt es sie als CityGML-Kacheldownload, ein WFS ist nicht überall vorhanden (für NRW habe ich keinen gefunden). Weg: Kachel zum Standort herunterladen und lokal einlesen (Dateiimport `.gml`/`.zip`) oder einen kleinen Konverter-Dienst nutzen.
2. **Höhen aus dem normalisierten Oberflächenmodell (nDOM).** NRW bietet das nDOM als offenen Dienst. Die mittlere Höhe innerhalb jedes Grundrisses ergibt eine gemessene Gebäudehöhe, auch dort, wo OSM keine Angabe hat. Das hilft besonders bei Hallen und Wohnhäusern.
3. **ALKIS weiterer Länder.** Das Produkt „ALKIS vereinfacht“ hat bundesweit dasselbe Schema. Für Länder mit offenem WFS (u. a. Berlin, Brandenburg, Sachsen, Thüringen, Hamburg) genügt ein weiterer Eintrag in `O.ALKIS` (Adresse und Gebietsgrenze).
4. **Geländehöhen.** Ein amtliches DGM (NRW: DGM1 als WCS) oder global die Copernicus-DEM-API (z. B. Open-Meteo Elevation) liefert die Geländeneigung. Die Suite kennt Neigung, Kuppen und Geländeniveaus; daraus ließe sich eine Ausgleichsebene plus Kuppen ableiten (wichtig bei Werken am Hang).
5. **Luftbild-Nachzeichnen.** Werkzeug „Umriss am Luftbild korrigieren“: Ecken eines Bauteils direkt auf dem Luftbild ziehen, mit Einrasten an Kanten (Kantenerkennung im Bild).
6. **Overture Maps / Google Open Buildings** als Ergänzung, wo OSM lückenhaft ist (vor allem ländliche Gewerbegebiete). Beide sind offen, liegen aber als große GeoParquet-Dateien vor. Dafür bräuchte es einen Abruf über einen Server (z. B. DuckDB-Abfrage), direkt aus dem Browser geht es nicht.
7. **Innenräume aus OSM** (`indoor=*`, `level=*`): Für manche Kliniken und Flughäfen gibt es Raumdaten. Sie ließen sich als Räume je Etage übernehmen.
8. **Qualitätsliste nach dem Import:** Tabelle aller Modellgebäude mit Quelle, Geschossen und Ampel (gemessen, geschätzt, angenommen) samt Sprung zum Gebäude. Die Daten dafür (`osmQuelle`) liegen schon im Projekt.

## Für Tests und Skripte

`HSS.osm.laden(geo, opt)`, `HSS.osm.uebernehmen(data, geo, opt, wahl)` und `HSS.osm.ausfuehren(data, prep, opt)` führen den Import ohne Dialog aus (siehe Dialogcode in `js/osm.js`). `HSS.osm.form(ring)` liefert die bereinigte Bauteilform eines Umrisses.
