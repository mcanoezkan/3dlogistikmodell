#!/usr/bin/env python3
"""
Koblenz K2-Varianten aus dem Bestandsmodell erzeugen (Stufe 1: Geometrie).

  python3 tools/koblenz_k2_varianten.py <Bestand.hss.json> <Ausgabeordner>

Je Variante: Gebäude zurückbauen, K2 (ca. 18.000 m² BGF inkl. UG) setzen,
Wege unter K2 kürzen, Flächen unter K2 beschneiden, frei werdende Grundstücke
als Grünfläche anlegen, Brücken zu K1, HT bzw. den Nachbargebäuden ziehen,
Aufzüge in K2 setzen und Räume/Stationen aus zurückgebauten Häusern in K2
übernehmen (Flächenplanung: Stufe 2 im Browser, siehe k2_flaechen.js).

Geometrie im Raster des Klinikums: u entlang K1 (NW→SO, 51°), v quer dazu.
"""
import json, math, sys, copy, os

A = 51.0  # Achse des Klinikrasters (Drehung von K1)


def rot(q, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    return (q[0] * c - q[1] * s, q[0] * s + q[1] * c)


def uv(p, a=A):
    r = math.radians(a); c, s = math.cos(r), math.sin(r)
    return (p[0] * c + p[1] * s, -p[0] * s + p[1] * c)


def xy(q, a=A):
    r = math.radians(a); c, s = math.cos(r), math.sin(r)
    return (q[0] * c - q[1] * s, q[0] * s + q[1] * c)


def fp(pt):
    if pt.get('shape') == 'poly' and pt.get('poly'):
        loc = pt['poly']
    else:
        w, d = pt['w'] / 2, pt['d'] / 2
        loc = [[-w, -d], [w, -d], [w, d], [-w, d]]
    return [(r[0] + pt['x'], r[1] + pt['z']) for r in (rot(q, pt.get('rot') or 0) for q in loc)]


def area(P):
    return abs(sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))) / 2


def pin(pt, P):
    x, y = pt; c = False; n = len(P)
    for i in range(n):
        x1, y1 = P[i]; x2, y2 = P[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


def clip_half(poly, k, val, ge):
    out = []; n = len(poly)
    inside = (lambda p: p[k] >= val - 1e-9) if ge else (lambda p: p[k] <= val + 1e-9)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]; ia, ib = inside(a), inside(b)
        def X():
            t = (val - a[k]) / ((b[k] - a[k]) or 1e-12)
            return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        if ia and ib: out.append(b)
        elif ia and not ib: out.append(X())
        elif not ia and ib: out.append(X()); out.append(b)
    return out


def minus_rect(poly_xy, r, a):
    """Vieleck (xy) minus achsparalleles Rechteck r=(u0,u1,v0,v1) im Raster a → Liste von Vielecken."""
    P = [uv(p, a) for p in poly_xy]
    u0, u1, v0, v1 = r; pieces = []
    for spec in ([(0, u0, False)], [(0, u1, True)], [(0, u0, True), (0, u1, False), (1, v0, False)], [(0, u0, True), (0, u1, False), (1, v1, True)]):
        q = P
        for k, val, ge in spec:
            q = clip_half(q, k, val, ge)
            if len(q) < 3: break
        if len(q) >= 3 and area(q) > 1: pieces.append([xy(p, a) for p in q])
    return pieces


def rect_xy(r, a):
    u0, u1, v0, v1 = r
    return [xy(q, a) for q in [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]]


R2 = lambda v: round(v, 2)


