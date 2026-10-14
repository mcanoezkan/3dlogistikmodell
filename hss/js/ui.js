/* =====================================================================
   HSS · ui.js – Oberfläche: Grundgerüst, Formularbindung, Inspektor, Dialoge
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const UI = HSS.ui = { $, $$, ws: {}, current: null };

/* ---------- kleine Helfer ---------- */
UI.toast = (msg, ms = 2400) => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(UI._tt); UI._tt = setTimeout(() => (t.hidden = true), ms); };
UI.hint = (html) => { const h = $('#hint'); if (!html) { h.hidden = true; return; } h.innerHTML = html; h.hidden = false; };
UI.dialog = (html, onMount) => {
  const d = $('#dlg'); d.innerHTML = html; if (!d.open) d.showModal();
  $$('[data-close]', d).forEach(b => b.onclick = () => d.close());
  onMount && onMount(d); return d;
};
UI.confirm = (title, text, ok = 'OK') => new Promise(res => {
  UI.dialog(`<h2>${U.esc(title)}</h2><p>${text}</p><div class="actions"><button class="primary" id="cOk">${U.esc(ok)}</button><button data-close>Abbrechen</button></div>`, d => {
    $('#cOk', d).onclick = () => { d.close(); res(true); }; d.onclose = () => res(false);
  });
});
UI.prompt = (title, val = '') => new Promise(res => {
  UI.dialog(`<h2>${U.esc(title)}</h2><input type="text" id="pVal" value="${U.esc(val)}"><div class="actions"><button class="primary" id="pOk">OK</button><button data-close>Abbrechen</button></div>`, d => {
    const i = $('#pVal', d); i.focus(); i.select();
    const ok = () => { d.close(); res(i.value); }; $('#pOk', d).onclick = ok; i.onkeydown = e => { if (e.key === 'Enter') ok(); };
  });
});
const opt = (v, l, sel) => `<option value="${U.esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${U.esc(l)}</option>`;
UI.opt = opt;
UI.opts = (obj, sel) => Object.entries(obj).map(([k, v]) => opt(k, typeof v === 'string' ? v : v.name, sel)).join('');
// Formularfelder: data-b = Pfad im Zielobjekt, data-t = Typ (n, s, b, c)
UI.fNum = (label, path, val, o = {}) => `<label class="f ${o.full ? 'full' : ''}"><span>${label}${o.unit ? ' [' + o.unit + ']' : ''}</span><input type="number" data-b="${path}" data-t="n" value="${val ?? ''}" ${o.min !== undefined ? 'min="' + o.min + '"' : ''} ${o.max !== undefined ? 'max="' + o.max + '"' : ''} step="${o.step ?? 'any'}" ${o.ph ? 'placeholder="' + o.ph + '"' : ''}></label>`;
UI.fTxt = (label, path, val, o = {}) => `<label class="f ${o.full !== false ? 'full' : ''}"><span>${label}</span><input type="text" data-b="${path}" data-t="s" value="${U.esc(val ?? '')}" ${o.ph ? 'placeholder="' + U.esc(o.ph) + '"' : ''}></label>`;
UI.fSel = (label, path, val, options, o = {}) => `<label class="f ${o.full ? 'full' : ''}"><span>${label}</span><select data-b="${path}" data-t="${o.t || 's'}">${options}</select></label>`;
UI.fCol = (label, path, val) => `<label class="f"><span>${label}</span><input type="color" data-b="${path}" data-t="s" value="${val || '#cccccc'}"></label>`;
UI.fChk = (label, path, val) => `<label class="chk"><input type="checkbox" data-b="${path}" data-t="b" ${val ? 'checked' : ''}> ${label}</label>`;
const setPath = (o, path, v) => { const k = path.split('.'); let c = o; for (let i = 0; i < k.length - 1; i++) c = c[k[i]] = c[k[i]] ?? {}; c[k[k.length - 1]] = v; };
const getPath = (o, path) => path.split('.').reduce((c, k) => c?.[k], o);
UI.bind = (root, getTarget, label, scope = 'all', after) => {
  $$('[data-b]', root).forEach(el => {
    el.addEventListener('change', () => {
      let v = el.dataset.t === 'b' ? el.checked : el.value;
      if (el.dataset.t === 'n') v = el.value === '' ? null : parseFloat(String(el.value).replace(',', '.'));
      if (el.dataset.t === 'j') v = JSON.parse(v);
      if (el.dataset.t === 'ns') v = v === '' ? null : v;
      HSS.change(label + ': ' + (el.closest('.f, .chk')?.querySelector('span')?.textContent || el.dataset.b), prj => { const t = getTarget(prj); if (t) { setPath(t, el.dataset.b, v); after && after(t, el.dataset.b, v, prj); } }, { scope });
    });
  });
};

/* ---------- Beschreibung beim Überfahren ---------- */
UI.describe = (h) => {
  const prj = HSS.project();
  if (h.kind === 'part') { const P = HSS.findPart(h.id); if (!P) return ''; return `<b>${U.esc(P.building.name)}</b> · ${U.esc(P.part.name)}<div class="s">${P.part.floors} Geschosse${P.part.basements && !P.part.stackOn ? ' + ' + P.part.basements + ' UG' : ''} · ${U.fmt(HSS.partArea(P.part))} m² BGF je Ebene · ${HSS.FASSADEN[P.part.facade.type]?.name || ''}</div>`; }
  if (h.kind === 'object') { const o = U.byId(prj.objects, h.id); const d = o && HSS.library.get(o.lib); if (!d) return ''; const s = o.size || d.size; return `<b>${U.esc(o.name || d.name)}</b><div class="s">${U.esc(d.category)} · ${U.fmt(s.w, 2)} × ${U.fmt(s.d, 2)} × ${U.fmt(s.h, 2)} m</div>`; }
  if (h.kind === 'path') { const p = U.byId(prj.paths, h.id); if (!p) return ''; const st = HSS.pathStats(p); return `<b>${U.esc(p.name)}</b><div class="s">${HSS.WEGARTEN[p.kind]?.name} · ${U.fmt(st.len)} m · max. ${U.fmt(st.maxSlope * 100, 1)} % Neigung</div>`; }
  if (h.kind === 'area') { const a = U.byId(prj.areas, h.id); if (!a) return ''; return `<b>${HSS.FLAECHEN[a.kind]}</b><div class="s">${U.fmt(a.w)} × ${U.fmt(a.d)} m${a.kind === 'parkplatz' ? ' · ' + HSS.parkingLayout(a).stalls.length + ' Stellplätze' : ''}</div>`; }
  if (h.kind === 'bridge') { const b = U.byId(prj.bridges, h.id); return `<b>${U.esc(b?.name || 'Brücke')}</b><div class="s">${b?.type === 'glas' ? 'Glasbrücke' : 'Gebäudebrücke'}</div>`; }
  if (h.kind === 'room') { const r = HSS.interior(h.part, h.floor)?.rooms.find(x => x.id === h.id); if (!r) return ''; return `<b>${U.esc(r.name || HSS.ROOMTYPES[r.use]?.name)}</b><div class="s">${U.fmt(r.w * r.d, 1)} m²${r.role ? ' · Rolle: ' + U.esc(HSS.ROLLEN[r.role] || r.role) : ''}</div>`; }
  if (h.kind === 'wall') return '<b>Wand</b><div class="s">Klicken zum Bearbeiten</div>';
  return '';
};

