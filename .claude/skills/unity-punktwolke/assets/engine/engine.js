"use strict";
/* =====================================================================
   1 · GRUNDLAGEN
   ===================================================================== */
const $=id=>document.getElementById(id);
const PI=Math.PI,TAU=PI*2;
const cl=(x,a,b)=>x<a?a:x>b?b:x,mix=(a,b,k)=>a+(b-a)*k,ss=(a,b,t)=>{const k=cl((t-a)/(b-a),0,1);return k*k*(3-2*k)},fr=x=>x-Math.floor(x);
const ad=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sb=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],ml=(a,k)=>[a[0]*k,a[1]*k,a[2]*k],
 dt=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],ln3=a=>Math.hypot(a[0],a[1],a[2]),nm=a=>{const l=ln3(a)||1;return[a[0]/l,a[1]/l,a[2]/l]},lp=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
function rng(seed){let s=(seed>>>0)||1;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hsh(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const hex=h=>Array.isArray(h)?h:[parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255];
const RT=new Float32Array(8*65536);{const r=rng(99);for(let i=0;i<RT.length;i++)RT[i]=r()}
const rr=(l,k)=>RT[(k<<16)|(l&65535)];
/* Farben (für additive Lichtpunkte auf Dunkelblau aufgehellt) */
const C={w:'#EAF4FA',lg:'#C9D6E2',bg:'#9FB2C6',blue:'#3D78C2',petrol:'#3A8DB4',sky:'#7CC4E4',green:'#1DB48E',acc:'#2FC7A5',mint:'#9BF0D8',pain:'#E8609F',red:'#FF4060',yel:'#FFC83D',dim:'#2E5A82',ice:'#BFE6F7'};
const AMPC={1:C.red,2:C.yel,3:C.green,4:C.acc};

/* =====================================================================
   2 · PUNKT-BAUKASTEN (lokale Koordinaten, Welt ≈ Folie 16 × 9 Einheiten)
   ===================================================================== */
const TXC={};const FONT='"Futura PT",Futura,"Century Gothic",Arial,sans-serif';
function textPix(str,wt,fam){fam=fam||FONT;const k=str+'|'+(wt||700)+fam;if(TXC[k])return TXC[k];const H=150,c=document.createElement('canvas'),g=c.getContext('2d');
 g.font=(wt||700)+' '+H+'px '+fam;const L=str.split('\n');let w=0;for(const l of L)w=Math.max(w,g.measureText(l).width);
 c.width=Math.ceil(w+24);c.height=Math.ceil(H*1.12*L.length+24);g.font=(wt||700)+' '+H+'px '+fam;g.fillStyle='#fff';g.textBaseline='middle';g.textAlign='center';
 L.forEach((l,i)=>g.fillText(l,c.width/2,12+H*1.12*(i+.5)));const d=g.getImageData(0,0,c.width,c.height).data,pts=[];
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>150)pts.push((x-c.width/2)/H,-(y-c.height/2)/H);
 return TXC[k]={pts,w:c.width/H,h:c.height/H}}
class PB{constructor(seed){this.a=[];this.r=rng(seed||7)}
 p(x,y,z){this.a.push(x,y,z);return this}
 get n(){return this.a.length/3}
 gs(){let u=0;while(!u)u=this.r();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*this.r())}
 sphere(cx,cy,cz,r,n){for(let i=0;i<n;i++){const y=1-2*(i+.5)/n,q=Math.sqrt(1-y*y),t=i*2.39996323;this.p(cx+Math.cos(t)*q*r,cy+y*r,cz+Math.sin(t)*q*r)}return this}
 ball(cx,cy,cz,r,n){for(let i=0;i<n;i++){const y=1-2*this.r(),q=Math.sqrt(1-y*y),t=TAU*this.r(),k=Math.cbrt(this.r())*r;this.p(cx+Math.cos(t)*q*k,cy+y*k,cz+Math.sin(t)*q*k)}return this}
 cloud(cx,cy,cz,sx,sy,sz,n){for(let i=0;i<n;i++)this.p(cx+this.gs()*sx,cy+this.gs()*sy,cz+this.gs()*sz);return this}
 /* Ring: pl 'xy' (zur Kamera) | 'xz' (liegend) | 'yz'; th = Banddicke */
 ring(cx,cy,cz,r,n,th,pl,a0,a1){th=th||0;pl=pl||'xy';a0=a0===undefined?0:a0;a1=a1===undefined?TAU:a1;
  for(let i=0;i<n;i++){const a=a0+(a1-a0)*(i+.5)/n,rr_=r+(th?this.gs()*th:0),c=Math.cos(a)*rr_,s=Math.sin(a)*rr_,e=th?this.gs()*th*.6:0;
   if(pl=='xy')this.p(cx+c,cy+s,cz+e);else if(pl=='xz')this.p(cx+c,cy+e,cz+s);else this.p(cx+e,cy+c,cz+s)}return this}
 disc(cx,cy,cz,r,n,pl){pl=pl||'xy';for(let i=0;i<n;i++){const k=Math.sqrt((i+.5)/n)*r,a=i*2.39996323,c=Math.cos(a)*k,s=Math.sin(a)*k;if(pl=='xy')this.p(cx+c,cy+s,cz);else if(pl=='xz')this.p(cx+c,cy,cz+s);else this.p(cx,cy+c,cz+s)}return this}
 seg(a,b,n,j){j=j||0;for(let i=0;i<n;i++){const t=n>1?i/(n-1):.5;this.p(a[0]+(b[0]-a[0])*t+(j?this.gs()*j:0),a[1]+(b[1]-a[1])*t+(j?this.gs()*j:0),a[2]+(b[2]-a[2])*t+(j?this.gs()*j:0))}return this}
 rect(x,y,w,h,n,z,j){z=z||0;const P=2*(w+h);for(let i=0;i<n;i++){let u=(i+.5)/n*P,px,py;if(u<w){px=x+u;py=y}else if(u<w+h){px=x+w;py=y+u-w}else if(u<2*w+h){px=x+w-(u-w-h);py=y+h}else{px=x;py=y+h-(u-2*w-h)}this.p(px+(j?this.gs()*j:0),py+(j?this.gs()*j:0),z)}return this}
 fill(x,y,w,h,n,z,dz){z=z||0;for(let i=0;i<n;i++)this.p(x+this.r()*w,y+this.r()*h,z+(dz?(this.r()-.5)*dz:0));return this}
 box(x0,y0,z0,x1,y1,z1,n){const dx=x1-x0,dy=y1-y0,dz=z1-z0,A=[dx*dy,dx*dy,dx*dz,dx*dz,dy*dz,dy*dz],S=A.reduce((a,b)=>a+b,0);
  for(let i=0;i<n;i++){let u=this.r()*S,f=0;while(f<5&&u>A[f]){u-=A[f];f++}const a=this.r(),b=this.r();
   if(f<2)this.p(x0+dx*a,y0+dy*b,f?z1:z0);else if(f<4)this.p(x0+dx*a,f==3?y1:y0,z0+dz*b);else this.p(f==5?x1:x0,y0+dy*a,z0+dz*b)}return this}
 edges(x0,y0,z0,x1,y1,z1,n){const E=[];for(const y of[y0,y1])for(const z of[z0,z1])E.push([[x0,y,z],[x1,y,z]]);for(const x of[x0,x1])for(const z of[z0,z1])E.push([[x,y0,z],[x,y1,z]]);for(const x of[x0,x1])for(const y of[y0,y1])E.push([[x,y,z0],[x,y,z1]]);
  const L=E.map(e=>ln3(sb(e[1],e[0]))),S=L.reduce((a,b)=>a+b,0);for(let i=0;i<n;i++){let u=(i+.5)/n*S,k=0;while(k<11&&u>L[k]){u-=L[k];k++}const q=lp(E[k][0],E[k][1],u/L[k]);this.p(q[0],q[1],q[2])}return this}
 text(str,cx,cy,h,n,cz,dz,wt,fam){const T=textPix(str,wt,fam),P=T.pts,m=P.length/2;if(!m)return this;const jj=h/150;for(let i=0;i<n;i++){const k=(this.r()*m|0)*2;this.p(cx+P[k]*h+(this.r()-.5)*jj,cy+P[k+1]*h+(this.r()-.5)*jj,(cz||0)+(dz?this.gs()*dz:0))}return this}
 curve(pts,n,j){const P=rs(pts,256,false);for(let i=0;i<n;i++){const q=at(P,(i+.5)/n);this.p(q[0]+(j?this.gs()*j:0),q[1]+(j?this.gs()*j:0),q[2]+(j?this.gs()*j:0))}return this}
 f(){return new Float32Array(this.a)}}
