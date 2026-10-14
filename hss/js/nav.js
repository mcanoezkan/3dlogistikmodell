/* =====================================================================
   HSS · nav.js – Navigation: Maus, Tastatur, Kompass, Etagentasten, Raster, Koordinaten
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE } = window.THREEX;
const N = HSS.nav = { keys: {}, grid: true };
const $ = s => document.querySelector(s);

N.init = () => {
  const S3 = HSS.s3, C = S3.controls;
  C.zoomToCursor = true;          // Mausrad zoomt dorthin, wo die Maus steht
  C.zoomSpeed = 1.3; C.rotateSpeed = 0.7; C.panSpeed = 1.1; C.minDistance = 1.2;
  C.screenSpacePanning = false;   // Verschieben bleibt auf Bodenhöhe
  C.keyPanSpeed = 0;
  // Umschalt + linke Maustaste = verschieben (für Touchpads ohne rechte Taste)
  window.addEventListener('keydown', e => { if (e.key === 'Shift') C.mouseButtons.LEFT = THREE.MOUSE.PAN; });
  window.addEventListener('keyup', e => { if (e.key === 'Shift') C.mouseButtons.LEFT = THREE.MOUSE.ROTATE; });
  window.addEventListener('blur', () => { C.mouseButtons.LEFT = THREE.MOUSE.ROTATE; N.keys = {}; });
  // Tastatur
  window.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || S3.fpvActive || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '+', '-'].includes(k)) { if (S3.tool?.name === 'path' && k === 'backspace') return; N.keys[k] = true; if (k.startsWith('arrow')) e.preventDefault(); }
    if (k === 'pageup' || k === 'pagedown') { e.preventDefault(); N.floorStep(k === 'pageup' ? 1 : -1); }
    if (k === 'home') S3.home();
    if (k === 't') N.topView();
    if (k === 'f' && HSS.state.selection) S3.focusSel(HSS.state.selection);
  });
  window.addEventListener('keyup', e => { N.keys[e.key.toLowerCase()] = false; });
  HSS.on('frame', N.update);
  // Doppelklick ins Gelände: dorthin fliegen
  S3.renderer.domElement.addEventListener('dblclick', ev => {
    if (S3.tool || S3.fpvActive) return;
    if (S3.pick(ev)) return;
    const gp = S3.groundPoint(ev); if (!gp) return;
    const tgt = new THREE.Vector3(gp.x, gp.y, gp.z), off = S3.camera.position.clone().sub(C.target);
    const d = off.length(); off.setLength(Math.max(25, d * 0.6));
    S3.animateCam(tgt.clone().add(off), tgt, 600);
  });
  // Koordinatenanzeige
  S3.renderer.domElement.addEventListener('pointermove', U.debounce(ev => {
    const gp = S3.groundPoint(ev); const el = $('#coord'); if (!el || !gp) return;
    el.textContent = `x ${U.fmt(gp.x, 1)} · z ${U.fmt(gp.z, 1)} · Höhe ${U.fmt(gp.y, 1)} m${gp.host ? ' · ' + HSS.floorName(HSS.view.floor) : ''}`;
  }, 40));
  N.buildWidgets();
  HSS.on('view', N.refreshFloors); HSS.on('changed', U.debounce(N.refreshFloors, 50)); HSS.on('loaded', N.refreshFloors);
  HSS.on('rebuilt', N.buildGrid);
};

// Bewegung mit Tasten: Geschwindigkeit wächst mit dem Abstand der Kamera
N.update = (dt) => {
  const S3 = HSS.s3, K = N.keys;
  // Beschriftung entzerren: aus großer Entfernung nur die Kürzel zeigen
  if (S3.camera && S3.controls) { const far = S3.camera.position.distanceTo(S3.controls.target) > 330; if (far !== N._lblFar) { N._lblFar = far; document.body.classList.toggle('lblfar', far); } }
  if (S3.fpvActive) return;
  const any = Object.values(K).some(Boolean); if (!any) return;
  const C = S3.controls, cam = S3.camera;
  const dist = cam.position.distanceTo(C.target), sp = Math.max(6, dist * 0.9) * dt;
  const fw = new THREE.Vector3().subVectors(C.target, cam.position); fw.y = 0; fw.normalize();
  const rt = new THREE.Vector3(-fw.z, 0, fw.x);
  const mv = new THREE.Vector3();
  if (K.w || K.arrowup) mv.add(fw); if (K.s || K.arrowdown) mv.sub(fw);
  if (K.d || K.arrowright) mv.add(rt); if (K.a || K.arrowleft) mv.sub(rt);
  if (mv.lengthSq()) { mv.normalize().multiplyScalar(sp); cam.position.add(mv); C.target.add(mv); }
  if (K.q || K.e) { const a = (K.q ? 1 : -1) * dt * 1.4; const off = cam.position.clone().sub(C.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); cam.position.copy(C.target).add(off); }
  if (K['+'] || K['-']) { const off = cam.position.clone().sub(C.target); off.multiplyScalar(K['+'] ? 1 - dt * 1.5 : 1 + dt * 1.5); if (off.length() > C.minDistance) cam.position.copy(C.target).add(off); }
};
N.rotate = deg => { const S3 = HSS.s3, C = S3.controls; const off = S3.camera.position.clone().sub(C.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), U.rad(deg)); S3.animateCam(C.target.clone().add(off), C.target.clone(), 400); };
N.topView = () => { const S3 = HSS.s3, C = S3.controls; const d = S3.camera.position.distanceTo(C.target); S3.animateCam(C.target.clone().add(new THREE.Vector3(0.01, d, 0.01)), C.target.clone(), 500); };
N.obliqueView = () => { const S3 = HSS.s3, C = S3.controls; const d = S3.camera.position.distanceTo(C.target); S3.animateCam(C.target.clone().add(new THREE.Vector3(-d * 0.5, d * 0.62, d * 0.6)), C.target.clone(), 500); };
N.northUp = () => { const S3 = HSS.s3, C = S3.controls; const off = S3.camera.position.clone().sub(C.target); const h = Math.hypot(off.x, off.z); S3.animateCam(C.target.clone().add(new THREE.Vector3(0, off.y, h)), C.target.clone(), 500); };

/* Etagenwahl wie Aufzugstasten; Kamera folgt der Höhe der Etage */
N.floorY = (gf) => {
  const t = HSS.s3.controls.target; let best = null, bd = Infinity;
  for (const pt of HSS.allParts()) { const f = HSS.localFloor(pt, gf); if (f === null) continue; const d = Math.hypot(pt.x - t.x, pt.z - t.z); if (d < bd) { bd = d; best = HSS.floorY(pt, f); } }
  return best;
};
N.setFloor = (gf) => {
  const S3 = HSS.s3, C = S3.controls;
  const yNew = gf === null ? HSS.terrainH(C.target.x, C.target.z) : (N.floorY(gf) ?? C.target.y);
  const dy = yNew - C.target.y;
  S3.setFloor(gf);
  S3.animateCam(S3.camera.position.clone().add(new THREE.Vector3(0, dy, 0)), C.target.clone().add(new THREE.Vector3(0, dy, 0)), 450);
};
N.floorStep = (d) => { const [lo, hi] = HSS.s3.floorRange(); const cur = HSS.view.floor; let n = cur === null ? (d > 0 ? 0 : -1) : cur + d; if (n > hi) n = null; if (n !== null && n < lo) n = lo; N.setFloor(n); };
N.buildWidgets = () => {
  const vp = document.body;
  if (!$('#floorNav')) {
    const f = document.createElement('div'); f.id = 'floorNav'; vp.appendChild(f);
    const c = document.createElement('div'); c.id = 'compass';
    c.innerHTML = `<button data-c="l" title="Nach links drehen (Q)">⟲</button><button data-c="n" title="Norden oben"><svg viewBox="0 0 24 24"><path d="M12 3l4 9h-8z" fill="#B60028"/><path d="M12 21l-4-9h8z" fill="#BDC6D1"/></svg></button><button data-c="r" title="Nach rechts drehen (E)">⟳</button><button data-c="top" title="Draufsicht (T)">▣</button><button data-c="obl" title="Schrägansicht">◩</button><button data-c="help" title="Bedienung">?</button>`;
    vp.appendChild(c);
    c.onclick = e => { const b = e.target.closest('button'); if (!b) return; ({ l: () => N.rotate(45), r: () => N.rotate(-45), n: N.northUp, top: N.topView, obl: N.obliqueView, help: N.toggleHelp })[b.dataset.c](); };
    const h = document.createElement('div'); h.id = 'navHelp';
    h.innerHTML = `<button class="x" title="schließen">×</button><b>Bedienung</b>
      <div><span class="mk">🖱 links ziehen</span> drehen</div><div><span class="mk">🖱 rechts ziehen</span> verschieben <small>(oder Umschalt + links)</small></div>
      <div><span class="mk">Mausrad</span> zoomen zur Mausposition</div><div><span class="mk">Doppelklick</span> hinfliegen</div>
      <div><span class="mk">W A S D / Pfeile</span> bewegen</div><div><span class="mk">Q / E</span> drehen · <span class="mk">T</span> Draufsicht</div>
      <div><span class="mk">Bild ↑ / ↓</span> Etage wechseln · <span class="mk">F</span> Auswahl zeigen</div><div id="coord" class="note"></div>`;
    vp.appendChild(h);
    h.querySelector('.x').onclick = () => N.toggleHelp(false);
    let hide = false; try { hide = localStorage.getItem('hss-navhelp') === '0'; } catch (e) { /* */ }
    if (hide) h.classList.add('min'); else { setTimeout(() => { if (!h.classList.contains('min')) N.toggleHelp(false); }, 20000); HSS.s3.renderer.domElement.addEventListener('pointerdown', () => setTimeout(() => { if (!h.classList.contains('min')) N.toggleHelp(false); }, 2500), { once: true }); }
  }
  N.refreshFloors();
};
N.toggleHelp = (on) => { const h = $('#navHelp'); const show = on ?? h.classList.contains('min'); h.classList.toggle('min', !show); try { localStorage.setItem('hss-navhelp', show ? '1' : '0'); } catch (e) { /* */ } };
N.refreshFloors = () => {
  const el = $('#floorNav'); if (!el) return;
  const [lo, hi] = HSS.s3.floorRange(), cur = HSS.view.floor;
  if (!HSS.allParts().length) { el.hidden = true; return; } el.hidden = false;
  let h = `<button data-g="up" title="Etage höher (Bild↑)">▲</button>`;
  for (let g = hi; g >= lo; g--) h += `<button data-g="${g}" class="${cur === g ? 'on' : ''}" title="${HSS.floorName(g)} anzeigen">${g < 0 ? (g === -1 ? 'UG' : 'U' + -g) : g === 0 ? 'EG' : g}</button>`;
  h += `<button data-g="out" class="${cur === null ? 'on' : ''}" title="Außenansicht (alle Etagen)">⌂</button><button data-g="dn" title="Etage tiefer (Bild↓)">▼</button>`;
  el.innerHTML = h;
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; const g = b.dataset.g; if (g === 'up') N.floorStep(1); else if (g === 'dn') N.floorStep(-1); else N.setFloor(g === 'out' ? null : +g); };
};

