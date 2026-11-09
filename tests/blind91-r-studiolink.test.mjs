/*
 * RONDE 91 · E05 — LINKS NAAR STUDIO IN EEN MAIL DRAGEN DE TAAL VAN DIE MAIL
 * 9 november 2026 (ronde 91, R)
 *
 * Studio leeft op /account zonder taalprefix. Een Nederlandse mail linkte naar /nl/account/… (een 301 die de
 * taal laat vallen) of naar /account zonder ?lang=nl, en dan koos Studio de taal van de browser: een
 * Nederlandse klant met een Engelse browser zag Engels. Nu één vorm: studioUrl() in src/lib/studioLink.js,
 * rechtstreeks naar /account/… met ?lang= van de mail.
 *
 *   node tests/blind91-r-studiolink.test.mjs
 */
import { readFileSync } from 'node:fs';
import { studioUrl } from '../src/lib/studioLink.js';
import { invoiceEmail } from '../src/lib/invoiceMail.js';
import { tegoedMail } from '../src/lib/admin.js';

let pass = 0;
let fail = 0;
function ok(name, got, want) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
console.log('\nVISUAILS — ronde 91 E05: Studio-links met taal\n');

console.log('studioUrl()');
const O = 'https://visuails.com';
for (const [pad, lang, want] of [
  ['', 'nl', `${O}/account?lang=nl`],
  ['', 'en', `${O}/account?lang=en`],
  ['/plan', 'nl', `${O}/account/plan?lang=nl`],
  ['/orders?order=7#order-7', 'nl', `${O}/account/orders?order=7&lang=nl#order-7`],
  ['/orders?order=7&lang=en#order-7', 'nl', `${O}/account/orders?order=7&lang=en#order-7`],
  ['/brand-kit/', 'en', `${O}/account/brand-kit/?lang=en`],
  ['details', 'nl', `${O}/account/details?lang=nl`],
  ['/email/abc', 'xx', `${O}/account/email/abc?lang=nl`],
]) ok(`studioUrl(${JSON.stringify(pad)}, ${lang})`, studioUrl(O, pad, lang), want);
ok('een origin met een slash erachter', studioUrl('https://voorbeeld.test/', '/plan', 'nl'), 'https://voorbeeld.test/account/plan?lang=nl');

console.log('\nde mails zelf');
{
  const html = invoiceEmail({ lang: 'nl', order: { ref: 'VIS-2611-0001', name: 'Testklant', service: 'catalog' }, invoice: { number: 'VIS-F-2026-0001' }, snap: { netCents: 10000, vatCents: 2100 }, attached: false }).html;
  ok('factuurmail NL: de Studio-link heeft ?lang=nl', html.includes('https://visuails.com/account?lang=nl'), true);
  ok('factuurmail NL: geen /nl/account meer', /visuails\.com\/nl\/account/.test(html), false);
  const en = invoiceEmail({ lang: 'en', order: { ref: 'VIS-2611-0001', name: 'Testklant', service: 'catalog' }, invoice: { number: 'VIS-F-2026-0001' }, snap: { netCents: 10000, vatCents: 2100 }, attached: false }).html;
  ok('factuurmail EN: ?lang=en', en.includes('https://visuails.com/account?lang=en'), true);
}
{
  const html = tegoedMail({ naam: 'Testklant', lang: 'nl', cents: 2500, reden: 'Test.', saldoCents: 2500, studio: studioUrl(O, '', 'nl') });
  ok('tegoedmail NL (credit-added): de knop gaat naar /account?lang=nl', html.includes('href="https://visuails.com/account?lang=nl"'), true);
}

console.log('\nde plekken die de link bouwen');
const adm = lees('src/lib/admin.js');
ok('admin: tegoedmail via studioUrl', /studio: studioUrl\(origin, '', lang\)/.test(adm), true);
ok('admin: merkmodelmail via studioUrl', /mailButton\(studioUrl\(origin, '\/brand-kit\/', nl \? 'nl' : 'en'\)/.test(adm), true);
const acc = lees('src/lib/account.js');
ok('account: bevestig-je-nieuwe-adres met taal', /const link = studioUrl\(requestOrigin\(request\), `\/email\/\$\{token\}`, lang\)/.test(acc), true);
ok('account: zet-je-oude-adres-terug met taal', /const undoLink = studioUrl\(requestOrigin\(request\), `\/email\/undo\/\$\{undoToken\}`, lang\)/.test(acc), true);
ok('account: overstapmail via studioUrl', /mailLinkLine\(studioUrl\('https:\/\/visuails\.com', '\/plan', nl \? 'nl' : 'en'\)/.test(acc), true);
const fmt = lees('src/lib/formaten.js');
ok('formaten (extra-format-ready): ook NL krijgt de taal', /let href = studioUrl\(origin, `\/orders\?order=\$\{oid\}#order-\$\{oid\}`, lang\)/.test(fmt), true);
const cron = lees('cron/index.js');
ok('cron: beide abonnementsknoppen via studioUrl', (cron.match(/mailButton\(studioUrl\('https:\/\/visuails\.com', '\/plan', nl \? 'nl' : 'en'\)/g) || []).length, 2);
const bl = lees('src/lib/betaallink.js');
ok('betaallink: Je gegevens via studioUrl, NL en EN', /studioUrl\(origin, '\/details', 'nl'\)/.test(bl) && /studioUrl\(origin, '\/details', 'en'\)/.test(bl), true);
const ord = lees('functions/api/order.js');
ok('order: de fotolink via studioUrl', /\? studioUrl\(requestOrigin\(request\), '\/orders', lang\)/.test(ord), true);

/* Nergens meer de oude vormen in de bestanden van deze ronde (cancelMail.js is van een andere helper: zie R.md). */
for (const f of ['src/lib/admin.js', 'src/lib/account.js', 'src/lib/invoiceMail.js', 'src/lib/betaallink.js', 'src/lib/formaten.js', 'cron/index.js', 'functions/api/order.js']) {
  const s = lees(f);
  ok(`${f}: geen "\${…'/nl' : ''}/account" en geen "/nl/account/" in een link`, /\/nl' : ''\}\/account|\/nl\/account\/(details|plan|orders)/.test(s), false);
}

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
