/* =====================================================================
   HSS · sim.js – Material-, Waren- und Personenflüsse
   Materialgruppen, Fuhrpark, Regeln, Standardflüsse, ereignisdiskrete Tagessimulation,
   Fahrzeugbedarf, Zeitfensterplan, Engpässe (Hotspots) je Uhrzeit.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;

/* ---------- Stammdaten-Vorschläge ---------- */
HSS.REINHEIT = { rein: { name: 'rein', color: '#0A967A' }, unrein: { name: 'unrein', color: '#891F5E' }, neutral: { name: 'neutral', color: '#2D7694' }, person: { name: 'Person', color: '#7b5ea7' }, patient: { name: 'Patient', color: '#d9531e' } };
HSS.KAPAZITAET_H = { flur: 60, tunnel: 70, weg: 60, gehweg: 120, strasse: 150, zufahrt: 40, eingang: 60, bruecke: 50, awt: 30 };
HSS.ROLLEN = {
  apotheke: 'Apotheke', kueche: 'Zentralküche / Speisenversorgung', zentrallager: 'Zentrallager', zsva: 'ZSVA / AEMP', waescherei: 'Wäscheversorgung (Wäschelager/Wäscherei)', abfall: 'Abfallsammelstelle',
  labor: 'Zentrallabor', op: 'OP-Bereich', radiologie: 'Radiologie / Funktionsdiagnostik', bettenzentrale: 'Bettenzentrale', rampe: 'Warenannahme / Rampe', haupteingang: 'Haupteingang / Foyer',
  verwaltung: 'Verwaltung / Poststelle', zna: 'Zentrale Notaufnahme', waschanlage: 'Waschanlage (AWT/Wagen)', 'awt-station': 'AWT-Station', extern: 'Extern (Lieferant/Entsorger)'
};
HSS.defaultMaterials = () => [
  { id: 'm_speisen', name: 'Speisen (Tablettsystem)', reinheit: 'rein', farbe: '#f2994a', einheit: 'Tabletts', proLadung: 20, ladeMin: 3, entladeMin: 2, buendelbar: true },
  { id: 'm_geschirr', name: 'Speisengeschirr Rücklauf', reinheit: 'unrein', farbe: '#b9770e', einheit: 'Tabletts', proLadung: 20, ladeMin: 2, entladeMin: 2, buendelbar: true },
  { id: 'm_waesche_r', name: 'Wäsche rein', reinheit: 'rein', farbe: '#5dade2', einheit: 'kg', proLadung: 80, ladeMin: 3, entladeMin: 4, buendelbar: true },
  { id: 'm_waesche_u', name: 'Schmutzwäsche', reinheit: 'unrein', farbe: '#a04000', einheit: 'kg', proLadung: 60, ladeMin: 2, entladeMin: 2, buendelbar: true },
  { id: 'm_arznei', name: 'Arzneimittel', reinheit: 'rein', farbe: '#f4d03f', einheit: 'Boxen', proLadung: 6, ladeMin: 2, entladeMin: 3, buendelbar: true },
  { id: 'm_modul', name: 'Med. Sachbedarf (Modulversorgung)', reinheit: 'rein', farbe: '#2D7694', einheit: 'Modulwagen', proLadung: 1, ladeMin: 3, entladeMin: 8, buendelbar: true },
  { id: 'm_steril', name: 'Sterilgut', reinheit: 'rein', farbe: '#0A967A', einheit: 'Siebe', proLadung: 12, ladeMin: 3, entladeMin: 4, buendelbar: true },
  { id: 'm_instr_u', name: 'Instrumente unrein', reinheit: 'unrein', farbe: '#891F5E', einheit: 'Siebe', proLadung: 12, ladeMin: 2, entladeMin: 3, buendelbar: true },
  { id: 'm_abfall', name: 'Abfall', reinheit: 'unrein', farbe: '#5a6573', einheit: 'Behälter 240 l', proLadung: 4, ladeMin: 3, entladeMin: 3, buendelbar: true },
  { id: 'm_proben', name: 'Laborproben', reinheit: 'neutral', farbe: '#af7ac5', einheit: 'Proben', proLadung: 10, ladeMin: 0.5, entladeMin: 0.5, buendelbar: false },
  { id: 'm_post', name: 'Post & Akten', reinheit: 'neutral', farbe: '#85929e', einheit: 'Fächer', proLadung: 20, ladeMin: 1, entladeMin: 1, buendelbar: true },
  { id: 'm_patient', name: 'Patiententransport (liegend)', reinheit: 'patient', farbe: '#d9531e', einheit: 'Patienten', proLadung: 1, ladeMin: 5, entladeMin: 5, buendelbar: false },
  { id: 'm_betten', name: 'Betten zur Aufbereitung', reinheit: 'unrein', farbe: '#7d6608', einheit: 'Betten', proLadung: 1, ladeMin: 2, entladeMin: 2, buendelbar: false },
  { id: 'm_betten_r', name: 'Aufbereitete Betten', reinheit: 'rein', farbe: '#d4ac0d', einheit: 'Betten', proLadung: 1, ladeMin: 2, entladeMin: 2, buendelbar: false },
  { id: 'm_ware', name: 'Warenanlieferung extern', reinheit: 'rein', farbe: '#1f618d', einheit: 'Rollcontainer', proLadung: 1, ladeMin: 1.5, entladeMin: 1.5, buendelbar: true },
  { id: 'm_entsorgung', name: 'Entsorgung extern', reinheit: 'unrein', farbe: '#4d5656', einheit: 'Container', proLadung: 1, ladeMin: 10, entladeMin: 10, buendelbar: false },
  { id: 'm_personal', name: 'Personal (Schichtwechsel)', reinheit: 'person', farbe: '#7b5ea7', einheit: 'Personen', proLadung: 1, ladeMin: 0, entladeMin: 0, buendelbar: false },
  { id: 'm_besucher', name: 'Besucher', reinheit: 'person', farbe: '#a569bd', einheit: 'Personen', proLadung: 1, ladeMin: 0, entladeMin: 0, buendelbar: false }
];
HSS.defaultTransports = () => [
  { id: 't_hand', name: 'Hol- und Bringedienst (Handwagen)', mittel: 'hand', anzahl: null, kapazitaet: 1, schicht: [6, 20], buendeln: false },
  { id: 't_schlepper', name: 'Elektroschlepper (Routenzug, 4 Wagen)', mittel: 'schlepper', anzahl: null, kapazitaet: 4, schicht: [5, 21], buendeln: true },
  { id: 't_awt', name: 'AWT-Fahrzeuge', mittel: 'awt', anzahl: null, kapazitaet: 1, schicht: [0, 24], buendeln: false },
  { id: 't_lkw', name: 'LKW (Lieferanten/Entsorger)', mittel: 'lkw', anzahl: null, kapazitaet: 12, schicht: [5, 18], buendeln: true },
  { id: 't_bett', name: 'Patienten-/Bettentransportdienst', mittel: 'bett', anzahl: null, kapazitaet: 1, schicht: [6, 22], buendeln: false },
  { id: 't_person', name: 'Personen (zu Fuß)', mittel: 'person', anzahl: null, kapazitaet: 1, schicht: [0, 24], buendeln: false, keinFuhrpark: true },
  { id: 't_rohrpost', name: 'Rohrpostanlage', mittel: 'rohrpost', anzahl: null, kapazitaet: 1, schicht: [0, 24], buendeln: false, keinFuhrpark: true }
];

