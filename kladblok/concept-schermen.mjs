/* Schermafbeeldingen van de conceptpagina's: node kladblok/concept-schermen.mjs [naam…]
   Vraagt een draaiende `astro dev --port 4331`. Schrijft naar kladblok/concepten/schermen/. */
import { chromium } from 'playwright';
import fs from 'node:fs';

const NAMEN = process.argv.slice(2).length ? process.argv.slice(2) : ['stilte', 'verschuiving', 'adem'];
const uit = 'kladblok/concepten/schermen';
fs.mkdirSync(uit, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const naam of NAMEN) {
  for (const [label, w, h] of [['desktop', 1440, 900], ['mobiel', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const fouten = [];
    page.on('console', (m) => { if (m.type() === 'error') fouten.push(m.text()); });
    page.on('response', (r) => { if (r.status() >= 400) fouten.push(`${r.status()} ${r.url()}`); });
    await page.goto(`http://localhost:4331/concept/${naam}?stil`, { waitUntil: 'networkidle', timeout: 90000 });
    /* Lui geladen beelden nu laden, anders staan ze leeg op de schermafbeelding. */
    await page.evaluate(async () => { const imgs = [...document.querySelectorAll('img')]; imgs.forEach((i) => { i.loading = 'eager'; }); await Promise.all(imgs.map((i) => i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))); await Promise.all(imgs.map((i) => i.decode().catch(() => {}))); });
    /* Alles wat op scroll rijst even wakker maken: naar beneden en terug. */
    const hoogte = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < hoogte; y += h * 0.8) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(80); }
    await page.evaluate(() => { window.scrollTo(0, 0); document.querySelector('astro-dev-toolbar')?.remove(); });
    await page.waitForTimeout(400);
    /* Een horizontale pagina (concept G) past niet in één fullPage-opname: die
       neemt alleen de eerste schermbreedte mee. Voor die pagina's stappen we
       zijwaarts door de hal en plakken we de schermen naast elkaar. */
    const hal = await page.$('[data-hal]');
    const halBreed = hal ? await page.evaluate(() => { const el = document.querySelector('[data-hal]'); return el.scrollWidth > el.clientWidth ? el.scrollWidth : 0; }) : 0;
    if (halBreed) {
      const stappen = Math.ceil(halBreed / w);
      const delen = [];
      for (let i = 0; i < stappen; i++) {
        await page.evaluate((x) => { document.querySelector('[data-hal]').scrollLeft = x; }, i * w);
        await page.waitForTimeout(220);
        delen.push(await page.screenshot());
      }
      const sharp = (await import('sharp')).default;
      await sharp({ create: { width: w * stappen, height: h, channels: 3, background: '#fff' } })
        .composite(delen.map((buf, i) => ({ input: buf, left: i * w, top: 0 })))
        .png().toFile(`${uit}/${naam}-${label}.png`);
      await page.evaluate(() => { document.querySelector('[data-hal]').scrollLeft = 0; });
    } else {
      await page.screenshot({ path: `${uit}/${naam}-${label}.png`, fullPage: true });
    }
    await page.screenshot({ path: `${uit}/${naam}-${label}-boven.png`, fullPage: false });
    console.log(naam, label, `${hoogte}px hoog`, fouten.length ? `FOUTEN:\n  ${fouten.join('\n  ')}` : 'schoon');
    await page.close();
  }
}
await browser.close();
