/* =====================================================================
   HSS · hallenausbau.js – Hallenausbau & Intralogistik (Fabric Planning Suite)
   Macht aus einer belegten Halle eine lebendige Fabrikhalle:
     Wege        Hauptfahrweg (4,5 m, gelbe Randlinien, Fahrtrichtungspfeile), Querwege zwischen den
                 Bereichen, Nebengänge, Gehweg (grün, 1,2 m) mit Schutzgeländer und Fußgängerüberwegen
     Leitlinien  FTS-Leitlinie mit Stichstrecken zu den Bereichen, Haltepunkten und Ladestation
     Förderer    Rollenbahnen von den Bereichen zum Übergabeplatz am Gehweg (mit bewegten Behältern)
     Halle       Stützenraster mit Anfahrschutz, Hallenleuchten, Brückenkran (hohe Hallen) bzw.
                 Elektrohängebahn über dem Fahrweg, Sektionaltore, Flächenmarkierung der Bereiche
     Ausstattung Verkehrsspiegel, Fluchtwegschilder, Feuerlöscher, Erste Hilfe, Abfalltrennung,
                 Teamtafel, Pausenzone, Bereitstellplätze, Leerpaletten
     Leben       Gabelstapler, Routenzüge, FTS, Werker mit Behältern und Kommissionierwagen bewegen sich
                 auf ihren Wegen (Abstand zum Vordermann wird gehalten), Kran und Hängebahn fahren
   Grundlage: ASR A1.8 (Verkehrswege), ASR A1.3 (Sicherheitskennzeichnung: gelbe Fahrwegbegrenzung,
   grüne Rettungs-/Gehwege), VDI 2510 (FTS), DIN EN 15095/VDI 3576 (Krane, Hängebahnen).
   Daten: prj.intralogistik = [{ id, part, floor, kind, pts (lokal), w, … }]; Ausstattungsobjekte tragen ha: true.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE, mergeGeometries } = window.THREEX;
if (HSS.EDITION !== 'fabrik') return;

const CELL = 0.5;
const ST = (() => { try { return JSON.parse(localStorage.getItem('hss-hallenleben') || '{}'); } catch (e) { return {}; } })();
const OPT = HSS.hallenOpt = { leben: ST.leben !== false, decke: ST.decke !== false };
const saveOpt = () => { try { localStorage.setItem('hss-hallenleben', JSON.stringify(OPT)); } catch (e) { /* privat */ } };

/* ---------- Belegungsraster einer Halle ---------- */
const libSize = (o) => o.size || HSS.library.get(o.lib)?.size || { w: 1, d: 1, h: 1 };
const objUV = (F, o, pad = 0) => { const s = libSize(o), r = U.rad((o.rot || 0) - F.ang), hw = (Math.abs(Math.cos(r)) * s.w + Math.abs(Math.sin(r)) * s.d) / 2 + pad, hd = (Math.abs(Math.sin(r)) * s.w + Math.abs(Math.cos(r)) * s.d) / 2 + pad, c = F.toUV(o.x, o.z); return [c[0] - hw, c[0] + hw, c[1] - hd, c[1] + hd]; };
function raster(prj, pt, f, F) {
  const nu = Math.max(1, Math.ceil(F.L / CELL)), nv = Math.max(1, Math.ceil(F.Q0 / CELL)), g = new Uint8Array(nu * nv);
  const mark = (u0, u1, v0, v1, val = 1) => { const i0 = Math.max(0, Math.floor(u0 / CELL)), i1 = Math.min(nu - 1, Math.ceil(u1 / CELL) - 1), j0 = Math.max(0, Math.floor(v0 / CELL)), j1 = Math.min(nv - 1, Math.ceil(v1 / CELL) - 1); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (g[j * nu + i] < val) g[j * nu + i] = val; };
  for (const o of prj.objects) { if (o.ha || !o.host || o.host.part !== pt.id || o.host.floor !== f) continue; const d = HSS.library.get(o.lib); if (!d || d.anchor === 'decke') continue; const b = objUV(F, o, 0.35); mark(b[0], b[1], b[2], b[3]); }
  const I = HSS.interior(pt.id, f, false, prj);
  const mitWand = new Set((I?.walls || []).map(w => w.room)); for (const r of I?.rooms || []) if (!r.noWalls && mitWand.has(r.id)) { const c = F.toUV(r.x, r.z), sw = F.ang ? r.d : r.w, sd = F.ang ? r.w : r.d; mark(c[0] - sw / 2 - 0.4, c[0] + sw / 2 + 0.4, c[1] - sd / 2 - 0.4, c[1] + sd / 2 + 0.4); }
  const free = (u0, u1, v0, v1, wegOk = false) => { const i0 = Math.max(0, Math.floor(u0 / CELL)), i1 = Math.min(nu - 1, Math.ceil(u1 / CELL) - 1), j0 = Math.max(0, Math.floor(v0 / CELL)), j1 = Math.min(nv - 1, Math.ceil(v1 / CELL) - 1); if (u0 < -0.01 || v0 < -0.01 || u1 > F.L + 0.01 || v1 > F.Q0 + 0.01) return false; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = g[j * nu + i]; if (x && !(wegOk && x === 2)) return false; } return true; };
  return { nu, nv, g, mark, free };
}

