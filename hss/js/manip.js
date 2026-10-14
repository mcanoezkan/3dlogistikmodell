/* =====================================================================
   HSS · manip.js – Direktbearbeitung wie in einem Aufbauspiel
   Gewähltes Element direkt im 3D-Bild bearbeiten:
     · Ziehen am Element verschiebt es (Gebäude samt aufgesetzten Bauteilen)
     · Griffe an den Seiten ändern Länge und Tiefe, der Drehgriff dreht,
       der Höhengriff setzt Geschosse auf oder nimmt sie weg
     · Wege: Punkte ziehen, „+“ zwischen zwei Punkten fügt einen Knick ein,
       Breitengriff, ganzen Weg drehen oder verschieben
     · Brücken: Anschlusspunkte entlang der Fassade ziehen; „Brücke ziehen“
       verbindet zwei Gebäude per Klick von Fassade zu Fassade
   Neben dem Element erscheint eine Werkzeugleiste: drehen, Geschoss + / −,
   kopieren, löschen, ✓ übernehmen, ✗ verwerfen (alle Änderungen seit der Auswahl).
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE } = window.THREEX;
const S3 = HSS.s3;
const M = HSS.manip = { dragging: false, session: null, _mark: null, moveWhole: false };
const V3 = THREE.Vector3;
const SNAP = 0.5;
const snap = (v, s = SNAP) => Math.round(v / s) * s;

/* ---------- Griff-Symbole (Sprites mit fester Bildschirmgröße) ---------- */
const ICONS = {
  resize: { glyph: '⇔', ring: '#0A967A' }, resizeV: { glyph: '⇕', ring: '#0A967A' },
  rotate: { glyph: '⟳', ring: '#d9531e' }, height: { glyph: '⇕', ring: '#2D7694' },
  point: { glyph: '', ring: '#0A967A', dot: true }, pointOn: { glyph: '', ring: '#f2a516', dot: true },
  insert: { glyph: '+', ring: '#8a96a3', small: true }, width: { glyph: '⇔', ring: '#6b2c82' },
  bridge: { glyph: '◆', ring: '#891F5E' }, move: { glyph: '✥', ring: '#144477' }
};
const matCache = {};
function iconMat(kind) {
  if (matCache[kind]) return matCache[kind];
  const ic = ICONS[kind], c = document.createElement('canvas'); c.width = c.height = 96;
  const x = c.getContext('2d');
  x.beginPath(); x.arc(48, 48, 40, 0, Math.PI * 2); x.fillStyle = '#ffffff'; x.fill();
  x.lineWidth = 9; x.strokeStyle = ic.ring; x.stroke();
  if (ic.dot) { x.beginPath(); x.arc(48, 48, 17, 0, Math.PI * 2); x.fillStyle = ic.ring; x.fill(); }
  if (ic.glyph) { x.fillStyle = ic.ring; x.font = 'bold 50px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic.glyph, 48, 52); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2;
  return (matCache[kind] = new THREE.SpriteMaterial({ map: t, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true }));
}
let layer = null;
const handles = [];
function addHandle(kind, pos, data = {}) {
  const sp = new THREE.Sprite(iconMat(kind)); sp.position.copy(pos);
  const s = ICONS[kind].small ? 0.026 : 0.036; sp.scale.set(s, s, 1); sp.renderOrder = 40;
  sp.userData = Object.assign({ handle: kind }, data); layer.add(sp); handles.push(sp); return sp;
}
function clearHandles() { for (const h of handles) layer.remove(h); handles.length = 0; while (layer.children.length) layer.remove(layer.children[0]); }
const guideMat = new THREE.LineDashedMaterial({ color: '#0A967A', dashSize: 1, gapSize: 0.6, depthTest: false, transparent: true });
function addLine(pts) { const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, guideMat); l.computeLineDistances(); l.renderOrder = 39; layer.add(l); return l; }

/* ---------- Hilfen ---------- */
const prj = () => HSS.project();
M.moveSet = (partId, p = prj()) => {
  const out = [partId], seen = new Set(out);
  const P = HSS.findPart(partId, p);
  if (M.moveWhole && P) for (const q of P.building.parts) if (!seen.has(q.id)) { seen.add(q.id); out.push(q.id); }
  for (let i = 0; i < out.length; i++) for (const q of HSS.allParts(p)) if (q.stackOn === out[i] && !seen.has(q.id)) { seen.add(q.id); out.push(q.id); }
  return out;
};
const ro = () => HSS.state.demoReadonly;
const planeHit = (ev, y) => { const rc = S3.ray(ev), p = new V3(); return rc.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), -y), p) ? p : null; };
const vertHit = (ev, c) => { const rc = S3.ray(ev), n = S3.camera.position.clone().sub(c); n.y = 0; if (n.lengthSq() < 1e-6) n.set(1, 0, 0); n.normalize(); const p = new V3(); return rc.ray.intersectPlane(new THREE.Plane().setFromNormalAndCoplanarPoint(n, c), p) ? p : null; };
const hint = h => HSS.ui.hint(h);
const fmt = (v, d = 1) => U.fmt(v, d);
const selKey = s => s ? s.kind + ':' + s.id : '';
const pathY = (p, q) => p.elev === 'absolut' ? (p.y ?? -4) : HSS.terrainH(q[0], q[1]);
const ghost = () => S3.layers.ghost;
function clearGhost() { const g = ghost(); while (g.children.length) g.remove(g.children[0]); }
const groupOf = id => { for (const k of ['build', 'paths', 'areas', 'objects']) for (const c of S3.layers[k].children) if (c.userData?.id === id) return c; return S3.groups.get(id); };
// Vorschau: Original ausblenden, neu aufgebaute Gruppe zeigen (höchstens einmal je Bild)
let pvPending = null;
function preview(id, make) {
  pvPending = () => {
    clearGhost(); const g = make(); if (!g) return;
    const o = groupOf(id); if (o) o.visible = false;
    HSS.stil?.applyTo(g, g.userData?.kind === 'path' ? 'paths' : 'build');
    ghost().add(g); HSS.perf?.invalidate(2);
  };
}
HSS.on('frame', () => { if (pvPending) { const f = pvPending; pvPending = null; f(); } if (M.bar && !M.bar.hidden) placeBar(); });

