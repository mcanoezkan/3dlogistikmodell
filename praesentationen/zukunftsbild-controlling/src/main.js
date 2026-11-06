/* =====================================================================
   9 · ABLAUF, NAVIGATION, BEDIENUNG
   ===================================================================== */
const CHN=['Einführung','Impuls I','Impuls II','Impuls III','Wrap-Up'];
const CHS=[0,7,14,20,25];
const NS=SLIDES.length;
function chOf(i){let c=0;for(let k=0;k<CHS.length;k++)if(i>=CHS[k])c=k;return c}
function setHud(){const S=SLIDES[SID],c=chOf(SID);$('hI').textContent=(S.idx||(String(SID+1).padStart(2,'0')+' / '+NS+' · '+CHN[c]));
 $('pg').textContent=String(SID+1).padStart(2,'0')+' / '+NS;
 [...$('chs').children].forEach((b,i)=>b.classList.toggle('on',i==c));[...$('dots').children].forEach((d,i)=>d.className=(i<SID?'d':i==SID?'on':'')+(CHS.includes(i)&&i?' g':''));
 [...document.querySelectorAll('#ov .it')].forEach((e,i)=>e.classList.toggle('on',i==SID))}
function goTo(i){i=cl(i|0,0,NS-1);if(i===SID)return;const first=SID<0;if(SC&&SC.leave)SC.leave(STATE[SID]);SID=i;SC=SLIDES[i];if(!STATE[i])STATE[i]=SC.init?SC.init():{};
 HOV=null;document.body.classList.remove('hot');const cm=Object.assign({x:0,y:0,z:0,yaw:0,pitch:0,d:1,sway:.035},SC.cam||{});CAM.tT=[cm.x,cm.y,cm.z];CAM.yawT=cm.yaw;CAM.pitchT=cm.pitch;CAM.dT=cm.d;CAM.sway=cm.sway;CAM.uy=0;CAM.up=0;CAM.ud=1;
 if(first){CAM.t=CAM.tT.slice();CAM.yaw=cm.yaw;CAM.pitch=cm.pitch;CAM.d=cm.d*1.6}
 ENTER=T;LFADE=0;build();burst(first?0:.16);setHud();try{localStorage.setItem('zbc-cur',String(i))}catch(e){}closeOv()}
function nav(d){goTo(SID+d)}
/* ---------- Steuerleiste ---------- */
CHN.forEach((c,i)=>{const b=document.createElement('button');b.className='cb';b.type='button';b.textContent=String(i+1).padStart(2,'0')+' '+c;b.onclick=e=>{e.target.blur();goTo(CHS[i])};$('chs').appendChild(b)});
SLIDES.forEach((s,i)=>{const d=document.createElement('i');d.title=String(i+1).padStart(2,'0')+' '+s.lab;d.onclick=()=>goTo(i);$('dots').appendChild(d)});
{const g=$('ovg');CHN.forEach((c,ci)=>{const col=document.createElement('div');col.className='ch';col.innerHTML='<div class="h">'+String(ci+1).padStart(2,'0')+' · '+c+'</div>';const en=ci<4?CHS[ci+1]:NS;
 for(let k=CHS[ci];k<en;k++){const it=document.createElement('div');it.className='it';it.innerHTML='<b>'+String(k+1).padStart(2,'0')+'</b><span>'+SLIDES[k].lab+'</span>';it.onclick=()=>goTo(k);col.appendChild(it)}g.appendChild(col)})}
function toggleOv(){$('ov').classList.toggle('on')}function closeOv(){$('ov').classList.remove('on')}
function full(){try{const d=document,e=d.documentElement;if(d.fullscreenElement)d.exitFullscreen();else if(e.requestFullscreen){const p=e.requestFullscreen();if(p&&p.catch)p.catch(()=>{})}}catch(x){}}
$('pv').onclick=e=>{e.target.blur();nav(-1)};$('nx').onclick=e=>{e.target.blur();nav(1)};$('ovb').onclick=e=>{e.target.blur();toggleOv()};$('ovx').onclick=closeOv;$('fs').onclick=e=>{e.target.blur();full()};
addEventListener('keydown',e=>{const tg=e.target&&e.target.tagName;if(tg=='INPUT'||tg=='TEXTAREA')return;
 if(e.key=='ArrowRight'||e.key=='PageDown'||e.key==' '){e.preventDefault();nav(1)}else if(e.key=='ArrowLeft'||e.key=='PageUp'){e.preventDefault();nav(-1)}
 else if(e.key=='Home')goTo(0);else if(e.key=='End')goTo(NS-1);else if(e.key=='o'||e.key=='O')toggleOv();else if(e.key=='Escape')closeOv();else if(e.key=='f'||e.key=='F')full();
 else if(e.key>='1'&&e.key<='5')goTo(CHS[+e.key-1])});
