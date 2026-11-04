#!/usr/bin/env python3
"""Baut die Suite als EINE HTML-Datei je Edition (offline, ohne Server).

Aufruf:  python3 tools/build_einzeldatei.py            (alle drei Editionen)
         python3 tools/build_einzeldatei.py fabrik     (nur eine: health | fabrik | home)
Ergebnis im Repository-Hauptordner:
  Healthcare_Simulation_Suite.html   Krankenhäuser (Edition health)
  Fabric_Planning_Suite.html         Fabriken, Werke, Hallen (Edition fabrik)
  Home_Planning_Suite.html           Häuser, Wohnungen, Möbel (Edition home)
Per Doppelklick in Chrome, Edge oder Firefox öffnen, auch ohne Internet (OpenStreetMap-
Import und Luftbild brauchen eine Verbindung). Projektdateien (*.hss.json) ins Fenster ziehen.
"""
import base64, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HSS = ROOT / 'hss'
EDITIONEN = {
    'health': ('Healthcare_Simulation_Suite.html', 'Healthcare Simulation Suite'),
    'fabrik': ('Fabric_Planning_Suite.html', 'Fabric Planning Suite'),
    'home': ('Home_Planning_Suite.html', 'Home Planning Suite'),
}

def data_uri(rel, mime):
    return f"data:{mime};base64," + base64.b64encode((HSS / rel).read_bytes()).decode()

def bauen(edition):
    datei, titel = EDITIONEN[edition]
    html = (HSS / 'index.html').read_text(encoding='utf-8')
    # Stylesheet einbetten
    html = re.sub(r'<link rel="stylesheet" href="([^"?]+)(?:\?[^"]*)?">', lambda m: '<style>\n' + (HSS / m.group(1)).read_text(encoding='utf-8') + '\n</style>', html)
    # Bilder einbetten
    html = html.replace('assets/favicon.svg', data_uri('assets/favicon.svg', 'image/svg+xml'))
    html = html.replace('assets/unity-logo.png', data_uri('assets/unity-logo.png', 'image/png'))
    # Titel und Ladeanzeige schon vor dem Start richtig
    html = html.replace('<title>Healthcare Simulation Suite</title>', f'<title>{titel}</title>')
    html = html.replace('<div class="t1">Healthcare Simulation Suite</div>', f'<div class="t1">{titel}</div>')
    html = html.replace('<p>Healthcare Simulation Suite wird geladen …</p>', f'<p>{titel} wird geladen …</p>')
    # Skripte einbetten; die Bibliotheksliste (manifest.js) wird durch die Pakete selbst ersetzt
    packs = re.findall(r"'([\w\-]+\.js)'", (HSS / 'library' / 'manifest.js').read_text(encoding='utf-8'))
    def script(m):
        src = m.group(1)
        if src == 'library/manifest.js':
            body = 'window.HSS_LIBRARY_FILES = ' + repr(packs).replace("'", '"') + ';'
            return '<script>' + body + '</script>\n' + '\n'.join('<script>\n' + (HSS / 'library' / p).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>' for p in packs)
        code = (HSS / src).read_text(encoding='utf-8').replace('</script', '<\\/script')
        return '<script>\n' + code + '\n</script>'
    html = re.sub(r'<script src="([^"?]+)(?:\?[^"]*)?"></script>', script, html)
    # Edition festlegen (vor allen anderen Skripten)
    html = html.replace('<script>', f'<script>window.HSS_EDITION = {edition!r};</script>\n<script>', 1)
    out = ROOT / datei
    out.write_text(html, encoding='utf-8')
    print(f'{out.name}: {out.stat().st_size / 1e6:.1f} MB')

for e in (sys.argv[1:] or list(EDITIONEN)):
    if e not in EDITIONEN:
        sys.exit(f'Unbekannte Edition: {e} (health | fabrik | home)')
    bauen(e)
