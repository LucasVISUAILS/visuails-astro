/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE BEELDREEKS VAN DE OPENING OMZETTEN EN DE SCHERMEN FOTOGRAFEREN
 * 25 oktober 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   python scripts/opening-reeks.py <video.mp4> <still-3840.png> <werkmap>
 *   node scripts/opening-reeks.mjs <werkmap>                 (schermen + omzetten)
 *   node scripts/opening-reeks.mjs <werkmap> --zonder-schermen
 *
 * Stap 2 van de opening (stap 1 is opening-reeks.py, zie de kop daar).
 *
 * 1. DE SCHERMEN. Start `astro dev` met LAPTOP_BRON=1 (zoals laptop-standen.mjs), opent
 *    /laptop-bron/<taal>/ en fotografeert van de eerste stand alleen het laptopscherm
 *    (de winkel van JOUWMERK) en het telefoonscherm, plat, zonder perspectief, op DPR 2.
 *    De voorpagina zet ze met matrix3d op de hoeken die opening-reeks.py per beeld mat.
 *    Het telefoonscherm is in beide talen gelijk (de telefoonfoto), dus er is er één.
 * 2. OMZETTEN naar public/img/hal/opening/:
 *    - f/NNN.avif, beeld 17 – 133, 1600 × 840, AVIF 60. De reeks beweegt; 60 is daar
 *      niet van verliesloos te onderscheiden en houdt de hele reeks op ± 1,4 MB.
 *    - still-<breedte>.avif/.webp in 1200, 1600 en 2400: het rustbeeld en het eerste
 *      beeld dat de bezoeker ziet (de LCP). AVIF 78 met 4:4:4 en WebP 90, net als de
 *      laptopstanden (levering 65, "DE SCHERPTE").
 *    - scherm-<taal>-laptop.avif/.webp (1600 breed) en scherm-telefoon.avif/.webp (540).
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
      await page.close();
    }
    await browser.close();
  } finally {
    stop();
  }
}

/* ── 2 · omzetten ────────────────────────────────────────────────────────── */
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
let reeks = 0;
for (let i = DATA.eerste; i <= DATA.laatste; i++) {
  const naam = String(i).padStart(3, '0');
  const uit = await sharp(path.join(WERK, 'png', `${naam}.png`)).avif(AVIF_REEKS).toBuffer();
  fs.writeFileSync(path.join(MAP, 'f', `${naam}.avif`), uit);
  reeks += uit.length;
}
console.log(`reeks: ${DATA.laatste - DATA.eerste + 1} beelden, ${(reeks / 1048576).toFixed(2)} MB`);

for (const w of [1200, 1600, 2400]) {
  const klein = await sharp(path.join(WERK, 'still.png')).resize(w, null, { kernel: 'lanczos3' }).png().toBuffer();
  const webp = await sharp(klein).webp(WEBP).toBuffer();
  const avif = await sharp(klein).avif(AVIF_SCHERP).toBuffer();
  fs.writeFileSync(path.join(MAP, `still-${w}.webp`), webp);
  fs.writeFileSync(path.join(MAP, `still-${w}.avif`), avif);
  console.log(`still-${w}: ${kb(webp.length)} webp, ${kb(avif.length)} avif`);
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
