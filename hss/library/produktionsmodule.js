/* HSS-Bibliothekspaket · Produktionsmodule (Motorenwerk)
   Vollständig ausgestattete Produktionseinheiten im Maßstab eines Motorenwerks (Pkw-Motoren,
   4-/6-Zylinder). Maße nach typischen Herstellerangaben gerundet:
     Horizontal-BAZ (Kurbelgehäuse, Zylinderkopf)   ca. 2,8 × 5,6 m, 3,2 m hoch
     Vertikal-BAZ 5-Achs                            ca. 2,8 × 3,2 m, 2,9 m hoch
     CNC-Drehmaschine                               ca. 4,2 × 2,1 m, 2,1 m hoch
     Kurbelwellen-Schleifmaschine                   ca. 5,0 × 3,0 m, 2,4 m hoch
     Koordinatenmessgerät (Portal)                  ca. 2,0 × 3,4 m, 3,0 m hoch
     Montagelinie: Taktlänge 3,0 m, Werkstückträger 0,8 × 0,8 m, Förderhöhe 0,85 m
     Heißtest-Prüfstand (Zelle)                     ca. 7,0 × 5,0 m, 3,8 m hoch
   Kategorien:
     Produktionsmodule/Produktionsinseln     Fertigungs- und Montageinseln mit allem Umfeld
     Produktionsmodule/Werkstattfertigung    Produktionsstationen (Werkstattprinzip)
     Produktionsmodule/Linienmodule          Linie aus Modulen: gerade, Stationen, Drehmodule 90°/180°
     Produktionsmodule/Ausrüstung            Einzelne Hardware (Motor, Kran, Regal, Schrauber …)
   Linienmodule tragen "linie": { ein: [x, z], aus: [x, z, Richtung°] } (lokale Koordinaten, Fluss
   in +x). Die Suite hängt damit am gewählten Modul passend das nächste an (Leiste am Objekt). */
