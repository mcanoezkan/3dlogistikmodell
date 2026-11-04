/* =====================================================================
   HSS · edition.js – Editionen der Suite
     health  Healthcare Simulation Suite (Krankenhäuser)      – unverändert
     fabrik  Fabric Planning Suite (Fabriken, Werke, Hallen)
     home    Home Planning Suite (Häuser, Wohnungen, Möbel)
   Die Edition kommt aus window.HSS_EDITION (Einzeldatei) oder der Adresse
   (?edition=fabrik, #home). Hier stehen: Namen und Texte, sichtbare
   Arbeitsbereiche, Gebäudebausteine, Raumtypen mit Einrichtungsregeln,
   Standardflüsse (Fabrik), Grundriss-/Zonenvorschlag und die Demos.
   Alle Funktionen der Suite bleiben erhalten; die Edition bestimmt nur, was
   zuerst und standardmäßig angeboten wird.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo, UI = HSS.ui, $ = UI.$, $$ = UI.$$;
const E = HSS.EDITION, W = UI.ws;

/* ---------- Konfiguration ---------- */
const CFG = {
  health: { titel: 'Healthcare Simulation Suite', icon: '🏥', neu: 'Neues Krankenhausprojekt', demo: 'UNITY Hospital',
    lead: 'Krankenhäuser in 3D planen wie in einem Aufbauspiel – Gebäude ins Bild ziehen, an Griffen formen, Stationen automatisch einrichten und Material-, Waren- und Personenflüsse simulieren.',
    osm: ['Krankenhaus aus OpenStreetMap', 'Klinikum suchen (DE/AT/CH) – Gebäude, Geschosse und Umgebung werden angelegt'] },
  fabrik: { titel: 'Fabric Planning Suite', icon: '🏭', neu: 'Neues Werksprojekt', demo: 'UNITY Werk',
    lead: 'Fabriken und Werke in 3D planen – Hallen, Lager und Verwaltung ins Bild ziehen, Produktion, Lager und Versand in Zonen gliedern, mit Maschinen, Regalen und Staplern ausstatten und Materialflüsse vom Wareneingang bis zum Versand simulieren.',
    osm: ['Werk aus OpenStreetMap', 'Firma oder Adresse suchen (DE/AT/CH) – Hallen, Tanks, Silos, Werksgelände und Umgebung werden angelegt'],
    hide: ['klinik', 'station'], raum: 'produktion', tour: false,
    raumtypen: ['wareneingang', 'lager_fab', 'hochregallager', 'kommissionierung', 'produktion', 'montage', 'qualitaet', 'verpackung', 'warenausgang', 'instandhaltung', 'leitstand', 'gefahrstoff', 'wertstoff', 'sozial', 'umkleide', 'buero', 'besprechung', 'wc', 'technik', 'flur', 'kern', 'zone'],
    kats: ['Fabrik', 'Logistik & Transport', 'Fahrzeuge', 'Außenanlagen', 'Erschließung', 'Büro & Wartebereich', 'Technik', 'Ver- und Entsorgung', 'Personen'],
    ausstattung: [['Fabrik/Maschinen', 'Maschinen'], ['Fabrik/Fördertechnik', 'Fördertechnik & Krane'], ['Fabrik/Lager & Regale', 'Regale & Ladungsträger'], ['Fabrik/Flurförderzeuge', 'Stapler & FTS'], ['Fabrik/Arbeitsplätze', 'Arbeitsplätze'], ['Fabrik/Sicherheit', 'Sicherheit & Halle'], ['Erschließung', 'Aufzüge, Treppen, Türen'], ['Fabrik/Personen', 'Personen'], ['Büro & Wartebereich', 'Büro']] },
  home: { titel: 'Home Planning Suite', icon: '🏠', neu: 'Neues Hausprojekt', demo: 'Musterhaus',
    lead: 'Häuser und Wohnungen in 3D planen – Haus mit Dachform ins Bild ziehen oder aus OpenStreetMap übernehmen, Räume aufziehen oder vorschlagen lassen, möblieren und mit Garten, Terrasse und Garage gestalten.',
    osm: ['Haus aus OpenStreetMap', 'Adresse eingeben (DE/AT/CH) – Haus mit Dach, Garage, Grundstück, Garten und Nachbarschaft werden angelegt'],
    hide: ['klinik', 'station', 'fluesse', 'simulation', 'analyse'], raum: 'wohnen', tour: false,
    raumtypen: ['wohnen', 'essen', 'wohnkueche', 'schlafen', 'kinder', 'arbeiten', 'gaeste', 'badezimmer', 'gaeste_wc', 'diele', 'hwr', 'abstell', 'hobby', 'heizung', 'garage_r', 'treppe_r', 'terrasse_r', 'flur'],
    kats: ['Wohnen', 'Außenanlagen', 'Fahrzeuge', 'Personen', 'Erschließung'],
    ausstattung: [['Wohnen/Wohnzimmer', 'Wohnzimmer'], ['Wohnen/Essen', 'Essen'], ['Wohnen/Küche', 'Küche'], ['Wohnen/Schlafzimmer', 'Schlafzimmer'], ['Wohnen/Kinderzimmer', 'Kinderzimmer'], ['Wohnen/Arbeiten', 'Arbeiten'], ['Wohnen/Bad', 'Bad'], ['Wohnen/Flur', 'Flur, Treppe, Türen'], ['Wohnen/Hauswirtschaft', 'Hauswirtschaft'], ['Wohnen/Haustechnik', 'Haustechnik'], ['Wohnen/Garten & Terrasse', 'Garten & Terrasse'], ['Wohnen/Personen', 'Personen']] }
};
const ED = HSS.ED = CFG[E];

/* ---------- Raumtypen ---------- */
CFG.health.raumtypen = Object.keys(HSS.ROOMTYPES); // Healthcare: wie bisher (ohne die neuen Fabrik-/Wohnräume)
Object.assign(HSS.ROOMTYPES, {
  // Fabrik
  wareneingang: { name: 'Wareneingang', color: '#f3e3c3', din: 'NUF4' }, lager_fab: { name: 'Lager (Palettenregale)', color: '#ece6da', din: 'NUF4' },
  hochregallager: { name: 'Hochregallager', color: '#e5ddcc', din: 'NUF4' }, kommissionierung: { name: 'Kommissionierung', color: '#efe2c8', din: 'NUF4' },
  produktion: { name: 'Produktion / Fertigung', color: '#dfe6f2', din: 'NUF3' }, montage: { name: 'Montage', color: '#d9ecef', din: 'NUF3' },
  qualitaet: { name: 'Qualitätssicherung / Messraum', color: '#e3e0ea', din: 'NUF3' }, verpackung: { name: 'Verpackung', color: '#eee6d6', din: 'NUF3' },
  warenausgang: { name: 'Warenausgang / Versand', color: '#f2dcc4', din: 'NUF4' }, instandhaltung: { name: 'Instandhaltung / Werkstatt', color: '#e2e4e7', din: 'NUF3' },
  leitstand: { name: 'Leitstand / Meisterbüro', color: '#e0e6ef', din: 'NUF2' }, gefahrstoff: { name: 'Gefahrstofflager', color: '#f6ecc9', din: 'NUF4' },
  wertstoff: { name: 'Wertstoff- und Abfallsammelplatz', color: '#eadad6', din: 'NUF4' }, sozial: { name: 'Sozialraum / Pausenraum', color: '#efe5d6', din: 'NUF1' },
  // Wohnen
  wohnen: { name: 'Wohnzimmer', color: '#f3e9d2', din: 'NUF1' }, essen: { name: 'Essbereich', color: '#f5e6cf', din: 'NUF1' }, wohnkueche: { name: 'Küche', color: '#f3ead8', din: 'NUF3' },
  schlafen: { name: 'Schlafzimmer', color: '#e3e9f2', din: 'NUF1' }, kinder: { name: 'Kinderzimmer', color: '#e9f2df', din: 'NUF1' }, arbeiten: { name: 'Arbeitszimmer', color: '#e8ebef', din: 'NUF2' },
  gaeste: { name: 'Gästezimmer', color: '#ece6f2', din: 'NUF1' }, badezimmer: { name: 'Badezimmer', color: '#e6f2f5', din: 'NUF7' }, gaeste_wc: { name: 'Gäste-WC', color: '#e6f2f5', din: 'NUF7' },
  diele: { name: 'Diele / Flur', color: '#f0ebe2', din: 'VF' }, hwr: { name: 'Hauswirtschaftsraum', color: '#e9e4de', din: 'NUF7' }, abstell: { name: 'Abstellraum', color: '#ebe6dc', din: 'NUF7' },
  hobby: { name: 'Hobbyraum / Keller', color: '#e9e3d6', din: 'NUF7' }, heizung: { name: 'Heizungs-/Technikraum', color: '#dfe2e6', din: 'TF' }, garage_r: { name: 'Garage', color: '#dcdfe3', din: 'NUF7' },
  treppe_r: { name: 'Treppe', color: '#e6e1d6', din: 'VF', noPlace: true }, terrasse_r: { name: 'Terrasse / Balkon', color: '#d9d4c9', din: 'AUSSEN' }
});
HSS.raumtypenEdition = () => ED.raumtypen ? Object.fromEntries(ED.raumtypen.filter(k => HSS.ROOMTYPES[k]).map(k => [k, HSS.ROOMTYPES[k]])) : HSS.ROOMTYPES;
Object.assign(HSS.ROLLEN, { wareneingang: 'Wareneingang', lager_fab: 'Lager', produktion: 'Produktion', montage: 'Montage', verpackung: 'Verpackung', warenausgang: 'Warenausgang / Versand', qualitaet: 'Qualitätssicherung', instandhaltung: 'Instandhaltung', wertstoff: 'Wertstoffhof', sozial: 'Sozialräume / Werkseingang' });
if (HSS.ROOMINFO) Object.assign(HSS.ROOMINFO, {
  wareneingang: 'Annahme, Prüfung und Vereinnahmung der Lieferungen; Puffer vor der Einlagerung.', lager_fab: 'Palettenlager mit Regalgassen für Stapler (Gassenbreite je nach Stapler 2,8–3,6 m).',
  produktion: 'Fertigung mit Maschinen und Bearbeitungszentren; Verkehrswege nach ASR A1.8 freihalten.', montage: 'Montagelinie mit ergonomischen Arbeitsplätzen und Materialbereitstellung.',
  verpackung: 'Verpacken und Kommissionieren der Fertigware.', warenausgang: 'Bereitstellung und Verladung der Sendungen.',
  wohnen: 'Wohnbereich mit Sitzgruppe und Medienwand.', wohnkueche: 'Küche mit Arbeitsdreieck Spüle – Herd – Kühlschrank.', schlafen: 'Schlafzimmer mit Bett und Kleiderschrank.', kinder: 'Kinderzimmer mit Bett, Schreibtisch und Spielfläche.', badezimmer: 'Bad mit Waschtisch, WC, Dusche bzw. Wanne.'
});

