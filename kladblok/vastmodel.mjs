/* Wat er gebeurt als de merkkit een vast model draagt: staat er dan één
   gezicht aan, of twee? En kun je het nog wijzigen? */
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
await pg.route('**/account/me',(route)=>route.fulfill({status:200,contentType:'application/json',
  body: JSON.stringify({ email:'klant@voorbeeld.test', company:'Voorbeeld BV',
    models: [{ id: 7, name: 'Nova', thumb: '/img/models/model-01.webp' }],
    locks: { catalog: { customModel: 7 } } })}));
await pg.goto(`${base}/nl/start/catalog/`,{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.waitForTimeout(1800);

const stand = () => pg.evaluate(()=>{
  const radios=[...document.querySelectorAll('input[name="model"]')];
  const zichtbaar=(el)=>{ if(!el) return false; const r=el.getBoundingClientRect(); return r.width>1&&r.height>1; };
  return {
    aantalRadios: radios.length,
    aangevinkt: radios.filter((r)=>r.checked).map((r)=>r.value),
    tegelsDieGekozenLijken: [...document.querySelectorAll('.mp-opt')].map((l)=>{
      const cs=getComputedStyle(l);
      const inp=l.querySelector('input[name="model"]');
      const naam=(l.querySelector('.mp-name')||{}).textContent||'';
      return { naam:naam.trim().slice(0,22), aan:!!(inp&&inp.checked), rand:cs.borderColor, vulling:cs.backgroundColor };
    }).filter((x)=>x.aan || (x.vulling!=='rgba(0, 0, 0, 0)' && x.vulling!=='rgb(255, 255, 255)')),
    merkkitStrook: (()=>{ const s=document.querySelector('[data-pl-merkkit]'); return s? (s.hidden?'verborgen':(s.textContent||'').replace(/\s+/g,' ').trim().slice(0,90)) : 'niet aanwezig'; })(),
    modelblokZichtbaar: (()=>{ const f=document.querySelector('[data-pl-model-fold]'); return f? (f.hidden?'verborgen':'zichtbaar') : 'geen fold'; })(),
    modelVragenZichtbaar: zichtbaar(document.querySelector('.mp-grid')),
    samenvatting: (document.querySelector('[data-pl-sum-model]')||{}).textContent,
  };
});
console.log('na laden:', JSON.stringify(await stand(), null, 1));
/* Nu proberen te wijzigen: eerst de strook openen als die er is. */
const open = await pg.evaluate(()=>{ const k=document.querySelector('[data-pl-merkkit-open]'); if(!k) return 'geen knop'; k.click(); return 'geklikt'; });
console.log('wijzigen:', open);
await pg.waitForTimeout(500);
console.log('na wijzigen:', JSON.stringify(await stand(), null, 1));
/* En een ander gezicht aanklikken. */
await pg.evaluate(()=>{ const r=[...document.querySelectorAll('input[name="model"]')].find((x)=>!x.checked && x.value && x.value!=='any'); if(r){ r.click(); } });
await pg.waitForTimeout(400);
console.log('na een ander gezicht:', JSON.stringify(await stand(), null, 1));
await pg.screenshot({path:'kladblok/vastmodel.png', fullPage:false});
await b.close(); server.close();
