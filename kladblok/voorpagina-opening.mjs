/**
 * De opening van de voorpagina met de laptop: staat hij naast de tekst, is de
 * modefoto weg, en zie je in één blik wat er geleverd wordt?
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

for (const [naam, w, h] of [['voorpagina-breed', 1440, 1000], ['voorpagina-smal', 430, 900]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  await pg.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1400);
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
  await pg.evaluate(async () => { for (let y = 0; y < 2400; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(800);

  console.log(naam, await pg.evaluate(() => {
    const hero = document.querySelector('.hero');
    const lc = document.querySelector('.hero .lc');
    const kop = document.querySelector('.hero-h1');
    if (!hero || !kop) return 'geen hero';
    const k = kop.getBoundingClientRect();
    const l = lc ? lc.getBoundingClientRect() : null;
    return {
      laptopInDeHero: !!lc,
      modefotoWeg: !document.querySelector('.hero-foto'),
      clipWeg: !document.querySelector('.hero-clip'),
      kopLinks: Math.round(k.left),
      laptop: l ? `${Math.round(l.width)}×${Math.round(l.height)} op x=${Math.round(l.left)}` : '—',
      naastElkaar: l ? (l.left > k.right - 20 ? 'ja' : 'nee, eronder') : '—',
      inBeeldZonderScrollen: l ? (l.top < window.innerHeight ? 'ja' : 'nee') : '—',
      heroHoog: Math.round(hero.getBoundingClientRect().height),
    };
  }));
  await pg.screenshot({ path: `kladblok/${naam}.png` });
  await pg.close();
}
await b.close(); server.close();
