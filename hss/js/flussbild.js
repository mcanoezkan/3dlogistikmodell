/* =====================================================================
   HSS · flussbild.js – Material- und Logistikflüsse als kräftige Bänder
   Alle aktiven Flüsse werden über das Wegenetz geroutet und je Wegabschnitt
   und Material zusammengefasst: ein farbiges Rohr je Material, so dick wie
   die Zahl der Fahrten pro Tag, mit Pfeilen in Fahrtrichtung. Materialien
   laufen auf eigenen Spuren nebeneinander. Dazu bewegen sich Wagen, Personen
   und LKW auf ihren Routen (ohne Simulation, als Animation).
   Gebäudehüllen werden dabei gläsern, damit die Flüsse im Gebäude sichtbar sind.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const { THREE, mergeGeometries } = window.THREEX;
const S3 = HSS.s3, V = HSS.view;
const FB = HSS.flussbild = { on: false, move: true, aus: new Set(), animating: false, personen: false };
let layer = null, movers = [], routes = [], shell0 = null;

const UP = new THREE.Vector3(0, 1, 0);
const matCache = new Map();
const fmat = (c) => { if (!matCache.has(c)) { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.5, metalness: 0.05, transparent: true, opacity: 0.92 }); m.userData.noToon = true; matCache.set(c, m); } return matCache.get(c); };
const solid = (c) => { const k = 's' + c; if (!matCache.has(k)) { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.05 }); m.userData.noToon = true; matCache.set(k, m); } return matCache.get(k); };

/* ---------- Routen aller Flüsse ---------- */
function collect() {
  const prj = HSS.project(); HSS.ensureStammdaten?.(prj);
  const out = [];
  for (const f of prj.flows) {
    if (f.aktiv === false) continue;
    const m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport);
    if (!m) continue;
    const r = HSS.route(f.von, f.nach, t?.mittel || 'hand', m.reinheit || 'neutral'); if (!r.ok || r.pts.length < 2) continue;
    const perDay = HSS.flowPerDay(f), trips = Math.max(0.2, perDay / Math.max(1, m.proLadung || 1));
    out.push({ f, m, t, r, perDay, trips, mittel: t?.mittel || 'hand' });
  }
  return out;
}

/* ---------- Geometrie ---------- */
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();
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
  while (layer.children.length) layer.remove(layer.children[0]);
  movers = []; routes = [];
  if (!FB.on) { legend(); HSS.perf?.invalidate(2); return; }
  const all = collect();
  const mats = [...new Map(all.map(x => [x.m.id, x.m])).values()];
  const laneOf = new Map(mats.map((m, i) => [m.id, (i - (mats.length - 1) / 2) * 0.95]));
  const maxTrips = Math.max(1, ...all.filter(x => x.m.reinheit !== 'person' || FB.personen).map(x => x.trips));
  const rad = trips => 0.16 + 0.5 * Math.sqrt(trips / maxTrips);
  // Abschnitte je Material und Richtung zusammenfassen
  const seg = new Map(); // key → { m, a, b, trips }
  for (const x of all) {
    if (FB.aus.has(x.m.id) || (x.m.reinheit === 'person' && !FB.personen)) continue;
    const ids = x.r.nodes;
    for (let i = 0; i < x.r.pts.length - 1; i++) {
      const k = x.m.id + '|' + ids[i] + '>' + ids[i + 1];
      const s = seg.get(k) || { m: x.m, a: x.r.pts[i], b: x.r.pts[i + 1], trips: 0, mittel: x.mittel }; s.trips += x.trips; seg.set(k, s);
    }
    routes.push(x);
  }
  // je Material ein Netz: Rohre, Gelenke, Pfeile
  const byMat = new Map();
  for (const s of seg.values()) { if (!byMat.has(s.m.id)) byMat.set(s.m.id, { m: s.m, geos: [] }); }
  for (const s of seg.values()) {
    const lane = laneOf.get(s.m.id), h = (HOEHE[s.mittel] || 1.1) + (lane > 0 ? 0.05 : 0);
    const [a, b] = offsetPts([s.a, s.b], lane, h), r = rad(s.trips), G = byMat.get(s.m.id).geos;
    const c = cyl(a, b, r); if (c) G.push(c);
    G.push(ball(b, r));
    const len = a.distanceTo(b);
    if (len > 9) for (let d = 6; d < len - 2; d += 16) { _d.subVectors(b, a).normalize(); G.push(cone(a.clone().addScaledVector(_d, d), _d.clone(), r)); }
    else if (len > 3 && Math.abs(b.y - a.y) < 0.5 && (s.a[0] * 7 + s.a[2] * 13) % 3 < 1) { _d.subVectors(b, a).normalize(); G.push(cone(a.clone().lerp(b, 0.5), _d.clone(), r)); }
  }
  for (const { m, geos } of byMat.values()) {
    if (!geos.length) continue;
    const mesh = new THREE.Mesh(mergeGeometries(geos.map(g => g.index ? g.toNonIndexed() : g), false), fmat(m.farbe || '#2D7694'));
    mesh.userData = { flow: m.id }; mesh.renderOrder = 6; mesh.raycast = () => {}; layer.add(mesh);
  }
  // Bewegte Wagen, Personen und LKW auf ihren Routen
  if (FB.move) for (const x of routes) {
    const n = Math.min(3, Math.max(1, Math.round(Math.sqrt(x.trips) / 2)));
    const lane = laneOf.get(x.m.id), h = (HOEHE[x.mittel] || 1.1);
    const pts = offsetPts(x.r.pts, lane, 0); const pl = poly(pts); if (pl.L < 4) continue;
    for (let i = 0; i < n; i++) {
      const mesh = moverMesh(x); layer.add(mesh);
      movers.push({ mesh, pl, phase: (i / n + Math.random() * 0.15) % 1, speed: x.mittel === 'lkw' || x.mittel === 'transporter' ? 9 : x.mittel === 'awt' ? 2.5 : 1.6, lift: h });
    }
  }
  FB.animating = FB.move && movers.length > 0;
  legend(); HSS.perf?.invalidate(3);
};