/* ---------- Auswahl löschen / duplizieren ---------- */
UI.deleteSelection = () => {
  const s = HSS.state.selection; if (!s || HSS.state.demoReadonly) return;
  HSS.change('Löschen', prj => {
    if (s.kind === 'part') { for (const b of prj.buildings) b.parts = b.parts.filter(p => p.id !== s.id); prj.buildings = prj.buildings.filter(b => b.parts.length); prj.bridges = prj.bridges.filter(b => b.a.part !== s.id && b.b.part !== s.id); prj.objects = prj.objects.filter(o => o.host?.part !== s.id); delete prj.interiors[s.id]; for (const b of prj.buildings) for (const p of b.parts) if (p.stackOn === s.id) p.stackOn = null; }
    if (s.kind === 'object') prj.objects = prj.objects.filter(o => o.id !== s.id);
    if (s.kind === 'path') { const p = U.byId(prj.paths, s.id); if (s.point !== undefined && p.points.length > 2) p.points.splice(s.point, 1); else prj.paths = prj.paths.filter(x => x.id !== s.id); }
    if (s.kind === 'area') prj.areas = prj.areas.filter(x => x.id !== s.id);
    if (s.kind === 'bridge') prj.bridges = prj.bridges.filter(x => x.id !== s.id);
    if (s.kind === 'room' && HSS.interior(s.part, s.floor, false, prj)?.walls.some(w => w.auto)) { const I = HSS.interior(s.part, s.floor, false, prj); I.rooms = I.rooms.filter(r => r.id !== s.id); HSS.rebuildWalls(I); }
    else if (s.kind === 'room') { const I = HSS.interior(s.part, s.floor, false, prj); I.rooms = I.rooms.filter(r => r.id !== s.id); const ws = new Set(I.walls.filter(w => w.room === s.id).map(w => w.id)); I.walls = I.walls.filter(w => !ws.has(w.id)); I.doors = I.doors.filter(d => !ws.has(d.wall)); }
    if (s.kind === 'wall') { const I = HSS.interior(s.part, s.floor, false, prj); I.walls = I.walls.filter(w => w.id !== s.id); I.doors = I.doors.filter(d => d.wall !== s.id); }
    if (s.kind === 'hill') prj.terrain.hills.splice(s.idx, 1);
  });
  HSS.s3.select(null);
};
UI.duplicateSelection = () => {
  const s = HSS.state.selection; if (!s) return; let ns = null;
  HSS.change('Duplizieren', prj => {
    if (s.kind === 'object') { const o = U.clone(U.byId(prj.objects, s.id)); o.id = U.uid('obj'); o.x += 1; o.z += 1; prj.objects.push(o); ns = { kind: 'object', id: o.id }; }
    if (s.kind === 'part') { const P = HSS.findPart(s.id, prj); const n = U.clone(P.part); n.id = U.uid('part'); n.name += ' (Kopie)'; n.x += P.part.w + 8; n.stackOn = null; P.building.parts.push(n); ns = { kind: 'part', id: n.id }; }
    if (s.kind === 'area') { const a = U.clone(U.byId(prj.areas, s.id)); a.id = U.uid('area'); a.x += a.w + 4; prj.areas.push(a); ns = { kind: 'area', id: a.id }; }
    if (s.kind === 'path') { const p = U.clone(U.byId(prj.paths, s.id)); p.id = U.uid('path'); p.points = p.points.map(q => [q[0] + 6, q[1] + 6]); prj.paths.push(p); ns = { kind: 'path', id: p.id }; }
  });
  if (ns) HSS.s3.select(ns);
};

/* ---------- Inspektor ---------- */
UI.inspector = () => {
  const el = $('#inspector'), s = HSS.state.selection;
  if (!s) { el.hidden = true; document.body.classList.remove('insp'); return; }
  const fn = INSP[s.kind]; if (!fn) { el.hidden = true; return; }
  const html = fn(s); if (!html) { el.hidden = true; document.body.classList.remove('insp'); return; }
  el.hidden = false; document.body.classList.add('insp');
  const keepScroll = el.scrollTop;
  el.innerHTML = html; el.scrollTop = keepScroll;
  $('.x', el) && ($('.x', el).onclick = () => HSS.s3.select(null));
  INSP_BIND[s.kind] && INSP_BIND[s.kind](el, s);
  if (HSS.state.demoReadonly) $$('input,select,textarea', el).forEach(i => i.disabled = true);
};
const head = (kicker, title, extra = '') => `<div class="ih"><div><div class="kicker">${kicker}</div><h2>${U.esc(title)}</h2>${extra}</div><button class="x" title="Auswahl aufheben (Esc)">×</button></div>`;
const INSP = {}, INSP_BIND = {};
const partOpts = (sel, excl, allowNone = true) => (allowNone ? opt('', '– keins –', sel) : '') + HSS.project().buildings.flatMap(b => b.parts.filter(p => p.id !== excl).map(p => opt(p.id, `${b.kurz || b.name} · ${p.name}`, sel))).join('');
const floorOpts = (pt, sel) => HSS.partFloors(pt).map(f => opt(f, HSS.floorName(HSS.globalFloor(pt, f)), sel)).join('');

