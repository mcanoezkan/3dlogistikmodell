/* =====================================================================
   HSS · standorte.js – Standortmodelle (reale Kliniken) als bearbeitbare Projekte
   Übernimmt die Daten der 3D-Logistikmodelle (Bundeswehrzentralkrankenhaus Koblenz,
   Klinikum Hanau) in das Projektformat der Suite: Baukörper mit Geschossen und
   Untergeschossen, Straßen und Wege, Aufzüge und Treppenhäuser, Funktionsbereiche als
   Räume mit Logistik-Rolle, Pflegebereiche als Stationen und die Transportflüsse des
   Modells (Fahrten je Tag, Rein/Unrein, Tagesprofile). Danach ist alles wie ein eigenes
   Projekt veränderbar; „Standort verorten“ verschiebt/dreht das ganze Modell und setzt
   die Geokoordinaten.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;

HSS.STANDORTE = [
  { id: 'koblenz', name: 'Bundeswehrzentralkrankenhaus Koblenz', ort: 'Koblenz, Rübenacher Straße 170', datei: 'standorte/koblenz.js',
    text: 'Gebäude und Straßen aus OpenStreetMap, Gebäudebezeichnungen und Geschossbelegung nach Lageplan und Wegweiser; Neubau K1 (im Bau). Bereiche, Aufzüge, Mengen und Zeiten aus dem Patient-, Prozess- und Ressourcenmodell (BwZK v4, überwiegend Annahmen).',
    varianten: [{ id: 'ist', name: 'Bestand (Ist)' }, { id: 'soll', name: 'Soll-Variante (Logistik optimiert)' }] },
  { id: 'hanau', name: 'Klinikum Hanau', ort: 'Hanau, Leimenstraße 20', datei: 'standorte/hanau.js', geo: { lat: 50.133627, lon: 8.923008, nord: 45.8, hinweis: 'aus der Lage der Häuser H, HB, W, A, M, K1, K2, Z, N, D und I zu OpenStreetMap ausgeglichen (Abweichung im Mittel ca. 12 m); Modellraster um 45,8° gegen Nord gedreht' },
    text: 'Baukörper, Baujahre, BGF/NGF aus dem baulichen Konzept (Bestandsanalyse und Variante 2, DF Architekten), aus der Isometrie in Meter umgerechnet (±20 %). Bereiche, Aufzüge, Mengen und Zeiten aus dem 3D-Logistikmodell (überwiegend Annahmen).',
    varianten: [{ id: 'ist', name: 'Bestand (Ist)' }, { id: 'soll', name: 'Variante 2 (Zielvariante mit Neubau und Versorgungszentrum)' }] },
  { id: 'bielefeld', name: 'Klinikum Bielefeld-Mitte', ort: 'Bielefeld, Teutoburger Straße 50', datei: 'standorte/bielefeld.js', geo: { lat: 52.014139, lon: 8.544318, nord: 115.4, hinweis: 'Modellursprung Mitte Hauptgebäude; Raster um 115,4° gegen Nord gedreht (wie im 3D-Logistikmodell)' },
    text: 'Gebäude, Ebenen U1–12, Umgebung, Straßen und Wege aus OpenStreetMap; Nutzungen, Stationen, NIZ laut Klinikum (Lageplan Juli 2026). Bereiche, Aufzüge, Warenströme, Mengen und Zeiten aus dem 3D-Logistikmodell Bielefeld (teilweise Annahmen); Soll-Variante mit getrennten Rein-/Unrein-Wegen.',
    varianten: [{ id: 'ist', name: 'Ist-Zustand (NIZ in Betrieb)' }, { id: 'soll', name: 'Soll-Variante (Optimierung)' }] }
];
const PRE = { koblenz: 'kob_', hanau: 'han_', bielefeld: 'bie_' };

const loadScript = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Datei nicht gefunden: ' + src)); document.head.appendChild(s); });
const centroid = pts => { let a = 0, cx = 0, cz = 0; for (let i = 0; i < pts.length; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[(i + 1) % pts.length]; const f = x0 * z1 - x1 * z0; a += f; cx += (x0 + x1) * f; cz += (z0 + z1) * f; } if (Math.abs(a) < 1e-6) { const b = G.bbox(pts); return [b.cx, b.cz]; } return [cx / (3 * a), cz / (3 * a)]; };
const rectPoly = ([cx, cz, len, wid, ang = 0]) => { const a = U.rad(ang); return [[-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2]].map(([u, v]) => [cx + u * Math.cos(a) - v * Math.sin(a), cz + u * Math.sin(a) + v * Math.cos(a)]); };
const boxPoly = ([x1, z1, x2, z2]) => [[x1, z1], [x2, z1], [x2, z2], [x1, z2]];
const r1 = v => Math.round(v * 100) / 100;

/* Szenario anwenden (Soll = Änderungen gegenüber Ist) */
function scenario(D, v) {
  const ch = (v === 'soll' && D.scenarios?.soll?.changes) || {};
  const gone = new Set(ch.gebaeudeRemove || []);
  const areas = (D.areas || []).map(a => Object.assign({}, a, (ch.areaOverrides || {})[a.id] || {}));
  const lifts = (D.lifts || []).filter(l => !gone.has(l.building)).map(l => Object.assign({}, l, (ch.liftOverrides || {})[l.id] || {})).concat(ch.liftsAdd || []);
  const profiles = Object.assign({}, D.profiles || {}, ch.profiles || {}), areaGroups = Object.assign({}, D.areaGroups || {}, ch.areaGroups || {});
  return { ch, gone, areas, lifts, profiles, areaGroups, legRules: ch.legRules || [], massnahmen: v === 'soll' ? D.scenarios?.soll?.massnahmen || [] : [], name: D.scenarios?.[v]?.name || '' };
}

