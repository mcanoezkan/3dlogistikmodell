/* =====================================================================
   HSS · osm.js – Umgebung aus OpenStreetMap laden
   Lädt rund um den verorteten Standort (Projekt → Standort: lat/lon, Nordwinkel)
   über die Overpass-API: Straßen und Wege mit Namen und Breiten nach Straßenklasse,
   Feldwege, Bahngleise, Bäche, Flächennutzung (Acker, Wiese, Wald, Wohn- und
   Gewerbegebiete, Parks, Friedhöfe, Sportplätze, Wasser, Parkplätze), Gebäude der
   Umgebung als schlichte graue Baukörper und die Grenze des Klinikgeländes (Zaun).
   Die Abfrage läuft direkt aus dem Browser (Internetverbindung nötig).
   Adresssuche über Photon (Vorschläge beim Tippen, Deutschland/Österreich/Schweiz),
   ersatzweise Nominatim. Wahlweise wird das Krankenhaus selbst mit übernommen:
   alle Gebäude des Klinikgeländes als bearbeitbare Modellgebäude (Geschosse aus
   building:levels bzw. Höhe), Klinikgelände als Grenze, Hubschrauberlandeplatz.
   Daten: © OpenStreetMap-Mitwirkende, ODbL 1.0
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$;
const O = HSS.osm = {};
const SERVER = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const r1 = v => Math.round(v * 10) / 10;

/* Geokoordinaten → Modellraster (x Osten, z Süden, gedreht um den Nordwinkel des Projekts) */
O.proj = (geo) => {
  const c = Math.cos(U.rad(geo.lat)), a = U.rad(-(geo.nord || 0));
  return (lat, lon) => { const e = (lon - geo.lon) * 111320 * c, s = -(lat - geo.lat) * 110574; const q = G.rot([e, s], a); return [r1(q[0]), r1(q[1])]; };
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
  if (t.natural === 'water' || ['reservoir', 'basin'].includes(t.landuse) || t.water) return 'wasser';
  if (['residential'].includes(t.landuse)) return 'wohngebiet';
  if (['commercial', 'industrial', 'retail', 'railway', 'construction'].includes(t.landuse)) return 'gewerbe';
  return null;
};
const LAGE = { wohngebiet: 0, gewerbe: 0, acker: 1, wiese: 1, wald: 2, park: 2, friedhof: 2, sport: 3, parkplatz: 4, wasser: 5 };

O.query = (geo, radius, kh) => {
  const dLat = radius / 110574, dLon = radius / (111320 * Math.cos(U.rad(geo.lat)));
  const bb = `${geo.lat - dLat},${geo.lon - dLon},${geo.lat + dLat},${geo.lon + dLon}`;
  return `[out:json][timeout:90];(
    way["highway"](${bb});
    way["landuse"](${bb}); relation["landuse"](${bb});
    way["natural"~"^(wood|water|scrub|grassland|heath|wetland)$"](${bb}); relation["natural"~"^(wood|water)$"](${bb});
    way["leisure"~"^(park|garden|pitch|playground|sports_centre|track)$"](${bb});
    way["waterway"~"^(river|stream|canal|ditch)$"](${bb});
    way["railway"~"^(rail|tram|light_rail)$"](${bb});
    way["amenity"~"^(hospital|parking|grave_yard)$"](${bb}); relation["amenity"="hospital"](${bb});
    way["building"](${bb});${kh ? `
    relation["building"](${bb}); node["aeroway"="helipad"](${bb}); way["aeroway"="helipad"](${bb});` : ''}
  );out geom;`;
};
O.fetch = async (q, onTry) => {
  let last;
  for (let i = 0; i < SERVER.length * 2; i++) {
    const url = SERVER[i % SERVER.length]; onTry && onTry(url);
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { last = e; await new Promise(res => setTimeout(res, 1500)); }
  }
  throw new Error('OpenStreetMap (Overpass) nicht erreichbar: ' + (last?.message || last) + '. Internetverbindung prüfen oder später erneut versuchen.');
};
// Deutschland, Österreich, Schweiz (DACH)
const DACH = ['DE', 'AT', 'CH'], DACH_BBOX = '5.8,45.7,17.3,55.1';
O.geocode = async (q) => {
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=de,at,ch&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'de' } });
  if (!r.ok) throw new Error('Adresssuche nicht erreichbar (HTTP ' + r.status + ')');
  return (await r.json()).map(x => ({ name: x.display_name, sub: '', lat: +x.lat, lon: +x.lon, osm: { type: x.osm_type, id: x.osm_id }, hospital: x.type === 'hospital' }));
};
// Vorschläge beim Tippen (Photon, OSM-basiert, für Suchvorschläge gedacht)
O.suche = async (q, signal) => {
  const r = await fetch(`https://photon.komoot.io/api/?lang=de&limit=10&bbox=${DACH_BBOX}&q=${encodeURIComponent(q)}`, { signal });
  if (!r.ok) throw new Error('Adresssuche nicht erreichbar (HTTP ' + r.status + ')');
  const typ = { N: 'node', W: 'way', R: 'relation' };
  return (await r.json()).features.filter(f => DACH.includes(f.properties.countrycode)).map(f => {
    const p = f.properties, str = [p.street && (p.street + (p.housenumber ? ' ' + p.housenumber : '')), [p.postcode, p.city || p.town || p.village].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    const land = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz' }[p.countrycode];
    return { name: p.name || str || p.city || '', sub: [p.name ? str : '', p.state, land].filter(Boolean).join(' · '), lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], osm: { type: typ[p.osm_type], id: p.osm_id }, hospital: p.osm_value === 'hospital' || p.osm_value === 'clinic', extent: p.extent };
  });
};

