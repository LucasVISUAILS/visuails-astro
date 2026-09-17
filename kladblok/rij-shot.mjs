/* De rij in het ECHTE bestelformulier, gedreven zoals een klant hem gebruikt. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json','.txt':'text/plain'};
const srv=createServer((req,res)=>{let p=join('dist',decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 /* De uploadroute is een Worker en staat niet in dist/. Voor deze toets is één
    antwoord genoeg: {ok:true}. Zonder deze stub zet elke upload het vakje op
    'failed' en is er niets te toetsen aan de poort. */
 if(req.url.split('?')[0]==='/api/upload'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,key:'nep'}));return;}
 if(!existsSync(p)){res.writeHead(404);res.end('nee');return;}
 res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>srv.listen(4321,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const breed = Number(process.argv[2] || 1280);
const pg=await b.newPage({viewport:{width:breed,height:1000}});
const fouten=[];
pg.on('console',(m)=>{ if(m.type()==='error') fouten.push(m.text()); });
pg.on('pageerror',(e)=>fouten.push('pageerror: '+e.message));
await pg.goto('http://localhost:4321/nl/start/catalog/',{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});

/* Stap 1: zes producten. */
/* Het aantal via de DOM en niet via Playwright's fill(): er staan meerdere
   elementen met dit id op de pagina (elke stap rendert zijn eigen kop) en de
   zichtbaarheidscontrole van fill() struikelt daarover. Wat we willen toetsen
   is de rij, niet het invulveld. */
const gezet = await pg.evaluate(() => {
  const el = [...document.querySelectorAll('#pl-qty-n, [data-pl-qty-input]')].find((n) => n.offsetParent !== null);
  if (!el) return 'geen veld';
  el.value = '6';
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
});
console.log('aantal gezet op      :', gezet);
await pg.waitForTimeout(600);
/* Stijl kiezen zodat stap 1 door kan. */
await pg.locator('.sr1-keuze').first().selectOption({index:1}).catch(()=>{});
/* Naar stap 2: de zichtbare "verder"-knop van de stap waar we nu staan. */
const verder = pg.locator('[data-pl-next]:visible').first();
console.log('zichtbare verder-knop:', await verder.count());
await verder.click({timeout:5000}).catch((e)=>console.log('klik mislukt:', e.message.split('\n')[0]));
await pg.waitForTimeout(900);

console.log('stappen zichtbaar    :', await pg.locator('[data-pl-step]:not([hidden])').count());
console.log('kaarten              :', await pg.locator('.pu-card').count());

console.log('knop [data-pl-next]  :', await pg.locator('[data-pl-next]').count());
const rij = pg.locator('[data-pl-rij]').first();
const zichtbaar = await rij.isVisible().catch(()=>false);
console.log('rij zichtbaar        :', zichtbaar);
if (zichtbaar) {
  console.log('telregel             :', (await pg.locator('[data-pl-rij-tel]').first().textContent()||'').trim());
  console.log('vakjes in de balk    :', await pg.locator('[data-pl-rail] li').count());
  console.log('kaarten in de DOM    :', await pg.locator('.pu-card').count());
  console.log('zichtbare kaarten    :', await pg.locator('.pu-card:not([hidden])').count());
  console.log('vorige uit           :', await pg.locator('[data-pl-vorige]').first().isDisabled());
  console.log('volgende uit         :', await pg.locator('[data-pl-volgende]').first().isDisabled());
  console.log('reden                :', (await pg.locator('[data-pl-nav-reden]').first().textContent()||'').trim());
  /* Het uploadpaneel en niet de hele stap: de stappen dragen een animatie en
     Playwright wacht dan tot in de eeuwigheid op "stabiel". */
  const paneel = pg.locator('[data-pu-panel="cards"]').first();
  await paneel.scrollIntoViewIfNeeded().catch(()=>{});
  await pg.waitForTimeout(400);
  await paneel.screenshot({path:`kladblok/rij-${breed}.png`, timeout: 8000}).catch((e)=>console.log('schermafdruk mislukt:', e.message.split('\n')[0]));
}
/* De poort: vul de drie verplichte vakjes van kaart 1 en kijk of de knop aangaat. */
const vulKaart = async () => pg.evaluate(async () => {
  const kaart = [...document.querySelectorAll('.pu-card')].find((k) => !k.hidden);
  if (!kaart) return 'geen kaart';
  /* Een ECHTE foto van 1200 × 1200. De uploadcontrole weigert alles onder
     MIN_LANGE_ZIJDE (1000 px) — een 1×1-gif komt niet eens tot de server, en
     dan toets je de poort op de verkeerde reden. */
  const cv = document.createElement('canvas');
  cv.width = 1200; cv.height = 1200;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 1200, 1200);
  ctx.fillStyle = '#222'; ctx.fillRect(300, 300, 600, 600);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  let n = 0;
  for (const inp of kaart.querySelectorAll('.pu-slot-input')) {
    const dt = new DataTransfer();
    dt.items.add(new File([blob], `foto${++n}.png`, { type: 'image/png' }));
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
  }
  return n;
});
console.log('vakjes gevuld        :', await vulKaart());
await pg.waitForTimeout(1500);
console.log('slottoestanden       :', await pg.evaluate(() => {
  const kaart = [...document.querySelectorAll('.pu-card')].find((k) => !k.hidden);
  return [...kaart.querySelectorAll('.pu-slot')].map((s) => s.getAttribute('data-state') || '?').join(', ');
}));
console.log('na vullen — volgende uit:', await pg.locator('[data-pl-volgende]').first().isDisabled());
console.log('na vullen — reden       :', (await pg.locator('[data-pl-nav-reden]').first().textContent()||'').trim());
console.log('na vullen — telregel    :', (await pg.locator('[data-pl-rij-tel]').first().textContent()||'').trim());
await pg.locator('[data-pl-volgende]').first().click().catch((e)=>console.log('klik volgende mislukt:', e.message.split('\n')[0]));
await pg.waitForTimeout(500);
console.log('na volgende — telregel  :', (await pg.locator('[data-pl-rij-tel]').first().textContent()||'').trim());
console.log('na volgende — vorige uit:', await pg.locator('[data-pl-vorige]').first().isDisabled());
console.log('zichtbare kaarten       :', await pg.locator('.pu-card:not([hidden])').count());
console.log('inklapper zichtbaar     :', await pg.locator('.pu-card:not([hidden]) .pu-toggle:not([hidden])').count());
/* ── DE POORT VAN LUCAS: DRIE FOTO'S PLUS EEN KEUZE ─────────────────────────
   Op kaart 2 alleen de drie VERPLICHTE vakjes vullen. De knop hoort dan nog
   steeds uit te staan, want de draagfoto is nog niet beantwoord; pas na "Sla
   deze over" mag hij aan. Dat is letterlijk wat Lucas vroeg. */
