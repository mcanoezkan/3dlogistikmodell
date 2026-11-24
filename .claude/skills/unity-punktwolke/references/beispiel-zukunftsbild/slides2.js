/* ---------- Kapiteltrenner (Impuls I · II · III) ---------- */
const SERIF='Georgia,"Times New Roman","DejaVu Serif",serif';
function chapter(num,kap,title,q,focus){return{lab:'Impuls '+num,idx:'Kapitel '+kap+' · Impuls '+num,t:title,s:q,cam:{yaw:-.12,pitch:.05,sway:.05},
 build(B,st){const N0=[3.3,-.3,0],R=3.0,RX=.34;
  const t=new PB(hsh(num));t.text(num,0,0,4.4,8600,0,0,700,SERIF);for(let i=0;i<t.a.length;i+=3)t.a[i+2]=(t.r()-.5)*.3;B.g('num',t,{pos:N0,col:C.w,gain:.85,size:.028,tw:.3});
  const h=new PB(hsh(num)+1);h.text(num,0,0,4.4,2600,-.3,.35,700,SERIF);B.g('halo',h,{pos:N0,col:C.acc,gain:.32,size:.03,jit:.06,jf:.5,scale:1.03});
  const o={pos:N0,rot:[RX,0,0],spin:[0,.07,0]};
  B.path('orb',(()=>{const a=[];for(let k=0;k<64;k++)a.push([Math.sin(k/64*TAU)*R,0,Math.cos(k/64*TAU)*R]);return a})(),1500,Object.assign({closed:true,col:C.petrol,speed:.01,spread:.03,size:.022,gain:.65},o));
  DIMS.forEach((d,k)=>{const f=focus.includes(k),a=k*TAU/7,lp=[Math.sin(a)*R,0,Math.cos(a)*R],b=new PB(700+k);b.sphere(lp[0],lp[1],lp[2],f?.26:.13,f?620:200);
   B.g('d'+k,b,Object.assign({col:f?C.acc:C.dim,gain:f?1.4:.7,size:.028},o));
   if(f)B.lab('l'+k,{g:'d'+k,p:ad(lp,[0,.42,0])},'<span class="t">'+d.t+'</span>',{al:'a',cls:()=>toW(SID+':d'+k,lp)[2]<N0[2]-.8?'dim':''})});
  B.dyn=()=>{for(const k of focus){const a=k*TAU/7,w=toW(SID+':d'+k,[Math.sin(a)*R,0,Math.cos(a)*R]);L(N0,w,C.acc,.2*LFADE)}};
  B.cap={k:'Fokus-Dimensionen',list:DIMS.map((d,k)=>focus.includes(k)?{h:'<b>'+P2(k+1)+' '+d.t+'</b>'}:{h:'<span>'+P2(k+1)+' '+d.t+'</span>',c:'p'}).filter((x,k)=>focus.includes(k))};
  B.note='Weitere Dimensionen: '+DIMS.filter((d,k)=>!focus.includes(k)).map(d=>d.t).join(' · ')}}}
SLIDES.push(chapter('I','02','Kernprozesse im Controlling inkl. <em>Target Operating Model & KI</em>','Wie arbeiten Planung, Forecasting und Reporting heute zusammen, und welche Governance braucht das Zielbild?',[2,3,5]));

/* ---------- 09 · Prozesslandkarte ---------- */
SLIDES.push({lab:'Prozesslandkarte & Pain Points',t:'Controlling-Prozesse umfassen <em>Planung, Reporting und Governance</em>',s:'E2E-Prozesslandkarte mit typischen Pain Points entlang der Kernprozesse',cam:{pitch:.06},init:()=>({m:0}),
 build(B,st){const m=st.m,YM=1.65,YP=.5,YR=-.7,YS=-1.95,X0=-4.9,X1=5.8;
  const px=i=>X0+i*(X1-X0)/7,rx=i=>X0+i*(X1-X0)/6,mx=i=>-4.3+i*2.5,sx=i=>-4.5+i*2.06;
  const pill=(key,c,w,h,col,o)=>{const b=new PB(hsh(key));b.rect(-w/2,-h/2,w,h,Math.round((w+h)*170),0,.008);b.fill(-w/2,-h/2,w,h,Math.round(w*h*260),0,.08);B.g(key,b,Object.assign({pos:c,col,size:.025},o||{}))};
  const side=m==0;
  MGMT.forEach((t,i)=>{const c=[mx(i),YM,-.2];pill('m'+i,c,1.9,.34,C.petrol,{gain:side?.85:.18});B.lab('ml'+i,ad(c,[0,-.3,0]),'<div class="d" style="color:#fff">'+t+'</div>',{al:'b',w:2.2,cls:side?'c':'ghost c'})});
  SUPP.forEach((t,i)=>{const c=[sx(i),YS,-.2];pill('u'+i,c,1.6,.3,C.dim,{gain:side?.95:.18});B.lab('ul'+i,ad(c,[0,-.27,0]),'<div class="d">'+t+'</div>',{al:'b',w:1.9,cls:side?'c':'ghost c'})});
  const band=(arr,X,Y,key,col,map,act)=>{arr.forEach((t,i)=>{const c=[X(i),Y,0],hit=m>0&&act&&map[i],b=new PB(hsh(key+i));
    for(let j=0;j<300;j++){const u=b.r()*2-1,v=b.r()*2-1;b.p(u*.42+(Math.abs(v)*.12),v*.2,(b.r()-.5)*.1)}b.rect(-.45,-.22,.9,.44,180,0,.006);
    B.g(key+i,b,{pos:c,col:hit?C.pain:col,gain:hit?1.5:(m&&!act?.25:.95),jit:hit?.05:0,jf:1.3,size:.026});
    B.lab(key+'l'+i,ad(c,[0,-.33,0]),'<div class="d" style="color:#fff">'+t+'</div>',{al:'b',w:1.42,cls:'c'+(m&&!act?' dim':'')});
    if(hit){B.lab(key+'b'+i,ad(c,[0,.42,0]),'<span class="mid" style="color:#E8609F">'+hit+'</span>',{al:'a'})}});
   const pts=[[X(0)-1.2,Y,0]];arr.forEach((_,i)=>pts.push([X(i),Y,0]));pts.push([X(arr.length-1)+.9,Y,0]);
   B.path(key+'f',pts,1600,{col:act&&m?C.pain:col,speed:.035,spread:act&&m?.16:.07,size:.022,gain:m&&!act?.25:.8,jit:act&&m?.05:0})};
  band(PLAN,px,YP,'p',C.sky,PPM,m!=2);band(REP,rx,YR,'r',C.acc,RPM,m!=1);
  for(let i=0;i<5;i++)B.ln([mx(i),YM-.17,-.2],[mx(i),YP+.25,0],C.petrol,side?.16:.04);
  for(let i=0;i<6;i++)B.ln([sx(i),YS+.15,-.2],[sx(i),YR-.25,0],C.dim,side?.16:.04);
  const BL=[['Management-','prozesse',YM],['Planung &','Forecasting',YP],['Reporting','',YR],['Unterstützungs-','prozesse',YS]];
  BL.forEach((b,i)=>B.lab('bl'+i,[-7.4,b[2],0],'<span class="k" style="color:'+(i==1||i==2?'#2FC7A5':'#9FB2C6')+'">'+b[0]+'<br>'+b[1]+'</span>',{al:'l',cls:(m&&(i==0||i==3))?'ghost':''}));
  if(m){const P=m==1?PPAIN:RPAIN,Y=m==1?YM+.05:YS-.05;P.forEach((p,i)=>{const x=-4.6+i*2.95;B.lab('pp'+i,[x,Y,0],'<span class="n" style="color:#E8609F">'+(i+1)+'</span><span class="t2">'+p[0]+'</span><div class="d">'+p[1]+'</div>',{al:m==1?'lb_':'lt',w:2.75,cls:'pain'})})}
  B.act=['Prozesssicht','Pain Points Planung','Pain Points Reporting'].map((t,i)=>({t,on:i==m,f:()=>{st.m=i;refresh()}}));
  B.note=(m==0?'<em>Diskussion:</em> Welche dieser Pain Points erleben Sie im Arbeitsalltag? Gibt es weitere?<br>':'<em>'+(m==1?'Typische Pain Points in Planung & Forecasting':'Typische Pain Points im Reporting')+'</em><br>')+'Typische Tools: <b>S/4HANA · BPC · Board · SAC · BW · Azure Data Lakes · Power BI · Excel</b>';B.hint='Ansicht oben rechts wechseln'}});

