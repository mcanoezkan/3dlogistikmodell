#!/usr/bin/env python3
"""Baut „Circulara Production“ als EINE HTML-Datei (offline, ohne Server, ohne KI).

Inhalt: Produktionsreife-Check im Aufbau von Circulara (Pflichtangaben, Gewichtung,
Dimensionen/Indikatoren/Leitfragen, Ergebnisse, Handlungsempfehlungen, Export, Historie),
das Original-Circulara-Modell (Kreislaufwirtschaft) als zweiter Modus und die vollständige
Fabric Planning Suite als eingebetteter Fabrikplaner.

Aufruf:  python3 tools/build_reifegrad.py
Vorher:  python3 tools/build_einzeldatei.py fabrik   (aktuelle Fabric_Planning_Suite.html)
Ergebnis: Circulara_Production.html im Repository-Hauptordner
"""
import base64, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
R = ROOT / 'reifegrad'
C = R / 'daten' / 'circulara'

# --- Circulara-Originalmodell (Daten aus dem Circulara-Repository, unverändert) ---
CIRC_UI = {  # THEME_UI aus circulara/app.py
    'Design': {'bg': '#E9FBF5', 'bg2': '#F6FFFC', 'accent': '#1F7E8A', 'pill': '#D8F6EE', 'icon': 'design'},
    'Strategie': {'bg': '#EAF3FF', 'bg2': '#F6FAFF', 'accent': '#2B6CB0', 'pill': '#DCEBFF', 'icon': 'star'},
    'Wirtschaftlichkeit': {'bg': '#FFF6E8', 'bg2': '#FFFBF3', 'accent': '#B7791F', 'pill': '#FFE9C8', 'icon': 'trend'},
    'Regulatorik': {'bg': '#F3EEFF', 'bg2': '#FAF7FF', 'accent': '#6B46C1', 'pill': '#E8DEFF', 'icon': 'shield'},
    'Systemische Befähiger': {'bg': '#FFF0F5', 'bg2': '#FFF7FB', 'accent': '#C026D3', 'pill': '#FAD5E8', 'icon': 'net'},
}
CIRC_SUM = {  # THEME_SUMMARIES aus circulara/app.py
    'Design': 'Produktseitige Voraussetzungen wie Demontage, Materialprofil und Aufbereitbarkeit.',
    'Strategie': 'Markt, Organisation und Entscheidungslogik für zirkuläre Geschäftsmodelle.',
    'Wirtschaftlichkeit': 'Preisniveau, Werterhalt und wirtschaftliche Tragfähigkeit der Aufbereitung.',
    'Regulatorik': 'Rechtliche Wiederverwendung, Kennzeichnung und Daten- bzw. Rechte-Compliance.',
    'Systemische Befähiger': 'Daten, Rückführungssysteme und nutzerseitige Aktivierung.',
}
CIRC_W = {'Design': 0.35, 'Strategie': 0.20, 'Wirtschaftlichkeit': 0.15, 'Regulatorik': 0.15, 'Systemische Befähiger': 0.15}

def circulara_js():
    m = {
        'id': 'circulara', 'name': 'Zirkularitätsreife', 'titel': 'Circularity Fit Check',
        'untertitel': 'Dein virtueller Assistent zur Bewertung der <b>Zirkularitätsreife</b> deines Produktes.',
        'statusTitel': 'Zirkularitäts-Assessment Status', 'reifeTitel': 'Ihre Zirkularitätsreife',
        'weights': CIRC_W, 'ui': CIRC_UI, 'summaries': CIRC_SUM,
        'levels': json.loads((C / 'maturity_levels.json').read_text(encoding='utf-8')),
        'model': json.loads((C / 'circular_model.json').read_text(encoding='utf-8')),
        'recommendations': json.loads((C / 'indicator_recommendations.json').read_text(encoding='utf-8')),
    }
    return ('/* Circulara-Originalmodell (Kreislaufwirtschaft) – erzeugt von tools/build_reifegrad.py aus\n'
            '   reifegrad/daten/circulara/*.json (Kopie von circulara/data). Nicht von Hand ändern. */\n'
            'window.PRS_MODEL_CIRC = ' + json.dumps(m, ensure_ascii=False) + ';\n')

def main():
    (R / 'modell-circulara.js').write_text(circulara_js(), encoding='utf-8')
    html = (R / 'index.html').read_text(encoding='utf-8')
    inline = lambda name: '<script>\n' + (R / name).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>'
    html = html.replace('<script src="modell-produktion.js"></script>', inline('modell-produktion.js'))
    html = html.replace('<script src="modell-circulara.js"></script>', inline('modell-circulara.js'))
    logo = 'data:image/png;base64,' + base64.b64encode((R / 'circulara-logo.png').read_bytes()).decode()
    html = html.replace('src="circulara-logo.png"', f'src="{logo}"')
    suite = (ROOT / 'Fabric_Planning_Suite.html').read_bytes()
    blob = base64.b64encode(suite).decode()
    html = html.replace('</body>', f'<script type="text/plain" id="fps-b64">{blob}</script>\n</body>', 1)
    out = ROOT / 'Circulara_Production.html'
    out.write_text(html, encoding='utf-8')
    print(f'{out.name}: {out.stat().st_size / 1e6:.1f} MB')

if __name__ == '__main__':
    main()
