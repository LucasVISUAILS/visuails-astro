/**
 * VISUAILS — levering 118 (17 november 2026), bouwer BG: de weg op maat.
 *   P12-02  een verstuurde aanvraag bewaart het merk van toen (migratie 0074), /admin en Studio tonen die kopie
 *   P5-09   een label per stand (Betaald), gesloten onder "Afgerond", en een mail bij sluiten na betalen
 *   P5-10   het offerteformulier valt terug op land en btw-nummer van de laatste betaalde bestelling
 * Op een echte database (node:sqlite, schema.sql plus migratie 0074), met Resend nagebootst. Zonder build.
 *   node tests/levering-118-opmaat.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  nieuweAanvraag, bewaarConcept, verstuur, bewaarMerk, aanvraagVan, aanvragenVan, zetStand, standVoorKlant, klantStand,
  merkVanAanvraag,
} from '../src/lib/opMaat.js';
import { renderOpMaatAanvraag, renderOpMaatLijst } from '../src/lib/adminOpMaat.js';
import { aanvraagAfgerondMail } from '../src/lib/opMaatMail.js';
/* levering 118 (integratie IA): de blokken voor P5-13 en P5-02 zijn eruit gehaald; die punten hebben advies "later" (lijst 127). */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const lees = (p) => readFileSync(`${ROOT}${p}`, 'utf8');
let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const gezien = [];
const echteFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt', !mislukt?.length, JSON.stringify(mislukt));
/* Migratie 0074 erbij, zoals scripts/migrate.mjs hem draait (schema.sql krijgt hem van de regisseur). */
try { db.exec(lees('migrations/0074-op-maat-merk-bij-aanvraag.sql')); } catch (e) { if (!/duplicate column/i.test(e.message)) throw e; }
ok('migratie 0074 geeft maat_aanvragen.merk_json', db.prepare('PRAGMA table_info(maat_aanvragen)').all().some((c) => c.name === 'merk_json'));
db.exec(`INSERT INTO customers (id, email, name, brand, country) VALUES
  (1, 'bureau@example.test', 'Test Bureau', 'TEST Bureau', NULL),
  (2, 'fatima@example.test', 'Test Fatima', 'TEST Fatima BV', NULL)`);