/* ---------- Standardflüsse (Vorlagen) ---------- */
// mengeProBett: Menge je belegtem Bett und Tag (Annahme, im Fluss änderbar)
HSS.STANDARDFLUESSE = [
  { id: 'speisen', name: 'Speisenversorgung (3 Mahlzeiten)', material: 'm_speisen', von: 'kueche', nach: 'station:kueche', mengeProBett: 3, fenster: [[6.5, 7.25], [11.25, 12], [17, 17.75]], transport: 't_schlepper', hinweis: '3 Tabletts je belegtem Bett und Tag' },
  { id: 'geschirr', name: 'Speisengeschirr Rücklauf', material: 'm_geschirr', von: 'station:kueche', nach: 'kueche', mengeProBett: 3, fenster: [[8.5, 9.25], [13, 13.75], [18.5, 19.25]], transport: 't_schlepper' },
  { id: 'waesche_r', name: 'Wäscheversorgung rein', material: 'm_waesche_r', von: 'waescherei', nach: 'station:rein', mengeProBett: 1.8, fenster: [[7, 10]], transport: 't_schlepper', hinweis: 'ca. 1,5–2,5 kg Wäsche je Pflegetag' },
  { id: 'waesche_u', name: 'Schmutzwäsche-Entsorgung', material: 'm_waesche_u', von: 'station:unrein', nach: 'waescherei', mengeProBett: 1.8, fenster: [[13, 15.5]], transport: 't_schlepper' },
  { id: 'arznei', name: 'Arzneimittelversorgung', material: 'm_arznei', von: 'apotheke', nach: 'station:medikamente', mengeProBett: 0.08, fenster: [[9, 11]], transport: 't_hand' },
  { id: 'modul', name: 'Modulversorgung Sachbedarf', material: 'm_modul', von: 'zentrallager', nach: 'station:rein', mengeProBett: 0.06, fenster: [[8, 11]], transport: 't_schlepper' },
  { id: 'steril', name: 'Sterilgutversorgung OP', material: 'm_steril', von: 'zsva', nach: 'op', mengeFix: 60, fenster: [[6, 7.5], [12, 14]], transport: 't_hand', hinweis: 'ca. 12 Siebe je OP-Saal und Tag (5 Säle)' },
  { id: 'instr_u', name: 'Instrumentenrücklauf OP → ZSVA', material: 'm_instr_u', von: 'op', nach: 'zsva', mengeFix: 60, fenster: [[9, 18]], transport: 't_hand' },
  { id: 'abfall', name: 'Abfallentsorgung Stationen', material: 'm_abfall', von: 'station:unrein', nach: 'abfall', mengeProBett: 0.06, fenster: [[14, 16]], transport: 't_schlepper', hinweis: 'ca. 1,5 kg Abfall je Pflegetag, 240-l-Behälter' },
  { id: 'proben', name: 'Laborproben', material: 'm_proben', von: 'station:stuetzpunkt', nach: 'labor', mengeProBett: 1.2, fenster: [[6, 9], [10, 16]], transport: 't_rohrpost' },
  { id: 'patient', name: 'Patiententransporte zur Diagnostik', material: 'm_patient', von: 'station:stuetzpunkt', nach: 'radiologie', mengeProBett: 0.18, fenster: [[8, 15]], transport: 't_bett', rueck: true },
  { id: 'betten', name: 'Bettenaufbereitung (Entlassungen)', material: 'm_betten', von: 'station:unrein', nach: 'bettenzentrale', mengeProBett: 'entlassung', fenster: [[10, 15]], transport: 't_bett' },
  { id: 'betten_r', name: 'Rücklauf aufbereiteter Betten', material: 'm_betten_r', von: 'bettenzentrale', nach: 'station:rein', mengeProBett: 'entlassung', fenster: [[12, 18]], transport: 't_bett' },
  { id: 'anlieferung', name: 'Warenanlieferung extern (LKW)', material: 'm_ware', von: 'extern', nach: 'rampe', mengeFix: 48, fenster: [[6, 10]], transport: 't_lkw', hinweis: 'gebündelte Anlieferung, 12 Rollcontainer je LKW' },
  { id: 'entsorgung', name: 'Abholung Abfall extern', material: 'm_entsorgung', von: 'abfall', nach: 'extern', mengeFix: 2, fenster: [[10, 12]], transport: 't_lkw' },
  { id: 'post', name: 'Post & Akten', material: 'm_post', von: 'verwaltung', nach: 'station:stuetzpunkt', mengeProStation: 1, fenster: [[10, 11]], transport: 't_hand' },
  { id: 'personal', name: 'Personal-Schichtwechsel', material: 'm_personal', von: 'haupteingang', nach: 'station:stuetzpunkt', mengeProBett: 0.9, fenster: [[5.6, 6.1], [13.4, 13.9], [21.4, 21.8]], transport: 't_person', hinweis: 'ca. 0,3 Pflegekräfte je Bett und Schicht' },
  { id: 'besucher', name: 'Besucherverkehr', material: 'm_besucher', von: 'haupteingang', nach: 'station:aufenthalt', mengeProBett: 0.7, fenster: [[14, 19]], transport: 't_person' }
];
HSS.ensureStammdaten = (prj = HSS.project()) => {
  if (!prj.materials.length) prj.materials = HSS.defaultMaterials();
  if (!prj.transports.length) prj.transports = HSS.defaultTransports();
};
HSS.placesByRole = (role, prj = HSS.project()) => HSS.places(prj).filter(p => p.role === role || p.use === role);
HSS.stationBeds = (st, prj = HSS.project()) => st.betten || 0;
// Vorlagen in konkrete Flüsse übersetzen
HSS.applyTemplates = (ids, opts = {}) => {
  const prj = HSS.project(), out = [], warn = [];
  HSS.ensureStammdaten(prj);
  const places = HSS.places(prj);
  const first = role => places.find(p => p.role === role || (p.kind === 'extern' && role === 'extern'));
  for (const id of ids) {
    const T = HSS.STANDARDFLUESSE.find(t => t.id === id); if (!T) continue;
    const pairs = [];
    const isSt = s => s.startsWith('station:');
    if (isSt(T.von) || isSt(T.nach)) {
      for (const st of prj.stations) {
        const use = (isSt(T.von) ? T.von : T.nach).split(':')[1];
        const sp = places.find(p => p.station === st.id && (p.use === use || p.role === use)) || places.find(p => p.station === st.id && p.use === 'stuetzpunkt');
        const other = first(isSt(T.von) ? T.nach : T.von);
        if (!sp) { warn.push(`${T.name}: Station „${st.name}“ hat keinen Raum „${(HSS.ROOMTYPES[use] || {}).name || use}“.`); continue; }
        if (!other) { warn.push(`${T.name}: Kein Ort mit Rolle „${HSS.ROLLEN[isSt(T.von) ? T.nach : T.von] || (isSt(T.von) ? T.nach : T.von)}“ – Rolle im Inspektor einem Raum/Objekt zuweisen.`); break; }
        const betten = HSS.stationBeds(st, prj), ausl = st.auslastung || 0.85, belegt = betten * ausl;
        let menge = T.mengeProStation ?? (T.mengeProBett === 'entlassung' ? belegt / Math.max(1, st.vwd || 5) : belegt * T.mengeProBett);
        pairs.push({ von: isSt(T.von) ? sp.id : other.id, nach: isSt(T.von) ? other.id : sp.id, menge: Math.round(menge * 10) / 10, label: st.name });
      }
    } else {
      const a = first(T.von), b = first(T.nach);
      if (!a || !b) { warn.push(`${T.name}: Ort mit Rolle „${HSS.ROLLEN[!a ? T.von : T.nach] || (!a ? T.von : T.nach)}“ fehlt.`); continue; }
      pairs.push({ von: a.id, nach: b.id, menge: T.mengeFix || 1, label: '' });
    }
    for (const p of pairs) out.push({ id: U.uid('flow'), name: T.name + (p.label ? ' · ' + p.label : ''), template: T.id, material: T.material, von: p.von, nach: p.nach, menge: p.menge, periode: 'tag', betriebstage: 7, fenster: U.clone(T.fenster), transport: opts.transport?.[T.id] || T.transport, fahrzeitMin: null, rueck: !!T.rueck, aktiv: true });
  }
  return { flows: out, warn };
};
HSS.flowPerDay = f => { const m = f.menge || 0; const td = f.betriebstage || 7; return f.periode === 'woche' ? m / td : f.periode === 'monat' ? m * 12 / 365 * 7 / td : f.periode === 'jahr' ? m / 365 * 7 / td : m; };

