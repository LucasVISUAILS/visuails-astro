/*
 * VISUAILS — de catalogschermen van de opening opnieuw, met de hoodie (levering 94, 12 november 2026).
 *
 *   node scripts/opening-catalog-94.mjs
 *
 * Lucas, 07:46: "Ik wil dat je de roze broek in de laptop vervangt met … NONSTD\Hoodie, deze hoodie. Zorg ervoor dat de
 * achtergrond van de shop in de laptop dezelfde achtergrond heeft zodat de producten er mooi in verwerkt worden."
 *
 * Hetzelfde als stap 1 van scripts/opening-reeks.mjs (astro dev met LAPTOP_BRON=1, /laptop-bron/<taal>/, elk scherm plat
 * op DPR 2), maar alleen voor de vier catalogstanden en met LAPTOP_PRODUCT=hoodie; en zonder de map scherm/ eerst leeg
 * te maken (opening-reeks.mjs doet dat wel, en dan zijn de videoclip en zijn poster van levering 94 weg).
 * 08:08: drie productpagina's (de hoodie, de broek, de sokken: laptopSlides.js, product 'nonstd'), elk met de andere twee
 * onder "Voorgestelde producten", waarop je in de opening kunt klikken. Dit script meet daarom ook waar die twee op het
 * scherm staan (src/data/openingKlik.json, in breukdelen van het scherm).
 * Een product met een telefoonfoto krijgt een eigen telefoonscherm (…-tel); zonder blijft de telefoon van de stand ervoor.
 * De oude schermen van de broek (catalog-3, de oude telefoons van catalog-1 – 3 en lifestyle-0) gaan weg.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { browserPad } from './lib/browserpad.mjs';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAP = path.join(WORTEL, 'public', 'img', 'hal', 'opening', 'scherm');
const WERK = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'opening-catalog-'));
const AVIF_SCHERP = { quality: 78, effort: 6, chromaSubsampling: '4:4:4' };
const POORT = 4398;
/* welke producten een telefoonfoto hebben (laptopSlides.js, `fon`), en hoeveel er zijn */
const { laptopSlides } = await import('../src/data/laptopSlides.js');
const PRODUCTEN = laptopSlides('nl', { product: 'nonstd' }).catalog.producten;
const AANTAL = PRODUCTEN.length, FON = PRODUCTEN.map((p) => !!p.fon);
const klik = { nl: {}, en: {} };
/* astro dev blijft soms als achtergronddienst draaien ("Dev server already running"): dan krijg je de oude omgeving
   (LAPTOP_PRODUCT) terug. Eerst stoppen, en na afloop weer. */
