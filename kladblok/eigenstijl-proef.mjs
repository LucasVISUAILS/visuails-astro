/* Ziet een ingelogde klant zijn eigen look op /lifestyle, en een uitgelogde niet? */
import { chromium } from 'playwright';
import http from 'node:http'; import { readFile, stat } from 'node:fs/promises'; import path from 'node:path';
import { browserPad } from '../scripts/lib/browserpad.mjs';
const ROOT = path.resolve('dist'); const PORT = 8107;
const T = { '.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2' };
let ingelogd = false;
const me = JSON.stringify({ email:'demo@voorbeeld.test', label:'Demo', name:'Demo', locks:{}, models:[],
  styles:[ { id: 7, name:'Atelier Noir', service:'lifestyle', line:'Koel licht, betonnen vloer.', surchargeCents:0, preview:'' },
           { id: 8, name:'Bakkerij', service:'catalog', line:'Op eiken.', surchargeCents:0, preview:'' } ] });
const srv = http.createServer(async (req,res)=>{ const u=new URL(req.url,'http://x');
  if (u.pathname==='/account/me'){ res.writeHead(ingelogd?200:401,{'content-type':'application/json'}); return res.end(ingelogd?me:'{}'); }
  let p=path.join(ROOT,decodeURIComponent(u.pathname));
  try{ if((await stat(p)).isDirectory()) p=path.join(p,'index.html'); }catch{}
  try{ const b=await readFile(p); res.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'}); res.end(b);}catch{res.writeHead(404);res.end('x');}
}).listen(PORT);
const b = await chromium.launch({ executablePath: browserPad() });
async function kijk(pad, aan) {
  ingelogd = aan;
  const ctx = await b.newContext({ viewport:{width:1280,height:1400} });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${PORT}${pad}`, { waitUntil:'load', timeout:15000 });
  await page.waitForTimeout(1400);
  const r = await page.evaluate(()=>{
    const vak = document.querySelector('[data-sr-eigen]');
    return { bestaat: !!vak, zichtbaar: !!(vak && !vak.hidden),
      namen: [...document.querySelectorAll('.sr-eigen-naam')].map(e=>e.textContent),
      knop: [...document.querySelectorAll('.sr-eigen-kaart a')].map(a=>a.getAttribute('href')) };
  });
  console.log(pad, aan?'(ingelogd)':'(uitgelogd)', JSON.stringify(r));
  await ctx.close();
}
await kijk('/nl/lifestyle/', false);
await kijk('/nl/lifestyle/', true);
await kijk('/nl/catalog/', true);
await b.close(); srv.close();
