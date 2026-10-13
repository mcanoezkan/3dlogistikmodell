# Healthcare Simulation Suite

3D-Baukasten für Krankenhaus-Campus mit Simulation der Material-, Waren- und Personenflüsse. Entwickelt aus dem Patient-, Prozess- und Ressourcenmodell (BwZK v4) und im UNITY-Design gehalten.

## Start

```bash
python3 start.py              # im Repository-Hauptordner; öffnet die Suite im Browser
python3 start.py 8090         # mit festem Port
```

Die Suite läuft offline (three.js r160 liegt in `vendor/`) und lässt sich auch per Doppelklick auf `hss/index.html` öffnen. Über localhost bleiben Browser-Ablage und eigene Bibliotheksobjekte zuverlässiger erhalten.

**Demo-Modus** (Kopfzeile): lädt das voll ausgestattete *UNITY Hospital* und führt in 13 Schritten durch alle Funktionen.

## Arbeitsschritte

| Schritt | Inhalt |
|---|---|
| 1 · Gelände & Wege | Gelände mit Neigung, Kuppen, Mulden und Plateaus. Straßen, Zufahrten, Campuswege, Gehwege, Versorgungstunnel und AWT-Trassen in beliebiger Länge und Breite, gebogen (Kurvenglättung) und geneigt (Anhebung Anfang/Ende, Anzeige der Steigung). Parkplätze mit automatischer Stellplatzeinteilung, Grün-, Platz- und Wasserflächen. Fahrende Autos, Busse mit Halt an Haltestellen. Externe Orte (Lieferanten, Entsorger). |
| 2 · Gebäude | Bausteine (Bettenhaus, Neubau mit runden Ecken, Rundbau, Atrium, Funktionsbau, L-/U-Form, Altbau, Hochhaus, Parkhaus). Je Bauteil: Grundform, Länge/Tiefe, stufenlose Eckrundung, Geschosszahl, Geschosshöhe (auch je Geschoss), Untergeschosse, acht Fassadentypen mit Farben, Achsraster und Fensteranteil, Dach (Gründach, Technikaufbau, Hubschrauberlandeplatz). Bauteile andocken (nebeneinander, bündig), aufsetzen (übereinander), Glas- und Gebäudebrücken (mehrgeschossig, als Rampe bei Höhenversatz). |
| 3 · Etagen | Puppenhaus-Ansicht je Etage (Wände voll/halb/Grundriss, Explosionsansicht), auch Untergeschosse. Räume aufziehen, Wände zeichnen, Türen setzen, Aufzüge/Treppen und Ausstattung platzieren. |
| 4 · Stationsplaner | Stationstyp, Fallzahlen je Jahr oder Monat (stationär und/oder ambulant), Verweildauer mit Vorschlagswerten, Gebäude und Etagen (auch halbe Etagen). Rechnet Bettenbedarf, Raumprogramm, Flächen-, Fassaden- und Gebäudetiefen-Prüfung mit Rechenweg und belegt den Grundriss mit Ausstattung. |
| 5 · Flüsse | 18 Standardflüsse (Speisen, Wäsche, Arzneimittel, Modulversorgung, Sterilgut, Abfall, Proben, Patienten, Betten, Anlieferung, Entsorgung, Post, Personal, Besucher) oder eigene Flüsse. Materialgruppen (rein/unrein), Fuhrpark (Handwagen, Schlepper, AWT, LKW, Bettentransport, Personen, Rohrpost), Zeitfenster, hinterlegte Fahrzeiten, Regeln (Reinigung nach Unrein-Fahrt, nach N Fahrten). |
| 6 · Simulation | Ereignisdiskreter Tagesablauf: Touren mit Bündelung (nur gleiche Reinheit, gleicher Start), Aufzugswarteschlangen, Waschanlage, Rückfahrten. Wiedergabe in 3D, Begleitfahrt in der Ich-Perspektive mit Aufzugsfahrt, freier Rundgang. |
| 7 · Analyse | Hotspots je Uhrzeit (Flure, Wege, Brücken, Aufzüge, Waschanlage, Hygiene-Kreuzungen), Heatmap, Fahrzeugbedarf mit Rechenweg, Zeitfensterplan (Gantt), Aufzugsauslastung, Export als CSV/JSON. |

## Speichern

- automatische Sicherung im Browser (letzter Stand + Projektablage in IndexedDB)
- „Speichern“ → Datei `*.hss.json` mit dem kompletten Modell und allen verwendeten eigenen Bibliotheksobjekten
- „Öffnen“ → Datei oder Projekt aus der Browser-Ablage laden und weiterbearbeiten

## Objektbibliothek

Rund 180 Objekte mit Standardmaßen: Medizintechnik (Betten, Intensiv, OP, Bildgebung, Labor, ZSVA, Mobilität), Stationsausstattung, Logistik und AWT, Erschließung (Aufzüge, Treppen, Türen), Personen (Ärzte, Pflege, OP-Personal, Patienten, Besucher, Dienste), Fahrzeuge, Außenanlagen und Beleuchtung. Größen sind je Objekt anpassbar.

Neue Objekte ohne Programmänderung: in der App hochladen (`*.hssobj.json`, `*.hsslib.json`, `*.glb`) oder als Paket in `library/` ablegen und in `library/manifest.js` eintragen. Format: [`docs/OBJEKTFORMAT.md`](docs/OBJEKTFORMAT.md).

## Rechengrundlagen und Annahmen

| Größe | Ansatz |
|---|---|
| Bettenbedarf | Hill-Burton: Fälle × Verweildauer ÷ (365 × Auslastung); bei Monatswerten der Spitzenmonat |
| Verweildauer | Innere 5,3 d, Allgemeinchirurgie 5,1 d, Geriatrie 15,3 d (Destatis 2023), Allg. Psychiatrie 26,2 d, Psychosomatik 45,9 d (GBE-Bund 2023); übrige Fachrichtungen Richtwerte |
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
  js/station.js         Stationsplaner
  js/fpv.js             Ich-Perspektive
  js/ui*.js, demo.js    Oberfläche, Demo
  library/              Bibliothekspakete
  docs/                 Formatbeschreibung
```
