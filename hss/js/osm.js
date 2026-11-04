/* =====================================================================
   HSS · osm.js – Umgebung und Zielobjekt aus OpenStreetMap (und amtlichen Daten) laden
   Lädt rund um den verorteten Standort (Projekt → Standort: lat/lon, Nordwinkel):
     Straßen und Wege mit Namen und Breiten nach Straßenklasse, Feldwege, Bahngleise,
     Bäche, Flächennutzung, Einzelbäume, Gebäude der Umgebung und – je nach Edition –
     das Zielobjekt als bearbeitbare Modellgebäude:
       Healthcare: Krankenhaus (Klinikgelände amenity=hospital)
       Fabric:     Werk / Fabrikgelände (man_made=works, industrial=*, landuse=industrial
                   bzw. zusammenhängende Hallen um die Adresse), Tanks, Silos, Schornsteine
       Home:       Haus an der Adresse mit Nebengebäuden, Grundstück (Flurstück oder
                   geschätzt), Garten, Zäune/Hecken, Bäume
   Genauere Gebäude als bisher:
     · Multipolygone werden aus ihren Teilstücken zusammengesetzt, Innenhöfe bleiben offen
     · building:part (Gebäudeteile mit eigener Höhe, min_height, Dachform) wird genutzt
     · Umrisse werden bereinigt: Doppelpunkte, Zacken < 0,2 m, fast gerade Ecken; nahezu
       rechtwinklige Gebäude werden exakt rechtwinklig gestellt, Rechtecke als Rechteck-
       Bauteil (mit Griffen) angelegt und nach der Gebäudeachse gedreht
     · Höhe/Geschosse aus building:levels, height, min_height, building:min_level,
       roof:height, roof:levels; Hallen (industrial, warehouse …) als hohe Eingeschosser
     · Dachform aus roof:shape (Sattel, Walm, Zelt, Pult, Shed), sonst je Gebäudeart
   Amtliche Daten (optional): ALKIS NRW (Gebäudegrundrisse mit Funktion und Adresse,
   Flurstücke) über den offenen WFS „ALKIS vereinfacht“ (dl-de/zero-2.0).
   Ausfallsicherheit: ist kein Overpass-Server erreichbar, werden die Daten kachelweise
   über die OSM-API (api.openstreetmap.org) geladen.
   Adresssuche über Photon (Vorschläge beim Tippen, Deutschland/Österreich/Schweiz),
   ersatzweise Nominatim.
   Daten: © OpenStreetMap-Mitwirkende, ODbL 1.0 · ALKIS: © GeoBasis-DE / NRW, dl-de/zero-2.0
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$;
const O = HSS.osm = {};
const SERVER = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
const ED = () => HSS.EDITION || 'health';

/* Geokoordinaten → Modellraster (x Osten, z Süden, gedreht um den Nordwinkel des Projekts) */
O.proj = (geo) => {
  const c = Math.cos(U.rad(geo.lat)), a = U.rad(-(geo.nord || 0));
  return (lat, lon) => { const e = (lon - geo.lon) * 111320 * c, s = -(lat - geo.lat) * 110574; const q = G.rot([e, s], a); return [r2(q[0]), r2(q[1])]; };
};
const STRASSE = { motorway: [12, 'strasse', 4, 80], trunk: [11, 'strasse', 4, 70], primary: [9, 'strasse', 4, 50], secondary: [8, 'strasse', 3, 50], tertiary: [7, 'strasse', 3, 50], unclassified: [6, 'strasse', 2, 30], residential: [6, 'strasse', 2, 30], living_street: [5, 'strasse', 1, 10], service: [4.5, 'zufahrt', 0, 20], track: [3, 'feldweg', 0, 0], footway: [2.2, 'gehweg', 0, 0], path: [1.8, 'gehweg', 0, 0], pedestrian: [5, 'weg', 0, 0], cycleway: [2.2, 'gehweg', 0, 0], steps: [2, 'gehweg', 0, 0], bridleway: [2.5, 'feldweg', 0, 0] };
const FLAECHE = (t) => {
  if (t.amenity === 'parking' && (!t.parking || t.parking === 'surface')) return 'parkplatz';
  if (t.landuse === 'farmland' || t.landuse === 'farmyard') return 'acker';
  if (['meadow', 'grass', 'greenfield', 'village_green', 'recreation_ground', 'brownfield'].includes(t.landuse) || ['grassland', 'heath', 'scrub'].includes(t.natural)) return 'wiese';
  if (t.landuse === 'forest' || t.natural === 'wood') return 'wald';
  if (['orchard', 'vineyard', 'allotments', 'plant_nursery'].includes(t.landuse) || ['park', 'garden'].includes(t.leisure)) return 'park';
  if (t.landuse === 'cemetery' || t.amenity === 'grave_yard') return 'friedhof';
  if (['pitch', 'sports_centre', 'playground', 'track'].includes(t.leisure)) return 'sport';
  if (t.natural === 'water' || ['reservoir', 'basin'].includes(t.landuse) || t.water || t.leisure === 'swimming_pool') return 'wasser';
  if (['residential'].includes(t.landuse)) return 'wohngebiet';
  if (['commercial', 'industrial', 'retail', 'railway', 'construction'].includes(t.landuse)) return 'gewerbe';
  if (t.place === 'square' || t.amenity === 'marketplace' || (t.highway === 'pedestrian' && t.area === 'yes') || t['area:highway']) return 'platz';
  return null;
};
const LAGE = { wohngebiet: 0, gewerbe: 0, acker: 1, wiese: 1, wald: 2, park: 2, friedhof: 2, sport: 3, parkplatz: 4, wasser: 5, platz: 3 };

/* ---------- Ziele je Edition ---------- */
O.ZIEL = {
  health: { name: 'Krankenhaus', icon: '🏥', gelaende: 'Klinikgelände', mit: 'Umgebung mit Krankenhaus', text: 'Alle Gebäude des Klinikgeländes als bearbeitbare Modellgebäude mit Geschossen und Dachformen aus OSM, Grenze des Geländes, Hubschrauberlandeplatz', radius: 600, suche: 'Adresse oder Krankenhaus suchen', bsp: 'z. B. Klinikum Bielefeld Mitte · AKH Wien · Universitätsspital Zürich', prefix: 'osmk_' },
  fabrik: { name: 'Werk', icon: '🏭', gelaende: 'Werksgelände', mit: 'Umgebung mit Werk / Fabrik', text: 'Alle Hallen und Gebäude des Werksgeländes als Modellgebäude (Hallen als hohe Eingeschosser, Shed- und Satteldächer aus OSM), Tanks, Silos, Schornsteine, Werkszaun, Gleisanschluss', radius: 500, suche: 'Adresse oder Firma / Werk suchen', bsp: 'z. B. Dr. Oetker Bielefeld · Miele Gütersloh · Claas Harsewinkel', prefix: 'osmk_' },
  home: { name: 'Haus', icon: '🏠', gelaende: 'Grundstück', mit: 'Umgebung mit Haus', text: 'Das Haus an der Adresse als Modellgebäude mit Dachform, Garage und Nebengebäuden, Grundstück mit Garten, Zäune, Hecken und Bäume', radius: 220, suche: 'Adresse suchen (Straße Hausnummer, Ort)', bsp: 'z. B. Musterstraße 12, 33602 Bielefeld', prefix: 'osmk_' }
};
O.ziel = () => O.ZIEL[ED()] || O.ZIEL.health;

O.query = (geo, radius, mitZiel) => {
  const dLat = radius / 110574, dLon = radius / (111320 * Math.cos(U.rad(geo.lat)));
  const bb = `${geo.lat - dLat},${geo.lon - dLon},${geo.lat + dLat},${geo.lon + dLon}`;
  const e = ED();
  const near = Math.min(radius, e === 'home' ? 160 : 350); // Einzelbäume nur im Nahbereich
  const nLat = near / 110574, nLon = near / (111320 * Math.cos(U.rad(geo.lat)));
  const nb = `${geo.lat - nLat},${geo.lon - nLon},${geo.lat + nLat},${geo.lon + nLon}`;
  return `[out:json][timeout:90];(
    way["highway"](${bb});
    way["landuse"](${bb}); relation["landuse"](${bb});
    way["natural"~"^(wood|water|scrub|grassland|heath|wetland)$"](${bb}); relation["natural"~"^(wood|water)$"](${bb});
    way["leisure"~"^(park|garden|pitch|playground|sports_centre|track|swimming_pool)$"](${bb});
    way["waterway"~"^(river|stream|canal|ditch)$"](${bb});
    way["railway"~"^(rail|tram|light_rail)$"](${bb});
    way["amenity"~"^(hospital|parking|grave_yard|marketplace)$"](${bb}); relation["amenity"="hospital"](${bb});
    way["place"="square"](${bb});
    way["building"](${bb}); relation["building"](${bb});
    way["building:part"](${bb}); relation["building:part"](${bb});
    node["natural"="tree"](${nb});${mitZiel || e !== 'health' ? `
    way["barrier"~"^(fence|wall|hedge)$"](${nb});` : ''}${e === 'health' || mitZiel ? `
    node["aeroway"="helipad"](${bb}); way["aeroway"="helipad"](${bb});` : ''}${e === 'fabrik' ? `
    nwr["man_made"~"^(works|storage_tank|silo|chimney|gasometer|water_tower|tower|crane|bunker_silo)$"](${bb});
    way["industrial"](${bb}); relation["industrial"](${bb}); relation["man_made"="works"](${bb});
    way["power"~"^(plant|substation)$"](${bb});` : ''}
  );out geom;`;
};
O.fetch = async (q, onTry) => {
  let last;
  for (let i = 0; i < SERVER.length + 1; i++) {
    const url = SERVER[i % SERVER.length]; onTry && onTry(url);
    try {
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 60000);
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 1200)); }
  }
  throw new Error('OpenStreetMap (Overpass) nicht erreichbar: ' + (last?.message || last));
};
/* Ersatzweg: OSM-API (api.openstreetmap.org/api/0.6/map) kachelweise, in Overpass-Form umgewandelt */
O.fetchApi = async (geo, radius, onInfo) => {
  const R = Math.min(radius, 450), dLat = R / 110574, dLon = R / (111320 * Math.cos(U.rad(geo.lat)));
  const n = R > 250 ? 3 : R > 120 ? 2 : 1, tiles = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const la0 = geo.lat - dLat + 2 * dLat * i / n, la1 = geo.lat - dLat + 2 * dLat * (i + 1) / n, lo0 = geo.lon - dLon + 2 * dLon * j / n, lo1 = geo.lon - dLon + 2 * dLon * (j + 1) / n;
    tiles.push(`${lo0.toFixed(6)},${la0.toFixed(6)},${lo1.toFixed(6)},${la1.toFixed(6)}`);
  }
  const nodes = new Map(), ways = new Map(), rels = new Map(); let done = 0;
  const one = async bbox => {
    for (let k = 0; k < 3; k++) {
      try {
        const r = await fetch('https://api.openstreetmap.org/api/0.6/map.json?bbox=' + bbox);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j = await r.json();
        for (const e of j.elements || []) (e.type === 'node' ? nodes : e.type === 'way' ? ways : rels).set(e.id, e);
        onInfo && onInfo(`OSM-API: Kachel ${++done}/${tiles.length} geladen …`); return;
      } catch (e) { if (k === 2) throw e; await new Promise(res => setTimeout(res, 1500)); }
    }
  };
  for (let i = 0; i < tiles.length; i += 3) await Promise.all(tiles.slice(i, i + 3).map(one));
  const geom = w => (w.nodes || []).map(id => nodes.get(id)).filter(Boolean).map(nd => ({ lat: nd.lat, lon: nd.lon }));
  const out = [];
  for (const nd of nodes.values()) if (nd.tags) out.push({ type: 'node', id: nd.id, lat: nd.lat, lon: nd.lon, tags: nd.tags });
  for (const w of ways.values()) if (w.tags) out.push({ type: 'way', id: w.id, tags: w.tags, geometry: geom(w) });
  for (const r of rels.values()) if (r.tags) out.push({ type: 'relation', id: r.id, tags: r.tags, members: (r.members || []).map(m => Object.assign({}, m, m.type === 'way' && ways.get(m.ref) ? { geometry: geom(ways.get(m.ref)) } : {})) });
  return { elements: out, quelle: 'osm-api', radius: R };
};
// Deutschland, Österreich, Schweiz (DACH)
const DACH = ['DE', 'AT', 'CH'], DACH_BBOX = '5.8,45.7,17.3,55.1';
O.geocode = async (q) => {
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=de,at,ch&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'de' } });
  if (!r.ok) throw new Error('Adresssuche nicht erreichbar (HTTP ' + r.status + ')');
  return (await r.json()).map(x => ({ name: x.display_name, sub: '', lat: +x.lat, lon: +x.lon, osm: { type: x.osm_type, id: x.osm_id }, hospital: x.type === 'hospital', werk: ['works', 'industrial', 'factory'].includes(x.type), haus: !!x.address?.house_number, hausnr: x.address?.house_number, strasse: x.address?.road, land: x.address?.state }));
};
// Vorschläge beim Tippen (Photon, OSM-basiert, für Suchvorschläge gedacht)
O.suche = async (q, signal) => {
  const r = await fetch(`https://photon.komoot.io/api/?lang=de&limit=10&bbox=${DACH_BBOX}&q=${encodeURIComponent(q)}`, { signal });
  if (!r.ok) throw new Error('Adresssuche nicht erreichbar (HTTP ' + r.status + ')');
  const typ = { N: 'node', W: 'way', R: 'relation' };
  return (await r.json()).features.filter(f => DACH.includes(f.properties.countrycode)).map(f => {
    const p = f.properties, str = [p.street && (p.street + (p.housenumber ? ' ' + p.housenumber : '')), [p.postcode, p.city || p.town || p.village].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const land = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' }[p.countrycode];
    return { name: p.name || str || p.city || '', sub: [p.name ? str : '', p.state, land].filter(Boolean).join(' · '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], osm: { type: typ[p.osm_type], id: p.osm_id }, hospital: p.osm_value === 'hospital' || p.osm_value === 'clinic', werk: ['works', 'industrial', 'factory', 'manufacture', 'warehouse'].includes(p.osm_value) || p.osm_key === 'industrial', haus: !!p.housenumber, hausnr: p.housenumber, strasse: p.street, land: p.state, extent: p.extent };
  });
};

/* ---------- Geometrie-Helfer ---------- */
function hull(pts) {
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
O.hull = hull;
const centroid = r => { let a = 0, cx = 0, cz = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length], c = p[0] * q[1] - q[0] * p[1]; a += c; cx += (p[0] + q[0]) * c; cz += (p[1] + q[1]) * c; } if (Math.abs(a) < 1e-9) { const b = G.bbox(r); return [b.cx, b.cz]; } return [cx / (3 * a), cz / (3 * a)]; };
const buffer = (ring, d) => { const c = centroid(ring); return ring.map(p => { const dx = p[0] - c[0], dz = p[1] - c[1], l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * d, p[1] + dz / l * d]; }); };
const nearRing = (p, r, d) => G.pointIn(p, r) || r.some((q, i) => G.dist(p, G.closestOnSeg(p, q, r[(i + 1) % r.length]).pt) < d);

