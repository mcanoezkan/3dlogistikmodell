/* =====================================================================
   HSS · build-gebaeude.js – Geometrie für Bauteile, Fassaden, Brücken, Innenausbau
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE, mergeGeometries } = window.THREEX;
const LM = c => HSS.library.material(c, 'lack');

HSS.FASSADEN = {
  band:     { name: 'Bandfassade', info: 'Durchlaufende Fensterbänder mit Brüstungsband – typisch für Bettenhäuser der 1970er–2000er' },
  glas:     { name: 'Vorhangfassade (Glas)', info: 'Pfosten-Riegel-Glasfassade, geschosshoch verglast – Eingangs- und Neubauten' },
  loch:     { name: 'Lochfassade', info: 'Einzelfenster in massiver Wand (Putz/Beton)' },
  raster:   { name: 'Rasterfassade mit Lisenen', info: 'Vertikale Lisenen/Finnen gliedern die Fensterachsen' },
  paneel:   { name: 'Paneelfassade (HPL/Metall)', info: 'Farbige Paneele im Wechsel mit Fensterachsen – Funktionsbauten' },
  klinker:  { name: 'Klinkerfassade', info: 'Ziegel/Klinker mit Lochfenstern und hellen Rahmen' },
  lamellen: { name: 'Glas mit Sonnenschutzlamellen', info: 'Ganzglas mit horizontalen Lamellen – Südfassaden' },
  parkhaus: { name: 'Offenes Parkdeck', info: 'Brüstungsband, offene Geschosse – Parkhäuser' }
};
HSS.FORMEN = { rect: 'Rechteck', L: 'L-Form', U: 'U-Form', T: 'T-Form', O: 'Atrium (Innenhof)', rund: 'Rund / Oval', poly: 'Polygon (frei)' };

/* ---------- Basisgeometrien ---------- */
const shapeFrom = (outer, holes = []) => {
  const s = new THREE.Shape(outer.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  return s;
};
// Platte (Decke/Boden) zwischen y0 und y0+t
HSS.slabGeo = (outer, holes, y0, t) => {
  const g = new THREE.ExtrudeGeometry(shapeFrom(G.ccw(outer), holes.map(G.cw)), { depth: t, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
};
// Senkrechte Wandfläche entlang eines Rings
const ringWallGeo = (ring, y0, h, closed = true) => {
  const pos = [], n = ring.length, lim = closed ? n : n - 1;
  for (let i = 0; i < lim; i++) {
    const a = ring[i], b = ring[(i + 1) % n];
    pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + h, b[1], a[0], y0, a[1], b[0], y0 + h, b[1], a[0], y0 + h, a[1]);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
};
HSS.ringWallGeo = ringWallGeo;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
class Inst {
  constructor() { this.list = {}; }
  add(key, mat, x, y, z, ang, w, h, d) { (this.list[key] = this.list[key] || { mat, m: [] }).m.push([x, y, z, ang, w, h, d]); }
  meshes(userData) {
    const out = [];
    for (const k of Object.keys(this.list)) {
      const { mat, m } = this.list[k];
      const im = new THREE.InstancedMesh(BOX, mat, m.length);
      m.forEach(([x, y, z, ang, w, h, d], i) => { _q.setFromAxisAngle(_up, -ang); _m.compose(_p.set(x, y, z), _q, _s.set(w, h, d)); im.setMatrixAt(i, _m); });
      im.castShadow = !mat.transparent; im.receiveShadow = true; im.userData = Object.assign({}, userData, { facade: k });
      out.push(im);
    }
    return out;
  }
}

/* ---------- Fassade eines Geschosses ---------- */
// Segmente eines geschlossenen Rings
const ringSegs = r => r.map((a, i) => [a, r[(i + 1) % r.length]]);
// Wandfläche entlang einzelner Segmente (nur Außenkanten)
const segWallGeo = (segs, y0, h) => { const pos = []; for (const [a, b] of segs) pos.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + h, b[1], a[0], y0, a[1], b[0], y0 + h, b[1], a[0], y0 + h, a[1]); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; };
/* Nachbarbauteile (gleiche Lage, berührende Grundrisse) – für innenliegende Kanten ohne Fassade */
let _nbMemo = { t: 0, prj: null, map: null };
HSS.nachbarn = (pt, prj = HSS.project()) => {
  const now = performance.now();
  if (_nbMemo.prj !== prj || now - _nbMemo.t > 80 || !_nbMemo.map) {
    const all = [];
    const aus = HSS.gebAus?.hidden?.(prj);
    for (const b of prj.buildings) for (const q of (aus && aus.has(b.id) ? [] : b.parts)) { const fp = HSS.partFootprint(q); const bb = G.bbox(fp.outer); const nb = q.stackOn ? 0 : (q.basements || 0); all.push({ q, fp, bb, y0: HSS.floorY(q, -nb, prj), y1: HSS.partTopY(q, prj) }); }
    _nbMemo = { t: now, prj, map: new Map(), all };
  }
  _nbMemo.t = now;
  let r = _nbMemo.map.get(pt.id);
  if (!r) {
    const me = _nbMemo.all.find(x => x.q === pt) || { bb: G.bbox(HSS.partFootprint(pt).outer) };
    const list = _nbMemo.all.filter(x => x.q !== pt && !(x.bb.x1 < me.bb.x0 - 0.6 || x.bb.x0 > me.bb.x1 + 0.6 || x.bb.z1 < me.bb.z0 - 0.6 || x.bb.z0 > me.bb.z1 + 0.6));
    r = { list, sig: list.map(x => [x.q.id, x.q.x, x.q.z, x.q.rot, x.q.w, x.q.d, x.q.floors, x.q.basements, x.q.floorOffset, x.q.baseOffset, x.q.stackOn, x.q.poly ? x.q.poly.length : 0].join(',')).join(';') };
    _nbMemo.map.set(pt.id, r);
  }
  return r;
};
// Außenkanten eines Rings auf Höhe ym: Kantenstücke, an die kein anderes Bauteil anschließt
const aussenSegs = (ring, ym, nbs, tief = 0.35) => {
  if (!nbs.length) return ringSegs(ring);
  const out = [], n = ring.length;
  const innen = p => nbs.some(x => ym > x.y0 + 0.05 && ym < x.y1 - 0.05 && p[0] > x.bb.x0 && p[0] < x.bb.x1 && p[1] > x.bb.z0 && p[1] < x.bb.z1 && G.pointIn(p, x.fp.outer) && !x.fp.holes.some(h => G.pointIn(p, h)));
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[(i + 1) % n], len = G.dist(a, b); if (len < 0.05) continue;
    const nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len, k = Math.max(1, Math.ceil(len / 0.8));
    let start = null;
    for (let j = 0; j <= k; j++) {
      let frei = false;
      if (j < k) { const t = (j + 0.5) / k, p = [a[0] + (b[0] - a[0]) * t + nx * tief, a[1] + (b[1] - a[1]) * t + nz * tief]; frei = !innen(p); }
      if (frei && start === null) start = j;
      if (!frei && start !== null) { const t0 = start / k, t1 = j / k; out.push([[a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]]); start = null; }
    }
  }
  return out;
};
function facadeFloor(inst, ring, y0, h, fc, opt) {
  const t = fc.type, ax = Math.max(0.6, fc.axis || 1.35), wr = U.clamp(fc.windowRatio ?? 0.55, 0.1, 0.95);
  const glass = opt.glassMat, frame = opt.frameMat, wallMat = opt.wallMat, accent = opt.accentMat;
  const segs = opt.segs || ringSegs(ring), n = segs.length;
  for (let i = 0; i < n; i++) {
    const [a, b] = segs[i];
    const len = G.dist(a, b); if (len < 0.3) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    // Außennormale (Ring gegen den Uhrzeigersinn in x/z → Normale = (dz, -dx)); für Löcher umgekehrt übergeben
    const nx = (b[1] - a[1]) / len * opt.side, nz = -(b[0] - a[0]) / len * opt.side;
    const cnt = Math.max(1, Math.round(len / ax)), pw = len / cnt;
    for (let k = 0; k < cnt; k++) {
      const t0 = (k + 0.5) / cnt, cx = a[0] + (b[0] - a[0]) * t0, cz = a[1] + (b[1] - a[1]) * t0;
      const P = (off, y) => [cx + nx * off, y, cz + nz * off];
      switch (t) {
        case 'glas': {
          inst.add('glas', glass, ...P(0.02, y0 + h / 2), ang, pw - 0.06, h - 0.08, 0.04);
          inst.add('pfosten', frame, ...P(0.06, y0 + h / 2), ang, 0.06, h, 0.1);
          if (k === 0) inst.add('pfosten', frame, cx - (b[0] - a[0]) / cnt / 2 + nx * 0.06, y0 + h / 2, cz - (b[1] - a[1]) / cnt / 2 + nz * 0.06, ang, 0.06, h, 0.1);
          inst.add('riegel', frame, ...P(0.06, y0 + 0.05), ang, pw, 0.1, 0.1);
          break;
        }
        case 'lamellen': {
          inst.add('glas', glass, ...P(0.02, y0 + h / 2), ang, pw - 0.06, h - 0.08, 0.04);
          inst.add('pfosten', frame, ...P(0.06, y0 + h / 2), ang, 0.06, h, 0.1);
          for (let j = 1; j <= 3; j++) inst.add('lamelle', accent, ...P(0.35, y0 + h * j / 3.4), ang, pw, 0.05, 0.45);
          break;
        }
        case 'band': {
          const wh = Math.max(0.6, h - 1.35);
          inst.add('glas', glass, ...P(0.04, y0 + 0.95 + wh / 2), ang, pw - 0.12, wh, 0.05);
          inst.add('rahmen', frame, ...P(0.02, y0 + 0.95 + wh / 2), ang, pw - 0.02, wh + 0.06, 0.05);
          break;
        }
        case 'raster': {
          const wh = Math.max(0.6, h - 1.1);
          inst.add('glas', glass, ...P(0.04, y0 + 0.75 + wh / 2), ang, pw * 0.82, wh, 0.05);
          inst.add('lisene', accent, ...P(0.2, y0 + h / 2), ang, 0.18, h, 0.4);
          break;
        }
        case 'paneel': {
          const ww = pw * wr, wh = h - 1.0;
          if (k % 3 === 1) inst.add('paneel2', accent, ...P(0.04, y0 + h / 2), ang, pw - 0.04, h - 0.04, 0.06);
          else { inst.add('glas', glass, ...P(0.05, y0 + 0.8 + wh / 2), ang, ww, wh, 0.05); inst.add('rahmen', frame, ...P(0.03, y0 + 0.8 + wh / 2), ang, ww + 0.1, wh + 0.1, 0.05); }
          break;
        }
        case 'parkhaus': {
          inst.add('bruestung', wallMat, ...P(0, y0 + 0.55), ang, pw, 1.1, 0.25);
          if (k % 3 === 0) inst.add('stuetze', wallMat, ...P(-0.3, y0 + h / 2), ang, 0.4, h, 0.4);
          break;
        }
        default: { // loch, klinker, putz
          const ww = Math.min(pw * wr, 2.4), wh = Math.min(1.6, h - 1.4);
          if (ww < 0.4) break;
          inst.add('rahmen', frame, ...P(0.015, y0 + 0.9 + wh / 2), ang, ww + 0.14, wh + 0.14, 0.04);
          inst.add('glas', glass, ...P(0.03, y0 + 0.9 + wh / 2), ang, ww, wh, 0.04);
          if (t === 'klinker') inst.add('sturz', accent, ...P(0.03, y0 + 0.9 + wh + 0.12), ang, ww + 0.3, 0.1, 0.06);
        }
      }
    }
  }
}

/* ---------- Bauteil komplett ---------- */
// view: { floor (global|null), cut: 'voll'|'halb'|'aus', shell: 'massiv'|'transparent'|'aus', explode }
HSS.buildPart = (pt, building, view = {}) => {
  const prj = HSS.project();
  const grp = new THREE.Group(); grp.userData = { kind: 'part', id: pt.id, building: building.id };
  const fp = HSS.partFootprint(pt), outer = fp.outer, holes = fp.holes;
  const fc = Object.assign({ type: 'band', color: '#e9ecef', accent: '#144477', glass: '#6f8fa8' }, pt.facade);
  const transparent = view.shell === 'transparent' || view.shell === 'glas', plan = view.stil === 'plan';
  const glassMat = HSS.library.material(fc.glass, 'glas', fc.type === 'glas' || fc.type === 'lamellen' ? 0.55 : 0.7);
  const feP = HSS.fe?.of(pt, building, prj), feG = feP && feP.modus === 'gebaeude';
  const wallBase = feG ? feP.farbe : plan ? (fc.type === 'parkhaus' ? '#d9dee3' : '#eef1f4') : fc.type === 'klinker' ? (fc.color || '#a0522d') : fc.color;
  const wallMat = transparent ? HSS.library.shared('hull-t|' + wallBase + view.shell, () => { const m = new THREE.MeshStandardMaterial({ color: view.shell === 'glas' ? '#dfe7ee' : wallBase, transparent: true, opacity: view.shell === 'glas' ? 0.14 : 0.18, depthWrite: false, side: THREE.DoubleSide }); if (view.shell === 'glas') m.userData.noToon = true; return m; }) : HSS.library.shared('hull|' + wallBase + '|' + (fc.type === 'klinker'), () => new THREE.MeshStandardMaterial({ color: wallBase, roughness: fc.type === 'klinker' ? 0.9 : 0.7, side: THREE.DoubleSide }));
  const accentMat = LM(fc.accent || '#144477'), frameMat = LM(fc.type === 'klinker' ? '#f4f1ea' : (fc.frame || '#59636e'));
  const glasHull = view.shell === 'glas', tMat = (key, c, o) => HSS.library.shared(key + c + o, () => { const m = new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, roughness: 0.6, side: THREE.DoubleSide }); m.userData.noToon = true; return m; });
  const slabMat = glasHull ? tMat('glasdecke', '#c9d1d9', 0.28) : LM('#d5d8dc'), roofMat = feP ? (glasHull ? tMat('fedach', feP.farbe, 0.6) : LM(feP.farbe)) : glasHull ? tMat('glasdach', '#e6ebef', 0.22) : LM(pt.roof?.type === 'gruen' ? '#7fa36a' : plan ? '#f4f6f8' : (pt.roof?.color || '#9aa3ad'));
  // Planungsmodell: schlichte Hülle – Wand, Fensterband, Geschosslinie (keine Einzelfenster)
  const bands = [], flines = [];
  const floors = HSS.partFloors(pt);
  const ex = view.explode || 0;
  const rings0 = [{ r: outer, side: 1 }, ...holes.map(h => ({ r: G.cw(h), side: 1 }))];
  const meta = { kind: 'part', id: pt.id, building: building.id };
  const inst = new Inst();
  const walls = [];
  for (const f of floors) {
    const gf = HSS.globalFloor(pt, f, prj);
    if (view.floor !== null && view.floor !== undefined && gf > view.floor) continue;
    // Untergeschoss-Ansicht: nur dieses Geschoss (keine tieferen Ebenen, keine Wände anderer Etagen)
    if (view.floor !== null && view.floor !== undefined && view.floor < 0 && gf !== view.floor) continue;
    if (f < 0 && view.floor !== null && view.floor !== undefined && view.floor >= 0 && !view.showBasement) { /* UG unter Gelände: nur Platte */ }
    const y0 = HSS.floorY(pt, f, prj) + gf * ex, h = HSS.fh(pt, f);
    const isCut = view.floor === gf;
    // nur Außenkanten bekommen Wand und Fassade; Kanten, an die ein anderes Bauteil auf dieser Höhe anschließt, entfallen
    const ym = HSS.floorY(pt, f, prj) + h / 2, NB = HSS.nachbarn(pt, prj).list;
    const rings = rings0.map(({ r, side }) => ({ r, side, segs: aussenSegs(r, ym, NB) }));
    if (view.shell === 'aus' && !isCut) continue;
    // Geschossdecke
    const slab = new THREE.Mesh(HSS.slabGeo(outer, holes, y0 - 0.25, 0.25), slabMat); slab.receiveShadow = true; slab.castShadow = true;
    slab.userData = Object.assign({ floor: f, gf, slab: true }, meta); grp.add(slab);
    if (view.shell === 'aus' && !isCut) continue;
    let wh = h;
    if (isCut) { if (view.cut === 'aus') continue; if (view.cut === 'halb') wh = 1.1; }
    if (f < 0 && !isCut && !(view.floor !== null && view.floor !== undefined && view.floor < 0)) {
      // Untergeschoss im Erdreich: nur schlichte Wand
      for (const { segs } of rings) if (segs.length) walls.push(segWallGeo(segs, y0, h));
      continue;
    }
    if (plan && !(isCut && view.cut === 'voll')) {
      const park = fc.type === 'parkhaus' || pt.use === 'parkhaus';
      for (const { segs } of rings) {
        if (!segs.length) continue;
        walls.push(segWallGeo(segs, y0, park && !isCut ? Math.min(wh, 1.1) : wh));
        if (!isCut && !park && wh > 2.4 && f >= 0) bands.push(segWallGeo(segs, y0 + 0.95, Math.min(wh - 1.45, fc.type === 'glas' || fc.type === 'lamellen' ? wh - 1.2 : 1.55)));
        if (!isCut && f > 0) flines.push(segWallGeo(segs, y0 - 0.14, 0.16));
      }
      continue;
    }
    if (fc.type === 'glas' || fc.type === 'lamellen') {
      // Brüstung/Deckenstirn als schmales Band
      for (const { segs } of rings) if (segs.length) walls.push(segWallGeo(segs, y0 - 0.25, 0.3));
      if (!isCut || view.cut === 'voll') facadeFloor(inst, rings[0].r, y0, wh, fc, { glassMat, frameMat, wallMat, accentMat, side: 1, segs: rings[0].segs });
      else for (const { segs } of rings) if (segs.length) walls.push(segWallGeo(segs, y0, wh));
      for (let i = 1; i < rings.length; i++) if (!isCut) facadeFloor(inst, rings[i].r, y0, wh, fc, { glassMat, frameMat, wallMat, accentMat, side: 1, segs: rings[i].segs });
    } else if (fc.type === 'parkhaus') {
      for (const { r, segs } of rings) facadeFloor(inst, r, y0, wh, fc, { glassMat, frameMat, wallMat, accentMat, side: 1, segs });
    } else {
      for (const { segs } of rings) if (segs.length) walls.push(segWallGeo(segs, y0, wh));
      if (!isCut || view.cut === 'voll') for (const { r, segs } of rings) facadeFloor(inst, r, y0, wh, fc, { glassMat, frameMat, wallMat, accentMat, side: 1, segs });
    }
  }
  if (walls.length) { const wm = new THREE.Mesh(mergeGeometries(walls), wallMat); wm.castShadow = !transparent; wm.receiveShadow = true; wm.userData = Object.assign({ wall: true }, meta); grp.add(wm); }
  if (bands.length) { const bm = new THREE.Mesh(mergeGeometries(bands), HSS.library.shared('planband' + transparent, () => new THREE.MeshStandardMaterial({ color: '#c6d8e4', roughness: 0.35, metalness: 0.05, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, transparent, opacity: transparent ? 0.3 : 1, depthWrite: !transparent, side: THREE.DoubleSide }))); bm.userData = Object.assign({}, meta); grp.add(bm); }
  if (flines.length) { const lm = new THREE.Mesh(mergeGeometries(flines), HSS.library.shared('planlinie' + transparent, () => new THREE.MeshStandardMaterial({ color: '#c3cbd3', roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, transparent, opacity: transparent ? 0.4 : 1, depthWrite: !transparent, side: THREE.DoubleSide }))); lm.userData = Object.assign({}, meta); grp.add(lm); }
  inst.meshes(meta).forEach(m => grp.add(m));
  // Dach, Attika, Technikaufbau
  const topGF = HSS.globalFloor(pt, pt.floors - 1, prj);
  if ((view.floor === null || view.floor === undefined || view.floor > topGF) && view.shell !== 'aus') {
    const yt = HSS.partTopY(pt, prj) + (topGF + 1) * ex;
    const roof = new THREE.Mesh(HSS.slabGeo(outer, holes, yt - 0.3, 0.3), roofMat); roof.castShadow = roof.receiveShadow = true; roof.userData = Object.assign({ roof: true }, meta); grp.add(roof);
    // Geneigtes Dach (Sattel, Walm, Zelt, Pult, Shed): Dachflächen, Giebel, Glasbänder
    const geneigt = HSS.dachGeneigt?.(pt) && !holes.length;
    if (geneigt) {
      const dg = HSS.dachGeo(pt, HSS.partFootprintLocal(pt).outer, yt);
      const dc = feP ? feP.farbe : plan ? '#e3e6ea' : (pt.roof?.color && pt.roof.color !== '#9aa3ad' ? pt.roof.color : pt.roof.type === 'shed' ? '#a9b1b9' : '#5f6469');
      const dm = glasHull ? tMat('glasdach2', '#e6ebef', 0.22) : HSS.library.shared('dach2|' + dc, () => new THREE.MeshStandardMaterial({ color: dc, roughness: 0.85, side: THREE.DoubleSide }));
      if (dg.dach) { const m = new THREE.Mesh(dg.dach, dm); m.castShadow = m.receiveShadow = true; m.userData = Object.assign({ roof: true }, meta); grp.add(m); }
      if (dg.wand) { const m = new THREE.Mesh(dg.wand, transparent ? wallMat : HSS.library.shared('giebel|' + wallBase, () => new THREE.MeshStandardMaterial({ color: wallBase, roughness: 0.9, side: THREE.DoubleSide }))); m.castShadow = !transparent; m.receiveShadow = true; m.userData = Object.assign({ wall: true }, meta); grp.add(m); }
      if (dg.glas) { const m = new THREE.Mesh(dg.glas, glassMat); m.userData = Object.assign({}, meta); grp.add(m); }
    }
    const par = geneigt ? 0 : (pt.roof?.parapet ?? 0.9);
    if (par > 0 || (plan && !geneigt)) { const pm = new THREE.Mesh(mergeGeometries(rings0.map(({ r }) => ringWallGeo(r, yt - (plan ? 0.35 : 0), plan ? Math.max(0.9, par + 0.35) : par))), LM(feP ? feP.farbe : plan ? (building.color || '#144477') : fc.type === 'glas' ? (fc.accent || '#144477') : wallBase)); pm.castShadow = true; pm.userData = Object.assign({ parapet: true }, meta); grp.add(pm); }
    if (pt.roof?.plant && !geneigt && pt.use !== 'parkhaus' && view.shell !== 'aus' && !glasHull) {
      const bb = G.bbox(HSS.partFootprintLocal(pt).outer);
      const pw = Math.min(bb.w * 0.35, 18), pd = Math.min(bb.d * 0.4, 10);
      const box = new THREE.Mesh(new THREE.BoxGeometry(pw, 3.0, pd), LM('#b9c0c7'));
      const c = HSS.toWorld(pt, [bb.cx + bb.w * 0.15, bb.cz]); box.position.set(c[0], yt + 1.5, c[1]); box.rotation.y = -U.rad(pt.rot || 0);
      box.castShadow = true; box.userData = Object.assign({}, meta); grp.add(box);
      const grill = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.9, 0.5, pd * 0.9), LM('#8d959e')); grill.position.set(c[0], yt + 3.25, c[1]); grill.rotation.y = box.rotation.y; grp.add(grill);
    }
    if (pt.roof?.type === 'gruen' && !glasHull && !feP) { // Gründach-Aufkantung
      const g = new THREE.Mesh(HSS.slabGeo(G.fillet(outer, 0), holes, yt, 0.08), LM('#88b073')); g.receiveShadow = true; grp.add(g);
    }
    if (pt.roof?.helipad) { const hp = HSS.library.build('aussen.helipad', { w: Math.min(22, G.bbox(outer).w * 0.8), d: Math.min(22, G.bbox(outer).d * 0.8), h: 0.06 }); hp.position.set(pt.x, yt + 0.02, pt.z); grp.add(hp); }
  }
  // Sockel bei Gelände unterhalb der EG-Unterkante
  // Nur für Hanglagen: erhöhte Bauteile (Geschossversatz, min_height, Luftgeschoss) bekommen keinen Sockel bis zum Boden,
  // und in einer Etagenansicht unterhalb des Bauteils erscheint er nicht
  const ersteGF = HSS.globalFloor(pt, floors[0], prj);
  const vf = view.floor;
  if (!pt.stackOn && view.shell !== 'aus' && !(pt.floorOffset > 0) && (vf === null || vf === undefined || vf >= ersteGF)) {
    const base = HSS.partBaseY(pt, prj) - ((pt.baseOffset || 0) > 1.5 ? pt.baseOffset : 0); let minT = Infinity;
    for (const p of outer) minT = Math.min(minT, HSS.terrainH(p[0], p[1], prj));
    if (minT < base - 0.15) { const s = new THREE.Mesh(ringWallGeo(outer, minT - 0.3, base - minT + 0.05), LM('#8f8a80')); s.userData = Object.assign({}, meta); s.castShadow = true; grp.add(s); }
  }
  return grp;
};

