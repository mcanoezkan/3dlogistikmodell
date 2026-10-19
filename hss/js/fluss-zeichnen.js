/* =====================================================================
   HSS · fluss-zeichnen.js – Fluss im 3D-Bild zeichnen
   · Klick setzt Punkte; jeder Abschnitt ist gerade und rastet in der
     Gebäudeachse rechtwinklig ein (Alt: freie Richtung, 45°-Raster).
   · Jeder neue Abschnitt dockt am letzten Endpunkt an; der erste Punkt
     dockt an Räume/Orte und an Endpunkte bereits gezeichneter Flüsse an.
   · „↕ Vertikal“ (Taste V): an dieser Stelle senkrecht zu einer anderen
     Etage – über einen vorhandenen Aufzug/ein Treppenhaus in der Nähe
     oder als neue Verbindung (Aufzug oder Treppe) genau hier.
   · Enter / Doppelklick / „✓ Fertig“: Endpunkt dockt an Raum/Ort an (sonst
     Übergabepunkt), danach Menge, Zeitfenster und Transportmittel.
   · Rücktaste: letzten Punkt zurück · Esc: abbrechen.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const FZ = HSS.flussZeichnen = { letzterEnde: null, winkel: 90 };
try { FZ.winkel = +(localStorage.getItem('hss-fz-winkel') || 90); } catch (e) { /* ohne Speicher */ }
const S3 = () => HSS.s3, V = () => HSS.view, UI = () => HSS.ui;
const r1 = v => Math.round(v * 10) / 10;

// Etagen-Höhe an einer Stelle (Bauteil unter dem Punkt, sonst Gelände/Schätzung)
const partAt = (x, z, gf) => { const prj = HSS.project(); for (const b of prj.buildings) { if (b.umgebung) continue; for (const pt of b.parts) { const f = HSS.localFloor(pt, gf, prj); if (f === null) continue; const fp = HSS.partFootprintLocal(pt), l = HSS.toLocal(pt, [x, z]); if (G.pointIn(l, fp.outer) && !fp.holes.some(h => G.pointIn(l, h))) return { pt, f }; } } return null; };
const yAt = (x, z, gf) => { const P = partAt(x, z, gf); if (P) return HSS.floorY(P.pt, P.f); return gf === 0 ? HSS.terrainH(x, z) : gf * 3.8; };
const axes = (x, z) => { const P = partAt(x, z, V().floor ?? 0); const r = P ? (P.pt.rot || 0) * Math.PI / 180 : 0; return [G.rot([1, 0], r), G.rot([0, 1], r)]; };

FZ.start = (opt = {}) => {
  const prj = HSS.project();
  if (!prj.buildings.some(b => !b.umgebung)) return UI().toast('Zuerst Gebäude anlegen.');
  if (V().floor === null || V().floor === undefined) { S3().setFloor(0); UI().toast('Etage EG gewählt – andere Etage über die Etagenleiste links', 3000); }
  const st = { pts: [], von: null, cur: null, flow: opt.flow || null };
  FZ.st = st;
  bar(true);
  S3().select(null);
  S3().setTool({
    name: 'flusszeichnen',
    move(ev) { st.cur = snap(ev, st, ev.altKey); preview(st); },
    click(ev) {
      const c = snap(ev, st, ev.altKey); if (!c) return;
      if (!st.pts.length && c.place) st.von = c.place;
      st.pts.push({ x: r1(c.x), y: c.y, z: r1(c.z), gf: c.gf });
      if (!st.pts.length) return; preview(st); info(st);
    },
    dbl() { FZ.fertig(); },
    key(ev) {
      if (ev.key === 'Enter') { FZ.fertig(); return true; }
      if (ev.key === 'Backspace') { ev.preventDefault(); FZ.zurueck(); return true; }
      if (ev.key.toLowerCase() === 'v') { FZ.vertikal(); return true; }
      if (ev.key.toLowerCase() === 'w') { FZ.setWinkel(FZ.winkel === 90 ? 45 : FZ.winkel === 45 ? 0 : 90); return true; }
      return false;
    },
    cancel() { bar(false); ghost(); UI().hint(null); FZ.st = null; }
  });
  info(st);
};

