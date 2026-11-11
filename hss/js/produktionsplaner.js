/* =====================================================================
   HSS · produktionsplaner.js – Produktionsplaner (Fabric Planning Suite)
   Gleiches Prinzip wie der Stationsplaner: Fertigungsprinzip wählen, Mengen und Zeiten
   angeben, Halle und Etage wählen – die Suite rechnet Takt, Maschinen, Stationen, Personal
   und Fläche nachvollziehbar (Frage → Erklärung → Rechnung → Ergebnis, mit Grundlage) und
   legt das Layout mit Maschinen, Linienmodulen und Umfeld in die Halle.
   Fertigungsprinzipien: Montagelinie (Fließ-/Taktmontage), Serienfertigung (verkettete
   Bearbeitung), Fertigungsinseln, Werkstattfertigung, Lackiererei, Prüffeld, Lager/Logistik.
   Produktgröße: Pkw-Motor (Takt 3 m, Förderer) oder Großmotor (FTS-Stationsmontage, 8-m-Raster).
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$, $$ = UI.$$, W = UI.ws;
if (HSS.EDITION !== 'fabrik') return;

/* ---------- Grundlagen (erscheinen unter „Quellen & Planungsgrundlagen“) ---------- */
Object.assign(HSS.QUELLEN, {
  refa: { titel: 'REFA-Methodenlehre: Zeitarten, Planzeiten, Kapazitätsrechnung', art: 'Methode (Arbeitswirtschaft)', erklaerung: 'Gliederung der Betriebsmittel- und Auftragszeiten; Kapazität = verfügbare Zeit × Nutzungsgrad. Grundlage für Kundentakt, Maschinen- und Personalbedarf.' },
  oee: { titel: 'VDMA 66412-1: MES-Kennzahlen (u. a. OEE – Gesamtanlageneffektivität)', art: 'Branchenstandard', erklaerung: 'OEE = Verfügbarkeit × Leistungsgrad × Qualitätsrate. Verkettete Zerspanung erreicht in der Serie häufig 65–85 %; der Wert ist je Werk zu erheben.' },
  asr18: { titel: 'ASR A1.8 Verkehrswege', art: 'Technische Regel für Arbeitsstätten', erklaerung: 'Breite von Fahrwegen: Breite des Transportmittels bzw. der Last plus Randzuschläge von je 0,50 m, bei Begegnungsverkehr zusätzlich 0,40 m. Gänge zu Arbeitsplätzen mindestens 0,60–1,00 m.' },
  asr12: { titel: 'ASR A1.2 Raumabmessungen und Bewegungsflächen', art: 'Technische Regel für Arbeitsstätten', erklaerung: 'Freie Bewegungsfläche am Arbeitsplatz mindestens 1,50 m² und mindestens 1,00 m breit; Flächen für Bereitstellung und Wartung zusätzlich.' },
  fabrik: { titel: 'Grundig, C.-G.: Fabrikplanung – Planungssystematik, Methoden, Anwendungen (Hanser)', art: 'Fachliteratur', erklaerung: 'Ermittlung des Flächenbedarfs aus Betriebsmittel-, Bedien-, Wartungs- und Verkehrsflächen; Zuschläge für Bereitstellung und Verkehrswege je nach Fertigungsprinzip.' },
  datenblatt: { titel: 'Herstellerangaben (Maschinen- und Motorendatenblätter), gerundet', art: 'Herstellerangabe', erklaerung: 'Aufstellmaße typischer Bearbeitungszentren, Schleifmaschinen, Prüfstände und Motorabmessungen. Für die Ausführungsplanung durch Aufstellpläne ersetzen.' }
});
{ const chip0 = UI.srcChip; const LBL = { refa: 'REFA', oee: 'VDMA 66412', asr18: 'ASR A1.8', asr12: 'ASR A1.2', fabrik: 'Fabrikplanung', datenblatt: 'Herstellerangaben' };
  UI.srcChip = id => LBL[id] ? `<a href="#" class="src" data-src="${id}" title="${U.esc(HSS.QUELLEN[id].titel)}">${LBL[id]}</a>` : chip0(id); }

/* ---------- Raumtypen ---------- */
Object.assign(HSS.ROOMTYPES, { lackiererei: { name: 'Lackiererei', color: '#ead9e6', din: 'NUF3' }, prueffeld: { name: 'Prüffeld / Prüfstände', color: '#dfe3ec', din: 'NUF3' }, mechfertigung: { name: 'Mechanische Fertigung', color: '#dde4ef', din: 'NUF3' } });
Object.assign(HSS.ROLLEN, { lackiererei: 'Lackiererei', prueffeld: 'Prüffeld', mechfertigung: 'Mechanische Fertigung' });
if (HSS.ED?.raumtypen) for (const k of ['mechfertigung', 'lackiererei', 'prueffeld']) if (!HSS.ED.raumtypen.includes(k)) HSS.ED.raumtypen.splice(HSS.ED.raumtypen.indexOf('montage') + 1, 0, k);

