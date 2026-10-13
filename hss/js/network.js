/* =====================================================================
   HSS · network.js – Wegenetz (außen, Geschosse, Aufzüge, Brücken, Tunnel, AWT) und Routing
   Das Netz wird automatisch aus der Topographie erzeugt; es muss nicht gezeichnet werden.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;

/* Transportmittel: Geschwindigkeit (m/s) und erlaubte Kantentypen */
HSS.MITTEL = {
  person:    { name: 'Person zu Fuß', v: 1.3, kanten: ['flur', 'weg', 'gehweg', 'strasse', 'zufahrt', 'tunnel', 'bruecke', 'aufzug', 'treppe', 'zugang', 'anbindung', 'eingang'], modell: 'person.pflege' },
  hand:      { name: 'Handgeführter Wagen', v: 1.0, kanten: ['flur', 'weg', 'gehweg', 'tunnel', 'bruecke', 'aufzug', 'zugang', 'anbindung', 'eingang', 'zufahrt'], modell: 'person.transportdienst', wagen: 'log.modulwagen' },
  bett:      { name: 'Bettentransport', v: 0.8, kanten: ['flur', 'weg', 'tunnel', 'bruecke', 'aufzug', 'zugang', 'anbindung', 'eingang'], modell: 'person.patient.bett', liftTyp: ['bett', 'lasten'] },
  schlepper: { name: 'Elektroschlepper / Routenzug', v: 1.8, kanten: ['flur', 'weg', 'zufahrt', 'strasse', 'tunnel', 'bruecke', 'aufzug', 'zugang', 'anbindung', 'eingang'], modell: 'log.schlepper', liftTyp: ['lasten', 'bett'] },
  awt:       { name: 'AWT (fahrerlos)', v: 1.0, kanten: ['awt', 'aufzug', 'zugang', 'anbindung'], modell: 'awt.fahrzeug', liftTyp: ['awt'] },
  lkw:       { name: 'LKW / Lieferfahrzeug', v: 6.0, kanten: ['strasse', 'zufahrt', 'anbindung'], modell: 'kfz.lkw75' },
  rohrpost:  { name: 'Rohrpost', v: 6.0, kanten: [], direkt: true, modell: null }
};
const LIFT_WAIT_EST = 0.75; // erwartete Wartezeit in Minuten für die Routenwahl (die Simulation rechnet echte Warteschlangen)

/* ---------- Orte (Quellen/Senken) ---------- */
HSS.places = (prj = HSS.project()) => {
  const out = [];
  for (const b of prj.buildings) for (const pt of b.parts) {
    const I = prj.interiors[pt.id] || {};
    for (const f of Object.keys(I)) for (const r of I[f].rooms || []) {
      if (r.use === 'flur' || r.use === 'nass') continue;
      const w = HSS.toWorld(pt, [r.x, r.z]);
      out.push({ id: r.id, name: `${b.kurz || b.name} ${HSS.floorName(HSS.globalFloor(pt, +f, prj))} · ${r.name || (HSS.ROOMTYPES[r.use] || {}).name || 'Raum'}`, kind: 'room', use: r.use, role: r.role || r.use, station: r.station, part: pt.id, floor: +f, gf: HSS.globalFloor(pt, +f, prj), x: w[0], y: HSS.floorY(pt, +f, prj), z: w[1], building: b.id });
    }
  }
  for (const o of prj.objects) {
    const d = HSS.library.get(o.lib); if (!d) continue;
    const role = o.role || d.logistik?.rolle;
    if ((!role || ['tuer', 'fahrzeug', 'treppe', 'aufzug'].includes(role)) && !o.place) continue;
    const HP = o.host ? HSS.findPart(o.host.part, prj) : null; if (o.host && !HP) continue;
    const pos = HSS.objWorld(o, prj);
    let label = o.name || d.name;
    if (o.host) { const P = HSS.findPart(o.host.part, prj); if (P) label = `${P.building.kurz || P.building.name} ${HSS.floorName(HSS.globalFloor(P.part, o.host.floor, prj))} · ${label}`; }
    out.push({ id: o.id, name: label, kind: 'object', role, part: o.host?.part, floor: o.host?.floor, gf: HP ? HSS.globalFloor(HP.part, o.host.floor, prj) : 0, x: pos.x, y: pos.y, z: pos.z, lib: o.lib });
  }
  for (const p of prj.places || []) out.push(Object.assign({ kind: 'extern', gf: 0, y: HSS.terrainH(p.x, p.z, prj) }, p));
  return out;
};
// Weltposition eines platzierten Objekts
HSS.objWorld = (o, prj = HSS.project()) => {
  if (o.host) {
    const P = HSS.findPart(o.host.part, prj); if (!P) return { x: o.x, y: 0, z: o.z, rot: o.rot || 0 };
    const w = HSS.toWorld(P.part, [o.x, o.z]);
    return { x: w[0], y: HSS.floorY(P.part, o.host.floor, prj) + (o.y || 0), z: w[1], rot: (o.rot || 0) + (P.part.rot || 0) };
  }
  return { x: o.x, y: (o.yAbs !== undefined ? o.yAbs : HSS.terrainH(o.x, o.z, prj)) + (o.y || 0), z: o.z, rot: o.rot || 0 };
};

