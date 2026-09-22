/* Schiet de fontproefpagina af. Eén beeld per rij kaarten zou te smal worden,
   dus: de hele pagina in één plaat, op 1500 px breed zodat het raster op
   drie kolommen uitkomt (minmax 420px). */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const hier = path.dirname(fileURLToPath(import.meta.url));
const pad = path.join(hier, 'fontproef', 'index.html');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 2 });
await page.goto('file://' + pad);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(hier, 'fontproef', 'fontproef.png'), fullPage: true });

/* En een uitsnede van alleen de wenkbrauwen + kleine regels, want dat is waar
   hij op moet letten en dat verdwijnt in een plaat van 4000 px hoog. */
const kaarten = await page.$$('.kaart');
for (let i = 0; i < kaarten.length; i++) {
  await kaarten[i].screenshot({ path: path.join(hier, 'fontproef', `kaart-${i}.png`) });
}
await browser.close();
console.log('klaar:', kaarten.length, 'kaarten');
