/* =====================================================================
   HSS · app.js – Start, Kopfzeile, Projekt öffnen/speichern, Hilfe
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, UI = HSS.ui, $ = UI.$, $$ = UI.$$;

function boot() {
  HSS.s3.init($('#viewport')); HSS.perf.init(); HSS.manip.init();
  HSS.nav.init();
  UI.buildRail(); UI.bindViewbar(); UI.timeline.bind(); HSS.plan2d?.init(); HSS.perf.bindUI();
  bindHeader(); bindDrop();
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
  HSS.on('loaded', () => {
    const so = HSS.project().meta.standort;
    if (so && (so.rev || 1) < 2) setTimeout(async () => {
      if (await UI.confirm('Standortmodell aktualisieren?', 'Für dieses Standortmodell gibt es eine verbesserte Übernahme: Gebäude als Sockel mit aufgesetzten Türmen und schlanken Technikaufbauten, keine Gehwege mehr auf den Fahrbahnen, Bielefeld/Koblenz/Hanau mit festen Bezeichnern. Ihre Änderungen (gelöschte Gebäude und Wege, eigene Gebäude, Räume, Stationen, Flüsse) bleiben erhalten. Rückgängig machen ist möglich.', 'Aktualisieren')) HSS.standorte.aktualisierenAktuell();
    }, 600);
  });
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
  HSS.booted = true;
  const fehlt = ['gelaende', 'gebaeude', 'innen', 'bibliothek', 'station', 'fluesse', 'simulation', 'analyse'].filter(k => !UI.ws[k]);
  if (fehlt.length || HSS.loadErrors.length) {
    UI.dialog(`<div class="dh"><h2>Teile der Oberfläche wurden nicht geladen</h2><button class="x" data-close>×</button></div>
      <p>${fehlt.length ? `Es fehlen die Arbeitsbereiche: <b>${fehlt.map(k => U.esc(k)).join(', ')}</b>. ` : ''}Meist liegt das an einer veralteten Datei im Browser-Cache nach einem Update.</p>
      <ol class="why"><li>Seite mit <b>Strg + F5</b> (Mac: Cmd + Umschalt + R) neu laden.</li><li>Falls das nicht hilft: Server beenden und mit <code>python3 start.py</code> neu starten.</li><li>Bleibt der Fehler, bitte die Meldung unten mitschicken.</li></ol>
      ${HSS.loadErrors.length ? `<div class="errbox">${HSS.loadErrors.map(e => `${U.esc(e.datei || '?')}${e.zeile ? ':' + e.zeile : ''} – ${U.esc(e.meldung)}`).join('<br>')}</div>` : ''}
      <div class="actions"><button class="primary" onclick="location.reload()">Neu laden</button><button data-close>Schließen</button></div>`);
  }
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
  $('#fOpen').onchange = async e => { const fs = [...e.target.files]; if (fs.length) await HSS.openFiles(fs); e.target.value = ''; };
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
   <div class="dropbig" id="oDrop"><b>Projektdatei hierher ziehen</b><small>oder klicken und Datei wählen (.hss.json) – Projektdateien lassen sich auch jederzeit direkt ins Fenster ziehen</small></div>
   <div class="actions" style="margin-top:0"><button class="primary" id="oFile">Datei wählen …</button><button id="oDemo">▶ Demo (UNITY Hospital)</button></div>
   <h3>Projektablage im Browser</h3>
   <table class="t"><tr><th>Projekt</th><th>zuletzt geändert</th><th class="n">Größe</th><th></th></tr>${list.map(p => `<tr><td><a href="#" data-open="${p.id}">${U.esc(p.name)}</a></td><td>${new Date(p.modified).toLocaleString('de-DE')}</td><td class="n">${U.fmt(p.size / 1024)} kB</td><td><button class="mini danger" data-del="${p.id}">×</button></td></tr>`).join('') || '<tr><td colspan="4" class="note">Noch keine Projekte gespeichert.</td></tr>'}</table>`, d => {
    $('#oFile', d).onclick = () => { d.close(); $('#fOpen').click(); };
    $('#oDemo', d).onclick = () => { d.close(); HSS.demo.start(); };
    const dz = $('#oDrop', d); dz.onclick = () => { d.close(); $('#fOpen').click(); };
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); d.close(); HSS.openFiles([...e.dataTransfer.files]); };
    $$('[data-open]', d).forEach(a => a.onclick = async e => { e.preventDefault(); const p = await HSS.storage.loadProject(a.dataset.open); d.close(); HSS.load(p); UI.toast('Projekt geladen: ' + p.meta.name); });
    $$('[data-del]', d).forEach(b => b.onclick = async () => { if (!await UI.confirm('Projekt löschen', 'Projekt aus der Browser-Ablage löschen? Gespeicherte Dateien sind nicht betroffen.', 'Löschen')) return; await HSS.storage.deleteProject(b.dataset.del); openDialog(); });
  });
}
function welcome() {
  let recent = [];
  const show = () => UI.dialog(`<div class="dh"><h2>Healthcare Simulation Suite</h2><button class="x" data-close>×</button></div>
   <p>Krankenhäuser in 3D planen wie in einem Aufbauspiel – Gebäude ins Bild ziehen, an Griffen formen, Stationen automatisch einrichten und Material-, Waren- und Personenflüsse simulieren.</p>
   <div class="tiles start3">
    <button class="tile big" id="wDemo"><span class="ic">▶</span><b>Demo</b><small>UNITY Hospital mit geführter Tour durch alle Funktionen</small></button>
    <button class="tile big" id="wNew"><span class="ic">＋</span><b>Neues Projekt</b><small>Leeres Gelände – Gebäude, Wege und Stationen selbst planen</small></button>
    <button class="tile big drop" id="wOpen"><span class="ic">⇩</span><b>Projekt öffnen</b><small>Projektdatei (.hss.json) <b>hierher ziehen</b> oder klicken</small></button></div>
   ${recent.length ? `<h3>Zuletzt bearbeitet</h3><div class="list">${recent.slice(0, 5).map(p => `<div class="li" data-open="${p.id}"><span class="t">${U.esc(p.name)}</span><span class="s">${new Date(p.modified).toLocaleString('de-DE')}</span></div>`).join('')}</div>` : ''}`, d => {
    $('#wDemo', d).onclick = () => { d.close(); HSS.demo.start(); };
    $('#wNew', d).onclick = () => { d.close(); $('#bNew').click(); };
    const wo = $('#wOpen', d); wo.onclick = () => { d.close(); $('#fOpen').click(); };
    wo.ondragover = e => { e.preventDefault(); wo.classList.add('over'); }; wo.ondragleave = () => wo.classList.remove('over');
    wo.ondrop = e => { e.preventDefault(); e.stopPropagation(); d.close(); HSS.openFiles([...e.dataTransfer.files]); };
    $$('[data-open]', d).forEach(li => li.onclick = async () => { const p = await HSS.storage.loadProject(li.dataset.open); d.close(); if (p) { HSS.load(p); UI.toast('Projekt geladen: ' + p.meta.name); } });
  });
  HSS.storage.listProjects().then(l => { recent = l.filter(p => !/UNITY Hospital \(Demo\)/.test(p.name)); if (recent.length && $('#dlg').open && $('#wDemo')) show(); }).catch(() => {});
  show();
}
// Dateien öffnen: Projektdateien laden, Bibliotheksdateien in die Bibliothek übernehmen
HSS.openFiles = async (files) => {
  const prjF = files.filter(f => /\.hss\.json$|\.json$/i.test(f.name) && !/\.hssobj\.json$|\.hsslib\.json$/i.test(f.name));
  const libF = files.filter(f => /\.hssobj\.json$|\.hsslib\.json$|\.glb$|\.gltf$/i.test(f.name));
  if (libF.length) { await UI.uploadLib(libF); }
  if (!prjF.length) { if (!libF.length) UI.toast('Bitte eine Projektdatei (.hss.json) ablegen'); return; }
  const f = prjF[0];
  try {
    const p = await HSS.storage.importFile(f);
    if (HSS.project().buildings.length && HSS.state.dirty) { try { await HSS.storage.saveProject(); } catch (e) { /* */ } }
    HSS.load(p); document.body.classList.remove('demoon'); $('#demoCard').hidden = true;
    UI.toast('Projekt geöffnet: ' + p.meta.name, 3000);
  } catch (err) { UI.dialog(`<h2>Datei nicht lesbar</h2><p>${U.esc(f.name)}</p><div class="errbox">${U.esc(err.message)}</div><div class="actions"><button data-close>OK</button></div>`); }
};
function bindDrop() {
  let depth = 0; const ov = document.createElement('div'); ov.id = 'dropOverlay'; ov.hidden = true; ov.innerHTML = '<div><b>Loslassen zum Öffnen</b><small>Projektdatei (.hss.json) · Bibliotheksobjekte (.hssobj.json, .hsslib.json, .glb)</small></div>'; document.body.appendChild(ov);
  const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
  window.addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; if (!$('#dlg').open) ov.hidden = false; });
  window.addEventListener('dragleave', e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) ov.hidden = true; });
  window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; ov.hidden = true; if (e.defaultPrevented && e._handled) return; HSS.openFiles([...e.dataTransfer.files]); });
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