/* ---------- Bewegungen ---------- */
function poly(pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1])); return { pts, cum, L: cum[cum.length - 1] }; }
function at(pl, s, out) {
  if (s <= 0) return out.copy(pl.pts[0]); if (s >= pl.L) return out.copy(pl.pts[pl.pts.length - 1]);
  let lo = 1, hi = pl.cum.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (pl.cum[mid] < s) lo = mid + 1; else hi = mid; }
  const t = (s - pl.cum[lo - 1]) / ((pl.cum[lo] - pl.cum[lo - 1]) || 1); return out.copy(pl.pts[lo - 1]).lerp(pl.pts[lo], t);
}
const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); return o; };
function truck() {
  const g = new THREE.Group();
  g.add(box(5.4, 2.6, 2.3, solid('#eef1f4'), -0.9, 0.7, 0), box(1.7, 2.0, 2.2, solid('#0A223C'), 2.6, 0.7, 0), box(0.06, 0.8, 1.9, solid('#9fc3dc'), 3.46, 1.75, 0), box(4.2, 0.35, 0.03, solid('#2D7694'), -0.9, 2.3, 1.16), box(4.2, 0.35, 0.03, solid('#2D7694'), -0.9, 2.3, -1.16));
  for (const x of [-2.7, 0.2, 2.6]) for (const z of [-1.05, 1.05]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.32, 12), solid('#3F4A55')); w.rotation.x = Math.PI / 2; w.position.set(x, 0.48, z); g.add(w); }
  return g;
}
const capsGeo = new THREE.CapsuleGeometry(0.28, 1.0, 4, 8), cubeGeo = new THREE.BoxGeometry(1.1, 0.9, 0.8);
function moverMesh(x) {
  if (x.mittel === 'lkw' || x.mittel === 'transporter') { const t = truck(); if (x.mittel === 'transporter') t.scale.setScalar(0.7); return t; }
  const c = x.m.farbe || '#2D7694';
  if (x.m.reinheit === 'person' || x.m.reinheit === 'patient') { const g = new THREE.Group(); const o = new THREE.Mesh(capsGeo, solid(c)); o.position.y = 0.8; g.add(o); if (x.m.reinheit === 'patient') g.add(box(2.1, 0.5, 0.95, solid('#eef1f4'), 0, 0.35, 0)); return g; }
  const g = new THREE.Group(); g.add(box(1.1, 0.95, 0.8, solid(c), 0, 0.2, 0)); g.add(box(1.15, 0.08, 0.85, solid('#3F4A55'), 0, 0.1, 0)); return g;
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
let T = 0;
HSS.on('frame', dt => {
  if (!FB.animating || !layer?.visible) return;
  T += dt;
  for (const mv of movers) {
    const s = ((T * mv.speed / mv.pl.L) + mv.phase) % 1;
    at(mv.pl, s * mv.pl.L, _p); at(mv.pl, Math.min(mv.pl.L, s * mv.pl.L + 1), _n);
    mv.mesh.position.copy(_p);
    const dx = _n.x - _p.x, dz = _n.z - _p.z; if (dx * dx + dz * dz > 1e-5) mv.mesh.rotation.y = -Math.atan2(dz, dx);
  }
});

/* ---------- Legende ---------- */
function legend() {
  let el = document.getElementById('fbLegend');
  if (!FB.on) { if (el) el.hidden = true; return; }
  if (!el) { el = document.createElement('div'); el.id = 'fbLegend'; document.body.appendChild(el); }
  const all = collect(), by = new Map();
  for (const x of all) { const e = by.get(x.m.id) || { m: x.m, trips: 0, menge: 0, n: 0 }; e.trips += x.trips; e.menge += x.perDay; e.n++; by.set(x.m.id, e); }
  const rows = [...by.values()].sort((a, b) => b.trips - a.trips);
  el.hidden = false;
  el.innerHTML = `<div class="zh"><b>Flussbild</b><span>${all.length} Flüsse · ${U.fmt(U.sum(rows.map(r => r.trips)))} Fahrten/Tag</span><button class="mini" data-fx title="Flussbild schließen">×</button></div>
    <div class="zl">${rows.map(r => { const off = FB.aus.has(r.m.id) || (r.m.reinheit === 'person' && !FB.personen); return `<label class="zi ${off ? 'dim' : ''}"><input type="checkbox" data-fm="${r.m.id}" data-pers="${r.m.reinheit === 'person' ? 1 : ''}" ${off ? '' : 'checked'}><i style="background:${U.esc(r.m.farbe || '#2D7694')}"></i><span>${U.esc(r.m.name)}</span><b>${U.fmt(r.menge)} ${U.esc(r.m.einheit || '')}</b><small>${U.fmt(r.trips, 1)} F.</small></label>`; }).join('') || '<div class="note" style="padding:6px 8px">Noch keine Flüsse – im Arbeitsbereich „Flüsse“ Standardflüsse übernehmen.</div>'}</div>
    <div class="zfoot"><label class="chk"><input type="checkbox" data-fmove ${FB.move ? 'checked' : ''}> Bewegung</label><span>Dicke = Fahrten pro Tag</span></div>`;
  el.querySelector('[data-fx]').onclick = () => FB.set(false);
  el.querySelectorAll('[data-fm]').forEach(c => c.onchange = () => { if (c.dataset.pers && c.checked) FB.personen = true; if (c.checked) FB.aus.delete(c.dataset.fm); else FB.aus.add(c.dataset.fm); FB.build(); });
  el.querySelector('[data-fmove]').onchange = e => { FB.move = e.target.checked; FB.build(); };
}

/* ---------- Ein/Aus ---------- */
FB.set = (on) => {
  FB.on = on; document.body.classList.toggle('flussbild', on);
  const b = document.getElementById('vFlow'); if (b) b.classList.toggle('on', on);
  // Gebäude gläsern, damit die Flüsse im Haus zu sehen sind
  if (on && V.shell !== 'glas') { shell0 = V.shell; V.shell = 'glas'; S3.rebuild('all'); }
  if (!on && V.shell === 'glas') { V.shell = shell0 && shell0 !== 'glas' ? shell0 : 'massiv'; S3.rebuild('all'); }
  const sel = document.getElementById('vShell'); if (sel) sel.value = V.shell;
  FB.build();
};
FB.toggle = () => FB.set(!FB.on);
// Projekt- oder Netzänderungen: neu aufbauen (verzögert)
const rebuild = U.debounce(() => { if (FB.on) FB.build(); }, 400);
HSS.on('changed', rebuild); HSS.on('loaded', () => { if (FB.on) setTimeout(FB.build, 50); });

(() => {
  const vb = document.getElementById('vM2');
  if (vb && !document.getElementById('vFlow')) { const b = document.createElement('button'); b.className = 'tgl'; b.id = 'vFlow'; b.title = 'Flussbild: alle Material- und Logistikflüsse als farbige Bänder mit Pfeilen, Dicke nach Fahrten pro Tag, mit bewegten Wagen und LKW'; b.textContent = 'Flussbild'; b.onclick = () => FB.toggle(); vb.before(b); }
  const sh = document.getElementById('vShell'); if (sh && !sh.querySelector('option[value="glas"]')) sh.insertAdjacentHTML('beforeend', '<option value="glas">gläsern</option>');
})();
})();