/* ---------- Ausbau einer Halle berechnen ---------- */
HSS.hallAusbau = (prj, partId, f = 0, o = {}) => {
  const P = HSS.findPart(partId, prj); if (!P || P.building.umgebung) return null;
  const pt = P.part;
  HSS.hallEntfernen(prj, partId, f);
  const F = HSS.prodFrame(pt, true);
  if (F.L < 14 || F.Q0 < 9) return null;
  const h = HSS.fh(pt, f), R = raster(prj, pt, f, F), rep = { wege: 0, objekte: 0 };
  const loc = (u, v) => { const q = F.toLoc(u, v); return [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100]; };
  const E = (kind, ptsUV, extra = {}) => { const e = Object.assign({ id: U.uid('il'), part: pt.id, floor: f, kind, pts: ptsUV.map(([u, v]) => loc(u, v)) }, extra); (prj.intralogistik = prj.intralogistik || []).push(e); rep.wege++; return e; };
  const put = (lib, u, v, rotUV = 0, extra = {}) => { const q = loc(u, v), ob = Object.assign({ id: U.uid('obj'), lib, x: q[0], z: q[1], rot: ((rotUV + F.ang) % 360 + 360) % 360, host: { part: pt.id, floor: f }, auto: true, ha: true }, extra); prj.objects.push(ob); rep.objekte++; const b = objUV(F, ob, 0.2); R.mark(b[0], b[1], b[2], b[3], 3); return ob; };
  const placeFree = (lib, cands, rotUV = 0, pad = 0.3) => { const s = HSS.library.get(lib)?.size; if (!s) return null; const sw = rotUV % 180 ? s.d : s.w, sd = rotUV % 180 ? s.w : s.d; for (const [u, v] of cands) if (R.free(u - sw / 2 - pad, u + sw / 2 + pad, v - sd / 2 - pad, v + sd / 2 + pad)) return put(lib, u, v, rotUV); return null; };

  // 1 · Hauptfahrweg und Gehweg (reserviertes Band) oder bester freier Längsstreifen
  const B = HSS.HALLE_BAND; let main = null, geh = null;
  if (F.Q0 >= B.abBreite && R.free(0, F.L, B.fahrweg[0], B.gehweg[1] - 0.1)) { main = { v: (B.fahrweg[0] + B.fahrweg[1]) / 2, w: B.fahrweg[1] - B.fahrweg[0], u0: 0.4, u1: F.L - 0.4 }; geh = { v: (B.gehweg[0] + B.gehweg[1]) / 2 + 0.05, w: 1.2, u0: 0.6, u1: F.L - 0.6 }; }
  else {
    for (const [W, anteil] of [[F.Q0 >= 14 ? 3.6 : 3.0, 0.5], [3.0, 0.35], [2.6, 0.3]]) {
      let best = null;
      for (let v = 0.2; v + W <= F.Q0 - 0.2; v += CELL) { let run = 0, a = 0; for (let u = 0; u + CELL <= F.L; u += CELL) { if (R.free(u, u + CELL, v, v + W)) { if (!run) a = u; run += CELL; if (!best || run > best.len) best = { v: v + W / 2, len: run, u0: a, u1: a + run }; } else run = 0; } }
      if (best && best.len >= Math.max(12, F.L * anteil)) { main = { v: best.v, w: W, u0: best.u0 + 0.3, u1: best.u1 - 0.3 }; break; }
    }
    if (main) { for (const s of [1, -1]) { const gv = main.v + s * (main.w / 2 + 0.75); if (R.free(main.u0, main.u1, gv - 0.6, gv + 0.6)) { geh = { v: gv, w: 1.2, u0: main.u0 + 0.3, u1: main.u1 - 0.3, s }; break; } } }
  }
  if (!main) { // voll belegte Halle: wenigstens Tragwerk, Kran bzw. Hängebahn und Deckenebene
    const st = []; for (let u = 0.25; u <= F.L - 0.2; u += F.L > 60 ? 12 : 6) for (const v of [0.25, F.Q0 - 0.25]) st.push([u, v]);
    E('stuetzen', st, { h }); if (h >= 8.5) E('kran', [[1.5, 0.35], [F.L - 1.5, F.Q0 - 0.35]], { h, y: h - 1.6 });
    E('halle', [], { h, L: F.L, Q: F.Q0, verkehr: [], main: null, geh: null, quer: [], seite: 1, ang: F.ang });
    return rep;
  }
  const gehSeite = geh ? Math.sign(geh.v - main.v) : 1, farV = gehSeite > 0 ? F.Q0 : 0;
  R.mark(main.u0, main.u1, main.v - main.w / 2, main.v + main.w / 2, 2); if (geh) R.mark(geh.u0, geh.u1, geh.v - geh.w / 2 - 0.15, geh.v + geh.w / 2 + 0.15, 2);
  E('fahrweg', [[main.u0, main.v], [main.u1, main.v]], { w: main.w, haupt: true });
  if (geh) E('gehweg', [[geh.u0, geh.v], [geh.u1, geh.v]], { w: geh.w });
  // 2 · Querwege: freie Streifen quer zur Halle, vom Gehweg aus in die Bereiche
  const vStart = geh ? geh.v + gehSeite * (geh.w / 2 + 0.2) : main.v + gehSeite * (main.w / 2), QW = 3.2, quer = [];
  const cand = [];
  for (let u = 3; u + QW <= F.L - 3; u += CELL) { let len = 0; for (let k = 0; k < 200; k++) { const a = vStart + gehSeite * k * CELL, b = a + gehSeite * CELL; if (Math.min(a, b) < 0 || Math.max(a, b) > F.Q0 || !R.free(u, u + QW, Math.min(a, b), Math.max(a, b), k < 3)) break; len += CELL; } if (len >= 7) cand.push({ u: u + QW / 2, len }); }
  cand.sort((a, b) => b.len - a.len || a.u - b.u);
  for (const c of cand) { if (quer.length >= Math.max(1, Math.floor(F.L / 14))) break; if (quer.some(q => Math.abs(q.u - c.u) < 11)) continue; quer.push(c); }
  quer.sort((a, b) => a.u - b.u);
  for (const q of quer) { const v0 = main.v + gehSeite * main.w / 2, v1 = vStart + gehSeite * (q.len - 0.3); R.mark(q.u - QW / 2, q.u + QW / 2, Math.min(v0, v1), Math.max(v0, v1), 2); q.v1 = v1; E('fahrweg', [[q.u, v0], [q.u, v1]], { w: QW }); }
  // 3 · Nebengänge längs (zwischen Bereichen), Breite 2,4 m
  const NW = 2.4, neben = [];
  for (let pass = 0; pass < 2; pass++) {
    let best = null;
    for (let v = 0.4; v + NW <= F.Q0 - 0.4; v += CELL) { if (Math.abs(v + NW / 2 - main.v) < 7) continue; let run = 0, a = 0; for (let u = 0; u + CELL <= F.L; u += CELL) { if (R.free(u, u + CELL, v, v + NW)) { if (!run) a = u; run += CELL; if (run >= 14 && (!best || run > best.len)) best = { v: v + NW / 2, len: run, u0: a, u1: a + run }; } else run = 0; } }
    if (!best) break; neben.push(best); R.mark(best.u0, best.u1, best.v - NW / 2, best.v + NW / 2, 2); E('nebengang', [[best.u0 + 0.3, best.v], [best.u1 - 0.3, best.v]], { w: NW });
  }
  // 4 · FTS-Leitlinie: Mitte des Hauptfahrwegs, Stichstrecken in die Querwege, Ladestation am Anfang
  const fts = [[main.u0 + 2.5, main.v], [main.u1 - 2.5, main.v]], stiche = quer.filter(q => Math.abs(q.v1 - vStart) > 5).map(q => [[q.u, main.v], [q.u, q.v1 - gehSeite * 1.2]]);
  E('fts', fts, { stiche: stiche.map(st => st.map(([u, v]) => loc(u, v))) });
  { const v = main.v - gehSeite * (main.w / 2 + 0.7); if (R.free(main.u0 + 1.5, main.u0 + 3.5, Math.min(v, v - gehSeite) - 0.3, Math.max(v, v - gehSeite) + 0.3)) put('ha.fts.ladestation', main.u0 + 2.5, v, gehSeite > 0 ? 0 : 180); }
  // 5 · Rollenbahnen: je Bereich eine Strecke vom Bereich zum Übergabeplatz am Gehweg
  const bereiche = (prj.produktion || []).filter(e => e.part === pt.id && e.floor === f);
  for (const e of bereiche) {
    const um = (e.u0 + e.u1) / 2; let done = false;
    for (let k = 0; k < 40 && !done; k++) {
      const u = um + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.5; if (u - 0.7 < e.u0 || u + 0.7 > e.u1) continue;
      for (const len of [9, 7, 5.5]) { const a = vStart + gehSeite * 0.5, b = a + gehSeite * len; if (R.free(u - 0.7, u + 0.7, Math.min(a, b), Math.max(a, b))) { R.mark(u - 0.7, u + 0.7, Math.min(a, b), Math.max(a, b), 2); E('rollenbahn', [[u, b], [u, a]], { w: 1.0, name: e.name }); done = true; break; } }
    }
  }
  // 6 · Halle: Stützen, Tore, Kran bzw. Hängebahn
  const raster6 = F.L > 60 ? 12 : 6, st = [];
  for (let u = 0.25; u <= F.L - 0.2; u += raster6) for (const v of [0.25, F.Q0 - 0.25]) st.push([u, v]);
  if (F.Q0 > 34) { const vm = F.Q0 / 2 + (gehSeite > 0 ? 3 : -3); for (let u = raster6; u <= F.L - raster6 + 0.1; u += raster6) if (R.free(u - 0.6, u + 0.6, vm - 0.6, vm + 0.6)) { st.push([u, vm]); R.mark(u - 0.4, u + 0.4, vm - 0.4, vm + 0.4, 3); } }
  E('stuetzen', st, { h });
  for (const u of [0, F.L]) put('fab.rolltor', u, main.v, u ? 270 : 90);
  if (h >= 8.5) E('kran', [[1.5, 0.35], [F.L - 1.5, F.Q0 - 0.35]], { h, y: h - 1.6 });
  else if (h >= 5.5 && F.L >= 30) E('ehb', [[main.u0 + 3, main.v - main.w / 2 + 0.9], [main.u1 - 3, main.v + main.w / 2 - 0.9]], { y: h - 0.7 });
  // 7 · Ausstattung entlang des Gehwegs und an den Kreuzungen
  const seiteV = d => vStart + gehSeite * d;
  for (const q of quer) {
    placeFree('ha.spiegel', [[q.u - QW / 2 - 0.5, seiteV(0.5)], [q.u + QW / 2 + 0.5, seiteV(0.5)]], gehSeite > 0 ? 180 : 0, 0.05);
  }
  const alongCands = (step, d, off = 0) => { const c = []; for (let u = 4 + off; u < F.L - 4; u += step) for (let k = 0; k < 8; k++) c.push([u + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 1.2, seiteV(d)]); return c; };
  for (let u = 6; u < F.L - 4; u += 26) placeFree('ha.fluchtweg', alongCands(1000, 0.4).map(([a, v]) => [a - 4 + u, v]).filter(c => c[0] > 2), gehSeite > 0 ? 180 : 0, 0.05);
  const einmal = (lib, d, ref) => placeFree(lib, alongCands(9, d).sort((a, b) => Math.abs(a[0] - ref) - Math.abs(b[0] - ref)), gehSeite > 0 ? 180 : 0);
  einmal('ha.erstehilfe', 0.45, F.L * 0.3); einmal('ha.teamtafel', 0.6, F.L * 0.55); einmal('ha.abfall', 0.9, F.L * 0.75);
  if (F.L > 50) { einmal('ha.pausenzone', 1.3, F.L * 0.15); einmal('ha.abfall', 0.9, F.L * 0.2); einmal('ha.spinde', 0.6, F.L * 0.9); einmal('ha.wasserspender', 0.5, F.L * 0.4); }
  // Bereitstellplätze (weiß umrandet) und Leerpaletten an den Bereichen
  let nb = 0; for (const c of alongCands(5.5, 1.0, 2)) { if (nb >= Math.max(2, Math.floor(F.L / 12))) break; if (placeFree(nb % 3 === 2 ? 'ha.palettenstapel' : 'ha.bereitstellung', [c], 0, 0.25)) nb++; }
  // Bereitstell- und Pufferzonen: freie Flächen an Wegen mit Paletten, Gitterboxen, KLT-Wagen (weiß umrandet)
  const nahWeg = (u0, u1, v0, v1) => { const i0 = Math.max(0, Math.floor(u0 / CELL) - 4), i1 = Math.min(R.nu - 1, Math.ceil(u1 / CELL) + 4), j0 = Math.max(0, Math.floor(v0 / CELL) - 4), j1 = Math.min(R.nv - 1, Math.ceil(v1 / CELL) + 4); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (R.g[j * R.nu + i] === 2) return true; return false; };
  const ZW = 7.2, ZD = 4.4, zonen = [], maxZ = Math.max(2, Math.round(F.L * F.Q0 / 420));
  const MIX = [['ha.bereitstellung', 'fab.gitterbox', 'ha.bereitstellung', 'fab.gitterbox', 'ha.palettenstapel', 'ha.bereitstellung'], ['fab.gitterbox', 'fab.gitterbox', 'fab.gitterbox', 'fab.gitterbox', 'fab.gitterbox', 'fab.gitterbox'], ['ha.bereitstellung', 'ha.bereitstellung', 'ha.bereitstellung', 'ha.bereitstellung', 'ha.palettenstapel', 'ha.palettenstapel']];
  for (let v = 0.6; v + ZD < F.Q0 - 0.4 && zonen.length < maxZ; v += 1.0) for (let u = 1.0; u + ZW < F.L - 0.6 && zonen.length < maxZ; u += 1.0) {
    if (!R.free(u - 0.4, u + ZW + 0.4, v - 0.4, v + ZD + 0.4) || !nahWeg(u, u + ZW, v, v + ZD)) continue;
    const mix = MIX[zonen.length % MIX.length]; let k = 0;
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const lib = mix[k++]; const ob = { id: U.uid('obj'), lib, rot: F.ang, host: { part: pt.id, floor: f }, auto: true, ha: true }; const q = loc(u + 1.2 + c * 2.4, v + 1.1 + r * 2.2); ob.x = q[0]; ob.z = q[1]; prj.objects.push(ob); rep.objekte++; }
    if (zonen.length % 2 === 0) { const q = loc(u + ZW / 2, v + ZD / 2); void q; }
    R.mark(u - 0.3, u + ZW + 0.3, v - 0.3, v + ZD + 0.3, 3); zonen.push([u, v]);
    E('zone', [[u, v], [u + ZW, v + ZD]], {});
  }
  // Feuerlöscher an jeder zweiten Wandstütze
  st.filter((s, i) => i % 4 === 0 && (s[1] < 1 || s[1] > F.Q0 - 1)).forEach(([u, v]) => { if (R.free(u + 0.3, u + 0.8, Math.min(v, F.Q0 - 0.6), Math.min(v + 0.4, F.Q0))) put('fab.feuerloescher', u + 0.55, v < 1 ? 0.35 : F.Q0 - 0.35, v < 1 ? 0 : 180); });
  // Hallenkennung für die Animation (Fahrzeugmix aus den Materialflüssen der Halle)
  const rooms = new Set(Object.values(prj.interiors[pt.id] || {}).flatMap(I => I.rooms).map(r => r.id)), tr = new Set();
  for (const fl of prj.flows || []) if (rooms.has(fl.von) || rooms.has(fl.nach)) tr.add(fl.transport);
  E('halle', [], { h, L: F.L, Q: F.Q0, verkehr: [...tr], main: { v: main.v, w: main.w, u0: main.u0, u1: main.u1 }, geh: geh ? { v: geh.v, u0: geh.u0, u1: geh.u1 } : null, quer: quer.map(q => ({ u: q.u, v1: q.v1 })), seite: gehSeite, ang: F.ang });
  return rep;
};
HSS.hallEntfernen = (prj, partId, f = 0) => {
  prj.intralogistik = (prj.intralogistik || []).filter(e => !(e.part === partId && e.floor === f));
  prj.objects = prj.objects.filter(o => !(o.ha && o.host?.part === partId && o.host.floor === f));
};
// Hallen eines Projekts: Bauteile mit Produktionsbereichen oder großen eingeschossigen Hallen
HSS.hallenListe = (prj = HSS.project()) => HSS.allParts(prj).filter(pt => { const P = HSS.findPart(pt.id, prj); if (P.building.umgebung || pt.use === 'tank') return false; return (prj.produktion || []).some(e => e.part === pt.id) || (HSS.partArea(pt) > 600 && (pt.floors || 1) <= 2 && HSS.fh(pt, 0) >= 5); });
HSS.alleHallenAusbauen = (prj) => { let n = 0; for (const pt of HSS.hallenListe(prj)) if (HSS.hallAusbau(prj, pt.id, 0)) n++; return n; };
// Nach jedem neuen Produktionsbereich: Ausbau der Halle neu berechnen
{ const gen0 = HSS.prodGenerate; HSS.prodGenerate = (prj, inp, calc, o = {}) => { const had = (prj.intralogistik || []).some(e => e.part === inp.part && e.floor === (inp.floor ?? 0)); if (inp.part) HSS.hallEntfernen(prj, inp.part, inp.floor ?? 0); const r = gen0(prj, inp, calc, o); if (inp.part && o.ausbau !== false && (had || o.ausbau)) HSS.hallAusbau(prj, inp.part, inp.floor ?? 0); return r; }; }