# ---------------------------------------------------------------- Varianten
# K2-Bauteile: (Name, u0, u1, v0, v1, Raster) – Raster 51 = wie K1, 0 = Nord-Süd wie M/R1/N
VARIANTEN = [
    dict(key='V0', datei='BwZK_Koblenz_V0_Bestand', titel='V0 · Bestand',
         text='Bestand mit Neubau K1 (im Bau). Ausgangslage für die Varianten V1–V5.', abriss=[], k2=None),
    dict(key='V1', datei='BwZK_Koblenz_V1_K2_neben_K1', titel='V1 · K2 neben K1',
         text='K2 östlich neben K1 anstelle von Haus M (Unterkünfte Ausb-/SimZ SanRgt 2), dem Ausbildungs- und Simulationszentrum und kleinen Nebengebäuden. Brücken K2–K1 im 1. und 2. OG über die Erschließungsstraße.',
         abriss=['kob_o100022219', 'kob_o301296104', 'kob_o1369800688', 'kob_o1369800689', 'kob_o1369800690'],
         k2=[('K2', -31, 31, -24, 24, 0, (73, -116))], geschosse=5,
         bruecken=[dict(a='K2', b='kob_K1_0', floors=[1, 2], ma=(-31, -12), mb=(40, -32), typ='glas', name='Brücke K2–K1')]),
    dict(key='V2', datei='BwZK_Koblenz_V2_K2_anstelle_C', titel='V2 · K2 anstelle von Haus C',
         text='Rückbau von Haus C (Haupteingang, Information, Cafeteria, Patientenaufnahme, Untersuchung und Behandlung, Seelsorge). K2 übernimmt Haupteingang und Aufnahme. Verbindungen zu HT (UG bis 3. OG, von dort weiter zu A und B), zu D im EG und als Glasbrücke zu K1 westlich an Haus D vorbei (1. und 2. OG).',
         abriss=['kob_C', 'kob_CV', 'kob_o1369678959', 'kob_o1369678960', 'kob_o1369678961', 'kob_o1370486757'],
         k2=[('K2', -176, -129, 16.5, 70, A, None)], geschosse=6,
         bruecken=[dict(a='K2', b='kob_o550532804_0', floors=[-1, 0, 1, 2, 3], typ='gebaeude', name='Verbindung K2–HT'),
                   dict(a='kob_o550532804_0', b='kob_A_0', floors=[-1, 0, 1, 2, 3], typ='gebaeude', name='Verbindung HT–A'),
                   dict(a='kob_o550532804_0', b='kob_B_0', floors=[-1, 0, 1, 2, 3], typ='gebaeude', name='Verbindung HT–B'),
                   dict(a='K2', b='kob_K1_0', floors=[1, 2], typ='glas', name='Brücke K2–K1', ma=(-17.5, -26.75), mb=(-35.7, 32)),
                   dict(a='K2', b='kob_D_0', floors=[0], typ='gebaeude', name='Verbindung K2–D')]),
    dict(key='V3', datei='BwZK_Koblenz_V3_K2_anstelle_D', titel='V3 · K2 anstelle von Haus D',
         text='Rückbau von Haus D (Chefarzt, Untersuchung und Behandlung, Warenannahme UG) samt Verbindungsbrücke D–K1. Das schmale Grundstück zwischen K1 und C/E trägt K2 nur als höheren Riegel mit kurzem Flügel (UG + EG + 6 OG); die Straße zwischen K1 und D entfällt. Verbindungen zu K1 (EG–3. OG), zu C (UG–2. OG; über C und A weiter zu HT), zu D/E und vom Flügel zu E.',
         abriss=['kob_D', 'kob_o1370292164', 'kob_o1369678960', 'kob_o1369678961'],
         k2=[('K2', -161, -93, -19, 8, A, None), ('K2 Flügel', -125, -107, 8, 29, A, None)], geschosse=7,
         bruecken=[dict(a='K2', b='kob_K1_0', floors=[0, 1, 2, 3], typ='gebaeude', name='Verbindung K2–K1'),
                   dict(a='K2', b='kob_CV_0', floors=[-1, 0, 1, 2], typ='gebaeude', name='Verbindung K2–C'),
                   dict(a='K2', b='kob_DE_0', floors=[0], typ='gebaeude', name='Verbindung K2–D/E'),
                   dict(a='K2 Flügel', b='kob_E_0', floors=[-1, 0, 1], typ='gebaeude', name='Verbindung K2–E')]),
    dict(key='V4', datei='BwZK_Koblenz_V4_K2_anstelle_C_und_D', titel='V4 · K2 anstelle von Haus C und D',
         text='Rückbau von Haus C und D. K2 als L-förmiger Baukörper: Riegel auf dem D-Grundstück direkt vor K1, Flügel auf dem C-Grundstück bis an HT. K2 wird zum Bindeglied zwischen K1 und dem Altbestand (HT, A, B). Freiflächen von C werden Grünfläche.',
         abriss=['kob_C', 'kob_CV', 'kob_D', 'kob_o1370292164', 'kob_o1369678959', 'kob_o1369678960', 'kob_o1369678961', 'kob_o1370486757'],
         k2=[('K2', -174, -112, -19, 9, A, None), ('K2 Flügel', -150, -129, 9, 69, A, None)], geschosse=5,
         bruecken=[dict(a='K2', b='kob_K1_0', floors=[0, 1, 2, 3], typ='gebaeude', name='Verbindung K2–K1'),
                   dict(a='K2 Flügel', b='kob_o550532804_0', floors=[-1, 0, 1, 2, 3], typ='gebaeude', name='Verbindung K2–HT'),
                   dict(a='kob_o550532804_0', b='kob_A_0', floors=[-1, 0, 1, 2, 3], typ='gebaeude', name='Verbindung HT–A'),
                   dict(a='kob_o550532804_0', b='kob_B_0', floors=[-1, 0, 1, 2, 3], typ='gebaeude', name='Verbindung HT–B'),
                   dict(a='K2', b='kob_DE_0', floors=[0], typ='gebaeude', name='Verbindung K2–D/E'),
                   dict(a='K2 Flügel', b='kob_o1369678963_0', floors=[0], typ='gebaeude', name='Verbindung K2–Magistrale')]),
    dict(key='V5', datei='BwZK_Koblenz_V5_K2_anstelle_A_B_HT_C_D', titel='V5 · K2 anstelle von A, B, HT, C und D',
         text='Rückbau der Häuser A, B, HT (Hochturm), C und D. K2 als kompakter Breitfuß (UG + EG + 2 OG) im Zentrum des Altbestands; die frei werdenden Flächen von A, B und HT werden Grünfläche. Brücken zu K1, F1, B1 und zur Magistrale.',
         abriss=['kob_A', 'kob_B', 'kob_o550532804', 'kob_C', 'kob_CV', 'kob_D', 'kob_o1370292164', 'kob_o1369678959', 'kob_o1369678960', 'kob_o1369678961', 'kob_o1370486757', 'kob_o1370852687', 'kob_o1370852688', 'kob_o1372709396'],
         k2=[('K2', -190, -130, 0, 75, A, None)], geschosse=3,
         bruecken=[dict(a='K2', b='kob_K1_0', floors=[1, 2], typ='glas', name='Brücke K2–K1'),
                   dict(a='K2', b='kob_F1_0', floors=[0, 1], typ='glas', name='Brücke K2–F1'),
                   dict(a='K2', b='kob_B1_0', floors=[1], typ='glas', name='Brücke K2–B1'),
                   dict(a='K2', b='kob_o1369678963_0', floors=[0], typ='gebaeude', name='Verbindung K2–Magistrale'),
                   dict(a='K2', b='kob_E_0', floors=[-1], typ='gebaeude', name='Versorgungsgang K2–E (UG)')]),
]

