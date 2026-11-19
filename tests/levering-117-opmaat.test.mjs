/**
 * VISUAILS — levering 117 (17 november 2026), proefronde P5-06 en P5-07: de intake op maat.
 *   P5-06  een volledige aanvraag "Lifestyle op maat" is te versturen (het moment telt als uitleg bij l-moment).
 *   P5-07  drie mails tussen versturen en offerte, en een regel in Studio "Nu te doen".
 * Op een echte database (node:sqlite, schema.sql), met Resend nagebootst. Zonder build.
 *   node tests/levering-117-opmaat.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { nieuweAanvraag, bewaarConcept, verstuur, bewaarMerk, aanvraagVan, ontbreekt, opMaatAanZet, zetStand } from '../src/lib/opMaat.js';
import { voegVoorbeeldToe, voorbeeldSleutel, zetVoorbeeldKlaar, reactieOpRonde } from '../src/lib/opMaatRondes.js';
import { aanvraagOntvangenMail, voorbeeldKlaarMail, reactieStudioMail } from '../src/lib/opMaatMail.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

/* Resend nagebootst; `weiger` laat hem een 500 geven. */
const gezien = [];
let weiger = false;
globalThis.fetch = async (url, opts = {}) => {
  gezien.push({ url: String(url), body: opts.body ? String(opts.body) : '' });
  if (weiger) return new Response('kapot', { status: 500 });
  return new Response('{"id":"msg"}', { status: 200, headers: { 'content-type': 'application/json' } });
};
const mails = () => gezien.filter((g) => g.url.includes('resend')).map((g) => JSON.parse(g.body));
const nieuweMails = (voor) => mails().slice(voor);
const aan = (m) => (Array.isArray(m.to) ? m.to[0] : m.to);

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt', !mislukt?.length, JSON.stringify(mislukt));
db.exec(`INSERT INTO customers (id, email, name, brand, country) VALUES
  (1, 'fatima@example.test', 'Test Klant', 'TEST-merk', 'NL'),
  (2, 'en@example.test', 'Test English', 'TEST-brand', 'NL'),
  (3, 'zonder@example.test', 'Test Zonder', 'TEST-zonder', 'NL')`);
const origin = 'https://proef.example.test';
const env = { DB: d1(db), RESEND_API_KEY: 're_test_nep', NOTIFY_EMAIL: 'studio@example.test' };

/* Een volledige lifestyle-intake, zoals de proefronde hem invulde: elk veld, ook de keuzes met een eigen uitleg. */
const VOLLEDIG = {
  moment: { zin: 'Vlak voor de deur uit, op weg naar een <b>bruiloft</b> als gast', wie: 'Zij, eind twintig', waar: 'De gang thuis', wanneer: 'Zaterdagmiddag' },
  aantal: 12,
  plek: { soort: 'thuis', tekst: 'Een smalle gang met een spiegel' },
  mensen: { aantal: 2, merkmodel: 'geen' },
  pose: { idee: 'Hand omhoog, zoals een artiest op het podium', wie: 'een artiest', lichaamsdeel: 'de hand' },
  licht: 'tegenlicht',
  toelichting: { 'l-mensen': 'Een vriendin die haar kraag recht trekt', 'l-licht': 'Laag zonlicht door de voordeur' },
  gekozen: ['l-plek', 'l-mensen', 'l-pose', 'l-licht'],
  nooit: 'Geen studio-achtergrond',
  buiten: { durven: 'Regen', moment: 'De spiegel', plek: 'Een gang', gevoel: 'Erbij horen' },
  praktisch: { wanneer: 'Binnen een maand', kanalen: ['webshop', 'instagram'], contact: 'mail' },
};