/* ---------- Fertigungsprinzipien ---------- */
const FAM = () => HSS.manip.LINIENFAMILIEN;
const T = HSS.PRODTYPEN = [
  { id: 'montage', name: 'Montagelinie (Fließ-/Taktmontage)', zone: 'montage', info: 'Motor wandert im Takt von Station zu Station – Pkw-Motoren auf Werkstückträgern (3-m-Takt), Großmotoren auf Schwerlast-FTS (8-m-Raster, Bühnen beidseitig).',
    def: { produkt: 'gross', stueck: 1800, inhalt: 6000, tage: 230, schichten: 2, h: 7.5, verf: 0.9, abtakt: 0.85 } },
  { id: 'fertigung', name: 'Serienfertigung (verkettete Bearbeitung)', zone: 'mechfertigung', info: 'Bearbeitungszentren in zwei Reihen an einer automatisierten Verkettung (Portallader/FTS), z. B. Kurbelgehäuse oder Zylinderköpfe; am Ende Waschen und Messen.',
    def: { produkt: 'gross', stueck: 2000, zeit: 900, tage: 230, schichten: 3, h: 7.5, oee: 0.75 } },
  { id: 'insel', name: 'Fertigungsinseln', zone: 'mechfertigung', info: 'Selbstständige Inseln mit Maschinen, Roboter, Messen und Bereitstellung – flexibel für Varianten und mittlere Stückzahlen.',
    def: { inseltyp: 'zylinderkopf', stueck: 30000, zeit: 22, tage: 230, schichten: 3, h: 7.5, oee: 0.75 } },
  { id: 'werkstatt', name: 'Werkstattfertigung (Verrichtungsprinzip)', zone: 'mechfertigung', info: 'Gleichartige Maschinen werden zu Bereichen zusammengefasst (Fräsen, Drehen, Honen, Messen, Nacharbeit) – für Einzelteile, Ersatzteile und Kleinserien.',
    def: { hFraesen: 9000, hDrehen: 6000, hHonen: 3000, hMessen: 2500, hNacharbeit: 2000, tage: 230, schichten: 2, h: 7.5, ausl: 0.8 } },
  { id: 'lackierung', name: 'Lackiererei (Großmotoren)', zone: 'lackiererei', info: 'Durchlauf: Abkleben → Waschen/Vorbehandlung → Spritzkabine → Trockner → Entkleben, verbunden über Skidförderer; Farbmischraum im Ex-Bereich.',
    def: { stueck: 2400, abkleben: 120, waschen: 40, lackieren: 75, trocknen: 150, tage: 230, schichten: 2, h: 7.5, ausl: 0.85 } },
  { id: 'pruef', name: 'Prüffeld (Abnahmeläufe)', zone: 'prueffeld', info: 'Jeder Motor läuft vor der Auslieferung unter Last auf dem Prüfstand (Heißtest). Großmotoren-Prüfzellen mit Wasserwirbelbremse, Abgasanlage und Leitwarte.',
    def: { produkt: 'gross', stueck: 1800, pruefh: 6, ruesth: 2, tage: 230, schichten: 3, h: 7.5, ausl: 0.8 } },
  { id: 'lager', name: 'Lager & Bereitstellung (Logistik)', zone: 'lager_fab', info: 'Palettenregale mit Staplergassen und Fachbodenregale (KLT) für die Bereitstellung an Linie und Inseln.',
    def: { paletten: 900, klt: 1500 } }
];
const INSELN = { zylinderkopf: { lib: 'pm.insel.zylinderkopf', n: 2, name: 'Zylinderkopf (2 BAZ)' }, kurbelwelle: { lib: 'pm.insel.kurbelwelle', n: 3, name: 'Kurbelwelle (Drehen, 2× Schleifen)' }, roboterzelle: { lib: 'pm.insel.roboterzelle', n: 1, name: 'Roboterzelle Entgraten' }, montageu: { lib: 'pm.insel.montage.u', n: 3, name: 'Montageinsel U-Form (3 Werker)' } };
const WERKSTATT = [['hFraesen', 'Fräsen', 'pm.station.fraesen'], ['hDrehen', 'Drehen', 'pm.station.drehen'], ['hHonen', 'Honen', 'pm.station.honen'], ['hMessen', 'Messen (KMG)', 'pm.station.messraum'], ['hNacharbeit', 'Nacharbeit', 'pm.station.nacharbeit']];
const GANG = 4.0; // Hauptgang Stapler/FTS, Begegnungsverkehr (ASR A1.8)
const sz = lib => HSS.library.get(lib)?.size || { w: 1, d: 1, h: 1 };

