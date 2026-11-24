/* ---------- 19 · Referenz-Blueprint ---------- */
const BPC=[['Backendsysteme',[['SAP-Systeme','Moderne Datenexporte, z. B. CDS, Delta-Sharing, SLT'],['Event-Capture','Events per API-Call (Push) oder Change Data Capture'],['Legacy','Synchrone Abfrage oder Batch-Beladung als Alternative']]],
 ['Data Hub',[['Event Stream','Topics & Queues, Event Processor (z. B. Spark Streaming)'],['Azure API Management','und API Center'],['Cache','Schneller Zugriff für operative Abfragen']]],
 ['Datenplattform · Azure Databricks',[['Zentrale Rohdatenschicht','IT-managed'],['Consolidation & Storage','Data Lake · Data Warehouse · Operational Data Store (NoSQL)'],['Consumer Layer','nutzbar von allen'],['Unity Catalog','IT-managed, nutzbar von allen'],['Workspaces','IT & Fachbereiche: Datenprodukte im Katalog publizierbar']]],
 ['Nutzung',[['Zero-Copy-Zugriff','auf zentrale Datenprodukte via Unity Catalog'],['Data Sharing','Bereitstellung von Tabellen'],['API- und Direktzugriff','']]]];
SLIDES.push({lab:'Referenz-Blueprint',t:'Referenz: Erprobter <em>E2E-Datenarchitektur-Blueprint</em>',s:'Komplette Datenplattform-Implementierung für einen großen Handelskunden',cam:{yaw:-.22,pitch:.1},init:()=>({bp:0,run:false,last:0}),
 build(B,st){const X=[-5.35,-1.85,1.65,5.15],W=2.95,YT=1.4,YB=-1.95;
  BPC.forEach((c,k)=>{const on=st.bp===0||st.bp===k+1,tiles=c[1],n=tiles.length,gap=.14,h=(YT-YB-gap*(n-1))/n;
   B.lab('h'+k,[X[k]-W/2,YT+.42,0],'<span class="mid" style="color:#2FC7A5">'+(k+1)+'</span> <span class="t">'+c[0].replace(' · ','</span><br><span class="k" style="margin-left:2.2em">')+'</span>',{al:'l',cls:on?'':'dim',click:()=>{st.bp=st.bp===k+1?0:k+1;st.run=false;refresh()}});
   tiles.forEach((t,j)=>{const y=YT-j*(h+gap),key='t'+k+'_'+j,x0=X[k]-W/2,sb_=new PB(hsh(key));sb_.box(x0,y-h,-.22,x0+W,y,.0,Math.round(W*h*130));sb_.edges(x0,y-h,-.22,x0+W,y,.0,Math.round((W+h)*120));
    B.g(key,sb_,{col:k==2?C.acc:C.sky,gain:on?.7:.14,size:.02,tw:.3});
    B.path(key+'f',[[x0,y,.02],[x0+W,y,.02]],Math.round(W*18),{col:C.w,speed:.12+j*.02,spread:.01,size:.02,gain:on?.9:.1});
    B.lab(key+'l',[x0+.15,y-.14,0],'<span class="t2" style="font-size:max(10px,calc(var(--u)*.86))">'+t[0]+'</span>'+(t[1]?'<div class="d">'+t[1]+'</div>':''),{al:'lt',w:W-.3,cls:on?'':'ghost'})});
   B.hot('c'+k,[X[k],(YT+YB)/2,0],1.45,{click:()=>{st.bp=st.bp===k+1?0:k+1;st.run=false;refresh()}})});
  for(let k=0;k<3;k++)for(let l=0;l<3;l++){const y=.9-l*1.3;B.path('w'+k+l,[[X[k]+W/2-.1,y,.2],[X[k+1]-W/2+.1,y,.2]],120,{col:C.acc,speed:.5,spread:.03,size:.022,gain:(st.bp===0||st.bp===k+1||st.bp===k+2)?1.1:.2})}
  B.act=[{t:st.run?'Stopp':'Datenfluss abspielen ▸',on:st.run,f:()=>{if(st.run){st.run=false;st.bp=0}else{st.run=true;st.bp=1;st.last=T}refresh()}}];
  B.dyn=()=>{if(st.run&&T-st.last>1.9){st.last=T;if(st.bp>=4){st.run=false;st.bp=0}else st.bp++;refresh()}};
  B.cap={k:'Projektreferenz',t:'Blueprint aus einem umgesetzten Kundenprojekt',s:'Übertragbar auf SAP + Azure bei RWE'};B.hint='Spalte anklicken oder Datenfluss abspielen'}});