/* Multipolygon: Teilstücke der Mitglieder zu geschlossenen Ringen zusammensetzen */
const same = (a, b) => Math.abs(a.lat - b.lat) < 1e-8 && Math.abs(a.lon - b.lon) < 1e-8;
function zusammensetzen(stuecke) {
  const offen = stuecke.filter(s => s && s.length >= 2).map(s => s.slice()), ringe = [];
  while (offen.length) {
    let cur = offen.shift(), guard = 0;
    while (!same(cur[0], cur[cur.length - 1]) && guard++ < 500) {
      const end = cur[cur.length - 1]; let k = offen.findIndex(s => same(s[0], end) || same(s[s.length - 1], end));
      if (k < 0) break;
      let s = offen.splice(k, 1)[0]; if (!same(s[0], end)) s = s.slice().reverse();
      cur = cur.concat(s.slice(1));
    }
    if (cur.length >= 4) ringe.push(cur);
  }
  return ringe;
}
// Ringe eines Elements in Lat/Lon: { outer: [[{lat,lon}…]…], inner: […] }
O.ringeLL = el => {
  if (el._r) return el._r;
  let r;
  if (el.type === 'relation') {
    const m = el.members || [];
    r = { outer: zusammensetzen(m.filter(x => x.type === 'way' && x.role !== 'inner' && x.geometry).map(x => x.geometry)), inner: zusammensetzen(m.filter(x => x.type === 'way' && x.role === 'inner' && x.geometry).map(x => x.geometry)) };
  } else r = { outer: el.geometry && el.geometry.length >= 3 ? [el.geometry] : [], inner: el._inner || [] };
  return (el._r = r);
};
const inLL = (pt, ring) => G.pointIn([pt.lon, pt.lat], ring.map(g => [g.lon, g.lat]));
const llArea = (ring, lat) => Math.abs(G.area(ring.map(g => [g.lon * 111320 * Math.cos(U.rad(lat)), g.lat * 110574])));
const llCenter = rings => { const all = rings.flat(); return all.reduce((a, g) => [a[0] + g.lat / all.length, a[1] + g.lon / all.length], [0, 0]); };

/* Umriss bereinigen (Meter): Doppelpunkte, Zacken, fast gerade Ecken; rechtwinklig stellen */
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1;
    for (let i = a + 1; i < b; i++) { const d = G.dist(pts[i], G.closestOnSeg(pts[i], pts[a], pts[b]).pt); if (d > md) { md = d; mi = i; } }
    if (md > tol && mi > 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function bereinigen(ring, tol = 0.2) {
  let r = ring.slice(); if (r.length > 2 && G.dist(r[0], r[r.length - 1]) < 0.05) r.pop();
  r = r.filter((p, i) => G.dist(p, r[(i + 1) % r.length]) > 0.12);
  if (r.length < 3) return r;
  // geschlossenen Ring am weitesten entfernten Punkt auftrennen, vereinfachen
  let far = 0, fd = 0; for (let i = 1; i < r.length; i++) { const d = G.dist(r[0], r[i]); if (d > fd) { fd = d; far = i; } }
  const A = dp(r.slice(0, far + 1), tol), B = dp(r.slice(far).concat([r[0]]), tol);
  r = A.slice(0, -1).concat(B.slice(0, -1));
  // fast gerade Ecken (< 4°) entfernen
  for (let pass = 0; pass < 3 && r.length > 3; pass++) r = r.filter((p, i) => { const a = r[(i - 1 + r.length) % r.length], b = r[(i + 1) % r.length]; const v1 = [p[0] - a[0], p[1] - a[1]], v2 = [b[0] - p[0], b[1] - p[1]]; const cr = v1[0] * v2[1] - v1[1] * v2[0], dt = v1[0] * v2[0] + v1[1] * v2[1]; return Math.abs(Math.atan2(cr, dt)) > U.rad(4); });
  return r;
}
// Hauptrichtung (Winkel modulo 90°, längengewichtet)
function hauptrichtung(r) {
  let sx = 0, sy = 0;
  for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], L = G.dist(a, b), t = Math.atan2(b[1] - a[1], b[0] - a[0]); sx += L * Math.cos(4 * t); sy += L * Math.sin(4 * t); }
  return Math.atan2(sy, sx) / 4;
}
function selbstschnitt(r) {
  const n = r.length, x = (a, b, c, d) => { const o = (p, q, s) => Math.sign((q[0] - p[0]) * (s[1] - p[1]) - (q[1] - p[1]) * (s[0] - p[0])); return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0; };
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (x(r[i], r[(i + 1) % n], r[j], r[(j + 1) % n])) return true; }
  return false;
}
// Rechtwinklig stellen, wenn ≥ 80 % des Umfangs fast achsparallel (± 9°) zur Hauptrichtung liegen
function rechtwinklig(r) {
  if (r.length < 4) return null;
  const th = hauptrichtung(r), c = Math.cos(-th), s = Math.sin(-th);
  const q = r.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]);
  const n = q.length, kl = [], tol = U.rad(9); let ok = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const a = q[i], b = q[(i + 1) % n], L = G.dist(a, b), t = Math.atan2(b[1] - a[1], b[0] - a[0]); sum += L;
    const m = ((t % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2), dev = Math.min(m, Math.PI / 2 - m);
    if (dev < tol) { const horiz = Math.abs(Math.cos(t)) > Math.abs(Math.sin(t)); kl.push(horiz ? 'H' : 'V'); ok += L; } else kl.push(null);
  }
  if (ok / sum < 0.8) return null;
  // Lage der Kanten: H → z-Mittel, V → x-Mittel
  const val = kl.map((k, i) => { const a = q[i], b = q[(i + 1) % n]; return k === 'H' ? (a[1] + b[1]) / 2 : k === 'V' ? (a[0] + b[0]) / 2 : null; });
  // aufeinanderfolgende gleichgerichtete Kanten liegen auf einer gemeinsamen Flucht (längengewichtet)
  const start = kl.findIndex((k, i) => k !== kl[(i - 1 + n) % n]);
  if (start >= 0) for (let s0 = start, done = 0; done < n;) {
    let j = s0, L = 0, S = 0; const k0 = kl[s0], run = [];
    do { const a = q[j], b = q[(j + 1) % n], l = G.dist(a, b); run.push(j); L += l; S += (val[j] ?? 0) * l; j = (j + 1) % n; done++; } while (kl[j] === k0 && j !== s0 && done < n);
    if (k0 && L > 0) for (const i of run) val[i] = S / L;
    s0 = j; if (j === start) break;
  }
  let out = [];
  for (let i = 0; i < n; i++) {
    const kp = kl[(i - 1 + n) % n], kn = kl[i], vp = val[(i - 1 + n) % n], vn = val[i], p = q[i];
    if (kp && kn && kp === kn) continue; // zwei gleichgerichtete Kanten: Ecke entfällt
    let x = p[0], z = p[1];
    if (kp === 'H') z = vp; if (kp === 'V') x = vp;
    if (kn === 'H') z = vn; if (kn === 'V') x = vn;
    out.push([x, z]);
  }
  out = out.filter((p, i) => G.dist(p, out[(i + 1) % out.length]) > 0.1);
  if (out.length < 3) return null;
  const a0 = Math.abs(G.area(q)), a1 = Math.abs(G.area(out));
  if (Math.abs(a1 - a0) / a0 > 0.05 || selbstschnitt(out)) return null;
  return { th, lokal: out };
}
/* Grundriss eines Gebäudeteils: Welt-Ring (Meter) → Bauteil-Geometrie */
O.form = (ringW, holesW = [], o = {}) => {
  let r = bereinigen(ringW, o.tol ?? 0.2); if (r.length < 3) return null;
  const holes = holesW.map(h => bereinigen(h, 0.2)).filter(h => h.length >= 3 && Math.abs(G.area(h)) > 4);
  const rw = !holes.length && o.ortho !== false ? rechtwinklig(r) : null;
  if (rw) {
    const bb = G.bbox(rw.lokal), cl = [(bb.x0 + bb.x1) / 2, (bb.z0 + bb.z1) / 2], wc = G.rot(cl, rw.th);
    const deg = Math.round(U.deg(rw.th) * 10) / 10;
    if (rw.lokal.length === 4) return { shape: 'rect', x: r1(wc[0]), z: r1(wc[1]), w: r1(bb.x1 - bb.x0), d: r1(bb.z1 - bb.z0), rot: deg, poly: null, orth: true };
    const loc = G.ccw(rw.lokal.map(p => [r2(p[0] - cl[0]), r2(p[1] - cl[1])]));
    return { shape: 'poly', x: r1(wc[0]), z: r1(wc[1]), w: r1(bb.x1 - bb.x0), d: r1(bb.z1 - bb.z0), rot: deg, poly: loc, orth: true };
  }
  // freies Vieleck: lokal in Hauptrichtung gedreht (Griffe/Maße folgen der Gebäudeachse)
  const th = hauptrichtung(r), c = Math.cos(-th), s = Math.sin(-th);
  const q = r.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]), bb = G.bbox(q), cl = [bb.cx, bb.cz], wc = G.rot(cl, th);
  const loc = G.ccw(q.map(p => [r2(p[0] - cl[0]), r2(p[1] - cl[1])]));
  const hl = holes.map(h => h.map(p => { const t = [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; return [r2(t[0] - cl[0]), r2(t[1] - cl[1])]; }));
  return { shape: 'poly', x: r1(wc[0]), z: r1(wc[1]), w: r1(bb.w), d: r1(bb.d), rot: Math.round(U.deg(th) * 10) / 10, poly: loc, polyHoles: hl.length ? hl : undefined, orth: false };
};