/* Polylinie gleichmäßig neu abtasten → Float32Array K×3 */
function rs(pts,K,closed){const P=closed?pts.concat([pts[0]]):pts,L=[0];for(let i=1;i<P.length;i++)L.push(L[i-1]+ln3(sb(P[i],P[i-1])));const T=L[L.length-1]||1,o=new Float32Array(K*3);let j=0;
 for(let k=0;k<K;k++){const u=k/(K-1)*T;while(j<P.length-2&&L[j+1]<u)j++;const s=(u-L[j])/((L[j+1]-L[j])||1),q=lp(P[j],P[j+1]||P[j],cl(s,0,1));o[k*3]=q[0];o[k*3+1]=q[1];o[k*3+2]=q[2]}return o}
function at(R,u){const K=R.length/3,f=cl(u,0,1)*(K-1),i=Math.min(K-2,f|0),s=f-i,k=i*3;return[R[k]+(R[k+3]-R[k])*s,R[k+1]+(R[k+4]-R[k+1])*s,R[k+2]+(R[k+5]-R[k+2])*s]}
/* Catmull-Rom-Kurve durch Stützpunkte */
function crv(P,seg){seg=seg||24;const o=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];
 for(let s=0;s<seg;s++){const t=s/seg,t2=t*t,t3=t2*t;o.push([0,1,2].map(k=>.5*(2*p1[k]+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3)))}}o.push(P[P.length-1]);return o}
/* Bogen zwischen zwei Punkten mit Höhe h (Richtung up) */
function arc(a,b,h,up,n){n=n||24;up=up||[0,1,0];const o=[];for(let i=0;i<=n;i++){const t=i/n,q=lp(a,b,t),k=Math.sin(PI*t)*h;o.push([q[0]+up[0]*k,q[1]+up[1]*k,q[2]+up[2]*k])}return o}
/* Menschliche Figur aus Punkten (Höhe ≈ 3.1, Fußpunkt y=0) */
function figure(b,cx,cy,cz,s,n){const parts=[[0,2.72,0,.27,.27,.29,.15],[0,1.95,0,.42,.62,.24,.32],[0,2.42,0,.1,.12,.1,.02],[-.6,1.62,0,.1,.5,.11,.08],[.6,1.62,0,.1,.5,.11,.08],[-.2,.66,0,.13,.66,.14,.14],[.2,.66,0,.13,.66,.14,.14],[0,1.28,0,.38,.16,.22,.06]];
 const W=parts.map(p=>p[6]),S=W.reduce((a,c)=>a+c,0);
 for(let i=0;i<n;i++){let u=b.r()*S,k=0;while(k<parts.length-1&&u>W[k]){u-=W[k];k++}const p=parts[k],y=1-2*b.r(),q=Math.sqrt(1-y*y),t=TAU*b.r();
  let x=Math.cos(t)*q*p[3],yy=y*p[4],z=Math.sin(t)*q*p[5];if(k==1){const taper=.82+.18*(yy/p[4]);x*=taper}if(k==3||k==4){x+=(k==3?1:-1)*yy*.16}
  b.p(cx+(p[0]+x)*s,cy+(p[1]+yy)*s,cz+(p[2]+z)*s)}return b}

