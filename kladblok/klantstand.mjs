/**
 * Wat een bestaande klant te zien krijgt.
 *
 * Lucas, 17 september 2026: *"Ik wil wanneer iemand is ingelogd en dus al een
 * order heeft geplaatst de test sample niet meer dominant maken."*
 *
 * Twee doorlopen: één waarin /account/me 401 antwoordt (uitgelogd) en één
 * waarin hij 200 geeft (ingelogd). Het antwoord wordt hier onderschept, want
 * een echte sessie hebben we in een testopstelling niet.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

for (const [naam, ingelogd] of [['uitgelogd', false], ['ingelogd', true]]) {
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.route('**/account/me', (route) => {
    if (ingelogd) route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ email: 'klant@voorbeeld.test' }) });
    else route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await pg.goto(`${base}/nl/`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1500);
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });

  console.log(naam, await pg.evaluate(() => {
    const zichtbaar = (el) => !!el && !el.hidden && el.getBoundingClientRect().width > 0;
    const uit = [...document.querySelectorAll('[data-vis-uit]')];
    const aan = [...document.querySelectorAll('[data-vis-in]')];
    return {
      proefknoppen: uit.map((e) => `${e.textContent.trim()} → ${zichtbaar(e) ? 'zichtbaar' : 'verborgen'}`),
      klantknoppen: aan.map((e) => `${e.textContent.trim()} → ${zichtbaar(e) ? 'zichtbaar' : 'verborgen'}`),
    };
  }));
  await pg.close();
}
await b.close(); server.close();
