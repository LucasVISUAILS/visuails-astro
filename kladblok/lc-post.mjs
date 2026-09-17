import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const root='dist';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4398);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
await p.goto('http://localhost:4398/concept/laptop-naast/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
// ga naar slide 2 (na 4 catalogstappen)
for(let k=0;k<4;k++){ await p.evaluate(()=>document.querySelector('.lc-slide.is-aan [data-lc-stap="1"]').click()); await p.waitForTimeout(800); }
const el=await p.$('.lc-doek');
for(let k=0;k<3;k++){ await el.screenshot({path:`kladblok/lc-post${k}.png`});
 if(k<2){ await p.evaluate(()=>document.querySelector('.lc-slide.is-aan [data-lc-stap="1"]').click()); await p.waitForTimeout(800);} }
await b.close(); srv.close(); console.log('klaar');
