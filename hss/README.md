# Healthcare Simulation Suite

3D-Baukasten für Krankenhaus-Campus mit Simulation der Material-, Waren- und Personenflüsse. Entwickelt aus dem Patient-, Prozess- und Ressourcenmodell (BwZK v4) und im UNITY-Design gehalten.

## Start

```bash
python3 start.py              # im Repository-Hauptordner; öffnet die Suite im Browser
python3 start.py 8090         # mit festem Port
```

Die Suite läuft offline (three.js r160 liegt in `vendor/`) und lässt sich auch per Doppelklick auf `hss/index.html` öffnen. Über localhost bleiben Browser-Ablage und eigene Bibliotheksobjekte zuverlässiger erhalten.

**Demo-Modus** (Kopfzeile): lädt das *UNITY Hospital* – einen Schwerpunktversorger mit rund 650 Betten (Behandlungssockel mit zwei aufgesetzten Bettenhäusern, Eingangshalle, Kinderklinik, Altersmedizin/Psychiatrie, Logistikzentrum mit Tunnel und AWT, Verwaltung, Parkhaus, 23 Stationen) – und führt in 14 Schritten durch alle Funktionen.

**Standortmodelle** (Startdialog oder „Öffnen“): das *Bundeswehrzentralkrankenhaus Koblenz* (Gebäude und Straßen aus OpenStreetMap, Bestand und Soll-Variante), das *Klinikum Hanau* (Bestand und Variante 2 mit Neubau und Versorgungszentrum) und das *Klinikum Bielefeld-Mitte* (Bestand und Soll-Variante, aus dem bisherigen Modell `index.html`) als vollständige, bearbeitbare Projekte – mit Geschossen und Untergeschossen, Verbindungsgängen, Aufzügen, Funktionsbereichen, Pflegebereichen als Stationen und den Transportflüssen der jeweiligen 3D-Logistikmodelle. „Standort verorten“ (Gelände & Wege) setzt Geokoordinaten und Nordwinkel und verschiebt oder dreht das ganze Modell. Gespeicherte Standortmodelle älterer Stände lassen sich mit „Standortmodell aktualisieren“ auf die aktuelle Übernahme bringen; gelöschte Gebäude und Wege bleiben gelöscht, eigene Ergänzungen bleiben erhalten.

Werden nach einem Update nicht alle Arbeitsbereiche angezeigt, meldet die Suite beim Start, welche Datei nicht geladen wurde (meist veralteter Browser-Cache: Strg + F5). `start.py` liefert alle Dateien ohne Cache aus.

## Bedienung

| Aktion | Maus / Taste |
|---|---|
| Drehen | linke Maustaste ziehen · Q / E · Kompass rechts unten |
| Verschieben | rechte Maustaste ziehen (oder Umschalt + links) · W A S D / Pfeiltasten |
| Zoomen | Mausrad – zoomt zur Mausposition · + / − |
| Hinfliegen | Doppelklick ins Gelände oder auf ein Element · F zeigt die Auswahl |
| Draufsicht / Norden | T · Kompass-Tasten |
| Etage wechseln | Etagentasten links (wie im Aufzug) · Bild ↑ / Bild ↓ – die Kamera folgt der Höhe |
| Raster | „Raster“ in der Ansichtsleiste: außen 10-m-Raster auf dem Gelände, in Etagen 1-m-Raster; Koordinaten in der Bedienhilfe |
| m² Flächen | Ansichtsleiste „m² Flächen“: Räume nach DIN 277 eingefärbt und mit Fläche beschriftet; Flächenblatt je Etage (BGF, NUF 1–7, VF, TF, nicht belegt, Raumliste) und je Gebäude; Raumliste als CSV |
| Stationsrundgang | „▶ Stationsrundgang“: eine oder mehrere Stationen wählen, Raum für Raum mit Erklärung, Ausstattung und Logistik; zwischen Stationen per Aufzug |

## Arbeitsschritte

