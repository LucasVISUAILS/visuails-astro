/* Schermafdrukken van de fontproef: de hele plaat plus elke kaart apart, zodat
   je ze naast elkaar én op ware grootte kunt bekijken. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const UIT = 'kladblok/fontproef2';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1560, height: 1200 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto('file://' + path.resolve(UIT, 'index.html'), { waitUntil: 'load' });
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(900);
await p.screenshot({ path: path.join(UIT, 'alles.png'), fullPage: true });
const kaarten = await p.$$('.kaart');
for (let i = 0; i < kaarten.length; i++) {
  await kaarten[i].screenshot({ path: path.join(UIT, `kaart-${'ABCDEFG'[i]}.png`) });
}
console.log(`${kaarten.length} kaarten`);
await b.close();
