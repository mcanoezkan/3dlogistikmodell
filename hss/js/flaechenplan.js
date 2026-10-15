/* =====================================================================
   HSS · flaechenplan.js – Flächenplanung ohne Räume
   Fachbereiche (z. B. „Innere Medizin, 1.500 m²“) werden direkt als Flächen auf
   die Geschosse gelegt – ohne Raumprogramm. Eine Fläche ist ein Abschnitt der
   Etage entlang ihrer Längsachse (Streifen über die ganze Tiefe) oder ein
   aufgezogenes Rechteck; gespeichert als Raum ohne Wände (zone: true) mit
   Fachbereich, Farbe und Soll-Fläche. Damit funktionieren Auswahl, Löschen,
   Inspektor, Flüsse und Rundgang wie bei Räumen.
     · automatisch einpassen: freier Abschnitt der Etage, genau so lang wie nötig,
       reicht die Etage nicht, geht es im nächsten Geschoss weiter
     · aufziehen: Rechteck auf der Etage ziehen
     · ziehen & ablegen: Fachbereich aus dem Panel auf ein Gebäude ziehen
     · Griffe: Anfang/Ende und Seiten der Fläche direkt im 3D-Bild verschieben
   Flächenplan-Ansicht: alle Gebäude als Geschossscheiben, jede Fläche in der
   Farbe ihres Fachbereichs, Legende mit Ist- und Soll-Flächen je Fachbereich.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE, CSS2DObject } = window.THREEX;
const S3 = HSS.s3, V = HSS.view;

/* ---------- Fachbereiche ---------- */
const FACH = [
  // Pflege
  ['innere', 'Innere Medizin', '#4f9d69', 'NUF6', 'Pflege'], ['kardio', 'Kardiologie', '#d1495b', 'NUF6', 'Pflege'],
  ['chirurgie', 'Allgemeinchirurgie', '#3a7ca5', 'NUF6', 'Pflege'], ['unfall', 'Unfallchirurgie / Orthopädie', '#2f5d8a', 'NUF6', 'Pflege'],
  ['neuro', 'Neurologie', '#8e7dbe', 'NUF6', 'Pflege'], ['stroke', 'Stroke Unit', '#b388eb', 'NUF6', 'Pflege'],
  ['gyn', 'Gynäkologie & Geburtshilfe', '#f28ab2', 'NUF6', 'Pflege'], ['paed', 'Kinder- und Jugendmedizin', '#f6bd60', 'NUF6', 'Pflege'],
  ['geriatrie', 'Geriatrie', '#84a59d', 'NUF6', 'Pflege'], ['onko', 'Onkologie / Hämatologie', '#c97b84', 'NUF6', 'Pflege'],
  ['psych', 'Psychiatrie', '#9a8c98', 'NUF6', 'Pflege'], ['psychosom', 'Psychosomatik', '#b5a8b8', 'NUF6', 'Pflege'],
  ['palliativ', 'Palliativmedizin', '#7fb7a4', 'NUF6', 'Pflege'], ['intensiv', 'Intensivstation', '#e4572e', 'NUF6', 'Pflege'],
  ['imc', 'Intermediate Care', '#f3a712', 'NUF6', 'Pflege'], ['pflege', 'Pflegestation (allgemein)', '#0A967A', 'NUF6', 'Pflege'],
  // Untersuchung & Behandlung
  ['zna', 'Zentrale Notaufnahme', '#c0392b', 'NUF6', 'Untersuchung & Behandlung'], ['op', 'Zentral-OP', '#1f6fb2', 'NUF6', 'Untersuchung & Behandlung'],
  ['radiologie', 'Radiologie', '#5dade2', 'NUF6', 'Untersuchung & Behandlung'], ['endoskopie', 'Endoskopie', '#48c9b0', 'NUF6', 'Untersuchung & Behandlung'],
  ['herzkatheter', 'Herzkatheterlabor', '#ec7063', 'NUF6', 'Untersuchung & Behandlung'], ['kreisssaal', 'Kreißsaal', '#f5a3b5', 'NUF6', 'Untersuchung & Behandlung'],
  ['labor', 'Labor', '#a569bd', 'NUF3', 'Untersuchung & Behandlung'], ['physio', 'Physiotherapie', '#58d68d', 'NUF6', 'Untersuchung & Behandlung'],
  ['ambulanz', 'Ambulanzen / MVZ', '#45b39d', 'NUF6', 'Untersuchung & Behandlung'], ['tagesklinik', 'Tagesklinik', '#8ecae6', 'NUF6', 'Untersuchung & Behandlung'],
  ['dialyse', 'Dialyse', '#76d7c4', 'NUF6', 'Untersuchung & Behandlung'], ['funktion', 'Funktionsdiagnostik', '#7fb3d5', 'NUF6', 'Untersuchung & Behandlung'],
  ['anaesthesie', 'Anästhesie', '#5b7bb4', 'NUF6', 'Untersuchung & Behandlung'], ['strahlen', 'Strahlentherapie', '#d4a017', 'NUF6', 'Untersuchung & Behandlung'],
  // Service & Verwaltung
  ['eingang', 'Eingangshalle & Information', '#f39c12', 'NUF1', 'Service & Verwaltung'], ['aufnahme', 'Patientenaufnahme', '#e59866', 'NUF2', 'Service & Verwaltung'],
  ['speisesaal', 'Cafeteria / Mitarbeiterrestaurant', '#f8c471', 'NUF1', 'Service & Verwaltung'], ['verwaltung', 'Verwaltung', '#6b2c82', 'NUF2', 'Service & Verwaltung'],
  ['lehre', 'Lehre, Schulung & Forschung', '#bb8fce', 'NUF5', 'Service & Verwaltung'], ['personal', 'Personal (Umkleiden, Bereitschaft)', '#d7bde2', 'NUF7', 'Service & Verwaltung'],
  ['seelsorge', 'Seelsorge & Sozialdienst', '#c39bd3', 'NUF1', 'Service & Verwaltung'], ['dienste', 'Allgemeine Dienste', '#b0a18f', 'NUF2', 'Service & Verwaltung'],
  // Ver- und Entsorgung, Technik
  ['apotheke', 'Apotheke', '#16a085', 'NUF4', 'Ver- und Entsorgung'], ['zsva', 'Sterilgutversorgung (ZSVA)', '#5d6d7e', 'NUF3', 'Ver- und Entsorgung'],
  ['kueche', 'Küche', '#ca6f1e', 'NUF3', 'Ver- und Entsorgung'], ['logistik', 'Logistik, Lager & Entsorgung', '#8d6e63', 'NUF4', 'Ver- und Entsorgung'],
  ['pathologie', 'Pathologie', '#7b7d7d', 'NUF3', 'Ver- und Entsorgung'], ['technik', 'Technik & IT', '#59636e', 'TF', 'Ver- und Entsorgung'],
  // Sonstiges
  ['reserve', 'Reserve / Entwicklungsfläche', '#b8c2cc', 'NUF7', 'Sonstiges'], ['extern', 'Fremdnutzung / Vermietung', '#a3a9b0', 'NUF7', 'Sonstiges']
];
HSS.ZONEN_FACH = FACH.map(([id, name, color, din, gruppe]) => ({ id, name, color, din, gruppe }));
HSS.ZONEN_GRUPPEN = [...new Set(FACH.map(f => f[4]))];
const fachOf = id => HSS.ZONEN_FACH.find(f => f.id === id);
HSS.zoneFach = fachOf;
HSS.ROOMTYPES.zone = { name: 'Fläche (Flächenplanung)', color: '#cfd8dc', din: 'NUF6' };
// Fachbereich einer Station oder eines Klinik-Bereichs
const STATION_FACH = { ambulanz: 'ambulanz', tagesklinik: 'tagesklinik', dialyse: 'dialyse', endoskopie: 'endoskopie', zna: 'zna', psychosom: 'psychosom' };
HSS.fachFromStation = st => { if (!st) return null; const k = st.bereich && st.bereich !== 'station' ? st.bereich : st.typ; return fachOf(STATION_FACH[k] || k) ? (STATION_FACH[k] || k) : (st.art === 'stationaer' ? 'pflege' : null); };