/* ---------- 10 · Governance-Pyramide ---------- */
SLIDES.push({lab:'Governance-Pyramide',t:'Eine Governance-Pyramide sichert <em>skalierbare, konsistente Steuerung</em>',s:'Von strategischen Prinzipien zu operativen Data-Governance-Regeln',cam:{pitch:.12,yaw:-.05},init:()=>({sel:1,ang:0}),
 build(B,st){const P0=[2.3,-1.85,0],W=2.15,H=3.75,sel=st.sel;
  const fr_=(b,h0,h1,faces,n)=>{for(let i=0;i<n;i++){const f=faces[i%faces.length],s=b.r()*2-1,t=b.r(),y=h0+(h1-h0)*t,w=W*(1-y);let x,z;
    if(f==0){x=s*w;z=w}else if(f==1){x=w;z=-s*w}else if(f==2){x=-s*w;z=-w}else{x=-w;z=s*w}b.p(x,y*H,z)}
   for(const f of faces){for(const y of[h0,h1]){const w=W*(1-y);const c=[[-w,w],[w,w],[w,-w],[-w,-w]];const a=c[f],q=c[(f+1)%4];b.seg([a[0],y*H,a[1]],[q[0],y*H,q[1]],70)}const w0=W*(1-h0),w1=W*(1-h1),c0=[[-1,1],[1,1],[1,-1],[-1,-1]][f];b.seg([c0[0]*w0,h0*H,c0[1]*w0],[c0[0]*w1,h1*H,c0[1]*w1],50)}return b};
  const LV=[['top',.64,.97,[0,1,2,3],2600,0],['mid',.34,.6,[0,1,2,3],3000,1]];
  const ang=sel>=2?-(sel-2)*PI/2:null;
  LV.forEach(l=>{const s=l[5]===sel,b=fr_(new PB(hsh(l[0])),l[1],l[2],l[3],l[4]);B.g(l[0],b,{pos:P0,rot:[0,0,0],col:s?C.acc:l[5]?C.petrol:C.blue,gain:s?1.5:.7,lo:[0,s?.25:0,0],size:.026})});
  for(let f=0;f<4;f++){const s=sel===f+2,b=fr_(new PB(800+f),.02,.3,[f],1500),nrm=[[0,0,1],[1,0,0],[0,0,-1],[-1,0,0]][f];B.g('f'+f,b,{pos:P0,col:s?C.acc:C.sky,gain:s?1.6:.6,lo:ml(nrm,s?.35:0),size:.026})}
  const ap=new PB(810);ap.ball(0,H*.97,0,.09,200);B.g('apex',ap,{pos:P0,col:C.w,gain:1.4,size:.03});
  const gb=new PB(811);gb.disc(0,0,0,3.4,1200,'xz');B.g('base',gb,{pos:ad(P0,[0,-.05,0]),col:C.dim,gain:.45,size:.02,spin:[0,.05,0]});
  const KEYS=['top','mid','f0','f1','f2','f3','apex'];
  B.dyn=(t,dt)=>{if(ang===null)st.ang+=dt*.16;else{let a=ang;while(a-st.ang>PI)a-=TAU;while(a-st.ang<-PI)a+=TAU;st.ang+=(a-st.ang)*Math.min(1,dt*3)}for(const k of KEYS){const g=RG(k);if(g){g.rot[1]=st.ang;g.rotC[1]=st.ang}}};
  const LIST=[['Strategisch',[0]],['Taktisch',[1]],['Operativ',[2,3,4,5]]];let y=1.55;
  LIST.forEach(g=>{B.lab('h'+g[0],[-6.95,y,0],'<span class="k">'+g[0]+'</span>',{al:'l'});y-=.36;g[1].forEach(i=>{B.lab('it'+i,[-6.95,y,0],'<span class="t2">'+GOV[i][1]+'</span>',{al:'l',cls:i===sel?'sel':'',click:()=>{st.sel=i;refresh()}});y-=.42});y-=.12});
  const G=GOV[sel],ly=sel==0?.8*H:sel==1?.47*H:.18*H;B.lab('pl',ad(P0,[W*(1-ly/H)+.5,ly,0]),'<span class="t" style="color:#2FC7A5">'+G[1]+'</span>',{al:'l'});
  B.hot('pt',ad(P0,[0,.8*H,0]),.75,{grp:['top'],click:()=>{st.sel=0;refresh()}});B.hot('pm',ad(P0,[0,.47*H,0]),1.15,{grp:['mid'],click:()=>{st.sel=1;refresh()}});
  B.hot('pb',ad(P0,[0,.16*H,1.2]),1.3,{click:()=>{st.sel=sel>=2&&sel<5?sel+1:2;refresh()}});
  B.cap={k:'Ebene: '+G[0],t:G[1],s:G[2]};
  B.note='„Data Governance ist ein Rahmenwerk aus Prozessen und Standards für das effektive Management und die strategische Nutzung von Daten.“<br>Für eine konsistente, transparente und skalierbare Steuerung über alle E2E-Controlling-Prozesse ist ein <b>einheitliches Data-Governance-Rahmenwerk</b> unverzichtbar.';
  B.hint='Ebene links oder in der Pyramide wählen'}});

