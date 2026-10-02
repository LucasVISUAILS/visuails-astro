// Ronde 9 · stap 4: VISUAILS Studio — inloggen in alle varianten, en elk scherm op 1280 en 390.
import { start, SITE, sql, sqlw, mails, mailtekst } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const D = '/tmp/claude-0/kb';
const uit = [];
const k = await start(); const { page, fouten } = k;
const kop = async () => (await page.evaluate(() => (document.querySelector('main h1, main h2')?.textContent || '').trim())).slice(0, 60);
const melding = async () => (await page.evaluate(() => [...document.querySelectorAll('main [role=status], main [role=alert], main .st-melding, main .notice')].map((e) => e.textContent.trim()).filter(Boolean).join(' | '))).slice(0, 200);

/* Een klant met één bestelling. */
await sqlw('DELETE FROM rate_limits');
const email = `studio${Date.now() % 100000}@merk.test`;
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Stijn', brand: 'Merk Studio' }, land: 'NL', vat: null });
if (/4478|nep-mollie/.test(page.url())) await betaal(page);

/* 1 · Onbekend adres. */
await sqlw('DELETE FROM rate_limits');
await page.goto(SITE + '/account/login?lang=nl');
const voor0 = (await mails()).length;
await page.fill('input[type=email]', `onbekend${Date.now() % 1000}@merk.test`);
await Promise.all([page.waitForNavigation(), page.click('form button[type=submit]')]);
uit.push(`onbekend adres: "${await kop()}" · mails: ${(await mails()).length - voor0} (zelfde scherm als bij een bekend adres = geen lek)`);

/* 2 · Verkeerde code, vijf keer, dan de goede. */
await page.goto(SITE + '/account/login?lang=nl');
const voor = (await mails()).length;
await page.fill('input[type=email]', email);
await Promise.all([page.waitForNavigation(), page.click('form button[type=submit]')]);
let m = null; for (let i = 0; i < 20 && !m; i++) { await page.waitForTimeout(300); m = (await mails()).slice(voor).find((x) => /inlogcode/i.test(x.subject || '')); }
const tekst = await mailtekst(m.n);
const code = (tekst.match(/(\d{3}) (\d{3})/) || []).slice(1).join('');
const link = (tekst.match(/https?:\/\/[^\s)]+\/account\/verify\/[^\s)]+/) || [])[0];
for (let i = 1; i <= 6; i++) {
  await page.fill('input[name="code"]', '000000');
  await Promise.all([page.waitForNavigation().catch(() => null), page.click('form button[type=submit]')]);
  uit.push(`verkeerde code ${i}: "${await melding() || await kop()}"`);
}
await page.fill('input[name="code"]', code).catch(() => {});
await Promise.all([page.waitForNavigation().catch(() => null), page.click('form button[type=submit]').catch(() => {})]);
uit.push(`daarna de goede code: ${page.url().replace(SITE, '')} — "${await melding() || await kop()}"`);

/* 3 · De inloglink uit dezelfde mail, met een bestemming. */
const k2 = await start(); const p2 = k2.page;
if (link) {
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, SITE)); await p2.waitForTimeout(800);
  uit.push(`inloglink (tweede apparaat): ${p2.url().replace(SITE, '')} — "${(await p2.evaluate(() => document.querySelector('main h1, main h2')?.textContent || '')).trim()}"`);
  await p2.goto(link.replace(/^https?:\/\/[^/]+/, SITE)); await p2.waitForTimeout(800);
  uit.push(`zelfde link nog eens: ${p2.url().replace(SITE, '')} — "${(await p2.evaluate(() => (document.querySelector('main [role=status], main h1, main h2')?.textContent || '').trim())).slice(0, 120)}"`);
} else uit.push('geen inloglink in de mail');

/* 4 · Inloggen met bestemming: /account/invoices zonder sessie → login → terug naar facturen. */
const k3 = await start(); const p3 = k3.page;
await p3.goto(SITE + '/account/invoices'); await p3.waitForTimeout(500);
uit.push(`facturen zonder sessie → ${p3.url().replace(SITE, '')}`);
await sqlw('DELETE FROM rate_limits');
const voor3 = (await mails()).length;
await p3.fill('input[type=email]', email);
await Promise.all([p3.waitForNavigation(), p3.click('form button[type=submit]')]);
let m3 = null; for (let i = 0; i < 20 && !m3; i++) { await p3.waitForTimeout(300); m3 = (await mails()).slice(voor3).find((x) => /inlogcode/i.test(x.subject || '')); }
const code3 = ((await mailtekst(m3.n)).match(/(\d{3}) (\d{3})/) || []).slice(1).join('');
await p3.fill('input[name="code"]', code3);
await Promise.all([p3.waitForNavigation(), p3.click('form button[type=submit]')]);
uit.push(`na inloggen → ${p3.url().replace(SITE, '')} (verwacht /account/invoices)`);

/* 5 · Uitloggen op het ene apparaat; het andere blijft ingelogd? */
await p3.evaluate(() => { const f = [...document.querySelectorAll('form')].find((x) => /logout/.test(x.getAttribute('action') || '')); f && f.requestSubmit(); });
await p3.waitForTimeout(800);
await p3.goto(SITE + '/account'); await p3.waitForTimeout(400);
uit.push(`na uitloggen, /account → ${p3.url().replace(SITE, '')}`);
await p2.goto(SITE + '/account'); await p2.waitForTimeout(400);
uit.push(`tweede apparaat na uitloggen op het eerste → ${p2.url().replace(SITE, '')}`);

/* 6 · Elk scherm op 1280 en 390, plus donker en EN. */
await studioLogin(page, email);
const schermen = ['/account', '/account/orders', '/account/invoices', '/account/details', '/account/brand-kit', '/account/plan'];
for (const s of schermen) {
  await page.goto(SITE + s); await page.waitForTimeout(500);
  const leeg = await page.evaluate(() => [...document.querySelectorAll('main section, main .st-blok')].filter((e) => e.innerText.trim().length < 3 && e.getBoundingClientRect().height > 40).length);
  uit.push(`${s}: "${await kop()}" · lege blokken ${leeg} · scrollbreedte ${await page.evaluate(() => document.documentElement.scrollWidth)}`);
  await page.screenshot({ path: `${D}/st${s.replace(/\//g, '-')}-1280.png`, fullPage: false });
}
await page.setViewportSize({ width: 390, height: 844 });
for (const s of schermen) {
  await page.goto(SITE + s); await page.waitForTimeout(500);
  uit.push(`390 ${s}: scrollbreedte ${await page.evaluate(() => document.documentElement.scrollWidth)}`);
  await page.screenshot({ path: `${D}/st${s.replace(/\//g, '-')}-390.png`, fullPage: false });
}
const menu = await page.evaluate(() => { const b = document.querySelector('[aria-controls], .st-menuknop, button[aria-expanded]'); return b ? `${b.tagName} "${(b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30)}" aria-expanded=${b.getAttribute('aria-expanded')}` : 'geen menuknop'; });
uit.push(`menu op 390: ${menu}`);
console.log(uit.join('\n'));
console.log('fouten:', fouten.filter((f) => !/401 GET \/account\/me/.test(f)).slice(0, 10));
process.exit(0);
