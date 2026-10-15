/* =====================================================================
   HSS · ansicht.js – Modell als HTML-Ansicht exportieren (nur ansehen)
   „Als HTML-Ansicht exportieren“ schreibt eine einzige HTML-Datei mit dem
   aktuellen Stand des Modells und der aktuellen Ansicht (Kamera, Etage,
   Stil, Flächenplan, Beschriftung …). Empfänger öffnen sie per Doppelklick
   ohne Installation und ohne Internet: drehen, zoomen, Etagen wechseln,
   Flächenplan und Rundgang ansehen – aber nichts ändern, nichts speichern.
   Die Datei enthält die Suite selbst (ohne Bearbeitungsoberfläche) und das
   Projekt; die UNITY-Kopfzeile bleibt erhalten.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const A = HSS.ansicht = {};
// Hinweis: Zeichenfolgen wie „<" + "!--“ oder „<" + "script“ dürfen hier nicht wörtlich stehen (Einzeldatei-HTML)
const LT = '<', SCR = LT + 'script', SCRE = LT + '/script', KOMM = new RegExp(LT + '!--', 'g');
const esc = s => String(s).replace(new RegExp(SCRE, 'gi'), LT + '\\/script').replace(KOMM, LT + '\\!--');

/* ---------- Aktuelle Ansicht ---------- */
A.state = () => {
  const S3 = HSS.s3, V = HSS.view;
  return {
    cam: S3.camera.position.toArray().map(v => Math.round(v * 100) / 100), tgt: S3.controls.target.toArray().map(v => Math.round(v * 100) / 100),
    floor: V.floor, cut: V.cut, shell: V.shell, explode: V.explode, labels: V.labels, wege: V.wege, stil: V.stil, sun: V.sunHour,
    zonen: !!V.zonen, zonenFokus: V.zonenFokus || null, m2: !!V.m2, flussbild: !!HSS.flussbild?.on, verkehr: HSS.perf?.trafficAnim !== false,
    netz: HSS.ui?.netMode || 'aus', sim: !!HSS.state.sim && !document.getElementById('timeline')?.hidden, simT: HSS.player?.t ?? 360,
    stroeme: HSS.stroeme?.state?.() || null
  };
};
/* Was der Empfänger sehen darf (Standard: alles). Module fragen über A.erlaubt('rundgang'|'fluss'|'sim') */
A.TEILE = [
  { k: 'rundgang', t: 'Stationsrundgang und Begehen', s: 'Rundgang Raum für Raum, freie Begehung in der Ich-Perspektive' },
  { k: 'fluss', t: 'Materialflussdarstellungen', s: 'Wegenetz und Auslastung, Flussbild, Warenströme, Prozess-Tour' },
  { k: 'sim', t: 'Simulation / Tagesablauf', s: 'Transporte über den Tag abspielen (Start / Pause, Zeitleiste)' }
];
A.erlaubt = k => !HSS.state.viewer || (window.HSS_VIEWER?.erlaubt?.[k] ?? true);

