/* Zelfde meting, maar met een afgeknepen processor (4x langzamer) — dat lijkt
   meer op een laptop die ook nog andere dingen doet dan een lege headless. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const pad of ['/nl/', '/nl/lifestyle', '/nl/how-it-works', '/nl/gallery']) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await p.goto('http://localhost:4399' + pad, { waitUntil: 'networkidle' });
  await p.waitForTimeout(500);
  const r = await p.evaluate(async () => {
    const frames = []; let vorige = performance.now(); let stop = false;
    const tel = (nu) => { frames.push(nu - vorige); vorige = nu; if (!stop) requestAnimationFrame(tel); };
    requestAnimationFrame(tel);
    const hoog = document.documentElement.scrollHeight - window.innerHeight;
    for (let i = 0; i <= 90; i++) { window.scrollTo(0, Math.round((hoog * i) / 90)); await new Promise((r2) => requestAnimationFrame(r2)); }
    stop = true; await new Promise((r2) => setTimeout(r2, 60));
    const n = frames.slice(3);
    return { gemiddeld: +(n.reduce((a, c) => a + c, 0) / n.length).toFixed(1), boven32: n.filter((f) => f > 32).length, boven50: n.filter((f) => f > 50).length, ergste: +Math.max(...n).toFixed(1) };
  });
  console.log(pad.padEnd(20), JSON.stringify(r));
  await p.close();
}
await b.close();