const origin = 'https://proef.example.test';
const env = { DB: d1(db), RESEND_API_KEY: 're_test_nep', NOTIFY_EMAIL: 'studio@example.test', PUBLIC_ORIGIN: origin };
const h = { esc: (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]), html: (b) => b, page: ({ body }) => body, adminNav: () => '' };
const tekst = (x) => String(x || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

const CATALOG = { soorten: [{ soort: 'tshirt', aantal: 2 }], praktisch: { contact: 'mail' } };

console.log('\nP12-02 · het merk van het moment van versturen');
await bewaarMerk(env, 1, { naam: 'TEST Merk A', kleuren: ['#FF0000'], klant: 'jonge lopers' });
const a = await nieuweAanvraag(env, 1, 'catalog', 'nl');
await bewaarConcept(env, 1, a.id, CATALOG, 1);
const v = await verstuur(env, 1, a.id, { origin });
ok('versturen lukt', v.ok, JSON.stringify(v));
ok('de aanvraag draagt een kopie van het merk', v.aanvraag.merk && v.aanvraag.merk.naam === 'TEST Merk A', JSON.stringify(v.aanvraag.merk));
await bewaarMerk(env, 1, { naam: 'TEST Merk B', kleuren: ['#1A2B3C'], klant: 'denimliefhebbers' });
const na = await aanvraagVan(env, 1, a.id);
const m = await merkVanAanvraag(env, na, 1);
ok('na het aanpassen van het merkblok blijft de aanvraag op merk A', m.kopie && m.merk.naam === 'TEST Merk A' && m.merk.kleuren[0] === '#FF0000', JSON.stringify(m));
const adminHtml = await renderOpMaatAanvraag({ env }, new URL(`${origin}/admin/op-maat/${a.id}`), a.id, h);
ok('/admin toont merk A, niet merk B', /TEST Merk A/.test(adminHtml) && !/TEST Merk B/.test(adminHtml));
ok('/admin zegt dat het het merk van het versturen is', /Het merk zoals het was bij het versturen/.test(adminHtml));
const concept = await nieuweAanvraag(env, 1, 'hooks', 'nl');
ok('een concept heeft nog geen kopie (het profiel van nu)', concept.merk === null && (await merkVanAanvraag(env, concept, 1)).merk.naam === 'TEST Merk B');
const acc = lees('src/lib/account.js');
ok('Studio leest op een verstuurde aanvraag de kopie', /const merk = \(open && open\.merk\) \|\| await merkVan/.test(acc));
ok('de API ook', /const merk = a\.merk \|\| await merkVan/.test(lees('src/lib/opMaatApi.js')));
const astro = lees('src/pages/account/op-maat.astro');
ok('het merkblok op een verstuurde aanvraag zegt dat het vastligt (NL en EN)', /Zoals het was toen je deze aanvraag verstuurde/.test(astro) && /As it was when you sent this request/.test(astro));

console.log('\nP5-10 · land en btw-nummer uit de laatste betaalde bestelling');
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, email, lang, country, vat_number, payment_status, paid_at)
  VALUES (501, 'VIS-BE01-AAA', 2, 'catalog', 'delivered', 'fatima@example.test', 'nl', 'BE', 'BE0123456789', 'paid', '2026-11-10 10:00:00')`);
db.exec(`INSERT INTO maat_aanvragen (id, customer_id, dienst, stand, inhoud_json) VALUES (50, 2, 'catalog', 'akkoord', '{}')`);
const fHtml = await renderOpMaatAanvraag({ env }, new URL(`${origin}/admin/op-maat/50`), 50, h);
ok('België staat gekozen', /<option value="BE" selected>/.test(fHtml));
ok('het btw-nummer staat ingevuld', /name="btw"[^>]*value="BE0123456789"/.test(fHtml));
ok('met "uit VIS-BE01-AAA" erbij', /uit VIS-BE01-AAA/.test(fHtml));
db.exec("UPDATE customers SET country = 'NL', vat_number = 'NL001' WHERE id = 2");
const fHtml2 = await renderOpMaatAanvraag({ env }, new URL(`${origin}/admin/op-maat/50`), 50, h);
ok('heeft het account ze zelf, dan die (zonder de regel)', /<option value="NL" selected>/.test(fHtml2) && !/uit VIS-BE01-AAA/.test(fHtml2));

console.log('\nP5-09 · label per stand, Afgerond, en een mail bij sluiten na betalen');
ok('vastgelegd en betaald heet "Betaald"', klantStand('vastgelegd', true) === 'betaald' && standVoorKlant('vastgelegd', { betaald: true, ref: 'VIS-X' }, 'nl').label === 'Betaald');
ok('gesloten na betalen heet "Afgerond", met de bestelling', standVoorKlant('gesloten', { betaald: true, ref: 'VIS-X' }, 'nl').zin.includes('VIS-X') && standVoorKlant('gesloten', { betaald: true }, 'en').label === 'Completed');
ok('verstuurd blijft "Verstuurd"', standVoorKlant('verstuurd', {}, 'nl').label === 'Verstuurd');
ok('elk label bestaat in beide talen', ['concept', 'verstuurd', 'voorstel', 'akkoord', 'offerte', 'vastgelegd', 'gesloten'].every((s) => standVoorKlant(s, {}, 'nl').label && standVoorKlant(s, {}, 'en').label));
db.exec(`INSERT INTO maat_aanvragen (id, customer_id, dienst, stand, inhoud_json) VALUES (60, 2, 'lifestyle', 'vastgelegd', '{}')`);
db.exec(`INSERT INTO orders (id, ref, customer_id, service, status, email, lang, payment_status, total_cents, details_json)
  VALUES (601, 'VIS-OM60-AAA', 2, 'custom', 'received', 'fatima@example.test', 'nl', 'paid', 60400, '{"request":"op-maat","opmaat_id":60,"quote_kind":"aanbetaling"}')`);
db.exec(`INSERT INTO maat_offertes (aanvraag_id, regels_json, totaal_cents, aanbetaling_cents, akkoord_op, order_id) VALUES (60, '[{"naam":"x","bedrag":1208}]', 120800, 60400, '2026-11-10', 601)`);
let lijst = await aanvragenVan(env, 2, { ookGesloten: true });
ok('de lijst weet dat 60 betaald is, met het kenmerk', lijst.some((x) => x.id === 60 && x.betaald && x.ref === 'VIS-OM60-AAA'), JSON.stringify(lijst.map((x) => [x.id, x.betaald, x.ref])));
let voor = mails().length;
const z = await zetStand(env, 60, 'gesloten', { origin });
ok('sluiten lukt en mailt de klant', z.ok && z.gemaild === true);
const afMail = mails().slice(voor).find((x) => /afgerond/.test(x.subject));
ok('de mail "Je aanvraag op maat is afgerond — OM-60" naar de klant, met de bestelling', afMail && afMail.to.includes('fatima@example.test') && afMail.subject === 'Je aanvraag op maat is afgerond — OM-60' && /VIS-OM60-AAA/.test(afMail.html), afMail?.subject);
lijst = await aanvragenVan(env, 2, { ookGesloten: true });
ok('gesloten blijft in de lijst met ookGesloten', lijst.some((x) => x.id === 60 && x.stand === 'gesloten'));
ok('zonder ookGesloten niet (de API zoals vroeger)', !(await aanvragenVan(env, 2)).some((x) => x.id === 60));
db.exec(`INSERT INTO maat_aanvragen (id, customer_id, dienst, stand, inhoud_json) VALUES (61, 2, 'hooks', 'verstuurd', '{}')`);
voor = mails().length;
ok('sluiten zonder betaling mailt niet', (await zetStand(env, 61, 'gesloten', { origin })).gemaild === false && mails().length === voor);
ok('Studio splitst lopend en Afgerond', /const afgerond = \(v\.aanvragen \|\| \[\]\)\.filter\(\(a: any\) => a\.stand === 'gesloten'\)/.test(astro) && /\{L\('Afgerond', 'Completed'\)\}/.test(astro));
ok('Studio vraagt ook de gesloten op', /aanvragenVan\(env, customer\.customer_id, \{ ookGesloten: true \}\)/.test(acc));
ok('het label "Verstuurd" staat niet meer vast in de strook', !/<span class="om-mono">\{L\('Verstuurd', 'Sent'\)\}<\/span>\{STAND_TEKST/.test(astro));
ok('de Engelse mail bestaat ook', /Your custom request is completed — OM-7/.test(aanvraagAfgerondMail({ id: 7, taal: 'en', dienst: 'catalog', name: 'Test' }, 'VIS-1', origin).subject));

globalThis.fetch = echteFetch;
console.log(`\n${pass} goed, ${fail} fout`);
process.exit(fail ? 1 : 0);
