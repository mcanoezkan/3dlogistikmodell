/* =====================================================================
   8 · FOLIEN (jede Folie = eine Punktwolken-Szene)
   ===================================================================== */
const SLIDES=[];
const Ht=(t,d,n)=>(n?'<span class="n">'+n+'</span>':'')+'<span class="t">'+t+'</span>'+(d?'<div class="d">'+d+'</div>':'');
const H2=(t,d,n)=>(n?'<span class="n">'+n+'</span>':'')+'<span class="t2">'+t+'</span>'+(d?'<div class="d">'+d+'</div>':'');
const P2=n=>String(n).padStart(2,'0');
function rotP(p,rx,ry,rz){const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx),cz=Math.cos(rz||0),sz=Math.sin(rz||0);
 let x=cy*p[0]+sy*p[2],y=p[1],z=-sy*p[0]+cy*p[2];const y2=cx*y-sx*z,z2=sx*y+cx*z;return[cz*x-sz*y2,sz*x+cz*y2,z2]}
/* Knoten: Kugel + kreisender Ring */
function node(B,key,p,r,col,o){o=o||{};const b=new PB(hsh(key));b.sphere(0,0,0,r,o.n||Math.round(1400*r*r+160));
 B.g(key,b,Object.assign({pos:p,col,size:.03,stiff:.06},o.g||{}));
 if(o.ring!==false){const b2=new PB(hsh(key)+3);b2.ring(0,0,0,r*(o.rf||1.65),o.rn||Math.round(380*r+70),.01,'xy');B.g(key+'_r',b2,Object.assign({pos:p,col:o.rc||col,gain:.55,size:.022,spin:[0,0,o.rs||.3]},o.gr||{}))}}
/* gemeinsame Bausteine: chaotische Wolke, Kristall, Datenwürfel */
function chaosPts(seed,r,n){const b=new PB(seed);for(let i=0;i<n;i++){const k=i%5;if(k<3)b.cloud(0,0,0,r*.55,r*.45,r*.45,1);else{const a=b.r()*TAU;b.cloud(Math.cos(a)*r*.9,Math.sin(a)*r*.7,(b.r()-.5)*r,r*.18,r*.18,r*.18,1)}}return b}
function crystalPts(seed,r,n){const b=new PB(seed),V=[];const t=(1+Math.sqrt(5))/2;[[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],[0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]].forEach(v=>V.push(ml(nm(v),r)));
 const E=[];for(let i=0;i<12;i++)for(let j=i+1;j<12;j++)if(Math.abs(ln3(sb(V[i],V[j]))-r*1.0515)<.05*r)E.push([V[i],V[j]]);
 const ne=Math.round(n*.62/E.length);for(const e of E)b.seg(e[0],e[1],ne);b.sphere(0,0,0,r*.55,Math.round(n*.25));for(const v of V)b.ball(v[0],v[1],v[2],r*.07,Math.round(n*.13/12));return b}
function cubePts(seed,s,n){const b=new PB(seed);b.edges(-s,-s,-s,s,s,s,Math.round(n*.45));const g=3;for(let i=0;i<=g;i++)for(let j=0;j<=g;j++)for(let k=0;k<=g;k++)b.ball(-s+2*s*i/g,-s+2*s*j/g,-s+2*s*k/g,s*.06,Math.max(2,Math.round(n*.55/64)));return b}

/* =====================================================================
   SZENEN-VORLAGEN (allgemein, aus dem Deck „Zukunftsbild Controlling“ abgeleitet)
   Jede Funktion liefert ein Folienobjekt: SLIDES.push(SZ.titel({...}))
   Gemeinsame Felder in o: lab (Übersicht), t (Titel, <em>Akzent</em>), s (Untertitel), idx, note, hint
   ===================================================================== */
const SERIF='Georgia,"Times New Roman","DejaVu Serif",serif';
const SZ={};
const ringPath=(R,n,pl)=>{const a=[];for(let k=0;k<n;k++){const t=k/n*TAU;a.push(pl=='xz'?[Math.sin(t)*R,0,Math.cos(t)*R]:[Math.cos(t)*R,Math.sin(t)*R,0])}return a};
const alFor=a=>{const cx=Math.cos(a);return cx>.3?'l':cx<-.3?'r':(Math.sin(a)>0?'a':'b')};

