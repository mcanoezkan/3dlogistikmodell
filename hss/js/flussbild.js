/* =====================================================================
   HSS · flussbild.js – Warenströme als kräftige Bänder
   Alle aktiven Flüsse werden über das Wegenetz geroutet und je Wegabschnitt
   und Warenstrom (Speisen, Wäsche, Sterilgut, Arzneimittel, Verbrauchsgüter,
   Betten, Abfall, Patiententransport, Post & Proben …) zusammengefasst: ein
   farbiges Rohr je Strom, Dicke nach Fahrten pro Tag, Pfeile in Fahrtrichtung,
   eigene Spuren nebeneinander, bewegte Wagen/Betten/LKW.
   Dazu wie im Logistikmodell Bielefeld:
     · Panel „Warenströme“ (Fahrten/Tag · km/Tag, alle/keine, Routen, Animation)
     · Tagesachse (Fahrten je Stunde, Stunde wählen, Ganzer Tag, Abspielen/Pause)
     · Prozess-Tour (Kamerafahrt Quelle → Senke mit Halten, Pause/Weiter/Beenden)
   Gebäudehüllen werden gläsern, damit die Ströme im Gebäude sichtbar sind.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const { THREE, mergeGeometries } = window.THREEX;
const S3 = HSS.s3, V = HSS.view;
const FB = HSS.flussbild = HSS.stroeme = { on: false, move: true, routes: true, aus: new Set(), animating: false, personen: false, hour: null, playing: false, tour: null, zoom: 2.2, tempo: 1, etagen: new Set(), folge: true, sel: null };
let layer = null, movers = [], routes = [], shell0 = null, famMats = new Map();
try { FB.zoom = +(localStorage.getItem('hss-tourZoom') || 2.2) || 2.2; } catch (e) { /* ohne Speicher */ }

const UP = new THREE.Vector3(0, 1, 0);
const matCache = new Map();
const solid = (c) => { const k = 's' + c; if (!matCache.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05 }); m.userData.noToon = true; matCache.set(k, m); } return matCache.get(k); };
const tubeMat = (id, c) => { if (!famMats.has(id)) { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: FB.dick ? 0.55 : 0.15, roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.92 }); m.userData.noToon = true; famMats.set(id, m); } return famMats.get(id); };

/* ---------- Warenströme = Sektionen der Flüsse (js/sektionen.js) ---------- */
FB.familien = (prj = HSS.project()) => HSS.sektionen.list(prj);
FB.stromOf = (f, prj, fams) => HSS.sektionen.of(f, prj, fams || FB.familien(prj));
const isPers = s => s.id === 'personen';

/* ---------- Zeitprofil: Fahrten je Stunde aus den Zeitfenstern ---------- */
function profil(f) {
  const w = (f.fenster && f.fenster.length ? f.fenster : [[6, 22]]), a = new Array(24).fill(0);
  let tot = 0;
  for (const [s, e0] of w) { const e = e0 < s ? e0 + 24 : e0; for (let h = Math.floor(s); h < Math.ceil(e); h++) { const ov = Math.min(e, h + 1) - Math.max(s, h); if (ov > 0) { a[h % 24] += ov; tot += ov; } } }
  return tot ? a.map(v => v / tot) : a.map(() => 1 / 24);
}

/* ---------- Routen aller Flüsse ---------- */
let cache = null, ver = 0;
HSS.on('changed', () => { ver++; }); HSS.on('loaded', () => { ver++; });
const routenBereit = () => !!cache && cache.net === HSS.net() && cache.ver === ver;
// Routen schrittweise berechnen (höchstens ~30 ms am Stück), damit die Oberfläche nicht einfriert
FB.vorbereiten = () => new Promise(res => {
  const prj = HSS.project(), fl = prj.flows.filter(f => f.aktiv !== false); let i = 0;
  const step = () => {
    const t0 = performance.now();
    while (i < fl.length && performance.now() - t0 < 30) { const f = fl[i++], m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport); if (m) HSS.route(f.von, f.nach, t?.mittel || 'hand', m.reinheit || 'neutral'); }
    const el = document.getElementById('stroeme'); if (el && !el.hidden) { const n = el.querySelector('.sn'); if (n) n.textContent = `Routen werden berechnet … ${Math.round(i / Math.max(1, fl.length) * 100)} %`; }
    if (i < fl.length) setTimeout(step, 0); else res();
  };
  step();
});
function collect() {
  const net0 = HSS.net(); if (cache && cache.net === net0 && cache.ver === ver) return cache.res;
  const prj = HSS.project(); HSS.ensureStammdaten?.(prj);
  const fams = FB.familien(prj), out = [];
  for (const f of prj.flows) {
    if (f.aktiv === false) continue;
    const m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport);
    if (!m) continue;
    const r = HSS.route(f.von, f.nach, t?.mittel || 'hand', m.reinheit || 'neutral'); if (!r.ok || r.pts.length < 2) continue;
    const perDay = HSS.flowPerDay(f), trips = perDay / Math.max(1, m.proLadung || 1);
    out.push({ f, m, t, r, pts: HSS.routeAnzeige(r), s: FB.stromOf(f, prj, fams), perDay, trips, prof: profil(f), mittel: t?.mittel || 'hand' });
  }
  const res = { all: out, fams }; cache = { net: net0, ver, res }; return res;
}
FB.stats = () => {
  const { all, fams } = collect(), by = new Map();
  for (const x of all) { const e = by.get(x.s.id) || { s: x.s, trips: 0, km: 0, n: 0 }; e.trips += x.trips; e.km += x.trips * (x.r.len || 0) / 1000; e.n++; by.set(x.s.id, e); }
  return { all, fams, rows: fams.map(s => by.get(s.id)).filter(Boolean) };
};
const aktiv = s => !FB.aus.has(s.id) && (!isPers(s) || FB.personen);
// Etagen: der Etagenleiste folgen (eine Etage gewählt) oder eigene Auswahl
FB.gfSichtbar = g => { if (FB.folge && V.floor !== null && V.floor !== undefined) return g === V.floor; return !FB.etagen.size || FB.etagen.has(g); };
const exY = q => [q[0], q[1] + (q[3] || 0) * (V.explode || 0), q[2], q[3]];

/* ---------- Geometrie ---------- */
const _d = new THREE.Vector3(), _q = new THREE.Quaternion();
function cyl(a, b, r) {
  const len = a.distanceTo(b); if (len < 0.05) return null;
  const g = new THREE.CylinderGeometry(r, r, len, 8, 1, true);
  _d.subVectors(b, a).normalize(); _q.setFromUnitVectors(UP, _d);
  g.applyQuaternion(_q); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return g;
}
function cone(p, dir, r) { const g = new THREE.ConeGeometry(r * 2.3, r * 4.5, 10); _q.setFromUnitVectors(UP, dir); g.applyQuaternion(_q); g.translate(p.x, p.y, p.z); return g; }
function ball(p, r) { const g = new THREE.SphereGeometry(r, 8, 6); g.translate(p.x, p.y, p.z); return g; }
// Spurversatz: quer zur Fahrtrichtung in der Ebene
function offsetPts(pts, lane, h) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz);
    if (l < 1e-3) return new THREE.Vector3(p[0], p[1] + h, p[2]);
    return new THREE.Vector3(p[0] - dz / l * lane, p[1] + h, p[2] + dx / l * lane);
  });
}
const HOEHE = { lkw: 2.2, transporter: 1.9, awt: 0.7 };