(function (K) {
const WS = '#e6e9ec', HG = '#d5dade', DG = '#3b4450', AN = '#59636e', ST = '#8d969f', AL = '#c3c9d0', BL = '#2d6fa3', NV = '#144477',
  GE = '#f2c94c', OR = '#f2994a', GR = '#0A967A', RT = '#c0392b', GU = '#2b3138', MO = '#a9b0b8', HO = '#c9a77c';

/* ---------- Werkzeuge: Baugruppen verschieben/drehen, Umriss bestimmen ---------- */
// Baugruppe um a (0/90/180/270°) drehen und nach (dx, dz) setzen – gleiche Drehrichtung wie Objekte der Suite
const T = (parts, dx = 0, dz = 0, a = 0) => {
  const r = a * Math.PI / 180, c = Math.round(Math.cos(r) * 1e6) / 1e6, s = Math.round(Math.sin(r) * 1e6) / 1e6;
  const tp = q => [q[0] * c - q[2] * s + dx, q[1], q[0] * s + q[2] * c + dz];
  return parts.map(p => { const n = Object.assign({}, p, { p: tp(p.p) }); if (p.piv) n.piv = tp(p.piv); if (a) n.ry = (p.ry || 0) - a; return n; });
};
// Ausdehnung eines Teils in x/z (konservativ) und Höhe
const ext = p => {
  let hx, hz, y0, y1;
  if (p.t === 'box') { const ry = ((p.ry || 0) % 180 + 180) % 180; const sw = ry > 45 && ry < 135; hx = (sw ? p.s[2] : p.s[0]) / 2; hz = (sw ? p.s[0] : p.s[2]) / 2; if (ry % 90) { hx = hz = Math.hypot(p.s[0], p.s[2]) / 2; } y0 = p.p[1] - p.s[1] / 2; y1 = p.p[1] + p.s[1] / 2; }
  else if (p.t === 'cyl' || p.t === 'cone' || p.t === 'cap') { const r = Math.max(p.r, p.rt || 0), h = p.h || 2 * p.r; if (p.ax) { const L = h / 2; const alongX = (p.ax === 'x') !== !!(p.ry && Math.abs(Math.sin(p.ry * Math.PI / 180)) > 0.7); hx = alongX ? L : r; hz = alongX ? r : L; y0 = p.p[1] - r; y1 = p.p[1] + r; } else { hx = hz = r; y0 = p.p[1] - h / 2; y1 = p.p[1] + h / 2; } }
  else if (p.t === 'tor') { hx = hz = p.R + p.r; y0 = p.p[1] - p.R - p.r; y1 = p.p[1] + p.R + p.r; }
  else { hx = hz = p.r || 0.1; y0 = p.p[1] - (p.r || 0.1); y1 = p.p[1] + (p.r || 0.1); }
  return [p.p[0] - hx, p.p[0] + hx, p.p[2] - hz, p.p[2] + hz, y0, y1];
};
// Objekt aus Teilen: Umriss berechnen, auf die Mitte setzen (Ursprung = Mitte am Boden)
const fit = parts => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, h = 0;
  for (const p of parts) { const e = ext(p); x0 = Math.min(x0, e[0]); x1 = Math.max(x1, e[1]); z0 = Math.min(z0, e[2]); z1 = Math.max(z1, e[3]); h = Math.max(h, e[5]); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, R = v => Math.round(v * 100) / 100;
  return { size: { w: R(x1 - x0), d: R(z1 - z0), h: R(h) }, parts: T(parts, -cx, -cz, 0), cx, cz };
};
const O = (id, name, cat, tags, parts, extra = {}) => { const f = fit(parts); return Object.assign({ id, name, category: 'Produktionsmodule/' + cat, tags, size: f.size, parts: f.parts }, extra); };

/* ---------- Bausteine ---------- */
const box = K.box, cyl = K.cyl;
// Bodenmarkierung (Rahmen), gelb oder weiß
const markierung = (w, d, c = GE, b = 0.08) => [box(0, 0.004, -d / 2 + b / 2, w, 0.008, b, c, 'lack'), box(0, 0.004, d / 2 - b / 2, w, 0.008, b, c, 'lack'), box(-w / 2 + b / 2, 0.004, 0, b, 0.008, d - 2 * b, c, 'lack'), box(w / 2 - b / 2, 0.004, 0, b, 0.008, d - 2 * b, c, 'lack')];
const linie = (x0, z0, x1, z1, c = GE, b = 0.08) => { const L = Math.hypot(x1 - x0, z1 - z0); return box((x0 + x1) / 2, 0.004, (z0 + z1) / 2, L, 0.008, b, c, 'lack', { ry: -Math.atan2(z1 - z0, x1 - x0) * 180 / Math.PI }); };
// Schutzzaun entlang einer Strecke (Pfosten ≤ 1,4 m, Gitterfelder halbtransparent)
const zaun = (x0, z0, x1, z1, h = 2.2) => {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 1.4)), ang = -Math.atan2(z1 - z0, x1 - x0) * 180 / Math.PI, P = [];
  for (let i = 0; i <= n; i++) { const t = i / n; P.push(box(x0 + (x1 - x0) * t, h / 2, z0 + (z1 - z0) * t, 0.06, h, 0.06, GE, 'lack')); }
  P.push(box((x0 + x1) / 2, 0.15 + (h - 0.3) / 2 + 0.02, (z0 + z1) / 2, L, h - 0.3, 0.02, '#3b4450', 'glas', { ry: ang, o: 0.32 }));
  P.push(box((x0 + x1) / 2, h - 0.02, (z0 + z1) / 2, L, 0.04, 0.04, GE, 'lack', { ry: ang }));
  return P;
};
const person = (top, o = {}) => K.person(Object.assign({ top, legs: '#2b3a4a', h: 1.76 }, o));
const werker = (x, z, a = 0, o = {}) => T(person(o.top || '#2d5f8a', { vest: o.vest, cap: o.cap, hair: o.hair || '#3b2a1e', h: o.h || 1.76 }), x, z, a);
// Bedienpult am Schwenkarm
const pult = (x, y, z) => [box(x, y, z, 0.6, 0.48, 0.14, GU, 'kunststoff'), box(x, y + 0.04, z + 0.075, 0.5, 0.32, 0.01, '#14324f', 'bildschirm')];
// Signalsäule (Andon) rot/gelb/grün
const ampel = (x, z, y0 = 0, h = 2.4) => [cyl(x, y0 + h / 2, z, 0.025, h, ST, 'metall'), cyl(x, y0 + h + 0.06, z, 0.045, 0.12, GR, 'leucht'), cyl(x, y0 + h + 0.18, z, 0.045, 0.12, GE, 'leucht'), cyl(x, y0 + h + 0.30, z, 0.045, 0.12, RT, 'leucht')];
// Schaltschrankreihe (je 0,8 × 0,6 × 2,2 m) entlang x
const schaltschrank = (x, z, n = 3, a = 0) => { const P = []; for (let i = 0; i < n; i++) { const xi = (i - (n - 1) / 2) * 0.8; P.push(box(xi, 1.15, 0, 0.78, 2.1, 0.6, '#d5d9de', 'lack'), box(xi, 0.05, 0, 0.78, 0.1, 0.6, DG, 'matt'), box(xi + 0.3, 1.1, 0.305, 0.03, 0.18, 0.02, ST, 'chrom'), box(xi - 0.15, 1.85, 0.305, 0.06, 0.06, 0.01, GR, 'leucht')); } return T(P, x, z, a); };
// Motorblock / Zylinderkopf / Motor komplett (Reihen-4-Zylinder)
const motorblock = (x, y, z, a = 0) => T([box(0, y + 0.2, 0, 0.56, 0.4, 0.42, MO, 'metall', { rr: 0.03 }), ...[-0.18, -0.06, 0.06, 0.18].map(dx => cyl(dx, y + 0.405, 0, 0.042, 0.012, '#5a6573', 'metall'))], x, z, a);
const zylinderkopf = (x, y, z, a = 0) => T([box(0, y + 0.07, 0, 0.5, 0.14, 0.26, AL, 'metall', { rr: 0.02 }), ...[-0.16, 0, 0.16].map(dx => box(dx, y + 0.145, 0, 0.06, 0.012, 0.18, '#7d8791', 'metall'))], x, z, a);
const motor = (x, y, z, a = 0) => T([
  box(0, y + 0.06, 0, 0.5, 0.12, 0.3, '#3b4450', 'metall'),                          // Ölwanne
  box(0, y + 0.31, 0, 0.58, 0.38, 0.42, MO, 'metall', { rr: 0.03 }),               // Kurbelgehäuse
  box(0, y + 0.58, 0, 0.56, 0.16, 0.36, AL, 'metall', { rr: 0.02 }),               // Zylinderkopf
  box(0, y + 0.7, 0, 0.54, 0.08, 0.3, '#1f2328', 'kunststoff', { rr: 0.02 }),       // Ventildeckel
  box(0, y + 0.52, 0.27, 0.46, 0.14, 0.12, '#2b3138', 'kunststoff'),                // Ansaugbrücke
  cyl(-0.33, y + 0.3, 0, 0.11, 0.05, '#1f2328', 'metall', { ax: 'x' }),            // Riemenscheibe
  box(-0.31, y + 0.42, 0, 0.04, 0.42, 0.34, '#4b5058', 'metall'),                   // Steuergehäuse
  box(0, y + 0.42, -0.25, 0.4, 0.12, 0.08, '#8d6e63', 'metall')                     // Abgaskrümmer
], x, z, a);
// Werkstückträger mit Aufnahme
const wt = (x, z, y = 0.85) => [box(x, y + 0.03, z, 0.8, 0.06, 0.8, '#7d8791', 'metall'), box(x - 0.25, y + 0.1, z, 0.06, 0.08, 0.5, '#2d6fa3', 'lack'), box(x + 0.25, y + 0.1, z, 0.06, 0.08, 0.5, '#2d6fa3', 'lack')];
// Förderstrecke (Doppelgurt/Staurollen) entlang x von x0 bis x1 auf z, Breite b, Höhe h
const foerder = (x0, x1, z = 0, b = 1.0, h = 0.85, o = {}) => {
  const L = x1 - x0, xm = (x0 + x1) / 2, P = [];
  for (const s of [-1, 1]) { P.push(box(xm, h - 0.06, z + s * (b / 2 - 0.05), L, 0.12, 0.1, AL, 'metall'), box(xm, h - 0.005, z + s * (b / 2 - 0.16), L, 0.03, 0.12, GU, 'gummi')); }
  const nb = Math.max(2, Math.round(L / 1.5) + 1);
  for (let i = 0; i < nb; i++) { const xi = x0 + 0.08 + (L - 0.16) * i / (nb - 1); for (const s of [-1, 1]) P.push(box(xi, (h - 0.12) / 2, z + s * (b / 2 - 0.05), 0.06, h - 0.12, 0.06, AL, 'metall')); P.push(box(xi, 0.12, z, 0.05, 0.05, b - 0.1, AL, 'metall')); }
  P.push(box(xm, h - 0.17, z, L, 0.1, 0.16, '#59636e', 'metall'));
  if (o.antrieb) P.push(box(x0 + 0.35, h - 0.3, z + b / 2 + 0.12, 0.3, 0.2, 0.2, BL, 'lack'));
  return P;
};
// Durchlaufregal (Kanban, KLT) – Front in +z
const durchlaufregal = (x, z, w = 2.6, a = 0, d = 1.0) => {
  const P = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * (w / 2 - 0.03), 0.95, sz * (d / 2 - 0.03), 0.05, 1.9, 0.05, AL, 'metall'));
  const n = Math.max(2, Math.round(w / 0.42));
  [0.45, 0.95, 1.45].forEach((y, k) => {
    P.push(box(0, y, 0, w, 0.03, d, '#9aa1aa', 'metall'));
    for (let i = 0; i < n; i++) P.push(box(-w / 2 + (i + 0.5) * w / n, y + 0.1, 0.1, w / n - 0.04, 0.17, 0.4, k === 1 ? OR : '#2d7694', 'kunststoff'));
  });
  P.push(box(0, 1.85, 0.2, w, 0.06, 0.4, '#f4f6f8', 'leucht'));
  return T(P, x, z, a);
};
// Schrauber am Balancer (von oben)
const schrauber = (x, z, y0 = 2.6) => [cyl(x, y0 - 0.2, z, 0.06, 0.18, '#59636e', 'metall'), cyl(x, (y0 - 0.3 + 1.35) / 2, z, 0.006, y0 - 0.3 - 1.35, '#2b3138', 'metall'), cyl(x, 1.25, z, 0.035, 0.28, '#2b3138', 'kunststoff'), box(x, 1.42, z, 0.08, 0.08, 0.16, BL, 'kunststoff')];
// Stationsportal über der Linie (Aluprofil, Beleuchtung, Schienen für Schrauber)
const portal = (L = 3.0, b = 2.8, h = 2.7) => {
  const P = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * (L / 2 - 0.1), h / 2, sz * b / 2, 0.08, h, 0.08, AL, 'metall'));
  for (const sz of [-1, 1]) P.push(box(0, h, sz * b / 2, L - 0.1, 0.08, 0.08, AL, 'metall'));
  for (const sx of [-1, 1]) P.push(box(sx * (L / 2 - 0.1), h, 0, 0.08, 0.08, b, AL, 'metall'));
  P.push(box(0, h - 0.06, -0.55, L - 0.4, 0.04, 0.2, '#f4f6f8', 'leucht'), box(0, h - 0.06, 0.55, L - 0.4, 0.04, 0.2, '#f4f6f8', 'leucht'));
  return P;
};
const matte = (x, z, w, d) => box(x, 0.008, z, w, 0.016, d, '#2b3138', 'gummi');
// Gitterbox und KLT-Stapel
const gitterbox = (x, z, voll = true, a = 0) => T([box(0, 0.08, 0, 1.24, 0.16, 0.84, '#8d969f', 'metall'), box(0, 0.55, 0, 1.2, 0.8, 0.8, '#8d969f', 'glas', { o: 0.45 }), ...(voll ? [box(0, 0.45, 0, 1.0, 0.55, 0.65, MO, 'metall')] : [])], x, z, a);
const klt = (x, z, n = 4, c = '#2d7694') => Array.from({ length: n }, (_, i) => box(x, 0.16 + i * 0.31, z, 0.6, 0.29, 0.4, c, 'kunststoff', { rr: 0.01 }));
// Späne-Kippbehälter
const spaene = (x, z, a = 0) => T([box(0, 0.5, 0, 1.4, 0.8, 1.0, '#2d6fa3', 'lack'), box(0, 0.12, 0, 1.2, 0.2, 0.9, DG, 'metall'), box(0, 0.86, -0.1, 1.2, 0.08, 0.6, '#6d7680', 'metall')], x, z, a);
// Horizontal-Bearbeitungszentrum (Front +z): 2,8 × 5,6 × 3,2 m mit Späneförderer hinten
const hbaz = (x, z, a = 0, c = WS) => T([
  box(0, 1.55, 0.2, 2.8, 3.1, 4.4, c, 'lack', { rr: 0.06 }), box(0, 0.05, 0.2, 2.86, 0.1, 4.46, DG, 'matt'),
  box(0, 3.15, -0.6, 1.8, 0.15, 2.0, HG, 'lack'),
  box(-0.3, 1.45, 2.41, 1.5, 1.6, 0.02, '#9fc4d8', 'glas'), box(-0.3, 1.45, 2.405, 1.6, 1.7, 0.01, '#4b5058', 'metall'),
  box(0.95, 0.7, 2.42, 0.6, 1.4, 0.02, NV, 'lack'),
  box(1.1, 1.55, 2.6, 0.06, 0.06, 0.4, AN, 'metall'), ...pult(1.1, 1.55, 2.8),
  box(1.4, 2.95, 2.0, 0.08, 0.08, 0.08, GR, 'leucht'),
  box(0.7, 0.55, -2.5, 0.9, 1.1, 1.0, '#59636e', 'metall'), box(0.7, 1.05, -2.75, 0.9, 0.12, 0.5, '#6d7680', 'metall'),   // Späneförderer
  box(-0.7, 0.75, -2.35, 1.2, 1.5, 1.1, HG, 'lack'),                                                                         // KSS-/Hydraulikaggregat
  box(-1.65, 1.2, -0.6, 0.5, 2.2, 1.6, '#d5d9de', 'lack')                                                                     // Schaltschrank an der Seite
], x, z, a);
// Vertikal-Bearbeitungszentrum 5-Achs (Front +z): 2,8 × 3,2 × 2,9 m
const vbaz = (x, z, a = 0, c = WS) => T([
  box(0, 1.4, 0, 2.6, 2.8, 2.6, c, 'lack', { rr: 0.06 }), box(0, 0.05, 0, 2.66, 0.1, 2.66, DG, 'matt'),
  box(-0.2, 1.35, 1.31, 1.3, 1.3, 0.02, '#9fc4d8', 'glas'), box(-0.2, 1.35, 1.305, 1.4, 1.4, 0.01, '#4b5058', 'metall'),
  ...pult(1.0, 1.5, 1.42), box(1.25, 2.75, 1.1, 0.07, 0.07, 0.07, GR, 'leucht'),
  box(-1.55, 0.7, -0.4, 0.5, 1.4, 1.4, HG, 'lack'), box(0.6, 0.5, -1.55, 1.0, 1.0, 0.5, '#59636e', 'metall')
], x, z, a);
// CNC-Drehmaschine (Front +z): 4,2 × 2,1 × 2,1 m
const drehmaschine = (x, z, a = 0) => T([
  box(0, 1.0, 0, 3.6, 2.0, 1.8, WS, 'lack', { rr: 0.05 }), box(0, 0.05, 0, 3.66, 0.1, 1.86, DG, 'matt'),
  box(-0.2, 1.15, 0.91, 1.8, 0.9, 0.02, '#9fc4d8', 'glas'), ...pult(1.45, 1.4, 1.02),
  box(2.15, 0.5, 0, 0.7, 1.0, 1.4, '#59636e', 'metall'), box(1.7, 1.95, 0.7, 0.07, 0.07, 0.07, GR, 'leucht')
], x, z, a);
// Kurbelwellen-Schleifmaschine (Front +z): 5,0 × 3,0 × 2,4 m
const schleifmaschine = (x, z, a = 0) => T([
  box(0, 0.45, 0, 4.4, 0.9, 2.4, '#d5d9de', 'lack'), box(0, 1.55, -0.1, 4.4, 1.3, 2.2, WS, 'lack', { rr: 0.05 }),
  box(0, 1.5, 1.01, 3.2, 0.8, 0.02, '#9fc4d8', 'glas'), cyl(0.9, 1.4, -0.3, 0.45, 0.12, '#9aa1aa', 'metall', { ax: 'z' }),
  ...pult(2.0, 1.4, 1.12), box(0, 0.5, -1.45, 3.0, 1.0, 0.7, HG, 'lack'), box(2.05, 2.25, 0.9, 0.07, 0.07, 0.07, GR, 'leucht')
], x, z, a);
// Industrieroboter (6-Achs, ca. 120 kg Traglast) auf Sockel, Greifer zeigt nach +z
const roboter = (x, z, a = 0, s = 1, c = OR) => T([
  box(0, 0.25 * s, 0, 0.9 * s, 0.5 * s, 0.9 * s, DG, 'lack'), cyl(0, 0.62 * s, 0, 0.36 * s, 0.24 * s, c, 'lack'),
  box(0, 0.95 * s, 0, 0.5 * s, 0.42 * s, 0.6 * s, c, 'lack'), box(0.18 * s, 1.55 * s, 0.05 * s, 0.22 * s, 1.1 * s, 0.3 * s, c, 'lack'),
  box(0, 2.1 * s, 0.35 * s, 0.34 * s, 0.32 * s, 1.0 * s, c, 'lack'), box(0, 2.0 * s, 0.95 * s, 0.18 * s, 0.4 * s, 0.18 * s, c, 'lack'),
  box(0, 1.76 * s, 0.95 * s, 0.26 * s, 0.1 * s, 0.26 * s, '#9aa1aa', 'chrom'), box(0, 1.65 * s, 0.95 * s, 0.06 * s, 0.14 * s, 0.2 * s, '#9aa1aa', 'chrom')
], x, z, a);
// Koordinatenmessgerät (Portal) auf Granit, 2,0 × 3,4 × 3,0 m
const kmg = (x, z, a = 0) => T([
  box(0, 0.4, 0, 1.6, 0.8, 3.0, '#4b5058', 'lack'), box(0, 0.85, 0, 1.5, 0.1, 2.9, '#2b2f33', 'matt'),
  ...[-1, 1].map(s => box(s * 0.82, 1.9, 0.3, 0.16, 2.1, 0.3, WS, 'lack')), box(0, 2.95, 0.3, 1.9, 0.2, 0.3, WS, 'lack'),
  box(0.2, 2.4, 0.3, 0.16, 1.0, 0.16, AL, 'metall'), cyl(0.2, 1.8, 0.3, 0.02, 0.2, '#9aa1aa', 'chrom'), motorblock(0, 0.9, -0.6)[0]
], x, z, a);
// Industrie-Waschanlage (Durchlauf, Front +z): 3,0 × 2,0 × 2,4 m
const waschanlage = (x, z, a = 0) => T([box(0, 1.2, 0, 3.0, 2.4, 2.0, '#cfd8dc', 'lack', { rr: 0.04 }), box(0, 0.9, 1.01, 1.0, 0.8, 0.02, '#9fc4d8', 'glas'), cyl(1.1, 2.75, -0.5, 0.18, 0.7, '#9aa1aa', 'metall'), ...pult(1.1, 1.4, 1.1)], x, z, a);
// Kühlschmierstoff-Anlage (Filter, Tank)
const kss = (x, z, a = 0) => T([box(0, 0.75, 0, 2.6, 1.5, 1.2, BL, 'lack'), cyl(-0.8, 1.9, 0, 0.35, 0.8, '#9aa1aa', 'metall'), box(0.8, 1.6, 0, 0.6, 0.2, 0.8, '#59636e', 'metall'), box(0.6, 1.0, 0.61, 0.4, 0.3, 0.01, '#14324f', 'bildschirm')], x, z, a);
// Messplatz (SPC) mit Messvorrichtung und Rechner
const messplatz = (x, z, a = 0) => T([box(0, 0.88, 0, 1.6, 0.05, 0.8, '#5a6573', 'matt'), ...K.legs(1.55, 0.75, 0.86, 0.03, '#9aa1aa', 0.04), box(-0.35, 1.15, -0.05, 0.6, 0.5, 0.5, '#b8bec6', 'metall'), ...K.screen(0.45, 1.25, -0.28, 0.55, 0.36)], x, z, a);
// Werkbank, Werkzeugschrank, Voreinstellgerät, Ablagetisch
const werkbank = (x, z, a = 0, w = 2.0) => T([box(0, 0.9, 0, w, 0.05, 0.8, '#c9a77c', 'holz'), ...K.legs(w - 0.05, 0.75, 0.87, 0.03, BL, 0.05), box(w / 4, 0.45, 0, w * 0.4, 0.7, 0.7, BL, 'lack'), box(0, 1.45, -0.38, w, 1.0, 0.03, '#9aa1aa', 'metall')], x, z, a);
const wzschrank = (x, z, a = 0) => T([box(0, 0.95, 0, 1.0, 1.9, 0.6, '#2d6fa3', 'lack'), ...[0.35, 0.6, 0.85, 1.1].map(y => box(0, y, 0.305, 0.94, 0.2, 0.01, '#3c80b6', 'lack')), box(0, 1.55, 0.305, 0.94, 0.6, 0.01, '#9fc4d8', 'glas')], x, z, a);
const voreinstell = (x, z, a = 0) => T([box(0, 0.45, 0, 1.4, 0.9, 0.8, WS, 'lack'), box(0.3, 1.2, -0.2, 0.2, 0.6, 0.2, '#9aa1aa', 'metall'), ...K.screen(-0.35, 1.25, -0.1, 0.5, 0.36), cyl(0.3, 0.98, 0.1, 0.06, 0.12, '#9aa1aa', 'chrom')], x, z, a);
const tisch = (x, z, w = 1.2, d = 0.8, a = 0) => T([box(0, 0.85, 0, w, 0.05, d, '#9aa1aa', 'metall'), ...K.legs(w - 0.05, d - 0.05, 0.83, 0.025, AN, 0.04)], x, z, a);
// Säulenschwenkkran (500 kg, Ausladung r), Ausleger in +x
const saeulenkran = (x, z, r = 3.0, h = 3.6, a = 0) => T([cyl(0, h / 2, 0, 0.12, h, GE, 'lack'), box(0, 0.05, 0, 0.8, 0.1, 0.8, DG, 'metall'), box(r / 2, h - 0.1, 0, r, 0.22, 0.14, GE, 'lack'), box(r * 0.65, h - 0.35, 0, 0.3, 0.3, 0.25, DG, 'lack'), cyl(r * 0.65, h - 1.05, 0, 0.01, 1.1, '#2b3138', 'metall'), box(r * 0.65, h - 1.65, 0, 0.12, 0.12, 0.12, GE, 'lack')], x, z, a);
// Monitor auf Ständer (Werkerinformation)
const infoTerminal = (x, z, a = 0) => T([cyl(0, 0.75, 0, 0.03, 1.5, AN, 'metall'), box(0, 0.02, 0, 0.5, 0.04, 0.4, DG, 'metall'), ...K.screen(0, 1.55, 0.03, 0.62, 0.4)], x, z, a);
// Lichtgitter (Sicherheits-Lichtvorhang) als zwei Säulen
const lichtgitter = (x, z, b = 1.2) => [box(x, 0.95, z - b / 2, 0.06, 1.9, 0.06, '#f2c94c', 'lack'), box(x, 0.95, z + b / 2, 0.06, 1.9, 0.06, '#f2c94c', 'lack'), ...[0.4, 0.75, 1.1, 1.45, 1.8].map(y => box(x, y, z, 0.012, 0.012, b - 0.1, '#e74c3c', 'leucht'))];