console.log('\nP5-06 · Lifestyle op maat is te versturen');
await bewaarMerk(env, 1, { naam: 'TEST-merk' });
const a = await nieuweAanvraag(env, 1, 'lifestyle', 'nl');
const opgeslagen = await bewaarConcept(env, 1, a.id, VOLLEDIG, 1);
ok('de volledige intake is opgeslagen', opgeslagen.ok, JSON.stringify(opgeslagen.reden));
const nu = await aanvraagVan(env, 1, a.id);
ok('niets ontbreekt meer (geen toelichting.l-moment)', JSON.stringify(ontbreekt('lifestyle', nu.inhoud, { naam: 'TEST-merk' })) === '[]', JSON.stringify(ontbreekt('lifestyle', nu.inhoud, { naam: 'TEST-merk' })));
ok('zonder het moment in één zin ontbreekt dat wel, één keer', JSON.stringify(ontbreekt('lifestyle', { praktisch: { contact: 'mail' } }, { naam: 'x' })) === '["moment.zin"]', JSON.stringify(ontbreekt('lifestyle', { praktisch: { contact: 'mail' } }, { naam: 'x' })));
ok('een gekozen tweede persoon zonder uitleg blijft nog nodig', ontbreekt('lifestyle', { ...nu.inhoud, toelichting: {} }, { naam: 'x' }).includes('toelichting.l-mensen'));

console.log('\nP5-07 · 1 · klant: "We hebben je aanvraag"');
let voor = mails().length;
const v1 = await verstuur(env, 1, a.id, { origin });
ok('versturen lukt: stand verstuurd', v1.ok && (await aanvraagVan(env, 1, a.id)).stand === 'verstuurd', JSON.stringify(v1.ontbreekt || v1.reden));
ok('versturen zegt dat er gemaild is', v1.gemaild === true);
let m = nieuweMails(voor);
ok('precies één mail, naar het adres van de klant', m.length === 1 && aan(m[0]) === 'fatima@example.test', JSON.stringify(m.map(aan)));
ok('onderwerp "We hebben je aanvraag — OM-n"', m[0] && m[0].subject === `We hebben je aanvraag — OM-${a.id}`, m[0]?.subject);
ok('met de brief: de dienst en het moment, ge-escapet', m[0] && /Lifestyle op maat/.test(m[0].html) && m[0].html.includes('&lt;b&gt;bruiloft&lt;/b&gt;') && !m[0].html.includes('<b>bruiloft'));
ok('een knop naar de aanvraag in Studio, in het Nederlands', m[0] && m[0].html.includes(`${origin}/account/op-maat?id=${a.id}&amp;lang=nl`), m[0]?.html.match(/href="[^"]*op-maat[^"]*"/)?.[0]);
ok('zegt wat er nu gebeurt en dat hij nog niets betaalt', m[0] && /We maken eerst een voorbeeld/.test(m[0].html) && /Je betaalt niets/.test(m[0].html));
ok('de vragenregel van de andere klantmails staat eronder', m[0] && /Vragen\? Antwoord op deze mail/.test(m[0].html));

console.log('\nP5-07 · 2 · klant: "Je eerste voorbeeld staat klaar"');
await voegVoorbeeldToe(env, a.id, { r2Key: voorbeeldSleutel(1, a.id, 1, 'gang.jpg'), bestandsnaam: 'gang.jpg' });
ok('Nu te doen: nog niets zolang de studio bezig is', (await opMaatAanZet(env, 1, 'nl')).length === 0);
voor = mails().length;
const k1 = await zetVoorbeeldKlaar(env, a.id, { origin });
ok('de ronde staat klaar en er is gemaild', k1.ok && k1.gemaild === true && k1.ronde === 1, JSON.stringify(k1));
m = nieuweMails(voor);
ok('één mail aan de klant: "Je eerste voorbeeld staat klaar — OM-n"', m.length === 1 && aan(m[0]) === 'fatima@example.test' && m[0].subject === `Je eerste voorbeeld staat klaar — OM-${a.id}`, m[0]?.subject);
ok('de knop gaat naar de ronde in Studio', m[0] && m[0].html.includes(`/account/op-maat?id=${a.id}&amp;lang=nl#om-ronde`));
const nuTe = await opMaatAanZet(env, 1, 'nl');
ok('Nu te doen: één regel met OM-n, het voorbeeld en de link', nuTe.length === 1 && nuTe[0].ref === `OM-${a.id}` && /voorbeeld staat klaar/.test(nuTe[0].zin) && nuTe[0].href === `/account/op-maat?id=${a.id}#om-ronde` && nuTe[0].knop === 'Bekijk het voorbeeld', JSON.stringify(nuTe));
ok('Nu te doen in het Engels', (await opMaatAanZet(env, 1, 'en'))[0]?.knop === 'View the preview');
ok('Nu te doen: niet voor een andere klant', (await opMaatAanZet(env, 2, 'nl')).length === 0);