function hull(pts) {
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
/* ---------- Krankenhaus aus OSM ---------- */
const ringLL = el => el.type === 'relation' ? (el.members || []).filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry) : (el.geometry ? [el.geometry] : []);
const inLL = (pt, ring) => G.pointIn([pt.lon, pt.lat], ring.map(g => [g.lon, g.lat]));
// Klinikgelände finden: gewählter OSM-Eintrag, sonst Gelände am Punkt, sonst das nächste in 400 m
O.klinik = (data, geo, wahl) => {
  const els = (data.elements || []).filter(e => (e.tags || {}).amenity === 'hospital' && ringLL(e).length);
  let k = wahl?.osm && els.find(e => e.type === wahl.osm.type && e.id === wahl.osm.id);
  if (!k) k = els.find(e => ringLL(e).some(r => inLL(geo, r)));
  if (!k) { let best = null; for (const e of els) for (const r of ringLL(e)) { const c = r.reduce((a, g) => [a[0] + g.lat / r.length, a[1] + g.lon / r.length], [0, 0]); const d = Math.hypot((c[0] - geo.lat) * 110574, (c[1] - geo.lon) * 111320 * Math.cos(U.rad(geo.lat))); if (d < 400 && (!best || d < best.d)) best = { d, e }; } k = best?.e; }
  if (!k) return null;
  const rs = ringLL(k), all = rs.flat(), c = all.reduce((a, g) => [a[0] + g.lat / all.length, a[1] + g.lon / all.length], [0, 0]);
  return { el: k, rings: rs, name: k.tags.name || 'Krankenhaus', lat: c[0], lon: c[1] };
};
const FARBEN = ['#144477', '#0A967A', '#d9531e', '#7b5ea7', '#2D7694', '#b9770e', '#891F5E', '#1f9d7a', '#5a6573', '#c0392b', '#16a3b8', '#a07a3c'];
O.krankenhaus = (prj, data, geo, K, opt) => {
  const T = O.proj(geo), stat = { gebaeude: 0, geschosse: 0, ausgelassen: 0, heli: 0 };
  if (opt.ersetzen) { prj.buildings = prj.buildings.filter(b => !String(b.id).startsWith('osmk_')); prj.paths = prj.paths.filter(p => !String(p.id).startsWith('osmk_')); }
  const camp = K.rings.map(r => r.map(g => T(g.lat, g.lon)));
  const inCamp = p => camp.some(r => G.pointIn(p, r) || r.some((q, i) => G.dist(p, G.closestOnSeg(p, q, r[(i + 1) % r.length]).pt) < 3));
  const own = prj.buildings.filter(b => !b.umgebung).flatMap(b => b.parts).map(pt => HSS.partFootprint(pt).outer);
  const heli = (data.elements || []).filter(e => (e.tags || {}).aeroway === 'helipad').map(e => e.lat !== undefined ? T(e.lat, e.lon) : (() => { const r = (e.geometry || []).map(g => T(g.lat, g.lon)); return r.length ? [U.sum(r.map(q => q[0])) / r.length, U.sum(r.map(q => q[1])) / r.length] : null; })()).filter(Boolean);
  let n = 0;
  const ringsOf = el => el.type === 'relation' ? (el.members || []).filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry.map(g => T(g.lat, g.lon))) : [(el.geometry || []).map(g => T(g.lat, g.lon))];
  const kandidaten = (data.elements || []).filter(e => (e.tags || {}).building && !['roof', 'carport', 'ruins'].includes(e.tags.building) && (e.type === 'way' || e.type === 'relation'));
  for (const el of kandidaten) for (const [ri, r0] of ringsOf(el).entries()) {
    const t = el.tags; let r = r0.slice(); if (r.length > 2 && G.dist(r[0], r[r.length - 1]) < 0.2) r.pop(); if (r.length < 3) continue;
    const area = Math.abs(G.area(r)); if (area < 25) continue;
    const bb = G.bbox(r); if (!inCamp([bb.cx, bb.cz])) continue;
    if (own.some(o => G.pointIn([bb.cx, bb.cz], o))) { stat.ausgelassen++; continue; }
    n++;
    const park = t.building === 'parking' || t.parking === 'multi-storey' || t.amenity === 'parking';
    const lvl = +t['building:levels'] || (t.height ? Math.round(parseFloat(t.height) / (park ? 3 : 3.8)) : 0) || (t.building === 'hospital' ? 4 : park ? 3 : 2);
    const ug = +t['building:levels:underground'] || (t.building === 'hospital' && area > 800 ? 1 : 0);
    const loc = G.ccw(r.map(p => [r1(p[0] - bb.cx), r1(p[1] - bb.cz)])), lb = G.bbox(loc);
    const nm0 = t.name || t['building:name'] || '', ref = /^(?:Haus|Gebäude|Geb\.|Bau|Block|Trakt)\s+([A-Z0-9]{1,4})\b/i.exec(nm0)?.[1];
    const kurz = String(t.ref || t['building:ref'] || ref || t['addr:housename'] || n).slice(0, 6);
    const name = t.name || t['building:name'] || (t['addr:street'] ? `${t['addr:street']} ${t['addr:housenumber'] || ''}`.trim() : `Gebäude ${kurz}`);
    const hasHeli = heli.some(h => G.pointIn(h, r));
    const b = Object.assign(HSS.defaults.building(), { id: `osmk_${el.id}${ri ? '_' + ri : ''}`, name, kurz, color: FARBEN[(n - 1) % FARBEN.length],
      info: `${K.name} · aus OpenStreetMap (way/relation ${el.id}) · ${t['building:levels'] ? 'Geschosse laut OSM' : t.height ? 'Geschosse aus der Höhe geschätzt' : 'Geschosse angenommen'}${ug ? ` · ${ug} UG ${t['building:levels:underground'] ? 'laut OSM' : 'angenommen'}` : ''}` });
    b.parts.push(Object.assign(HSS.defaults.part(), { id: `osmk_p${el.id}${ri ? '_' + ri : ''}`, name, shape: 'poly', poly: loc, x: r1(bb.cx), z: r1(bb.cz), w: r1(lb.w), d: r1(lb.d), rot: 0,
      floors: U.clamp(lvl, 1, 40), floorHeight: park ? 3.0 : 3.8, basements: U.clamp(ug, 0, 4), basementHeight: 3.8, use: park ? 'parkhaus' : '',
      facade: park ? { type: 'parkhaus', color: '#d9dee3', accent: '#5a6573', glass: '#8aa0b2', axis: 2.5, windowRatio: 0.5 } : { type: 'band', color: '#eef0ee', accent: FARBEN[(n - 1) % FARBEN.length], glass: '#7fa4bd', axis: 1.35, windowRatio: 0.5 },
      roof: { type: 'flach', parapet: 0.8, plant: area > 600 && !park, color: '#a7b0ba', helipad: hasHeli } }));
    prj.buildings.push(b); stat.gebaeude++; stat.geschosse += lvl + ug; if (hasHeli) stat.heli++;
  }
  // Klinikgelände als Grenze
  if (opt.grenze) for (const [i, r] of camp.entries()) if (r.length >= 4) prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: `osmk_g${K.el.id}_${i}`, name: 'Grundstücksgrenze ' + K.name, points: r, width: 0.35, smooth: false, noNet: true }));
  if (!prj.buildings.some(b => !b.umgebung && !String(b.id).startsWith('osmk_')) && (/^(Neues|Unbenannt)/i.test(prj.meta.name || '') || !prj.meta.name)) prj.meta.name = K.name;
  prj.meta.notes = (prj.meta.notes || '') + `\nKrankenhaus „${K.name}“ aus OpenStreetMap übernommen: ${stat.gebaeude} Gebäude (Geschosse aus building:levels bzw. Höhe, sonst angenommen).`;
  return stat;
};