SLIDES.push(solutions('Lösungsansätze Impuls II','Daten-Pain-Points mit <em>Architekturkompetenz</em> lösen','Auf dem Weg zu einer einheitlichen, gesteuerten Zielarchitektur',M2,'Gibt es weitere relevante Pain Points in Ihrer Daten- und Reportinglandschaft?'));
SLIDES.push(chapter('III','04','<em>AI Readiness</em> Check','Welche Voraussetzungen braucht das Controlling, damit KI echten Steuerungsnutzen stiftet?',[0,3,6]));

/* ---------- 22 · AI Readiness ---------- */
SLIDES.push({lab:'AI Readiness',t:'AI Readiness beginnt bei den <em>Prozessen</em>, nicht bei der Technologie',s:'Digitale Reife Schritt für Schritt aufbauen: vom Fundament bis zur KI',cam:{x:.9,y:-.55,yaw:-.42,pitch:.22,d:1.05},init:()=>({ai:3}),
 build(B,st){const XC=[-1.9,.55,3.0,5.45],HH=[1.0,1.85,2.7,3.55],Y0=-2.3,CL=[C.blue,C.petrol,C.green,C.lg];
  AIS.forEach((a,k)=>{const s=k===st.ai,x=XC[k],h=HH[k],b=new PB(1600+k);b.box(x-1.05,Y0,-.85,x+1.05,Y0+h,.85,Math.round(1400+h*500));b.edges(x-1.05,Y0,-.85,x+1.05,Y0+h,.85,900);
   B.g('b'+k,b,{col:CL[k],gain:s?1.35:.62,lo:[0,s?.18:0,0],size:.024});
   B.lab('l'+k,[x,Y0+h+.35+(s?.18:0),.85],'<span class="k">Stufe '+P2(k+1)+'</span><div class="t2" style="font-size:max(13px,calc(var(--u)*1.3))">'+a.s+'</div>',{al:'a',cls:s?'sel c':'c',click:()=>{st.ai=k;refresh()},hk:'h'+k});
   B.hot('h'+k,[x,Y0+h/2,0],1.1,{grp:['b'+k],click:()=>{st.ai=k;refresh()}})});
  const ch=new PB(1610),cx=XC[3],cy=Y0+HH[3]+.42;ch.sphere(cx,cy,0,.3,700);ch.seg([cx,cy+.28,0],[cx+.18,cy+.68,0],50,.006);B.g('cherry',ch,{col:C.pain,gain:1.5,size:.026,lo:[0,st.ai===3?.18:0,0]});
  B.path('ar',[[XC[0]-1.3,Y0+.2,1.6],[XC[3]+1.4,Y0+HH[3]+.9,1.6]],900,{col:C.acc,speed:.08,spread:.04,size:.022,gain:.8});
  B.lab('arl',[XC[0]-.4,Y0+.75,1.6],'<span class="k" style="color:#2FC7A5">Digitalisierungs- & KI-Reifegrad ▸</span>',{al:'l'});
  const a=AIS[st.ai];B.cap={k:'Stufe '+(st.ai+1)+' · '+a.s,t:a.t,s:a.d};
  B.note='▸ Jede Stufe setzt die vorherige voraus. <b>KI entfaltet ihren Nutzen erst auf stabilen Prozessen, Daten und Analytics.</b>';B.hint='Stufe anklicken'}});