/* ---------- Einrichtungsregeln (Packer: wall / at / near / any / fill) ---------- */
const RZ = HSS.EINRICHTUNG, solid = P => P.solid(), lang = P => (P.W >= P.D ? ['back', 'front'] : ['left', 'right']);
Object.assign(RZ, {
  // Fabrik
  wareneingang(P) { P.fill('fab.gitterbox', ['back'], { max: 6, edge: 0.4 }); P.near('fab.stapler', P.W / 2, P.D / 2, 'front', { radius: 3 }); P.any('fab.packtisch', ['left', 'right']); P.near('fab.hubwagen.elektro', P.W * 0.25, P.D * 0.6, 'front', { radius: 2 }); P.any('fab.feuerloescher', ['left', 'right', 'front'], { mount: true }); },
  lager_fab(P) {
    // Regalzeilen quer, Gassen 3,2 m für Schubmaststapler
    const alongU = P.W >= P.D, L = alongU ? P.W : P.D, Q = alongU ? P.D : P.W, n = Math.max(1, Math.floor((Q - 1.0) / (2.2 + 3.2)));
    for (let i = 0; i < n; i++) { const v = 1.6 + i * 5.4; if (v + 1.1 > Q) break; const cnt = Math.max(1, Math.floor((L - 4) / 2.8)); for (let k = 0; k < cnt; k++) { const u = 2 + 1.4 + k * 2.8; if (alongU) { P.at('fab.palettenregal', u, v, 'front'); P.at('fab.palettenregal', u, v + 1.1, 'back'); } else { P.at('fab.palettenregal', v, u, 'left'); P.at('fab.palettenregal', v + 1.1, u, 'right'); } } }
    P.near('fab.schubmast', P.W - 2, P.D - 2, 'front', { radius: 3 });
  },
  hochregallager(P) { RZ.lager_fab(P); P.near('fab.regalbediengeraet', P.W / 2, P.D / 2, 'front', { radius: 4 }); },
  kommissionierung(P) { P.fill('fab.fachbodenregal', ['back', 'left'], { max: 8 }); P.near('fab.packtisch', P.W / 2, P.D / 2, 'back', { radius: 3 }); P.near('fab.klt', P.W / 2 + 1.5, P.D / 2, 'front', { radius: 2 }); },
  produktion(P) {
    const M = ['fab.cnc', 'fab.drehmaschine', 'fab.cnc', 'fab.laser', 'fab.biegepresse', 'fab.schweisszelle', 'fab.presse', 'fab.spritzguss', 'fab.roboter', 'fab.waschanlage'];
    // Maschinenreihen beidseits eines Hauptgangs (4 m)
    const alongU = P.W >= P.D, L = alongU ? P.W : P.D, Q = alongU ? P.D : P.W, mid = Q / 2; let i = 0;
    for (const side of [-1, 1]) { let s = 2.5; while (s < L - 3) { const id = M[i++ % M.length], d = HSS.library.get(id); if (!d) break; const len = d.size.w + 1.6, v = mid + side * (2 + d.size.d / 2 + 0.4); if (v - d.size.d / 2 < 0.8 || v + d.size.d / 2 > Q - 0.8) break; const face = alongU ? (side < 0 ? 'back' : 'front') : (side < 0 ? 'right' : 'left'); if (alongU) P.at(id, s + d.size.w / 2, v, face); else P.at(id, v, s + d.size.w / 2, face); s += len; } }
    P.any('fab.leitstand', ['front', 'left', 'right']); P.any('fab.andonboard', ['front', 'left']); P.near('fab.stapler', 3, P.D / 2, 'right', { radius: 3 });
    for (let k = 0; k < 4; k++) P.near('fab.werker', P.W * (0.2 + k * 0.2), P.D / 2 + (k % 2 ? 1 : -1), 'front', { radius: 1.5 });
  },
  montage(P) {
    const alongU = P.W >= P.D, L = alongU ? P.W : P.D, Q = alongU ? P.D : P.W;
    const band = Math.min(L - 4, 6), v = Q / 2;
    for (let s = 2; s + band <= L - 2; s += band + 0.5) { const sz = { w: band }; if (alongU) P.at('fab.band', s + band / 2, v, 'front', { size: sz }); else P.at('fab.band', v, s + band / 2, 'left', { size: sz }); }
    for (let s = 2.5; s < L - 2.5; s += 2.2) for (const side of [-1, 1]) { const vv = v + side * 1.5; if (alongU) P.at('fab.montageplatz', s, vv, side < 0 ? 'front' : 'back'); else P.at('fab.montageplatz', vv, s, side < 0 ? 'left' : 'right'); }
    P.fill('fab.fachbodenregal', ['back'], { max: 4 }); P.near('fab.fts', 2, 2, 'front', { radius: 2 });
    for (let k = 0; k < 3; k++) P.near('fab.werker', P.W * (0.3 + k * 0.2), Q / 2 + 2.2, 'front', { radius: 1.5 });
  },
  qualitaet(P) { P.fill('fab.pruefplatz', ['back', 'left'], { max: 4 }); P.any('stat.schrank.patient', ['right']) || P.any('fab.fachbodenregal', ['right']); },
  verpackung(P) { P.fill('fab.packtisch', ['back'], { max: 4 }); P.fill('fab.rollenbahn', ['left'], { max: 2 }); P.near('fab.gitterbox', P.W / 2, P.D / 2, 'front', { radius: 2 }); },
  warenausgang(P) { P.fill('fab.gitterbox', ['back'], { max: 8, edge: 0.4 }); P.near('fab.stapler', P.W / 2, P.D / 2, 'back', { radius: 3 }); P.any('fab.packtisch', ['left', 'right']); },
  instandhaltung(P) { P.fill('fab.werkbank', ['back'], { max: 3 }); P.any('fab.bohrmaschine', ['left', 'right']); P.any('fab.fachbodenregal', ['left', 'right']); P.any('fab.kompressor', ['right', 'left']); },
  leitstand(P) { RZ.buero ? RZ.buero(P) : P.near('home.schreibtisch', P.W / 2, P.D / 2, 'front'); P.any('fab.leitstand', ['back', 'left']); },
  gefahrstoff(P) { P.fill('fab.gefahrstoffschrank', ['back', 'left'], { max: 4 }); P.fill('fab.auffangwanne', ['right'], { max: 3 }); P.any('fab.ibc', ['front', 'left']); },
  wertstoff(P) { P.fill('log.abfall1100', ['back', 'left'], { max: 6 }); P.any('aussen.presscontainer', ['right']); },
  sozial(P) { P.near('home.esstisch', P.W / 2, P.D / 2, 'front', { radius: 2 }); P.any('home.kueche.zeile', ['back', 'left', 'right']); P.any('home.kueche.kuehl', ['left', 'right']); },
  // Wohnen
  wohnen(P) {
    const tv = P.solid()[0] || 'back', opp = HSS.einrichtungHelfer.sideOpp[tv];
    P.wall('home.tvboard', tv, { from: 'mid' });
    const c = [P.W / 2, P.D / 2], mitte = { front: [c[0], 1.9], back: [c[0], P.D - 1.9], left: [1.9, c[1]], right: [P.W - 1.9, c[1]] };
    const ecke = P.area > 22 && P.at('home.sofa.ecke', ...{ front: [c[0], P.D - 1.2], back: [c[0], 1.2], left: [P.W - 1.2, c[1]], right: [1.2, c[1]] }[tv], tv);
    if (!ecke) P.wall('home.sofa3', opp, { from: 'mid' }) || P.near('home.sofa3', c[0], c[1] + 1, tv, { radius: 2 });
    P.near('home.couchtisch', ...mitte[tv].map((v, i) => i === (tv === 'left' || tv === 'right' ? 0 : 1) ? (v + c[i]) / 2 : v), tv, { radius: 1.2 });
    P.near('home.teppich', c[0], c[1], tv, { radius: 1, ghost: true });
    P.near('home.sessel', c[0] + 1.6, c[1], 'left', { radius: 1.5 });
    P.any('home.regal', P.solid().filter(s => s !== tv)); P.any('home.stehlampe', ['left', 'right', 'back']); P.any('home.pflanze', ['back', 'left', 'right', 'front']);
    if (P.area > 30) P.any('home.kaminofen', P.solid().filter(s => s !== tv));
  },
  essen(P) { P.near(P.area > 12 ? 'home.esstisch' : 'home.esstisch.4', P.W / 2, P.D / 2, P.W >= P.D ? 'front' : 'left', { radius: 1.5 }); P.any('home.kommode', P.solid()); P.any('home.pflanze', ['back', 'left', 'right']); },
  wohnkueche(P) {
    const s = P.solid(), a = s[0] || 'back';
    if (!P.wall('home.kueche.zeile', a, { from: 'start' })) { P.wall('home.kueche.spuele', a) || P.any('home.kueche.spuele', ['back', 'left', 'right']); P.any('home.kueche.herd', [a, 'left', 'right', 'back']); P.any('home.kueche.kuehl', s); }
    if (P.area > 16) P.near('home.kueche.insel', P.W / 2, P.D / 2, 'front', { radius: 1.2 });
    else if (P.area > 10) P.near('home.esstisch.4', P.W / 2, P.D / 2 + 0.6, 'front', { radius: 1.2 });
  },
  schlafen(P) {
    const s = P.solid(), kopf = s.find(x => x !== 'front') || 'back';
    const r = P.wall('home.bett.doppel', kopf, { from: 'mid' }) || P.near('home.bett.doppel', P.W / 2, P.D / 2, HSS.einrichtungHelfer.sideOpp[kopf], { radius: 1.5 });
    if (r) { const cu = (r.u0 + r.u1) / 2, cv = (r.v0 + r.v1) / 2, lang = kopf === 'back' || kopf === 'front'; const d = 1.18; P.wall('home.nachttisch', kopf, { from: (lang ? cu : cv) - d }); P.wall('home.nachttisch', kopf, { from: (lang ? cu : cv) + d }); }
    P.any('home.kleiderschrank', s.filter(x => x !== kopf)) || P.any('home.kommode', ['left', 'right', 'back', 'front']);
    P.any('home.kommode', ['left', 'right', 'front', 'back']);
  },
  kinder(P) { const s = P.solid(); P.any('home.kinderbett', s, { from: 'end' }) || P.near('home.kinderbett', 1, P.D / 2, 'right'); P.any('home.schreibtisch', [P.window() || 'back', 'left', 'right']); P.any('home.kleiderschrank', s.slice(1).concat(['front'])) || P.any('home.kommode', ['left', 'right', 'front']); P.near('home.spielecke', P.W / 2, P.D / 2, 'front', { radius: 1.5 }); P.any('home.regal', ['left', 'right', 'front']); },
  arbeiten(P) { P.any('home.schreibtisch', [P.window() || 'back', 'left', 'right']); P.fill('home.regal', P.solid(), { max: 3 }); P.near('home.sessel', P.W - 1, P.D - 1, 'left', { radius: 1.5 }); },
  gaeste(P) { RZ.kinder(P); },
  badezimmer(P) {
    const s = ['back', 'left', 'right', 'front'];
    P.any('home.waschtisch', s, { maxH: 2.5 }); P.any('home.wc', s, { maxH: 2.5 });
    if (P.area >= 7.5) { P.any('home.badewanne', s) ; P.any('home.dusche', s, { maxH: 2.5 }); } else P.any('home.dusche', s, { maxH: 2.5 }) || P.any('home.badewanne', s);
    if (P.area > 9) P.any('home.waschtisch', s, { maxH: 2.5 });
  },
  gaeste_wc(P) { P.any('home.wc', ['back', 'left', 'right'], { maxH: 2.5 }); P.any('home.waschtisch', ['left', 'right', 'back', 'front'], { maxH: 2.5, size: { w: 0.5, d: 0.35 } }); },
  diele(P) { P.any('home.garderobe', P.solid(), { maxH: 2.5 }); P.any('home.pflanze', ['left', 'right', 'back']); },
  hwr(P) { P.any('home.waschmaschine', ['back', 'left', 'right']); P.any('home.trockner', ['back', 'left', 'right']); P.fill('home.vorrat', ['left', 'right'], { max: 2 }); },
  abstell(P) { P.fill('home.vorrat', ['back', 'left', 'right'], { max: 3 }); },
  hobby(P) { P.fill('home.vorrat', ['back'], { max: 2 }); P.any('fab.werkbank', ['left', 'right', 'back']); },
  heizung(P) { P.any('home.speicher', ['back', 'left', 'right']); P.any('home.stromspeicher', ['back', 'left', 'right']); P.any('home.waschmaschine', ['left', 'right', 'front']); },
  garage_r(P) { P.near('kfz.pkw', P.W / 2, P.D / 2, P.W >= P.D ? 'left' : 'front', { radius: 1 }); P.any('home.wallbox', ['back', 'left', 'right'], { mount: true }); P.any('home.vorrat', ['back', 'left']); },
  treppe_r(P) { P.near('home.treppe', P.W / 2, P.D / 2, P.W > P.D ? 'right' : 'front', { radius: 0.6, force: true }); },
  terrasse_r(P) { P.near('home.gartenmoebel', P.W / 2, P.D / 2, 'front', { radius: 1.5 }); P.any('home.sonnenschirm', ['back', 'left', 'right']); }
});

