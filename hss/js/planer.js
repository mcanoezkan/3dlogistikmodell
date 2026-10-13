/* =====================================================================
   HSS · planer.js – Grundrissplanung einer Station je Geschoss
   1. Bauweise aus der Gebäudetiefe: einbündig, anderthalbbündig, zweibündig oder
      dreibündig mit Innenzone (tiefe Baukörper; zu tiefe Innenzonen erhalten einen Lichthof).
   2. Kompakte Station um den Erschließungskern: Funktionsräume am Kern, Patientenzimmer
      nach außen, Räume mit Tageslichtbedarf an der Fassade, dienende Räume innen.
   3. Raumbreite = Programmfläche ÷ Raumtiefe, begrenzt durch Mindest- und Höchstbreiten
      (keine Schlauchräume); WC in tiefen Zonen mit Vorraum.
   4. Restflächen: kleine Reste werden Nachbarräumen zugeschlagen, große als Reserve
      ausgewiesen, nicht belichtbare Mittelzonen als Lichthof oder Installationszone.
   5. Wände aus den Raumkanten (zusammengeführt), Türen, Nasszellen, vollständige Einrichtung.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const FLUR = 2.4, E = 0.15;
const MINW = { patient1: 3.6, patient2: 4.4, wc: 1.75, putz: 2.0, entsorgung: 2.3, medikamente: 2.6, kueche: 2.6, schleuse: 2.0, untersuchung: 3.2, behandlung: 3.0, warten: 3.4 };
const MAXW = { patient1: 5.4, patient2: 6.8, wc: 2.6, putz: 3.4 };
const minW = u => MINW[u] || 3.0, maxW = u => MAXW[u] || 14;
const TAGESLICHT = new Set(['patient1', 'patient2', 'aufenthalt', 'personal', 'arzt', 'leitung', 'besprechung', 'untersuchung', 'behandlung', 'warten', 'angehoerige']);
const ORDER = ['stuetzpunkt', 'medikamente', 'rein', 'unrein', 'entsorgung', 'labor', 'geraete', 'lager', 'betten', 'bad', 'schleuse', 'putz', 'wc', 'kueche', 'personal', 'leitung', 'arzt', 'besprechung', 'untersuchung', 'behandlung', 'warten', 'angehoerige', 'aufenthalt'];
const rank = u => { const i = ORDER.indexOf(u); return i < 0 ? 40 : i; };
const DOOR = { patient1: [1.35, 'erschl.tuer.bett'], patient2: [1.4, 'erschl.tuer.bett'], bad: [1.4, 'erschl.tuer.bett'], untersuchung: [1.4, 'erschl.tuer.bett'], behandlung: [1.4, 'erschl.tuer.bett'], betten: [1.6, 'erschl.tuer.bett'],
  lager: [1.3, 'erschl.tuer.1'], geraete: [1.3, 'erschl.tuer.1'], unrein: [1.3, 'erschl.tuer.1'], rein: [1.3, 'erschl.tuer.1'], entsorgung: [1.3, 'erschl.tuer.1'], kueche: [1.3, 'erschl.tuer.1'],
  aufenthalt: [1.8, 'erschl.tuer.schiebe'], warten: [2.0, 'erschl.tuer.schiebe'], besprechung: [1.1, 'erschl.tuer.1'] };

/* Bauweise aus der Gebäudetiefe */
HSS.planTyp = D => {
  const Du = D - 2 * E;
  const O = (d, fac) => ({ k: 'O', d, fac }), C = () => ({ k: 'C', d: FLUR }), I = d => ({ k: 'I', d });
  let typ, bands;
  if (Du >= 19.2) { const o = U.clamp((Du - 2 * FLUR - 6.5) / 2, 5.0, 6.6); typ = 'dreibund'; bands = [O(o, -1), C(), I(Du - 2 * o - 2 * FLUR), C(), O(o, 1)]; }
  else if (Du >= 12.4) { const o = (Du - FLUR) / 2; typ = 'zweibund'; bands = [O(o, -1), C(), O(o, 1)]; }
  else { const o = Math.min(6.4, Du - FLUR - 2.6); if (o >= 4.6) { typ = 'anderthalb'; bands = [O(o, -1), C(), O(Du - FLUR - o, 1)]; } else { typ = 'einbund'; bands = [O(Math.max(2, Du - FLUR), -1), C()]; } }
  const name = { einbund: 'einbündig (Zimmer an einer Flurseite)', anderthalb: 'anderthalbbündig (Zimmerseite + schmale Nebenraumzone)', zweibund: 'zweibündig (Zimmer beidseits eines Flurs)', dreibund: 'dreibündig (zwei Flure, Innenzone für Nebenräume)' }[typ];
  return { typ, name, bands, Du };
};
HSS.PLAN = { FLUR, MINW, MAXW, TAGESLICHT };

