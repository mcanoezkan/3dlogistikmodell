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
  bett:      { name: 'Bettentransport', v: 0.8, kanten: ['flur', 'weg', 'zufahrt', 'tunnel', 'bruecke', 'aufzug', 'zugang', 'anbindung', 'eingang'], modell: 'person.patient.bett', liftTyp: ['bett', 'lasten'] },
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
      if (r.use === 'nass' || r.use === 'vorraum' || HSS.ROOMTYPES[r.use]?.noPlace) continue;
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
// Änderungen nur an Flüssen/Material/Fuhrpark: Netz behalten, nur festgelegte Wege nachziehen
const NUR_FLUSS = /^(Richtwerte|Fluss|Material|Sektion|Zeitfenster|Gezeichneten|Fuhrpark|Transport|Standardflüsse|Regel|Fahrzeug|Kapazität|Betrieb)/;
HSS.on('changed', e => {
  if (NET && e && e.scope === 'none' && NUR_FLUSS.test(e.label || '')) { const alt = NET.fixedSig; fixedRoutes(NET, HSS.project()); if (NET.fixedSig !== alt) NET.cache.clear(); return; }
  NET = null;
});

HSS.net = () => NET || (NET = buildNet(HSS.project()));
// Haltegeschosse eines Aufzugs/Treppenhauses ohne das ganze Wegenetz zu berechnen (für die Darstellung)
HSS.liftStops = (o, prj = HSS.project()) => {
  const P = HSS.findPart(o.host?.part, prj); if (!P) return { stops: [], x: 0, z: 0 };
  const wpos = HSS.toWorld(P.part, [o.x, o.z]), stops = [];
  for (const pt of HSS.allParts(prj)) {
    if (pt.id !== P.part.id && pt.stackOn !== P.part.id && P.part.stackOn !== pt.id && !P.building.parts.includes(pt)) continue; // auch übereinanderliegende Bauteile desselben Gebäudes
    if (!G.pointIn(HSS.toLocal(pt, wpos), HSS.partFootprintLocal(pt).outer)) continue;
    for (const f of HSS.partFloors(pt)) { const gf = HSS.globalFloor(pt, f, prj); if (o.vonGF !== undefined && gf < o.vonGF) continue; if (o.bisGF !== undefined && gf > o.bisGF) continue; if (!stops.includes(gf)) stops.push(gf); }
  }
  return { stops: stops.sort((a, b) => a - b), x: wpos[0], z: wpos[1] };
};

