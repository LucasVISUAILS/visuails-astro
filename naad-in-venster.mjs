/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * NAAD-IN-VENSTER — dezelfde naad, op drie hoogtes in het scherm
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `naden.mjs` gaat een opname rij voor rij af en vindt waar twee buurrijen
 * springen. Dat is de goede meting voor een LIJN. Voor een naad die uit een
 * VERGISSING IN EEN KLEUR ontstaat is hij blind, en wel om een reden die de
 * hele site raakt: `body::before` staat op het VENSTER en niet op de pagina.
 * Er zit een lamp linksboven in en een vignet omheen, dus de zichtbare grond
 * loopt van ongeveer 20 bovenin het scherm naar 15 onderin.
 *
 * Een sectie die zijn rand met een VASTE kleur verbergt, verbergt hem dus maar
 * op één scrolpositie. Dit gereedschap laat dat zien door dezelfde naad drie
 * keer te meten: met zijn bovenrand op 150, 400 en 700 pixels in het venster.
 * Klopt de kleur, dan zijn de drie profielen vlak; klopt hij niet, dan zie je
 * hem één keer te licht en één keer te donker.
 *
 * Zo is 23 augustus 2026 de "rare gloed met een harde lijn" op /portal gevonden:
 *
 *   naad op 150 px  —  grond erboven 19,9  · naadrij 18,3  · sectie 10,7
 *   naad op 400 px  —  grond erboven 15,8  · naadrij 17,0  · sectie 10,7
 *   naad op 700 px  —  grond erboven 14,9  · naadrij 17,1  · sectie 10,7
 *
 * De naadrij stond dus onderin het scherm 2,2 waarden LICHTER dan de grond
 * ernaast: een lichte streep, gemaakt door de reparatie die hem moest weghalen.
 *
 * ── GEBRUIK ────────────────────────────────────────────────────────────────
 *
 *   node naad-in-venster.mjs /portal/ .pp-close
 *   node naad-in-venster.mjs /studio/ .sp-hero
 *
 * Het tweede argument is een selector; gemeten wordt zijn BOVENRAND. De cijfers
 * zijn luminantie van de linkerkantlijn (x 24-160), glad gemaakt over zeven
 * rijen zodat de korrel de uitslag niet stuurt.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PNG } from 'pngjs';
import { browserPad } from './scripts/lib/browserpad.mjs';
const MIME={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.mp4':'video/mp4'};
const srv=createServer(async(req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);let f=join('dist',p);
 try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{if(!extname(f))f=join('dist',p,'index.html');}
 try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end('nee');}});
await new Promise(r=>srv.listen(4493,'127.0.0.1',r));
const route=process.argv[2]||'/portal/'; const sel=process.argv[3]||'.pp-close';
const W=1600,H=1000;
const br=await chromium.launch({executablePath:browserPad()});
const pg=await br.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
await pg.goto(`http://127.0.0.1:4493${route}`,{waitUntil:'networkidle'});
await pg.addStyleTag({content:`*{color:transparent!important;text-shadow:none!important}
.cc,.convbar,.wa-launcher,header.site-header,.pl-total-bar{display:none!important}
*,*::before,*::after{animation:none!important;transition:none!important}`});
const lum=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
const top=await pg.evaluate(s=>{const e=document.querySelector(s);return Math.round(e.getBoundingClientRect().top+window.scrollY);},sel);
for (const plek of [150, 400, 700]) {
  await pg.evaluate(y=>window.scrollTo(0,y), top-plek);
  await pg.waitForTimeout(350);
  const buf=await pg.screenshot(); const png=PNG.sync.read(buf);
  const rij=(y)=>{let s=0,n=0;for(let x=24;x<160;x++){const i=(y*W+x)*4;s+=lum(png.data[i],png.data[i+1],png.data[i+2]);n++;}return s/n;};
  const glad=(y)=>{let s=0;for(let k=-3;k<=3;k++)s+=rij(y+k);return s/7;};
  console.log(`\n${route} ${sel} — bovenrand op vensterhoogte ${plek}`);
  const uit=[];
  for(let d=-120;d<=200;d+=10){ const y=plek+d; if(y<5||y>H-6)continue; uit.push(`${d>0?'+':''}${d}:${glad(y).toFixed(1)}`); }
  console.log('  '+uit.join('  '));
}
await br.close(); srv.close();