/* ---------- Standardflüsse der Fabrik ---------- */
if (E === 'fabrik') {
  const mats0 = HSS.defaultMaterials, tr0 = HSS.defaultTransports;
  HSS.defaultMaterials = () => [
    { id: 'm_roh', name: 'Rohmaterial / Zukaufteile (Paletten)', reinheit: 'rein', farbe: '#b9770e', einheit: 'Paletten', proLadung: 1, ladeMin: 2, entladeMin: 2, buendelbar: false },
    { id: 'm_klt', name: 'Bereitstellung Fertigung (KLT)', reinheit: 'rein', farbe: '#2D7694', einheit: 'KLT', proLadung: 24, ladeMin: 3, entladeMin: 3, buendelbar: true },
    { id: 'm_halbzeug', name: 'Halbzeuge / Baugruppen', reinheit: 'rein', farbe: '#7b5ea7', einheit: 'Ladungsträger', proLadung: 1, ladeMin: 1, entladeMin: 1, buendelbar: false },
    { id: 'm_fertig', name: 'Fertigware', reinheit: 'rein', farbe: '#0A967A', einheit: 'Paletten', proLadung: 1, ladeMin: 2, entladeMin: 2, buendelbar: false },
    { id: 'm_leergut', name: 'Leergut (Behälterrücklauf)', reinheit: 'unrein', farbe: '#8d969f', einheit: 'KLT', proLadung: 40, ladeMin: 2, entladeMin: 2, buendelbar: true },
    { id: 'm_spaene', name: 'Späne, Reststoffe, Abfall', reinheit: 'unrein', farbe: '#59636e', einheit: 'Behälter', proLadung: 1, ladeMin: 2, entladeMin: 3, buendelbar: false },
    { id: 'm_proben', name: 'Prüfmuster (Qualität)', reinheit: 'rein', farbe: '#d9531e', einheit: 'Muster', proLadung: 10, ladeMin: 1, entladeMin: 1, buendelbar: true },
    { id: 'm_lkw', name: 'LKW-Ladung', reinheit: 'rein', farbe: '#144477', einheit: 'LKW', proLadung: 1, ladeMin: 30, entladeMin: 30, buendelbar: false },
    { id: 'm_personal', name: 'Personal (Schichtwechsel)', reinheit: 'rein', farbe: '#891F5E', einheit: 'Personen', proLadung: 1, ladeMin: 0, entladeMin: 0, buendelbar: false, person: true }
  ];
  HSS.defaultTransports = () => {
    const alt = tr0(), keep = alt.filter(t => ['t_hand', 't_lkw', 't_person'].includes(t.id));
    return keep.concat([
      { id: 't_stapler', name: 'Gabelstapler', mittel: 'schlepper', anzahl: null, kapazitaet: 1, schicht: [6, 22], buendeln: false },
      { id: 't_routenzug', name: 'Routenzug (4 Anhänger)', mittel: 'schlepper', anzahl: null, kapazitaet: 4, schicht: [6, 22], buendeln: true },
      { id: 't_fts', name: 'Fahrerloses Transportfahrzeug (FTS)', mittel: 'awt', anzahl: null, kapazitaet: 1, schicht: [0, 24], buendeln: false }
    ]);
  };
  void mats0;
  HSS.STANDARDFLUESSE = [
    { id: 'f_anlieferung', name: 'Anlieferung Rohmaterial (LKW)', material: 'm_lkw', von: 'extern', nach: 'wareneingang', mengeFix: 8, fenster: [[6, 14]], transport: 't_lkw', hinweis: 'ca. 8 LKW je Tag, je 26–33 Paletten' },
    { id: 'f_einlagerung', name: 'Einlagerung Wareneingang → Lager', material: 'm_roh', von: 'wareneingang', nach: 'lager_fab', mengeFix: 180, fenster: [[6.5, 15]], transport: 't_stapler' },
    { id: 'f_bereitstellung', name: 'Materialbereitstellung Lager → Fertigung', material: 'm_klt', von: 'lager_fab', nach: 'produktion', mengeFix: 360, fenster: [[5.5, 21.5]], transport: 't_routenzug', hinweis: 'Routenzug im 30-Minuten-Takt' },
    { id: 'f_halbzeug', name: 'Halbzeuge Fertigung → Montage', material: 'm_halbzeug', von: 'produktion', nach: 'montage', mengeFix: 120, fenster: [[6, 22]], transport: 't_fts' },
    { id: 'f_montageteile', name: 'Zukaufteile Lager → Montage', material: 'm_klt', von: 'lager_fab', nach: 'montage', mengeFix: 240, fenster: [[5.5, 21.5]], transport: 't_routenzug' },
    { id: 'f_fertig', name: 'Fertigware Montage → Verpackung', material: 'm_fertig', von: 'montage', nach: 'verpackung', mengeFix: 90, fenster: [[6.5, 22]], transport: 't_fts' },
    { id: 'f_versandbereit', name: 'Verpackung → Warenausgang', material: 'm_fertig', von: 'verpackung', nach: 'warenausgang', mengeFix: 90, fenster: [[7, 22]], transport: 't_stapler' },
    { id: 'f_versand', name: 'Versand (LKW)', material: 'm_lkw', von: 'warenausgang', nach: 'extern', mengeFix: 6, fenster: [[10, 20]], transport: 't_lkw' },
    { id: 'f_leergut', name: 'Leergut Montage/Fertigung → Lager', material: 'm_leergut', von: 'montage', nach: 'lager_fab', mengeFix: 300, fenster: [[6, 22]], transport: 't_routenzug' },
    { id: 'f_spaene', name: 'Späne und Reststoffe → Wertstoffhof', material: 'm_spaene', von: 'produktion', nach: 'wertstoff', mengeFix: 12, fenster: [[8, 9], [13, 14], [20, 21]], transport: 't_stapler' },
    { id: 'f_qualitaet', name: 'Prüfmuster Fertigung → Qualitätssicherung', material: 'm_proben', von: 'produktion', nach: 'qualitaet', mengeFix: 48, fenster: [[6, 22]], transport: 't_hand' },
    { id: 'f_schicht', name: 'Schichtwechsel (Sozialräume → Fertigung)', material: 'm_personal', von: 'sozial', nach: 'produktion', mengeFix: 120, fenster: [[5.75, 6], [13.75, 14], [21.75, 22]], transport: 't_person' }
  ];
}

