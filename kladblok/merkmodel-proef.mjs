import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8108;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const srv = http.createServer(async (req,res)=>{ const u=new URL(req.url,'http://x');
  if (u.pathname==='/account/me'){res.writeHead(401,{'content-type':'application/json'});return res.end('{}');}
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404);res.end('x');}
}).listen(PORT);
const b = await chromium.launch({ executablePath: browserPad() });
for (const [w,h,tag] of [[1440,1000,'desk'],[390,2400,'mob']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h} });
  const page = await ctx.newPage();
  await page.route('**', async (route) => { if (route.request().resourceType()!=='document') return route.continue();
    const res = await route.fetch(); let body = await res.text(); body = body.replace(/loading="lazy"/g,'loading="eager"');
    return route.fulfill({ response: res, body }); });
  await page.goto(`http://127.0.0.1:${PORT}/nl/custom-models/`, { waitUntil:'load', timeout:15000 });
  await page.evaluate(()=>document.querySelectorAll('.reveal').forEach(el=>el.classList.remove('pending')));
  await page.waitForTimeout(1200);
  await page.screenshot({ path:`kladblok/looks/merkmodel-${tag}.png`, fullPage: true });
  await ctx.close();
}
await b.close(); srv.close(); console.log('klaar');