/* ---------- Linienmodule (Fluss in +x, Förderer auf z = 0, Taktlänge 3,0 m) ---------- */
const LL = 3.0;
const motorAufWT = (x, z = 0) => [...wt(x, z), ...motor(x, 0.98, z)];
// Linienmodul: Umriss wie bei allen Objekten auf die Mitte gesetzt, Anschlusspunkte (ein/aus) entsprechend verschoben
const linieObj = (id, name, tags, parts, linie, extra = {}) => {
  const f = fit(parts), R = v => Math.round(v * 1000) / 1000, mv = q => q && [R(q[0] - f.cx), R(q[1] - f.cz), ...q.slice(2)];
  return Object.assign({ id, name, category: 'Produktionsmodule/Linienmodule', tags: ['Linie', 'Montagelinie', 'modular', ...tags], size: f.size, parts: f.parts, linie: { ein: mv(linie.ein), aus: mv(linie.aus), takt: extra.category ? GL : LL, familie: extra.category ? 'gross' : 'pkw' } }, extra);
};
const stationManuell = (beid = true) => {
  const P = [...foerder(-LL / 2, LL / 2, 0, 1.0), ...motorAufWT(0), ...portal(LL, 2.8, 2.7), ...schrauber(-0.6, -0.9), ...schrauber(0.6, 0.9)];
  for (const s of beid ? [-1, 1] : [1]) {
    P.push(matte(0, s * 1.25, LL - 0.2, 1.3), ...durchlaufregal(0, s * 2.45, 2.6, s > 0 ? 180 : 0), ...werker(s > 0 ? 0.3 : -0.3, s * 1.2, s > 0 ? 180 : 0, { vest: null }));
    P.push(linie(-LL / 2, s * 1.9, LL / 2, s * 1.9, GE, 0.06));
  }
  P.push(...infoTerminal(1.25, 1.55, 180), ...ampel(-1.4, -1.45, 0, 2.3));
  return P;
};
const stationEinseitig = () => {
  // Förderer bei z = 0, Werker und Regal auf der +z-Seite; Modul reicht von z = −0,6 bis z = +3,0
  const P = [...foerder(-LL / 2, LL / 2, 0, 1.0), ...motorAufWT(0), ...portal(LL, 1.6, 2.7).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] + 0.2] })), ...schrauber(0.5, 0.75)];
  P.push(matte(0, 1.25, LL - 0.2, 1.3), ...durchlaufregal(0, 2.45, 2.6, 180), ...werker(0.2, 1.2, 180), ...ampel(-1.4, -0.45, 0, 2.3), linie(-LL / 2, 1.9, LL / 2, 1.9, GE, 0.06));
  return P;
};
const stationRoboter = () => {
  const P = [...foerder(-LL / 2, LL / 2, 0, 1.0), ...motorAufWT(0), ...roboter(0, -1.75, 0, 0.8), ...roboter(0, 1.75, 180, 0.8)];
  for (const s of [-1, 1]) { P.push(...zaun(-LL / 2 + 0.05, s * 2.9, LL / 2 - 0.05, s * 2.9)); P.push(...zaun(-LL / 2 + 0.05, s * 0.65, -LL / 2 + 0.05, s * 2.9), ...zaun(LL / 2 - 0.05, s * 0.65, LL / 2 - 0.05, s * 2.9)); }
  P.push(...lichtgitter(-LL / 2 + 0.05, 0, 1.25), ...lichtgitter(LL / 2 - 0.05, 0, 1.25));
  P.push(box(1.0, 0.55, -2.4, 0.9, 1.1, 0.6, '#d5d9de', 'lack'), box(-0.9, 0.5, 2.45, 0.7, 1.0, 0.5, '#59636e', 'metall'), ...ampel(1.45, 2.95, 0, 2.2));
  return P;
};
const stationPruef = () => {
  const P = [...foerder(-LL / 2, LL / 2, 0, 1.0), ...motorAufWT(0)];
  // Prüfglocke (Dichtheitsprüfung) über dem Motor, Hubportal
  for (const sx of [-1, 1]) P.push(box(sx * 1.1, 1.5, 0, 0.16, 3.0, 0.5, '#d5d9de', 'lack'));
  P.push(box(0, 2.95, 0, 2.4, 0.3, 0.6, '#d5d9de', 'lack'), box(0, 2.25, 0, 1.1, 0.8, 0.9, '#9fc4d8', 'glas', { o: 0.5 }), box(0, 2.67, 0, 1.2, 0.12, 1.0, '#59636e', 'metall'));
  P.push(...schaltschrank(0, -1.6, 2), ...K.screen(0.9, 1.5, 1.05, 0.7, 0.45), cyl(0.9, 0.75, 1.08, 0.03, 1.5, AN, 'metall'), matte(0, 1.45, LL - 0.4, 1.0), ...werker(-0.3, 1.5, 180), ...ampel(1.4, -1.0, 0, 2.6));
  P.push(...markierung(LL, 3.9).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] - 0.1] })));
  return P;
};
const linienStart = () => {
  const P = [...foerder(-LL / 2, LL / 2, 0, 1.0, 0.85, { antrieb: true }), ...wt(0.4, 0), ...motorblock(0.4, 0.98, 0)];
  P.push(...saeulenkran(-1.0, -1.6, 2.6, 3.8, 75), ...gitterbox(-0.6, -2.6, true), ...gitterbox(0.9, -2.6, true), ...werker(-0.5, 1.2, 180), matte(0, 1.25, LL - 0.2, 1.3), ...infoTerminal(1.2, 1.6, 180), ...ampel(-1.4, 0.65, 0, 2.3));
  P.push(box(-1.42, 0.98, 0, 0.1, 0.3, 0.9, '#2d6fa3', 'lack'));  // Anschlag/Endplatte
  return P;
};
const linienEnde = () => {
  const P = [...foerder(-LL / 2, LL / 2, 0, 1.0, 0.85, { antrieb: true }), ...motorAufWT(-0.5)];
  P.push(...saeulenkran(1.0, -1.6, 2.6, 3.8, 105), box(0.6, 0.35, -2.6, 1.6, 0.7, 1.2, '#59636e', 'metall'), ...motor(0.25, 0.7, -2.6), ...motor(0.95, 0.7, -2.6));
  P.push(...werker(0.4, 1.2, 180), matte(0, 1.25, LL - 0.2, 1.3), ...ampel(1.4, 0.65, 0, 2.3), box(1.42, 0.98, 0, 0.1, 0.3, 0.9, '#2d6fa3', 'lack'));
  return P;
};
// Drehmodul 90° (Hub-Dreh-Einheit / Eckumsetzer): Eingang von −x, Ausgang nach +z (rechts) oder −z (links)
const dreh90 = s => {
  const P = [box(0, 0.4, 0, 1.0, 0.8, 1.0, '#59636e', 'metall'), cyl(0, 0.83, 0, 0.48, 0.06, AL, 'metall', { seg: 24 }), cyl(0, 0.87, 0, 0.42, 0.02, GU, 'gummi', { seg: 24 }), ...wt(0, 0, 0.88), box(0.45, 0.6, -s * 0.45, 0.2, 0.3, 0.2, BL, 'lack'), ...ampel(0.48, -s * 0.48, 0, 1.5)];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(sx * 0.48, 0.4, sz * 0.48, 0.06, 0.8, 0.06, AL, 'metall'));
  return P;
};
// Wendemodul 180° (U-Umsetzer, Achsabstand 9,0 m = 3 m Versorgungsgang zwischen den Regalen): Eingang bei z = −4,5, Ausgang bei z = +4,5 nach −x
const wende180 = () => {
  const P = [];
  for (const sz of [-4.5, 4.5]) P.push(box(0, 0.4, sz, 1.0, 0.8, 1.0, '#59636e', 'metall'), cyl(0, 0.83, sz, 0.48, 0.06, AL, 'metall', { seg: 24 }));
  P.push(...T(foerder(-4.0, 4.0, 0, 1.0), 0, 0, 90), ...wt(0, 0, 0.88), ...wt(0, -4.5, 0.88), box(0.45, 0.6, -4.95, 0.2, 0.3, 0.2, BL, 'lack'), box(0.45, 0.6, 4.95, 0.2, 0.3, 0.2, BL, 'lack'));
  return P;
};