| Schritt | Inhalt |
|---|---|
| 1 · Gelände & Wege | Gelände mit Neigung, Kuppen, Mulden und Plateaus. Straßen, Zufahrten, Campuswege, Gehwege, Versorgungstunnel und AWT-Trassen in beliebiger Länge und Breite, gebogen (Kurvenglättung) und geneigt (Anhebung Anfang/Ende, Anzeige der Steigung). Parkplätze mit automatischer Stellplatzeinteilung, Grün-, Platz- und Wasserflächen. Fahrende Autos, Busse mit Halt an Haltestellen. Externe Orte (Lieferanten, Entsorger). |
| 2 · Gebäude | Bausteine (Bettenhaus, Neubau mit runden Ecken, Rundbau, Atrium, Funktionsbau, L-/U-Form, Altbau, Hochhaus, Parkhaus). Je Bauteil: Grundform, Länge/Tiefe, stufenlose Eckrundung, Geschosszahl, Geschosshöhe (auch je Geschoss), Untergeschosse, acht Fassadentypen mit Farben, Achsraster und Fensteranteil, Dach (Gründach, Technikaufbau, Hubschrauberlandeplatz). Bauteile andocken (nebeneinander, bündig), aufsetzen (übereinander), Glas- und Gebäudebrücken (mehrgeschossig, als Rampe bei Höhenversatz). |
| 3 · Etagen | Puppenhaus-Ansicht je Etage (Wände voll/halb/Grundriss, Explosionsansicht), auch Untergeschosse. Räume aufziehen, Wände zeichnen, Türen setzen, Aufzüge/Treppen und Ausstattung platzieren. |
| 4 · Stationsplaner | Grundriss nach Gebäudetiefe: einbündig, anderthalbbündig, zweibündig oder dreibündig mit Innenzone (tiefe Baukörper, zu tiefe Innenzonen mit Lichthof); kompakte Station am Erschließungskern, Funktionsräume am Kern, Patientenzimmer nach außen, Räume mit Tageslichtbedarf an der Fassade; Raumbreiten aus Programmfläche ÷ Raumtiefe mit Mindest- und Höchstbreiten (keine Schlauchräume), Nasszellen, Bettentüren, WC mit Vorraum, Querflure, Fluchttreppen bei langen Baukörpern; Restflächen als Reserve. Raumprogramm nach Landesvorgaben (RLP AH 2.01/2.03, Standardprogramm Schleswig-Holstein), DGUV 207-027, DIVI 2022 und ARGEBAU-Kennwerten; jeder Raum wird nach Raumart vollständig eingerichtet (Wand-Packer mit Türbereichen, Fenstern und Bewegungsflächen) – auch einzeln per „Automatisch einrichten“. Stationstyp, Fallzahlen je Jahr oder Monat (stationär und/oder ambulant), Verweildauer mit Vorschlagswerten, Gebäude und Etagen (auch halbe Etagen). Rechnet Bettenbedarf, Raumprogramm, Flächen-, Fassaden- und Gebäudetiefen-Prüfung – jeder Schritt als Frage, Erklärung, Rechnung und Ergebnis mit Quellenangabe – und belegt den Grundriss mit Ausstattung. „Quellen & Planungsgrundlagen“ erläutert jede Quelle. |
| 5 · Flüsse | 18 Standardflüsse (Speisen, Wäsche, Arzneimittel, Modulversorgung, Sterilgut, Abfall, Proben, Patienten, Betten, Anlieferung, Entsorgung, Post, Personal, Besucher) oder eigene Flüsse. Materialgruppen (rein/unrein), Fuhrpark (Handwagen, Schlepper, AWT, LKW, Bettentransport, Personen, Rohrpost), Zeitfenster, hinterlegte Fahrzeiten, Regeln (Reinigung nach Unrein-Fahrt, nach N Fahrten). |
| 6 · Simulation | Ereignisdiskreter Tagesablauf: Touren mit Bündelung (nur gleiche Reinheit, gleicher Start), Aufzugswarteschlangen, Waschanlage, Rückfahrten. Wiedergabe in 3D, Begleitfahrt in der Ich-Perspektive mit Aufzugsfahrt, freier Rundgang. |
| 7 · Analyse | Hotspots je Uhrzeit (Flure, Wege, Brücken, Aufzüge, Waschanlage, Hygiene-Kreuzungen), Heatmap, Fahrzeugbedarf mit Rechenweg, Zeitfensterplan (Gantt), Aufzugsauslastung, Export als CSV/JSON. |

## Speichern

- automatische Sicherung im Browser (letzter Stand + Projektablage in IndexedDB)
- „Speichern“ → Datei `*.hss.json` mit dem kompletten Modell und allen verwendeten eigenen Bibliotheksobjekten
- „Öffnen“ → Datei oder Projekt aus der Browser-Ablage laden und weiterbearbeiten

## Objektbibliothek

Rund 255 Objekte mit Standardmaßen: Raumausstattung (Patienten-TV, Sichtschutzvorhang, BtM-Tresor, Ausgussbecken, Abtropfregal, Handwaschplatz nach KRINKO, Reinigungswagen, Belegungstafel, Zentrale Überwachung, Pumpenregal, Duschliege, Paravent …), Medizintechnik (Betten, Intensiv, OP inkl. Hybrid-OP und Herz-Lungen-Maschine, Bildgebung inkl. Linearbeschleuniger und PET/CT, Labor, ZSVA, Kreißsaal, Fachambulanzen, Physiotherapie, Mobilität), Apotheke (Kommissionier- und Unit-Dose-Automat), Stationsausstattung, Logistik und AWT, Erschließung (Aufzüge, Treppen, Türen), Personen (Ärzte, Pflege, OP-Personal, Patienten, Besucher, Dienste), Fahrzeuge, Außenanlagen und Beleuchtung. Größen sind je Objekt anpassbar.

