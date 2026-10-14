/* =====================================================================
   HSS · scene.js – Renderer, Licht/Tageszeit, Ebenenansicht (Cutaway), Auswahl, Werkzeuge
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE, OrbitControls, TransformControls, CSS2DRenderer, CSS2DObject, RoomEnvironment, Sky } = window.THREEX;

const V = HSS.view = { floor: null, cut: 'halb', shell: 'massiv', explode: 0, labels: true, wege: (() => { try { return localStorage.getItem('hss-wege') || 'alle'; } catch (e) { return 'alle'; } })(), sunHour: 14, showNet: false, showBasement: false };
const S3 = HSS.s3 = { groups: new Map(), pickables: [], tool: null, lamps: [] };

/* ---------- Initialisierung ---------- */
S3.init = (el) => {
  const R = S3.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false, logarithmicDepthBuffer: false });
  R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  R.setSize(el.clientWidth, el.clientHeight);
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 0.9;
  R.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(R.domElement);
  const LR = S3.labelRenderer = new CSS2DRenderer(); LR.setSize(el.clientWidth, el.clientHeight); LR.domElement.className = 'labels'; el.appendChild(LR.domElement);
  const sc = S3.scene = new THREE.Scene();
  sc.background = new THREE.Color('#dce3e8');
  const pmrem = new THREE.PMREMGenerator(R); S3.envMap = pmrem.fromScene(new RoomEnvironment(R), 0.04).texture;
  S3.sky = new Sky(); S3.sky.scale.setScalar(4500); sc.add(S3.sky);
  const su = S3.sky.material.uniforms; su.turbidity.value = 6; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  S3.camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 6000);
  S3.camera.position.set(-180, 160, 220);
  const C = S3.controls = new OrbitControls(S3.camera, R.domElement);
  C.enableDamping = true; C.dampingFactor = 0.12; C.maxPolarAngle = Math.PI * 0.495; C.minDistance = 2; C.maxDistance = 1800; C.screenSpacePanning = false;
  C.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
  S3.hemi = new THREE.HemisphereLight('#e8f1ff', '#8a8270', 1.0); sc.add(S3.hemi);
  const sun = S3.sun = new THREE.DirectionalLight('#fff6e8', 2.6); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  const sc2 = sun.shadow.camera; sc2.left = sc2.bottom = -260; sc2.right = sc2.top = 260; sc2.near = 10; sc2.far = 1400;
  sc.add(sun); sc.add(sun.target);
  const L = S3.layers = {};
  for (const k of ['terrain', 'areas', 'paths', 'build', 'interior', 'objects', 'traffic', 'net', 'agents', 'sel', 'ghost', 'labels']) { L[k] = new THREE.Group(); L[k].name = k; sc.add(L[k]); }
  // Transformations-Gizmo
  const T = S3.tc = new TransformControls(S3.camera, R.domElement);
  T.setSize(0.9); T.showY = false; T.setTranslationSnap(0.1); T.setRotationSnap(U.rad(5));
  T.addEventListener('dragging-changed', e => { C.enabled = !e.value; if (!e.value) S3._commitDrag(); });
  T.addEventListener('objectChange', () => S3._dragMove());
  sc.add(T);
  S3.proxy = new THREE.Object3D(); sc.add(S3.proxy);
  S3.raycaster = new THREE.Raycaster();
  window.addEventListener('resize', () => S3.resize());
  bindPointer(R.domElement);
  S3.setSun(V.sunHour);
  S3.clock = new THREE.Clock();
  const loop = () => { requestAnimationFrame(loop); S3.frame(); };
  loop();
};
S3.resize = () => {
  const el = S3.renderer.domElement.parentElement; if (!el) return;
  S3.camera.aspect = el.clientWidth / el.clientHeight; S3.camera.updateProjectionMatrix();
  S3.renderer.setSize(el.clientWidth, el.clientHeight); S3.labelRenderer.setSize(el.clientWidth, el.clientHeight);
};
S3.frame = () => {
  const dt = Math.min(0.1, S3.clock.getDelta());
  if (S3.fpvActive) HSS.fpv.update(dt); else S3.controls.update();
  HSS.traffic.update(dt);
  HSS.emit('frame', dt);
  S3.renderer.render(S3.scene, S3.camera);
  S3.labelRenderer.render(S3.scene, S3.camera);
};

