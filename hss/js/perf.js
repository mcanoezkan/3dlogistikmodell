/* =====================================================================
   HSS · perf.js – flüssige Darstellung auf jedem Rechner
   1. Zeichnen nur bei Bedarf: Kamera bewegt, Szene geändert, Animation läuft
      (Verkehr, Simulation, Begehung). Im Ruhezustand wird nichts gezeichnet.
   2. Statische Geometrie bündeln: Gelände, Flächen, Wege, Gebäude und Innenausbau
      werden je Material zu wenigen großen Netzen zusammengefasst (aus ~1000 Zeichen-
      aufrufen werden ~50–100). Das gewählte Element bleibt einzeln, damit es sich
      ohne Verzögerung ziehen, drehen und skalieren lässt. Die Auswahl per Klick
      funktioniert weiter über Dreiecksbereiche (ranges) im gebündelten Netz.
   3. Schatten nur neu berechnen, wenn sich die Szene ändert (nicht in jedem Bild).
   4. Automatische Qualitätsstufe: bei langsamen Bildern wird die Auflösung gesenkt.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS;
const { THREE, mergeGeometries } = window.THREEX;
const S3 = HSS.s3;
const P = HSS.perf = { inv: 3, shadowDirty: true, batching: true, stats: { batches: 0, merged: 0, ms: 0 }, quality: null, trafficAnim: (() => { try { return localStorage.getItem('hss-verkehr') !== 'aus'; } catch (e) { return true; } })() };

/* ---------- Zeichnen bei Bedarf ---------- */
P.invalidate = (n = 2) => { P.inv = Math.max(P.inv, n); };
P.shadows = () => { P.shadowDirty = true; P.invalidate(); };
const lastCam = new THREE.Matrix4(), lastProj = new THREE.Matrix4();
let lastT = performance.now(), ema = 16, slowFor = 0, fastFor = 0, lastTrafficT = 0;

function wantsContinuous() {
  if (S3.fpvActive) return 'fpv';
  if (S3.tc?.dragging || P.dragging) return 'drag';
  if (HSS.player?.playing) return 'sim';
  if (HSS.player?.agents?.size && S3.layers.agents.visible) return 'sim';
  if (P.trafficAnim && HSS.traffic.agents.length && S3.layers.traffic.visible) return 'traffic';
  if (HSS.flussbild?.animating && S3.layers.flows?.visible) return 'traffic';
  if (P.anim > 0) return 'anim';
  return null;
}

S3.frame = () => {
  const now = performance.now();
  const dt = Math.min(0.1, S3.clock.getDelta());
  let moved = false;
  if (S3.fpvActive) HSS.fpv.update(dt); else moved = S3.controls.update();
  const cont = wantsContinuous();
  // Verkehr allein: höchstens 30 Bilder/s, damit Laptops kühl bleiben
  if (cont === 'traffic' && !moved && P.inv <= 0 && now - lastTrafficT < 33) { HSS.emit('frame', dt); return; }
  if (P.trafficAnim || !HSS.traffic.agents.length) HSS.traffic.update(cont === 'traffic' ? Math.min(0.1, (now - (lastTrafficT || now)) / 1000) : dt);
  HSS.emit('frame', dt);
  S3.camera.updateMatrixWorld();
  const camChanged = !lastCam.equals(S3.camera.matrixWorld) || !lastProj.equals(S3.camera.projectionMatrix);
  if (!camChanged && !cont && P.inv <= 0) return;
  if (cont === 'traffic') lastTrafficT = now;
  lastCam.copy(S3.camera.matrixWorld); lastProj.copy(S3.camera.projectionMatrix);
  if (P.inv > 0) P.inv--;
  if (P.anim > 0) P.anim--;
  const R = S3.renderer;
  if (P.shadowDirty) { R.shadowMap.needsUpdate = true; P.shadowDirty = false; }
  R.render(S3.scene, S3.camera);
  S3.labelRenderer.render(S3.scene, S3.camera);
  // Qualitätsautomatik (nur bei laufender Bewegung messen)
  const iv = now - lastT; lastT = now;
  if (iv < 200) {
    ema = ema * 0.9 + iv * 0.1;
    if (ema > 42) { slowFor += iv; fastFor = 0; } else if (ema < 17) { fastFor += iv; slowFor = 0; } else { slowFor = fastFor = 0; }
    if (slowFor > 1200) { slowFor = 0; P.setQuality(P.qIndex - 1, true); }
    if (fastFor > 6000) { fastFor = 0; P.setQuality(P.qIndex + 1, true); }
  }
};
// Animationen (Kamerafahrten) halten das Zeichnen für die Dauer wach
P.anim = 0;
const animateCam0 = S3.animateCam;
S3.animateCam = (pos, target, ms = 700) => { P.anim = Math.max(P.anim, Math.ceil(ms / 12) + 4); animateCam0(pos, target, ms); };