/* ---------- Höhen, Geschosse, Dach aus OSM-Tags ---------- */
const num = v => { if (v === undefined || v === null) return NaN; const m = String(v).replace(',', '.').match(/-?\d+(\.\d+)?/); if (!m) return NaN; let x = parseFloat(m[0]); if (/ft|'/.test(String(v))) x *= 0.3048; return x; };
const HALLE = ['industrial', 'warehouse', 'manufacture', 'hangar', 'factory', 'storage', 'logistics', 'barn', 'riding_hall', 'sports_hall', 'greenhouse', 'farm_auxiliary', 'cowshed', 'stable'];
const HAUS = ['house', 'detached', 'semidetached_house', 'terrace', 'farm', 'bungalow', 'cabin', 'villa', 'residential', 'farmhouse', 'semi'];
const KLEIN = ['garage', 'garages', 'shed', 'carport', 'hut', 'kiosk', 'service', 'toilets', 'gazebo'];
const DACH_OSM = { gabled: 'sattel', hipped: 'walm', half_hipped: 'walm', side_hipped: 'walm', pyramidal: 'zelt', skillion: 'pult', lean_to: 'pult', sawtooth: 'shed', flat: 'flach', gambrel: 'sattel', mansard: 'walm', saltbox: 'sattel', crosspitched: 'walm', round: 'flach', dome: 'flach', onion: 'flach' };
const FUNKTION_ALKIS = [[/Wohnhaus|Wohngebäude|Einfamilien|Doppelhaus|Reihenhaus|Bungalow/i, 'house'], [/Garage|Gebäude zum Parken|Tiefgarage|Parkhaus/i, 'garage'], [/Schuppen|Gartenhaus|Laube|Stall|Scheune/i, 'shed'], [/Überdachung|Carport/i, 'roof'], [/Fabrik|Produktion|Werkstatt|Industrie|Betriebsgebäude|Lager|Halle|Gewerbe|Wirtschaft/i, 'industrial'], [/Büro|Verwaltung/i, 'office'], [/Krankenhaus|Klinik/i, 'hospital'], [/Schule/i, 'school'], [/Handel|Kauf|Geschäft/i, 'retail'], [/Mehrfamilien|Wohnen/i, 'apartments']];
O.hoehen = (t, area, o = {}) => {
  const typ = t.building && t.building !== 'yes' ? t.building : (t['building:part'] && t['building:part'] !== 'yes' ? t['building:part'] : (o.typ || 'yes'));
  const e = ED(), halle = HALLE.includes(typ) || (o.halle && area > 600), haus = HAUS.includes(typ) && area < 450, klein = KLEIN.includes(typ) || (area < 40 && !t['building:levels']);
  const park = typ === 'parking' || t.parking === 'multi-storey' || t.amenity === 'parking';
  const L = num(t['building:levels']), ML = num(t['building:min_level']) || 0, H = num(t.height), MH = num(t.min_height) || 0;
  const RL = num(t['roof:levels']) || 0, RH0 = num(t['roof:height']);
  let dach = DACH_OSM[t['roof:shape']] || null, quelleDach = dach ? 'osm' : 'annahme';
  if (!dach) dach = haus && e !== 'fabrik' ? 'sattel' : klein && typ !== 'carport' ? (typ === 'shed' ? 'pult' : 'flach') : 'flach';
  if (typ === 'roof' || typ === 'carport') dach = 'flach';
  const fhStd = typ === 'hospital' ? 3.8 : park ? 3.0 : haus || ['apartments', 'dormitory'].includes(typ) ? 2.85 : klein ? 2.6 : ['office', 'commercial', 'school', 'university', 'public', 'civic'].includes(typ) ? 3.5 : typ === 'retail' ? 4.2 : 3.2;
  const geneigt = dach !== 'flach';
  // Dachhöhe: aus roof:height, roof:levels oder (geneigt, Haus) geschätzt
  let RH = !isNaN(RH0) ? RH0 : RL ? RL * 2.6 : 0;
  let floors, fh, quelle;
  if (!isNaN(L) && L > 0) {
    floors = Math.max(1, Math.round(L - ML)); quelle = 'osm';
    if (!isNaN(H) && H > MH) { const wand = H - MH - (geneigt ? (RH || Math.min(5, (H - MH) * 0.3)) : RH); fh = U.clamp(wand / floors, 2.4, 12); if (geneigt && !RH) RH = Math.max(0, H - MH - fh * floors); }
    else fh = halle && floors === 1 ? (area > 2500 ? 9 : area > 800 ? 7.5 : 6) : fhStd;
  } else if (!isNaN(H) && H > MH) {
    quelle = 'hoehe';
    let wand = H - MH - RH; if (geneigt && !RH) { RH = haus ? Math.min(5.5, (H - MH) * 0.38) : Math.min(4, (H - MH) * 0.25); wand = H - MH - RH; }
    if (halle && wand > 4.5) { floors = 1; fh = U.clamp(wand, 3, 30); }
    else { floors = Math.max(1, Math.round(wand / fhStd)); fh = U.clamp(wand / floors, 2.4, 8); }
  } else {
    quelle = 'annahme';
    if (halle) { floors = 1; fh = area > 6000 ? 11 : area > 2500 ? 9 : area > 800 ? 7.5 : 5.5; }
    else if (park) { floors = 3; fh = 3.0; }
    else if (klein) { floors = 1; fh = typ === 'carport' || typ === 'roof' ? 2.5 : 2.7; }
    else if (haus) { floors = typ === 'bungalow' ? 1 : 2; fh = 2.85; }
    else floors = ({ apartments: 4, office: 4, commercial: 3, retail: 1, hospital: 4, school: 3, university: 4, hotel: 5, church: 1, industrial: 1, public: 3 }[typ]) || 2, fh = fhStd;
    if (typ === 'church') fh = 10;
  }
  const ug = num(t['building:levels:underground']) || (typ === 'hospital' && area > 800 ? 1 : 0);
  const roof = { type: dach, parapet: geneigt ? 0 : halle ? 0.5 : klein ? 0.15 : 0.6, plant: !geneigt && !klein && !park && area > 600, color: '#9aa3ad' };
  if (geneigt) {
    if (RH > 0.3) roof.hoehe = r1(RH);
    const ang = num(t['roof:angle']); if (!isNaN(ang)) roof.neigung = ang;
    if (dach === 'shed') roof.raster = 10;
    if (halle && dach === 'sattel' && !roof.hoehe && isNaN(ang)) roof.neigung = 12;
  }
  if (t['roof:colour']) roof.color = String(t['roof:colour']).startsWith('#') ? t['roof:colour'] : ({ red: '#a5462b', darkred: '#7d2f22', brown: '#6b4a34', grey: '#6f757c', gray: '#6f757c', darkgrey: '#4a4f55', black: '#33363a', anthracite: '#3d4146', green: '#5f7f52' }[t['roof:colour']] || roof.color);
  return { floors: U.clamp(floors, 1, 60), fh: r2(fh), ug: U.clamp(Math.round(ug), 0, 4), base: MH || (ML ? ML * fhStd : 0), floorOffset: ML ? Math.round(ML) : 0, roof, quelle, quelleDach, typ, halle, haus, klein, park };
};
const FARBEN = ['#144477', '#0A967A', '#d9531e', '#7b5ea7', '#2D7694', '#b9770e', '#891F5E', '#1f9d7a', '#5a6573', '#c0392b', '#16a3b8', '#a07a3c'];
const fassade = (h, typ, i) => {
  const e = ED(), farbe = h.farbe;
  if (h.park) return { type: 'parkhaus', color: '#d9dee3', accent: '#5a6573', glass: '#8aa0b2', axis: 2.5, windowRatio: 0.5 };
  if (h.halle) return { type: 'paneel', color: farbe || '#d7dbe0', accent: '#8d969f', glass: '#8aa0b2', axis: 5, windowRatio: 0.3 };
  if (h.haus || h.klein) return { type: 'loch', color: farbe || '#f1ede4', accent: '#8d6e63', glass: '#6f8fa8', axis: 1.6, windowRatio: h.klein ? 0.2 : 0.45 };
  if (e === 'health') return { type: 'band', color: '#eef0ee', accent: FARBEN[i % FARBEN.length], glass: '#7fa4bd', axis: 1.35, windowRatio: 0.5 };
  return { type: typ === 'office' ? 'band' : 'loch', color: farbe || '#eceae5', accent: FARBEN[i % FARBEN.length], glass: '#7fa4bd', axis: 1.5, windowRatio: 0.45 };
};
const farbeOSM = t => { const c = t['building:colour']; if (!c) return null; if (String(c).startsWith('#')) return c; return { white: '#f4f3ef', yellow: '#efe2a8', beige: '#e9dcc3', red: '#b45a43', brown: '#8a6a52', grey: '#b9bcbf', gray: '#b9bcbf', blue: '#8fb0cf', green: '#a9c3a0' }[c] || null; };

/* Gebäude (Element + optionale building:parts) → Bauteile */
O.bauteile = (el, T, partEls, o = {}) => {
  const t = el.tags || {}, R = O.ringeLL(el), out = [];
  const welt = ring => ring.map(g => T(g.lat, g.lon));
  const outerW = R.outer.map(welt), innerW = R.inner.map(welt);
  const total = U.sum(outerW.map(r => Math.abs(G.area(r))));
  // building:part, die im Umriss liegen und ihn überwiegend abdecken → statt des Umrisses
  let teile = [];
  if (partEls?.length) {
    const bbO = G.bbox(outerW.flat());
    for (const pe of partEls) {
      if (pe._used) continue;
      if (pe._T !== T) { pe._T = T; pe._pr = O.ringeLL(pe).outer.map(welt); pe._c = pe._pr.length ? centroid(pe._pr[0]) : null; }
      const c = pe._c; if (!c || c[0] < bbO.x0 || c[0] > bbO.x1 || c[1] < bbO.z0 || c[1] > bbO.z1) continue;
      if (outerW.some(r => G.pointIn(c, r))) teile.push({ pe, pr: pe._pr, hl: O.ringeLL(pe).inner.map(welt) });
    }
    const cov = U.sum(teile.map(x => Math.abs(G.area(x.pr[0]))));
    if (!(teile.length && cov > total * 0.55)) teile = [];
  }
  const quellen = teile.length ? teile.map(x => ({ tags: Object.assign({}, t, { height: undefined, 'building:levels': undefined, 'roof:shape': undefined }, x.pe.tags), rings: x.pr, holes: x.hl, el: x.pe }))
    : outerW.map(r => ({ tags: t, rings: [r], holes: innerW.filter(h => G.pointIn(h[0], r)), el }));
  for (const [qi, q] of quellen.entries()) for (const [ri, ring] of q.rings.entries()) {
    const area = Math.abs(G.area(ring)); if (area < (o.minArea ?? 12)) continue;
    const f = O.form(ring, q.holes, { ortho: o.ortho }); if (!f) continue;
    const h = O.hoehen(q.tags, area, { halle: o.halle, typ: o.typ }); h.farbe = farbeOSM(q.tags);
    if (q.el !== el) q.el._used = true;
    out.push({ f, h, area, tags: q.tags, id: `${q.el.type[0]}${q.el.id}${ri ? '_' + ri : ''}${qi && q.el === el ? '_' + qi : ''}` });
  }
  return out;
};
const teilAnlegen = (b, x, i, name, o = {}) => {
  const h = x.h, f = x.f;
  const pt = Object.assign(HSS.defaults.part(), { id: (o.prefix || 'osmk_p') + x.id, name: name || b.name, shape: f.shape, poly: f.poly, polyHoles: f.polyHoles, x: f.x, z: f.z, w: f.w, d: f.d, rot: f.rot,
    floors: h.floors, floorHeight: h.fh, basements: h.base ? 0 : h.ug, basementHeight: h.haus ? 2.5 : 3.8, baseOffset: r1(h.base || 0), floorOffset: h.floorOffset || undefined,
    use: h.park ? 'parkhaus' : '', facade: fassade(h, h.typ, i), roof: h.roof, osmQuelle: { geschosse: h.quelle, dach: h.quelleDach } });
  if (!pt.polyHoles) delete pt.polyHoles; if (!pt.floorOffset) delete pt.floorOffset;
  b.parts.push(pt); return pt;
};
const kurzName = (t, n) => { const nm0 = t.name || t['building:name'] || '', ref = /^(?:Haus|Gebäude|Geb\.|Bau|Block|Trakt|Halle)\s+([A-Z0-9]{1,4})\b/i.exec(nm0)?.[1]; return String(t.ref || t['building:ref'] || ref || t['addr:housename'] || n).slice(0, 6); };
const gebName = (t, kurz, fallback) => t.name || t['building:name'] || (t['addr:street'] ? `${t['addr:street']} ${t['addr:housenumber'] || ''}`.trim() : `${fallback} ${kurz}`);

/* ---------- Zielgelände finden ---------- */
const istGebaeude = e => { const t = e.tags || {}; return t.building && !['no', 'roof', 'ruins', 'construction', 'proposed'].includes(t.building) && (e.type === 'way' || e.type === 'relation'); };
O.zielSuchen = (data, geo, wahl, opt = {}) => {
  const e = ED(), els = data.elements || [], T = O.proj(geo);
  const flaechig = x => O.ringeLL(x).outer.length;
  const imPunkt = x => O.ringeLL(x).outer.some(r => inLL(geo, r));
  const gewaehlt = wahl?.osm && els.find(x => x.type === wahl.osm.type && x.id === wahl.osm.id && flaechig(x));
  const wahlName = wahl?.name ? String(wahl.name).split(',')[0].trim() : '';
  const res = (k, art) => { const rs = O.ringeLL(k).outer, c = llCenter(rs); return { el: k, rings: rs, name: k.tags?.name || k.tags?.operator || wahlName || O.ziel().name, lat: c[0], lon: c[1], art }; };
  if (e === 'health') {
    const kh = els.filter(x => (x.tags || {}).amenity === 'hospital' && flaechig(x));
    let k = gewaehlt && gewaehlt.tags?.amenity === 'hospital' ? gewaehlt : kh.find(imPunkt);
    if (!k) { let best = null; for (const x of kh) { const c = llCenter(O.ringeLL(x).outer); const d = Math.hypot((c[0] - geo.lat) * 110574, (c[1] - geo.lon) * 111320 * Math.cos(U.rad(geo.lat))); if (d < 400 && (!best || d < best.d)) best = { d, x }; } k = best?.x; }
    return k ? res(k, 'gelaende') : null;
  }
  if (e === 'fabrik') {
    const site = x => { const t = x.tags || {}; return !t.building && (t.man_made === 'works' || t.industrial || t.power === 'plant' || t.landuse === 'industrial') && flaechig(x); };
    const flaeche = x => U.sum(O.ringeLL(x).outer.map(r => llArea(r, geo.lat)));
    if (gewaehlt && site(gewaehlt)) return res(gewaehlt, 'gelaende');
    const cand = els.filter(x => site(x) && imPunkt(x)).map(x => ({ x, A: flaeche(x), prio: (x.tags.man_made === 'works' || x.tags.industrial || x.tags.power) ? 0 : 1 })).sort((a, b) => a.prio - b.prio || a.A - b.A);
    if (cand.length && cand[0].A < (cand[0].prio ? 250000 : 2e6)) return res(cand[0].x, 'gelaende');
    // Industriegebiet zu groß oder kein Gelände: zusammenhängende Gebäude um die Adresse
    return O.cluster(data, geo, T, cand[0]?.x);
  }
  // home: Haus an der Adresse
  const geb = els.filter(istGebaeude);
  let haus = gewaehlt && istGebaeude(gewaehlt) ? gewaehlt : null;
  if (!haus && wahl?.hausnr) haus = geb.find(x => String(x.tags['addr:housenumber'] || '').toLowerCase().replace(/\s/g, '') === String(wahl.hausnr).toLowerCase().replace(/\s/g, '') && (!wahl.strasse || !x.tags['addr:street'] || x.tags['addr:street'] === wahl.strasse) && O.ringeLL(x).outer.some(r => { const c = llCenter([r]); return Math.hypot((c[0] - geo.lat) * 110574, (c[1] - geo.lon) * 111320 * Math.cos(U.rad(geo.lat))) < 80; }));
  if (!haus) haus = geb.find(x => !KLEIN.includes(x.tags.building) && imPunkt(x)) || geb.find(imPunkt);
  if (!haus) { let best = null; for (const x of geb) { if (KLEIN.includes(x.tags.building)) continue; for (const r of O.ringeLL(x).outer) { const w = r.map(g => T(g.lat, g.lon)); const d = G.pointIn([0, 0], w) ? 0 : Math.min(...w.map((q, i) => G.dist([0, 0], G.closestOnSeg([0, 0], q, w[(i + 1) % w.length]).pt))); if (d < 35 && (!best || d < best.d)) best = { d, x }; } } haus = best?.x; }
  if (!haus) return null;
  const Z = res(haus, 'haus'); Z.name = haus.tags.name || (haus.tags['addr:street'] ? `${haus.tags['addr:street']} ${haus.tags['addr:housenumber'] || ''}`.trim() : (wahl?.strasse ? `${wahl.strasse} ${wahl.hausnr || ''}`.trim() : 'Wohnhaus'));
  Z.haus = haus; return Z;
};
// Gebäudegruppe (Abstand ≤ 14 m) um den Punkt – für Werke ohne eigenes Gelände in OSM
O.cluster = (data, geo, T, gebiet) => {
  const geb = (data.elements || []).filter(istGebaeude).map(x => { const w = O.ringeLL(x).outer.map(r => r.map(g => T(g.lat, g.lon))); return { x, w, bb: G.bbox(w.flat()) }; }).filter(g => g.w.length && g.bb.w > 0);
  const gebR = gebiet ? O.ringeLL(gebiet).outer.map(r => r.map(g => T(g.lat, g.lon))) : null;
  const dist0 = g => g.w.some(r => G.pointIn([0, 0], r)) ? 0 : Math.hypot(g.bb.cx, g.bb.cz);
  const start = geb.filter(g => dist0(g) < 150).sort((a, b) => dist0(a) - dist0(b) || (b.bb.w * b.bb.d) - (a.bb.w * a.bb.d))[0];
  if (!start) return null;
  const nah = (a, b) => !(a.bb.x1 + 14 < b.bb.x0 || b.bb.x1 + 14 < a.bb.x0 || a.bb.z1 + 14 < b.bb.z0 || b.bb.z1 + 14 < a.bb.z0);
  const set = new Set([start]), q = [start];
  while (q.length && set.size < 120) { const a = q.shift(); for (const b of geb) if (!set.has(b) && nah(a, b) && Math.hypot(b.bb.cx, b.bb.cz) < 350 && (!gebR || gebR.some(r => G.pointIn([b.bb.cx, b.bb.cz], r)))) { set.add(b); q.push(b); } }
  const pts = [...set].flatMap(g => g.w.flat()), h = buffer(hull(pts), 12);
  const name = start.x.tags.name || start.x.tags.operator || start.x.tags['addr:street'] && `Werk ${start.x.tags['addr:street']}` || 'Werk';
  // Ringe in Lat/Lon zurückrechnen (für die Grenze)
  const c = Math.cos(U.rad(geo.lat)), a = U.rad(geo.nord || 0);
  const inv = p => { const q2 = G.rot(p, a); return { lat: geo.lat - q2[1] / 110574, lon: geo.lon + q2[0] / (111320 * c) }; };
  return { el: { type: 'cluster', id: 'c' + start.x.id, tags: {} }, rings: [h.map(inv)], name, lat: geo.lat, lon: geo.lon, art: 'cluster', gebaeude: set.size };
};

/* ---------- Grundstück (Home) ---------- */
// Geschätztes Grundstück: Rechteck um das Haus, beschnitten an den Mittelsenkrechten zu Nachbarhäusern und an der Straße
O.grundstueckSchaetzen = (data, T, hausW, prj) => {
  const hc = centroid(hausW), hb = G.bbox(hausW);
  const th = hauptrichtung(hausW), c = Math.cos(th), s = Math.sin(th);
  const m = 9, ex = Math.max(hb.w, hb.d) / 2 + m;
  // Rechteck in Hausrichtung
  let poly = [[-ex, -ex], [ex, -ex], [ex, ex], [-ex, ex]].map(([u, v]) => [hc[0] + u * c - v * s, hc[1] + u * s + v * c]);
  const clipHP = (P, n, d) => { const out = []; for (let i = 0; i < P.length; i++) { const A = P[i], B = P[(i + 1) % P.length], fa = n[0] * A[0] + n[1] * A[1] - d, fb = n[0] * B[0] + n[1] * B[1] - d; if (fa <= 0) out.push(A); if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const t = fa / (fa - fb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); } } return out; };
  const nachbarn = (data.elements || []).filter(x => istGebaeude(x) && !KLEIN.includes(x.tags.building)).flatMap(x => O.ringeLL(x).outer.map(r => r.map(g => T(g.lat, g.lon)))).filter(w => { const cc = centroid(w); return G.dist(cc, hc) > 3 && G.dist(cc, hc) < 45 && !G.pointIn(cc, hausW); });
  for (const w of nachbarn) {
    // Trennlinie: Mitte zwischen den nächsten Punkten beider Häuser, senkrecht zur Verbindung
    let best = null; for (const p of w) for (let i = 0; i < hausW.length; i++) { const q = G.closestOnSeg(p, hausW[i], hausW[(i + 1) % hausW.length]).pt, d = G.dist(p, q); if (!best || d < best.d) best = { d, p, q }; }
    if (!best || best.d < 0.5) continue;
    const n = [(best.p[0] - best.q[0]) / best.d, (best.p[1] - best.q[1]) / best.d], mid = [(best.p[0] + best.q[0]) / 2, (best.p[1] + best.q[1]) / 2];
    const np = clipHP(poly, n, n[0] * mid[0] + n[1] * mid[1]); if (np.length >= 3) poly = np;
  }
  // Straßen: Grundstück endet am Straßenrand
  for (const x of data.elements || []) {
    const t = x.tags || {}; if (x.type !== 'way' || !STRASSE[t.highway] || STRASSE[t.highway][1] !== 'strasse' && t.highway !== 'service') continue;
    const pts = (x.geometry || []).map(g => T(g.lat, g.lon)); const w = STRASSE[t.highway][0] / 2 + 0.8;
    for (let i = 0; i < pts.length - 1; i++) {
      const q = G.closestOnSeg(hc, pts[i], pts[i + 1]).pt, d = G.dist(hc, q); if (d > ex + w + 5 || d < 0.5) continue;
      const n = [(q[0] - hc[0]) / d, (q[1] - hc[1]) / d], lim = n[0] * q[0] + n[1] * q[1] - w;
      if (hausW.every(p => n[0] * p[0] + n[1] * p[1] < lim)) { const np = clipHP(poly, n, lim); if (np.length >= 3) poly = np; }
    }
  }
  void prj;
  return poly.map(p => [r1(p[0]), r1(p[1])]);
};

/* ---------- Amtliche Daten: ALKIS NRW (WFS „ALKIS vereinfacht“) ---------- */
O.ALKIS = { nrw: { name: 'ALKIS NRW', url: 'https://www.wfs.nrw.de/geobasis/wfs_nw_alkis_vereinfacht', lizenz: '© GeoBasis-DE / NRW (dl-de/zero-2.0)', bbox: [50.30, 5.85, 52.54, 9.47] } };
O.alkisLand = (geo, wahl) => { const L = O.ALKIS.nrw; if (wahl?.land && !/Nordrhein/i.test(wahl.land)) return null; const [a, b, c, d] = L.bbox; return geo.lat > a && geo.lat < c && geo.lon > b && geo.lon < d ? L : null; };
O.alkisLaden = async (L, geo, radius, typ, count = 3000) => {
  const dLat = radius / 110574, dLon = radius / (111320 * Math.cos(U.rad(geo.lat)));
  const url = `${L.url}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0&TYPENAMES=ave:${typ}&COUNT=${count}&SRSNAME=urn:ogc:def:crs:EPSG::4326&BBOX=${(geo.lat - dLat).toFixed(6)},${(geo.lon - dLon).toFixed(6)},${(geo.lat + dLat).toFixed(6)},${(geo.lon + dLon).toFixed(6)},urn:ogc:def:crs:EPSG::4326`;
  const r = await fetch(url); if (!r.ok) throw new Error('ALKIS: HTTP ' + r.status);
  const doc = new DOMParser().parseFromString(await r.text(), 'application/xml');
  const ring = el => { const v = (el?.textContent || '').trim().split(/\s+/).map(Number), out = []; for (let i = 0; i + 1 < v.length; i += 2) out.push({ lat: v[i], lon: v[i + 1] }); return out; };
  const feats = [];
  for (const m of doc.getElementsByTagNameNS('*', 'member')) {
    const f = m.firstElementChild; if (!f) continue;
    const get = n => f.getElementsByTagNameNS('*', n)[0]?.textContent || '';
    const polys = [...f.getElementsByTagNameNS('*', 'Polygon')].map(p => ({ outer: ring(p.getElementsByTagNameNS('*', 'exterior')[0]?.getElementsByTagNameNS('*', 'posList')[0]), inner: [...p.getElementsByTagNameNS('*', 'interior')].map(i => ring(i.getElementsByTagNameNS('*', 'posList')[0])) })).filter(p => p.outer.length >= 4);
    feats.push({ oid: get('oid'), funktion: get('funktion'), nutzung: get('gebnutzbez'), lage: get('lagebeztxt'), flaeche: +get('flaeche') || null, kennz: get('flstkennz'), nr: get('flstnrzae'), polys });
  }
  return feats;
};
// ALKIS-Gebäude in die OSM-Daten einsetzen: Grundriss amtlich, Höhe/Dach aus dem passenden OSM-Gebäude
O.alkisEinsetzen = (data, feats, geo) => {
  const T = O.proj(geo), els = data.elements || [];
  const osmGeb = els.filter(e => istGebaeude(e)).map(e => ({ e, w: O.ringeLL(e).outer.map(r => r.map(g => T(g.lat, g.lon))) })).filter(x => x.w.length);
  const hatTeile = new Set(); for (const p of els.filter(x => (x.tags || {})['building:part'])) { const pr = O.ringeLL(p).outer[0]; if (!pr) continue; const c = centroid(pr.map(g => T(g.lat, g.lon))); for (const g of osmGeb) if (g.w.some(r => G.pointIn(c, r))) hatTeile.add(g.e); }
  let n = 0, ersetzt = 0; const raus = new Set(), neu = [];
  for (const f of feats) {
    if (/Überdachung/i.test(f.funktion) && f.polys.every(p => llArea(p.outer, geo.lat) < 30)) continue;
    for (const [pi, p] of f.polys.entries()) {
      const w = p.outer.map(g => T(g.lat, g.lon)), c = centroid(w), A = Math.abs(G.area(w)); if (A < 8) continue;
      const treffer = osmGeb.filter(g => g.w.some(r => G.pointIn(c, r)) || g.w.some(r => G.pointIn(centroid(r), w)));
      if (treffer.some(g => hatTeile.has(g.e))) continue; // OSM-Gebäudeteile sind detaillierter
      const tags = {}; for (const g of treffer) for (const k of ['building', 'building:levels', 'height', 'roof:shape', 'roof:height', 'roof:levels', 'roof:angle', 'building:levels:underground', 'name', 'ref', 'roof:colour', 'building:colour', 'min_height', 'building:min_level']) if (g.e.tags[k] !== undefined && tags[k] === undefined) tags[k] = g.e.tags[k];
      if (!tags.building || tags.building === 'yes') tags.building = (FUNKTION_ALKIS.find(([re]) => re.test(f.funktion)) || [0, tags.building || 'yes'])[1];
      if (tags.building === 'roof') continue;
      const m = /^(.*?)\s+(\d+\s*[a-z]?)\b/i.exec((f.lage || '').split(/[;,]/)[0] || ''); if (m) { tags['addr:street'] = m[1].trim(); tags['addr:housenumber'] = m[2].replace(/\s/g, ''); }
      tags['alkis:funktion'] = f.funktion; tags['alkis:oid'] = f.oid;
      for (const g of treffer) { raus.add(g.e); ersetzt++; }
      neu.push({ type: 'way', id: 'alkis_' + f.oid + (pi ? '_' + pi : ''), tags, geometry: p.outer, _inner: p.inner }); n++;
    }
  }
  data.elements = els.filter(e => !raus.has(e)).concat(neu);
  return { gebaeude: n, ersetzt };
};

/* ---------- Zielobjekt ins Projekt übernehmen ---------- */
O.zielImport = (prj, data, geo, Z, opt) => {
  const e = ED(), T = O.proj(geo), stat = { gebaeude: 0, geschosse: 0, ausgelassen: 0, heli: 0, teile: 0, rechtwinklig: 0, annahme: 0, tanks: 0, baeume: 0 };
  if (opt.ersetzen) { prj.buildings = prj.buildings.filter(b => !String(b.id).startsWith('osmk_')); prj.paths = prj.paths.filter(p => !String(p.id).startsWith('osmk_')); prj.areas = prj.areas.filter(a => !String(a.id).startsWith('osmk_')); prj.objects = prj.objects.filter(o => !String(o.id).startsWith('osmk_')); }
  let camp = Z.rings.map(r => r.map(g => T(g.lat, g.lon)));
  const els = data.elements || [];
  const own = prj.buildings.filter(b => !b.umgebung).flatMap(b => b.parts).map(pt => HSS.partFootprint(pt).outer);
  const heli = els.filter(x => (x.tags || {}).aeroway === 'helipad').map(x => x.lat !== undefined ? T(x.lat, x.lon) : (() => { const r = (x.geometry || []).map(g => T(g.lat, g.lon)); return r.length ? centroid(r) : null; })()).filter(Boolean);
  const partEls = els.filter(x => { const t = x.tags || {}; return t['building:part'] && t['building:part'] !== 'no' && (x.type === 'way' || x.type === 'relation'); });
  for (const p of partEls) p._used = false;
  let hausW = null;
  if (e === 'home' && Z.haus) {
    hausW = O.ringeLL(Z.haus).outer.map(r => r.map(g => T(g.lat, g.lon)))[0];
    if (opt.flurstueck?.length) camp = opt.flurstueck;
    else if (!Z.flurstueck) camp = [O.grundstueckSchaetzen(data, T, hausW, prj)];
  }
  const inCamp = p => camp.some(r => G.pointIn(p, r) || r.some((q, i) => G.dist(p, G.closestOnSeg(p, q, r[(i + 1) % r.length]).pt) < (e === 'home' ? 0.5 : 3)));
  const kandidaten = els.filter(istGebaeude);
  let n = 0;
  for (const el of kandidaten) {
    const t = el.tags, R0 = O.ringeLL(el).outer[0]; if (!R0) continue;
    const w0 = R0.map(g => T(g.lat, g.lon)), c0 = centroid(w0);
    const main = e === 'home' && el === Z.haus;
    if (!main && !inCamp(c0)) continue;
    if (e === 'home' && !main && !(KLEIN.includes(t.building) || Math.abs(G.area(w0)) < 60)) continue; // nur Nebengebäude auf dem Grundstück
    if (own.some(o => G.pointIn(c0, o))) { stat.ausgelassen++; continue; }
    const A0 = Math.abs(G.area(w0)), typ = e === 'home' && (!t.building || t.building === 'yes') ? (main ? 'house' : A0 < 25 ? 'shed' : 'garage') : undefined;
    const teile = O.bauteile(el, T, partEls, { halle: e === 'fabrik', minArea: e === 'home' ? 6 : 20, typ }); if (!teile.length) continue;
    n++;
    const kurz = main ? 'H' : kurzName(t, n), fallbackName = e === 'home' ? ({ garage: 'Garage', garages: 'Garagen', carport: 'Carport', shed: 'Gartenhaus' }[t.building] || 'Nebengebäude') : e === 'fabrik' ? (teile[0].h.halle && teile[0].h.floors <= 2 ? 'Halle' : 'Gebäude') : 'Gebäude';
    const name = main ? Z.name : (e === 'home' ? fallbackName : gebName(t, kurz, fallbackName));
    const hasHeli = heli.some(h => G.pointIn(h, w0));
    const b = Object.assign(HSS.defaults.building(), { id: `osmk_${el.type === 'relation' ? 'r' : ''}${el.id}`, name, kurz, color: e === 'home' ? (main ? '#144477' : '#8d6e63') : FARBEN[(n - 1) % FARBEN.length], info: '' });
    const q = []; let osmL = 0, ann = 0;
    for (const [i, x] of teile.entries()) {
      const pt = teilAnlegen(b, x, n - 1, teile.length > 1 ? `${name} · Teil ${i + 1}` : name);
      if (hasHeli && i === 0) { pt.roof.helipad = true; stat.heli++; }
      if (x.f.orth) stat.rechtwinklig++;
      if (x.h.quelle === 'osm') osmL++; else if (x.h.quelle === 'annahme') ann++;
      stat.geschosse += x.h.floors + (x.h.base ? 0 : x.h.ug);
    }
    if (teile.length > 1) stat.teile += teile.length;
    stat.annahme += ann ? 1 : 0;
    q.push(t['alkis:oid'] ? 'Grundriss ALKIS NRW (amtlich)' : `Grundriss OpenStreetMap (${el.type}/${el.id})`);
    q.push(osmL === teile.length ? 'Geschosse laut OSM' : ann ? 'Geschosse angenommen – bitte prüfen' : 'Geschosse aus der Höhe geschätzt');
    if (teile.length > 1) q.push(`${teile.length} Gebäudeteile (building:part)`);
    if (teile.some(x => x.h.roof.type !== 'flach')) q.push(`Dach: ${teile.map(x => HSS.DACHARTEN?.[x.h.roof.type]?.name || x.h.roof.type).filter((v, i, a) => a.indexOf(v) === i).join(', ')} (${teile.every(x => x.h.quelleDach === 'osm') ? 'laut OSM' : 'angenommen'})`);
    if (t['alkis:funktion']) q.push('ALKIS-Funktion: ' + t['alkis:funktion']);
    b.info = `${Z.name} · ${q.join(' · ')}`;
    if (main) b.hauptgebaeude = true;
    prj.buildings.push(b); stat.gebaeude++;
  }
  // Fabrik: Tanks, Silos, Gasometer als Rundbauten; Schornsteine, Türme, Krane als Objekte
  if (e === 'fabrik') {
    for (const el of els) {
      const t = el.tags || {}; if (!['storage_tank', 'silo', 'gasometer', 'water_tower', 'bunker_silo', 'chimney', 'tower', 'crane'].includes(t.man_made)) continue;
      const p = el.lat !== undefined ? T(el.lat, el.lon) : (() => { const r = O.ringeLL(el).outer[0]; return r ? centroid(r.map(g => T(g.lat, g.lon))) : null; })();
      if (!p || !inCamp(p)) continue;
      const H = num(t.height);
      if (['chimney', 'tower', 'crane'].includes(t.man_made)) {
        const lib = t.man_made === 'chimney' ? 'fab.schornstein' : t.man_made === 'crane' ? 'fab.portalkran.aussen' : 'fab.turm';
        if (!HSS.library.get(lib)) continue;
        const d = HSS.library.get(lib), hh = !isNaN(H) ? H : d.size.h;
        prj.objects.push({ id: 'osmk_o' + el.id, lib, x: r1(p[0]), z: r1(p[1]), rot: 0, size: { w: d.size.w * (t.man_made === 'chimney' ? Math.max(1, hh / d.size.h * 0.6) : 1), d: d.size.d * (t.man_made === 'chimney' ? Math.max(1, hh / d.size.h * 0.6) : 1), h: hh }, name: t.name || d.name });
        stat.tanks++; continue;
      }
      const r = O.ringeLL(el).outer[0]; if (!r) continue;
      const w = r.map(g => T(g.lat, g.lon)), bb = G.bbox(w), dia = r1((bb.w + bb.d) / 2); if (dia < 2) continue;
      const rund = Math.abs(G.area(w)) > 0.7 * Math.PI * dia * dia / 4;
      const hh = !isNaN(H) ? H : t.man_made === 'silo' ? Math.max(12, dia * 1.6) : Math.max(6, dia * 0.8);
      const b = Object.assign(HSS.defaults.building(), { id: 'osmk_t' + el.id, name: t.name || { storage_tank: 'Tank', silo: 'Silo', gasometer: 'Gasbehälter', water_tower: 'Wasserturm', bunker_silo: 'Fahrsilo' }[t.man_made], kurz: 'T', color: '#5a6573', info: `Aus OpenStreetMap (man_made=${t.man_made})${isNaN(H) ? ' · Höhe angenommen' : ''}` });
      const f = rund ? { shape: 'rund', x: r1(bb.cx), z: r1(bb.cz), w: dia, d: dia, rot: 0 } : O.form(w, []);
      if (!f) continue;
      b.parts.push(Object.assign(HSS.defaults.part(), f, { id: 'osmk_tp' + el.id, name: b.name, floors: 1, floorHeight: r1(t.man_made === 'bunker_silo' ? 3 : hh), basements: 0, facade: { type: 'paneel', color: t.man_made === 'silo' ? '#dfe3e6' : '#c9ced4', accent: '#a7b0ba', glass: '#a7b0ba', axis: 3, windowRatio: 0.1 }, roof: { type: 'flach', parapet: 0.3, plant: false, color: '#b9c0c7' }, use: 'tank' }));
      prj.buildings.push(b); stat.tanks++;
    }
  }
  // Grenze des Geländes / Grundstücks
  if (opt.grenze) for (const [i, r] of camp.entries()) if (r.length >= 3) prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: `osmk_g${Z.el.id}_${i}`, name: (e === 'home' ? (opt.flurstueck?.length ? 'Flurstücksgrenze ' : 'Grundstück (geschätzt) ') : O.ziel().gelaende + ' ') + Z.name, points: r.concat([r[0]]), width: 0.35, smooth: false, noNet: true }));
  // Home: Garten, Zäune und Hecken auf dem Grundstück, Bäume
  if (e === 'home') {
    for (const [i, r] of camp.entries()) {
      const bb = G.bbox(r); prj.areas.push({ id: 'osmk_garten' + i, kind: 'gruen', name: 'Garten', poly: G.ccw(r), x: r1(bb.cx), z: r1(bb.cz), w: r1(bb.w), d: r1(bb.d), rot: 0, lage: 2, density: 0 });
    }
    for (const el of els) {
      const t = el.tags || {}; if (el.type !== 'way' || !['fence', 'hedge', 'wall'].includes(t.barrier)) continue;
      const pts = (el.geometry || []).map(g => T(g.lat, g.lon)); if (pts.length < 2 || !pts.some(p => inCamp(p))) continue;
      prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: 'osmk_z' + el.id, name: { fence: 'Zaun', hedge: 'Hecke', wall: 'Mauer' }[t.barrier], points: pts, width: t.barrier === 'hedge' ? 0.8 : 0.25, smooth: false, noNet: true, osm: 'way/' + el.id }));
    }
  }
  if (!prj.buildings.some(b => !b.umgebung && !String(b.id).startsWith('osmk_')) && (/^(Neues|Unbenannt)/i.test(prj.meta.name || '') || !prj.meta.name)) prj.meta.name = Z.name;
  prj.meta.notes = (prj.meta.notes || '') + `\n${O.ziel().name} „${Z.name}“ aus ${opt.alkis ? 'ALKIS NRW und ' : ''}OpenStreetMap übernommen: ${stat.gebaeude} Gebäude${stat.teile ? ` (${stat.teile} Gebäudeteile)` : ''}, ${stat.rechtwinklig} Umrisse rechtwinklig gestellt. Geschosse aus building:levels bzw. Höhe, sonst angenommen.`;
  stat.camp = camp; stat.hausW = hausW;
  return stat;
};