INSP.part = s => {
  const P = HSS.findPart(s.id); if (!P) return '';
  const pt = P.part, b = P.building, fc = pt.facade, area = HSS.partArea(pt);
  const per = G.perimeter(HSS.partFootprintLocal(pt).outer), H = HSS.partTopY(pt) - HSS.partBaseY(pt);
  const shapeExtra = pt.shape === 'L' || pt.shape === 'T' ? UI.fNum('Schenkelbreite', 'legW', pt.legW, { unit: 'm', min: 2 }) + UI.fNum('Schenkeltiefe', 'legD', pt.legD, { unit: 'm', min: 2 }) : (pt.shape === 'U' || pt.shape === 'O') ? UI.fNum(pt.shape === 'O' ? 'Hofbreite' : 'Hofbreite (offen)', 'courtW', pt.courtW, { unit: 'm', min: 2 }) + UI.fNum('Hoftiefe', 'courtD', pt.courtD, { unit: 'm', min: 2 }) : '';
  const fh = HSS.partFloors(pt).filter(f => f >= 0).map(f => `<label class="f"><span>${HSS.floorName(HSS.globalFloor(pt, f))}</span><input type="number" step="0.1" min="2.4" data-fh="${f}" value="${pt.floorHeights?.[f] ?? ''}" placeholder="${pt.floorHeight}"></label>`).join('');
  return head('Gebäudeteil · ' + U.esc(b.name), pt.name) + `
  ${b.info ? `<div class="note" style="color:#0A223C">${U.esc(b.info)}</div>` : ''}<div class="note">${U.fmt(area)} m² BGF je Ebene · ${U.fmt(area * (pt.floors + (pt.stackOn ? 0 : pt.basements || 0)))} m² gesamt · Höhe ${U.fmt(H, 1)} m · Umfang ${U.fmt(per)} m</div>
  <h3>Gebäude</h3><div class="fg c3 bld">${UI.fTxt('Name', 'name', b.name, { full: false })}${UI.fTxt('Kürzel', 'kurz', b.kurz, { full: false })}${UI.fCol('Hausfarbe', 'color', b.color)}</div>
  <h3>Form &amp; Größe</h3>
  <div class="fg pf">${UI.fTxt('Bezeichnung Bauteil', 'name', pt.name)}
    ${UI.fSel('Grundriss', 'shape', pt.shape, UI.opts(HSS.FORMEN, pt.shape))}
    ${UI.fNum('Eckrundung (Radius)', 'cornerRadius', pt.cornerRadius, { unit: 'm', min: 0, step: 0.5 })}
    ${UI.fNum('Länge', 'w', pt.w, { unit: 'm', min: 3, step: 0.5 })}${UI.fNum('Tiefe', 'd', pt.d, { unit: 'm', min: 3, step: 0.5 })}
    ${shapeExtra}
    ${UI.fNum('Drehung', 'rot', pt.rot, { unit: '°', step: 1 })}${UI.fNum('Versatz Höhe', 'baseOffset', pt.baseOffset, { unit: 'm', step: 0.1 })}
    ${UI.fNum('Lage x', 'x', pt.x, { unit: 'm', step: 0.5 })}${UI.fNum('Lage z', 'z', pt.z, { unit: 'm', step: 0.5 })}
  </div>
  <input type="range" min="0" max="${Math.round(Math.min(pt.w, pt.d) / 2)}" step="0.5" value="${pt.cornerRadius}" id="iRad" style="width:100%" title="Rundung stufenlos">
  <h3>Geschosse</h3>
  <div class="fg pf">${UI.fNum('Geschosse (EG + OG)', 'floors', pt.floors, { min: 1, max: 40, step: 1 })}${UI.fNum('Geschosshöhe', 'floorHeight', pt.floorHeight, { unit: 'm', min: 2.4, step: 0.1 })}
  ${pt.stackOn ? '' : UI.fNum('Untergeschosse', 'basements', pt.basements, { min: 0, max: 4, step: 1 }) + UI.fNum('Höhe UG', 'basementHeight', pt.basementHeight, { unit: 'm', min: 2.4, step: 0.1 })}</div>
  <details><summary class="note">Einzelne Geschosshöhen anpassen</summary><div class="fg c3" id="iFH">${fh}</div></details>
  <h3>Fassade</h3>
  <div class="fg pf">${UI.fSel('Fassadentyp', 'facade.type', fc.type, UI.opts(HSS.FASSADEN, fc.type), { full: true })}
  ${UI.fCol('Wand/Brüstung', 'facade.color', fc.color)}${UI.fCol('Akzent/Paneel', 'facade.accent', fc.accent)}${UI.fCol('Glas', 'facade.glass', fc.glass)}${UI.fCol('Rahmen', 'facade.frame', fc.frame || '#59636e')}
  ${UI.fNum('Achsraster', 'facade.axis', fc.axis, { unit: 'm', min: 0.6, step: 0.05 })}${UI.fNum('Fensteranteil', 'facade.windowRatio', fc.windowRatio, { min: 0.1, max: 0.95, step: 0.05 })}</div>
  <div class="note">${U.esc(HSS.FASSADEN[fc.type]?.info || '')}</div>
  <h3>Dach</h3>
  <div class="fg pf">${UI.fSel('Dachart', 'roof.type', pt.roof.type, opt('flach', 'Flachdach', pt.roof.type) + opt('gruen', 'Gründach', pt.roof.type))}${UI.fNum('Attika', 'roof.parapet', pt.roof.parapet, { unit: 'm', min: 0, step: 0.1 })}</div>
  <div class="pf">${UI.fChk('Technikaufbau', 'roof.plant', pt.roof.plant)}${UI.fChk('Hubschrauberlandeplatz', 'roof.helipad', pt.roof.helipad)}</div>
  <h3>Anordnung &amp; Verbindung</h3>
  <div class="fg pf">${UI.fSel('Aufgesetzt auf', 'stackOn', pt.stackOn || '', partOpts(pt.stackOn || '', pt.id), { full: true, t: 'ns' })}</div>
  <div class="box"><div class="note" style="margin-bottom:4px">Andocken: Bauteil bündig neben ein anderes setzen</div>
    <div class="fg c3"><label class="f"><span>an</span><select id="dkT">${partOpts('', pt.id, false)}</select></label><label class="f"><span>Seite</span><select id="dkS">${opt('O', 'Ost (+x)')}${opt('W', 'West (−x)')}${opt('N', 'Nord (−z)')}${opt('S', 'Süd (+z)')}</select></label><label class="f"><span>bündig</span><select id="dkA">${opt('mitte', 'Mitte')}${opt('anfang', 'Anfang')}${opt('ende', 'Ende')}</select></label></div>
    <div class="row"><button id="dkGo">Andocken</button><label class="chk"><input type="checkbox" id="dkGap"> 6 m Abstand (z. B. für Brücke)</label></div></div>
  <div class="actions">
    <button class="primary" id="iFloor">Innenansicht EG</button>
    <button id="iAddSide" title="Neues Bauteil rechts daneben (verbunden)">+ Bauteil daneben</button>
    <button id="iAddTop" title="Neues Bauteil oben aufsetzen">+ aufsetzen</button>
    <button id="iBridge">Brücke …</button>
    <button id="iDup">Duplizieren</button>
    <button class="danger" id="iDel">Löschen</button>
  </div>`;
};
INSP_BIND.part = (el, s) => {
  const tgt = prj => HSS.findPart(s.id, prj)?.part;
  const FC = { klinker: ['#9c5a3c', '#f4f1ea'], glas: ['#e9ecef', '#144477'], lamellen: ['#f4f5f7', '#d9dde2'], paneel: ['#eef0f2', '#2D7694'], parkhaus: ['#c9ced4', '#2D7694'], loch: ['#f1ede4', '#8d6e63'], band: ['#eef0f2', '#144477'], raster: ['#e9ecef', '#c9ced4'] };
  UI.bind(el, tgt, 'Bauteil', 'all', (p, path, v) => { if (path === 'facade.type' && FC[v]) { p.facade.color = FC[v][0]; p.facade.accent = FC[v][1]; } });
  // Gebäudefelder separat binden (Ziel = Gebäude)
  $$('.bld [data-b]', el).forEach(i => i.replaceWith(i.cloneNode(true)));
  UI.bind($('.bld', el), prj => HSS.findPart(s.id, prj)?.building, 'Gebäude');
  $$('[data-fh]', el).forEach(i => i.onchange = () => HSS.change('Geschosshöhe', prj => { const p = tgt(prj); p.floorHeights = p.floorHeights || {}; if (i.value === '') delete p.floorHeights[i.dataset.fh]; else p.floorHeights[i.dataset.fh] = parseFloat(i.value); }));
  $('#iRad', el).oninput = U.debounce(e => HSS.change('Eckrundung', prj => { tgt(prj).cornerRadius = parseFloat($('#iRad', el).value); }), 120);
  $('#dkGo', el).onclick = () => UI.dock(s.id, $('#dkT', el).value, $('#dkS', el).value, $('#dkA', el).value, $('#dkGap', el).checked ? 6 : 0);
  $('#iFloor', el).onclick = () => { const P = HSS.findPart(s.id); HSS.s3.setFloor(HSS.globalFloor(P.part, 0)); UI.setWS('innen'); HSS.s3.focusSel(s); };
  $('#iAddSide', el).onclick = () => UI.addPart(s.id, 'side');
  $('#iAddTop', el).onclick = () => UI.addPart(s.id, 'top');
  $('#iBridge', el).onclick = () => UI.bridgeDialog(s.id);
  $('#iDup', el).onclick = UI.duplicateSelection; $('#iDel', el).onclick = UI.deleteSelection;
};
UI.dock = (id, tid, side, align, gap = 0) => {
  if (!tid) return UI.toast('Zielbauteil wählen');
  HSS.change('Andocken', prj => {
    const P = HSS.findPart(id, prj).part, T = HSS.findPart(tid, prj).part;
    P.rot = T.rot || 0; P.stackOn = null;
    const bt = G.bbox(HSS.partFootprintLocal(T).outer), bp = G.bbox(HSS.partFootprintLocal(P).outer);
    let lx = 0, lz = 0;
    const al = (t0, t1, p0, p1) => align === 'anfang' ? t0 - p0 : align === 'ende' ? t1 - p1 : (t0 + t1) / 2 - (p0 + p1) / 2;
    if (side === 'O') { lx = bt.x1 - bp.x0 + gap; lz = al(bt.z0, bt.z1, bp.z0, bp.z1); }
    if (side === 'W') { lx = bt.x0 - bp.x1 - gap; lz = al(bt.z0, bt.z1, bp.z0, bp.z1); }
    if (side === 'S') { lz = bt.z1 - bp.z0 + gap; lx = al(bt.x0, bt.x1, bp.x0, bp.x1); }
    if (side === 'N') { lz = bt.z0 - bp.z1 - gap; lx = al(bt.x0, bt.x1, bp.x0, bp.x1); }
    const w = HSS.toWorld(T, [lx, lz]); P.x = Math.round(w[0] * 10) / 10; P.z = Math.round(w[1] * 10) / 10;
    if (!P.baseFixed) P.baseOffset = HSS.partBaseY(T, prj) - Math.round(HSS.terrainH(P.x, P.z, prj) * 10) / 10;
  });
};
UI.addPart = (id, mode) => {
  let nid = null;
  HSS.change(mode === 'top' ? 'Bauteil aufsetzen' : 'Bauteil anfügen', prj => {
    const P = HSS.findPart(id, prj), d = HSS.defaults.part();
    Object.assign(d, { name: 'Bauteil ' + (P.building.parts.length + 1), facade: U.clone(P.part.facade), roof: U.clone(P.part.roof), floorHeight: P.part.floorHeight, rot: P.part.rot });
    if (mode === 'top') Object.assign(d, { stackOn: P.part.id, x: P.part.x, z: P.part.z, w: Math.max(6, P.part.w * 0.6), d: Math.max(6, P.part.d * 0.8), floors: 2, basements: 0, shape: 'rect', cornerRadius: P.part.cornerRadius });
    else { d.w = Math.max(10, P.part.w * 0.6); d.d = P.part.d; d.floors = P.part.floors; d.basements = P.part.basements; }
    P.building.parts.push(d); nid = d.id;
  });
  if (mode !== 'top') UI.dock(nid, id, 'O', 'mitte', 0);
  HSS.s3.select({ kind: 'part', id: nid });
};
UI.bridgeDialog = (fromId) => {
  const prj = HSS.project(), A = fromId ? HSS.findPart(fromId)?.part : null;
  UI.dialog(`<div class="dh"><h2>Brücke verbinden</h2><button class="x" data-close>×</button></div>
    <p class="note">Brücken verbinden zwei Gebäudeteile auf einer Ebene. Liegen die Geschosse unterschiedlich hoch, wird die Brücke als Rampe geführt. Das Wegenetz übernimmt die Verbindung automatisch.</p>
    <div class="fg"><label class="f"><span>Von Bauteil</span><select id="bA">${partOpts(fromId || '', null, false)}</select></label><label class="f"><span>Ebene</span><select id="bAf"></select></label>
    <label class="f"><span>Nach Bauteil</span><select id="bB">${partOpts('', fromId, false)}</select></label><label class="f"><span>Ebene</span><select id="bBf"></select></label>
    <label class="f"><span>Art</span><select id="bT">${opt('glas', 'Glasbrücke')}${opt('gebaeude', 'Gebäudebrücke (Fenster)')}</select></label><label class="f"><span>Breite [m]</span><input type="number" id="bW" value="4" step="0.5"></label>
    <label class="f"><span>Geschosse übereinander</span><input type="number" id="bL" value="1" min="1" max="4"></label><label class="f"><span>Versatz entlang Fassade [m]</span><input type="number" id="bO" value="0" step="1"></label></div>
    <div class="actions"><button class="primary" id="bGo">Brücke anlegen</button><button data-close>Abbrechen</button></div>`, d => {
    const fill = (sel, fs) => { const P = HSS.findPart($(sel, d).value); $(fs, d).innerHTML = P ? floorOpts(P.part, 1) : ''; };
    $('#bA', d).onchange = () => fill('#bA', '#bAf'); $('#bB', d).onchange = () => fill('#bB', '#bBf'); fill('#bA', '#bAf'); fill('#bB', '#bBf');
    $('#bGo', d).onclick = () => {
      const a = $('#bA', d).value, b = $('#bB', d).value; if (!a || !b || a === b) return UI.toast('Zwei verschiedene Bauteile wählen');
      const br = { id: U.uid('br'), name: 'Brücke', type: $('#bT', d).value, a: { part: a, floor: +$('#bAf', d).value }, b: { part: b, floor: +$('#bBf', d).value }, width: +$('#bW', d).value || 4, height: 3.4, levels: +$('#bL', d).value || 1, offset: +$('#bO', d).value || 0 };
      HSS.change('Brücke anlegen', p => p.bridges.push(br)); d.close(); HSS.s3.select({ kind: 'bridge', id: br.id }, { focus: true });
    };
  });
};

