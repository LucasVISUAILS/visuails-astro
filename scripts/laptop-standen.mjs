/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE LAPTOPSTANDEN OPNIEUW FOTOGRAFEREN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   node scripts/laptop-standen.mjs            — alle standen, NL en EN
 *   node scripts/laptop-standen.mjs --poort 4399
 *
 * Draai dit na elke wijziging aan de schermen op de laptop in de opening:
 * HalLaptopSchermen.astro, de beelden in src/data/laptopSlides.js, of de
 * .sc-regels in src/styles/hal.css. Waarom de laptop foto's toont en geen
 * nagebouwd scherm meer: zie de kop van src/data/halStanden.js.
 *
 * WAT HET DOET
 *   1. Start `astro dev` met LAPTOP_BRON=1. Alleen dan bestaat /laptop-bron/<taal>/:
 *      elke stand als een vak van 2304 × 1728 (de maat van de foto), met de
 *      schermen erin in het perspectief van de foto.
 *   2. Opent die pagina in Chromium op precies 2304 px breed, wacht op de letters
 *      en tot elk beeld geladen en gedecodeerd is, en maakt van elk vak een foto.
 *   3. Schrijft public/img/hal/stand/<taal>-<set>-<n>-<breedte>.webp in 1000, 1600
 *      en 2304 px, en een AVIF ernaast als die kleiner is (dezelfde regels als
 *      scripts/make-avif.mjs: kwaliteit 52, effort 4).
 *   4. Haalt standen weg die niet meer in de reeks zitten.
 *   5. Schrijft de vingerafdruk van de bron naar src/data/halStanden.bron.json.
 *
 * tests/laptop-standen.test.mjs kijkt daarna na of elke stand er in elke breedte
 * ligt en of de foto's de maat van de foto hebben.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { browserPad } from './lib/browserpad.mjs';
import { vingerafdruk, BRON_JSON } from './lib/laptopbron.mjs';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAP = path.join(WORTEL, 'public', 'img', 'hal', 'stand');
const BREEDTES = [1000, 1600, 2304];
const poortArg = process.argv.indexOf('--poort');
const POORT = poortArg > -1 ? Number(process.argv[poortArg + 1]) : 4399;
const WEBP = { quality: 84, effort: 6 };
const AVIF = { quality: 52, effort: 4, chromaSubsampling: '4:2:0' };

fs.mkdirSync(MAP, { recursive: true });

console.log('\nVISUAILS — laptopstanden fotograferen\n');
const dev = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['astro', 'dev', '--port', String(POORT), '--host', '127.0.0.1'], {
  cwd: WORTEL, env: { ...process.env, LAPTOP_BRON: '1', ASTRO_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
});
let log = '';
dev.stdout.on('data', (d) => { log += d; });
dev.stderr.on('data', (d) => { log += d; });
const stop = () => { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']) : dev.kill('SIGTERM'); } catch {} };
process.on('exit', stop);

const basis = `http://127.0.0.1:${POORT}`;
async function wachtOpServer() {
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(`${basis}/laptop-bron/nl/`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`astro dev kwam niet op (poort ${POORT}).\n${log.slice(-2000)}`);
}

const gemaakt = new Set();
try {
  await wachtOpServer();
  const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
  for (const lang of ['nl', 'en']) {
    const page = await browser.newPage({ viewport: { width: 2304, height: 1728 }, deviceScaleFactor: 1 });
    await page.goto(`${basis}/laptop-bron/${lang}/`, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => {
        img.loading = 'eager';
        const binnen = img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise((r) => { img.onload = r; img.onerror = r; });
        return binnen.then(() => img.decode().catch(() => {}));
      }));
    });
    const vakken = await page.$$('[data-bron-stand]');
    if (!vakken.length) throw new Error(`/laptop-bron/${lang}/ heeft geen standen. Staat LAPTOP_BRON=1 aan?`);
    for (const vak of vakken) {
      const naam = await vak.getAttribute('data-bron-stand');
      await vak.scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
      const png = await vak.screenshot({ type: 'png' });
      const meta = await sharp(png).metadata();
      if (meta.width !== 2304 || meta.height !== 1728) throw new Error(`${naam}: ${meta.width} × ${meta.height}, verwacht 2304 × 1728`);
      for (const w of BREEDTES) {
        const h = Math.round((w * 1728) / 2304);
        const webp = await sharp(png).resize(w, h, { kernel: 'lanczos3' }).webp(WEBP).toBuffer();
        const doel = path.join(MAP, `${naam}-${w}.webp`);
        fs.writeFileSync(doel, webp);
        const avif = await sharp(webp).avif(AVIF).toBuffer();
        const avifDoel = doel.replace(/\.webp$/, '.avif');
        if (avif.length < webp.length) fs.writeFileSync(avifDoel, avif); else if (fs.existsSync(avifDoel)) fs.unlinkSync(avifDoel);
        gemaakt.add(path.basename(doel)); gemaakt.add(path.basename(avifDoel));
        process.stdout.write(`  ${path.basename(doel).padEnd(30)} ${(webp.length / 1024) | 0} kB webp, ${(avif.length / 1024) | 0} kB avif\n`);
      }
    }
    await page.close();
  }
  await browser.close();
  /* Standen die niet meer in de reeks zitten, weg. */
  for (const f of fs.readdirSync(MAP)) if (!gemaakt.has(f)) { fs.unlinkSync(path.join(MAP, f)); console.log(`  weg: ${f}`); }
  /* De vingerafdruk van wat er op de schermen stond: tests/laptop-standen.test.mjs
     ziet daaraan of de foto's nog bij de bron horen. */
  fs.writeFileSync(path.join(WORTEL, BRON_JSON), JSON.stringify({ vingerafdruk: await vingerafdruk(WORTEL), standen: gemaakt.size / 2 / BREEDTES.length }, null, 2) + '\n');
  console.log(`\n${gemaakt.size / 2} beelden in public/img/hal/stand/. Bouw de site opnieuw om ze te zien.`);
} finally {
  stop();
}
process.exit(0);
