/* Klinikum Hanau BT1-Varianten, Stufe 2: Geschosse von BT1 als Flächenplanung belegen.
   Übernimmt Räume aus W, A, M, M17 (und bei V2 die Neurologie aus N) mit gleicher Kennung
   (Flüsse bleiben gültig) und ergänzt die Bereiche der Folie (Anästhesie, Notfalllabor,
   Strahlentherapie, MED1 Kardiologie, Neurologie N34/N35).
   node tools/bt1_flaechen.js <Stufe-1-Ordner> <Zielordner> [URL der Suite]                     */
const { chromium } = require(process.env.PW || '/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const [, , inDir, outDir, url = 'http://127.0.0.1:8765/hss/index.html'] = process.argv;
// Geschoss → [Fachbereich, Bezeichnung, m² oder Anteil (<1) der Restfläche, übernommener Raum]
const KARDIO = Math.round(24 * 24 * 1.86);
const BASIS = {
  '-1': [['strahlen', 'Strahlentherapie (aus A und M)', 0.5], ['technik', 'Technik & Lager', 1]],
  0: [['labor', 'Notfalllabor (aus A)', 480, 'r_labor_0_han_A_0_0'], ['anaesthesie', 'Anästhesie (aus M)', 0.5], ['dienste', 'Allgemeine Dienste (aus W und M)', 1]],
  1: [['kardio', 'MED1 Kardiologie · 24 Betten (aus M17)', KARDIO, 'r_st_m_4_han_M17_0_1'], ['funktion', 'Funktionsdiagnostik Kardiologie', 1]],
  2: [['pflege', 'Pflege & Allgemeine Dienste (aus W, 1. OG)', 0.5, 'r_st_m_2_han_W_0_1'], ['pflege', 'Pflege & Allgemeine Dienste (aus W, 2. OG)', 1, 'r_st_m_3_han_W_0_2']]
};
const P = {
  V1: Object.assign({}, BASIS, {
    3: [['pflege', 'Pflege & Krankenhausmanagement (aus M, EG)', 0.5, 'r_st_m_0_han_M_W_0'], ['pflege', 'Pflege & Krankenhausmanagement (aus M, 1. OG)', 1, 'r_st_m_1_han_M_W_1']],
    4: [['apotheke', 'Krankenhausapotheke (aus M)', 540, 'r_apotheke_0_han_M_O_2'], ['verwaltung', 'Krankenhausmanagement (aus W und M)', 1]] }),
  V2: Object.assign({}, BASIS, {
    3: [['pflege', 'Pflege & Krankenhausmanagement (aus M, EG)', 690, 'r_st_m_0_han_M_W_0'], ['pflege', 'Pflege & Krankenhausmanagement (aus M, 1. OG)', 690, 'r_st_m_1_han_M_W_1'], ['apotheke', 'Krankenhausapotheke (aus M)', 1, 'r_apotheke_0_han_M_O_2']],
    4: [['neuro', 'Neurologie N34 (aus Haus N)', 1450, 'r_st_ost_4_han_N_0_1'], ['verwaltung', 'Krankenhausmanagement (aus W und M)', 1]],
    5: [['neuro', 'Neurologie N35 (aus Haus N)', 1450, 'r_st_ost_5_han_N_0_2'], ['dienste', 'Allgemeine Dienste', 1]] })
};
(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const logs = []; page.on('pageerror', e => logs.push('ERR ' + e.message));
  await page.goto(url); await page.waitForTimeout(2500);
  await page.evaluate(() => { document.querySelector('#dlg')?.close?.(); });
  for (const f of fs.readdirSync(inDir).filter(x => x.endsWith('.hss.json')).sort()) {
    const txt = fs.readFileSync(path.join(inDir, f), 'utf8');
    const res = await page.evaluate(([txt, P]) => {
      const prj = JSON.parse(txt); HSS.migrate?.(prj);
      const plan = prj.meta.bt1Plan, rep = { zones: 0, moved: 0, warn: [] };
      if (plan) {
        const pt = prj.buildings.find(b => b.id === 'han_BT1').parts[0], prog = P[plan.variante];
        const moved = new Map(plan.moved.map(m => [m.room.id, m]));
        for (const [fs, items] of Object.entries(prog)) {
          const f = +fs; const frei0 = HSS.zoneFree(pt, f, prj).free.reduce((a, x) => a + x.area, 0);
          items.forEach(([fach, name, menge, rid], i) => {
            const rest = HSS.zoneFree(pt, f, prj).free.reduce((a, x) => a + x.area, 0);
            const soll = menge > 1 ? Math.min(menge, rest) : i === items.length - 1 && menge === 1 ? rest : frei0 * menge;
            if (soll < 20) { rep.warn.push('kein Platz: ' + name); return; }
            const m = rid && moved.get(rid), r0 = m?.room;
            const z = HSS.zoneAuto(prj, pt.id, f, { fach, name, soll: Math.round(soll), station: r0?.station, hinweis: m ? `Übernommen aus ${m.von.replace('han_', 'Haus ').replace(/_\w+$/, '')}, ${HSS.floorName(m.floor)} (Flächenansatz)` : 'Flächenansatz BT1 (Folie Varianten BT1)' }, { spread: false });
            if (!z.zones.length) { rep.warn.push('nicht platziert: ' + name); return; }
            const zr = HSS.interior(pt.id, f, false, prj).rooms.find(x => x.id === z.zones[0].id);
            if (r0) { zr.id = r0.id; if (r0.role) zr.role = r0.role; rep.moved++; moved.delete(rid); }
            rep.zones++;
          });
        }
        for (const [rid] of moved) rep.warn.push('Raum ohne Platz: ' + rid);
        // Stationen auf die neuen Geschosse umstellen
        for (const sid of plan.stationen) {
          const s = prj.stations.find(x => x.id === sid); if (!s) continue;
          const sel = new Map();
          for (const [pid, fl] of Object.entries(prj.interiors)) for (const [f, I] of Object.entries(fl)) if ((I.rooms || []).some(r => r.station === sid)) { if (!sel.has(pid)) sel.set(pid, []); sel.get(pid).push(+f); }
          s.sel = [...sel.entries()].map(([part, floors]) => ({ part, floors: floors.sort((a, b) => a - b) }));
        }
        // Haus N: frei gewordene Geschosse (V2)
        if (plan.variante === 'V2') { const N = prj.buildings.find(b => b.id === 'han_N').parts[0]; for (const f of [1, 2]) HSS.zoneAuto(prj, N.id, f, { fach: 'reserve', name: 'frei – Neurologie nach BT1 verlegt (Nachnutzung offen)', soll: 5000 }, { spread: false }); }
        prj.meta.bt1Plan.zonen = rep.zones;
      }
      return { json: JSON.stringify(prj), rep };
    }, [txt, P]);
    fs.writeFileSync(path.join(outDir, f), res.json);
    console.log(f, JSON.stringify(res.rep));
  }
  if (logs.length) console.log(logs.slice(0, 10).join('\n'));
  await b.close();
})();