/* ---------- Netzaufbau ---------- */
let NET = null;
HSS.invalidateNet = () => { NET = null; };
HSS.on('changed', () => { NET = null; });

HSS.net = () => NET || (NET = buildNet(HSS.project()));

function buildNet(prj) {
  const nodes = new Map(), adj = new Map(), edges = [];
  const addNode = (id, x, y, z, info = {}) => { if (!nodes.has(id)) { nodes.set(id, Object.assign({ id, x, y, z }, info)); adj.set(id, []); } return id; };
  const addEdge = (a, b, type, info = {}) => {
    if (a === b || !nodes.has(a) || !nodes.has(b)) return;
    const A = nodes.get(a), B = nodes.get(b);
    const len = info.len ?? Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z);
    const e = Object.assign({ id: edges.length, a, b, type, len }, info); edges.push(e);
    adj.get(a).push(e); adj.get(b).push(e);
  };
  const floorNodes = new Map(); // key part|f → [nodeIds]
  const nearestIn = (ids, x, z, y) => { let best = null, bd = Infinity; for (const id of ids) { const n = nodes.get(id); const d = (n.x - x) ** 2 + (n.z - z) ** 2 + (y !== undefined ? ((n.y - y) * 3) ** 2 : 0); if (d < bd) { bd = d; best = id; } } return best ? { id: best, d: Math.sqrt(bd) } : null; };

  /* 1. Außenwege */
  const pathNodes = [];
  for (const p of prj.paths) {
    const L = HSS.pathLine(p, prj); if (L.length < 2) continue;
    const total = L[L.length - 1][3], k = Math.max(1, Math.round(total / 6));
    let prev = null;
    for (let i = 0; i <= k; i++) {
      const q = HSS.sampleLine(L, total * i / k), id = `P:${p.id}:${i}`;
      addNode(id, q.x, q.y, q.z, { path: p.id, kind: p.kind });
      pathNodes.push(id);
      if (prev) addEdge(prev, id, p.kind, { path: p.id });
      prev = id;
    }
  }
  // Wegeverknüpfung: nahe Knoten verschiedener Wege verbinden (Kreuzungen, Einmündungen)
  for (let i = 0; i < pathNodes.length; i++) {
    const A = nodes.get(pathNodes[i]);
    let best = null, bd = 7.5;
    for (let j = 0; j < pathNodes.length; j++) {
      const B = nodes.get(pathNodes[j]); if (B.path === A.path) continue;
      const d = Math.hypot(A.x - B.x, A.z - B.z); if (d < bd && Math.abs(A.y - B.y) < 1.2) { bd = d; best = B.id; }
    }
    if (best) { const B = nodes.get(best); const t = (A.kind === 'awt' || B.kind === 'awt') ? (A.kind === B.kind ? 'awt' : null) : (['tunnel'].includes(A.kind) || ['tunnel'].includes(B.kind)) ? 'tunnel' : (A.kind === 'strasse' || B.kind === 'strasse') ? (A.kind === B.kind ? 'strasse' : 'zufahrt') : A.kind; if (t) addEdge(A.id, best, t, {}); }
  }

  /* 2. Geschossnetze je Bauteil */
  for (const b of prj.buildings) for (const pt of b.parts) {
    const fp = HSS.partFootprintLocal(pt), bb = G.bbox(fp.outer), area = HSS.partArea(pt);
    const inside = (x, z) => G.pointIn([x, z], fp.outer) && !fp.holes.some(h => G.pointIn([x, z], h));
    for (const f of HSS.partFloors(pt)) {
      const y = HSS.floorY(pt, f, prj), gf = HSS.globalFloor(pt, f, prj), key = pt.id + '|' + f, ids = [];
      const I = prj.interiors[pt.id]?.[f];
      const flure = (I?.rooms || []).filter(r => r.use === 'flur');
      if (flure.length) {
        // Flurachsen aus den Flurräumen
        const segIds = [];
        for (const r of flure) {
          const along = r.w >= r.d, L = along ? r.w : r.d, n = Math.max(1, Math.round(L / 4)), mine = [];
          for (let i = 0; i <= n; i++) {
            const lx = along ? r.x - r.w / 2 + 0.6 + (r.w - 1.2) * i / n : r.x, lz = along ? r.z : r.z - r.d / 2 + 0.6 + (r.d - 1.2) * i / n;
            const w = HSS.toWorld(pt, [lx, lz]), id = addNode(`F:${pt.id}:${f}:${r.id}:${i}`, w[0], y, w[1], { part: pt.id, floor: f, gf, lx, lz });
            if (mine.length) addEdge(mine[mine.length - 1], id, 'flur', { part: pt.id, floor: f, gf });
            mine.push(id); ids.push(id);
          }
          segIds.push(mine);
        }
        for (let i = 0; i < segIds.length; i++) for (let j = i + 1; j < segIds.length; j++) {
          let best = null, bd = 3.5;
          for (const a of segIds[i]) for (const c of segIds[j]) { const A = nodes.get(a), C = nodes.get(c), d = Math.hypot(A.x - C.x, A.z - C.z); if (d < bd) { bd = d; best = [a, c]; } }
          if (best) addEdge(best[0], best[1], 'flur', { part: pt.id, floor: f, gf });
        }
      } else {
        // Rasternetz innerhalb des Grundrisses
        const s = U.clamp(Math.sqrt(area) / 6, 4, 9);
        const nx = Math.max(1, Math.floor(bb.w / s)), nz = Math.max(1, Math.floor(bb.d / s));
        const grid = {};
        for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
          const lx = bb.x0 + (bb.w) * (nx ? i / nx : 0.5) * 0.9 + bb.w * 0.05, lz = bb.z0 + bb.d * (nz ? j / nz : 0.5) * 0.9 + bb.d * 0.05;
          if (!inside(lx, lz)) continue;
          const w = HSS.toWorld(pt, [lx, lz]); const id = addNode(`F:${pt.id}:${f}:${i}:${j}`, w[0], y, w[1], { part: pt.id, floor: f, gf, lx, lz });
          grid[i + ',' + j] = id; ids.push(id);
          for (const [di, dj] of [[-1, 0], [0, -1]]) { const o = grid[(i + di) + ',' + (j + dj)]; if (o) { const O = nodes.get(o); const mx = (lx + O.lx) / 2, mz = (lz + O.lz) / 2; if (inside(mx, mz)) addEdge(o, id, 'flur', { part: pt.id, floor: f, gf }); } }
        }
        if (!ids.length) { const w = HSS.toWorld(pt, [bb.cx, bb.cz]); ids.push(addNode(`F:${pt.id}:${f}:c`, w[0], y, w[1], { part: pt.id, floor: f, gf, lx: bb.cx, lz: bb.cz })); }
      }
      floorNodes.set(key, ids);
    }
  }

  /* 3. Eingänge: Geschosse auf Höhe eines Weges mit dem nächsten Wegknoten verbinden */
  for (const b of prj.buildings) for (const pt of b.parts) {
    const outer = HSS.partFootprint(pt).outer;
    for (const f of HSS.partFloors(pt)) {
      const ids = floorNodes.get(pt.id + '|' + f); if (!ids?.length) continue;
      const y = HSS.floorY(pt, f, prj);
      const cand = [];
      for (const pid of pathNodes) {
        const P = nodes.get(pid); if (Math.abs(P.y - y) > 1.8) continue;
        let bd = Infinity, bp = null;
        for (let i = 0; i < outer.length; i++) { const c = G.closestOnSeg([P.x, P.z], outer[i], outer[(i + 1) % outer.length]); const d = G.dist([P.x, P.z], c.pt); if (d < bd) { bd = d; bp = c.pt; } }
        if (bd < 22) cand.push({ pid, d: bd, bp, kind: P.kind });
      }
      cand.sort((a, c) => a.d - c.d);
      const used = new Set(); let n = 0;
      for (const c of cand) {
        const k = c.kind + Math.round(c.bp[0] / 15) + ',' + Math.round(c.bp[1] / 15); if (used.has(k)) continue; used.add(k);
        const door = addNode(`E:${pt.id}:${f}:${n}`, c.bp[0], y, c.bp[1], { part: pt.id, floor: f, gf: HSS.globalFloor(pt, f, prj), entrance: true });
        const inn = nearestIn(ids, c.bp[0], c.bp[1]); if (inn) addEdge(door, inn.id, 'eingang', { part: pt.id, floor: f });
        addEdge(door, c.pid, c.kind === 'awt' ? 'awt' : 'eingang', {});
        if (++n >= 4) break;
      }
    }
  }

  /* 4. Benachbarte Bauteile auf gleicher Ebene verbinden */
  const parts = HSS.allParts(prj);
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const A = parts[i], B = parts[j];
    const fa = HSS.partFootprint(A).outer, fb = HSS.partFootprint(B).outer;
    let bd = Infinity, pa = null, pb = null;
    for (const p of fa) for (let k = 0; k < fb.length; k++) { const c = G.closestOnSeg(p, fb[k], fb[(k + 1) % fb.length]); const d = G.dist(p, c.pt); if (d < bd) { bd = d; pa = p; pb = c.pt; } }
    for (const p of fb) for (let k = 0; k < fa.length; k++) { const c = G.closestOnSeg(p, fa[k], fa[(k + 1) % fa.length]); const d = G.dist(p, c.pt); if (d < bd) { bd = d; pa = c.pt; pb = p; } }
    if (bd > 1.2 && !fa.some(p => G.pointIn(p, fb)) && !fb.some(p => G.pointIn(p, fa))) continue;
    for (const f of HSS.partFloors(A)) {
      const gf = HSS.globalFloor(A, f, prj), fB = HSS.localFloor(B, gf, prj); if (fB === null) continue;
      if (Math.abs(HSS.floorY(A, f, prj) - HSS.floorY(B, fB, prj)) > 0.8) continue;
      const ia = nearestIn(floorNodes.get(A.id + '|' + f) || [], pa[0], pa[1]), ib = nearestIn(floorNodes.get(B.id + '|' + fB) || [], pb[0], pb[1]);
      if (ia && ib) addEdge(ia.id, ib.id, 'flur', { gf, uebergang: true });
    }
  }

  /* 5. Brücken */
  for (const br of prj.bridges) {
    const e = HSS.bridgeEnds(br, prj); if (!e) continue;
    const a = addNode(`B:${br.id}:a`, e.pa[0], e.ya, e.pa[1], { bridge: br.id }), c = addNode(`B:${br.id}:b`, e.pb[0], e.yb, e.pb[1], { bridge: br.id });
    addEdge(a, c, 'bruecke', { bridge: br.id });
    const ia = nearestIn(floorNodes.get(br.a.part + '|' + br.a.floor) || [], e.pa[0], e.pa[1]), ib = nearestIn(floorNodes.get(br.b.part + '|' + br.b.floor) || [], e.pb[0], e.pb[1]);
    if (ia) addEdge(a, ia.id, 'zugang', {}); if (ib) addEdge(c, ib.id, 'zugang', {});
  }

  /* 6. Aufzüge und Treppen (über alle Bauteile, die den Standort überdecken) */
  const lifts = [];
  for (const o of prj.objects) {
    const d = HSS.library.get(o.lib); const role = d?.logistik?.rolle; if (!o.host || !['aufzug', 'treppe'].includes(role)) continue;
    const P = HSS.findPart(o.host.part, prj); if (!P) continue;
    const wpos = HSS.toWorld(P.part, [o.x, o.z]);
    const cfg = Object.assign({ typ: 'person', kabinen: 1, sekProGeschoss: 5, tuerS: 12, kapazitaet: 1, freigabe: ['*'] }, d.logistik.aufzug || {}, o.aufzug || {});
    const stops = [];
    for (const pt of parts) {
      const loc = HSS.toLocal(pt, wpos), fp = HSS.partFootprintLocal(pt);
      if (!G.pointIn(loc, fp.outer)) continue;
      if (pt.id !== P.part.id && pt.stackOn !== P.part.id && P.part.stackOn !== pt.id) continue;
      for (const f of HSS.partFloors(pt)) { const gf = HSS.globalFloor(pt, f, prj); if (o.vonGF !== undefined && gf < o.vonGF) continue; if (o.bisGF !== undefined && gf > o.bisGF) continue; if (!stops.some(s => s.gf === gf)) stops.push({ gf, pt, f, y: HSS.floorY(pt, f, prj) }); }
    }
    stops.sort((a, c) => a.gf - c.gf);
    const lift = { id: o.id, name: o.name || d.name, role, cfg, stops: stops.map(s => s.gf), x: wpos[0], z: wpos[1], obj: o };
    lifts.push(lift);
    let prev = null;
    for (const s of stops) {
      const id = addNode(`L:${o.id}@${s.gf}`, wpos[0], s.y, wpos[1], { lift: o.id, gf: s.gf, part: s.pt.id, floor: s.f });
      const inn = nearestIn(floorNodes.get(s.pt.id + '|' + s.f) || [], wpos[0], wpos[1]);
      if (inn) addEdge(id, inn.id, 'zugang', { part: s.pt.id, floor: s.f });
      if (prev) addEdge(prev.id, id, role === 'treppe' ? 'treppe' : 'aufzug', { lift: o.id, gfa: prev.gf, gfb: s.gf, len: role === 'treppe' ? Math.abs(s.y - prev.y) * 2.2 + 6 : Math.abs(s.y - prev.y) });
      prev = { id, gf: s.gf };
    }
  }

  /* 7. Orte anbinden */
  const places = HSS.places(prj), placeNode = new Map();
  for (const pl of places) {
    const id = addNode(`O:${pl.id}`, pl.x, pl.y, pl.z, { place: pl.id });
    placeNode.set(pl.id, id);
    if (pl.part !== undefined && pl.part !== null) {
      const inn = nearestIn(floorNodes.get(pl.part + '|' + pl.floor) || [], pl.x, pl.z);
      if (inn) addEdge(id, inn.id, 'anbindung', {});
      // AWT-Stationen zusätzlich an die AWT-Trasse
      if (pl.role === 'awt-station' || pl.role === 'waschanlage' || pl.role === 'ladestation') {
        const near = nearestIn(pathNodes.filter(p => nodes.get(p).kind === 'awt'), pl.x, pl.z, pl.y); if (near && near.d < 30) addEdge(id, near.id, 'awt', {});
        // AWT-Aufzug in der Nähe
        for (const L of lifts) if (L.cfg.typ === 'awt' && Math.hypot(L.x - pl.x, L.z - pl.z) < 25) { const ln = `L:${L.id}@${pl.gf}`; if (nodes.has(ln)) addEdge(id, ln, 'awt', {}); }
      }
    } else {
      const near = nearestIn(pathNodes, pl.x, pl.z, pl.y); if (near) addEdge(id, near.id, 'anbindung', { len: near.d + (pl.anfahrtM || 0) });
    }
  }
  // AWT-Aufzüge mit AWT-Trasse verbinden (unterste Haltestelle)
  for (const L of lifts) if (L.cfg.typ === 'awt' && L.stops.length) {
    const id = `L:${L.id}@${L.stops[0]}`, n = nodes.get(id);
    const near = nearestIn(pathNodes.filter(p => nodes.get(p).kind === 'awt'), n.x, n.z, n.y); if (near && near.d < 30) addEdge(id, near.id, 'awt', {});
  }
  return { nodes, adj, edges, lifts, places, placeNode, floorNodes, cache: new Map() };
}