const LINIE = [
  linieObj('pm.linie.foerder3', 'Linienmodul Förderstrecke 3,0 m (Puffer, 1 Motor)', ['Förderband', 'Puffer', 'gerade'], [...foerder(-LL / 2, LL / 2, 0, 1.0), ...motorAufWT(0.6)], { ein: [-1.5, 0], aus: [1.5, 0, 0] }),
  linieObj('pm.linie.foerder15', 'Linienmodul Förderstrecke 1,5 m', ['Förderband', 'gerade'], foerder(-0.75, 0.75, 0, 1.0), { ein: [-0.75, 0], aus: [0.75, 0, 0] }),
  linieObj('pm.linie.station.manuell', 'Montagestation manuell, beidseitig (Takt 3,0 m)', ['Station', 'Montage', 'Werker', 'Schrauber'], stationManuell(true), { ein: [-1.5, 0], aus: [1.5, 0, 0] }),
  linieObj('pm.linie.station.einseitig', 'Montagestation manuell, einseitig (Takt 3,0 m)', ['Station', 'Montage', 'Werker'], stationEinseitig(), { ein: [-1.5, 0], aus: [1.5, 0, 0] }),
  linieObj('pm.linie.station.roboter', 'Automatikstation Roboter-Verschraubung (eingezäunt)', ['Station', 'Roboter', 'Automation', 'Schrauben'], stationRoboter(), { ein: [-1.5, 0], aus: [1.5, 0, 0] }),
  linieObj('pm.linie.station.pruef', 'Prüfstation Dichtheitsprüfung (in Linie)', ['Station', 'Prüfung', 'Qualität', 'Dichtheit'], stationPruef(), { ein: [-1.5, 0], aus: [1.5, 0, 0] }),
  linieObj('pm.linie.start', 'Linienanfang: Aufgabe Motorblock mit Schwenkkran', ['Start', 'Aufgabe', 'Kran'], linienStart(), { ein: null, aus: [1.5, 0, 0] }),
  linieObj('pm.linie.ende', 'Linienende: Entnahme Motor mit Schwenkkran', ['Ende', 'Entnahme', 'Kran', 'Versand'], linienEnde(), { ein: [-1.5, 0], aus: null }),
  linieObj('pm.linie.dreh90r', 'Drehmodul 90° rechts (Hub-Dreh-Einheit)', ['Drehmodul', 'Ecke', 'Kurve', 'Umsetzer'], dreh90(1), { ein: [-0.5, 0], aus: [0, 0.5, 90] }),
  linieObj('pm.linie.dreh90l', 'Drehmodul 90° links (Hub-Dreh-Einheit)', ['Drehmodul', 'Ecke', 'Kurve', 'Umsetzer'], dreh90(-1), { ein: [-0.5, 0], aus: [0, -0.5, -90] }),
  linieObj('pm.linie.wende180', 'Wendemodul 180° (U-Umsetzer, Achsabstand 9 m, 3 m Versorgungsgang)', ['Drehmodul', 'Wende', 'U-Linie', 'Umsetzer'], wende180(), { ein: [-0.5, -4.5], aus: [-0.5, 4.5, 180] })
];

/* ---------- Produktionsinseln ---------- */
// Fertigungsinsel Zylinderkopf: 2 Horizontal-BAZ, Roboter mit Be-/Entladeband, Waschen, Messen, Schaltschränke, KSS, Späne
const inselZylinderkopf = () => {
  const P = [...hbaz(-2.3, -3.0, 0), ...hbaz(2.3, -3.0, 0), ...roboter(0, 1.0, 0, 1.0), box(0, 0.25, 1.0, 1.2, 0.5, 1.2, DG, 'lack')];
  P.push(...foerder(-1.6, 1.6, 3.4, 0.9, 0.85).map(p => p), ...zylinderkopf(-0.8, 0.88, 3.4), ...zylinderkopf(0.5, 0.88, 3.4));
  // Schutzzaun um den Roboterbereich, Tür mit Verriegelung
  P.push(...zaun(-3.9, -0.15, -3.9, 4.2), ...zaun(3.9, -0.15, 3.9, 4.2), ...zaun(-3.9, 4.2, -1.8, 4.2), ...zaun(1.8, 4.2, 3.9, 4.2), box(3.9, 1.1, 2.4, 0.1, 0.16, 0.1, RT, 'lack'));
  P.push(...lichtgitter(-1.75, 4.2, 0.2).slice(0, 2), ...[0.5, 1.0, 1.5].map(y => box(0, y, 4.2, 3.5, 0.012, 0.012, '#e74c3c', 'leucht')));
  // Umfeld
  P.push(...waschanlage(-6.2, 2.4, 90), ...messplatz(5.9, 3.0, 270), ...gitterbox(-2.0, 5.9, true), ...gitterbox(-0.5, 5.9, true), ...gitterbox(1.2, 5.9, false), ...gitterbox(2.7, 5.9, true));
  P.push(...schaltschrank(0, -6.6, 4, 180), ...kss(-5.6, -4.0, 90), ...spaene(-4.7, -6.6), ...spaene(4.7, -6.6), ...ampel(4.2, 0.2, 0, 2.6), ...infoTerminal(5.6, 0.8, 270));
  P.push(...werker(4.9, 4.6, 200), ...werker(-4.8, 4.4, 160, { top: '#3d5a80' }));
  P.push(...markierung(15.6, 14.4).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] - 0.2] })), linie(-7.8, 7.0, 7.8, 7.0, '#f4f6f8', 0.1));
  return P;
};
// Fertigungsinsel Kurbelwelle: Drehräumen, 2 Schleifmaschinen, Portallader, Waschen, Messen, Ein-/Auslaufband
const inselKurbelwelle = () => {
  const P = [...drehmaschine(-7.0, 0, 0), ...schleifmaschine(-1.5, -0.3, 0), ...schleifmaschine(4.3, -0.3, 0), ...waschanlage(9.4, 0.0, 0)];
  // Portallader über allen Maschinen (Höhe 4,6 m)
  for (const x of [-9.6, -4.2, 1.4, 7.0, 11.4]) for (const z of [-1.6, 2.0]) P.push(box(x, 2.4, z, 0.3, 4.8, 0.3, GE, 'lack'));
  for (const z of [-1.6, 2.0]) P.push(box(0.9, 4.8, z, 21.4, 0.4, 0.3, GE, 'lack'));
  P.push(box(-1.5, 5.05, 0.2, 1.0, 0.5, 3.8, DG, 'lack'), box(-1.5, 3.6, 1.0, 0.2, 2.2, 0.2, AN, 'metall'), box(-1.5, 2.5, 1.0, 0.5, 0.25, 0.3, '#9aa1aa', 'chrom'));
  P.push(box(4.0, 5.05, 0.2, 1.0, 0.5, 3.8, DG, 'lack'));
  // Ein- und Auslaufband mit Kurbelwellen
  P.push(...foerder(-11.6, -9.0, 2.6, 0.7, 0.9), ...foerder(10.8, 13.4, 2.6, 0.7, 0.9));
  for (const [x0, z] of [[-11.2, 2.6], [11.2, 2.6]]) for (let i = 0; i < 4; i++) P.push(cyl(x0 + i * 0.6, 1.0, z, 0.045, 0.55, '#7d8791', 'metall', { ax: 'z' }));
  // Zaun, Messen, Schaltschränke, KSS, Späne
  P.push(...zaun(-10.0, 3.4, 9.0, 3.4), ...zaun(-10.0, -3.6, 11.8, -3.6), ...messplatz(12.2, 5.0, 180), ...schaltschrank(-1.5, -4.4, 6, 180), ...kss(5.5, -5.2), ...spaene(-6.0, -5.2), ...spaene(9.4, -5.2));
  P.push(...ampel(9.2, 3.8, 0, 2.6), ...infoTerminal(-8.5, 4.4, 180), ...werker(-10.2, 4.4, 180), ...werker(11.8, 4.2, 200, { top: '#3d5a80' }));
  P.push(...markierung(26.4, 12.6).map(p => Object.assign({}, p, { p: [p.p[0] + 0.9, p.p[1], p.p[2] - 0.3] })));
  return P;
};
// Montageinsel U-Form (Vormontage Zylinderkopf): Werkbänke im U, Durchlaufregale, Schrauber, 3 Werker
const inselMontageU = () => {
  const P = [];
  // U: Rückseite (3 Plätze) und zwei Schenkel (je 2 Plätze), Werkstück wandert im U
  for (const x of [-1.6, 0, 1.6]) P.push(...tisch(x, -1.6, 1.5, 0.8), ...zylinderkopf(x, 0.88, -1.6), ...schrauber(x, -1.75, 2.4));
  for (const s of [-1, 1]) for (const z of [-0.2, 1.4]) P.push(...tisch(s * 2.8, z, 0.8, 1.5), ...zylinderkopf(s * 2.8, 0.88, z, 90), ...schrauber(s * 2.95, z, 2.4));
  for (const x of [-1.6, 0, 1.6]) P.push(...durchlaufregal(x, -2.75, 1.4, 0, 0.9));
  for (const s of [-1, 1]) P.push(...durchlaufregal(s * 3.95, 0.6, 2.8, s > 0 ? 270 : 90, 0.9));
  // Galgen für Schrauber
  for (const sx of [-3.3, 3.3]) P.push(box(sx, 1.25, -2.1, 0.08, 2.5, 0.08, AL, 'metall'));
  P.push(box(0, 2.5, -2.1, 6.6, 0.08, 0.08, AL, 'metall'), box(0, 2.45, -1.6, 4.8, 0.04, 0.25, '#f4f6f8', 'leucht'));
  P.push(matte(0, -0.6, 4.6, 1.2), matte(-1.8, 0.8, 1.0, 1.6), matte(1.8, 0.8, 1.0, 1.6));
  P.push(...werker(0, -0.7, 180), ...werker(-1.9, 0.6, 90, { top: '#3d5a80' }), ...werker(1.9, 0.6, 270), ...infoTerminal(-3.2, 2.7, 180), ...ampel(3.3, 2.7, 0, 2.2));
  P.push(...gitterbox(-1.2, 3.3), ...gitterbox(1.2, 3.3, false), ...markierung(8.8, 7.8).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] + 0.3] })));
  return P;
};
// Roboterzelle Entgraten/Beschriften: Roboter, Drehtisch mit 2 Stationen, Absaugung, Laser
const inselRoboterzelle = () => {
  const P = [...roboter(0, -0.6, 0, 1.0), box(0, 0.25, -0.6, 1.0, 0.5, 1.0, DG, 'lack'), cyl(0, 0.45, 1.6, 0.9, 0.9, '#59636e', 'metall', { seg: 24 }), box(0, 0.95, 1.6, 0.12, 0.6, 1.8, '#9aa1aa', 'metall'), ...motorblock(0, 0.9, 1.15), ...motorblock(0, 0.9, 2.05)];
  P.push(box(-2.0, 1.2, -1.9, 1.2, 2.4, 1.0, '#cfd8dc', 'lack'), cyl(-2.0, 2.8, -1.9, 0.2, 0.8, '#9aa1aa', 'metall'), box(2.0, 1.0, -1.9, 1.0, 2.0, 0.8, '#d5d9de', 'lack'));
  P.push(...zaun(-2.8, -2.5, 2.8, -2.5), ...zaun(-2.8, -2.5, -2.8, 2.5), ...zaun(2.8, -2.5, 2.8, 1.4), box(0, 1.2, 2.55, 2.0, 2.2, 0.03, '#e8a33d', 'glas', { o: 0.45 }));
  P.push(...schaltschrank(4.0, -1.2, 2, 270), ...ampel(2.95, 2.4, 0, 2.4), ...werker(0.3, 3.4, 180), ...markierung(7.2, 6.6).map(p => Object.assign({}, p, { p: [p.p[0] + 0.5, p.p[1], p.p[2] + 0.6] })));
  return P;
};

