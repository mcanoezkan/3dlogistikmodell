/* =====================================================================
   HSS · fpv.js – Ich-Perspektive
   1. Begleiten: Kamera folgt einem simulierten Transport (Augenhöhe), inkl. Aufzugsfahrt mit Kabine
   2. Rundgang: frei begehen (WASD + Maus), Geschosswechsel mit Bild↑/Bild↓, für Beauty Shots
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const { THREE } = window.THREEX;
const EYE = 1.65;

const F = HSS.fpv = { mode: null, trip: null, yaw: 0, pitch: -0.05, keys: {}, cabin: null, hud: null, prevView: null, smooth: null };

F.follow = (tripId) => {
  const sim = HSS.state.sim; if (!sim) return;
  const trip = sim.trips.find(t => t.id === tripId); if (!trip) return;
  enter('follow'); F.trip = trip;
  if (HSS.player.t < trip.start || HSS.player.t > trip.end) HSS.player.setTime(trip.start);
  HSS.player.speed = Math.min(HSS.player.speed, 20);
  HSS.player.play(true);
  F.narr = narrative(trip);
};
F.walk = (start) => {
  enter('walk');
  const S3 = HSS.s3, t = S3.controls.target;
  const p = start || { x: t.x, y: (HSS.view.floor !== null ? floorYAt(t.x, t.z, HSS.view.floor) : HSS.terrainH(t.x, t.z)), z: t.z };
  F.pos = new THREE.Vector3(p.x, p.y + EYE, p.z);
  const d = S3.camera.position.clone().sub(t); F.yaw = Math.atan2(-d.x, -d.z); F.pitch = -0.05;
  S3.renderer.domElement.requestPointerLock?.();
};
F.exit = () => {
  if (!F.mode) return;
  const S3 = HSS.s3;
  F.mode = null; F.trip = null; S3.fpvActive = false;
  if (F.cabin) { S3.scene.remove(F.cabin); F.cabin = null; }
  document.exitPointerLock?.();
  S3.camera.fov = 45; S3.camera.near = 0.1; S3.camera.updateProjectionMatrix();
  if (F.prevView) { S3.camera.position.copy(F.prevView.pos); S3.controls.target.copy(F.prevView.tgt); }
  if (F.prevFloor !== undefined && HSS.view.floor !== F.prevFloor) HSS.s3.setFloor(F.prevFloor);
  F.hud && (F.hud.hidden = true);
  for (const a of HSS.player.agents.values()) a.obj.visible = true;
  HSS.emit('fpv', null);
};
function enter(mode) {
  const S3 = HSS.s3;
  if (!F.mode) { F.prevView = { pos: S3.camera.position.clone(), tgt: S3.controls.target.clone() }; F.prevFloor = HSS.view.floor; }
  F.mode = mode; S3.fpvActive = true; S3.tc.detach();
  S3.camera.fov = 70; S3.camera.near = 0.05; S3.camera.updateProjectionMatrix();
  F.hud = F.hud || document.getElementById('fpvHud');
  if (F.hud) F.hud.hidden = false;
  F.smooth = null;
  HSS.emit('fpv', mode);
}
const floorYAt = (x, z, gf) => { for (const pt of HSS.allParts()) { const f = HSS.localFloor(pt, gf); if (f !== null && HSS.geo.pointIn(HSS.toLocal(pt, [x, z]), HSS.partFootprintLocal(pt).outer)) return HSS.floorY(pt, f); } return HSS.terrainH(x, z); };
const gfAt = (x, y, z) => { let best = null, bd = 2.5; for (const pt of HSS.allParts()) { if (!HSS.geo.pointIn(HSS.toLocal(pt, [x, z]), HSS.partFootprintLocal(pt).outer)) continue; for (const f of HSS.partFloors(pt)) { const d = Math.abs(HSS.floorY(pt, f) - y); if (d < bd) { bd = d; best = HSS.globalFloor(pt, f); } } } return best; };

// Erzählte Schritte aus der Route (für das HUD)
function narrative(trip) {
  const prj = HSS.project(), out = [], places = HSS.places(prj);
  const pname = id => places.find(p => p.id === id)?.name || id;
  const mat = U.byId(prj.materials, trip.material), pool = U.byId(prj.transports, trip.pool);
  out.push({ t: trip.start, txt: `${mat?.name || 'Transport'} · ${pool?.name || ''}`, sub: `Start: ${pname(trip.track[0]?.place)}` });
  for (const s of trip.track) if (s.lift) { const L = HSS.net().lifts.find(l => l.id === s.lift); out.push({ t: s.t, txt: `${L?.name || 'Aufzug'}: ${HSS.floorName(s.from)} → ${HSS.floorName(s.to)}`, sub: 'Aufzugsfahrt', lift: true }); }
  for (const st of trip.stops) out.push({ t: st.t, txt: `Ziel erreicht: ${pname(st.place)}`, sub: 'Entladen und Verräumen' });
  if (trip.wash) out.push({ t: trip.end - 3, txt: 'Reinigungsfahrt zur Waschanlage', sub: 'Regel aus „Regeln“' });
  return out.sort((a, b) => a.t - b.t);
}

// Aufzugskabine um die Kamera
function cabin(on, y, x, z, ang) {
  const S3 = HSS.s3;
  if (!on) { if (F.cabin) { S3.scene.remove(F.cabin); F.cabin = null; } return; }
  if (!F.cabin) {
    const g = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: '#b9c2cb', metalness: 0.7, roughness: 0.3, side: THREE.BackSide });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.5, 2.7), wall); box.position.y = 1.25; g.add(box);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.02, 2.68), new THREE.MeshStandardMaterial({ color: '#5a6573', roughness: 0.9 })); floor.position.y = 0.01; g.add(floor);
    const light = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 2.2), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff8e8', emissiveIntensity: 0.6 })); light.position.y = 2.48; g.add(light);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.6, 0.25), new THREE.MeshStandardMaterial({ color: '#2b3138', emissive: '#0A967A', emissiveIntensity: 0.4 })); panel.position.set(0.73, 1.3, 0.9); g.add(panel);
    const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.3), new THREE.MeshStandardMaterial({ color: '#ddd', metalness: 1, roughness: 0.2 })); handrail.rotation.x = Math.PI / 2; handrail.position.set(-0.7, 0.95, 0); g.add(handrail);
    const pl = new THREE.PointLight('#ffffff', 2.5, 5); pl.position.y = 2.2; g.add(pl);
    F.cabin = g; S3.scene.add(g);
  }
  F.cabin.position.set(x, y, z); F.cabin.rotation.y = ang;
}

F.update = (dt) => {
  const S3 = HSS.s3, cam = S3.camera;
  if (F.mode === 'follow') {
    const tr = F.trip, a = HSS.player.agents.get(tr.id), p = a?.p || HSS.player.posAt(tr, HSS.player.t);
    if (!p) return;
    if (HSS.player.t >= tr.end) { HSS.player.play(false); }
    // Fahrzeuggeometrie der begleiteten Fahrt ausblenden (man ist „im“ Transport)
    for (const [id, ag] of HSS.player.agents) ag.obj.visible = id !== tr.id;
    const target = new THREE.Vector3(p.x, p.y + (tr.mittel === 'lkw' ? 2.2 : EYE), p.z);
    const dir = new THREE.Vector3(Math.cos(p.ang), 0, Math.sin(p.ang));
    if (!F.smooth) F.smooth = { pos: target.clone(), dir: dir.clone() };
    F.smooth.pos.lerp(target, 1 - Math.pow(0.0005, dt));
    F.smooth.dir.lerp(dir, 1 - Math.pow(0.02, dt)).normalize();
    // Schulterblick: leicht hinter dem Transport
    const back = F.smooth.dir.clone().multiplyScalar(p.lift ? 0 : -0.9);
    cam.position.copy(F.smooth.pos).add(back);
    const look = F.smooth.pos.clone().add(F.smooth.dir.clone().multiplyScalar(6)); look.y = F.smooth.pos.y - 0.15;
    if (p.lift) { look.copy(F.smooth.pos).add(new THREE.Vector3(Math.cos(p.ang), 0, Math.sin(p.ang)).multiplyScalar(-2)); look.y = F.smooth.pos.y - 0.1; }
    cam.lookAt(look);
    cabin(!!p.lift, p.y, p.x, p.z, Math.PI / 2 - p.ang);
    // Ebene folgen (Cutaway)
    let gf = gfAt(p.x, p.y, p.z);
    if (gf === null && p.y < HSS.terrainH(p.x, p.z) - 1.5) gf = -1;
    if (!p.lift && gf !== null && gf !== HSS.view.floor) { HSS.view.floor = gf; S3.rebuild('all'); }
    if (!p.lift && gf === null && HSS.view.floor !== null && Math.abs(p.y - HSS.terrainH(p.x, p.z)) < 1) { HSS.view.floor = null; S3.rebuild('all'); }
    // HUD
    if (F.hud) {
      const cur = F.narr.filter(n => n.t <= HSS.player.t + 0.01).pop() || F.narr[0];
      const L = p.lift ? HSS.net().lifts.find(l => l.id === p.lift) : null;
      const curGF = p.lift ? Math.round(U.lerp(p.from, p.to, (p.y - (HSS.net().nodes.get(`L:${p.lift}@${p.from}`)?.y ?? p.y)) / ((HSS.net().nodes.get(`L:${p.lift}@${p.to}`)?.y ?? p.y + 1) - (HSS.net().nodes.get(`L:${p.lift}@${p.from}`)?.y ?? p.y)) || 0)) : gf;
      F.hud.innerHTML = `<div class="k">Begleitfahrt · ${U.hhmm(HSS.player.t)}</div><h3>${U.esc(cur?.txt || '')}</h3><p>${U.esc(cur?.sub || '')}</p>` +
        (p.lift ? `<div class="liftdisp">${p.to > p.from ? '▲' : '▼'} ${U.esc(HSS.floorName(curGF ?? p.to))}<small>${U.esc(L?.name || '')}</small></div>` : '') +
        `<div class="steps">${F.narr.map(n => `<span class="${n.t <= HSS.player.t ? 'done' : ''}">${U.esc(n.txt.split(':')[0])}</span>`).join('')}</div><div class="hint">Esc beendet · Tempo über die Zeitleiste</div>`;
    }
    return;
  }
  if (F.mode === 'walk') {
    const k = F.keys, sp = (k.shift ? 6 : 2.2) * dt;
    const fw = new THREE.Vector3(-Math.sin(F.yaw), 0, -Math.cos(F.yaw)), rt = new THREE.Vector3(-fw.z, 0, fw.x);
    if (k.w || k.arrowup) F.pos.addScaledVector(fw, sp); if (k.s || k.arrowdown) F.pos.addScaledVector(fw, -sp);
    if (k.a || k.arrowleft) F.pos.addScaledVector(rt, -sp); if (k.d || k.arrowright) F.pos.addScaledVector(rt, sp);
    // Bodenhöhe: Geschoss in der Ebenenansicht, sonst Gelände
    const gy = HSS.view.floor !== null ? floorYAt(F.pos.x, F.pos.z, HSS.view.floor) : HSS.terrainH(F.pos.x, F.pos.z);
    F.pos.y = U.lerp(F.pos.y, gy + EYE, 1 - Math.pow(0.001, dt));
    cam.position.copy(F.pos);
    cam.rotation.order = 'YXZ'; cam.rotation.set(F.pitch, F.yaw, 0);
    if (F.hud) F.hud.innerHTML = `<div class="k">Rundgang · ${HSS.view.floor === null ? 'Außenbereich' : HSS.floorName(HSS.view.floor)}</div><p>W A S D gehen · Maus umsehen · Umschalt = schneller · Bild↑/Bild↓ = Geschoss · P = Beauty Shot · Esc = Ende</p>`;
  }
};
window.addEventListener('keydown', e => {
  if (!F.mode) return;
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  const k = e.key.toLowerCase(); F.keys[k] = true; F.keys.shift = e.shiftKey;
  if (k === 'escape') { F.exit(); e.stopPropagation(); }
  if (F.mode === 'walk' && (k === 'pageup' || k === 'pagedown')) {
    const [lo, hi] = HSS.s3.floorRange(); const cur = HSS.view.floor ?? 0; const nf = U.clamp(cur + (k === 'pageup' ? 1 : -1), lo, hi);
    HSS.s3.setFloor(nf); F.pos.y = floorYAt(F.pos.x, F.pos.z, nf) + EYE; e.preventDefault();
  }
  if (k === 'p') HSS.s3.beautyShot(2);
}, true);
window.addEventListener('keyup', e => { F.keys[e.key.toLowerCase()] = false; F.keys.shift = e.shiftKey; });
window.addEventListener('mousemove', e => {
  if (F.mode !== 'walk') return;
  if (document.pointerLockElement || e.buttons === 1) { F.yaw -= e.movementX * 0.0025; F.pitch = U.clamp(F.pitch - e.movementY * 0.0025, -1.3, 1.3); }
});
})();
