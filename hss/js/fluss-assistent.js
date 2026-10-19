/* =====================================================================
   HSS · fluss-assistent.js – Flüsse in zwei Schritten anlegen
   1. Weg: Start (Gebäude + Etage), beliebig viele Zwischenstopps, Ziel.
      Ohne genauen Raum wird auf der Etage ein Übergabepunkt angelegt
      (bzw. ein vorhandener wiederverwendet).
   2. Menge: Materialgruppe, Menge je Tag/Woche, Zeitfenster, Transportmittel.
   Je Etappe entsteht ein normaler Fluss (Etappe 1/n, 2/n …), der wie
   jeder andere Fluss bearbeitet, simuliert und dargestellt wird.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util, G = HSS.geo;
const FA = HSS.flussAssistent = {};
const LIB = 'log.uebergabepunkt', EXT = '__ext';
const opt = (v, t, s) => `<option value="${U.esc(v)}"${String(v) === String(s) ? ' selected' : ''}>${U.esc(t)}</option>`;
HSS.ROLLEN.uebergabe = HSS.ROLLEN.uebergabe || 'Übergabepunkt (Etage)';

/* ---------- Gebäude, Etagen, Orte ---------- */
const eigene = prj => prj.buildings.filter(b => !b.umgebung && b.parts.length).sort((a, b) => String(a.kurz || a.name).localeCompare(String(b.kurz || b.name), 'de', { numeric: true }));
const bName = b => (b.kurz && b.kurz !== b.name ? b.kurz + ' – ' : '') + b.name;
FA.etagen = (b, prj = HSS.project()) => [...new Set(b.parts.flatMap(pt => HSS.partFloors(pt).map(f => HSS.globalFloor(pt, f, prj))))].sort((a, c) => a - c);
const ortVon = (pl, prj) => { if (pl.building) return pl.building; if (!pl.part) return null; return HSS.findPart(pl.part, prj)?.building.id || null; };
FA.orte = (bid, gf, prj = HSS.project()) => {
  const pl = HSS.places(prj);
  if (bid === EXT) return pl.filter(p => p.kind === 'extern' || (p.kind === 'object' && !p.part));
  return pl.filter(p => ortVon(p, prj) === bid && p.gf === gf).sort((a, c) => (a.role === 'uebergabe' ? -1 : 0) - (c.role === 'uebergabe' ? -1 : 0) || a.name.localeCompare(c.name, 'de'));
};
// Bauteil der Etage: bevorzugt mit Aufzug, sonst das größte
const bauteil = (b, gf, prj) => {
  const cand = b.parts.filter(pt => HSS.localFloor(pt, gf, prj) !== null); if (!cand.length) return null;
  const lifts = prj.objects.filter(o => o.host && /aufzug/.test(o.lib) && cand.some(pt => pt.id === o.host.part));
  const withLift = cand.filter(pt => lifts.some(o => o.host.part === pt.id));
  const pool = withLift.length ? withLift : cand;
  const pt = pool.slice().sort((a, c) => HSS.partArea(c) - HSS.partArea(a))[0];
  return { pt, lift: lifts.find(o => o.host.part === pt.id) || null };
};
// Punkt in der Grundfläche (lokal), möglichst nah am Wunschpunkt
const innen = (pt, want) => {
  const L = HSS.partFootprintLocal(pt), inn = q => G.pointIn(q, L.outer) && !L.holes.some(h => G.pointIn(q, h));
  if (inn(want)) return want;
  const bb = G.bbox(L.outer); let best = null;
  for (let x = bb.x0 + 1; x < bb.x1; x += 1.5) for (let z = bb.z0 + 1; z < bb.z1; z += 1.5) {
    if (!inn([x, z])) continue; const d = Math.hypot(x - want[0], z - want[1]); if (!best || d < best.d) best = { q: [x, z], d };
  }
  return best ? best.q : [0, 0];
};
// Übergabepunkt anlegen (im Änderungs-Callback) oder vorhandenen wiederverwenden
const uebergabe = (p, bid, gf) => {
  const b = p.buildings.find(x => x.id === bid); if (!b) return null;
  const have = p.objects.find(o => o.lib === LIB && o.host && b.parts.some(pt => pt.id === o.host.part) && HSS.globalFloor(HSS.findPart(o.host.part, p).part, o.host.floor, p) === gf);
  if (have) return have.id;
  const T = bauteil(b, gf, p); if (!T) return null;
  const f = HSS.localFloor(T.pt, gf, p);
  let want = [0, 0];
  if (T.lift) want = [T.lift.x + 2.5, T.lift.z + 2.5];
  else { const L = HSS.partFootprintLocal(T.pt).outer; want = [U.sum(L.map(q => q[0])) / L.length, U.sum(L.map(q => q[1])) / L.length]; }
  const q = innen(T.pt, want);
  const o = { id: U.uid('obj'), lib: LIB, host: { part: T.pt.id, floor: f }, x: Math.round(q[0] * 10) / 10, z: Math.round(q[1] * 10) / 10, rot: 0, name: `Übergabepunkt ${b.kurz || b.name} ${HSS.floorName(gf)}`, role: 'uebergabe', place: true, assistent: true };
  p.objects.push(o);
  return o.id;
};

