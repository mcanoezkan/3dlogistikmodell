/* =====================================================================
   HSS · einrichtung.js – Räume automatisch und vollständig einrichten
   Jeder Raum wird in ein eigenes Raster gelegt: Türwand vorn (v = 0), Rückwand hinten,
   Seitenwände links/rechts. Ausstattung wird je Raumtyp entlang der Wände gepackt
   (Kollisionsprüfung, Türbereiche frei, unter Fenstern nur niedrige Möbel) und wächst
   mit der Raumgröße. Grundlagen der Ausstattung: DGUV Information 207-027 (Pflegebereiche),
   KRINKO-Empfehlungen (Händehygiene, Aufbereitung Steckbecken), DIVI 2022 (Intensiv),
   Musterraumprogramme der Länder (RLP AH 2.01/2.03, Standardprogramm Schleswig-Holstein).
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const EPS = 0.03;

/* Kontext eines Raums: Seiten, Türen, Fenster, Hindernisse */
function frame(pt, f, room, I) {
  const fp = HSS.partFootprintLocal(pt);
  const x0 = room.x - room.w / 2, x1 = room.x + room.w / 2, z0 = room.z - room.d / 2, z1 = room.z + room.d / 2;
  const S = {
    z0: { n: [0, 1], on: p => Math.abs(p[1] - z0) < 0.14 && p[0] > x0 - 0.05 && p[0] < x1 + 0.05, mid: [room.x, z0] },
    z1: { n: [0, -1], on: p => Math.abs(p[1] - z1) < 0.14 && p[0] > x0 - 0.05 && p[0] < x1 + 0.05, mid: [room.x, z1] },
    x0: { n: [1, 0], on: p => Math.abs(p[0] - x0) < 0.14 && p[1] > z0 - 0.05 && p[1] < z1 + 0.05, mid: [x0, room.z] },
    x1: { n: [-1, 0], on: p => Math.abs(p[0] - x1) < 0.14 && p[1] > z0 - 0.05 && p[1] < z1 + 0.05, mid: [x1, room.z] }
  };
  // Türen auf den Raumseiten
  const doors = [];
  for (const d of I.doors || []) {
    const w = (I.walls || []).find(x => x.id === d.wall); if (!w) continue;
    const p = [w.a[0] + (w.b[0] - w.a[0]) * d.t, w.a[1] + (w.b[1] - w.a[1]) * d.t];
    for (const k in S) if (S[k].on(p)) doors.push({ side: k, p, w: d.w || 1.1 });
  }
  // Fassadenseiten (Raumkante liegt an der Gebäudekante)
  const edgeDist = p => { let best = 1e9; const o = fp.outer; for (let i = 0; i < o.length; i++) { const c = G.closestOnSeg(p, o[i], o[(i + 1) % o.length]); best = Math.min(best, G.dist(p, c.pt)); } return best; };
  for (const k in S) S[k].facade = edgeDist(S[k].mid) < 0.6;
  // Vorderseite = Seite der breitesten Tür, sonst gegenüber der Fassade
  let front = null;
  if (doors.length) front = doors.slice().sort((a, b) => b.w - a.w)[0].side;
  else { const fac = Object.keys(S).find(k => S[k].facade); front = fac ? { z0: 'z1', z1: 'z0', x0: 'x1', x1: 'x0' }[fac] : (room.w >= room.d ? 'z0' : 'x0'); }
  const ev = S[front].n, eu = [ev[1], -ev[0]];
  const W = Math.abs(eu[0]) ? room.w : room.d, D = Math.abs(ev[0]) ? room.w : room.d;
  const O = [room.x - eu[0] * W / 2 - ev[0] * D / 2, room.z - eu[1] * W / 2 - ev[1] * D / 2];
  const toUV = p => [(p[0] - O[0]) * eu[0] + (p[1] - O[1]) * eu[1], (p[0] - O[0]) * ev[0] + (p[1] - O[1]) * ev[1]];
  const toLoc = (u, v) => [O[0] + eu[0] * u + ev[0] * v, O[1] + eu[1] * u + ev[1] * v];
  const sideOf = n => Object.keys(S).find(k => Math.abs(S[k].n[0] - n[0]) < 1e-6 && Math.abs(S[k].n[1] - n[1]) < 1e-6);
  const map = { front, back: sideOf([-ev[0], -ev[1]]), left: sideOf(eu), right: sideOf([-eu[0], -eu[1]]) };
  const fac = {}; for (const k in map) fac[k] = S[map[k]].facade;
  // Hindernisse im Raumraster
  const obst = [];
  for (const d of doors) {
    const [u, v] = toUV(d.p), hw = d.w / 2 + 0.12, side = Object.keys(map).find(k => map[k] === d.side);
    if (side === 'front') obst.push({ u0: u - hw, u1: u + hw, v0: -1, v1: 1.25, door: true });
    if (side === 'back') obst.push({ u0: u - hw, u1: u + hw, v0: D - 1.25, v1: D + 1, door: true });
    if (side === 'left') obst.push({ u0: -1, u1: 1.25, v0: v - hw, v1: v + hw, door: true });
    if (side === 'right') obst.push({ u0: W - 1.25, u1: W + 1, v0: v - hw, v1: v + hw, door: true });
  }
  const subs = [];
  for (const r of I.rooms || []) {
    if (r === room || r.id === room.id) continue;
    if (Math.abs(r.x - room.x) > (room.w - r.w) / 2 + 0.05 || Math.abs(r.z - room.z) > (room.d - r.d) / 2 + 0.05) continue; // nur Räume im Raum (Nasszelle)
    const a = toUV([r.x - r.w / 2, r.z - r.d / 2]), b = toUV([r.x + r.w / 2, r.z + r.d / 2]);
    const o = { u0: Math.min(a[0], b[0]) - 0.1, u1: Math.max(a[0], b[0]) + 0.1, v0: Math.min(a[1], b[1]) - 0.1, v1: Math.max(a[1], b[1]) + 0.1, sub: r.use };
    obst.push(o); subs.push(o);
  }
  return { W, D, eu, ev, toLoc, toUV, map, fac, obst, subs, doors };
}