/* ---------- Simulation ---------- */
class Heap { constructor() { this.a = []; } push(x) { const a = this.a; a.push(x); let i = a.length - 1; while (i) { const p = (i - 1) >> 1; if (a[p].t < a[i].t || (a[p].t === a[i].t && a[p].n <= a[i].n)) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } } pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; const lt = (x, y) => a[x].t < a[y].t || (a[x].t === a[y].t && a[x].n < a[y].n); if (l < a.length && lt(l, m)) m = l; if (r < a.length && lt(r, m)) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; } get size() { return this.a.length; } }
class Resource {
  constructor(name, cap) { this.name = name; this.cap = cap; this.busy = 0; this.q = []; this.log = []; this.maxBusy = 0; this.units = []; }
}

HSS.simulate = (opts = {}) => {
  const prj = HSS.project();
  HSS.ensureStammdaten(prj);
  const net = HSS.net();
  const unlimited = !!opts.unlimited;
  const mats = new Map(prj.materials.map(m => [m.id, m])), pools = new Map(prj.transports.map(t => [t.id, t]));
  const evq = new Heap(); let seq = 0, now = 0;
  const at = (t, fn) => evq.push({ t, n: seq++, fn });
  const warn = [];
  // Ressourcen
  const R = { pool: new Map(), lift: new Map(), wash: new Map() };
  for (const t of prj.transports) R.pool.set(t.id, new Resource(t.name, t.keinFuhrpark || unlimited || !t.anzahl ? Infinity : t.anzahl));
  for (const L of net.lifts) if (L.role === 'aufzug') R.lift.set(L.id, new Resource(L.name, L.cfg.kabinen || 1));
  const acquire = (res, cb, info) => {
    if (res.busy < res.cap) { res.busy++; res.maxBusy = Math.max(res.maxBusy, res.busy); const unit = takeUnit(res); res.log.push([now, res.busy]); cb(0, unit); }
    else res.q.push({ t: now, cb, info });
  };
  const takeUnit = res => { let i = res.units.indexOf(false); if (i < 0) { res.units.push(true); i = res.units.length - 1; } else res.units[i] = true; return i; };
  const release = (res, unit) => {
    res.units[unit] = false;
    if (res.q.length) { const w = res.q.shift(); const u = takeUnit(res); res.log.push([now, res.busy]); w.cb(now - w.t, u); }
    else { res.busy--; res.log.push([now, res.busy]); }
  };
  // Ergebnisse
  const trips = [], edgeUse = new Map(), liftStats = new Map(), washStats = new Map();
  const hourOf = t => U.clamp(Math.floor(t / 60) % 24, 0, 23);
  // Wageneinheiten: Personen belasten Flure kaum, Betten und Routenzüge stärker
  const PCU = { person: 0.05, hand: 1, bett: 1.5, schlepper: 2, awt: 1, lkw: 1, rohrpost: 0 };
  const useEdge = (e, t, klasse, mittel) => {
    const cap = HSS.KAPAZITAET_H[e.type]; if (!cap) return; const w = PCU[mittel] ?? 1; if (!w) return;
    let u = edgeUse.get(e.id); if (!u) edgeUse.set(e.id, u = { e, h: new Array(24).fill(0), cls: Array.from({ length: 24 }, () => new Set()) });
    const h = hourOf(t); u.h[h] += w; if (w >= 1) u.cls[h].add(klasse);
  };
  const liftStat = id => liftStats.get(id) || (liftStats.set(id, { busy: new Array(24).fill(0), wait: new Array(24).fill(0), rides: new Array(24).fill(0), cls: Array.from({ length: 24 }, () => new Set()) }), liftStats.get(id));
  const addBusy = (arr, t0, t1) => { for (let t = t0; t < t1;) { const h = hourOf(t), end = Math.min(t1, (Math.floor(t / 60) + 1) * 60); arr[h] += end - t; t = end; } };

  // Aufträge erzeugen
  const orders = [];
  for (const f of prj.flows) {
    if (f.aktiv === false) continue;
    const m = mats.get(f.material), pool = pools.get(f.transport);
    if (!m || !pool) { warn.push(`Fluss „${f.name}“: Material oder Transportmittel fehlt.`); continue; }
    const perDay = HSS.flowPerDay(f); if (!(perDay > 0)) continue;
    const loads = Math.max(1, Math.ceil(perDay / (m.proLadung || 1)));
    const route = HSS.route(f.von, f.nach, pool.mittel, m.reinheit);
    if (!route.ok) { warn.push(`Fluss „${f.name}“: keine Route für ${HSS.MITTEL[pool.mittel]?.name || pool.mittel} (${m.reinheit}) – Wege, Aufzugsfreigaben oder AWT-Anbindung prüfen.`); continue; }
    const win = (f.fenster && f.fenster.length ? f.fenster : [pool.schicht || [6, 20]]).map(([a, b]) => [a * 60, b * 60]);
    const tot = U.sum(win.map(([a, b]) => Math.max(1, b - a)));
    for (let i = 0; i < loads; i++) {
      let pos = (i + 0.5) / loads * tot, t = win[0][0];
      for (const [a, b] of win) { const l = Math.max(1, b - a); if (pos <= l) { t = a + pos; break; } pos -= l; }
      orders.push({ flow: f, mat: m, pool, t, units: Math.min(m.proLadung || 1, perDay - i * (m.proLadung || 1)), route });
    }
  }
  // Bündelung: gleicher Start, gleiche Reinheit, gleiches Transportmittel, Abfahrt im selben 30-min-Raster
  const tours = [];
  const groups = new Map();
  for (const o of orders) {
    if (o.pool.buendeln && o.mat.buendelbar !== false && o.pool.kapazitaet > 1) {
      const k = [o.pool.id, o.flow.von, o.mat.reinheit, Math.floor(o.t / 30)].join('|');
      (groups.get(k) || groups.set(k, []).get(k)).push(o);
    } else tours.push({ t: o.t, pool: o.pool, stops: [o], reinheit: o.mat.reinheit });
  }
  for (const list of groups.values()) {
    list.sort((a, b) => a.t - b.t);
    for (let i = 0; i < list.length; i += list[0].pool.kapazitaet) {
      const chunk = list.slice(i, i + list[0].pool.kapazitaet);
      tours.push({ t: chunk[0].t, pool: chunk[0].pool, stops: chunk, reinheit: chunk[0].mat.reinheit, bundled: chunk.length > 1 });
    }
  }
  tours.sort((a, b) => a.t - b.t);

  // Reinigungsregeln je Transportmittel
  const rulesFor = pool => prj.rules.filter(r => r.aktiv !== false && (r.transport === pool.id || r.transport === pool.mittel));
  const vehTrips = new Map();

  // Ablauf einer Tour als Generator: yield {wait}, {acquire}, {release}
  function* tourProc(T, trip) {
    const pool = T.pool, M = HSS.MITTEL[pool.mittel] || HSS.MITTEL.hand;
    const veh = yield { acquire: R.pool.get(pool.id), kind: 'veh' };
    trip.veh = veh.unit; trip.waitVeh = veh.wait; trip.start = now;
    const origin = T.stops[0].flow.von;
    let here = origin;
    // Beladen
    const loadMin = U.sum(T.stops.map(s => s.mat.ladeMin || 0));
    trip.track.push({ t: now, place: here });
    yield { wait: loadMin, phase: 'Beladen' };
    // Ziele in Nächster-Nachbar-Reihenfolge
    const rest = T.stops.slice();
    while (rest.length) {
      rest.sort((a, b) => HSS.route(here, a.flow.nach, pool.mittel, T.reinheit).timeMin - HSS.route(here, b.flow.nach, pool.mittel, T.reinheit).timeMin);
      const s = rest.shift();
      yield* travel(here, s.flow.nach, s.flow.fahrzeitMin, T, trip, M);
      here = s.flow.nach;
      yield { wait: s.mat.entladeMin || 0, phase: 'Entladen' };
      trip.stops.push({ place: here, t: now, flow: s.flow.id });
    }
    // Rückfahrt (Patienten: Rücktransport nach Untersuchungsdauer simuliert als leere Rückfahrt)
    const needReturn = !pool.keinFuhrpark && pool.mittel !== 'rohrpost';
    // Reinigungsregeln
    const rules = rulesFor(pool); let washed = false;
    const n = (vehTrips.get(pool.id + '#' + trip.veh) || 0) + 1; vehTrips.set(pool.id + '#' + trip.veh, n);
    for (const r of rules) {
      const due = (r.typ === 'reinigungNachUnrein' && T.reinheit === 'unrein') || (r.typ === 'reinigungNachN' && r.n > 0 && n % r.n === 0);
      if (!due || washed || !r.ziel) continue;
      yield* travel(here, r.ziel, null, Object.assign({}, T, { reinheit: 'unrein' }), trip, M);
      here = r.ziel;
      const wr = R.wash.get(r.ziel) || (R.wash.set(r.ziel, new Resource('Waschanlage', r.plaetze || 1)), R.wash.get(r.ziel));
      const w = yield { acquire: wr, kind: 'wash' };
      const t0 = now; yield { wait: r.dauerMin || 2, phase: 'Reinigung' }; yield { release: wr, unit: w.unit };
      const ws = washStats.get(r.ziel) || (washStats.set(r.ziel, { busy: new Array(24).fill(0), n: 0, wait: 0 }), washStats.get(r.ziel)); addBusy(ws.busy, t0, now); ws.n++; ws.wait += w.wait;
      trip.wash = (trip.wash || 0) + 1; washed = true;
    }
    if (needReturn && here !== origin) yield* travel(here, origin, T.stops[0].flow.fahrzeitMin, Object.assign({}, T, { reinheit: washed ? 'rein' : T.reinheit, empty: true }), trip, M);
    trip.end = now;
    yield { release: R.pool.get(pool.id), unit: trip.veh };
  }
  function* travel(a, b, fixMin, T, trip, M) {
    const r = HSS.route(a, b, T.pool.mittel, T.reinheit === 'neutral' ? 'neutral' : T.reinheit);
    if (!r.ok) { trip.err = `keine Route ${a} → ${b}`; return; }
    if (fixMin) { // hinterlegte Fahrzeit (z. B. externe Strecke)
      trip.track.push({ t: now, pts: r.pts, t1: now + fixMin }); trip.dist += r.len;
      yield { wait: fixMin, phase: 'Fahrt (hinterlegt)' }; return;
    }
    let i = 0;
    const es = r.edges;
    while (i < es.length) {
      const e = es[i];
      if (e.type === 'aufzug') {
        // zusammenhängende Aufzugsfahrt
        let j = i; while (j + 1 < es.length && es[j + 1].type === 'aufzug' && es[j + 1].lift === e.lift) j++;
        const L = net.lifts.find(l => l.id === e.lift), res = R.lift.get(e.lift);
        const fromN = net.nodes.get(r.nodes[i]), toN = net.nodes.get(r.nodes[j + 1]);
        const floors = Math.abs(toN.gf - fromN.gf);
        let hold = (L.cfg.tuerS + floors * L.cfg.sekProGeschoss) / 60;
        if ((T.reinheit === 'person' || T.reinheit === 'patient') && T.pool.mittel === 'person') hold /= Math.min(4, L.cfg.kapazitaet || 1);
        const ls = liftStat(e.lift);
        const t0w = now;
        const g = yield { acquire: res, kind: 'lift' };
        ls.wait[hourOf(t0w)] += g.wait; trip.waitLift += g.wait;
        const t0 = now;
        trip.track.push({ t: now, pts: [[fromN.x, fromN.y, fromN.z], [toN.x, toN.y, toN.z]], t1: now + hold, lift: e.lift, from: fromN.gf, to: toN.gf });
        yield { wait: hold, phase: 'Aufzug' };
        addBusy(ls.busy, t0, now); ls.rides[hourOf(t0)]++; ls.cls[hourOf(t0)].add(T.reinheit);
        yield { release: res, unit: g.unit };
        i = j + 1; continue;
      }
      // horizontale Teilstrecke bis zum nächsten Aufzug
      let j = i, len = 0; const pts = [];
      while (j < es.length && es[j].type !== 'aufzug') {
        const ee = es[j];
        let v = M.v; if (ee.type === 'treppe') v = 0.6; if (ee.type === 'strasse' || ee.type === 'zufahrt') v = Math.max(M.v, T.pool.mittel === 'lkw' ? 6 : M.v);
        if (ee.type === 'flur' && T.pool.mittel === 'schlepper') v = 1.4;
        const n0 = net.nodes.get(r.nodes[j]);
        pts.push([n0.x, n0.y, n0.z, ee.len / v / 60]);
        len += ee.len; useEdge(ee, now + U.sum(pts.slice(0, -1).map(p => p[3])), T.reinheit, T.pool.mittel);
        j++;
      }
      const nEnd = net.nodes.get(r.nodes[j]); pts.push([nEnd.x, nEnd.y, nEnd.z, 0]);
      const dur = U.sum(pts.map(p => p[3]));
      trip.track.push({ t: now, pts: pts.map(p => p.slice(0, 3)), durs: pts.map(p => p[3]), t1: now + dur });
      trip.dist += len;
      yield { wait: dur, phase: 'Fahrt' };
      i = j;
    }
  }
  // Prozesse starten
  const run = (gen, trip) => {
    const step = (val) => {
      const r = gen.next(val);
      if (r.done) return;
      const y = r.value;
      if (y.wait !== undefined) at(now + Math.max(0, y.wait), () => step());
      else if (y.acquire) acquire(y.acquire, (wait, unit) => step({ wait, unit }));
      else if (y.release) { release(y.release, y.unit); step(); }
    };
    step();
  };
  for (const T of tours) {
    const trip = { id: trips.length, pool: T.pool.id, mittel: T.pool.mittel, reinheit: T.reinheit, flows: T.stops.map(s => s.flow.id), material: T.stops[0].mat.id, planned: T.t, track: [], stops: [], dist: 0, waitLift: 0, waitVeh: 0, bundled: !!T.bundled, units: U.sum(T.stops.map(s => s.units)) };
    trips.push(trip);
    at(T.t, () => run(tourProc(T, trip), trip));
  }
  let guard = 0;
  while (evq.size && guard++ < 2e6) { const ev = evq.pop(); now = ev.t; ev.fn(); }

  /* ---------- Auswertung ---------- */
  const res = { at: new Date().toISOString(), unlimited, trips, warn, pools: {}, lifts: [], edges: [], hotspots: [], flows: {}, wash: [] };
  for (const t of prj.transports) {
    const rs = R.pool.get(t.id), my = trips.filter(x => x.pool === t.id && x.end !== undefined);
    if (!my.length) continue;
    const busy = new Array(24).fill(0); for (const x of my) addBusy(busy, x.start, x.end);
    // gleichzeitig im Einsatz (Zeitverlauf in 5-min-Schritten)
    const conc = new Array(288).fill(0); for (const x of my) for (let k = Math.floor(x.start / 5); k < Math.min(288, Math.ceil(x.end / 5)); k++) conc[k]++;
    const peak = Math.max(...conc), peakAt = conc.indexOf(peak) * 5;
    const schicht = (t.schicht?.[1] ?? 20) - (t.schicht?.[0] ?? 6);
    const busyH = U.sum(busy) / 60, ziel = 0.85;
    res.pools[t.id] = {
      id: t.id, name: t.name, mittel: t.mittel, keinFuhrpark: !!t.keinFuhrpark, trips: my.length, busy, busyH, peak, peakAt, conc,
      bedarfAuslastung: Math.ceil(busyH / (schicht * ziel) - 1e-9), bedarfSpitze: peak, schicht, ziel,
      waitVehAvg: U.sum(my.map(x => x.waitVeh)) / my.length, waitVehMax: Math.max(...my.map(x => x.waitVeh)), anzahl: t.anzahl,
      distKm: U.sum(my.map(x => x.dist)) / 1000, washes: U.sum(my.map(x => x.wash || 0)), units: rs.units.length
    };
  }
  for (const L of net.lifts) {
    const s = liftStats.get(L.id); if (!s) continue;
    const cap = 60 * (L.cfg.kabinen || 1);
    const util = s.busy.map(b => b / cap), mixed = s.cls.map(c => c.has('rein') && c.has('unrein'));
    res.lifts.push({ id: L.id, name: L.name, util, wait: s.wait.map((w, h) => s.rides[h] ? w / s.rides[h] : 0), rides: s.rides, peak: Math.max(...util), peakH: util.indexOf(Math.max(...util)), mixed, typ: L.cfg.typ });
  }
  // Abschnitte: Kanten nach Weg/Bauteil-Geschoss/Brücke zusammenfassen
  const sections = new Map();
  for (const u of edgeUse.values()) {
    const e = u.e; const A = net.nodes.get(e.a);
    let key, name;
    if (e.path) { const p = U.byId(prj.paths, e.path); key = 'P:' + e.path; name = p?.name || 'Weg'; }
    else if (e.bridge) { const b = U.byId(prj.bridges, e.bridge); key = 'B:' + e.bridge; name = b?.name || 'Brücke'; }
    else if (A.part !== undefined) { const P = HSS.findPart(A.part, prj); key = 'F:' + A.part + ':' + A.floor; name = P ? `${P.building.kurz || P.building.name} · ${P.part.name} · ${HSS.floorName(HSS.globalFloor(P.part, A.floor, prj))} · Flur` : 'Flur'; }
    else { key = 'X:' + e.type; name = ({ awt: 'AWT-Anbindung der Stationen', eingang: 'Gebäudeeingänge', zugang: 'Aufzugsvorplätze' })[e.type] || e.type; }
    let s = sections.get(key); if (!s) sections.set(key, s = { key, name, type: e.type, cap: HSS.KAPAZITAET_H[e.type], h: new Array(24).fill(0), mixed: new Array(24).fill(false), edges: [] });
    s.edges.push(e.id); for (let h = 0; h < 24; h++) { s.h[h] = Math.max(s.h[h], u.h[h]); if (u.cls[h].has('rein') && u.cls[h].has('unrein')) s.mixed[h] = true; }
  }
  res.sections = [...sections.values()].map(s => Object.assign(s, { util: s.h.map(v => v / s.cap), peak: Math.max(...s.h) / s.cap, peakH: s.h.indexOf(Math.max(...s.h)) }));
  res.edgeUse = [...edgeUse.values()].map(u => ({ id: u.e.id, util: u.h.map(v => v / HSS.KAPAZITAET_H[u.e.type]) }));
  for (const [id, w] of washStats) { const pl = HSS.places(prj).find(p => p.id === id); res.wash.push({ id, name: pl?.name || 'Waschanlage', util: w.busy.map(b => b / 60), n: w.n, waitAvg: w.n ? w.wait / w.n : 0 }); }
  // Flüsse
  for (const f of prj.flows) {
    const my = trips.filter(x => x.flows.includes(f.id) && x.end !== undefined);
    const r = HSS.route(f.von, f.nach, pools.get(f.transport)?.mittel, mats.get(f.material)?.reinheit);
    res.flows[f.id] = { trips: my.length, routeLen: r.len, routeMin: r.timeMin, ok: r.ok, lifts: r.lifts.length, dauerAvg: my.length ? U.sum(my.map(x => x.end - x.start)) / my.length : 0 };
  }
  // Hotspots
  const sev = u => (u >= 1 ? 'hoch' : u >= 0.8 ? 'mittel' : 'niedrig');
  for (const L of res.lifts) {
    L.util.forEach((u, h) => { if (u >= 0.6 || L.wait[h] >= 1.5) res.hotspots.push({ typ: 'Aufzug', ref: { kind: 'object', id: L.id }, name: L.name, h, util: u, wait: L.wait[h], sev: sev(Math.max(u, L.wait[h] >= 3 ? 1 : L.wait[h] >= 1.5 ? 0.8 : 0)) }); });
    L.mixed.forEach((m, h) => { if (m) res.hotspots.push({ typ: 'Hygiene', ref: { kind: 'object', id: L.id }, name: L.name + ' – rein und unrein in derselben Stunde', h, util: L.util[h], sev: 'mittel', hygiene: true }); });
  }
  for (const s of res.sections) {
    s.util.forEach((u, h) => { if (u >= 0.6) res.hotspots.push({ typ: s.type === 'flur' ? 'Flur' : s.type === 'bruecke' ? 'Brücke' : 'Weg', ref: s.key.startsWith('P:') ? { kind: 'path', id: s.key.slice(2) } : s.key.startsWith('B:') ? { kind: 'bridge', id: s.key.slice(2) } : null, name: s.name, h, util: u, sev: sev(u), section: s.key }); });
    s.mixed.forEach((m, h) => { if (m && (s.type === 'flur' || s.type === 'bruecke')) res.hotspots.push({ typ: 'Hygiene', name: s.name + ' – Kreuzung rein/unrein', h, util: s.util[h], sev: 'niedrig', hygiene: true, section: s.key }); });
  }
  for (const w of res.wash) w.util.forEach((u, h) => { if (u >= 0.6) res.hotspots.push({ typ: 'Waschanlage', name: w.name, h, util: u, sev: sev(u), ref: { kind: 'object', id: w.id } }); });
  for (const p of Object.values(res.pools)) if (!p.keinFuhrpark && p.anzahl && p.waitVehMax > 5) res.hotspots.push({ typ: 'Fuhrpark', name: `${p.name}: Wartezeit auf Fahrzeug bis ${U.fmt(p.waitVehMax, 0)} min`, h: Math.floor(p.peakAt / 60), util: p.peak / p.anzahl, sev: p.waitVehMax > 15 ? 'hoch' : 'mittel' });
  // je Hotspot nur die Stunde mit dem höchsten Wert behalten, aber Zeitraum angeben
  const merged = new Map();
  for (const h of res.hotspots) { const k = h.typ + '|' + h.name; const m = merged.get(k); if (!m) merged.set(k, Object.assign({ hours: [h.h] }, h)); else { m.hours.push(h.h); if ((h.util || 0) > (m.util || 0)) Object.assign(m, h, { hours: m.hours }); } }
  const rank = { hoch: 0, mittel: 1, niedrig: 2 };
  res.hotspots = [...merged.values()].sort((a, b) => rank[a.sev] - rank[b.sev] || (b.util || 0) - (a.util || 0));
  res.totals = { trips: trips.length, distKm: U.sum(trips.map(t => t.dist)) / 1000, waitLift: U.sum(trips.map(t => t.waitLift)), bundled: trips.filter(t => t.bundled).length, washes: U.sum(trips.map(t => t.wash || 0)) };
  return res;
};

