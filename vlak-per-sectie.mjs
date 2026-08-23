/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAK-PER-SECTIE — het NIVEAU van elk vlak, niet de sprong ertussen
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `naden.mjs` meet de SPRONG tussen twee buurrijen. Er is een tweede fout die
 * daar niet in te zien is: een sectie die over zijn hele hoogte een paar
 * waarden donkerder is dan de pagina eromheen, met het verschil netjes over
 * 130 pixels uitgesmeerd. Rij voor rij is dat 0,04 per rij — ver onder elke
 * drempel — maar het oog ziet een donkere plaat met een lichte rand.
 *
 * Dit gereedschap meet daarom per sectie het GEMIDDELDE van de linkerkantlijn:
 * de kern (met de randen eraf) en de bovenste twintig rijen apart. Twee secties
 * naast elkaar horen dezelfde kern te hebben; verschilt die meer dan een paar
 * waarden, dan schildert er een deksel over de verlichting van body::before.
 *
 * LET OP BIJ HET LEZEN: dit maakt één opname van de hele pagina, en in zo'n
 * opname schildert een `position: fixed` laag alleen op het eerste scherm. Alles
 * onder de eerste vensterhoogte leest dus de KALE paginakleur (8,93) in plaats
 * van de verlichte grond. Dat is precies wat je wilt om een deksel te vinden —
 * een sectie die daar NIET op 8,93 staat, schildert zelf iets — maar het is
 * niet de kleur die een bezoeker ziet. Gebruik naad-in-venster.mjs zodra je wilt
 * weten hoe een rand er in het echt uitziet.
 *
 * ── GEBRUIK ────────────────────────────────────────────────────────────────
 *
 *   node vlak-per-sectie.mjs /portal/ /studio/ /
 *   W=1200 node vlak-per-sectie.mjs /
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PNG } from 'pngjs';
import { browserPad } from './scripts/lib/browserpad.mjs';
const MIME = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4' };
const srv = createServer(async (req,res)=>{ let p=decodeURIComponent(req.url.split('?')[0]); let f=join('dist',p);
  try{ if((await stat(f)).isDirectory()) f=join(f,'index.html'); }catch{ if(!extname(f)) f=join('dist',p,'index.html'); }
  try{ const b=await readFile(f); res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404);res.end('nee');} });
await new Promise(r=>srv.listen(4492,'127.0.0.1',r));
const routes = process.argv.slice(2); const W = Number(process.env.W||1600);
const br = await chromium.launch({ executablePath: browserPad() });
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
for (const route of routes) {
  const pg = await br.newPage({ viewport:{width:W,height:1000}, deviceScaleFactor:1 });
  await pg.goto(`http://127.0.0.1:4492${route}`,{waitUntil:'networkidle'});
  await pg.addStyleTag({content:`*{color:transparent!important;text-shadow:none!important}
  .cc,.convbar,.wa-launcher,header.site-header,.pl-total-bar{display:none!important}
  *,*::before,*::after{animation:none!important;transition:none!important}`});
  await pg.evaluate(()=>window.scrollTo(0,0)); await pg.waitForTimeout(400);
  const secties = await pg.evaluate(()=>[...document.querySelectorAll('main > *')].map((el,i)=>{
    const r=el.getBoundingClientRect(); return {i, tag:el.tagName.toLowerCase(), cls:el.className&&el.className.baseVal===undefined?String(el.className):'',
      top:Math.round(r.top+window.scrollY), h:Math.round(r.height)}; }));
  const buf = await pg.screenshot({ fullPage:true });
  const png = PNG.sync.read(buf); const H=png.height;
  console.log(`\n═══ ${route}  (${W}×${H}) ═══`);
  const meet=(y0,y1)=>{ let s=0,n=0; const x0=24,x1=Math.min(150,W);
    for(let y=Math.max(0,y0);y<Math.min(H,y1);y++) for(let x=x0;x<x1;x++){const i=(y*W+x)*4;s+=lum(png.data[i],png.data[i+1],png.data[i+2]);n++;}
    return n?s/n:NaN; };
  for (const s of secties) {
    const kern = meet(s.top+Math.min(200,s.h*0.35), s.top+s.h-Math.min(200,s.h*0.35));
    const boven = meet(s.top+4, s.top+24);
    console.log(`${String(s.top).padStart(6)} +${String(s.h).padStart(5)}  kern ${kern.toFixed(2).padStart(6)}  rand ${boven.toFixed(2).padStart(6)}   ${s.cls.slice(0,72)}`);
  }
  await pg.close();
}
await br.close(); srv.close();
