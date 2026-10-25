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
 *      elke stand als een vak van 2304 × 1296 (de maat van de foto), met de
 *      schermen erin in het perspectief van de foto.
 *   2. Opent die pagina in Chromium op precies 2304 px breed, wacht op de letters
 *      en tot elk beeld geladen en gedecodeerd is, en maakt van elk vak een foto.
 *   3. Schrijft public/img/hal/stand/<taal>-<set>-<n>-<breedte>.webp in 1000, 1600
 *      en 2304 px, en een AVIF ernaast als die kleiner is. Zie DE SCHERPTE hieronder.
 *   4. Haalt standen weg die niet meer in de reeks zitten.
 *   5. Zet de eerste stand (NL, catalog) ook neer als public/img/hal/laptop-<breedte>.webp
 *      (en .avif): de foto met de schermen erin, voor het deelplaatje (make-og.mjs) en
 *      voor als er geen enkele stand is (HalLaptop.astro). Sinds 20 oktober 2026; eerst
 *      was dat een los gemaakte foto, en de bron lag eronder (nu pov-2304.webp).
 *   6. Schrijft de vingerafdruk van de bron naar src/data/halStanden.bron.json.
 *
 * tests/laptop-standen.test.mjs kijkt daarna na of elke stand er in elke breedte
 * ligt en of de foto's de maat van de foto hebben.
 *
 * DE SCHERPTE (levering 65, 20 oktober 2026). Lucas: "De foto's zijn van enorm lage
 * kwaliteit. Dit is niet goed voor vertrouwen bij de klant." Gemeten op en-catalog-2,
 * de stand van zijn schermafbeelding, tegen een verliesloze foto op DPR 2:
 *   - De AVIF kwam uit de WebP (twee keer verlies), op kwaliteit 52 met 4:2:0. Op 1600
 *     px was dat 44 kB, en de stof van de jeans, de regel "Free returns" en de foto op
 *     de telefoon waren uitgesmeerd (SSIM telefoonscherm 0,938).
 *   - Nu: de bron op DPR 2 gefotografeerd (4608 × 2592), zodat de schuine schermen
 *     dubbel zo fijn getekend worden, en met lanczos3 terug naar 1000, 1600 en 2304.
 *     Elke WebP en elke AVIF komt rechtstreeks uit die verliesloze foto.
 *   - AVIF 78 met 4:4:4 (volle kleur): op 1600 px 81 kB, SSIM laptopscherm 0,996 en
 *     telefoonscherm 0,983. Kwaliteit 70 haalde op de telefoon 0,977 (64 kB); de eis
 *     was 0,98 of meer, want de telefoonfoto is het fijnste stuk van het beeld.
 *   - WebP 90 (voor de paar browsers zonder AVIF): 111 kB, SSIM 0,994 en 0,979.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { browserPad } from './lib/browserpad.mjs';
import { vingerafdruk, BRON_JSON } from './lib/laptopbron.mjs';
import { FOTO } from '../src/data/halLaptop.js';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MAP = path.join(WORTEL, 'public', 'img', 'hal', 'stand');
const BREEDTES = [1000, 1600, 2304];
const poortArg = process.argv.indexOf('--poort');
const POORT = poortArg > -1 ? Number(process.argv[poortArg + 1]) : 4399;
const WEBP = { quality: 90, effort: 6, smartSubsample: true };
const AVIF = { quality: 78, effort: 6, chromaSubsampling: '4:4:4' };
const DPR = 2;   // de bron dubbel zo fijn fotograferen (zie DE SCHERPTE)

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
    const page = await browser.newPage({ viewport: { width: FOTO.w, height: FOTO.h }, deviceScaleFactor: DPR });
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
      if (meta.width !== FOTO.w * DPR || meta.height !== FOTO.h * DPR) throw new Error(`${naam}: ${meta.width} × ${meta.height}, verwacht ${FOTO.w * DPR} × ${FOTO.h * DPR}`);
      for (const w of BREEDTES) {
        const h = Math.round((w * FOTO.h) / FOTO.w);
        /* eerst verliesloos naar de breedte, dan elk formaat apart uit die foto */
        const klein = await sharp(png).resize(w, h, { kernel: 'lanczos3' }).png().toBuffer();
        const webp = await sharp(klein).webp(WEBP).toBuffer();
        const doel = path.join(MAP, `${naam}-${w}.webp`);
        fs.writeFileSync(doel, webp);
        const avif = await sharp(klein).avif(AVIF).toBuffer();
        const avifDoel = doel.replace(/\.webp$/, '.avif');
        if (avif.length < webp.length) fs.writeFileSync(avifDoel, avif); else if (fs.existsSync(avifDoel)) fs.unlinkSync(avifDoel);
        gemaakt.add(path.basename(doel)); gemaakt.add(path.basename(avifDoel));
        process.stdout.write(`  ${path.basename(doel).padEnd(30)} ${(webp.length / 1024) | 0} kB webp, ${(avif.length / 1024) | 0} kB avif\n`);
      }
    }
    await page.close();
  }
  await browser.close();
  /* De foto met de schermen erin: de eerste stand, NL, catalog. */
  for (const w of BREEDTES) for (const ext of ['webp', 'avif']) {
    const van = path.join(MAP, `nl-catalog-0-${w}.${ext}`), naar = path.join(WORTEL, 'public', 'img', 'hal', `laptop-${w}.${ext}`);
    if (fs.existsSync(van)) fs.copyFileSync(van, naar); else if (fs.existsSync(naar)) fs.unlinkSync(naar);
  }
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
