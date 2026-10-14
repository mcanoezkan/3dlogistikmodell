/* =====================================================================
   HSS · einrichtung-plus.js – Einrichtung für alle Funktionsbereiche und Flure
   Ergänzt die Raumrezepte aus einrichtung.js:
     · Flure: Handläufe, Desinfektionsspender, Wegeleitschilder, Rettungszeichen,
       Bilder, Sitznischen, abgestellte Wagen – kein Flur bleibt kahl
     · Patientenzimmer und Arbeitsräume: zusätzliche Kleinteile (Betttisch,
       Abfalleimer, Uhr, Bettleuchte, Handtuchspender, Vitaldatenmonitor …)
     · Funktionsbereiche des ganzen Hauses: Eingangshalle, Information, Aufnahme,
       Cafeteria, Kapelle, Notaufnahme, Radiologie, OP, Labor, Apotheke, ZSVA,
       Zentralküche, Speisesaal, Umkleiden, Wäsche, Lager, Verwaltung, Schulung,
       Technik, Pathologie, Kreißsaal, Physiotherapie, Endoskopie, Herzkatheter …
   Leitlinie: lieber etwas zu voll als leer – jeder Raum zeigt seine Funktion.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const RZ = HSS.EINRICHTUNG, H = HSS.einrichtungHelfer;
const deskSet = H.deskSet;
const ALL = ['back', 'left', 'right', 'front'];
// Raster füllen (Mittelpunktabstand du/dv, Rand m)
const grid = (P, id, du, dv, o = {}) => {
  let n = 0; const mu = o.mu ?? o.m ?? 1.2, mv = o.mv ?? o.m ?? 1.2;
  for (let v = mv; v <= P.D - mv + 1e-6; v += dv) for (let u = mu; u <= P.W - mu + 1e-6; u += du) { if (o.max && n >= o.max) return n; if (P.at(id, u, v, o.face || 'front')) n++; }
  return n;
};
const longSides = P => (P.W >= P.D ? ['front', 'back'] : ['left', 'right']);
const solidOr = (P, ex) => { const s = P.solid(ex); return s.length ? s : ALL.filter(x => !ex?.includes(x)); };
const plants = (P, n = 2) => { const c = [[0.45, P.D - 0.45], [P.W - 0.45, P.D - 0.45], [0.45, 1.4], [P.W - 0.45, 1.4]]; for (let i = 0; i < Math.min(n, 4); i++) P.near('warte.pflanze', c[i][0], c[i][1], 'front', { radius: 1 }); };
const sink = P => P.wall('hyg.handwaschbecken', 'front', { mount: true, from: 'start' }) || P.any('hyg.handwaschbecken', ['left', 'right', 'back'], { mount: true });
const disinfect = P => P.wall('stat.desinfektion', 'front', { mount: true, from: 'end' });
const clock = P => P.any('stat.wanduhr', ['back', 'left', 'right'], { overlay: true, from: 'mid' });

/* ---------- Flure ---------- */
RZ.flur = (P) => {
  const ls = longSides(P), len = Math.max(P.W, P.D), short = ls[0] === 'front' ? ['left', 'right'] : ['front', 'back'];
  for (const s of ls) P.fill('flur.handlauf', s, { mount: true, edge: 0.3 });
  for (const s of ls) for (let x = 3; x < len - 2; x += 9) P.wall('stat.desinfektion', s, { overlay: true, from: x });
  for (let x = 6; x < len - 4; x += 14) P.wall('flur.bilderrahmen', ls[(Math.round(x / 14)) % 2], { overlay: true, from: x });
  for (let x = 2; x < len - 1; x += 22) P.wall('flur.feuerloescher', ls[1], { overlay: true, from: x });
  P.wall('flur.infotafel', ls[0], { overlay: true, from: len * 0.5 });
  // Hinweisschilder an der Decke entlang der Flurmitte, Rettungszeichen an den Enden
  const along = (t) => (P.W >= P.D ? [t, P.D / 2] : [P.W / 2, t]);
  const face = P.W >= P.D ? 'left' : 'front';
  for (let x = 7; x < len - 3; x += 16) { const [u, v] = along(x); P.at('flur.schild', u, v, face, { force: true, ghost: true }); }
  for (const x of [0.6, len - 0.6]) { const [u, v] = along(x); P.at('flur.notausgang', u, v, face, { force: true, ghost: true }); }
  // ein bis zwei Sitznischen, abgestellte Wagen (Flur bleibt ≥ 1,4 m frei)
  if (Math.min(P.W, P.D) >= 2.3) {
    let k = 0; for (let x = len * 0.3; x < len - 3 && k < Math.max(1, Math.floor(len / 25)); x += len * 0.35) { if (P.wall('flur.sitzbank', ls[1], { from: x, off: 0.12 })) k++; }
    P.wall('log.waeschewagen.rein', ls[0], { from: len * 0.62, off: 0.1 });
    if (len > 20) P.wall('stat.visitewagen', ls[1], { from: len * 0.75, off: 0.1 });
    if (len > 30) P.wall('med.rollstuhl', ls[0], { from: len * 0.18, off: 0.1 });
  }
};
RZ.kern = () => {};

