/* =====================================================================
   HEALTHCARE SIMULATION SUITE · core.js
   Namensraum, Hilfsfunktionen, Projektmodell, Undo/Redo, Speicherung.
   Alle Module hängen sich an window.HSS. Klassische Skripte (kein Build),
   damit die Suite auch per Doppelklick (file://) läuft.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS = window.HSS || {};
// Ladefehler einzelner Skripte sammeln (z. B. veraltete Datei im Browser-Cache) und beim Start anzeigen
HSS.loadErrors = HSS.loadErrors || [];
window.addEventListener('error', e => { if (HSS.booted) return; const t = e.target; if (t && t.tagName === 'SCRIPT') HSS.loadErrors.push({ datei: (t.src || '').split('/').pop(), meldung: 'Datei konnte nicht geladen werden' }); else if (e.message) HSS.loadErrors.push({ datei: (e.filename || '').split('/').pop().split('?')[0], meldung: e.message, zeile: e.lineno }); }, true);
HSS.VERSION = '1.0.0';
HSS.APP = 'Healthcare Simulation Suite';

/* ---------- Hilfsfunktionen ---------- */
const U = HSS.util = {};
U.uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
U.lerp = (a, b, t) => a + (b - a) * t;
U.clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
U.deg = r => r * 180 / Math.PI;
U.rad = d => d * Math.PI / 180;
U.sum = a => a.reduce((s, v) => s + v, 0);
U.byId = (arr, id) => (arr || []).find(o => o.id === id);
U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NF = {};
U.fmt = (v, d = 0) => {
  if (v === null || v === undefined || !isFinite(v)) return '–';
  NF[d] = NF[d] || new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  return NF[d].format(v);
};
U.pct = (v, d = 0) => U.fmt(v * 100, d) + ' %';
U.hhmm = min => {
  min = ((Math.round(min) % 1440) + 1440) % 1440;
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
};
U.dur = min => (min < 1 ? U.fmt(min * 60) + ' s' : min < 90 ? U.fmt(min, 1) + ' min' : U.fmt(min / 60, 1) + ' h');
U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
U.download = (name, data, mime = 'application/json') => {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};
U.readFile = (file, as = 'text') => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result); r.onerror = rej;
  as === 'dataurl' ? r.readAsDataURL(file) : as === 'buffer' ? r.readAsArrayBuffer(file) : r.readAsText(file);
});
U.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
U.rng = seed => { let s = seed >>> 0 || 1; return () => { s = Math.imul(s ^ (s >>> 15), 2246822507); s = Math.imul(s ^ (s >>> 13), 3266489909); s ^= s >>> 16; return (s >>> 0) / 4294967296; }; };

