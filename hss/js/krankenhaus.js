/* =====================================================================
   HSS · krankenhaus.js – Klinik-Planer: ganzes Krankenhaus automatisch planen
   1. Größe und Profil: Bettenzahl, Versorgungsstufe, Fachabteilungen
   2. Raumprogramm aller Funktionsbereiche nach DIN 13080 (Kennwerte je Bett,
      Größenordnungen aus Musterraumprogrammen der Länder, Annahmen gekennzeichnet)
   3. Planungstafel: Funktionsbereiche als Karten auf die Geschosse der Gebäude
      verteilen – automatisch (Ebenen-Vorlieben und Nachbarschaften) oder per Ziehen
   4. Planen: jeder Bereich wird in seinem Abschnitt der Etage mit Fluren, Kern,
      Hallen und vollständiger Einrichtung angelegt; der Rest der Etage bleibt frei
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const C = Math.ceil, R = Math.round, MX = Math.max;

/* Gruppen nach DIN 13080 (Farben der Karten) */
const GRUPPE = {
  UB: { name: 'Untersuchung & Behandlung', color: '#2D7694' }, PF: { name: 'Pflege', color: '#0A967A' }, VW: { name: 'Verwaltung', color: '#6b2c82' },
  SD: { name: 'Soziale Dienste & Service', color: '#d9531e' }, VE: { name: 'Ver- und Entsorgung', color: '#8d6e63' }, TE: { name: 'Technik', color: '#59636e' }
};
HSS.KH_GRUPPE = GRUPPE;
/* Versorgungsstufen */
HSS.KH_STUFEN = {
  grund: { name: 'Grund- und Regelversorgung', faktor: 0.9 },
  schwerpunkt: { name: 'Schwerpunktversorgung', faktor: 1.0 },
  maximal: { name: 'Maximalversorgung / Universitätsklinikum', faktor: 1.15 }
};
/* Fachabteilungen mit Standard-Bettenanteil je Stufe (Annahme, angelehnt an typische Strukturen) */
HSS.KH_FACH = [
  { id: 'innere', typ: 'innere', name: 'Innere Medizin', anteil: 0.24, stufe: 'grund' },
  { id: 'chirurgie', typ: 'chirurgie', name: 'Allgemein- und Viszeralchirurgie', anteil: 0.12, stufe: 'grund' },
  { id: 'unfall', typ: 'unfall', name: 'Unfallchirurgie / Orthopädie', anteil: 0.11, stufe: 'grund' },
  { id: 'kardio', typ: 'kardio', name: 'Kardiologie', anteil: 0.07, stufe: 'schwerpunkt' },
  { id: 'neuro', typ: 'neuro', name: 'Neurologie', anteil: 0.06, stufe: 'schwerpunkt' },
  { id: 'stroke', typ: 'stroke', name: 'Stroke Unit', anteil: 0.015, stufe: 'schwerpunkt' },
  { id: 'gyn', typ: 'gyn', name: 'Gynäkologie & Geburtshilfe', anteil: 0.07, stufe: 'grund' },
  { id: 'paed', typ: 'paed', name: 'Kinder- und Jugendmedizin', anteil: 0.06, stufe: 'schwerpunkt' },
  { id: 'geriatrie', typ: 'geriatrie', name: 'Geriatrie', anteil: 0.06, stufe: 'grund' },
  { id: 'onko', typ: 'onko', name: 'Onkologie / Hämatologie', anteil: 0.05, stufe: 'schwerpunkt' },
  { id: 'psych', typ: 'psych', name: 'Psychiatrie', anteil: 0.05, stufe: 'maximal' },
  { id: 'palliativ', typ: 'palliativ', name: 'Palliativmedizin', anteil: 0.012, stufe: 'schwerpunkt' },
  { id: 'intensiv', typ: 'intensiv', name: 'Intensivstation', anteil: 0.055, stufe: 'grund' },
  { id: 'imc', typ: 'imc', name: 'Intermediate Care', anteil: 0.035, stufe: 'grund' }
];

/* Funktionsbereiche: Raumprogramm in Abhängigkeit von Betten B und Stufe S
   Raum: [Raumart, m², Anzahl, Bezeichnung (optional)] */