/* ---------- Hilfen für Grundrisse ---------- */
// größtes achsparalleles Rechteck im (lokalen) Grundriss
HSS.innenRechteck = (outer, step = 0.25) => {
  const bb = G.bbox(outer); if (outer.length === 4 || (outer.length > 4 && Math.abs(Math.abs(G.area(outer)) - bb.w * bb.d) < 0.5)) return { x0: bb.x0, x1: bb.x1, z0: bb.z0, z1: bb.z1 };
  const nx = Math.max(2, Math.round(bb.w / step)), nz = Math.max(2, Math.round(bb.d / step)), sx = bb.w / nx, sz = bb.d / nz;
  const ok = []; for (let j = 0; j < nz; j++) { ok.push([]); for (let i = 0; i < nx; i++) ok[j].push(G.pointIn([bb.x0 + (i + 0.5) * sx, bb.z0 + (j + 0.5) * sz], outer) ? 1 : 0); }
  // größtes Rechteck aus Einsen (Histogramm-Verfahren)
  const h = new Array(nx).fill(0); let best = { a: 0 };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) h[i] = ok[j][i] ? h[i] + 1 : 0;
    const st = [];
    for (let i = 0; i <= nx; i++) { const hi = i < nx ? h[i] : 0; let s = i; while (st.length && st[st.length - 1][1] >= hi) { const [si, sh] = st.pop(); const a = sh * (i - si); if (a > best.a) best = { a, i0: si, i1: i, j1: j + 1, j0: j + 1 - sh }; s = si; } st.push([s, hi]); }
  }
  if (!best.a) return { x0: bb.x0, x1: bb.x1, z0: bb.z0, z1: bb.z1 };
  return { x0: bb.x0 + best.i0 * sx, x1: bb.x0 + best.i1 * sx, z0: bb.z0 + best.j0 * sz, z1: bb.z0 + best.j1 * sz };
};
const tuerAuf = (I, p, w, lib) => { let best = null, bd = 0.25; for (const wl of I.walls) { const c = G.closestOnSeg(p, wl.a, wl.b); const d = G.dist(c.pt, p); if (d < bd) { bd = d; best = { wl, t: c.t }; } } if (best) I.doors.push({ id: U.uid('d'), wall: best.wl.id, t: Math.round(best.t * 1000) / 1000, w, lib }); return !!best; };

/* ---------- Home: Grundriss-Vorschlag für ein Wohnhaus ---------- */
// Mittelflur-Grundriss je Geschoss: Band A | Flur mit Treppe | Band B; Türen zum Flur; voll möbliert
HSS.homeLayout = (prj, b, o = {}) => {
  const pt = b.parts.slice().sort((x, y) => HSS.partArea(y) - HSS.partArea(x))[0]; if (!pt) return 0;
  const fp = HSS.partFootprintLocal(pt), R = HSS.innenRechteck(fp.outer), e = 0.18;
  let x0 = R.x0 + e, x1 = R.x1 - e, z0 = R.z0 + e, z1 = R.z1 - e;
  const quer = (x1 - x0) < (z1 - z0); // lange Seite immer entlang u
  const L = quer ? z1 - z0 : x1 - x0, D = quer ? x1 - x0 : z1 - z0;
  if (L < 5 || D < 4.5) return 0;
  const toRoom = (u0, u1, v0, v1) => quer ? { x: r2((x0 + x1) / 2 + (v0 + v1) / 2 - D / 2), z: r2(z0 + (u0 + u1) / 2), w: r2(v1 - v0), d: r2(u1 - u0) } : { x: r2(x0 + (u0 + u1) / 2), z: r2(z0 + (v0 + v1) / 2), w: r2(u1 - u0), d: r2(v1 - v0) };
  const P = (u, v) => quer ? [r2((x0 + x1) / 2 + v - D / 2), r2(z0 + u)] : [r2(x0 + u), r2(z0 + v)];
  const fl = D >= 8 ? 1.4 : 1.25, dA = Math.max(2.4, (D - fl) * 0.44), vF0 = dA, vF1 = dA + fl, tr = Math.min(3.8, L * 0.35);
  const floors = HSS.partFloors(pt).filter(f => f < (o.maxFloors ?? 3));
  let n = 0;
  const plan = f => {
    // [nutzung, Anteil an der Bandlänge] – Band A (vorn), Band B (hinten)
    if (f < 0) return { A: [['heizung', 0.3], ['hwr', 0.35], ['abstell', 0.35]], B: [['hobby', 0.6], ['abstell', 0.4]], flur: 'flur' };
    if (f === 0) return { A: [['wohnkueche', 0.45], ['gaeste_wc', 0.18], ['hwr', 0.37]], B: [['essen', 0.4], ['wohnen', 0.6]], flur: 'diele' };
    if (f === 1) return { A: L > 11 ? [['badezimmer', 0.32], ['kinder', 0.34], ['kinder', 0.34]] : [['badezimmer', 0.42], ['kinder', 0.58]], B: L > 11 ? [['schlafen', 0.55], ['arbeiten', 0.45]] : [['schlafen', 0.6], ['kinder', 0.4]], flur: 'flur' };
    return { A: [['gaeste', 0.6], ['abstell', 0.4]], B: [['arbeiten', 0.5], ['hobby', 0.5]], flur: 'flur' };
  };
  for (const f of floors) {
    const I = HSS.interior(pt.id, f, true, prj);
    if (I.rooms.length && !o.ersetzen) continue;
    I.rooms = []; I.walls = I.walls.filter(w => !w.auto && !w.room); I.doors = [];
    prj.objects = prj.objects.filter(x => !(x.host?.part === pt.id && x.host.floor === f));
    const pl = plan(f), rooms = [];
    const add = (use, u0, u1, v0, v1, name) => { const r = Object.assign({ id: U.uid('r'), use, name: name || HSS.ROOMTYPES[use]?.name }, toRoom(u0, u1, v0, v1)); I.rooms.push(r); rooms.push({ r, u0, u1, v0, v1 }); return r; };
    // Flurband über die ganze Länge, Treppe als Objekt am Ende (keine Wand zwischen Flur und Treppe)
    add(pl.flur, 0, L, vF0, vF1);
    for (const [band, v0, v1] of [['A', 0, vF0], ['B', vF1, D]]) { let u = 0; const list = pl[band]; list.forEach(([use, k], i) => { const u1 = i === list.length - 1 ? L : r2(u + L * k); add(use, u, u1, v0, v1); u = u1; }); }
    I.walls = HSS.dedupeWalls ? HSS.dedupeWalls(I.walls.concat(HSS.wallsFromRooms(I.rooms))) : HSS.wallsFromRooms(I.rooms);
    // Türen zum Flur (nicht vor der Treppe), Haustür an der Stirnseite der Diele
    for (const x of rooms) {
      if (['flur', 'diele'].includes(x.r.use)) continue;
      const vT = x.v0 === 0 ? vF0 : vF1, uA = Math.max(x.u0 + 0.6, 0.6), uB = Math.min(x.u1 - 0.6, L - tr - 0.6);
      const u = uB >= uA ? (x.r.use === 'wohnen' || x.r.use === 'essen' ? Math.min(uB, Math.max(uA, (x.u0 + x.u1) / 2)) : uA + 0.1) : (x.u0 + x.u1) / 2;
      tuerAuf(I, P(u, vT), x.r.use === 'wohnen' || x.r.use === 'essen' ? 1.25 : 0.9, 'home.tuer');
    }
    if (f === 0) tuerAuf(I, P(0, (vF0 + vF1) / 2), 1.1, 'home.haustuer');
    if (floors.length > 1 && HSS.library.get('home.treppe')) { const c = P(L - tr / 2, (vF0 + vF1) / 2); prj.objects.push({ id: U.uid('obj'), lib: 'home.treppe', host: { part: pt.id, floor: f }, x: c[0], z: c[1], rot: quer ? 0 : 90, size: { w: Math.min(1.0, fl - 0.2), d: Math.min(3.6, tr - 0.2), h: HSS.fh(pt, f) }, core: true }); }
    // Einrichtung
    for (const x of rooms) for (const ob of HSS.furnishRoom(pt, f, x.r, I, {})) { prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: pt.id, floor: f }, auto: true }, ob)); }
    n += rooms.length;
  }
  return n;
};
const r2 = v => Math.round(v * 100) / 100;

