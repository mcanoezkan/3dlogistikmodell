/* ===================== Soll-Prozessmodell Zentrallager · Oberfläche (UNITY-Stil) =====================
   Bedienprinzip überall gleich: links auswählen · Mitte ansehen · rechts im Inspektor bearbeiten. */

/* ---------- Seitenvorlage für das Speichern im Artefakt (vor dem ersten Rendern festhalten) ---------- */
const PAGE_TPL=(()=>{
  const ser=n=>n.nodeType===1?n.outerHTML:n.nodeType===3?n.textContent.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):'';
  const title=document.querySelector('title'),css=document.getElementById('appcss');
  let out=(title?title.outerHTML:'<title>Prozessplaner Logistik</title>')+'\n'+(css?css.outerHTML:'')+'\n';
  let on=false;
  for(const n of [...document.body.childNodes]){
    if(n.nodeType===1&&n.id==='top')on=true;
    if(!on)continue;
    out+=ser(n);
    if(n.nodeType===1&&n.id==='app')break;
  }
  return out;
})();
const HEAD_STYLE=(()=>{try{const s=[...document.head.querySelectorAll('style')].find(x=>x.id!=='appcss');return s?s.textContent:'';}catch(e){return '';}})()
  ||':root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}';

/* ---------- Konstanten ---------- */
const PLAN={x:-4.255,y:-7.447,w:191.49,h:80.85};
let PLAN_URL='';
try{const b64=document.getElementById('planData').textContent.trim();if(b64){const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);PLAN_URL=URL.createObjectURL(new Blob([u],{type:'image/jpeg'}));}}catch(e){}
const LS_KEY='uke-zl-prozessmodell-soll-v2';
const LS_UI='uke-zl-prozessmodell-ui';
const U={navy:'#0A223C',blue:'#144477',green:'#0A967A',petrol:'#2D7694',berry:'#891F5E',lgrey:'#DCE3E8',mgrey:'#BDC6D1',text:'#4A4A4A'};
const PALETTE=[['#144477','Blau'],['#0A223C','Navy'],['#2D7694','Petrol'],['#0A967A','Grün'],['#891F5E','Beere'],['#5A6573','Grau']];
const CATS=[['Weg',U.blue],['Greifen/Handhaben',U.green],['Scannen/Eingabe',U.petrol],['Prüfen/Lesen',U.berry],['Rüsten/Sonstiges',U.mgrey],['System',U.lgrey]];
const CATCOL=Object.fromEntries(CATS);
const DOCKCOL={'Wäscherei':U.berry,'Zentrallager':U.blue,'Flex':U.petrol,'Apotheke':U.green,'Wareneingang':U.navy,'frei':U.mgrey};
const DASHES={solid:'1.6 0.5',dash:'0.9 0.7',dot:'0.25 0.55'};
const DASH_LABEL={solid:'durchgezogen',dash:'gestrichelt',dot:'gepunktet'};
const ZTYPE={verkehr:['#f3f5f7',U.mgrey],dock:[U.blue,U.navy],lager:['#eef2f5',U.mgrey],rack:['#dce3e8',U.mgrey],puffer:['#e6eef3',U.petrol],
  we:['#e3e9f1',U.blue],wa:['#e3e9f1',U.blue],lane:['#e3e9f1',U.blue],kons:['#f1e4ec',U.berry],waesche:['#f1e4ec',U.berry],apo:['#e0f1ed',U.green],
  office:['#f3f5f7',U.mgrey],sonst:['#f7f8fa',U.mgrey]};
const ZTYPE_LABEL={verkehr:'Verkehrsfläche',dock:'Dock / Tor',lager:'Lagerbereich',rack:'Regal (Darstellung)',puffer:'Puffer',we:'Wareneingang',wa:'Bereitstellung WA',lane:'Bereitstellbahn',kons:'Konsolidierung',waesche:'Wäscherei',apo:'Apotheke',office:'Büro / Sozial',sonst:'Sonstige Fläche'};
const STEP_TYPES={start:'Start-Ereignis',end:'End-Ereignis',user:'Benutzer-Task (Scanner)',manual:'Manuelle Tätigkeit',service:'System-Task',xor:'XOR-Gateway',and:'AND-Gateway',timer:'Zwischenereignis (Warten)'};
const ORDER_SECS=[['kp','Kommissionierung Palette'],['kf','Kommissionierung Fachboden'],['ko','Konsolidierung'],['wa','Warenausgang']];

let S=null;
const UI={ws:'layout',vid:'we1',sel:null,tool:'select',zoom:1,overlay:null,flowVid:null,flowStart:null,showAnchors:true,
  procView:'bpmn',cmpSec:'kp',libCat:'',libQ:'',zoneQ:'',zoneType:'',wrA:'KONS',wrB:'FBP',methodEdit:false,
  dirty:false,art:null,dl:null,readOnly:false,hintOff:false,paramOpen:{}};

/* ---------- Helfer ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const parseNum=v=>{if(typeof v==='number')return v;const n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:0;};
const fmt=(n,d=1)=>(isFinite(n)?n:0).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtS=s=>s>=90?fmt(s/60,1)+' min':fmt(s,1)+' s';
const uid=p=>(p||'x')+Math.random().toString(36).slice(2,8);
const short=(t,n)=>{t=String(t||'');return t.length>n?t.slice(0,n-1)+'…':t;};
function secById(id){return S.sections.find(s=>s.id===id);}
function findVar(vid){for(const s of S.sections){const v=s.variants.find(x=>x.id===vid);if(v)return {sec:s,v};}return null;}
function bById(id){return S.bausteine.find(b=>b.id===id);}
function zoneByKey(k){return S.zones.find(z=>z.key===k);}
function zoneById(id){return S.zones.find(z=>z.id===id);}
function keyedZones(){return S.zones.filter(z=>z.key);}
function zoneKeys(){return keyedZones().map(z=>z.key).sort((a,b)=>a.localeCompare(b,'de'));}
let toastT=null;
function toast(msg){const t=$('#toast');t.textContent=msg;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,2600);}

@@ENGINE@@

/* ---------- Formular-Bausteine (einheitlich für alle Inspektoren) ---------- */
let CL={},CH={},MCL={},MCH={},REG='main',BC=0;
const regC=()=>REG==='modal'?MCL:CL, regH=()=>REG==='modal'?MCH:CH;
function B(label,fn,o={}){const k='b'+(++BC);regC()[k]=fn;return `<button type="button" data-c="${k}" class="${o.cls||''}"${o.dis?' disabled':''}${o.title?` title="${esc(o.title)}"`:''}${o.id?` id="${o.id}"`:''}>${label}</button>`;}
function clk(fn){const k='b'+(++BC);regC()[k]=fn;return `data-c="${k}"`;}
function I(id,val,fn,o={}){if(fn)regH()[id]=fn;return `<input type="${o.type||'text'}" id="${id}" value="${esc(val)}"${o.mono?' class="f"':''}${o.ph!=null?` placeholder="${esc(o.ph)}"`:''}${o.style?` style="${o.style}"`:''}${o.title?` title="${esc(o.title)}"`:''}${o.ro?' readonly':''} autocomplete="off">`;}
function SEL(id,opts,cur,fn,o={}){regH()[id]=fn;return `<select id="${id}"${o.style?` style="${o.style}"`:''}>${typeof opts==='string'?opts:opts.map(([v,l])=>`<option value="${esc(v)}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;}
function TA(id,val,fn,rows=2,o={}){regH()[id]=fn;return `<textarea id="${id}" rows="${rows}"${o.mono?' class="f"':''}${o.ph?` placeholder="${esc(o.ph)}"`:''}>${esc(val)}</textarea>`;}
function CHK(id,label,checked,fn){regH()[id]=fn;return `<label class="chk"><input type="checkbox" id="${id}"${checked?' checked':''}> ${label}</label>`;}
function F(label,ctrl,o={}){return `<label class="f${o.full?' full':''}"><span>${label}</span>${ctrl}${o.calc!=null?`<span class="calc">${o.calc}</span>`:''}</label>`;}
function GRP(id,title,count,body,open){const isOpen=UI.paramOpen['g:'+id]??open;return `<details class="grp" id="g-${id}"${isOpen?' open':''}><summary>${title}${count!=null?` <span class="cnt">(${count})</span>`:''}</summary>${body}</details>`;}
function insHead(kicker,title,onClose){return `<div class="ih"><div><div class="kicker">${kicker}</div><h2>${esc(title)}</h2></div>${onClose?B('×',onClose,{cls:'x',title:'Auswahl aufheben (Esc)'}):''}</div>`;}
function lineSwatch(sec){const da=sec.dash==='dash'?'5 3':sec.dash==='dot'?'1.5 2.5':'0';return `<svg width="26" height="10" aria-hidden="true" style="flex:none"><line x1="1" y1="5" x2="25" y2="5" stroke="${sec.color}" stroke-width="3" stroke-dasharray="${da}"/></svg>`;}
function varOptions(cur,filter){return S.sections.map(s=>`<optgroup label="${esc(s.name)}">${s.variants.filter(v=>!filter||filter(s,v)).map(v=>`<option value="${v.id}"${v.id===cur?' selected':''}>${esc(v.name)}</option>`).join('')}</optgroup>`).join('');}
function keyOptions(cur){const ks=zoneKeys();if(cur&&!ks.includes(cur))ks.unshift(cur);return ks.map(k=>[k,k+' · '+short((zoneByKey(k)||{}).name||'unbekannt',34)]);}
function bstOptions(cur){return CATS.map(([c])=>`<optgroup label="${esc(c)}">${S.bausteine.filter(b=>b.cat===c).map(b=>`<option value="${esc(b.id)}"${b.id===cur?' selected':''}>${esc(b.id)} · ${esc(short(b.name,40))}</option>`).join('')}</optgroup>`).join('')+(bById(cur)||!cur?'':`<option value="${esc(cur)}" selected>${esc(cur)} (unbekannt)</option>`);}

/* ---------- Verlauf: Rückgängig / Wiederholen ---------- */
const HIST={u:[],r:[],last:null};
function commit(){
  const now=JSON.stringify(S);if(now===HIST.last)return;
  HIST.u.push(HIST.last);if(HIST.u.length>100)HIST.u.shift();HIST.r=[];
  S.meta.updated=new Date().toISOString();HIST.last=JSON.stringify(S);
  markDirty();
}
function edit(fn){fn();commit();later();}
function undo(){if(!HIST.u.length)return;HIST.r.push(HIST.last);HIST.last=HIST.u.pop();S=JSON.parse(HIST.last);afterLoad();markDirty();toast('Rückgängig gemacht');later();}
function redo(){if(!HIST.r.length)return;HIST.u.push(HIST.last);HIST.last=HIST.r.pop();S=JSON.parse(HIST.last);afterLoad();markDirty();toast('Wiederhergestellt');later();}
function afterLoad(){normalize();if(UI.sel&&!selValid())UI.sel=null;}
function selValid(){const s=UI.sel;if(!s)return true;
  if(s.k==='zone')return !!zoneById(s.id);
  if(s.k==='flow'){const f=findVar(s.vid);return !!(f&&f.v.flows.find(x=>x.id===s.fid));}
  if(s.k==='step'){const f=findVar(s.vid);return !!(f&&f.v.steps.find(x=>x.id===s.sid));}
  if(s.k==='sec')return !!secById(s.id);
  if(s.k==='bst')return !!bById(s.id);
  if(s.k==='var')return !!findVar(s.vid);
  return false;}

/* ---------- Persistenz ---------- */
let saveTimer=null;
function markDirty(){UI.dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(LS_KEY,JSON.stringify(S));}catch(e){}},300);}
function loadInitial(){
  let emb=null;try{const t=$('#state').textContent.trim();if(t)emb=JSON.parse(t);}catch(e){}
  let loc=null;try{const t=localStorage.getItem(LS_KEY);if(t)loc=JSON.parse(t);}catch(e){}
  S=emb||buildSeed();
  if(loc&&loc.meta&&loc.sections&&(!emb||new Date(loc.meta.updated)>new Date(emb.meta.updated))){S=loc;UI.dirty=true;setTimeout(()=>toast('Lokaler Entwurf geladen – noch nicht im Artefakt gespeichert'),300);}
  normalize();HIST.last=JSON.stringify(S);
  try{const u=JSON.parse(localStorage.getItem(LS_UI)||'{}');if(u.hintOff)UI.hintOff=true;}catch(e){}
}
function normalize(){
  S.meta=Object.assign({name:'Zentrallager UK Essen – Prozessmodell',sub:'Uniklinik Essen · Halle 8 · Greyfield ARC'},S.meta||{});
  if(!S.meta.sub)S.meta.sub='Uniklinik Essen · Halle 8 · Greyfield ARC';
  if(S.method==null)S.method=METHOD_HTML;
  S.settings=Object.assign({aisleY:26.5,zv:10,ze:5,showRacks:true,showPlan:true,planOp:0.85},S.settings||{});
  S.order=Object.assign({nP:6,nF:8},S.order||{});
  S.sections.forEach(s=>{if(!s.dash)s.dash='solid';if(!s.color)s.color=U.blue;
    s.variants.forEach(v=>{v.flows=v.flows||[];v.params=v.params||[];v.lanes=v.lanes||[];v.steps=v.steps||[];v.flows.forEach(f=>{if(!f.id)f.id=uid('f');});v.steps.forEach(st=>{st.el=st.el||[];st.id=String(st.id);});});
    if(!s.variants.find(v=>v.id===s.baseline))s.baseline=s.variants[0]&&s.variants[0].id;});
  S.sections=S.sections.filter(s=>s.variants.length);
  if(!findVar(UI.vid))UI.vid=S.sections[0].variants[0].id;
  if(!UI.overlay)UI.overlay=new Set(S.sections.map(s=>s.baseline));
  if(!UI.flowVid||!findVar(UI.flowVid))UI.flowVid=UI.vid;
}
function buildDocument(){
  const json=JSON.stringify(S).replace(/</g,'\\u003c');
  const page=PAGE_TPL.replace(/(<script type="application\/json" id="state">)([\s\S]*?)(<\/script>)/,(m,a,b,c)=>a+json+c);
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+HEAD_STYLE+'</style></head><body>'+page+'</body></html>';
}
async function saveToArtifact(){
  if(!UI.art){openExportText(JSON.stringify(S,null,1),'prozessmodell_zentrallager.json','Dauerhaftes Speichern ist in dieser Ansicht nicht verfügbar. Sichern Sie den Stand als JSON und spielen Sie ihn später über „Import“ wieder ein.');return;}
  if(UI.readOnly){openExportText(JSON.stringify(S,null,1),'prozessmodell_zentrallager.json','Sie haben keine Schreibrechte für dieses Artefakt. Sichern Sie Ihren Stand als JSON.');return;}
  try{S.meta.updated=new Date().toISOString();toast('Speichere …');await UI.art.publish(buildDocument());try{localStorage.removeItem(LS_KEY);}catch(e){}UI.dirty=false;toast('Stand im Artefakt gespeichert');later();}
  catch(e){const c=String(e&&(e.code||e.name||e.message));
    if(c.includes('conflict'))toast('Jemand hat zwischenzeitlich gespeichert – die Seite lädt den neuen Stand. Ihr Entwurf bleibt lokal erhalten.');
    else if(/not_granted|not_writer/.test(c)){UI.readOnly=true;later();openExportText(JSON.stringify(S,null,1),'prozessmodell_zentrallager.json','Sie haben keine Schreibrechte für dieses Artefakt. Sichern Sie Ihren Stand als JSON.');}
    else toast('Speichern fehlgeschlagen ('+c+'). Bitte erneut versuchen oder als JSON exportieren.');}
}
async function initCaps(){
  try{if(window.claude&&window.claude.use){
    window.claude.use('artifact').then(a=>{UI.art=a;later();}).catch(()=>{});
    window.claude.use('downloads').then(d=>{UI.dl=d;}).catch(()=>{});
  }}catch(e){}
}