/* Festgelegte Wege (gezeichnet / über Aufzug) – auch ohne Neuaufbau des ganzen Netzes aktualisierbar */
function fixedRoutes(net, prj) {
  /* 8. Festgelegte Wege einzelner Flüsse: „über Aufzug/Treppe X“ oder von Hand gezeichneter Pfad */
  for (const id of [...net.nodes.keys()]) if (net.nodes.get(id).pfad) { net.nodes.delete(id); net.adj.delete(id); }
  net.lifts = net.lifts.filter(L => !String(L.id).startsWith('pv:'));
  const nodes = net.nodes, lifts = net.lifts, placeNode = net.placeNode, places = net.places, parts = net.ownParts;
  const addNode = (id, x, y, z, info = {}) => { if (!nodes.has(id)) { nodes.set(id, Object.assign({ id, x, y, z }, info)); net.adj.set(id, []); } return id; };
  const fixed = new Map(), placeGf = new Map(places.map(p => [p.id, p.gf ?? 0])), sig = [];
  for (const f of prj.flows || []) {
    if (!placeNode.has(f.von) || !placeNode.has(f.nach)) continue;
    const key = f.von + '|' + f.nach;
    if (f.pfad || f.via) sig.push(key + ':' + (f.via || '') + ':' + JSON.stringify(f.pfad || ''));
    if (Array.isArray(f.pfad) && f.pfad.length >= 2) {
      const ids = [placeNode.get(f.von)], es = [];
      f.pfad.forEach((q, i) => ids.push(addNode(`P:${f.id}:${i}`, q.x, q.y, q.z, { gf: q.gf ?? 0, pfad: f.id })));
      ids.push(placeNode.get(f.nach));
      for (let i = 0; i < ids.length - 1; i++) {
        const A = nodes.get(ids[i]), B = nodes.get(ids[i + 1]), q = f.pfad[i - 1] ? f.pfad[i] : null;
        const vert = i > 0 && i < ids.length - 2 && A.gf !== B.gf;
        let type = i === 0 || i === ids.length - 2 ? 'anbindung' : 'flur', lift = null;
        if (vert) {
          const want = f.pfad[i].vertikal || f.pfad[i - 1]?.vertikal || {}, real = want.lift && lifts.find(L => L.id === want.lift);
          type = (real ? real.role : want.typ) === 'treppe' ? 'treppe' : 'aufzug';
          if (real) lift = real.id;
          else { lift = `pv:${f.id}:${i}`; lifts.push({ id: lift, name: type === 'treppe' ? 'Treppenhaus (gezeichnet)' : 'Vertikalverbindung (gezeichnet)', role: type, cfg: { typ: 'lasten', kabinen: 1, sekProGeschoss: 5, tuerS: 12, kapazitaet: 1, freigabe: ['*'] }, stops: [A.gf, B.gf].sort((a, b) => a - b), x: A.x, z: A.z, obj: { name: 'gezeichnet' } }); }
        } else if (i > 0 && i < ids.length - 2 && A.gf === 0 && !parts.some(pt => { const fl = HSS.localFloor(pt, 0, prj); return fl !== null && G.pointIn(HSS.toLocal(pt, [(A.x + B.x) / 2, (A.z + B.z) / 2]), HSS.partFootprintLocal(pt).outer); })) type = 'weg';
        const len = type === 'treppe' ? Math.abs(B.y - A.y) * 2.2 + 6 : Math.abs(B.y - A.y) > 0.5 && type === 'aufzug' ? Math.abs(B.y - A.y) : Math.hypot(A.x - B.x, A.z - B.z);
        es.push({ id: `pe:${f.id}:${i}`, a: ids[i], b: ids[i + 1], type, len, lift, pfad: f.id, gfa: A.gf, gfb: B.gf });
      }
      fixed.set(key, { pfad: f.id, nodes: ids, edges: es });
    } else if (f.via) fixed.set(key, { via: f.via, gfA: placeGf.get(f.von), gfB: placeGf.get(f.nach) });
  }
  net.fixed = fixed; net.fixedSig = sig.join('#');
}
function buildNet(prj) {
  // Umgebungsgebäude (OpenStreetMap) gehören nicht ins Wegenetz – das spart bei großen Standorten Sekunden
  const own = prj.buildings.filter(b => !b.umgebung);
  const fpCache = new Map(), FP = pt => { let f = fpCache.get(pt.id); if (!f) { const o = HSS.partFootprint(pt).outer; f = { o, bb: G.bbox(o) }; fpCache.set(pt.id, f); } return f; };
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
    if (p.noNet || ['grenze', 'bach', 'bahn'].includes(p.kind)) continue; // Umgebung, Zäune, Gewässer, Gleise: nicht routen
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
  const grid = new Map(), gk = (x, z) => Math.floor(x / 8) + '|' + Math.floor(z / 8);
  for (const id of pathNodes) { const n = nodes.get(id), k = gk(n.x, n.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(id); }
  const nahe = n => { const gx = Math.floor(n.x / 8), gz = Math.floor(n.z / 8), out = []; for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const c = grid.get((gx + dx) + '|' + (gz + dz)); if (c) out.push(...c); } return out; };
  for (let i = 0; i < pathNodes.length; i++) {
    const A = nodes.get(pathNodes[i]);
    let best = null, bd = 7.5;
    for (const bid of nahe(A)) {
      const B = nodes.get(bid); if (B.path === A.path) continue;
      const d = Math.hypot(A.x - B.x, A.z - B.z); if (d < bd && Math.abs(A.y - B.y) < 1.2) { bd = d; best = B.id; }
    }
    if (best) { const B = nodes.get(best); const t = (A.kind === 'awt' || B.kind === 'awt') ? (A.kind === B.kind ? 'awt' : null) : (['tunnel'].includes(A.kind) || ['tunnel'].includes(B.kind)) ? 'tunnel' : (A.kind === 'strasse' || B.kind === 'strasse') ? (A.kind === B.kind ? 'strasse' : 'zufahrt') : A.kind; if (t) addEdge(A.id, best, t, {}); }
  }

  // Wegeinseln (z. B. Fußwege, die kurz vor der Straße enden) an das größte Wegenetz anbinden (bis 40 m)
  {
    const comp = new Map(); let nc = 0; const sizes = [];
    for (const id of pathNodes) {
      if (comp.has(id)) continue; const q = [id]; comp.set(id, nc); let n = 0;
      while (q.length) { const u = q.pop(); n++; for (const e of adj.get(u)) { const v = e.a === u ? e.b : e.a; if (!comp.has(v) && nodes.get(v).path !== undefined && e.type !== 'awt') { comp.set(v, nc); q.push(v); } } }
      sizes.push(n); nc++;
    }
    if (nc > 1) {
      const main = sizes.indexOf(Math.max(...sizes)), mainIds = pathNodes.filter(id => comp.get(id) === main && nodes.get(id).kind !== 'awt' && nodes.get(id).kind !== 'tunnel');
      for (let c = 0; c < nc; c++) {
        if (c === main) continue;
        const ids = pathNodes.filter(id => comp.get(id) === c); if (!ids.length || ['awt', 'tunnel'].includes(nodes.get(ids[0]).kind)) continue;
        let best = null, bd = 40;
        for (const a of ids) { const A = nodes.get(a); for (const b of mainIds) { const B = nodes.get(b); const d = Math.hypot(A.x - B.x, A.z - B.z); if (d < bd && Math.abs(A.y - B.y) < 1.5) { bd = d; best = [a, b]; } } }
        if (best) addEdge(best[0], best[1], nodes.get(best[0]).kind === 'strasse' ? 'zufahrt' : nodes.get(best[0]).kind, { path: null });
      }
    }
  }

  /* 2. Geschossnetze je Bauteil */
  for (const b of own) for (const pt of b.parts) {
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
        const touch = (a, b) => Math.abs(a.x - b.x) <= (a.w + b.w) / 2 + 0.6 && Math.abs(a.z - b.z) <= (a.d + b.d) / 2 + 0.6;
        for (let i = 0; i < segIds.length; i++) for (let j = i + 1; j < segIds.length; j++) {
          let best = null, bd = touch(flure[i], flure[j]) ? 40 : 3.5;
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
  for (const b of own) for (const pt of b.parts) {
    const outer = FP(pt).o;
    for (const f of HSS.partFloors(pt)) {
      const ids = floorNodes.get(pt.id + '|' + f); if (!ids?.length) continue;
      const y = HSS.floorY(pt, f, prj);
      const cand = [];
      for (const pid of pathNodes) {
        const P = nodes.get(pid); if (Math.abs(P.y - y) > 1.8) continue;
        let bd = Infinity, bp = null;
        for (let i = 0; i < outer.length; i++) { const c = G.closestOnSeg([P.x, P.z], outer[i], outer[(i + 1) % outer.length]); const d = G.dist([P.x, P.z], c.pt); if (d < bd) { bd = d; bp = c.pt; } }
        if (bd < 22 || (f === 0 && bd < 70)) cand.push({ pid, d: bd, bp, kind: P.kind });
      }
      cand.sort((a, c) => a.d - c.d);
      // Gebäude abseits der Wege: im EG über den nächsten Weg erschließen (Zuweg bis 70 m)
      if (cand.length && cand[0].d >= 22) cand.splice(1); else for (let i = cand.length - 1; i >= 0; i--) if (cand[i].d >= 22) cand.splice(i, 1);
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
  const parts = own.flatMap(b => b.parts);
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const A = parts[i], B = parts[j], FA = FP(A), FB = FP(B);
    if (FA.bb.x0 > FB.bb.x1 + 2 || FB.bb.x0 > FA.bb.x1 + 2 || FA.bb.z0 > FB.bb.z1 + 2 || FB.bb.z0 > FA.bb.z1 + 2) continue;
    const fa = FA.o, fb = FB.o;
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
      if (pt.id !== P.part.id && pt.stackOn !== P.part.id && P.part.stackOn !== pt.id && !P.building.parts.includes(pt)) continue;
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
      prev = { id, gf: s.gf, y: s.y };
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
      // Außenorte an die nächsten Knoten mehrerer Wege (bis 45 m) anbinden, damit jedes Transportmittel einen Zugang findet
      const best = new Map();
      for (const pid of pathNodes) { const P = nodes.get(pid); const d = Math.hypot(P.x - pl.x, P.z - pl.z); const b = best.get(P.path); if (!b || d < b.d) best.set(P.path, { id: pid, d }); }
      const list = [...best.values()].sort((a, b) => a.d - b.d);
      list.filter((b, i) => i === 0 || b.d < 45).slice(0, 4).forEach(b => addEdge(id, b.id, 'anbindung', { len: b.d + (pl.anfahrtM || 0) }));
    }
  }
  // AWT-Aufzüge mit AWT-Trasse verbinden (unterste Haltestelle)
  for (const L of lifts) if (L.cfg.typ === 'awt' && L.stops.length) {
    const id = `L:${L.id}@${L.stops[0]}`, n = nodes.get(id);
    const near = nearestIn(pathNodes.filter(p => nodes.get(p).kind === 'awt'), n.x, n.z, n.y); if (near && near.d < 30) addEdge(id, near.id, 'awt', {});
  }
  const net = { nodes, adj, edges, lifts, places, placeNode, floorNodes, ownParts: parts, cache: new Map() };
  fixedRoutes(net, prj);
  return net;
}

/* ---------- Routing ---------- */
// mittel: Schlüssel aus HSS.MITTEL; klasse: 'rein' | 'unrein' | 'person' | 'patient' | 'neutral'
const liftOf = (net, id) => { if (!net.liftMap || net.liftMap._n !== net.lifts) { net.liftMap = new Map(net.lifts.map(l => [l.id, l])); net.liftMap._n = net.lifts; } return net.liftMap.get(id); };
HSS.edgeAllowed = (e, mittel, klasse, net) => {
  const M = HSS.MITTEL[mittel] || HSS.MITTEL.hand;
  if (!M.kanten.includes(e.type)) return false;
  if (e.type === 'aufzug') {
    const L = liftOf(net, e.lift); if (!L) return false;
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

// kürzester Weg zwischen zwei Knoten (Zeit); allow: Aufzug/Treppe, die unabhängig von Freigaben benutzt werden darf
function dijk(net, s, t, mittel, klasse, allow, only) {
  const M = HSS.MITTEL[mittel] || HSS.MITTEL.hand;
  const dist = new Map([[s, 0]]), prev = new Map(), h = new Heap(); h.push([0, s]);
  while (h.size) {
    const [d, u] = h.pop(); if (u === t) break; if (d > (dist.get(u) ?? Infinity)) continue;
    for (const e of net.adj.get(u) || []) {
      if (only ? e.lift !== only : !(allow && e.lift === allow) && !HSS.edgeAllowed(e, mittel, klasse, net)) continue;
      const v = e.a === u ? e.b : e.a;
      let c = e.len / M.v / 60;
      if (e.type === 'aufzug') { const L = liftOf(net, e.lift); c = (L.cfg.sekProGeschoss / 60) + (L.cfg.tuerS / 60) + LIFT_WAIT_EST / 2; }
      if (e.type === 'treppe') c = e.len / 0.6 / 60;
      const nd = d + c;
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, { u, e }); h.push([nd, v]); }
    }
  }
  if (!dist.has(t)) return null;
  const path = [t], es = []; let c = t; while (prev.has(c)) { const { u, e } = prev.get(c); es.unshift(e); path.unshift(u); c = u; }
  return { path, es, time: dist.get(t) };
}
function assemble(net, path, es, time) {
  const pts = path.map(id => { const n = net.nodes.get(id); return [n.x, n.y, n.z]; });
  let len = 0; for (const e of es) len += e.len;
  // Aufzugsfahrten zusammenfassen
  const lifts = []; let cur = null;
  es.forEach((e, i) => {
    if (e.type === 'aufzug') { const a = net.nodes.get(path[i]).gf, b = net.nodes.get(path[i + 1]).gf; if (cur && cur.lift === e.lift && cur.idx === i - 1) { cur.to = b; cur.idx = i; } else { cur = { lift: e.lift, from: a, to: b, idx: i, startIdx: i }; lifts.push(cur); } }
  });
  const types = {}; for (const e of es) types[e.type] = (types[e.type] || 0) + e.len;
  return { ok: true, len, timeMin: time, nodes: path, edges: es, lifts, pts, types };
}
const NO_ROUTE = () => ({ ok: false, len: 0, timeMin: 0, nodes: [], edges: [], lifts: [], pts: [] });
HSS.route = (fromPlace, toPlace, mittel = 'hand', klasse = 'neutral') => {
  const net = HSS.net(), key = [fromPlace, toPlace, mittel, klasse].join('|');
  if (net.cache.has(key)) return net.cache.get(key);
  const M = HSS.MITTEL[mittel] || HSS.MITTEL.hand;
  const s = net.placeNode.get(fromPlace), t = net.placeNode.get(toPlace);
  let res = null;
  const fx = net.fixed?.get(fromPlace + '|' + toPlace);
  if (s && t && fx && fx.pfad) {
    // gezeichneter Pfad: genau so, wie er gezeichnet wurde
    let time = 0; for (const e of fx.edges) time += e.type === 'aufzug' ? (5 * Math.abs((e.gfb ?? 0) - (e.gfa ?? 0)) + 12) / 60 + LIFT_WAIT_EST / 2 : e.type === 'treppe' ? e.len / 0.6 / 60 : e.len / M.v / 60;
    res = Object.assign(assemble(net, fx.nodes, fx.edges, time), { gezeichnet: true });
  } else if (s && t && fx && fx.via) {
    // über einen bestimmten Aufzug / ein bestimmtes Treppenhaus
    const a = `L:${fx.via}@${fx.gfA}`, b = `L:${fx.via}@${fx.gfB}`;
    const p1 = net.nodes.has(a) && dijk(net, s, a, mittel, klasse), p2 = p1 && net.nodes.has(b) && dijk(net, a, b, mittel, klasse, fx.via, fx.via), p3 = p2 && dijk(net, b, t, mittel, klasse);
    if (p3) res = Object.assign(assemble(net, [...p1.path, ...p2.path.slice(1), ...p3.path.slice(1)], [...p1.es, ...p2.es, ...p3.es], p1.time + p2.time + p3.time), { via: fx.via });
  }
  if (!res && s && t) {
    if (M.direkt) {
      const A = net.nodes.get(s), B = net.nodes.get(t), len = Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) * 1.3;
      res = { ok: true, len, timeMin: len / M.v / 60 + 1, nodes: [s, t], edges: [], lifts: [], pts: [[A.x, A.y, A.z], [B.x, B.y, B.z]], direkt: true };
    } else { const r = dijk(net, s, t, mittel, klasse); if (r) res = assemble(net, r.path, r.es, r.time); }
  }
  if (!res) res = NO_ROUTE();
  net.cache.set(key, res);
  return res;
};

})();
(function () {
'use strict';
const HSS = window.HSS, G = HSS.geo;
/* ---------- Darstellung: Routen begradigen ----------
   Das Wegenetz verbindet Räume mit dem nächsten Flurknoten; dadurch entstehen in
   der Darstellung kurze Stichwege („Überstände“) und schräge Anschlüsse. Für die
   Anzeige werden Spitzen entfernt, gerade Stücke zusammengefasst und schräge
   Abschnitte innerhalb von Gebäuden rechtwinklig (in der Gebäudeachse) geführt. */
let frames = null, framesNet = null;
const partFrames = () => {
  const net = HSS.net(); if (frames && framesNet === net) return frames;
  framesNet = net; frames = [];
  for (const b of HSS.project().buildings) { if (b.umgebung) continue; for (const pt of b.parts) { const fp = HSS.partFootprint(pt).outer, bb = G.bbox(fp); const r = (pt.rot || 0) * Math.PI / 180; frames.push({ pt, fp, bb, eu: G.rot([1, 0], r), ev: G.rot([0, 1], r) }); } }
  return frames;
};
const frameAt = (x, z) => { for (const F of partFrames()) { const b = F.bb; if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) continue; if (G.pointIn([x, z], F.fp)) return F; } return null; };
HSS.cleanPts = (src) => {
  let p = src.map(q => [q[0], q[1], q[2]]);
  const same = (a, b) => Math.abs(a[1] - b[1]) < 0.3;
  // doppelte Punkte
  p = p.filter((q, i) => i === 0 || Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1], q[2] - p[i - 1][2]) > 0.05);
  // Spitzen (hin und zurück) und gerade Zwischenpunkte entfernen
  for (let pass = 0; pass < 4; pass++) {
    let ch = false;
    for (let i = 1; i < p.length - 1; i++) {
      const a = p[i - 1], b = p[i], c = p[i + 1]; if (!same(a, b) || !same(b, c)) continue;
      const ux = b[0] - a[0], uz = b[2] - a[2], vx = c[0] - b[0], vz = c[2] - b[2], lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
      if (lu < 0.05 || lv < 0.05) { p.splice(i, 1); i--; ch = true; continue; }
      const cos = (ux * vx + uz * vz) / (lu * lv), cr = Math.abs(ux * vz - uz * vx) / (lu * lv);
      if (cos < -0.5 || (cos > 0 && cr < 0.03)) { p.splice(i, 1); i--; ch = true; }
    }
    if (!ch) break;
  }
  // schräge Stücke im Gebäude rechtwinklig führen
  const out = [p[0]];
  for (let i = 1; i < p.length; i++) {
    const a = out[out.length - 1], b = p[i];
    if (same(a, b)) {
      const F = frameAt((a[0] + b[0]) / 2, (a[2] + b[2]) / 2);
      if (F) {
        const { eu, ev } = F, dx = b[0] - a[0], dz = b[2] - a[2];
        const du = dx * eu[0] + dz * eu[1], dv = dx * ev[0] + dz * ev[1]; // lokale Achsen
        if (Math.abs(du) > 0.4 && Math.abs(dv) > 0.4) {
          const prev = out.length > 1 ? out[out.length - 2] : null;
          let uFirst = Math.abs(du) >= Math.abs(dv);
          if (prev && same(prev, a)) { const px = a[0] - prev[0], pz = a[2] - prev[2], pu = px * eu[0] + pz * eu[1], pv = px * ev[0] + pz * ev[1]; if (Math.abs(pu) > 0.3 || Math.abs(pv) > 0.3) uFirst = Math.abs(pu) > Math.abs(pv); }
          const c = uFirst ? [a[0] + du * eu[0], a[1], a[2] + du * eu[1]] : [a[0] + dv * ev[0], a[1], a[2] + dv * ev[1]];
          out.push(c);
        }
      }
    }
    out.push(b);
  }
  return out;
};
})();
(function () {
'use strict';
const HSS = window.HSS;
/* Anzeige-Punkte einer Route: begradigt (ohne Stichwege), aber mit allen Netzknoten, die auf
   den geraden Stücken liegen – so teilen sich Flüsse auf demselben Flur dieselben Abschnitte und
   können zu einem dicken Band zusammengefasst werden. Ergebnis: [[x, y, z, gf], …] */
HSS.routeAnzeige = (r) => {
  if (!r || !r.ok || !r.pts?.length) return [];
  const net = HSS.net(), raw = r.pts.map((p, i) => { const n = net.nodes.get(r.nodes[i]); return [p[0], p[1], p[2], n?.gf]; });
  // Etage für Knoten ohne Angabe (Orte, Wege) aus Nachbarn ergänzen
  for (let i = 0; i < raw.length; i++) if (raw[i][3] === undefined) { const nb = raw.slice(Math.max(0, i - 3), i + 4).find(q => q[3] !== undefined && Math.abs(q[1] - raw[i][1]) < 1.5); raw[i][3] = nb ? nb[3] : 0; }
  if (r.gezeichnet) return raw; // gezeichnete Wege genau so zeigen, wie sie gezeichnet wurden (auch schräg)
  const cl = HSS.cleanPts(raw);
  const gfAt = (x, y, z) => { let b = null; for (const q of raw) { const d = Math.abs(q[0] - x) + Math.abs(q[2] - z) + Math.abs(q[1] - y) * 3; if (!b || d < b.d) b = { d, g: q[3] }; } return b ? b.g : 0; };
  const out = [];
  for (let i = 0; i < cl.length; i++) {
    const a = cl[i]; out.push([a[0], a[1], a[2], gfAt(a[0], a[1], a[2])]);
    const b = cl[i + 1]; if (!b || Math.abs(a[1] - b[1]) > 0.3) continue;
    const dx = b[0] - a[0], dz = b[2] - a[2], L2 = dx * dx + dz * dz; if (L2 < 1) continue;
    const mid = [];
    for (const q of raw) {
      if (Math.abs(q[1] - a[1]) > 0.3) continue;
      const t = ((q[0] - a[0]) * dx + (q[2] - a[2]) * dz) / L2; if (t <= 0.02 || t >= 0.98) continue;
      const px = a[0] + dx * t, pz = a[2] + dz * t; if (Math.hypot(q[0] - px, q[2] - pz) > 0.25) continue;
      mid.push([t, px, pz]);
    }
    mid.sort((u, v) => u[0] - v[0]).forEach(([, x, z]) => { const l = out[out.length - 1]; if (Math.hypot(l[0] - x, l[2] - z) > 0.3) out.push([x, a[1], z, out[out.length - 1][3]]); });
  }
  return out;
};
})();