// Fahrzeugbedarf: 1. Lauf ohne Begrenzung → Bedarf; 2. Lauf mit hinterlegtem Fuhrpark (falls gesetzt)
HSS.runSimulation = () => {
  const free = HSS.simulate({ unlimited: true });
  const prj = HSS.project();
  const limited = prj.transports.some(t => t.anzahl && !t.keinFuhrpark) ? HSS.simulate({ unlimited: false }) : null;
  const res = limited || free;
  res.bedarf = Object.values(free.pools).filter(p => !p.keinFuhrpark).map(p => ({ id: p.id, name: p.name, mittel: p.mittel, spitze: p.bedarfSpitze, spitzeUm: p.peakAt, auslastung: p.bedarfAuslastung, empfehlung: Math.max(p.bedarfAuslastung, Math.ceil(p.bedarfSpitze * 0.75)), busyH: p.busyH, schicht: p.schicht, trips: p.trips, anzahl: U.byId(prj.transports, p.id)?.anzahl || null }));
  res.free = free;
  HSS.state.sim = res;
  HSS.emit('sim', res);
  return res;
};

/* ---------- Wiedergabe der Simulation in 3D ---------- */
const { THREE } = window.THREEX;
HSS.player = {
  t: 360, playing: false, speed: 60, agents: new Map(), heatHour: null,
  setTime(t) { this.t = U.clamp(t, 0, 1440); HSS.emit('simtime', this.t); },
  play(on = !this.playing) { this.playing = on; HSS.emit('simplay', on); },
  clear() { const L = HSS.s3.layers.agents; for (const a of this.agents.values()) L.remove(a.obj); this.agents.clear(); },
  // Position eines Trips zur Zeit t
  posAt(trip, t) {
    let seg = null;
    for (const s of trip.track) { if (s.pts && t >= s.t && t <= s.t1) { seg = s; break; } }
    if (!seg) {
      // Stillstand an letzter Position
      let last = null; for (const s of trip.track) if (s.t <= t && s.pts) last = s;
      if (!last) { const pl = trip.track[0]?.place && HSS.net().nodes.get(HSS.net().placeNode.get(trip.track[0].place)); return pl ? { x: pl.x, y: pl.y, z: pl.z, ang: 0, moving: false } : null; }
      const p = last.pts[last.pts.length - 1]; return { x: p[0], y: p[1], z: p[2], ang: last._ang || 0, moving: false };
    }
    const k = (t - seg.t) / Math.max(1e-6, seg.t1 - seg.t);
    if (seg.lift) { const a = seg.pts[0], b = seg.pts[1]; return { x: a[0], y: U.lerp(a[1], b[1], U.clamp(k, 0, 1)), z: a[2], ang: seg._ang || 0, lift: seg.lift, from: seg.from, to: seg.to, moving: true }; }
    const durs = seg.durs || seg.pts.map(() => (seg.t1 - seg.t) / Math.max(1, seg.pts.length - 1));
    let acc = 0, el = t - seg.t;
    for (let i = 0; i < seg.pts.length - 1; i++) {
      const d = durs[i] || 0;
      if (el <= acc + d || i === seg.pts.length - 2) { const q = d ? U.clamp((el - acc) / d, 0, 1) : 1; const a = seg.pts[i], b = seg.pts[i + 1]; const ang = Math.atan2(b[2] - a[2], b[0] - a[0]); if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.05) seg._ang = ang; return { x: U.lerp(a[0], b[0], q), y: U.lerp(a[1], b[1], q), z: U.lerp(a[2], b[2], q), ang: seg._ang ?? ang, moving: true }; }
      acc += d;
    }
    return null;
  },
  update(dt) {
    const sim = HSS.state.sim; if (!sim) return;
    if (this.playing) { this.t += dt * this.speed / 60; if (this.t >= 1440) { this.t = 1440; this.play(false); } HSS.emit('simtime', this.t); }
    const L = HSS.s3.layers.agents, V = HSS.view;
    const active = new Set();
    const prj = HSS.project();
    for (const tr of sim.trips) {
      if (tr.start === undefined || tr.end === undefined || this.t < tr.start || this.t > tr.end) continue;
      const p = this.posAt(tr, this.t); if (!p) continue;
      active.add(tr.id);
      let a = this.agents.get(tr.id);
      if (!a) {
        const M = HSS.MITTEL[tr.mittel] || HSS.MITTEL.hand, mat = U.byId(prj.materials, tr.material);
        const obj = new THREE.Group();
        if (M.modell) obj.add(HSS.library.build(M.modell));
        if (M.wagen || tr.mittel === 'awt' || tr.mittel === 'schlepper') {
          const lib = tr.mittel === 'awt' ? 'awt.container' : (/speisen|geschirr/i.test(mat?.name) ? 'log.speisenwagen' : /wäsche/i.test(mat?.name) ? (tr.reinheit === 'unrein' ? 'log.waeschewagen.unrein' : 'log.waeschewagen.rein') : /steril|instrument/i.test(mat?.name) ? (tr.reinheit === 'unrein' ? 'log.instrumentenwagen.unrein' : 'log.sterilgutwagen') : /abfall/i.test(mat?.name) ? 'log.abfall240' : 'log.modulwagen');
          const w = HSS.library.build(lib); w.position.z = tr.mittel === 'awt' ? 0 : tr.mittel === 'schlepper' ? -1.9 : 0.85; if (tr.mittel === 'awt') w.position.y = 0.3; obj.add(w);
          if (tr.mittel === 'schlepper') { const w2 = HSS.library.build(lib); w2.position.z = -3.4; obj.add(w2); }
        }
        // Farbmarker (Materialgruppe)
        const mk = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: mat?.farbe || '#2D7694' })); mk.position.y = tr.mittel === 'lkw' ? 4.4 : 2.35; obj.add(mk);
        obj.userData = { trip: tr.id };
        L.add(obj); a = { obj, phase: Math.random() * 6 }; this.agents.set(tr.id, a);
      }
      a.obj.position.set(p.x, p.y, p.z);
      a.obj.rotation.y = Math.PI / 2 - p.ang;
      a.p = p;
      if (p.moving) { a.phase += dt * 8; a.obj.traverse(o => { if (o.userData.swing) HSS.library.animateSwing(o, a.phase, 0.55); }); }
      // In der Ebenenansicht nur Agenten der sichtbaren Ebene
      a.obj.visible = V.floor === null ? true : Math.abs(p.y - HSS.player.floorY(V.floor, p)) < 2.2 || !!p.lift;
    }
    for (const [id, a] of this.agents) if (!active.has(id)) { L.remove(a.obj); this.agents.delete(id); }
  },
  floorY(gf, p) { for (const pt of HSS.allParts()) { const f = HSS.localFloor(pt, gf); if (f !== null && HSS.geo.pointIn(HSS.toLocal(pt, [p.x, p.z]), HSS.partFootprintLocal(pt).outer)) return HSS.floorY(pt, f); } return p.y; }
};
HSS.on('frame', dt => HSS.player.update(dt));