/* ---------- Griffe je Elementart ---------- */
function partFrame(pt) {
  const loc = HSS.partFootprintLocal(pt), bb = G.bbox(loc.outer);
  const top = HSS.partTopY(pt) + 0.6;
  const W = (lx, lz, y = top) => { const w = HSS.toWorld(pt, [lx, lz]); return new V3(w[0], y, w[1]); };
  return { bb, top, W };
}
function buildHandles() {
  clearHandles();
  const sel = HSS.state.selection;
  if (!sel || ro() || S3.tool || S3.fpvActive) return;
  const p = prj();
  if (sel.kind === 'part') {
    const P = HSS.findPart(sel.id); if (!P) return; const pt = P.part, { bb, top, W } = partFrame(pt);
    addHandle('resize', W(bb.x1 + 1.2, bb.cz), { op: 'edge', ax: 'x', sg: 1 });
    addHandle('resize', W(bb.x0 - 1.2, bb.cz), { op: 'edge', ax: 'x', sg: -1 });
    addHandle('resizeV', W(bb.cx, bb.z1 + 1.2), { op: 'edge', ax: 'z', sg: 1 });
    addHandle('resizeV', W(bb.cx, bb.z0 - 1.2), { op: 'edge', ax: 'z', sg: -1 });
    addHandle('rotate', W(bb.x1 + 3, bb.z0 - 3), { op: 'rot' });
    addHandle('height', W(bb.x0 + Math.min(8, bb.w * 0.2), bb.z0 + Math.min(4, bb.d * 0.25), top + 2.5), { op: 'height' });
    addHandle('move', W(bb.x1 - Math.min(8, bb.w * 0.2), bb.z1 - Math.min(4, bb.d * 0.25), top + 1.5), { op: 'move' });
    const r = [W(bb.x0, bb.z0), W(bb.x1, bb.z0), W(bb.x1, bb.z1), W(bb.x0, bb.z1), W(bb.x0, bb.z0)]; addLine(r);
  } else if (sel.kind === 'area') {
    const a = U.byId(p.areas, sel.id); if (!a || a.poly) return;
    const y = HSS.terrainH(a.x, a.z) + 0.6, W = (lx, lz) => { const q = G.rot([lx, lz], U.rad(a.rot || 0)); return new V3(q[0] + a.x, y, q[1] + a.z); };
    addHandle('resize', W(a.w / 2 + 1.2, 0), { op: 'edge', ax: 'x', sg: 1 }); addHandle('resize', W(-a.w / 2 - 1.2, 0), { op: 'edge', ax: 'x', sg: -1 });
    addHandle('resizeV', W(0, a.d / 2 + 1.2), { op: 'edge', ax: 'z', sg: 1 }); addHandle('resizeV', W(0, -a.d / 2 - 1.2), { op: 'edge', ax: 'z', sg: -1 });
    addHandle('rotate', W(a.w / 2 + 3, -a.d / 2 - 3), { op: 'rot' });
  } else if (sel.kind === 'object') {
    const o = U.byId(p.objects, sel.id); if (!o) return; const d = HSS.library.get(o.lib); const s = o.size || d?.size || { w: 1, d: 1, h: 1 };
    const w = HSS.objWorld(o); const r = Math.max(0.6, Math.hypot(s.w, s.d) / 2 + 0.4);
    addHandle('rotate', new V3(w.x + r, w.y + s.h + 0.3, w.z - r * 0.4), { op: 'rot' });
  } else if (sel.kind === 'path') {
    const pa = U.byId(p.paths, sel.id); if (!pa || pa.points.length < 2) return;
    pa.points.forEach((q, i) => addHandle(sel.point === i ? 'pointOn' : 'point', new V3(q[0], pathY(pa, q) + 0.8, q[1]), { op: 'point', idx: i }));
    for (let i = 0; i < pa.points.length - 1; i++) { const a = pa.points[i], b = pa.points[i + 1]; if (G.dist(a, b) < 4) continue; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; addHandle('insert', new V3(m[0], pathY(pa, m) + 0.8, m[1]), { op: 'insert', idx: i + 1 }); }
    // Breite und Drehung an der Wegmitte
    const L = HSS.pathLine(pa); if (L.length > 1) {
      const tot = L[L.length - 1][3], P = HSS.sampleLine(L, tot / 2), nx = -Math.sin(P.ang), nz = Math.cos(P.ang), w = (pa.width || 3) / 2 + 1.2;
      addHandle('width', new V3(P.x + nx * w, P.y + 0.8, P.z + nz * w), { op: 'width' });
      const c = centroid(pa.points); addHandle('rotate', new V3(c[0] - nx * (w + 3), pathY(pa, c) + 0.8, c[1] - nz * (w + 3)), { op: 'rot' });
    }
  } else if (sel.kind === 'bridge') {
    const br = U.byId(p.bridges, sel.id); const e = br && HSS.bridgeEnds(br); if (!e) return;
    addHandle('bridge', new V3(e.pa[0], e.ya + 1.5, e.pa[1]), { op: 'bend', end: 'a' });
    addHandle('bridge', new V3(e.pb[0], e.yb + 1.5, e.pb[1]), { op: 'bend', end: 'b' });
  } else if (sel.kind === 'room') {
    const P = HSS.findPart(sel.part); const r = HSS.interior(sel.part, sel.floor)?.rooms.find(x => x.id === sel.id); if (!P || !r) return;
    if (r.zone && r.zf && HSS.zoneUV) { zoneHandles(P.part, sel.floor, r); HSS.perf?.invalidate(2); return; }
    const y = roomY(P.part, sel.floor) + 1.4, W = (lx, lz) => { const w = HSS.toWorld(P.part, [lx, lz]); return new V3(w[0], y, w[1]); };
    addHandle('resize', W(r.x + r.w / 2 + 0.5, r.z), { op: 'edge', ax: 'x', sg: 1 }); addHandle('resize', W(r.x - r.w / 2 - 0.5, r.z), { op: 'edge', ax: 'x', sg: -1 });
    addHandle('resizeV', W(r.x, r.z + r.d / 2 + 0.5), { op: 'edge', ax: 'z', sg: 1 }); addHandle('resizeV', W(r.x, r.z - r.d / 2 - 0.5), { op: 'edge', ax: 'z', sg: -1 });
  }
  HSS.perf?.invalidate(2);
}
const centroid = pts => [U.sum(pts.map(q => q[0])) / pts.length, U.sum(pts.map(q => q[1])) / pts.length];
// Fußbodenhöhe eines Geschosses in der aktuellen Ansicht (Explosion berücksichtigt); in der Flächenplan-Ansicht Oberkante der Geschossscheibe
const roomY = (pt, f) => HSS.floorY(pt, f) + HSS.globalFloor(pt, f) * (HSS.view.explode || 0);
const zoneTop = (pt, f) => roomY(pt, f) + (HSS.view.zonen && HSS.view.floor === null ? HSS.fh(pt, f) - 0.1 : 1.4);
// Flächen (Flächenplanung): Anfang/Ende entlang der Längsachse, Seiten, Verschieben
function zoneBox(pt, r) { const zf = r.zf, E = HSS.zoneExtent(pt, zf.a); return { E, u0: zf.u0 ?? E.u0, u1: zf.u1 ?? E.u1, v0: zf.v0 ?? E.v0, v1: zf.v1 ?? E.v1 }; }
function zoneHandles(pt, f, r) {
  const { fromUV } = HSS.zoneUV, a = r.zf.a, b = zoneBox(pt, r), y = zoneTop(pt, f);
  const W = (u, v, yy = y) => { const l = fromUV([u, v], a), w = HSS.toWorld(pt, l); return new V3(w[0], yy, w[1]); };
  const um = (b.u0 + b.u1) / 2, vm = (b.v0 + b.v1) / 2;
  addHandle('resize', W(b.u1 + 1.5, vm), { op: 'zedge', e: 'u1' }); addHandle('resize', W(b.u0 - 1.5, vm), { op: 'zedge', e: 'u0' });
  addHandle('resizeV', W(um, b.v1 + 1.5), { op: 'zedge', e: 'v1' }); addHandle('resizeV', W(um, b.v0 - 1.5), { op: 'zedge', e: 'v0' });
  addHandle('move', W(um, vm, y + 1.2), { op: 'move' });
  const poly = (r.poly || []).map(q => { const w = HSS.toWorld(pt, q); return new V3(w[0], y + 0.05, w[1]); }); if (poly.length > 2) addLine(poly.concat([poly[0]]));
}
function dragZone(hit, fine) {
  const { toUV, fromUV } = HSS.zoneUV, r0 = D.r0, pt = D.part, sel = D.sel, a = r0.zf.a, b0 = zoneBox(pt, r0), E = b0.E;
  const q = toUV(HSS.toLocal(pt, [hit.x, hit.z]), a), st = fine ? 0.1 : 0.5, sn = v => Math.round(v / st) * st;
  const full = r0.zf.v0 === null || r0.zf.v0 === undefined;
  // nicht in benachbarte Flächen hinein: freier Abschnitt, in dem die Fläche liegt
  if (!D.lim) { const fr = HSS.zoneFree(pt, sel.floor, prj(), new Set([r0.id])).free; D.lim = (full && fr.find(x => x.u0 <= b0.u0 + 0.6 && x.u1 >= b0.u1 - 0.6)) || { u0: E.u0, u1: E.u1 }; }
  const lim = D.lim, c = { u0: b0.u0, u1: b0.u1, v0: b0.v0, v1: b0.v1 };
  if (D.op === 'zedge') {
    const e = D.e, sg = e.endsWith('1') ? 1 : -1, k = e[0] === 'u' ? 0 : 1; let v = sn(q[k] - sg * 1.5);
    if (e === 'u1') v = U.clamp(v, c.u0 + 2, lim.u1); if (e === 'u0') v = U.clamp(v, lim.u0, c.u1 - 2);
    if (e === 'v1') v = U.clamp(v, c.v0 + 2, E.v1); if (e === 'v0') v = U.clamp(v, E.v0, c.v1 - 2);
    c[e] = v;
  } else if (D.op === 'move') {
    const q0 = toUV(HSS.toLocal(pt, [D.p0.x, D.p0.z]), a); let du = sn(q[0] - q0[0]); du = U.clamp(du, lim.u0 - c.u0, lim.u1 - c.u1); c.u0 += du; c.u1 += du;
    if (!full) { let dv = sn(q[1] - q0[1]); dv = U.clamp(dv, E.v0 - c.v0, E.v1 - c.v1); c.v0 += dv; c.v1 += dv; }
  }
  const tiefe = (D.op === 'zedge' && D.e[0] === 'v') || !full;
  const nzf = { a, u0: Math.round(c.u0 * 100) / 100, u1: Math.round(c.u1 * 100) / 100, v0: tiefe && (c.v0 > E.v0 + 0.3 || c.v1 < E.v1 - 0.3) ? Math.round(c.v0 * 100) / 100 : null, v1: tiefe && (c.v0 > E.v0 + 0.3 || c.v1 < E.v1 - 0.3) ? Math.round(c.v1 * 100) / 100 : null };
  const g = HSS.zoneGeom(pt, nzf); clearGhost();
  const y = zoneTop(pt, sel.floor) + 0.1, pts = g.poly.map(p => { const w = HSS.toWorld(pt, p); return new V3(w[0], y, w[1]); });
  if (pts.length > 2) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.concat([pts[0]])), new THREE.LineBasicMaterial({ color: '#d9531e', depthTest: false })); l.renderOrder = 41; ghost().add(l); }
  void fromUV;
  hint(`<b>${U.esc(r0.name || 'Fläche')}</b> · <b>${fmt(g.area, 0)} m²</b>${r0.soll ? ` von ${fmt(r0.soll, 0)} m² Soll (${U.pct(g.area / r0.soll)})` : ''} · ${fmt(c.u1 - c.u0)} m lang`);
  D.commit = () => HSS.change('Fläche ändern', p => { const r = HSS.interior(sel.part, sel.floor, false, p)?.rooms.find(x => x.id === sel.id); const P = HSS.findPart(sel.part, p); if (!r || !P) return; r.zf = nzf; HSS.zoneRefresh(P.part, r); });
}