/* ---------- Brücken ---------- */
// Anschlusspunkte: nächstgelegene Fassadenpunkte beider Bauteile
HSS.bridgeEnds = (br, prj = HSS.project()) => {
  const A = HSS.findPart(br.a.part, prj), B = HSS.findPart(br.b.part, prj); if (!A || !B) return null;
  const fa = HSS.partFootprint(A.part).outer, fb = HSS.partFootprint(B.part).outer;
  let best = null;
  const near = (p, ring) => { let bb = null; for (let i = 0; i < ring.length; i++) { const c = G.closestOnSeg(p, ring[i], ring[(i + 1) % ring.length]); const d = G.dist(p, c.pt); if (!bb || d < bb.d) bb = { d, pt: c.pt }; } return bb; };
  const ca = [A.part.x, A.part.z], cb = [B.part.x, B.part.z];
  let pa, pb;
  if (br.ma && br.mb) { // von Hand gesetzte Anschlusspunkte (lokal zum Bauteil, wandern mit dem Gebäude)
    pa = near(HSS.toWorld(A.part, br.ma), fa).pt; pb = near(HSS.toWorld(B.part, br.mb), fb).pt;
  } else { pa = near(cb, fa).pt; pb = near(pa, fb).pt; pa = near(pb, fa).pt; }
  if (br.offset && !br.ma) { const dx = pb[0] - pa[0], dz = pb[1] - pa[1], l = Math.hypot(dx, dz) || 1; const ox = -dz / l * br.offset, oz = dx / l * br.offset; pa = near([pa[0] + ox, pa[1] + oz], fa).pt; pb = near([pb[0] + ox, pb[1] + oz], fb).pt; }
  best = { pa, pb, ya: HSS.floorY(A.part, br.a.floor, prj), yb: HSS.floorY(B.part, br.b.floor, prj), len: G.dist(pa, pb), A, B };
  return best;
};
HSS.buildBridge = (br, view = {}) => {
  const e = HSS.bridgeEnds(br); const grp = new THREE.Group(); grp.userData = { kind: 'bridge', id: br.id };
  if (!e || e.len < 0.5) return grp;
  const gfa = HSS.globalFloor(e.A.part, br.a.floor), gfb = HSS.globalFloor(e.B.part, br.b.floor);
  const ex = view.explode || 0;
  if (view.floor !== null && view.floor !== undefined && Math.min(gfa, gfb) > view.floor) return grp;
  const ya = e.ya + gfa * ex, yb = e.yb + gfb * ex;
  const w = br.width || 4, h = br.height || 3.4, levels = Math.max(1, br.levels || 1);
  const dx = e.pb[0] - e.pa[0], dz = e.pb[1] - e.pa[1], ang = Math.atan2(dz, dx);
  const len = e.len + 0.6, mid = [(e.pa[0] + e.pb[0]) / 2, (e.pa[1] + e.pb[1]) / 2];
  const slope = Math.atan2(yb - ya, e.len);
  const body = new THREE.Group(); body.position.set(mid[0], (ya + yb) / 2, mid[1]); body.rotation.order = 'YZX'; body.rotation.y = -ang; body.rotation.z = slope;
  const glass = HSS.library.material(br.glass || '#9fc4d8', 'glas', 0.45), frame = LM(br.frame || '#59636e'), wall = LM(br.color || '#e9ecef');
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = !mat.transparent; m.receiveShadow = true; m.userData = { kind: 'bridge', id: br.id }; body.add(m); return m; };
  const H = h * levels;
  add(new THREE.BoxGeometry(len, 0.35, w), LM('#c9ced4'), 0, -0.175, 0);
  add(new THREE.BoxGeometry(len, 0.35, w + 0.1), br.type === 'glas' ? frame : wall, 0, H + 0.175, 0);
  for (let l = 1; l < levels; l++) add(new THREE.BoxGeometry(len, 0.3, w), LM('#c9ced4'), 0, l * h, 0);
  if (br.type === 'glas') {
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(len, H, 0.04), glass, 0, H / 2, s * w / 2);
      const n = Math.max(2, Math.round(len / 1.5));
      for (let i = 0; i <= n; i++) add(new THREE.BoxGeometry(0.08, H, 0.12), frame, -len / 2 + i * len / n, H / 2, s * w / 2);
      add(new THREE.BoxGeometry(len, 0.08, 0.12), frame, 0, 1.0, s * w / 2);
    }
  } else {
    const inst = new Inst();
    for (const s of [-1, 1]) {
      add(new THREE.BoxGeometry(len, H, 0.25), wall, 0, H / 2, s * (w / 2 - 0.12));
      for (let l = 0; l < levels; l++) {
        const n = Math.max(1, Math.round(len / 1.8));
        for (let i = 0; i < n; i++) { const x = -len / 2 + (i + 0.5) * len / n; add(new THREE.BoxGeometry(len / n * 0.62, h * 0.45, 0.06), glass, x, l * h + h * 0.55, s * (w / 2 + 0.02)); add(new THREE.BoxGeometry(len / n * 0.62 + 0.1, h * 0.45 + 0.1, 0.04), frame, x, l * h + h * 0.55, s * (w / 2 + 0.005)); }
      }
    }
    inst.meshes({});
  }
  // Stützen bei großer Höhe über Gelände
  if (br.supports !== false && e.len > 14) {
    const n = Math.floor(e.len / 14);
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), px = e.pa[0] + dx * t, pz = e.pa[1] + dz * t, py = ya + (yb - ya) * t - 0.35, g = HSS.terrainH(px, pz);
      if (py - g > 2.5) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, py - g, 12), LM('#b5bac0')); c.position.set(px, g + (py - g) / 2, pz); c.castShadow = true; grp.add(c); }
    }
  }
  grp.add(body);
  return grp;
};

