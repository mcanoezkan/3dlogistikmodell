/* =====================================================================
   HSS · osm.js – Umgebung aus OpenStreetMap laden
   Lädt rund um den verorteten Standort (Projekt → Standort: lat/lon, Nordwinkel)
   über die Overpass-API: Straßen und Wege mit Namen und Breiten nach Straßenklasse,
   Feldwege, Bahngleise, Bäche, Flächennutzung (Acker, Wiese, Wald, Wohn- und
   Gewerbegebiete, Parks, Friedhöfe, Sportplätze, Wasser, Parkplätze), Gebäude der
   Umgebung als schlichte graue Baukörper und die Grenze des Klinikgeländes (Zaun).
   Die Abfrage läuft direkt aus dem Browser (Internetverbindung nötig).
   Adresse suchen über Nominatim. Daten: © OpenStreetMap-Mitwirkende, ODbL 1.0
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

O.query = (geo, radius) => {
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
    way["building"](${bb});
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
O.geocode = async (q) => {
  const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=de&q=' + encodeURIComponent(q), { headers: { 'Accept-Language': 'de' } });
  if (!r.ok) throw new Error('Adresssuche nicht erreichbar (HTTP ' + r.status + ')');
  return (await r.json()).map(x => ({ name: x.display_name, lat: +x.lat, lon: +x.lon }));
};

function hull(pts) {
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
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
O.dialog = () => {
  const prj = HSS.project(), std = (HSS.STANDORTE || []).find(x => x.id === prj.meta.standort?.id)?.geo;
  const g = prj.meta.geo?.lat ? prj.meta.geo : (std || prj.meta.geo || {});
  UI.dialog(`<div class="dh"><h2>Umgebung aus OpenStreetMap laden</h2><button class="x" data-close>×</button></div>
    <p class="note">Lädt Straßen, Wege, Felder, Wiesen, Wälder, Gewässer, Gebäude der Nachbarschaft und die Grenze des Klinikgeländes rund um den Standort – so sieht man, wo Autos fahren, wie weit geplant werden kann und was das Gelände umgibt. Benötigt eine Internetverbindung.</p>
    <div class="fg"><label class="f full"><span>Adresse suchen</span><input type="text" id="oQ" placeholder="z. B. Rübenacher Straße 170, Koblenz" value="${U.esc(g.adresse && !/^[a-z]+$/.test(g.adresse) ? g.adresse : '')}"></label></div>
    <div class="row"><button id="oSearch">Suchen</button><span class="note" id="oRes"></span></div>
    <div class="fg"><label class="f"><span>Breite (lat) des Modellursprungs</span><input type="number" id="oLat" step="0.00001" value="${g.lat ?? ''}"></label><label class="f"><span>Länge (lon)</span><input type="number" id="oLon" step="0.00001" value="${g.lon ?? ''}"></label>
    <label class="f"><span>Nordwinkel des Modells [°]</span><input type="number" id="oN" step="0.1" value="${g.nord ?? 0}"></label><label class="f"><span>Radius [m]</span><input type="number" id="oR" step="50" min="150" max="2000" value="600"></label></div>
    <div class="row" style="flex-wrap:wrap;gap:10px"><label class="chk"><input type="checkbox" id="oW" checked> Straßen, Wege, Bahn, Bäche</label><label class="chk"><input type="checkbox" id="oF" checked> Flächen (Acker, Wiese, Wald, Wasser …)</label><label class="chk"><input type="checkbox" id="oB" checked> Gebäude der Umgebung</label><label class="chk"><input type="checkbox" id="oG" checked> Grenze des Klinikgeländes</label><label class="chk"><input type="checkbox" id="oV" checked> Verkehr animieren</label><label class="chk"><input type="checkbox" id="oE" checked> frühere OSM-Umgebung ersetzen</label><label class="chk" title="Auf dem Klinikgelände und über den Gebäuden des Modells werden keine OSM-Gebäude, -Flächen und -Wege übernommen – dort gilt das Modell"><input type="checkbox" id="oC" checked> Klinikgelände wie im Modell (OSM nur außen herum)</label></div>
    <div class="note" id="oSt"></div>
    <div class="actions"><button data-close>Abbrechen</button><button class="primary" id="oGo">Umgebung laden</button></div>
    <p class="note">Daten © OpenStreetMap-Mitwirkende (ODbL 1.0). Der Modellursprung (0/0) liegt an der angegebenen Koordinate.</p>`, d => {
    $('#oSearch', d).onclick = async () => {
      const q = $('#oQ', d).value.trim(); if (!q) return; $('#oRes', d).textContent = 'suche …';
      try { const r = await O.geocode(q); if (!r.length) { $('#oRes', d).textContent = 'nichts gefunden'; return; } $('#oLat', d).value = r[0].lat.toFixed(6); $('#oLon', d).value = r[0].lon.toFixed(6); $('#oRes', d).textContent = r[0].name.slice(0, 90); }
      catch (e) { $('#oRes', d).textContent = e.message; }
    };
    $('#oGo', d).onclick = async () => {
      const geo = { lat: +$('#oLat', d).value, lon: +$('#oLon', d).value, nord: +$('#oN', d).value || 0 };
      if (!geo.lat || !geo.lon) return UI.toast('Bitte Koordinaten angeben oder Adresse suchen');
      const radius = U.clamp(+$('#oR', d).value || 600, 150, 2000);
      const opt = { radius, wege: $('#oW', d).checked, flaechen: $('#oF', d).checked, gebaeude: $('#oB', d).checked, grenze: $('#oG', d).checked, verkehr: $('#oV', d).checked, ersetzen: $('#oE', d).checked, campus: $('#oC', d).checked };
      const st = $('#oSt', d); $('#oGo', d).disabled = true; st.textContent = 'Lade Daten aus OpenStreetMap …';
      try {
        const data = await O.fetch(O.query(geo, radius), url => { st.textContent = 'Lade Daten von ' + new URL(url).host + ' …'; });
        st.textContent = `${(data.elements || []).length} Elemente empfangen – werden übernommen …`;
        let stat;
        HSS.manip?.mark();
        HSS.change('Umgebung aus OpenStreetMap', p => { p.meta.geo = Object.assign(p.meta.geo || {}, geo); stat = O.apply(p, data, geo, opt); });
        d.close(); HSS.s3.home();
        UI.toast(`Umgebung geladen: ${stat.strassen} Straßen, ${stat.wege} Wege, ${stat.flaechen} Flächen, ${stat.gebaeude} Gebäude${stat.grenze ? ', Grundstücksgrenze' : ''}${stat.ausgelassen ? ` · ${stat.ausgelassen} Objekte auf dem Klinikgelände ausgelassen` : ''}`, 5000);
      } catch (e) { st.innerHTML = `<span class="warnbox" style="display:block">${U.esc(e.message)}</span>`; $('#oGo', d).disabled = false; }
    };
  });
};
})();
