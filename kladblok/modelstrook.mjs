/**
 * Staan alle modeltegels even groot, ook als de laatste rij er maar één draagt?
 * Lucas, 17 september 2026: *"het 10e modelfoto is groter dan de rest."*
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

for (const [naam, w] of [['modelstrook-breed', 1280], ['modelstrook-smal', 430]]) {
  const pg = await b.newPage({ viewport: { width: w, height: 1100 } });
  await pg.goto(`${base}/nl/start/catalog`, { waitUntil: 'domcontentloaded' });
  await pg.waitForTimeout(1800);
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
  await pg.evaluate(() => {
    const s = document.querySelector('select[name="products"]');
    if (s) { s.value = '1'; s.dispatchEvent(new Event('change', { bubbles: true })); }
    document.querySelectorAll('[data-pl-step]').forEach((st) => {
      if (st.dataset.plStep === '2') { st.hidden = false; st.style.display = 'block'; st.classList.add('is-current'); }
      else st.style.display = 'none';
    });
  });
  await pg.waitForTimeout(600);

  const maten = await pg.evaluate(() => {
    const strook = document.querySelector('.mp-grid.is-strook');
    if (!strook) return 'geen strook';
    const tegels = [...strook.querySelectorAll('.mp-opt')].filter((t) => t.offsetParent !== null);
    const br = tegels.map((t) => Math.round(t.getBoundingClientRect().width));
    const rijen = {};
    tegels.forEach((t) => { const y = Math.round(t.getBoundingClientRect().top); rijen[y] = (rijen[y] || 0) + 1; });
    return {
      tegels: tegels.length,
      breedtes: [...new Set(br)],
      smalste: Math.min(...br), breedste: Math.max(...br),
      gelijk: new Set(br).size === 1,
      perRij: Object.values(rijen),
    };
  });
  console.log(naam, maten);

  const el = await pg.$('.pl-model, [data-pl-model]') || await pg.$('.mp-grid.is-strook');
  if (el) await el.screenshot({ path: `kladblok/${naam}.png`, timeout: 8000 }).catch((e) => console.log('plaat:', e.message.split('\n')[0]));
  await pg.close();
}
await b.close(); server.close();