/* =====================================================================
   Darstellung: Bodenmarkierungen, Förderer, Stützen, Kran, Hängebahn, Leuchten
   ===================================================================== */
const S3 = HSS.s3, V = HSS.view;
const MAT = {};
// Deckenebene (Kran, Hängebahn, Leuchten, Stützen in voller Höhe) nur bei „Wände voll“, Begehung oder Gesamtansicht –
// im Etagenschnitt würde sie über dem Grundriss schweben und den Blick auf die Halle verstellen
const decke = () => OPT.decke && (V.cut === 'voll' || S3.fpvActive || V.floor === null);
const mat = (k, c, o = {}) => MAT[k] || (MAT[k] = (() => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75, metalness: 0.05 }, o)); return m; })());
// Bodenfarben: Markierungen mit Tiefenversatz (zusätzlich zum Höhenabstand) – kein Flimmern
const floorMat = (k, c, lvl) => mat('fl' + k, c, { roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 - lvl * 2, polygonOffsetUnits: -4 - lvl * 4 });
const Y = { weg: 0.034, geh: 0.036, linie: 0.040, fts: 0.043 }; // Bodenplatte der Räume endet bei +0,025 m
const quad = (out, a, b, w, y) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.01) return; const g = new THREE.PlaneGeometry(l, w); g.rotateX(-Math.PI / 2); g.rotateY(-Math.atan2(dz, dx)); g.translate((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2); out.push(g); };
const boxG = (out, x, y, z, w, h, d, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); out.push(g); };
const segOff = (a, b, off) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l; return [[a[0] + nx * off, a[1] + nz * off], [b[0] + nx * off, b[1] + nz * off]]; };
const dashed = (out, a, b, w, y, dash = 1.0, gap = 0.6) => { const L = G.dist(a, b); for (let s = 0; s < L; s += dash + gap) { const t0 = s / L, t1 = Math.min(1, (s + dash) / L); quad(out, [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1], w, y); } };
const pfeil = (out, p, dir, y, s = 1) => { const sh = new THREE.Shape([[0, 0.9], [0.55, 0.15], [0.2, 0.15], [0.2, -0.9], [-0.2, -0.9], [-0.2, 0.15], [-0.55, 0.15]].map(([x, z]) => new THREE.Vector2(x * s, z * s))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.rotateY(Math.atan2(dir[0], dir[1]) + Math.PI); g.translate(p[0], y, p[1]); out.push(g); };
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mesh = (geos, m, grp, shadow = false) => { if (!geos.length) return; const me = new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g).map(g => { if (g.attributes.uv) g.deleteAttribute('uv'); return g; }), false), m); me.receiveShadow = true; me.castShadow = shadow; me.userData = { kind: 'intra' }; grp.add(me); };

