import { createServer } from 'node:http';
import { readFile, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8085,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const p=await ctx.newPage();
const cdp=await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:70,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
await p.goto('http://127.0.0.1:8085/gallery',{waitUntil:'domcontentloaded'});
for(let i=0;i<8;i++){
  const m=await p.evaluate(()=>{
    const g=document.querySelector('.photo-grid');
    const imgs=[...g.querySelectorAll('img')];
    return {t:Math.round(performance.now()), gridH:Math.round(g.getBoundingClientRect().height),
      n:imgs.length, verborgen:imgs.filter(i=>i.getBoundingClientRect().height===0).length,
      eerste5:imgs.slice(0,5).map(i=>Math.round(i.getBoundingClientRect().height)),
      compl:imgs.filter(i=>i.complete).length,
      klassen:g.className,
      nul: imgs.map((im,ix)=>{const cs=getComputedStyle(im);return {ix,cls:im.className,h:Math.round(im.getBoundingClientRect().height),w:Math.round(im.getBoundingClientRect().width),nw:im.naturalWidth,c:im.complete,ar:cs.aspectRatio,hh:cs.height,ww:cs.width,disp:cs.display};}).filter(x=>x.h===0)};
  });
  console.log(JSON.stringify(m));
  await p.waitForTimeout(250);
}
await b.close(); s.close();