/* ---------- Werkstattfertigung: Produktionsstationen mit Umfeld ---------- */
const stationFraesen = () => [
  ...vbaz(0, 0, 0), ...voreinstell(3.2, -0.6, 270), ...wzschrank(-2.6, -0.8, 90), ...werkbank(-2.4, 1.9, 90, 1.6),
  ...gitterbox(0.0, 3.4, true), ...gitterbox(1.6, 3.4, false), ...spaene(2.6, 1.6, 90), ...saeulenkran(2.0, 2.6, 2.8, 3.6, 200),
  ...tisch(-0.9, 2.2, 1.0, 0.6), ...werker(0.5, 2.0, 180), ...infoTerminal(-1.5, 3.4, 180), ...ampel(1.6, -1.6, 0, 2.5),
  ...markierung(7.4, 6.4).map(p => Object.assign({}, p, { p: [p.p[0] + 0.2, p.p[1], p.p[2] + 0.9] }))
];
const stationDrehen = () => [
  ...drehmaschine(0, 0, 0), ...wzschrank(-2.9, -0.3, 90), ...werkbank(2.6, 1.9, 270, 1.6), ...gitterbox(-1.6, 2.6, true), ...gitterbox(0, 2.9, false),
  ...spaene(2.9, -0.4, 90), ...tisch(-2.6, 1.9, 1.0, 0.6), ...messplatz(1.4, 2.9, 180), ...werker(0.6, 1.6, 180), ...ampel(-2.1, -1.0, 0, 2.4),
  ...markierung(7.2, 5.6).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] + 0.8] }))
];
const stationHonen = () => [
  // Honmaschine Zylinderbohrungen (4,0 × 3,0 × 3,2 m) mit Beladung über Rollenbahn
  box(0, 1.6, 0, 3.6, 3.2, 2.6, WS, 'lack', { rr: 0.05 }), box(0, 0.05, 0, 3.66, 0.1, 2.66, DG, 'matt'), box(-0.4, 1.5, 1.31, 2.0, 1.2, 0.02, '#9fc4d8', 'glas'), ...pult(1.4, 1.5, 1.42),
  box(1.9, 3.0, -0.6, 0.07, 0.07, 0.07, GR, 'leucht'), ...kss(-3.2, -0.4, 90), ...foerder(-1.6, 1.6, 2.4, 0.9, 0.85), ...motorblock(-0.7, 0.88, 2.4), ...motorblock(0.7, 0.88, 2.4),
  ...messplatz(3.2, 2.2, 270), ...gitterbox(-3.0, 3.0, true), ...werker(1.7, 3.3, 180), ...ampel(-1.9, -1.6, 0, 2.6),
  ...markierung(8.4, 6.0).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] + 0.9] }))
];
const stationMessraum = () => [
  // Messkabine (klimatisiert) mit KMG, Rechnerplatz, Teileablage
  ...kmg(0, -0.2, 90), ...messplatz(-0.2, 2.0, 180), ...tisch(2.4, 1.6, 1.4, 0.7), ...motorblock(2.1, 0.88, 1.6), ...zylinderkopf(2.7, 0.88, 1.6), ...wzschrank(-2.8, 1.6, 90),
  box(-3.5, 1.5, 0, 0.06, 3.0, 5.2, '#cfe3ee', 'glas', { o: 0.35 }), box(3.5, 1.5, 0, 0.06, 3.0, 5.2, '#cfe3ee', 'glas', { o: 0.35 }), box(0, 1.5, -2.6, 7.0, 3.0, 0.06, '#cfe3ee', 'glas', { o: 0.35 }),
  box(-1.9, 1.5, 2.6, 3.2, 3.0, 0.06, '#cfe3ee', 'glas', { o: 0.35 }), box(2.6, 1.5, 2.6, 1.8, 3.0, 0.06, '#cfe3ee', 'glas', { o: 0.35 }),
  ...[[-3.5, -2.6], [3.5, -2.6], [-3.5, 2.6], [3.5, 2.6], [0.3, 2.6], [1.7, 2.6]].map(([x, z]) => box(x, 1.5, z, 0.1, 3.0, 0.1, AN, 'metall')),
  box(-2.6, 2.4, -2.45, 0.8, 0.4, 0.25, '#eef1f4', 'kunststoff'), ...werker(0.6, 2.0, 180, { top: '#eef1f4' })
];
const stationPruefstand = () => [
  // Heißtest-Prüfstand: Prüfzelle (schallgedämmt) mit Motor auf Palette, Bremse, Abgasabsaugung; Leitwarte davor
  box(0, 0.06, 0, 7.0, 0.12, 5.0, '#8d969f', 'matt'),
  box(0, 1.9, -2.5, 7.0, 3.8, 0.2, '#b8c2cc', 'lack'), box(-3.5, 1.9, 0, 0.2, 3.8, 5.0, '#b8c2cc', 'lack'), box(3.5, 1.9, 0, 0.2, 3.8, 5.0, '#b8c2cc', 'lack'),
  box(-1.4, 1.9, 2.5, 4.2, 3.8, 0.2, '#b8c2cc', 'lack'), box(2.45, 0.6, 2.5, 2.1, 1.2, 0.2, '#b8c2cc', 'lack'), box(2.45, 3.3, 2.5, 2.1, 1.0, 0.2, '#b8c2cc', 'lack'), box(2.45, 2.0, 2.5, 2.1, 1.6, 0.06, '#9fc4d8', 'glas'),
  box(-0.6, 0.35, -0.2, 1.4, 0.5, 1.2, '#59636e', 'metall'), ...motor(-0.6, 0.6, -0.2), box(0.8, 0.6, -0.2, 0.9, 1.0, 0.9, BL, 'lack'), cyl(0.15, 0.95, -0.2, 0.06, 0.6, '#9aa1aa', 'chrom', { ax: 'x' }),
  cyl(-0.6, 2.6, -1.0, 0.18, 2.4, '#9aa1aa', 'metall'), box(-0.6, 3.6, -1.7, 0.4, 0.4, 1.4, '#9aa1aa', 'metall'), box(2.6, 1.0, -1.8, 1.2, 2.0, 0.6, '#d5d9de', 'lack'),
  // Leitwarte vor der Zelle
  box(2.45, 0.9, 3.3, 2.2, 0.06, 0.8, '#5a6573', 'matt'), ...K.legs(2.15, 0.75, 0.88, 0.03, '#9aa1aa', 0.04), ...K.screen(1.9, 1.25, 3.0, 0.6, 0.38), ...K.screen(2.6, 1.25, 3.0, 0.6, 0.38), ...K.screen(3.3, 1.25, 3.0, 0.6, 0.38),
  ...werker(2.4, 3.9, 180), ...schaltschrank(-1.6, 3.2, 3), ...ampel(3.7, 3.0, 0, 2.6), ...markierung(7.6, 7.2).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] + 1.0] }))
];
const stationNacharbeit = () => [
  ...tisch(0, 0, 2.0, 1.0), ...motor(-0.3, 0.88, 0), ...saeulenkran(-1.9, -0.9, 2.6, 3.6, 20), ...wzschrank(1.8, -0.8, 0), ...werkbank(1.9, 1.3, 270, 1.6), ...infoTerminal(-0.9, 1.5, 180),
  ...gitterbox(-1.2, 2.3, false), ...werker(0.3, 1.0, 180), ...ampel(-2.1, 1.6, 0, 2.2),
  ...markierung(6.0, 5.0, RT)
];