function buildHalle(pt, f, entries, prj) {
  const grp = new THREE.Group(), local = new THREE.Group(); grp.add(local);
  const gf = HSS.globalFloor(pt, f, prj), y0 = HSS.floorY(pt, f, prj) + gf * (V.explode || 0);
  local.position.set(pt.x, y0, pt.z); local.rotation.y = -U.rad(pt.rot || 0);
  const g = { weg2: [], weg: [], gelb: [], weiss: [], gruen: [], fts: [], gelaender: [], stahl: [], schwarz: [], rolle: [], blau: [], kran: [], led: [], grau: [] };
  const halle = entries.find(e => e.kind === 'halle'), H = halle?.h || HSS.fh(pt, f);
  const quer = entries.filter(e => e.kind === 'fahrweg' && !e.haupt), geh = entries.find(e => e.kind === 'gehweg');
  for (const e of entries) {
    const [a, b] = e.pts;
    if (e.kind === 'fahrweg') {
      quad(g.weg, a, b, e.w, Y.weg);
      for (const s of [-1, 1]) { const [p, q] = segOff(a, b, s * (e.w / 2 - 0.06)); quad(g.gelb, p, q, 0.12, Y.linie); }
      const L = G.dist(a, b), dir = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
      if (e.haupt) { for (let s = 8; s < L - 4; s += 16) { const [p] = segOff(lerp(a, b, s / L), b, e.w * 0.25); const [q] = segOff(lerp(a, b, (s + 8) / L), b, -e.w * 0.25); pfeil(g.weiss, p, dir, Y.linie, 0.9); pfeil(g.weiss, q, [-dir[0], -dir[1]], Y.linie, 0.9); } dashed(g.weiss, a, b, 0.1, Y.linie, 2.0, 2.0); }
    } else if (e.kind === 'nebengang') {
      quad(g.weg2, a, b, e.w, Y.weg);
      for (const s of [-1, 1]) { const [p, q] = segOff(a, b, s * (e.w / 2 - 0.05)); dashed(g.gelb, p, q, 0.1, Y.linie, 1.2, 0.5); }
    } else if (e.kind === 'gehweg') {
      // grüner Gehweg, an Querwegen unterbrochen und als Überweg (Zebrastreifen) markiert
      const L = G.dist(a, b), cuts = quer.map(q => { const c = q.pts[0]; const t = ((c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1])) / (L * L); return [t * L - q.w / 2, t * L + q.w / 2]; }).filter(c => c[1] > 0 && c[0] < L).sort((x, y) => x[0] - y[0]);
      let s0 = 0; const seg = (s, t) => { if (t - s < 0.2) return; const p = lerp(a, b, s / L), q = lerp(a, b, t / L); quad(g.gruen, p, q, e.w, Y.geh); for (const sd of [-1, 1]) { const [pp, qq] = segOff(p, q, sd * (e.w / 2 + 0.08)); quad(g.weiss, pp, qq, 0.1, Y.linie); } for (let k = s + 3; k < t - 1; k += 9) { const c = lerp(a, b, k / L); fussweg(g.weiss, c, [(b[0] - a[0]) / L, (b[1] - a[1]) / L], Y.linie); } };
      for (const c of cuts) { seg(s0, c[0]); for (let k = c[0] + 0.25; k < c[1] - 0.2; k += 0.6) { const p = lerp(a, b, k / L), q = lerp(a, b, Math.min(c[1], k + 0.35) / L); quad(g.weiss, p, q, e.w + 0.3, Y.linie); } s0 = c[1]; }
      seg(s0, L);
      // Schutzgeländer zwischen Fahrweg und Gehweg (mit Lücken an den Überwegen)
      const side = halle ? -halle.seite : -1, [ga, gb] = segOff(a, b, side * (e.w / 2 + 0.25));
      let r0 = 1.0; const rail = (s, t) => { if (t - s < 1.5) return; const p = lerp(ga, gb, s / L), q = lerp(ga, gb, t / L), n = Math.max(1, Math.round((t - s) / 2)); for (let i = 0; i <= n; i++) { const c = lerp(p, q, i / n); boxG(g.gelaender, c[0], 0.55, c[1], 0.08, 1.1, 0.08); } const ang = -Math.atan2(q[1] - p[1], q[0] - p[0]), m = lerp(p, q, 0.5), l = G.dist(p, q); boxG(g.gelaender, m[0], 1.05, m[1], l, 0.08, 0.06, ang); boxG(g.gelaender, m[0], 0.55, m[1], l, 0.06, 0.05, ang); boxG(g.schwarz, m[0], 0.2, m[1], l, 0.12, 0.04, ang); };
      for (const c of cuts) { rail(r0, c[0] - 0.4); r0 = c[1] + 0.4; } rail(r0, L - 1.0);
    } else if (e.kind === 'fts') {
      ftsLinie(g.fts, a, b, Y.fts);
      for (const [p, q] of e.stiche || []) { ftsLinie(g.fts, p, q, Y.fts); const L = G.dist(p, q), d = [(q[0] - p[0]) / L, (q[1] - p[1]) / L]; quad(g.weiss, lerp(p, q, (L - 0.4) / L), lerp(p, q, (L - 0.2) / L), 1.0, Y.fts + 0.001); quad(g.weiss, lerp(p, q, (L - 2.2) / L), lerp(p, q, (L - 2.0) / L), 1.0, Y.fts + 0.001); pfeil(g.fts, lerp(p, q, 0.45), d, Y.fts, 0.45); }
      const L = G.dist(a, b); for (let s = 5; s < L; s += 10) pfeil(g.fts, lerp(a, b, s / L), [(b[0] - a[0]) / L, (b[1] - a[1]) / L], Y.fts, 0.4);
    } else if (e.kind === 'rollenbahn') {
      const L = G.dist(a, b), ang = -Math.atan2(b[1] - a[1], b[0] - a[0]), m = lerp(a, b, 0.5), hb = 0.75, w = e.w;
      for (const s of [-1, 1]) { const [p, q] = segOff(a, b, s * w / 2); const mm = lerp(p, q, 0.5); boxG(g.blau, mm[0], hb - 0.06, mm[1], L, 0.12, 0.05, ang); }
      for (let s = 0.05; s < L; s += 0.12) { const c = lerp(a, b, s / L); const cg = new THREE.CylinderGeometry(0.03, 0.03, w - 0.06, 8); cg.rotateX(Math.PI / 2); cg.rotateY(ang); cg.translate(c[0], hb - 0.01, c[1]); g.rolle.push(cg); }
      for (let s = 0.3; s < L; s += 1.5) { const c = lerp(a, b, Math.min(s, L - 0.3) / L); for (const sd of [-1, 1]) { const [p] = segOff(c, b, sd * (w / 2 - 0.03)); boxG(g.stahl, p[0], (hb - 0.12) / 2, p[1], 0.05, hb - 0.12, 0.05); } }
      const st = lerp(a, b, (L - 0.1) / L); boxG(g.gelb, st[0], hb + 0.08, st[1], 0.05, 0.16, w, ang);
      const mo = lerp(a, b, 0.35 / L); boxG(g.blau, mo[0], hb - 0.3, mo[1], 0.3, 0.22, 0.22, ang);
      // Übergabeplatz am Gehweg (weißer Rahmen)
      rahmen(g.weiss, lerp(a, b, 1 + 0.9 / L), 1.6, 1.4, ang, Y.linie);
    } else if (e.kind === 'zone') {
      const [p, q] = e.pts, c = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], w = Math.abs(q[0] - p[0]), d = Math.abs(q[1] - p[1]);
      rahmen(g.weiss, c, w, d, 0, Y.linie); rahmen(g.weiss, c, w - 0.25, d - 0.25, 0, Y.linie);
    } else if (e.kind === 'stuetzen') {
      const Hs = decke() ? H : V.cut === 'aus' ? 0.15 : 2.6; for (const [x, z] of e.pts) { boxG(g.stahl, x, Hs / 2, z, 0.03, Hs, 0.4); boxG(g.stahl, x, Hs / 2, z - 0.18, 0.4, Hs, 0.03); boxG(g.stahl, x, Hs / 2, z + 0.18, 0.4, Hs, 0.03); boxG(g.schwarz, x, Hs + 0.01, z, 0.42, 0.02, 0.42);
        for (let k = 0; k < 6; k++) boxG(k % 2 ? g.schwarz : g.gelb, x, 0.1 + k * 0.2, z, 0.56, 0.2, 0.56); }
    } else if (e.kind === 'kran' && decke()) {
      // Brückenkran: wird in kranBauen() als bewegliche Gruppe aufgebaut
    } else if (e.kind === 'ehb' && decke()) {
      const c = ehbRing(e); for (let i = 0; i < c.length; i++) { const A = c[i], Bq = c[(i + 1) % c.length], l = G.dist(A, Bq), m = lerp(A, Bq, 0.5), an = -Math.atan2(Bq[1] - A[1], Bq[0] - A[0]); boxG(g.kran, m[0], e.y, m[1], l, 0.2, 0.12, an); boxG(g.kran, m[0], e.y + 0.11, m[1], l, 0.03, 0.22, an); for (let s = 0; s < l; s += 4) { const h2 = lerp(A, Bq, s / l); boxG(g.stahl, h2[0], (e.y + H) / 2, h2[1], 0.05, H - e.y, 0.05); } }
    }
  }
  // Flächenmarkierung der Produktionsbereiche (gelb gestrichelt) und Bereitstellplätze (weiß)
  for (const r of HSS.interior(pt.id, f, false, prj)?.rooms || []) if (r.prod) { const x0 = r.x - r.w / 2 + 0.1, x1 = r.x + r.w / 2 - 0.1, z0 = r.z - r.d / 2 + 0.1, z1 = r.z + r.d / 2 - 0.1; for (const [p, q] of [[[x0, z0], [x1, z0]], [[x1, z0], [x1, z1]], [[x1, z1], [x0, z1]], [[x0, z1], [x0, z0]]]) dashed(g.gelb, p, q, 0.08, Y.linie - 0.002, 0.8, 0.4); }
  for (const o of prj.objects) if (o.ha && o.host?.part === pt.id && o.host.floor === f && (o.lib === 'ha.bereitstellung' || o.lib === 'ha.palettenstapel')) rahmen(g.weiss, [o.x, o.z], 1.6, 1.2, -U.rad(o.rot || 0), Y.linie);
  // Hallenleuchten (Deckenebene)
  if (decke() && halle) { const F = HSS.prodFrame(pt, true); for (let u = 3; u < F.L - 1; u += 7.5) for (let v = 3; v < F.Q0 - 1; v += 8) { const c = F.toLoc(u, v); const yl = H - 1.4; boxG(g.grau, c[0], yl + 0.04, c[1], F.ang ? 0.34 : 1.2, 0.08, F.ang ? 1.2 : 0.34); boxG(g.led, c[0], yl - 0.006, c[1], F.ang ? 0.28 : 1.12, 0.01, F.ang ? 1.12 : 0.28); boxG(g.stahl, c[0], (yl + H) / 2, c[1], 0.012, H - yl, 0.012); } }
  mesh(g.weg, floorMat('weg', '#868f97', 0), local); mesh(g.weg2, floorMat('weg2', '#b3bac1', 0), local); mesh(g.gruen, floorMat('gruen', '#3e9e6b', 1), local);
  mesh(g.gelb, floorMat('gelb', '#f2c230', 2), local); mesh(g.weiss, floorMat('weiss', '#f4f6f8', 2), local); mesh(g.fts, floorMat('fts', '#1d4f91', 3), local);
  mesh(g.gelaender, mat('gel', '#f2c230', { roughness: 0.5 }), local, true); mesh(g.schwarz, mat('schw', '#24282d'), local); mesh(g.stahl, mat('stahl', '#6c7782', { metalness: 0.4, roughness: 0.5 }), local, true);
  mesh(g.blau, mat('blau', '#2d6fa3', { roughness: 0.5 }), local, true); mesh(g.rolle, mat('rolle', '#b8bec6', { metalness: 0.6, roughness: 0.3 }), local); mesh(g.kran, mat('kran', '#e8b923', { roughness: 0.5 }), local, true);
  mesh(g.grau, mat('lgrau', '#c3c9d0'), local); mesh(g.led, mat('led', '#fffbe8', { emissive: '#fff4d6', emissiveIntensity: 0.9 }), local);
  return { grp, local, y0 };
}
function fussweg(out, c, dir, y) { // Fußgänger-Piktogramm (zwei Fußabdrücke)
  const n = [-dir[1], dir[0]];
  for (const [s, k] of [[-1, 0], [1, 0.35]]) { const p = [c[0] + n[0] * s * 0.12 + dir[0] * k, c[1] + n[1] * s * 0.12 + dir[1] * k]; quad(out, [p[0] - dir[0] * 0.13, p[1] - dir[1] * 0.13], [p[0] + dir[0] * 0.13, p[1] + dir[1] * 0.13], 0.11, y); }
}
function ftsLinie(out, a, b, y) { quad(out, a, b, 0.07, y); const L = G.dist(a, b); for (let s = 0; s < L; s += 2) { const c = lerp(a, b, s / L); const [p, q] = segOff(c, b, 0); quad(out, segOff(p, q, -0.12)[0], segOff(p, q, 0.12)[0], 0.03, y); } }
function rahmen(out, c, w, d, ang, y) { const ca = Math.cos(ang), sa = Math.sin(ang), P = (x, z) => [c[0] + x * ca + z * sa, c[1] - x * sa + z * ca]; const k = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)]; for (let i = 0; i < 4; i++) quad(out, k[i], k[(i + 1) % 4], 0.07, y); }
// Lokale Ecken der Halle aus dem Rahmen (u entlang, v quer)
const frameOf = (pt) => HSS.prodFrame(pt, true);
function ehbRing(e) { const [p, q] = e.pts; return [[p[0], p[1]], [q[0], p[1]], [q[0], q[1]], [p[0], q[1]]]; }

