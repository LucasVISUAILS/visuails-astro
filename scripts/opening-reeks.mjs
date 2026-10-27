/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE BEELDREEKS VAN DE OPENING OMZETTEN EN DE SCHERMEN FOTOGRAFEREN
 * 25 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   python scripts/opening-reeks.py <video.mp4> <still-3840.png> <werkmap>
 *   node scripts/opening-reeks.mjs <werkmap>                 (schermen + omzetten)
 *   node scripts/opening-reeks.mjs <werkmap> --zonder-schermen
 *   node scripts/opening-reeks.mjs <werkmap> --alleen-schermen    (de reeks en de still niet opnieuw)
 *
 * Stap 2 van de opening (stap 1 is opening-reeks.py, zie de kop daar).
 *
 * 1. DE SCHERMEN. Start `astro dev` met LAPTOP_BRON=1 (zoals laptop-standen.mjs), opent
 *    /laptop-bron/<taal>/ en fotografeert van ELKE stand (sinds levering 75: Lucas, 23:35, "de
 *    mogelijkheden van de laptop en het wisselen van scherm (zoals het instagram voorbeeld
 *    mockup) … ik wil dit terug") het laptopscherm en het telefoonscherm, plat, zonder
 *    perspectief, op DPR 2: de webshop met de vier catalogbeelden, het Instagram-bericht met de
 *    vier lifestylebeelden en de clip. De voorpagina zet ze met matrix3d op de hoeken die
 *    opening-reeks.py per beeld mat. Een telefoonscherm dat gelijk is aan dat van de stand ervoor,
 *    wordt niet nog eens bewaard.
 * 2. OMZETTEN naar public/img/hal/opening/:
 *    - f/NNN.avif, beeld 17 – 133, 2352 × 903 (sinds levering 75 met de doorgetrokken armen;
 *      wat erbij kwam is vooral wit en kost weinig), AVIF 60. De reeks beweegt; 60 is daar
 *      niet van verliesloos te onderscheiden.
 *    - still-<breedte>.avif/.webp in 1800, 2700 en 3600: het rustbeeld en het eerste
 *      beeld dat de bezoeker ziet (de LCP). AVIF 78 met 4:4:4 en WebP 90, net als de
 *      laptopstanden (levering 65, "DE SCHERPTE").
 *    - scherm/<taal>-<set>-<n>.avif/.webp per stand (laptop 1600 breed, telefoon 540), en
 *      scherm-<taal>-laptop / scherm-telefoon als de eerste stand (voor de fallback zonder script).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const WORTEL = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WERK = process.argv[2];
if (!WERK || !fs.existsSync(path.join(WERK, 'png'))) {
  console.log('Gebruik: node scripts/opening-reeks.mjs <werkmap>  (eerst python scripts/opening-reeks.py …)');
  process.exit(1);
}
const MAP = path.join(WORTEL, 'public', 'img', 'hal', 'opening');
fs.mkdirSync(path.join(MAP, 'f'), { recursive: true });
fs.mkdirSync(path.join(WERK, 'scherm'), { recursive: true });
const DATA = JSON.parse(fs.readFileSync(path.join(WORTEL, 'src', 'data', 'openingSchermen.json'), 'utf8'));
const WEBP = { quality: 90, effort: 6, smartSubsample: true, alphaQuality: 100 };
const AVIF_SCHERP = { quality: 78, effort: 6, chromaSubsampling: '4:4:4' };
const AVIF_REEKS = { quality: 60, effort: 4 };

/* ── 1 · de schermen ─────────────────────────────────────────────────────── */
if (!process.argv.includes('--zonder-schermen')) {
  const { chromium } = await import('playwright');
  const { browserPad } = await import('./lib/browserpad.mjs');
  const POORT = 4397;
  const dev = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['astro', 'dev', '--port', String(POORT), '--host', '127.0.0.1'], {
    cwd: WORTEL, env: { ...process.env, LAPTOP_BRON: '1', ASTRO_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32',
  });
  let log = '';
  dev.stdout.on('data', (d) => { log += d; });
  dev.stderr.on('data', (d) => { log += d; });
  const stop = () => { try { process.platform === 'win32' ? spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F']) : dev.kill('SIGTERM'); } catch {} };
  process.on('exit', stop);
  const basis = `http://127.0.0.1:${POORT}`;
  try {
    for (let i = 0; ; i++) {
      try { const r = await fetch(`${basis}/laptop-bron/nl/`); if (r.ok) break; } catch {}
      if (i > 90) throw new Error(`astro dev kwam niet op (poort ${POORT}).\n${log.slice(-2000)}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
    const browser = await chromium.launch({ executablePath: process.env.CHROME || browserPad() });
    for (const lang of ['nl', 'en']) {
      const page = await browser.newPage({ viewport: { width: 2400, height: 1600 }, deviceScaleFactor: 2 });
      await page.goto(`${basis}/laptop-bron/${lang}/`, { waitUntil: 'load' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((img) => { img.loading = 'eager'; return img.complete ? img.decode().catch(() => {}) : new Promise((r) => { img.onload = r; img.onerror = r; }); }));
        /* plat en los: geen perspectief, geen masker, geen glans */
        const lap = document.querySelector('.hl-scherm-lap'), fon = document.querySelector('.hl-scherm-fon');
        for (const e of [lap, fon]) {
          e.style.transform = 'none'; e.style.webkitMaskImage = 'none'; e.style.maskImage = 'none'; e.style.left = '0'; e.style.top = '0';
          e.querySelectorAll('.sc-glans').forEach((g) => { g.style.display = 'none'; });
        }
        for (let a = lap; a && a !== document.body; a = a.parentElement) { a.style.overflow = 'visible'; a.style.transform = 'none'; }
        fon.style.visibility = 'hidden';
      });
      await page.locator('.hl-scherm-lap').first().screenshot({ path: path.join(WERK, 'scherm', `${lang}-laptop.png`) });
      if (lang === 'nl') {
        await page.evaluate(() => { document.querySelector('.hl-scherm-fon').style.visibility = 'visible'; document.querySelector('.hl-scherm-lap').style.visibility = 'hidden'; });
        await page.locator('.hl-scherm-fon').first().screenshot({ path: path.join(WERK, 'scherm', 'telefoon.png') });
      }
      /* elke stand (levering 75): elk vak plat maken en beide schermen fotograferen */
      await page.evaluate(() => {
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
      const vakken = await page.$$('[data-bron-stand]');
      for (const vak of vakken) {
        const naam = await vak.getAttribute('data-bron-stand');
        /* alleen dit vak: anders liggen de schermen van alle standen op elkaar en fotografeer je
           steeds het bovenste (25 oktober, eerste ronde: negen keer hetzelfde scherm) */
        await page.evaluate((n) => { for (const v of document.querySelectorAll('[data-bron-stand]')) v.style.display = v.getAttribute('data-bron-stand') === n ? '' : 'none'; }, naam);
        await vak.scrollIntoViewIfNeeded();
        await vak.evaluate((v) => { v.querySelector('.hl-scherm-fon').style.visibility = 'hidden'; v.querySelector('.hl-scherm-lap').style.visibility = 'visible'; });
        await (await vak.$('.hl-scherm-lap')).screenshot({ path: path.join(WERK, 'scherm', `${naam}-laptop.png`) });
        await vak.evaluate((v) => { v.querySelector('.hl-scherm-fon').style.visibility = 'visible'; v.querySelector('.hl-scherm-lap').style.visibility = 'hidden'; });
        await (await vak.$('.hl-scherm-fon')).screenshot({ path: path.join(WERK, 'scherm', `${naam}-telefoon.png`) });
      }
      await page.close();
    }
    await browser.close();
  } finally {
    stop();
  }
}

/* ── 2 · omzetten ────────────────────────────────────────────────────────── */
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
const ALLEEN_SCHERMEN = process.argv.includes('--alleen-schermen');
let reeks = 0;
for (let i = DATA.eerste; i <= (ALLEEN_SCHERMEN ? DATA.eerste - 1 : DATA.laatste); i++) {
  const naam = String(i).padStart(3, '0');
  const uit = await sharp(path.join(WERK, 'png', `${naam}.png`)).avif(AVIF_REEKS).toBuffer();
  fs.writeFileSync(path.join(MAP, 'f', `${naam}.avif`), uit);
  reeks += uit.length;
}
if (!ALLEEN_SCHERMEN) console.log(`reeks: ${DATA.laatste - DATA.eerste + 1} beelden, ${(reeks / 1048576).toFixed(2)} MB`);

/* de still is sinds levering 75 het hele beeld met de doorgetrokken armen (3360 videopixels
   breed op 2×); het videobeeld zelf is 4/7 daarvan, dus voor dezelfde scherpte als eerst
   1800, 2700 en 3600 */
for (const w of ALLEEN_SCHERMEN ? [] : [1800, 2700, 3600]) {
  const klein = await sharp(path.join(WERK, 'still.png')).resize(w, null, { kernel: 'lanczos3' }).png().toBuffer();
  const webp = await sharp(klein).webp(WEBP).toBuffer();
  const avif = await sharp(klein).avif(AVIF_SCHERP).toBuffer();
  fs.writeFileSync(path.join(MAP, `still-${w}.webp`), webp);
  fs.writeFileSync(path.join(MAP, `still-${w}.avif`), avif);
  console.log(`still-${w}: ${kb(webp.length)} webp, ${kb(avif.length)} avif`);
}

/* de schermen per stand (levering 75): public/img/hal/opening/scherm/<taal>-<set>-<n>.avif/webp
   (laptop, 1600 breed) en …-tel.avif/webp (telefoon, 540 breed; alleen als hij anders is dan
   de stand ervoor). src/data/openingStanden.js zoekt ze op. */
fs.rmSync(path.join(MAP, 'scherm'), { recursive: true, force: true });   // geen oude standen laten liggen
fs.mkdirSync(path.join(MAP, 'scherm'), { recursive: true });
const per = fs.readdirSync(path.join(WERK, 'scherm')).filter((f) => /^(nl|en)-[a-z]+-\d+-laptop\.png$/.test(f)).sort();
let vorigeTel = null, vorigeTaal = '';
for (const f of per) {
  const naam = f.replace(/-laptop\.png$/, '');
  if (naam.slice(0, 2) !== vorigeTaal) { vorigeTel = null; vorigeTaal = naam.slice(0, 2); }   // elke taal begint met een eigen telefoon
  for (const [soort, w, achter] of [['laptop', 1600, ''], ['telefoon', 540, '-tel']]) {
    const bron = path.join(WERK, 'scherm', `${naam}-${soort}.png`);
    if (!fs.existsSync(bron)) continue;
    const klein = await sharp(bron).resize(w, null, { kernel: 'lanczos3' }).png().toBuffer();
    if (soort === 'telefoon') {
      const ruw = await sharp(klein).raw().toBuffer();
      if (vorigeTel && Buffer.compare(ruw, vorigeTel) === 0) continue;
      vorigeTel = ruw;
    }
    const webp = await sharp(klein).webp({ quality: 90, effort: 6 }).toBuffer();
    const avif = await sharp(klein).avif(AVIF_SCHERP).toBuffer();
    fs.writeFileSync(path.join(MAP, 'scherm', `${naam}${achter}.webp`), webp);
    fs.writeFileSync(path.join(MAP, 'scherm', `${naam}${achter}.avif`), avif);
    console.log(`scherm/${naam}${achter}: ${kb(webp.length)} webp, ${kb(avif.length)} avif`);
  }
}

for (const [bron, naar, w] of [['nl-laptop', 'scherm-nl-laptop', 1600], ['en-laptop', 'scherm-en-laptop', 1600], ['telefoon', 'scherm-telefoon', 540]]) {
  const klein = await sharp(path.join(WERK, 'scherm', `${bron}.png`)).resize(w, null, { kernel: 'lanczos3' }).png().toBuffer();
  const webp = await sharp(klein).webp({ quality: 90, effort: 6 }).toBuffer();
  const avif = await sharp(klein).avif(AVIF_SCHERP).toBuffer();
  fs.writeFileSync(path.join(MAP, `${naar}.webp`), webp);
  fs.writeFileSync(path.join(MAP, `${naar}.avif`), avif);
  const meta = await sharp(klein).metadata();
  console.log(`${naar}: ${meta.width} × ${meta.height}, ${kb(webp.length)} webp, ${kb(avif.length)} avif`);
}