/* =====================================================================
   3 · PARTIKELSYSTEM
   ===================================================================== */
const NP=46000;
const PX=new Float32Array(NP*3),PV=new Float32Array(NP*3),PCL=new Float32Array(NP*3),PSZ=new Float32Array(NP),SD=new Float32Array(NP),PH=new Float32Array(NP),OF=new Float32Array(NP*3),DH=new Float32Array(NP*3);
const PG=new Uint16Array(NP),PL=new Int32Array(NP),PERM=new Uint32Array(NP),VB=new Float32Array(NP*7);
{const r=rng(1234);for(let i=0;i<NP;i++){SD[i]=r();PH[i]=r();const gx=r()*2-1,gy=r()*2-1,gz=r()*2-1,l=Math.hypot(gx,gy,gz)||1,k=Math.pow(r(),.6);OF[i*3]=gx/l*k;OF[i*3+1]=gy/l*k;OF[i*3+2]=gz/l*k;
 DH[i*3]=(r()*2-1)*15;DH[i*3+1]=(r()*2-1)*8.5;DH[i*3+2]=-13+r()*16;PX[i*3]=DH[i*3];PX[i*3+1]=DH[i*3+1];PX[i*3+2]=DH[i*3+2];PERM[i]=i}
 for(let i=NP-1;i>0;i--){const j=r()*(i+1)|0,t=PERM[i];PERM[i]=PERM[j];PERM[j]=t}}
function mkRG(spec){const g=Object.assign({kind:'pts',col:C.sky,gain:1,size:.034,pos:[0,0,0],rot:[0,0,0],spin:[0,0,0],scale:1,lo:[0,0,0],jit:0,jf:1,stiff:.055,tw:.22,speed:.06,spread:.04,fade:true,pc:null,pm:null,closed:false},spec);
 g.c=hex(g.col);g.cc=g.c.slice();g.gainC=g.gain;g.posC=g.pos.slice();g.rotC=g.rot.slice();g.acc=[0,0,0];g.scaleC=g.scale;g.loC=g.lo.slice();g.jitC=g.jit;g.hov=0;g.hovT=0;g.m=[1,0,0,0,1,0,0,0,1];
 if(g.kind=='path'){g.R=rs(g.path,256,g.closed)}return g}
const DUST=mkRG({key:'~dust',kind:'dust',col:C.petrol,gain:.2,size:.024,stiff:.02});
let GR=[DUST],GMAP=new Map();
/* Gruppen zuweisen: gleiche Schlüssel behalten ihre Partikel (fließender Übergang), Rest wird neu gemischt */
function applyGroups(list){const maxUse=NP-5000;let tot=0;for(const s of list)tot+=s.n;const f=tot>maxUse?maxUse/tot:1;
 const ng=[DUST],nmap=new Map(),used=new Uint8Array(NP),need=[];
 list.forEach(s=>{const n=Math.max(0,Math.floor(s.n*f));const old=GMAP.get(s.key);const g=mkRG(s);g.n=n;g.ratio=(s.n0||s.n)/Math.max(1,n);
  if(old){g.gainC=old.gainC;g.posC=old.posC;g.rotC=old.rotC;g.acc=old.acc;g.scaleC=old.scaleC;g.loC=old.loC;g.jitC=old.jitC;g.hov=old.hov;g.cc=old.cc}
  g.idx=new Int32Array(n);let k=0;if(old&&old.idx){for(let j=0;j<old.idx.length&&k<n;j++){const i=old.idx[j];if(!used[i]){used[i]=1;g.idx[k++]=i}}}g.fill=k;need.push(g);ng.push(g);nmap.set(s.key,g)});
 let p=0;for(const g of need){while(g.fill<g.idx.length&&p<NP){const i=PERM[p++];if(!used[i]){used[i]=1;g.idx[g.fill++]=i}}}
 PG.fill(0);for(let i=0;i<NP;i++)PL[i]=i;ng.forEach((g,gi)=>{if(!gi)return;for(let l=0;l<g.idx.length;l++){const i=g.idx[l];PG[i]=gi;PL[i]=l}});
 GR=ng;GMAP=nmap}