/* ---------- Szene: statische Teile und bewegte Hallenwelt ---------- */
const ROOT = new THREE.Group(); ROOT.name = 'hallenausbau';
const LEBEN = new THREE.Group(); LEBEN.name = 'hallenleben';
const HL = HSS.hallenleben = { agents: [], halls: [], active: () => OPT.leben && LEBEN.visible && HL.agents.some(a => a.obj.visible), opt: OPT };
let cache = new Map(), lastKey = '';
function sichtbar(pt, f, prj) { const gf = HSS.globalFloor(pt, f, prj); return V.floor === gf || (V.floor === null && V.shell === 'transparent'); }

function rebuild() {
  if (!S3.scene) return;
  if (!ROOT.parent) { S3.scene.add(ROOT); S3.scene.add(LEBEN); }
  const prj = HSS.project(), list = prj.intralogistik || [];
  const aus = HSS.gebAus?.hidden(prj);
  const by = new Map(); for (const e of list) { const k = e.part + '@' + e.floor; if (!by.has(k)) by.set(k, []); by.get(k).push(e); }
  const key = [V.floor, V.shell, V.explode, V.cut, decke(), OPT.leben, V.stil].join('|');
  const live = new Set(); ROOT.clear();
  const halls = [];
  for (const [k, entries] of by) {
    const [pid, fs] = k.split('@'), f = +fs, P = HSS.findPart(pid, prj); if (!P || (aus && aus.has(P.building.id))) continue;
    if (!sichtbar(P.part, f, prj)) continue;
    const objs = prj.objects.filter(o => o.ha && o.host?.part === pid && o.host.floor === f && (o.lib === 'ha.bereitstellung' || o.lib === 'ha.palettenstapel')).map(o => [o.x, o.z]);
    const ikey = JSON.stringify([entries, P.part, objs, (HSS.interior(pid, f, false, prj)?.rooms || []).filter(r => r.prod).map(r => [r.x, r.z, r.w, r.d])]) + key;
    let c = cache.get(k); if (!c || c.key !== ikey) { c = { key: ikey, ...buildHalle(P.part, f, entries, prj) }; kranBauen(c, P.part, f, entries); cache.set(k, c); }
    live.add(k); ROOT.add(c.grp); halls.push({ k, pt: P.part, f, entries, c });
  }
  for (const k of [...cache.keys()]) if (!live.has(k) && cache.size > 60) cache.delete(k);
  lastKey = key; agentsAufbauen(halls, prj);
  HSS.perf?.invalidate(3);
}