FB.build = () => {
  if (!layer) { layer = new THREE.Group(); layer.name = 'flows'; S3.scene.add(layer); S3.layers.flows = layer; }
  // Routen noch nicht berechnet: im Hintergrund rechnen, bisheriges Bild so lange stehen lassen
  if (FB.on && !routenBereit()) { if (!FB._prep) { FB._prep = true; FB.vorbereiten().then(() => { FB._prep = false; collect(); FB.build(); }); } return; }
  while (layer.children.length) layer.remove(layer.children[0]);
  movers = []; routes = []; inst = {};
  if (!FB.on) { panel(); achse(); HSS.perf?.invalidate(2); return; }
  const { all, fams } = collect();
  const used = fams.filter(s => all.some(x => x.s === s));
  const laneOf = new Map(used.map((s, i) => [s.id, (i - (used.length - 1) / 2) * 0.95]));
  const vis = all.filter(x => aktiv(x.s));
  const maxTrips = Math.max(1, ...vis.map(x => x.trips));
  // normal schlank; während der Simulation (Abspielen, Stunde gewählt, Tour, Tagesablauf) kräftig und leuchtend
  FB.dick = !!(FB.playing || FB.hour !== null || FB.tour || HSS.player?.playing);
  const rad = trips => FB.dick ? 0.3 + 0.55 * Math.sqrt(trips / maxTrips) : 0.13 + 0.27 * Math.sqrt(trips / maxTrips);
  for (const m of famMats.values()) m.emissiveIntensity = FB.dick ? 0.55 : 0.15;
  // Abschnitte je Strom und Richtung zusammenfassen
  const seg = new Map();
  for (const x of vis) {
    const P = x.pts.map(exY), key = q => q.slice(0, 3).map(v => Math.round(v * 2) / 2).join(',');
    for (let i = 0; i < P.length - 1; i++) {
      if (!FB.gfSichtbar(P[i][3]) && !FB.gfSichtbar(P[i + 1][3])) continue;
      if (P[i][3] !== P[i + 1][3] && Math.abs(P[i][1] - P[i + 1][1]) < 0.5 && !(FB.gfSichtbar(P[i][3]) && FB.gfSichtbar(P[i + 1][3]))) continue;
      const k = x.s.id + '|' + key(P[i]) + '>' + key(P[i + 1]);
      const s = seg.get(k) || { s: x.s, a: P[i], b: P[i + 1], trips: 0, mittel: x.mittel }; s.trips += Math.max(0.2, x.trips); seg.set(k, s);
    }
    routes.push(x);
  }
  if (FB.routes) {
    const by = new Map();
    for (const s of seg.values()) {
      if (!by.has(s.s.id)) by.set(s.s.id, { s: s.s, geos: [] });
      const lane = laneOf.get(s.s.id), h = (HOEHE[s.mittel] || 1.1) + (lane > 0 ? 0.05 : 0);
      const [a, b] = offsetPts([s.a, s.b], lane, h), r = rad(s.trips), G = by.get(s.s.id).geos;
      const c = cyl(a, b, r); if (c) G.push(c);
      G.push(ball(b, r));
      const len = a.distanceTo(b);
      if (len > 9) for (let d = 6; d < len - 2; d += 16) { _d.subVectors(b, a).normalize(); G.push(cone(a.clone().addScaledVector(_d, d), _d.clone(), r)); }
      else if (len > 3 && Math.abs(b.y - a.y) < 0.5 && (s.a[0] * 7 + s.a[2] * 13) % 3 < 1) { _d.subVectors(b, a).normalize(); G.push(cone(a.clone().lerp(b, 0.5), _d.clone(), r)); }
    }
    for (const { s, geos } of by.values()) {
      if (!geos.length) continue;
      const mesh = new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false), tubeMat(s.id, s.farbe));
      mesh.userData = { strom: s.id }; mesh.renderOrder = 6; mesh.raycast = () => {}; layer.add(mesh);
    }
  }
  // Bewegte Wagen, Betten, Personen und LKW – ganzer Tag oder gewählte Stunde
  if (FB.move) for (const x of routes) {
    const tph = FB.hour === null ? x.trips / 16 : x.trips * x.prof[FB.hour];
    if (tph < 0.05) continue;
    const n = FB.hour === null ? Math.min(3, Math.max(1, Math.round(Math.sqrt(x.trips) / 2))) : Math.min(3, Math.max(1, Math.round(tph / 2)));
    const lane = laneOf.get(x.s.id), h = (HOEHE[x.mittel] || 1.1);
    if (!x.pts.some(q => FB.gfSichtbar(q[3]))) continue;
    const pts = offsetPts(x.pts.map(exY), lane, 0); const pl = poly(pts); pl.gf = x.pts.map(q => q[3]); if (pl.L < 4) continue;
    const k = art(x);
    for (let i = 0; i < n; i++) {
      const mv = { pl, strom: x.s.id, flow: x.f.id, phase: (i / n + Math.random() * 0.15) % 1, speed: x.mittel === 'lkw' || x.mittel === 'transporter' ? 11 : x.mittel === 'awt' ? 4 : 5, lift: h };
      if (k === 'lkw') { mv.mesh = moverMesh(x); layer.add(mv.mesh); } else { mv.k = k; mv.farbe = x.s.farbe || x.m.farbe || '#2D7694'; }
      movers.push(mv);
    }
  }
  // Wagen, Betten und Personen als Instanzen: ein Zeichenaufruf je Art statt Hunderter
  inst = {};
  for (const k of ['wagen', 'bett', 'person']) {
    const list = movers.filter(m => m.k === k); if (!list.length) continue;
    const im = new THREE.InstancedMesh(INST_GEO[k], INST_MAT, list.length); im.frustumCulled = false; im.raycast = () => {};
    const c = new THREE.Color(); list.forEach((m, i) => { m.idx = i; m.im = im; im.setColorAt(i, c.set(m.farbe)); });
    im.instanceColor.needsUpdate = true; layer.add(im); inst[k] = im;
  }
  if (FB.tour) tourGeo();
  emphasis(); hilite(); if (FB.sel && !U.byId(HSS.project().flows, FB.sel)) FB.sel = null; karte2();
  FB.animating = (FB.move && movers.length > 0) || !!FB.tour || FB.playing;
  panel(); achse(); HSS.perf?.invalidate(3);
  if (HSS.ui?.current === 'fluesse' && !HSS.ui._fbRefresh) { HSS.ui._fbRefresh = setTimeout(() => { HSS.ui._fbRefresh = null; if (!document.activeElement?.closest?.('#panel')) HSS.ui.renderPanel(); }, 50); }
};
// Tour: nur der gezeigte Strom kräftig
function emphasis() {
  for (const [id, m] of famMats) { m.opacity = FB.tour ? (id === FB.tour.strom && !FB.tour.flows ? 0.95 : 0.07) : FB.sel ? 0.18 : 0.92; m.depthWrite = m.opacity > 0.5; }
  for (const mv of movers) { mv.aus = !!((FB.tour && (FB.tour.flows ? !FB.tour.flows.has(mv.flow) : mv.strom !== FB.tour.strom)) || (FB.sel && mv.flow !== FB.sel)); if (mv.mesh) mv.mesh.visible = !mv.aus; else if (mv.aus && mv.im) { _o.scale.setScalar(0); _o.updateMatrix(); mv.im.setMatrixAt(mv.idx, _o.matrix); mv.im.instanceMatrix.needsUpdate = true; } }
  HSS.perf?.invalidate(2);
}

