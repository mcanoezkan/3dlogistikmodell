#!/usr/bin/env python3
"""Liest eine .pptx und gibt je Folie Layout, Titel, Texte (mit Ebene), Tabellen, Diagramm-/Bildanzahl und Notizen als Markdown aus.
Aufruf: python3 -I pptx_lesen.py <datei.pptx> [ausgabe.md]   (benötigt python-pptx)"""
import sys
from pptx import Presentation
from pptx.util import Emu
pr=Presentation(sys.argv[1]);W,H=pr.slide_width,pr.slide_height;o=[]
for n,s in enumerate(pr.slides,1):
    ttl=s.shapes.title.text_frame.text.strip() if s.shapes.title is not None and s.shapes.title.has_text_frame else ''
    o.append(f'\n## Folie {n} · Layout „{s.slide_layout.name}“\n**Titel:** {ttl}')
    pics=charts=0
    shapes=sorted(s.shapes,key=lambda x:((x.top or 0),(x.left or 0)))
    def walk(shs,ind=''):
        global pics,charts
        for sh in shs:
            if sh.shape_type==6 and hasattr(sh,'shapes'):walk(sh.shapes,ind+'  ');continue
            if sh.shape_type==13:pics+=1;continue
            if getattr(sh,'has_chart',False) and sh.has_chart:
                charts+=1;c=sh.chart
                try:
                    o.append(ind+f'- [Diagramm {c.chart_type}] '+'; '.join(f'{sr.name}: '+', '.join(str(v) for v in sr.values) for sr in c.plots[0].series)+' | Kategorien: '+', '.join(str(x) for x in c.plots[0].categories))
                except Exception:o.append(ind+'- [Diagramm]')
                continue
            if getattr(sh,'has_table',False) and sh.has_table:
                o.append(ind+'- [Tabelle]');[o.append(ind+'  | '+' | '.join(c.text.strip().replace('\n',' ') for c in r.cells)+' |') for r in sh.table.rows];continue
            if sh.has_text_frame and sh.text_frame.text.strip() and sh!=s.shapes.title:
                pos=f'(x {int((sh.left or 0)/W*100)}%, y {int((sh.top or 0)/H*100)}%)'
                o.append(ind+f'- Textfeld {pos}:')
                for p in sh.text_frame.paragraphs:
                    t=''.join(r.text for r in p.runs).strip()
                    if t:o.append(ind+'  '+'  '*p.level+'· '+t)
    walk(shapes)
    if pics or charts:o.append(f'_Bilder: {pics}, Diagramme: {charts}_')
    if s.has_notes_slide and s.notes_slide.notes_text_frame.text.strip():o.append('> Notizen: '+s.notes_slide.notes_text_frame.text.strip().replace('\n',' '))
txt='\n'.join(o)
if len(sys.argv)>2:open(sys.argv[2],'w',encoding='utf8').write(txt)
else:print(txt)
