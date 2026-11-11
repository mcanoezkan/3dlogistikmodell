/* =====================================================================
   HSS · werkplaner.js – Zielbild-Layout aus dem Produktionsreife-Check
   Erzeugt in einer leeren Fabrikhalle ein vollständig eingerichtetes Layout
   nach der empfohlenen Organisationsform:
     werkstatt  Werkstattfertigung – Bereiche nach Verrichtung (Dreherei, Fräserei …)
     insel      Inselfertigung – je Produktfamilie eine Fertigungsinsel in U-Form
     linie      Linienfertigung – verkettete Linie (I- oder U-Linie) mit Montagelinie
   Zonen nach dem Materialfluss: Wareneingang → Lager → Fertigung → Montage →
   Qualität/Verpackung → Versand, Servicestreifen (Instandhaltung, Meisterbüro,
   Sozialraum, Gefahrstoffe, Wertstoffe) und Hauptverkehrsweg nach ASR A1.8.
   Maschinenzahl aus der Kapazitätsrechnung (Takt = verfügbare Zeit × OEE ÷ Stückzahl).
   Jedes Objekt wird gegen alle anderen auf Überschneidung geprüft.
   Schnittstelle: HSS.werkplaner.build(cfg) → { prj, stats }, .show(cfg);
   eingebettet (iframe) per postMessage { type: 'prs:plan', payload: cfg }.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, UI = HSS.ui, $ = UI.$;
window.HSS_EMBED = window.HSS_EMBED || /[?&#]embed\b/.test(location.search + location.hash);
const r2 = v => Math.round(v * 100) / 100;
const fmt = (v, d = 0) => Number(v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- zusätzliche Bibliotheksobjekte ---------- */
try {
  const K = HSS.library.kit, DG = '#4b5058', ST = '#8d969f';
  HSS.library.registerPack({ format: 'hss-library', version: 1, name: 'Werkplaner', objects: [
    { id: 'prs.saege', name: 'Bandsägeautomat', category: 'Fabrik/Maschinen', tags: ['Sägen', 'Zuschnitt'], size: { w: 3.0, d: 1.6, h: 1.9 },
      parts: [K.box(0, 0.45, 0, 3.0, 0.9, 1.4, '#e3e6e9', 'lack', { rr: 0.04 }), K.box(0.3, 1.35, 0, 1.0, 1.0, 1.2, '#f2994a', 'lack', { rr: 0.04 }), K.box(-0.9, 1.0, 0, 1.2, 0.18, 0.5, ST, 'metall'), K.box(0.95, 1.25, 0.66, 0.36, 0.42, 0.1, '#2b3138', 'kunststoff'), K.box(0.95, 1.27, 0.715, 0.3, 0.22, 0.01, '#14324f', 'bildschirm'), K.box(0, 0.05, 0, 3.06, 0.1, 1.6, DG, 'matt')] },
    { id: 'prs.bde', name: 'BDE-Terminal', category: 'Fabrik/Arbeitsplätze', tags: ['Betriebsdaten', 'Terminal'], size: { w: 0.5, d: 0.4, h: 1.6 },
      parts: [K.box(0, 0.6, 0, 0.12, 1.2, 0.12, ST, 'metall'), K.box(0, 1.35, 0.02, 0.48, 0.36, 0.08, '#2b3138', 'kunststoff'), K.box(0, 1.35, 0.065, 0.42, 0.3, 0.01, '#14324f', 'bildschirm'), K.box(0, 0.03, 0, 0.5, 0.06, 0.4, DG, 'matt')] },
    { id: 'prs.puffer', name: 'Pufferfläche (FIFO, markiert)', category: 'Fabrik/Lager & Regale', tags: ['Puffer', 'FIFO'], size: { w: 2.6, d: 1.4, h: 0.04 },
      parts: [K.box(0, 0.01, 0, 2.6, 0.02, 1.4, '#f2c94c', 'matt'), K.box(0, 0.025, 0, 2.4, 0.02, 1.2, '#eceff2', 'matt')] }
  ] });
} catch (e) { console.warn('Werkplaner-Bibliothek', e); }

/* ---------- Fertigungsschritte ---------- */
// tz = Richtwert Bearbeitungszeit je Erzeugnis in Minuten (für die Kapazitätsrechnung)
const STEPS = {
  saege: { name: 'Zuschnitt', bereich: 'Sägerei', lib: 'prs.saege', tz: 1.2, max: 3 },
  laser: { name: 'Laserschneiden', bereich: 'Laserzentrum', lib: 'fab.laser', tz: 1.8, max: 2 },
  pressen: { name: 'Umformen', bereich: 'Presserei', lib: 'fab.presse', tz: 0.8, max: 3 },
  spritzguss: { name: 'Spritzgießen', bereich: 'Spritzgießerei', lib: 'fab.spritzguss', tz: 2.0, max: 3 },
  biegen: { name: 'Biegen', bereich: 'Biegerei', lib: 'fab.biegepresse', tz: 1.5, max: 3 },
  drehen: { name: 'Drehen', bereich: 'Dreherei', lib: 'fab.drehmaschine', tz: 3.5, max: 4 },
  fraesen: { name: 'Fräsen', bereich: 'Fräserei', lib: 'fab.cnc', tz: 5.5, max: 4 },
  schweissen: { name: 'Schweißen', bereich: 'Schweißerei', lib: 'fab.schweisszelle', tz: 4.5, max: 3 },
  waschen: { name: 'Waschen', bereich: 'Teilereinigung', lib: 'fab.waschanlage', tz: 1.0, max: 2 },
  lackieren: { name: 'Lackieren', bereich: 'Lackiererei', lib: 'fab.lackierkabine', tz: 2.5, max: 2 }
};
const ORDER = ['saege', 'laser', 'pressen', 'spritzguss', 'biegen', 'drehen', 'fraesen', 'schweissen', 'waschen', 'lackieren'];
const FORM = { werkstatt: 'Werkstattfertigung', insel: 'Inselfertigung', linie: 'Linienfertigung', gemischt: 'gemischte Fertigung' };
const NEU = '#9fdcc8'; // Lackfarbe für neu zu beschaffende Anlagen

/* ---------- Kapazitätsrechnung ---------- */
HSS.werkKapazitaet = cfg => {
  const schichten = +cfg.schichten || 2, stueck = Math.max(100, +cfg.stueck || 5000), oee = U.clamp(+cfg.oee || 0.6, 0.3, 0.95);
  const minJahr = 220 * schichten * 7.5 * 60, takt = minJahr * oee / stueck, taktZiel = minJahr * 0.8 / stueck;
  const schritte = ORDER.filter(k => (cfg.schritte || []).includes(k));
  const rows = schritte.map(k => {
    const S = STEPS[k]; let n = U.clamp(Math.ceil(S.tz / takt - 1e-9), 1, S.max);
    const nZiel = U.clamp(Math.ceil(S.tz / taktZiel - 1e-9), 1, S.max);
    if (cfg.form === 'werkstatt' && ['drehen', 'fraesen', 'schweissen', 'saege', 'biegen'].includes(k)) n = Math.max(n, 2); // Universalmaschinen für Variantenvielfalt
    return { k, name: S.name, bereich: S.bereich, lib: S.lib, tz: S.tz, n, nZiel, auslastung: S.tz / (n * takt) };
  });
  const engpass = rows.slice().sort((a, b) => b.auslastung - a.auslastung)[0] || null;
  const montage = U.clamp(Math.ceil(18 / takt), 4, 16), pruef = U.clamp(Math.ceil(2 / takt), 1, 4), pack = U.clamp(Math.ceil(1.5 / takt), 1, 4);
  return { schichten, stueck, oee, minJahr, takt, taktZiel, rows, engpass, montage, pruef, pack };
};