/* ---------- Bewegungen ---------- */
function poly(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, cum, L: cum[cum.length - 1] }; }
function at(pl, s, out) {
  if (s <= 0) return out.copy(pl.pts[0]); if (s >= pl.L) return out.copy(pl.pts[pl.pts.length - 1]);
  let lo = 1, hi = pl.cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (pl.cum[mid] < s) lo = mid + 1; else hi = mid; }
  at.i = lo; const t = (s - pl.cum[lo - 1]) / ((pl.cum[lo] - pl.cum[lo - 1]) || 1); return out.copy(pl.pts[lo - 1]).lerp(pl.pts[lo], t);
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); return o; };
function truck() {
  const g = new THREE.Group();
  g.add(box(5.4, 2.6, 2.3, solid('#eef1f4'), -0.9, 0.7, 0), box(1.7, 2.0, 2.2, solid('#0A223C'), 2.6, 0.7, 0), box(0.06, 0.8, 1.9, solid('#9fc3dc'), 3.46, 1.75, 0), box(4.2, 0.35, 0.03, solid('#2D7694'), -0.9, 2.3, 1.16), box(4.2, 0.35, 0.03, solid('#2D7694'), -0.9, 2.3, -1.16));
  for (const x of [-2.7, 0.2, 2.6]) for (const z of [-1.05, 1.05]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.32, 12), solid('#3F4A55')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.48, z); g.add(w); }
  return g;
}
const capsGeo = new THREE.CapsuleGeometry(0.28, 1.0, 4, 8);
let inst = {};
const art = x => x.mittel === 'lkw' || x.mittel === 'transporter' ? 'lkw' : x.m.reinheit === 'person' ? 'person' : (x.m.reinheit === 'patient' || x.mittel === 'bett' || x.s.id === 'betten') ? 'bett' : 'wagen';
const INST_GEO = { wagen: new THREE.BoxGeometry(1.4, 1.1, 1.3).translate(0, 0.75, 0), bett: new THREE.BoxGeometry(2.3, 0.7, 1.1).translate(0, 0.7, 0), person: new THREE.CapsuleGeometry(0.3, 1.0, 4, 8).translate(0, 0.85, 0) };
const INST_MAT = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.05 }); INST_MAT.userData.noToon = true;
const _o = new THREE.Object3D();
function moverMesh(x) {
  if (x.mittel === 'lkw' || x.mittel === 'transporter') { const t = truck(); if (x.mittel === 'transporter') t.scale.setScalar(0.7); return t; }
  const c = x.s.farbe || x.m.farbe || '#2D7694';
  if (x.m.reinheit === 'person' || x.m.reinheit === 'patient' || x.mittel === 'bett' || x.s.id === 'betten') { const g = new THREE.Group(); if (x.m.reinheit === 'person') { const o = new THREE.Mesh(capsGeo, solid(c)); o.position.y = 0.8; g.add(o); } else g.add(box(2.3, 0.6, 1.1, solid(c), 0, 0.35, 0), box(2.1, 0.12, 0.95, solid('#eef1f4'), 0, 0.95, 0)); return g; }
  const g = new THREE.Group(); g.add(box(1.4, 1.05, 1.3, solid(c), 0, 0.2, 0)); g.add(box(1.45, 0.08, 1.35, solid('#3F4A55'), 0, 0.1, 0)); return g;
}
// einfache Figuren für die Simulation (Planungsmodell): LKW, Wagen mit Person, AWT-Behälter, Bett
FB.agentMesh = (mittel, mat) => {
  const g = new THREE.Group(), c = mat?.farbe || '#2D7694';
  if (mittel === 'lkw' || mittel === 'transporter') { const t = truck(); t.rotation.y = -Math.PI / 2; if (mittel === 'transporter') t.scale.setScalar(0.7); g.add(t); return g; }
  if (mittel === 'awt') { g.add(box(0.8, 0.9, 1.1, solid(c), 0, 0.3, 0)); return g; }
  const p = new THREE.Mesh(capsGeo, solid('#144477')); p.position.set(0, 0.85, -0.45); g.add(p);
  if (mat?.reinheit === 'patient' || mittel === 'bett') g.add(box(0.95, 0.55, 2.1, solid('#eef1f4'), 0, 0.3, 0.8), box(0.7, 0.2, 1.6, solid(c), 0, 0.85, 0.8));
  else if (mat?.reinheit !== 'person') g.add(box(0.7, 0.95, 1.0, solid(c), 0, 0.15, 0.65), box(0.75, 0.08, 1.05, solid('#3F4A55'), 0, 0.08, 0.65));
  return g;
};
const _p = new THREE.Vector3(), _n = new THREE.Vector3();
let T = 0, playT = 0;
HSS.on('frame', dt => {
  if (FB.playing) { playT += dt; if (playT > 1.6) { playT = 0; FB.setHour(((FB.hour ?? 4) + 1) % 24); } }
  if (FB.tour) updateTour(dt);
  if (!FB.animating || !layer?.visible) return;
  T += dt;
  for (const mv of movers) {
    if (mv.aus) continue;
    const s = ((T * mv.speed / mv.pl.L) + mv.phase) % 1;
    at(mv.pl, s * mv.pl.L, _p); const gi = at.i ?? 1; at(mv.pl, Math.min(mv.pl.L, s * mv.pl.L + 1), _n);
    const vis = FB.gfSichtbar(mv.pl.gf[gi]) || FB.gfSichtbar(mv.pl.gf[gi - 1]);
    const dx = _n.x - _p.x, dz = _n.z - _p.z; if (dx * dx + dz * dz > 1e-5) mv.rot = -Math.atan2(dz, dx);
    if (mv.mesh) { mv.mesh.visible = vis; mv.mesh.position.copy(_p); mv.mesh.rotation.y = mv.rot || 0; }
    else { _o.position.copy(_p); _o.rotation.set(0, mv.rot || 0, 0); _o.scale.setScalar(vis ? 1 : 0); _o.updateMatrix(); mv.im.setMatrixAt(mv.idx, _o.matrix); }
  }
  for (const im of Object.values(inst)) im.instanceMatrix.needsUpdate = true;
});

/* ---------- Panel „Warenströme“ ---------- */
const opt = (v, t, s) => `<option value="${U.esc(v)}"${v === s ? ' selected' : ''}>${U.esc(t)}</option>`;
function panel() {
  let el = document.getElementById('stroeme');
  if (!FB.on) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'stroeme'; el.className = 'vw-fluss'; document.body.appendChild(el); }
  const { all, rows } = FB.stats();
  el.hidden = false;
  const tourSel = FB._tourSel && rows.some(r => r.s.id === FB._tourSel) ? FB._tourSel : rows.find(r => !isPers(r.s))?.s.id;
  el.innerHTML = `<div class="sh"><b>Warenströme</b><button class="mini" data-sa>alle</button><button class="mini" data-sn>keine</button><button class="mini x" data-sx title="Warenströme schließen">×</button></div>
    <div class="note sn">Fahrten/Tag · Transportleistung km/Tag · ${all.length} Flüsse</div>
    <div class="sl">${rows.map(r => `<label class="si ${aktiv(r.s) ? '' : 'dim'}"><input type="checkbox" data-s="${U.esc(r.s.id)}" ${aktiv(r.s) ? 'checked' : ''}><i style="background:${U.esc(r.s.farbe)}"></i><span>${U.esc(r.s.name)}</span><small>${U.fmt(r.trips)} · ${U.fmt(r.km, 1)} km</small></label>`).join('') || '<div class="note" style="padding:6px 8px">Noch keine Flüsse – im Arbeitsbereich „Flüsse“ mit dem Fluss-Assistenten anlegen oder Standardflüsse übernehmen.</div>'}</div>
    <label class="chk"><input type="checkbox" data-sr ${FB.routes ? 'checked' : ''}> Routen anzeigen</label>
    <label class="chk"><input type="checkbox" data-sm ${FB.move ? 'checked' : ''}> Transporte animieren</label>
    <div class="sh2">Etagen</div>
    <label class="chk"><input type="checkbox" data-sf ${FB.folge ? 'checked' : ''}> der Etagenleiste folgen (eine Etage gewählt → nur deren Flüsse)</label>
    <div class="etchips">${[...new Set(all.flatMap(x => x.pts.map(q => q[3])))].filter(g => g !== undefined).sort((a, b) => b - a).map(g => `<button class="mini ${FB.etagen.has(g) ? 'on' : ''}" data-et="${g}">${HSS.floorName(g)}</button>`).join('')}<button class="mini ${FB.etagen.size ? '' : 'on'}" data-et="">alle</button></div>
    ${rows.length ? `<div class="sh2">Prozess-Tour</div>
    <div class="row"><select data-ts>${rows.filter(r => !isPers(r.s)).map(r => opt(r.s.id, r.s.name, tourSel)).join('')}</select><button class="primary" data-tgo>▶ Start</button></div>
    <label class="ctl">Tempo <input type="range" data-tt min="0.5" max="4" step="0.25" value="${FB.tempo}"></label>
    <label class="ctl">Kameraabstand <input type="range" class="tourZoomIn" min="0.6" max="6" step="0.1" value="${FB.zoom}"></label>
    <div class="note">Automatische Kamerafahrt von der Quelle zur Senke. Aufzüge und Außenwege werden als Zwischenhalte erläutert.</div>` : ''}`;
  el.querySelector('[data-sx]').onclick = () => FB.set(false);
  el.querySelector('[data-sa]').onclick = () => { FB.aus.clear(); FB.personen = true; FB.build(); };
  el.querySelector('[data-sn]').onclick = () => { for (const r of rows) FB.aus.add(r.s.id); FB.build(); };
  el.querySelectorAll('[data-s]').forEach(c => c.onchange = () => { const id = c.dataset.s; if (id === 'personen' && c.checked) FB.personen = true; if (c.checked) FB.aus.delete(id); else FB.aus.add(id); FB.build(); });
  el.querySelector('[data-sr]').onchange = e => { FB.routes = e.target.checked; FB.build(); };
  el.querySelector('[data-sm]').onchange = e => { FB.move = e.target.checked; FB.build(); };
  el.querySelector('[data-sf]').onchange = e => { FB.folge = e.target.checked; FB.build(); };
  el.querySelectorAll('[data-et]').forEach(b => b.onclick = () => { const v = b.dataset.et; if (v === '') FB.etagen.clear(); else { const g = +v; if (FB.etagen.has(g)) FB.etagen.delete(g); else FB.etagen.add(g); } FB.build(); });
  const ts = el.querySelector('[data-ts]'); if (ts) { ts.onchange = () => (FB._tourSel = ts.value); el.querySelector('[data-tgo]').onclick = () => FB.startTour(ts.value); el.querySelector('[data-tt]').oninput = e => (FB.tempo = +e.target.value); }
  el.querySelectorAll('.tourZoomIn').forEach(i => i.oninput = () => setZoom(+i.value));
}

