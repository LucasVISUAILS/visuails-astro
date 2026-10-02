// Ronde 9 · stap 4: Studio — gegevens wijzigen (btw-nummer, e-mailadres met bevestiging).
import { start, SITE, sql, sqlw, mails, mailtekst } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const email = `gegevens${Date.now() % 100000}@merk.test`;
const nieuw = `nieuw${Date.now() % 100000}@merk.test`;
const k = await start(); const { page } = k;
await sqlw('DELETE FROM rate_limits');
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Geert', brand: 'Merk Gegevens' }, land: 'NL', vat: null });
if (/4478|nep-mollie/.test(page.url())) await betaal(page);
await studioLogin(page, email);
await page.goto(SITE + '/account/details');
const meld = () => page.evaluate(() => [...document.querySelectorAll('main [role=status], main .st-melding')].map((e) => e.textContent.trim()).join(' | ').slice(0, 200));
/* Btw-nummer: eerst een kapot nummer, dan een goed (NL, geen VIES). */
const f = page.locator('form[action="/account/details"]').first();
for (const v of ['NL123', 'NL123456789B01']) {
  await f.locator('[name="vat"]').fill(v).catch(() => {});
  await Promise.all([page.waitForNavigation(), f.locator('button[type=submit]').first().click()]);
  console.log(`btw ${v}: ${page.url().replace(SITE, '')} — "${await meld()}" · db ${JSON.stringify(await sql(`SELECT vat_number FROM customers WHERE email='${email}'`))}`);
}
/* E-mail wijzigen. */
const voor = (await mails()).length;
const ef = page.locator('form[action="/account/email"]').first();
await ef.locator('input[type=email]').fill(nieuw);
await Promise.all([page.waitForNavigation(), ef.locator('button[type=submit]').click()]);
console.log(`e-mail aanvraag: "${await meld()}"`);
await page.waitForTimeout(1000);
const nieuwM = (await mails()).slice(voor);
console.log('mails:', nieuwM.map((m) => `${m.to}: ${m.subject}`).join(' / '));
const bev = nieuwM.find((m) => (m.to || '').includes(nieuw));
if (bev) {
  const link = ((await mailtekst(bev.n)).match(/https?:\/\/[^\s)]+/g) || []).find((l) => /email|verify|bevestig/i.test(l));
  if (link) { await page.goto(link.replace(/^https?:\/\/[^/]+/, SITE)); await page.waitForTimeout(800); console.log(`bevestigd: ${page.url().replace(SITE, '')} — "${await meld()}" h1 "${await page.evaluate(() => (document.querySelector("h1")?.textContent || "").trim())}" tekst "${await page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").slice(0, 200))}"`); }
  console.log('db:', JSON.stringify(await sql(`SELECT email FROM customers WHERE email IN ('${email}','${nieuw}')`)));
}
process.exit(0);