/* ---------- 2D-Geometrie (x, z in Metern) ---------- */
const G = HSS.geo = {};
G.dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
G.area = poly => { let s = 0; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
G.perimeter = poly => U.sum(poly.map((p, i) => G.dist(p, poly[(i + 1) % poly.length])));
G.ccw = poly => (G.area(poly) < 0 ? poly.slice().reverse() : poly.slice());
G.cw = poly => (G.area(poly) > 0 ? poly.slice().reverse() : poly.slice());
G.pointIn = (pt, poly) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
};
G.closestOnSeg = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1e-9;
  const t = U.clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2, 0, 1);
  return { pt: [a[0] + dx * t, a[1] + dz * t], t };
};
G.rot = (p, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
G.bbox = pts => {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { x0, z0, x1, z1, w: x1 - x0, d: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
};
G.polylineLength = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += G.dist(pts[i - 1], pts[i]); return l; };
G.pointAt = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const l = G.dist(pts[i - 1], pts[i]);
    if (s <= l || i === pts.length - 1) { const t = l ? U.clamp(s / l, 0, 1) : 0; return { p: [U.lerp(pts[i - 1][0], pts[i][0], t), U.lerp(pts[i - 1][1], pts[i][1], t)], i, dir: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]) }; }
    s -= l;
  }
  return { p: pts[0], i: 0, dir: 0 };
};
// Abgerundete Ecken: jede Ecke mit Radius r ausrunden (begrenzt auf die halbe Kantenlänge)
G.fillet = (poly, r, seg = 6) => {
  if (!r || r <= 0.01) return poly;
  const out = [], n = poly.length;
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const v1 = [p0[0] - p1[0], p0[1] - p1[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
    if (l1 < 1e-6 || l2 < 1e-6) { out.push(p1); continue; }
    const u1 = [v1[0] / l1, v1[1] / l1], u2 = [v2[0] / l2, v2[1] / l2];
    const cosA = U.clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1), ang = Math.acos(cosA);
    if (ang > Math.PI - 0.05) { out.push(p1); continue; }
    let rr = r, tlen = rr / Math.tan(ang / 2);
    const maxT = Math.min(l1, l2) * 0.49;
    if (tlen > maxT) { tlen = maxT; rr = tlen * Math.tan(ang / 2); }
    const a = [p1[0] + u1[0] * tlen, p1[1] + u1[1] * tlen], b = [p1[0] + u2[0] * tlen, p1[1] + u2[1] * tlen];
    const bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(...bis);
    const cd = rr / Math.sin(ang / 2), c = [p1[0] + bis[0] / bl * cd, p1[1] + bis[1] / bl * cd];
    let a0 = Math.atan2(a[1] - c[1], a[0] - c[0]), a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
    let da = a1 - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.max(2, Math.round(seg * Math.abs(da) / (Math.PI / 2)));
    for (let k = 0; k <= steps; k++) { const t = a0 + da * k / steps; out.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]); }
  }
  return out;
};
// Catmull-Rom-Glättung für gebogene Wege
G.smooth = (pts, perSeg = 8) => {
  if (pts.length < 3) return pts.map(p => p.slice());
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      const f = j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
      out.push(p1.length > 2 ? [f(0), f(1), f(2)] : [f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
};
G.offsetPolyline = (pts, off) => pts.map((p, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
  return [p[0] - dz / l * off, p[1] + dx / l * off];
});

/* ---------- Ereignisbus ---------- */
const listeners = {};
HSS.on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); return () => HSS.off(ev, fn); };
HSS.off = (ev, fn) => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); };
HSS.emit = (ev, data) => { (listeners[ev] || []).slice().forEach(fn => { const t = HSS._prof ? performance.now() : 0; try { fn(data); } catch (e) { console.error('[HSS]', ev, e); } if (HSS._prof) { const k = ev + ':' + (fn.name || fn.toString().slice(0, 60)); HSS._prof[k] = (HSS._prof[k] || 0) + performance.now() - t; } }); };

/* ---------- Projektmodell ---------- */
HSS.FORMAT = 'hss-project';
HSS.SCHEMA = 1;

HSS.defaults = {
  part: () => ({
    id: U.uid('part'), name: 'Bauteil', shape: 'rect', w: 40, d: 16, x: 0, z: 0, rot: 0,
    cornerRadius: 0, courtW: 14, courtD: 8, legW: 14, legD: 14, poly: null,
    stackOn: null, baseOffset: 0,
    floors: 4, floorHeight: 3.8, floorHeights: {}, basements: 1, basementHeight: 4.0,
    facade: { type: 'band', color: '#e9ecef', accent: '#144477', glass: '#6f8fa8', axis: 1.35, windowRatio: 0.55 },
    roof: { type: 'flach', parapet: 0.9, plant: true, color: '#9aa3ad' },
    use: ''
  }),
  building: () => ({ id: U.uid('bld'), name: 'Gebäude', kurz: 'A', color: '#144477', parts: [] }),
  path: kind => ({
    id: U.uid('path'), name: { strasse: 'Straße', weg: 'Campusweg', gehweg: 'Gehweg', zufahrt: 'Zufahrt', tunnel: 'Versorgungstunnel', awt: 'AWT-Trasse' }[kind] || 'Weg',
    kind, points: [], width: { strasse: 7, weg: 3.5, gehweg: 2.2, zufahrt: 5, tunnel: 3.5, awt: 2.2 }[kind] || 3,
    smooth: true, elev: (kind === 'tunnel' || kind === 'awt') ? 'absolut' : 'gelaende', y: -4.0, ramp: null,
    traffic: kind === 'strasse' ? 4 : 0, speedKmh: kind === 'strasse' ? 30 : null
  })
};

HSS.newProject = (name = 'Neues Projekt') => ({
  format: HSS.FORMAT, schema: HSS.SCHEMA, app: HSS.APP + ' ' + HSS.VERSION,
  meta: { id: U.uid('prj'), name, created: new Date().toISOString(), modified: new Date().toISOString(), notes: '' },
  settings: { sunHour: 14, grid: 0.5, units: 'm' },
  terrain: { size: 500, color: '#c9d6b8', tilt: { dir: 0, pct: 0 }, hills: [] },
  buildings: [],
  bridges: [],
  paths: [],
  areas: [],          // Flächen: Parkplatz, Grünfläche, Platz
  objects: [],        // platzierte Bibliotheksobjekte (außen und innen)
  interiors: {},      // { partId: { floorIndex: { walls:[], doors:[], rooms:[] } } }
  materials: [],
  transports: [],
  flows: [],
  rules: [],
  stations: [],
  places: [],         // zusätzliche Orte (z. B. externe Lieferanten)
  cameras: [],
  customLibrary: []   // im Projekt verwendete eigene Bibliotheksobjekte (für Portabilität)
});

