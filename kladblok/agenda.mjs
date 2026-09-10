import { chromium } from 'playwright';

/* Stap 3 is het adres. Verzonnen gegevens — nooit Lucas' echte adres in een proef. */
async function vulAdres(pg) {
  await pg.evaluate(() => {
    const zet = (naam, waarde) => {
      const el = document.querySelector(`[name="${naam}"]`);
      if (!el) return;
      el.value = waarde;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    zet('first_name', 'Sam'); zet('last_name', 'Voorbeeld');
    zet('brand', 'VOORBEELD'); zet('email', 'sam@voorbeeld.test');
    zet('phone', '+31 6 00000000');
    zet('address_line1', 'Verzonnenstraat 1'); zet('postal_code', '1000 AA');
    zet('city', 'Testdorp');
    const land = document.querySelector('[name="country"]');
    if (land) { land.value = 'NL'; land.dispatchEvent(new Event('change', { bubbles: true })); }
    document.querySelectorAll('[name="business_declaration"], [name="no_vat"]').forEach((c) => {
      if (c.type === 'checkbox') { c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    const kvk = document.querySelector('[name="reg_number"]');
    if (kvk) { kvk.value = '99999999'; kvk.dispatchEvent(new Event('input', { bubbles: true })); }
  });
  await pg.waitForTimeout(300);
}

const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pg = await br.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
pg.on('pageerror', e => console.log('[pageerror]', e.message));
/* De agenda wordt gevuld uit /api/capacity; die route bestaat niet op een
   statische server, dus we voeren renderWindows() met een echte set vensters via
   het pad dat de pagina zelf gebruikt. */
await pg.route('**/api/capacity*', (route) => route.fulfill({
  status: 200, contentType: 'application/json',
  body: JSON.stringify({ reason: 'ok', max: 39, windows: [
    { start: '2026-09-12', end: '2026-09-13' }, { start: '2026-09-13', end: '2026-09-14' },
    { start: '2026-09-14', end: '2026-09-15' }, { start: '2026-09-15', end: '2026-09-16' },
    { start: '2026-09-16', end: '2026-09-17' }, { start: '2026-09-17', end: '2026-09-18' },
    { start: '2026-09-28', end: '2026-09-29' }, { start: '2026-10-01', end: '2026-10-02' },
  ] }),
}));
await pg.goto('http://127.0.0.1:4340/start/catalog/', { waitUntil: 'load' });
await pg.waitForTimeout(600);
await pg.evaluate(() => {
  /* Via de zichtbare teller en niet via de verborgen <select>: de stapcontrole
     leest het veld dat de klant ziet, en dat is de teller. */
  const knop20 = document.querySelector('[data-pl-qty-set="20"]');
  if (knop20) knop20.click();
  else {
    const inp = document.querySelector('[data-pl-qty-input]');
    if (inp) { inp.value = '20'; inp.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  /* De agenda bestaat alleen voor begeleide bestellingen; het formulier zet dat
     veld zelf op basis van het aantal, maar op een statische kopie loopt die weg
     via /api/capacity. Hier dus met de hand. */
  const tier = document.querySelector('input[name="tier"]');
  if (tier) { tier.value = 'attended'; tier.dispatchEvent(new Event('change', { bubbles: true })); }
});
await pg.waitForTimeout(400);
/* Door de stappen heen klikken tot de tijdstap: runGate() draait alleen bij het
   BINNENKOMEN van die stap, dus hem zichtbaar maken is niet genoeg. */
for (let i = 0; i < 6; i++) {
  const knop = pg.locator('.pl-step.is-current [data-pl-next]:visible').first();
  if (await knop.count() === 0) break;
  await knop.click({ force: true }).catch(() => {});
  await pg.waitForTimeout(500);
  await vulAdres(pg);
  const toch = pg.locator('[data-pl-missing-go], [data-pl-missing] button').last();
  if (await toch.count()) { await toch.click({ force: true }).catch(() => {}); await pg.waitForTimeout(500); }
  if (await pg.locator('[data-pl-windows] .pl-kal').count()) break;
}
await pg.waitForTimeout(900);
const n = await pg.locator('button.pl-kal-dag').count();
console.log('klikbare dagen:', n, '| maandruiten:', await pg.locator('.pl-kal').count());
if (n) { await pg.locator('button.pl-kal-dag').first().click(); await pg.waitForTimeout(300); }
console.log('keuzeregel:', (await pg.locator('.pl-kal-keuze').innerText().catch(() => '—')).trim());
console.log('in bereik:', await pg.locator('.pl-kal-dag.in-bereik').count());
console.log(await pg.evaluate(() => {
  const m = document.querySelector('.pl-kal-maand');
  return 'tekst=' + JSON.stringify(m.textContent) + ' transform=' + getComputedStyle(m).textTransform;
}));
const box = await pg.evaluate(() => { const e = document.querySelector('[data-pl-windows]'); e.scrollIntoView({block:'center'}); const r = e.getBoundingClientRect(); return {x:Math.max(0,r.x-12),y:Math.max(0,r.y-12),width:Math.min(r.width+24,990),height:Math.min(r.height+24,880)}; });
await pg.waitForTimeout(300);
if (box.height > 10) await pg.screenshot({ path: '/tmp/agenda.png', clip: box });
await br.close();
