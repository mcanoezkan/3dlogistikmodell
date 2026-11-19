/* ===== Startstand (Erstaufschlag), Geometrie, Zeitrechnung, BPMN – aus Version 0.3 übernommen ===== */
/* ===================== SEED: Startstand (Erstaufschlag) ===================== */
function buildSeed(){
  const Z=(key,name,type,x,y,w,h,extra)=>Object.assign({id:'z_'+key+'_'+Math.random().toString(36).slice(2,6),key,name,type,x,y,w,h},extra||{});
  const zones=[];
  // Hallenkontur + Verkehrsflächen
  zones.push(Z('LZ','Logistikzone / Rampe (H8-41)','verkehr',0,6.2,8.1,41.7));
  zones.push(Z('VW','Hauptverkehrsweg (Leitplanke)','verkehr',8.1,24.3,160,4.5));
  // Docks
  const dockFunc=['Wäscherei','Zentrallager','Zentrallager','Zentrallager','Flex','Apotheke','Apotheke'];
  for(let i=0;i<7;i++) zones.push(Z('D'+(i+1),'Dock '+(i+1),'dock',0.3,6.5+i*5.96,2.6,5.4,{func:dockFunc[i]}));
  // Wäscherei + WE
  zones.push(Z('WR','Transportfläche Wäscherei rein (H8-175)','waesche',8.1,0,14,9.8,{ax:15,ay:9.8}));
  zones.push(Z('WU','Transportfläche Wäscherei unrein (H8-176)','waesche',22.1,0,13.6,9.8,{ax:29,ay:9.8}));
  zones.push(Z('ACH','Transportachse Wäscherei (H8-174)','verkehr',8.1,10,27.6,3.2));
  zones.push(Z('TM','Fläche Transportmittel','sonst',8.1,13.2,2.1,10.8));
  zones.push(Z('WEZ','WE-Zwischenlager Lagerartikel (H8-?)','we',10.2,13.2,15.5,10.8,{ax:10.2,ay:18.6}));
  zones.push(Z('DLZ','Zwischenlager Durchläufer','we',25.7,14.5,10,9.5));
  zones.push(Z('DLR','Durchläuferregal (10 Felder)','puffer',25.7,13.3,10.1,1.3,{ax:30.7,ay:14.6}));
  // Lager
  zones.push(Z('PAL','Zentrallager Palette (H8-179)','lager',35.7,0,92,24.3,{ax:40,ay:24.3,aisles:4,gLen:80}));
  const rackRows=[[1.2,1.4],[4.7,2.5],[10.4,2.6],[16.2,2.5],[21.7,2.3]];
  rackRows.forEach((r,i)=>{zones.push(Z('','Palettenregal Reihe '+(i+1)+'a','rack',39.2,r[0],54.6,r[1]));zones.push(Z('','Palettenregal Reihe '+(i+1)+'b','rack',101.6,r[0],27.2,r[1]));});
  zones.push(Z('TH1','Schleuse / Treppenhaus (H8-28)','office',96.7,0.5,3.7,11.5));
  zones.push(Z('FBP','Puffer Fachboden (Vorschlag)','puffer',128,13.5,5.4,10,{ax:130.7,ay:23.5}));
  zones.push(Z('FB','Fachbodenregallager (H8-181 / H7-183)','lager',133.6,0,34.1,24,{ax:135,ay:24,aisles:12,gLen:16}));
  [3.3,6.0,8.5,11.1,13.7,16.3,19.0,21.5].forEach((y,i)=>zones.push(Z('','Fachboden Reihe '+(i+1),'rack',137,y,19,1.1)));
  [2.4,5.0,7.6,10.2,12.8,15.4,18.0,20.6].forEach((y,i)=>zones.push(Z('','Fachboden II Reihe '+(i+1),'rack',159,y,8.5,1.1)));
  // Leiste unterhalb Verkehrsweg
  zones.push(Z('BS','Warenbereitstellung / Transportbereitstellung','wa',8.1,28.8,18.1,7.8));
  for(let i=0;i<5;i++) zones.push(Z('B'+(i+1),'Bahn '+(i+1),'lane',8.6,29.3+i*1.45,16.8,1.05,{func:'Zentrallager'}));
  zones.push(Z('KONS','Kommissionierfläche / Konsolidierung','kons',26.2,28.8,17.8,7.8));
  zones.push(Z('LW','Fläche für Leerwagen (H8-187)','sonst',44,28.8,12.2,7.8));
  zones.push(Z('FM','Abstellfläche Fördermittel','sonst',58.3,28.8,3.8,7.8));
  zones.push(Z('WT','Fläche für Wassertransporte','sonst',62.1,28.8,14.8,7.8));
  zones.push(Z('BUE','Büros / Aufenthalt','office',76.9,28.8,19.3,7.8));
  zones.push(Z('BB','Bodenblocklagerung (H8-174)','lager',96.2,28.8,12.7,7.8));
  zones.push(Z('APZ','Zwischenlager Apotheke (H7-164)','apo',8.1,36.6,6.4,11.3,{ax:8.1,ay:42}));
  zones.push(Z('AZ1','Zwischenlager Apothekenware / Transportwagen I (Halle 7)','apo',122.3,29.4,10.2,7.4));
  zones.push(Z('AZ2','Zwischenlager Apothekenware / Transportwagen II (Halle 7)','apo',132.5,29.4,10.8,7.4));
  zones.push(Z('GEF','Gefahrstofflager (Halle 7)','sonst',143.3,29.4,24.4,7.4));
  zones.push(Z('AP7','Apotheke Halle 7 – Warenannahme','apo',120.9,37.4,18.7,4.2));
  zones.push(Z('DEZ','Büro / Versand Dez 03','office',168,0,15,36));

  const B=(id,name,cat,src,tmu,unit)=>({id,name,cat,src,tmu,unit});
  const bausteine=[
    B('GEH','Gehen ohne Last','Weg','MTM-UAS-Richtwert (Körperbewegung Gehen)',25,'je m'),
    B('GKW','Gehen mit Kommissionierwagen','Weg','Planzeit, an MTM-Logistik angelehnt',30,'je m'),
    B('GRW','Beladenen Roll-/Transportwagen schieben','Weg','Planzeit',34,'je m'),
    B('EHW','Fahren mit Elektro-Hubwagen (Mitgänger)','Weg','Planzeit (ca. 1,3 m/s inkl. Anfahren)',22,'je m'),
    B('SCH','Fahren mit Schlepper / Routenzug','Weg','Planzeit (ca. 2,3 m/s)',12,'je m'),
    B('AA2','Aufnehmen und Platzieren ≤ 1 kg, 20–50 cm','Greifen/Handhaben','MTM-UAS-Richtwert',35,'je Vorgang'),
    B('AH2','Aufnehmen und Platzieren 1–8 kg, 20–50 cm','Greifen/Handhaben','MTM-UAS-Richtwert',55,'je Vorgang'),
    B('AK2','Aufnehmen und Platzieren 8–22 kg','Greifen/Handhaben','MTM-UAS-Richtwert',100,'je Vorgang'),
    B('KB','Bücken und Aufrichten','Greifen/Handhaben','MTM-UAS-Richtwert',60,'je Vorgang'),
    B('VA','Sichtkontrolle','Prüfen/Lesen','MTM-UAS-Richtwert',15,'je Vorgang'),
    B('LES','Meldung am Scanner lesen und quittieren','Prüfen/Lesen','Planzeit',33,'je Vorgang'),
    B('ZAE','Packung zählen','Prüfen/Lesen','Planzeit',28,'je Vorgang'),
    B('DOK','Lieferpapiere prüfen und quittieren','Prüfen/Lesen','Planzeit (60 s)',1667,'je Vorgang'),
    B('SCN','Barcode scannen inkl. Ausrichten','Scannen/Eingabe','Planzeit (2,0 s)',56,'je Vorgang'),
    B('TIP','Auswahl am Scanner (Liste, Taste)','Scannen/Eingabe','Planzeit (1,5 s)',42,'je Vorgang'),
    B('ZIF','Zeichen am Scanner eingeben','Scannen/Eingabe','Planzeit (0,4 s)',11,'je Zeichen'),
    B('HOE','Palettenhöhe erfassen','Scannen/Eingabe','Planzeit (3 s)',83,'je Vorgang'),
    B('FOTO','Lieferschein fotografieren (DMS)','Scannen/Eingabe','Planzeit (5 s)',139,'je Vorgang'),
    B('DRU','Etikett drucken und anbringen','Rüsten/Sonstiges','Planzeit (8 s)',222,'je Vorgang'),
    B('TOR','Tor öffnen/schließen, Überladebrücke','Rüsten/Sonstiges','Planzeit (40 s)',1111,'je Vorgang'),
    B('ENTL','Palette aus LKW aufnehmen (EHW)','Greifen/Handhaben','Planzeit (30 s)',833,'je Palette'),
    B('PALA','Palette aufnehmen/absetzen (EHW)','Greifen/Handhaben','Planzeit (15 s)',417,'je Vorgang'),
    B('FOL','Folie/Umreifung entfernen','Rüsten/Sonstiges','Planzeit (30 s)',833,'je Palette'),
    B('WAG','Wagen an-/abkoppeln, positionieren','Rüsten/Sonstiges','Planzeit (8 s)',222,'je Wagen'),
    B('LEER','Leerwagen aufnehmen/bereitstellen','Rüsten/Sonstiges','Planzeit (10 s)',278,'je Wagen'),
    B('LSI','Ladungssicherung je Wagen','Rüsten/Sonstiges','Planzeit (20 s)',556,'je Wagen'),
    B('KLAER','Klärfall bearbeiten','Rüsten/Sonstiges','Planzeit (100 s)',2778,'je Fall'),
    B('SYS','Antwortzeit SHS','System','Annahme (1 s)',28,'je Buchung')
  ];

  const st=(id,lane,type,name,next,el,extra)=>Object.assign({id:String(id),lane,type,name,next:next||'',el:el||[]},extra||{});
  const P=(k,label,v,unit)=>({k,label,v,unit:unit||''});
  const F=(from,to,label,mittel,route,viaY)=>({id:'f'+Math.random().toString(36).slice(2,7),from,to,label,mittel,route:route||'aisle',viaY:viaY==null?'':viaY});
  const V=(id,name,desc,lanes,params,steps,flows)=>({id,name,desc,lanes,params,steps,flows});
  const clone=o=>JSON.parse(JSON.stringify(o));
  // Hilfsfunktion: Schritte abwandeln
  function variantOf(base,id,name,desc,patch){
    const v=clone(base);v.id=id;v.name=name;v.desc=desc;
    if(patch.params) patch.params.forEach(p=>{const e=v.params.find(x=>x.k===p.k);if(e)Object.assign(e,p);else v.params.push(p);});
    if(patch.steps) Object.entries(patch.steps).forEach(([sid,ch])=>{const s=v.steps.find(x=>x.id===sid);if(s)Object.assign(s,ch);});
    if(patch.remove) v.steps=v.steps.filter(s=>!patch.remove.includes(s.id));
    if(patch.insert) patch.insert.forEach(([after,step])=>{const i=v.steps.findIndex(s=>s.id===after);v.steps.splice(i+1,0,step);});
    if(patch.flows) v.flows=patch.flows;
    return v;
  }
  const SY='System SHS';

  /* ---------- 1 Wareneingang (je Anlieferung) ---------- */
  const L='Lager (WE)', LF='Lieferant';
  const weParams=[P('pos','Positionen je Anlieferung',8),P('bestell','Bestellungen je Anlieferung',1.2),P('kolli','Packungen je Position',6),
    P('pal','Paletten je Anlieferung',2),P('pPal','Anteil Palettenware (Positionen)',0.15,'0–1'),P('pCh','Anteil chargenpflichtig',0.5,'0–1'),
    P('pBC','Charge im Barcode (GS1)',0.6,'0–1'),P('pDL','Anteil Positionen Durchläufer',0.1,'0–1'),P('ewagen','Einlagerwagen je Anlieferung',1.5)];
  const weFlows=[F('D2','WEZ','Paletten entladen','Elektro-Hubwagen','direct'),F('WEZ','DLR','Durchläufer ins Durchläuferregal','Rollwagen','direct')];
  const weV1=V('we1','Soll A: SHS-Standard, Scan je Packung','Sollprozess nach Prozessheft SHS 1.0 (Kapitel 3), ergänzt um die physischen Schritte Entladen, Papiere und Einlagerwagen. Jede Packung wird gescannt, SHS zählt die Menge hoch.',
    [LF,L,SY],weParams,[
    st(1,LF,'start','Lieferung trifft an WE-Dock ein'),
    st(2,L,'manual','Tor öffnen, Überladebrücke anlegen','',[['TOR','1']]),
    st(3,L,'manual','Paletten entladen und zur WE-Zwischenlagerfläche fahren','',[['ENTL','pal'],['EHW',"pal*2*dd('D2','WEZ')"],['PALA','pal']]),
    st(4,L,'manual','Lieferschein prüfen, Packstücke sichten, quittieren','',[['DOK','1'],['VA','pal*4']]),
    st(5,L,'manual','Folie/Umreifung entfernen','',[['FOL','pal']]),
    st(6,L,'user','Bestellung(en) am Scanner wählen','',[['TIP','bestell'],['SYS','bestell']]),
    st(7,L,'user','Kopfdaten: LFS-Nr. scannen, Datum prüfen','',[['SCN','1'],['TIP','1']]),
    st(8,L,'user','Artikel scannen (je Packung), auf Einlagerwagen legen','',[['SCN','pos*kolli'],['AH2','pos*kolli']]),
    st(9,SY,'xor','Artikel auf Bestellung?','11:Ja;10:Nein',[['SYS','pos*kolli']]),
    st(10,SY,'service','Meldung „Artikel nicht auf Bestellung“','8',[['LES','pos*kolli*0.01']]),
    st(11,SY,'xor','Palettenware?','12:Ja;13:Nein'),
    st(12,L,'user','Palettenhöhe erfassen','13',[['HOE','pos*pPal']]),
    st(13,SY,'xor','Chargenpflichtig und Charge nicht im Barcode?','14:Ja;15:Nein'),
    st(14,L,'user','Charge eingeben oder Chargenbarcode scannen','15',[['SCN','pos*kolli*pCh*(1-pBC)']]),
    st(15,SY,'service','Restlaufzeit (180 T.) prüfen, Menge zählen, Überbuchung prüfen','',[['LES','pos*0.05']]),
    st(16,L,'xor','Alle Artikel erfasst?','17:Ja;8:Nein'),
    st(17,L,'user','Verbuchen, Einlagerwagen scannen','',[['TIP','1'],['SCN','ewagen'],['SYS','1']]),
    st(18,L,'user','Lieferschein fotografieren (DMS)','',[['FOTO','1']]),
    st(19,SY,'xor','Durchläufer / Streckenartikel enthalten?','20:Ja;21:Nein'),
    st(20,L,'user','Artikelbarcodes drucken und anbringen','23',[['DRU','pos*pDL']]),
    st(23,L,'manual','Durchläufer ins Durchläuferregal einlagern, Fach scannen','21',[['GRW',"(1-pow(1-pDL,pos))*2*dd('WEZ','DLR')"],['AH2','pos*pDL*kolli'],['SCN','pos*pDL*2']]),
    st(21,L,'manual','Einlagerwagen in Verräumbereitstellung schieben','',[['GRW','ewagen*12'],['WAG','ewagen']]),
    st(22,SY,'end','WE liegt in Verräumfunktion bereit')
  ],weFlows);
  const weV2=variantOf(weV1,'we2','Soll B: Mengenerfassung je Position','Je Position ein Scan, Packungen werden gezählt und die Menge eingegeben. Chargenpflichtige Artikel weiter je Charge scannen. Setzt eine Anpassung in SHS voraus (Mengeneingabe im WE).',{
    params:[P('chJe','Chargen je chargenpfl. Position',1.3)],
    steps:{'8':{name:'Artikel 1× scannen, Packungen zählen, Menge eingeben, auf Einlagerwagen legen',el:[['SCN','pos'],['ZAE','pos*kolli'],['ZIF','pos*2'],['AH2','pos*kolli']]},
      '9':{el:[['SYS','pos']]},'10':{el:[['LES','pos*0.01']]},
      '14':{name:'Charge je Charge scannen / eingeben',el:[['SCN','pos*pCh*chJe']]}}
  });
  const weV3=variantOf(weV1,'we3','Soll C: Avis (DESADV) und SSCC-Scan','Lieferant sendet ein elektronisches Avis mit Positionen, Chargen und MHD. Im WE wird je Palette die SSCC gescannt; SHS prüft gegen Bestellung. Nur Stichproben werden einzeln geprüft. Voraussetzung: EDI-Anbindung der A-Lieferanten.',{
    params:[P('stich','Stichprobenanteil Positionen',0.15,'0–1')],
    remove:['8','9','10','11','12','13','14','15','16'],
    steps:{'6':{name:'Avis zur Lieferung aufrufen',el:[['TIP','1'],['SYS','1']]},
      '7':{name:'SSCC je Palette scannen (Daten aus Avis übernommen)',el:[['SCN','pal'],['SYS','pal']]}},
    insert:[['7',st(30,SY,'xor','Stichprobe ausgelöst?','31:Ja;32:Nein')],
            ['30',st(31,L,'user','Stichprobe prüfen: Artikel, Charge, Menge','32',[['SCN','pos*stich*kolli'],['ZAE','pos*stich*kolli']])],
            ['31',st(32,L,'manual','Ware auf Einlagerwagen umsetzen (nicht Palettenware)','17',[['AH2','pos*kolli*(1-pPal)']])]]
  });

  /* ---------- 2 Verräumung (je Einlagerwagen) ---------- */
  const LV='Lager (Verräumung)';
  const vrV1=V('vr1','Soll A: Verräumung mit Lagerplatzvorschlag','Sollprozess nach Prozessheft SHS 1.0 (Kapitel 4). Einlagerwagen mit gemischter Ware für Palettenlager und Fachboden; SHS schlägt den Lagerplatz vor.',
    [LV,SY],[P('pos','Positionen je Einlagerwagen',12),P('kolli','Packungen je Position',6),P('pFB','Anteil Positionen Fachboden',0.6,'0–1'),
      P('pCh','Anteil chargenpflichtig',0.5,'0–1'),P('pBC','Charge im Barcode',0.6,'0–1'),P('pAbw','Anteil abweichender Lagerplatz',0.05,'0–1'),P('pBueck','Anteil Bücken',0.3,'0–1')],[
    st(1,LV,'start','Einlagerwagen steht in Verräumbereitstellung'),
    st(2,LV,'user','Einlagerwagen am Scanner wählen','',[['TIP','2'],['SYS','1']]),
    st(3,LV,'manual','Wagen zum Lagerbereich schieben (hin und zurück)','',[['GRW',"2*(pFB*d('WEZ','FB')+(1-pFB)*d('WEZ','PAL'))"]]),
    st(4,LV,'user','Artikel scannen','',[['SCN','pos'],['SYS','pos']]),
    st(5,SY,'xor','Chargenpflichtig, Charge nicht im Barcode?','6:Ja;7:Nein'),
    st(6,LV,'user','Charge manuell eingeben','7',[['ZIF','pos*pCh*(1-pBC)*8']]),
    st(7,SY,'service','Lagerplatz ermitteln, Detailseite anzeigen','',[['SYS','pos'],['LES','pos']]),
    st(8,LV,'manual','Zum vorgeschlagenen Lagerplatz gehen (S-Strategie)','',[['GKW',"pFB*sshape('FB',pos*pFB)+(1-pFB)*sshape('PAL',pos*(1-pFB))"]]),
    st(9,LV,'user','Lagerplatz scannen','',[['SCN','pos']]),
    st(10,SY,'xor','Vorgeschlagener Platz und frei?','12:Ja;11:Nein'),
    st(11,LV,'user','Abweichung entscheiden, ggf. neuen Platz scannen','12',[['TIP','pos*pAbw'],['SCN','pos*pAbw']]),
    st(12,LV,'manual','Ware einlagern','',[['AH2','pos*kolli'],['KB','pos*kolli*pBueck']]),
    st(13,LV,'user','Menge bestätigen','',[['TIP','pos']]),
    st(14,LV,'xor','Weitere Positionen?','4:Ja;15:Nein'),
    st(15,LV,'user','Verbuchen','',[['TIP','1'],['SYS','1']]),
    st(16,SY,'end','Bestand in SHS gebucht, an SAP übergeben')
  ],[F('WEZ','PAL','Verräumung Palettenlager','Einlagerwagen'),F('WEZ','FB','Verräumung Fachboden','Einlagerwagen')]);

  /* ---------- 3 Kommissionierung Palettenbereich (je Auftrag, Kennzahl je Position) ---------- */
  const KP='Kommissionierer Palette', LL='Lagerleiter (Büro)';
  const kpParams=[P('pos','Positionen Palette je Auftrag',6),P('kolli','Packungen je Position',2),P('pCh','Anteil chargenpflichtig',0.4,'0–1'),P('pBC','Charge im Barcode',0.7,'0–1'),
    P('pMin','Anteil Meldung Minimalbestand',0.05,'0–1'),P('pLeer','Anteil Platz laut System leer',0.03,'0–1'),P('pBest','Anteil Bestand reicht nicht',0.03,'0–1'),
    P('pFrei','Anteil Freigabe Lagerleiter',0.05,'0–1'),P('pBueck','Anteil Bücken (untere Lage)',0.4,'0–1'),P('fWeg','Wegefaktor (1 = chaotisch)',1)];
  const kpV1=V('kp1','Soll A: Einzelauftrag mit Transportwagen','Ein Kommissionierer je Lieferschein. Er holt einen leeren Transportwagen, geht die Palettengassen in S-Strategie ab und stellt den Wagen auf der Konsolidierungsfläche ab (Kapitel 5 Prozessheft).',
    [KP,SY,LL],kpParams,[
    st(1,SY,'start','Lieferschein der Tour freigegeben'),
    st(2,KP,'user','Tour, Kostenstelle und Lieferschein wählen','',[['TIP','3'],['SYS','1']]),
    st(3,SY,'xor','Bestand ausreichend?','5:Ja;4:Nein'),
    st(4,KP,'user','Trotzdem kommissionieren oder Umbuchung','5',[['KLAER','pBest']]),
    st(5,KP,'manual','Leeren Transportwagen holen, zum Palettenlager fahren','',[['LEER','1'],['GKW',"d('LW','PAL')"]]),
    st(6,KP,'manual','Zum nächsten Lagerplatz fahren (S-Strategie)','',[['GKW',"sshape('PAL',pos)*fWeg"]]),
    st(7,KP,'user','Artikel scannen (je Packung)','',[['SCN','pos*kolli']]),
    st(8,KP,'manual','Packung von Palette entnehmen, in Wagen legen','',[['AH2','pos*kolli'],['KB','pos*kolli*pBueck']]),
    st(9,SY,'xor','Charge im Barcode?','11:Ja;10:Nein'),
    st(10,KP,'user','Charge aus Auswahlliste wählen','11',[['TIP','pos*pCh*(1-pBC)']]),
    st(11,SY,'service','Menge ermitteln, Minimalbestand prüfen','',[['SYS','pos*kolli'],['LES','pos*pMin']]),
    st(12,SY,'xor','Lagerplatz laut System leer?','13:Ja;14:Nein'),
    st(13,KP,'user','Leeren Platz bestätigen bzw. Klärfall','14',[['VA','pos*pLeer'],['TIP','pos*pLeer']]),
    st(14,KP,'xor','Weitere Positionen?','6:Ja;15:Nein'),
    st(15,KP,'user','Verbuchen, Hinweis Durchläufer quittieren','',[['TIP','1'],['LES','1'],['SYS','1']]),
    st(16,SY,'xor','Alle Artikel vollständig gepackt?','18:Ja;17:Nein'),
    st(17,LL,'user','Kommissionierung prüfen und freigeben','18',[['KLAER','pFrei']]),
    st(18,KP,'manual','Wagen zur Konsolidierungsfläche fahren, abstellen','',[['GRW',"d('PAL','KONS')"],['WAG','1']]),
    st(19,SY,'end','Teilwagen Palette steht in Konsolidierung')
  ],[F('LW','PAL','Leerwagen holen','Transportwagen'),F('PAL','KONS','Teilwagen Palette','Transportwagen')]);
  const kpV2=variantOf(kpV1,'kp2','Soll B: Multi-Order, 3 Aufträge je Tour','Ein Wagen mit Auftragsfächern nimmt 3 Lieferscheine gleichzeitig mit. Der Weg verteilt sich auf mehr Positionen; dafür kommt ein Fachscan hinzu und der einzelne Auftrag wartet, bis die Tour fertig ist.',{
    params:[P('orders','Aufträge je Tour (Batch)',3)],
    steps:{'5':{el:[['LEER','1/orders'],['GKW',"d('LW','PAL')/orders"]]},
      '6':{name:'Gemeinsame Tour durch die Gassen (S-Strategie)',el:[['GKW',"sshape('PAL',pos*orders)*fWeg/orders"]]},
      '18':{el:[['GRW',"d('PAL','KONS')/orders"],['WAG','1/orders']]}},
    insert:[['8',st(20,KP,'user','Packung ins Auftragsfach legen, Fach scannen','',[['SCN','pos']])]]
  });
  const kpV3=variantOf(kpV1,'kp3','Soll C: ABC-Zonierung, Schnelldreher vorn','SHS vergibt Plätze für A-Artikel (ca. 80 % der Zugriffe) im vorderen Gassenbereich. Der Wegefaktor bildet die kürzere mittlere Eindringtiefe ab. Passt zur Lagerplatzvergabe nach ABC in Kapitel 4.',{
    params:[P('fWeg','Wegefaktor (ABC-Zonierung)',0.6)]
  });

  /* ---------- 4 Kommissionierung Fachboden mit Puffer ---------- */
  const KF='Kommissionierer Fachboden', TD='Transportdienst';
  const kfParams=[P('pos','Positionen Fachboden je Auftrag',8),P('kolli','Packungen je Position',3),P('pCh','Anteil chargenpflichtig',0.3,'0–1'),P('pBC','Charge im Barcode',0.7,'0–1'),
    P('pMin','Anteil Meldung Minimalbestand',0.05,'0–1'),P('pBest','Anteil Bestand reicht nicht',0.03,'0–1'),P('pFrei','Anteil Freigabe Lagerleiter',0.05,'0–1'),
    P('pBueck','Anteil Bücken (unteres Fach)',0.3,'0–1'),P('fWeg','Wegefaktor',1),P('takt','Shuttle-Takt Puffer zur Konsolidierung',20,'min'),P('zug','Wagen je Shuttlefahrt',4)];
  const kfV1=V('kf1','Soll A: Einzelauftrag, Puffer Fachboden und Shuttle','Kommissionierer bleibt im Fachbodenbereich. Fertige Wagen kommen in den Puffer am Fachboden; der Transportdienst bringt sie im Takt gesammelt zur Konsolidierung (rund 100 m Weg).',
    [KF,SY,LL,TD],kfParams,[
    st(1,SY,'start','Lieferschein der Tour freigegeben'),
    st(2,KF,'user','Tour, Kostenstelle und Lieferschein wählen','',[['TIP','3'],['SYS','1']]),
    st(3,SY,'xor','Bestand ausreichend?','5:Ja;4:Nein'),
    st(4,KF,'user','Trotzdem kommissionieren oder Umbuchung','5',[['KLAER','pBest']]),
    st(5,KF,'manual','Leeren Kommissionierwagen im Puffer FB aufnehmen','',[['LEER','1'],['GKW',"d('FBP','FB')"]]),
    st(6,KF,'manual','Gassen abgehen (S-Strategie)','',[['GKW',"sshape('FB',pos)*fWeg"]]),
    st(7,KF,'user','Artikel scannen (je Packung)','',[['SCN','pos*kolli']]),
    st(8,KF,'manual','Packung aus Fachboden entnehmen, in Wagen legen','',[['AA2','pos*kolli'],['KB','pos*kolli*pBueck']]),
    st(9,SY,'xor','Charge im Barcode?','11:Ja;10:Nein'),
    st(10,KF,'user','Charge aus Auswahlliste wählen','11',[['TIP','pos*pCh*(1-pBC)']]),
    st(11,SY,'service','Menge ermitteln, Minimalbestand prüfen','',[['SYS','pos*kolli'],['LES','pos*pMin']]),
    st(12,KF,'xor','Weitere Positionen?','6:Ja;13:Nein'),
    st(13,KF,'user','Verbuchen, Hinweis Durchläufer quittieren','',[['TIP','1'],['LES','1'],['SYS','1']]),
    st(14,SY,'xor','Alle Artikel vollständig gepackt?','16:Ja;15:Nein'),
    st(15,LL,'user','Kommissionierung prüfen und freigeben','16',[['KLAER','pFrei']]),
    st(16,KF,'manual','Wagen in Puffer FB abstellen und Pufferplatz scannen','',[['GKW',"d('FB','FBP')"],['WAG','1'],['SCN','1']]),
    st(17,TD,'timer','Warten auf Shuttle-Takt','',[],{wait:'takt*60/2'}),
    st(18,TD,'manual','Wagenzug vom Puffer Fachboden zur Konsolidierung (Routenzug)','',[['SCH',"2*d('FBP','KONS')/zug"],['WAG','2'],['SCN','1']]),
    st(19,SY,'end','Teilwagen Fachboden steht in Konsolidierung')
  ],[F('FBP','FB','Leerwagen aus Puffer','Kommissionierwagen'),F('FB','FBP','Fertiger Wagen in Puffer','Kommissionierwagen'),F('FBP','KONS','Shuttle (Routenzug)','Schlepper')]);
  const kfV2=variantOf(kfV1,'kf2','Soll B: Direkttransport ohne Puffer','Keine Wartezeit auf das Shuttle, aber jeder Kommissionierer läuft je Auftrag die Strecke zur Konsolidierung und zurück.',{
    remove:['17','18'],
    steps:{'5':{name:'Leeren Wagen an Leerwagenfläche holen, zum Fachboden fahren',el:[['LEER','1'],['GKW',"d('LW','FB')"]]},
      '16':{name:'Wagen zur Konsolidierungsfläche schieben, abstellen',el:[['GRW',"d('FB','KONS')"],['WAG','1']]}},
    flows:[F('LW','FB','Leerwagen holen','Kommissionierwagen'),F('FB','KONS','Wagen selbst zur Konsolidierung','Kommissionierwagen')]
  });
  const kfV3=variantOf(kfV1,'kf3','Soll C: Pick-to-Tote, 4 Aufträge je Wagen, mit Puffer','Kommissionierwagen mit Behältern je Auftrag, Sammeltour für 4 Lieferscheine. Puffer und Shuttle wie Soll A.',{
    params:[P('orders','Aufträge je Tour (Batch)',4)],
    steps:{'5':{el:[['LEER','1/orders'],['GKW',"d('FBP','FB')/orders"]]},
      '6':{name:'Gemeinsame Tour (S-Strategie)',el:[['GKW',"sshape('FB',pos*orders)*fWeg/orders"]]},
      '16':{el:[['GKW',"d('FB','FBP')/orders"],['WAG','1/orders'],['SCN','1']]}},
    insert:[['8',st(20,KF,'user','Packung in Auftragsbehälter legen, Behälter scannen','',[['SCN','pos']])]]
  });

  /* ---------- 5 Konsolidierung (je Auftrag) ---------- */
  const KO='Konsolidierer';
  const koParams=[P('pos','Positionen je Auftrag gesamt',14),P('kolli','Packungen je Position',2.5),P('anteilP','Anteil Positionen aus Palettenlager',0.43,'0–1'),P('pFehl','Anteil Abweichung bei Prüfung',0.03,'0–1'),
    P('pDLA','Anteil Aufträge mit Durchläufern',0.2,'0–1'),P('posDL','Durchläufer-Positionen je betroffenem Auftrag',1.5)];
  const koV1=V('ko1','Soll A: Umpacken in einen Versandwagen','Teilwagen Palette und Teilwagen Fachboden werden auf der Konsolidierungsfläche zusammengeführt; der Palettenteil wird in den Versandwagen umgepackt. Leerwagen geht zurück zur Leerwagenfläche.',
    [KO,SY],koParams,[
    st(1,SY,'start','Erster Teilwagen in Konsolidierung'),
    st(2,KO,'xor','Beide Teilwagen da?','4:Ja;3:Nein'),
    st(3,KO,'timer','Warten auf zweiten Teilwagen','4',[],{wait:'0'}),
    st(4,KO,'user','Teilwagen Palette und Fachboden scannen','',[['SCN','2'],['SYS','2']]),
    st(5,KO,'manual','Vollständigkeit sichtprüfen','',[['VA','pos']]),
    st(20,SY,'xor','Durchläufer zum Auftrag (Hinweis SHS)?','21:Ja;6:Nein',[['SYS','1']]),
    st(21,KO,'manual','Durchläufer aus Durchläuferregal holen, scannen, in Versandwagen legen','6',[['GKW',"pDLA*2*d('KONS','DLR')"],['SCN','pDLA*posDL*2'],['AH2','pDLA*posDL*kolli']]),
    st(6,SY,'xor','Abweichung?','7:Ja;8:Nein'),
    st(7,KO,'user','Abweichung klären','8',[['KLAER','pFehl']]),
    st(8,KO,'manual','Palettenteil in Versandwagen umpacken','',[['AH2','pos*anteilP*kolli']]),
    st(9,KO,'user','Versandetikett drucken, Wagen dem Lieferschein zuordnen','',[['DRU','1'],['SCN','1'],['SYS','1']]),
    st(10,KO,'manual','Leeren Teilwagen zur Leerwagenfläche bringen','',[['GKW',"dd('KONS','LW')*2"],['WAG','1']]),
    st(11,KO,'manual','Versandwagen in Bereitstellbahn schieben, Bahn scannen','',[['GRW',"dd('KONS','BS')"],['WAG','1'],['SCN','1']]),
    st(12,SY,'end','Auftrag versandbereit auf Bahn')
  ],[F('DLR','KONS','Durchläufer zum Auftrag','zu Fuß / Handtrage'),F('KONS','LW','Leere Teilwagen zurück','Transportwagen','direct'),F('KONS','BS','Versandwagen in Bahn','Rollwagen','direct')]);
  const koV2=variantOf(koV1,'ko2','Soll B: Wagen koppeln ohne Umpacken','Beide Teilwagen bleiben Versandeinheiten. Sie werden per Scan dem Lieferschein zugeordnet und gekoppelt in die Bahn geschoben. Kein Umpacken, aber zwei Wagen je Auftrag im Warenausgang.',{
    remove:['8','10'],
    steps:{'9':{name:'Versandetikett drucken, beide Wagen zuordnen und koppeln',el:[['DRU','1'],['SCN','2'],['WAG','2'],['SYS','1']]},
      '11':{name:'Wagenpaar in Bereitstellbahn schieben, Bahn scannen',el:[['GRW',"dd('KONS','BS')*1.2"],['WAG','1'],['SCN','1']]}},
    flows:[F('DLR','KONS','Durchläufer zum Auftrag','zu Fuß / Handtrage'),F('KONS','BS','Wagenpaar in Bahn','2 Rollwagen gekoppelt','direct')]
  });

  /* ---------- 6 Warenausgang (je Auftrag) ---------- */
  const WAm='Warenausgang';
  const waParams=[P('pos','Positionen je Auftrag gesamt',14),P('wagen','Wagen je Auftrag',1.3),P('aufTour','Aufträge je Tour',6),P('pFehl','Anteil Fehlverladung erkannt',0.01,'0–1')];
  const waV1=V('wa1','Soll A: Bahn zum Dock, Scan je Wagen','Wagen stehen nach Tour sortiert in den Bereitstellbahnen. Bei Ankunft des Fahrzeugs werden sie zum zugeordneten Dock geschoben, je Wagen gescannt, verladen und gesichert.',
    [WAm,SY],waParams,[
    st(1,SY,'start','Tourfahrzeug an Dock'),
    st(2,WAm,'user','Tour am Scanner wählen','',[['TIP','1/aufTour'],['SYS','1/aufTour']]),
    st(3,WAm,'manual','Wagen aus Bahn zum Dock schieben','',[['GRW',"wagen*2*dd('BS','D4')"],['WAG','wagen']]),
    st(4,WAm,'user','Wagen scannen (Verladekontrolle)','',[['SCN','wagen'],['SYS','wagen']]),
    st(5,SY,'xor','Wagen gehört zur Tour?','7:Ja;6:Nein'),
    st(6,WAm,'user','Fehlverladung klären','7',[['KLAER','pFehl']]),
    st(7,WAm,'manual','Verladen und Ladung sichern','',[['GRW','wagen*10'],['LSI','wagen']]),
    st(8,WAm,'user','Tour abschließen, Begleitpapiere übergeben','',[['DOK','1/aufTour'],['SYS','1/aufTour']]),
    st(9,SY,'end','Auftrag verladen')
  ],[F('BS','D4','Verladung Zentrallager','Rollwagen','direct')]);
  const waV2=variantOf(waV1,'wa2','Soll B: Bahn je Tour, Blockverladung','Jede Bereitstellbahn ist einer Tour fest zugeordnet. Gescannt wird die Bahn statt jedes Wagens; Wagen werden im Block verladen und gemeinsam gesichert.',{
    steps:{'4':{name:'Bahn scannen (Tour-Abgleich)',el:[['SCN','1/aufTour'],['SYS','1/aufTour']]},
      '7':{name:'Blockverladung, gemeinsame Ladungssicherung',el:[['GRW','wagen*10'],['LSI','wagen*0.6']]}}
  });

  /* ---------- 7 Wäscherei-Caddys (je Caddy) ---------- */
  const LW_='Lieferant Wäscherei';
  const wsParams=[P('pos','Bezug: 1 Caddy',1),P('zug','Caddys je Fahrt',2),P('pUnrein','Rücknahme unrein je Caddy',1)];
  const wsV1=V('ws1','Soll A: Manuell, 2 Caddys je Fahrt','Lieferant stellt reine Caddys auf der Rein-Fläche ab und nimmt unreine Caddys mit. Der interne Transportdienst holt die Caddys zur Verteilung ab und bringt sie an Dock 1 (Warenausgang Wäscherei).',
    [LW_,TD,SY],wsParams,[
    st(1,LW_,'start','Wäschereifahrzeug an Dock 1'),
    st(2,LW_,'manual','Reine Caddys auf Rein-Fläche schieben','',[['GRW',"2*d('D1','WR',11.6)/zug"],['WAG','1']]),
    st(3,LW_,'manual','Unreine Caddys aufnehmen und verladen','',[['GRW',"pUnrein*2*d('D1','WU',11.6)/zug"],['WAG','pUnrein']]),
    st(4,TD,'timer','Abruf gemäß Verteiltour','',[],{wait:'0'}),
    st(5,TD,'manual','Caddy auf Rein-Fläche aufnehmen, Caddy scannen','',[['WAG','1'],['SCN','1']]),
    st(6,TD,'manual','Caddys zu Dock 1 schieben','',[['GRW',"2*d('WR','D1',11.6)/zug"]]),
    st(7,TD,'manual','In Verteilfahrzeug verladen, sichern','',[['WAG','1'],['LSI','0.5']]),
    st(8,SY,'end','Caddy unterwegs zur Station')
  ],[F('D1','WR','Anlieferung reine Caddys','Caddy','aisle',11.6),F('WU','D1','Abholung unreine Caddys','Caddy','aisle',11.6),F('WR','D1','Abholung zur Verteilung (Transportdienst)','Caddy','aisle',11.6)]);
  const wsV2=variantOf(wsV1,'ws2','Soll B: Schlepper mit 4er-Zug','Der Transportdienst zieht 4 Caddys gekoppelt mit einem Schlepper. Weniger Fahrten, dafür An- und Abkoppeln.',{
    params:[P('zug','Caddys je Fahrt',4)],
    steps:{'6':{name:'Caddyzug mit Schlepper zu Dock 1',el:[['SCH',"2*d('WR','D1',11.6)/zug"],['WAG','1']]}}
  });

  /* ---------- 8 Apothekenlieferung (je Wagen) ---------- */
  const apV1=V('ap1','Soll A: Wagen aus Zwischenlager Apotheke (Dockbereich)','Versandfertige Apothekenwagen stehen im Zwischenlager Apotheke und werden an Dock 6 oder 7 verladen.',
    [TD,SY],[P('pos','Bezug: 1 Wagen',1)],[
    st(1,SY,'start','Apothekenwagen versandbereit'),
    st(2,TD,'user','Wagen scannen (Tour-Abgleich)','',[['SCN','1'],['SYS','1']]),
    st(3,TD,'manual','Wagen zu Dock 6/7 schieben','',[['GRW',"dd('APZ','D6')+4"],['WAG','1']]),
    st(4,TD,'manual','Verladen und sichern','',[['GRW','10'],['LSI','1']]),
    st(5,SY,'end','Apothekenwagen verladen')
  ],[F('APZ','D6','Apothekenlieferung','Rollwagen','direct'),F('APZ','D7','Apothekenlieferung','Rollwagen','direct')]);
  const apV2=variantOf(apV1,'ap2','Soll B: Wagen aus Zwischenlager Apothekenware (Halle 7)','Apothekenwagen werden im Zwischenlager Apothekenware in Halle 7 bereitgestellt und über den Hauptverkehrsweg zu Dock 6/7 gezogen. Längerer Weg, dafür entlastet das Zwischenlager am Dock.',{
    params:[P('zug','Wagen je Fahrt (Schlepper)',3)],
    steps:{'3':{name:'Wagenzug über Hauptverkehrsweg zu Dock 6/7 (Schlepper)',el:[['SCH',"2*d('AZ1','D6')/zug"],['WAG','1']]}},
    flows:[F('AZ1','D6','Apothekenwagen aus Halle 7','Schlepper'),F('AZ2','D7','Apothekenwagen aus Halle 7','Schlepper')]
  });

  const DASH={we:'solid',vr:'dash',kp:'solid',kf:'solid',ko:'solid',wa:'dash',ws:'dash',ap:'dot'};
  const sec=(id,name,color,bezug,posLabel,variants,baseline)=>({id,name,color,dash:DASH[id],bezug,posLabel,variants,baseline});
  return {
    meta:{name:'Zentrallager UK Essen – Prozessmodell',version:'0.3 Soll-Modell mit Durchläuferregal',soll:true,updated:new Date().toISOString()},
    settings:{aisleY:26.5,zv:10,ze:5,showRacks:true},
    zones,bausteine,
    sections:[
      sec('we','Wareneingang','#144477','Anlieferung','Position',[weV1,weV2,weV3],'we1'),
      sec('vr','Verräumung','#2D7694','Einlagerwagen','Position',[vrV1],'vr1'),
      sec('kp','Kommissionierung Palettenbereich','#0A967A','Auftrag (Palettenteil)','Position',[kpV1,kpV2,kpV3],'kp1'),
      sec('kf','Kommissionierung Fachboden mit Puffer','#0A223C','Auftrag (Fachbodenteil)','Position',[kfV1,kfV2,kfV3],'kf1'),
      sec('ko','Konsolidierung','#891F5E','Auftrag','Position',[koV1,koV2],'ko1'),
      sec('wa','Warenausgang','#144477','Auftrag','Position',[waV1,waV2],'wa1'),
      sec('ws','Wäscherei-Caddys','#891F5E','Caddy','Caddy',[wsV1,wsV2],'ws1'),
      sec('ap','Apothekenlieferung','#2D7694','Wagen','Wagen',[apV1,apV2],'ap1')
    ],
    order:{nP:6,nF:8,kp:'kp1',kf:'kf1',ko:'ko1',wa:'wa1'}
  };
}