/* ---------- Zustand, Undo/Redo ---------- */
const S = HSS.state = { project: HSS.newProject(), selection: null, dirty: false };
const undoStack = [], redoStack = [];
let lastSnap = null;
HSS.project = () => S.project;
HSS.snapshot = () => { lastSnap = JSON.stringify(S.project); };
// Änderung am Projekt: fn(project) mutiert direkt, danach wird neu aufgebaut
HSS.change = (label, fn, opts = {}) => {
  const before = JSON.stringify(S.project);
  fn(S.project);
  S.project.meta.modified = new Date().toISOString();
  if (!opts.noUndo) { undoStack.push({ label, json: before }); if (undoStack.length > 80) undoStack.shift(); redoStack.length = 0; }
  S.dirty = true;
  HSS.emit('changed', { label, scope: opts.scope || 'all', ids: opts.ids });
  autosave();
};
HSS.undo = () => {
  const u = undoStack.pop(); if (!u) return false;
  redoStack.push({ label: u.label, json: JSON.stringify(S.project) });
  S.project = JSON.parse(u.json);
  HSS.emit('changed', { label: 'Rückgängig: ' + u.label, scope: 'all' }); autosave();
  return u.label;
};
HSS.redo = () => {
  const r = redoStack.pop(); if (!r) return false;
  undoStack.push({ label: r.label, json: JSON.stringify(S.project) });
  S.project = JSON.parse(r.json);
  HSS.emit('changed', { label: 'Wiederholen: ' + r.label, scope: 'all' }); autosave();
  return r.label;
};
HSS.canUndo = () => undoStack.length > 0;
HSS.canRedo = () => redoStack.length > 0;

HSS.migrate = p => {
  if (!p || p.format !== HSS.FORMAT) throw new Error('Keine HSS-Projektdatei (format ≠ hss-project).');
  const base = HSS.newProject(p.meta?.name);
  for (const k of Object.keys(base)) if (p[k] === undefined) p[k] = base[k];
  p.schema = HSS.SCHEMA;
  for (const b of p.buildings) for (const pt of b.parts) {
    const d = HSS.defaults.part();
    for (const k of Object.keys(d)) if (pt[k] === undefined) pt[k] = d[k];
    pt.facade = Object.assign(d.facade, pt.facade); pt.roof = Object.assign(d.roof, pt.roof);
  }
  return p;
};
HSS.load = (p, opts = {}) => {
  S.project = HSS.migrate(U.clone(p));
  undoStack.length = 0; redoStack.length = 0;
  S.selection = null; S.dirty = false;
  if (S.project.customLibrary?.length && HSS.library) S.project.customLibrary.forEach(o => HSS.library.register(o, { source: 'projekt', silent: true }));
  HSS.emit('loaded', { demo: !!opts.demo });
  HSS.emit('changed', { label: 'Projekt geladen', scope: 'all' });
  if (!opts.noAutosave) autosave();
};

/* ---------- Gelände ---------- */
HSS.terrainH = (x, z, prj = S.project) => {
  const t = prj.terrain; if (!t) return 0;
  let h = 0;
  if (t.tilt && t.tilt.pct) { const a = U.rad(t.tilt.dir || 0); h += (x * Math.cos(a) + z * Math.sin(a)) * t.tilt.pct / 100; }
  for (const k of t.hills || []) {
    const d = Math.hypot(x - k.x, z - k.z), r = k.r || 40;
    if (k.plateau) { // Plateau mit weicher Böschung
      const inner = r * 0.6; h += d <= inner ? k.h : d >= r ? 0 : k.h * (0.5 + 0.5 * Math.cos(Math.PI * (d - inner) / (r - inner)));
    } else h += k.h * Math.exp(-(d * d) / (r * r));
  }
  return h;
};