/* ---------- 23 · KI-Fundament ---------- */
SLIDES.push({lab:'KI-Fundament',t:'KI-Reife erfordert zuerst ein <em>starkes Datenfundament</em>',s:'Integration, Semantik, Datenprodukte und Governance als Voraussetzungen',cam:{x:.4,y:-.1,yaw:-.18,pitch:.12},init:()=>({f:[false,false,false,false],fr:0}),
 build(B,st){const XB=[-2.0,.1,2.2,4.3],YB=-1.45,DC=[1.15,-.85,0],R=2.75,fc=st.f.filter(Boolean).length;
  st.f.forEach((on,k)=>{const x=XB[k],b=new PB(1700+k);b.edges(x-.95,YB,-.8,x+.95,YB+.62,.8,700);b.box(x-.95,YB,-.8,x+.95,YB+.62,.8,on?900:250);
   B.g('fb'+k,b,{col:on?C.acc:C.dim,gain:on?1.2:.7,jit:on?0:.03,size:.024});
   B.lab('fl'+k,[x,YB-.2,.8],'<span class="n">'+P2(k+1)+'</span><span class="t2" style="font-size:max(10px,calc(var(--u)*.86))">'+FD[k]+'</span><div class="k" style="margin-top:.35em;color:'+(on?'#2FC7A5':'#9FB2C6')+'">'+(on?'vorhanden':'fehlt')+'</div>',{al:'b',w:2.0,cls:'c'+(on?' sel':''),click:()=>{st.f[k]=!on;refresh()},hk:'h'+k});
   B.hot('h'+k,[x,YB+.3,0],.9,{grp:['fb'+k],click:()=>{st.f[k]=!on;refresh()}})});
  B.lab('gf',[(XB[0]+XB[3])/2,YB-1.25,.8],'<span class="k" style="color:#2FC7A5">Governance als Fundament</span>',{al:'b'});
  const dm=new PB(1710);for(let i=0;i<5200;i++)dm.p(0,0,0);
  B.g('dome',dm,{pos:DC,col:C.acc,gain:1,size:.024,stiff:.045,pm:(l,V,t)=>{const fs=st.fr,u=rr(l,0);if(u<fs){const y=rr(l,1),q=Math.sqrt(1-y*y),a=l*2.39996;V[0]=Math.cos(a)*q*R;V[1]=y*R*.85;V[2]=Math.sin(a)*q*R*.55;return 1}
    V[0]=(rr(l,2)-.5)*7+Math.sin(t*.4+l)*.5;V[1]=.6+rr(l,3)*3+Math.sin(t*.3+l*.7)*.4;V[2]=(rr(l,4)-.5)*4;return .35}});
  const gg=new PB(1720);for(let i=0;i<1400;i++){const a=PI/2-(i+.5)/1400*TAU;gg.p(Math.cos(a)*.95+gg.gs()*.02,Math.sin(a)*.95+gg.gs()*.02,0)}
  B.g('gauge',gg,{pos:[6.3,.9,0],col:C.acc,gain:1.2,size:.026,pc:(l,t,g)=>l/g.n<st.fr?1:.08});
  const gb=new PB(1721);gb.ring(0,0,0,.95,600,.012);B.g('gaugeb',gb,{pos:[6.3,.9,0],col:C.dim,gain:.45,size:.02});
  B.lab('gp',[6.3,.9,0],()=>'<div class="mid">'+Math.round(st.fr*100)+' %</div>',{al:'c'});B.lab('gk',[6.3,-.25,0],'<span class="k">KI-Reife</span>',{al:'b'});
  B.lab('kl',ad(DC,[0,R*.85+.35,0]),'<span class="t" style="color:'+(fc==4?'#2FC7A5':'#9FB2C6')+'">KI-Reife</span>',{al:'a'});
  B.dyn=(t,dt)=>{st.fr+=(fc/4-st.fr)*Math.min(1,dt*1.6)};
  B.act=[{t:fc==4?'Zurücksetzen':'Alle aktivieren',on:fc==4,f:()=>{st.f=st.f.map(()=>fc!=4);refresh()}}];
  const dg=new PB(1711);for(let i=0;i<1400;i++){const y=fr(i*.618)*.98,q=Math.sqrt(1-y*y),a=i*2.39996;dg.p(Math.cos(a)*q*R,y*R*.85,Math.sin(a)*q*R*.55)}B.g('domeg',dg,{pos:DC,col:C.dim,gain:.32,size:.018});
  B.lab('fs',[-4.6,.9,0],'<span class="k">Status</span><div class="t2" style="margin-top:.4em">'+(fc===0?'Fragmentierte Daten-, Tool- & Konsumzonen':fc<4?'Fundament im Aufbau: '+fc+' von 4 Voraussetzungen erfüllt':'KI wird im Controlling skalierbar nutzbar')+'</div>',{al:'l',w:3.2,cls:fc==4?'sel':''});
  B.note='Damit KI nutzbar wird, müssen Daten <b>integriert, semantisch angereichert und auffindbar</b> sein. Governance bildet das Fundament, Technologie wird zum Game Changer.';B.hint='Fundament-Bausteine anklicken'}});