/* ---------- Innenausbau (Wände, Türen, Räume) ---------- */
HSS.ROOMTYPES = {
  patient1: { name: 'Patientenzimmer 1-Bett', color: '#dbe9f5', din: 'NUF6' }, patient2: { name: 'Patientenzimmer 2-Bett', color: '#d2e4f3', din: 'NUF6' }, nass: { name: 'Nasszelle', color: '#e6f2f5', din: 'NUF7' },
  stuetzpunkt: { name: 'Stützpunkt / Dienstplatz', color: '#cfe6dd', din: 'NUF2' }, rein: { name: 'Pflegearbeitsraum rein', color: '#d8efe3', din: 'NUF6' }, unrein: { name: 'Pflegearbeitsraum unrein', color: '#f2dcd9', din: 'NUF6' },
  medikamente: { name: 'Medikamentenraum', color: '#f6ecc9', din: 'NUF6' }, lager: { name: 'Lager Material/Wäsche', color: '#ece6da', din: 'NUF4' }, geraete: { name: 'Geräteraum', color: '#e3e0ea', din: 'NUF4' },
  arzt: { name: 'Arztdienstraum', color: '#e0e6ef', din: 'NUF2' }, leitung: { name: 'Stationsleitung', color: '#e0e6ef', din: 'NUF2' }, personal: { name: 'Personalaufenthalt', color: '#efe5d6', din: 'NUF1' }, besprechung: { name: 'Besprechung / Übergabe', color: '#e6e1f0', din: 'NUF2' },
  bad: { name: 'Pflegebad', color: '#e6f2f5', din: 'NUF6' }, entsorgung: { name: 'Entsorgung / Abstellraum unrein', color: '#eadad6', din: 'NUF4' }, putz: { name: 'Putzraum', color: '#e9e4de', din: 'NUF7' },
  wc: { name: 'WC Personal/Besucher', color: '#e6f2f5', din: 'NUF7' }, vorraum: { name: 'Vorraum', color: '#edf3f5', din: 'NUF7' }, kueche: { name: 'Stationsküche', color: '#f3ead8', din: 'NUF3' }, aufenthalt: { name: 'Tagesraum Patienten', color: '#f3eedd', din: 'NUF1' },
  betten: { name: 'Bettenabstellraum', color: '#ebe6dc', din: 'NUF4' }, angehoerige: { name: 'Angehörigenraum', color: '#f3eedd', din: 'NUF1' }, schleuse: { name: 'Schleuse / Vorraum Isolierzimmer', color: '#e4eef0', din: 'NUF6' }, labor: { name: 'Stationslabor', color: '#e1ecf3', din: 'NUF3' },
  untersuchung: { name: 'Untersuchung/Behandlung', color: '#dfeaf6', din: 'NUF6' }, warten: { name: 'Warten', color: '#f1ede4', din: 'NUF1' }, flur: { name: 'Flur', color: '#eef0f2', din: 'VF', noPlace: true },
  kern: { name: 'Aufzüge / Treppenhaus', color: '#d9dde2', din: 'VF', noPlace: true }, schacht: { name: 'Installationsschacht', color: '#cfd4da', din: 'TF', noPlace: true }, lichthof: { name: 'Lichthof', color: '#d6e8d4', din: 'AUSSEN', noPlace: true },
  reserve: { name: 'Reservefläche', color: '#f4f4f1', din: 'NUF7', noPlace: true }, pflege: { name: 'Pflegebereich', color: '#f2e6b8', din: 'NUF6' },
  archiv: { name: 'Archiv / Ablage', color: '#e9e3d6', din: 'NUF4' },
  /* Funktionsbereiche des ganzen Krankenhauses (DIN 13080) */
  foyer: { name: 'Eingangshalle / Foyer', color: '#f6edd5', din: 'VF' }, empfang: { name: 'Information / Empfang', color: '#f3e3c3', din: 'NUF2' }, aufnahme: { name: 'Patientenaufnahme', color: '#e6dcf0', din: 'NUF2' },
  cafeteria: { name: 'Cafeteria / Bistro', color: '#f6dcc4', din: 'NUF1' }, kiosk: { name: 'Kiosk / Shop', color: '#f3e0c7', din: 'NUF4' }, kapelle: { name: 'Raum der Stille / Kapelle', color: '#ece3f3', din: 'NUF5' },
  triage: { name: 'Ersteinschätzung (Triage)', color: '#f7d9d4', din: 'NUF6' }, schockraum: { name: 'Schockraum', color: '#f2c9c3', din: 'NUF6' }, gips: { name: 'Gipsraum', color: '#ece6dc', din: 'NUF6' }, zna_box: { name: 'Behandlungsraum ZNA', color: '#f4dcd7', din: 'NUF6' },
  roentgen: { name: 'Röntgen', color: '#d9e6f2', din: 'NUF6' }, ct: { name: 'CT', color: '#d3e2f2', din: 'NUF6' }, mrt: { name: 'MRT', color: '#cfdcf0', din: 'NUF6' }, schaltraum: { name: 'Schaltraum / Bedienraum', color: '#e2e8f0', din: 'NUF6' }, befundung: { name: 'Befundung', color: '#e3e8ef', din: 'NUF2' }, umkleide_pat: { name: 'Umkleide Patienten', color: '#e8eef3', din: 'NUF7' },
  einleitung: { name: 'Narkoseeinleitung', color: '#d9efe9', din: 'NUF6' }, aufwach: { name: 'Aufwachraum', color: '#d4ece3', din: 'NUF6' }, op_schleuse: { name: 'Patientenschleuse OP', color: '#e1efe9', din: 'NUF6' }, sterilgut: { name: 'Sterilgutlager', color: '#dcefe6', din: 'NUF4' }, waschraum_op: { name: 'Waschraum (chirurgische Händedesinfektion)', color: '#e1f0ee', din: 'NUF6' },
  labor_gross: { name: 'Zentrallabor', color: '#e1ecf3', din: 'NUF3' }, apotheke: { name: 'Apotheke', color: '#efe7f6', din: 'NUF3' }, zsva: { name: 'ZSVA Aufbereitung', color: '#e3efe8', din: 'NUF3' },
  kueche_zentral: { name: 'Zentralküche', color: '#f6e6cf', din: 'NUF3' }, spuelkueche: { name: 'Spülküche', color: '#efe6d9', din: 'NUF3' }, kuehlraum: { name: 'Kühlräume', color: '#e2edf3', din: 'NUF4' }, speisesaal: { name: 'Mitarbeiterrestaurant', color: '#f6dfc8', din: 'NUF1' },
  umkleide: { name: 'Personalumkleide', color: '#e6ecf1', din: 'NUF7' }, waesche: { name: 'Wäscheversorgung', color: '#e6eef4', din: 'NUF4' }, bettenzentrale: { name: 'Bettenaufbereitung', color: '#e9e6dc', din: 'NUF3' }, zentrallager: { name: 'Zentrallager', color: '#ece2d0', din: 'NUF4' }, warenannahme: { name: 'Warenannahme', color: '#ede0cb', din: 'NUF4' }, entsorgung_zentral: { name: 'Entsorgungszentrale', color: '#eadad6', din: 'NUF4' },
  verwaltung: { name: 'Verwaltung', color: '#e3e9f0', din: 'NUF2' }, schulung: { name: 'Schulung / Konferenz', color: '#e8e3f2', din: 'NUF5' }, bibliothek: { name: 'Bibliothek', color: '#efe8db', din: 'NUF5' },
  technikzentrale: { name: 'Technikzentrale (RLT, Elektro)', color: '#dfe2e6', din: 'TF' }, it: { name: 'IT / Serverraum', color: '#dde3ea', din: 'TF' }, pathologie: { name: 'Pathologie / Prosektur', color: '#e5e1ea', din: 'NUF3' }, abschied: { name: 'Abschiedsraum', color: '#ece6f2', din: 'NUF5' },
  kreisssaal: { name: 'Kreißsaal', color: '#f5e1ea', din: 'NUF6' }, physio: { name: 'Physiotherapie', color: '#dff0e4', din: 'NUF6' }, endoskopie: { name: 'Endoskopie', color: '#dde9f4', din: 'NUF6' }, herzkatheter: { name: 'Herzkatheterlabor', color: '#d8e3f3', din: 'NUF6' }, dialyseplatz: { name: 'Dialyseplatz', color: '#dfeaf6', din: 'NUF6' },
  sozialdienst: { name: 'Sozialdienst / Seelsorge', color: '#ece6f2', din: 'NUF2' }, spielzimmer: { name: 'Spielzimmer', color: '#f6edc8', din: 'NUF1' },
  behandlung: { name: 'Behandlungsplatz', color: '#dfeaf6', din: 'NUF6' }, op: { name: 'OP-Saal', color: '#d6efe8', din: 'NUF6' }, technik: { name: 'Technik', color: '#e2e4e7', din: 'TF' },
  awt: { name: 'AWT-Bahnhof', color: '#f4ecd0', din: 'NUF4' }, logistik: { name: 'Logistik/Ver- und Entsorgung', color: '#efe7d8', din: 'NUF4' }, buero: { name: 'Büro', color: '#e8ebef', din: 'NUF2' }, sonstiges: { name: 'Raum', color: '#eceff2', din: 'NUF7' }
};
/* Flächenarten nach DIN 277 (Nutzungsgruppen der Nutzungsfläche, Verkehrs- und Technikfläche) */
HSS.DIN277 = {
  NUF1: { name: 'NUF 1 Wohnen und Aufenthalt', kurz: 'NUF 1', color: '#f2d39b' }, NUF2: { name: 'NUF 2 Büroarbeit', kurz: 'NUF 2', color: '#a9c6e8' },
  NUF3: { name: 'NUF 3 Produktion, Labor, Küche', kurz: 'NUF 3', color: '#c9b3e6' }, NUF4: { name: 'NUF 4 Lagern, Verteilen', kurz: 'NUF 4', color: '#d9c2a3' },
  NUF5: { name: 'NUF 5 Bildung, Unterricht, Kultur', kurz: 'NUF 5', color: '#b9dfc4' }, NUF6: { name: 'NUF 6 Heilen und Pflegen', kurz: 'NUF 6', color: '#9fd3c7' },
  NUF7: { name: 'NUF 7 Sonstige Nutzungen (Sanitär, Abstellen, Reserve)', kurz: 'NUF 7', color: '#d5d9de' }, VF: { name: 'VF Verkehrsfläche (Flure, Treppen, Aufzüge)', kurz: 'VF', color: '#f0e6a8' },
  TF: { name: 'TF Technikfläche (Schächte, Technik)', kurz: 'TF', color: '#bcc3cb' }, AUSSEN: { name: 'Lichthof (nicht in der BGF)', kurz: 'Hof', color: '#cfe5cb' }
};
HSS.roomArea = r => r.poly ? Math.abs(G.area(r.poly)) : r.w * r.d;
HSS.roomDin = r => r.din || (HSS.ROOMTYPES[r.use] || HSS.ROOMTYPES.sonstiges).din || 'NUF7';
const PICKMAT = new THREE.MeshBasicMaterial({ visible: false });
/* Aufzugs- und Treppenschächte eines Geschosses (lokal zum Bauteil): Wände laufen nie durch einen Schacht */
let _schachtMemo = { sig: '', map: null, t: 0, prj: null };
HSS.schaechte = (pt, f, prj = HSS.project()) => {
  const now = performance.now();
  if (_schachtMemo.prj !== prj || now - _schachtMemo.t > 80) { _schachtMemo.t = now; _schachtMemo.prj = prj; _schachtMemo.alt = true; }
  if (!_schachtMemo.alt) return schachtListe(pt, f, prj);
  _schachtMemo.alt = false;
  const objs = prj.objects.filter(o => o.host && /^erschl\.(aufzug|treppe)/.test(o.lib) && !o.hidden);
  const sig = objs.map(o => { const P = HSS.findPart(o.host.part, prj)?.part; return [o.id, o.x, o.z, o.rot, o.host.part, o.host.floor, o.size?.w, o.size?.d, o.vonGF, o.bisGF, P?.x, P?.z, P?.rot].join(','); }).join(';') + '|' + prj.buildings.length;
  if (_schachtMemo.sig !== sig) {
    const map = new Map();
    for (const o of objs) {
      const d = HSS.library.get(o.lib), P = HSS.findPart(o.host.part, prj); if (!d || !P) continue;
      const size = o.size || d.size, L = HSS.liftStops(o, prj), rot = (o.rot || 0) + (P.part.rot || 0);
      for (const gf of L.stops) { if (!map.has(gf)) map.set(gf, []); map.get(gf).push({ x: L.x, z: L.z, rot, hw: size.w / 2 - 0.12, hd: size.d / 2 - 0.12, id: o.id }); }
    }
    Object.assign(_schachtMemo, { sig, map });
  }
  return schachtListe(pt, f, prj);
};
const schachtListe = (pt, f, prj) => {
  const gf = HSS.globalFloor(pt, f, prj), list = _schachtMemo.map.get(gf) || [];
  return list.map(s => { const c = HSS.toLocal(pt, [s.x, s.z]); return { x: c[0], z: c[1], rot: s.rot - (pt.rot || 0), hw: s.hw, hd: s.hd, id: s.id }; })
    .filter(s => s.hw > 0 && s.hd > 0 && G.pointIn([s.x, s.z], HSS.partFootprintLocal(pt).outer));
};
// Abschnitt [t0, t1] (in Metern entlang der Wand), der in einem Schacht liegt
const schachtSchnitt = (a, b, S) => {
  const out = [];
  for (const s of S) {
    const r = -U.rad(s.rot), c = Math.cos(r), sn = Math.sin(r);
    const loc = p => { const dx = p[0] - s.x, dz = p[1] - s.z; return [dx * c - dz * sn, dx * sn + dz * c]; };
    const A = loc(a), B = loc(b), dx = B[0] - A[0], dz = B[1] - A[1]; let t0 = 0, t1 = 1, ok = true;
    for (const [pp, q] of [[-dx, A[0] + s.hw], [dx, s.hw - A[0]], [-dz, A[1] + s.hd], [dz, s.hd - A[1]]]) {
      if (Math.abs(pp) < 1e-12) { if (q < 0) { ok = false; break; } continue; }
      const t = q / pp; if (pp < 0) { if (t > t1) { ok = false; break; } t0 = Math.max(t0, t); } else { if (t < t0) { ok = false; break; } t1 = Math.min(t1, t); }
    }
    const len = G.dist(a, b);
    if (ok && t1 - t0 > 0.01) out.push([t0 * len, t1 * len]);
  }
  return out;
};
HSS.schachtSchnitt = schachtSchnitt;
/* Kollisionsfrei stellen: ein Einrichtungsobjekt (im Gebäude) darf weder Wände noch Aufzugs-/Treppenschächte
   noch andere Objekte durchdringen. Liefert die nächste freie Lage (lokal zum Bauteil) im Umkreis von maxR m oder null. */
