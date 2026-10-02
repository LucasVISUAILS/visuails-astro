// Ronde 9 · stap 8 / nacontrole 6: volledige schermafdruk van elke pagina op 1280 en 390, voor het oog en om naast
// de vorige ronde te leggen. /tmp/claude-0/scherm/<pad>-<breedte>.png
//   node kladblok/_r9-schermen.mjs [filter] [breedtes, bv. 1280,390]
import fs from 'node:fs';
import { chromium } from 'playwright';
import { SITE } from './_dl.mjs';
const D = '/tmp/claude-0/scherm'; fs.mkdirSync(D, { recursive: true });
const filter = process.argv[2] || '';
const breedtes = (process.argv[3] || '1280,390').split(',').map(Number);
const xml = await fetch(SITE + '/sitemap.xml').then((r) => r.text());
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).filter((p) => p.includes(filter));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const w of breedtes) {
  const ctx = await b.newContext({ viewport: { width: w, height: w <= 400 ? 844 : 900 }, isMobile: w <= 400, hasTouch: w <= 768, locale: 'nl-NL', reducedMotion: 'reduce' });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, v: 1 })), url: SITE }]);
  const page = await ctx.newPage();
  for (const p of urls) {
    await page.goto(SITE + p, { waitUntil: 'load' }).catch(() => {});
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(400);
    /* Wachten tot elk beeld er echt is — anders staan er lege vlakken op de afdruk die er in het echt niet zijn. */
    await page.evaluate(() => Promise.all([...document.images].map((i) => { i.loading = 'eager'; return i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }); })));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${D}/${p.replace(/\//g, '_') || '_'}-${w}.png`, fullPage: true });
  }
  await ctx.close();
}
await b.close();
console.log('klaar', urls.length * breedtes.length);
process.exit(0);