const astroStop = () => spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['astro', 'dev', 'stop'], { cwd: WORTEL, stdio: 'ignore', shell: process.platform === 'win32' });
astroStop();
const dev = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['astro', 'dev', '--port', String(POORT), '--host', '127.0.0.1'], {
  cwd: WORTEL, env: { ...process.env, LAPTOP_BRON: '1', LAPTOP_PRODUCT: 'nonstd', ASTRO_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
});
let log = '';
dev.stdout.on('data', (d) => { log += d; }); dev.stderr.on('data', (d) => { log += d; });
const stop = () => { astroStop(); try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']) : dev.kill('SIGTERM'); } catch {} };
process.on('exit', stop);
const basis = `http://127.0.0.1:${POORT}`;
try {
  for (let i = 0; ; i++) {
    try { const r = await fetch(`${basis}/laptop-bron/nl/`); if (r.ok) break; } catch {}
    if (i > 120) throw new Error(`astro dev kwam niet op (poort ${POORT}).\n${log.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
  for (const lang of ['nl', 'en']) {
    const page = await browser.newPage({ viewport: { width: 2400, height: 1600 }, deviceScaleFactor: 2 });
    await page.goto(`${basis}/laptop-bron/${lang}/`, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => { img.loading = 'eager'; return img.complete ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = r; img.onerror = r; }); }));
      for (const vak of document.querySelectorAll('[data-bron-stand]')) {
        const lap = vak.querySelector('.hl-scherm-lap'), fon = vak.querySelector('.hl-scherm-fon');
        for (const e of [lap, fon]) {
          if (!e) continue;
          e.style.transform = 'none'; e.style.webkitMaskImage = 'none'; e.style.maskImage = 'none'; e.style.left = '0'; e.style.top = '0'; e.style.visibility = 'visible';
          e.querySelectorAll('.sc-glans').forEach((g) => { g.style.display = 'none'; });
        }
        for (let a = lap; a && a !== document.body; a = a.parentElement) { a.style.overflow = 'visible'; a.style.transform = 'none'; }
        vak.style.overflow = 'visible';
      }
    });
    for (let i = 0; i < AANTAL; i++) {
      const naam = `${lang}-catalog-${i}`;
      const vak = await page.$(`[data-bron-stand="${naam}"]`);
      if (!vak) throw new Error(`geen stand ${naam}`);
      await page.evaluate((n) => { for (const v of document.querySelectorAll('[data-bron-stand]')) v.style.display = v.getAttribute('data-bron-stand') === n ? '' : 'none'; }, naam);
      await vak.scrollIntoViewIfNeeded();
      await vak.evaluate((v) => { v.querySelector('.hl-scherm-fon').style.visibility = 'hidden'; v.querySelector('.hl-scherm-lap').style.visibility = 'visible'; });
      await (await vak.$('.hl-scherm-lap')).screenshot({ path: path.join(WERK, `${naam}-laptop.png`) });
      klik[lang][`catalog-${i}`] = await vak.evaluate((v) => {
        const s = v.querySelector('.hl-scherm-lap').getBoundingClientRect();
        const f = (n) => Math.round(n * 10000) / 10000;
        const rechthoek = (e) => { const q = e.getBoundingClientRect(); return { x: f((q.left - s.left) / s.width), y: f((q.top - s.top) / s.height), b: f(q.width / s.width), h: f(q.height / s.height) }; };
        return [...[...v.querySelectorAll('[data-klik-beeld]')].map((e) => ({ beeld: +e.getAttribute('data-klik-beeld'), ...rechthoek(e) })),
          ...[...v.querySelectorAll('[data-klik]')].map((e) => ({ naar: e.getAttribute('data-klik'), ...rechthoek(e) }))];
      });
      /* de schermen met beeld 2 – 4 groot */
      for (const k of [1, 2, 3]) {
        const n2 = `${naam}-b${k}`, vak2 = await page.$(`[data-bron-stand="${n2}"]`);
        if (!vak2) throw new Error(`geen stand ${n2}`);
        await page.evaluate((n) => { for (const v of document.querySelectorAll('[data-bron-stand]')) v.style.display = v.getAttribute('data-bron-stand') === n ? '' : 'none'; }, n2);
        await vak2.scrollIntoViewIfNeeded();
        await vak2.evaluate((v) => { v.querySelector('.hl-scherm-fon').style.visibility = 'hidden'; v.querySelector('.hl-scherm-lap').style.visibility = 'visible'; });
        await (await vak2.$('.hl-scherm-lap')).screenshot({ path: path.join(WERK, `${n2}-laptop.png`) });
      }
      await page.evaluate((n) => { for (const v of document.querySelectorAll('[data-bron-stand]')) v.style.display = v.getAttribute('data-bron-stand') === n ? '' : 'none'; }, naam);
      if (FON[i]) {
        await vak.evaluate((v) => { v.querySelector('.hl-scherm-fon').style.visibility = 'visible'; v.querySelector('.hl-scherm-lap').style.visibility = 'hidden'; });
        await (await vak.$('.hl-scherm-fon')).screenshot({ path: path.join(WERK, `${naam}-telefoon.png`) });
      }
    }
    await page.close();
  }
  await browser.close();
} finally {
  stop();
}

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
for (const lang of ['nl', 'en']) {
  for (const ext of ['webp', 'avif']) for (const n of [`${lang}-catalog-3`, `${lang}-catalog-3-tel`]) fs.rmSync(path.join(MAP, `${n}.${ext}`), { force: true });
  for (const naam of Array.from({ length: AANTAL }, (_, i) => [`${lang}-catalog-${i}`, ...[1, 2, 3].map((k) => `${lang}-catalog-${i}-b${k}`)]).flat()) {
    for (const [soort, w, achter] of [['laptop', 1600, ''], ['telefoon', 540, '-tel']]) {
      if (soort === 'telefoon' && /-b\d$/.test(naam)) continue;
      const bron = path.join(WERK, `${naam}-${soort}.png`);
      if (!fs.existsSync(bron)) { if (soort === 'telefoon') for (const ext of ['webp', 'avif']) fs.rmSync(path.join(MAP, `${naam}-tel.${ext}`), { force: true }); continue; }
      const klein = await sharp(bron).resize(w, null, { kernel: 'lanczos3' }).png().toBuffer();
      const webp = await sharp(klein).webp({ quality: 90, effort: 6 }).toBuffer();
      const avif = await sharp(klein).avif(AVIF_SCHERP).toBuffer();
      fs.writeFileSync(path.join(MAP, `${naam}${achter}.webp`), webp);
      fs.writeFileSync(path.join(MAP, `${naam}${achter}.avif`), avif);
      console.log(`scherm/${naam}${achter}: ${kb(webp.length)} webp, ${kb(avif.length)} avif`);
    }
  }
  for (const ext of ['webp', 'avif']) fs.rmSync(path.join(MAP, `${lang}-lifestyle-0-tel.${ext}`), { force: true });
}
fs.writeFileSync(path.join(WORTEL, 'src', 'data', 'openingKlik.json'), JSON.stringify({ bron: 'scripts/opening-catalog-94.mjs (levering 94)', ...klik }) + '\n');
fs.rmSync(WERK, { recursive: true, force: true });
console.log('klaar');
