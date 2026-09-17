import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4381);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:2});
await p.goto('http://localhost:4381/nl/start/catalog/',{waitUntil:'networkidle'});
await p.waitForTimeout(800);
await p.locator('[data-pl-qty]').screenshot({path:'kladblok/bf-aantal.png'});
console.log(await p.evaluate(()=>{
  const q=document.querySelector('[data-pl-qty]');
  return q.textContent.replace(/\s+/g,' ').trim().slice(0,300);
}));
// wat staat er in stap 1 in totaal, per blok
console.log(await p.evaluate(()=>{
  const z=document.querySelector('[data-pl-step="1"]');
  return [...z.children].map(e=>{
    const r=e.getBoundingClientRect();
    const kop=(e.querySelector('h2,h3,legend,label,.paneel-kop,.pl-blok-h')||{}).textContent||'';
    return `${e.tagName.toLowerCase()}.${(e.className||'').split(' ')[0]} — ${Math.round(r.height)}px — "${kop.replace(/\s+/g,' ').trim().slice(0,52)}"`;
  }).join('\n');
}));
await b.close(); srv.close();