FARBE_K2 = '#e3ac0c'


def k2_part(name, r, a, idx, geschosse, center_xy=None):
    u0, u1, v0, v1 = r
    if a == 0 and center_xy:  # Nord-Süd-Raster: r = (dx0, dx1, dz0, dz1) relativ zum Mittelpunkt
        cx, cz = center_xy; w, d = u1 - u0, v1 - v0; x, z = cx + (u0 + u1) / 2, cz + (v0 + v1) / 2
    else:
        x, z = xy(((u0 + u1) / 2, (v0 + v1) / 2), a); w, d = u1 - u0, v1 - v0
    return {
        'id': 'k2_' + str(idx), 'name': name, 'shape': 'rect', 'w': R2(w), 'd': R2(d), 'x': R2(x), 'z': R2(z), 'rot': a,
        'cornerRadius': 6 if idx == 0 else 2, 'courtW': 14, 'courtD': 8, 'legW': 14, 'legD': 14, 'poly': None, 'stackOn': None,
        'baseOffset': 0, 'floors': geschosse, 'floorHeight': 3.6, 'floorHeights': {}, 'basements': 1, 'basementHeight': 3.6,
        'facade': {'type': 'glas', 'color': '#f4f1e8', 'accent': FARBE_K2, 'glass': '#7fa4bd', 'axis': 1.35, 'windowRatio': 0.55},
        'roof': {'type': 'flach', 'parapet': 0.8, 'plant': True, 'color': '#a7b0ba', 'helipad': False}, 'use': ''}