const nOPs = (B, S) => MX(3, R(B / (S === 'maximal' ? 55 : 70)));
HSS.KH_BEREICHE = {
  eingang: { name: 'Eingangshalle & Information', gruppe: 'SD', ebene: 'EG', prio: 1, nah: ['aufnahme', 'zna'], fillO: ['kiosk', 'warten', 'buero'], fillI: ['lager', 'wc', 'archiv'],
    rooms: (B) => [['foyer', MX(140, B * 0.35), 1, 'Eingangshalle'], ['empfang', 22, 1, 'Information'], ['cafeteria', MX(70, B * 0.2), 1, 'Cafeteria'], ['kiosk', 28, 1, 'Kiosk / Blumen'], ['kapelle', 45, 1, 'Raum der Stille'], ['sozialdienst', 16, C(B / 300), 'Sozialdienst / Seelsorge'], ['wc', 5, 3, 'WC Besucher'], ['lager', 10, 1]] },
  aufnahme: { name: 'Patientenaufnahme', gruppe: 'VW', ebene: 'EG', prio: 2, nah: ['eingang'], fillO: ['buero', 'warten'], fillI: ['archiv', 'lager'],
    rooms: (B) => [['aufnahme', MX(36, B * 0.08), 1, 'Aufnahme / Anmeldung'], ['warten', MX(24, B * 0.05), 1, 'Warten Aufnahme'], ['buero', 14, C(B / 150), 'Aufnahmebüro'], ['archiv', 16, 1], ['wc', 5, 1]] },
  zna: { name: 'Zentrale Notaufnahme', gruppe: 'UB', ebene: 'EG', prio: 3, nah: ['radiologie', 'eingang', 'op', 'intensiv'], fillO: ['zna_box', 'arzt'], fillI: ['lager', 'geraete'],
    rooms: (B, S) => [['triage', 16, 1 + C(B / 500), 'Ersteinschätzung'], ['schockraum', 42, S === 'grund' ? 1 : 2], ['zna_box', 16, MX(6, C(B / 45)), 'Behandlungsraum ZNA'], ['gips', 20, 1], ['untersuchung', 18, 1, 'Isolierbehandlung'], ['warten', MX(36, B * 0.06), 1, 'Wartebereich ZNA'], ['stuetzpunkt', 24, 1, 'Leitstelle ZNA'], ['rein', 14, 1], ['unrein', 12, 1], ['medikamente', 10, 1], ['lager', 20, 1], ['geraete', 16, 1], ['arzt', 16, 2], ['personal', 20, 1], ['wc', 5, 2], ['putz', 6, 1]] },
  radiologie: { name: 'Radiologie', gruppe: 'UB', ebene: 'EG', prio: 4, nah: ['zna'], fillO: ['befundung', 'untersuchung'], fillI: ['lager', 'umkleide_pat'],
    rooms: (B, S) => [['roentgen', 32, MX(1, C(B / 250))], ['ct', 42, B > 300 ? 2 : 1, 'CT'], ['mrt', 48, B > 450 || S === 'maximal' ? 2 : 1, 'MRT'], ['schaltraum', 16, (B > 300 ? 2 : 1) + (B > 450 ? 2 : 1)], ['befundung', 18, 2], ['untersuchung', 18, 2, 'Sonographie'], ['umkleide_pat', 5, 4], ['warten', 26, 1, 'Warten Radiologie'], ['stuetzpunkt', 16, 1, 'Anmeldung Radiologie'], ['lager', 12, 1], ['wc', 5, 1]] },
  op: { name: 'Zentral-OP', gruppe: 'UB', ebene: 'OG1', prio: 5, nah: ['intensiv', 'zsva', 'imc'], fillO: ['arzt', 'aufwach'], fillI: ['sterilgut', 'lager', 'geraete'],
    rooms: (B, S) => { const n = nOPs(B, S); return [['op', 46, n, 'OP-Saal'], ['einleitung', 14, n], ['aufwach', MX(40, n * 15)], ['op_schleuse', 20, 1], ['waschraum_op', 10, C(n / 2)], ['sterilgut', 36, 1], ['stuetzpunkt', 20, 1, 'OP-Koordination'], ['umkleide', 24, 2, 'Personalschleuse OP'], ['personal', 30, 1], ['arzt', 16, 1, 'Anästhesie'], ['lager', 24, 1], ['geraete', 22, 1], ['unrein', 14, 1], ['putz', 6, 1], ['wc', 5, 2]]; } },
  kreisssaal: { name: 'Kreißsaal', gruppe: 'UB', ebene: 'OG1', prio: 6, nah: ['op'], need: f => f.gyn, fillO: ['kreisssaal', 'arzt'], fillI: ['lager'],
    rooms: (B) => [['kreisssaal', 30, MX(3, C(B / 180))], ['untersuchung', 18, 1, 'Wehenzimmer / CTG'], ['stuetzpunkt', 18, 1, 'Hebammenstützpunkt'], ['rein', 12, 1], ['unrein', 10, 1], ['arzt', 15, 1], ['personal', 15, 1], ['warten', 18, 1, 'Warten Angehörige'], ['bad', 14, 1], ['wc', 5, 1], ['lager', 12, 1]] },
  endoskopie: { name: 'Endoskopie', gruppe: 'UB', ebene: 'OG1', prio: 7, nah: ['op'], fillO: ['endoskopie', 'arzt'], fillI: ['lager'],
    rooms: (B) => [['endoskopie', 30, MX(2, C(B / 200))], ['aufwach', 30, 1, 'Überwachung Endoskopie'], ['unrein', 14, 1, 'Endoskop-Aufbereitung'], ['stuetzpunkt', 15, 1], ['warten', 20, 1], ['arzt', 14, 1], ['lager', 12, 1], ['wc', 5, 1]] },
  herzkatheter: { name: 'Herzkatheterlabor', gruppe: 'UB', ebene: 'OG1', prio: 8, nah: ['intensiv', 'op'], need: f => f.kardio, fillO: ['befundung'], fillI: ['lager'],
    rooms: (B) => [['herzkatheter', 52, B > 400 ? 2 : 1], ['schaltraum', 16, B > 400 ? 2 : 1], ['aufwach', 30, 1, 'Überwachung HKL'], ['stuetzpunkt', 15, 1], ['lager', 16, 1], ['umkleide', 12, 1], ['wc', 5, 1]] },
  labor: { name: 'Zentrallabor', gruppe: 'UB', ebene: 'OG1', prio: 12, nah: ['zna'], fillO: ['buero'], fillI: ['lager'],
    rooms: (B) => [['labor_gross', MX(60, B * 0.14), 1], ['labor', 16, 1, 'Probenannahme'], ['buero', 14, 2], ['lager', 12, 1], ['personal', 16, 1], ['wc', 5, 1]] },
  physio: { name: 'Physiotherapie', gruppe: 'UB', ebene: 'EG', prio: 14, fillO: ['untersuchung'], fillI: ['lager'],
    rooms: (B) => [['physio', MX(60, B * 0.1), 1, 'Trainingshalle'], ['untersuchung', 16, 2, 'Einzeltherapie'], ['umkleide_pat', 5, 2], ['buero', 14, 1], ['lager', 12, 1], ['wc', 5, 1]] },
  apotheke: { name: 'Apotheke', gruppe: 'VE', ebene: 'UG', prio: 13, nah: ['logistik'], fillO: ['buero'], fillI: ['lager'],
    rooms: (B) => [['apotheke', MX(60, B * 0.12), 1], ['lager', MX(24, B * 0.05), 1, 'Arzneimittellager'], ['labor', 16, 1, 'Herstellung'], ['buero', 14, 1]] },
  zsva: { name: 'ZSVA (Sterilgutversorgung)', gruppe: 'VE', ebene: 'UG', prio: 9, nah: ['op'], fillO: ['buero'], fillI: ['lager', 'sterilgut'],
    rooms: (B, S) => [['zsva', MX(90, nOPs(B, S) * 26), 1, 'ZSVA Aufbereitung'], ['sterilgut', 30, 1], ['umkleide', 16, 1], ['personal', 15, 1], ['lager', 15, 1]] },
  kueche: { name: 'Zentralküche', gruppe: 'VE', ebene: 'UG', prio: 10, nah: ['logistik', 'speisesaal'], fillO: ['buero'], fillI: ['kuehlraum', 'lager'],
    rooms: (B) => [['kueche_zentral', MX(120, B * 0.38), 1], ['spuelkueche', MX(30, B * 0.08), 1], ['kuehlraum', MX(24, B * 0.06), 1], ['lager', 36, 1, 'Lebensmittellager'], ['umkleide', 20, 1], ['buero', 14, 1, 'Küchenleitung'], ['personal', 15, 1]] },
  speisesaal: { name: 'Mitarbeiterrestaurant', gruppe: 'SD', ebene: 'EG', prio: 15, nah: ['kueche'], fillO: ['besprechung'], fillI: ['lager'],
    rooms: (B) => [['speisesaal', MX(80, B * 0.28), 1], ['wc', 5, 2], ['lager', 12, 1]] },
  logistik: { name: 'Logistikzentrum (Lager, Wäsche, Betten, Entsorgung)', gruppe: 'VE', ebene: 'UG', prio: 11, nah: ['kueche', 'apotheke'], fillO: ['buero'], fillI: ['lager', 'archiv'],
    rooms: (B) => [['warenannahme', 60, 1], ['zentrallager', MX(150, B * 0.3), 1], ['entsorgung_zentral', 50, 1], ['waesche', MX(50, B * 0.1), 1, 'Wäscheumschlag'], ['bettenzentrale', MX(60, B * 0.14), 1], ['umkleide', 30, 2], ['buero', 14, 2], ['personal', 20, 1], ['wc', 5, 2]] },
  technik: { name: 'Technikzentrale & IT', gruppe: 'TE', ebene: 'UG', prio: 16, fillO: ['buero'], fillI: ['lager'],
    rooms: (B) => [['technikzentrale', MX(80, B * 0.22), 1], ['it', 30, 1, 'Serverraum'], ['buero', 14, 1, 'Haustechnik'], ['lager', 16, 1, 'Werkstatt']] },
  pathologie: { name: 'Pathologie / Prosektur', gruppe: 'UB', ebene: 'UG', prio: 17, need: (f, S) => S !== 'grund', fillO: ['buero'], fillI: ['lager'],
    rooms: () => [['pathologie', 40, 1], ['abschied', 20, 1], ['labor', 20, 1, 'Histologie'], ['buero', 14, 1], ['lager', 10, 1]] },
  verwaltung: { name: 'Verwaltung & Schulung', gruppe: 'VW', ebene: 'TOP', prio: 18, fillO: ['verwaltung', 'besprechung'], fillI: ['archiv', 'lager'],
    rooms: (B, S) => [['verwaltung', 18, C(B / 35), 'Büro Verwaltung'], ['besprechung', 30, 2, 'Konferenzraum'], ['schulung', MX(60, B * 0.12), 1, 'Schulungsraum'], ['archiv', 40, 1], ...(S === 'maximal' ? [['bibliothek', 40, 1]] : []), ['personal', 20, 1], ['wc', 5, 2]] }
};
const ORDER = ['eingang', 'zna', 'radiologie', 'aufnahme', 'op', 'intensiv', 'imc', 'kreisssaal', 'herzkatheter', 'endoskopie', 'zsva', 'logistik', 'kueche', 'technik', 'apotheke', 'labor', 'pathologie', 'speisesaal', 'physio', 'verwaltung'];

