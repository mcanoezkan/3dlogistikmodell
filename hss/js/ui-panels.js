/* =====================================================================
   HSS · ui-panels.js – Arbeitsbereiche (linkes Panel) und Zeichenwerkzeuge
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$, $$ = UI.$$;
const { THREE } = window.THREEX;
const opt = UI.opt;
const snap = (v, s = 0.5) => Math.round(v / s) * s;
const ghostMat = new THREE.MeshBasicMaterial({ color: '#0A967A', transparent: true, opacity: 0.45, depthWrite: false });
const lineMat = new THREE.LineBasicMaterial({ color: '#0A967A', depthTest: false });
const clearGhost = () => { const g = HSS.s3.layers.ghost; while (g.children.length) g.remove(g.children[0]); };
const polyline = (pts, y = 0.3) => { const g = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], (p[2] ?? HSS.terrainH(p[0], p[1])) + y, p[1]))); const l = new THREE.Line(g, lineMat); l.renderOrder = 20; return l; };
const readonly = () => { if (HSS.state.demoReadonly) { UI.toast('Demo ist schreibgeschützt – „Als eigenes Projekt bearbeiten“ wählen.'); return true; } return false; };

/* =================== Werkzeuge =================== */
const T = HSS.tools = {};
T.placeObject = (lib, opts = {}) => {
  if (readonly()) return;
  const d = HSS.library.get(lib); if (!d) return;
  let rot = opts.rot || 0, last = null;
  const ghost = HSS.library.build(lib, null, { material: ghostMat, noShadow: true });
  HSS.s3.setTool({
    name: 'place', lib,
    move(ev) {
      const gp = HSS.s3.groundPoint(ev); if (!gp) return;
      if (!ghost.parent) HSS.s3.layers.ghost.add(ghost);
      let x = snap(gp.x, gp.host ? 0.05 : 0.25), z = snap(gp.z, gp.host ? 0.05 : 0.25), r = rot, y = gp.y;
      // Wandmontage: an nächste Innenwand andocken
      if (gp.host && d.anchor === 'wand') {
        const I = HSS.interior(gp.host.part, gp.host.floor); let best = null, bd = 1.2;
        for (const w of I?.walls || []) { const c = G.closestOnSeg(gp.loc, w.a, w.b); const dd = G.dist(c.pt, gp.loc); if (dd < bd) { bd = dd; best = { w, c }; } }
        if (best) { const w = best.w, a = Math.atan2(w.b[1] - w.a[1], w.b[0] - w.a[0]); let nx = -Math.sin(a), nz = Math.cos(a); if ((gp.loc[0] - best.c.pt[0]) * nx + (gp.loc[1] - best.c.pt[1]) * nz < 0) { nx = -nx; nz = -nz; } const off = (w.t || 0.15) / 2 + d.size.d / 2; const lp = [best.c.pt[0] + nx * off, best.c.pt[1] + nz * off]; const wp = HSS.toWorld(gp.part, lp); x = wp[0]; z = wp[1]; r = Math.round(-U.deg(Math.atan2(nx, nz)) + (gp.part.rot || 0)); }
      }
      ghost.position.set(x, y, z); ghost.rotation.y = -U.rad(r);
      last = { x, z, y, host: gp.host, part: gp.part, r };
      UI.hint(`<b>${U.esc(d.name)}</b> · Klick: setzen (Umschalt+Klick: mehrere) · <b>R</b>: drehen (90°, mit Umschalt 15°) · <b>Esc</b>: abbrechen${gp.host ? ' · auf ' + HSS.floorName(HSS.view.floor) : ' · Außenbereich'}`);
    },
    key(ev) { if (ev.key.toLowerCase() === 'r') { rot = (rot + (ev.shiftKey ? 15 : 90)) % 360; return true; } },
    click(ev) {
      if (!last) return;
      const o = { id: U.uid('obj'), lib, rot: last.r, x: last.x, z: last.z };
      if (last.host) { const loc = HSS.toLocal(last.part, [last.x, last.z]); o.x = Math.round(loc[0] * 100) / 100; o.z = Math.round(loc[1] * 100) / 100; o.host = last.host; o.rot = (last.r - (last.part.rot || 0) + 360) % 360; }
      if (d.logistik?.rolle && !['tuer', 'fahrzeug'].includes(d.logistik.rolle)) o.place = true;
      if (!opts.multi && !ev.shiftKey) HSS.manip?.mark();
      HSS.change('Objekt platzieren', prj => prj.objects.push(o), { scope: 'objects' });
      // wie im Spiel: ein Objekt setzen, danach ist es gewählt (✓ / ✗); mit Umschalt weitere setzen
      if (!opts.multi && !ev.shiftKey) { HSS.s3.setTool(null); UI.hint(null); HSS.s3.select({ kind: 'object', id: o.id }); }
    },
    cancel() { UI.hint(null); }
  });
  UI.hint(`<b>${U.esc(d.name)}</b> · in die Szene klicken zum Setzen · Esc: fertig`);
};
T.drawPath = (kind, continueId) => {
  if (readonly()) return;
  const prj = HSS.project(); const ex = continueId ? U.byId(prj.paths, continueId) : null;
  const pts = ex ? ex.points.map(p => p.slice()) : [];
  kind = ex ? ex.kind : kind;
  const under = kind === 'tunnel' || kind === 'awt';
  let cur = null;
  const redraw = () => { clearGhost(); if (pts.length || cur) { const all = cur ? pts.concat([cur]) : pts; const L = polyline(all.map(p => under ? [p[0], p[1], -4] : p)); HSS.s3.layers.ghost.add(L); } };
  const finish = () => {
    if (pts.length < 2) { HSS.s3.setTool(null); return; }
    let id;
    HSS.change(ex ? 'Weg verlängern' : 'Weg zeichnen', p => { if (ex) U.byId(p.paths, ex.id).points = pts; else { const n = HSS.defaults.path(kind); n.points = pts; id = n.id; const same = p.paths.filter(q => q.kind === kind).length; if (same) n.name += ' ' + (same + 1); p.paths.push(n); } }, { scope: 'outdoor' });
    HSS.s3.setTool(null); HSS.s3.select({ kind: 'path', id: ex ? ex.id : id });
  };
  HSS.s3.setTool({
    name: 'path',
    move(ev) { const gp = HSS.s3.groundPoint(ev); if (!gp) return; cur = [snap(gp.x), snap(gp.z)]; if (ev.shiftKey && pts.length) { const l = pts[pts.length - 1], dx = cur[0] - l[0], dz = cur[1] - l[1]; if (Math.abs(dx) > Math.abs(dz)) cur[1] = l[1]; else cur[0] = l[0]; } redraw(); },
    click() { if (cur) { pts.push(cur.slice()); redraw(); UI.hint(`<b>${HSS.WEGARTEN[kind].name}</b> · ${pts.length} Punkte · ${U.fmt(G.polylineLength(pts), 1)} m · Doppelklick/Enter: fertig · Rücktaste: Punkt zurück · Umschalt: rechtwinklig · Esc: abbrechen`); } },
    dbl() { finish(); },
    key(ev) { if (ev.key === 'Enter') { finish(); return true; } if (ev.key === 'Backspace') { pts.pop(); redraw(); return true; } },
    cancel() { clearGhost(); UI.hint(null); }
  });
  UI.hint(`<b>${HSS.WEGARTEN[kind].name}</b> zeichnen · Punkte ins Gelände klicken · Kurven werden automatisch geglättet${under ? ' · liegt unterirdisch (Höhe im Inspektor)' : ''}`);
};
T.drawArea = (kind) => {
  if (readonly()) return;
  let a = null, b = null;
  const redraw = () => { clearGhost(); if (!a || !b) return; const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]); HSS.s3.layers.ghost.add(polyline([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]])); UI.hint(`${HSS.FLAECHEN[kind]}: ${U.fmt(x1 - x0, 1)} × ${U.fmt(z1 - z0, 1)} m${kind === 'parkplatz' ? ' · ca. ' + HSS.parkingLayout({ w: x1 - x0, d: z1 - z0 }).stalls.length + ' Stellplätze' : ''}`); };
  HSS.s3.setTool({
    name: 'area',
    down(ev) { if (ev.button !== 0) return; const gp = HSS.s3.groundPoint(ev); if (!gp) return; a = [snap(gp.x), snap(gp.z)]; b = a.slice(); HSS.s3.controls.enabled = false; },
    move(ev) { if (!a) return; const gp = HSS.s3.groundPoint(ev); if (!gp) return; b = [snap(gp.x), snap(gp.z)]; redraw(); },
    up() {
      HSS.s3.controls.enabled = true; if (!a || !b) return;
      const w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
      if (w > 2 && d > 2) { const ar = { id: U.uid('area'), kind, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, w, d, rot: 0 }; HSS.change('Fläche anlegen', p => p.areas.push(ar), { scope: 'outdoor' }); HSS.s3.setTool(null); HSS.s3.select({ kind: 'area', id: ar.id }); }
      a = b = null; clearGhost();
    },
    click() {}, cancel() { HSS.s3.controls.enabled = true; clearGhost(); UI.hint(null); }
  });
  UI.hint(`<b>${HSS.FLAECHEN[kind]}</b>: Rechteck mit gedrückter Maustaste aufziehen`);
};
// Fläche in Standardgröße setzen (für Ziehen aus dem Panel); Größe danach an den Griffen ändern
const AREA_STD = { parkplatz: [48, 32], gruen: [40, 30], platz: [30, 20], wasser: [24, 16] };
T.placeArea = (kind) => {
  if (readonly()) return;
  const [w, d] = AREA_STD[kind] || [30, 20];
  HSS.s3.setTool({
    name: 'areaPlace',
    move(ev) { const gp = HSS.s3.groundPoint(ev); if (!gp) return; this.c = [snap(gp.x, 1), snap(gp.z, 1)]; clearGhost(); const [x, z] = this.c; HSS.s3.layers.ghost.add(polyline([[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2], [x - w / 2, z - d / 2]])); UI.hint(`${HSS.FLAECHEN[kind]} ${w} × ${d} m · loslassen/klicken zum Setzen`); },
    click() { if (!this.c) return; const ar = { id: U.uid('area'), kind, x: this.c[0], z: this.c[1], w, d, rot: 0 }; HSS.manip?.mark(); HSS.change('Fläche anlegen', p => p.areas.push(ar), { scope: 'outdoor' }); HSS.s3.setTool(null); UI.hint(null); HSS.s3.select({ kind: 'area', id: ar.id }); },
    cancel() { clearGhost(); UI.hint(null); }
  });
};
HSS.PRESETS = {
  bettenhaus: { name: 'Bettenhaus', info: 'Riegel 64 × 17 m, 6 Geschosse, Bandfassade', p: { shape: 'rect', w: 64, d: 17, floors: 6, floorHeight: 3.6, basements: 1, facade: { type: 'band', color: '#eef0f2', accent: '#144477', glass: '#6f8fa8', axis: 1.35, windowRatio: 0.55 } } },
  modern: { name: 'Neubau, runde Ecken', info: '72 × 22 m, R = 8 m, Glas + Lamellen', p: { shape: 'rect', w: 72, d: 22, cornerRadius: 8, floors: 7, floorHeight: 3.8, basements: 1, facade: { type: 'lamellen', color: '#f4f5f7', accent: '#d9dde2', glass: '#7fa4bd', axis: 1.5, windowRatio: 0.7 } } },
  rundbau: { name: 'Rundbau', info: 'Ø 38 m, Vorhangfassade', p: { shape: 'rund', w: 38, d: 38, floors: 5, floorHeight: 4.0, basements: 1, facade: { type: 'glas', color: '#e9ecef', accent: '#144477', glass: '#6f93ad', axis: 1.5 } } },
  atrium: { name: 'Atriumbau', info: '50 × 42 m mit Innenhof', p: { shape: 'O', w: 50, d: 42, courtW: 22, courtD: 16, cornerRadius: 3, floors: 4, floorHeight: 3.8, basements: 1, facade: { type: 'raster', color: '#e9ecef', accent: '#c9ced4', glass: '#6f8fa8', axis: 1.35 } } },
  funktion: { name: 'Funktionsbau (OP/Diagnostik)', info: '56 × 34 m, 3 Geschosse à 4,6 m, Paneele', p: { shape: 'rect', w: 56, d: 34, floors: 3, floorHeight: 4.6, basements: 1, facade: { type: 'paneel', color: '#eef0f2', accent: '#2D7694', glass: '#6f8fa8', axis: 1.5, windowRatio: 0.6 } } },
  lform: { name: 'L-Baukörper', info: '52 × 40 m, Lochfassade', p: { shape: 'L', w: 52, d: 40, legW: 16, legD: 22, floors: 4, floorHeight: 3.6, basements: 1, facade: { type: 'loch', color: '#f1ede4', accent: '#8d6e63', glass: '#6f8fa8', axis: 1.35, windowRatio: 0.45 } } },
  ubau: { name: 'U-Baukörper', info: '60 × 36 m, offener Hof', p: { shape: 'U', w: 60, d: 36, courtW: 26, courtD: 18, floors: 4, floorHeight: 3.6, basements: 1, facade: { type: 'band', color: '#eef0f2', accent: '#0A967A', glass: '#6f8fa8', axis: 1.35 } } },
  altbau: { name: 'Altbau (Klinker)', info: '42 × 15 m, 3 Geschosse', p: { shape: 'rect', w: 42, d: 15, floors: 3, floorHeight: 4.0, basements: 1, facade: { type: 'klinker', color: '#9c5a3c', accent: '#f4f1ea', glass: '#5d7489', axis: 1.6, windowRatio: 0.42 }, roof: { type: 'flach', parapet: 1.2, plant: false } } },
  hochhaus: { name: 'Hochhaus', info: '32 × 32 m, R = 6 m, 12 Geschosse', p: { shape: 'rect', w: 32, d: 32, cornerRadius: 6, floors: 12, floorHeight: 3.6, basements: 2, facade: { type: 'glas', color: '#e9ecef', accent: '#144477', glass: '#5f86a3', axis: 1.5 }, roof: { type: 'flach', parapet: 1.0, plant: true, helipad: true } } },
  parkhaus: { name: 'Parkhaus', info: '64 × 32 m, 4 Parkebenen', p: { shape: 'rect', w: 64, d: 32, floors: 4, floorHeight: 3.0, basements: 0, use: 'parkhaus', facade: { type: 'parkhaus', color: '#c9ced4', accent: '#2D7694', glass: '#6f8fa8', axis: 2.5 }, roof: { type: 'flach', parapet: 1.1, plant: false } } }
};
T.addBuilding = (preset) => {
  if (readonly()) return;
  const P = HSS.PRESETS[preset];
  const ghost = new THREE.Group();
  HSS.s3.setTool({
    name: 'building',
    move(ev) {
      const gp = HSS.s3.groundPoint(ev); if (!gp) return;
      const pt = Object.assign(HSS.defaults.part(), U.clone(P.p), { x: snap(gp.x, 1), z: snap(gp.z, 1) }); this.pt = pt;
      // halbtransparenter Baukörper folgt der Maus
      if (!this.mass) { const loc = HSS.partFootprintLocal(pt), H = pt.floors * pt.floorHeight; this.mass = new THREE.Group(); const m = new THREE.Mesh(HSS.slabGeo(loc.outer, loc.holes, 0, H), ghostMat); this.mass.add(m); const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), lineMat); e.renderOrder = 20; this.mass.add(e); }
      if (!this.mass.parent) HSS.s3.layers.ghost.add(this.mass);
      this.mass.position.set(pt.x, HSS.terrainH(pt.x, pt.z), pt.z);
      UI.hint(`<b>${P.name}</b> · ${U.fmt(pt.w)} × ${U.fmt(pt.d)} m · ${pt.floors} Geschosse · klicken/loslassen zum Setzen · Esc: abbrechen`);
    },
    click() {
      if (!this.pt) return;
      const prj = HSS.project(), letters = 'ABCDEFGHJKLMNPRSTUVWXYZ', used = new Set(prj.buildings.map(b => b.kurz));
      const kurz = [...letters].find(l => !used.has(l)) || 'X';
      const b = Object.assign(HSS.defaults.building(), { name: P.name + ' ' + kurz, kurz, color: ['#144477', '#0A967A', '#2D7694', '#891F5E', '#d9531e', '#6b2c82', '#e3ac0c'][prj.buildings.length % 7] });
      const pt = Object.assign(this.pt, { name: P.name }); pt.facade = Object.assign(HSS.defaults.part().facade, pt.facade); pt.roof = Object.assign(HSS.defaults.part().roof, pt.roof);
      b.parts.push(pt);
      HSS.manip?.mark();
      HSS.change('Gebäude anlegen', p => p.buildings.push(b));
      HSS.s3.setTool(null); UI.hint(null); HSS.s3.select({ kind: 'part', id: pt.id });
      UI.toast('Gebäude gesetzt – Griffe ziehen für Größe, Drehung und Geschosse · ✓ übernehmen · ✗ verwerfen', 4200);
    },
    cancel() { clearGhost(); UI.hint(null); }
  });
  UI.hint(`<b>${P.name}</b> · Lage im Gelände anklicken · Form, Größe und Fassade danach im Inspektor anpassen`);
};
T.hill = () => {
  if (readonly()) return;
  HSS.s3.setTool({ name: 'hill', click(ev) { const gp = HSS.s3.groundPoint(ev); if (!gp) return; let idx; HSS.change('Geländepunkt', p => { p.terrain.hills.push({ x: snap(gp.x, 1), z: snap(gp.z, 1), h: 4, r: 40, plateau: false }); idx = p.terrain.hills.length - 1; }); HSS.s3.setTool(null); HSS.s3.select({ kind: 'hill', idx, id: 'hill' + idx }); }, cancel() { UI.hint(null); } });
  UI.hint('Geländepunkt ins Gelände klicken · Höhe und Radius danach im Inspektor');
};
T.externalPlace = () => {
  if (readonly()) return;
  HSS.s3.setTool({ name: 'ext', click(ev) { const gp = HSS.s3.groundPoint(ev); if (!gp) return; HSS.change('Externer Ort', p => p.places.push({ id: U.uid('ext'), name: 'Extern ' + (p.places.length + 1), role: 'extern', x: snap(gp.x), z: snap(gp.z), anfahrtM: 8000 })); HSS.s3.setTool(null); UI.setWS('fluesse'); UI.flowTab = 'orte'; UI.renderPanel(); }, cancel() { UI.hint(null); } });
  UI.hint('Externen Ort (Lieferant, Entsorger, Wäscherei) an den Rand einer Straße klicken');
};
const needFloor = () => { if (HSS.view.floor === null) { UI.toast('Zuerst eine Etage wählen (Ebene oben oder „Innenansicht“).'); return true; } return false; };
const localSnap = (gp, s = 0.25) => [snap(gp.loc[0], s), snap(gp.loc[1], s)];
T.room = (use) => {
  if (readonly() || needFloor()) return;
  let a = null, b = null, host = null, part = null;
  const draw = () => { clearGhost(); if (!a || !b) return; const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]); const y = HSS.floorY(part, host.floor) + 0.2; HSS.s3.layers.ghost.add(polyline([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]].map(q => { const w = HSS.toWorld(part, q); return [w[0], w[1], y]; }), 0)); UI.hint(`${HSS.ROOMTYPES[use].name}: ${U.fmt(x1 - x0, 2)} × ${U.fmt(z1 - z0, 2)} m = ${U.fmt((x1 - x0) * (z1 - z0), 1)} m²`); };
  HSS.s3.setTool({
    name: 'room',
    down(ev) { if (ev.button !== 0) return; const gp = HSS.s3.groundPoint(ev); if (!gp?.host) return; host = gp.host; part = gp.part; a = localSnap(gp); b = a.slice(); HSS.s3.controls.enabled = false; },
    move(ev) { if (!a) return; const gp = HSS.s3.groundPoint(ev); if (!gp?.host || gp.host.part !== host.part) return; b = localSnap(gp); draw(); },
    up() {
      HSS.s3.controls.enabled = true; if (!a || !b) return;
      const w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
      if (w >= 1 && d >= 1) {
        const r = { id: U.uid('r'), use, name: HSS.ROOMTYPES[use].name, x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, w, d };
        HSS.change('Raum anlegen', p => { const I = HSS.interior(host.part, host.floor, true, p); I.rooms.push(r); I.walls = HSS.dedupeWalls(I.walls.concat(HSS.roomWalls(r))); });
      }
      a = b = null; clearGhost();
    },
    click() {}, cancel() { HSS.s3.controls.enabled = true; clearGhost(); UI.hint(null); }
  });
  UI.hint(`<b>${HSS.ROOMTYPES[use].name}</b>: Rechteck auf der Etage aufziehen (Raster 25 cm) · Esc: fertig`);
};
T.wall = () => {
  if (readonly() || needFloor()) return;
  let a = null, host = null, part = null, cur = null;
  const draw = () => { clearGhost(); if (!a || !cur) return; const y = HSS.floorY(part, host.floor) + 0.2; HSS.s3.layers.ghost.add(polyline([a, cur].map(q => { const w = HSS.toWorld(part, q); return [w[0], w[1], y]; }), 0)); };
  const snapEnd = (p, I) => { for (const w of I?.walls || []) for (const q of [w.a, w.b]) if (G.dist(p, q) < 0.4) return q.slice(); return p; };
  HSS.s3.setTool({
    name: 'wall',
    move(ev) { const gp = HSS.s3.groundPoint(ev); if (!gp?.host) return; if (!a) { host = gp.host; part = gp.part; } if (gp.host.part !== host.part) return; let p = localSnap(gp); p = snapEnd(p, HSS.interior(host.part, host.floor)); if (a && !ev.altKey) { const dx = p[0] - a[0], dz = p[1] - a[1], L = Math.hypot(dx, dz), ang = Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) * Math.PI / 4; p = [a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L].map(v => snap(v, 0.05)); } cur = p; draw(); if (a) UI.hint(`Wand ${U.fmt(G.dist(a, cur), 2)} m · Klick: Ende/weiter · Alt: freier Winkel · Esc: fertig`); },
    click() { if (!cur) return; if (!a) { a = cur.slice(); return; } if (G.dist(a, cur) < 0.2) return; const w = { id: U.uid('w'), a: a.slice(), b: cur.slice(), t: 0.15 }; HSS.change('Wand zeichnen', p => HSS.interior(host.part, host.floor, true, p).walls.push(w)); a = cur.slice(); },
    cancel() { clearGhost(); UI.hint(null); }
  });
  UI.hint('Wand zeichnen: Anfangspunkt klicken, dann Endpunkte · Winkel rasten in 45°-Schritten ein');
};
T.door = (width = 1.1, lib = 'erschl.tuer.1') => {
  if (readonly() || needFloor()) return;
  HSS.s3.setTool({
    name: 'door',
    move(ev) { const h = HSS.s3.pick(ev); HSS.s3.renderer.domElement.style.cursor = h?.kind === 'wall' ? 'copy' : 'crosshair'; },
    click(ev) {
      const h = HSS.s3.pick(ev); if (h?.kind !== 'wall') return UI.toast('Auf eine Wand klicken');
      const P = HSS.findPart(h.part), I = HSS.interior(h.part, h.floor), w = I.walls.find(x => x.id === h.id);
      const loc = HSS.toLocal(P.part, [h.point.x, h.point.z]); const c = G.closestOnSeg(loc, w.a, w.b);
      HSS.change('Tür einsetzen', p => HSS.interior(h.part, h.floor, false, p).doors.push({ id: U.uid('d'), wall: w.id, t: c.t, w: width, lib }));
    },
    cancel() { UI.hint(null); }
  });
  UI.hint(`Tür ${U.fmt(width, 2)} m: auf eine Wand klicken (Ansicht „Wände voll“ zeigt Türblätter) · Esc: fertig`);
};