/* ---------- Geometrie ---------- */
const r2 = v => Math.round(v * 100) / 100;
const toUV = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c]; };
const fromUV = (q, a) => { const c = Math.cos(a), s = Math.sin(a); return [q[0] * c - q[1] * s, q[0] * s + q[1] * c]; };
function hull(pts) {
  const p = pts.map(q => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]); if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  up.pop(); lo.pop(); return lo.concat(up);
}
// Längsachse des Grundrisses (kleinstes umschließendes Rechteck, lange Seite = u)
const axCache = new Map();
HSS.zoneAxis = pt => {
  const loc = HSS.partFootprintLocal(pt).outer, key = JSON.stringify(loc); if (axCache.has(key)) return axCache.get(key);
  const h = hull(loc); let best = { a: 0, A: Infinity, du: 0, dv: 0 };
  for (let i = 0; i < h.length; i++) {
    const p = h[i], q = h[(i + 1) % h.length]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.5) continue;
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]); let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const x of h) { const [u, v] = toUV(x, a); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const A = (u1 - u0) * (v1 - v0); if (A < best.A - 1e-6) best = { a, A, du: u1 - u0, dv: v1 - v0 };
  }
  let a = best.a; if (best.du < best.dv) a += Math.PI / 2;
  while (a > Math.PI / 2 + 1e-9) a -= Math.PI; while (a <= -Math.PI / 2 + 1e-9) a += Math.PI;
  a = Math.round(a * 1e6) / 1e6; if (axCache.size > 500) axCache.clear(); axCache.set(key, a); return a;
};
const extentUV = (pts, a) => { let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity; for (const p of pts) { const [u, v] = toUV(p, a); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); } return { u0, u1, v0, v1 }; };
HSS.zoneExtent = (pt, a = HSS.zoneAxis(pt)) => extentUV(HSS.partFootprintLocal(pt).outer, a);
// Sutherland–Hodgman gegen eine achsparallele Halbebene im (u, v)-System
function clipHalf(poly, k, val, ge) {
  const out = [], n = poly.length; if (!n) return out;
  const inside = p => ge ? p[k] >= val - 1e-9 : p[k] <= val + 1e-9;
  for (let i = 0; i < n; i++) {
    const A = poly[i], B = poly[(i + 1) % n], ia = inside(A), ib = inside(B);
    const X = () => { const t = (val - A[k]) / ((B[k] - A[k]) || 1e-12); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]; };
    if (ia && ib) out.push(B); else if (ia && !ib) out.push(X()); else if (!ia && ib) { out.push(X()); out.push(B); }
  }
  return out;
}
const clipBox = (poly, b) => { let p = poly; for (const [k, v, ge] of [[0, b.u0, true], [0, b.u1, false], [1, b.v0, true], [1, b.v1, false]]) { if (v === null || v === undefined || !isFinite(v)) continue; p = clipHalf(p, k, v, ge); if (p.length < 3) return []; } return p; };
HSS.zoneUV = { toUV, fromUV };
const dedupe = p => p.filter((q, i) => { const n = p[(i + 1) % p.length]; return Math.hypot(q[0] - n[0], q[1] - n[1]) > 0.01; });
HSS.zoneGeom = (pt, zf) => {
  const a = zf.a ?? HSS.zoneAxis(pt), fp = HSS.partFootprintLocal(pt);
  const cut = ring => dedupe(clipBox(ring.map(p => toUV(p, a)), zf).map(q => fromUV(q, a)).map(q => [r2(q[0]), r2(q[1])]));
  const poly = cut(fp.outer), holes = poly.length >= 3 ? fp.holes.map(cut).filter(h => h.length >= 3) : [];
  const area = poly.length >= 3 ? Math.abs(G.area(poly)) - U.sum(holes.map(h => Math.abs(G.area(h)))) : 0;
  return { poly, holes, area: Math.max(0, area) };
};

/* ---------- Belegung einer Etage ---------- */
const isZone = r => r && (r.zone || r.noWalls);
HSS.isZone = isZone;
const roomPts = r => r.poly || [[r.x - r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z + r.d / 2], [r.x - r.w / 2, r.z + r.d / 2]];
// belegte Abschnitte entlang der Längsachse (Räume, Flächen)
function belegt(pt, f, a, prj, skip) {
  const I = HSS.interior(pt.id, f, false, prj); const iv = [];
  for (const r of I?.rooms || []) {
    if (skip && skip.has(r.id)) continue;
    if (r.zone && r.zf && Math.abs((r.zf.a ?? a) - a) < 1e-4 && isFinite(r.zf.u0) && isFinite(r.zf.u1)) { iv.push([r.zf.u0, r.zf.u1]); continue; }
    const e = extentUV(roomPts(r), a); iv.push([e.u0, e.u1]);
  }
  iv.sort((x, y) => x[0] - y[0]); const m = [];
  for (const x of iv) { const l = m[m.length - 1]; if (l && x[0] <= l[1] + 0.3) l[1] = Math.max(l[1], x[1]); else m.push(x.slice()); }
  return m;
}
HSS.zoneFree = (pt, f, prj = HSS.project(), skip) => {
  const a = HSS.zoneAxis(pt), E = HSS.zoneExtent(pt, a), occ = belegt(pt, f, a, prj, skip), free = []; let s = E.u0;
  for (const [o0, o1] of occ) { if (o0 > s + 2) free.push([s, Math.min(o0, E.u1)]); s = Math.max(s, o1); }
  if (E.u1 > s + 2) free.push([s, E.u1]);
  return { a, E, free: free.map(([s0, e0]) => ({ u0: s0, u1: e0, area: HSS.zoneGeom(pt, { a, u0: s0, u1: e0 }).area })).filter(x => x.area > 8) };
};
// Abschnitt der Etage mit der gewünschten Fläche (möglichst genau) finden
HSS.zoneFit = (pt, f, soll, prj = HSS.project(), o = {}) => {
  const { a, free } = HSS.zoneFree(pt, f, prj, o.skip); if (!free.length) return null;
  const areaOf = (s, t) => HSS.zoneGeom(pt, { a, u0: s, u1: t }).area;
  const fit = free.find(x => x.area >= soll * 0.98);
  if (!fit) { const b = free.reduce((x, y) => y.area > x.area ? y : x); return { a, u0: r2(b.u0), u1: r2(b.u1), area: b.area, partial: true }; }
  let lo = fit.u0, hi = fit.u1;
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (areaOf(fit.u0, m) < soll) lo = m; else hi = m; }
  let t = Math.min(fit.u1, Math.ceil(hi * 10) / 10);
  // schmale Reststreifen (< 4 m) nicht übrig lassen
  if (fit.u1 - t < 4 && areaOf(t, fit.u1) < soll * 0.15) t = fit.u1;
  return { a, u0: r2(fit.u0), u1: r2(t), area: areaOf(fit.u0, t) };
};