/* Titel: Galaxie + bis zu 3 umlaufende Knoten (Sprungziele). o:{kicker,title,em,sub,date,orbits:[{k,t,go}]} */
SZ.titel=o=>({lab:o.lab||'Titel',t:'',s:'',cam:{sway:.05},build(B){const C0=[3.7,.25,-1.4],R0=[1.05,0,-.32],b1=new PB(11),b2=new PB(12),b3=new PB(13),rn=rng(5);
 for(let i=0;i<16000;i++){const rad=.28+Math.pow(rn(),.85)*3.7,arm=i%3,th=arm*TAU/3+rad*1.18+b1.gs()*.34/(.45+rad*.3),y=b1.gs()*.09*(1.3-rad/4);(rad<1.15?b1:rad<2.5?b2:b3).p(Math.cos(th)*rad,y,Math.sin(th)*rad)}
 b1.ball(0,0,0,.42,1800);const og={pos:C0,rot:R0,spin:[0,.045,0],stiff:.028};
 B.g('gx1',b1,Object.assign({col:C.w,gain:.62,size:.026},og));B.g('gx2',b2,Object.assign({col:C.acc,gain:.7,size:.026},og));B.g('gx3',b3,Object.assign({col:C.petrol,gain:.95,size:.026},og));
 const orbs=o.orbits||[],orb=k=>{const a=T*.07+k*TAU/Math.max(1,orbs.length),p=rotP([Math.cos(a)*4.3,0,Math.sin(a)*4.3],R0[0],0,R0[2]);return ad(C0,p)};
 orbs.forEach((x,k)=>{node(B,'o'+k,orb(k),.2,[C.sky,C.acc,C.mint][k%3],{n:520,g:{gain:1.15}});const go=()=>{if(x.go!==undefined)goTo(x.go)};
  B.lab('ol'+k,()=>ad(orb(k),[0,.42,0]),'<span class="k">'+x.k+'</span><div class="t2" style="margin-top:.2em">'+x.t+'</div>',{al:'a',click:go,hk:'h'+k});B.hot('h'+k,()=>orb(k),.35,{grp:['o'+k],click:go})});
 B.dyn=()=>orbs.forEach((x,k)=>{const p=orb(k);for(const s of['o'+k,'o'+k+'_r']){const g=RG(s);if(g){g.pos=p;g.posC=p.slice()}}L(C0,p,C.acc,.12*LFADE)});
 B.hero='<div class="k">'+(o.kicker||'')+'</div><h1>'+o.title+(o.em?'<br><em>'+o.em+'</em>':'')+'</h1><p>'+(o.sub||'')+'</p><div class="d">'+(o.date||'')+'</div><div class="row"><button class="btn pri" data-go="1">Starten →</button><button class="btn" data-go="ov">Übersicht</button></div>';B.hint=orbs.length?'Knoten anklicken · Szene ziehen':''}});

/* Agenda: Kapitelknoten auf einer Kurve. o:{items:[{n,t,d,list,go,count}]} */
SZ.agenda=o=>({lab:o.lab||'Agenda',t:o.t||'Agenda',s:o.s||'',cam:{yaw:-.08,pitch:.04},init:()=>({sel:0}),build(B,st){const N=o.items.length,P=o.items.map((_,k)=>[-5.4+k*11/Math.max(1,N-1),k%2?.6:-.8,.6-k*.4]);
 const path=crv([[-9,-2,1.4],...P,[9.5,.4,-2]],22);B.path('fl',path,2400,{col:C.acc,speed:.02,spread:.07,size:.025,gain:.7});
 const pick=k=>{if(st.sel===k&&o.items[k].go!==undefined)goTo(o.items[k].go);else{st.sel=k;refresh()}};
 o.items.forEach((a,k)=>{const p=P[k],sel=st.sel===k,b=new PB(100+k);b.sphere(0,0,0,.34,760);B.g('c'+k,b,{pos:p,col:sel?C.acc:C.sky,gain:sel?1.3:.75,scale:sel?1.18:1});
  const r=new PB(110+k);r.ring(0,0,0,.68,560,.012);B.g('r'+k,r,{pos:p,col:sel?C.acc:C.petrol,gain:.9,spin:[0,0,.2*(k%2?1:-1)]});
  const s=new PB(120+k),c=a.count||(a.list||[]).length||3;for(let j=0;j<c;j++){const an=j/c*TAU;s.ball(Math.cos(an),Math.sin(an),0,.07,50)}B.g('s'+k,s,{pos:p,rot:[.9,0,0],col:C.w,gain:sel?1.1:.6,size:.024,spin:[0,.35,0]});
  const up=k%2==0;B.lab('l'+k,ad(p,[0,up?1.12:-1.12,0]),'<div class="k">'+(a.n||P2(k+1))+'</div><div class="t2" style="font-size:max(14px,calc(var(--u)*1.35))">'+a.t+'</div><div class="d">'+(a.d||'')+'</div>',{al:up?'a':'b',w:2.4,cls:sel?'sel c':'c',click:()=>pick(k),hk:'h'+k});
  B.hot('h'+k,p,.8,{grp:['c'+k,'r'+k,'s'+k],click:()=>pick(k)})});
 const a=o.items[st.sel];B.cap={k:a.n||P2(st.sel+1),t:a.t,s:a.d,list:a.list};if(a.go!==undefined)B.act=[{t:'Öffnen →',f:()=>goTo(a.go)}];B.hint='Anklicken · zweiter Klick öffnet'}});

