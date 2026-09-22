import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-09-05T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' }]);
await ctx.addInitScript(() => { try { localStorage.setItem('vis_proef_dicht', String(Date.now() + 86400000)); } catch {} });
const p = await ctx.newPage();
const t0 = Date.now();
await p.goto('http://127.0.0.1:4399/' + (process.argv[2] || 'nl/'), { waitUntil: 'load' });
for (const t of [800, 3400, 6000, 8600, 11200]) {
  const wait = t - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait);
  await p.locator('.hero-h1').screenshot({ path: `/tmp/claude-0/wissel-${t}.png` });
}
console.log(await p.evaluate(() => [...document.querySelectorAll('.wissel-woord')].map((e) => { const cs = getComputedStyle(e); return e.textContent + ' ' + cs.opacity + ' ' + cs.animationName + ' ' + cs.animationDelay; })));
await b.close();
