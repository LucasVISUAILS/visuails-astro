import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { startStudio, VOLT } from '../tests/lib/studio-worker.mjs';
const OUT = 'kladblok/studio';
fs.mkdirSync(OUT, { recursive: true });
const studio = await startStudio();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await ctx.addCookies([{ name: 'vis_account', value: VOLT.token, url: studio.url }]);
for (const [naam, pad] of [['abonnement', '/account/plan'], ['planning', '/account/plan?tab=planning'], ['overzicht', '/account']]) {
  const p = await ctx.newPage();
  await p.goto(studio.url + pad, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, `nu-${naam}.png`), fullPage: true });
  console.log(naam, await p.evaluate(() => document.body.scrollHeight));
  await p.close();
}
await ctx.close(); await b.close(); await studio.dispose();
