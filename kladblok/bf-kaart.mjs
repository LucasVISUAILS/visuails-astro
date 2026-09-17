import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4385);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2});
await p.goto('http://localhost:4385/nl/start/catalog/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await p.fill('#pl-qty-n','6'); await p.waitForTimeout(400);
await p.locator('[data-pl-step]:visible [data-pl-next]').first().click({force:true}); await p.waitForTimeout(900);
const kaart = p.locator('[data-pl-cards] > li').first();
await kaart.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
await kaart.screenshot({path:'kladblok/bf-kaart.png'});
// het plusje aanzetten en opnieuw kijken
await p.evaluate(()=>{const k=document.querySelector('[data-pl-cards] > li');
 const b=[...k.querySelectorAll('button')].find(x=>/nog een foto/i.test(x.textContent)); if(b){b.click();b.click();}});
await p.waitForTimeout(600);
await kaart.screenshot({path:'kladblok/bf-kaart-plus.png'});
console.log(await p.evaluate(()=>{const k=document.querySelector('[data-pl-cards] > li');
 return 'vakken na 2x plus: '+[...k.querySelectorAll('[data-pu-slot]')].map(e=>e.getAttribute('data-pu-slot')).join(', ');}));
// de lade "Meer over dit product"
await p.evaluate(()=>{const k=document.querySelector('[data-pl-cards] > li');
 const d=k.querySelector('details'); if(d) d.open=true;});
await p.waitForTimeout(400);
await kaart.screenshot({path:'kladblok/bf-kaart-lade.png'});
console.log(await p.evaluate(()=>{const k=document.querySelector('[data-pl-cards] > li');
 const d=k.querySelector('details'); return d?('in de lade: '+d.textContent.replace(/\s+/g,' ').trim().slice(0,260)):'geen lade';}));
await b.close(); srv.close();
