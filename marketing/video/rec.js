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
  await p.goto('http://127.0.0.1:8765/index.html'); await p.waitForTimeout(1500);
  const cdp = await p.context().newCDPSession(p);
  const ev = (fn, a) => p.evaluate(fn, a);
  for (let i = 0; i < 20; i++) await ev(d => __step(d), DT); // Aufwärmen

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
  const orbit = (deg, dolly = 1) => ev(([deg, dolly]) => { const { camera: c, controls: o } = __kbm; const v = c.position.clone().sub(o.target); const a = deg * Math.PI / 180, x = v.x * Math.cos(a) - v.z * Math.sin(a), z = v.x * Math.sin(a) + v.z * Math.cos(a); v.set(x, v.y, z).multiplyScalar(dolly); c.position.copy(o.target).add(v); }, [deg, dolly]);
  // Bildschirmposition eines Bereichs über die Tooltip-Erkennung finden
  async function findArea(name, x0 = 360, x1 = 1760, y0 = 120, y1 = 880) {
    return ev(([name, x0, x1, y0, y1]) => {
      const cv = document.querySelector('#viewport canvas'), tip = document.getElementById('tip'); const hits = [];
      for (let y = y0; y <= y1; y += 14) for (let x = x0; x <= x1; x += 14) {
        cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true }));
        if (!tip.hidden && tip.querySelector('b')?.textContent === name) hits.push([x, y]);
      }
      tip.hidden = true;
      if (!hits.length) return null;
      const cx = hits.reduce((s, h) => s + h[0], 0) / hits.length, cy = hits.reduce((s, h) => s + h[1], 0) / hits.length;
      return hits.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
    }, [name, x0, x1, y0, y1]);
  }

  const logo = await ev(() => document.querySelector('.logo').src);
  await setCur(1500, 760, false);

  /* ===== 0–4 s: Titel ===== */
  await ev(([logo, t]) => __ov.card(`<img src="${logo}"><div class="t">Logistikmodell 3D</div><div class="line"></div><div class="s">Klinikum Bielefeld-Mitte · Ver- und Entsorgungslogistik</div>`, t - 1000, t + 3700, 1, 650), [logo, await ev(() => __vt())]);
  perFrame = async () => orbit(0.16, 0.9993);
  await at(S(3.6));
  perFrame = null;

  /* ===== 3.6–9.5 s: Drehen & Zoomen ===== */
  await cap('Interaktives 3D-Modell', 'Frei drehen, zoomen, erkunden');
  await showCur(1);
  await moveTo(1180, 640, 16, false);
  await setCur(1180, 640);
  await wait(3);
  await drag(-330, 0, 34);              // um die Hochachse drehen
  await wait(6);
  await drag(60, -60, 16);              // leicht kippen
  await wait(4);
  await clickEl('#zIn', 22, 12);
  await clickEl('#zIn', 8, 20);

  /* ===== Warenströme ===== */
  await at(S(9.8));
  await cap('Warenströme', '9 Ströme – farbcodiert und animiert');
  await clickEl('#flNone', 18, 8);
  for (const fid of ['speisen', 'sterilgut', 'patient']) await clickEl(`#flowList input[data-f="${fid}"]`, 11, 9);
  await wait(16);
  await clickEl('#flAll', 14, 10);

  /* ===== Explosionsansicht ===== */
  await at(S(16.4));
  await cap('Explosionsansicht', 'Alle Ebenen im Blick');
  const ex = await box('#explode');
  await moveTo(ex.x + 8, ex.y + ex.height / 2, 18); await wait(2);
  await ev(() => __ov.click());
  await p.mouse.down(); await wait(2);
  for (let i = 1; i <= 36; i++) { const e = ease(i / 36); await setCur(ex.x + 8 + (ex.width * 0.5) * e, ex.y + ex.height / 2); await orbit(0, 1.006); await frame(); }
  await p.mouse.up();
  perFrame = async () => orbit(0.22);
  await moveTo(1200, 560, 22, false); await wait(14);
  perFrame = null;
  await moveTo(ex.x + 8 + ex.width * 0.5, ex.y + ex.height / 2, 16); await wait(2);
  await ev(() => __ov.click()); await p.mouse.down(); await wait(2);
  for (let i = 1; i <= 20; i++) { const e = ease(i / 20); await setCur(ex.x + 8 + ex.width * 0.5 * (1 - e) - 6 * e, ex.y + ex.height / 2); await orbit(0, 0.9895); await frame(); }
  await p.mouse.up();

  /* ===== Bereich anklicken ===== */
  await at(S(22.0));
  await cap('Bereiche', 'Ein Klick: Fläche, Fahrten, Engpässe');
  let pos = await findArea('Zentral-OP', 700, 1400) || await findArea('Zentrale Notaufnahme (NIZ)', 700, 1400) || await findArea('Zentral-OP');
  console.log('area pos', pos);
  await moveTo(pos[0], pos[1], 22); await wait(10);
  await click(); await wait(48);

  /* ===== Prozess-Tour ===== */
  await at(S(26.6));
  await cap('Prozess-Tour', 'Automatische Kamerafahrt von der Quelle zur Senke');
  await clickEl('#info [data-close]', 14, 4);
  await clickEl('#tourFlow', 16, 2, false);
  await ev(() => { const s = document.querySelector('#tourFlow'); s.value = 'patient'; s.dispatchEvent(new Event('change')); }); await wait(6);
  const sp = await box('#tourSpeed');
  await moveTo(sp.x + sp.width * 0.2, sp.y + sp.height / 2, 12); await wait(1);
  await ev(() => __ov.click()); await p.mouse.down(); await wait(1);
  for (let i = 1; i <= 10; i++) { const e = ease(i / 10); await setCur(sp.x + sp.width * (0.2 + 0.78 * e), sp.y + sp.height / 2); await frame(); }
  await p.mouse.up();
  await clickEl('#tourStart', 12, 4);
  await moveTo(1700, 820, 20, false); await showCur(0);
  await at(S(37.4));
  await showCur(1);
  await clickEl('#tourStop', 18, 4);

  /* ===== Heatmap & Tagesachse ===== */
  await at(S(38.6));
  await cap('Heatmap & Tagesachse', 'Auslastung und Spitzenstunden erkennen');
  await moveToEl('#btnHome', 18); await wait(2); await click(); await ev(() => { const F = __kbm.state.fly; if (F) F.p1.sub(F.t1).multiplyScalar(0.5).add(F.t1); }); await wait(6);
  await clickEl('#btnHeat', 16, 8);
  await clickEl('#tlPlay', 22, 4);
  await moveTo(1350, 700, 26, false);
  await at(S(44.6));
  await clickEl('#tlDay', 22, 2);
  await clickEl('#btnHeat', 22, 2);

  /* ===== Ist / Soll ===== */
  await at(S(46.2));
  await cap('Ist / Soll', 'Varianten im direkten Vergleich');
  await clickEl('#scSeg button[data-sc="soll"]', 18, 10);
  await clickEl('.tabs button[data-tab="analysis"]', 22, 10);
  await moveTo(220, 330, 26);
  await wait(16);

  /* ===== Messung ===== */
  await at(S(52.0));
  await cap('Wege messen', 'Distanz, Zeit und Aufzüge je Transportart');
  await clickEl('.tabs button[data-tab="measure"]', 16, 4);
  await clickEl('#mFrom', 10, 1, false);
  await ev(() => { const s = document.querySelector('#mFrom'); s.value = 'zsva'; s.dispatchEvent(new Event('change')); }); await wait(3);
  await clickEl('#mTo', 9, 1, false);
  await ev(() => { const s = document.querySelector('#mTo'); s.value = 'intensiv'; s.dispatchEvent(new Event('change')); }); await wait(3);
  await clickEl('#mRun', 10, 4);
  await moveTo(230, 520, 20); await wait(10);

  /* ===== Abspann ===== */
  await at(S(56.4));
  await capOff(); await showCur(0);
  const tn = await ev(() => __vt());
  await ev(([logo, t]) => __ov.card(`<img src="${logo}"><div class="t">Logistikmodell 3D</div><div class="line"></div><div class="s">Ströme verstehen · Engpässe finden · Varianten bewerten</div><div class="s2">UNITY Consulting &amp; Innovation</div>`, t + 200, t + 99999, 700, 1), [logo, tn]);
  perFrame = async () => orbit(-0.12);
  await at(TOTAL);
  await b.close(); console.log('done (end)', OUT);
})();
