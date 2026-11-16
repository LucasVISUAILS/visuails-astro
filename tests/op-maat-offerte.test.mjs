/**
 * VISUAILS — op maat: de offerte met betaallink (15 november 2026, migratie 0073).
 * Op een echte database (node:sqlite, schema.sql), met de mail en Mollie nagebootst:
 * de btw, de offerte vanuit /admin, iets aanpassen, akkoord → bestelling → betaallink, en Nu doen.
 *   node tests/op-maat-offerte.test.mjs
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { nieuweAanvraag, bewaarConcept, verstuur, bewaarMerk, aanvraagVan } from '../src/lib/opMaat.js';
import { voegVoorbeeldToe, voorbeeldSleutel, zetVoorbeeldKlaar, reactieOpRonde, leesRegels } from '../src/lib/opMaatRondes.js';
import { btwVoorOfferte, stuurOfferte, vraagAanpassing, akkoordEnBetaallink, betaallinkOpnieuw, offerteVoorScherm, bedragen, nieuwKenmerk } from '../src/lib/opMaatOfferte.js';
import { nuDoen, soortLabel, knopVoor } from '../src/lib/nudoen.js';
import { snapshotFromOrder } from '../src/lib/invoice.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

/* De mail (Resend) en Mollie nagebootst, zoals in tests/betaalherinnering.test.mjs. */
const gezien = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  gezien.push({ url: u, body: opts.body ? String(opts.body) : '' });
  if (u.endsWith('/v2/payments')) return new Response(JSON.stringify({ id: 'tr_1', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_1' } } }), { status: 201, headers: { 'content-type': 'application/json' } });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt met de kolommen van 0073', !mislukt?.length && telling(db, "SELECT COUNT(*) AS n FROM pragma_table_info('maat_offertes') WHERE name IN ('email','btw_behandeling','order_id','aanpassing','link_op')") === 5, JSON.stringify(mislukt));
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'a@example.test', 'Test Klant', 'Merk A', 'NL'), (2, 'b@example.test', 'Test B', 'Merk B', 'NL')");
const sleutels = { RESEND_API_KEY: 're_test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' };
const env = { DB: d1(db), ...sleutels };
const origin = 'https://visuails.com';
const vies = (geldig) => async () => ({ ok: true, valid: geldig, consultation: geldig ? 'WAPIAAAAX' : null });

/* Een aanvraag tot "dit is goed" (stand akkoord), zoals tests/op-maat-rondes.test.mjs. */
async function totAkkoord(cid) {
  await bewaarMerk(env, cid, { naam: 'Merk' });
  const a = await nieuweAanvraag(env, cid, 'catalog', 'nl');
  await bewaarConcept(env, cid, a.id, { soorten: [{ soort: 'jas', voorkant: { legwijze: 'hanger' } }], toelichting: { 'c-pose': 'aan een hanger' }, praktisch: { contact: 'mail' } }, 1);
  await verstuur(env, cid, a.id);
  await voegVoorbeeldToe(env, a.id, { r2Key: voorbeeldSleutel(cid, a.id, 1, 'v.jpg') });
  await zetVoorbeeldKlaar(env, a.id);
  await reactieOpRonde(env, cid, a.id, { goed: true });
  return a.id;
}
const id = await totAkkoord(1);
const stand = async (i = id) => (await aanvraagVan(env, 1, i)).stand;
const nuRegel = async (i = id) => {
  const { regels } = await nuDoen(env.DB);
  const r = regels.find((x) => x.soort === 'opmaat' && x.id === i);
  return r ? `${soortLabel(r)} | ${knopVoor(r, 'dashboard').label}` : null;
};

console.log('\n1 · de btw, dezelfde regel als bij elke bestelling');
ok('Nederland: 21%', (await btwVoorOfferte(env, { land: 'NL', btwNummer: 'NL123456789B01', vies: vies(true) })).rate === 0.21);
const be = await btwVoorOfferte(env, { land: 'BE', btwNummer: 'BE 0123.456.789', vies: vies(true) });
ok('België met een geldig nummer: verlegd, 0%, met raadplegingsnummer', be.treatment === 'eu_reverse_charge' && be.rate === 0 && be.raadpleging === 'WAPIAAAAX' && be.btwNummer === 'BE0123456789', JSON.stringify(be));
ok('België met een ongeldig nummer: toch 21%', (await btwVoorOfferte(env, { land: 'BE', btwNummer: 'BE0123456789', vies: vies(false) })).rate === 0.21);
ok('VIES onbereikbaar: 21% (fails closed)', (await btwVoorOfferte(env, { land: 'DE', btwNummer: 'DE123456789', vies: async () => { throw new Error('weg'); } })).rate === 0.21);
ok('Verenigde Staten: buiten de EU, 0%', (await btwVoorOfferte(env, { land: 'US' })).treatment === 'outside_scope');
ok('geen land: 21%', (await btwVoorOfferte(env, {})).rate === 0.21);
const b = bedragen(leesRegels('Basis;270\nWereld;571'), 0.21);
ok('de helft van €841 is €421 (afgerond), btw €88,41, nu €509,41, later €420', b.aanbetaling === 421 && b.aanbetalingBtwCents === 8841 && b.aanbetalingBrutoCents === 50941 && b.rest === 420, JSON.stringify(b));
ok('een kenmerk zoals bij elke bestelling', /^VIS-[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(nieuwKenmerk()));

console.log('\n2 · de studio mailt de offerte');
ok('Nu doen vóór de offerte: "Op maat: offerte | Offerte maken"', await nuRegel() === 'Op maat: offerte | Offerte maken', await nuRegel());
const regels = leesRegels('Basis 3 × €90;270\nEen eigen wereld;570\nExtra detail;25');
ok('een fout mailadres gaat niet', (await stuurOfferte(env, id, { regels, email: 'geen-adres', land: 'NL' }, { origin })).reden === 'email');
ok('zonder regels gaat niet', (await stuurOfferte(env, id, { regels: [], email: 'a@example.test', land: 'NL' }, { origin })).reden === 'regels');
const voor = mails().length;
const s1 = await stuurOfferte(env, id, { regels, email: 'Inkoop@Example.test', land: 'NL', btwNummer: '' }, { origin });
ok('de offerte: €865, de helft €433, 21%, stand offerte', s1.ok && s1.totaal === 865 && s1.aanbetaling === 433 && s1.tarief === 0.21 && s1.gemaild && await stand() === 'offerte', JSON.stringify(s1));
const m1 = mails()[voor];
ok('de mail gaat naar het adres van de offerte (kleine letters), met de regels en de link naar Studio', m1 && m1.to === 'inkoop@example.test' || (Array.isArray(m1?.to) && m1.to[0] === 'inkoop@example.test'), JSON.stringify(m1?.to));
ok('… met de bedragen en een knop naar de offerte in Studio', /Een eigen wereld/.test(m1.html) && /€\s?865/.test(m1.html) && /€\s?433/.test(m1.html) && m1.html.includes(`/account/op-maat?id=${id}`), '');
ok('Nu doen: de klant is aan zet, geen regel', await nuRegel() === null);
const o1 = await offerteVoorScherm(env, id);
ok('Studio ziet: nu €523,93 incl. btw, later €432 excl.', o1.aanbetalingBruto === 523.93 && o1.rest === 432 && o1.email === 'inkoop@example.test', JSON.stringify(o1));

console.log('\n3 · de klant vraagt een aanpassing');
ok('een ander mag niet', (await vraagAanpassing(env, 2, id, 'goedkoper')).reden === 'weg');
ok('zonder tekst gaat niet', (await vraagAanpassing(env, 1, id, ' ')).reden === 'anders');
ok('een aanpassing: terug naar de studio (stand akkoord)', (await vraagAanpassing(env, 1, id, 'zonder de extra detailfoto')).ok && await stand() === 'akkoord');
ok('Nu doen: "Op maat: offerte | Offerte aanpassen"', await nuRegel() === 'Op maat: offerte | Offerte aanpassen', await nuRegel());
ok('de aanpassing staat bij de offerte en als besluit', (await offerteVoorScherm(env, id)).aanpassing === 'zonder de extra detailfoto' && telling(db, "SELECT COUNT(*) AS n FROM maat_besluiten WHERE onderwerp = 'offerte' AND besluit = 'aanpassen'") === 1);
const s2 = await stuurOfferte(env, id, { regels: leesRegels('Basis 3 × €90;270\nEen eigen wereld;570'), email: 'inkoop@example.test', land: 'NL' }, { origin });
ok('de nieuwe offerte: €840, de aanpassing is weg', s2.ok && s2.totaal === 840 && !(await offerteVoorScherm(env, id)).aanpassing && await stand() === 'offerte');

console.log('\n4 · akkoord: de bestelling en de betaallink');
ok('zonder het zakelijk-vinkje geen akkoord', (await akkoordEnBetaallink(env, 1, id, { origin })).reden === 'zakelijk');
ok('een ander mag niet', (await akkoordEnBetaallink(env, 2, id, { zakelijk: true, origin })).reden === 'weg');
const voorAk = mails().length;
const ak = await akkoordEnBetaallink(env, 1, id, { zakelijk: true, origin });
ok('akkoord: een bestelling met kenmerk, de betaallink is weg', ak.ok && /^VIS-/.test(ak.ref) && ak.link === true && ak.betaalUrl.startsWith('/api/order-pay?ref='), JSON.stringify(ak));
const o = db.prepare('SELECT * FROM orders WHERE ref = ?').get(ak.ref);
const d = JSON.parse(o.details_json);
ok('de bestelling: custom, de helft (€420) netto + €88,20 btw, goedgekeurd, onbetaald', o.service === 'custom' && o.total_cents === 42000 && o.vat_cents === 8820 && o.vat_rate === 0.21 && o.review_state === 'approved' && o.payment_status === 'unpaid' && o.email === 'inkoop@example.test', JSON.stringify(o));
ok('… met de aanvraag, de dienst, het totaal en het restant erin', d.request === 'op-maat' && d.opmaat_id === id && d.opmaat_dienst === 'catalog' && d.quote_kind === 'aanbetaling' && d.opmaat_totaal === 840 && d.opmaat_rest === 420 && !!d.business_declaration);
const linkMail = mails().slice(voorAk).find((m) => /order-pay/.test(m.html));
ok('de betaallinkmail gaat naar het adres van de offerte en zegt dat het de helft is', linkMail && JSON.stringify(linkMail.to).includes('inkoop@example.test') && /Dit is de helft/.test(linkMail.html) && /Catalog op maat/.test(linkMail.html));
ok('stand vastgelegd, akkoord en link vastgelegd', await stand() === 'vastgelegd' && !!(await offerteVoorScherm(env, id)).linkOp && (await offerteVoorScherm(env, id)).ref === ak.ref);
ok('twee keer akkoord kan niet (één bestelling)', (await akkoordEnBetaallink(env, 1, id, { zakelijk: true, origin })).reden === 'stand' && telling(db, "SELECT COUNT(*) AS n FROM orders WHERE json_extract(details_json, '$.opmaat_id') = " + id) === 1);
ok('Nu doen: de link is weg, dus geen regel', await nuRegel() === null);
ok('de factuurregel zegt "Aanbetaling · Catalog op maat — volgens offerte"', snapshotFromOrder(o, env, { number: 'X', date: '2026-11-15' }).lines?.[0]?.description === 'Aanbetaling · Catalog op maat — volgens offerte');

console.log('\n5 · zonder mail of Mollie: Nu doen en opnieuw sturen');
const id2 = await totAkkoord(1);
const zonder = { DB: env.DB };
await stuurOfferte(env, id2, { regels: leesRegels('Basis;300'), email: 'a@example.test', land: 'BE', btwNummer: 'BE0123456789' }, { origin, vies: vies(true) });
ok('België met geldig nummer: de offerte is verlegd, 0%', (await offerteVoorScherm(env, id2)).btwBehandeling === 'eu_reverse_charge' && (await offerteVoorScherm(env, id2)).aanbetalingBtw === 0);
const ak2 = await akkoordEnBetaallink(zonder, 1, id2, { zakelijk: true, origin });
ok('akkoord zonder sleutels: de bestelling staat er, de link niet', ak2.ok && ak2.link === false && !(await offerteVoorScherm(env, id2)).linkOp);
const o2 = db.prepare('SELECT * FROM orders WHERE ref = ?').get(ak2.ref);
ok('… verlegd, 0% btw, met de verleggingszin en het VIES-nummer', o2.vat_treatment === 'eu_reverse_charge' && o2.vat_cents === 0 && /btw wordt verlegd/.test(JSON.parse(o2.details_json).vat_declaration || '') && JSON.parse(o2.details_json).vies_consultation === 'WAPIAAAAX' && o2.vat_consultation === 'WAPIAAAAX' && o2.vat_valid === 1);
ok('Nu doen: "Op maat: betaallink | Betaallink sturen"', await nuRegel(id2) === 'Op maat: betaallink | Betaallink sturen', await nuRegel(id2));
ok('opnieuw sturen met de sleutels: gelukt, de regel is weg', (await betaallinkOpnieuw(env, id2, { origin })).ok && await nuRegel(id2) === null);
db.prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?").run(o2.id);
ok('na de betaling kan er geen nieuwe link meer', (await betaallinkOpnieuw(env, id2, { origin })).reden === 'stand' && (await offerteVoorScherm(env, id2)).betaald === true);
ok('een betaalde offerte ligt vast: geen nieuwe offerte', (await stuurOfferte(env, id2, { regels: leesRegels('Basis;1'), email: 'a@example.test' }, { origin })).ok === false);

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
if (fail) process.exit(1);
