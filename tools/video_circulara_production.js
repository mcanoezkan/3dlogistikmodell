// Nimmt das Demo-Video von Circulara Production auf (Playwright). Aufruf: node tools/video_circulara_production.js
// Ergebnis (WebM) in reifegrad/video/roh/, danach z. B.: ffmpeg -i <datei>.webm -c:v libx264 -crf 24 -pix_fmt yuv420p reifegrad/video/Circulara_Production_Demo.mp4
const { chromium } = require('playwright');
const W = 1920, H = 1080, sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: require('path').resolve(__dirname, '..', 'reifegrad', 'video', 'roh'), size: { width: W, height: H } } });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'Circulara_Production.html'));
  await sleep(800);
  const cap = (t, k) => p.evaluate(([t, k]) => window.PRS.caption(t, k), [t, k]);
  const scroll = async (dy, steps = 12, d = 60) => { for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, dy / steps); await sleep(d); } };
  await p.mouse.move(1100, 500);
  await cap('Reifegrad-Check für die Produktion – mit optimalem Fabriklayout am Ende', 'Circulara Production');
  await sleep(3500);
  await scroll(520, 14, 70); await sleep(1500);
  await cap('Pflichtangaben: Unternehmen, Gewichtung der Dimensionen und Planungsdaten', '1 · Ausgangslage erfassen');
  await scroll(380, 10, 60);
  await p.click('#iCo'); await p.keyboard.type('Muster Antriebstechnik GmbH', { delay: 35 });
  await p.click('#iPr'); await p.keyboard.type('Getriebegehäuse-Baureihe G200', { delay: 30 });
  await p.click('#iSe'); await p.keyboard.type('Maschinenbau', { delay: 40 });
  const prio = ['Technik & Ausstattung', 'Prozesse & Materialfluss', 'Organisation & Mitarbeitende', 'Produkt & Programm', 'Digitalisierung & Steuerung'];
  await scroll(260, 8, 50);
  for (let i = 0; i < 5; i++) { await p.selectOption(`#intake select[data-p="${i}"]`, prio[i]); await sleep(260); }
  await scroll(420, 10, 50);
  await cap('Planungsdaten fließen nicht in den Reifegrad ein – sie steuern Kapazität und Layout', '1 · Ausgangslage erfassen');
  const R = { formIst: 'werkstatt', varianten: 'v2', stueck: 's3', los: 'l3', aehnlich: 'a3', familien: '2', schichten: '2', halle: '96x48', lager: 'regal', auto: 'teil' };
  for (const [k, v] of Object.entries(R)) { await p.selectOption(`select[data-r="${k}"]`, v); await sleep(230); }
  await scroll(240, 6, 50);
  for (const s of ['saege', 'drehen', 'fraesen', 'schweissen', 'waschen', 'lackieren']) { await p.click(`#steps [data-s="${s}"]`); await sleep(220); }
  await sleep(500); await p.click('#bSave'); await sleep(1600);
  await p.click('#bStart'); await sleep(900);
  await cap('30 Leitfragen in 5 Dimensionen – gleiche Logik wie Circulara, übertragen auf die Produktion', '2 · Reifegrad-Check');
  await sleep(1800);
  await p.hover('.q-info .i'); await sleep(2600); await p.mouse.move(1500, 600);
  const pat = [0.5,0.75,0.75,0.5, 0.5,0.75,0.5,0.5,0.5,0.5,0.5, 0.25,0.25,0.5,0.25,0.5,0.25,0.5, 0.5,0.75,0.5,0.5,0.75,0.5, 0.5,0.25,0.25,0.5,0.5,0.25];
  let qi = 0, theme = -1;
  for (let g = 0; g < 40; g++) {
    const t = await p.evaluate(() => window.PRS.state().theme);
    if (t !== theme && t > 0) { const nm = ['Produkt & Programm', 'Prozesse & Materialfluss', 'Technik & Ausstattung', 'Organisation & Mitarbeitende', 'Digitalisierung & Steuerung'][t]; await cap(`Dimension ${t + 1}: ${nm}`, '2 · Reifegrad-Check'); }
    theme = t;
    const codes = await p.$$eval('.q-card', els => els.map(e => e.id.slice(2)));
    for (const c of codes) { const sel = `.opt[data-q="${c}"][data-v="${pat[qi++]}"]`; await p.locator(sel).scrollIntoViewIfNeeded(); await p.hover(sel); await sleep(260); await p.click(sel); await sleep(420); }
    if (await p.$('#aRes')) { await sleep(700); await p.click('#aRes'); break; }
    await p.locator('#aNext').scrollIntoViewIfNeeded(); await sleep(250); await p.click('#aNext'); await sleep(450);
  }
  await cap('Regelbasierte Ableitung: Welche Organisationsform passt – und was fehlt dafür?', '3 · Ergebnis');
  await sleep(4500);
  await scroll(620, 16, 70); await sleep(3500);
  await cap('Ampel je Handlungsfeld: Ausstattung und Steuerung reichen für die Linie noch nicht aus', '3 · Ergebnis');
  await sleep(3000);
  await scroll(700, 16, 70); await sleep(3500);
  await cap('Kapazitätsrechnung und Umsetzungsfahrplan – Grundlage für das Layout', '3 · Ergebnis');
  await scroll(600, 14, 70); await sleep(3000);
  await p.click('.tabs [data-tab="overview"]'); await sleep(400); await p.evaluate(() => window.scrollTo(0, 0));
  await cap('Reifegrad wie in Circulara: Stufe, gewichteter Score, Radar je Dimension', '3 · Ergebnis');
  await sleep(2500); await scroll(700, 14, 70); await sleep(3500);
  await p.click('.tabs [data-tab="recs"]'); await sleep(400); await p.evaluate(() => window.scrollTo(0, 0));
  await cap('Handlungsempfehlungen für alle Indikatoren unter 50 %', '3 · Ergebnis');
  await sleep(2500); await scroll(600, 12, 70); await sleep(2000);
  await p.click('.tabs [data-tab="form"]'); await sleep(400);
  await p.locator('#toPlanner').scrollIntoViewIfNeeded(); await sleep(1200);
  await cap('Ein Klick: Der Fabrikplaner richtet die leere Halle als Linienfertigung ein', '4 · Fabrikplaner');
  await p.hover('#toPlanner'); await sleep(1500); await p.click('#toPlanner');
  await sleep(11000);
  await cap('Zonen nach Materialfluss, Linie mit parallelen Anlagen, neue Anlage am Engpass (grün)', '4 · Fabrikplaner');
  await sleep(6000);
  const view = v => p.click(`#planner [data-v="${v}"]`);
  await cap('Draufsicht: Wareneingang → Lager → Linie → Montage → Qualität/Verpackung → Versand', '4 · Fabrikplaner');
  await view('top'); await sleep(6500);
  await cap('Materialflüsse vom Wareneingang bis zum Versand – mit Tagesganglinie', '4 · Fabrikplaner');
  await view('flow'); await sleep(8000);
  const fr = p.frames().find(f => f !== p.mainFrame());
  await fr.evaluate(() => window.postMessage({ type: 'prs:view', view: 'nah' }, '*'));
  await cap('Jedes Objekt ist bearbeitbar – die vollständige Fabric Planning Suite', '4 · Fabrikplaner');
  await sleep(7000);
  await view('out'); await cap('Speicherbar als Projektdatei und als HTML-Ansicht für Kunden', '4 · Fabrikplaner'); await sleep(6000);
  await view('persp'); await cap('Eine Datei · offline · ohne KI – vom Reifegrad zum optimalen Layout', 'Circulara Production'); await sleep(6500);
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
  await ctx.close(); await b.close();
})();