/* Kapiteltrenner: große Ziffer aus Punkten + Umlaufbahn mit Themen (fokus = Indizes hervorgehoben). o:{num,kap,items:[...],focus:[...]} */
SZ.kapitel=o=>({lab:o.lab||('Kapitel '+o.num),idx:o.idx||('Kapitel '+o.kap),t:o.t,s:o.s,cam:{yaw:-.12,pitch:.05,sway:.05},build(B){const N0=[3.3,-.3,0],R=3.0,items=o.items||[],focus=o.focus||items.map((_,i)=>i),n=Math.max(items.length,1);
 const t=new PB(hsh(o.num));t.text(o.num,0,0,4.2,8600,0,0,700,SERIF);for(let i=0;i<t.a.length;i+=3)t.a[i+2]=(t.r()-.5)*.3;B.g('num',t,{pos:N0,col:C.w,gain:.85,size:.028,tw:.3});
 const h=new PB(hsh(o.num)+1);h.text(o.num,0,0,4.2,2600,-.3,.35,700,SERIF);B.g('halo',h,{pos:N0,col:C.acc,gain:.32,size:.03,jit:.06,jf:.5,scale:1.03});
 const og={pos:N0,rot:[.34,0,0],spin:[0,.07,0]};B.path('orb',ringPath(R,64,'xz'),1500,Object.assign({closed:true,col:C.petrol,speed:.01,spread:.03,size:.022,gain:.65},og));
 items.forEach((d,k)=>{const f=focus.includes(k),a=k*TAU/n,lp=[Math.sin(a)*R,0,Math.cos(a)*R],b=new PB(700+k);b.sphere(lp[0],lp[1],lp[2],f?.26:.13,f?620:200);
  B.g('d'+k,b,Object.assign({col:f?C.acc:C.dim,gain:f?1.4:.7},og));if(f)B.lab('l'+k,{g:'d'+k,p:ad(lp,[0,.42,0])},'<span class="t">'+d+'</span>',{al:'a',cls:()=>toW(SID+':d'+k,lp)[2]<N0[2]-.8?'dim':''})});
 B.dyn=()=>{for(const k of focus){const a=k*TAU/n;L(N0,toW(SID+':d'+k,[Math.sin(a)*R,0,Math.cos(a)*R]),C.acc,.2*LFADE)}};
 if(items.length)B.cap={k:o.capK||'Schwerpunkte',list:focus.map(k=>'<b>'+items[k]+'</b>')};B.note=o.note||''}});

/* Kennzahlen: große Zahlen links, rotierende Datenkugel rechts. o:{kpis:[[zahl,text]], kern:'Text in der Kugel'} */
SZ.kennzahlen=o=>({lab:o.lab,t:o.t,s:o.s,build(B){const Q=[3.0,-.2,0];
 const sh=new PB(31);sh.sphere(0,0,0,2.2,5200);B.g('sh',sh,{pos:Q,col:C.sky,gain:.6,size:.022,spin:[0,.08,0],rot:[.35,0,0]});
 const nb=new PB(32);for(let i=0;i<60;i++){const y=1-2*(i+.5)/60,q=Math.sqrt(1-y*y),t=i*2.39996;nb.ball(Math.cos(t)*q*2.25,y*2.25,Math.sin(t)*q*2.25,.05,24)}B.g('nb',nb,{pos:Q,col:C.acc,gain:1.2,size:.024,spin:[0,.08,0],rot:[.35,0,0]});
 const cr_=new PB(33);cr_.ball(0,0,0,.7,1200);B.g('cr',cr_,{pos:Q,col:C.w,gain:.8,size:.026});const at=new PB(34);at.ring(0,0,0,2.45,1100,.035);B.g('at',at,{pos:Q,col:C.acc,gain:.28});
 if(o.kern)B.lab('kern',Q,'<span class="t">'+o.kern+'</span>',{al:'c'});
 o.kpis.forEach((k,i)=>B.lab('kp'+i,[-6.95,1.45-i*1.08,0],'<div class="big">'+k[0]+'</div><div class="d" style="margin-top:.5em">'+k[1]+'</div>',{al:'l',w:3.7}));B.note=o.note||''}});