/* ---------- Programm ---------- */
HSS.khProgramm = (inp) => {
  const B = inp.betten || 400, S = inp.stufe || 'schwerpunkt';
  const fach = {}; for (const f of HSS.KH_FACH) fach[f.id] = inp.fach?.[f.id] ?? (({ grund: 0, schwerpunkt: 1, maximal: 2 })[S] >= ({ grund: 0, schwerpunkt: 1, maximal: 2 })[f.stufe]);
  const sumA = U.sum(HSS.KH_FACH.filter(f => fach[f.id]).map(f => f.anteil)) || 1;
  const cards = [];
  // Bettenstationen je Fachabteilung (eine Karte je Pflegeeinheit)
  for (const f of HSS.KH_FACH) {
    if (!fach[f.id]) continue;
    const T = HSS.STATIONSTYPEN.find(t => t.id === f.typ); if (!T) continue;
    const betten = MX(T.intensiv ? 6 : 8, R(B * f.anteil / sumA));
    const units = MX(1, C(betten / T.maxBetten));
    for (let u = 0; u < units; u++) {
      const bu = R(betten / units), faelle = R(bu * 365 * T.ausl / T.vwd);
      const inpS = { typ: T.id, name: `${f.name}${units > 1 ? ' ' + (u + 1) : ''}`, art: 'stationaer', faelleStat: faelle, sel: [] };
      const calc = HSS.stationCalc(inpS);
      cards.push({ id: 'st_' + f.id + '_' + u, kind: 'station', fach: f.id, name: inpS.name, gruppe: 'PF', ebene: T.intensiv ? 'OG1' : 'OG', nah: T.intensiv ? ['op', 'zna'] : [], inp: inpS, calc, m2: calc.bedarf, betten: calc.betten, prio: T.intensiv ? 6 : 30 });
    }
  }
  // Funktionsbereiche
  for (const [id, b] of Object.entries(HSS.KH_BEREICHE)) {
    if (b.need && !b.need(fach, S)) continue;
    if (inp.bereiche && inp.bereiche[id] === false) continue;
    const rooms = b.rooms(B, S).map(([use, m2, n, name]) => ({ use, m2: Math.round(m2 * 2) / 2, n: n || 1, name: name || (HSS.ROOMTYPES[use] || {}).name || use }));
    const nuf = U.sum(rooms.map(r => r.m2 * r.n));
    cards.push({ id: 'fb_' + id, kind: 'bereich', bereich: id, name: b.name, gruppe: b.gruppe, ebene: b.ebene, nah: b.nah || [], rooms, m2: nuf * 1.35, prio: b.prio });
  }
  return { B, S, fach, cards, nuf: U.sum(cards.map(c => c.m2)) };
};