/* ---------- Ausrüstung (einzeln) ---------- */
const AUSR = [
  O('pm.hw.hbaz', 'Horizontal-Bearbeitungszentrum (Kurbelgehäuse/Zylinderkopf)', 'Ausrüstung', ['BAZ', 'Fräsen', 'Zerspanung', 'Maschine'], hbaz(0, 0)),
  O('pm.hw.vbaz', 'Vertikal-Bearbeitungszentrum 5-Achs', 'Ausrüstung', ['BAZ', 'Fräsen', 'Maschine'], vbaz(0, 0)),
  O('pm.hw.drehmaschine', 'CNC-Drehmaschine mit Stangenlader', 'Ausrüstung', ['Drehen', 'Maschine'], drehmaschine(0, 0)),
  O('pm.hw.schleifmaschine', 'Kurbelwellen-Schleifmaschine', 'Ausrüstung', ['Schleifen', 'Kurbelwelle', 'Maschine'], schleifmaschine(0, 0)),
  O('pm.hw.kmg', 'Koordinatenmessgerät (Portal)', 'Ausrüstung', ['Messen', 'Qualität', 'KMG'], kmg(0, 0)),
  O('pm.hw.waschanlage', 'Teilewaschanlage (Durchlauf)', 'Ausrüstung', ['Reinigung', 'Waschen'], waschanlage(0, 0)),
  O('pm.hw.kss', 'Kühlschmierstoff-Anlage (Filter, Tank)', 'Ausrüstung', ['KSS', 'Medien'], kss(0, 0)),
  O('pm.hw.roboter', 'Industrieroboter 6-Achs (120 kg) auf Sockel', 'Ausrüstung', ['Roboter', 'Automation'], roboter(0, 0)),
  O('pm.hw.saeulenkran', 'Säulenschwenkkran (500 kg, 3 m Ausladung)', 'Ausrüstung', ['Kran', 'Hebezeug'], saeulenkran(0, 0, 3.0, 3.8)),
  O('pm.hw.durchlaufregal', 'Durchlaufregal (Kanban, KLT)', 'Ausrüstung', ['Regal', 'KLT', 'Bereitstellung'], durchlaufregal(0, 0, 2.6)),
  O('pm.hw.schrauber', 'EC-Schrauber am Balancer mit Galgen', 'Ausrüstung', ['Schrauber', 'Montage'], [box(0, 1.3, -0.4, 0.08, 2.6, 0.08, AL, 'metall'), box(0, 2.6, 0, 0.08, 0.08, 0.9, AL, 'metall'), box(0, 0.02, -0.4, 0.5, 0.04, 0.5, DG, 'metall'), ...schrauber(0, 0.3, 2.6), box(0.4, 1.1, -0.4, 0.3, 0.4, 0.2, '#2b3138', 'kunststoff')]),
  O('pm.hw.motor', 'Motor komplett auf Werkstückträger', 'Ausrüstung', ['Motor', 'Werkstück'], [...wt(0, 0, 0), ...motor(0, 0.13, 0)]),
  O('pm.hw.motorblock', 'Motorblock / Kurbelgehäuse (Rohteil)', 'Ausrüstung', ['Motor', 'Werkstück', 'Rohteil'], motorblock(0, 0, 0)),
  O('pm.hw.zylinderkopf', 'Zylinderkopf', 'Ausrüstung', ['Motor', 'Werkstück'], zylinderkopf(0, 0, 0)),
  O('pm.hw.motorgestell', 'Transportgestell Motoren (4 Plätze)', 'Ausrüstung', ['Ladungsträger', 'Motor', 'Versand'], [box(0, 0.35, 0, 2.4, 0.7, 1.2, '#59636e', 'metall', { o: 0.9 }), ...[-0.85, -0.3, 0.3, 0.85].flatMap(x => motor(x, 0.7, 0, 90))]),
  O('pm.hw.spaene', 'Späne-Kippbehälter', 'Ausrüstung', ['Späne', 'Entsorgung'], spaene(0, 0)),
  O('pm.hw.schaltschrank', 'Schaltschrankreihe (3 Felder)', 'Ausrüstung', ['Elektro', 'Steuerung'], schaltschrank(0, 0, 3)),
  O('pm.hw.voreinstell', 'Werkzeug-Voreinstellgerät', 'Ausrüstung', ['Werkzeug', 'Messen'], voreinstell(0, 0)),
  O('pm.hw.ampel', 'Signalsäule (Andon)', 'Ausrüstung', ['Andon', 'Lean'], ampel(0, 0, 0, 2.4)),
  O('pm.hw.lichtgitter', 'Sicherheits-Lichtgitter', 'Ausrüstung', ['Sicherheit'], lichtgitter(0, 0, 1.2))
];


/* ---------- Großmotoren (Baureihen im Stil MTU 2000/4000, Schiffs-, Bahn-, Energie- und Bergbauantriebe) ----------
   Abmessungen gerundet nach öffentlichen Datenblättern der Baureihen (Motor ohne Anbauten):
     12V (Baureihe 2000)   ca. 2,4 × 1,5 × 1,5 m, rund 4 t
     16V (Baureihe 4000)   ca. 3,3 × 1,6 × 2,2 m, rund 9 t
     20V (Baureihe 4000)   ca. 3,9 × 1,7 × 2,3 m, rund 11 t
   Montage als Stationsmontage auf Schwerlast-FTS im 8-m-Raster mit beidseitigen Arbeitsbühnen. */