/* Bausteine des Projekts */
function builder(prj, fh) {
  const parts = [];
  const FAS = { hospital: ['band', '#ece7de'], standard: ['loch', '#e4e2dd'], office: ['loch', '#e4e2dd'], parking: ['parkhaus', '#cfd6dc'], technik: ['paneel', '#d5d8dc'], construction: ['glas', '#e9edf0'], neubau: ['glas', '#eef1f3'] };
  return {
    parts,
    building(o) {
      const b = Object.assign(HSS.defaults.building(), { id: o.id, name: o.name, kurz: o.kurz || '', color: o.color || '#144477', parts: [] });
      if (o.info) b.info = o.info; if (o.noLabel) b.noLabel = true;
      prj.buildings.push(b); return b;
    },
    part(b, o) {
      const von = o.von ?? 0, bis = Math.max(o.bis ?? 0, von);
      const [ft, fc] = FAS[o.typ] || FAS.standard;
      const pt = Object.assign(HSS.defaults.part(), { id: o.id, name: o.name || b.name, floorHeight: o.hoehe && bis === Math.max(0, von) ? o.hoehe : fh, basementHeight: fh });
      if (o.rect) { const [cx, cz, len, wid, ang] = o.rect; Object.assign(pt, { shape: 'rect', x: r1(cx), z: r1(cz), w: r1(len), d: r1(wid), rot: ang || 0, cornerRadius: o.radius || 0 }); }
      else { const poly = o.poly; const c = centroid(poly); const loc = poly.map(p => [r1(p[0] - c[0]), r1(p[1] - c[1])]); const bb = G.bbox(loc); Object.assign(pt, { shape: 'poly', poly: loc, x: r1(c[0]), z: r1(c[1]), w: r1(bb.w), d: r1(bb.d), rot: 0 }); }
      let off = 0;
      if (o.stackOn) { pt.stackOn = o.stackOn; pt.floors = bis - von + 1; pt.basements = 0; off = von; }
      else if (von > 0) { pt.floorOffset = von; pt.baseOffset = U.sum(Array.from({ length: von }, () => fh)); pt.floors = bis - von + 1; pt.basements = 0; off = von; }
      else { pt.floors = bis + 1; pt.basements = von < 0 ? -von : 0; }
      pt.facade = Object.assign(pt.facade, { type: ft, color: fc, accent: o.accent || '#144477', windowRatio: ft === 'loch' ? 0.38 : 0.5 });
      pt.roof = Object.assign(pt.roof, { plant: false, parapet: 0.6, type: 'flach', helipad: !!o.helipad }); // Dachaufbauten nur, wo die Quelle sie enthält
      if (o.typ === 'technik') { pt.floorHeight = o.hoehe || 3.0; pt.roof.parapet = 0.15; pt.roof.plant = false; pt.facade.windowRatio = 0.1; pt.facade.color = '#c9ced4'; if (!o.stackOn && von <= 0) pt.basements = 0; }
      if (o.typ === 'parking') pt.use = 'parkhaus';
      b.parts.push(pt); parts.push({ b, pt, von: o.stackOn || von > 0 ? von : (pt.basements ? -pt.basements : 0), bis, off, src: o }); return pt;
    },
    // Bauteil eines Gebäudes, das den Punkt enthält und das Geschoss l hat
    find(bid, p, l) {
      const cands = parts.filter(x => (!bid || x.b.id === bid) && (l === undefined || (l >= x.von && l <= x.bis)));
      const inside = cands.find(x => G.pointIn(HSS.toLocal(x.pt, p), HSS.partFootprintLocal(x.pt).outer));
      if (inside) return inside;
      if (!bid) return null;
      return cands.sort((a, c) => G.dist([a.pt.x, a.pt.z], p) - G.dist([c.pt.x, c.pt.z], p))[0] || null;
    },
    localFloor: (x, l) => l - (x.off || 0)
  };
}

const ROLLE = { kueche: 'kueche', zlager: 'zentrallager', waesche: 'waescherei', apotheke: 'apotheke', zsva: 'zsva', abfall: 'abfall', labor: 'labor', betten: 'bettenzentrale', op: 'op', zna: 'zna', notaufnahme: 'zna', radiologie: 'radiologie', post: 'verwaltung', rampe: 'rampe' };
const USE = (a) => ({ op: 'op', sterillager: 'lager', zlager: 'lager', rampe: 'logistik', abfall: 'logistik', kueche: 'logistik', waesche: 'logistik', zsva: 'logistik', betten: 'logistik', apotheke: 'medikamente', labor: 'labor', radiologie: 'untersuchung', zna: 'behandlung', notaufnahme: 'behandlung', technik: 'technik', post: 'buero', heli: 'logistik' })[a.id] || ({ Pflege: 'pflege', Medizin: 'untersuchung', Notfall: 'behandlung', Versorgung: 'logistik', Entsorgung: 'logistik', 'Technik/Verwaltung': 'buero' })[a.kat] || 'sonstiges';
const MAT = (flow, leg) => {
  const u = leg.cls === 'unrein';
  if (leg.p === 'anlieferung') return ['m_ware', 't_hand'];
  return ({ speisen: [u ? 'm_geschirr' : 'm_speisen', 't_schlepper'], waesche: [u ? 'm_waesche_u' : 'm_waesche_r', 't_schlepper'], sterilgut: [u ? 'm_instr_u' : 'm_steril', 't_hand'], arznei: ['m_arznei', 't_hand'], lager: ['m_modul', 't_schlepper'], betten: [u ? 'm_betten' : 'm_betten_r', 't_bett'], abfall: ['m_abfall', 't_schlepper'], patient: ['m_patient', 't_bett'], post: [/Probe/i.test(leg.txt || '') ? 'm_proben' : 'm_post', 't_hand'] })[flow.id] || [u ? 'm_abfall' : 'm_modul', 't_hand'];
};
const windows = prof => {
  if (!prof) return [[6, 20]];
  const mx = Math.max(...prof); const on = prof.map(v => v >= mx * 0.15 && v > 0); const out = []; let a = null;
  for (let h = 0; h <= 24; h++) { if (on[h] && a === null) a = h; if ((!on[h] || h === 24) && a !== null) { out.push([a, h]); a = null; } }
  return out.length ? out : [[6, 20]];
};

