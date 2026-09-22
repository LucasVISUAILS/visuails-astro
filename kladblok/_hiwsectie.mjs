import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [w, tag] of [[1440, 'breed'], [390, 'smal']]) {
  const p = await b.newPage({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 1 });
  await p.goto('http://127.0.0.1:4399/nl/how-it-works/', { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"], .wa-knop, [class*="whats"]').forEach((e) => e.remove()); });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 70)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(800);
  const el = await p.$('section[aria-labelledby="hiw-flow"]');
  await el.screenshot({ path: `kladblok/_hiw-stroom-${tag}.png` });
  const d = await el.boundingBox();
  console.log(tag, Math.round(d.width) + '×' + Math.round(d.height));
  await p.close();
}
await b.close();