/* OSM-Antwort ins Projekt übernehmen */
O.apply = (prj, data, geo, opt) => {
  const T = O.proj(geo), stat = { strassen: 0, wege: 0, flaechen: 0, gebaeude: 0, grenze: 0 };
  if (opt.ersetzen) { prj.paths = prj.paths.filter(p => !p.umgebung); prj.areas = prj.areas.filter(a => !a.umgebung); prj.buildings = prj.buildings.filter(b => !b.umgebung); }
  // vorhandene Gebäude des Projekts (Klinikgebäude nicht doppelt übernehmen)
  const ownParts = prj.buildings.filter(b => !b.umgebung).flatMap(b => b.parts);
  const own = ownParts.map(pt => { const o = HSS.partFootprint(pt).outer; return { o, bb: G.bbox(o) }; });
  const near = (p, buf) => own.some(({ o, bb }) => p[0] > bb.x0 - buf && p[0] < bb.x1 + buf && p[1] > bb.z0 - buf && p[1] < bb.z1 + buf && (G.pointIn(p, o) || (buf > 0 && o.some((q, i) => G.dist(p, G.closestOnSeg(p, q, o[(i + 1) % o.length]).pt) < buf))));
  const inOwn = p => near(p, 0);
  const ringOf = el => (el.geometry || []).map(g => T(g.lat, g.lon));
  const outerRings = el => el.type === 'relation' ? (el.members || []).filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry.map(g => T(g.lat, g.lon))) : [ringOf(el)];
  // Klinikgelände: OSM-Grenze des Klinikums und Umriss der Gebäude im Modell (+12 m) – dort gilt das Modell, nicht OSM
  const campus = [];
  if (opt.campus !== false) {
    for (const el of data.elements || []) { const t = el.tags || {}; if (t.amenity === 'hospital' && !t.building) for (const r of outerRings(el)) if (r.length >= 4) campus.push(r); }
    const pts = own.flatMap(x => x.o); if (pts.length >= 3) {
      const h = hull(pts), cx = U.sum(h.map(p => p[0])) / h.length, cz = U.sum(h.map(p => p[1])) / h.length;
      campus.push(h.map(p => { const dx = p[0] - cx, dz = p[1] - cz, l = Math.hypot(dx, dz) || 1; return [p[0] + dx / l * 12, p[1] + dz / l * 12]; }));
    }
  }
  const inCampus = p => campus.some(r => G.pointIn(p, r));
  const polyHitsOwn = r => r.some(p => inOwn(p)) || own.some(({ o }) => o.some(q => G.pointIn(q, r)));
  // Linien auftrennen: Stücke im Klinikgelände bzw. über Modellgebäuden entfallen
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
  let maxR = 0;
  for (const el of data.elements || []) {
    const t = el.tags || {};
    // Straßen und Wege
    if (opt.wege && el.type === 'way' && t.highway && STRASSE[t.highway] && el.geometry?.length >= 2) {
      const [w, kind, traffic, kmh] = STRASSE[t.highway];
      const pts = ringOf(el); if (G.polylineLength(pts) < 3) continue;
      const lanes = +t.lanes || 0, width = t.width ? parseFloat(t.width) || w : lanes ? Math.max(w, lanes * 3.2) : w;
      const wid = U.clamp(width, 1.2, 30);
      // im Klinikgelände nur öffentliche Straßen übernehmen; nie über Modellgebäude
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
      prj.paths.push(Object.assign(HSS.defaults.path(kind), { id: 'osm_w' + el.id, name: t.name || HSS.WEGARTEN[kind].name, points: ringOf(el), width: kind === 'bach' ? (t.waterway === 'river' ? 14 : t.waterway === 'canal' ? 10 : 3) : 3.2, smooth: false, umgebung: true, noNet: true, osm: 'way/' + el.id }));
      continue;
    }
    // Klinikgelände als Zaun / Grundstücksgrenze
    if (opt.grenze && t.amenity === 'hospital' && !t.building) {
      for (const r of outerRings(el)) { if (r.length < 4) continue; prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: 'osm_g' + el.id + '_' + stat.grenze, name: t.name ? 'Grenze ' + t.name : 'Grundstücksgrenze Klinikum', points: r, width: 0.35, smooth: false, umgebung: true, noNet: true, osm: el.type + '/' + el.id })); stat.grenze++; }
      continue;
    }
    // Flächen
    const kind = FLAECHE(t);
    if (opt.flaechen && kind && !t.building) {
      for (const r0 of outerRings(el)) {
        let r = r0.slice(); if (r.length > 3 && G.dist(r[0], r[r.length - 1]) < 0.2) r.pop(); if (r.length < 3) continue;
        const area = Math.abs(G.area(r)); if (area < 30) continue;
        r = G.ccw(r); const bb = G.bbox(r);
        // Flächen im Klinikgelände (Parkplätze, Rasen …) gibt das Modell vor
        if (campus.length && (inCampus([bb.cx, bb.cz]) || (area < 20000 && polyHitsOwn(r)))) { stat.ausgelassen++; continue; }
        prj.areas.push({ id: 'osm_a' + el.id + '_' + stat.flaechen, kind, name: t.name || HSS.FLAECHEN[kind], poly: r, x: r1(bb.cx), z: r1(bb.cz), w: r1(bb.w), d: r1(bb.d), rot: 0, lage: LAGE[kind] || 0, umgebung: true, osm: el.type + '/' + el.id });
        stat.flaechen++;
      }
      continue;
    }
    // Gebäude der Umgebung
    if (opt.gebaeude && t.building && el.type === 'way' && el.geometry?.length >= 4) {
      let r = ringOf(el); if (G.dist(r[0], r[r.length - 1]) < 0.2) r.pop(); if (r.length < 3) continue;
      const area = Math.abs(G.area(r)); if (area < 12) continue;
      const bbw = G.bbox(r); if (inOwn([bbw.cx, bbw.cz]) || inCampus([bbw.cx, bbw.cz]) || polyHitsOwn(r)) { stat.ausgelassen++; continue; }
      const lv = U.clamp(Math.round(+t['building:levels'] || (t.height ? parseFloat(t.height) / 3 : 0) || ({ house: 2, detached: 2, garage: 1, garages: 1, shed: 1, apartments: 4, industrial: 2, retail: 1, commercial: 3, office: 4, hospital: 4, school: 3 }[t.building] || 2)), 1, 30);
      const loc = G.ccw(r.map(p => [r1(p[0] - bbw.cx), r1(p[1] - bbw.cz)])), bb = G.bbox(loc);
      const b = Object.assign(HSS.defaults.building(), { id: 'osm_b' + el.id, name: t.name || (t['addr:street'] ? `${t['addr:street']} ${t['addr:housenumber'] || ''}`.trim() : 'Gebäude (Umgebung)'), kurz: '', color: '#8d969f', noLabel: true, umgebung: true });
      b.parts.push(Object.assign(HSS.defaults.part(), { id: 'osm_p' + el.id, name: b.name, shape: 'poly', poly: loc, x: r1(bbw.cx), z: r1(bbw.cz), w: r1(bb.w), d: r1(bb.d), rot: 0, floors: lv, floorHeight: 3.0, basements: 0, facade: { type: 'loch', color: '#e6e2dc', accent: '#9aa1aa', glass: '#8aa0b2', axis: 1.6, windowRatio: 0.35 }, roof: { type: 'flach', parapet: 0.3, plant: false, color: '#a8a39b' } }));
      prj.buildings.push(b); stat.gebaeude++;
    }
  }
  // Gelände so groß, dass die Umgebung darauf liegt
  prj.terrain.size = Math.max(prj.terrain.size || 500, Math.ceil((Math.max(maxR, opt.radius) * 2 + 120) / 50) * 50);
  prj.meta.notes = (prj.meta.notes || '') + `\nUmgebung aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0), Radius ${opt.radius} m, abgerufen ${new Date().toLocaleDateString('de-DE')}.`;
  return stat;
};

