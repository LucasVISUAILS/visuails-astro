/* Pijltjestoetsen door de balk van de rij. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json'};
const srv=createServer((req,res)=>{let p=join('dist',decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(!existsSync(p)){res.writeHead(404);res.end('nee');return;}
 res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>srv.listen(4333,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:1000}});
const fout=[]; pg.on('pageerror',(e)=>fout.push(e.message));
await pg.goto('http://localhost:4333/nl/start/catalog/',{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.evaluate(()=>{const el=[...document.querySelectorAll('#pl-qty-n, [data-pl-qty-input]')].find((x)=>x.offsetParent!==null);
 el.value='5'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));});
await pg.waitForTimeout(500);
await pg.locator('.sr1-keuze').first().selectOption({index:1}).catch(()=>{});
await pg.locator('[data-pl-next]:visible').first().click({timeout:5000}).catch(()=>{});
await pg.waitForTimeout(900);

const stand = () => pg.evaluate(()=>{
  const kn=[...document.querySelectorAll('[data-pl-rail-knop]')];
  return {
    nu: kn.findIndex((k)=>k.classList.contains('is-nu')),
    blik: kn.indexOf(document.activeElement),
    blikTag: (document.activeElement.tagName+'.'+(document.activeElement.className||'')).slice(0,40),
    tabindex: kn.map((k)=>k.tabIndex).join(','),
    tel: (document.querySelector('[data-pl-rij-tel]')||{}).textContent,
  };
});
console.log('bij het openen :', JSON.stringify(await stand()));
await pg.locator('[data-pl-rail-knop]').first().focus();
console.log('blik in de balk:', JSON.stringify(await stand()));
for (const toets of ['ArrowRight','ArrowRight','ArrowLeft','End','Home','ArrowLeft']) {
  await pg.keyboard.press(toets); await pg.waitForTimeout(350);
  const s = await stand();
  console.log(`${toets.padEnd(11)}: nu=${s.nu} blik=${s.blik} tab=${s.tabindex} — ${String(s.tel).trim()}`);
}
/* En in een tekstveld mogen de pijltjes NIETS doen. */
await pg.locator('.pu-card:not([hidden]) input[type="text"]').first().focus().catch(()=>{});
await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(300);
console.log('in een naamveld:', JSON.stringify(await stand()));
console.log('fouten         :', fout.length?fout:'geen');
await b.close(); srv.close();
