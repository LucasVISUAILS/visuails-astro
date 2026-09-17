import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = 'dist';
const mt = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript',
  '.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json' };
const srv = http.createServer((q,r)=>{
  let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f,'index.html');
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200,{'content-type': mt[path.extname(f)] || 'application/octet-stream'});
  fs.createReadStream(f).pipe(r);
}).listen(4399);
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport:{width:1600,height:1000}, deviceScaleFactor:2 });
await p.goto('http://localhost:4399/concept/laptop-naast/', { waitUntil:'networkidle' });
await p.waitForTimeout(900);
const el = await p.$('.lc-doek');
await p.evaluate(()=>{const b=document.querySelector('[data-lc]');b.dispatchEvent(new MouseEvent('mouseenter'));});
for (let k=0;k<4;k++){
  await el.screenshot({ path:`kladblok/lc-stap${k}.png` });
  if (k<3) { await p.evaluate(()=>document.querySelector('.lc-slide.is-aan .lc-omlaag').click()); await p.waitForTimeout(900); }
}
await b.close(); srv.close();
console.log('klaar');