/* ---------- Einrasten ---------- */
function magnets(gf) {
  const out = [];
  for (const p of HSS.places()) if ((p.gf ?? 0) === gf) out.push({ x: p.x, z: p.z, y: p.y, place: p.id, name: p.name, r: p.kind === 'room' ? 2.5 : 3 });
  for (const f of HSS.project().flows) if (f.pfad?.length) for (const q of [f.pfad[0], f.pfad[f.pfad.length - 1]]) if (q.gf === gf) out.push({ x: q.x, z: q.z, y: q.y, name: 'Endpunkt „' + f.name + '“', r: 2.5, ende: true });
  if (FZ.letzterEnde && FZ.letzterEnde.gf === gf) out.push(Object.assign({ name: 'letzter Endpunkt', r: 4, ende: true }, FZ.letzterEnde));
  return out;
}
function snap(ev, st, frei) {
  const gp = S3().groundPoint(ev); if (!gp) return null;
  const gf = V().floor ?? 0;
  let x = gp.x, z = gp.z, hit = null;
  const last = st.pts[st.pts.length - 1];
  if (last) {
    const [eu, ev2] = axes(last.x, last.z), dx = x - last.x, dz = z - last.z;
    let du = dx * eu[0] + dz * eu[1], dv = dx * ev2[0] + dz * ev2[1];
    const w = frei ? 0 : FZ.winkel;
    if (w === 90) { if (Math.abs(du) >= Math.abs(dv)) dv = 0; else du = 0; du = Math.round(du * 2) / 2; dv = Math.round(dv * 2) / 2; }
    else if (w === 45) { const a = Math.round(Math.atan2(dv, du) / (Math.PI / 4)) * (Math.PI / 4), L = Math.round(Math.hypot(du, dv) * 2) / 2; du = Math.cos(a) * L; dv = Math.sin(a) * L; }
    x = last.x + du * eu[0] + dv * ev2[0]; z = last.z + du * eu[1] + dv * ev2[1];
    // Andocken an Orte/Endpunkte entlang der gewählten Richtung
    for (const m of magnets(gf)) { const d = Math.hypot(m.x - x, m.z - z); if (d < m.r && (!hit || d < hit.d)) hit = Object.assign({ d }, m); }
    if (hit) { const mx = hit.x - last.x, mz = hit.z - last.z, mu = mx * eu[0] + mz * eu[1], mv = mx * ev2[0] + mz * ev2[1]; if (FZ.winkel !== 90 || frei || Math.abs(mu) < 0.6 || Math.abs(mv) < 0.6) { x = hit.x; z = hit.z; } else hit = null; }
  } else {
    for (const m of magnets(gf)) { const d = Math.hypot(m.x - x, m.z - z); if (d < m.r * 1.6 && (!hit || d < hit.d)) hit = Object.assign({ d }, m); }
    if (hit) { x = hit.x; z = hit.z; }
  }
  return { x, z, y: yAt(x, z, gf), gf, place: hit?.place || null, name: hit?.name || null, ende: !!hit?.ende };
}

