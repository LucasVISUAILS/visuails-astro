import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4384);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for (const breed of [1440, 390]) {
  const p=await b.newPage({viewport:{width:breed,height:900}});
  await p.goto('http://localhost:4384/nl/start/catalog/',{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  await p.fill('#pl-qty-n','6'); await p.waitForTimeout(400);
  await p.locator('[data-pl-step]:visible [data-pl-next]').first().click({force:true}); await p.waitForTimeout(900);
  const nu = await p.evaluate(()=>{
    const z=[...document.querySelectorAll('[data-pl-step]')].find(e=>getComputedStyle(e).display!=='none');
    return {hoog: Math.round(z.getBoundingClientRect().height), knoppen: z.querySelectorAll('button, input, select, textarea, a[href]').length};
  });
  await p.close();
  const q2=await b.newPage({viewport:{width:breed,height:900}});
  await q2.goto('http://localhost:4384/concept/bestelrij/',{waitUntil:'networkidle'});
  await q2.waitForTimeout(700);
  const nieuw = await q2.evaluate(()=>{
    const v=document.querySelector('.br-venster');
    return {hoog: Math.round(document.querySelector('.br').getBoundingClientRect().height),
            paneel: Math.round(v.getBoundingClientRect().height),
            knoppen: document.querySelectorAll('.br button, .br input').length,
            zichtbaar: document.querySelectorAll('.br-paneel.is-aan button, .br-paneel.is-aan input').length};
  });
  await q2.close();
  console.log(`${breed}px  NU: stap 2 is ${nu.hoog}px hoog met ${nu.knoppen} bedienbare dingen  |  RIJ: ${nieuw.hoog}px totaal, paneel ${nieuw.paneel}px, ${nieuw.zichtbaar} dingen in beeld (${nieuw.knoppen} in de hele rij)`);
}
await b.close(); srv.close();
