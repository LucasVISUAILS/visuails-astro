/* WELK element verschuift, en hoeveel? CLS als getal zegt dat er iets springt;
   dit zegt wat. */
import { createServer } from 'node:http';
import { readFile, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8087,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
for (const [pad,w,h] of [['/nl',390,844],['/',390,844],['/how-it-works',390,844]]) {
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2});
  const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:70,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  await p.addInitScript(()=>{
    window.__sh=[];
    const pad=(el)=>{ if(!el) return '?'; const d=[]; let n=el; for(let i=0;i<3&&n&&n.tagName;i++){ d.unshift(n.tagName.toLowerCase()+(n.className&&typeof n.className==='string'?'.'+n.className.trim().split(/\s+/).slice(0,2).join('.'):'')); n=n.parentElement; } return d.join(' > '); };
    new PerformanceObserver((l)=>{for(const e of l.getEntries()){ if(e.hadRecentInput) continue;
      window.__sh.push({v:e.value,t:Math.round(e.startTime),bron:(e.sources||[]).map(sx=>({p:pad(sx.node),cls:sx.node&&sx.node.className,src:(sx.node&&sx.node.currentSrc||'').split('/').pop(),van:sx.previousRect&&[Math.round(sx.previousRect.y),Math.round(sx.previousRect.height)],naar:sx.currentRect&&[Math.round(sx.currentRect.y),Math.round(sx.currentRect.height)]})).slice(0,3)});}}).observe({type:'layout-shift',buffered:true});
  });
  await p.goto(`http://127.0.0.1:8087${pad}`,{waitUntil:'load',timeout:60000});
  await p.waitForTimeout(3500);
  const sh=await p.evaluate(()=>window.__sh);
  console.log(`\n── ${pad} @${w}px — ${sh.length} verschuiving(en), samen ${sh.reduce((a,x)=>a+x.v,0).toFixed(3)}`);
  for(const x of sh.sort((a,b)=>b.v-a.v).slice(0,6)) { console.log(`   ${x.v.toFixed(4)}  op ${x.t}ms`); for(const s2 of x.bron) console.log(`       ${s2.p}  [${s2.cls}] ${s2.src}  y/h ${JSON.stringify(s2.van)} → ${JSON.stringify(s2.naar)}`); }
  await ctx.close();
}
await b.close(); s.close();
