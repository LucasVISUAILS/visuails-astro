/**
 * Het tippaneel naast stap 2: staat het er, draait het door, en gaat het stil
 * staan op het vak dat je aanraakt?
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
const ROOT = '/home/claude/repo/dist/';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.json':'application/json','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{let f=join(ROOT,decodeURIComponent(req.url.split('?')[0]));try{if((await stat(f)).isDirectory())f=join(f,'index.html');}catch{try{await stat(f+'.html');f+='.html';}catch{res.writeHead(404);return res.end();}}try{const b=await readFile(f);res.writeHead(200,{'content-type':MIME[extname(f)]||'application/octet-stream'});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const base=`http://127.0.0.1:${server.address().port}`;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});

for (const [naam, w] of [['tips-breed', 1280], ['tips-smal', 430]]) {
  const pg = await b.newPage({ viewport: { width: w, height: 1200 } });
  await pg.goto(`${base}/nl/start/catalog`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1800);
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
  await pg.evaluate(() => {
    const s = document.querySelector('select[name="products"]');
    if (s) { s.value = '3'; s.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => {
    document.querySelectorAll('[data-pl-step]').forEach((s) => {
      if (s.dataset.plStep === '2') { s.hidden = false; s.style.display = 'block'; s.classList.add('is-current'); }
    });
  });
  await pg.waitForTimeout(600);

  const lees = () => pg.evaluate(() => {
    const p = document.querySelector('[data-pu-tips]');
    if (!p) return { paneel: 'ONTBREEKT' };
    const img = (sel) => { const e = p.querySelector(sel); return e ? (e.getAttribute('src') || '').split('/').pop() : '—'; };
    return {
      dicht: p.classList.contains('is-dicht'),
      kop: (p.querySelector('[data-pu-tips-vaknaam]') || {}).textContent || '',
      zin: ((p.querySelector('[data-pu-tips-zin]') || {}).textContent || '').slice(0, 52),
      merk: (p.querySelector('[data-pu-tips-merk]') || {}).textContent || '',
      laptop: img('[data-pu-tips-laptop]'),
      telefoon: img('[data-pu-tips-fon]'),
      streepAan: p.querySelectorAll('[data-pu-tips-tikken] i.is-aan').length,
      streepTotaal: p.querySelectorAll('[data-pu-tips-tikken] i').length,
    };
  });

  console.log(`\n── ${naam} ──`);
  console.log('bij het openen  :', await lees());

  if (w > 900) {
    await pg.waitForTimeout(10500);
    console.log('na 10 seconden  :', await lees());

    // Een vak aanraken: de uitleg hoort stil te gaan staan op dat vak.
    await pg.hover('[data-pu-slot="back"] .pu-slot-btn');
    await pg.waitForTimeout(300);
    console.log('muis op achterk.:', await lees());
    await pg.waitForTimeout(11000);
    console.log('en 11s later    :', await lees());

    await pg.mouse.move(5, 5);
    await pg.waitForTimeout(400);
    console.log('muis eraf       :', await lees());
  }

  const el = await pg.$('[data-pu-tips]');
  if (el) await el.screenshot({ path: `kladblok/${naam}.png`, timeout: 8000 }).catch((e) => console.log('plaat mislukt:', e.message.split('\n')[0]));
  await pg.close();
}
await b.close(); server.close();