/* ---------- Rendern ---------- */
let rafPending=false;
function later(){if(!rafPending){rafPending=true;requestAnimationFrame(render);}}
function render(){
  rafPending=false;
  const ae=document.activeElement;const fid=ae&&ae.id&&!ae.closest('#modal')?ae.id:null;let ss=null,se=null;
  try{if(ae&&'selectionStart' in ae){ss=ae.selectionStart;se=ae.selectionEnd;}}catch(e){}
  const scr={};['panelBody','main','inspector'].forEach(id=>{const el=document.getElementById(id);if(el)scr[id]=el.scrollTop;});
  const keep={};document.querySelectorAll('[data-keep]').forEach(el=>keep[el.dataset.keep]=[el.scrollLeft,el.scrollTop]);
  document.querySelectorAll('details.grp').forEach(d=>UI.paramOpen['g:'+d.id.slice(2)]=d.open);
  CL={};CH={};REG='main';
  if(UI.sel&&!selValid())UI.sel=null;
  renderTop();renderRail();
  const W=WS[UI.ws];
  $('#panelBody').innerHTML=W.panel();
  $('#main').innerHTML=W.main();
  const ins=W.insp?W.insp():null;
  document.body.classList.toggle('noinsp',ins==null);
  $('#inspector').hidden=ins==null;if(ins!=null)$('#inspector').innerHTML=ins;
  renderHint();
  Object.entries(scr).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.scrollTop=v;});
  document.querySelectorAll('[data-keep]').forEach(el=>{const k=keep[el.dataset.keep];if(k){el.scrollLeft=k[0];el.scrollTop=k[1];}});
  if(W.after)W.after();
  if(fid){const el=document.getElementById(fid);if(el&&el!==document.activeElement){try{el.focus({preventScroll:true});if(ss!=null&&el.setSelectionRange)el.setSelectionRange(ss,se);}catch(e){}}}
}
function renderTop(){
  $('#prjName').textContent=S.meta.sub;
  $('#bUndo').disabled=!HIST.u.length;$('#bRedo').disabled=!HIST.r.length;
  const b=$('#saveState');b.className='badge'+(UI.dirty?' dirty':'');
  b.textContent=UI.readOnly?'Nur lesen':UI.dirty?'Nicht gespeichert':'Gespeichert';
}
const ICONS={
  layout:'<rect x="3" y="4" width="18" height="16"/><path d="M3 10h7v10M10 4v6M14 14h7M17 14v6"/>',
  proc:'<circle cx="4.5" cy="12" r="2"/><rect x="8.5" y="9" width="6" height="6" rx="1"/><path d="M6.5 12h2M14.5 12h2"/><path d="M19.5 9l3 3-3 3-3-3z"/>',
  cmp:'<path d="M5 20V11M10 20V5M15 20v-6M20 20V8M3 20h19"/>',
  order:'<path d="M3 5h8M7 10h9M12 15h9M3 20h18"/>',
  lib:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9.5 2.5h5"/>',
  method:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>'
};
function renderRail(){
  const items=[['layout','Layout &amp; Fluss','1'],['proc','Prozesse','2'],['cmp','Vergleich','3'],['order','Auftrag','4'],['lib','Zeit­bausteine','5'],null,['method','Methodik','']];
  $('#rail').innerHTML=items.map(it=>it?`<button type="button" class="${UI.ws===it[0]?'on':''}" ${clk(()=>setWs(it[0]))} title="${it[1].replace('&amp;','&').replace('­','')}">${it[2]?`<span class="step">${it[2]}</span>`:''}<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[it[0]]}</svg>${it[1]}</button>`:'<hr>').join('');
}
const HINTS={
  layout:()=>UI.tool==='flow'?(UI.flowStart?`<span><b>Fluss zeichnen:</b> jetzt die <b>Zielfläche</b> anklicken. Esc bricht ab.</span>`:`<span><b>Fluss zeichnen:</b> zuerst die <b>Startfläche</b> im Plan anklicken.</span>`)
    :UI.tool==='move'?`<span><b>Verschieben:</b> Fläche ziehen, Größe am Eckpunkt ändern. Wege und Zeiten rechnen sofort neu.</span>`
    :`<span><b>Links</b> Werkzeug und Ansicht wählen · <b>Plan</b> Fläche oder Fluss anklicken · <b>rechts</b> bearbeiten</span>`,
  proc:()=>`<span><b>Links</b> Variante wählen · <b>Diagramm</b> Schritt anklicken · <b>rechts</b> Bausteine, Mengen und Ablauf bearbeiten</span>`,
  cmp:()=>`<span><b>Links</b> Abschnitt wählen · Variante anklicken · <b>rechts</b> Parameter ändern und Wirkung sofort sehen</span>`,
  order:()=>`<span><b>Links</b> Mengen und Varianten wählen · Abschnitt anklicken, um ihn <b>rechts</b> zu bearbeiten</span>`,
  lib:()=>`<span><b>Tabelle</b> Zeitbaustein anklicken · <b>rechts</b> TMU, Sekunden und Quelle ändern</span>`,
  method:()=>`<span><b>Text bearbeiten</b> links einschalten, dann direkt im Dokument schreiben</span>`
};
function renderHint(){const h=$('#hint');const forced=UI.ws==='layout'&&UI.tool!=='select';if(UI.hintOff&&!forced){h.hidden=true;return;}h.hidden=false;
  h.innerHTML=HINTS[UI.ws]()+`<span style="color:#BDC6D1">Strg+Z rückgängig</span>`+(forced?'':`<button type="button" ${clk(()=>{UI.hintOff=true;try{localStorage.setItem(LS_UI,JSON.stringify({hintOff:true}));}catch(e){}later();})} title="Hinweis ausblenden" aria-label="Hinweis ausblenden">×</button>`);}
function setWs(ws){
  if(UI.ws===ws)return;UI.ws=ws;UI.sel=null;UI.flowStart=null;
  if(ws!=='layout')UI.tool='select';
  if(ws==='cmp'){const f=findVar(UI.vid);if(f)UI.cmpSec=f.sec.id;}
  try{if(location.hash!=='#'+ws)history.replaceState(null,'','#'+ws);}catch(e){}
  $('#main').scrollTop=0;$('#panelBody').scrollTop=0;$('#inspector').scrollTop=0;
  render();
}
function openVariant(vid,sel){UI.vid=vid;UI.ws='proc';UI.sel=sel||null;UI.tool='select';try{history.replaceState(null,'','#proc');}catch(e){}render();}

/* ===================== Hallenplan (gemeinsamer Zeichner) ===================== */
function flowsFor(vids){const out=[];S.sections.forEach(sec=>sec.variants.forEach(v=>{if(vids.has(v.id))v.flows.forEach(f=>out.push({sec,v,f}));}));return out;}
function planSvg(opts){
  const plan=S.settings.showPlan&&PLAN_URL;
  const fl=flowsFor(opts.vids);
  let vb={x:PLAN.x,y:PLAN.y,w:PLAN.w,h:PLAN.h};
  if(!plan)vb={x:-3,y:-3,w:189,h:56};
  if(opts.crop&&fl.length){
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
    fl.forEach(o=>{const a=zoneByKey(o.f.from),b=zoneByKey(o.f.to);if(!a||!b)return;[a,b].forEach(z=>{x0=Math.min(x0,z.x);y0=Math.min(y0,z.y);x1=Math.max(x1,z.x+z.w);y1=Math.max(y1,z.y+z.h);});
      routePts(a,b,o.f.route,o.f.viaY).forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x);y1=Math.max(y1,p.y);});});
    if(x0<1e9){const m=4;x0-=m;y0-=m;x1+=m;y1+=m;
      if(x1-x0<45){const c=(x0+x1)/2;x0=c-22.5;x1=c+22.5;}
      const R=3.2;if((x1-x0)/(y1-y0)<R){const c=(x0+x1)/2,w=(y1-y0)*R;x0=c-w/2;x1=c+w/2;}else{const c=(y0+y1)/2,h=(x1-x0)/R;y0=c-h/2;y1=c+h/2;}
      vb={x:x0,y:y0,w:x1-x0,h:y1-y0};}
  }
  const id=opts.id||'m';
  const k=Math.max(0.4,Math.min(1.4,vb.w/150));const kt=Math.min(1,k*1.15);
  const selZ=opts.interactive&&UI.sel&&UI.sel.k==='zone'?UI.sel.id:null;
  const selF=opts.interactive&&UI.sel&&UI.sel.k==='flow'?UI.sel.fid:null;
  const startZ=opts.interactive&&UI.tool==='flow'?UI.flowStart:null;
  const zones=S.zones.filter(z=>!plan?(S.settings.showRacks||z.type!=='rack'):z.type!=='rack');
  const cls=opts.interactive?(UI.tool==='move'?'move':UI.tool==='flow'?'flow':''):'';
  let s=`<svg ${opts.id?`id="${opts.id}"`:''} class="${cls}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" width="${opts.width}" xmlns="http://www.w3.org/2000/svg" style="display:block;font-family:Arial,Helvetica,sans-serif" role="img" aria-label="Hallenplan mit Materialflüssen">
  <defs>${S.sections.map(sc=>`<marker id="ar_${id}_${sc.id}" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${sc.color}"/></marker>`).join('')}
  <pattern id="hatch_${id}" width="0.6" height="0.6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="0.6" height="0.6" fill="#DCE3E8"/><line x1="0" y1="0" x2="0" y2="0.6" stroke="#BDC6D1" stroke-width="0.18"/></pattern></defs>
  <rect class="bg" x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="#fff"/>`;
  if(plan)s+=`<image href="${PLAN_URL}" x="${PLAN.x}" y="${PLAN.y}" width="${PLAN.w}" height="${PLAN.h}" preserveAspectRatio="none" opacity="${S.settings.planOp}" pointer-events="none"/>`;
  else{s+=`<rect x="0" y="0" width="168" height="48" fill="#fff" stroke="#4A4A4A" stroke-width="0.25" pointer-events="none"/>`;
    for(let i=0;i<=17;i++){const x=8.1+i*6.25;if(x>168)break;s+=`<line x1="${x}" y1="-1.5" x2="${x}" y2="48.5" stroke="#BDC6D1" stroke-width="0.06" stroke-dasharray="0.6 0.4"/><text x="${x}" y="-1.8" font-size="0.9" text-anchor="middle" fill="#2D7694">3.${i+1}</text>`;}}
  zones.forEach(z=>{
    const [f,st]=ZTYPE[z.type]||ZTYPE.sonst;const sel=selZ===z.id||startZ===z.id;
    let fill=plan?'transparent':(z.type==='rack'?`url(#hatch_${id})`:f),stroke=st,sw=plan?0.16:0.12,op=1;
    if(z.type==='dock'){fill=DOCKCOL[z.func]||DOCKCOL.frei;stroke='#fff';sw=0.15;op=plan?0.88:1;}
    if(z.type==='lane'){fill=plan?'rgba(20,68,119,0.10)':'#e3e9f1';stroke=U.blue;}
    if(plan&&z.type==='verkehr'){stroke='none';}
    if(plan&&['lager','office','sonst'].includes(z.type)){stroke=U.mgrey;sw=0.1;}
    if(plan&&['we','wa','kons','waesche','apo','puffer'].includes(z.type)){fill=st+'1f';}
    if(startZ===z.id){fill='rgba(10,150,122,0.22)';}
    const pe=!opts.interactive?'none':(plan&&z.type==='verkehr'&&UI.tool!=='move')?'none':'all';
    s+=`<g class="zone" data-id="${z.id}"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${fill}" fill-opacity="${op}" stroke="${sel?U.petrol:stroke}" stroke-width="${sel?0.45:sw}" ${z.type==='puffer'?'stroke-dasharray="0.7 0.35"':''} pointer-events="${pe}"><title>${esc(z.name)}${z.key?' ['+esc(z.key)+']':''}</title></rect>`;
    if(z.type==='dock'){s+=`<text x="${z.x+z.w/2}" y="${z.y+z.h/2-0.25*kt}" font-size="${0.95*kt}" font-weight="700" text-anchor="middle" fill="#fff">${esc(z.key)}</text><text x="${z.x+z.w/2}" y="${z.y+z.h/2+0.85*kt}" font-size="${0.55*kt}" text-anchor="middle" fill="#fff">${esc((z.func||'').slice(0,7))}</text>`;}
    else if(z.type==='lane'){if(!plan||opts.interactive)s+=`<text x="${z.x+0.4}" y="${z.y+z.h*0.78}" font-size="0.65" fill="${U.blue}" font-weight="700">${esc(z.name)}</text>`;}
    else if(z.type!=='rack'&&z.type!=='verkehr'&&z.key&&plan){
      const t=z.key;const w=(t.length*0.62+0.8)*kt;
      s+=`<g><rect x="${z.x+0.3*kt}" y="${z.y+0.3*kt}" width="${w}" height="${1.3*kt}" rx="${0.15*kt}" fill="${st}" pointer-events="none"/><text x="${z.x+0.3*kt+w/2}" y="${z.y+1.25*kt}" font-size="${0.85*kt}" font-weight="700" text-anchor="middle" fill="#fff">${esc(t)}</text></g>`;}
    else if(!plan&&z.type!=='rack'&&z.h>=2){
      const fs=Math.max(0.55,Math.min(1.1,Math.min(z.w/(String(z.name).length*0.55),z.h/2.2)));
      s+=`<text x="${z.x+0.5}" y="${z.y+0.5+fs}" font-size="${fs}" fill="${U.blue}" font-weight="700">${esc(z.name)}</text>`;
      if(z.key)s+=`<text x="${z.x+0.5}" y="${z.y+1.2+fs*2}" font-size="${Math.min(fs,0.8)}" fill="${U.text}">[${esc(z.key)}] ${fmt(z.w*z.h,0)} m²</text>`;}
    if(selZ===z.id&&UI.tool==='move')s+=`<rect class="rh" data-id="${z.id}" x="${z.x+z.w-0.9}" y="${z.y+z.h-0.9}" width="1.2" height="1.2" fill="${U.petrol}" style="cursor:nwse-resize"/>`;
    s+=`</g>`;
  });
  if(opts.interactive&&UI.showAnchors)keyedZones().forEach(z=>{if(z.type==='lane')return;const a=anchor(z);s+=`<circle cx="${a.x}" cy="${a.y}" r="0.3" fill="${U.navy}" opacity="0.6" pointer-events="none"/>`;});
  fl.forEach((o,i)=>{
    const a=zoneByKey(o.f.from),b=zoneByKey(o.f.to);if(!a||!b)return;
    const off=((i%5)-2)*0.34;
    const raw=routePts(a,b,o.f.route,o.f.viaY);
    const pts=raw.map((p,j,arr)=>({x:p.x+(j>0&&j<arr.length-1?off:0),y:p.y+(j>0&&j<arr.length-1?off:0)}));
    const d='M'+pts.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(' L');
    const len=plen(raw);const da=DASHES[o.sec.dash]||DASHES.solid;const isSel=selF===o.f.id;
    const fade=selF&&!isSel?0.35:1;
    s+=`<path d="${d}" class="flowline" stroke="${isSel?U.petrol:'#fff'}" stroke-width="${(isSel?1.3:0.85)*k}" opacity="${0.95*fade}" pointer-events="none"/>`;
    s+=`<path d="${d}" class="flowline fa-${o.sec.dash||'solid'}" stroke="${o.sec.color}" stroke-width="${0.5*k}" stroke-dasharray="${da}" marker-end="url(#ar_${id}_${o.sec.id})" opacity="${fade}" pointer-events="none"/>`;
    if(opts.interactive&&UI.tool==='select')s+=`<path d="${d}" class="fhit" data-vid="${o.v.id}" data-fid="${o.f.id}" stroke-width="${1.8*k}"><title>${esc(o.sec.name)} · ${esc(o.v.name)}\n${esc(o.f.label)} (${esc(o.f.mittel)}): ${fmt(len,1)} m – anklicken zum Bearbeiten</title></path>`;
    let best=1,bl=-1;for(let j=1;j<pts.length;j++){const l=Math.abs(pts[j].x-pts[j-1].x)+Math.abs(pts[j].y-pts[j-1].y);if(l>bl){bl=l;best=j;}}
    const mx=(pts[best].x+pts[best-1].x)/2,my=(pts[best].y+pts[best-1].y)/2;
    const lab=(opts.numbered?(i+1)+' · ':'')+fmt(len,0)+' m';const lw=(lab.length*0.5+0.8)*k;
    s+=`<g pointer-events="none" opacity="${fade}"><rect x="${mx-lw/2}" y="${my-0.65*k}" width="${lw}" height="${1.3*k}" rx="${0.3*k}" fill="${isSel?U.petrol:o.sec.color}"/><text x="${mx}" y="${my+0.33*k}" font-size="${0.85*k}" text-anchor="middle" fill="#fff" font-weight="700">${lab}</text></g>`;
  });
  return s+'</svg>';
}
function flowLegend(vids,numbered){
  const fl=flowsFor(vids);if(!fl.length)return '<div class="note">Für diese Auswahl sind keine Materialflüsse hinterlegt.</div>';
  return `<div class="tw"><table class="t"><tr>${numbered?'<th>Nr.</th>':''}<th>Abschnitt</th><th>Fluss</th><th>Fördermittel</th><th class="n">Weg</th></tr>${fl.map((o,i)=>{let d='–';try{d=fmt(dist(o.f.from,o.f.to,o.f.route,o.f.viaY),1)+' m';}catch(e){}
    return `<tr class="click" ${clk(()=>{UI.overlay.add(o.v.id);UI.ws='layout';UI.tool='select';UI.sel={k:'flow',vid:o.v.id,fid:o.f.id};try{history.replaceState(null,'','#layout');}catch(e){}render();})} title="Im Layout bearbeiten">${numbered?`<td>${i+1}</td>`:''}<td><span class="row nw">${lineSwatch(o.sec)}${esc(o.sec.name)}</span></td><td>${esc(o.f.from)} → ${esc(o.f.to)}: ${esc(o.f.label)}</td><td>${esc(o.f.mittel)}</td><td class="n">${d}</td></tr>`;}).join('')}</table></div>`;
}

