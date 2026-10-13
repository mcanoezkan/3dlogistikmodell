/* =====================================================================
   HSS · tour.js – Stationsrundgang (Spielmodus)
   Eine oder mehrere Stationen wählen; die Kamera geht in Augenhöhe von Raum zu Raum,
   fährt zwischen Etagen mit dem Aufzug und erklärt Funktion, Ausstattung und Logistik.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const { THREE } = window.THREEX;
const EYE = 1.62, WALK = 1.5; // m/s
const $ = s => document.querySelector(s);

HSS.ROOMINFO = {
  stuetzpunkt: 'Zentrale der Station: Dokumentation, Übergaben, Telefon, Patientenrufanlage. Liegt mittig, damit alle Zimmer kurze Wege haben und der Flur einsehbar ist.',
  rein: 'Arbeitsraum rein: Lagerung von Verbandsmaterial, Infusionen und Sterilgut in Modulschränken (ISO 600 × 400), Vorbereitung von Infusionen. Wird von der Modulversorgung beliefert; streng getrennt vom unreinen Arbeitsraum.',
  unrein: 'Arbeitsraum unrein: Entsorgung, Steckbeckenspüle, Wäsche- und Abfallsammler. Hier startet die Entsorgung (Schmutzwäsche, Abfall). Hygiene: keine Lagerung reiner Materialien.',
  medikamente: 'Medikamentenraum: Stationsapotheke mit Medikamentenschränken und Kühlschrank (Kühlkette 2–8 °C). Ziel der Arzneimittelversorgung aus der Krankenhausapotheke.',
  lager: 'Lager für Pflegehilfsmittel, Wäschevorrat und Material, das nicht in den Arbeitsräumen steht.',
  geraete: 'Geräteraum: Rollstühle, Patientenlifter, Infusionsständer, EKG – Geräte, die nicht im Zimmer stehen, aber schnell verfügbar sein müssen.',
  arzt: 'Arztdienstraum: Befundung, Arztbriefe, Besprechungen in kleiner Runde.',
  personal: 'Personalaufenthalt: Pausenraum mit Küchenzeile, gesetzlich vorgeschrieben (Arbeitsstättenverordnung).',
  besprechung: 'Besprechung/Übergabe: Schichtübergaben, Visitenbesprechung, Angehörigengespräche.',
  bad: 'Pflegebad mit höhenverstellbarer Wanne für Patienten, die nicht im Zimmer duschen können.',
  entsorgung: 'Entsorgungsraum: Sammelpunkt für volle Abfallbehälter und Wäschesäcke bis zur Abholung (unreiner Fluss).',
  putz: 'Putzraum für die Unterhaltsreinigung mit Ausgussbecken und Reinigungswagen.',
  wc: 'WC für Personal und Besucher.',
  kueche: 'Stationsküche/Teeküche: Ausgabe der Speisen aus dem Tablettsystem, Getränke, Zwischenmahlzeiten. Ziel der Speisenversorgung.',
  aufenthalt: 'Aufenthaltsraum für mobile Patienten und Besucher.',
  untersuchung: 'Untersuchung/Behandlung: Verbandswechsel, Punktionen, Untersuchungen außerhalb des Patientenzimmers.',
  patient1: 'Einbettzimmer mit Nasszelle. Bett mit Versorgungsleiste (Sauerstoff, Druckluft, Vakuum, Strom, Rufanlage), Nachttisch, Schrank, Besucherstuhl.',
  patient2: 'Zweibettzimmer mit Nasszelle. Bettenabstand für Pflege von beiden Seiten; Türbreite 1,40 m für Bettentransport.',
  behandlung: 'Behandlungsplatz (liegend/sitzend), z. B. Dialyse, Infusionstherapie oder Notfallbehandlung.',
  warten: 'Wartebereich mit Sitzplätzen und Anmeldung.',
  op: 'OP-Saal: OP-Tisch, OP-Leuchte, Anästhesiearbeitsplatz, Deckenstative. Sterilgut kommt aus der ZSVA, benutztes Instrumentarium geht unrein zurück.',
  awt: 'AWT-Bahnhof: Sende- und Empfangsstationen der Automatischen Warentransportanlage, Pufferspeicher, Waschanlage für Container.',
  logistik: 'Logistikbereich der Ver- und Entsorgung.',
  buero: 'Büro.', technik: 'Technikraum.', sonstiges: 'Raum.'
};

const T = HSS.tour = { active: false };

// Haltepunkte einer Station: Stützpunkt zuerst, dann entlang des Flurs
function stationStops(st, allRooms) {
  const prj = HSS.project(); const stops = [];
  for (const pt of HSS.allParts(prj)) {
    const I = prj.interiors[pt.id] || {};
    for (const f of Object.keys(I)) for (const r of I[f].rooms) if (r.station === st.id && !['flur', 'nass'].includes(r.use)) stops.push({ r, pt, f: +f });
  }
  if (!stops.length) return [];
  const bb = G.bbox(stops.map(s => [s.r.x, s.r.z])), along = bb.w >= bb.d;
  stops.sort((a, b) => along ? a.r.x - b.r.x : a.r.z - b.r.z);
  let out = stops;
  if (!allRooms) { const seen = {}; out = stops.filter(s => { if (!s.r.use.startsWith('patient')) return true; seen[s.r.use] = (seen[s.r.use] || 0) + 1; return seen[s.r.use] <= 1; }); }
  const sp = out.findIndex(s => s.r.use === 'stuetzpunkt'); if (sp > 0) { const [x] = out.splice(sp, 1); out.unshift(x); }
  return out.map(s => Object.assign(s, { st }));
}
// Route in eine Zeitspur umwandeln (Sekunden)
function routeTrack(r, t0, track) {
  const net = HSS.net(); let t = t0; const es = r.edges; let i = 0;
  while (i < es.length) {
    const e = es[i];
    if (e.type === 'aufzug') {
      let j = i; while (j + 1 < es.length && es[j + 1].type === 'aufzug' && es[j + 1].lift === e.lift) j++;
      const A = net.nodes.get(r.nodes[i]), B = net.nodes.get(r.nodes[j + 1]), L = net.lifts.find(l => l.id === e.lift);
      const dur = 4 + Math.abs(B.gf - A.gf) * (L?.cfg.sekProGeschoss || 4) + 4;
      track.push({ t0: t, t1: t + dur, lift: e.lift, a: [A.x, A.y, A.z], b: [B.x, B.y, B.z], from: A.gf, to: B.gf }); t += dur; i = j + 1; continue;
    }
    const pts = [], durs = []; let j = i;
    while (j < es.length && es[j].type !== 'aufzug') { const n = net.nodes.get(r.nodes[j]); pts.push([n.x, n.y, n.z]); durs.push(es[j].len / (es[j].type === 'treppe' ? 0.7 : WALK)); j++; }
    const n = net.nodes.get(r.nodes[j]); pts.push([n.x, n.y, n.z]);
    // Letzte Teilstrecke (in den Raum hinein) nur bis kurz hinter die Tür
    if (j === es.length && pts.length >= 2) { const a = pts[pts.length - 2], b = pts[pts.length - 1]; pts[pts.length - 1] = [U.lerp(a[0], b[0], 0.55), b[1], U.lerp(a[2], b[2], 0.55)]; durs[durs.length - 1] *= 0.55; }
    const dur = U.sum(durs); track.push({ t0: t, t1: t + dur, pts, durs }); t += dur; i = j;
  }
  return t;
}
T.start = (stationIds, opts = {}) => {
  const prj = HSS.project();
  const stops = stationIds.flatMap(id => { const st = U.byId(prj.stations, id); return st ? stationStops(st, opts.allRooms) : []; });
  if (!stops.length) { HSS.ui.toast('Keine Räume gefunden – Station zuerst im Stationsplaner anlegen.'); return; }
  const net = HSS.net();
  const track = []; let t = 0;
  // Einstieg: über den Flur vor dem ersten Raum
  stops.forEach((s, k) => {
    if (k > 0) {
      const r = HSS.route(stops[k - 1].r.id, s.r.id, 'person', 'person');
      if (r.ok) t = routeTrack(r, t, track);
    } else {
      const n = net.nodes.get(net.placeNode.get(s.r.id)); const adj = net.adj.get(net.placeNode.get(s.r.id))?.[0];
      const o = adj ? net.nodes.get(adj.a === n.id ? adj.b : adj.a) : n;
      track.push({ t0: 0, t1: 0.01, pts: [[o.x, o.y, o.z], [U.lerp(o.x, n.x, 0.55), n.y, U.lerp(o.z, n.z, 0.55)]], durs: [0.01] }); t = 0.01;
    }
    const c = HSS.toWorld(s.pt, [s.r.x, s.r.z]), y = HSS.floorY(s.pt, s.f);
    track.push({ t0: t, t1: t + 0.001, stop: k, look: [c[0], y, c[1]] });
    s.trackIdx = track.length - 1; t += 0.001;
  });
  Object.assign(T, { active: true, stops, track, idx: 0, t: 0, auto: !!opts.auto, hold: 0, yawOff: 0, prevCut: HSS.view.cut });
  HSS.view.cut = 'halb';
  HSS.fpv.enterTour();
  T.render();
};
T.next = () => { const s = T.stops[T.idx + 1]; if (!s) return T.end(); T.idx++; T.atStop = false; T.t = T.track[T.stops[T.idx - 1].trackIdx].t0 + 0.002; T.render(); };
T.prev = () => { if (T.idx === 0) return; T.idx--; T.jump(T.idx); };
T.jump = k => { T.idx = k; const e = T.track[T.stops[k].trackIdx]; T.t = e.t0; T.atStop = true; T.hold = 0; T.render(); };
T.end = () => { if (!T.active) return; T.active = false; HSS.view.cut = T.prevCut || 'halb'; HSS.fpv.exit(); $('#tourCard').hidden = true; HSS.ui.refreshViewbar?.(); };
// Position/Blick zur Zeit t
T.pose = () => {
  const cand = T.track.filter(x => T.t >= x.t0 - 1e-9 && T.t <= x.t1 + 1e-9); let e = cand[cand.length - 1] || T.track[T.track.length - 1];
  if (e.stop !== undefined) {
    T.atStop = true; const prev = T.track[T.track.indexOf(e) - 1]; const p = prev.pts ? prev.pts[prev.pts.length - 1] : prev.b;
    return { x: p[0], y: p[1], z: p[2], look: e.look, stop: e.stop };
  }
  T.atStop = false;
  const k = (T.t - e.t0) / Math.max(1e-6, e.t1 - e.t0);
  if (e.lift) return { x: e.a[0], y: U.lerp(e.a[1], e.b[1], U.clamp(k, 0, 1)), z: e.a[2], lift: e.lift, from: e.from, to: e.to, k };
  let acc = 0, el = T.t - e.t0;
  for (let i = 0; i < e.pts.length - 1; i++) { const d = e.durs[i] || 0; if (el <= acc + d || i === e.pts.length - 2) { const q = d ? U.clamp((el - acc) / d, 0, 1) : 1, a = e.pts[i], b = e.pts[i + 1]; return { x: U.lerp(a[0], b[0], q), y: U.lerp(a[1], b[1], q), z: U.lerp(a[2], b[2], q), dir: Math.atan2(b[2] - a[2], b[0] - a[0]) }; } acc += d; }
  const p = e.pts[e.pts.length - 1]; return { x: p[0], y: p[1], z: p[2] };
};
T.update = (dt) => {
  if (!T.active) return null;
  const stopE = T.track[T.stops[T.idx].trackIdx];
  if (T.t < stopE.t0) { T.t = Math.min(stopE.t0, T.t + dt * 4); }
  else if (T.auto) { T.hold += dt; if (T.hold > 9) { T.hold = 0; T.next(); } }
  return T.pose();
};
// Karte mit Erklärungen
T.render = () => {
  const el = $('#tourCard'); const s = T.stops[T.idx]; if (!s) return;
  const prj = HSS.project(), r = s.r, I = HSS.interior(s.pt.id, s.f);
  const inside = prj.objects.filter(o => o.host?.part === s.pt.id && o.host.floor === s.f && Math.abs(o.x - r.x) <= r.w / 2 && Math.abs(o.z - r.z) <= r.d / 2);
  const cnt = {}; for (const o of inside) { const d = HSS.library.get(o.lib); if (d && !/^erschl\.tuer/.test(o.lib)) cnt[o.name || d.name] = (cnt[o.name || d.name] || 0) + 1; }
  const flows = prj.flows.filter(f => f.aktiv !== false && (f.von === r.id || f.nach === r.id));
  const mats = new Map(prj.materials.map(m => [m.id, m]));
  const st = s.st, stIdx = [...new Set(T.stops.map(x => x.st.id))];
  const roomsOfSt = T.stops.filter(x => x.st.id === st.id);
  el.hidden = false;
  el.innerHTML = `<div class="k">Rundgang · ${U.esc(st.name)} · ${HSS.floorName(HSS.globalFloor(s.pt, s.f))}${stIdx.length > 1 ? ` · Station ${stIdx.indexOf(st.id) + 1}/${stIdx.length}` : ''}</div>
   <h3>${U.esc(r.name || HSS.ROOMTYPES[r.use]?.name)}</h3>
   <p>${U.esc(HSS.ROOMINFO[r.use] || '')}</p>
   <div class="facts"><span><b>${U.fmt(r.w * r.d, 1)} m²</b> Fläche</span>${T.idx === 0 || T.stops[T.idx - 1].st.id !== st.id ? `<span><b>${st.betten || st.plaetze || '–'}</b> ${st.betten ? 'Betten' : 'Plätze'}</span>${st.calc?.deckung ? `<span><b>${U.pct(st.calc.deckung)}</b> Flächendeckung</span>` : ''}` : ''}</div>
   ${Object.keys(cnt).length ? `<div class="sub">Ausstattung</div><div class="eq">${Object.entries(cnt).map(([n, c]) => `<span>${c > 1 ? c + ' × ' : ''}${U.esc(n)}</span>`).join('')}</div>` : ''}
   ${flows.length ? `<div class="sub">Logistik an diesem Raum</div><ul class="fl">${flows.slice(0, 6).map(f => { const m = mats.get(f.material); return `<li><i style="background:${m?.farbe}"></i>${f.nach === r.id ? 'Anlieferung' : 'Abholung'}: ${U.esc(m?.name || f.name)} · ${U.fmt(HSS.flowPerDay(f), 1)} ${U.esc(m?.einheit || '')}/Tag · ${(f.fenster || []).map(([a, b]) => U.hhmm(a * 60) + '–' + U.hhmm(b * 60)).join(', ')}</li>`; }).join('')}</ul>` : ''}
   <div class="dots">${T.stops.map((x, i) => `<button data-j="${i}" class="${i === T.idx ? 'on' : i < T.idx ? 'done' : ''}" title="${U.esc(x.st.name + ': ' + (x.r.name || ''))}"></button>`).join('')}</div>
   <div class="row"><button id="tgPrev" ${T.idx ? '' : 'disabled'}>‹ Zurück</button><button class="primary" id="tgNext">${T.idx < T.stops.length - 1 ? 'Weiter ›' : 'Fertig'}</button><label class="chk" style="color:#fff"><input type="checkbox" id="tgAuto" ${T.auto ? 'checked' : ''}> automatisch</label><div class="sp"></div><button id="tgEnd">Beenden</button></div>
   <div class="hint">Maus ziehen: umsehen · Leertaste: weiter · Esc: beenden</div>`;
  el.querySelector('#tgPrev').onclick = T.prev; el.querySelector('#tgNext').onclick = T.next; el.querySelector('#tgEnd').onclick = T.end;
  el.querySelector('#tgAuto').onchange = e => { T.auto = e.target.checked; T.hold = 0; };
  el.querySelectorAll('[data-j]').forEach(b => b.onclick = () => T.jump(+b.dataset.j));
};
window.addEventListener('keydown', e => { if (!T.active) return; if (e.key === ' ') { e.preventDefault(); T.next(); } if (e.key === 'ArrowRight') T.next(); if (e.key === 'ArrowLeft') T.prev(); });

/* Auswahldialog: eine oder mehrere Stationen */
T.dialog = () => {
  const prj = HSS.project(), UI = HSS.ui;
  if (!prj.stations.length) return UI.toast('Noch keine Stationen – im Stationsplaner anlegen oder Demo laden.');
  UI.dialog(`<div class="dh"><h2>Stationsrundgang</h2><button class="x" data-close>×</button></div>
   <p class="note">Stationen wählen – der Rundgang führt in Augenhöhe durch alle Funktionsräume und erklärt Aufgabe, Ausstattung und Logistik. Bei mehreren Stationen geht es mit dem Aufzug weiter.</p>
   <div class="list" style="max-height:340px">${prj.stations.map(s => { const P = HSS.findPart(s.sel?.[0]?.part); return `<label class="li"><input type="checkbox" data-st="${s.id}"><span class="t">${U.esc(s.name)}</span><span class="s">${P ? U.esc(P.building.kurz) + ' ' + HSS.floorName(HSS.globalFloor(P.part, s.sel[0].floors[0])) : ''} · ${s.betten ? s.betten + ' Betten' : s.plaetze + ' Plätze'}</span></label>`; }).join('')}</div>
   <label class="chk"><input type="checkbox" id="tgAll"> alle Patientenzimmer zeigen (sonst je ein Beispiel)</label>
   <label class="chk"><input type="checkbox" id="tgAut"> automatisch weitergehen</label>
   <div class="actions"><button class="primary" id="tgGo">▶ Rundgang starten</button><button data-close>Abbrechen</button></div>`, d => {
    const first = d.querySelector('[data-st]'); if (first) first.checked = true;
    d.querySelector('#tgGo').onclick = () => { const ids = [...d.querySelectorAll('[data-st]')].filter(c => c.checked).map(c => c.dataset.st); if (!ids.length) return UI.toast('Mindestens eine Station wählen'); d.close(); T.start(ids, { allRooms: d.querySelector('#tgAll').checked, auto: d.querySelector('#tgAut').checked }); };
  });
};
})();
