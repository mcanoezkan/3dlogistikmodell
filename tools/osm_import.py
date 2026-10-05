#!/usr/bin/env python3
"""
OSM-Import für das Logistikmodell Klinikum Bielefeld-Mitte.

Lädt Gebäude, Gebäudeteile (Höhen, Geschosse), Straßen, Wege, Eingänge und das
Wegenetz rund um das Klinikumsgelände (OSM-Weg 689365264) über die Overpass-API,
rechnet alles in das Modellraster um und schreibt den Datenblock window.KBM_OSM
nach tools/osm_data.js. Mit --embed wird der Block in index.html zwischen die
Marker /* OSM-BEGIN */ und /* OSM-END */ eingesetzt.

Aufruf:  python3 tools/osm_import.py [--cache tools/osm_raw.json] [--embed]
Benötigt: shapely (pip install shapely)
Quelle:  © OpenStreetMap-Mitwirkende, Lizenz ODbL 1.0

Modellraster: Ursprung in der Mitte des Haupthauses, x entlang der Gebäudeachse
(parallel zur Front an der Eduard-Windthorst-Straße), z quer dazu. Das Raster ist
gegenüber Nord um ROT Grad gedreht (Gebäudeachsen aus OSM bestimmt).
"""
import json, math, sys, os, re, datetime, urllib.request, urllib.parse
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, box as sbox
from shapely.ops import unary_union, linemerge, split

LAT0, LON0 = 52.014139, 8.544318   # Modellursprung (Mitte Haupthaus)
ROT = 115.4                        # Drehung Modellraster gegenüber Ost/Süd-Raster in Grad
FH = 3.8                           # Geschosshöhe im Modell (wie KBM_DATA.meta.geschosshoehe)
SITE = 689365264                   # OSM-Weg Klinikumsgelände (amenity=hospital)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WIN = sbox(-340, -300, 340, 300)   # Ausschnitt im Modellraster

QUERY = f"""[out:json][timeout:120];
way({SITE})->.site;
.site out geom;
(
  way(around.site:250)[building]; rel(around.site:250)[building];
  way(around.site:250)["building:part"];
  way(around.site:350)[highway];
  node(around.site:120)[entrance];
  node(around.site:120)[amenity=parking_entrance];
  way(around.site:150)[natural=water];
);
out geom;"""

# Zuordnung Modellgebäude -> OSM. osm: Gebäude ('w…' Weg, 'r…' Relation, 'p…' Gebäudeteil als Umriss)
# minus: Umrisse, die abgezogen werden; clip: Ausschnitt im Modellraster (Abgrenzung aus dem Lageplan)
# std: Geschosse (von, bis) für Flächen ohne Höhenangabe; ug: Untergeschoss U1 ergänzen
BUILDINGS = {
    'H1':  {'osm': ['r18889904'], 'minus': ['p1529410147'], 'ug': True, 'std': (-1, 3)},
    'NB':  {'osm': ['p1529410147'], 'ug': True, 'std': (-1, 1)},
    'H2':  {'osm': ['w1387046452']},
    'H3':  {'osm': ['w106793193'], 'std': (0, 0)},
    'H4':  {'osm': ['w125762135'], 'std': (0, 3)},
    'H5':  {'osm': ['w26976857']},
    'H6':  {'osm': ['w106568488'], 'minus_clip': [(-185, 0, -140, 40)]},
    'H9':  {'osm': ['w106568488'], 'clip': (-185, 0, -140, 40)},
    'H7':  {'osm': ['w27154136']},
    'H8':  {'osm': ['w27154135']},
    'H10': {'osm': ['w205162934'], 'std': (0, 3)},
    'H11': {'osm': ['w765142737'], 'std': (0, 1)},
    'H12': {'osm': ['w693994791']},
    'P1':  {'osm': ['w26976760'], 'ug': True, 'std': (-1, 0)},
    'P2':  {'osm': ['w570299313']},
}
# Namen für Gebäudeteile, auf die sich Funktionsbereiche beziehen (OSM-Teil-ID -> Teil-ID)
PART_IDS = {595918835: 'BT', 594755592: 'HH', 1370956694: 'TG', 594227584: 'OB', 594227583: 'OA',
            595065314: 'WH', 1373172797: 'OS', 594493032: 'OE'}