def part_rect_uv(pt):
    """Rechteck eines K2-Bauteils als (u0,u1,v0,v1) in seinem eigenen Raster."""
    a = pt['rot']; c = uv((pt['x'], pt['z']), a)
    return (c[0] - pt['w'] / 2, c[0] + pt['w'] / 2, c[1] - pt['d'] / 2, c[1] + pt['d'] / 2), a


def in_k2(p, k2rects, buf=0.0):
    for r, a in k2rects:
        q = uv(p, a)
        if r[0] - buf <= q[0] <= r[1] + buf and r[2] - buf <= q[1] <= r[3] + buf: return True
    return False


def split_path(points, k2rects, buf=1.5, step=1.0):
    """Weg an K2 auftrennen: Teile innerhalb (mit Puffer) entfallen. None = Weg berührt K2 nicht."""
    samples = []
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]; n = max(1, int(math.dist(a, b) / step))
        for j in range(n): samples.append(((a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n), j == 0))
    samples.append((tuple(points[-1]), True))
    if not any(in_k2(q, k2rects, buf) for q, _ in samples): return None
    runs, cur = [], []
    for q, o in samples:
        if in_k2(q, k2rects, buf):
            if len(cur) >= 2: runs.append(cur)
            cur = []
        else: cur.append((q, o))
    if len(cur) >= 2: runs.append(cur)
    out = []
    for r in runs:
        keep = [r[0][0]] + [q for q, o in r[1:-1] if o] + [r[-1][0]]
        if sum(math.dist(keep[k], keep[k + 1]) for k in range(len(keep) - 1)) > 3: out.append([[R2(x), R2(z)] for x, z in keep])
    return out


