/* =====================================================================
   HSS · plan2d.js – 2D-Planansicht (Lageplan) mit Zeichenwerkzeugen
   · Umschalten 2D ⇄ 3D: Draufsicht wie ein Lageplan (fast parallele Projektion
     durch sehr kleinen Öffnungswinkel), Norden oben, Maus verschiebt, Rad zoomt
   · Gebäude im Grundriss zeichnen: Rechteck aufziehen, gedrehtes Rechteck
     (Kante anklicken, Tiefe ziehen) oder freies Vieleck – danach in 3D in die
     Höhe ziehen (blauer ⇕-Griff, ＋G) oder Geschosse im Inspektor eintragen
   · Wege, Straßen und Flächen lassen sich in 2D genauso zeichnen
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$;
const { THREE } = window.THREEX;
const S3 = HSS.s3;
const P2 = HSS.plan2d = { on: false };
const FOV2D = 3.2, K = () => Math.tan(U.rad(22.5)) / Math.tan(U.rad(S3.camera.fov / 2));
const snap = (v, s = 0.5) => Math.round(v / s) * s;
const lineMat = new THREE.LineBasicMaterial({ color: '#0A967A', depthTest: false });
const fillMat = new THREE.MeshBasicMaterial({ color: '#0A967A', transparent: true, opacity: 0.22, depthTest: false, side: THREE.DoubleSide });
const ghost = () => S3.layers.ghost;
const clearGhost = () => { const g = ghost(); while (g.children.length) g.remove(g.children[0]); };
const drawPoly = (pts, closed = true) => {
  clearGhost(); if (pts.length < 2) return;
  const y = 0.6, v = pts.map(p => new THREE.Vector3(p[0], HSS.terrainH(p[0], p[1]) + y, p[1]));
  if (closed) v.push(v[0].clone());
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), lineMat); l.renderOrder = 45; ghost().add(l);
  if (closed && pts.length >= 3) { const sh = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); g.translate(0, y + HSS.terrainH(pts[0][0], pts[0][1]), 0); const m = new THREE.Mesh(g, fillMat); m.renderOrder = 44; ghost().add(m); }
  HSS.perf?.invalidate(2);
};

/* ---------- Umschalten ---------- */
P2.set = (on) => {
  if (on === P2.on) return;
  const C = S3.controls, cam = S3.camera;
  if (S3.fpvActive) HSS.fpv.exit();
  P2.on = on; document.body.classList.toggle('plan2d', on);
  if (on) {
    P2.prev = { pos: cam.position.clone(), tgt: C.target.clone(), fov: cam.fov, far: cam.far, maxD: C.maxDistance, minD: C.minDistance, maxP: C.maxPolarAngle, rot: C.enableRotate, left: C.mouseButtons.LEFT, ssp: C.screenSpacePanning };
    const d = cam.position.distanceTo(C.target);
    cam.fov = FOV2D; cam.far = 200000; cam.updateProjectionMatrix();
    const k = K();
    C.maxDistance = 1800 * k; C.minDistance = 6 * k; C.enableRotate = false; C.maxPolarAngle = 0.0001; C.minPolarAngle = 0; C.screenSpacePanning = true;
    C.mouseButtons.LEFT = THREE.MOUSE.PAN;
    cam.position.set(C.target.x, C.target.y + d * k * 0.8, C.target.z + 0.001); cam.up.set(0, 1, 0); C.update();
    S3.renderer.shadowMap.enabled = false; HSS.perf?.shadows();
  } else {
    const p = P2.prev || {}; const d = cam.position.distanceTo(C.target) / K();
    cam.fov = p.fov || 45; cam.far = p.far || 6000; cam.updateProjectionMatrix();
    C.maxDistance = p.maxD || 1800; C.minDistance = p.minD || 2; C.enableRotate = true; C.maxPolarAngle = p.maxP || Math.PI * 0.495; C.minPolarAngle = 0; C.screenSpacePanning = p.ssp ?? false; C.mouseButtons.LEFT = p.left ?? THREE.MOUSE.ROTATE;
    const t = C.target.clone(); cam.position.set(t.x - d * 0.5, t.y + d * 0.62, t.z + d * 0.6); C.update();
    S3.renderer.shadowMap.enabled = HSS.view.stil !== 'plan'; HSS.perf?.shadows();
    if (S3.tool?.plan2d) S3.setTool(null);
  }
  HSS.perf?.invalidate(4); P2.palette(); HSS.emit('view');
  $('#v2d') && ($('#v2d').textContent = on ? '3D-Ansicht' : '2D-Plan', $('#v2d').classList.toggle('on', on));
};
P2.toggle = () => HSS.plan2d.set(!P2.on);
// Kamerafunktionen im 2D-Modus: Abstand wegen des kleinen Öffnungswinkels skalieren, immer senkrecht von oben
const focusBox0 = S3.focusBox, home0 = S3.home, zoom0 = S3.zoom;
S3.focusBox = (box, opts = {}) => {
  if (!P2.on) return focusBox0(box, opts);
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(30, Math.max(s.x, s.z) * 1.3) * K() * 1.2 * (opts.k || 1);
  S3.animateCam(new THREE.Vector3(c.x, c.y + r, c.z + 0.001), c, opts.ms || 600);
};
S3.home = () => {
  if (!P2.on) return home0();
  const prj = HSS.project(), box = new THREE.Box3();
  for (const pt of HSS.allParts(prj)) for (const [x, z] of HSS.partFootprint(pt).outer) box.expandByPoint(new THREE.Vector3(x, 0, z));
  for (const p of prj.paths) for (const [x, z] of p.points) box.expandByPoint(new THREE.Vector3(x, 0, z));
  if (box.isEmpty()) box.set(new THREE.Vector3(-80, 0, -80), new THREE.Vector3(80, 0, 80));
  S3.focusBox(box, { k: 0.95 });
};
S3.zoom = k => zoom0(k);