# Teile ab dieser Mindesthöhe sind Dachaufbauten und werden nicht übernommen
DACH_MIN = 50
SKIP_PARTS = {106793195}           # Hubschrauberplattform: eigener Bereich im Modell
HELIPAD = 106793195

# Feste Anschlusspunkte im Außen-Wegenetz (Modellraster). Sie werden an die nächstgelegene
# OSM-Kante angebunden, damit KBM_DATA stabile Knotennamen verwenden kann.
# filter: nur Kanten, deren Name den Text enthält; osm: zugehöriger OSM-Knoten (Beleg)
ANCHORS = {
    'WA_N':  {'p': (-6.7, -66), 'name': 'Warenannahme Steri (UG) & Küche', 'osm': 7669730280, 'filter': 'Zufahrt'},
    'WA_ZL': {'p': (80.2, -66), 'name': 'Warenannahme Zentrallager', 'osm': 7669730281, 'filter': 'Zufahrt'},
    'HE':    {'p': (-10.4, 77), 'name': 'Haupteingang Neubau (NIZ)', 'osm': 12437038569},
    'LKV':   {'p': (40, 88), 'name': 'Liegendkrankenvorfahrt NIZ', 'filter': 'Rettungsdienst'},
    'ABF':   {'p': (68, -74), 'name': 'Abfallsammelstelle (Annahme)', 'filter': 'Zufahrt'},
    'P1O':   {'p': (-21, 69), 'name': 'Ausgang Parkhaus P1 Ost', 'osm': 13938746515},
    'E_H4':  {'p': (-57.2, -120), 'name': 'Eingang Haus 4', 'osm': 6515760684},
    'E_H7':  {'p': (-104, -38.5), 'name': 'Eingang Haus 6/7', 'osm': 12845055528},
    'E_H8':  {'p': (-147, 47), 'name': 'Eingang Haus 8'},
    'TS':    {'p': (10, 125), 'name': 'Teutoburger Straße', 'filter': 'Teutoburger'},
    'EW':    {'p': (38, -128), 'name': 'Eduard-Windthorst-Straße', 'filter': 'Eduard-Windthorst'},
}


SERVER = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter',
          'https://maps.mail.ru/osm/tools/overpass/api/interpreter']

