import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await (await b.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 3 })).newPage();
await p.goto('file:///home/claude/repo/kladblok/kledingproef/index.html', { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
const s = await p.$$('.sectie');
await s[1].screenshot({ path: 'kladblok/kledingproef/mobiel-kaart.png' });
await b.close(); console.log('ok');
