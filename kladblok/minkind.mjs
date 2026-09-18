import { chromium, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json'};
const srv=createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);let p=join('dist',u);
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 else if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':T[extname(p)]||'application/octet-stream'});r.end(readFileSync(p));});
await new Promise((r)=>srv.listen(4411,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const ctx=await b.newContext({...devices['Pixel 5'], viewport:{width:Number(process.argv[4]||360),height:850}});
const pg=await ctx.newPage();
await pg.goto('http://localhost:4411'+process.argv[2],{waitUntil:'networkidle'});
await pg.waitForTimeout(350);
console.log(await pg.evaluate((sel)=>{
  const meet=(el)=>{const o=el.style.width; el.style.width='min-content'; const w=el.getBoundingClientRect().width; el.style.width=o; return Math.round(w);};
  const uit=[];
  document.querySelectorAll(sel).forEach((wortel)=>{
    const loop=(el,d)=>{
      const m=meet(el);
      uit.push(`${'  '.repeat(d)}${el.tagName.toLowerCase()}.${(el.className||'').toString().trim().split(/\s+/).join('.')||'-'} min ${m} "${(el.textContent||'').trim().slice(0,34)}"`);
      if(d<3)[...el.children].forEach((k)=>loop(k,d+1));
    };
    loop(wortel,0);
  });
  return uit.slice(0,26).join('\n');
}, process.argv[3]));
await b.close(); srv.close();
