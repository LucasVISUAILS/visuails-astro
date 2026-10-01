import { start, tekst, sql, mails, mailtekst, SITE, foto } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
const aantal = Number(process.argv[2] || 12); const pad = process.argv[3] || '/nl/start/lifestyle';
const s = await start(); const { page } = s;
const voor = (await mails()).length;
const r = await bestel(page, { pad, aantal, fotos: 3, klant: { email: `upgrade${aantal}@merk.test`, first_name: 'Ugo' }, land: 'NL', vat: null, venster: null });
console.log(r.log.join('\n'));
if (page.url().startsWith('https://nep-mollie')) await betaal(page);
await page.waitForTimeout(3000);
const t = (await tekst(page, 'main')).replace(/\n{2,}/g, '\n');
console.log('BEDANKT:\n' + t.slice(0, 1500));
await foto(page, 'upgrade-bedankt', { vol: true });
for (const m of (await mails()).slice(voor)) { if (/upgrade/.test(JSON.stringify(m.to))) { console.log(`MAIL "${m.subject}"`); const x = String(await mailtekst(m.n)); const i = x.search(/abonnement|plan/i); console.log(x.slice(Math.max(0, i - 300), i + 500)); } }
console.log(s.fouten.filter((x) => !/account\/me/.test(x))); await s.stop();