/* Radial: Kern + n Knoten (3–8), Auswahl zeigt Detail. o:{kern:'Text',items:[{t,d,chips}]} */
SZ.radial=o=>({lab:o.lab,t:o.t,s:o.s,init:()=>({sel:0,auto:false,last:0}),build(B,st){const C6=[2.25,-.02,0],R=2.12,TL=.32,n=o.items.length,ang=k=>PI/2-k*TAU/n,pos=k=>ad(C6,[Math.cos(ang(k))*R,Math.sin(ang(k))*R*Math.cos(TL),-Math.sin(ang(k))*R*Math.sin(TL)]);
 const cs=new PB(600);cs.sphere(0,0,0,.84,2300);B.g('cs',cs,{pos:C6,col:C.acc,gain:.6,size:.024,spin:[0,.12,0]});const ci=new PB(601);ci.ball(0,0,0,.42,900);B.g('ci',ci,{pos:C6,col:C.w,gain:.75});
 const orb=[];for(let k=0;k<=70;k++){const a=PI/2-k/70*TAU;orb.push(ad(C6,[Math.cos(a)*R,Math.sin(a)*R*Math.cos(TL),-Math.sin(a)*R*Math.sin(TL)]))}B.path('orb',orb,1300,{closed:true,col:C.petrol,speed:.012,spread:.04,size:.022,gain:.7});
 const sel_=k=>{st.sel=k;st.auto=false;refresh()};
 o.items.forEach((d,k)=>{const p=pos(k),sel=k===st.sel;node(B,'n'+k,p,.27,sel?C.acc:C.sky,{n:480,g:{gain:sel?1.5:.75,scale:sel?1.3:1}});
  B.path('sp'+k,[ad(C6,ml(nm(sb(p,C6)),.9)),ad(p,ml(nm(sb(p,C6)),-.35))],sel?520:220,{col:sel?C.acc:C.petrol,speed:sel?.45:.15,spread:sel?.05:.02,size:.022,gain:sel?1.1:.6});
  const a=ang(k);B.lab('l'+k,ad(p,[Math.cos(a)*.62,Math.sin(a)*.55,0]),'<span class="n">'+P2(k+1)+'</span><span class="t">'+d.t+'</span>',{al:alFor(a),cls:sel?'sel':'',click:()=>sel_(k),hk:'h'+k});
  B.hot('h'+k,p,.5,{grp:['n'+k,'n'+k+'_r'],click:()=>sel_(k)})});
 if(o.kern)B.lab('cl',C6,'<span class="t">'+o.kern+'</span>',{al:'c',w:1.5});
 const d=o.items[st.sel];B.cap={n:P2(st.sel+1),t:d.t,s:d.d,chips:d.chips};
 B.act=[{t:st.auto?'Rundgang stoppen':'Rundgang starten ▸',on:st.auto,f:()=>{st.auto=!st.auto;st.last=T;refresh()}}];
 B.dyn=()=>{if(st.auto&&T-st.last>2.8){st.last=T;st.sel=(st.sel+1)%n;refresh()}};B.note=o.note||'';B.hint='Element anklicken'}});

/* Vorher → Nachher: verstreute Inseln (heute) verschmelzen zum Ring (Zielbild). o:{items:[[heute,ziel]],capHeute:{...},capZiel:{...},labels:['Status quo','Zielbild']} */
SZ.wandel=o=>({lab:o.lab,t:o.t,s:o.s,init:()=>({m:0}),build(B,st){const C5=[1.75,-.42,0],m=st.m,n=o.items.length,ang=k=>PI/2-k*TAU/n,rn=rng(77),isl=[],LB=o.labels||['Status quo','Zielbild'];
 for(let k=0;k<n;k++){const a=ang(k);isl.push([Math.cos(a)*2.75+(rn()-.5)*.8,Math.sin(a)*1.75+(rn()-.5)*.45,-1.5+rn()*2.2])}
 const COLS=[C.sky,C.pain,C.petrol,C.sky,C.pain,C.bg,C.petrol,C.pain];
 for(let k=0;k<n;k++){const b=new PB(500+k),a=ang(k);
  if(m==0){const c=isl[k];for(let i=0;i<700;i++){if(i%4==0){const fa=((i>>2)%3)*2.1+k;b.cloud(c[0]+Math.cos(fa)*.55,c[1]+Math.sin(fa)*.4,c[2],.09,.09,.09,1)}else b.cloud(c[0],c[1],c[2],.3,.22,.22,1)}}
  else{const sp=TAU/n*.43;for(let i=0;i<700;i++){const t=a+(b.r()*2-1)*sp,v=b.r()*TAU,Rr=2.05+Math.cos(v)*.17;b.p(Math.cos(t)*Rr,Math.sin(t)*Rr,Math.sin(v)*.17)}}
  B.g('i'+k,b,{pos:C5,col:m?(k%2?C.acc:C.green):COLS[k%8],gain:m?1.05:.9,jit:m?0:.06,jf:.6,size:.028});
  const lp=m?[Math.cos(a)*2.55,Math.sin(a)*2.4,0]:ad(isl[k],[Math.cos(a)*.62,Math.sin(a)*.5,0]);
  B.lab('l'+k,ad(C5,lp),(m?'':'<span class="n" style="color:#E8609F">'+P2(k+1)+'</span>')+H2(o.items[k][m],'',m?P2(k+1):''),{al:alFor(a),w:2.6})}
 if(m){B.path('rg',ringPath(2.05,72),1500,{pos:C5,closed:true,col:C.w,speed:-.03,spread:.05,size:.022,gain:.75});const cb=new PB(520);cb.sphere(0,0,0,.55,900);B.g('core',cb,{pos:C5,col:C.acc,spin:[0,.2,0]});if(o.kern)B.lab('cl',C5,'<span class="t">'+o.kern+'</span>',{al:'c'})}
 else{const nb=new PB(521);nb.cloud(0,0,-.5,2.2,1.3,1.2,1000);B.g('noise',nb,{pos:C5,col:C.dim,gain:.5,jit:.25,jf:.25,size:.022})}
 B.hot('all',C5,3.2,{click:()=>{st.m=1-st.m;refresh()}});B.act=LB.map((t,i)=>({t,on:m==i,f:()=>{st.m=i;refresh()}}));
 B.cap=m?o.capZiel:o.capHeute;B.note=o.note||'';B.hint='Szene anklicken: '+LB[0]+' ↔ '+LB[1]}});