/* ---------- Flächen anlegen und ändern ---------- */
HSS.zoneRoom = (pt, spec, zf) => {
  const g = HSS.zoneGeom(pt, zf); if (g.poly.length < 3) return null;
  const fa = fachOf(spec.fach) || {}, bb = G.bbox(g.poly);
  const r = { id: spec.id || U.uid('zone'), zone: true, noWalls: true, use: 'zone', fach: spec.fach || null, name: spec.name || fa.name || 'Fläche', color: spec.color || fa.color || '#90a4ae', din: fa.din || 'NUF6',
    soll: spec.soll ? Math.round(spec.soll) : null, zf: { a: zf.a, u0: zf.u0 ?? null, u1: zf.u1 ?? null, v0: zf.v0 ?? null, v1: zf.v1 ?? null }, poly: g.poly, x: r2(bb.cx), z: r2(bb.cz), w: r2(bb.w), d: r2(bb.d) };
  if (g.holes.length) r.holes = g.holes;
  if (spec.station) r.station = spec.station;
  if (spec.hinweis) r.hinweis = spec.hinweis;
  return r;
};
HSS.zoneRefresh = (pt, r) => { const n = HSS.zoneRoom(pt, r, r.zf); if (!n) return false; for (const k of ['poly', 'x', 'z', 'w', 'd']) r[k] = n[k]; if (n.holes) r.holes = n.holes; else delete r.holes; return true; };
HSS.zoneArea = r => r.zone && r.zf ? Math.max(0, HSS.roomArea(r) - U.sum((r.holes || []).map(h => Math.abs(G.area(h))))) : HSS.roomArea(r);
// Reihenfolge der Geschosse beim Weiterverteilen: erst nach oben, dann nach unten
const floorOrder = (pt, f) => { const fs = HSS.partFloors(pt); return [f, ...fs.filter(x => x > f), ...fs.filter(x => x < f && x >= 0).reverse(), ...fs.filter(x => x < f && x < 0).reverse()].filter((x, i, a) => a.indexOf(x) === i); };
/* Fläche automatisch einpassen (innerhalb von HSS.change aufrufen) */
HSS.zoneAuto = (prj, partId, f, spec, o = {}) => {
  const P = HSS.findPart(partId, prj); if (!P) return { zones: [], rest: spec.soll };
  let rest = spec.soll || 0; const zones = [];
  const parts = [P.part, ...(o.spreadParts ? HSS.allParts(prj).filter(q => q.id !== P.part.id && (q.stackOn === P.part.id || P.part.stackOn === q.id)) : [])];
  for (const pt of parts) for (const fl of (o.spread === false ? [f] : floorOrder(pt, pt === P.part ? f : 0))) {
    if (rest < 25) break; if (!HSS.partFloors(pt).includes(fl)) continue;
    const fit = HSS.zoneFit(pt, fl, rest, prj); if (!fit || fit.area < 25) continue;
    const r = HSS.zoneRoom(pt, Object.assign({}, spec, { soll: zones.length || fit.partial ? Math.round(Math.min(rest, fit.area)) : spec.soll }), fit); if (!r) continue;
    HSS.interior(pt.id, fl, true, prj).rooms.push(r); zones.push({ part: pt.id, floor: fl, id: r.id, area: fit.area });
    rest -= fit.area;
    if (o.spread === false) break;
  }
  return { zones, rest: Math.max(0, Math.round(rest)) };
};
// Fläche auf ihre Soll-Größe bringen (Anfang bleibt, Ende wandert)
HSS.zoneToSoll = (prj, partId, f, id) => {
  const P = HSS.findPart(partId, prj), I = HSS.interior(partId, f, false, prj), r = I?.rooms.find(x => x.id === id); if (!P || !r?.zf || !r.soll) return false;
  const zf = r.zf, E = HSS.zoneExtent(P.part, zf.a), lim = HSS.zoneFree(P.part, f, prj, new Set([id])).free.find(x => x.u0 <= (zf.u0 ?? E.u0) + 0.5 && x.u1 >= (zf.u0 ?? E.u0) + 1);
  const u0 = zf.u0 ?? E.u0, uMax = lim ? lim.u1 : E.u1, areaOf = t => HSS.zoneGeom(P.part, Object.assign({}, zf, { u0, u1: t })).area;
  let lo = u0, hi = uMax; if (areaOf(hi) < r.soll) { zf.u1 = r2(hi); HSS.zoneRefresh(P.part, r); return 'max'; }
  for (let i = 0; i < 32; i++) { const m = (lo + hi) / 2; if (areaOf(m) < r.soll) lo = m; else hi = m; }
  zf.u0 = r2(u0); zf.u1 = r2(Math.ceil(hi * 10) / 10); HSS.zoneRefresh(P.part, r); return true;
};
// alle Flächen des Projekts
HSS.zonesAll = (prj = HSS.project()) => {
  const out = [];
  for (const b of prj.buildings) for (const pt of b.parts) for (const [f, I] of Object.entries(prj.interiors[pt.id] || {})) for (const r of I.rooms || []) {
    if (!r.zone) continue; out.push({ r, pt, b, f: +f, gf: HSS.globalFloor(pt, +f, prj), area: HSS.zoneArea(r) });
  }
  return out;
};
// Bilanz je Fachbereich: Flächen und detailliert geplante Stationen (wie in der Flächenplan-Ansicht)
HSS.zoneBilanz = (prj = HSS.project()) => {
  const by = new Map();
  for (const b of prj.buildings) for (const pt of b.parts) {
    if (!prj.interiors[pt.id]) continue;
    for (const f of HSS.partFloors(pt)) for (const z of floorBlocks(pt, f, prj)) {
      const k = z.fach || 'n:' + z.name, fa = fachOf(z.fach);
      if (!by.has(k)) by.set(k, { fach: z.fach, name: fa?.name || z.name, color: z.color, ist: 0, soll: 0, n: 0, items: [], sk: new Set() });
      const e = by.get(k); e.ist += z.area; e.n++;
      if (z.sollKey && !e.sk.has(z.sollKey)) { e.sk.add(z.sollKey); e.soll += z.soll || 0; }
      if (z.item) e.items.push(z.item);
    }
  }
  return [...by.values()].sort((a, b) => b.ist - a.ist);
};

