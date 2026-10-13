/* =====================================================================
   HSS · build-aussen.js – Gelände, Wege/Straßen/Tunnel, Flächen (Parkplatz, Grün, Platz), Verkehr
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE, mergeGeometries } = window.THREEX;
const LM = (c, m = 'matt') => HSS.library.material(c, m);

HSS.WEGARTEN = {
  strasse: { name: 'Straße', color: '#5d6166', w: 7, info: 'Fahrbahn mit Mittelmarkierung; Verkehr animierbar' },
  zufahrt: { name: 'Zufahrt / Wirtschaftsweg', color: '#6b6f74', w: 5, info: 'LKW-Anlieferung, Rettungszufahrt' },
  weg: { name: 'Campusweg', color: '#b9b4aa', w: 3.5, info: 'Innere Wege für Personal, Betten- und Wagentransporte' },
  gehweg: { name: 'Gehweg', color: '#cfcac0', w: 2.2, info: 'Fußwege, auch gebogen und mit Gefälle' },
  tunnel: { name: 'Versorgungstunnel', color: '#9aa0a6', w: 3.5, info: 'Unterirdischer Gang für Schlepper und Handwagen' },
  awt: { name: 'AWT-Trasse (Tunnel)', color: '#a49c86', w: 2.4, info: 'Fahrweg der Automatischen Warentransportanlage' }
};
HSS.FLAECHEN = { parkplatz: 'Parkplatz', gruen: 'Grünfläche', platz: 'Platz / Pflaster', wasser: 'Wasserfläche' };

/* ---------- Gelände ---------- */
HSS.buildTerrain = (view = {}) => {
  const prj = HSS.project(), t = prj.terrain, S = t.size || 500, n = Math.min(160, Math.max(40, Math.round(S / 4)));
  const g = new THREE.PlaneGeometry(S, S, n, n); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = []; let minH = 0;
  const c1 = new THREE.Color(t.color || '#c9d6b8'), c2 = new THREE.Color('#b9c8a6'), c3 = new THREE.Color('#d8d2bf');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = HSS.terrainH(x, z, prj); minH = Math.min(minH, h); pos.setY(i, h - 0.02);
    const k = (Math.sin(x * 0.05) * Math.cos(z * 0.043) + 1) / 2; const c = c1.clone().lerp(c2, k * 0.6).lerp(c3, U.clamp(h / 30, 0, 0.4));
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const under = view.floor !== null && view.floor !== undefined && view.floor < 0;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, transparent: under, opacity: under ? 0.25 : 1, depthWrite: !under });
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData = { kind: 'terrain' };
  const grp = new THREE.Group(); grp.add(m);
  // Erdkörper-Ränder
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(S, 12, S), new THREE.MeshStandardMaterial({ color: '#8a7f6e', roughness: 1, transparent: under, opacity: under ? 0.08 : 1, depthWrite: !under }));
  skirt.position.y = minH - 0.4 - 6; skirt.userData = { kind: 'terrain' };
  grp.add(skirt);
  return grp;
};