def build(base, V):
    p = copy.deepcopy(base)
    p['meta']['name'] = 'BwZK Koblenz – ' + V['titel']
    p['meta']['id'] = 'prj_kob_' + V['key'].lower()
    p['meta']['variante'] = {'key': V['key'], 'titel': V['titel'], 'text': V['text']}
    p['meta']['notes'] = (V['titel'] + ': ' + V['text'] + ('\nK2: ca. 18.000 m² BGF (inkl. UG) als Flächenansatz; Belegung der Geschosse als Flächenplanung (Annahme, keine Raumplanung).' if V['k2'] else '') + '\n\n' + (p['meta'].get('notes') or ''))
    if not V['k2']:
        return p, {}
    abriss = set(V['abriss'])
    # Bauteil-IDs der zurückgebauten Gebäude
    gone_parts, gone_fp, gone_names = set(), [], []
    for b in p['buildings']:
        if b['id'] in abriss or any(pt['id'] in abriss for pt in b['parts']):
            for pt in b['parts']:
                gone_parts.add(pt['id'])
                if not pt.get('stackOn'): gone_fp.append((b, pt, fp(pt)))
            gone_names.append(b.get('kurz') or b['name'])
    p['buildings'] = [b for b in p['buildings'] if not all(pt['id'] in gone_parts for pt in b['parts'])]
    # K2
    k2b = {'id': 'kob_K2', 'name': 'Neubau K2 (Variante ' + V['key'] + ')', 'kurz': 'K2', 'color': FARBE_K2, 'info': 'Variante ' + V['key'] + ': ' + V['text'], 'parts': []}
    for i, (name, u0, u1, v0, v1, a, cxy) in enumerate(V['k2']):
        k2b['parts'].append(k2_part(name, (u0, u1, v0, v1), a, i, V['geschosse'], cxy))
    p['buildings'].append(k2b)
    names = {pt['name']: pt['id'] for pt in k2b['parts']}
    k2rects = [part_rect_uv(pt) for pt in k2b['parts']]
    bgf = sum(pt['w'] * pt['d'] * (pt['floors'] + pt['basements']) for pt in k2b['parts'])
    # Brücken: alte mit zurückgebauten Teilen entfernen, neue anlegen
    p['bridges'] = [br for br in p['bridges'] if br['a']['part'] not in gone_parts and br['b']['part'] not in gone_parts]
    for j, bd in enumerate(V.get('bruecken', [])):
        pa = names.get(bd['a'], bd['a']); pb = names.get(bd['b'], bd['b'])
        for f in bd['floors']:
            br = {'id': f'br_k2_{j}_{f}', 'name': bd['name'], 'type': bd.get('typ', 'gebaeude'), 'a': {'part': pa, 'floor': f}, 'b': {'part': pb, 'floor': f},
                  'width': 3.5 if bd.get('typ') == 'glas' else 4, 'height': 3.2, 'levels': 1, 'offset': 0, 'color': '#eef0ee', 'variante': V['key']}
            if bd.get('ma'): br['ma'] = list(bd['ma'])
            if bd.get('mb'): br['mb'] = list(bd['mb'])
            p['bridges'].append(br)
    # Objekte in zurückgebauten Teilen und Außenobjekte unter K2 entfernen
    p['objects'] = [o for o in p['objects'] if not (o.get('host', {}) or {}).get('part') in gone_parts and not (not o.get('host') and in_k2((o['x'], o['z']), k2rects, 1))]
    # Innenausbau: Räume zurückgebauter Teile merken (werden in K2 als Flächen übernommen)
    moved = []
    for pid in list(p['interiors'].keys()):
        if pid in gone_parts:
            for f, I in p['interiors'][pid].items():
                for r in I.get('rooms', []): moved.append({'von': pid, 'floor': int(f), 'room': r})
            del p['interiors'][pid]
    # Stationen in zurückgebauten Teilen
    st_moved = []
    for s in p['stations']:
        if any(x['part'] in gone_parts for x in s.get('sel', [])): st_moved.append(s['id'])
    # Wege unter K2 kürzen
    paths = []
    for pa in p['paths']:
        pts = [tuple(q) for q in pa['points']]
        if len(pts) < 2 or pa.get('kind') == 'grenze': paths.append(pa); continue
        res = split_path(pts, k2rects, 1.5 + (pa.get('width') or 3) * 0.3)
        if res is None: paths.append(pa); continue
        for k, pc in enumerate(res):
            q = copy.deepcopy(pa); q['id'] = pa['id'] + ('' if k == 0 else f'_{k}'); q['points'] = pc; paths.append(q)
    p['paths'] = paths
    # Flächen unter K2 beschneiden
    areas = []
    for a in p['areas']:
        poly = a.get('poly')
        if not poly:
            areas.append(a); continue
        absP = [(q[0], q[1]) for q in poly]
        if not any(in_k2(q, k2rects) for q in absP) and not any(pin(xy((((r[0] + r[1]) / 2), ((r[2] + r[3]) / 2)), aa), absP) for r, aa in k2rects):
            areas.append(a); continue
        pieces = [absP]
        for r, aa in k2rects:
            pieces = [q for P in pieces for q in minus_rect(P, r, aa)]
        for k, P in enumerate(pieces):
            if area(P) < 15: continue
            q = copy.deepcopy(a); q['id'] = a['id'] + ('' if k == 0 else f'_k{k}'); q['poly'] = [[R2(x), R2(z)] for x, z in P]
            xs = [x for x, _ in P]; zs = [z for _, z in P]; q['x'] = R2((min(xs) + max(xs)) / 2); q['z'] = R2((min(zs) + max(zs)) / 2); q['w'] = R2(max(xs) - min(xs)); q['d'] = R2(max(zs) - min(zs))
            areas.append(q)
    p['areas'] = areas
    # Grünflächen auf den frei werdenden Grundstücken
    for i, (b, pt, P) in enumerate(gone_fp):
        pieces = [P]
        for r, aa in k2rects: pieces = [q for X in pieces for q in minus_rect(X, r, aa)]
        for k, Q in enumerate(pieces):
            if area(Q) < 40: continue
            xs = [x for x, _ in Q]; zs = [z for _, z in Q]
            p['areas'].append({'id': f'gruen_{V["key"].lower()}_{i}_{k}', 'kind': 'park', 'name': f'Grünfläche (Rückbau {b.get("kurz") or b["name"]})', 'poly': [[R2(x), R2(z)] for x, z in Q],
                               'x': R2((min(xs) + max(xs)) / 2), 'z': R2((min(zs) + max(zs)) / 2), 'w': R2(max(xs) - min(xs)), 'd': R2(max(zs) - min(zs)), 'rot': 0, 'lage': 1, 'variante': V['key']})
    # Aufzüge in K2 (Bettenaufzug, Versorgungsaufzug) im Hauptbauteil
    main = k2b['parts'][0]
    for k, (lib, nm, lx, fr) in enumerate([('erschl.aufzug.bett', 'Bettenaufzüge K2', -3, ['*']), ('erschl.aufzug.lasten', 'Versorgungsaufzug K2', 3, ['rein', 'unrein', 'neutral', 'person'])]):
        p['objects'].append({'id': f'obj_k2_lift{k}', 'lib': lib, 'host': {'part': main['id'], 'floor': -1}, 'x': lx, 'z': 0, 'rot': 0, 'name': nm, 'vonGF': -1, 'bisGF': main['floors'] - 1,
                             'aufzug': {'kabinen': 2 if k == 0 else 1, 'freigabe': fr}, 'core': True})
    info = {'k2': [pt['id'] for pt in k2b['parts']], 'bgf': round(bgf), 'moved': moved, 'stationen': st_moved, 'abriss': gone_names}
    return p, info


def main():
    src, out = sys.argv[1], sys.argv[2]
    base = json.load(open(src))
    os.makedirs(out, exist_ok=True)
    plan = []
    for V in VARIANTEN:
        p, info = build(base, V)
        if info: p['meta']['k2Plan'] = {'variante': V['key'], 'k2': info['k2'], 'bgf': info['bgf'], 'moved': info['moved'], 'stationen': info['stationen'], 'abriss': info['abriss'], 'geschosse': V['geschosse']}
        fn = os.path.join(out, V['datei'] + '.hss.json')
        json.dump(p, open(fn, 'w'), ensure_ascii=False, separators=(',', ':'))
        plan.append((V['key'], fn, info.get('bgf'), len(info.get('moved', [])), info.get('abriss')))
    for x in plan: print(*x)


if __name__ == '__main__':
    main()