function burst(k){for(let i=0;i<NP;i++){PV[i*3]+=(SD[i]-.5)*k;PV[i*3+1]+=(PH[i]-.5)*k;PV[i*3+2]+=(fr(SD[i]*7.3)-.5)*k}}
/* Gruppen-Transform: lokale Verschiebung → Ry(Drehung) → Rx(Neigung) → Rz → Skalierung → Position */
function grMat(g){const ry=g.rotC[1]+g.acc[1],rx=g.rotC[0]+g.acc[0],rz=g.rotC[2]+g.acc[2],cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx),cz=Math.cos(rz),sz=Math.sin(rz);
 const A=[cy,0,sy,0,1,0,-sy,0,cy],B=[1,0,0,0,cx,-sx,0,sx,cx],Z=[cz,-sz,0,sz,cz,0,0,0,1],m3=(P,Q)=>{const o=new Array(9);for(let r=0;r<3;r++)for(let c=0;c<3;c++)o[r*3+c]=P[r*3]*Q[c]+P[r*3+1]*Q[3+c]+P[r*3+2]*Q[6+c];return o};g.m=m3(Z,m3(B,A))}
function toW(key,p){const g=typeof key=='string'?GMAP.get(key):key;if(!g)return p;const m=g.m,s=g.scaleC,x=p[0]+g.loC[0],y=p[1]+g.loC[1],z=p[2]+g.loC[2];return[g.posC[0]+s*(m[0]*x+m[1]*y+m[2]*z),g.posC[1]+s*(m[3]*x+m[4]*y+m[5]*z),g.posC[2]+s*(m[6]*x+m[7]*y+m[8]*z)]}
const VV=new Float64Array(3);
let T=0,MX=-1e4,MY=-1e4,MACT=0;
function step(dt){const k60=Math.min(2.5,dt*60),damp=Math.pow(.84,k60),lc=1-Math.pow(.9,k60),sm=1-Math.pow(.94,k60);
 for(const g of GR){g.gainC+=(g.gain-g.gainC)*sm;g.scaleC+=(g.scale-g.scaleC)*sm;g.jitC+=(g.jit-g.jitC)*sm;g.hov+=(g.hovT-g.hov)*sm*1.6;
  for(let k=0;k<3;k++){g.posC[k]+=(g.pos[k]-g.posC[k])*sm;g.rotC[k]+=(g.rot[k]-g.rotC[k])*sm;g.loC[k]+=(g.lo[k]-g.loC[k])*sm;g.acc[k]+=g.spin[k]*dt;g.cc[k]+=(g.c[k]-g.cc[k])*sm}grMat(g)}
 const proj=MACT>0;let cx=0,cy=0,cz=0,Fx=0,Fy=0,Fz=0,Rx=0,Ry=0,Rz=0,Ux=0,Uy=0,Uz=0,Fo=0,hw=0,hh=0;
 if(proj){cx=CAMP[0];cy=CAMP[1];cz=CAMP[2];Fx=CF[0];Fy=CF[1];Fz=CF[2];Rx=CR[0];Ry=CR[1];Rz=CR[2];Ux=CU[0];Uy=CU[1];Uz=CU[2];Fo=FOC;hw=CW/2;hh=CH/2}
 const RAD=Math.max(60,CH*.08),RAD2=RAD*RAD;
 for(let i=0;i<NP;i++){const g=GR[PG[i]],l=PL[i],i3=i*3;let x,y,z,b=g.gainC*(1+g.hov*.75);
  if(g.kind=='pts'){const k=(g.ratio===1?l:Math.floor(l*g.ratio))*3,P=g.pts;x=P[k];y=P[k+1];z=P[k+2]}
  else if(g.kind=='path'){const sp=g.speed*(.82+.36*rr(l,1));let u=l/g.n+T*sp;u-=Math.floor(u);const R=g.R,f=u*255,j=Math.min(254,f|0),s=f-j,q=j*3;
   const w=g.spread*(.4+.6*rr(l,2));x=R[q]+(R[q+3]-R[q])*s+OF[i3]*w;y=R[q+1]+(R[q+4]-R[q+1])*s+OF[i3+1]*w;z=R[q+2]+(R[q+5]-R[q+2])*s+OF[i3+2]*w;
   if(g.fade&&!g.closed)b*=ss(0,.07,u)*(1-ss(.9,1,u))}
  else{x=DH[i3]+Math.sin(T*.07+PH[i]*TAU)*.6;y=DH[i3+1]+Math.sin(T*.05+SD[i]*TAU)*.4;z=DH[i3+2]}
  if(g.pm){VV[0]=x;VV[1]=y;VV[2]=z;const r=g.pm(l,VV,T,g);x=VV[0];y=VV[1];z=VV[2];if(r!==undefined)b*=r}
  if(g.jitC>.002){const j=g.jitC,f=g.jf;x+=j*Math.sin(T*f*2.1+PH[i]*40);y+=j*Math.sin(T*f*1.7+SD[i]*40);z+=j*Math.sin(T*f*1.3+PH[i]*23)}
  const m=g.m,s=g.scaleC;x+=g.loC[0];y+=g.loC[1];z+=g.loC[2];
  const tx=g.posC[0]+s*(m[0]*x+m[1]*y+m[2]*z),ty=g.posC[1]+s*(m[3]*x+m[4]*y+m[5]*z),tz=g.posC[2]+s*(m[6]*x+m[7]*y+m[8]*z);
  const kk=g.stiff*(.55+.9*SD[i])*k60;let vx=(PV[i3]+(tx-PX[i3])*kk)*damp,vy=(PV[i3+1]+(ty-PX[i3+1])*kk)*damp,vz=(PV[i3+2]+(tz-PX[i3+2])*kk)*damp;
  if(proj){const dx=PX[i3]-cx,dy=PX[i3+1]-cy,dz=PX[i3+2]-cz,zz=dx*Fx+dy*Fy+dz*Fz;if(zz>.3){const sx=hw+(dx*Rx+dy*Ry+dz*Rz)/zz*Fo,sy=hh-(dx*Ux+dy*Uy+dz*Uz)/zz*Fo,ex=sx-MX,ey=sy-MY,d2=ex*ex+ey*ey;
    if(d2<RAD2){const d=Math.sqrt(d2)+1,f=(1-d/RAD)*.045*MACT*zz/Fo*RAD*k60*.5/d;vx+=(Rx*ex-Ux*ey)*f;vy+=(Ry*ex-Uy*ey)*f;vz+=(Rz*ex-Uz*ey)*f;b*=1+.6*(1-d/RAD)}}}
  PV[i3]=vx;PV[i3+1]=vy;PV[i3+2]=vz;PX[i3]+=vx;PX[i3+1]+=vy;PX[i3+2]+=vz;
  if(g.pc)b*=g.pc(l,T,g);
  b*=1+g.tw*Math.sin(T*(1.3+PH[i]*2.2)+SD[i]*60);
  const c=g.cc;PCL[i3]+=(c[0]*b-PCL[i3])*lc;PCL[i3+1]+=(c[1]*b-PCL[i3+1])*lc;PCL[i3+2]+=(c[2]*b-PCL[i3+2])*lc;
  const st=g.size*(.55+.9*fr(SD[i]*13.7))*(1+g.hov*.25);PSZ[i]+=(st-PSZ[i])*lc;
  const o=i*7;VB[o]=PX[i3];VB[o+1]=PX[i3+1];VB[o+2]=PX[i3+2];VB[o+3]=PCL[i3];VB[o+4]=PCL[i3+1];VB[o+5]=PCL[i3+2];VB[o+6]=PSZ[i]}
}

