/* Welke lettersnedes worden op een pagina ECHT gedownload, en welke families
   worden er in de opmaak gebruikt? Een geladen snede die nergens op staat is
   pure ballast. Gemeten met document.fonts, niet uit de CSS geraden. */
import { createServer } from 'node:http';
import { readFile, existsSync, statSync, globSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { chromium } from 'playwright';
const DIST='/tmp/vb/dist';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon','.json':'application/json'};
const gehaald=new Map();
const s=createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join(DIST,p);if(!extname(f))f=join(f,'index.html');readFile(f,(e,b)=>{if(e){r.writeHead(404);return r.end('x');}if(extname(f)==='.woff2')gehaald.set(p,b.length);r.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});r.end(b);});});
await new Promise(r=>s.listen(8093,r));
const alle=globSync(join(DIST,'**/index.html')).map(f=>f.slice(DIST.length).replace(/\\/g,'/').replace(/\/index\.html$/,'')||'/');
const EXE='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b=await chromium.launch(existsSync(EXE)?{executablePath:EXE}:{});
const perPagina=new Map();
for(const pad of alle){
  const ctx=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const p=await ctx.newPage();
  const woff=new Set();
  p.on('response',(r)=>{ if(r.url().endsWith('.woff2')) woff.add(new URL(r.url()).pathname); });
  try{
    await p.goto(`http://127.0.0.1:8093${pad}`,{waitUntil:'load',timeout:20000});
    await p.evaluate(()=>document.fonts.ready);
    await p.waitForTimeout(200);
    const gebruikt=await p.evaluate(()=>{
      const f=new Set();
      for(const el of document.querySelectorAll('body *')){
        const r=el.getBoundingClientRect();
        if(r.width===0||r.height===0) continue;
        if(!el.textContent||!el.textContent.trim()) continue;
        f.add(getComputedStyle(el).fontFamily.split(',')[0].replace(/["']/g,'').trim());
      }
      return [...f];
    });
    perPagina.set(pad,{woff:[...woff],gebruikt});
  }catch(e){}
  await ctx.close();
}
await b.close(); s.close();
const alleWoff=new Map(), alleFam=new Map();
for(const [pad,v] of perPagina){
  for(const w of v.woff) alleWoff.set(w,(alleWoff.get(w)||0)+1);
  for(const f of v.gebruikt) alleFam.set(f,(alleFam.get(f)||0)+1);
}
console.log(`${perPagina.size} pagina's\n\nfamilies die ergens zichtbaar tekst zetten:`);
for(const [f,n] of [...alleFam].sort((a,b)=>b[1]-a[1])) console.log(`  ${String(n).padStart(3)} pagina's  ${f}`);
console.log('\nwoff2 die daadwerkelijk gehaald worden:');
let tot=0;
for(const [w,n] of [...alleWoff].sort((a,b)=>b[1]-a[1])){
  const kb=existsSync(join(DIST,w))?Math.round(statSync(join(DIST,w)).size/1024):0;
  tot+=kb;
  console.log(`  ${String(n).padStart(3)} pagina's  ${String(kb).padStart(3)} kB  ${basename(w)}`);
}
console.log(`\n  ${alleWoff.size} bestanden, samen ${tot} kB`);
const opSchijf=globSync(join(DIST,'_astro','*.woff2'));
const nietGehaald=opSchijf.map(f=>'/_astro/'+basename(f)).filter(w=>!alleWoff.has(w));
console.log(`\nop schijf maar door geen enkele pagina gehaald: ${nietGehaald.length} van ${opSchijf.length}`);
let dood=0; for(const w of nietGehaald) dood+=Math.round(statSync(join(DIST,w)).size/1024);
console.log(`  samen ${dood} kB (worden meegedeployed, nooit opgevraagd)`);
for(const w of nietGehaald.slice(0,12)) console.log(`    ${basename(w)}`);
if(nietGehaald.length>12) console.log(`    … en nog ${nietGehaald.length-12}`);