/* =================== Arbeitsbereiche =================== */
const W = UI.ws;
const tile = (attr, title, sub, on) => `<button class="tile ${on ? 'on' : ''}" ${attr}><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;

W.gelaende = { name: 'Gelände & Wege', short: 'Gelände & Wege', step: '1', lead: 'Topographie des Campus: Gelände mit Steigungen, Straßen und Wege in beliebiger Länge, Breite, Biegung und Neigung, Flächen, Verkehr und Außenausstattung.',
  render(el) {
    const prj = HSS.project(), t = prj.terrain;
    const geo = prj.meta.geo;
    el.innerHTML = `<h3>Standort</h3><div class="note">${geo?.lat ? `${U.esc(geo.adresse || prj.meta.standort?.id || '')} ${U.fmt(geo.lat, 5)}° N, ${U.fmt(geo.lon, 5)}° O · Nordwinkel ${U.fmt(geo.nord || 0)}°` : 'Noch nicht verortet.'}</div><div class="row" style="gap:6px;margin:6px 0 4px"><button id="gGeo">Standort verorten …</button>${prj.meta.standort ? '<button id="gUpd" title="Geometrie und Daten des Standortmodells neu übernehmen, eigene Änderungen bleiben">Standortmodell aktualisieren</button>' : ''}</div>
    <h3>Wege zeichnen</h3><div class="tiles">${Object.entries(HSS.WEGARTEN).map(([k, v]) => tile(`data-path="${k}"`, v.name, v.info)).join('')}</div>
    <h3>Flächen aufziehen</h3><div class="tiles">${tile('data-area="parkplatz"', 'Parkplatz', 'Stellplätze werden automatisch eingeteilt')}${tile('data-area="gruen"', 'Grünfläche', 'mit Bäumen und Sträuchern')}${tile('data-area="platz"', 'Platz / Pflaster', 'Vorfahrt, Plätze')}${tile('data-area="wasser"', 'Wasserfläche', 'Teich, Retention')}</div>
    <h3>Außenausstattung</h3><div class="tiles">${[['Außenanlagen/Grün', 'Bäume & Grün'], ['Außenanlagen/Beleuchtung', 'Laternen & Leuchten'], ['Außenanlagen/ÖPNV & Verkehr', 'Haltestelle, Schranke, Landeplatz'], ['Fahrzeuge', 'Autos, Busse, RTW, LKW'], ['Außenanlagen/Stadtmobiliar', 'Bänke, Fahrradständer'], ['Außenanlagen/Ver- und Entsorgung', 'Müllplatz, Presscontainer']].map(([c, n]) => tile(`data-cat="${c}"`, n, '')).join('')}</div>
    <div class="note">Parkhäuser finden Sie unter „Gebäude“ als Baustein.</div>
    <h3>Gelände</h3>
    <div class="fg tf">${UI.fNum('Neigung', 'tilt.pct', t.tilt?.pct ?? 0, { unit: '%', step: 0.5 })}${UI.fNum('Gefällerichtung', 'tilt.dir', t.tilt?.dir ?? 0, { unit: '°', step: 15 })}${UI.fNum('Geländegröße', 'size', t.size, { unit: 'm', step: 50, min: 200 })}${UI.fCol('Farbe', 'color', t.color)}</div>
    <div class="row"><button id="gHill">+ Geländepunkt (Kuppe/Mulde/Plateau)</button></div>
    ${t.hills.length ? `<div class="list" style="margin-top:6px">${t.hills.map((h, i) => `<div class="li" data-hill="${i}"><span class="t">${h.plateau ? 'Plateau' : h.h >= 0 ? 'Kuppe' : 'Mulde'} ${U.fmt(h.h, 1)} m · r ${U.fmt(h.r)} m</span></div>`).join('')}</div>` : ''}
    <h3>Externe Orte</h3><p class="note">Lieferanten, externe Wäscherei oder Entsorger als Start/Ziel für LKW-Touren.</p><button id="gExt">+ Externen Ort setzen</button>
    <h3>Vorhandene Wege (${prj.paths.length})</h3><div class="list">${prj.paths.map(p => `<div class="li" data-sel="path:${p.id}"><span class="sw" style="background:${HSS.WEGARTEN[p.kind]?.color}"></span><span class="t">${U.esc(p.name)}</span><span class="s">${U.fmt(HSS.pathStats(p).len)} m</span></div>`).join('') || '<div class="li note">noch keine</div>'}</div>
    <h3>Flächen (${prj.areas.length})</h3><div class="list">${prj.areas.map(a => `<div class="li" data-sel="area:${a.id}"><span class="t">${HSS.FLAECHEN[a.kind]}</span><span class="s">${U.fmt(a.w * a.d)} m²${a.kind === 'parkplatz' ? ' · ' + HSS.parkingLayout(a).stalls.length + ' St.' : ''}</span></div>`).join('') || '<div class="li note">noch keine</div>'}</div>`;
    $('#gGeo', el).onclick = () => HSS.standortDialog(); $('#gUpd', el) && ($('#gUpd', el).onclick = () => HSS.standorte.aktualisierenAktuell());
    $$('[data-path]', el).forEach(b => b.onclick = () => T.drawPath(b.dataset.path));
    $$('[data-area]', el).forEach(b => { b.onclick = () => T.drawArea(b.dataset.area); HSS.manip?.dragFrom(b, () => T.placeArea(b.dataset.area)); });
    $$('[data-cat]', el).forEach(b => b.onclick = () => { UI.libCat = b.dataset.cat; UI.setWS('bibliothek'); });
    UI.bind($('.tf', el), prj => prj.terrain, 'Gelände', 'all');
    $('#gHill', el).onclick = T.hill; $('#gExt', el).onclick = T.externalPlace;
    $$('[data-hill]', el).forEach(li => li.onclick = () => HSS.s3.select({ kind: 'hill', idx: +li.dataset.hill, id: 'hill' + li.dataset.hill }, { focus: true }));
    selLinks(el);
  } };
const selLinks = el => $$('[data-sel]', el).forEach(li => li.onclick = () => { const [kind, id] = li.dataset.sel.split(':'); HSS.s3.select({ kind, id }, { focus: true }); });

W.gebaeude = { name: 'Gebäude', short: 'Gebäude', step: '2', lead: 'Gebäude aus Bausteinen: Grundform, runde Ecken, Geschosszahl und -höhen, Fassaden. Bauteile andocken, aufsetzen und mit Glas- oder Gebäudebrücken verbinden.',
  render(el) {
    const prj = HSS.project();
    el.innerHTML = `<h3>Baustein wählen und platzieren</h3><div class="tiles">${Object.entries(HSS.PRESETS).map(([k, p]) => tile(`data-pre="${k}"`, p.name, p.info)).join('')}</div>
    <div class="actions"><button id="bBridge" class="primary" title="Erst die Fassade des einen, dann des anderen Gebäudes anklicken">⌒ Brücke ziehen</button><button id="bBridgeD">Brücke über Liste …</button></div>
    <div class="infobox"><b>So geht's:</b> Baustein ins 3D-Bild <b>ziehen</b> (oder anklicken und Lage wählen). Danach am Gebäude: <b>ziehen</b> = verschieben (rastet bündig an Nachbarn ein), <b>⇔ ⇕</b> = Länge/Tiefe, <b>⟳</b> = drehen, <b>blauer ⇕</b> = Geschosse. Unten am Gebäude: <b>✓</b> übernehmen, <b>✗</b> verwerfen. Feinwerte im Inspektor rechts.</div>
    <h3>Gebäude im Projekt (${prj.buildings.length})</h3>
    ${prj.buildings.map(b => `<div class="box" style="padding:6px 8px"><div class="row"><b class="hk" style="background:${b.color};color:#fff;padding:0 6px">${U.esc(b.kurz)}</b><b class="grow">${U.esc(b.name)}</b><span class="note">${U.fmt(U.sum(b.parts.map(p => HSS.partArea(p) * (p.floors + (p.stackOn ? 0 : p.basements)))))} m² BGF</span></div>
      <div class="list" style="margin-top:4px">${b.parts.map(p => `<div class="li ${HSS.state.selection?.id === p.id ? 'on' : ''}" data-sel="part:${p.id}"><span class="t">${U.esc(p.name)}${p.stackOn ? ' <span class="pill">aufgesetzt</span>' : ''}</span><span class="s">${HSS.FORMEN[p.shape]} · ${p.floors} G.</span></div>`).join('')}</div></div>`).join('') || '<p class="note">Noch keine Gebäude. Baustein wählen und im Gelände platzieren – oder im Demo-Modus das UNITY Hospital ansehen.</p>'}
    ${prj.bridges.length ? `<h3>Brücken (${prj.bridges.length})</h3><div class="list">${prj.bridges.map(b => `<div class="li" data-sel="bridge:${b.id}"><span class="t">${U.esc(b.name)}</span><span class="s">${b.type === 'glas' ? 'Glas' : 'Gebäude'}</span></div>`).join('')}</div>` : ''}`;
    $$('[data-pre]', el).forEach(b => { b.onclick = () => T.addBuilding(b.dataset.pre); HSS.manip?.dragFrom(b, () => T.addBuilding(b.dataset.pre)); });
    $('#bBridge', el).onclick = () => HSS.manip ? HSS.manip.bridgeTool() : UI.bridgeDialog(HSS.state.selection?.kind === 'part' ? HSS.state.selection.id : null);
    $('#bBridgeD', el).onclick = () => UI.bridgeDialog(HSS.state.selection?.kind === 'part' ? HSS.state.selection.id : null);
    selLinks(el);
  } };

W.innen = { name: 'Etagen & Innenausbau', short: 'Etagen', step: '3', lead: 'Innenansicht je Etage wie im Puppenhaus: Räume, Wände, Türen, Aufzüge und Ausstattung planen – auch in Untergeschossen. Die Etage oben in der Ansichtsleiste oder hier wählen.',
  render(el) {
    const prj = HSS.project(), V = HSS.view;
    const parts = HSS.allParts(prj);
    const [lo, hi] = HSS.s3.floorRange();
    let rooms = [], nuf = 0;
    if (V.floor !== null) for (const pt of parts) { const f = HSS.localFloor(pt, V.floor); if (f === null) continue; const I = HSS.interior(pt.id, f); for (const r of I?.rooms || []) { rooms.push({ r, pt, f }); nuf += r.w * r.d; } }
    const fbtn = []; for (let g = hi; g >= lo; g--) fbtn.push(`<button data-gf="${g}" class="${V.floor === g ? 'on' : ''}">${HSS.floorName(g)}</button>`);
    el.innerHTML = `<h3>Etage</h3><div class="floorpick">${fbtn.join('')}<button data-gf="" class="${V.floor === null ? 'on' : ''}">außen</button></div>
    ${V.floor === null ? '<div class="infobox">Etage wählen, um die Innenansicht zu öffnen. Darüberliegende Geschosse werden ausgeblendet.</div>' : `
    <h3>Raum aufziehen</h3><div class="row nw"><select id="rUse">${UI.opts(HSS.ROOMTYPES, UI.roomUse || 'patient2')}</select><button class="primary" id="rGo">Aufziehen</button></div>
    <h3>Wände &amp; Türen</h3><div class="row"><button id="wGo">Wand zeichnen</button><button id="dGo">Tür 1,01 m</button><button id="dGoB">Bettentür 1,40 m</button></div>
    <h3>Ausstattung</h3><div class="tiles">${[['Medizintechnik/Betten & Lagerung', 'Betten & Liegen'], ['Medizintechnik/Intensiv & Überwachung', 'Intensiv & Monitoring'], ['Stationsausstattung', 'Stationsmöbel'], ['Erschließung', 'Aufzüge, Treppen, Türen'], ['Medizintechnik/OP', 'OP-Ausstattung'], ['Personen', 'Ärzte, Pflege, Patienten'], ['AWT', 'AWT-Anlage'], ['Logistik & Transport', 'Wagen & Behälter']].map(([c, n]) => tile(`data-cat="${c}"`, n, '')).join('')}</div>
    <h3>Räume auf ${HSS.floorName(V.floor)} (${rooms.length}) · ${U.fmt(nuf)} m²</h3>
    <div class="list">${rooms.map(({ r, pt, f }) => `<div class="li" data-room="${pt.id}|${f}|${r.id}"><span class="sw" style="background:${r.color || HSS.ROOMTYPES[r.use]?.color}"></span><span class="t">${U.esc(r.name || HSS.ROOMTYPES[r.use]?.name)}</span><span class="s">${U.fmt(r.w * r.d, 1)} m²</span></div>`).join('') || '<div class="li note">Keine Räume. Raum aufziehen oder den Stationsplaner nutzen.</div>'}</div>
    <div class="actions"><button id="fClear" class="danger">Etage leeren …</button></div>`}
    <div class="note" style="margin-top:10px">Untergeschosse (UG) zeigen Gelände transparent; Versorgungstunnel und AWT-Trassen sind dort sichtbar.</div>`;
    $$('[data-gf]', el).forEach(b => b.onclick = () => { HSS.s3.setFloor(b.dataset.gf === '' ? null : +b.dataset.gf); UI.renderPanel(); });
    if (V.floor === null) return;
    $('#rUse', el).onchange = e => (UI.roomUse = e.target.value);
    $('#rGo', el).onclick = () => T.room($('#rUse', el).value);
    $('#wGo', el).onclick = T.wall; $('#dGo', el).onclick = () => T.door(1.1, 'erschl.tuer.1'); $('#dGoB', el).onclick = () => T.door(1.5, 'erschl.tuer.bett');
    $$('[data-cat]', el).forEach(b => b.onclick = () => { UI.libCat = b.dataset.cat; UI.setWS('bibliothek'); });
    $$('[data-room]', el).forEach(li => li.onclick = () => { const [part, f, id] = li.dataset.room.split('|'); HSS.s3.select({ kind: 'room', id, part, floor: +f }, { focus: true }); });
    $('#fClear', el).onclick = async () => { if (!await UI.confirm('Etage leeren', `Alle Räume, Wände, Türen und Objekte auf ${HSS.floorName(V.floor)} entfernen?`, 'Leeren')) return; HSS.change('Etage leeren', p => { for (const pt of HSS.allParts(p)) { const f = HSS.localFloor(pt, V.floor, p); if (f === null) continue; if (p.interiors[pt.id]) delete p.interiors[pt.id][f]; p.objects = p.objects.filter(o => !(o.host?.part === pt.id && o.host.floor === f)); } }); };
  } };

W.bibliothek = { name: 'Objektbibliothek', short: 'Bibliothek', step: '', sep: true, lead: 'Objekt ins 3D-Bild ziehen und loslassen – fertig. Danach ziehen zum Verschieben, ⟳ zum Drehen, ✓ / ✗ unten am Objekt. Größe im Inspektor. Neue Objekte per Upload ergänzen.',
  render(el) {
    const cats = HSS.library.categories().sort((a, b) => a[0].localeCompare(b[0]));
    const cur = UI.libCat || '', q = UI.libQ || '';
    const items = HSS.library.search(q, cur).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    const sel = UI.libSel && HSS.library.get(UI.libSel);
    el.innerHTML = `<input type="search" id="lQ" placeholder="Suchen: Bett, CT, Aufzug, Laterne …" value="${U.esc(q)}">
    <div class="cat"><button data-c="" class="${!cur ? 'on' : ''}">Alle (${HSS.library.all().length})</button>${cats.map(([c, n]) => `<button data-c="${U.esc(c)}" class="${cur.split('/')[0] === c ? 'on' : ''}">${U.esc(c)} (${n})</button>`).join('')}</div>
    ${cur.includes('/') ? `<div class="note">Filter: ${U.esc(cur)} <a href="#" id="lUp">alle ${U.esc(cur.split('/')[0])}</a></div>` : ''}
    ${sel ? `<div class="box"><div class="row nw"><img src="${HSS.library.thumb(sel.id)}" style="width:64px;height:64px"><div class="grow"><b>${U.esc(sel.name)}</b><div class="note">${U.esc(sel.category)}</div><div class="note">Standard: ${U.fmt(sel.size.w, 2)} × ${U.fmt(sel.size.d, 2)} × ${U.fmt(sel.size.h, 2)} m (B × T × H)</div></div></div>
      ${sel.meta?.quelle ? `<div class="note">Maßgrundlage: ${U.esc(sel.meta.quelle)}</div>` : ''}${sel.meta?.norm ? `<div class="note">Norm: ${U.esc(sel.meta.norm)}</div>` : ''}
      <div class="actions"><button class="primary" id="lPlace">Platzieren</button><button id="lExp">Exportieren</button>${sel._source !== 'standard' ? '<button class="danger" id="lDel">Entfernen</button>' : ''}<span class="pill">${sel._source === 'standard' ? 'Standard' : 'eigenes Objekt'}</span></div></div>` : ''}
    <div class="libgrid">${items.slice(0, 240).map(o => `<div class="libitem ${UI.libSel === o.id ? 'on' : ''}" data-id="${U.esc(o.id)}" title="${U.esc(o.category)}"><img loading="lazy" data-thumb="${U.esc(o.id)}" alt=""><span>${U.esc(o.name)}</span><span class="dim">${U.fmt(o.size.w, 2)}×${U.fmt(o.size.d, 2)}×${U.fmt(o.size.h, 2)} m</span></div>`).join('')}</div>
    ${items.length > 240 ? `<p class="note">${items.length - 240} weitere – Suche verfeinern.</p>` : ''}
    <h3>Eigene Objekte hochladen</h3>
    <div class="drop" id="lDrop">Dateien hierher ziehen oder klicken<br><small>*.hssobj.json · *.hsslib.json · *.glb</small></div><input type="file" id="lFile" multiple accept=".json,.glb,.gltf" hidden>
    <div class="row"><button id="lDoc">Formatbeschreibung</button><button id="lTpl">Vorlage herunterladen</button></div>`;
    // Vorschaubilder nach und nach rendern
    const imgs = $$('img[data-thumb]', el); let i = 0; const step = () => { const t0 = performance.now(); while (i < imgs.length && performance.now() - t0 < 12) { imgs[i].src = HSS.library.thumb(imgs[i].dataset.thumb); i++; } if (i < imgs.length) requestAnimationFrame(step); }; step();
    $('#lQ', el).oninput = U.debounce(e => { UI.libQ = e.target.value; UI.renderPanel(); setTimeout(() => { const s = $('#lQ'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 0); }, 250);
    $$('[data-c]', el).forEach(b => b.onclick = () => { UI.libCat = b.dataset.c; UI.renderPanel(); });
    $('#lUp', el) && ($('#lUp', el).onclick = e => { e.preventDefault(); UI.libCat = cur.split('/')[0]; UI.renderPanel(); });
    $$('.libitem', el).forEach(it => { it.onclick = () => { UI.libSel = it.dataset.id; UI.renderPanel(); }; it.ondblclick = () => T.placeObject(it.dataset.id); HSS.manip?.dragFrom(it, () => T.placeObject(it.dataset.id)); });
    if (sel) { $('#lPlace', el).onclick = () => T.placeObject(sel.id); $('#lExp', el).onclick = () => HSS.library.exportObject(sel.id); $('#lDel', el) && ($('#lDel', el).onclick = async () => { await HSS.library.remove(sel.id); UI.libSel = null; UI.renderPanel(); }); }
    const drop = $('#lDrop', el), file = $('#lFile', el);
    drop.onclick = () => file.click();
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); UI.uploadLib([...e.dataTransfer.files]); };
    file.onchange = () => UI.uploadLib([...file.files]);
    $('#lDoc', el).onclick = UI.formatDoc;
    $('#lTpl', el).onclick = () => U.download('beispiel-infusionswagen.hssobj.json', JSON.stringify(UI.sampleObject(), null, 1));
  } };
UI.uploadLib = async (files) => {
  const r = await HSS.library.importFiles(files, f => new Promise(res => {
    UI.dialog(`<h2>3D-Modell übernehmen</h2><p class="note">${U.esc(f.name)} – das Modell wird auf die angegebene Standardgröße skaliert (Ursprung: Bodenmitte, Front nach +z).</p>
      <div class="fg"><label class="f full"><span>Name</span><input type="text" id="gN" value="${U.esc(f.name.replace(/\.(glb|gltf)$/i, ''))}"></label><label class="f full"><span>Kategorie</span><input type="text" id="gC" value="Eigene Objekte/3D-Modelle"></label>
      <label class="f"><span>Breite [m]</span><input type="number" id="gW" value="1" step="0.01"></label><label class="f"><span>Tiefe [m]</span><input type="number" id="gD" value="1" step="0.01"></label><label class="f"><span>Höhe [m]</span><input type="number" id="gH" value="1" step="0.01"></label></div>
      <div class="actions"><button class="primary" id="gOk">Übernehmen</button><button data-close>Abbrechen</button></div>`, d => {
      $('#gOk', d).onclick = () => { d.close(); res({ name: $('#gN', d).value, category: $('#gC', d).value, w: +$('#gW', d).value, d: +$('#gD', d).value, h: +$('#gH', d).value }); };
      d.onclose = () => res(null);
    });
  }));
  if (r.done.length) UI.toast(`${r.done.length} Objekt(e) in die Bibliothek übernommen`);
  if (r.errs.length) UI.dialog(`<h2>Fehler beim Hochladen</h2><div class="errbox">${r.errs.map(U.esc).join('<br>')}</div><p class="note">Formatbeschreibung: Bibliothek → „Formatbeschreibung“.</p><div class="actions"><button data-close>Schließen</button></div>`);
  UI.libCat = 'Eigene Objekte'; UI.renderPanel();
};
UI.sampleObject = () => {
  const K = HSS.library.kit;
  return { format: 'hss-object', version: 1, id: 'eigen.infusionswagen', name: 'Infusionswagen (Beispiel)', category: 'Eigene Objekte/Pflegewagen', tags: ['Infusion', 'Beispiel'], size: { w: 0.7, d: 0.5, h: 1.1 }, anchor: 'boden', meta: { quelle: 'Beispielvorlage', hinweis: 'Teile in Metern bei Standardgröße; Ursprung Bodenmitte; Front +z' }, logistik: { reinheit: 'rein' },
    parts: [K.box(0, 0.5, 0, 0.66, 0.8, 0.46, '#eef1f4', 'lack', { rr: 0.02 }), K.box(0, 0.93, 0, 0.7, 0.04, 0.5, '#bfc6ce', 'kunststoff'), K.cyl(0.28, 1.05, -0.18, 0.012, 0.25, '#c3c9d0', 'metall'), ...K.casters(0.6, 0.4, 0.05)] };
};
UI.formatDoc = () => UI.dialog(`<div class="dh"><h2>Objektformat der Bibliothek</h2><button class="x" data-close>×</button></div>
  <p>Objekte sind einfache JSON-Dateien. Die Suite liest sie beim Hochladen und speichert sie im Browser sowie in jeder Projektdatei, die sie verwendet. Es ist keine Programmänderung nötig.</p>
  <table class="t"><tr><th>Datei</th><th>Inhalt</th></tr><tr><td><code>*.hssobj.json</code></td><td>ein Objekt</td></tr><tr><td><code>*.hsslib.json</code></td><td>Paket: <code>{"format":"hss-library","version":1,"name":"…","objects":[…]}</code></td></tr><tr><td><code>*.glb</code></td><td>3D-Modell (z. B. aus Blender, Herstellerdaten); Name und Standardmaße werden beim Hochladen abgefragt</td></tr></table>
  <h4>Felder eines Objekts</h4>
  <table class="t"><tr><td><code>format</code></td><td><code>"hss-object"</code></td></tr><tr><td><code>id</code></td><td>eindeutig, z. B. <code>klinik.wagen.infusion</code></td></tr><tr><td><code>name</code>, <code>category</code></td><td>Anzeige; Kategorie mit „/“ gegliedert, z. B. <code>Medizintechnik/OP</code></td></tr>
  <tr><td><code>size</code></td><td>Standardmaße in Metern: <code>{"w":Breite,"d":Tiefe,"h":Höhe}</code> – im Projekt je Objekt änderbar</td></tr><tr><td><code>anchor</code></td><td><code>boden</code> | <code>wand</code> (rastet an Innenwänden ein) | <code>decke</code></td></tr>
  <tr><td><code>parts</code></td><td>Teile in Standardgröße, Ursprung Bodenmitte, Vorderseite +z:<br><code>{"t":"box","p":[x,y,z],"s":[b,h,t],"c":"#hex","m":"lack"}</code><br><code>{"t":"cyl","p":[…],"r":0.1,"h":1,"ax":"y|x|z"}</code> · <code>sph</code> (r) · <code>cone</code> (r,h) · <code>tor</code> (R,r,arc) · <code>cap</code> (r,h)<br>optional: <code>rx/ry/rz</code> Drehung in °, <code>rr</code> Kantenradius (box), <code>o</code> Deckkraft (glas)</td></tr>
  <tr><td><code>m</code> (Material)</td><td>${HSS.library.MATS.join(', ')}</td></tr>
  <tr><td><code>model</code></td><td>alternativ zu <code>parts</code>: eingebettetes GLB als Data-URL</td></tr>
  <tr><td><code>meta</code></td><td>frei: Norm, Quelle, Anschlusswerte; <code>licht</code> = {farbe, staerke, reichweite, hoehe} für Leuchten</td></tr>
  <tr><td><code>logistik</code></td><td><code>rolle</code> (aufzug, treppe, awt-station, waschanlage, rampe, lager …), <code>reinheit</code>, <code>aufzug</code> = {typ, kabinen, sekProGeschoss, tuerS, freigabe}</td></tr></table>
  <p class="note">Ausführlich: <code>docs/OBJEKTFORMAT.md</code>. Standardpakete liegen als <code>library/*.js</code> vor und werden über <code>library/manifest.js</code> geladen.</p>
  <div class="actions"><button data-close>Schließen</button></div>`);

/* ---------- Stationsplaner ---------- */
UI.stInp = UI.stInp || { typ: 'innere', name: '', art: 'stationaer', faelleStat: 2400, faelleAmb: 0, monatlich: false, monate: Array(12).fill(200), sel: [] };
W.station = { name: 'Stationsplaner', short: 'Stations-planer', step: '4', lead: 'Helfer für Standardstationen: Typ, Patientenzahlen und Verweildauer angeben, Gebäude und Etagen wählen – die Suite rechnet Betten- und Flächenbedarf nachvollziehbar und belegt den Grundriss.',
  render(el) {
    const prj = HSS.project(), inp = UI.stInp, T = HSS.STATIONSTYPEN.find(t => t.id === inp.typ);
    const calc = HSS.stationCalc(inp);
    const isAmb = T.art === 'ambulant';
    const sel = new Map(inp.sel.map(s => [s.part, s]));
    const partRows = HSS.allParts(prj).map(pt => { const b = HSS.findPart(pt.id).building, s = sel.get(pt.id); return `<div class="note" style="margin-top:4px"><b>${U.esc(b.kurz)}</b> ${U.esc(pt.name)} · ${U.fmt(HSS.partArea(pt))} m²/Ebene</div><div class="floorpick">${HSS.partFloors(pt).map(f => `<button data-pf="${pt.id}|${f}" class="${s?.floors.includes(f) ? (s.half ? 'half' : 'on') : ''}">${HSS.floorName(HSS.globalFloor(pt, f))}</button>`).join('')}${s ? `<button data-half="${pt.id}" class="${s.half ? 'on' : ''}" title="nur halbe Etage nutzen">½ Etage</button>` : ''}</div>`; }).join('');
    const amp = calc.deckung === undefined ? '' : calc.deckung >= 1 ? '<span class="amp g"></span>ausreichend' : calc.deckung >= 0.9 ? '<span class="amp y"></span>knapp' : '<span class="amp r"></span>nicht ausreichend';
    el.innerHTML = `<h3>1 · Stationstyp</h3>
    <div class="fg"><label class="f full"><span>Typ</span><select id="sT">${HSS.STATIONSTYPEN.map(t => opt(t.id, t.name + (t.art === 'ambulant' ? ' (ambulant)' : ''), inp.typ)).join('')}</select></label>
    <label class="f full"><span>Bezeichnung</span><input type="text" id="sN" value="${U.esc(inp.name)}" placeholder="${U.esc(T.name)}"></label>
    ${!isAmb ? `<label class="f full"><span>Patienten</span><select id="sArt">${opt('stationaer', 'nur stationär', inp.art)}${opt('beides', 'stationär + ambulant', inp.art)}</select></label>` : ''}</div>
    <h3>2 · Patientenzahlen</h3>
    ${!isAmb ? `<div class="row"><label class="chk"><input type="radio" name="sPer" value="jahr" ${!inp.monatlich ? 'checked' : ''}> je Jahr</label><label class="chk"><input type="radio" name="sPer" value="monat" ${inp.monatlich ? 'checked' : ''}> je Monat</label></div>
    ${inp.monatlich ? `<div class="months">${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'].map((m, i) => `<label>${m}<input type="number" data-m="${i}" value="${inp.monate[i]}"></label>`).join('')}</div>` : `<div class="fg"><label class="f"><span>stationäre Fälle/Jahr</span><input type="number" id="sF" value="${inp.faelleStat}" step="50"></label></div>`}
    <div class="fg"><label class="f"><span>Verweildauer [d] ${UI.srcChip(T.vwdQ || 'annahme')}</span><input type="number" id="sV" value="${inp.vwd ?? T.vwd}" step="0.1"></label>
    <label class="f"><span>Ziel-Auslastung ${UI.srcChip(HSS.auslQuelle(T))}</span><input type="number" id="sA" value="${inp.ausl ?? T.ausl}" step="0.01" min="0.5" max="1"></label>
    <label class="f"><span>Anteil 1-Bett-Zimmer</span><input type="number" id="s1" value="${inp.anteil1 ?? T.anteil1}" step="0.05" min="0" max="1"></label></div>` : ''}
    ${isAmb || inp.art === 'beides' ? `<div class="fg"><label class="f"><span>ambulante Fälle/Jahr</span><input type="number" id="sFa" value="${inp.faelleAmb}" step="100"></label>${isAmb ? `<label class="f"><span>Kontakte je Fall</span><input type="number" id="sK" value="${inp.kontakte ?? T.kontakte}" step="0.1"></label><label class="f"><span>Dauer je Kontakt [min]</span><input type="number" id="sD" value="${inp.dauerMin ?? T.dauerMin}"></label><label class="f"><span>Öffnung [h/Tag]</span><input type="number" id="sO" value="${inp.oeffStd ?? T.oeffStd}"></label>` : ''}</div>${T.info ? `<div class="note">${U.esc(T.info)}</div>` : ''}` : ''}
    <h3>3 · Gebäude &amp; Etagen</h3>
    ${partRows || '<p class="note">Erst Gebäude anlegen (Arbeitsbereich „Gebäude“).</p>'}
    <h3>Ergebnis</h3>
    <div class="kpi">${calc.betten !== undefined ? `<div><b>${calc.betten}</b><span>Betten (${calc.stationen} Einheit${calc.stationen > 1 ? 'en' : ''})</span></div>` : ''}${calc.plaetze !== undefined ? `<div><b>${calc.plaetze}</b><span>Behandlungsplätze</span></div>` : ''}<div><b>${U.fmt(calc.bedarf)} m²</b><span>Flächenbedarf inkl. Flure</span></div>${calc.verfuegbar ? `<div><b>${U.fmt(calc.verfuegbar)} m²</b><span>verfügbar · ${amp}</span></div>` : ''}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><b class="note" style="color:#0A223C">So wird gerechnet</b><button class="mini" id="sSrc">Quellen &amp; Planungsgrundlagen</button></div>
    <div class="steps">${calc.steps.map((st, i) => UI.stepCard(st, i + 1)).join('')}</div>
    ${calc.warn.map(w => `<div class="warnbox">${U.esc(w)}</div>`).join('')}
    <details open><summary class="note"><b>Raumprogramm</b> (${calc.rooms.reduce((a, r) => a + r.n, 0)} Räume, ${U.fmt(calc.nuf)} m² NUF)</summary><table class="t rp"><tr><th>Raum</th><th class="n">Anz.</th><th class="n">m²</th><th class="n">Σ</th><th>Grundlage</th></tr>${calc.rooms.map(r => `<tr title="${U.esc(HSS.NEBENRAUM_INFO[r.use] || HSS.ROOMINFO?.[r.use]?.text || '')}"><td>${U.esc(r.name)}${HSS.NEBENRAUM_INFO[r.use] ? `<div class="rpi">${U.esc(HSS.NEBENRAUM_INFO[r.use])}</div>` : ''}</td><td class="n">${r.n}</td><td class="n">${U.fmt(r.m2, 1)}</td><td class="n">${U.fmt(r.n * r.m2, 1)}</td><td>${UI.srcChip(r.q || (r.use.startsWith('patient') ? (T.intensiv ? 'divi' : 'rlp') : 'annahme'))}</td></tr>`).join('')}</table></details>
    <label class="chk"><input type="checkbox" id="sFurn" checked> mit Ausstattung aus der Bibliothek</label>
    <label class="chk"><input type="checkbox" id="sCore" checked> Aufzug und Treppenhaus ergänzen, falls keiner vorhanden</label>
    <label class="chk"><input type="checkbox" id="sRepl" checked> gewählte Etagen vorher leeren</label>
    <div class="actions"><button class="primary" id="sGo" ${inp.sel.length ? '' : 'disabled'}>Station anlegen</button></div>
    <p class="note">Alternativ alles manuell im Arbeitsbereich „Etagen“ planen.</p>
    <h3>Stationen im Projekt (${prj.stations.length})</h3>${prj.stations.length ? '<button class="primary" id="sTour" style="margin-bottom:6px">▶ Stationsrundgang starten</button>' : ''}
    <div class="list">${prj.stations.map(s => `<div class="li" data-st="${s.id}"><span class="t">${U.esc(s.name)}</span><span class="s">${s.betten ? s.betten + ' Betten' : ''}${s.plaetze ? ' ' + s.plaetze + ' Plätze' : ''}${s.calc?.deckung ? ' · ' + U.pct(s.calc.deckung) : ''}</span><button class="mini" data-std="${s.id}">×</button></div>`).join('') || '<div class="li note">noch keine</div>'}</div>`;
    const upd = (k, v) => { inp[k] = v; UI.renderPanel(); };
    $('#sSrc', el).onclick = () => UI.sourcesDialog();
    $('#sTour', el) && ($('#sTour', el).onclick = () => HSS.tour.dialog());
    $$('[data-src]', el).forEach(b => b.onclick = e => { e.preventDefault(); UI.sourcesDialog(b.dataset.src); });
    $('#sT', el).onchange = e => { inp.typ = e.target.value; delete inp.vwd; delete inp.ausl; delete inp.anteil1; delete inp.kontakte; delete inp.dauerMin; delete inp.oeffStd; const t = HSS.STATIONSTYPEN.find(x => x.id === inp.typ); inp.art = t.art === 'ambulant' ? 'ambulant' : 'stationaer'; if (t.art === 'ambulant' && !inp.faelleAmb) inp.faelleAmb = 8000; UI.renderPanel(); };
    $('#sN', el).onchange = e => (inp.name = e.target.value);
    $('#sArt', el) && ($('#sArt', el).onchange = e => upd('art', e.target.value));
    $$('[name=sPer]', el).forEach(r => r.onchange = () => upd('monatlich', r.value === 'monat'));
    $$('[data-m]', el).forEach(i => i.onchange = () => { inp.monate[+i.dataset.m] = +i.value; UI.renderPanel(); });
    const num = (id, k) => $(id, el) && ($(id, el).onchange = e => upd(k, e.target.value === '' ? undefined : +e.target.value));
    num('#sF', 'faelleStat'); num('#sV', 'vwd'); num('#sA', 'ausl'); num('#s1', 'anteil1'); num('#sFa', 'faelleAmb'); num('#sK', 'kontakte'); num('#sD', 'dauerMin'); num('#sO', 'oeffStd');
    $$('[data-pf]', el).forEach(b => b.onclick = () => { const [pid, f] = b.dataset.pf.split('|'); let s = inp.sel.find(x => x.part === pid); if (!s) inp.sel.push(s = { part: pid, floors: [], half: false }); const fi = s.floors.indexOf(+f); if (fi >= 0) s.floors.splice(fi, 1); else s.floors.push(+f); inp.sel = inp.sel.filter(x => x.floors.length); UI.renderPanel(); });
    $$('[data-half]', el).forEach(b => b.onclick = () => { const s = inp.sel.find(x => x.part === b.dataset.half); s.half = !s.half; UI.renderPanel(); });
    $('#sGo', el).onclick = () => {
      if (readonly()) return;
      let rep;
      HSS.change('Station anlegen', () => { rep = HSS.generateStation(Object.assign({}, inp, { art: isAmb ? 'ambulant' : inp.art }), calc, { furnish: $('#sFurn', el).checked, core: $('#sCore', el).checked, replace: $('#sRepl', el).checked }).report; });
      const s0 = inp.sel[0], P = HSS.findPart(s0.part); HSS.s3.setFloor(HSS.globalFloor(P.part, s0.floors[0])); HSS.s3.focusSel({ kind: 'part', id: s0.part });
      const fl = (rep.floors || []).map(x => `<li><b>${U.esc(x.part)} ${U.esc(HSS.floorName(x.floor))}</b>: ${U.esc(x.typName)} – ${U.fmt(x.tiefe, 1)} m tief, ${U.fmt(x.laenge, 1)} m nutzbare Länge${x.reserve > 1 ? `; ${U.fmt(x.reserve)} m² Reservefläche` : ''}</li>`).join('');
      UI.dialog(`<h2>Station angelegt</h2><p>${rep.placed} Räume platziert und vollständig eingerichtet.</p>${fl ? `<ul class="note">${fl}</ul>` : ''}${rep.dropped.length ? `<div class="warnbox">Nicht untergebracht (Fläche/Fassade reicht nicht): ${rep.dropped.map(U.esc).join(', ')}</div>` : '<div class="okbox">Alle Räume des Raumprogramms untergebracht.</div>'}<p class="note">Räume lassen sich anklicken und im Inspektor ändern. Für Standardflüsse erhalten Arbeitsraum rein/unrein, Medikamente, Teeküche und Stützpunkt automatisch ihre Rolle.</p><div class="actions"><button id="dlgM2">Flächen ansehen (m²)</button><button class="primary" data-close>OK</button></div>`);
      const bm = document.getElementById('dlgM2'); if (bm) bm.onclick = () => { $('#dlg').close(); HSS.flaechen?.toggle(true); };
      UI.renderPanel();
    };
    $$('[data-st]', el).forEach(li => li.onclick = e => { if (e.target.dataset.std) return; const s = U.byId(prj.stations, li.dataset.st); const p0 = s.sel?.[0]; if (p0) { const P = HSS.findPart(p0.part); if (P) { HSS.s3.setFloor(HSS.globalFloor(P.part, p0.floors[0])); HSS.s3.focusSel({ kind: 'part', id: p0.part }); } } });
    $$('[data-std]', el).forEach(b => b.onclick = async () => { if (!await UI.confirm('Station entfernen', 'Station mit ihren Räumen und Objekten entfernen?', 'Entfernen')) return; HSS.change('Station entfernen', p => { const id = b.dataset.std; p.stations = p.stations.filter(s => s.id !== id); for (const pid of Object.keys(p.interiors)) for (const f of Object.keys(p.interiors[pid])) { const I = p.interiors[pid][f]; const rids = new Set(I.rooms.filter(r => r.station === id).map(r => r.id)); I.rooms = I.rooms.filter(r => r.station !== id); I.walls = I.walls.filter(w => !rids.has(w.room)); const wids = new Set(I.walls.map(w => w.id)); I.doors = I.doors.filter(d => wids.has(d.wall)); } p.objects = p.objects.filter(o => o.station !== id); }); });
  } };

