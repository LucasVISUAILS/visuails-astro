/**
 * De zelfbedachte hoek: staat hij als vierde tegel in elke groep, is zijn
 * omschrijving verplicht, en draagt het uploadvak in stap 2 de tekst die de
 * klant zelf intypt?
 *
 * Lucas, 17 september 2026: *"Custom angle mist ook."*
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
await pg.evaluate(()=>{
  const s=document.querySelector('select[name="products"]');
  if(s){s.value='2';s.dispatchEvent(new Event('change',{bubbles:true}));}
  document.querySelectorAll('[data-pl-step]').forEach(st=>{
    if(st.dataset.plStep==='2'){st.hidden=false;st.style.display='block';st.classList.add('is-current');}
  });
});
/* De hoekenkiezer zit in een vouw; dicht is niets erin zichtbaar en kan
   Playwright er ook niet in typen. Openzetten zoals een klant dat doet. */
await pg.evaluate(() => {
  const d = document.querySelector('[data-pl-angles]').closest('details');
  if (d) d.open = true;
});
await pg.waitForTimeout(600);

const kijk = () => pg.evaluate(() => {
  const box = document.querySelector('[data-pl-angles]');
  const veld = document.querySelector('input[name="angle_note_eigen-ground"]');
  const kaart = document.querySelector('.pu-card');
  const groepen = [...box.querySelectorAll('.pl-hoek-groep')].map((g) => ({
    naam: (g.querySelector('.pl-hoek-groep-h')||{}).textContent||'',
    tegels: [...g.querySelectorAll('.pl-hoek-naam')].map((n) => n.textContent.trim()),
  }));
  return {
    groepen,
    eigenVeldZichtbaar: veld ? veld.offsetParent !== null : 'geen veld',
    eigenVeldVerplicht: veld ? veld.required : '—',
    vakkenOpKaart: kaart ? [...kaart.querySelectorAll('[data-pu-slot]')].map((v) => ({
      id: v.dataset.puSlot, naam: (v.querySelector('.pu-slot-name')||{}).textContent||'',
    })) : [],
    koppeling: (document.querySelector('input[name="extra_slots"]')||{}).value || '(geen)',
  };
});

console.log('— bij het openen —');
const a = await kijk();
console.log('groepen:', JSON.stringify(a.groepen, null, 1));
console.log('eigen veld zichtbaar:', a.eigenVeldZichtbaar, '· verplicht:', a.eigenVeldVerplicht);

await pg.evaluate(() => {
  const v = document.querySelector('input[name="angle_eigen-ground"]');
  v.checked = true; v.dispatchEvent(new Event('change', { bubbles: true }));
});
await pg.waitForTimeout(400);
const bb = await kijk();
console.log('\n— na aanvinken —');
console.log('veld zichtbaar:', bb.eigenVeldZichtbaar, '· verplicht:', bb.eigenVeldVerplicht);
console.log('vakken:', bb.vakkenOpKaart.map(v=>`${v.id}=${v.naam}`).join(', '));
console.log('koppeling:', bb.koppeling);

await pg.evaluate(() => {
  const v = document.querySelector('input[name="angle_note_eigen-ground"]');
  v.value = 'de binnenkant van de tas, plat';
  v.dispatchEvent(new Event('input', { bubbles: true }));
});
await pg.waitForTimeout(400);
const cc = await kijk();
console.log('\n— na het intypen van de omschrijving —');
console.log('vakken:', cc.vakkenOpKaart.map(v=>`${v.id}=${v.naam}`).join(', '));

await pg.evaluate(() => { const g = document.querySelector('[data-pl-angles]'); if (g) g.scrollIntoView({ block: 'center' }); });
await pg.waitForTimeout(300);
await pg.screenshot({ path: 'kladblok/eigen-hoek.png' });
await b.close(); server.close();