/* ---------- 24 · Vom Copilot zum Agenten ---------- */
let FIGP=null,AIP=null;
SLIDES.push({lab:'Vom Copilot zum Agenten',t:'KI verändert Arbeit von der <em>Ausführung zur Orchestrierung</em>',s:'Vom Copilot zu autonomen Agenten: die Zukunft der Wissensarbeit',init:()=>({a:0,hs:.9}),
 build(B,st){const FP=[-2.3,-1.45,0],AP=[3.3,.45,0];
  if(!FIGP){const b=new PB(1800);figure(b,0,0,0,1.0,3000);FIGP=b.f();const a=new PB(1801),V=[];for(let i=0;i<40;i++){const y=1-2*(i+.5)/40,q=Math.sqrt(1-y*y),t=i*2.39996;V.push([Math.cos(t)*q*1.55,y*1.55,Math.sin(t)*q*1.55])}
   for(let i=0;i<V.length;i++){a.ball(V[i][0],V[i][1],V[i][2],.06,22);for(let j=i+1;j<V.length;j++)if(ln3(sb(V[i],V[j]))<.75)a.seg(V[i],V[j],14)}AIP=a.f()}
  const nf=FIGP.length/3,na=AIP.length/3;
  B.g('figB',FIGP,{pos:FP,col:C.dim,gain:.35,size:.02});B.g('aiB',AIP,{pos:AP,col:C.dim,gain:.35,size:.02,spin:[0,.12,0]});
  const mx_=new PB(1802);for(let i=0;i<4200;i++)mx_.p(0,0,0);
  B.g('mx',mx_,{col:C.w,gain:1,size:.027,stiff:.04,pm:(l,V,t)=>{const h=st.hs;if(rr(l,0)<h){const k=(l%nf)*3;V[0]=FP[0]+FIGP[k];V[1]=FP[1]+FIGP[k+1];V[2]=FP[2]+FIGP[k+2];return .9}
    const k=(l%na)*3,a=t*.12,x=AIP[k],z=AIP[k+2];V[0]=AP[0]+x*Math.cos(a)+z*Math.sin(a);V[1]=AP[1]+AIP[k+1];V[2]=AP[2]-x*Math.sin(a)+z*Math.cos(a);return 1.15},
   pc:(l)=>1});
  const mx2=RG('mx');
  B.lab('hp',[FP[0],FP[1]+1.95,.4],()=>'<div class="big" style="text-align:center">'+Math.round(st.hs*100)+' %</div>',{al:'c'});B.lab('hk',[FP[0],FP[1]-.28,0],'<span class="k">Anteil Mensch: Ausführung</span>',{al:'b'});
  B.lab('ap',AP,()=>'<div class="big" style="text-align:center;color:#2FC7A5">'+(100-Math.round(st.hs*100))+' %</div>',{al:'c'});B.lab('ak',[AP[0],AP[1]-1.8,0],'<span class="k">Anteil KI: autonome Ausführung</span>',{al:'b'});
  const SX=i=>-.2+i*1.9,SY=-2.15;B.path('tl',[[SX(0)-.5,SY,0],[SX(3)+.5,SY,0]],700,{col:C.petrol,speed:.04,spread:.015,size:.02,gain:.6});
  AGT.forEach((g,i)=>{const on=i<=st.a,p=[SX(i),SY,0];node(B,'s'+i,p,.15,on?C.acc:C.dim,{n:240,g:{gain:on?1.3:.6}});
   B.lab('sl'+i,[SX(i),SY-.28,0],'<span class="k">'+P2(i+1)+'</span><div class="t2" style="font-size:max(10px,calc(var(--u)*.84))">'+g.t+'</div>',{al:'b',w:1.9,cls:'c'+(i===st.a?' sel':''),click:()=>{st.a=i;refresh()},hk:'h'+i});
   B.hot('h'+i,p,.35,{grp:['s'+i],click:()=>{st.a=i;refresh()}})});
  B.dyn=(t,dt)=>{st.hs+=(AGT[st.a].h/100-st.hs)*Math.min(1,dt*1.5);const g=RG('mx');if(g)g.c=hex(C.w)};
  B.act=[{t:'◀',f:()=>{st.a=Math.max(0,st.a-1);refresh()}},{t:'Nächste Stufe ▶',f:()=>{st.a=Math.min(3,st.a+1);refresh()}}];
  const g=AGT[st.a];B.cap={k:'Stufe '+(st.a+1)+' · Illustrative Verteilung',t:g.t,s:g.d};
  B.lab('f60',[-6.95,1.35,0],'<div class="big" style="color:#2FC7A5">60 %</div><div class="d" style="margin-top:.5em">Entwickler verbringen 60 % ihrer Zeit mit repetitiven Aufgaben. Agentic AI ermöglicht die autonome Ausführung dieser Tätigkeiten.</div>',{al:'lt',w:3.3});
  B.note='Mit der Entwicklung hin zu autonomen Agenten müssen Organisationen ihre Reife in <b>Daten, Governance und Operating Model</b> systematisch ausbauen.';
  B.hint='Stufe unten wählen'}});