/* ===================== 1 LAYOUT & MATERIALFLUSS ===================== */
const WS={};
WS.layout={
  panel(){
    const types=[['','Alle Typen'],...Object.entries(ZTYPE_LABEL)];
    const q=UI.zoneQ.toLowerCase();
    const list=S.zones.filter(z=>(UI.zoneType?z.type===UI.zoneType:z.type!=='rack')&&(!q||(z.name+' '+(z.key||'')).toLowerCase().includes(q)));
    const selZ=UI.sel&&UI.sel.k==='zone'?UI.sel.id:null;
    return `<div class="ph"><h2>Layout &amp; Materialfluss</h2></div>
    <p class="lead">Halle 8 mit Flächen, Docks und Wegen. Alle Wege der Zeitformeln kommen aus diesem Plan.</p>
    <h3>Werkzeug</h3>
    <div class="seg">${[['select','Auswählen'],['move','Verschieben'],['flow','Fluss zeichnen']].map(([k,l])=>B(l,()=>{UI.tool=k;UI.flowStart=null;later();},{cls:UI.tool===k?'on':''})).join('')}</div>
    ${UI.tool==='flow'?`<div class="fg c1" style="margin-top:8px">${F('Neuer Fluss gehört zu Variante',SEL('p-flowvid',varOptions(UI.flowVid),UI.flowVid,v=>{UI.flowVid=v;UI.overlay.add(v);later();}))}</div>`:''}
    <div class="actions" style="margin-top:8px">${B('+ Fläche anlegen',addZone)}</div>
    <h3>Darstellung</h3>
    ${CHK('p-plan','Hallenplan als Hintergrund',S.settings.showPlan,v=>edit(()=>S.settings.showPlan=v))}
    ${S.settings.showPlan?`<label class="chk">Deckkraft <input type="range" id="p-op" min="0.2" max="1" step="0.05" value="${S.settings.planOp}" style="flex:1"></label>`:CHK('p-racks','Regale zeigen',S.settings.showRacks,v=>edit(()=>S.settings.showRacks=v))}
    ${CHK('p-anch','Ankerpunkte (Übergabepunkte) zeigen',UI.showAnchors,v=>{UI.showAnchors=v;later();})}
    ${GRP('lzones','Flächen',list.length,`<div class="fg">${F('Suchen',I('p-zq',UI.zoneQ,v=>{UI.zoneQ=v;later();},{type:'search',ph:'Name oder Schlüssel'}))}${F('Typ',SEL('p-zt',types,UI.zoneType,v=>{UI.zoneType=v;later();}))}</div>
    <div class="list">${list.map(z=>{const [f,st]=ZTYPE[z.type]||ZTYPE.sonst;const c=z.type==='dock'?(DOCKCOL[z.func]||U.mgrey):st;
      return `<div class="li${selZ===z.id?' on':''}" ${clk(()=>{UI.sel={k:'zone',id:z.id};later();})}><span class="sw" style="background:${c}"></span><span class="t">${esc(z.name)}</span>${z.key?`<span class="pill">${esc(z.key)}</span>`:''}</div>`;}).join('')||'<div class="li"><span class="t note">Keine Fläche gefunden.</span></div>'}</div>`,true)}
    ${GRP('lflows','Materialflüsse einblenden',UI.overlay.size+' an',`<div class="row" style="margin-bottom:6px">${B('Basisvarianten',()=>{UI.overlay=new Set(S.sections.map(s=>s.baseline));later();},{cls:'mini'})}${B('Alle',()=>{UI.overlay=new Set(S.sections.flatMap(s=>s.variants.map(v=>v.id)));later();},{cls:'mini'})}${B('Keine',()=>{UI.overlay=new Set();later();},{cls:'mini'})}</div>
    ${S.sections.map(s=>`<div style="margin:6px 0 2px;font-weight:700;color:var(--accent);font-size:12px" class="row nw">${lineSwatch(s)}<span>${esc(s.name)}</span></div>${s.variants.map(v=>CHK('ov-'+v.id,`<span style="font-size:12px">${esc(short(v.name,44))}</span>`,UI.overlay.has(v.id),c=>{c?UI.overlay.add(v.id):UI.overlay.delete(v.id);later();})).join('')}`).join('')}`,true)}`;
  },
  main(){
    return `<div class="toolbar">
      <div class="zoom">${B('−',()=>{UI.zoom=Math.max(0.4,UI.zoom/1.25);later();},{title:'Verkleinern'})}<span>${Math.round(UI.zoom*100)} %</span>${B('+',()=>{UI.zoom=Math.min(5,UI.zoom*1.25);later();},{title:'Vergrößern'})}</div>
      ${B('Einpassen',fitPlan,{cls:'mini'})}
      <span class="sp"></span>
      <span class="note">${UI.tool==='select'?'Klick auf Fläche oder Flusslinie wählt aus':UI.tool==='move'?'Fläche ziehen · Eckpunkt ändert die Größe':'Start- und Zielfläche nacheinander anklicken'}</span>
    </div>
    <div class="canvas" id="layCanvas" data-keep="lay">${planSvg({vids:UI.overlay,id:'laySvg',width:Math.round(1500*UI.zoom),interactive:true})}</div>
    <div class="legend">${S.sections.map(s=>`<span>${lineSwatch(s)}${esc(s.name)}</span>`).join('')}</div>
    <div class="note">Hintergrund: Plan „Nutzungsplanung Apotheke und Dez 03“, Greyfield ARC Hallen 7 und 8, Stand 17.11.2026, Maßstab 1:100, auf Meter kalibriert (Achsraster 6,25 m). Wege werden rechtwinklig zwischen den Ankerpunkten gemessen, über den Hauptverkehrsweg bei y = ${fmt(S.settings.aisleY,1)} m.</div>`;
  },
  insp(){
    const s=UI.sel;
    if(s&&s.k==='zone')return zoneInspector(zoneById(s.id));
    if(s&&s.k==='flow'){const f=findVar(s.vid);return flowInspector(f.sec,f.v,f.v.flows.find(x=>x.id===s.fid));}
    return hallInspector();
  },
  after(){bindPlan();const op=$('#p-op');if(op)op.oninput=e=>{S.settings.planOp=parseNum(e.target.value);const im=document.querySelector('#laySvg image');if(im)im.setAttribute('opacity',S.settings.planOp);};if(op)op.onchange=()=>{commit();later();};}
};
function fitPlan(){const c=$('#layCanvas');if(!c)return;UI.zoom=Math.max(0.4,Math.min(5,(c.clientWidth-4)/1500));later();}
function addZone(){edit(()=>{let n=1;while(zoneByKey('NEU'+n))n++;const z={id:uid('z_'),key:'NEU'+n,name:'Neue Fläche',type:'sonst',x:60,y:38,w:8,h:6};S.zones.push(z);UI.sel={k:'zone',id:z.id};UI.tool='move';});toast('Fläche angelegt – im Plan an die richtige Stelle ziehen');}
function zoneUsage(key){let flows=0,formulas=0;if(!key)return {flows,formulas};const re=new RegExp("['\"]"+key.replace(/\W/g,'')+"['\"]");
  S.sections.forEach(s=>s.variants.forEach(v=>{v.flows.forEach(f=>{if(f.from===key||f.to===key)flows++;});v.steps.forEach(st=>{st.el.forEach(e=>{if(re.test(String(e[1])))formulas++;});if(st.wait&&re.test(String(st.wait)))formulas++;});}));return {flows,formulas};}
