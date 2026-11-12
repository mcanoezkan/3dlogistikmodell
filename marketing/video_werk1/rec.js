// Demo-Video Fabric Planning Suite 1.4 · Werk 1 Friedrichshafen: Hallenausbau & Intralogistik (60 s, Stil Realistisch)
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
  await ev(([process_Q, process_U]) => {
    document.getElementById('dlg')?.close?.(); document.querySelector('#navHelp .x')?.click(); document.getElementById('navHelp')?.remove();
    const q = document.getElementById('vQ'); if (q) { q.value = process_Q; q.dispatchEvent(new Event('change')); }
    HSS.stil.set('real'); const st = document.getElementById('vStil'); if (st) st.value = 'real';
    HSS.view.labels = false; HSS.ui.refreshViewbar(); HSS.s3.setSun?.(10.5); const vs = document.getElementById('vSun'); if (vs) vs.value = 10.5;
    HSS.s3.select(null); document.body.classList.add('nopanel'); window.dispatchEvent(new Event('resize'));
    if (process_U) { HSS.view.umgebung = process_U; const u = document.getElementById('vUmg'); if (u) u.value = process_U; HSS.s3.rebuild('all'); }
    HSS.runSimulation();
  }, [process.env.Q || '2', process.env.UMG || '']);
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
  // Schwerpunkt bestimmter Objekte in einer Halle (Kamera auf die Maschinen statt auf die Hallenmitte)
  const objC = (pid, libs) => ev(([pid, libs]) => { const ws = HSS.project().objects.filter(o => o.host?.part === pid && libs.includes(o.lib)).map(o => HSS.objWorld(o)); if (!ws.length) return null; return { cx: ws.reduce((a, w) => a + w.x, 0) / ws.length, cz: ws.reduce((a, w) => a + w.z, 0) / ws.length }; }, [pid, libs]);
  const floorBtn = async t => { await ev(t => { const b = [...document.querySelectorAll('#floorNav button')].find(x => x.textContent.trim() === t); if (b) b.id = 'fb_' + (t === '⌂' ? 'all' : t); }, t); return '#fb_' + (t === '⌂' ? 'all' : t); };
  const logo = await ev(() => document.querySelector('.brand img, #top img')?.src || '');

  const C = { x: -95, z: -10 };
  // Welt → Bildschirm, lokaler Hallenpunkt (u, v) → Welt
  const w2s = (x, y, z) => ev(([x, y, z]) => { const T = window.THREEX.THREE, v = new T.Vector3(x, y, z).project(HSS.s3.camera), r = HSS.s3.renderer.domElement.getBoundingClientRect(); return [r.left + (v.x + 1) / 2 * r.width, r.top + (1 - v.y) / 2 * r.height]; }, [x, y, z]);
  const hallUV = (pid, u, v) => ev(([pid, u, v]) => { const pt = HSS.findPart(pid).part, F = HSS.prodFrame(pt, true), q = F.toLoc(u, v), w = HSS.toWorld(pt, q); return [w[0], HSS.floorY(pt, 0) + 0.05, w[1], q[0], q[1]]; }, [pid, u, v]);
  const halle = pid => ev(pid => HSS.project().intralogistik.find(e => e.part === pid && e.kind === 'halle'), pid);
  const setFloor = gf => ev(gf => { HSS.s3.setFloor(gf); }, gf);
  await cam([C.x - 330, 300, C.z + 380], [C.x, 0, C.z]);
  for (let i = 0; i < 20; i++) await ev(d => { window.__noDraw = true; __step(d); }, DT);
  await setCur(1500, 760, false);

  /* ===== 0–3,6 s: Titel ===== */
  await ev(([logo, t]) => __ov.card(`${logo ? `<img src="${logo}">` : ''}<div class="t">Fabric Planning Suite</div><div class="line"></div><div class="s">Werk 1 Friedrichshafen · Großmotoren – Planungsmodell in 3D</div><div class="s2">Hallenausbau &amp; Intralogistik</div>`, t - 1000, t + 3700, 1, 650), [logo, await ev(() => __vt())]);
  perFrame = async () => orbit(0.14, 0.9985);
  await at(S(3.6)); perFrame = null;

  /* ===== 3,6–9 s: Werksgelände ===== */
  await cap('Werksgelände', '92 Gebäude aus OpenStreetMap – Hallen, Werkstraßen, Bahn und Umgebung');
  await showCur(1); await moveTo(1150, 620, 16, false); await setCur(1150, 620); await wait(3);
  await drag(-260, 0, 36); await wait(6);
  const g60 = await bld('G 60'), g43 = await bld('G 43'), g62 = await bld('G 62');
  await fly([g60.cx - 120, 120, g60.cz + 150], [g60.cx, 0, g60.cz], 2300);
  await moveTo(1500, 840, 26, false);
  await at(S(9.0));

  /* ===== 9–16 s: Wege und Bodenmarkierung ===== */
  await cap('Hallenausbau', 'Hauptfahrweg, Querwege, grüner Gehweg mit Überwegen, FTS-Leitlinie');
  const eg = await floorBtn('EG');
  await clickEl(eg, 20, 4);
  const h60 = await halle(g60.id), m60 = await hallUV(g60.id, h60.main.u0 + h60.L * 0.45, h60.main.v + 6);
  await fly([m60[0] + 42, 46, m60[2] + 52], [m60[0], 0, m60[2]], 2000);
  await moveTo(1600, 860, 20, false); await showCur(0);
  await wait(60);
  perFrame = async () => orbit(0.1, 0.9994);
  await at(S(16.0)); perFrame = null;

  /* ===== 16–22 s: Hallenleben auf Augenhöhe ===== */
  await cap('Hallenleben', 'Stapler, Routenzüge, FTS und Werker bewegen sich auf ihren Wegen');
  const h43 = await halle(g43.id);
  { const A = await hallUV(g43.id, h43.main.u0 + 6, h43.main.v + 4.2), B = await hallUV(g43.id, h43.main.u0 + 44, h43.main.v + 4.2), D = await hallUV(g43.id, h43.main.u0 + 30, h43.main.v - 1), n0 = f, n1 = S(22.0);
    perFrame = async fr => { const t = ease((fr - n0) / (n1 - n0)), px = A[0] + (B[0] - A[0]) * t * 0.6, pz = A[2] + (B[2] - A[2]) * t * 0.6; await cam([px, 3.4, pz], [D[0] + (B[0] - A[0]) * t * 0.6, 1.0, D[2] + (B[2] - A[2]) * t * 0.6]); }; }
  await at(S(22.0)); perFrame = null;

  /* ===== 22–29 s: Wege und Fahrzeuge anklicken ===== */
  await cap('Anklicken', 'Jeder Weg und jedes Fahrzeug zeigt seine Angaben');
  await cam([m60[0] + 26, 34, m60[2] + 34], [m60[0], 0, m60[2]]); await wait(4);
  await showCur(1);
  { const q = await ev(pid => { const e = HSS.project().intralogistik.find(e => e.part === pid && e.kind === 'fahrweg' && !e.haupt); const pt = HSS.findPart(pid).part, m = [(e.pts[0][0] + e.pts[1][0]) / 2, (e.pts[0][1] + e.pts[1][1]) / 2], w = HSS.toWorld(pt, m); return [w[0], HSS.floorY(pt, 0) + 0.05, w[1]]; }, g60.id);
    const [x, y] = await w2s(...q); await moveTo(x + 18, y + 10, 24); await wait(4); await click(); await wait(70); }
  { const a = await ev(pid => { const T = window.THREEX.THREE, c = HSS.s3.controls.target; const ag = HSS.hallenleben.agents.filter(a => a.id && a.obj.visible && a.hall.startsWith(pid) && a.kind === 'fz').sort((x, y) => x.obj.position.distanceTo(c) - y.obj.position.distanceTo(c))[0]; if (!ag) return null; ag.wait = 4; return [ag.obj.position.x, ag.obj.position.y + 1.0, ag.obj.position.z]; }, g60.id);
    if (a) { const [x, y] = await w2s(...a); await moveTo(x, y, 22); await wait(3); await click(); } await wait(66); }
  await at(S(29.0));

  /* ===== 29–40 s: Eigenen Routenzug einzeichnen ===== */
  await cap('Eigene Routenzüge', 'Route in die Halle zeichnen – Rundkurs oder Pendelverkehr, Anzahl, Tempo');
  await ev(() => { HSS.s3.select(null); document.body.classList.remove('nopanel'); HSS.ui.setWS('produktion'); window.dispatchEvent(new Event('resize')); });
  await wait(4);
  await ev(() => document.getElementById('haDraw')?.scrollIntoView({ block: 'center' })); await wait(3);
  await moveToEl('#haTyp', 18); await ev(() => { const s = document.getElementById('haTyp'); s.value = 'ha.routenzug'; s.dispatchEvent(new Event('change')); const n = document.getElementById('haN'); n.value = 2; n.dispatchEvent(new Event('change')); const r = document.getElementById('haRoute'); r.value = 'schleife'; r.dispatchEvent(new Event('change')); }); await wait(8);
  await clickEl('#haDraw', 16, 6);
  { const z = await ev(pid => { const e = HSS.project().intralogistik.filter(e => e.part === pid && e.kind === 'zone').sort((a, b) => a.pts[0][0] - b.pts[0][0])[1] || HSS.project().intralogistik.find(e => e.part === pid && e.kind === 'zone'); const pt = HSS.findPart(pid).part, [p, q] = e.pts, x0 = Math.min(p[0], q[0]) - 1.6, x1 = Math.max(p[0], q[0]) + 1.6, z0 = Math.min(p[1], q[1]) - 1.6, z1 = Math.max(p[1], q[1]) + 1.6; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(l => { const w = HSS.toWorld(pt, l); return [w[0], HSS.floorY(pt, 0) + 0.05, w[1]]; }); }, g60.id);
    const zc = [(z[0][0] + z[2][0]) / 2, 0, (z[0][2] + z[2][2]) / 2];
    await cam([zc[0] + 20, 30, zc[2] + 24], zc); await wait(4);
    for (const q of z) { const [x, y] = await w2s(...q); await moveTo(x, y, 16); await wait(3); await click(); await wait(6); }
    await ev(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))); await wait(10);
    await ev(() => { document.body.classList.add('nopanel'); window.dispatchEvent(new Event('resize')); }); await wait(4);
    await moveTo(1600, 860, 20, false); await showCur(0);
    perFrame = async () => orbit(0.12, 0.9992); }
  await at(S(40.0)); perFrame = null;

  /* ===== 40–47 s: Halle mit Tragwerk, Kran und Leuchten ===== */
  await cap('Montage Großmotoren', 'Montagelinie, Stützen, Brückenkran und Hallenleuchten – „Wände voll“');
  await ev(() => { HSS.s3.select(null); HSS.view.cut = 'voll'; HSS.s3.rebuild('all'); });
  { const c = await hallUV(g43.id, h43.L * 0.55, h43.Q * 0.55); await cam([c[0] + 30, 9, c[2] + 34], [c[0], 3, c[2]]); }
  perFrame = async () => orbit(0.13);
  await at(S(47.0)); perFrame = null;

  /* ===== 47–53 s: Mechanische Fertigung ===== */
  await cap('Mechanische Fertigung', 'Kurbelgehäuse: verkettete Portal-BAZ, Rollenbahn, Bereitstellung am Fahrweg');
  await ev(() => { HSS.view.cut = 'halb'; HSS.s3.rebuild('all'); });
  { const k62 = (await objC(g62.id, ['pm.gm.baz'])) || g62; await cam([k62.cx - 46, 40, k62.cz + 50], [k62.cx, 0, k62.cz]); }
  perFrame = async () => orbit(0.16, 0.9993);
  await at(S(53.0)); perFrame = null;

  /* ===== 53–57 s: Materialflüsse ===== */
  await cap('Materialflüsse', '30 Flüsse vom Wareneingang über Montage und Prüffeld bis zum Versand');
  await setFloor(null);
  await ev(() => { document.getElementById('vFlow')?.click(); HSS.flussbild.tempo = 2.5; HSS.flussbild.setHour?.(9); HSS.flussbild.play?.(true); });
  await cam([C.x - 210, 230, C.z + 270], [C.x + 10, 0, C.z - 10]);
  perFrame = async () => orbit(0.1, 0.9993);
  await at(S(57.0)); perFrame = null;

  /* ===== Abspann ===== */
  await capOff();
  const tn = await ev(() => __vt());
  await ev(([logo, t]) => __ov.card(`${logo ? `<img src="${logo}">` : ''}<div class="t">Fabric Planning Suite</div><div class="line"></div><div class="s">Fabriken planen · Flüsse verstehen · Varianten bewerten</div><div class="s2">UNITY Consulting &amp; Innovation</div>`, t + 200, t + 99999, 700, 1), [logo, tn]);
  perFrame = async () => orbit(-0.1);
  await at(TOTAL);
  await b.close(); console.log('done (end)', OUT);
})();