/* Problem → Lösung: bis zu 4 Zeilen, Klick lässt Lösung aus der Problemwolke entstehen. o:{rows:[[problem,detail,loesung,detail]],kopfL,kopfR,frage} */
SZ.loesungen=o=>({lab:o.lab,t:o.t,s:o.s,init:()=>({rev:o.rows.map(()=>false)}),build(B,st){const XP=-6.45,XC=.95,YY=[1.2,.05,-1.1,-2.25];
 B.lab('hp',[-6.95,1.95,0],'<span class="k" style="color:#E8609F">'+(o.kopfL||'Mögliche Pain Points')+'</span>',{al:'l'});B.lab('hc',[.35,1.95,0],'<span class="k" style="color:#2FC7A5">'+(o.kopfR||'UNITY Capabilities')+'</span>',{al:'l'});
 o.rows.slice(0,4).forEach((r,i)=>{const on=st.rev[i],y=YY[i],tg=()=>{st.rev[i]=!st.rev[i];refresh()};
  B.g('p'+i,chaosPts(1200+i,.36,700),{pos:[XP,y,0],col:C.pain,gain:on?.4:1.1,jit:on?.015:.06,jf:.8,size:.026,scale:on?.75:1});
  B.g('c'+i,crystalPts(1210+i,.3,800),{pos:[XC,y,0],col:on?C.acc:C.dim,gain:on?1.35:.22,scale:on?1:.55,size:.026,spin:[.2,.5,0]});
  B.path('f'+i,crv([[XP+.35,y-.12,0],[-3.4,y-.5,-1.4],[XC-.4,y-.1,0]],14),on?700:1,{col:C.acc,speed:.3,spread:.05,size:.022});
  B.lab('pl'+i,[XP+.55,y,0],H2(r[0],r[1],i+1),{al:'l',w:4.3,cls:on?'dim':'pain',click:tg,hk:'h'+i});B.lab('cl'+i,[XC+.5,y,0],H2(r[2],r[3]),{al:'l',w:5.2,cls:on?'sel':'ghost',click:tg,hk:'h'+i});
  B.hot('h'+i,[XP,y,0],.5,{grp:['p'+i],click:tg});B.hot('hc'+i,[XC,y,0],.45,{grp:['c'+i],click:tg})});
 const all=st.rev.every(Boolean);B.act=[{t:all?'Zurücksetzen':'Alle Lösungen einblenden',on:all,f:()=>{st.rev=st.rev.map(()=>!all);refresh()}}];
 B.note=o.frage?'<em>Diskussion:</em> '+o.frage:(o.note||'');B.hint='Zeile anklicken'}});

/* Prozess: Schritte (3–8) als Knoten auf einem Datenstrom; Auswahl zeigt Detail, optional Pain Points. o:{steps:[{t,d,pain}]} */
SZ.prozess=o=>({lab:o.lab,t:o.t,s:o.s,cam:{pitch:.08,yaw:-.1},init:()=>({sel:-1,pain:false}),build(B,st){const n=o.steps.length,X=i=>-5.2+i*10.8/Math.max(1,n-1),Y=i=>Math.sin(i*.9)*.35;
 const pts=[[-8.5,Y(0),0],...o.steps.map((_,i)=>[X(i),Y(i),0]),[8.5,Y(n-1),0]];B.path('f',crv(pts,16),2600,{col:st.pain?C.pain:C.acc,speed:.03,spread:st.pain?.16:.08,size:.022,gain:.85,jit:st.pain?.04:0});
 o.steps.forEach((s,i)=>{const p=[X(i),Y(i),0],sel=st.sel===i,hit=st.pain&&s.pain,b=new PB(300+i);b.sphere(0,0,0,.3,600);b.ring(0,0,0,.5,260,.01);
  B.g('s'+i,b,{pos:p,col:hit?C.pain:sel?C.acc:C.sky,gain:hit||sel?1.5:.85,jit:hit?.05:0,scale:sel?1.2:1,spin:[0,.3,0]});
  const up=i%2==0;B.lab('l'+i,ad(p,[0,up?.65:-.65,0]),'<span class="n">'+P2(i+1)+'</span><span class="t2">'+s.t+'</span>',{al:up?'a':'b',w:1.9,cls:'c'+(sel?' sel':'')+(hit?' pain':''),click:()=>{st.sel=sel?-1:i;refresh()},hk:'h'+i});
  B.hot('h'+i,p,.5,{grp:['s'+i],click:()=>{st.sel=sel?-1:i;refresh()}})});
 const s=o.steps[st.sel];B.cap=s?{n:P2(st.sel+1),t:s.t,s:st.pain&&s.pain?s.pain:s.d}:(o.cap||null);
 if(o.steps.some(x=>x.pain))B.act=[{t:'Prozesssicht',on:!st.pain,f:()=>{st.pain=false;refresh()}},{t:'Pain Points',on:st.pain,f:()=>{st.pain=true;refresh()}}];B.note=o.note||'';B.hint='Schritt anklicken'}});