/* Qualitätsstufen: Pixeldichte und Schattenauflösung */
const Q = [
  { name: 'sparsam', pr: 0.75, shadow: 1024 },
  { name: 'mittel', pr: 1.0, shadow: 2048 },
  { name: 'hoch', pr: 1.5, shadow: 2048 },
  { name: 'sehr hoch', pr: 2.0, shadow: 4096 }
];
P.QUALITY = Q;
P.qIndex = 2;
P.setQuality = (i, auto) => {
  const maxI = (window.devicePixelRatio || 1) >= 1.5 ? 3 : 2;
  i = Math.max(0, Math.min(maxI, i));
  if (auto && P.qLocked) return;
  if (i === P.qIndex && P._qInit) return;
  P._qInit = true; P.qIndex = i;
  const q = Q[i], R = S3.renderer;
  R.setPixelRatio(Math.min(q.pr, Math.max(1, window.devicePixelRatio || 1)));
  const el = R.domElement.parentElement; if (el) R.setSize(el.clientWidth, el.clientHeight);
  if (S3.sun.shadow.mapSize.x !== q.shadow) { S3.sun.shadow.mapSize.set(q.shadow, q.shadow); S3.sun.shadow.map?.dispose(); S3.sun.shadow.map = null; }
  P.shadows();
  if (auto) HSS.ui?.toast?.(`Darstellung automatisch angepasst: Qualität „${q.name}“`, 2200);
  HSS.emit('quality', i);
};

