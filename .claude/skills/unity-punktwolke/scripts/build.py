#!/usr/bin/env python3
"""Baut aus einem Deck-Ordner eine Einzeldatei (offline, WebGL-Punktwolke).
Aufruf: python3 build.py <deck-ordner>
Der Ordner enthält deck.json: {"title": "...", "out": "Name.html", "files": ["deck.js", ...]}
Reihenfolge im Ergebnis: engine.js, bausteine.js, Deck-Dateien, main.js (Engine aus assets/engine des Skills)."""
import json,os,sys
SK=os.path.dirname(os.path.dirname(os.path.abspath(__file__)));E=os.path.join(SK,'assets','engine')
d=os.path.abspath(sys.argv[1]);cfg=json.load(open(os.path.join(d,'deck.json'),encoding='utf8'))
rd=lambda p:open(p,encoding='utf8').read()
eng=lambda f:rd(os.path.join(d,'engine',f)) if os.path.exists(os.path.join(d,'engine',f)) else rd(os.path.join(E,f))
js='\n'.join([eng('engine.js'),eng('bausteine.js')]+[rd(os.path.join(d,f)) for f in cfg.get('files',['deck.js'])]+[eng('main.js')])
out=eng('shell.html').replace('%%TITLE%%',cfg['title']).replace('%%LOGO%%',eng('logo.svg').strip()).replace('%%JS%%',js)
p=os.path.join(d,cfg.get('out','Praesentation.html'));open(p,'w',encoding='utf8').write(out);print(p,len(out),'Zeichen')
