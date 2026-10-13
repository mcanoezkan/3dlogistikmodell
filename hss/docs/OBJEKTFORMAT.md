# Objektformat der Bibliothek (`hss-object`)

Die Objektbibliothek der Healthcare Simulation Suite ist datengetrieben. Ein neues Objekt braucht keine Programmänderung: Datei in der App hochladen (Bibliothek → „Eigene Objekte hochladen“) oder als Paket in `library/` ablegen und in `library/manifest.js` eintragen.

## Dateiarten

| Datei | Inhalt | Weg in die Suite |
|---|---|---|
| `*.hssobj.json` | ein Objekt | Upload in der App |
| `*.hsslib.json` | Paket mit mehreren Objekten | Upload in der App |
| `*.glb` / `*.gltf` | 3D-Modell (Blender, Herstellerdaten, BIM-Export) | Upload; Name, Kategorie und Standardmaße werden abgefragt, das Modell wird eingebettet |
| `library/*.js` | Standardpaket, ruft `HSS.library.registerPack({...})` auf | Datei ablegen, Dateiname in `library/manifest.js` ergänzen |

Hochgeladene Objekte speichert der Browser (IndexedDB). Projektdateien (`*.hss.json`) enthalten alle darin verwendeten eigenen Objekte und lassen sich deshalb ohne die Upload-Datei auf einem anderen Rechner öffnen.

## Koordinaten und Maße

- Meter. `size.w` = Breite (x), `size.d` = Tiefe (z), `size.h` = Höhe (y).
- Ursprung = Mitte der Grundfläche auf dem Boden. Vorderseite zeigt nach **+z** (Fahrzeuge: Front nach +z, Betten: Kopfende bei −z).
- `parts` werden **in Standardgröße** beschrieben. Ändert man im Projekt die Größe eines Objekts, skaliert die Suite alle Teile achsweise. Die Standardgröße bleibt in der Bibliothek erhalten („zurücksetzen“ im Inspektor).

## Felder

```json
{
  "format": "hss-object",
  "version": 1,
  "id": "klinik.wagen.infusion",
  "name": "Infusionswagen",
  "category": "Stationsausstattung/Pflegewagen",
  "tags": ["Infusion", "Station"],
  "size": { "w": 0.7, "d": 0.5, "h": 1.1 },
  "anchor": "boden",
  "meta": { "quelle": "Herstellerdatenblatt XY", "norm": "DIN EN …" },
  "logistik": { "reinheit": "rein" },
  "parts": [
    { "t": "box", "p": [0, 0.5, 0], "s": [0.66, 0.8, 0.46], "c": "#eef1f4", "m": "lack", "rr": 0.02 },
    { "t": "cyl", "p": [0.28, 1.05, -0.18], "r": 0.012, "h": 0.25, "c": "#c3c9d0", "m": "metall" }
  ]
}
```

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `format` | ja | immer `"hss-object"` |
| `id` | ja | eindeutig; Buchstaben, Ziffern, `.`, `_`, `-` |
| `name` | ja | Anzeigename |
| `category` | nein | mit `/` gegliedert, z. B. `Medizintechnik/OP`; die erste Ebene erscheint als Filter |
| `size` | ja | Standardmaße in Metern |
| `parts` oder `model` | ja | Geometrie aus Grundkörpern **oder** eingebettetes GLB (`data:model/gltf-binary;base64,…`) |
| `anchor` | nein | `boden` (Standard), `wand` (rastet beim Platzieren an Innenwänden ein, Rückseite zur Wand), `decke` (hängt unter der Geschossdecke) |
| `tags` | nein | Suchbegriffe |
| `meta` | nein | frei; wird im Inspektor als Datenblatt gezeigt. `meta.licht = {farbe, staerke, reichweite, hoehe, versatz}` macht ein Objekt nachts zur Lichtquelle |
| `logistik` | nein | siehe unten |

### Grundkörper (`parts[].t`)

| `t` | Maße | Hinweis |
|---|---|---|
| `box` | `s: [b, h, t]` | `rr` = Kantenradius |
| `cyl` | `r`, `h`, optional `rt` (oberer Radius) | `ax: "x" \| "z"` legt den Zylinder um |
| `sph` | `r` | `sc: [x, y, z]` streckt die Kugel |
| `cone` | `r`, `h` | |
| `tor` | `R` (Ring), `r` (Rohr), `arc` (Grad) | |
| `cap` | `r`, `h` (Gesamtlänge) | Kapsel |

Für alle Teile: `p` = Mittelpunkt `[x, y, z]`, `c` = Farbe, `m` = Material, `rx`/`ry`/`rz` = Drehung um die eigene Mitte in Grad, `o` = Deckkraft (nur `glas`).

Materialien `m`: `matt`, `kunststoff`, `metall`, `chrom`, `glas`, `stoff`, `holz`, `leucht`, `bildschirm`, `gummi`, `lack`.

Personen-Teile können eine Schwingachse haben (`piv: [x, y, z]`, `sw: 1 | -1`); in der Simulation schwingen Arme und Beine beim Gehen.

### Logistikangaben (`logistik`)

| Feld | Werte |
|---|---|
| `rolle` | `aufzug`, `treppe`, `awt-station`, `waschanlage`, `ladestation`, `rampe`, `lager`, `senke`, `quelle`, `fahrzeug`, `tuer`, `haltestelle`, `helipad` – die Simulation und die Standardflüsse erkennen Objekte daran |
| `reinheit` | `rein`, `unrein`, `neutral` |
| `aufzug` | `{ "typ": "bett|person|lasten|awt", "kabinen": 1, "sekProGeschoss": 5, "tuerS": 14, "kapazitaet": 1, "freigabe": ["*"] }` – Freigaben: `*`, `rein`, `unrein`, `person`, `patient`, `awt` |
| `dauerMin` | Bearbeitungszeit (z. B. Waschanlage) |
| `kapazitaet`, `einheit` | Fassungsvermögen (z. B. 20 Tabletts) |

## Paket (`hss-library`)

```json
{ "format": "hss-library", "version": 1, "name": "Klinikmöbel Hersteller XY", "category": "Hersteller XY", "objects": [ { … }, { … } ] }
```

`category` des Pakets gilt für alle Objekte ohne eigene Kategorie.

## Prüfung beim Hochladen

Die Suite prüft `format`, `id`, `name`, `size`, Grundkörpertypen und Materialien. Fehler werden mit Objektname und Feld gemeldet; fehlerfreie Objekte eines Pakets werden trotzdem übernommen.

## Vorlage

In der App: Bibliothek → „Vorlage herunterladen“ (`beispiel-infusionswagen.hssobj.json`). Jedes vorhandene Objekt lässt sich außerdem über „Exportieren“ als Vorlage speichern.
