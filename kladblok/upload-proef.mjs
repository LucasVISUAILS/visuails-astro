import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat, writeFile } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8104;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x');
  if (u.pathname === '/account/me') { res.writeHead(401,{'content-type':'application/json'}); return res.end('{}'); }
  if (u.pathname.startsWith('/api/')) { res.writeHead(200,{'content-type':'application/json'}); return res.end(JSON.stringify({ ok:true, file:{ key:'k1' } })); }
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b); }
  catch{ res.writeHead(404); res.end('nope'); }
}).listen(PORT);

const b = await chromium.launch({ executablePath: browserPad() });
const ctx = await b.newContext({ viewport:{width:1280,height:1000} });
const page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error') console.log('CONSOLE', m.text().slice(0,120)); });
await page.goto(`http://127.0.0.1:${PORT}/nl/start/catalog/`, { waitUntil:'load', timeout:15000 });
await page.waitForTimeout(900);
// stap 1 invullen en door
await page.evaluate(()=>{
  const sel = document.querySelector('select[name="products"]');
  if (sel) { sel.value = '2'; sel.dispatchEvent(new Event('change',{bubbles:true})); }
});
await page.waitForTimeout(400);
const knop = await page.$$('.pl-step.is-current button.btn-primary, .pl-step.is-current .pl-next, .pl-step.is-current [data-pl-next]');
console.log('knoppen op stap 1:', await page.evaluate(()=>[...document.querySelectorAll('.pl-step.is-current button')].map(b=>`${b.className.split(' ')[0]} "${b.textContent.trim().slice(0,24)}"`)));
if (knop[0]) { await knop[0].click(); await page.waitForTimeout(700); }
console.log('nu op stap:', await page.evaluate(()=>{const s=document.querySelector('.pl-step.is-current');return s?s.getAttribute('data-pl-step')||s.querySelector('h2,h3')?.textContent.trim().slice(0,40):'?';}));
// bestand in het eerste vakje
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHUlEQVR42mP8z8BQz0AEYBxVSF+FAAoQAo0AAAAASUVORK5CYII=','base64');
const inputs = await page.$$('.pu-slot-input');
console.log('vakjes:', inputs.length);
if (inputs[0]) {
  await inputs[0].setInputFiles({ name:'front.png', mimeType:'image/png', buffer: png });
  await page.waitForTimeout(1500);
}
console.log('VAKJE 1:', await page.evaluate(()=>{
  const s = document.querySelector('.pu-slot');
  const img = s && s.querySelector('.pu-slot-img');
  return s ? { klassen: s.className, state: s.dataset.state, imgSrc: img ? (img.getAttribute('src')||'').slice(0,24) : null, imgHidden: img ? img.hidden : null, nw: img ? img.naturalWidth : null } : null;
}));
await b.close(); srv.close();