/* ---------- Tagesachse ---------- */
let bars = [];
function hourly() {
  const { all, fams } = collect(), res = new Map();
  for (const x of all) { if (!aktiv(x.s)) continue; const a = res.get(x.s.id) || new Array(24).fill(0); for (let h = 0; h < 24; h++) a[h] += x.trips * x.prof[h]; res.set(x.s.id, a); }
  return { res, fams: fams.filter(s => res.has(s.id)) };
}
function achse() {
  let el = document.getElementById('stAchse');
  const show = FB.on && !document.body.classList.contains('timeline');
  document.body.classList.toggle('stachse', !!show);
  if (!show) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'stAchse'; el.className = 'vw-fluss vw-sim';
    el.innerHTML = `<div class="ah"><b>Tagesachse</b><span class="ai"></span><div class="sp"></div><button data-day>Ganzer Tag</button><button data-play>▶ Abspielen</button></div><canvas></canvas>`;
    document.body.appendChild(el);
    const cv = el.querySelector('canvas');
    el.querySelector('[data-day]').onclick = () => { FB.play(false); FB.setHour(null); };
    el.querySelector('[data-play]').onclick = () => FB.play(!FB.playing);
    cv.onclick = ev => { const x = ev.clientX - cv.getBoundingClientRect().left, b = bars.find(([a, c]) => x >= a - 2 && x <= c + 2); if (b) FB.setHour(b[2]); };
    const tip = () => document.getElementById('tip');
    cv.onmousemove = ev => {
      const t = tip(); if (!t) return;
      const x = ev.clientX - cv.getBoundingClientRect().left, b = bars.find(([a, c]) => x >= a - 2 && x <= c + 2);
      if (!b) { t.hidden = true; return; }
      const { res, fams } = hourly(), hr = b[2];
      t.innerHTML = `<b>${String(hr).padStart(2, '0')}:00 Uhr</b><div class="s">${fams.filter(s => res.get(s.id)[hr] > 0.05).map(s => `<span style="color:${s.farbe}">●</span> ${U.esc(s.name)}: ${U.fmt(res.get(s.id)[hr], 1)}`).join('<br>') || 'keine Transporte'}</div>`;
      t.hidden = false; t.style.left = `${ev.clientX + 12}px`; t.style.top = `${ev.clientY - 20 - t.offsetHeight}px`;
    };
    cv.onmouseleave = () => { const t = tip(); if (t) t.hidden = true; };
  }
  el.hidden = false;
  el.querySelector('[data-day]').classList.toggle('on', FB.hour === null);
  el.querySelector('[data-play]').textContent = FB.playing ? '❚❚ Pause' : '▶ Abspielen';
  requestAnimationFrame(() => zeichnen(el));
}
function zeichnen(el) {
  const cv = el.querySelector('canvas'), dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (!w || !h) return;
  cv.width = w * dpr; cv.height = h * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  const { res, fams } = hourly(), H = [...Array(24).keys()], tot = H.map(hr => U.sum(fams.map(s => res.get(s.id)[hr])));
  const max = Math.max(1, ...tot), L = 34, B = 16, Tp = 4, cw = (w - L - 4) / 24, nice = Math.ceil(max / 20) * 20 || 20;
  g.font = '10px Arial, sans-serif'; g.fillStyle = '#94a3b8'; g.strokeStyle = '#e2e8f0'; g.lineWidth = 1;
  for (const v of [0, nice / 2, nice]) { const y = h - B - (v / nice) * (h - B - Tp); g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); g.textAlign = 'right'; g.fillText(U.fmt(v), L - 5, y + 3); }
  bars = [];
  for (const hr of H) {
    const x = L + hr * cw + 2, bw = cw - 4; let y = h - B;
    for (const s of fams) {
      const v = res.get(s.id)[hr]; if (!v) continue;
      const bh = (v / nice) * (h - B - Tp); g.fillStyle = s.farbe; g.globalAlpha = FB.hour === null || FB.hour === hr ? 0.9 : 0.35;
      g.fillRect(x, y - bh, bw, bh); y -= bh;
    }
    g.globalAlpha = 1;
    if (FB.hour === hr) { g.strokeStyle = '#144477'; g.lineWidth = 2; g.strokeRect(x - 1, Tp, bw + 2, h - B - Tp); g.lineWidth = 1; g.strokeStyle = '#e2e8f0'; }
    g.fillStyle = '#64748b'; g.textAlign = 'center';
    if (hr % 2 === 0) g.fillText(String(hr).padStart(2, '0'), x + bw / 2, h - 3);
    bars.push([x, x + bw, hr]);
  }
  const peak = tot.indexOf(Math.max(...tot)), sum = U.sum(tot);
  el.querySelector('.ai').innerHTML = FB.hour === null
    ? `Ganzer Tag · ${U.fmt(sum)} Fahrten · Spitze ${String(peak).padStart(2, '0')}:00 Uhr (${U.fmt(tot[peak])} Fahrten/h)`
    : `${String(FB.hour).padStart(2, '0')}:00–${String(FB.hour + 1).padStart(2, '0')}:00 Uhr · ${U.fmt(tot[FB.hour], 1)} Fahrten/h`;
}
FB.setHour = hr => { FB.hour = hr; FB.build(); };
FB.play = on => { FB.playing = on; playT = 0; if (on && FB.hour === null) FB.setHour(5); else achse(); FB.animating = (FB.move && movers.length > 0) || !!FB.tour || FB.playing; };
window.addEventListener('resize', U.debounce(() => { const el = document.getElementById('stAchse'); if (el && !el.hidden) zeichnen(el); }, 100));