/* =====================================================================
   4 · KAMERA
   ===================================================================== */
let CAMP=[0,0,12],CF=[0,0,-1],CR=[1,0,0],CU=[0,1,0],FOC=800,CW=2,CH=2,FOV=40*PI/180;
const CAM={t:[0,0,0],yaw:0,pitch:0,d:1,tT:[0,0,0],yawT:0,pitchT:0,dT:1,uy:0,up:0,ud:1,sway:.035};
function camUpdate(dt){const sm=1-Math.pow(.955,dt*60);for(let k=0;k<3;k++)CAM.t[k]+=(CAM.tT[k]-CAM.t[k])*sm;CAM.yaw+=(CAM.yawT-CAM.yaw)*sm;CAM.pitch+=(CAM.pitchT-CAM.pitch)*sm;CAM.d+=(CAM.dT*CAM.ud-CAM.d)*sm;
 const asp=CW/CH,halfH=asp>=16/9?4.5:8/asp,D0=halfH/Math.tan(FOV/2)*CAM.d;
 const mxn=MX>-1e3?(MX/CW-.5):0,myn=MY>-1e3?(MY/CH-.5):0;
 const yaw=CAM.yaw+CAM.uy+Math.sin(T*.11)*CAM.sway+mxn*.05,pitch=CAM.pitch+CAM.up+Math.sin(T*.083)*CAM.sway*.45-myn*.03;
 CAMP=[CAM.t[0]+D0*Math.sin(yaw)*Math.cos(pitch),CAM.t[1]+D0*Math.sin(pitch),CAM.t[2]+D0*Math.cos(yaw)*Math.cos(pitch)];
 CF=nm(sb(CAM.t,CAMP));CR=nm(cr(CF,[0,1,0]));CU=cr(CR,CF);FOC=(CH/2)/Math.tan(FOV/2)}
function pj(p){const d=sb(p,CAMP),z=dt(d,CF);if(z<.2)return null;return[CW/2+dt(d,CR)/z*FOC,CH/2-dt(d,CU)/z*FOC,z]}
function rayPlane(mx,my,z0){const dir=nm(ad(ad(CF,ml(CR,(mx-CW/2)/FOC)),ml(CU,-(my-CH/2)/FOC)));if(Math.abs(dir[2])<1e-4)return null;const t=(z0-CAMP[2])/dir[2];return ad(CAMP,ml(dir,t))}

/* =====================================================================
   5 · WEBGL-RENDERER (weiche Lichtpunkte, Linien, Glow)
   ===================================================================== */
const glc=$('c');const gl=glc.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,depth:false});
const VS_PT=`precision highp float;attribute vec3 aP;attribute vec3 aC;attribute float aS;uniform mat4 uVP;uniform float uF,uPx;varying vec3 vC;
void main(){vec4 cp=uVP*vec4(aP,1.0);float z=cp.w;if(z<.15){gl_Position=vec4(2.,2.,2.,1.);gl_PointSize=0.;vC=vec3(0.);return;}
 float sz=aS*uF/z,a=1.0;float mn=1.35*uPx;if(sz<mn){a=sz/mn;sz=mn;}float mx=11.0*uPx;if(sz>mx){a*=mx/sz;sz=mx;}
 float fog=clamp(1.25-z/34.0,.25,1.0);gl_PointSize=sz;vC=aC*a*fog;gl_Position=cp;}`;
