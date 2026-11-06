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

/* ---------- 01 · Titel ---------- */
SLIDES.push({lab:'Titel',t:'',s:'',cam:{d:1,sway:.05},
 build(B,st){const C0=[3.7,.25,-1.4],R0=[1.05,0,-.32];
  const b1=new PB(11),b2=new PB(12),b3=new PB(13),rn=rng(5);
  for(let i=0;i<16000;i++){const rad=.28+Math.pow(rn(),.85)*3.7,arm=i%3,g=b1.gs(),th=arm*TAU/3+rad*1.18+g*.34/(.45+rad*.3),y=b1.gs()*.09*(1.3-rad/4);(rad<1.15?b1:rad<2.5?b2:b3).p(Math.cos(th)*rad,y,Math.sin(th)*rad)}
  b1.ball(0,0,0,.42,1800);
  const o={pos:C0,rot:R0,spin:[0,.045,0],stiff:.028};
  B.g('gx1',b1,Object.assign({col:C.w,gain:.62,size:.026},o));B.g('gx2',b2,Object.assign({col:C.acc,gain:.7,size:.026},o));B.g('gx3',b3,Object.assign({col:C.petrol,gain:.95,size:.026},o));
  const hb=new PB(17);hb.ring(0,0,0,4.6,1400,.06,'xz');B.g('halo',hb,{pos:C0,rot:R0,spin:[0,-.02,0],col:C.dim,gain:.6,size:.022});
  const NM=['Impuls I','Impuls II','Impuls III'],SUB=['Prozesse & TOM','Daten & Reporting','AI Readiness'];
  const orb=k=>{const a=T*.07+k*TAU/3,p=rotP([Math.cos(a)*4.3,0,Math.sin(a)*4.3],R0[0],0,R0[2]);return ad(C0,p)};
  for(let k=0;k<3;k++){node(B,'imp'+k,orb(k),.2,k==0?C.sky:k==1?C.acc:C.mint,{n:520,g:{gain:1.15}});
   B.lab('il'+k,()=>ad(orb(k),[0,.42,0]),'<span class="k">'+NM[k]+'</span><div class="t2" style="margin-top:.2em">'+SUB[k]+'</div>',{al:'a',click:()=>goTo(CHS[k+1]),hk:'h'+k});
   B.hot('h'+k,()=>orb(k),.35,{grp:['imp'+k,'imp'+k+'_r'],click:()=>goTo(CHS[k+1])})}
  B.dyn=()=>{for(let k=0;k<3;k++){const p=orb(k);for(const s of['imp'+k,'imp'+k+'_r']){const g=RG(s);if(g){g.pos=p;g.posC=p.slice()}}L(C0,p,C.acc,.12*LFADE)}};
  B.hero='<div class="k">Workshop · RWE</div><h1>Zukunftsbild<br><em>Controlling</em></h1><p>Daten und Reporting im SAP-Kontext bei RWE</p><div class="d">Essen · 05.11.2026</div><div class="row"><button class="btn pri" data-go="1">Workshop starten →</button><button class="btn" data-go="ov">Übersicht</button></div>';
  B.hint='Impulse anklicken · Szene ziehen'}});