/* Wände aus Raumkanten: kollineare Kanten werden zu durchgehenden Wänden vereinigt */
HSS.wallsFromRooms = (rooms, t = 0.15) => {
  const H = new Map(), V = new Map(), out = [], k = v => Math.round(v * 40);
  const add = (M, c, a, b) => { if (b - a < 0.03) return; const key = k(c); if (!M.has(key)) M.set(key, { c, iv: [] }); M.get(key).iv.push([Math.min(a, b), Math.max(a, b)]); };
  for (const r of rooms) {
    if (r.use === 'flur' || r.noWalls) continue;
    if (r.poly) { for (let i = 0; i < r.poly.length; i++) out.push({ id: U.uid('w'), a: r.poly[i].slice(), b: r.poly[(i + 1) % r.poly.length].slice(), t, auto: true }); continue; }
    const x0 = r.x - r.w / 2, x1 = r.x + r.w / 2, z0 = r.z - r.d / 2, z1 = r.z + r.d / 2;
    add(H, z0, x0, x1); add(H, z1, x0, x1); add(V, x0, z0, z1); add(V, x1, z0, z1);
  }
  const merge = (M, horiz) => { for (const { c, iv } of M.values()) { iv.sort((a, b) => a[0] - b[0]); let cur = null; const flush = () => { if (cur) out.push({ id: U.uid('w'), a: horiz ? [cur[0], c] : [c, cur[0]], b: horiz ? [cur[1], c] : [c, cur[1]], t, auto: true }); }; for (const s of iv) { if (cur && s[0] <= cur[1] + 0.03) cur[1] = Math.max(cur[1], s[1]); else { flush(); cur = s.slice(); } } flush(); } };
  merge(H, true); merge(V, false);
  return out;
};
/* Wände eines Geschosses neu aus den Räumen ableiten; Türen bleiben an ihrer Stelle */
HSS.rebuildWalls = (I, newDoors = []) => {
  const pts = I.doors.map(d => { const w = I.walls.find(x => x.id === d.wall); return w ? { p: [w.a[0] + (w.b[0] - w.a[0]) * d.t, w.a[1] + (w.b[1] - w.a[1]) * d.t], d } : null; }).filter(Boolean);
  const manual = I.walls.filter(w => !w.auto && !w.room);
  I.walls = manual.concat(HSS.wallsFromRooms(I.rooms));
  I.doors = [];
  const attach = (p, d) => { let best = null, bd = 0.3; for (const w of I.walls) { const c = G.closestOnSeg(p, w.a, w.b); const dd = G.dist(p, c.pt); if (dd < bd) { bd = dd; best = { w, t: c.t }; } } if (best) I.doors.push(Object.assign({}, d, { id: d.id || U.uid('d'), wall: best.w.id, t: best.t })); return !!best; };
  for (const { p, d } of pts) attach(p, d);
  for (const nd of newDoors) attach(nd.p, { w: nd.w, lib: nd.lib });
};