SLIDES.push(solutions('Lösungsansätze Impuls III','KI-Pain-Points mit <em>Daten- und Governance-Fundament</em> lösen','Von fehlender AI Readiness zu einer strukturierten Enablement-Roadmap',M3,'Gibt es weitere relevante Pain Points auf dem Weg zur KI-Nutzung?'));

/* ---------- 26 · Kapitel Wrap-Up ---------- */
SLIDES.push({lab:'Wrap-Up',idx:'Kapitel 05 · Wrap-Up',t:'Zusammenfassung & <em>nächste Schritte</em>',s:'Vom fragmentierten Status quo (Level 1–2) zum integrierten, KI-fähigen Zielbild (Level 3–4)',cam:{x:1.0,y:-.3,yaw:-.38,pitch:.16,sway:.05},
 build(B,st){const X=[-.6,1.5,3.6,5.7],H=[.9,1.75,2.6,3.45],Y0=-2.2,CL=[C.red,C.yel,C.green,C.acc];
  for(let k=0;k<4;k++){const b=new PB(1900+k);b.box(X[k]-.75,Y0,-.75,X[k]+.75,Y0+H[k],.75,1300+k*450);b.edges(X[k]-.75,Y0,-.75,X[k]+.75,Y0+H[k],.75,700);
   B.g('l'+k,b,{col:CL[k],gain:k<2?.55:1.05,size:.024,jit:k<2?.025:0});
   B.lab('ll'+k,[X[k],Y0-.2,.75],'<span class="mid">L'+(k+1)+'</span><div class="k" style="margin-top:.3em">'+LVL[k]+'</div>',{al:'b'})}
  const top=X.map((x,k)=>[x,Y0+H[k]+.45,0]);B.path('up',crv([[X[0]-1.2,Y0+.3,0],...top,[X[3]+.9,Y0+H[3]+.9,0]],14),1500,{col:C.w,speed:.07,spread:.05,size:.022,gain:.8});
  B.lab('sq',[(X[0]+X[1])/2,Y0+H[1]+1.0,0],'<span class="t" style="color:#E8609F">Status quo</span><div class="d" style="text-align:center">Level 1–2</div>',{al:'a'});
  B.lab('zb',[(X[2]+X[3])/2+.6,Y0+H[3]+.75,0],'<span class="t" style="color:#2FC7A5">Zielbild</span><div class="d" style="text-align:center">Level 3–4</div>',{al:'a'});
  B.note='Reifegrad-Simulator · Roadmap · Key Takeaways · Ziele & Diskussion'}});