/* ---------- Layout ---------- */
HSS.werkplaner = { STEPS, ORDER, FORM };
HSS.werkplaner.build = (cfg0 = {}) => {
  const cfg = Object.assign({ form: 'linie', halle: '96x48', schritte: ['saege', 'drehen', 'fraesen', 'schweissen', 'waschen', 'lackieren'], familien: 2, schichten: 2, stueck: 40000, oee: 0.6, lager: 'regal', auto: 'teil', befunde: {} }, cfg0);
  const [L, D] = String(cfg.halle).split('x').map(Number);
  const KAP = HSS.werkKapazitaet(cfg);
  const prj = HSS.newProject(`Zielbild ${FORM[cfg.form] || ''}${cfg.firma ? ' · ' + cfg.firma : ''}`);
  prj.meta.notes = `Layoutvorschlag aus dem Produktionsreife-Check${cfg.firma ? ' für ' + cfg.firma : ''}. Organisationsform: ${FORM[cfg.form]}. Takt ${fmt(KAP.takt, 2)} min bei ${fmt(KAP.stueck)} Stück/Jahr, ${KAP.schichten} Schicht(en), OEE ${fmt(KAP.oee * 100)} %. Maschinenzahlen und Flächen sind Planungsrichtwerte.`;
  prj.meta.reifegrad = { form: cfg.form, formIst: cfg.formIst, score: cfg.score };
  prj.terrain = { size: Math.max(520, L * 4.6), color: '#c5cfb6', tilt: { dir: 0, pct: 0 }, hills: [] };
  const hoch = cfg.lager === 'hrl' ? 12.5 : 9;
  const pt = Object.assign(HSS.defaults.part(), U.clone(HSS.PRESETS?.produktionshalle?.p || {}), { id: 'H1', name: 'Produktionshalle', x: 0, z: 0, w: L, d: D, floors: 1, floorHeight: hoch, basements: 0 });
  pt.facade = Object.assign(HSS.defaults.part().facade, { type: 'paneel', color: '#d7dbe0', accent: '#144477', glass: '#8aa0b2', axis: 6, windowRatio: 0.3 });
  pt.roof = Object.assign(HSS.defaults.part().roof, { type: 'shed', neigung: 22, raster: 12, parapet: 0, plant: false });
  prj.buildings.push({ id: 'bH', name: 'Produktionshalle', kurz: 'P', color: '#144477', parts: [pt] });
  const leer = U.clone(prj); // Zustand „leere Halle“

  const I = HSS.interior('H1', 0, true, prj);
  const host = { part: 'H1', floor: 0 }, occ = [], stats = { maschinen: 0, neu: 0, werker: 0, montage: 0, objekte: 0, zonen: [], fehler: [] };
  const e = 0.4, X0 = -L / 2 + e, X1 = L / 2 - e, Z0 = -D / 2 + e, Z1 = D / 2 - e;
  // Objekt platzieren mit Kollisionsprüfung (Achsen-Rechtecke inkl. Abstand)
  const ext = (lib, rot, size) => { const d = HSS.library.get(lib); const s = size || d?.size || { w: 1, d: 1 }; const q = ((rot % 180) + 180) % 180 === 90; return { w: q ? s.d : s.w, d: q ? s.w : s.d }; };
  const fits = (b, gap) => b.x0 >= X0 - 1e-6 && b.x1 <= X1 + 1e-6 && b.z0 >= Z0 - 1e-6 && b.z1 <= Z1 + 1e-6 && !occ.some(o => b.x0 < o.x1 + gap && b.x1 > o.x0 - gap && b.z0 < o.z1 + gap && b.z1 > o.z0 - gap);
  const put = (lib, x, z, rot = 0, o = {}) => {
    if (!HSS.library.get(lib)) { stats.fehler.push('Objekt fehlt: ' + lib); return null; }
    const s = ext(lib, rot, o.size), b = { x0: x - s.w / 2, x1: x + s.w / 2, z0: z - s.d / 2, z1: z + s.d / 2 };
    if (!o.force && !fits(b, o.gap ?? 0.25)) return null;
    occ.push(b);
    const ob = { id: U.uid('obj'), lib, host, x: r2(x), z: r2(z), rot, auto: true };
    if (o.size) ob.size = o.size; if (o.name) ob.name = o.name; if (o.color) ob.color = o.color; if (o.role) ob.role = o.role;
    prj.objects.push(ob); stats.objekte++;
    if (o.maschine) { stats.maschinen++; if (o.color === NEU) stats.neu++; }
    if (lib === 'fab.werker') stats.werker++;
    return ob;
  };
  const room = (use, name, x0, x1, z0, z1, o = {}) => {
    const r = Object.assign({ id: U.uid('r'), use, name, x: r2((x0 + x1) / 2), z: r2((z0 + z1) / 2), w: r2(x1 - x0), d: r2(z1 - z0), role: o.role || use }, o.walls ? {} : { noWalls: true });
    I.rooms.push(r); stats.zonen.push({ name, use, m2: (x1 - x0) * (z1 - z0) }); return r;
  };
  const furnish = r => { for (const ob of HSS.furnishRoom(pt, 0, r, I, {})) { const s = ext(ob.lib, ob.rot || 0, ob.size); occ.push({ x0: ob.x - s.w / 2, x1: ob.x + s.w / 2, z0: ob.z - s.d / 2, z1: ob.z + s.d / 2 }); prj.objects.push(Object.assign({ id: U.uid('obj'), host, auto: true }, ob)); stats.objekte++; if (ob.lib === 'fab.werker') stats.werker++; } };
  // Werker vor der Bedienseite einer Maschine (Bedienseite: +z bei rot 0, −z bei 180, −x bei 90, +x bei 270)
  const werkerVor = (ob, abst = 0.9) => { if (!ob) return; const s = ext(ob.lib, ob.rot); const dir = { 0: [0, 1], 180: [0, -1], 90: [-1, 0], 270: [1, 0] }[ob.rot] || [0, 1]; const off = (dir[0] ? s.w : s.d) / 2 + abst; put('fab.werker', ob.x + dir[0] * off - (dir[1] ? s.w * 0.25 : 0), ob.z + dir[1] * off - (dir[0] ? s.d * 0.25 : 0), (ob.rot + 180) % 360, { gap: 0.05 }); };

  /* --- Spalten nach Materialfluss (x) --- */
  const we = U.clamp(L * 0.085, 7, 10), lag = U.clamp(L * 0.16, 11, 19), wa = U.clamp(L * 0.085, 7, 10), qv = U.clamp(L * 0.07, 6, 9);
  const rest = (X1 - X0) - we - lag - wa - qv;
  const mont = r2(rest * (cfg.form === 'linie' ? 0.24 : cfg.form === 'insel' ? 0.25 : 0.22)), prod = rest - mont;
  const xWE = [X0, X0 + we], xLA = [xWE[1], xWE[1] + lag], xPR = [xLA[1], xLA[1] + prod], xMO = [xPR[1], xPR[1] + mont], xQV = [xMO[1], xMO[1] + qv], xWA = [xQV[1], X1];
  const s = D >= 58 ? 9 : D >= 46 ? 8 : 7, zS = [Z0, Z0 + s], zG = [zS[1], zS[1] + 4], zP = [zG[1] + 0.2, Z1];
  room('wareneingang', 'Wareneingang', ...xWE, Z0, Z1);
  const rLa = room(cfg.lager === 'hrl' ? 'hochregallager' : 'lager_fab', cfg.lager === 'hrl' ? 'Hochregallager / Supermarkt' : 'Lager / Supermarkt', ...xLA, Z0, Z1, { role: 'lager_fab' });
  room('flur', 'Hauptverkehrsweg 4 m (ASR A1.8)', xPR[0], xMO[1], ...zG);
  room('qualitaet', 'Qualitätssicherung', ...xQV, Z0, r2((Z0 + Z1) / 2 - 2));
  room('verpackung', 'Verpackung', ...xQV, r2((Z0 + Z1) / 2 - 2), Z1);
  room('warenausgang', 'Warenausgang / Versand', ...xWA, Z0, Z1);
  // Servicestreifen mit Wänden und Türen zum Hauptverkehrsweg
  const svc = [['instandhaltung', 'Instandhaltung', 0.24], ['leitstand', 'Meisterbüro / Leitstand', 0.16], ['sozial', 'Sozial- und Pausenraum', 0.22], ['gefahrstoff', 'Gefahrstofflager', 0.14], ['wertstoff', 'Wertstoffsammelplatz', 0.24]];
  const svcRooms = []; { let x = xPR[0]; const span = xMO[1] - xPR[0]; svc.forEach(([use, name, k], i) => { const x1 = i === svc.length - 1 ? xMO[1] : r2(x + span * k); svcRooms.push(room(use, name, x, x1, ...zS, { walls: true })); x = x1; }); }
  I.walls = HSS.wallsFromRooms(I.rooms);
  for (const r of svcRooms) { // Tür mittig zur Gangseite
    const zz = r.z + r.d / 2, w = I.walls.find(wl => Math.abs(wl.a[1] - zz) < 0.05 && Math.abs(wl.b[1] - zz) < 0.05 && Math.min(wl.a[0], wl.b[0]) <= r.x && Math.max(wl.a[0], wl.b[0]) >= r.x);
    if (w) { const t = (r.x - w.a[0]) / (w.b[0] - w.a[0]); I.doors.push({ id: U.uid('d'), wall: w.id, t: r2(t), w: r.use === 'instandhaltung' || r.use === 'wertstoff' ? 3.0 : 1.1, lib: r.use === 'instandhaltung' || r.use === 'wertstoff' ? 'fab.rolltor' : 'home.tuer' }); }
  }
  // Gang freihalten (nur Markierung)
  occ.push({ x0: xPR[0], x1: xMO[1], z0: zG[0], z1: zG[1] });

  /* --- Lager: Regalzeilen entlang z, Gassen 3,2 m --- */
  const regal = cfg.lager === 'hrl' ? 'fab.hochregal' : 'fab.palettenregal';
  { const W = xLA[1] - xLA[0], k = Math.max(1, Math.floor((W - 3.4) / 5.4)), off = xLA[0] + (W - (3.2 + k * 5.4)) / 2 + 3.2;
    const bloecke = [[Z0 + 1.0, zG[0] - 0.4], [zG[1] + 0.4, Z1 - 4.4]];
    for (let i = 0; i < k; i++) { const xa = off + i * 5.4 + 0.55, xb = xa + 1.1; for (const [a, b] of bloecke) { const n = Math.floor((b - a) / 2.8); for (let j = 0; j < n; j++) { const z = a + 1.4 + j * 2.8; put(regal, xa, z, 90, { gap: 0.0 }); put(regal, xb, z, 270, { gap: 0.0 }); } } }
    if (cfg.lager === 'hrl') { for (let i = 0; i < k; i++) put('fab.regalbediengeraet', off + i * 5.4 - 1.6, (Z0 + zG[0]) / 2, 90, { gap: 0.05 }); }
    put('fab.schubmast', off - 1.6, Z1 - 2.2, 0); put('fab.staplerfahrer', off - 0.3, Z1 - 2.2, 270, { gap: 0.05 });
  }

  /* --- Fertigung (Organisationsform) --- */
  const pX0 = xPR[0] + 1.2, pX1 = xPR[1] - 1.2, pZ0 = zP[0] + 1.0, pZ1 = zP[1] - 1.0;
  const verbinde = (xa, xb, z) => { const len = xb - xa; if (len >= 1.2) put('fab.rollenbahn', (xa + xb) / 2, z, 0, { size: { w: r2(Math.min(len, 6)), d: 0.9, h: 0.75 }, gap: 0.05 }); };
  const engpassPlus = !!cfg.befunde?.ausstattung;
  const maschinenListe = () => KAP.rows.map(r => ({ ...r, n: r.n + (engpassPlus && KAP.engpass && r.k === KAP.engpass.k ? 1 : 0), plus: engpassPlus && KAP.engpass && r.k === KAP.engpass.k ? 1 : 0 }));
  const roboter = cfg.auto !== 'manuell';
  const fts = cfg.auto === 'hoch' || !!cfg.befunde?.foerdertechnik;
  const bde = !!cfg.befunde?.digital;

  if (cfg.form === 'linie') {
    room('produktion', 'Fertigungslinie (verkettet)', ...xPR, ...zP);
    const M = maschinenListe();
    // Breite je Stufe: Maschinenlänge + Förderstrecke
    const stufe = M.map(m => { const d = HSS.library.get(m.lib).size; return { ...m, w: d.w, d: d.d, stack: m.n * d.d + (m.n - 1) * 1.4 }; });
    const gapX = 2.6, total = stufe.reduce((a, b) => a + b.w + gapX, -gapX), avail = pX1 - pX0;
    const zeilen = total <= avail ? [stufe] : (() => { const A = [], B = []; let acc = 0; for (const s0 of stufe) { if (acc + s0.w <= avail && B.length === 0 && acc + s0.w <= total / 2 + s0.w / 2) { A.push(s0); acc += s0.w + gapX; } else B.push(s0); } return [A, B]; })();
    const legen = (reihe, zc, face, rueck, nameIdx) => { // face 0: Bedienseite +z, 180: −z
      const breite = reihe.reduce((a, b) => a + b.w + gapX, -gapX); let x = rueck ? pX0 + (avail + breite) / 2 : pX0 + (avail - breite) / 2;
      const ends = [];
      for (const m of reihe) {
        const cx = rueck ? x - m.w / 2 : x + m.w / 2;
        for (let i = 0; i < m.n; i++) {
          const dz = (face === 0 ? -1 : 1) * i * (m.d + 1.4); // parallele Anlagen nach außen gestapelt
          const neu = i >= m.n - m.plus;
          const ob = put(m.lib, cx, zc + dz, face, { maschine: true, name: `${m.name} ${i + 1}${neu ? ' (neu)' : ''}`, color: neu ? NEU : undefined });
          if (i === 0) werkerVor(ob, 0.7);
        }
        ends.push([cx - m.w / 2, cx + m.w / 2]);
        x += (rueck ? -1 : 1) * (m.w + gapX);
      }
      ends.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < ends.length - 1; i++) verbinde(ends[i][1] + 0.15, ends[i + 1][0] - 0.15, zc);
      return ends;
    };
    const offS = r => Math.max(...r.map(m => m.stack - m.d / 2)), halb = r => Math.max(...r.map(m => m.d / 2));
    if (zeilen.length === 1) {
      // I-Linie(n): je Produktfamilie eine Linie, soweit die Tiefe reicht; Bedienseite +z
      const band = offS(stufe) + halb(stufe) + 2.8;
      const nLin = 1; // eine verkettete Linie; parallele Anlagen je Schritt nach Kapazitätsrechnung
      const z0 = pZ0 + ((pZ1 - pZ0) - (nLin * band + (nLin - 1) * 3.5)) / 2;
      for (let li = 0; li < nLin; li++) {
        const zc = z0 + li * (band + 3.5) + offS(stufe);
        const ends = legen(stufe, zc, 0, false);
        put('fab.andonboard', ends[ends.length - 1][1] + 1.0, zc, 270, { name: `Andon Linie ${li + 1}`, gap: 0.1 });
        if (bde) put('prs.bde', ends[0][0] - 0.8, zc, 90, { gap: 0.1 });
      }
      stats.linien = nLin; stats.linienTyp = nLin > 1 ? nLin + ' I-Linien' : 'I-Linie';
    } else {
      // U-Linie: Zeile A (Bedienseite innen +z), Zeile B rückläufig (Bedienseite innen −z), Mitarbeitende im Inneren der U
      const A = zeilen[0], B = zeilen[1], innen = 3.4;
      const gesamt = offS(A) + halb(A) + innen + halb(B) + offS(B), zStart = pZ0 + Math.max(0, ((pZ1 - pZ0) - gesamt) / 2);
      if (gesamt > pZ1 - pZ0) stats.fehler.push('U-Linie benötigt mehr Hallentiefe als verfügbar');
      const zcA = zStart + offS(A), zcB = zcA + halb(A) + innen + halb(B);
      const eA = legen(A, zcA, 0, false), eB = legen(B, zcB, 180, true);
      const xr = Math.max(eA[eA.length - 1][1], eB[eB.length - 1][1]) + 1.0;
      put('fab.rollenbahn', xr, (zcA + zcB) / 2, 90, { size: { w: r2(zcB - zcA), d: 0.9, h: 0.75 }, gap: 0.05, name: 'Umsetzer U-Linie' });
      const xl = Math.min(eA[0][0], eB[0][0]);
      put('fab.andonboard', xl - 1.0, (zcA + zcB) / 2, 270, { name: 'Andon U-Linie', gap: 0.1 });
      if (bde) put('prs.bde', xl - 1.0, (zcA + zcB) / 2 + 2.0, 270, { gap: 0.1 });
      stats.linien = 1; stats.linienTyp = 'U-Linie';
    }
    // Roboterbeladung an den Bearbeitungsanlagen (Bedienseite, rechts neben dem Werker)
    if (roboter) for (const m of stufe.filter(m => ['drehen', 'fraesen', 'spritzguss', 'pressen'].includes(m.k))) for (const ob of prj.objects.filter(o => o.lib === m.lib && o.host)) { const sd = ob.rot === 180 ? -1 : 1; put('fab.roboter', ob.x + m.w / 2 - 0.7, ob.z + sd * (m.d / 2 + 0.95), ob.rot, { gap: 0.1, name: 'Roboterbeladung' }); }
  } else if (cfg.form === 'insel') {
    // Fertigungsinseln in U-Form: je Familie eine Insel mit allen Schritten
    const nF = U.clamp(+cfg.familien || 2, 1, 4), M = [];
    for (const m of maschinenListe()) { const sz = HSS.library.get(m.lib).size, cnt = U.clamp(Math.ceil((m.n - m.plus) / nF), 1, 2); for (let i = 0; i < cnt; i++) M.push({ ...m, ...sz, neu: false }); if (m.plus) M.push({ ...m, ...sz, neu: true }); }
    const zelle = liste => { const A = [], B = []; let la = 0, lb = 0; for (const m of liste.slice().sort((a, b) => b.w - a.w)) { if (la <= lb) { A.push(m); la += m.w + 1.0; } else { B.push(m); lb += m.w + 1.0; } } return { A, B, w: Math.max(la, lb) + 1.6, d: Math.max(...A.map(m => m.d), 0) + Math.max(...B.map(m => m.d), 0) + 3.0 + 1.2 }; };
    let nCells = nF, Z, cols, rowsN, ok = false;
    while (!ok && nCells >= 1) { Z = zelle(M); for (cols = nCells; cols >= 1; cols--) { rowsN = Math.ceil(nCells / cols); if (cols * Z.w + (cols - 1) * 3.2 <= pX1 - pX0 && rowsN * Z.d + (rowsN - 1) * 3.2 <= pZ1 - pZ0) { ok = true; break; } } if (!ok) nCells--; }
    if (!ok) { nCells = 1; cols = 1; rowsN = 1; stats.fehler.push('Insel passt nicht vollständig in die Fertigungszone'); }
    const gx = (pX1 - pX0 - (cols * Z.w + (cols - 1) * 3.2)) / 2, gz = (pZ1 - pZ0 - (rowsN * Z.d + (rowsN - 1) * 3.2)) / 2;
    for (let c = 0; c < nCells; c++) {
      const ci = c % cols, ri = Math.floor(c / cols), x0 = pX0 + gx + ci * (Z.w + 3.2), z0 = pZ0 + gz + ri * (Z.d + 3.2);
      room('produktion', `Fertigungsinsel ${'ABCD'[c]} · Produktfamilie ${c + 1}`, r2(x0 - 0.6), r2(x0 + Z.w + 0.6), r2(z0 - 0.6), r2(Math.min(zP[1], z0 + Z.d + 0.6)), { role: c === 0 ? 'produktion' : 'produktion_' + c });
      const dA = Math.max(...Z.A.map(m => m.d)), zA = z0 + 0.6 + dA / 2, zB = zA + dA / 2 + 3.0 + Math.max(...Z.B.map(m => m.d), 0) / 2;
      let x = x0 + 0.8; for (const m of Z.A) { const ob = put(m.lib, x + m.w / 2, zA, 0, { maschine: true, name: `${m.name} · Insel ${'ABCD'[c]}${m.neu ? ' (neu)' : ''}`, color: m.neu ? NEU : undefined }); x += m.w + 1.0; void ob; }
      x = x0 + 0.8; for (const m of Z.B) { put(m.lib, x + m.w / 2, zB, 180, { maschine: true, name: `${m.name} · Insel ${'ABCD'[c]}${m.neu ? ' (neu)' : ''}`, color: m.neu ? NEU : undefined }); x += m.w + 1.0; }
      const zm = (zA + zB) / 2; put('fab.werker', x0 + Z.w * 0.35, zm, 90, { gap: 0.05 }); put('fab.werker', x0 + Z.w * 0.65, zm, 270, { gap: 0.05 });
      put('fab.andonboard', x0 + Z.w + 0.2, zm, 270, { gap: 0.05, name: `Insel ${'ABCD'[c]}` });
      put('fab.fachbodenregal', x0 - 0.1, zm, 90, { gap: 0.05 });
      if (bde) put('prs.bde', x0 + Z.w + 0.2, zm + 1.6, 270, { gap: 0.05 });
    }
    stats.inseln = nCells;
  } else {
    // Werkstattfertigung: Bereiche nach Verrichtung; Regalpacken (größte zuerst), bei Platzmangel weniger Universalmaschinen
    const geo = (m, n) => { const c = n >= 3 ? 2 : n, r = Math.ceil(n / c); return { c, r, gw: c * m.w + (c - 1) * 1.6 + 2.0, gd: r * m.d + (r - 1) * 2.2 + 1.2 + 2.2 }; };
    const M = maschinenListe().map(m => ({ ...m, ...HSS.library.get(m.lib).size }));
    const pack = list => { const rows = []; for (const g of list) { let row = rows.find(r => r.x + g.gw <= pX1 - pX0 + 1e-6 && g.gd <= r.h + 1e-6) || rows.find(r => r.x + g.gw <= pX1 - pX0 + 1e-6 && r === rows[rows.length - 1]); if (!row) { const z = rows.length ? rows[rows.length - 1].z + rows[rows.length - 1].h + 3.4 : 0; row = { z, x: 0, h: 0, items: [] }; rows.push(row); } g.px = row.x; g.pz = row.z; row.x += g.gw + 3.4; row.h = Math.max(row.h, g.gd); row.items.push(g); } const last = rows[rows.length - 1]; return { ok: !last || last.z + last.h <= pZ1 - pZ0 + 1e-6, rows }; };
    let ns = M.map(m => m.n), P = null;
    for (let tries = 0; tries < 12; tries++) {
      const gruppen = M.map((m, i) => ({ ...m, n: ns[i], plus: Math.min(m.plus, ns[i] - 1), ...geo(m, ns[i]) })).sort((a, b) => b.gd - a.gd || b.gw - a.gw);
      P = pack(gruppen); if (P.ok) break;
      const i = ns.map((n, k) => [n, k]).filter(([n, k]) => n > 1).sort((a, b) => b[0] - a[0])[0]; if (!i) break; ns[i[1]]--;
    }
    if (ns.some((n, i) => n < M[i].n)) stats.fehler.push('Halle knapp: weniger Universalmaschinen je Bereich eingeplant');
    for (const row of P.rows) {
      const used = row.x - 3.4, dx = Math.max(0, (pX1 - pX0 - used) / 2);
      for (const g of row.items) {
        const x = pX0 + dx + g.px, z = pZ0 + row.z;
        if (z + g.gd > pZ1 + 1e-6) { stats.fehler.push(`${g.bereich} passt nicht in die Fertigungszone`); continue; }
        room('produktion', g.bereich, r2(x - 0.5), r2(x + g.gw + 0.5), r2(z - 0.5), r2(Math.min(zP[1], z + g.gd + 0.5)), { role: g.k === M[0].k ? 'produktion' : 'produktion_' + g.k });
        for (let i = 0; i < g.n; i++) { const ci = i % g.c, ri = Math.floor(i / g.c); const neu = i >= g.n - g.plus; const ob = put(g.lib, x + 1.0 + ci * (g.w + 1.6) + g.w / 2, z + 0.6 + ri * (g.d + 2.2) + g.d / 2, 0, { maschine: true, name: `${g.name} ${i + 1}${neu ? ' (neu)' : ''}`, color: neu ? NEU : undefined }); if (ci === 0) werkerVor(ob, 0.6); }
        // Pufferflächen: Werkstücke warten vor dem Bereich (typisch für die Werkstattfertigung)
        const pz = z + g.gd - 1.1; for (let k = 0; k < Math.max(1, Math.floor((g.gw - 1) / 3)); k++) { if (!put('prs.puffer', x + 1.6 + k * 3.0, pz, 0, { gap: 0.1 })) continue; put('fab.gitterbox', x + 0.95 + k * 3.0, pz, 0, { force: true }); put('fab.gitterbox', x + 2.25 + k * 3.0, pz, 0, { force: true }); occ.pop(); occ.pop(); }
      }
    }
    put('fab.stapler', (pX0 + pX1) / 2, pZ1 - 1.0, 90, { gap: 0.1 });
    if (bde) put('prs.bde', pX1 - 0.4, pZ0 + 0.4, 270, { gap: 0.05 });
  }

  /* --- Montage --- */
  {
    const mX0 = xMO[0] + 1.0, mX1 = xMO[1] - 1.0, mZ0 = zP[0] + 1.0, mZ1 = zP[1] - 1.0;
    room('montage', cfg.form === 'linie' ? 'Montagelinie' : cfg.form === 'insel' ? 'Montageinseln' : 'Montage', ...xMO, ...zP);
    const n = KAP.montage;
    if (cfg.form === 'linie') {
      // Montageband entlang z, Plätze beidseitig; bei vielen Plätzen zwei Bänder
      const zs = mZ0 + 1.5, maxLen = mZ1 - mZ0 - 3, proBand = Math.max(2, 2 * Math.floor((maxLen - 2) / 2.2));
      const nb = n > proBand && (mX1 - mX0) >= 12 ? 2 : 1, je = Math.ceil(n / nb);
      let c = 0;
      for (let bi = 0; bi < nb; bi++) {
        const xc = nb === 1 ? (mX0 + mX1) / 2 : mX0 + (mX1 - mX0) * (bi ? 0.73 : 0.27), len = Math.min(maxLen, Math.ceil(je / 2) * 2.2 + 2), seg = Math.max(1, Math.ceil(len / 6)), sl = len / seg;
        for (let i = 0; i < seg; i++) put('fab.band', xc, zs + sl * i + sl / 2, 90, { size: { w: r2(sl - 0.05), d: 0.8, h: 0.9 }, gap: 0.0 });
        let cb = 0; for (let i = 0; cb < je && c < n && zs + 1.1 + i * 2.2 <= zs + len - 1.1; i++) for (const sd of [-1, 1]) { if (cb >= je || c >= n) break; const ob = put('fab.montageplatz', xc + sd * 1.45, zs + 1.1 + i * 2.2, sd < 0 ? 270 : 90, { gap: 0.15 }); if (ob) { c++; cb++; put('fab.werker', xc + sd * 2.5, zs + 1.1 + i * 2.2, sd < 0 ? 90 : 270, { gap: 0.02 }); } }
      }
      stats.montage = c;
      for (let z = zs; z + 2.1 <= mZ1 - 1.5; z += 2.3) { put('fab.fachbodenregal', mX0 + 0.3, z + 1.0, 90, { gap: 0.1 }); put('fab.fachbodenregal', mX1 - 0.3, z + 1.0, 270, { gap: 0.1 }); }
    } else {
      // Montageplätze in Inseln zu je 4 (2 × 2), Abstand für Materialwagen
      const per = 4, cells = Math.ceil(n / per); let c = 0;
      const cw = 2 * 1.6 + 1.6, cd = 2 * 1.0 + 2.4, colsM = Math.max(1, Math.floor((mX1 - mX0 + 2) / (cw + 2.4)));
      const gx = (mX1 - mX0 - (colsM * cw + (colsM - 1) * 2.4)) / 2;
      for (let k = 0; k < cells; k++) {
        const ci = k % colsM, ri = Math.floor(k / colsM), x0 = mX0 + gx + ci * (cw + 2.4), z0 = mZ0 + ri * (cd + 3.0);
        if (z0 + cd > mZ1) break;
        for (const [dx, dz, rot] of [[0, 0, 0], [1, 0, 0], [0, 1, 180], [1, 1, 180]]) { if (c >= n) break; const ob = put('fab.montageplatz', x0 + 0.8 + dx * (1.6 + 1.6), z0 + 0.5 + dz * (1.0 + 2.4), rot, { gap: 0.1 }); if (ob) { c++; werkerVor(ob, 0.5); } }
      }
      stats.montage = c;
    }
    if (fts) { put('fab.fts', xMO[0] + 1.0, zP[1] - 1.4, 0, { gap: 0.1 }); put('fab.fts', xPR[0] + 2.0, zP[1] - 1.4, 0, { gap: 0.1 }); }
    put('fab.andonboard', mX1 - 0.4, mZ1 - 1.0, 270, { gap: 0.05, name: 'Kennzahlentafel Montage' });
  }
  // Routenzug als Transportmittel zwischen Lager und Fertigung (am Hauptgang abgestellt)
  put('fab.stapler', xLA[1] - 1.8, zG[0] + 2.0, 90, { gap: 0.1, force: true }); occ.pop();

  /* --- übrige Zonen einrichten --- */
  for (const r of I.rooms) if (['wareneingang', 'qualitaet', 'verpackung', 'warenausgang'].includes(r.use)) furnish(r);
  // Servicestreifen: Einrichtung entlang der Rückwand, Abstand zu Wänden und Tür
  for (const r of svcRooms) {
    const x0 = r.x - r.w / 2 + 0.35, x1 = r.x + r.w / 2 - 0.35, zb = r.z - r.d / 2 + 0.35, zf2 = r.z + r.d / 2 - 0.35, xm = r.x;
    const reihe = (lib, n, z, rot = 0, dz = 0) => { const d = HSS.library.get(lib).size, w = rot % 180 ? d.d : d.w, pitch = w + 0.6; let k = 0; for (let x = x0 + w / 2 + 0.2; x + w / 2 <= x1 - 0.2 && k < n; x += pitch) { if (Math.abs(x - xm) < w / 2 + 1.0 && dz) continue; if (put(lib, x, z + dz, rot, { gap: 0.1 })) k++; } };
    if (r.use === 'instandhaltung') { reihe('fab.werkbank', 3, zb + 0.4); put('fab.bohrmaschine', x0 + 0.6, zf2 - 1.6, 90, { gap: 0.1 }); put('fab.kompressor', x1 - 1.2, zf2 - 1.4, 0, { gap: 0.1 }); put('fab.fachbodenregal', x1 - 0.3, r.z, 270, { gap: 0.1 }); }
    if (r.use === 'leitstand') { put('fab.leitstand', xm, zb + 0.3, 0, { gap: 0.05 }); for (const dx of [-1.0, 1.0]) { put('buero.schreibtisch', xm + dx * (r.w / 4 + 0.2), r.z + 0.2, 0, { gap: 0.1 }); put('buero.stuhl', xm + dx * (r.w / 4 + 0.2), r.z + 1.05, 180, { gap: 0.02 }); } if (bde) put('prs.bde', x1 - 0.4, zf2 - 0.6, 270, { gap: 0.05 }); }
    if (r.use === 'sozial') { put('home.kueche.zeile', x0 + 1.6, zb + 0.32, 0, { gap: 0.05 }); for (let k = 0; k < 3; k++) put('home.esstisch', x0 + 2.0 + k * 2.8, r.z + 0.6, 0, { gap: 0.2 }); }
    if (r.use === 'gefahrstoff') { reihe('fab.gefahrstoffschrank', 3, zb + 0.32); put('fab.auffangwanne', x0 + 0.8, zf2 - 1.4, 0, { gap: 0.15 }); put('fab.ibc', x1 - 0.8, zf2 - 1.4, 0, { gap: 0.15 }); }
    if (r.use === 'wertstoff') { reihe('log.abfall1100', 5, zb + 0.55); put('fab.gitterbox', x0 + 1.0, zf2 - 1.6, 0, { gap: 0.2 }); put('fab.gitterbox', x1 - 1.0, zf2 - 1.6, 0, { gap: 0.2 }); }
  }

  /* --- Werksgelände --- */
  const zf = D / 2, out = (lib, x, z, rot = 0, extra = {}) => prj.objects.push(Object.assign({ id: U.uid('obj'), lib, x: r2(x), z: r2(z), rot }, extra));
  const xWEc = (xWE[0] + xWE[1]) / 2, xWAc = (xWA[0] + xWA[1]) / 2;
  for (const [xc, nm] of [[xWEc, 'Wareneingang'], [xWAc, 'Versand']]) for (const dx of [-2, 2]) out('fab.torschleuse', xc + dx, zf + 1.5, 0, { name: `Tor ${nm}` });
  out('fab.sattelzug', xWEc - 2, zf + 16, 180); out('fab.sattelzug', xWAc + 2, zf + 16, 180);
  const path = (kind, name, points, o = {}) => prj.paths.push(Object.assign(HSS.defaults.path(kind), { id: U.uid('path'), name, points, smooth: false }, o));
  const zR = zf + 58, xs = L / 2 + 60;
  path('strasse', 'Industriestraße', [[-L / 2 - 120, zR], [L / 2 + 160, zR]], { width: 8, traffic: 3 });
  path('zufahrt', 'Werkstraße', [[xs, zR], [xs, zf + 30], [-L / 2 - 14, zf + 30], [-L / 2 - 14, -D / 2 - 14], [L / 2 + 14, -D / 2 - 14], [L / 2 + 14, zf + 30]], { width: 7 });
  path('gehweg', 'Gehweg Parkplatz – Halle', [[xs + 30, zf + 8], [L / 2 + 22, zf + 8], [L / 2 + 22, 0], [L / 2 + 1, 0]], { width: 2.5 });
  path('grenze', 'Werkszaun', [[-L / 2 - 40, zR - 6], [L / 2 + 120, zR - 6], [L / 2 + 120, -D / 2 - 40], [-L / 2 - 40, -D / 2 - 40], [-L / 2 - 40, zR - 6]], { width: 0.35, noNet: true });
  const area = (kind, name, x, z, w, d) => prj.areas.push({ id: U.uid('area'), kind, name, x: r2(x), z: r2(z), w: r2(w), d: r2(d), rot: 0 });
  area('platz', 'Ladehof', 0, zf + 15, L + 10, 26);
  area('parkplatz', 'Mitarbeiterparkplatz', xs + 30, zf + 10, 44, 40);
  area('gruen', 'Grünfläche', L / 2 + 85, -D / 4, 50, D * 0.9);
  for (let i = 0; i < 10; i++) out(i % 3 ? 'kfz.pkw' : 'kfz.pkw.suv', xs + 15 + (i % 5) * 6, zf - 2 + Math.floor(i / 5) * 22, 0);
  for (let i = 0; i < 12; i++) out('gruen.baum.laub', -L / 2 - 30 + (i % 2) * 6, -D / 2 - 20 + i * ((D + 50) / 12), i * 37);
  for (let i = 0; i < 6; i++) out('gruen.baum.laub', L / 2 + 50 + i * 10, -D / 2 - 26, i * 53);
  prj.buildings.push({ id: 'bS', name: 'Sozial- und Verwaltungsgebäude', kurz: 'V', color: '#2D7694', parts: [Object.assign(HSS.defaults.part(), U.clone(HSS.PRESETS?.verwaltung?.p || {}), { id: 'V1', name: 'Verwaltung / Sozialgebäude', x: L / 2 + 40, z: -D / 2 + 10, w: 30, d: 14, floors: 2, basements: 0 })] });
  prj.places.push({ id: 'pl_extern', name: 'Lieferanten / Kunden (extern)', kind: 'extern', role: 'extern', x: -L / 2 - 100, z: zR });
  leer.terrain = prj.terrain; leer.paths = U.clone(prj.paths); leer.areas = U.clone(prj.areas); leer.buildings = U.clone(prj.buildings); leer.places = U.clone(prj.places);
  leer.objects = prj.objects.filter(o => !o.host).map(o => U.clone(o)); leer.meta.name = 'Leere Halle ' + L + ' × ' + D + ' m';

  stats.kap = KAP; stats.halle = { L, D, m2: L * D, hoehe: hoch }; stats.form = cfg.form;
  stats.zonenM2 = {}; for (const z of stats.zonen) stats.zonenM2[z.use] = (stats.zonenM2[z.use] || 0) + z.m2;
  // Materialflussweg (Schwerpunkte der Zonen entlang der Prozesskette)
  const zc = use => { const rr = I.rooms.filter(r => r.use === use || r.role === use); return rr.length ? [U.sum(rr.map(r => r.x)) / rr.length, U.sum(rr.map(r => r.z)) / rr.length] : null; };
  const kette = ['wareneingang', 'lager_fab', 'produktion', 'montage', 'verpackung', 'warenausgang'].map(zc).filter(Boolean);
  stats.weg = U.sum(kette.slice(1).map((p, i) => Math.abs(p[0] - kette[i][0]) + Math.abs(p[1] - kette[i][1])));
  return { prj, leer, stats, cfg };
};