/* ---------- Prozess-Tour ---------- */
const tourG = new THREE.Group(); tourG.visible = false;
const tMark = new THREE.Mesh(new THREE.SphereGeometry(1.8, 20, 14), new THREE.MeshStandardMaterial({ color: '#0A967A', emissive: '#0A967A', emissiveIntensity: 0.6 }));
const tRing = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.25, 8, 40), new THREE.MeshBasicMaterial({ color: '#0A967A' })); tRing.rotation.x = Math.PI / 2;
const tPole = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 3), new THREE.MeshBasicMaterial({ color: '#0A967A' })); tPole.rotation.x = Math.PI;
[tMark, tRing, tPole].forEach(m => { m.userData.noToon = true; m.renderOrder = 40; m.material.depthTest = false; });
tourG.add(tMark, tRing, tPole);
const AUSSEN = new Set(['strasse', 'zufahrt', 'weg', 'gehweg', 'anbindung']);
// Stationen eines Stroms: aus dem Projekt (Prozess-Tour) oder aus den größten Flüssen abgeleitet
function stationen(sid) {
  const prj = HSS.project(), { all, fams } = collect(), s = fams.find(x => x.id === sid), mine = all.filter(x => x.s.id === sid);
  if (!s || !mine.length) return null;
  const PL = new Map(HSS.places(prj).map(p => [p.id, p]));
  let st = (s.tour || []).filter(t => PL.has(t.place)).map(t => ({ place: t.place, titel: t.titel || PL.get(t.place).name, text: t.text || '' }));
  if (st.length < 2) {
    const top = mine.slice().sort((a, b) => b.trips - a.trips)[0];
    const seq = [top.f.von, top.f.nach];
    while (seq.length < 4) { const nx = mine.filter(x => x.f.von === seq[seq.length - 1] && !seq.includes(x.f.nach)).sort((a, b) => b.trips - a.trips)[0]; if (!nx) break; seq.push(nx.f.nach); }
    st = seq.map((pid, i) => { const p = PL.get(pid), out = mine.filter(x => x.f.von === pid), inn = mine.filter(x => x.f.nach === pid);
      return { place: pid, titel: (p?.name || pid).split(' · ').pop(), text: `${p?.name || ''}${i === 0 ? ` – Quelle: ${U.fmt(U.sum(out.map(x => x.trips)), 1)} Fahrten/Tag ab hier.` : i === seq.length - 1 ? ` – Ziel: ${U.fmt(U.sum(inn.map(x => x.trips)), 1)} Fahrten/Tag kommen hier an.` : ` – Umschlag: ${U.fmt(U.sum(inn.map(x => x.trips)), 1)} Fahrten/Tag an, ${U.fmt(U.sum(out.map(x => x.trips)), 1)} ab.`}` }; });
  }
  const cnt = {}; for (const x of mine) cnt[x.mittel] = (cnt[x.mittel] || 0) + x.trips; const mittel = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0], rein = mine[0].m.reinheit || 'neutral';
  return { s, st, mittel, rein, PL };
}
// Stationen eines einzelnen Flusses (mit allen Etappen derselben Kette)
function stationenFluss(fid) {
  const prj = HSS.project(), f0 = U.byId(prj.flows, fid); if (!f0) return null;
  const kette = f0.kette ? prj.flows.filter(f => f.kette === f0.kette).sort((a, b) => (a.etappe || 0) - (b.etappe || 0)) : [f0];
  const PL = new Map(HSS.places(prj).map(p => [p.id, p])), m = U.byId(prj.materials, f0.material), t = U.byId(prj.transports, f0.transport);
  const nm = id => PL.get(id)?.name || id, menge = `${U.fmt(HSS.flowPerDay(f0), 1)} ${m?.einheit || ''}/Tag`;
  const st = [{ place: kette[0].von, titel: nm(kette[0].von).split(' · ').pop(), text: `${nm(kette[0].von)} – Start: ${menge} ${m?.name ? '(' + m.name + ')' : ''}, ${t?.name || ''}.` }];
  kette.forEach((f, i) => st.push({ place: f.nach, titel: nm(f.nach).split(' · ').pop(), text: `${nm(f.nach)} – ${i === kette.length - 1 ? 'Ziel' : 'Zwischenstopp ' + (i + 1)}${f.fenster?.length ? ' · Zeitfenster ' + f.fenster.map(([a, b]) => U.hhmm(a * 60) + '–' + U.hhmm(b * 60)).join(', ') : ''}.` }));
  return { s: FB.stromOf(f0, prj), st, mittel: t?.mittel || 'hand', rein: m?.reinheit || 'neutral', PL, flows: new Set(kette.map(f => f.id)), name: f0.name.replace(/ · Etappe \d+\/\d+$/, '') };
}
FB.startFlussTour = fid => FB.startTour(null, { flow: fid });
FB.startTour = (sid, opt = {}) => {
  FB.stopTour();
  if (!FB.on) FB.set(true);
  const D = opt.flow ? stationenFluss(opt.flow) : stationen(sid); if (!D) { HSS.ui.toast('Für diesen Strom gibt es keine Flüsse mit Route.', 3000); return; }
  sid = D.s.id;
  if (FB.aus.has(sid)) { FB.aus.delete(sid); }
  const net = HSS.net(), pts = [], stops = [];
  const push = (p, y = 1.2) => pts.push(new THREE.Vector3(p[0], p[1] + y, p[2]));
  stops.push({ i: 0, titel: D.st[0].titel, text: D.st[0].text, main: true });
  for (let k = 1; k < D.st.length; k++) {
    let r = HSS.route(D.st[k - 1].place, D.st[k].place, D.mittel, D.rein);
    if (!r.ok) r = HSS.route(D.st[k - 1].place, D.st[k].place, 'hand', 'neutral');
    if (!r.ok) { HSS.ui.toast(`Tour: kein zulässiger Weg zu ${D.st[k].titel}`, 3000); continue; }
    const base = Math.max(0, pts.length - 1);
    r.pts.forEach((p, j) => { if (j === 0 && pts.length) return; push(p); });
    for (const L of r.lifts) {
      const N = net.lifts.find(x => x.id === L.lift);
      stops.push({ i: base + L.startIdx, titel: N?.name || 'Aufzug', text: `Fahrt ${HSS.floorName(L.from)} → ${HSS.floorName(L.to)}${N?.cfg?.kabinen ? ` · ${N.cfg.kabinen} Kabine(n)` : ''}${N?.cfg?.freigabe && !N.cfg.freigabe.includes('*') ? ` · zugelassen: ${N.cfg.freigabe.join(', ')}` : ''}.`, auto: true });
    }
    for (let j = 0; j < r.edges.length; j++) {
      const e = r.edges[j]; if (!AUSSEN.has(e.type) || (j && AUSSEN.has(r.edges[j - 1].type))) continue;
      let len = 0; for (let q = j; q < r.edges.length && AUSSEN.has(r.edges[q].type); q++) len += r.edges[q].len || 0;
      if (len > 15) stops.push({ i: base + j, titel: 'Außenweg', text: `${U.fmt(len)} m im Freien: witterungsabhängig, Schnittstelle Gebäude/Außenbereich.`, auto: true });
    }
    stops.push({ i: pts.length - 1, titel: D.st[k].titel, text: D.st[k].text, main: true });
  }
  if (pts.length < 2) { HSS.ui.toast('Tour: keine Route gefunden', 3000); return; }
  stops.sort((a, b) => a.i - b.i);
  const pl = poly(pts);
  stops.forEach(s => (s.s = pl.cum[Math.min(s.i, pl.cum.length - 1)]));
  FB.tour = { strom: sid, flows: D.flows || null, name: D.name || D.s.name, farbe: D.s.farbe, pl, stops, next: 0, s: 0, pause: 0, paused: false, done: false, look: S3.controls.target.clone(), dir: new THREE.Vector3(1, 0, 0) };
  if (!tourG.parent) S3.scene.add(tourG);
  tourG.visible = true; S3.controls.enabled = false; wheel();
  if (V.floor !== null && V.floor !== undefined) S3.setFloor(null);
  FB._tourSel = sid;
  karte();
  FB.build();
};
function tourGeo() { /* Route der Tour ist unabhängig vom Flussbild – nichts neu zu bauen */ }
FB.stopTour = () => {
  if (!FB.tour) return;
  FB.tour = null; hilite(); tourG.visible = false; S3.controls.enabled = true; const pe = document.getElementById('tourPos'); if (pe) pe.hidden = true;
  const c = document.getElementById('stTour'); if (c) c.hidden = true;
  emphasis(); FB.animating = (FB.move && movers.length > 0) || FB.playing;
  if (FB.on) setTimeout(() => FB.build(), 0);
};
function karte() {
  let c = document.getElementById('stTour');
  if (!c) {
    c = document.createElement('div'); c.id = 'stTour'; c.className = 'vw-fluss';
    c.innerHTML = `<div class="tk"></div><h3></h3><p></p><div class="bar"><i></i></div><div class="row"><button data-tp>❚❚ Pause</button><button data-tw>Weiter ›</button><div class="sp"></div><label class="ctl">Abstand <input type="range" class="tourZoomIn" min="0.6" max="6" step="0.1"></label><button data-te>Beenden</button></div>`;
    document.body.appendChild(c);
    c.querySelector('[data-tp]').onclick = e => { const t = FB.tour; if (!t) return; t.paused = !t.paused; e.target.textContent = t.paused ? '▶ Weiter' : '❚❚ Pause'; };
    c.querySelector('[data-tw]').onclick = () => { if (FB.tour) FB.tour.pause = 0; };
    c.querySelector('[data-te]').onclick = () => FB.stopTour();
    c.querySelector('.tourZoomIn').oninput = e => setZoom(+e.target.value);
  }
  c.hidden = false; c.querySelector('.tourZoomIn').value = FB.zoom; c.querySelector('[data-tp]').textContent = '❚❚ Pause';
  c.querySelector('.tk').textContent = `Prozess-Tour · ${FB.tour.name}`; c.querySelector('h3').textContent = FB.tour.stops[0]?.titel || ''; c.querySelector('p').textContent = '';
}
function zeigeHalt(i) {
  const t = FB.tour, st = t.stops[i], mains = t.stops.filter(s => s.main), mi = mains.indexOf(st), c = document.getElementById('stTour'); if (!c) return;
  c.querySelector('.tk').textContent = `Prozess-Tour · ${t.name} · ${st.main ? `Station ${mi + 1}/${mains.length}` : 'Zwischenhalt'}`;
  c.querySelector('h3').textContent = st.titel; c.querySelector('p').textContent = st.text || '';
}
function setZoom(v) {
  FB.zoom = Math.min(6, Math.max(0.6, Math.round(v * 10) / 10));
  document.querySelectorAll('.tourZoomIn').forEach(i => (i.value = FB.zoom));
  try { localStorage.setItem('hss-tourZoom', FB.zoom); } catch (e) { /* ohne Speicher */ }
}
function updateTour(dt) {
  const t = FB.tour; if (!t) return;
  const mul = FB.tempo;
  if (!t.paused) {
    if (t.pause > 0) t.pause -= dt * mul;
    else if (t.next < t.stops.length && t.stops[t.next].s <= t.s + 0.01) { zeigeHalt(t.next); t.pause = t.stops[t.next].auto ? 3 : 5; t.next++; }
    else if (t.s < t.pl.L) { const cap = t.next < t.stops.length ? t.stops[t.next].s : t.pl.L; t.s = Math.min(cap, t.s + dt * 16 * mul); }
    else if (!t.done) { t.done = true; const c = document.getElementById('stTour'); if (c) c.querySelector('.tk').textContent = `Prozess-Tour · ${t.name} · Tour beendet`; }
  }
  const p = at(t.pl, t.s, new THREE.Vector3()), a = at(t.pl, Math.min(t.pl.L, t.s + 10), new THREE.Vector3()), b = at(t.pl, Math.max(0, t.s - 10), new THREE.Vector3());
  const d = a.sub(b); d.y = 0;
  if (d.lengthSq() > 4) t.dir.lerp(d.normalize(), 1 - Math.exp(-dt * 2)).normalize();
  const side = new THREE.Vector3(-t.dir.z, 0, t.dir.x), z = FB.zoom;
  const want = p.clone().addScaledVector(t.dir, -38 * z).addScaledVector(side, 18 * z).add(new THREE.Vector3(0, 34 * z, 0));
  S3.camera.position.lerp(want, 1 - Math.exp(-dt * 1.6));
  t.look.lerp(p, 1 - Math.exp(-dt * 3));
  S3.camera.lookAt(t.look); S3.controls.target.copy(t.look);
  tMark.position.copy(p); tRing.position.copy(p); tPole.position.copy(p).add(new THREE.Vector3(0, 4.2 + 0.4 * Math.sin(performance.now() / 300), 0));
  tRing.scale.setScalar(1 + 0.25 * Math.sin(performance.now() / 250));
  let pe = document.getElementById('tourPos'); if (!pe) { pe = document.createElement('div'); pe.id = 'tourPos'; pe.innerHTML = '<span>Aktuelle Position</span><svg viewBox="0 0 26 22"><path d="M0 0h26L13 22z" fill="#0A967A"/></svg>'; document.body.appendChild(pe); }
  const sp = p.clone().add(new THREE.Vector3(0, 3, 0)).project(S3.camera), rc = S3.renderer.domElement.getBoundingClientRect();
  pe.hidden = sp.z > 1; pe.style.left = (rc.left + (sp.x + 1) / 2 * rc.width) + 'px'; pe.style.top = (rc.top + (1 - sp.y) / 2 * rc.height) + 'px';
  const c = document.getElementById('stTour'); if (c) c.querySelector('.bar i').style.width = `${(t.s / (t.pl.L || 1)) * 100}%`;
  HSS.perf?.invalidate(1);
}
window.addEventListener('keydown', e => { if (e.key !== 'Escape' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return; if (FB.tour) FB.stopTour(); else if (FB.sel) FB.waehle(null); });
let wheelOn = false;
const wheel = () => { if (wheelOn || !S3.renderer) return; wheelOn = true; S3.renderer.domElement.addEventListener('wheel', ev => { if (!FB.tour) return; ev.preventDefault(); ev.stopImmediatePropagation(); setZoom(FB.zoom * (ev.deltaY > 0 ? 1.12 : 1 / 1.12)); }, { passive: false, capture: true }); };

/* ---------- Hervorhebung eines Flusses (angeklickt oder auf Tour) ---------- */
let hl = null;
function hilite() {
  if (!layer) return;
  if (hl) { layer.remove(hl); hl = null; }
  const ids = FB.tour?.flows ? [...FB.tour.flows] : FB.sel ? [FB.sel] : [];
  if (!ids.length) return;
  const prj = HSS.project(); hl = new THREE.Group(); hl.renderOrder = 9;
  for (const id of ids) {
    const f = U.byId(prj.flows, id); if (!f) continue;
    const m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport), sk = FB.stromOf(f, prj);
    const pts = HSS.routeAnzeige(HSS.route(f.von, f.nach, t?.mittel || 'hand', m?.reinheit || 'neutral')).map(exY).map(q => new THREE.Vector3(q[0], q[1] + 1.2, q[2]));
    const gi = [], go = [];
    for (let i = 0; i < pts.length - 1; i++) { const c = cyl(pts[i], pts[i + 1], 0.55), o = cyl(pts[i], pts[i + 1], 0.8); if (c) gi.push(c, ball(pts[i + 1], 0.55)); if (o) go.push(o); }
    if (!gi.length) continue;
    const mi = new THREE.Mesh(mergeGeometries(gi.map(g => g.index ? g.toNonIndexed() : g), false), new THREE.MeshBasicMaterial({ color: sk.farbe, depthTest: false }));
    const mo = new THREE.Mesh(mergeGeometries(go.map(g => g.index ? g.toNonIndexed() : g), false), new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, transparent: true, opacity: 0.85 }));
    mo.renderOrder = 30; mi.renderOrder = 31; hl.add(mo, mi);
    for (const [q, c] of [[pts[0], '#0A967A'], [pts[pts.length - 1], '#c0392b']]) { const k = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: c, depthTest: false })); k.position.copy(q); k.renderOrder = 32; hl.add(k); }
  }
  layer.add(hl); HSS.perf?.invalidate(2);
}

