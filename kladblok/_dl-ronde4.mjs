// Ronde 4 in de browser: welkomstmail → direct inloggen op het abonnement, tegoed
// op het eerste tabblad (breed en telefoon), een vooruitbetaald jaar opzeggen
// (tekst, mail, studio-bericht), en wat /admin daarvan laat zien.
// Gebruik: node kladblok/_dl-ronde4.mjs <email>   (na _dl-plan.mjs studio prepaid <email>)
import { start, foto, tekst, mails, mailtekst, sql, sqlw, SITE } from './_dl.mjs';
import { adminLogin } from './_admin.mjs';
import { studioLogin } from './_studio.mjs';

const email = process.argv[2] || 'ronde4@merk.test';
await sqlw('DELETE FROM rate_limits');
const k = await sql(`SELECT id FROM customers WHERE email = '${email}'`);
if (!k[0]) throw new Error('geen klant ' + email);
await sqlw(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${k[0].id}, 12000, 'Tegoed na annulering (doorloop)')`);

const s = await start(); const { page } = s;

/* 1 · De welkomstmail: de knop logt in en landt op het abonnement. */
const welkom = (await mails()).filter((m) => /Welkom bij VISUAILS/.test(m.subject) && [].concat(m.to).includes(email)).pop();
if (!welkom) throw new Error('geen welkomstmail voor ' + email);
const link = ((await mailtekst(welkom.n)).match(/\/account\/verify\/[A-Za-z0-9_-]+\?lang=nl&naar=plan/) || [])[0];
console.log('1 · welkomstlink gevonden:', !!link);
await page.goto(SITE + link, { waitUntil: 'load' });
console.log('   na klik op:', page.url().replace(SITE, ''));

/* 2 · Het eerste tabblad: credits en tegoed. */
console.log('2 · eerste tabblad:', (await tekst(page, '.st-credit')).replace(/\s+/g, ' ').slice(0, 400));
await foto(page, 'r4-saldo-breed', { vol: true });

/* 3 · Opzeggen: eerst de noot, dan het formulier. */
await page.goto(SITE + '/account/plan?tab=facturering', { waitUntil: 'load' });
console.log('3 · facturering vóór:', (await tekst(page, 'main')).replace(/\s+/g, ' ').match(/FACTURERING.{0,700}/)?.[0]);
const voor = (await mails()).length;
await page.fill('#opz', 'OPZEGGEN');
await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('form[action="/account/plan/cancel"] button[type="submit"]')]);
console.log('   na opzeggen op:', page.url().replace(SITE, ''));
console.log('   scherm:', (await tekst(page, 'main')).replace(/\s+/g, ' ').match(/(Je opzegging is genoteerd.{0,160})/)?.[0]);
console.log('   facturering na:', (await tekst(page, 'main')).replace(/\s+/g, ' ').match(/FACTURERING.{0,500}/)?.[0]);
console.log('   knoppen pauze/opzeggen nog zichtbaar:', await page.locator('form[action="/account/plan/cancel"], form[action="/account/plan/pause"]').count());
console.log('   chip:', await page.locator('.st-chip, [class*="chip"]').first().innerText().catch(() => '-'));
await foto(page, 'r4-opgezegd', { vol: true });
for (const m of (await mails()).slice(voor)) {
  console.log(`   MAIL → ${JSON.stringify(m.to)} "${m.subject}"`);
  console.log('   ' + String(await mailtekst(m.n)).replace(/\s+/g, ' ').slice(0, 700));
}
console.log('   rij:', JSON.stringify(await sql(`SELECT status, cancelled_at IS NOT NULL AS opgezegd, cancel_reason FROM subscriptions WHERE customer_id = ${k[0].id} ORDER BY id DESC LIMIT 1`)));

/* 4 · Nog een keer opzeggen via een geplakt formulier: geen tweede mail. */
const n2 = (await mails()).length;
await page.request.post(SITE + '/account/plan/cancel', { form: { confirm: 'OPZEGGEN' }, maxRedirects: 0 }).catch(() => {});
console.log('4 · tweede opzegging, nieuwe mails:', (await mails()).length - n2);

/* 5 · Het overzicht toont het tegoed ook. */
await page.goto(SITE + '/account', { waitUntil: 'load' });
console.log('5 · overzicht:', (await tekst(page, 'main')).replace(/\s+/g, ' ').match(/TEGOED OP JE ACCOUNT.{0,80}/i)?.[0]);

/* 6 · /admin: de klantkaart zegt dat het jaar doorloopt. */
await adminLogin(page);
await page.goto(SITE + `/admin/customers/${k[0].id}`, { waitUntil: 'load' });
console.log('6 · admin:', (await tekst(page, 'main, body')).replace(/\s+/g, ' ').match(/Abonnement · .{0,260}/)?.[0]);
await foto(page, 'r4-admin-klant', { vol: true });
console.log('fouten:', s.fouten.filter((f) => !/account\/me/.test(f)));
await s.stop();

/* 7 · Telefoon: het saldo onder elkaar. */
const m = await start({ mobiel: true });
await studioLogin(m.page, email);
await m.page.goto(SITE + '/account/plan', { waitUntil: 'load' });
console.log('7 · telefoon op:', m.page.url().replace(SITE, ''));
await foto(m.page, 'r4-saldo-mob', { vol: true });
console.log('   horizontaal scrollen:', await m.page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
await m.stop();