/* ---------- Konvertierung ---------- */
function convert(S, def, v, opts = {}) {
  const D = S.D, O = S.O;
  const sc = scenario(D, v);
  const prj = HSS.newProject(`${def.name}${v === 'soll' ? ' – ' + (def.varianten.find(x => x.id === 'soll')?.name || 'Soll') : ' – Bestand'}`);
  const fh = D.meta?.geschosshoehe || 3.7;
  const B = builder(prj, fh);
  prj.meta.notes = [`Standortmodell: ${def.name} (${def.ort}).`, def.text, ...(D.assumptions || []).map(a => '• ' + a), ...(sc.massnahmen.length ? ['Maßnahmen der Variante:', ...sc.massnahmen.map(m => '• ' + m)] : [])].join('\n');
  prj.meta.standort = { id: def.id, variante: v, rev: 2, quelle: D.meta?.quelle || O?.quelle || '', stand: D.meta?.stand || '' };
  if (O?.origin) prj.meta.geo = { lat: O.origin.lat, lon: O.origin.lon, nord: 0, quelle: O.quelle };
  const bmap = {};
  /* Gebäude */
  if (def.id === 'koblenz') {
    const korr = D.gebaeude?.korrektur || {}, farbe = D.gebaeude?.hausfarbe || {}, ug = new Set(D.gebaeude?.ugAnnahme || []);
    for (const ob of O.buildings) {
      const k = korr[ob.id] || {}; const id = k.id || ob.id; const anz = k.anzeige || (/^o\d/.test(id) ? '' : id);
      const typ = k.neubau ? 'neubau' : (k.typ || ob.typ) === 'parking' ? 'parking' : ['hospital'].includes(k.typ || ob.typ) ? 'hospital' : ['office', 'school', 'civic', 'commercial', 'dormitory'].includes(k.typ || ob.typ) ? 'office' : ['container', 'service', 'storage', 'roof'].includes(k.typ || ob.typ) ? 'technik' : 'standard';
      const name = ob.name || k.kurz || (anz ? 'Haus ' + anz : 'Nebengebäude');
      const b = B.building({ id: 'kob_' + id, name, kurz: anz, noLabel: !anz && !ob.name, color: farbe[anz] || (typ === 'hospital' ? '#144477' : '#4b5058'), info: [k.kurz, k.neubau ? 'Neubau (im Bau)' : '', ob.osm ? 'OSM ' + ob.osm : ''].filter(Boolean).join(' · ') });
      bmap[id] = b;
      const basement = ug.has(id) ? -1 : 0;
      const maxL = k.maxL ?? ob.maxL ?? 0;
      const usable = (ob.parts || []).filter(p => Math.abs(G.area(p.poly)) > 6).map(p => ({ poly: p.poly, maxL: Math.min(k.maxL ?? 99, p.maxL ?? maxL), area: Math.abs(G.area(p.poly)) }));
      const small = typ === 'technik' || Math.abs(G.area(ob.poly || [[0, 0]])) < 40;
      if (k.rect) B.part(b, { id: `kob_${id}_0`, name, rect: k.rect, radius: k.radius, von: basement, bis: maxL, typ, accent: farbe[anz] });
      else if (usable.length > 1 && !k.vollKubatur && !k.poly) {
        // Gebäudeumriss als Sockel in der vorherrschenden Höhe, höhere Gebäudeteile (Türme, Technikaufbauten) aufgesetzt
        const tot = U.sum(usable.map(p => p.area)), big = usable.filter(p => p.area >= 0.15 * tot);
        const H0 = Math.min(maxL, big.length ? Math.min(...big.map(p => p.maxL)) : maxL);
        const base = B.part(b, { id: `kob_${id}_0`, name, poly: ob.poly, von: small ? 0 : basement, bis: H0, typ, accent: farbe[anz], helipad: id === 'S' });
        usable.filter(p => p.maxL > H0).forEach((p, i) => {
          const tech = p.area < 80 && p.maxL - H0 <= 1;
          B.part(b, { id: `kob_${id}_${i + 1}`, name: tech ? `${name} · Technikaufbau` : `${name} · Aufstockung ${i + 1}`, poly: p.poly, stackOn: base.id, von: H0 + 1, bis: p.maxL, typ: tech ? 'technik' : typ, hoehe: tech ? 3.0 : undefined, accent: farbe[anz] });
        });
      } else B.part(b, { id: `kob_${id}_0`, name, poly: k.poly || ob.poly, von: ob.minL > 0 ? ob.minL : small ? 0 : basement, bis: maxL, typ, accent: farbe[anz], helipad: id === 'S' });
    }
    for (const [i, r] of (O.roads || []).entries()) { if (r.length < 2) continue; const len = G.polylineLength(r); prj.paths.push(Object.assign(HSS.defaults.path('zufahrt'), { id: `path_kob_r${i}`, standort: true, name: 'Erschließungsstraße', points: r.map(q => [r1(q[0]), r1(q[1])]), width: 6, smooth: false, traffic: len > 120 ? 2 : 0 })); }
    if (O.boundary?.length > 3) prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: 'path_kob_grenze', standort: true, name: 'Grundstücksgrenze BwZK (OpenStreetMap)', points: O.boundary.map(q => [r1(q[0]), r1(q[1])]), width: 0.35, smooth: false, noNet: true }));
    for (const [i, r] of (O.paths || []).entries()) { if (r.length < 2) continue; prj.paths.push(Object.assign(HSS.defaults.path('gehweg'), { id: `path_kob_g${i}`, standort: true, name: 'Fußweg', points: r.map(q => [r1(q[0]), r1(q[1])]), width: 2, smooth: false })); }
  } else {
    const ug = D.gebaeude, pre = PRE[def.id];
    for (const g0 of ug) {
      if (sc.gone.has(g0.id)) continue;
      if (g0.szenario && g0.szenario !== v) continue;
      const g = Object.assign({}, g0, (sc.ch.gebaeudeOverrides || {})[g0.id] || {});
      const typ = g.neubau ? 'neubau' : g.typ;
      const info = [g.baujahr ? 'Baujahr ' + g.baujahr : '', g.sanierung, g.bgf ? 'BGF ' + (typeof g.bgf === 'number' ? U.fmt(g.bgf) + ' m²' : g.bgf) : '', g.ngf ? 'NGF ' + U.fmt(g.ngf) + ' m²' : '', g.din ? 'DIN 13080: ' + g.din : '', g.hinweis].filter(Boolean).join(' · ');
      const b = B.building({ id: pre + g.id, name: g.name, kurz: g.nr || g.id, color: g.neubau ? '#0A967A' : typ === 'hospital' ? '#144477' : '#4b5058', info });
      bmap[g.id] = b;
      g.teile.forEach((t, i) => B.part(b, { id: `${pre}${g.id}_${t.id || i}`, name: t.name ? `${g.kurz || g.id} · ${t.name}` : g.name, ref: `${g.id}/${t.id || g.id + '-' + i}`, poly: t.poly, rect: t.box ? [(t.box[0] + t.box[2]) / 2, (t.box[1] + t.box[3]) / 2, Math.abs(t.box[2] - t.box[0]), Math.abs(t.box[3] - t.box[1]), 0] : null, von: t.von ?? 0, bis: t.bis ?? 0, hoehe: t.hoehe, typ }));
    }
    const SKIND = t => ['service', 'track', 'driveway'].includes(t) ? 'zufahrt' : ['footway', 'path', 'pedestrian', 'cycleway', 'steps'].includes(t) ? 'gehweg' : t ? 'strasse' : 'zufahrt';
    for (const [i, s] of (D.aussen?.strassen || []).entries()) { const kind = SKIND(s.typ); prj.paths.push(Object.assign(HSS.defaults.path(kind), { id: `path_${pre}r${i}`, standort: true, name: s.name || HSS.WEGARTEN[kind].name, points: s.pts.map(q => q.slice()), width: s.b || 7, smooth: false, traffic: kind === 'strasse' && G.polylineLength(s.pts) > 60 ? (s.typ === 'tertiary' ? 3 : 2) : 0 })); }
    // Umgebung (Nachbargebäude aus OpenStreetMap)
    for (const [i, u] of (D.umgebung || []).entries()) {
      if (!u.poly || u.poly.length < 3 || Math.abs(G.area(u.poly)) < 12) continue;
      const b = Object.assign(HSS.defaults.building(), { id: `${pre}u${i}`, name: u.name || 'Gebäude (Umgebung)', kurz: '', color: '#8d969f', noLabel: true, umgebung: true });
      const c = centroid(u.poly), loc = G.ccw(u.poly.map(q => [r1(q[0] - c[0]), r1(q[1] - c[1])])), bb = G.bbox(loc), fl = U.clamp(Math.round((u.h || 9) / 3.1), 1, 30);
      b.parts.push(Object.assign(HSS.defaults.part(), { id: `${pre}u${i}_0`, name: b.name, shape: 'poly', poly: loc, x: r1(c[0]), z: r1(c[1]), w: r1(bb.w), d: r1(bb.d), rot: 0, floors: fl, floorHeight: r1((u.h || fl * 3.1) / fl), basements: 0, facade: { type: 'loch', color: '#e6e2dc', accent: '#9aa1aa', glass: '#8aa0b2', axis: 1.6, windowRatio: 0.35 }, roof: { type: 'flach', parapet: 0.3, plant: false, color: '#a8a39b' } }));
      prj.buildings.push(b);
    }
    // Klinikgelände (Grundstücksgrenze)
    if (D.aussen?.gelaende?.length > 3) prj.paths.push(Object.assign(HSS.defaults.path('grenze'), { id: `path_${pre}grenze`, standort: true, name: 'Grundstücksgrenze Klinikum', points: D.aussen.gelaende.concat([D.aussen.gelaende[0]]).map(q => [r1(q[0]), r1(q[1])]), width: 0.35, smooth: false, noNet: true }));
    for (const [i, w] of (D.aussen?.wege || []).entries()) prj.paths.push(Object.assign(HSS.defaults.path('weg'), { id: `path_${pre}w${i}`, standort: true, name: 'Campusweg', points: w.map(q => q.slice()), width: 3.5, smooth: false }));
  }
  if (D.aussen?.teich) { const t = G.bbox(D.aussen.teich); prj.areas.push(Object.assign({ id: 'area_teich', kind: 'wasser', name: 'Teich', x: r1(t.cx), z: r1(t.cz), w: r1(t.w), d: r1(t.d), rot: 0 }, D.aussen.teich.length > 4 ? { poly: G.ccw(D.aussen.teich.map(q => [r1(q[0]), r1(q[1])])), lage: 5 } : {})); }
  if (def.geo && !prj.meta.geo) prj.meta.geo = Object.assign({}, def.geo);
  /* Gehwege, die auf einer Fahrbahn liegen (OSM-Bürgersteige entlang der Straße), weglassen */
  const roadsL = prj.paths.filter(p => p.kind === 'zufahrt' || p.kind === 'strasse');
  const onRoad = q => roadsL.some(r => { for (let i = 0; i < r.points.length - 1; i++) { const c = G.closestOnSeg(q, r.points[i], r.points[i + 1]); if (G.dist(q, c.pt) < r.width / 2 + 1.6) return true; } return false; });
  if (!opts.allePfade) prj.paths = prj.paths.filter(p => {
    if (p.kind !== 'gehweg' && p.kind !== 'weg') return true;
    const L = G.polylineLength(p.points), n = Math.max(2, Math.round(L / 2)); let hit = 0;
    for (let i = 0; i <= n; i++) if (onRoad(G.pointAt(p.points, L * i / n).p)) hit++;
    return hit / (n + 1) < 0.5;
  });
  /* Gelände */
  const all = []; for (const x of B.parts) { const fp = HSS.partFootprint(x.pt).outer; all.push(...fp); } for (const p of prj.paths) all.push(...p.points);
  const bb = G.bbox(all); prj.terrain.size = Math.ceil(Math.max(Math.abs(bb.x0), Math.abs(bb.x1), Math.abs(bb.z0), Math.abs(bb.z1)) * 2 / 50) * 50 + 120;
  /* Bereiche → Räume mit Rolle, Pflegebereiche → Stationen */
  const areaPlaces = {};
  const partByRef = ref => B.parts.find(x => x.src.ref === ref);
  for (const a of sc.areas) {
    const use = USE(a), role = ROLLE[a.id];
    let st = null;
    if (a.kat === 'Pflege') {
      const m = String(a.volumen || '').match(/(\d+)\s*(Betten|Plätze)/);
      st = { id: `st_${def.id}_${a.id}`, name: a.name, typ: a.id === 'intensiv' ? 'intensiv' : 'innere', art: 'stationaer', betten: m ? +m[1] : Math.round((a.flaeche || 800) / 45), plaetze: 0, vwd: a.id === 'intensiv' ? 4 : 5.3, auslastung: 0.85, sel: [], quelle: 'Standortmodell' };
      prj.stations.push(st);
    }
    areaPlaces[a.id] = [];
    a.parts.forEach((p, i) => {
      const l = p.l ?? 0, bid = p.bld || (p.b && p.b !== 'X' ? p.b : null) || (a.building !== 'X' ? a.building : null);
      let worldPoly = null, hosts = [];
      if (p.ref) { const x = partByRef(p.ref); if (x) hosts = [{ x, full: true }]; }
      else if (p.b && p.b !== 'X') { const b = bmap[p.b]; hosts = B.parts.filter(x => x.b === b && l >= x.von && l <= x.bis).sort((a, c) => HSS.partArea(c.pt) - HSS.partArea(a.pt)).slice(0, 1).map(x => ({ x, full: true })); }
      else { worldPoly = p.rect ? rectPoly(p.rect) : p.box ? boxPoly(p.box) : p.poly || null; }
      if (worldPoly) {
        const c = centroid(worldPoly), x = B.find(bid ? PRE[def.id] + bid : null, c, l) || B.find(null, c, l);
        if (!x || a.building === 'X') { // Außenbereich
          const pl = { id: `pl_${def.id}_${a.id}_${i}`, standort: true, name: a.name, role: role || 'extern', x: r1(c[0]), z: r1(c[1]) }; prj.places.push(pl); areaPlaces[a.id].push(pl.id); return;
        }
        hosts = [{ x, poly: worldPoly }];
      }
      if (!hosts.length) return;
      for (const h of hosts) {
        const f = B.localFloor(h.x, l); if (!HSS.partFloors(h.x.pt).includes(f)) continue;
        const I = HSS.interior(h.x.pt.id, f, true, prj);
        const loc = h.full ? HSS.partFootprintLocal(h.x.pt).outer.map(q => q.slice()) : h.poly.map(q => HSS.toLocal(h.x.pt, q).map(r1));
        const lb = G.bbox(loc), cc = centroid(loc);
        const r = { id: `r_${a.id}_${i}_${h.x.pt.id}_${f}`, standort: true, use, name: a.name + (a.parts.length > 1 ? ` (${i + 1})` : ''), poly: loc, x: r1(cc[0]), z: r1(cc[1]), w: r1(lb.w), d: r1(lb.d) };
        if (h.full) r.noWalls = true;
        if (role) r.role = role;
        if (st) { r.station = st.id; r.role = 'stuetzpunkt'; const s0 = st.sel.find(s => s.part === h.x.pt.id); if (s0) s0.floors.push(f); else st.sel.push({ part: h.x.pt.id, floors: [f] }); }
        r.hinweis = [a.hinweis, a.flaeche ? `Fläche laut Modell ${U.fmt(a.flaeche)} m²` : '', a.fenster ? 'Zeitfenster ' + a.fenster : '', a.volumen, ...(a.engpaesse || []).map(e => 'Engpass: ' + e)].filter(Boolean).join(' · ');
        I.rooms.push(r); areaPlaces[a.id].push(r.id);
      }
    });
  }
  for (const pid of Object.keys(prj.interiors)) for (const f of Object.keys(prj.interiors[pid])) { const I = prj.interiors[pid][f]; I.walls = HSS.wallsFromRooms(I.rooms); }
  /* Aufzüge und Treppen */
  const vert = (o, lib, role) => {
    const p = [o.x, o.z], x = B.find(bmap[o.building] ? bmap[o.building].id : null, p, Math.max(0, o.levels?.[0] ?? 0)) || B.find(null, p);
    if (!x) return;
    const loc = HSS.toLocal(x.pt, p), f = Math.max(HSS.partFloors(x.pt)[0], B.localFloor(x, o.levels?.[0] ?? 0));
    const ob = { id: `obj_${def.id}_${o.id}`, standort: true, lib, host: { part: x.pt.id, floor: Math.min(f, x.pt.floors - 1) }, x: r1(loc[0]), z: r1(loc[1]), rot: (360 - (x.pt.rot || 0)) % 360, name: o.name };
    if (o.levels) { ob.vonGF = o.levels[0]; ob.bisGF = o.levels[1]; }
    if (role === 'aufzug') { const fg = [...new Set((o.allow || ['*']).map(s => s === '*' ? '*' : s.includes(':') ? s.split(':')[1] : ['rein', 'unrein', 'patient'].includes(s) ? s : 'rein'))]; if (fg.includes('rein')) fg.push('neutral', 'person'); ob.aufzug = { kabinen: o.kabinen || 1, freigabe: fg }; }
    prj.objects.push(ob);
  };
  for (const l of sc.lifts) vert(l, /versorg|lasten|steril|küche|kueche/i.test(l.name) ? 'erschl.aufzug.lasten' : /personen/i.test(l.name) ? 'erschl.aufzug.person' : 'erschl.aufzug.bett', 'aufzug');
  for (const t of D.treppen || []) if (!sc.gone.has(t.building)) vert(t, 'erschl.treppe', 'treppe');
  /* Verbindungsgänge zwischen Gebäuden (aus dem Wegenetz des Modells) */
  const nodes = {}; for (const [id, b, l, x, z] of (D.nodes || []).concat(sc.ch.nodesAdd || [])) nodes[id] = { b, l, x, z };
  const conns = new Map();
  for (const [na, nb, typ, o] of (D.edges || []).concat(sc.ch.edgesAdd || [])) {
    if (!['flur', 'tunnel'].includes(typ)) continue; const A = nodes[na], Bn = nodes[nb]; if (!A || !Bn || A.b === Bn.b) continue;
    if (sc.gone.has(A.b) || sc.gone.has(Bn.b) || !bmap[A.b] || !bmap[Bn.b]) continue;
    const pa = B.find(bmap[A.b].id, [A.x, A.z], A.l), pb = B.find(bmap[Bn.b].id, [Bn.x, Bn.z], Bn.l); if (!pa || !pb || pa === pb) continue;
    const fa = B.localFloor(pa, A.l), fb = B.localFloor(pb, Bn.l); if (!HSS.partFloors(pa.pt).includes(fa) || !HSS.partFloors(pb.pt).includes(fb)) continue;
    const key = [pa.pt.id, pb.pt.id, fa, fb].join('|'); if (conns.has(key)) continue;
    conns.set(key, { pa, pb, fa, fb, typ, name: o?.name || `Verbindung ${A.b} – ${Bn.b}` });
  }
  for (const c of conns.values()) {
    const br = { id: `br_${c.pa.pt.id}_${c.fa}_${c.pb.pt.id}_${c.fb}`, standort: true, name: c.name + (c.typ === 'tunnel' ? ' (Versorgungsgang)' : ''), type: 'gebaeude', a: { part: c.pa.pt.id, floor: c.fa }, b: { part: c.pb.pt.id, floor: c.fb }, width: c.typ === 'tunnel' ? 3.5 : 3, height: 3.2, levels: 1, offset: 0, color: '#eef0ee' };
    const e = HSS.bridgeEnds(br, prj); if (!e || e.len < 1.5 || e.len > 120) continue; // aneinandergrenzende Bauteile sind ohnehin verbunden
    prj.bridges.push(br);
  }
  /* Mehrgeschossige Bauteile ohne Aufzug/Treppe im Modell: Erschließung ergänzen (Annahme) */
  const vrole = o => HSS.library.get(o.lib)?.logistik?.rolle;
  for (const x of B.parts) {
    if (x.bis - x.von < 1 || ['technik'].includes(x.src.typ)) continue;
    const fp = HSS.partFootprintLocal(x.pt).outer;
    const has = prj.objects.some(o => ['aufzug', 'treppe'].includes(vrole(o)) && (o.host?.part === x.pt.id || (o.host && G.pointIn(HSS.toLocal(x.pt, HSS.toWorld(HSS.findPart(o.host.part, prj).part, [o.x, o.z])), fp))));
    if (has) continue;
    const bb = G.bbox(fp); let pnt = null;
    const c = centroid(fp); const tryP = q => [[0, 0], [1.6, 0], [-1.6, 0], [0, 3.2], [0, -3.2], [1.6, 3.2], [-1.6, -3.2]].every(([dx, dz]) => G.pointIn([q[0] + dx, q[1] + dz], fp));
    if (tryP(c)) pnt = c; else for (let i = 1; i < 8 && !pnt; i++) for (let j = 1; j < 8 && !pnt; j++) { const q = [bb.x0 + bb.w * i / 8, bb.z0 + bb.d * j / 8]; if (tryP(q)) pnt = q; }
    if (!pnt) continue;
    const f0 = HSS.partFloors(x.pt)[0];
    prj.objects.push({ id: `obj_auto_l_${x.pt.id}`, standort: true, lib: x.src.typ === 'parking' ? 'erschl.aufzug.person' : 'erschl.aufzug.bett', host: { part: x.pt.id, floor: f0 }, x: r1(pnt[0] - 1.3), z: r1(pnt[1]), rot: 0, name: 'Aufzug (angenommen)' });
    prj.objects.push({ id: `obj_auto_t_${x.pt.id}`, standort: true, lib: 'erschl.treppe', host: { part: x.pt.id, floor: f0 }, x: r1(pnt[0] + 1.6), z: r1(pnt[1]), rot: 0, name: 'Treppenhaus (angenommen)' });
  }
  /* Externe Orte (Lieferanten, Entsorger) an der Zufahrt */
  const roads = prj.paths.filter(p => p.kind === 'zufahrt');
  const far = roads.flatMap(p => [p.points[0], p.points[p.points.length - 1]]).sort((a, b) => Math.hypot(b[0], b[1]) - Math.hypot(a[0], a[1]));
  if (far.length) {
    prj.places.push({ id: 'ext_lief', standort: true, name: 'Großhandel / Lieferanten', role: 'extern', x: r1(far[0][0]), z: r1(far[0][1]), anfahrtM: 15000 });
    prj.places.push({ id: 'ext_ents', standort: true, name: 'Entsorgungsfachbetrieb / Fremdwäscherei', role: 'extern', x: r1(far[1][0]), z: r1(far[1][1]), anfahrtM: 9000 });
  }
  /* Flüsse des Modells */
  HSS.ensureStammdaten(prj);
  const groups = sc.areaGroups;
  const expand = id => { if (groups[id]) { const m = groups[id].members; const t = U.sum(Object.values(m)) || 1; return Object.entries(m).flatMap(([aid, w]) => (areaPlaces[aid] || []).map(pl => [pl, w / t / Math.max(1, (areaPlaces[aid] || []).length)])); } const ps = areaPlaces[id] || []; return ps.map(pl => [pl, 1 / Math.max(1, ps.length)]); };
  const mats = Object.fromEntries(prj.materials.map(m => [m.id, m]));
  let skipped = 0;
  for (const fl of D.flows || []) for (const leg of fl.legs) {
    const A = expand(leg.from), Bp = expand(leg.to);
    if (!A.length || !Bp.length) { skipped++; continue; }
    const [mat, tr] = MAT(fl, leg), M = mats[mat] || { proLadung: 1 };
    const prof = sc.profiles[leg.p || fl.p];
    const factor = sc.legRules.filter(r => Object.entries(r.match || {}).every(([k, v]) => leg[k] === v || fl[k] === v)).reduce((a, r) => a * (r.factor ?? 1), 1);
    // Mehrteilige Bereiche: jeder Teil der Quelle beliefert jeden Teil des Ziels anteilig
    for (const [pa, wa] of A) for (const [pb, wb] of Bp) {
      if (pa === pb) continue;
      const fahrten = leg.n * factor * wa * wb;
      if (fahrten < 0.05) continue;
      prj.flows.push({ id: `fl_${fl.id}_${fl.legs.indexOf(leg)}_${pa}_${pb}`, name: `${fl.name}: ${leg.txt || ''}`.trim(), template: null, material: mat, von: pa, nach: pb, menge: Math.round(fahrten * M.proLadung * 10) / 10, periode: 'tag', betriebstage: 7, fenster: windows(prof), transport: tr, fahrzeitMin: null, rueck: false, aktiv: true, quelle: 'Standortmodell' });
    }
  }
  prj.meta.notes += skipped ? `\n${skipped} Relationen des Modells ohne Ort in dieser Variante.` : '';
  /* Warenströme (Familien) mit Farbe und Prozess-Tour (Stationen mit Erläuterung) */
  if ((D.flows || []).some(fl => fl.color || fl.tour)) {
    const PL = new Map(HSS.places(prj).map(p => [p.id, p])), areaName = id => (D.areas || []).find(a => a.id === id)?.name;
    const tourPlace = t => {
      const ids = (areaPlaces[t.area] || []).filter(id => PL.has(id)); if (!ids.length) return null;
      const n = t.node && nodes[t.node];
      if (n) { const hit = ids.find(id => PL.get(id).gf === n.l && (!n.b || PL.get(id).building === PRE[def.id] + n.b)) || ids.find(id => PL.get(id).gf === n.l); if (hit) return hit; }
      return ids[0];
    };
    prj.stroeme = D.flows.map(fl => ({ id: fl.id, name: fl.name, farbe: fl.color || null, reinheit: fl.cls || null,
      tour: (fl.tour || []).map(t => ({ place: tourPlace(t), titel: areaName(t.area) || t.title || '', text: (v === 'soll' && t.textSoll) || t.text || '' })).filter(t => t.place) }));
    for (const f of prj.flows) { const m = /^fl_(.+?)_\d+_/.exec(f.id); if (m && prj.stroeme.some(x => x.id === m[1])) f.strom = m[1]; }
  }
  if (HSS.furnishEmpty) HSS.furnishEmpty(prj, { maxArea: 1500, max: 9000 }); // Funktionsflächen einrichten
  // Gelände groß genug für alle Gebäude, Wege und die Grundstücksgrenze
  { let r = 0; for (const pt of HSS.allParts(prj)) for (const q of HSS.partFootprint(pt, prj).outer) r = Math.max(r, Math.abs(q[0]), Math.abs(q[1])); for (const pa of prj.paths) for (const q of pa.points) r = Math.max(r, Math.abs(q[0]), Math.abs(q[1])); prj.terrain.size = Math.max(prj.terrain.size || 500, Math.ceil((r * 2 + 200) / 100) * 100); }
  return prj;
}

