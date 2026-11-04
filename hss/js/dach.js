/* =====================================================================
   HSS · dach.js – geneigte Dächer: Satteldach, Walmdach, Zeltdach, Pultdach, Sheddach
   Funktioniert für jede Grundform (auch freie Vielecke aus OpenStreetMap).
   Die Firstrichtung folgt der langen Seite des kleinsten umschließenden Rechtecks
   (oder roof.richtung in Grad). Neigung über roof.neigung [°] oder feste Dachhöhe
   roof.hoehe [m]. Rechnung im lokalen Raster des Bauteils:
     Sattel/Walm/Zelt/Pult: Dachfläche = Minimum mehrerer Ebenen; jede Ebene gilt in
     einem konvexen Bereich (Schnitt von Halbebenen), der Grundriss wird darauf
     zugeschnitten und trianguliert. Giebel: Wandstreifen unter der Dachkante.
     Shed: Streifen mit je einer Pultfläche und senkrechtem Glasband.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE } = window.THREEX;

HSS.DACHARTEN = {
  flach: { name: 'Flachdach' }, gruen: { name: 'Gründach' },
  sattel: { name: 'Satteldach', geneigt: true, neigung: 38 }, walm: { name: 'Walmdach', geneigt: true, neigung: 30 },
  zelt: { name: 'Zeltdach', geneigt: true, neigung: 30 }, pult: { name: 'Pultdach', geneigt: true, neigung: 12 },
  shed: { name: 'Sheddach (Fabrikhalle)', geneigt: true, neigung: 25 }
};
HSS.dachGeneigt = pt => !!HSS.DACHARTEN[pt.roof?.type]?.geneigt;

/* kleinstes umschließendes Rechteck → Achsen u (lang) und v (kurz) */
function achsen(ring, richtung) {
  let best = null;
  const test = ang => {
    const c = Math.cos(ang), s = Math.sin(ang);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of ring) { const u = x * c + z * s, v = -x * s + z * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const r = { ang, c, s, u0, u1, v0, v1, A: (u1 - u0) * (v1 - v0) };
    if (u1 - u0 < v1 - v0) { // u soll die lange Seite sein
      const a2 = ang + Math.PI / 2, c2 = Math.cos(a2), s2 = Math.sin(a2);
      return { ang: a2, c: c2, s: s2, u0: v0, u1: v1, v0: -u1, v1: -u0, A: r.A };
    }
    return r;
  };
  if (richtung !== undefined && richtung !== null && richtung !== '' && !isNaN(+richtung)) {
    const ang = U.rad(+richtung), c = Math.cos(ang), s = Math.sin(ang);
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of ring) { const u = x * c + z * s, v = -x * s + z * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    return { ang, c, s, u0, u1, v0, v1 };
  }
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length]; if (G.dist(a, b) < 0.5) continue;
    const r = test(Math.atan2(b[1] - a[1], b[0] - a[0]));
    if (!best || r.A < best.A - 1e-6) best = r;
  }
  return best || test(0);
}
HSS.dachAchsen = achsen;