def fetch():
    import time
    last = None
    for versuch in range(6):
        url = SERVER[versuch % len(SERVER)]
        req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': QUERY}).encode(),
            headers={'User-Agent': 'kbm-logistikmodell/0.2 (osm_import.py)', 'Accept': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as e:   # Overpass ist oft ausgelastet: anderen Server versuchen
            last = e; print(f'{url}: {e} – neuer Versuch', file=sys.stderr); time.sleep(10)
    raise SystemExit(f'Overpass nicht erreichbar: {last}')


_c = math.cos(math.radians(LAT0)); _rot = complex(math.cos(math.radians(-ROT)), math.sin(math.radians(-ROT)))
def tm(p):
    o = complex((p['lon'] - LON0) * 111320 * _c, -(p['lat'] - LAT0) * 110574) * _rot
    return (round(o.real, 2), round(o.imag, 2))


def num(v):
    if v is None: return None
    m = re.match(r'[-+]?\d+(?:[.,]\d+)?', str(v).strip())
    return float(m.group(0).replace(',', '.')) if m else None


def rnd(g, d=1):
    return [[round(x, d), round(z, d)] for x, z in list(g.exterior.coords)[:-1]]


def no_holes(g):
    """Polygone mit Innenhöfen an einer Linie durch jeden Hof teilen (Renderer kennt keine Löcher)."""
    out, todo = [], [g]
    while todo:
        p = todo.pop()
        if p.is_empty or p.area < 1: continue
        if not p.interiors: out.append(p); continue
        hx, hz = p.interiors[0].centroid.coords[0]
        x1, z1, x2, z2 = p.bounds
        cut = LineString([(hx, z1 - 1), (hx, z2 + 1)])
        parts = split(p, cut)
        todo.extend(q for q in parts.geoms if q.area >= 1)
    return out


def polys(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return no_holes(g)
    if isinstance(g, MultiPolygon): return [q for p in g.geoms for q in no_holes(p)]
    return [q for p in getattr(g, 'geoms', []) if isinstance(p, (Polygon, MultiPolygon)) for q in polys(p)]


def levels_of(t, std, ug):
    """Geschossbereich (von, bis) im Modell aus den OSM-Höhenangaben."""
    h, mh = num(t.get('height')), num(t.get('min_height'))
    lv, ml = num(t.get('building:levels')), num(t.get('building:min_level') or t.get('min_level'))
    under = num(t.get('building:levels:underground')) or 0
    if h is not None:
        von = round(mh / FH) if mh else 0
        bis = max(von, round(h / FH) - 1)
        src = 'Höhe'
    elif lv is not None:
        von = math.floor(ml) if ml else 0
        bis = max(von, von + math.ceil(lv) - 1)
        src = 'Geschosse'
    else:
        return std[0], std[1], 'Annahme'
    if von == 0 and (under >= 1 or ug): von = -1
    return von, bis, src


def main():
    args = sys.argv[1:]
    cache = args[args.index('--cache') + 1] if '--cache' in args else None
    if cache and os.path.exists(cache):
        data = json.load(open(cache))
    else:
        data = fetch()
        if cache: json.dump(data, open(cache, 'w'))
    E = data['elements']
    ways = {('w' if e['type'] == 'way' else 'r') + str(e['id']): e for e in E if e['type'] in ('way', 'relation')}
    site = next(e for e in E if e['type'] == 'way' and e['id'] == SITE)
    gelaende = Polygon([tm(p) for p in site['geometry']]).buffer(0)

    def geom(e):
        if e['type'] == 'way':
            pts = [tm(p) for p in e['geometry']]
            return Polygon(pts).buffer(0) if len(pts) >= 4 else Polygon()
        outer = [Polygon([tm(p) for p in m['geometry']]).buffer(0) for m in e['members'] if m['role'] == 'outer' and m.get('geometry')]
        inner = [Polygon([tm(p) for p in m['geometry']]).buffer(0) for m in e['members'] if m['role'] == 'inner' and m.get('geometry')]
        return unary_union(outer).difference(unary_union(inner)) if inner else unary_union(outer)

    def ref(r):
        k = 'w' + r[1:] if r[0] == 'p' else r
        return ways[k]

    parts_all = [e for e in E if e['type'] == 'way' and 'building:part' in e.get('tags', {}) and e['id'] not in SKIP_PARTS]
    pgeom = {e['id']: geom(e) for e in parts_all}

    gebaeude, used_ways = {}, set()
    for bid, cfg in BUILDINGS.items():
        fp = unary_union([geom(ref(r)) for r in cfg['osm']])
        for r in cfg.get('minus', []): fp = fp.difference(geom(ref(r)))
        if 'clip' in cfg: fp = fp.intersection(sbox(*cfg['clip']))
        for c in cfg.get('minus_clip', []): fp = fp.difference(sbox(*c))
        fp = fp.buffer(0)
        used_ways.update(int(r[1:]) for r in cfg['osm'] if r[0] in 'wp')
        main_tags = ref(cfg['osm'][0]).get('tags', {})
        ug = cfg.get('ug') or (num(main_tags.get('building:levels:underground')) or 0) >= 1
        std = cfg.get('std')
        if std is None:
            v, b, _ = levels_of(main_tags, (0, 2), ug); std = (v, b)
        # Gebäudeteile innerhalb des Umrisses
        cand = []
        for e in parts_all:
            g = pgeom[e['id']]
            if g.is_empty or g.area < 15: continue
            t = e['tags']
            if (num(t.get('min_height')) or 0) >= DACH_MIN: continue
            if t.get('building:part') in ('roof',): continue
            if not fp.contains(g.representative_point()): continue
            if 'p' + str(e['id']) in cfg['osm']: continue
            von, bis, src = levels_of(t, std, ug)
            cand.append((e['id'], g.intersection(fp), von, bis, src, t))
        cand.sort(key=lambda c: (-c[3], -c[1].area))
        taken, teile = {}, []
        def emit(pid, g, von, bis, src, name=None):
            for i, p in enumerate(polys(g.simplify(0.4))):
                if p.area < 12: continue
                t = {'poly': rnd(p), 'von': von, 'bis': bis, 'src': 'osm', 'hquelle': src}
                if name and i == 0: t['id'] = name
                if pid: t['osm'] = pid
                teile.append(t)
        for pid, g, von, bis, src, t in cand:
            seg_start, seg_geom = None, None
            for l in range(von, bis + 2):
                r = g.difference(taken[l]) if l in taken and l <= bis else (g if l <= bis else None)
                if r is not None and r.area < 12: r = None
                same = seg_geom is not None and r is not None and seg_geom.symmetric_difference(r).area < 2
                if not same:
                    if seg_geom is not None:
                        emit(pid, seg_geom, seg_start, l - 1, src, PART_IDS.get(pid) if not any(x.get('id') == PART_IDS.get(pid) for x in teile) else None)
                    seg_start, seg_geom = (l, r) if r is not None else (None, None)
                if l <= bis: taken[l] = unary_union([taken[l], g]) if l in taken else g
        # Grundfläche, die von keinem Gebäudeteil erfasst ist: Standardgeschosse (Annahme)
        covered = unary_union([c[1] for c in cand]) if cand else Polygon()
        rest = fp.difference(covered).buffer(-0.4).buffer(0.4)
        emit(None, rest, std[0], std[1], 'Annahme' if cand or not num(main_tags.get('height')) else 'Höhe')
        mh = max((num(c[5].get('height')) or 0) for c in cand) if cand else num(main_tags.get('height'))
        gebaeude[bid] = {
            'osm': cfg['osm'][0], 'umriss': [rnd(p) for p in polys(fp.simplify(0.4))],
            'name': main_tags.get('name') or main_tags.get('ref'), 'hoehe': mh,
            'teile': teile}
        used_ways.update(c[0] for c in cand)

    # Umgebung: übrige Gebäude im Ausschnitt (nur Darstellung)
    umgebung = []
    model_fp = unary_union([Polygon(u) for b in gebaeude.values() for u in b['umriss']])
    for k, e in ways.items():
        t = e.get('tags', {})
        if 'building' not in t or e['id'] in used_ways or k == 'r18889904': continue
        if t.get('building') in ('roof',) or (num(t.get('min_height')) or 0) > 0: continue
        g = geom(e)
        if g.is_empty or g.area < 20 or not WIN.contains(g.centroid): continue
        if model_fp.intersection(g).area > 0.3 * g.area: continue
        h = num(t.get('height')); lv = num(t.get('building:levels'))
        hh = h if h else (lv * 3.2 + 1 if lv else 7)
        for p in polys(g.simplify(0.5)):
            umgebung.append({'poly': rnd(p), 'h': round(hh, 1)})

    # Straßen (benannt) und Wege
    by_name = {}
    wege, netz_ways = [], []
    near = gelaende.buffer(45)
    for e in E:
        t = e.get('tags', {})
        if e['type'] != 'way' or 'highway' not in t: continue
        line = LineString([tm(p) for p in e['geometry']])
        hw = t['highway']
        if hw in ('primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street') and t.get('name'):
            by_name.setdefault((t['name'], hw), []).append(line)
        elif hw in ('service', 'footway', 'pedestrian', 'path', 'cycleway') and line.intersects(near):
            c = line.intersection(WIN)
            if not c.is_empty and c.length > 4 and t.get('tunnel') not in ('yes',) and t.get('layer') not in ('1',):
                for ln in getattr(c, 'geoms', [c]):
                    wege.append([[round(x, 1), round(z, 1)] for x, z in ln.coords])
        if hw not in ('steps', 'construction', 'proposed', 'platform', 'bus_stop', 'elevator') and line.intersects(near):
            netz_ways.append((e, line))
    breite = {'primary': 15, 'secondary': 14, 'tertiary': 11, 'residential': 9, 'unclassified': 8, 'living_street': 7}
    strassen = []
    for (name, hw), lines in sorted(by_name.items()):
        u = unary_union(lines)
        m = (linemerge(u) if u.geom_type == 'MultiLineString' else u).intersection(WIN)
        for ln in getattr(m, 'geoms', [m]):
            if ln.is_empty or ln.length < 40: continue
            strassen.append({'name': name, 'pts': [[round(x, 1), round(z, 1)] for x, z in ln.simplify(0.5).coords], 'b': breite[hw], 'typ': hw})
    # je Straßenname nur den längsten Abschnitt beschriften
    for name in {r['name'] for r in strassen}:
        teile = [r for r in strassen if r['name'] == name]
        lang = max(teile, key=lambda r: LineString(r['pts']).length)
        for r in teile:
            if r is not lang: r['label'] = False

    # Eingänge
    eing = []
    for e in E:
        t = e.get('tags', {})
        if e['type'] != 'node' or not ('entrance' in t or t.get('amenity') == 'parking_entrance'): continue
        x, z = tm(e)
        if not WIN.contains(Point(x, z)): continue
        eing.append({'osm': e['id'], 'x': round(x, 1), 'z': round(z, 1),
                     'typ': t.get('entrance') or 'parking', 'ebene': t.get('level'), 'name': t.get('name'),
                     'access': t.get('access'), 'maxheight': t.get('maxheight')})

    # Teich
    teich = None
    for e in E:
        if e['type'] == 'way' and e.get('tags', {}).get('natural') == 'water':
            g = geom(e)
            if gelaende.buffer(20).contains(g.centroid): teich = rnd(g.simplify(0.4))

    # Außen-Wegenetz (Routing): Knoten an Kreuzungen und Enden, Zwischenpunkte als via
    netz = build_netz(netz_ways)
    add_anchors(netz)
    heli = next((rnd(geom(e).simplify(0.3)) for e in E if e['type'] == 'way' and e['id'] == HELIPAD), None)

    out = {
        'quelle': '© OpenStreetMap-Mitwirkende, ODbL 1.0',
        'abgerufen': datetime.date.today().isoformat(),
        'georef': {'lat0': LAT0, 'lon0': LON0, 'drehung': ROT, 'geschosshoehe': FH,
                   'hinweis': 'Modellursprung Mitte Haupthaus; x entlang der Gebäudeachse, z quer dazu'},
        'gebaeude': gebaeude, 'umgebung': umgebung, 'gelaende': rnd(gelaende.simplify(0.5)),
        'teich': teich, 'heli': heli, 'strassen': strassen, 'wege': wege, 'eingaenge': eing, 'netz': netz,
    }
    js = 'window.KBM_OSM = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';'
    open(os.path.join(HERE, 'osm_data.js'), 'w').write(js + '\n')
    n_t = sum(len(b['teile']) for b in gebaeude.values())
    print(f"{len(gebaeude)} Gebäude / {n_t} Teile, {len(umgebung)} Umgebungsgebäude, {len(strassen)} Straßenzüge, "
          f"{len(wege)} Wege, {len(eing)} Eingänge, Netz {len(netz['knoten'])} Knoten / {len(netz['kanten'])} Kanten")
    if '--embed' in args:
        p = os.path.join(ROOT, 'index.html'); h = open(p).read()
        h2, n = re.subn(r'/\* OSM-BEGIN \*/.*?/\* OSM-END \*/', lambda m: '/* OSM-BEGIN */\n' + js + '\n/* OSM-END */', h, flags=re.S)
        if not n: sys.exit('Marker /* OSM-BEGIN */ … /* OSM-END */ in index.html nicht gefunden')
        open(p, 'w').write(h2); print('in index.html eingebettet')


def build_netz(netz_ways):
    """Wegenetz aus OSM-Linien: gemeinsame Punkte werden zu Knoten, Zwischenpunkte zu via."""
    key = lambda p: (round(p[0], 1), round(p[1], 1))
    uses = {}
    for e, line in netz_ways:
        cs = [key(c) for c in line.coords]
        for i, c in enumerate(cs): uses[c] = uses.get(c, 0) + (2 if i in (0, len(cs) - 1) else 1)
    knoten, kanten, ids = {}, [], {}
    def nid(c):
        if c not in ids:
            ids[c] = f'o{len(ids) + 1}'; knoten[ids[c]] = c
        return ids[c]
    for e, line in netz_ways:
        t = e['tags']; hw = t['highway']
        cs = [key(c) for c in line.coords]
        if t.get('access') in ('no', 'private') and t.get('emergency') != 'yes' and hw != 'service': continue
        o = {'src': 'osm', 'osm': e['id']}
        name = t.get('name') or {'service': 'Zufahrt' if t.get('service') != 'parking_aisle' else 'Parkplatzgasse',
                                 'footway': 'Fußweg', 'path': 'Weg', 'pedestrian': 'Platz', 'cycleway': 'Radweg'}.get(hw, hw)
        if t.get('service') == 'emergency_access' or (t.get('emergency') == 'yes' and t.get('access') == 'no'):
            name += ' (nur Rettungsdienst)'; o['allow'] = ['patient']
        if t.get('tunnel') == 'building_passage': name += ' (Durchfahrt)'
        if t.get('maxheight'): o['maxheight'] = num(t['maxheight'])
        if t.get('access') in ('permit', 'delivery', 'private') or t.get('motor_vehicle') in ('private', 'permit', 'destination'):
            o['zugang'] = t.get('access') or t.get('motor_vehicle')
        o['name'] = name
        start, via = cs[0], []
        for c in cs[1:]:
            if uses.get(c, 0) >= 2 or c == cs[-1]:
                if c != start:
                    oo = dict(o)
                    if via: oo['via'] = [list(v) for v in via]
                    kanten.append([nid(start), nid(c), 'aussen', oo])
                start, via = c, []
            else:
                via.append(c)
    # nur die größte zusammenhängende Komponente behalten
    adj = {k: set() for k in knoten}
    for a, b, _, _ in kanten: adj[a].add(b); adj[b].add(a)
    seen, best = set(), set()
    for k in knoten:
        if k in seen: continue
        comp, st = set(), [k]
        while st:
            n = st.pop()
            if n in comp: continue
            comp.add(n); st.extend(adj[n] - comp)
        seen |= comp
        if len(comp) > len(best): best = comp
    kanten = [k for k in kanten if k[0] in best]
    return {'knoten': [[k, round(c[0], 1), round(c[1], 1)] for k, c in knoten.items() if k in best], 'kanten': kanten}


def add_anchors(netz):
    """Anschlusspunkte an die nächste passende Kante hängen (Kante wird am Lotfußpunkt geteilt)."""
    K = {k: (x, z) for k, x, z in netz['knoten']}
    for aid, a in ANCHORS.items():
        P = Point(a['p']); best = None
        for i, (u, v, typ, o) in enumerate(netz['kanten']):
            if a.get('filter') and a['filter'] not in o['name']: continue
            if o.get('allow') and 'Rettungsdienst' not in (a.get('filter') or ''): continue
            pts = [K[u]] + [tuple(q) for q in o.get('via', [])] + [K[v]]
            line = LineString(pts); d = line.distance(P)
            if best is None or d < best[0]: best = (d, i, line)
        if best is None: raise SystemExit(f'Anschluss {aid}: keine passende Kante')
        d, i, line = best
        u, v, typ, o = netz['kanten'][i]
        t = line.project(P); q = line.interpolate(t)
        sid = aid + '_s'
        K[sid] = (round(q.x, 1), round(q.y, 1))
        # Kante am Lotfußpunkt teilen, Zwischenpunkte aufteilen
        cs = list(line.coords); acc, cut = 0, len(cs) - 1
        for j in range(1, len(cs)):
            seg = math.dist(cs[j - 1], cs[j])
            if acc + seg >= t: cut = j; break
            acc += seg
        o1, o2 = dict(o), dict(o)
        v1, v2 = [list(c) for c in cs[1:cut]], [list(c) for c in cs[cut:-1]]
        o1.pop('via', None); o2.pop('via', None)
        if v1: o1['via'] = v1
        if v2: o2['via'] = v2
        netz['kanten'][i] = [u, sid, typ, o1]
        netz['kanten'].append([sid, v, typ, o2])
        K[aid] = (round(a['p'][0], 1), round(a['p'][1], 1))
        if math.dist(K[aid], K[sid]) > 0.5:
            netz['kanten'].append([sid, aid, 'aussen', {'name': a['name'], 'src': 'osm' if a.get('osm') else 'annahme'}])
        else:
            K[aid] = K[sid]; netz['kanten'][-1][0] = aid; netz['kanten'][i][1] = aid; del K[sid]
        a['knoten'] = aid
    netz['knoten'] = [[k, x, z] for k, (x, z) in K.items()]
    netz['anschluss'] = {k: {'name': a['name'], 'osm': a.get('osm')} for k, a in ANCHORS.items()}


if __name__ == '__main__':
    main()