/* ---------- Rechnung ---------- */
HSS.prodCalc = (inp, prj = HSS.project()) => {
  const typ = T.find(t => t.id === inp.typ) || T[0], v = k => inp[k] ?? typ.def[k];
  const r = { typ, steps: [], warn: [], kpi: [], bedarf: 0 };
  const S = o => r.steps.push(o);
  const netto = v('tage') * v('schichten') * v('h') * 60;
  if (netto) S({ frage: 'Wie viel Arbeitszeit steht im Jahr zur Verfügung?', erkl: 'Arbeitstage × Schichten × Nettoarbeitszeit je Schicht (ohne Pausen). Grundlage jeder Takt- und Kapazitätsrechnung.', rechnung: `${v('tage')} Tage × ${v('schichten')} Schichten × ${U.fmt(v('h'), 1)} h × 60`, ergebnis: `${U.fmt(netto)} min/Jahr (${U.fmt(netto / 60)} h)`, quellen: ['refa'] });
  r.netto = netto;
  if (typ.id === 'montage') {
    const F = FAM()[v('produkt')], wps = v('produkt') === 'gross' ? 3 : 2;
    const takt = netto * v('verf') / v('stueck');
    S({ frage: 'Welcher Takt ist nötig (Kundentakt)?', erkl: `Die verfügbare Zeit, gemindert um Störungen und Anlaufverluste (Verfügbarkeit ${U.pct(v('verf'))}), wird auf die geforderte Stückzahl verteilt. Alle ${U.fmt(takt, 1)} Minuten muss ein Motor die Linie verlassen.`, rechnung: `${U.fmt(netto)} min × ${U.pct(v('verf'))} ÷ ${U.fmt(v('stueck'))} Motoren`, ergebnis: `Takt ${U.fmt(takt, 1)} min`, quellen: ['refa'] });
    const werker = Math.ceil(v('inhalt') / (takt * v('abtakt')));
    S({ frage: 'Wie viele Werker braucht die Linie je Schicht?', erkl: `Der Montageinhalt (${U.fmt(v('inhalt'))} min je Motor) wird auf Werker verteilt, die je Takt arbeiten. Weil sich Arbeitsinhalte nie exakt gleich verteilen lassen, rechnet man mit einem Abtaktungsgrad von ${U.pct(v('abtakt'))}.`, rechnung: `${U.fmt(v('inhalt'))} min ÷ (${U.fmt(takt, 1)} min × ${U.pct(v('abtakt'))})`, ergebnis: `${werker} Werker je Schicht`, quellen: ['refa'] });
    const st = Math.max(2, Math.ceil(werker / wps));
    S({ frage: 'Wie viele Stationen hat die Linie?', erkl: v('produkt') === 'gross' ? 'An einem Großmotor arbeiten je Station bis zu drei Werker gleichzeitig (Arbeitsbühnen links und rechts, Stirnseite).' : 'An einer beidseitig zugänglichen Station arbeiten zwei Werker (links und rechts des Förderers).', rechnung: `${werker} Werker ÷ ${wps} Werker je Station`, ergebnis: `${st} Montagestationen`, quellen: ['annahme'] });
    const L = (st + 2) * F.raster, B = F.breite + 2 * 3.0;
    S({ frage: 'Wie lang und breit wird die Linie?', erkl: `Stationsraster ${F.raster} m (${v('produkt') === 'gross' ? 'FTS mit Motor, Bühnen, Werkzeugwagen' : 'Werkstückträger, Werker, Durchlaufregal'}); dazu Linienanfang und -ende. Beidseitig 3 m Versorgungs- und Fahrweg für Routenzug/Stapler.`, rechnung: `(${st} + 2) × ${F.raster} m = ${U.fmt(L)} m Länge; ${F.breite} m + 2 × 3 m = ${U.fmt(B)} m Breite`, ergebnis: `${U.fmt(L)} × ${U.fmt(B)} m = ${U.fmt(L * B)} m² (gerade Linie)`, quellen: ['asr18', 'datenblatt'] });
    r.bedarf = L * B * 1.15;
    S({ frage: 'Wie viel Hallenfläche braucht die Montage insgesamt?', erkl: 'Zuschlag 15 % für Pufferflächen, Leergut, Teamzonen und Nacharbeitsplatz an der Linie.', rechnung: `${U.fmt(L * B)} m² × 1,15`, ergebnis: `${U.fmt(r.bedarf)} m²`, quellen: ['fabrik'] });
    Object.assign(r, { takt, werker, stationen: st, laenge: L, familie: v('produkt') });
    r.kpi = [[U.fmt(takt, 1) + ' min', 'Takt'], [st, 'Stationen'], [werker, 'Werker/Schicht'], [U.fmt(L) + ' m', 'Linienlänge (gestreckt)']];
  } else if (typ.id === 'fertigung' || typ.id === 'insel') {
    const isl = typ.id === 'insel' ? INSELN[v('inseltyp')] : null, gross = typ.id === 'fertigung' && v('produkt') === 'gross';
    const bedarfMin = v('stueck') * v('zeit'), kap = netto * v('oee');
    const m = Math.max(1, Math.ceil(bedarfMin / kap));
    S({ frage: 'Wie viel Maschinenzeit wird im Jahr gebraucht?', erkl: `Stückzahl × Bearbeitungszeit je Teil (Summe aller Arbeitsgänge${isl ? ' auf den Maschinen der Insel' : ''}).`, rechnung: `${U.fmt(v('stueck'))} Teile × ${U.fmt(v('zeit'))} min`, ergebnis: `${U.fmt(bedarfMin / 60)} Maschinenstunden/Jahr`, quellen: ['refa'] });
    S({ frage: 'Wie viele Maschinen sind nötig?', erkl: `Eine Maschine liefert die verfügbare Zeit mal Gesamtanlageneffektivität (OEE ${U.pct(v('oee'))}: Verfügbarkeit × Leistung × Qualität).`, rechnung: `${U.fmt(bedarfMin)} min ÷ (${U.fmt(netto)} min × ${U.pct(v('oee'))})`, ergebnis: `${m} Maschine${m > 1 ? 'n' : ''} (Auslastung ${U.pct(bedarfMin / (m * kap))})`, quellen: ['oee'] });
    if (isl) {
      const n = Math.ceil(m / isl.n), s = sz(isl.lib), cell = (s.w + GANG) * (s.d + GANG);
      S({ frage: 'Wie viele Inseln entstehen?', erkl: `Eine Insel „${isl.name}“ umfasst ${isl.n} Maschine${isl.n > 1 ? 'n' : ''} bzw. Plätze mit Roboter, Bereitstellung, Messen und Schutzzaun.`, rechnung: `${m} ÷ ${isl.n} je Insel`, ergebnis: `${n} Insel${n > 1 ? 'n' : ''}`, quellen: ['annahme'] });
      r.bedarf = n * cell;
      S({ frage: 'Wie viel Fläche brauchen die Inseln?', erkl: `Aufstellfläche einer Insel ${U.fmt(s.w, 1)} × ${U.fmt(s.d, 1)} m (inkl. Bedien-, Wartungs- und Bereitstellungsfläche) plus anteilig ${GANG} m Fahrweg ringsum.`, rechnung: `${n} × (${U.fmt(s.w, 1)} + ${GANG}) × (${U.fmt(s.d, 1)} + ${GANG}) m`, ergebnis: `${U.fmt(r.bedarf)} m²`, quellen: ['asr18', 'fabrik'] });
      Object.assign(r, { maschinen: m, inseln: n, lib: isl.lib }); r.kpi = [[m, 'Maschinen'], [n, 'Inseln'], [Math.ceil(n * (isl.n > 2 ? 3 : 1.5)), 'Bediener/Schicht']];
    } else {
      const lib = gross ? 'pm.gm.baz' : 'pm.hw.hbaz', s = sz(lib), raster = s.w + 1.2, proReihe = Math.ceil(m / 2);
      const L = proReihe * raster + 14, B = 2 * s.d + 2 * 3.0 + 4.0;
      S({ frage: 'Wie wird die Linie angeordnet?', erkl: `Zwei Maschinenreihen, Bedienseite zur Verkettung in der Mitte (4 m für Portallader/FTS). Maschinenraster ${U.fmt(raster, 1)} m (Maschine ${U.fmt(s.w, 1)} m + 1,2 m Wartungsgang). Am Linienende Waschanlage, Messraum und Kühlschmierstoff-Anlage (ca. 14 m).`, rechnung: `${proReihe} × ${U.fmt(raster, 1)} m + 14 m = ${U.fmt(L)} m; 2 × ${U.fmt(s.d, 1)} m + 4 m + 2 × 3 m Fahrweg = ${U.fmt(B)} m`, ergebnis: `${U.fmt(L)} × ${U.fmt(B)} m`, quellen: ['datenblatt', 'asr18'] });
      r.bedarf = L * B;
      Object.assign(r, { maschinen: m, lib, proReihe, laenge: L }); r.kpi = [[m, 'Maschinen'], [proReihe, 'je Reihe'], [Math.ceil(m / 3), 'Bediener/Schicht'], [U.fmt(L) + ' m', 'Linienlänge']];
    }
  } else if (typ.id === 'werkstatt') {
    const nh = netto / 60 * v('ausl'); r.gruppen = [];
    for (const [k, name, lib] of WERKSTATT) {
      const n = v(k) > 0 ? Math.max(1, Math.ceil(v(k) / nh)) : 0; if (!n) continue;
      r.gruppen.push({ name, lib, n }); const s = sz(lib); r.bedarf += n * (s.w + 2) * (s.d + 2);
    }
    S({ frage: 'Wie viele Arbeitsplätze braucht jede Werkstattgruppe?', erkl: `Auftragsstunden je Verfahren ÷ nutzbare Stunden eines Platzes (${U.fmt(netto / 60)} h × Auslastung ${U.pct(v('ausl'))} = ${U.fmt(nh)} h). In der Werkstattfertigung bleibt Reserve für Rüsten und wechselnde Aufträge.`, rechnung: r.gruppen.map(g => `${g.name}: ${U.fmt(v(WERKSTATT.find(w => w[1] === g.name)[0]))} h ÷ ${U.fmt(nh)} h`).join(' · '), ergebnis: r.gruppen.map(g => `${g.n} × ${g.name}`).join(', '), quellen: ['refa'] });
    S({ frage: 'Wie viel Fläche braucht die Werkstatt?', erkl: 'Jeder Platz bringt sein Umfeld mit (Werkzeugschrank, Werkbank, Kran, Gitterboxen); dazu 2 m Gang ringsum und ein Hauptgang zwischen den Gruppen.', rechnung: 'Σ Plätze × (Breite + 2 m) × (Tiefe + 2 m)', ergebnis: `${U.fmt(r.bedarf)} m²`, quellen: ['fabrik', 'asr12'] });
    r.kpi = [[U.sum(r.gruppen.map(g => g.n)), 'Arbeitsplätze'], [r.gruppen.length, 'Gruppen']];
  } else if (typ.id === 'lackierung') {
    const k = netto * v('ausl'), n = key => Math.max(1, Math.ceil(v('stueck') * v(key) / k));
    const nA = n('abkleben'), nW = n('waschen'), nK = n('lackieren'), nT = Math.ceil(n('trocknen') / 2);
    S({ frage: 'Wie viele Plätze braucht jeder Prozessschritt?', erkl: `Für jeden Schritt gilt: Stückzahl × Belegungszeit ÷ (verfügbare Zeit × ${U.pct(v('ausl'))}). Der Trockner hat zwei Plätze je Einheit.`, rechnung: `Abkleben ${v('abkleben')} min → ${nA} · Waschen ${v('waschen')} min → ${nW} · Lackieren ${v('lackieren')} min → ${nK} · Trocknen ${v('trocknen')} min → ${nT} Trockner`, ergebnis: `${nA} Abklebeplätze, ${nW} Waschkabine(n), ${nK} Spritzkabine(n), ${nT} Trockner`, quellen: ['refa'] });
    r.prozess = [['pm.lack.abkleben', nA, 'Abkleben'], ['pm.lack.vorbehandlung', nW, 'Waschen'], ['pm.lack.kabine', nK, 'Lackieren'], ['pm.lack.trockner', nT, 'Trocknen'], ['pm.lack.abkleben', Math.max(1, Math.ceil(nA / 2)), 'Entkleben']];
    const L = U.sum(r.prozess.map(([lib]) => sz(lib).w + 3)) + 8, B = Math.max(...r.prozess.map(([lib, m]) => m * (sz(lib).d + 2))) + 8;
    r.bedarf = L * B;
    S({ frage: 'Wie groß wird die Lackiererei?', erkl: 'Die Schritte liegen im Durchlauf hintereinander, parallele Einheiten nebeneinander; je 3 m Skidförderer zwischen den Schritten, Farbmischraum und Fahrweg (4 m) zusätzlich.', rechnung: `Länge Σ (Kabinenlänge + 3 m) + 8 m = ${U.fmt(L)} m; Breite ${U.fmt(B)} m`, ergebnis: `${U.fmt(r.bedarf)} m²`, quellen: ['datenblatt', 'fabrik'] });
    r.kpi = [[nK, 'Spritzkabinen'], [nT, 'Trockner'], [nA, 'Abklebeplätze']];
  } else if (typ.id === 'pruef') {
    const h = (v('pruefh') + v('ruesth')) * v('stueck'), kh = netto / 60 * v('ausl'), n = Math.max(1, Math.ceil(h / kh));
    S({ frage: 'Wie viele Prüfstandsstunden werden gebraucht?', erkl: 'Jeder Motor läuft unter Last (Einlauf- und Abnahmeprogramm) und muss auf- und abgerüstet werden (Kraftstoff, Kühlwasser, Abgas, Welle zur Bremse).', rechnung: `${U.fmt(v('stueck'))} Motoren × (${v('pruefh')} h Lauf + ${v('ruesth')} h Rüsten)`, ergebnis: `${U.fmt(h)} h/Jahr`, quellen: ['annahme'] });
    S({ frage: 'Wie viele Prüfstände sind nötig?', erkl: `Ein Prüfstand ist ${U.fmt(netto / 60)} h im Jahr besetzt und zu ${U.pct(v('ausl'))} nutzbar (Instandhaltung, Kalibrierung, Sonderläufe).`, rechnung: `${U.fmt(h)} h ÷ ${U.fmt(kh)} h`, ergebnis: `${n} Prüfstände`, quellen: ['refa'] });
    const lib = v('produkt') === 'gross' ? 'pm.gm.pruefzelle' : 'pm.station.pruefstand', s = sz(lib);
    r.bedarf = n * (s.w + 1) * s.d + n * (s.w + 1) * 6;
    S({ frage: 'Wie viel Fläche braucht das Prüffeld?', erkl: `Prüfzelle mit Leitwarte ${U.fmt(s.w, 1)} × ${U.fmt(s.d, 1)} m; davor ein Transportgang von 6 m für FTS/Kran und Rüstplätze.`, rechnung: `${n} × ${U.fmt(s.w + 1, 1)} m × (${U.fmt(s.d, 1)} + 6) m`, ergebnis: `${U.fmt(r.bedarf)} m²`, quellen: ['datenblatt', 'asr18'] });
    Object.assign(r, { staende: n, lib }); r.kpi = [[n, 'Prüfstände'], [U.fmt(h / n / (netto / 60) * 100, 0) + ' %', 'Auslastung']];
  } else if (typ.id === 'lager') {
    const reg = Math.ceil(v('paletten') / 9), fb = Math.ceil(v('klt') / 24);
    S({ frage: 'Wie viele Regale werden gebraucht?', erkl: 'Palettenregalfeld 2,8 m mit drei Ebenen à drei Paletten (9 Stellplätze); Fachbodenregal 2 m mit 6 Böden für rund 24 Kleinladungsträger.', rechnung: `${U.fmt(v('paletten'))} Paletten ÷ 9 · ${U.fmt(v('klt'))} KLT ÷ 24`, ergebnis: `${reg} Palettenregalfelder, ${fb} Fachbodenregale`, quellen: ['annahme'] });
    r.bedarf = reg * 2.8 * (1.1 + 1.6) + fb * 2.0 * (0.6 + 1.2) + 120;
    S({ frage: 'Wie viel Fläche braucht das Lager?', erkl: 'Doppelregalzeilen mit 3,2 m Gasse für Schubmaststapler (je Regalzeile halbe Gasse), Kommissionierzone und Bereitstellfläche (120 m²).', rechnung: `${reg} × 2,8 m × 2,7 m + ${fb} × 2 m × 1,8 m + 120 m²`, ergebnis: `${U.fmt(r.bedarf)} m²`, quellen: ['asr18'] });
    Object.assign(r, { regale: reg, fachboden: fb }); r.kpi = [[reg, 'Regalfelder'], [fb, 'Fachbodenregale'], [U.fmt(v('paletten')), 'Palettenplätze']];
  }
  // Flächenabgleich mit der gewählten Halle
  const P = inp.part && HSS.findPart(inp.part, prj);
  if (P) {
    const R = HSS.innenRechteck(HSS.partFootprintLocal(P.part).outer), frei = prodFrei(prj, P.part, inp.floor ?? 0, R);
    r.verfuegbar = frei.flaeche; r.deckung = r.verfuegbar / r.bedarf;
    S({ frage: 'Passt das in die gewählte Halle?', erkl: `Nutzbar ist das Innenrechteck der Halle${frei.belegt ? ' abzüglich bereits geplanter Bereiche' : ''}. Ab 100 % passt die Planung, darunter wird sie gekürzt bzw. es fehlen Plätze.`, rechnung: `${U.fmt(frei.L, 1)} m × ${U.fmt(frei.Q, 1)} m frei = ${U.fmt(r.verfuegbar)} m² ÷ ${U.fmt(r.bedarf)} m²`, ergebnis: `${U.pct(r.deckung)} – ${r.deckung >= 1 ? 'passt' : r.deckung >= 0.9 ? 'knapp' : 'zu klein'}`, ampel: r.deckung >= 1 ? 'g' : r.deckung >= 0.9 ? 'y' : 'r', quellen: ['annahme'] });
  } else r.warn.push('Bitte eine Halle und Etage wählen, um den Flächenabgleich zu rechnen.');
  return r;
};

