---
name: unity-punktwolke
description: Überführt PowerPoint-Folien (.pptx, Folieninhalte oder eine bestehende HTML-Präsentation) in eine interaktive UNITY-Präsentation im animierten Punktwolken-Stil – eine Offline-HTML-Datei, in der jede Folie eine 3D-Szene aus leuchtenden Lichtpunkten ist (WebGL, Glow, Kameraflug, Morphing zwischen Folien, anklickbare Elemente). Immer verwenden, wenn der Nutzer Folien „im Punktwolken-Stil“, „wie Zukunftsbild Controlling“, „wie Closed Loop Medication“, „animiert / interaktiv / mit Wow-Effekt im UNITY-Stil“ haben will, PowerPoint-Elemente in interaktive Punktwolken überführen möchte oder eine bestehende Punktwolken-Präsentation erweitern oder ändern will. Nicht für normale .pptx-Dateien ohne diesen Stil.
---

# UNITY-Präsentation im Punktwolken-Stil

Ergebnis ist **eine** HTML-Datei, die offline in Edge/Chrome läuft. Jede Folie ist eine Szene aus bis zu 46 000 Lichtpunkten auf UNITY-Dunkelblau (#0A223C), mit Bloom, leichter Kamerabewegung und Klick-Interaktion. Beim Folienwechsel fliegen die Punkte in die nächste Form. Text steht nur als Titel-HUD oben links, als Beschriftung im Raum und als Detailfeld unten links – **keine PowerPoint-Kästen**.

Vorbild ist das Deck „Zukunftsbild Controlling“ (30 Folien) in `references/beispiel-zukunftsbild/`.

## Grundhaltung

- PowerPoint-Elemente werden **übersetzt, nicht nachgebaut**: Liste → Knoten auf Umlaufbahn oder Datenstrom; Vorher/Nachher → Wolke, die sich zur Ordnung fügt; Pyramide → drehende 3D-Pyramide; Diagramm → Radar/Achsen aus Punkten; Prozess → fließender Partikelstrom durch Stationen; Problem/Lösung → chaotische Wolke, aus der ein Kristall entsteht.
- Jede Folie bekommt **eine Interaktion** (Auswahl, Umschalten, Abspielen, Ziehen). Der Hinweis oben rechts sagt, was geht.
- Inhalt vollständig übernehmen. Lange Texte in Detailfeld (`cap`), Kernaussage (`note`) oder Auswahl-Details verlagern statt alles gleichzeitig zu zeigen.
- Farben: Akzent Mint `C.acc` für Ziel/Auswahl, `C.pain` (Beere) für Probleme, Blau/Petrol für Struktur. Rot/Gelb (`C.red`, `C.yel`) **nur für Ampel-Bewertungen**.
- Sprache Deutsch, Titel als Aussage-Satz mit `<em>Akzent</em>`.

## Ablauf

1. **Quelle lesen**
   - `.pptx`: `python3 -I scripts/pptx_lesen.py <datei.pptx> <scratchpad>/folien.md` und die Markdown-Ausgabe lesen (Titel, Texte mit Ebenen, Tabellen, Diagrammwerte, Notizen).
   - HTML-Bundle (claude.ai-Export mit `__bundler/manifest`): Manifest per Python entpacken (base64, ggf. gzip), dann `template.html` und Logik-Skript lesen.
   - Bilder/Logos fremder Marken nicht nachbauen; Kundennamen als Text.
2. **Folienplan** erstellen: je Folie die passende Szene aus `references/szenen.md` wählen (Tabelle „PowerPoint-Muster → Szene“). Kapitel festlegen. Bei mehr als ~15 Folien den Plan kurz mit dem Nutzer abstimmen, sonst direkt bauen.
3. **Deck anlegen**: `python3 scripts/neues_deck.py <ordner> "<Titel>"` → `deck.json` + `deck.js` (Vorlage mit allen Szenen). Ordner im Projekt (z. B. `praesentationen/<name>/`), nicht im Scratchpad.
4. **deck.js schreiben**: `DECK` (Kennung, Kapitel `[Name, erster Folienindex]`) und je Folie `SLIDES.push(SZ.<vorlage>({...}))`. Wo keine Vorlage passt, eine eigene Szene nach `references/engine-api.md` bauen – dazu die passende Folie aus `references/beispiel-zukunftsbild/` als Ausgangspunkt kopieren (Globus, Balance-Regler, Toollandschaft, Data Lake, Data Fabric, Rollen-Figuren, KI-Kuppel, Radar u. a.). Umfangreiche Inhalte in eigene `data.js` legen und in `deck.json` unter `files` vor `deck.js` eintragen.
5. **Bauen**: `python3 scripts/build.py <ordner>` → `<ordner>/<Titel>.html`.
6. **Prüfen** (Pflicht): `node scripts/pruefen.js <datei.html> <scratchpad>/shots` rendert jede Folie, klickt alle Schaltflächen und Klickflächen und meldet JS-Fehler. Danach **jeden Screenshot ansehen** und korrigieren:
   - Überlappungen mit Titel-HUD (oben links bis y ≈ 2,3), Detailfeld (unten links, x < −1, y < −2,4), Kernaussage (unten rechts) und Schaltflächen (oben rechts, y > 2,6).
   - Beschriftungen, die über den Rand laufen (x > 7,5 oder x < −7,6).
   - Zustände nach Interaktion: mit `STATE[i].<feld>=…;refresh()` im Test setzen und erneut fotografieren.
   Iterieren, bis alles sauber ist. Headless läuft Software-Grafik (langsam); auf echter Hardware ist es flüssig.
7. **Ausliefern**: Datei an den Nutzer senden, kurz beschreiben, welche Folie welche Interaktion hat, und offene Punkte (Übersetzungen, widersprüchliche Zahlen) nennen.

## Bedienung der fertigen Datei (dem Nutzer mitteilen)

←/→/Leertaste Folien · 1–9 Kapitel · O Übersicht · F Vollbild · Klick auf Elemente · Ziehen dreht · Mausrad zoomt · Doppelklick setzt zurück · `?s=5` in der URL öffnet Folie 6.

## Dateien

- `assets/engine/` – Engine (`engine.js` Partikel/Kamera/WebGL/Beschriftungen, `bausteine.js` Hilfsfunktionen + Szenen-Vorlagen `SZ.*`, `main.js` Navigation, `shell.html` Layout/CSS, `logo.svg` UNITY-Logo weiß). Nicht pro Deck kopieren; nur wenn ein Deck die Engine ändern muss, die Datei in `<ordner>/engine/` ablegen – `build.py` nimmt dann diese.
- `assets/deck-vorlage.js` – Startvorlage mit allen Szenen.
- `references/szenen.md` – Katalog der Vorlagen, Muster-Zuordnung, Layoutraster. **Vor dem Folienplan lesen.**
- `references/engine-api.md` – API für eigene Szenen (Gruppen, Pfade, Labels, Hotspots, Zustände). Lesen, sobald eine Folie keine Vorlage nutzt.
- `references/beispiel-zukunftsbild/` – vollständiges 30-Folien-Deck als Codebeispiel.
- `scripts/` – `pptx_lesen.py`, `neues_deck.py`, `build.py`, `pruefen.js`.
