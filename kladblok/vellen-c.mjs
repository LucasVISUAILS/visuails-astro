import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const B = 'http://127.0.0.1:4399';
const PADEN = process.argv.slice(2);
const UIT = new URL('./schermen/vellen-c/', import.meta.url).pathname; mkdirSync(UIT, { recursive: true });
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await br.newContext({ viewport: { width: 1440, height: 900 } });
for (const pad of PADEN) {
  const pg = await ctx.newPage();
  await pg.goto(B + pad, { waitUntil: 'networkidle' });
  await pg.addStyleTag({ content: '.cookie-band, [data-cookie], .cc, .cookies { display:none !important } .js .reveal.pending, .js .reveal-group > .reveal.pending { opacity: 1 !important; transform: none !important; transition: none !important } .js .reveal-mask .rm-inner { transform: none !important }' });
  await pg.waitForTimeout(500);
  const naam = pad.replace(/\//g, '_').replace(/^_/, '') || 'home';
  await pg.screenshot({ path: `${UIT}${naam}.png`, fullPage: true });
  console.log(pad, await pg.evaluate(() => document.documentElement.scrollHeight));
  await pg.close();
}
await br.close();