/* Netz- und Heatmap-Overlay */
HSS.drawNet = (mode = 'aus', hour = null) => {
  const L = HSS.s3.layers.net; while (L.children.length) L.remove(L.children[0]);
  if (mode === 'aus') return;
  const net = HSS.net(), sim = HSS.state.sim, V = HSS.view;
  const util = new Map(); if (sim && mode === 'heat') for (const e of sim.edgeUse) util.set(e.id, hour === null ? Math.max(...e.util) : e.util[hour]);
  const col = u => new THREE.Color().setHSL(U.clamp(0.33 - u * 0.33, 0, 0.33), 0.85, 0.48);
  const pos = [], cols = [];
  const TYPECOL = { flur: '#2D7694', aufzug: '#0A223C', treppe: '#5a6573', awt: '#f2c94c', tunnel: '#8e8e8e', bruecke: '#0A967A', strasse: '#444', zufahrt: '#666', weg: '#9a8f7a', gehweg: '#b0a58e', eingang: '#144477', zugang: '#144477', anbindung: '#9aa1aa' };
  for (const e of net.edges) {
    const A = net.nodes.get(e.a), B = net.nodes.get(e.b);
    if (V.floor !== null && e.type !== 'aufzug') { const gfA = A.gf ?? 0; if (A.gf !== undefined && A.gf !== V.floor) continue; if (A.gf === undefined && V.floor !== 0 && !(V.floor < 0 && (e.type === 'awt' || e.type === 'tunnel'))) continue; }
    let c;
    if (mode === 'heat') { const u = util.get(e.id); if (u === undefined) { if (!['flur', 'aufzug', 'awt', 'tunnel', 'weg', 'bruecke'].includes(e.type)) continue; c = new THREE.Color('#c9d1d9'); } else c = col(u); }
    else c = new THREE.Color(TYPECOL[e.type] || '#888');
    pos.push(A.x, A.y + 0.35, A.z, B.x, B.y + 0.35, B.z); cols.push(c.r, c.g, c.b, c.r, c.g, c.b);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.9 })); m.renderOrder = 5; L.add(m);
  // Aufzüge als Säulen mit Auslastungsfarbe
  if (mode === 'heat' && sim) for (const l of sim.lifts) {
    const N = net.lifts.find(x => x.id === l.id); if (!N) continue;
    const u = hour === null ? l.peak : l.util[hour];
    const ys = N.stops.map(gf => net.nodes.get(`L:${N.id}@${gf}`)?.y ?? 0);
    const h = Math.max(...ys) - Math.min(...ys) + 3;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h, 16), new THREE.MeshBasicMaterial({ color: col(u), transparent: true, opacity: 0.55, depthTest: false }));
    c.position.set(N.x, Math.min(...ys) + h / 2, N.z); c.renderOrder = 6; L.add(c);
  }
};
})();