const FS_PT=`precision mediump float;varying vec3 vC;void main(){vec2 d=gl_PointCoord-.5;float r=dot(d,d)*4.0;if(r>1.0)discard;gl_FragColor=vec4(vC*exp(-r*2.4),0.0);}`;
const VS_LN=`precision highp float;attribute vec3 aP;attribute vec3 aC;uniform mat4 uVP;varying vec3 vC;void main(){vec4 cp=uVP*vec4(aP,1.0);vC=aC*clamp(1.25-cp.w/34.0,.25,1.0);gl_Position=cp;}`;
const FS_LN=`precision mediump float;varying vec3 vC;void main(){gl_FragColor=vec4(vC,0.0);}`;
const VS_F=`attribute vec2 aP;varying vec2 vT;void main(){vT=aP*.5+.5;gl_Position=vec4(aP,0.0,1.0);}`;
const FS_BR=`precision mediump float;uniform sampler2D uT;uniform vec2 uTx;varying vec2 vT;void main(){vec3 c=(texture2D(uT,vT+uTx*vec2(-1.,-1.)).rgb+texture2D(uT,vT+uTx*vec2(1.,-1.)).rgb+texture2D(uT,vT+uTx*vec2(-1.,1.)).rgb+texture2D(uT,vT+uTx*vec2(1.,1.)).rgb)*.25;gl_FragColor=vec4(max(c-.12,0.0)*1.3,1.0);}`;
const FS_BL=`precision mediump float;uniform sampler2D uT;uniform vec2 uD;varying vec2 vT;void main(){vec3 c=texture2D(uT,vT).rgb*.227;c+=(texture2D(uT,vT+uD*1.3846).rgb+texture2D(uT,vT-uD*1.3846).rgb)*.3162;c+=(texture2D(uT,vT+uD*3.2308).rgb+texture2D(uT,vT-uD*3.2308).rgb)*.0703;gl_FragColor=vec4(c,1.0);}`;
const FS_CO=`precision mediump float;uniform sampler2D uA,uB;uniform float uBl;varying vec2 vT;void main(){vec3 a=texture2D(uA,vT).rgb;vec3 b=texture2D(uB,vT).rgb;vec3 c=a+b*uBl;c=c/(1.0+max(max(c.r,c.g),c.b)*.12);gl_FragColor=vec4(c,clamp(max(max(c.r,c.g),c.b)*1.4,0.0,1.0));}`;
function gsh(tp,src){const x=gl.createShader(tp);gl.shaderSource(x,src);gl.compileShader(x);if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(x));return x}
function gpr(vs,fs,at){const p=gl.createProgram();gl.attachShader(p,gsh(gl.VERTEX_SHADER,vs));gl.attachShader(p,gsh(gl.FRAGMENT_SHADER,fs));at.forEach((a,i)=>gl.bindAttribLocation(p,i,a));gl.linkProgram(p);
 if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));const u={};const n=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<n;i++){const f=gl.getActiveUniform(p,i);u[f.name]=gl.getUniformLocation(p,f.name)}return{p,u}}
let PP,PLN,PBR,PBL,PCO,bV,bL,bF,FA,FB,FC,RES=1;const MAXL=24000,LB=new Float32Array(MAXL*12);let nL=0;
function initGL(){PP=gpr(VS_PT,FS_PT,['aP','aC','aS']);PLN=gpr(VS_LN,FS_LN,['aP','aC']);PBR=gpr(VS_F,FS_BR,['aP']);PBL=gpr(VS_F,FS_BL,['aP']);PCO=gpr(VS_F,FS_CO,['aP']);
 bV=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bV);gl.bufferData(gl.ARRAY_BUFFER,VB.byteLength,gl.DYNAMIC_DRAW);
 bL=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bL);gl.bufferData(gl.ARRAY_BUFFER,LB.byteLength,gl.DYNAMIC_DRAW);
 bF=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bF);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)}
const texP=()=>{[gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR));[gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T].forEach(p=>gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE))};
function mkF(w,h){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);texP();const f={w,h,t,f:gl.createFramebuffer()};gl.bindFramebuffer(gl.FRAMEBUFFER,f.f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return f}
function freeF(f){if(f){gl.deleteTexture(f.t);gl.deleteFramebuffer(f.f)}}
let GW=2,GH=2;
function resize(){CW=innerWidth;CH=innerHeight;const d=Math.min(devicePixelRatio||1,1.6);GW=glc.width=Math.max(2,Math.round(CW*d*RES));GH=glc.height=Math.max(2,Math.round(CH*d*RES));
 if(gl){[FA,FB,FC].forEach(freeF);FA=mkF(GW,GH);const bw=Math.max(2,GW>>2),bh=Math.max(2,GH>>2);FB=mkF(bw,bh);FC=mkF(bw,bh)}}