/* ---------- Ergänzungen bestehender Rezepte ---------- */
const wrap = (k, extra) => { const o = RZ[k]; RZ[k] = (P, c, n) => { o && o(P, c, n); try { extra(P, c, n); } catch (e) { console.warn('Einrichtung+', k, e); } }; };
wrap('patient', (P, c, n) => {
  for (let i = 0; i < n; i++) P.near('stat.betttisch', P.W / 2, P.D * (n === 1 ? 0.55 : 0.35 + i * 0.4), 'front', { radius: 1.6 });
  P.any('stat.treteimer', ['front', 'left', 'right'], { from: 'end' });
  P.any('stat.bettleuchte', ['left', 'right'], { overlay: true, from: 'mid' });
  clock(P);
  if (n === 1) P.any('stat.minikuehl', ['front', 'left', 'right'], { from: 'end' });
  P.near('med.infusion', P.W / 2 - 0.6, P.D * 0.45, 'front', { radius: 1.2 });
  P.any('stat.garderobenstaender', ['front'], { from: 'start' });
});
wrap('nass', P => { P.any('san.handtuchspender', ['right', 'left', 'back'], { overlay: true, from: 'mid' }); P.any('stat.treteimer', ['left', 'right', 'back'], { from: 'start' }); });
wrap('stuetzpunkt', P => { P.near('med.blutdruck', P.W - 0.5, P.D * 0.5, 'right', { radius: 1.2 }); P.near('med.sauerstoff', 0.5, 1.4, 'left', { radius: 1 }); clock(P); P.any('flur.infotafel', ['left', 'right'], { overlay: true }); P.any('stat.treteimer', ['back', 'left'], {}); });
wrap('rein', P => { P.any('san.handtuchspender', ['front', 'left', 'right'], { overlay: true }); P.near('med.perfusor', P.W - 0.5, P.D - 0.6, 'front', { radius: 1 }); });
wrap('unrein', P => { P.any('san.handtuchspender', ['front', 'left', 'right'], { overlay: true }); P.near('stat.treteimer', P.W / 2 + 0.6, 1.4); });
wrap('medikamente', P => { P.any('san.handtuchspender', ['front', 'left', 'right'], { overlay: true }); clock(P); });
wrap('lager', P => { P.near('log.rollcontainer', P.W / 2 - 1, 1.5); P.any('kueche.regal', P.solid(), {}); });
wrap('geraete', P => { P.near('med.sauerstoff', 0.5, P.D - 0.6); P.near('med.blutdruck', P.W - 0.6, P.D - 0.6); P.near('med.perfusor', P.W / 2, P.D - 0.7); P.near('med.sitzwaage', P.W / 2, P.D / 2); });
wrap('personal', P => { clock(P); P.any('stat.garderobe', ['left', 'right'], { mount: true }); P.any('stat.spind', P.solid(['front']), {}); });
wrap('arzt', P => { clock(P); P.near('stat.treteimer', P.W / 2, P.D / 2); });
wrap('leitung', P => { P.near('warte.pflanze', P.W - 0.4, P.D - 0.4); P.any('buero.kopierer', P.solid(['front']), {}); });
wrap('aufenthalt', P => { P.any('stat.wanduhr', ['back', 'left', 'right'], { overlay: true }); P.any('flur.bilderrahmen', ['left', 'right', 'back'], { overlay: true }); });
wrap('besprechung', P => { clock(P); });
wrap('untersuchung', P => { P.near('med.blutdruck', P.W - 0.6, P.D - 0.6); P.any('stat.treteimer', ['front', 'left'], {}); });
wrap('kueche', P => { P.any('kueche.regal', P.solid(), {}); P.near('kueche.speisenverteilwagen', P.W / 2, P.D - 1.0); });