/* ---------- Geschosse als Zellen der Planungstafel ---------- */
HSS.khZellen = (prj = HSS.project()) => {
  const out = [];
  for (const b of prj.buildings) for (const pt of b.parts) {
    if (pt.use === 'parkhaus' || /parkhaus/i.test(pt.name + b.name)) continue;
    for (const f of HSS.partFloors(pt)) {
      const gf = HSS.globalFloor(pt, f, prj);
      const I = HSS.interior(pt.id, f, false, prj);
      const used = U.sum((I?.rooms || []).map(r => HSS.roomArea(r)));
      const bb = G.bbox(HSS.partFootprintLocal(pt).outer), D = Math.min(bb.w, bb.d), L = Math.max(bb.w, bb.d) - 0.3;
      const lift = prj.objects.some(o => o.host?.part === pt.id && HSS.library.get(o.lib)?.logistik?.rolle === 'aufzug');
      out.push({ key: pt.id + '|' + f, part: pt.id, f, gf, name: pt.name, bau: b.kurz || b.name, cap: HSS.partArea(pt) * 0.78, belegt: used, D, L, Lfrei: Math.max(0, L - used / Math.max(1, D - 0.3) * 1.05), lift });
    }
  }
  return out;
};
const ebeneScore = (eb, gf, topGF) => {
  if (eb === 'UG') return gf < 0 ? 0 : gf === 0 ? 3 : 8 + gf;
  if (eb === 'EG') return gf === 0 ? 0 : gf === 1 ? 4 : gf < 0 ? 6 : 6 + gf;
  if (eb === 'OG1') return gf === 1 ? 0 : gf === 2 ? 2 : gf === 0 ? 3 : gf < 0 ? 9 : 2 + gf;
  if (eb === 'TOP') return gf === topGF ? 0 : gf > 0 ? (topGF - gf) * 0.8 + 1 : 10;
  return gf >= 2 ? (gf - 2) * 0.15 : gf === 1 ? 2.5 : gf === 0 ? 6 : 12; // Pflege: Obergeschosse
};
/* Automatische Verteilung: Reihenfolge nach Priorität, Zelle nach Ebene, Nachbarschaft und freier Fläche */
const cardRooms = c => (c.kind === 'station' ? c.calc.rooms : c.rooms).flatMap(r => Array.from({ length: r.n }, () => ({ use: r.use, m2: r.m2 })));
HSS.khLaenge = (c, z, core) => HSS.planLaenge(z.D, cardRooms(c), { core });
HSS.khVerteilen = (prog, zellen, fest = {}) => {
  // Kapazität in Metern Gebäudelänge (je Geschoss), Bedarf je Karte aus dem Planungsverfahren
  const rest = new Map(zellen.map(z => [z.key, z.Lfrei])), hasCore = new Map(zellen.map(z => [z.key, z.lift]));
  const need = (c, z) => HSS.khLaenge(c, z, !hasCore.get(z.key)) * 1.12;
  const take = (c, z) => { rest.set(z.key, rest.get(z.key) - need(c, z)); hasCore.set(z.key, true); };
  const where = Object.assign({}, fest);
  for (const [cid, key] of Object.entries(fest)) { const c = prog.cards.find(x => x.id === cid), z = zellen.find(x => x.key === key); if (c && z) take(c, z); }
  const topGF = Math.max(...zellen.map(z => z.gf), 0);
  const cards = prog.cards.filter(c => !where[c.id]).sort((a, b) => a.prio - b.prio || b.m2 - a.m2);
  const depth = new Map(zellen.map(z => { const P = HSS.findPart(z.part); const bb = G.bbox(HSS.partFootprintLocal(P.part).outer); return [z.key, Math.min(bb.w, bb.d)]; }));
  for (const c of cards) {
    let best = null, bs = Infinity;
    // zuerst nur Geschosse, in die der Bereich ganz passt; sonst das beste mit Überbelegung
    const passt = zellen.filter(z => rest.get(z.key) >= need(c, z));
    for (const z of (passt.length ? passt : zellen)) {
      const r = rest.get(z.key), n = need(c, z);
      if (c.kind === 'station' && c.ebene === 'OG' && depth.get(z.key) > 25) { if (passt.some(q => depth.get(q.key) <= 25)) continue; }
      let sc = ebeneScore(c.ebene, z.gf, topGF) * 10;
      // Nachbarschaft: gleiche Ebene/gleiches Gebäude wie verwandte Bereiche
      for (const n of c.nah || []) { const k = Object.entries(where).find(([id]) => id === 'fb_' + n || id.startsWith('st_' + n)); if (!k) continue; const zz = zellen.find(x => x.key === k[1]); if (!zz) continue; sc -= zz.part === z.part ? 6 : 0; sc -= zz.gf === z.gf ? 6 : Math.abs(zz.gf - z.gf) === 1 ? 2 : 0; }
      // Stationen gleicher Fachabteilung zusammen, Etagen möglichst gut füllen
      if (c.kind === 'station') { if (Object.keys(where).some(id => id.startsWith('st_' + c.fach + '_') && zellen.find(x => x.key === where[id])?.part === z.part)) sc -= 4; }
      sc += (r < n ? 30 + (n - r) : 0) + (r - n) / Math.max(1, z.L) * 3;
      if (sc < bs) { bs = sc; best = z; }
    }
    if (best) { where[c.id] = best.key; take(c, best); }
  }
  return where;
};

