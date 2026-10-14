/* =====================================================================
   HSS · stil.js – Darstellungsstil „Cartoon“ (Standard) oder „Realistisch“
   Cartoon: heller, ruhiger Hintergrund, flächige Toon-Schattierung in aufgehellten
   Farben, dunkle Konturen an Gebäuden, Wänden und Wegen, weiße Etiketten-Karten mit
   Name und Fläche. Umgesetzt als Nachbearbeitung der aufgebauten Szene: Materialien
   werden (zwischengespeichert) durch Toon-Materialien ersetzt, Konturen als Linien ergänzt.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS;
const { THREE } = window.THREEX;
const ST = HSS.stil = {
  mode: (() => { try { return localStorage.getItem('hss-stil2') || 'plan'; } catch (e) { return 'plan'; } })(),
  BG: '#e9ecef', BG_UG: '#d6dbe0', BG_NACHT: '#1b2636', KONTUR: '#3f4a56', BODEN: '#e3e6e9',
  PLAN_BG: '#DCE3E8', PLAN_BODEN: '#e6eaed'
};
// Stile mit Etiketten-Karten (Cartoon und Planungsmodell)
ST.karte = () => ST.mode === 'cartoon' || ST.mode === 'plan';
HSS.view.stil = ST.mode;

// Vier Helligkeitsstufen für die Toon-Schattierung
const grad = (() => { const d = new Uint8Array([168, 205, 236, 255]); const t = new THREE.DataTexture(d, 4, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t; })();
const toonCache = new Map(), edgeCache = new Map();
const lineMat = new THREE.LineBasicMaterial({ color: ST.KONTUR, transparent: true, opacity: 0.55 });
const lineMatFein = new THREE.LineBasicMaterial({ color: ST.KONTUR, transparent: true, opacity: 0.28 });
// Farben aufhellen; graue Flächen (Dächer, Beton) fast weiß wie in einer Modellzeichnung
const pastell = c => { const h = {}; c.getHSL(h); const grau = h.s < 0.12; return new THREE.Color().setHSL(h.h, Math.min(1, h.s * 0.85), Math.min(0.95, grau ? h.l * 0.55 + 0.42 : h.l * 0.82 + 0.16)); };

function toon(m) {
  if (!m || !m.isMeshStandardMaterial || m.userData.noToon) return m;
  let t = toonCache.get(m.uuid); if (t) return t;
  if (m.userData.vc) { // Bibliotheksobjekte mit Vertex-Farben
    t = new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, gradientMap: grad });
  } else if (m.vertexColors) { // Gelände: ruhige, helle Fläche
    t = new THREE.MeshToonMaterial({ color: ST.BODEN, gradientMap: grad, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
  } else {
    const glas = m.transparent && m.opacity < 0.6;
    t = new THREE.MeshToonMaterial({
      color: glas ? new THREE.Color('#bcd7e8') : pastell(m.color),
      gradientMap: grad, transparent: m.transparent, opacity: glas ? Math.max(0.28, m.opacity) : m.opacity, depthWrite: m.depthWrite, side: m.side,
      emissive: m.emissive, emissiveIntensity: m.emissiveIntensity * 0.6, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits
    });
  }
  t.userData.toon = true; toonCache.set(m.uuid, t); return t;
}
// Raumböden als kräftigere Funktionszonen (wie farbige Bereiche in einem Lageplan)
function zone(m) {
  let t = toonCache.get('z' + m.uuid); if (t) return t;
  const h = {}; m.color.getHSL(h);
  t = new THREE.MeshToonMaterial({ color: new THREE.Color().setHSL(h.h, Math.min(0.62, h.s * 1.9 + 0.12), Math.min(0.86, Math.max(0.7, h.l * 0.9))), gradientMap: grad });
  t.userData.toon = true; toonCache.set('z' + m.uuid, t); return t;
}
/* ---------- Planungsmodell: klare, matte Farben wie in einem Präsentationsmodell ---------- */
const planCache = new Map();
const planFarbe = c => { const h = {}; c.getHSL(h); const grau = h.s < 0.12; return new THREE.Color().setHSL(h.h, grau ? h.s * 0.6 : Math.min(1, h.s * 1.05), grau ? Math.min(0.97, h.l * 0.45 + 0.52) : U_clamp(h.l, 0.3, 0.72)); };
const U_clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function planMat(m) {
  if (!m || !m.isMeshStandardMaterial || m.userData.noToon || m.userData.plan) return m;
  let t = planCache.get(m.uuid); if (t) return t;
  if (m.userData.vc) t = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.75, metalness: 0.05 });
  else if (m.vertexColors) t = new THREE.MeshStandardMaterial({ color: ST.PLAN_BODEN, roughness: 0.95, metalness: 0, transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite });
  else {
    const glas = m.transparent && m.opacity < 0.6;
    t = new THREE.MeshStandardMaterial({ color: glas ? new THREE.Color('#c7dbe7') : planFarbe(m.color), roughness: glas ? 0.3 : 0.75, metalness: 0.05, transparent: m.transparent, opacity: glas ? Math.max(0.3, m.opacity) : m.opacity, depthWrite: m.depthWrite, side: m.side,
      emissive: m.emissive, emissiveIntensity: m.emissiveIntensity, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits, vertexColors: false });
  }
  t.userData.plan = true; planCache.set(m.uuid, t); return t;
}
function planZone(m) {
  let t = planCache.get('z' + m.uuid); if (t) return t;
  const h = {}; m.color.getHSL(h);
  t = new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(h.h, Math.min(0.7, h.s * 2 + 0.15), U_clamp(h.l * 0.85, 0.62, 0.8)), roughness: 0.9, metalness: 0 });
  t.userData.plan = true; planCache.set('z' + m.uuid, t); return t;
}
ST.planMat = planMat;
const linePlan = new THREE.LineBasicMaterial({ color: '#7f8b97', transparent: true, opacity: 0.32 });
/* Etiketten entzerren: überlappende Raumetiketten ausblenden, große Räume haben Vorrang */
ST.entzerren = () => {
  const els = [...document.querySelectorAll('.labels .rlbl')]; if (!els.length) return;
  const items = els.map(el => ({ el, a: +(el.dataset.a || 0), r: (el.style.visibility = 'visible', el.getBoundingClientRect()) })).filter(x => x.r.width).sort((x, y) => y.a - x.a);
  const shown = [];
  for (const it of items) {
    const r = it.r, hit = shown.some(s => r.left < s.right + 2 && r.right > s.left - 2 && r.top < s.bottom + 1 && r.bottom > s.top - 1);
    if (hit) it.el.style.visibility = 'hidden'; else shown.push(r);
  }
};
setInterval(() => { if (HSS.view.labels && HSS.view.floor !== null) ST.entzerren(); }, 400);
function kontur(mesh, fein) {
  if (mesh.userData._kontur || mesh.isInstancedMesh || !mesh.geometry) return;
  const g = mesh.geometry, n = g.attributes.position?.count || 0; if (!n || n > 60000) return;
  let e = edgeCache.get(g.uuid); if (!e) { e = new THREE.EdgesGeometry(g, 28); edgeCache.set(g.uuid, e); }
  const ls = new THREE.LineSegments(e, ST.mode === 'plan' ? linePlan : fein ? lineMatFein : lineMat); ls.userData.kontur = true; ls.raycast = () => {};
  mesh.add(ls); mesh.userData._kontur = true;
}
// Szene in den Cartoon-Stil überführen (idempotent)
ST.apply = () => {
  const S3 = HSS.s3; if (!S3.scene) return;
  if (ST.mode === 'plan') {
    const L = S3.layers;
    S3.scene.traverse(o => {
      if (!o.isMesh || o.userData.kontur) return;
      if (o.userData.kind === 'room' && o.material?.isMeshStandardMaterial && !o.material.userData.plan) { o.material = planZone(o.material); return; }
      if (Array.isArray(o.material)) o.material = o.material.map(planMat); else o.material = planMat(o.material);
    });
    L.build?.traverse(o => { if (o.isMesh && !o.userData.pick && (o.userData.roof || o.userData.wall || o.userData.parapet) && !(o.material && o.material.visible === false)) kontur(o, false); });
    ST.himmel(); return;
  }
  if (ST.mode !== 'cartoon') return;
  const L = S3.layers;
  S3.scene.traverse(o => {
    if (!o.isMesh || o.userData.kontur) return;
    if (o.userData.kind === 'room' && o.material?.isMeshStandardMaterial) { o.material = zone(o.material); return; }
    if (Array.isArray(o.material)) o.material = o.material.map(toon); else o.material = toon(o.material);
  });
  // Konturen: Gebäudehüllen, Brücken, Innenwände, Wege
  // Konturen nur an Dach, Geschosswänden der Hülle, Brücken, Innenwänden und Wegen (nicht an jedem Fenster)
  const wahl = { build: o => o.userData.roof || o.userData.wall || o.parent?.userData?.kind === 'bridge', interior: o => o.userData.kind === 'walls', paths: () => true };
  for (const [k, fein] of [['build', false], ['interior', false], ['paths', true]]) L[k]?.traverse(o => { if (o.isMesh && !o.userData.pick && wahl[k](o) && !(o.material && o.material.visible === false)) kontur(o, fein); });
  ST.himmel();
};
// Einzelne Gruppe (z. B. Vorschau beim Ziehen) in den Cartoon-Stil überführen
ST.applyTo = (root, layer = 'build') => {
  if (!root) return root;
  if (ST.mode === 'plan') { root.traverse(o => { if (!o.isMesh || o.userData.kontur) return; if (o.userData.kind === 'room' && o.material?.isMeshStandardMaterial) { o.material = planZone(o.material); return; } if (Array.isArray(o.material)) o.material = o.material.map(planMat); else o.material = planMat(o.material); }); return root; }
  if (ST.mode !== 'cartoon') return root;
  root.traverse(o => {
    if (!o.isMesh || o.userData.kontur) return;
    if (o.userData.kind === 'room' && o.material?.isMeshStandardMaterial) { o.material = zone(o.material); return; }
    if (Array.isArray(o.material)) o.material = o.material.map(toon); else o.material = toon(o.material);
  });
  root.traverse(o => { if (o.isMesh && !o.userData.pick && (layer === 'paths' || o.userData.roof || o.userData.wall || o.userData.kind === 'walls' || o.parent?.userData?.kind === 'bridge') && !(o.material && o.material.visible === false)) kontur(o, layer === 'paths'); });
  return root;
};
ST.himmel = () => {
  const S3 = HSS.s3; if (!S3.scene) return;
  const R = S3.renderer;
  if (!S3.fill) { S3.fill = new THREE.DirectionalLight('#dfe8ff', 0); S3.fill.position.set(140, 120, 160); S3.scene.add(S3.fill); }
  if (ST.mode === 'plan') {
    const ug = HSS.view.floor !== null && HSS.view.floor < 0;
    S3.sky.visible = false;
    S3.scene.background = new THREE.Color(S3.night ? ST.BG_NACHT : ug ? ST.BG_UG : ST.PLAN_BG);
    S3.scene.fog = S3.night || ug ? null : (S3._planFog || (S3._planFog = new THREE.Fog(ST.PLAN_BG, 900, 3200)));
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.0;
    if (R.shadowMap.enabled) { R.shadowMap.enabled = false; S3.sun.castShadow = false; HSS.library.eachMaterial?.(m => { m.needsUpdate = true; }); }
    if (!S3.night) { S3.hemi.intensity = 1.6; S3.hemi.color.set('#ffffff'); S3.hemi.groundColor?.set('#cfd6dc'); S3.sun.intensity = 1.4; S3.sun.color.set('#ffffff'); S3.sun.position.set(-170, 310, -110); S3.fill.intensity = 0.5; }
    else S3.fill.intensity = 0;
    return;
  }
  S3.scene.fog = null; S3.fill.intensity = 0;
  if (!R.shadowMap.enabled && !HSS.plan2d?.on) { R.shadowMap.enabled = true; S3.sun.castShadow = true; HSS.perf?.shadows?.(); }
  if (ST.mode !== 'cartoon') return;
  const ug = HSS.view.floor !== null && HSS.view.floor < 0;
  S3.sky.visible = false;
  S3.scene.background = new THREE.Color(S3.night ? ST.BG_NACHT : ug ? ST.BG_UG : ST.BG);
  S3.renderer.toneMapping = THREE.NoToneMapping; S3.renderer.toneMappingExposure = 1;
  if (!S3.night) { S3.hemi.intensity = 1.55; S3.hemi.color.set('#ffffff'); S3.hemi.groundColor?.set('#b9c2cc'); S3.sun.intensity = Math.min(S3.sun.intensity, 1.6); S3.sun.color.set('#ffffff'); }
};
ST.set = (mode) => {
  ST.mode = HSS.view.stil = mode; try { localStorage.setItem('hss-stil2', mode); } catch (e) { /* */ }
  document.body.classList.toggle('cartoon', ST.karte()); document.body.classList.toggle('plan', mode === 'plan');
  const S3 = HSS.s3;
  if (S3._outCache) S3._outCache.clear();
  S3._buildCache?.clear(); S3._objCache?.clear();
  HSS.library.clearProto();
  if (mode === 'real') { S3.renderer.toneMapping = THREE.ACESFilmicToneMapping; S3.renderer.toneMappingExposure = 0.9; }
  S3.setSun(HSS.view.sunHour); S3.rebuild('all');
};
HSS.on('rebuilt', () => ST.apply());
// Dynamische Objekte (Verkehr, Simulation) regelmäßig nachziehen
setInterval(() => { const S3 = HSS.s3; if (!ST.karte() || !S3.scene) return; const f = ST.mode === 'plan' ? planMat : toon; for (const k of ['traffic', 'agents', 'net', 'sel', 'ghost', 'flows']) S3.layers[k]?.traverse(o => { if (o.isMesh && o.material?.isMeshStandardMaterial && !o.material.userData.plan && !o.material.userData.noToon) o.material = f(o.material); }); }, 700);
// Tageszeit: Cartoon-Hintergrund und Licht nach dem Setzen der Sonne wiederherstellen
const setSun0 = HSS.s3.setSun; HSS.s3.setSun = h => { setSun0(h); ST.himmel(); };
const klassen = () => { document.body.classList.toggle('cartoon', ST.karte()); document.body.classList.toggle('plan', ST.mode === 'plan'); };
document.addEventListener('DOMContentLoaded', klassen);
if (document.body) klassen();
})();