/* ---------- Ziehen ---------- */
let D = null; // aktiver Ziehvorgang
function pickHandle(ev) { if (!handles.length) return null; const rc = S3.ray(ev); const h = rc.intersectObjects(handles, false)[0]; return h ? h.object : null; }
function sameSel(h, sel) { if (!h || !sel) return false; if (sel.kind === 'part') return h.kind === 'part' && M.moveSet(sel.id).includes(h.id); if (sel.kind === 'room') return h.kind === 'room' && h.id === sel.id; return h.kind === sel.kind && h.id === sel.id; }

function onDown(ev) {
  if (ev.button !== 0 || S3.tool || S3.fpvActive || ro()) return;
  const sel = HSS.state.selection; if (!sel) return;
  const hd = pickHandle(ev);
  if (hd) { start(ev, hd.userData, sel); ev.stopImmediatePropagation(); return; }
  const h = S3.pick(ev);
  if (sameSel(h, sel) && ['part', 'area', 'object', 'path', 'room', 'bridge'].includes(sel.kind) && sel.kind !== 'bridge') { D = { armed: true, op: 'move', sel: U.clone(sel), x0: ev.clientX, y0: ev.clientY, p0: h.point.clone(), ev0: ev }; S3.controls.enabled = false; }
}
function start(ev, hd, sel) {
  D = Object.assign({ armed: false, sel: U.clone(sel), x0: ev.clientX, y0: ev.clientY }, hd);
  if (hd.op === 'move') { const P = sel.kind === 'part' ? HSS.findPart(sel.id) : null; D.p0 = new V3(0, P ? HSS.partTopY(P.part) + 1.5 : 0, 0); D.ev0 = ev; }
  if (hd.op === 'insert') D.op = 'insert';
  begin(ev);
}
function begin(ev) {
  const p = prj(), sel = D.sel;
  S3.controls.enabled = false; M.dragging = true; HSS.perf && (HSS.perf.dragging = true);
  if (sel.kind === 'part') {
    const P = HSS.findPart(sel.id); D.pt0 = U.clone(P.part); D.b = P.building; D.ids = M.moveSet(sel.id); D.parts0 = D.ids.map(id => U.clone(HSS.findPart(id).part));
    D.y = D.op === 'move' ? D.p0.y : HSS.partTopY(P.part) + 0.6;
    if (D.op === 'move') D.p0 = planeHit(D.ev0 || ev, D.y) || D.p0;
    if (D.op === 'rot') { D.c = new V3(P.part.x, D.y, P.part.z); const h = planeHit(ev, D.y); D.a0 = Math.atan2(h.z - D.c.z, h.x - D.c.x); }
    if (D.op === 'height') D.c = new V3(P.part.x, HSS.partBaseY(P.part), P.part.z);
  } else if (sel.kind === 'area') {
    const a = U.byId(p.areas, sel.id); D.a0 = U.clone(a); D.y = HSS.terrainH(a.x, a.z) + 0.2;
    if (D.op === 'move') D.p0 = planeHit(D.ev0 || ev, D.y) || D.p0;
    if (D.op === 'rot') { const h = planeHit(ev, D.y); D.ang0 = Math.atan2(h.z - a.z, h.x - a.x); }
  } else if (sel.kind === 'object') {
    const o = U.byId(p.objects, sel.id); D.o0 = U.clone(o); const w = HSS.objWorld(o); D.w0 = w; D.y = w.y;
    if (D.op === 'move') D.p0 = planeHit(D.ev0 || ev, D.y) || D.p0;
    if (D.op === 'rot') { const h = planeHit(ev, D.y); D.ang0 = Math.atan2(h.z - w.z, h.x - w.x); }
  } else if (sel.kind === 'path') {
    const pa = U.byId(p.paths, sel.id); D.pa0 = U.clone(pa);
    D.y = pathY(pa, pa.points[D.idx ?? 0] || pa.points[0]);
    if (D.op === 'insert') { const a = pa.points[D.idx - 1], b = pa.points[D.idx]; D.pa0.points.splice(D.idx, 0, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); D.op = 'point'; }
    if (D.op === 'move') D.p0 = planeHit(D.ev0 || ev, D.y) || D.p0;
    if (D.op === 'rot') { D.c = centroid(pa.points); const h = planeHit(ev, D.y); D.ang0 = Math.atan2(h.z - D.c[1], h.x - D.c[0]); }
  } else if (sel.kind === 'room') {
    const P = HSS.findPart(sel.part), r = HSS.interior(sel.part, sel.floor).rooms.find(x => x.id === sel.id);
    D.part = P.part; D.r0 = U.clone(r); D.y = r.zone && r.zf ? zoneTop(P.part, sel.floor) : roomY(P.part, sel.floor); D.lim = null;
    if (D.op === 'move') D.p0 = planeHit(D.ev0 || ev, D.y) || D.p0;
  } else if (sel.kind === 'bridge') {
    const br = U.byId(p.bridges, sel.id); D.br0 = U.clone(br); const e = HSS.bridgeEnds(br); D.y = D.end === 'a' ? e.ya : e.yb;
  }
  bar(false);
}
function onMove(ev) {
  if (!D) return;
  if (D.armed) { if (Math.hypot(ev.clientX - D.x0, ev.clientY - D.y0) < 5) return; D.armed = false; begin(ev); }
  if (!M.dragging) return;
  const fine = ev.shiftKey, p = prj(), sel = D.sel;
  const hit = D.op === 'height' ? vertHit(ev, D.c) : planeHit(ev, D.y); if (!hit) return;
  if (sel.kind === 'part') dragPart(hit, fine);
  else if (sel.kind === 'area') dragArea(hit, fine);
  else if (sel.kind === 'object') dragObject(hit, fine, ev);
  else if (sel.kind === 'path') dragPath(hit, fine, ev);
  else if (sel.kind === 'room') dragRoom(hit, fine);
  else if (sel.kind === 'bridge') dragBridge(hit);
  HSS.perf?.invalidate(2);
}
function onUp() {
  if (!D) return;
  const d = D; D = null; S3.controls.enabled = true;
  if (!M.dragging) return; // nur geklickt
  M.dragging = false; HSS.perf && (HSS.perf.dragging = false);
  if (d.commit) { const c = d.commit; c(); }
  else { clearGhost(); restoreGroups(d); }
  setTimeout(() => { clearGhost(); buildHandles(); bar(true); }, 0);
}
function restoreGroups(d) {
  for (const id of d.ids || [d.sel.id]) { const g = groupOf(id); if (g) { g.visible = true; g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); } }
  HSS.perf?.invalidate(2);
}

