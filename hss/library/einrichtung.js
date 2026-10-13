/* HSS-Bibliothekspaket · Raumausstattung: Objekte, mit denen der Planer Stationsräume vollständig einrichtet
   (Pflegearbeitsräume rein/unrein, Medikamentenraum, Dienst- und Aufenthaltsräume, Pflegebad, Putzraum).
   Maße nach Herstellerangaben bzw. üblichen Rastermaßen; Vorderseite = +z, Wandobjekte mit Rückseite bei −z. */
(function (K) {
const W = '#eef1f4', G = '#c3c9d0', DG = '#5a6573', NV = '#144477', PE = '#2D7694', GR = '#0A967A', WOOD = '#c9a77c';
const chair = (c = PE, x = 0, z = 0, ry = 0) => [...K.legs(0.44, 0.44, 0.45, 0.012, '#9aa1aa', 0.03), K.box(0, 0.46, 0, 0.46, 0.05, 0.44, c, 'stoff', { rr: 0.02 }), K.box(0, 0.74, -0.21, 0.44, 0.48, 0.04, c, 'stoff', { rr: 0.02 })]
  .map(p => { const a = ry * Math.PI / 180, c0 = Math.cos(a), s0 = Math.sin(a); const [px, py, pz] = p.p; return Object.assign({}, p, { p: [x + px * c0 + pz * s0, py, z - px * s0 + pz * c0], ry: (p.ry || 0) + ry }); });
const tableT = (w, d, h = 0.75, c = '#e8e2d6') => [...K.legs(w, d, h - 0.03, 0.022, '#9aa1aa', 0.06), K.box(0, h - 0.015, 0, w, 0.03, d, c, 'holz')];
const books = (w, y, d) => { const out = []; let x = -w / 2 + 0.03; const cols = ['#2D7694', '#c0392b', '#e9b949', '#0A967A', '#7b5cc4', '#d9d4c7']; let i = 0; while (x < w / 2 - 0.06) { const bw = 0.03 + (i * 37 % 5) * 0.008, bh = 0.2 + (i * 13 % 4) * 0.025; out.push(K.box(x + bw / 2, y + bh / 2, 0, bw, bh, d * 0.8, cols[i % cols.length], 'matt')); x += bw + 0.004; i++; } return out; };

HSS.library.registerPack({ format: 'hss-library', version: 1, name: 'Raumausstattung', objects: [
  /* Patientenzimmer */
  { id: 'stat.tv', name: 'Patienten-TV am Schwenkarm', category: 'Stationsausstattung/Patientenzimmer', tags: ['Patientenzimmer', 'Multimedia'], anchor: 'wand', size: { w: 0.7, d: 0.4, h: 2.0 },
    parts: [K.box(0, 1.85, -0.17, 0.12, 0.2, 0.05, G, 'metall'), K.box(0, 1.85, -0.05, 0.05, 0.05, 0.22, G, 'chrom'), K.box(0, 1.78, 0.08, 0.62, 0.38, 0.05, '#2b3138', 'kunststoff'), K.box(0, 1.78, 0.106, 0.58, 0.33, 0.005, '#14324f', 'bildschirm')] },
  { id: 'stat.vorhang', name: 'Sichtschutzvorhang mit Deckenschiene', category: 'Stationsausstattung/Patientenzimmer', tags: ['Patientenzimmer', 'Intimsphäre'], anchor: 'decke', size: { w: 2.2, d: 0.12, h: 2.6 },
    parts: [K.box(0, 2.58, 0, 2.2, 0.03, 0.05, G, 'metall'), ...Array.from({ length: 9 }, (_, i) => K.box(-0.9 + i * 0.225, 1.55, (i % 2 ? 0.03 : -0.03), 0.23, 1.9, 0.02, i % 3 ? '#cfe3dc' : '#bcd8cf', 'stoff'))] },
  { id: 'stat.garderobe', name: 'Garderobe mit Hutablage', category: 'Stationsausstattung/Möbel', tags: ['Garderobe'], anchor: 'wand', size: { w: 1.0, d: 0.35, h: 1.9 },
    parts: [K.box(0, 1.75, -0.02, 1.0, 0.025, 0.3, WOOD, 'holz'), K.box(0, 1.55, -0.15, 1.0, 0.08, 0.02, WOOD, 'holz'), ...[-0.35, -0.12, 0.12, 0.35].map(x => K.cyl(x, 1.52, -0.08, 0.012, 0.12, G, 'chrom', { ax: 'z' })), K.box(-0.35, 1.15, -0.05, 0.4, 0.7, 0.14, '#2b4a6b', 'stoff', { rr: 0.05 }), K.box(0.12, 1.2, -0.05, 0.36, 0.6, 0.12, '#8a6d55', 'stoff', { rr: 0.05 })] },
  { id: 'stat.bild', name: 'Wandbild', category: 'Stationsausstattung/Möbel', tags: ['Deko', 'Beauty Shot'], anchor: 'wand', size: { w: 0.9, d: 0.04, h: 1.95 },
    parts: [K.box(0, 1.55, 0, 0.9, 0.65, 0.03, '#f4f1ea', 'lack'), K.box(-0.12, 1.5, 0.017, 0.45, 0.4, 0.004, '#8fb9a8', 'matt'), K.box(0.15, 1.62, 0.018, 0.35, 0.28, 0.004, '#2D7694', 'matt'), K.box(0, 1.4, 0.019, 0.7, 0.06, 0.004, '#e9b949', 'matt')] },
  { id: 'stat.sessel', name: 'Polstersessel', category: 'Büro & Wartebereich/Wartebereich', tags: ['Aufenthalt', 'Sessel'], size: { w: 0.78, d: 0.8, h: 0.85 },
    parts: [K.box(0, 0.22, 0, 0.74, 0.28, 0.74, '#6b7f95', 'stoff', { rr: 0.06 }), K.box(0, 0.6, -0.3, 0.74, 0.5, 0.16, '#6b7f95', 'stoff', { rr: 0.06 }), ...[-1, 1].map(s => K.box(s * 0.31, 0.45, 0.02, 0.12, 0.22, 0.7, '#6b7f95', 'stoff', { rr: 0.05 })), ...K.legs(0.6, 0.6, 0.08, 0.015, '#3b3f45', 0.05)] },
  { id: 'stat.tisch4', name: 'Tisch mit 4 Stühlen', category: 'Büro & Wartebereich/Wartebereich', tags: ['Aufenthalt', 'Personal', 'Tagesraum'], size: { w: 1.7, d: 1.7, h: 0.9 },
    parts: [...tableT(1.2, 0.8), ...chair('#4f7da3', -0.3, -0.62, 0), ...chair('#4f7da3', 0.3, -0.62, 0), ...chair('#4f7da3', -0.3, 0.62, 180), ...chair('#4f7da3', 0.3, 0.62, 180)] },
  { id: 'stat.buecherregal', name: 'Bücher- und Spieleregal', category: 'Büro & Wartebereich/Wartebereich', tags: ['Aufenthalt', 'Tagesraum'], size: { w: 1.0, d: 0.35, h: 1.9 },
    parts: [K.box(0, 0.95, -0.15, 1.0, 1.9, 0.03, WOOD, 'holz'), ...[-0.49, 0.49].map(x => K.box(x, 0.95, 0, 0.025, 1.9, 0.33, WOOD, 'holz')), ...[0.05, 0.5, 0.95, 1.4, 1.88].map(y => K.box(0, y, 0, 1.0, 0.025, 0.33, WOOD, 'holz')), ...books(0.95, 0.07, 0.3), ...books(0.95, 0.52, 0.3), ...books(0.95, 0.97, 0.3), ...books(0.95, 1.42, 0.3)] },
  { id: 'stat.spind', name: 'Personalspind (2 Abteile)', category: 'Stationsausstattung/Möbel', tags: ['Personal', 'Umkleide'], size: { w: 0.8, d: 0.5, h: 1.8 }, parts: K.cabinet(0.8, 0.5, 1.8, '#d5dbe1', { doors: 2, front: '#2D7694' }) },
  /* Dienstraum, Stützpunkt, Büro */
  { id: 'stat.whiteboard', name: 'Belegungstafel / Whiteboard', category: 'Stationsausstattung/Stützpunkt', tags: ['Stützpunkt', 'Besprechung'], anchor: 'wand', size: { w: 1.8, d: 0.06, h: 2.0 },
    parts: [K.box(0, 1.45, 0, 1.8, 0.95, 0.025, '#ffffff', 'lack'), K.box(0, 0.96, 0.02, 1.8, 0.03, 0.06, G, 'metall'), ...Array.from({ length: 6 }, (_, i) => K.box(-0.7 + (i % 3) * 0.5, 1.7 - Math.floor(i / 3) * 0.35, 0.015, 0.4, 0.06, 0.003, i % 2 ? '#2D7694' : '#c0392b', 'matt'))] },
  { id: 'stat.drucker', name: 'Multifunktionsdrucker', category: 'Büro & Wartebereich/Arbeitsplatz', tags: ['Büro', 'Stützpunkt'], size: { w: 0.6, d: 0.65, h: 1.15 },
    parts: [K.box(0, 0.3, 0, 0.58, 0.6, 0.6, '#d9dde2', 'kunststoff', { rr: 0.02 }), K.box(0, 0.85, 0, 0.6, 0.5, 0.62, '#eef1f4', 'kunststoff', { rr: 0.03 }), K.box(0.15, 1.12, 0.18, 0.2, 0.04, 0.12, '#2b3138', 'bildschirm')] },
  { id: 'stat.btm.tresor', name: 'BtM-Tresor (Betäubungsmittel)', category: 'Stationsausstattung/Arbeitsraum rein', tags: ['Arzneimittel', 'BtM', 'Sicherheit'], size: { w: 0.55, d: 0.5, h: 1.0 },
    parts: [K.box(0, 0.5, 0, 0.55, 1.0, 0.5, '#7d858f', 'metall', { rr: 0.01 }), K.box(0, 0.5, 0.252, 0.47, 0.92, 0.01, '#8d959f', 'metall'), K.cyl(0.15, 0.6, 0.27, 0.035, 0.03, G, 'chrom', { ax: 'z' }), K.box(-0.12, 0.62, 0.262, 0.08, 0.12, 0.01, '#2b3138', 'bildschirm')], meta: { quelle: 'BtMVV § 15: Aufbewahrung gegen unbefugte Entnahme gesichert (Wertschutzschrank)' } },
  { id: 'med.zentralmonitor', name: 'Zentrale Überwachung (Monitorarbeitsplatz)', category: 'Medizintechnik/Intensiv & Überwachung', tags: ['Intensiv', 'IMC', 'Stützpunkt'], size: { w: 1.8, d: 0.8, h: 1.5 },
    parts: [...tableT(1.8, 0.8, 0.74, '#e8e2d6'), ...[-0.55, 0, 0.55].flatMap(x => K.screen(x, 1.15, -0.25, 0.5, 0.32)), K.pole(-0.55, -0.3, 1.0, 0.015), K.pole(0.55, -0.3, 1.0, 0.015)] },
  { id: 'med.pumpenregal', name: 'Geräteregal mit Infusions- und Spritzenpumpen', category: 'Medizintechnik/Intensiv & Überwachung', tags: ['Geräteraum', 'Infusion'], size: { w: 1.0, d: 0.5, h: 1.9 },
    parts: [...K.shelf(1.0, 0.5, 1.9, 5, '#c8ced5', null), ...[0.12, 0.56, 1.0, 1.44].flatMap(y => [-0.3, 0, 0.3].map(x => K.box(x, y + 0.11, 0.02, 0.22, 0.17, 0.25, '#f4f6f8', 'kunststoff', { rr: 0.02 })))] },
  { id: 'med.untersuchungsleuchte', name: 'Untersuchungsleuchte (Stativ)', category: 'Medizintechnik/Diagnostik', tags: ['Untersuchung', 'Ambulanz'], size: { w: 0.55, d: 0.55, h: 1.8 },
    parts: [K.cyl(0, 0.05, 0, 0.27, 0.04, DG, 'kunststoff', { seg: 5 }), K.pole(0, 0, 1.4, 0.015), K.box(0, 1.45, 0.15, 0.04, 0.04, 0.35, G, 'chrom'), K.cyl(0, 1.5, 0.32, 0.08, 0.06, W, 'lack'), K.cyl(0, 1.47, 0.32, 0.06, 0.005, '#fffbe6', 'leucht')] },
  { id: 'med.instrumentenschrank', name: 'Instrumenten- und Materialschrank (Glas)', category: 'Medizintechnik/Diagnostik', tags: ['Untersuchung', 'Behandlung'], size: { w: 0.8, d: 0.45, h: 1.9 },
    parts: [K.box(0, 0.95, 0, 0.8, 1.9, 0.45, W, 'lack'), K.box(0, 1.3, 0.23, 0.74, 1.05, 0.01, '#dff1f7', 'glas', { o: 0.35 }), ...[0.95, 1.3, 1.65].map(y => K.box(0, y, 0, 0.74, 0.015, 0.4, '#dfe4e9', 'glas')), K.box(0, 0.4, 0.23, 0.74, 0.7, 0.01, '#e4e8ec', 'lack')] },
  { id: 'med.duschliege', name: 'Duschliege (höhenverstellbar)', category: 'Stationsausstattung/Sanitär', tags: ['Pflegebad'], size: { w: 0.75, d: 1.95, h: 0.85 },
    parts: [K.box(0, 0.35, 0, 0.12, 0.5, 0.12, G, 'chrom'), K.box(0, 0.12, 0, 0.6, 0.08, 1.2, G, 'metall'), K.box(0, 0.68, 0, 0.72, 0.12, 1.9, '#5b8fb9', 'kunststoff', { rr: 0.05 }), K.box(0, 0.78, 0, 0.74, 0.08, 1.92, '#4c7ea6', 'kunststoff', { rr: 0.04 }), ...K.casters(0.6, 1.3, 0.05)] },
  { id: 'med.paravent', name: 'Paravent (3-teilig)', category: 'Medizintechnik/Diagnostik', tags: ['Untersuchung', 'Intimsphäre'], size: { w: 1.6, d: 0.45, h: 1.75 },
    parts: [-0.52, 0, 0.52].flatMap((x, i) => [K.box(x, 0.95, i === 1 ? 0.12 : 0, 0.5, 1.5, 0.02, '#d9ebe4', 'stoff'), K.pole(x - 0.25, i === 1 ? 0.12 : 0, 1.72, 0.012), K.pole(x + 0.25, i === 1 ? 0.12 : 0, 1.72, 0.012)]) },
  /* Hygiene, Entsorgung, Reinigung */
  { id: 'hyg.ausguss', name: 'Ausgussbecken mit Klappgitter', category: 'Stationsausstattung/Arbeitsraum unrein', tags: ['Unrein', 'Putzraum', 'Hygiene'], anchor: 'wand', size: { w: 0.6, d: 0.5, h: 1.2 },
    parts: [K.box(0, 0.55, 0, 0.6, 0.35, 0.5, '#e9edf0', 'chrom', { rr: 0.04 }), K.box(0, 0.75, 0.02, 0.5, 0.02, 0.4, G, 'chrom'), K.box(0, 0.2, -0.15, 0.25, 0.4, 0.18, '#e9edf0', 'lack'), K.cyl(0, 1.05, -0.18, 0.02, 0.25, G, 'chrom')] },
  { id: 'hyg.abtropfregal', name: 'Abtropfregal für Steckbecken und Urinflaschen', category: 'Stationsausstattung/Arbeitsraum unrein', tags: ['Unrein', 'Hygiene'], anchor: 'wand', size: { w: 0.8, d: 0.32, h: 1.9 },
    parts: [...[1.1, 1.45, 1.8].map(y => K.box(0, y, -0.02, 0.8, 0.02, 0.28, G, 'chrom')), ...[1.18, 1.53].flatMap(y => [-0.25, 0, 0.25].map(x => K.box(x, y, 0, 0.2, 0.12, 0.24, '#f4f6f8', 'kunststoff', { rr: 0.04 })))] },
  { id: 'hyg.handwaschbecken', name: 'Handwaschplatz mit Seifen-, Desinfektions- und Papierspender', category: 'Stationsausstattung/Hygiene', tags: ['Hygiene', 'KRINKO'], anchor: 'wand', size: { w: 0.9, d: 0.45, h: 1.7 },
    parts: [K.box(0, 0.83, 0, 0.55, 0.14, 0.45, '#ffffff', 'lack', { rr: 0.04 }), K.cyl(0, 0.98, -0.15, 0.015, 0.18, G, 'chrom'), K.box(-0.38, 1.25, -0.14, 0.11, 0.26, 0.11, '#ffffff', 'kunststoff', { rr: 0.02 }), K.box(0.38, 1.3, -0.12, 0.26, 0.34, 0.13, '#ffffff', 'kunststoff', { rr: 0.02 }), K.box(0, 1.35, -0.215, 0.5, 0.6, 0.01, '#dfeef5', 'glas')],
    meta: { quelle: 'KRINKO: Händehygiene in Einrichtungen des Gesundheitswesens (2016) – Waschplätze mit Spendern für Seife, Desinfektionsmittel und Einmalhandtücher' } },
  { id: 'hyg.reinigungswagen', name: 'Reinigungswagen (Unterhaltsreinigung)', category: 'Stationsausstattung/Hygiene', tags: ['Reinigung', 'Putzraum'], size: { w: 1.1, d: 0.6, h: 1.1 },
    parts: [K.box(0, 0.55, -0.1, 0.5, 0.9, 0.4, '#e9edf0', 'kunststoff', { rr: 0.02 }), K.box(0.38, 0.3, 0.02, 0.3, 0.35, 0.4, '#2D7694', 'kunststoff', { rr: 0.03 }), K.box(-0.38, 0.3, 0.02, 0.3, 0.35, 0.4, '#c0392b', 'kunststoff', { rr: 0.03 }), K.box(-0.38, 0.75, 0, 0.32, 0.5, 0.02, '#f2c94c', 'kunststoff'), K.cyl(0.42, 0.95, -0.2, 0.012, 1.0, G, 'metall'), ...K.casters(0.95, 0.5, 0.04)] },
  /* Küche */
  { id: 'kueche.kuehlschrank', name: 'Kühlschrank (Hochschrank)', category: 'Büro & Wartebereich/Teeküche', tags: ['Teeküche', 'Kühlkette'], size: { w: 0.6, d: 0.65, h: 1.85 },
    parts: [K.box(0, 0.93, 0, 0.6, 1.85, 0.62, '#f4f6f8', 'lack', { rr: 0.02 }), K.box(0, 1.35, 0.315, 0.58, 0.005, 0.01, G, 'metall'), K.box(0.24, 1.0, 0.33, 0.02, 0.5, 0.03, G, 'chrom')] },
  { id: 'kueche.kaffee', name: 'Kaffeevollautomat auf Unterschrank', category: 'Büro & Wartebereich/Teeküche', tags: ['Teeküche', 'Personal'], size: { w: 0.6, d: 0.6, h: 1.3 },
    parts: [...K.cabinet(0.6, 0.58, 0.9, '#f1ede6'), K.box(0, 1.1, 0, 0.32, 0.4, 0.42, '#2b3138', 'kunststoff', { rr: 0.03 }), K.box(0, 1.2, 0.215, 0.12, 0.08, 0.005, '#1f6f4f', 'bildschirm')] }
] });
})(HSS.library.kit);
