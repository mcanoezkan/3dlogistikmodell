// Aufnahme: node rec.js <outDir> <from> <to> [every]
// rendert deterministisch Frame für Frame (30 fps, 1800 Frames = 60 s); nur Frames in [from,to) werden gespeichert
const { chromium } = require('playwright'); const H = require('./harness.js'); const fs = require('fs');
const OUT = process.argv[2] || 'frames', FROM = +(process.argv[3] || 0), TO = +(process.argv[4] || 1800), EVERY = +(process.argv[5] || 1);
const FPS = 30, DT = 1000 / FPS, TOTAL = 1800;
fs.mkdirSync(OUT, { recursive: true });
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.addInitScript(H.init);
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  p.on('console', m => { if (/Err/.test(m.text())) console.log('C:', m.text()); });
  await p.goto('http://127.0.0.1:8767/Klinikum_Bielefeld-Mitte_Ansicht.html');
  const cdp = await p.context().newCDPSession(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  for (let i = 0; i < 400; i++) { await ev(d => { window.__noDraw = true; __step(d); }, DT); if (await ev(() => window.HSS && HSS.booted)) break; }
  for (let i = 0; i < 150; i++) await ev(d => { window.__noDraw = true; __step(d); }, DT); // Aufwärmen

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
  async function moveTo(x, y, n = 18, real = true) {
    const x0 = mx, y0 = my;
    // leichter Bogen für natürliche Bewegung
    const bend = Math.min(60, Math.hypot(x - x0, y - y0) * 0.12);
    for (let i = 1; i <= n; i++) { const e = ease(i / n), arc = Math.sin(Math.PI * e) * bend; await setCur(x0 + (x - x0) * e, y0 + (y - y0) * e - arc, real); await frame(); }
  }
  async function box(sel) { const bb = await p.locator(sel).first().boundingBox(); if (!bb) throw new Error('no box ' + sel); return bb; }
  async function moveToEl(sel, n = 18, dx = 0.5, dy = 0.5) { const bb = await box(sel); await moveTo(bb.x + bb.width * dx, bb.y + bb.height * dy, n); }
  async function click(real = true) { await ev(() => __ov.click()); if (real) { await p.mouse.down(); await frame(); await frame(); await p.mouse.up(); } else { await frame(); await frame(); } }
  async function clickEl(sel, n = 18, after = 6, real = true) { await moveToEl(sel, n); await wait(2); await click(real); await wait(after); }
  async function drag(dx, dy, n, hold = 3) { await p.mouse.down(); await wait(hold); const x0 = mx, y0 = my; for (let i = 1; i <= n; i++) { const e = ease(i / n); await setCur(x0 + dx * e, y0 + dy * e); await frame(); } await p.mouse.up(); }
  const cap = (k, h) => ev(([k, h]) => __ov.caption(k, h), [k, h]);
  const capOff = () => ev(() => __ov.caption(null));
  const showCur = on => ev(o => __ov.showCursor(o), on);
  const orbit = (deg, dolly = 1) => ev(([deg, dolly]) => { const S3 = HSS.s3, c = S3.camera, o = S3.controls; const v = c.position.clone().sub(o.target); const a = deg * Math.PI / 180, x = v.x * Math.cos(a) - v.z * Math.sin(a), z = v.x * Math.sin(a) + v.z * Math.cos(a); v.set(x, v.y, z).multiplyScalar(dolly); c.position.copy(o.target).add(v); HSS.perf.invalidate(2); }, [deg, dolly]);
  const camTo = (k, ms) => ev(([k, ms]) => { const S3 = HSS.s3, t = S3.controls.target.clone(); S3.animateCam(t.clone().add(S3.camera.position.clone().sub(t).multiplyScalar(k)), t, ms); }, [k, ms]);
  const homeK = (k, ms) => ev(([k, ms]) => { const st = window.HSS_VIEWER.view, T = window.THREEX.THREE, t = new T.Vector3(...st.tgt), c = new T.Vector3(...st.cam); HSS.s3.animateCam(t.clone().add(c.sub(t).multiplyScalar(k)), t, ms); }, [k, ms]);
  const setSel = (sel, v) => ev(([sel, v]) => { const s = document.querySelector(sel); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
  // Bildschirmposition eines Gebäudes über das Picking der Suite
  async function findBld(bid, x0 = 520, x1 = 1500, y0 = 260, y1 = 860) {
    return ev(([bid, x0, x1, y0, y1]) => {
      const prj = HSS.project(), owner = {}; for (const b of prj.buildings) for (const pt of (b.parts || [])) owner[pt.id] = b.id;
      const hits = [];
      for (let y = y0; y <= y1; y += 12) for (let x = x0; x <= x1; x += 12) { const h = HSS.s3.pick({ clientX: x, clientY: y }); if (h?.kind === 'part' && owner[h.id] === bid) hits.push([x, y]); }
      if (!hits.length) return null;
      const cx = hits.reduce((s, h) => s + h[0], 0) / hits.length, cy = hits.reduce((s, h) => s + h[1], 0) / hits.length;
      return hits.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
    }, [bid, x0, x1, y0, y1]);
  }

  // Vorbereitung: Bedienhilfe schließen, Qualität hoch, Startansicht etwas näher
  await ev(() => { document.querySelector('#navHelp .x')?.click(); const q = document.getElementById('vQ'); q.value = '2'; q.dispatchEvent(new Event('change')); });
  await camTo(0.62, 10);
  for (let i = 0; i < 30; i++) await ev(d => { window.__noDraw = true; __step(d); }, DT);
  const logo = await ev(() => document.querySelector('#top img').src);
  await setCur(1500, 760, false);

  /* ===== 0–3,6 s: Titel ===== */
  await ev(([logo, t]) => __ov.card(`<img src="${logo}"><div class="t">Logistikmodell 3D</div><div class="line"></div><div class="s">Klinikum Bielefeld-Mitte · Healthcare Simulation Suite</div>`, t - 1000, t + 3700, 1, 650), [logo, await ev(() => __vt())]);
  perFrame = async () => orbit(0.16, 0.9992);
  await at(S(3.6));
  perFrame = null;

  /* ===== Drehen & Zoomen ===== */
  await cap('Interaktives 3D-Modell', 'Frei drehen, zoomen, erkunden');
  await showCur(1);
  await moveTo(1150, 640, 16, false);
  await setCur(1150, 640);
  await wait(3);
  await drag(-330, 0, 34);
  await wait(6);
  await drag(50, -45, 16);
  await wait(4);
  await moveToEl('#zIn', 22); await wait(2); await click(); await camTo(0.7, 900); await wait(12);
  await moveToEl('#zIn', 6); await wait(2); await click(); await camTo(0.85, 900); await wait(18);

  /* ===== Gebäude anklicken ===== */
  await at(S(9.8));
  await cap('Gebäude', 'Ein Klick: Daten zu jedem Baukörper');
  const pos = await findBld('bie_NIZ') || await findBld('bie_H1');
  console.log('bld pos', pos);
  if (pos) { await moveTo(pos[0], pos[1], 22); await wait(8); await click(); }
  await wait(36);
  await clickEl('#vwCard .x', 18, 4);

  /* ===== Warenströme ===== */
  await at(S(14.4));
  await cap('Warenströme', '9 Ströme – farbcodiert und animiert');
  await clickEl('#vFlow', 18, 8);
  await clickEl('#stroeme [data-sn]', 16, 6);
  for (const fid of ['speisen', 'sterilgut', 'patient']) await clickEl(`#stroeme [data-s="${fid}"]`, 10, 8);
  await wait(12);
  await clickEl('#stroeme [data-sa]', 14, 8);

  /* ===== Explosionsansicht ===== */
  await at(S(21.0));
  await cap('Explosionsansicht', 'Alle Geschosse im Blick');
  const ex = await box('#vExplode');
  await moveTo(ex.x + 7, ex.y + ex.height / 2, 18); await wait(2);
  await ev(() => __ov.click()); await p.mouse.down(); await wait(2);
  for (let i = 1; i <= 36; i++) { const e = ease(i / 36); await setCur(ex.x + 7 + ex.width * 0.55 * e, ex.y + ex.height / 2); await orbit(0, 1.004); await frame(); }
  await p.mouse.up();
  perFrame = async () => orbit(0.22);
  await moveTo(1150, 600, 22, false); await wait(6);
  perFrame = null;
  await moveTo(ex.x + 7 + ex.width * 0.55, ex.y + ex.height / 2, 16); await wait(2);
  await ev(() => __ov.click()); await p.mouse.down(); await wait(2);
  for (let i = 1; i <= 20; i++) { const e = ease(i / 20); await setCur(ex.x + 7 + ex.width * 0.55 * (1 - e) - 6 * e, ex.y + ex.height / 2); await orbit(0, 0.9932); await frame(); }
  await p.mouse.up();

  /* ===== Prozess-Tour ===== */
  await at(S(26.6));
  await cap('Prozess-Tour', 'Automatische Kamerafahrt von der Quelle zur Senke');
  await clickEl('#stroeme [data-ts]', 18, 2, false);
  await setSel('#stroeme [data-ts]', 'patient'); await wait(6);
  const sp = await box('#stroeme [data-tt]');
  await moveTo(sp.x + sp.width * 0.14, sp.y + sp.height / 2, 12); await wait(1);
  await ev(() => __ov.click()); await p.mouse.down(); await wait(1);
  for (let i = 1; i <= 10; i++) { const e = ease(i / 10); await setCur(sp.x + sp.width * (0.14 + 0.62 * e), sp.y + sp.height / 2); await frame(); }
  await p.mouse.up();
  await clickEl('#stroeme [data-tgo]', 12, 4);
  await moveTo(1700, 820, 20, false); await showCur(0);
  await at(S(37.2));
  await showCur(1);
  await clickEl('#stTour [data-te]', 18, 4);

  /* ===== Tagesablauf & Auslastung ===== */
  await at(S(38.6));
  await cap('Tagesablauf & Auslastung', 'Simulation über den Tag, Engpässe erkennen');
  await clickEl('#vFlow', 18, 4);
  await moveToEl('#vwHome', 16); await wait(2); await click(false); await homeK(0.55, 1200); await wait(8);
  await clickEl('#vNet', 16, 2, false); await setSel('#vNet', 'heat'); await wait(6);
  await clickEl('#vwSim', 18, 6);
  await ev(() => { const s = document.getElementById('tSpeed'); if (s) { s.value = '600'; s.dispatchEvent(new Event('change')); } });
  await moveTo(1250, 650, 26, false);
  await at(S(45.6));
  await setSel('#vNet', 'aus');

  /* ===== Etagen ===== */
  await at(S(46.2));
  await cap('Etagen', 'Jedes Geschoss mit Räumen und Grundriss');
  await ev(() => { const b = [...document.querySelectorAll('#floorNav button')].find(x => x.textContent.trim() === 'EG'); if (b) b.id = 'fbEG'; const h = [...document.querySelectorAll('#floorNav button')].find(x => x.textContent.trim() === '⌂'); if (h) h.id = 'fbAll'; });
  await clickEl('#fbEG', 20, 2);
  await ev(() => {
    const prj = HSS.project(), b = prj.buildings.find(x => x.id === 'bie_H1'), T = window.THREEX.THREE, box = new T.Box3();
    for (const pt of b.parts) for (const [x, z] of HSS.partFootprint(pt).outer) box.expandByPoint(new T.Vector3(x, 0, z));
    const c = box.getCenter(new T.Vector3()), S3 = HSS.s3, dir = S3.camera.position.clone().sub(S3.controls.target); dir.y = 0; dir.normalize();
    S3.animateCam(c.clone().add(dir.multiplyScalar(95)).add(new T.Vector3(0, 85, 0)), c, 1400);
  });
  await moveTo(1300, 760, 30, false);
  perFrame = async () => orbit(0.1);
  await at(S(52.0));
  perFrame = null;

  /* ===== Flächenplan ===== */
  await cap('Flächenplan', 'Nutzungen und Flächen auf einen Blick');
  await clickEl('#vZon', 22, 2); await homeK(0.5, 1500); await wait(4);
  perFrame = async () => orbit(0.12);
  await moveTo(1300, 700, 24, false);
  await at(S(56.4));
  perFrame = null;

  /* ===== Abspann ===== */
  await capOff(); await showCur(0);
  const tn = await ev(() => __vt());
  await ev(([logo, t]) => __ov.card(`<img src="${logo}"><div class="t">Logistikmodell 3D</div><div class="line"></div><div class="s">Ströme verstehen · Engpässe finden · Varianten bewerten</div><div class="s2">UNITY Consulting &amp; Innovation</div>`, t + 200, t + 99999, 700, 1), [logo, tn]);
  perFrame = async () => orbit(-0.12);
  await at(TOTAL);
  await b.close(); console.log('done (end)', OUT);
})();