/* ---------- 02 · Agenda ---------- */
SLIDES.push({lab:'Agenda',t:'Agenda',s:'Fünf Kapitel vom Kontext über drei Impulse bis zu den nächsten Schritten',cam:{yaw:-.08,pitch:.04},init:()=>({sel:0}),
 build(B,st){const P=[[-5.4,-.95,.6],[-2.65,.6,.1],[.1,-.7,-.3],[2.85,.8,-.7],[5.6,-.3,-1.1]];
  const path=crv([[-9,-2,1.4],...P,[9.5,.4,-2]],22);
  B.path('fl',path,2400,{col:C.acc,speed:.02,spread:.07,size:.025,gain:.7});B.path('fl2',path,800,{col:C.w,speed:.04,spread:.012,size:.02,gain:.55});
  AGD.forEach((a,k)=>{const p=P[k],sel=st.sel===k;
   const b=new PB(100+k);b.sphere(0,0,0,.34,760);b.ball(0,0,0,.16,200);B.g('c'+k,b,{pos:p,col:sel?C.acc:C.sky,gain:sel?1.3:.75,size:.03,scale:sel?1.18:1});
   const r=new PB(110+k);r.ring(0,0,0,.68,560,.012);B.g('r'+k,r,{pos:p,col:sel?C.acc:C.petrol,gain:sel?1:.8,spin:[0,0,.2*(k%2?1:-1)]});
   const s=new PB(120+k);for(let j=0;j<a[5];j++){const an=j/a[5]*TAU;s.ball(Math.cos(an)*1.0,Math.sin(an)*1.0,0,.07,50)}B.g('s'+k,s,{pos:p,rot:[.9,0,0],col:C.w,gain:sel?1.1:.6,size:.024,spin:[0,.35,0]});
   const up=k%2==0;
   B.lab('l'+k,ad(p,[0,up?1.12:-1.12,0]),'<div class="k">Kapitel '+a[0]+'</div><div class="t2" style="font-size:max(14px,calc(var(--u)*1.35));margin-top:.15em">'+a[1]+'</div><div class="d">'+a[2]+'</div>',{al:up?'a':'b',w:2.6,cls:sel?'sel c':'c',click:()=>pick(k),hk:'h'+k});
   B.hot('h'+k,p,.8,{grp:['c'+k,'r'+k,'s'+k],click:()=>pick(k)})});
  function pick(k){if(st.sel===k)goTo(AGD[k][4]);else{st.sel=k;refresh()}}
  const a=AGD[st.sel];B.cap={k:'Kapitel '+a[0]+' · '+a[5]+' Folien',t:a[1],s:a[2],list:a[3]};
  B.act=[{t:'Kapitel öffnen →',f:()=>goTo(a[4])}];B.hint='Kapitel anklicken · zweiter Klick öffnet'}});

/* ---------- 03 · Vorstellungsrunde ---------- */
SLIDES.push({lab:'Vorstellungsrunde',t:'Rollen, Kontext und Erwartungen abstimmen',s:'Interaktiver Einstieg für eine produktive Zusammenarbeit',init:()=>({left:60,run:false,p:1}),
 leave(st){st.run=false},
 build(B,st){const C2=[3.0,-.35,0],R=2.05;
  const toggle=()=>{if(st.left<=0)st.left=60;st.run=!st.run;refresh()};
  const rb=new PB(31);rb.ring(0,0,0,R,1500,.02);B.g('rb',rb,{pos:C2,col:C.petrol,gain:.35,size:.022});
  const rl=new PB(32);for(let i=0;i<2800;i++){const a=PI/2-(i+.5)/2800*TAU,r=R+rl.gs()*.035;rl.p(Math.cos(a)*r,Math.sin(a)*r,rl.gs()*.03)}
  B.g('rl',rl,{pos:C2,col:st.left<10?C.pain:C.acc,gain:1.15,size:.03,tw:.1,pc:(l,t,g)=>(l/g.n)<st.left/60?1:.05});
  const tk=new PB(33);for(let k=0;k<60;k++){const a=PI/2-k/60*TAU,r0=R+.2,r1=R+(k%5?.3:.45);tk.seg([Math.cos(a)*r0,Math.sin(a)*r0,0],[Math.cos(a)*r1,Math.sin(a)*r1,0],k%5?6:12)}B.g('tk',tk,{pos:C2,col:C.bg,gain:.55,size:.02});
  const ir=new PB(34);ir.ring(0,0,0,1.55,700,.015);ir.ring(0,0,0,1.38,300,.01);B.g('ir',ir,{pos:C2,col:C.dim,gain:.7,spin:[0,0,-.1]});
  const sp=new PB(35);sp.cloud(0,0,0,.09,.09,.09,320);B.g('sp',sp,{pos:C2,col:C.w,gain:.5,size:.026,jit:.05,jf:2.5});
  const act=()=>st.run?Math.min(2,Math.floor((60-st.left)/20)):-1;
  QST.forEach((q,k)=>{const p=[-5.9,1.05-k*1.3,0];node(B,'q'+k,p,.2,C.sky,{n:420});
   B.lab('ql'+k,ad(p,[.6,0,0]),H2(q[0],q[1],P2(k+1)),{al:'l',w:3.6,cls:()=>act()===k?'sel':''})});
  B.lab('tm',C2,()=>{const s=Math.ceil(st.left);return'<div class="big" style="font-size:max(36px,calc(var(--u)*5.2))">'+Math.floor(s/60)+':'+P2(s%60)+'</div><div class="k" style="margin-top:.8em">Redezeit · Teilnehmer/in '+st.p+'</div>'},{al:'c'});
  B.hot('ring',C2,2.3,{grp:['rl','sp'],click:toggle});
  B.dyn=(t,dt)=>{if(st.run){st.left=Math.max(0,st.left-dt);if(st.left<=0){st.run=false;refresh()}}
   const g=RG('rl');if(g)g.c=hex(st.left<10?C.pain:C.acc);
   const a=PI/2-(st.left/60)*TAU,hp=ad(C2,[Math.cos(a)*R,Math.sin(a)*R,0]),s=RG('sp');if(s){s.pos=hp;s.gain=st.run?1.6:.55}
   for(let k=0;k<3;k++){const q=RG('q'+k);if(q){q.gain=act()===k?1.5:.75;q.c=hex(act()===k?C.acc:C.sky)}}};
  B.act=[{t:st.run?'Pause':'Start ▸',on:st.run,f:toggle},{t:'Zurücksetzen',f:()=>{st.run=false;st.left=60;refresh()}},{t:'Nächste Person →',f:()=>{st.run=false;st.left=60;st.p++;refresh()}}];
  B.hint='Ring anklicken: Timer starten / pausieren'}});