/* Dachfunktion: Liste von Bereichen { hp: [[a,b,c]…] (a·u + b·v <= c), ebene: [ku, kv, k0] (h = ku·u + kv·v + k0) } */
function dachPlan(pt, ring) {
  const R = pt.roof || {}, typ = R.type, A = achsen(ring, R.richtung);
  const W = (A.v1 - A.v0) / 2, L = (A.u1 - A.u0) / 2, vm = (A.v0 + A.v1) / 2;
  const def = HSS.DACHARTEN[typ]?.neigung || 30;
  const tanN = Math.tan(U.rad(U.clamp(+R.neigung || def, 3, 75)));
  const bereiche = []; let hmax = 0;
  if (typ === 'sattel') {
    const s = R.hoehe > 0 ? R.hoehe / W : tanN; hmax = s * W;
    bereiche.push({ hp: [[0, -1, -vm]], ebene: [0, -s, s * A.v1] });   // v ≥ vm: h = s (v1 − v)
    bereiche.push({ hp: [[0, 1, vm]], ebene: [0, s, -s * A.v0] });     // v ≤ vm: h = s (v − v0)
  } else if (typ === 'walm' || typ === 'zelt') {
    const s = R.hoehe > 0 ? R.hoehe / W : tanN; hmax = s * W;
    const um = (A.u0 + A.u1) / 2;
    const E = [[0, -s, s * A.v1], [0, s, -s * A.v0], [-s, 0, s * A.u1], [s, 0, -s * A.u0]];
    if (typ === 'zelt') { const s2 = W > 0 ? s * W / L : s; E[2] = [-s2, 0, s2 * A.u1]; E[3] = [s2, 0, -s2 * A.u0]; }
    // Bereich i: Ebene i ist die niedrigste → (E_i − E_j) ≤ 0
    for (let i = 0; i < 4; i++) bereiche.push({ hp: E.filter((_, j) => j !== i).map(Ej => [E[i][0] - Ej[0], E[i][1] - Ej[1], Ej[2] - E[i][2]]), ebene: E[i] });
    void um;
  } else if (typ === 'pult') {
    const s = R.hoehe > 0 ? R.hoehe / (2 * W) : tanN; hmax = s * 2 * W;
    bereiche.push({ hp: [], ebene: R.umkehren ? [0, -s, s * A.v1] : [0, s, -s * A.v0] });
  } else if (typ === 'shed') {
    // Streifen quer zur langen Seite, Glas jeweils an der steilen Kante
    const P = U.clamp(+R.raster || 10, 4, 30), n = Math.max(1, Math.round((A.u1 - A.u0) / P)), p = (A.u1 - A.u0) / n;
    const s = R.hoehe > 0 ? R.hoehe / p : Math.tan(U.rad(U.clamp(+R.neigung || 25, 5, 60))); hmax = s * p;
    for (let k = 0; k < n; k++) {
      const a = A.u0 + k * p, b = a + p;
      bereiche.push({ hp: [[-1, 0, -a], [1, 0, b]], ebene: [s, 0, -s * a], shedKante: k < n - 1 ? b : null });
    }
  }
  return { A, bereiche, hmax };
}

/* Sutherland–Hodgman: Vieleck an einer Halbebene a·u + b·v ≤ c abschneiden (Koordinaten in u/v) */
function clip(poly, [a, b, c]) {
  const out = []; const f = p => a * p[0] + b * p[1] - c;
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q);
    if (fp <= 1e-9) out.push(P);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { const t = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out;
}

