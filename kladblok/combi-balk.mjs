/**
 * De lifestyle-balk onderaan: verschijnt hij alleen op stap 2, begint hij
 * dicht, en klapt hij open en weer dicht?
 *
 * Lucas, 17 september 2026: *"Ik wil de lifestyle als banner pop up onderaan
 * het scherm krijgen die de klant tijdens product invullen kan inklappen en
 * uitklappen."*
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
const pg=await b.newPage({viewport:{width:1280,height:900}});
await pg.goto(`${base}/nl/start/catalog`,{waitUntil:'domcontentloaded'});
await pg.waitForTimeout(1800);
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});

const kijk = () => pg.evaluate(() => {
  const balk = document.querySelector('[data-pl-combi-balk]');
  if (!balk) return 'balk ontbreekt';
  const r = balk.getBoundingClientRect();
  const stap = [...document.querySelectorAll('[data-pl-step]')].find((s) => s.classList.contains('is-current'));
  return {
    stap: stap ? stap.dataset.plStep : '?',
    zichtbaar: !balk.hidden && r.height > 0,
    open: balk.classList.contains('is-open'),
    hoog: Math.round(r.height),
    onderaanVastgeplakt: getComputedStyle(balk).position === 'fixed' && Math.round(r.bottom) === 900,
    regel: (balk.querySelector('[data-pl-combi-woord]')||{}).textContent + ' · ' + (balk.querySelector('[data-pl-combi-prijs]')||{}).textContent,
    blokInStap1: !!document.querySelector('[data-pl-step="1"] [data-pl-combi]'),
  };
});

/* Aantal invullen zodat er bedragen zijn, en dan naar stap 2. */
/* Het ZICHTBARE getalveld invullen en niet alleen de verborgen select: de poort
   van stap 1 kijkt naar het veld dat de klant bedient. Er staat er meer dan één
   met dat id op de pagina (per stap één), dus die van de stap die in beeld is. */
await pg.evaluate(() => {
  const stap = document.querySelector('[data-pl-step="1"]');
  const veld = stap && stap.querySelector('#pl-qty-n');
  if (veld) {
    veld.value = '3';
    veld.dispatchEvent(new Event('input', { bubbles: true }));
    veld.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const s = document.querySelector('select[name="products"]');
  if (s) { s.value = '3'; s.dispatchEvent(new Event('change', { bubbles: true })); }
});
await pg.waitForTimeout(400);
console.log('stap 1:', await kijk());

/* De Verder-knop van stap 1 — elke stap heeft er een, dus die van de stap die
   nu in beeld staat. */
await pg.evaluate(() => {
  const stap = document.querySelector('[data-pl-step].is-current') || document.querySelector('[data-pl-step="1"]');
  const k = stap && stap.querySelector('[data-pl-next]');
  if (k) k.click();
});
await pg.waitForTimeout(900);
const klacht = await pg.evaluate(() => {
  const e = document.querySelector('[data-pl-step-error]:not([hidden])');
  const veld = document.querySelector('[data-pl-step].is-current :invalid');
  return { melding: e ? e.textContent.trim() : '', eersteOngeldig: veld ? (veld.name || veld.id) : '' };
});
if (klacht.melding || klacht.eersteOngeldig) console.log('poort hield tegen:', klacht);
console.log('\nstap 2:', await kijk());

await pg.evaluate(() => { const k = document.querySelector('[data-pl-combi-schuif]'); if (k) k.click(); });
await pg.waitForTimeout(400);
console.log('\nna openklappen:', await kijk());
await pg.screenshot({ path: 'kladblok/combi-balk.png' });

await pg.evaluate(() => { const k = document.querySelector('[data-pl-combi-schuif]'); if (k) k.click(); });
await pg.waitForTimeout(400);
console.log('\nna dichtklappen:', await kijk());
await pg.screenshot({ path: 'kladblok/combi-balk-dicht.png' });

await b.close(); server.close();