/* Planungsraster: im Außenbereich auf dem Gelände (10 m, jede 5. Linie kräftiger),
   in der Etagenansicht 1-m-Raster auf Fußbodenhöhe */
N.buildGrid = () => {
  const S3 = HSS.s3; if (!S3.layers.grid) { S3.layers.grid = new THREE.Group(); S3.scene.add(S3.layers.grid); }
  const L = S3.layers.grid; while (L.children.length) { const c = L.children.pop(); c.geometry?.dispose(); }
  if (!N.grid) return;
  const V = HSS.view, prj = HSS.project();
  if (V.floor === null) {
    const S = prj.terrain.size || 500, step = 10, n = Math.floor(S / 2 / step), seg = 4;
    const minor = [], major = [];
    for (let i = -n; i <= n; i++) {
      const arr = i % 5 === 0 ? major : minor, c = i * step;
      for (let j = -n * (step / seg); j < n * (step / seg); j++) {
        const a = j * seg, b = a + seg;
        arr.push(c, HSS.terrainH(c, a, prj) + 0.08, a, c, HSS.terrainH(c, b, prj) + 0.08, b);
        arr.push(a, HSS.terrainH(a, c, prj) + 0.08, c, b, HSS.terrainH(b, c, prj) + 0.08, c);
      }
    }
    const mk = (pos, col, op) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false })); l.renderOrder = 1; L.add(l); };
    const toon = HSS.view.stil === 'cartoon';
    mk(minor, toon ? '#9aa4ae' : '#5d6d5a', toon ? 0.07 : 0.16); mk(major, toon ? '#7d8893' : '#3e4c3c', toon ? 0.16 : 0.32);
  } else {
    const box = new THREE.Box3();
    for (const pt of HSS.allParts(prj)) { if (HSS.localFloor(pt, V.floor, prj) === null) continue; for (const [x, z] of HSS.partFootprint(pt).outer) box.expandByPoint(new THREE.Vector3(x, 0, z)); }
    if (box.isEmpty()) return;
    const y = N.floorY(V.floor) ?? 0, size = Math.ceil(Math.max(box.max.x - box.min.x, box.max.z - box.min.z) + 20);
    const g = new THREE.GridHelper(size, size, '#144477', '#7d8ea0'); g.material.transparent = true; g.material.opacity = 0.18; g.material.depthWrite = false;
    const c = box.getCenter(new THREE.Vector3()); g.position.set(Math.round(c.x), y + 0.03 + V.floor * V.explode, Math.round(c.z)); g.renderOrder = 2; L.add(g);
  }
};
N.setGrid = on => { N.grid = on; N.buildGrid(); };
})();