/* Pyramide: Ebenen von oben nach unten (2–5). o:{levels:[{t,d,k}]} */
SZ.pyramide=o=>({lab:o.lab,t:o.t,s:o.s,cam:{pitch:.12,yaw:-.05},init:()=>({sel:0,ang:0}),build(B,st){const P0=[2.3,-1.85,0],W=2.15,H=3.75,n=o.levels.length,gap=.03;
 o.levels.forEach((l,k)=>{const h1=1-k/n-gap,h0=1-(k+1)/n,b=new PB(800+k),s=k===st.sel;
  for(let i=0;i<Math.round(1400+k*500);i++){const f=i%4,sx=b.r()*2-1,t=b.r(),y=h0+(h1-h0)*t,w=W*(1-y);let x,z;if(f==0){x=sx*w;z=w}else if(f==1){x=w;z=-sx*w}else if(f==2){x=-sx*w;z=-w}else{x=-w;z=sx*w}b.p(x,y*H,z)}
  for(const y of[h0,h1]){const w=W*(1-y),c=[[-w,w],[w,w],[w,-w],[-w,-w]];for(let e=0;e<4;e++){const a=c[e],q=c[(e+1)%4];b.seg([a[0],y*H,a[1]],[q[0],y*H,q[1]],80)}}
  B.g('L'+k,b,{pos:P0,col:s?C.acc:k%2?C.petrol:C.blue,gain:s?1.5:.7,lo:[0,s?.25:0,0],size:.025});
  B.lab('it'+k,[-6.95,1.5-k*.75,0],(l.k?'<span class="k">'+l.k+'</span><br>':'')+'<span class="t2">'+l.t+'</span>',{al:'l',cls:s?'sel':'',click:()=>{st.sel=k;refresh()}});
  B.hot('h'+k,ad(P0,[0,(h0+h1)/2*H,0]),.6+.3*k,{grp:['L'+k],click:()=>{st.sel=k;refresh()}})});
 B.dyn=(t,dt)=>{st.ang+=dt*.16;for(let k=0;k<n;k++){const g=RG('L'+k);if(g){g.rot[1]=st.ang;g.rotC[1]=st.ang}}};
 const l=o.levels[st.sel];B.cap={k:l.k||('Ebene '+(st.sel+1)),t:l.t,s:l.d};B.note=o.note||'';B.hint='Ebene wählen'}});

/* Stufen/Treppe (Reifegrad, Aufbau): 3–5 Blöcke steigend. o:{steps:[{k,t,d}],krone:true} */
SZ.stufen=o=>({lab:o.lab,t:o.t,s:o.s,cam:{x:.9,y:-.55,yaw:-.42,pitch:.22,d:1.05},init:()=>({sel:o.steps.length-1}),build(B,st){const n=o.steps.length,XC=o.steps.map((_,k)=>-1.9+k*7.35/Math.max(1,n-1)),HH=o.steps.map((_,k)=>1+k*2.55/Math.max(1,n-1)),Y0=-2.3,CL=[C.blue,C.petrol,C.green,C.lg,C.acc];
 o.steps.forEach((a,k)=>{const s=k===st.sel,x=XC[k],h=HH[k],w=Math.min(1.05,3.4/n),b=new PB(1600+k);b.box(x-w,Y0,-.85,x+w,Y0+h,.85,Math.round(1400+h*500));b.edges(x-w,Y0,-.85,x+w,Y0+h,.85,900);
  B.g('b'+k,b,{col:CL[k%5],gain:s?1.35:.62,lo:[0,s?.18:0,0],size:.024});
  B.lab('l'+k,[x,Y0+h+.35+(s?.18:0),.85],'<span class="k">'+(a.k||'Stufe '+P2(k+1))+'</span><div class="t2" style="font-size:max(13px,calc(var(--u)*1.2))">'+a.t+'</div>',{al:'a',w:2,cls:s?'sel c':'c',click:()=>{st.sel=k;refresh()},hk:'h'+k});
  B.hot('h'+k,[x,Y0+h/2,0],1.1,{grp:['b'+k],click:()=>{st.sel=k;refresh()}})});
 if(o.krone!==false){const ch=new PB(1610),cx=XC[n-1],cy=Y0+HH[n-1]+.42;ch.sphere(cx,cy,0,.3,700);B.g('krone',ch,{col:C.pain,gain:1.5})}
 B.path('ar',[[XC[0]-1.3,Y0+.2,1.6],[XC[n-1]+1.4,Y0+HH[n-1]+.9,1.6]],900,{col:C.acc,speed:.08,spread:.04,size:.022,gain:.8});
 const a=o.steps[st.sel];B.cap={k:a.k||'Stufe '+(st.sel+1),t:a.t,s:a.d};B.note=o.note||'';B.hint='Stufe anklicken'}});