const vulDrie = async () => pg.evaluate(async () => {
  const kaart = [...document.querySelectorAll('.pu-card')].find((k) => !k.hidden);
  const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 1200;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#777'; ctx.fillRect(0,0,1200,1200);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const vakken = [...kaart.querySelectorAll('.pu-slot')];
  let n = 0;
  for (const vak of vakken) {
    const id = vak.getAttribute('data-pu-slot') || '';
    if (id === 'worn') continue;
    const inp = vak.querySelector('.pu-slot-input');
    if (!inp) continue;
    const dt = new DataTransfer();
    dt.items.add(new File([blob], `${id || 'x'}${++n}.png`, { type: 'image/png' }));
    inp.files = dt.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
  }
  return n;
});
console.log('kaart 2 — drie gevuld   :', await vulDrie());
await pg.waitForTimeout(1200);
console.log('kaart 2 — volgende uit  :', await pg.locator('[data-pl-volgende]').first().isDisabled());
console.log('kaart 2 — reden         :', (await pg.locator('[data-pl-nav-reden]').first().textContent()||'').trim());
/* En nu overslaan. */
const overgeslagen = await pg.evaluate(() => {
  const kaart = [...document.querySelectorAll('.pu-card')].find((k) => !k.hidden);
  const vak = kaart.querySelector('[data-pu-slot="worn"]');
  const knop = vak && [...vak.querySelectorAll('button')].find((b) => /over/i.test(b.textContent || ''));
  if (!knop) return 'geen overslaan-knop';
  knop.click();
  return knop.textContent.trim();
});
console.log('overslaan-knop          :', overgeslagen);
await pg.waitForTimeout(500);
console.log('na overslaan — uit      :', await pg.locator('[data-pl-volgende]').first().isDisabled());
console.log('na overslaan — telregel :', (await pg.locator('[data-pl-rij-tel]').first().textContent()||'').trim());
console.log('consolefouten        :', fouten.length ? fouten.slice(0,3) : 'geen');
await b.close(); srv.close();
