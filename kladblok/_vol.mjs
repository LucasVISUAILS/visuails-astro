// Hele pagina, verkleind: node kladblok/_vol.mjs pad naam [breedte]
import { chromium } from 'playwright';
const [pad, naam, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 }, locale: 'en-US' });
await ctx.addCookies([{ name: 'vis_consent', value: 'essential', domain: '127.0.0.1', path: '/' }]);
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important} .reveal,.pending{opacity:1!important;transform:none!important} .site-header{position:static!important}' });
await p.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
for (let y = 0; y < 20000; y += 800) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(30); }
await p.evaluate(() => window.scrollTo(0, 0));
await p.waitForTimeout(400);
await p.screenshot({ path: `/tmp/claude-0/${naam}.png`, fullPage: true });
await b.close();