/* Roadmap: Spuren × Phasen. o:{phases:['Phase 1 · …'],lanes:[{w,c,it:[[start%,breite%,phase,text]]}]} */
SZ.roadmap=o=>({lab:o.lab,t:o.t,s:o.s,cam:{yaw:-.1,pitch:.05},init:()=>({ph:o.phases.length,front:o.phases.length}),build(B,st){const X0=-3.4,WX=10.2,np=o.phases.length,Y=i=>1.3-i*Math.min(.9,4/o.lanes.length),ph=st.ph;
 o.phases.forEach((p,k)=>{B.lab('ph'+k,[X0+(k+.5)*WX/np,2.05,0],'<span class="t">'+p+'</span>',{al:'a',cls:k<ph?'sel':'dim',click:()=>{st.ph=k+1;refresh()}});if(k)B.ln([X0+k*WX/np,1.85,-.3],[X0+k*WX/np,-2.6,-.3],C.dim,.35)});
 o.lanes.forEach((w,i)=>{const y=Y(i),col=w.c||[C.blue,C.petrol,C.green,C.acc,C.lg][i%5];B.lab('w'+i,[X0-.35,y,0],'<span class="t2" style="font-size:max(10px,calc(var(--u)*.86))">'+w.w+'</span>',{al:'r',w:3.2});
  B.path('lane'+i,[[X0-.1,y,-.2],[X0+WX+.2,y,-.2]],380,{col:C.dim,speed:.03,spread:.02,size:.018,gain:.55});
  w.it.forEach((it,j)=>{const x0=X0+it[0]/100*WX+.06,wx=it[1]/100*WX-.12,on=it[2]<=ph,h=.5,key='b'+i+'_'+j;
   B.path(key,[[x0,y,0],[x0+wx,y,0]],Math.round(wx*75),{col,speed:.06,spread:h*.62,size:.022,gain:on?.85:.05,fade:false,pm:(l,V)=>{V[2]*=.35;V[1]=y+(V[1]-y)*.55}});
   const cp=new PB(hsh(key));cp.ball(x0,y,0,.15,90);cp.ball(x0+wx,y,0,.15,90);cp.seg([x0,y+.21,0],[x0+wx,y+.21,0],Math.round(wx*40));cp.seg([x0,y-.21,0],[x0+wx,y-.21,0],Math.round(wx*40));B.g(key+'f',cp,{col,gain:on?.9:.04,size:.02});
   B.lab(key+'l',[x0+.14,y,0],'<span class="d" style="color:#fff">'+it[3]+'</span>',{al:'l',w:wx-.25,cls:on?'':'off'})})});
 const sw=new PB(2100);sw.seg([0,1.8,0],[0,-2.55,0],600,.03);B.g('front',sw,{pos:[X0+st.front/np*WX,0,.1],col:C.acc,gain:1.1});
 B.dyn=(t,dt)=>{st.front+=(ph-st.front)*Math.min(1,dt*2.2);const g=RG('front');if(g){g.pos=[X0+st.front/np*WX,0,.1];g.posC=g.pos.slice()}};
 const me=SID;B.act=[{t:'Abspielen ▸',f:()=>{st.ph=1;st.front=0;refresh();for(let k=2;k<=np;k++)setTimeout(()=>{if(SID===me){st.ph=k;refresh()}},1300*(k-1))}},...o.phases.map((p,k)=>({t:'Phase '+(k+1),on:ph===k+1,f:()=>{st.ph=k+1;refresh()}}))];
 B.note=o.note||'';B.hint='Phase wählen oder abspielen'}});