HSS.standorte = {
  async load(id, v = 'ist', opts = {}) {
    const def = HSS.STANDORTE.find(s => s.id === id); if (!def) throw new Error('Unbekannter Standort');
    if (!window.HSS_STANDORTE?.[id]) await loadScript(def.datei + '?v=20261016');
    return convert(window.HSS_STANDORTE[id], def, v, opts);
  },
  /* Gespeichertes Standortmodell auf den aktuellen Stand der Übernahme bringen.
     Eigene Änderungen bleiben erhalten: gelöschte Gebäude und Wege bleiben gelöscht, eigene Gebäude, Wege,
     Flächen, Räume, Objekte, Stationen, Flüsse, Material und Fuhrpark bleiben; Standort-Gebäude erhalten die
     neue Geometrie (Sockel mit aufgesetzten Türmen und Technikaufbauten), Gehwege auf Fahrbahnen entfallen. */
  async aktualisieren(old) {
    const so = old.meta.standort; if (!so) throw new Error('Kein Standortmodell');
    const fresh = await HSS.standorte.load(so.id, so.variante || 'ist'), alle = await HSS.standorte.load(so.id, so.variante || 'ist', { allePfade: true });
    const pre = PRE[so.id], isSt = id => typeof id === 'string' && id.startsWith(pre);
    const out = U.clone(old);
    // Gebäude
    const oldB = new Map(old.buildings.map(b => [b.id, b]));
    out.buildings = fresh.buildings.filter(b => oldB.has(b.id)).map(b => { const o = oldB.get(b.id); return Object.assign(b, { name: o.name, kurz: o.kurz, color: o.color }); })
      .concat(old.buildings.filter(b => !isSt(b.id)));
    const parts = new Set(out.buildings.flatMap(b => b.parts.map(p => p.id)));
    // Innenausbau: Standortbereiche neu, eigene Räume (z. B. geplante Stationen) bleiben
    out.interiors = {};
    for (const [pid, F] of Object.entries(fresh.interiors)) if (parts.has(pid)) out.interiors[pid] = U.clone(F);
    for (const [pid, F] of Object.entries(old.interiors || {})) {
      if (!parts.has(pid)) continue;
      for (const [f, I] of Object.entries(F)) {
        const eigene = (I.rooms || []).filter(r => !r.standort && !r.hinweis);
        if (!eigene.length && !isSt(pid)) { (out.interiors[pid] = out.interiors[pid] || {})[f] = U.clone(I); continue; }
        if (!eigene.length) continue;
        const T = ((out.interiors[pid] = out.interiors[pid] || {})[f] = out.interiors[pid][f] || { walls: [], doors: [], rooms: [] });
        const ids = new Set(eigene.map(r => r.id));
        T.rooms = T.rooms.filter(r => !eigene.some(e => Math.abs(e.x - r.x) < 0.5 && Math.abs(e.z - r.z) < 0.5)).concat(U.clone(eigene));
        T.walls = T.walls.concat((I.walls || []).filter(w => ids.has(w.room) || (w.auto && eigene.length)));
        T.doors = T.doors.concat((I.doors || []).filter(d => T.walls.some(w => w.id === d.wall)));
        HSS.rebuildWalls(T);
      }
    }
    // Objekte: Standort-Erschließung neu, eigene Objekte bleiben
    const stObj = o => o.standort || (o.host && isSt(o.host.part) && /^erschl\./.test(o.lib) && !o.station);
    out.objects = fresh.objects.filter(o => !o.host || parts.has(o.host.part)).concat(old.objects.filter(o => !stObj(o) && (!o.host || parts.has(o.host.part))));
    // Wege: nur noch vorhandene Standortwege, ohne Gehwege auf Fahrbahnen; eigene Wege bleiben
    const sig = p => p.points.length ? [p.points[0], p.points[p.points.length - 1]].map(q => q.map(v => Math.round(v * 2) / 2).join(',')).join('|') : '';
    const oldSig = new Set(old.paths.map(sig)), alleSig = new Set(alle.paths.map(sig));
    out.paths = fresh.paths.filter(p => oldSig.has(sig(p))).concat(old.paths.filter(p => !p.standort && !alleSig.has(sig(p))));
    // Brücken, Orte, Stationen
    out.bridges = fresh.bridges.filter(b => parts.has(b.a.part) && parts.has(b.b.part)).concat(old.bridges.filter(b => !(isSt(b.a.part) && isSt(b.b.part)) && parts.has(b.a.part) && parts.has(b.b.part)));
    const freshPlaceNames = new Set(fresh.places.map(p => p.name));
    out.places = fresh.places.concat(old.places.filter(p => !p.standort && !/^ext_/.test(p.id) && !freshPlaceNames.has(p.name)));
    out.stations = fresh.stations.concat(old.stations.filter(st => st.quelle !== 'Standortmodell'));
    // Flüsse: Standortflüsse neu, eigene Flüsse bleiben (Orte werden über ihren Namen neu zugeordnet)
    const tmp = HSS.state.project;
    HSS.state.project = old; const oldPl = new Map(HSS.places(old).map(p => [p.id, p.name]));
    HSS.state.project = out; const newPl = HSS.places(out), byName = new Map(newPl.map(p => [p.name, p.id])), newIds = new Set(newPl.map(p => p.id));
    HSS.state.project = tmp;
    const remap = id => newIds.has(id) ? id : byName.get(oldPl.get(id)) || null;
    const eigeneFl = old.flows.filter(f => f.quelle !== 'Standortmodell').map(f => Object.assign(U.clone(f), { von: remap(f.von), nach: remap(f.nach) })).filter(f => f.von && f.nach);
    out.flows = fresh.flows.filter(f => newIds.has(f.von) && newIds.has(f.nach)).concat(eigeneFl);
    out.meta.standort = Object.assign({}, so, { rev: 2 });
    out.meta.modified = new Date().toISOString();
    return out;
  },
  /* Flüsse, deren Transportmittel keinen Weg findet (z. B. Routenzug nur über Fußwege erreichbar), auf Handwagen umstellen */
  wegepruefung(P) {
    let umgestellt = 0, offen = 0; HSS.invalidateNet?.();
    for (const f of P.flows) {
      const T = P.transports.find(t => t.id === f.transport), M = P.materials.find(m => m.id === f.material);
      if (!T || !M) continue;
      const ok = r => r && r.ok !== false && !r.fail;
      if (ok(HSS.route(f.von, f.nach, T.mittel, M.reinheit))) continue;
      if (T.mittel !== 'hand' && ok(HSS.route(f.von, f.nach, 'hand', M.reinheit))) { f.transport = 't_hand'; f.hinweis = `Standortmodell: ${T.name} findet keinen Weg, daher Handwagen`; umgestellt++; } else offen++;
    }
    if (umgestellt) P.meta.notes += `\n${umgestellt} Flüsse auf Handwagen umgestellt (Ziel nur über Fußwege erreichbar).`;
    HSS.invalidateNet?.();
    return { umgestellt, offen };
  },
  async aktualisierenAktuell() {
    try {
      const neu = await HSS.standorte.aktualisieren(HSS.project());
      HSS.change('Standortmodell aktualisieren', p => { for (const k of Object.keys(p)) delete p[k]; Object.assign(p, neu); });
      let w; HSS.change('Wege prüfen', p => { w = HSS.standorte.wegepruefung(p); }, { noUndo: true });
      HSS.ui?.toast(`Standortmodell aktualisiert – eigene Änderungen übernommen${w.offen ? ` · ${w.offen} Flüsse ohne Weg (z. B. wegen gelöschter Gebäude/Wege) – im Arbeitsbereich Simulation/Analyse aufgeführt` : ''}`, 5000);
    } catch (e) { console.error(e); HSS.ui?.dialog(`<h2>Aktualisieren</h2><div class="errbox">${U.esc(e.message)}</div><div class="actions"><button data-close>OK</button></div>`); }
  },
  async open(id, v) {
    HSS.ui?.toast('Standortmodell wird aufgebaut …', 1500);
    try {
      const prj = await HSS.standorte.load(id, v);
      HSS.load(prj);
      HSS.standorte.wegepruefung(HSS.project());
      HSS.invalidateNet?.();
      HSS.ui?.toast(`${prj.buildings.length} Gebäude, ${prj.flows.length} Flüsse übernommen – alles ist bearbeitbar`, 4000);
    } catch (e) { console.error(e); HSS.ui?.dialog(`<h2>Standortmodell</h2><div class="errbox">${U.esc(e.message)}</div><div class="actions"><button data-close>OK</button></div>`); }
  },
  dialog() {
    const UI = HSS.ui;
    UI.dialog(`<div class="dh"><h2>Standortmodelle</h2><button class="x" data-close>×</button></div>
      <p class="note">Reale Kliniken als vollständige, bearbeitbare Projekte: Gebäude mit Geschossen, Wege, Aufzüge, Funktionsbereiche, Stationen und Transportflüsse. Danach wie jedes Projekt ändern, Stationen planen, simulieren und speichern. Mit „Standort verorten“ (Arbeitsbereich Gelände) lässt sich das Modell verschieben, drehen und geografisch verorten.</p>
      ${HSS.STANDORTE.map(s => `<div class="sobox"><b>${U.esc(s.name)}</b><div class="note">${U.esc(s.ort)} · ${U.esc(s.text)}</div><div class="row" style="gap:6px;margin-top:6px">${s.varianten.map(v => `<button class="${v.id === 'ist' ? 'primary' : ''}" data-so="${s.id}|${v.id}">${U.esc(v.name)}</button>`).join('')}</div></div>`).join('')}
      <div class="actions"><button data-close>Schließen</button></div>`);
    document.querySelectorAll('[data-so]').forEach(b => b.onclick = () => { document.getElementById('dlg').close(); const [id, v] = b.dataset.so.split('|'); HSS.standorte.open(id, v); });
  }
};