function attr(i,b,n,st,off){gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(i,n,gl.FLOAT,false,st||0,off||0);gl.enableVertexAttribArray(i)}
function fsPass(P,dst,tex,setU){gl.bindFramebuffer(gl.FRAMEBUFFER,dst?dst.f:null);gl.viewport(0,0,dst?dst.w:GW,dst?dst.h:GH);gl.useProgram(P.p);attr(0,bF,2);gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(P.u.uT,0);setU&&setU();gl.drawArrays(gl.TRIANGLES,0,3)}
function L(a,b,col,al){if(nL>=MAXL||al<=.003)return;const c=hex(col),o=nL*12;LB[o]=a[0];LB[o+1]=a[1];LB[o+2]=a[2];LB[o+3]=c[0]*al;LB[o+4]=c[1]*al;LB[o+5]=c[2]*al;LB[o+6]=b[0];LB[o+7]=b[1];LB[o+8]=b[2];LB[o+9]=c[0]*al;LB[o+10]=c[1]*al;LB[o+11]=c[2]*al;nL++}
function Lpoly(P,col,al,closed){for(let i=1;i<P.length;i++)L(P[i-1],P[i],col,al);if(closed)L(P[P.length-1],P[0],col,al)}
function render(){
 const n0=.1,f0=200,A=(f0+n0)/(f0-n0),B=-2*f0*n0/(f0-n0),sx=FOC/(CW/2),sy=FOC/(CH/2);
 const VP=new Float32Array([sx*CR[0],sy*CU[0],A*CF[0],CF[0],sx*CR[1],sy*CU[1],A*CF[1],CF[1],sx*CR[2],sy*CU[2],A*CF[2],CF[2],-sx*dt(CR,CAMP),-sy*dt(CU,CAMP),-A*dt(CF,CAMP)+B,-dt(CF,CAMP)]);
 gl.bindFramebuffer(gl.FRAMEBUFFER,FA.f);gl.viewport(0,0,GW,GH);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
 gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
 if(nL){gl.useProgram(PLN.p);gl.uniformMatrix4fv(PLN.u.uVP,false,VP);gl.bindBuffer(gl.ARRAY_BUFFER,bL);gl.bufferSubData(gl.ARRAY_BUFFER,0,LB.subarray(0,nL*12));
  attr(0,bL,3,24,0);attr(1,bL,3,24,12);gl.disableVertexAttribArray(2);gl.drawArrays(gl.LINES,0,nL*2)}
 gl.useProgram(PP.p);gl.uniformMatrix4fv(PP.u.uVP,false,VP);gl.uniform1f(PP.u.uF,FOC*GH/CH);gl.uniform1f(PP.u.uPx,GH/900);
 gl.bindBuffer(gl.ARRAY_BUFFER,bV);gl.bufferSubData(gl.ARRAY_BUFFER,0,VB);attr(0,bV,3,28,0);attr(1,bV,3,28,12);attr(2,bV,1,28,24);gl.drawArrays(gl.POINTS,0,NP);
 gl.disable(gl.BLEND);
 fsPass(PBR,FB,FA.t,()=>gl.uniform2f(PBR.u.uTx,1.5/GW,1.5/GH));
 for(const k of[1,2]){fsPass(PBL,FC,FB.t,()=>gl.uniform2f(PBL.u.uD,k/FB.w,0));fsPass(PBL,FB,FC.t,()=>gl.uniform2f(PBL.u.uD,0,k/FB.h))}
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,GW,GH);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(PCO.p);attr(0,bF,2);gl.disableVertexAttribArray(1);gl.disableVertexAttribArray(2);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,FA.t);gl.uniform1i(PCO.u.uA,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,FB.t);gl.uniform1i(PCO.u.uB,1);gl.uniform1f(PCO.u.uBl,1.0);
 gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.drawArrays(gl.TRIANGLES,0,3);gl.disable(gl.BLEND);gl.activeTexture(gl.TEXTURE0)}

/* =====================================================================
   6 · SZENEN-AUFBAU: Gruppen, Pfade, Beschriftungen, Hotspots
   ===================================================================== */
class Bld{constructor(sid){this.sid=sid;this.G=[];this.Lb=[];this.H=[];this.SL=[];this.dyn=null;this.cap=null;this.act=[];this.note='';this.hint='';this.hero=null}
 k(key){return this.sid+':'+key}
 g(key,pts,o){const P=pts instanceof PB?pts.f():pts;const s=Object.assign({key:this.k(key),kind:'pts',pts:P},o||{});s.n=s.n0=P.length/3;this.G.push(s);return s}
 path(key,pts,n,o){const s=Object.assign({key:this.k(key),kind:'path',path:pts},o||{});s.n=s.n0=n;this.G.push(s);return s}
 lab(key,pos,html,o){const s=Object.assign({key:this.k(key),pos,html},o||{});if(s.hk)s.hk=this.k(s.hk);this.Lb.push(s);return this}
 hot(key,pos,r,o){this.H.push(Object.assign({key:this.k(key),pos,r},o||{}));return this}
 ln(a,b,col,al){this.SL.push([a,b,col,al===undefined?.3:al]);return this}
 gk(key){return this.k(key)}}
function RG(key){return GMAP.get(SID+':'+key)}
function resolve(pos){if(!pos)return null;if(typeof pos=='function')return pos(T);if(pos.g!==undefined){return toW(SID+':'+pos.g,pos.p||[0,0,0])}return pos}
/* ---- Beschriftungen ---- */
const LBM=new Map();let LBL=[];
function syncLabels(list){const keep=new Set();LBL=list;
 for(const L0 of list){keep.add(L0.key);let e=LBM.get(L0.key);
  if(!e){const el=document.createElement('div');const inner=document.createElement('div');el.appendChild(inner);$('lab').appendChild(el);e={el,inner,html:null,cls:null,w:null};LBM.set(L0.key,e);requestAnimationFrame(()=>requestAnimationFrame(()=>e.el.classList.add('in')))}
  else if(e.dying){clearTimeout(e.dying);e.dying=0;e.el.classList.add('in')}
  e.spec=L0;const h=typeof L0.html=='function'?L0.html(T):L0.html;if(h!==e.html){e.inner.innerHTML=h;e.html=h}
  if(L0.w!==e.w){e.inner.style.width=L0.w?'calc(var(--u)*'+(L0.w*6.25).toFixed(2)+')':'';e.inner.style.whiteSpace=L0.w?'normal':'nowrap';e.w=L0.w}
  e.click=L0.click||null;e.inner.onclick=e.click?(ev=>{ev.stopPropagation();e.click()}):null;
  e.inner.onmouseenter=L0.click?()=>setHover(L0.hk||L0.key,true):null;e.inner.onmouseleave=L0.click?()=>setHover(null,true):null;
  updCls(e)}
 for(const[k,e]of LBM)if(!keep.has(k)&&!e.dying){e.el.classList.remove('in');e.dying=setTimeout(()=>{e.el.remove();LBM.delete(k)},600)}}