const TMU_S=0.036;
/* ---------- Geometrie / Wege ---------- */
function anchor(z){
  if(z.ax!==undefined&&z.ax!==''&&z.ax!==null)return {x:parseNum(z.ax),y:parseNum(z.ay)};
  if(z.type==='dock')return {x:6,y:z.y+z.h/2};
  const Y=S.settings.aisleY;
  if(z.y+z.h<=Y)return {x:z.x+z.w/2,y:z.y+z.h};
  if(z.y>=Y)return {x:z.x+z.w/2,y:z.y};
  return {x:z.x+z.w/2,y:z.y+z.h/2};
}
function routePts(a,b,mode,viaY){
  const A=anchor(a),B=anchor(b);
  if(mode==='direct')return [A,{x:B.x,y:A.y},B];
  const Y=(viaY!==undefined&&viaY!==''&&viaY!==null)?parseNum(viaY):S.settings.aisleY;
  return [A,{x:A.x,y:Y},{x:B.x,y:Y},B];
}
const plen=p=>p.reduce((s,q,i)=>i?s+Math.abs(q.x-p[i-1].x)+Math.abs(q.y-p[i-1].y):0,0);
function dist(ka,kb,mode,viaY){
  const a=zoneByKey(ka),b=zoneByKey(kb);
  if(!a)throw new Error('Zone „'+ka+'“ unbekannt');if(!b)throw new Error('Zone „'+kb+'“ unbekannt');
  return plen(routePts(a,b,mode,viaY));
}
function sshape(k,n){
  const z=zoneByKey(k);if(!z)throw new Error('Zone „'+k+'“ unbekannt');
  n=Math.max(0,n);if(n===0)return 0;
  const A=Math.max(1,parseNum(z.aisles)||1),L=parseNum(z.gLen)||z.w,W=z.h;
  const v=A*(1-Math.pow((A-1)/A,n));
  return v*L+0.5*L+W;
}
const H={d:(a,b,y)=>dist(a,b,'aisle',y),dd:(a,b)=>dist(a,b,'direct'),sshape,zlen:k=>{const z=zoneByKey(k);if(!z)throw new Error('Zone „'+k+'“ unbekannt');return z.w;}};