/* =================== Flächenplan-Ansicht =================== */
const grad = (() => { const d = new Uint8Array([178, 210, 238, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const matCache = new Map();
function zmat(color, kind) {
  const cartoon = HSS.stil?.mode === 'cartoon', key = color + '|' + kind + '|' + cartoon; if (matCache.has(key)) return matCache.get(key);
  const base = { color, polygonOffset: kind === 'zone', polygonOffsetFactor: kind === 'zone' ? -1 : 0, polygonOffsetUnits: kind === 'zone' ? -2 : 0 };
  if (kind === 'ghost') Object.assign(base, { transparent: true, opacity: 0.35, depthWrite: false });
  const m = cartoon ? new THREE.MeshToonMaterial(Object.assign({ gradientMap: grad }, base)) : new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.75 }, base));
  m.userData.noToon = true; matCache.set(key, m); return m;
}
const edgeMat = new THREE.LineBasicMaterial({ color: '#3f4a56', transparent: true, opacity: 0.5 });
const addEdges = (mesh) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), edgeMat); e.userData.kontur = true; e.raycast = () => {}; mesh.add(e); };
const FREI = '#e4e8ec', FREI_DUNKEL = '#cfd5db';
// Bereiche einer Etage: Flächen und Stationen (detailliert geplant) als farbige Blöcke
function floorBlocks(pt, f, prj) {
  const I = HSS.interior(pt.id, f, false, prj), out = [];
  if (!I) return out;
  const a = HSS.zoneAxis(pt), byStation = new Map();
  for (const r of I.rooms) {
    if (r.zone) { const area = HSS.zoneArea(r); out.push({ poly: r.poly || roomPts(r), holes: r.holes || [], color: r.color || fachOf(r.fach)?.color || '#90a4ae', fach: r.fach, name: r.name, area, sollKey: r.auftrag || r.id, soll: r.auftragSoll || r.soll, item: { r, pt, f, gf: HSS.globalFloor(pt, f, prj), area }, meta: { kind: 'room', id: r.id, part: pt.id, floor: f } }); continue; }
    const st = r.station ? prj.stations.find(s => s.id === r.station) : null;
    if (r.noWalls && !st) { out.push({ poly: r.poly || roomPts(r), holes: [], color: r.color || HSS.ROOMTYPES[r.use]?.color || '#9fd3c7', fach: null, name: r.name || HSS.ROOMTYPES[r.use]?.name || 'Bereich', area: HSS.roomArea(r), meta: { kind: 'room', id: r.id, part: pt.id, floor: f } }); continue; }
    if (!st) continue;
    if (!byStation.has(st.id)) byStation.set(st.id, { st, rooms: [] }); byStation.get(st.id).rooms.push(r);
  }
  for (const { st, rooms } of byStation.values()) {
    const fach = HSS.fachFromStation(st), fa = fachOf(fach);
    const sk = 'st:' + st.id, soll = st.calc?.bedarf || null, nm = fa?.name || st.name;
    if (rooms.some(r => r.noWalls && (r.poly || r.w * r.d > 200))) { for (const r of rooms) out.push({ poly: r.poly || roomPts(r), holes: [], color: fa?.color || '#0A967A', fach, name: nm, area: HSS.roomArea(r), sollKey: sk, soll, meta: { kind: 'room', id: r.id, part: pt.id, floor: f } }); continue; }
    let u0 = Infinity, u1 = -Infinity; for (const r of rooms) { const e = extentUV(roomPts(r), a); u0 = Math.min(u0, e.u0); u1 = Math.max(u1, e.u1); }
    const g = HSS.zoneGeom(pt, { a, u0, u1 }); if (g.poly.length < 3) continue;
    out.push({ poly: g.poly, holes: g.holes, color: fa?.color || '#0A967A', fach, name: nm, area: g.area, sollKey: sk, soll, meta: { kind: 'room', id: rooms[0].id, part: pt.id, floor: f } });
  }
  return out;
}
function buildMassing(pt, building, view) {
  const prj = HSS.project(), grp = new THREE.Group(); grp.userData = { kind: 'part', id: pt.id, building: building.id };
  const fp = HSS.partFootprint(pt), ex = view.explode || 0, fokus = view.zonenFokus || null;
  const W = q => HSS.toWorld(pt, q);
  for (const f of HSS.partFloors(pt)) {
    const gf = HSS.globalFloor(pt, f, prj), y0 = HSS.floorY(pt, f, prj) + gf * ex, h = HSS.fh(pt, f);
    const base = new THREE.Mesh(HSS.slabGeo(fp.outer, fp.holes, y0 + 0.12, Math.max(0.6, h - 0.62)), zmat(f < 0 ? FREI_DUNKEL : FREI, 'base'));
    base.userData = { kind: 'part', id: pt.id, building: building.id, floor: f, gf }; base.castShadow = true; base.receiveShadow = true; addEdges(base); grp.add(base);
    for (const z of floorBlocks(pt, f, prj)) {
      const dim = fokus && z.fach !== fokus;
      const m = new THREE.Mesh(HSS.slabGeo(z.poly.map(W), z.holes.map(hh => hh.map(W)), y0 + 0.08, Math.max(0.6, h - 0.38)), zmat(dim ? '#d9dee3' : z.color, dim ? 'ghost' : 'zone'));
      m.userData = Object.assign({}, z.meta, { zoneBlock: true }); m.castShadow = !dim; addEdges(m); grp.add(m);
    }
  }
  // Dach als dünne Platte
  const top = HSS.partTopY(pt, prj) + (HSS.partFloors(pt).length ? (HSS.globalFloor(pt, pt.floors - 1, prj)) * ex : 0);
  const roof = new THREE.Mesh(HSS.slabGeo(fp.outer, fp.holes, top - 0.3, 0.3), zmat('#f7f8f9', 'base')); roof.userData = { kind: 'part', id: pt.id, building: building.id, roof: true }; grp.add(roof);
  return grp;
}
const buildPart0 = HSS.buildPart;
HSS.buildPart = (pt, b, view = {}) => (view.zonen && (view.floor === null || view.floor === undefined)) ? buildMassing(pt, b, view) : buildPart0(pt, b, view);
// Schlüssel für den Gebäude-Zwischenspeicher: Flächen und Stationen des Bauteils
HSS.zoneKey = (pt, prj = HSS.project()) => { const I = prj.interiors[pt.id] || {}; let s = V.zonenFokus || ''; for (const f of Object.keys(I).sort()) for (const r of I[f].rooms || []) if (r.zone || r.noWalls || r.station) s += r.id + (r.zone ? JSON.stringify(r.zf) + r.color : '') + (r.station ? r.station + (prj.stations.find(x => x.id === r.station)?.typ || '') : '') + ';'; return s; };

/* Beschriftung der Flächen in der Flächenplan-Ansicht */
function zoneLabels() {
  const L = S3.layers.labels; if (!V.zonen || !V.labels || V.floor !== null) return;
  const prj = HSS.project(), ex = V.explode || 0;
  for (const z of HSS.zonesAll(prj)) {
    if (z.area < 60) continue; if (V.zonenFokus && z.r.fach !== V.zonenFokus) continue;
    const c = G.bbox(z.r.poly || roomPts(z.r)), w = HSS.toWorld(z.pt, [c.cx, c.cz]);
    const el = document.createElement('div'); el.className = 'zlbl'; el.style.setProperty('--c', z.r.color || '#90a4ae');
    el.innerHTML = `<i></i><span>${U.esc(z.r.name)}</span><b>${U.fmt(z.area)} m²</b>`; el.title = `${z.r.name} · ${HSS.floorName(z.gf)} · ${U.fmt(z.area)} m²${z.r.soll ? ' (Soll ' + U.fmt(z.r.soll) + ' m²)' : ''}`;
    el.onclick = () => S3.select({ kind: 'room', id: z.r.id, part: z.pt.id, floor: z.f });
    const o = new CSS2DObject(el); o.position.set(w[0], HSS.floorY(z.pt, z.f, prj) + z.gf * ex + HSS.fh(z.pt, z.f) * 0.55, w[1]); L.add(o);
  }
}

