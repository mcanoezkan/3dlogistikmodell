#!/usr/bin/env python3
"""
Klinikum Hanau – Varianten für den Neubau BT1 (Stufe 1: Geometrie).

  python3 tools/hanau_bt1_varianten.py <Hanau_Bestand_mit_OSM.hss.json> <Ausgabeordner>

Grundlage: Folie „BT1 braucht mind. 10.041 m² BGF, mit Neurologie ca. 12.900 m²“
  Variante 1: Abriss W, A (mit Nebengebäude A1), M und M17; BT1 an der Stelle von W,
              mind. 10.041 m² BGF (= BGF von W, A, M, M17); 24 Betten MED1 Kardiologie
              aus M17, Funktionsbereiche aus A und M (Anästhesie, Notfalllabor, Strahlentherapie)
  Variante 2: wie V1, zusätzlich 65 Betten Neurologie aus Haus N (N34, N35):
              65 × 24 m² NF = 1.560 m² NF × 1,86 ≈ 2.900 m² BGF → BT1 ca. 12.900 m² BGF
Die Belegung der Geschosse folgt in Stufe 2 (tools/bt1_flaechen.js) als Flächenplanung.
"""
import json, math, sys, copy, os
sys.path.insert(0, os.path.dirname(__file__))
from koblenz_k2_varianten import fp, area, minus_rect, split_path, in_k2, part_rect_uv, R2  # noqa: E402

FARBE = '#e3ac0c'
ABRISS = ['han_W', 'han_A', 'han_A1', 'han_M', 'han_M17']
VARIANTEN = [
    dict(key='V0', datei='Klinikum_Hanau_V0_Bestand', titel='V0 · Bestand', text='Bestand mit Umgebung aus OpenStreetMap (Lage aus den Häusern ausgeglichen). Ausgangslage für BT1.', bt1=None),
    dict(key='V1', datei='Klinikum_Hanau_V1_BT1_10041', titel='V1 · BT1 mind. 10.041 m² BGF',
         text='Abriss von W, A (mit A1), M und M17. BT1 entsteht an der heutigen Lage von W und ersetzt die Gesamtfläche von W, A, M und M17 (5.410 m² NF; BGF W 2.494, A 1.069, M 5.013, M17 1.466 m² = 10.041 m²). 24 Betten aus Station M17 (MED1 Kardiologie), dazu Funktionsbereiche aus A und M: Anästhesie, Notfalllabor, Strahlentherapie.',
         bt1=dict(x=-15, z=17.25, w=46, d=36.5, floors=5), betten=24),
    dict(key='V2', datei='Klinikum_Hanau_V2_BT1_12900', titel='V2 · BT1 ca. 12.900 m² BGF (mit Neurologie)',
         text='Wie Variante 1, zusätzlich 65 Betten Neurologie aus Haus N (N34, N35): 65 Betten × 24 m² NF = 1.560 m² NF, × 1,86 (BGF/NF der Abrissgebäude) ≈ 2.900 m² BGF. BT1 = 10.041 + ca. 2.900 ≈ 12.900 m² BGF, 89 Betten (24 aus M17, 65 Neurologie).',
         bt1=dict(x=-15, z=19, w=46, d=40, floors=6), betten=89, neuro=True),
]
BRUECKEN = [
    dict(b='han_HC_T', floors=[-1, 0, 1, 2, 3], name='Verbindung BT1 – Hochhaus C'),
    dict(b='han_B1_OP14', floors=[0, 1], name='Verbindung BT1 – OP (B1)'),
    dict(b='han_HB_S', floors=[-1, 0, 1], name='Anbindung BT1 – HB'),
    dict(b='han_K1_0', floors=[-1, 0], name='Magistrale BT1 – K1 (ersetzt die Wege über M und M17)'),
]


