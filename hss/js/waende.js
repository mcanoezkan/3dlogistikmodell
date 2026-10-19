/* =====================================================================
   HSS · waende.js – Wände von Flächen und Räumen einzeln bearbeiten
   Flächen (Flächenplanung, Standortflächen) haben zunächst keine Wände.
   „Wände anlegen“ erzeugt aus dem Umriss einzelne Wandsegmente. Danach:
     · Wand anklicken → nur diese Wand ist gewählt (nicht die ganze Fläche)
     · Wand ziehen → sie verschiebt sich senkrecht zu sich selbst, angrenzende
       Wände gehen mit
     · Türen, Bettentüren und Öffnungen (ohne Türblatt) per Knopf oder per
       Klick auf die Wand an genau der Stelle setzen; Lage und Breite änderbar
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$, $$ = UI.$$;
const WD = HSS.waende = {};
const roomOf = (s, p = HSS.project()) => HSS.interior(s.part, s.floor, false, p)?.rooms.find(x => x.id === s.id);
// Umriss eines Raums / einer Fläche in Bauteil-Koordinaten
WD.umriss = (pt, r) => {
  if (r.zone && r.zf && HSS.zoneGeom) return HSS.zoneGeom(pt, r.zf).poly;
  if (r.poly?.length > 2) return r.poly;
  return [[r.x - r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z - r.d / 2], [r.x + r.w / 2, r.z + r.d / 2], [r.x - r.w / 2, r.z + r.d / 2]];
};
WD.hat = s => !!HSS.interior(s.part, s.floor)?.walls.some(w => w.zu === s.id);
WD.anlegen = s => {
  HSS.change('Wände anlegen', p => {
    const I = HSS.interior(s.part, s.floor, true, p), r = roomOf(s, p), pt = HSS.findPart(s.part, p).part; if (!r) return;
    const P = WD.umriss(pt, r).map(q => [Math.round(q[0] * 100) / 100, Math.round(q[1] * 100) / 100]);
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; if (G.dist(a, b) > 0.2) I.walls.push({ id: U.uid('w'), a: a.slice(), b: b.slice(), t: 0.15, zu: r.id }); }
  });
  UI.toast('Wände angelegt – eine Wand anklicken, um sie zu verschieben oder Türen und Öffnungen zu setzen', 4500);
};
WD.entfernen = s => HSS.change('Wände entfernen', p => { const I = HSS.interior(s.part, s.floor, false, p); const ids = new Set(I.walls.filter(w => w.zu === s.id).map(w => w.id)); I.walls = I.walls.filter(w => !ids.has(w.id)); I.doors = I.doors.filter(d => !ids.has(d.wall)); });
const block = s => `<div class="wdblk"><b>Wände</b>${WD.hat(s) ? '<div class="note">Wand anklicken: verschieben, Türen und Öffnungen setzen.</div><div class="actions"><button id="wdAus">Wände entfernen</button></div>' : '<div class="note">Für Öffnungen und Türen zuerst Wände aus dem Umriss anlegen – danach ist jede Wand einzeln wählbar.</div><div class="actions"><button class="primary" id="wdAn">▦ Wände anlegen</button></div>'}</div>`;
const bindBlock = (el, s) => { const a = $('#wdAn', el), b = $('#wdAus', el); if (a) a.onclick = () => WD.anlegen(s); if (b) b.onclick = () => WD.entfernen(s); };

// Raum-/Flächen-Inspektor um den Wandblock ergänzen
const R0 = UI.INSP.room, RB0 = UI.INSP_BIND.room;
UI.INSP.room = s => { const h = R0(s); if (!h) return h; const r = roomOf(s); return r && (r.zone || r.noWalls || WD.hat(s)) ? h + block(s) : h; };
UI.INSP_BIND.room = (el, s) => { RB0(el, s); bindBlock(el, s); };

// Wand-Inspektor: Türen/Öffnungen mit Lage und Breite, per Klick setzen
const ARTEN = [['erschl.tuer.1', 'Tür 1,10 m', 1.1], ['erschl.tuer.bett', 'Bettentür 1,50 m', 1.5], ['offen', 'Öffnung (ohne Tür)', 2.0]];
UI.INSP.wall = s => {
  const I = HSS.interior(s.part, s.floor); const w = I?.walls.find(x => x.id === s.id); if (!w) return '';
  const len = G.dist(w.a, w.b), doors = I.doors.filter(d => d.wall === w.id);
  const art = d => ARTEN.find(a => a[0] === (d.lib || 'erschl.tuer.1'))?.[1].split(' ')[0] || 'Tür';
  return `<div class="ih"><div><div class="kicker">Wand${w.zu ? ' · Fläche' : ''}</div><h2>Wand ${U.fmt(len, 2)} m</h2></div><button class="x" title="Auswahl aufheben (Esc)">×</button></div>
  <div class="note">Wand im 3D-Bild <b>ziehen</b>, um nur diese Wand zu verschieben (angrenzende Wände gehen mit; Umschalt: 5-cm-Schritte).</div>
  <div class="fg">${UI.fNum('Wanddicke', 't', w.t || 0.15, { unit: 'm', step: 0.01 })}</div>
  <h4 style="margin:10px 0 4px">Türen und Öffnungen (${doors.length})</h4>
  ${doors.map(d => `<div class="wdrow" data-d="${d.id}"><span>${art(d)}</span><label>Lage <input type="number" data-dt min="0" max="${U.fmt(len, 2).replace(',', '.')}" step="0.1" value="${Math.round(d.t * len * 10) / 10}"> m</label><label>Breite <input type="number" data-dw min="0.6" max="${Math.max(1, Math.floor(len))}" step="0.1" value="${d.w}"> m</label><button class="mini danger" data-dd title="entfernen">×</button></div>`).join('') || '<div class="note">Noch keine.</div>'}
  <div class="actions">${ARTEN.map(([lib, t, b]) => `<button data-add="${lib}|${b}" title="In der Wandmitte einsetzen">+ ${t}</button>`).join('')}</div>
  <div class="actions"><button class="primary" id="wdKlick" title="Danach auf die Wand an der gewünschten Stelle klicken">⌖ Per Klick auf die Wand setzen</button><button class="danger" id="iDel">Wand löschen</button></div>`;
};
UI.INSP_BIND.wall = (el, s) => {
  UI.bind(el, prj => HSS.interior(s.part, s.floor, false, prj)?.walls.find(x => x.id === s.id), 'Wand');
  const I = () => HSS.interior(s.part, s.floor), w = () => I().walls.find(x => x.id === s.id), len = () => G.dist(w().a, w().b);
  $$('[data-add]', el).forEach(b => b.onclick = () => { const [lib, br] = b.dataset.add.split('|'); HSS.change('Öffnung einsetzen', prj => HSS.interior(s.part, s.floor, false, prj).doors.push({ id: U.uid('d'), wall: s.id, t: 0.5, w: Math.min(+br, len() - 0.2), lib })); });
  $$('.wdrow', el).forEach(row => {
    const id = row.dataset.d;
    $('[data-dt]', row).onchange = e => HSS.change('Lage der Öffnung', prj => { const d = HSS.interior(s.part, s.floor, false, prj).doors.find(x => x.id === id); d.t = U.clamp(+e.target.value / len(), 0, 1); });
    $('[data-dw]', row).onchange = e => HSS.change('Breite der Öffnung', prj => { const d = HSS.interior(s.part, s.floor, false, prj).doors.find(x => x.id === id); d.w = Math.max(0.6, +e.target.value); });
    $('[data-dd]', row).onclick = () => HSS.change('Öffnung entfernen', prj => { const J = HSS.interior(s.part, s.floor, false, prj); J.doors = J.doors.filter(d => d.id !== id); });
  });
  $('#wdKlick', el).onclick = () => {
    let art = ARTEN[0];
    HSS.s3.setTool({
      name: 'oeffnung',
      move(ev) { const h = HSS.s3.pick(ev); HSS.s3.renderer.domElement.style.cursor = h?.kind === 'wall' ? 'copy' : 'crosshair'; },
      click(ev) {
        const h = HSS.s3.pick(ev); if (h?.kind !== 'wall') return UI.toast('Auf eine Wand klicken');
        const P = HSS.findPart(h.part), J = HSS.interior(h.part, h.floor), ww = J.walls.find(x => x.id === h.id);
        const c = G.closestOnSeg(HSS.toLocal(P.part, [h.point.x, h.point.z]), ww.a, ww.b);
        HSS.change('Öffnung einsetzen', prj => HSS.interior(h.part, h.floor, false, prj).doors.push({ id: U.uid('d'), wall: ww.id, t: c.t, w: Math.min(art[2], G.dist(ww.a, ww.b) - 0.2), lib: art[0] }));
      },
      key(ev) { const k = { '1': 0, '2': 1, '3': 2 }[ev.key]; if (k !== undefined) { art = ARTEN[k]; UI.hint(hinweis()); return true; } return false; },
      cancel() { UI.hint(null); }
    });
    const hinweis = () => `<b>${art[1]}</b> per Klick auf eine Wand setzen · Taste 1 Tür · 2 Bettentür · 3 Öffnung · Esc: fertig`;
    UI.hint(hinweis());
  };
  $('#iDel', el).onclick = UI.deleteSelection;
};
})();