INSP.bridge = s => {
  const b = U.byId(HSS.project().bridges, s.id); if (!b) return '';
  const e = HSS.bridgeEnds(b); const A = HSS.findPart(b.a.part), B = HSS.findPart(b.b.part);
  return head('Brücke', b.name) + `<div class="note">Länge ${U.fmt(e?.len || 0, 1)} m · Höhenunterschied ${U.fmt(e ? e.yb - e.ya : 0, 2)} m${e && e.len ? ' · Steigung ' + U.fmt(Math.abs(e.yb - e.ya) / e.len * 100, 1) + ' %' : ''}</div>
  <div class="fg">${UI.fTxt('Name', 'name', b.name)}${UI.fSel('Art', 'type', b.type, opt('glas', 'Glasbrücke', b.type) + opt('gebaeude', 'Gebäudebrücke', b.type))}${UI.fNum('Breite', 'width', b.width, { unit: 'm', step: 0.5 })}
  ${UI.fNum('Lichte Höhe', 'height', b.height, { unit: 'm', step: 0.1 })}${UI.fNum('Geschosse', 'levels', b.levels, { min: 1, step: 1 })}${UI.fNum('Versatz', 'offset', b.offset, { unit: 'm', step: 0.5 })}
  ${A ? UI.fSel('Ebene ' + U.esc(A.part.name), 'a.floor', b.a.floor, floorOpts(A.part, b.a.floor), { t: 'n' }) : ''}${B ? UI.fSel('Ebene ' + U.esc(B.part.name), 'b.floor', b.b.floor, floorOpts(B.part, b.b.floor), { t: 'n' }) : ''}
  ${UI.fCol('Rahmen/Farbe', b.type === 'glas' ? 'frame' : 'color', b.type === 'glas' ? b.frame || '#59636e' : b.color || '#e9ecef')}${UI.fCol('Glas', 'glass', b.glass || '#9fc4d8')}</div>
  ${UI.fChk('Stützen bei großer Spannweite', 'supports', b.supports !== false)}
  <div class="actions"><button class="danger" id="iDel">Löschen</button></div>`;
};
INSP_BIND.bridge = (el, s) => { UI.bind(el, prj => U.byId(prj.bridges, s.id), 'Brücke'); $('#iDel', el).onclick = UI.deleteSelection; };

