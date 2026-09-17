import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4380);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:2});
await p.goto('http://localhost:4380/nl/start/catalog/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
/* De cookiebalk alleen voor de foto uit beeld halen. Niets aanklikken: een
   toestemmingsbalk beantwoorden is niet aan mij. */
await p.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none!important}'});
await p.waitForTimeout(200);
const h = async (n)=>p.evaluate((x)=>{const e=document.querySelector(`[data-pl-step="${x}"]`); return e?Math.round(e.getBoundingClientRect().height):-1;}, n);
console.log('stap 1 eigen hoogte:', await h(1), 'px | document:', await p.evaluate(()=>document.documentElement.scrollHeight));
await p.locator('[data-pl-qty]').scrollIntoViewIfNeeded();
await p.waitForTimeout(200);
await p.locator('[data-pl-qty]').screenshot({path:'kladblok/bf-aantal.png'});
await p.locator('[data-pl-step="1"]').screenshot({path:'kladblok/bf-stap1.png'});
await p.fill('#pl-qty-n','6'); await p.waitForTimeout(500);
console.log('stap 1 na een aantal:', await h(1));
await p.locator('[data-pl-step]:visible [data-pl-next]').first().click({force:true}); await p.waitForTimeout(900);
console.log('stap 2 eigen hoogte:', await h(2), 'px | document:', await p.evaluate(()=>document.documentElement.scrollHeight));
await b.close(); srv.close();
