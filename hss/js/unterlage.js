/* =====================================================================
   HSS · unterlage.js – Luftbild bzw. Karte als Unterlage auf dem Gelände
   Zum Prüfen und Nachzeichnen importierter Gebäude. Quellen:
     esri  Esri World Imagery (weltweit, Kacheln)
     osm   OpenStreetMap-Karte (Kacheln)
     nrw   DOP NRW 10 cm (WMS, Open Data dl-de/zero-2.0)
     by    DOP Bayern 20 cm (WMS, Open Data CC BY 4.0)
     xyz / wms  eigene Adresse ({z}/{x}/{y} bzw. WMS-GetMap ohne BBOX/WIDTH/HEIGHT)
   Gespeichert wird nur die Einstellung (Projekt → settings.unterlage), nicht das Bild:
   das Bild wird bei Bedarf neu geladen (Internetverbindung nötig).
   Das Bild wird über ein Raster in Web-Mercator-Koordinaten exakt auf das Modell
   projiziert (Nordwinkel und Lage stimmen), es folgt der Geländehöhe.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, UI = HSS.ui, $ = UI.$;
const { THREE } = window.THREEX;
const UL = HSS.unterlage = {};
UL.QUELLEN = {
  esri: { name: 'Luftbild weltweit (Esri World Imagery)', typ: 'xyz', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', max: 19, attr: 'Luftbild: Esri, Maxar, Earthstar Geographics, GIS User Community' },
  nrw: { name: 'Luftbild NRW (DOP 10 cm, amtlich)', typ: 'wms', url: 'https://www.wms.nrw.de/geobasis/wms_nw_dop?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=nw_dop_rgb&STYLES=&FORMAT=image/jpeg', attr: 'Luftbild: © GeoBasis-DE / NRW (dl-de/zero-2.0)' },
  by: { name: 'Luftbild Bayern (DOP 20 cm, amtlich)', typ: 'wms', url: 'https://geoservices.bayern.de/od/wms/dop/v1/dop20?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=by_dop20c&STYLES=&FORMAT=image/jpeg', attr: 'Luftbild: © Bayerische Vermessungsverwaltung (CC BY 4.0)' },
  osm: { name: 'OpenStreetMap-Karte', typ: 'xyz', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', max: 19, attr: 'Karte: © OpenStreetMap-Mitwirkende' },
  xyz: { name: 'Eigene Kachel-Adresse (XYZ)', typ: 'xyz', url: '', max: 20, attr: '' },
  wms: { name: 'Eigener WMS (EPSG:3857)', typ: 'wms', url: '', attr: '' }
};
let grp = null, key = '', laeuft = null;
const R = 6378137, mx = lon => R * U.rad(lon), my = lat => R * Math.log(Math.tan(Math.PI / 4 + U.rad(lat) / 2));
const lonOf = x => U.deg(x / R), latOf = y => U.deg(2 * Math.atan(Math.exp(y / R)) - Math.PI / 2);
const img = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Bild nicht ladbar: ' + src.slice(0, 80))); i.src = src; });

// Bild in Web-Mercator für die Box um den Ursprung zusammensetzen
async function bild(cfg, geo) {
  const Q = UL.QUELLEN[cfg.quelle] || UL.QUELLEN.esri, url = cfg.url || Q.url; if (!url) throw new Error('Keine Adresse für die Unterlage angegeben');
  const rad = U.clamp(cfg.radius || 400, 50, 1500), k = 1 / Math.cos(U.rad(geo.lat)); // Mercator-Maßstab
  const cx = mx(geo.lon), cy = my(geo.lat), h = rad * k * 1.45; // Rand für gedrehte Modelle
  const x0 = cx - h, x1 = cx + h, y0 = cy - h, y1 = cy + h;
  let cv, ctx;
  if (Q.typ === 'wms' || cfg.quelle === 'wms') {
    // WMS: in Teilbildern zu höchstens 2048 px, Bodenauflösung etwa 0,2 m
    const px = U.clamp(Math.round((x1 - x0) / (k * 0.2)), 512, 4096), n = Math.ceil(px / 2048), sp = Math.round(px / n);
    cv = document.createElement('canvas'); cv.width = cv.height = sp * n; ctx = cv.getContext('2d');
    const jobs = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const bx0 = x0 + (x1 - x0) * i / n, bx1 = x0 + (x1 - x0) * (i + 1) / n, by1 = y1 - (y1 - y0) * j / n, by0 = y1 - (y1 - y0) * (j + 1) / n;
      const u = `${url}${url.includes('?') ? '&' : '?'}CRS=EPSG:3857&SRS=EPSG:3857&BBOX=${bx0.toFixed(2)},${by0.toFixed(2)},${bx1.toFixed(2)},${by1.toFixed(2)}&WIDTH=${sp}&HEIGHT=${sp}`;
      jobs.push(img(u).then(im => ctx.drawImage(im, i * sp, j * sp, sp, sp)));
    }
    await Promise.all(jobs);
    return { cv, x0, x1, y0, y1, attr: Q.attr };
  }
  // Kacheln: Zoomstufe so, dass das Bild höchstens ~3000 px breit wird
  const max = Q.max || 19; let z = max;
  const tileSpan = zz => 2 * Math.PI * R / 2 ** zz;
  while (z > 12 && (x1 - x0) / tileSpan(z) * 256 > 3000) z--;
  const ts = tileSpan(z), off = Math.PI * R;
  const tx0 = Math.floor((x0 + off) / ts), tx1 = Math.floor((x1 + off) / ts), ty0 = Math.floor((off - y1) / ts), ty1 = Math.floor((off - y0) / ts);
  const nx = tx1 - tx0 + 1, ny = ty1 - ty0 + 1;
  if (nx * ny > 196) throw new Error('Unterlage zu groß – Radius verkleinern');
  cv = document.createElement('canvas'); cv.width = nx * 256; cv.height = ny * 256; ctx = cv.getContext('2d');
  const jobs = [];
  for (let x = tx0; x <= tx1; x++) for (let y = ty0; y <= ty1; y++) {
    const u = url.replace('{z}', z).replace('{x}', x).replace('{y}', y).replace('{s}', 'abc'[(x + y) % 3]);
    jobs.push(img(u).then(im => ctx.drawImage(im, (x - tx0) * 256, (y - ty0) * 256)).catch(() => {}));
  }
  await Promise.all(jobs);
  return { cv, x0: tx0 * ts - off, x1: (tx1 + 1) * ts - off, y0: off - (ty1 + 1) * ts, y1: off - ty0 * ts, attr: Q.attr };
}
// Raster über das Bild: jeder Rasterpunkt wird über lat/lon ins Modell projiziert (folgt dem Gelände)
function netz(B, geo, prj) {
  const T = HSS.osm.proj(geo), n = 48, pos = [], uv = [], idx = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = B.x0 + (B.x1 - B.x0) * i / n, y = B.y1 - (B.y1 - B.y0) * j / n;
    const p = T(latOf(y), lonOf(x)); pos.push(p[0], HSS.terrainH(p[0], p[1], prj) + 0.03, p[1]); uv.push(i / n, 1 - j / n);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
UL.cfg = (prj = HSS.project()) => prj.settings?.unterlage || null;
UL.aufbauen = async (force) => {
  const S3 = HSS.s3; if (!S3?.scene) return;
  const prj = HSS.project(), cfg = UL.cfg(prj), geo = prj.meta.geo;
  const k = cfg && cfg.aktiv && geo?.lat ? JSON.stringify([cfg.quelle, cfg.url, cfg.radius, geo.lat, geo.lon, geo.nord, prj.terrain]) : '';
  if (!force && k === key) { if (grp) { grp.visible = !!cfg?.aktiv; if (grp.children[0]) { grp.children[0].material.opacity = cfg?.deckkraft ?? 1; grp.children[0].material.transparent = (cfg?.deckkraft ?? 1) < 1; } HSS.perf?.invalidate?.(2); } return; }
  key = k;
  if (grp) { S3.scene.remove(grp); grp.traverse(o => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.(); }); grp = null; }
  if (!k) return;
  const meinLauf = laeuft = Symbol('lauf');
  try {
    const B = await bild(cfg, geo); if (meinLauf !== laeuft) return;
    const tex = new THREE.CanvasTexture(B.cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: (cfg.deckkraft ?? 1) < 1, opacity: cfg.deckkraft ?? 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    mat.userData.noToon = true;
    const m = new THREE.Mesh(netz(B, geo, prj), mat); m.renderOrder = -1; m.receiveShadow = false; m.userData = { unterlage: true };
    grp = new THREE.Group(); grp.name = 'unterlage'; grp.add(m); S3.scene.add(grp);
    UL.attr = B.attr; HSS.perf?.invalidate?.(3); HSS.emit('unterlage', cfg);
  } catch (e) { console.warn(e); UI.toast('Unterlage nicht geladen: ' + e.message, 5000); key = ''; }
};
UL.setzen = (cfg, still) => {
  HSS.change('Unterlage', p => { p.settings.unterlage = Object.assign({ quelle: 'esri', radius: 400, deckkraft: 1, aktiv: true }, p.settings.unterlage || {}, cfg); }, { scope: 'none' });
  UL.aufbauen(true); if (!still) UI.toast('Unterlage wird geladen …', 2000);
};
UL.umschalten = () => { const c = UL.cfg(); if (!c) return UL.dialog(); UL.setzen({ aktiv: !c.aktiv }, true); };
UL.dialog = () => {
  const prj = HSS.project(), c = Object.assign({ quelle: HSS.osm?.alkisLand?.(prj.meta.geo || {}) ? 'nrw' : 'esri', radius: 400, deckkraft: 1 }, UL.cfg(prj) || {});
  if (!prj.meta.geo?.lat) return UI.toast('Bitte zuerst den Standort festlegen (Gelände & Wege → Standort bzw. OpenStreetMap laden)', 5000);
  UI.dialog(`<div class="dh"><h2>Luftbild / Karte als Unterlage</h2><button class="x" data-close>×</button></div>
    <p class="note">Legt ein Luftbild oder eine Karte unter das Modell – zum Prüfen und Nachzeichnen von Gebäuden, Wegen und Grenzen. Gespeichert wird nur die Einstellung; das Bild wird bei Bedarf neu geladen.</p>
    <div class="fg"><label class="f full"><span>Quelle</span><select id="uQ">${Object.entries(UL.QUELLEN).map(([k, q]) => `<option value="${k}" ${k === c.quelle ? 'selected' : ''}>${q.name}</option>`).join('')}</select></label>
    <label class="f full" id="uUw"><span>Adresse ({z}/{x}/{y} bzw. WMS-GetMap ohne BBOX)</span><input type="text" id="uU" value="${U.esc(c.url || '')}" placeholder="https://…"></label>
    <label class="f"><span>Radius [m]</span><input type="number" id="uR" min="50" max="1500" step="50" value="${c.radius}"></label><label class="f"><span>Deckkraft</span><input type="range" id="uD" min="0.2" max="1" step="0.05" value="${c.deckkraft}"></label></div>
    <p class="note">Tipp: Für die Prüfung „Umgebung“ in der Ansichtsleiste auf „aus“ stellen – dann liegen nur die Modellgebäude auf dem Luftbild. Amtliche Luftbilder gibt es als offenen WMS u. a. auch für Berlin, Hamburg, Brandenburg, Sachsen, Thüringen und Baden-Württemberg (eigenen WMS eintragen).</p>
    <div class="actions"><button id="uAus" class="danger">Unterlage entfernen</button><button data-close>Abbrechen</button><button class="primary" id="uGo">Übernehmen</button></div>`, d => {
    const upd = () => ($('#uUw', d).hidden = !['xyz', 'wms'].includes($('#uQ', d).value)); upd(); $('#uQ', d).onchange = upd;
    $('#uGo', d).onclick = () => { UL.setzen({ quelle: $('#uQ', d).value, url: ['xyz', 'wms'].includes($('#uQ', d).value) ? $('#uU', d).value.trim() : '', radius: +$('#uR', d).value || 400, deckkraft: +$('#uD', d).value, aktiv: true }); d.close(); };
    $('#uAus', d).onclick = () => { HSS.change('Unterlage entfernen', p => { delete p.settings.unterlage; }, { scope: 'none' }); UL.aufbauen(true); d.close(); };
  });
};
// Schalter in der Ansichtsleiste
const knopf = () => { const b = document.getElementById('vUL'); if (b) b.classList.toggle('on', !!UL.cfg()?.aktiv); };
const bind = () => { const b = document.getElementById('vUL'), c = document.getElementById('vULCfg'); if (b) b.onclick = () => { UL.umschalten(); setTimeout(knopf, 50); }; if (c) c.onclick = () => UL.dialog(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
HSS.on('unterlage', knopf); HSS.on('loaded', () => setTimeout(knopf, 500)); HSS.on('changed', e => { if (e.label === 'Unterlage' || e.label === 'Unterlage entfernen') knopf(); });
// nach Laden und Geländeänderungen neu aufbauen
HSS.on('loaded', () => setTimeout(() => UL.aufbauen(true), 400));
HSS.on('rebuilt', U.debounce(() => UL.aufbauen(false), 300));
})();
