import { chromium } from 'playwright';
const B = 'http://127.0.0.1:4340';
const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage({ viewport: { width: 1280, height: 900 } });
const fouten = [];
pg.on('pageerror', (e) => fouten.push('JS: ' + e.message));

for (const pad of ['/start/catalog/', '/nl/start/catalog/', '/start/complete/', '/start/lifestyle/']) {
  await pg.goto(B + pad, { waitUntil: 'load' });
  await pg.waitForTimeout(400);
  const heeft = await pg.locator('[data-pl-angles]').count();
  if (pad.includes('lifestyle')) { console.log(pad, 'hoekenkiezer aanwezig:', heeft, '(hoort 0)'); continue; }
  if (!heeft) { console.log(pad, 'GEEN KIEZER'); continue; }

  // aantal producten op 10
  await pg.evaluate(() => {
    const s = document.querySelector('select[name="products"]');
    s.value = '10';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await pg.waitForTimeout(200);
  const tarief10 = await pg.locator('[data-pl-angle-rate]').innerText();

  const vinkjes = pg.locator('input[data-pl-angle]');
  const n = await vinkjes.count();
  await vinkjes.nth(0).check({ force: true });
  await pg.waitForTimeout(150);
  const som1 = await pg.locator('[data-pl-angle-som]').innerText();
  const notitieZichtbaar = await pg.locator('[data-pl-angle-note]:not([hidden])').count();

  for (let i = 1; i < 4; i++) await vinkjes.nth(i).check({ force: true });
  await pg.waitForTimeout(200);
  const som4 = await pg.locator('[data-pl-angle-som]').innerText();
  const tarief4 = await pg.locator('[data-pl-angle-rate]').innerText();
  const uitgeschakeld = await pg.locator('input[data-pl-angle]:disabled').count();
  const totaal = await pg.locator('[data-pl-total]').innerText();
  const noot = await pg.locator('[data-pl-total-note]').innerText();

  console.log('\n══', pad);
  console.log('  tegels          ', n);
  console.log('  tarief bij 10   ', tarief10.trim());
  console.log('  1 gekozen       ', som1.trim(), '| notitievelden open:', notitieZichtbaar);
  console.log('  4 gekozen       ', som4.trim());
  console.log('  tarief vol      ', tarief4.trim());
  console.log('  uitgeschakeld   ', uitgeschakeld, '(hoort 4)');
  console.log('  totaal          ', totaal.trim());
  console.log('  noot            ', noot.trim());

  // per-product blok mag niet meer bestaan
  const oud = await pg.locator('.pu-extra').count();
  console.log('  oude .pu-extra  ', oud, '(hoort 0)');
}
if (fouten.length) console.log('\nFOUTEN:', fouten);
else console.log('\ngeen JS-fouten');
await br.close();