/* ---------- Ergänzungsräume, Archiv ---------- */
RZ.archiv = P => { if (P.W >= 3.4 && P.D >= 3.0 && !P.at('archiv.rollregal', P.W / 2, P.D / 2 + 0.3, 'front')) P.fill('buero.regal', solidOr(P), { edge: 0.05 }); else P.fill('buero.regal', solidOr(P), { edge: 0.05, max: 3 }); P.near('buero.kopierer', 0.6, 1.4); };
RZ.reserve = P => RZ.lager(P);
RZ.buero = P => { RZ.arzt(P); };

/* ---------- Eingang, Information, Aufnahme, Service ---------- */
RZ.foyer = P => {
  const fac = P.window();
  if (fac) P.wall('eingang.drehtuer', fac, { from: 'mid', maxH: 9 });
  P.near('eingang.stele', P.W / 2 + 2.2, Math.min(P.D - 2, 4), 'front', { radius: 2 });
  P.near('eingang.infoterminal', P.W / 2 - 2.2, Math.min(P.D - 2, 4), 'front', { radius: 2 });
  if (P.W * P.D > 120) P.near('foyer.pflanzinsel', P.W / 2, P.D / 2, 'front', { radius: 3 });
  grid(P, 'foyer.lounge', 5.2, 4.6, { m: 2.8, max: Math.max(1, Math.floor(P.area / 70)) });
  P.any('foyer.rollstuhlpark', solidOr(P, ['front']), { maxH: 3 });
  P.any('foyer.geldautomat', solidOr(P), {});
  if (P.area > 100) P.any('foyer.aquarium', solidOr(P), { maxH: 3 });
  grid(P, 'foyer.sitzwuerfel', 4.0, 3.8, { m: 1.6, max: 3 });
  P.any('service.wasserspender', solidOr(P), {});
  P.any('flur.infotafel', ALL, { overlay: true });
  plants(P, 4); clock(P);
};
RZ.empfang = P => {
  P.at('warte.empfang', P.W / 2, Math.min(P.D * 0.55, P.D - 1.2), 'front') || P.near('warte.empfang', P.W / 2, P.D / 2);
  P.near('buero.stuhl', P.W / 2 - 0.8, Math.min(P.D * 0.55, P.D - 1.2) + 0.9, 'front'); P.near('buero.stuhl', P.W / 2 + 0.8, Math.min(P.D * 0.55, P.D - 1.2) + 0.9, 'front');
  P.any('buero.aktenschrank', solidOr(P, ['front']), {}); P.any('buero.kopierer', solidOr(P, ['front']), {});
  P.any('flur.infotafel', ALL, { overlay: true }); plants(P, 2);
};
RZ.aufnahme = P => {
  const n = U.clamp(Math.floor(P.W / 2.2), 1, 6); let k = 0;
  for (let i = 0; i < n; i++) if (P.wall('aufnahme.schalter', 'back', { from: 1.1 + i * 2.1 })) k++;
  for (let i = 0; i < k; i++) P.at('aufnahme.diskretion', 1.1 + i * 2.1, P.D - 2.2, 'front', { force: true, ghost: true });
  P.near('foyer.ticketsaeule', 0.8, 1.4, 'front', { radius: 1 });
  P.any('foyer.aufrufmonitor', ['left', 'right', 'front'], { overlay: true, from: 'mid' });
  if (P.D > 7) grid(P, 'warte.stuhlreihe', 2.8, 1.6, { mu: 1.6, mv: 1.6, max: Math.floor(P.area / 18) });
  plants(P, 2); clock(P);
};
RZ.warten = (orig => P => { orig(P); P.any('foyer.aufrufmonitor', ['left', 'right', 'back'], { overlay: true }); clock(P); if (P.area > 30) P.near('kind.spieltisch', P.W - 1.2, P.D - 1.2); })(RZ.warten);
RZ.cafeteria = P => {
  P.any('gastro.theke', ['back', 'left', 'right'].filter(s => !P.fac[s]).concat(['back']), { maxH: 3 });
  P.any('gastro.kaffeebar', solidOr(P), { maxH: 3 }); P.any('gastro.kuehlvitrine', solidOr(P), { maxH: 3 });
  grid(P, 'gastro.tisch4', 2.4, 2.4, { m: 1.6 });
  P.any('gastro.tablettrueckgabe', solidOr(P), {}); P.any('gastro.stehtisch', ['left', 'right', 'front'], {});
  plants(P, 3);
};
RZ.kiosk = P => { P.any('service.kiosk', ['back', 'left', 'right'], { maxH: 3 }); P.fill('buero.regal', solidOr(P), { max: 4 }); P.any('gastro.kuehlvitrine', solidOr(P), { maxH: 3 }); P.near('gastro.stehtisch', P.W / 2, P.D / 2); };
RZ.kapelle = P => {
  P.any('service.kapelle', ['back'], { maxH: 4 }) || P.near('kapelle.kerzen', P.W / 2, P.D - 1);
  P.near('kapelle.kerzen', P.W - 1, P.D - 0.8, 'front');
  for (let v = 1.6; v < P.D - 2.2; v += 1.3) P.at('kapelle.bank', P.W / 2, v, 'back');
  plants(P, 2);
};
RZ.sozialdienst = P => { deskSet(P, P.window() || 'back') || deskSet(P, 'left'); P.near('stat.tisch4', P.W / 2, P.D / 2 + 0.4); P.any('buero.aktenschrank', solidOr(P, ['front']), {}); plants(P, 1); };
RZ.spielzimmer = P => { P.near('kind.spielhaus', P.W - 1, P.D - 1, 'front'); P.near('kind.spieltisch', P.W / 2, P.D / 2); P.any('service.spielecke', ALL, { maxH: 3 }); P.any('stat.buecherregal', solidOr(P), {}); P.any('warte.sofa', ['left', 'right', 'back'], {}); };
RZ.abschied = P => { P.near('patho.aufbahrung', P.W / 2, P.D / 2 + 0.3, 'front'); P.near('kapelle.bank', P.W / 2, 1.2, 'back'); plants(P, 2); P.any('kapelle.kerzen', ['left', 'right'], {}); };

