import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4382);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1200},deviceScaleFactor:2});
await p.goto('http://localhost:4382/concept/bestelrij/',{waitUntil:'networkidle'});
await p.waitForTimeout(700);
await p.click('[data-br-paneel="0"] [data-br-vak="front"]'); await p.waitForTimeout(250);
await p.click('[data-br-paneel="0"] [data-br-vak="back"]'); await p.waitForTimeout(250);
for (let k=0;k<3;k++){ await p.evaluate(()=>{const x=document.querySelector('[data-br-paneel="0"] [data-br-plus]'); if(x&&!x.closest('li').hidden) x.click();}); await p.waitForTimeout(220); }
await p.waitForTimeout(400);
await p.locator('[data-br-paneel="0"]').screenshot({path:'kladblok/br-paneel.png'});
console.log(await p.evaluate(()=>{
  const paneel=document.querySelector('[data-br-paneel="0"]');
  const r=(e)=>e?Math.round(e.getBoundingClientRect().height):-1;
  const ref=paneel.querySelector('.br-ref');
  return 'paneel-in '+r(paneel.querySelector('.br-paneel-in'))+' | vakken '+r(paneel.querySelector('.br-vakken'))
   +' | extra '+r(paneel.querySelector('.br-extra'))+' | refs '+r(paneel.querySelector('.br-refs'))
   +' | 1 ref '+r(ref)+' breed '+(ref?Math.round(ref.getBoundingClientRect().width):-1)
   +' | refbeeld '+r(ref&&ref.querySelector('.br-vak-beeld'))
   +' | refimg '+r(ref&&ref.querySelector('img'));
}));
console.log('paneelhoogte', await p.evaluate(()=>Math.round(document.querySelector('[data-br-paneel="0"]').getBoundingClientRect().height)));
await b.close(); srv.close();