/* ---------- Bauteile: Grundriss, Geschosse ---------- */
// Lokaler Grundriss (zentriert), danach Drehung und Lage
HSS.partFootprintLocal = pt => {
  const w = pt.w, d = pt.d, hw = w / 2, hd = d / 2;
  let outer, holes = [];
  switch (pt.shape) {
    case 'L': {
      const lw = U.clamp(pt.legW, 2, w - 2), ld = U.clamp(pt.legD, 2, d - 2);
      outer = [[-hw, -hd], [-hw + lw, -hd], [-hw + lw, hd - ld], [hw, hd - ld], [hw, hd], [-hw, hd]]; break;
    }
    case 'U': {
      const cw = U.clamp(pt.courtW, 2, w - 4), cd = U.clamp(pt.courtD, 2, d - 2);
      outer = [[-hw, -hd], [-cw / 2, -hd], [-cw / 2, -hd + cd], [cw / 2, -hd + cd], [cw / 2, -hd], [hw, -hd], [hw, hd], [-hw, hd]]; break;
    }
    case 'T': {
      const lw = U.clamp(pt.legW, 2, w - 2), ld = U.clamp(pt.legD, 2, d - 2);
      outer = [[-hw, -hd], [hw, -hd], [hw, -hd + ld], [lw / 2, -hd + ld], [lw / 2, hd], [-lw / 2, hd], [-lw / 2, -hd + ld], [-hw, -hd + ld]]; break;
    }
    case 'O': {
      outer = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
      const cw = U.clamp(pt.courtW, 2, w - 4) / 2, cd = U.clamp(pt.courtD, 2, d - 4) / 2;
      holes = [G.fillet([[-cw, -cd], [cw, -cd], [cw, cd], [-cw, cd]], Math.min(pt.cornerRadius * 0.5, cw, cd))]; break;
    }
    case 'rund': {
      const n = 48; outer = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; outer.push([Math.cos(a) * hw, Math.sin(a) * hd]); }
      return { outer, holes };
    }
    case 'poly':
      outer = (pt.poly && pt.poly.length >= 3) ? pt.poly.map(p => p.slice()) : [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]]; break;
    default:
      outer = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]];
  }
  outer = G.ccw(outer);
  if (pt.cornerRadius > 0) outer = G.fillet(outer, pt.cornerRadius, 8);
  return { outer, holes };
};
HSS.toWorld = (pt, p) => { const r = G.rot(p, U.rad(pt.rot || 0)); return [r[0] + pt.x, r[1] + pt.z]; };
HSS.toLocal = (pt, p) => G.rot([p[0] - pt.x, p[1] - pt.z], -U.rad(pt.rot || 0));
HSS.partFootprint = pt => { const l = HSS.partFootprintLocal(pt); return { outer: l.outer.map(p => HSS.toWorld(pt, p)), holes: l.holes.map(h => h.map(p => HSS.toWorld(pt, p))) }; };
HSS.partArea = pt => { const l = HSS.partFootprintLocal(pt); return Math.abs(G.area(l.outer)) - U.sum(l.holes.map(h => Math.abs(G.area(h)))); };

HSS.allParts = (prj = S.project) => prj.buildings.flatMap(b => b.parts);
HSS.findPart = (id, prj = S.project) => { for (const b of prj.buildings) for (const pt of b.parts) if (pt.id === id) return { part: pt, building: b }; return null; };

HSS.fh = (pt, f) => (f < 0 ? (pt.basementHeight || 4) : (pt.floorHeights?.[f] ?? pt.floorHeight));
// Geschossindex-Versatz (aufgesetzte Bauteile setzen die Zählung fort)
HSS.partFloorOffset = (pt, prj = S.project, depth = 0) => {
  if (!pt.stackOn || depth > 8) return pt.floorOffset || 0; // floorOffset: Bauteil beginnt in einem Obergeschoss (z. B. Brückenbau)
  const p = HSS.findPart(pt.stackOn, prj); if (!p) return pt.floorOffset || 0;
  return HSS.partFloorOffset(p.part, prj, depth + 1) + p.part.floors;
};
// Unterkante Erdgeschoss des Bauteils (absolute Höhe)
HSS.partBaseY = (pt, prj = S.project, depth = 0) => {
  if (pt.stackOn && depth < 8) {
    const p = HSS.findPart(pt.stackOn, prj);
    if (p) return HSS.partTopY(p.part, prj, depth + 1) + (pt.baseOffset || 0);
  }
  if (pt.baseY !== undefined && pt.baseY !== null && pt.baseFixed) return pt.baseY;
  return Math.round(HSS.terrainH(pt.x, pt.z, prj) * 10) / 10 + (pt.baseOffset || 0);
};
HSS.partTopY = (pt, prj = S.project, depth = 0) => { let y = HSS.partBaseY(pt, prj, depth); for (let f = 0; f < pt.floors; f++) y += HSS.fh(pt, f); return y; };
// Lokaler Geschossindex f (−basements … floors−1) → absolute Fußbodenhöhe
HSS.floorY = (pt, f, prj = S.project) => {
  let y = HSS.partBaseY(pt, prj);
  if (f >= 0) for (let i = 0; i < f; i++) y += HSS.fh(pt, i);
  else for (let i = -1; i >= f; i--) y -= HSS.fh(pt, i);
  return y;
};
HSS.partFloors = pt => { const a = []; const nb = pt.stackOn ? 0 : (pt.basements || 0); for (let f = -nb; f < pt.floors; f++) a.push(f); return a; };
// Globale Geschossbezeichnung
HSS.floorName = (gf) => (gf < 0 ? (gf === -1 ? 'UG' : (-gf) + '. UG') : gf === 0 ? 'EG' : gf + '. OG');
HSS.globalFloor = (pt, f, prj = S.project) => f + (f >= 0 ? HSS.partFloorOffset(pt, prj) : 0);
HSS.localFloor = (pt, gf, prj = S.project) => { const off = HSS.partFloorOffset(pt, prj); const f = gf >= 0 ? gf - off : gf; return HSS.partFloors(pt).includes(f) ? f : null; };

