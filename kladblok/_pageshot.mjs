import { chromium } from 'playwright';
const [pad, naam, w = 1440] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 } });
await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-09-05T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' }]);
await ctx.addInitScript(() => { try { localStorage.setItem('vis_proef_dicht', String(Date.now() + 86400000)); } catch {} });
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '.cookie, [data-cookie], .ck-balk { display:none !important }' });
for (let y = 0; y < 12000; y += 800) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(80); }
await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
console.log(naam, await p.evaluate(() => document.documentElement.scrollHeight));
await p.screenshot({ path: `/tmp/claude-0/${naam}.png`, fullPage: true });
await b.close();
