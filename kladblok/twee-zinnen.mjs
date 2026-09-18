/* De twee zinnen uit het concept die nooit in het formulier kwamen. */
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
await new Promise(r=>srv.listen(4332,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
for (const [taal, pad] of [['nl','/nl/start/catalog/'],['en','/start/catalog/']]) {
  const pg=await b.newPage({viewport:{width:1280,height:1000}});
  const fout=[]; pg.on('pageerror',(e)=>fout.push(e.message));
  await pg.goto('http://localhost:4332'+pad,{waitUntil:'networkidle'});
  await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
  console.log(`\n── ${taal} ─────────────────────────────`);
  const noot = await pg.locator('.pl-hoeken-noot').first();
  console.log('hoekennoot :', (await noot.textContent()||'').trim().slice(0,90));
  console.log('  maat     :', await noot.evaluate((e)=>getComputedStyle(e).fontSize + ' / ' + getComputedStyle(e).color));
  await pg.evaluate(()=>{
    const el=[...document.querySelectorAll('#pl-qty-n, [data-pl-qty-input]')].find((x)=>x.offsetParent!==null);
    if(!el) return; el.value='3';
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await pg.waitForTimeout(500);
  await pg.locator('.sr1-keuze').first().selectOption({index:1}).catch(()=>{});
  await pg.locator('[data-pl-next]:visible').first().click({timeout:5000}).catch(()=>{});
  await pg.waitForTimeout(900);
  const t = pg.locator('.pu-ref-terug').first();
  console.log('terugzin   :', (await t.textContent().catch(()=>'-')||'').trim().slice(0,110));
  console.log('  zichtbaar:', await t.isVisible().catch(()=>false), '| maat', await t.evaluate((e)=>getComputedStyle(e).fontSize).catch(()=>'-'));
  console.log('  op kaart2:', await pg.evaluate(()=>{
    const p=[...document.querySelectorAll('.pu-ref-terug')];
    return p.map((e)=>e.classList.contains('is-stil')?'stil':'zichtbaar').join(', ');
  }));
  console.log('fouten     :', fout.length?fout:'geen');
  await pg.close();
}
await b.close(); srv.close();