/* ---------- 11 · Governance-Balance ---------- */
SLIDES.push({lab:'Governance-Balance',t:'Wirksame Governance balanciert <em>Kontrolle und Agilität</em>',s:'Den richtigen Punkt zwischen Standardisierung und Flexibilität finden',init:()=>({f:20,fs:20}),
 build(B,st){const X0=-5.8,WX=8.4,YB=-1.75,HY=3.15,cv=p=>4*p*(1-p),wp=p=>[X0+p*WX,YB+HY*cv(p),0];
  const F=()=>st.fs/100,val=()=>cv(F()),res=()=>Math.round(val()*7);
  const crvP=[];for(let k=0;k<=60;k++)crvP.push(wp(k/60));
  B.path('cv',crvP,1500,{col:C.acc,speed:.04,spread:.03,size:.026,gain:1});
  B.path('ax',[[X0-.2,YB,0],[X0+WX+.4,YB,0]],700,{col:C.bg,speed:.05,spread:.01,size:.02,gain:.6});
  const ay=new PB(901);ay.seg([X0-.2,YB,0],[X0-.2,YB+HY+.35,0],160);B.g('ay',ay,{col:C.bg,gain:.6,size:.02});
  const fld=new PB(902);for(let i=0;i<5200;i++)fld.p(0,0,0);
  B.g('fld',fld,{col:C.acc,gain:.75,size:.024,stiff:.05,tw:.1,pm:(l,V,t)=>{const p=rr(l,0),q=rr(l,1),f=F(),an=ss(.42,.06,f),bu=ss(.58,.94,f),bal=1-Math.max(an,bu);
    let x=X0+p*WX,y=YB+q*HY*cv(p)*.97,z=(rr(l,2)-.5)*.5;
    if(bu>0){const gx=X0+Math.round((x-X0)/.24)*.24,gy=YB+Math.round((y-YB)/.2)*.2;x=mix(x,gx,bu);y=mix(y,gy,bu);z=mix(z,0,bu)}
    if(an>0){x+=an*.42*Math.sin(t*1.7+l*.37);y+=an*.32*Math.sin(t*1.3+l*.71);z+=an*.6*Math.sin(t*.9+l*.13)}
    y+=bal*.06*Math.sin(t*1.6+x*1.4);V[0]=x;V[1]=Math.min(y,YB+HY*cv(p)+.05+an*.4);V[2]=z;return .45+.6*bal}});
  const mk=new PB(903);mk.sphere(0,0,0,.17,500);mk.ring(0,0,0,.32,240,.01);B.g('mk',mk,{col:C.w,gain:1.4,size:.03,spin:[0,0,.5]});
  CHAL.forEach((c,i)=>{const p=[3.55,1.55-i*.36,0],b=new PB(910+i);b.ball(0,0,0,.06,70);B.g('c'+i,b,{pos:p,col:C.pain,gain:1.2,size:.024});
   B.lab('cl'+i,ad(p,[.22,0,0]),()=>'<span class="'+(i<res()?'ok':'no')+'">'+(i<res()?'✓':'✕')+'</span><span class="d" style="color:#fff">'+c+'</span>',{al:'l',w:3.9,cls:()=>i<res()?'dim':''})});
  B.lab('chh',[3.55,1.95,0],()=>'<span class="k">Herausforderungen adressiert: <span style="color:#2FC7A5">'+res()+' von 7</span></span>',{al:'l'});
  B.lab('efh',[3.55,-1.15,0],'<span class="k">Positive Effekte</span>',{al:'l'});
  EFF.forEach((e,i)=>B.lab('ef'+i,[3.55,-1.5-i*.34,0],'<span class="t2">'+e+'</span>',{al:'l',cls:()=>val()>.85?'sel':'ghost'}));
  B.lab('mkl',()=>ad(wp(F()),[0,.5,0]),()=>'<div class="mid" style="color:'+(val()>.85?'#2FC7A5':'#E8609F')+'">'+Math.round(val()*100)+' %</div><div class="k" style="text-align:center">'+(st.fs<30?'„Anarchie“':st.fs>70?'„Bürokratie“':'Balance')+'</div>',{al:'a'});
  [['„Anarchie“',.12],['Balance',.5],['„Bürokratie“',.88]].forEach((z,i)=>B.lab('z'+i,[X0+z[1]*WX,YB-.32,0],'<span class="t">'+z[0]+'</span>',{al:'b'}));
  B.lab('xl',[X0,YB-.75,0],'<span class="k">informell · Simplify</span>',{al:'lt'});B.lab('xr',[X0+WX,YB-.75,0],'<span class="k">formell · Structure</span>',{al:'r',dy:.55});
  B.lab('xc',[X0+WX/2,YB-.8,0],'<span class="k" style="color:#C9D6E2">Grad an Formalisierung / Komplexität</span>',{al:'b'});
  B.lab('yl',[X0-.2,YB+HY+.5,0],'<span class="k" style="color:#C9D6E2">Datennutzen / Wert aus Daten</span>',{al:'lb_'});
  const setF=q=>{st.f=cl((q[0]-X0)/WX*100,0,100)};
  B.hot('drag',[X0+WX/2,YB+HY/2,0],4.4,{drag:setF,grp:['mk']});
  B.dyn=(t,dt)=>{st.fs+=(st.f-st.fs)*Math.min(1,dt*6);const g=RG('mk'),p=wp(F());if(g){g.pos=p;g.posC=lp(g.posC,p,.35)}
   const v=val(),fl=RG('fld');if(fl)fl.c=hex(v>.85?C.acc:v>.55?C.sky:C.pain);const cv_=RG('cv');if(cv_)cv_.c=hex(v>.85?C.acc:C.sky);
   for(let i=0;i<7;i++){const c=RG('c'+i);if(c)c.c=hex(i<res()?C.acc:C.pain)}L(p,[p[0],YB,0],C.w,.3*LFADE)};
  B.act=[['Anarchie',10],['Balance',50],['Bürokratie',90]].map(a=>({t:a[0],f:()=>{st.f=a[1]}}));
  B.note='Ziel ist ein <b>pragmatisches Minimum an Regeln</b>, das Klarheit schafft, ohne Agilität zu blockieren.';B.hint='Im Diagramm ziehen: Formalisierung einstellen'}});