/* ---------- Notaufnahme ---------- */
RZ.triage = P => { P.near('zna.triage', P.W / 2, P.D / 2); P.near('med.blutdruck', P.W - 0.5, P.D - 0.6); P.any('stat.modulschrank', solidOr(P), {}); sink(P); disinfect(P); P.any('stat.treteimer', ['front', 'left'], {}); };
RZ.schockraum = P => {
  P.near('zna.schockraumtrage', P.W / 2, P.D / 2 + 0.2, 'front');
  P.at('med.op.leuchte', P.W / 2, P.D / 2 + 0.2, 'front', { force: true, ghost: true });
  P.near('med.beatmung', P.W / 2 - 1.3, P.D / 2 - 0.6, 'right'); P.near('med.monitor.patient', P.W / 2 + 1.3, P.D / 2 - 0.6, 'left');
  P.near('med.defi.notfallwagen', P.W / 2 + 1.5, P.D / 2 + 1.2, 'left'); P.near('med.ultraschall', P.W / 2 - 1.5, P.D / 2 + 1.3, 'right'); P.near('med.roentgen.mobil', P.W - 1.0, 1.6, 'left');
  P.near('med.perfusor', P.W / 2 - 1.4, P.D / 2 + 0.4); P.fill('stat.modulschrank', solidOr(P), { max: 3 }); sink(P); disinfect(P); P.any('zna.notfallrucksack', ['left', 'right'], { mount: true }); clock(P);
};
RZ.gips = P => { P.near('med.liege.behandlung', P.W / 2, P.D / 2, 'right'); P.any('zna.gipstisch', solidOr(P), {}); P.any('stat.modulschrank', solidOr(P), {}); sink(P); };
RZ.zna_box = P => { P.any('med.liege.untersuchung', ['left', 'right', 'back'], { off: 0.3 }) || P.near('med.liege.untersuchung', P.W / 2, P.D / 2); P.any('med.versorgung.wand', ['left', 'right', 'back'], { mount: true }); P.near('med.monitor.patient', P.W / 2 - 1, P.D - 0.8); P.near('med.blutdruck', P.W - 0.6, 1.6); P.any('stat.modulschrank', solidOr(P), {}); deskSet(P, 'front') || P.near('stat.visitewagen', P.W - 0.8, P.D / 2); sink(P); disinfect(P); P.near('med.infusion', P.W / 2 + 1, P.D / 2); };