/* ---------- Flüsse ---------- */
UI.flowTab = UI.flowTab || 'fluesse';
const placeOpts = (sel) => { const pl = HSS.places(); const grp = {}; for (const p of pl) { const k = p.kind === 'extern' ? 'Extern' : p.part ? (HSS.findPart(p.part)?.building.name || 'Gebäude') : 'Außenbereich'; (grp[k] = grp[k] || []).push(p); } return opt('', '– wählen –', sel) + Object.entries(grp).map(([k, ps]) => `<optgroup label="${U.esc(k)}">${ps.map(p => opt(p.id, p.name + (p.role && HSS.ROLLEN[p.role] ? ' [' + HSS.ROLLEN[p.role] + ']' : ''), sel)).join('')}</optgroup>`).join(''); };
const fenster = f => (f.fenster || []).map(([a, b]) => U.hhmm(a * 60) + '–' + U.hhmm(b * 60)).join(', ');
const parseFenster = s => s.split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/(\d{1,2})[:.]?(\d{2})?\s*[-–]\s*(\d{1,2})[:.]?(\d{2})?/); return m ? [+m[1] + (+(m[2] || 0)) / 60, +m[3] + (+(m[4] || 0)) / 60] : null; }).filter(Boolean);
W.fluesse = { name: 'Material-, Waren- & Personenflüsse', short: 'Flüsse', step: '5', lead: 'Flüsse von Quelle zu Ziel mit Menge, Zeitfenster und Transportmittel. Standardflüsse übernehmen oder eigene anlegen; Regeln für Rein/Unrein und Reinigungsfahrten festlegen.',
  render(el) {
    const prj = HSS.project(); HSS.ensureStammdaten(prj);
    const tab = UI.flowTab;
    const tabs = [['fluesse', 'Flüsse'], ['material', 'Material'], ['fuhrpark', 'Fuhrpark'], ['regeln', 'Regeln'], ['orte', 'Orte']];
    el.innerHTML = `<div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div id="ftab"></div>`;
    $$('[data-tab]', el).forEach(b => b.onclick = () => { UI.flowTab = b.dataset.tab; UI.renderPanel(); });
    FT[tab]($('#ftab', el), prj);
  } };