/* ---------- 12 · Rollen & Ownership ---------- */
SLIDES.push({lab:'Rollen & Ownership',t:'Klare Rollen und Ownership sind das <em>Rückgrat der Governance</em>',s:'Definierte Verantwortung für Data Owner, Data Stewards und Data Consumer',cam:{pitch:.08},init:()=>({r:0}),
 build(B,st){const X=[-.4,2.6,5.6],Y0=-2.05,sel=st.r;
  RO.forEach((r,k)=>{const s=k===sel,b=new PB(1000+k);figure(b,0,0,0,.95,2600);B.g('fg'+k,b,{pos:[X[k],Y0,s?.9:0],col:s?C.acc:C.sky,gain:s?1.35:.7,size:.026,stiff:.05});
   const h=new PB(1010+k);h.ring(0,0,0,.55,300,.01,'xz');B.g('hr'+k,h,{pos:[X[k],Y0+3.3,s?.9:0],rot:[.75,0,0],col:C.w,gain:s?1.2:.35,size:.022,spin:[0,.6,0]});
   const pl=new PB(1020+k);pl.disc(0,0,0,.9,500,'xz');pl.ring(0,0,0,.95,260,.008,'xz');B.g('pl'+k,pl,{pos:[X[k],Y0,s?.9:0],col:s?C.acc:C.dim,gain:s?1:.6,size:.022,spin:[0,.15,0]});
   B.lab('l'+k,[X[k],Y0-.25,s?.9:0],'<span class="t2" style="font-size:max(13px,calc(var(--u)*1.2))">'+r.t+'</span><div class="k" style="margin-top:.3em">'+r.s+'</div>',{al:'b',cls:s?'sel c':'c',click:()=>{st.r=k;refresh()},hk:'h'+k});
   B.hot('h'+k,[X[k],Y0+1.5,s?.9:0],1.1,{grp:['fg'+k],click:()=>{st.r=k;refresh()}})});
  const loop=[];for(let k=0;k<=80;k++){const a=k/80*TAU;loop.push([2.6+Math.cos(a)*3.6,-.35+Math.sin(a*2)*.12,Math.sin(a)*1.25])}
  B.path('lp',loop,1700,{closed:true,col:C.acc,speed:.045,spread:.05,size:.022,gain:.85});
  B.lab('vh',[-6.95,1.55,0],'<span class="k">Verantwortung</span>',{al:'l'});
  PRIN.forEach((p,i)=>B.lab('pr'+i,[-6.95,1.05-i*1.15,0],H2(p[0],p[1],P2(i+1)),{al:'lt',w:4.1}));
  const r=RO[sel];B.cap={k:r.s,t:r.t,list:r.d};B.hint='Rolle anklicken'}});

