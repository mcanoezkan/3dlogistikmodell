// Virtuelle Zeit + Overlay (Mauszeiger, Klick-Ring, Untertitel, Titelkarten)
module.exports.init = `
(()=>{
  let vt=0; const q=[]; const d0=1793000000000;
  performance.now=()=>vt; Date.now=()=>d0+vt;
  // deterministischer Zufall
  let s=1234567; Math.random=()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  window.requestAnimationFrame=cb=>{q.push(cb);return q.length}; window.cancelAnimationFrame=()=>{};
  // virtuelle Timer
  let tid=1; const timers=new Map();
  window.setTimeout=(fn,ms=0,...a)=>{const id=tid++;timers.set(id,{at:vt+(+ms||0),fn,a});return id};
  window.clearTimeout=id=>timers.delete(id);
  window.setInterval=(fn,ms=0,...a)=>{const id=tid++;timers.set(id,{at:vt+(+ms||1),fn,a,iv:+ms||1});return id};
  window.clearInterval=id=>timers.delete(id);
  window.__step=(ms)=>{
    vt+=ms;
    for(const [id,t] of [...timers].sort((x,y)=>x[1].at-y[1].at)){ if(t.at<=vt){ if(t.iv) t.at+=t.iv; else timers.delete(id); try{typeof t.fn==='function'?t.fn(...t.a):0}catch(e){console.log('timerErr '+e.message)} } }
    const c=q.splice(0); for(const f of c){try{f(vt)}catch(e){console.log('rafErr '+e.message)}}
    if(window.__ov) window.__ov.tick(vt);
  };
  window.__vt=()=>vt;
  window.__noDraw=false;
  for(const C of [window.WebGLRenderingContext,window.WebGL2RenderingContext]) if(C) for(const m of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced','drawRangeElements','clear']){
    const o=C.prototype[m]; if(o) C.prototype[m]=function(...a){ if(window.__noDraw) return; return o.apply(this,a); };
  }

  // ---------- Overlay ----------
  const css=\`
  #ovRoot{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:Arial,Helvetica,sans-serif}
  #ovCur{position:absolute;left:0;top:0;width:30px;height:30px;transform-origin:3px 2px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))}
  #ovRing{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #2D7694;background:rgba(45,118,148,.18);opacity:0}
  #ovCap{position:absolute;left:50%;top:158px;transform:translateX(-50%);display:flex;align-items:stretch;background:rgba(10,34,60,.94);color:#fff;box-shadow:0 10px 30px rgba(10,34,60,.35);opacity:0;white-space:nowrap}
  #ovCap .bar{width:7px;background:#2D7694}
  #ovCap .txt{padding:13px 26px 13px 20px}
  #ovCap .k{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8fc3d6;font-weight:700;margin-bottom:3px}
  #ovCap .h{font-size:27px;font-weight:700;letter-spacing:.01em}
  #ovCard{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0}
  #ovCard .bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(10,34,60,.80) 0%,rgba(10,34,60,.93) 70%)}
  #ovCard .in{position:relative;text-align:center;color:#fff}
  #ovCard img{height:74px;margin-bottom:30px}
  #ovCard .t{font-size:66px;font-weight:700;letter-spacing:.01em}
  #ovCard .line{width:120px;height:5px;background:#2D7694;margin:24px auto}
  #ovCard .s{font-size:27px;color:#d5dee7}
  #ovCard .s2{font-size:20px;color:#8fc3d6;margin-top:14px;letter-spacing:.12em;text-transform:uppercase;font-weight:700}
  #ovFade{position:absolute;inset:0;background:#0A223C;opacity:0}
  
  \`;
  const ease=t=>t<0?0:t>1?1:t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  function build(){
    const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    const r=document.createElement('div');r.id='ovRoot';
    r.innerHTML='<div id="ovCard"><div class="bg"></div><div class="in"></div></div><div id="ovCap"><div class="bar"></div><div class="txt"><div class="k"></div><div class="h"></div></div></div><div id="ovRing"></div>'+
     '<svg id="ovCur" viewBox="0 0 30 30"><path d="M3 2 L3 24 L8.6 18.8 L12.4 27.4 L16.2 25.8 L12.5 17.4 L20 17.2 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg><div id="ovFade"></div>';
    document.body.appendChild(r);
    const O=window.__ov={x:-100,y:-100,curOn:0,curT:-1e9,curTarget:0,clicks:[],cap:null,capT:0,capOff:null,card:null,fade:null,
      cursor(x,y){O.x=x;O.y=y},
      showCursor(on){ if(O.curTarget!==on){O.curTarget=on;O.curT=vt} },
      click(){O.clicks.push(vt)},
      caption(k,h){ if(h==null){ if(O.cap) O.capOff=vt; return } O.cap={k,h}; O.capT=vt; O.capOff=null; const c=document.getElementById('ovCap'); c.querySelector('.k').textContent=k; c.querySelector('.h').textContent=h },
      card(html,t0,t1,fin=500,fout=500){ O.cardD={t0,t1,fin,fout}; document.querySelector('#ovCard .in').innerHTML=html },
      fadeOut(t0,t1){O.fade={t0,t1}},
      tick(t){
        const cur=document.getElementById('ovCur'); const a=O.curTarget?ease((t-O.curT)/250):1-ease((t-O.curT)/250);
        let sc=1; for(const c of O.clicks){const d=t-c; if(d>=0&&d<160) sc=Math.min(sc,1-0.18*Math.sin(Math.PI*d/160));}
        cur.style.opacity=a; cur.style.transform='translate('+(O.x-3)+'px,'+(O.y-2)+'px) scale('+sc+')';
        const ring=document.getElementById('ovRing'); let ro=0,rs=0;
        for(const c of O.clicks){const d=(t-c)/450; if(d>=0&&d<1){ro=1-d; rs=0.4+1.1*ease(d);}}
        O.clicks=O.clicks.filter(c=>t-c<1000);
        ring.style.opacity=ro; ring.style.left=O.x+'px'; ring.style.top=O.y+'px'; ring.style.transform='scale('+rs+')';
        const cap=document.getElementById('ovCap');
        if(O.cap){ let o=ease((t-O.capT)/350), y=(1-o)*-14; if(O.capOff!=null){const f=ease((t-O.capOff)/300); o*=1-f; y=-10*f;} cap.style.opacity=o; cap.style.transform='translate(-50%,'+y+'px)'; } else cap.style.opacity=0;
        const card=document.getElementById('ovCard');
        if(O.cardD){const C=O.cardD; let o=Math.min(ease((t-C.t0)/C.fin),1-ease((t-(C.t1-C.fout))/C.fout)); if(t<C.t0||t>C.t1)o=0; card.style.opacity=o;
          const inn=card.querySelector('.in'); const k=ease((t-C.t0)/900); inn.style.transform='translateY('+(1-k)*18+'px)'; }
        const fd=document.getElementById('ovFade'); fd.style.opacity=O.fade?ease((t-O.fade.t0)/(O.fade.t1-O.fade.t0)):0;
      }};
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
})();`;
