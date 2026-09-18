/* De streepjes in de balk: één per verplichte foto, vol als hij binnen is.
   Twee runs — zes producten (streepjes aan) en twaalf (streepjes uit). */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json','.txt':'text/plain'};
const srv=createServer((req,res)=>{let p=join('dist',decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(req.url.split('?')[0]==='/api/upload'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,file:{key:'nep',name:'proef.png',bytes:1234}}));return;}
 if(!existsSync(p)){res.writeHead(404);res.end('nee');return;}
 res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>srv.listen(4329,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

const kijk = (pg) => pg.evaluate(() => {
  const knoppen=[...document.querySelectorAll('[data-pl-rail-knop]')];
  return knoppen.map((k)=>{
    const strip=k.querySelector('[data-pl-rail-vakjes]');
    const i=strip?[...strip.children]:[];
    const r=k.getBoundingClientRect();
    return {
      vakjes:i.length,
      vol:i.filter((e)=>e.classList.contains('is-vol')).length,
      zichtbaar:strip?getComputedStyle(strip).display:'-',
      af:k.classList.contains('is-af'), nu:k.classList.contains('is-nu'),
      breed:Math.round(r.width), hoog:Math.round(r.height),
    };
  });
});

const vulVak = (pg, id) => pg.evaluate(async (vakId) => {
  const kaart=[...document.querySelectorAll('.pu-card')].find((k)=>!k.hidden);
  const vak=kaart && kaart.querySelector(`[data-pu-slot="${vakId}"]`);
  const inp=vak && vak.querySelector('.pu-slot-input');
  if(!inp) return 'geen vak '+vakId;
  const cv=document.createElement('canvas'); cv.width=1200; cv.height=1200;
  const ctx=cv.getContext('2d'); ctx.fillStyle='#888'; ctx.fillRect(0,0,1200,1200);
  const blob=await new Promise((r)=>cv.toBlob(r,'image/png'));
  const dt=new DataTransfer(); dt.items.add(new File([blob],`${vakId}.png`,{type:'image/png'}));
  inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true}));
  return 'ok';
}, id);

async function run(aantal, breed, schot) {
  const pg=await b.newPage({viewport:{width:breed,height:1000}});
  const fouten=[];
  pg.on('console',(m)=>{ if(m.type()==='error') fouten.push(m.text()); });
  pg.on('pageerror',(e)=>fouten.push('pageerror: '+e.message));
  await pg.goto('http://localhost:4329/nl/start/catalog/',{waitUntil:'networkidle'});
  await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
  await pg.evaluate((n)=>{
    const el=[...document.querySelectorAll('#pl-qty-n, [data-pl-qty-input]')].find((x)=>x.offsetParent!==null);
    if(!el) return; el.value=String(n);
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
  }, aantal);
  await pg.waitForTimeout(500);
  await pg.locator('.sr1-keuze').first().selectOption({index:1}).catch(()=>{});
  await pg.locator('[data-pl-next]:visible').first().click({timeout:5000}).catch(()=>{});
  await pg.waitForTimeout(900);

  console.log(`\n── ${aantal} producten, ${breed}px ───────────────────────────`);
  console.log('leeg :', JSON.stringify((await kijk(pg))[0]));
  console.log('alle :', (await kijk(pg)).length, 'knoppen');

  await vulVak(pg,'front'); await pg.waitForTimeout(700);
  console.log('na front :', JSON.stringify((await kijk(pg))[0]));
  await vulVak(pg,'back'); await pg.waitForTimeout(700);
  console.log('na back  :', JSON.stringify((await kijk(pg))[0]));
  await vulVak(pg,'detail'); await pg.waitForTimeout(700);
  console.log('na detail:', JSON.stringify((await kijk(pg))[0]));
  console.log('overslaan:', await pg.evaluate(() => {
    const kaart=[...document.querySelectorAll('.pu-card')].find((k)=>!k.hidden);
    const vak=kaart && kaart.querySelector('[data-pu-slot="worn"]');
    const knop=vak && [...vak.querySelectorAll('button')].find((b)=>/over/i.test(b.textContent||''));
    if(!knop) return 'geen knop'; knop.click(); return 'geklikt';
  }));
  await pg.waitForTimeout(700);
  console.log('na skip  :', JSON.stringify((await kijk(pg))[0]));

  if (schot) {
    const rij=pg.locator('[data-pl-rij]').first();
    await rij.scrollIntoViewIfNeeded().catch(()=>{});
    await pg.waitForTimeout(300);
    await rij.screenshot({path:schot,timeout:8000}).catch((e)=>console.log('schot mislukt:',e.message.split('\n')[0]));
  }
  console.log('consolefouten:', fouten.length?fouten.slice(0,3):'geen');
  await pg.close();
}

await run(6, 1280, 'kladblok/rail-vakjes-1280.png');
await run(12, 1280, 'kladblok/rail-vakjes-12.png');
await run(6, 430, 'kladblok/rail-vakjes-430.png');
await b.close(); srv.close();
