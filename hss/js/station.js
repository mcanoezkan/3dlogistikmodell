/* =====================================================================
   HSS · station.js – Stations-Planungshelfer
   Bettenbedarf (Hill-Burton), Raumprogramm, Flächenabgleich mit nachvollziehbarer Rechnung,
   automatische Grundrissbelegung mit Ausstattung aus der Bibliothek.
   Quellenhinweise: Verweildauern Destatis/GBE 2023 (Innere 5,3; Chirurgie 5,1; Geriatrie 15,3;
   Allg. Psychiatrie 26,2; Psychosomatik 45,9 Tage), übrige Werte sind Richtwerte (Annahme).
   Zimmerflächen angelehnt an die Arbeitshilfen Pflege des Landes Rheinland-Pfalz (AH 2.01/2.10):
   1-Bett 21,0 m², 2-Bett 28,5 m² inkl. Nasszelle 3,5 m² (Geriatrie).
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;

// Nebenräume: [Raumtyp, Grundfläche m², Zuschlag m² je Bett, Anzahl]
const NEBEN_PFLEGE = [['stuetzpunkt', 16, 0.15], ['rein', 12, 0.1], ['unrein', 10, 0.08], ['medikamente', 8, 0.05], ['lager', 12, 0.2], ['geraete', 12, 0.15], ['arzt', 14, 0.1], ['personal', 16, 0.12], ['besprechung', 14, 0], ['bad', 12, 0], ['entsorgung', 6, 0.05], ['putz', 5, 0], ['wc', 4, 0, 2], ['kueche', 8, 0.05], ['aufenthalt', 18, 0.15]];
const NEBEN_INTENSIV = [['stuetzpunkt', 20, 0.4], ['rein', 14, 0.4], ['unrein', 12, 0.3], ['medikamente', 10, 0.2], ['lager', 16, 0.8], ['geraete', 20, 1.2], ['arzt', 16, 0.3], ['personal', 18, 0.3], ['besprechung', 16, 0], ['entsorgung', 8, 0.1], ['putz', 5, 0], ['wc', 4, 0, 2], ['untersuchung', 0, 0]];
const NEBEN_AMB = [['warten', 0, 0], ['stuetzpunkt', 14, 0], ['arzt', 12, 0], ['rein', 8, 0], ['unrein', 8, 0], ['lager', 10, 0], ['personal', 12, 0], ['putz', 5, 0], ['wc', 4, 0, 2]];

HSS.STATIONSTYPEN = [
  { id: 'innere', name: 'Innere Medizin (Normalpflege)', art: 'stationaer', vwd: 5.3, vwdQuelle: 'Destatis 2023', ausl: 0.85, maxBetten: 34, anteil1: 0.2, a1: 19.5, a2: 26.0, neben: NEBEN_PFLEGE },
  { id: 'chirurgie', name: 'Allgemeinchirurgie', art: 'stationaer', vwd: 5.1, vwdQuelle: 'Destatis 2023', ausl: 0.85, maxBetten: 34, anteil1: 0.2, a1: 19.5, a2: 26.0, neben: NEBEN_PFLEGE },
  { id: 'unfall', name: 'Unfallchirurgie / Orthopädie', art: 'stationaer', vwd: 6.0, ausl: 0.85, maxBetten: 34, anteil1: 0.2, a1: 20.0, a2: 27.0, neben: NEBEN_PFLEGE },
  { id: 'kardio', name: 'Kardiologie', art: 'stationaer', vwd: 4.5, ausl: 0.85, maxBetten: 32, anteil1: 0.25, a1: 19.5, a2: 26.0, neben: NEBEN_PFLEGE },
  { id: 'neuro', name: 'Neurologie', art: 'stationaer', vwd: 6.2, ausl: 0.85, maxBetten: 32, anteil1: 0.25, a1: 20.0, a2: 27.0, neben: NEBEN_PFLEGE },
  { id: 'stroke', name: 'Stroke Unit', art: 'stationaer', vwd: 3.5, ausl: 0.8, maxBetten: 12, anteil1: 0.5, a1: 22.0, a2: 32.0, neben: NEBEN_INTENSIV },
  { id: 'geriatrie', name: 'Geriatrie', art: 'stationaer', vwd: 15.3, vwdQuelle: 'Destatis 2023', ausl: 0.88, maxBetten: 30, anteil1: 0.3, a1: 21.0, a2: 28.5, neben: NEBEN_PFLEGE },
  { id: 'onko', name: 'Onkologie / Hämatologie', art: 'stationaer', vwd: 7.0, ausl: 0.85, maxBetten: 28, anteil1: 0.4, a1: 21.0, a2: 28.0, neben: NEBEN_PFLEGE },
  { id: 'gyn', name: 'Gynäkologie & Geburtshilfe', art: 'stationaer', vwd: 3.3, ausl: 0.75, maxBetten: 30, anteil1: 0.3, a1: 20.0, a2: 27.0, neben: NEBEN_PFLEGE },
  { id: 'paed', name: 'Pädiatrie', art: 'stationaer', vwd: 3.8, ausl: 0.75, maxBetten: 24, anteil1: 0.5, a1: 22.0, a2: 30.0, neben: NEBEN_PFLEGE },
  { id: 'psych', name: 'Allgemeine Psychiatrie', art: 'stationaer', vwd: 26.2, vwdQuelle: 'GBE-Bund 2023', ausl: 0.92, maxBetten: 24, anteil1: 0.3, a1: 18.0, a2: 25.0, neben: NEBEN_PFLEGE },
  { id: 'psychosom', name: 'Psychosomatik', art: 'stationaer', vwd: 45.9, vwdQuelle: 'GBE-Bund 2023', ausl: 0.92, maxBetten: 20, anteil1: 0.6, a1: 18.0, a2: 25.0, neben: NEBEN_PFLEGE },
  { id: 'palliativ', name: 'Palliativstation', art: 'stationaer', vwd: 10.0, ausl: 0.8, maxBetten: 12, anteil1: 0.8, a1: 24.0, a2: 32.0, neben: NEBEN_PFLEGE },
  { id: 'intensiv', name: 'Intensivstation (ITS)', art: 'stationaer', vwd: 4.0, ausl: 0.75, maxBetten: 16, anteil1: 0.6, a1: 25.0, a2: 40.0, neben: NEBEN_INTENSIV, intensiv: true },
  { id: 'imc', name: 'Intermediate Care (IMC)', art: 'stationaer', vwd: 3.0, ausl: 0.8, maxBetten: 16, anteil1: 0.4, a1: 22.0, a2: 34.0, neben: NEBEN_INTENSIV, intensiv: true },
  { id: 'ambulanz', name: 'Ambulanz / MVZ', art: 'ambulant', kontakte: 1.3, dauerMin: 20, oeffStd: 9, tage: 250, ausl: 0.8, platzM2: 16, neben: NEBEN_AMB },
  { id: 'tagesklinik', name: 'Tagesklinik', art: 'ambulant', kontakte: 8, dauerMin: 300, oeffStd: 10, tage: 250, ausl: 0.85, platzM2: 12, neben: NEBEN_AMB, liege: true },
  { id: 'dialyse', name: 'Dialysezentrum', art: 'ambulant', kontakte: 156, dauerMin: 300, oeffStd: 15, tage: 312, ausl: 0.85, platzM2: 12, neben: NEBEN_AMB, liege: true, info: '3 Dialysen je Woche und Patient (156/Jahr), 5 h je Behandlung inkl. Rüstzeit' },
  { id: 'endoskopie', name: 'Endoskopie', art: 'ambulant', kontakte: 1, dauerMin: 45, oeffStd: 9, tage: 250, ausl: 0.75, platzM2: 30, neben: NEBEN_AMB },
  { id: 'zna', name: 'Zentrale Notaufnahme (ZNA)', art: 'ambulant', kontakte: 1, dauerMin: 150, oeffStd: 24, tage: 365, ausl: 0.7, platzM2: 14, neben: NEBEN_AMB, liege: true, info: 'Behandlungsdauer je Fall inkl. Diagnostik ca. 2–3 h' }
];
const NETTO = 0.82; // NUF+VF je m² BGF (Abzug Konstruktion, Schächte, Technik) – Annahme
const VF = 0.40;    // Verkehrsflächenzuschlag auf die Nutzfläche (Flure) – Annahme
const ZTIEFE = 5.6, FLUR = 2.4, WAND = 0.15;

HSS.stationCalc = (inp) => {
  const T = HSS.STATIONSTYPEN.find(t => t.id === inp.typ) || HSS.STATIONSTYPEN[0];
  const r = { typ: T, why: [], rooms: [], warn: [] };
  const prj = HSS.project();
  const art = inp.art || T.art;
  // --- stationär ---
  if (art !== 'ambulant') {
    const vwd = inp.vwd ?? T.vwd, ausl = inp.ausl ?? T.ausl;
    let faelle = inp.faelleStat || 0, betten, peakInfo = '';
    if (inp.monatlich && inp.monate?.length === 12) {
      const tage = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const bm = inp.monate.map((m, i) => (m || 0) * vwd / (tage[i] * ausl));
      faelle = U.sum(inp.monate.map(m => m || 0));
      const pk = Math.max(...bm), pi = bm.indexOf(pk);
      betten = Math.ceil(pk - 1e-9);
      peakInfo = ` Spitzenmonat ${['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][pi]}: ${U.fmt(inp.monate[pi])} Fälle × ${U.fmt(vwd, 1)} d ÷ (${tage[pi]} d × ${U.pct(ausl)}) = ${U.fmt(pk, 1)} → ${betten} Betten.`;
    } else betten = Math.ceil(faelle * vwd / (365 * ausl) - 1e-9);
    const pt = faelle * vwd;
    r.pflegetage = pt; r.betten = betten; r.vwd = vwd; r.ausl = ausl; r.faelleStat = faelle;
    r.why.push(`Pflegetage = Fälle × Verweildauer = ${U.fmt(faelle)} × ${U.fmt(vwd, 1)} d = ${U.fmt(pt)} d/Jahr`);
    r.why.push(`Bettenbedarf (Hill-Burton) = Pflegetage ÷ (365 × Auslastung) = ${U.fmt(pt)} ÷ (365 × ${U.pct(ausl)}) = ${U.fmt(pt / (365 * ausl), 1)} → ${betten} Betten.${peakInfo}`);
    r.stationen = Math.max(1, Math.ceil(betten / T.maxBetten));
    if (r.stationen > 1) r.why.push(`Stationsgröße max. ${T.maxBetten} Betten → ${r.stationen} Pflegeeinheiten (je ${Math.ceil(betten / r.stationen)} Betten)`);
    const a1 = inp.a1 ?? T.a1, a2 = inp.a2 ?? T.a2, s1 = inp.anteil1 ?? T.anteil1;
    const n1 = Math.round(betten * s1), n2 = Math.ceil((betten - n1) / 2);
    r.n1 = n1; r.n2 = n2; r.a1 = a1; r.a2 = a2;
    r.rooms.push({ use: T.intensiv ? 'patient1' : 'patient1', n: n1, m2: a1, name: T.intensiv ? 'Intensivplatz 1-Bett' : 'Patientenzimmer 1-Bett' });
    r.rooms.push({ use: 'patient2', n: n2, m2: a2, name: T.intensiv ? 'Intensivplatz 2-Bett' : 'Patientenzimmer 2-Bett' });
    r.why.push(`Zimmer: ${U.pct(s1)} Einzelzimmer → ${n1} × 1-Bett (${U.fmt(a1, 1)} m²) + ${n2} × 2-Bett (${U.fmt(a2, 1)} m²) = ${U.fmt(n1 * a1 + n2 * a2, 1)} m² inkl. Nasszelle`);
    const per = r.stationen;
    for (const [use, base, perBed, cnt] of T.neben) {
      const m2 = Math.max(4, base + perBed * betten / per); if (!base && !perBed) continue;
      r.rooms.push({ use, n: (cnt || 1) * per, m2: Math.round(m2 * 2) / 2, name: (HSS.ROOMTYPES[use] || {}).name || use });
    }
  }
  // --- ambulant ---
  if (art !== 'stationaer') {
    const TA = T.art === 'ambulant' ? T : HSS.STATIONSTYPEN.find(t => t.id === 'ambulanz');
    const faelle = inp.faelleAmb || 0, kont = inp.kontakte ?? TA.kontakte, dauer = inp.dauerMin ?? TA.dauerMin, oeff = inp.oeffStd ?? TA.oeffStd, tage = inp.tage ?? TA.tage, ausl = inp.auslAmb ?? TA.ausl;
    const kpt = faelle * kont / tage;
    const plaetze = Math.ceil(kpt * dauer / (oeff * 60 * ausl) - 1e-9);
    r.kontakteTag = kpt; r.plaetze = plaetze;
    r.why.push(`Kontakte/Tag = Fälle × Kontakte je Fall ÷ Öffnungstage = ${U.fmt(faelle)} × ${U.fmt(kont, 1)} ÷ ${tage} = ${U.fmt(kpt, 1)}`);
    r.why.push(`Behandlungsplätze = Kontakte/Tag × Dauer ÷ (Öffnungszeit × Auslastung) = ${U.fmt(kpt, 1)} × ${dauer} min ÷ (${oeff} h × 60 × ${U.pct(ausl)}) = ${U.fmt(kpt * dauer / (oeff * 60 * ausl), 2)} → ${plaetze}`);
    const warte = Math.max(4, Math.ceil(kpt / oeff * 0.75 * 1.5));
    r.rooms.push({ use: TA.liege ? 'behandlung' : 'untersuchung', n: plaetze, m2: TA.platzM2, name: TA.liege ? 'Behandlungsplatz (liegend)' : 'Untersuchung/Behandlung' });
    r.rooms.push({ use: 'warten', n: 1, m2: Math.max(12, warte * 1.6), name: `Warten (${warte} Plätze)` });
    r.why.push(`Warteplätze ≈ Kontakte je Stunde × 0,75 h Wartezeit × 1,5 Spitzenfaktor = ${warte} × 1,6 m²`);
    if (art === 'ambulant') for (const [use, base, perBed, cnt] of TA.neben) if (base) r.rooms.push({ use, n: cnt || 1, m2: base + Math.ceil(plaetze / 4) * 2, name: (HSS.ROOMTYPES[use] || {}).name || use });
  }
  r.nuf = U.sum(r.rooms.map(x => x.n * x.m2));
  r.bedarf = r.nuf * (1 + VF);
  r.why.push(`Nutzfläche (NUF) = Σ Räume = ${U.fmt(r.nuf, 1)} m²; zzgl. ${U.pct(VF)} Verkehrsfläche (Flure) = ${U.fmt(r.bedarf, 1)} m²`);
  // --- verfügbare Fläche ---
  let bgf = 0, fass = 0; const used = [];
  for (const s of inp.sel || []) {
    const P = HSS.findPart(s.part, prj); if (!P) continue;
    const k = s.half ? 0.5 : 1;
    for (const f of s.floors) { const a = HSS.partArea(P.part) * k; bgf += a; fass += G.perimeter(HSS.partFootprintLocal(P.part).outer) * k; used.push(`${P.building.kurz || P.building.name}/${P.part.name} ${HSS.floorName(HSS.globalFloor(P.part, f, prj))}${s.half ? ' (½)' : ''}: ${U.fmt(a, 0)} m²`); }
  }
  r.bgf = bgf; r.verfuegbar = bgf * NETTO;
  if (bgf) {
    r.why.push(`Verfügbar: BGF ${U.fmt(bgf, 0)} m² (${used.join('; ')}) × ${U.pct(NETTO)} nutzbarer Anteil = ${U.fmt(r.verfuegbar, 0)} m²`);
    r.deckung = r.verfuegbar / r.bedarf;
    r.why.push(`Deckungsgrad = ${U.fmt(r.verfuegbar, 0)} ÷ ${U.fmt(r.bedarf, 0)} = ${U.pct(r.deckung)} → ${r.deckung >= 1 ? 'ausreichend' : 'nicht ausreichend (Fehlfläche ' + U.fmt(r.bedarf - r.verfuegbar, 0) + ' m²)'}`);
    // Fassadenlänge für belichtete Zimmer
    const zimmer = (r.n1 || 0) + (r.n2 || 0);
    if (zimmer) {
      const achse = 3.75, bedarfF = zimmer * achse;
      r.fassadeBedarf = bedarfF; r.fassade = fass * 0.8;
      r.why.push(`Belichtung: ${zimmer} Patientenzimmer × ${U.fmt(achse, 2)} m Achsbreite = ${U.fmt(bedarfF, 0)} m Fassade; verfügbar ≈ Umfang × 80 % = ${U.fmt(fass * 0.8, 0)} m → ${fass * 0.8 >= bedarfF ? 'ausreichend' : 'zu knapp'}`);
    }
    // Gebäudetiefe für zweibündige Station
    for (const s of inp.sel || []) { const P = HSS.findPart(s.part, prj); if (!P) continue; const bb = G.bbox(HSS.partFootprintLocal(P.part).outer); const tiefe = Math.min(bb.w, bb.d); const min = 2 * ZTIEFE + FLUR + 2 * WAND; r.why.push(`Gebäudetiefe ${P.part.name}: ${U.fmt(tiefe, 1)} m; zweibündig erforderlich 2 × ${ZTIEFE} + ${FLUR} + Wände = ${U.fmt(min, 1)} m → ${tiefe >= min ? 'zweibündig möglich' : tiefe >= ZTIEFE + FLUR ? 'nur einbündig' : 'zu schmal'}`); }
  } else r.warn.push('Bitte Gebäude und Etagen wählen, um den Flächenabgleich zu rechnen.');
  return r;
};

/* ---------- Grundriss generieren ---------- */
const FURN = {
  patient1: (w, d, side, intensiv) => intensiv ? [['med.bett.intensiv', 0, 0.2], ['med.monitor.patient', -1.0, -0.8], ['med.beatmung', 1.1, -0.6], ['med.infusion', -1.1, 0.6], ['med.versorgung.decke', 0.9, -0.2, 0, 'decke']] : [['med.bett.pflege', 0, -0.2], ['stat.nachttisch', -0.85, -1.2], ['stat.schrank.patient', w / 2 - 0.45, d / 2 - 0.45, 90], ['stat.besucherstuhl', 0.9, 0.9], ['med.versorgung.wand', 0, -d / 2 + 0.1, 0, 'wand']],
  patient2: (w, d, side, intensiv) => intensiv ? [['med.bett.intensiv', -w / 4, 0.2], ['med.bett.intensiv', w / 4, 0.2], ['med.monitor.patient', -w / 2 + 0.4, -0.9], ['med.monitor.patient', w / 2 - 0.4, -0.9], ['med.beatmung', 0, -0.6]] : [['med.bett.pflege', -w / 4, -0.2], ['med.bett.pflege', w / 4, -0.2], ['stat.nachttisch', -w / 4 - 0.85, -1.2], ['stat.nachttisch', w / 4 + 0.85, -1.2], ['stat.tisch.patient', 0, 1.6], ['stat.schrank.patient', -w / 2 + 0.4, d / 2 - 0.45, 90], ['stat.schrank.patient', w / 2 - 0.4, d / 2 - 0.45, -90]],
  stuetzpunkt: (w, d) => [['stat.stuetzpunkt', 0, d / 2 - 0.9, 180], ['buero.stuhl', -0.7, d / 2 - 1.7], ['buero.stuhl', 0.7, d / 2 - 1.7], ['buero.aktenschrank', 0, -d / 2 + 0.3], ['stat.visitewagen', w / 2 - 0.6, 0]],
  rein: (w, d) => [['stat.modulschrank', -w / 2 + 0.6, -d / 2 + 0.4], ['stat.modulschrank', -w / 2 + 1.7, -d / 2 + 0.4], ['stat.arbeitszeile', w / 2 - 1.3, -d / 2 + 0.35], ['stat.verbandwagen', 0, 0.5]],
  unrein: (w, d) => [['hyg.steckbeckenspuele', -w / 2 + 0.4, -d / 2 + 0.35], ['stat.waeschesammler', 0, -d / 2 + 0.35], ['stat.abfallsammler', w / 2 - 0.65, -d / 2 + 0.3], ['stat.desinfektion', -w / 2 + 0.1, 0, 90, 'wand']],
  medikamente: (w, d) => [['stat.medikamentenschrank', -w / 2 + 0.45, -d / 2 + 0.3], ['stat.medikamentenschrank', -w / 2 + 1.15, -d / 2 + 0.3], ['stat.kuehlschrank.med', w / 2 - 0.4, -d / 2 + 0.35], ['stat.medikamentenwagen', 0, 0.6]],
  lager: (w, d) => [['buero.regal', -w / 2 + 0.6, -d / 2 + 0.3], ['buero.regal', 0, -d / 2 + 0.3], ['buero.regal', w / 2 - 0.6, -d / 2 + 0.3]],
  geraete: (w, d) => [['med.rollstuhl', -w / 2 + 0.5, -d / 2 + 0.6], ['med.patientenlifter', 0, -d / 2 + 0.7], ['med.infusion', w / 2 - 0.4, -d / 2 + 0.4], ['med.ekg', w / 2 - 0.4, 0.4]],
  arzt: (w, d) => [['buero.schreibtisch', -w / 4, -d / 2 + 0.5], ['buero.stuhl', -w / 4, -d / 2 + 1.2], ['buero.schreibtisch', w / 4, -d / 2 + 0.5], ['buero.stuhl', w / 4, -d / 2 + 1.2]],
  personal: (w, d) => [['kueche.teekueche', 0, -d / 2 + 0.35], ['stat.tisch.patient', 0, 0.8]],
  besprechung: (w, d) => [['buero.besprechung', 0, 0]],
  bad: (w, d) => [['san.pflegebadewanne', 0, 0], ['san.waschtisch', w / 2 - 0.3, -d / 2 + 0.25, 0, 'wand']],
  entsorgung: (w, d) => [['log.abfall240', -0.4, -d / 2 + 0.45], ['log.abfall240', 0.3, -d / 2 + 0.45], ['log.waeschewagen.unrein', 0, 0.8]],
  putz: (w, d) => [['buero.regal', 0, -d / 2 + 0.3]],
  wc: (w, d) => [['san.wc', 0, -d / 2 + 0.35, 0, 'wand'], ['san.waschtisch', w / 2 - 0.35, 0, -90, 'wand']],
  kueche: (w, d) => [['kueche.teekueche', 0, -d / 2 + 0.35], ['log.speisenwagen', 0, 0.9]],
  aufenthalt: (w, d) => [['warte.sofa', 0, -d / 2 + 0.5], ['stat.tisch.patient', 0, 0.8], ['warte.pflanze', w / 2 - 0.4, -d / 2 + 0.4]],
  untersuchung: (w, d) => [['med.liege.untersuchung', -w / 4, 0, 90], ['med.ultraschall', w / 4, -0.5], ['buero.schreibtisch', w / 4, d / 2 - 0.6, 180]],
  behandlung: (w, d) => [['med.stuhl.behandlung', 0, 0], ['med.monitor.patient', -0.8, -0.8], ['stat.nachttisch', 0.8, -0.8]],
  warten: (w, d) => Array.from({ length: Math.max(1, Math.floor(w / 2.6)) }, (_, i) => ['warte.stuhlreihe', -w / 2 + 1.3 + i * 2.6, -d / 2 + 0.4]).concat([['warte.pflanze', w / 2 - 0.4, d / 2 - 0.4]])
};