/* ---------- Radiologie ---------- */
const warn = P => P.wall('rad.warnleuchte', 'front', { overlay: true, from: 'mid' });
RZ.roentgen = P => { P.near('med.roentgen', P.W / 2, P.D / 2 + 0.3, 'front'); P.any('rad.bleischuerze', ['left', 'right'], {}); P.any('rad.umkleide', ['left', 'right', 'back'], { maxH: 3 }); P.any('stat.modulschrank', solidOr(P), {}); sink(P); warn(P); };
RZ.ct = P => { P.near('med.ct', P.W / 2, P.D / 2 + 0.2, 'front'); P.near('rad.injektor', P.W / 2 + 1.6, P.D / 2 - 0.6); P.fill('stat.modulschrank', solidOr(P), { max: 2 }); P.any('rad.bleischuerze', ['left', 'right'], {}); sink(P); warn(P); };
RZ.mrt = P => { P.near('med.mrt', P.W / 2, P.D / 2 + 0.2, 'front'); P.fill('stat.modulschrank', solidOr(P), { max: 2 }); warn(P); P.near('rad.injektor', P.W / 2 - 1.8, P.D / 2 - 0.8); };
RZ.schaltraum = P => { P.any('rad.konsole', ['back', 'left', 'right'], {}); P.any('rad.bleiglas', ['back', 'left', 'right'], { overlay: true }); P.near('buero.stuhl', P.W / 2 - 0.6, P.D / 2); P.near('buero.stuhl', P.W / 2 + 0.6, P.D / 2); P.any('buero.aktenschrank', solidOr(P), {}); };
RZ.befundung = P => { let n = 0; for (const s of ['back', 'left', 'right']) while (n < 4 && P.wall('rad.befundung', s, {})) n++; for (let i = 0; i < n; i++) P.near('buero.stuhl', P.W / 2 + (i - n / 2) * 1.2, P.D / 2); P.any('buero.aktenschrank', solidOr(P), {}); };
RZ.umkleide_pat = P => { P.fill('rad.umkleide', ['back', 'left', 'right'], { maxH: 3 }); };

/* ---------- OP-Bereich ---------- */
RZ.op = P => {
  P.near('med.op.tisch', P.W / 2, P.D / 2 + 0.2, 'front');
  P.at('med.op.leuchte', P.W / 2, P.D / 2 + 0.2, 'front', { force: true, ghost: true });
  P.at('med.op.pendel', P.W / 2 - 1.6, P.D / 2 - 0.4, 'front', { force: true, ghost: true });
  P.near('med.op.anaesthesie', P.W / 2, P.D / 2 - 1.6, 'back');
  P.near('med.op.instrumententisch', P.W / 2 + 1.6, P.D / 2 + 1.2, 'left'); P.near('med.op.mayo', P.W / 2 + 1.0, P.D / 2 + 0.3, 'left');
  if (P.area > 40) { P.near('med.op.endoskopieturm', P.W / 2 - 1.8, P.D / 2 + 1.4, 'right'); P.near('med.op.cbogen', P.W - 1.2, 1.4); }
  P.any('med.op.waermeschrank', solidOr(P), {}); P.fill('op.sterilschrank', solidOr(P), { max: 2 }); P.any('rad.bleischuerze', ALL, {}); clock(P);
};
RZ.einleitung = P => { P.near('med.trage', P.W / 2, P.D / 2, 'front'); P.near('med.narkose', P.W / 2, P.D / 2 - 1.5, 'back'); P.near('med.monitor.patient', P.W / 2 - 1.1, P.D / 2 - 1.0); P.near('med.perfusor', P.W / 2 + 1.1, P.D / 2 - 0.8); P.fill('stat.modulschrank', solidOr(P), { max: 2 }); sink(P); };
RZ.aufwach = P => { P.fill('op.aufwachplatz', ['back', 'left', 'right'], { maxH: 3 }); P.near('med.zentralmonitor', P.W / 2, 1.4); P.near('med.defi.notfallwagen', P.W - 0.8, 1.4); P.any('stat.modulschrank', ['front'], {}); sink(P); disinfect(P); };
RZ.op_schleuse = P => { P.near('op.umbetter', P.W / 2, P.D / 2, 'front'); sink(P); P.any('stat.desinfektion', ['left', 'right'], { mount: true }); };
RZ.waschraum_op = P => { P.fill('med.op.waschrinne', ['back', 'left', 'right'], {}); P.any('san.handtuchspender', ALL, { overlay: true }); };
RZ.sterilgut = P => { P.fill('op.sterilschrank', solidOr(P), {}); if (P.area > 16) grid(P, 'zsva.sterilgutregal', 1.4, 2.0, { m: 1.4 }); P.near('log.zsva.transportwagen', P.W / 2, 1.5); };

