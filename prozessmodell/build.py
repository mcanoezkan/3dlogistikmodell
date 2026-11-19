#!/usr/bin/env python3
"""Baut das Soll-Prozessmodell als eine Datei (Artefakt-Seite ohne html/head/body-Gerüst)."""
import base64, json, pathlib
src = pathlib.Path(__file__).parent / 'src'
root = pathlib.Path(__file__).resolve().parents[1]
logo = 'data:image/png;base64,' + base64.b64encode((root / 'hss/assets/unity-logo.png').read_bytes()).decode()
plan = base64.b64encode((src / 'hallenplan.jpg').read_bytes()).decode()
app = (src / 'app.js').read_text(encoding='utf8').replace('@@ENGINE@@', (src / 'engine.js').read_text(encoding='utf8'))
method = json.dumps((src / 'methodik.html').read_text(encoding='utf8').strip(), ensure_ascii=False).replace('</', '<\\/')
html = (src / 'app.html').read_text(encoding='utf8')
for k, v in (('@@CSS@@', (src / 'app.css').read_text(encoding='utf8')), ('@@LOGO@@', logo), ('@@PLAN@@', plan), ('@@METHOD@@', method), ('@@APP@@', app)):
    html = html.replace(k, v)
out = pathlib.Path(__file__).parent / 'Soll-Prozessmodell_Zentrallager_UK_Essen_Halle_8.html'
out.write_text(html, encoding='utf8')
print(out, len(html))
