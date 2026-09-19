import { chromium, devices } from 'playwright';
const BASIS = process.env.BASIS || 'http://127.0.0.1:4399';
const PADEN = process.argv.slice(2);
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const [maat, opts] of [['b', { viewport: { width: 1440, height: 900 } }], ['t', { ...devices['Pixel 5'] }]]) {
  const ctx = await br.newContext({ ...opts, deviceScaleFactor: 1, locale: 'nl-NL' });
  for (const pad of PADEN) {
    const pg = await ctx.newPage();
    try {
      const r = await pg.goto(BASIS + pad, { waitUntil: 'networkidle', timeout: 45000 });
      await pg.addStyleTag({ content: '.cookie-band, [data-cookie], .cc { display:none !important } .lc-slides li { transition: none !important } .js .reveal.pending, .js .reveal-group > .reveal.pending { opacity: 1 !important; transform: none !important; transition: none !important } .js .reveal-mask .rm-inner { transform: none !important }' });
      await pg.waitForTimeout(600);
      const naam = pad.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home';
      await pg.screenshot({ path: `kladblok/uit/live-${maat}-${naam}.png`, fullPage: true });
      const h = await pg.evaluate(() => document.documentElement.scrollHeight);
      console.log(maat, pad, r.status(), 'h=' + h);
    } catch (e) { console.log(maat, pad, 'FOUT', e.message.slice(0, 80)); }
    await pg.close();
  }
  await ctx.close();
}
await br.close();