/* ---------- Labor, Apotheke, ZSVA ---------- */
RZ.labor_gross = P => {
  const s = solidOr(P);
  for (const id of ['lab.analysator', 'lab.analysator', 'lab.probenroboter', 'lab.sicherheitswerkbank', 'lab.abzug', 'lab.blutkuehlschrank', 'lab.tiefkuehl']) P.any(id, s, { maxH: 3 });
  grid(P, 'lab.werkbank', 2.4, 2.6, { m: 2.0 }); P.near('lab.zentrifuge', P.W / 2, 1.4); P.near('lab.mikroskop', P.W / 2 + 1, 1.6); sink(P);
};
RZ.labor = (orig => P => { orig(P); P.any('lab.analysator', P.solid(), {}); P.near('lab.mikroskop', P.W / 2, P.D / 2); })(RZ.labor);
RZ.apotheke = P => { P.any('apo.kommissionierautomat', ['back', 'left', 'right'], { maxH: 4 }); P.any('apo.unitdose', solidOr(P), { maxH: 3 }); P.fill('buero.regal', solidOr(P), { max: 6 }); deskSet(P, 'front') || deskSet(P, 'left'); P.any('lab.sicherheitswerkbank', solidOr(P), {}); P.near('log.apothekenbox', P.W / 2, 1.4); P.near('stat.medikamentenwagen', P.W / 2 + 1, 1.6); };
RZ.zsva = P => { P.fill('zsva.rdg', ['back'], { max: 3, maxH: 3 }); P.any('zsva.sterilisator', ['left', 'right'], { maxH: 3 }); P.any('zsva.ultraschallbecken', solidOr(P), {}); grid(P, 'zsva.packtisch', 2.6, 2.4, { m: 2.2, max: 4 }); P.fill('zsva.sterilgutregal', solidOr(P), { max: 3 }); P.near('log.instrumentenwagen.unrein', 1.2, 1.4); P.near('log.sterilgutwagen', P.W - 1.2, 1.4); sink(P); };

/* ---------- Speisenversorgung ---------- */
RZ.kueche_zentral = P => {
  const s = solidOr(P);
  for (const id of ['kueche.kombidaempfer', 'kueche.kombidaempfer', 'kueche.kombidaempfer', 'kueche.herd', 'kueche.kochkessel', 'kueche.kochkessel', 'kueche.kippbratpfanne', 'kueche.spueltisch']) P.any(id, s, { maxH: 3 });
  if (P.W >= 8 && P.D >= 5) P.near('kueche.tablettband', P.W / 2, P.D / 2, 'front', { radius: 2 });
  grid(P, 'kueche.arbeitstisch', 3.0, 2.6, { m: 1.8, max: 6 }); P.fill('kueche.regal', s, { max: 4 });
  for (let i = 0; i < 3; i++) P.near('kueche.speisenverteilwagen', 1.2 + i * 1.6, 1.3);
  sink(P);
};
RZ.spuelkueche = P => { P.any('kueche.spuelstrasse', ['back', 'left', 'right'], { maxH: 3 }); P.any('kueche.spueltisch', solidOr(P), {}); P.fill('gastro.tablettrueckgabe', solidOr(P), { max: 3 }); P.fill('kueche.regal', solidOr(P), { max: 2 }); };
RZ.kuehlraum = P => { P.fill('kueche.kuehlzelle', ['back', 'left', 'right'], { maxH: 3 }); P.fill('kueche.regal', solidOr(P), { max: 2 }); };
RZ.speisesaal = P => { P.any('gastro.ausgabe', ['back', 'left', 'right'].filter(s => !P.fac[s]), { maxH: 3 }); P.any('gastro.kaffeebar', solidOr(P), { maxH: 3 }); P.any('gastro.tablettrueckgabe', solidOr(P), {}); grid(P, 'gastro.tischlang', 2.8, 2.6, { m: 1.8 }); plants(P, 3); clock(P); };

/* ---------- Personal, Wäsche, Betten, Lager, Entsorgung ---------- */
RZ.umkleide = P => { P.fill('personal.spindreihe', ['back', 'left', 'right'], { maxH: 3 }); grid(P, 'personal.umkleidebank', 2.6, 2.2, { m: 1.8, max: 4 }); P.any('personal.kleiderautomat', ['front', 'left', 'right'], { maxH: 3 }); P.any('stat.garderobe', ['front'], { mount: true }); };
RZ.waesche = P => { if (P.area > 40) { P.any('waesche.waschmaschine', solidOr(P), {}); P.any('waesche.trockner', solidOr(P), {}); P.any('waesche.mangel', solidOr(P), { maxH: 3 }); } P.fill('log.waeschecontainer', ['back', 'left', 'right'], { maxH: 3 }); P.fill('kueche.regal', solidOr(P), { max: 2 }); };
RZ.bettenzentrale = P => { P.any('hyg.bettenaufbereitung', ['back', 'left', 'right'], { maxH: 3 }); P.fill('med.bett.pflege', ['back', 'left', 'right'], { edge: 0.15, max: Math.max(2, Math.floor(P.area / 6)) }); P.near('hyg.reinigungswagen', P.W / 2, 1.4); P.near('stat.waeschesammler', P.W / 2 + 1.2, 1.4); };
RZ.zentrallager = P => { for (let v = 1.5; v < P.D - 1.2; v += 3.2) for (let u = 1.6; u < P.W - 1.4; u += 3.0) P.at('log.kommissionierregal', u, v, 'front'); P.near('log.hubwagen', 1.2, P.D - 1.2); P.near('log.gitterbox', P.W - 1.2, P.D - 1.2); P.near('log.rollcontainer', P.W / 2, P.D - 1.0); };
RZ.warenannahme = P => { P.any('log.paketannahme', ['back', 'left', 'right'], { maxH: 3 }); grid(P, 'log.palette', 1.8, 1.8, { m: 1.6, max: 6 }); P.near('log.hubwagen', 1.2, 1.4); P.near('log.gitterbox', P.W - 1.2, 1.4); P.near('log.rollcontainer', P.W / 2, 1.4); };
RZ.entsorgung_zentral = P => { P.fill('log.abfall1100', ['back', 'left', 'right'], { max: 6 }); P.fill('log.abfall240', solidOr(P), { max: 4 }); P.near('log.waeschewagen.unrein', P.W / 2, 1.4); P.near('stat.sammelbehaelter.ak', P.W / 2 + 1, 1.4); };