/* Packer */
function packer(F, ctx) {
  const out = [], placed = [];
  const lib = id => HSS.library.get(id);
  const hit = (r, list) => list.some(o => r.u0 < o.u1 - EPS && r.u1 > o.u0 + EPS && r.v0 < o.v1 - EPS && r.v1 > o.v0 + EPS);
  const inRoom = r => r.u0 >= -0.01 && r.v0 >= -0.01 && r.u1 <= F.W + 0.01 && r.v1 <= F.D + 0.01;
  const faceDir = { front: [0, 1], back: [0, -1], left: [1, 0], right: [-1, 0] };
  const emit = (id, u, v, dir, extra = {}) => {
    const loc = F.toLoc(u, v), dl = [F.eu[0] * dir[0] + F.ev[0] * dir[1], F.eu[1] * dir[0] + F.ev[1] * dir[1]];
    const rot = ((Math.round(-U.deg(Math.atan2(dl[0], dl[1]))) % 360) + 360) % 360;
    out.push(Object.assign({ lib: id, x: Math.round(loc[0] * 100) / 100, z: Math.round(loc[1] * 100) / 100, rot }, extra));
  };
  // Footprint eines Objekts im Raumraster, Blickrichtung dir
  const fpOf = (d, size, u, v, dir) => { const w = size.w, dd = size.d; const across = Math.abs(dir[1]) > 0.5; const hu = (across ? w : dd) / 2, hv = (across ? dd : w) / 2; return { u0: u - hu, u1: u + hu, v0: v - hv, v1: v + hv }; };
  const P = {
    W: F.W, D: F.D, fac: F.fac, subs: F.subs, out,
    /** Objekt frei platzieren (u,v = Mittelpunkt), Blickrichtung als Seite ('front' = schaut zur Tür …) oder Vektor */
    at(id, u, v, face = 'front', o = {}) {
      const d = lib(id); if (!d) return null;
      const size = Object.assign({}, d.size, o.size || {});
      const dir = Array.isArray(face) ? face : { front: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] }[face];
      const r = fpOf(d, size, u, v, dir);
      if (!o.force && (!inRoom(r) || hit(r, F.obst) || hit(r, placed))) return null;
      if (!o.ghost) placed.push(Object.assign(r, { h: size.h, id }));
      emit(id, u, v, dir, o.size ? { size } : {});
      return r;
    },
    /** frei platzieren, nächste freie Stelle um (u,v) suchen */
    near(id, u, v, face = 'front', o = {}) {
      for (let rad = 0; rad <= (o.radius || 2.5); rad += 0.25) {
        const steps = rad ? Math.ceil(rad * 8) : 1;
        for (let i = 0; i < steps; i++) { const a = i / steps * Math.PI * 2; const r = P.at(id, u + Math.cos(a) * rad, v + Math.sin(a) * rad, face, o); if (r) return r; }
      }
      return null;
    },
    /** an einer Wand aufreihen: side = front|back|left|right; from = start|end|mid|Zahl (Position entlang der Wand) */
    wall(id, side, o = {}) {
      const d = lib(id); if (!d) return null;
      const size = Object.assign({}, d.size, o.size || {});
      if (F.fac[side] && size.h > (o.maxH || 1.3) && !o.mount) return null; // unter Fenstern nur niedrige Möbel
      const dir = faceDir[side];
      const len = side === 'front' || side === 'back' ? F.W : F.D;
      const off = (o.off || 0.02) + size.d / 2;
      const center = s => side === 'front' ? [s, off] : side === 'back' ? [s, F.D - off] : side === 'left' ? [off, s] : [F.W - off, s];
      const lo = size.w / 2 + (o.edge ?? 0.02), hi = len - size.w / 2 - (o.edge ?? 0.02); if (hi < lo) return null;
      let cands = [];
      const step = 0.05;
      if (typeof o.from === 'number') { for (let k = 0; k <= len / step; k++) { cands.push(o.from + k * step, o.from - k * step); } }
      else if (o.from === 'end') for (let s = hi; s >= lo; s -= step) cands.push(s);
      else if (o.from === 'mid') for (let k = 0; k <= len / step; k++) cands.push(len / 2 + k * step, len / 2 - k * step);
      else for (let s = lo; s <= hi; s += step) cands.push(s);
      cands = cands.filter(s => s >= lo - 1e-6 && s <= hi + 1e-6);
      for (const s of cands) {
        const [u, v] = center(s);
        const r = fpOf(d, size, u, v, dir);
        if (o.overlay) { // Wandobjekte über anderen (Bilder über Handlauf): nur Türen und Einbauten frei halten
          if (!inRoom(r) || hit(r, F.obst.filter(x => x.door || x.sub)) || hit(r, placed.filter(x => x.overlay))) continue;
          placed.push(Object.assign(r, { h: 0, id, overlay: true, mount: true }));
          emit(id, u, v, dir, o.size ? { size } : {}); return r;
        }
        if (o.mount) {
          if (hit(r, F.obst.filter(x => x.door || x.sub)) || hit(r, placed.filter(x => x.mount ? true : x.h > 1.25))) continue;
          placed.push(Object.assign(r, { h: size.h, id, mount: true }));
        } else {
          if (!inRoom(r) || hit(r, F.obst) || hit(r, placed.filter(x => !x.mount || size.h > 1.25))) continue;
          placed.push(Object.assign(r, { h: size.h, id }));
        }
        emit(id, u, v, dir, o.size ? { size } : {});
        return r;
      }
      return null;
    },
    /** Wand mit Objekten füllen (bis kein Platz mehr oder max) */
    fill(id, sides, o = {}) { let n = 0; for (const s of [].concat(sides)) { while (n < (o.max || 99)) { const r = P.wall(id, s, o); if (!r) break; n++; } } return n; },
    /** erste Wand aus der Liste, die das Objekt aufnimmt */
    any(id, sides, o = {}) { for (const s of sides) { const r = P.wall(id, s, o); if (r) return r; } return null; },
    /** Seiten ohne Fenster (für hohe Schränke), längste zuerst */
    solid(exclude = []) { return ['back', 'left', 'right', 'front'].filter(s => !F.fac[s] && !exclude.includes(s)).sort((a, b) => P.len(b) - P.len(a)); },
    len: s => s === 'front' || s === 'back' ? F.W : F.D,
    window: () => ['back', 'left', 'right'].find(s => F.fac[s]) || null,
    doors: F.doors, area: F.W * F.D,
    ctx
  };
  return P;
}