/* ---------- Planen ---------- */
HSS.khPlanen = (prog, where, opts = {}) => {
  const prj = HSS.project(), report = { bereiche: [], warn: [], dropped: 0, placed: 0 };
  // je Zelle in Reihenfolge der Priorität (Hallen und Eingänge zuerst)
  const byCell = new Map();
  for (const c of prog.cards) { const k = where[c.id]; if (!k) continue; if (!byCell.has(k)) byCell.set(k, []); byCell.get(k).push(c); }
  for (const [key, list] of byCell) {
    const [part, fs] = key.split('|'), f = +fs, P = HSS.findPart(part, prj); if (!P) continue;
    if (opts.leeren) { const I = HSS.interior(part, f, false, prj); if (I) { I.rooms = []; I.walls = []; I.doors = []; } prj.objects = prj.objects.filter(o => !(o.host?.part === part && o.host.floor === f && !o.core)); }
    list.sort((a, b) => a.prio - b.prio);
    // Teilen sich mehrere Bereiche eine Etage und reicht die Fläche nicht, erhält jeder einen anteiligen Abschnitt
    const bb = G.bbox(HSS.partFootprintLocal(P.part).outer), Ltot = Math.max(bb.w, bb.d) - 0.3, z0 = { D: Math.min(bb.w, bb.d) };
    const lens = new Map(list.map((c, i) => [c.id, HSS.khLaenge(c, z0, i === 0)])), sumL = U.sum([...lens.values()]);
    const share = c => (list.length > 1 && sumL > Ltot) ? Ltot * lens.get(c.id) / sumL : null;
    list.forEach((c, i) => {
      const rep = { placed: 0, dropped: [] };
      if (c.kind === 'station') {
        const inp = Object.assign({}, c.inp, { sel: [{ part, floors: [f], half: false }] });
        const r = HSS.generateStation(inp, c.calc, { furnish: true, core: i === 0, maxLen: share(c), lenFactor: share(c) ? 1 : 1.12 });
        r.st.bereich = 'station'; Object.assign(rep, r.report);
      } else {
        const B = HSS.KH_BEREICHE[c.bereich];
        const st = { id: U.uid('st'), name: c.name, typ: c.bereich, art: 'bereich', bereich: c.bereich, betten: 0, plaetze: 0, sel: [{ part, floors: [f], half: false }], calc: { bedarf: c.m2 } };
        const rooms = []; for (const r of c.rooms) for (let k = 0; k < r.n; k++) rooms.push({ use: r.use, m2: r.m2, name: r.n > 1 && !/\d$/.test(r.name) ? `${r.name} ${k + 1}` : r.name });
        const T = { id: c.bereich, name: c.name, fillO: B.fillO, fillI: B.fillI };
        HSS.layoutStationFloor({ P, f, rooms }, st, T, rep, { furnish: true, core: i === 0, maxLen: share(c), lenFactor: share(c) ? 1 : 1.12 });
        prj.stations.push(st);
      }
      report.placed += rep.placed; report.dropped += rep.dropped.length;
      report.bereiche.push({ name: c.name, ort: `${P.part.name} · ${HSS.floorName(HSS.globalFloor(P.part, f, prj))}`, placed: rep.placed, dropped: rep.dropped.length, warn: rep.warn || [] });
      for (const w of rep.warn || []) report.warn.push(w);
    });
  }
  return report;
};