console.log('\nP5-07 · 3 · studio: "Reactie op voorbeeld"');
const vb = db.prepare('SELECT id FROM maat_voorbeelden WHERE aanvraag_id = ? ORDER BY id').all(a.id);
voor = mails().length;
const r1 = await reactieOpRonde(env, 1, a.id, { beelden: { [vb[0].id]: 'aanpassen' }, wel: 'de gang', anders: 'warmer <licht>', blijven: 'de spiegel', origin });
ok('de reactie is opgeslagen', r1.ok && r1.stand === 'verstuurd');
m = nieuweMails(voor);
ok('één mail, naar het studio-adres (NOTIFY_EMAIL)', m.length === 1 && aan(m[0]) === 'studio@example.test', JSON.stringify(m.map(aan)));
ok('onderwerp "Reactie op voorbeeld · OM-n"', m[0] && m[0].subject === `Reactie op voorbeeld · OM-${a.id}`, m[0]?.subject);
ok('antwoorden gaat naar de klant', m[0] && m[0].reply_to === 'fatima@example.test', m[0]?.reply_to);
ok('met wat goed is, wat anders moet en wat blijft, ge-escapet', m[0] && /Goed: de gang/.test(m[0].html) && m[0].html.includes('warmer &lt;licht&gt;') && /Blijven: de spiegel/.test(m[0].html));
ok('met per beeld en een knop naar /admin', m[0] && /0 goed, 1 aanpassen/.test(m[0].html) && m[0].html.includes(`${origin}/admin/op-maat/${a.id}`));
ok('Nu te doen: weg, de studio is weer aan zet', (await opMaatAanZet(env, 1, 'nl')).length === 0);

await voegVoorbeeldToe(env, a.id, { r2Key: voorbeeldSleutel(1, a.id, 2, 'gang2.jpg'), bestandsnaam: 'gang2.jpg' });
voor = mails().length;
await zetVoorbeeldKlaar(env, a.id, { origin });
ok('ronde 2: "Ronde 2 van je voorbeeld staat klaar"', nieuweMails(voor)[0]?.subject === `Ronde 2 van je voorbeeld staat klaar — OM-${a.id}`, nieuweMails(voor)[0]?.subject);
voor = mails().length;
await reactieOpRonde(env, 1, a.id, { goed: true, origin });
m = nieuweMails(voor);
ok('"dit is goed": de studiomail zegt "goed" en "offerte maken"', m.length === 1 && m[0].subject === `Reactie op voorbeeld · OM-${a.id} · goed` && /offerte maken/.test(m[0].html), m[0]?.subject);
ok('stand akkoord', (await aanvraagVan(env, 1, a.id)).stand === 'akkoord');
await zetStand(env, a.id, 'gesloten');

console.log('\nEngels, zonder sleutel, en een weigerende mailserver');
await bewaarMerk(env, 2, { naam: 'TEST-brand' });
const e = await nieuweAanvraag(env, 2, 'lifestyle', 'en');
await bewaarConcept(env, 2, e.id, { moment: { zin: 'Getting ready for a gallery opening' }, praktisch: { contact: 'mail' } }, 1);
voor = mails().length;
ok('een korte lifestyle-intake met alleen het moment is ook te versturen', (await verstuur(env, 2, e.id, { origin })).ok);
m = nieuweMails(voor);
ok('Engelse aanvraag: Engelse mail met lang=en', m[0] && m[0].subject === `We have your request — OM-${e.id}` && m[0].html.includes('lang=en') && /Custom lifestyle/.test(m[0].html), m[0]?.subject);

