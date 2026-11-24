#!/usr/bin/env python3
"""Legt einen Deck-Ordner mit deck.json und einer deck.js-Vorlage an (alle Szenen-Vorlagen als Beispiel).
Aufruf: python3 neues_deck.py <ordner> "<Titel>" [kennung]"""
import json,os,re,sys,shutil
d,title=sys.argv[1],sys.argv[2];kid=sys.argv[3] if len(sys.argv)>3 else re.sub(r'\W+','-',title.lower()).strip('-')[:24]
os.makedirs(d,exist_ok=True);SK=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump({'title':title,'out':re.sub(r'\W+','_',title).strip('_')+'.html','files':['deck.js']},open(os.path.join(d,'deck.json'),'w',encoding='utf8'),ensure_ascii=False,indent=1)
t=open(os.path.join(SK,'assets','deck-vorlage.js'),encoding='utf8').read().replace('%%ID%%',kid).replace('%%TITEL%%',title)
p=os.path.join(d,'deck.js')
if not os.path.exists(p):open(p,'w',encoding='utf8').write(t)
print('angelegt:',d)