INSP.object = s => {
  const prj = HSS.project(), o = U.byId(prj.objects, s.id); if (!o) return '';
  const d = HSS.library.get(o.lib); if (!d) return head('Objekt', o.lib) + '<div class="errbox">Bibliotheksobjekt fehlt. Paket laden oder Objekt hochladen.</div>';
  const size = o.size || d.size, role = o.role || d.logistik?.rolle;
  const P = o.host ? HSS.findPart(o.host.part) : null;
  const liftCfg = Object.assign({}, d.logistik?.aufzug || {}, o.aufzug || {});
  const meta = Object.entries(d.meta || {}).filter(([k]) => !['licht'].includes(k)).map(([k, v]) => `<div><b>${U.esc(k)}:</b> ${U.esc(typeof v === 'object' ? JSON.stringify(v) : v)}</div>`).join('');
  const fr = ['*', 'rein', 'unrein', 'person', 'patient', 'awt'];
  return head(U.esc(d.category), o.name || d.name, P ? `<div class="note">${U.esc(P.building.name)} · ${U.esc(P.part.name)} · ${HSS.floorName(HSS.globalFloor(P.part, o.host.floor))}</div>` : '<div class="note">Außenbereich</div>') + `
  <div class="fg">${UI.fTxt('Bezeichnung (optional)', 'name', o.name, { ph: d.name })}
  ${UI.fNum('Breite', 'size.w', size.w, { unit: 'm', step: 0.01, min: 0.01 })}${UI.fNum('Tiefe', 'size.d', size.d, { unit: 'm', step: 0.01, min: 0.01 })}${UI.fNum('Höhe', 'size.h', size.h, { unit: 'm', step: 0.01, min: 0.01 })}${UI.fNum('Drehung', 'rot', o.rot || 0, { unit: '°', step: 5 })}
  ${UI.fNum('Lage x', 'x', o.x, { step: 0.1 })}${UI.fNum('Lage z', 'z', o.z, { step: 0.1 })}${UI.fNum('Höhe über Boden', 'y', o.y || 0, { unit: 'm', step: 0.05 })}${UI.fCol('Farbe (Lack)', 'color', o.color || '#2d7694')}</div>
  <div class="note">Standardgröße ${U.fmt(d.size.w, 2)} × ${U.fmt(d.size.d, 2)} × ${U.fmt(d.size.h, 2)} m <button class="mini" id="oStd">zurücksetzen</button></div>
  <h3>Logistik</h3>
  <div class="fg">${UI.fSel('Rolle für Flüsse', 'role', role || '', opt('', '– keine –', role || '') + UI.opts(Object.assign({}, HSS.ROLLEN, { aufzug: 'Aufzug', treppe: 'Treppe', lager: 'Lager/Puffer', senke: 'Senke', quelle: 'Quelle' }), role || ''), { full: true, t: 'ns' })}</div>
  ${UI.fChk('Als Ort (Quelle/Ziel) für Flüsse anbieten', 'place', o.place || !!role)}
  ${role === 'aufzug' ? `<h3>Aufzug</h3><div class="fg">${UI.fSel('Typ', 'aufzug.typ', liftCfg.typ, UI.opts({ bett: 'Bettenaufzug', person: 'Personenaufzug', lasten: 'Lastenaufzug', awt: 'AWT-Vertikalförderer' }, liftCfg.typ))}${UI.fNum('Kabinen', 'aufzug.kabinen', liftCfg.kabinen, { min: 1, step: 1 })}
     ${UI.fNum('Fahrzeit je Geschoss', 'aufzug.sekProGeschoss', liftCfg.sekProGeschoss, { unit: 's', step: 0.5 })}${UI.fNum('Tür-/Haltezeit', 'aufzug.tuerS', liftCfg.tuerS, { unit: 's', step: 1 })}
     ${UI.fNum('Von Geschoss (global)', 'vonGF', o.vonGF ?? '', { step: 1, ph: 'alle' })}${UI.fNum('Bis Geschoss', 'bisGF', o.bisGF ?? '', { step: 1, ph: 'alle' })}</div>
     <div class="note">Freigaben (wer darf fahren):</div><div class="row" id="oFr">${fr.map(f => `<label class="chk"><input type="checkbox" data-fr="${f}" ${(liftCfg.freigabe || ['*']).includes(f) ? 'checked' : ''}> ${f === '*' ? 'alle' : f}</label>`).join('')}</div>` : ''}
  ${meta ? `<h3>Datenblatt</h3><div class="note">${meta}</div>` : ''}
  <div class="actions"><button id="iDup">Duplizieren</button><button id="oExp" title="Als .hssobj.json speichern">Objekt exportieren</button><button class="danger" id="iDel">Löschen</button></div>`;
};
INSP_BIND.object = (el, s) => {
  UI.bind(el, prj => U.byId(prj.objects, s.id), 'Objekt', 'objects', (o, path) => { if (path.startsWith('size.')) { const d = HSS.library.get(o.lib); o.size = Object.assign({}, d.size, o.size); } if (path === 'role' && o.role) o.place = true; });
  $('#oStd', el).onclick = () => HSS.change('Standardgröße', prj => { delete U.byId(prj.objects, s.id).size; });
  $$('[data-fr]', el).forEach(c => c.onchange = () => HSS.change('Aufzugsfreigabe', prj => { const o = U.byId(prj.objects, s.id); o.aufzug = o.aufzug || {}; o.aufzug.freigabe = $$('[data-fr]', el).filter(x => x.checked).map(x => x.dataset.fr); }));
  $('#iDup', el).onclick = UI.duplicateSelection; $('#iDel', el).onclick = UI.deleteSelection;
  $('#oExp', el).onclick = () => HSS.library.exportObject(U.byId(HSS.project().objects, s.id).lib);
};

