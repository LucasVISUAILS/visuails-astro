/* Het overzicht bij "nog niet af": raster van tegels in plaats van een lijstje. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
const TYPES={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.avif':'image/avif','.json':'application/json'};
const srv=createServer((req,res)=>{let p=join('dist',decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&statSync(p).isDirectory())p=join(p,'index.html');
 if(!existsSync(p)&&existsSync(p+'/index.html'))p=p+'/index.html';
 if(req.url.split('?')[0]==='/api/upload'){res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({ok:true,file:{key:'nep',name:'proef.png',bytes:1234}}));return;}
 if(!existsSync(p)){res.writeHead(404);res.end('nee');return;}
 res.writeHead(200,{'content-type':TYPES[extname(p)]||'application/octet-stream'});res.end(readFileSync(p));});
await new Promise(r=>srv.listen(4334,r));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const breed = Number(process.argv[2]||1280);
const aantal = Number(process.argv[3]||9);
const pg=await b.newPage({viewport:{width:breed,height:1100}});
const fout=[]; pg.on('pageerror',(e)=>fout.push(e.message+'\n'+(e.stack||'').split('\n').slice(0,4).join('\n')));
await pg.goto('http://localhost:4334/nl/start/catalog/',{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.evaluate((n)=>{const el=[...document.querySelectorAll('#pl-qty-n, [data-pl-qty-input]')].find((x)=>x.offsetParent!==null);
 el.value=String(n); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));}, aantal);
await pg.waitForTimeout(500);
await pg.locator('.sr1-keuze').first().selectOption({index:1}).catch(()=>{});
await pg.locator('[data-pl-next]:visible').first().click({timeout:5000}).catch(()=>{});
await pg.waitForTimeout(900);
/* Product 1 helemaal afmaken, zodat er een volle tegel naast de gaten staat. */
await pg.evaluate(async ()=>{
  const kaart=[...document.querySelectorAll('.pu-card')].find((k)=>!k.hidden);
  const cv=document.createElement('canvas'); cv.width=1200; cv.height=1200;
  cv.getContext('2d').fillRect(0,0,1200,1200);
  const blob=await new Promise((r)=>cv.toBlob(r,'image/png'));
  for (const vak of kaart.querySelectorAll('.pu-slot')) {
    const id=vak.getAttribute('data-pu-slot')||'';
    if (id==='worn') continue;
    const inp=vak.querySelector('.pu-slot-input'); if(!inp) continue;
    const dt=new DataTransfer(); dt.items.add(new File([blob],id+'.png',{type:'image/png'}));
    inp.files=dt.files; inp.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise((r)=>setTimeout(r,150));
  }
  const vak=kaart.querySelector('[data-pu-slot="worn"]');
  const knop=vak&&[...vak.querySelectorAll('button')].find((x)=>/over/i.test(x.textContent||''));
  if(knop) knop.click();
});
await pg.waitForTimeout(1500);
/* Alles wat verplicht is en niets met foto's te maken heeft, invullen — anders
   houdt de gewone veldcontrole de stap tegen vóórdat askMissing() aan de beurt is. */
console.log('verplicht gevuld :', await pg.evaluate(()=>{
  let n=0;
  document.querySelectorAll('[data-pl-step] input[required], [data-pl-step] select[required], [data-pl-step] textarea[required]').forEach((el)=>{
    if (el.type==='radio') { if(!el.checked && !el.form.querySelector(`input[name="${el.name}"]:checked`)) { el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); n++; } return; }
    if (el.type==='checkbox') return;
    if (el.value) return;
    if (el.tagName==='SELECT') { if(el.options.length>1){ el.selectedIndex=1; el.dispatchEvent(new Event('change',{bubbles:true})); n++; } return; }
    el.value = el.type==='email' ? 'a@b.nl' : 'proef';
    el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); n++;
  });
  return n;
}));
await pg.waitForTimeout(400);

/* En dan verder klikken: dat opent het overzicht. */
await pg.locator('[data-pl-next]:visible').first().click({timeout:5000}).catch((e)=>console.log('verder:',e.message.split('\n')[0]));
await pg.waitForTimeout(700);
console.log('stap nu          :', await pg.evaluate(()=>{
  const st=[...document.querySelectorAll('[data-pl-step]')].filter((e)=>!e.hidden).map((e)=>e.dataset.plStep);
  return st.join(',');
}));
console.log('knoppen next     :', await pg.evaluate(()=>[...document.querySelectorAll('[data-pl-next]')].map((b)=>(b.offsetParent?'zichtbaar':'weg')+':'+(b.textContent||'').replace(/\s+/g,' ').trim().slice(0,20)).join(' | ')));
console.log('ongeldige velden :', await pg.evaluate(()=>[...document.querySelectorAll('[aria-invalid="true"], :invalid')].map((e)=>e.name||e.id||e.tagName).slice(0,6).join(', ')));
const box = pg.locator('[data-pl-missing]');
console.log('paneel zichtbaar :', await box.isVisible());
console.log('kop              :', (await pg.locator('[data-pl-missing-h]').textContent()||'').trim());
console.log('tikregel         :', (await pg.locator('.pu-missing-tik').textContent()||'').trim());
console.log('tegels           :', await pg.locator('.pu-mis-tegel').count());
console.log('gaten            :', await pg.locator('.pu-mis-tegel.is-gat').count());
console.log('eerste tegel     :', JSON.stringify(await pg.locator('.pu-mis-tegel').first().evaluate((e)=>({
  tekst:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,70),
  vakjes:e.querySelectorAll('.pu-mis-vakjes i').length,
  vol:e.querySelectorAll('.pu-mis-vakjes i.is-vol').length,
  breed:Math.round(e.getBoundingClientRect().width),
  hoog:Math.round(e.getBoundingClientRect().height),
  rand:getComputedStyle(e).borderColor,
}))));
console.log('tweede tegel     :', JSON.stringify(await pg.locator('.pu-mis-tegel').nth(1).evaluate((e)=>({
  tekst:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,70),
  vol:e.querySelectorAll('.pu-mis-vakjes i.is-vol').length,
}))));
await box.screenshot({path:`kladblok/eindraster-${breed}.png`,timeout:8000}).catch((e)=>console.log('schot:',e.message.split('\n')[0]));
/* Springen: klik tegel 4 en kijk waar we belanden. */
await pg.locator('.pu-mis-tegel').nth(3).click();
await pg.waitForTimeout(700);
console.log('na klik — paneel :', await box.isVisible());
console.log('na klik — waar   :', (await pg.locator('[data-pl-rij-tel]').first().textContent().catch(()=>'-')||'').trim());
console.log('fouten           :', fout.length?fout:'geen');
await b.close(); srv.close();
