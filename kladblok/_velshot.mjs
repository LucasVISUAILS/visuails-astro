import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const paden = [['lifestyle','/nl/lifestyle/']];
for (const [naam, pad] of paden) {
  for (const [w, tag] of [[1440,'breed']]) {
    const p = await b.newPage({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 2 });
    await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.evaluate(() => { document.querySelectorAll('.cc, [class*="cookie"]').forEach((e) => e.remove()); });
    /* Langzaam door de pagina zodat de luie beelden laden en de onthul-animaties
       hun eindstand halen — anders staat de helft van het vel leeg of half
       doorzichtig op de foto. */
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90));
      }
      window.scrollTo(0, 0);
    });
    await p.evaluate(() => Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; }))));
    await p.waitForTimeout(600);
    const el = await p.$('.sr');
    if (!el) { console.log('geen .sr op', pad); await p.close(); continue; }
    await el.screenshot({ path: `kladblok/_vel-${naam}-${tag}.png` });
    const d = await el.boundingBox();
    console.log(naam, tag, Math.round(d.width) + '×' + Math.round(d.height));
    await p.close();
  }
}
await b.close();
