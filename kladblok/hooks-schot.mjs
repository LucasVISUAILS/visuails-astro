import { createServer } from 'node:http';
import { readFile, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8083,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
for (const [pad,w,naam] of [['/editions',1440,'ed-breed'],['/editions',390,'ed-telefoon'],['/nl/editions',1440,'ed-nl-breed']]) {
  const ctx=await b.newContext({viewport:{width:w,height:2000},reducedMotion:'reduce',deviceScaleFactor:1});
  const p=await ctx.newPage();
  await p.goto(`http://127.0.0.1:8083${pad}`,{waitUntil:'networkidle'});
  await p.evaluate(()=>{document.querySelectorAll('.reveal.pending').forEach(e=>e.classList.remove('pending'));});
  await p.waitForTimeout(600);
  await p.screenshot({path:`/tmp/${naam}.png`, fullPage:true});
  const h=await p.evaluate(()=>document.documentElement.scrollHeight);
  const overloop=await p.evaluate(()=>{const d=document.documentElement; return d.scrollWidth - d.clientWidth;});
  console.log(`${naam}: ${h}px hoog, horizontale overloop ${overloop}px`);
  await ctx.close();
}
await b.close(); s.close();
