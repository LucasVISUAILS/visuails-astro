/* Een echte doorloop van de site: klikken zoals een bezoeker klikt. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const T={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2','.mp4':'video/mp4','.ico':'image/x-icon'};
const srv=createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);let f=join('dist',p);
 if(existsSync(f)&&statSync(f).isDirectory())f=join(f,'index.html');
 if(!existsSync(f)){s.writeHead(404);return s.end('nope');}
 s.writeHead(200,{'Content-Type':T[extname(f)]||'application/octet-stream'});createReadStream(f).pipe(s);});
await new Promise(r=>srv.listen(0,r));
const BASE=`http://127.0.0.1:${srv.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const page=await b.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
const fouten=[];
page.on('pageerror', e=>fouten.push('JS: '+String(e.message).slice(0,120)));
page.on('console', m=>{ if(m.type()==='error' && !/404|Failed to load resource/.test(m.text())) fouten.push('console: '+m.text().slice(0,120)); });

const pad = () => new URL(page.url()).pathname + new URL(page.url()).search;
async function ga(u){ await page.goto(BASE+u,{waitUntil:'load'}); await page.waitForTimeout(700); }
async function klikKnop(sel, label){
  const el = await page.$(sel);
  if(!el){ console.log('   ✘ niet gevonden:', sel); return null; }
  const tekst = (await el.textContent()||'').trim();
  const voor = pad();
  await el.evaluate((e)=>e.click()); await page.waitForTimeout(1200);
  console.log(`   ${label}: "${tekst}"  ${voor} → ${pad()}`);
  return pad();
}

console.log('\n══ 1 · de weg die Lucas beschreef: dienstpagina → bestellen ══');
for (const [u, naam] of [['/catalog','Catalog'],['/lifestyle','Lifestyle'],['/video','Video'],['/custom-models','Merkmodel'],['/plans','Abonnement']]) {
  await ga(u);
  await klikKnop('main .btn-primary.btn-lg', naam);
}

console.log('\n══ 2 · stijlpagina → bestellen, met de stijl al gekozen ══');
for (const u of ['/catalog/classic','/lifestyle/dunes','/lifestyle/glow','/video/motion']) {
  await ga(u);
  await klikKnop('main .btn-primary.btn-lg', u);
  const st = await page.evaluate(()=>{const r=document.querySelector('input[name="style"]:checked');return r?r.value:null;});
  if (st) console.log('      stijl aangevinkt:', st);
}

console.log('\n══ 3 · de keuzerij: van catalog naar lifestyle en terug ══');
await ga('/catalog');
await klikKnop('.svcsw a[href="/lifestyle/"]', 'naar Lifestyle');
await klikKnop('.svcsw a[href="/catalog/"]', 'terug naar Catalog');
await klikKnop('.svcsw a[href="/start/complete/"]', 'naar Allebei');

console.log('\n══ 4 · het menu, na een zachte navigatie ══');
await ga('/');
await page.$eval('a[href="/pricing/"]', e=>e.click()); await page.waitForTimeout(1100);
await page.$eval('.nav-trigger', e=>e.click()); await page.waitForTimeout(400);
const items = await page.evaluate(()=>[...document.querySelectorAll('.has-menu:first-child .nav-menu a, .has-menu:first-child .nav-menu .mi-off')].map(e=>e.querySelector('.mi-title')?.textContent.trim()));
console.log('   "Wat we maken" bevat:', items.filter(Boolean).join(' · '));

console.log('\n══ 5 · de zwevende notitie ══');
await ga('/');
const nt = await page.$('[data-note-btn]');
await nt.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
await nt.hover(); await page.waitForTimeout(400);
const zicht = await page.evaluate(()=>{
  const b=document.querySelector('[data-note-btn]'); const p=b.nextElementSibling;
  const cs=getComputedStyle(p); const r=p.getBoundingClientRect();
  return {zichtbaar: cs.visibility, positie: cs.position, breedte: Math.round(r.width), binnenbeeld: r.left>=0 && r.right<=innerWidth, woorden: p.textContent.trim().split(/\s+/).length};
});
console.log('   ', JSON.stringify(zicht));
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
console.log('    na Escape:', await page.evaluate(()=>document.querySelector('[data-note-btn]').getAttribute('aria-expanded')));

console.log('\n══ 6 · toetsenbord: tab naar het vraagteken ══');
await ga('/how-it-works');
const ok = await page.evaluate(()=>{
  const b=document.querySelector('[data-note-btn]'); b.focus();
  return document.activeElement===b;
});
await page.waitForTimeout(300);
console.log('    knop is focusbaar:', ok, '· aria-expanded:', await page.evaluate(()=>document.querySelector('[data-note-btn]').getAttribute('aria-expanded')));

console.log('\n══ fouten in de console ══');
console.log(fouten.length ? fouten.join('\n') : '   geen');
await b.close(); srv.close();