/* OSM-Antwort ins Projekt übernehmen (Umgebung) */
O.apply = (prj, data, geo, opt) => {
  const e = ED(), T = O.proj(geo), stat = { strassen: 0, wege: 0, flaechen: 0, gebaeude: 0, grenze: 0, baeume: 0 };
  if (opt.ersetzen) { prj.paths = prj.paths.filter(p => !p.umgebung); prj.areas = prj.areas.filter(a => !a.umgebung); prj.buildings = prj.buildings.filter(b => !b.umgebung); prj.objects = prj.objects.filter(o => !o.umgebung); }
  // vorhandene Gebäude des Projekts (Modellgebäude nicht doppelt übernehmen)
  const ownParts = prj.buildings.filter(b => !b.umgebung).flatMap(b => b.parts);
  const own = ownParts.map(pt => { const o = HSS.partFootprint(pt).outer; return { o, bb: G.bbox(o) }; });
  const near = (p, buf) => own.some(({ o, bb }) => p[0] > bb.x0 - buf && p[0] < bb.x1 + buf && p[1] > bb.z0 - buf && p[1] < bb.z1 + buf && (G.pointIn(p, o) || (buf > 0 && o.some((q, i) => G.dist(p, G.closestOnSeg(p, q, o[(i + 1) % o.length]).pt) < buf))));
  const inOwn = p => near(p, 0);
  // Gelände des Ziels: dort gilt das Modell, nicht OSM
  const campus = [];
  if (opt.campus !== false) {
    if (opt.zielRinge) campus.push(...opt.zielRinge);
    if (e === 'health') for (const el of data.elements || []) { const t = el.tags || {}; if (t.amenity === 'hospital' && !t.building) for (const r of O.ringeLL(el).outer) if (r.length >= 4) campus.push(r.map(g => T(g.lat, g.lon))); }
    const pts = own.flatMap(x => x.o); if (pts.length >= 3 && e !== 'home') campus.push(buffer(hull(pts), 12));
  }
  const inCampus = p => campus.some(r => G.pointIn(p, r));
  const polyHitsOwn = r => r.some(p => inOwn(p)) || own.some(({ o }) => o.some(q => G.pointIn(q, r)));
  // Linien auftrennen: Stücke im Zielgelände bzw. über Modellgebäuden entfallen
  const splitLine = (pts, drop) => {
    const out = []; let cur = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = G.dist(a, b), n = Math.max(1, Math.ceil(L / 2));
      for (let j = 0; j < n; j++) { const p = [r1(a[0] + (b[0] - a[0]) * j / n), r1(a[1] + (b[1] - a[1]) * j / n)]; if (drop(p)) { if (cur.length >= 2) out.push(cur); cur = []; } else if (j === 0 || !cur.length || drop([a[0] + (b[0] - a[0]) * (j + 1) / n, a[1] + (b[1] - a[1]) * (j + 1) / n])) cur.push(p); }
    }
    const last = pts[pts.length - 1]; if (!drop(last)) cur.push(last); if (cur.length >= 2) out.push(cur);
    return out.filter(q => G.polylineLength(q) >= 3);
  };
  stat.ausgelassen = 0;
  let maxR = 0, nB = 0;
  for (const el of data.elements || []) {
    const t = el.tags || {};
    // Straßen und Wege
    if (opt.wege && el.type === 'way' && t.highway && STRASSE[t.highway] && el.geometry?.length >= 2 && t.area !== 'yes') {
      const [w, kind, traffic, kmh] = STRASSE[t.highway];
      const pts = el.geometry.map(g => T(g.lat, g.lon)); if (G.polylineLength(pts) < 3) continue;
      const lanes = +t.lanes || 0, width = t.width ? num(t.width) || w : lanes ? Math.max(w, lanes * 3.2) : w;
      const wid = U.clamp(width, 1.2, 30);
      // im Zielgelände nur öffentliche Straßen übernehmen; nie über Modellgebäude
      const drop = p => (kind !== 'strasse' && inCampus(p)) || near(p, wid / 2 + 1);
      const pieces = campus.length || own.length ? splitLine(pts, drop) : [pts];
      if (!pieces.length) { stat.ausgelassen++; continue; }
      pieces.forEach((pc, k) => {
        const p = Object.assign(HSS.defaults.path(kind), { id: 'osm_w' + el.id + (k ? '_' + k : ''), name: t.name || HSS.WEGARTEN[kind].name, points: pc, width: wid, smooth: false, umgebung: true, osm: 'way/' + el.id, traffic: opt.verkehr ? traffic : 0, speedKmh: kmh || null, noNet: !['strasse', 'zufahrt'].includes(kind) });
        if (t.bridge === 'yes' || t.tunnel === 'yes') p.noNet = true;
        prj.paths.push(p);
        for (const q of pc) maxR = Math.max(maxR, Math.hypot(q[0], q[1]));
      });
      stat[kind === 'strasse' || kind === 'zufahrt' ? 'strassen' : 'wege']++;
      continue;
    }
    if (opt.wege && el.type === 'way' && (t.waterway || t.railway) && el.geometry?.length >= 2) {
      const kind = t.waterway ? 'bach' : 'bahn';
      prj.paths.push(Object.assign(HSS.defaults.path(kind), { id: 'osm_w' + el.id, name: t.name || HSS.WEGARTEN[kind].name, points: el.geometry.map(g => T(g.lat, g.lon)), width: kind === 'bach' ? (t.waterway === 'river' ? 14 : t.waterway === 'canal' ? 10 : 3) : 3.2, smooth: false, umgebung: true, noNet: true, osm: 'way/' + el.id }));
      continue;
    }
    // Klinikgelände als Zaun / Grundstücksgrenze (Healthcare, nur Umgebung)
    if (opt.grenze && e === 'health' && t.amenity === 'hospital' && !t.building) {
      for (const r0 of O.ringeLL(el).outer) { const r = r0.map(g => T(g.lat, g.lon)); if (r.length < 4) continue; prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: 'osm_g' + el.id + '_' + stat.grenze, name: t.name ? 'Grenze ' + t.name : 'Grundstücksgrenze Klinikum', points: r, width: 0.35, smooth: false, umgebung: true, noNet: true, osm: el.type + '/' + el.id })); stat.grenze++; }
      continue;
    }
    // Einzelbäume
    if (opt.baeume !== false && el.type === 'node' && t.natural === 'tree') {
      const p = T(el.lat, el.lon); if (inOwn(p) || nB > (e === 'home' ? 400 : 700)) continue;
      const lib = t.leaf_type === 'needleleaved' ? 'gruen.baum.nadel' : (num(t.height) < 6 ? 'gruen.baum.klein' : 'gruen.baum.laub');
      const d = HSS.library.get(lib); if (!d) continue;
      const H = num(t.height), k = !isNaN(H) && d.size.h ? U.clamp(H / d.size.h, 0.4, 2.5) : 0.85 + ((el.id % 7) / 20);
      prj.objects.push({ id: 'osm_t' + el.id, lib, x: r1(p[0]), z: r1(p[1]), rot: (el.id * 37) % 360, size: { w: r1(d.size.w * k), d: r1(d.size.d * k), h: r1(d.size.h * k) }, umgebung: true });
      nB++; stat.baeume++; continue;
    }
    // Flächen
    const kind = FLAECHE(t);
    if (opt.flaechen && kind && !t.building) {
      for (const r0 of O.ringeLL(el).outer) {
        let r = r0.map(g => T(g.lat, g.lon)); if (r.length > 3 && G.dist(r[0], r[r.length - 1]) < 0.2) r.pop(); if (r.length < 3) continue;
        const area = Math.abs(G.area(r)); if (area < 30) continue;
        r = G.ccw(r); const bb = G.bbox(r);
        // Flächen im Zielgelände (Parkplätze, Rasen …) gibt das Modell vor
        if (campus.length && (inCampus([bb.cx, bb.cz]) || (area < 20000 && polyHitsOwn(r)))) { stat.ausgelassen++; continue; }
        prj.areas.push({ id: 'osm_a' + el.id + '_' + stat.flaechen, kind, name: t.name || HSS.FLAECHEN[kind], poly: r, x: r1(bb.cx), z: r1(bb.cz), w: r1(bb.w), d: r1(bb.d), rot: 0, lage: LAGE[kind] || 0, umgebung: true, osm: el.type + '/' + el.id });
        stat.flaechen++;
      }
      continue;
    }
    // Gebäude der Umgebung (jetzt mit Multipolygonen, Innenhöfen, Gebäudeteilen und Dachformen)
    if (opt.gebaeude && istGebaeude(el)) {
      const R0 = O.ringeLL(el).outer[0]; if (!R0) continue;
      const w0 = R0.map(g => T(g.lat, g.lon)), c0 = centroid(w0);
      if (inOwn(c0) || inCampus(c0) || polyHitsOwn(w0)) { stat.ausgelassen++; continue; }
      const A0 = Math.abs(G.area(w0)), typ = e === 'home' && (!t.building || t.building === 'yes') && A0 > 45 && A0 < 300 ? 'house' : e === 'home' && (!t.building || t.building === 'yes') && A0 <= 45 ? 'garage' : undefined;
      const teile = O.bauteile(el, T, opt._parts, { minArea: 12, tol: 0.3, typ }); if (!teile.length) continue;
      const b = Object.assign(HSS.defaults.building(), { id: 'osm_b' + (el.type === 'relation' ? 'r' : '') + el.id, name: gebName(t, '', 'Gebäude (Umgebung)').trim(), kurz: '', color: '#8d969f', noLabel: true, umgebung: true });
      for (const x of teile) {
        const pt = teilAnlegen(b, x, 0, b.name, { prefix: 'osm_p' });
        pt.facade = x.h.haus || x.h.klein ? { type: 'loch', color: x.h.farbe || '#e6e2dc', accent: '#9aa1aa', glass: '#8aa0b2', axis: 1.6, windowRatio: 0.35 } : x.h.halle ? { type: 'paneel', color: x.h.farbe || '#d3d7db', accent: '#a7aeb6', glass: '#8aa0b2', axis: 5, windowRatio: 0.25 } : { type: 'loch', color: x.h.farbe || '#e6e2dc', accent: '#9aa1aa', glass: '#8aa0b2', axis: 1.6, windowRatio: 0.35 };
        pt.roof = Object.assign(x.h.roof, { plant: false, parapet: x.h.roof.type === 'flach' ? 0.3 : 0, color: x.h.roof.color !== '#9aa3ad' ? x.h.roof.color : x.h.roof.type === 'flach' ? '#a8a39b' : '#9aa3ad' });
        pt.basements = 0;
      }
      prj.buildings.push(b); stat.gebaeude++;
    }
  }
  // Gelände so groß, dass die Umgebung darauf liegt
  prj.terrain.size = Math.max(prj.terrain.size || 500, Math.ceil((Math.max(maxR, opt.radius) * 2 + 120) / 50) * 50);
  prj.meta.notes = (prj.meta.notes || '') + `\nUmgebung aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0)${data.quelle === 'osm-api' ? ' über die OSM-API' : ''}, Radius ${opt.radius} m, abgerufen ${new Date().toLocaleDateString('de-DE')}.`;
  return stat;
};