/* ---------- Formeln ---------- */
const fnCache=new Map();
function evalF(expr,P){
  expr=String(expr==null?'':expr).trim();if(expr==='')return 0;
  if(/^-?\d+([.,]\d+)?$/.test(expr))return parseNum(expr);
  const keys=Object.keys(P).filter(k=>/^[A-Za-z_]\w*$/.test(k));
  const sig=keys.join(',')+'§'+expr;let f=fnCache.get(sig);
  if(!f){
    if(/[;{}\[\]`=]|=>|\bnew\b|\bwindow\b|\bdocument\b|\bthis\b/.test(expr.replace(/[<>!]=|==/g,'')))throw new Error('Unzulässiger Ausdruck');
    f=new Function('d','dd','sshape','zlen','min','max','ceil','floor','round','sqrt','pow',...keys,'"use strict";return ('+expr+');');fnCache.set(sig,f);
  }
  const v=f(H.d,H.dd,H.sshape,H.zlen,Math.min,Math.max,Math.ceil,Math.floor,Math.round,Math.sqrt,Math.pow,...keys.map(k=>P[k]));
  if(typeof v!=='number'||!isFinite(v))throw new Error('Ergebnis keine Zahl');
  return v;
}

/* ---------- Zeitrechnung ---------- */
function paramsOf(v,over){const P={};v.params.forEach(p=>{if(p.k)P[p.k]=parseNum(p.v);});return Object.assign(P,over||{});}
function calcVariant(v,over){
  const P=paramsOf(v,over);
  const r={P,steps:[],work:0,wait:0,byCat:{},byLane:{},errors:[],pos:P.pos||1};
  v.steps.forEach(st=>{
    let t=0;const els=[];
    (st.el||[]).forEach(e=>{
      const b=bById(e[0]);let q=0,err=null;
      try{q=evalF(e[1],P);}catch(x){err=x.message;r.errors.push('Schritt '+st.id+': '+x.message);}
      const s=b?b.tmu*TMU_S*q:0;t+=s;
      if(b)r.byCat[b.cat]=(r.byCat[b.cat]||0)+s;
      els.push({q,s,err});
    });
    let w=0,werr=null;if(st.wait){try{w=evalF(st.wait,P);}catch(x){werr=x.message;r.errors.push('Schritt '+st.id+' Wartezeit: '+x.message);}}
    r.steps.push({id:st.id,t,w,els,werr,lane:st.lane});
    r.work+=t;r.wait+=w;r.byLane[st.lane]=(r.byLane[st.lane]||0)+t;
  });
  const z=(parseNum(S.settings.zv)+parseNum(S.settings.ze))/100;
  r.vorgabe=r.work*(1+z);r.perPos=r.vorgabe/(r.pos||1);r.weg=(r.byCat['Weg']||0);
  return r;
}
function parseNext(st,idx,steps){
  if(st.type==='end')return [];
  const t=String(st.next||'').trim();
  if(!t){const n=steps[idx+1];return n?[{to:n.id,label:''}]:[];}
  return t.split(/[;\n]/).map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf(':');return i<0?{to:x.trim(),label:''}:{to:x.slice(0,i).trim(),label:x.slice(i+1).trim()};});
}
function bpmnLayout(v){
  const lanes=v.lanes.slice();v.steps.forEach(s=>{if(!lanes.includes(s.lane))lanes.push(s.lane);});
  const LH=124,HW=150,CW=138,X0=HW+14;
  const nodes={};
  v.steps.forEach((s,i)=>{
    const li=lanes.indexOf(s.lane);let w=112,h=68;
    if(['start','end','timer'].includes(s.type)){w=h=36;}else if(['xor','and'].includes(s.type)){w=h=46;}
    const cx=X0+i*CW+CW/2,cy=li*LH+LH/2;
    nodes[s.id]={s,i,li,w,h,cx,cy,x:cx-w/2,y:cy-h/2};
  });
  const colL=i=>X0+i*CW,colR=i=>X0+(i+1)*CW,laneT=li=>li*LH,laneB=li=>(li+1)*LH;
  const edges=[];let k=0;
  v.steps.forEach((s,i)=>{
    const a=nodes[s.id];
    parseNext(s,i,v.steps).forEach((n,j)=>{
      const b=nodes[n.to];if(!b){edges.push({from:s.id,to:n.to,label:n.label,bad:true,pts:[]});return;}
      const o=(k++%3)*5;let pts;
      const gw=['xor','and'].includes(s.type)&&j>=1;
      if(gw&&b.i>a.i){const y1=laneB(a.li)-14-o,gx=colL(b.i)+4+o,ch=laneT(b.li)+10+o;
        pts=b.li===a.li&&b.i===a.i+1?[[a.cx,a.y+a.h],[a.cx,b.cy+((b.h/2)+6)],[b.cx,b.cy+((b.h/2)+6)],[b.cx,b.y+b.h]]:[[a.cx,a.y+a.h],[a.cx,y1],[gx,y1],[gx,ch],[b.cx,ch],[b.cx,b.y]];}
      else if(b.i===a.i+1&&a.li===b.li)pts=[[a.x+a.w,a.cy],[b.x,b.cy]];
      else if(b.i===a.i+1){const mx=colR(a.i);pts=[[a.x+a.w,a.cy],[mx,a.cy],[mx,b.cy],[b.x,b.cy]];}
      else if(b.i>a.i){const gx=colR(a.i)-4-o,ch=laneT(b.li)+10+o;pts=[[a.x+a.w,a.cy],[gx,a.cy],[gx,ch],[b.cx,ch],[b.cx,b.y]];}
      else{const ch=laneB(a.li)-9-o;
        if(a.li===b.li)pts=[[a.cx,a.y+a.h],[a.cx,ch],[b.cx,ch],[b.cx,b.y+b.h]];
        else{const gx=colL(b.i)+4+o,ch2=laneB(b.li)-9-o;pts=[[a.cx,a.y+a.h],[a.cx,ch],[gx,ch],[gx,ch2],[b.cx,ch2],[b.cx,b.y+b.h]];}}
      edges.push({id:'Flow_'+s.id+'_'+n.to,from:s.id,to:n.to,label:n.label,pts});
    });
  });
  return {lanes,nodes,edges,LH,HW,width:X0+v.steps.length*CW+20,height:lanes.length*LH};
}
function taskIcon(type,x,y,c){
  if(type==='user')return `<g fill="${c}"><circle cx="${x+5}" cy="${y+3}" r="2.6"/><path d="M${x},${y+11} Q${x},${y+6} ${x+5},${y+6} Q${x+10},${y+6} ${x+10},${y+11} Z"/></g>`;
  if(type==='manual')return `<g fill="${c}"><rect x="${x}" y="${y+5}" width="9" height="6" rx="1.5"/><rect x="${x+0.5}" y="${y+1}" width="1.7" height="5" rx="0.8"/><rect x="${x+2.8}" y="${y}" width="1.7" height="6" rx="0.8"/><rect x="${x+5.1}" y="${y+0.5}" width="1.7" height="5.5" rx="0.8"/><rect x="${x+7.3}" y="${y+2}" width="1.7" height="4" rx="0.8"/></g>`;
  if(type==='service'){let g=`<g fill="${c}"><circle cx="${x+5.5}" cy="${y+5.5}" r="3.8"/>`;for(let i=0;i<8;i++){const a=i*Math.PI/4;g+=`<rect x="${x+4.6}" y="${y-0.3}" width="1.8" height="2.6" transform="rotate(${i*45} ${x+5.5} ${y+5.5})"/>`;}return g+`<circle cx="${x+5.5}" cy="${y+5.5}" r="1.5" fill="#fff"/></g>`;}
  return '';
}
function wrapText(t,max){const w=String(t).split(/\s+/);const lines=[];let cur='';w.forEach(x=>{if((cur+' '+x).trim().length>max&&cur){lines.push(cur);cur=x;}else cur=(cur+' '+x).trim();});if(cur)lines.push(cur);return lines;}
function bpmnXml(sec,v,calc){
  const L=bpmnLayout(v);const x=s=>esc(s);
  const tag={start:'startEvent',end:'endEvent',user:'userTask',manual:'manualTask',service:'serviceTask',xor:'exclusiveGateway',and:'parallelGateway',timer:'intermediateCatchEvent'};
  const nid=id=>'Node_'+String(id).replace(/\W/g,'_');
  const inc={},out={};L.edges.forEach(e=>{if(e.bad)return;(out[e.from]=out[e.from]||[]).push(e.id);(inc[e.to]=inc[e.to]||[]).push(e.id);});
  let p=`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Defs_${v.id}" targetNamespace="urn:uk-essen:zentrallager" exporter="Prozessmodell Zentrallager" exporterVersion="0.1">
  <bpmn:collaboration id="Collab_${v.id}"><bpmn:participant id="Pool_${v.id}" name="${x(sec.name+' – '+v.name)}" processRef="Proc_${v.id}"/></bpmn:collaboration>
  <bpmn:process id="Proc_${v.id}" isExecutable="false">
    <bpmn:documentation>${x(v.desc||'')}</bpmn:documentation>
    <bpmn:laneSet id="LaneSet_${v.id}">\n`;
  L.lanes.forEach((ln,i)=>{p+=`      <bpmn:lane id="Lane_${i}" name="${x(ln)}">\n`+v.steps.filter(s=>s.lane===ln).map(s=>`        <bpmn:flowNodeRef>${nid(s.id)}</bpmn:flowNodeRef>\n`).join('')+`      </bpmn:lane>\n`;});
  p+=`    </bpmn:laneSet>\n`;
  v.steps.forEach((s,i)=>{const r=calc.steps[i];const t=tag[s.type]||'task';
    p+=`    <bpmn:${t} id="${nid(s.id)}" name="${x(s.name)}">\n      <bpmn:documentation>${x('Grundzeit: '+fmt(r.t,1)+' s'+(r.w?' · Wartezeit: '+fmt(r.w,1)+' s':'')+((s.el||[]).length?' · Bausteine: '+s.el.map(e=>e[0]+'×('+e[1]+')').join(', '):''))}</bpmn:documentation>\n`;
    (inc[s.id]||[]).forEach(f=>p+=`      <bpmn:incoming>${f}</bpmn:incoming>\n`);(out[s.id]||[]).forEach(f=>p+=`      <bpmn:outgoing>${f}</bpmn:outgoing>\n`);
    if(s.type==='timer')p+=`      <bpmn:timerEventDefinition id="Timer_${nid(s.id)}"/>\n`;
    p+=`    </bpmn:${t}>\n`;});
  L.edges.forEach(e=>{if(!e.bad)p+=`    <bpmn:sequenceFlow id="${e.id}" ${e.label?`name="${x(e.label)}" `:''}sourceRef="${nid(e.from)}" targetRef="${nid(e.to)}"/>\n`;});
  p+=`  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_${v.id}"><bpmndi:BPMNPlane id="Plane_${v.id}" bpmnElement="Collab_${v.id}">
    <bpmndi:BPMNShape id="Pool_${v.id}_di" bpmnElement="Pool_${v.id}" isHorizontal="true"><dc:Bounds x="0" y="0" width="${L.width}" height="${L.height}"/></bpmndi:BPMNShape>\n`;
  L.lanes.forEach((ln,i)=>p+=`    <bpmndi:BPMNShape id="Lane_${i}_di" bpmnElement="Lane_${i}" isHorizontal="true"><dc:Bounds x="30" y="${i*L.LH}" width="${L.width-30}" height="${L.LH}"/></bpmndi:BPMNShape>\n`);
  v.steps.forEach(s=>{const n=L.nodes[s.id];p+=`    <bpmndi:BPMNShape id="${nid(s.id)}_di" bpmnElement="${nid(s.id)}"${s.type==='xor'?' isMarkerVisible="true"':''}><dc:Bounds x="${Math.round(n.x)}" y="${Math.round(n.y)}" width="${n.w}" height="${n.h}"/></bpmndi:BPMNShape>\n`;});
  L.edges.forEach(e=>{if(e.bad)return;p+=`    <bpmndi:BPMNEdge id="${e.id}_di" bpmnElement="${e.id}">`+e.pts.map(q=>`<di:waypoint x="${Math.round(q[0])}" y="${Math.round(q[1])}"/>`).join('')+`</bpmndi:BPMNEdge>\n`;});
  return p+`  </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>\n</bpmn:definitions>\n`;
}
function sectionTimeline(v,over,t0){
  const c=calcVariant(v,over);const lf=Math.max(1,c.P.orders||1);
  const segs=[];let t=0;
  v.steps.forEach((st,i)=>{const r=c.steps[i];
    if(r.w>0){segs.push({lane:st.lane,start:t,dur:r.w,wait:true,label:st.name});t+=r.w;}
    if(r.t>0){const last=segs[segs.length-1];
      if(last&&!last.wait&&last.lane===st.lane)last.dur+=r.t,last.label+=' · '+st.name;
      else segs.push({lane:st.lane,start:t,dur:r.t,label:st.name});t+=r.t;}});
  // Batch: Auftrag ist erst fertig, wenn der ganze Batch fertig ist
  const workSeq=t-c.wait;const batchExtra=(lf-1)*workSeq;
  segs.forEach(s=>{s.start+=t0;});
  if(batchExtra>0){const firstWait=segs.findIndex(s=>s.wait);const ins=firstWait<0?segs.length:firstWait;
    const endWork=ins>0?segs[ins-1].start+segs[ins-1].dur:t0;
    segs.splice(ins,0,{lane:segs[Math.max(0,ins-1)].lane,start:endWork,dur:batchExtra,batch:true,label:'Weitere '+(lf-1)+' Aufträge im Batch'});
    for(let j=ins+1;j<segs.length;j++)segs[j].start+=batchExtra;}
  return {c,segs,end:t0+t+batchExtra,lf};
}
function csvAll(){
  const rows=[['Abschnitt','Variante','Basis','Schritt','Lane','Typ','Bezeichnung','Grundzeit_s','Wartezeit_s','Bausteine']];
  S.sections.forEach(s=>s.variants.forEach(v=>{const c=calcVariant(v);v.steps.forEach((st,i)=>rows.push([s.name,v.name,s.baseline===v.id?'ja':'',st.id,st.lane,STEP_TYPES[st.type]||st.type,st.name,fmt(c.steps[i].t,2),fmt(c.steps[i].w,2),(st.el||[]).map(e=>e[0]+'×('+e[1]+')').join(' | ')]));
    rows.push([s.name,v.name,'','Σ','','','Grundzeit gesamt',fmt(c.work,2),fmt(c.wait,2),'Vorgabezeit '+fmt(c.vorgabe,2)+' s; je Position '+fmt(c.perPos,2)+' s']);}));
  return rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(';')).join('\n');
}
