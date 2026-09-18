/**
 * De productkaart na de herindeling van 17 september 2026: beeld boven,
 * woorden eronder, referentievakken in een eigen strook. Schiet hem leeg en
 * met twee foto's erin, op een desktop en op een telefoon.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const ROOT = new URL('../dist/', import.meta.url).pathname;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml',
               '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp', '.avif':'image/avif',
               '.json':'application/json', '.woff2':'font/woff2', '.ico':'image/x-icon' };
const server = createServer(async (req, res) => {
  let f = join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try { if ((await stat(f)).isDirectory()) f = join(f, 'index.html'); }
  catch { try { await stat(f + '.html'); f += '.html'; } catch { res.writeHead(404); return res.end(); } }
  try { const b = await readFile(f); res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

/* Een echte foto van 1200×1200: kleiner wordt door MIN_LANGE_ZIJDE geweigerd. */
const fotoBytes = async (pg) => pg.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 1200;
  const x = c.getContext('2d');
  x.fillStyle = '#d8d2c8'; x.fillRect(0, 0, 1200, 1200);
  x.fillStyle = '#8c8377'; x.fillRect(320, 180, 560, 840);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return [...new Uint8Array(await blob.arrayBuffer())];
});

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

for (const [naam, breedte] of [['kaart-breed', 1280], ['kaart-smal', 430]]) {
  const pg = await b.newPage({ viewport: { width: breedte, height: 1100 } });
  await pg.goto(`${base}/nl/start/catalog`, { waitUntil: 'networkidle' });
  await pg.addStyleTag({ content: '#cc-bar,[data-cc-bar]{display:none !important}' });
  /* Wachten tot pipeline.js gebonden heeft: een vinkje dat je aanzet vóórdat de
     luisteraars staan, verandert wel de checkbox en verder niets. */
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => {
    const sel = document.querySelector('select[name="products"]');
    if (sel) { sel.value = '5'; sel.dispatchEvent(new Event('change', { bubbles: true })); }
    /* Twee hoeken erbij, zodat de plaat ook de hoekvakken laat zien — sinds
       17 september krijgt elke bestelde hoek een eigen verplicht vak. */
    const hs = document.querySelectorAll('[data-pl-angles] input[data-pl-angle]');
    [0, 3].forEach((i) => { if (hs[i]) { hs[i].checked = true; hs[i].dispatchEvent(new Event('change', { bubbles: true })); } });
  });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => {
    document.querySelectorAll('[data-pl-step]').forEach((s) => {
      if (s.dataset.plStep === '2') { s.hidden = false; s.style.display = 'block'; s.classList.add('is-current'); }
    });
    /* Expliciet de kaartenweg kiezen. bindUploadMode() zet zelf een van de twee
       panelen aan zodra het script gebonden heeft; welke dat is hangt van de
       stand af, en een verborgen paneel meet 0 bij 0. */
    const naarKaarten = document.querySelector('[data-pu-switch="cards"]');
    if (naarKaarten) naarKaarten.click();
    document.querySelectorAll('[data-pu-panel]').forEach((p) => {
      p.hidden = p.dataset.puPanel !== 'cards';
    });
  });
  await pg.waitForTimeout(400);

  // Twee vakken vullen, zodat zowel leeg als gevuld op één plaat staat.
  const bytes = await fotoBytes(pg);
  for (const slot of ['front', 'back']) {
    const input = await pg.$(`[data-pu-slot="${slot}"] .pu-slot-input`);
    if (input) await input.setInputFiles({ name: `${slot}.png`, mimeType: 'image/png', buffer: Buffer.from(bytes) });
  }
  await pg.waitForTimeout(900);

  const paneel = await pg.$('[data-pu-panel="cards"]');
  if (paneel) await paneel.screenshot({ path: `kladblok/${naam}.png`, timeout: 8000 })
    .catch((e) => console.log('mislukt:', e.message.split('\n')[0]));

  const maten = await pg.evaluate(() => {
    const s = document.querySelector('.pu-slot');
    const r = s && s.querySelector('.pu-slot-btn').getBoundingClientRect();
    const eis = document.querySelector('.pu-slot-eis');
    const ref = document.querySelector('.pu-ref-add');
    const naamveld = document.querySelector('.pu-name');
    return {
      vak: r ? `${Math.round(r.width)}×${Math.round(r.height)}` : 'geen',
      eiswoord: eis ? eis.textContent : 'geen',
      eisGrootte: eis ? getComputedStyle(eis).fontSize : '—',
      badgesOver: document.querySelectorAll('.pu-slot-req').length,
      refBreedte: ref ? Math.round(ref.getBoundingClientRect().width) : 0,
      refInRaster: !!document.querySelector('.pu-slots .pu-ref-add'),
      refInStrook: !!document.querySelector('.pu-refs .pu-ref-add'),
      naamRand: naamveld ? getComputedStyle(naamveld).borderBottomWidth + ' / ' + getComputedStyle(naamveld).borderTopWidth : '—',
      woordenInKnop: document.querySelectorAll('.pu-slot-btn .pu-slot-name').length,
    };
  });
  console.log(naam, maten);
  await pg.close();
}
await b.close();
server.close();