/* ---------- Belegung der Halle (u entlang der Hallenlänge, v quer) ---------- */
const frame = (pt, R) => {
  const e = 0.6, x0 = R.x0 + e, x1 = R.x1 - e, z0 = R.z0 + e, z1 = R.z1 - e, alongX = (x1 - x0) >= (z1 - z0);
  const L = alongX ? x1 - x0 : z1 - z0, Q = alongX ? z1 - z0 : x1 - x0, ang = alongX ? 0 : 90, O = alongX ? [x0, z0] : [x1, z0];
  const toLoc = (u, v) => { const q = G.rot([u, v], U.rad(ang)); return [O[0] + q[0], O[1] + q[1]]; };
  const toUV = (x, z) => G.rot([x - O[0], z - O[1]], -U.rad(ang));
  return { L, Q, ang, toLoc, toUV };
};
function prodFrei(prj, pt, f, R) {
  const F = frame(pt, R); let u0 = 0;
  for (const e of prj.produktion || []) if (e.part === pt.id && e.floor === f) u0 = Math.max(u0, e.u1 + 3);
  return { L: Math.max(0, F.L - u0), Q: F.Q, flaeche: Math.max(0, F.L - u0) * F.Q, belegt: u0 > 0, u0 };
}
// Umriss eines Objekts im (u, v)-Rahmen
const objUV = (F, o) => { const d = HSS.library.get(o.lib), s = o.size || d.size, r = U.rad((o.rot || 0) - F.ang), hw = (Math.abs(Math.cos(r)) * s.w + Math.abs(Math.sin(r)) * s.d) / 2, hd = (Math.abs(Math.sin(r)) * s.w + Math.abs(Math.cos(r)) * s.d) / 2, c = F.toUV(o.x, o.z); return [c[0] - hw, c[0] + hw, c[1] - hd, c[1] + hd]; };