HSS.freieLage = (o, prj = HSS.project(), maxR = 1.5) => {
  if (!o.host) return null;
  const d = HSS.library.get(o.lib), P = HSS.findPart(o.host.part, prj); if (!d || !P || d.anchor === 'wand' || d.anchor === 'decke') return null;
  const shaft = /^erschl\.(aufzug|treppe)/.test(o.lib); if (/^erschl\./.test(o.lib) && !shaft) return null;
  const pt = P.part, f = o.host.floor, I = HSS.interior(pt.id, f), s = o.size || d.size, m = shaft ? 0.12 : 0.06;
  const hw = s.w / 2 - m, hd = s.d / 2 - m, r = U.rad(o.rot || 0); if (hw <= 0 || hd <= 0) return null;
  const S = shaft ? [] : HSS.schaechte(pt, f, prj);
  const andere = shaft ? [] : prj.objects.filter(y => y !== o && y.id !== o.id && y.host && y.host.part === pt.id && y.host.floor === f && !/^erschl\./.test(y.lib)).map(y => { const dy = HSS.library.get(y.lib); if (!dy || dy.anchor === 'wand' || dy.anchor === 'decke') return null; const sy = y.size || dy.size; return { x: y.x, z: y.z, rot: y.rot || 0, hw: sy.w / 2 - 0.06, hd: sy.d / 2 - 0.06 }; }).filter(y => y && y.hw > 0 && y.hd > 0 && Math.hypot(y.x - o.x, y.z - o.z) < maxR + 6);
  const ecken = (x, z) => [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(q => { const w = G.rot(q, r); return [w[0] + x, w[1] + z]; });
  const kanten = c => c.map((q, i) => [q, c[(i + 1) % 4]]);
  const nah = maxR + Math.hypot(hw, hd) + 0.5, umriss = HSS.partFootprintLocal(pt).outer;
  const waende = (I?.walls || []).filter(w => G.dist([o.x, o.z], G.closestOnSeg([o.x, o.z], w.a, w.b).pt) < nah);
  const imUmriss = (x, z) => ecken(x, z).every(q => G.pointIn(q, umriss)), warDrin = imUmriss(o.x, o.z);
  const kosten = (x, z) => {
    const c = ecken(x, z), box = { x, z, rot: o.rot || 0, hw, hd }; let k = 0;
    for (const w of waende) for (const q of schachtSchnitt(w.a, w.b, [box])) k += q[1] - q[0];
    for (const b of S.concat(andere)) { if (Math.hypot(b.x - x, b.z - z) > Math.hypot(b.hw, b.hd) + Math.hypot(hw, hd)) continue; for (const [a, e] of kanten(c)) for (const q of schachtSchnitt(a, e, [b])) k += q[1] - q[0]; const l = G.rot([x - b.x, z - b.z], -U.rad(b.rot)); if (Math.abs(l[0]) < b.hw && Math.abs(l[1]) < b.hd) k += 1; }
    if (warDrin && !imUmriss(x, z)) k += 10;
    return k;
  };
  if (kosten(o.x, o.z) < 0.05) return null;
  const ex = G.rot([1, 0], r), ez = G.rot([0, 1], r);
  for (let R = 0.05; R <= maxR + 1e-6; R += 0.05) {
    let best = null; const n = Math.round(R / 0.05);
    for (let i = -n; i <= n; i++) for (const [u, v] of [[i * 0.05, -R], [i * 0.05, R], [-R, i * 0.05], [R, i * 0.05]]) {
      const x = o.x + ex[0] * u + ez[0] * v, z = o.z + ex[1] * u + ez[1] * v;
      if (kosten(x, z) < 0.05) { const dd = Math.hypot(u, v); if (!best || dd < best.dd) best = { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, dd }; }
    }
    if (best) return best;
  }
  return null;
};
HSS.buildInterior = (pt, f, view = {}) => {
  const I = HSS.interior(pt.id, f); const grp = new THREE.Group(); grp.userData = { kind: 'interior', part: pt.id, floor: f };
  if (!I) return grp;
  const gf = HSS.globalFloor(pt, f), y0 = HSS.floorY(pt, f) + gf * (view.explode || 0), h = HSS.fh(pt, f) - 0.25;
  const wallH = view.cut === 'voll' ? h : view.cut === 'aus' ? 0.15 : 1.1;
  const ang = -U.rad(pt.rot || 0);
  const local = new THREE.Group(); local.position.set(pt.x, y0, pt.z); local.rotation.y = ang; grp.add(local);
  // Räume (Bodenflächen)
  for (const r of I.rooms) {
    const rt = HSS.ROOMTYPES[r.use] || HSS.ROOMTYPES.sonstiges;
    const poly = r.poly || [[r.x - r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z + r.d / 2], [r.x - r.w / 2, r.z + r.d / 2]];
    const m = new THREE.Mesh(HSS.slabGeo(poly, [], 0.005, 0.02), LM(view.m2 ? (HSS.DIN277[HSS.roomDin(r)] || {}).color || '#ddd' : (r.color || rt.color))); m.receiveShadow = true;
    m.userData = { kind: 'room', id: r.id, part: pt.id, floor: f }; local.add(m);
  }
  // Wände mit Türöffnungen
  const wallMat = LM('#f4f5f7'), capMat = LM('#9aa3ad');
  const geos = [], caps = [], S = HSS.schaechte(pt, f);
  for (const w of I.walls) {
    const len = G.dist(w.a, w.b); if (len < 0.05) continue;
    const doors = I.doors.filter(d => d.wall === w.id).map(d => [U.clamp(d.t * len - d.w / 2, 0, len), U.clamp(d.t * len + d.w / 2, 0, len), d]).sort((x, y) => x[0] - y[0]);
    const segs = []; let s = 0;
    for (const [d0, d1] of doors) { if (d0 > s) segs.push([s, d0, 0, wallH]); if (wallH > 2.2) segs.push([d0, d1, 2.15, wallH]); s = Math.max(s, d1); }
    if (s < len) segs.push([s, len, 0, wallH]);
    // Schachtbereiche aussparen
    const cuts = S.length ? schachtSchnitt(w.a, w.b, S) : [];
    if (cuts.length) for (const [c0, c1] of cuts) for (let i = segs.length - 1; i >= 0; i--) { const q = segs[i]; if (c1 <= q[0] || c0 >= q[1]) continue; const rest = []; if (c0 > q[0]) rest.push([q[0], c0, q[2], q[3]]); if (c1 < q[1]) rest.push([c1, q[1], q[2], q[3]]); segs.splice(i, 1, ...rest); }
    const ux = (w.b[0] - w.a[0]) / len, uz = (w.b[1] - w.a[1]) / len, a = Math.atan2(uz, ux), t = w.t || 0.15;
    for (const [s0, s1, yb, yt] of segs) {
      if (s1 - s0 < 0.01 || yt - yb < 0.01) continue;
      const g = new THREE.BoxGeometry(s1 - s0 + (s0 === 0 || s1 === len ? t / 2 : 0), yt - yb, t);
      g.rotateY(-a); const c = (s0 + s1) / 2; g.translate(w.a[0] + ux * c, yb + (yt - yb) / 2, w.a[1] + uz * c); geos.push(g);
      if (yt < h) { const cg = new THREE.BoxGeometry(s1 - s0, 0.02, t + 0.01); cg.rotateY(-a); cg.translate(w.a[0] + ux * c, yt + 0.01, w.a[1] + uz * c); caps.push(cg); }
    }
    // Türblätter
    for (const [d0, d1, d] of doors) {
      const c = (d0 + d1) / 2, lib = d.lib || 'erschl.tuer.1';
      if (lib === 'offen') continue;
      if (view.cut !== 'voll') { const g = new THREE.BoxGeometry(d1 - d0, 0.02, t + 0.02); g.rotateY(-a); g.translate(w.a[0] + ux * c, 0.02, w.a[1] + uz * c); caps.push(g); continue; }
      const o = HSS.library.build(lib, { w: d1 - d0 + 0.1, d: t + 0.05, h: 2.2 }); o.position.set(w.a[0] + ux * c, 0, w.a[1] + uz * c); o.rotation.y = -a; local.add(o);
    }
  }
  if (geos.length) { const m = new THREE.Mesh(mergeGeometries(geos), wallMat); m.castShadow = true; m.receiveShadow = true; m.userData = { kind: 'walls', part: pt.id, floor: f }; local.add(m); }
  if (caps.length) { const m = new THREE.Mesh(mergeGeometries(caps), capMat); local.add(m); }
  // Wandsegmente einzeln anklickbar (unsichtbare Pick-Boxen)
  for (const w of I.walls) {
    const len = G.dist(w.a, w.b); if (len < 0.05) continue;
    const ux = (w.b[0] - w.a[0]) / len, uz = (w.b[1] - w.a[1]) / len;
    const pk = new THREE.Mesh(new THREE.BoxGeometry(len, Math.max(wallH, 0.3), (w.t || 0.15) + 0.1), PICKMAT);
    pk.rotation.y = -Math.atan2(uz, ux); pk.position.set((w.a[0] + w.b[0]) / 2, Math.max(wallH, 0.3) / 2, (w.a[1] + w.b[1]) / 2);
    pk.userData = { kind: 'wall', id: w.id, part: pt.id, floor: f, pick: true }; local.add(pk);
  }
  return grp;
};
// Raum als 4 Wände anlegen (lokale Koordinaten)
HSS.roomWalls = (r, t = 0.15) => {
  const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
  return [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]].map(([a, b]) => ({ id: U.uid('w'), a, b, t, room: r.id }));
};
// Doppelte Wände (gemeinsame Kanten zweier Räume) zusammenführen
HSS.dedupeWalls = walls => {
  const key = w => { const a = w.a.map(v => Math.round(v * 20)), b = w.b.map(v => Math.round(v * 20)); return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? a.concat(b).join(',') : b.concat(a).join(','); };
  const seen = new Set(); return walls.filter(w => { const k = key(w); if (seen.has(k)) return false; seen.add(k); return true; });
};
})();