HSS.interior = (partId, f, create = false, prj = S.project) => {
  const I = prj.interiors[partId];
  if (I && I[f]) return I[f];
  if (!create) return null;
  prj.interiors[partId] = prj.interiors[partId] || {};
  return (prj.interiors[partId][f] = { walls: [], doors: [], rooms: [] });
};

/* ---------- Speicherung: IndexedDB (Projektablage, eigene Bibliothek) ---------- */
const DB_NAME = 'hss-db', DB_VER = 1;
let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => {
  if (!window.indexedDB) return rej(new Error('IndexedDB nicht verfügbar'));
  const r = indexedDB.open(DB_NAME, DB_VER);
  r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' }); if (!d.objectStoreNames.contains('library')) d.createObjectStore('library', { keyPath: 'id' }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const tx = async (store, mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction(store, mode); const st = t.objectStore(store); const out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); });
};
HSS.storage = {
  async saveProject(p = S.project) {
    const rec = { id: p.meta.id, name: p.meta.name, modified: p.meta.modified, json: JSON.stringify(p) };
    await tx('projects', 'readwrite', st => st.put(rec)); S.dirty = false; return rec;
  },
  async listProjects() { const all = await tx('projects', 'readonly', st => st.getAll()); return (all || []).map(r => ({ id: r.id, name: r.name, modified: r.modified, size: r.json.length })).sort((a, b) => b.modified.localeCompare(a.modified)); },
  async loadProject(id) { const r = await tx('projects', 'readonly', st => st.get(id)); return r ? JSON.parse(r.json) : null; },
  async deleteProject(id) { return tx('projects', 'readwrite', st => st.delete(id)); },
  async saveLibObject(o) { return tx('library', 'readwrite', st => st.put({ id: o.id, json: JSON.stringify(o) })); },
  async listLibObjects() { const all = await tx('library', 'readonly', st => st.getAll()); return (all || []).map(r => JSON.parse(r.json)); },
  async deleteLibObject(id) { return tx('library', 'readwrite', st => st.delete(id)); },
  exportFile(p = S.project) {
    const used = new Set(p.objects.map(o => o.lib));
    p.customLibrary = (HSS.library ? HSS.library.all().filter(o => o._source !== 'standard' && used.has(o.id)).map(o => HSS.library.serialize(o)) : p.customLibrary);
    const name = (p.meta.name || 'projekt').replace(/[^\wäöüÄÖÜß.-]+/g, '_') + '.hss.json';
    U.download(name, JSON.stringify(p, null, 1));
    S.dirty = false;
  },
  async importFile(file) { const txt = await U.readFile(file); const p = JSON.parse(txt); HSS.migrate(p); return p; }
};
const AUTOSAVE_KEY = 'hss-autosave-v1';
const autosave = U.debounce(() => {
  if (HSS.state.demoReadonly) return;
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(S.project)); } catch (e) { /* Speicher voll: nur IndexedDB */ }
  HSS.storage.saveProject().catch(() => {});
}, 1200);
HSS.autosaved = () => { try { const j = localStorage.getItem(AUTOSAVE_KEY); return j ? JSON.parse(j) : null; } catch (e) { return null; } };
HSS.clearAutosave = () => { try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* */ } };
})();
