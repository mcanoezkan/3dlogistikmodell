/* =====================================================================
   HSS · einfaerben.js – Gebäude nach Funktionseinheiten einfärben
   Schaltfläche „🎨 Einfärben“ in der Ansichtsleiste (auch in der
   HTML-Ansicht). Funktionseinheiten haben Name, Farbe und Modus:
   „Dach“ färbt nur die Dachfläche (und Attika), „ganzes Gebäude“ auch
   die Fassade. Zugeordnet werden ganze Gebäude oder einzelne Bauteile
   (Inspektor des Bauteils). Eine Legende zeigt die Einheiten; Klick auf
   einen Eintrag zeigt die zugehörigen Gebäude. Gespeichert wird im
   Projekt unter settings.funktionseinheiten. Nur Darstellung.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, { THREE } = window.THREEX;
const FE = HSS.fe = {};
const FARBEN = ['#e4572e', '#2e86ab', '#f2a541', '#6a994e', '#8e5ea2', '#d1495b', '#00a6a6', '#7d5a50', '#3d5a80', '#c9a227'];
const MODI = { dach: 'nur Dach', gebaeude: 'ganzes Gebäude' };
FE.cfg = (prj = HSS.project()) => prj?.settings?.funktionseinheiten || null;
FE.ensure = (prj = HSS.project()) => { prj.settings = prj.settings || {}; const c = prj.settings.funktionseinheiten || (prj.settings.funktionseinheiten = { aktiv: false, liste: [] }); c.liste = c.liste || []; return c; };
// Wirksame Einfärbung eines Bauteils (Bauteil-Zuordnung vor Gebäude-Zuordnung)
FE.unit = (pt, b, prj = HSS.project()) => { const c = FE.cfg(prj); if (!c?.liste?.length) return null; return c.liste.find(e => (e.bauteile || []).includes(pt.id)) || c.liste.find(e => (e.gebaeude || []).includes(b.id)) || null; };
FE.of = (pt, b, prj = HSS.project()) => {
  const c = FE.cfg(prj); if (!c || !c.aktiv) return null;
  const e = FE.unit(pt, b, prj); if (!e || e.aus) return null;
  return { id: e.id, name: e.name, farbe: e.farbe || '#e4572e', modus: e.modus === 'gebaeude' ? 'gebaeude' : 'dach' };
};
FE.key = (pt, b, prj) => { const f = FE.of(pt, b, prj); return f ? f.farbe + '|' + f.modus : ''; };
const viewer = () => !!HSS.state.viewer;
// Änderung übernehmen: im Editor rückgängig machbar, in der HTML-Ansicht nur Darstellung
FE.aendern = (label, fn) => {
  if (viewer() || HSS.state.demoReadonly) { fn(HSS.project()); HSS.s3.rebuild('all'); FE.refresh(); return; }
  HSS.change(label, prj => fn(prj), { scope: 'all' });
  FE.refresh();
};
const gebaeudeVon = e => { const prj = HSS.project(), ids = new Set(e.gebaeude || []), pts = new Set(e.bauteile || []); return { geb: prj.buildings.filter(b => ids.has(b.id)), teile: prj.buildings.flatMap(b => b.parts.filter(p => pts.has(p.id)).map(p => ({ b, p }))) }; };
const anzahl = e => { const g = gebaeudeVon(e); return g.geb.length + g.teile.length; };

/* ---------- Schaltfläche und Legende ---------- */
FE.refresh = () => {
  const btn = document.getElementById('vFE'), c = FE.cfg(), n = c?.liste?.length || 0, an = !!(c?.aktiv && n);
  if (btn) {
    btn.classList.toggle('on', an);
    btn.textContent = !n ? '🎨 Einfärben …' : an ? `🎨 Einfärbung aus (${n})` : `🎨 Einfärben (${n})`;
    btn.title = !n ? 'Funktionseinheiten festlegen und Gebäude einfärben (Dach oder ganzes Gebäude)' : an ? 'Einfärbung ausblenden' : `${n} Funktionseinheit${n === 1 ? '' : 'en'} einfärben (⚙ ändert sie)`;
  }
  legende(an ? c : null);
};
function legende(c) {
  let el = document.getElementById('feLegend');
  if (!c) { if (el) el.hidden = true; return; }
  if (!el) {
    el = document.createElement('div'); el.id = 'feLegend'; document.body.appendChild(el);
    el.addEventListener('pointerdown', e => e.stopPropagation());
  }
  const rows = c.liste.map(e => `<div class="fer${e.aus ? ' off' : ''}" data-fe="${U.esc(e.id)}" title="Klick: zugehörige Gebäude zeigen · Auge: Einheit aus-/einblenden">
      <span class="sw ${e.modus === 'gebaeude' ? 'g' : 'd'}" style="background:${U.esc(e.farbe)}"></span><span class="nm">${U.esc(e.name || 'Funktionseinheit')}</span><span class="ct">${anzahl(e)}</span><button class="eye" data-eye="${U.esc(e.id)}">${e.aus ? '◌' : '◉'}</button></div>`).join('');
  el.innerHTML = `<div class="feh"><b>Funktionseinheiten</b><button id="feLegCfg" title="Bearbeiten">⚙</button></div>${rows || '<div class="note">Noch keine Funktionseinheit.</div>'}<div class="fen">▀ nur Dach · █ ganzes Gebäude</div>`;
  el.hidden = false;
  el.querySelectorAll('[data-fe]').forEach(r => r.onclick = ev => { if (ev.target.closest('[data-eye]')) return; FE.zeige(r.dataset.fe); });
  el.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => FE.aendern('Funktionseinheit ein-/ausblenden', prj => { const e = FE.ensure(prj).liste.find(x => x.id === b.dataset.eye); if (e) e.aus = !e.aus; }));
  el.querySelector('#feLegCfg').onclick = FE.dialog;
  lage();
}
function lage() {
  const el = document.getElementById('feLegend'); if (!el || el.hidden) return;
  const vb = document.getElementById('viewbar'), p2 = document.getElementById('plan2dBar');
  let top = vb ? vb.getBoundingClientRect().bottom + 8 : 120;
  if (p2 && !p2.hidden) top = Math.max(top, p2.getBoundingClientRect().bottom + 8);
  el.style.top = Math.round(top) + 'px';
}
window.addEventListener('resize', lage);
HSS.on('view', () => setTimeout(lage, 0));
FE.zeige = id => {
  const c = FE.cfg(), e = c?.liste.find(x => x.id === id); if (!e) return;
  const g = gebaeudeVon(e), box = new THREE.Box3();
  for (const b of g.geb) for (const pt of b.parts) for (const [x, z] of HSS.partFootprint(pt).outer) box.expandByPoint(new THREE.Vector3(x, HSS.partTopY(pt), z));
  for (const { p } of g.teile) for (const [x, z] of HSS.partFootprint(p).outer) box.expandByPoint(new THREE.Vector3(x, HSS.partTopY(p), z));
  if (box.isEmpty()) return HSS.ui.toast(`„${e.name}“ ist noch kein Gebäude zugeordnet – ⚙ öffnen oder im Inspektor eines Gebäudes zuordnen`, 3500);
  HSS.s3.focusBox(box);
  HSS.ui.toast(`${e.name}: ${[...g.geb.map(b => b.kurz ? `Haus ${b.kurz}` : b.name), ...g.teile.map(({ b, p }) => `${b.kurz || b.name} · ${p.name}`)].join(', ')}`, 3500);
};
FE.toggle = () => {
  const c = FE.cfg();
  if (!c?.liste?.length) return FE.dialog();
  FE.aendern(c.aktiv ? 'Einfärbung aus' : 'Einfärbung an', prj => { const k = FE.ensure(prj); k.aktiv = !k.aktiv; });
};