/* ---------- Quellen der Suite einsammeln ---------- */
async function text(url) { const r = await fetch(url); if (!r.ok) throw new Error(url + ': HTTP ' + r.status); return r.text(); }
async function dataUri(url) {
  const r = await fetch(url); if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
  const b = await r.blob(); return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); });
}
const cssFromSheet = link => { try { return [...link.sheet.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return null; } };
async function sammeln() {
  const head = [];
  for (const el of document.head.children) {
    if (el.tagName === 'LINK' && /stylesheet/i.test(el.rel)) { let css; try { css = await text(el.href); } catch (e) { css = cssFromSheet(el); if (css === null) throw e; } head.push('<style>\n' + css + '\n</style>'); }
    else if (el.tagName === 'LINK' && /icon/i.test(el.rel)) { try { head.push(`<link rel="icon" href="${el.href.startsWith('data:') ? el.href : await dataUri(el.href)}">`); } catch (e) { /* ohne Symbol */ } }
    else if (el.tagName === 'STYLE' || el.tagName === 'META') head.push(el.outerHTML);
  }
  // Grundgerüst der Seite (beim Start festgehalten), Bilder einbetten
  let body = (HSS._shell?.body || []).join('\n');
  for (const m of [...body.matchAll(/<img[^>]+src="([^"]+)"/g)]) { if (m[1].startsWith('data:')) continue; try { body = body.split(`src="${m[1]}"`).join(`src="${await dataUri(new URL(m[1], location.href).href)}"`); } catch (e) { /* Bild fehlt */ } }
  // Skripte in Ladereihenfolge; die Bibliotheksliste wird durch die bereits geladenen Pakete ersetzt
  const scripts = [];
  for (const s of document.scripts) {
    if (s.type && !/javascript/i.test(s.type)) continue;
    if (s.id === 'hssViewerData') continue;
    if (s.src) {
      if (/library\/manifest\.js/.test(s.src)) { scripts.push('window.HSS_LIBRARY_FILES = ' + JSON.stringify(window.HSS_LIBRARY_FILES || []) + ';'); continue; }
      scripts.push(await text(s.src));
    } else scripts.push(s.textContent);
  }
  return { head, body, scripts };
}

/* ---------- Export ---------- */
A.export = async (opts = {}) => {
  const UI = HSS.ui, prj = HSS.project();
  UI.toast('HTML-Ansicht wird erstellt …', 2500);
  let q;
  try { q = await sammeln(); } catch (e) {
    UI.dialog(`<div class="dh"><h2>HTML-Ansicht nicht möglich</h2><button class="x" data-close>×</button></div><p>Die Programmdateien lassen sich in dieser Startart nicht einlesen. Bitte die Einzeldatei <b>Healthcare_Simulation_Suite.html</b> verwenden oder die Suite mit <code>python3 start.py</code> starten.</p><div class="errbox">${U.esc(e.message)}</div><div class="actions"><button data-close>OK</button></div>`);
    return;
  }
  const p = U.clone(prj);
  const used = new Set(p.objects.map(o => o.lib));
  p.customLibrary = HSS.library ? HSS.library.all().filter(o => o._source !== 'standard' && used.has(o.id)).map(o => HSS.library.serialize(o)) : p.customLibrary;
  const erlaubt = Object.fromEntries(A.TEILE.map(x => [x.k, opts.erlaubt?.[x.k] !== false]));
  const view = A.state();
  if (!erlaubt.fluss) { view.flussbild = false; view.netz = 'aus'; view.stroeme = null; }
  if (!erlaubt.sim) view.sim = false;
  const payload = { project: p, view, erlaubt, titel: opts.titel || p.meta.name, hinweis: opts.hinweis || '', erstellt: new Date().toISOString() };
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>${U.esc(payload.titel)} – Ansicht</title>
${q.head.filter(h => !/^<meta charset/i.test(h)).join('\n')}
</head>
<body class="viewer">
${q.body}
${SCR} id="hssViewerData">window.HSS_VIEWER = ${json};${SCRE}>
${q.scripts.map(s => SCR + '>\n' + esc(s) + '\n' + SCRE + '>').join('\n')}
</body>
</html>`;
  const name = (payload.titel || 'Projekt').replace(/[^\wäöüÄÖÜß.-]+/g, '_') + '_Ansicht.html';
  U.download ? U.download(name, html, 'text/html') : (() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = name; a.click(); })();
  UI.toast(`„${name}“ gespeichert (${U.fmt(html.length / 1e6, 1)} MB) – per Doppelklick öffnen, nur ansehen`, 5000);
  return html;
};
A.dialog = () => {
  const UI = HSS.ui, $ = UI.$, prj = HSS.project();
  UI.dialog(`<div class="dh"><h2>Als HTML-Ansicht exportieren</h2><button class="x" data-close>×</button></div>
    <p>Erstellt <b>eine HTML-Datei</b> mit dem aktuellen Stand des Modells und genau dieser Ansicht (Blickwinkel, Etage, Stil, Flächenplan, Beschriftung). Empfänger öffnen sie per Doppelklick – ohne Installation, ohne Internet. Drehen, zoomen, Etagen wechseln, Flächenplan und Rundgang ansehen ist möglich, <b>ändern nicht</b>.</p>
    <div class="fg"><label class="f full"><span>Titel</span><input type="text" id="axT" value="${U.esc(prj.meta.name)}"></label><label class="f full"><span>Hinweis für den Empfänger (optional)</span><input type="text" id="axH" placeholder="z. B. Variante 2 – Stand Lenkungskreis"></label></div>
    <h4 style="margin:12px 0 4px">Für den Empfänger freigeben</h4>
    <div class="axopt">${A.TEILE.map(x => `<label class="chk"><input type="checkbox" data-ax="${x.k}" ${A._last?.[x.k] === false ? '' : 'checked'}> <span><b>${x.t}</b><br><small class="note">${x.s}</small></span></label>`).join('')}</div>
    <p class="note">Abgewählte Teile erscheinen in der Ansicht nicht – weder als Schaltfläche noch in der gespeicherten Ansicht.</p>
    <div class="actions"><button class="primary" id="axGo">HTML-Ansicht herunterladen</button><button data-close>Abbrechen</button></div>`, d => {
    $('#axGo', d).onclick = async () => {
      const t = $('#axT', d).value.trim(), h = $('#axH', d).value.trim();
      const erlaubt = {}; d.querySelectorAll('[data-ax]').forEach(c => (erlaubt[c.dataset.ax] = c.checked)); A._last = erlaubt;
      d.close(); await A.export({ titel: t || prj.meta.name, hinweis: h, erlaubt });
    };
  });
};

/* Tagesablauf in der Ansicht: rechnen, Zeitleiste zeigen, abspielen */
A.tagesablauf = (play = true, t = 360) => {
  const UI = HSS.ui;
  const go = () => {
    if (!HSS.state.sim) { try { HSS.runSimulation(); } catch (e) { UI.toast('Tagesablauf nicht möglich: ' + e.message, 4000); return; } }
    HSS.player.setTime(t); UI.timeline.show(true);
    if (UI.netMode === 'heat' && A.erlaubt('fluss')) HSS.drawNet('heat', Math.floor(t / 60) % 24);
    if (play) HSS.player.play(true);
  };
  if (HSS.state.sim) go(); else { UI.toast('Tagesablauf wird berechnet …', 1200); setTimeout(go, 40); }
};

/* ---------- Start im Ansichtsmodus ---------- */
A.boot = () => {
  const VW = window.HSS_VIEWER, S3 = HSS.s3, V = HSS.view, UI = HSS.ui, $ = UI.$;
  document.body.classList.add('viewer');
  const st = VW.view || {}, ok = A.erlaubt;
  for (const x of A.TEILE) document.body.classList.toggle('vw-no-' + x.k, !(VW.erlaubt?.[x.k] ?? true));
  if (st.stil && HSS.stil && HSS.stil.mode !== st.stil) { HSS.stil.mode = HSS.view.stil = st.stil; document.body.classList.toggle('cartoon', st.stil === 'cartoon' || st.stil === 'plan'); document.body.classList.toggle('plan', st.stil === 'plan'); }
  if (VW.titel) VW.project.meta.name = VW.titel;
  HSS.load(VW.project, { noAutosave: true });
  HSS.state.demoReadonly = true; HSS.state.viewer = true;
  HSS.undo = HSS.redo = () => false; HSS.canUndo = HSS.canRedo = () => false;
  HSS.storage.saveProject = async () => null; HSS.storage.exportFile = () => {};
  // Gesperrte Teile auch in der Logik abschalten (nicht nur ausblenden)
  if (!ok('rundgang')) { if (HSS.tour) HSS.tour.dialog = HSS.tour.start = () => {}; if (HSS.fpv) HSS.fpv.walk = () => {}; }
  if (!ok('fluss')) { const dn = HSS.drawNet; HSS.drawNet = () => dn('aus'); if (HSS.flussbild) HSS.flussbild.set = HSS.flussbild.toggle = () => {}; }
  const netCtl = document.getElementById('vNet')?.closest('label'); if (netCtl) netCtl.classList.add('vw-fluss');
  const heatCtl = document.getElementById('tHeat')?.closest('label'); if (heatCtl) heatCtl.classList.add('vw-fluss');
  // Tagesablauf: Simulation im Browser des Empfängers rechnen und abspielen
  if (ok('sim')) {
    const b = document.createElement('button'); b.id = 'vwSim'; b.className = 'primary'; b.title = 'Transporte über den Tag abspielen'; b.textContent = '▶ Tagesablauf';
    const ref = document.getElementById('vTour'); (ref?.parentNode || document.getElementById('viewbar')).insertBefore(b, ref || null);
    b.onclick = () => A.tagesablauf(true);
  }
  // Kopfzeile: Titel, „Nur Ansicht“, Stand
  $('#prjName').textContent = VW.titel || VW.project.meta.name;
  const top = $('#top'), sp = top.querySelector('.sp');
  const info = document.createElement('div'); info.className = 'vwinfo';
  info.innerHTML = `<span class="vwbadge">Nur Ansicht</span><span class="vwdate">Stand ${new Date(VW.erstellt).toLocaleDateString('de-DE')}${VW.hinweis ? ' · ' + U.esc(VW.hinweis) : ''}</span><button id="vwHome" title="Zur gespeicherten Ansicht zurück">⌂ Ausgangsansicht</button>`;
  sp.after(info);
  const home = (ms = 900) => { if (st.cam && st.tgt) S3.animateCam(new window.THREEX.THREE.Vector3(...st.cam), new window.THREEX.THREE.Vector3(...st.tgt), ms); };
  $('#vwHome').onclick = () => home();
  // Ansicht wiederherstellen
  Object.assign(V, { cut: st.cut || V.cut, shell: st.shell === 'glas' && !HSS.flussbild ? 'transparent' : (st.shell || V.shell), explode: st.explode || 0, labels: st.labels !== false, wege: st.wege || V.wege });
  const ex = document.getElementById('vExplode'); if (ex) ex.value = V.explode;
  if (st.verkehr === false) HSS.perf?.setTraffic?.(false);
  if (st.sun !== undefined) S3.setSun(st.sun);
  setTimeout(() => {
    if (st.floor !== null && st.floor !== undefined) S3.setFloor(st.floor);
    if (st.zonen && HSS.zonen) { V.zonenFokus = st.zonenFokus; HSS.zonen.setView(true); }
    if (st.m2 && HSS.flaechen) HSS.flaechen.toggle(true);
    if (st.flussbild && HSS.flussbild && ok('fluss')) HSS.flussbild.set(true);
    if (st.netz && st.netz !== 'aus' && ok('fluss')) { HSS.ui.netMode = st.netz; const n = document.getElementById('vNet'); if (n) n.value = st.netz; }
    if (st.stroeme && HSS.stroeme && ok('fluss')) HSS.stroeme.restore?.(st.stroeme);
    if (st.sim && ok('sim')) A.tagesablauf(false, st.simT);
    else if (st.netz === 'netz' && ok('fluss')) HSS.drawNet('netz');
    S3.rebuild('all'); UI.refreshViewbar?.();
    setTimeout(() => home(10), 1100); // nach der Startanimation (Gesamtansicht)
  }, 250);
  // Auswahl: kurze Information statt Inspektor
  const card = document.createElement('div'); card.id = 'vwCard'; card.hidden = true; document.body.appendChild(card);
  HSS.on('selection', sel => { const h = sel && UI.describe ? UI.describe(sel) : ''; card.hidden = !h; card.innerHTML = h ? h + '<button class="x" title="Schließen">×</button>' : ''; const x = card.querySelector('.x'); if (x) x.onclick = () => S3.select(null); });
};
})();
