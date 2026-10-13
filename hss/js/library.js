/* =====================================================================
   HSS · library.js – Objektbibliothek
   ---------------------------------------------------------------------
   Austauschformat (siehe docs/OBJEKTFORMAT.md):
     Einzelobjekt  *.hssobj.json  { format:'hss-object', version:1, id, name, category, size:{w,d,h}, parts:[…] | model:'data:model/gltf-binary;base64,…' }
     Paket         *.hsslib.json  { format:'hss-library', version:1, name, objects:[ … ] }
     3D-Modell     *.glb / *.gltf  (wird beim Hochladen in ein hss-object mit eingebettetem Modell umgewandelt)
   Maße in Metern: w = Breite (x), d = Tiefe (z), h = Höhe (y). Ursprung = Mitte auf dem Boden,
   Vorderseite zeigt nach +z. Teile werden in Standardgröße beschrieben; beim Ändern der Größe
   skaliert die Suite das Objekt achsweise.
   Neue Objekte brauchen keine Programmänderung: Datei in der Bibliothek hochladen oder als
   library/*.js-Paket mit HSS.library.registerPack({...}) einbinden (siehe library/manifest.js).
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const { THREE, RoundedBoxGeometry, mergeGeometries, GLTFLoader } = window.THREEX;

const REG = new Map();          // id → Definition
const PROTO = new Map();        // Schlüssel → { parts:[{geo, mat}] } (zusammengeführte Geometrie je Material)
const THUMB = new Map();
const PRIMS = ['box', 'cyl', 'sph', 'cone', 'tor', 'cap'];
const MATS = ['matt', 'kunststoff', 'metall', 'chrom', 'glas', 'stoff', 'holz', 'leucht', 'bildschirm', 'gummi', 'lack'];

/* ---------- Baukasten für Paket-Autoren (erzeugt reines JSON) ---------- */
const K = {};
K.box = (x, y, z, w, h, d, c, m = 'kunststoff', o = {}) => Object.assign({ t: 'box', p: [x, y, z], s: [w, h, d], c, m }, o);
K.cyl = (x, y, z, r, h, c, m = 'metall', o = {}) => Object.assign({ t: 'cyl', p: [x, y, z], r, h, c, m }, o);
K.sph = (x, y, z, r, c, m = 'kunststoff', o = {}) => Object.assign({ t: 'sph', p: [x, y, z], r, c, m }, o);
K.cone = (x, y, z, r, h, c, m = 'matt', o = {}) => Object.assign({ t: 'cone', p: [x, y, z], r, h, c, m }, o);
K.tor = (x, y, z, R, r, c, m = 'gummi', o = {}) => Object.assign({ t: 'tor', p: [x, y, z], R, r, c, m }, o);
K.cap = (x, y, z, r, h, c, m = 'stoff', o = {}) => Object.assign({ t: 'cap', p: [x, y, z], r, h, c, m }, o);
K.legs = (w, d, h, r = 0.02, c = '#b8bec6', inset = 0.04, y0 = 0) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => K.cyl(sx * (w / 2 - inset), y0 + h / 2, sz * (d / 2 - inset), r, h, c, 'metall'));
K.casters = (w, d, r = 0.05, inset = 0.06, c = '#2d3238') => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => K.cyl(sx * (w / 2 - inset), r, sz * (d / 2 - inset), r, 0.035, c, 'gummi', { ax: 'x' }));
K.cabinet = (w, d, h, c = '#e8eaec', o = {}) => {
  const out = [K.box(0, h / 2 + 0.05, 0, w, h - 0.1, d, c, o.m || 'lack'), K.box(0, 0.025, 0.02, w - 0.04, 0.05, d - 0.06, '#4b5058', 'matt')];
  const n = o.doors ?? Math.max(1, Math.round(w / 0.5));
  for (let i = 0; i < n; i++) {
    const dw = w / n, x = -w / 2 + dw * (i + 0.5);
    out.push(K.box(x, h / 2 + 0.05, d / 2 + 0.005, dw - 0.012, h - 0.12, 0.01, o.front || c, 'lack'));
    out.push(K.box(x + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), Math.min(h * 0.55, 1.1), d / 2 + 0.02, 0.015, 0.14, 0.02, '#9aa1aa', 'chrom'));
  }
  return out;
};
K.shelf = (w, d, h, n = 5, c = '#c8ced5', load = '#2d7694') => {
  const out = [...K.legs(w, d, h, 0.015, c, 0.02)];
  for (let i = 0; i < n; i++) {
    const y = 0.12 + i * (h - 0.2) / (n - 1);
    out.push(K.box(0, y, 0, w, 0.025, d, c, 'metall'));
    if (load && i < n - 1) out.push(K.box(-w * 0.18, y + 0.12, 0, w * 0.5, 0.2, d * 0.75, i % 2 ? load : '#dce3e8', 'kunststoff'));
  }
  return out;
};
K.screen = (x, y, z, w, h, c = '#2b3138') => [K.box(x, y, z, w, h, 0.04, c, 'kunststoff'), K.box(x, y, z + 0.022, w * 0.9, h * 0.85, 0.005, '#14324f', 'bildschirm')];
K.pole = (x, z, h, r = 0.02, c = '#b8bec6') => K.cyl(x, h / 2, z, r, h, c, 'metall');
K.wheel = (x, y, z, r, wd = 0.22) => [K.cyl(x, y, z, r, wd, '#1f2328', 'gummi', { ax: 'x' }), K.cyl(x + Math.sign(x) * 0.005, y, z, r * 0.55, wd + 0.01, '#aab1ba', 'chrom', { ax: 'x' })];
// Person: Beine/Arme mit Schwingachsen für die Gehanimation
K.person = (o = {}) => {
  const h = o.h || 1.75, s = h / 1.75;
  const skin = o.skin || '#e0b896', top = o.top || '#2d7694', legs = o.legs || top, shoe = o.shoe || '#f2f2f2', hair = o.hair || '#3b2a1e';
  const P = [];
  const hip = 0.92 * s, sh = 1.42 * s;
  for (const sx of [-1, 1]) {
    P.push(K.cap(sx * 0.09 * s, hip - 0.43 * s, 0, 0.065 * s, 0.7 * s, legs, 'stoff', { piv: [sx * 0.09 * s, hip, 0], sw: sx }));
    P.push(K.box(sx * 0.09 * s, 0.04 * s, 0.03 * s, 0.1 * s, 0.08 * s, 0.25 * s, shoe, 'kunststoff', { piv: [sx * 0.09 * s, hip, 0], sw: sx }));
    P.push(K.cap(sx * 0.24 * s, sh - 0.3 * s, 0, 0.045 * s, 0.5 * s, o.sleeve || top, 'stoff', { piv: [sx * 0.24 * s, sh, 0], sw: -sx }));
    P.push(K.sph(sx * 0.24 * s, sh - 0.6 * s, 0, 0.045 * s, skin, 'matt', { piv: [sx * 0.24 * s, sh, 0], sw: -sx }));
  }
  P.push(K.box(0, (hip + sh) / 2 + 0.02 * s, 0, 0.4 * s, sh - hip + 0.12 * s, 0.22 * s, top, 'stoff', { rr: 0.06 * s }));
  if (o.coat) P.push(K.box(0, (0.55 * s + sh) / 2, 0, 0.44 * s, sh - 0.55 * s, 0.25 * s, o.coat, 'stoff', { rr: 0.05 * s }));
  if (o.vest) P.push(K.box(0, (hip + sh) / 2 + 0.02 * s, 0, 0.42 * s, (sh - hip) * 0.8, 0.235 * s, o.vest, 'stoff', { rr: 0.05 * s }));
  P.push(K.cyl(0, sh + 0.06 * s, 0, 0.05 * s, 0.1 * s, skin, 'matt'));
  P.push(K.sph(0, 1.62 * s, 0, 0.115 * s, skin, 'matt'));
  if (o.cap) P.push(K.sph(0, 1.67 * s, -0.005, 0.12 * s, o.cap, 'stoff', { sc: [1, 0.7, 1] }));
  else P.push(K.sph(0, 1.665 * s, -0.02 * s, 0.118 * s, hair, 'stoff', { sc: [1, 0.75, 1] }));
  if (o.mask) P.push(K.box(0, 1.58 * s, 0.1 * s, 0.15 * s, 0.08 * s, 0.03 * s, o.mask, 'stoff'));
  if (o.steth) P.push(K.tor(0, sh - 0.05 * s, 0.11 * s, 0.09 * s, 0.008, '#2b3138', 'gummi', { rx: 90 }));
  return P;
};
K.figureSeated = (o = {}) => {
  const skin = o.skin || '#e0b896', top = o.top || '#9fb7c9', legs = o.legs || '#4d5b6b';
  return [
    K.box(0, 0.5, 0.02, 0.38, 0.14, 0.42, legs, 'stoff'), K.box(-0.09, 0.27, 0.22, 0.12, 0.45, 0.12, legs, 'stoff'), K.box(0.09, 0.27, 0.22, 0.12, 0.45, 0.12, legs, 'stoff'),
    K.box(0, 0.86, -0.12, 0.4, 0.6, 0.22, top, 'stoff', { rr: 0.06 }), K.cyl(0, 1.2, -0.12, 0.05, 0.1, skin, 'matt'), K.sph(0, 1.33, -0.12, 0.112, skin, 'matt'),
    K.sph(0, 1.37, -0.14, 0.115, o.hair || '#8a8a8a', 'stoff', { sc: [1, 0.75, 1] }),
    K.cap(-0.24, 0.85, -0.05, 0.045, 0.42, top, 'stoff', { rx: 40 }), K.cap(0.24, 0.85, -0.05, 0.045, 0.42, top, 'stoff', { rx: 40 })
  ];
};