HSS.prodGenerate = (prj, inp, calc, o = {}) => {
  const P = HSS.findPart(inp.part, prj); if (!P) return { placed: 0, dropped: ['keine Halle gewählt'] };
  const pt = P.part, f = inp.floor ?? 0, R = HSS.innenRechteck(HSS.partFootprintLocal(pt).outer), F = frame(pt, R);
  prj.produktion = prj.produktion || [];
  if (o.ersetzen) {
    const ids = new Set(prj.produktion.filter(e => e.part === pt.id && e.floor === f).map(e => e.id));
    prj.objects = prj.objects.filter(x => !(x.prod && ids.has(x.prod)) && !(o.leeren && x.host?.part === pt.id && x.host.floor === f));
    const I = HSS.interior(pt.id, f, false, prj); if (I) I.rooms = I.rooms.filter(r => !(r.prod && ids.has(r.prod)) && !(o.leeren && r.noWalls));
    prj.produktion = prj.produktion.filter(e => !ids.has(e.id));
  }
  const frei = prodFrei(prj, pt, f, R), id = U.uid('prod'), host = { part: pt.id, floor: f }, neu = [], rep = { placed: 0, dropped: [] };
  const uMax = F.L, vMax = F.Q;
  const put = (lib, u, v, rotUV = 0, extra = {}) => { const q = F.toLoc(u, v), ob = Object.assign({ id: U.uid('obj'), lib, x: Math.round(q[0] * 100) / 100, z: Math.round(q[1] * 100) / 100, rot: ((rotUV + F.ang) % 360 + 360) % 360, host: U.clone(host), prod: id, auto: true }, extra); const b = objUV(F, ob); if (b[0] < frei.u0 - 0.5 || b[1] > uMax + 0.5 || b[2] < -0.5 || b[3] > vMax + 0.5) { rep.dropped.push(HSS.library.get(lib)?.name || lib); return null; } prj.objects.push(ob); neu.push(ob); rep.placed++; return ob; };
  const u0 = frei.u0 + 1.5, typ = calc.typ.id;
  // Raster: Objekte in Zeilen quer zur Halle, mit Gängen
  const raster = (items, gU = GANG, gV = GANG) => {
    let u = u0, v = 1.5, zeileU = 0;
    for (const lib of items) { const s = sz(lib); if (v + s.d > vMax - 0.5) { u += zeileU + gU; v = 1.5; zeileU = 0; } if (u + s.w > uMax) { rep.dropped.push(HSS.library.get(lib)?.name || lib); continue; } put(lib, u + s.w / 2, v + s.d / 2); v += s.d + gV; zeileU = Math.max(zeileU, s.w); }
  };
  if (typ === 'montage') {
    const fam = calc.familie, FA = FAM()[fam], start = sz(FA.start).w;
    const lenAvail = uMax - u0 - 2, k0 = Math.floor((lenAvail - start - sz(FA.ende).w - 2 * FA.raster) / FA.raster);
    const zweiReihen = calc.stationen > k0 && vMax >= (fam === 'gross' ? 27 : 16);
    const k = zweiReihen ? Math.max(1, Math.min(k0, Math.ceil(calc.stationen / 2))) : 0;
    const v0 = zweiReihen ? (vMax / 2 - (fam === 'gross' ? 8 : 4.5)) : vMax / 2;
    const s0 = put(FA.start, u0 + start / 2, v0, 0); if (s0) {
      let cur = s0; const seq = HSS.manip.linienFolge(fam, calc.stationen, k);
      for (const lib of seq) { const q = HSS.manip.linieNaechstes(cur, lib); if (!q) break; q.prod = id; q.auto = true; const b = objUV(F, q); if (b[1] > uMax + 0.5 || b[2] < -0.5 || b[3] > vMax + 0.5 || b[0] < frei.u0 - 0.5) { rep.dropped.push(HSS.library.get(lib).name); continue; } prj.objects.push(q); neu.push(q); rep.placed++; cur = q; }
    }
    // Bereitstellung entlang der Linie: Routenzug-Haltepunkte, Leergut
    const b = neu.length ? neu.map(x => objUV(F, x)).reduce((a, c) => [Math.min(a[0], c[0]), Math.max(a[1], c[1]), Math.min(a[2], c[2]), Math.max(a[3], c[3])]) : null;
    if (b && b[3] + 4 < vMax) for (let u = b[0] + 4; u < b[1] - 2; u += 12) put('fab.gitterbox', u, b[3] + 2.2, 0);
    if (b && b[2] - 3 > 0) put('fab.fts', b[0] + 2, b[2] - 1.6, 0);
  } else if (typ === 'fertigung') {
    const s = sz(calc.lib), ras = s.w + 1.2, vm = vMax / 2;
    for (let i = 0; i < calc.maschinen; i++) { const row = i % 2, j = Math.floor(i / 2), u = u0 + ras / 2 + j * ras; put(calc.lib, u, row ? vm + 2 + s.d / 2 : vm - 2 - s.d / 2, row ? 180 : 0); }
    // Verkettung: Förderer/Portallader in der Mitte, FTS
    const uEnd = u0 + Math.ceil(calc.maschinen / 2) * ras;
    for (let u = u0 + 1.5; u + 1.5 <= uEnd; u += 3) put('pm.linie.foerder3', u + 0, vm, 0);
    put('pm.hw.waschanlage', uEnd + 3, vm, 0); put('pm.station.messraum', uEnd + 9, vm - 1, 0); put('pm.hw.kss', uEnd + 3, vm + 4.5, 0); put('pm.hw.kss', uEnd + 3, vm - 4.5, 0);
    put('pm.hw.spaene', uEnd + 1, vm + 7, 0); put('pm.hw.spaene', uEnd + 1, vm - 7, 0); put('fab.fts', u0 - 0.2, vm, 90);
    put('pm.hw.schaltschrank', uEnd + 12, vm + 5, 180);
  } else if (typ === 'insel') {
    raster(Array(calc.inseln).fill(calc.lib));
  } else if (typ === 'werkstatt') {
    // Verrichtungsprinzip: je Gruppe eine Spalte, Hauptgang zwischen den Gruppen
    let u = u0;
    for (const g of calc.gruppen) { const s = sz(g.lib), proSp = Math.max(1, Math.floor((vMax - 3) / (s.d + 2))); for (let i = 0; i < g.n; i++) { const sp = Math.floor(i / proSp), r = i % proSp; put(g.lib, u + sp * (s.w + 2) + s.w / 2, 1.5 + r * (s.d + 2) + s.d / 2, 0); } u += Math.ceil(g.n / proSp) * (s.w + 2) + GANG; }
  } else if (typ === 'lackierung') {
    let u = u0; const vm = vMax / 2;
    put('pm.lack.mischraum', u + 3, Math.min(vMax - 3, vm + 12), 0);
    calc.prozess.forEach(([lib, n], i) => {
      const s = sz(lib); for (let k = 0; k < n; k++) put(lib, u + s.w / 2, vm + (k - (n - 1) / 2) * (s.d + 2), 0);
      u += s.w + 0.4; if (i < calc.prozess.length - 1) { put('pm.lack.skid', u + 1.2, vm, 90); u += 2.6; }
    });
  } else if (typ === 'pruef') {
    const s = sz(calc.lib), vm = vMax / 2, zwei = vMax >= 2 * s.d + 7;
    for (let i = 0; i < calc.staende; i++) { const row = zwei ? i % 2 : 0, j = zwei ? Math.floor(i / 2) : i, u = u0 + j * (s.w + 1) + s.w / 2; if (row) put(calc.lib, u, vm + 3 + s.d / 2, 180); else put(calc.lib, u, zwei ? vm - 3 - s.d / 2 : 1 + s.d / 2, 0); }
    put('pm.gm.fts', u0 + 3, zwei ? vm : s.d + 4, 0);
  } else if (typ === 'lager') {
    // Doppelregalzeilen quer, 3,2 m Gasse
    let v = 1.5, u = u0, n = 0; const reg = 'fab.palettenregal';
    while (n < calc.regale && u + 2.8 <= uMax) { put(reg, u + 1.4, v + 0.55, 0); n++; if (n < calc.regale) { put(reg, u + 1.4, v + 1.65, 180); n++; } u += 2.8; if (u + 2.8 > Math.min(uMax, u0 + 40)) { u = u0; v += 2.2 + 3.2; if (v + 2.2 > vMax - 6) break; } }
    if (n < calc.regale) rep.dropped.push(`${calc.regale - n} Regalfelder`);
    let fb = 0; for (let uu = u0; fb < calc.fachboden && uu + 2 <= uMax; uu += 2.2) { put('fab.fachbodenregal', uu + 1, vMax - 1.2, 180); fb++; }
    put('fab.schubmast', u0 + 1, v + 3.8, 90); put('fab.packtisch', u0 + 6, vMax - 4, 0);
  }
  // Fläche (Zone) über den belegten Bereich, Eintrag fürs Projekt
  if (neu.length) {
    const bb = neu.map(x => objUV(F, x)).reduce((a, c) => [Math.min(a[0], c[0]), Math.max(a[1], c[1]), Math.min(a[2], c[2]), Math.max(a[3], c[3])]);
    const ua = Math.max(frei.u0, bb[0] - 1), ub = Math.min(uMax, bb[1] + 1), va = Math.max(0, bb[2] - 1), vb = Math.min(vMax, bb[3] + 1);
    const c = F.toLoc((ua + ub) / 2, (va + vb) / 2), quer = F.ang === 90;
    const I = HSS.interior(pt.id, f, true, prj), use = calc.typ.zone;
    const name = inp.name || calc.typ.name.split(' (')[0];
    I.rooms.push({ id: U.uid('r'), use, name, noWalls: true, role: use, prod: id, x: Math.round(c[0] * 10) / 10, z: Math.round(c[1] * 10) / 10, w: Math.round((quer ? vb - va : ub - ua) * 10) / 10, d: Math.round((quer ? ub - ua : vb - va) * 10) / 10 });
    prj.produktion.push({ id, name, typ: calc.typ.id, part: pt.id, floor: f, u0: ua, u1: ub, inp: U.clone(inp), kpi: calc.kpi, bedarf: Math.round(calc.bedarf), quelle: 'Produktionsplaner' });
  }
  return rep;
};

