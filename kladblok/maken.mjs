/* DE SECTIE "WAT WE MAKEN" NA HET RECHTTREKKEN — 10 september 2026
   Lucas: *"Moet 'What we make.' sectie nog rechtgetrokken worden met wat er op
   /start nu staat?"* Dit zet de sectie in beeld, breed en op een telefoon. */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://localhost:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, w, h] of [['breed', 1280, 1000], ['telefoon', 390, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(`${B}/nl`, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    for (const k of document.querySelectorAll('button, a')) {
      if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click();
    }
  });
  await p.waitForTimeout(300);
  const s = await p.$('#maken');
  if (s) await s.scrollIntoViewIfNeeded();
  await p.waitForTimeout(500);
  await p.screenshot({ path: `/tmp/maken-${naam}.png` });
  const box = s ? await s.boundingBox() : null;
  console.log(naam, box ? `${Math.round(box.width)}×${Math.round(box.height)}` : 'geen #maken');
  await p.close();
}
await b.close();
