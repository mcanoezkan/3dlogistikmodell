/* =====================================================================
   DECK: %%TITEL%%
   Kapitel: [Name, Index der ersten Folie]. resume:true öffnet beim nächsten Start die zuletzt gezeigte Folie.
   Jede Zeile SLIDES.push(...) ist eine Folie. Vorlagen: siehe references/szenen.md
   ===================================================================== */
const DECK={id:'%%ID%%',resume:false,chapters:[['Einführung',0],['Analyse',3],['Lösung',7],['Abschluss',10]]};

/* 01 */ SLIDES.push(SZ.titel({kicker:'Workshop · Kunde',title:'%%TITEL%%',em:'Akzentzeile',sub:'Untertitel der Präsentation',date:'Ort · TT.MM.JJJJ',
  orbits:[{k:'Teil I',t:'Analyse',go:3},{k:'Teil II',t:'Lösung',go:7},{k:'Teil III',t:'Abschluss',go:10}]}));
/* 02 */ SLIDES.push(SZ.agenda({items:[{t:'Einführung',d:'Kontext und Ziele',list:['Kennzahlen','Ausgangslage'],go:2},{t:'Analyse',d:'Ist-Stand und Pain Points',list:['Prozess','Dimensionen','Pyramide','Lösungen'],go:3},{t:'Lösung',d:'Zielbild und Weg',list:['Stufen','Roadmap','Takeaways'],go:7},{t:'Abschluss',d:'Diskussion',list:['Fragen'],go:10}]}));
/* 03 */ SLIDES.push(SZ.kennzahlen({lab:'Kennzahlen',t:'Kennzahlen <em>auf einen Blick</em>',s:'Beispiel für große Zahlen',kern:'UNITY',kpis:[['380+','Mitarbeitende'],['59 Mio. €','Umsatz 2025'],['27 + 16','DAX-40- und EURO-STOXX-50-Kunden']]}));
/* 04 */ SLIDES.push(SZ.kapitel({num:'I',kap:'02 · Analyse',t:'Analyse des <em>Ist-Stands</em>',s:'Leitfrage des Kapitels?',items:['Prozesse','Daten','Governance','Tools','Rollen'],focus:[0,2]}));
/* 05 */ SLIDES.push(SZ.prozess({lab:'Prozess',t:'Der Prozess <em>Ende zu Ende</em>',s:'Schritte anklicken',steps:[{t:'Planen',d:'Ziele und Zyklen festlegen'},{t:'Sammeln',d:'Inputs der Bereiche',pain:'Viele Quellen, viel Abstimmung'},{t:'Konsolidieren',d:'Zusammenführen'},{t:'Freigeben',d:'Validieren und freigeben',pain:'Manuelle Prüfschleifen'},{t:'Berichten',d:'Management Reporting'}]}));
/* 06 */ SLIDES.push(SZ.radial({lab:'Dimensionen',t:'Fünf <em>Dimensionen</em>',s:'Untertitel',kern:'Integriert',items:[{t:'Daten',d:'Beschreibung',chips:['Teil I']},{t:'Prozesse',d:'Beschreibung'},{t:'Governance',d:'Beschreibung'},{t:'Tools',d:'Beschreibung'},{t:'Rollen',d:'Beschreibung'}]}));
/* 07 */ SLIDES.push(SZ.loesungen({lab:'Lösungen',t:'Pain Points <em>lösen</em>',s:'Vom Problem zur Fähigkeit',frage:'Gibt es weitere Pain Points?',rows:[['Problem A','Detail A','Lösung A','Detail'],['Problem B','Detail B','Lösung B','Detail'],['Problem C','Detail C','Lösung C','Detail']]}));
/* 08 */ SLIDES.push(SZ.wandel({lab:'Ausgangslage',t:'Vom Status quo zum <em>Zielbild</em>',s:'Klicken wechselt',kern:'E2E',items:[['Heute 1','Morgen 1'],['Heute 2','Morgen 2'],['Heute 3','Morgen 3'],['Heute 4','Morgen 4'],['Heute 5','Morgen 5']],capHeute:{k:'Status quo',t:'Fragmentiert'},capZiel:{k:'Zielbild',t:'Integriert',list:['Leitlinie 1','Leitlinie 2']}}));
/* 09 */ SLIDES.push(SZ.pyramide({lab:'Pyramide',t:'Eine <em>Pyramide</em>',s:'Ebenen',levels:[{k:'Strategisch',t:'Strategie',d:'Frage?'},{k:'Taktisch',t:'Governance',d:'Frage?'},{k:'Operativ',t:'Umsetzung',d:'Frage?'}]}));
/* 10 */ SLIDES.push(SZ.stufen({lab:'Stufen',t:'Reife entsteht <em>Stufe für Stufe</em>',s:'Untertitel',steps:[{t:'Prozesse',d:'…'},{t:'Daten',d:'…'},{t:'Analytics',d:'…'},{t:'KI',d:'…'}]}));
/* 11 */ SLIDES.push(SZ.roadmap({lab:'Roadmap',t:'Eine <em>Roadmap</em>',s:'Phasen',phases:['Phase 1 · Analyse','Phase 2 · Zielbild','Phase 3 · Umsetzung'],lanes:[{w:'Strang A',it:[[0,33,1,'Analyse'],[33.6,66.4,2,'Konzept']]},{w:'Strang B',it:[[0,50,1,'Assessment'],[50.6,49.4,3,'Umsetzung']]}]}));
/* 12 */ SLIDES.push(SZ.dreiklang({lab:'Takeaways',t:'Von Erkenntnissen zu <em>Maßnahmen</em>',s:'Untertitel',cols:[['Key Takeaways',[['Erkenntnis 1','Folge'],['Erkenntnis 2','Folge']]],['Handlungsfelder',[['Feld 1','Inhalt'],['Feld 2','Inhalt']]],['Quick Wins',[['Quick Win 1','Nutzen'],['Quick Win 2','Nutzen']]]]}));
/* 13 */ SLIDES.push(SZ.abschluss({t:'Diskussion',s:'Nächste Schritte',fragen:['Frage 1?','Frage 2?','Frage 3?'],zeile:'%%TITEL%% · Datum'}));