/* ---------- Wege ---------- */
// Linienpunkte mit Höhe (gelände-folgend oder absolut, optional Rampe/Gefälle)
HSS.pathLine = (p, prj = HSS.project()) => {
  if (!p.points || p.points.length < 2) return [];
  let pts = p.smooth ? G.smooth(p.points, 10) : p.points.map(q => q.slice());
  // Verdichten für Geländeanpassung
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], l = G.dist(a, b), k = Math.max(1, Math.ceil(l / 3));
    for (let j = 0; j < k; j++) dense.push([U.lerp(a[0], b[0], j / k), U.lerp(a[1], b[1], j / k)]);
  }
  dense.push(pts[pts.length - 1].slice(0, 2));
  const total = G.polylineLength(dense); let s = 0;
  return dense.map((q, i) => {
    if (i) s += G.dist(dense[i - 1], q);
    const t = total ? s / total : 0;
    let y;
    if (p.elev === 'absolut') y = (p.y ?? -4) + (p.ramp ? U.lerp(p.ramp[0] || 0, p.ramp[1] || 0, t) : 0);
    else y = HSS.terrainH(q[0], q[1], prj) + 0.06 + (p.ramp ? U.lerp(p.ramp[0] || 0, p.ramp[1] || 0, t) : 0);
    return [q[0], y, q[1], s];
  });
};
HSS.pathStats = p => {
  const L = HSS.pathLine(p); if (L.length < 2) return { len: 0, maxSlope: 0, dy: 0 };
  let max = 0; for (let i = 1; i < L.length; i++) { const d = L[i][3] - L[i - 1][3]; if (d > 0.5) max = Math.max(max, Math.abs(L[i][1] - L[i - 1][1]) / d); }
  return { len: L[L.length - 1][3], maxSlope: max, dy: L[L.length - 1][1] - L[0][1] };
};
const ribbon = (L, w, yoff = 0) => {
  const pos = [], idx = [];
  for (let i = 0; i < L.length; i++) {
    const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
    pos.push(L[i][0] + nx, L[i][1] + yoff, L[i][2] + nz, L[i][0] - nx, L[i][1] + yoff, L[i][2] - nz);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
};
HSS.buildPath = (p, view = {}) => {
  const grp = new THREE.Group(); grp.userData = { kind: 'path', id: p.id };
  const L = HSS.pathLine(p); if (L.length < 2) return grp;
  const def = HSS.WEGARTEN[p.kind] || HSS.WEGARTEN.weg, w = p.width || def.w;
  const under = p.kind === 'tunnel' || p.kind === 'awt';
  const main = new THREE.Mesh(ribbon(L, w, under ? 0 : 0.02), LM(p.color || def.color)); main.receiveShadow = true; main.userData = { kind: 'path', id: p.id };
  // Wege werden über Gelände leicht nach oben versetzt; polygonOffset gegen Z-Fighting
  main.material = main.material.clone(); main.material.polygonOffset = true; main.material.polygonOffsetFactor = -2 - (p.kind === 'strasse' ? 1 : 0);
  grp.add(main);
  if (p.kind === 'strasse') {
    // Mittellinie gestrichelt, Bordsteine
    const dash = [];
    for (let i = 1; i < L.length; i++) if (Math.floor(L[i][3] / 3) % 2 === 0) { const a = L[i - 1], b = L[i]; dash.push(a, b); }
    const seg = []; for (let i = 0; i < dash.length; i += 2) seg.push(ribbon([dash[i], dash[i + 1]], 0.15, 0.035));
    if (seg.length) grp.add(new THREE.Mesh(mergeGeometries(seg), LM('#f4f4f4', 'lack')));
    for (const s of [-1, 1]) { const off = L.map((q, i) => { const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return [q[0] - dz / l * (w / 2 + 0.12) * s, q[1] + 0.07, q[2] + dx / l * (w / 2 + 0.12) * s, q[3]]; }); const c = new THREE.Mesh(ribbon(off, 0.25, 0), LM('#c8c8c4')); c.castShadow = false; grp.add(c); }
  }
  if (p.kind === 'zufahrt') {
    const seg = []; for (const s of [-1, 1]) { const off = L.map((q, i) => { const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return [q[0] - dz / l * (w / 2 - 0.3) * s, q[1], q[2] + dx / l * (w / 2 - 0.3) * s, q[3]]; }); seg.push(ribbon(off, 0.12, 0.035)); }
    grp.add(new THREE.Mesh(mergeGeometries(seg), LM('#f4f4f4', 'lack')));
  }
  if (under) {
    // Tunnelröhre: Wände + Decke (halbtransparent), Leitlinie bei AWT
    const showSolid = view.floor !== null && view.floor !== undefined && view.floor < 0;
    const h = p.height || (p.kind === 'awt' ? 2.8 : 3.0);
    const mat = new THREE.MeshStandardMaterial({ color: '#b8bcc2', roughness: 0.9, transparent: true, opacity: showSolid ? 0.35 : 0.14, depthWrite: false, side: THREE.DoubleSide });
    const geos = [];
    for (const s of [-1, 1]) {
      const off = L.map((q, i) => { const a = L[Math.max(0, i - 1)], b = L[Math.min(L.length - 1, i + 1)]; const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return [q[0] - dz / l * w / 2 * s, q[1], q[2] + dx / l * w / 2 * s]; });
      geos.push(HSS.ringWallGeo(off.map(q => [q[0], q[2]]), 0, 1, false));
      const g = geos[geos.length - 1], pa = g.attributes.position;
      // y je Punkt anpassen (Wand folgt der Trassenhöhe)
      for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), z = pa.getZ(i); let best = 0, bd = Infinity; for (let k = 0; k < off.length; k++) { const d = (off[k][0] - x) ** 2 + (off[k][2] - z) ** 2; if (d < bd) { bd = d; best = k; } } pa.setY(i, off[best][1] + pa.getY(i) * h); }
      g.computeVertexNormals();
    }
    geos.push(ribbon(L, w, h).toNonIndexed());
    const tube = new THREE.Mesh(mergeGeometries(geos), mat); tube.userData = { kind: 'path', id: p.id }; grp.add(tube);
    if (p.kind === 'awt') { grp.add(new THREE.Mesh(ribbon(L, 0.12, 0.03), LM('#f2c94c', 'leucht'))); }
    else grp.add(new THREE.Mesh(ribbon(L, 0.1, 0.03), LM('#ffffff', 'lack')));
  }
  return grp;
};