/* ---------- 04 · Über UNITY ---------- */
let GLOBE=null;
function inPoly(x,y,P){let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const xi=P[i][0],yi=P[i][1],xj=P[j][0],yj=P[j][1];if(((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c}return c}
function ll(lon,lat,r){const a=lon*PI/180,b=lat*PI/180;return[Math.cos(b)*Math.sin(a)*r,Math.sin(b)*r,Math.cos(b)*Math.cos(a)*r]}
function globePts(R){if(GLOBE&&GLOBE.R===R)return GLOBE;const land=new PB(41),sea=new PB(42),M=26000;
 for(let i=0;i<M;i++){const y=1-2*(i+.5)/M,q=Math.sqrt(1-y*y),t=i*2.39996323,x=Math.cos(t)*q,z=Math.sin(t)*q,lat=Math.asin(y)*180/PI,lon=Math.atan2(x,z)*180/PI;
  if(LAND.some(P=>inPoly(lon,lat,P)))land.p(x*R,y*R,z*R);else if(i%7==0)sea.p(x*R*.995,y*R*.995,z*R*.995)}
 const gr=new PB(43);for(let la=-60;la<=60;la+=30)for(let k=0;k<160;k++){const p=ll(k/160*360,la,R*1.002);gr.p(p[0],p[1],p[2])}
 for(let lo=0;lo<360;lo+=30)for(let k=0;k<90;k++){const p=ll(lo,-90+k/89*180,R*1.002);gr.p(p[0],p[1],p[2])}
 return GLOBE={R,land:land.f(),sea:sea.f(),grat:gr.f()}}
const UTAB=[['Überblick','UNITY: Managementberatung trifft tiefe Technologiekompetenz','Innovation, Integration, Transformation und Umsetzung · weltweit'],['Service-Domänen','KI als Wachstumstreiber: Wertschöpfung neu denken','Sieben Service-Domänen für die End-to-End-Transformation'],['Wertbeitrag','Wertbeitrag von UNITY über alle Service-Domänen','Herausforderungen, Angebote und Wertschöpfung je Domäne']];
SLIDES.push({lab:'Über UNITY',t:UTAB[0][1],s:UTAB[0][2],init:()=>({tab:0,dom:0}),
 build(B,st){const tab=st.tab;B.t=UTAB[tab][1];B.s=UTAB[tab][2];
  B.act=UTAB.map((u,i)=>({t:u[0],on:i==tab,f:()=>{st.tab=i;refresh()}}));
  if(tab==0){const G0=[3.15,-.2,0],R=2.35,G=globePts(R),rot=[.42,0,0];
   const o=k=>Object.assign({pos:G0,rot,stiff:.05},k);
   B.g('land',G.land,o({col:C.sky,gain:.9,size:.027}));B.g('sea',G.sea,o({col:C.dim,gain:.5,size:.02}));B.g('grat',G.grat,o({col:C.petrol,gain:.32,size:.017}));
   const at=new PB(44);at.ring(0,0,0,R*1.06,1100,.035);B.g('atm',at,{pos:G0,col:C.acc,gain:.28,size:.022});
   const cb=new PB(45),hq=CITY[0];CITY.forEach(c=>{if(c[3]===1)return;const p=ll(c[1],c[2],R*1.01);cb.ball(p[0],p[1],p[2],c[3]?.045:.028,c[3]?60:26)});B.g('cty',cb,o({col:C.w,gain:1.2,size:.024}));
   const hb=new PB(46),hp=ll(hq[1],hq[2],R*1.01);hb.ball(hp[0],hp[1],hp[2],.06,140);B.g('hq',hb,o({col:C.acc,gain:1.6,size:.03,pc:(l,t)=>.8+.5*Math.sin(t*3)}));
   const A=nm(ll(hq[1],hq[2],1));CITY.slice(1).forEach((c,i)=>{const Bv=nm(ll(c[1],c[2],1)),ang=Math.acos(cl(dt(A,Bv),-1,1)),pts=[];
    for(let k=0;k<=40;k++){const u=k/40,s=Math.sin(ang)||1e-6,w1=Math.sin((1-u)*ang)/s,w2=Math.sin(u*ang)/s,q=nm(ad(ml(A,w1),ml(Bv,w2))),h=1+(.04+.22*ang/PI)*Math.sin(PI*u);pts.push(ml(q,R*h))}
    B.path('a'+i,pts,Math.round(40+260*ang/PI),o({col:c[3]?C.acc:C.mint,speed:.22,spread:.006,size:.02,gain:1.1}))});
   const fr_=()=>{const g=RG('land');return g?g:null};
   const vis=(t,w)=>w[2]-G0[2]>R*.18;
   const cl_=(nmx,lon,lat,al,txt,dy)=>B.lab('c_'+nmx,{g:'land',p:ll(lon,lat,R*1.02)},txt,{al,vis,dx:al=='l'?.6:al=='r'?-.6:0,dy:dy||0});
   cl_('pb',8.75,51.72,'r','<span class="t" style="color:#2FC7A5">Paderborn</span><div class="d">Hauptsitz</div>',-1.4);
   cl_('dach',11,49,'l','<span class="t">DACH</span><div class="d">10 Standorte</div>',1.0);
   cl_('kai',31.24,30.04,'l','<span class="t">Kairo</span>');cl_('pek',116.4,39.9,'l','<span class="t">Peking</span>');cl_('sha',121.47,31.23,'l','<span class="t">Shanghai</span>');cl_('syd',151.2,-33.87,'l','<span class="t">Sydney</span>');
   const KP=[['380+','Mitarbeitende bei UNITY · 800+ in der UNITY Innovation Alliance'],['59 Mio. €','Umsatz 2025'],['27 + 16','DAX-40- und EURO-STOXX-50-Unternehmen vertrauen auf unsere Expertise'],['Weltweit','Erfolgreiche Projekte auf allen Kontinenten']];
   KP.forEach((k,i)=>B.lab('kp'+i,[-6.95,1.45-i*1.08,0],'<div class="big">'+k[0]+'</div><div class="d" style="margin-top:.5em">'+k[1]+'</div>',{al:'l',w:3.7}));
   B.dyn=()=>{const ry=-.17-1.0*Math.sin(T*.085);for(const k of['land','sea','grat','cty','hq',...CITY.slice(1).map((c,i)=>'a'+i)]){const g=RG(k);if(g){g.rot[1]=ry;g.rotC[1]=ry}}};
   B.hint='Globus ziehen · Standorte & Projekte weltweit'}
  else if(tab==1){const D0=[2.5,-.55,-.4],R=3.0,RX=.5,phi=k=>k*TAU/7,cur=(RG('orb')||{rotC:[0,0,0]}).rotC[1],tg=-phi(st.dom)+TAU*Math.round((cur+phi(st.dom))/TAU);
   const o=k=>Object.assign({pos:D0,rot:[RX,tg,0]},k);
   B.path('orb',(()=>{const a=[];for(let k=0;k<64;k++)a.push([Math.sin(k/64*TAU)*R,0,Math.cos(k/64*TAU)*R]);return a})(),1400,o({closed:true,col:C.petrol,speed:.015,spread:.03,size:.022,gain:.7}));
   DOM.forEach((d,k)=>{const lp=[Math.sin(phi(k))*R,0,Math.cos(phi(k))*R],sel=k===st.dom,b=new PB(400+k);b.sphere(lp[0],lp[1],lp[2],.3,620);b.ring(lp[0],lp[1],lp[2],.5,260,.01,'xz');
    B.g('d'+k,b,o({col:sel?C.acc:C.sky,gain:sel?1.45:.75,size:.03}));
    B.lab('dl'+k,{g:'d'+k,p:ad(lp,[0,.55,0])},'<span class="t">'+d.t+'</span><div class="d" style="text-align:center">'+d.r+'</div>',{al:'a',cls:t=>(sel?'sel':'')+(toW(SID+':d'+k,lp)[2]<D0[2]-1.2?' ghost':toW(SID+':d'+k,lp)[2]<D0[2]+.5?' dim':''),click:()=>{st.dom=k;refresh()},hk:'h'+k});
    B.hot('h'+k,{g:'d'+k,p:lp},.5,{grp:['d'+k],click:()=>{st.dom=k;refresh()}})});
   const cs=new PB(48);cs.sphere(0,0,0,.95,2200);B.g('core',cs,{pos:D0,col:C.acc,gain:.55,size:.024,spin:[0,.15,0]});
   const ct=new PB(49);ct.text('KI',0,0,.95,1600,0,.06);B.g('ki',ct,{pos:D0,col:C.w,gain:.95,size:.026});
   B.dyn=()=>{for(let k=0;k<7;k++){const w=toW(SID+':d'+k,[Math.sin(phi(k))*R,0,Math.cos(phi(k))*R]);L(D0,w,k===st.dom?C.acc:C.petrol,(k===st.dom?.5:.14)*LFADE)}};
   const d=DOM[st.dom];B.cap={k:d.r,n:P2(st.dom+1),t:d.t,s:d.d};B.hint='Domäne anklicken'}
  else{const d=DOM[st.dom],S=[[-2.1,1.0,0],[1.6,1.0,0],[5.3,1.0,0]];
   DOM.forEach((x,k)=>B.lab('dm'+k,[-6.95,1.6-k*.5,0],'<span class="n">'+P2(k+1)+'</span><span class="t">'+x.t+'</span>',{al:'l',cls:k===st.dom?'sel':'',click:()=>{st.dom=k;refresh()}}));
   B.g('ch',chaosPts(51+st.dom,.75,1400),{pos:S[0],col:C.pain,gain:.95,jit:.07,jf:.7,size:.028});
   B.g('of',cubePts(52,.55,1300),{pos:S[1],col:C.blue,gain:1.1,size:.027,spin:[.1,.25,0]});
   const hv=new PB(53);for(let i=0;i<1300;i++){const u=i/1300,a=u*TAU*3.2,r=.25+u*.45;hv.p(Math.cos(a)*r+hv.gs()*.03,-.75+u*1.5,Math.sin(a)*r+hv.gs()*.03)}B.g('va',hv,{pos:S[2],col:C.acc,gain:1.1,size:.028,spin:[0,.4,0]});
   for(let k=0;k<2;k++){const a=ad(S[k],[.85,0,0]),b=ad(S[k+1],[-.85,0,0]);B.path('f'+k,arc(a,b,.55,[0,.3,-1],30),620,{col:k?C.acc:C.sky,speed:.2,spread:.07,size:.022,gain:.95})}
   const HD=['Herausforderungen','Service-Angebote','Wertbeitrag'],LS=[d.ch,d.o,d.v];
   S.forEach((p,k)=>{B.lab('h'+k,ad(p,[0,1.05,0]),'<span class="t"'+(k==0?' style="color:#E8609F"':'')+'>'+HD[k]+'</span>',{al:'a'});
    B.lab('li'+k,ad(p,[0,-1.05,0]),'<div class="d" style="font-size:max(10px,calc(var(--u)*.8));line-height:1.55;text-align:left">'+LS[k].map(x=>'▪ '+x).join('<br>')+'</div>'+(k==2?'<div class="tag">Value Creation · EBITDA × Multiple · Capital Employed</div>':''),{al:'b',w:3.3})});
   B.cap={k:d.r,t:d.t};B.hint='Domäne links wählen'}}});

/* ---------- 05 · Über celver ---------- */
const CTAB=[['Überblick','celver: Tiefe Expertise in Finance- und Datenberatung','Datengetriebene Management- und IT-Beratung für das digitale Unternehmen'],['Services & Kompetenzen','celver bietet End-to-End Business- und Technologie-Services','Von der CFO-Beratung über Data Engineering bis zu Cloud-Lösungen']];
SLIDES.push({lab:'Über celver',t:CTAB[0][1],s:CTAB[0][2],init:()=>({tab:0,cel:0}),
 build(B,st){const tab=st.tab;B.t=CTAB[tab][1];B.s=CTAB[tab][2];B.act=CTAB.map((u,i)=>({t:u[0],on:i==tab,f:()=>{st.tab=i;refresh()}}));
  if(tab==0){const Q=[1.9,.1,0];
   const ct=new PB(61);ct.text('celver',0,0,.62,2000,0,.05);B.g('core',ct,{pos:Q,col:C.w,gain:1,size:.026});
   const e=new PB(62),N=100;for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,q=Math.sqrt(1-y*y),t=i*2.39996;e.ball(Math.cos(t)*q*1.35,y*1.35,Math.sin(t)*q*1.35,.04,16)}B.g('emp',e,{pos:Q,col:C.acc,gain:1.1,size:.024,spin:[0,.12,0]});
   const c=new PB(63);for(let i=0;i<N;i++){const y=1-2*(i+.5)/N,q=Math.sqrt(1-y*y),t=i*2.39996+1;c.ball(Math.cos(t)*q*2.1,y*2.1,Math.sin(t)*q*2.1,.05,16)}B.g('cli',c,{pos:Q,rot:[.35,0,0],col:C.sky,gain:.95,size:.024,spin:[0,-.06,0]});
   const y=new PB(64);for(let k=0;k<20;k++)y.ring(0,0,0,.3+k*.105,46+k*12,.006,'xz');B.g('yrs',y,{pos:ad(Q,[0,-2.45,0]),col:C.petrol,gain:.9,size:.022,spin:[0,.04,0]});
   const LOC=['Hamburg','München','Lissabon'],la=[.4,2.5,4.4];const bc=new PB(65);la.forEach(a=>{const x=Math.cos(a)*2.3,z=Math.sin(a)*2.3;bc.seg([x,0,z],[x,.75,z],60,.01);bc.ball(x,.82,z,.07,90)});B.g('loc',bc,{pos:ad(Q,[0,-2.45,0]),col:C.mint,gain:1.3,size:.026});
   la.forEach((a,i)=>B.lab('lc'+i,ad(Q,[Math.cos(a)*2.3,-2.45+1.05,Math.sin(a)*2.3]),'<span class="t" style="font-size:max(9px,calc(var(--u)*.68))">'+LOC[i]+'</span>',{al:'a'}));
   const F=[['emp',[-2.6,1.3,0],'r','100+','Mitarbeitende'],['cli',[2.55,1.75,0],'l','100+','aktive Kunden'],['yrs',[-2.6,-2.25,0],'r','20+ Jahre','Erfahrung in Finance & Data'],['loc',[2.75,-1.75,0],'l','3 Standorte','Hamburg · München · Lissabon']];
   F.forEach((f,i)=>{const p=ad(Q,f[1]);B.lab('f'+i,p,'<div class="mid">'+f[3]+'</div><div class="d">'+f[4]+'</div>',{al:f[2],hk:'fh'+i,click:()=>{}});B.hot('fh'+i,p,.5,{grp:[f[0]]});
    const to=f[0]=='emp'?ad(Q,[-.95,.95,0]):f[0]=='cli'?ad(Q,[1.5,1.45,0]):f[0]=='yrs'?ad(Q,[-1.4,-2.45,0]):ad(Q,[Math.cos(.4)*2.3,-1.65,Math.sin(.4)*2.3]);B.ln(ad(p,[f[2]=='r'?.15:-.15,0,0]),to,C.bg,.25)});
   B.cap={k:'Key Facts',t:'Management- & IT-Beratung',s:'Fokus auf datengetriebene Entscheidungen · Mitglied der UNITY Innovation Alliance',chips:['CFO','SCM','Sales & Marketing','Smart Data','Smart Cloud']};B.hint='Kennzahlen überfahren'}
  else{const P=[[-1.6,1.15,0],[1.4,1.15,0],[4.4,1.15,0],[-.1,-1.05,0],[2.9,-1.05,0]];
   CEL.forEach((c,k)=>{const sel=k===st.cel,tech=k>2,p=P[k],b=new PB(70+k);b.sphere(0,0,0,.36,760);B.g('n'+k,b,{pos:p,col:tech?C.acc:C.sky,gain:sel?1.45:.7,scale:sel?1.2:1,size:.03});
    const s=new PB(80+k);c[2].forEach((_,j)=>{const a=j/c[2].length*TAU;s.ball(Math.cos(a)*.78,Math.sin(a)*.78,0,.07,55)});s.ring(0,0,0,.78,220,.004);B.g('s'+k,s,{pos:p,rot:[1.0,0,0],col:C.w,gain:sel?1.2:.45,size:.022,spin:[0,.3,0]});
    B.lab('l'+k,ad(p,[0,-.75,0]),'<span class="t">'+c[0]+'</span>',{al:'b',cls:sel?'sel':'',click:()=>{st.cel=k;refresh()},hk:'h'+k});B.hot('h'+k,p,.6,{grp:['n'+k,'s'+k],click:()=>{st.cel=k;refresh()}})});
   B.lab('bs',[-2.75,1.15,0],'<span class="k">Business</span><br><span class="k">Services</span>',{al:'r'});B.lab('ts',[-1.25,-1.05,0],'<span class="k">Technical</span><br><span class="k">Services</span>',{al:'r'});
   const kp=CELK.map((_,i)=>[-.6+i*1.38,-2.75,0]);B.path('kf',[[-1.6,-2.75,0],...kp,[7.6,-2.75,0]],900,{col:C.petrol,speed:.04,spread:.03,size:.02,gain:.7});
   const kb=new PB(90);kp.forEach(p=>kb.ball(p[0],p[1],p[2],.07,60));B.g('kb',kb,{col:C.mint,gain:1.1,size:.024});
   CELK.forEach((x,i)=>B.lab('k'+i,ad(kp[i],[0,.22,0]),'<span class="t" style="font-size:max(9px,calc(var(--u)*.66))">'+x+'</span>',{al:'a'}));
   B.lab('kh',[-1.25,-2.75,0],'<span class="k">Kompetenzen</span>',{al:'r'});
   const c=CEL[st.cel];B.cap={k:c[1],t:c[0],list:c[2]};B.note='Technologies · Project Management · Social Competence';B.hint='Service anklicken'}}});

/* ---------- 06 · Ausgangslage & Zielbild ---------- */
SLIDES.push({lab:'Ausgangslage & Zielbild',t:'Das Controlling muss sich zu einem <em>integrierten E2E-Modell</em> entwickeln',s:'Von fragmentierten Datenmodellen zu einem einheitlichen, gesteuerten Datenökosystem',init:()=>({m:0,goals:false}),
 build(B,st){const C5=[1.75,-.42,0],m=st.m,ang=k=>PI/2-k*TAU/7,rn=rng(77);const isl=[];
  for(let k=0;k<7;k++){const a=ang(k);isl.push([Math.cos(a)*2.75+(rn()-.5)*.8,Math.sin(a)*1.75+(rn()-.5)*.45,-1.5+rn()*2.2])}
  const COLS=[C.sky,C.pain,C.petrol,C.sky,C.pain,C.bg,C.petrol];
  for(let k=0;k<7;k++){const b=new PB(500+k),a=ang(k);
   if(m==0){const c=isl[k];for(let i=0;i<700;i++){if(i%4==0){const f=(i>>2)%3,fa=f*2.1+k;b.cloud(c[0]+Math.cos(fa)*.55,c[1]+Math.sin(fa)*.4,c[2],.09,.09,.09,1)}else b.cloud(c[0],c[1],c[2],.3,.22,.22,1)}}
   else{const sp=TAU/7*.43;for(let i=0;i<700;i++){const t=a+(b.r()*2-1)*sp,v=b.r()*TAU,R=2.05+Math.cos(v)*.17;b.p(Math.cos(t)*R,Math.sin(t)*R,Math.sin(v)*.17)}}
   B.g('i'+k,b,{pos:C5,col:m?(k%2?C.acc:C.green):COLS[k],gain:m?1.05:.9,jit:m?0:.06,jf:.6,size:.028});
   const lp=m?[Math.cos(a)*2.55,Math.sin(a)*2.4,0]:ad(isl[k],[Math.cos(a)*.62,Math.sin(a)*.5,0]),cx=Math.cos(a),al=m?(cx>.35?'l':cx<-.35?'r':(Math.sin(a)>0?'a':'b')):(cx>.2?'l':cx<-.2?'r':(Math.sin(a)>0?'a':'b'));
   B.lab('l'+k,ad(C5,lp),(m?'':'<span class="n" style="color:#E8609F">'+P2(k+1)+'</span>')+H2(SQ[k][m],'',m?P2(k+1):''),{al,w:2.6})}
  if(m){B.path('rg',(()=>{const a=[];for(let k=0;k<72;k++)a.push([Math.cos(k/72*TAU)*2.05,Math.sin(k/72*TAU)*2.05,0]);return a})(),1500,{pos:C5,closed:true,col:C.w,speed:-.03,spread:.05,size:.022,gain:.75});
   const cb=new PB(520);cb.sphere(0,0,0,.55,900);cb.ball(0,0,0,.3,400);B.g('core',cb,{pos:C5,col:C.acc,gain:1,size:.028,spin:[0,.2,0]});
   for(let k=0;k<7;k++){const a=ang(k);B.ln(C5,ad(C5,[Math.cos(a)*1.85,Math.sin(a)*1.85,0]),C.acc,.22)}
   B.lab('cl',C5,'<span class="t">E2E</span>',{al:'c'})}
  else{const nb=new PB(521);nb.cloud(0,0,-.5,2.2,1.3,1.2,1000);B.g('noise',nb,{pos:C5,col:C.dim,gain:.5,jit:.25,jf:.25,size:.022})}
  B.hot('all',C5,3.2,{click:()=>{st.m=1-st.m;st.goals=false;refresh()}});
  B.act=[{t:'Status quo',on:m==0,f:()=>{st.m=0;refresh()}},{t:'Zielbild',on:m==1&&!st.goals,f:()=>{st.m=1;st.goals=false;refresh()}},{t:'Ziele & Meilensteine',on:st.goals,f:()=>{st.m=1;st.goals=true;refresh()}}];
  B.cap=m==0?{k:'Status quo',t:'Fragmentierte Datenlandschaft',s:'Sieben Inseln ohne gemeinsame Logik. Klicken, um zwischen heute und morgen zu wechseln.'}:st.goals?{k:'Zielbild',t:'Strategische Ziele & Meilensteine',list:ZIELE}:{k:'Zielbild',t:'Strategische Leitlinien',list:LEIT};
  B.hint='Szene anklicken: heute ↔ morgen'}});

/* ---------- 07 · Sieben Dimensionen ---------- */
SLIDES.push({lab:'7 Dimensionen',t:'Integriertes Controlling erfordert Reife in <em>sieben Dimensionen</em>',s:'Daten, Plattformen, Prozesse, Governance, Tools, Rollen und Fähigkeiten',init:()=>({dim:0,auto:false,last:0}),
 build(B,st){const C6=[2.25,-.02,0],R=2.12,TL=.32,pos=k=>{const a=PI/2-k*TAU/7;return ad(C6,[Math.cos(a)*R,Math.sin(a)*R*Math.cos(TL),-Math.sin(a)*R*Math.sin(TL)])};
  const cs=new PB(600);cs.sphere(0,0,0,.84,2300);B.g('cs',cs,{pos:C6,col:C.acc,gain:.6,size:.024,spin:[0,.12,0]});
  const ci=new PB(601);ci.ball(0,0,0,.42,900);B.g('ci',ci,{pos:C6,col:C.w,gain:.75,size:.026});
  const orb=[];for(let k=0;k<=70;k++){const a=PI/2-k/70*TAU;orb.push(ad(C6,[Math.cos(a)*R,Math.sin(a)*R*Math.cos(TL),-Math.sin(a)*R*Math.sin(TL)]))}
  B.path('orb',orb,1300,{closed:true,col:C.petrol,speed:.012,spread:.04,size:.022,gain:.7});
  const sel_=k=>{st.dim=k;st.auto=false;refresh()};
  DIMS.forEach((d,k)=>{const p=pos(k),sel=k===st.dim;node(B,'n'+k,p,.27,sel?C.acc:C.sky,{n:480,g:{gain:sel?1.5:.75,scale:sel?1.3:1}});
   B.path('sp'+k,[ad(C6,ml(nm(sb(p,C6)),.95)),ad(p,ml(nm(sb(p,C6)),-.35))],sel?520:220,{col:sel?C.acc:C.petrol,speed:sel?.45:.15,spread:sel?.05:.02,size:.022,gain:sel?1.1:.6});
   const a=PI/2-k*TAU/7,cx=Math.cos(a),al=cx>.3?'l':cx<-.3?'r':(Math.sin(a)>0?'a':'b'),lp=ad(p,[cx*.62,Math.sin(a)*.55,0]);
   B.lab('l'+k,lp,'<span class="n">'+P2(k+1)+'</span><span class="t">'+d.t+'</span>',{al,cls:sel?'sel':'',click:()=>sel_(k),hk:'h'+k});
   B.hot('h'+k,p,.5,{grp:['n'+k,'n'+k+'_r'],click:()=>sel_(k)})});
  B.lab('cl',C6,'<span class="t">Integriertes</span><br><span class="t">Controlling</span>',{al:'c'});
  const d=DIMS[st.dim];B.cap={n:P2(st.dim+1),t:d.t,s:d.d,chips:[{h:'Schwerpunkt in',c:'o'},...d.i]};
  B.act=[{t:st.auto?'Rundgang stoppen':'Rundgang starten ▸',on:st.auto,f:()=>{st.auto=!st.auto;st.last=T;refresh()}}];
  B.dyn=()=>{if(st.auto&&T-st.last>2.8){st.last=T;st.dim=(st.dim+1)%7;refresh()}};
  B.note='Zunehmende Systemkomplexität und verteilte Datenlandschaften erfordern eine <b>ganzheitliche Transformation</b> über Daten, Architektur und Controlling-Prozesse, um skalierbare und konsistente Entscheidungen zu ermöglichen.';
  B.hint='Dimension anklicken'}});