/* ---------- Vorschau ---------- */
let gGroup = null;
function ghost() { const L = S3().layers.ghost; while (L.children.length) L.remove(L.children[0]); gGroup = null; HSS.perf?.invalidate(2); }
function preview(st) {
  const { THREE } = window.THREEX; ghost();
  const L = S3().layers.ghost, ex = V().explode || 0, Y = q => q.y + 0.7 + q.gf * ex;
  const pts = st.pts.map(q => new THREE.Vector3(q.x, Y(q), q.z));
  if (st.cur && st.pts.length) pts.push(new THREE.Vector3(st.cur.x, Y(st.cur), st.cur.z));
  const mat = new THREE.MeshBasicMaterial({ color: '#0A967A', depthTest: false });
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], len = a.distanceTo(b); if (len < 0.05) continue;
    const g = new THREE.CylinderGeometry(0.22, 0.22, len, 8, 1, true); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    const m = new THREE.Mesh(g, i === pts.length - 2 && st.cur ? new THREE.MeshBasicMaterial({ color: '#2D7694', depthTest: false, transparent: true, opacity: 0.7 }) : mat); m.renderOrder = 40; L.add(m);
  }
  for (const [i, p] of pts.entries()) { const s = new THREE.Mesh(new THREE.SphereGeometry(i === 0 ? 0.7 : 0.45, 14, 10), new THREE.MeshBasicMaterial({ color: i === 0 ? '#0A967A' : '#144477', depthTest: false })); s.position.copy(p); s.renderOrder = 41; L.add(s); }
  if (st.cur) { const c = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 24), new THREE.MeshBasicMaterial({ color: st.cur.name ? '#f2994a' : '#2D7694', depthTest: false, side: THREE.DoubleSide })); c.rotation.x = -Math.PI / 2; c.position.set(st.cur.x, Y(st.cur) - 0.6, st.cur.z); c.renderOrder = 42; L.add(c); }
  HSS.perf?.invalidate(2);
  const last = st.pts[st.pts.length - 1];
  if (st.cur) UI().hint(st.cur.name ? `Andocken: <b>${U.esc(st.cur.name)}</b>` : last ? `Abschnitt ${U.fmt(Math.hypot(st.cur.x - last.x, st.cur.z - last.z), 1)} m · ${HSS.floorName(st.cur.gf)} · ${FZ.winkel === 90 ? 'rechtwinklig' : FZ.winkel === 45 ? '45°-Raster' : 'freie Richtung'} (Taste W wechselt, Alt: frei)` : `Startpunkt setzen (dockt an Räume, Orte und Endpunkte an) · ${HSS.floorName(st.cur.gf)}`);
}
function info(st) {
  const el = document.getElementById('fzBar'); if (!el) return;
  const n = st.pts.length, len = U.sum(st.pts.slice(1).map((q, i) => Math.hypot(q.x - st.pts[i].x, q.z - st.pts[i].z)));
  el.querySelector('.fzi').innerHTML = n ? `${n} Punkte · ${U.fmt(len)} m${st.von ? ' · Start angedockt' : ''}` : 'Ersten Punkt setzen';
  el.querySelector('[data-z]').disabled = !n; el.querySelector('[data-v]').disabled = !n; el.querySelector('[data-ok]').disabled = n < 2;
}

/* ---------- Werkzeugleiste ---------- */
function bar(on) {
  let el = document.getElementById('fzBar');
  if (!on) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'fzBar';
    el.innerHTML = `<b>✎ Fluss zeichnen</b><span class="fzi"></span><button data-ld title="Am Endpunkt des zuletzt gezeichneten Flusses ansetzen">↳ am letzten Endpunkt</button><span class="seg fzw">${[[90, '90°'], [45, '45°'], [0, 'frei']].map(([w, t]) => `<button data-w="${w}" title="${w === 90 ? 'nur rechtwinklig' : w === 45 ? 'auch schräg im 45°-Raster' : 'beliebige schräge Linien'}">${t}</button>`).join('')}</span><button data-v title="An dieser Stelle senkrecht zu einer anderen Etage (Taste V)">↕ Vertikal …</button><button data-z title="Letzten Punkt entfernen (Rücktaste)">↶</button><button class="primary" data-ok title="Fertig (Enter oder Doppelklick)">✓ Fertig</button><button data-x title="Abbrechen (Esc)">✕</button>
      <div class="fzh">Klick = Punkt · Winkel 90° / 45° / frei (Taste W) · Etage über die Etagenleiste wechseln oder ↕ Vertikal</div>`;
    document.body.appendChild(el);
    el.querySelector('[data-v]').onclick = () => FZ.vertikal();
    el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => FZ.setWinkel(+b.dataset.w));
    el.querySelector('[data-z]').onclick = () => FZ.zurueck();
    el.querySelector('[data-ok]').onclick = () => FZ.fertig();
    el.querySelector('[data-x]').onclick = () => S3().setTool(null);
    el.querySelector('[data-ld]').onclick = () => {
      const e = FZ.letzterEnde, st = FZ.st; if (!e || !st) return UI().toast('Noch kein Fluss gezeichnet');
      if (V().floor !== e.gf) S3().setFloor(e.gf);
      st.pts = [{ x: e.x, y: e.y, z: e.z, gf: e.gf }]; st.von = e.place || null; preview(st); info(st);
    };
  }
  el.hidden = false; el.querySelector('[data-ld]').hidden = !FZ.letzterEnde;
  el.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === FZ.winkel));
}
FZ.setWinkel = w => { FZ.winkel = w; try { localStorage.setItem('hss-fz-winkel', w); } catch (e) { /* ohne Speicher */ } document.querySelectorAll('#fzBar [data-w]').forEach(b => b.classList.toggle('on', +b.dataset.w === w)); HSS.ui.toast(w === 90 ? 'Rechtwinklig zeichnen' : w === 45 ? 'Schräg im 45°-Raster zeichnen' : 'Freie schräge Linien', 1500); };
FZ.zurueck = () => { const st = FZ.st; if (!st || !st.pts.length) return; st.pts.pop(); if (!st.pts.length) st.von = null; const l = st.pts[st.pts.length - 1]; if (l && l.gf !== V().floor) S3().setFloor(l.gf); preview(st); info(st); };