/* ---------- Flächen ---------- */
HSS.areaPoly = a => { const hw = a.w / 2, hd = a.d / 2, r = U.rad(a.rot || 0); return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(p => { const q = G.rot(p, r); return [q[0] + a.x, q[1] + a.z]; }); };
const drapedRect = (a, yoff, color, rough = 0.95) => {
  const nx = Math.max(1, Math.round(a.w / 4)), nz = Math.max(1, Math.round(a.d / 4));
  const g = new THREE.PlaneGeometry(a.w, a.d, nx, nz); g.rotateX(-Math.PI / 2); g.rotateY(-U.rad(a.rot || 0)); g.translate(a.x, 0, a.z);
  const pa = g.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, HSS.terrainH(pa.getX(i), pa.getZ(i)) + yoff);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, polygonOffset: true, polygonOffsetFactor: -1 });
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.userData = { kind: 'area', id: a.id }; return m;
};
// Stellplatzlayout: Doppelreihen (2 × 5,0 m Stellplatz + 6,0 m Fahrgasse = 16 m Modul)
HSS.parkingLayout = a => {
  const sw = a.stallW || 2.5, sd = a.stallD || 5.0, aisle = a.aisle || 6.0;
  const stalls = [];
  const modules = Math.floor((a.d + 0.01) / (2 * sd + aisle));
  const rest = a.d - modules * (2 * sd + aisle);
  const cols = Math.floor(a.w / sw);
  let z = -a.d / 2;
  for (let m = 0; m < modules; m++) {
    for (let c = 0; c < cols; c++) { const x = -a.w / 2 + (c + 0.5) * sw; stalls.push([x, z + sd / 2, 0]); stalls.push([x, z + sd + aisle + sd / 2, 1]); }
    z += 2 * sd + aisle;
  }
  if (rest >= sd + aisle) for (let c = 0; c < cols; c++) stalls.push([-a.w / 2 + (c + 0.5) * sw, z + sd / 2, 0]);
  return { stalls, cols, modules, sw, sd, aisle };
};
HSS.buildArea = (a, view = {}) => {
  const grp = new THREE.Group(); grp.userData = { kind: 'area', id: a.id };
  const r = U.rad(a.rot || 0);
  const W = (lx, lz) => { const q = G.rot([lx, lz], r); return [q[0] + a.x, q[1] + a.z]; };
  if (a.kind === 'parkplatz') {
    grp.add(drapedRect(a, 0.05, '#64686d', 0.9));
    const L = HSS.parkingLayout(a), lines = [];
    for (const [x, z, side] of L.stalls) {
      for (const dx of [-L.sw / 2, L.sw / 2]) { const p = W(x + dx, z); const g = new THREE.BoxGeometry(0.12, 0.02, L.sd * 0.95); g.rotateY(-r); g.translate(p[0], HSS.terrainH(p[0], p[1]) + 0.08, p[1]); lines.push(g); }
    }
    if (lines.length) grp.add(new THREE.Mesh(mergeGeometries(lines), LM('#f4f4f4', 'lack')));
    // parkende Fahrzeuge nach Belegung
    const occ = a.occupancy ?? 0.7, rnd = U.rng(U.hash(a.id));
    const models = ['kfz.pkw', 'kfz.pkw.suv', 'kfz.pkw.klein', 'kfz.pkw', 'kfz.pkw.suv'];
    const colors = ['#2d7694', '#4b5058', '#c0392b', '#eef1f4', '#1b1f24', '#144477', '#8e9aa6', '#0A967A'];
    for (const [x, z, side] of L.stalls) {
      if (rnd() > occ) continue;
      const id = models[Math.floor(rnd() * models.length)], p = W(x, z);
      const car = HSS.library.build(id, null, { noShadow: false });
      const col = colors[Math.floor(rnd() * colors.length)];
      car.traverse(m => { if (m.isMesh && m.material.userData.key?.includes('lack') && !m.material.userData.key.startsWith('#f4f4f4')) { const k = m.material.userData.key.split('|')[0]; if (['#2d7694', '#4b5058', '#c0392b'].includes(k)) m.material = LM(col, 'lack'); } });
      car.position.set(p[0], HSS.terrainH(p[0], p[1]) + 0.05, p[1]); car.rotation.y = -r + (side ? Math.PI : 0) + Math.PI / 2 * 0 + (rnd() - 0.5) * 0.05;
      car.rotation.y = -r + (side ? 0 : Math.PI);
      grp.add(car);
    }
    a._capacity = L.stalls.length;
  } else if (a.kind === 'gruen') {
    grp.add(drapedRect(a, 0.03, a.color || '#9cc07f'));
    const rnd = U.rng(U.hash(a.id)), dens = a.density ?? 1.0;
    const nTrees = Math.round(a.w * a.d / 220 * dens), nShrub = Math.round(a.w * a.d / 120 * dens);
    const place = (lib, n, scaleMin, scaleMax) => { for (let i = 0; i < n; i++) { const p = W((rnd() - 0.5) * a.w * 0.9, (rnd() - 0.5) * a.d * 0.9); const d = HSS.library.get(lib); const s = U.lerp(scaleMin, scaleMax, rnd()); const o = HSS.library.build(lib, { w: d.size.w * s, d: d.size.d * s, h: d.size.h * s }); o.position.set(p[0], HSS.terrainH(p[0], p[1]), p[1]); o.rotation.y = rnd() * 6.28; grp.add(o); } };
    place(rnd() > 0.3 ? 'gruen.baum.laub' : 'gruen.baum.klein', nTrees, 0.7, 1.15); place('gruen.strauch', nShrub, 0.6, 1.3);
  } else if (a.kind === 'wasser') {
    const m = drapedRect(a, 0.08, '#6fa3c4', 0.1); m.material.metalness = 0.3; grp.add(m);
  } else {
    grp.add(drapedRect(a, 0.04, a.color || '#d4cfc4'));
  }
  return grp;
};