/* Legende */
function legend() {
  let el = document.getElementById('zLegend');
  if (!V.zonen) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'zLegend'; document.body.appendChild(el); }
  const bil = HSS.zoneBilanz(), tot = U.sum(bil.map(e => e.ist));
  el.hidden = false;
  el.innerHTML = `<div class="zh"><b>Flächenplan</b><span>${U.fmt(tot)} m² verplant</span><button class="mini" data-zx title="Flächenplan-Ansicht schließen">×</button></div>` + (bil.length ? `<div class="zl">${bil.map(e => `<button class="zi ${V.zonenFokus && V.zonenFokus === e.fach ? 'on' : ''} ${V.zonenFokus && V.zonenFokus !== e.fach ? 'dim' : ''}" data-zf="${U.esc(e.fach || '')}" title="Klick: nur diesen Fachbereich hervorheben"><i style="background:${U.esc(e.color)}"></i><span>${U.esc(e.name)}</span><b>${U.fmt(e.ist)} m²</b>${e.soll ? `<small class="${e.ist >= e.soll * 0.97 ? 'ok' : 'low'}">Soll ${U.fmt(e.soll)}</small>` : ''}</button>`).join('')}</div>` : '<div class="note" style="padding:6px 8px">Noch keine Flächen. Fachbereich im Arbeitsbereich „Flächenplanung“ auf ein Gebäude ziehen.</div>') + `<div class="zfoot"><span><i style="background:${FREI}"></i> frei</span></div>`;
  el.querySelector('[data-zx]').onclick = () => HSS.zonen.setView(false);
  el.querySelectorAll('[data-zf]').forEach(b => b.onclick = () => { const f = b.dataset.zf || null; V.zonenFokus = V.zonenFokus === f ? null : f; S3.rebuild('all'); });
}

const Z = HSS.zonen = {};
Z.setView = (on) => {
  V.zonen = on; if (!on) V.zonenFokus = null;
  document.body.classList.toggle('zonen', on);
  const b = document.getElementById('vZon'); if (b) b.classList.toggle('on', on);
  if (on && V.floor !== null) { V.floor = null; HSS.ui?.refreshViewbar?.(); }
  S3.rebuild('all'); HSS.emit('view');
};
Z.toggle = () => Z.setView(!V.zonen);

/* =================== Werkzeuge =================== */
const ghostMat = new THREE.MeshBasicMaterial({ color: '#0A967A', transparent: true, opacity: 0.38, depthTest: false, side: THREE.DoubleSide });
const ghostLine = new THREE.LineBasicMaterial({ color: '#0A223C', depthTest: false });
const clearGhost = () => { const g = S3.layers.ghost; while (g.children.length) g.remove(g.children[0]); };
function drawGhost(pt, f, poly, color) {
  clearGhost(); if (!poly || poly.length < 3) return;
  const prj = HSS.project(), gf = HSS.globalFloor(pt, f, prj), y = HSS.floorY(pt, f, prj) + gf * (V.explode || 0) + (V.zonen && V.floor === null ? HSS.fh(pt, f) - 0.2 : 0.35);
  const W = poly.map(q => HSS.toWorld(pt, q));
  const m = new THREE.Mesh(HSS.slabGeo(W, [], y, 0.12), color ? Object.assign(ghostMat.clone(), { color: new THREE.Color(color) }) : ghostMat); m.renderOrder = 44; S3.layers.ghost.add(m);
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(W.concat([W[0]]).map(q => new THREE.Vector3(q[0], y + 0.14, q[1]))), ghostLine); l.renderOrder = 45; S3.layers.ghost.add(l);
  HSS.perf?.invalidate(2);
}
const floorAt = (pt, y) => { const prj = HSS.project(), ex = V.explode || 0; let best = HSS.partFloors(pt)[0]; for (const f of HSS.partFloors(pt)) if (HSS.floorY(pt, f, prj) + HSS.globalFloor(pt, f, prj) * ex <= y + 0.4) best = f; return best; };
// Bauteil und Geschoss unter dem Mauszeiger
Z.hitFloor = (ev) => {
  const h = S3.pick(ev); if (!h) return null;
  const pid = h.kind === 'part' ? h.id : (h.kind === 'room' || h.kind === 'wall') ? h.part : null; if (!pid) return null;
  const P = HSS.findPart(pid); if (!P || P.part.use === 'parkhaus') return null;
  let f = V.floor !== null ? HSS.localFloor(P.part, V.floor) : (h.floor !== undefined && h.floor !== null ? h.floor : floorAt(P.part, h.point.y));
  if (f === null || f === undefined) f = floorAt(P.part, h.point.y);
  return { pt: P.part, f };
};
const spec = () => { const i = UI().zInp, fa = fachOf(i.fach); return { fach: i.fach, name: (i.name || '').trim() || fa?.name, color: fa?.color, soll: Math.max(20, +i.soll || 0) }; };
const UI = () => HSS.ui;
function placeAt(pt, f, sp, o = {}) {
  if (HSS.state.demoReadonly) return UI().toast('Demo ist schreibgeschützt');
  let rep; HSS.manip?.mark();
  const auftrag = U.uid('auf');
  HSS.change('Fläche einpassen', prj => { rep = HSS.zoneAuto(prj, pt.id, f, Object.assign({}, sp), { spread: o.spread !== false }); for (const z of rep.zones) { const r = HSS.interior(z.part, z.floor, false, prj).rooms.find(x => x.id === z.id); r.auftrag = auftrag; r.auftragSoll = sp.soll; } });
  if (!rep.zones.length) { UI().toast('Auf diesem Geschoss ist kein freier Abschnitt mehr. Anderes Geschoss wählen oder Flächen verkleinern.', 4200); return null; }
  const where = rep.zones.map(z => { const P = HSS.findPart(z.part); return `${P.building.kurz || ''} ${HSS.floorName(HSS.globalFloor(P.part, z.floor))}`; });
  UI().toast(`${sp.name}: ${U.fmt(sp.soll - rep.rest)} m² auf ${where.join(', ')}${rep.rest > 0 ? ` – ${U.fmt(rep.rest)} m² fehlen noch (Gebäude voll)` : ''}`, 4500);
  const z0 = rep.zones[0]; S3.select({ kind: 'room', id: z0.id, part: z0.part, floor: z0.floor });
  return rep;
}
Z.placeAt = placeAt;
/* Fachbereich ins 3D-Bild ziehen: Vorschau auf dem Geschoss unter der Maus, loslassen legt die Fläche an */
Z.toolPlace = (sp0) => {
  const sp = sp0 || spec(); let cur = null, key = '';
  S3.select(null);
  S3.setTool({
    name: 'zoneplace',
    move(ev) {
      const hf = Z.hitFloor(ev); if (!hf) { cur = null; key = ''; clearGhost(); UI().hint(`<b>${U.esc(sp.name)}</b> (${U.fmt(sp.soll)} m²) auf ein Gebäude ziehen`); return; }
      const k = hf.pt.id + '|' + hf.f; if (k === key) return; key = k; cur = hf;
      const fit = HSS.zoneFit(hf.pt, hf.f, sp.soll, HSS.project());
      if (!fit) { clearGhost(); UI().hint(`${HSS.floorName(HSS.globalFloor(hf.pt, hf.f))}: kein freier Abschnitt`); return; }
      drawGhost(hf.pt, hf.f, HSS.zoneGeom(hf.pt, fit).poly, sp.color);
      UI().hint(`<b>${U.esc(sp.name)}</b> → ${U.esc(HSS.findPart(hf.pt.id).building.kurz || '')} ${U.esc(hf.pt.name)} · ${HSS.floorName(HSS.globalFloor(hf.pt, hf.f))} · ${U.fmt(fit.area)} m²${fit.partial ? ` (Rest ${U.fmt(sp.soll - fit.area)} m² in weiteren Geschossen)` : ''} · loslassen/klicken`);
    },
    click(ev) { if (!cur) this.move(ev); if (!cur) return; const c = cur; clearGhost(); S3.setTool(null); UI().hint(null); placeAt(c.pt, c.f, sp, { spread: UI().zInp.spread }); },
    cancel() { clearGhost(); UI().hint(null); }
  });
  UI().hint(`<b>${U.esc(sp.name)}</b> (${U.fmt(sp.soll)} m²): auf ein Gebäude klicken – die Fläche wird ins Geschoss unter der Maus eingepasst · Esc: abbrechen`);
};
/* Fläche als Rechteck aufziehen (Etagenansicht) */
Z.toolDraw = (partId, f) => {
  const P = HSS.findPart(partId); if (!P) return UI().toast('Erst Gebäude und Geschoss wählen');
  const pt = P.part, prj = HSS.project(), gf = HSS.globalFloor(pt, f, prj), sp = spec();
  if (V.zonen) Z.setView(false);
  if (V.floor !== gf) S3.setFloor(gf);
  const a = HSS.zoneAxis(pt), E = HSS.zoneExtent(pt, a);
  const y = () => HSS.floorY(pt, f, prj) + gf * (V.explode || 0);
  const uvAt = ev => { const rc = S3.ray(ev), p = new THREE.Vector3(); if (!rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y()), p)) return null; const l = HSS.toLocal(pt, [p.x, p.z]); const q = toUV(l, a); return [Math.round(q[0] * 2) / 2, Math.round(q[1] * 2) / 2]; };
  let A = null, B = null;
  const box = () => { let u0 = Math.min(A[0], B[0]), u1 = Math.max(A[0], B[0]), v0 = Math.min(A[1], B[1]), v1 = Math.max(A[1], B[1]); if (v1 - v0 > (E.v1 - E.v0) * 0.85 || B.shift) { v0 = null; v1 = null; } return { a, u0, u1, v0, v1 }; };
  S3.select(null);
  S3.setTool({
    name: 'zonedraw',
    down(ev) { if (ev.button !== 0) return; const q = uvAt(ev); if (!q) return; A = q; B = q.slice(); S3.controls.enabled = false; },
    move(ev) {
      if (!A) { UI().hint(`<b>${U.esc(sp.name)}</b>: Fläche auf ${HSS.floorName(gf)} aufziehen (Maustaste gedrückt halten) · Umschalt: ganze Gebäudetiefe`); return; }
      const q = uvAt(ev); if (!q) return; B = q; B.shift = ev.shiftKey;
      const g = HSS.zoneGeom(pt, box()); drawGhost(pt, f, g.poly, sp.color);
      UI().hint(`<b>${U.fmt(g.area)} m²</b>${sp.soll ? ` von ${U.fmt(sp.soll)} m² Soll (${U.pct(g.area / sp.soll)})` : ''} · loslassen zum Anlegen`);
    },
    up() {
      S3.controls.enabled = true; if (!A || !B) return; const zf = box(); A = B = null; clearGhost();
      const g = HSS.zoneGeom(pt, zf); if (g.area < 6) return;
      let id; HSS.manip?.mark();
      HSS.change('Fläche aufziehen', p => { const r = HSS.zoneRoom(pt, Object.assign({}, sp, { soll: sp.soll }), zf); HSS.interior(pt.id, f, true, p).rooms.push(r); id = r.id; });
      S3.setTool(null); UI().hint(null); S3.select({ kind: 'room', id, part: pt.id, floor: f });
      UI().toast(`${sp.name}: ${U.fmt(g.area)} m² angelegt – Griffe ⇔ ⇕ zum Anpassen`, 3500);
    },
    cancel() { S3.controls.enabled = true; clearGhost(); UI().hint(null); }
  });
  UI().hint(`<b>${U.esc(sp.name)}</b>: Fläche auf ${HSS.floorName(gf)} aufziehen · Esc: abbrechen`);
};