/* ---------- Vertikal ---------- */
FZ.vertikal = () => {
  const st = FZ.st; if (!st || !st.pts.length) return UI().toast('Erst einen Punkt setzen');
  const last = st.pts[st.pts.length - 1], prj = HSS.project();
  const floors = [...new Set(HSS.allParts(prj).filter(pt => !prj.buildings.find(b => b.parts.includes(pt))?.umgebung).flatMap(pt => HSS.partFloors(pt).map(f => HSS.globalFloor(pt, f, prj))))].sort((a, b) => a - b).filter(g => g !== last.gf);
  const near = HSS.net().lifts.filter(L => !String(L.id).startsWith('pv:') && L.stops.includes(last.gf)).map(L => ({ L, d: Math.hypot(L.x - last.x, L.z - last.z) })).filter(x => x.d < 40).sort((a, b) => a.d - b.d).slice(0, 8);
  const $ = UI().$;
  UI().dialog(`<div class="dh"><h2>↕ Vertikal zu einer anderen Etage</h2><button class="x" data-close>×</button></div>
    <p class="note">Von ${HSS.floorName(last.gf)} an der aktuellen Stelle senkrecht hoch oder runter. Mit einem vorhandenen Aufzug/Treppenhaus wird der Weg bis dorthin gerade ergänzt.</p>
    <div class="fg"><label class="f full"><span>Ziel-Etage</span><select id="fvG">${floors.map(g => `<option value="${g}" ${g === last.gf + 1 ? 'selected' : ''}>${HSS.floorName(g)}</option>`).join('')}</select></label>
    <label class="f full"><span>Verbindung</span><select id="fvL">${near.map(x => `<option value="${x.L.id}">${x.L.role === 'treppe' ? 'Treppenhaus' : 'Aufzug'} · ${U.esc(x.L.name)} – ${U.fmt(x.d)} m entfernt (hält ${x.L.stops.map(HSS.floorName).join(', ')})</option>`).join('')}<option value="neu:aufzug" ${near.length ? '' : 'selected'}>Neue Verbindung genau hier: Aufzug</option><option value="neu:treppe">Neue Verbindung genau hier: Treppenhaus</option></select></label></div>
    <div id="fvW"></div><div class="actions"><button class="primary" id="fvOk">Vertikal anlegen</button><button data-close>Abbrechen</button></div>`, d => {
    const chk = () => { const g = +$('#fvG', d).value, v = $('#fvL', d).value, L = near.find(x => x.L.id === v)?.L; $('#fvW', d).innerHTML = L && !L.stops.includes(g) ? `<div class="warnbox">${U.esc(L.name)} hält nicht in ${HSS.floorName(g)} – andere Verbindung oder neue Verbindung wählen.</div>` : ''; $('#fvOk', d).disabled = !!(L && !L.stops.includes(g)); };
    $('#fvG', d).onchange = chk; $('#fvL', d).onchange = chk; chk();
    $('#fvOk', d).onclick = () => {
      const g = +$('#fvG', d).value, v = $('#fvL', d).value; d.close();
      let x = last.x, z = last.z, vert;
      if (v.startsWith('neu:')) vert = { typ: v.slice(4) };
      else {
        const L = near.find(q => q.L.id === v).L; vert = { lift: L.id, typ: L.role };
        // gerade bis zum Aufzug (rechtwinklig in der Gebäudeachse)
        const [eu, ev] = axes(last.x, last.z), dx = L.x - last.x, dz = L.z - last.z, du = dx * eu[0] + dz * eu[1], dv = dx * ev[0] + dz * ev[1];
        if (Math.abs(du) > 0.3 && Math.abs(dv) > 0.3) { const cx = last.x + du * eu[0], cz = last.z + du * eu[1]; st.pts.push({ x: r1(cx), y: yAt(cx, cz, last.gf), z: r1(cz), gf: last.gf }); }
        x = L.x; z = L.z;
        if (Math.hypot(x - last.x, z - last.z) > 0.3) st.pts.push({ x: r1(x), y: yAt(x, z, last.gf), z: r1(z), gf: last.gf });
      }
      st.pts[st.pts.length - 1].vertikal = vert;
      st.pts.push({ x: r1(x), y: yAt(x, z, g), z: r1(z), gf: g, vertikal: vert });
      S3().setFloor(g); preview(st); info(st);
      UI().toast(`Vertikal nach ${HSS.floorName(g)} (${vert.typ === 'treppe' ? 'Treppenhaus' : 'Aufzug'}) – auf ${HSS.floorName(g)} weiterzeichnen`, 3500);
    };
  });
};

