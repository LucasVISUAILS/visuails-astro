import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const mt={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.avif':'image/avif','.svg':'image/svg+xml','.woff2':'font/woff2'};
const srv=http.createServer((q,r)=>{let f=path.join('dist',decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':mt[path.extname(f)]||'application/octet-stream'});
 fs.createReadStream(f).pipe(r);}).listen(4390);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:2});
await p.goto('http://localhost:4390/concept/laptop-naast/',{waitUntil:'networkidle'});
await p.waitForTimeout(900);
console.log('in rust:', await p.evaluate(()=>{
  const v=[...document.querySelectorAll('.lc-slide.is-aan .lc-beeld')];
  const m=[...document.querySelectorAll('.lc-slide.is-aan .lc-merkje')];
  const t=(e)=>{const c=getComputedStyle(e);return `op ${(+c.opacity).toFixed(2)} sc ${c.scale}`;};
  return 'foto1 '+t(v[0])+' | foto2 '+t(v[1])+' | etiket1 op '+(+getComputedStyle(m[0]).opacity).toFixed(2);
}));
await (await p.$('.lc-doek')).screenshot({path:'kladblok/lc-anim0.png'});
const doos=await (await p.$('.lc-doek')).boundingBox();
await p.mouse.move(doos.x+doos.width*0.3, doos.y+doos.height*0.5);
await p.waitForTimeout(500);
await p.mouse.wheel(0,120); await p.waitForTimeout(220);
await (await p.$('.lc-doek')).screenshot({path:'kladblok/lc-anim1.png'});
await p.waitForTimeout(700);
console.log('na 1 stap:', await p.evaluate(()=>{
  const v=[...document.querySelectorAll('.lc-slide.is-aan .lc-beeld')];
  const t=(e)=>{const c=getComputedStyle(e);return `op ${(+c.opacity).toFixed(2)} sc ${c.scale}`;};
  return 'foto1 '+t(v[0])+' | foto2 '+t(v[1])+' | foto3 '+t(v[2]);
}));
await (await p.$('.lc-doek')).screenshot({path:'kladblok/lc-anim2.png'});
await b.close(); srv.close();
