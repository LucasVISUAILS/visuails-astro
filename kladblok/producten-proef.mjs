import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8105;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x');
  if (u.pathname === '/account/me') { res.writeHead(401,{'content-type':'application/json'}); return res.end('{}'); }
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b); }
  catch{ res.writeHead(404); res.end('nope'); }
}).listen(PORT);
const b = await chromium.launch({ executablePath: browserPad() });
const ctx = await b.newContext({ viewport:{width:1280,height:1000} });
const stand = (page) => page.evaluate(()=>({
  kaarten: document.querySelectorAll('.pu-card').length,
  aantal: (document.querySelector('select[name="products"]')||{}).value ?? null,
  addZichtbaar: !!(document.querySelector('[data-pl-add]') && !document.querySelector('[data-pl-add]').hidden),
  wegKnoppen: [...document.querySelectorAll('.pu-weg')].filter(el=>!el.hidden).length,
}));

// 1 — catalog met 2 producten
let page = await ctx.newPage();
page.on('console', m=>{ if(m.type()!=='log'||m.text().includes('[dbg]')) console.log('FOUT:', m.text().slice(0,160)); });
page.on('pageerror', e=>console.log('PAGEERROR:', String(e).slice(0,200)));
await page.goto(`http://127.0.0.1:${PORT}/nl/start/catalog/`, { waitUntil:'load', timeout:15000 });
await page.waitForTimeout(800);
await page.evaluate(()=>{ const s=document.querySelector('select[name="products"]'); s.value='2'; s.dispatchEvent(new Event('change',{bubbles:true})); });
await page.waitForTimeout(400);
console.log('catalog, 2 gekozen ......', JSON.stringify(await stand(page)));
console.log('opties:', await page.evaluate(()=>[...document.querySelector('select[name=products]').options].map(o=>o.value).join(',')));
console.log('klikproef:', await page.evaluate(()=>{
  const knop = document.querySelector('[data-pl-add]');
  const sel = document.querySelector('select[name=products]');
  const voor = sel.value;
  knop.click();
  return { voor, na: sel.value, kaarten: document.querySelectorAll('.pu-card').length, knopHidden: knop.hidden };
})); await page.waitForTimeout(400);
console.log('na "nog een product" ....', JSON.stringify(await stand(page)));
await page.evaluate(()=>document.querySelector('.pu-card:last-child .pu-weg').click()); await page.waitForTimeout(400);
console.log('na "weghalen" ...........', JSON.stringify(await stand(page)));
await page.close();

// 2 — test sample
page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${PORT}/test-sample/`, { waitUntil:'load', timeout:15000 });
await page.waitForTimeout(900);
console.log('test-sample ............', JSON.stringify(await stand(page)));
await page.close();
await b.close(); srv.close();