const hebe = (parts, dy) => parts.map(p => Object.assign({}, p, { p: [p.p[0], p.p[1] + dy, p.p[2]] }, p.piv ? { piv: [p.piv[0], p.piv[1] + dy, p.piv[2]] } : {}));
const MG = '#46525e', MG2 = '#2f363d';
const grossmotor = (L, B, H, x = 0, y = 0, z = 0, a = 0, o = {}) => {
  const c = o.farbe || MG, n = o.zyl || 8, P = [
    box(0, y + H * 0.08, 0, L * 0.86, H * 0.16, B * 0.5, MG2, 'metall'),                                    // Ölwanne
    box(0, y + H * 0.33, 0, L * 0.88, H * 0.34, B * 0.72, c, 'metall', { rr: 0.05 }),                       // Kurbelgehäuse
    box(-L * 0.02, y + H * 0.62, 0, L * 0.8, H * 0.08, B * 0.3, c, 'metall'),                               // V-Raum
    box(L * 0.47, y + H * 0.38, 0, 0.3, H * 0.62, B * 0.82, MG2, 'metall'),                                 // Schwungradgehäuse
    cyl(L * 0.5 - 0.02, y + H * 0.36, 0, H * 0.24, 0.12, '#1f2328', 'metall', { ax: 'x', seg: 20 }),
    box(-L * 0.47, y + H * 0.36, 0, 0.26, H * 0.5, B * 0.6, MG2, 'metall'),                                // Rädertrieb vorn
    cyl(-L * 0.5 - 0.06, y + H * 0.26, 0, H * 0.1, 0.14, '#1f2328', 'metall', { ax: 'x' }),                // Schwingungsdämpfer
    box(-L * 0.04, y + H * 0.9, 0, L * 0.66, H * 0.1, B * 0.22, '#5c6976', 'metall', { rr: 0.03 })        // Ladeluftleitung
  ];
  for (const s of [-1, 1]) {
    P.push(box(-L * 0.04, y + H * 0.66, s * B * 0.27, L * 0.78, H * 0.28, B * 0.28, c, 'metall', { rr: 0.03 }));   // Zylinderbank
    for (let i = 0; i < n; i++) P.push(box(-L * 0.42 + (i + 0.5) * L * 0.78 / n, y + H * 0.83, s * B * 0.32, L * 0.78 / n - 0.05, H * 0.07, B * 0.2, '#262c32', 'metall')); // Zylinderköpfe
    P.push(cyl(-L * 0.04, y + H * 0.76, s * B * 0.46, H * 0.05, L * 0.76, '#a8aeb4', 'chrom', { ax: 'x' }));        // Abgassammelrohr (isoliert)
    P.push(cyl(-L * 0.4, y + H * 0.82, s * B * 0.26, H * 0.12, B * 0.24, '#9aa1aa', 'metall', { ax: 'z', seg: 16 })); // Abgasturbolader
    P.push(box(L * 0.1, y + H * 0.28, s * B * 0.38, L * 0.3, H * 0.16, 0.06, '#6b7782', 'metall'));               // Kurbelraumdeckel
  }
  P.push(cyl(-L * 0.4, y + H * 0.97, 0, H * 0.07, 0.3, '#9aa1aa', 'metall'));
  return T(P, x, z, a);
};
const MOTOR = { m12: [2.4, 1.5, 1.5, 6], m16: [3.3, 1.6, 2.2, 8], m20: [3.9, 1.7, 2.3, 10] };
const motorG = (k, x, y, z, a = 0, o = {}) => { const [L, B, H, n] = MOTOR[k]; return grossmotor(L, B, H, x, y, z, a, Object.assign({ zyl: n }, o)); };
// Schwerlast-FTS mit Montagebock (Last bis 15 t)
const ftsSchwer = (x = 0, z = 0, a = 0, last = true) => T([
  box(0, 0.22, 0, 5.0, 0.4, 2.5, '#e0b334', 'lack', { rr: 0.06 }), box(0, 0.43, 0, 4.8, 0.04, 2.3, '#3b4450', 'metall'),
  box(-2.52, 0.25, 0, 0.04, 0.2, 2.2, '#0A967A', 'leucht'), box(2.52, 0.25, 0, 0.04, 0.2, 2.2, '#c0392b', 'leucht'),
  ...(last ? [box(-1.2, 0.68, 0, 0.5, 0.5, 1.4, '#59636e', 'metall'), box(1.2, 0.68, 0, 0.5, 0.5, 1.4, '#59636e', 'metall')] : [])
], x, z, a);
// Arbeitsbühne (Podest mit Geländer und Treppe) entlang x, Seite s (+1/−1: Geländer außen)
const buehne = (x, z, L = 5.0, b = 1.3, h = 1.0, s = 1) => {
  const P = [box(x, h, z, L, 0.06, b, '#9aa1aa', 'metall')];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) P.push(box(x + sx * (L / 2 - 0.06), h / 2, z + sz * (b / 2 - 0.06), 0.08, h, 0.08, '#f2c94c', 'lack'));
  P.push(box(x, h + 1.05, z + s * (b / 2 - 0.03), L, 0.05, 0.05, '#f2c94c', 'lack'), box(x, h + 0.55, z + s * (b / 2 - 0.03), L, 0.04, 0.04, '#f2c94c', 'lack'));
  for (let i = 0; i <= Math.round(L / 1.25); i++) P.push(box(x - L / 2 + i * L / Math.round(L / 1.25), h + 0.55, z + s * (b / 2 - 0.03), 0.04, 1.05, 0.04, '#f2c94c', 'lack'));
  for (let k = 0; k < 4; k++) P.push(box(x - L / 2 - 0.25 - k * 0.25, h * (4 - k) / 5, z, 0.25, 0.04, b - 0.1, '#9aa1aa', 'metall'));
  return P;
};
const werkzeugwagen = (x, z, a = 0) => T([box(0, 0.5, 0, 0.9, 0.9, 0.5, '#c0392b', 'lack', { rr: 0.02 }), box(0, 0.97, 0, 0.92, 0.04, 0.52, '#2b3138', 'gummi'), ...K.casters(0.9, 0.5, 0.05)], x, z, a);
const GL = 8.0;
const stationGross = (art = 'manuell') => {
  const P = [...markierung(GL, 10, '#f2c94c', 0.1), ...ftsSchwer(0, 0), ...motorG('m16', 0, 0.93, 0)];
  for (const s of [-1, 1]) {
    P.push(...buehne(0.3, s * 1.95, 4.6, 1.3, 1.0, s), ...werkzeugwagen(-2.6, s * 3.0, s > 0 ? 180 : 0), ...durchlaufregal(-0.6, s * 4.3, 2.6, s > 0 ? 180 : 0), ...durchlaufregal(2.2, s * 4.3, 2.6, s > 0 ? 180 : 0));
    P.push(...hebe(werker(s > 0 ? 0.8 : -0.4, s * 2.0, s > 0 ? 180 : 0), 1.03));
  }
  P.push(...saeulenkran(3.4, -3.1, 3.2, 5.0, 115), ...infoTerminal(3.6, 3.2, 180), ...ampel(-3.7, -3.4, 0, 2.6), ...schrauber(-0.9, 1.0, 4.4), ...schrauber(1.2, -1.0, 4.4));
  if (art === 'qs') P.push(...[-1, 1].map(s => box(0, 2.6, s * 1.4, 0.15, 5.2, 0.15, '#d5d9de', 'lack')), box(0, 5.2, 0, 0.3, 0.3, 3.0, '#d5d9de', 'lack'), box(0, 4.9, 0, 0.3, 0.25, 0.3, '#2b3138', 'kunststoff'));
  return P;
};
const pufferGross = () => [linie(-GL / 2, -1.6, GL / 2, -1.6, '#f4f6f8', 0.12), linie(-GL / 2, 1.6, GL / 2, 1.6, '#f4f6f8', 0.12), ...ftsSchwer(0.4, 0), ...motorG('m16', 0.4, 0.93, 0)];
const kurveGross = s => {
  // Fahrspur als Bogen (Radius 4 m um die Ecke (−4, s·4)), FTS unter 45°
  const P = [], cx = -4, cz = s * 4;
  for (const r of [2.4, 5.6]) for (let i = 0; i < 9; i++) { const a0 = (i / 9) * Math.PI / 2, a1 = ((i + 1) / 9) * Math.PI / 2, x0 = cx + r * Math.sin(a0), z0 = cz - s * r * Math.cos(a0), x1 = cx + r * Math.sin(a1), z1 = cz - s * r * Math.cos(a1); P.push(linie(x0, z0, x1, z1, '#f4f6f8', 0.12)); }
  P.push(...T(ftsSchwer(0, 0, 0, false), -1.2, s * 1.2, s * 45), box(0, 0.004, 0, 0.01, 0.008, 0.01, '#f4f6f8', 'lack'));
  P.push(box(-3.9, 0.004, -s * 3.9, 0.1, 0.008, 0.1, '#f4f6f8', 'lack'), box(3.9, 0.004, s * 3.9, 0.1, 0.008, 0.1, '#f4f6f8', 'lack'));
  return P;
};
const startGross = () => [...markierung(GL, 10, '#f2c94c', 0.1), ...ftsSchwer(0.6, 0), box(0.6, 1.33, 0, 3.0, 0.8, 1.2, MG, 'metall', { rr: 0.05 }), ...saeulenkran(-2.8, -2.6, 3.4, 5.0, 60), ...gitterbox(-2.6, 3.6), ...gitterbox(-1.0, 3.6), ...werkzeugwagen(2.4, 3.0, 180), ...werker(-1.2, 2.0, 180), ...werker(2.6, -2.2, 0), ...infoTerminal(3.6, 3.6, 180), ...ampel(3.7, -3.4, 0, 2.6)];
const endeGross = () => [...markierung(GL, 10, '#f2c94c', 0.1), ...ftsSchwer(-1.2, 0), ...motorG('m16', -1.2, 0.93, 0), box(2.4, 0.3, -3.0, 3.8, 0.6, 2.0, '#59636e', 'metall'), ...motorG('m16', 2.4, 0.6, -3.0), ...saeulenkran(1.4, -1.0, 3.4, 5.0, 270), ...werker(1.8, 2.2, 180), ...ampel(3.7, 3.4, 0, 2.6)];
// Prüfzelle Großmotor (Heißtest mit Wasserwirbelbremse) inkl. Leitwarte, 12 × 12 m
const pruefzelle = () => {
  const P = [box(0, 0.06, -1.5, 12, 0.12, 9, '#8d969f', 'matt')], W2 = '#cbc6ba';
  P.push(box(0, 3.5, -6.0, 12, 7.0, 0.3, W2, 'lack'), box(-6.0, 3.5, -1.5, 0.3, 7.0, 9.0, W2, 'lack'), box(6.0, 3.5, -3.6, 0.3, 7.0, 4.8, W2, 'lack'), box(6.0, 5.6, 0.85, 0.3, 2.8, 4.1, W2, 'lack'), box(6.06, 2.1, 0.85, 0.06, 4.2, 4.0, '#9aa1aa', 'metall'));
  P.push(box(-2.6, 2.5, 3.0, 6.8, 5.0, 0.3, W2, 'lack'), box(-2.6, 1.9, 3.06, 5.6, 1.4, 0.06, '#9fc4d8', 'glas'), box(3.3, 3.5, 3.0, 5.4, 7.0, 0.3, W2, 'lack'), box(-2.6, 6.0, 3.0, 6.8, 2.0, 0.3, W2, 'lack'));
  P.push(box(0, 7.05, -6.0, 12.3, 0.12, 0.4, '#a9a395', 'lack'), box(0, 7.05, 3.0, 12.3, 0.12, 0.4, '#a9a395', 'lack'));
  P.push(box(-1.2, 0.45, -1.8, 4.6, 0.7, 2.2, '#59636e', 'metall'), ...motorG('m20', -1.2, 0.8, -1.8), box(2.4, 1.0, -1.8, 1.8, 1.8, 1.6, '#2d6fa3', 'lack'), cyl(1.15, 1.2, -1.8, 0.12, 0.9, '#9aa1aa', 'chrom', { ax: 'x' }));
  for (const s of [-1, 1]) P.push(cyl(-2.4, 5.2, -1.8 + s * 0.6, 0.3, 5.0, '#a8aeb4', 'metall'), cyl(-2.4, 7.8, -1.8 + s * 0.6, 0.32, 1.2, '#7d8791', 'metall'));
  P.push(box(3.6, 6.4, -4.4, 3.0, 1.2, 1.6, '#9aa1aa', 'metall'), box(-4.8, 1.4, -4.8, 1.6, 2.8, 1.6, '#d5d9de', 'lack'), box(-4.6, 0.9, 1.4, 2.0, 1.8, 1.4, '#e0b334', 'lack'));
  // Leitwarte
  P.push(box(-2.6, 0.9, 4.4, 5.6, 0.06, 0.9, '#5a6573', 'matt'), ...K.legs(5.5, 0.85, 0.88, 0.03, '#9aa1aa', 0.04));
  for (const x of [-4.6, -3.6, -2.6, -1.6, -0.6]) P.push(...K.screen(x, 1.25, 4.15, 0.62, 0.4));
  P.push(...schaltschrank(3.3, 4.4, 4, 0), ...werker(-3.3, 5.1, 180), ...werker(-1.4, 5.2, 200, { top: '#3d5a80' }), ...ampel(5.8, 3.4, 0, 2.6), ...markierung(12.4, 12.6, '#f2c94c', 0.1).map(p => Object.assign({}, p, { p: [p.p[0], p.p[1], p.p[2] - 0.0] })));
  return P;
};
// Bearbeitungszentrum für Großmotoren-Kurbelgehäuse (Portalbauweise), 9 × 6,5 × 5,2 m
const bazGross = (x = 0, z = 0, a = 0) => T([
  box(0, 0.4, 0, 8.4, 0.8, 5.6, '#59636e', 'metall'), box(0, 2.9, -0.2, 8.4, 4.2, 5.2, WS, 'lack', { rr: 0.08 }), box(0, 5.05, -0.6, 6.0, 0.3, 3.0, HG, 'lack'),
  box(-0.8, 2.6, 2.41, 4.6, 2.6, 0.02, '#9fc4d8', 'glas'), box(-0.8, 2.6, 2.405, 4.8, 2.8, 0.01, '#4b5058', 'metall'), box(2.6, 1.4, 2.45, 1.4, 2.6, 0.04, NV, 'lack'),
  ...pult(3.6, 1.6, 3.0), box(3.6, 1.6, 2.7, 0.06, 0.06, 0.6, AN, 'metall'), box(4.0, 4.9, 2.2, 0.1, 0.1, 0.1, GR, 'leucht'),
  box(-5.0, 2.4, -0.8, 1.6, 4.8, 2.6, '#d5d9de', 'lack'), box(-5.0, 1.0, -0.8, 1.62, 0.1, 2.62, NV, 'lack'),       // Werkzeugmagazin
  box(1.5, 0.6, -3.5, 4.0, 1.2, 1.0, '#59636e', 'metall'), box(4.0, 1.1, -3.8, 1.4, 0.15, 0.6, '#6d7680', 'metall'),   // Späneförderer
  box(-2.4, 0.8, -3.7, 2.4, 1.6, 1.4, BL, 'lack'), box(4.6, 1.2, -1.2, 0.8, 2.4, 2.4, '#d5d9de', 'lack'),
  box(-0.4, 0.95, 4.2, 3.6, 0.1, 2.0, '#9aa1aa', 'metall'), box(-0.4, 0.45, 4.2, 3.4, 0.9, 1.8, '#59636e', 'metall'), box(-0.4, 1.35, 4.2, 2.8, 0.7, 1.2, MG, 'metall', { rr: 0.05 })   // Rüstplatz mit Kurbelgehäuse
], x, z, a);
const kwDrehGross = (x = 0, z = 0, a = 0) => T([
  box(0, 0.5, 0, 11.0, 1.0, 3.0, '#59636e', 'metall'), box(0, 1.9, -0.1, 11.0, 1.8, 2.8, WS, 'lack', { rr: 0.06 }), box(0, 1.8, 1.31, 8.0, 1.2, 0.02, '#9fc4d8', 'glas'),
  cyl(0, 1.8, 0.2, 0.18, 7.6, '#9aa1aa', 'metall', { ax: 'x' }), ...pult(4.8, 1.7, 1.45), box(-6.0, 0.6, 0, 1.2, 1.2, 2.0, '#59636e', 'metall'), box(0, 0.5, -1.9, 6.0, 1.0, 0.8, HG, 'lack'), box(5.2, 2.9, 1.1, 0.1, 0.1, 0.1, GR, 'leucht')
], x, z, a);
// Lackiererei Großmotoren
const skid = (x, z, mit = true, k = 'm16') => [box(x, 0.35, z, 5.0, 0.7, 2.0, '#59636e', 'metall'), ...Array.from({ length: 10 }, (_, i) => cyl(x - 2.25 + i * 0.5, 0.72, z, 0.06, 1.9, '#b8bec6', 'chrom', { ax: 'z' })), box(x, 0.82, z, 4.2, 0.12, 1.6, '#3b4450', 'metall'), ...(mit ? motorG(k, x, 0.88, z) : [])];
const kabineHuelle = (L, B, H, c, fenster = true) => [box(0, H / 2, -B / 2, L, H, 0.15, c, 'lack'), box(-L / 2, H / 2, 0, 0.15, H, B, c, 'lack'), box(L / 2, H / 2, 0, 0.15, H, B, c, 'lack'), box(0, H * 0.75, B / 2, L, H * 0.5, 0.15, c, 'lack'), box(-L / 4, H * 0.25, B / 2, L / 2, H * 0.5, 0.15, c, 'lack'), ...(fenster ? [box(L / 4, H * 0.3, B / 2, L / 2 - 0.2, H * 0.5, 0.05, '#9fc4d8', 'glas')] : [box(L / 4, H * 0.25, B / 2, L / 2, H * 0.5, 0.15, c, 'lack')]), box(0, H + 0.4, 0, L, 0.8, B, '#cfd6dc', 'lack')];
const lackKabine = () => [...kabineHuelle(12, 8, 6, '#e3e7ea'), ...skid(0, 0), ...werker(-2.2, 1.8, 200, { top: '#f4f6f8', vest: null }), ...werker(2.6, -1.8, 20, { top: '#f4f6f8' }), cyl(4.5, 8.0, -2.5, 0.5, 3.6, '#a8aeb4', 'metall'), box(-4.5, 7.0, -2.5, 2.6, 1.4, 2.2, '#9aa1aa', 'metall'), box(-6.6, 1.2, 2.0, 1.2, 2.4, 1.4, '#f2c94c', 'lack'), ...ampel(6.3, 3.6, 0, 2.6)];
const vorbehandlung = () => [...kabineHuelle(10, 7, 5.5, '#d5dde3', false), ...skid(0, 0), box(-3.0, 6.6, 0, 3.0, 1.4, 4.0, BL, 'lack'), cyl(3.2, 6.8, -1.5, 0.4, 1.8, '#9aa1aa', 'metall'), box(5.6, 0.8, -2.0, 1.2, 1.6, 2.4, BL, 'lack'), ...pult(5.4, 1.4, 2.0)];
const trockner = () => [...kabineHuelle(16, 7, 5.5, '#c9ced4', false), ...skid(-4, 0), ...skid(4, 0), box(0, 6.8, -1.5, 4.0, 1.8, 2.6, '#9aa1aa', 'metall'), cyl(4.0, 7.8, 1.2, 0.45, 3.2, '#a8aeb4', 'metall'), box(-8.6, 1.2, 1.6, 1.0, 2.4, 2.0, '#d5d9de', 'lack'), ...ampel(8.2, 3.6, 0, 2.6)];
const abkleben = () => [...markierung(8, 6, '#f2c94c', 0.08), ...skid(0, 0), ...buehne(0, -1.75, 4.4, 1.1, 0.8, -1), ...werker(0.4, 1.6, 180), ...hebe(werker(-0.6, -1.75, 0), 0.83), ...K.shelf(2.0, 0.6, 2.0, 5, '#c8ced5', '#f2994a').map(p => Object.assign({}, p, { p: [p.p[0] + 2.6, p.p[1], p.p[2] + 2.6] })), ...werkzeugwagen(-2.8, 2.2, 180)];
const mischraum = () => [box(0, 1.75, 0, 6.0, 3.5, 4.0, '#e8d27a', 'lack'), box(0, 1.2, 2.01, 1.4, 2.2, 0.02, '#b9a45a', 'lack'), box(1.8, 2.6, 2.02, 0.5, 0.45, 0.01, '#f2c94c', 'kunststoff'), cyl(-2.0, 4.0, -1.0, 0.25, 1.2, '#9aa1aa', 'metall'), ...[-1.8, -0.9, 0].map(x => cyl(x + 3.8, 0.45, -1.2, 0.29, 0.9, '#2d6fa3', 'lack'))];

