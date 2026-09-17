import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4377);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:3});
await p.goto('http://localhost:4377/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(600);
await p.locator('.br-hoeken').screenshot({path:'kladblok/schets-tegels.png'});
/* De acht schetsen los en groot naast elkaar, om ze te kunnen beoordelen. */
await p.evaluate(()=>{
  const d=document.createElement('div');
  d.id='proef';
  d.style.cssText='position:fixed;inset:0;background:#F5F5F5;z-index:99999;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;padding:28px;align-content:start';
  document.querySelectorAll('[data-br-hoek]').forEach(k=>{
    const c=document.createElement('div');
    c.style.cssText='display:grid;gap:6px;justify-items:center;color:#141414';
    const s=k.querySelector('svg').cloneNode(true); s.style.width='200px';
    const t=document.createElement('div'); t.textContent=k.dataset.brHoeknaam;
    t.style.cssText='font:600 15px system-ui';
    c.append(s,t); d.append(c);
  });
  document.body.append(d);
});
await p.waitForTimeout(300);
await p.locator('#proef').screenshot({path:'kladblok/schets-acht.png'});
await b.close(); srv.close(); console.log('klaar');