/* ---------- Registrierung ---------- */
const norm = (o, source) => {
  const e = [];
  if (!o || typeof o !== 'object') throw new Error('Objekt fehlt');
  if (o.format && o.format !== 'hss-object') e.push('format muss "hss-object" sein');
  if (!o.id || !/^[\w.\-äöüß]+$/i.test(o.id)) e.push('id fehlt oder enthält ungültige Zeichen (erlaubt: Buchstaben, Ziffern, . _ -)');
  if (!o.name) e.push('name fehlt');
  if (!o.size || !(o.size.w > 0 && o.size.d > 0 && o.size.h > 0)) e.push('size {w,d,h} in Metern fehlt');
  if (!o.parts && !o.model) e.push('parts[] oder model fehlt');
  (o.parts || []).forEach((p, i) => { if (!PRIMS.includes(p.t)) e.push(`parts[${i}].t unbekannt: ${p.t} (erlaubt: ${PRIMS.join(', ')})`); if (p.m && !MATS.includes(p.m)) e.push(`parts[${i}].m unbekannt: ${p.m}`); });
  if (e.length) throw new Error(`Objekt „${o.name || o.id || '?'}“: ` + e.join('; '));
  return Object.assign({ format: 'hss-object', version: 1, category: 'Sonstiges', tags: [], anchor: 'boden', resizable: true, meta: {} }, o, { _source: source });
};
const L = HSS.library = {
  kit: K, PRIMS, MATS,
  register(o, opts = {}) {
    const d = norm(o, opts.source || 'standard');
    REG.set(d.id, d);
    for (const k of [...PROTO.keys()]) if (k.startsWith(d.id + '|')) PROTO.delete(k);
    THUMB.delete(d.id);
    if (d.model && !d._gltf) L._loadModel(d);
    if (!opts.silent) HSS.emit('library', { id: d.id });
    return d;
  },
  registerPack(pack, opts = {}) {
    if (pack.format && pack.format !== 'hss-library') throw new Error('format muss "hss-library" sein');
    const errs = [];
    for (const o of pack.objects || []) {
      try { L.register(Object.assign({ category: pack.category }, o), { source: opts.source || 'standard', silent: true }); } catch (e) { errs.push(e.message); }
    }
    if (errs.length) console.warn('[Bibliothek]', pack.name, errs);
    HSS.emit('library', { pack: pack.name });
    return errs;
  },
  get: id => REG.get(id),
  all: () => [...REG.values()],
  categories() {
    const c = new Map();
    for (const o of REG.values()) { const top = o.category.split('/')[0]; c.set(top, (c.get(top) || 0) + 1); }
    return [...c.entries()];
  },
  search(q, cat) {
    q = (q || '').toLowerCase().trim();
    return L.all().filter(o => (!cat || o.category.startsWith(cat)) && (!q || (o.name + ' ' + o.category + ' ' + (o.tags || []).join(' ') + ' ' + o.id).toLowerCase().includes(q)));
  },
  serialize(o) { const c = {}; for (const [k, v] of Object.entries(o)) if (!k.startsWith('_')) c[k] = v; return U.clone(c); },
  exportObject(id) { const o = REG.get(id); if (o) U.download(id + '.hssobj.json', JSON.stringify(L.serialize(o), null, 1)); },
  exportPack(ids, name = 'eigene-objekte') { U.download(name + '.hsslib.json', JSON.stringify({ format: 'hss-library', version: 1, name, objects: ids.map(id => L.serialize(REG.get(id))) }, null, 1)); },

  /* Hochladen: .hssobj.json, .hsslib.json, .glb/.gltf */
  async importFiles(files, ask) {
    const done = [], errs = [];
    for (const f of files) {
      try {
        if (/\.(glb|gltf)$/i.test(f.name)) {
          const info = await ask(f);   // { name, category, w, d, h }
          if (!info) continue;
          const dataUrl = await U.readFile(f, 'dataurl');
          const o = { format: 'hss-object', version: 1, id: 'eigen.' + info.name.toLowerCase().replace(/[^\wäöüß]+/g, '-') + '-' + Date.now().toString(36).slice(-4), name: info.name, category: info.category || 'Eigene Objekte', size: { w: info.w, d: info.d, h: info.h }, model: dataUrl, meta: { quelle: f.name } };
          L.register(o, { source: 'eigen' }); await HSS.storage.saveLibObject(o).catch(() => {}); done.push(o.name);
        } else {
          const j = JSON.parse(await U.readFile(f));
          const list = j.format === 'hss-library' ? j.objects : [j];
          for (const o of list) { const d = L.register(Object.assign({ category: j.category || 'Eigene Objekte' }, o), { source: 'eigen' }); await HSS.storage.saveLibObject(L.serialize(d)).catch(() => {}); done.push(d.name); }
        }
      } catch (e) { errs.push(f.name + ': ' + e.message); }
    }
    return { done, errs };
  },
  async loadUserObjects() {
    try { const list = await HSS.storage.listLibObjects(); list.forEach(o => { try { L.register(o, { source: 'eigen', silent: true }); } catch (e) { console.warn(e); } }); if (list.length) HSS.emit('library', {}); } catch (e) { /* IndexedDB fehlt */ }
  },
  async remove(id) { const o = REG.get(id); if (!o || o._source === 'standard') return false; REG.delete(id); await HSS.storage.deleteLibObject(id).catch(() => {}); HSS.emit('library', { id }); return true; },

  _loadModel(d) {
    d._gltf = new Promise(res => {
      try {
        const loader = new GLTFLoader();
        const b64 = d.model.split(',')[1]; const bin = atob(b64); const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        loader.parse(buf.buffer, '', g => {
          const root = g.scene; const box = new THREE.Box3().setFromObject(root); const sz = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
          root.position.set(-c.x, -box.min.y, -c.z);
          const wrap = new THREE.Group(); wrap.add(root);
          wrap.scale.set(d.size.w / (sz.x || 1), d.size.h / (sz.y || 1), d.size.d / (sz.z || 1));
          root.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
          d._model = wrap; res(wrap); HSS.emit('library-model', { id: d.id });
        }, err => { console.warn('GLB-Fehler', err); res(null); });
      } catch (e) { console.warn(e); res(null); }
    });
  }
};