/* ---------- Verwaltung, Schulung ---------- */
RZ.verwaltung = P => { let n = 0; const want = U.clamp(Math.floor(P.area / 9), 1, 8); for (const s of [P.window() || 'back', 'back', 'left', 'right']) while (n < want && deskSet(P, s)) n++; if (P.area > 30) grid(P, 'buero.doppelarbeitsplatz', 2.6, 3.0, { m: 2.0, max: Math.floor(P.area / 30) }); P.fill('buero.aktenschrank', P.solid(['front']), { max: 3 }); P.any('buero.kopierer', solidOr(P), {}); plants(P, 2); clock(P); };
RZ.schulung = P => { P.any('schulung.leinwand', ['back', 'left', 'right'], { overlay: true, from: 'mid' }); P.near('schulung.pult', P.W - 1.2, P.D - 1.4, 'front'); for (let v = 1.6; v < P.D - 2.4; v += 1.5) for (let u = 1.4; u < P.W - 1.2; u += 2.4) P.at('schulung.tischreihe', u, v, 'back'); P.near('schulung.reaphantom', P.W - 1.2, 1.4); plants(P, 1); };
RZ.bibliothek = P => { P.fill('stat.buecherregal', solidOr(P), {}); grid(P, 'stat.tisch4', 2.4, 2.4, { m: 1.8, max: 4 }); plants(P, 2); };

/* ---------- Technik, Pathologie ---------- */
RZ.technikzentrale = P => { const s = solidOr(P); for (const id of ['technik.schaltschrank', 'technik.usv', 'technik.medgas']) P.any(id, s, { maxH: 3, overlay: id === 'technik.medgas' }); if (P.area > 30) { P.near('technik.rlt', P.W / 2, P.D / 2, 'front', { radius: 2 }); P.near('technik.kaelte', P.W / 2, P.D - 1.2, 'front', { radius: 2 }); } P.near('technik.pumpen', 1.6, 1.4); P.near('technik.kessel', P.W - 1.4, 1.6); };
RZ.technik = RZ.technikzentrale;
RZ.it = P => { for (let v = 1.4; v < P.D - 1.0; v += 2.2) P.at('technik.server', P.W / 2, v, 'front'); P.any('technik.usv', solidOr(P), { maxH: 3 }); P.any('technik.schaltschrank', solidOr(P), { maxH: 3 }); };
RZ.pathologie = P => { P.near('patho.sektionstisch', P.W / 2, P.D / 2, 'front'); P.any('patho.kuehlung', ['back', 'left', 'right'], { maxH: 3 }); P.any('lab.abzug', solidOr(P), { maxH: 3 }); P.any('lab.werkbank', solidOr(P), {}); sink(P); };

