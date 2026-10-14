/* Koblenz K2-Varianten, Stufe 2: Geschosse von K2 als Flächenplanung belegen.
   Lädt jede Variante in die Suite (lokaler Server), übernimmt Räume/Stationen aus den
   zurückgebauten Häusern als Flächen in K2 (gleiche Raum-IDs → Flüsse bleiben gültig)
   und belegt die übrigen Flächen nach dem Variantenprogramm (Annahme).

   node tools/k2_flaechen.js <Ordner mit Stufe-1-Dateien> <Zielordner> [http://127.0.0.1:8765/hss/index.html]
*/
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const [, , inDir, outDir, url = 'http://127.0.0.1:8765/hss/index.html'] = process.argv;

// Programm je Variante: Bauteilname → Geschoss → [Fachbereich, Bezeichnung, Anteil an der freien Fläche]
const P = {
  V1: { K2: {
    '-1': [['logistik', 'Logistik & Lager', 0.55], ['technik', 'Technikzentrale', 0.45]],
    0: [['lehre', 'Ausbildungs- und Simulationszentrum', 0.6], ['ambulanz', 'Ambulanzen', 0.4]],
    1: [['funktion', 'Funktionsdiagnostik', 0.5], ['endoskopie', 'Endoskopie', 0.5]],
    2: [['innere', 'Pflegestation Innere Medizin', 1]],
    3: [['chirurgie', 'Pflegestation Chirurgie', 1]],
    4: [['personal', 'Unterkünfte & Bereitschaft (aus Haus M)', 0.6], ['verwaltung', 'Verwaltung', 0.4]] } },
  V2: { K2: {
    '-1': [['logistik', 'Logistik & Lager', 0.6], ['technik', 'Technikzentrale', 0.4]],
    0: [['eingang', 'Haupteingang & Information (aus Haus C)', 0.35], ['speisesaal', 'Cafeteria (aus Haus C)', 0.25], ['aufnahme', 'Patientenaufnahme (aus Haus C)', 0.25], ['seelsorge', 'Seelsorge (aus Haus C)', 0.15]],
    1: [['ambulanz', 'Untersuchung & Behandlung (aus Haus C)', 0.6], ['funktion', 'Funktionsdiagnostik', 0.4]],
    2: [['tagesklinik', 'Tagesklinik', 0.5], ['endoskopie', 'Endoskopie', 0.5]],
    3: [['innere', 'Pflegestation Innere Medizin', 1]],
    4: [['chirurgie', 'Pflegestation Chirurgie', 1]],
    5: [['unfall', 'Pflegestation Unfallchirurgie / Orthopädie', 1]] } },
  V3: {
    K2: {
      '-1': [['logistik', 'Logistik & Lager', 0.6], ['technik', 'Technikzentrale', 0.4]],
      0: [['ambulanz', 'Untersuchung & Behandlung (aus Haus D)', 0.6], ['verwaltung', 'Chefarztbereich (aus Haus D)', 0.4]],
      1: [['funktion', 'Funktionsdiagnostik', 0.5], ['endoskopie', 'Endoskopie', 0.5]],
      2: [['innere', 'Pflegestation Innere Medizin', 1]], 3: [['chirurgie', 'Pflegestation Chirurgie', 1]], 4: [['unfall', 'Pflegestation Unfallchirurgie', 1]],
      5: [['kardio', 'Pflegestation Kardiologie', 1]], 6: [['neuro', 'Pflegestation Neurologie', 1]] },
    'K2 Flügel': {
      '-1': [['technik', 'Technik', 1]], 0: [['verwaltung', 'Chefarztbereich (aus Haus D)', 1]], 1: [['funktion', 'Funktionsdiagnostik', 1]],
      2: [['innere', 'Pflegestation Innere Medizin', 1]], 3: [['chirurgie', 'Pflegestation Chirurgie', 1]], 4: [['unfall', 'Pflegestation Unfallchirurgie', 1]],
      5: [['kardio', 'Pflegestation Kardiologie', 1]], 6: [['neuro', 'Pflegestation Neurologie', 1]] } },
  V4: {
    K2: {
      '-1': [['logistik', 'Logistik & Lager', 0.6], ['technik', 'Technikzentrale', 0.4]],
      0: [['eingang', 'Haupteingang & Information (aus Haus C)', 0.4], ['aufnahme', 'Patientenaufnahme (aus Haus C)', 0.3], ['speisesaal', 'Cafeteria (aus Haus C)', 0.3]],
      1: [['ambulanz', 'Untersuchung & Behandlung (aus C und D)', 1]],
      2: [['funktion', 'Funktionsdiagnostik', 0.5], ['endoskopie', 'Endoskopie', 0.5]],
      3: [['innere', 'Pflegestation Innere Medizin', 1]], 4: [['chirurgie', 'Pflegestation Chirurgie', 1]] },
    'K2 Flügel': {
      '-1': [['logistik', 'Lager', 1]], 0: [['seelsorge', 'Seelsorge (aus Haus C)', 0.4], ['ambulanz', 'Ambulanzen', 0.6]],
      1: [['verwaltung', 'Chefarztbereich (aus Haus D)', 1]], 2: [['tagesklinik', 'Tagesklinik', 1]],
      3: [['innere', 'Pflegestation Innere Medizin', 1]], 4: [['unfall', 'Pflegestation Unfallchirurgie', 1]] } },
  V5: { K2: {
    '-1': [['pathologie', 'Pathologie (aus Haus B)', 0.3], ['logistik', 'Logistik & Lager', 0.4], ['technik', 'Technikzentrale', 0.3]],
    0: [['eingang', 'Haupteingang & Information (aus Haus C)', 0.3], ['aufnahme', 'Patientenaufnahme (aus Haus C)', 0.25], ['speisesaal', 'Cafeteria', 0.2], ['seelsorge', 'Seelsorge', 0.25]],
    1: [['ambulanz', 'Untersuchung & Behandlung (aus A, C und D)', 0.65], ['funktion', 'Funktionsdiagnostik', 0.35]],
    2: [['ambulanz', 'Ambulanzen (aus Haus A)', 0.5], ['verwaltung', 'Chefarztbereich (aus Haus D)', 0.5]] } }
};
const FACH_USE = { pflege: null, labor: 'labor', logistik: 'logistik' };

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const logs = []; page.on('pageerror', e => logs.push('ERR ' + e.message));
  await page.goto(url); await page.waitForTimeout(2500);
  await page.evaluate(() => { document.querySelector('#dlg')?.close?.(); });
  for (const f of fs.readdirSync(inDir).filter(x => x.endsWith('.hss.json')).sort()) {
    const txt = fs.readFileSync(path.join(inDir, f), 'utf8');
    const res = await page.evaluate(([txt, P, FACH_USE]) => {
      const prj = JSON.parse(txt); HSS.migrate?.(prj);
      const plan = prj.meta.k2Plan; const rep = { zones: 0, moved: 0, warn: [] };
      if (plan) {
        const prog = P[plan.variante] || {};
        const parts = Object.fromEntries(plan.k2.map(id => { const pt = prj.buildings.find(b => b.id === 'kob_K2').parts.find(q => q.id === id); return [pt.name, pt]; }));
        const main = parts.K2;
        const top = main.floors - 1;
        const area = r => r.poly ? Math.abs(HSS.geo.area(r.poly)) : r.w * r.d;
        const vonName = id => ({ kob_B_0: 'Haus B', kob_D_0: 'Haus D', kob_A_0: 'Haus A', kob_CV_0: 'Haus C' })[id] || id;
        // 1) Räume aus zurückgebauten Häusern als Flächen in K2 (gleiche IDs)
        for (const m of plan.moved) {
          const r = m.room, f = Math.max(-1, Math.min(top, m.floor));
          const st = r.station ? prj.stations.find(s => s.id === r.station) : null;
          const fach = st ? (HSS.fachFromStation(st) || 'pflege') : (FACH_USE[r.use] || 'reserve');
          const P0 = prj.buildings.flatMap(b => b.parts).find(q => q.id === m.von);
          const soll = Math.round(Math.min(area(r), (P0 ? 0 : 1e9) || 1e9, 1450));
          const z = HSS.zoneAuto(prj, main.id, f, { fach, name: (r.name || 'Bereich').replace(/Haus [A-Z]+/, 'K2') + ` (aus ${vonName(m.von)})`, soll, station: r.station, hinweis: `Übernommen aus ${vonName(m.von)}, ${HSS.floorName(m.floor)}${r.hinweis ? ' · ' + r.hinweis : ''}` }, { spread: true });
          if (!z.zones.length) { rep.warn.push('kein Platz für ' + r.name); continue; }
          const I = HSS.interior(z.zones[0].part, z.zones[0].floor, false, prj), zr = I.rooms.find(x => x.id === z.zones[0].id);
          zr.id = r.id; if (r.role) zr.role = r.role; zr.auftrag = 'mv_' + r.id; zr.auftragSoll = soll;
          for (const q of z.zones.slice(1)) { const rr = HSS.interior(q.part, q.floor, false, prj).rooms.find(x => x.id === q.id); rr.auftrag = 'mv_' + r.id; rr.auftragSoll = soll; }
          rep.moved++; rep.zones += z.zones.length;
        }
        // Stationen auf die neuen Geschosse umstellen
        for (const sid of plan.stationen) {
          const s = prj.stations.find(x => x.id === sid); if (!s) continue;
          const sel = new Map();
          for (const [pid, fl] of Object.entries(prj.interiors)) for (const [f, I] of Object.entries(fl)) if ((I.rooms || []).some(r => r.station === sid)) { if (!sel.has(pid)) sel.set(pid, []); sel.get(pid).push(+f); }
          s.sel = [...sel.entries()].map(([part, floors]) => ({ part, floors: floors.sort((a, b) => a - b) }));
          s.quelle = (s.quelle || '') + ' · in K2 übernommen (' + plan.variante + ')';
        }
        // 2) Programm: übrige Fläche je Geschoss anteilig belegen
        for (const [pname, floors] of Object.entries(prog)) {
          const pt = parts[pname]; if (!pt) continue;
          for (const [fs, items] of Object.entries(floors)) {
            const f = +fs; if (!HSS.partFloors(pt).includes(f)) continue;
            const frei = HSS.zoneFree(pt, f, prj).free.reduce((a, x) => a + x.area, 0); if (frei < 30) continue;
            items.forEach(([fach, name, share], i) => {
              const last = i === items.length - 1;
              const soll = last ? HSS.zoneFree(pt, f, prj).free.reduce((a, x) => a + x.area, 0) : Math.round(frei * share);
              if (soll < 25) return;
              const z = HSS.zoneAuto(prj, pt.id, f, { fach, name, soll: Math.round(soll), hinweis: 'Flächenansatz K2 (Annahme)' }, { spread: false });
              rep.zones += z.zones.length;
            });
          }
        }
        prj.meta.k2Plan.zonen = rep.zones;
      }
      return { json: JSON.stringify(prj), rep };
    }, [txt, P, FACH_USE]);
    fs.writeFileSync(path.join(outDir, f), res.json);
    console.log(f, JSON.stringify(res.rep));
  }
  if (logs.length) console.log(logs.slice(0, 10).join('\n'));
  await b.close();
})();