/* Drei Spalten in Stufen (Erkenntnis → Maßnahme → Quick Win). o:{cols:[[kopf,[[t,d],..]],..x3]} */
SZ.dreiklang=o=>({lab:o.lab,t:o.t,s:o.s,init:()=>({take:1}),build(B,st){const XC=[-6.55,-1.6,3.35],Y=[1.05,-.35,-1.75],tk=st.take,CC=[C.pain,C.sky,C.acc];
 o.cols.forEach((c,k)=>{const on=k<tk;B.lab('hd'+k,[XC[k]-.3,1.85,0],'<span class="k" style="color:'+CC[k]+'">'+c[0]+'</span>',{al:'l',cls:on?'':'ghost'});
  c[1].slice(0,3).forEach((d,i)=>{const p=[XC[k]-.05,Y[i],0],key='g'+k+i;
   if(k==0)B.g(key,chaosPts(2200+i,.25,520),{pos:p,col:C.pain,gain:on?1.1:.1,jit:.045,size:.024});else if(k==1)B.g(key,cubePts(2210+i,.2,520),{pos:p,col:C.sky,gain:on?1.15:.06,scale:on?1:.4,spin:[.2,.4,0]});
   else B.g(key,crystalPts(2220+i,.22,520),{pos:p,col:C.acc,gain:on?1.4:.06,scale:on?1:.3,spin:[0,.6,0]});
   B.lab('t'+k+i,[XC[k]+.35,Y[i],0],'<span class="t2">'+d[0]+'</span>'+(d[1]?'<div class="d">→ '+d[1]+'</div>':''),{al:'l',w:3.95,cls:on?'':'off'});
   if(k<2)B.path('f'+k+i,crv([[XC[k]+.25,Y[i]-.32,0],[(XC[k]+XC[k+1])/2,Y[i]-.62,-.8],[XC[k+1]-.3,Y[i]-.05,0]],10),k+1<tk?380:1,{col:CC[k+1],speed:.35,spread:.03,size:.02})})});
 const nx=()=>{st.take=tk>=3?1:tk+1;refresh()};B.act=[{t:tk>=3?'Zurücksetzen':'Nächste Ebene →',f:nx}];B.hot('all',[0,0,0],6,{click:nx});B.note=o.note||'';B.hint='Klicken: nächste Ebene'}});

/* Abschluss: Fragen-Kugeln + „Vielen Dank“ als Punktschrift. o:{fragen:[..3],dank:'VIELEN DANK',zeile:'…'} */
SZ.abschluss=o=>({lab:o.lab||'Abschluss',t:o.t,s:o.s,init:()=>({q:-1,end:false}),build(B,st){if(st.end){const D=o.dank||'VIELEN DANK',t=new PB(2300);t.text(D,0,0,1.25,16000,0,.06);B.g('vd',t,{pos:[0,.45,0],col:C.w,gain:.95,tw:.35});
  const h=new PB(2301);h.text(D,0,0,1.25,5000,-.3,.3);B.g('vh',h,{pos:[0,.45,0],col:C.acc,gain:.35,jit:.05,jf:.4,scale:1.02,size:.03});const r=new PB(2302);r.ring(0,0,0,6.2,2200,.08,'xz');B.g('vr',r,{pos:[0,-.9,-1],col:C.petrol,gain:.6,spin:[0,.05,0],rot:[.18,0,0]});
  B.lab('vs',[0,-.75,0],'<div class="k" style="letter-spacing:.4em">'+(o.zeile||'')+'</div>',{al:'c'});B.act=[{t:'← Zurück',f:()=>{st.end=false;refresh()}}];B.t='';B.s='';return}
 const F=o.fragen||[],X=F.map((_,k)=>-3.9+k*9.5/Math.max(1,F.length-1));
 F.forEach((q,k)=>{const f=st.q===k,ot=st.q>=0&&!f,p=[X[k],.55,f?.8:ot?-.8:0],b=new PB(2310+k);b.sphere(0,0,0,.95,1900);b.ring(0,0,0,1.25,500,.015,'xz');b.ring(0,0,0,1.42,300,.01,'xy');
  B.g('o'+k,b,{pos:p,col:f?C.acc:k==1?C.sky:C.petrol,gain:f?1.3:ot?.4:.85,scale:f?1.2:ot?.75:1,spin:[.1,.25+k*.05,0]});const t=new PB(2320+k);t.text(P2(k+1),0,0,.75,900,0,.04);B.g('n'+k,t,{pos:p,col:C.w,gain:ot?.4:1.1,scale:f?1.2:ot?.75:1});
  B.lab('q'+k,[X[k],-1.0,0],'<div class="q" style="text-align:center;font-weight:700">'+q+'</div>',{al:'b',w:3.6,cls:f?'sel':ot?'dim':'',click:()=>{st.q=f?-1:k;refresh()},hk:'h'+k});B.hot('h'+k,p,1.2,{grp:['o'+k],click:()=>{st.q=f?-1:k;refresh()}})});
 B.act=[{t:(o.dankBtn||'Vielen Dank')+' ✦',f:()=>{st.end=true;refresh()}}];B.hint=F.length?'Frage anklicken':''}});
