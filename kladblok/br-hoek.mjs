import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4378);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1300},deviceScaleFactor:2});
const fout=[]; p.on('pageerror',e=>fout.push(String(e)));
await p.goto('http://localhost:4378/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
const vakken = ()=>p.evaluate(()=>[...document.querySelectorAll('[data-br-paneel="0"] .br-vak:not(.br-plus):not(.br-ref)')]
  .map(e=>e.querySelector('.br-vak-woord b').textContent+'['+(e.dataset.brNodig==='1'?'nodig':'vrij')+']').join(', '));
const stand = ()=>p.evaluate(()=>document.querySelector('[data-br-paneel="0"] [data-br-stand]').textContent);
console.log('zonder hoek :', await vakken());
console.log('teller      :', await p.evaluate(()=>document.querySelector('[data-br-hoektel]').textContent));
await p.click('[data-br-hoek="side"]'); await p.waitForTimeout(400);       // ondergrond
await p.click('[data-br-hoek="three-quarter"]'); await p.waitForTimeout(400); // op model
console.log('met 2 hoeken:', await vakken());
console.log('stand       :', await stand());
console.log('teller      :', await p.evaluate(()=>document.querySelector('[data-br-hoektel]').textContent));
await p.screenshot({path:'kladblok/br-hoeken.png'});
await p.locator('[data-br-paneel="0"]').screenshot({path:'kladblok/br-hoekpaneel.png'});
console.log('maat van de railvakjes:', await p.evaluate(()=>[...document.querySelector('.br-rail-knop .br-rail-vakjes').children]
  .map(e=>{const r=e.getBoundingClientRect(); return Math.round(r.width)+'x'+Math.round(r.height);}).join(' ')));
console.log('vakjes in rail 01:', await p.evaluate(()=>document.querySelector('.br-rail-knop .br-rail-vakjes').children.length));
// de modelhoek: eerst leeg, dan een regel typen
console.log('stand voor typen :', await stand());
await p.fill('[data-br-paneel="0"] .br-hoekregel input','driekwart vanaf links, hele broek in beeld');
await p.waitForTimeout(400);
console.log('stand na typen   :', await stand());
await p.locator('[data-br-paneel="0"]').screenshot({path:'kladblok/br-hoekpaneel.png'});
// maximum
for (const id of ['back-on-model','detail-on-model','in-hand','flat-lay']) { await p.click(`[data-br-hoek="${id}"]`).catch(()=>{}); await p.waitForTimeout(150); }
console.log('na 6 klikken:', await p.evaluate(()=>document.querySelector('[data-br-hoektel]').textContent),
  '| uitgeschakeld:', await p.evaluate(()=>document.querySelectorAll('[data-br-hoek][disabled]').length));
// hoek weer uit
await p.click('[data-br-hoek="side"]'); await p.waitForTimeout(400);
console.log('na uitzetten:', await vakken());
console.log(fout.length?('FOUTEN '+fout.join(' | ')):'geen jsfouten');
await b.close(); srv.close();
