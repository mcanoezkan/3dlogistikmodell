/* =====================================================================
   HSS · flaechen.js – Flächenansicht (m²) nach DIN 277
   Räume werden nach Nutzungsgruppe eingefärbt und mit ihrer Fläche beschriftet.
   Das Flächenblatt zeigt je Etage die Bilanz (BGF, NUF 1–7, VF, TF, nicht belegt),
   je Gebäude die Summen über alle Geschosse und exportiert eine Raumliste als CSV.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const $ = s => document.querySelector(s);
const F = HSS.flaechen = { on: false, open: {} };

F.floorStats = (pt, f, prj = HSS.project()) => {
  const I = prj.interiors[pt.id]?.[f];
  const bgf = HSS.partArea(pt), rooms = [], by = {};
  for (const r of I?.rooms || []) {
    // Räume in Räumen (Nasszellen, Vorräume) werden vom umgebenden Raum abgezogen
    const a = HSS.roomArea(r), din = HSS.roomDin(r);
    rooms.push({ r, a, din });
  }
  for (const x of rooms) {
    const inner = rooms.filter(y => y !== x && Math.abs(y.r.x - x.r.x) <= (x.r.w - y.r.w) / 2 + 0.05 && Math.abs(y.r.z - x.r.z) <= (x.r.d - y.r.d) / 2 + 0.05 && x.a > y.a);
    x.netto = Math.max(0, x.a - U.sum(inner.map(y => y.a)));
  }
  for (const x of rooms) by[x.din] = (by[x.din] || 0) + x.netto;
  const nuf = U.sum(Object.entries(by).filter(([k]) => k.startsWith('NUF') ).map(([, v]) => v));
  const belegt = U.sum(Object.values(by));
  return { pt, f, gf: HSS.globalFloor(pt, f, prj), bgf, rooms, by, nuf, vf: by.VF || 0, tf: by.TF || 0, hof: by.AUSSEN || 0, reserve: U.sum(rooms.filter(x => x.r.use === 'reserve').map(x => x.netto)), frei: Math.max(0, bgf - belegt) };
};
F.bgfBuilding = b => U.sum(b.parts.map(pt => HSS.partArea(pt) * HSS.partFloors(pt).length));
F.buildingStats = (b, prj = HSS.project()) => {
  const floors = [];
  for (const pt of b.parts) for (const f of HSS.partFloors(pt)) floors.push(F.floorStats(pt, f, prj));
  const sum = k => U.sum(floors.map(x => x[k]));
  const by = {}; for (const x of floors) for (const [k, v] of Object.entries(x.by)) by[k] = (by[k] || 0) + v;
  return { b, floors, bgf: sum('bgf'), nuf: sum('nuf'), vf: sum('vf'), tf: sum('tf'), frei: sum('frei'), by, geplant: floors.filter(x => x.rooms.length).length };
};

const bar = (by, total) => {
  const keys = Object.keys(HSS.DIN277).filter(k => by[k] > 0.05);
  return `<div class="m2bar">${keys.map(k => `<i style="width:${(by[k] / total * 100).toFixed(2)}%;background:${HSS.DIN277[k].color}" title="${U.esc(HSS.DIN277[k].name)}: ${U.fmt(by[k])} m²"></i>`).join('')}</div>`;
};
const legend = () => `<div class="m2leg">${Object.entries(HSS.DIN277).map(([k, d]) => `<span><i style="background:${d.color}"></i>${U.esc(d.kurz)}</span>`).join('')}<span><i style="background:#fff;border:1px dashed #9aa3ad"></i>nicht belegt</span></div>`;

F.render = () => {
  let el = $('#m2Panel');
  if (!F.on) { if (el) el.hidden = true; document.body.classList.remove('m2'); return; }
  if (!el) { el = document.createElement('aside'); el.id = 'm2Panel'; document.body.appendChild(el); }
  el.hidden = false; document.body.classList.add('m2');
  const prj = HSS.project(), V = HSS.view;
  let html = `<div class="ih"><div><h2>Flächen (m²)</h2><div class="note">nach DIN 277 – Brutto-Grundfläche (BGF), Nutzungsfläche (NUF), Verkehrsfläche (VF), Technikfläche (TF)</div></div><button class="x" id="m2X" title="Flächenansicht schließen">×</button></div>${legend()}`;
  if (V.floor !== null) {
    const list = [];
    for (const b of prj.buildings) for (const pt of b.parts) { const f = HSS.localFloor(pt, V.floor); if (f !== null) list.push([b, F.floorStats(pt, f, prj)]); }
    const tot = { bgf: U.sum(list.map(x => x[1].bgf)), nuf: U.sum(list.map(x => x[1].nuf)), vf: U.sum(list.map(x => x[1].vf)), tf: U.sum(list.map(x => x[1].tf)) };
    html += `<h3>${U.esc(HSS.floorName(V.floor))} · Summe aller Bauteile</h3><div class="kpi m2k"><div><b>${U.fmt(tot.bgf)}</b><span>m² BGF</span></div><div><b>${U.fmt(tot.nuf)}</b><span>m² NUF</span></div><div><b>${U.fmt(tot.vf)}</b><span>m² VF</span></div><div><b>${tot.bgf ? U.pct(tot.nuf / tot.bgf) : '–'}</b><span>NUF/BGF</span></div></div>`;
    for (const [b, s] of list) {
      const open = F.open[s.pt.id + '|' + s.f] ?? s.rooms.length > 0;
      html += `<div class="m2part"><div class="m2h" data-tg="${s.pt.id}|${s.f}"><b>${U.esc(b.kurz || '')} ${U.esc(s.pt.name)}</b><span>${U.fmt(s.bgf)} m² BGF</span></div>${bar(Object.assign({}, s.by), s.bgf)}
        <table class="t m2t"><tr><td>Nutzungsfläche NUF</td><td class="n">${U.fmt(s.nuf, 1)}</td><td class="n">${s.bgf ? U.pct(s.nuf / s.bgf) : ''}</td></tr>
        ${Object.entries(s.by).filter(([k]) => k.startsWith('NUF')).sort().map(([k, v]) => `<tr class="sub"><td><i style="background:${HSS.DIN277[k].color}"></i>${U.esc(HSS.DIN277[k].name)}</td><td class="n">${U.fmt(v, 1)}</td><td></td></tr>`).join('')}
        <tr><td>Verkehrsfläche VF</td><td class="n">${U.fmt(s.vf, 1)}</td><td class="n">${s.bgf ? U.pct(s.vf / s.bgf) : ''}</td></tr><tr><td>Technikfläche TF</td><td class="n">${U.fmt(s.tf, 1)}</td><td></td></tr>${s.hof ? `<tr><td>Lichthof</td><td class="n">${U.fmt(s.hof, 1)}</td><td></td></tr>` : ''}
        <tr><td>nicht belegt / Konstruktion</td><td class="n">${U.fmt(s.frei, 1)}</td><td class="n">${s.bgf ? U.pct(s.frei / s.bgf) : ''}</td></tr>${s.reserve ? `<tr class="sub"><td>davon als Reserve ausgewiesen</td><td class="n">${U.fmt(s.reserve, 1)}</td><td></td></tr>` : ''}</table>
        ${open && s.rooms.length ? `<table class="t m2r"><tr><th>Raum</th><th class="n">B × T [m]</th><th class="n">m²</th></tr>${s.rooms.slice().sort((x, y) => (x.r.station || '').localeCompare(y.r.station || '') || x.din.localeCompare(y.din) || y.netto - x.netto).map(x => `<tr data-room="${x.r.id}" data-part="${s.pt.id}" data-f="${s.f}"><td><i style="background:${HSS.DIN277[x.din]?.color}"></i>${U.esc(x.r.name || HSS.ROOMTYPES[x.r.use]?.name || 'Raum')}</td><td class="n">${U.fmt(x.r.w, 2)} × ${U.fmt(x.r.d, 2)}</td><td class="n">${U.fmt(x.netto, 1)}</td></tr>`).join('')}</table>` : s.rooms.length ? `<button class="mini" data-tg="${s.pt.id}|${s.f}">${s.rooms.length} Räume anzeigen</button>` : '<p class="note">Noch keine Räume auf dieser Etage – Stationsplaner oder Arbeitsbereich „Etagen“ nutzen.</p>'}</div>`;
    }
    if (!list.length) html += '<p class="note">Auf dieser Etage gibt es keine Bauteile.</p>';
  } else {
    const all = prj.buildings.map(b => F.buildingStats(b, prj));
    const tb = U.sum(all.map(x => x.bgf));
    html += `<h3>Campus</h3><div class="kpi m2k"><div><b>${U.fmt(tb)}</b><span>m² BGF gesamt</span></div><div><b>${U.fmt(U.sum(all.map(x => x.nuf)))}</b><span>m² NUF geplant</span></div><div><b>${prj.buildings.length}</b><span>Gebäude</span></div></div>
      <p class="note">Etage wählen (Etagentasten links), um die Raumflächen zu sehen. Zeile anklicken springt zur Etage.</p>`;
    for (const s of all) {
      const open = F.open[s.b.id];
      html += `<div class="m2part"><div class="m2h" data-tg="${s.b.id}"><b>${U.esc(s.b.kurz || '')} ${U.esc(s.b.name)}</b><span>${U.fmt(s.bgf)} m² BGF</span></div>${bar(s.by, s.bgf)}
        <div class="note">${s.floors.length} Geschossflächen · ${s.geplant} mit Raumplanung · NUF ${U.fmt(s.nuf)} m² · VF ${U.fmt(s.vf)} m²</div>
        ${open ? `<table class="t m2r"><tr><th>Etage</th><th class="n">BGF</th><th class="n">NUF</th><th class="n">VF</th><th class="n">belegt</th></tr>${s.floors.sort((a, b) => b.gf - a.gf).map(x => `<tr data-gf="${x.gf}"><td>${U.esc(HSS.floorName(x.gf))}${s.b.parts.length > 1 ? ' · ' + U.esc(x.pt.name) : ''}</td><td class="n">${U.fmt(x.bgf)}</td><td class="n">${U.fmt(x.nuf)}</td><td class="n">${U.fmt(x.vf)}</td><td class="n">${x.bgf ? U.pct((x.bgf - x.frei) / x.bgf) : ''}</td></tr>`).join('')}</table>` : `<button class="mini" data-tg="${s.b.id}">Geschosse anzeigen</button>`}</div>`;
    }
  }
  html += `<div class="actions"><button id="m2Csv">Raumliste als CSV</button></div>`;
  el.innerHTML = html;
  $('#m2X').onclick = () => F.toggle(false);
  el.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => { const k = b.dataset.tg; F.open[k] = !(F.open[k] ?? (k.includes('|'))); F.render(); });
  el.querySelectorAll('[data-room]').forEach(tr => tr.onclick = () => HSS.s3.select({ kind: 'room', id: tr.dataset.room, part: tr.dataset.part, floor: +tr.dataset.f }, { focus: true }));
  el.querySelectorAll('[data-gf]').forEach(tr => tr.onclick = () => (HSS.nav?.setFloor ? HSS.nav.setFloor(+tr.dataset.gf) : HSS.s3.setFloor(+tr.dataset.gf)));
  $('#m2Csv').onclick = F.csv;
};
F.csv = () => {
  const prj = HSS.project(), rows = [['Gebäude', 'Bauteil', 'Etage', 'Raum', 'Raumtyp', 'DIN 277', 'Station', 'Breite m', 'Tiefe m', 'Fläche m²', 'BGF Etage m²']];
  for (const b of prj.buildings) for (const pt of b.parts) for (const f of HSS.partFloors(pt)) {
    const s = F.floorStats(pt, f, prj);
    for (const x of s.rooms) rows.push([b.name, pt.name, HSS.floorName(s.gf), x.r.name || '', HSS.ROOMTYPES[x.r.use]?.name || x.r.use, HSS.DIN277[x.din]?.kurz || x.din, prj.stations.find(st => st.id === x.r.station)?.name || '', U.fmt(x.r.w, 2), U.fmt(x.r.d, 2), U.fmt(x.netto, 2), U.fmt(s.bgf, 1)]);
  }
  const csv = '﻿' + rows.map(r => r.map(v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(';')).join('\n');
  U.download(`${(prj.meta?.name || 'projekt').replace(/[^\wäöüÄÖÜß-]+/g, '_')}_flaechen.csv`, csv, 'text/csv');
};
F.toggle = on => {
  F.on = on ?? !F.on; HSS.view.m2 = F.on;
  const b = $('#vM2'); if (b) b.classList.toggle('on', F.on);
  if (F.on && !HSS.view.labels) { HSS.view.labels = true; HSS.ui?.refreshViewbar?.(); }
  HSS.s3.rebuild('all'); F.render();
};
HSS.on?.('rebuilt', () => { if (F.on) F.render(); });
})();
