/*
 * RONDE 91 · E08 — HET BEDRAG IN DE OVERSTAPMAIL IN HET GEDEELDE GELDFORMAAT
 * 9 november 2026 (ronde 91, R)
 *
 * De overstapmail (mailAboWijziging, soort 'overstap') schreef het nieuwe maandbedrag met money() uit
 * account.js, de vorm van de site: "€1,580.00 a month" in het Engels, waar elke andere mail
 * "€ 1,580.00" schrijft (bedrag() in src/lib/mailTemplate.js). Nu bedrag(). De mail gaat door de echte
 * functie, met een nagebootste database en een nagebootste Resend.
 *
 *   node tests/blind91-r-overstapbedrag.test.mjs
 */
import { readFileSync } from 'node:fs';
import { mailAboWijziging } from '../src/lib/account.js';
import { bedrag } from '../src/lib/mailTemplate.js';

let pass = 0;
let fail = 0;
function ok(name, got, want) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name}${good ? '' : ` — verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
console.log('\nVISUAILS — ronde 91 E08: het bedrag in de overstapmail\n');

const verstuurd = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('resend')) verstuurd.push(JSON.parse(init.body));
  return new Response(JSON.stringify({ id: 'test' }), { status: 200, headers: { 'content-type': 'application/json' } });
};

function envMet(taal) {
  const stmt = { bind() { return stmt; }, async first() { return { lang: taal }; }, async all() { return { results: [] }; }, async run() { return {}; } };
  return { RESEND_API_KEY: 'test', STUDIO_EMAIL: 'studio@voorbeeld.test', DB: { prepare() { return stmt; } } };
}
const sub = { id: 7, ref: 'VIS-AB-0007', plan: 'starter', term: 'monthly' };
const customer = { email: 'klant@voorbeeld.test', name: 'Testklant', brand: 'Testmerk', country: 'NL' };
const naar = { naam: 'Pro', naamNl: 'Pro', credits: 120, bruto: 158000, std: true };

for (const taal of ['en', 'nl']) {
  verstuurd.length = 0;
  await mailAboWijziging(envMet(taal), { soort: 'overstap', sub, customer, lang: taal, vanaf: '2026-12-01', naar, direct: false });
  const klant = verstuurd.find((m) => [].concat(m.to).includes(customer.email));
  ok(`${taal}: de klant krijgt de overstapmail`, !!klant, true);
  const tekst = `${klant?.html || ''}\n${klant?.text || ''}`;
  ok(`${taal}: het bedrag staat erin zoals bedrag() het schrijft (${bedrag(158000, taal)})`, tekst.includes(bedrag(158000, taal)), true);
  if (taal === 'en') ok('en: niet meer de sitevorm "€1,580.00"', tekst.includes('€1,580.00'), false);
}
ok('bedrag(158000, "en") is "€ 1,580.00"', bedrag(158000, 'en'), '€ 1,580.00');

const acc = readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8');
const blok = acc.slice(acc.indexOf("['Your switch is ready'") - 400, acc.indexOf("['Your switch is ready'") + 600);
ok('de overstapzinnen gebruiken mailBedrag(), niet money()', /mailBedrag\(naar\.bruto, 'nl'\)/.test(blok) && /mailBedrag\(naar\.bruto, 'en'\)/.test(blok) && !/money\(naar\.bruto, '(nl|en)'\) a month/.test(blok), true);

console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
