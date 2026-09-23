// Schermafdruk van één element: node kladblok/_sectie.mjs pad selector naam [breedte]
import { chromium } from 'playwright';
const [pad, sel, naam, w = '1440'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 } });
await ctx.addCookies([{ name: 'vis_consent', value: 'essential', domain: '127.0.0.1', path: '/' }]);
await ctx.addInitScript(() => { try { localStorage.setItem('vis_proef_dicht', String(Date.now() + 86400000)); } catch {} });
if (process.env.INGELOGD) await ctx.route('**/account/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important} .reveal,.pending{opacity:1!important;transform:none!important} .cookie,[data-cookie],.ck-balk,.site-header{display:none!important}' });
await p.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
for (let y = 0; y < 14000; y += 700) { await p.evaluate((y) => window.scrollTo(0, y), y); await p.waitForTimeout(40); }
await p.waitForTimeout(300);
await p.waitForLoadState('networkidle').catch(() => {});
await p.locator(sel).first().screenshot({ path: `/tmp/claude-0/${naam}.png` });
await b.close();