await bewaarMerk(env, 3, { naam: 'TEST-zonder' });
const z = await nieuweAanvraag(env, 3, 'lifestyle', 'nl');
await bewaarConcept(env, 3, z.id, { moment: { zin: 'Een diner' }, praktisch: { contact: 'mail' } }, 1);
const zonderSleutel = { DB: env.DB };
voor = mails().length;
const foutLog = console.error; console.error = () => {};
const vz = await verstuur(zonderSleutel, 3, z.id, { origin });
console.error = foutLog;
ok('zonder RESEND_API_KEY: toch verstuurd, gemaild false, geen mail', vz.ok && vz.gemaild === false && mails().length === voor);
await voegVoorbeeldToe(env, z.id, { r2Key: voorbeeldSleutel(3, z.id, 1, 'x.jpg'), bestandsnaam: 'x.jpg' });
weiger = true; console.error = () => {};
const kz = await zetVoorbeeldKlaar(env, z.id, { origin });
const rz = await reactieOpRonde(env, 3, z.id, { anders: 'iets anders', origin });
console.error = foutLog; weiger = false;
ok('Resend weigert: de ronde staat toch klaar (gemaild false)', kz.ok && kz.gemaild === false);
ok('Resend weigert: de reactie is toch opgeslagen', rz.ok && (await aanvraagVan(env, 3, z.id)).stand === 'verstuurd');

console.log('\nDe mails zelf (zonder database)');
const nep = { id: 7, dienst: 'catalog', taal: 'nl', name: 'Test Klant', email: 'x@example.test', inhoud: { soorten: [{ soort: 'jas' }, { soort: 'broek' }] } };
ok('catalog: de brief noemt het aantal soorten', /2 soorten producten/.test(aanvraagOntvangenMail(nep, origin).html));
ok('zonder origin: de link gaat naar visuails.com', voorbeeldKlaarMail(nep, 1, '').html.includes('https://visuails.com/account/op-maat?id=7'));
ok('studiomail: in het Nederlands, ook bij een Engelse klant', /lang="nl"/.test(reactieStudioMail({ ...nep, taal: 'en' }, { ronde: 1, goed: false }, origin).html));
for (const [naam, mail] of [['ontvangen', aanvraagOntvangenMail(nep, origin)], ['voorbeeld', voorbeeldKlaarMail(nep, 1, origin)]]) {
  const tekst = mail.html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ');
  const zinnen = tekst.split(/[.?!]\s/).map((s) => s.trim().split(/\s+/).length);
  ok(`${naam}: korte zinnen (hoogstens 25 woorden)`, Math.max(...zinnen) <= 25, String(Math.max(...zinnen)));
}

console.log('\nStudio "Nu te doen" (bron)');
const acc = lees('src/lib/account.js');
const idx = lees('src/pages/account/index.astro');
ok('account.js zet v.opMaatNu op het overzicht', /v\.opMaatNu = await \(await import\('\.\/opMaat\.js'\)\)\.opMaatAanZet\(env, customer\.customer_id, lang\)/.test(acc));
ok('account.js heeft de kop in NL en EN', /ovOpMaatKop: 'Op maat, jij bent aan zet:'/.test(acc) && /ovOpMaatKop: 'Custom request, your turn:'/.test(acc));
ok('index.astro toont het blok ook zonder bestelling, en de regels met hun knop', /\(\(w && w\.boven\) \|\| opMaatNu\.length > 0\)/.test(idx) && /knopInhoud\('navigeren', n\.knop\)/.test(idx) && /w && w\.nogMeer\.length/.test(idx));
ok('adminOpMaat zegt het als de voorbeeldmail niet wegging', /klaarNietGemaild/.test(lees('src/lib/adminOpMaat.js')));
ok('opMaatApi geeft de origin mee bij verstuur en reactie', /verstuur\(env, cid, id, \{ origin/.test(lees('src/lib/opMaatApi.js')) && /goed: b\.goed === true, origin/.test(lees('src/lib/opMaatApi.js')));

console.log(`\n${pass} goed, ${fail} fout`);
if (fail) process.exit(1);