/* ---------- Anzeige in der Suite ---------- */
const css = `#prsCard{position:absolute;right:14px;top:150px;width:340px;max-height:calc(100% - 166px);overflow:auto;z-index:40;background:#0f2a4a;color:#eef3f8;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.28);font:13px/1.45 Arial,Helvetica,sans-serif;text-transform:none;letter-spacing:0}
#prsCard *{box-sizing:border-box}#prsCard .prs-h{display:block;padding:14px 16px 10px;border-bottom:1px solid rgba(255,255,255,.12)}#prsCard .prs-k{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#7fd3c0;font-weight:700}
#prsCard .prs-t{margin:4px 0 2px;font-size:18px;font-weight:700;color:#fff;text-transform:none;letter-spacing:0}#prsCard .prs-sub{color:#b9c7d6;font-size:12px}#prsCard .prs-b{padding:12px 16px}
#prsCard .prs-kpi{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:4px 0 10px}#prsCard .prs-kpi>div{background:rgba(255,255,255,.07);border-radius:10px;padding:8px 10px}#prsCard .prs-kpi b{display:block;font-size:18px;color:#fff}#prsCard .prs-kpi span{font-size:11px;color:#b9c7d6}
#prsCard .prs-steps{margin:6px 0 8px;padding:0;list-style:none}#prsCard .prs-steps li{padding:5px 0 5px 22px;position:relative;color:#d6e0ea}#prsCard .prs-steps li:before{content:'';position:absolute;left:3px;top:10px;width:9px;height:9px;border-radius:50%;background:#2f4c6e}
#prsCard .prs-steps li.ok:before{background:#0A967A}#prsCard .prs-steps li.run:before{background:#f2c94c;box-shadow:0 0 0 4px rgba(242,201,76,.25)}
#prsCard table{width:100%;border-collapse:collapse;font-size:12px;margin:4px 0 8px;background:transparent;color:#eef3f8}#prsCard td{padding:3px 0;border:0;border-bottom:1px solid rgba(255,255,255,.08);background:transparent}#prsCard td.n{text-align:right;font-variant-numeric:tabular-nums;width:56px}
#prsCard .prs-leg{display:flex;flex-wrap:wrap;gap:4px 12px;margin:6px 0;font-size:11.5px;color:#d6e0ea}#prsCard .prs-leg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
#prsCard .prs-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}#prsCard .prs-btn{all:unset;box-sizing:border-box;background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:6px 10px;font:600 12px Arial,Helvetica,sans-serif;cursor:pointer}
#prsCard .prs-btn.primary{background:#0A967A;border-color:#0A967A}#prsCard .prs-btn:hover{filter:brightness(1.15)}#prsCard .prs-x{position:absolute;right:10px;top:10px;padding:2px 8px}#prsCard .prs-note{color:#9fb1c4;font-size:11.5px}
#prsCard .prs-warn{background:rgba(242,153,74,.15);border:1px solid rgba(242,153,74,.4);border-radius:8px;padding:6px 8px;margin:6px 0;color:#ffd9b3;font-size:12px}`;
let cardEl = null;
const card = html => {
  if (!cardEl) { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); cardEl = document.createElement('div'); cardEl.id = 'prsCard'; document.body.appendChild(cardEl); }
  cardEl.hidden = !html; if (html) cardEl.innerHTML = html; return cardEl;
};
const blick = (L, D, k = 1, ms = 1400) => { const T = HSS.s3, V3 = T.camera.position.constructor; T.animateCam(new V3(-L * 0.30 * k + L * 0.12, Math.max(L, D) * 0.60 * k, D * 1.08 * k + 2), new V3(L * 0.12, 0, 2), ms); };
const draufsicht = (L, D) => { const T = HSS.s3, V3 = T.camera.position.constructor; T.animateCam(new V3(L * 0.1 + 0.01, Math.max(L * 0.82, D * 1.4), 0.6), new V3(L * 0.1, 0, 0), 1400); };
HSS.werkplaner.blick = blick; HSS.werkplaner.draufsicht = draufsicht;
const sleep = ms => new Promise(r => setTimeout(r, ms));