/* Brückenkran: Bahnträger fest, Brücke + Katze + Haken bewegt */
function kranBauen(c, pt, f, entries) {
  const e = entries.find(x => x.kind === 'kran'); c.kran = null; if (!e || !decke()) return;
  const F = frameOf(pt), y = e.y, M = mat('kran', '#e8b923', { roughness: 0.5 }), D = mat('kranD', '#3b4450', { roughness: 0.6 });
  const along = F.ang === 0, L = F.L, Q = F.Q0;
  const bahn = [];
  for (const v of [0.35, Q - 0.35]) { const a = F.toLoc(0.3, v), b = F.toLoc(L - 0.3, v), m = lerp(a, b, 0.5); const g = new THREE.BoxGeometry(along ? L - 0.6 : 0.4, 0.7, along ? 0.4 : L - 0.6); g.translate(m[0], y - 0.35, m[1]); bahn.push(g); const s2 = new THREE.BoxGeometry(along ? L - 0.6 : 0.08, 0.1, along ? 0.08 : L - 0.6); s2.translate(m[0], y + 0.05, m[1]); bahn.push(s2); }
  const bm = new THREE.Mesh(mergeGeometries(bahn), mat('kranbahn', '#6c7782', { metalness: 0.4, roughness: 0.5 })); c.local.add(bm);
  // bewegliche Brücke (in Hallenachsen aufgebaut)
  const brG = new THREE.Group(); c.local.add(brG);
  const span = Q - 0.7; const gir = (w, h, d, x, yy, z, m) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, yy, z); me.castShadow = true; brG.add(me); return me; };
  for (const s of [-0.55, 0.55]) gir(0.45, 0.9, span, s, y + 0.55, 0, M);
  for (const s of [-span / 2 + 0.2, span / 2 - 0.2]) gir(1.8, 0.5, 0.5, 0, y + 0.3, s, D);
  const katze = new THREE.Group(); brG.add(katze); { const m = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.4), D); m.position.y = y + 1.15; katze.add(m); }
  const seil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1, 0.03), D); katze.add(seil);
  const haken = new THREE.Group(); katze.add(haken); { const hb = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), M); haken.add(hb); const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), D); t.position.y = -0.35; haken.add(t); for (const s of [-0.5, 0.5]) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.0, 0.02), D); k.position.set(s, -0.85, 0); haken.add(k); } }
  brG.rotation.y = along ? 0 : -Math.PI / 2;
  c.kran = { brG, katze, seil, haken, F, y, L, Q, t: Math.random() * 100 };
}

