#!/usr/bin/env python3
"""Baut die Healthcare Simulation Suite als EINE HTML-Datei (offline, ohne Server).

Aufruf:  python3 tools/build_einzeldatei.py
Ergebnis: Healthcare_Simulation_Suite.html im Repository-Hauptordner – per Doppelklick
in Chrome, Edge oder Firefox öffnen, auch ohne Internet. Projektdateien (*.hss.json)
einfach ins Fenster ziehen.
"""
import base64, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HSS = ROOT / 'hss'
OUT = ROOT / 'Healthcare_Simulation_Suite.html'

html = (HSS / 'index.html').read_text(encoding='utf-8')

def data_uri(rel, mime):
    return f"data:{mime};base64," + base64.b64encode((HSS / rel).read_bytes()).decode()

# Stylesheet einbetten
def css(m):
    return '<style>\n' + (HSS / m.group(1)).read_text(encoding='utf-8') + '\n</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"?]+)(?:\?[^"]*)?">', css, html)
# Bilder einbetten
html = html.replace('assets/favicon.svg', data_uri('assets/favicon.svg', 'image/svg+xml'))
html = html.replace('assets/unity-logo.png', data_uri('assets/unity-logo.png', 'image/png'))

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
OUT.write_text(html, encoding='utf-8')
print(f'{OUT.name}: {OUT.stat().st_size / 1e6:.1f} MB')