/* ---------- Verkehr (Autos und Busse auf Straßen) ---------- */
HSS.traffic = {
  agents: [],
  build(root) {
    this.agents.forEach(a => a.obj.parent && a.obj.parent.remove(a.obj)); this.agents = [];
    const prj = HSS.project();
    const stops = prj.objects.filter(o => !o.host && o.lib === 'aussen.haltestelle');
    const rnd = U.rng(77);
    for (const p of prj.paths) {
      if (!['strasse', 'zufahrt'].includes(p.kind) || !(p.traffic > 0)) continue;
      const L = HSS.pathLine(p); if (L.length < 2) continue;
      const len = L[L.length - 1][3], w = p.width || 7;
      const pool = p.kind === 'zufahrt' ? ['kfz.transporter', 'kfz.lkw75', 'kfz.pkw'] : ['kfz.pkw', 'kfz.pkw.suv', 'kfz.pkw.klein', 'kfz.taxi', 'kfz.pkw', 'kfz.rtw', 'kfz.ktw'];
      for (let i = 0; i < p.traffic; i++) {
        const lib = pool[Math.floor(rnd() * pool.length)]; const obj = HSS.library.build(lib); root.add(obj);
        this.agents.push({ obj, L, len, s: rnd() * len, dir: i % 2 ? 1 : -1, lane: w / 4, v: (p.speedKmh || 30) / 3.6 * (0.7 + rnd() * 0.4), wait: 0 });
      }
      // Buslinie, wenn eine Haltestelle nahe der Straße liegt
      const near = stops.map(st => { let best = { d: Infinity, s: 0 }; for (const q of L) { const d = Math.hypot(q[0] - st.x, q[2] - st.z); if (d < best.d) best = { d, s: q[3] }; } return best; }).filter(b => b.d < 18);
      if (near.length) { const obj = HSS.library.build('kfz.bus'); root.add(obj); this.agents.push({ obj, L, len, s: 0, dir: 1, lane: w / 4, v: 8, wait: 0, stops: near.map(n => n.s), bus: true, lastStop: -1 }); }
    }
  },
  update(dt) {
    for (const a of this.agents) {
      if (a.wait > 0) { a.wait -= dt; continue; }
      const ns = a.s + a.v * dt * a.dir;
      if (a.bus) { for (const st of a.stops) { if (st !== a.lastStop && ((a.s < st && ns >= st) || (a.s > st && ns <= st))) { a.wait = 18; a.lastStop = st; } } }
      a.s = ns;
      if (a.s > a.len) { a.s = a.len; a.dir = -1; a.lastStop = -1; } if (a.s < 0) { a.s = 0; a.dir = 1; a.lastStop = -1; }
      const P = HSS.sampleLine(a.L, a.s);
      a.obj.position.set(P.x - Math.sin(P.ang) * a.lane * a.dir, P.y, P.z + Math.cos(P.ang) * a.lane * a.dir);
      a.obj.rotation.y = Math.PI / 2 - P.ang + (a.dir < 0 ? Math.PI : 0);
    }
  }
};
// Position auf einer Linie [x,y,z,s] nach Bogenlänge
HSS.sampleLine = (L, s) => {
  let lo = 0, hi = L.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m][3] <= s) lo = m; else hi = m; }
  const a = L[lo], b = L[hi], d = b[3] - a[3] || 1, t = U.clamp((s - a[3]) / d, 0, 1);
  return { x: U.lerp(a[0], b[0], t), y: U.lerp(a[1], b[1], t), z: U.lerp(a[2], b[2], t), ang: Math.atan2(b[2] - a[2], b[0] - a[0]) };
};
})();