function zoneInspector(z){
  const a=anchor(z);const u=zoneUsage(z.key);const p='z-'+z.id+'-';
  const setN=(k,min)=>v=>edit(()=>{z[k]=Math.max(min,parseNum(v));});
  const setOpt=k=>v=>edit(()=>{z[k]=String(v).trim()===''?'':parseNum(v);});
  return insHead('Fläche · '+(ZTYPE_LABEL[z.type]||z.type),z.name,()=>{UI.sel=null;later();})+
  `<div class="fg">
    ${F('Name',I(p+'name',z.name,v=>edit(()=>z.name=v)),{full:true})}
    ${F('Schlüssel (für Formeln)',I(p+'key',z.key,v=>setKey(z,v),{mono:true,ph:'z. B. PAL'}))}
    ${F('Typ',SEL(p+'type',Object.entries(ZTYPE_LABEL),z.type,v=>edit(()=>z.type=v)))}
    ${z.type==='dock'||z.type==='lane'?F('Funktion',SEL(p+'func',Object.keys(DOCKCOL).map(k=>[k,k]),z.func||'frei',v=>edit(()=>z.func=v)),{full:true}):''}
    ${F('x [m]',I(p+'x',fmt(z.x,1),setN('x',-50)))}${F('y [m]',I(p+'y',fmt(z.y,1),setN('y',-50)))}
    ${F('Breite [m]',I(p+'w',fmt(z.w,1),setN('w',0.3)))}${F('Tiefe [m]',I(p+'h',fmt(z.h,1),setN('h',0.3)))}
  </div>
  <div class="note">Fläche ${fmt(z.w*z.h,1)} m²${z.key?` · verwendet in ${u.flows} Flüssen und ${u.formulas} Formeln`:''}</div>
  ${GRP('anchor','Anker und Gassen',null,`<div class="fg">
    ${F('Anker x [m]',I(p+'ax',z.ax==null?'':z.ax,setOpt('ax'),{ph:'auto '+fmt(a.x,1)}))}${F('Anker y [m]',I(p+'ay',z.ay==null?'':z.ay,setOpt('ay'),{ph:'auto '+fmt(a.y,1)}))}
    ${F('Gassen',I(p+'aisles',z.aisles==null?'':z.aisles,setOpt('aisles'),{ph:'–'}))}${F('Ganglänge [m]',I(p+'gLen',z.gLen==null?'':z.gLen,setOpt('gLen'),{ph:'= Breite'}))}
  </div><div class="note">Der Anker ist der Übergabepunkt, an dem Wege beginnen und enden. Leer = automatisch an der Kante zum Hauptgang. Gassen und Ganglänge nutzt <code>sshape('${esc(z.key||'KEY')}',n)</code> für den Kommissionierweg.</div>`,true)}
  <div class="actions">${B('Duplizieren',()=>edit(()=>{let k=z.key?z.key+'2':'';while(k&&zoneByKey(k))k+='2';const n=Object.assign({},z,{id:uid('z_'),key:k,x:z.x+1,y:z.y+1,name:z.name+' (Kopie)'});S.zones.push(n);UI.sel={k:'zone',id:n.id};}))}
  ${B('Löschen',()=>edit(()=>{S.zones=S.zones.filter(x=>x!==z);UI.sel=null;toast('Fläche gelöscht – Strg+Z holt sie zurück');}),{cls:'danger',title:'Entf'})}</div>
  ${u.flows||u.formulas?`<div class="note" style="margin-top:8px">Hinweis: Wird die Fläche gelöscht, rechnen Formeln mit ihrem Schlüssel nicht mehr.</div>`:''}`;
}
function setKey(z,v){
  v=String(v).trim().replace(/[^A-Za-z0-9_]/g,'');
  if(v&&S.zones.some(o=>o!==z&&o.key===v)){toast('Schlüssel „'+v+'“ ist schon vergeben');later();return;}
  edit(()=>{if(z.key&&v&&v!==z.key)renameKey(z.key,v);z.key=v;});
}
function renameKey(oldK,newK){
  const re=new RegExp("(['\"])"+oldK+"\\1",'g');
  S.sections.forEach(s=>s.variants.forEach(v=>{
    v.flows.forEach(f=>{if(f.from===oldK)f.from=newK;if(f.to===oldK)f.to=newK;});
    v.steps.forEach(st=>{st.el.forEach(e=>{e[1]=String(e[1]).replace(re,"'"+newK+"'");});if(st.wait)st.wait=String(st.wait).replace(re,"'"+newK+"'");});
  }));
}
function flowInspector(sec,v,f){
  let d='–';try{d=fmt(dist(f.from,f.to,f.route,f.viaY),1)+' m';}catch(e){d=e.message;}
  return insHead('Materialfluss · '+sec.name,f.label||'Fluss',()=>{UI.sel=null;later();})+
  `<div class="note row nw" style="margin-bottom:4px">${lineSwatch(sec)}<span>Variante: <b>${esc(v.name)}</b></span></div>`+flowFields(v,f,'fi-')+
  `<div class="kpis" style="grid-template-columns:1fr"><div class="kpi"><b>${d}</b><span>Weglänge (${f.route==='direct'?'direkt als L-Weg':'über den Hauptgang'})</span></div></div>
  <div class="actions">${B('Variante öffnen',()=>openVariant(v.id))}${B('Löschen',()=>edit(()=>{v.flows=v.flows.filter(x=>x!==f);UI.sel=null;}),{cls:'danger'})}</div>
  <div class="note" style="margin-top:8px">In Zeitformeln denselben Weg mit <code>d('${esc(f.from)}','${esc(f.to)}')</code> oder <code>dd(…)</code> verwenden.</div>`;
}
function flowFields(v,f,p){
  p=p+f.id+'-';
  return `<div class="fg">
    ${F('Von',SEL(p+'from',keyOptions(f.from),f.from,x=>edit(()=>f.from=x)))}${F('Nach',SEL(p+'to',keyOptions(f.to),f.to,x=>edit(()=>f.to=x)))}
    ${F('Bezeichnung',I(p+'label',f.label,x=>edit(()=>f.label=x)),{full:true})}
    ${F('Fördermittel',I(p+'mittel',f.mittel,x=>edit(()=>f.mittel=x)),{full:true})}
    ${F('Wegführung',SEL(p+'route',[['aisle','über Hauptgang'],['direct','direkt (L-Weg)']],f.route==='direct'?'direct':'aisle',x=>edit(()=>f.route=x)))}
    ${F('Gang bei y [m]',I(p+'viaY',f.viaY==null?'':f.viaY,x=>edit(()=>f.viaY=String(x).trim()===''?'':parseNum(x)),{ph:'Hauptgang'}))}
  </div>`;
}
function hallInspector(){
  const keys=keyOptions();let out='';
  try{const a=UI.wrA,b=UI.wrB;const d1=dist(a,b,'aisle'),d2=dist(a,b,'direct');
    out=`<div class="kpis" style="grid-template-columns:1fr 1fr"><div class="kpi"><b>${fmt(d1,1)} m</b><span>über Hauptgang · ${fmtS(d1*30*TMU_S)} mit Wagen</span></div><div class="kpi"><b>${fmt(d2,1)} m</b><span>direkt (L-Weg)</span></div></div>
    <div class="note">Formel: <code>d('${esc(a)}','${esc(b)}')</code> bzw. <code>dd('${esc(a)}','${esc(b)}')</code></div>`;}catch(e){out=`<div class="err">${esc(e.message)}</div>`;}
  const docks=S.zones.filter(x=>x.type==='dock').sort((a,b)=>a.y-b.y);
  return insHead('Halle 8','Wegenetz und Docks')+
  `<div class="empty">Nichts ausgewählt. <b>Fläche</b> oder <b>Flusslinie</b> im Plan oder links in der Liste anklicken, um sie hier zu bearbeiten.</div>
  <h3>Hauptverkehrsweg</h3>
  <div class="fg">${F('Lage y [m]',I('h-aisle',S.settings.aisleY,v=>edit(()=>S.settings.aisleY=parseNum(v))))}</div>
  <h3>Wegrechner</h3>
  <div class="fg">${F('Von',SEL('h-wra',keys,UI.wrA,v=>{UI.wrA=v;later();}))}${F('Nach',SEL('h-wrb',keys,UI.wrB,v=>{UI.wrB=v;later();}))}</div>${out}
  <h3>Docks und Funktionen</h3>
  ${docks.map(dk=>`<div class="fg" style="grid-template-columns:70px 1fr;align-items:center;margin:3px 0"><span class="row nw"><span class="sw" style="background:${DOCKCOL[dk.func]||U.mgrey}"></span><b>${esc(dk.key)}</b></span>${SEL('h-dock-'+dk.id,Object.keys(DOCKCOL).map(k=>[k,k]),dk.func||'frei',v=>edit(()=>dk.func=v))}</div>`).join('')}
  <div class="note" style="margin-top:6px">Im Plan sind 7 Ladedocks erkennbar. Belegung: D1 Wäscherei, D2–D4 Zentrallager, D5 Flex, D6–D7 Apotheke. Der Wareneingang nutzt zeitversetzt D2. Dazu 5 Bereitstellbahnen.</div>`;
}
function svgPt(svg,evt){const p=svg.createSVGPoint();p.x=evt.clientX;p.y=evt.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
function bindPlan(){
  const svg=$('#laySvg');if(!svg)return;
  const c=$('#layCanvas');
  c.addEventListener('wheel',e=>{if(!(e.ctrlKey||e.metaKey))return;e.preventDefault();UI.zoom=Math.max(0.4,Math.min(5,UI.zoom*(e.deltaY<0?1.12:1/1.12)));later();},{passive:false});
  let drag=null;
  svg.addEventListener('pointerdown',e=>{
    const hit=e.target.closest('.fhit');
    if(hit&&UI.tool==='select'){UI.sel={k:'flow',vid:hit.dataset.vid,fid:hit.dataset.fid};later();return;}
    const rh=e.target.closest('.rh'),g=e.target.closest('.zone');
    if(!g&&!rh){if(UI.tool==='select'||UI.tool==='move'){if(UI.sel){UI.sel=null;later();}}return;}
    const id=(rh||g).dataset.id;const z=zoneById(id);if(!z)return;
    if(UI.tool==='flow'){
      if(!z.key){toast('Diese Fläche hat keinen Schlüssel. Bitte erst einen Schlüssel vergeben.');return;}
      if(!UI.flowStart){UI.flowStart=id;later();return;}
      const a=zoneById(UI.flowStart);if(!a||a===z){UI.flowStart=null;later();return;}
      const fv=findVar(UI.flowVid)||findVar(UI.vid);
      edit(()=>{const f={id:uid('f'),from:a.key,to:z.key,label:a.name.split(' (')[0]+' → '+z.name.split(' (')[0],mittel:'Rollwagen',route:'aisle',viaY:''};fv.v.flows.push(f);UI.overlay.add(fv.v.id);UI.flowStart=null;UI.tool='select';UI.sel={k:'flow',vid:fv.v.id,fid:f.id};});
      toast('Fluss angelegt in „'+short(fv.v.name,40)+'“');return;
    }
    if(UI.tool==='select'){UI.sel={k:'zone',id};later();return;}
    // Verschieben
    const p=svgPt(svg,e);drag={z,mode:rh?'size':'move',px:p.x,py:p.y,x:z.x,y:z.y,w:z.w,h:z.h,moved:false,was:UI.sel&&UI.sel.id};
    UI.sel={k:'zone',id};
    try{svg.setPointerCapture(e.pointerId);}catch(x){}
    e.preventDefault();
  });
  svg.addEventListener('pointermove',e=>{
    if(!drag)return;const p=svgPt(svg,e);const dx=p.x-drag.px,dy=p.y-drag.py;const r=v=>Math.round(v*10)/10;
    if(Math.abs(dx)+Math.abs(dy)<0.15&&!drag.moved)return;
    if(drag.mode==='move'){drag.z.x=r(drag.x+dx);drag.z.y=r(drag.y+dy);}else{drag.z.w=Math.max(0.3,r(drag.w+dx));drag.z.h=Math.max(0.3,r(drag.h+dy));}
    drag.moved=true;
    const g=svg.querySelector(`.zone[data-id="${drag.z.id}"] rect`);if(g){g.setAttribute('x',drag.z.x);g.setAttribute('y',drag.z.y);g.setAttribute('width',drag.z.w);g.setAttribute('height',drag.z.h);g.setAttribute('stroke',U.petrol);g.setAttribute('stroke-width',0.45);}
  });
  const end=()=>{if(!drag)return;const m=drag.moved;drag=null;if(m)commit();later();};
  svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
}

/* ===================== 2 PROZESSE & BPMN ===================== */
function curVar(){return findVar(UI.vid)||{sec:S.sections[0],v:S.sections[0].variants[0]};}
WS.proc={
  panel(){
    const selSec=UI.sel&&UI.sel.k==='sec'?UI.sel.id:null;
    return `<div class="ph"><h2>Prozesse &amp; BPMN</h2></div>
    <p class="lead">Prozessabschnitte mit ihren Varianten. Zeit rechts: Vorgabezeit je Position bzw. Bezugseinheit.</p>
    <div class="list tree" style="max-height:none">${S.sections.map(s=>`<div class="sh${selSec===s.id?' on':''}" ${clk(()=>{UI.sel={k:'sec',id:s.id};later();})} title="Abschnitt bearbeiten"><span class="sw" style="background:${s.color}"></span><span class="t">${esc(s.name)}</span><span class="s note" style="font-weight:400">${s.variants.length}</span></div>
      ${s.variants.map(v=>{const c=calcVariant(v);const on=v.id===UI.vid&&!selSec;return `<div class="li${on?' on':''}" ${clk(()=>{UI.vid=v.id;UI.sel=null;later();})}><span class="t" title="${esc(v.name)}">${esc(v.name)}</span>${s.baseline===v.id?'<span class="ref">Basis</span>':''}<span class="s">${c.errors.length?'<span class="err">!</span> ':''}${fmtS(c.perPos)}</span></div>`;}).join('')}`).join('')}</div>
    <div class="actions">${B('+ Prozessabschnitt',addSection)}</div>`;
  },
  main(){
    const {sec,v}=curVar();const c=calcVariant(v);const L=bpmnLayout(v);const bad=L.edges.filter(e=>e.bad);
    const view=UI.procView;
    let body='';
    if(view==='bpmn')body=`<div class="bpmn-box" data-keep="bpmn-${v.id}">${bpmnSvg(v,c,sec)}</div>
      <div class="legend"><span><span class="sw" style="background:#fff;border:2px solid #891F5E"></span>Handlung des Anwenders</span><span><span class="sw" style="background:#DCE3E8;border:2px solid #144477"></span>System (SHS)</span><span>Zeit im Kasten = Grundzeit des Schritts</span><span>Gateway-Zweige sind über Anteile in den Mengenformeln gewichtet</span></div>`;
    else if(view==='list')body=stepTable(v,c);
    else body=`<div class="plan-mini">${planSvg({vids:new Set([v.id]),id:'mini',width:'100%',crop:true,numbered:true})}</div>${flowLegend(new Set([v.id]),true)}<div class="note" style="margin-top:6px">Flüsse bearbeiten: rechts im Inspektor unter „Materialflüsse“ oder im Layout mit „Fluss zeichnen“.</div>`;
    return `<div class="sheet">
      <div class="sheet-h"><span class="sw" style="background:${sec.color}"></span><span class="kicker">${esc(sec.name)} · je ${esc(sec.bezug)}</span></div>
      <div class="sheet-h"><h2>${esc(v.name)}</h2>${sec.baseline===v.id?'<span class="ref">Basis</span>':''}<span class="sp"></span>${B('+ Schritt',()=>addStep(v))}${B('BPMN exportieren',()=>exportBpmn(sec,v))}</div>
      ${v.desc?`<p style="margin:0 0 6px;max-width:900px">${esc(v.desc)}</p>`:''}
      ${kpiHtml(sec,v,c)}
      ${bad.length?`<div class="err" style="margin-bottom:6px">Unbekannter Nachfolger: ${bad.map(e=>'Schritt '+esc(e.from)+' → '+esc(e.to)).join(', ')}</div>`:''}
      ${c.errors.length?`<div class="err" style="margin-bottom:6px">${c.errors.slice(0,4).map(esc).join('<br>')}</div>`:''}
      <div class="vtabs">${[['bpmn','Diagramm (BPMN)'],['list','Schrittliste'],['plan','Hallenplan']].map(([k,l])=>B(l,()=>{UI.procView=k;later();},{cls:view===k?'on':''})).join('')}</div>
      ${body}
    </div>`;
  },
  insp(){
    const s=UI.sel;
    if(s&&s.k==='sec')return sectionInspector(secById(s.id));
    if(s&&s.k==='step'){const f=findVar(s.vid);return stepInspector(f.sec,f.v,f.v.steps.find(x=>x.id===s.sid));}
    const {sec,v}=curVar();return variantInspector(sec,v);
  },
  after(){
    document.querySelectorAll('.bn').forEach(g=>g.addEventListener('click',()=>{UI.sel={k:'step',vid:UI.vid,sid:g.dataset.sid};later();}));
  }
};
function kpiHtml(sec,v,c){
  const wegA=c.work>0?(c.byCat['Weg']||0)/c.work*100:0;
  const base=sec.variants.find(x=>x.id===sec.baseline);let delta='';
  if(base&&base.id!==v.id){const cb=calcVariant(base);const d=(c.vorgabe-cb.vorgabe)/(cb.vorgabe||1)*100;delta=`<div class="kpi ${d<=0?'good':'bad'}"><b>${d>0?'+':''}${fmt(d,0)} %</b><span>ggü. Basis (${esc(base.name.split(':')[0])})</span></div>`;}
  return `<div class="kpis">
   <div class="kpi"><b>${fmtS(c.vorgabe)}</b><span>Vorgabezeit je ${esc(sec.bezug)}</span></div>
   <div class="kpi"><b>${fmtS(c.perPos)}</b><span>je ${esc(sec.posLabel)} (pos = ${fmt(c.pos,1)})</span></div>
   <div class="kpi"><b>${fmtS(c.work)}</b><span>Grundzeit ohne Zuschläge</span></div>
   <div class="kpi"><b>${fmt(wegA,0)} %</b><span>Wegzeitanteil</span></div>
   ${c.wait>0?`<div class="kpi"><b>${fmtS(c.wait)}</b><span>Wartezeit (nur Durchlauf)</span></div>`:''}
   ${delta}</div>`;
}
function bpmnSvg(v,calc,sec){
  const L=bpmnLayout(v);const sysLane=l=>/system/i.test(l);
  const selId=UI.sel&&UI.sel.k==='step'&&UI.sel.vid===v.id?UI.sel.sid:null;
  let s=`<svg width="${L.width}" height="${L.height+2}" xmlns="http://www.w3.org/2000/svg" style="display:block" role="img" aria-label="BPMN-Diagramm ${esc(v.name)}">
  <defs><marker id="bArr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4A4A4A"/></marker></defs>
  <rect x="0.5" y="0.5" width="${L.width-1}" height="${L.height}" fill="#fff" stroke="#144477"/>
  <rect x="0.5" y="0.5" width="30" height="${L.height}" fill="#144477" stroke="#144477"/>
  <text transform="translate(19 ${L.height/2}) rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="#fff">${esc(sec.name)}</text>`;
  L.lanes.forEach((ln,i)=>{const y=i*L.LH;s+=`<rect x="30.5" y="${y+0.5}" width="${L.width-31}" height="${L.LH}" fill="#fff" stroke="#BDC6D1" stroke-width="0.8"/><rect x="30.5" y="${y+0.5}" width="${L.HW-31}" height="${L.LH}" fill="${sysLane(ln)?'#DCE3E8':'#F3F5F7'}" stroke="#BDC6D1" stroke-width="0.8"/>`;
    wrapText(ln,16).forEach((t,j,a)=>{s+=`<text x="${30+(L.HW-30)/2}" y="${y+L.LH/2+(j-(a.length-1)/2)*14+4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#144477">${esc(t)}</text>`;});
    const lt=calc.byLane[ln]||0;if(lt>0)s+=`<text x="${30+(L.HW-30)/2}" y="${y+L.LH-10}" text-anchor="middle" font-size="10" fill="#4A4A4A">${fmtS(lt)}</text>`;});
  L.edges.forEach(e=>{if(!e.pts.length)return;
    s+=`<polyline points="${e.pts.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#4A4A4A" stroke-width="1.3" marker-end="url(#bArr)"/>`;
    if(e.label){const p=e.pts[0],q=e.pts[1];const lx=p[0]+(q[0]===p[0]?6:8),ly=p[1]+(q[0]===p[0]?14:-5);s+=`<text x="${lx}" y="${ly}" font-size="10.5" font-weight="600" fill="${/nein/i.test(e.label)?'#891F5E':'#0A967A'}">${esc(e.label)}</text>`;}});
  v.steps.forEach((st,i)=>{
    const n=L.nodes[st.id],r=calc.steps[i],sel=selId===st.id;if(!n)return;
    const sys=st.type==='service'||(['xor','and'].includes(st.type)&&sysLane(st.lane));
    const col=sys?'#144477':'#891F5E';
    s+=`<g class="bn" data-sid="${esc(st.id)}" style="cursor:pointer"><title>Schritt ${esc(st.id)}: ${esc(st.name)} – anklicken zum Bearbeiten</title>`;
    if(sel)s+=`<rect x="${n.x-6}" y="${n.y-6}" width="${n.w+12}" height="${n.h+12}" rx="12" fill="rgba(45,118,148,0.12)" stroke="none"/>`;
    if(['user','manual','service'].includes(st.type)||!STEP_TYPES[st.type]){
      s+=`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9" fill="${sys?'#DCE3E8':'#fff'}" stroke="${sel?'#2D7694':col}" stroke-width="${sel?3:1.5}"/>`;
      s+=taskIcon(st.type,n.x+5,n.y+5,col);s+=`<text x="${n.x+n.w-5}" y="${n.y+12}" font-size="9" text-anchor="end" fill="#4A4A4A">${esc(st.id)}</text>`;
      wrapText(st.name,19).slice(0,3).forEach((t,j)=>{s+=`<text x="${n.cx}" y="${n.y+27+j*12}" text-anchor="middle" font-size="10.3" fill="#4A4A4A">${esc(t)}</text>`;});
      if(r&&(r.t>0))s+=`<text x="${n.cx}" y="${n.y+n.h-5}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#144477">${fmtS(r.t)}</text>`;
    }else if(['xor','and'].includes(st.type)){
      s+=`<path d="M${n.cx},${n.y} L${n.x+n.w},${n.cy} L${n.cx},${n.y+n.h} L${n.x},${n.cy} Z" fill="#fff" stroke="${sel?'#2D7694':col}" stroke-width="${sel?3:1.6}"/>`;
      s+=st.type==='xor'?`<path d="M${n.cx-7},${n.cy-7} L${n.cx+7},${n.cy+7} M${n.cx+7},${n.cy-7} L${n.cx-7},${n.cy+7}" stroke="#4A4A4A" stroke-width="2.6"/>`:`<path d="M${n.cx},${n.cy-9} V${n.cy+9} M${n.cx-9},${n.cy} H${n.cx+9}" stroke="#4A4A4A" stroke-width="2.6"/>`;
      const wl=wrapText(st.name,20);wl.slice(0,3).forEach((t,j)=>{s+=`<text x="${n.cx}" y="${n.y-8-(Math.min(3,wl.length)-1-j)*11}" text-anchor="middle" font-size="9.8" fill="#4A4A4A">${esc(t)}</text>`;});
    }else{
      const sw=st.type==='end'?4:1.8,c=st.type==='start'?'#0A967A':st.type==='end'?'#0A223C':'#2D7694';
      s+=`<circle cx="${n.cx}" cy="${n.cy}" r="${n.w/2}" fill="#fff" stroke="${sel?'#2D7694':c}" stroke-width="${sel?3:sw}"/>`;
      if(st.type==='timer')s+=`<circle cx="${n.cx}" cy="${n.cy}" r="${n.w/2-4}" fill="none" stroke="${c}" stroke-width="1.2"/><circle cx="${n.cx}" cy="${n.cy}" r="8" fill="none" stroke="${c}"/><path d="M${n.cx},${n.cy} V${n.cy-6} M${n.cx},${n.cy} L${n.cx+4},${n.cy+2}" stroke="${c}"/>`;
      wrapText(st.name,20).slice(0,3).forEach((t,j)=>{s+=`<text x="${n.cx}" y="${n.y+n.h+13+j*11}" text-anchor="middle" font-size="9.8" fill="#4A4A4A">${esc(t)}</text>`;});
      if(r&&r.w>0)s+=`<text x="${n.cx}" y="${n.y-6}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#2D7694">Wartezeit ${fmtS(r.w)}</text>`;
    }
    s+=`</g>`;
  });
  return s+'</svg>';
}
function stepTable(v,c){
  const selId=UI.sel&&UI.sel.k==='step'&&UI.sel.vid===v.id?UI.sel.sid:null;
  return `<div class="tw"><table class="t"><tr><th>Nr.</th><th>Lane</th><th>Typ</th><th>Bezeichnung</th><th>Weiter</th><th class="n">Bausteine</th><th class="n">Grundzeit</th><th class="n">Warten</th></tr>
  ${v.steps.map((st,i)=>{const r=c.steps[i];return `<tr class="click${selId===st.id?' on':''}" ${clk(()=>{UI.sel={k:'step',vid:v.id,sid:st.id};later();})}><td><b>${esc(st.id)}</b></td><td>${esc(st.lane)}</td><td>${esc(STEP_TYPES[st.type]||st.type)}</td><td>${esc(st.name)}${r.els.some(e=>e.err)||r.werr?' <span class="err">Formelfehler</span>':''}</td><td style="font-family:var(--mono);font-size:11px">${esc(st.next||'')}</td><td class="n">${st.el.length||''}</td><td class="n">${r.t?fmtS(r.t):''}</td><td class="n">${r.w?fmtS(r.w):''}</td></tr>`;}).join('')}
  <tr><td></td><td colspan="5"><b>Summe Grundzeit</b></td><td class="n"><b>${fmtS(c.work)}</b></td><td class="n">${c.wait?fmtS(c.wait):''}</td></tr></table></div>`;
}
function newStepId(v){return String(Math.max(0,...v.steps.map(s=>parseInt(s.id)||0))+1);}
function addStep(v,afterIdx){edit(()=>{const ref=afterIdx!=null?v.steps[afterIdx]:null;
  const n={id:newStepId(v),lane:ref?ref.lane:(v.lanes[0]||'Mitarbeiter'),type:'manual',name:'Neuer Schritt',next:'',el:[]};
  if(afterIdx!=null)v.steps.splice(afterIdx+1,0,n);else{const ei=v.steps.findIndex(s=>s.type==='end');if(ei>=0)v.steps.splice(ei,0,n);else v.steps.push(n);}
  UI.sel={k:'step',vid:v.id,sid:n.id};});toast('Schritt angelegt – rechts benennen und Zeitbausteine ergänzen');}
function parseNextRaw(st){const t=String(st.next||'').trim();if(!t)return [];return t.split(/[;\n]/).map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf(':');return i<0?{to:x,label:''}:{to:x.slice(0,i).trim(),label:x.slice(i+1).trim()};});}
const nextToStr=l=>l.filter(n=>n.to).map(n=>n.label?n.to+':'+n.label:n.to).join(';');
function stepInspector(sec,v,st){
  const c=calcVariant(v);const idx=v.steps.indexOf(st);const r=c.steps[idx];const p='s-'+v.id+'-'+st.id+'-';
  const lanes=bpmnLayout(v).lanes;
  const others=v.steps.filter(x=>x!==st).map(x=>[x.id,x.id+' · '+short(x.name,38)]);
  const br=parseNextRaw(st);const isGw=['xor','and'].includes(st.type)||br.length>1;
  const nxt=v.steps[idx+1];
  let flow='';
  if(st.type==='end')flow='<div class="note">End-Ereignis: kein Nachfolger.</div>';
  else if(isGw){
    flow=(br.length?br:[]).map((b,j)=>`<div class="card"><div class="fg" style="grid-template-columns:1fr 90px">${F('Zweig '+(j+1)+' führt zu',SEL(p+'br'+j+'to',others,b.to,x=>edit(()=>{br[j].to=x;st.next=nextToStr(br);})))}${F('Beschriftung',I(p+'br'+j+'lb',b.label,x=>edit(()=>{br[j].label=String(x).replace(/[;:]/g,' ').trim();st.next=nextToStr(br);}),{ph:'Ja / Nein'}))}</div><span class="del">${B('×',()=>edit(()=>{br.splice(j,1);st.next=nextToStr(br);}),{cls:'x',title:'Zweig entfernen'})}</span></div>`).join('')
      +(br.length?'':`<div class="note">Ohne Zweige geht es automatisch mit dem nächsten Schritt weiter${nxt?' ('+esc(nxt.id)+')':''}.</div>`)
      +`<div class="actions" style="margin-top:4px">${B('+ Zweig',()=>edit(()=>{br.push({to:(nxt||v.steps[0]).id,label:br.length===0?'Ja':br.length===1?'Nein':''});st.next=nextToStr(br);}),{cls:'mini'})}</div>`;
  }else{
    flow=F('Weiter mit',SEL(p+'next',[['','automatisch: nächster Schritt'+(nxt?' ('+nxt.id+')':'')],...others],br[0]?br[0].to:'',x=>edit(()=>st.next=x)),{full:true});
  }
  const els=st.el.map((e,j)=>{const er=r.els[j]||{};const b=bById(e[0]);
    return `<div class="erow"><div class="fg c1" style="margin:0">${SEL(p+'e'+j+'b',bstOptions(e[0]),e[0],x=>edit(()=>e[0]=x))}
      ${I(p+'e'+j+'q',e[1],x=>edit(()=>e[1]=String(x).trim()||'1'),{mono:true,title:'Menge oder Formel, z. B. pos*kolli'})}
      <div class="eq">${er.err?`<span class="err">${esc(er.err)}</span>`:`<span>${fmt(er.q,2)} × ${b?fmt(b.tmu*TMU_S,2):'?'} s ${b?esc(b.unit):''}</span><b>= ${fmt(er.s||0,1)} s</b>`}</div></div>
      <div>${B('×',()=>edit(()=>st.el.splice(j,1)),{cls:'x',title:'Baustein entfernen'})}</div></div>`;}).join('');
  const params=v.params.map(x=>`<code title="${esc(x.label)}">${esc(x.k)}</code>`).join(' ');
  return insHead('Schritt '+esc(st.id)+' · '+(STEP_TYPES[st.type]||st.type),st.name,()=>{UI.sel=null;later();})+
  `<div class="note" style="margin:-2px 0 6px">${esc(v.name)}</div>
  <div class="fg">
    ${F('Bezeichnung',TA(p+'name',st.name,x=>edit(()=>st.name=x),2),{full:true})}
    ${F('Typ',SEL(p+'type',Object.entries(STEP_TYPES),st.type,x=>edit(()=>st.type=x)))}
    ${F('Lane (Rolle)',SEL(p+'lane',lanes.map(l=>[l,l]),st.lane,x=>edit(()=>st.lane=x)))}
    ${F('Nr. / Kennung',I(p+'id',st.id,x=>renameStep(v,st,x),{mono:true}))}
  </div>
  <h3>Ablauf</h3>${flow}
  <h3>Zeitbausteine <span style="font-weight:400;text-transform:none;letter-spacing:0;color:var(--muted)">· Grundzeit ${fmtS(r.t)}</span></h3>
  ${els||'<div class="note">Noch keine Zeitbausteine. Ereignisse und Gateways brauchen meist keine.</div>'}
  <div class="actions" style="margin-top:4px">${B('+ Zeitbaustein',()=>edit(()=>st.el.push(['SCN','1'])),{cls:'mini'})}</div>
  ${F('Wartezeit [s] (nur Durchlaufzeit)',I(p+'wait',st.wait||'',x=>edit(()=>st.wait=String(x).trim()),{mono:true,ph:'z. B. takt*60/2'}),{full:true,calc:st.wait?(r.werr?'Fehler: '+esc(r.werr):'= '+fmtS(r.w)):null})}
  ${GRP('formhelp','Formelhilfe',null,`<div class="note">Parameter dieser Variante: ${params||'–'}<br>Wege: <code>d('A','B')</code> über den Hauptgang, <code>dd('A','B')</code> direkt, <code>sshape('PAL',n)</code> Kommissioniertour.<br>Funktionen: <code>min max ceil floor round sqrt pow</code>. Dezimalpunkt verwenden, z. B. <code>pos*0.5</code>.</div>`,false)}
  <div class="actions">${B('↑',()=>edit(()=>{if(idx>0)[v.steps[idx-1],v.steps[idx]]=[v.steps[idx],v.steps[idx-1]];}),{dis:idx===0,title:'Nach vorne'})}${B('↓',()=>edit(()=>{if(idx<v.steps.length-1)[v.steps[idx+1],v.steps[idx]]=[v.steps[idx],v.steps[idx+1]];}),{dis:idx===v.steps.length-1,title:'Nach hinten'})}
  ${B('+ Schritt danach',()=>addStep(v,idx))}${B('Duplizieren',()=>edit(()=>{const n=JSON.parse(JSON.stringify(st));n.id=newStepId(v);n.name=st.name+' (Kopie)';v.steps.splice(idx+1,0,n);UI.sel={k:'step',vid:v.id,sid:n.id};}))}
  ${B('Löschen',()=>edit(()=>{v.steps.splice(idx,1);UI.sel=null;toast('Schritt gelöscht – Strg+Z holt ihn zurück');}),{cls:'danger',title:'Entf'})}</div>`;
}
function renameStep(v,st,nv){
  nv=String(nv).trim().replace(/[;:\s]/g,'');if(!nv||nv===st.id){later();return;}
  if(v.steps.some(x=>x!==st&&x.id===nv)){toast('Nr. „'+nv+'“ gibt es in dieser Variante schon');later();return;}
  edit(()=>{const old=st.id;v.steps.forEach(x=>{const l=parseNextRaw(x);if(l.some(n=>n.to===old)){l.forEach(n=>{if(n.to===old)n.to=nv;});x.next=nextToStr(l);}});st.id=nv;UI.sel={k:'step',vid:v.id,sid:nv};});
}
function variantInspector(sec,v,ctx){
  const c=calcVariant(v);const p='v-'+v.id+'-';
  const lanesUsed=new Set(v.steps.map(s=>s.lane));
  const params=v.params.map((x,i)=>{const open=UI.paramOpen[v.id+'|'+i];return `<div class="prow" style="grid-template-columns:1fr 72px 28px 28px"><input type="text" id="${p}pl${i}" value="${esc(x.label)}" title="Bezeichnung">${I(p+'pv'+i,x.v,y=>edit(()=>x.v=y),{mono:true,style:'text-align:right',title:x.k+(x.unit?' ['+x.unit+']':'')})}
    ${B('⋯',()=>{UI.paramOpen[v.id+'|'+i]=!open;later();},{cls:'ico',title:'Schlüssel und Einheit'})}${B('×',()=>edit(()=>v.params.splice(i,1)),{cls:'ico',title:'Parameter löschen'})}</div>
    <div class="note" style="margin:-2px 0 4px;font-family:var(--mono);font-size:10.5px">${esc(x.k)}${x.unit?' · '+esc(x.unit):''}</div>
    ${open?`<div class="fg" style="margin:0 0 8px">${F('Schlüssel',I(p+'pk'+i,x.k,y=>edit(()=>renameParam(v,x,y)),{mono:true}))}${F('Einheit',I(p+'pu'+i,x.unit||'',y=>edit(()=>x.unit=y)))}</div>`:''}`;}).join('');
  v.params.forEach((x,i)=>{regH()[p+'pl'+i]=y=>edit(()=>x.label=y);});
  const lanes=v.lanes.map((l,i)=>`<div class="prow" style="grid-template-columns:1fr 28px 28px 28px">${I(p+'ln'+i,l,y=>renameLane(v,i,y))}${B('↑',()=>edit(()=>{if(i>0)[v.lanes[i-1],v.lanes[i]]=[v.lanes[i],v.lanes[i-1]];}),{cls:'ico',dis:i===0})}${B('↓',()=>edit(()=>{if(i<v.lanes.length-1)[v.lanes[i+1],v.lanes[i]]=[v.lanes[i],v.lanes[i+1]];}),{cls:'ico',dis:i===v.lanes.length-1})}${B('×',()=>edit(()=>v.lanes.splice(i,1)),{cls:'ico',dis:lanesUsed.has(l),title:lanesUsed.has(l)?'Lane wird von Schritten genutzt':'Lane löschen'})}</div>`).join('');
  const flows=v.flows.map(f=>{let d='–';try{d=fmt(dist(f.from,f.to,f.route,f.viaY),1)+' m';}catch(e){d=esc(e.message);}
    return `<div class="card">${flowFields(v,f,'vf-')}<div class="row" style="margin-top:4px"><span class="note">Weg ${d}</span><span class="sp"></span>${B('Im Plan zeigen',()=>{UI.overlay.add(v.id);UI.ws='layout';UI.tool='select';UI.sel={k:'flow',vid:v.id,fid:f.id};try{history.replaceState(null,'','#layout');}catch(e){}render();},{cls:'mini'})}${B('×',()=>edit(()=>v.flows=v.flows.filter(x=>x!==f)),{cls:'ico',title:'Fluss löschen'})}</div></div>`;}).join('');
  return insHead('Variante · '+sec.name,v.name)+
  `${ctx?`<div class="infobox note" style="margin:0 0 6px">${ctx}</div>`:''}
  <div class="fg">
    ${F('Name',I(p+'name',v.name,y=>edit(()=>v.name=y)),{full:true})}
    ${F('Beschreibung',TA(p+'desc',v.desc||'',y=>edit(()=>v.desc=y),3),{full:true})}
  </div>
  ${CHK(p+'base','Basisvariante dieses Abschnitts',sec.baseline===v.id,y=>{if(y)edit(()=>sec.baseline=v.id);else later();})}
  <div class="kpis" style="grid-template-columns:1fr 1fr;margin-top:6px"><div class="kpi"><b>${fmtS(c.vorgabe)}</b><span>Vorgabezeit je ${esc(sec.bezug)}</span></div><div class="kpi"><b>${fmtS(c.perPos)}</b><span>je ${esc(sec.posLabel)}</span></div></div>
  ${GRP('params','Parameter',v.params.length,`<div class="note" style="margin-bottom:4px">Mengen und Anteile für die Formeln. <code>pos</code> = Positionen je Bezugseinheit, <code>orders</code> = Batchgröße.</div>${params}<div class="actions" style="margin-top:4px">${B('+ Parameter',()=>edit(()=>{let n=1;while(v.params.some(x=>x.k==='neu'+n))n++;v.params.push({k:'neu'+n,label:'Neuer Parameter',v:'1',unit:''});UI.paramOpen[v.id+'|'+(v.params.length-1)]=true;}),{cls:'mini'})}</div>`,true)}
  ${GRP('lanes','Lanes (Rollen)',v.lanes.length,`${lanes}<div class="actions" style="margin-top:4px">${B('+ Lane',()=>edit(()=>{let n='Neue Rolle',i=2;while(v.lanes.includes(n))n='Neue Rolle '+(i++);v.lanes.push(n);}),{cls:'mini'})}</div><div class="note" style="margin-top:4px">Umbenennen ändert die Lane auch in allen Schritten.</div>`,false)}
  ${GRP('flows','Materialflüsse',v.flows.length,`${flows||'<div class="note">Keine Flüsse. Im Layout mit „Fluss zeichnen“ anlegen oder hier hinzufügen.</div>'}<div class="actions" style="margin-top:4px">${B('+ Fluss',()=>edit(()=>{v.flows.push({id:uid('f'),from:zoneKeys()[0]||'',to:zoneKeys()[1]||'',label:'Neuer Fluss',mittel:'Rollwagen',route:'aisle',viaY:''});UI.overlay.add(v.id);}),{cls:'mini'})}</div>`,false)}
  <div class="actions">${B('Duplizieren',()=>edit(()=>{const n=JSON.parse(JSON.stringify(v));n.id=uid(sec.id);n.name=v.name+' (Kopie)';n.flows.forEach(f=>f.id=uid('f'));sec.variants.splice(sec.variants.indexOf(v)+1,0,n);UI.vid=n.id;UI.sel=null;toast('Kopie angelegt – jetzt Parameter oder Schritte ändern');}))}
  ${B('BPMN exportieren',()=>exportBpmn(sec,v))}
  ${B('Löschen',()=>openConfirm(`Variante „${v.name}“ löschen?`,()=>edit(()=>{sec.variants=sec.variants.filter(x=>x!==v);if(sec.baseline===v.id)sec.baseline=sec.variants[0].id;UI.overlay.delete(v.id);if(S.order[sec.id]===v.id)S.order[sec.id]=sec.baseline;UI.vid=sec.variants[0].id;UI.sel=null;})),{cls:'danger',dis:sec.variants.length<2,title:sec.variants.length<2?'Ein Abschnitt braucht mindestens eine Variante':''})}</div>`;
}
function renameParam(v,x,nk){nk=String(nk).trim().replace(/\W/g,'');if(!nk||nk===x.k)return;if(v.params.some(o=>o!==x&&o.k===nk)){toast('Schlüssel „'+nk+'“ gibt es schon');return;}
  const re=new RegExp('\\b'+x.k+'\\b','g');v.steps.forEach(st=>{st.el.forEach(e=>e[1]=String(e[1]).replace(re,nk));if(st.wait)st.wait=String(st.wait).replace(re,nk);});x.k=nk;}