INSP.path = s => {
  const p = U.byId(HSS.project().paths, s.id); if (!p) return '';
  const st = HSS.pathStats(p), under = p.elev === 'absolut';
  return head('Weg · ' + (HSS.WEGARTEN[p.kind]?.name || ''), p.name) + `
  <div class="note">Länge ${U.fmt(st.len, 1)} m · Höhendifferenz ${U.fmt(st.dy, 2)} m · max. Neigung ${U.fmt(st.maxSlope * 100, 1)} %${st.maxSlope > 0.06 && p.kind !== 'strasse' ? ' <span class="pill unrein">> 6 % (DIN 18040)</span>' : ''}</div>
  <div class="fg">${UI.fTxt('Name', 'name', p.name)}${UI.fSel('Art', 'kind', p.kind, UI.opts(HSS.WEGARTEN, p.kind))}${UI.fNum('Breite', 'width', p.width, { unit: 'm', step: 0.1, min: 0.8 })}
  ${UI.fSel('Höhenführung', 'elev', p.elev, opt('gelaende', 'folgt dem Gelände', p.elev) + opt('absolut', 'feste Höhe (Tunnel/Brücke)', p.elev))}${under ? UI.fNum('Höhe (absolut)', 'y', p.y, { unit: 'm', step: 0.1 }) : '<span></span>'}
  ${UI.fNum('Anhebung Anfang', 'ramp.0', p.ramp?.[0] ?? 0, { unit: 'm', step: 0.1 })}${UI.fNum('Anhebung Ende', 'ramp.1', p.ramp?.[1] ?? 0, { unit: 'm', step: 0.1 })}
  ${['strasse', 'zufahrt'].includes(p.kind) ? UI.fNum('Fahrzeuge (Animation)', 'traffic', p.traffic, { min: 0, step: 1 }) + UI.fNum('Tempo', 'speedKmh', p.speedKmh, { unit: 'km/h', step: 5 }) : ''}</div>
  ${UI.fChk('Gebogen führen (Kurven glätten)', 'smooth', p.smooth)}
  <div class="note">Gefälle/Schräge: Anhebung am Anfang/Ende erzeugt eine gleichmäßige Rampe zusätzlich zum Gelände. Punkte im 3D-Modell anklicken und mit dem Gizmo verschieben.</div>
  <h3>Punkte (${p.points.length})</h3><div class="list" style="max-height:160px">${p.points.map((q, i) => `<div class="li ${s.point === i ? 'on' : ''}" data-pi="${i}"><span class="t">P${i + 1}: ${U.fmt(q[0], 1)} / ${U.fmt(q[1], 1)}</span><button class="mini" data-pdel="${i}">×</button></div>`).join('')}</div>
  <div class="actions"><button id="pCont">Punkte anfügen</button><button id="pRev">Richtung umkehren</button><button id="iDup">Duplizieren</button><button class="danger" id="iDel">Löschen</button></div>`;
};
INSP_BIND.path = (el, s) => {
  UI.bind(el, prj => U.byId(prj.paths, s.id), 'Weg', 'outdoor', (p, path, v) => { if (path.startsWith('ramp.')) { const r = Array.isArray(p.ramp) ? p.ramp : [p.ramp?.[0] || 0, p.ramp?.[1] || 0]; r[+path.split('.')[1]] = v || 0; p.ramp = r; } if (path === 'kind') { const k = HSS.WEGARTEN[v]; p.width = k.w; if (v === 'tunnel' || v === 'awt') { p.elev = 'absolut'; p.y = p.y ?? -4; } } });
  $$('[data-pi]', el).forEach(li => li.onclick = e => { if (e.target.dataset.pdel !== undefined) return; HSS.s3.select({ kind: 'path', id: s.id, point: +li.dataset.pi }); });
  $$('[data-pdel]', el).forEach(b => b.onclick = () => HSS.change('Wegpunkt löschen', prj => { const p = U.byId(prj.paths, s.id); if (p.points.length > 2) p.points.splice(+b.dataset.pdel, 1); }, { scope: 'outdoor' }));
  $('#pRev', el).onclick = () => HSS.change('Weg umkehren', prj => U.byId(prj.paths, s.id).points.reverse(), { scope: 'outdoor' });
  $('#pCont', el).onclick = () => HSS.tools.drawPath(null, s.id);
  $('#iDup', el).onclick = UI.duplicateSelection; $('#iDel', el).onclick = UI.deleteSelection;
};