const GROSS = [
  O('pm.gm.motor12v', 'Großmotor 12V (Baureihe 2000-Klasse)', 'Großmotoren', ['Motor', 'Großmotor', 'Werkstück'], motorG('m12', 0, 0, 0)),
  O('pm.gm.motor16v', 'Großmotor 16V (Baureihe 4000-Klasse)', 'Großmotoren', ['Motor', 'Großmotor', 'Werkstück'], motorG('m16', 0, 0, 0)),
  O('pm.gm.motor20v', 'Großmotor 20V (Baureihe 4000-Klasse)', 'Großmotoren', ['Motor', 'Großmotor', 'Werkstück'], motorG('m20', 0, 0, 0)),
  O('pm.gm.fts', 'Schwerlast-FTS mit Montagebock (15 t)', 'Großmotoren', ['FTS', 'AGV', 'Montage'], ftsSchwer(0, 0)),
  O('pm.gm.baz', 'Bearbeitungszentrum Kurbelgehäuse Großmotor (Portal)', 'Großmotoren', ['BAZ', 'Kurbelgehäuse', 'Zerspanung', 'Maschine'], bazGross()),
  O('pm.gm.kwdreh', 'Kurbelwellen-Dreh-Fräszentrum Großmotor', 'Großmotoren', ['Kurbelwelle', 'Drehen', 'Maschine'], kwDrehGross()),
  O('pm.gm.pruefzelle', 'Motorenprüfstand Großmotor (Heißtest-Zelle mit Leitwarte)', 'Großmotoren', ['Prüfstand', 'Heißtest', 'Prüffeld', 'Qualität'], pruefzelle(), { meta: { Prüfung: 'Abnahmelauf unter Last mit Wasserwirbelbremse', Technik: 'Abgas- und Zuluftanlage, Kraftstoff- und Kühlwasserkonditionierung' } }),
  O('pm.lack.vorbehandlung', 'Lackiererei: Wasch-/Vorbehandlungskabine Großmotor', 'Lackiererei', ['Lackieren', 'Waschen', 'Vorbehandlung'], vorbehandlung()),
  O('pm.lack.kabine', 'Lackiererei: Spritzkabine Großmotor (Nassabscheidung)', 'Lackiererei', ['Lackieren', 'Kabine'], lackKabine()),
  O('pm.lack.trockner', 'Lackiererei: Umlufttrockner (2 Plätze)', 'Lackiererei', ['Lackieren', 'Trockner', 'Ofen'], trockner()),
  O('pm.lack.abkleben', 'Lackiererei: Abklebe-/Maskierplatz mit Bühne', 'Lackiererei', ['Lackieren', 'Maskieren'], abkleben()),
  O('pm.lack.skid', 'Lackiererei: Skidförderer mit Motor', 'Lackiererei', ['Förderer', 'Skid'], skid(0, 0)),
  O('pm.lack.mischraum', 'Lackiererei: Farbmisch- und Lackraum (Ex-Bereich)', 'Lackiererei', ['Lack', 'Gefahrstoff'], mischraum()),
  linieObj('pm.gm.station', 'Großmotor-Montagestation (FTS, Takt 8 m, Bühnen beidseitig)', ['Station', 'Großmotor', 'FTS', 'Stationsmontage'], stationGross(), { ein: [-4, 0], aus: [4, 0, 0] }, { category: 'Produktionsmodule/Großmotoren-Linie' }),
  linieObj('pm.gm.station.qs', 'Großmotor-Qualitätsstation mit Kameraportal', ['Station', 'Großmotor', 'Qualität'], stationGross('qs'), { ein: [-4, 0], aus: [4, 0, 0] }, { category: 'Produktionsmodule/Großmotoren-Linie' }),
  linieObj('pm.gm.puffer', 'Großmotor-Linie: FTS-Pufferplatz 8 m', ['Puffer', 'FTS', 'Großmotor'], pufferGross(), { ein: [-4, 0], aus: [4, 0, 0] }, { category: 'Produktionsmodule/Großmotoren-Linie' }),
  linieObj('pm.gm.kurve90r', 'Großmotor-Linie: FTS-Kurve 90° rechts', ['Kurve', 'FTS', 'Drehmodul'], kurveGross(1), { ein: [-4, 0], aus: [0, 4, 90] }, { category: 'Produktionsmodule/Großmotoren-Linie' }),
  linieObj('pm.gm.kurve90l', 'Großmotor-Linie: FTS-Kurve 90° links', ['Kurve', 'FTS', 'Drehmodul'], kurveGross(-1), { ein: [-4, 0], aus: [0, -4, -90] }, { category: 'Produktionsmodule/Großmotoren-Linie' }),
  linieObj('pm.gm.start', 'Großmotor-Linie: Start (Kurbelgehäuse aufsetzen)', ['Start', 'Großmotor', 'Kran'], startGross(), { ein: null, aus: [4, 0, 0] }, { category: 'Produktionsmodule/Großmotoren-Linie' }),
  linieObj('pm.gm.ende', 'Großmotor-Linie: Ende (Übergabe an Prüffeld)', ['Ende', 'Großmotor', 'Kran'], endeGross(), { ein: [-4, 0], aus: null }, { category: 'Produktionsmodule/Großmotoren-Linie' })
];

HSS.library.registerPack({ format: 'hss-library', version: 1, name: 'Produktionsmodule', objects: [
  O('pm.insel.zylinderkopf', 'Fertigungsinsel Zylinderkopf (2 BAZ, Roboter, Waschen, Messen)', 'Produktionsinseln', ['Insel', 'Zerspanung', 'BAZ', 'Roboter', 'Zylinderkopf', 'Motor'], inselZylinderkopf(), { meta: { Maschinen: '2 Horizontal-BAZ, Roboter 120 kg, Waschanlage, SPC-Messplatz', Bedienung: '1–2 Werker je Schicht', Medien: 'KSS-Anlage, Späneförderer, Druckluft' } }),
  O('pm.insel.kurbelwelle', 'Fertigungsinsel Kurbelwelle (Drehen, 2× Schleifen, Portallader)', 'Produktionsinseln', ['Insel', 'Schleifen', 'Drehen', 'Portallader', 'Kurbelwelle', 'Motor'], inselKurbelwelle(), { meta: { Maschinen: 'Drehräummaschine, 2 Schleifmaschinen, Waschanlage', Verkettung: 'Portallader 4,8 m, Ein-/Auslaufband' } }),
  O('pm.insel.montage.u', 'Montageinsel U-Form (Vormontage Zylinderkopf, 3 Werker)', 'Produktionsinseln', ['Insel', 'Montage', 'U-Zelle', 'Lean', 'Zylinderkopf'], inselMontageU(), { meta: { Plätze: '7 Arbeitsplätze im U', Bereitstellung: 'Durchlaufregale (KLT) von außen' } }),
  O('pm.insel.roboterzelle', 'Roboterzelle Entgraten/Beschriften mit Wendetisch', 'Produktionsinseln', ['Insel', 'Roboter', 'Entgraten', 'Laser', 'Automation'], inselRoboterzelle()),
  O('pm.station.fraesen', 'Werkstattstation Fräsen (5-Achs-BAZ mit Arbeitsumfeld)', 'Werkstattfertigung', ['Station', 'Werkstatt', 'Fräsen', 'BAZ'], stationFraesen(), { meta: { Ausstattung: 'BAZ, Voreinstellgerät, Werkzeugschrank, Werkbank, Säulenschwenkkran, Gitterboxen, Späne' } }),
  O('pm.station.drehen', 'Werkstattstation Drehen (CNC-Drehmaschine mit Umfeld)', 'Werkstattfertigung', ['Station', 'Werkstatt', 'Drehen'], stationDrehen()),
  O('pm.station.honen', 'Werkstattstation Honen Zylinderbohrungen', 'Werkstattfertigung', ['Station', 'Werkstatt', 'Honen', 'Motorblock'], stationHonen()),
  O('pm.station.messraum', 'Messstation: Messraum mit Koordinatenmessgerät', 'Werkstattfertigung', ['Station', 'Messen', 'Qualität', 'KMG'], stationMessraum()),
  O('pm.station.pruefstand', 'Motorenprüfstand (Heißtest-Zelle mit Leitwarte)', 'Werkstattfertigung', ['Station', 'Prüfstand', 'Heißtest', 'Motor', 'Qualität'], stationPruefstand()),
  O('pm.station.nacharbeit', 'Nacharbeitsstation Motor (mit Schwenkkran)', 'Werkstattfertigung', ['Station', 'Nacharbeit', 'Reparatur', 'Motor'], stationNacharbeit()),
  ...LINIE,
  ...AUSR,
  ...GROSS
] });
})(HSS.library.kit);
