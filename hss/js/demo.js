/* =====================================================================
   HSS · demo.js – Demo-Modus „UNITY Hospital“
   Schwerpunktversorger (~650 Betten) in Breitfuß-Bauweise: Behandlungssockel mit zwei aufgesetzten
   Bettenhäusern, gläserne Eingangshalle, Kinderklinik (Glasbrücke), Geriatrie/Psychiatrie (Glasgang),
   Logistikzentrum (Tunnel + AWT), Verwaltung, Parkhaus. Straßen mit Gehwegen, Vorfahrt, Bushalt.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$;

const part = (o) => { const d = HSS.defaults.part(); const p = Object.assign(d, o); p.facade = Object.assign(HSS.defaults.part().facade, o.facade || {}); p.roof = Object.assign(HSS.defaults.part().roof, o.roof || {}); return p; };

HSS.buildDemo = () => {
  const prj = HSS.newProject('UNITY Hospital (Demo)');
  prj.meta.notes = 'Demo-Campus der Healthcare Simulation Suite. Mengen, Zeiten und Kapazitäten sind Beispielwerte.';
  HSS.state.project = prj;
  prj.terrain = { size: 700, color: '#bfd0aa', tilt: { dir: 0, pct: 0 }, hills: [
    { x: -270, z: -130, h: 9, r: 90 }, { x: 260, z: -150, h: 6, r: 80 }, { x: 250, z: 230, h: -5, r: 110 }, { x: -290, z: 210, h: 4, r: 70 }
  ] };
  const B = (id, name, kurz, color, parts) => prj.buildings.push({ id, name, kurz, color, parts });

  /* ---------- Gebäude ---------- */
  const H0 = part({ id: 'H0', name: 'Behandlungszentrum (Sockel)', shape: 'rect', w: 110, d: 56, cornerRadius: 3, x: 0, z: 0, floors: 3, floorHeight: 4.4, basements: 1, basementHeight: 4.0, facade: { type: 'paneel', color: '#eef0f2', accent: '#2D7694', glass: '#6b8ca6', axis: 1.5, windowRatio: 0.6 }, roof: { type: 'gruen', plant: false } });
  const H1 = part({ id: 'H1', name: 'Bettenhaus Nord', shape: 'rect', w: 100, d: 17, cornerRadius: 8.5, x: 0, z: -19, stackOn: 'H0', floors: 5, floorHeight: 3.6, basements: 0, facade: { type: 'band', color: '#f4f5f7', accent: '#144477', glass: '#6b8ca6', axis: 1.35 }, roof: { plant: true } });
  const H2 = part({ id: 'H2', name: 'Bettenhaus Süd', shape: 'rect', w: 100, d: 17, cornerRadius: 8.5, x: 0, z: 19, rot: 180, stackOn: 'H0', floors: 5, floorHeight: 3.6, basements: 0, facade: { type: 'band', color: '#f4f5f7', accent: '#144477', glass: '#6b8ca6', axis: 1.35 }, roof: { plant: true } });
  const H3 = part({ id: 'H3', name: 'Eingangshalle (Rundbau)', shape: 'rund', w: 36, d: 36, x: -20, z: 46, floors: 2, floorHeight: 5.0, basements: 0, facade: { type: 'glas', color: '#e9ecef', accent: '#144477', glass: '#7fa4bd', axis: 1.6 }, roof: { type: 'gruen', plant: false } });
  const H4 = part({ id: 'H4', name: 'Glasgang West', shape: 'rect', w: 45, d: 6, x: -77.5, z: -22, floors: 1, floorHeight: 4.4, basements: 0, facade: { type: 'glas', color: '#e9ecef', accent: '#144477', glass: '#8fb2c6', axis: 1.5 }, roof: { plant: false, parapet: 0.4 } });
  B('bH', 'Haupthaus', 'H', '#144477', [H0, H1, H2, H3, H4]);
  const K1 = part({ id: 'K1', name: 'Kinderklinik', shape: 'rect', w: 64, d: 20, cornerRadius: 10, x: 101, z: -6, floors: 4, floorHeight: 3.7, basements: 1, facade: { type: 'lamellen', color: '#f4f5f7', accent: '#e3e7eb', glass: '#7fa4bd', axis: 1.5 }, roof: { type: 'gruen', plant: true } });
  B('bK', 'Kinderklinik', 'K', '#0A967A', [K1]);
  const P1 = part({ id: 'P1', name: 'Geriatrie', shape: 'rect', w: 60, d: 16, cornerRadius: 2, x: -130, z: -22, floors: 3, floorHeight: 3.7, basements: 1, facade: { type: 'raster', color: '#eceef0', accent: '#c4cad1', glass: '#6b8ca6', axis: 1.35 } });
  const P2 = part({ id: 'P2', name: 'Psychiatrie & Psychosomatik', shape: 'rect', w: 60, d: 16, cornerRadius: 2, x: -130, z: 10, floors: 3, floorHeight: 3.7, basements: 1, facade: { type: 'raster', color: '#eceef0', accent: '#c4cad1', glass: '#6b8ca6', axis: 1.35 } });
  const P3 = part({ id: 'P3', name: 'Verbindungsbau', shape: 'rect', w: 12, d: 48, x: -166, z: -6, floors: 3, floorHeight: 3.7, basements: 1, facade: { type: 'raster', color: '#eceef0', accent: '#c4cad1', glass: '#6b8ca6', axis: 1.35 } });
  B('bP', 'Zentrum für Altersmedizin & Seelische Gesundheit', 'P', '#2D7694', [P1, P2, P3]);
  const L1 = part({ id: 'L1', name: 'Ver- und Entsorgungszentrum', shape: 'rect', w: 72, d: 40, cornerRadius: 1, x: 20, z: -82, floors: 2, floorHeight: 5.0, basements: 1, basementHeight: 4.0, facade: { type: 'paneel', color: '#e3e6ea', accent: '#891F5E', glass: '#6b8ca6', axis: 2.0, windowRatio: 0.45 } });
  B('bL', 'Logistikzentrum', 'L', '#891F5E', [L1]);
  const V1 = part({ id: 'V1', name: 'Verwaltung (Altbau)', shape: 'rect', w: 46, d: 15, x: -168, z: 92, rot: -6, floors: 3, floorHeight: 4.0, basements: 1, facade: { type: 'klinker', color: '#9c5a3c', accent: '#f4f1ea', glass: '#5d7489', axis: 1.6, windowRatio: 0.42 }, roof: { parapet: 1.2, plant: false } });
  B('bV', 'Verwaltung', 'V', '#d9531e', [V1]);
  const PH = part({ id: 'PH', name: 'Parkhaus', shape: 'rect', w: 64, d: 32, x: 122, z: 96, floors: 4, floorHeight: 3.0, basements: 0, use: 'parkhaus', facade: { type: 'parkhaus', color: '#c9ced4', accent: '#2D7694', axis: 2.5 }, roof: { plant: false, parapet: 1.1 } });
  B('bPH', 'Parkhaus', 'PH', '#5a6573', [PH]);
  prj.bridges.push({ id: 'br1', name: 'Glasbrücke Behandlungszentrum – Kinderklinik', type: 'glas', a: { part: 'H0', floor: 1 }, b: { part: 'K1', floor: 1 }, width: 4.5, height: 4.0, levels: 2, offset: -4 });
  prj.bridges.push({ id: 'br2', name: 'Gebäudebrücke Bettenhaus Süd – Kinderklinik', type: 'gebaeude', a: { part: 'H2', floor: 0 }, b: { part: 'K1', floor: 3 }, width: 4, height: 3.4, levels: 1, offset: 0, color: '#f4f5f7' });

  /* ---------- Straßen und Wege ---------- */
  const path = (kind, name, pts, extra = {}) => { const p = Object.assign(HSS.defaults.path(kind), { name, points: pts }, extra); prj.paths.push(p); return p; };
  path('strasse', 'Klinikstraße', [[-340, 154], [-200, 150], [-60, 148], [80, 150], [200, 154], [340, 150]], { traffic: 9 });
  path('strasse', 'Nordring', [[-340, -168], [-200, -165], [-60, -162], [80, -163], [200, -166], [340, -170]], { traffic: 5 });
  path('strasse', 'Parkstraße', [[-232, -165], [-232, -60], [-232, 60], [-232, 150]], { traffic: 4, smooth: false });
  path('zufahrt', 'Vorfahrt Haupteingang', [[-62, 149], [-58, 110], [-46, 84], [-20, 78], [6, 84], [16, 110], [20, 149]], { traffic: 3, width: 6 });
  path('zufahrt', 'Liegendanfahrt ZNA (RTW)', [[62, 150], [62, 80], [52, 46], [42, 39]], { traffic: 2, width: 6 });
  path('zufahrt', 'Wirtschaftshof Logistik', [[24, -163], [24, -130], [20, -110]], { traffic: 2, width: 7 });
  path('zufahrt', 'Zufahrt Parkhaus', [[122, 151], [122, 116]], { traffic: 2, width: 6, smooth: false });
  path('zufahrt', 'Zufahrt Besucherparkplatz', [[-92, 149], [-92, 124]], { traffic: 1, width: 6, smooth: false });
  path('zufahrt', 'Zufahrt Mitarbeiterparkplatz', [[-231, -96], [-206, -96]], { traffic: 1, width: 6, smooth: false });
  path('zufahrt', 'Feuerwehrumfahrt Nord', [[-55, -40], [-30, -46], [30, -46], [62, -40]], { traffic: 0, width: 5 });
  // Gehwege entlang der Straßen
  path('gehweg', 'Gehweg Klinikstraße Nord', [[-340, 143], [-200, 139.5], [-60, 137.5], [80, 139.5], [200, 143], [340, 139]], { width: 2.6 });
  path('gehweg', 'Gehweg Klinikstraße Süd', [[-340, 165], [-200, 161], [-60, 159], [80, 161], [200, 165], [340, 161]], { width: 2.6 });
  path('gehweg', 'Gehweg Nordring', [[-340, -157], [-200, -154], [-60, -151], [80, -152], [200, -155], [340, -159]], { width: 2.4 });
  path('gehweg', 'Gehweg Parkstraße', [[-221, -150], [-221, 140]], { width: 2.4, smooth: false });
  // Campuswege
  path('gehweg', 'Weg Bushalt – Haupteingang', [[-30, 138], [-28, 112], [-24, 88], [-20, 66]], { width: 3.5 });
  path('gehweg', 'Weg Besucherparkplatz – Eingang', [[-92, 104], [-70, 92], [-48, 74], [-34, 64]], { width: 3.0 });
  path('gehweg', 'Weg Parkhaus – Eingang (gebogen)', [[100, 82], [78, 72], [52, 64], [24, 70], [6, 66]], { width: 3.0 });
  path('gehweg', 'Weg Verwaltung', [[-150, 82], [-110, 70], [-70, 62], [-38, 58]], { width: 2.6 });
  path('gehweg', 'Weg Kinderklinik', [[56, 18], [72, 18], [88, 14], [100, 6]], { width: 3.0 });
  path('gehweg', 'Rundweg Park (Geriatrie)', [[-105, -42], [-128, -52], [-152, -45], [-175, -38], [-188, -6], [-178, 28], [-150, 38], [-118, 36], [-102, 30]], { width: 2.2 });
  path('gehweg', 'Rampe Eingang (6 %)', [[8, 62], [8, 79]], { width: 2.0, ramp: [0.0, 1.0], smooth: false });
  path('weg', 'Versorgungsweg Sockel – Logistik', [[16, -29], [18, -46], [20, -61]], { width: 4.0 });
  path('weg', 'Personalweg Mitarbeiterparkplatz', [[-196, -74], [-170, -52], [-140, -48], [-102, -36]], { width: 3.0 });
  path('gehweg', 'Spielplatzweg Kinderklinik', [[110, 5], [120, 22], [124, 40]], { width: 2.2 });
  // Unterirdisch
  path('tunnel', 'Versorgungstunnel L – H', [[8, -62], [8, -40], [8, -27]], { y: -4.0, width: 3.6, smooth: false });
  path('awt', 'AWT-Trasse Logistik – Behandlungszentrum', [[40, -66], [40, -40], [44, -25], [44, 0], [44, 24]], { y: -4.0 });

  /* ---------- Flächen ---------- */
  prj.areas.push({ id: 'ar_plaza', kind: 'platz', x: -18, z: 74, w: 52, d: 14, rot: 0, color: '#d8d2c6' });
  prj.areas.push({ id: 'ar_pv', kind: 'parkplatz', x: -92, z: 106, w: 56, d: 34, rot: 0, occupancy: 0.8 });
  prj.areas.push({ id: 'ar_pm', kind: 'parkplatz', x: -184, z: -96, w: 44, d: 50, rot: 0, occupancy: 0.9 });
  prj.areas.push({ id: 'ar_park', kind: 'gruen', x: 112, z: 46, w: 54, d: 30, rot: 0, density: 1.0 });
  prj.areas.push({ id: 'ar_hof', kind: 'gruen', x: -133, z: -6, w: 54, d: 14, rot: 0, density: 0.5, color: '#a6c98a' });
  prj.areas.push({ id: 'ar_wald', kind: 'gruen', x: -280, z: -120, w: 80, d: 70, rot: 0, density: 3.2, color: '#8fb172' });
  prj.areas.push({ id: 'ar_nord', kind: 'gruen', x: 110, z: -90, w: 70, d: 40, rot: 0, density: 1.2 });
  prj.areas.push({ id: 'ar_teich', kind: 'wasser', x: 128, z: 52, w: 16, d: 9, rot: 0 });
  prj.areas.push({ id: 'ar_wh', kind: 'platz', x: 22, z: -118, w: 60, d: 26, rot: 0, color: '#b9b6ae' });
  prj.areas.push({ id: 'ar_zna', kind: 'platz', x: 48, z: 42, w: 26, d: 14, rot: 0, color: '#c9c5bd' });
  prj.areas.push({ id: 'ar_garten_k', kind: 'gruen', x: 160, z: -20, w: 30, d: 40, rot: 0, density: 0.8 });

  /* ---------- Objekte (außen) ---------- */
  const out = (lib, x, z, rot = 0, extra = {}) => { const o = Object.assign({ id: U.uid('obj'), lib, x, z, rot }, extra); prj.objects.push(o); return o; };
  const inn = (lib, partId, f, x, z, rot = 0, extra = {}) => { const o = Object.assign({ id: U.uid('obj'), lib, host: { part: partId, floor: f }, x, z, rot }, extra); prj.objects.push(o); return o; };
  // Freiflächen-Prüfung: nicht in Gebäuden, nicht auf Fahrbahnen, nicht auf Parkplätzen/Plätzen
  const parts = HSS.allParts(prj);
  const roads = prj.paths.filter(p => ['strasse', 'zufahrt'].includes(p.kind)).map(p => ({ L: HSS.pathLine(p, prj), w: p.width }));
  const walks = prj.paths.filter(p => ['gehweg', 'weg'].includes(p.kind)).map(p => ({ L: HSS.pathLine(p, prj), w: p.width }));
  const blocked = prj.areas.filter(a => a.kind !== 'gruen').map(a => HSS.areaPoly(a));
  const free = (x, z, r = 1) => {
    for (const pt of parts) { const fp = HSS.partFootprint(pt).outer; if (G.pointIn([x, z], fp)) return false; for (let i = 0; i < fp.length; i++) if (G.dist([x, z], G.closestOnSeg([x, z], fp[i], fp[(i + 1) % fp.length]).pt) < r + 1) return false; }
    for (const rd of [...roads, ...walks]) for (const q of rd.L) if (Math.hypot(q[0] - x, q[2] - z) < rd.w / 2 + r) return false;
    for (const poly of blocked) if (G.pointIn([x, z], poly)) return false;
    return true;
  };
  const along = (p, every, off, fn) => { const L = HSS.pathLine(p, prj), len = L[L.length - 1][3]; for (let s = every / 2; s < len; s += every) { const q = HSS.sampleLine(L, s); const nx = -Math.sin(q.ang), nz = Math.cos(q.ang); fn(q.x + nx * off, q.z + nz * off, q, s); } };
  const rd = n => prj.paths.find(p => p.name === n);
  // Alleen und Straßenleuchten
  for (const [n, side] of [['Klinikstraße', -1], ['Klinikstraße', 1], ['Nordring', 1], ['Nordring', -1]]) {
    const p = rd(n);
    along(p, 32, side * (p.width / 2 + 2.0), (x, z, q) => { if (free(x, z, 0.6)) out('licht.strassenlaterne', x, z, Math.round(-U.deg(q.ang) + (side > 0 ? 90 : -90))); });
    along(p, 16, side * (p.width / 2 + 15), (x, z, q, s) => { if (free(x, z, 2.5)) out(Math.floor(s / 16) % 3 ? 'gruen.baum.laub' : 'gruen.baum.klein', x, z, s % 360, { size: { w: 6, d: 6, h: 9 } }); });
  }
  along(rd('Parkstraße'), 30, 6.5, (x, z) => { if (free(x, z, 0.6)) out('licht.strassenlaterne', x, z, -90); });
  along(rd('Parkstraße'), 15, -8, (x, z, q, s) => { if (free(x, z, 2.5)) out('gruen.baum.saeule', x, z, 0); });
  for (const n of ['Vorfahrt Haupteingang', 'Liegendanfahrt ZNA (RTW)', 'Wirtschaftshof Logistik']) along(rd(n), 26, 5, (x, z, q) => { if (free(x, z, 0.5)) out('licht.strassenlaterne', x, z, Math.round(-U.deg(q.ang) + 90)); });
  for (const p of prj.paths.filter(p => p.kind === 'gehweg' && !/Klinikstraße|Nordring|Parkstraße/.test(p.name))) along(p, 20, p.width / 2 + 1.0, (x, z) => { if (free(x, z, 0.3)) out(p.name.includes('Park') ? 'licht.kugelleuchte' : 'licht.mastleuchte', x, z, 0); });
  for (const p of prj.paths.filter(p => p.kind === 'gehweg' && !/Klinikstraße|Nordring|Parkstraße/.test(p.name))) along(p, 13, -(p.width / 2 + 3.5), (x, z, q, s) => { if (free(x, z, 1.8) && (s / 13 | 0) % 2 === 0) out((s | 0) % 3 ? 'gruen.strauch' : 'gruen.baum.klein', x, z, s % 360); });
  // Bushaltestellen (beide Seiten), Vorfahrt, Plaza
  out('aussen.haltestelle', -30, 142.6, 0); out('aussen.haltestelle', 36, 155.6, 180); out('aussen.verkehrsschild', -20, 144, 0);
  for (const [x, z] of [[-40, 70], [-30, 70], [-6, 70], [4, 70]]) out('aussen.bank', x, z, 180);
  out('aussen.brunnen', -18, 76, 0); out('aussen.fahnenmast', -44, 72, 0); out('aussen.fahnenmast', -47, 74, 0); out('aussen.fahnenmast', -50, 76, 0);
  out('aussen.wegweiser', -36, 80, 200); out('aussen.wegweiser', 30, 66, 160); out('aussen.fahrradueberdachung', -60, 66, 0); out('aussen.raucherpavillon', 30, 82, 0);
  out('kfz.taxi', -36, 83.5, 70); out('kfz.taxi', -28, 82, 85); out('kfz.ktw', 2, 83, 110);
  // ZNA
  out('aussen.vordach', 42, 37, 0); out('kfz.rtw', 38, 37, 180); out('kfz.rtw', 46, 38, 175); out('kfz.nef', 54, 44, 200); out('person.rettungsdienst', 41, 33, 10);
  // Logistik / Wirtschaftshof
  out('log.rampe', 10, -103.6, 0, { role: 'rampe', name: 'Warenannahme Rampe', place: true }); out('log.rampe', 30, -103.6, 0);
  out('kfz.lkw75', 10, -112, 0); out('kfz.lkw.kuehl', 30, -113, 4); out('kfz.entsorgung', 48, -122, 90);
  out('aussen.muellstandplatz', 62, -116, 0, { role: 'abfall', name: 'Abfallsammelstelle', place: true }); out('aussen.presscontainer', 74, -112, 90);
  out('aussen.sauerstofftank', -6, -116, 0); out('aussen.notstromaggregat', -24, -118, 90); out('aussen.trafo', -26, -100, 90);
  out('licht.fluter', 0, -126, 0); out('licht.fluter', 46, -128, 0);
  out('aussen.helipad', 170, -60, 0, { role: 'helipad', name: 'Hubschrauberlandeplatz', place: true }); out('kfz.hubschrauber', 170, -60, 30); out('licht.fluter', 154, -74, 45);
  path('weg', 'Weg Landeplatz – Kinderklinik', [[158, -48], [136, -22], [133, -8]], { width: 3.5 });
  // Parkplätze: Schranken, Ladesäulen
  out('aussen.schranke', -92, 128, 0); out('aussen.parkscheinautomat', -70, 124, 0); for (let i = 0; i < 6; i++) out('aussen.ladesaeule', -118 + i * 2.6, 89, 180);
  out('aussen.schranke', 122, 114, 0); out('aussen.fahrradueberdachung', -178, -66, 0);
  // Kinderklinik: Spielplatz, Park
  out('aussen.spielplatz', 124, 26, 0); out('aussen.pergola', -133, -6, 0); out('aussen.bank', 100, 40, 0); out('aussen.bank', 112, 58, 180); out('aussen.brunnen', 96, 52, 0);
  // Personen außen
  out('person.besucher', -26, 96, 20); out('person.besucher2', -22, 120, 180); out('person.patient.rollstuhl', -14, 72, 200); out('person.patient', 104, 44, 90); out('person.arzt', 30, 74, 270); out('person.pflege', 60, 64, 250);
  out('person.besucher', 118, 30, 30); out('person.patient.kind', 122, 28, 200); out('person.transportdienst', 18, -110, 0); out('person.technik', -20, -110, 90); out('person.sicherheit', -46, 82, 180);
  out('kfz.fahrrad', -61, 65.5, 0); out('kfz.fahrrad', -59, 65.5, 0);

  /* ---------- Raum-Helfer ---------- */
  const room = (pid, f, use, name, x, z, w, d, role, station) => {
    const I = HSS.interior(pid, f, true, prj); const r = { id: U.uid('r'), use, name, x, z, w, d }; if (role) r.role = role; if (station) r.station = station; I.rooms.push(r);
    I.walls = HSS.dedupeWalls(I.walls.concat(HSS.roomWalls(r))); return r;
  };
  const door = (pid, f, x, z, w = 1.4, lib = 'erschl.tuer.bett') => { const I = HSS.interior(pid, f, true, prj); let best = null, bd = 0.6; for (const wl of I.walls) { const c = G.closestOnSeg([x, z], wl.a, wl.b); const d = G.dist(c.pt, [x, z]); if (d < bd) { bd = d; best = { wl, t: c.t }; } } if (best) I.doors.push({ id: U.uid('d'), wall: best.wl.id, t: best.t, w, lib }); };
  // Raumreihe: Räume nebeneinander zwischen Flur (Türseite) und Rückwand; Möbel in Raumkoordinaten (Rückwand = −z)
  const row = (pid, f, band, x0, specs, defaults = {}) => {
    let x = x0; const dir = band.door === band.z1 ? -1 : 1, d = Math.abs(band.z1 - band.z0), zc = (band.z0 + band.z1) / 2;
    const out = [];
    for (const s0 of specs) {
      const s = Object.assign({}, defaults, s0);
      if (s.gap) { x += s.gap; continue; }
      const cx = x + s.w / 2, r = room(pid, f, s.use, s.name, cx, zc, s.w, d, s.role, s.station);
      if (s.use !== 'flur') door(pid, f, cx + (s.use.startsWith('patient') ? (s.w / 2 - 1.0) * (dir < 0 ? 1 : -1) : 0), band.door, s.doorW || (s.use.startsWith('patient') || ['op', 'behandlung'].includes(s.use) ? 1.5 : 1.1), s.doorLib || (['op', 'behandlung', 'untersuchung', 'warten', 'logistik', 'awt'].includes(s.use) ? 'erschl.tuer.schiebe' : s.use.startsWith('patient') ? 'erschl.tuer.bett' : 'erschl.tuer.1'));
      const furn = s.furn === 'auto' ? (HSS.FURN[s.use] ? HSS.FURN[s.use](s.w, d, dir, s.intensiv) : []) : (s.furn || []);
      for (const [lib, fx, fz, frot = 0, ex] of furn) { if (!HSS.library.get(lib)) continue; inn(lib, pid, f, cx + fx * (dir < 0 ? 1 : -1), zc + fz * (dir < 0 ? 1 : -1), ((dir < 0 ? 0 : 180) + frot) % 360, Object.assign({}, typeof ex === 'object' ? ex : {}, s.station ? { station: s.station } : {})); }
      out.push(r); x += s.w;
    }
    return out;
  };
  const station = (name, typ, extra = {}) => { const st = Object.assign({ id: U.uid('st'), name, typ, art: 'stationaer', betten: 0, plaetze: 0, vwd: HSS.STATIONSTYPEN.find(t => t.id === typ)?.vwd, auslastung: 0.8, sel: [] }, extra); prj.stations.push(st); return st; };

  /* ---------- Behandlungszentrum H0 (Dreibund: zwei Flure, Innenzone) ---------- */
  const N = { z0: -28, z1: -14.5, door: -14.5 }, IN = { z0: -11.5, z1: -0.2, door: -11.5 }, IS = { z0: 0.2, z1: 11.5, door: 11.5 }, S = { z0: 14.5, z1: 28, door: 14.5 };
  const flure = f => { room('H0', f, 'flur', 'Flur Nord', 0, -13, 106, 3); room('H0', f, 'flur', 'Flur Süd', 0, 13, 106, 3); room('H0', f, 'flur', 'Magistrale', 0, 0, 3.6, 22.6); };
  const kern = (f) => { room('H0', f, 'flur', 'Aufzugshalle Nord', 0, -21.25, 16, 13.5); room('H0', f, 'flur', 'Aufzugshalle Süd', 0, 21.25, 16, 13.5); };
  // EG
  flure(0); kern(0);
  row('H0', 0, N, -53, [
    { use: 'untersuchung', name: 'Röntgen', w: 9, role: 'radiologie', furn: [['med.roentgen', 0, -1.5], ['buero.schreibtisch', 2.5, 4.5, 180]] },
    { use: 'untersuchung', name: 'CT', w: 11, furn: [['med.ct', 0, -0.5, 90], ['person.arzt', 3, 4, 200]] },
    { use: 'untersuchung', name: 'MRT 1,5 T', w: 12, furn: [['med.mrt', 0, -0.5, 90], ['buero.schreibtisch', -4, 4.5, 180]] },
    { use: 'buero', name: 'Befundung Radiologie', w: 13, furn: [['buero.schreibtisch', -3, -4.5], ['buero.schreibtisch', 3, -4.5], ['buero.stuhl', -3, -3.6], ['buero.stuhl', 3, -3.6], ['person.arzt', 0, 0, 0]] }]);
  row('H0', 0, N, 8, [
    { use: 'labor', name: 'Zentrallabor', w: 22, role: 'labor', furn: [['lab.probenroboter', -6, -4.5], ['lab.analysator', 2, -5], ['lab.analysator', 6, -5], ['lab.zentrifuge', 9.5, -5.2], ['lab.werkbank', -6, 2, 180], ['lab.werkbank', 2, 2, 180], ['lab.sicherheitswerkbank', 9.5, 2, 270], ['log.rohrpost', -10.5, 4, 90], ['lab.blutkuehlschrank', -10.4, -4], ['person.verwaltung', 0, 0, 90]] },
    { use: 'medikamente', name: 'Krankenhausapotheke', w: 18, role: 'apotheke', furn: [['apo.kommissionierautomat', -2, -5], ['apo.unitdose', 5.5, 1], ['lab.werkbank', -4, 2.5, 180], ['stat.kuehlschrank.med', 8, -5.6], ['log.apothekenbox', -1, 4.5], ['person.apotheke', 0, 0.5, 0]] },
    { use: 'logistik', name: 'Versorgungskern Ost', w: 5, furn: [] }]);
  row('H0', 0, IN, -53, [
    { use: 'warten', name: 'Patientenaufnahme', w: 14, furn: [['warte.empfang', 0, 2.5, 180], ['warte.stuhlreihe', -4, -3.5], ['warte.stuhlreihe', 2, -3.5], ['person.verwaltung', 0, 4.2, 0]] },
    { use: 'untersuchung', name: 'Ambulanz Chirurgie', w: 10, furn: 'auto' }, { use: 'untersuchung', name: 'Ambulanz Innere', w: 10, furn: 'auto' }, { use: 'untersuchung', name: 'Ambulanz Neurologie', w: 9, furn: 'auto' }, { use: 'wc', name: 'WC', w: 5.2, furn: 'auto' }]);
  row('H0', 0, IN, 2, [{ use: 'untersuchung', name: 'Funktionsdiagnostik EKG', w: 10, furn: [['med.ekg', -2, -3], ['med.liege.untersuchung', 2, -1, 90], ['med.ergometer', -3, 2]] }, { use: 'untersuchung', name: 'Sonographie', w: 9, furn: 'auto' }, { use: 'lager', name: 'Blutdepot', w: 8, furn: [['lab.blutkuehlschrank', -2, -4], ['lab.blutkuehlschrank', 0, -4], ['lab.tiefkuehl', 2.5, -4]] }, { use: 'buero', name: 'Sozialdienst', w: 10, furn: [['buero.schreibtisch', 0, -3.5], ['stat.tisch.patient', 0, 1.5]] }, { use: 'putz', name: 'Putzraum', w: 4, furn: 'auto' }, { use: 'logistik', name: 'Rohrpostzentrale', w: 10, furn: [['log.rohrpost', 0, -4.5]] }]);
  const zna = station('Zentrale Notaufnahme', 'zna', { art: 'ambulant', plaetze: 12, sel: [{ part: 'H0', floors: [0] }] });
  row('H0', 0, IS, 2, [
    { use: 'behandlung', name: 'Schockraum', w: 12, role: 'zna', station: zna.id, furn: [['med.trage', 0, 0], ['med.op.leuchte', 0, 0], ['med.beatmung', -2.2, -2], ['med.monitor.patient', 2.2, -2], ['med.defi.notfallwagen', 4, 2.5], ['med.roentgen.mobil', -4.5, 2], ['person.arzt', -1, 1.4, 180], ['person.pflege', 1.4, 1, 200]] },
    { use: 'behandlung', name: 'ZNA Behandlung 1', w: 6.5, station: zna.id, furn: [['med.trage', 0, -1], ['med.monitor.patient', -2, -3.5], ['stat.desinfektion', 3.1, 0, 90]] },
    { use: 'behandlung', name: 'ZNA Behandlung 2', w: 6.5, station: zna.id, furn: [['person.patient.liegend', 0, -1], ['med.monitor.patient', -2, -3.5]] },
    { use: 'behandlung', name: 'ZNA Behandlung 3', w: 6.5, station: zna.id, furn: [['med.trage', 0, -1], ['med.infusion', 2, -3]] },
    { use: 'untersuchung', name: 'Gipsraum', w: 7, station: zna.id, furn: 'auto' },
    { use: 'unrein', name: 'Arbeitsraum unrein ZNA', w: 5.5, station: zna.id, furn: 'auto' },
    { use: 'rein', name: 'Arbeitsraum rein ZNA', w: 5.5, station: zna.id, furn: 'auto' }]);
  row('H0', 0, S, 8, [
    { use: 'stuetzpunkt', name: 'ZNA Triage & Stützpunkt', w: 10, station: zna.id, furn: [['stat.stuetzpunkt', 0, 4.8, 180], ['buero.stuhl', -0.7, 3.6], ['person.pflege', 1, 3.4, 180], ['stat.visitewagen', 4, 0]] },
    { use: 'warten', name: 'Wartebereich ZNA', w: 12, station: zna.id, furn: [['warte.stuhlreihe', -3, -4], ['warte.stuhlreihe', 1, -4], ['warte.stuhlreihe', -3, 0], ['warte.stuhlreihe', 1, 0], ['service.automat', 5, -5], ['person.besucher2', 0, 2, 0], ['person.patient', -2, 2.5, 90]] },
    { use: 'behandlung', name: 'ZNA Liegendbereich', w: 16, station: zna.id, furn: [['med.trage', -5, -2], ['med.trage', -1.5, -2], ['med.trage', 2, -2], ['med.trage', 5.5, -2], ['person.patient.liegend', -5, 2.5, 90]] },
    { use: 'aufenthalt', name: 'Personal ZNA', w: 7, station: zna.id, furn: [['kueche.teekueche', 0, -5.6], ['stat.tisch.patient', 0, 0]] }]);
  row('H0', 0, S, -53, [{ use: 'warten', name: 'Zugang Eingangshalle', w: 45, furn: [['aussen.wegweiser', 0, 2, 180], ['warte.pflanze', -15, -4], ['warte.pflanze', 15, -4]] }]);
  // 1. OG: OP-Zentrum und Intensivstation
  flure(1); kern(1);
  row('H0', 1, N, -53, [0, 1, 2].map(i => ({ use: 'op', name: 'OP-Saal ' + (i + 1), w: 15, role: i === 0 ? 'op' : null, furn: [['med.op.tisch', 0, 0.5], ['med.op.leuchte', 0, 0.5], ['med.op.anaesthesie', -2.4, -2.2], ['med.op.instrumententisch', 2.8, 2, 90], ['med.op.mayo', 1.8, 1.2], ['med.op.pendel', -4, 1], ['med.op.endoskopieturm', 5, -3.5], ['person.op', 1.2, 0, 270], ['person.op', -1.2, 1, 90], ['person.op', 1.2, 2.2, 270]] })));
  row('H0', 1, N, 8, [{ use: 'op', name: 'Hybrid-OP', w: 18, furn: [['med.op.tisch', 0, 0], ['med.hybrid.op', 0, 0], ['med.op.anaesthesie', -3, -2.5], ['med.hlm', 4, -2.5], ['person.op', 1.2, -0.5, 270], ['person.op', -1.2, 0.5, 90]] }, { use: 'op', name: 'OP-Saal 5', w: 14, furn: [['med.op.tisch', 0, 0.5], ['med.op.leuchte', 0, 0.5], ['med.op.anaesthesie', -2.4, -2.2], ['med.op.instrumententisch', 2.8, 2, 90], ['person.op', 1.2, 0, 270]] }, { use: 'logistik', name: 'Versorgungskern Ost', w: 5, furn: [] }]);
  row('H0', 1, IN, -53, [{ use: 'rein', name: 'Sterilgutlager OP', w: 16, furn: [['zsva.sterilgutregal', -5.5, -4.5], ['zsva.sterilgutregal', -4, -4.5], ['zsva.sterilgutregal', -2.5, -4.5], ['zsva.sterilgutregal', -1, -4.5], ['log.sterilgutwagen', 3, 0], ['log.sterilgutwagen', 5, 0]] }, { use: 'untersuchung', name: 'Narkoseeinleitung 1', w: 8, furn: [['med.trage', 0, 0], ['med.narkose', -2.5, -3]] }, { use: 'untersuchung', name: 'Narkoseeinleitung 2', w: 8, furn: [['med.trage', 0, 0], ['med.narkose', -2.5, -3]] }, { use: 'personal', name: 'Personalschleuse OP', w: 10, furn: [['service.schliessfaecher', -3, -5], ['service.schliessfaecher', -1.6, -5], ['san.waschtisch', 3, -5.4]] }, { use: 'unrein', name: 'Entsorgung OP (unrein)', w: 9, furn: [['log.instrumentenwagen.unrein', -2, 0], ['log.abfall240', 2, -4.5], ['stat.waeschesammler', 0, -4.8]] }]);
  row('H0', 1, IN, 2, [{ use: 'aufenthalt', name: 'Aufwachraum (8 Plätze)', w: 30, furn: [...[-12, -8.5, -5, -1.5, 2, 5.5, 9, 12.5].map(x => ['med.bett.intensiv', x, -2.2]), ['stat.stuetzpunkt', 0, 3.8, 180], ['person.pflege', 2, 3, 180]] }, { use: 'medikamente', name: 'Anästhesie Medikamente', w: 8, furn: 'auto' }, { use: 'arzt', name: 'Arztdienst Anästhesie', w: 13, furn: 'auto' }]);
  const its = station('Intensivstation ITS 1', 'intensiv', { betten: 14, sel: [{ part: 'H0', floors: [1] }], calc: { deckung: 1.12 } });
  row('H0', 1, S, -53, [...Array.from({ length: 8 }, (_, i) => ({ use: 'patient1', name: 'Intensivplatz ' + (i + 1), w: 5.6, station: its.id, intensiv: true, furn: 'auto' }))]);
  row('H0', 1, S, 8, [{ use: 'stuetzpunkt', name: 'Stützpunkt ITS', w: 10, station: its.id, furn: [['stat.stuetzpunkt', 0, 4.8, 180], ['buero.stuhl', -0.7, 3.6], ['person.pflege', 1, 3.4, 180], ['person.arzt', -1.5, 3, 160], ['lab.bga', 4, -5]] }, ...Array.from({ length: 6 }, (_, i) => ({ use: 'patient1', name: 'Intensivplatz ' + (i + 9), w: 5.8, station: its.id, intensiv: true, furn: 'auto' }))]);
  row('H0', 1, IS, -53, [{ use: 'rein', name: 'Arbeitsraum rein ITS', w: 9, station: its.id, furn: 'auto' }, { use: 'unrein', name: 'Arbeitsraum unrein ITS', w: 8, station: its.id, furn: 'auto' }, { use: 'medikamente', name: 'Medikamente ITS', w: 8, station: its.id, furn: 'auto' }, { use: 'geraete', name: 'Geräteraum ITS', w: 9, station: its.id, furn: [['med.beatmung', -3, -4], ['med.beatmung', -2, -4], ['med.dialyse', 0, -4], ['med.roentgen.mobil', 2.5, -2.5]] }, { use: 'arzt', name: 'Arztdienst ITS', w: 9, station: its.id, furn: 'auto' }, { use: 'personal', name: 'Personal ITS', w: 8, station: its.id, furn: 'auto' }]);
  row('H0', 1, IS, 2, [{ use: 'lager', name: 'Lager OP/ITS', w: 18, furn: 'auto' }, { use: 'besprechung', name: 'Besprechung', w: 12, furn: 'auto' }, { use: 'entsorgung', name: 'Entsorgung ITS', w: 7, station: its.id, furn: 'auto' }, { use: 'putz', name: 'Putzraum', w: 5, furn: 'auto' }, { use: 'wc', name: 'WC', w: 5, furn: 'auto' }]);
  // 2. OG: Kreißsaal, Herzkatheter, Endoskopie, Dialyse, Funktionsdiagnostik
  flure(2); kern(2);
  row('H0', 2, N, -53, [0, 1, 2].map(i => ({ use: 'behandlung', name: 'Kreißsaal ' + (i + 1), w: 10, furn: i === 1 ? [['med.gebaerwanne', 0, -1.5], ['med.reanimationseinheit.neo', 3.5, 3]] : [['med.bett.entbindung', 0, -1.5], ['med.reanimationseinheit.neo', 3.5, 3], ['person.hebamme', -2, 1, 90]] })).concat([{ use: 'untersuchung', name: 'Herzkatheterlabor', w: 15, furn: [['med.angio', 0, 0], ['person.arzt', 1, 1.5, 270]] }]));
  row('H0', 2, N, 8, [{ use: 'untersuchung', name: 'Endoskopie 1', w: 10, furn: [['med.liege.behandlung', 0, -0.5], ['med.op.endoskopieturm', 2.5, -2.5]] }, { use: 'untersuchung', name: 'Endoskopie 2', w: 10, furn: [['med.liege.behandlung', 0, -0.5], ['med.op.endoskopieturm', 2.5, -2.5]] }, { use: 'logistik', name: 'Endoskop-Aufbereitung', w: 12, furn: [['zsva.rdg', -3, -5], ['zsva.rdg', -2, -5], ['med.endo.trockenschrank', 2, -5.2], ['med.endo.trockenschrank', 3, -5.2]] }, { use: 'logistik', name: 'Versorgungskern Ost', w: 5, furn: [] }]);
  const dia = station('Dialysezentrum', 'dialyse', { art: 'ambulant', plaetze: 10, sel: [{ part: 'H0', floors: [2] }] });
  row('H0', 2, S, -53, [{ use: 'behandlung', name: 'Dialyse (10 Plätze)', w: 33, station: dia.id, furn: [...[-13, -10, -7, -4, -1, 2, 5, 8, 11, 14].map((x, i) => ['med.stuhl.behandlung', x, -2.5]), ...[-11.5, -5.5, 0.5, 6.5, 12.5].map(x => ['med.dialyse', x, -5.5]), ['stat.stuetzpunkt', -10, 4.5, 180], ['person.pflege', 0, 2, 0]] }, { use: 'rein', name: 'Arbeitsraum rein Dialyse', w: 6, station: dia.id, furn: 'auto' }, { use: 'unrein', name: 'Arbeitsraum unrein Dialyse', w: 6, station: dia.id, furn: 'auto' }]);
  row('H0', 2, S, 8, [{ use: 'untersuchung', name: 'Lungenfunktion', w: 10, furn: [['med.spirometrie', 0, -2]] }, { use: 'untersuchung', name: 'Belastungs-EKG', w: 10, furn: [['med.ergometer', -2, -2], ['med.ekg', 2, -3]] }, { use: 'behandlung', name: 'Physiotherapie', w: 25, furn: [['physio.bank', -8, -3], ['physio.bank', -5, -3], ['physio.barren', 2, -1, 90], ['physio.ergometer', 8, -4], ['physio.ergometer', 9.5, -4], ['person.physio', 0, 2, 0], ['person.patient', 2, 1, 270]] }]);
  row('H0', 2, IN, -53, [{ use: 'warten', name: 'Warten Funktionsbereiche', w: 15, furn: [['warte.stuhlreihe', -3, -3], ['warte.stuhlreihe', 3, -3], ['service.wasserspender', 6, 3]] }, { use: 'arzt', name: 'Arztdienst Kardiologie', w: 10, furn: 'auto' }, { use: 'besprechung', name: 'Konferenz', w: 14, furn: 'auto' }, { use: 'lager', name: 'Lager Funktion', w: 10, furn: 'auto' }]);
  row('H0', 2, IN, 2, [{ use: 'untersuchung', name: 'Ambulanz HNO', w: 10, furn: [['med.hno', 0, -2]] }, { use: 'untersuchung', name: 'Ambulanz Augen', w: 10, furn: [['med.spaltlampe', 0, -2]] }, { use: 'untersuchung', name: 'MKG-Ambulanz', w: 10, furn: [['med.zahnarzt', 0, -1]] }, { use: 'personal', name: 'Personal Funktion', w: 9, furn: 'auto' }, { use: 'wc', name: 'WC', w: 5, furn: 'auto' }]);
  // UG: ZSVA, Lager, AWT, Pathologie, Umkleiden, Technik
  flure(-1); kern(-1);
  row('H0', -1, N, -53, [{ use: 'logistik', name: 'ZSVA / AEMP', w: 45, role: 'zsva', furn: [['zsva.rdg', -18, -5], ['zsva.rdg', -16.8, -5], ['zsva.rdg', -15.6, -5], ['zsva.rdg', -14.4, -5], ['zsva.ultraschallbecken', -11, -5.4], ['zsva.packtisch', -5, 0], ['zsva.packtisch', -2, 0], ['zsva.packtisch', 1, 0], ['zsva.packtisch', 4, 0], ['zsva.sterilisator', 9, -5.2], ['zsva.sterilisator', 11, -5.2], ['zsva.sterilisator', 13, -5.2], ['zsva.sterilgutregal', 17, 0], ['zsva.sterilgutregal', 19, 0], ['person.op', -2, 1.2, 180], ['person.op', 9, -3, 0]] }]);
  row('H0', -1, N, 8, [{ use: 'lager', name: 'Sterilgutlager zentral', w: 14, furn: 'auto' }, { use: 'awt', name: 'AWT-Bahnhof Behandlungszentrum', w: 23, furn: [['awt.station', 3, -2, 0, { name: 'AWT-Station Behandlungszentrum (UG)', place: true }], ['awt.puffer', -5, -2.5], ['awt.ladestation', 8, -5]] }, { use: 'logistik', name: 'Versorgungskern Ost', w: 5, furn: [] }]);
  row('H0', -1, S, -53, [{ use: 'personal', name: 'Umkleiden Personal', w: 30, furn: [...[-12, -10.6, -9.2, -7.8, -6.4, -5, -3.6, -2.2, -0.8, 0.6, 2, 3.4].map(x => ['service.schliessfaecher', x, -5.6]), ['san.waschtisch', 10, -5.6]] }, { use: 'technik', name: 'Technik', w: 15, furn: [['aussen.trafo', 0, 0, 90]] }]);
  row('H0', -1, S, 8, [{ use: 'logistik', name: 'Bettenzentrale', w: 22, role: 'bettenzentrale', furn: [['hyg.bettenaufbereitung', -6, -2, 90], ['log.bettenbuffer', 4, -3], ['log.bettenschieber', 8, 3], ['person.transportdienst', 0, 3, 0]] }, { use: 'lager', name: 'Archiv', w: 23, furn: 'auto' }]);
  row('H0', -1, IN, -53, [{ use: 'untersuchung', name: 'Pathologie', w: 20, furn: [['lab.mikroskop', -4, -3.5], ['lab.werkbank', 4, -4.5], ['lab.abzug', 7, 2, 270]] }, { use: 'lager', name: 'Lager Wäsche', w: 16, furn: 'auto' }, { use: 'technik', name: 'Lüftungszentrale', w: 15, furn: [] }]);
  row('H0', -1, IS, 2, [{ use: 'technik', name: 'Medizinische Gase', w: 14, furn: [] }, { use: 'lager', name: 'Lager Medizintechnik', w: 20, furn: 'auto' }, { use: 'buero', name: 'Medizintechnik Werkstatt', w: 17, furn: [['buero.schreibtisch', 0, -3.5], ['person.technik', 0, 0, 0]] }]);

  /* ---------- Eingangshalle, Glasgang ---------- */
  room('H3', 0, 'warten', 'Foyer / Information', 0, 0, 26, 24, 'haupteingang');
  for (const [lib, x, z, r] of [['warte.empfang', 0, -6, 0], ['service.kiosk', -8, 4, 90], ['service.bistrotisch', 5, 4, 0], ['service.bistrotisch', 9, 7, 0], ['service.bistrotisch', 5, 9, 0], ['warte.stuhlreihe', -4, 8, 180], ['warte.stuhlreihe', -4, 6, 0], ['warte.pflanze', -11, -9, 0], ['warte.pflanze', 11, -9, 0], ['service.spielecke', 10, -3, 0], ['service.automat', -11, 9, 90], ['person.verwaltung', 0, -7.3, 180], ['person.besucher', -2, 1, 40], ['person.besucher2', 3, 2, 300], ['person.patient.rollstuhl', 6, -1, 20], ['med.rollstuhl', -11, 2, 90], ['person.sicherheit', -6, -3, 120]]) inn(lib, 'H3', 0, x, z, r);
  inn('erschl.aufzug.glas', 'H3', 0, 4, -10, 0, { name: 'Panoramaaufzug Foyer' });
  room('H3', 1, 'aufenthalt', 'Cafeteria Galerie', 0, 0, 26, 24);
  for (const [x, z] of [[-6, -4], [-2, -4], [2, -4], [6, -4], [-6, 2], [-2, 2], [2, 2], [6, 2]]) inn('service.bistrotisch', 'H3', 1, x, z, 0);
  inn('service.kiosk', 'H3', 1, 0, 8, 180);
  room('H4', 0, 'flur', 'Glasgang', 0, 0, 44.6, 5.6);

  /* ---------- Logistikzentrum L1 ---------- */
  room('L1', 0, 'flur', 'Logistikgang', 0, -2, 70, 4);
  row('L1', 0, { z0: -19.8, z1: -4, door: -4 }, -35, [
    { use: 'logistik', name: 'Warenannahme', w: 18, furn: [['log.palette', -4, -4], ['log.palette', -2.5, -4], ['log.rollcontainer', 2, -3], ['log.rollcontainer', 3, -3], ['log.hubwagen', 0, 2, 90], ['person.transportdienst', -1, 0, 0], ['log.fts.stapler', 5, 3]] },
    { use: 'lager', name: 'Zentrallager', w: 30, role: 'zentrallager', furn: [['log.hochregal', -10, -5], ['log.hochregal', -6.5, -5], ['log.hochregal', -3, -5], ['log.hochregal', 0.5, -5], ['log.hochregal', 4, -5], ['log.hochregal', 7.5, -5], ['log.modulwagen', -8, 3], ['log.modulwagen', -7, 3], ['log.modulwagen', -6, 3], ['log.modulwagen', -5, 3], ['log.fts.stapler', 6, 2]] },
    { use: 'logistik', name: 'Werkstatt Haustechnik', w: 22, furn: [['lab.werkbank', -4, -5], ['lab.werkbank', 1, -5], ['person.technik', 0, -2, 0]] }]);
  row('L1', 0, { z0: 0, z1: 19.8, door: 0 }, -35, [
    { use: 'logistik', name: 'Zentralküche (Cook & Serve)', w: 30, role: 'kueche', furn: [['kueche.teekueche', -8, -6], ['kueche.teekueche', -3, -6], ['kueche.teekueche', 2, -6], ['lab.werkbank', -6, 0], ['lab.werkbank', -1, 0], ['lab.werkbank', 4, 0], ...[-10, -8.5, -7, -5.5, -4, -2.5].map(x => ['log.speisenwagen', x, 6]), ['person.verwaltung', 0, 2, 0]] },
    { use: 'logistik', name: 'Wäscheversorgung', w: 22, role: 'waescherei', furn: [...[-8, -6.5, -5, -3.5, -2, -0.5].map(x => ['log.waeschewagen.rein', x, -5]), ...[3, 4.5, 6, 7.5].map(x => ['log.waeschewagen.unrein', x, 4])] },
    { use: 'logistik', name: 'Speisengeschirr-Spülstraße', w: 18, furn: [['zsva.rdg', -4, -5], ['zsva.rdg', -3, -5], ['lab.werkbank', 3, -5]] }]);
  room('L1', -1, 'awt', 'AWT-Bahnhof Logistikzentrum', 6, 0, 60, 36);
  for (const [lib, x, z, r, ex] of [['awt.station', 18, -8, 0, { name: 'AWT-Station Küche/Lager (Versand)', place: true }], ['awt.station', 18, 2, 0, { name: 'AWT-Station Entsorgung (Empfang)', place: true }], ['awt.waschanlage', 10, 10, 90, { name: 'AWT-Containerwaschanlage', place: true }], ['awt.ladestation', -2, 12], ['awt.ladestation', 0, 12], ['awt.ladestation', 2, 12], ['awt.puffer', -12, -8], ['awt.puffer', -12, 4], ['awt.leitstand', -20, 12, 180], ['awt.fahrzeug', 4, -4, 90], ['awt.container', 1, -4], ['awt.brandschutztor', 30, 0, 90], ['person.transportdienst', -20, 10.5, 0]]) inn(lib, 'L1', -1, x, z, r || 0, ex || {});
  inn('erschl.aufzug.lasten', 'L1', 0, -33, -2, 90, { name: 'Lastenaufzug Logistik' });

  /* ---------- Verwaltung ---------- */
  row('V1', 0, { z0: -7.3, z1: 7.3, door: -7.3 }, -22, [{ use: 'buero', name: 'Verwaltung / Poststelle', w: 22, role: 'verwaltung', furn: [['buero.schreibtisch', -6, -3], ['buero.stuhl', -6, -2.2], ['buero.schreibtisch', -1, -3], ['buero.stuhl', -1, -2.2], ['buero.schreibtisch', 4, -3], ['buero.aktenschrank', 9, -5], ['person.verwaltung', -1, -1.5, 180]] }, { use: 'besprechung', name: 'Konferenzraum', w: 14, furn: 'auto' }, { use: 'buero', name: 'Personalabteilung', w: 7, furn: 'auto' }]);
  inn('erschl.aufzug.person', 'V1', 0, 21, 2, 0); inn('erschl.treppe', 'V1', 0, 18, -4, 90);
  inn('erschl.treppe', 'PH', 0, -30, -12, 0); inn('erschl.aufzug.person', 'PH', 0, -30, -4, 0, { name: 'Aufzug Parkhaus' });

  /* ---------- Erschließung Bettenhäuser, Kinderklinik, Psychiatrie ---------- */
  inn('erschl.aufzug.lasten', 'H1', 0, 42.5, 3.4, 180, { name: 'Versorgungsaufzug Nord', aufzug: { freigabe: ['rein', 'unrein'] } });
  inn('awt.lift', 'H1', 0, 45.5, -2.8, 0, { name: 'AWT-Vertikalförderer Nord' });
  inn('erschl.aufzug.lasten', 'H2', 0, -42.5, -3.4, 0, { name: 'Versorgungsaufzug Süd', aufzug: { freigabe: ['rein', 'unrein'] } });
  inn('awt.lift', 'H2', 0, -45.5, 2.8, 180, { name: 'AWT-Vertikalförderer Süd' });
  inn('erschl.aufzug.bett', 'K1', 0, -26.5, -3.5, 90, { name: 'Bettenaufzug Kinderklinik' }); inn('erschl.treppe', 'K1', 0, 26.5, -1, 0);
  inn('erschl.aufzug.bett', 'P3', 0, 0, -10, 0, { name: 'Bettenaufzug Altersmedizin' }); inn('erschl.treppe', 'P3', 0, 0, 6, 90);
  inn('erschl.aufzug.person', 'P3', 0, 0, 16, 0);
  for (let f = 0; f < 3; f++) room('P3', f, 'flur', 'Verbindungsflur', 0, -6, 4, 47);

  /* ---------- Stationen über den Stationsplaner ---------- */
  const gen = (name, typ, faelle, partId, floor, opts = {}) => { const inp = Object.assign({ typ, name, art: 'stationaer', faelleStat: faelle, sel: [{ part: partId, floors: [floor], half: !!opts.half }] }, opts.inp || {}); const calc = HSS.stationCalc(inp); return HSS.generateStation(inp, calc, Object.assign({ furnish: true, replace: false, reserveStart: 9.5, reserveEnd: 9.5, core: 'force' }, opts.gen || {})); };
  gen('Innere Medizin 3N', 'innere', 1850, 'H1', 0); gen('Kardiologie 4N', 'kardio', 2150, 'H1', 1); gen('Gastroenterologie 5N', 'innere', 1800, 'H1', 2); gen('Onkologie 6N', 'onko', 1300, 'H1', 3); gen('Neurologie & Stroke 7N', 'neuro', 1550, 'H1', 4);
  gen('Allgemeinchirurgie 3S', 'chirurgie', 1900, 'H2', 0); gen('Unfallchirurgie 4S', 'unfall', 1650, 'H2', 1); gen('Gynäkologie & Geburtshilfe 5S', 'gyn', 2700, 'H2', 2); gen('Urologie 6S', 'chirurgie', 1850, 'H2', 3); gen('Palliativstation 7S', 'palliativ', 340, 'H2', 4, { half: true });
  gen('Kinder-Ambulanz K0', 'ambulanz', 0, 'K1', 0, { inp: { art: 'ambulant', faelleAmb: 9000 }, gen: { reserveStart: 10, reserveEnd: 10, core: false } });
  gen('Neonatologie K1', 'paed', 1450, 'K1', 1, { gen: { reserveStart: 10, reserveEnd: 10, core: false } });
  gen('Pädiatrie K2', 'paed', 1600, 'K1', 2, { gen: { reserveStart: 10, reserveEnd: 10, core: false } });
  gen('Kinderchirurgie K3', 'paed', 1500, 'K1', 3, { gen: { reserveStart: 10, reserveEnd: 10, core: false } });
  gen('Geriatrie G0', 'geriatrie', 590, 'P1', 0, { gen: { reserveStart: 1, reserveEnd: 1, core: false } });
  gen('Geriatrie G1', 'geriatrie', 590, 'P1', 1, { gen: { reserveStart: 1, reserveEnd: 1, core: false } });
  gen('Geriatrische Tagesklinik G2', 'tagesklinik', 0, 'P1', 2, { inp: { art: 'ambulant', faelleAmb: 1400 }, gen: { reserveStart: 1, reserveEnd: 1, core: false } });
  gen('Allgemeinpsychiatrie S0', 'psych', 300, 'P2', 0, { gen: { reserveStart: 1, reserveEnd: 1, core: false } });
  gen('Psychosomatik S1', 'psychosom', 170, 'P2', 1, { gen: { reserveStart: 1, reserveEnd: 1, core: false } });
  gen('Gerontopsychiatrie S2', 'psych', 280, 'P2', 2, { gen: { reserveStart: 1, reserveEnd: 1, core: false } });
  // AWT-Stationen auf den Etagen der Bettenhäuser (am Vertikalförderer)
  for (let f = 0; f < 5; f++) { inn('awt.station', 'H1', f, 45, 4.6, 180, { name: 'AWT-Station Nord ' + HSS.floorName(f + 3), place: true }); inn('awt.station', 'H2', f, -45, -4.6, 0, { name: 'AWT-Station Süd ' + HSS.floorName(f + 3), place: true }); }
  // Patienten in Betten, Personal am Stützpunkt
  for (const st of prj.stations) {
    const beds = prj.objects.filter(o => o.station === st.id && (o.lib === 'med.bett.pflege' || o.lib === 'med.bett.intensiv'));
    beds.forEach((b, i) => { if (i % 3 === 0) b.lib = 'person.patient.bett'; });
    const sp = prj.objects.find(o => o.station === st.id && o.lib === 'stat.stuetzpunkt');
    if (sp && !['Zentrale Notaufnahme', 'Intensivstation ITS 1'].includes(st.name)) { inn('person.pflege', sp.host.part, sp.host.floor, sp.x + 0.6, sp.z + 1.4, sp.rot + 180, { station: st.id }); inn('person.arzt', sp.host.part, sp.host.floor, sp.x - 1.2, sp.z + 1.8, sp.rot + 150, { station: st.id }); }
  }
  prj.places.push({ id: 'ext1', name: 'Großhandel / Lieferanten', role: 'extern', x: 335, z: 146, anfahrtM: 15000 });
  prj.places.push({ id: 'ext2', name: 'Entsorgungsfachbetrieb', role: 'extern', x: -335, z: -168, anfahrtM: 9000 });

  /* ---------- Flüsse und Regeln ---------- */
  HSS.ensureStammdaten(prj);
  const { flows } = HSS.applyTemplates(HSS.STANDARDFLUESSE.map(t => t.id));
  const pl = HSS.places(prj);
  const awtSend = pl.find(p => p.name.includes('AWT-Station Küche')), awtRecv = pl.find(p => p.name.includes('AWT-Station Entsorgung'));
  const awtAt = (part, f) => pl.find(p => p.part === part && p.floor === f && p.role === 'awt-station');
  for (const fl of flows) {
    const st = prj.stations.find(s => fl.name.endsWith('· ' + s.name)); const sel = st?.sel?.[0];
    if (!sel || !['H1', 'H2'].includes(sel.part)) continue;
    if (!['speisen', 'geschirr', 'waesche_r', 'waesche_u', 'abfall', 'modul'].includes(fl.template)) continue;
    const ap = awtAt(sel.part, sel.floors[0]); if (!ap) continue;
    const inbound = ['speisen', 'waesche_r', 'modul'].includes(fl.template);
    fl.von = inbound ? awtSend.id : ap.id; fl.nach = inbound ? ap.id : awtRecv.id; fl.transport = 't_awt'; fl.name += ' (AWT)';
  }
  prj.flows = flows;
  const wash = pl.find(p => p.role === 'waschanlage' && p.name.includes('AWT'));
  prj.rules.push({ id: 'rule1', typ: 'reinigungNachUnrein', transport: 't_awt', ziel: wash.id, dauerMin: 2, aktiv: true });
  prj.rules.push({ id: 'rule2', typ: 'reinigungNachN', transport: 't_awt', ziel: wash.id, dauerMin: 2, n: 5, aktiv: true });
  return prj;
};