const FT = {};
FT.fluesse = (el, prj) => {
  const mats = new Map(prj.materials.map(m => [m.id, m]));
  el.innerHTML = `<div class="actions" style="margin-top:0"><button class="primary" id="fStd">Standardflüsse übernehmen …</button><button id="fNew">+ Fluss</button></div>
  <div class="note" style="margin:6px 0">${prj.flows.length} Flüsse · ${U.fmt(U.sum(prj.flows.filter(f => f.aktiv !== false).map(f => HSS.flowPerDay(f) / (mats.get(f.material)?.proLadung || 1))))} Ladungen/Tag</div>
  <div class="list" style="max-height:none">${prj.flows.map(f => { const m = mats.get(f.material); const t = U.byId(prj.transports, f.transport); return `<div class="li ${UI.flowSel === f.id ? 'on' : ''}" data-f="${f.id}"><input type="checkbox" data-fa="${f.id}" ${f.aktiv !== false ? 'checked' : ''} title="aktiv"><span class="sw" style="background:${m?.farbe || '#999'}"></span><span class="t" title="${U.esc(f.name)}">${U.esc(f.name)}<br><span class="note">${U.fmt(HSS.flowPerDay(f), 1)} ${U.esc(m?.einheit || '')}/Tag · ${U.esc(t?.name.split(' (')[0] || '')} · ${fenster(f)}</span></span><span class="pill ${m?.reinheit}">${m?.reinheit || ''}</span></div>`; }).join('') || '<div class="li note">Noch keine Flüsse.</div>'}</div>
  <div id="fEdit"></div>`;
  $('#fStd', el).onclick = UI.templateDialog;
  $('#fNew', el).onclick = () => { const f = { id: U.uid('flow'), name: 'Neuer Fluss', material: prj.materials[0].id, von: '', nach: '', menge: 10, periode: 'tag', betriebstage: 7, fenster: [[8, 12]], transport: 't_hand', fahrzeitMin: null, aktiv: true }; HSS.change('Fluss anlegen', p => p.flows.push(f), { scope: 'none' }); UI.flowSel = f.id; UI.renderPanel(); };
  $$('[data-fa]', el).forEach(c => c.onclick = e => { e.stopPropagation(); HSS.change('Fluss aktiv', p => (U.byId(p.flows, c.dataset.fa).aktiv = c.checked), { scope: 'none' }); });
  $$('[data-f]', el).forEach(li => li.onclick = e => { if (e.target.dataset.fa) return; UI.flowSel = li.dataset.f; UI.renderPanel(); UI.showRoute(UI.flowSel); });
  const f = U.byId(prj.flows, UI.flowSel); if (!f) return;
  const m = mats.get(f.material), t = U.byId(prj.transports, f.transport);
  const r = HSS.route(f.von, f.nach, t?.mittel, m?.reinheit);
  const ed = $('#fEdit', el);
  ed.innerHTML = `<h3>Fluss bearbeiten</h3><div class="fg fe">${UI.fTxt('Name', 'name', f.name)}
   ${UI.fSel('Von (Quelle)', 'von', f.von, placeOpts(f.von), { full: true })}${UI.fSel('Nach (Ziel)', 'nach', f.nach, placeOpts(f.nach), { full: true })}
   ${UI.fSel('Materialgruppe', 'material', f.material, prj.materials.map(x => opt(x.id, x.name + ' (' + x.reinheit + ')', f.material)).join(''), { full: true })}
   ${UI.fNum('Menge', 'menge', f.menge, { step: 1, unit: m?.einheit })}${UI.fSel('je', 'periode', f.periode, opt('tag', 'Tag', f.periode) + opt('woche', 'Woche', f.periode) + opt('monat', 'Monat', f.periode) + opt('jahr', 'Jahr', f.periode))}
   ${UI.fNum('Betriebstage/Woche', 'betriebstage', f.betriebstage, { min: 1, max: 7, step: 1 })}${UI.fSel('Transportmittel', 'transport', f.transport, prj.transports.map(x => opt(x.id, x.name, f.transport)).join(''))}
   <label class="f full"><span>Zeitfenster (z. B. 06:30–07:15, 11:15–12:00)</span><input type="text" id="fWin" value="${fenster(f)}"></label>
   ${UI.fNum('Fahrzeit hinterlegt', 'fahrzeitMin', f.fahrzeitMin, { unit: 'min', step: 1, ph: 'aus Wegenetz' })}</div>
   <div class="${r.ok ? 'okbox' : 'errbox'}">${r.ok ? `Route: ${U.fmt(r.len)} m · ${U.dur(r.timeMin)} Fahrzeit · ${r.lifts.length} Aufzugsfahrt(en)${r.direkt ? ' · Rohrpost (Luftlinie)' : ''}` : 'Keine Route gefunden: Quelle/Ziel wählen, Wege und Eingänge prüfen; Aufzugsfreigaben (rein/unrein) und AWT-Anbindung beachten.'}</div>
   <div class="actions"><button id="fRoute">Route zeigen</button><button id="fDup">Duplizieren</button><button class="danger" id="fDel">Löschen</button></div>`;
  UI.bind($('.fe', ed), p => U.byId(p.flows, f.id), 'Fluss', 'none', () => setTimeout(() => { UI.renderPanel(); UI.showRoute(f.id); }, 0));
  $('#fWin', ed).onchange = e => HSS.change('Zeitfenster', p => (U.byId(p.flows, f.id).fenster = parseFenster(e.target.value)), { scope: 'none' });
  $('#fRoute', ed).onclick = () => UI.showRoute(f.id, true);
  $('#fDup', ed).onclick = () => { const n = U.clone(f); n.id = U.uid('flow'); n.name += ' (Kopie)'; HSS.change('Fluss duplizieren', p => p.flows.push(n), { scope: 'none' }); UI.flowSel = n.id; UI.renderPanel(); };
  $('#fDel', ed).onclick = () => { HSS.change('Fluss löschen', p => (p.flows = p.flows.filter(x => x.id !== f.id)), { scope: 'none' }); UI.flowSel = null; UI.renderPanel(); clearGhost(); };
};
UI.showRoute = (fid, focus) => {
  clearGhost();
  const prj = HSS.project(), f = U.byId(prj.flows, fid); if (!f) return;
  const m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport);
  const r = HSS.route(f.von, f.nach, t?.mittel, m?.reinheit); if (!r.ok) return;
  const g = new THREE.BufferGeometry().setFromPoints(r.pts.map(p => new THREE.Vector3(p[0], p[1] + 0.6, p[2])));
  const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: m?.farbe || '#0A967A', depthTest: false, linewidth: 2 })); l.renderOrder = 30; HSS.s3.layers.ghost.add(l);
  for (const p of [r.pts[0], r.pts[r.pts.length - 1]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.8, 16, 12), new THREE.MeshBasicMaterial({ color: m?.farbe || '#0A967A', depthTest: false })); s.position.set(p[0], p[1] + 0.8, p[2]); s.renderOrder = 31; HSS.s3.layers.ghost.add(s); }
  if (focus) { const box = new THREE.Box3().setFromObject(l); HSS.s3.focusBox(box, { k: 0.8 }); }
};
UI.templateDialog = () => {
  const prj = HSS.project();
  if (!prj.stations.length) UI.toast('Hinweis: Ohne Stationen werden nur zentrale Flüsse (OP, Anlieferung, Entsorgung) erzeugt.');
  UI.dialog(`<div class="dh"><h2>Standardflüsse übernehmen</h2><button class="x" data-close>×</button></div>
   <p class="note">Mengen werden aus den Betten der Stationen (Stationsplaner) und der Auslastung berechnet. Quellen und Ziele werden über die <b>Rolle</b> von Räumen/Objekten gefunden (z. B. Apotheke, Zentralküche, ZSVA). Alle Werte sind danach je Fluss änderbar.</p>
   <table class="t"><tr><th></th><th>Fluss</th><th>Von → Nach</th><th>Menge</th><th>Fenster</th><th>Transport</th></tr>
   ${HSS.STANDARDFLUESSE.map(t => `<tr><td><input type="checkbox" data-t="${t.id}" checked></td><td>${U.esc(t.name)}${t.hinweis ? `<div class="note">${U.esc(t.hinweis)}</div>` : ''}</td><td class="note">${U.esc(HSS.ROLLEN[t.von] || t.von.replace('station:', 'Station: '))} → ${U.esc(HSS.ROLLEN[t.nach] || t.nach.replace('station:', 'Station: '))}</td><td class="note">${t.mengeFix ? t.mengeFix + '/Tag' : t.mengeProStation ? t.mengeProStation + '/Station' : t.mengeProBett === 'entlassung' ? 'Entlassungen' : t.mengeProBett + '/Bett'}</td><td class="note">${t.fenster.map(([a, b]) => U.hhmm(a * 60) + '–' + U.hhmm(b * 60)).join(' ')}</td><td><select data-tt="${t.id}">${prj.transports.map(x => opt(x.id, x.name.split(' (')[0], t.transport)).join('')}</select></td></tr>`).join('')}</table>
   <label class="chk"><input type="checkbox" id="tRepl" checked> bisherige Standardflüsse ersetzen</label>
   <div id="tWarn"></div><div class="actions"><button class="primary" id="tGo">Übernehmen</button><button data-close>Abbrechen</button></div>`, d => {
    $('#tGo', d).onclick = () => {
      const ids = $$('[data-t]', d).filter(c => c.checked).map(c => c.dataset.t);
      const transport = {}; $$('[data-tt]', d).forEach(s => transport[s.dataset.tt] = s.value);
      const { flows, warn } = HSS.applyTemplates(ids, { transport });
      HSS.change('Standardflüsse übernehmen', p => { if ($('#tRepl', d).checked) p.flows = p.flows.filter(f => !f.template); p.flows.push(...flows); }, { scope: 'none' });
      if (warn.length) $('#tWarn', d).innerHTML = `<div class="warnbox"><b>${flows.length} Flüsse übernommen.</b> Hinweise:<br>${[...new Set(warn)].map(U.esc).join('<br>')}</div>`;
      else { d.close(); UI.toast(flows.length + ' Flüsse übernommen'); }
      UI.renderPanel();
    };
  });
};
FT.material = (el, prj) => {
  el.innerHTML = `<p class="note">Materialgruppen bestimmen Reinheit, Ladeeinheit und Lade-/Entladezeiten. <b>Rein und unrein werden nie gemeinsam gefahren</b>; gleiche Reinheit vom selben Startort wird – wenn das Transportmittel bündelt – zu Touren zusammengefasst.</p>
  <table class="t mt"><tr><th></th><th>Name</th><th>Reinheit</th><th class="n">je Ladung</th><th class="n">Laden</th><th class="n">Entl.</th><th>Bündeln</th></tr>
  ${prj.materials.map((m, i) => `<tr data-i="${i}"><td><input type="color" data-k="farbe" value="${m.farbe}"></td><td><input type="text" data-k="name" value="${U.esc(m.name)}"><input type="text" data-k="einheit" value="${U.esc(m.einheit)}" title="Einheit" style="margin-top:2px;font-size:10.5px"></td><td><select data-k="reinheit">${Object.keys(HSS.REINHEIT).map(r => opt(r, r, m.reinheit)).join('')}</select></td><td><input type="number" data-k="proLadung" value="${m.proLadung}" style="width:52px"></td><td><input type="number" data-k="ladeMin" value="${m.ladeMin}" style="width:42px"></td><td><input type="number" data-k="entladeMin" value="${m.entladeMin}" style="width:42px"></td><td><input type="checkbox" data-k="buendelbar" ${m.buendelbar !== false ? 'checked' : ''}></td></tr>`).join('')}</table>
  <div class="actions"><button id="mAdd">+ Materialgruppe</button><button id="mReset">Standardwerte</button></div>`;
  $$('.mt [data-k]', el).forEach(i => i.onchange = () => { const idx = +i.closest('tr').dataset.i, k = i.dataset.k; let v = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; HSS.change('Material', p => (p.materials[idx][k] = v), { scope: 'none' }); });
  $('#mAdd', el).onclick = () => { HSS.change('Material', p => p.materials.push({ id: U.uid('m'), name: 'Neue Gruppe', reinheit: 'rein', farbe: '#2D7694', einheit: 'Einheiten', proLadung: 1, ladeMin: 2, entladeMin: 2, buendelbar: true }), { scope: 'none' }); UI.renderPanel(); };
  $('#mReset', el).onclick = () => { HSS.change('Material zurücksetzen', p => (p.materials = HSS.defaultMaterials()), { scope: 'none' }); UI.renderPanel(); };
};
FT.fuhrpark = (el, prj) => {
  el.innerHTML = `<p class="note"><b>Anzahl leer</b> = die Simulation ermittelt den Bedarf. Mit Anzahl wird zusätzlich geprüft, ob es zu Wartezeiten kommt. Kapazität = Wagen/Behälter je Fahrt.</p>
  ${prj.transports.map((t, i) => `<div class="box tp" data-i="${i}"><div class="fg"><label class="f full"><span>Name</span><input type="text" data-k="name" value="${U.esc(t.name)}"></label>
   <label class="f"><span>Mittel</span><select data-k="mittel">${Object.entries(HSS.MITTEL).map(([k, v]) => opt(k, v.name, t.mittel)).join('')}</select></label><label class="f"><span>Anzahl</span><input type="number" data-k="anzahl" value="${t.anzahl ?? ''}" placeholder="automatisch" min="1"></label>
   <label class="f"><span>Kapazität/Fahrt</span><input type="number" data-k="kapazitaet" value="${t.kapazitaet}" min="1"></label><label class="f"><span>Betrieb von–bis [h]</span><input type="text" data-k="schicht" value="${(t.schicht || [6, 20]).join('–')}"></label></div>
   <label class="chk"><input type="checkbox" data-k="buendeln" ${t.buendeln ? 'checked' : ''}> Touren bündeln (gleicher Start, gleiche Reinheit)</label><div class="note">${U.esc(HSS.MITTEL[t.mittel]?.name)} · ${U.fmt(HSS.MITTEL[t.mittel]?.v * 3.6, 1)} km/h · Wege: ${HSS.MITTEL[t.mittel]?.kanten.join(', ') || 'direkt'}</div></div>`).join('')}
  <div class="actions"><button id="tAdd">+ Transportmittel</button></div>`;
  $$('.tp [data-k]', el).forEach(i => i.onchange = () => { const idx = +i.closest('.tp').dataset.i, k = i.dataset.k; let v = i.type === 'checkbox' ? i.checked : i.type === 'number' ? (i.value === '' ? null : +i.value) : i.value; if (k === 'schicht') v = i.value.split(/[–-]/).map(Number); HSS.change('Fuhrpark', p => (p.transports[idx][k] = v), { scope: 'none' }); UI.renderPanel(); });
  $('#tAdd', el).onclick = () => { HSS.change('Fuhrpark', p => p.transports.push({ id: U.uid('t'), name: 'Neues Transportmittel', mittel: 'hand', anzahl: null, kapazitaet: 1, schicht: [6, 20], buendeln: false }), { scope: 'none' }); UI.renderPanel(); };
};
FT.regeln = (el, prj) => {
  const wash = HSS.places().filter(p => p.role === 'waschanlage');
  el.innerHTML = `<div class="okbox"><b>Immer aktiv:</b> Reine und unreine Materialien werden nie in derselben Tour oder demselben Fahrzeug transportiert. Aufzüge lassen sich je Reinheit freigeben (Inspektor → Aufzug → Freigaben).</div>
  <h3>Reinigungsregeln</h3>
  ${prj.rules.map((r, i) => `<div class="box rl" data-i="${i}"><div class="fg"><label class="f full"><span>Regel</span><select data-k="typ">${opt('reinigungNachUnrein', 'Reinigungsfahrt nach jeder Unrein-Fahrt', r.typ)}${opt('reinigungNachN', 'Reinigung nach N Fahrten', r.typ)}</select></label>
   <label class="f"><span>Transportmittel</span><select data-k="transport">${prj.transports.map(t => opt(t.id, t.name.split(' (')[0], r.transport)).join('')}</select></label><label class="f"><span>Waschanlage</span><select data-k="ziel">${opt('', '– wählen –', r.ziel)}${wash.map(p => opt(p.id, p.name, r.ziel)).join('')}</select></label>
   <label class="f"><span>Dauer [min]</span><input type="number" data-k="dauerMin" value="${r.dauerMin}" step="0.5"></label>${r.typ === 'reinigungNachN' ? `<label class="f"><span>N Fahrten</span><input type="number" data-k="n" value="${r.n || 5}" min="1"></label>` : ''}</div>
   <div class="row"><label class="chk"><input type="checkbox" data-k="aktiv" ${r.aktiv !== false ? 'checked' : ''}> aktiv</label><div class="sp"></div><button class="mini danger" data-rd="${i}">entfernen</button></div></div>`).join('') || '<p class="note">Noch keine Regeln.</p>'}
  ${wash.length ? '' : '<div class="warnbox">Keine Waschanlage im Modell. Objekt „AWT-Containerwaschanlage“ oder „Bettenwaschanlage“ aus der Bibliothek platzieren.</div>'}
  <div class="actions"><button id="rAdd1">+ nach Unrein-Fahrt</button><button id="rAdd2">+ nach N Fahrten</button></div>
  <p class="note">Beispiel AWT: Nach Wäsche- oder Abfallfahrt (unrein) fährt der Behälter für 2 min in die Waschanlage; zusätzlich jede 5. Fahrt.</p>`;
  $$('.rl [data-k]', el).forEach(i => i.onchange = () => { const idx = +i.closest('.rl').dataset.i, k = i.dataset.k; const v = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; HSS.change('Regel', p => (p.rules[idx][k] = v), { scope: 'none' }); UI.renderPanel(); });
  $$('[data-rd]', el).forEach(b => b.onclick = () => { HSS.change('Regel entfernen', p => p.rules.splice(+b.dataset.rd, 1), { scope: 'none' }); UI.renderPanel(); });
  const add = typ => { HSS.change('Regel', p => p.rules.push({ id: U.uid('rule'), typ, transport: (p.transports.find(t => t.mittel === 'awt') || p.transports[0]).id, ziel: wash[0]?.id || '', dauerMin: 2, n: 5, aktiv: true }), { scope: 'none' }); UI.renderPanel(); };
  $('#rAdd1', el).onclick = () => add('reinigungNachUnrein'); $('#rAdd2', el).onclick = () => add('reinigungNachN');
};
FT.orte = (el, prj) => {
  const pl = HSS.places();
  el.innerHTML = `<p class="note">Orte sind Räume (mit Raumart/Rolle) und Objekte mit Logistik-Rolle. Rollen weisen Sie im Inspektor zu; Standardflüsse finden ihre Quellen und Ziele darüber.</p>
  <h3>Zentrale Rollen</h3><table class="t">${Object.entries(HSS.ROLLEN).map(([k, n]) => { const found = pl.filter(p => p.role === k); return `<tr><td>${found.length ? '<span class="amp g"></span>' : '<span class="amp y"></span>'}${U.esc(n)}</td><td class="note">${found.map(p => `<a href="#" data-go="${p.id}">${U.esc(p.name)}</a>`).join('<br>') || 'nicht zugewiesen'}</td></tr>`; }).join('')}</table>
  <h3>Externe Orte (${prj.places.length})</h3>${prj.places.map((p, i) => `<div class="box ex" data-i="${i}"><div class="fg"><label class="f full"><span>Name</span><input type="text" data-k="name" value="${U.esc(p.name)}"></label><label class="f"><span>Entfernung (Anfahrt) [km]</span><input type="number" data-k="anfahrtM" value="${(p.anfahrtM || 0) / 1000}" step="0.5"></label><label class="f"><span>&nbsp;</span><button class="mini danger" data-xd="${i}">entfernen</button></label></div></div>`).join('')}
  <button id="oExt">+ Externen Ort setzen</button>`;
  $$('[data-go]', el).forEach(a => a.onclick = e => { e.preventDefault(); const p = pl.find(x => x.id === a.dataset.go); if (p.kind === 'room') { HSS.s3.setFloor(p.gf); HSS.s3.select({ kind: 'room', id: p.id, part: p.part, floor: p.floor }, { focus: true }); } else if (p.kind === 'object') { if (p.part) HSS.s3.setFloor(p.gf); HSS.s3.select({ kind: 'object', id: p.id }, { focus: true }); } });
  $$('.ex [data-k]', el).forEach(i => i.onchange = () => { const idx = +i.closest('.ex').dataset.i, k = i.dataset.k; const v = k === 'anfahrtM' ? +i.value * 1000 : i.value; HSS.change('Externer Ort', p => (p.places[idx][k] = v), { scope: 'none' }); });
  $$('[data-xd]', el).forEach(b => b.onclick = () => { HSS.change('Externer Ort entfernen', p => p.places.splice(+b.dataset.xd, 1), { scope: 'none' }); UI.renderPanel(); });
  $('#oExt', el).onclick = T.externalPlace;
};