/* ---------- Materialien ---------- */
const matCache = new Map();
L.material = (c, m = 'kunststoff', opacity) => {
  const key = c + '|' + m + '|' + (opacity ?? '');
  if (matCache.has(key)) return matCache.get(key);
  const col = new THREE.Color(c || '#cccccc');
  let mat;
  switch (m) {
    case 'metall': mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.38 }); break;
    case 'chrom': mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.95, roughness: 0.16 }); break;
    case 'glas': mat = new THREE.MeshStandardMaterial({ color: col, metalness: 0.1, roughness: 0.05, transparent: true, opacity: opacity ?? 0.35, depthWrite: false, envMap: HSS.s3?.envMap || null, envMapIntensity: HSS.s3?.night ? 0.05 : 0.9 }); break;
    case 'stoff': mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }); break;
    case 'holz': mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7 }); break;
    case 'leucht': mat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, roughness: 0.4 }); break;
    case 'bildschirm': mat = new THREE.MeshStandardMaterial({ color: '#0d1b2a', emissive: col, emissiveIntensity: 0.65, roughness: 0.2 }); break;
    case 'gummi': mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.92 }); break;
    case 'lack': mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.42, metalness: 0.05 }); break;
    case 'matt': mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.85 }); break;
    default: mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 });
  }
  mat.userData.key = key; matCache.set(key, mat); return mat;
};

