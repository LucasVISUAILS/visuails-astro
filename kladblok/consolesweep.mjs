/* Elke pagina openen en luisteren naar wat de browser klaagt: JS-fouten, console
   errors/warnings, en verzoeken die falen. Een fout op één pagina breekt daar
   stil een functie; niets in de bron laat dat zien. */
import { createServer } from 'node:http';
import { readFile, existsSync, globSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json','.xml':'application/xml','.txt':'text/plain'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404,{'content-type':'text/html'});return r.end('nope');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8090,r));
const alle=globSync(join(DIST,'**/index.html')).map(f=>f.slice(DIST.length).replace(/\\/g,'/').replace(/\/index\.html$/,'')||'/');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
/* /account/me en /api/... bestaan alleen als Pages Function; die 404 hoort bij
   deze statische opstelling en niet bij de site. */
const VERWACHT=/^\/(api|account|admin|portal)\//;
const fouten=new Map(), stuk=new Map();
for(const [w,h] of [[1440,900],[390,844]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},reducedMotion:'reduce'});
  for(const pad of alle){
    const p=await ctx.newPage();
    p.on('pageerror',(e)=>{const k=`${e.message.split('\n')[0]}`;if(!fouten.has(k))fouten.set(k,[]);fouten.get(k).push(`${w}px ${pad}`);});
    p.on('console',(m)=>{ if(m.type()!=='error'&&m.type()!=='warning')return; const t=m.text(); if(/Failed to load resource/.test(t))return; const k=`[${m.type()}] ${t.slice(0,120)}`; if(!fouten.has(k))fouten.set(k,[]); fouten.get(k).push(`${w}px ${pad}`); });
    p.on('requestfailed',(r)=>{const u=new URL(r.url()).pathname; if(VERWACHT.test(u))return; const k=`verzoek mislukt: ${u}`; if(!stuk.has(k))stuk.set(k,[]); stuk.get(k).push(`${w}px ${pad}`);});
    p.on('response',(r)=>{ if(r.status()<400)return; const u=new URL(r.url()).pathname; if(VERWACHT.test(u))return; const k=`${r.status()} ${u}`; if(!stuk.has(k))stuk.set(k,[]); stuk.get(k).push(`${w}px ${pad}`);});
    try{ await p.goto(`http://127.0.0.1:8090${pad}`,{waitUntil:'load',timeout:20000}); await p.waitForTimeout(500);}catch(e){}
    await p.close();
  }
  await ctx.close();
  console.log(`${w}px klaar`);
}
await b.close(); s.close();
const toon=(t,m)=>{console.log(`\n${t}: ${m.size}`);for(const [k,v] of m)console.log(`   ${k}\n      ${v.length}× · ${v.slice(0,3).join(', ')}${v.length>3?' …':''}`);};
toon('JS-fouten en console-meldingen',fouten);
toon('verzoeken die faalden of 4xx/5xx gaven',stuk);