/* ---------- Zeiger: Hover, Klick, Ziehen ---------- */
let PD=null,actT=0;
function showAct(){document.body.classList.add('act');clearTimeout(actT);actT=setTimeout(()=>document.body.classList.remove('act'),2600)}
glc.addEventListener('pointermove',e=>{MX=e.clientX;MY=e.clientY;MACT=1;showAct();
 if(PD){const dx=e.clientX-PD.x,dy=e.clientY-PD.y;if(Math.hypot(dx,dy)>5)PD.moved=true;
  if(PD.h&&PD.h.drag){const w=resolve(PD.h.pos)||[0,0,0],q=rayPlane(e.clientX,e.clientY,w[2]);if(q)PD.h.drag(q)}
  else if(PD.moved){CAM.uy=cl(PD.uy-dx/CW*2.2,-1.1,1.1);CAM.up=cl(PD.up+dy/CH*1.4,-.5,.6);document.body.classList.add('drag')}return}
 const h=hitTest(e.clientX,e.clientY);setHover(h?h.key:null)});
glc.addEventListener('pointerdown',e=>{glc.setPointerCapture&&glc.setPointerCapture(e.pointerId);const h=hitTest(e.clientX,e.clientY);PD={x:e.clientX,y:e.clientY,h,moved:false,uy:CAM.uy,up:CAM.up};
 if(h&&h.drag){const w=resolve(h.pos)||[0,0,0],q=rayPlane(e.clientX,e.clientY,w[2]);if(q)h.drag(q)}});
glc.addEventListener('pointerup',e=>{document.body.classList.remove('drag');if(PD&&!PD.moved&&PD.h&&PD.h.click)PD.h.click();PD=null});
glc.addEventListener('pointerleave',()=>{MACT=0;MX=MY=-1e4;setHover(null)});
glc.addEventListener('wheel',e=>{e.preventDefault();CAM.ud=cl(CAM.ud*(1+Math.sign(e.deltaY)*.08),.55,1.6)},{passive:false});
glc.addEventListener('dblclick',()=>{CAM.uy=0;CAM.up=0;CAM.ud=1});
/* ---------- Hauptschleife ---------- */
let last=0,FT=[];
function adapt(ms){FT.push(ms);if(FT.length<50)return;const a=FT.reduce((x,y)=>x+y)/FT.length;FT=[];if(a>40&&RES>.55){RES=Math.max(.55,RES-.15);resize()}else if(a<19&&RES<1){RES=Math.min(1,RES+.15);resize()}}
function frame(now){const dt=last?Math.min(.05,(now-last)/1000):.016;if(last)adapt(now-last);last=now;T+=dt;
 MACT=Math.max(0,MACT-dt*.35);LFADE=Math.min(1,LFADE+dt*.8);
 camUpdate(dt);nL=0;if(DYN)DYN(T,dt,STATE[SID]);const lf=ss(.15,1,LFADE);for(const s of SL_){const a=resolve(s[0]),b=resolve(s[1]);if(a&&b)L(a,b,s[2],s[3]*lf)}
 step(dt);render();frameLabels();requestAnimationFrame(frame)}
window.addEventListener('error',e=>{$('err').textContent+=(e.message||e.type)+' '+(e.lineno||'')+'\n'});
if(!gl){$('hT').textContent='WebGL ist nicht verfügbar – bitte aktuelles Edge oder Chrome verwenden.'}
else{initGL();addEventListener('resize',resize);resize();
 let st0=0;try{const v=parseInt(new URLSearchParams(location.search).get('s')||localStorage.getItem('zbc-cur'),10);if(v>=0&&v<NS)st0=v}catch(e){}
 if(location.hash&&/^#\d+$/.test(location.hash))st0=cl(+location.hash.slice(1)-1,0,NS-1);
 goTo(st0);requestAnimationFrame(frame)}