/* Gebäudeteil */
function dragPart(hit, fine) {
  const pt0 = D.pt0, sel = D.sel;
  if (D.op === 'move') {
    let dx = hit.x - D.p0.x, dz = hit.z - D.p0.z;
    if (!fine) { dx = snap(dx); dz = snap(dz); }
    const m = magnet(pt0, dx, dz); dx = m[0]; dz = m[1];
    for (const id of D.ids) { const g = groupOf(id); if (g) g.position.set(dx, 0, dz); }
    hint(`<b>Verschieben</b> · ${fmt(Math.hypot(dx, dz))} m${m[2] ? ' · <b>bündig angedockt</b>' : ''} · Umschalt: ohne Raster`);
    const ids = D.ids, parts0 = D.parts0;
    D.commit = () => HSS.change('Verschieben', p => { ids.forEach((id, i) => { const q = HSS.findPart(id, p)?.part, o = parts0[i]; if (!q) return; q.x = Math.round((o.x + dx) * 100) / 100; q.z = Math.round((o.z + dz) * 100) / 100; }); });
  } else if (D.op === 'rot') {
    const a = Math.atan2(hit.z - D.c.z, hit.x - D.c.x); let da = U.deg(a - D.a0);
    let rot = (pt0.rot || 0) + da; rot = fine ? Math.round(rot) : Math.round(rot / 5) * 5;
    for (const m of [0, 90, 180, 270, 360, -90, -180]) if (Math.abs(rot - m) < 3) rot = m;
    const dr = rot - (pt0.rot || 0);
    const R = new THREE.Euler(0, -U.rad(dr), 0), c = new V3(D.c.x, 0, D.c.z);
    for (const id of D.ids) { const g = groupOf(id); if (!g) continue; g.rotation.copy(R); const rc = c.clone().applyEuler(R); g.position.set(c.x - rc.x, 0, c.z - rc.z); }
    hint(`<b>Drehen</b> · ${fmt(((rot % 360) + 360) % 360, 0)}° · Umschalt: in 1°-Schritten`);
    const ids = D.ids, parts0 = D.parts0;
    D.commit = () => HSS.change('Drehen', p => { ids.forEach((id, i) => { const q = HSS.findPart(id, p).part, o = parts0[i]; const v = G.rot([o.x - pt0.x, o.z - pt0.z], U.rad(dr)); q.x = Math.round((pt0.x + v[0]) * 100) / 100; q.z = Math.round((pt0.z + v[1]) * 100) / 100; q.rot = Math.round(((o.rot || 0) + dr) * 10) / 10; }); });
  } else if (D.op === 'edge') {
    const loc = HSS.toLocal(pt0, [hit.x, hit.z]); const ax = D.ax === 'x' ? 0 : 1, key = D.ax === 'x' ? 'w' : 'd';
    const half = pt0[key] / 2, other = -D.sg * half;
    let edge = loc[ax] - D.sg * 1.2; edge = fine ? Math.round(edge * 10) / 10 : snap(edge);
    let len = Math.max(4, D.sg * (edge - other)); len = Math.min(len, 400);
    const shift = other + D.sg * len / 2;
    const off = G.rot(ax === 0 ? [shift, 0] : [0, shift], U.rad(pt0.rot || 0));
    const n = U.clone(pt0); n[key] = len; n.x = pt0.x + off[0]; n.z = pt0.z + off[1];
    if (n.shape === 'poly' && n.poly) { const f = len / pt0[key]; n.poly = pt0.poly.map(q => { const r = q.slice(); r[ax] = r[ax] * f; return r; }); }
    if (n.cornerRadius) n.cornerRadius = Math.min(n.cornerRadius, Math.min(n.w, n.d) / 2 - 0.5);
    preview(sel.id, () => HSS.buildPart(n, D.b, HSS.view));
    hint(`<b>${key === 'w' ? 'Länge' : 'Tiefe'}</b> ${fmt(len)} m · Grundfläche ${fmt(n.w)} × ${fmt(n.d)} m = <b>${U.fmt(HSS.partArea(n))} m²</b> je Ebene · Umschalt: 10-cm-Schritte`);
    D.commit = () => HSS.change(key === 'w' ? 'Länge ändern' : 'Tiefe ändern', p => { const q = HSS.findPart(sel.id, p).part; q[key] = n[key]; q.x = Math.round(n.x * 100) / 100; q.z = Math.round(n.z * 100) / 100; if (n.poly) q.poly = n.poly; q.cornerRadius = n.cornerRadius; });
  } else if (D.op === 'height') {
    const base = HSS.partBaseY(pt0), fh = pt0.floorHeight || 3.6;
    const floors = U.clamp(Math.round((hit.y - base) / fh), 1, 40);
    const n = U.clone(pt0); n.floors = floors;
    preview(sel.id, () => HSS.buildPart(n, D.b, HSS.view));
    hint(`<b>${floors} Geschosse</b> (EG + ${floors - 1} OG) · Höhe ${fmt(HSS.partTopY(n) - base)} m · ${U.fmt(HSS.partArea(n) * floors)} m² BGF oberirdisch`);
    D.commit = floors === pt0.floors ? null : () => HSS.change('Geschosse ändern', p => { HSS.findPart(sel.id, p).part.floors = floors; });
  }
}
// Magnet: bündig an benachbarte Bauteile andocken (Kanten parallel, Abstand < 1,5 m)
function magnet(pt0, dx, dz) {
  const p = prj(); const own = new Set(D.ids);
  const fp = HSS.partFootprint(Object.assign({}, pt0, { x: pt0.x + dx, z: pt0.z + dz })).outer;
  let best = null;
  for (const q of HSS.allParts(p)) {
    if (own.has(q.id) || q.stackOn) continue;
    if (Math.abs((((q.rot || 0) - (pt0.rot || 0)) % 90 + 90) % 90) > 0.5 && Math.abs((((q.rot || 0) - (pt0.rot || 0)) % 90 + 90) % 90 - 90) > 0.5) continue;
    const qo = HSS.partFootprint(q).outer;
    // in das lokale System von pt0 drehen
    const toL = v => G.rot(v, -U.rad(pt0.rot || 0));
    const a = G.bbox(fp.map(toL)), b = G.bbox(qo.map(toL));
    const ovX = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), ovZ = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
    const cand = [];
    if (ovZ > 1) { cand.push([b.x0 - a.x1, 0]); cand.push([b.x1 - a.x0, 0]); }
    if (ovX > 1) { cand.push([0, b.z0 - a.z1]); cand.push([0, b.z1 - a.z0]); }
    for (const c of cand) { const d = Math.abs(c[0] + c[1]); if (d < 1.5 && (!best || d < best.d)) best = { d, c }; }
  }
  if (!best) return [dx, dz, false];
  const w = G.rot(best.c, U.rad(pt0.rot || 0));
  return [dx + w[0], dz + w[1], true];
}

