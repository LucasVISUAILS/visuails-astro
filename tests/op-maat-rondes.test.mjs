/**
 * VISUAILS — op maat: de voorbeeldrondes en de offerte (lijst 112, schermen 9 en 10; 15 november 2026).
 * Op een echte database (node:sqlite, schema.sql), van versturen tot akkoord op de offerte.
 *   node tests/op-maat-rondes.test.mjs
 */
import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { nieuweAanvraag, bewaarConcept, verstuur, bewaarMerk, aanvraagVan, zetStand } from '../src/lib/opMaat.js';
import { nuDoen, soortLabel, knopVoor } from '../src/lib/nudoen.js';
import {
  voorbeeldSleutel, voegVoorbeeldToe, zetVoorbeeldKlaar, reactieOpRonde, huidigeRonde, leesRegels, GRATIS_RONDES_TOTAAL,
} from '../src/lib/opMaatRondes.js';

let pass = 0, fail = 0;
const ok = (naam, v, extra = '') => { if (v) { pass++; console.log(` ok   ${naam}`); } else { fail++; console.log(` FAIL ${naam} ${extra}`); } };

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
ok('schema.sql laadt met de tabellen van 0072', !mislukt?.length && telling(db, "SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('maat_voorbeelden','maat_offertes')") === 2, JSON.stringify(mislukt));
db.exec("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'a@example.test', 'Test', 'Merk A', 'NL'), (2, 'b@example.test', 'Test B', 'Merk B', 'NL')");
const env = { DB: d1(db) };

await bewaarMerk(env, 1, { naam: 'Merk A' });
const a = await nieuweAanvraag(env, 1, 'catalog', 'nl');
await bewaarConcept(env, 1, a.id, { soorten: [{ soort: 'jas', voorkant: { legwijze: 'hanger' } }], toelichting: { 'c-pose': 'aan een hanger' }, praktisch: { contact: 'mail' } }, 1);
ok('verstuurd', (await verstuur(env, 1, a.id)).ok);
const stand = async () => (await aanvraagVan(env, 1, a.id)).stand;
/* Nu doen op het dashboard: de regel voor deze aanvraag (of null). */
const nuRegel = async () => {
  const { regels, fout } = await nuDoen(env.DB);
  if (fout) return { fout };
  const r = regels.find((x) => x.soort === 'opmaat' && x.id === a.id);
  return r ? { label: soortLabel(r), knop: knopVoor(r, 'dashboard').label, href: knopVoor(r, 'dashboard').href } : null;
};
const nr0 = await nuRegel();
ok('Nu doen: verstuurd is "Op maat: voorbeeld", de knop naar de aanvraag', nr0 && nr0.label === 'Op maat: voorbeeld' && nr0.knop === 'Voorbeeld maken' && nr0.href === `/admin/op-maat/${a.id}`, JSON.stringify(nr0));

console.log('\n1 · de studio zet een voorbeeld klaar');
ok('zonder beelden kan de ronde niet naar de klant', (await zetVoorbeeldKlaar(env, a.id)).reden === 'geen-beelden');
ok('een sleutel buiten zijn map wordt geweigerd', (await voegVoorbeeldToe(env, a.id, { r2Key: 'maat/2/1/voorbeeld/x' })).reden === 'sleutel');
const k1 = voorbeeldSleutel(1, a.id, 1, 'Muur 1.JPG');
ok('de sleutel staat onder de klant, de aanvraag en de ronde', k1.startsWith(`maat/1/${a.id}/voorbeeld/r1-`) && k1.endsWith('muur-1.jpg'), k1);
ok('een beeld komt in ronde 1', (await voegVoorbeeldToe(env, a.id, { r2Key: k1, bestandsnaam: 'muur.jpg' })).ronde === 1);
await voegVoorbeeldToe(env, a.id, { r2Key: voorbeeldSleutel(1, a.id, 1, 'tapijt.jpg'), bestandsnaam: 'tapijt.jpg' });
ok('de ronde naar de klant: stand voorstel', (await zetVoorbeeldKlaar(env, a.id)).ok && await stand() === 'voorstel');
ok('Nu doen: de klant is aan zet, dus geen regel', await nuRegel() === null);

console.log('\n2 · de klant reageert');
ok('een reactie van een ander mag niet', (await reactieOpRonde(env, 2, a.id, { anders: 'x' })).reden === 'weg');
ok('"aanpassen" zonder wat er anders moet, gaat niet', (await reactieOpRonde(env, 1, a.id, { wel: 'de muur' })).reden === 'anders');
const vb = db.prepare('SELECT id FROM maat_voorbeelden ORDER BY id').all();
const r1 = await reactieOpRonde(env, 1, a.id, { beelden: { [vb[0].id]: 'goed', [vb[1].id]: 'aanpassen', 999: 'goed' }, wel: 'de muur', anders: 'het tapijt grijzer', blijven: 'de flits' });
ok('een reactie: de studio is weer aan zet, en er zijn nog gratis rondes', r1.ok && r1.stand === 'verstuurd' && r1.gratisOver === GRATIS_RONDES_TOTAAL - 1 && await stand() === 'verstuurd', JSON.stringify(r1));
const notitie = db.prepare("SELECT notitie FROM maat_besluiten WHERE onderwerp = 'ronde:1'").get().notitie;
ok('wat goed is, wat anders moet en wat moet blijven staan in één besluit', notitie === 'Goed: de muur\nAnders: het tapijt grijzer\nBlijven: de flits', notitie);
ok('per beeld een besluit, alleen voor beelden van deze ronde', telling(db, "SELECT COUNT(*) AS n FROM maat_besluiten WHERE onderwerp LIKE 'foto:%'") === 2);
ok('een nieuw beeld komt in ronde 2', (await voegVoorbeeldToe(env, a.id, { r2Key: voorbeeldSleutel(1, a.id, 2, 'v2.jpg') })).ronde === 2 && await huidigeRonde(env, a.id) === 2);
ok('ronde 2 naar de klant', (await zetVoorbeeldKlaar(env, a.id)).ok);
ok('"dit is goed": akkoord', (await reactieOpRonde(env, 1, a.id, { goed: true })).stand === 'akkoord' && await stand() === 'akkoord');
ok('Nu doen: "Op maat: offerte"', (await nuRegel())?.knop === 'Offerte maken');

console.log('\n3 · de regels van de offerte (de offerte zelf: tests/op-maat-offerte.test.mjs)');
ok('regels lezen: naam;bedrag, ook met € en komma, onzin valt weg', JSON.stringify(leesRegels('Basis 3 × €90;270\nEigen licht; €75\nonzin\nExtra detail|25,00')) === JSON.stringify([{ naam: 'Basis 3 × €90', bedrag: 270 }, { naam: 'Eigen licht', bedrag: 75 }, { naam: 'Extra detail', bedrag: 25 }]));
await zetStand(env, a.id, 'gesloten');
ok('Nu doen: gesloten, de regel is weg', await nuRegel() === null);

console.log('\n4 · zonder de tabellen van 0071/0072');
{
  const { db: kaal } = verseDb(new URL('../schema.sql', import.meta.url));
  kaal.exec('DROP TABLE maat_offertes; DROP TABLE maat_voorbeelden; DROP TABLE maat_besluiten; DROP TABLE maat_referenties; DROP TABLE maat_aanvragen');
  const r = await nuDoen(d1(kaal));
  ok('Nu doen valt niet om en zegt niets over op maat', r.fout === null && !r.regels.some((x) => x.soort === 'opmaat'), JSON.stringify(r.fout));
}

console.log(`\n${pass} goed, ${fail} fout`);
if (fail) process.exit(1);
