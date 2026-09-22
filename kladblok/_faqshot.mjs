import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const doel = [['/nl/catalog/', '[aria-labelledby=cat-faq]', 'faq-cat'], ['/nl/hooks/', '[aria-labelledby=hk-faq]', 'faq-hk'], ['/nl/faq/', '.faq-index', 'faq-index'], ['/nl/faq/', '#catalog', 'faq-catgroep'], ['/nl/faq/', '.faq-groep', 'faq-faq'], ['/nl/', '[aria-labelledby=vp-q]', 'faq-home'], ['/nl/editions/', '[aria-labelledby=ed-faq]', 'faq-ed']];
for (const [pad, sel, naam] of doel) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: 'vis_consent', value: encodeURIComponent(JSON.stringify({ version: 1, analytics: false, at: '2026-09-05T00:00:00.000Z' })), domain: '127.0.0.1', path: '/' }]);
  await ctx.addInitScript(() => { try { localStorage.setItem('vis_proef_dicht', String(Date.now() + 86400000)); } catch {} });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:4399' + pad, { waitUntil: 'networkidle' });
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  const box = await el.boundingBox(); console.log(naam, Math.round(box.height));
  await el.screenshot({ path: `/tmp/claude-0/${naam}.png` });
  await ctx.close();
}
await b.close();
