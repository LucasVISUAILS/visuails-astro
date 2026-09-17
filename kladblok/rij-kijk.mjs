import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json','.txt':'text/plain'};
const srv=createServer((req,res)=>{let p=join('dist',decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){res.writeHead(404);res.end('nee');return;}
 res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>srv.listen(4321,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:1000}});
await pg.goto('http://localhost:4321/nl/start/catalog/',{waitUntil:'networkidle'});
console.log(await pg.evaluate(() => {
  const zichtbaar = (el) => !!(el && el.offsetParent !== null);
  const stappen = [...document.querySelectorAll('[data-pl-step]')].map((s,i)=>`${i}:${s.hidden?'verborgen':'ZICHTBAAR'}:${s.getAttribute('data-pl-step')}`);
  const qty = document.querySelector('#pl-qty-n');
  return JSON.stringify({
    stappen,
    qty: qty ? { zichtbaar: zichtbaar(qty), waarde: qty.value, type: qty.type } : 'geen',
    qtyBlok: (() => { const d=document.querySelector('[data-pl-qty]'); return d? (d.hidden?'hidden':'zichtbaar') : 'geen'; })(),
    knoppen: [...document.querySelectorAll('[data-pl-next]')].map((k)=>`${zichtbaar(k)?'Z':'v'}:${(k.textContent||'').trim().slice(0,24)}`),
  }, null, 1);
}));
await b.close(); srv.close();
