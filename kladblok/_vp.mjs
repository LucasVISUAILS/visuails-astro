// Eén schermafdruk van het venster (niet de hele pagina): node kladblok/_vp.mjs pad naam [breedte] [scrollY]
import { chromium } from 'playwright';
const [pad, naam, w = '1440', y = '0'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: 900 } });
await ctx.addCookies([{ name: 'vis_consent', value: 'essential', domain: '127.0.0.1', path: '/' }]);
if (process.env.INGELOGD) await ctx.route('**/account/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'networkidle' });
await p.addStyleTag({ content: '.reveal,.pending{opacity:1!important;transform:none!important}' });
await p.evaluate((yy) => window.scrollTo(0, +yy), y);
await p.waitForTimeout(700);
await p.screenshot({ path: `/tmp/claude-0/${naam}.png` });
await b.close();
