/* =====================================================================
   HSS · ausblenden.js – Gebäude gezielt aus- und einblenden (nur Darstellung)
   Schaltfläche „Gebäude ausblenden“ in der Ansichtsleiste, auch in der
   exportierten HTML-Ansicht:
   1. Erster Klick (noch keine Auswahl): Gebäude auswählen (Dialog).
   2. Danach blendet jeder Klick die gewählten Gebäude aus bzw. wieder ein.
   ⚙ daneben ändert die Auswahl. Auswahl und Zustand stehen im Projekt
   (settings.gebAus), werden mitgespeichert und in die HTML-Ansicht
   übernommen. Wegenetz, Flüsse und Simulation rechnen weiter mit allen
   Gebäuden.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const GA = HSS.gebAus = {};
const st = GA.state = () => HSS.view.gebAus || (HSS.view.gebAus = { ids: [], aktiv: false });
let fp = null;
// Menge der ausgeblendeten Gebäude (null, wenn nichts ausgeblendet ist)
GA.hidden = (prj = HSS.project()) => {
  const s = st(); if (!s.aktiv || !s.ids.length) { fp = null; return null; }
  const ids = new Set(s.ids), set = new Set(prj.buildings.filter(b => ids.has(b.id)).map(b => b.id));
  if (!set.size) { fp = null; return null; }
  const key = [...set].join('|') + '#' + prj.buildings.length;
  if (!fp || fp.key !== key) fp = { key, fps: prj.buildings.filter(b => set.has(b.id)).flatMap(b => b.parts.map(pt => { const o = HSS.partFootprint(pt).outer; return { o, bb: G.bbox(o) }; })) };
  return set;
};
// Freistehendes Objekt auf dem Dach eines ausgeblendeten Gebäudes (z. B. Hubschrauber auf dem Parkhaus)
GA.ueber = o => {
  if (!fp || o.host || o.yAbs === undefined || o.yAbs < 0.5) return false;
  return fp.fps.some(f => o.x >= f.bb.x0 && o.x <= f.bb.x1 && o.z >= f.bb.z0 && o.z <= f.bb.z1 && G.pointIn([o.x, o.z], f.o));
};
const anzahl = () => { const ids = new Set(st().ids); return HSS.project().buildings.filter(b => ids.has(b.id)).length; };
const merken = () => {
  const s = st(), prj = HSS.project(); prj.settings = prj.settings || {};
  prj.settings.gebAus = { ids: s.ids.slice(), aktiv: !!s.aktiv };
  if (!HSS.state.viewer) HSS.state.dirty = true;
};
GA.refresh = () => {
  const b = document.getElementById('vGebAus'); if (!b) return;
  const s = st(), n = anzahl(), an = s.aktiv && n > 0;
  b.classList.toggle('on', an);
  b.textContent = !n ? '🏢 Gebäude ausblenden …' : an ? `🏢 Gebäude einblenden (${n})` : `🏢 Gebäude ausblenden (${n})`;
  b.title = !n ? 'Zuerst festlegen, welche Gebäude ausgeblendet werden sollen' : an ? `${n} Gebäude sind ausgeblendet – klicken zum Einblenden` : `${n} festgelegte Gebäude ausblenden (⚙ ändert die Auswahl)`;
};
GA.set = aktiv => {
  const s = st(); s.aktiv = !!aktiv && anzahl() > 0;
  merken(); GA.refresh(); HSS.s3.rebuild('all');
  if (HSS.ui?.netMode && HSS.ui.netMode !== 'aus') HSS.drawNet(HSS.ui.netMode, HSS.ui.heatHour ?? null);
};
GA.toggle = () => {
  if (!anzahl()) return GA.dialog();
  const neu = !st().aktiv; GA.set(neu);
  HSS.ui.toast(neu ? `${anzahl()} Gebäude ausgeblendet – erneut klicken zum Einblenden` : 'Gebäude wieder eingeblendet', 2500);
};
GA.dialog = () => {
  const UI = HSS.ui, $ = UI.$, prj = HSS.project(), s = st(), sel = new Set(s.ids);
  const nr = b => String(b.kurz || b.name);
  const eigene = prj.buildings.filter(b => !b.umgebung && b.parts.length).sort((a, b) => nr(a).localeCompare(nr(b), 'de', { numeric: true }));
  const umg = prj.buildings.filter(b => b.umgebung && b.parts.length);
  const row = b => `<label class="chk" data-q="${U.esc(((b.kurz || '') + ' ' + b.name).toLowerCase())}"><input type="checkbox" data-ga="${U.esc(b.id)}" ${sel.has(b.id) ? 'checked' : ''}> <b class="hk" style="background:${U.esc(b.color || '#5A6573')}">${U.esc(b.kurz || '•')}</b> <span>${U.esc(b.name)}<span class="sub"> · ${b.parts.length} Bauteil${b.parts.length === 1 ? '' : 'e'}</span></span></label>`;
  const umgSel = umg.filter(b => sel.has(b.id)).length;
  UI.dialog(`<div class="dh"><h2>Gebäude ausblenden – Auswahl</h2><button class="x" data-close>×</button></div>
    <p>Gebäude wählen, die mit der Schaltfläche <b>„Gebäude ausblenden“</b> verschwinden sollen. Danach blendet jeder Klick auf die Schaltfläche diese Gebäude aus und wieder ein. Mit <b>⚙</b> daneben lässt sich die Auswahl jederzeit ändern.</p>
    <div class="row nw"><input type="search" id="gaQ" placeholder="Gebäude suchen (Name oder Kürzel) …"><button class="mini" id="gaAll" title="Alle sichtbaren Einträge wählen">alle</button><button class="mini" id="gaNone" title="Auswahl leeren">keine</button></div>
    <div class="galist" id="gaList"><h4>Klinikgebäude (${eigene.length})</h4>${eigene.map(row).join('') || '<p class="note">Keine Klinikgebäude im Projekt.</p>'}
    ${umg.length ? `<h4>Umgebungsbebauung aus OpenStreetMap (${umg.length})</h4><label class="chk"><input type="checkbox" id="gaUmg" ${umgSel ? 'checked' : ''}> <span>Umgebungsgebäude einzeln in der Liste zeigen${umgSel ? ` (${umgSel} gewählt)` : ''}</span></label><div id="gaUmgL" ${umgSel ? '' : 'hidden'}>${umg.map(row).join('')}</div>` : ''}</div>
    <p class="note" id="gaN"></p>
    <p class="note">Nur Darstellung: Wegenetz, Flüsse und Simulation rechnen weiter mit allen Gebäuden. Die Auswahl wird im Projekt gespeichert und in die HTML-Ansicht übernommen. Die gesamte Umgebungsbebauung lässt sich auch über „Umgebung: aus“ ausblenden.</p>
    <div class="actions"><button class="primary" id="gaSave">Auswahl speichern</button><button id="gaGo">Speichern und sofort ausblenden</button><button data-close>Abbrechen</button></div>`, d => {
    const boxes = () => [...d.querySelectorAll('[data-ga]')];
    const zahl = () => { const n = boxes().filter(c => c.checked).length; $('#gaN', d).textContent = n ? `${n} Gebäude gewählt.` : 'Noch kein Gebäude gewählt.'; };
    zahl(); d.querySelectorAll('[data-ga]').forEach(c => c.onchange = zahl);
    const sichtbar = c => { const l = c.closest('label'); return !l.hidden && !(l.parentElement.id === 'gaUmgL' && l.parentElement.hidden); };
    $('#gaQ', d).oninput = e => { const q = e.target.value.trim().toLowerCase(); d.querySelectorAll('#gaList label[data-q]').forEach(l => (l.hidden = !!q && !l.dataset.q.includes(q))); };
    $('#gaAll', d).onclick = () => { boxes().filter(sichtbar).forEach(c => (c.checked = true)); zahl(); };
    $('#gaNone', d).onclick = () => { boxes().forEach(c => (c.checked = false)); zahl(); };
    const um = $('#gaUmg', d); if (um) um.onchange = () => ($('#gaUmgL', d).hidden = !um.checked);
    const save = sofort => {
      s.ids = boxes().filter(c => c.checked).map(c => c.dataset.ga); d.close();
      if (!s.ids.length) { GA.set(false); UI.toast('Keine Gebäude zum Ausblenden festgelegt', 2500); return; }
      GA.set(sofort ? true : s.aktiv);
      UI.toast(sofort ? `${anzahl()} Gebäude ausgeblendet – Schaltfläche erneut klicken zum Einblenden` : `Auswahl gespeichert (${anzahl()} Gebäude) – „Gebäude ausblenden“ klicken zum Ausblenden`, 3500);
    };
    $('#gaSave', d).onclick = () => save(false);
    $('#gaGo', d).onclick = () => save(true);
  });
};
GA.bind = () => {
  const b = document.getElementById('vGebAus'), c = document.getElementById('vGebAusCfg');
  if (b) b.onclick = GA.toggle; if (c) c.onclick = GA.dialog;
  GA.refresh();
};
HSS.on('loaded', () => { const g = HSS.project().settings?.gebAus; HSS.view.gebAus = { ids: (g?.ids || []).slice(), aktiv: !!g?.aktiv }; GA.refresh(); });
HSS.on('changed', () => GA.refresh());
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', GA.bind); else GA.bind();
})();