HSS.werkplaner.HALLEN = ['72x36', '96x48', '120x60'];
// Layout bauen; reicht die gewählte Halle nicht, wird die nächstgrößere vorgeschlagen
HSS.werkplaner.plan = cfg => {
  const H = HSS.werkplaner.HALLEN; let i = Math.max(0, H.indexOf(cfg.halle)), R = HSS.werkplaner.build(cfg);
  const zuKlein = R => R.stats.fehler.some(f => /passt nicht|Tiefe|knapp/.test(f));
  while (zuKlein(R) && i < H.length - 1) { i++; const R2 = HSS.werkplaner.build(Object.assign({}, cfg, { halle: H[i] })); R2.stats.hinweis = `Die gewählte Halle (${String(cfg.halle).replace('x', ' × ')} m) reicht für ${FORM[cfg.form]} mit ${R2.stats.kap.rows.length} Fertigungsschritten nicht aus. Vorschlag mit ${H[i].replace('x', ' × ')} m.`; R = R2; }
  return R;
};
HSS.werkplaner.show = async (cfg, o = {}) => {
  const R = HSS.werkplaner.plan(cfg), { stats: S, prj } = R, L = S.halle.L, D = S.halle.D;
  HSS.werkplaner.last = R;
  $('#dlg')?.open && $('#dlg').close?.();
  document.body.classList.remove('demoon'); const dc = $('#demoCard'); if (dc) dc.hidden = true;
  const schritte = ['Leere Halle übernehmen', 'Zonen nach Materialfluss anlegen', `${FORM[cfg.form]} auslegen (Kapazität)`, 'Maschinen und Arbeitsplätze platzieren', 'Materialflüsse anlegen'];
  const prog = i => card(`<div class="prs-h"><div class="prs-k">Fabrikplaner · Zielbild wird erzeugt</div><div class="prs-t">${U.esc(cfg.firma || 'Ihr Werk')}</div><div class="prs-sub">Leere Halle ${L} × ${D} m · ${fmt(L * D)} m²</div></div><div class="prs-b"><ul class="prs-steps">${schritte.map((t, k) => `<li class="${k < i ? 'ok' : k === i ? 'run' : ''}">${t}</li>`).join('')}</ul><div class="prs-note">Alle Berechnungen laufen lokal in der App – ohne KI und ohne Internet.</div></div>`);
  prog(0);
  const home0 = HSS.s3.home; HSS.s3.home = () => {}; setTimeout(() => { HSS.s3.home = home0; }, o.schnell ? 3000 : 8000);
  HSS.load(R.leer, { noAutosave: true });
  HSS.s3.setFloor(null);
  await sleep(120); blick(L, D, 1.45, 900);
  await sleep(o.schnell ? 300 : 1500); prog(1);
  await sleep(o.schnell ? 200 : 900); prog(2);
  HSS.load(prj, { noAutosave: true });
  HSS.s3.setFloor(0);
  await sleep(80); blick(L, D, 1.45, 10);
  await sleep(o.schnell ? 200 : 800); prog(3);
  try {
    const r = HSS.applyTemplates(HSS.STANDARDFLUESSE.map(t => t.id));
    const fak = U.clamp(S.kap.stueck / 40000, 0.05, 3);
    r.flows.forEach(f => { if (!/LKW|Schicht/.test(f.name)) f.menge = Math.max(1, Math.round(f.menge * fak)); });
    if (r.flows.length) HSS.change('Materialflüsse aus dem Reifegrad-Check', p => p.flows.push(...r.flows), { scope: 'none', noUndo: true });
    S.fluesse = r.flows.length;
  } catch (e) { console.warn(e); S.fluesse = 0; }
  await sleep(o.schnell ? 200 : 700); prog(4);
  await sleep(o.schnell ? 150 : 600);
  blick(L, D, 1.3, 1800);
  HSS.werkplaner.karte(R);
  try { window.parent !== window && window.parent.postMessage({ type: 'prs:shown', stats: { maschinen: S.maschinen, neu: S.neu, montage: S.montage, werker: S.werker, fehler: S.fehler } }, '*'); } catch (e) { /* */ }
  return R;
};