L.eachMaterial = fn => matCache.forEach(fn);

/* ---------- Geometrie aus Primitiven ---------- */
const AX = { x: new THREE.Euler(0, 0, Math.PI / 2), z: new THREE.Euler(Math.PI / 2, 0, 0) };
const primGeo = p => {
  let g;
  switch (p.t) {
    case 'box': g = p.rr ? new RoundedBoxGeometry(p.s[0], p.s[1], p.s[2], 2, Math.min(p.rr, Math.min(...p.s) / 2 - 0.001)) : new THREE.BoxGeometry(p.s[0], p.s[1], p.s[2]); break;
    case 'cyl': g = new THREE.CylinderGeometry(p.rt ?? p.r, p.r, p.h, p.seg || 16); break;
    case 'sph': g = new THREE.SphereGeometry(p.r, p.seg || 16, Math.max(8, (p.seg || 16) * 0.75 | 0)); break;
    case 'cone': g = new THREE.ConeGeometry(p.r, p.h, p.seg || 16); break;
    case 'tor': g = new THREE.TorusGeometry(p.R, p.r, 8, p.seg || 24, U.rad(p.arc || 360)); break;
    case 'cap': g = new THREE.CapsuleGeometry(p.r, Math.max(0.001, p.h - 2 * p.r), 4, 10); break;
    default: g = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
  if (p.ax && AX[p.ax]) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(AX[p.ax]));
  if (p.sc) g.scale(...p.sc);
  if (p.rx || p.ry || p.rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(U.rad(p.rx || 0), U.rad(p.ry || 0), U.rad(p.rz || 0))));
  g.translate(p.p[0], p.p[1], p.p[2]);
  if (g.index) g = g.toNonIndexed();
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
};