/* ---------- 13 · SAP MDM ---------- */
SLIDES.push({lab:'SAP MDM',t:'SAP MDM operationalisiert Governance <em>auf Unternehmensebene</em>',s:'Standards für Datenkonsistenz über alle Systeme durchsetzen',init:()=>({lim:false}),
 build(B,st){const H0=[1.3,0,0],lim=st.lim;
  const hb=new PB(1100);hb.sphere(0,0,0,.62,1400);B.g('hub',hb,{pos:H0,col:lim?C.pain:C.acc,gain:1.05,jit:lim?.06:0,size:.028,spin:[0,.2,0]});
  const ht=new PB(1101);ht.ring(0,0,0,1.0,900,.03,'xy');ht.ring(0,0,0,1.15,500,.015,'xz');B.g('hr',ht,{pos:H0,col:C.w,gain:lim?.4:.75,spin:[.1,.3,0],size:.022});
  B.lab('hl',ad(H0,[0,0,0]),'<span class="t">SAP MDM</span><div class="k" style="text-align:center">Master Data</div><div class="k" style="text-align:center">Management</div>',{al:'c'});
  const CP=[[-1.75,1.35,0],[4.35,1.35,0],[-1.75,-1.45,0],[4.35,-1.45,0]].map((p,i)=>[i%2?2.9:-.3,p[1],0]);
  MDMC.forEach((c,i)=>{const p=CP[i];node(B,'c'+i,p,.22,lim?C.dim:C.sky,{n:460,g:{gain:lim?.5:1,jit:lim?.04:0}});B.ln(H0,p,lim?C.dim:C.acc,lim?.1:.3);
   B.lab('cl'+i,ad(p,[i%2?.5:-.5,0,0]),H2(c[0],c[1]),{al:i%2?'l':'r',w:2.6,cls:lim?'dim':''})});
  const SY=[['S/4HANA',1.35],['BW',0],['BI / Reporting',-1.35]];
  SY.forEach((s,i)=>{const p=[6.75,s[1],0],b=new PB(1110+i);b.edges(-.45,-.28,-.3,.45,.28,.3,420);b.box(-.45,-.28,-.3,.45,.28,.3,500);B.g('s'+i,b,{pos:p,col:C.blue,gain:lim?.6:1.05,jit:lim?.03:0,size:.024,rot:[.25,-.4,0]});
   B.lab('sl'+i,ad(p,[0,-.48,0]),'<span class="t">'+s[0]+'</span>',{al:'b'});
   B.path('fl'+i,crv([ad(H0,[.75,s[1]*.3,0]),[3.9,s[1]*.6,.6],ad(p,[-.6,0,0])],12),lim?260:620,{col:lim?C.pain:C.acc,speed:lim?.05:.26,spread:lim?.18:.05,size:.022,gain:lim?.7:1,jit:lim?.08:0})});
  B.act=[{t:'Kernfähigkeiten',on:!lim,f:()=>{st.lim=false;refresh()}},{t:'Grenzen einblenden',on:lim,f:()=>{st.lim=true;refresh()}}];
  B.hot('hub',H0,.9,{grp:['hub','hr'],click:()=>{st.lim=!st.lim;refresh()}});
  B.cap=lim?{k:'Grenzen',t:'Wo SAP MDM an Grenzen stößt',list:MDML.map(x=>({h:x,c:'p'}))}:{k:'Rolle von SAP MDM',t:'Zentrales Stammdaten-Rückgrat',list:MDMR};
  B.note='SAP MDM setzt Data Governance um, indem es einheitliche Definitionen, Ownership und Qualitätsregeln durchsetzt. Den vollen Wert entfaltet es <b>nur mit starken Governance-Strukturen</b>.';B.hint='Hub anklicken: Grenzen ein/aus'}});

/* ---------- Lösungsansätze (I · II · III) ---------- */
function solutions(lab,title,sub,M,q){return{lab,t:title,s:sub,init:()=>({rev:[false,false,false,false]}),
 build(B,st){const XP=-6.45,XC=.95,YY=[1.2,.05,-1.1,-2.25];
  B.lab('hp',[-6.95,1.95,0],'<span class="k" style="color:#E8609F">Mögliche Pain Points</span>',{al:'l'});B.lab('hc',[.35,1.95,0],'<span class="k" style="color:#2FC7A5">UNITY Capabilities</span>',{al:'l'});
  M.forEach((r,i)=>{const on=st.rev[i],y=YY[i],tg=()=>{st.rev[i]=!st.rev[i];refresh()};
   B.g('p'+i,chaosPts(1200+i,.36,700),{pos:[XP,y,0],col:C.pain,gain:on?.4:1.1,jit:on?.015:.06,jf:.8,size:.026,scale:on?.75:1});
   B.g('c'+i,crystalPts(1210+i,.3,800),{pos:[XC,y,0],col:on?C.acc:C.dim,gain:on?1.35:.22,scale:on?1:.55,size:.026,spin:[.2,.5,0]});
   B.path('f'+i,crv([[XP+.35,y-.12,0],[-3.4,y-.5,-1.4],[XC-.4,y-.1,0]],14),on?700:1,{col:C.acc,speed:.3,spread:.05,size:.022,gain:1});
   B.lab('pl'+i,[XP+.55,y,0],H2(r[0],r[1],i+1),{al:'l',w:4.3,cls:on?'dim':'pain',click:tg,hk:'h'+i});
   B.lab('cl'+i,[XC+.5,y,0],H2(r[2],r[3]),{al:'l',w:5.2,cls:on?'sel':'ghost',click:tg,hk:'h'+i});
   B.hot('h'+i,[XP,y,0],.5,{grp:['p'+i],click:tg});B.hot('hc'+i,[XC,y,0],.45,{grp:['c'+i],click:tg})});
  const all=st.rev.every(Boolean);B.act=[{t:all?'Zurücksetzen':'Alle Lösungen einblenden',on:all,f:()=>{st.rev=st.rev.map(()=>!all);refresh()}}];
  B.note='<em>Diskussion:</em> '+q;B.hint='Pain Point anklicken'}}}
SLIDES.push(solutions('Lösungsansätze Impuls I','Prozess-Pain-Points mit <em>erprobten Methoden</em> lösen','Von fragmentierter Planung zu integrierter E2E-Finanzsteuerung',M1,'Gibt es weitere relevante Pain Points in Ihren Prozessen?'));
SLIDES.push(chapter('II','03','Daten- & Reporting-Architektur <em>„Next Gen“</em>','Wie wird aus 25+ BW-Modellen, mehreren Data Lakes und parallelen BI-Welten eine Single Source of Truth?',[0,1,4]));

