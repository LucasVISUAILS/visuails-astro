/* De vier wijzigingen aan de laptopcarousel, in een echte browser. */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}
 try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1440,height:950}});
pg.on('pageerror',(e)=>console.log('PAGEERROR',e.message));
await pg.goto(`${base}/nl/`,{waitUntil:'networkidle'});
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.waitForTimeout(800);

const doos=(sel)=>pg.evaluate((s)=>{const e=document.querySelector(s); if(!e) return null;
  const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
  return {l:Math.round(r.left),r:Math.round(r.right),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),op:cs.opacity,vis:cs.visibility};},sel);

console.log('pijlen in rust  :', JSON.stringify(await doos('.lc-pijl-vorige')), JSON.stringify(await doos('.lc-pijl-volgende')));
await pg.locator('.lc').hover();
await pg.waitForTimeout(500);
console.log('pijlen bij hover:', JSON.stringify(await doos('.lc-pijl-vorige')), JSON.stringify(await doos('.lc-pijl-volgende')));
console.log('venster         :', await pg.evaluate(()=>innerWidth));

/* Draait hij, staat hij stil bij hover, en loopt hij weer als je weggaat? */
const nu = () => pg.evaluate(()=>{ const a=document.querySelector('[data-lc-melding]'); return a? a.textContent : '?';});
console.log('\nstand nu        :', await nu());
await pg.waitForTimeout(4000);
console.log('na 4s hoveren   :', await nu(), '(hoort gelijk te blijven)');
await pg.mouse.move(20, 20);
await pg.waitForTimeout(4500);
console.log('4,5s na weggaan :', await nu(), '(hoort verder te zijn)');

/* De pijl terug in de nagebouwde post. */
await pg.evaluate(()=>{ const p=[...document.querySelectorAll('[data-lc-slide]')]; return p.length; });
const postStand = () => pg.evaluate(()=>{
  const t=document.querySelector('[data-lc-terug]');
  if(!t) return 'geen terugpijl';
  const r=t.getBoundingClientRect();
  return { verborgen:t.hidden, links:Math.round(r.left), breed:Math.round(r.width) };
});
console.log('\nterugpijl       :', JSON.stringify(await postStand()));
/* Naar de lifestyle-slide en één beeld vooruit. */
await pg.evaluate(()=>{ const k=document.querySelector('.lc-pijl-volgende'); for(let i=0;i<5;i++) k.click(); });
await pg.waitForTimeout(900);
console.log('na 5× vooruit   :', await nu(), JSON.stringify(await postStand()));

/* De video-slide. */
await pg.evaluate(()=>{
  /* Rechtstreeks naar de slide met de speler. */
  const dia=[...document.querySelectorAll('[data-lc-slide]')];
  const k=dia.findIndex((e)=>e.querySelector('.lc-speler'));
  const knop=document.querySelector('.lc-pijl-volgende');
  let veilig=0;
  while(!dia[k].classList.contains('is-aan') && veilig++ < 20) knop.click();
});
await pg.waitForTimeout(900);
console.log('\nspeler          :', await pg.evaluate(()=>{
  const sp=document.querySelector('.lc-slide.is-aan .lc-speler');
  if(!sp) return 'niet op de spelerslide';
  const g=sp.querySelector('.lc-speler-grond'), c=sp.querySelector('.lc-speler-clip');
  const rb=sp.getBoundingClientRect(), rg=g.getBoundingClientRect(), rc=c.getBoundingClientRect();
  return { vlak:[Math.round(rb.width),Math.round(rb.height)], grond:[Math.round(rg.width),Math.round(rg.height)],
           clip:[Math.round(rc.width),Math.round(rc.height)], filter:getComputedStyle(g).filter.slice(0,30) };
}));
await pg.locator('.lc').screenshot({path:'kladblok/carousel-video.png'}).catch((e)=>console.log('schot:',e.message.split('\n')[0]));
await b.close(); server.close();