/* ---------- Geführte Demo ---------- */
const V3 = (x, y, z) => new window.THREEX.THREE.Vector3(x, y, z);
const stIds = (...names) => HSS.project().stations.filter(s => names.includes(s.name)).map(s => s.id);
const STEPS = [
  { t: 'Willkommen im UNITY Hospital', p: 'Ein Schwerpunktversorger mit rund 650 Betten in kompakter Breitfuß-Bauweise: Behandlungszentrum als Sockel, zwei aufgesetzte Bettenhäuser, gläserne Eingangshalle, Kinderklinik, Zentrum für Altersmedizin und Seelische Gesundheit, Logistikzentrum, Verwaltung und Parkhaus.', li: ['Maus: links drehen · rechts verschieben · Rad zoomt zur Mausposition', 'Rechts unten: Kompass (drehen, Norden, Draufsicht)', 'Links: Etagentasten wie im Aufzug'], go: () => { HSS.s3.setFloor(null); HSS.s3.setSun(10.5); $('#vSun').value = 10.5; HSS.s3.animateCam(V3(-230, 150, 260), V3(0, 0, 10), 1400); } },
  { t: 'Gebäude aus Bausteinen', p: 'Der Sockel (110 × 56 m, 3 Geschosse à 4,40 m, Paneelfassade) trägt zwei Bettenhäuser mit vollrunden Enden und Bandfassade – im Inspektor „aufgesetzt auf“. Die Eingangshalle ist ein gläserner Rundbau, die Geriatrie hängt über einen Glasgang an.', li: ['Bauteil anklicken → Maße, Eckrundung, Geschosse, Fassade', 'Andocken, Aufsetzen, Brücken über den Inspektor'], go: () => { HSS.s3.select({ kind: 'part', id: 'H1' }); HSS.s3.animateCam(V3(-110, 70, 110), V3(-5, 14, 5), 1300); } },
  { t: 'Kurze Wege: Brücken und Gänge', p: 'Glasbrücke (zweigeschossig, 14 m) vom OP/Intensiv-Geschoss zur Kinderklinik, Gebäudebrücke vom Bettenhaus Süd. Unterschiedliche Geschosshöhen werden als Rampe geführt; das Wegenetz nutzt die Verbindungen automatisch.', go: () => { HSS.s3.select({ kind: 'bridge', id: 'br1' }); HSS.s3.animateCam(V3(90, 32, 60), V3(62, 8, 0), 1300); } },
  { t: 'Topographie, Wege und Verkehr', p: 'Straßen mit Gehwegen auf beiden Seiten, Vorfahrt mit Taxis, Bushaltestellen, Liegendanfahrt der ZNA, Wirtschaftshof, Besucher- und Mitarbeiterparkplatz, Parkhaus. Laternen und Bäume stehen automatisch entlang der Wege, fahrende Autos und Busse auf den Straßen.', li: ['„Raster“ in der Ansichtsleiste: 10-m-Planungsraster', 'Doppelklick ins Gelände: dorthin fliegen'], go: () => { HSS.s3.select(null); HSS.s3.animateCam(V3(-120, 45, 200), V3(-40, 0, 110), 1500); } },
  { t: 'Etagen wie im Puppenhaus', p: 'Bettenhaus Nord, 4. OG: Kardiologie mit Patientenzimmern, Nasszellen, Stützpunkt, Arbeitsräumen rein/unrein und Aufzugskern. Mit den Etagentasten links (oder Bild↑/↓) wechseln Sie die Etage, die Kamera geht mit.', go: () => { HSS.s3.select(null); HSS.view.cut = 'halb'; UI.refreshViewbar(); HSS.nav.setFloor(4); HSS.s3.animateCam(V3(-30, 46, 30), V3(-2, 21, -19), 1300); } },
  { t: 'Stationsrundgang – wie im Spiel', p: 'Der Rundgang führt in Augenhöhe durch die Kardiologie und anschließend per Aufzug zur Intensivstation. Jeder Raum wird mit Aufgabe, Ausstattung und Logistik erklärt. „Weiter“ in der Rundgangskarte, Esc beendet.', go: () => { HSS.tour.start(stIds('Kardiologie 4N', 'Intensivstation ITS 1'), { allRooms: false }); } },
  { t: 'OP-Zentrum und Intensivstation', p: 'Sockel 1. OG: sechs OP-Säle inkl. Hybrid-OP, Narkoseeinleitung, Aufwachraum, Sterilgutlager; an der Südfassade die Intensivstation mit 14 Einzelplätzen. Im EG: ZNA mit Schockraum, Radiologie (CT, MRT), Labor und Apotheke.', go: () => { HSS.tour.end(); HSS.nav.setFloor(1); HSS.s3.animateCam(V3(-20, 55, 60), V3(0, 4, 0), 1300); } },
  { t: 'Untergeschoss, Tunnel und AWT', p: 'Im UG: ZSVA, Bettenzentrale, Umkleiden, Pathologie. Versorgungstunnel und AWT-Trasse verbinden das Logistikzentrum mit dem Behandlungszentrum; AWT-Vertikalförderer bringen Container in jede Etage der Bettenhäuser.', go: () => { HSS.nav.setFloor(-1); HSS.s3.animateCam(V3(90, 40, 30), V3(25, -4, -40), 1400); } },
  { t: 'Stationsplaner mit Rechenweg', p: 'Typ, Fallzahlen (Jahr oder Monat) und Etagen wählen – jeder Rechenschritt wird als Frage, Erklärung, Rechnung und Ergebnis gezeigt, mit Quellen (Destatis, Landesvorgaben, Ministerium RLP, DIN, DIVI).', go: () => { HSS.nav.setFloor(null); UI.stInp = { typ: 'innere', name: 'Innere Medizin (Planung)', art: 'stationaer', faelleStat: 2200, monatlich: false, monate: Array(12).fill(180), sel: [{ part: 'P1', floors: [2], half: false }] }; UI.setWS('station'); HSS.s3.animateCam(V3(-190, 55, 40), V3(-130, 8, -10), 1200); } },
  { t: 'Flüsse und Regeln', p: 'Standardflüsse für alle 20 Stationen: Speisen, Wäsche, Arzneimittel, Modulversorgung, Sterilgut, Abfall, Proben, Patienten, Betten, Anlieferung, Entsorgung, Post, Personal, Besucher. Die Bettenhäuser werden per AWT versorgt; nach unreinen Fahrten 2 min Waschanlage.', go: () => { UI.flowTab = 'fluesse'; const f = HSS.project().flows.find(x => x.transport === 't_awt'); UI.flowSel = f?.id; UI.setWS('fluesse'); if (f) UI.showRoute(f.id, true); } },
  { t: 'Simulation und Hotspots', p: 'Die Tagessimulation rechnet alle Touren mit Bündelung, Aufzugswarteschlangen und Reinigungsfahrten. Heatmap um 07:00 Uhr; die Hotspot-Liste nennt Engpässe mit Uhrzeit.', go: () => { HSS.nav.setFloor(null); HSS.runSimulation(); HSS.player.setTime(420); UI.timeline.show(true); UI.netMode = 'heat'; $('#vNet').value = 'heat'; $('#tHeat').checked = true; UI.heatHour = 7; HSS.drawNet('heat', 7); UI.anTab = 'hotspots'; UI.setWS('analyse'); HSS.s3.animateCam(V3(-150, 130, 170), V3(0, 0, -10), 1300); } },
  { t: 'Begleitfahrt mit Aufzug', p: 'Ein AWT-Container fährt vom Logistikzentrum durch die Trasse und den Vertikalförderer hinauf auf die Station. Esc beendet.', go: () => { const sim = HSS.state.sim || HSS.runSimulation(); UI.timeline.show(true); const tr = sim.trips.find(t => t.mittel === 'awt' && t.track.some(s => s.lift && s.to > 3) && t.start > 400) || sim.trips.find(t => t.track.some(s => s.lift)); if (tr) { HSS.player.speed = 20; $('#tSpeed').value = '20'; HSS.fpv.follow(tr.id); } } },
  { t: 'Nacht und Beauty Shots', p: 'Abends: Straßen- und Wegeleuchten, beleuchtete Fenster. „📷 Beauty Shot“ speichert ein hochaufgelöstes Bild, „🚶 Begehen“ öffnet die freie Begehung.', go: () => { HSS.fpv.exit(); HSS.nav.setFloor(null); UI.netMode = 'aus'; $('#vNet').value = 'aus'; HSS.drawNet('aus'); HSS.s3.setSun(21.5); $('#vSun').value = 21.5; $('#vSunL').textContent = '21:30'; HSS.s3.animateCam(V3(-150, 60, 200), V3(-20, 8, 40), 1500); } },
  { t: 'Speichern und weiterarbeiten', p: 'Automatische Sicherung im Browser; „Speichern“ legt eine Projektdatei (.hss.json) ab – inklusive eigener Bibliotheksobjekte. „Öffnen“ lädt Dateien oder Projekte aus der Browser-Ablage zum Ergänzen.', go: () => { HSS.s3.setSun(14); $('#vSun').value = 14; $('#vSunL').textContent = '14:00'; HSS.s3.home(); } }
];
HSS.demo = {
  step: 0,
  start() {
    UI.toast('UNITY Hospital wird aufgebaut …', 1500);
    setTimeout(() => {
      const prj = HSS.buildDemo();
      HSS.load(prj, { demo: true, noAutosave: true });
      HSS.state.sim = null; UI.timeline.show(false);
      document.body.classList.add('demoon');
      $('#saveState').textContent = 'Demo'; $('#saveState').className = 'badge demo';
      this.step = 0; this.show();
    }, 30);
  },
  show() {
    const s = STEPS[this.step], el = $('#demoCard');
    el.hidden = false;
    el.innerHTML = `<div class="k">Demo-Tour · ${this.step + 1} / ${STEPS.length}</div><h3>${U.esc(s.t)}</h3><p>${U.esc(s.p)}</p>${s.li ? `<ul>${s.li.map(x => `<li>${U.esc(x)}</li>`).join('')}</ul>` : ''}<div class="bar"><i style="width:${(this.step + 1) / STEPS.length * 100}%"></i></div>
      <div class="row"><button id="dPrev" ${this.step ? '' : 'disabled'}>‹ Zurück</button><button class="primary" id="dNext">${this.step < STEPS.length - 1 ? 'Weiter ›' : 'Fertig'}</button><div class="sp"></div><button id="dEnd" title="Tour schließen, Demo frei erkunden">Frei erkunden</button></div>`;
    $('#dPrev').onclick = () => { this.step--; this.show(); };
    $('#dNext').onclick = () => { if (this.step < STEPS.length - 1) { this.step++; this.show(); } else this.end(); };
    $('#dEnd').onclick = () => this.end();
    try { s.go(); } catch (e) { console.error(e); }
  },
  end() { $('#demoCard').hidden = true; document.body.classList.remove('demoon'); HSS.fpv.exit(); UI.toast('Demo frei erkunden – Änderungen werden als eigenes Projekt gesichert'); }
};
})();