/* ---------- Fluss im 3D-Bild anklicken ---------- */
FB.pick = (ev) => {
  const rc = S3.renderer.domElement.getBoundingClientRect(), mx = ev.clientX - rc.left, my = ev.clientY - rc.top;
  const v = new THREE.Vector3(), scr = q => { v.set(q[0], q[1] + 1.2, q[2]).project(S3.camera); return v.z > 1 ? null : [(v.x + 1) / 2 * rc.width, (1 - v.y) / 2 * rc.height]; };
  let best = null;
  for (const x of routes) {
    const P = x.pts.map(exY);
    for (let i = 0; i < P.length - 1; i++) {
      if (!FB.gfSichtbar(P[i][3]) && !FB.gfSichtbar(P[i + 1][3])) continue;
      const a = scr(P[i]), b = scr(P[i + 1]); if (!a || !b) continue;
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, t = U.clamp(((mx - a[0]) * dx + (my - a[1]) * dy) / L2, 0, 1);
      const d = Math.hypot(a[0] + dx * t - mx, a[1] + dy * t - my);
      if (d < 9 && (!best || d < best.d)) best = { d, f: x.f };
    }
  }
  return best?.f || null;
};
FB.waehle = (fid) => { FB.sel = fid; emphasis(); hilite(); karte2(); };
(() => {
  const vp = document.getElementById('viewport'); if (!vp) return;
  let dn = null;
  vp.addEventListener('pointerdown', e => { dn = e.button === 0 ? [e.clientX, e.clientY] : null; }, true);
  // Überfahren: Flussname und Menge als Hinweis
  let tT = 0;
  vp.addEventListener('pointermove', e => {
    if (!FB.on || FB.tour || S3.tool || e.buttons || e.target !== S3.renderer.domElement) { S3._tipFluss = false; return; }
    const now = performance.now(); if (now - tT < 120) return; tT = now;
    const f = FB.pick(e), tip = HSS.ui?.tipEl; S3._tipFluss = !!f; if (!f || !tip) return;
    const prj = HSS.project(), m = U.byId(prj.materials, f.material), sk = FB.stromOf(f, prj);
    tip.innerHTML = `<b style="color:${U.esc(sk.farbe)}">●</b> <b>${U.esc(f.name)}</b><div class="s">${U.fmt(HSS.flowPerDay(f), 1)} ${U.esc(m?.einheit || '')}/Tag · anklicken für Stationen</div>`;
    tip.hidden = false; tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 12) + 'px'; S3.renderer.domElement.style.cursor = 'pointer';
  }, true);
  vp.addEventListener('pointerup', e => {
    if (!FB.on || FB.tour || S3.tool || !dn || Math.hypot(e.clientX - dn[0], e.clientY - dn[1]) > 5 || e.target !== S3.renderer.domElement) return;
    const f = FB.pick(e);
    if (f) { S3._klickVerbraucht = true; FB.waehle(f.id); }
    else if (FB.sel) FB.waehle(null);
  }, true);
})();

