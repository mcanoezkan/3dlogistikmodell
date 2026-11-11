// Demo-Video Fabric Planning Suite · Werk 1 Friedrichshafen (60 s, Stil Realistisch)
// Aufnahme: node marketing/video_werk1/rec.js <outDir> <from> <to> [every]
// rendert deterministisch Bild für Bild (30 fps, 1800 Bilder = 60 s); gespeichert werden nur Bilder in [from, to)
const { chromium } = require('playwright'); const H = require('./harness.js'); const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] || 'frames', FROM = +(process.argv[3] || 0), TO = +(process.argv[4] || 1800), EVERY = +(process.argv[5] || 1);
const FPS = 30, DT = 1000 / FPS, TOTAL = 1800, W = +(process.env.W || 1920), Hh = +(process.env.H || 1080);
fs.mkdirSync(OUT, { recursive: true });
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: Hh } });
  await p.addInitScript(H.init);
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (/Err/.test(m.text())) console.log('C:', m.text()); });
  await p.goto('file://' + path.join(ROOT, 'Fabric_Planning_Suite.html'));
  const cdp = await p.context().newCDPSession(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  for (let i = 0; i < 400; i++) { await ev(d => { window.__noDraw = true; __step(d); }, DT); if (await ev(() => window.HSS && HSS.booted)) break; }
  // Projekt laden, Startdialog schließen, Darstellung einstellen
  await ev(txt => { document.getElementById('dlg')?.close?.(); HSS.load(JSON.parse(txt)); }, fs.readFileSync(path.join(ROOT, 'projekte', 'RollsRoyce_Werk1', 'Werk1_Friedrichshafen.hss.json'), 'utf8'));
  for (let i = 0; i < 60; i++) await ev(d => { window.__noDraw = true; __step(d); }, DT);
  await ev(() => {
    document.getElementById('dlg')?.close?.(); document.querySelector('#navHelp .x')?.click(); document.getElementById('navHelp')?.remove();
    const q = document.getElementById('vQ'); if (q) { q.value = '2'; q.dispatchEvent(new Event('change')); }
    HSS.stil.set('real'); const st = document.getElementById('vStil'); if (st) st.value = 'real';
    HSS.view.labels = false; HSS.ui.refreshViewbar(); HSS.s3.setSun?.(10.5); const vs = document.getElementById('vSun'); if (vs) vs.value = 10.5;
    HSS.s3.select(null); document.body.classList.add('nopanel'); window.dispatchEvent(new Event('resize'));
    HSS.runSimulation();
  });
  for (let i = 0; i < 150; i++) await ev(d => { window.__noDraw = true; __step(d); }, DT);

  let f = 0, mx = 1500, my = 700, perFrame = null;
  const t0 = Date.now();
  async function frame() {
    if (f >= TO) { await b.close(); console.log('done', OUT, FROM, TO, ((Date.now() - t0) / 1000).toFixed(0) + 's'); process.exit(0); }
    if (perFrame) await perFrame(f);
    const capt = f >= FROM && (f - FROM) % EVERY === 0;
    await ev(([d, nd]) => { window.__noDraw = nd; __step(d); }, [DT, !capt]);
    if (capt) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
      fs.writeFileSync(`${OUT}/f${String(f).padStart(4, '0')}.png`, Buffer.from(r.data, 'base64'));
      if (f % 60 === 0) console.log('frame', f, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
    f++;
  }
  const wait = async n => { for (let i = 0; i < n; i++) await frame(); };
  const at = async fr => { if (f > fr) console.log('WARN behind schedule', f, fr); while (f < fr) await frame(); };
  const S = s => Math.round(s * FPS);
  const setCur = async (x, y, real = true) => { mx = x; my = y; await ev(([x, y]) => __ov.cursor(x, y), [x, y]); if (real) await p.mouse.move(x, y); };
  async function moveTo(x, y, n = 18, real = true) { const x0 = mx, y0 = my, bend = Math.min(60, Math.hypot(x - x0, y - y0) * 0.12); for (let i = 1; i <= n; i++) { const e = ease(i / n), arc = Math.sin(Math.PI * e) * bend; await setCur(x0 + (x - x0) * e, y0 + (y - y0) * e - arc, real); await frame(); } }
  async function box(sel) { const bb = await p.locator(sel).first().boundingBox(); if (!bb) throw new Error('no box ' + sel); return bb; }
  async function moveToEl(sel, n = 18) { const bb = await box(sel); await moveTo(bb.x + bb.width / 2, bb.y + bb.height / 2, n); }
  async function click(real = true) { await ev(() => __ov.click()); if (real) { await p.mouse.down(); await frame(); await frame(); await p.mouse.up(); } else { await frame(); await frame(); } }
  async function clickEl(sel, n = 18, after = 6, real = true) { await moveToEl(sel, n); await wait(2); await click(real); await wait(after); }
  async function drag(dx, dy, n, hold = 3) { await p.mouse.down(); await wait(hold); const x0 = mx, y0 = my; for (let i = 1; i <= n; i++) { const e = ease(i / n); await setCur(x0 + dx * e, y0 + dy * e); await frame(); } await p.mouse.up(); }
  const cap = (k, h) => ev(([k, h]) => __ov.caption(k, h), [k, h]);
  const capOff = () => ev(() => __ov.caption(null));
  const showCur = on => ev(o => __ov.showCursor(o), on);
  const orbit = (deg, dolly = 1) => ev(([deg, dolly]) => { const S3 = HSS.s3, c = S3.camera, o = S3.controls; const v = c.position.clone().sub(o.target); const a = deg * Math.PI / 180, x = v.x * Math.cos(a) - v.z * Math.sin(a), z = v.x * Math.sin(a) + v.z * Math.cos(a); v.set(x, v.y, z).multiplyScalar(dolly); c.position.copy(o.target).add(v); HSS.perf?.invalidate?.(2); }, [deg, dolly]);
  const fly = (pos, tgt, ms) => ev(([pos, tgt, ms]) => { const T = window.THREEX.THREE; HSS.s3.animateCam(new T.Vector3(...pos), new T.Vector3(...tgt), ms); }, [pos, tgt, ms]);
  const cam = (pos, tgt) => ev(([pos, tgt]) => { const S3 = HSS.s3; S3.camera.position.set(...pos); S3.controls.target.set(...tgt); S3.controls.update?.(); HSS.perf?.invalidate?.(2); }, [pos, tgt]);
  // Mittelpunkt eines Gebäudes (Bounding Box in Weltkoordinaten)
  const bld = n => ev(n => { const b = HSS.project().buildings.find(x => !x.umgebung && (x.name === n || x.name.startsWith(n + ' '))); const o = HSS.partFootprint(b.parts[0]).outer, g = HSS.geo.bbox(o); return { cx: (g.x0 + g.x1) / 2, cz: (g.z0 + g.z1) / 2, w: g.x1 - g.x0, d: g.z1 - g.z0, id: b.parts[0].id }; }, n);
  const floorBtn = async t => { await ev(t => { const b = [...document.querySelectorAll('#floorNav button')].find(x => x.textContent.trim() === t); if (b) b.id = 'fb_' + (t === '⌂' ? 'all' : t); }, t); return '#fb_' + (t === '⌂' ? 'all' : t); };
  const logo = await ev(() => document.querySelector('.brand img, #top img')?.src || '');

  const C = { x: -95, z: -10 };
  await cam([C.x - 330, 300, C.z + 380], [C.x, 0, C.z]);
  for (let i = 0; i < 20; i++) await ev(d => { window.__noDraw = true; __step(d); }, DT);
  await setCur(1500, 760, false);

  /* ===== 0–3,6 s: Titel ===== */
  await ev(([logo, t]) => __ov.card(`${logo ? `<img src="${logo}">` : ''}<div class="t">Fabric Planning Suite</div><div class="line"></div><div class="s">Werk 1 Friedrichshafen · Großmotoren – Planungsmodell in 3D</div><div class="s2">Auf Basis öffentlich verfügbarer Informationen</div>`, t - 1000, t + 3700, 1, 650), [logo, await ev(() => __vt())]);
  perFrame = async () => orbit(0.14, 0.9985);
  await at(S(3.6)); perFrame = null;

  /* ===== 3,6–10 s: Werksgelände ===== */
  await cap('Werksgelände', '92 Gebäude aus OpenStreetMap – Hallen, Wege, Bahn und Umgebung');
  await showCur(1); await moveTo(1150, 620, 16, false); await setCur(1150, 620); await wait(3);
  await drag(-300, 0, 40); await wait(8);
  const g43 = await bld('G 43');
  await fly([g43.cx - 150, 140, g43.cz + 190], [g43.cx - 30, 0, g43.cz], 2600);
  await moveTo(1500, 840, 30, false);
  await at(S(10.0));

  /* ===== 10–17 s: Montage im Erdgeschoss ===== */
  await cap('Montage Großmotoren', 'Montagelinie mit 18 Stationen im 8-m-Raster auf Schwerlast-FTS');
  const eg = await floorBtn('EG');
  await clickEl(eg, 20, 4);
  await fly([g43.cx - 75, 62, g43.cz + 78], [g43.cx, 0, g43.cz], 2200);
  await moveTo(1600, 860, 20, false); await showCur(0);
  await wait(70);
  perFrame = async () => orbit(0.12);
  await at(S(17.0)); perFrame = null;

  /* ===== 17–22,5 s: Perspektive auf Augenhöhe entlang der Linie ===== */
  await cap('Realistische Perspektive', 'Arbeitsbühnen, Säulenkran, Bereitstellung – maßstäblich');
  const L = await ev(pid => { const prj = HSS.project(); const st = prj.objects.filter(o => o.host?.part === pid && o.lib === 'pm.gm.station').map(o => HSS.objWorld(o)); st.sort((a, b) => a.x - b.x || a.z - b.z); return st.slice(0, 8).map(w => [w.x, w.z, w.rot]); }, g43.id);
  if (L.length >= 2) {
    // entlang der ersten Reihe, seitlich versetzt im Versorgungsgang
    const a = L[0], z = L[L.length - 1], dx = z[0] - a[0], dz = z[1] - a[1], len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len, off = 8.5, n0 = f, n1 = S(22.5);
    perFrame = async fr => { const t = ease((fr - n0) / (n1 - n0)); const px = a[0] + dx * (0.05 + 0.7 * t) + nx * off, pz = a[1] + dz * (0.05 + 0.7 * t) + nz * off; await cam([px, 4.2, pz], [px - nx * off + dx / len * 9, 1.6, pz - nz * off + dz / len * 9]); };
  }
  await at(S(22.5)); perFrame = null;

  /* ===== 22,5–28 s: Kurbelgehäusefertigung ===== */
  await cap('Mechanische Fertigung', 'Kurbelgehäuse: Portal-Bearbeitungszentren, verkettet, mit Waschen und Messen');
  const g62 = await bld('G 62');
  await cam([g62.cx - 70, 58, g62.cz + 75], [g62.cx, 0, g62.cz]);
  perFrame = async () => orbit(0.16, 0.9993);
  await at(S(28.0)); perFrame = null;

  /* ===== 28–33 s: Prüffeld und Lackiererei ===== */
  await cap('Prüffeld & Lackiererei', 'Heißtest-Zellen mit Leitwarte, Lackierung im Durchlauf');
  const g302 = await bld('G 30/2');
  await cam([g302.cx + 60, 52, g302.cz + 78], [g302.cx + 10, 0, g302.cz]);
  perFrame = async () => orbit(-0.14, 0.9994);
  await at(S(33.0)); perFrame = null;

  /* ===== 33–40 s: Produktionsplaner ===== */
  await cap('Produktionsplaner', 'Takt, Stationen, Werker und Fläche – mit Rechenweg und Quellen');
  await ev(pid => { HSS.ui.prInp = { typ: 'montage', name: 'Montagelinie Großmotoren', part: pid, floor: 0, produkt: 'gross', stueck: 1700, inhalt: 5000 }; }, g43.id);
  await cam([g43.cx - 70, 70, g43.cz + 85], [g43.cx + 5, 0, g43.cz]);
  await showCur(1);
  await ev(() => document.body.classList.remove('nopanel'));
  await clickEl('#rail button[data-ws="produktion"]', 24, 10);
  await ev(() => { window.dispatchEvent(new Event('resize')); });
  await moveTo(330, 560, 26, false);
  const sc = async (k) => ev(k => { const el = document.querySelector('#panel .body, #panel'); const s = [...document.querySelectorAll('#panel *')].find(e => e.scrollHeight > e.clientHeight + 40 && getComputedStyle(e).overflowY !== 'visible'); if (s) s.scrollTop = k * (s.scrollHeight - s.clientHeight); }, k);
  for (let i = 1; i <= 60; i++) { await sc(0.62 * ease(i / 60)); await frame(); }
  perFrame = async () => orbit(0.08);
  await at(S(40.0)); perFrame = null;

  /* ===== 40–50 s: Materialflüsse ===== */
  await cap('Materialflüsse', '30 Flüsse vom Wareneingang über Montage und Prüffeld bis zum Versand');
  await ev(() => { document.body.classList.add('nopanel'); window.dispatchEvent(new Event('resize')); });
  const all = await floorBtn('⌂');
  await clickEl(all, 22, 4);
  await clickEl('#vFlow', 22, 8);
  await cam([C.x - 210, 230, C.z + 270], [C.x + 10, 0, C.z - 10]);
  await moveTo(1500, 860, 24, false); await showCur(0);
  await ev(() => { HSS.flussbild.tempo = 2.5; HSS.flussbild.setHour?.(9); HSS.flussbild.play?.(true); });
  perFrame = async () => orbit(0.1, 0.9993);
  await at(S(50.0)); perFrame = null;

  /* ===== 50–56,4 s: Tagessimulation ===== */
  await cap('Tagessimulation', 'Rund 660 Touren am Tag – Auslastung der Werkstraßen auf einen Blick');
  await ev(() => { HSS.flussbild.play?.(false); HSS.flussbild.set(false); HSS.drawNet('heat', null); const v = document.getElementById('vNet'); if (v) v.value = 'heat'; });
  await cam([C.x - 150, 260, C.z + 230], [C.x, 0, C.z]);
  perFrame = async () => orbit(0.12);
  await at(S(56.4)); perFrame = null;

  /* ===== Abspann ===== */
  await capOff();
  const tn = await ev(() => __vt());
  await ev(([logo, t]) => __ov.card(`${logo ? `<img src="${logo}">` : ''}<div class="t">Fabric Planning Suite</div><div class="line"></div><div class="s">Fabriken planen · Flüsse verstehen · Varianten bewerten</div><div class="s2">UNITY Consulting &amp; Innovation</div>`, t + 200, t + 99999, 700, 1), [logo, tn]);
  perFrame = async () => orbit(-0.1);
  await at(TOTAL);
  await b.close(); console.log('done (end)', OUT);
})();
