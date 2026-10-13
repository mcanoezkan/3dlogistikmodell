/* =====================================================================
   HSS · demo.js – Demo-Modus „UNITY Hospital“
   Erzeugt einen vollständig ausgestatteten Campus mit allen Bausteinen und führt durch die Funktionen.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$;

const part = (o) => { const d = HSS.defaults.part(); const p = Object.assign(d, o); p.facade = Object.assign(HSS.defaults.part().facade, o.facade || {}); p.roof = Object.assign(HSS.defaults.part().roof, o.roof || {}); return p; };

HSS.buildDemo = () => {
  const prj = HSS.newProject('UNITY Hospital (Demo)');
  prj.meta.notes = 'Demo-Campus der Healthcare Simulation Suite. Alle Mengen, Zeiten und Kapazitäten sind Beispielwerte.';
  HSS.state.project = prj; // Hilfsfunktionen greifen auf das aktuelle Projekt zu
  prj.terrain = { size: 640, color: '#c5d3b2', tilt: { dir: 0, pct: 0 }, hills: [
    { x: -175, z: -125, h: 7, r: 75, plateau: true }, { x: 230, z: 170, h: -5, r: 110 }, { x: -250, z: 40, h: 5, r: 60 }, { x: 160, z: -170, h: 4, r: 70 }
  ] };
  const B = (id, name, kurz, color, parts) => { const b = { id, name, kurz, color, parts }; prj.buildings.push(b); return b; };
  // --- Gebäude ---
  const A1 = part({ id: 'A1', name: 'Bettenhaus', shape: 'rect', w: 86, d: 18, cornerRadius: 9, x: 0, z: -30, floors: 7, floorHeight: 3.6, basements: 1, basementHeight: 4.0, facade: { type: 'band', color: '#f2f3f5', accent: '#144477', glass: '#6b8ca6', axis: 1.35 }, roof: { plant: false } });
  const A3 = part({ id: 'A3', name: 'Funktionstrakt (OP · Diagnostik · ZNA)', shape: 'rect', w: 72, d: 40, cornerRadius: 2, x: 0, z: -1, floors: 3, floorHeight: 4.6, basements: 1, basementHeight: 4.0, facade: { type: 'paneel', color: '#eef0f2', accent: '#2D7694', glass: '#6b8ca6', axis: 1.5, windowRatio: 0.6 }, roof: { helipad: true, plant: false } });
  const A2 = part({ id: 'A2', name: 'Eingangshalle (Rundbau)', shape: 'rund', w: 34, d: 34, x: -50, z: 2, floors: 2, floorHeight: 5.2, basements: 0, facade: { type: 'glas', color: '#e9ecef', accent: '#144477', glass: '#7fa4bd', axis: 1.6 }, roof: { type: 'gruen', plant: false } });
  const A4 = part({ id: 'A4', name: 'Technikgeschoss (aufgesetzt)', shape: 'rect', w: 32, d: 16, cornerRadius: 3, x: -20, z: -30, stackOn: 'A1', floors: 1, floorHeight: 4.2, basements: 0, facade: { type: 'raster', color: '#dfe3e7', accent: '#9aa3ad', glass: '#6b8ca6' }, roof: { plant: true } });
  B('bA', 'Haupthaus', 'A', '#144477', [A1, A3, A2, A4]);
  const B1 = part({ id: 'B1', name: 'Kinderklinik (Neubau)', shape: 'rect', w: 62, d: 22, cornerRadius: 9, x: 104, z: -22, floors: 5, floorHeight: 3.8, basements: 1, facade: { type: 'lamellen', color: '#f4f5f7', accent: '#e3e7eb', glass: '#7fa4bd', axis: 1.5 }, roof: { type: 'gruen', plant: true } });
  B('bB', 'Kinderklinik', 'B', '#0A967A', [B1]);
  const C1 = part({ id: 'C1', name: 'Atriumbau Geriatrie', shape: 'O', w: 52, d: 44, courtW: 22, courtD: 16, cornerRadius: 4, x: -118, z: -32, floors: 4, floorHeight: 3.7, basements: 1, facade: { type: 'raster', color: '#eceef0', accent: '#c4cad1', glass: '#6b8ca6', axis: 1.35 } });
  B('bC', 'Geriatriezentrum', 'C', '#2D7694', [C1]);
  const D1 = part({ id: 'D1', name: 'Ver- und Entsorgungszentrum', shape: 'L', w: 64, d: 42, legW: 26, legD: 18, x: 42, z: 82, floors: 2, floorHeight: 5.0, basements: 1, basementHeight: 4.0, facade: { type: 'paneel', color: '#e3e6ea', accent: '#891F5E', glass: '#6b8ca6', axis: 2.0, windowRatio: 0.45 } });
  B('bD', 'Logistikzentrum', 'D', '#891F5E', [D1]);
  const E1 = part({ id: 'E1', name: 'Verwaltung (Altbau)', shape: 'rect', w: 44, d: 15, x: -108, z: 62, rot: -8, floors: 3, floorHeight: 4.0, basements: 1, facade: { type: 'klinker', color: '#9c5a3c', accent: '#f4f1ea', glass: '#5d7489', axis: 1.6, windowRatio: 0.42 }, roof: { parapet: 1.2, plant: false } });
  B('bE', 'Verwaltung', 'E', '#d9531e', [E1]);
  const P1 = part({ id: 'P1', name: 'Parkhaus', shape: 'rect', w: 66, d: 32, x: -178, z: -128, rot: 4, floors: 4, floorHeight: 3.0, basements: 0, use: 'parkhaus', facade: { type: 'parkhaus', color: '#c9ced4', accent: '#2D7694', axis: 2.5 }, roof: { plant: false, parapet: 1.1 } });
  B('bP', 'Parkhaus', 'P', '#5a6573', [P1]);
  prj.bridges.push({ id: 'br1', name: 'Glasbrücke Bettenhaus – Kinderklinik', type: 'glas', a: { part: 'A1', floor: 1 }, b: { part: 'B1', floor: 1 }, width: 4.5, height: 3.6, levels: 2, offset: 0 });
  prj.bridges.push({ id: 'br2', name: 'Verbindungsgang Geriatrie', type: 'gebaeude', a: { part: 'C1', floor: 1 }, b: { part: 'A1', floor: 1 }, width: 4, height: 3.4, levels: 1, offset: 0, color: '#eceef0' });
  prj.bridges.push({ id: 'br3', name: 'Brücke Parkhaus', type: 'glas', a: { part: 'P1', floor: 2 }, b: { part: 'C1', floor: 2 }, width: 3.5, height: 3.2, levels: 1, offset: 0 });

  // --- Wege und Straßen ---
  const path = (kind, name, pts, extra = {}) => { const p = Object.assign(HSS.defaults.path(kind), { name, points: pts }, extra); prj.paths.push(p); return p; };
  path('strasse', 'Klinikstraße', [[-310, 138], [-200, 132], [-80, 122], [40, 128], [150, 136], [310, 118]], { traffic: 7 });
  path('strasse', 'Nordring', [[-310, -165], [-200, -165], [-110, -150], [-10, -100], [120, -96], [310, -70]], { traffic: 5 });
  path('strasse', 'Parkhauszufahrt', [[-150, -156], [-150, -138]], { traffic: 0, width: 6 });
  path('zufahrt', 'Wirtschaftshof / Anlieferung', [[118, 133], [96, 118], [70, 112], [44, 108]], { traffic: 2 });
  path('zufahrt', 'Liegendanfahrt ZNA', [[0, 125], [2, 70], [0, 30]], { traffic: 1 });
  path('zufahrt', 'Vorfahrt Haupteingang', [[-96, 124], [-86, 70], [-78, 30], [-74, 6]], { traffic: 2, width: 6 });
  path('weg', 'Campusweg Logistik', [[22, 24], [26, 42], [30, 60]]);
  path('weg', 'Campusweg Ost', [[44, -30], [70, -28], [72, -22]]);
  path('weg', 'Campusweg West', [[-94, -30], [-44, -30]]);
  path('gehweg', 'Fußweg Parkhaus (gebogen)', [[-160, -110], [-140, -70], [-110, -30], [-90, 0], [-68, 4]], { width: 2.6 });
  path('gehweg', 'Fußweg Haltestelle', [[-122, 126], [-110, 80], [-84, 30], [-67, 8]], { width: 2.4 });
  path('gehweg', 'Fußweg Verwaltung', [[-67, 12], [-82, 40], [-100, 54]], { width: 2.2 });
  path('gehweg', 'Rampe barrierefrei (6 %)', [[-58, 26], [-58, 46]], { width: 2.0, ramp: [0.0, 1.2] });
  path('gehweg', 'Parkweg', [[-55, 70], [-30, 82], [-5, 76], [8, 92]], { width: 2.0 });
  path('tunnel', 'Versorgungstunnel D – A', [[40, 66], [36, 40], [24, 16]], { y: -4.0, width: 3.6 });
  path('awt', 'AWT-Trasse Logistikzentrum – Bettenhaus', [[58, 74], [56, 50], [42, 22], [38, -12], [36, -26]], { y: -4.0 });

  // --- Flächen ---
  prj.areas.push({ id: 'ar1', kind: 'parkplatz', x: -186, z: 22, w: 72, d: 44, rot: 0, occupancy: 0.75 });
  prj.areas.push({ id: 'ar2', kind: 'parkplatz', x: 156, z: 52, w: 60, d: 36, rot: 0, occupancy: 0.85 });
  prj.areas.push({ id: 'ar3', kind: 'gruen', x: -28, z: 84, w: 54, d: 32, rot: 0, density: 1.1 });
  prj.areas.push({ id: 'ar4', kind: 'gruen', x: 112, z: -72, w: 70, d: 36, rot: 0, density: 0.9 });
  prj.areas.push({ id: 'ar5', kind: 'platz', x: -84, z: 18, w: 26, d: 34, rot: 0, color: '#d8d2c6' });
  prj.areas.push({ id: 'ar6', kind: 'wasser', x: -36, z: 104, w: 22, d: 10, rot: 0 });
  prj.areas.push({ id: 'ar7', kind: 'gruen', x: -118, z: -32, w: 21, d: 15, rot: 0, density: 0.6, color: '#a6c98a' });
  prj.areas.push({ id: 'ar8', kind: 'platz', x: 70, z: 112, w: 50, d: 14, rot: 0, color: '#bdbab3' });

  // --- Objekte ---
  const out = (lib, x, z, rot = 0, extra = {}) => { const o = Object.assign({ id: U.uid('obj'), lib, x, z, rot }, extra); prj.objects.push(o); return o; };
  const inn = (lib, partId, f, x, z, rot = 0, extra = {}) => { const o = Object.assign({ id: U.uid('obj'), lib, host: { part: partId, floor: f }, x, z, rot }, extra); prj.objects.push(o); return o; };
  // Allee, Laternen entlang der Klinikstraße
  for (let x = -290; x <= 290; x += 16) { const zr = 126 + Math.sin(x / 90) * 4; if (Math.abs(x - 0) < 10 || Math.abs(x + 92) < 10 || Math.abs(x - 115) < 10) continue; out(x % 32 === 0 ? 'gruen.baum.klein' : 'gruen.baum.laub', x, zr - 10.5, x * 7 % 360, { size: x % 32 === 0 ? undefined : { w: 6, d: 6, h: 9 } }); }
  for (let x = -280; x <= 290; x += 34) out('licht.strassenlaterne', x, 120 + Math.sin(x / 90) * 4 + 9, 180);
  for (let x = -280; x <= 290; x += 40) out('licht.strassenlaterne', x + 12, -150 + (x + 300) * 0.12 + 9, 180);
  // Haltestelle mit Bus
  out('aussen.haltestelle', -122, 134.5, 180); out('aussen.verkehrsschild', -112, 133, 0);
  // Haupteingang
  out('aussen.fahnenmast', -72, 24, 0); out('aussen.fahnenmast', -76, 26, 0); out('aussen.fahnenmast', -80, 28, 0);
  out('aussen.wegweiser', -70, 30, 160); out('aussen.fahrradstaender', -92, 6, 90); out('aussen.bank', -60, 40, 90); out('aussen.bank', -20, 72, 0); out('aussen.bank', -38, 92, 180);
  out('aussen.vordach', 0, 26, 0); out('kfz.rtw', -3, 31, 180); out('kfz.rtw', 4, 34, 175);
  for (const [x, z] of [[-100, -12], [-96, 2], [-92, 16], [-88, 30], [-52, 60], [-58, 74], [-12, 96]]) out('licht.mastleuchte', x, z);
  for (const [x, z] of [[-60, 30], [-60, 42], [-56, 50]]) out('licht.poller', x, z);
  for (const [x, z] of [[60, 120], [100, 98]]) out('licht.fluter', x, z, 200);
  out('aussen.muellstandplatz', 92, 92, 90, { role: 'abfall', name: 'Abfallsammelstelle', place: true });
  out('aussen.presscontainer', 104, 104, 90); out('aussen.trafo', -30, -62, 90);
  out('log.rampe', 42, 104.6, 180, { role: 'rampe', name: 'Warenannahme Rampe', place: true });
  out('kfz.lkw75', 44, 112, 180); out('kfz.lkw.kuehl', 30, 116, 172); out('kfz.entsorgung', 92, 112, 270);
  out('aussen.schranke', -150, -142, 90); out('aussen.parkscheinautomat', -142, -112, 0);
  for (let i = 0; i < 4; i++) out('aussen.ladesaeule', -214 + i * 6, -1, 0);
  for (const [x, z] of [[-130, 14], [-140, 40], [-150, -60], [140, -40], [160, -50], [60, 30], [-10, 50], [80, 50], [-200, -40], [190, 20]]) out('gruen.baum.laub', x, z, x % 360);
  for (const [x, z] of [[-72, -8], [-75, 14], [-30, 44], [24, 44], [62, 50]]) out('gruen.strauch', x, z);
  for (const [x, z] of [[-40, 30], [-46, 34], [52, 36]]) out('gruen.baum.saeule', x, z);
  // Personen außen
  out('person.besucher', -88, 22, 30); out('person.besucher2', -84, 40, 200); out('person.patient', -62, 34, 90); out('person.arzt', -20, 30, 270); out('person.rettungsdienst', -6, 28, 20); out('person.transportdienst', 50, 108, 0);
  out('kfz.fahrrad', -93, 4, 0); out('kfz.taxi', -76, 12, 170);

  // --- Erschließung (Aufzüge, Treppen) ---
  inn('erschl.aufzug.lasten', 'A1', 0, 33.5, 3.6, 180, { name: 'Versorgungsaufzug Bettenhaus', aufzug: { freigabe: ['rein', 'unrein'] } });
  inn('awt.lift', 'A1', -1, 37, -2.5, 0, { name: 'AWT-Vertikalförderer Bettenhaus' });
  inn('erschl.aufzug.bett', 'A3', 0, -26, -10, 0, { name: 'Bettenaufzug Funktionstrakt' }); inn('erschl.aufzug.lasten', 'A3', 0, 26, -12, 0, { name: 'Lastenaufzug OP/ZSVA (rein)', aufzug: { freigabe: ['rein'] } }); inn('erschl.aufzug.lasten', 'A3', 0, 30, -12, 0, { name: 'Lastenaufzug OP/ZSVA (unrein)', aufzug: { freigabe: ['unrein'] } }); inn('erschl.treppe', 'A3', 0, -32, 10, 0);
  inn('erschl.aufzug.glas', 'A2', 0, 6, -6, 0, { name: 'Panoramaaufzug Foyer' });
  inn('erschl.aufzug.bett', 'B1', 0, -26.5, -3.5, 90, { name: 'Bettenaufzug Kinderklinik' }); inn('erschl.treppe', 'B1', 0, 26.5, -1, 0);
  inn('erschl.aufzug.bett', 'C1', 0, 0, -18, 0, { name: 'Bettenaufzug Geriatrie' }); inn('erschl.treppe', 'C1', 0, 6, 18.5, 90);
  inn('erschl.aufzug.lasten', 'D1', 0, -12, -8, 0, { name: 'Lastenaufzug Logistik' });
  inn('erschl.aufzug.person', 'E1', 0, 16, 2, 0); inn('erschl.treppe', 'E1', 0, 19, -4, 90);
  inn('erschl.treppe', 'P1', 0, -30, -12, 0); inn('erschl.aufzug.person', 'P1', 0, -30, -4, 0, { name: 'Aufzug Parkhaus' });

  // --- Räume (Funktionsbereiche) ---
  const room = (pid, f, use, name, x, z, w, d, role, furn = []) => {
    const I = HSS.interior(pid, f, true, prj); const r = { id: U.uid('r'), use, name, x, z, w, d }; if (role) r.role = role; I.rooms.push(r);
    I.walls = HSS.dedupeWalls(I.walls.concat(HSS.roomWalls(r)));
    for (const [lib, fx, fz, rot = 0, ex = {}] of furn) inn(lib, pid, f, x + fx, z + fz, rot, ex);
    return r;
  };
  const door = (pid, f, x, z, w = 1.4, lib = 'erschl.tuer.bett') => { const I = HSS.interior(pid, f, true, prj); let best = null, bd = 0.6; for (const wl of I.walls) { const c = G.closestOnSeg([x, z], wl.a, wl.b); const d = G.dist(c.pt, [x, z]); if (d < bd) { bd = d; best = { wl, t: c.t }; } } if (best) I.doors.push({ id: U.uid('d'), wall: best.wl.id, t: best.t, w, lib }); };
  const grid = (lib, x0, z0, nx, nz, dx, dz, rot = 0) => { const a = []; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) a.push([lib, x0 + i * dx, z0 + j * dz, rot]); return a; };
  // A3 EG: Flur, ZNA, Radiologie, Labor, Apotheke
  room('A3', 0, 'flur', 'Magistrale', 0, 0, 68, 3.2);
  room('A3', 0, 'behandlung', 'Zentrale Notaufnahme', -14, 10.4, 30, 15.6, 'zna', [...grid('med.trage', -12, -2, 6, 1, 4.2, 0), ['stat.stuetzpunkt', 0, 5, 180], ['med.monitor.patient', -12, -5], ['med.defi.notfallwagen', 12, -5], ['person.arzt', 2, 2, 200], ['person.pflege', -4, 3, 100], ['person.patient', 8, 1, 0], ['med.roentgen.mobil', 12, 4]]);
  room('A3', 0, 'untersuchung', 'Radiologie (CT · MRT)', 18, 10.4, 30, 15.6, 'radiologie', [['med.ct', -8, 0, 90], ['med.mrt', 6, 0, 90], ['buero.schreibtisch', 12, -5.5, 0], ['person.arzt', 11, -4, 180]]);
  room('A3', 0, 'labor', 'Zentrallabor', -22, -10.4, 18, 15.6, 'labor', [['lab.analysator', -3, -5.5], ['lab.analysator', 2, -5.5], ['lab.zentrifuge', 6.5, -5.8], ['lab.werkbank', -4, 3, 180], ['lab.werkbank', 3, 3, 180], ['lab.sicherheitswerkbank', 7, 0, 270], ['log.rohrpost', -8.6, 0, 90, { role: 'labor' }], ['lab.blutkuehlschrank', -8.4, 5]]);
  room('A3', 0, 'medikamente', 'Krankenhausapotheke', -3, -10.4, 20, 15.6, 'apotheke', [['buero.regal', -8, -6.5], ['buero.regal', -6.5, -6.5], ['buero.regal', -5, -6.5], ['stat.medikamentenschrank', 6, -6.8], ['stat.kuehlschrank.med', 8, -6.8], ['lab.werkbank', 0, 2], ['log.apothekenbox', 3, 5], ['person.verwaltung', 0, 4, 180]]);
  room('A3', 0, 'warten', 'Wartebereich ZNA', 17, -10.4, 18, 15.6, null, [['warte.stuhlreihe', -4, -5], ['warte.stuhlreihe', 0, -5], ['warte.stuhlreihe', 4, -5], ['warte.empfang', 0, 4, 180], ['warte.pflanze', 7, -6], ['person.besucher', 2, 0, 30]]);
  for (const [x, z] of [[-14, 1.6], [18, 1.6], [-22, -1.6], [-3, -1.6], [17, -1.6]]) door('A3', 0, x, z, 1.8, 'erschl.tuer.schiebe');
  // A3 1.OG: OP-Bereich
  room('A3', 1, 'flur', 'OP-Flur (rein)', 0, 0, 68, 3.2);
  [-26, -9, 8, 25].forEach((x, i) => { room('A3', 1, 'op', 'OP-Saal ' + (i + 1), x, 10.5, 15, 15, i === 0 ? 'op' : null, [['med.op.tisch', 0, 0, 0], ['med.op.leuchte', 0, 0, 0, { y: 0 }], ['med.op.anaesthesie', -2.2, -2.5], ['med.op.instrumententisch', 2.6, 1.5, 90], ['med.op.mayo', 1.6, 0.5], ['med.op.pendel', -3.5, 1.5], ['med.op.endoskopieturm', 4.5, -3], ['person.op', 1.2, -0.6, 270], ['person.op', -1.2, 0.8, 90], ['person.op', 1.2, 1.6, 270]]); door('A3', 1, x, 2.9, 1.8, 'erschl.tuer.schiebe'); });
  room('A3', 1, 'rein', 'Sterilgutlager OP', -24, -10.4, 18, 15.6, null, [...grid('zsva.sterilgutregal', -7, -6.5, 6, 1, 2.6, 0), ['log.sterilgutwagen', 0, 2]]);
  room('A3', 1, 'unrein', 'Entsorgung OP (unrein)', -5, -10.4, 16, 15.6, null, [['log.instrumentenwagen.unrein', -3, 0], ['log.abfall240', 3, -5], ['log.abfall240', 4, -5], ['stat.waeschesammler', 0, -6.5]]);
  room('A3', 1, 'aufenthalt', 'Aufwachraum', 16, -10.4, 22, 15.6, null, [...grid('med.bett.intensiv', -8, -3, 5, 1, 4, 0), ['stat.stuetzpunkt', 0, 5, 180], ['person.pflege', 2, 3, 180]]);
  for (const [x, z] of [[-24, -1.6], [-5, -1.6], [16, -1.6]]) door('A3', 1, x, z, 1.5);
  // A3 UG: ZSVA, Technik
  room('A3', -1, 'flur', 'Versorgungsgang UG', 0, 0, 68, 3.6);
  room('A3', -1, 'logistik', 'ZSVA / AEMP', -14, 10.4, 34, 15.6, 'zsva', [['zsva.rdg', -14, -5.5], ['zsva.rdg', -12.8, -5.5], ['zsva.rdg', -11.6, -5.5], ['zsva.ultraschallbecken', -9, -5.8], ['zsva.packtisch', -2, 0], ['zsva.packtisch', 1, 0], ['zsva.packtisch', 4, 0], ['zsva.sterilisator', 10, -5.5], ['zsva.sterilisator', 12, -5.5], ['zsva.sterilisator', 14, -5.5], ['zsva.sterilgutregal', 10, 5.5], ['zsva.sterilgutregal', 12, 5.5], ['person.op', 1, 1.2, 180]]);
  room('A3', -1, 'technik', 'Haustechnik', 18, 10.4, 30, 15.6, null, [['aussen.trafo', 0, 0, 90]]);
  room('A3', -1, 'lager', 'Archiv/Lager', 0, -10.4, 50, 15.6, null, grid('buero.regal', -20, -6, 12, 2, 3.4, 4));
  door('A3', -1, -14, 1.8, 1.8, 'erschl.tuer.brandschutz'); door('A3', -1, 18, 1.8, 1.8, 'erschl.tuer.brandschutz'); door('A3', -1, 0, -1.8, 1.5);
  // A2 Foyer
  room('A2', 0, 'warten', 'Foyer / Information', 0, 0, 22, 22, 'haupteingang', [['warte.empfang', 0, -4, 0], ['warte.stuhlreihe', -6, 5], ['warte.stuhlreihe', -6, 7], ['warte.stuhlreihe', 6, 5], ['warte.stuhlreihe', 6, 7], ['warte.pflanze', -9, -8], ['warte.pflanze', 9, -8], ['warte.sofa', 0, 9, 180], ['person.verwaltung', 0, -5.2, 180], ['person.besucher', -3, 2, 40], ['person.besucher2', 3, 3, 300], ['person.patient.rollstuhl', 5, 0, 20], ['med.rollstuhl', -9, 1, 90]]);
  // D EG: Logistikzentrum
  room('D1', 0, 'flur', 'Logistikgang', -6, -2, 48, 4);
  room('D1', 0, 'logistik', 'Zentralküche', -18, -13, 24, 18, 'kueche', [['kueche.teekueche', -8, -8], ['kueche.teekueche', -2, -8], ['kueche.teekueche', 4, -8], ['lab.werkbank', -4, 0], ['lab.werkbank', 2, 0], ...grid('log.speisenwagen', -9, 6, 6, 1, 1.6, 0), ['person.verwaltung', 0, 2, 0]]);
  room('D1', 0, 'lager', 'Zentrallager', 8, -13, 26, 18, 'zentrallager', [...grid('log.hochregal', -9, -6, 4, 2, 3.2, 6), ...grid('log.modulwagen', 6, 4, 4, 1, 1.1, 0), ['log.hubwagen', 0, 4, 90], ['log.palette', -2, 6]]);
  room('D1', 0, 'logistik', 'Wäscheversorgung', -18, 9, 24, 14, 'waescherei', [...grid('log.waeschewagen.rein', -8, -4, 6, 1, 1.4, 0), ...grid('log.waeschewagen.unrein', -6, 3, 5, 1, 1.2, 0)]);
  room('D1', 0, 'logistik', 'Bettenzentrale', 6, 9, 22, 14, 'bettenzentrale', [['hyg.bettenaufbereitung', -6, 0, 90], ['med.bett.pflege', 2, -3, 90], ['med.bett.pflege', 2, 0, 90], ['med.bett.pflege', 2, 3, 90], ['log.bettenschieber', 7, 0]]);
  for (const [x, z] of [[-18, -4], [8, -4], [-18, 0], [6, 0]]) door('D1', 0, x, z, 2.0, 'erschl.tuer.schiebe');
  // D UG: AWT-Bahnhof
  room('D1', -1, 'awt', 'AWT-Bahnhof', 2, -2, 50, 30, null, [['awt.station', 14, -6, 0, { name: 'AWT-Station Küche/Lager (Versand)', place: true }], ['awt.station', 14, 2, 0, { name: 'AWT-Station Entsorgung (Empfang)', place: true }], ['awt.waschanlage', 6, 8, 90, { name: 'AWT-Containerwaschanlage', place: true }], ['awt.ladestation', -4, 10], ['awt.ladestation', -2, 10], ['awt.ladestation', 0, 10], ['awt.puffer', -12, -6], ['awt.puffer', -12, 4], ['awt.leitstand', -18, 10, 180], ['awt.fahrzeug', 2, -4, 90], ['awt.container', -1, -4], ['awt.brandschutztor', 22, -2, 90], ['person.transportdienst', -18, 8.5, 0]]);
  // E Verwaltung
  room('E1', 0, 'buero', 'Verwaltung / Poststelle', -6, 0, 26, 13, 'verwaltung', [['buero.schreibtisch', -8, -3], ['buero.stuhl', -8, -2.2], ['buero.schreibtisch', -3, -3], ['buero.stuhl', -3, -2.2], ['buero.besprechung', 5, 2], ['buero.aktenschrank', -11, 4]]);

  // --- Stationen über den Stationsplaner ---
  const station = (name, typ, faelle, sel, opts = {}) => { const inp = Object.assign({ typ, name, art: 'stationaer', faelleStat: faelle, sel }, opts.inp || {}); const calc = HSS.stationCalc(inp); return HSS.generateStation(inp, calc, Object.assign({ furnish: true, replace: false, reserveStart: 11, reserveEnd: 11, core: 'force' }, opts)); };
  station('Intensivstation ITS 1', 'intensiv', 1750, [{ part: 'A1', floors: [1], half: false }]);
  station('Innere Medizin 2A', 'innere', 1850, [{ part: 'A1', floors: [2], half: false }]);
  station('Allgemeinchirurgie 3A', 'chirurgie', 1850, [{ part: 'A1', floors: [3], half: false }]);
  station('Kardiologie 4A', 'kardio', 2000, [{ part: 'A1', floors: [4], half: false }]);
  station('Onkologie 5A', 'onko', 1250, [{ part: 'A1', floors: [5], half: false }]);
  station('Neurologie 6A', 'neuro', 1500, [{ part: 'A1', floors: [6], half: false }]);
  station('Pädiatrie B2', 'paed', 1900, [{ part: 'B1', floors: [2], half: false }], { reserveStart: 9, reserveEnd: 9, core: false });
  station('Kinderchirurgie B3', 'paed', 1700, [{ part: 'B1', floors: [3], half: false }], { reserveStart: 9, reserveEnd: 9, core: false, inp: { name: 'Kinderchirurgie B3' } });
  station('Geriatrie C1', 'geriatrie', 520, [{ part: 'C1', floors: [1], half: false }], { reserveStart: 0, reserveEnd: 0, core: true });
  station('Geriatrie C2', 'geriatrie', 520, [{ part: 'C1', floors: [2], half: false }], { reserveStart: 0, reserveEnd: 0, core: true });
  station('Ambulanz & Tagesklinik B1', 'tagesklinik', 0, [{ part: 'B1', floors: [1], half: true }], { reserveStart: 9, reserveEnd: 0, core: false, inp: { art: 'ambulant', faelleAmb: 1400 } });
  // AWT-Stationen auf den Etagen des Bettenhauses (am AWT-Vertikalförderer)
  for (let f = 1; f <= 6; f++) inn('awt.station', 'A1', f, 35.5, 3.2, 180, { name: 'AWT-Station Bettenhaus ' + HSS.floorName(f), place: true });
  // Patienten und Personal auf den Stationen
  const ws = prj.stations;
  for (const st of ws) {
    const beds = prj.objects.filter(o => o.station === st.id && (o.lib === 'med.bett.pflege' || o.lib === 'med.bett.intensiv'));
    beds.forEach((b, i) => { if (i % 3 === 0) b.lib = 'person.patient.bett'; });
    const sp = prj.objects.find(o => o.station === st.id && o.lib === 'stat.stuetzpunkt');
    if (sp) { inn('person.pflege', sp.host.part, sp.host.floor, sp.x + 0.6, sp.z + 1.4, sp.rot + 180); inn('person.arzt', sp.host.part, sp.host.floor, sp.x - 1.2, sp.z + 1.8, sp.rot + 150); }
  }
  // Externe Orte
  prj.places.push({ id: 'ext1', name: 'Großhandel / Lieferanten', role: 'extern', x: 305, z: 112, anfahrtM: 15000 });
  prj.places.push({ id: 'ext2', name: 'Entsorgungsfachbetrieb', role: 'extern', x: -305, z: 140, anfahrtM: 9000 });

  // --- Stammdaten, Flüsse, Regeln ---
  HSS.ensureStammdaten(prj);
  for (const t of prj.transports) if (t.id === 't_awt') t.anzahl = null;
  const all = HSS.STANDARDFLUESSE.map(t => t.id);
  const { flows } = HSS.applyTemplates(all);
  // Bettenhaus A1: Ver-/Entsorgung über AWT (Station am Vertikalförderer)
  const placeList = HSS.places(prj);
  const awtSend = placeList.find(p => p.name.includes('AWT-Station Küche')), awtRecv = placeList.find(p => p.name.includes('AWT-Station Entsorgung'));
  const awtFloor = f => placeList.find(p => p.name.endsWith('AWT-Station Bettenhaus ' + HSS.floorName(f)));
  for (const fl of flows) {
    const st = prj.stations.find(s => fl.name.endsWith('· ' + s.name)); if (!st || st.sel[0].part !== 'A1') continue;
    if (!['speisen', 'geschirr', 'waesche_r', 'waesche_u', 'abfall', 'modul'].includes(fl.template)) continue;
    const ap = awtFloor(st.sel[0].floors[0]); if (!ap) continue;
    const inbound = ['speisen', 'waesche_r', 'modul'].includes(fl.template);
    fl.von = inbound ? awtSend.id : ap.id; fl.nach = inbound ? ap.id : awtRecv.id; fl.transport = 't_awt'; fl.name += ' (AWT)';
  }
  prj.flows = flows;
  const wash = placeList.find(p => p.role === 'waschanlage');
  prj.rules.push({ id: 'rule1', typ: 'reinigungNachUnrein', transport: 't_awt', ziel: wash.id, dauerMin: 2, aktiv: true });
  prj.rules.push({ id: 'rule2', typ: 'reinigungNachN', transport: 't_awt', ziel: wash.id, dauerMin: 2, n: 5, aktiv: true });
  prj.cameras = [];
  return prj;
};

/* ---------- Geführte Demo ---------- */
const V3 = (x, y, z) => new window.THREEX.THREE.Vector3(x, y, z);
const STEPS = [
  { t: 'Willkommen im UNITY Hospital', p: 'Ein vollständig ausgestatteter Demo-Campus: 7 Gebäude, 3 Brücken, Parkhaus, Straßen mit Verkehr, AWT-Tunnel und 11 Stationen – alles mit den Bausteinen der Suite erstellt.', li: ['Linke Leiste: Arbeitsschritte von Gelände bis Analyse', 'Oben: Ebene, Schnitt, Tageszeit, Netz/Heatmap', 'Rechts: Inspektor für das gewählte Element'], go: () => { HSS.s3.setFloor(null); HSS.s3.setSun(10.5); UI.$('#vSun').value = 10.5; HSS.s3.animateCam(V3(-230, 170, 250), V3(0, 0, 0), 1400); } },
  { t: 'Gebäude aus Bausteinen', p: 'Bettenhaus mit vollrunden Enden (Eckradius 9 m) und Bandfassade, gläserner Rundbau als Eingangshalle, Funktionstrakt mit Paneelfassade und Hubschrauberlandeplatz, aufgesetztes Technikgeschoss.', li: ['Bauteil anklicken → Maße, Rundung, Geschosse, Fassade ändern', 'Andocken (nebeneinander) und Aufsetzen (übereinander)'], go: () => { HSS.s3.select({ kind: 'part', id: 'A1' }); HSS.s3.animateCam(V3(-95, 55, 75), V3(-5, 12, -12), 1300); } },
  { t: 'Brücken zwischen Gebäuden', p: 'Zweigeschossige Glasbrücke zur Kinderklinik, Gebäudebrücke mit Fenstern zur Geriatrie, Glasbrücke vom Parkhaus. Unterschiedliche Geschosshöhen werden als Rampe geführt; das Wegenetz nutzt die Brücken automatisch.', go: () => { HSS.s3.select({ kind: 'bridge', id: 'br1' }); HSS.s3.animateCam(V3(55, 26, 20), V3(58, 8, -26), 1300); } },
  { t: 'Topographie, Wege, Verkehr', p: 'Parkhaus auf einer Geländekuppe, Gelände mit Steigungen, gebogene Fußwege, barrierefreie Rampe (6 %), Straßen mit fahrenden Autos und Linienbus mit Halt, Parkplätze mit automatischer Stellplatzeinteilung, Grünflächen und Beleuchtung.', go: () => { HSS.s3.select(null); HSS.s3.animateCam(V3(-250, 60, 70), V3(-150, 0, 40), 1500); } },
  { t: 'Etagen wie im Puppenhaus', p: 'Innenansicht der Inneren Medizin im 2. OG: Darüberliegende Geschosse sind ausgeblendet, Wände halbhoch geschnitten. Patientenzimmer mit Nasszelle, Betten, Versorgungsleisten; Stützpunkt, Arbeitsräume rein/unrein, Aufzüge.', li: ['Ansichtsleiste: „Wände voll“ für Beauty Shots', 'Arbeitsbereich „Etagen“: Räume, Wände, Türen planen'], go: () => { HSS.s3.select(null); HSS.view.cut = 'halb'; UI.refreshViewbar(); HSS.s3.setFloor(2); HSS.s3.animateCam(V3(-34, 34, 4), V3(-6, 7, -30), 1300); } },
  { t: 'OP-Bereich und Diagnostik', p: 'Funktionstrakt 1. OG: vier OP-Säle mit OP-Tisch, Leuchten, Anästhesie und Personal, Sterilgutlager und unreine Entsorgung. Im EG Radiologie mit CT und MRT, Labor, Apotheke und Notaufnahme.', go: () => { HSS.s3.setFloor(1); HSS.s3.animateCam(V3(-2, 40, 42), V3(0, 6, 4), 1300); } },
  { t: 'Untergeschoss und AWT-Anlage', p: 'Im UG wird das Gelände transparent: Versorgungstunnel und AWT-Trasse verbinden Logistikzentrum und Bettenhaus. Im AWT-Bahnhof: Sende-/Empfangsstationen, Containerwaschanlage, Ladeplätze, Pufferspeicher und Leitstand.', go: () => { HSS.s3.setFloor(-1); HSS.s3.animateCam(V3(96, 30, 112), V3(44, -4, 72), 1400); } },
  { t: 'Stationsplaner', p: 'Typ wählen, Fallzahlen (Jahr oder Monat) und Verweildauer eingeben, Gebäude und Etagen anklicken (auch halbe Etagen). Die Suite rechnet Betten nach Hill-Burton, Raumprogramm und Fläche – mit Rechenweg – und belegt den Grundriss.', go: () => { HSS.s3.setFloor(null); UI.stInp = { typ: 'innere', name: 'Innere 7A (Planung)', art: 'stationaer', faelleStat: 2200, monatlich: false, monate: Array(12).fill(180), sel: [{ part: 'C1', floors: [3], half: false }] }; UI.setWS('station'); HSS.s3.animateCam(V3(-180, 60, 30), V3(-118, 10, -32), 1200); } },
  { t: 'Flüsse und Regeln', p: '18 Standardflüsse wurden aus den Stationsbetten abgeleitet: Speisen, Wäsche, Arzneimittel, Sterilgut, Abfall, Proben, Patienten, Besucher u. a. Das Bettenhaus wird über die AWT versorgt; nach unreinen Fahrten fährt der Container 2 min in die Waschanlage, zusätzlich jede 5. Fahrt.', go: () => { UI.flowTab = 'fluesse'; const f = HSS.project().flows.find(x => x.transport === 't_awt'); UI.flowSel = f?.id; UI.setWS('fluesse'); if (f) UI.showRoute(f.id, true); } },
  { t: 'Simulation und Hotspots', p: 'Die Tagessimulation rechnet alle Touren mit Bündelung, Aufzugswarteschlangen und Reinigungsfahrten. Die Heatmap zeigt die Auslastung um 07:00 Uhr; die Hotspot-Liste nennt Engpässe mit Uhrzeit.', go: () => { HSS.s3.setFloor(null); const r = HSS.runSimulation(); HSS.player.setTime(420); UI.timeline.show(true); UI.netMode = 'heat'; UI.$('#vNet').value = 'heat'; UI.$('#tHeat').checked = true; UI.heatHour = 7; HSS.drawNet('heat', 7); UI.anTab = 'hotspots'; UI.setWS('analyse'); HSS.s3.animateCam(V3(-120, 120, 160), V3(0, 0, 0), 1300); } },
  { t: 'Ich-Perspektive mit Aufzugsfahrt', p: 'Begleiten Sie einen AWT-Container vom Logistikzentrum durch die Trasse und den Vertikalförderer hinauf auf die Station. Esc beendet die Begleitfahrt.', go: () => { const sim = HSS.state.sim || HSS.runSimulation(); UI.timeline.show(true); const tr = sim.trips.find(t => t.mittel === 'awt' && t.track.some(s => s.lift) && t.start > 400) || sim.trips.find(t => t.track.some(s => s.lift)); if (tr) { HSS.player.speed = 20; UI.$('#tSpeed').value = '20'; HSS.fpv.follow(tr.id); } } },
  { t: 'Nacht und Beauty Shots', p: 'Uhrzeit-Regler auf Abend: Straßen- und Wegeleuchten, beleuchtete Fenster. „📷 Beauty Shot“ speichert ein hochaufgelöstes Bild, „🚶 Rundgang“ öffnet die freie Begehung.', go: () => { HSS.fpv.exit(); HSS.s3.setFloor(null); UI.netMode = 'aus'; UI.$('#vNet').value = 'aus'; HSS.drawNet('aus'); HSS.s3.setSun(21.5); UI.$('#vSun').value = 21.5; UI.$('#vSunL').textContent = '21:30'; HSS.s3.animateCam(V3(-170, 70, 190), V3(-20, 5, 20), 1500); } },
  { t: 'Speichern und weiterarbeiten', p: 'Das Modell wird automatisch im Browser gesichert. „Speichern“ legt eine Projektdatei (.hss.json) ab – inklusive eigener Bibliotheksobjekte. „Öffnen“ lädt Dateien oder Projekte aus der Browser-Ablage zum Ergänzen.', go: () => { HSS.s3.setSun(14); UI.$('#vSun').value = 14; UI.$('#vSunL').textContent = '14:00'; HSS.s3.home(); } }
];
HSS.demo = {
  step: 0,
  start() {
    const prj = HSS.buildDemo();
    HSS.load(prj, { demo: true, noAutosave: true });
    HSS.state.sim = null; UI.timeline.show(false);
    document.body.classList.add('demoon');
    $('#saveState').textContent = 'Demo'; $('#saveState').className = 'badge demo';
    this.step = 0; this.show();
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