/* Fläche */
function dragArea(hit, fine) {
  const a0 = D.a0, sel = D.sel; let n = U.clone(a0), label = '';
  if (D.op === 'move') { let dx = hit.x - D.p0.x, dz = hit.z - D.p0.z; if (!fine) { dx = snap(dx); dz = snap(dz); } const g = groupOf(sel.id); if (g) g.position.set(dx, 0, dz); n.x = a0.x + dx; n.z = a0.z + dz; hint(`<b>Verschieben</b> · ${fmt(Math.hypot(dx, dz))} m`); D.commit = () => HSS.change('Fläche verschieben', p => { const a = U.byId(p.areas, sel.id); a.x = Math.round(n.x * 10) / 10; a.z = Math.round(n.z * 10) / 10; if (a.poly) a.poly = a0.poly.map(q => [Math.round((q[0] + dx) * 10) / 10, Math.round((q[1] + dz) * 10) / 10]); }, { scope: 'outdoor' }); return; }
  if (D.op === 'rot') { let r = (a0.rot || 0) + U.deg(Math.atan2(hit.z - a0.z, hit.x - a0.x) - D.ang0); r = fine ? Math.round(r) : Math.round(r / 5) * 5; n.rot = r; label = `<b>Drehen</b> · ${fmt(((r % 360) + 360) % 360, 0)}°`; }
  if (D.op === 'edge') {
    const loc = G.rot([hit.x - a0.x, hit.z - a0.z], -U.rad(a0.rot || 0)); const ax = D.ax === 'x' ? 0 : 1, key = D.ax === 'x' ? 'w' : 'd';
    const other = -D.sg * a0[key] / 2; let edge = loc[ax] - D.sg * 1.2; edge = fine ? Math.round(edge * 10) / 10 : snap(edge);
    const len = U.clamp(D.sg * (edge - other), 2, 600), shift = other + D.sg * len / 2, off = G.rot(ax === 0 ? [shift, 0] : [0, shift], U.rad(a0.rot || 0));
    n[key] = len; n.x = a0.x + off[0]; n.z = a0.z + off[1];
    label = `<b>${HSS.FLAECHEN[a0.kind]}</b> ${fmt(n.w)} × ${fmt(n.d)} m = ${U.fmt(n.w * n.d)} m²${a0.kind === 'parkplatz' ? ' · ' + HSS.parkingLayout(n).stalls.length + ' Stellplätze' : ''}`;
  }
  preview(sel.id, () => HSS.buildArea(n, HSS.view)); hint(label);
  D.commit = () => HSS.change('Fläche ändern', p => { const a = U.byId(p.areas, sel.id); Object.assign(a, { x: Math.round(n.x * 10) / 10, z: Math.round(n.z * 10) / 10, w: n.w, d: n.d, rot: n.rot }); }, { scope: 'outdoor' });
}

/* Objekt */
function dragObject(hit, fine, ev) {
  const o0 = D.o0, w0 = D.w0, sel = D.sel, g = groupOf(sel.id);
  if (D.op === 'move') {
    let dx = hit.x - D.p0.x, dz = hit.z - D.p0.z; const st = o0.host ? 0.05 : 0.25; if (!fine) { dx = snap(dx, st); dz = snap(dz, st); }
    if (g) g.position.set(w0.x + dx, g.position.y, w0.z + dz);
    hint(`<b>Verschieben</b> · ${fmt(Math.hypot(dx, dz), 2)} m`);
    D.commit = () => HSS.change('Objekt verschieben', p => {
      const o = U.byId(p.objects, sel.id);
      if (o.host) { const P = HSS.findPart(o.host.part, p); const loc = HSS.toLocal(P.part, [w0.x + dx, w0.z + dz]); o.x = Math.round(loc[0] * 100) / 100; o.z = Math.round(loc[1] * 100) / 100; }
      else { o.x = Math.round((o0.x + dx) * 100) / 100; o.z = Math.round((o0.z + dz) * 100) / 100; }
    }, { scope: 'objects' });
  } else if (D.op === 'rot') {
    let r = (w0.rot || 0) - U.deg(Math.atan2(hit.z - w0.z, hit.x - w0.x) - D.ang0); r = fine ? Math.round(r) : Math.round(r / 15) * 15;
    const dr = r - (w0.rot || 0);
    if (g) g.rotation.y = -U.rad(r);
    hint(`<b>Drehen</b> · ${fmt(((((o0.rot || 0) + dr) % 360) + 360) % 360, 0)}° · Umschalt: 1°-Schritte`);
    D.commit = () => HSS.change('Objekt drehen', p => { const o = U.byId(p.objects, sel.id); o.rot = ((((o0.rot || 0) + dr) % 360) + 360) % 360; }, { scope: 'objects' });
  }
}

/* Weg */
function dragPath(hit, fine, ev) {
  const pa0 = D.pa0, sel = D.sel, n = U.clone(pa0);
  if (D.op === 'move') { let dx = hit.x - D.p0.x, dz = hit.z - D.p0.z; if (!fine) { dx = snap(dx); dz = snap(dz); } n.points = pa0.points.map(q => [q[0] + dx, q[1] + dz]); hint(`<b>Weg verschieben</b> · ${fmt(Math.hypot(dx, dz))} m`); }
  if (D.op === 'point') {
    let q = fine ? [Math.round(hit.x * 10) / 10, Math.round(hit.z * 10) / 10] : [snap(hit.x), snap(hit.z)];
    const i = D.idx, prev = n.points[i - 1] || n.points[i + 1];
    if (ev.altKey && prev) { const dx = q[0] - prev[0], dz = q[1] - prev[1]; if (Math.abs(dx) > Math.abs(dz)) q[1] = prev[1]; else q[0] = prev[0]; }
    n.points[i] = q;
    const len = G.polylineLength(n.points);
    hint(`<b>Punkt ${i + 1}</b> · Weglänge ${fmt(len)} m${prev ? ` · Abschnitt ${fmt(G.dist(prev, q))} m, Richtung ${fmt(((U.deg(Math.atan2(q[1] - prev[1], q[0] - prev[0])) % 360) + 360) % 360, 0)}°` : ''} · Alt: rechtwinklig`);
  }
  if (D.op === 'rot') {
    let da = U.deg(Math.atan2(hit.z - D.c[1], hit.x - D.c[0]) - D.ang0); da = fine ? Math.round(da) : Math.round(da / 5) * 5;
    n.points = pa0.points.map(q => { const v = G.rot([q[0] - D.c[0], q[1] - D.c[1]], U.rad(da)); return [Math.round((D.c[0] + v[0]) * 10) / 10, Math.round((D.c[1] + v[1]) * 10) / 10]; });
    hint(`<b>Weg drehen</b> · ${fmt(da, 0)}°`);
  }
  if (D.op === 'width') {
    const L = HSS.pathLine(pa0); let best = Infinity; for (let i = 1; i < L.length; i++) { const c = G.closestOnSeg([hit.x, hit.z], [L[i - 1][0], L[i - 1][2]], [L[i][0], L[i][2]]); best = Math.min(best, G.dist(c.pt, [hit.x, hit.z])); }
    n.width = U.clamp(Math.round((best - 1.2) * 2 * 10) / 10, 0.8, 40);
    hint(`<b>Breite</b> ${fmt(n.width)} m`);
  }
  preview(sel.id, () => HSS.buildPath(n, HSS.view));
  const op = D.op;
  D.commit = () => HSS.change(D_label(op), p => { const q = U.byId(p.paths, sel.id); q.points = n.points; q.width = n.width; }, { scope: 'outdoor' });
}
const D_label = op => ({ move: 'Weg verschieben', point: 'Wegpunkt verschieben', rot: 'Weg drehen', width: 'Wegbreite' }[op] || 'Weg ändern');