// Zusammengeführte Prototyp-Geometrie je Material (für Instancing). Teile mit Schwingachse
// werden getrennt gehalten (Animation von Personen).
L.proto = (id) => {
  if (PROTO.has(id)) return PROTO.get(id);
  const d = REG.get(id); if (!d) return null;
  const parts = d.parts || [];
  const byMat = new Map(), swing = [];
  for (const p of parts) {
    const g = primGeo(p);
    if (p.sw) { swing.push({ g, p }); continue; }
    const key = (p.c || '#ccc') + '|' + (p.m || 'kunststoff') + '|' + (p.o ?? '');
    if (!byMat.has(key)) byMat.set(key, { mat: L.material(p.c, p.m, p.o), geos: [] });
    byMat.get(key).geos.push(g);
  }
  const out = { def: d, meshes: [...byMat.values()].map(v => ({ geo: mergeGeometries(v.geos, false), mat: v.mat })), swing };
  PROTO.set(id, out); return out;
};

// Einzelnes Objekt als THREE.Group (für bewegte Agenten, Vorschau, GLB-Modelle)
L.build = (id, size, opts = {}) => {
  const d = REG.get(id);
  const grp = new THREE.Group(); grp.userData.lib = id;
  if (!d) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), L.material('#891F5E')); m.position.y = 0.25; grp.add(m); return grp; }
  const sx = size ? size.w / d.size.w : 1, sy = size ? size.h / d.size.h : 1, sz = size ? size.d / d.size.d : 1;
  const inner = new THREE.Group(); inner.scale.set(sx, sy, sz); grp.add(inner);
  if (d.model) {
    const add = m => { if (!m) return; const c = m.clone(true); inner.add(c); };
    if (d._model) add(d._model); else d._gltf?.then(add);
    return grp;
  }
  const P = L.proto(id);
  for (const m of P.meshes) { const mesh = new THREE.Mesh(m.geo, opts.material || m.mat); mesh.castShadow = !opts.noShadow; mesh.receiveShadow = true; inner.add(mesh); }
  if (P.swing.length) {
    grp.userData.swing = [];
    for (const { g, p } of P.swing) {
      const piv = new THREE.Group(); piv.position.set(...p.piv);
      const gg = g.clone(); gg.translate(-p.piv[0], -p.piv[1], -p.piv[2]);
      const mesh = new THREE.Mesh(gg, opts.material || L.material(p.c, p.m)); mesh.castShadow = !opts.noShadow; piv.add(mesh); inner.add(piv);
      grp.userData.swing.push({ piv, dir: p.sw });
    }
  }
  return grp;
};
L.animateSwing = (grp, phase, amp = 0.5) => { for (const s of grp.userData.swing || []) s.piv.rotation.x = Math.sin(phase) * amp * s.dir; };