def build(base, V):
    p = copy.deepcopy(base)
    p['meta']['name'] = 'Klinikum Hanau – ' + V['titel']
    p['meta']['id'] = 'prj_han_' + V['key'].lower()
    p['meta']['variante'] = {'key': V['key'], 'titel': V['titel'], 'text': V['text']}
    p['meta']['notes'] = V['titel'] + ': ' + V['text'] + ('\nBelegung von BT1 als Flächenplanung (Fachbereiche mit m², keine Raumplanung).' if V['bt1'] else '') + '\n\n' + (p['meta'].get('notes') or '')
    if not V['bt1']:
        return p, {}
    gone_parts, gone_fp, gone_names = set(), [], []
    for b in p['buildings']:
        if b['id'] in ABRISS:
            for pt in b['parts']:
                gone_parts.add(pt['id'])
                if not pt.get('stackOn'): gone_fp.append((b, pt, fp(pt)))
            gone_names.append(b.get('kurz') or b['name'])
    p['buildings'] = [b for b in p['buildings'] if b['id'] not in ABRISS]
    g = V['bt1']
    pt = {'id': 'bt1_0', 'name': 'BT1', 'shape': 'rect', 'w': g['w'], 'd': g['d'], 'x': g['x'], 'z': g['z'], 'rot': 0, 'cornerRadius': 3, 'courtW': 14, 'courtD': 8, 'legW': 14, 'legD': 14,
          'poly': None, 'stackOn': None, 'baseOffset': 0, 'floors': g['floors'], 'floorHeight': 3.8, 'floorHeights': {}, 'basements': 1, 'basementHeight': 3.8,
          'facade': {'type': 'band', 'color': '#f2efe8', 'accent': FARBE, 'glass': '#7fa4bd', 'axis': 1.35, 'windowRatio': 0.55},
          'roof': {'type': 'flach', 'parapet': 0.8, 'plant': True, 'color': '#a7b0ba', 'helipad': False}, 'use': ''}
    bgf = g['w'] * g['d'] * (g['floors'] + 1)
    b = {'id': 'han_BT1', 'name': 'Neubau BT1 (Variante ' + V['key'] + ')', 'kurz': 'BT1', 'color': FARBE,
         'info': f"Variante {V['key']} · BGF {round(bgf):,} m² (UG + EG + {g['floors'] - 1} OG, {g['w']} × {g['d']} m) · {V['betten']} Betten".replace(',', '.'), 'parts': [pt]}
    p['buildings'].append(b)
    rects = [part_rect_uv(pt)]
    # Brücken
    p['bridges'] = [br for br in p['bridges'] if br['a']['part'] not in gone_parts and br['b']['part'] not in gone_parts]
    for j, bd in enumerate(BRUECKEN):
        for f in bd['floors']:
            p['bridges'].append({'id': f'br_bt1_{j}_{f}', 'name': bd['name'], 'type': 'gebaeude', 'a': {'part': 'bt1_0', 'floor': f}, 'b': {'part': bd['b'], 'floor': f},
                                 'width': 4, 'height': 3.4, 'levels': 1, 'offset': 0, 'color': '#eef0ee', 'variante': V['key']})
    # Objekte
    p['objects'] = [o for o in p['objects'] if not (o.get('host') or {}).get('part') in gone_parts and not (not o.get('host') and in_k2((o['x'], o['z']), rects, 1))]
    for k, (lib, nm, lx, fr) in enumerate([('erschl.aufzug.bett', 'Bettenaufzüge BT1', -3, ['*']), ('erschl.aufzug.lasten', 'Versorgungsaufzug BT1', 3, ['rein', 'unrein', 'neutral', 'person'])]):
        p['objects'].append({'id': f'obj_bt1_lift{k}', 'lib': lib, 'host': {'part': 'bt1_0', 'floor': -1}, 'x': lx, 'z': 0, 'rot': 0, 'name': nm, 'vonGF': -1, 'bisGF': g['floors'] - 1,
                             'aufzug': {'kabinen': 2 if k == 0 else 1, 'freigabe': fr}, 'core': True})
    # Räume aus den Abrisshäusern (und bei V2 die Neurologie aus N) für Stufe 2 merken
    moved = []
    for pid in list(p['interiors'].keys()):
        if pid in gone_parts:
            for f, I in p['interiors'][pid].items():
                for r in I.get('rooms', []): moved.append({'von': pid, 'floor': int(f), 'room': r})
            del p['interiors'][pid]
    if V.get('neuro'):
        I = p['interiors'].get('han_N_0', {})
        for f in ('1', '2'):
            for r in I.get(f, {}).get('rooms', []): moved.append({'von': 'han_N_0', 'floor': int(f), 'room': r})
            if f in I: I[f]['rooms'] = []
    # Wege und Flächen unter BT1
    paths = []
    for pa in p['paths']:
        pts = [tuple(q) for q in pa['points']]
        if len(pts) < 2 or pa.get('kind') == 'grenze': paths.append(pa); continue
        res = split_path(pts, rects, 1.5 + (pa.get('width') or 3) * 0.3)
        if res is None: paths.append(pa); continue
        for k, pc in enumerate(res):
            q = copy.deepcopy(pa); q['id'] = pa['id'] + ('' if k == 0 else f'_{k}'); q['points'] = pc; paths.append(q)
    p['paths'] = paths
    areas = []
    for a in p['areas']:
        poly = a.get('poly')
        if not poly: areas.append(a); continue
        P = [(q[0], q[1]) for q in poly]
        if not any(in_k2(q, rects) for q in P): areas.append(a); continue
        for k, Q in enumerate(minus_rect(P, rects[0][0], rects[0][1])):
            if area(Q) < 15: continue
            q = copy.deepcopy(a); q['id'] = a['id'] + ('' if k == 0 else f'_k{k}'); q['poly'] = [[R2(x), R2(z)] for x, z in Q]; areas.append(q)
    p['areas'] = areas
    # Grünflächen auf den frei werdenden Grundstücken
    for i, (bb, q, P) in enumerate(gone_fp):
        for k, Q in enumerate(minus_rect(P, rects[0][0], rects[0][1])):
            if area(Q) < 40: continue
            xs = [x for x, _ in Q]; zs = [z for _, z in Q]
            p['areas'].append({'id': f'gruen_{V["key"].lower()}_{i}_{k}', 'kind': 'park', 'name': f'Grünfläche (Rückbau {bb.get("kurz") or bb["name"]})', 'poly': [[R2(x), R2(z)] for x, z in Q],
                               'x': R2((min(xs) + max(xs)) / 2), 'z': R2((min(zs) + max(zs)) / 2), 'w': R2(max(xs) - min(xs)), 'd': R2(max(zs) - min(zs)), 'rot': 0, 'lage': 1, 'variante': V['key']})
    info = {'bgf': round(bgf), 'moved': moved, 'abriss': gone_names, 'stationen': [s['id'] for s in p['stations'] if any(x['part'] in gone_parts or (V.get('neuro') and x['part'] == 'han_N_0') for x in s.get('sel', []))]}
    return p, info


def main():
    src, out = sys.argv[1], sys.argv[2]
    base = json.load(open(src))
    os.makedirs(out, exist_ok=True)
    for V in VARIANTEN:
        p, info = build(base, V)
        if info: p['meta']['bt1Plan'] = dict(variante=V['key'], bgf=info['bgf'], moved=info['moved'], stationen=info['stationen'], abriss=info['abriss'], geschosse=V['bt1']['floors'], betten=V['betten'])
        fn = os.path.join(out, V['datei'] + '.hss.json')
        json.dump(p, open(fn, 'w'), ensure_ascii=False, separators=(',', ':'))
        print(V['key'], fn, info.get('bgf'), len(info.get('moved', [])), info.get('abriss'))


if __name__ == '__main__':
    main()