Neue Objekte ohne Programmänderung: in der App hochladen (`*.hssobj.json`, `*.hsslib.json`, `*.glb`) oder als Paket in `library/` ablegen und in `library/manifest.js` eintragen. Format: [`docs/OBJEKTFORMAT.md`](docs/OBJEKTFORMAT.md).

## Rechengrundlagen und Annahmen

| Größe | Ansatz |
|---|---|
| Bettenbedarf | Hill-Burton: Fälle × Verweildauer ÷ (365 × Auslastung); bei Monatswerten der Spitzenmonat |
| Verweildauer | Innere 5,3 d, Allgemeinchirurgie 5,1 d, Geriatrie 15,3 d (Destatis 2023), Allg. Psychiatrie 26,2 d, Psychosomatik 45,9 d (GBE-Bund 2023); übrige Fachrichtungen Richtwerte |
| Auslastung | Bettennutzungsgrade der Landeskrankenhauspläne: somatisch 85 %, Kinderheilkunde 80 %, Psychosomatik/Psychiatrie 90 % (DKG-Bestandsaufnahme); Intensiv, Palliativ, Stroke Unit: Annahme |
| Intensiv-Zimmer | DIVI-Empfehlung 2022; Bestandserhebung median 19 m² (Einzel) / 31 m² (Mehrbett); Planung mit 25 / 40 m² (Annahme) |
| Zimmerflächen | angelehnt an die Arbeitshilfen Pflege Rheinland-Pfalz (z. B. Geriatrie 1-Bett 21,0 m², 2-Bett 28,5 m² inkl. Nasszelle) |
| verfügbare Fläche | BGF × 82 % (Abzug Konstruktion, Schächte, Technik); Verkehrsfläche 40 % auf die Nutzfläche |
| Ambulante Plätze | Kontakte/Tag × Dauer ÷ (Öffnungszeit × Auslastung) |
| Transportzeit | Weglänge ÷ Geschwindigkeit des Transportmittels + Lade-/Entladezeit + Aufzugsfahrt inkl. Warteschlange + Rückfahrt |
| Hotspot | ≥ 60 % der Richtkapazität je Stunde (Flur 60, Tunnel 70, Weg 60, Brücke 50, AWT-Trasse 30 Wageneinheiten/h); Personen 0,05, Wagen/AWT 1, Bett 1,5, Routenzug 2 Wageneinheiten |
| Fahrzeugbedarf | Spitze gleichzeitiger Fahrzeuge und Einsatzstunden ÷ (Betriebszeit × 85 %); Empfehlung = max(Auslastung; 0,75 × Spitze) |

Mengen der Standardflüsse (z. B. 1,8 kg Wäsche je Pflegetag, 3 Tabletts je Bett) sind Planungsannahmen und je Fluss änderbar.

## Aufbau

```
hss/
  index.html            Oberfläche
  css/hss.css           UNITY-Gestaltung
  vendor/three-bundle.js three.js r160 + OrbitControls, TransformControls, GLTFLoader, Sky, RoomEnvironment
  js/core.js            Projektmodell, Undo/Redo, Speicherung
  js/library.js         Bibliothek, Format, Upload, Instancing
  js/build-gebaeude.js  Bauteile, Fassaden, Brücken, Innenausbau
  js/build-aussen.js    Gelände, Wege, Flächen, Verkehr
  js/network.js         automatisches Wegenetz, Routing
  js/scene.js           Darstellung, Ebenen, Auswahl, Werkzeuge
  js/sim.js             Flüsse, Regeln, Simulation, Hotspots, Wiedergabe
  js/station.js         Stationsplaner (Bedarf, Raumprogramm, Quellen)
  js/planer.js          Grundrissplanung je Geschoss (Bauweise, Lage der Räume, Wände, Türen)
  js/einrichtung.js     automatische Raumausstattung je Raumart
  js/flaechen.js        Flächenansicht nach DIN 277, CSV
  js/standorte.js       Standortmodelle Koblenz/Hanau, Verortung
  standorte/            Daten der Standortmodelle
  js/fpv.js             Ich-Perspektive
  js/tour.js            Stationsrundgang (Spielmodus)
  js/nav.js             Navigation, Kompass, Etagentasten, Raster
  js/ui*.js, demo.js    Oberfläche, Demo
  library/              Bibliothekspakete
  docs/                 Formatbeschreibung
```