/* ---------- Ablauf: laden und übernehmen (auch ohne Dialog nutzbar, z. B. für Tests) ---------- */
O.laden = async (geo, opt, info = () => {}) => {
  let data;
  try { data = await O.fetch(O.query(geo, opt.radius, opt.mitZiel), url => info('Lade Daten von ' + new URL(url).host + ' …')); }
  catch (err) { info('Overpass nicht erreichbar – lade über die OSM-API …'); data = await O.fetchApi(geo, opt.radius, info); data.hinweis = 'Overpass war nicht erreichbar; Daten kachelweise über die OSM-API geladen' + (data.radius < opt.radius ? ` (Radius auf ${data.radius} m begrenzt)` : '') + '.'; }
  return data;
};
O.uebernehmen = async (data, geo, opt, wahl, info = () => {}) => {
  let Z = null, alkis = null, flur = null;
  const L = opt.alkis ? O.alkisLand(geo, wahl) : null;
  if (L) {
    try {
      info('Lade amtliche Gebäudegrundrisse (ALKIS NRW) …');
      const feats = await O.alkisLaden(L, geo, Math.min(opt.radius, ED() === 'home' ? 160 : 450), 'GebaeudeBauwerk');
      alkis = O.alkisEinsetzen(data, feats, geo);
    } catch (err) { console.warn(err); alkis = { fehler: err.message }; }
  }
  if (opt.mitZiel) {
    Z = O.zielSuchen(data, geo, wahl);
    if (!Z) throw new Error(ED() === 'home' ? 'An dieser Adresse wurde kein Gebäude gefunden. Bitte die genaue Adresse mit Hausnummer wählen oder „Nur Umgebung“ laden.' : ED() === 'fabrik' ? 'An dieser Stelle wurde kein Werk und keine Halle gefunden. Bitte das Werk in der Suche auswählen oder „Nur Umgebung“ laden.' : 'An dieser Stelle wurde kein Klinikgelände (amenity=hospital) gefunden. Bitte das Krankenhaus in der Suche auswählen oder „Nur Umgebung“ laden.');
    // Modellursprung in die Mitte des Ziels, sofern das Projekt noch keine eigenen Gebäude hat
    if (!HSS.project().buildings.some(b => !b.umgebung && !String(b.id).startsWith('osmk_')) && Z.art !== 'cluster') {
      const ng = { lat: +Z.lat.toFixed(6), lon: +Z.lon.toFixed(6), nord: geo.nord };
      // Home: Modellraster nach der Hausachse ausrichten (Wände parallel zum Raster)
      if (ED() === 'home' && Z.haus && opt.ausrichten !== false) { const T0 = O.proj(Object.assign({}, ng, { nord: 0 })), w = O.ringeLL(Z.haus).outer[0].map(g => T0(g.lat, g.lon)); let th = U.deg(hauptrichtung(bereinigen(w))); th = ((th % 90) + 90) % 90; if (th > 45) th -= 90; ng.nord = Math.round(th * 10) / 10; }
      geo = ng;
    }
    if (L && ED() === 'home' && Z.haus) {
      try {
        info('Lade Flurstück (ALKIS NRW) …');
        const fs = await O.alkisLaden(L, { lat: Z.lat, lon: Z.lon }, 25, 'Flurstueck', 40);
        const T = O.proj(geo), hw = O.ringeLL(Z.haus).outer[0].map(g => T(g.lat, g.lon)), hc = centroid(hw);
        const f = fs.find(x => x.polys.some(p => G.pointIn(hc, p.outer.map(g => T(g.lat, g.lon)))));
        if (f) { flur = f.polys.map(p => G.ccw(bereinigen(p.outer.map(g => T(g.lat, g.lon)), 0.05))); Z.flurstueck = f; }
      } catch (err) { console.warn(err); }
    }
  }
  return { Z, geo, alkis, flur, L };
};
O.ausfuehren = (data, prep, opt) => {
  const { Z, geo } = prep; let stat, ks = null;
  HSS.manip?.mark();
  const parts = (data.elements || []).filter(x => { const t = x.tags || {}; return t['building:part'] && t['building:part'] !== 'no' && (x.type === 'way' || x.type === 'relation'); });
  HSS.change(Z ? `${O.ziel().name} und Umgebung aus OpenStreetMap` : 'Umgebung aus OpenStreetMap', p => {
    p.meta.geo = Object.assign(p.meta.geo || {}, geo, { adresse: opt.adresse || p.meta.geo?.adresse });
    if (Z) ks = O.zielImport(p, data, geo, Z, Object.assign({}, opt, { flurstueck: prep.flur, alkis: !!prep.alkis?.gebaeude }));
    stat = O.apply(p, data, geo, Object.assign({}, opt, { zielRinge: ks?.camp, _parts: parts }));
    if (ks && ED() === 'home' && opt.einrichten && HSS.homeLayout) { const b = p.buildings.find(x => x.hauptgebaeude && String(x.id).startsWith('osmk_')); if (b) ks.raeume = HSS.homeLayout(p, b); }
    if (ks && ED() === 'fabrik' && opt.einrichten && HSS.werkLayout) ks.zonen = HSS.werkLayout(p);
  });
  return { stat, ks };
};