/* ---------- Fabrik: Halle in Zonen gliedern ---------- */
HSS.werkLayout = (prj, partId, o = {}) => {
  const alle = prj.buildings.filter(b => !b.umgebung).flatMap(b => b.parts.map(pt => ({ pt, b })));
  const kand = partId ? alle.filter(x => x.pt.id === partId) : alle.filter(x => x.pt.floors <= 2 && x.pt.floorHeight >= 4.5 && x.pt.use !== 'tank').sort((a, b) => HSS.partArea(b.pt) - HSS.partArea(a.pt));
  const X = kand[0]; if (!X) return 0;
  const pt = X.pt, fp = HSS.partFootprintLocal(pt), R = HSS.innenRechteck(fp.outer), e = 0.3;
  const x0 = R.x0 + e, x1 = R.x1 - e, z0 = R.z0 + e, z1 = R.z1 - e, alongX = (x1 - x0) >= (z1 - z0), L = alongX ? x1 - x0 : z1 - z0, Dd = alongX ? z1 - z0 : x1 - x0;
  if (L < 20 || Dd < 10) return 0;
  const I = HSS.interior(pt.id, 0, true, prj);
  if (I.rooms.length && !o.ersetzen) return 0;
  I.rooms = []; I.walls = I.walls.filter(w => !w.auto && !w.room); I.doors = [];
  prj.objects = prj.objects.filter(x => !(x.host?.part === pt.id && x.host.floor === 0));
  const zonen = o.zonen || [['wareneingang', 0.1], ['lager_fab', 0.24], ['produktion', 0.3], ['montage', 0.2], ['verpackung', 0.06], ['warenausgang', 0.1]];
  let u = 0, n = 0; const rooms = [];
  zonen.forEach(([use, k], i) => {
    const u1 = i === zonen.length - 1 ? L : u + L * k;
    const r = alongX ? { x: r2(x0 + (u + u1) / 2), z: r2((z0 + z1) / 2), w: r2(u1 - u), d: r2(Dd) } : { x: r2((x0 + x1) / 2), z: r2(z0 + (u + u1) / 2), w: r2(Dd), d: r2(u1 - u) };
    const room = Object.assign({ id: U.uid('r'), use, name: HSS.ROOMTYPES[use]?.name, noWalls: true, role: use }, r);
    I.rooms.push(room); rooms.push(room); u = u1; n++;
  });
  for (const r of rooms) for (const ob of HSS.furnishRoom(pt, 0, r, I, {})) prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: pt.id, floor: 0 }, auto: true }, ob));
  return n;
};

