import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4376);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:900,height:500},deviceScaleFactor:3});
await p.goto('http://localhost:4376/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(500);
/* Dezelfde schets op de drie maten die ertoe doen: zoals hij in de tegel staat,
   twee keer zo groot, en groot genoeg om de lijnen te beoordelen. */
await p.evaluate(()=>{
  const bron=document.querySelector('[data-br-hoek="in-hand"] svg');
  const d=document.createElement('div');
  d.id='proef'; d.style.cssText='position:fixed;inset:0;background:#F5F5F5;z-index:99999;display:flex;gap:40px;align-items:flex-end;padding:40px;color:#141414';
  [56,112,220].forEach(w=>{const s=bron.cloneNode(true); s.style.width=w+'px'; s.style.height='auto'; d.append(s);});
  document.body.append(d);
});
await p.waitForTimeout(200);
await p.locator('#proef').screenshot({path:'kladblok/hand.png'});
await b.close(); srv.close(); console.log('klaar');
