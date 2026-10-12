# Indoor-Recyclingannahmestelle · Struktur-, Prozess- und Wirtschaftlichkeitsmodell 3D

Interaktives 3D-Modell einer Indoor-Recyclingannahmestelle in einem Bestandsgebäude (Beispiel: Bau- und Gartenmarkt in einer Großstadt). Es dient als digitale Machbarkeitsstudie: Flächen, Kunden-, Material- und Personalflüsse, Behälter, Transporte, Kosten und vier Konzeptvarianten lassen sich in einer Ansicht bewerten. Gestaltung und Bedienung folgen dem Logistikmodell im Hauptordner.

Die Anwendung ist eine einzige Datei (`index.html`) und läuft offline, weil three.js r160 am Dateiende eingebettet ist.

## Start über localhost

```bash
cd recyclinghalle
python3 start.py          # wählt einen freien Port und öffnet den Browser
python3 start.py 8091     # alternativ mit festem Port
```

Ohne Startskript:

```bash
cd recyclinghalle
python3 -m http.server 8091 --bind 127.0.0.1
# dann http://localhost:8091/index.html öffnen
```

`index.html` lässt sich auch direkt per Doppelklick öffnen.

## Bedienung

| Bereich | Inhalt |
|---|---|
| Top-Bar | Indoor/Outdoor, Varianten A–D (A = Ist/Referenz), Explosionsansicht, Heatmap (Kundenfrequenz, Materialbewegungen, Personalbewegungen, Behälterauslastung), Gebäudehülle, Beschriftung, Managementmodus |
| Ebenen | Fraktionen einzeln ein-/ausblenden (Behälter, Sammelpunkte, Materialflüsse), Prozesse (Material, Kunde, Personal, LKW), Behälter, Ausstattung, Kontext, Konfliktpunkte, Animation, Einfärbung nach Flächenkategorie, Prozess-Tour |
| Bereiche | Suche, Filter nach Flächenkategorie und Bereichsgruppe, Liste aller Funktionsbereiche |
| Flächen | Automatische Flächenbilanz (Funktions-, Verkehrs-, Sicherheits-, Pufferflächen), Kennwerte, Weglängen je Kundentyp, Konfliktpunkte, Datenprüfung |
| Varianten | Variantensteckbriefe, Auswirkungen ggü. Variante A, Indoor/Outdoor-Vergleich |
| Klick auf Bereich | Fläche, Fraktionen, Behälter, Kapazität, Mengen, angeschlossene Prozesse, Füllgrade, Risiken, Verbesserungspotenziale |
| Tagesachse | Annahmemengen je Stunde und Fraktion, Kundenkurve, LKW-Zeitfenster; Klick auf eine Stunde steuert Heatmap und Animation |
| Managementmodus | Kennzahlenkacheln, Mengen je Fraktion, Kostenstruktur, Investitionen, Transporte, Wirtschaftlichkeitsszenarien, Variantenvergleich mit Bewertungsmatrix |

Tastatur: `Esc` beendet Tour, Managementmodus oder Auswahl; `+`/`−` zoomen.

## Daten ersetzen

Alle fachlichen Inhalte stehen im Block `RAS_DATA` am Anfang von `index.html`. Die Visualisierungslogik liest nur diese Struktur.

- `standorte.indoor`: Halle, Bereiche (`areas` mit `rects`, `zugang`, `behaelter`, `ausstattung`, Risiken, Potenzialen), Wege, Kundentypen, Material- und Personalflüsse, Prozess-Touren. Das ist Variante A.
- `varianten.B–D.patch`: Änderungen gegenüber A (Deep-Merge; `null` entfernt einen Eintrag).
- `standorte.outdoor`: kleines Outdoor-Konzept zum Vergleich.
- `fraktionen`, `behaelterTypen`, `ausstattungTypen`, `fahrzeuge`, `kosten`, `profile`, `wirtschaftsSzenarien`.

Wegenetz, Tore in der Hallenwand, Routen, Behälteraufstellung, Füllstände, Abholfrequenzen, Konfliktpunkte, Flächenbilanz und Kosten werden daraus berechnet. Werte mit `src: 'erhoben'` bzw. `daten: 'erhoben'` gelten als belegt, alles andere wird im UI als „Annahme“ gekennzeichnet. Die Datenprüfung im Reiter „Flächen“ meldet fehlende Bezüge, nicht routbare Flüsse, überfüllte Flächen und Behälterüberlauf.

## Grundlage und Grenzen

- Kein realer Standort: Layouts, Mengen, Zeiten und Kosten sind Platzhalter (Liste unter „⚑ Annahmen“).
- Mengen je Fraktion = Besuche × kg/Besuch × Anteil. Füllstände werden stündlich simuliert, Wartezeiten nicht.
- Abholfrequenz = Maximum aus Nutzlast, Ladevolumen und Lagerkapazität; indoor als Sammeltour je Fahrzeugtyp.
- Bedienbarkeit und Skalierbarkeit sind Experteneinschätzungen (1–5).
