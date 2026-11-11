/* Baut projekte/RollsRoyce_Werk1/Werk1_Friedrichshafen.hss.json
   Aufruf: node tools/werk1_bauen.js <osm-daten.json>   (OSM-API-Daten im Overpass-Format mit Geometrie)
   1. OSM-Import (Werksgelände Relation 13871377, Gebäude, Straßen, Bahn, Umgebung 550 m)
   2. tools/werk1_aufbau.js: Belegung, Produktionsplaner, Außenanlagen, Flüsse */
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const data = JSON.parse(fs.readFileSync(process.argv[2]));
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
  p.on('pageerror', e => console.error('Seitenfehler:', e.message));
  await p.goto('file://' + path.join(ROOT, 'Fabric_Planning_Suite.html')); await p.waitForTimeout(3000);
  await p.evaluate(async (data) => {
    document.getElementById('dlg').close?.();
    HSS.load(HSS.newProject('Werk 1 Friedrichshafen')); await new Promise(r => setTimeout(r, 300));
    const geo = { lat: 47.6583, lon: 9.4702, nord: 0 }, opt = { radius: 550, mitZiel: true, einrichten: false, wege: true, flaechen: true, gebaeude: true, baeume: true, grenze: true, verkehr: true, campus: false };
    const prep = await HSS.osm.uebernehmen(data, geo, opt, { osm: { type: 'relation', id: 13871377 }, name: 'Rolls-Royce Solutions – Werk 1' });
    HSS.osm.ausfuehren(data, prep, opt);
  }, data);
  const res = await p.evaluate(src => { let r; HSS.change('Werk 1 aufbauen', () => { r = eval(src); }); return r; }, fs.readFileSync(path.join(__dirname, 'werk1_aufbau.js'), 'utf8'));
  const out = await res;
  const prj = await p.evaluate(() => JSON.stringify(HSS.project()));
  const dir = path.join(ROOT, 'projekte', 'RollsRoyce_Werk1'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'Werk1_Friedrichshafen.hss.json'), prj);
  console.log(JSON.stringify(out, null, 1)); await b.close();
})();