FA.uebergabe = uebergabe;
FA.eigene = eigene;

/* ---------- Höhenwechsel: Aufzüge und Treppenhäuser, die beide Etagen bedienen ---------- */
FA.vertikal = (gfA, gfB, bevorzugt = []) => {
  const prj = HSS.project(), out = [];
  for (const L of HSS.net().lifts) {
    if (String(L.id).startsWith('pv:') || !L.stops.includes(gfA) || !L.stops.includes(gfB)) continue;
    const P = L.obj?.host ? HSS.findPart(L.obj.host.part, prj) : null, b = P?.building;
    out.push({ id: L.id, typ: L.role, bid: b?.id || '', label: `${L.role === 'treppe' ? 'Treppenhaus' : 'Aufzug'} · ${L.name}${b ? ` (${b.kurz || b.name})` : ''}`, rang: bevorzugt.indexOf(b?.id) < 0 ? 9 : bevorzugt.indexOf(b?.id) });
  }
  return out.sort((a, c) => a.rang - c.rang || a.label.localeCompare(c.label, 'de', { numeric: true }));
};
const viaHtml = (gfA, gfB, bids, sel, grp = ['im Startgebäude', 'im Zielgebäude']) => {
  const L = FA.vertikal(gfA, gfB, bids), g = k => L.filter(x => x.rang === k);
  return opt('', 'automatisch (schnellster zulässiger Weg)', sel) + [0, 1, 9].map(k => g(k).length ? `<optgroup label="${k === 9 ? 'andere Gebäude' : grp[k]}">${g(k).map(x => opt(x.id, x.label, sel)).join('')}</optgroup>` : '').join('');
};
FA.viaOpts = (von, nach, sel) => {
  const pl = HSS.places(), A = pl.find(p => p.id === von), B = pl.find(p => p.id === nach);
  if (!A || !B || (A.gf ?? 0) === (B.gf ?? 0)) return opt('', A && B ? 'kein Höhenwechsel' : '–', '') + (sel ? opt(sel, sel, sel) : '');
  const bid = x => x.building || (x.part ? HSS.findPart(x.part)?.building.id : null);
  return viaHtml(A.gf ?? 0, B.gf ?? 0, [bid(A), bid(B)], sel);
};

