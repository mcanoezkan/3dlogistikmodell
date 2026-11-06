#!/usr/bin/env python3
"""Baut die Einzeldatei Zukunftsbild_Controlling_Punktwolke.html aus src/."""
import os,re
D=os.path.dirname(os.path.abspath(__file__));S=os.path.join(D,'src')
shell=open(os.path.join(S,'shell.html'),encoding='utf8').read()
js='\n'.join(open(os.path.join(S,f),encoding='utf8').read() for f in ['engine.js','data.js','slides1.js','slides2.js','slides3.js','main.js'])
logo=open(os.path.join(S,'logo.svg'),encoding='utf8').read().strip()
out=shell.replace('%%LOGO%%',logo).replace('%%JS%%',js)
p=os.path.join(D,'Zukunftsbild_Controlling_Punktwolke.html')
open(p,'w',encoding='utf8').write(out);print(p,len(out))
