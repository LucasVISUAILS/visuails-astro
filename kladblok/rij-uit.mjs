import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json'};
const srv=createServer((req,res)=>{let p=join('dist',decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){res.writeHead(404);res.end('nee');return;}
 res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>srv.listen(4321,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:1000}});
await pg.goto('http://localhost:4321/nl/start/catalog/',{waitUntil:'networkidle'});
await pg.evaluate(() => { const el=[...document.querySelectorAll('#pl-qty-n,[data-pl-qty-input]')].find(n=>n.offsetParent!==null); el.value='6'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); });
await pg.waitForTimeout(700);
console.log(await pg.evaluate(() => {
  const k = document.querySelector('[data-pl-volgende]');
  const cs = getComputedStyle(k);
  const r = k.getBoundingClientRect();
  const rail = document.querySelector('[data-pl-rail-knop]');
  const rr = rail.getBoundingClientRect();
  return JSON.stringify({
    volgende: { uit: k.disabled, opacity: cs.opacity, achtergrond: cs.backgroundColor, kleur: cs.color, cursor: cs.cursor, w: Math.round(r.width), h: Math.round(r.height) },
    railvakje: { w: Math.round(rr.width), h: Math.round(rr.height) },
  }, null, 1);
}));
await b.close(); srv.close();
