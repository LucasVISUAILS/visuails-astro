/* LCP, CLS en hoelang de hoofddraad geblokkeerd is — met CPU-rem, want DESIGN.md
   begroot "LCP onder 2,5s op mobiel 4G". Een budget dat nooit gemeten wordt, is
   een wens. */
import { createServer } from 'node:http';
import { readFile, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { brotliCompressSync } from 'node:zlib';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}
  /* Cloudflare comprimeert tekst; een meting die dat niet doet, meet een site die
     niemand krijgt. html/css/js/json/svg gaan er dus door brotli heen. */
  const tekst=['.html','.css','.js','.json','.svg','.xml','.txt'].includes(extname(f));
  const accept=(q.headers['accept-encoding']||'').includes('br');
  const uit = (tekst&&accept) ? brotliCompressSync(b) : b;
  const kop = {'content-type':MIME[extname(f)]||'application/octet-stream'};
  if (tekst&&accept) kop['content-encoding']='br';
  r.writeHead(200,kop); r.end(uit);});});
await new Promise(r=>s.listen(8088,r));
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
const PAGINAS=['/','/nl','/gallery','/plans','/pricing','/start/catalog','/video','/how-it-works'];
console.log('pagina             LCP     CLS    lange taken   geblokkeerd   1e verf');
for(const pad of PAGINAS){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
  const p=await ctx.newPage();
  const cdp=await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});          // ~middenklasse telefoon
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:70,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});
  await p.addInitScript(()=>{
    window.__lcp=0; window.__cls=0; window.__taken=[]; 
    new PerformanceObserver((l)=>{for(const e of l.getEntries()) window.__lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver((l)=>{for(const e of l.getEntries()) if(!e.hadRecentInput) window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver((l)=>{for(const e of l.getEntries()) window.__taken.push(e.duration);}).observe({type:'longtask',buffered:true});
  });
  try{
    await p.goto(`http://127.0.0.1:8088${pad}`,{waitUntil:'load',timeout:60000});
    await p.waitForTimeout(3000);
    const m=await p.evaluate(()=>({lcp:window.__lcp,cls:window.__cls,taken:window.__taken,
      fcp:(performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||0}));
    const geblokkeerd=m.taken.reduce((a,d)=>a+Math.max(0,d-50),0);
    console.log(`${pad.padEnd(18)} ${(m.lcp/1000).toFixed(2)}s  ${m.cls.toFixed(3)}  ${String(m.taken.length).padStart(6)}      ${String(Math.round(geblokkeerd)).padStart(5)}ms     ${(m.fcp/1000).toFixed(2)}s`);
  }catch(e){ console.log(`${pad.padEnd(18)} — ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close(); s.close();