INSP.area = s => {
  const a = U.byId(HSS.project().areas, s.id); if (!a) return '';
  const L = a.kind === 'parkplatz' ? HSS.parkingLayout(a) : null;
  return head('Fläche', HSS.FLAECHEN[a.kind]) + `<div class="note">${U.fmt(a.w * a.d)} m²${L ? ` · <b>${L.stalls.length} Stellplätze</b> (${L.cols} je Reihe, ${L.modules} Doppelreihen à ${U.fmt(2 * L.sd + L.aisle, 1)} m)` : ''}</div>
  <div class="fg">${UI.fSel('Art', 'kind', a.kind, UI.opts(HSS.FLAECHEN, a.kind))}${UI.fNum('Drehung', 'rot', a.rot, { unit: '°', step: 1 })}${UI.fNum('Länge', 'w', a.w, { unit: 'm', step: 0.5 })}${UI.fNum('Tiefe', 'd', a.d, { unit: 'm', step: 0.5 })}
  ${UI.fNum('Lage x', 'x', a.x, { step: 0.5 })}${UI.fNum('Lage z', 'z', a.z, { step: 0.5 })}
  ${a.kind === 'parkplatz' ? UI.fNum('Stellplatzbreite', 'stallW', a.stallW ?? 2.5, { unit: 'm', step: 0.05 }) + UI.fNum('Stellplatztiefe', 'stallD', a.stallD ?? 5, { unit: 'm', step: 0.1 }) + UI.fNum('Fahrgasse', 'aisle', a.aisle ?? 6, { unit: 'm', step: 0.5 }) + UI.fNum('Belegung', 'occupancy', a.occupancy ?? 0.7, { min: 0, max: 1, step: 0.05 }) : ''}
  ${a.kind === 'gruen' ? UI.fNum('Bepflanzungsdichte', 'density', a.density ?? 1, { min: 0, max: 3, step: 0.1 }) + UI.fCol('Farbe', 'color', a.color || '#9cc07f') : ''}${a.kind === 'platz' ? UI.fCol('Belag', 'color', a.color || '#d4cfc4') : ''}</div>
  ${a.kind === 'parkplatz' ? '<div class="note">Richtwerte: Stellplatz 2,50 × 5,00 m, Fahrgasse 6,00 m bei Senkrechtaufstellung (GaVO).</div>' : ''}
  <div class="actions"><button id="iDup">Duplizieren</button><button class="danger" id="iDel">Löschen</button></div>`;
};
INSP_BIND.area = (el, s) => { UI.bind(el, prj => U.byId(prj.areas, s.id), 'Fläche', 'outdoor'); $('#iDup', el).onclick = UI.duplicateSelection; $('#iDel', el).onclick = UI.deleteSelection; };

INSP.room = s => {
  const I = HSS.interior(s.part, s.floor); const r = I?.rooms.find(x => x.id === s.id); if (!r) return '';
  if (r.zone && HSS.zoneInspector) return HSS.zoneInspector(s);
  return head('Raum', r.name || HSS.ROOMTYPES[r.use]?.name) + `<div class="note">${U.fmt(r.w * r.d, 1)} m² · ${U.fmt(r.w, 2)} × ${U.fmt(r.d, 2)} m · ${U.esc(HSS.DIN277[HSS.roomDin(r)]?.name || '')}${r.station ? ' · Station: ' + U.esc(U.byId(HSS.project().stations, r.station)?.name || '') : ''}</div>
  <div class="fg">${UI.fTxt('Bezeichnung', 'name', r.name)}${UI.fSel('Raumart', 'use', r.use, UI.opts(HSS.ROOMTYPES, r.use))}${UI.fSel('Logistik-Rolle', 'role', r.role || '', opt('', '– keine –', r.role || '') + UI.opts(Object.assign({}, HSS.ROLLEN, { rein: 'Station: Arbeitsraum rein', unrein: 'Station: Arbeitsraum unrein', medikamente: 'Station: Medikamente', kueche: 'Station: Teeküche', stuetzpunkt: 'Station: Stützpunkt', aufenthalt: 'Station: Aufenthalt' }), r.role || ''), { t: 'ns' })}
  ${UI.fCol('Bodenfarbe', 'color', r.color || HSS.ROOMTYPES[r.use]?.color)}${UI.fNum('Breite', 'w', r.w, { unit: 'm', step: 0.1 })}${UI.fNum('Tiefe', 'd', r.d, { unit: 'm', step: 0.1 })}</div>
  <div class="note">Größenänderung passt die Raumwände an. Die Rolle macht den Raum zur Quelle/Senke für Standardflüsse.</div>
  ${HSS.NEBENRAUM_INFO?.[r.use] ? `<div class="note">${U.esc(HSS.NEBENRAUM_INFO[r.use])}</div>` : ''}${r.hinweis ? `<div class="note" style="color:#0A223C">${U.esc(r.hinweis)}</div>` : ''}
  <div class="actions">${HSS.EINRICHTUNG?.[r.use] ? '<button id="iFurn" title="Vorhandene Möbel im Raum ersetzen und den Raum nach Raumart vollständig einrichten">Automatisch einrichten</button>' : ''}<button class="danger" id="iDel">Raum löschen</button></div>`;
};
INSP_BIND.room = (el, s) => {
  if (HSS.interior(s.part, s.floor)?.rooms.find(x => x.id === s.id)?.zone && HSS.zoneInspectorBind) return HSS.zoneInspectorBind(el, s);
  UI.bind(el, prj => HSS.interior(s.part, s.floor, false, prj)?.rooms.find(x => x.id === s.id), 'Raum', 'all', (r, path, v, prj) => {
    if ((path === 'w' || path === 'd') && HSS.interior(s.part, s.floor, false, prj).walls.some(w => w.auto)) { HSS.rebuildWalls(HSS.interior(s.part, s.floor, false, prj)); return; }
    if (path === 'w' || path === 'd') { const I = HSS.interior(s.part, s.floor, false, prj); const old = I.walls.filter(w => w.room === r.id).map(w => w.id); I.walls = I.walls.filter(w => w.room !== r.id); I.doors = I.doors.filter(d => !old.includes(d.wall)); I.walls.push(...HSS.roomWalls(r)); }
  });
  $('#iDel', el).onclick = UI.deleteSelection;
  const fb = $('#iFurn', el); if (fb) fb.onclick = () => { let n = 0; HSS.change('Raum einrichten', prj => { n = HSS.refurnishRoom(s.part, s.floor, s.id, {}, prj); }); UI.toast(`${n} Objekte platziert`); };
};
INSP.wall = s => {
  const I = HSS.interior(s.part, s.floor); const w = I?.walls.find(x => x.id === s.id); if (!w) return '';
  const doors = I.doors.filter(d => d.wall === w.id);
  return head('Wand', 'Innenwand') + `<div class="note">Länge ${U.fmt(G.dist(w.a, w.b), 2)} m · ${doors.length} Tür(en)</div>
  <div class="fg">${UI.fNum('Wanddicke', 't', w.t || 0.15, { unit: 'm', step: 0.01 })}</div>
  ${doors.map(d => `<div class="row"><span class="grow">Tür ${U.fmt(d.w, 2)} m bei ${U.pct(d.t)}</span><button class="mini" data-dd="${d.id}">×</button></div>`).join('')}
  <div class="actions"><button id="wDoor">+ Tür (1,01 m)</button><button id="wDoorB">+ Bettentür (1,40 m)</button><button class="danger" id="iDel">Wand löschen</button></div>`;
};
INSP_BIND.wall = (el, s) => {
  UI.bind(el, prj => HSS.interior(s.part, s.floor, false, prj)?.walls.find(x => x.id === s.id), 'Wand');
  const add = (w, lib) => HSS.change('Tür einsetzen', prj => HSS.interior(s.part, s.floor, false, prj).doors.push({ id: U.uid('d'), wall: s.id, t: 0.5, w, lib }));
  $('#wDoor', el).onclick = () => add(1.1, 'erschl.tuer.1'); $('#wDoorB', el).onclick = () => add(1.5, 'erschl.tuer.bett');
  $$('[data-dd]', el).forEach(b => b.onclick = () => HSS.change('Tür entfernen', prj => { const I = HSS.interior(s.part, s.floor, false, prj); I.doors = I.doors.filter(d => d.id !== b.dataset.dd); }));
  $('#iDel', el).onclick = UI.deleteSelection;
};
INSP.hill = s => {
  const h = HSS.project().terrain.hills[s.idx]; if (!h) return '';
  return head('Gelände', h.plateau ? 'Plateau / Böschung' : 'Geländekuppe') + `<div class="fg">${UI.fNum('Höhe', 'h', h.h, { unit: 'm', step: 0.5 })}${UI.fNum('Radius', 'r', h.r, { unit: 'm', step: 1 })}${UI.fNum('x', 'x', h.x, { step: 1 })}${UI.fNum('z', 'z', h.z, { step: 1 })}</div>${UI.fChk('Plateau (ebene Kuppe mit Böschung)', 'plateau', h.plateau)}<div class="note">Negative Höhe erzeugt eine Mulde. Gebäude setzen sich automatisch auf die Geländehöhe und erhalten bei Hanglage einen Sockel.</div><div class="actions"><button class="danger" id="iDel">Entfernen</button></div>`;
};
INSP_BIND.hill = (el, s) => { UI.bind(el, prj => prj.terrain.hills[s.idx], 'Gelände', 'all'); $('#iDel', el).onclick = UI.deleteSelection; };

