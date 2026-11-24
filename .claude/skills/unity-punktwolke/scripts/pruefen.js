// Prüft eine gebaute Präsentation: jede Folie rendern, alle Schaltflächen und Klickflächen auslösen, Screenshots schreiben.
// Aufruf: node pruefen.js <datei.html> <screenshot-ordner> [folien z.B. 0-5,9]
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [f,dir,rng]=process.argv.slice(2);fs.mkdirSync(dir,{recursive:true});
const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage({viewport:{width:1600,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()=='error')errs.push(m.text())});
await p.goto('file://'+require('path').resolve(f)+'?s=0');await p.waitForTimeout(1200);const N=await p.evaluate(()=>SLIDES.length);
const list=rng?rng.split(',').flatMap(r=>{const[a,c]=r.split('-').map(Number);return c===undefined?[a]:Array.from({length:c-a+1},(_,i)=>a+i)}):[...Array(N).keys()];
for(const i of list){await p.evaluate(i=>goTo(i),i);await p.waitForTimeout(3800);await p.screenshot({path:dir+'/folie'+String(i+1).padStart(2,'0')+'.png'});
 const n=await p.evaluate(()=>document.querySelectorAll('#act .ab').length);for(let k=0;k<n;k++){await p.evaluate(k=>{const x=document.querySelectorAll('#act .ab')[k];x&&x.click()},k);await p.waitForTimeout(200)}
 await p.evaluate(()=>{for(const h of HOT.slice())if(h.click)h.click()});await p.waitForTimeout(200);
 const e=await p.evaluate(()=>document.getElementById('err').textContent);if(e)console.log('Folie',i+1,'Fehler:',e)}
console.log(N,'Folien geprüft. Fehler:',errs.length?errs:'keine');await b.close()})();