/* ---------- Fertig ---------- */
FZ.fertig = () => {
  const st = FZ.st; if (!st || st.pts.length < 2) return UI().toast('Mindestens zwei Punkte setzen');
  const prj = HSS.project(), end = st.pts[st.pts.length - 1];
  const hitEnd = magnets(end.gf).filter(m => m.place).map(m => Object.assign({ d: Math.hypot(m.x - end.x, m.z - end.z) }, m)).filter(m => m.d < m.r + 0.5).sort((a, b) => a.d - b.d)[0];
  const pfad = st.pts.map(q => { const o = { x: q.x, y: q.y, z: q.z, gf: q.gf }; if (q.vertikal) o.vertikal = q.vertikal; return o; });
  S3().setTool(null);
  const redraw = st.flow && U.byId(prj.flows, st.flow);
  let von = st.von, nach = hitEnd?.place || null;
  // Start/Ziel ohne Raum: Übergabepunkt an der gezeichneten Stelle
  if (!von || !nach) HSS.change('Übergabepunkte für gezeichneten Fluss', p => { if (!von) von = punkt(p, st.pts[0]); if (!nach) nach = punkt(p, end); }, { scope: 'objects' });
  FZ.letzterEnde = { x: end.x, y: end.y, z: end.z, gf: end.gf, place: nach };
  if (redraw) {
    HSS.change('Fluss neu gezeichnet', p => { const f = U.byId(p.flows, st.flow); f.pfad = pfad; f.von = von; f.nach = nach; delete f.via; }, { scope: 'none' });
    UI().flowSel = st.flow; UI().renderPanel(); UI().showRoute(st.flow, true); return;
  }
  const pl = HSS.places(), lbl = id => (pl.find(p => p.id === id)?.name || '').replace(/^Übergabepunkt /, '');
  HSS.flussAssistent.dialog({ pfad, stops: [{ b: '__ext', ort: von, lbl: lbl(von) }, { b: '__ext', ort: nach, lbl: lbl(nach) }] });
};
function punkt(p, q) {
  const P = partAt(q.x, q.z, q.gf), b = P && p.buildings.find(x => x.parts.includes(P.pt));
  const name = `Übergabepunkt ${b ? (b.kurz || b.name) + ' ' : ''}${HSS.floorName(q.gf)}`;
  const o = { id: U.uid('obj'), lib: 'log.uebergabepunkt', rot: 0, name, role: 'uebergabe', place: true, assistent: true };
  if (P) { const l = HSS.toLocal(P.pt, [q.x, q.z]); Object.assign(o, { host: { part: P.pt.id, floor: P.f }, x: r1(l[0]), z: r1(l[1]) }); }
  else Object.assign(o, { x: q.x, z: q.z });
  p.objects.push(o); return o.id;
}
})();
