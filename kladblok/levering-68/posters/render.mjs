// node render.mjs <html> <uitmap> [schaal]  — fotografeert elke <svg data-naam> los
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs'; import path from 'node:path';
const [html, uit, schaal = '3'] = process.argv.slice(2);
fs.mkdirSync(uit, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: +schaal });
await p.goto('file://' + path.resolve(html));
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(400);
const n = await p.$$eval('[data-naam]', (els) => els.map((e) => e.getAttribute('data-naam')));
for (const naam of n) {
  const el = await p.$(`[data-naam="${naam}"]`);
  await el.screenshot({ path: path.join(uit, naam + '.png'), omitBackground: false });
}
console.log(n.length, 'beelden');
await b.close();