/* ---------- 27 · Reifegrad-Simulator ---------- */
SLIDES.push({lab:'Reifegrad-Simulator',t:'Reifegrad im Controlling über <em>sieben Dimensionen</em>',s:'Gemeinsame Einschätzung des Ist-Stands gegenüber dem Zielkorridor Level 3–4',init:()=>({mat:[2,2,1,1,2,1,1],ms:[2,2,1,1,2,1,1]}),
 build(B,st){const C0=[2.3,-.45,0],R=2.15,ang=i=>PI/2-i*TAU/7,ax=(i,v)=>ad(C0,[Math.cos(ang(i))*R*v/4,Math.sin(ang(i))*R*v/4,0]);
  const rg=new PB(2000);for(let l=1;l<=4;l++){for(let i=0;i<7;i++){const a=ax(i,l),b=ax((i+1)%7,l);rg.seg(sb(a,C0),sb(b,C0),40+l*12)}}B.g('rings',rg,{pos:C0,col:C.petrol,gain:.6,size:.02});
  const axb=new PB(2001);for(let i=0;i<7;i++)axb.seg([0,0,0],sb(ax(i,4.25),C0),110);B.g('axes',axb,{pos:C0,col:C.dim,gain:.7,size:.02});
  const band=new PB(2002);for(let n=0;n<3600;n++){const i=n%7,u=band.r(),v=3+band.r(),a=ax(i,v),b=ax((i+1)%7,v);const q=lp(a,b,u);band.p(q[0]-C0[0],q[1]-C0[1],(band.r()-.5)*.1)}B.g('band',band,{pos:C0,col:C.green,gain:.7,size:.022});
  const fl=new PB(2003);for(let n=0;n<3200;n++)fl.p(0,0,0);
  B.g('fill',fl,{col:C.sky,gain:.8,size:.024,stiff:.06,pm:(l,V)=>{const i=l%7,j=(i+1)%7,u=rr(l,0),v=rr(l,1),s=Math.sqrt(u),A=ax(i,st.ms[i]),Bp=ax(j,st.ms[j]);
    V[0]=C0[0]*(1-s)+s*((1-v)*A[0]+v*Bp[0]);V[1]=C0[1]*(1-s)+s*((1-v)*A[1]+v*Bp[1]);V[2]=(rr(l,2)-.5)*.12;return .55+.5*s}});
  const ed=new PB(2004);for(let n=0;n<1400;n++)ed.p(0,0,0);
  B.g('edge',ed,{col:C.w,gain:1.1,size:.024,pm:(l,V,t,g)=>{let u=fr(l/g.n+t*.02)*7;const i=Math.floor(u)%7,s=u-Math.floor(u),A=ax(i,st.ms[i]),Bp=ax((i+1)%7,st.ms[(i+1)%7]);V[0]=mix(A[0],Bp[0],s);V[1]=mix(A[1],Bp[1],s);V[2]=0}});
  DIMS.forEach((d,i)=>{const b=new PB(2010+i);b.sphere(0,0,0,.13,220);B.g('v'+i,b,{col:AMPC[st.mat[i]],gain:1.5,size:.026});
   const a=ang(i),cx=Math.cos(a),al=cx>.3?'l':cx<-.3?'r':(Math.sin(a)>0?'a':'b');
   B.lab('dl'+i,ad(ax(i,4.55),[0,0,0]),'<span class="t">'+d.t+'</span><div class="d" style="'+(al=='r'?'text-align:right':al=='l'?'':'text-align:center')+'">Ist: L'+st.mat[i]+' · '+LVL[st.mat[i]-1]+'</div>',{al});
   for(let l=1;l<=4;l++)B.hot('h'+i+l,ax(i,l),.2,{min:13,click:()=>{st.mat[i]=l;refresh()}})});
  const lvd=new PB(2020);for(let i=0;i<7;i++)for(let l=1;l<=4;l++){const p=sb(ax(i,l),C0);lvd.ball(p[0],p[1],0,.045,26)}B.g('lvd',lvd,{pos:C0,col:C.bg,gain:.8,size:.02});
  B.dyn=(t,dt)=>{for(let i=0;i<7;i++){st.ms[i]+=(st.mat[i]-st.ms[i])*Math.min(1,dt*4);const g=RG('v'+i);if(g){const p=ax(i,st.ms[i]);g.pos=p;g.posC=lp(g.posC,p,.3)}}};
  const avg=st.mat.reduce((a,b)=>a+b,0)/7;
  B.lab('avg',[-5.2,1.2,0],'<span class="k">Ø Reifegrad</span><div class="big" style="margin-top:.2em">'+avg.toFixed(1).replace('.',',')+'</div><div class="t" style="margin-top:.4em;color:'+(avg>=3?'#2FC7A5':avg>=2?'#FFC83D':'#FF4060')+'">'+LVL[Math.min(3,Math.max(0,Math.round(avg)-1))]+'</div>',{al:'lt'});
  B.lab('lg',[-5.2,-.35,0],'<span class="k" style="color:#1DB48E">▬ Zielkorridor L3–L4</span><br><span class="k" style="color:#fff">▬ Ist-Stand</span>',{al:'lt'});
  B.act=[{t:'Ist-Stand (Beispiel)',f:()=>{st.mat=[2,2,1,1,2,1,1];refresh()}},{t:'Zielbild simulieren',f:()=>{st.mat=[4,3,4,3,3,3,4];refresh()}}];
  B.cap={k:'Reifestufen',list:LVL.map((l,i)=>'<b>L'+(i+1)+' '+l+'</b> <span>· '+LVLD[i]+'</span>')};B.hint='Punkte auf den Achsen anklicken: Level setzen'}});

