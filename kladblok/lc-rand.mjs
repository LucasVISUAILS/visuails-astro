import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4392);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for (const w of [1280,1440,1600,1920,2560]) {
  const p=await b.newPage({viewport:{width:w,height:900}});
  await p.goto('http://localhost:4392/concept/laptop-naast/',{waitUntil:'networkidle'});
  await p.waitForTimeout(400);
  console.log(w, await p.evaluate((vw)=>{
    const d=document.querySelector('.lc-doek').getBoundingClientRect();
    // telefoonvlak in doek-percentages
    const fl=67.7827/100, ft=42.3026/100, fw=14.1369/100;
    const x0=d.left+d.width*fl, x1=x0+d.width*fw;
    const zicht=Math.max(0, Math.min(x1, vw)-x0);
    const v=document.querySelector('.lc-voet').getBoundingClientRect();
    const br=document.querySelector('.lc-bron').getBoundingClientRect();
    return `doek ${Math.round(d.left)}..${Math.round(d.right)} (${Math.round(d.width)})  voet ${Math.round(v.left)}..${Math.round(v.right)} (${Math.round(v.width)})  telefoonmidden ${Math.round((x0+x1)/2)}  etiketmidden ${Math.round((br.left+br.right)/2)}`;
  }, w));
  await p.close();
}
await b.close(); srv.close();
