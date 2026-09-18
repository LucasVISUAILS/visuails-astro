/**
 * De laptop in de opening: staat hij naast de tekst, is het gat weg, en
 * vervaagt hij rechts en onder in plaats van hard afgesneden te worden?
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT='/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

for (const [pad, breed] of [['/catalog', 1440], ['/lifestyle', 1440], ['/video', 1440], ['/catalog', 430]]) {
  const pg = await b.newPage({ viewport: { width: breed, height: 1000 } });
  const r = await pg.goto(`${base}${pad}`, { waitUntil: 'domcontentloaded' }).catch(() => null);
  if (!r || r.status() >= 400) { console.log(pad, '— pagina bestaat niet'); await pg.close(); continue; }
  await pg.waitForTimeout(1200);
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
  /* Lui geladen beelden komen pas in beeld na scrollen — anders is de plaat leeg. */
  await pg.evaluate(async () => { for (let y = 0; y < 3000; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(700);

  console.log(pad, breed + 'px', await pg.evaluate(() => {
    const lc = document.querySelector('.lc');
    const kop = document.querySelector('h1');
    if (!lc || !kop) return 'geen laptop of kop';
    const l = lc.getBoundingClientRect(); const k = kop.getBoundingClientRect();
    const doek = lc.querySelector('.lc-doek');
    const cs = doek ? getComputedStyle(doek) : {};
    return {
      naast: Math.abs(l.top - k.top) < 260 ? 'ja' : `nee (${Math.round(l.top - k.top)}px lager)`,
      kopTop: Math.round(k.top),
      laptopBoxTop: Math.round(l.top),
      doekTop: doek ? Math.round(doek.getBoundingClientRect().top) : null,
      doekHoog: doek ? Math.round(doek.getBoundingClientRect().height) : null,
      /* Waar de laptop BINNEN zijn eigen plaat begint: het schermvlak zit op
         --lc-t van boven, en de deksel begint daar net boven. */
      leegBoven: doek ? Math.round(doek.getBoundingClientRect().height * 0.16) : null,
      laptopBreed: Math.round(l.width),
      looptUitBeeld: Math.round(l.right) > window.innerWidth - 4 ? 'ja' : `nee, stopt op ${Math.round(l.right)} van ${window.innerWidth}`,
      masker: (cs.maskImage || cs.webkitMaskImage || 'geen').slice(0, 60),
      doekGrond: cs.backgroundColor,
      hoek: cs.borderRadius,
    };
  }));
  await pg.screenshot({ path: `kladblok/opening${pad.replace('/', '-')}${breed < 900 ? '-smal' : ''}.png` });
  await pg.close();
}
await b.close(); server.close();