/* ---------- Dialog ---------- */
FA.dialog = (vorgabe = {}) => {
  const UI = HSS.ui, $ = UI.$, prj = HSS.project(); HSS.ensureStammdaten(prj);
  const B = eigene(prj);
  if (!B.length) { UI.toast('Zuerst Gebäude anlegen – der Assistent verbindet Gebäude und Etagen.', 3500); return; }
  const neu = () => { const b = B[0]; const fl = FA.etagen(b); return { b: b.id, gf: fl.includes(0) ? 0 : fl[0], ort: '' }; };
  const S = { stops: vorgabe.stops || [neu(), neu()], schritt: vorgabe.pfad ? 2 : 1, pfad: vorgabe.pfad || null, strom: vorgabe.strom || '', material: vorgabe.material || prj.materials[0]?.id, menge: 10, periode: 'tag', fenster: '07:00–09:00, 13:00–15:00', transport: (prj.transports.find(t => t.id === 't_hand') || prj.transports[0])?.id, name: '' };
  const mat = () => U.byId(prj.materials, S.material);
  const label = s => {
    if (s.lbl) return s.lbl;
    if (s.b === EXT) { const p = HSS.places(prj).find(x => x.id === s.ort); return p ? p.name : 'Außen'; }
    const b = U.byId(prj.buildings, s.b); const pl = s.ort && HSS.places(prj).find(x => x.id === s.ort);
    return pl && pl.role !== 'uebergabe' ? pl.name : `${b?.kurz || b?.name || ''} ${HSS.floorName(s.gf)}`;
  };
  const autoName = () => `${mat()?.name || 'Fluss'}: ${label(S.stops[0])} → ${label(S.stops[S.stops.length - 1])}${S.stops.length > 2 ? ` (über ${S.stops.slice(1, -1).map(label).join(', ')})` : ''}`;
  const stopRow = (s, i) => {
    const n = S.stops.length, rol = i === 0 ? 'Start' : i === n - 1 ? 'Ziel' : 'Zwischenstopp ' + i;
    const b = U.byId(prj.buildings, s.b);
    const orte = FA.orte(s.b, s.gf, prj);
    const ortOpts = s.b === EXT ? (orte.length ? orte.map(p => opt(p.id, p.name, s.ort)).join('') : opt('', '– keine externen Orte (Flüsse › Orte) –', '')) : opt('', 'Übergabepunkt auf der Etage', s.ort) + orte.filter(p => p.role !== 'uebergabe').map(p => opt(p.id, p.name.split(' · ').slice(1).join(' · ') + (p.role && HSS.ROLLEN[p.role] ? ` [${HSS.ROLLEN[p.role]}]` : ''), s.ort)).join('');
    return `<div class="fa-stop ${i === 0 ? 'start' : i === n - 1 ? 'ziel' : 'zw'}" data-i="${i}">
      <div class="fa-dot">${i === 0 ? 'A' : i === n - 1 ? 'B' : i}</div>
      <div class="fa-f"><b>${rol}</b>
        <div class="fa-row"><select data-k="b" title="Gebäude">${B.map(x => opt(x.id, bName(x), s.b)).join('')}${opt(EXT, 'Außen / extern (Lieferant, Entsorger …)', s.b)}</select>
        ${s.b === EXT ? '' : `<select data-k="gf" title="Etage">${FA.etagen(b).map(g => opt(g, HSS.floorName(g), s.gf)).join('')}</select>`}</div>
        <select data-k="ort" title="Genauer Ort (optional)">${ortOpts}</select>
        ${i > 0 && S.stops[i - 1].b !== EXT && s.b !== EXT && S.stops[i - 1].gf !== s.gf ? `<label class="fa-via"><span>↕ Höhenwechsel ${HSS.floorName(S.stops[i - 1].gf)} → ${HSS.floorName(s.gf)} über</span><select data-k="via">${viaHtml(S.stops[i - 1].gf, s.gf, [S.stops[i - 1].b, s.b], s.via || '', S.stops[i - 1].b === s.b ? ['in diesem Gebäude', 'in diesem Gebäude'] : ['im Startgebäude', 'im Zielgebäude'])}</select></label>` : ''}
      </div>
      ${i > 0 && i < n - 1 ? `<button class="mini" data-x="${i}" title="Zwischenstopp entfernen">×</button>` : ''}</div>
      ${i < n - 1 ? `<div class="fa-add"><button class="mini" data-add="${i + 1}">+ Zwischenstopp</button></div>` : ''}`;
  };
  const render = d => {
    const body = $('#faBody', d), m = mat();
    $$('.fa-steps span', d).forEach((x, k) => x.classList.toggle('on', k + 1 === S.schritt));
    if (S.schritt === 1) {
      body.innerHTML = `<p class="note">Richtung festlegen: <b>aus welchem Gebäude und welcher Etage</b> zu welchem – bei Bedarf mit Zwischenstopps. Ohne genauen Raum legt der Assistent auf der Etage einen <b>Übergabepunkt</b> an (z. B. am Aufzug).</p>
        <div class="fa-route">${S.stops.map(stopRow).join('')}</div>`;
      $('#faBack', d).hidden = true; $('#faNext', d).textContent = 'Weiter: Menge →';
    } else {
      if (!S.name) S.name = autoName();
      body.innerHTML = `<div class="fa-sum">${S.stops.map((s, i) => `<span class="fa-chip ${i === 0 ? 'start' : i === S.stops.length - 1 ? 'ziel' : ''}">${U.esc(label(s))}</span>`).join('<span class="fa-arr">→</span>')}</div>
        <div class="fg">
          <label class="f full"><span>Materialgruppe / Strom</span><select id="faM">${prj.materials.map(x => opt(x.id, x.name + ' (' + x.reinheit + ')', S.material)).join('')}</select></label>
          <label class="f"><span>Menge</span><input type="number" id="faN" value="${S.menge}" min="0" step="1"></label>
          <label class="f"><span>Einheit / je</span><select id="faP">${opt('tag', (m?.einheit || 'Einheiten') + ' je Tag', S.periode)}${opt('woche', (m?.einheit || 'Einheiten') + ' je Woche', S.periode)}</select></label>
          <label class="f full"><span>Zeitfenster (z. B. 06:30–07:15, 11:15–12:00)</span><input type="text" id="faW" value="${U.esc(S.fenster)}"></label>
          <label class="f full"><span>Transportmittel</span><select id="faT">${prj.transports.map(x => opt(x.id, x.name, S.transport)).join('')}</select></label>
          <label class="f full"><span>Name</span><input type="text" id="faName" value="${U.esc(S.name)}"></label>
          <label class="f full"><span>Sektion</span><select id="faS">${opt('', 'automatisch (nach Material)', S.strom)}${HSS.sektionen.list(prj).map(x => opt(x.id, x.name, S.strom)).join('')}</select></label>
        </div>
        <p class="note">${S.pfad ? 'Der Fluss folgt dem gezeichneten Weg' : `${S.stops.length - 1} Etappe(n) werden`} als Flüsse mit gleicher Menge angelegt (${m ? `${U.fmt(S.menge / (m.proLadung || 1), 1)} Ladungen` : ''} je ${S.periode === 'woche' ? 'Woche' : 'Tag'}). Alles bleibt in der Flussliste änderbar.</p>`;
      $('#faM', body).onchange = e => { const old = autoName(); S.material = e.target.value; if (S.name === old || !S.name) S.name = autoName(); render(d); };
      $('#faN', body).oninput = e => (S.menge = +e.target.value || 0);
      $('#faP', body).onchange = e => (S.periode = e.target.value);
      $('#faW', body).oninput = e => (S.fenster = e.target.value);
      $('#faT', body).onchange = e => (S.transport = e.target.value);
      $('#faName', body).oninput = e => (S.name = e.target.value);
      $('#faS', body).onchange = e => (S.strom = e.target.value);
      $('#faBack', d).hidden = !!S.pfad; $('#faNext', d).textContent = '✓ Fluss anlegen';
      return;
    }
    $$('[data-k]', body).forEach(sel => sel.onchange = () => {
      const i = +sel.closest('.fa-stop').dataset.i, s = S.stops[i], k = sel.dataset.k;
      if (k === 'b') { s.b = sel.value; s.ort = ''; s.via = ''; if (s.b !== EXT) { const fl = FA.etagen(U.byId(prj.buildings, s.b)); if (!fl.includes(s.gf)) s.gf = fl.includes(0) ? 0 : fl[0]; } else s.ort = FA.orte(EXT, 0, prj)[0]?.id || ''; }
      else if (k === 'gf') { s.gf = +sel.value; s.ort = ''; s.via = ''; }
      else if (k === 'via') s.via = sel.value;
      else s.ort = sel.value;
      S.name = ''; render(d);
    });
    $$('[data-add]', body).forEach(b => b.onclick = () => { const i = +b.dataset.add; S.stops.splice(i, 0, Object.assign({}, S.stops[i - 1], { ort: '' })); S.name = ''; render(d); });
    $$('[data-x]', body).forEach(b => b.onclick = () => { S.stops.splice(+b.dataset.x, 1); S.name = ''; render(d); });
  };
  const $$ = (s, r) => [...r.querySelectorAll(s)];
  UI.dialog(`<div class="dh"><h2>Fluss-Assistent</h2><button class="x" data-close>×</button></div>
    <div class="fa-steps"><span>1 · Weg: Start → Zwischenstopps → Ziel</span><span>2 · Menge und Zeit</span></div>
    <div id="faBody"></div>
    <div class="actions"><button id="faBack" hidden>← Zurück</button><button class="primary" id="faNext"></button><button data-close>Abbrechen</button></div>`, d => {
    d.classList.add('fa-dlg');
    render(d);
    $('#faBack', d).onclick = () => { S.schritt = 1; render(d); };
    $('#faNext', d).onclick = () => {
      if (S.schritt === 1) {
        if (S.stops.some(s => s.b === EXT && !s.ort)) { UI.toast('Für „Außen / extern“ einen Ort wählen (oder unter Flüsse › Orte anlegen).', 3500); return; }
        for (let i = 1; i < S.stops.length; i++) { const a = S.stops[i - 1], b = S.stops[i]; if (a.b === b.b && a.gf === b.gf && a.ort === b.ort) { UI.toast(`Etappe ${i}: Start und Ziel sind gleich – bitte anderes Gebäude oder andere Etage wählen.`, 3500); return; } }
        S.schritt = 2; render(d); return;
      }
      const ids = FA.anlegen(S);
      d.close();
      FA.zeigen(ids);
    };
  });
};