/* ---------- Fluss-Karte: Stationen, Zwischenstopps, abfahren ---------- */
const kette = (prj, f) => f.kette ? prj.flows.filter(x => x.kette === f.kette).sort((a, b) => (a.etappe || 0) - (b.etappe || 0)) : [f];
function karte2() {
  let el = document.getElementById('flKarte');
  const prj = HSS.project(), f = FB.sel && U.byId(prj.flows, FB.sel);
  if (!f) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'flKarte'; el.className = 'vw-fluss'; document.body.appendChild(el); }
  const K = kette(prj, f), PL = new Map(HSS.places(prj).map(p => [p.id, p])), net = HSS.net();
  const m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport), sk = FB.stromOf(f, prj);
  const nm = id => U.esc(PL.get(id)?.name || id);
  let len = 0, min = 0, lifts = 0;
  const legs = K.map(x => { const mm = U.byId(prj.materials, x.material), tt = U.byId(prj.transports, x.transport), r = HSS.route(x.von, x.nach, tt?.mittel || 'hand', mm?.reinheit || 'neutral'); len += r.len || 0; min += r.timeMin || 0; lifts += r.lifts.length; return { x, r }; });
  const info = r => { const o = []; for (const L of r.lifts) { const N = net.lifts.find(q => q.id === L.lift); o.push(`↕ ${U.esc(N?.name || 'Aufzug')}: ${HSS.floorName(L.from)} → ${HSS.floorName(L.to)}`); } const out = U.sum(r.edges.filter(e => ['strasse', 'zufahrt', 'weg', 'gehweg'].includes(e.type)).map(e => e.len)); if (out > 15) o.push(`☁ ${U.fmt(out)} m im Freien`); if (r.gezeichnet) o.push('✎ gezeichneter Weg'); if (r.via) o.push('über festgelegten Aufzug/Treppe'); if (!r.ok) o.push('<span class="err">keine Route</span>'); return o.join('<br>'); };
  el.hidden = false;
  el.innerHTML = `<div class="fkh"><i style="background:${U.esc(sk.farbe)}"></i><b>${U.esc(f.name.replace(/ · Etappe \d+\/\d+$/, ''))}</b><button class="mini x" data-fx title="Schließen">×</button></div>
    <div class="note">${U.esc(sk.name)} · ${U.esc(m?.name || '')} · ${U.esc(t?.name.split(' (')[0] || '')}</div>
    <div class="fkst"><span><b>${U.fmt(HSS.flowPerDay(f), 1)}</b> ${U.esc(m?.einheit || '')}/Tag</span><span><b>${U.fmt(len)}</b> m</span><span><b>${U.dur ? U.dur(min) : U.fmt(min, 1) + ' min'}</b></span><span><b>${lifts}</b> Aufzug</span></div>
    <div class="fkl">
      <div class="fks start"><i>A</i><div><b>${nm(K[0].von)}</b><div class="note">Start</div></div></div>
      ${legs.map(({ x, r }, i) => `<div class="fkleg"><div class="note">${info(r) || '→'}</div><button class="mini" data-add="${i}" title="Zwischenstopp in diesem Abschnitt einfügen">+ Zwischenstopp</button><div class="fkform" data-form="${i}" hidden></div></div>
      <div class="fks ${i === K.length - 1 ? 'ziel' : 'zw'}"><i>${i === K.length - 1 ? 'B' : i + 1}</i><div><b>${nm(x.nach)}</b><div class="note">${i === K.length - 1 ? 'Ziel' : 'Zwischenstopp ' + (i + 1)}</div></div>${i < K.length - 1 ? `<button class="mini" data-rm="${i}" title="Zwischenstopp entfernen">×</button>` : ''}</div>`).join('')}
    </div>
    <div class="actions"><button class="primary" data-tour>▶ Fluss abfahren</button><button data-edit>Bearbeiten</button></div>`;
  el.querySelector('[data-fx]').onclick = () => FB.waehle(null);
  el.querySelector('[data-tour]').onclick = () => { const id = f.id; FB.waehle(null); FB.startFlussTour(id); };
  el.querySelector('[data-edit]').onclick = () => { HSS.ui.flowTab = 'fluesse'; HSS.ui.flowSel = f.id; if (HSS.ui.current !== 'fluesse') HSS.ui.setWS('fluesse'); else HSS.ui.renderPanel(); document.body.classList.remove('nopanel'); };
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => FB.stoppEntfernen(f.id, +b.dataset.rm));
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => {
    const i = +b.dataset.add, box = el.querySelector(`[data-form="${i}"]`), FA = HSS.flussAssistent, B = FA.eigene(prj);
    if (!box.hidden) { box.hidden = true; return; }
    const st = { b: B[0].id, gf: FA.etagen(B[0]).includes(0) ? 0 : FA.etagen(B[0])[0], ort: '' };
    const draw = () => {
      const bb = U.byId(prj.buildings, st.b), orte = FA.orte(st.b, st.gf, prj).filter(p => p.role !== 'uebergabe');
      box.innerHTML = `<select data-k="b">${B.map(x => `<option value="${x.id}" ${x.id === st.b ? 'selected' : ''}>${U.esc((x.kurz ? x.kurz + ' – ' : '') + x.name)}</option>`).join('')}</select>
        <div class="row"><select data-k="gf">${FA.etagen(bb).map(g => `<option value="${g}" ${g === st.gf ? 'selected' : ''}>${HSS.floorName(g)}</option>`).join('')}</select>
        <select data-k="ort"><option value="">Übergabepunkt auf der Etage</option>${orte.map(p => `<option value="${p.id}" ${p.id === st.ort ? 'selected' : ''}>${U.esc(p.name.split(' · ').slice(1).join(' · '))}</option>`).join('')}</select></div>
        <button class="primary mini" data-ok>Zwischenstopp einfügen</button>`;
      box.querySelectorAll('[data-k]').forEach(s2 => s2.onchange = () => { const k = s2.dataset.k; if (k === 'b') { st.b = s2.value; const fl = FA.etagen(U.byId(prj.buildings, st.b)); st.gf = fl.includes(0) ? 0 : fl[0]; st.ort = ''; } else if (k === 'gf') { st.gf = +s2.value; st.ort = ''; } else st.ort = s2.value; draw(); });
      box.querySelector('[data-ok]').onclick = () => FB.zwischenstopp(f.id, i, st);
    };
    box.hidden = false; draw();
  });
}
// Zwischenstopp einfügen: Abschnitt i (X → Y) wird zu X → P und P → Y
FB.zwischenstopp = (fid, i, st) => {
  let wieder = null;
  HSS.change('Zwischenstopp einfügen', p => {
    const f = U.byId(p.flows, fid), K = kette(p, f), leg = K[i]; if (!leg) return;
    const P = st.ort || HSS.flussAssistent.uebergabe(p, st.b, st.gf); if (!P) return;
    const k = f.kette || U.uid('kette'), base = f.name.replace(/ · Etappe \d+\/\d+$/, '');
    const n = U.clone(leg); n.id = U.uid('flow'); n.von = P; n.nach = leg.nach; leg.nach = P;
    for (const x of [leg, n]) { delete x.pfad; delete x.via; }
    const neu = K.slice(0, i + 1).concat([n], K.slice(i + 1)); p.flows.splice(p.flows.indexOf(leg) + 1, 0, n);
    neu.forEach((x, j) => { x.kette = k; x.etappe = j + 1; x.etappen = neu.length; x.name = `${base} · Etappe ${j + 1}/${neu.length}`; });
    wieder = neu[0].id;
  }, { scope: 'objects' });
  if (wieder) { FB.sel = wieder; setTimeout(() => { FB.build(); FB.waehle(wieder); HSS.ui?.toast('Zwischenstopp eingefügt', 2500); }, 450); }
};
FB.stoppEntfernen = (fid, i) => {
  let wieder = null;
  HSS.change('Zwischenstopp entfernen', p => {
    const f = U.byId(p.flows, fid), K = kette(p, f), a = K[i], b = K[i + 1]; if (!a || !b) return;
    a.nach = b.nach; delete a.pfad; delete a.via; p.flows = p.flows.filter(x => x.id !== b.id);
    const neu = K.filter(x => x.id !== b.id), base = f.name.replace(/ · Etappe \d+\/\d+$/, '');
    neu.forEach((x, j) => { x.etappe = j + 1; x.etappen = neu.length; x.name = neu.length > 1 ? `${base} · Etappe ${j + 1}/${neu.length}` : base; });
    wieder = neu[0].id;
  }, { scope: 'none' });
  if (wieder) setTimeout(() => { FB.build(); FB.waehle(wieder); }, 450);
};