/* ---------- Tageszeit, Sonne, Nacht ---------- */
S3.setSun = (hour) => {
  V.sunHour = hour;
  const t = (hour - 6) / 12; // 0 = Sonnenaufgang, 1 = Sonnenuntergang
  const elev = Math.sin(Math.PI * U.clamp(t, -0.15, 1.15)) * 52, az = U.lerp(80, 280, U.clamp(t, 0, 1));
  const phi = U.rad(90 - elev), th = U.rad(az);
  const dir = new THREE.Vector3().setFromSphericalCoords(1, phi, th);
  S3.sky.material.uniforms.sunPosition.value.copy(dir);
  S3.sun.position.copy(dir.clone().multiplyScalar(500)); S3.sun.target.position.set(0, 0, 0);
  const night = elev < 2;
  S3.night = night;
  S3.sun.intensity = night ? 0.0 : U.clamp(elev / 25, 0.25, 1) * 2.4;
  S3.sun.color.set(elev < 12 ? '#ffd6a6' : '#fff6e8');
  S3.hemi.intensity = night ? 0.12 : 0.7 + U.clamp(elev / 40, 0, 1) * 0.5;
  S3.hemi.color.set(night ? '#4a5a7a' : '#e8f1ff');
  S3.renderer.toneMappingExposure = night ? 0.9 : 0.9;
  S3.sky.visible = !night;
  S3.scene.background = new THREE.Color(night ? '#0d1828' : '#dce3e8');
  HSS.library.eachMaterial(m => { if (m.userData.key?.includes('|glas|') || m.userData.key?.includes('|chrom|') || m.userData.key?.includes('|metall|')) { m.envMap = S3.envMap; m.envMapIntensity = night ? 0.05 : (m.userData.key.includes('|glas|') ? 0.9 : 0.5); m.needsUpdate = true; } if (m.userData.key?.includes('|glas|')) { m.emissive = m.emissive || new THREE.Color(); m.emissive.set(night ? '#ffcf86' : '#000000'); m.emissiveIntensity = night ? 0.35 : 0; } if (m.userData.key?.includes('|leucht|')) m.emissiveIntensity = night ? 2.5 : 1.2; });
  S3.updateLamps(true);
};
S3.updateLamps = (force) => {
  for (const l of S3.lamps) S3.scene.remove(l);
  S3.lamps = [];
  if (!S3.night) return;
  const prj = HSS.project(), tgt = S3.controls.target;
  const cand = [];
  for (const o of prj.objects) {
    const d = HSS.library.get(o.lib); if (!d?.meta?.licht || o.host) continue;
    const p = HSS.objWorld(o); cand.push({ o, d, p, dist: Math.hypot(p.x - tgt.x, p.z - tgt.z) });
  }
  cand.sort((a, b) => a.dist - b.dist);
  for (const c of cand.slice(0, 28)) {
    const li = c.d.meta.licht, sc = (o => (o.size?.h || c.d.size.h) / c.d.size.h)(c.o);
    const pl = new THREE.PointLight(li.farbe, li.staerke * 6, li.reichweite * 1.5, 1.6);
    const off = G.rot([li.versatz || 0, 0], U.rad(-(c.p.rot || 0)));
    pl.position.set(c.p.x + off[0], c.p.y + li.hoehe * sc, c.p.z + off[1]);
    S3.scene.add(pl); S3.lamps.push(pl);
  }
};
setInterval(() => { if (S3.night && S3.scene) S3.updateLamps(); }, 2500);

/* ---------- Aufbau aller Ebenen ---------- */
const noPriv = (k, v) => (k && k[0] === '_' ? undefined : v);
const clear = g => { while (g.children.length) { const c = g.children.pop(); c.parent = null; c.traverse?.(o => { if (o.isCSS2DObject && o.element?.parentNode) o.element.parentNode.removeChild(o.element); }); } };
S3.rebuild = (scope = 'all') => {
  if (!S3.scene) return;
  const prj = HSS.project(), L = S3.layers;
  if (scope === 'objects') { buildObjects(); collectPickables(); S3.showSelection(); HSS.emit('rebuilt'); return; }
  S3.groups.clear();
  // Außenanlagen nur neu bauen, wenn sich Gelände, Weg oder Fläche geändert haben (große Standortmodelle bleiben flüssig)
  const tkey = JSON.stringify(prj.terrain) + '|' + V.explode + '|' + (V.floor !== null && V.floor < 0 ? 'ug' : 'og') + '|' + V.shell;
  const cache = S3._outCache || (S3._outCache = new Map());
  const cached = (id, key, make) => { const c = cache.get(id); if (c && c.key === key) return c.g; const g = make(); cache.set(id, { key, g }); return g; };
  if (scope === 'all' || scope === 'terrain') { clear(L.terrain); L.terrain.add(cached('__terrain', tkey + '|' + prj.buildings.length, () => HSS.buildTerrain(V))); }
  if (scope === 'all' || scope === 'outdoor' || scope === 'terrain') {
    clear(L.paths); for (const p of prj.paths) { const g = cached(p.id, JSON.stringify(p, noPriv) + tkey, () => HSS.buildPath(p, V)); L.paths.add(g); S3.groups.set(p.id, g); }
    clear(L.areas); for (const a of prj.areas) { const g = cached(a.id, JSON.stringify(a, noPriv) + tkey, () => HSS.buildArea(a, V)); L.areas.add(g); S3.groups.set(a.id, g); }
    if (cache.size > prj.paths.length + prj.areas.length + 50) { const live = new Set(prj.paths.map(p => p.id).concat(prj.areas.map(a => a.id), ['__terrain'])); for (const k of [...cache.keys()]) if (!live.has(k)) cache.delete(k); }
  }
  clear(L.build); clear(L.interior); clear(L.labels);
  // Gebäude und Innenausbau zwischenspeichern: nur geänderte Bauteile werden neu aufgebaut
  const bcache = S3._buildCache || (S3._buildCache = new Map()), live = new Set();
  const vkey = [V.cut, V.shell, V.explode, V.m2, V.stil, V.showBasement, JSON.stringify(prj.terrain)].join('|');
  // Wirksame Schnittebene je Bauteil: liegt die gewählte Etage über dem Dach, sieht das Bauteil aus wie in der Gesamtansicht
  const efloor = pt => { if (V.floor === null) return 'n'; const top = HSS.globalFloor(pt, pt.floors - 1, prj); return V.floor > top && V.floor >= 0 ? 'n' : V.floor; };
  const chain = pt => { const out = []; let p = pt, d = 0; while (p && p.stackOn && d++ < 8) { p = HSS.findPart(p.stackOn, prj)?.part; if (p) out.push(p); } return out; };
  const tick = (S3._tick = (S3._tick || 0) + 1);
  // Zwischenspeicher je Element und Ansicht (Etagenwechsel hin und zurück ohne Neuaufbau)
  const bcached = (id, key, make) => { const k = id + '#' + key.length + '#' + U.hash(key); live.add(k); const c = bcache.get(k); if (c && c.key === key) { c.t = tick; return c.g; } const g = make(); bcache.set(k, { key, g, t: tick, id }); return g; };
  for (const b of prj.buildings) for (const pt of b.parts) {
    const ptKey = JSON.stringify([pt, chain(pt), b.id, b.color]);
    const g = bcached(pt.id, ptKey + vkey + '|' + efloor(pt), () => HSS.buildPart(pt, b, V)); L.build.add(g); S3.groups.set(pt.id, g);
    for (const f of HSS.partFloors(pt)) {
      const gf = HSS.globalFloor(pt, f);
      if (V.floor === gf || (V.floor === null && V.shell === 'transparent')) L.interior.add(bcached(pt.id + '@' + f, ptKey + JSON.stringify(HSS.interior(pt.id, f)) + vkey + (V.floor === null ? 'n' : 'f'), () => HSS.buildInterior(pt, f, { cut: V.floor === null ? 'aus' : V.cut, explode: V.explode, m2: V.m2 })));
    }
  }
  for (const br of prj.bridges) {
    const A = HSS.findPart(br.a?.part, prj), B = HSS.findPart(br.b?.part, prj);
    const g = bcached(br.id, JSON.stringify([br, A?.part, B?.part, A && chain(A.part), B && chain(B.part)]) + vkey, () => HSS.buildBridge(br, V)); L.build.add(g); S3.groups.set(br.id, g);
  }
  if (bcache.size > 700) { const old = [...bcache.entries()].filter(([k]) => !live.has(k)).sort((a, b) => a[1].t - b[1].t); for (const [k] of old.slice(0, bcache.size - 500)) bcache.delete(k); }
  // gelöschte Elemente sofort verwerfen
  const ids = new Set(prj.buildings.flatMap(b => b.parts.map(p => p.id)).concat(prj.bridges.map(b => b.id)));
  for (const [k, c] of bcache) if (!ids.has(String(c.id).split('@')[0])) bcache.delete(k);
  buildObjects();
  buildLabels();
  if (scope === 'all' || scope === 'outdoor' || scope === 'terrain') HSS.traffic.build(L.traffic);
  const ug = V.floor !== null && V.floor < 0; L.traffic.visible = !ug && (HSS.perf?.trafficAnim !== false); L.areas.visible = !ug; L.terrain.visible = !ug;
  S3.sky.visible = !ug && !S3.night; S3.scene.background = new THREE.Color(ug ? '#3a4149' : S3.night ? '#0d1828' : '#dce3e8');
  // Wege-Anzeige: alle | ohne Gehwege | nur Straßen/Zufahrten | aus (nur Darstellung, das Wegenetz bleibt vollständig)
  const wegSichtbar = p => { const m = V.wege || 'alle'; if (!p) return true; if (m === 'aus') return false; if (m === 'ohneGehweg') return p.kind !== 'gehweg'; if (m === 'strassen') return ['strasse', 'zufahrt', 'tunnel', 'awt'].includes(p.kind); return true; };
  for (const g of L.paths.children) { const p = U.byId(prj.paths, g.userData.id); g.visible = wegSichtbar(p) && (!ug || (p && (p.kind === 'tunnel' || p.kind === 'awt'))); }
  collectPickables();
  S3.showSelection();
  HSS.emit('rebuilt');
};

