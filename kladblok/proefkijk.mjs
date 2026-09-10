import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://127.0.0.1:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, w, h] of [['breed', 1280, 1100], ['telefoon', 390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${B}/test-sample/`, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => { for (const k of document.querySelectorAll('button, a')) if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/proefpagina-${naam}.png`, fullPage: naam === 'breed' });
  await p.close();
}
await b.close();
