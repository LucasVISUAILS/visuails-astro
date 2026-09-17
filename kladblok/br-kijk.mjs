import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4387);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
const fout=[]; p.on('pageerror',e=>fout.push(String(e))); p.on('console',m=>{if(m.type()==='error')fout.push(m.text());});
await p.goto('http://localhost:4387/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
await p.screenshot({path:'kladblok/br-0.png', fullPage:false});
// vul product 1 half: voorkant aan
await p.click('[data-br-paneel="0"] [data-br-vak="front"]'); await p.waitForTimeout(350);
await p.click('[data-br-paneel="0"] [data-br-vak="worn"]'); await p.waitForTimeout(350);
await p.screenshot({path:'kladblok/br-1.png'});
console.log('stand p1:', await p.evaluate(()=>document.querySelector('[data-br-paneel="0"] [data-br-stand]').textContent));
// klaar -> volgende
// plusje drie keer: er moeten drie referentievakken bij komen, daarna nog één en dan stopt hij
for (let k=0;k<5;k++){ await p.evaluate(()=>{const b=document.querySelector('[data-br-paneel="0"] [data-br-plus]'); if(b&&!b.closest('li').hidden) b.click();}); await p.waitForTimeout(200); }
console.log('vakken op p1:', await p.evaluate(()=>[...document.querySelectorAll('[data-br-paneel="0"] .br-vak:not(.br-plus):not(.br-ref)')].map(e=>e.querySelector('.br-vak-woord b').textContent).join(', ')));
console.log('stand na plussen:', await p.evaluate(()=>document.querySelector('[data-br-paneel="0"] [data-br-stand]').textContent));
console.log('plusje verborgen:', await p.evaluate(()=>document.querySelector('[data-br-paneel="0"] [data-br-plus]').closest('li').hidden));
await p.screenshot({path:'kladblok/br-plus.png'});
await p.click('[data-br-paneel="0"] [data-br-stap="1"]'); await p.waitForTimeout(800);
console.log('actief paneel:', await p.evaluate(()=>[...document.querySelectorAll('[data-br-paneel]')].findIndex(e=>e.classList.contains('is-aan'))));
// naar het slot
await p.evaluate(()=>document.querySelector('[data-br]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
for(let k=0;k<5;k++){ await p.evaluate(()=>document.querySelector('[data-br]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))); await p.waitForTimeout(150);}
await p.waitForTimeout(700);
console.log('slotkop:', await p.evaluate(()=>document.querySelector('[data-br-slot-h]').textContent));
console.log('gaten:', await p.evaluate(()=>document.querySelectorAll('.br-tegel.is-gat').length));
await p.screenshot({path:'kladblok/br-slot.png'});
console.log(fout.length?('FOUTEN '+fout.join(' | ')):'geen jsfouten');
await b.close(); srv.close();