/* ---------- Bündelung statischer Geometrie ---------- */
const BATCH_LAYERS = ['terrain', 'areas', 'paths', 'build', 'interior', 'objects'];
const MAX_INST_VERTS = 1500000; // größere Instanzmengen bleiben instanziert
const keepAttrs = (mat) => {
  const a = ['position', 'normal'];
  if (mat.map || mat.normalMap || mat.alphaMap) a.push('uv');
  if (mat.vertexColors) a.push('color');
  return a;
};
function prepGeo(obj, mat, isLine, mw) {
  let g = obj.geometry; if (!g || !g.attributes.position) return null;
  const keep = isLine ? (mat.vertexColors ? ['position', 'color'] : ['position']) : keepAttrs(mat);
  const out = new THREE.BufferGeometry();
  for (const k of keep) {
    let a = g.attributes[k];
    if (!a) { if (k === 'normal') { g = g.clone(); g.computeVertexNormals(); a = g.attributes.normal; } else return null; }
    if (a.isInterleavedBufferAttribute) a = a.clone ? new THREE.BufferAttribute(Float32Array.from({ length: a.count * a.itemSize }, (_, i) => a.getComponent ? a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize) : 0), a.itemSize) : null;
    if (!a) return null;
    out.setAttribute(k, a.clone());
  }
  if (!isLine) {
    if (g.index) out.setIndex(g.index.clone());
    else { const n = out.attributes.position.count, idx = new (n > 65535 ? Uint32Array : Uint16Array)(n); for (let i = 0; i < n; i++) idx[i] = i; out.setIndex(new THREE.BufferAttribute(idx, 1)); }
    // Gruppen (mehrere Materialbereiche) werden nicht gebündelt
  }
  mw = mw || obj.matrixWorld;
  out.applyMatrix4(mw);
  if (!isLine && mw.determinant() < 0) { const ix = out.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
  return out;
}
const _im = new THREE.Matrix4();
// Schnelles Zusammenfügen gleichartiger Geometrien (typisierte Arrays statt Einzelwerte)
function concat(geos, isLine) {
  if (geos.length === 1) return geos[0].clone();
  const names = Object.keys(geos[0].attributes);
  for (const g of geos) for (const n of names) if (!g.attributes[n] || g.attributes[n].itemSize !== geos[0].attributes[n].itemSize) return null;
  let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; if (!isLine) ni += g.index.count; }
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const it = geos[0].attributes[n].itemSize, arr = new Float32Array(nv * it); let o = 0;
    for (const g of geos) { arr.set(g.attributes[n].array, o); o += g.attributes[n].array.length; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, it));
  }
  if (!isLine) {
    const idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni); let o = 0, base = 0;
    for (const g of geos) { const a = g.index.array; for (let i = 0; i < a.length; i++) idx[o + i] = a[i] + base; o += a.length; base += g.attributes.position.count; }
    out.setIndex(new THREE.BufferAttribute(idx, 1));
  }
  return out;
}
// Instanzen direkt in typisierte Arrays umrechnen (ohne Zwischenobjekte je Instanz)
const _nm = new THREE.Matrix3();
function expandInstanced(o, mat) {
  const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, C = mat.vertexColors ? g.attributes.color : null;
  if (!P || P.isInterleavedBufferAttribute || (N && N.isInterleavedBufferAttribute)) return null;
  const nv = P.count, n = o.count, pa = P.array, na = N ? N.array : null, ca = C ? C.array : null;
  const pos = new Float32Array(nv * n * 3), nor = new Float32Array(nv * n * 3), col = ca ? new Float32Array(nv * n * 3) : null;
  const src = g.index ? g.index.array : null, ni = src ? src.length : nv;
  const idx = new (nv * n > 65535 ? Uint32Array : Uint16Array)(ni * n);
  for (let k = 0; k < n; k++) {
    o.getMatrixAt(k, _im); _im.premultiply(o.matrixWorld); const e = _im.elements;
    _nm.getNormalMatrix(_im); const m = _nm.elements;
    const flip = _im.determinant() < 0, vo = k * nv;
    for (let i = 0; i < nv; i++) {
      const x = pa[i * 3], y = pa[i * 3 + 1], z = pa[i * 3 + 2], j = (vo + i) * 3;
      pos[j] = e[0] * x + e[4] * y + e[8] * z + e[12]; pos[j + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; pos[j + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      if (na) { const a = na[i * 3], b = na[i * 3 + 1], c = na[i * 3 + 2]; let u = m[0] * a + m[3] * b + m[6] * c, v = m[1] * a + m[4] * b + m[7] * c, w = m[2] * a + m[5] * b + m[8] * c; const l = Math.hypot(u, v, w) || 1; nor[j] = u / l; nor[j + 1] = v / l; nor[j + 2] = w / l; }
      if (ca) { col[j] = ca[i * 3]; col[j + 1] = ca[i * 3 + 1]; col[j + 2] = ca[i * 3 + 2]; }
    }
    const io = k * ni;
    for (let t = 0; t < ni; t += 3) {
      const a = src ? src[t] : t, b = src ? src[t + 1] : t + 1, c = src ? src[t + 2] : t + 2;
      idx[io + t] = vo + a; idx[io + t + 1] = vo + (flip ? c : b); idx[io + t + 2] = vo + (flip ? b : c);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (mat.map || mat.normalMap || mat.alphaMap) return null;
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}
const triCount = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

// Gewähltes Element (und was beim Ziehen mitwandert) bleibt ungebündelt, damit es sich flüssig bewegen lässt
P.liveOwner = () => {
  const s = HSS.state.selection; if (!s || !['part', 'path', 'area', 'bridge', 'object'].includes(s.kind)) return null;
  const ids = new Set([s.id]);
  if (s.kind === 'part') { const prj = HSS.project(); for (const id of HSS.manip?.moveSet?.(s.id) || []) ids.add(id); for (const br of prj.bridges) if (ids.has(br.a?.part) || ids.has(br.b?.part)) ids.add(br.id); }
  return ids;
};
const liveKey = l => (l ? [...l].sort().join(',') : '');

// Vorbereitung je Eigentümer (Bauteil, Weg, Fläche …) wird zwischengespeichert: unveränderte
// Elemente kommen aus dem Speicher, nur geänderte werden neu in Weltkoordinaten umgerechnet.
const prepCache = new WeakMap();
const CELL = 220; let uidN = 0;
let prepMs = 0;
function prepOwner(owner) {
  const c = prepCache.get(owner); if (c) return c;
  if (P.debug) (P.dbgList = P.dbgList || []).push((owner.userData.kind || owner.type) + ":" + (owner.userData.id || owner.userData.part || "") + ":" + (owner.parent?.name || ""));
  const tp = performance.now(); try { return prepOwner2(owner); } finally { prepMs += performance.now() - tp; }
}
function prepOwner2(owner) {
  owner.updateMatrixWorld(true);
  const buckets = new Map();
  owner.traverseVisible(o => {
    if (o.userData.noBatch) return;
    const isLine = o.isLineSegments;
    if (o.isInstancedMesh && (o.count * o.geometry.attributes.position.count > MAX_INST_VERTS || o.count > 4000)) return;
    if (!(o.isMesh || isLine) || o.isSkinnedMesh || Array.isArray(o.material) || !o.material) return;
    if (o.material.visible === false && !o.userData.pick) return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    const key = (isLine ? 'L' : 'M') + o.material.uuid + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
    let b = buckets.get(key); if (!b) buckets.set(key, b = { mat: o.material, isLine, items: [], geos: [], ranges: [], tri: 0, cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder });
    if (o.isInstancedMesh) {
      const g = expandInstanced(o, b.mat); if (!g) return;
      const per = triCount(o.geometry.index ? o.geometry : g) / (o.geometry.index ? 1 : o.count);
      for (let i = 0; i < o.count; i++) { b.ranges.push(b.tri, o.userData.ids ? { kind: o.userData.kind, id: o.userData.ids[i] } : o.userData); b.tri += per; }
      b.geos.push(g);
    } else {
      const g = prepGeo(o, b.mat, isLine); if (!g) return;
      b.geos.push(g); if (!isLine) { b.ranges.push(b.tri, o.userData); b.tri += triCount(g); }
    }
    b.items.push(o);
  });
  for (const b of buckets.values()) {
    if (!b.geos.length) { b.geo = null; continue; }
    b.geo = b.geos.length === 1 ? b.geos[0] : concat(b.geos, b.isLine);
    if (b.geos.length > 1) b.geos.forEach(g => g.dispose());
    b.geos = null;
  }
  const box = new THREE.Box3(); for (const b of buckets.values()) if (b.geo) { b.geo.computeBoundingBox(); box.union(b.geo.boundingBox); }
  const ctr = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
  const out = { buckets, cell: Math.floor(ctr.x / CELL) + "," + Math.floor(ctr.z / CELL), uid: ++uidN };
  prepCache.set(owner, out); return out;
}

P.batch = () => {
  if (!P.batching || !S3.scene) return;
  const t0 = performance.now();
  const live = P.liveOwner();
  let nb = 0, nm = 0, rebuilt = 0;
  for (const name of BATCH_LAYERS) {
    const layer = S3.layers[name]; if (!layer) continue;
    const grp = layer.userData.batch || (() => { const g = new THREE.Group(); g.name = 'batch'; g.userData = { batch: true, cells: new Map() }; return g; })();
    if (!layer.children.includes(grp)) { grp.parent = null; layer.add(grp); }
    layer.userData.batch = grp;
    for (const o of layer.userData.hidden || []) o.visible = true;
    layer.userData.hidden = [];
    // Eigentümer nach Zellen ordnen
    const cells = new Map();
    for (const owner of layer.children) {
      if (owner === grp || !owner.visible || owner.userData.batch) continue;
      if (live && live.has(owner.userData?.id)) continue;
      const pr = prepOwner(owner);
      let c = cells.get(pr.cell); if (!c) cells.set(pr.cell, c = { preps: [], sig: '' });
      c.preps.push(pr); c.sig += pr.uid + ',';
    }
    const old = grp.userData.cells, next = new Map();
    for (const [ck, c] of cells) {
      let entry = old.get(ck);
      if (!entry || entry.sig !== c.sig) {
        if (entry) for (const m of entry.meshes) { grp.remove(m); m.geometry.dispose(); }
        entry = { sig: c.sig, meshes: [] }; rebuilt++; if (P.debug) console.log("cell", name, ck, c.preps.length);
        const all = new Map();
        for (const pr of c.preps) for (const [key, b] of pr.buckets) { if (!b.geo) continue; let A = all.get(key); if (!A) all.set(key, A = { b, parts: [] }); A.parts.push(b); }
        for (const { b, parts } of all.values()) {
          const nItems = parts.reduce((s, p) => s + p.items.length, 0);
          if (nItems < 2 && !(parts[0].items[0]?.isInstancedMesh && parts[0].items[0].count > 1)) continue;
          const merged = concat(parts.map(p => p.geo), b.isLine);
          if (!merged) continue;
          const ranges = []; let off = 0;
          if (!b.isLine) for (const p of parts) { for (let i = 0; i < p.ranges.length; i += 2) ranges.push(p.ranges[i] + off, p.ranges[i + 1]); off += p.tri; }
          merged.computeBoundingSphere(); merged.computeBoundingBox();
          const m = b.isLine ? new THREE.LineSegments(merged, b.mat) : new THREE.Mesh(merged, b.mat);
          m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.ro; m.matrixAutoUpdate = false;
          if (b.isLine) { m.raycast = () => {}; m.userData = { kontur: true, batch: true }; }
          else m.userData = { batch: true, ranges, kind: ranges[1]?.kind };
          m.userData.parts = parts;
          grp.add(m); entry.meshes.push(m);
        }
      }
      next.set(ck, entry);
      for (const m of entry.meshes) { nb++; for (const p of m.userData.parts) for (const o of p.items) { o.visible = false; layer.userData.hidden.push(o); nm++; } }
    }
    for (const [ck, e] of old) if (!next.has(ck)) for (const m of e.meshes) { grp.remove(m); m.geometry.dispose(); }
    grp.userData.cells = next;
  }
  P.stats = { batches: nb, merged: nm, cellsRebuilt: rebuilt, ms: Math.round(performance.now() - t0), prepMs: Math.round(prepMs) }; prepMs = 0;
  // Auswahlliste neu aufbauen (gebündelte Netze statt Einzelteile)
  const arr = S3.pickables = [];
  for (const k of ['build', 'interior', 'objects', 'paths', 'areas']) S3.layers[k].traverseVisible(o => { if (o.isMesh) arr.push(o); });
  P.shadows();
};
// Dreiecksbereich → ursprüngliche userData
P.rangeData = (obj, faceIndex) => {
  const r = obj.userData.ranges; if (!r || faceIndex == null) return obj.userData;
  let lo = 0, hi = r.length / 2 - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (r[m * 2] <= faceIndex) lo = m; else hi = m - 1; }
  return r[lo * 2 + 1] || {};
};

// Szene neu aufgebaut → (nach dem Cartoon-Stil) bündeln
HSS.on('rebuilt', () => { P.batch(); P.invalidate(3); });
// Auswahl wechselt → gewähltes Element aus dem Bündel lösen (verzögert, damit Doppelklicks flüssig bleiben)
let lastLive = null, selT = null;
HSS.on('selection', () => {
  const l = liveKey(P.liveOwner()); if (l === lastLive) { P.invalidate(); return; }
  lastLive = l; clearTimeout(selT); selT = setTimeout(() => { P.batch(); P.invalidate(); }, 30);
});
// Jedes Ereignis kann die Darstellung ändern
const emit0 = HSS.emit;
HSS.emit = (ev, data) => { if (ev !== 'frame') P.invalidate(2); return emit0(ev, data); };

/* ---------- Einrichtung beim Start ---------- */
P.init = () => {
  const R = S3.renderer;
  R.shadowMap.type = THREE.PCFShadowMap;
  R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = true;
  const dom = R.domElement;
  for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel']) dom.addEventListener(ev, () => P.invalidate(2), { passive: true });
  window.addEventListener('keydown', () => P.invalidate(4));
  window.addEventListener('resize', () => P.invalidate(2));
  S3.controls.addEventListener('change', () => P.invalidate(1));
  S3.tc.addEventListener('change', () => P.invalidate(1));
  let q = null; try { q = localStorage.getItem('hss-qualitaet'); } catch (e) { /* */ }
  if (q !== null && q !== 'auto') { P.qLocked = true; P.setQuality(+q); }
  else P.setQuality((window.devicePixelRatio || 1) > 1.3 ? 2 : 1);
  // Sonne/Tageszeit ändert Schatten
  const setSun0 = S3.setSun; S3.setSun = h => { setSun0(h); P.shadows(); };
  // Bewegte Objekte werfen keine Schatten (Schattenkarte wird nur bei Änderungen neu berechnet)
  HSS.on('rebuilt', () => { S3.layers.traffic.traverse(o => { o.castShadow = false; }); });
  HSS.on('frame', () => { if (S3.layers.agents.children.length && !S3.layers.agents.userData._ns) S3.layers.agents.traverse(o => { o.castShadow = false; }); });
};
P.bindUI = () => {
  const q = document.getElementById('vQ'), t = document.getElementById('vTraffic'); if (!q || !t) return;
  let v = 'auto'; try { v = localStorage.getItem('hss-qualitaet') || 'auto'; } catch (e) { /* */ }
  q.value = v;
  q.onchange = () => { try { localStorage.setItem('hss-qualitaet', q.value); } catch (e) { /* */ } if (q.value === 'auto') { P.qLocked = false; P.setQuality(P.qIndex); } else { P.qLocked = true; P.setQuality(+q.value); } };
  HSS.on('quality', i => { if (q.value === 'auto') q.title = 'automatisch – derzeit „' + Q[i].name + '“'; });
  t.classList.toggle('on', P.trafficAnim);
  t.onclick = () => { P.setTraffic(!P.trafficAnim); t.classList.toggle('on', P.trafficAnim); S3.layers.traffic.visible = P.trafficAnim; P.invalidate(); };
  S3.layers.traffic.visible = P.trafficAnim;
};
P.setTraffic = on => { P.trafficAnim = on; try { localStorage.setItem('hss-verkehr', on ? 'an' : 'aus'); } catch (e) { /* */ } P.invalidate(); };
})();