/* ---------- Gebäudebausteine je Edition ---------- */
const P0 = HSS.PRESETS;
if (E === 'fabrik') HSS.PRESETS = {
  produktionshalle: { name: 'Produktionshalle', info: '96 × 48 m, Traufe 9 m, Sheddach, Trapezblech', p: { shape: 'rect', w: 96, d: 48, floors: 1, floorHeight: 9, basements: 0, facade: { type: 'paneel', color: '#d7dbe0', accent: '#144477', glass: '#8aa0b2', axis: 6, windowRatio: 0.3 }, roof: { type: 'shed', neigung: 22, raster: 12, parapet: 0, plant: false } } },
  lagerhalle: { name: 'Lagerhalle', info: '60 × 36 m, Traufe 11 m, Flachdach', p: { shape: 'rect', w: 60, d: 36, floors: 1, floorHeight: 11, basements: 0, facade: { type: 'paneel', color: '#e3e6ea', accent: '#2D7694', glass: '#8aa0b2', axis: 6, windowRatio: 0.15 }, roof: { type: 'flach', parapet: 0.6, plant: false } } },
  hochregallager: { name: 'Hochregallager (Silobauweise)', info: '42 × 26 m, 30 m hoch', p: { shape: 'rect', w: 42, d: 26, floors: 1, floorHeight: 30, basements: 0, facade: { type: 'paneel', color: '#eef0f2', accent: '#0A967A', glass: '#8aa0b2', axis: 4, windowRatio: 0.05 }, roof: { type: 'flach', parapet: 0.5, plant: false } } },
  satteldachhalle: { name: 'Halle mit Satteldach', info: '48 × 24 m, Traufe 7 m, 10° Dachneigung', p: { shape: 'rect', w: 48, d: 24, floors: 1, floorHeight: 7, basements: 0, facade: { type: 'paneel', color: '#d3d7db', accent: '#d9531e', glass: '#8aa0b2', axis: 5, windowRatio: 0.25 }, roof: { type: 'sattel', neigung: 10, parapet: 0, plant: false, color: '#8d969f' } } },
  verwaltung: { name: 'Verwaltungsgebäude', info: '36 × 14 m, 3 Geschosse, Bandfassade', p: { shape: 'rect', w: 36, d: 14, floors: 3, floorHeight: 3.5, basements: 0, facade: { type: 'band', color: '#eef0f2', accent: '#144477', glass: '#6f8fa8', axis: 1.35, windowRatio: 0.55 } } },
  sozialgebaeude: { name: 'Sozialgebäude (Umkleiden, Kantine)', info: '28 × 12 m, 2 Geschosse', p: { shape: 'rect', w: 28, d: 12, floors: 2, floorHeight: 3.4, basements: 0, facade: { type: 'loch', color: '#f1ede4', accent: '#8d6e63', glass: '#6f8fa8', axis: 1.6, windowRatio: 0.45 } } },
  werkstatt: { name: 'Werkstatt / Instandhaltung', info: '24 × 16 m, 6 m, Pultdach', p: { shape: 'rect', w: 24, d: 16, floors: 1, floorHeight: 6, basements: 0, facade: { type: 'paneel', color: '#d7dbe0', accent: '#5a6573', glass: '#8aa0b2', axis: 4, windowRatio: 0.3 }, roof: { type: 'pult', neigung: 6, parapet: 0, plant: false } } },
  energiezentrale: { name: 'Energiezentrale', info: '18 × 12 m, 8 m', p: { shape: 'rect', w: 18, d: 12, floors: 1, floorHeight: 8, basements: 0, facade: { type: 'klinker', color: '#9c5a3c', accent: '#f4f1ea', glass: '#5d7489', axis: 3, windowRatio: 0.2 } } },
  pforte: { name: 'Pforte', info: '8 × 6 m, eingeschossig', p: { shape: 'rect', w: 8, d: 6, floors: 1, floorHeight: 3.2, basements: 0, facade: { type: 'glas', color: '#e9ecef', accent: '#144477', glass: '#7fa4bd', axis: 1.5 }, roof: { type: 'flach', parapet: 0.3, plant: false } } },
  silo: { name: 'Silo / Tank (rund)', info: 'Ø 8 m, 16 m hoch', p: { shape: 'rund', w: 8, d: 8, floors: 1, floorHeight: 16, basements: 0, use: 'tank', facade: { type: 'paneel', color: '#dfe3e6', accent: '#a7b0ba', glass: '#a7b0ba', axis: 3, windowRatio: 0.1 }, roof: { type: 'flach', parapet: 0.3, plant: false } } },
  parkhaus: P0.parkhaus
};
if (E === 'home') HSS.PRESETS = {
  efh: { name: 'Einfamilienhaus', info: '11 × 9 m, 2 Geschosse, Satteldach 38°, Keller', p: { shape: 'rect', w: 11, d: 9, floors: 2, floorHeight: 2.8, basements: 1, basementHeight: 2.5, facade: { type: 'loch', color: '#f1ede4', accent: '#8d6e63', glass: '#6f8fa8', axis: 1.6, windowRatio: 0.45 }, roof: { type: 'sattel', neigung: 38, parapet: 0, plant: false, color: '#9b4a32' } } },
  stadtvilla: { name: 'Stadtvilla', info: '11 × 11 m, 2 Geschosse, Zeltdach 22°', p: { shape: 'rect', w: 11, d: 11, floors: 2, floorHeight: 2.85, basements: 0, facade: { type: 'loch', color: '#f4f2ee', accent: '#5a6573', glass: '#6f8fa8', axis: 1.7, windowRatio: 0.5 }, roof: { type: 'zelt', neigung: 22, parapet: 0, plant: false, color: '#4a4f55' } } },
  bungalow: { name: 'Bungalow', info: '15 × 11 m, eingeschossig, Walmdach 25°', p: { shape: 'rect', w: 15, d: 11, floors: 1, floorHeight: 2.9, basements: 0, facade: { type: 'loch', color: '#f1ede4', accent: '#8d6e63', glass: '#6f8fa8', axis: 1.8, windowRatio: 0.5 }, roof: { type: 'walm', neigung: 25, parapet: 0, plant: false, color: '#7d2f22' } } },
  doppelhaus: { name: 'Doppelhaushälfte', info: '7 × 10 m, 2 Geschosse, Satteldach 45°', p: { shape: 'rect', w: 7, d: 10, floors: 2, floorHeight: 2.8, basements: 1, basementHeight: 2.5, facade: { type: 'klinker', color: '#9c5a3c', accent: '#f4f1ea', glass: '#5d7489', axis: 1.6 }, roof: { type: 'sattel', neigung: 45, richtung: 90, parapet: 0, plant: false, color: '#4a4f55' } } },
  reihenhaus: { name: 'Reihenhaus', info: '6 × 10 m, 2 Geschosse, Satteldach', p: { shape: 'rect', w: 6, d: 10, floors: 2, floorHeight: 2.75, basements: 0, facade: { type: 'loch', color: '#efe2a8', accent: '#8d6e63', glass: '#6f8fa8', axis: 1.5, windowRatio: 0.45 }, roof: { type: 'sattel', neigung: 40, richtung: 90, parapet: 0, plant: false, color: '#9b4a32' } } },
  modern: { name: 'Modernes Haus (Flachdach)', info: '14 × 9 m, 2 Geschosse, Kubus', p: { shape: 'rect', w: 14, d: 9, floors: 2, floorHeight: 3.0, basements: 0, facade: { type: 'glas', color: '#f4f5f7', accent: '#3d4146', glass: '#7fa4bd', axis: 1.8 }, roof: { type: 'flach', parapet: 0.3, plant: false } } },
  mfh: { name: 'Mehrfamilienhaus', info: '22 × 12 m, 4 Geschosse, Satteldach 35°', p: { shape: 'rect', w: 22, d: 12, floors: 4, floorHeight: 2.9, basements: 1, basementHeight: 2.5, facade: { type: 'loch', color: '#eceae5', accent: '#5a6573', glass: '#6f8fa8', axis: 1.5, windowRatio: 0.45 }, roof: { type: 'sattel', neigung: 35, parapet: 0, plant: false, color: '#6f757c' } } },
  garage: { name: 'Garage', info: '3,5 × 6,5 m, Flachdach', p: { shape: 'rect', w: 3.5, d: 6.5, floors: 1, floorHeight: 2.6, basements: 0, facade: { type: 'loch', color: '#eceae5', accent: '#8d969f', glass: '#8aa0b2', axis: 3, windowRatio: 0.15 }, roof: { type: 'flach', parapet: 0.15, plant: false } } },
  doppelgarage: { name: 'Doppelgarage', info: '6,5 × 6,5 m, Flachdach', p: { shape: 'rect', w: 6.5, d: 6.5, floors: 1, floorHeight: 2.6, basements: 0, facade: { type: 'loch', color: '#eceae5', accent: '#8d969f', glass: '#8aa0b2', axis: 3, windowRatio: 0.15 }, roof: { type: 'flach', parapet: 0.15, plant: false } } },
  gartenhaus: { name: 'Gartenhaus', info: '3 × 2,5 m, Pultdach', p: { shape: 'rect', w: 3, d: 2.5, floors: 1, floorHeight: 2.2, basements: 0, facade: { type: 'loch', color: '#a07a3c', accent: '#6b4a34', glass: '#6f8fa8', axis: 1.5, windowRatio: 0.2 }, roof: { type: 'pult', neigung: 10, parapet: 0, plant: false, color: '#4a4f55' } } },
  wintergarten: { name: 'Wintergarten / Anbau', info: '4 × 3 m, Glas, Pultdach', p: { shape: 'rect', w: 4, d: 3, floors: 1, floorHeight: 2.6, basements: 0, facade: { type: 'glas', color: '#f4f5f7', accent: '#5a6573', glass: '#9fc4d8', axis: 1.0 }, roof: { type: 'pult', neigung: 8, parapet: 0, plant: false, color: '#cfe2ef' } } }
};