/* ---------- Routing ---------- */
// mittel: Schlüssel aus HSS.MITTEL; klasse: 'rein' | 'unrein' | 'person' | 'patient' | 'neutral'
HSS.edgeAllowed = (e, mittel, klasse, net) => {
  const M = HSS.MITTEL[mittel] || HSS.MITTEL.hand;
  if (!M.kanten.includes(e.type)) return false;
  if (e.type === 'aufzug') {
    const L = net.lifts.find(l => l.id === e.lift); if (!L) return false;
    const fr = L.cfg.freigabe || ['*'];
    if (M.liftTyp && !M.liftTyp.includes(L.cfg.typ)) return false;
    if (mittel === 'awt') return L.cfg.typ === 'awt';
    if (L.cfg.typ === 'awt') return false;
    if (fr.includes('*')) return true;
    if (klasse === 'rein' || klasse === 'unrein') return fr.includes(klasse);
    if (klasse === 'patient') return fr.includes('patient') || fr.includes('person');
    return fr.includes('person') || fr.includes(klasse);
  }
  return true;
};
class Heap { constructor() { this.a = []; } push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }

HSS.route = (fromPlace, toPlace, mittel = 'hand', klasse = 'neutral') => {
  const net = HSS.net(), key = [fromPlace, toPlace, mittel, klasse].join('|');
  if (net.cache.has(key)) return net.cache.get(key);
  const M = HSS.MITTEL[mittel] || HSS.MITTEL.hand;
  const s = net.placeNode.get(fromPlace), t = net.placeNode.get(toPlace);
  let res = null;
  if (s && t) {
    if (M.direkt) {
      const A = net.nodes.get(s), B = net.nodes.get(t), len = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) * 1.3;
      res = { ok: true, len, timeMin: len / M.v / 60 + 1, nodes: [s, t], edges: [], lifts: [], pts: [[A.x, A.y, A.z], [B.x, B.y, B.z]], direkt: true };
    } else {
      const dist = new Map([[s, 0]]), prev = new Map(), h = new Heap(); h.push([0, s]);
      while (h.size) {
        const [d, u] = h.pop(); if (u === t) break; if (d > (dist.get(u) ?? Infinity)) continue;
        for (const e of net.adj.get(u) || []) {
          if (!HSS.edgeAllowed(e, mittel, klasse, net)) continue;
          const v = e.a === u ? e.b : e.a;
          let c = e.len / M.v / 60;
          if (e.type === 'aufzug') { const L = net.lifts.find(l => l.id === e.lift); c = (L.cfg.sekProGeschoss / 60) + (L.cfg.tuerS / 60) + LIFT_WAIT_EST / 2; }
          if (e.type === 'treppe') c = e.len / 0.6 / 60;
          const nd = d + c;
          if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, { u, e }); h.push([nd, v]); }
        }
      }
      if (dist.has(t)) {
        const path = [t], es = []; let c = t; while (prev.has(c)) { const { u, e } = prev.get(c); es.unshift(e); path.unshift(u); c = u; }
        const pts = path.map(id => { const n = net.nodes.get(id); return [n.x, n.y, n.z]; });
        let len = 0; for (const e of es) len += e.len;
        // Aufzugsfahrten zusammenfassen
        const lifts = []; let cur = null;
        es.forEach((e, i) => {
          if (e.type === 'aufzug') { const a = net.nodes.get(path[i]).gf, b = net.nodes.get(path[i + 1]).gf; if (cur && cur.lift === e.lift && cur.idx === i - 1) { cur.to = b; cur.idx = i; } else { cur = { lift: e.lift, from: a, to: b, idx: i, startIdx: i }; lifts.push(cur); } }
        });
        const types = {}; for (const e of es) types[e.type] = (types[e.type] || 0) + e.len;
        res = { ok: true, len, timeMin: dist.get(t), nodes: path, edges: es, lifts, pts, types };
      }
    }
  }
  if (!res) res = { ok: false, len: 0, timeMin: 0, nodes: [], edges: [], lifts: [], pts: [] };
  net.cache.set(key, res);
  return res;
};
})();