/* ---------- 16 · SAP-Toollandschaft ---------- */
SLIDES.push({lab:'SAP-Toollandschaft',t:'Die SAP-Toollandschaft erzeugt <em>erhebliche Komplexität</em>',s:'S/4, BW, SAC und Non-SAP-Tools entlang der Controlling-Funktionen',cam:{yaw:-.18,pitch:.08},init:()=>({tool:6,pain:false}),
 build(B,st){const pain=st.pain,CP=pain?[-3.1,.3,0]:[0,0,0],CS=pain?.56:1,X0=-4.9,WX=8.6,Y0=-2.15,HY=3.75,mp=(x,y)=>[X0+x/100*WX,Y0+y/100*HY,0];
  const o=k=>Object.assign({pos:CP,scale:CS},k);
  const gr=new PB(1300);for(let i=0;i<=5;i++){gr.seg([X0,Y0+i/5*HY,-.4],[X0+WX,Y0+i/5*HY,-.4],120);gr.seg([X0+i/5*WX,Y0,-.4],[X0+i/5*WX,Y0+HY,-.4],70)}B.g('grid',gr,o({col:C.dim,gain:.45,size:.018}));
  B.path('ax',[[X0,Y0,0],[X0+WX+.3,Y0,0]],600,o({col:C.bg,speed:.05,spread:.01,size:.02,gain:.6}));B.path('ay',[[X0,Y0,0],[X0,Y0+HY+.3,0]],400,o({col:C.bg,speed:.05,spread:.01,size:.02,gain:.6}));
  B.path('tr',TOOLS.map(t=>mp(t.x,t.y)),900,o({col:C.acc,speed:.05,spread:.06,size:.02,gain:.55}));
  TOOLS.forEach((t,i)=>{const s=i===st.tool,p=mp(t.x,t.y),b=new PB(1310+i);b.sphere(p[0],p[1],p[2],.25,600);b.ring(p[0],p[1],p[2],.4,220,.008);
   B.g('t'+i,b,o({col:s?C.acc:i==0?C.bg:C.sky,gain:pain?.5:s?1.5:.8,size:.027}));
   B.lab('tl'+i,{g:'t'+i,p:ad(p,[.48,.1,0])},'<span class="t2">'+t.n+'</span>',{al:'l',cls:s?'sel':'',click:()=>{st.tool=i;st.pain=false;refresh()},hk:'h'+i});
   B.hot('h'+i,{g:'t'+i,p},.4,{grp:['t'+i],click:()=>{st.tool=i;st.pain=false;refresh()}})});
  const zr=new PB(1320),zp=mp(90,86);zr.ring(0,0,0,.62,500,.01);B.g('ziel',zr,{pos:ad(CP,ml(zp,CS)),scale:CS,col:C.acc,gain:.8,spin:[0,0,.4],size:.022});
  B.lab('zl',{g:'ziel',p:[0,.72,0]},'<span class="t" style="color:#2FC7A5">Ziel</span>',{al:'a'});
  B.lab('xl',{g:'grid',p:[X0+WX/2,Y0-.3,0]},'<span class="k">Funktionsumfang: gering → sehr professionell</span>',{al:'b',cls:pain?'off':''});
  B.lab('yl',{g:'grid',p:[X0-.25,Y0+HY/2,0]},'<span class="k">Implementierungs-<br>aufwand: gering → hoch</span>',{al:'r',cls:pain?'off':''});
  const wall=new PB(1330);for(let i=0;i<2600;i++){const u=wall.r(),v=wall.r();wall.p((u-.5)*2.6,(v-.5)*3.8,wall.gs()*.02)}wall.rect(-1.3,-1.9,2.6,3.8,600,0,.005);
  B.g('wall',wall,{pos:pain?[6.9,-.45,-2.8]:[6.35,-.45,-.4],rot:[0,pain?.9:.55,0],col:pain?C.pain:C.petrol,gain:pain?.55:.85,jit:pain?.05:.01,size:.022});
  B.lab('wl',pain?[6.9,1.95,-2.8]:[6.35,1.95,-.4],'<span class="t">Parallele Reporting- &<br>Controlling-Schicht</span><div class="d" style="text-align:center">Non-SAP: Azure, Power BI, Tableau</div>',{al:'a'});
  if(pain){TPAIN.forEach((p,i)=>{const y=1.6-i*.74,pp=[.35,y,0],b=new PB(1340+i);b.cloud(0,0,0,.08,.08,.08,160);B.g('pp'+i,b,{pos:pp,col:C.pain,gain:1.3,jit:.04,size:.024});
    B.lab('ppl'+i,ad(pp,[.3,0,0]),'<span class="n" style="color:#E8609F">'+(i+1)+'</span><span class="t2">'+p[0]+'</span><div class="d">'+p[1]+' <span style="color:#E8609F">→ '+p[2]+'</span></div>',{al:'l',w:4.4})})}
  B.act=[{t:pain?'Tool-Details zeigen':'Pain Points einblenden',on:pain,f:()=>{st.pain=!pain;refresh()}}];
  const t=TOOLS[st.tool];B.cap=pain?{k:'Typische Pain Points im Reporting',t:'Komplexität kostet Steuerungsfähigkeit'}:{k:'Ausgewähltes Tool',t:t.n,s:t.d};B.hint=pain?'':'Tool anklicken'}});

/* ---------- 17 · Data-Lake-Architektur ---------- */
const DLK={src:['Operative Systeme','Research','Production','Sales …','Data Dumps','API / weitere Quellen'],ing:['Data Streaming','Batch / API'],stg:['Raw','Conformed','Enriched','Curated'],dist:['Query','API','Data Sharing'],uc:['Analytics','Mobile Apps','Traditionelle Anwendungen','Microservices'],qs:['Data Quality','Access Control','Lineage','Standards']};
const DLD={src:['Quellen','Operative Systeme, Fachbereiche und externe Daten liefern Rohdaten in unterschiedlichsten Formaten.'],ing:['Ingest','Daten werden als Stream in Echtzeit oder per Batch / API geladen.'],lake:['Data Layer · Delta Lake','Ein Lake, vier Veredelungsstufen: Raw ▸ Conformed ▸ Enriched ▸ Curated. Stammdaten über MDM, verdichtete Modelle im Modern Data Warehouse.'],
 cat:['Presentation Layer · Semantic Data Catalog','Ontologie (RDF / SHACL): gemeinsame Bedeutung aller Datenprodukte, auffindbar und eindeutig definiert.'],dist:['Distribution','Gesteuerter Zugriff per Query, API oder Data Sharing.'],uc:['Use Cases','Analytics, mobile Apps, klassische Anwendungen und Microservices nutzen dieselbe Datenbasis.'],qs:['Querschnitt','Data Quality, Access Control, Lineage und Standards gelten über alle Schichten.']};
