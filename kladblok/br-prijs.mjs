import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4374);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:2});
await p.goto('http://localhost:4374/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(600);
const regel = ()=>p.evaluate(()=>{
  const q=(s)=>{const e=document.querySelector(s); return e?e.textContent.trim():'';};
  return [q('[data-br-hoektel]'), q('.br-hoeken-tarief'), q('[data-br-hoeksom]')].filter(Boolean).join('  |  ');
});
console.log('leeg          :', await regel());
for (const id of ['three-quarter','flat-lay','inside']) { await p.click(`[data-br-hoek="${id}"]`); await p.waitForTimeout(250); console.log('na +1         :', await regel()); }
await p.fill('[data-br-eigennaam="ground"]','Flat-lay voor de banner');
await p.click('[data-br-eigenvoeg="ground"]'); await p.waitForTimeout(400);
console.log('met eigen hoek:', await regel());
await p.locator('.br-hoeken-kop').screenshot({path:'kladblok/br-prijs.png'});
await b.close(); srv.close();