/* ---------- Oberfläche ---------- */
document.title = ED.titel;
try { const t1 = $('#top .t1'); if (t1) t1.textContent = ED.titel; const ld = $('#loading p'); if (ld) ld.textContent = ED.titel + ' wird geladen …'; const bd = $('#bDemo'); if (bd) bd.title = `${ED.demo} laden${E === 'health' ? ' und geführte Demo starten' : ' (Beispielprojekt)'}`; } catch (e) { /* */ }
document.body.classList.add('ed-' + E);
if (E !== 'health') {
  // Arbeitsbereiche: Texte und Sichtbarkeit
  if (E === 'fabrik') {
    Object.assign(W.gelaende, { name: 'Werksgelände & Wege', short: 'Gelände & Wege', lead: 'Werksgelände mit Straßen, LKW-Zufahrten, Rampen, Parkplätzen, Gleisanschluss, Zaun und Freilager – auch aus OpenStreetMap.' });
    Object.assign(W.gebaeude, { lead: 'Hallen, Lager, Hochregallager, Verwaltung und Sozialgebäude aus Bausteinen: Grundform, Traufhöhe, Fassade, Dachform (Shed, Sattel, Pult, Flach). Bauteile andocken und verbinden.' });
    Object.assign(W.innen, { lead: 'Hallen und Etagen von innen: Zonen (Wareneingang, Lager, Produktion, Montage, Versand) aufziehen, Maschinen, Regale und Fördertechnik platzieren. Etage oben in der Ansichtsleiste oder hier wählen.' });
    if (W.fluesse) Object.assign(W.fluesse, { name: 'Material- & Warenflüsse', lead: 'Materialflüsse vom Wareneingang über Lager, Fertigung und Montage bis zum Versand – mit Menge, Zeitfenster und Fördermittel (Stapler, Routenzug, FTS, LKW). Standardflüsse übernehmen oder eigene anlegen.' });
  } else {
    Object.assign(W.gelaende, { name: 'Grundstück & Garten', short: 'Grundstück', lead: 'Grundstück, Garten, Terrasse, Zufahrt, Wege, Zäune und Hecken – auch aus OpenStreetMap mit Nachbarschaft und Luftbild.' });
    Object.assign(W.gebaeude, { name: 'Haus', short: 'Haus', lead: 'Haus aus Bausteinen: Grundform, Geschosse, Fassade, Dachform (Sattel, Walm, Zelt, Pult, Flach) und Neigung. Garage, Gartenhaus oder Anbau andocken.' });
    Object.assign(W.innen, { name: 'Räume & Möbel', short: 'Räume', lead: 'Räume je Etage aufziehen und automatisch möblieren – oder einen kompletten Grundriss vorschlagen lassen. Möbel aus der Bibliothek ins Bild ziehen.' });
    Object.assign(W.bibliothek, { name: 'Möbel & Objekte' });
  }
  const rail0 = UI.buildRail;
  UI.buildRail = () => { rail0(); for (const k of ED.hide || []) $$(`#rail button[data-ws="${k}"]`).forEach(b => b.remove()); };
  // Ansichtsleiste: Stationsrundgang gibt es nur in der Healthcare-Edition
  if (ED.tour === false) { const t = $('#vTour'); if (t) t.hidden = true; }
  // Etagen & Innenausbau: Ausstattung der Edition, Grundriss-/Zonenvorschlag
  const innen0 = W.innen.render.bind(W.innen);
  W.innen.render = el => {
    innen0(el);
    const til = [...el.querySelectorAll('.tiles')].find(t => t.querySelector('[data-cat]'));
    if (til && ED.ausstattung) { til.innerHTML = ED.ausstattung.map(([c, n]) => `<button class="tile" data-cat="${U.esc(c)}"><b>${U.esc(n)}</b></button>`).join(''); $$('[data-cat]', til).forEach(b => b.onclick = () => { UI.libCat = b.dataset.cat; UI.setWS('bibliothek'); }); }
    const anchor = el.querySelector('#rGo')?.closest('.row'); if (!anchor) return;
    const box = document.createElement('div'); box.className = 'box'; box.style.marginTop = '6px';
    const s = HSS.state.selection, P = s?.kind === 'part' ? HSS.findPart(s.id) : null;
    box.innerHTML = E === 'home'
      ? `<div class="note" style="margin-bottom:4px"><b>Grundriss vorschlagen:</b> Diele/Flur mit Treppe, Küche, Wohnen, Essen, Bäder, Schlaf- und Kinderzimmer – mit Türen und Möbeln, für alle Etagen des Hauses.</div><button class="primary" id="edPlan">🏠 Grundriss vorschlagen${P ? ` (${U.esc(P.building.name)})` : ''}</button>`
      : `<div class="note" style="margin-bottom:4px"><b>Halle in Zonen gliedern:</b> Wareneingang → Lager → Produktion → Montage → Verpackung → Versand, mit Regalen, Maschinen, Montagelinie und Staplern.</div><button class="primary" id="edPlan">🏭 Zonen vorschlagen${P ? ` (${U.esc(P.building.name)})` : ' (größte Halle)'}</button>`;
    anchor.after(box);
    $('#edPlan', box).onclick = async () => {
      let n = 0;
      if (E === 'home') {
        const b = P?.building || HSS.project().buildings.find(x => x.hauptgebaeude) || HSS.project().buildings.filter(x => !x.umgebung).sort((a, c) => U.sum(c.parts.map(HSS.partArea)) - U.sum(a.parts.map(HSS.partArea)))[0];
        if (!b) return UI.toast('Zuerst ein Haus anlegen oder auswählen');
        const hat = b.parts.some(pt => Object.values(HSS.project().interiors[pt.id] || {}).some(I => I.rooms?.length));
        if (hat && !await UI.confirm('Grundriss ersetzen?', 'Vorhandene Räume und Möbel dieses Hauses werden ersetzt.', 'Ersetzen')) return;
        HSS.change('Grundriss vorschlagen', p => { n = HSS.homeLayout(p, p.buildings.find(x => x.id === b.id), { ersetzen: true }); });
      } else {
        HSS.change('Zonen vorschlagen', p => { n = HSS.werkLayout(p, P?.part?.id, { ersetzen: true }); });
      }
      UI.toast(n ? `${n} ${E === 'home' ? 'Räume angelegt und möbliert' : 'Zonen angelegt und ausgestattet'}` : (E === 'home' ? 'Haus zu klein für den Vorschlag (mindestens 5 × 4,5 m innen)' : 'Keine passende Halle (mind. 20 × 10 m, ≥ 4,5 m hoch) gefunden'), 4000);
      if (n && HSS.view.floor === null) HSS.s3.setFloor(0);
      UI.renderPanel();
    };
  };
  // Bibliothek: Pakete der Edition zuerst, übrige auf Wunsch
  const L = HSS.library, cat0 = L.categories.bind(L), search0 = L.search.bind(L);
  const passt = c => UI.libAlle || (ED.kats || []).some(k => c === k || c.startsWith(k + '/'));
  L.categories = () => cat0().filter(([c]) => passt(c));
  L.search = (q, cur) => search0(q, cur).filter(o => cur || q ? true : passt(o.category));
  const bib0 = W.bibliothek.render.bind(W.bibliothek);
  W.bibliothek.render = el => {
    bib0(el);
    const cat = el.querySelector('.cat'); if (!cat) return;
    const b = document.createElement('button'); b.textContent = UI.libAlle ? '− nur ' + (E === 'home' ? 'Wohnen' : 'Fabrik') : '+ alle Pakete (auch Klinik)'; b.title = 'Weitere Bibliothekspakete der Suite ein- oder ausblenden';
    b.onclick = () => { UI.libAlle = !UI.libAlle; UI.libCat = ''; UI.renderPanel(); }; cat.appendChild(b);
    const q = el.querySelector('#lQ'); if (q) q.placeholder = E === 'home' ? 'Suchen: Sofa, Bett, Küche, Dusche …' : 'Suchen: Regal, Stapler, CNC, Förderband …';
  };
}
// Raum aufziehen: nur die Raumtypen der Edition anbieten
{ const r0 = W.innen.render.bind(W.innen); W.innen.render = el => { r0(el); const sel = $('#rUse', el); if (sel) { const T = HSS.raumtypenEdition(); sel.innerHTML = UI.opts(T, UI.roomUse && T[UI.roomUse] ? UI.roomUse : (ED.raum || 'patient2')); UI.roomUse = sel.value; } }; }
// Inspektor: Hinweis zur Herkunft importierter Bauteile (OSM/ALKIS)
const insp0 = UI.inspector;
if (insp0) UI.inspector = (...a) => {
  const r = insp0(...a);
  try {
    const s = HSS.state.selection; if (s?.kind !== 'part') return r;
    const P = HSS.findPart(s.id); const q = P?.part?.osmQuelle; const el = $('#inspector'); if (!q || !el || el.hidden) return r;
    if (el.querySelector('.osmq')) return r;
    const d = document.createElement('div'); d.className = 'note osmq';
    d.innerHTML = `<b>Herkunft:</b> ${U.esc(P.building.info || '')}<br>Geschosse: ${q.geschosse === 'osm' ? 'laut OSM' : q.geschosse === 'hoehe' ? 'aus der Höhe geschätzt' : '<span class="warn">angenommen – bitte prüfen</span>'} · Dachform: ${q.dach === 'osm' ? 'laut OSM' : 'angenommen'}`;
    const h = el.querySelector('h3'); (h || el.firstChild)?.before?.(d);
  } catch (e) { /* */ }
  return r;
};