/* Dialog */
O.dialog = (vorgabe = {}) => {
  const prj = HSS.project(), std = (HSS.STANDORTE || []).find(x => x.id === prj.meta.standort?.id)?.geo;
  const g = prj.meta.geo?.lat ? prj.meta.geo : (std || prj.meta.geo || {});
  let wahl = null;
  UI.dialog(`<div class="dh"><h2>Umgebung aus OpenStreetMap laden</h2><button class="x" data-close>×</button></div>
    <p class="note">Lädt Straßen, Wege, Felder, Wiesen, Wälder, Gewässer und Gebäude der Nachbarschaft rund um den Standort – auf Wunsch auch das <b>Krankenhaus selbst</b> als bearbeitbare Modellgebäude. Deutschland, Österreich und Schweiz. Benötigt eine Internetverbindung.</p>
    <div class="fg"><label class="f full osmac-w"><span>Adresse oder Krankenhaus suchen</span><input type="text" id="oQ" autocomplete="off" placeholder="z. B. Klinikum Bielefeld Mitte · AKH Wien · Universitätsspital Zürich" value="${U.esc(vorgabe.q || (g.adresse && !/^[a-z]+$/.test(g.adresse) ? g.adresse : ''))}"><div class="osmac" id="oAc" hidden></div></label></div>
    <div class="note" id="oRes"></div>
    <div class="fg"><label class="f"><span>Breite (lat) des Modellursprungs</span><input type="number" id="oLat" step="0.00001" value="${g.lat ?? ''}"></label><label class="f"><span>Länge (lon)</span><input type="number" id="oLon" step="0.00001" value="${g.lon ?? ''}"></label>
    <label class="f"><span>Nordwinkel des Modells [°]</span><input type="number" id="oN" step="0.1" value="${g.nord ?? 0}"></label><label class="f"><span>Radius [m]</span><input type="number" id="oR" step="50" min="150" max="2000" value="600"></label></div>
    <div class="row" style="flex-wrap:wrap;gap:10px"><label class="chk"><input type="checkbox" id="oW" checked> Straßen, Wege, Bahn, Bäche</label><label class="chk"><input type="checkbox" id="oF" checked> Flächen (Acker, Wiese, Wald, Wasser …)</label><label class="chk"><input type="checkbox" id="oB" checked> Gebäude der Umgebung</label><label class="chk"><input type="checkbox" id="oG" checked> Grenze des Klinikgeländes</label><label class="chk"><input type="checkbox" id="oV" checked> Verkehr animieren</label><label class="chk"><input type="checkbox" id="oE" checked> frühere OSM-Umgebung ersetzen</label><label class="chk" title="Auf dem Klinikgelände und über den Gebäuden des Modells werden keine OSM-Gebäude, -Flächen und -Wege übernommen – dort gilt das Modell"><input type="checkbox" id="oC" checked> Klinikgelände wie im Modell (OSM nur außen herum)</label></div>
    <div id="oWahl" class="osmwahl" hidden></div>
    <div class="note" id="oSt"></div>
    <div class="actions"><button data-close>Abbrechen</button><button class="primary" id="oGo">Umgebung laden …</button></div>
    <p class="note">Daten © OpenStreetMap-Mitwirkende (ODbL 1.0) · Suche: Photon (komoot) / Nominatim. Der Modellursprung (0/0) liegt an der angegebenen Koordinate – mit Krankenhaus in der Mitte des Klinikgeländes.</p>`, d => {
    const q = $('#oQ', d), ac = $('#oAc', d), res = $('#oRes', d);
    let ctl = null, liste = [], aktiv = -1;
    const waehlen = x => {
      wahl = x; ac.hidden = true; q.value = x.name + (x.sub ? ', ' + x.sub.split(' · ')[0] : '');
      $('#oLat', d).value = x.lat.toFixed(6); $('#oLon', d).value = x.lon.toFixed(6);
      if (x.extent) { const [w, n, e, s2] = x.extent, dia = Math.hypot((n - s2) * 110574, (e - w) * 111320 * Math.cos(U.rad(x.lat))); $('#oR', d).value = U.clamp(Math.round((dia / 2 + 350) / 50) * 50, 300, 1500); }
      res.innerHTML = `${x.hospital ? '🏥 <b>Krankenhaus</b> gewählt: ' : 'Gewählt: '}${U.esc(x.name)}${x.sub ? ' · ' + U.esc(x.sub) : ''}`;
    };
    const zeigen = () => {
      ac.hidden = !liste.length;
      ac.innerHTML = liste.map((x, i) => `<div class="oi ${i === aktiv ? 'on' : ''}" data-i="${i}"><span class="ic">${x.hospital ? '🏥' : '📍'}</span><div><b>${U.esc(x.name)}</b><small>${U.esc(x.sub)}</small></div></div>`).join('');
      ac.querySelectorAll('[data-i]').forEach(el => el.onmousedown = e => { e.preventDefault(); waehlen(liste[+el.dataset.i]); });
    };
    const suchen = U.debounce(async () => {
      const t = q.value.trim(); if (t.length < 3) { liste = []; zeigen(); return; }
      ctl?.abort(); ctl = new AbortController();
      try { liste = await O.suche(t, ctl.signal); aktiv = -1; zeigen(); if (!liste.length) res.textContent = 'keine Treffer in Deutschland, Österreich oder der Schweiz'; else res.textContent = ''; }
      catch (e) { if (e.name !== 'AbortError') { try { liste = await O.geocode(t); aktiv = -1; zeigen(); } catch (e2) { res.textContent = e2.message; } } }
    }, 300);
    q.oninput = () => { wahl = null; suchen(); };
    q.onkeydown = e => {
      if (e.key === 'ArrowDown' && liste.length) { e.preventDefault(); aktiv = (aktiv + 1) % liste.length; zeigen(); }
      else if (e.key === 'ArrowUp' && liste.length) { e.preventDefault(); aktiv = (aktiv - 1 + liste.length) % liste.length; zeigen(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (liste[aktiv >= 0 ? aktiv : 0]) waehlen(liste[aktiv >= 0 ? aktiv : 0]); }
      else if (e.key === 'Escape' && !ac.hidden) { e.preventDefault(); e.stopPropagation(); ac.hidden = true; }
    };
    q.onblur = () => setTimeout(() => (ac.hidden = true), 150);
    q.onfocus = () => { if (liste.length) ac.hidden = false; };
    // Schritt 2: nur Umgebung oder Umgebung mit Krankenhaus
    $('#oGo', d).onclick = () => {
      const lat = +$('#oLat', d).value, lon = +$('#oLon', d).value;
      if (!lat || !lon) return UI.toast('Bitte Adresse oder Krankenhaus suchen oder Koordinaten angeben');
      const eigene = HSS.project().buildings.filter(b => !b.umgebung && !String(b.id).startsWith('osmk_')).length;
      const w = $('#oWahl', d); w.hidden = false;
      w.innerHTML = `<b>Was soll geladen werden?</b><div class="osmtiles">
        <button class="tile big" data-m="u"><span class="ic">🗺</span><b>Nur Umgebung</b><small>Straßen, Flächen und Nachbargebäude rund um ${eigene ? 'die vorhandenen Modellgebäude' : 'den Standort'}</small></button>
        <button class="tile big ${!eigene ? 'empf' : ''}" data-m="k"><span class="ic">🏥</span><b>Umgebung mit Krankenhaus</b><small>Alle Gebäude des Klinikgeländes${wahl?.hospital ? ` („${U.esc(wahl.name)}“)` : ''} als bearbeitbare Modellgebäude mit Geschossen aus OSM, Grenze des Geländes, Hubschrauberlandeplatz${eigene ? ` · ${eigene} vorhandene Gebäude bleiben, Überschneidungen werden übersprungen` : ''}</small></button></div>`;
      w.querySelectorAll('[data-m]').forEach(b => b.onclick = () => laden(b.dataset.m === 'k'));
      w.scrollIntoView({ block: 'nearest' });
    };
    const laden = async (mitKh) => {
      let geo = { lat: +$('#oLat', d).value, lon: +$('#oLon', d).value, nord: +$('#oN', d).value || 0 };
      const radius = U.clamp(+$('#oR', d).value || 600, 150, 2000);
      const opt = { radius, wege: $('#oW', d).checked, flaechen: $('#oF', d).checked, gebaeude: $('#oB', d).checked, grenze: $('#oG', d).checked, verkehr: $('#oV', d).checked, ersetzen: $('#oE', d).checked, campus: $('#oC', d).checked };
      const st = $('#oSt', d); d.querySelectorAll('#oWahl button, #oGo').forEach(b => (b.disabled = true)); st.textContent = 'Lade Daten aus OpenStreetMap …';
      try {
        const data = await O.fetch(O.query(geo, radius, mitKh), url => { st.textContent = 'Lade Daten von ' + new URL(url).host + ' …'; });
        let K = null;
        if (mitKh) {
          K = O.klinik(data, geo, wahl);
          if (!K) throw new Error('An dieser Stelle wurde kein Klinikgelände (amenity=hospital) gefunden. Bitte das Krankenhaus in der Suche auswählen oder „Nur Umgebung“ laden.');
          // Modellursprung in die Mitte des Klinikgeländes, sofern das Projekt noch keine eigenen Gebäude hat
          if (!HSS.project().buildings.some(b => !b.umgebung && !String(b.id).startsWith('osmk_'))) geo = { lat: +K.lat.toFixed(6), lon: +K.lon.toFixed(6), nord: geo.nord };
        }
        st.textContent = `${(data.elements || []).length} Elemente empfangen – werden übernommen …`;
        let stat, ks = null;
        HSS.manip?.mark();
        HSS.change(mitKh ? 'Krankenhaus und Umgebung aus OpenStreetMap' : 'Umgebung aus OpenStreetMap', p => {
          p.meta.geo = Object.assign(p.meta.geo || {}, geo, { adresse: wahl ? wahl.name : p.meta.geo?.adresse });
          if (K) ks = O.krankenhaus(p, data, geo, K, opt);
          stat = O.apply(p, data, geo, opt);
        });
        d.close();
        if (ks?.gebaeude) { const T = window.THREEX.THREE, box = new T.Box3(); for (const b of HSS.project().buildings) if (String(b.id).startsWith('osmk_')) for (const pt of b.parts) for (const q of HSS.partFootprint(pt).outer) { box.expandByPoint(new T.Vector3(q[0], 0, q[1])); box.expandByPoint(new T.Vector3(q[0], HSS.partTopY(pt), q[1])); } setTimeout(() => HSS.s3.focusBox(box, { k: 1.0 }), 300); }
        else HSS.s3.home();
        UI.toast(`${ks ? `🏥 ${K.name}: ${ks.gebaeude} Gebäude übernommen${ks.heli ? ', Hubschrauberlandeplatz' : ''}${ks.ausgelassen ? `, ${ks.ausgelassen} überschneiden vorhandene Gebäude (übersprungen)` : ''} · ` : ''}Umgebung: ${stat.strassen} Straßen, ${stat.wege} Wege, ${stat.flaechen} Flächen, ${stat.gebaeude} Gebäude${stat.ausgelassen ? ` · ${stat.ausgelassen} Objekte auf dem Klinikgelände ausgelassen` : ''}`, 7000);
        if (ks) setTimeout(() => UI.toast('Tipp: Gebäude anklicken, um Name, Kürzel und Geschosse zu prüfen – OSM kennt nicht immer alle Geschosse.', 6000), 7200);
      } catch (e) { st.innerHTML = `<span class="warnbox" style="display:block">${U.esc(e.message)}</span>`; d.querySelectorAll('#oWahl button, #oGo').forEach(b => (b.disabled = false)); }
    };
    if (vorgabe.q) suchen();
  });
};
})();
