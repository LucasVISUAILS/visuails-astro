import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4397);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for (const w of [390, 820]) {
  const p=await b.newPage({viewport:{width:w,height:900},deviceScaleFactor:3});
  await p.goto('http://localhost:4397/concept/laptop-naast/',{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  await (await p.$('.lc-doek')).screenshot({path:`kladblok/lc-m${w}-a.png`});
  for(let k=0;k<4;k++){ await p.evaluate(()=>document.querySelector('.lc-slide.is-aan [data-lc-stap="1"]').click()); await p.waitForTimeout(700); }
  await (await p.$('.lc-doek')).screenshot({path:`kladblok/lc-m${w}-b.png`});
  await p.close();
}
await b.close(); srv.close(); console.log('klaar');