/* =================== Oberfläche: Arbeitsbereich „Klinik-Planer“ =================== */
const UI = HSS.ui, $ = UI.$, $$ = UI.$$, opt = UI.opt;
UI.khInp = UI.khInp || { betten: 400, stufe: 'schwerpunkt', fach: null, bereiche: {} };
UI.khWhere = UI.khWhere || null;
const progNow = () => HSS.khProgramm(UI.khInp);
UI.ws.klinik = { name: 'Klinik-Planer', short: 'Klinik-Planer', step: '4', lead: 'Ganzes Krankenhaus in drei Schritten: Größe wählen, Bereiche auf die Geschosse ziehen (oder automatisch verteilen), planen. Jeder Bereich belegt nur so viel Etage, wie er braucht – voll eingerichtet.',
  render(el) {
    const inp = UI.khInp, prog = progNow(), prj = HSS.project();
    if (!inp.fach) inp.fach = Object.assign({}, prog.fach);
    const zellen = HSS.khZellen(prj), cap = U.sum(zellen.map(z => z.cap - z.belegt));
    const sumB = U.sum(prog.cards.filter(c => c.betten).map(c => c.betten));
    const ok = cap >= prog.nuf;
    el.innerHTML = `<h3>1 · Größe &amp; Profil</h3>
      <div class="fg"><label class="f"><span>Betten gesamt</span><input type="number" id="kB" value="${inp.betten}" min="50" max="2500" step="10"></label>
      <label class="f"><span>Versorgungsstufe</span><select id="kS">${Object.entries(HSS.KH_STUFEN).map(([k, v]) => opt(k, v.name, inp.stufe)).join('')}</select></label></div>
      <input type="range" id="kBr" min="50" max="1500" step="10" value="${inp.betten}" style="width:100%">
      <div class="note" style="margin-top:6px">Fachabteilungen (Klick schaltet ein/aus):</div>
      <div class="chips">${HSS.KH_FACH.map(f => `<button class="chip ${inp.fach[f.id] ? 'on' : ''}" data-fach="${f.id}">${U.esc(f.name)}</button>`).join('')}</div>
      <div class="note" style="margin-top:6px">Funktionsbereiche:</div>
      <div class="chips">${Object.entries(HSS.KH_BEREICHE).map(([k, b]) => `<button class="chip ${inp.bereiche[k] === false ? '' : 'on'}" data-ber="${k}" style="--c:${GRUPPE[b.gruppe].color}">${U.esc(b.name.split(' (')[0])}</button>`).join('')}</div>
      <div class="kpi" style="margin-top:8px"><div><b>${sumB}</b><span>Betten in ${prog.cards.filter(c => c.kind === 'station').length} Stationen</span></div><div><b>${U.fmt(prog.nuf)} m²</b><span>Flächenbedarf (inkl. Flure)</span></div><div><b>${U.fmt(Math.max(0, cap))} m²</b><span>frei in ${zellen.length} Geschossen · <span class="amp ${ok ? 'g' : cap > prog.nuf * 0.8 ? 'y' : 'r'}"></span>${ok ? 'reicht' : 'zu wenig'}</span></div></div>
      ${zellen.length ? '' : '<div class="warnbox">Noch keine Gebäude. Zuerst Gebäude ins Bild ziehen (Arbeitsbereich „Gebäude“) – oder „Gebäude vorschlagen“.</div>'}
      ${!ok && zellen.length ? `<div class="warnbox">Es fehlen ca. ${U.fmt(prog.nuf - cap)} m². Gebäude vergrößern (Griffe ⇔ ⇕ oder blauer ⇕ für Geschosse) oder „Gebäude vorschlagen“.</div>` : ''}
      <div class="actions"><button id="kSug" title="Baukörper passend zur Größe vorschlagen (Behandlungssockel, Bettenhaus, Logistik)">Gebäude vorschlagen</button></div>
      <h3>2 · Bereiche auf Geschosse verteilen</h3>
      <p class="note">Die Planungstafel zeigt alle Geschosse. Karten per Ziehen umsetzen – oder automatisch verteilen lassen (Eingang/Notaufnahme ins EG, OP und Intensiv ins 1. OG, Logistik/Küche/ZSVA ins UG, Stationen in die Obergeschosse).</p>
      <div class="actions"><button class="primary" id="kBoard" ${zellen.length ? '' : 'disabled'}>Planungstafel öffnen</button><button id="kAuto" ${zellen.length ? '' : 'disabled'}>Automatisch verteilen</button></div>
      ${UI.khWhere ? `<div class="okbox">${Object.keys(UI.khWhere).length} von ${prog.cards.length} Bereichen verteilt.</div>` : ''}
      <h3>3 · Planen</h3>
      <label class="chk"><input type="checkbox" id="kClr" checked> belegte Geschosse vorher leeren</label>
      <div class="actions"><button class="primary big" id="kGo" ${zellen.length ? '' : 'disabled'}>▶ Krankenhaus planen</button></div>
      <p class="note">Einzelne Stationen weiterhin im <a href="#" id="kSt">Stationsplaner</a>. Räume und Möbel danach direkt im 3D-Bild anpassen.</p>
      <details><summary class="note"><b>Raumprogramm</b> (${prog.cards.length} Bereiche)</summary><table class="t rp"><tr><th>Bereich</th><th class="n">m²</th><th>Ebene</th></tr>${prog.cards.map(c => `<tr><td><span class="sw" style="background:${GRUPPE[c.gruppe].color}"></span> ${U.esc(c.name)}${c.betten ? ` <span class="note">(${c.betten} Betten)</span>` : ''}</td><td class="n">${U.fmt(c.m2)}</td><td>${{ UG: 'UG', EG: 'EG', OG1: '1. OG', OG: 'OG', TOP: 'oben' }[c.ebene]}</td></tr>`).join('')}</table><div class="note">Kennwerte: Raumprogramme in Anlehnung an DIN 13080 und die Musterraumprogramme der Länder (RLP, Schleswig-Holstein); Flurzuschlag 35–40 %. Größen sind Planungsannahmen.</div></details>`;
    const set = (k, v) => { inp[k] = v; UI.khWhere = null; UI.renderPanel(); };
    $('#kB', el).onchange = e => set('betten', U.clamp(+e.target.value || 400, 50, 2500));
    $('#kBr', el).oninput = U.debounce(e => set('betten', +e.target.value), 250);
    $('#kS', el).onchange = e => { inp.stufe = e.target.value; inp.fach = null; UI.khWhere = null; UI.renderPanel(); };
    $$('[data-fach]', el).forEach(b => b.onclick = () => { inp.fach[b.dataset.fach] = !inp.fach[b.dataset.fach]; UI.khWhere = null; UI.renderPanel(); });
    $$('[data-ber]', el).forEach(b => b.onclick = () => { inp.bereiche[b.dataset.ber] = inp.bereiche[b.dataset.ber] === false; UI.khWhere = null; UI.renderPanel(); });
    $('#kAuto', el).onclick = () => { UI.khWhere = HSS.khVerteilen(progNow(), HSS.khZellen()); UI.renderPanel(); UI.khBoard(); };
    $('#kBoard', el).onclick = () => UI.khBoard();
    $('#kSug', el).onclick = () => UI.khGebaeude();
    $('#kSt', el).onclick = e => { e.preventDefault(); UI.setWS('station'); };
    $('#kGo', el).onclick = () => UI.khGo($('#kClr', el).checked);
  } };