/* Objekte (instanziert je Typ/Größe/Geschoss) */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function objVisible(o, prj) {
  if (!o.host) return !(V.floor !== null && V.floor < 0);
  const P = HSS.findPart(o.host.part, prj); if (!P) return false;
  const gf = HSS.globalFloor(P.part, o.host.floor, prj);
  if (V.floor === null) return V.shell === 'transparent';
  return gf === V.floor;
}
function buildObjects() {
  const prj = HSS.project(), L = S3.layers.objects; clear(L);
  const groups = new Map();
  // gewähltes Objekt einzeln aufbauen, damit es sich beim Ziehen direkt mitbewegt
  const selObj = HSS.state.selection?.kind === 'object' ? HSS.state.selection.id : null;
  for (const o of prj.objects) {
    if (o.hidden) continue;
    const d = HSS.library.get(o.lib); if (!d) continue;
    const size = o.size || d.size;
    const role = d.logistik?.rolle;
    const P = o.host ? HSS.findPart(o.host.part, prj) : null;
    if (o.host && !P) continue;
    // Aufzüge/Treppen: auf jedem Halt-Geschoss wiederholen
    let floors = null;
    if (P && (role === 'aufzug' || role === 'treppe')) {
      const lift = HSS.liftStops(o, prj);
      floors = (lift?.stops || [HSS.globalFloor(P.part, o.host.floor, prj)]).map(gf => { for (const pt of HSS.allParts(prj)) { const f = HSS.localFloor(pt, gf, prj); if (f !== null && G.pointIn(HSS.toLocal(pt, [lift?.x ?? 0, lift?.z ?? 0]), HSS.partFootprintLocal(pt).outer)) return { pt, f, gf }; } return null; }).filter(Boolean);
    }
    const insts = floors ? floors : [null];
    for (const fl of insts) {
      let wx, wy, wz, rot, sy = 1, gfKey;
      if (fl) {
        const w = HSS.toWorld(P.part, [o.x, o.z]); wx = w[0]; wz = w[1]; wy = HSS.floorY(fl.pt, fl.f, prj) + fl.gf * V.explode; rot = (o.rot || 0) + (P.part.rot || 0);
        sy = HSS.fh(fl.pt, fl.f) / d.size.h; gfKey = fl.gf;
        if (!(V.floor === fl.gf || (V.floor === null && V.shell === 'transparent'))) continue;
      } else {
        if (!objVisible(o, prj)) continue;
        const wp = HSS.objWorld(o, prj); wx = wp.x; wy = wp.y; wz = wp.z; rot = wp.rot;
        if (P) { gfKey = HSS.globalFloor(P.part, o.host.floor, prj); wy += gfKey * V.explode; if (d.anchor === 'decke') wy = HSS.floorY(P.part, o.host.floor, prj) + HSS.fh(P.part, o.host.floor) - 0.25 - size.h + gfKey * V.explode; }
      }
      if (o.id === selObj && !d.model) { const g = HSS.library.build(o.lib, { w: size.w, d: size.d, h: size.h * sy }, { color: o.color }); g.position.set(wx, wy, wz); g.rotation.y = -U.rad(rot); g.userData = { kind: 'object', id: o.id, lib: o.lib }; g.traverse(m => { if (m.isMesh) m.userData = { kind: 'object', id: o.id }; }); HSS.stil?.applyTo(g); L.add(g); continue; }
      if (d.model) { const g = HSS.library.build(o.lib, size); g.position.set(wx, wy, wz); g.rotation.y = -U.rad(rot); g.traverse(m => { if (m.isMesh) m.userData = { kind: 'object', id: o.id }; }); L.add(g); continue; }
      // Gruppen je Geschoss bzw. Geländezelle (80 m): Änderungen betreffen nur einen kleinen Teil
      const where = o.host ? o.host.part + '@' + (fl ? fl.gf : o.host.floor) : 'c' + Math.floor(wx / 80) + ',' + Math.floor(wz / 80);
      const key = o.lib + '|' + size.w + '|' + size.d + '|' + size.h * sy + '|' + (o.color || '') + '|' + where + (o.host ? '|i' : '');
      if (!groups.has(key)) groups.set(key, { lib: o.lib, size, sy, color: o.color, items: [], inside: !!o.host });
      groups.get(key).items.push({ id: o.id, x: wx, y: wy, z: wz, rot });
    }
  }
  const ocache = S3._objCache || (S3._objCache = new Map()), olive = new Set();
  for (const [key, gr] of groups) {
    // unveränderte Objektgruppen wiederverwenden (bleiben für die Bündelung zwischengespeichert)
    const sig = key + '|' + V.stil + '|' + JSON.stringify(gr.items);
    olive.add(key);
    const hit = ocache.get(key);
    if (hit && hit.sig === sig) { hit.meshes.forEach(m => L.add(m)); continue; }
    const made = [];
    const P = HSS.library.proto(gr.lib, gr.color); if (!P) continue;
    const d = P.def, sx = gr.size.w / d.size.w, sy = gr.size.h / d.size.h * gr.sy, sz = gr.size.d / d.size.d;
    const meshes = P.meshes.map(m => ({ geo: m.geo, mat: m.mat })).concat(P.swing.map(s => ({ geo: s.g, mat: HSS.library.material(s.p.c, s.p.m) })));
    for (const m of meshes) {
      const im = new THREE.InstancedMesh(m.geo, m.mat, gr.items.length);
      gr.items.forEach((it, i) => { _q.setFromEuler(_e.set(0, -U.rad(it.rot), 0)); _m.compose(_p.set(it.x, it.y, it.z), _q, _s.set(sx, sy, sz)); im.setMatrixAt(i, _m); });
      im.castShadow = !gr.inside; im.receiveShadow = true;
      im.userData = { kind: 'object', ids: gr.items.map(it => it.id) };
      im.computeBoundingSphere();
      L.add(im); made.push(im);
    }
    ocache.set(key, { sig, meshes: made });
  }
  // nicht sichtbare Gruppen (andere Etagen) eine Weile behalten, damit der Etagenwechsel schnell bleibt
  for (const [k, v] of ocache) { if (olive.has(k)) v.t = S3._tick || 0; }
  if (ocache.size > 1500) { const old = [...ocache.entries()].filter(([k]) => !olive.has(k)).sort((a, b) => (a[1].t || 0) - (b[1].t || 0)); for (const [k] of old.slice(0, ocache.size - 1000)) ocache.delete(k); }
}
function buildLabels() {
  const prj = HSS.project(), L = S3.layers.labels;
  if (!V.labels) return;
  for (const b of prj.buildings) {
    if (!b.parts.length || (b.noLabel && !V.m2)) continue;
    // Anker: Mitte des größten Bauteils, Höhe = Dach des höchsten Bauteils; das Kürzel sitzt genau über dem Anker
    const top = b.parts.reduce((a, pt) => HSS.partTopY(pt) > HSS.partTopY(a) ? pt : a, b.parts[0]);
    const main = b.parts.filter(pt => !pt.stackOn).reduce((a, pt) => HSS.partArea(pt) > HSS.partArea(a) ? pt : a, b.parts.find(pt => !pt.stackOn) || b.parts[0]);
    const el = document.createElement('div'); el.className = 'blbl';
    el.innerHTML = `<div class="blin"><b class="hk" style="background:${U.esc(b.color)}">${U.esc(b.kurz || '•')}</b><span class="kz">${U.esc(b.name)}${V.m2 && V.floor === null ? ` · <b>${U.fmt(HSS.flaechen?.bgfBuilding(b) || 0)} m² BGF</b>` : ''}</span></div><i class="pin"></i>`;
    el.querySelector('.blin').onclick = () => S3.select({ kind: 'part', id: main.id });
    const o = new CSS2DObject(el); const yTop = V.floor !== null ? HSS.floorY(top, Math.min(top.floors - 1, Math.max(0, V.floor))) + 3.5 : HSS.partTopY(top) + 1;
    o.position.set(main.x, yTop + (top.floors) * V.explode, main.z); L.add(o);
  }
  if (V.floor !== null) {
    for (const b of prj.buildings) for (const pt of b.parts) {
      const f = HSS.localFloor(pt, V.floor); if (f === null) continue;
      const I = HSS.interior(pt.id, f); if (!I) continue;
      for (const r of I.rooms) {
        let a = HSS.roomArea(r);
        if (V.m2 || V.stil === 'cartoon') a -= U.sum(I.rooms.filter(y => y !== r && Math.abs(y.x - r.x) <= (r.w - y.w) / 2 + 0.05 && Math.abs(y.z - r.z) <= (r.d - y.d) / 2 + 0.05 && HSS.roomArea(y) < a).map(HSS.roomArea));
        if (V.m2) { if (a < 1.5) continue; }
        else if (['flur', 'nass', 'patient1', 'patient2', 'wc', 'putz', 'vorraum', 'schacht', 'kern', 'reserve'].includes(r.use) || a < 8) continue;
        const w = HSS.toWorld(pt, [r.x, r.z]);
        const el = document.createElement('div'); el.className = 'rlbl'; el.dataset.a = Math.round(a);
        const nm = r.name || (HSS.ROOMTYPES[r.use] || {}).name || 'Raum';
        if (V.m2) { el.classList.add('m2'); if (a < 12) el.classList.add('sm'); el.innerHTML = `${a >= 16 ? `<span>${U.esc(nm)}</span>` : ''}<b>${U.fmt(a, 1)} m²</b>`; el.title = `${nm} · ${U.fmt(r.w, 2)} × ${U.fmt(r.d, 2)} m · ${HSS.DIN277[HSS.roomDin(r)]?.name || ''}`; el.style.pointerEvents = 'auto'; el.onclick = () => S3.select({ kind: 'room', id: r.id, part: pt.id, floor: f }); }
        else if (V.stil === 'cartoon') { el.classList.add('card'); el.innerHTML = `<span>${U.esc(nm)}</span><small>${U.fmt(a, 0)} m²</small>`; }
        else el.textContent = nm;
        const o = new CSS2DObject(el); o.position.set(w[0], HSS.floorY(pt, f) + V.floor * V.explode + 0.3, w[1]); L.add(o);
      }
    }
  }
}
function collectPickables() {
  const arr = S3.pickables = [];
  for (const k of ['build', 'interior', 'objects', 'paths', 'areas']) S3.layers[k].traverseVisible(o => { if (o.isMesh) arr.push(o); });
}