/* Raum */
function dragRoom(hit, fine) {
  if (D.r0.zone && D.r0.zf && HSS.zoneUV) return dragZone(hit, fine);
  const r0 = D.r0, pt = D.part, sel = D.sel, n = U.clone(r0);
  const loc = HSS.toLocal(pt, [hit.x, hit.z]), st = fine ? 0.05 : 0.25, sn = v => Math.round(v / st) * st;
  if (D.op === 'move') { const l0 = HSS.toLocal(pt, [D.p0.x, D.p0.z]); n.x = r0.x + sn(loc[0] - l0[0]); n.z = r0.z + sn(loc[1] - l0[1]); }
  if (D.op === 'edge') {
    const ax = D.ax === 'x' ? 0 : 1, key = D.ax === 'x' ? 'w' : 'd', c = D.ax === 'x' ? 'x' : 'z';
    const other = r0[c] - D.sg * r0[key] / 2; const edge = sn(loc[ax] - D.sg * 0.5);
    const len = Math.max(1, D.sg * (edge - other)); n[key] = len; n[c] = other + D.sg * len / 2;
  }
  clearGhost();
  const y = D.y + 0.25, pts = [[n.x - n.w / 2, n.z - n.d / 2], [n.x + n.w / 2, n.z - n.d / 2], [n.x + n.w / 2, n.z + n.d / 2], [n.x - n.w / 2, n.z + n.d / 2], [n.x - n.w / 2, n.z - n.d / 2]].map(q => { const w = HSS.toWorld(pt, q); return new V3(w[0], y, w[1]); });
  const g = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#d9531e', depthTest: false })); l.renderOrder = 41; ghost().add(l);
  hint(`<b>${U.esc(r0.name || HSS.ROOMTYPES[r0.use]?.name || 'Raum')}</b> · ${fmt(n.w, 2)} × ${fmt(n.d, 2)} m = <b>${fmt(n.w * n.d)} m²</b>`);
  const D_op = D.op;
  D.commit = () => HSS.change(D_op === 'move' ? 'Raum verschieben' : 'Raumgröße', p => {
    const I = HSS.interior(sel.part, sel.floor, false, p), r = I.rooms.find(x => x.id === sel.id); const dx = n.x - r.x, dz = n.z - r.z;
    Object.assign(r, { x: n.x, z: n.z, w: n.w, d: n.d });
    if (I.walls.some(w => w.auto)) HSS.rebuildWalls(I);
    else if (D_op === 'move') { for (const w of I.walls) if (w.room === r.id) { w.a = [w.a[0] + dx, w.a[1] + dz]; w.b = [w.b[0] + dx, w.b[1] + dz]; } }
    else { const old = I.walls.filter(w => w.room === r.id).map(w => w.id); I.walls = I.walls.filter(w => w.room !== r.id); I.doors = I.doors.filter(d => !old.includes(d.wall)); I.walls.push(...HSS.roomWalls(r)); }
    // Möbel wandern beim Verschieben mit
    if (D_op === 'move') for (const o of p.objects) if (o.host && o.host.part === sel.part && o.host.floor === sel.floor && Math.abs(o.x - r0.x) <= r0.w / 2 && Math.abs(o.z - r0.z) <= r0.d / 2) { o.x += dx; o.z += dz; }
  });
}

/* Brücke: Anschlusspunkt entlang der Fassade */
function dragBridge(hit) {
  const br0 = D.br0, sel = D.sel, n = U.clone(br0); const end = D.end, side = n[end];
  const P = HSS.findPart(side.part); if (!P) return;
  const e0 = HSS.bridgeEnds(br0);
  if (!n.ma) { n.ma = HSS.toLocal(HSS.findPart(n.a.part).part, e0.pa); n.mb = HSS.toLocal(HSS.findPart(n.b.part).part, e0.pb); }
  n[end === 'a' ? 'ma' : 'mb'] = HSS.toLocal(P.part, [hit.x, hit.z]).map(v => Math.round(v * 10) / 10);
  preview(sel.id, () => HSS.buildBridge(n, HSS.view));
  const e = HSS.bridgeEnds(n); hint(`<b>Brücke</b> · Länge ${fmt(e?.len || 0)} m · Anschluss an der Fassade verschieben`);
  D.commit = () => HSS.change('Brücke anpassen', p => { const b = U.byId(p.bridges, sel.id); b.ma = n.ma; b.mb = n.mb; delete b.offset; });
}