/* ---------- Verorten: ganzes Modell verschieben/drehen, Geokoordinaten ---------- */
HSS.transformSite = (prj, dx, dz, deg) => {
  const a = U.rad(deg || 0);
  const T = p => { const q = G.rot(p, a); return [r1(q[0] + dx), r1(q[1] + dz)]; };
  for (const b of prj.buildings) for (const pt of b.parts) { if (pt.stackOn) { const q = T([pt.x, pt.z]); pt.x = q[0]; pt.z = q[1]; pt.rot = ((pt.rot || 0) + (deg || 0)) % 360; continue; } const q = T([pt.x, pt.z]); pt.x = q[0]; pt.z = q[1]; pt.rot = ((pt.rot || 0) + (deg || 0)) % 360; }
  for (const p of prj.paths) p.points = p.points.map(T);
  for (const ar of prj.areas) { if (ar.poly) ar.poly = ar.poly.map(T); if (ar.x !== undefined) { const q = T([ar.x, ar.z]); ar.x = q[0]; ar.z = q[1]; ar.rot = ((ar.rot || 0) + (deg || 0)) % 360; } }
  for (const o of prj.objects) if (!o.host) { const q = T([o.x, o.z]); o.x = q[0]; o.z = q[1]; o.rot = ((o.rot || 0) + (deg || 0)) % 360; }
  for (const p of prj.places) if (p.x !== undefined) { const q = T([p.x, p.z]); p.x = q[0]; p.z = q[1]; }
  for (const h of prj.terrain.hills || []) { const q = T([h.x, h.z]); h.x = q[0]; h.z = q[1]; }
  for (const br of prj.bridges || []) for (const k of ['a', 'b']) if (br[k]?.x !== undefined) { const q = T([br[k].x, br[k].z]); br[k].x = q[0]; br[k].z = q[1]; }
};
HSS.standortDialog = () => {
  const UI = HSS.ui, prj = HSS.project(), g = prj.meta.geo || {};
  UI.dialog(`<div class="dh"><h2>Standort verorten</h2><button class="x" data-close>×</button></div>
    <p class="note">Geokoordinaten des Modellursprungs (0/0) und Nordrichtung. „Modell verschieben/drehen“ bewegt Gebäude, Wege, Flächen, Außenobjekte und Orte gemeinsam (Innenausbau und Ausstattung wandern mit den Gebäuden).</p>
    <div class="fg"><label class="f"><span>Breite (lat)</span><input type="number" id="gLat" step="0.00001" value="${g.lat ?? ''}"></label><label class="f"><span>Länge (lon)</span><input type="number" id="gLon" step="0.00001" value="${g.lon ?? ''}"></label>
    <label class="f"><span>Nordwinkel [°] (0 = Norden oben)</span><input type="number" id="gN" step="1" value="${g.nord ?? 0}"></label><label class="f"><span>Adresse / Bezeichnung</span><input type="text" id="gA" value="${U.esc(g.adresse || prj.meta.standort?.id || '')}"></label></div>
    <h3>Modell verschieben / drehen</h3>
    <div class="fg"><label class="f"><span>nach Osten (x) [m]</span><input type="number" id="gDx" value="0" step="1"></label><label class="f"><span>nach Süden (z) [m]</span><input type="number" id="gDz" value="0" step="1"></label><label class="f"><span>Drehen [°]</span><input type="number" id="gR" value="0" step="1"></label></div>
    ${g.lat ? `<p class="note"><a href="https://www.openstreetmap.org/?mlat=${g.lat}&mlon=${g.lon}#map=17/${g.lat}/${g.lon}" target="_blank" rel="noopener">Lage in OpenStreetMap ansehen</a></p>` : ''}
    <div class="actions"><button data-close>Abbrechen</button><button class="primary" id="gOk">Übernehmen</button></div>`);
  document.getElementById('gOk').onclick = () => {
    const v = id => document.getElementById(id).value, dx = +v('gDx') || 0, dz = +v('gDz') || 0, r = +v('gR') || 0;
    HSS.change('Standort verorten', p => {
      p.meta.geo = Object.assign(p.meta.geo || {}, { lat: v('gLat') === '' ? null : +v('gLat'), lon: v('gLon') === '' ? null : +v('gLon'), nord: +v('gN') || 0, adresse: v('gA') });
      if (dx || dz || r) HSS.transformSite(p, dx, dz, r);
    });
    document.getElementById('dlg').close(); UI.toast('Standort übernommen');
  };
};
})();
