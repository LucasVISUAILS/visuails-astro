import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8109;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{ const u=new URL(req.url,'http://x');
  if (u.pathname==='/account/me'){res.writeHead(401,{'content-type':'application/json'});return res.end('{}');}
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404);res.end('x');}
}).listen(PORT);
const b = await chromium.launch({ executablePath: browserPad() });
const ctx = await b.newContext({ viewport:{width:1280,height:1000} });
const page = await ctx.newPage();
await page.route('**', async (route) => { if (route.request().resourceType()!=='document') return route.continue();
  const res = await route.fetch(); let body = await res.text(); body = body.replace(/loading="lazy"/g,'loading="eager"');
  return route.fulfill({ response: res, body }); });
await page.goto(`http://127.0.0.1:${PORT}${process.argv[2]||'/test-sample/'}`, { waitUntil:'load', timeout:15000 });
await page.waitForTimeout(900);
await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(el=>el.classList.remove('pending')));
// stap 1 zoals een bezoeker hem ziet
const stap = await page.evaluate(()=>{
  const s = document.querySelector('.pl-step.is-current');
  if (!s) return null;
  return { kop: (s.querySelector('h2,h3')||{}).textContent?.trim().slice(0,60),
    velden: [...s.querySelectorAll('label,legend,h3')].map(e=>e.textContent.trim().replace(/\s+/g,' ').slice(0,60)).slice(0,25) };
});
console.log(JSON.stringify(stap,null,1));
console.log('extra-blok op de proef:', await page.evaluate(()=>({
  extra: !!document.querySelector('.pu-extra'),
  extraSelect: !!document.querySelector('select[name^=extra_]'),
  addKnop: !!(document.querySelector('[data-pl-add]') && !document.querySelector('[data-pl-add]').hidden),
  kaarten: document.querySelectorAll('.pu-card').length,
  refs: document.querySelectorAll('.pu-ref-add').length,
})));
// alle stappen zichtbaar maken en de bedragen op de pagina opsommen
console.log('bedragen op de proefpagina:', await page.evaluate(()=>{
  const uit = [];
  document.querySelectorAll('.pl-step').forEach((s)=>{
    const t = (s.innerText||'').replace(/\s+/g,' ');
    const m = t.match(/€\s?[\d.,]+/g) || [];
    uit.push({ stap: s.getAttribute('data-pl-step'), bedragen: [...new Set(m)] });
  });
  return uit;
}));
console.log('stap 2 doorklikken:', await page.evaluate(()=>{
  const k = document.querySelector('.pl-step.is-current [data-pl-next]'); if (k) k.click();
  const k2 = document.querySelector('.pl-step.is-current [data-pl-next]'); if (k2) k2.click();
  const box = document.querySelector('[data-pl-missing]');
  return { stap: document.querySelector('.pl-step.is-current')?.dataset.plStep,
           missingZichtbaar: !!(box && !box.hidden),
           tekst: box ? (box.innerText||'').replace(/\s+/g,' ').slice(0,140) : null };
}));
await page.screenshot({ path:'kladblok/looks/sample.png', fullPage:true });
await b.close(); srv.close(); console.log('klaar');
