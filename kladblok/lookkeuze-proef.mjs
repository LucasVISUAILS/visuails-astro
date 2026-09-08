/* Loopt na of de gekozen look uit /lifestyle in het formulier blijft staan en
   het raster opvouwt — 4 september 2026. node kladblok/lookkeuze-proef.mjs */
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8103;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
const eigen = JSON.stringify({ email:'demo@voorbeeld.test', label:'Demo', name:'Demo', locks:{}, models:[],
  styles:[{ id: 7, name:'Atelier Noir', service:'lifestyle', line:'De huisstijl van Demo.', surchargeCents:0, preview:'' }] });
const srv = http.createServer(async (req,res)=>{
  const u=new URL(req.url,'http://x');
  if (u.pathname === '/account/me') {
    if (u.searchParams.get('x') !== null) {}
    res.writeHead(globalThis.__ingelogd ? 200 : 401, {'content-type':'application/json'});
    return res.end(globalThis.__ingelogd ? eigen : '{}');
  }
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b); }
  catch{ res.writeHead(404); res.end('nope'); }
}).listen(PORT);

const b = await chromium.launch({ executablePath: browserPad() });
async function kijk(pad, ingelogd) {
  globalThis.__ingelogd = ingelogd;
  const ctx = await b.newContext({ viewport:{width:1280,height:900} });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil:'load', timeout:15000 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const vast = document.querySelector('[data-look-vast]');
    const grid = document.querySelector('[data-look-grid]');
    const aan = document.querySelector('input[name="style"]:checked');
    return {
      vastZichtbaar: !!(vast && !vast.hidden),
      naam: vast ? (vast.querySelector('[data-look-vast-naam]')||{}).textContent : null,
      rasterVerborgen: !!(grid && grid.hidden),
      gekozen: aan ? aan.value : null,
      tegels: document.querySelectorAll('.look-grid .look').length,
    };
  });
  console.log(pad, ingelogd ? '(ingelogd)' : '(uitgelogd)', JSON.stringify(r));
  await ctx.close();
}
await kijk('/nl/start/lifestyle/?style=dunes', false);
await kijk('/nl/start/lifestyle/', false);
await kijk('/nl/start/lifestyle/?style=cs-7', true);
await b.close(); srv.close();