/* ---------- Auswahl ---------- */
HSS.state.selection = null;
S3.select = (sel, opts = {}) => {
  HSS.state.selection = sel;
  S3.showSelection();
  HSS.emit('selection', sel);
  if (opts.focus && sel) S3.focusSel(sel);
};
const selBounds = sel => {
  const prj = HSS.project(), box = new THREE.Box3();
  if (!sel) return null;
  if (sel.kind === 'part') {
    const P = HSS.findPart(sel.id); if (!P) return null;
    const fp = HSS.partFootprint(P.part).outer; const y0 = HSS.floorY(P.part, -(P.part.stackOn ? 0 : P.part.basements || 0)), y1 = HSS.partTopY(P.part);
    for (const [x, z] of fp) { box.expandByPoint(new THREE.Vector3(x, y0, z)); box.expandByPoint(new THREE.Vector3(x, y1, z)); }
    return box;
  }
  if (sel.kind === 'object') {
    const o = U.byId(prj.objects, sel.id); if (!o) return null; const d = HSS.library.get(o.lib); const s = o.size || d?.size || { w: 1, d: 1, h: 1 };
    const p = HSS.objWorld(o); const r = Math.hypot(s.w, s.d) / 2;
    return box.set(new THREE.Vector3(p.x - r, p.y, p.z - r), new THREE.Vector3(p.x + r, p.y + s.h, p.z + r));
  }
  const g = S3.groups.get(sel.id); if (g) return box.setFromObject(g);
  if (sel.kind === 'room' || sel.kind === 'wall') {
    const P = HSS.findPart(sel.part); if (!P) return null; const I = HSS.interior(sel.part, sel.floor); if (!I) return null;
    const r = (sel.kind === 'room' ? I.rooms : I.walls).find(x => x.id === sel.id); if (!r) return null;
    const pts = sel.kind === 'room' ? [[r.x - r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z + r.d / 2], [r.x - r.w / 2, r.z + r.d / 2], [r.x + r.w / 2, r.z - r.d / 2]] : [r.a, r.b];
    const y = HSS.floorY(P.part, sel.floor);
    for (const q of pts) { const w = HSS.toWorld(P.part, q); box.expandByPoint(new THREE.Vector3(w[0], y, w[1])); box.expandByPoint(new THREE.Vector3(w[0], y + 2.5, w[1])); }
    return box;
  }
  return null;
};
S3.selBounds = selBounds;
S3.showSelection = () => {
  const L = S3.layers.sel; clear(L); S3.tc.detach();
  const sel = HSS.state.selection; if (!sel) return;
  const box = selBounds(sel); if (!box || box.isEmpty()) return;
  if (!(HSS.manip && ['part', 'area', 'path', 'bridge'].includes(sel.kind))) { const helper = new THREE.Box3Helper(box, new THREE.Color('#0A967A')); helper.material.depthTest = false; helper.renderOrder = 10; L.add(helper); }
  // Wegpunkte als Griffe (nur ohne Direktbearbeitung – sonst zeichnet manip.js die Griffe)
  if (sel.kind === 'path' && !HSS.manip) {
    const p = U.byId(HSS.project().paths, sel.id); if (p) p.points.forEach((q, i) => {
      const y = p.elev === 'absolut' ? (p.y ?? -4) : HSS.terrainH(q[0], q[1]);
      const h = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.5, (p.width || 3) * 0.18), 14, 10), new THREE.MeshBasicMaterial({ color: i === sel.point ? '#f2c94c' : '#0A967A', depthTest: false })); h.renderOrder = 11;
      h.position.set(q[0], y + 0.4, q[1]); h.userData = { kind: 'pathpoint', id: p.id, idx: i }; L.add(h);
    });
  }
  if (S3.tool) return;
  // Gizmo
  const movable = HSS.manip ? sel.kind === 'hill' : ['part', 'object', 'area', 'room'].includes(sel.kind) || (sel.kind === 'path' && sel.point !== undefined) || (sel.kind === 'hill');
  if (!movable || HSS.state.demoReadonly) return;
  const piv = selPivot(sel); if (!piv) return;
  S3.proxy.position.copy(piv.pos); S3.proxy.rotation.set(0, piv.rot || 0, 0);
  S3.dragStart = { pos: piv.pos.clone(), rot: piv.rot || 0, sel: U.clone(sel) };
  S3.tc.setMode(S3.gizmoMode || 'translate'); S3.tc.showX = S3.tc.showZ = S3.tc.mode === 'translate'; S3.tc.showY = S3.tc.mode === 'rotate';
  S3.tc.attach(S3.proxy);
};
const selPivot = sel => {
  const prj = HSS.project();
  if (sel.kind === 'part') { const P = HSS.findPart(sel.id); if (!P) return null; return { pos: new THREE.Vector3(P.part.x, HSS.partBaseY(P.part), P.part.z), rot: -U.rad(P.part.rot || 0) }; }
  if (sel.kind === 'object') { const o = U.byId(prj.objects, sel.id); if (!o) return null; const p = HSS.objWorld(o); return { pos: new THREE.Vector3(p.x, p.y, p.z), rot: -U.rad(p.rot) }; }
  if (sel.kind === 'area') { const a = U.byId(prj.areas, sel.id); if (!a) return null; return { pos: new THREE.Vector3(a.x, HSS.terrainH(a.x, a.z) + 0.2, a.z), rot: -U.rad(a.rot || 0) }; }
  if (sel.kind === 'path') { const p = U.byId(prj.paths, sel.id); const q = p?.points[sel.point]; if (!q) return null; return { pos: new THREE.Vector3(q[0], (p.elev === 'absolut' ? p.y : HSS.terrainH(q[0], q[1])) + 0.4, q[1]), rot: 0 }; }
  if (sel.kind === 'room') { const P = HSS.findPart(sel.part); const r = HSS.interior(sel.part, sel.floor)?.rooms.find(x => x.id === sel.id); if (!P || !r) return null; const w = HSS.toWorld(P.part, [r.x, r.z]); return { pos: new THREE.Vector3(w[0], HSS.floorY(P.part, sel.floor) + 0.1, w[1]), rot: -U.rad(P.part.rot || 0) }; }
  if (sel.kind === 'hill') { const h = prj.terrain.hills[sel.idx]; if (!h) return null; return { pos: new THREE.Vector3(h.x, HSS.terrainH(h.x, h.z), h.z), rot: 0 }; }
  return null;
};
S3._dragMove = () => {
  const L = S3.layers.sel, st = S3.dragStart; if (!st) return;
  const d = S3.proxy.position.clone().sub(st.pos);
  for (const c of L.children) if (c.isBox3Helper) c.box.translate(d.clone().sub(S3._lastD || new THREE.Vector3())); S3._lastD = d.clone();
  const g = S3.groups.get(st.sel.id); if (g && st.sel.kind === 'part') g.position.set(d.x, 0, d.z);
  if (g && st.sel.kind === 'area') g.position.set(d.x, 0, d.z);
};
S3._commitDrag = () => {
  const st = S3.dragStart; if (!st) return; S3._lastD = null;
  const d = S3.proxy.position.clone().sub(st.pos), dr = S3.proxy.rotation.y - st.rot;
  if (d.lengthSq() < 1e-6 && Math.abs(dr) < 1e-6) return;
  const sel = st.sel, snap = v => Math.round(v * 10) / 10;
  HSS.change(S3.tc.mode === 'rotate' ? 'Drehen' : 'Verschieben', prj => {
    if (sel.kind === 'part') { const P = HSS.findPart(sel.id, prj); P.part.x = snap(P.part.x + d.x); P.part.z = snap(P.part.z + d.z); P.part.rot = Math.round(((P.part.rot || 0) - U.deg(dr)) * 10) / 10; }
    if (sel.kind === 'object') {
      const o = U.byId(prj.objects, sel.id);
      if (o.host) { const P = HSS.findPart(o.host.part, prj); const loc = HSS.toLocal(P.part, [S3.proxy.position.x, S3.proxy.position.z]); o.x = snap(loc[0]); o.z = snap(loc[1]); }
      else { o.x = snap(o.x + d.x); o.z = snap(o.z + d.z); }
      o.rot = Math.round(((o.rot || 0) - U.deg(dr)) % 360);
    }
    if (sel.kind === 'area') { const a = U.byId(prj.areas, sel.id); a.x = snap(a.x + d.x); a.z = snap(a.z + d.z); a.rot = Math.round((a.rot || 0) - U.deg(dr)); }
    if (sel.kind === 'path') { const p = U.byId(prj.paths, sel.id); p.points[sel.point] = [snap(p.points[sel.point][0] + d.x), snap(p.points[sel.point][1] + d.z)]; }
    if (sel.kind === 'room') {
      const P = HSS.findPart(sel.part, prj), I = HSS.interior(sel.part, sel.floor, false, prj), r = I.rooms.find(x => x.id === sel.id);
      const loc = HSS.toLocal(P.part, [S3.proxy.position.x, S3.proxy.position.z]); const dx = snap(loc[0]) - r.x, dz = snap(loc[1]) - r.z;
      r.x += dx; r.z += dz; for (const w of I.walls) if (w.room === r.id) { w.a = [w.a[0] + dx, w.a[1] + dz]; w.b = [w.b[0] + dx, w.b[1] + dz]; }
    }
    if (sel.kind === 'hill') { const h = prj.terrain.hills[sel.idx]; h.x = snap(h.x + d.x); h.z = snap(h.z + d.z); }
  }, { scope: sel.kind === 'part' || sel.kind === 'hill' ? 'all' : sel.kind === 'area' || sel.kind === 'path' ? 'outdoor' : 'objects' });
};
S3.focusSel = (sel) => { const b = selBounds(sel); if (b) S3.focusBox(b); };
S3.focusBox = (box, opts = {}) => {
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(8, s.length() * 0.75) * (opts.k || 1);
  const dir = S3.camera.position.clone().sub(S3.controls.target).normalize();
  if (dir.y < 0.35) { dir.y = 0.45; dir.normalize(); }
  S3.animateCam(c.clone().add(dir.multiplyScalar(r)), c, opts.ms || 700);
};
S3.animateCam = (pos, target, ms = 700) => {
  const p0 = S3.camera.position.clone(), t0 = S3.controls.target.clone(), start = performance.now();
  const step = () => { const k = U.clamp((performance.now() - start) / ms, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; S3.camera.position.lerpVectors(p0, pos, e); S3.controls.target.lerpVectors(t0, target, e); if (k < 1) requestAnimationFrame(step); };
  step();
};
S3.home = () => {
  const prj = HSS.project(), box = new THREE.Box3();
  for (const pt of HSS.allParts(prj)) for (const [x, z] of HSS.partFootprint(pt).outer) { box.expandByPoint(new THREE.Vector3(x, 0, z)); box.expandByPoint(new THREE.Vector3(x, HSS.partTopY(pt), z)); }
  for (const p of prj.paths) for (const [x, z] of p.points) box.expandByPoint(new THREE.Vector3(x, 0, z));
  if (box.isEmpty()) box.set(new THREE.Vector3(-60, 0, -60), new THREE.Vector3(60, 20, 60));
  const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(60, Math.max(s.x, s.z) * 0.95);
  S3.animateCam(new THREE.Vector3(c.x - r * 0.55, r * 0.75, c.z + r * 0.85), c, 800);
};
S3.zoom = k => { const d = S3.camera.position.clone().sub(S3.controls.target); S3.animateCam(S3.controls.target.clone().add(d.multiplyScalar(k)), S3.controls.target.clone(), 250); };

/* ---------- Ebenenansicht ---------- */
S3.floorRange = () => {
  const prj = HSS.project(); let lo = 0, hi = 0;
  for (const pt of HSS.allParts(prj)) for (const f of HSS.partFloors(pt)) { const gf = HSS.globalFloor(pt, f, prj); lo = Math.min(lo, gf); hi = Math.max(hi, gf); }
  return [lo, hi];
};
S3.setFloor = (gf) => { V.floor = gf; S3.rebuild('all'); HSS.emit('view'); };

/* ---------- Zeiger, Picking, Werkzeuge ---------- */
const ndc = new THREE.Vector2();
S3.ray = (ev) => {
  const r = S3.renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  S3.raycaster.setFromCamera(ndc, S3.camera); return S3.raycaster;
};
S3.pick = (ev, list = S3.pickables) => {
  const rc = S3.ray(ev);
  const hits = rc.intersectObjects(list, false);
  for (const h of hits) {
    const u = (h.object.userData?.ranges ? HSS.perf.rangeData(h.object, h.faceIndex) : h.object.userData) || {};
    if (h.object.material?.visible === false && !u.pick) continue;
    if (u.kind === 'object' && u.ids) return { kind: 'object', id: u.ids[h.instanceId], point: h.point };
    if (u.kind === 'object') return { kind: 'object', id: u.id, point: h.point };
    if (u.kind === 'part') return { kind: 'part', id: u.id, point: h.point, floor: u.floor };
    if (u.kind === 'bridge' || u.kind === 'path' || u.kind === 'area') return { kind: u.kind, id: u.id, point: h.point };
    if (u.kind === 'room' || u.kind === 'wall') return { kind: u.kind, id: u.id, part: u.part, floor: u.floor, point: h.point };
  }
  return null;
};
// Bodenpunkt: Gelände bzw. Geschossebene in der aktuellen Ansicht
S3.groundPoint = (ev) => {
  const rc = S3.ray(ev), prj = HSS.project();
  if (V.floor !== null) {
    let best = null;
    for (const pt of HSS.allParts(prj)) {
      const f = HSS.localFloor(pt, V.floor, prj); if (f === null) continue;
      const y = HSS.floorY(pt, f, prj) + V.floor * V.explode;
      const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y), hit = new THREE.Vector3();
      if (!rc.ray.intersectPlane(pl, hit)) continue;
      const loc = HSS.toLocal(pt, [hit.x, hit.z]), fp = HSS.partFootprintLocal(pt);
      if (G.pointIn(loc, fp.outer) && !fp.holes.some(h => G.pointIn(loc, h))) { const d = hit.distanceTo(rc.ray.origin); if (!best || d < best.d) best = { d, x: hit.x, y, z: hit.z, host: { part: pt.id, floor: f }, loc, part: pt }; }
    }
    if (best) return best;
  }
  const t = S3.layers.terrain.children[0]?.children[0];
  const hits = t ? rc.intersectObject(t, false) : [];
  if (hits.length) return { x: hits[0].point.x, y: hits[0].point.y, z: hits[0].point.z, host: null };
  const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  if (rc.ray.intersectPlane(pl, hit)) return { x: hit.x, y: 0, z: hit.z, host: null };
  return null;
};
let downAt = null;
function bindPointer(dom) {
  dom.addEventListener('pointerdown', ev => { downAt = { x: ev.clientX, y: ev.clientY, t: performance.now(), button: ev.button }; if (S3.tool?.down) S3.tool.down(ev); });
  dom.addEventListener('pointermove', ev => { if (S3.tool?.move) S3.tool.move(ev); else hover(ev); });
  dom.addEventListener('pointerup', ev => {
    if (S3.tool?.up) S3.tool.up(ev);
    if (!downAt || ev.button !== 0) return;
    const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5; downAt = null;
    if (moved || S3.tc.dragging || S3.fpvActive) return;
    if (S3.tool?.click) { S3.tool.click(ev); return; }
    // Wegpunkt-Griffe zuerst
    const hp = S3.ray(ev).intersectObjects(S3.layers.sel.children.filter(c => c.isMesh), false)[0];
    if (hp) { const u = hp.object.userData; S3.select({ kind: 'path', id: u.id, point: u.idx }); return; }
    const h = S3.pick(ev);
    S3.select(h ? (h.kind === 'room' || h.kind === 'wall' ? { kind: h.kind, id: h.id, part: h.part, floor: h.floor } : { kind: h.kind, id: h.id }) : null);
  });
  dom.addEventListener('dblclick', ev => { if (S3.tool?.dbl) S3.tool.dbl(ev); else { const h = S3.pick(ev); if (h) S3.focusSel(h.kind === 'room' ? h : { kind: h.kind, id: h.id }); } });
  dom.addEventListener('contextmenu', ev => ev.preventDefault());
  window.addEventListener('keydown', ev => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    if (S3.tool?.key && S3.tool.key(ev) === true) return;
    if (ev.key === 'Escape') { if (S3.tool) S3.setTool(null); else S3.select(null); }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && HSS.state.selection && !S3.tool) { ev.preventDefault(); HSS.ui?.deleteSelection(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); const l = ev.shiftKey ? HSS.redo() : HSS.undo(); if (l) HSS.ui?.toast(l); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); const l = HSS.redo(); if (l) HSS.ui?.toast(l); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd' && HSS.state.selection) { ev.preventDefault(); HSS.ui?.duplicateSelection(); }
    if (ev.key.toLowerCase() === 'r' && !ev.ctrlKey && HSS.state.selection && !S3.tool) { S3.gizmoMode = S3.gizmoMode === 'rotate' ? 'translate' : 'rotate'; S3.showSelection(); HSS.ui?.toast(S3.gizmoMode === 'rotate' ? 'Drehen (R wechselt)' : 'Verschieben (R wechselt)'); }
  });
}
function hover(ev) {
  if (S3.fpvActive || S3.tc.dragging || HSS.manip?.dragging) { if (HSS.ui?.tipEl) HSS.ui.tipEl.hidden = true; return; }
  const tip = HSS.ui?.tipEl; if (!tip) return;
  if (S3._hovT && performance.now() - S3._hovT < 60) return; S3._hovT = performance.now();
  const h = S3.pick(ev);
  if (!h) { tip.hidden = true; S3.renderer.domElement.style.cursor = ''; return; }
  S3.renderer.domElement.style.cursor = 'pointer';
  tip.innerHTML = HSS.ui.describe(h); tip.hidden = false;
  tip.style.left = (ev.clientX + 14) + 'px'; tip.style.top = (ev.clientY + 12) + 'px';
}