const deskSet = (P, side, o = {}) => { const r = P.wall('buero.schreibtisch', side, o); if (!r) return false; const cu = (r.u0 + r.u1) / 2, cv = (r.v0 + r.v1) / 2; const inn = { front: [0, 0.75], back: [0, -0.75], left: [0.75, 0], right: [-0.75, 0] }[side]; P.at('buero.stuhl', cu + inn[0], cv + inn[1], side === 'front' ? 'front' : side === 'back' ? 'back' : side, { force: true, ghost: true }); return true; };
const sideOpp = { left: 'right', right: 'left', front: 'back', back: 'front' };

/* Raumrezepte (P = Packer) */
HSS.einrichtungHelfer = { deskSet: (P, side, o) => deskSet(P, side, o), sideOpp };
const RZ = HSS.EINRICHTUNG = {
  patient1(P, c) { return c.intensiv ? RZ.intensiv(P, c, 1) : RZ.patient(P, c, 1); },
  patient2(P, c) { return c.intensiv ? RZ.intensiv(P, c, 2) : RZ.patient(P, c, 2); },
  patient(P, c, n) {
    const nass = P.subs.find(s => s.sub === 'nass');
    const nassSide = nass ? ((nass.u0 + nass.u1) / 2 < P.W / 2 ? 'left' : 'right') : 'right';
    const bedSide = sideOpp[nassSide];
    const v0 = Math.max(nass ? nass.v1 : 1.3, 1.6) + 0.15, v1 = P.D - (P.fac.back ? 0.95 : 0.6);
    const bedLib = c.typ === 'paed' ? 'med.bett.kind' : c.typ === 'geriatrie' ? 'med.bett.pflege' : 'med.bett.pflege';
    const beds = [];
    if (n === 1) beds.push(Math.min(v1 - 0.55, Math.max(v0 + 0.55, (v0 + v1) / 2)));
    else { const span = v1 - v0 - 1.1, gap = Math.min(2.4, Math.max(1.55, span)); const m = (v0 + v1) / 2; beds.push(m - gap / 2, m + gap / 2); }
    for (const bv of beds) {
      const r = P.wall(bedLib, bedSide, { from: bv, off: 0.12 });
      if (!r) continue;
      const cv = (r.v0 + r.v1) / 2;
      P.wall('med.versorgung.wand', bedSide, { from: cv, mount: true, size: { w: 1.4 } });
      P.wall('stat.nachttisch', bedSide, { from: cv + 0.85, edge: 0.05 }) || P.wall('stat.nachttisch', bedSide, { from: cv - 0.85 });
    }
    if (n === 2 && beds.length === 2) P.at('stat.vorhang', bedSide === 'left' ? 1.25 : P.W - 1.25, (beds[0] + beds[1]) / 2, 'front', { ghost: true, force: true });
    for (let i = 0; i < n; i++) P.wall('stat.schrank.patient', nassSide, { from: nass ? nass.v1 + 0.35 : 1.4, edge: 0.05 }) || P.any('stat.schrank.patient', ['front'], { from: 'end' });
    P.wall('stat.tv', nassSide, { from: beds[0] ?? P.D / 2, mount: true });
    P.wall('stat.tisch.patient', P.window() || 'back', { from: nassSide === 'left' || nassSide === 'back' ? 'start' : 'end' }) || P.near('stat.tisch.patient', P.W / 2, P.D - 0.8);
    P.near(n === 1 && c.typ === 'geriatrie' ? 'stat.sessel.mobilisation' : 'stat.besucherstuhl', bedSide === 'left' ? 1.9 : P.W - 1.9, (beds[beds.length - 1] || P.D / 2) + 0.3, bedSide === 'left' ? 'left' : 'right');
    if (n === 2 && P.W > 4.3) P.near('stat.besucherstuhl', bedSide === 'left' ? 1.9 : P.W - 1.9, beds[0] - 0.2, bedSide === 'left' ? 'left' : 'right', { radius: 1 });
    P.wall('stat.desinfektion', 'front', { mount: true, from: nassSide === 'left' ? 'end' : 'start' });
    P.wall('stat.bild', bedSide, { mount: true, from: (beds[0] ?? P.D / 2) - 1.4 }) || P.wall('stat.bild', nassSide, { mount: true, from: 'end' });
    if (c.typ === 'paed') P.near('stat.sessel', P.W / 2, P.D - 1.4, 'front');
  },
  intensiv(P, c, n) {
    const bedSide = 'left';
    const slots = n === 1 ? [P.D / 2 + 0.2] : [P.D * 0.33, P.D * 0.72];
    for (const bv of slots) {
      const r = P.at('med.bett.intensiv', 0.9 + 1.18, bv, 'right'); if (!r) { P.near('med.bett.intensiv', P.W / 2, bv, 'right'); continue; }
      P.at('med.versorgung.decke', 0.55, bv - 0.95, 'right', { ghost: true, force: true });
      P.near('med.monitor.patient', 0.45, bv + 0.95, 'right', { radius: 1 });
      P.near('med.beatmung', 0.45, bv - 0.95, 'right', { radius: 1 });
      P.near('med.infusion', 2.6, bv - 1.0, 'front', { radius: 1 });
      P.near('med.absaugung', 3.5, bv + 0.9, 'left', { radius: 1 });
    }
    P.wall('hyg.handwaschbecken', 'front', { mount: true, from: 'start' });
    P.wall('stat.modulschrank', 'right', { from: 'start' }); P.wall('med.instrumentenschrank', 'right', { from: 'start' });
    P.near('stat.visitewagen', P.W - 1.0, 1.6, 'right');
    P.wall('stat.desinfektion', 'front', { mount: true, from: 'end' });
    P.wall('stat.tv', 'right', { mount: true, from: slots[0] });
  },
  nass(P) {
    P.wall('san.dusche', 'back', { from: 'end', edge: 0 }) || P.wall('san.dusche', 'right', { from: 'end' });
    P.wall('san.wc', 'left', { from: 'end', edge: 0.1 }) || P.wall('san.wc', 'back', { from: 'start' });
    P.wall('san.waschtisch', 'right', { mount: true, from: 'start' }) || P.wall('san.waschtisch', 'left', { mount: true, from: 'start' });
  },
  stuetzpunkt(P, c) {
    P.wall('stat.stuetzpunkt', 'front', { from: 'mid', off: 0.35 });
    const desks = U.clamp(Math.floor(P.W * P.D / 8), 1, 4);
    let n = 0; for (const s of [P.window() || 'back', 'back', 'left', 'right']) { while (n < desks && deskSet(P, s)) n++; }
    if (c.intensiv) P.any('med.zentralmonitor', ['back', 'left', 'right']);
    P.any('buero.aktenschrank', P.solid(['front']));
    P.any('stat.drucker', P.solid(['front']));
    P.wall('stat.whiteboard', P.solid(['front'])[0] || 'left', { mount: true, from: 'mid' });
    P.near('stat.visitewagen', P.W * 0.25, P.D * 0.55); P.near('stat.visitewagen', P.W * 0.75, P.D * 0.55);
    P.near('med.defi.notfallwagen', P.W - 0.6, 1.6, 'right');
    P.wall('hyg.handwaschbecken', 'left', { mount: true, from: 'start' }) || P.wall('stat.desinfektion', 'right', { mount: true });
    P.near('warte.pflanze', P.W - 0.5, P.D - 0.5);
  },
  rein(P, c) {
    const s = P.solid();
    P.any('stat.arbeitszeile', s);
    P.wall('hyg.handwaschbecken', 'front', { mount: true, from: 'start' }) || P.any('hyg.handwaschbecken', s, { mount: true });
    P.any('stat.kuehlschrank.med', s);
    if (!c.hatMedRaum) { P.any('stat.medikamentenschrank', s); P.any('stat.medikamentenschrank', s); P.any('stat.btm.tresor', s); }
    P.fill('stat.modulschrank', s);
    P.near('stat.verbandwagen', P.W / 2, P.D / 2 + 0.3); P.near('med.infusion', P.W / 2 + 1, P.D / 2 - 0.4);
    if (P.W * P.D > 16) P.near('stat.medikamentenwagen', P.W / 2 - 1, P.D / 2);
    P.wall('stat.desinfektion', 'front', { mount: true, from: 'end' });
  },
  unrein(P) {
    const s = P.solid();
    P.any('hyg.steckbeckenspuele', s); P.any('hyg.ausguss', s, { mount: true });
    P.any('hyg.abtropfregal', s, { mount: true });
    P.any('stat.arbeitszeile', s, { size: { w: 1.6 } });
    P.wall('hyg.handwaschbecken', 'front', { mount: true, from: 'start' });
    P.any('stat.waeschesammler', ['back', 'left', 'right', 'front']); P.any('stat.abfallsammler', ['back', 'left', 'right', 'front']);
    P.any('stat.sammelbehaelter.ak', ['back', 'left', 'right']);
    P.fill('log.abfall240', ['back', 'left', 'right'], { max: 2 });
    P.near('med.toilettenstuhl', P.W / 2, P.D / 2);
  },
  medikamente(P) {
    const s = P.solid();
    P.any('stat.arbeitszeile', s, { size: { w: 1.8 } });
    P.any('stat.btm.tresor', s); P.any('stat.kuehlschrank.med', s);
    P.fill('stat.medikamentenschrank', s);
    P.near('stat.medikamentenwagen', P.W / 2, P.D / 2);
    P.wall('hyg.handwaschbecken', 'front', { mount: true, from: 'start' });
  },
  lager(P) {
    const s = P.solid();
    P.fill('buero.regal', s, { edge: 0.05 });
    if (P.W >= 3.6 && P.D >= 4.6) { for (let v = 2.2; v < P.D - 1.5; v += 2.4) for (let u = 1.6; u < P.W - 1.6; u += 1.05) { P.at('buero.regal', u, v, 'front'); P.at('buero.regal', u, v + 0.52, 'back'); } }
    P.near('log.modulwagen', P.W / 2, 1.6); P.near('log.waeschewagen.rein', P.W / 2 + 1, 1.8);
  },
  geraete(P) {
    const s = ['back', 'left', 'right', 'front'];
    for (const id of ['med.patientenlifter', 'med.rollstuhl', 'med.rollstuhl', 'med.pumpenregal', 'med.toilettenstuhl', 'stat.sessel.mobilisation', 'med.ekg', 'med.absaugung', 'med.rollator', 'med.infusion', 'med.infusion', 'med.infusion', 'med.rollstuhl']) P.any(id, s);
    P.near('med.ultraschall', P.W / 2, P.D / 2);
  },
  betten(P) {
    const s = ['back', 'left', 'right'].sort((a, b) => P.len(b) - P.len(a));
    P.fill('med.bett.pflege', s, { edge: 0.15, max: Math.max(1, Math.floor(P.W * P.D / 5)) });
    P.near('stat.waeschesammler', P.W / 2, 1.4); P.near('hyg.reinigungswagen', P.W - 1, 1.4);
  },
  bad(P) {
    P.near('san.pflegebadewanne', P.W / 2, P.D / 2 + 0.2, 'left');
    P.any('san.wc', ['left', 'right', 'back'], { mount: true, edge: 0.3 });
    P.any('san.dusche', ['back', 'right', 'left']); P.any('med.duschliege', ['right', 'left', 'back']);
    P.any('hyg.handwaschbecken', ['front', 'left', 'right'], { mount: true });
    P.near('med.patientenlifter', P.W - 0.8, 1.6, 'left'); P.any('buero.regal', P.solid(), { size: { w: 0.8, d: 0.4 } });
  },
  entsorgung(P) {
    P.fill('log.abfall240', ['back', 'left', 'right'], { max: 4 });
    P.any('log.waeschewagen.unrein', ['back', 'left', 'right', 'front']); P.any('stat.waeschesammler', ['back', 'left', 'right', 'front']);
    P.any('stat.sammelbehaelter.ak', ['back', 'left', 'right']);
  },
  putz(P) {
    P.any('hyg.ausguss', ['back', 'left', 'right'], { mount: true });
    P.any('buero.regal', P.solid(), { size: { w: 0.8, d: 0.4 } });
    P.near('hyg.reinigungswagen', P.W / 2, P.D / 2 + 0.3);
  },
  wc(P) { P.any('san.wc', ['back', 'left', 'right'], { mount: true }); P.any('san.waschtisch', ['left', 'right', 'front'], { mount: true }); },
  vorraum(P) { P.any('hyg.handwaschbecken', ['left', 'right', 'back'], { mount: true }); },
  kueche(P) {
    const s = P.solid();
    P.any('kueche.teekueche', s); P.any('kueche.kuehlschrank', s);
    P.near('log.speisenwagen', P.W / 2, P.D / 2 + 0.4);
    P.any('kueche.kaffee', s);
  },
  personal(P) {
    const s = P.solid();
    P.any('kueche.teekueche', s); P.any('kueche.kuehlschrank', s); P.any('kueche.kaffee', s);
    const tables = U.clamp(Math.floor(P.W * P.D / 7), 1, 3);
    let n = 0; for (let v = 2.1; v < P.D - 0.9 && n < tables; v += 2.0) for (let u = 1.1; u < P.W - 0.9 && n < tables; u += 2.0) { if (P.at('stat.tisch4', u, v, 'front')) n++; }
    if (!n) P.near('stat.tisch.patient', P.W / 2, P.D / 2);
    P.any('warte.sofa', [P.window() || 'back', 'left', 'right']);
    P.wall('stat.garderobe', 'front', { mount: true, from: 'end' }); P.near('warte.pflanze', 0.4, P.D - 0.4);
  },
  arzt(P) {
    const desks = U.clamp(Math.floor(P.W * P.D / 6), 1, 4); let n = 0;
    for (const s of [P.window() || 'back', 'left', 'right', 'back']) while (n < desks && deskSet(P, s)) n++;
    P.any('buero.aktenschrank', P.solid(['front'])); P.any('stat.drucker', P.solid());
    P.wall('stat.garderobe', 'front', { mount: true, from: 'end' }); P.wall('stat.whiteboard', P.solid(['front'])[0] || 'left', { mount: true });
    P.near('warte.pflanze', P.W - 0.4, P.D - 0.4);
  },
  leitung(P) {
    deskSet(P, P.window() || 'back') || deskSet(P, 'left');
    P.near('stat.tisch.patient', P.W / 2, P.D / 2 - 0.3);
    P.fill('buero.aktenschrank', P.solid(['front']), { max: 2 }); P.wall('stat.whiteboard', P.solid(['front'])[0] || 'left', { mount: true });
    P.wall('stat.garderobe', 'front', { mount: true, from: 'end' });
  },
  besprechung(P) {
    if (!P.at('buero.besprechung', P.W / 2, P.D / 2 + 0.2, P.W >= P.D ? 'front' : 'left')) P.near('stat.tisch4', P.W / 2, P.D / 2);
    P.wall('stat.whiteboard', P.solid()[0] || 'left', { mount: true, from: 'mid' });
    P.wall('stat.tv', P.solid()[1] || 'right', { mount: true, from: 'mid' });
    P.any('buero.aktenschrank', P.solid()); P.near('warte.pflanze', 0.4, P.D - 0.4);
  },
  untersuchung(P, c) {
    P.any('med.liege.untersuchung', ['left', 'right', 'back'], { off: 0.15 });
    deskSet(P, P.window() || 'back') || deskSet(P, 'right');
    P.near('stat.besucherstuhl', P.W / 2, P.D / 2 + 0.6);
    P.any('med.instrumentenschrank', P.solid()); P.any('hyg.handwaschbecken', ['front', 'left', 'right'], { mount: true });
    P.near('med.ultraschall', P.W / 2 - 0.8, P.D / 2 - 0.4); P.near('med.untersuchungsleuchte', P.W / 2 + 0.9, P.D / 2 - 0.6);
    P.near('med.ekg', P.W - 0.6, 1.6); P.any('med.paravent', ['front', 'left', 'right']);
    P.wall('stat.desinfektion', 'front', { mount: true, from: 'end' });
  },
  behandlung(P, c) {
    const lib = c.typ === 'dialyse' ? 'med.dialyse' : null;
    const seat = c.typ === 'dialyse' || c.typ === 'tagesklinik' ? 'med.stuhl.behandlung' : 'med.liege.behandlung';
    P.any(seat, ['left', 'right', 'back'], { off: 0.5 }) || P.near(seat, P.W / 2, P.D / 2);
    if (lib) P.near(lib, P.W / 2 + 1.0, P.D / 2 - 0.4);
    P.near('med.monitor.patient', P.W / 2 - 1.0, P.D / 2 - 0.6); P.near('med.infusion', P.W / 2 + 1.0, P.D / 2 + 0.6);
    P.wall('med.versorgung.wand', 'left', { mount: true, from: 'mid' });
    P.any('med.instrumentenschrank', P.solid()); P.any('hyg.handwaschbecken', ['front', 'right'], { mount: true });
    P.near('stat.nachttisch', P.W / 2 - 1.1, P.D / 2 + 0.6); P.any('med.paravent', ['front', 'right']);
  },
  warten(P) {
    P.fill('warte.stuhlreihe', ['back', 'left', 'right'], { maxH: 1.0 });
    if (P.W > 6 && P.D > 6) for (let v = 2.6; v < P.D - 2.4; v += 2.2) P.at('warte.stuhlreihe', P.W / 2, v, 'front');
    P.near('service.wasserspender', P.W - 0.5, 1.5); P.near('warte.pflanze', 0.45, P.D - 0.45); P.near('warte.pflanze', P.W - 0.45, P.D - 0.45);
  },
  aufenthalt(P) {
    const tables = U.clamp(Math.floor(P.W * P.D / 8), 1, 4); let n = 0;
    for (let v = P.D - 1.6; v > 1.8 && n < tables; v -= 2.1) for (let u = 1.2; u < P.W - 0.9 && n < tables; u += 2.1) { if (P.at('stat.tisch4', u, v, 'front')) n++; }
    P.any('warte.sofa', ['left', 'right', 'back']); P.any('stat.sessel', ['left', 'right', 'back']); P.any('stat.sessel', ['left', 'right', 'back']);
    P.any('stat.buecherregal', P.solid()); P.wall('stat.tv', P.solid()[0] || 'left', { mount: true, from: 'mid' });
    P.near('warte.pflanze', 0.45, P.D - 0.45); P.near('warte.pflanze', P.W - 0.45, P.D - 0.45); P.near('service.wasserspender', P.W - 0.5, 1.4);
  },
  angehoerige(P) { P.any('warte.sofa', ['back', 'left', 'right']); P.near('stat.sessel', P.W / 2 - 0.6, P.D / 2); P.near('stat.sessel', P.W / 2 + 0.6, P.D / 2); P.near('warte.pflanze', 0.45, P.D - 0.45); P.wall('stat.bild', P.solid()[0] || 'left', { mount: true }); },
  labor(P) { const s = P.solid(); P.any('lab.werkbank', s); P.any('lab.bga', s); P.any('lab.zentrifuge', s); P.any('lab.blutkuehlschrank', s); P.any('hyg.handwaschbecken', ['front', 'left'], { mount: true }); },
  buero(P) { RZ.arzt(P); },
  schleuse(P) { P.any('hyg.handwaschbecken', ['left', 'right', 'back'], { mount: true }); P.any('stat.garderobe', ['left', 'right'], { mount: true }); P.any('stat.abfallsammler', ['back', 'left', 'right']); }
};