SLIDES.push({lab:'Data-Lake-Architektur',t:'Ein einheitlicher Data Lake ermöglicht <em>„Next Gen“-Reporting</em>',s:'Vom operativen Quellsystem bis zum Use Case in einem gesteuerten Datenfluss',cam:{yaw:-.1,pitch:.1},init:()=>({foc:null}),
 build(B,st){const XS=-6.5,XI=-4.75,XL0=-3.0,XL1=.7,XC=2.6,XD=4.45,XU=6.3,foc=st.foc,dim=k=>foc&&foc!==k?.3:1;
  const sel=k=>()=>{st.foc=st.foc===k?null:k;refresh()};
  const sy=i=>1.55-i*.62,iy=i=>.55-i*1.1,dy=i=>.85-i*.85,uy=i=>1.25-i*.83;
  const sb_=new PB(1400);DLK.src.forEach((_,i)=>sb_.ball(XS,sy(i),0,.11,110));B.g('src',sb_,{col:C.sky,gain:1*dim('src'),size:.026});
  DLK.src.forEach((t,i)=>B.lab('sl'+i,[XS,sy(i)-.18,0],'<span class="d" style="color:#fff">'+t+'</span>',{al:'b'}));
  const ib=new PB(1401);DLK.ing.forEach((_,i)=>{ib.sphere(XI,iy(i),0,.2,320);ib.ring(XI,iy(i),0,.32,160,.006)});B.g('ing',ib,{col:C.mint,gain:1*dim('ing'),size:.026});
  DLK.ing.forEach((t,i)=>B.lab('il'+i,[XI,iy(i)-.38,0],'<span class="t">'+t+'</span>',{al:'b'}));
  DLK.src.forEach((_,i)=>B.path('fs'+i,crv([[XS+.12,sy(i),0],[XI-.8,mix(sy(i),iy(i%2),.6),0],[XI-.2,iy(i%2),0]],10),260,{col:C.sky,speed:.25,spread:.02,size:.02,gain:.8*dim('src')}));
  const lk=new PB(1402);for(let i=0;i<2600;i++){const x=XL0+lk.r()*(XL1-XL0),a=lk.r()*TAU;lk.p(x,Math.cos(a)*.78,Math.sin(a)*.78)}for(const x of[XL0,XL1])lk.ring(x,0,0,.78,220,.004,'yz');
  B.g('lake',lk,{col:C.petrol,gain:.75*dim('lake'),size:.022});
  const SC_=[C.dim,C.petrol,C.sky,C.acc];DLK.stg.forEach((t,i)=>{const x=XL0+.45+i*(XL1-XL0-.9)/3,b=new PB(1410+i);b.disc(x,0,0,.62,420,'yz');b.ring(x,0,0,.66,180,.005,'yz');B.g('st'+i,b,{col:SC_[i],gain:1.1*dim('lake'),size:.022});
   B.lab('stl'+i,[x,.95,0],'<span class="t" style="font-size:max(9px,calc(var(--u)*.68))">'+t+'</span>',{al:'a'})});
  B.lab('ll',[(XL0+XL1)/2,1.38,0],'<span class="k" style="color:#2FC7A5">Data Layer · Delta Lake</span>',{al:'a'});
  B.path('lf',[[XI+.2,iy(0),0],[XL0,0,0],[XL1,0,0],[XC-.55,0,0]],1500,{col:C.acc,speed:.12,spread:.28,size:.022,gain:.9*dim('lake')});
  B.path('lf2',[[XI+.2,iy(1),0],[XL0,0,0]],250,{col:C.mint,speed:.2,spread:.04,size:.02,gain:.8});
  [['mdm','MDM','Master Data Management',XL0+.7],['dwh','MDWH','Modern Data Warehouse',XL1-.6]].forEach((m,i)=>{node(B,m[0],[m[3],-1.55,0],.17,C.blue,{n:300,g:{gain:dim('lake')}});B.ln([m[3],-1.38,0],[m[3],-.78,0],C.petrol,.3);
   B.lab(m[0]+'l',[m[3],-1.85,0],'<span class="t">'+m[1]+'</span><div class="d" style="text-align:center">'+m[2]+'</div>',{al:'b',w:1.6})});
  const ct=new PB(1420),V=[];for(let i=0;i<14;i++){const y=1-2*(i+.5)/14,q=Math.sqrt(1-y*y),t=i*2.39996;V.push([XC+Math.cos(t)*q*.7,y*.7,Math.sin(t)*q*.7])}
  V.forEach(v=>ct.ball(v[0],v[1],v[2],.06,40));for(let i=0;i<14;i++)for(let j=i+1;j<14;j++)if(ln3(sb(V[i],V[j]))<.62)ct.seg(V[i],V[j],22);B.g('cat',ct,{col:C.mint,gain:1.1*dim('cat'),size:.022,stiff:.05});
  B.lab('catl',[XC,1.0,0],'<span class="t">Semantic Data Catalog</span><div class="d" style="text-align:center">Ontologie (RDF / SHACL)</div>',{al:'a',w:2});
  const db=new PB(1430);DLK.dist.forEach((_,i)=>db.ball(XD,dy(i),0,.13,140));B.g('dist',db,{col:C.sky,gain:1*dim('dist'),size:.026});
  DLK.dist.forEach((t,i)=>{B.lab('dl'+i,[XD,dy(i)-.2,0],'<span class="d" style="color:#fff">'+t+'</span>',{al:'b'});B.path('fd'+i,crv([[XC+.7,0,0],[XD-.6,dy(i)*.7,0],[XD-.15,dy(i),0]],10),240,{col:C.mint,speed:.3,spread:.02,size:.02,gain:.85*dim('dist')})});
  const ub=new PB(1440);DLK.uc.forEach((_,i)=>{ub.sphere(XU,uy(i),0,.16,240)});B.g('uc',ub,{col:C.acc,gain:1.1*dim('uc'),size:.026});
  DLK.uc.forEach((t,i)=>B.lab('ul'+i,[XU,uy(i)-.24,0],'<span class="d" style="color:#fff">'+t+'</span>',{al:'b',w:1.7,cls:'c'}));
  for(let i=0;i<3;i++)for(const j of[i,i+1])B.path('fu'+i+j,[[XD+.14,dy(i),0],[XU-.18,uy(j),0]],120,{col:C.acc,speed:.35,spread:.015,size:.02,gain:.8*dim('uc')});
  const qb=new PB(1450);qb.fill(-3.1,-2.55,6.9,.12,1400,0,.2);B.g('qs',qb,{col:C.petrol,gain:.55*dim('qs'),size:.02,jit:.01});
  DLK.qs.forEach((t,i)=>B.lab('ql'+i,[-2.4+i*1.75,-2.75,0],'<span class="t" style="font-size:max(9px,calc(var(--u)*.66))">'+t+'</span>',{al:'b'}));B.lab('qh',[-3.25,-2.5,0],'<span class="k">Querschnitt</span>',{al:'r'});
  const HS=[['src',[XS,0,0],1.4],['ing',[XI,0,0],1.0],['lake',[(XL0+XL1)/2,0,0],1.3],['cat',[XC,0,0],.8],['dist',[XD,0,0],.9],['uc',[XU,0,0],1.0],['qs',[.35,-2.6,0],.6]];
  HS.forEach(h=>B.hot(h[0],h[1],h[2],{grp:[h[0]],click:sel(h[0])}));
  const d=DLD[foc||'lake'];B.cap=foc?{k:'Fokus',t:d[0],s:d[1]}:null;
  B.act=foc?[{t:'Gesamtsicht',f:()=>{st.foc=null;refresh()}}]:[];
  B.note='Eine gesteuerte, skalierbare Datenplattform bündelt alle Quellen und ermöglicht <b>schnellere Erkenntnisse, weniger Komplexität und vertrauenswürdiges Reporting</b> im gesamten Unternehmen.';B.hint='Schicht anklicken für Details'}});