/* ---------- Arbeitsbereich ---------- */
UI.prInp = UI.prInp || { typ: 'montage', name: '', part: null, floor: 0 };
const opt = (v, t, s) => `<option value="${U.esc(v)}" ${String(v) === String(s) ? 'selected' : ''}>${U.esc(t)}</option>`;
const FELD = {
  produkt: ['Produkt', 'sel', [['gross', 'Großmotor (FTS, 8-m-Raster)'], ['pkw', 'Pkw-Motor (Förderer, 3-m-Takt)']]],
  inseltyp: ['Inseltyp', 'sel', Object.entries(INSELN).map(([k, i]) => [k, i.name])],
  stueck: ['Stückzahl/Jahr', 50], inhalt: ['Montageinhalt [min/Stück]', 10], zeit: ['Bearbeitungszeit [min/Stück]', 1],
  tage: ['Arbeitstage/Jahr', 1], schichten: ['Schichten/Tag', 1], h: ['Nettozeit je Schicht [h]', 0.25],
  verf: ['Verfügbarkeit', 0.01], abtakt: ['Abtaktungsgrad', 0.01], oee: ['OEE', 0.01], ausl: ['Auslastung', 0.01],
  hFraesen: ['Fräsen [h/Jahr]', 100], hDrehen: ['Drehen [h/Jahr]', 100], hHonen: ['Honen [h/Jahr]', 100], hMessen: ['Messen [h/Jahr]', 100], hNacharbeit: ['Nacharbeit [h/Jahr]', 100],
  abkleben: ['Abkleben [min]', 5], waschen: ['Waschen [min]', 5], lackieren: ['Lackieren [min]', 5], trocknen: ['Trocknen [min]', 5],
  pruefh: ['Prüflauf [h/Motor]', 0.5], ruesth: ['Rüsten [h/Motor]', 0.5], paletten: ['Palettenstellplätze', 50], klt: ['KLT-Plätze', 50]
};
W.produktion = { name: 'Produktionsplaner', short: 'Produktions-planer', step: '4', lead: 'Helfer für Produktionsbereiche: Fertigungsprinzip wählen (Montagelinie, Serienfertigung, Inseln, Werkstatt, Lackiererei, Prüffeld, Lager), Mengen und Zeiten angeben, Halle wählen – die Suite rechnet Takt, Maschinen, Stationen und Fläche nachvollziehbar und legt das Layout mit allen Maschinen in die Halle.',
  render(el) {
    const prj = HSS.project(), inp = UI.prInp, typ = T.find(t => t.id === inp.typ) || T[0];
    const hallen = HSS.allParts(prj).filter(pt => !HSS.findPart(pt.id, prj).building.umgebung && pt.use !== 'tank').sort((a, b) => HSS.partArea(b) - HSS.partArea(a));
    if (!inp.part && hallen[0]) inp.part = hallen[0].id;
    const calc = HSS.prodCalc(inp);
    const felder = Object.keys(typ.def).map(k => { const F = FELD[k]; if (!F) return ''; const val = inp[k] ?? typ.def[k]; return F[1] === 'sel' ? `<label class="f full"><span>${F[0]}</span><select data-k="${k}">${F[2].map(([a, b]) => opt(a, b, val)).join('')}</select></label>` : `<label class="f"><span>${F[0]}</span><input type="number" data-k="${k}" value="${val}" step="${F[1]}"></label>`; }).join('');
    const P = inp.part && HSS.findPart(inp.part);
    const amp = calc.deckung === undefined ? '' : calc.deckung >= 1 ? '<span class="amp g"></span>passt' : calc.deckung >= 0.9 ? '<span class="amp y"></span>knapp' : '<span class="amp r"></span>zu klein';
    el.innerHTML = `<h3>1 · Fertigungsprinzip</h3>
    <div class="fg"><label class="f full"><span>Bereich</span><select id="pT">${T.map(t => opt(t.id, t.name, inp.typ)).join('')}</select></label>
    <label class="f full"><span>Bezeichnung</span><input type="text" id="pN" value="${U.esc(inp.name || '')}" placeholder="${U.esc(typ.name.split(' (')[0])}"></label></div>
    <div class="note">${U.esc(typ.info)}</div>
    <h3>2 · Mengen und Zeiten</h3><div class="fg">${felder}</div>
    <h3>3 · Halle &amp; Etage</h3>
    ${hallen.length ? `<div class="fg"><label class="f full"><span>Halle / Gebäude</span><select id="pP">${hallen.map(pt => opt(pt.id, `${HSS.findPart(pt.id).building.kurz} · ${pt.name} (${U.fmt(HSS.partArea(pt))} m²)`, inp.part)).join('')}</select></label>
    ${P ? `<label class="f"><span>Etage</span><select id="pF">${HSS.partFloors(P.part).filter(f => f >= 0).map(f => opt(f, HSS.floorName(HSS.globalFloor(P.part, f)), inp.floor ?? 0)).join('')}</select></label>` : ''}</div>` : '<p class="note">Erst eine Halle anlegen (Arbeitsbereich „Gebäude“).</p>'}
    <h3>Ergebnis</h3>
    <div class="kpi">${calc.kpi.map(([a, b]) => `<div><b>${a}</b><span>${U.esc(b)}</span></div>`).join('')}<div><b>${U.fmt(calc.bedarf)} m²</b><span>Flächenbedarf</span></div>${calc.verfuegbar !== undefined ? `<div><b>${U.fmt(calc.verfuegbar)} m²</b><span>frei · ${amp}</span></div>` : ''}</div>
    <div class="row" style="justify-content:space-between;margin-top:8px"><b class="note" style="color:#0A223C">So wird gerechnet</b><button class="mini" id="pSrc">Quellen &amp; Planungsgrundlagen</button></div>
    <div class="steps">${calc.steps.map((st, i) => UI.stepCard(st, i + 1)).join('')}</div>
    ${calc.warn.map(w => `<div class="warnbox">${U.esc(w)}</div>`).join('')}
    <label class="chk"><input type="checkbox" id="pRepl"> bisherige Planungen dieser Halle/Etage ersetzen</label>
    <label class="chk"><input type="checkbox" id="pLeer"> Halle/Etage vorher komplett leeren (auch Zonen und Objekte)</label>
    <div class="note">Der Bereich wird ab dem nächsten freien Abschnitt der Halle gelegt – mehrere Bereiche (z. B. Montage, Prüffeld, Lager) passen hintereinander in eine Halle.</div>
    <div class="actions"><button class="primary" id="pGo" ${P ? '' : 'disabled'}>Bereich anlegen</button></div>
    <h3>Produktionsbereiche im Projekt (${(prj.produktion || []).length})</h3>
    <div class="list">${(prj.produktion || []).map(e => `<div class="li" data-pe="${e.id}"><span class="t">${U.esc(e.name)}</span><span class="s">${U.esc(HSS.findPart(e.part)?.part.name || '')} · ${(e.kpi || []).slice(0, 2).map(k => k[0] + ' ' + k[1]).join(' · ')}</span><button class="mini" data-ped="${e.id}">×</button></div>`).join('') || '<div class="li note">noch keine</div>'}</div>`;
    const re = () => UI.renderPanel();
    $('#pSrc', el).onclick = () => UI.sourcesDialog();
    $$('[data-src]', el).forEach(b => b.onclick = e => { e.preventDefault(); UI.sourcesDialog(b.dataset.src); });
    $('#pT', el).onchange = e => { const keep = { typ: e.target.value, name: '', part: inp.part, floor: inp.floor }; for (const k of Object.keys(inp)) delete inp[k]; Object.assign(inp, keep); re(); };
    $('#pN', el).onchange = e => (inp.name = e.target.value);
    $$('[data-k]', el).forEach(i => i.onchange = () => { inp[i.dataset.k] = i.tagName === 'SELECT' ? i.value : (i.value === '' ? undefined : +i.value); re(); });
    $('#pP', el) && ($('#pP', el).onchange = e => { inp.part = e.target.value; inp.floor = 0; re(); });
    $('#pF', el) && ($('#pF', el).onchange = e => { inp.floor = +e.target.value; re(); });
    $('#pGo', el).onclick = () => {
      if (HSS.state.demoReadonly) return UI.toast('Demo ist schreibgeschützt – „Als eigenes Projekt bearbeiten“ wählen.');
      let rep; HSS.manip?.mark();
      HSS.change('Produktionsbereich anlegen', p => { rep = HSS.prodGenerate(p, inp, calc, { ersetzen: $('#pRepl', el).checked || $('#pLeer', el).checked, leeren: $('#pLeer', el).checked }); });
      const Pp = HSS.findPart(inp.part); if (Pp) { HSS.s3.setFloor(HSS.globalFloor(Pp.part, inp.floor ?? 0)); HSS.s3.focusSel({ kind: 'part', id: inp.part }); }
      const drop = [...new Set(rep.dropped)];
      UI.dialog(`<h2>Produktionsbereich angelegt</h2><p>${rep.placed} Maschinen, Module und Ausstattungen platziert, Fläche „${U.esc(inp.name || calc.typ.name.split(' (')[0])}“ angelegt.</p>${drop.length ? `<div class="warnbox">Nicht untergebracht (Halle zu klein oder belegt): ${drop.map(U.esc).join(', ')}</div>` : '<div class="okbox">Alles untergebracht.</div>'}<p class="note">Linienmodule lassen sich anklicken und über die Leiste am Objekt verlängern; die Fläche erhält eine Rolle für Materialflüsse.</p><div class="actions"><button class="primary" data-close>OK</button></div>`);
      UI.renderPanel();
    };
    $$('[data-pe]', el).forEach(li => li.onclick = e => { if (e.target.dataset.ped) return; const x = (prj.produktion || []).find(q => q.id === li.dataset.pe), Pp = x && HSS.findPart(x.part); if (Pp) { HSS.s3.setFloor(HSS.globalFloor(Pp.part, x.floor)); HSS.s3.focusSel({ kind: 'part', id: x.part }); } });
    $$('[data-ped]', el).forEach(b => b.onclick = async () => { if (!await UI.confirm('Bereich entfernen', 'Produktionsbereich mit seinen Maschinen und seiner Fläche entfernen?', 'Entfernen')) return; HSS.change('Produktionsbereich entfernen', p => { const id = b.dataset.ped; p.objects = p.objects.filter(o => o.prod !== id); for (const pid of Object.keys(p.interiors)) for (const f of Object.keys(p.interiors[pid])) p.interiors[pid][f].rooms = p.interiors[pid][f].rooms.filter(r => r.prod !== id); p.produktion = (p.produktion || []).filter(e => e.id !== id); }); UI.renderPanel(); });
  } };
// Reihenfolge der Arbeitsbereiche: Produktionsplaner an die Stelle des Stationsplaners
{ const e = Object.entries(UI.ws), i = e.findIndex(([k]) => k === 'station'), pr = e.find(([k]) => k === 'produktion'); if (i >= 0 && pr) { const rest = e.filter(([k]) => k !== 'produktion'); rest.splice(i + 1, 0, pr); for (const [k] of e) delete UI.ws[k]; for (const [k, v] of rest) UI.ws[k] = v; } }
})();
