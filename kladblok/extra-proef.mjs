import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8106;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{ const u=new URL(req.url,'http://x');
  if (u.pathname==='/account/me'){res.writeHead(401,{'content-type':'application/json'});return res.end('{}');}
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404);res.end('x');}
}).listen(PORT);
const b = await chromium.launch({ executablePath: browserPad() });
for (const [w,tag] of [[1280,'desk'],[390,'mob']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:2200} });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}/nl/start/catalog/`, { waitUntil:'load', timeout:15000 });
  await page.waitForTimeout(800);
  await page.evaluate(()=>{ const s=document.querySelector('select[name="products"]'); s.value='1'; s.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelectorAll('.pl-step').forEach(el=>{el.classList.add('is-current'); el.hidden=false;});
  });
  await page.waitForTimeout(500);
  await page.evaluate(()=>{ const s=document.querySelector('select[name="extra_p1"]'); if(s){ s.value='2'; s.dispatchEvent(new Event('change',{bubbles:true})); } });
  await page.waitForTimeout(500);
  const el = await page.$('.pu-extra');
  if (el) await el.screenshot({ path: `kladblok/looks/extra-${tag}.png` });
  const kaart = await page.$('.pu-card');
  if (kaart) await kaart.screenshot({ path: `kladblok/looks/kaart-${tag}.png` });
  await ctx.close();
}
await b.close(); srv.close(); console.log('klaar');