/* ---------- Ein/Aus, Ansicht speichern ---------- */
FB.set = (on) => {
  if (!on) { FB.stopTour(); FB.playing = false; FB.sel = null; karte2(); }
  FB.on = on; document.body.classList.toggle('flussbild', on);
  const b = document.getElementById('vFlow'); if (b) b.classList.toggle('on', on);
  // Gebäude gläsern, damit die Ströme im Haus zu sehen sind
  if (on && V.shell !== 'glas') { shell0 = V.shell; V.shell = 'glas'; S3.rebuild('all'); }
  if (!on && V.shell === 'glas') { V.shell = shell0 && shell0 !== 'glas' ? shell0 : 'massiv'; S3.rebuild('all'); }
  const sel = document.getElementById('vShell'); if (sel) sel.value = V.shell;
  FB.build();
};
FB.toggle = () => FB.set(!FB.on);
FB.state = () => FB.on ? { aus: [...FB.aus], personen: FB.personen, routes: FB.routes, move: FB.move, hour: FB.hour, etagen: [...FB.etagen], folge: FB.folge } : null;
FB.restore = st => { if (!st) return; FB.aus = new Set(st.aus || []); FB.personen = !!st.personen; FB.routes = st.routes !== false; FB.move = st.move !== false; FB.hour = st.hour ?? null; FB.etagen = new Set(st.etagen || []); FB.folge = st.folge !== false; if (FB.on) FB.build(); else FB.set(true); };
// Projekt- oder Netzänderungen: neu aufbauen (verzögert)
const rebuild = U.debounce(() => { if (FB.on) FB.build(); }, 400);
HSS.on('changed', rebuild);
HSS.on('simplay', () => { if (FB.on) FB.build(); });
let lastView = '';
HSS.on('view', () => { const k = V.floor + '|' + V.explode; if (k !== lastView) { lastView = k; if (FB.on) FB.build(); } }); HSS.on('loaded', () => { FB.stopTour(); FB.playing = false; FB.hour = null; if (FB.on) setTimeout(FB.build, 50); });
// Arbeitsbereich „Flüsse“: Warenströme automatisch zeigen
HSS.on('workspace', ws => { if (ws === 'fluesse' && !FB.on && HSS.project().flows.length && !HSS.state.viewer) { FB.set(true); HSS.ui.renderPanel(); } });
// Simulations-Zeitleiste und Tagesachse nicht übereinander
let tlAn = document.body.classList.contains('timeline');
new MutationObserver(() => { const a = document.body.classList.contains('timeline'); if (a !== tlAn) { tlAn = a; if (FB.on) achse(); } }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

(() => {
  const vb = document.getElementById('vM2');
  if (vb && !document.getElementById('vFlow')) { const b = document.createElement('button'); b.className = 'tgl vw-fluss'; b.id = 'vFlow'; b.title = 'Warenströme: alle Flüsse als farbige Bänder je Strom (Speisen, Wäsche, Sterilgut …), Tagesachse und Prozess-Tour'; b.textContent = 'Warenströme'; b.onclick = () => FB.toggle(); vb.before(b); }
  const sh = document.getElementById('vShell'); if (sh && !sh.querySelector('option[value="glas"]')) sh.insertAdjacentHTML('beforeend', '<option value="glas">gläsern</option>');
})();
})();
