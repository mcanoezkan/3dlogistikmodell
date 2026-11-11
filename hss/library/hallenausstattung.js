/* HSS-Bibliothekspaket · Hallenausstattung & Intralogistik (Fabric Planning Suite)
   Elemente, mit denen eine Produktionshalle belebt und vollständig ausgestattet wird:
     Intralogistik   Gabelstapler mit Last, Routenzug (Schlepper + 3 Anhänger), Unterfahr-FTS mit
                     KLT-Regal, Schwerlast-FTS mit Großmotor, FTS-Ladestation, Hängebahn-Gehänge
     Personen        Werker mit KLT, Logistiker mit Kommissionierwagen, Werker zu Fuß
     Hallenausstattung  Hallenleuchte, Gehweg-Schutzgeländer, Verkehrsspiegel, Fluchtwegschild,
                     Erste-Hilfe-Station mit Augendusche, Abfalltrennstation, Palettenstapel,
                     Bereitstellplatz mit Palette, Pausenzone, Teamtafel, Wasserspender, Spinde
   Maße nach typischen Herstellerangaben gerundet. Alle Fahrzeuge zeigen mit der Front nach +z
   (Fahrtrichtung), damit die Animation sie entlang ihrer Wege ausrichten kann. */
(function (K) {
const GE = '#f2c94c', OR = '#f2994a', DG = '#3b4450', AN = '#59636e', ST = '#8d969f', AL = '#c3c9d0', BL = '#2d7694', GR = '#0A967A', RT = '#c0392b', WS = '#eef1f4', HO = '#c9a77c', KLT = '#2d7694';

/* ---------- Hilfen ---------- */
// Person ohne schwingende Arme (Arme werden passend zur Tätigkeit ergänzt)
const koerper = (o = {}) => { const h = o.h || 1.76, s = h / 1.75, sh = 1.42 * s; return { s, sh, P: K.person(Object.assign({ legs: '#2b3a4a' }, o)).filter(p => !(p.piv && Math.abs(p.piv[1] - sh) < 1e-6)) }; };
const armVor = (s, sh, sx, c, z = 0.22, y = 1.08) => [K.cap(sx * 0.2 * s, (sh + y * s) / 2, z / 2, 0.045 * s, 0.42 * s, c, 'stoff', { rx: -50 }), K.sph(sx * 0.18 * s, y * s, z * s, 0.045 * s, '#e0b896', 'matt')];
const kltBox = (x, y, z, c = KLT, w = 0.6, d = 0.4, h = 0.28, a = 0) => [K.box(x, y + h / 2, z, w, h, d, c, 'kunststoff', { rr: 0.01, ry: a }), K.box(x, y + h - 0.02, z, w - 0.06, 0.02, d - 0.06, '#1f4f66', 'kunststoff', { ry: a })];
const palette = (x, y, z, a = 0) => [K.box(x, y + 0.072, z, 1.2, 0.144, 0.8, '#b08f63', 'holz', { ry: a })];
const ladung = (x, y, z, n = 2, c = '#d9bf98', a = 0) => { const P = palette(x, y, z, a); for (let i = 0; i < n; i++) P.push(K.box(x, y + 0.144 + 0.3 + i * 0.6, z, 1.16, 0.58, 0.76, i % 2 ? '#c9a77c' : c, 'stoff', { ry: a })); return P; };
const raeder = (w, l, r = 0.12, y = r) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].flatMap(([sx, sz]) => [K.cyl(sx * (w / 2 - 0.06), y, sz * (l / 2 - 0.25), r, 0.1, '#1f2328', 'gummi', { ax: 'x' })]);

/* ---------- Gabelstapler mit Last (Front +z: Gabeln vorn) ---------- */
const stapler = (last = true) => {
  const P = [
    K.box(0, 0.55, -0.3, 1.1, 0.7, 1.9, OR, 'lack', { rr: 0.06 }), K.box(0, 1.15, 0.0, 1.0, 0.5, 0.9, OR, 'lack', { rr: 0.05 }),
    K.box(0, 0.62, -1.15, 1.05, 0.55, 0.35, '#2b3138', 'metall'),                                           // Gegengewicht
    ...[-1, 1].map(s => K.box(s * 0.45, 1.55, -0.05, 0.05, 1.3, 0.05, DG, 'metall')), K.box(0, 2.2, -0.15, 1.05, 0.05, 1.2, DG, 'metall'),
    K.box(0, 1.25, 0.75, 0.9, 2.3, 0.1, DG, 'metall'), ...[-1, 1].map(s => K.box(s * 0.3, 0.18, 1.3, 0.12, 0.05, 1.15, '#3b3f45', 'metall')),
    K.box(0, 0.95, -0.4, 0.45, 0.1, 0.45, '#2b3138', 'kunststoff'), K.cyl(0, 2.3, -0.4, 0.05, 0.08, OR, 'leucht'),
    ...[-1, 1].flatMap(s => [...K.wheel(s * 0.5, 0.25, 0.35, 0.25, 0.2), ...K.wheel(s * 0.5, 0.22, -1.05, 0.22, 0.18)])
  ];
  // Fahrer
  const f = koerper({ top: '#3d5a80', vest: OR, cap: GE, h: 1.72 });
  for (const p of f.P) { if (p.p[1] < 0.95) continue; P.push(Object.assign({}, p, { p: [p.p[0], p.p[1] + 0.1, p.p[2] - 0.35], piv: undefined, sw: undefined })); }
  if (last) P.push(...ladung(0, 0.2, 1.4, 2));
  return P;
};

/* ---------- Routenzug: Schlepper + 3 E-Rahmen-Anhänger mit KLT (Front +z) ---------- */
const routenzug = () => {
  const P = [K.box(0, 0.55, 3.6, 1.0, 0.75, 1.6, BL, 'lack', { rr: 0.06 }), K.box(0, 1.15, 3.3, 0.9, 0.06, 0.9, DG, 'metall'), K.box(0, 1.45, 3.75, 0.9, 0.6, 0.04, '#9fc4d8', 'glas'), K.cyl(0, 1.95, 3.3, 0.05, 0.08, OR, 'leucht'), ...raeder(1.0, 1.6, 0.2).map(p => Object.assign(p, { p: [p.p[0], p.p[1], p.p[2] + 3.6] }))];
  const f = koerper({ top: '#3d5a80', vest: OR, h: 1.72 });
  for (const p of f.P) { if (p.p[1] < 0.95) continue; P.push(Object.assign({}, p, { p: [p.p[0], p.p[1] - 0.05, p.p[2] + 3.15], piv: undefined, sw: undefined })); }
  for (let k = 0; k < 3; k++) {
    const z = 1.6 - k * 2.2;
    P.push(K.box(0, 0.28, z, 1.0, 0.08, 1.8, AN, 'metall'), K.box(0, 0.6, z, 0.06, 0.6, 1.8, GE, 'lack'), K.box(0, 0.32, z + 1.0, 0.08, 0.06, 0.4, DG, 'metall'));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(...kltBox(sx * 0.25, 0.32, z + sz * 0.45, k === 1 ? OR : KLT, 0.4, 0.6, 0.28));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(...kltBox(sx * 0.25, 0.62, z + sz * 0.45, k === 1 ? OR : KLT, 0.4, 0.6, 0.24));
    P.push(...raeder(1.0, 1.8, 0.1).map(p => Object.assign(p, { p: [p.p[0], p.p[1], p.p[2] + z] })));
  }
  return P;
};

/* ---------- FTS ---------- */
const ftsKlt = () => {
  const P = [K.box(0, 0.16, 0, 0.9, 0.24, 1.3, WS, 'lack', { rr: 0.05 }), K.box(0, 0.2, 0.66, 0.7, 0.05, 0.01, GR, 'leucht'), K.box(0, 0.2, -0.66, 0.7, 0.05, 0.01, RT, 'leucht'),
    K.cyl(0.36, 0.33, 0.55, 0.05, 0.05, '#2b3138', 'kunststoff'), K.box(0, 0.29, 0, 0.6, 0.04, 0.6, DG, 'metall')];
  // Regalwagen mit Kleinladungsträgern auf dem FTS
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(K.box(sx * 0.42, 0.95, sz * 0.58, 0.04, 1.3, 0.04, AL, 'metall'));
  [0.42, 0.9, 1.38].forEach((y, i) => { P.push(K.box(0, y, 0, 0.88, 0.03, 1.2, '#9aa1aa', 'metall')); for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(...kltBox(sx * 0.21, y + 0.02, sz * 0.3, i === 1 ? OR : KLT, 0.4, 0.58, 0.26)); });
  return P;
};
const ftsMotor = () => {
  const P = [K.box(0, 0.22, 0, 2.3, 0.4, 4.6, '#e0b334', 'lack', { rr: 0.06 }), K.box(0, 0.43, 0, 2.1, 0.04, 4.4, '#3b4450', 'metall'),
    K.box(0, 0.25, 2.32, 2.0, 0.2, 0.04, GR, 'leucht'), K.box(0, 0.25, -2.32, 2.0, 0.2, 0.04, RT, 'leucht'),
    K.box(0, 0.68, -1.2, 1.3, 0.5, 0.5, AN, 'metall'), K.box(0, 0.68, 1.2, 1.3, 0.5, 0.5, AN, 'metall')];
  // Großmotor (V-Motor, vereinfacht) längs auf dem Montagebock
  const y = 0.93, L = 3.6, B = 1.5, H = 2.0, c = '#7d8a96';
  P.push(K.box(0, y + 0.14, 0, B * 0.55, 0.28, L * 0.8, '#3b4450', 'metall'), K.box(0, y + H * 0.33, 0, B * 0.72, H * 0.34, L * 0.88, c, 'metall', { rr: 0.05 }),
    K.box(0, y + H * 0.38, L * 0.47, B * 0.82, H * 0.62, 0.3, '#59636e', 'metall'), K.cyl(0, y + H * 0.36, L * 0.5, H * 0.24, 0.12, '#1f2328', 'metall', { ax: 'z', seg: 20 }),
    K.box(0, y + H * 0.36, -L * 0.47, B * 0.6, H * 0.5, 0.26, '#59636e', 'metall'), K.box(0, y + H * 0.9, 0, B * 0.22, H * 0.1, L * 0.66, '#5c6976', 'metall'));
  for (const s of [-1, 1]) {
    P.push(K.box(s * B * 0.27, y + H * 0.66, 0, B * 0.28, H * 0.28, L * 0.78, c, 'metall', { rr: 0.03 }));
    for (let i = 0; i < 8; i++) P.push(K.box(s * B * 0.32, y + H * 0.83, -L * 0.39 + (i + 0.5) * L * 0.78 / 8, B * 0.2, H * 0.07, L * 0.78 / 8 - 0.05, '#262c32', 'metall'));
    P.push(K.cyl(s * B * 0.46, y + H * 0.76, 0, H * 0.05, L * 0.76, '#a8aeb4', 'chrom', { ax: 'z' }));
  }
  return P;
};

/* ---------- Personen ---------- */
const werkerKlt = () => { const { s, sh, P } = koerper({ top: '#2d5f8a', vest: GE, cap: GE }); for (const sx of [-1, 1]) P.push(...armVor(s, sh, sx, '#2d5f8a', 0.3, 1.05)); P.push(...kltBox(0, 0.98 * s, 0.38, KLT, 0.4, 0.3, 0.24)); return P; };
const werkerWagen = () => {
  const { s, sh, P } = koerper({ top: '#3d5a80', vest: OR, h: 1.72, hair: '#5a3b26' });
  for (const sx of [-1, 1]) P.push(...armVor(s, sh, sx, '#3d5a80', 0.42, 1.0));
  // Kommissionierwagen vor der Person (Schiebebügel bei z ≈ 0,5)
  const zc = 1.05; P.push(K.box(0, 1.0, 0.5, 0.62, 0.04, 0.04, AN, 'metall'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(K.box(sx * 0.3, 0.5, zc + sz * 0.45, 0.03, 0.9, 0.03, AL, 'metall'));
  for (const sx of [-1, 1]) P.push(K.box(sx * 0.3, 0.98, 0.52 + 0.06, 0.03, 0.06, 0.12, AN, 'metall'));
  [0.18, 0.55, 0.92].forEach((y, i) => { P.push(K.box(0, y, zc, 0.64, 0.025, 0.96, '#9aa1aa', 'metall')); if (i < 2) for (const sz of [-1, 1]) P.push(...kltBox(0, y + 0.015, zc + sz * 0.22, i ? OR : KLT, 0.58, 0.38, 0.24)); });
  P.push(...K.casters(0.6, 0.9, 0.05).map(p => Object.assign(p, { p: [p.p[0], p.p[1], p.p[2] + zc] })));
  return P;
};

/* ---------- Hallenausstattung ---------- */
const leuchte = () => [K.cyl(0, 0.9, 0, 0.008, 1.2, '#59636e', 'metall'), K.box(0, 0.2, 0, 1.2, 0.08, 0.32, '#c3c9d0', 'metall'), K.box(0, 0.155, 0, 1.12, 0.012, 0.26, '#fffbe8', 'leucht')];
const spiegel = () => [K.cyl(0, 1.3, 0, 0.04, 2.6, '#9aa1aa', 'metall'), ...[0.4, 0.8, 1.2].map(y => K.box(0, y, 0.045, 0.085, 0.18, 0.01, RT, 'lack')), K.cyl(0, 2.7, 0.06, 0.3, 0.05, RT, 'lack', { rx: 90, seg: 20 }), K.cyl(0, 2.7, 0.09, 0.27, 0.01, '#d9e6ef', 'chrom', { rx: 90, seg: 20 })];
const fluchtweg = () => [K.cyl(0, 1.25, 0, 0.03, 2.5, '#9aa1aa', 'metall'), K.box(0, 2.5, 0.03, 0.6, 0.3, 0.02, GR, 'lack'), K.box(0, 2.5, 0.042, 0.5, 0.2, 0.005, '#f4f6f8', 'leucht')];
const ersteHilfe = () => [K.box(0, 1.1, 0, 1.0, 2.2, 0.08, '#e8eaec', 'lack'), K.box(0, 1.5, 0.12, 0.6, 0.6, 0.18, '#f4f6f8', 'lack'), K.box(0, 1.5, 0.215, 0.2, 0.06, 0.01, GR, 'matt'), K.box(0, 1.5, 0.215, 0.06, 0.2, 0.01, GR, 'matt'),
  K.box(0, 2.05, 0.06, 0.8, 0.22, 0.02, GR, 'lack'), K.cyl(0.32, 1.0, 0.18, 0.12, 0.08, GR, 'lack', { rx: 90 }), K.box(-0.3, 0.9, 0.12, 0.25, 0.4, 0.15, '#f2c94c', 'lack')];
const abfall = () => { const P = [K.box(0, 0.05, 0, 2.6, 0.1, 0.8, AN, 'metall')]; ['#2d7694', '#f2c94c', '#3b4450', '#c0392b', '#0A967A'].forEach((c, i) => { const x = -1.04 + i * 0.52; P.push(K.box(x, 0.55, 0, 0.46, 0.9, 0.6, c, 'kunststoff', { rr: 0.02 }), K.box(x, 1.02, 0, 0.48, 0.05, 0.62, '#2b3138', 'kunststoff')); }); P.push(K.box(0, 1.6, -0.35, 2.6, 0.5, 0.04, WS, 'lack')); return P; };
const palStapel = () => Array.from({ length: 8 }, (_, i) => K.box(0, 0.072 + i * 0.146, 0, 1.2, 0.144, 0.8, i % 2 ? '#b08f63' : '#a8865a', 'holz'));
const bereit = () => [...ladung(0, 0, 0, 2, '#d9bf98'), K.box(0, 0.006, 0, 1.4, 0.006, 1.0, '#f4f6f8', 'lack')];
const pause = () => { const P = []; for (const x of [-1.1, 1.1]) { P.push(K.box(x, 0.74, 0, 1.6, 0.04, 0.8, '#e8eaec', 'kunststoff'), ...K.legs(1.5, 0.7, 0.72, 0.025, AN, 0.05).map(p => Object.assign(p, { p: [p.p[0] + x, p.p[1], p.p[2]] }))); for (const sz of [-1, 1]) P.push(K.box(x, 0.45, sz * 0.7, 1.5, 0.05, 0.35, BL, 'kunststoff'), ...[-0.6, 0.6].map(dx => K.cyl(x + dx, 0.22, sz * 0.7, 0.025, 0.44, AN, 'metall'))); } P.push(K.box(2.6, 0.95, 0, 0.8, 1.9, 0.7, '#2b3138', 'lack'), K.box(2.6, 1.2, 0.36, 0.6, 1.0, 0.01, '#9fc4d8', 'glas'), K.box(-2.5, 0.6, 0, 0.4, 1.2, 0.4, '#e8eaec', 'kunststoff'), K.cyl(-2.5, 1.35, 0, 0.14, 0.3, '#9fc4d8', 'glas')); return P; };
const teamtafel = () => [...[-0.9, 0.9].map(x => K.cyl(x, 0.9, 0, 0.03, 1.8, AN, 'metall')), ...[-0.9, 0.9].map(x => K.box(x, 0.02, 0, 0.5, 0.04, 0.5, AN, 'metall')), K.box(0, 1.5, 0, 2.0, 1.1, 0.04, WS, 'lack'), ...[-0.6, 0, 0.6].map((x, i) => K.box(x, 1.55, 0.025, 0.55, 0.8, 0.005, ['#d5e7ef', '#f6ead0', '#d6efe6'][i], 'matt')), K.box(0, 2.12, 0.025, 2.0, 0.14, 0.01, '#144477', 'lack')];
const spinde = () => { const P = []; for (let i = 0; i < 4; i++) { const x = -0.9 + i * 0.6; P.push(K.box(x, 0.9, 0, 0.58, 1.8, 0.5, '#8d969f', 'lack'), K.box(x + 0.2, 1.0, 0.255, 0.03, 0.15, 0.01, '#2b3138', 'metall'), K.box(x, 1.6, 0.255, 0.3, 0.05, 0.005, '#5a6573', 'matt')); } return P; };
const ladestation = () => [K.box(0, 0.6, -0.15, 0.6, 1.2, 0.3, '#e8eaec', 'lack', { rr: 0.03 }), K.box(0, 0.9, 0.005, 0.4, 0.25, 0.01, '#14324f', 'bildschirm'), K.box(0, 0.12, 0.25, 0.5, 0.06, 0.5, AN, 'metall'), K.box(0, 1.25, -0.15, 0.6, 0.06, 0.3, GR, 'leucht')];
const gehaenge = () => [K.box(0, 0.12, 0, 0.3, 0.2, 0.8, AN, 'metall'), K.box(0, -0.35, 0, 0.06, 0.8, 0.06, GE, 'lack'), K.box(0, -0.78, 0, 0.9, 0.06, 1.2, GE, 'lack'), ...[-1, 1].map(s => K.box(0, -1.15, s * 0.55, 0.9, 0.7, 0.06, GE, 'lack')), K.box(0, -1.15, 0, 0.7, 0.55, 0.9, '#7d8791', 'metall', { rr: 0.03 })];
const wasser = () => [K.box(0, 0.55, 0, 0.35, 1.1, 0.35, '#e8eaec', 'kunststoff'), K.cyl(0, 1.3, 0, 0.14, 0.42, '#9fc4d8', 'glas')];

const O = (id, name, cat, tags, size, parts, extra = {}) => Object.assign({ id, name, category: 'Fabrik/' + cat, tags, size, parts }, extra);
HSS.library.registerPack({ format: 'hss-library', version: 1, name: 'Hallenausstattung & Intralogistik', objects: [
  O('ha.stapler.last', 'Gabelstapler mit Palette (Elektro, 2,5 t)', 'Intralogistik', ['Stapler', 'Fahrzeug', 'Palette'], { w: 1.2, d: 3.6, h: 2.35 }, stapler(true), { logistik: { rolle: 'fahrzeug', mittel: 'schlepper' } }),
  O('ha.stapler.leer', 'Gabelstapler (Elektro, 2,5 t, mit Fahrer)', 'Intralogistik', ['Stapler', 'Fahrzeug'], { w: 1.2, d: 3.6, h: 2.35 }, stapler(false), { logistik: { rolle: 'fahrzeug', mittel: 'schlepper' } }),
  O('ha.routenzug', 'Routenzug (Schlepper mit 3 E-Rahmen-Anhängern)', 'Intralogistik', ['Routenzug', 'Milkrun', 'KLT'], { w: 1.0, d: 7.8, h: 2.0 }, routenzug(), { logistik: { rolle: 'fahrzeug', mittel: 'routenzug' } }),
  O('ha.fts.klt', 'Unterfahr-FTS mit KLT-Regalwagen', 'Intralogistik', ['FTS', 'AGV', 'KLT', 'Automation'], { w: 0.9, d: 1.32, h: 1.66 }, ftsKlt(), { logistik: { rolle: 'fahrzeug', mittel: 'fts' } }),
  O('ha.fts.motor', 'Schwerlast-FTS mit Großmotor', 'Intralogistik', ['FTS', 'AGV', 'Motor', 'Großmotor'], { w: 2.3, d: 4.64, h: 2.95 }, ftsMotor(), { logistik: { rolle: 'fahrzeug', mittel: 'fts' } }),
  O('ha.fts.ladestation', 'FTS-Ladestation (Bodenkontakt)', 'Intralogistik', ['FTS', 'Laden', 'Energie'], { w: 0.6, d: 0.8, h: 1.28 }, ladestation()),
  O('ha.ehb.gehaenge', 'Elektrohängebahn-Gehänge mit Bauteil', 'Intralogistik', ['Hängebahn', 'EHB', 'Fördertechnik'], { w: 0.9, d: 1.2, h: 1.7 }, gehaenge().map(p => Object.assign(p, { p: [p.p[0], p.p[1] + 1.5, p.p[2]] }))),
  O('ha.werker.klt', 'Werker trägt Kleinladungsträger', 'Personen', ['Person', 'Werker', 'KLT', 'Transport'], { w: 0.5, d: 0.55, h: 1.78 }, werkerKlt()),
  O('ha.werker.wagen', 'Logistiker mit Kommissionierwagen', 'Personen', ['Person', 'Logistik', 'Kommissionierung'], { w: 0.66, d: 1.6, h: 1.72 }, werkerWagen()),
  O('ha.leuchte', 'Hallenleuchte (LED, abgehängt)', 'Hallenausstattung', ['Licht', 'Halle', 'Decke'], { w: 1.2, d: 0.32, h: 1.5 }, leuchte(), { anchor: 'decke' }),
  O('ha.spiegel', 'Verkehrsspiegel an Kreuzung', 'Hallenausstattung', ['Sicherheit', 'Kreuzung', 'Verkehr'], { w: 0.6, d: 0.2, h: 3.0 }, spiegel()),
  O('ha.fluchtweg', 'Fluchtwegschild (beleuchtet, an Mast)', 'Hallenausstattung', ['Sicherheit', 'Fluchtweg', 'Rettungsweg'], { w: 0.6, d: 0.1, h: 2.66 }, fluchtweg()),
  O('ha.erstehilfe', 'Erste-Hilfe-Station mit Augendusche', 'Hallenausstattung', ['Sicherheit', 'Erste Hilfe'], { w: 1.0, d: 0.3, h: 2.2 }, ersteHilfe()),
  O('ha.abfall', 'Abfalltrennstation (5 Fraktionen)', 'Hallenausstattung', ['Abfall', 'Wertstoff', 'Umwelt'], { w: 2.6, d: 0.8, h: 1.85 }, abfall()),
  O('ha.palettenstapel', 'Leerpalettenstapel', 'Hallenausstattung', ['Palette', 'Leergut'], { w: 1.2, d: 0.8, h: 1.17 }, palStapel()),
  O('ha.bereitstellung', 'Bereitstellplatz mit Palette', 'Hallenausstattung', ['Palette', 'Bereitstellung'], { w: 1.4, d: 1.0, h: 1.36 }, bereit()),
  O('ha.pausenzone', 'Pausenzone in der Halle (Tische, Automat)', 'Hallenausstattung', ['Pause', 'Sozial'], { w: 5.6, d: 1.75, h: 1.9 }, pause()),
  O('ha.teamtafel', 'Teamtafel / Shopfloor-Board', 'Hallenausstattung', ['Lean', 'Shopfloor', 'Team'], { w: 2.3, d: 0.5, h: 2.2 }, teamtafel()),
  O('ha.spinde', 'Spindreihe (4 Spinde)', 'Hallenausstattung', ['Umkleide', 'Spind'], { w: 2.4, d: 0.5, h: 1.8 }, spinde()),
  O('ha.wasserspender', 'Wasserspender', 'Hallenausstattung', ['Pause', 'Wasser'], { w: 0.35, d: 0.35, h: 1.51 }, wasser())
] });
})(HSS.library.kit);