/* ---------- Agenten (Personen, Fahrzeuge, Förderbehälter, Gehänge) ---------- */
let agentKey = '';
function agentsAufbauen(halls, prj) {
  const k = halls.map(h => h.c.key.length + h.k).join(',') + '|' + OPT.leben + V.stil + decke();
  if (k === agentKey) return; agentKey = k;
  LEBEN.clear(); HL.agents = []; HL.halls = halls;
  if (!OPT.leben) return;
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const h of halls) {
    const hal = h.entries.find(e => e.kind === 'halle'); if (!hal) continue;
    const pt = h.pt, F = frameOf(pt), wy = h.c.y0 + 0.025;
    const W = (u, v) => HSS.toWorld(pt, F.toLoc(u, v));
    const add = (lib, path, o = {}) => { const obj = HSS.library.build(lib, null, { noShadow: true }); obj.traverse(m => { if (m.isMesh) m.userData = { kind: 'intra' }; }); HSS.stil?.applyTo?.(obj); LEBEN.add(obj); const L = path.reduce((s, p, i) => i ? s + G.dist(p, path[i - 1]) : 0, 0); const a = Object.assign({ obj, path, L, s: (o.s0 ?? rnd()) * L, v: o.v || 1, dir: 1, wait: 0, y: wy + (o.dy || 0), hall: h.k, pos: W(hal.L / 2, hal.Q / 2), len: HSS.library.get(lib)?.size?.d || 1 }, o); HL.agents.push(a); return a; };
    const m = hal.main, s = hal.seite; if (!m) continue;
    // Fahrzeugschleife im Hauptfahrweg: hin auf der einen, zurück auf der anderen Spur
    const lane = 1.1, u0 = m.u0 + 2.5, u1 = m.u1 - 2.5;
    const loop = [W(u0, m.v - lane), W(u1, m.v - lane), W(u1 + 1.2, m.v), W(u1, m.v + lane), W(u0, m.v + lane), W(u0 - 1.2, m.v), W(u0, m.v - lane)];
    const tr = new Set(hal.verkehr || []), vehicles = [];
    const nSt = Math.max(1, Math.min(3, Math.round((u1 - u0) / 45)));
    for (let i = 0; i < nSt; i++) vehicles.push(['ha.stapler.last', 2.2, i % 2 ? 'ha.stapler.leer' : null]);
    if (tr.has('t_routenzug') || (u1 - u0) > 50) vehicles.push(['ha.routenzug', 1.6]);
    if (tr.has('t_schwer')) vehicles.push(['ha.fts.motor', 0.7]);
    const grp = []; vehicles.forEach(([lib, v, alt], i) => grp.push(add(alt || lib, loop, { v, s0: i / vehicles.length, loop: true, kind: 'fz' })));
    grp.forEach(a => (a.group = grp));
    // FTS auf der Leitlinie (Pendelbetrieb mit Stichfahrten in die Querwege)
    const fts = h.entries.find(e => e.kind === 'fts');
    if (fts && (u1 - u0) > 12) {
      const pts = fts.pts.map(p => HSS.toWorld(pt, p)), stiche = (fts.stiche || []).map(st => st.map(p => HSS.toWorld(pt, p)));
      const n = (u1 - u0) > 70 ? 2 : 1;
      for (let i = 0; i < n; i++) { const a0 = lerp(pts[0], pts[1], i / n), a1 = lerp(pts[0], pts[1], (i + 1) / n); const mine = stiche.filter(st => { const t = G.dist(st[0], pts[0]) / G.dist(pts[0], pts[1]); return t >= i / n - 0.01 && t <= (i + 1) / n + 0.01; }); add('ha.fts.klt', [a0, a1], { v: 1.0, kind: 'fts', stiche: mine, base: [a0, a1], s0: rnd() }); }
    }
    // Personen auf dem Gehweg (rechts gehen) und in den Nebengängen
    if (hal.geh) {
      const g = hal.geh, L = g.u1 - g.u0, n = Math.max(2, Math.min(5, Math.round(L / 25)));
      const libs = ['ha.werker.klt', 'fab.werker', 'ha.werker.wagen', 'fab.staplerfahrer', 'ha.werker.klt'];
      for (let i = 0; i < n; i++) { const dir = i % 2 ? 1 : -1, off = libs[i % libs.length] === 'ha.werker.wagen' ? 0 : dir * 0.3 * s; add(libs[i % libs.length], [W(g.u0 + 0.5, g.v + off), W(g.u1 - 0.5, g.v + off)], { v: 1.1 + rnd() * 0.3, kind: 'person', pendel: true, dir, s0: rnd(), pauseAt: 0.5 }); }
    }
    for (const e of h.entries.filter(x => x.kind === 'nebengang')) { const pts = e.pts.map(p => HSS.toWorld(pt, p)); add(rnd() > 0.5 ? 'fab.werker' : 'ha.werker.klt', pts, { v: 1.2, kind: 'person', pendel: true, s0: rnd() }); }
    for (const q of hal.quer) if (rnd() > 0.45 && Math.abs(q.v1 - m.v) > 8) { const v0 = (hal.geh ? hal.geh.v : m.v) + s * 1.2; add('ha.werker.wagen', [W(q.u - 0.9, v0), W(q.u - 0.9, q.v1 - s * 1.0)], { v: 0.9, kind: 'person', pendel: true, s0: rnd() }); }
    // Behälter auf den Rollenbahnen
    for (const e of h.entries.filter(x => x.kind === 'rollenbahn')) { const pts = e.pts.map(p => HSS.toWorld(pt, p)), L = G.dist(pts[0], pts[1]); const n = Math.max(2, Math.floor(L / 1.8)); for (let i = 0; i < n; i++) add('ha.klt.eins', pts, { v: 0.35, kind: 'band', s0: i / n, dy: 0.76, loop: true }); }
    // Hängebahn-Gehänge
    const ehb = h.entries.find(e => e.kind === 'ehb');
    if (ehb && decke()) { const ring = ehbRing(ehb).map(p => HSS.toWorld(pt, p)); ring.push(ring[0]); for (let i = 0; i < 5; i++) add('ha.ehb.gehaenge', ring, { v: 0.6, kind: 'ehb', s0: i / 5, loop: true, dy: ehb.y - 1.72 - 0.025 }); }
  }
}
// Einzelner KLT für die Rollenbahn
HSS.library.registerPack({ format: 'hss-library', version: 1, name: 'Hallenleben (intern)', objects: [{ id: 'ha.klt.eins', name: 'Kleinladungsträger auf Förderer', category: 'Fabrik/Intralogistik', tags: ['KLT', 'Behälter'], size: { w: 0.6, d: 0.4, h: 0.28 }, parts: [HSS.library.kit.box(0, 0.14, 0, 0.4, 0.28, 0.6, '#2d7694', 'kunststoff', { rr: 0.01 }), HSS.library.kit.box(0, 0.27, 0, 0.34, 0.02, 0.54, '#1f4f66', 'kunststoff')] }] });