/* ---------- Demos ---------- */
const part = o => { const d = HSS.defaults.part(); const p = Object.assign(d, U.clone(o)); p.facade = Object.assign(HSS.defaults.part().facade, o.facade || {}); p.roof = Object.assign(HSS.defaults.part().roof, o.roof || {}); return p; };
const pre = (k, o) => part(Object.assign(U.clone(HSS.PRESETS[k].p), o));
HSS.buildDemoFabrik = () => {
  const prj = HSS.newProject('UNITY Werk (Demo)');
  prj.meta.notes = 'Demo-Werk der Fabric Planning Suite. Mengen, Zeiten und Kapazitäten sind Beispielwerte.';
  prj.terrain = { size: 700, color: '#c5cfb6', tilt: { dir: 0, pct: 0 }, hills: [{ x: -280, z: -200, h: 6, r: 90 }, { x: 260, z: 220, h: 4, r: 80 }] };
  const B = (id, name, kurz, color, parts) => prj.buildings.push({ id, name, kurz, color, parts });
  B('bP', 'Produktionshalle', 'P', '#144477', [pre('produktionshalle', { id: 'P1', name: 'Produktionshalle', x: 0, z: 0 })]);
  B('bL', 'Logistikzentrum', 'L', '#0A967A', [pre('lagerhalle', { id: 'L1', name: 'Lagerhalle', x: -80, z: 6, w: 64, d: 36 }), pre('hochregallager', { id: 'L2', name: 'Hochregallager', x: -80, z: -34, w: 42, d: 24 })]);
  B('bV', 'Verwaltung', 'V', '#2D7694', [pre('verwaltung', { id: 'V1', name: 'Verwaltung', x: 70, z: 52 })]);
  B('bS', 'Sozialgebäude', 'S', '#d9531e', [pre('sozialgebaeude', { id: 'S1', name: 'Sozialgebäude', x: 30, z: 52 })]);
  B('bW', 'Werkstatt', 'W', '#7b5ea7', [pre('werkstatt', { id: 'W1', name: 'Instandhaltung', x: 72, z: -6 })]);
  B('bE', 'Energiezentrale', 'E', '#5a6573', [pre('energiezentrale', { id: 'E1', name: 'Energiezentrale', x: 72, z: -40 })]);
  B('bT', 'Pforte', 'T', '#144477', [pre('pforte', { id: 'T1', name: 'Pforte', x: 120, z: 74 })]);
  for (const [i, x] of [-12, 0, 12].entries()) B('bSi' + i, 'Silo ' + (i + 1), 'Si', '#5a6573', [pre('silo', { id: 'SI' + i, name: 'Silo ' + (i + 1), x: 18 + x, z: -38, w: 7, d: 7, floorHeight: 18 })]);
  // Wege, Flächen
  const path = (kind, name, points, o = {}) => prj.paths.push(Object.assign(HSS.defaults.path(kind), { id: U.uid('path'), name, points, smooth: false }, o));
  path('strasse', 'Industriestraße', [[-220, 100], [220, 100]], { width: 8, traffic: 4 });
  path('zufahrt', 'Werkstraße (Ring)', [[120, 100], [120, 76], [100, 30], [100, -60], [-120, -60], [-120, 40], [-30, 30], [40, 30], [100, 30]], { width: 7 });
  path('zufahrt', 'LKW-Zufahrt Wareneingang', [[-120, 40], [-120, 80], [-160, 100]], { width: 7 });
  path('gehweg', 'Gehweg Pforte – Sozialgebäude', [[120, 92], [100, 70], [40, 66], [30, 60]], { width: 2.5 });
  path('bahn', 'Gleisanschluss', [[-220, -78], [-40, -78], [40, -72]], { width: 3.2 });
  path('grenze', 'Werkszaun', [[-200, 92], [200, 92], [200, -95], [-200, -95], [-200, 92]], { width: 0.35, noNet: true });
  const area = (kind, name, x, z, w, d) => prj.areas.push({ id: U.uid('area'), kind, name, x, z, w, d, rot: 0 });
  area('parkplatz', 'Mitarbeiterparkplatz', 150, 50, 70, 44); area('platz', 'Ladehof Wareneingang', -80, 40, 64, 30); area('platz', 'Ladehof Versand', 0, 38, 60, 22); area('gruen', 'Grünfläche', 170, -40, 50, 80); area('platz', 'Freilager', -160, -30, 50, 60);
  const out = (lib, x, z, rot = 0, extra = {}) => prj.objects.push(Object.assign({ id: U.uid('obj'), lib, x, z, rot }, extra));
  out('fab.schornstein', 84, -46, 0, { size: { w: 1.6, d: 1.6, h: 32 } }); out('fab.tank', 52, -40); out('fab.tank', 58, -40);
  for (const [i, x] of [-96, -86, -76, -66].entries()) out('fab.torschleuse', x, 25.5, 0, { name: 'Tor ' + (i + 1) });
  for (const x of [-12, 0, 12]) out('fab.torschleuse', x, 25.5, 0);
  out('fab.sattelzug', -96, 40, 180); out('fab.sattelzug', -76, 42, 180); out('fab.sattelzug', 0, 42, 180);
  for (let i = 0; i < 6; i++) out(i % 2 ? 'fab.container40' : 'fab.container20', -172 + (i % 3) * 8, -50 + Math.floor(i / 3) * 16, 0);
  out('fab.portalkran.aussen', -160, -30, 90);
  for (let i = 0; i < 12; i++) out(i % 3 ? 'kfz.pkw' : 'kfz.pkw.suv', 125 + (i % 6) * 6, 36 + Math.floor(i / 6) * 22, 0);
  for (let i = 0; i < 10; i++) out('gruen.baum.laub', 150 + (i % 2) * 30, -75 + i * 8, i * 40);
  // Zonen der Produktionshalle und des Lagers
  HSS.werkLayout(prj, 'P1', { zonen: [['wareneingang', 0.08], ['produktion', 0.42], ['montage', 0.3], ['verpackung', 0.08], ['warenausgang', 0.12]] });
  HSS.werkLayout(prj, 'L1', { zonen: [['wareneingang', 0.25], ['lager_fab', 0.6], ['kommissionierung', 0.15]] });
  // Sozialgebäude: Räume
  const I = HSS.interior('S1', 0, true, prj), rr = [];
  const room = (use, x, z, w, d) => { const r = { id: U.uid('r'), use, name: HSS.ROOMTYPES[use].name, x, z, w, d, role: use }; I.rooms.push(r); rr.push(r); };
  room('sozial', -7, 0, 13.6, 11.4); room('umkleide', 5, -2.9, 9.6, 5.6); room('wertstoff', 5, 2.9, 9.6, 5.6);
  I.walls = HSS.wallsFromRooms(I.rooms);
  for (const r of rr) for (const ob of HSS.furnishRoom(HSS.findPart('S1', prj).part, 0, r, I, {})) prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: 'S1', floor: 0 }, auto: true }, ob));
  prj.places.push({ id: 'pl_extern', name: 'Lieferanten / Kunden (extern)', kind: 'extern', role: 'extern', x: -210, z: 100 });
  return prj;
};
HSS.buildDemoHome = () => {
  const prj = HSS.newProject('Musterhaus (Demo)');
  prj.meta.notes = 'Demo der Home Planning Suite: Einfamilienhaus mit Keller, Garage, Garten und Terrasse.';
  prj.terrain = { size: 220, color: '#b9cf9a', tilt: { dir: 0, pct: 0 }, hills: [] };
  prj.buildings.push({ id: 'bH', name: 'Musterhaus', kurz: 'H', color: '#144477', hauptgebaeude: true, parts: [pre('efh', { id: 'H1', name: 'Wohnhaus', x: 0, z: 0, w: 12, d: 9.5 })] });
  prj.buildings.push({ id: 'bG', name: 'Garage', kurz: 'G', color: '#8d6e63', parts: [pre('garage', { id: 'G1', name: 'Garage', x: 9.0, z: -1.0, w: 3.6, d: 7 })] });
  prj.buildings.push({ id: 'bGh', name: 'Gartenhaus', kurz: 'Gh', color: '#8d6e63', parts: [pre('gartenhaus', { id: 'GH1', name: 'Gartenhaus', x: -9, z: 13 })] });
  // Nachbarhäuser (Umgebung)
  prj.buildings.push({ id: 'bN1', name: 'Nachbarhaus', kurz: '', color: '#8d969f', umgebung: true, noLabel: true, parts: [pre('efh', { id: 'N1', name: 'Nachbarhaus', x: -26, z: 1, w: 10, d: 9, basements: 0, roof: { type: 'sattel', neigung: 42, color: '#6f757c' } })] });
  prj.buildings.push({ id: 'bN2', name: 'Nachbarhaus', kurz: '', color: '#8d969f', umgebung: true, noLabel: true, parts: [pre('stadtvilla', { id: 'N2', name: 'Nachbarhaus', x: 28, z: 2, basements: 0 })] });
  prj.buildings.push({ id: 'bN3', name: 'Nachbarhaus', kurz: '', color: '#8d969f', umgebung: true, noLabel: true, parts: [pre('bungalow', { id: 'N3', name: 'Nachbarhaus', x: 2, z: 40, basements: 0 })] });
  const path = (kind, name, points, o = {}) => prj.paths.push(Object.assign(HSS.defaults.path(kind), { id: U.uid('path'), name, points, smooth: false }, o));
  path('strasse', 'Lindenweg', [[-90, -16], [90, -16]], { width: 6, traffic: 1, speedKmh: 30 });
  path('gehweg', 'Gehweg', [[-90, -11.6], [90, -11.6]], { width: 2.0 });
  path('zufahrt', 'Garagenzufahrt', [[9, -10.6], [9, -4.6]], { width: 3.2 });
  path('gehweg', 'Hauszugang', [[2, -10.6], [-6.3, -6], [-6.3, -1]], { width: 1.4 });
  path('grenze', 'Grundstücksgrenze', [[-13, -10.6], [13, -10.6], [13, 24], [-13, 24], [-13, -10.6]], { width: 0.25, noNet: true });
  prj.areas.push({ id: 'aG', kind: 'gruen', name: 'Garten', x: 0, z: 6.7, w: 26, d: 34.6, rot: 0, density: 0 });
  prj.areas.push({ id: 'aT', kind: 'platz', name: 'Terrasse', x: -1, z: 7.4, w: 8, d: 4, rot: 0 });
  const out = (lib, x, z, rot = 0, extra = {}) => prj.objects.push(Object.assign({ id: U.uid('obj'), lib, x, z, rot }, extra));
  out('home.gartenmoebel', -2, 7.6); out('home.sonnenschirm', 1.8, 7.8); out('home.grill', 4.0, 8.4, 180); out('home.hochbeet', 8, 16, 90); out('home.trampolin', 6, 20);
  out('home.muelltonnen', 12, -8.5, 270); out('home.waermepumpe', 7.0, 5.5, 90); out('kfz.pkw', 9, -8.5, 0);
  for (const [x, z] of [[-11, 21], [-4, 22], [10.5, 12], [-11.5, 6]]) out('gruen.baum.laub', x, z, x * 20);
  for (let i = 0; i < 12; i++) out('home.hecke', -12.6, -6 + i * 2.5, 90);
  HSS.state.project = prj;
  HSS.homeLayout(prj, prj.buildings[0], { ersetzen: true });
  return prj;
};
if (E !== 'health' && HSS.demo) {
  HSS.demo.start = () => {
    UI.toast(`${ED.demo} wird aufgebaut …`, 1500);
    setTimeout(() => {
      const prj = E === 'fabrik' ? HSS.buildDemoFabrik() : HSS.buildDemoHome();
      HSS.load(prj, { demo: true, noAutosave: true });
      if (E === 'fabrik') { try { const r = HSS.applyTemplates(HSS.STANDARDFLUESSE.map(t => t.id)); if (r.flows.length) HSS.change('Standardflüsse übernehmen', p => p.flows.push(...r.flows), { scope: 'none' }); } catch (e) { console.warn(e); } }
      $('#demoCard').hidden = false;
      $('#demoCard').innerHTML = `<div class="k">Beispielprojekt</div><h3>${U.esc(ED.demo)}</h3><p>${E === 'fabrik' ? 'Werk mit Produktionshalle (Sheddach), Lager mit Hochregallager, Verwaltung, Sozialgebäude, Silos und Werksverkehr. Zonen der Hallen sind ausgestattet, die Standardflüsse sind angelegt – unter „Simulation“ den Tag durchrechnen.' : 'Einfamilienhaus mit Keller, Satteldach, Garage, Garten und Terrasse. Alle Räume sind möbliert – oben in der Ansichtsleiste eine Etage wählen oder mit „🚶 Begehen“ durchs Haus gehen.'}</p><div class="row"><div class="sp"></div><button class="primary" id="dEnd">Los geht’s</button></div>`;
      $('#dEnd').onclick = () => { $('#demoCard').hidden = true; };
      UI.setWS(E === 'fabrik' ? 'gebaeude' : 'innen');
    }, 30);
  };
}
})();