/* ---------- Dialog ---------- */
FE.dialog = () => {
  const UI = HSS.ui, $ = UI.$, prj = HSS.project();
  const arbeit = U.clone(FE.ensure(prj)); // Entwurf, wird erst beim Speichern übernommen
  if (!arbeit.liste.length) arbeit.liste.push({ id: U.uid('fe'), name: 'Funktionseinheit A', farbe: FARBEN[0], modus: 'dach', gebaeude: [], bauteile: [] });
  const sel = HSS.state.selection, selP = sel?.kind === 'part' ? HSS.findPart(sel.id) : null;
  const nr = b => String(b.kurz || b.name);
  const eigene = prj.buildings.filter(b => !b.umgebung && b.parts.length).sort((a, b) => nr(a).localeCompare(nr(b), 'de', { numeric: true }));
  let offen = null;
  UI.dialog(`<div class="dh"><h2>Gebäude einfärben – Funktionseinheiten</h2><button class="x" data-close>×</button></div>
    <p>Jede Funktionseinheit bekommt eine Farbe. <b>Nur Dach</b> färbt die Dachfläche, <b>ganzes Gebäude</b> zusätzlich die Fassade. Gebäude hier zuordnen oder im Inspektor eines Bauteils (dort auch einzelne Bauteile).</p>
    <div id="feRows"></div>
    <div class="row"><button id="feAdd">＋ Funktionseinheit</button>${selP ? `<span class="note">Ausgewählt: <b>${U.esc(selP.building.kurz || '')} ${U.esc(selP.building.name)}</b></span>` : ''}</div>
    <div id="feGeb" hidden></div>
    <label class="chk"><input type="checkbox" id="feAn" ${arbeit.aktiv || !FE.cfg()?.liste?.length ? 'checked' : ''}> Einfärbung im 3D-Bild anzeigen</label>
    <p class="note">Nur Darstellung. Wird im Projekt gespeichert und in die HTML-Ansicht übernommen.</p>
    <div class="actions"><button class="primary" id="feSave">Übernehmen</button><button data-close>Abbrechen</button></div>`, d => {
    const rowsEl = $('#feRows', d), gebEl = $('#feGeb', d);
    const zeilen = () => {
      rowsEl.innerHTML = arbeit.liste.map((e, i) => `<div class="ferow" data-i="${i}">
        <input type="color" data-k="farbe" value="${U.esc(e.farbe)}" title="Farbe">
        <input type="text" data-k="name" value="${U.esc(e.name)}" placeholder="Name, z. B. Funktionseinheit A">
        <select data-k="modus">${Object.entries(MODI).map(([k, v]) => `<option value="${k}" ${(e.modus || 'dach') === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <button data-geb="${i}" class="${offen === i ? 'on' : ''}" title="Gebäude zuordnen">Gebäude (${anzahl(e)}) ▾</button>
        ${selP ? `<button data-add="${i}" title="Ausgewähltes Gebäude dieser Einheit zuordnen">＋ Auswahl</button>` : ''}
        <button data-del="${i}" class="danger" title="Funktionseinheit löschen">🗑</button></div>`).join('');
      rowsEl.querySelectorAll('[data-k]').forEach(inp => inp.oninput = inp.onchange = () => { const e = arbeit.liste[+inp.closest('[data-i]').dataset.i]; e[inp.dataset.k] = inp.value; });
      rowsEl.querySelectorAll('[data-geb]').forEach(b => b.onclick = () => { offen = offen === +b.dataset.geb ? null : +b.dataset.geb; zeilen(); auswahl(); });
      rowsEl.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { arbeit.liste.splice(+b.dataset.del, 1); offen = null; zeilen(); auswahl(); });
      rowsEl.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { zuordnen(arbeit, arbeit.liste[+b.dataset.add], selP.building.id); zeilen(); auswahl(); });
    };
    const auswahl = () => {
      if (offen === null || !arbeit.liste[offen]) { gebEl.hidden = true; return; }
      const e = arbeit.liste[offen], ids = new Set(e.gebaeude || []);
      const andere = id => arbeit.liste.find(x => x !== e && (x.gebaeude || []).includes(id));
      gebEl.hidden = false;
      gebEl.innerHTML = `<h4>Gebäude für „${U.esc(e.name)}“</h4><div class="row nw"><input type="search" id="feQ" placeholder="Gebäude suchen …"></div><div class="galist">${eigene.map(b => { const o = andere(b.id); return `<label class="chk" data-q="${U.esc(((b.kurz || '') + ' ' + b.name).toLowerCase())}"><input type="checkbox" data-gb="${U.esc(b.id)}" ${ids.has(b.id) ? 'checked' : ''}> <b class="hk" style="background:${U.esc(b.color || '#5A6573')}">${U.esc(b.kurz || '•')}</b> <span>${U.esc(b.name)}${o ? `<span class="sub"> · jetzt bei ${U.esc(o.name)}</span>` : ''}</span></label>`; }).join('')}</div>`;
      gebEl.querySelectorAll('[data-gb]').forEach(cb => cb.onchange = () => { if (cb.checked) zuordnen(arbeit, e, cb.dataset.gb); else e.gebaeude = (e.gebaeude || []).filter(x => x !== cb.dataset.gb); zeilen(); });
      $('#feQ', gebEl).oninput = ev => { const q = ev.target.value.trim().toLowerCase(); gebEl.querySelectorAll('label[data-q]').forEach(l => (l.hidden = !!q && !l.dataset.q.includes(q))); };
    };
    $('#feAdd', d).onclick = () => { const n = arbeit.liste.length; arbeit.liste.push({ id: U.uid('fe'), name: 'Funktionseinheit ' + String.fromCharCode(65 + (n % 26)), farbe: FARBEN[n % FARBEN.length], modus: 'dach', gebaeude: [], bauteile: [] }); offen = n; zeilen(); auswahl(); };
    zeilen(); auswahl();
    $('#feSave', d).onclick = () => {
      const an = $('#feAn', d).checked; d.close();
      FE.aendern('Funktionseinheiten', p => { const c = FE.ensure(p); c.liste = arbeit.liste.map(e => Object.assign({}, e, { name: (e.name || '').trim() || 'Funktionseinheit' })); c.aktiv = an && c.liste.length > 0; });
      UI.toast(an ? 'Gebäude eingefärbt – Legende oben links, Klick auf einen Eintrag zeigt die Gebäude' : 'Funktionseinheiten gespeichert', 3500);
    };
  });
};
// Ein Gebäude gehört zu höchstens einer Funktionseinheit
function zuordnen(c, e, bid) { for (const x of c.liste) x.gebaeude = (x.gebaeude || []).filter(id => id !== bid); e.gebaeude = (e.gebaeude || []).concat([bid]); }

/* ---------- Inspektor des Bauteils: Zuordnung ---------- */
const UI0 = HSS.ui, INSP = UI0.INSP, BIND = UI0.INSP_BIND;
if (INSP?.part && BIND?.part) {
  const html0 = INSP.part, bind0 = BIND.part;
  INSP.part = s => {
    let h = html0(s); if (!h) return h;
    const P = HSS.findPart(s.id); if (!P) return h;
    const c = FE.cfg(), liste = c?.liste || [];
    const ePt = liste.find(e => (e.bauteile || []).includes(P.part.id)), eB = liste.find(e => (e.gebaeude || []).includes(P.building.id));
    const o = (v, t, on) => `<option value="${U.esc(v)}" ${on ? 'selected' : ''}>${U.esc(t)}</option>`;
    const box = `<h3>Funktionseinheit (Einfärben)</h3><div class="fg pf">
      <label class="f full"><span>Gebäude gehört zu</span><select id="feB">${o('', '– keine –', !eB)}${liste.map(e => o(e.id, e.name, eB === e)).join('')}${o('__neu', '＋ neue Funktionseinheit …', false)}</select></label>
      <label class="f full"><span>Nur dieses Bauteil</span><select id="fePt">${o('', 'wie Gebäude', !ePt)}${liste.map(e => o(e.id, e.name, ePt === e)).join('')}</select></label></div>
      <div class="note">${liste.length ? `Farbe und Modus (Dach / ganzes Gebäude) unter <a href="#" id="feCfg">🎨 ⚙ Funktionseinheiten</a>.${c?.aktiv ? '' : ' Einfärbung ist zurzeit ausgeblendet.'}` : 'Noch keine Funktionseinheit – „＋ neue Funktionseinheit“ wählen.'}</div>`;
    const k = h.indexOf('<h3>Form &amp; Größe</h3>');
    return k > 0 ? h.slice(0, k) + box + h.slice(k) : h + box;
  };
  BIND.part = (el, s) => {
    bind0(el, s);
    const fb = el.querySelector('#feB'), fp = el.querySelector('#fePt'), cfg = el.querySelector('#feCfg');
    if (cfg) cfg.onclick = ev => { ev.preventDefault(); FE.dialog(); };
    if (fb) fb.onchange = async () => {
      let id = fb.value; const P = HSS.findPart(s.id); if (!P) return;
      let neu = null;
      if (id === '__neu') {
        const n = FE.cfg()?.liste?.length || 0;
        const name = await HSS.ui.prompt('Name der Funktionseinheit', 'Funktionseinheit ' + String.fromCharCode(65 + (n % 26))); if (!name) { HSS.ui.inspector(); return; }
        neu = { id: U.uid('fe'), name, farbe: FARBEN[n % FARBEN.length], modus: 'dach', gebaeude: [], bauteile: [] }; id = neu.id;
      }
      FE.aendern('Funktionseinheit zuordnen', prj => {
        const c = FE.ensure(prj); if (neu) c.liste.push(neu);
        for (const e of c.liste) e.gebaeude = (e.gebaeude || []).filter(x => x !== P.building.id);
        const e = c.liste.find(x => x.id === id); if (e) { e.gebaeude.push(P.building.id); c.aktiv = true; }
      });
    };
    if (fp) fp.onchange = () => {
      const id = fp.value;
      FE.aendern('Funktionseinheit Bauteil', prj => {
        const c = FE.ensure(prj);
        for (const e of c.liste) e.bauteile = (e.bauteile || []).filter(x => x !== s.id);
        const e = c.liste.find(x => x.id === id); if (e) { e.bauteile = (e.bauteile || []).concat([s.id]); c.aktiv = true; }
      });
    };
  };
}

FE.bind = () => {
  const b = document.getElementById('vFE'), c = document.getElementById('vFECfg');
  if (b) b.onclick = FE.toggle; if (c) c.onclick = FE.dialog;
  FE.refresh();
};
HSS.on('loaded', () => FE.refresh());
HSS.on('changed', () => FE.refresh());
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', FE.bind); else FE.bind();
})();