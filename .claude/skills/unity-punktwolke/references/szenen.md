# Szenen-Katalog

## Bühne und Layoutraster

Welt = Folie mit 16 × 9 Einheiten: x von −8 (links) bis +8, y von −4,5 (unten) bis +4,5, z zur Kamera positiv. Bei 1600 px Breite entspricht 1 Einheit 100 px.

| Zone | Bereich | Inhalt |
|---|---|---|
| Titel-HUD | links oben bis y ≈ 2,3 (zweizeilig), Breite ≈ x −7,1 … 2 | `t`, `s`, Index |
| Schaltflächen + Hinweis | rechts oben, y > 2,6 | `B.act`, `B.hint` |
| Bühne | y −2,4 … 2,1 | Punktwolken, Beschriftungen |
| Detailfeld | links unten, x < −1, ab y ≈ −2,4 abwärts | `B.cap` |
| Kernaussage | rechts unten, x > 2,5, ab y ≈ −2,8 abwärts | `B.note` |
| Steuerleiste | ganz unten | automatisch |

Visualisierung bevorzugt rechts der Mitte (x 0 … 6), Text-Spalten links (x −6,95, `al:'l'`).

## Vorlagen `SZ.*` (in `assets/engine/bausteine.js`)

Gemeinsame Felder: `lab` (Name in Übersicht), `t` (Titel mit `<em>`), `s` (Untertitel), `note` (Kernaussage, HTML), optional `idx` (eigene Indexzeile).

| Vorlage | Bild | Interaktion | Daten |
|---|---|---|---|
| `SZ.titel` | Galaxie, umkreisende Knoten | Knoten springen zu Kapiteln | `kicker,title,em,sub,date,orbits:[{k,t,go}]` |
| `SZ.agenda` | Kapitelknoten auf Kurve mit Datenstrom | Klick wählt, 2. Klick öffnet | `items:[{n,t,d,list,go,count}]` |
| `SZ.kapitel` | große Ziffer (Serif) + Umlaufbahn | – (Atmosphäre) | `num,kap,items,focus` |
| `SZ.kennzahlen` | große Zahlen + Datenkugel | – | `kpis:[[zahl,text]],kern` |
| `SZ.radial` | Kern + 3–8 Knoten, Speichen fließen | Auswahl, Rundgang | `kern,items:[{t,d,chips}]` |
| `SZ.wandel` | Inseln → Ring (heute → Ziel) | Umschalten | `items:[[heute,ziel]],kern,capHeute,capZiel,labels` |
| `SZ.loesungen` | Problemwolke → Lösungskristall (≤ 4 Zeilen) | Zeile klicken, alle zeigen | `rows:[[p,pd,l,ld]],kopfL,kopfR,frage` |
| `SZ.prozess` | Stationen auf Partikelstrom (3–8) | Schritt wählen, Pain Points | `steps:[{t,d,pain}],cap` |
| `SZ.pyramide` | drehende 3D-Pyramide (2–5 Ebenen) | Ebene wählen | `levels:[{k,t,d}]` |
| `SZ.stufen` | steigende 3D-Blöcke + „Kirsche“ | Stufe wählen | `steps:[{k,t,d}],krone` |
| `SZ.roadmap` | Spuren × Phasen als Ströme, Zeitfront | Phase wählen, Abspielen | `phases:[..],lanes:[{w,c,it:[[start%,breite%,phase,text]]}]` |
| `SZ.dreiklang` | Wolke → Würfel → Kristall in 3 Spalten | Ebene für Ebene aufdecken | `cols:[[kopf,[[t,d],..]] ×3]` |
| `SZ.abschluss` | Fragen-Kugeln, „VIELEN DANK“ als Punktschrift | Frage fokussieren, Dank | `fragen,dank,zeile` |

Mengen-Grenzen beachten (Spalte „Daten“). Mehr Einträge → Folie teilen oder eigene Szene.

## PowerPoint-Muster → Szene

| Muster in der Folie | Szene |
|---|---|
| Titelfolie | `SZ.titel` |
| Agenda / Inhaltsverzeichnis | `SZ.agenda` |
| Kapiteltrenner | `SZ.kapitel` |
| 3–4 große Kennzahlen, „Über uns“ | `SZ.kennzahlen`; mit Standorten → Globus (Beispiel Folie 04, `globePts`) |
| Aufzählung gleichrangiger Punkte, Dimensionen, Säulen, Handlungsfelder | `SZ.radial` |
| Heute / Morgen, Ist / Soll, zwei Spalten im Vergleich | `SZ.wandel` (≤ 8 Paare) |
| Tabelle Problem → Lösung, Pain Point → Capability | `SZ.loesungen` |
| Chevron-/Prozesskette, Swimlane mit einer Bahn | `SZ.prozess`; mehrere Bahnen → Beispiel Prozesslandkarte (Folie 09) |
| Pyramide, Ebenenmodell | `SZ.pyramide` |
| Treppe, Reifegrad aufsteigend, Haus mit Fundament | `SZ.stufen`; Fundament/Dach → Beispiel KI-Fundament (Folie 23) |
| Gantt, Roadmap, Phasenplan | `SZ.roadmap` |
| Key Takeaways / Maßnahmen / Quick Wins | `SZ.dreiklang` |
| Fragen, Diskussion, Danke | `SZ.abschluss` |
| Hub & Spoke, Systemlandschaft mit Zentrum | Beispiel SAP MDM (Folie 13) |
| Architektur-Schichtenbild links → rechts | Beispiel Data-Lake (Folie 17) |
| Viele-zu-viele-Verbindungen vs. Integrationsschicht | Beispiel Data Fabric (Folie 18) |
| Spalten-Blueprint mit Kacheln | Beispiel Referenz-Blueprint (Folie 19) |
| Streudiagramm / Portfolio (x/y) | Beispiel SAP-Toollandschaft (Folie 16) |
| Kurve mit Optimum, Regler | Beispiel Governance-Balance (Folie 11) |
| Radar / Spinnennetz, Reifegrad je Dimension | Beispiel Reifegrad-Simulator (Folie 27) |
| Rollen, Personen, Organigramm-light | Beispiel Rollen (Folie 12, `figure()`) |
| Anteile Mensch / Maschine, Verschiebung über Stufen | Beispiel Copilot → Agent (Folie 24) |
| Timer, Vorstellungsrunde | Beispiel Folie 03 |
| Tabs innerhalb einer Folie | Beispiel Über UNITY (Folie 04, `st.tab`) |

Folien-Nummern beziehen sich auf `references/beispiel-zukunftsbild/` (`slides1.js` = 01–07, `slides2.js` = 08–18, `slides3.js` = 19–30; Inhalte in `data.js`).