HSS.werkplaner.karte = (R) => {
  const { stats: S, cfg } = R, K = S.kap, L = S.halle.L, D = S.halle.D;
  const T = HSS.ROOMTYPES, zl = ['wareneingang', 'lager_fab', 'hochregallager', 'produktion', 'montage', 'qualitaet', 'verpackung', 'warenausgang', 'flur'].filter(k => S.zonenM2[k]);
  const ist = cfg.formIst && cfg.formIst !== cfg.form ? `${FORM[cfg.formIst] || cfg.formIst} → <b>${FORM[cfg.form]}</b>` : `<b>${FORM[cfg.form]}</b> (bestätigt)`;
  const el = card(`<div class="prs-h"><button class="prs-btn prs-x" id="prsX" title="Karte ausblenden">×</button><div class="prs-k">Zielbild-Layout · Fabrikplaner</div><div class="prs-t">${U.esc(cfg.firma || 'Ihr Werk')}</div><div class="prs-sub">${ist}${S.linienTyp ? ' · ' + S.linienTyp : ''}${S.inseln ? ' · ' + S.inseln + ' Inseln' : ''}</div></div>
   <div class="prs-b">
    <div class="prs-kpi"><div><b>${S.maschinen}</b><span>Anlagen${S.neu ? `, davon ${S.neu} neu` : ''}</span></div><div><b>${fmt(K.takt, 2)} min</b><span>Takt (OEE ${fmt(K.oee * 100)} %)</span></div><div><b>${S.montage}</b><span>Montageplätze</span></div><div><b>${fmt(S.weg)} m</b><span>Materialflussweg WE → Versand</span></div></div>
    <table>${K.rows.map(r => `<tr><td>${U.esc(r.bereich)}</td><td class="n">${r.n}${engp(K, r) ? ' <span title="Engpass">⚑</span>' : ''}</td><td class="n">${fmt(Math.min(1, r.auslastung) * 100)} %</td></tr>`).join('')}</table>
    <div class="prs-note">Anlagen je Schritt = ⌈Bearbeitungszeit ÷ Takt⌉; Takt = ${fmt(220 * K.schichten * 7.5)} h/Jahr × OEE ÷ ${fmt(K.stueck)} Stück.${K.rows.some(r => r.nZiel < r.n) ? ` Bei OEE 80 % genügen ${K.rows.reduce((a, r) => a + r.nZiel, 0)} statt ${K.rows.reduce((a, r) => a + r.n, 0)} Anlagen.` : ''}</div>
    <div class="prs-leg">${zl.map(k => `<span><i style="background:${T[k]?.color || '#ddd'}"></i>${U.esc(T[k]?.name || k)} · ${fmt(S.zonenM2[k])} m²</span>`).join('')}${S.neu ? `<span><i style="background:${NEU}"></i>neu zu beschaffen</span>` : ''}</div>
    ${S.hinweis ? `<div class="prs-warn">${U.esc(S.hinweis)}</div>` : ''}${S.fehler.length ? `<div class="prs-warn">${S.fehler.map(U.esc).join('<br>')}</div>` : ''}
    <div class="prs-acts"><button class="prs-btn primary" id="prsFlow">Materialflüsse zeigen</button><button class="prs-btn" id="prsTop">Draufsicht</button><button class="prs-btn" id="prsPersp">Perspektive</button><button class="prs-btn" id="prsHalle">Halle von außen</button><button class="prs-btn" id="prsSave">Projekt speichern</button>${window.parent !== window ? '<button class="prs-btn" id="prsBack">← Reifegrad-Ergebnis</button>' : ''}</div>
   </div>`);
  $('#prsX', el).onclick = () => card(null);
  $('#prsTop', el).onclick = () => { HSS.s3.setFloor(0); draufsicht(L, D); };
  $('#prsPersp', el).onclick = () => { HSS.s3.setFloor(0); blick(L, D, 1.3); };
  $('#prsHalle', el).onclick = () => HSS.werkplaner.aussen();
  $('#prsSave', el).onclick = () => HSS.storage.exportFile();
  $('#prsFlow', el).onclick = () => { try { UI.setWS('fluesse'); } catch (e) { /* */ } HSS.s3.setFloor(0); setTimeout(() => blick(L, D, 1.0), 300); };
  const b = $('#prsBack', el); if (b) b.onclick = () => window.parent.postMessage({ type: 'prs:back' }, '*');
};
// Außenansicht: massive Hülle, ganzes Werksgelände
HSS.werkplaner.aussen = () => { const S = HSS.werkplaner.last?.stats; if (!S) return; try { if (UI.current === 'fluesse') UI.setWS('gebaeude'); const sh = $('#vShell'); if (sh && sh.value !== 'massiv') { sh.value = 'massiv'; sh.dispatchEvent(new Event('change')); } } catch (e) { /* */ } HSS.s3.setFloor(null); blick(S.halle.L, S.halle.D, 2.1, 1800); };
const engp = (K, r) => K.engpass && K.engpass.k === r.k;

