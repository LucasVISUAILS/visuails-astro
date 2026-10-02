// Ronde 9 · stap 8.3: toetsenbord op de gewone pagina's — eerste Tab = "naar de inhoud", elke focus zichtbaar, niets onzichtbaars in de tabvolgorde.
import { chromium } from 'playwright';
import { SITE } from './_dl.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
const page = await ctx.newPage();
for (const p of ['/nl/', '/nl/pricing/', '/nl/catalog/', '/nl/lifestyle/flash/', '/nl/contact/', '/nl/faq/', '/nl/gallery/', '/nl/plans/', '/pricing/']) {
  await page.goto(SITE + p); await page.waitForTimeout(500);
  const keuze = page.locator('button').filter({ hasText: /Alleen het noodzakelijke|Only the necessary|Essential only/i }).first();
  if (await keuze.count() && await keuze.isVisible()) await keuze.click();
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
  const uit = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const f = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      const s = getComputedStyle(e); const r = e.getBoundingClientRect();
      const zicht = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none' || /underline/.test(s.textDecorationLine);
      return { t: (e.innerText || e.getAttribute('aria-label') || e.name || e.tagName).trim().slice(0, 28), zicht, buiten: r.width === 0 || r.height === 0 || s.visibility === 'hidden' || Number(s.opacity) === 0 };
    });
    if (f) uit.push(f);
  }
  const onzichtbaar = uit.filter((f) => f.buiten).map((f) => f.t);
  const zonderRing = uit.filter((f) => !f.zicht && !f.buiten).map((f) => f.t);
  console.log(`${p.padEnd(22)} 1e: "${uit[0]?.t}" · ${uit.length} stops · zonder zichtbare focus: ${zonderRing.length ? [...new Set(zonderRing)].slice(0, 5).join(' | ') : 'geen'} · onzichtbaar in tabvolgorde: ${onzichtbaar.length ? [...new Set(onzichtbaar)].slice(0, 5).join(' | ') : 'geen'}`);
}
await b.close(); process.exit(0);