/* ---------- Brücke von Hand ziehen: Fassade A anklicken, dann Fassade B ---------- */
const floorAt = (pt, y) => { const fs = HSS.partFloors(pt); let best = fs[0]; for (const f of fs) if (HSS.floorY(pt, f) <= y + 0.3) best = f; return best; };
M.bridgeTool = (fromPart) => {
  if (ro()) return;
  let A = null, cur = null, line = null;
  const firstFloor = pt => Math.min(Math.max(1, HSS.partFloors(pt)[0]), pt.floors - 1);
  const pickFacade = ev => {
    const h = S3.pick(ev); if (!h || h.kind !== 'part') return null;
    const P = HSS.findPart(h.id); if (!P) return null;
    const fp = HSS.partFootprint(P.part).outer; let bp = null, bd = Infinity;
    for (let i = 0; i < fp.length; i++) { const c = G.closestOnSeg([h.point.x, h.point.z], fp[i], fp[(i + 1) % fp.length]); const d = G.dist(c.pt, [h.point.x, h.point.z]); if (d < bd) { bd = d; bp = c.pt; } }
    let f = HSS.view.floor !== null ? HSS.localFloor(P.part, HSS.view.floor) : floorAt(P.part, h.point.y);
    if (f === null || f === undefined) f = firstFloor(P.part);
    if (f === 0 && P.part.floors > 1 && HSS.view.floor === null && h.point.y - HSS.partBaseY(P.part) > 2) f = 1;
    return { part: P.part, pt: bp, floor: f, y: HSS.floorY(P.part, f) };
  };
  S3.setTool({
    name: 'bridge',
    move(ev) {
      cur = pickFacade(ev); clearGhost();
      if (A) { const gp = cur ? new V3(cur.pt[0], cur.y + 1.5, cur.pt[1]) : (() => { const q = planeHit(ev, A.y + 1.5); return q; })(); if (gp) { const g = new THREE.BufferGeometry().setFromPoints([new V3(A.pt[0], A.y + 1.5, A.pt[1]), gp]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#891F5E', depthTest: false })); l.renderOrder = 41; ghost().add(l); hint(`<b>Brücke</b> von ${U.esc(A.part.name)} (${HSS.floorName(HSS.globalFloor(A.part, A.floor))}) · ${cur ? `nach <b>${U.esc(cur.part.name)}</b> (${HSS.floorName(HSS.globalFloor(cur.part, cur.floor))}) · Länge ${fmt(G.dist(A.pt, cur.pt))} m · klicken zum Verbinden` : 'auf die Fassade des zweiten Gebäudes klicken'} · Esc: abbrechen`); } }
      if (cur) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), new THREE.MeshBasicMaterial({ color: '#891F5E', depthTest: false })); m.position.set(cur.pt[0], cur.y + 1.5, cur.pt[1]); m.renderOrder = 42; ghost().add(m); }
      HSS.perf?.invalidate(2);
    },
    click(ev) {
      const c = pickFacade(ev); if (!c) return HSS.ui.toast('Auf eine Gebäudefassade klicken');
      if (!A) { A = c; hint(`Anfang gesetzt an <b>${U.esc(c.part.name)}</b> · jetzt die Fassade des zweiten Gebäudes anklicken`); return; }
      if (c.part.id === A.part.id) return HSS.ui.toast('Zweites Gebäude wählen');
      // gleiche Ebene wie am Anfang, wenn das zweite Gebäude sie hat (sonst Rampe)
      const same = HSS.localFloor(c.part, HSS.globalFloor(A.part, A.floor)); if (same !== null && Math.abs(HSS.floorY(c.part, same) - A.y) < 2.5) c.floor = same;
      const br = { id: U.uid('br'), name: 'Brücke', type: 'glas', a: { part: A.part.id, floor: A.floor }, b: { part: c.part.id, floor: c.floor }, ma: HSS.toLocal(A.part, A.pt).map(v => Math.round(v * 10) / 10), mb: HSS.toLocal(c.part, c.pt).map(v => Math.round(v * 10) / 10), width: 4, height: 3.4, levels: 1 };
      M.mark();
      HSS.change('Brücke anlegen', p => p.bridges.push(br));
      S3.setTool(null); S3.select({ kind: 'bridge', id: br.id });
      HSS.ui.toast('Brücke angelegt – Anschlusspunkte lassen sich an den ◆-Griffen verschieben');
    },
    cancel() { clearGhost(); hint(null); }
  });
  hint('<b>Brücke ziehen</b>: auf die Fassade des ersten Gebäudes klicken (Höhe des Klicks = Geschoss), dann auf das zweite Gebäude · Esc: abbrechen');
};

