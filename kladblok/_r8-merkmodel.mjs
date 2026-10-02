/* Ronde 8 — merkmodel aanvragen zoals een klant: vijf stappen met "Volgende",
   dan admin: offerte → betaallink → betalen. */
import { start, sql, mails, mailtekst, SITE, paneel } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { betaal } from './_bestel.mjs';
const OUT = '/tmp/claude-0/r8';
const shot = (p, n) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });
const log = (...a) => console.log('»', ...a);
const email = `noor${Date.now() % 100000}@atelier.test`;
const k = await start({ mobiel: true });
const { page } = k;
await page.goto(SITE + '/nl/start/brand-model', { waitUntil: 'load' });
const stap = () => page.evaluate(() => [...document.querySelectorAll('[data-bm-step]')].find((s) => !s.hidden && s.offsetParent)?.dataset.bmStep);
const volgende = async () => { const voor = await stap(); await page.click('[data-bm-next]'); await page.waitForTimeout(400); const na = await stap(); if (na === voor) log('blijft op stap', voor, (await page.evaluate(() => [...document.querySelectorAll('[aria-invalid=true], .is-fout, [data-bm-fout]')].map((e) => e.name || e.textContent.trim()).join(', ')))); return na; };
log('stap', await stap());
await page.click('label:has(input[name=bm_track][value=ours])'); await volgende();
log('stap', await stap());
for (const [n, v] of [['bm_audience', 'Vrouwen 30–45, rustig en verzorgd'], ['bm_link', 'instagram.com/atelier-noor']]) { const f = page.locator(`[name=${n}]`); if (await f.isVisible()) await f.fill(v); }
await volgende(); log('stap', await stap());
await volgende(); log('stap', await stap());
await shot(page, '25-merkmodel-stap4-mobiel');
for (const [n, v] of [['first_name', 'Noor'], ['last_name', 'Atelier'], ['brand', 'Atelier Noor'], ['phone', '0612345678'], ['email', email], ['address_line1', 'Teststraat 1'], ['postal_code', '1234 AB'], ['city', 'Teststad']]) { const f = page.locator(`[data-bm-step="4"] [name=${n}]`); if (await f.count()) await f.fill(v).catch(() => log('niet vulbaar', n)); }
await page.selectOption('[name=country]', 'NL');
await page.waitForTimeout(300);
const reg = page.locator('[name=reg_number]'); if (await reg.isVisible()) await reg.fill('12345678');
const novat = page.locator('label:has(input[name=no_vat])'); if (await novat.isVisible()) await novat.click();
await page.waitForTimeout(300);
const reg2 = page.locator('[name=reg_number]'); if (await reg2.isVisible() && !(await reg2.inputValue())) await reg2.fill('12345678');
await volgende(); log('stap', await stap());
for (const nm of ['business_declaration', 'withdrawal_consent', 'terms']) { const l = page.locator(`label:has(input[name=${nm}])`); if (await l.count() && !(await page.locator(`input[name=${nm}]`).first().isChecked())) await l.first().click(); }
await shot(page, '26-merkmodel-stap5-mobiel');
const [resp] = await Promise.all([page.waitForResponse((r) => /\/api\/order/.test(r.url()), { timeout: 20000 }).catch(() => null), page.locator('[data-bm-step="5"] button[type=submit]').first().click()]);
await page.waitForTimeout(1500);
log('api', resp?.status(), page.url().replace(SITE, ''));
await shot(page, '27-merkmodel-na-mobiel');
const [o] = await sql(`SELECT id, ref, service, status, payment_status, review_state, total_cents FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
log('order', JSON.stringify(o));
log('mails', (await mails()).slice(-3).map((x) => `${x.subject} → ${JSON.stringify(x.to)}`).join(' | '));
if (o && /\/nep-mollie/.test(page.url())) { await betaal(page); log('betaald direct', JSON.stringify(await sql(`SELECT payment_status FROM orders WHERE id=${o.id}`))); }
await k.stop();
