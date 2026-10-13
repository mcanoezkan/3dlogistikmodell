/* =====================================================================
   HSS · ui-analyse.js – Simulation, Zeitleiste, Hotspots, Fahrzeugbedarf, Zeitfensterplan
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, UI = HSS.ui, $ = UI.$, $$ = UI.$$, opt = UI.opt;
const W = UI.ws;
const AMP = u => (u >= 1 ? '#B60028' : u >= 0.8 ? '#FFC300' : u >= 0.6 ? '#f0a35e' : '#0A967A');

/* ---------- Diagramme ---------- */
const canvasFit = (cv) => { const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1; cv.width = Math.max(10, r.width * dpr); cv.height = Math.max(10, r.height * dpr); const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); return { c, w: r.width, h: r.height }; };
UI.barChart = (cv, series, opts = {}) => {
  const { c, w, h } = canvasFit(cv); c.clearRect(0, 0, w, h);
  const pad = { l: 30, r: 6, t: 8, b: 16 }, n = 24, bw = (w - pad.l - pad.r) / n;
  const max = opts.max || Math.max(1e-9, ...series.flatMap(s => s.v));
  c.font = '10px Arial'; c.fillStyle = '#5A6573'; c.strokeStyle = '#e3e8ed';
  for (let k = 0; k <= 4; k++) { const y = pad.t + (h - pad.t - pad.b) * (1 - k / 4); c.beginPath(); c.moveTo(pad.l, y); c.lineTo(w - pad.r, y); c.stroke(); c.fillText(opts.pct ? U.fmt(max * k / 4 * 100) + '%' : U.fmt(max * k / 4, max < 10 ? 1 : 0), 2, y + 3); }
  if (opts.limit) { const y = pad.t + (h - pad.t - pad.b) * (1 - opts.limit / max); c.strokeStyle = '#B60028'; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(pad.l, y); c.lineTo(w - pad.r, y); c.stroke(); c.setLineDash([]); }
  series.forEach((s, si) => s.v.forEach((v, i) => { const bh = (h - pad.t - pad.b) * v / max; c.fillStyle = s.colorFn ? s.colorFn(v) : s.color; const sw = bw * 0.8 / series.length; c.fillRect(pad.l + i * bw + bw * 0.1 + si * sw, h - pad.b - bh, sw, bh); }));
  c.fillStyle = '#5A6573'; for (let i = 0; i < 24; i += 3) c.fillText(String(i).padStart(2, '0'), pad.l + i * bw + 1, h - 3);
  if (opts.now !== undefined) { const x = pad.l + opts.now / 60 * bw; c.strokeStyle = '#144477'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, pad.t); c.lineTo(x, h - pad.b); c.stroke(); c.lineWidth = 1; }
};
// Zeitfensterplan: je Fahrzeug eine Zeile, Balken = Tour, Farbe = Materialgruppe
UI.gantt = (cv, pool, sim, prj) => {
  const trips = sim.trips.filter(t => t.pool === pool && t.end !== undefined);
  const lanes = Math.max(1, ...trips.map(t => t.veh + 1));
  cv.style.height = Math.min(420, 22 + lanes * 14) + 'px';
  const { c, w, h } = canvasFit(cv); c.clearRect(0, 0, w, h);
  const pad = { l: 34, r: 6, t: 4, b: 16 }, lh = (h - pad.t - pad.b) / lanes, X = t => pad.l + (w - pad.l - pad.r) * t / 1440;
  c.font = '10px Arial'; c.fillStyle = '#5A6573';
  for (let i = 0; i <= 24; i += 2) { const x = X(i * 60); c.fillStyle = '#eef1f4'; c.fillRect(x, pad.t, 1, h - pad.t - pad.b); c.fillStyle = '#5A6573'; if (i < 24) c.fillText(String(i).padStart(2, '0'), x + 2, h - 3); }
  const mats = new Map(prj.materials.map(m => [m.id, m]));
  for (let l = 0; l < lanes; l++) { c.fillStyle = '#5A6573'; c.fillText('#' + (l + 1), 4, pad.t + l * lh + lh * 0.75); }
  for (const t of trips) { c.fillStyle = mats.get(t.material)?.farbe || '#2D7694'; c.fillRect(X(t.start), pad.t + t.veh * lh + 1, Math.max(1.5, X(t.end) - X(t.start)), Math.max(2, lh - 2)); if (t.wash) { c.fillStyle = '#0A223C'; c.fillRect(X(t.end) - 2, pad.t + t.veh * lh + 1, 2, lh - 2); } }
};