/* ---------- 28 · Roadmap ---------- */
SLIDES.push({lab:'Roadmap',t:'Eine Phasen-Roadmap führt durch die <em>Transformation</em>',s:'Von der Prozessanalyse über das Target Operating Model bis zur Umsetzung',cam:{yaw:-.1,pitch:.05},init:()=>({ph:3,front:3}),
 build(B,st){const X0=-3.4,WX=10.2,Y=i=>1.3-i*.9,ph=st.ph,PH=['Phase 1 · Analyse','Phase 2 · Zielbild','Phase 3 · Detailkonzept'];
  PH.forEach((p,k)=>{const x=X0+(k+.5)*WX/3;B.lab('ph'+k,[x,2.05,0],'<span class="t">'+p+'</span>',{al:'a',cls:k<ph?'sel':'dim',click:()=>{st.ph=k+1;refresh()}});
   if(k)B.ln([X0+k*WX/3,1.85,-.3],[X0+k*WX/3,-2.6,-.3],C.dim,.35)});
  RMW.forEach((w,i)=>{const y=Y(i);B.lab('w'+i,[X0-.35,y,0],'<span class="t2" style="font-size:max(10px,calc(var(--u)*.86))">'+w.w+'</span>',{al:'r',w:3.2});
   B.path('lane'+i,[[X0-.1,y,-.2],[X0+WX+.2,y,-.2]],380,{col:C.dim,speed:.03,spread:.02,size:.018,gain:.55});
   w.it.forEach((it,j)=>{const x0=X0+it[0]/100*WX+.06,wx=it[1]/100*WX-.12,on=it[2]<=ph,h=i==4&&j==1?.26:.5,yy=i==4&&j==1?y-.12:y,key='b'+i+'_'+j;
    B.path(key,[[x0,yy,0],[x0+wx,yy,0]],Math.round(wx*150*h),{col:w.c,speed:.06,spread:h*.62,size:.022,gain:on?.85:.05,fade:false,pm:(l,V)=>{V[2]*=.35;V[1]=yy+(V[1]-yy)*.55}});
    const cp=new PB(hsh(key));cp.ball(x0,yy,0,h*.3,90);cp.ball(x0+wx,yy,0,h*.3,90);cp.seg([x0,yy+h*.42,0],[x0+wx,yy+h*.42,0],Math.round(wx*40));cp.seg([x0,yy-h*.42,0],[x0+wx,yy-h*.42,0],Math.round(wx*40));B.g(key+'f',cp,{col:w.c,gain:on?.9:.04,size:.02});
    B.lab(key+'l',[x0+.14,yy,0],'<span class="d" style="color:#fff">'+it[3]+'</span>',{al:'l',w:wx-.25,cls:on?'':'off'})})});
  const sw=new PB(2100);sw.seg([0,1.8,0],[0,-2.55,0],600,.03);B.g('front',sw,{pos:[X0+st.front/3*WX,0,.1],col:C.acc,gain:1.1,size:.024});
  B.dyn=(t,dt)=>{st.front+=(ph-st.front)*Math.min(1,dt*2.2);const g=RG('front');if(g){g.pos=[X0+st.front/3*WX,0,.1];g.posC=g.pos.slice()}};
  B.lab('bs',[X0+WX,2.5,0],'<span class="tag">Beispiel</span>',{al:'r'});
  B.act=[{t:'Abspielen ▸',f:()=>{st.ph=1;st.front=0;refresh();setTimeout(()=>{if(SID===27){st.ph=2;refresh()}},1300);setTimeout(()=>{if(SID===27){st.ph=3;refresh()}},2600)}},...PH.map((p,k)=>({t:'Phase '+(k+1),on:ph===k+1,f:()=>{st.ph=k+1;refresh()}}))];
  B.hint='Phase wählen oder abspielen'}});