/* ---------- Werkzeuge ---------- */
const nextKurz = prj => { const letters = 'ABCDEFGHJKLMNPRSTUVWXYZ', used = new Set(prj.buildings.map(b => b.kurz)); return [...letters].find(l => !used.has(l)) || 'X'; };
const COLORS = ['#144477', '#0A967A', '#2D7694', '#891F5E', '#d9531e', '#6b2c82', '#e3ac0c'];
function createBuilding(partProps, label) {
  const prj = HSS.project(), kurz = nextKurz(prj);
  const b = Object.assign(HSS.defaults.building(), { name: `${label || 'Gebäude'} ${kurz}`, kurz, color: COLORS[prj.buildings.length % COLORS.length] });
  const pt = Object.assign(HSS.defaults.part(), { name: label || 'Bauteil', floors: P2.floors || 4, basements: 0 }, partProps);
  b.parts.push(pt);
  HSS.manip?.mark();
  HSS.change('Gebäude zeichnen', p => p.buildings.push(b));
  S3.select({ kind: 'part', id: pt.id });
  UI.toast(`${b.name}: ${U.fmt(pt.w)} × ${U.fmt(pt.d)} m · ${pt.floors} Geschosse – in 3D mit dem blauen ⇕ in die Höhe ziehen`, 4200);
  return pt;
}
/* Rechteck aufziehen (achsparallel) */
P2.toolRect = () => {
  S3.select(null); let a = null, b = null;
  S3.setTool({
    name: 'rect2d', plan2d: true,
    down(ev) { if (ev.button !== 0) return; const gp = S3.groundPoint(ev); if (!gp) return; a = [snap(gp.x), snap(gp.z)]; b = a.slice(); S3.controls.enabled = false; },
    move(ev) { const gp = S3.groundPoint(ev); if (!gp) return; if (!a) { UI.hint(`<b>Gebäude zeichnen</b>: Rechteck aufziehen · Umschalt: Quadrat · ${U.fmt(gp.x, 1)} / ${U.fmt(gp.z, 1)}`); return; } b = [snap(gp.x), snap(gp.z)]; if (ev.shiftKey) { const s = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); b = [a[0] + Math.sign(b[0] - a[0] || 1) * s, a[1] + Math.sign(b[1] - a[1] || 1) * s]; } drawPoly([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]); UI.hint(`<b>${U.fmt(Math.abs(b[0] - a[0]), 1)} × ${U.fmt(Math.abs(b[1] - a[1]), 1)} m</b> = ${U.fmt(Math.abs((b[0] - a[0]) * (b[1] - a[1])))} m² je Geschoss`); },
    up() {
      S3.controls.enabled = true; if (!a || !b) return;
      const w = Math.abs(b[0] - a[0]), d = Math.abs(b[1] - a[1]);
      if (w >= 4 && d >= 4) { clearGhost(); createBuilding({ shape: 'rect', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, w, d, rot: 0 }, 'Gebäude'); S3.setTool(null); }
      a = b = null;
    },
    click() {}, cancel() { S3.controls.enabled = true; clearGhost(); UI.hint(null); }
  });
  UI.hint('<b>Gebäude zeichnen</b>: Rechteck mit gedrückter Maustaste aufziehen · Esc: abbrechen');
};
/* gedrehtes Rechteck: 1. Klick Ecke, 2. Klick Ende der ersten Kante, Maus = Tiefe, 3. Klick fertig */
P2.toolRect3 = () => {
  S3.select(null); const pts = []; let cur = null;
  const rectFrom = (A, B, C) => { const ux = B[0] - A[0], uz = B[1] - A[1], L = Math.hypot(ux, uz) || 1, nx = -uz / L, nz = ux / L; const dpt = (C[0] - A[0]) * nx + (C[1] - A[1]) * nz; return { pts: [A, B, [B[0] + nx * dpt, B[1] + nz * dpt], [A[0] + nx * dpt, A[1] + nz * dpt]], L, D: Math.abs(dpt), ang: Math.atan2(uz, ux), n: [nx, nz], dpt }; };
  S3.setTool({
    name: 'rect3', plan2d: true,
    move(ev) {
      const gp = S3.groundPoint(ev); if (!gp) return; cur = [snap(gp.x, 0.25), snap(gp.z, 0.25)];
      if (pts.length === 1) { let q = cur; if (!ev.altKey) { const dx = q[0] - pts[0][0], dz = q[1] - pts[0][1], L = Math.hypot(dx, dz), an = Math.round(Math.atan2(dz, dx) / U.rad(5)) * U.rad(5); q = [pts[0][0] + Math.cos(an) * L, pts[0][1] + Math.sin(an) * L]; } cur = q; drawPoly([pts[0], cur], false); UI.hint(`Kante ${U.fmt(G.dist(pts[0], cur), 1)} m · Richtung ${U.fmt(((U.deg(Math.atan2(cur[1] - pts[0][1], cur[0] - pts[0][0])) % 360) + 360) % 360, 0)}° (5°-Raster, Alt: frei) · klicken`); }
      else if (pts.length === 2) { const r = rectFrom(pts[0], pts[1], cur); drawPoly(r.pts); UI.hint(`<b>${U.fmt(r.L, 1)} × ${U.fmt(r.D, 1)} m</b> = ${U.fmt(r.L * r.D)} m² · klicken zum Fertigstellen`); }
      else UI.hint('<b>Gebäude (gedreht)</b>: erste Ecke anklicken');
    },
    click() {
      if (!cur) return;
      if (pts.length < 2) { pts.push(cur.slice()); return; }
      const r = rectFrom(pts[0], pts[1], cur); if (r.L < 4 || r.D < 4) return UI.toast('Mindestens 4 × 4 m');
      const cx = U.sum(r.pts.map(p => p[0])) / 4, cz = U.sum(r.pts.map(p => p[1])) / 4;
      clearGhost(); S3.setTool(null);
      createBuilding({ shape: 'rect', x: Math.round(cx * 10) / 10, z: Math.round(cz * 10) / 10, w: Math.round(r.L * 10) / 10, d: Math.round(r.D * 10) / 10, rot: Math.round(U.deg(r.ang) * 10) / 10 }, 'Gebäude');
    },
    key(ev) { if (ev.key === 'Backspace') { pts.pop(); return true; } },
    cancel() { clearGhost(); UI.hint(null); }
  });
  UI.hint('<b>Gebäude (gedreht)</b>: erste Ecke anklicken, dann Ende der ersten Kante, dann Tiefe');
};
/* freies Vieleck */
P2.toolPoly = () => {
  S3.select(null); const pts = []; let cur = null;
  const finish = () => {
    if (pts.length < 3) return UI.toast('Mindestens drei Punkte');
    const area = Math.abs(G.area(pts)); if (area < 16) return UI.toast('Fläche zu klein');
    const cx = U.sum(pts.map(p => p[0])) / pts.length, cz = U.sum(pts.map(p => p[1])) / pts.length;
    const poly = G.ccw(pts.map(p => [Math.round((p[0] - cx) * 10) / 10, Math.round((p[1] - cz) * 10) / 10])), bb = G.bbox(poly);
    clearGhost(); S3.setTool(null);
    createBuilding({ shape: 'poly', poly, x: Math.round(cx * 10) / 10, z: Math.round(cz * 10) / 10, w: Math.round(bb.w * 10) / 10, d: Math.round(bb.d * 10) / 10, rot: 0 }, 'Gebäude');
  };
  S3.setTool({
    name: 'poly2d', plan2d: true,
    move(ev) { const gp = S3.groundPoint(ev); if (!gp) return; cur = [snap(gp.x), snap(gp.z)]; if (pts.length && !ev.altKey) { const l = pts[pts.length - 1], dx = cur[0] - l[0], dz = cur[1] - l[1]; const an = Math.round(Math.atan2(dz, dx) / U.rad(15)) * U.rad(15), L = Math.hypot(dx, dz); cur = [snap(l[0] + Math.cos(an) * L, 0.1), snap(l[1] + Math.sin(an) * L, 0.1)]; } if (pts.length >= 3 && G.dist(cur, pts[0]) < 2) cur = pts[0].slice(); drawPoly(pts.concat([cur]), pts.length >= 2); UI.hint(`<b>Vieleck</b> · ${pts.length} Punkte${pts.length >= 2 ? ` · ${U.fmt(Math.abs(G.area(pts.concat([cur]))))} m²` : ''} · Klick: Punkt · Doppelklick, Enter oder Klick auf Startpunkt: fertig · Rücktaste: Punkt zurück · Alt: freier Winkel`); },
    click() { if (!cur) return; if (pts.length >= 3 && G.dist(cur, pts[0]) < 0.01) return finish(); pts.push(cur.slice()); },
    dbl() { if (pts.length >= 3) finish(); },
    key(ev) { if (ev.key === 'Enter') { finish(); return true; } if (ev.key === 'Backspace') { pts.pop(); return true; } },
    cancel() { clearGhost(); UI.hint(null); }
  });
  UI.hint('<b>Vieleck zeichnen</b>: Eckpunkte anklicken (Winkel rasten in 15°-Schritten ein)');
};

