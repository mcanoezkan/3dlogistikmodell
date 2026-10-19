/* =====================================================================
   HSS · lizenz.js – Lizenzschlüssel prüfen (Desktop-Version)
   Ein Lizenzschlüssel enthält Kunde, Lizenznummer, Beginn, Ablauf (auf die
   Minute genau), Anzahl Nutzer und optional die freigeschalteten Geräte.
   Er ist mit dem privaten Schlüssel von UNITY signiert (ECDSA P-256); die
   Suite enthält nur den öffentlichen Schlüssel und kann Schlüssel prüfen,
   aber keine erzeugen. Erzeugt werden Schlüssel mit tools/lizenz-generator.html.
   Pflicht ist die Lizenz in der Desktop-Version (Exe) – in exportierten
   HTML-Ansichten nicht.
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, U = HSS.util;
const LZ = HSS.lizenz = { aktuell: null };
const OEFFENTLICH = { kty: 'EC', crv: 'P-256', x: 'Cu5Gbn4QB9hKHbwOy07M2lyrwzoLdzQZUgFWXwf35-o', y: 'wQUkjgKdzuX18r973mlhjw3H1ElkP9x0dQ4OD64E0eo' };
const KEY = 'hss-lizenz', ZEIT = 'hss-lz-t';
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ohne Speicher */ } } };

