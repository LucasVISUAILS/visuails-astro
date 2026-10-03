// Ontwerpkeuring 3 oktober: volledige pagina's op 1280 en 390, met sectiemeting (hoogte per <section>/<h2>-blok).
import fs from 'node:fs';
import { chromium } from 'playwright';
import { SITE } from './_dl.mjs';
const D = '/tmp/claude-0/keuring-site'; fs.mkdirSync(D, { recursive: true });
const PAGS = (process.argv[2] ? process.argv[2].split(',') : ['/nl/', '/nl/plans/', '/nl/start/plan/', '/nl/pricing/', '/nl/catalog/', '/nl/lifestyle/', '/nl/video/', '/nl/custom-models/', '/nl/how-it-works/', '/nl/studio/', '/nl/start/', '/nl/compare/', '/nl/faq/', '/nl/gallery/', '/nl/contact/', '/nl/about/', '/nl/models/', '/nl/portal/', '/nl/per-product/', '/nl/hooks/', '/nl/editions/', '/nl/upload-guidelines/', '/nl/lifestyle/dunes/', '/nl/catalog/classic/', '/nl/video/motion/', '/nl/test-sample/', '/nl/start/catalog/', '/nl/guides/']);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const uit = {};
for (const w of [1280, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, isMobile: w === 390, hasTouch: w === 390, locale: 'nl-NL' });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ analytics: false, v: 1 })), url: SITE }]);
  const page = await ctx.newPage();
  for (const p of PAGS) {
    await page.goto(SITE + p, { waitUntil: 'load' }).catch(() => null);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(300);
    const secties = await page.evaluate(() => {
      const uit = [];
      for (const s of document.querySelectorAll('main > section, main > div > section, main > *')) {
        const r = s.getBoundingClientRect(); if (r.height < 40) continue;
        const kop = s.querySelector('h1, h2, h3')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 60) || '';
        uit.push(`${Math.round(r.height)}px ${s.tagName.toLowerCase()}.${String(s.className).split(' ')[0]} "${kop}"`);
      }
      return { hoogte: Math.round(document.documentElement.scrollHeight), secties: uit };
    });
    const naam = p.replace(/^\/nl\/?/, '').replace(/\/$/, '').replace(/\//g, '-') || 'home';
    await page.screenshot({ path: `${D}/${naam}-${w}.png`, fullPage: true });
    uit[`${naam}-${w}`] = secties;
    console.log(w, naam, secties.hoogte + 'px', secties.secties.length, 'secties');
  }
  await ctx.close();
}
fs.writeFileSync(`${D}/secties.json`, JSON.stringify(uit, null, 1));
await b.close();