const posAt = (path, s) => { let acc = 0; for (let i = 1; i < path.length; i++) { const l = G.dist(path[i - 1], path[i]); if (acc + l >= s || i === path.length - 1) { const t = l ? Math.min(1, Math.max(0, (s - acc) / l)) : 0; return { p: lerp(path[i - 1], path[i], t), d: [(path[i][0] - path[i - 1][0]) / (l || 1), (path[i][1] - path[i - 1][1]) / (l || 1)] }; } acc += l; } return { p: path[0], d: [1, 0] }; };
function update(dt) {
  if (!HL.agents.length || !OPT.leben) return;
  const cam = S3.camera, tgt = S3.controls.target, dist = cam.position.distanceTo(tgt), far = dist > 420;
  LEBEN.visible = !far;
  if (far) return;
  const rad = Math.max(120, dist * 1.3);
  dt = Math.min(dt, 0.1);
  for (const a of HL.agents) {
    const near = Math.hypot(a.pos[0] - tgt.x, a.pos[1] - tgt.z) < rad + 80; a.obj.visible = near; if (!near) continue;
    if (a.wait > 0) a.wait -= dt;
    else if (a.kind === 'fts') ftsStep(a, dt);
    else {
      let v = a.v;
      if (a.group) { // Abstand zum Vordermann halten
        for (const b of a.group) { if (b === a) continue; const gap = ((b.s - a.s) % a.L + a.L) % a.L - (b.len + a.len) / 2; if (gap > 0 && gap < 2.5) { v = Math.min(v, Math.max(0, b.wait > 0 ? 0 : b.v * (gap - 0.8) / 1.7)); } }
      }
      a.s += v * dt * a.dir;
      if (a.loop) { if (a.s >= a.L) a.s -= a.L; }
      else if (a.pendel) { if (a.s >= a.L) { a.s = a.L; a.dir = -1; a.wait = 1.5 + Math.random() * 3; } if (a.s <= 0) { a.s = 0; a.dir = 1; a.wait = 1.5 + Math.random() * 3; } }
      a.moving = v > 0.05 && a.wait <= 0;
    }
    const q = a.cur || posAt(a.path, a.s); a.cur = null;
    a.pos = q.p;
    const dx = q.d[0] * a.dir, dz = q.d[1] * a.dir, ang = Math.atan2(dx, dz);
    let r = a.obj.rotation.y, da = ((ang - r + Math.PI * 3) % (Math.PI * 2)) - Math.PI; r += da * Math.min(1, dt * (a.kind === 'person' ? 8 : 4));
    a.obj.position.set(q.p[0], a.y, q.p[1]); a.obj.rotation.y = r;
    if (a.kind === 'person' && a.obj.userData.swing) { a.ph = (a.ph || 0) + (a.wait > 0 ? 0 : dt * 7.5 * a.v); HSS.library.animateSwing(a.obj, a.ph, a.wait > 0 ? 0 : 0.45); }
  }
  // Kräne
  for (const h of HL.halls) { const k = h.c.kran; if (!k) continue; k.t += dt; const u = k.L / 2 + (k.L / 2 - 6) * Math.sin(k.t * 0.035) , v = (k.Q / 2 - 3) * Math.sin(k.t * 0.11), hook = 3.2 + 1.6 * Math.sin(k.t * 0.21); const p = k.F.toLoc(u, k.Q / 2); k.brG.position.set(p[0], 0, p[1]); k.katze.position.set(0, 0, v); k.haken.position.set(0, k.y - (k.y - hook), 0); k.haken.position.y = hook; k.seil.scale.y = Math.max(0.1, k.y + 0.9 - hook); k.seil.position.y = (k.y + 0.9 + hook) / 2; }
}
function ftsStep(a, dt) {
  // Zustände: Hauptlinie fahren, Stichfahrt hinein, Halt, zurück
  if (!a.mode) { a.mode = 'linie'; a.path = a.base; a.L = G.dist(a.base[0], a.base[1]); }
  if (a.mode === 'linie') {
    a.s += a.v * dt * a.dir;
    if (a.s >= a.L) { a.s = a.L; a.dir = -1; a.wait = 2; }
    if (a.s <= 0) { a.s = 0; a.dir = 1; a.wait = 2; }
    // Stichstrecke anfahren?
    for (const st of a.stiche || []) { const t = G.dist(a.base[0], st[0]); if (Math.abs(a.s - t) < a.v * dt * 1.01 && a.lastSt !== st && Math.random() < 0.6) { a.lastSt = st; a.ret = { s: t, dir: a.dir }; a.mode = 'stich'; a.path = st; a.L = G.dist(st[0], st[1]); a.s = 0; a.dir = 1; break; } }
  } else {
    a.s += a.v * dt * a.dir;
    if (a.dir > 0 && a.s >= a.L) { a.s = a.L; a.dir = -1; a.wait = 5; }
    if (a.dir < 0 && a.s <= 0) { a.mode = 'linie'; a.path = a.base; a.L = G.dist(a.base[0], a.base[1]); a.s = a.ret.s; a.dir = a.ret.dir; }
  }
  if (a.mode === 'linie' && !(a.stiche || []).some(st => a.lastSt === st && Math.abs(G.dist(a.base[0], st[0]) - a.s) < 3)) a.lastSt = a.lastSt && Math.abs(G.dist(a.base[0], a.lastSt[0]) - a.s) < 3 ? a.lastSt : null;
  a.moving = a.wait <= 0;
}

/* ---------- Anbindung an die Szene ---------- */
HSS.on('rebuilt', () => { try { rebuild(); } catch (e) { console.error('[Hallenausbau]', e); } });
let lastDecke = null;
HSS.on('frame', dt => { const dk = decke(); if (lastDecke !== null && dk !== lastDecke) { lastDecke = dk; agentKey = ''; rebuild(); } lastDecke = dk; if (OPT.leben && LEBEN.visible) update(dt); });
HSS.hallenAktualisieren = () => { agentKey = ''; cache.clear(); rebuild(); };

/* ---------- Bedienung: Abschnitt im Produktionsplaner ---------- */
const UI = HSS.ui, W = UI.ws;
if (W.produktion) {
  const r0 = W.produktion.render.bind(W.produktion);
  W.produktion.render = (el) => {
    r0(el);
    const prj = HSS.project(), hallen = HSS.hallenListe(prj), aus = new Set((prj.intralogistik || []).filter(e => e.kind === 'halle').map(e => e.part));
    const sel = UI.prInp.part && hallen.some(h => h.id === UI.prInp.part) ? UI.prInp.part : hallen[0]?.id;
    const d = document.createElement('div');
    d.innerHTML = `<h3>Hallenausbau &amp; Intralogistik</h3>
      <div class="note">Legt in der Halle Fahr- und Gehwege mit Bodenmarkierung (gelbe Fahrwegbegrenzung, grüner Gehweg, Überwege), FTS-Leitlinie mit Stichstrecken und Ladestation, Rollenbahnen zum Übergabeplatz, Stützen, Tore, Brückenkran oder Hängebahn, Leuchten sowie Sicherheits- und Sozialausstattung an. Stapler, Routenzüge, FTS und Werker bewegen sich auf diesen Wegen.</div>
      <div class="fg"><label class="f full"><span>Halle</span><select id="haP">${hallen.map(pt => `<option value="${pt.id}" ${pt.id === sel ? 'selected' : ''}>${U.esc(HSS.findPart(pt.id).building.kurz || '')} · ${U.esc(pt.name)}${aus.has(pt.id) ? ' ✓' : ''}</option>`).join('')}</select></label></div>
      <div class="actions"><button class="primary" id="haGo" ${hallen.length ? '' : 'disabled'}>Halle ausbauen</button><button id="haAll" ${hallen.length ? '' : 'disabled'}>Alle Hallen ausbauen</button><button id="haDel">Ausbau entfernen</button></div>
      <label class="chk"><input type="checkbox" id="haLeben" ${OPT.leben ? 'checked' : ''}> Personen und Fahrzeuge bewegen sich (Hallenleben)</label>
      <label class="chk"><input type="checkbox" id="haDecke" ${OPT.decke ? 'checked' : ''}> Deckenebene zeigen (Kran, Hängebahn, Leuchten)</label>
      <div class="note">${aus.size} von ${hallen.length} Hallen ausgebaut. Sichtbar in der Etagenansicht (EG) oder mit Hülle „transparent“.</div>`;
    el.appendChild(d);
    const go = (fn, label) => { if (HSS.state.demoReadonly) return UI.toast('Demo ist schreibgeschützt – „Als eigenes Projekt bearbeiten“ wählen.'); let n = 0; HSS.change(label, p => { n = fn(p); }); UI.toast(label + (typeof n === 'number' ? ` (${n})` : '')); UI.renderPanel(); };
    d.querySelector('#haGo').onclick = () => { const id = d.querySelector('#haP').value; go(p => (HSS.hallAusbau(p, id, 0) ? 1 : 0), 'Halle ausgebaut'); const P = HSS.findPart(id); if (P) { HSS.s3.setFloor(HSS.globalFloor(P.part, 0)); HSS.s3.focusSel({ kind: 'part', id }); } };
    d.querySelector('#haAll').onclick = () => go(p => HSS.alleHallenAusbauen(p), 'Alle Hallen ausgebaut');
    d.querySelector('#haDel').onclick = () => { const id = d.querySelector('#haP').value; go(p => { HSS.hallEntfernen(p, id, 0); return 1; }, 'Hallenausbau entfernt'); };
    d.querySelector('#haLeben').onchange = e => { OPT.leben = e.target.checked; saveOpt(); HSS.hallenAktualisieren(); };
    d.querySelector('#haDecke').onchange = e => { OPT.decke = e.target.checked; saveOpt(); HSS.hallenAktualisieren(); };
  };
}
})();