/* Rechenschritte und Quellen */
UI.srcChip = id => { const q = HSS.QUELLEN[id]; if (!q) return ''; const lbl = { destatis: 'Destatis 2023', gbe: 'GBE-Bund 2023', hillburton: 'Hill-Burton', nutzungsgrad: 'Landesvorgabe', ovg: 'OVG Sachsen', rlp: 'Ministerium RLP', din: 'DIN 13080/277', divi: 'DIVI 2022', annahme: 'Annahme' }[id] || id; return `<a href="#" class="src ${id === 'annahme' ? 'ann2' : ''}" data-src="${id}" title="${U.esc(q.titel)}">${U.esc(lbl)}</a>`; };
UI.stepCard = (st, n) => `<div class="stp"><div class="stn">${n}</div><div class="stb"><b>${U.esc(st.frage)}</b><p>${U.esc(st.erkl)}</p><div class="calc">${U.esc(st.rechnung)}</div><div class="res">${st.ampel ? `<span class="amp ${st.ampel}"></span>` : '→ '}${U.esc(st.ergebnis)}</div>${(st.quellen || []).length ? `<div class="srcs">Grundlage: ${st.quellen.map(UI.srcChip).join(' ')}</div>` : ''}</div></div>`;
UI.sourcesDialog = (focus) => {
  UI.dialog(`<div class="dh"><h2>Quellen &amp; Planungsgrundlagen</h2><button class="x" data-close>×</button></div>
   <p class="note">Woher die Vorschlagswerte des Stationsplaners kommen. Werte aus amtlicher Statistik und Landesvorgaben sind belegt; als „Annahme“ markierte Werte sind Erfahrungswerte und im Formular änderbar.</p>
   ${Object.entries(HSS.QUELLEN).map(([id, q]) => `<div class="qbox ${focus === id ? 'on' : ''}" id="q_${id}"><div class="row"><span class="pill">${U.esc(q.art)}</span><b class="grow">${U.esc(q.titel)}</b></div><p>${U.esc(q.erklaerung)}</p>${q.url ? `<a href="${U.esc(q.url)}" target="_blank" rel="noopener">Quelle öffnen ↗</a>` : ''}</div>`).join('')}
   <h3>Vorschlagswerte je Stationstyp</h3><table class="t"><tr><th>Typ</th><th class="n">Verweildauer</th><th>Quelle</th><th class="n">Auslastung</th><th>Quelle</th><th class="n">1-Bett / 2-Bett</th></tr>
   ${HSS.STATIONSTYPEN.filter(t => t.art !== 'ambulant').map(t => `<tr><td>${U.esc(t.name)}</td><td class="n">${U.fmt(t.vwd, 1)} d</td><td>${UI.srcChip(t.vwdQ || 'annahme')}</td><td class="n">${U.pct(t.ausl)}</td><td>${UI.srcChip(HSS.auslQuelle(t))}</td><td class="n">${U.fmt(t.a1, 1)} / ${U.fmt(t.a2, 1)} m²</td></tr>`).join('')}</table>
   <div class="actions"><button data-close>Schließen</button></div>`, d => { UI.$$('[data-src]', d).forEach(a => a.onclick = e => { e.preventDefault(); const t = d.querySelector('#q_' + a.dataset.src); t?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); if (focus) setTimeout(() => d.querySelector('#q_' + focus)?.scrollIntoView({ block: 'center' }), 50); });
};
})();