/* ---------- Zeitleiste ---------- */
UI.timeline = {
  show(on = true) { $('#timeline').hidden = !on; document.body.classList.toggle('timeline', on); this.draw(); },
  draw() {
    const sim = HSS.state.sim, cv = $('#tCanvas'); if (!sim || $('#timeline').hidden) return;
    const per = new Array(24).fill(0); for (const t of sim.trips) if (t.start !== undefined) per[Math.floor(t.start / 60) % 24]++;
    const hot = new Array(24).fill(0); for (const h of sim.hotspots) for (const hh of h.hours || [h.h]) hot[hh] = Math.max(hot[hh], h.sev === 'hoch' ? 1 : h.sev === 'mittel' ? 0.8 : 0.6);
    UI.barChart(cv, [{ v: per, colorFn: null, color: '#2D7694' }], { now: HSS.player.t });
    const { c, w, h } = { c: cv.getContext('2d'), w: cv.getBoundingClientRect().width, h: cv.getBoundingClientRect().height };
    const bw = (w - 36) / 24; hot.forEach((v, i) => { if (!v) return; c.fillStyle = AMP(v); c.fillRect(30 + i * bw + 1, 2, bw - 2, 4); });
    $('#tClock').textContent = U.hhmm(HSS.player.t);
    const act = sim.trips.filter(t => t.start <= HSS.player.t && t.end >= HSS.player.t).length;
    $('#tInfo').textContent = `${act} Transporte unterwegs · ${per[Math.floor(HSS.player.t / 60) % 24]} Starts in dieser Stunde · farbige Marken = Engpässe`;
  },
  bind() {
    $('#tPlay').onclick = () => HSS.player.play();
    $('#tSpeed').onchange = e => (HSS.player.speed = +e.target.value);
    $('#tClose').onclick = () => { HSS.player.play(false); this.show(false); };
    const cv = $('#tCanvas'); let drag = false;
    const seek = e => { const r = cv.getBoundingClientRect(); const x = U.clamp((e.clientX - r.left - 30) / (r.width - 36), 0, 1); HSS.player.setTime(x * 1440); };
    cv.onpointerdown = e => { drag = true; seek(e); }; window.addEventListener('pointerup', () => (drag = false)); cv.onpointermove = e => drag && seek(e);
    HSS.on('simtime', U.debounce(() => { this.draw(); if ($('#tHeat').checked && UI.netMode === 'heat') { const h = Math.floor(HSS.player.t / 60) % 24; if (h !== UI.heatHour) { UI.heatHour = h; HSS.drawNet('heat', h); } } }, 30));
    HSS.on('simplay', on => ($('#tPlay').textContent = on ? '❚❚' : '▶'));
  }
};