/* ---------- Einbettung: Nachrichten der Reifegrad-App ---------- */
window.addEventListener('message', ev => {
  const m = ev.data; if (!m || typeof m !== 'object') return;
  if (m.type === 'prs:plan') HSS.werkplaner.show(m.payload, m.opts || {});
  if (m.type === 'prs:view' && HSS.werkplaner.last) { const S = HSS.werkplaner.last.stats; if (m.view === 'top') { HSS.s3.setFloor(0); draufsicht(S.halle.L, S.halle.D); } else if (m.view === 'flow') $('#prsFlow')?.click(); else if (m.view === 'out') HSS.werkplaner.aussen(); else if (m.view === 'nah') { HSS.s3.setFloor(0); blick(S.halle.L, S.halle.D, 0.62, 2600); } else { HSS.s3.setFloor(0); blick(S.halle.L, S.halle.D, 1.3); } }
});
if (window.parent !== window) { const t = setInterval(() => { if (HSS.booted) { clearInterval(t); if (window.HSS_EMBED) { document.body.classList.add('nopanel'); try { HSS.nav?.toggleHelp?.(false); } catch (e) { /* */ } setTimeout(() => HSS.s3.resize?.(), 50); } try { window.parent.postMessage({ type: 'prs:ready' }, '*'); } catch (e) { /* */ } } }, 100); }
})();
