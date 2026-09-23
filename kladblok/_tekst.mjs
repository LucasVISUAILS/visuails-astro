// Zichtbare tekst van pagina's: node kladblok/_tekst.mjs /pad/ /pad2/ …  → /tmp/claude-0/tekst/<pad>.txt
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('/tmp/claude-0/tekst', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ locale: 'en-US', viewport: { width: 1440, height: 900 } });
for (const pad of process.argv.slice(2)) {
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'domcontentloaded' });
  const t = await p.evaluate(() => (document.querySelector('main') || document.body).innerText);
  writeFileSync(`/tmp/claude-0/tekst/${pad.replace(/\//g, '_') || 'home'}.txt`, t);
}
await b.close();
