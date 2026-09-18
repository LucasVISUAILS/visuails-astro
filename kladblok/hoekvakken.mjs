/**
 * Krijgt elke bestelde hoek een eigen verplicht uploadvak op elk product?
 * Lucas, 16 september 2026: *"krijgt dan een foto-upload erbij specifiek voor
 * die angle, verplicht, zodat wij zeker weten wat hij er precies mee bedoelt."*
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:1100}});
await pg.goto(`${base}/nl/start/catalog`,{waitUntil:'domcontentloaded'});
await pg.waitForTimeout(1800);
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.evaluate(()=>{const s=document.querySelector('select[name="products"]');if(s){s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));}
  document.querySelectorAll('[data-pl-step]').forEach(st=>{if(st.dataset.plStep==='2'){st.hidden=false;st.style.display='block';st.classList.add('is-current');}});});
await pg.waitForTimeout(500);

const kijk = () => pg.evaluate(() => {
  const kaart = document.querySelector('.pu-card');
  const vak = (v) => ({
    id: v.dataset.puSlot,
    naam: (v.querySelector('.pu-slot-name')||{}).textContent||'',
    eis: (v.querySelector('.pu-slot-eis')||{}).textContent||'',
    verplicht: v.dataset.req === '1',
  });
  const veld = document.querySelector('input[name="extra_slots"]');
  return {
    hoekenAan: [...document.querySelectorAll('[data-pl-angles] input[data-pl-angle]:checked')].map(i=>i.name),
    vakken: kaart ? [...kaart.querySelectorAll('[data-pu-slot]')].map(vak) : [],
    kaart2Vakken: document.querySelectorAll('.pu-card')[1]
      ? [...document.querySelectorAll('.pu-card')[1].querySelectorAll('[data-pu-slot]')].map(v=>v.dataset.puSlot) : [],
    koppeling: veld ? veld.value : '(geen veld)',
    reden: (document.querySelector('[data-pl-nav-reden]')||{}).textContent||'',
  };
});

const zet = (i, aan) => pg.evaluate(([n, a]) => {
  const hs = document.querySelectorAll('[data-pl-angles] input[data-pl-angle]');
  if (hs[n]) { hs[n].checked = a; hs[n].dispatchEvent(new Event('change', { bubbles: true })); }
}, [i, aan]);

console.log('— geen hoeken —'); console.log(await kijk());
await zet(0, true); await pg.waitForTimeout(400);
console.log('\n— hoek 1 aan —'); console.log(await kijk());
await zet(3, true); await pg.waitForTimeout(400);
console.log('\n— en hoek 4 erbij —'); console.log(await kijk());
await zet(0, false); await pg.waitForTimeout(400);
console.log('\n— hoek 1 er weer af (hoek 4 moet zijn nummer HOUDEN) —'); console.log(await kijk());

/* Een plaat van het VENSTER en niet van het paneel: het paneel is met twee
   kaarten hoger dan wat Playwright in één keer kan schieten. */
/* Alleen de kaarten in beeld brengen: stap 1 staat er in deze proef ook nog,
   dus een plaat van de hele pagina is grotendeels het verkeerde scherm. */
await pg.evaluate(() => {
  document.querySelectorAll('[data-pl-step]').forEach((st) => {
    if (st.dataset.plStep !== '2') st.style.display = 'none';
  });
  window.scrollTo(0, 0);
});
await pg.waitForTimeout(400);
await pg.screenshot({ path: 'kladblok/hoekvakken.png', fullPage: true });

await b.close(); server.close();
