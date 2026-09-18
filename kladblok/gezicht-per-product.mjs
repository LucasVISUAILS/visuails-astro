/* De tegelrij per product: staat hij er, klopt de eerste tegel, overleeft een
   afwijking een wissel bovenaan, en doet "voor alle producten" wat hij zegt? */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}
 try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:1000}});
pg.on('pageerror',(e)=>console.log('PAGEERROR', e.message));
pg.on('console',(m)=>{ if(m.type()==='error') console.log('CONSOLE', m.text().slice(0,120)); });
await pg.goto(`${base}/nl/start/catalog/`,{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.evaluate(()=>{const el=[...document.querySelectorAll('#pl-qty-n, [data-pl-qty-input]')].find((x)=>x.offsetParent!==null);
 el.value='3'; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));});
await pg.waitForTimeout(500);
await pg.locator('.sr1-keuze').first().selectOption({index:1}).catch(()=>{});
await pg.locator('[data-pl-next]:visible').first().click({timeout:5000}).catch(()=>{});
await pg.waitForTimeout(900);

const stand = () => pg.evaluate(()=>{
  const kaarten=[...document.querySelectorAll('.pu-card')];
  return kaarten.map((k,i)=>{
    const rij=k.querySelector('.pu-mk-rij');
    if(!rij) return `kaart ${i+1}: geen tegelrij`;
    const tegels=[...rij.querySelectorAll('.pu-mk-tegel')];
    const aan=tegels.find((t)=>t.querySelector('input').checked);
    const inp=aan&&aan.querySelector('input');
    return {
      kaart:i+1,
      tegels:tegels.length,
      eersteNaam:(tegels[0].querySelector('.pu-mk-naam')||{}).textContent,
      eersteLabel:tegels[0].querySelector('input').getAttribute('aria-label'),
      eersteBeeld:(tegels[0].querySelector('img')||{}).getAttribute? tegels[0].querySelector('img').getAttribute('src').split('/').pop() : '-',
      aan: inp? (inp.value||'(zelfde)') : 'geen',
      veldnaam: inp && inp.name,
      lade:(k.querySelector('.pu-meer-vat')||{}).textContent,
    };
  });
});
console.log('na openen:', JSON.stringify(await stand(),null,1));

/* Kaart 1 op een ander gezicht zetten. */
await pg.evaluate(()=>{
  const k=document.querySelectorAll('.pu-card')[0];
  const inp=[...k.querySelectorAll('.pu-mk-rij input')].find((i)=>i.value && i.value!=='');
  inp.click();
});
await pg.waitForTimeout(400);
console.log('\nkaart 1 afwijkend:', JSON.stringify((await stand())[0],null,1));
console.log('kopieerknop uit?', await pg.evaluate(()=>{const b=document.querySelector('.pu-copy-btn'); return b? b.disabled : 'geen knop';}));

/* Voor alle producten. */
await pg.evaluate(()=>{ const b=document.querySelector('.pu-copy-btn'); if(b) b.click(); });
await pg.waitForTimeout(400);
console.log('\nna "voor alle producten":', JSON.stringify(await stand(),null,1));
console.log('melding:', await pg.evaluate(()=>(document.querySelector('.pu-copy-said')||{}).textContent));

/* En nu bovenaan een ander gezicht kiezen: de afwijking moet blijven staan. */
await pg.evaluate(()=>{
  const r=[...document.querySelectorAll('input[name="model"]')].find((x)=>!x.checked && x.value && x.value!=='any');
  r.click();
});
await pg.waitForTimeout(500);
console.log('\nna wissel bovenaan:', JSON.stringify(await stand(),null,1));

const kaart = pg.locator('.pu-card').first();
await kaart.scrollIntoViewIfNeeded().catch(()=>{});
await pg.waitForTimeout(300);
await kaart.screenshot({path:'kladblok/gezicht-per-product.png',timeout:8000}).catch((e)=>console.log('schot:',e.message.split('\n')[0]));
await b.close(); server.close();