/* Geometrie: Dachflächen, Giebelwände und (Shed) Glasbänder – Weltkoordinaten */
HSS.dachGeo = (pt, outerLocal, yt) => {
  const plan = dachPlan(pt, outerLocal), { A } = plan;
  const toUV = ([x, z]) => [x * A.c + z * A.s, -x * A.s + z * A.c];
  const fromUV = ([u, v]) => [u * A.c - v * A.s, u * A.s + v * A.c];
  const W = p => HSS.toWorld(pt, fromUV(p));
  const ringUV = G.ccw(outerLocal).map(toUV);
  const hOf = (E, p) => E[0] * p[0] + E[1] * p[1] + E[2];
  const dach = [], wand = [], glas = [];
  const tri = (arr, a, b, c) => arr.push(...a, ...b, ...c);
  // Dachflächen je Bereich
  for (const B of plan.bereiche) {
    let poly = ringUV; for (const hp of B.hp) { poly = clip(poly, hp); if (poly.length < 3) break; }
    if (poly.length < 3 || Math.abs(G.area(poly)) < 0.01) continue;
    const pts = poly.map(p => { const w = W(p); return [w[0], yt + Math.max(0, hOf(B.ebene, p)), w[1]]; });
    const idx = THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p[0], p[1])), []);
    for (const [i, j, k] of idx) {
      const a = pts[i], b = pts[j], c = pts[k];
      const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]); // y-Komponente der Normalen (a→b × a→c)
      if (ny >= 0) tri(dach, a, b, c); else tri(dach, a, c, b);
    }
  }
  // Höhe am Punkt (Bereich, der den Punkt enthält)
  const hAt = p => { for (const B of plan.bereiche) if (B.hp.every(([a, b, c]) => a * p[0] + b * p[1] <= c + 1e-6)) return Math.max(0, hOf(B.ebene, p)); return 0; };
  // Giebel- und Seitenwände unter der Dachfläche, Kante für Kante
  const linien = plan.bereiche.flatMap(B => B.hp);
  for (let i = 0; i < ringUV.length; i++) {
    const a = ringUV[i], b = ringUV[(i + 1) % ringUV.length], L = G.dist(a, b); if (L < 0.02) continue;
    const ts = [0, 1];
    for (const [la, lb, lc] of linien) { const fa = la * a[0] + lb * a[1] - lc, fb = la * b[0] + lb * b[1] - lc; if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) ts.push(fa / (fa - fb)); }
    ts.sort((x, y) => x - y);
    for (let k = 0; k < ts.length - 1; k++) {
      const t0 = ts[k], t1 = ts[k + 1]; if (t1 - t0 < 1e-5) continue;
      const P0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], P1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const tm = (t0 + t1) / 2, M = [a[0] + (b[0] - a[0]) * tm, a[1] + (b[1] - a[1]) * tm];
      let E = null; for (const B of plan.bereiche) if (B.hp.every(([x, y, c]) => x * M[0] + y * M[1] <= c + 1e-6)) { E = B.ebene; break; }
      if (!E) continue;
      const h0 = Math.max(0, hOf(E, P0)), h1 = Math.max(0, hOf(E, P1)); if (h0 < 0.01 && h1 < 0.01) continue;
      const w0 = W(P0), w1 = W(P1);
      const q0 = [w0[0], yt, w0[1]], q1 = [w1[0], yt, w1[1]], r1 = [w1[0], yt + h1, w1[1]], r0 = [w0[0], yt + h0, w0[1]];
      tri(wand, q0, q1, r1); tri(wand, q0, r1, r0);
    }
  }
  // Shed: senkrechte Glasbänder an den Streifengrenzen
  for (const B of plan.bereiche) {
    if (B.shedKante === null || B.shedKante === undefined) continue;
    const u = B.shedKante, hs = hOf(B.ebene, [u, 0]);
    const xs = [];
    for (let i = 0; i < ringUV.length; i++) { const a = ringUV[i], b = ringUV[(i + 1) % ringUV.length]; if ((a[0] - u) * (b[0] - u) < 0) xs.push(a[1] + (b[1] - a[1]) * (u - a[0]) / (b[0] - a[0])); }
    xs.sort((x, y) => x - y);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const w0 = W([u, xs[k]]), w1 = W([u, xs[k + 1]]);
      const q0 = [w0[0], yt, w0[1]], q1 = [w1[0], yt, w1[1]], r1 = [w1[0], yt + hs, w1[1]], r0 = [w0[0], yt + hs, w0[1]];
      tri(glas, q0, q1, r1); tri(glas, q0, r1, r0);
    }
  }
  const geo = arr => { if (!arr.length) return null; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); g.computeVertexNormals(); return g; };
  void hAt;
  return { dach: geo(dach), wand: geo(wand), glas: geo(glas), hmax: plan.hmax };
};
// Firsthöhe über der Traufe (für Beschriftung, Kamera, Statistik)
HSS.dachHoehe = pt => { if (!HSS.dachGeneigt(pt)) return 0; try { return dachPlan(pt, HSS.partFootprintLocal(pt).outer).hmax; } catch (e) { return 0; } };
})();
