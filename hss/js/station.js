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

/* Quellen und Planungsgrundlagen (im Stationsplaner unter „Quellen“ erläutert) */
HSS.QUELLEN = {
  destatis: { titel: 'Statistisches Bundesamt (Destatis): Krankenhausstatistik, Grunddaten der Krankenhäuser 2023', art: 'Amtliche Statistik', erklaerung: 'Jährliche Vollerhebung aller deutschen Krankenhäuser seit 1991 (GENESIS-Tabelle 23111). Liefert je Fachabteilung Fälle, Belegungstage und die durchschnittliche Verweildauer. Bundesmittel 2023: 7,2 Tage; Innere Medizin 5,3, Allgemeine Chirurgie 5,1, Geriatrie 15,3 Tage (Berichterstattung epd/evangelisch.de vom 27.09.2024).', url: 'https://www.evangelisch.de/inhalte/234428/27-09-2024/mehr-behandlungsfaelle-krankenhaeusern' },
  gbe: { titel: 'Gesundheitsberichterstattung des Bundes (GBE-Bund) 2023, aufbereitet von Statista', art: 'Amtliche Statistik', erklaerung: 'Verweildauer nach Fachabteilung auf Basis der Destatis-Daten: Allgemeine Psychiatrie 26,2 Tage, Psychosomatik 45,9 Tage. Hinweis: Für die Geriatrie weist diese Quelle 18,8 Tage aus (andere Abgrenzung); das Tool nutzt 15,3 Tage nach Destatis.', url: 'https://de.statista.com/statistik/daten/studie/369355/umfrage/verweildauer-in-deutschen-krankenhaeusern-nach-medizinischen-fachabteilungen' },
  hillburton: { titel: 'Hill-Burton-Formel in der Krankenhausplanung der Länder (DKG-Bestandsaufnahme 2025)', art: 'Planungsmethode der Landesministerien', erklaerung: 'Die Länder ermitteln den Bettenbedarf nach wie vor überwiegend mit der Hill-Burton-Formel: Betten = Einwohner × Krankenhaushäufigkeit × Verweildauer ÷ (1.000 × 365 × Bettennutzungsgrad). Einwohner × Krankenhaushäufigkeit entspricht der Fallzahl; das Tool rechnet deshalb direkt mit den Fällen.', url: 'https://www.dkgev.de/fileadmin/default/Mediapool/1_DKG/1.7_Presse/1.7.1_Pressemitteilungen/2026/DKG_Bestandsaufnahme_2025.pdf' },
  nutzungsgrad: { titel: 'Bettennutzungsgrade der Landeskrankenhauspläne', art: 'Vorgabe der Landesministerien', erklaerung: 'Der Bettennutzungsgrad wird meist vom zuständigen Landesministerium vorgegeben: in der Regel 85 % für somatische Fachrichtungen, 80 % für Kinderheilkunde und 90 % für Psychosomatik (DKG-Bestandsaufnahme, zitiert nach Wikipedia „Krankenhausplanung“, Stand 2010). Länder können abweichen; Sachsen hob z. B. die Psychosomatik 2012 auf 95 % an (OVG Sachsen, 5 A 820/11). Die 85 % lassen Puffer für Belegungsspitzen, Isolationen und Reinigung.', url: 'https://de.wikipedia.org/wiki/Krankenhausplanung' },
  ovg: { titel: 'Sächsisches Oberverwaltungsgericht, Urteil 5 A 820/11', art: 'Rechtsprechung', erklaerung: 'Bestätigt, dass Planungsbehörden die Ist-Auslastung mit der „85 %igen Belegung, die der Krankenhausplan allgemein zugrunde legt“ vergleichen, und dass die Bedarfsanalyse den tatsächlichen Bedarf abbilden muss.', url: 'https://www.justiz.sachsen.de/ovgentschweb/documents/11A820.U02.pdf' },
  rlp: { titel: 'Ministerium für Wissenschaft und Gesundheit Rheinland-Pfalz: Arbeitshilfen 2.01 (Pflege allgemein), 2.10 (Geriatrie), 2.03 (Intensiv)', art: 'Vorgabe eines Landesministeriums (Förderrichtlinie)', erklaerung: 'Musterraumprogramme für geförderte Krankenhausbaumaßnahmen. Beispiele: Geriatrie 1-Bett-Zimmer 21,0 m², 2-Bett-Zimmer 28,5 m², jeweils inkl. Nasszelle 3,5 m²; Allgemeinpflege (AH 2.01, 2021): Pflegearbeiten rein mit Stützpunkt, Personalaufenthalt und Teeküche zusammen ca. 48–57 m², Pflegearbeiten unrein/Entsorgung 14–16 m² (bei Bedarf zwei Räume à 7 m²), Stationsleitung 12 m², Lager für Geräte, Material und Wäsche 30–35 m², dezentrale Bettenaufbereitung 28 m² je Ebene; Arbeits- und Nebenräume gesamt 178–213 m², Station gesamt 513–733,5 m² je nach Größe. Das Tool übernimmt diese Größenordnungen für Zimmer- und Nebenraumflächen.', url: 'https://mwg.rlp.de/fileadmin/15/Abteilung_2_Gesundheit/Krankenhauswesen/Finanzierung_Entgelte/AH_2.01_Pflege_Allgemein_2021_03_02.pdf' },
  din: { titel: 'DIN 13080 (Gliederung des Krankenhauses in Funktionsbereiche) und DIN 277-1 (Grundflächen)', art: 'Norm', erklaerung: 'DIN 13080 ordnet Räume den Funktionsbereichen zu (z. B. Pflege, Untersuchung/Behandlung, Ver- und Entsorgung). DIN 277-1 definiert die Flächenarten: Brutto-Grundfläche (BGF), Nutzungsfläche (NUF), Verkehrsfläche (VF, z. B. Flure) und Technikfläche. Das Tool rechnet in diesen Begriffen; die Anteile 82 % (nutzbar von der BGF) und 40 % Flurzuschlag sind Erfahrungswerte und je Projekt anpassbar.', url: 'https://www.din.de/en/wdc-beuth:din21:252635669' },
  divi: { titel: 'DIVI-Empfehlung zur Struktur und Ausstattung von Intensivstationen 2022 (Erwachsene)', art: 'Fachgesellschaft', erklaerung: 'Empfehlungen zu Stufen der Intensivversorgung, Personal, Ausstattung und Bauweise. Eine begleitende Erhebung (597 Stationen) fand im Bestand mediane Zimmergrößen von 19 m² (Einzelzimmer) und 31 m² (Mehrbettzimmer). Das Tool setzt für Neuplanungen 25 m² / 40 m² an (Annahme oberhalb des Bestands).', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10243682' },
  dguv: { titel: 'DGUV Information 207-027 „Neu- und Umbauplanung im Krankenhaus unter Gesichtspunkten des Arbeitsschutzes – Pflegebereiche“', art: 'Regel der Unfallversicherung', erklaerung: 'Anforderungen an Pflegebereiche aus Sicht des Arbeitsschutzes: Patientenzimmer mindestens 10 m² (1 Bett) bzw. 8 m² je Bett (Mehrbett) zuzüglich Nasszelle und Schränken; Betten von beiden Längsseiten zugänglich, hintere Betten ohne Umstellen herausfahrbar; Türen von Patientenzimmern mit mindestens 1,40 m lichter Breite für Bettentransporte; reiner Pflegearbeitsraum ca. 20 m² mit kurzem Weg zum Dienstplatz, bei großen Stationen zusätzlicher unreiner Arbeitsraum; Personal-WC und Aufenthaltsraum. Das Tool nutzt diese Werte für Zimmerbreiten, Türbreiten, Bewegungsflächen und die Einrichtung.', url: 'https://www.unfallkasse-nrw.de/fileadmin/server/download/Regeln_und_Schriften/Informationen/207-027.pdf' },
  sh: { titel: 'Standardprogramm für Krankenhäuser in Schleswig-Holstein (Ministerium, Stand 2012)', art: 'Vorgabe eines Landesministeriums (Förderrichtlinie)', erklaerung: 'Modulares Raumprogramm nach DIN 13080 für geförderte Krankenhausbauten. Beispiele: Allgemeinpflege als interdisziplinäre Einheit mit 36–38 Betten, Bettenzimmer um 22 m²; Personalaufenthaltsraum mit Teeküche 16 m²; Arbeits- und Reinigungsraum 8 m². Das Tool übernimmt die Größenordnung des Personalaufenthalts und des Putzraums.', url: 'https://www.schleswig-holstein.de/DE/fachinhalte/K/krankenhaeuser/Downloads/krankenhaeuser_KrankenhausStandardProgr.pdf?__blob=publicationFile&v=1' },
  argebau: { titel: 'Bauministerkonferenz (ARGEBAU): Planungshilfe „Neuordnung der Pflege“ und Planungshilfe Palliativstationen', art: 'Planungshilfe der Bauministerien', erklaerung: 'Begriffe und Kennwerte zur Funktionsstelle 2.01 Allgemeinpflege nach DIN 13080. Vergleichswerte: Einbettzimmer ca. 20 m², Zweibettzimmer ca. 21 m² je Bett; rund 30 m² Hauptnutzfläche je Bett, rund 50 m² je Bett einschließlich aller Nebenräume. Das Tool prüft die erzeugte Station gegen diese Größenordnung.', url: 'https://www.dgpalliativmedizin.de/images/stories/Planungshilfe_Palliativstationen.pdf' },
  krinko: { titel: 'KRINKO-Empfehlungen (Robert Koch-Institut): Händehygiene 2016, Aufbereitung von Medizinprodukten 2012', art: 'Empfehlung einer Bundesbehörde', erklaerung: 'Händewaschplätze mit Spendern für Seife, Desinfektionsmittel und Einmalhandtücher in Arbeitsräumen; Steckbecken und Urinflaschen werden maschinell in Reinigungs-Desinfektionsgeräten (Steckbeckenspülgerät) im unreinen Arbeitsraum aufbereitet; reine und unreine Tätigkeiten räumlich getrennt. Das Tool stattet die Arbeitsräume entsprechend aus.', url: 'https://www.rki.de/DE/Themen/Infektionskrankheiten/Krankenhaushygiene/KRINKO/krinko_node.html' },
  annahme: { titel: 'Planungsannahme der Suite', art: 'Annahme', erklaerung: 'Erfahrungswert ohne verbindliche Vorgabe. Im Formular änderbar; vor einer Planung mit Bestandsdaten oder Landesvorgaben abgleichen.' }
};
// Nebenräume: [Raumtyp, Grundfläche m², Zuschlag m² je Bett, Anzahl, Quelle]
// Größenordnungen nach RLP AH 2.01/2.03 (Ministerium), Standardprogramm Schleswig-Holstein, DGUV 207-027
const NEBEN_PFLEGE = [['stuetzpunkt', 14, 0.2, 1, 'rlp'], ['rein', 12, 0.18, 1, 'dguv'], ['unrein', 10, 0.15, 1, 'rlp'], ['medikamente', 8, 0.06, 1, 'annahme'], ['entsorgung', 6, 0.04, 1, 'rlp'], ['lager', 10, 0.3, 1, 'rlp'], ['geraete', 8, 0.25, 1, 'rlp'],
  ['betten', 12, 0.05, 1, 'rlp'], ['leitung', 12, 0, 1, 'rlp'], ['arzt', 12, 0.1, 1, 'annahme'], ['untersuchung', 16, 0, 1, 'annahme'], ['personal', 14, 0.12, 1, 'sh'], ['besprechung', 14, 0.05, 1, 'annahme'],
  ['bad', 14, 0, 1, 'dguv'], ['putz', 7, 0, 1, 'sh'], ['wc', 4.5, 0, 2, 'dguv'], ['kueche', 8, 0.06, 1, 'annahme'], ['aufenthalt', 16, 0.2, 1, 'annahme']];
const NEBEN_INTENSIV = [['stuetzpunkt', 20, 0.5, 1, 'divi'], ['rein', 14, 0.5, 1, 'rlp'], ['unrein', 12, 0.35, 1, 'rlp'], ['medikamente', 10, 0.2, 1, 'annahme'], ['entsorgung', 8, 0.15, 1, 'rlp'], ['lager', 14, 0.9, 1, 'divi'], ['geraete', 16, 1.2, 1, 'divi'],
  ['labor', 8, 0, 1, 'divi'], ['schleuse', 5, 0, 2, 'dguv'], ['leitung', 12, 0, 1, 'rlp'], ['arzt', 14, 0.3, 1, 'divi'], ['personal', 16, 0.3, 1, 'sh'], ['besprechung', 16, 0, 1, 'annahme'], ['angehoerige', 12, 0, 1, 'divi'], ['putz', 7, 0, 1, 'sh'], ['wc', 4.5, 0, 2, 'dguv']];
const NEBEN_AMB = [['warten', 0, 0], ['stuetzpunkt', 14, 0, 1, 'annahme'], ['arzt', 12, 0, 1, 'annahme'], ['rein', 8, 0, 1, 'annahme'], ['unrein', 8, 0, 1, 'annahme'], ['lager', 10, 0, 1, 'annahme'], ['personal', 12, 0, 1, 'sh'], ['putz', 6, 0, 1, 'sh'], ['wc', 4.5, 0, 2, 'dguv']];
HSS.NEBENRAUM_INFO = {
  stuetzpunkt: 'Dienstplatz der Pflege: Tresen zum Flur, Dokumentationsplätze, Belegungstafel, Notfallwagen; zentral gelegen mit Sicht auf den Flur.',
  rein: 'Pflegearbeitsraum rein: Arbeitszeile mit Spüle, Modulschränke für Verbrauchsmaterial, Kühlschrank, Verband- und Infusionswagen, Handwaschplatz.',
  unrein: 'Pflegearbeitsraum unrein: Steckbeckenspülgerät, Ausgussbecken, Abtropfregal, Wäsche- und Abfallsammler – strikt getrennt vom reinen Arbeitsraum.',
  medikamente: 'Medikamentenraum: Arzneischränke, BtM-Tresor (BtMVV), Medikamentenkühlschrank, Richtplatz, Medikamentenwagen.',
  entsorgung: 'Abstellraum unrein: Bereitstellung von Abfall- und Schmutzwäschebehältern für die Abholung durch den Transportdienst.',
  lager: 'Lager für Material und Wäsche: Fachbodenregale, Modul- und Wäschewagen (Modulversorgung).', geraete: 'Geräteraum: Rollstühle, Patientenlifter, Infusionspumpen, Toilettenstuhl, EKG.',
  betten: 'Bettenabstellraum: aufbereitete Betten und Bettenzubehör.', leitung: 'Büro der Stationsleitung.', arzt: 'Arztdienstraum mit Arbeitsplätzen.',
  untersuchung: 'Untersuchungs- und Behandlungsraum der Station.', personal: 'Personalaufenthalt mit Teeküche (Pausenraum nach Arbeitsstättenverordnung, mit Tageslicht).',
  besprechung: 'Besprechung und Dienstübergabe.', bad: 'Pflegebad: höhenverstellbare Wanne, Duschliege, Lifter.', putz: 'Putzraum für den Reinigungsdienst mit Ausguss.',
  wc: 'WC für Personal und Besucher.', kueche: 'Stationsküche (Verteilerküche): Speisenwagen, Kühlschrank, Spülmaschine.', aufenthalt: 'Tagesraum für Patientinnen und Patienten.',
  labor: 'Stationslabor / Blutgasanalyse.', schleuse: 'Vorraum (Schleuse) vor Isolierzimmern.', angehoerige: 'Raum für Angehörige.'
};

HSS.STATIONSTYPEN = [
  { id: 'innere', name: 'Innere Medizin (Normalpflege)', art: 'stationaer', vwd: 5.3, vwdQ: 'destatis', ausl: 0.85, maxBetten: 34, anteil1: 0.2, a1: 19.5, a2: 26.0, neben: NEBEN_PFLEGE },
  { id: 'chirurgie', name: 'Allgemeinchirurgie', art: 'stationaer', vwd: 5.1, vwdQ: 'destatis', ausl: 0.85, maxBetten: 34, anteil1: 0.2, a1: 19.5, a2: 26.0, neben: NEBEN_PFLEGE },
  { id: 'unfall', name: 'Unfallchirurgie / Orthopädie', art: 'stationaer', vwd: 6.0, ausl: 0.85, maxBetten: 34, anteil1: 0.2, a1: 20.0, a2: 27.0, neben: NEBEN_PFLEGE },
  { id: 'kardio', name: 'Kardiologie', art: 'stationaer', vwd: 4.5, ausl: 0.85, maxBetten: 32, anteil1: 0.25, a1: 19.5, a2: 26.0, neben: NEBEN_PFLEGE },
  { id: 'neuro', name: 'Neurologie', art: 'stationaer', vwd: 6.2, ausl: 0.85, maxBetten: 32, anteil1: 0.25, a1: 20.0, a2: 27.0, neben: NEBEN_PFLEGE },
  { id: 'stroke', name: 'Stroke Unit', art: 'stationaer', vwd: 3.5, ausl: 0.8, maxBetten: 12, anteil1: 0.5, a1: 22.0, a2: 32.0, neben: NEBEN_INTENSIV },
  { id: 'geriatrie', name: 'Geriatrie', art: 'stationaer', vwd: 15.3, vwdQ: 'destatis', ausl: 0.85, maxBetten: 30, anteil1: 0.3, a1: 21.0, a2: 28.5, neben: NEBEN_PFLEGE },
  { id: 'onko', name: 'Onkologie / Hämatologie', art: 'stationaer', vwd: 7.0, ausl: 0.85, maxBetten: 28, anteil1: 0.4, a1: 21.0, a2: 28.0, neben: NEBEN_PFLEGE },
  { id: 'gyn', name: 'Gynäkologie & Geburtshilfe', art: 'stationaer', vwd: 3.3, ausl: 0.85, maxBetten: 30, anteil1: 0.3, a1: 20.0, a2: 27.0, neben: NEBEN_PFLEGE },
  { id: 'paed', name: 'Pädiatrie', art: 'stationaer', vwd: 3.8, ausl: 0.80, maxBetten: 24, anteil1: 0.5, a1: 22.0, a2: 30.0, neben: NEBEN_PFLEGE },
  { id: 'psych', name: 'Allgemeine Psychiatrie', art: 'stationaer', vwd: 26.2, vwdQ: 'gbe', ausl: 0.90, maxBetten: 24, anteil1: 0.3, a1: 18.0, a2: 25.0, neben: NEBEN_PFLEGE },
  { id: 'psychosom', name: 'Psychosomatik', art: 'stationaer', vwd: 45.9, vwdQ: 'gbe', ausl: 0.90, maxBetten: 20, anteil1: 0.6, a1: 18.0, a2: 25.0, neben: NEBEN_PFLEGE },
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

// Auslastungsquelle je Typ
HSS.auslQuelle = T => (T.intensiv || T.art === 'ambulant' || ['palliativ', 'stroke'].includes(T.id)) ? 'annahme' : 'nutzungsgrad';
HSS.stationCalc = (inp) => {
  const T = HSS.STATIONSTYPEN.find(t => t.id === inp.typ) || HSS.STATIONSTYPEN[0];
  const r = { typ: T, steps: [], rooms: [], warn: [] };
  const S = o => r.steps.push(o);
  const prj = HSS.project();
  const art = inp.art || T.art;
  const MON = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  if (art !== 'ambulant') {
    const vwd = inp.vwd ?? T.vwd, ausl = inp.ausl ?? T.ausl;
    let faelle = inp.faelleStat || 0, betten, peak = null;
    if (inp.monatlich && inp.monate?.length === 12) {
      const tage = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      const bm = inp.monate.map((m, i) => (m || 0) * vwd / (tage[i] * ausl));
      faelle = U.sum(inp.monate.map(m => m || 0));
      const pk = Math.max(...bm), pi = bm.indexOf(pk); betten = Math.ceil(pk - 1e-9);
      peak = { mon: MON[pi], f: inp.monate[pi], t: tage[pi], pk };
    } else betten = Math.ceil(faelle * vwd / (365 * ausl) - 1e-9);
    const pt = faelle * vwd;
    r.pflegetage = pt; r.betten = betten; r.vwd = vwd; r.ausl = ausl; r.faelleStat = faelle;
    S({ frage: 'Wie viele Belegungstage fallen im Jahr an?', erkl: `Jeder stationäre Fall liegt im Durchschnitt ${U.fmt(vwd, 1)} Tage im Krankenhaus (Verweildauer). Fälle × Verweildauer ergibt die Belegungstage (Pflegetage).`, rechnung: `${U.fmt(faelle)} Fälle × ${U.fmt(vwd, 1)} Tage`, ergebnis: `${U.fmt(pt)} Belegungstage pro Jahr`, quellen: [T.vwdQ || 'annahme'] });
    S({ frage: 'Wie viele Betten werden gebraucht?', erkl: `Ein Bett kann höchstens 365 Tage im Jahr belegt sein. Geplant wird mit ${U.pct(ausl)} Auslastung, damit Spitzen, Isolationen und Bettenreinigung aufgefangen werden (Hill-Burton-Formel der Landeskrankenhauspläne).`, rechnung: peak ? `Spitzenmonat ${peak.mon}: ${U.fmt(peak.f)} Fälle × ${U.fmt(vwd, 1)} Tage ÷ (${peak.t} Tage × ${U.pct(ausl)}) = ${U.fmt(peak.pk, 1)}` : `${U.fmt(pt)} Belegungstage ÷ (365 Tage × ${U.pct(ausl)}) = ${U.fmt(pt / (365 * ausl), 1)}`, ergebnis: `${betten} Betten (aufgerundet)${peak ? ' – bemessen am stärksten Monat' : ''}`, quellen: ['hillburton', HSS.auslQuelle(T)] });
    r.stationen = Math.max(1, Math.ceil(betten / T.maxBetten));
    if (r.stationen > 1) S({ frage: 'Passt das in eine Station?', erkl: `Eine ${T.name.split(' (')[0]}-Station wird mit höchstens ${T.maxBetten} Betten organisiert (ein Pflegeteam, ein Stützpunkt). Mehr Betten werden auf mehrere Einheiten verteilt.`, rechnung: `${betten} Betten ÷ ${T.maxBetten} Betten je Station`, ergebnis: `${r.stationen} Stationen mit je ca. ${Math.ceil(betten / r.stationen)} Betten`, quellen: ['annahme'] });
    const a1 = inp.a1 ?? T.a1, a2 = inp.a2 ?? T.a2, s1 = inp.anteil1 ?? T.anteil1;
    const n1 = Math.round(betten * s1), n2 = Math.ceil((betten - n1) / 2);
    r.n1 = n1; r.n2 = n2; r.a1 = a1; r.a2 = a2;
    r.rooms.push({ use: 'patient1', n: n1, m2: a1, name: T.intensiv ? 'Intensivplatz 1-Bett' : 'Patientenzimmer 1-Bett' });
    r.rooms.push({ use: 'patient2', n: n2, m2: a2, name: T.intensiv ? 'Intensivplatz 2-Bett' : 'Patientenzimmer 2-Bett' });
    S({ frage: 'Welche Patientenzimmer entstehen?', erkl: `${U.pct(s1)} der Betten stehen in Einzelzimmern, der Rest in Zweibettzimmern. Die Zimmerflächen enthalten die Nasszelle.`, rechnung: `${n1} × 1-Bett à ${U.fmt(a1, 1)} m² + ${n2} × 2-Bett à ${U.fmt(a2, 1)} m²`, ergebnis: `${n1 + n2} Zimmer mit ${U.fmt(n1 * a1 + n2 * a2)} m²`, quellen: [T.intensiv ? 'divi' : 'rlp'] });
    const per = r.stationen;
    for (const [use, base, perBed, cnt, q] of T.neben) {
      const m2 = Math.max(4, base + perBed * betten / per); if (!base && !perBed) continue;
      r.rooms.push({ use, n: (cnt || 1) * per, m2: Math.round(m2 * 2) / 2, name: (HSS.ROOMTYPES[use] || {}).name || use, q: q || 'annahme' });
    }
  }
  if (art !== 'stationaer') {
    const TA = T.art === 'ambulant' ? T : HSS.STATIONSTYPEN.find(t => t.id === 'ambulanz');
    const faelle = inp.faelleAmb || 0, kont = inp.kontakte ?? TA.kontakte, dauer = inp.dauerMin ?? TA.dauerMin, oeff = inp.oeffStd ?? TA.oeffStd, tage = inp.tage ?? TA.tage, ausl = inp.auslAmb ?? TA.ausl;
    const kpt = faelle * kont / tage;
    const plaetze = Math.ceil(kpt * dauer / (oeff * 60 * ausl) - 1e-9);
    r.kontakteTag = kpt; r.plaetze = plaetze;
    S({ frage: 'Wie viele Patientenkontakte gibt es pro Tag?', erkl: `Jeder ambulante Fall kommt im Mittel ${U.fmt(kont, 1)}-mal. Verteilt auf ${tage} Öffnungstage ergibt sich die Tageslast.`, rechnung: `${U.fmt(faelle)} Fälle × ${U.fmt(kont, 1)} Kontakte ÷ ${tage} Tage`, ergebnis: `${U.fmt(kpt, 1)} Kontakte pro Tag`, quellen: ['annahme'] });
    S({ frage: 'Wie viele Behandlungsplätze werden gebraucht?', erkl: `Ein Platz ist ${oeff} Stunden am Tag geöffnet und kann zu ${U.pct(ausl)} genutzt werden (Rüst- und Reinigungszeiten). Jeder Kontakt dauert ${dauer} Minuten.`, rechnung: `${U.fmt(kpt, 1)} Kontakte × ${dauer} min ÷ (${oeff} h × 60 min × ${U.pct(ausl)}) = ${U.fmt(kpt * dauer / (oeff * 60 * ausl), 2)}`, ergebnis: `${plaetze} Behandlungsplätze (aufgerundet)`, quellen: ['annahme'] });
    const warte = Math.max(4, Math.ceil(kpt / oeff * 0.75 * 1.5));
    r.rooms.push({ use: TA.liege ? 'behandlung' : 'untersuchung', n: plaetze, m2: TA.platzM2, name: TA.liege ? 'Behandlungsplatz (liegend)' : 'Untersuchung/Behandlung' });
    r.rooms.push({ use: 'warten', n: 1, m2: Math.max(12, warte * 1.6), name: `Warten (${warte} Plätze)` });
    S({ frage: 'Wie groß muss der Wartebereich sein?', erkl: 'Pro Stunde kommen Kontakte/Tag ÷ Öffnungsstunden. Bei durchschnittlich 45 Minuten Wartezeit und einem Spitzenfaktor von 1,5 ergeben sich die Sitzplätze; je Platz 1,6 m².', rechnung: `${U.fmt(kpt / oeff, 1)} je Stunde × 0,75 h × 1,5`, ergebnis: `${warte} Warteplätze ≈ ${U.fmt(Math.max(12, warte * 1.6))} m²`, quellen: ['annahme'] });
    if (art === 'ambulant') for (const [use, base, perBed, cnt, q] of TA.neben) if (base) r.rooms.push({ use, n: cnt || 1, m2: base + Math.ceil(plaetze / 4) * 2, name: (HSS.ROOMTYPES[use] || {}).name || use, q: q || 'annahme' });
  }
  r.nuf = U.sum(r.rooms.map(x => x.n * x.m2));
  r.bedarf = r.nuf * (1 + VF);
  const neben = r.nuf - U.sum(r.rooms.filter(x => x.use.startsWith('patient')).map(x => x.n * x.m2));
  S({ frage: 'Wie viel Fläche braucht die Station insgesamt?', erkl: `Zu den Zimmern kommen Funktionsräume (Stützpunkt, Arbeitsräume rein/unrein, Lager, Dienst- und Sanitärräume – siehe Raumprogramm). Für Flure und Wege wird ein Zuschlag von ${U.pct(VF)} angesetzt.`, rechnung: `Zimmer + Funktionsräume ${U.fmt(neben)} m² = ${U.fmt(r.nuf)} m² Nutzfläche; × ${U.fmt(1 + VF, 2)} für Flure`, ergebnis: `${U.fmt(r.bedarf)} m² Flächenbedarf`, quellen: ['din', 'rlp', 'sh', 'dguv'] });
  if (r.betten) {
    const zimmerProBett = U.sum(r.rooms.filter(x => x.use.startsWith('patient')).map(x => x.n * x.m2)) / r.betten, gesamtProBett = r.bedarf / r.betten;
    const ok = gesamtProBett >= 38 && gesamtProBett <= 65;
    S({ frage: 'Ist die Station plausibel bemessen?', erkl: 'Vergleich mit den Kennwerten der Bauministerkonferenz für die Allgemeinpflege: rund 30 m² Hauptnutzfläche je Bett (Zimmer) und rund 50 m² je Bett einschließlich aller Neben- und Verkehrsflächen. Intensiv- und Palliativstationen liegen deutlich darüber.', rechnung: `Zimmer ${U.fmt(zimmerProBett, 1)} m²/Bett · Station gesamt ${U.fmt(r.bedarf)} m² ÷ ${r.betten} Betten = ${U.fmt(gesamtProBett, 1)} m²/Bett`, ergebnis: ok ? 'im üblichen Rahmen' : gesamtProBett > 65 ? 'großzügig (typisch für Intensiv/Palliativ oder viele Einzelzimmer)' : 'knapp bemessen', ampel: ok ? 'g' : T.intensiv || T.id === 'palliativ' ? 'g' : 'y', quellen: ['argebau'] });
  }
  let bgf = 0, fass = 0; const used = [];
  for (const s of inp.sel || []) {
    const P = HSS.findPart(s.part, prj); if (!P) continue;
    const k = s.half ? 0.5 : 1;
    for (const f of s.floors) { const a = HSS.partArea(P.part) * k; bgf += a; fass += G.perimeter(HSS.partFootprintLocal(P.part).outer) * k; used.push(`${P.part.name} ${HSS.floorName(HSS.globalFloor(P.part, f, prj))}${s.half ? ' (½)' : ''}`); }
  }
  r.bgf = bgf; r.verfuegbar = bgf * NETTO;
  if (bgf) {
    r.deckung = r.verfuegbar / r.bedarf;
    S({ frage: 'Wie viel Fläche steht in den gewählten Etagen zur Verfügung?', erkl: `Die Grundfläche der Etagen (Brutto-Grundfläche) enthält Wände, Stützen, Schächte und Technik. Nutzbar für Räume und Flure sind davon etwa ${U.pct(NETTO)}.`, rechnung: `${U.fmt(bgf)} m² BGF (${used.join(', ')}) × ${U.pct(NETTO)}`, ergebnis: `${U.fmt(r.verfuegbar)} m² nutzbar`, quellen: ['din', 'annahme'] });
    S({ frage: 'Reicht die Fläche?', erkl: 'Verfügbare Fläche geteilt durch benötigte Fläche. Ab 100 % passt die Station, zwischen 90 und 100 % wird es knapp.', rechnung: `${U.fmt(r.verfuegbar)} m² ÷ ${U.fmt(r.bedarf)} m²`, ergebnis: `${U.pct(r.deckung)} – ${r.deckung >= 1 ? 'ausreichend' : r.deckung >= 0.9 ? 'knapp' : 'nicht ausreichend, es fehlen ' + U.fmt(r.bedarf - r.verfuegbar) + ' m²'}`, ampel: r.deckung >= 1 ? 'g' : r.deckung >= 0.9 ? 'y' : 'r', quellen: [] });
    const zimmer = (r.n1 || 0) + (r.n2 || 0);
    if (zimmer) {
      const achse = 3.75, bedarfF = zimmer * achse; r.fassadeBedarf = bedarfF; r.fassade = fass * 0.8;
      S({ frage: 'Bekommt jedes Patientenzimmer ein Fenster?', erkl: `Patientenzimmer brauchen Tageslicht und liegen deshalb an der Fassade. Je Zimmer rechnet man eine Fensterachse von ca. ${U.fmt(achse, 2)} m. Rund 80 % des Gebäudeumfangs sind für Zimmer nutzbar (Rest: Treppenhäuser, Ecken, Funktionsräume).`, rechnung: `${zimmer} Zimmer × ${U.fmt(achse, 2)} m = ${U.fmt(bedarfF)} m benötigt; Umfang × 80 % = ${U.fmt(fass * 0.8)} m vorhanden`, ergebnis: fass * 0.8 >= bedarfF ? 'ausreichend Fassade' : 'zu wenig Fassade – längeres oder zweites Gebäude nötig', ampel: fass * 0.8 >= bedarfF ? 'g' : 'r', quellen: ['annahme'] });
    }
    for (const s of inp.sel || []) {
      const P = HSS.findPart(s.part, prj); if (!P) continue;
      const bb = G.bbox(HSS.partFootprintLocal(P.part).outer), tiefe = Math.min(bb.w, bb.d), PT = HSS.planTyp ? HSS.planTyp(tiefe) : null;
      const o = PT ? PT.bands.filter(b => b.k === 'O').map(b => U.fmt(b.d, 1)).join(' / ') : '';
      const amp = !PT ? 'g' : PT.typ === 'einbund' ? 'y' : 'g';
      S({ frage: `Wie wird ${P.part.name} aufgeteilt?`, erkl: `Die Gebäudetiefe bestimmt die Bauweise. Patientenzimmer brauchen Tageslicht und sind 5–7 m tief, der Stationsflur ${FLUR} m breit. Bis ca. 12 m Tiefe liegen die Zimmer an einer Flurseite (einbündig bzw. mit schmaler Nebenraumzone), bis ca. 19 m beidseits eines Flurs (zweibündig). Tiefere Baukörper erhalten zwei Flure und eine Innenzone für Räume ohne Tageslichtbedarf (dreibündig: Arbeitsräume, Lager, Kern); ist die Innenzone tiefer als zwei Raumtiefen, entsteht in der Mitte ein Lichthof. So entstehen keine schmalen, überlangen Räume.`, rechnung: `Gebäudetiefe ${U.fmt(tiefe, 1)} m → Zimmertiefe ${o} m${PT && PT.typ === 'dreibund' ? `, Innenzone ${U.fmt(PT.bands[2].d, 1)} m` : ''}`, ergebnis: PT ? PT.name : '–', ampel: amp, quellen: ['dguv', 'annahme'] });
    }
  } else r.warn.push('Bitte Gebäude und Etagen wählen, um den Flächenabgleich zu rechnen.');
  r.why = r.steps.map(x => `${x.frage} ${x.rechnung} → ${x.ergebnis}`);
  return r;
};

/* ---------- Grundriss generieren ---------- */
const FURN = HSS.FURN = {
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
function layoutFloor(sl, st, T, report, opts) { return HSS.layoutStationFloor(sl, st, T, report, opts); }
})();
