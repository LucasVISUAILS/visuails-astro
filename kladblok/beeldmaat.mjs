/* Welke afbeelding wordt veel groter geladen dan hij getekend wordt? Gemeten in
   een browser: naturalWidth tegen de werkelijke lay-outbreedte. Alles boven 2×
   is bytes die niemand ziet. */
import { createServer } from 'node:http';
import { readFile, existsSync, statSync, globSync } from 'node:fs';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8094,r));
const alle=globSync(join(DIST,'**/index.html')).map(f=>f.slice(DIST.length).replace(/\\/g,'/').replace(/\/index\.html$/,'')||'/');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
const ctx=await b.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
const gevonden=new Map();  // bestand → {nat, css, paginas:Set}
for(const pad of alle){
  const p=await ctx.newPage();
  try{
    await p.goto(`http://127.0.0.1:8094${pad}`,{waitUntil:'load',timeout:20000});
    await p.evaluate(()=>{document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');});
    await p.waitForTimeout(400);
    const r=await p.evaluate(()=>[...document.images].filter(i=>i.naturalWidth>0&&i.getBoundingClientRect().width>0)
      .map(i=>({src:new URL(i.currentSrc||i.src).pathname,nat:i.naturalWidth,css:Math.round(i.getBoundingClientRect().width)})));
    for(const x of r){
      const v=gevonden.get(x.src)||{nat:x.nat,css:0,paginas:new Set()};
      v.css=Math.max(v.css,x.css); v.paginas.add(pad); gevonden.set(x.src,v);
    }
  }catch(e){}
  await p.close();
}
await b.close(); s.close();
const rijen=[...gevonden.entries()].map(([src,v])=>{
  const f=join(DIST,src); const kb=existsSync(f)?Math.round(statSync(f).size/1024):0;
  return {src,kb,...v,factor:v.css?+(v.nat/v.css).toFixed(2):0};
}).filter(r=>r.factor>=2).sort((a,b)=>b.kb-a.kb);
let verspild=0;
console.log(`${gevonden.size} unieke beelden getekend; ${rijen.length} worden ≥2× te groot geladen\n`);
console.log('   kB  natuur→getekend  factor  bestand');
for(const r of rijen.slice(0,30)){
  verspild += r.kb - Math.round(r.kb/(r.factor*r.factor));
  console.log(`${String(r.kb).padStart(5)}  ${String(r.nat).padStart(5)}→${String(r.css).padEnd(5)}  ${String(r.factor).padStart(6)}  ${r.src}  (${[...r.paginas].slice(0,2).join(' ')}${r.paginas.size>2?' +'+(r.paginas.size-2):''})`);
}
console.log(`\ngrofweg ${verspild} kB te veel over deze ${Math.min(30,rijen.length)} beelden`);