/* Planungstafel: Zeilen = Geschosse, Spalten = Bauteile; Karten per Ziehen verteilen */
UI.khBoard = () => {
  const prog = progNow(), zellen = HSS.khZellen();
  if (!UI.khWhere) UI.khWhere = HSS.khVerteilen(prog, zellen);
  const W = UI.khWhere;
  const parts = [...new Map(zellen.map(z => [z.part, z])).values()];
  const gfs = [...new Set(zellen.map(z => z.gf))].sort((a, b) => b - a);
  const card = c => `<div class="khc" draggable="true" data-c="${c.id}" style="--c:${GRUPPE[c.gruppe].color}" title="${U.esc(c.name)} · ${U.fmt(c.m2)} m²"><b>${U.esc(c.name)}</b><small>${U.fmt(c.m2)} m²${c.betten ? ' · ' + c.betten + ' B.' : ''}</small></div>`;
  const cell = z => { if (!z) return '<td class="khx"></td>'; const cs = prog.cards.filter(c => W[c.id] === z.key); let core = !z.lift; const lu = U.sum(cs.map(c => { const l = HSS.khLaenge(c, z, core); core = false; return l; })) + (z.L - z.Lfrei), pc = lu / z.L; return `<td class="khz ${pc > 1.02 ? 'voll' : ''}" data-z="${z.key}" title="${U.esc(z.name)} · ${U.fmt(z.L)} m lang, ${U.fmt(z.D)} m tief"><div class="khbar"><i style="width:${Math.min(100, pc * 100)}%"></i><span>${U.fmt(lu)} / ${U.fmt(z.L)} m · ${U.pct(pc)}</span></div>${cs.map(card).join('')}</td>`; };
  const free = prog.cards.filter(c => !W[c.id]);
  UI.dialog(`<div class="dh"><h2>Planungstafel</h2><button class="x" data-close>×</button></div>
    <p class="note">Karten mit der Maus auf ein anderes Geschoss ziehen. Der Balken zeigt die Belegung (rot = zu voll). Nicht verteilte Bereiche liegen links.</p>
    <div class="khwrap"><div class="khtray" data-z=""><b>Nicht verteilt (${free.length})</b>${free.map(card).join('') || '<div class="note">alles verteilt</div>'}</div>
    <div class="khscroll"><table class="khb"><tr><th></th>${parts.map(p => `<th>${U.esc(p.bau)} · ${U.esc(p.name)}</th>`).join('')}</tr>
    ${gfs.map(g => `<tr><th>${HSS.floorName(g)}</th>${parts.map(p => cell(zellen.find(z => z.part === p.part && z.gf === g))).join('')}</tr>`).join('')}</table></div></div>
    <div class="row" style="margin-top:6px">${Object.entries(GRUPPE).map(([k, g]) => `<span class="note"><span class="sw" style="background:${g.color}"></span> ${g.name}</span>`).join(' ')}</div>
    <div class="actions"><button id="kbAuto">Automatisch verteilen</button><button id="kbClr">Alle zurück</button><div class="sp"></div><button class="primary" id="kbGo">▶ So planen</button><button data-close>Schließen</button></div>`, d => {
    d.classList.add('wide');
    let drag = null;
    $$('.khc', d).forEach(c => { c.ondragstart = e => { drag = c.dataset.c; e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); }; c.ondragend = () => c.classList.remove('drag'); });
    $$('[data-z]', d).forEach(t => {
      t.ondragover = e => { e.preventDefault(); t.classList.add('over'); }; t.ondragleave = () => t.classList.remove('over');
      t.ondrop = e => { e.preventDefault(); e.stopPropagation(); t.classList.remove('over'); const id = drag || e.dataTransfer.getData('text/plain'); if (!id) return; if (t.dataset.z) W[id] = t.dataset.z; else delete W[id]; UI.khBoard(); UI.renderPanel(); };
    });
    $('#kbAuto', d).onclick = () => { UI.khWhere = HSS.khVerteilen(progNow(), HSS.khZellen()); UI.khBoard(); UI.renderPanel(); };
    $('#kbClr', d).onclick = () => { UI.khWhere = {}; UI.khBoard(); UI.renderPanel(); };
    $('#kbGo', d).onclick = () => { d.close(); UI.khGo(true); };
    d.addEventListener('close', () => d.classList.remove('wide'), { once: true });
  });
};
UI.khGo = (leeren) => {
  if (HSS.state.demoReadonly) return UI.toast('Demo ist schreibgeschützt');
  const prog = progNow(); if (!UI.khWhere) UI.khWhere = HSS.khVerteilen(prog, HSS.khZellen());
  UI.toast('Krankenhaus wird geplant …', 1500);
  setTimeout(() => {
    let rep;
    HSS.manip?.mark();
    HSS.change('Krankenhaus planen', () => { rep = HSS.khPlanen(prog, UI.khWhere, { leeren }); });
    UI.renderPanel(); HSS.s3.home();
    UI.dialog(`<div class="dh"><h2>Krankenhaus geplant</h2><button class="x" data-close>×</button></div>
      <p>${rep.bereiche.length} Bereiche mit ${rep.placed} Räumen angelegt und eingerichtet.${rep.dropped ? ` ${rep.dropped} Räume passten nicht – Gebäude vergrößern oder Karten umverteilen.` : ''}</p>
      <table class="t"><tr><th>Bereich</th><th>Lage</th><th class="n">Räume</th></tr>${rep.bereiche.map(b => `<tr><td>${U.esc(b.name)}</td><td>${U.esc(b.ort)}</td><td class="n">${b.placed}${b.dropped ? ` <span class="pill unrein">−${b.dropped}</span>` : ''}</td></tr>`).join('')}</table>
      ${rep.warn.length ? `<details><summary class="note">${rep.warn.length} Hinweise</summary><ul class="note">${rep.warn.slice(0, 30).map(w => `<li>${U.esc(w)}</li>`).join('')}</ul></details>` : ''}
      <div class="actions"><button id="kgTour" class="primary">▶ Rundgang durch die Bereiche</button><button data-close>OK</button></div>`, d => { $('#kgTour', d).onclick = () => { d.close(); HSS.tour.dialog(); }; });
  }, 40);
};
/* Gebäude passend zum Flächenbedarf vorschlagen (Sockel + Bettenhäuser + Logistik) */
UI.khGebaeude = async () => {
  const prog = progNow(), prj = HSS.project();
  const ok = !prj.buildings.length || await UI.confirm('Gebäude vorschlagen', 'Neue Baukörper werden neben den vorhandenen Gebäuden ergänzt.', 'Vorschlagen'); if (!ok) return;
  // Größen aus dem Längenbedarf je Ebene: Sockel (UG, EG, 1.–2. OG) und Bettenhäuser (eine Station je Geschoss)
  const ost = prog.cards.filter(c => c.kind === 'station' && c.ebene === 'OG'), nT = ost.length > 9 ? 2 : 1;
  const sD = nT === 2 ? 52 : 44, tD = 20;
  const lenOf = (list, D) => U.sum(list.map(c => HSS.khLaenge(c, { D }, false))) + 8;
  const ug = lenOf(prog.cards.filter(c => c.ebene === 'UG'), sD), eg = lenOf(prog.cards.filter(c => c.ebene === 'EG'), sD), og1 = lenOf(prog.cards.filter(c => c.ebene === 'OG1'), sD);
  const tL = U.clamp(Math.max(40, ...ost.map(c => HSS.khLaenge(c, { D: tD }, true))) + 2, 40, 110);
  const sL = U.clamp(Math.max(ug, eg, og1 / 2, tL + 8) * 1.04, 50, 180);
  const tFl = U.clamp(Math.ceil(ost.length / nT) + (prog.cards.some(c => c.ebene === 'TOP') ? 1 : 0), 2, 14);
  HSS.manip?.mark();
  HSS.change('Gebäude vorschlagen', p => {
    let x1 = -Infinity; for (const pt of HSS.allParts(p)) for (const q of HSS.partFootprint(pt).outer) x1 = Math.max(x1, q[0]);
    const x0 = isFinite(x1) ? x1 + 30 : -sL / 2;
    const b = Object.assign(HSS.defaults.building(), { name: 'Klinikum (Vorschlag)', kurz: 'K', color: '#144477' });
    const sp = Object.assign(HSS.defaults.part(), { name: 'Behandlungssockel', x: Math.round(x0 + sL / 2), z: 0, w: Math.round(sL), d: sD, floors: 3, floorHeight: 4.4, basements: 1, facade: { type: 'paneel', color: '#eef0f2', accent: '#2D7694', glass: '#6f8fa8', axis: 1.5, windowRatio: 0.6 } });
    b.parts.push(sp);
    for (let i = 0; i < nT; i++) {
      const z = nT === 1 ? 0 : (i ? 1 : -1) * (sD / 2 - tD / 2 - 1);
      b.parts.push(Object.assign(HSS.defaults.part(), { name: nT === 1 ? 'Bettenhaus' : `Bettenhaus ${['Nord', 'Süd'][i]}`, stackOn: sp.id, x: sp.x, z, w: Math.round(tL), d: tD, floors: tFl, floorHeight: 3.6, basements: 0, cornerRadius: 3, facade: { type: 'band', color: '#eef0f2', accent: '#0A967A', glass: '#6f8fa8', axis: 1.35, windowRatio: 0.55 } }));
    }
    p.buildings.push(b);
  });
  UI.khWhere = null; UI.renderPanel(); HSS.s3.home();
  UI.toast('Gebäude vorgeschlagen – an den Griffen anpassen, dann verteilen und planen', 4000);
};
})();
/* Arbeitsbereich in der Leiste hinter dem Stationsplaner einsortieren, Symbol ergänzen */
(function () {
  const UI = window.HSS.ui, ws = UI.ws, k = ws.klinik; if (!k) return;
  const keys = Object.keys(ws).filter(x => x !== 'klinik'), i = keys.indexOf('station');
  const order = keys.slice(0, i + 1).concat(['klinik'], keys.slice(i + 1));
  const copy = Object.assign({}, ws); for (const x of Object.keys(ws)) delete ws[x]; for (const x of order) ws[x] = copy[x];
  const build0 = UI.buildRail;
  UI.buildRail = () => { build0(); const b = document.querySelector('#rail button[data-ws="klinik"] svg'); if (b) b.innerHTML = '<path d="M3 21V9l9-5 9 5v12z"/><path d="M12 9v6M9 12h6M9 21v-3h6v3"/>'; };
})();