function renameLane(v,i,nl){nl=String(nl).trim();const old=v.lanes[i];if(!nl||nl===old){later();return;}if(v.lanes.includes(nl)){toast('Lane „'+nl+'“ gibt es schon');later();return;}
  edit(()=>{v.lanes[i]=nl;v.steps.forEach(s=>{if(s.lane===old)s.lane=nl;});});}
function sectionInspector(sec){
  const p='sec-'+sec.id+'-';const inOrder=ORDER_SECS.some(([k])=>k===sec.id);
  return insHead('Prozessabschnitt',sec.name,()=>{UI.sel=null;later();})+
  `<div class="fg">
    ${F('Name',I(p+'name',sec.name,x=>edit(()=>sec.name=x)),{full:true})}
    ${F('Bezugseinheit („je …“)',I(p+'bezug',sec.bezug,x=>edit(()=>sec.bezug=x)))}${F('Kennzahl je',I(p+'pos',sec.posLabel,x=>edit(()=>sec.posLabel=x)))}
    ${F('Basisvariante',SEL(p+'base',sec.variants.map(v=>[v.id,v.name]),sec.baseline,x=>edit(()=>sec.baseline=x)),{full:true})}
    ${F('Linienart im Plan',SEL(p+'dash',Object.entries(DASH_LABEL),sec.dash,x=>edit(()=>sec.dash=x)))}
    ${F('Farbe',`<div class="row nw">${PALETTE.map(([c,l])=>`<button type="button" class="ico" title="${l}" aria-label="${l}" style="background:${c};border-color:${sec.color===c?U.navy:'#fff'};box-shadow:${sec.color===c?'0 0 0 2px '+U.petrol:'none'};height:24px" ${clk(()=>edit(()=>sec.color=c))}></button>`).join('')}${I(p+'color',sec.color,x=>{if(/^#[0-9a-fA-F]{6}$/.test(String(x).trim()))edit(()=>sec.color=String(x).trim());else later();},{type:'color',style:'width:34px;padding:0'})}</div>`)}
  </div>
  <h3>Varianten (${sec.variants.length})</h3>
  <div class="list">${sec.variants.map(v=>`<div class="li" ${clk(()=>{UI.vid=v.id;UI.sel=null;later();})}><span class="t">${esc(v.name)}</span>${sec.baseline===v.id?'<span class="ref">Basis</span>':''}<span class="s">${fmtS(calcVariant(v).perPos)}</span></div>`).join('')}</div>
  <div class="actions">${B('+ Leere Variante',()=>edit(()=>{const v=emptyVariant(sec);sec.variants.push(v);UI.vid=v.id;UI.sel=null;}))}
  ${B('Abschnitt löschen',()=>openConfirm(`Prozessabschnitt „${sec.name}“ mit ${sec.variants.length} Variante(n) löschen?`,()=>edit(()=>{S.sections=S.sections.filter(x=>x!==sec);UI.sel=null;if(!findVar(UI.vid))UI.vid=S.sections[0].variants[0].id;})),{cls:'danger',dis:inOrder||S.sections.length<2,title:inOrder?'Wird im Auftragsdurchlauf verwendet':''})}</div>
  ${inOrder?'<div class="note" style="margin-top:6px">Dieser Abschnitt ist Teil des Auftragsdurchlaufs und kann deshalb nicht gelöscht werden.</div>':''}`;
}
function emptyVariant(sec){return {id:uid(sec.id),name:'Neue Variante',desc:'',lanes:['Mitarbeiter','System SHS'],params:[{k:'pos',label:'Positionen je '+(sec.bezug||'Vorgang'),v:'1',unit:''}],
  steps:[{id:'1',lane:'System SHS',type:'start',name:'Start',next:'',el:[]},{id:'2',lane:'Mitarbeiter',type:'manual',name:'Tätigkeit',next:'',el:[['GEH','10']]},{id:'3',lane:'System SHS',type:'end',name:'Ende',next:'',el:[]}],flows:[]};}
function addSection(){edit(()=>{const sec={id:uid('s'),name:'Neuer Prozessabschnitt',color:U.petrol,dash:'solid',bezug:'Vorgang',posLabel:'Position',variants:[],baseline:''};const v=emptyVariant(sec);sec.variants.push(v);sec.baseline=v.id;S.sections.push(sec);UI.vid=v.id;UI.overlay.add(v.id);UI.sel={k:'sec',id:sec.id};});toast('Abschnitt angelegt – rechts benennen');}
function exportBpmn(sec,v){const c=calcVariant(v);openExportText(bpmnXml(sec,v,c),(v.name.replace(/[^\wäöüÄÖÜß-]+/g,'_')||'prozess')+'.bpmn','BPMN 2.0 XML dieser Variante mit Diagramm-Koordinaten. Lässt sich in Camunda Modeler, bpmn.io, Signavio oder ADONIS importieren.');}

/* ===================== 3 VARIANTENVERGLEICH ===================== */
function catBar(c,max){return `<div class="track">${CATS.map(([k,col])=>{const v=(c.byCat[k]||0);return v>0?`<div class="segm" style="width:${v/max*100}%;background:${col}" title="${k}: ${fmtS(v)}"></div>`:'';}).join('')}</div>`;}
WS.cmp={
  panel(){
    return `<div class="ph"><h2>Variantenvergleich</h2></div>
    <p class="lead">Abschnitt wählen. Die Varianten werden nach Tätigkeitsart und Rolle gegenübergestellt.</p>
    <div class="list">${S.sections.map(s=>`<div class="li${s.id===UI.cmpSec?' on':''}" ${clk(()=>{UI.cmpSec=s.id;UI.vid=s.baseline;UI.sel=null;later();})}><span class="sw" style="background:${s.color}"></span><span class="t">${esc(s.name)}</span><span class="s">${s.variants.length}</span></div>`).join('')}</div>
    <h3>Zuschläge für alle Vorgabezeiten</h3>
    <div class="fg">${F('Verteilzeit [%]',I('c-zv',S.settings.zv,v=>edit(()=>S.settings.zv=parseNum(v))))}${F('Erholzeit [%]',I('c-ze',S.settings.ze,v=>edit(()=>S.settings.ze=parseNum(v))))}</div>
    <div class="note">Vorgabezeit = Grundzeit × (1 + Zuschläge). Wartezeiten (z. B. Shuttle-Takt) zählen nur für die Durchlaufzeit.</div>`;
  },
  main(){
    const sec=secById(UI.cmpSec)||S.sections[0];
    const rows=sec.variants.map(v=>({v,c:calcVariant(v)}));
    const base=rows.find(r=>r.v.id===sec.baseline)||rows[0];
    const max=Math.max(...rows.map(r=>r.c.work),1);
    const lanes=[...new Set(rows.flatMap(r=>Object.keys(r.c.byLane)))];
    const ov=S.sections.map(s=>{const v=s.variants.find(x=>x.id===s.baseline);const c=calcVariant(v);const best=s.variants.map(x=>({x,c:calcVariant(x)})).sort((a,b)=>a.c.perPos-b.c.perPos)[0];return {s,v,c,best};});
    const pick=v=>clk(()=>{UI.vid=v.id;UI.sel=null;later();});
    return `<div class="sheet">
      <div class="sheet-h"><span class="sw" style="background:${sec.color}"></span><h2>${esc(sec.name)}</h2><span class="note">Grundzeit je ${esc(sec.bezug)} nach Tätigkeitsart · Zeile anklicken, um die Variante rechts zu bearbeiten</span></div>
      <div class="legend">${CATS.map(([k,c])=>`<span><span class="sw" style="background:${c}"></span>${k}</span>`).join('')}</div>
      <div class="bars">${rows.map(r=>`<div class="bar-row${r.v.id===UI.vid?' on':''}" ${pick(r.v)}><div style="font-size:12px"><b>${esc(r.v.name)}</b>${r.v.id===sec.baseline?' <span class="ref">Basis</span>':''}</div>${catBar(r.c,max)}<div class="num" style="font-size:12px">${fmtS(r.c.work)}</div></div>`).join('')}</div>
      <h3>Kennzahlen</h3>
      <div class="tw"><table class="t"><tr><th>Variante</th><th class="n">Grundzeit</th><th class="n">Vorgabezeit</th><th class="n">je ${esc(sec.posLabel)}</th><th class="n">Weg-Anteil</th><th class="n">Wartezeit</th><th class="n">Δ Basis</th></tr>
      ${rows.map(r=>{const d=(r.c.vorgabe-base.c.vorgabe)/(base.c.vorgabe||1)*100;return `<tr class="click${r.v.id===UI.vid?' on':''}" ${pick(r.v)}><td>${esc(r.v.name)}</td><td class="n">${fmtS(r.c.work)}</td><td class="n"><b>${fmtS(r.c.vorgabe)}</b></td><td class="n">${fmtS(r.c.perPos)}</td><td class="n">${fmt((r.c.byCat['Weg']||0)/(r.c.work||1)*100,0)} %</td><td class="n">${r.c.wait?fmtS(r.c.wait):'–'}</td><td class="n" style="color:${d<=0?'var(--ok)':'var(--danger)'};font-weight:700">${r.v.id===base.v.id?'–':(d>0?'+':'')+fmt(d,0)+' %'}</td></tr>`;}).join('')}</table></div>
      <div class="grid2" style="margin-top:4px"><div><h3>Grundzeit je Rolle (Lane)</h3>
      <div class="tw"><table class="t"><tr><th>Lane</th>${rows.map(r=>`<th class="n">${esc(r.v.name.split(':')[0])}</th>`).join('')}</tr>
      ${lanes.map(l=>`<tr><td>${esc(l)}</td>${rows.map(r=>`<td class="n">${r.c.byLane[l]?fmtS(r.c.byLane[l]):'–'}</td>`).join('')}</tr>`).join('')}</table></div></div>
      <div><h3>Parameter im Vergleich</h3>${paramCmp(rows)}</div></div>
    </div>
    <div class="sheet"><h2>Übersicht aller Abschnitte (Basisvarianten)</h2>
      <div class="tw" style="margin-top:8px"><table class="t"><tr><th>Abschnitt</th><th>Basis</th><th class="n">je Bezug</th><th class="n">je Position</th><th>Beste Variante je Position</th></tr>
      ${ov.map(o=>`<tr class="click${o.s.id===sec.id?' on':''}" ${clk(()=>{UI.cmpSec=o.s.id;UI.vid=o.s.baseline;UI.sel=null;later();})}><td><span class="row nw"><span class="sw" style="background:${o.s.color}"></span>${esc(o.s.name)}</span></td><td>${esc(o.v.name.split(':')[0])}</td><td class="n">${fmtS(o.c.vorgabe)} <span class="note">/ ${esc(o.s.bezug)}</span></td><td class="n">${fmtS(o.c.perPos)}</td><td>${o.best.x.id===o.v.id?'<span class="note">= Basis</span>':esc(o.best.x.name.split(':')[0])+' · '+fmtS(o.best.c.perPos)}</td></tr>`).join('')}</table></div>
    </div>`;
  },
  insp(){const sec=secById(UI.cmpSec)||S.sections[0];let f=findVar(UI.vid);if(!f||f.sec!==sec){UI.vid=sec.baseline;f=findVar(UI.vid);}return variantInspector(f.sec,f.v,'Änderungen an Parametern wirken sofort auf den Vergleich.');}
};
function paramCmp(rows){
  const keys=[...new Set(rows.flatMap(r=>r.v.params.map(p=>p.k)))];
  const lab=k=>{for(const r of rows){const p=r.v.params.find(x=>x.k===k);if(p)return p.label;}return k;};
  return `<div class="tw"><table class="t"><tr><th>Parameter</th>${rows.map(r=>`<th class="n">${esc(r.v.name.split(':')[0])}</th>`).join('')}</tr>
  ${keys.map(k=>{const vals=rows.map(r=>{const p=r.v.params.find(x=>x.k===k);return p?String(p.v):'–';});const diff=new Set(vals).size>1;
    return `<tr><td>${esc(lab(k))} <span class="note" style="font-family:var(--mono)">${esc(k)}</span></td>${vals.map(x=>`<td class="n" style="${diff?'font-weight:700;color:var(--petrol)':''}">${esc(x)}</td>`).join('')}</tr>`;}).join('')}</table></div>`;
}

/* ===================== 4 AUFTRAGSDURCHLAUF ===================== */
function orderModel(){
  const O=S.order;const secs={};ORDER_SECS.forEach(([k])=>secs[k]=secById(k));
  if(ORDER_SECS.some(([k])=>!secs[k]))return null;
  const pick=k=>secs[k].variants.find(v=>v.id===O[k])||secs[k].variants.find(v=>v.id===secs[k].baseline);
  const vKP=pick('kp'),vKF=pick('kf'),vKO=pick('ko'),vWA=pick('wa');
  const nP=parseNum(O.nP),nF=parseNum(O.nF),nT=nP+nF;
  const tKP=nP>0?sectionTimeline(vKP,{pos:nP},0):null;
  const tKF=nF>0?sectionTimeline(vKF,{pos:nF},0):null;
  const startKO=Math.max(tKP?tKP.end:0,tKF?tKF.end:0);
  const tKO=sectionTimeline(vKO,{pos:nT,anteilP:nT?nP/nT:0},startKO);
  const waitKons=tKP&&tKF?Math.abs(tKP.end-tKF.end):0;
  const tWA=sectionTimeline(vWA,{pos:nT},tKO.end);
  const blocks=[[secs.kp,tKP,vKP],[secs.kf,tKF,vKF],[secs.ko,tKO,vKO],[secs.wa,tWA,vWA]].filter(b=>b[1]);
  return {O,secs,vKP,vKF,vKO,vWA,nP,nF,nT,blocks,total:tWA.end,waitKons};
}
WS.order={
  panel(){
    const M=orderModel();if(!M)return '<div class="err">Für den Auftragsdurchlauf fehlen Abschnitte.</div>';
    return `<div class="ph"><h2>Auftragsdurchlauf</h2></div>
    <p class="lead">Palettenteil und Fachbodenteil laufen parallel. Die Konsolidierung beginnt, wenn beide Teilwagen da sind; danach folgt der Warenausgang.</p>
    <h3>Auftrag</h3>
    <div class="fg">${F('Positionen Palette',I('o-np',M.O.nP,v=>edit(()=>S.order.nP=parseNum(v))))}${F('Positionen Fachboden',I('o-nf',M.O.nF,v=>edit(()=>S.order.nF=parseNum(v))))}</div>
    <h3>Varianten</h3>
    <div class="fg c1">${ORDER_SECS.map(([k,l])=>F(l,SEL('o-'+k,M.secs[k].variants.map(v=>[v.id,v.name]),({kp:M.vKP,kf:M.vKF,ko:M.vKO,wa:M.vWA})[k].id,v=>edit(()=>S.order[k]=v)))).join('')}</div>`;
  },
  main(){
    const M=orderModel();if(!M)return '';
    const {blocks,total,waitKons,nT}=M;
    const z=1+(parseNum(S.settings.zv)+parseNum(S.settings.ze))/100;
    const work=blocks.reduce((s,b)=>s+b[1].c.work,0);
    const roles={};blocks.forEach(([s,t])=>Object.entries(t.c.byLane).forEach(([l,v])=>{if(v>0)roles[l]=(roles[l]||0)+v;}));
    const rowsG=[];blocks.forEach(([s,t,v])=>{const ls=[...new Set(t.segs.map(g=>g.lane))];ls.forEach(l=>rowsG.push({sec:s,v,lane:l,segs:t.segs.filter(g=>g.lane===l)}));});
    const GW=1060,LW=300,RH=26,top=30;const sc=(GW-LW-20)/Math.max(total,1);
    const tickStep=[30,60,120,300,600,900,1800,3600].find(x=>total/x<=12)||3600;
    let g=`<svg width="${GW}" height="${top+rowsG.length*RH+30}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GW} ${top+rowsG.length*RH+30}" style="display:block;width:100%;min-width:760px;height:auto" role="img" aria-label="Gantt-Diagramm Auftragsdurchlauf">`;
    for(let t=0;t<=total+0.1;t+=tickStep){const x=LW+t*sc;g+=`<line x1="${x}" y1="${top-6}" x2="${x}" y2="${top+rowsG.length*RH}" stroke="#DCE3E8"/><text x="${x}" y="${top-10}" font-size="10" text-anchor="middle" fill="#4A4A4A">${fmt(t/60,t%60?1:0)} min</text>`;}
    rowsG.forEach((r,i)=>{const y=top+i*RH;const on=UI.sel&&UI.sel.k==='var'&&UI.sel.vid===r.v.id;
      g+=`<g class="grow" data-vid="${r.v.id}" style="cursor:pointer"><rect x="0" y="${y}" width="${GW}" height="${RH}" fill="${on?'#e3edf6':'transparent'}"/><rect x="6" y="${y+7}" width="10" height="10" fill="${r.sec.color}"/><text x="22" y="${y+16}" font-size="11" fill="#4A4A4A">${esc(r.sec.name.replace('Kommissionierung ','Kommi. ').replace(' mit Puffer','').replace('bereich',''))} · ${esc(r.lane.replace('Kommissionierer','Komm.').slice(0,22))}</text>`;
      r.segs.forEach(s=>{const x=LW+s.start*sc,w=Math.max(1.5,s.dur*sc);
        g+=`<rect x="${x}" y="${y+4}" width="${w}" height="${RH-8}" rx="3" fill="${s.wait?'#fff':s.batch?'#DCE3E8':r.sec.color}" ${s.wait?`stroke="${r.sec.color}" stroke-dasharray="4 3"`:''} opacity="${/system/i.test(r.lane)?0.45:0.9}"><title>${esc(s.label)}: ${fmtS(s.dur)}</title></rect>`;
        if(w>46)g+=`<text x="${x+4}" y="${y+17}" font-size="10" fill="${s.wait||s.batch?'#4A4A4A':'#fff'}" pointer-events="none">${fmtS(s.dur)}</text>`;});g+='</g>';});
    g+=`<line x1="${LW+total*sc}" y1="${top-6}" x2="${LW+total*sc}" y2="${top+rowsG.length*RH+6}" stroke="#0A223C" stroke-width="1.5"/><text x="${LW+total*sc}" y="${top+rowsG.length*RH+20}" font-size="11" font-weight="700" text-anchor="end" fill="#144477">Durchlaufzeit ${fmtS(total)}</text></svg>`;
    const vids=new Set([M.vKP.id,M.vKF.id,M.vKO.id,M.vWA.id]);
    return `<div class="sheet"><h2>Bearbeitungszeit eines Auftrags: Kommissionierung bis Warenausgang</h2>
      <div class="kpis">
       <div class="kpi"><b>${fmtS(total)}</b><span>Durchlaufzeit Auftrag</span></div>
       <div class="kpi"><b>${fmtS(work*z)}</b><span>Arbeitsinhalt (Vorgabezeit, alle Rollen)</span></div>
       <div class="kpi"><b>${fmtS(work*z/Math.max(nT,1))}</b><span>Arbeitsinhalt je Position</span></div>
       <div class="kpi"><b>${fmtS(waitKons)}</b><span>Liegezeit 1. Teilwagen in Konsolidierung</span></div>
       <div class="kpi"><b>${fmtS(blocks.reduce((s,b)=>s+b[1].c.wait,0)+waitKons)}</b><span>Warte- und Liegezeiten gesamt</span></div>
      </div>
      <div class="tw" style="padding:6px" data-keep="gantt">${g}</div>
      <div class="note" style="margin-top:4px">Zeile anklicken, um den Abschnitt rechts zu bearbeiten. Gestrichelt = Wartezeit (z. B. Shuttle-Takt), grau = übrige Aufträge eines Batches, blass = Systemantwortzeit. Grundzeiten ohne Zuschläge.</div>
    </div>
    <div class="sheet"><h2>Weg des Auftrags auf dem Hallenplan</h2>
      <div class="plan-mini">${planSvg({vids,id:'ordPlan',width:'100%',crop:true,numbered:true})}</div>${flowLegend(vids,true)}</div>
    <div class="grid2">
      <div class="sheet"><h2>Abschnitte</h2><div class="tw" style="margin-top:8px"><table class="t"><tr><th>Abschnitt</th><th>Variante</th><th class="n">Start</th><th class="n">Ende</th><th class="n">Grundzeit</th></tr>
      ${blocks.map(([s,t,v])=>`<tr class="click${UI.sel&&UI.sel.vid===v.id?' on':''}" ${clk(()=>{UI.sel={k:'var',vid:v.id};later();})}><td><span class="row nw"><span class="sw" style="background:${s.color}"></span>${esc(s.name)}</span></td><td>${esc(v.name)}</td><td class="n">${fmtS(t.segs.length?t.segs[0].start:0)}</td><td class="n">${fmtS(t.end)}</td><td class="n">${fmtS(t.c.work)}</td></tr>`).join('')}</table></div></div>
      <div class="sheet"><h2>Arbeitsinhalt je Rolle</h2><div class="tw" style="margin-top:8px"><table class="t"><tr><th>Rolle</th><th class="n">Grundzeit</th><th class="n">Vorgabezeit</th></tr>
      ${Object.entries(roles).map(([l,v])=>`<tr><td>${esc(l)}</td><td class="n">${fmtS(v)}</td><td class="n">${fmtS(v*z)}</td></tr>`).join('')}</table></div></div>
    </div>`;
  },
  insp(){
    if(UI.sel&&UI.sel.k==='var'){const f=findVar(UI.sel.vid);if(f)return variantInspector(f.sec,f.v,`Im Auftrag gelten die Positionen aus dem linken Panel; „pos“ wird dafür überschrieben.`);}
    return insHead('Auftragsdurchlauf','Abschnitt bearbeiten')+`<div class="empty">Nichts ausgewählt. Zeile im <b>Gantt-Diagramm</b> oder in der Tabelle <b>Abschnitte</b> anklicken, um die Variante hier zu bearbeiten.</div>`;
  },
  after(){document.querySelectorAll('.grow').forEach(g=>g.addEventListener('click',()=>{UI.sel={k:'var',vid:g.dataset.vid};later();}));}
};

/* ===================== 5 ZEITBAUSTEINE ===================== */
function bstUsage(id){const out=[];S.sections.forEach(s=>s.variants.forEach(v=>v.steps.forEach(st=>{if(st.el.some(e=>e[0]===id))out.push({s,v,st});})));return out;}
WS.lib={
  panel(){
    const cnt=c=>S.bausteine.filter(b=>!c||b.cat===c).length;
    return `<div class="ph"><h2>Zeitbausteine (MTM)</h2></div>
    <p class="lead">Grundlage der Zeitrechnung. 1 TMU = 0,036 s. Jede Änderung wirkt sofort auf alle Varianten.</p>
    <div class="fg c1">${F('Suchen',I('l-q',UI.libQ,v=>{UI.libQ=v;later();},{type:'search',ph:'ID oder Bezeichnung'}))}</div>
    <h3>Kategorie</h3>
    <div class="list">${[['','Alle Kategorien'],...CATS.map(([c])=>[c,c])].map(([c,l])=>`<div class="li${UI.libCat===c?' on':''}" ${clk(()=>{UI.libCat=c;later();})}>${c?`<span class="sw" style="background:${CATCOL[c]};border:1px solid var(--line)"></span>`:''}<span class="t">${esc(l)}</span><span class="s">${cnt(c)}</span></div>`).join('')}</div>
    <div class="actions">${B('+ Zeitbaustein',()=>edit(()=>{let n=1;while(bById('NEU'+n))n++;const b={id:'NEU'+n,name:'Neuer Baustein',cat:UI.libCat||'Rüsten/Sonstiges',src:'Planzeit',tmu:28,unit:'je Vorgang'};S.bausteine.push(b);UI.sel={k:'bst',id:b.id};}))}</div>
    <div class="note" style="margin-top:10px">„MTM-UAS-Richtwert“ sind an MTM-UAS angelehnte Planwerte; vor verbindlicher Nutzung mit den gültigen MTM-Datenkarten abgleichen. „Planzeit“ sind Erfahrungs- oder Schätzwerte, die durch Zeitaufnahmen im Betrieb ersetzt werden sollten.</div>`;
  },
  main(){
    const q=UI.libQ.toLowerCase();const selId=UI.sel&&UI.sel.k==='bst'?UI.sel.id:null;
    const used={};S.sections.forEach(s=>s.variants.forEach(v=>v.steps.forEach(st=>st.el.forEach(e=>used[e[0]]=(used[e[0]]||0)+1))));
    const list=S.bausteine.filter(b=>(!UI.libCat||b.cat===UI.libCat)&&(!q||(b.id+' '+b.name).toLowerCase().includes(q)));
    return `<div class="sheet"><div class="sheet-h"><h2>Zeitbausteine</h2><span class="note">${list.length} von ${S.bausteine.length} · Zeile anklicken zum Bearbeiten</span></div>
    <div class="tw"><table class="t"><tr><th>ID</th><th>Bezeichnung</th><th>Kategorie</th><th>Quelle</th><th class="n">TMU</th><th class="n">Sekunden</th><th>Einheit</th><th class="n">genutzt</th></tr>
    ${list.map(b=>`<tr class="click${selId===b.id?' on':''}" ${clk(()=>{UI.sel={k:'bst',id:b.id};later();})}><td style="font-family:var(--mono)"><b>${esc(b.id)}</b></td><td>${esc(b.name)}</td><td><span class="row nw"><span class="sw" style="background:${CATCOL[b.cat]||U.mgrey};border:1px solid var(--line)"></span>${esc(b.cat)}</span></td><td class="note">${esc(b.src)}</td><td class="n">${fmt(parseNum(b.tmu),0)}</td><td class="n">${fmt(b.tmu*TMU_S,2)}</td><td>${esc(b.unit)}</td><td class="n">${used[b.id]||'–'}</td></tr>`).join('')||'<tr><td colspan="8" class="note">Kein Zeitbaustein gefunden.</td></tr>'}
    </table></div>
    <div class="note" style="margin-top:8px">Wegzeiten: Gehen 25 TMU/m ≈ 0,9 s/m (≈ 1,1 m/s), mit Kommissionierwagen 30 TMU/m ≈ 1,08 s/m.</div></div>`;
  },
  insp(){
    const b=UI.sel&&UI.sel.k==='bst'?bById(UI.sel.id):null;
    if(!b)return insHead('Zeitbausteine','Baustein bearbeiten')+`<div class="empty">Nichts ausgewählt. <b>Zeile</b> in der Tabelle anklicken oder links <b>+ Zeitbaustein</b> anlegen.</div>`;
    const u=bstUsage(b.id);const p='bst-'+b.id+'-';
    return insHead('Zeitbaustein · '+b.cat,b.name,()=>{UI.sel=null;later();})+
    `<div class="fg">
      ${F('ID (Kürzel)',I(p+'id',b.id,v=>renameBst(b,v),{mono:true}))}${F('Kategorie',SEL(p+'cat',CATS.map(([c])=>[c,c]),b.cat,v=>edit(()=>b.cat=v)))}
      ${F('Bezeichnung',I(p+'name',b.name,v=>edit(()=>b.name=v)),{full:true})}
      ${F('TMU',I(p+'tmu',b.tmu,v=>edit(()=>b.tmu=parseNum(v)),{mono:true,style:'text-align:right'}))}${F('Sekunden',I(p+'sec',fmt(b.tmu*TMU_S,2),v=>edit(()=>b.tmu=Math.round(parseNum(v)/TMU_S*10)/10),{mono:true,style:'text-align:right'}))}
      ${F('Einheit',I(p+'unit',b.unit,v=>edit(()=>b.unit=v)),{full:true})}
      ${F('Quelle',TA(p+'src',b.src,v=>edit(()=>b.src=v),2),{full:true})}
    </div>
    <div class="note">Sekunden und TMU rechnen sich gegenseitig um.</div>
    <h3>Verwendet in (${u.length})</h3>
    ${u.length?`<div class="list">${u.map(x=>`<div class="li" ${clk(()=>openVariant(x.v.id,{k:'step',vid:x.v.id,sid:x.st.id}))} title="Schritt öffnen"><span class="sw" style="background:${x.s.color}"></span><span class="t">${esc(x.st.id)} · ${esc(x.st.name)}</span><span class="s">${esc(short(x.v.name.split(':')[0],14))}</span></div>`).join('')}</div>`:'<div class="note">Noch in keinem Schritt verwendet.</div>'}
    <div class="actions">${B('Duplizieren',()=>edit(()=>{let id=b.id+'2';while(bById(id))id+='2';const n=Object.assign({},b,{id,name:b.name+' (Kopie)'});S.bausteine.splice(S.bausteine.indexOf(b)+1,0,n);UI.sel={k:'bst',id};}))}
    ${B('Löschen',()=>edit(()=>{S.bausteine=S.bausteine.filter(x=>x!==b);UI.sel=null;}),{cls:'danger',dis:u.length>0,title:u.length?'Wird noch in Schritten verwendet':''})}</div>
    ${u.length?'<div class="note" style="margin-top:6px">Löschen ist erst möglich, wenn der Baustein in keinem Schritt mehr vorkommt.</div>':''}`;
  }
};
function renameBst(b,n){n=String(n).trim().replace(/\W/g,'');if(!n||n===b.id){later();return;}if(bById(n)){toast('ID „'+n+'“ ist schon vergeben');later();return;}
  edit(()=>{S.sections.forEach(s=>s.variants.forEach(v=>v.steps.forEach(st=>st.el.forEach(e=>{if(e[0]===b.id)e[0]=n;}))));b.id=n;UI.sel={k:'bst',id:n};});}

/* ===================== 6 METHODIK ===================== */
function sanitize(html){const t=document.createElement('template');t.innerHTML=html;
  t.content.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,textarea,select,img,svg').forEach(n=>n.remove());
  t.content.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{if(/^on/i.test(a.name)||(a.name==='href'&&/^\s*javascript:/i.test(a.value))||a.name==='contenteditable')el.removeAttribute(a.name);}));
  return t.innerHTML;}
function saveMethod(){const d=$('#docBody');if(!d)return;const h=sanitize(d.innerHTML);if(h!==S.method){S.method=h;commit();}}
WS.method={
  panel(){
    const t=document.createElement('template');t.innerHTML=S.method;const hs=[...t.content.querySelectorAll('h2,h3')];
    return `<div class="ph"><h2>Methodik</h2></div>
    <p class="lead">Vorschlag zur Methodik mit Bezugsgrößen, Zeitermittlung und offenen Annahmen.</p>
    <div class="actions" style="margin-top:0">${UI.methodEdit?B('Fertig',()=>{saveMethod();UI.methodEdit=false;later();},{cls:'primary'}):B('Text bearbeiten',()=>{UI.methodEdit=true;later();},{cls:'primary'})}
    ${B('Vorlage wiederherstellen',()=>openConfirm('Methodik-Text auf die Vorlage zurücksetzen?',()=>edit(()=>{S.method=METHOD_HTML;UI.methodEdit=false;})))}</div>
    <h3>Inhalt</h3>
    <div class="list">${hs.map((h,i)=>`<div class="li" ${clk(()=>{const el=document.querySelectorAll('#docBody h2,#docBody h3')[i];if(el)el.scrollIntoView({behavior:'smooth',block:'start'});})}><span class="t"${h.tagName==='H3'?' style="padding-left:10px"':''}>${esc(h.textContent)}</span></div>`).join('')}</div>`;
  },
  main(){
    return `<div class="sheet">${UI.methodEdit?`<div class="doc-tools row">${[['Überschrift','formatBlock','h3'],['Absatz','formatBlock','p'],['Aufzählung','insertUnorderedList',null],['Fett','bold',null]].map(([l,c,a])=>`<button type="button" class="mini" data-cmd="${c}" data-arg="${a||''}">${l}</button>`).join('')}<span class="sp"></span><span class="note">Direkt im Text schreiben. Strg+Z im Text macht Tippfehler rückgängig.</span></div>`:''}
      <div class="doc" id="docBody"${UI.methodEdit?' contenteditable="true"':''}>${S.method}</div></div>`;
  },
  insp:null,
  after(){
    const d=$('#docBody');if(!d||!UI.methodEdit)return;
    d.addEventListener('blur',saveMethod);
    document.querySelectorAll('[data-cmd]').forEach(b=>{b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',()=>{try{document.execCommand(b.dataset.cmd,false,b.dataset.arg||null);}catch(e){}});});
  }
};

/* ===================== Export / Import / Dialoge ===================== */
function openModal(build){MCL={};MCH={};REG='modal';const html=build();REG='main';$('#modalBox').innerHTML=html;$('#modal').classList.add('on');const f=$('#modalBox [autofocus]');if(f)f.focus();}
function closeModal(){$('#modal').classList.remove('on');MCL={};MCH={};}
function openConfirm(msg,ok){openModal(()=>`<h2>Bitte bestätigen</h2><p style="font-size:14px;margin:12px 0 16px">${esc(msg)}</p><div class="row" style="justify-content:flex-end">${B('Abbrechen',closeModal)}${B('Ja, fortfahren',()=>{closeModal();ok();},{cls:'primary'})}</div><div class="note" style="margin-top:8px">Rückgängig ist danach mit Strg+Z möglich.</div>`);}
function openExportText(text,filename,hint){
  openModal(()=>`<div class="row" style="margin-bottom:8px"><h2>${esc(filename)}</h2><span class="sp"></span>${B('Schließen',closeModal)}</div>
   ${hint?`<div class="note" style="margin-bottom:6px">${esc(hint)}</div>`:''}
   <textarea id="mText" readonly>${esc(text)}</textarea>
   <div class="row" style="margin-top:8px;justify-content:flex-end"><span id="mMsg" class="note"></span>${B('In Zwischenablage kopieren',async()=>{try{await navigator.clipboard.writeText(text);$('#mMsg').textContent='Kopiert.';}catch(e){$('#mText').select();$('#mMsg').textContent='Bitte markierten Text mit Strg+C kopieren.';}})}
   ${UI.dl?B('Datei herunterladen',async()=>{const fn=/\.(json|csv|txt)$/i.test(filename)?filename:filename+'.txt';try{await UI.dl.save({filename:fn,data:text});$('#mMsg').textContent=fn===filename?'Download angeboten.':'Als '+fn+' angeboten – nach dem Speichern die Endung .txt entfernen.';}catch(e){$('#mMsg').textContent=e&&e.code==='declined'?'Download abgebrochen.':'Download nicht möglich – bitte kopieren.';}},{cls:'primary'}):''}</div>`);
}
function exportMenu(){
  const {sec,v}=curVar();
  openModal(()=>`<div class="row" style="margin-bottom:10px"><h2>Export</h2><span class="sp"></span>${B('Schließen',closeModal)}</div>
  <div class="list" style="max-height:none">
   <div class="li" ${clk(()=>openExportText(JSON.stringify(S,null,1),'prozessmodell_zentrallager.json','Vollständiges Modell. Über „Import“ wieder einlesbar.'))}><span class="t"><b>Gesamtmodell (JSON)</b><br><span class="note">Ablage, Versionierung, Weitergabe</span></span></div>
   <div class="li" ${clk(()=>openExportText('﻿'+csvAll(),'schrittzeiten_varianten.csv','Semikolon-getrennt, deutsches Zahlenformat.'))}><span class="t"><b>Schrittzeiten aller Varianten (CSV)</b><br><span class="note">für Excel</span></span></div>
   <div class="li" ${clk(()=>exportBpmn(sec,v))}><span class="t"><b>BPMN-XML der aktuellen Variante</b><br><span class="note">${esc(v.name)}</span></span></div>
  </div>`);
}
function importMenu(){
  openModal(()=>`<div class="row" style="margin-bottom:8px"><h2>Import</h2><span class="sp"></span>${B('Schließen',closeModal)}</div>
   <div class="note" style="margin-bottom:6px">JSON-Datei wählen oder Inhalt einfügen. Der aktuelle Stand wird ersetzt (Strg+Z holt ihn zurück).</div>
   <input type="file" id="iFile" accept=".json,application/json" style="margin-bottom:6px">
   <textarea id="iText" placeholder="{ … }"></textarea>
   <div class="row" style="margin-top:8px;justify-content:flex-end"><span id="iMsg" class="err"></span>
   ${B('Auf Startstand zurücksetzen',()=>openConfirm('Alle Änderungen verwerfen und den Erstaufschlag laden?',()=>{S=buildSeed();UI.overlay=null;UI.vid='we1';UI.sel=null;normalize();commit();later();toast('Startstand geladen');}))}
   ${B('Importieren',()=>{try{const o=JSON.parse($('#iText').value);if(!o.sections||!o.zones||!o.bausteine)throw new Error('Keine gültige Modelldatei: sections, zones oder bausteine fehlen.');S=o;UI.overlay=null;UI.sel=null;normalize();commit();closeModal();later();toast('Import übernommen');}catch(e){$('#iMsg').textContent=e.message;}},{cls:'primary'})}</div>`);
  $('#iFile').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{$('#iText').value=r.result;};r.readAsText(f);};
}
function renameProject(){
  openModal(()=>`<h2>Projekt benennen</h2><div class="fg c1" style="margin:12px 0">${F('Untertitel in der Kopfzeile',`<input type="text" id="m-sub" value="${esc(S.meta.sub)}" autofocus>`)}</div>
  <div class="row" style="justify-content:flex-end">${B('Abbrechen',closeModal)}${B('Übernehmen',()=>{const v=$('#m-sub').value.trim();closeModal();if(v)edit(()=>S.meta.sub=v);},{cls:'primary'})}</div>`);
}
function helpModal(){
  openModal(()=>`<div class="row"><h2>So bedienen Sie das Prozessmodell</h2><span class="sp"></span>${B('Schließen',closeModal)}</div>
  <div class="steps3">
   <div><b><i>1</i>Links auswählen</b>Arbeitsbereich in der Leiste wählen, dann im Panel die Variante, Fläche oder den Abschnitt.</div>
   <div><b><i>2</i>Mitte ansehen</b>Hallenplan, BPMN-Diagramm, Vergleich oder Gantt. Ein Klick auf ein Element wählt es aus.</div>
   <div><b><i>3</i>Rechts bearbeiten</b>Der Inspektor zeigt alle Felder des gewählten Elements. Änderungen rechnen sofort durch.</div>
  </div>
  <h3>Arbeitsbereiche</h3>
  <div class="tw"><table class="t"><tr><th>Bereich</th><th>Was Sie dort tun</th></tr>
   <tr><td>1 Layout &amp; Fluss</td><td>Flächen anlegen, verschieben, in der Größe ändern; Flüsse zeichnen; Docks belegen; Wege messen</td></tr>
   <tr><td>2 Prozesse</td><td>Schritte, Zeitbausteine, Verzweigungen, Parameter, Lanes und Flüsse je Variante pflegen</td></tr>
   <tr><td>3 Vergleich</td><td>Varianten eines Abschnitts gegenüberstellen, Zuschläge setzen</td></tr>
   <tr><td>4 Auftrag</td><td>Durchlaufzeit eines Auftrags über vier Abschnitte</td></tr>
   <tr><td>5 Zeitbausteine</td><td>MTM-Richtwerte und Planzeiten pflegen</td></tr>
   <tr><td>Methodik</td><td>Erläuterungstext lesen und bearbeiten</td></tr></table></div>
  <h3>Tastatur</h3>
  <div class="note">Strg+Z rückgängig · Strg+Y wiederholen · Strg+S speichern · Esc Auswahl aufheben · Entf löscht die gewählte Fläche, den Fluss oder Schritt · Strg+Mausrad zoomt den Plan</div>`);
}

/* ===================== Start ===================== */
loadInitial();
document.addEventListener('click',e=>{const t=e.target.closest('[data-c]');if(!t||t.disabled)return;const f=(t.closest('#modal')?MCL:CL)[t.dataset.c];if(f)f(t,e);});
document.addEventListener('change',e=>{const el=e.target;if(!el.id)return;const f=(el.closest('#modal')?MCH:CH)[el.id];if(f)f(el.type==='checkbox'?el.checked:el.value,el);});
document.addEventListener('toggle',e=>{const d=e.target;if(d.classList&&d.classList.contains('grp'))UI.paramOpen['g:'+d.id.slice(2)]=d.open;},true);
$('#bUndo').onclick=undo;$('#bRedo').onclick=redo;
$('#bSave').onclick=saveToArtifact;$('#bExport').onclick=exportMenu;$('#bImport').onclick=importMenu;$('#bHelp').onclick=helpModal;$('#prjName').onclick=renameProject;
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
document.addEventListener('keydown',e=>{
  const inField=e.target.closest&&e.target.closest('input,textarea,select,[contenteditable=true]');
  const mod=e.ctrlKey||e.metaKey;
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();if(UI.methodEdit)saveMethod();saveToArtifact();return;}
  if(e.key==='Escape'){if($('#modal').classList.contains('on')){closeModal();return;}if(UI.flowStart||UI.tool!=='select'){UI.flowStart=null;UI.tool='select';later();return;}if(UI.sel){UI.sel=null;later();}return;}
  const k=e.key.toLowerCase();
  if(inField){const el=e.target;const clean=(el.tagName==='INPUT'||el.tagName==='TEXTAREA')&&el.value===el.defaultValue;
    if(!(mod&&(k==='z'||k==='y')&&clean))return;}
  if(mod&&e.key.toLowerCase()==='z'&&!e.shiftKey){e.preventDefault();undo();return;}
  if(mod&&(e.key.toLowerCase()==='y'||(e.key.toLowerCase()==='z'&&e.shiftKey))){e.preventDefault();redo();return;}
  if((e.key==='Delete'||e.key==='Backspace')&&UI.sel){const s=UI.sel;
    if(s.k==='zone'){e.preventDefault();edit(()=>{S.zones=S.zones.filter(z=>z.id!==s.id);UI.sel=null;});toast('Fläche gelöscht – Strg+Z holt sie zurück');}
    else if(s.k==='flow'){e.preventDefault();const f=findVar(s.vid);edit(()=>{f.v.flows=f.v.flows.filter(x=>x.id!==s.fid);UI.sel=null;});toast('Fluss gelöscht – Strg+Z holt ihn zurück');}
    else if(s.k==='step'){e.preventDefault();const f=findVar(s.vid);edit(()=>{f.v.steps=f.v.steps.filter(x=>x.id!==s.sid);UI.sel=null;});toast('Schritt gelöscht – Strg+Z holt ihn zurück');}}
});
window.addEventListener('beforeunload',()=>{if(UI.methodEdit)saveMethod();});
const h0=(location.hash||'').slice(1);if(WS[h0])UI.ws=h0;
window.addEventListener('hashchange',()=>{const t=location.hash.slice(1);if(WS[t]&&t!==UI.ws)setWs(t);});
render();
if(UI.ws==='layout')requestAnimationFrame(fitPlan);
initCaps();
