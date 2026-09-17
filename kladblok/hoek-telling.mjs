/**
 * Loopt het getal in "het blijven er N" mee als er een hoek bij komt?
 * En het meelopende overzicht bij het totaal ook?
 * Lucas, 17 september 2026: *"ze denken anders hoezo krijg ik er 4 wanneer ik
 * er 5 in totaal zou moeten hebben."*
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT = '/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const pg=await b.newPage({viewport:{width:1280,height:1000}});
await pg.goto(`${base}/nl/start/catalog`,{waitUntil:'domcontentloaded'});
await pg.waitForTimeout(1500);
await pg.addStyleTag({content:'#cc-bar,[data-cc-bar]{display:none !important}'});
await pg.evaluate(()=>{const s=document.querySelector('select[name="products"]');if(s){s.value='5';s.dispatchEvent(new Event('change',{bubbles:true}));}});
await pg.waitForTimeout(500);

const lees = () => pg.evaluate(() => ({
  hint: (document.querySelector('.pu-ref-hint-tekst')||{}).textContent || 'geen',
  overzicht: (document.querySelector('[data-pl-bo-beelden]')||{}).textContent || 'geen',
  hoekenAan: document.querySelectorAll('[data-pl-angles] input[data-pl-angle]:checked').length,
}));

console.log('zonder extra hoek :', await lees());

await pg.evaluate(() => {
  const h = document.querySelector('[data-pl-angles] input[data-pl-angle]');
  if (h) { h.checked = true; h.dispatchEvent(new Event('change', { bubbles: true })); }
});
await pg.waitForTimeout(400);
console.log('met één hoek erbij :', await lees());

await pg.evaluate(() => {
  const hs = document.querySelectorAll('[data-pl-angles] input[data-pl-angle]');
  if (hs[1]) { hs[1].checked = true; hs[1].dispatchEvent(new Event('change', { bubbles: true })); }
});
await pg.waitForTimeout(400);
console.log('met twee hoeken    :', await lees());

await b.close(); server.close();