/* ---------- Arbeitsbereich Simulation ---------- */
W.simulation = { name: 'Simulation', short: 'Simulation', step: '6', lead: 'Tagesablauf (0–24 Uhr) aller aktiven Flüsse durchrechnen: Touren, Bündelung, Aufzugswarteschlangen, Reinigungsfahrten. Danach in 3D abspielen oder einen Transport in der Ich-Perspektive begleiten.',
  render(el) {
    const prj = HSS.project(), sim = HSS.state.sim;
    const flows = prj.flows.filter(f => f.aktiv !== false);
    el.innerHTML = `<div class="actions" style="margin-top:0"><button class="primary" id="sRun" ${flows.length ? '' : 'disabled'}>▶ Simulation starten</button>${sim ? '<button id="sTl">Zeitleiste</button>' : ''}</div>
    ${flows.length ? '' : '<div class="warnbox">Keine aktiven Flüsse. Im Arbeitsbereich „Flüsse“ Standardflüsse übernehmen oder eigene anlegen.</div>'}
    ${sim ? `<div class="kpi"><div><b>${U.fmt(sim.totals.trips)}</b><span>Touren/Tag (${sim.totals.bundled} gebündelt)</span></div><div><b>${U.fmt(sim.totals.distKm, 1)} km</b><span>Transportweg/Tag</span></div><div><b>${U.fmt(sim.totals.waitLift / Math.max(1, sim.totals.trips) * 60, 0)} s</b><span>Ø Aufzugswartezeit je Tour</span></div><div><b>${sim.hotspots.filter(h => h.sev === 'hoch').length}</b><span>kritische Engpässe</span></div></div>
    ${sim.warn.length ? `<details><summary class="note" style="color:#891F5E"><b>${sim.warn.length} Hinweis(e)</b></summary>${sim.warn.map(w => `<div class="warnbox">${U.esc(w)}</div>`).join('')}</details>` : ''}
    <h3>Ich-Perspektive</h3>
    <p class="note">Begleiten Sie einen Transport vom Start bis zum Ziel – inklusive Aufzugsfahrt zwischen den Etagen.</p>
    <div class="fg c1"><label class="f"><span>Fluss</span><select id="sFlow">${prj.flows.filter(f => sim.flows[f.id]?.trips).map(f => opt(f.id, f.name, UI.fpvFlow)).join('')}</select></label><label class="f"><span>Fahrt</span><select id="sTrip"></select></label></div>
    <div class="actions"><button class="primary" id="sFollow">🎥 Begleiten</button><button id="sWalk">🚶 Rundgang</button></div>
    <h3>Wiedergabe</h3><p class="note">Zeitleiste unten: Abspielen, Tempo wählen, auf eine Uhrzeit klicken. Netz „Auslastung“ in der Ansichtsleiste färbt Flure, Wege und Aufzüge.</p>
    <div class="actions"><button id="sMorning">06:00</button><button id="sNoon">11:00</button><button id="sAfter">14:00</button><button id="sHeat">Heatmap an</button></div>` : '<p class="note">Die Simulation rechnet zwei Läufe: ohne Fahrzeuglimit (ermittelt den Bedarf) und – falls im Fuhrpark Anzahlen hinterlegt sind – mit diesem Fuhrpark (zeigt Wartezeiten).</p>'}`;
    $('#sRun', el).onclick = () => { UI.toast('Simulation läuft …', 800); setTimeout(() => { const t0 = performance.now(); const r = HSS.runSimulation(); UI.toast(`${r.totals.trips} Touren simuliert (${U.fmt(performance.now() - t0)} ms)`); HSS.player.setTime(360); UI.timeline.show(true); UI.renderPanel(); }, 30); };
    if (!sim) return;
    $('#sTl', el).onclick = () => UI.timeline.show(true);
    const fillTrips = () => { const fid = $('#sFlow', el).value; UI.fpvFlow = fid; $('#sTrip', el).innerHTML = sim.trips.filter(t => t.flows.includes(fid) && t.end !== undefined).map(t => opt(t.id, `${U.hhmm(t.start)}–${U.hhmm(t.end)} · ${U.fmt(t.dist)} m${t.waitLift > 0.5 ? ' · ' + U.fmt(t.waitLift, 1) + ' min Aufzug' : ''}${t.wash ? ' · + Reinigung' : ''}`)).join(''); };
    $('#sFlow', el).onchange = fillTrips; fillTrips();
    $('#sFollow', el).onclick = () => { const id = +$('#sTrip', el).value; if (isNaN(id)) return; UI.timeline.show(true); HSS.fpv.follow(id); };
    $('#sWalk', el).onclick = () => HSS.fpv.walk();
    $('#sMorning', el).onclick = () => HSS.player.setTime(360); $('#sNoon', el).onclick = () => HSS.player.setTime(660); $('#sAfter', el).onclick = () => HSS.player.setTime(840);
    $('#sHeat', el).onclick = () => { UI.netMode = 'heat'; $('#vNet').value = 'heat'; $('#tHeat').checked = true; UI.heatHour = Math.floor(HSS.player.t / 60); HSS.drawNet('heat', UI.heatHour); };
  } };