/* Dialog */
O.dialog = (vorgabe = {}) => {
  const prj = HSS.project(), std = (HSS.STANDORTE || []).find(x => x.id === prj.meta.standort?.id)?.geo, Z0 = O.ziel(), e = ED();
  const g = prj.meta.geo?.lat ? prj.meta.geo : (std || prj.meta.geo || {});
  let wahl = null;
  const umgText = { health: 'Straßen, Wege, Felder, Wiesen, Wälder, Gewässer, Bäume und Gebäude der Nachbarschaft rund um den Standort – auf Wunsch auch das <b>Krankenhaus selbst</b> als bearbeitbare Modellgebäude.', fabrik: 'Straßen, Gleise, Flächen, Bäume und Gebäude rund um den Standort – auf Wunsch auch das <b>Werk selbst</b> mit Hallen, Tanks, Silos und Werkszaun als bearbeitbare Modellgebäude.', home: 'Straßen, Gehwege, Nachbarhäuser, Gärten und Bäume rund um die Adresse – auf Wunsch auch das <b>Haus selbst</b> mit Dachform, Garage und Grundstück als bearbeitbares Modell.' }[e];
  UI.dialog(`<div class="dh"><h2>Umgebung aus OpenStreetMap laden</h2><button class="x" data-close>×</button></div>
    <p class="note">${umgText} Deutschland, Österreich und Schweiz. Benötigt eine Internetverbindung.</p>
    <div class="fg"><label class="f full osmac-w"><span>${Z0.suche}</span><input type="text" id="oQ" autocomplete="off" placeholder="${Z0.bsp}" value="${U.esc(vorgabe.q || (g.adresse && !/^[a-z]+$/.test(g.adresse) ? g.adresse : ''))}"><div class="osmac" id="oAc" hidden></div></label></div>
    <div class="note" id="oRes"></div>
    <div class="fg"><label class="f"><span>Breite (lat) des Modellursprungs</span><input type="number" id="oLat" step="0.00001" value="${g.lat ?? ''}"></label><label class="f"><span>Länge (lon)</span><input type="number" id="oLon" step="0.00001" value="${g.lon ?? ''}"></label>
    <label class="f"><span>Nordwinkel des Modells [°]</span><input type="number" id="oN" step="0.1" value="${g.nord ?? 0}"></label><label class="f"><span>Radius [m]</span><input type="number" id="oR" step="50" min="100" max="2000" value="${Z0.radius}"></label></div>
    <div class="row" style="flex-wrap:wrap;gap:10px"><label class="chk"><input type="checkbox" id="oW" checked> Straßen, Wege, Bahn, Bäche</label><label class="chk"><input type="checkbox" id="oF" checked> Flächen (Acker, Wiese, Wald, Wasser …)</label><label class="chk"><input type="checkbox" id="oB" checked> Gebäude der Umgebung</label><label class="chk"><input type="checkbox" id="oT" checked> Einzelbäume</label><label class="chk"><input type="checkbox" id="oG" checked> Grenze des ${Z0.gelaende}s</label><label class="chk"><input type="checkbox" id="oV" ${e === 'home' ? '' : 'checked'}> Verkehr animieren</label><label class="chk"><input type="checkbox" id="oE" checked> frühere OSM-Daten ersetzen</label><label class="chk" title="Auf dem ${Z0.gelaende} und über den Gebäuden des Modells werden keine OSM-Gebäude, -Flächen und -Wege übernommen – dort gilt das Modell"><input type="checkbox" id="oC" checked> ${Z0.gelaende} wie im Modell (OSM nur außen herum)</label></div>
    <details class="osmmehr" open><summary><b>Genauigkeit</b> – amtliche Daten, Luftbild, Einrichtung</summary>
      <div class="row" style="flex-wrap:wrap;gap:10px;margin-top:6px"><label class="chk" title="Amtliche Gebäudegrundrisse (ALKIS) statt OSM-Umrissen; Geschosse und Dachform kommen weiter aus OSM. ${e === 'home' ? 'Dazu das echte Flurstück als Grundstück.' : ''} Derzeit für Nordrhein-Westfalen (offener WFS, dl-de/zero-2.0)."><input type="checkbox" id="oA" checked> Amtliche Grundrisse${e === 'home' ? ' und Flurstück' : ''} (ALKIS NRW, wenn verfügbar)</label>
      <label class="chk" title="Luftbild als Unterlage auf das Gelände legen – zum Prüfen und Nachzeichnen der Gebäude"><input type="checkbox" id="oL" checked> Luftbild als Unterlage</label>
      ${e === 'home' ? '<label class="chk"><input type="checkbox" id="oI" checked> Räume vorschlagen und möblieren (Grundriss-Vorschlag)</label>' : e === 'fabrik' ? '<label class="chk"><input type="checkbox" id="oI"> Größte Halle in Zonen gliedern und ausstatten (Vorschlag)</label>' : ''}
      ${e === 'home' ? '<label class="chk" title="Dreht das Modellraster so, dass die Hauswände parallel zum Raster liegen – Räume und Möbel lassen sich dann rechtwinklig planen"><input type="checkbox" id="oX" checked> Raster am Haus ausrichten</label>' : ''}</div>
    </details>
    <div id="oWahl" class="osmwahl" hidden></div>
    <div class="note" id="oSt"></div>
    <div class="actions"><button data-close>Abbrechen</button><button class="primary" id="oGo">Umgebung laden …</button></div>
    <p class="note">Daten © OpenStreetMap-Mitwirkende (ODbL 1.0) · ALKIS © GeoBasis-DE / NRW (dl-de/zero-2.0) · Suche: Photon (komoot) / Nominatim. Der Modellursprung (0/0) liegt an der angegebenen Koordinate – mit Zielobjekt in dessen Mitte.</p>`, d => {
    const q = $('#oQ', d), ac = $('#oAc', d), res = $('#oRes', d);
    let ctl = null, liste = [], aktiv = -1;
    const icon = x => x.hospital ? '🏥' : x.werk ? '🏭' : x.haus ? '🏠' : '📍';
    const waehlen = x => {
      wahl = x; ac.hidden = true; q.value = x.name + (x.sub ? ', ' + x.sub.split(' · ')[0] : '');
      $('#oLat', d).value = x.lat.toFixed(6); $('#oLon', d).value = x.lon.toFixed(6);
      if (x.extent) { const [w, n, ee, s2] = x.extent, dia = Math.hypot((n - s2) * 110574, (ee - w) * 111320 * Math.cos(U.rad(x.lat))); $('#oR', d).value = U.clamp(Math.round((dia / 2 + (e === 'home' ? 150 : 350)) / 50) * 50, e === 'home' ? 150 : 300, 1500); }
      res.innerHTML = `${icon(x)} ${x.hospital ? '<b>Krankenhaus</b> gewählt: ' : x.werk ? '<b>Werk</b> gewählt: ' : 'Gewählt: '}${U.esc(x.name)}${x.sub ? ' · ' + U.esc(x.sub) : ''}${e === 'home' && !x.haus ? ' <span class="warn">– ohne Hausnummer: bitte genaue Adresse wählen</span>' : ''}`;
    };
    const zeigen = () => {
      ac.hidden = !liste.length;
      ac.innerHTML = liste.map((x, i) => `<div class="oi ${i === aktiv ? 'on' : ''}" data-i="${i}"><span class="ic">${icon(x)}</span><div><b>${U.esc(x.name)}</b><small>${U.esc(x.sub)}</small></div></div>`).join('');
      ac.querySelectorAll('[data-i]').forEach(el => el.onmousedown = ev => { ev.preventDefault(); waehlen(liste[+el.dataset.i]); });
    };
    const suchen = U.debounce(async () => {
      const t = q.value.trim(); if (t.length < 3) { liste = []; zeigen(); return; }
      ctl?.abort(); ctl = new AbortController();
      try { liste = await O.suche(t, ctl.signal); aktiv = -1; zeigen(); if (!liste.length) res.textContent = 'keine Treffer in Deutschland, Österreich oder der Schweiz'; else res.textContent = ''; }
      catch (err) { if (err.name !== 'AbortError') { try { liste = await O.geocode(t); aktiv = -1; zeigen(); } catch (e2) { res.textContent = e2.message; } } }
    }, 300);
    q.oninput = () => { wahl = null; suchen(); };
    q.onkeydown = ev => {
      if (ev.key === 'ArrowDown' && liste.length) { ev.preventDefault(); aktiv = (aktiv + 1) % liste.length; zeigen(); }
      else if (ev.key === 'ArrowUp' && liste.length) { ev.preventDefault(); aktiv = (aktiv - 1 + liste.length) % liste.length; zeigen(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); if (liste[aktiv >= 0 ? aktiv : 0]) waehlen(liste[aktiv >= 0 ? aktiv : 0]); }
      else if (ev.key === 'Escape' && !ac.hidden) { ev.preventDefault(); ev.stopPropagation(); ac.hidden = true; }
    };
    q.onblur = () => setTimeout(() => (ac.hidden = true), 150);
    q.onfocus = () => { if (liste.length) ac.hidden = false; };
    // Schritt 2: nur Umgebung oder Umgebung mit Zielobjekt
    $('#oGo', d).onclick = () => {
      const lat = +$('#oLat', d).value, lon = +$('#oLon', d).value;
      if (!lat || !lon) return UI.toast('Bitte Adresse suchen oder Koordinaten angeben');
      const eigene = HSS.project().buildings.filter(b => !b.umgebung && !String(b.id).startsWith('osmk_')).length;
      const w = $('#oWahl', d); w.hidden = false;
      w.innerHTML = `<b>Was soll geladen werden?</b><div class="osmtiles">
        <button class="tile big" data-m="u"><span class="ic">🗺</span><b>Nur Umgebung</b><small>Straßen, Flächen und Nachbargebäude rund um ${eigene ? 'die vorhandenen Modellgebäude' : 'den Standort'}</small></button>
        <button class="tile big ${!eigene ? 'empf' : ''}" data-m="k"><span class="ic">${Z0.icon}</span><b>${Z0.mit}</b><small>${Z0.text}${wahl && (wahl.hospital || wahl.werk || wahl.haus) ? ` („${U.esc(wahl.name)}“)` : ''}${eigene ? ` · ${eigene} vorhandene Gebäude bleiben, Überschneidungen werden übersprungen` : ''}</small></button></div>`;
      w.querySelectorAll('[data-m]').forEach(b => b.onclick = () => laden(b.dataset.m === 'k'));
      w.scrollIntoView({ block: 'nearest' });
    };
    const laden = async (mitZiel) => {
      const geo = { lat: +$('#oLat', d).value, lon: +$('#oLon', d).value, nord: +$('#oN', d).value || 0 };
      const radius = U.clamp(+$('#oR', d).value || Z0.radius, 100, 2000);
      const chk = id => !!$(id, d)?.checked;
      const opt = { radius, mitZiel, wege: chk('#oW'), flaechen: chk('#oF'), gebaeude: chk('#oB'), baeume: chk('#oT'), grenze: chk('#oG'), verkehr: chk('#oV'), ersetzen: chk('#oE'), campus: chk('#oC'), alkis: chk('#oA'), luftbild: chk('#oL'), einrichten: chk('#oI'), ausrichten: $('#oX', d) ? chk('#oX') : false, adresse: wahl ? wahl.name : undefined };
      const st = $('#oSt', d); d.querySelectorAll('#oWahl button, #oGo').forEach(b => (b.disabled = true));
      const info = t => (st.textContent = t); info('Lade Daten aus OpenStreetMap …');
      try {
        const data = await O.laden(geo, opt, info);
        info(`${(data.elements || []).length} Elemente empfangen – werden übernommen …`);
        const prep = await O.uebernehmen(data, geo, opt, wahl, info);
        const { stat, ks } = O.ausfuehren(data, prep, opt);
        d.close();
        if (opt.luftbild && HSS.unterlage) HSS.unterlage.setzen({ quelle: prep.L ? 'nrw' : 'esri', radius: Math.min(radius, e === 'home' ? 200 : 700), aktiv: true }, true);
        if (ks?.gebaeude) { const T3 = window.THREEX.THREE, box = new T3.Box3(); for (const b of HSS.project().buildings) if (String(b.id).startsWith('osmk_')) for (const pt of b.parts) for (const q2 of HSS.partFootprint(pt).outer) { box.expandByPoint(new T3.Vector3(q2[0], 0, q2[1])); box.expandByPoint(new T3.Vector3(q2[0], HSS.partTopY(pt), q2[1])); } setTimeout(() => HSS.s3.focusBox(box, { k: e === 'home' ? 1.6 : 1.0 }), 300); }
        else HSS.s3.home();
        const Zn = prep.Z?.name;
        UI.toast(`${ks ? `${Z0.icon} ${Zn}: ${ks.gebaeude} Gebäude${ks.teile ? ` (${ks.teile} Gebäudeteile)` : ''}${ks.tanks ? `, ${ks.tanks} Tanks/Silos/Schornsteine` : ''}${ks.heli ? ', Hubschrauberlandeplatz' : ''}${ks.raeume ? `, ${ks.raeume} Räume eingerichtet` : ''}${ks.zonen ? `, ${ks.zonen} Zonen` : ''}${ks.ausgelassen ? `, ${ks.ausgelassen} überschneiden vorhandene Gebäude (übersprungen)` : ''} · ` : ''}Umgebung: ${stat.strassen} Straßen, ${stat.wege} Wege, ${stat.flaechen} Flächen, ${stat.gebaeude} Gebäude${stat.baeume ? `, ${stat.baeume} Bäume` : ''}${stat.ausgelassen ? ` · ${stat.ausgelassen} Objekte auf dem ${Z0.gelaende} ausgelassen` : ''}`, 8000);
        const hinweise = [data.hinweis, prep.alkis?.gebaeude ? `ALKIS NRW: ${prep.alkis.gebaeude} amtliche Grundrisse übernommen` : prep.alkis?.fehler ? 'ALKIS nicht erreichbar – OSM-Umrisse verwendet' : '', prep.flur ? `Flurstück ${prep.Z?.flurstueck?.nr || ''} (${U.fmt(prep.Z?.flurstueck?.flaeche || 0)} m²) als Grundstück` : e === 'home' && ks ? 'Grundstück geschätzt (kein Flurstück verfügbar) – Grenze bitte prüfen' : '', ks?.annahme ? `${ks.annahme} Gebäude ohne Geschossangabe in OSM – Geschosse angenommen` : ''].filter(Boolean);
        if (hinweise.length) setTimeout(() => UI.toast(hinweise.join(' · '), 7000), 8200);
        if (ks) setTimeout(() => UI.toast('Tipp: Gebäude anklicken, um Name, Geschosse und Dachform zu prüfen. Im Inspektor steht, was aus OSM stammt und was angenommen ist.', 6000), hinweise.length ? 15400 : 8200);
      } catch (err) { console.error(err); st.innerHTML = `<span class="warnbox" style="display:block">${U.esc(err.message)}</span>`; d.querySelectorAll('#oWahl button, #oGo').forEach(b => (b.disabled = false)); }
    };
    if (vorgabe.q) suchen();
  });
};
// Rückwärtskompatibel (frühere Aufrufe)
O.klinik = (data, geo, wahl) => O.zielSuchen(data, geo, wahl);
O.krankenhaus = (prj, data, geo, K, opt) => O.zielImport(prj, data, geo, K, opt);
O._test = { bereinigen, rechtwinklig, hauptrichtung, zusammensetzen, centroid };
})();