/* ---------- Vorschaubilder ---------- */
let thumbR = null, thumbScene, thumbCam;
L.thumb = id => {
  if (THUMB.has(id)) return THUMB.get(id);
  const d = REG.get(id); if (!d) return '';
  try {
    if (!thumbR) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 112;
      thumbR = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
      thumbR.setPixelRatio(1); thumbR.setSize(112, 112, false);
      thumbScene = new THREE.Scene();
      thumbScene.add(new THREE.HemisphereLight('#ffffff', '#8796a5', 2.2));
      const dl = new THREE.DirectionalLight('#ffffff', 1.8); dl.position.set(3, 5, 4); thumbScene.add(dl);
      thumbCam = new THREE.PerspectiveCamera(30, 1, 0.01, 200);
    }
    const g = L.build(id, null, { noShadow: true });
    thumbScene.add(g);
    const box = new THREE.Box3().setFromObject(g); const s = box.getSize(new THREE.Vector3()); const c = box.getCenter(new THREE.Vector3());
    const r = Math.max(s.x, s.y, s.z) || 1;
    thumbCam.position.set(c.x + r * 1.25, c.y + r * 0.95, c.z + r * 1.65); thumbCam.lookAt(c);
    thumbR.render(thumbScene, thumbCam);
    const url = thumbR.domElement.toDataURL('image/png');
    thumbScene.remove(g);
    if (!d.model || d._model) THUMB.set(id, url);
    return url;
  } catch (e) { return ''; }
};

/* ---------- Pakete aus library/manifest.js laden ---------- */
L.bootPacks = () => {
  const list = window.HSS_LIBRARY_PACKS || [];
  for (const pk of list) { try { L.registerPack(pk); } catch (e) { console.warn('Paket', pk.name, e); } }
};
})();
