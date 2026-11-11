/* Aufbau des Planungsmodells „Rolls-Royce Power Systems – Werk 1 Friedrichshafen“
   Läuft im Browser in der Fabric Planning Suite (siehe tools/werk1_bauen.js) auf einem Projekt,
   das aus OpenStreetMap importiert wurde (Gebäude „G xx“, Straßen, Bahn, Umgebung).
   Belegt (öffentliche Quellen): Hauptverwaltung, Jean-Raebel-Haus (Büro), Werkskantine Karl-Maybach-Haus,
   MTU Training Center / Ausbildung, G 25/1 Pleuelfertigung (OSM), G 75 Entwicklungsprüffeld mit 7 Prüfständen
   (F&E-Prüffeld 2013–2015), Microgrid Validation Center (2019), Pforten, Materialwirtschaftszentrum Kluftern,
   Montage Baureihe 4000 in Werk 2 (Manzell).
   Alle übrigen Hallenbelegungen, Mengen und Zeiten sind ein PLANUNGSSZENARIO (Annahme) für die
   „Neuaufstellung Werk 1/2“ (Pressemitteilung 02.03.2026) und keine Angaben des Unternehmens. */
(async () => {
  const U = HSS.util, prj = HSS.project(), miss = [], log = [];
  const QUELLE = 'Belegt durch öffentliche Quelle', SZEN = 'Planungsszenario (Annahme)';
  const B = n => prj.buildings.find(b => !b.umgebung && (b.name === n || b.name.startsWith(n + ' ')));
  const FARBE = { montage: '#144477', fertigung: '#2D7694', pruef: '#891F5E', lack: '#d9531e', logistik: '#0A967A', verwaltung: '#5a6573', sozial: '#8d6e63', technik: '#7b5ea7', qs: '#e3ac0c' };
  // Gebäude benennen und bemessen
  const geb = (n, o) => {
    const b = B(n); if (!b) { miss.push(n); return null; }
    const pt = b.parts[0];
    b.name = o.name ? `${n} · ${o.name}` : b.name; b.kurz = n.replace(/\s/g, '').replace('Werkskantine', 'K').slice(0, 6); if (o.kurz) b.kurz = o.kurz;
    b.color = FARBE[o.art] || b.color;
    b.info = `${o.name || n} – ${o.beleg ? QUELLE + ': ' + o.beleg : SZEN}`;
    b.funktion = { art: o.art, beleg: !!o.beleg };
    if (o.h) pt.floorHeight = o.h;
    if (o.floors) pt.floors = o.floors;
    if (o.roof) pt.roof = Object.assign(pt.roof || {}, o.roof);
    if (o.facade) pt.facade = Object.assign(pt.facade || {}, o.facade);
    pt.name = o.name || pt.name;
    return { b, pt };
  };
  // Produktionsplaner: Bereich in die Halle legen
  const prod = (n, inp, nachher) => {
    const g = B(n); if (!g) { miss.push(n); return null; }
    const pt = g.parts[0], i = Object.assign({ part: pt.id, floor: 0 }, inp), c = HSS.prodCalc(i, prj), rep = HSS.prodGenerate(prj, i, c, {});
    const e = prj.produktion[prj.produktion.length - 1];
    const room = Object.values(prj.interiors[pt.id] || {}).flatMap(I => I.rooms).find(r => r.prod === e?.id);
    if (room && nachher) nachher(room);
    log.push(`${n}: ${i.name || c.typ.name} – ${rep.placed} Objekte${rep.dropped.length ? ', nicht untergebracht: ' + [...new Set(rep.dropped)].join(', ') : ''}`);
    return room;
  };
  // Zonen ohne Planer: Raum über das Innenrechteck je Etage und Ausstattung im Raster
  const zone = (n, use, f = 0, name) => {
    const g = B(n); if (!g) { miss.push(n); return null; }
    const pt = g.parts[0], R = HSS.innenRechteck(HSS.partFootprintLocal(pt).outer), I = HSS.interior(pt.id, f, true, prj);
    const r = { id: U.uid('r'), use, role: use, name: name || HSS.ROOMTYPES[use]?.name || use, noWalls: true, x: (R.x0 + R.x1) / 2, z: (R.z0 + R.z1) / 2, w: Math.max(2, R.x1 - R.x0 - 0.6), d: Math.max(2, R.z1 - R.z0 - 0.6) };
    I.rooms.push(r); return { r, pt, R };
  };
  const raster = (z, lib, px, pz, rot = 0, rand = 1.2, max = 400) => {
    if (!z) return 0; const { r, pt } = z, f = +Object.keys(prj.interiors[pt.id]).find(k => prj.interiors[pt.id][k].rooms.includes(r)); let n = 0;
    for (let x = r.x - r.w / 2 + rand + px / 2; x <= r.x + r.w / 2 - rand - px / 2 + 0.01 && n < max; x += px) for (let zz = r.z - r.d / 2 + rand + pz / 2; zz <= r.z + r.d / 2 - rand - pz / 2 + 0.01 && n < max; zz += pz) { prj.objects.push({ id: U.uid('obj'), lib, x: +x.toFixed(2), z: +zz.toFixed(2), rot, host: { part: pt.id, floor: f }, auto: true }); n++; }
    return n;
  };
  const einrichten = z => { if (!z) return; const I = prj.interiors[z.pt.id][Object.keys(prj.interiors[z.pt.id]).find(k => prj.interiors[z.pt.id][k].rooms.includes(z.r))]; for (const ob of HSS.furnishRoom(z.pt, 0, z.r, I, {})) prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: z.pt.id, floor: 0 }, auto: true }, ob)); };
  const buero = (n, floors, name) => { const g = geb(n, { name, art: 'verwaltung', floors, h: 3.6, beleg: name.beleg }); if (!g) return; const rr = []; for (let f = 0; f < g.pt.floors; f++) { const z = zone(n, f === 0 ? 'besprechung' : 'buero', f, f === 0 ? 'Empfang / Besprechung' : 'Büro'); if (z) { raster(z, f === 0 ? 'buero.besprechung' : 'buero.schreibtisch', f === 0 ? 6 : 3.2, f === 0 ? 6 : 3.0, 0, 1.5, 60); rr.push(z.r); } } return rr; };

  /* ---------- 1 · Belegung der Gebäude ---------- */
  const shed = { type: 'shed', neigung: 22, raster: 12, parapet: 0, plant: false }, halle = { type: 'paneel', color: '#d7dbe0', accent: '#144477', glass: '#8aa0b2', axis: 6, windowRatio: 0.3 };
  geb('G 43', { name: 'Montage Großmotoren', art: 'montage', h: 14, roof: shed, facade: halle });
  const rMontage = prod('G 43', { typ: 'montage', produkt: 'gross', name: 'Montagelinie Großmotoren (16V/20V)', stueck: 1700, inhalt: 5000, tage: 230, schichten: 2, h: 7.5, verf: 0.9, abtakt: 0.85 });
  geb('G 62', { name: 'Kurbelgehäusefertigung', art: 'fertigung', h: 13, roof: shed, facade: halle });
  const rKG = prod('G 62', { typ: 'fertigung', produkt: 'gross', name: 'Kurbelgehäuse-Bearbeitung (Portal-BAZ)', stueck: 1700, zeit: 1500, schichten: 3, oee: 0.75 });
  geb('G 63', { name: 'Kurbelwellenfertigung', art: 'fertigung', h: 12, roof: shed, facade: halle });
  const rKW = prod('G 63', { typ: 'fertigung', produkt: 'gross', maschine: 'kwdreh', name: 'Kurbelwellen-Dreh-Fräsen', stueck: 1700, zeit: 600, schichten: 3, oee: 0.75 });
  prod('G 63', { typ: 'insel', inseltyp: 'roboterzelle', name: 'Entgraten / Beschriften', stueck: 1700, zeit: 60, schichten: 2, oee: 0.8 });
  geb('G 16', { name: 'Zylinderkopffertigung', art: 'fertigung', h: 9, roof: shed, facade: halle });
  const rZK = prod('G 16', { typ: 'insel', inseltyp: 'zylinderkopf', name: 'Fertigungsinseln Zylinderkopf', stueck: 30000, zeit: 45, schichten: 3, oee: 0.75 });
  geb('G 25/1', { name: 'Pleuelfertigung', art: 'fertigung', h: 9, roof: shed, facade: halle, beleg: 'OpenStreetMap, Gebäudename „G 25/1 Pleuelfertigung“' });
  const rPL = prod('G 25/1', { typ: 'fertigung', produkt: 'pkw', name: 'Pleuel-Bearbeitung', stueck: 30600, zeit: 35, schichten: 3, oee: 0.75 });
  geb('G 36', { name: 'Vormontage Zylinderköpfe', art: 'montage', h: 9, roof: shed, facade: halle });
  const rVM = prod('G 36', { typ: 'insel', inseltyp: 'montageu', name: 'Vormontage Zylinderkopf (U-Zellen)', stueck: 30000, zeit: 40, schichten: 2, oee: 0.85 });
  geb('G 30/2', { name: 'Abnahmeprüffeld I', art: 'pruef', h: 12, facade: halle });
  const rPF1 = prod('G 30/2', { typ: 'pruef', produkt: 'gross', name: 'Abnahmeprüfstände I', stueck: 1700, pruefh: 6, ruesth: 2 });
  geb('G 30/3', { name: 'Abnahmeprüffeld II', art: 'pruef', h: 12, facade: halle });
  const rPF2 = prod('G 30/3', { typ: 'pruef', produkt: 'gross', name: 'Abnahmeprüfstände II (Gas/Sonder)', stueck: 900, pruefh: 6, ruesth: 2 });
  geb('G 30/1', { name: 'Lackiererei', art: 'lack', h: 12, facade: halle });
  const rLack = prod('G 30/1', { typ: 'lackierung', name: 'Lackiererei Großmotoren', stueck: 1700 });
  geb('G 75', { name: 'Entwicklungsprüffeld (F&E)', art: 'pruef', h: 12, beleg: 'OpenStreetMap „G 75 Entwicklungsprüffeld“; mtu-Pressemitteilung 2013: F&E-Prüffeld mit 7 Prüfständen' });
  const rFE = prod('G 75', { typ: 'pruef', produkt: 'gross', name: 'F&E-Prüffeld (7 Prüfstände)', stueck: 3500, pruefh: 6, ruesth: 2 });
  geb('G 29', { name: 'Werkstattfertigung Ersatzteile', art: 'fertigung', h: 9, roof: shed, facade: halle });
  prod('G 29', { typ: 'werkstatt', name: 'Werkstattfertigung (Kleinserien, Ersatzteile)' });
  geb('G 10/2', { name: 'Instandsetzung / Nacharbeit', art: 'fertigung', h: 9 });
  const rNA = prod('G 10/2', { typ: 'werkstatt', name: 'Nacharbeit Motoren', hFraesen: 1500, hDrehen: 1500, hHonen: 1000, hMessen: 1500, hNacharbeit: 8000 });
  geb('G 73', { name: 'Messraum / Qualitätssicherung', art: 'qs', h: 7.5 });
  const rQS = prod('G 73', { typ: 'werkstatt', name: 'Messraum (Koordinatenmessgeräte)', hFraesen: 0, hDrehen: 0, hHonen: 0, hMessen: 12000, hNacharbeit: 0 }, r => { r.use = 'qualitaet'; r.role = 'qualitaet'; });
  geb('G 11', { name: 'Instandhaltung / Betriebswerkstatt', art: 'technik', h: 7.5 });
  prod('G 11', { typ: 'werkstatt', name: 'Instandhaltung', hFraesen: 2000, hDrehen: 2000, hHonen: 0, hMessen: 0, hNacharbeit: 3000 }, r => { r.use = 'instandhaltung'; r.role = 'instandhaltung'; });
  geb('G 60', { name: 'Wareneingang & Lager', art: 'logistik', h: 11 });
  const rWE = prod('G 60', { typ: 'lager', name: 'Wareneingang & Palettenlager', paletten: 1100, klt: 800 }, r => { r.use = 'wareneingang'; r.role = 'wareneingang'; });
  geb('G 12', { name: 'Lager Zukaufteile', art: 'logistik', h: 9 });
  const rLZ = prod('G 12', { typ: 'lager', name: 'Lager Zukaufteile', paletten: 700, klt: 600 });
  geb('G 13', { name: 'Lager Montageteile', art: 'logistik', h: 9 });
  prod('G 13', { typ: 'lager', name: 'Lager Montageteile', paletten: 700, klt: 600 });
  geb('G 41', { name: 'Supermarkt / Bereitstellung Montage', art: 'logistik', h: 9 });
  const rSM = prod('G 41', { typ: 'lager', name: 'Supermarkt (Kommissionierung für die Montage)', paletten: 150, klt: 2400 }, r => { r.use = 'kommissionierung'; r.role = 'kommissionierung'; });
  geb('G 64', { name: 'Versand Motoren', art: 'logistik', h: 11 });
  const rVS = prod('G 64', { typ: 'lager', name: 'Versand / Verpackung', paletten: 260, klt: 200 }, r => { r.use = 'warenausgang'; r.role = 'warenausgang'; });
  geb('G 30/4', { name: 'Rohteillager Guss/Schmiedeteile', art: 'logistik', h: 9 });
  const rRT = prod('G 30/4', { typ: 'lager', name: 'Rohteillager', paletten: 400, klt: 0 });
  geb('G 67', { name: 'Leergut- und Behälterlager', art: 'logistik', h: 7.5 });
  const rLG = prod('G 67', { typ: 'lager', name: 'Leergut', paletten: 500, klt: 600 });
  geb('G 72', { name: 'Werkzeugausgabe / Voreinstellung', art: 'technik', h: 7.5 });
  prod('G 72', { typ: 'lager', name: 'Werkzeuglager', paletten: 60, klt: 900 });
  geb('G 68', { name: 'Betriebsstoffe / Gefahrstofflager', art: 'technik', h: 7.5 });
  const zG = zone('G 68', 'gefahrstoff'); einrichten(zG);
  // Verwaltung, Kantine, Ausbildung
  { const g = geb('Hauptverwaltungsgebäude', { name: 'Hauptverwaltung', art: 'verwaltung', floors: 5, h: 3.6, kurz: 'HV', beleg: 'OpenStreetMap / Adresse Maybachstraße 16' }); if (g) for (let f = 0; f < 5; f++) raster(zone('Hauptverwaltungsgebäude', f ? 'buero' : 'besprechung', f, f ? 'Büro' : 'Empfang / Konferenz'), f ? 'buero.schreibtisch' : 'buero.besprechung', f ? 3.2 : 6, f ? 3.0 : 6, 0, 1.5, 70); }
  { const g = geb('Jean-Raebel-Haus', { name: 'Jean-Raebel-Haus (Büro)', art: 'verwaltung', floors: 4, h: 3.6, kurz: 'JRH', beleg: 'OpenStreetMap, Bürogebäude Maybachplatz 1' }); if (g) for (let f = 0; f < 4; f++) raster(zone('Jean-Raebel-Haus', f ? 'buero' : 'besprechung', f, f ? 'Büro' : 'Empfang'), f ? 'buero.schreibtisch' : 'buero.besprechung', f ? 3.2 : 6, f ? 3.0 : 6, 0, 1.5, 70); }
  { const g = geb('G 42', { name: 'Büro / Arbeitsvorbereitung', art: 'verwaltung', floors: 3, h: 3.6, beleg: 'OpenStreetMap, Gebäude als Büro gekennzeichnet' }); if (g) for (let f = 0; f < 3; f++) raster(zone('G 42', 'buero', f), 'buero.schreibtisch', 3.2, 3.0, 0, 1.2, 60); }
  { const g = geb('Rolls-Royce Solutions - Werkskantine', { name: 'Werkskantine Karl-Maybach-Haus', art: 'sozial', floors: 2, h: 4.2, kurz: 'KMH', beleg: 'OpenStreetMap, Maybachplatz 3' }); if (g) { const z = zone('Rolls-Royce Solutions - Werkskantine', 'sozial', 0, 'Kantine / Speisesaal'); raster(z, 'home.esstisch', 3.4, 3.0, 0, 2.0, 120); zone('Rolls-Royce Solutions - Werkskantine', 'besprechung', 1, 'Konferenz / Casino'); } }
  { const g = geb('MTU Training Center', { name: 'Training Center / Ausbildung', art: 'sozial', h: 7.5, kurz: 'TC', beleg: 'OpenStreetMap „MTU Training Center“; mtu-Pressemitteilung 2019 (Ausbildung in Werk 1)' }); if (g) prod('MTU Training Center', { typ: 'werkstatt', name: 'Ausbildungswerkstatt', hFraesen: 1500, hDrehen: 1500, hHonen: 0, hMessen: 1000, hNacharbeit: 1500, ausl: 0.6 }); }
  geb('Pforte - MTU Friedrichshafen Werk 1', { name: 'Pforte (Haupteingang)', art: 'verwaltung', kurz: 'P1', beleg: 'OpenStreetMap, Maybachplatz 1/1' });
  geb('Pforte West - MTU-Friedrichshafen Werk 1', { name: 'Pforte West', art: 'verwaltung', kurz: 'P2', beleg: 'OpenStreetMap' });
  geb('G 70/1', { name: 'Energiezentrale / Microgrid-Technik', art: 'technik', h: 9, beleg: 'mtu-Pressemitteilung 2019: Microgrid Validation Center in Werk 1 (Lage im Werk angenommen)' });
  const zEZ = zone('G 70/1', 'technik', 0, 'Energiezentrale'); raster(zEZ, 'fab.kompressor', 4, 4, 0, 2, 12);
  // Restflächen der Produktionshallen: Bereitstellung und Puffer
  for (const n of ['G 43', 'G 62', 'G 63', 'G 16', 'G 25/1', 'G 36', 'G 30/1', 'G 30/2', 'G 30/3', 'G 29', 'G 10/2', 'G 73', 'G 11', 'G 75']) {
    const g = B(n); if (!g) continue; const pt = g.parts[0], c = HSS.prodCalc({ typ: 'lager', part: pt.id, floor: 0, paletten: 9, klt: 0 }, prj), A = c.verfuegbar || 0;
    if (A < 250) continue;
    prod(n, { typ: 'lager', name: 'Bereitstellung / Puffer', paletten: Math.min(900, Math.round(A * 0.45 / 7.6) * 9), klt: Math.min(240, Math.round(A / 40) * 24) }, r => { r.use = 'kommissionierung'; r.role = 'kommissionierung'; });
  }
  // übrige Gebäude: Ausstattung nach Größe
  let rest = 0;
  for (const b of prj.buildings) {
    if (b.umgebung || b.funktion) continue; const pt = b.parts[0]; const A = HSS.partArea(pt);
    const use = A > 900 ? 'lager_fab' : A > 160 ? 'instandhaltung' : 'technik', name = { lager_fab: 'Lager / Logistikfläche', instandhaltung: 'Werkstatt / Nebenbetrieb', technik: 'Technik / Versorgung' }[use];
    b.info = `${name} – ${SZEN}`; b.funktion = { art: use, beleg: false }; b.color = use === 'lager_fab' ? FARBE.logistik : FARBE.technik; pt.name = name;
    const n = b.name; const z = zone(n, use, 0, name); if (!z) continue;
    if (use === 'technik') raster(z, A > 60 ? 'fab.kompressor' : 'fab.leitstand', 3.2, 2.6, 0, 0.8, 6); else einrichten(z);
    rest++;
  }
  log.push(`${rest} weitere Gebäude als Lager, Werkstatt oder Technik ausgestattet`);

  /* ---------- 2 · Außenanlagen ---------- */
  const TOR = {}; const out = (lib, x, z, rot = 0, extra = {}) => { const o = Object.assign({ id: U.uid('obj'), lib, x, z, rot }, extra); prj.objects.push(o); if (extra.name) TOR[extra.name] = o.id; return o.id; };
  const ctr = n => { const g = B(n); if (!g) return null; const pt = g.parts[0]; return { pt, bb: HSS.geo.bbox(HSS.partFootprint(pt).outer) }; };
  // Wareneingang G 60: Verladetore an der Westseite (Werkstraße), LKW an der Rampe
  { const c = ctr('G 60'); if (c) { for (let i = 0; i < 4; i++) out('fab.torschleuse', c.bb.x0 - 1.6, c.bb.z0 + 14 + i * 5, 270, { name: 'WE-Tor ' + (i + 1) }); out('fab.sattelzug', c.bb.x0 - 11, c.bb.z0 + 19, 90); out('fab.sattelzug', c.bb.x0 - 11, c.bb.z0 + 29, 90); } }
  // Versand G 64: Tore an der Nordseite, Motorentransport
  { const c = ctr('G 64'); if (c) { for (let i = 0; i < 3; i++) out('fab.torschleuse', c.bb.x0 + 10 + i * 6, c.bb.z0 - 1.6, 180, { name: 'Versandtor ' + (i + 1) }); out('fab.sattelzug', c.bb.x0 + 16, c.bb.z0 - 11, 0); out('pm.gm.motor20v', c.bb.x0 + 30, c.bb.z0 - 6, 0); } }
  // Microgrid Validation Center (OSM: Überdachung am Westrand, x −447…−411, z 0…25): Batteriespeicher, Aggregate
  for (let i = 0; i < 3; i++) out('fab.container40', -443 + i * 4.2, 12.5, 0, { name: 'Batteriespeicher ' + (i + 1) });
  for (let i = 0; i < 2; i++) out('pm.gm.motor20v', -425 + i * 7, 12.5, 90, { name: 'Gas-/Diesel-Aggregat ' + (i + 1) });
  // Wertstoffhof (überdacht) in G 60/1 mit Späne-Kippbehältern
  { const g = geb('G 60/1', { name: 'Wertstoffhof / Späne (überdacht)', art: 'technik', h: 6 }); if (g) raster(zone('G 60/1', 'wertstoff', 0, 'Wertstoffhof'), 'pm.hw.spaene', 3.0, 3.0, 0, 1.2, 30); }
  /* ---------- 3 · Externe Orte und Materialflüsse ---------- */
  HSS.ensureStammdaten(prj);
  const ext = (id, name, x, z, km) => prj.places.push({ id, name, role: 'extern', x, z, anfahrtM: km * 1000 });
  ext('ext_mwz', 'Materialwirtschaftszentrum Kluftern (Logistikdienstleister)', -470, 40, 8);
  ext('ext_guss', 'Gießerei / Schmiede (Rohteile)', -40, -245, 120);
  ext('ext_werk2', 'Werk 2 Manzell (Montage Baureihe 4000, Lackiererei)', -470, 130, 4);
  ext('ext_kunde', 'Kunden / Versand (Straße, Bahn, Hafen)', 250, 210, 50);
  if (!prj.transports.find(t => t.id === 't_schwer')) prj.transports.push({ id: 't_schwer', name: 'Schwerlast-FTS / Motorentransporter', mittel: 'schlepper', anzahl: 6, kapazitaet: 1, schicht: [6, 22], buendeln: false });
  const M = (id, name, farbe, einheit, pl = 1) => { if (!prj.materials.find(m => m.id === id)) prj.materials.push({ id, name, reinheit: 'rein', farbe, einheit, proLadung: pl, ladeMin: 5, entladeMin: 5, buendelbar: pl > 1 }); };
  M('m_motor', 'Motor (Großmotor, 9–12 t)', '#891F5E', 'Motoren'); M('m_kg', 'Kurbelgehäuse', '#144477', 'Teile'); M('m_kw', 'Kurbelwellen', '#2D7694', 'Teile', 2); M('m_zk', 'Zylinderköpfe', '#7b5ea7', 'Gestelle', 1); M('m_pleuel', 'Pleuel', '#0A967A', 'Gestelle', 1); M('m_rohguss', 'Rohguss / Schmiedeteile', '#8d6e63', 'Teile', 1);
  { const pm = prj.materials.find(m => m.id === 'm_proben'); if (pm) pm.name = 'Prüfmuster (Qualität)'; }
  const id = r => r?.id;
  const F = (name, material, von, nach, menge, transport, fenster = [[6, 22]]) => { if (!von || !nach) { miss.push('Fluss ' + name); return; } prj.flows.push({ id: U.uid('flow'), name, material, von, nach, menge, periode: 'tag', betriebstage: 5, fenster, transport, fahrzeitMin: null, rueck: false, aktiv: true }); };
  const motTag = Math.round(1700 / 230 * 10) / 10; // ≈ 7,4 Motoren je Arbeitstag
  F('Anlieferung Zukaufteile aus dem MWZ Kluftern', 'm_lkw', 'ext_mwz', TOR['WE-Tor 1'], 14, 't_lkw', [[5.5, 15]]);
  F('Entladen Rampe → Wareneingang', 'm_roh', TOR['WE-Tor 1'], id(rWE), 180, 't_stapler', [[5.5, 16]]);
  F('Anlieferung Rohguss Kurbelgehäuse / Schmiedeteile', 'm_lkw', 'ext_guss', TOR['WE-Tor 3'], 3, 't_lkw', [[7, 14]]);
  F('Rohguss Rampe → Rohteillager', 'm_rohguss', TOR['WE-Tor 3'], id(rRT), 9, 't_stapler', [[7, 15]]);
  F('Einlagerung Wareneingang → Lager Zukaufteile', 'm_roh', id(rWE), id(rLZ), 160, 't_stapler');
  F('Lager → Supermarkt Montage', 'm_roh', id(rLZ), id(rSM), 120, 't_routenzug');
  F('Supermarkt → Montagelinie (Warenkörbe je Takt)', 'm_klt', id(rSM), id(rMontage), 420, 't_routenzug', [[5.5, 21.5]]);
  F('Rohteile → Kurbelgehäusefertigung', 'm_rohguss', id(rRT), id(rKG), motTag, 't_schwer');
  F('Rohteile → Kurbelwellenfertigung', 'm_rohguss', id(rRT), id(rKW), motTag, 't_stapler');
  F('Kurbelgehäuse fertig → Montage', 'm_kg', id(rKG), id(rMontage), motTag, 't_schwer');
  F('Kurbelgehäuse für Werk 2 → Versandtor', 'm_kg', id(rKG), TOR['Versandtor 3'], 2, 't_schwer', [[8, 15]]);
  F('Kurbelgehäuse an Werk 2 (Montage Baureihe 4000)', 'm_lkw', TOR['Versandtor 3'], 'ext_werk2', 1, 't_lkw', [[14, 16]]);
  F('Kurbelwellen fertig → Montage', 'm_kw', id(rKW), id(rMontage), motTag, 't_stapler');
  F('Zylinderköpfe → Vormontage', 'm_zk', id(rZK), id(rVM), 22, 't_routenzug');
  F('Zylinderköpfe vormontiert → Montage', 'm_zk', id(rVM), id(rMontage), 22, 't_routenzug');
  F('Pleuel → Montage', 'm_pleuel', id(rPL), id(rMontage), 12, 't_routenzug');
  F('Motor montiert → Abnahmeprüffeld I', 'm_motor', id(rMontage), id(rPF1), motTag, 't_schwer');
  F('Motor montiert → Abnahmeprüffeld II', 'm_motor', id(rMontage), id(rPF2), 2.5, 't_schwer');
  F('Versuchsmotoren → Entwicklungsprüffeld', 'm_motor', id(rMontage), id(rFE), 1, 't_schwer', [[8, 15]]);
  F('Motor geprüft → Lackiererei', 'm_motor', id(rPF1), id(rLack), motTag, 't_schwer');
  F('Motor geprüft (II) → Lackiererei', 'm_motor', id(rPF2), id(rLack), 2.5, 't_schwer');
  F('Nacharbeit aus dem Prüffeld', 'm_motor', id(rPF1), id(rNA), 0.6, 't_schwer');
  F('Motor lackiert → Versand', 'm_motor', id(rLack), id(rVS), motTag, 't_schwer');
  F('Verladung Motoren am Versandtor', 'm_motor', id(rVS), TOR['Versandtor 1'], motTag, 't_schwer', [[8, 17]]);
  F('Versand an Kunden (Schwertransport)', 'm_lkw', TOR['Versandtor 1'], 'ext_kunde', motTag, 't_lkw', [[9, 18]]);
  F('Prüfmuster → Messraum', 'm_proben', id(rKG), id(rQS), 24, 't_hand');
  F('Prüfmuster Zylinderköpfe → Messraum', 'm_proben', id(rZK), id(rQS), 30, 't_hand');
  const wst = Object.values(prj.interiors).flatMap(I => Object.values(I)).flatMap(I => I.rooms).find(r => r.use === 'wertstoff')?.id;
  F('Späne Kurbelgehäusefertigung → Wertstoffhof', 'm_spaene', id(rKG), wst, 8, 't_stapler', [[8, 9], [13, 14], [20, 21]]);
  F('Späne Kurbelwellen → Wertstoffhof', 'm_spaene', id(rKW), wst, 5, 't_stapler', [[8, 9], [13, 14], [20, 21]]);
  F('Leergut Montage → Leergutlager', 'm_leergut', id(rMontage), id(rLG), 260, 't_routenzug');

  /* ---------- 4 · Projektangaben ---------- */
  prj.meta.name = 'Rolls-Royce Power Systems – Werk 1 Friedrichshafen (Planungsmodell)';
  prj.meta.notes = [
    'Planungsmodell auf Basis öffentlich verfügbarer Informationen. Grundrisse aller Gebäude aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0); Gebäudehöhen angenommen.',
    'BELEGT: Hauptverwaltung (Maybachstraße 16), Jean-Raebel-Haus, Werkskantine Karl-Maybach-Haus, MTU Training Center/Ausbildung, G 25/1 Pleuelfertigung, G 75 Entwicklungsprüffeld (F&E-Prüffeld mit 7 Prüfständen, 2013–2015), Microgrid Validation Center (2019), Pforten. Montage der Baureihe 4000 und Lackiererei befinden sich laut Unternehmen in Werk 2 (Manzell); Materialwirtschaftszentrum in Kluftern.',
    'PLANUNGSSZENARIO (Annahme): Belegung aller übrigen Hallen (Montage Großmotoren, Kurbelgehäuse-, Kurbelwellen-, Zylinderkopffertigung, Prüffelder, Lackiererei, Logistik), Stückzahlen (1.700 Motoren/Jahr ≈ Mittelwert aus „26.000 Motoren der Baureihe 4000 in 15 Jahren“), Zeiten und Materialflüsse – als Beispiel für die angekündigte Neuaufstellung von Werk 1 und 2 (Pressemitteilung 02.03.2026). Keine Angaben des Unternehmens.',
    'Quellen: rolls-royce.com Pressemitteilungen 2019–2026, mtu-solutions.com Pressemitteilungen 2001–2019, Schwäbische Zeitung 2021–2026, OpenStreetMap Relation 13871377.'
  ].join('\n');
  prj.meta.ort = { name: 'Friedrichshafen, Maybachplatz 1', lat: 47.6583, lon: 9.4702 };
  return { miss, log, flows: prj.flows.length, objects: prj.objects.length };
})()