/* ---------- Arbeitsbereich Analyse ---------- */
UI.anTab = UI.anTab || 'hotspots';
W.analyse = { name: 'Analyse', short: 'Analyse', step: '7', lead: 'Engpässe (Hotspots) je Uhrzeit, Fahrzeugbedarf mit Rechenweg, Zeitfensterplan der Touren, Aufzugs- und Flussauswertung.',
  render(el) {
    const sim = HSS.state.sim, prj = HSS.project();
    if (!sim) { el.innerHTML = '<div class="infobox">Noch keine Ergebnisse. Im Arbeitsbereich „Simulation“ starten.</div><button class="primary" id="aRun">▶ Simulation starten</button>'; $('#aRun', el).onclick = () => { HSS.runSimulation(); UI.timeline.show(true); UI.renderPanel(); }; return; }
    const tabs = [['hotspots', 'Hotspots'], ['fahrzeuge', 'Fahrzeuge'], ['zeitplan', 'Zeitplan'], ['aufzuege', 'Aufzüge'], ['fluesse', 'Flüsse']];
    el.innerHTML = `<div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${UI.anTab === k ? 'on' : ''}">${n}</button>`).join('')}</div><div id="atab"></div><div class="actions"><button id="aCsv">Bericht als CSV</button><button id="aJson">Ergebnisse als JSON</button></div>`;
    $$('[data-tab]', el).forEach(b => b.onclick = () => { UI.anTab = b.dataset.tab; UI.renderPanel(); });
    AT[UI.anTab]($('#atab', el), sim, prj);
    $('#aCsv', el).onclick = () => UI.exportCsv(sim, prj);
    $('#aJson', el).onclick = () => U.download('hss-simulation.json', JSON.stringify({ hotspots: sim.hotspots, bedarf: sim.bedarf, lifts: sim.lifts, sections: sim.sections.map(s => ({ name: s.name, util: s.util })), flows: sim.flows, totals: sim.totals }, null, 1));
  } };
const AT = {};
AT.hotspots = (el, sim) => {
  const hourSel = UI.hotHour ?? '';
  const list = sim.hotspots.filter(h => hourSel === '' || (h.hours || [h.h]).includes(+hourSel));
  const byH = new Array(24).fill(0); for (const h of sim.hotspots) for (const hh of h.hours || [h.h]) byH[hh] += h.sev === 'hoch' ? 3 : h.sev === 'mittel' ? 2 : 1;
  el.innerHTML = `<p class="note">Ein Hotspot entsteht, wenn ein Abschnitt in einer Stunde ≥ 60 % seiner Richtkapazität erreicht (Flur 60, Tunnel 70, Weg 60 Fahrten/h; Aufzug: Belegungszeit je Kabine) oder Wartezeiten auftreten. Gezählt in Wageneinheiten: Person 0,05 · Wagen/AWT 1 · Bett 1,5 · Routenzug 2. <span class="ann" title="Kapazitäten sind Richtwerte und je Projekt anzupassen">Richtwerte</span></p>
  <canvas class="chart" id="hChart" style="height:90px"></canvas><div class="legend"><span><i style="background:#B60028"></i>≥ 100 % hoch</span><span><i style="background:#FFC300"></i>≥ 80 % mittel</span><span><i style="background:#0A967A"></i>≥ 60 % niedrig</span></div>
  <label class="ctl note">Uhrzeit <select id="hH">${opt('', 'ganzer Tag', hourSel)}${Array.from({ length: 24 }, (_, i) => opt(i, U.hhmm(i * 60) + '–' + U.hhmm(i * 60 + 60), hourSel)).join('')}</select></label>
  <div class="list" style="max-height:none;margin-top:6px">${list.map((h, i) => `<div class="li" data-h="${sim.hotspots.indexOf(h)}"><span class="sev ${h.sev}">${h.sev}</span><span class="t" style="white-space:normal">${U.esc(h.typ)}: ${U.esc(h.name)}<br><span class="note">${UI.hourRange(h.hours || [h.h])} · Spitze ${U.hhmm(h.h * 60)}: ${U.pct(h.util || 0)}${h.wait ? ' · Ø Warten ' + U.fmt(h.wait, 1) + ' min' : ''}</span></span></div>`).join('') || '<div class="li note">Keine Engpässe in diesem Zeitraum.</div>'}</div>
  <div class="infobox">Maßnahmen-Ideen: Zeitfenster entzerren (Flüsse), Touren bündeln (Fuhrpark), zusätzliche Aufzugskabine oder Freigabe für weitere Aufzüge, AWT für Ver-/Entsorgung, getrennte Rein-/Unrein-Aufzüge.</div>`;
  UI.barChart($('#hChart', el), [{ v: byH, colorFn: v => v >= 6 ? '#B60028' : v >= 3 ? '#FFC300' : '#0A967A' }], {});
  $('#hH', el).onchange = e => { UI.hotHour = e.target.value; UI.renderPanel(); if (e.target.value !== '') { UI.netMode = 'heat'; $('#vNet').value = 'heat'; UI.heatHour = +e.target.value; HSS.drawNet('heat', UI.heatHour); HSS.player.setTime(UI.heatHour * 60 + 30); } };
  $$('[data-h]', el).forEach(li => li.onclick = () => {
    const h = sim.hotspots[+li.dataset.h]; HSS.player.setTime(h.h * 60 + 30); UI.netMode = 'heat'; $('#vNet').value = 'heat'; UI.heatHour = h.h; HSS.drawNet('heat', h.h);
    if (h.ref?.kind === 'object') HSS.s3.select(h.ref, { focus: true });
    else if (h.ref) HSS.s3.select(h.ref, { focus: true });
    else if (h.section?.startsWith('F:')) { const [, part, f] = h.section.split(':'); const P = HSS.findPart(part); if (P) { HSS.s3.setFloor(HSS.globalFloor(P.part, +f)); HSS.s3.focusSel({ kind: 'part', id: part }); } }
  });
};
UI.hourRange = hs => { hs = [...new Set(hs)].sort((a, b) => a - b); const r = []; let s = hs[0], p = hs[0]; for (const h of hs.slice(1).concat([null])) { if (h === p + 1) { p = h; continue; } r.push(s === p ? U.hhmm(s * 60) + '–' + U.hhmm(s * 60 + 60) : U.hhmm(s * 60) + '–' + U.hhmm(p * 60 + 60)); s = p = h; } return r.join(', '); };
AT.fahrzeuge = (el, sim, prj) => {
  el.innerHTML = `<p class="note">Bedarf aus dem Lauf <b>ohne Fahrzeuglimit</b>. Zwei Sichtweisen: <b>Spitze</b> = gleichzeitig benötigte Fahrzeuge (keine Wartezeit), <b>Auslastung</b> = Einsatzstunden ÷ (Betriebszeit × 85 %). Empfehlung = max(Auslastung, 75 % der Spitze).</p>
  <table class="t"><tr><th>Transportmittel</th><th class="n">Touren</th><th class="n">Einsatz h</th><th class="n">Spitze</th><th class="n">Ausl.</th><th class="n">Empf.</th><th class="n">hinterlegt</th></tr>
  ${sim.bedarf.map(b => `<tr><td>${U.esc(b.name)}</td><td class="n">${b.trips}</td><td class="n">${U.fmt(b.busyH, 1)}</td><td class="n" title="um ${U.hhmm(b.spitzeUm)}">${b.spitze}</td><td class="n">${b.auslastung}</td><td class="n"><b>${b.empfehlung}</b></td><td class="n">${b.anzahl ?? '–'}</td></tr>`).join('')}</table>
  ${sim.bedarf.map(b => `<details><summary class="note"><b>${U.esc(b.name)}</b> – Rechenweg</summary><ol class="why"><li>Einsatzzeit = Σ (Beladen + Fahrt + Aufzug inkl. Warten + Entladen + Rückfahrt + Reinigung) = ${U.fmt(b.busyH, 2)} h/Tag</li><li>Auslastungsbasiert = ⌈${U.fmt(b.busyH, 2)} h ÷ (${b.schicht} h × 85 %)⌉ = ${b.auslastung}</li><li>Spitze: ${b.spitze} Fahrzeuge gleichzeitig um ${U.hhmm(b.spitzeUm)}</li><li>Empfehlung: max(${b.auslastung}; ⌈0,75 × ${b.spitze}⌉) = ${b.empfehlung}</li></ol></details>`).join('')}
  ${Object.values(sim.pools).filter(p => !p.keinFuhrpark).map(p => `<h4>${U.esc(p.name)} – gleichzeitig im Einsatz</h4><canvas class="chart" data-conc="${p.id}" style="height:80px"></canvas>${p.anzahl && !sim.unlimited ? `<div class="note">Mit ${p.anzahl} Fahrzeugen: Ø Wartezeit ${U.fmt(p.waitVehAvg, 1)} min, max. ${U.fmt(p.waitVehMax, 1)} min</div>` : ''}`).join('')}
  <div class="actions"><button id="fApply">Empfehlung in den Fuhrpark übernehmen</button></div>`;
  $$('[data-conc]', el).forEach(cv => { const p = sim.free.pools[cv.dataset.conc] || sim.pools[cv.dataset.conc]; const hrs = new Array(24).fill(0); p.conc.forEach((v, i) => (hrs[Math.floor(i / 12)] = Math.max(hrs[Math.floor(i / 12)], v))); UI.barChart(cv, [{ v: hrs, color: '#2D7694' }], { limit: U.byId(prj.transports, p.id)?.anzahl || undefined }); });
  $('#fApply', el).onclick = () => { HSS.change('Fuhrpark aus Simulation', p => { for (const b of sim.bedarf) { const t = U.byId(p.transports, b.id); if (t) t.anzahl = b.empfehlung; } }, { scope: 'none' }); UI.toast('Fuhrpark übernommen – Simulation erneut starten, um Wartezeiten zu prüfen'); };
};
AT.zeitplan = (el, sim, prj) => {
  const pools = Object.values(sim.pools).filter(p => !p.keinFuhrpark);
  const cur = UI.ganttPool && sim.pools[UI.ganttPool] ? UI.ganttPool : pools[0]?.id;
  el.innerHTML = `<p class="note">Zeitfensterplan: Jede Zeile ist ein Fahrzeug, jeder Balken eine Tour (Farbe = Materialgruppe, dunkle Kante = Reinigungsfahrt). Daraus ergibt sich die Gesamt-Zeitfensterplanung.</p>
  <select id="gP">${pools.map(p => opt(p.id, p.name, cur)).join('')}</select>
  <canvas class="chart" id="gC" style="margin-top:6px"></canvas>
  <div class="legend">${[...new Set(sim.trips.filter(t => t.pool === cur).map(t => t.material))].map(m => { const M = U.byId(prj.materials, m); return `<span><i style="background:${M?.farbe}"></i>${U.esc(M?.name)}</span>`; }).join('')}</div>
  <h4>Touren dieses Transportmittels</h4><table class="t"><tr><th>Start</th><th>Ende</th><th>Fzg.</th><th>Material</th><th class="n">m</th></tr>${sim.trips.filter(t => t.pool === cur && t.end !== undefined).slice(0, 150).map(t => `<tr><td>${U.hhmm(t.start)}</td><td>${U.hhmm(t.end)}</td><td>#${t.veh + 1}</td><td>${U.esc(U.byId(prj.materials, t.material)?.name || '')}${t.bundled ? ' <span class="pill">gebündelt</span>' : ''}</td><td class="n">${U.fmt(t.dist)}</td></tr>`).join('')}</table>`;
  if (cur) UI.gantt($('#gC', el), cur, sim, prj);
  $('#gP', el).onchange = e => { UI.ganttPool = e.target.value; UI.renderPanel(); };
};
AT.aufzuege = (el, sim) => {
  el.innerHTML = sim.lifts.map(l => `<h4>${U.esc(l.name)} <span class="note">· Spitze ${U.pct(l.peak)} um ${U.hhmm(l.peakH * 60)}${l.mixed.some(Boolean) ? ' · <span class="pill unrein">rein & unrein gemischt</span>' : ''}</span></h4><canvas class="chart" data-l="${l.id}" style="height:80px"></canvas>`).join('') || '<p class="note">Keine Aufzugsfahrten in der Simulation.</p>';
  $$('[data-l]', el).forEach(cv => { const l = sim.lifts.find(x => x.id === cv.dataset.l); UI.barChart(cv, [{ v: l.util, colorFn: AMP }], { pct: true, max: Math.max(1, l.peak), limit: 0.8 }); cv.onclick = () => HSS.s3.select({ kind: 'object', id: l.id }, { focus: true }); });
};
AT.fluesse = (el, sim, prj) => {
  el.innerHTML = `<table class="t"><tr><th>Fluss</th><th class="n">Touren</th><th class="n">Weg m</th><th class="n">Fahrt</th><th class="n">Ø Tour</th></tr>${prj.flows.filter(f => f.aktiv !== false).map(f => { const r = sim.flows[f.id] || {}; return `<tr><td>${U.esc(f.name)}${r.ok === false ? ' <span class="pill unrein">keine Route</span>' : ''}</td><td class="n">${r.trips || 0}</td><td class="n">${U.fmt(r.routeLen)}</td><td class="n">${U.dur(r.routeMin || 0)}</td><td class="n">${U.dur(r.dauerAvg || 0)}</td></tr>`; }).join('')}</table>`;
};
UI.exportCsv = (sim, prj) => {
  const rows = [['Bereich', 'Name', 'Stunde', 'Wert', 'Schwere']];
  for (const h of sim.hotspots) rows.push(['Hotspot ' + h.typ, h.name, UI.hourRange(h.hours || [h.h]), (h.util * 100).toFixed(0) + '%', h.sev]);
  for (const b of sim.bedarf) rows.push(['Fahrzeugbedarf', b.name, '', b.empfehlung, `Spitze ${b.spitze}, Auslastung ${b.auslastung}`]);
  for (const l of sim.lifts) l.util.forEach((u, h) => rows.push(['Aufzug', l.name, h, (u * 100).toFixed(0) + '%', '']));
  for (const f of prj.flows) { const r = sim.flows[f.id]; if (r) rows.push(['Fluss', f.name, '', r.trips, `${Math.round(r.routeLen)} m`]); }
  U.download('hss-bericht.csv', '﻿' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv');
};
})();