/* Werkzeugwechsel: tool = { name, hint, down/move/up/click/dbl/key, cancel } */
S3.setTool = (tool) => {
  if (S3.tool?.cancel) S3.tool.cancel();
  clear(S3.layers.ghost);
  S3.tool = tool; S3.tc.detach();
  S3.renderer.domElement.style.cursor = tool ? 'crosshair' : '';
  HSS.emit('tool', tool);
  if (!tool) S3.showSelection();
};

/* ---------- Bildschirmfoto (Beauty Shot) ---------- */
S3.beautyShot = (scale = 2) => {
  const R = S3.renderer, el = R.domElement, pr = R.getPixelRatio();
  const sel = S3.layers.sel.visible, tcv = S3.tc.visible;
  S3.layers.sel.visible = false; S3.tc.visible = false; S3.layers.net.visible = false; if (S3.layers.grid) S3.layers.grid.visible = false;
  R.setPixelRatio(pr * scale); R.setSize(el.clientWidth, el.clientHeight, false);
  R.render(S3.scene, S3.camera);
  const url = el.toDataURL('image/png');
  R.setPixelRatio(pr); R.setSize(el.clientWidth, el.clientHeight, false);
  S3.layers.sel.visible = sel; S3.tc.visible = tcv; S3.layers.net.visible = true; if (S3.layers.grid) S3.layers.grid.visible = true;
  const a = document.createElement('a'); a.href = url; a.download = (HSS.project().meta.name || 'hss').replace(/\W+/g, '_') + '_' + new Date().toISOString().slice(0, 16).replace(/\D/g, '') + '.png'; a.click();
};
})();
