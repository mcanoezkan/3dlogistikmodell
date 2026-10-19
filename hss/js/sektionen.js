/* =====================================================================
   HSS · sektionen.js – Flüsse in Sektionen (Warenströme) gliedern
   Jeder Fluss gehört zu einer Sektion: Speisen, Wäsche, Sterilgut,
   Arzneimittel, Verbrauchsgüter, Betten, Abfall, Patiententransport,
   Post & Proben, Personen – oder zu einer eigenen Sektion des Projekts
   (prj.stroeme). Zuordnung: f.strom, sonst Namensanfang „Speisen: …“,
   sonst Materialgruppe. Sektionen lassen sich im 3D-Bild ein- und
   ausblenden, aktiv schalten und mitsamt ihren Flüssen löschen.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const SK = HSS.sektionen = {};
SK.STANDARD = [
  ['speisen', 'Speisen', '#e07b39'], ['waesche', 'Wäsche', '#3b82c4'], ['sterilgut', 'Sterilgut', '#7b5cc4'], ['arznei', 'Arzneimittel', '#1f9d7a'],
  ['lager', 'Verbrauchsgüter', '#a07a3c'], ['betten', 'Betten', '#d1a21f'], ['abfall', 'Abfall', '#6b6f76'], ['patient', 'Patiententransport', '#d94452'],
  ['post', 'Post & Proben', '#16a3b8'], ['personen', 'Personen', '#7b5ea7']
];
const MAT2SEK = { m_speisen: 'speisen', m_geschirr: 'speisen', m_waesche_r: 'waesche', m_waesche_u: 'waesche', m_steril: 'sterilgut', m_instr_u: 'sterilgut', m_arznei: 'arznei', m_modul: 'lager', m_ware: 'lager',
  m_betten: 'betten', m_betten_r: 'betten', m_abfall: 'abfall', m_entsorgung: 'abfall', m_patient: 'patient', m_proben: 'post', m_post: 'post', m_personal: 'personen', m_besucher: 'personen' };
// alle Sektionen: eigene/übernommene (prj.stroeme) zuerst, dann die Standard-Warenströme
SK.list = (prj = HSS.project()) => {
  const list = (prj.stroeme || []).map(s => ({ id: s.id, name: s.name, farbe: s.farbe || SK.STANDARD.find(x => x[0] === s.id || x[1] === s.name)?.[2] || '#2D7694', tour: s.tour || [], eigen: !!s.eigen }));
  for (const [id, name, farbe] of SK.STANDARD) if (!list.some(x => x.id === id || x.name === name)) list.push({ id, name, farbe, tour: [] });
  return list;
};
SK.of = (f, prj = HSS.project(), list = SK.list(prj)) => {
  if (f.strom) { const s = list.find(x => x.id === f.strom); if (s) return s; }
  const pre = /^([^:]+):/.exec(f.name || '')?.[1]?.trim(); if (pre) { const s = list.find(x => x.name === pre); if (s) return s; }
  const k = MAT2SEK[f.material]; if (k) { const s = list.find(x => x.id === k) || list.find(x => x.name === SK.STANDARD.find(y => y[0] === k)?.[1]); if (s) return s; }
  let s = list.find(x => x.id === 'mat:' + f.material);
  if (!s) { const m = U.byId(prj.materials, f.material); s = { id: 'mat:' + f.material, name: m?.name || 'Sonstige', farbe: m?.farbe || '#2D7694', tour: [] }; list.push(s); }
  return s;
};
// Sektionen mit ihren Flüssen (nur belegte und eigene)
SK.gruppen = (prj = HSS.project()) => {
  const list = SK.list(prj), by = new Map();
  for (const f of prj.flows) { const s = SK.of(f, prj, list); if (!by.has(s.id)) by.set(s.id, { s, flows: [] }); by.get(s.id).flows.push(f); }
  for (const s of list) if (s.eigen && !by.has(s.id)) by.set(s.id, { s, flows: [] });
  return list.map(s => by.get(s.id)).filter(Boolean);
};
// neue eigene Sektion (im Änderungs-Callback aufrufen)
SK.neu = (p, name, farbe) => {
  p.stroeme = p.stroeme || [];
  const id = 'sek_' + U.uid('s').slice(-6);
  p.stroeme.push({ id, name, farbe: farbe || '#2D7694', tour: [], eigen: true });
  return id;
};

/* ---------- Sichtbarkeit im 3D-Bild ----------
   Mit Flussbild (Planungsmodell) steuern die Sektionen dessen Bänder; sonst
   werden die Routen der eingeblendeten Sektionen als Linien gezeichnet. */
SK.sichtbar = new Set();
const FB = () => HSS.flussbild && HSS.flussbild.aus ? HSS.flussbild : null;
SK.istSichtbar = id => FB() ? (FB().on && !FB().aus.has(id) && (id !== 'personen' || FB().personen)) : SK.sichtbar.has(id);
SK.setSichtbar = (id, on) => {
  const fb = FB();
  if (fb) { if (on) { fb.aus.delete(id); if (id === 'personen') fb.personen = true; if (!fb.on) fb.set(true); else fb.build(); } else { fb.aus.add(id); fb.build(); } return; }
  if (on) SK.sichtbar.add(id); else SK.sichtbar.delete(id);
  SK.zeichnen();
};
let layer = null;
SK.zeichnen = () => {
  const { THREE } = window.THREEX, S3 = HSS.s3;
  if (!layer) { layer = new THREE.Group(); layer.name = 'sektionen'; S3.scene.add(layer); }
  while (layer.children.length) { const c = layer.children[0]; layer.remove(c); c.geometry?.dispose(); }
  if (!SK.sichtbar.size) { HSS.perf?.invalidate(2); return; }
  const prj = HSS.project(), list = SK.list(prj), by = new Map();
  for (const f of prj.flows) {
    if (f.aktiv === false) continue;
    const s = SK.of(f, prj, list); if (!SK.sichtbar.has(s.id)) continue;
    const m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport);
    const r = HSS.route(f.von, f.nach, t?.mittel || 'hand', m?.reinheit || 'neutral'); if (!r.ok) continue;
    const pts = HSS.cleanPts(r.pts), arr = by.get(s.id) || []; by.set(s.id, arr);
    for (let i = 0; i < pts.length - 1; i++) arr.push(pts[i][0], pts[i][1] + 0.7, pts[i][2], pts[i + 1][0], pts[i + 1][1] + 0.7, pts[i + 1][2]);
  }
  for (const [id, arr] of by) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: list.find(x => x.id === id)?.farbe || '#2D7694', depthTest: false, transparent: true, opacity: 0.95 }));
    l.renderOrder = 28; layer.add(l);
  }
  HSS.perf?.invalidate(2);
};
HSS.on('changed', U.debounce(() => { if (SK.sichtbar.size) SK.zeichnen(); }, 300));
HSS.on('loaded', () => { SK.sichtbar.clear(); SK.zeichnen(); });
})();
