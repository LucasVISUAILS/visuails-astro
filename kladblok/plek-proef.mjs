import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8111;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{ const u=new URL(req.url,'http://x');
  if (u.pathname==='/account/me'){res.writeHead(401,{'content-type':'application/json'});return res.end('{}');}
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const bb=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(bb);}catch{res.writeHead(404);res.end('x');}
}).listen(PORT);
const b = await chromium.launch({ executablePath: browserPad() });
const ctx = await b.newContext({ viewport:{width:1440,height:1200} });
for (const [pad, sel, naam] of [
  ['/nl/about/', 'h1', 'about-hero'],
  ['/nl/how-it-works/', 'h1', 'hiw-hero'],
  ['/nl/how-it-works/', '.wk-svc-name', 'hiw-svc'],
]) {
  const page = await ctx.newPage();
  await page.route('**', async (route) => { if (route.request().resourceType()!=='document') return route.continue();
    const res = await route.fetch(); let body = await res.text(); body = body.replace(/loading="lazy"/g,'loading="eager"');
    return route.fulfill({ response: res, body }); });
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil:'load', timeout:15000 });
  await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(el=>el.classList.remove('pending')));
  await page.waitForTimeout(700);
  const box = await page.evaluate((s)=>{ const el=document.querySelector(s); if(!el) return null; const r=el.getBoundingClientRect();
    return { x:0, y:Math.max(0,r.top+window.scrollY-80), width:1440, height:Math.min(700, r.height+420) }; }, sel);
  if (box) await page.screenshot({ path:`kladblok/looks/${naam}.png`, fullPage:true, clip:box });
  await page.close();
}
await b.close(); srv.close(); console.log('klaar');