/* ---------- Arbeitsbereiche ---------- */
UI.setWS = (id) => {
  if (HSS.s3.tool) HSS.s3.setTool(null);
  UI.current = id;
  $$('#rail button[data-ws]').forEach(b => b.classList.toggle('on', b.dataset.ws === id));
  UI.renderPanel();
  HSS.emit('workspace', id);
};
UI.renderPanel = () => {
  const w = UI.ws[UI.current]; if (!w) return;
  const body = $('#panelBody'); const sc = body.scrollTop;
  body.innerHTML = `<div class="ph"><h2>${w.name}</h2></div>` + (w.lead ? `<p class="lead">${w.lead}</p>` : '') + '<div id="wsBody"></div>';
  try { w.render($('#wsBody')); } catch (e) { console.error(e); $('#wsBody').innerHTML = '<div class="errbox">' + U.esc(e.message) + '</div>'; }
  body.scrollTop = sc;
};
UI.buildRail = () => {
  const ic = {
    gelaende: '<path d="M2 19l6-8 4 5 3-4 7 7z"/><path d="M5 6h3M14 4l2 3"/>',
    gebaeude: '<rect x="4" y="6" width="9" height="15"/><rect x="13" y="10" width="7" height="11"/><path d="M7 9h3M7 12h3M7 15h3M15 13h3M15 16h3"/>',
    innen: '<path d="M3 4h18v16H3zM3 12h8v8M11 4v5M15 12h6"/>',
    bibliothek: '<rect x="4" y="5" width="5" height="15"/><rect x="10" y="3" width="4" height="17"/><path d="M15 6l4-1 3 14-4 1z"/>',
    station: '<rect x="3" y="7" width="18" height="12"/><path d="M12 9v8M8 13h8M8 4h8"/>',
    fluesse: '<path d="M3 7h12l-3-3M21 17H9l3 3"/><circle cx="18" cy="7" r="2"/><circle cx="6" cy="17" r="2"/>',
    simulation: '<circle cx="12" cy="12" r="9"/><path d="M10 8l6 4-6 4z"/>',
    analyse: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'
  };
  const r = $('#rail');
  r.innerHTML = Object.entries(UI.ws).map(([id, w], i) => `${w.sep ? '<hr>' : ''}<button data-ws="${id}" title="${U.esc(w.lead || w.name)}"><svg viewBox="0 0 24 24">${ic[id] || ''}</svg>${w.short || w.name}</button>`).join('');
  $$('#rail button').forEach(b => b.onclick = () => { if (UI.current === b.dataset.ws && !document.body.classList.contains('nopanel')) document.body.classList.add('nopanel'); else { document.body.classList.remove('nopanel'); UI.setWS(b.dataset.ws); } setTimeout(() => HSS.s3.resize(), 0); });
};

/* ---------- Ansichtsleiste ---------- */
UI.refreshViewbar = () => {
  const [lo, hi] = HSS.s3.floorRange(), V = HSS.view;
  let o = opt('', 'Außenansicht (alle)', V.floor ?? '');
  for (let g = hi; g >= lo; g--) o += opt(g, HSS.floorName(g) + ' (Schnitt)', V.floor ?? '');
  if ($('#vFloor')) $('#vFloor').innerHTML = o;
  $$('#vCut button').forEach(b => b.classList.toggle('on', b.dataset.v === V.cut));
  $('#vShell').value = V.shell; $('#vLabels').classList.toggle('on', V.labels);
};
UI.bindViewbar = () => {
  const S3 = HSS.s3, V = HSS.view;

  $$('#vCut button').forEach(b => b.onclick = () => { V.cut = b.dataset.v; UI.refreshViewbar(); S3.rebuild('all'); });
  $('#vShell').onchange = e => { V.shell = e.target.value; S3.rebuild('all'); };
  $('#vStil').value = HSS.stil?.mode || 'plan';
  $('#vStil').onchange = e => HSS.stil.set(e.target.value);
  $('#vWege').value = V.wege || 'alle';
  $('#vWege').onchange = e => { V.wege = e.target.value; try { localStorage.setItem('hss-wege', V.wege); } catch (er) { /* */ } S3.rebuild('outdoor'); };
  $('#vExplode').oninput = U.debounce(e => { V.explode = +e.target.value; S3.rebuild('all'); }, 80);
  $('#vSun').oninput = e => { const h = +e.target.value; $('#vSunL').textContent = U.hhmm(h * 60); S3.setSun(h); };
  $('#vNet').onchange = e => { UI.netMode = e.target.value; HSS.drawNet(UI.netMode, UI.heatHour ?? null); };
  $('#vLabels').onclick = () => { V.labels = !V.labels; UI.refreshViewbar(); S3.rebuild('all'); };
  $('#vGrid').onclick = () => { HSS.nav.setGrid(!HSS.nav.grid); $('#vGrid').classList.toggle('on', HSS.nav.grid); };
  $('#vM2').onclick = () => HSS.flaechen.toggle();
  $('#vWalk').onclick = () => HSS.fpv.walk();
  $('#vTour').onclick = () => HSS.tour.dialog();
  $('#vShot').onclick = () => { S3.beautyShot(2); UI.toast('Bild gespeichert (doppelte Auflösung)'); };
  $('#vHome').onclick = () => S3.home();
  $('#zIn').onclick = () => S3.zoom(0.7); $('#zOut').onclick = () => S3.zoom(1.4);
};
})();
