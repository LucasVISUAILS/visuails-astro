/* DE WHATSAPP-KNOP EN ZIJN HOVER — 10 september 2026
   Lucas: *"is die knop ook niet mooi als je erover heen hovert."* */
import { chromium } from 'playwright';
const B = process.env.BASIS || 'http://localhost:4331';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [naam, thema] of [['licht', 'light'], ['donker', 'dark']]) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: thema });
  await p.goto(`${B}/nl/`, { waitUntil: 'networkidle' });
  await p.evaluate(() => {
    for (const k of document.querySelectorAll('button, a')) {
      if (/noodzakelijke|akkoord|accepteer/i.test(k.textContent || '')) k.click();
    }
  });
  await p.waitForTimeout(400);
  const knop = await p.$('.wa-launcher');
  await knop.hover();
  await p.waitForTimeout(600);
  const doos = await p.evaluate(() => {
    const w = document.querySelector('.wa-launcher');
    const l = document.querySelector('.wa-launcher-label');
    const r = w.getBoundingClientRect();
    const rl = l ? l.getBoundingClientRect() : null;
    const cs = getComputedStyle(w);
    return {
      knop: `${Math.round(r.width)}×${Math.round(r.height)}`, radius: cs.borderRadius,
      label: rl ? `${Math.round(rl.width)}×${Math.round(rl.height)} op x=${Math.round(rl.left)}` : 'geen',
      labelRadius: l ? getComputedStyle(l).borderRadius : '',
      samen: rl ? `${Math.round(r.right - rl.left)}×${Math.round(r.height)}` : '',
    };
  });
  console.log(naam, JSON.stringify(doos));
  await p.screenshot({ path: `/tmp/waknop-${naam}.png`, clip: { x: 950, y: 780, width: 330, height: 110 } });
  await p.close();
}
await b.close();
