/* Schermafdrukken van VISUAILS Studio uit het testharnas (19 sep 2026):
   dezelfde in-memory worker als tests/studio-vorm.test.mjs, de HTML naar
   kladblok/schermen/studio/, en dan Playwright erover met de CSS uit dist. */
import { startStudio } from '../tests/lib/studio-worker.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const UIT = new URL('./schermen/studio/', import.meta.url).pathname;
mkdirSync(UIT, { recursive: true });
const studio = await startStudio();
const PADEN = ['/account', '/account/plan', '/account/plan?tab=bestellen', '/account/plan?tab=bestellen&kies=1', '/account/plan?tab=facturering', '/account/orders', '/account/brand-kit'];
const bestanden = [];
for (const pad of PADEN) {
  const r = await studio.fetch(pad);
  let html = await r.text();
  /* Stijl en beelden komen van de dist-server op :4399. */
  html = html.replace(/(href|src)="\//g, '$1="http://127.0.0.1:4399/');
  const naam = pad.replace(/^\/account\/?/, 'account-').replace(/[?&=]/g, '_').replace(/-$/, '') || 'account';
  const f = `${UIT}${naam}.html`;
  writeFileSync(f, html);
  bestanden.push([pad, f]);
}
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [pad, f] of bestanden) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('file://' + f, { waitUntil: 'load' });
  await p.waitForTimeout(400);
  await p.screenshot({ path: f.replace(/\.html$/, '.png'), fullPage: true });
  const hoogte = await p.evaluate(() => document.documentElement.scrollHeight);
  console.log(pad, hoogte);
  await p.close();
}
await b.close();
await studio.stop?.();
process.exit(0);
