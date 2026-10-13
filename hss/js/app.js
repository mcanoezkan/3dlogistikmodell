/* =====================================================================
   HSS · app.js – Start, Kopfzeile, Projekt öffnen/speichern, Hilfe
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, UI = HSS.ui, $ = UI.$, $$ = UI.$$;

function boot() {
  HSS.s3.init($('#viewport'));
  HSS.nav.init();
  UI.buildRail(); UI.bindViewbar(); UI.timeline.bind();
  bindHeader();
  HSS.on('changed', e => {
    if (e.scope !== 'none') HSS.s3.rebuild(e.scope === 'objects' ? 'objects' : e.scope === 'outdoor' ? 'outdoor' : 'all');
    UI.inspector(); UI.refreshViewbar(); refreshHeader();
    if (UI.netMode && UI.netMode !== 'aus') HSS.drawNet(UI.netMode, UI.heatHour ?? null);
    if (!/^(Fluss|Material|Fuhrpark|Regel|Zeitfenster)/.test(e.label || '')) UI.renderPanel();
  });
  HSS.on('selection', () => { UI.inspector(); if (['gebaeude', 'gelaende'].includes(UI.current)) UI.renderPanel(); });
  HSS.on('view', () => { UI.refreshViewbar(); if (UI.current === 'innen') UI.renderPanel(); });
  HSS.on('loaded', e => { HSS.state.sim = null; HSS.player.clear(); UI.timeline.show(false); if (!e.demo) { $('#demoCard').hidden = true; document.body.classList.remove('demoon'); } setTimeout(() => HSS.s3.home(), 50); });
  HSS.on('tool', t => { if (!t) UI.hint(null); });
  HSS.on('library', U.debounce(() => { if (UI.current === 'bibliothek') UI.renderPanel(); }, 100));
  HSS.on('library-model', U.debounce(() => HSS.s3.rebuild('objects'), 200));
  UI.setWS('gebaeude');
  HSS.library.loadUserObjects();
  const auto = HSS.autosaved();
  let restored = false;
  if (auto) { try { HSS.load(auto, { noAutosave: true }); restored = true; } catch (e) { console.warn(e); } }
  if (!restored) { HSS.s3.rebuild('all'); HSS.s3.home(); }
  refreshHeader(); UI.refreshViewbar();
  $('#loading').hidden = true;
  if (restored && HSS.project().buildings.length) UI.toast(`Zuletzt bearbeitet: „${HSS.project().meta.name}“ wiederhergestellt`, 3500);
  else welcome();
}

function refreshHeader() {
  const p = HSS.project();
  $('#prjName').textContent = p.meta.name;
  $('#bUndo').disabled = !HSS.canUndo(); $('#bRedo').disabled = !HSS.canRedo();
  if (!document.body.classList.contains('demoon')) { $('#saveState').textContent = HSS.state.dirty ? 'nicht gespeichert' : 'gesichert'; $('#saveState').className = 'badge' + (HSS.state.dirty ? ' dirty' : ''); }
}
function bindHeader() {
  $('#bNew').onclick = async () => { if (HSS.project().buildings.length && !await UI.confirm('Neues Projekt', 'Das aktuelle Projekt bleibt in der Projektablage des Browsers erhalten.', 'Neues Projekt')) return; const n = await UI.prompt('Name des Projekts', 'Neues Krankenhausprojekt'); if (n === null) return; HSS.load(HSS.newProject(n || 'Neues Projekt')); UI.setWS('gelaende'); };
  $('#bOpen').onclick = openDialog;
  $('#bSave').onclick = saveDialog;
  $('#fOpen').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const p = await HSS.storage.importFile(f); HSS.load(p); UI.toast('Projekt geladen: ' + p.meta.name); } catch (err) { UI.dialog(`<h2>Datei nicht lesbar</h2><div class="errbox">${U.esc(err.message)}</div><div class="actions"><button data-close>OK</button></div>`); } e.target.value = ''; };
  $('#bUndo').onclick = () => { const l = HSS.undo(); if (l) UI.toast(l); };
  $('#bRedo').onclick = () => { const l = HSS.redo(); if (l) UI.toast(l); };
  $('#bDemo').onclick = () => HSS.demo.start();
  $('#bHelp').onclick = help;
  $('#prjName').onclick = async () => { const n = await UI.prompt('Projekt umbenennen', HSS.project().meta.name); if (n) HSS.change('Umbenennen', p => (p.meta.name = n), { scope: 'none' }); };
  window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveDialog(); } });
}
async function saveDialog() {
  let ok = true; try { await HSS.storage.saveProject(); } catch (e) { ok = false; }
  refreshHeader();
  UI.dialog(`<div class="dh"><h2>Projekt speichern</h2><button class="x" data-close>×</button></div>
   ${ok ? '<div class="okbox">In der Projektablage dieses Browsers gespeichert.</div>' : '<div class="warnbox">Browser-Ablage nicht verfügbar – bitte als Datei speichern.</div>'}
   <p>Für Weitergabe, Archiv oder anderen Rechner als Datei speichern. Die Datei enthält das komplette Modell (Gebäude, Gelände, Innenausbau, Flüsse, Regeln, Stationen) und alle verwendeten eigenen Bibliotheksobjekte.</p>
   <div class="actions"><button class="primary" id="sFile">Als Datei herunterladen (.hss.json)</button><button data-close>Schließen</button></div>`, d => { $('#sFile', d).onclick = () => { HSS.storage.exportFile(); d.close(); refreshHeader(); }; });
}
async function openDialog() {
  let list = []; try { list = await HSS.storage.listProjects(); } catch (e) { /* */ }
  UI.dialog(`<div class="dh"><h2>Projekt öffnen</h2><button class="x" data-close>×</button></div>
   <div class="actions" style="margin-top:0"><button class="primary" id="oFile">Datei wählen (.hss.json)</button><button id="oDemo">UNITY Hospital (Demo)</button><button id="oSite">Standortmodelle: Koblenz, Hanau</button></div>
   <h3>Projektablage im Browser</h3>
   <table class="t"><tr><th>Projekt</th><th>zuletzt geändert</th><th class="n">Größe</th><th></th></tr>${list.map(p => `<tr><td><a href="#" data-open="${p.id}">${U.esc(p.name)}</a></td><td>${new Date(p.modified).toLocaleString('de-DE')}</td><td class="n">${U.fmt(p.size / 1024)} kB</td><td><button class="mini danger" data-del="${p.id}">×</button></td></tr>`).join('') || '<tr><td colspan="4" class="note">Noch keine Projekte gespeichert.</td></tr>'}</table>`, d => {
    $('#oFile', d).onclick = () => { d.close(); $('#fOpen').click(); };
    $('#oDemo', d).onclick = () => { d.close(); HSS.demo.start(); };
    $('#oSite', d).onclick = () => { d.close(); HSS.standorte.dialog(); };
    $$('[data-open]', d).forEach(a => a.onclick = async e => { e.preventDefault(); const p = await HSS.storage.loadProject(a.dataset.open); d.close(); HSS.load(p); UI.toast('Projekt geladen: ' + p.meta.name); });
    $$('[data-del]', d).forEach(b => b.onclick = async () => { if (!await UI.confirm('Projekt löschen', 'Projekt aus der Browser-Ablage löschen? Gespeicherte Dateien sind nicht betroffen.', 'Löschen')) return; await HSS.storage.deleteProject(b.dataset.del); openDialog(); });
  });
}
function welcome() {
  UI.dialog(`<div class="dh"><h2>Healthcare Simulation Suite</h2><button class="x" data-close>×</button></div>
   <p>Krankenhäuser in 3D aus Bausteinen modellieren und Material-, Waren- und Personenflüsse simulieren.</p>
   <div class="tiles" style="grid-template-columns:1fr 1fr 1fr 1fr">
    <button class="tile" id="wDemo"><b>▶ Demo-Modus</b><small>UNITY Hospital mit geführter Tour durch alle Funktionen</small></button>
    <button class="tile" id="wNew"><b>Neues Projekt</b><small>Mit Gelände und Wegen beginnen, dann Gebäude setzen</small></button>
    <button class="tile" id="wOpen"><b>Projekt öffnen</b><small>Datei (.hss.json) oder Projektablage im Browser</small></button>
    <button class="tile" id="wSite"><b>Standortmodelle</b><small>BwZK Koblenz und Klinikum Hanau (Bestand und Variante) als bearbeitbares Projekt</small></button></div>
   <h3>Arbeitsschritte</h3><ol class="why"><li><b>Gelände &amp; Wege</b> – Topographie, Straßen, Wege, Parkplätze, Außenausstattung</li><li><b>Gebäude</b> – Bausteine setzen, Form/Fassade/Geschosse anpassen, andocken, Brücken</li><li><b>Etagen</b> – Innenausbau mit Räumen, Wänden, Türen, Aufzügen und Ausstattung</li><li><b>Stationsplaner</b> – Betten- und Flächenbedarf rechnen, Station automatisch belegen</li><li><b>Flüsse</b> – Standardflüsse übernehmen, Material, Fuhrpark und Regeln festlegen</li><li><b>Simulation</b> – Tagesablauf abspielen, Transporte in der Ich-Perspektive begleiten</li><li><b>Analyse</b> – Hotspots je Uhrzeit, Fahrzeugbedarf, Zeitfensterplan</li></ol>`, d => {
    $('#wDemo', d).onclick = () => { d.close(); HSS.demo.start(); };
    $('#wNew', d).onclick = () => { d.close(); $('#bNew').click(); };
    $('#wOpen', d).onclick = () => { d.close(); openDialog(); };
    $('#wSite', d).onclick = () => { d.close(); HSS.standorte.dialog(); };
  });
}
function help() {
  UI.dialog(`<div class="dh"><h2>Kurzanleitung</h2><button class="x" data-close>×</button></div>
  <table class="t"><tr><th>Bedienung</th><th></th></tr>
  <tr><td>Kamera</td><td>Linke Maustaste drehen · rechte Maustaste verschieben · Mausrad zoomen · Doppelklick fokussiert</td></tr>
  <tr><td>Auswahl</td><td>Klick wählt Bauteil, Objekt, Weg, Fläche, Raum oder Wand; Inspektor rechts. <b>Esc</b> hebt auf.</td></tr>
  <tr><td>Verschieben/Drehen</td><td>Gizmo ziehen · <b>R</b> wechselt Verschieben/Drehen · <b>Entf</b> löscht · <b>Strg+D</b> dupliziert</td></tr>
  <tr><td>Rückgängig</td><td><b>Strg+Z</b> / <b>Strg+Y</b></td></tr>
  <tr><td>Etagen</td><td>Ansichtsleiste „Ebene“ schneidet das Gebäude auf dieser Etage auf (Wände voll/halb/Grundriss). „Explosion“ zieht Geschosse auseinander.</td></tr>
  <tr><td>Wege</td><td>Punkte klicken, Doppelklick beendet. Kurven werden geglättet; Neigung über „Anhebung Anfang/Ende“.</td></tr>
  <tr><td>Rundgang</td><td><b>W A S D</b> gehen, Maus umsehen, <b>Bild↑/↓</b> Geschoss, <b>P</b> Bild speichern, <b>Esc</b> Ende</td></tr>
  <tr><td>Speichern</td><td>Automatisch im Browser; „Speichern“ legt zusätzlich eine Datei ab (<b>Strg+S</b>)</td></tr></table>
  <h3>Rechengrundlagen</h3><ul class="why"><li>Bettenbedarf nach Hill-Burton: Fälle × Verweildauer ÷ (365 × Auslastung)</li><li>Transportzeit = Weglänge ÷ Geschwindigkeit des Transportmittels + Lade-/Entladezeit + Aufzugsfahrt inkl. Warteschlange</li><li>Hotspot: ≥ 60 % der Richtkapazität je Stunde (Flur 60, Tunnel 70, Weg 60 Fahrten/h; Aufzug Belegungszeit je Kabine)</li><li>Fahrzeugbedarf: gleichzeitige Spitze und Einsatzstunden ÷ (Betriebszeit × 85 %)</li></ul>
  <p class="note">Version ${HSS.VERSION} · UNITY · three.js r160 (MIT)</p><div class="actions"><button data-close>Schließen</button></div>`);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
window.addEventListener('error', e => { const l = document.getElementById('loading'); if (l && !l.hidden) l.innerHTML = '<div style="max-width:640px"><p>Fehler beim Start:</p><pre style="white-space:pre-wrap;color:#ffb3c7">' + (e.message || e) + '</pre></div>'; });
})();
