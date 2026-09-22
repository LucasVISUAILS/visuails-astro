import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [w, naam, pad] of [[1440, 'hiw-1440', '/nl/how-it-works/'], [390, 'hiw-390', '/nl/how-it-works/'], [1440, 'home-1440', '/nl/']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-09-05T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' }]);
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }));
  for (let y = 0; y < 12000; y += 700) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(60); }
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  console.log(naam, await p.evaluate(() => document.documentElement.scrollHeight));
  await p.screenshot({ path: `/tmp/claude-0/${naam}.png`, fullPage: true });
  await ctx.close();
}
await b.close();