LZ.pflicht = () => !window.HSS_VIEWER && !!(window.HSS_DESKTOP || window.HSS_LIZENZ_PFLICHT || ls.get('hss-lizenz-test'));
// Geräte-ID: in der Desktop-Version aus dem Rechner abgeleitet, sonst je Browser
LZ.geraet = () => {
  if (window.HSS_DESKTOP?.geraet) return window.HSS_DESKTOP.geraet;
  let g = ls.get('hss-geraet');
  if (!g) { const a = new Uint8Array(8); crypto.getRandomValues(a); g = [...a].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase().match(/.{4}/g).join('-'); ls.set('hss-geraet', g); }
  return g;
};
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
let pubKey = null;
const pub = async () => pubKey || (pubKey = await crypto.subtle.importKey('jwk', Object.assign({ ext: true }, OEFFENTLICH), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']));

// Schlüssel prüfen → { ok, grund, d (Daten), rest (ms) }
LZ.pruefen = async (text) => {
  const t = String(text || '').replace(/\s+/g, '');
  const m = /^HSS1-([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/.exec(t);
  if (!m) return { ok: false, grund: 'Das ist kein gültiger Lizenzschlüssel (Format HSS1-…).' };
  let d;
  try {
    const okSig = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await pub(), b64u(m[2]), new TextEncoder().encode(m[1]));
    if (!okSig) return { ok: false, grund: 'Der Lizenzschlüssel ist nicht echt oder wurde verändert.' };
    d = JSON.parse(new TextDecoder().decode(b64u(m[1])));
  } catch (e) { return { ok: false, grund: 'Der Lizenzschlüssel ist beschädigt (' + e.message + ').' }; }
  const jetzt = Date.now(), zuletzt = +(ls.get(ZEIT) || 0);
  if (zuletzt && jetzt < zuletzt - 3600e3) return { ok: false, d, grund: 'Die Systemzeit liegt vor der zuletzt genutzten Zeit. Bitte Datum und Uhrzeit des Rechners prüfen.' };
  if (d.ab && jetzt < d.ab) return { ok: false, d, grund: `Die Lizenz gilt erst ab ${new Date(d.ab).toLocaleString('de-DE')}.` };
  if (d.bis && jetzt > d.bis) return { ok: false, d, abgelaufen: true, grund: `Die Lizenz ist am ${new Date(d.bis).toLocaleString('de-DE')} abgelaufen.` };
  if (Array.isArray(d.g) && d.g.length && !d.g.includes(LZ.geraet())) return { ok: false, d, grund: `Dieses Gerät (${LZ.geraet()}) ist für den Schlüssel nicht freigeschaltet. Bitte die Geräte-ID an UNITY senden.` };
  return { ok: true, d, rest: d.bis ? d.bis - jetzt : Infinity };
};
const restText = ms => {
  if (ms === Infinity) return 'unbefristet';
  const min = Math.floor(ms / 60e3), h = Math.floor(min / 60), t = Math.floor(h / 24);
  return t >= 1 ? `${t} ${t === 1 ? 'Tag' : 'Tage'}` : h >= 1 ? `${h} Std. ${min % 60} Min.` : min < 1 ? 'unter 1 Min.' : `${min} Min.`;
};
LZ.restText = restText;

/* ---------- Kopfzeile: Restlaufzeit ---------- */
function badge() {
  let b = document.getElementById('lzBadge');
  if (!LZ.aktuell) { if (b) b.hidden = true; return; }
  if (!b) { b = document.createElement('button'); b.id = 'lzBadge'; b.className = 'lzbadge'; b.onclick = () => LZ.info(); const s = document.getElementById('saveState'); s ? s.before(b) : document.getElementById('top')?.appendChild(b); }
  const rest = LZ.aktuell.d.bis ? LZ.aktuell.d.bis - Date.now() : Infinity;
  b.hidden = false; b.textContent = `Lizenz: noch ${restText(rest)}`;
  b.title = `${LZ.aktuell.d.kunde || ''} · ${LZ.aktuell.d.n || 1} Nutzer · gültig bis ${LZ.aktuell.d.bis ? new Date(LZ.aktuell.d.bis).toLocaleString('de-DE') : 'unbefristet'}`;
  b.classList.toggle('warn', rest < 14 * 864e5); b.classList.toggle('krit', rest < 3 * 864e5);
}

/* ---------- Sperre / Aktivierung ---------- */
// Während der Sperre keine anderen Dialoge (Startbildschirm o. Ä.) darüber legen; danach nachholen
let wartend = null;
function dialogeAnhalten(an) {
  const UI = HSS.ui; if (!UI) return;
  if (an) { if (!UI._dialogLz) { UI._dialogLz = UI.dialog; UI.dialog = (...a) => { wartend = a; }; } const d = document.getElementById('dlg'); if (d?.open) d.close(); }
  else if (UI._dialogLz) { UI.dialog = UI._dialogLz; delete UI._dialogLz; if (wartend) { const a = wartend; wartend = null; UI.dialog(...a); } }
}
function sperre(meldung) {
  dialogeAnhalten(true);
  let o = document.getElementById('lzLock');
  if (!o) { o = document.createElement('div'); o.id = 'lzLock'; document.body.appendChild(o); }
  o.hidden = false;
  o.innerHTML = `<div class="lzbox"><img src="${document.querySelector('#top img')?.src || ''}" alt="UNITY" class="lzlogo"><h2>Healthcare Simulation Suite – Lizenz</h2>
    <p>${meldung ? `<span class="lzerr">${U.esc(meldung)}</span>` : 'Bitte den Lizenzschlüssel eingeben, den Sie von UNITY erhalten haben.'}</p>
    <label>Lizenzschlüssel<textarea id="lzKey" rows="4" spellcheck="false" placeholder="HSS1-…"></textarea></label>
    <div class="lzrow"><span>Geräte-ID: <b id="lzDev">${U.esc(LZ.geraet())}</b></span><button id="lzCopy" title="Geräte-ID kopieren">kopieren</button></div>
    <div class="lzrow"><span id="lzMsg"></span><button class="primary" id="lzGo">Aktivieren</button></div>
    <p class="note">Ihre Projekte bleiben auf diesem Rechner gespeichert und sind nach der Aktivierung wieder verfügbar.</p></div>`;
  o.querySelector('#lzCopy').onclick = () => navigator.clipboard?.writeText(LZ.geraet());
  o.querySelector('#lzGo').onclick = async () => {
    const r = await LZ.pruefen(o.querySelector('#lzKey').value);
    if (!r.ok) { o.querySelector('#lzMsg').innerHTML = `<span class="lzerr">${U.esc(r.grund)}</span>`; return; }
    ls.set(KEY, o.querySelector('#lzKey').value.replace(/\s+/g, '')); LZ.aktuell = r; ls.set(ZEIT, String(Date.now()));
    o.hidden = true; dialogeAnhalten(false); badge(); HSS.ui?.toast(`Lizenz aktiviert: ${r.d.kunde || ''} · noch ${restText(r.rest)}`, 4000);
  };
}
LZ.start = async () => {
  if (!LZ.pflicht()) return true;
  const k = ls.get(KEY);
  const r = k ? await LZ.pruefen(k) : { ok: false, grund: '' };
  if (!r.ok) { sperre(r.grund); return false; }
  LZ.aktuell = r; ls.set(ZEIT, String(Math.max(Date.now(), +(ls.get(ZEIT) || 0)))); badge();
  if (r.rest < 14 * 864e5) setTimeout(() => HSS.ui?.toast(`Hinweis: Die Lizenz läuft in ${restText(r.rest)} ab.`, 6000), 1500);
  return true;
};
// laufend prüfen: Anzeige aktualisieren, bei Ablauf sperren
setInterval(async () => {
  if (!LZ.aktuell) return;
  ls.set(ZEIT, String(Math.max(Date.now(), +(ls.get(ZEIT) || 0))));
  if (LZ.aktuell.d.bis && Date.now() > LZ.aktuell.d.bis) { LZ.aktuell = null; badge(); sperre('Die Lizenz ist abgelaufen. Bitte einen neuen Lizenzschlüssel eingeben.'); return; }
  badge();
}, 30e3);
LZ.info = () => {
  const r = LZ.aktuell; if (!r) return;
  const d = r.d, UI = HSS.ui;
  UI.dialog(`<div class="dh"><h2>Lizenz</h2><button class="x" data-close>×</button></div>
    <table class="t"><tr><td>Kunde</td><td><b>${U.esc(d.kunde || '–')}</b></td></tr><tr><td>Lizenz-Nr.</td><td>${U.esc(d.id || '–')}</td></tr>
    <tr><td>Nutzer</td><td>${d.n || 1}</td></tr><tr><td>Gültig ab</td><td>${d.ab ? new Date(d.ab).toLocaleString('de-DE') : '–'}</td></tr>
    <tr><td>Gültig bis</td><td><b>${d.bis ? new Date(d.bis).toLocaleString('de-DE') : 'unbefristet'}</b> (noch ${restText(d.bis ? d.bis - Date.now() : Infinity)})</td></tr>
    <tr><td>Geräte-ID</td><td>${U.esc(LZ.geraet())}${Array.isArray(d.g) && d.g.length ? ` · freigeschaltet: ${d.g.length} Gerät(e)` : ''}</td></tr>${d.hinweis ? `<tr><td>Hinweis</td><td>${U.esc(d.hinweis)}</td></tr>` : ''}</table>
    <div class="actions"><button id="lzNeu">Anderen Schlüssel eingeben …</button><button class="primary" data-close>OK</button></div>`, dl => {
    dl.querySelector('#lzNeu').onclick = () => { dl.close(); sperre(''); const o = document.getElementById('lzLock'); const x = document.createElement('button'); x.textContent = 'Abbrechen'; x.onclick = () => { o.hidden = true; dialogeAnhalten(false); }; o.querySelector('#lzGo').before(x); };
  });
};
})();