/* Station auf einem Geschoss (oder halben Geschoss) anordnen */
HSS.layoutStationFloor = (sl, st, T, report, opts = {}) => {
  const prj = HSS.project(), pt = sl.P.part, f = sl.f;
  const fp = HSS.partFootprintLocal(pt), bb = G.bbox(fp.outer);
  const alongX = bb.w >= bb.d;
  let L = alongX ? bb.w : bb.d; const D = alongX ? bb.d : bb.w;
  let s0 = alongX ? bb.x0 : bb.z0; const tMin = alongX ? bb.z0 : bb.x0;
  if (sl.half) { L /= 2; if (opts.halfSecond) s0 += L; }
  const toLoc = (s, t) => alongX ? [s, t] : [t, s];
  const rectLoc = (a0, a1, b0, b1) => { const c = toLoc((a0 + a1) / 2, (b0 + b1) / 2); return alongX ? { x: c[0], z: c[1], w: a1 - a0, d: b1 - b0 } : { x: c[0], z: c[1], w: b1 - b0, d: a1 - a0 }; };
  const inside = (s, t) => { const p = toLoc(s, t); return G.pointIn(p, fp.outer) && !fp.holes.some(h => G.pointIn(p, h)); };
  const I = HSS.interior(pt.id, f, true, prj);
  const sLo = s0 + E + (opts.reserveStart || 0), sHi = s0 + L - E - (opts.reserveEnd || 0);
  const inRange = r => { const c = alongX ? r.x : r.z; return c >= s0 - 0.01 && c <= s0 + L + 0.01; };
  if (opts.replace !== false) {
    I.rooms = I.rooms.filter(r => !inRange(r));
    prj.objects = prj.objects.filter(o => !(o.host?.part === pt.id && o.host.floor === f && !o.core && (o.station || o.auto) && (alongX ? o.x : o.z) >= s0 - 0.01 && (alongX ? o.x : o.z) <= s0 + L + 0.01));
  }
  const P = HSS.planTyp(D);
  report.typ = P; report.warn = report.warn || [];
  if (P.typ === 'einbund' && P.bands[0].d < 4.4) report.warn.push(`${pt.name}: nur ${U.fmt(D, 1)} m tief – Zimmer werden sehr flach.`);
  // Bänder quer zur Längsachse
  let tc = tMin + E; P.bands.forEach(b => { b.t0 = tc; b.t1 = tc + b.d; tc = b.t1; });
  const lanes = [], corridors = [];
  P.bands.forEach((b, i) => {
    if (b.k === 'C') corridors.push(b);
    if (b.k === 'O') { const cb = P.bands[i + 1]?.k === 'C' ? P.bands[i + 1] : P.bands[i - 1]; lanes.push({ k: 'O', t0: b.t0, t1: b.t1, door: cb.t0 >= b.t1 - 1e-6 ? b.t1 : b.t0, items: [], occ: [] }); }
    if (b.k === 'I') {
      if (b.d < 8) lanes.push({ k: 'I', t0: b.t0, t1: b.t1, door: b.t0, door2: b.t1, items: [], occ: [], band: b });
      else { const di = Math.min(6.2, b.d / 2); lanes.push({ k: 'I', t0: b.t0, t1: b.t0 + di, door: b.t0, items: [], occ: [], band: b }); if (b.d - 2 * di > 0.05) lanes.push({ k: 'M', t0: b.t0 + di, t1: b.t1 - di, items: [], occ: [], band: b }); lanes.push({ k: 'I', t0: b.t1 - di, t1: b.t1, door: b.t1, items: [], occ: [], band: b }); }
    }
  });
  lanes.forEach(l => { l.depth = l.t1 - l.t0; });
  // nutzbarer Bereich je Streifen (abgerundete Ecken, L-/U-Formen)
  const runOf = (t0, t1) => { const runs = []; let a = null; for (let s = sLo; s <= sHi + 1e-6; s += 0.25) { const ok = inside(s, t0 + 0.2) && inside(s, t1 - 0.2) && inside(s, (t0 + t1) / 2); if (ok && a === null) a = s; if ((!ok || s + 0.25 > sHi) && a !== null) { runs.push([a, ok ? Math.min(s, sHi) : s - 0.25]); a = null; } } return runs; };
  const center0 = (sLo + sHi) / 2;
  const pickRun = runs => runs.find(r => r[0] <= center0 && r[1] >= center0) || runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0] || null;
  for (const l of lanes) { const r = pickRun(runOf(l.t0, l.t1)); if (r) { l.lo = r[0]; l.hi = r[1]; } else l.off = true; }
  // Bestehende Aufzüge/Treppen/Schächte → Kernflächen
  const verts = [];
  for (const o of prj.objects) {
    const d = HSS.library.get(o.lib), role = d?.logistik?.rolle;
    if (!['aufzug', 'treppe'].includes(role) && !o.core) continue;
    const H = o.host && HSS.findPart(o.host.part, prj); if (!H) continue;
    if (H.part.id !== pt.id && H.part.stackOn !== pt.id && pt.stackOn !== H.part.id) continue;
    const loc = H.part.id === pt.id ? [o.x, o.z] : HSS.toLocal(pt, HSS.toWorld(H.part, [o.x, o.z]));
    if (!G.pointIn(loc, fp.outer)) continue;
    const size = o.size || d.size, rot = ((o.rot || 0) + (H.part.rot || 0) - (pt.rot || 0)) * Math.PI / 180;
    const hx = Math.abs(Math.cos(rot)) * size.w / 2 + Math.abs(Math.sin(rot)) * size.d / 2, hz = Math.abs(Math.sin(rot)) * size.w / 2 + Math.abs(Math.cos(rot)) * size.d / 2;
    const s = alongX ? loc[0] : loc[1], t = alongX ? loc[1] : loc[0], hs = alongX ? hx : hz, ht = alongX ? hz : hx;
    verts.push({ s0: s - hs, s1: s + hs, t0: t - ht, t1: t + ht, role, name: o.name || d.name });
  }
  const makeCore = opts.core !== false && (opts.core === 'force' || !verts.some(v => v.role === 'aufzug'));
  const liftV = verts.filter(v => v.role === 'aufzug' && (v.s0 + v.s1) / 2 > sLo && (v.s0 + v.s1) / 2 < sHi);
  let sc = makeCore || !liftV.length ? center0 : liftV.map(v => (v.s0 + v.s1) / 2).sort((a, b) => Math.abs(a - center0) - Math.abs(b - center0))[0];
  const block = (l, a, b, kind, name, extra = {}) => { l.occ.push(Object.assign({ a, b, kind, name }, extra)); };
  for (const v of verts) for (const l of lanes) if (!l.off && Math.min(v.t1, l.t1) - Math.max(v.t0, l.t0) > 0.25) block(l, v.s0 - 0.15, v.s1 + 0.15, 'kern', v.role === 'treppe' ? 'Treppenhaus' : v.role === 'aufzug' ? 'Aufzug' : 'Kern');
  // Neuer Erschließungskern
  const newObjs = [], newDoors = [], rooms = [];
  const coreLanes = P.typ === 'dreibund' ? (lanes.filter(l => l.k === 'I').length > 1 ? [lanes.find(l => l.k === 'I')] : lanes.filter(l => l.k !== 'O')) : P.typ === 'zweibund' ? [lanes[1]] : P.typ === 'anderthalb' && lanes[1].depth >= 3.4 ? [lanes[1]] : [lanes[0]];
  const coreT0 = Math.min(...coreLanes.map(l => l.t0)), coreT1 = Math.max(...coreLanes.map(l => l.t1)), cd = coreT1 - coreT0;
  const doorT = coreLanes[0].door ?? coreT0;
  const liftDir = doorT <= coreT0 + 0.01 ? -1 : 1; // Richtung zum Flur
  const placeStair = (sMid, name) => {
    const deep = cd >= 6.3, sw = deep ? 3.2 : 6.2, a = sMid - sw / 2;
    const tC = deep ? (liftDir < 0 ? coreT0 + 3.05 : coreT1 - 3.05) : (liftDir < 0 ? coreT0 + 1.55 : coreT1 - 1.55);
    const p = toLoc(sMid, tC);
    newObjs.push({ lib: 'erschl.treppe', x: p[0], z: p[1], rot: (alongX ? (deep ? 0 : 90) : (deep ? 90 : 0)) + (liftDir < 0 ? 180 : 0), core: true, name });
    return [a, a + sw];
  };
  if (makeCore && cd >= 3.3) {
    const deep = cd >= 6.3, coreW = 2 * 2.6 + (deep ? 3.2 : 6.2) + 0.3;
    const a = sc - coreW / 2;
    for (let i = 0; i < 2; i++) {
      const sm = a + 1.3 + i * 2.6, tm = liftDir < 0 ? coreT0 + 1.65 : coreT1 - 1.65, p = toLoc(sm, tm);
      const dirT = liftDir; // Tür zum Flur
      const rot = alongX ? (dirT < 0 ? 180 : 0) : (dirT < 0 ? 90 : -90);
      newObjs.push({ lib: 'erschl.aufzug.bett', x: p[0], z: p[1], rot: (rot + 360) % 360, core: true, name: `Bettenaufzug ${i + 1}` });
    }
    placeStair(a + 5.2 + 0.15 + (deep ? 1.6 : 3.1), 'Treppenhaus');
    for (const l of coreLanes) block(l, a, a + coreW, 'kern', 'Aufzüge / Treppenhaus', { newCore: true, whole: coreLanes.length > 1 });
    // Fluchttreppen an den Enden langer Baukörper (Rettungsweglänge ≤ 35 m)
    if (sHi - sLo > 62) {
      const ends = [[sLo + (P.typ === 'dreibund' ? FLUR : 0), 1], [sHi - (P.typ === 'dreibund' ? FLUR : 0), -1]];
      for (const [s, dir] of ends) { const sw = deep ? 3.2 : 6.2, m = s + dir * (sw / 2 + 0.1); const r = placeStair(m, 'Treppenhaus (2. Rettungsweg)'); for (const l of coreLanes) block(l, r[0] - 0.1, r[1] + 0.1, 'kern', 'Treppenhaus'); }
    }
  }
  // Dreibund: Querflure an den Enden und neben dem Kern
  const cross = [];
  if (P.typ === 'dreibund') {
    const iLanes = lanes.filter(l => l.k !== 'O' && !l.off);
    const lo = Math.max(...iLanes.map(l => l.lo)), hi = Math.min(...iLanes.map(l => l.hi));
    const cs = [lo, hi - FLUR];
    const kern = (iLanes[0]?.occ || []).filter(o => o.kind === 'kern').sort((a, b) => Math.abs((a.a + a.b) / 2 - sc) - Math.abs((b.a + b.b) / 2 - sc))[0];
    if (kern) cs.push(kern.b + 0.01 <= hi - FLUR ? kern.b : kern.a - FLUR);
    for (const a of cs) { for (const l of iLanes) block(l, a, a + FLUR, 'quer', 'Querflur'); cross.push([a, a + FLUR]); }
  }
  // Räume den Streifen zuordnen
  const width = (r, l) => U.clamp(r.m2 / l.depth, minW(r.use), maxW(r.use));
  const free = l => { if (l.off) return 0; let len = l.hi - l.lo; for (const o of l.occ) len -= Math.max(0, Math.min(o.b, l.hi) - Math.max(o.a, l.lo)); return len - U.sum(l.items.map(i => i.w)); };
  const oL = lanes.filter(l => l.k === 'O' && !l.off), iL = lanes.filter(l => l.k === 'I' && !l.off);
  // Zuordnung: zuerst Patientenzimmer (brauchen Fassade), dann Funktionsräume; Reihenfolge im Streifen danach nach Nähe zum Kern
  const progRooms = sl.rooms.slice().sort((a, b) => (b.use.startsWith('patient') - a.use.startsWith('patient')) || rank(a.use) - rank(b.use) || b.m2 - a.m2);
  for (const r of progRooms) {
    const isPat = r.use.startsWith('patient');
    let cands;
    if (isPat) cands = oL.filter(l => l.depth >= 4.4);
    else if (iL.length && !TAGESLICHT.has(r.use)) cands = iL.concat(oL);
    else if (P.typ === 'anderthalb' && !TAGESLICHT.has(r.use)) cands = [oL[1], oL[0]].filter(Boolean);
    else cands = oL;
    if (!cands.length) cands = oL.length ? oL : iL;
    // bevorzugter Streifen: geringste Belegung innerhalb der ersten Gruppe, dann Rest
    const prim = P.typ === 'anderthalb' && !isPat ? [cands[0]] : cands.filter(l => l.k === cands[0].k), rest = cands.filter(l => !prim.includes(l));
    const order = prim.sort((a, b) => (U.sum(a.items.map(i => i.w)) + U.sum(a.occ.map(o => o.b - o.a)) * 0.3) - (U.sum(b.items.map(i => i.w)) + U.sum(b.occ.map(o => o.b - o.a)) * 0.3)).concat(rest);
    const l = order.find(x => free(x) >= width(r, x) - 0.01);
    if (!l) { report.dropped.push(r.name); continue; }
    l.items.push(Object.assign({}, r, { w: width(r, l) }));
  }
  // Platzierung je Streifen: vom Zentrum abwechselnd nach außen, belegte Abschnitte überspringen
  for (const l of lanes) {
    if (l.off) continue;
    l.items.sort((a, b) => (a.use.startsWith('patient') - b.use.startsWith('patient')) || rank(a.use) - rank(b.use));
    const occ = l.occ.slice().sort((a, b) => a.a - b.a);
    let R = U.clamp(sc, l.lo, l.hi), Lc = R, usedR = 0, usedL = 0;
    const hitOcc = (a, b) => occ.find(o => a < o.b - 1e-6 && b > o.a + 1e-6);
    const tryR = w => { let a = R; for (let g = 0; g < 20; g++) { const h = hitOcc(a, a + w); if (!h) break; a = h.b; } return a + w <= l.hi + 1e-6 ? a : null; };
    const tryL = w => { let b = Lc; for (let g = 0; g < 20; g++) { const h = hitOcc(b - w, b); if (!h) break; b = h.a; } return b - w >= l.lo - 1e-6 ? b - w : null; };
    const placed = [];
    for (const it of l.items) {
      let a = null;
      const right = usedR <= usedL;
      if (right) { a = tryR(it.w); if (a !== null) { R = a + it.w; usedR += it.w; } else { a = tryL(it.w); if (a !== null) { Lc = a; usedL += it.w; } } }
      else { a = tryL(it.w); if (a !== null) { Lc = a; usedL += it.w; } else { a = tryR(it.w); if (a !== null) { R = a + it.w; usedR += it.w; } } }
      if (a === null) { report.dropped.push(it.name); continue; }
      placed.push(Object.assign(it, { a, b: a + it.w }));
    }
    l.placed = placed;
  }
  // Lücken füllen: kleine Reste den Nachbarn zuschlagen, große als Reserve
  for (const l of lanes) {
    if (l.off) continue;
    const segs = l.placed.map(p => ({ a: p.a, b: p.b, room: p })).concat(l.occ.map(o => ({ a: Math.max(o.a, l.lo), b: Math.min(o.b, l.hi), occ: o }))).filter(s => s.b > s.a + 1e-6).sort((a, b) => a.a - b.a);
    // überlappende Belegungen (z. B. Kern + Bestandsaufzug) zusammenführen
    const merged = []; for (const s of segs) { const last = merged[merged.length - 1]; if (last && last.occ && s.occ && s.a <= last.b + 0.05) { last.b = Math.max(last.b, s.b); continue; } merged.push(s); }
    const gaps = []; let cur = l.lo;
    for (const s of merged) { if (s.a > cur + 0.02) gaps.push([cur, s.a]); cur = Math.max(cur, s.b); }
    if (l.hi > cur + 0.02) gaps.push([cur, l.hi]);
    for (const [a, b] of gaps) {
      const len = b - a;
      if (l.k === 'M') { l.placed.push({ a, b, use: len >= 0 && l.depth >= 3 ? 'lichthof' : 'schacht', name: l.depth >= 3 ? 'Lichthof (Belichtung Innenzone)' : 'Installationszone / Schächte', filler: true }); continue; }
      const left = l.placed.find(p => Math.abs(p.b - a) < 0.03 && !p.filler), right = l.placed.find(p => Math.abs(p.a - b) < 0.03 && !p.filler);
      if (len < 2.2) {
        const grow = left && (!right || left.w <= right.w) ? left : right;
        if (grow === left && left) { left.b = b; left.w = left.b - left.a; continue; }
        if (grow === right && right) { right.a = a; right.w = right.b - right.a; continue; }
        if (len >= 0.6) l.placed.push({ a, b, use: 'schacht', name: 'Installationsschacht', filler: true });
        continue;
      }
      const mod = l.k === 'O' ? 4.8 : 6.0, n = Math.max(1, Math.round(len / mod));
      for (let i = 0; i < n; i++) l.placed.push({ a: a + len * i / n, b: a + len * (i + 1) / n, use: 'reserve', name: 'Reservefläche (frei planbar)', filler: true });
    }
    // Kernflächen als Räume
    for (const s of merged.filter(x => x.occ)) {
      const o = s.occ;
      if (o.kind === 'quer') { if (!rooms.some(r => r._cross === `${o.a}`)) { const bandT = l.band ? [l.band.t0, l.band.t1] : [l.t0, l.t1]; rooms.push(Object.assign({ id: U.uid('r'), use: 'flur', name: 'Querflur', station: st.id, _cross: `${o.a}` }, rectLoc(Math.max(o.a, l.lo), Math.min(o.b, l.hi), bandT[0], bandT[1]))); } continue; }
      l.placed.push({ a: s.a, b: s.b, use: 'kern', name: o.name, filler: true, kern: true, whole: !!o.whole });
    }
  }
  // Flure
  const flurRooms = [];
  for (const c of corridors) {
    const run = pickRun(runOf(c.t0, c.t1)); if (!run) continue;
    const r = Object.assign({ id: U.uid('r'), use: 'flur', name: corridors.length > 1 ? (c === corridors[0] ? 'Stationsflur A' : 'Stationsflur B') : 'Stationsflur', station: st.id }, rectLoc(run[0] - (run[0] <= sLo + 0.3 ? E : 0), run[1] + (run[1] >= sHi - 0.3 ? E : 0), c.t0, c.t1));
    flurRooms.push(r);
  }
  rooms.push(...flurRooms);
  // Räume erzeugen
  const sideIdx = new Map();
  for (const l of lanes) {
    if (l.off) continue;
    l.placed.sort((a, b) => a.a - b.a);
    l.placed.forEach((p, idx) => {
      if (p.use === 'kern') {
        // Kernraum nur einmal über alle Kernstreifen
        const whole = p.whole && l.k !== 'O' && l.band;
        const key = `${Math.round(p.a * 10)}`; if (whole && sideIdx.has('k' + key)) return; if (whole) sideIdx.set('k' + key, 1);
        const span = whole ? [l.band.t0, l.band.t1] : [l.t0, l.t1];
        const kr = Object.assign({ id: U.uid('r'), use: 'kern', name: p.name, station: st.id }, rectLoc(p.a, p.b, span[0], span[1]));
        rooms.push(kr);
        const dT = l.door ?? span[0], m = (p.a + p.b) / 2; newDoors.push({ p: toLoc(m, dT), w: Math.min(p.b - p.a - 0.6, 5.5), lib: 'offen' });
        if (whole) newDoors.push({ p: toLoc(m, l.band.t1), w: Math.min(p.b - p.a - 0.6, 5.5), lib: 'offen' });
        return;
      }
      const isPat = p.use.startsWith('patient'), w = p.b - p.a;
      const r = Object.assign({ id: U.uid('r'), use: p.use, name: p.name, station: st.id }, rectLoc(p.a, p.b, l.t0, l.t1));
      if (p.filler) r.filler = true;
      const role = ({ stuetzpunkt: 'stuetzpunkt', rein: 'rein', unrein: 'unrein', medikamente: 'medikamente', kueche: 'kueche', aufenthalt: 'aufenthalt', entsorgung: 'entsorgung', lager: 'lager' })[p.use]; if (role) r.role = role;
      // Tür zur Flurseite (Innenzone ohne festen Flur: abwechselnd)
      const dT = l.door2 !== undefined ? (idx % 2 ? l.door2 : l.door) : l.door;
      if (dT === undefined) { rooms.push(r); return; }
      const into = dT <= l.t0 + 1e-6 ? 1 : -1; // Richtung vom Flur in den Raum (t)
      const mirror = idx % 2 === 1;
      if (['lichthof', 'schacht'].includes(p.use)) { rooms.push(r); return; }
      if (isPat && !T.intensiv && w >= 3.2) {
        const nw = Math.min(2.1, w - 1.5), nd = Math.min(2.4, l.depth * 0.42);
        const na = mirror ? p.b - nw : p.a, nb = na + nw, nt0 = into > 0 ? dT : dT - nd, nt1 = nt0 + nd;
        const nass = Object.assign({ id: U.uid('r'), use: 'nass', name: 'Nasszelle', station: st.id }, rectLoc(na, nb, nt0, nt1));
        rooms.push(r, nass);
        const dw = Math.min(1.4, w - nw - 0.35), dc = mirror ? na - 0.15 - dw / 2 : nb + 0.15 + dw / 2;
        newDoors.push({ p: toLoc(dc, dT), w: dw, lib: 'erschl.tuer.bett' });
        newDoors.push({ p: toLoc(mirror ? na : nb, into > 0 ? nt1 - 0.5 : nt0 + 0.5), w: 0.9, lib: 'erschl.tuer.schiebe' });
        return;
      }
      if (p.use === 'wc' && l.depth > 3.8) {
        const back = 2.3, ta = into > 0 ? l.t1 - back : l.t0, tb = ta + back;
        const wc = Object.assign({}, r, rectLoc(p.a, p.b, ta, tb));
        const vr = Object.assign({ id: U.uid('r'), use: 'vorraum', name: 'Vorraum WC', station: st.id }, rectLoc(p.a, p.b, into > 0 ? l.t0 : tb, into > 0 ? ta : l.t1));
        rooms.push(wc, vr);
        newDoors.push({ p: toLoc((p.a + p.b) / 2, dT), w: Math.min(1.0, w - 0.4), lib: 'erschl.tuer.1' });
        newDoors.push({ p: toLoc((p.a + p.b) / 2, into > 0 ? ta : tb), w: Math.min(0.9, w - 0.4), lib: 'erschl.tuer.1' });
        return;
      }
      rooms.push(r);
      if (p.use === 'stuetzpunkt') { newDoors.push({ p: toLoc((p.a + p.b) / 2, dT), w: Math.min(w - 0.8, 4.0), lib: 'offen' }); if (l.door2 !== undefined) newDoors.push({ p: toLoc((p.a + p.b) / 2, dT === l.door ? l.door2 : l.door), w: Math.min(w - 0.8, 3.0), lib: 'offen' }); return; }
      const [dw0, dlib] = DOOR[p.use] || [1.1, 'erschl.tuer.1'];
      const dw = Math.min(dw0, w - 0.4);
      const dc = w > 4.6 ? (p.a + p.b < 2 * sc ? p.b - dw / 2 - 0.6 : p.a + dw / 2 + 0.6) : (p.a + p.b) / 2;
      newDoors.push({ p: toLoc(dc, dT), w: dw, lib: dlib });
    });
  }
  // Prüfung gegen den Grundriss (abgerundete Ecken)
  const ok = r => { const c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [r.x + a * (r.w / 2 - 0.2), r.z + b * (r.d / 2 - 0.2)]); return c.every(p => G.pointIn(p, fp.outer) && !fp.holes.some(h => G.pointIn(p, h))); };
  const final = rooms.filter(r => { if (ok(r)) return true; if (!r.filler && r.use !== 'flur' && r.use !== 'nass' && r.use !== 'vorraum') report.dropped.push(r.name); return false; });
  for (const r of final) { delete r._cross; I.rooms.push(r); if (!r.filler && !['flur', 'nass', 'vorraum', 'kern'].includes(r.use)) report.placed++; }
  HSS.rebuildWalls(I, newDoors);
  // Einrichtung
  for (const o of newObjs) prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: pt.id, floor: f } }, o));
  if (opts.furnish !== false) {
    const ctx = { typ: T.id, intensiv: !!T.intensiv, hatMedRaum: final.some(r => r.use === 'medikamente') };
    for (const r of final) {
      for (const o of HSS.furnishRoom(pt, f, r, I, ctx)) prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: pt.id, floor: f }, station: st.id }, o));
    }
  }
  report.floors = report.floors || [];
  report.floors.push({ part: pt.name, floor: f, typ: P.typ, typName: P.name, laenge: sHi - sLo, tiefe: D, reserve: U.sum(final.filter(r => r.use === 'reserve').map(r => r.w * r.d)) });
  return final;
};
})();