/* ---------- Werkzeugleiste am Element (✓ / ✗) ---------- */
function bar(show) {
  if (!M.bar) {
    const el = M.bar = document.createElement('div'); el.id = 'mbar'; el.hidden = true; document.body.appendChild(el);
    el.addEventListener('pointerdown', e => e.stopPropagation());
  }
  const sel = HSS.state.selection, el = M.bar;
  if (!show || !sel || ro() || S3.tool || S3.fpvActive || !['part', 'area', 'object', 'path', 'bridge', 'room'].includes(sel.kind)) { el.hidden = true; return; }
  const B = (id, label, title, cls = '') => `<button data-m="${id}" class="${cls}" title="${U.esc(title)}">${label}</button>`;
  let h = '';
  if (sel.kind === 'part') h += B('rotL', '⟲', 'Um 15° nach links drehen (Umschalt: 90°)') + B('rotR', '⟳', 'Um 15° nach rechts drehen (Umschalt: 90°)') + B('fUp', '＋G', 'Ein Geschoss aufsetzen') + B('fDn', '－G', 'Oberstes Geschoss entfernen') + B('whole', M.moveWhole ? '▣ Ganzes Gebäude' : '▢ Nur Bauteil', 'Beim Ziehen das ganze Gebäude oder nur dieses Bauteil verschieben', M.moveWhole ? 'on' : '') + B('bridge', '⌒ Brücke', 'Brücke von diesem Gebäude zu einem anderen ziehen') + B('inside', '⌂ Innen', 'Etagen von innen ansehen');
  if (sel.kind === 'area') h += B('rotL', '⟲', 'Drehen') + B('rotR', '⟳', 'Drehen');
  if (sel.kind === 'object') h += B('rotL', '⟲', 'Um 90° drehen (Umschalt: 15°)') + B('rotR', '⟳', 'Um 90° drehen (Umschalt: 15°)');
  if (sel.kind === 'path') h += B('rotL', '⟲', 'Weg um 15° drehen') + B('rotR', '⟳', 'Weg um 15° drehen') + B('ext', '↦ +10 m', 'Weg am Ende um 10 m verlängern') + B('cut', '↤ −10 m', 'Weg am Ende um 10 m kürzen');
  if (sel.kind === 'bridge') h += B('lvUp', '▲ Ebene', 'Brücke ein Geschoss höher') + B('lvDn', '▼ Ebene', 'Brücke ein Geschoss tiefer') + B('wide', '⇔ breiter', 'Brücke 1 m breiter (Umschalt: schmaler)');
  if (sel.kind === 'path' && sel.point !== undefined) h += B('delPt', '✕ Punkt', 'Gewählten Wegpunkt löschen');
  if (sel.kind !== 'room' && sel.kind !== 'bridge') h += B('dup', '⧉', 'Kopie daneben (Strg+D)');
  h += B('del', '🗑', 'Löschen (Entf)', 'danger') + '<span class="sep"></span>' + B('ok', '✓', 'Fertig – Änderungen übernehmen', 'ok') + B('no', '✗', 'Änderungen seit der Auswahl verwerfen', 'no');
  el.innerHTML = h; el.hidden = false;
  el.querySelectorAll('[data-m]').forEach(b => b.onclick = e => act(b.dataset.m, e));
  placeBar();
}
function placeBar() {
  const sel = HSS.state.selection, el = M.bar; if (!sel || !el) return;
  const box = S3.selBounds(sel); if (!box || box.isEmpty()) { el.hidden = true; return; }
  // unter den Bildschirmumriss des Elements setzen (Griffe liegen oben am Dach)
  const r = S3.renderer.domElement.getBoundingClientRect(); let x0 = Infinity, x1 = -Infinity, y1 = -Infinity, vis = false;
  for (let i = 0; i < 8; i++) {
    const v = new V3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(S3.camera);
    if (v.z > 1) continue; vis = true;
    const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height;
    x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  if (!vis) { el.style.opacity = '0'; return; }
  const bw = el.offsetWidth || 300, bh = el.offsetHeight || 42;
  const x = U.clamp((x0 + x1) / 2 - bw / 2, r.left + 8, r.right - bw - 8), y = U.clamp(y1 + 24, r.top + 120, r.bottom - bh - 70);
  el.style.opacity = '1'; el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
}
function act(a, e) {
  const sel = HSS.state.selection; if (!sel) return;
  const big = e.shiftKey;
  if (a === 'ok') { M.session = null; S3.select(null); HSS.ui.toast('Übernommen'); return; }
  if (a === 'no') { M.revert(); return; }
  if (a === 'del') { HSS.ui.deleteSelection(); return; }
  if (a === 'dup') { HSS.ui.duplicateSelection(); return; }
  if (a === 'bridge') { M.bridgeTool(sel.id); return; }
  if (a === 'inside') { const P = HSS.findPart(sel.id); if (P) { HSS.s3.setFloor(HSS.globalFloor(P.part, 0)); HSS.ui.setWS('innen'); S3.focusSel(sel); } return; }
  if (a === 'whole') { M.moveWhole = !M.moveWhole; HSS.perf?.batch(); buildHandles(); bar(true); return; }
  if (sel.kind === 'part') {
    if (a === 'rotL' || a === 'rotR') { const dr = (a === 'rotL' ? -1 : 1) * (big ? 90 : 15); const ids = M.moveSet(sel.id), P = HSS.findPart(sel.id).part; HSS.change('Drehen', p => { const c = HSS.findPart(sel.id, p).part, cx = c.x, cz = c.z; for (const id of ids) { const q = HSS.findPart(id, p).part; const v = G.rot([q.x - cx, q.z - cz], U.rad(dr)); q.x = Math.round((cx + v[0]) * 100) / 100; q.z = Math.round((cz + v[1]) * 100) / 100; q.rot = ((q.rot || 0) + dr) % 360; } }); }
    if (a === 'fUp') HSS.change('Geschoss aufsetzen', p => { const q = HSS.findPart(sel.id, p).part; q.floors = Math.min(40, q.floors + 1); });
    if (a === 'fDn') HSS.change('Geschoss entfernen', p => { const q = HSS.findPart(sel.id, p).part; q.floors = Math.max(1, q.floors - 1); });
  }
  if (sel.kind === 'bridge' && (a === 'lvUp' || a === 'lvDn')) {
    const br = U.byId(prj().bridges, sel.id), dv = a === 'lvUp' ? 1 : -1; const A = HSS.findPart(br.a.part)?.part, Bp = HSS.findPart(br.b.part)?.part;
    const fa = br.a.floor + dv, fb = br.b.floor + dv;
    if (!A || !Bp || !HSS.partFloors(A).includes(fa) || !HSS.partFloors(Bp).includes(fb)) return HSS.ui.toast('Diese Ebene gibt es nicht in beiden Gebäuden');
    HSS.change('Brückenebene', p => { const b = U.byId(p.bridges, sel.id); b.a.floor = fa; b.b.floor = fb; });
  }
  if (sel.kind === 'bridge' && a === 'wide') HSS.change('Brückenbreite', p => { const b = U.byId(p.bridges, sel.id); b.width = U.clamp((b.width || 4) + (big ? -1 : 1), 2, 20); });
  if (sel.kind === 'area' && (a === 'rotL' || a === 'rotR')) HSS.change('Fläche drehen', p => { const q = U.byId(p.areas, sel.id); q.rot = ((q.rot || 0) + (a === 'rotL' ? -15 : 15)) % 360; }, { scope: 'outdoor' });
  if (sel.kind === 'object' && (a === 'rotL' || a === 'rotR')) HSS.change('Objekt drehen', p => { const q = U.byId(p.objects, sel.id); q.rot = ((((q.rot || 0) + (a === 'rotL' ? -1 : 1) * (big ? 15 : 90)) % 360) + 360) % 360; }, { scope: 'objects' });
  if (sel.kind === 'path') {
    if (a === 'rotL' || a === 'rotR') HSS.change('Weg drehen', p => { const q = U.byId(p.paths, sel.id), c = centroid(q.points), da = U.rad(a === 'rotL' ? -15 : 15); q.points = q.points.map(t => { const v = G.rot([t[0] - c[0], t[1] - c[1]], da); return [Math.round((c[0] + v[0]) * 10) / 10, Math.round((c[1] + v[1]) * 10) / 10]; }); }, { scope: 'outdoor' });
    if (a === 'ext' || a === 'cut') HSS.change(a === 'ext' ? 'Weg verlängern' : 'Weg kürzen', p => { const q = U.byId(p.paths, sel.id), n = q.points.length, A = q.points[n - 2], B = q.points[n - 1], l = G.dist(A, B) || 1; const k = a === 'ext' ? 10 : -Math.min(10, l - 1); q.points[n - 1] = [Math.round((B[0] + (B[0] - A[0]) / l * k) * 10) / 10, Math.round((B[1] + (B[1] - A[1]) / l * k) * 10) / 10]; }, { scope: 'outdoor' });
    if (a === 'delPt') { HSS.change('Wegpunkt löschen', p => { const q = U.byId(p.paths, sel.id); if (q.points.length > 2) q.points.splice(sel.point, 1); }, { scope: 'outdoor' }); S3.select({ kind: 'path', id: sel.id }); }
  }
}
// Sitzung: alles seit der Auswahl (bzw. seit dem Platzieren) lässt sich mit ✗ verwerfen
M.mark = () => { M._mark = HSS.undoLen(); };
M.revert = () => {
  const s = M.session; if (!s) { S3.select(null); return; }
  let n = 0; while (HSS.undoLen() > s.undoLen && HSS.undo()) n++;
  M.session = null; S3.select(null);
  HSS.ui.toast(n ? `${n} Änderung${n > 1 ? 'en' : ''} verworfen` : 'Keine Änderungen');
};

/* ---------- Ziehen aus dem Panel ins 3D-Bild (Bausteine, Objekte, Flächen) ---------- */
const overCanvas = e => { const r = S3.renderer.domElement.getBoundingClientRect(); const el = document.elementFromPoint(e.clientX, e.clientY); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && (el === S3.renderer.domElement || el?.closest?.('.labels')); };
M.dragFrom = (el, startTool) => {
  el.classList.add('dragsrc');
  el.addEventListener('pointerdown', ev => {
    if (ev.button !== 0 || ro()) return;
    const x0 = ev.clientX, y0 = ev.clientY; let started = false;
    const mv = e => {
      if (!started && Math.hypot(e.clientX - x0, e.clientY - y0) > 8) { started = true; el._noClick = true; startTool(); document.body.classList.add('placing'); }
      if (started && S3.tool?.move && overCanvas(e)) { S3.tool.move(e); HSS.perf?.invalidate(2); }
    };
    const up = e => {
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
      document.body.classList.remove('placing');
      if (!started) return;
      if (overCanvas(e) && S3.tool) { S3.tool.move?.(e); S3.tool.click?.(e); if (S3.tool && S3.tool.name !== 'path') S3.setTool(null); }
      else S3.setTool(null);
      setTimeout(() => { el._noClick = false; }, 0);
    };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
  });
  el.addEventListener('click', e => { if (el._noClick) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
};

/* ---------- Einrichtung ---------- */
M.init = () => {
  layer = new THREE.Group(); layer.name = 'handles'; S3.scene.add(layer); S3.layers.handles = layer;
  const dom = S3.renderer.domElement;
  dom.addEventListener('pointerdown', onDown, { capture: true });
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  // Klick auf einen Wegpunkt-Griff wählt den Punkt
  dom.addEventListener('pointerup', ev => {
    if (M.dragging || S3.tool || ev.button !== 0) return;
    const hd = pickHandle(ev); const s = HSS.state.selection;
    if (hd && s?.kind === 'path' && hd.userData.op === 'point') setTimeout(() => S3.select({ kind: 'path', id: s.id, point: hd.userData.idx }), 0);
  });
  HSS.on('selection', sel => {
    const k = selKey(sel);
    if (!sel) M.session = null;
    else if (!M.session || M.session.key !== k) M.session = { key: k, undoLen: M._mark ?? HSS.undoLen() };
    M._mark = null;
    // gewähltes Objekt einzeln darstellen
    const objSel = sel?.kind === 'object' ? sel.id : null;
    if (objSel !== M._objSel) { M._objSel = objSel; S3.rebuild('objects'); }
    buildHandles(); bar(true);
  });
  HSS.on('rebuilt', () => { if (!M.dragging) { clearGhost(); buildHandles(); bar(true); } });
  HSS.on('tool', () => { buildHandles(); bar(true); });
  HSS.on('view', () => { buildHandles(); bar(true); });
  window.addEventListener('keydown', ev => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || S3.tool) return;
    if (ev.key === 'Enter' && HSS.state.selection) { act('ok', ev); }
  });
};
})();
