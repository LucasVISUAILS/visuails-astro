import { chromium } from 'playwright';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
for (const pad of ['/', '/nl/', '/pricing/', '/start/']) {
  const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.goto('http://127.0.0.1:4340' + pad, { waitUntil: 'load' });
  await pg.waitForTimeout(400);
  const voor = await pg.locator('[data-proefkaart]').count();
  // cookiekeuze maken zoals een bezoeker dat doet
  const knop = pg.locator('button:has-text("Only what is necessary"), button:has-text("Alleen het noodzakelijke")').first();
  if (await knop.count()) { await knop.click(); await pg.waitForTimeout(300); }
  await pg.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
  await pg.waitForTimeout(900);
  const zichtbaar = await pg.evaluate(() => {
    const el = document.querySelector('[data-proefkaart]');
    if (!el) return 'staat niet in de pagina';
    return el.hidden ? 'aanwezig maar verborgen' : (el.classList.contains('is-open') ? 'ZICHTBAAR' : 'aan het opkomen');
  });
  const cookie = await pg.evaluate(() => /vis_consent=/.test(document.cookie));
  console.log(pad.padEnd(12), 'kaart in DOM:', voor, '| cookiekeuze:', cookie, '| na scrollen:', zichtbaar);
  await pg.close();
}
await br.close();
