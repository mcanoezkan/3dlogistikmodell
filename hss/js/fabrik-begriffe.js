/* =====================================================================
   HSS · fabrik-begriffe.js – Fabric Planning Suite ohne Krankenhausbegriffe
   Die Suite teilt den Quellcode mit der Healthcare-Edition. In der Fabrik-Edition darf auf keiner
   Oberfläche ein Begriff aus dem Klinikumfeld erscheinen. Dieses Modul
     1. blendet klinikspezifische Bibliotheksobjekte aus und bereinigt Schlagworte,
     2. ersetzt Fachbereiche (Flächenplanung), zentrale Orte, Transportmittel und Quellen
        durch Begriffe der Fabrikplanung,
     3. ersetzt verbliebene Formulierungen in allen Texten der Oberfläche (auch in später
        aufgebauten Dialogen, Beschriftungen im 3D-Bild und Tooltips).
   ===================================================================== */
(function () {
'use strict';
const HSS = window.HSS, UI = HSS.ui;
if (HSS.EDITION !== 'fabrik') return;

/* ---------- 1 · Bibliothek ---------- */
const KLINIK = /krankenh|klinik|hospital|patient|pflege|arzt|ärzt|steril|zsva|aemp|\bop\b|op-|intensiv|notauf|notarzt|kreißsaal|apothek|wäsche|speise|bett|liegend|hubschrauber|ambulan|chirurg|radiolog|endoskop|patholog|prosektur|infusion|rollstuhl|therap|rettungs|tablett|unit-dose|kombidämpfer|medizin|kinderklinik|\bawt\b|rohrpost|\btrage\b|sauerstoff|muldenmangel|zentralküche|labor\b|dialyse|kardio|visite|besucher|angehörig|pädiatr|geburt|säugling|inkubator|\bmrt\b|\bct\b|röntgen|sektion|aufbahrung|kühlzelle.*verstorb|wartebereich/i;
const L = HSS.library;
const versteckt = d => KLINIK.test(d.name) || KLINIK.test(d.category);
for (const d of L.all()) if (d.tags) d.tags = d.tags.filter(t => !KLINIK.test(t));
const all0 = L.all.bind(L), cat0 = L.categories.bind(L), search0 = L.search.bind(L);
L.alleInklusive = all0; // für Export/Projektdateien unverändert verfügbar
L.search = (q, cur) => search0(q, cur).filter(d => !versteckt(d));
L.categories = () => cat0().map(([c, n]) => [c, all0().filter(d => !versteckt(d) && (d.category === c || d.category.startsWith(c + '/'))).length]).filter(([, n]) => n > 0);
// Panel „Alle (n)“ zählt über L.all(): nur sichtbare Objekte zählen
L.all = () => all0().filter(d => !versteckt(d) || d._source !== 'standard');
// Schalter „alle Pakete (auch Klinik)“ entfällt in der Fabrik-Edition
if (UI.ws.bibliothek) { const r0 = UI.ws.bibliothek.render.bind(UI.ws.bibliothek); UI.ws.bibliothek.render = el => { UI.libAlle = false; r0(el); el.querySelectorAll('.cat button').forEach(b => { if (/alle Pakete|nur Fabrik/.test(b.textContent)) b.remove(); }); }; }

/* ---------- 2 · Stammdaten der Fabrikplanung ---------- */
// Zentrale Orte (Rollen)
for (const k of ['apotheke', 'kueche', 'zsva', 'waescherei', 'labor', 'op', 'radiologie', 'bettenzentrale', 'zna', 'awt-station']) delete HSS.ROLLEN[k];
Object.assign(HSS.ROLLEN, { zentrallager: 'Zentrallager', rampe: 'Wareneingang / Rampe', haupteingang: 'Werkseingang / Pforte', verwaltung: 'Verwaltung / Poststelle', abfall: 'Wertstoff- und Abfallsammelstelle', waschanlage: 'Behälterwaschanlage', extern: 'Extern (Lieferant/Kunde/Entsorger)' });
// Transportmittel
if (HSS.MITTEL.bett) Object.assign(HSS.MITTEL.bett, { name: 'Schwerlastwagen (handgeführt)', modell: 'fab.hubwagen.elektro' });
if (HSS.MITTEL.awt) Object.assign(HSS.MITTEL.awt, { name: 'FTS / Behälterfördertechnik', modell: 'fab.fts' });
if (HSS.MITTEL.hand) HSS.MITTEL.hand.name = 'Handgeführter Wagen / Hubwagen';
if (HSS.WEGARTEN?.weg) Object.assign(HSS.WEGARTEN.weg, { name: 'Werksweg', info: 'Werksinterne Wege für Personal, Stapler, Routenzüge und Wagen' });
if (HSS.WEGARTEN?.grenze) HSS.WEGARTEN.grenze.info = 'Grenze des Werksgeländes (wird nicht geroutet)';
if (HSS.WEGARTEN?.awt) HSS.WEGARTEN.awt.name = 'FTS-/Förderstrecke';
if (HSS.WEGARTEN?.tunnel) HSS.WEGARTEN.tunnel.name = 'Medien-/Versorgungstunnel';
if (HSS.WEGARTEN?.zufahrt) HSS.WEGARTEN.zufahrt.info = 'LKW-Anlieferung, Feuerwehrzufahrt';
// Fachbereiche der Flächenplanung
if (HSS.ZONEN_FACH) {
  const F = [
    ['montage', 'Montage', '#144477', 'NUF3', 'Produktion'], ['vormontage', 'Vormontage / Baugruppen', '#2D7694', 'NUF3', 'Produktion'],
    ['mechfert', 'Mechanische Fertigung', '#3a7ca5', 'NUF3', 'Produktion'], ['schweissen', 'Schweißen / Blechbearbeitung', '#5b7bb4', 'NUF3', 'Produktion'],
    ['lackierung', 'Lackiererei / Oberfläche', '#d9531e', 'NUF3', 'Produktion'], ['waerme', 'Wärmebehandlung / Härterei', '#c0392b', 'NUF3', 'Produktion'],
    ['pruef', 'Prüffeld / Prüfstände', '#891F5E', 'NUF3', 'Produktion'], ['nacharbeit', 'Nacharbeit / Instandsetzung', '#8e7dbe', 'NUF3', 'Produktion'],
    ['we', 'Wareneingang', '#f2994a', 'NUF4', 'Logistik'], ['lager', 'Lager (Paletten, Behälter)', '#0A967A', 'NUF4', 'Logistik'],
    ['hrl', 'Hochregallager / AKL', '#16a085', 'NUF4', 'Logistik'], ['supermarkt', 'Supermarkt / Kommissionierung', '#48c9b0', 'NUF4', 'Logistik'],
    ['versand', 'Versand / Warenausgang', '#e59866', 'NUF4', 'Logistik'], ['leergut', 'Leergut / Behältermanagement', '#b0a18f', 'NUF4', 'Logistik'],
    ['qs', 'Qualitätssicherung / Messraum', '#e3ac0c', 'NUF3', 'Unterstützung'], ['instand', 'Instandhaltung / Werkstatt', '#7b7d7d', 'NUF3', 'Unterstützung'],
    ['werkzeug', 'Werkzeugausgabe / Voreinstellung', '#a569bd', 'NUF3', 'Unterstützung'], ['gefahr', 'Gefahrstoff- / Betriebsstofflager', '#d4a017', 'NUF4', 'Unterstützung'],
    ['wertstoff', 'Wertstoffhof / Späne', '#8d6e63', 'NUF4', 'Unterstützung'], ['energie', 'Energiezentrale / Technik', '#59636e', 'TF', 'Unterstützung'],
    ['verwaltung', 'Verwaltung / Büro', '#6b2c82', 'NUF2', 'Verwaltung & Soziales'], ['av', 'Arbeitsvorbereitung / Planung', '#bb8fce', 'NUF2', 'Verwaltung & Soziales'],
    ['ausbildung', 'Ausbildung / Schulung', '#c39bd3', 'NUF5', 'Verwaltung & Soziales'], ['sozial', 'Sozialräume / Umkleiden', '#d7bde2', 'NUF7', 'Verwaltung & Soziales'],
    ['kantine', 'Kantine', '#f8c471', 'NUF1', 'Verwaltung & Soziales'], ['pforte', 'Pforte / Werkseingang', '#f39c12', 'NUF1', 'Verwaltung & Soziales']
  ].map(([id, name, color, din, gruppe]) => ({ id, name, color, din, gruppe }));
  HSS.ZONEN_FACH.splice(0, HSS.ZONEN_FACH.length, ...F);
  HSS.ZONEN_GRUPPEN.splice(0, HSS.ZONEN_GRUPPEN.length, ...new Set(F.map(f => f.gruppe)));
  UI.zInp = UI.zInp || { fach: 'montage', name: '', soll: 2500, part: null, f: 0, spread: true };
}
// Quellen: nur Grundlagen der Fabrikplanung anbieten
for (const [k, q] of Object.entries(HSS.QUELLEN || {})) {
  if (k === 'annahme') continue;
  if (k === 'din') { Object.assign(q, { titel: 'DIN 277-1 (Grundflächen und Rauminhalte im Hochbau)', erklaerung: 'Definiert die Flächenarten: Brutto-Grundfläche (BGF), Netto-Raumfläche, Nutzungsfläche (NUF 1–7), Technikfläche (TF) und Verkehrsfläche (VF). Grundlage der Flächenbilanz je Halle und Geschoss.' }); continue; }
  if (KLINIK.test(q.titel + ' ' + (q.erklaerung || '')) || /destatis|hill-burton|landeskrankenhaus|divi|dguv information 207|krinko|argebau|verweildauer|bettennutz/i.test(q.titel + ' ' + (q.erklaerung || ''))) delete HSS.QUELLEN[k];
}
Object.assign(HSS.QUELLEN, {
  asr13: { titel: 'ASR A1.3 Sicherheits- und Gesundheitsschutzkennzeichnung', art: 'Technische Regel für Arbeitsstätten', erklaerung: 'Kennzeichnung von Fahrwegen (gelbe Begrenzungslinien, mind. 5 cm), Rettungswegen (grün) und Gefahrstellen (gelb-schwarz). Grundlage der Bodenmarkierung im Hallenausbau.' },
  vdi2510: { titel: 'VDI 2510 Fahrerlose Transportsysteme (FTS)', art: 'VDI-Richtlinie', erklaerung: 'Planung, Leitlinien, Sicherheitsabstände und Haltepunkte fahrerloser Transportsysteme.' },
  vdi3576: { titel: 'VDI 3576 / DIN EN 15095: Krane und Hängebahnen in Produktionshallen', art: 'Richtlinie / Norm', erklaerung: 'Kranbahnen, Elektrohängebahnen und ihre Einbindung in das Hallentragwerk.' }
});

/* ---------- 3 · Texte der Oberfläche ---------- */
const ERSETZEN = [
  [/UNITY Hospital/g, 'UNITY Werk'], [/mit Bestandsdaten oder Landesvorgaben abgleichen/g, 'mit Bestandsdaten und Herstellerangaben abgleichen'],
  [/Leeres Gelände – Gebäude, Wege und Stationen selbst planen/g, 'Leeres Gelände – Hallen, Wege und Bereiche selbst planen'],
  [/\(Speisen, Wäsche, Sterilgut …\)/g, '(Rohteile, Kaufteile, Baugruppen, Fertigteile …)'],
  [/Eine oder mehrere Stationen (auswählen|wählen)/g, 'Einen oder mehrere Bereiche $1'],
  [/den ganzen Campus/g, 'das ganze Werk'], [/ganzen Campus/g, 'ganzen Werks'],
  [/Campuswege?/g, m => m.endsWith('e') ? 'Werkswege' : 'Werksweg'], [/Campus/g, 'Werk'],
  [/Innere Wege für Personal, Betten- und Wagentransporte/g, 'Werksinterne Wege für Personal, Stapler, Routenzüge und Wagen'],
  [/Klinikgeländes/g, 'Werksgeländes'], [/Klinikgelände/g, 'Werksgelände'], [/Klinikums?/g, 'Werk'], [/Klinik/g, 'Werk'],
  [/Krankenhaus(es)?/g, 'Werk'], [/Krankenhäuser/g, 'Werke'],
  [/Objekt „AWT-Containerwaschanlage“ oder „Bettenwaschanlage“/g, 'Objekt „Industrie-Teilewaschanlage“ oder eine Behälterwaschanlage'],
  [/Beispiel AWT: Nach Wäsche- oder Abfallfahrt \(unrein\) fährt der Behälter für 2 min in die Waschanlage; zusätzlich jede 5\. Fahrt\./g, 'Beispiel FTS: Nach einer Späne- oder Abfallfahrt fährt der Behälter für 2 min in die Waschanlage; zusätzlich jede 5. Fahrt.'],
  [/AWT-Trasse/g, 'FTS-/Förderstrecke'], [/AWT-Station/g, 'FTS-Übergabestation'], [/AWT-Behälter/g, 'FTS-Behälter'], [/\bAWT\b/g, 'FTS'],
  [/Bettenbedarf nach Hill-Burton: Fälle × Verweildauer ÷ \(365 × Auslastung\)/g, 'Takt = verfügbare Zeit × Verfügbarkeit ÷ Stückzahl; Maschinen = Stückzahl × Bearbeitungszeit ÷ (verfügbare Zeit × OEE)'],
  [/Bettentransporte?/g, 'Schwerlasttransport'], [/Bettenaufzug/g, 'Lastenaufzug'], [/Bettenzentrale/g, 'Behälterzentrale'], [/Betten- und /g, ''],
  [/Liegendanfahrt/g, 'Anlieferung'], [/Liegendtransport/g, 'Schwerlasttransport'],
  [/Stationsplaner/g, 'Produktionsplaner'], [/Patienten(zimmer)?/g, 'Mitarbeiter'], [/Patient(in)?/g, 'Mitarbeiter'],
  [/Speisen(versorgung)?/g, 'Kantinenversorgung'], [/Sterilgut(versorgung)?/g, 'Prüfmuster'], [/Wäsche(versorgung)?/g, 'Arbeitskleidung'],
  [/Zentrale Notaufnahme|Notaufnahme/g, 'Werkseingang'], [/Rettungshubschrauber|Hubschrauberlandeplatz/g, 'Sonderfläche'], [/Hubschrauber/g, 'Sonderfläche'],
  [/Pflegestation|Pflegebereich/g, 'Produktionsbereich'], [/Fachabteilungen?/g, 'Fertigungsbereiche'], [/Versorgungsstufe/g, 'Werksgröße']
];
const ersetze = s => { let t = s; for (const [re, r] of ERSETZEN) if (re.test(t)) { re.lastIndex = 0; t = t.replace(re, r); } return t; };
HSS.fabrikText = ersetze;
const ATTR = ['title', 'placeholder', 'aria-label', 'data-tip', 'label'];
const fix = root => {
  if (!root) return;
  if (root.nodeType === 3) { const t = root.nodeValue; if (t && t.trim()) { const n = ersetze(t); if (n !== t) root.nodeValue = n; } return; }
  if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
  for (const a of ATTR) { const v = root.getAttribute?.(a); if (v) { const n = ersetze(v); if (n !== v) root.setAttribute(a, n); } }
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n; while ((n = w.nextNode())) { if (n.nodeType === 3) { const t = n.nodeValue; if (t && t.trim()) { const r = ersetze(t); if (r !== t) n.nodeValue = r; } } else for (const a of ATTR) { const v = n.getAttribute(a); if (v) { const r = ersetze(v); if (r !== v) n.setAttribute(a, r); } } }
};
let busy = false;
const mo = new MutationObserver(list => { if (busy) return; busy = true; try { for (const m of list) { if (m.type === 'characterData') fix(m.target); else if (m.type === 'attributes') fix(m.target); else m.addedNodes.forEach(fix); } } finally { busy = false; } });
const start = () => { fix(document.body); document.title = ersetze(document.title); mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR }); };
if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
// Toasts und Bestätigungen laufen über dieselben DOM-Knoten; UI.toast zusätzlich direkt
if (UI.toast) { const t0 = UI.toast; UI.toast = (msg, ...a) => t0(typeof msg === 'string' ? ersetze(msg) : msg, ...a); }
})();