/* ---------- Werkzeugleiste im 2D-Modus ---------- */
P2.palette = () => {
  let el = $('#plan2dBar');
  if (!el) { el = document.createElement('div'); el.id = 'plan2dBar'; document.body.appendChild(el); }
  el.hidden = !P2.on; if (!P2.on) return;
  // unter die Ansichtsleiste setzen (sie bricht bei schmalem Fenster in mehrere Zeilen um)
  const lage = () => { const vb = document.getElementById('viewbar'); if (vb && !el.hidden) el.style.top = (vb.getBoundingClientRect().bottom + 8) + 'px'; };
  lage(); if (!P2._lage) { P2._lage = true; window.addEventListener('resize', () => { const b = $('#plan2dBar'); if (b && !b.hidden) { const vb = document.getElementById('viewbar'); b.style.top = (vb.getBoundingClientRect().bottom + 8) + 'px'; } }); }
  el.innerHTML = `<b>2D-Plan</b>
    <button data-t="rect" title="Gebäude als Rechteck aufziehen">▭ Rechteck</button>
    <button data-t="rect3" title="Gedrehtes Rechteck: Kante, dann Tiefe">◇ gedreht</button>
    <button data-t="poly" title="Freier Grundriss (Vieleck)">⬠ Vieleck</button>
    <label title="Geschosse neuer Gebäude">Geschosse <input type="number" id="p2Fl" min="1" max="40" value="${P2.floors || 4}"></label>
    <span class="vsep"></span>
    <button data-t="strasse">Straße</button><button data-t="weg">Weg</button><button data-t="parkplatz">Parkplatz</button><button data-t="gruen">Grün</button>
    <span class="vsep"></span><button data-t="3d" class="primary" title="Zurück in die 3D-Ansicht">3D ansehen</button>`;
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const t = b.dataset.t; b.blur();
    if (t === 'rect') P2.toolRect(); if (t === 'rect3') P2.toolRect3(); if (t === 'poly') P2.toolPoly();
    if (t === 'strasse' || t === 'weg') HSS.tools.drawPath(t);
    if (t === 'parkplatz' || t === 'gruen') HSS.tools.drawArea(t);
    if (t === '3d') HSS.plan2d.set(false);
  });
  el.querySelector('#p2Fl').onchange = e => { P2.floors = U.clamp(+e.target.value || 4, 1, 40); };
};