function updCls(e){const L0=e.spec;let c='lb '+(L0.al||'')+(L0.cls?' '+(typeof L0.cls=='function'?L0.cls(T):L0.cls):'')+(e.click?' ck':'')+((HOV&&(HOV===L0.key||HOV===L0.hk))?' hv':'');if(e.el.classList.contains('in'))c+=' in';if(c!==e.cls){e.el.className=c;e.cls=c}}
function frameLabels(){for(const[k,e]of LBM){if(e.dying)continue;const L0=e.spec;if(typeof L0.html=='function'){const h=L0.html(T);if(h!==e.html){e.inner.innerHTML=h;e.html=h}}
  if(typeof L0.cls=='function'||e.click)updCls(e);
  const w=resolve(L0.pos),p=w&&pj(w);if(!p||(L0.vis&&!L0.vis(T,w))){e.el.style.visibility='hidden';continue}e.el.style.visibility='';
  const dx=(L0.dx||0)*CW/100,dy=(L0.dy||0)*CW/100;e.el.style.transform='translate3d('+(p[0]+dx).toFixed(1)+'px,'+(p[1]+dy).toFixed(1)+'px,0)'}}
/* ---- Hotspots ---- */
let HOT=[],HOV=null,DRAG=null;
function setHover(k,fromLabel){if(k===HOV)return;HOV=k;for(const g of GR)g.hovT=0;if(k){const h=HOT.find(x=>x.key===k);if(h&&h.grp)for(const gk of h.grp){const g=GMAP.get(SID+':'+gk);if(g)g.hovT=1}}
 document.body.classList.toggle('hot',!!k);for(const[,e]of LBM)if(!e.dying)updCls(e)}
function hitTest(mx,my){let best=null,bd=1e9;for(const h of HOT){const w=resolve(h.pos);if(!w)continue;const p=pj(w);if(!p)continue;const rp=Math.max(h.min||16,h.r*FOC/p[2]),d=Math.hypot(p[0]-mx,p[1]-my);if(d<rp&&d/rp<bd){bd=d/rp;best=h}}return best}
/* ---- Szenenverwaltung ---- */
let SID=-1,SC=null,STATE=[],SL_=[],DYN=null,LFADE=0,ENTER=0;
function build(){const B=new Bld(SID);const st=STATE[SID];SC.build(B,st);applyGroups(B.G);syncLabels(B.Lb);HOT=B.H;SL_=B.SL;DYN=B.dyn;
 setTitle(B.t!==undefined?B.t:SC.t,B.s!==undefined?B.s:SC.s);setCap(B.cap);setAct(B.act);setNote(B.note);$('hint').textContent=B.hint||SC.hint||'';$('hint').style.opacity=(B.hint||SC.hint)?1:0;
 const he=$('hero');if(B.hero){if(he.dataset.k!==B.hero){he.innerHTML=B.hero;he.dataset.k=B.hero;he.querySelectorAll('[data-go]').forEach(b=>b.onclick=ev=>{ev.stopPropagation();const v=b.dataset.go;if(v=='ov')toggleOv();else goTo(+v)})}he.classList.add('on');document.body.classList.add('heroOn')}
 else{he.classList.remove('on');document.body.classList.remove('heroOn')}
 if(HOV&&!HOT.some(h=>h.key===HOV)&&!LBL.some(l=>l.key===HOV||l.hk===HOV))setHover(null);else if(HOV){const k=HOV;HOV=null;setHover(k)}}
function refresh(){if(SC)build()}
let ttlKey=null;
function setTitle(t,s){const k=(t||'')+'|'+(s||'');if(k===ttlKey)return;ttlKey=k;$('hT').innerHTML=t||'';$('hS').textContent=s||'';const h=$('hud');h.classList.remove('fade');void h.offsetWidth;h.classList.add('fade')}
let capKey='';
function setCap(c){const el=$('cap');if(!c){if(capKey){el.innerHTML='';capKey=''}return}
 let h='';if(c.k)h+='<div class="ck">'+c.k+'</div>';if(c.t)h+='<div class="row">'+(c.n?'<span class="cn">'+c.n+'</span>':'')+'<span class="ct">'+c.t+'</span></div>';
 if(c.s)h+='<div class="cs">'+c.s+'</div>';if(c.list&&c.list.length)h+='<ul>'+c.list.map(x=>typeof x=='string'?'<li>'+x+'</li>':'<li class="'+(x.c||'')+'">'+x.h+'</li>').join('')+'</ul>';
 if(c.chips)h+='<div class="chips">'+c.chips.map(x=>typeof x=='string'?'<i>'+x+'</i>':'<i class="'+(x.c||'')+'">'+x.h+'</i>').join('')+'</div>';
 if(h!==capKey){el.innerHTML=h;capKey=h;el.classList.remove('fade');void el.offsetWidth;el.classList.add('fade')}}
let actKey='';
function setAct(a){a=a||[];const el=$('act'),k=SID+JSON.stringify(a.map(x=>[x.t,!!x.on]));if(k!==actKey){actKey=k;el.innerHTML='';a.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='ab'+(x.on?' on':'');b.innerHTML=x.t;el.appendChild(b)})}
 [...el.children].forEach((b,i)=>{const x=a[i];b.onclick=ev=>{ev.stopPropagation();b.blur();x.f()}})}
function setNote(n){const el=$('note');if(el.innerHTML!==(n||''))el.innerHTML=n||''}