/* ---------- 18 · Single Source of Truth ---------- */
const SRC=['S/4HANA','BW (25+ Modelle)','Azure Data Lakes','Non-SAP-Quellen','Excel'],CON=['SAC','Power BI','Tableau','Excel-Reports'];
SLIDES.push({lab:'Single Source of Truth',t:'Eine Data Fabric schafft die <em>Single Source of Truth</em>',s:'Von Punkt-zu-Punkt-Verbindungen zu einer gesteuerten Integrationsschicht',cam:{yaw:-.2,pitch:.08},init:()=>({m:0}),
 build(B,st){const m=st.m,XS=-4.4,XC=4.7,sy=i=>1.95-i*.66,cy=i=>1.3-i*.87;
  SRC.forEach((s,i)=>{const p=[XS,sy(i),0],b=new PB(1500+i);b.edges(-.28,-.2,-.2,.28,.2,.2,260);b.box(-.28,-.2,-.2,.28,.2,.2,260);B.g('s'+i,b,{pos:p,col:C.sky,gain:.95,size:.024,rot:[.3,.5,0]});
   B.lab('sl'+i,[XS-.45,sy(i),0],'<span class="t2">'+s+'</span>',{al:'r'})});
  CON.forEach((s,i)=>{const p=[XC,cy(i),0];node(B,'c'+i,p,.2,m?C.acc:C.pain,{n:380});B.lab('cl'+i,[XC+.5,cy(i),0],'<span class="t2">'+s+'</span>',{al:'l'})});
  if(!m){const rn=rng(15);let k=0;for(let i=0;i<5;i++)for(let j=0;j<4;j++){const a=[XS+.3,sy(i),0],b=[XC-.3,cy(j),0],c1=[mix(a[0],b[0],.33)+(rn()-.5)*1.5,mix(a[1],b[1],.33)+(rn()-.5)*2.2,(rn()-.5)*3],c2=[mix(a[0],b[0],.66)+(rn()-.5)*1.5,mix(a[1],b[1],.66)+(rn()-.5)*2.2,(rn()-.5)*3];
    B.path('p'+(k++),crv([a,c1,c2,b],10),300,{col:k%3?C.pain:C.sky,speed:.18+rn()*.2,spread:.012,size:.022,gain:1.25,fade:false})}
   B.lab('cn',[.3,-2.25,0],'<div class="big" style="color:#E8609F;text-align:center">20</div><div class="k" style="text-align:center">Punkt-zu-Punkt-Verbindungen</div>',{al:'b'})}
  else{const fb=new PB(1520);for(let r=0;r<=8;r++){const y=-1.9+r*3.8/8;fb.seg([0,y,-1.5],[0,y,1.5],90)}for(let c=0;c<=6;c++){const z=-1.5+c*.5;fb.seg([0,-1.9,z],[0,1.9,z],120)}fb.cloud(0,0,0,.05,.9,.7,900);
   B.g('fab',fb,{col:C.acc,gain:1.0,size:.024,rot:[0,.35,0],spin:[.05,0,0]});
   SRC.forEach((_,i)=>B.path('i'+i,crv([[XS+.3,sy(i),0],[-1.6,sy(i)*.5,0],[-.05,sy(i)*.3,0]],12),420,{col:C.sky,speed:.25,spread:.03,size:.022,gain:.95}));
   CON.forEach((_,j)=>B.path('o'+j,crv([[.05,cy(j)*.3,0],[1.8,cy(j)*.7,0],[XC-.3,cy(j),0]],12),480,{col:C.acc,speed:.25,spread:.03,size:.022,gain:1}));
   B.lab('fl',[0,2.1,0],'<span class="t" style="color:#2FC7A5">Data Fabric</span><div class="d" style="text-align:center">Semantic Layer · Data Catalog · Governance</div>',{al:'a'})}
  B.hot('all',[0,0,0],2.2,{click:()=>{st.m=1-st.m;refresh()}});
  B.act=[{t:'Heute',on:!m,f:()=>{st.m=0;refresh()}},{t:'Zielbild',on:!!m,f:()=>{st.m=1;refresh()}}];
  B.cap=m?{k:'Zielbild',t:'Eine optimale Datenlandschaft ermöglicht',list:['Single Source of Truth über alle Quellen und OpCos','E2E-Transparenz im Daten- & Reporting-Prozess','Konsistente KPIs durch einheitlichen Semantic Layer','Standardisierte Datenmodelle und Reporting-Logik','Integrierte Architektur ohne Parallelsysteme','Self-Service-Datenzugriff für das Controlling']}
   :{k:'Heute',t:'20 Punkt-zu-Punkt-Verbindungen',list:['Keine Single Source of Truth','Hoher Abstimmungsaufwand','Gleiche KPIs, unterschiedliche Ergebnisse','Redundante Verarbeitung & doppeltes Reporting'].map(x=>({h:x,c:'p'}))};
  B.hint='Mitte anklicken: Heute ↔ Zielbild'}});