/* ---------- Anlegen ---------- */
FA.anlegen = S => {
  const UI = HSS.ui, prj = HSS.project();
  const fenster = String(S.fenster || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/(\d{1,2})[:.]?(\d{2})?\s*[-–]\s*(\d{1,2})[:.]?(\d{2})?/); return m ? [+m[1] + (+(m[2] || 0)) / 60, +m[3] + (+(m[4] || 0)) / 60] : null; }).filter(Boolean);
  const kette = U.uid('kette'), ids = [];
  HSS.change('Fluss anlegen (Assistent)', p => {
    const pid = S.stops.map(s => s.b === EXT ? s.ort : (s.ort || uebergabe(p, s.b, s.gf)));
    const n = pid.length - 1;
    for (let i = 0; i < n; i++) {
      const f = { id: U.uid('flow'), name: n > 1 ? `${S.name} · Etappe ${i + 1}/${n}` : S.name, material: S.material, von: pid[i], nach: pid[i + 1], menge: S.menge, periode: S.periode, betriebstage: 7, fenster: fenster.length ? fenster : [[8, 12]], transport: S.transport, fahrzeitMin: null, aktiv: true, kette, etappe: i + 1, etappen: n, assistent: true };
      if (S.stops[i + 1].via) f.via = S.stops[i + 1].via;
      if (S.strom) f.strom = S.strom;
      if (S.pfad) { f.pfad = U.clone(S.pfad); f.gezeichnet = true; }
      p.flows.push(f); ids.push(f.id);
    }
  });
  UI.flowSel = ids[0]; UI.flowTab = 'fluesse';
  return ids;
};
// Ergebnis: Routen prüfen, im Modell zeigen
FA.zeigen = ids => {
  const UI = HSS.ui, prj = HSS.project();
  const res = ids.map(id => { const f = U.byId(prj.flows, id), m = U.byId(prj.materials, f.material), t = U.byId(prj.transports, f.transport); return { f, r: HSS.route(f.von, f.nach, t?.mittel, m?.reinheit) }; });
  if (UI.current !== 'fluesse') UI.setWS('fluesse'); else UI.renderPanel();
  HSS.s3.setFloor?.(null);
  UI.showRoutes ? UI.showRoutes(ids, true) : UI.showRoute(ids[0], true);
  HSS.emit('flows-changed', ids);
  const bad = res.filter(x => !x.r.ok);
  const len = U.sum(res.filter(x => x.r.ok).map(x => x.r.len));
  if (bad.length) UI.toast(`${ids.length} Fluss/Flüsse angelegt – ${bad.length} Etappe(n) ohne Route: Wege, Aufzüge und Freigaben (rein/unrein) prüfen.`, 6000);
  else UI.toast(`${ids.length} Fluss/Flüsse angelegt · Weg ${U.fmt(len)} m · ${U.sum(res.map(x => x.r.lifts.length))} Aufzugsfahrt(en)`, 4500);
  return res;
};
})();
