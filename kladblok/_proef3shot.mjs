import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 })).newPage();
await p.goto('file:///home/claude/repo/kladblok/fontproef3/index.html', { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700);
await p.screenshot({ path: 'kladblok/fontproef3/alles.png', fullPage: true });
const blokken = await p.$$('.blok');
for (let i = 0; i < blokken.length; i++) await blokken[i].screenshot({ path: `kladblok/fontproef3/kaart-${'ABCDN'[i]}.png` });
await b.close(); console.log('ok');