/* ---------- 29 · Key Takeaways ---------- */
SLIDES.push({lab:'Key Takeaways',t:'Von zentralen Erkenntnissen zu <em>konkreten Maßnahmen</em>',s:'Klare Prioritäten für Controlling, Datenarchitektur und KI-Fähigkeiten',init:()=>({take:1}),
 build(B,st){const XC=[-6.55,-1.6,3.35],Y=[1.05,-.35,-1.75],tk=st.take,COL=[[C.pain,'Key Takeaways'],[C.sky,'Key Action Areas'],[C.acc,'Potenzielle Quick Wins']],DATA=[KT,KA,QW];
  COL.forEach((c,k)=>{const on=k<tk;B.lab('hd'+k,[XC[k]-.3,1.85,0],'<span class="k" style="color:'+c[0]+'">'+c[1]+'</span>',{al:'l',cls:on?'':'ghost'});
   DATA[k].forEach((d,i)=>{const p=[XC[k]-.05,Y[i],0],key='g'+k+i;
    if(k==0)B.g(key,chaosPts(2200+i,.25,520),{pos:p,col:C.pain,gain:on?1.1:.1,jit:.045,size:.024});
    else if(k==1)B.g(key,cubePts(2210+i,.2,520),{pos:p,col:C.sky,gain:on?1.15:.06,scale:on?1:.4,size:.024,spin:[.2,.4,0]});
    else{const b=new PB(2220+i);for(let j=0;j<520;j++){const a=b.r()*TAU,e=b.r()*2-1,q=Math.sqrt(1-e*e),r=j%3?Math.pow(b.r(),3)*.42:.08;b.p(Math.cos(a)*q*r,e*r,Math.sin(a)*q*r)}B.g(key,b,{pos:p,col:C.acc,gain:on?1.4:.06,scale:on?1:.3,size:.026,spin:[0,.6,0]})}
    B.lab('t'+k+i,[XC[k]+.35,Y[i],0],'<span class="t2">'+d[0]+'</span><div class="d">→ '+d[1]+'</div>',{al:'l',w:3.95,cls:on?'':'off'});
    if(k<2)B.path('f'+k+i,crv([[XC[k]+.25,Y[i]-.32,0],[(XC[k]+XC[k+1])/2,Y[i]-.62,-.8],[XC[k+1]-.3,Y[i]-.05,0]],10),k+1<tk?380:1,{col:COL[k+1][0],speed:.35,spread:.03,size:.02,gain:.9})})});
  B.act=[{t:tk>=3?'Zurücksetzen':tk==1?'Handlungsfelder zeigen →':'Quick Wins zeigen →',f:()=>{st.take=tk>=3?1:tk+1;refresh()}}];
  B.hot('all',[0,0,0],6,{click:()=>{st.take=tk>=3?1:tk+1;refresh()}});B.hint='Klicken: nächste Ebene'}});

/* ---------- 30 · Ziele & Diskussion ---------- */
SLIDES.push({lab:'Ziele & Diskussion',t:'Ziele, Herausforderungen und Rollen',s:'Abschließende Diskussion für die nächsten Schritte',init:()=>({q:-1,end:false}),
 build(B,st){if(st.end){const t=new PB(2300);t.text('VIELEN DANK',0,0,1.25,16000,0,.06);B.g('vd',t,{pos:[0,.45,0],col:C.w,gain:.95,size:.026,tw:.35});
   const h=new PB(2301);h.text('VIELEN DANK',0,0,1.25,5000,-.3,.3);B.g('vh',h,{pos:[0,.45,0],col:C.acc,gain:.35,jit:.05,jf:.4,scale:1.02,size:.03});
   const r=new PB(2302);r.ring(0,0,0,6.2,2200,.08,'xz');B.g('vr',r,{pos:[0,-.9,-1],col:C.petrol,gain:.6,spin:[0,.05,0],rot:[.18,0,0],size:.022});
   B.lab('vs',[0,-.75,0],'<div class="k" style="letter-spacing:.4em">Zukunftsbild Controlling · RWE · Interaktiv · 05.11.2026</div>',{al:'c'});
   B.act=[{t:'← Zurück zur Diskussion',f:()=>{st.end=false;refresh()}}];B.t='';B.s='';return}
  const X=[-3.9,.85,5.6];
  FINQ.forEach((q,k)=>{const f=st.q===k,o=st.q>=0&&!f,p=[X[k],.55,f?.8:o?-.8:0],b=new PB(2310+k);b.sphere(0,0,0,.95,1900);b.ring(0,0,0,1.25,500,.015,'xz');b.ring(0,0,0,1.42,300,.01,'xy');
   B.g('o'+k,b,{pos:p,col:f?C.acc:k==1?C.sky:C.petrol,gain:f?1.3:o?.4:.85,scale:f?1.2:o?.75:1,size:.026,spin:[.1,.25+k*.05,0]});
   const t=new PB(2320+k);t.text(P2(k+1),0,0,.75,900,0,.04);B.g('n'+k,t,{pos:p,col:C.w,gain:o?.4:1.1,scale:f?1.2:o?.75:1,size:.026});
   B.lab('q'+k,[X[k],-1.0,0],'<div class="q" style="text-align:center;font-weight:700">'+q+'</div>',{al:'b',w:3.6,cls:(f?'sel':o?'dim':''),click:()=>{st.q=f?-1:k;refresh()},hk:'h'+k});
   B.hot('h'+k,p,1.2,{grp:['o'+k],click:()=>{st.q=f?-1:k;refresh()}})});
  B.act=[{t:'Vielen Dank ✦',f:()=>{st.end=true;refresh()}}];B.hint='Frage anklicken';B.cap=st.q>=0?{k:'Frage '+P2(st.q+1),t:FINQ[st.q]}:null}});