HSS.generateStation = (inp, calc, opts = {}) => {
  const prj = HSS.project();
  const st = { id: U.uid('st'), name: inp.name || calc.typ.name, typ: calc.typ.id, art: inp.art || calc.typ.art, betten: calc.betten || 0, plaetze: calc.plaetze || 0, vwd: calc.vwd, auslastung: calc.ausl, faelleStat: inp.faelleStat, faelleAmb: inp.faelleAmb, monate: inp.monatlich ? inp.monate : null, sel: U.clone(inp.sel), calc: { bedarf: calc.bedarf, verfuegbar: calc.verfuegbar, deckung: calc.deckung, nuf: calc.nuf } };
  const report = { placed: 0, dropped: [] };
  // Raumliste expandieren
  let list = [];
  for (const r of calc.rooms) for (let i = 0; i < r.n; i++) list.push({ use: r.use, m2: r.m2, name: r.name });
  const patients = list.filter(r => r.use.startsWith('patient')), others = list.filter(r => !r.use.startsWith('patient'));
  // Auf die gewählten Geschosse verteilen
  const slots = [];
  for (const s of inp.sel || []) { const P = HSS.findPart(s.part, prj); if (!P) continue; for (const f of s.floors) slots.push({ P, f, half: s.half }); }
  if (!slots.length) return { st, report: { placed: 0, dropped: list.map(r => r.name) } };
  const per = Math.ceil(patients.length / slots.length);
  slots.forEach((sl, i) => { sl.rooms = patients.slice(i * per, (i + 1) * per).concat(i === 0 ? others : others.filter(o => ['stuetzpunkt', 'rein', 'unrein', 'putz', 'wc'].includes(o.use)).map(o => Object.assign({}, o))); });
  for (const sl of slots) layoutFloor(sl, st, calc.typ, report, opts);
  prj.stations.push(st);
  return { st, report };
};
function layoutFloor(sl, st, T, report, opts) {
  const prj = HSS.project(), pt = sl.P.part, f = sl.f;
  const fp = HSS.partFootprintLocal(pt), bb = G.bbox(fp.outer);
  // lokale Achse: lange Seite = x‘
  const alongX = bb.w >= bb.d;
  let L = alongX ? bb.w : bb.d, D = alongX ? bb.d : bb.w;
  let s0 = alongX ? bb.x0 : bb.z0, c = alongX ? bb.cz : bb.cx;
  if (sl.half) { L = L / 2; s0 = s0 + (opts.halfSecond ? L : 0); }
  const toLoc = (s, t) => alongX ? [s, t] : [t, s];
  const I = HSS.interior(pt.id, f, true, prj);
  if (opts.replace) { I.walls = []; I.doors = []; I.rooms = []; prj.objects = prj.objects.filter(o => !(o.host?.part === pt.id && o.host.floor === f && o.station)); }
  const double = D >= 2 * 4.2 + FLUR + 0.3;
  const depth = double ? (D - FLUR - 0.3) / 2 : D - FLUR - 0.15;
  const tA0 = c - D / 2 + 0.15, tFlur = double ? c : c + D / 2 - FLUR / 2 - 0.15;
  const sides = double ? [{ t0: tA0, dir: -1 }, { t0: c + FLUR / 2, dir: 1 }] : [{ t0: tA0, dir: -1 }];
  // Flur
  const flur = { id: U.uid('r'), use: 'flur', name: 'Flur', station: st.id };
  const fc = toLoc(s0 + L / 2, tFlur); Object.assign(flur, alongX ? { x: fc[0], z: fc[1], w: L - 0.3, d: FLUR } : { x: fc[0], z: fc[1], w: FLUR, d: L - 0.3 });
  I.rooms.push(flur);
  // Kern (Erschließung) in der Mitte, Nebenräume beidseits davon, Zimmer an den Enden
  const rooms = sl.rooms.slice();
  const coreExists = prj.objects.some(o => o.host?.part === pt.id && o.core);
  const anyLift = prj.objects.some(o => o.host?.part === pt.id && HSS.library.get(o.lib)?.logistik?.rolle === 'aufzug');
  const coreW = opts.core !== false && (coreExists || !anyLift || opts.core === 'force') ? 9.0 : 0;
  const center = s0 + L / 2;
  const sideRooms = sides.map(() => []);
  const ancill = rooms.filter(r => !r.use.startsWith('patient')), pats = rooms.filter(r => r.use.startsWith('patient'));
  ancill.forEach((r, i) => sideRooms[double ? (i % 2) : 0].push(r));
  pats.forEach((r, i) => sideRooms[double ? (i % 2) : 0].push(r));
  const walls = [], newObjs = [];
  sides.forEach((sd, si) => {
    // Positionen von der Mitte nach außen abwechselnd links/rechts
    let left = center - (si === 0 ? coreW / 2 : 0), right = center + (si === 0 ? coreW / 2 : 0);
    const lim0 = s0 + 0.15 + (opts.reserveStart || 0), lim1 = s0 + L - 0.15 - (opts.reserveEnd || 0);
    let toggle = 0;
    for (const r of sideRooms[si]) {
      const isPat = r.use.startsWith('patient');
      const w = Math.max(isPat ? (r.use === 'patient2' ? 3.9 : 3.4) : 2.2, Math.round(r.m2 / depth * 10) / 10);
      let a0;
      if (toggle % 2 === 0 && right + w <= lim1) { a0 = right; right += w; }
      else if (left - w >= lim0) { a0 = left - w; left -= w; }
      else if (right + w <= lim1) { a0 = right; right += w; }
      else { report.dropped.push(r.name); continue; }
      toggle++;
      const tc = sd.dir < 0 ? sd.t0 + depth / 2 : sd.t0 + depth / 2;
      const cc = toLoc(a0 + w / 2, tc);
      const room = { id: U.uid('r'), use: r.use, name: r.name, station: st.id, x: cc[0], z: cc[1], w: alongX ? w : depth, d: alongX ? depth : w };
      if (!G.pointIn([room.x, room.z], fp.outer) || fp.holes.some(h => G.pointIn([room.x, room.z], h))) { report.dropped.push(r.name); continue; }
      I.rooms.push(room); report.placed++;
      walls.push(...HSS.roomWalls(room));
      // Tür zur Flurseite
      const doorT = sd.dir < 0 ? sd.t0 + depth : sd.t0;
      room._door = { s: a0 + w / 2 + (isPat ? w / 2 - 1.0 : 0), t: doorT, w: isPat ? 1.4 : 1.1, lib: isPat ? 'erschl.tuer.bett' : 'erschl.tuer.1' };
      // Nasszelle
      if (isPat && !T.intensiv) {
        const nw = 2.1, nd = 2.0, ns = a0 + w - nw / 2 - 0.05 - (0), nt = sd.dir < 0 ? doorT - nd / 2 : doorT + nd / 2;
        const nc = toLoc(a0 + nw / 2 + 0.05, nt);
        const nass = { id: U.uid('r'), use: 'nass', name: 'Nasszelle', station: st.id, x: nc[0], z: nc[1], w: alongX ? nw : nd, d: alongX ? nd : nw };
        I.rooms.push(nass); walls.push(...HSS.roomWalls(nass));
        const wc = toLoc(a0 + 0.5, sd.dir < 0 ? doorT - nd + 0.4 : doorT + nd - 0.4);
        newObjs.push({ lib: 'san.wc', x: wc[0], z: wc[1], rot: alongX ? (sd.dir < 0 ? 0 : 180) : (sd.dir < 0 ? -90 : 90) });
      }
      // Möbel (lokales Raumsystem: Fassade bei −d/2)
      const fn = FURN[r.use];
      if (fn && opts.furnish !== false) {
        const rw = w, rd = depth;
        for (const [lib, fx, fz, frot = 0, anch] of fn(rw, rd, sd.dir, T.intensiv)) {
          if (!HSS.library.get(lib)) continue;
          // Raumlokal → Bauteillokal: Fassade liegt bei dir<0 an der kleinen t-Seite
          const s = a0 + rw / 2 + fx * (sd.dir < 0 ? 1 : -1), t = tc + fz * (sd.dir < 0 ? 1 : -1);
          const loc = toLoc(s, t);
          const baseRot = alongX ? (sd.dir < 0 ? 0 : 180) : (sd.dir < 0 ? -90 : 90);
          newObjs.push({ lib, x: Math.round(loc[0] * 100) / 100, z: Math.round(loc[1] * 100) / 100, rot: (baseRot + frot) % 360 });
        }
      }
      room.role = ({ stuetzpunkt: 'stuetzpunkt', rein: 'rein', unrein: 'unrein', medikamente: 'medikamente', kueche: 'kueche', aufenthalt: 'aufenthalt' })[r.use] || undefined;
    }
  });
  // Erschließungskern
  if (coreW && !coreExists) {
    const cc = toLoc(center - 2.0, sides[0].t0 + depth / 2), tc = toLoc(center + 2.6, sides[0].t0 + depth / 2);
    newObjs.push({ lib: 'erschl.aufzug.bett', x: cc[0], z: cc[1], rot: alongX ? 180 : 90, core: true });
    newObjs.push({ lib: 'erschl.treppe', x: tc[0], z: tc[1], rot: alongX ? 90 : 0, core: true });
  }
  // Wände (Duplikate entfernen) + Türen
  const ded = HSS.dedupeWalls(walls);
  I.walls.push(...ded);
  for (const r of I.rooms) {
    if (!r._door) continue;
    const dp = toLoc(r._door.s, r._door.t);
    let best = null, bd = 0.4;
    for (const w of I.walls) { const cp = G.closestOnSeg(dp, w.a, w.b); const d = G.dist(dp, cp.pt); if (d < bd) { bd = d; best = { w, t: cp.t }; } }
    if (best) I.doors.push({ id: U.uid('d'), wall: best.w.id, t: best.t, w: r._door.w, lib: r._door.lib });
    delete r._door;
  }
  for (const o of newObjs) prj.objects.push(Object.assign({ id: U.uid('obj'), lib: o.lib, host: { part: pt.id, floor: f }, x: o.x, z: o.z, rot: o.rot }, o.core ? { core: true } : { station: st.id }));
}
})();