/* ---------- Fachbereiche ---------- */
RZ.kreisssaal = P => { P.near('med.bett.entbindung', P.W / 2, P.D / 2 + 0.3, 'front'); P.near('med.ctg', P.W / 2 - 1.3, P.D / 2 - 0.4); P.any('med.reanimationseinheit.neo', solidOr(P), {}); if (P.area > 28) P.any('med.gebaerwanne', ['left', 'right', 'back'], {}); P.any('med.wickeltisch', solidOr(P), {}); P.any('stat.modulschrank', solidOr(P), {}); P.near('stat.sessel', P.W - 0.8, P.D - 0.8); sink(P); disinfect(P); clock(P); };
RZ.physio = P => { grid(P, 'physio.bank', 2.6, 2.6, { m: 1.6, max: 4 }); for (const id of ['physio.barren', 'physio.sprossenwand', 'physio.ergometer', 'physio.laufband', 'physio.hantelregal']) P.any(id, ALL, { maxH: 3 }); P.near('physio.matte', P.W / 2, P.D / 2); plants(P, 1); };
RZ.endoskopie = P => { P.near('med.liege.untersuchung', P.W / 2, P.D / 2, 'right'); P.near('med.op.endoskopieturm', P.W / 2 - 1.3, P.D / 2 - 0.5); P.near('med.monitor.patient', P.W / 2 + 1.2, P.D / 2 - 0.8); P.any('med.endo.trockenschrank', solidOr(P), {}); P.any('stat.modulschrank', solidOr(P), {}); sink(P); };
RZ.herzkatheter = P => { P.near('med.angio', P.W / 2, P.D / 2, 'front'); P.near('med.monitor.patient', P.W / 2 + 1.6, P.D / 2 - 1.0); P.near('med.defi.notfallwagen', P.W - 0.8, 1.4); P.fill('op.sterilschrank', solidOr(P), { max: 2 }); P.any('rad.bleischuerze', ALL, {}); warn(P); };
RZ.dialyseplatz = P => RZ.behandlung(P, { typ: 'dialyse' });
})();
/* Versorgungs-/Logistikflächen (z. B. in Standortmodellen) */
(function () {
  const HSS = window.HSS, U = HSS.util, RZ = HSS.EINRICHTUNG;
  RZ.logistik = P => { P.fill('log.rollcontainer', ['back', 'left', 'right'], { max: 6 }); for (let v = 2.2; v < P.D - 1.5 && v < 12; v += 2.4) for (let u = 1.6; u < P.W - 1.2 && u < 14; u += 2.2) P.at(['log.modulwagen', 'log.waeschewagen.rein', 'log.speisenwagen', 'log.palette'][Math.floor((u + v) * 7) % 4], u, v, 'front'); P.near('log.hubwagen', 1.0, 1.4); };
  RZ.awt = P => { P.any('awt.station', ['back', 'left', 'right'], { maxH: 3 }); P.near('awt.container', P.W / 2, P.D / 2); P.near('awt.container', P.W / 2 + 1.2, P.D / 2); };
  // großer Pflegebereich (Standortmodelle: Station als eine Fläche) – Bettenreihen mit Nachttischen, Stützpunkt in der Mitte
  RZ.pflege = P => { P.near('stat.stuetzpunkt', P.W / 2, P.D / 2, 'front', { radius: 3 }); for (const s of ['back', 'front', 'left', 'right']) { let k = 0; while (k < 40 && P.wall('med.bett.pflege', s, { off: 0.3, edge: 0.6 })) { k++; } } P.fill('stat.nachttisch', ['back', 'front'], { max: 30 }); P.near('stat.visitewagen', P.W / 2 + 2, P.D / 2); P.near('stat.verbandwagen', P.W / 2 - 2, P.D / 2); };
  /* Räume ohne Einrichtung nachträglich einrichten (Standortmodelle, Demo, ältere Projekte) */
  HSS.furnishEmpty = (prj = HSS.project(), o = {}) => {
    let n = 0; const max = o.max || 6000;
    const byFloor = new Map(); for (const ob of prj.objects) if (ob.host) { const k = ob.host.part + '|' + ob.host.floor; if (!byFloor.has(k)) byFloor.set(k, []); byFloor.get(k).push(ob); }
    for (const b of prj.buildings) for (const pt of b.parts) for (const [f, I] of Object.entries(prj.interiors[pt.id] || {})) {
      const objs = byFloor.get(pt.id + '|' + f) || [];
      for (const r of I.rooms) {
        if (n > max || ['flur', 'kern', 'schacht', 'lichthof', 'nass', 'vorraum'].includes(r.use) || !RZ[r.use]) continue;
        if (r.w * r.d > (o.maxArea || 900)) continue;
        if (objs.some(ob => Math.abs(ob.x - r.x) < r.w / 2 && Math.abs(ob.z - r.z) < r.d / 2)) continue;
        for (const ob of HSS.furnishRoom(pt, +f, r, I, { typ: r.station ? prj.stations.find(s => s.id === r.station)?.typ : null })) { prj.objects.push(Object.assign({ id: U.uid('obj'), host: { part: pt.id, floor: +f }, auto: true }, ob, r.station ? { station: r.station } : {})); n++; }
      }
    }
    return n;
  };
})();