/* Tiefenauflösung im 2D-Modus: Nahebene knapp über der Szene (sonst flimmern Gelände und Wege) */
HSS.on('frame', () => { if (!P2.on) return; const cam = S3.camera, near = U.clamp(cam.position.y - Math.max(S3.controls.target.y, 0) - 400, 0.5, 1e6); if (Math.abs(cam.near - near) > near * 0.05) { cam.near = near; cam.updateProjectionMatrix(); } });
const exit0 = P2.set; P2.set = on => { exit0(on); if (!on) { S3.camera.near = 0.1; S3.camera.updateProjectionMatrix(); } };
/* Beschriftung im 2D-Modus: Namen zeigen, auch wenn die Kamera rechnerisch weit weg ist */
HSS.on('frame', () => { if (P2.on && document.body.classList.contains('lblfar')) { const d = S3.camera.position.distanceTo(S3.controls.target) / K(); if (d < 330) document.body.classList.remove('lblfar'); } });

/* Einbindung in die Ansichtsleiste */
P2.init = () => {
  const vb = $('#viewbar'); if (!vb || $('#v2d')) return;
  const b = document.createElement('button'); b.id = 'v2d'; b.className = 'tgl'; b.title = 'Lageplan von oben: Gebäude im Grundriss zeichnen, dann in 3D in die Höhe ziehen'; b.textContent = '2D-Plan';
  b.onclick = P2.toggle; vb.insertBefore(b, vb.firstChild);
  window.addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || e.ctrlKey || e.metaKey) return; if (e.key === '2' && !S3.tool) HSS.plan2d.set(true); if (e.key === '3' && !S3.tool) HSS.plan2d.set(false); });
};
})();