/* Einen Raum einrichten → Objektliste in Bauteilkoordinaten */
HSS.furnishRoom = (pt, f, room, I, ctx = {}) => {
  const fn = RZ[room.use]; if (!fn) return [];
  const F = frame(pt, f, room, I || HSS.interior(pt.id, f) || { rooms: [], walls: [], doors: [] });
  if (F.W < 0.8 || F.D < 0.8) return [];
  const P = packer(F, ctx);
  try { fn(P, ctx); } catch (e) { console.warn('Einrichtung', room.use, e); }
  return P.out;
};
/* Einrichtung eines Raums im Projekt ersetzen (vorhandene Objekte im Raum werden entfernt) */
HSS.refurnishRoom = (partId, f, roomId, ctx = {}, prj = HSS.project()) => {
  const P = HSS.findPart(partId, prj); const I = HSS.interior(partId, f, false, prj); if (!P || !I) return 0;
  const r = I.rooms.find(x => x.id === roomId); if (!r) return 0;
  const inside = r2 => (o) => o.host?.part === partId && o.host.floor === f && !o.core && Math.abs(o.x - r2.x) < r2.w / 2 && Math.abs(o.z - r2.z) < r2.d / 2 && !['aufzug', 'treppe'].includes(HSS.library.get(o.lib)?.logistik?.rolle);
  const subs = I.rooms.filter(s => s !== r && Math.abs(s.x - r.x) <= (r.w - s.w) / 2 + 0.05 && Math.abs(s.z - r.z) <= (r.d - s.d) / 2 + 0.05);
  prj.objects = prj.objects.filter(o => !inside(r)(o));
  const st = r.station ? prj.stations.find(s => s.id === r.station) : null;
  const c = Object.assign({ typ: st?.typ, intensiv: !!HSS.STATIONSTYPEN?.find(t => t.id === st?.typ)?.intensiv }, ctx);
  let n = 0;
  for (const room of [r, ...subs]) for (const o of HSS.furnishRoom(P.part, f, room, I, c)) { prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: partId, floor: f } }, o, r.station ? { station: r.station } : {})); n++; }
  return n;
};
})();