/* Flächenliste als CSV */
Z.csv = () => {
  const rows = [['Fachbereich', 'Bezeichnung', 'Gebäude', 'Bauteil', 'Geschoss', 'Fläche m²', 'Soll m² (Auftrag)']];
  for (const z of HSS.zonesAll()) rows.push([fachOf(z.r.fach)?.name || '', z.r.name, z.b.kurz || z.b.name, z.pt.name, HSS.floorName(z.gf), Math.round(z.area), z.r.auftragSoll || z.r.soll || '']);
  const csv = '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = (HSS.project().meta.name || 'Projekt').replace(/[^\wäöüÄÖÜß-]+/g, '_') + '_Flaechen.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* =================== Arbeitsbereich „Flächenplanung“ =================== */
function initUI() {
  const ui = HSS.ui, $ = ui.$, $$ = ui.$$, opt = ui.opt;
  ui.zInp = ui.zInp || { fach: 'innere', name: '', soll: 1500, part: null, f: 0, spread: true };
  const parts = prj => HSS.allParts(prj).filter(pt => pt.use !== 'parkhaus' && !/parkhaus/i.test(pt.name) && HSS.partArea(pt) > 80 && (!prj.buildings.find(b => b.parts.includes(pt))?.umgebung));
  ui.ws.zonen = { name: 'Flächenplanung', short: 'Flächen-planung', step: '4', lead: 'Nur Flächen statt Räume: Fachbereiche mit ihrer Größe in m² auf Gebäude und Geschosse legen – für Masterplan, Varianten und den Überblick über den ganzen Campus.',
    render(el) {
      const prj = HSS.project(), inp = ui.zInp, list = parts(prj);
      if (!inp.part || !HSS.findPart(inp.part, prj)) { const s = HSS.state.selection; inp.part = (s?.kind === 'part' && list.some(p => p.id === s.id)) ? s.id : (list.slice().sort((a, b) => HSS.partArea(b) * HSS.partFloors(b).length - HSS.partArea(a) * HSS.partFloors(a).length)[0]?.id || null); }
      const P = inp.part && HSS.findPart(inp.part, prj);
      if (P && !HSS.partFloors(P.part).includes(inp.f)) inp.f = Math.min(Math.max(0, HSS.partFloors(P.part)[0]), P.part.floors - 1);
      const fa = fachOf(inp.fach);
      const free = P ? HSS.zoneFree(P.part, inp.f, prj) : null, bgf = P ? HSS.partArea(P.part) : 0, frei = free ? U.sum(free.free.map(x => x.area)) : 0;
      const bil = HSS.zoneBilanz(prj), zonen = HSS.zonesAll(prj);
      const byGrp = HSS.ZONEN_GRUPPEN.map(g => `<div class="note zg">${U.esc(g)}</div><div class="chips zchips">${HSS.ZONEN_FACH.filter(f => f.gruppe === g).map(f => `<button class="chip zc ${inp.fach === f.id ? 'on' : ''}" data-zfach="${f.id}" style="--c:${f.color}" title="Klicken zum Wählen · ins 3D-Bild auf ein Gebäude ziehen"><i></i>${U.esc(f.name)}</button>`).join('')}</div>`).join('');
      el.innerHTML = `<h3>1 · Fachbereich</h3>
        <p class="note">Wählen – oder direkt aus der Liste <b>auf ein Gebäude im 3D-Bild ziehen</b>: die Fläche wird in das Geschoss unter der Maus eingepasst.</p>
        ${byGrp}
        <div class="fg"><label class="f full"><span>Bezeichnung (optional)</span><input type="text" id="zN" value="${U.esc(inp.name)}" placeholder="${U.esc(fa?.name || '')}"></label></div>
        <h3>2 · Fläche</h3>
        <div class="fg"><label class="f"><span>Soll-Fläche [m²]</span><input type="number" id="zS" value="${inp.soll}" min="20" step="50"></label></div>
        <div class="chips">${[250, 500, 750, 1000, 1500, 2000, 3000, 5000].map(v => `<button class="chip ${+inp.soll === v ? 'on' : ''}" data-zs="${v}">${U.fmt(v)}</button>`).join('')}</div>
        <h3>3 · Gebäude &amp; Geschoss</h3>
        ${list.length ? `<div class="fg"><label class="f full"><span>Gebäude / Bauteil</span><select id="zP">${list.map(pt => { const b = HSS.findPart(pt.id, prj).building; return opt(pt.id, `${b.kurz ? b.kurz + ' · ' : ''}${pt.name} (${U.fmt(HSS.partArea(pt))} m²/Geschoss)`, inp.part); }).join('')}</select></label></div>
        <div class="floorpick">${P ? HSS.partFloors(P.part).slice().reverse().map(f => { const fr = U.sum(HSS.zoneFree(P.part, f, prj).free.map(x => x.area)); return `<button data-zfl="${f}" class="${f === inp.f ? 'on' : ''}" title="${U.fmt(fr)} m² frei">${HSS.floorName(HSS.globalFloor(P.part, f, prj))}<small>${fr < 30 ? 'voll' : U.fmt(fr)}</small></button>`; }).join('') : ''}</div>
        <div class="note">${P ? `${U.esc(HSS.floorName(HSS.globalFloor(P.part, inp.f, prj)))}: ${U.fmt(bgf)} m² Grundfläche, davon <b>${U.fmt(frei)} m² frei</b>. Gebäude im 3D-Bild anklicken wählt es hier aus.` : ''}</div>` : '<div class="warnbox">Noch keine Gebäude. Erst Gebäude anlegen („Gebäude“ oder 2D-Plan).</div>'}
        <label class="chk"><input type="checkbox" id="zSp" ${inp.spread ? 'checked' : ''}> reicht das Geschoss nicht, in den nächsten Geschossen weiterführen</label>
        <div class="actions"><button class="primary big" id="zGo" ${P ? '' : 'disabled'}>▶ Fläche einpassen</button><button id="zDraw" ${P ? '' : 'disabled'} title="Rechteck auf der Etage aufziehen">✎ Aufziehen</button></div>
        <div class="note">Danach im 3D-Bild an den Griffen <b>⇔ ⇕</b> verlängern oder kürzen, mit <b>✥</b> verschieben. Im Inspektor: Fachbereich, Name, Farbe, „auf Soll bringen“.</div>
        <h3>Ansicht</h3>
        <div class="actions"><button class="${V.zonen ? 'primary' : ''}" id="zView">${V.zonen ? '✓ Flächenplan-Ansicht' : 'Flächenplan-Ansicht'}</button><button id="zExp" title="Geschosse auseinanderziehen">Geschosse ${V.explode > 0 ? 'zusammen' : 'auseinander'}</button></div>
        <h3>Bilanz (${zonen.length} Flächen, ${U.fmt(U.sum(zonen.map(z => z.area)))} m²)</h3>
        ${bil.length ? `<table class="t zt"><tr><th>Fachbereich</th><th class="n">Ist m²</th><th class="n">Soll m²</th></tr>${bil.map(e => `<tr data-zb="${U.esc(e.fach || '')}"><td><span class="sw" style="background:${U.esc(e.color)}"></span> ${U.esc(e.name)} <span class="note">(${e.n})</span></td><td class="n">${U.fmt(e.ist)}</td><td class="n">${e.soll ? U.fmt(e.soll) + ` <span class="amp ${e.ist >= e.soll * 0.97 ? 'g' : e.ist >= e.soll * 0.85 ? 'y' : 'r'}"></span>` : '–'}</td></tr>`).join('')}</table>
        <details><summary class="note"><b>Alle Flächen</b></summary><div class="list">${zonen.slice().sort((a, b) => (a.b.kurz || '').localeCompare(b.b.kurz || '') || b.gf - a.gf).map(z => `<div class="li" data-zr="${z.r.id}|${z.pt.id}|${z.f}"><span class="sw" style="background:${U.esc(z.r.color)}"></span><span class="t">${U.esc(z.r.name)}</span><span class="s">${U.esc(z.b.kurz || '')} ${HSS.floorName(z.gf)} · ${U.fmt(z.area)} m²</span><button class="mini" data-zdel="${z.r.id}|${z.pt.id}|${z.f}" title="Fläche löschen">×</button></div>`).join('')}</div></details>
        <div class="actions"><button id="zCsv">Flächenliste (CSV)</button><button class="danger" id="zClr">Alle Flächen löschen</button></div>` : '<p class="note">Noch keine Flächen.</p>'}`;
      $$('[data-zfach]', el).forEach(b => { b.onclick = () => { inp.fach = b.dataset.zfach; inp.name = ''; ui.renderPanel(); }; HSS.manip?.dragFrom(b, () => { inp.fach = b.dataset.zfach; inp.name = ''; Z.toolPlace(); }); });
      $('#zN', el).onchange = e => { inp.name = e.target.value; };
      $('#zS', el).onchange = e => { inp.soll = Math.max(20, +e.target.value || 0); ui.renderPanel(); };
      $$('[data-zs]', el).forEach(b => b.onclick = () => { inp.soll = +b.dataset.zs; ui.renderPanel(); });
      $('#zP', el) && ($('#zP', el).onchange = e => { inp.part = e.target.value; ui.renderPanel(); HSS.s3.focusSel({ kind: 'part', id: inp.part }); });
      $$('[data-zfl]', el).forEach(b => b.onclick = () => { inp.f = +b.dataset.zfl; ui.renderPanel(); });
      $('#zSp', el).onchange = e => { inp.spread = e.target.checked; };
      $('#zGo', el) && ($('#zGo', el).onclick = () => { if (!P) return; inp.name = $('#zN', el).value; placeAt(P.part, inp.f, spec(), { spread: inp.spread }); ui.renderPanel(); });
      $('#zDraw', el) && ($('#zDraw', el).onclick = () => { inp.name = $('#zN', el).value; Z.toolDraw(inp.part, inp.f); });
      $('#zView', el).onclick = () => { Z.toggle(); ui.renderPanel(); };
      $('#zExp', el).onclick = () => { V.explode = V.explode > 0 ? 0 : 6; const r = document.getElementById('vExplode'); if (r) r.value = V.explode; HSS.s3.rebuild('all'); ui.renderPanel(); };
      $$('[data-zb]', el).forEach(tr => tr.onclick = () => { if (!V.zonen) Z.setView(true); const f = tr.dataset.zb || null; V.zonenFokus = V.zonenFokus === f ? null : f; HSS.s3.rebuild('all'); });
      $$('[data-zr]', el).forEach(li => li.onclick = e => { if (e.target.dataset.zdel) return; const [id, part, f] = li.dataset.zr.split('|'); HSS.s3.select({ kind: 'room', id, part, floor: +f }, { focus: true }); });
      $$('[data-zdel]', el).forEach(b => b.onclick = () => { const [id, part, f] = b.dataset.zdel.split('|'); HSS.change('Fläche löschen', p => { const I = HSS.interior(part, +f, false, p); if (I) I.rooms = I.rooms.filter(r => r.id !== id); }); ui.renderPanel(); });
      $('#zCsv', el) && ($('#zCsv', el).onclick = Z.csv);
      $('#zClr', el) && ($('#zClr', el).onclick = async () => { if (!await ui.confirm('Alle Flächen löschen', 'Alle Flächen der Flächenplanung entfernen? Räume und Stationen bleiben erhalten.', 'Löschen')) return; HSS.change('Flächen löschen', p => { for (const I of Object.values(p.interiors)) for (const fl of Object.values(I)) fl.rooms = (fl.rooms || []).filter(r => !r.zone); }); ui.renderPanel(); });
    } };
  // Arbeitsbereich hinter dem Klinik-Planer einsortieren, Symbol ergänzen
  const ws = ui.ws, keys = Object.keys(ws).filter(x => x !== 'zonen'), i = Math.max(keys.indexOf('klinik'), keys.indexOf('station'));
  const order = keys.slice(0, i + 1).concat(['zonen'], keys.slice(i + 1)), copy = Object.assign({}, ws);
  for (const x of Object.keys(ws)) delete ws[x]; for (const x of order) ws[x] = copy[x];
  const build0 = ui.buildRail;
  ui.buildRail = () => { build0(); const b = document.querySelector('#rail button[data-ws="zonen"] svg'); if (b) b.innerHTML = '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h9v10M12 4v6M12 14h9"/>'; };

  HSS.on('selection', sel => {
    if (sel?.kind === 'part' && ui.current === 'zonen') { const P = HSS.findPart(sel.id); if (P && parts(HSS.project()).some(p => p.id === sel.id)) { ui.zInp.part = sel.id; if (sel.floor !== undefined && sel.floor !== null && HSS.partFloors(P.part).includes(sel.floor)) ui.zInp.f = sel.floor; ui.renderPanel(); } }
    if (sel?.kind === 'room' && ui.current === 'zonen') { const r = HSS.interior(sel.part, sel.floor)?.rooms.find(x => x.id === sel.id); if (r?.zone) { ui.zInp.part = sel.part; ui.zInp.f = sel.floor; ui.renderPanel(); } }
  });
}

/* Inspektor-Erweiterung: Flächen statt Räume */
HSS.zoneInspector = (s) => {
  const ui = HSS.ui, I = HSS.interior(s.part, s.floor); const r = I?.rooms.find(x => x.id === s.id); if (!r?.zone) return null;
  const P = HSS.findPart(s.part), a = HSS.zoneArea(r), gf = HSS.globalFloor(P.part, s.floor);
  const opts = HSS.ZONEN_GRUPPEN.map(g => `<optgroup label="${U.esc(g)}">${HSS.ZONEN_FACH.filter(f => f.gruppe === g).map(f => ui.opt(f.id, f.name, r.fach || '')).join('')}</optgroup>`).join('');
  return `<div class="ih"><div><div class="kicker">Fläche · Flächenplanung</div><h2>${U.esc(r.name)}</h2></div><button class="x" title="Auswahl aufheben (Esc)">×</button></div>
  <div class="kpi"><div><b>${U.fmt(a)} m²</b><span>Ist</span></div><div><b>${r.soll ? U.fmt(r.soll) + ' m²' : '–'}</b><span>Soll${r.soll ? ` · <span class="amp ${a >= r.soll * 0.97 ? 'g' : a >= r.soll * 0.85 ? 'y' : 'r'}"></span>${U.pct(a / r.soll)}` : ''}</span></div></div>
  <div class="note">${U.esc(P.building.kurz || '')} ${U.esc(P.part.name)} · ${HSS.floorName(gf)}${r.auftragSoll && r.auftragSoll !== r.soll ? ` · Teil eines Auftrags über ${U.fmt(r.auftragSoll)} m²` : ''}</div>
  <div class="fg"><label class="f full"><span>Fachbereich</span><select id="zfF">${opts}</select></label>${ui.fTxt('Bezeichnung', 'name', r.name)}${ui.fNum('Soll-Fläche', 'soll', r.soll || 0, { unit: 'm²', step: 50 })}${ui.fCol('Farbe', 'color', r.color)}</div>
  ${r.hinweis ? `<div class="note" style="color:#0A223C">${U.esc(r.hinweis)}</div>` : ''}
  <div class="note">Griffe im 3D-Bild: <b>⇔</b> Anfang/Ende, <b>⇕</b> Seiten, <b>✥</b> verschieben.</div>
  <div class="actions">${r.soll ? '<button id="zfSoll" class="primary" title="Ende der Fläche so verschieben, dass sie die Soll-Fläche erreicht">Auf Soll bringen</button>' : ''}<button id="zfFull" title="Fläche über die ganze Gebäudetiefe ziehen">Ganze Tiefe</button><button class="danger" id="iDel">Löschen</button></div>`;
};
HSS.zoneInspectorBind = (el, s) => {
  const ui = HSS.ui, $ = ui.$;
  ui.bind(el, prj => HSS.interior(s.part, s.floor, false, prj)?.rooms.find(x => x.id === s.id), 'Fläche', 'all');
  $('#zfF', el).onchange = e => HSS.change('Fachbereich', prj => { const r = HSS.interior(s.part, s.floor, false, prj).rooms.find(x => x.id === s.id), fa = fachOf(e.target.value); if (!r || !fa) return; const alt = fachOf(r.fach); if (!r.name || r.name === alt?.name) r.name = fa.name; r.fach = fa.id; r.color = fa.color; r.din = fa.din; });
  $('#zfSoll', el) && ($('#zfSoll', el).onclick = () => { let res; HSS.change('Auf Soll bringen', prj => { res = HSS.zoneToSoll(prj, s.part, s.floor, s.id); }); if (res === 'max') ui.toast('Bis zur nächsten Fläche bzw. zum Gebäudeende verlängert – Soll nicht ganz erreicht'); });
  $('#zfFull', el).onclick = () => HSS.change('Ganze Tiefe', prj => { const P = HSS.findPart(s.part, prj), r = HSS.interior(s.part, s.floor, false, prj).rooms.find(x => x.id === s.id); r.zf.v0 = null; r.zf.v1 = null; HSS.zoneRefresh(P.part, r); });
  $('#iDel', el).onclick = ui.deleteSelection;
};

/* Planungsergebnis: Stationsplaner und Klinik-Planer können „nur Flächen“ anlegen */
HSS.zoneFromCards = (prj, prog, where) => {
  const rep = { zones: 0, rest: [], m2: 0 };
  const cards = prog.cards.filter(c => where[c.id]).sort((a, b) => a.prio - b.prio);
  for (const c of cards) {
    const [part, fs] = where[c.id].split('|'), f = +fs;
    const fach = c.kind === 'station' ? (fachOf(c.fach) ? c.fach : 'pflege') : (fachOf(c.bereich) ? c.bereich : 'reserve'), fa = fachOf(fach);
    const r = HSS.zoneAuto(prj, part, f, { fach, name: c.name, color: fa?.color, soll: Math.round(c.m2), hinweis: c.betten ? `${c.betten} Betten (Klinik-Planer)` : 'Klinik-Planer' }, { spread: true });
    rep.zones += r.zones.length; rep.m2 += Math.round(c.m2) - r.rest; if (r.rest > 25) rep.rest.push(`${c.name}: ${U.fmt(r.rest)} m²`);
    const auf = U.uid('auf'); for (const z of r.zones) { const rr = HSS.interior(z.part, z.floor, false, prj).rooms.find(x => x.id === z.id); rr.auftrag = auf; rr.auftragSoll = Math.round(c.m2); }
  }
  return rep;
};

HSS.on?.('rebuilt', () => { zoneLabels(); legend(); });
(() => {
  initUI();
  const vb = document.getElementById('vM2');
  if (vb && !document.getElementById('vZon')) { const b = document.createElement('button'); b.className = 'tgl'; b.id = 'vZon'; b.title = 'Flächenplan: alle Gebäude als Geschossscheiben, Flächen je Fachbereich farbig'; b.textContent = 'Flächenplan'; b.onclick = () => Z.toggle(); vb.after(b); }
})();
})();
