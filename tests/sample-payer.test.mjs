/*
 * ─────────────────────────────────────────────────────────────────────────────
 * DE TWEEDE PROEFVISUAL, HERKEND AAN DE BANKREKENING
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Twee lagen houden "één proefvisual per bedrijf" overeind, en ze doen met opzet
 * niet hetzelfde:
 *
 *   · functions/api/order.js weigert VÓÓR de betaling op e-mail en telefoon. Zacht,
 *     want de bezoeker vult dat allemaal zelf in. Getest in order-api.test.mjs.
 *   · de Mollie-webhook annuleert NA de betaling op de bankrekening. Hard, want
 *     die komt van de bank. Dat is wat hier getest wordt.
 *
 * De gedragstests draaien tegen de echte hashfunctie met een nep-database. Wat ze
 * moeten vasthouden is niet "er gebeurt iets" maar de vier beslissingen waar dit
 * op staat of valt: dezelfde rekening wordt herkend dwars door schrijfwijzen heen,
 * een andere rekening niet, een eerste proef legt zijn hash vast (anders vangt de
 * klep structureel pas de derde), en alles wat omvalt laat de klant erdoor.
 */
import { payerIdentity, payerHash, normalizeEmail, normalizePhone } from '../src/lib/payer.js';

let pass = 0, fail = 0;
const ok = (label, got, want = true, extra = '') => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  good ? pass++ : fail++;
  console.log(` ${good ? 'ok  ' : 'FAIL'} ${label.padEnd(58)}${good ? '' : `expected ${JSON.stringify(want)} got ${JSON.stringify(got)} ${extra}`}`);
};

/* Een database die genoeg kan om deze route te laten lopen: het zout bewaren en
   proefvisuals teruggeven. `paid` is de verzameling hashes die al bestaat. */
const fakeDb = ({ rows = [], updateThrows = false, readThrows = false } = {}) => {
  const settings = new Map();
  const updates = [];
  return {
    _updates: updates,
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async first() {
          if (sql.includes('FROM app_settings')) {
            const v = settings.get(st._a[0]);
            return v ? { value: v } : null;
          }
          if (sql.includes("service = 'test-sample'")) {
            if (readThrows) throw new Error('D1_ERROR: no such table');
            return rows.find((r) => r.payer_hash === st._a[0]) || null;
          }
          return null;
        },
        async run() {
          if (sql.includes('INSERT OR IGNORE INTO app_settings')) {
            if (!settings.has(st._a[0])) settings.set(st._a[0], st._a[1]);
          }
          if (sql.includes('UPDATE orders SET payer_hash')) {
            if (updateThrows) throw new Error('D1_ERROR: database is locked');
            updates.push({ hash: st._a[0], kind: st._a[1] });
          }
          return { success: true };
        },
        async all() { return { results: [] }; },
      };
      return st;
    },
  };
};

const ideal = (iban) => ({ id: 'tr_X', details: { consumerAccount: iban } });

console.log('\nwat er uit een betaling te herkennen valt');
{
  ok('iDEAL geeft het IBAN', payerIdentity(ideal('NL91ABNA0417164300'))?.kind, 'ideal');
  ok('een kaart geeft de vingerafdruk',
    payerIdentity({ details: { cardFingerprint: 'fp_1' } })?.kind, 'card');

  /* Niet elke betaalmethode zegt iets over de betaler, en dat MAG. Zou dit een
     fout zijn in plaats van "niets te zeggen", dan zou een klant met een
     ongebruikelijke betaalmethode zijn eerste proef niet krijgen. */
  ok('een betaling zonder details levert niets op', payerIdentity({ details: {} }), null);
  ok('en een betaling zonder details-veld ook niet', payerIdentity({}), null);
}

console.log('\ndezelfde rekening, anders getypt');
{
  const env = { DB: fakeDb() };
  const a = await payerHash(env, ideal('NL91 ABNA 0417 1643 00'));
  const b = await payerHash(env, ideal('nl91abna0417164300'));
  const c = await payerHash(env, ideal('NL02RABO0123456789'));

  /* Dit is de kern. Bankapps en mensen typen een IBAN met spaties, zonder spaties,
     in kleine letters — en dat is dezelfde rekening. Zou de hash dat verschil
     bewaren, dan zou de klep pas werken als iemand het TOEVALLIG twee keer
     identiek intypt, en dat is geen klep. */
  ok('spaties en hoofdletters maken niet uit', a.hash === b.hash, true);
  ok('een andere rekening is een andere hash', a.hash === c.hash, false);

  /* Er wordt geen IBAN opgeslagen — alleen een hash. Zonder deze regel kan iemand
     de gezouten hash vervangen door het rekeningnummer zelf zonder dat er iets
     rood wordt, en dan staat er ineens een persoonsgegeven in de database. */
  ok('het rekeningnummer zit niet in de uitkomst', a.hash.includes('ABNA'), false);
  ok('en het is een sha-256 in hex', /^[0-9a-f]{64}$/.test(a.hash), true);
}

console.log('\nhet zout');
{
  /* Het zout moet ECHT meedoen in de hash — anders is dit een kale sha-256 van een
     rekeningnummer, en die is terug te rekenen omdat de verzameling IBANs klein en
     vormvast is. Twee verschillende zouten op dezelfde rekening moeten dus twee
     verschillende hashes geven.
     
     Gemeten via env.PAYER_SALT en niet met twee nep-databases, want `saltCache` in
     payer.js is per isolate — precies zoals in ratelimit.js, en terecht: één worker
     bedient één omgeving. Twee databases binnen één testproces delen die cache, dus
     dat zou het zout meten op de enige plek waar het niet te meten is. */
  const one = await payerHash({ DB: fakeDb(), PAYER_SALT: 'zout-een' }, ideal('NL91ABNA0417164300'));
  const two = await payerHash({ DB: fakeDb(), PAYER_SALT: 'zout-twee' }, ideal('NL91ABNA0417164300'));
  ok('een ander zout geeft een andere hash', one.hash === two.hash, false);

  /* En hetzelfde zout op dezelfde rekening geeft hetzelfde antwoord, anders
     herkent de klep de maand erna niets meer. */
  const three = await payerHash({ DB: fakeDb(), PAYER_SALT: 'zout-een' }, ideal('NL91 ABNA 0417 1643 00'));
  ok('hetzelfde zout, dezelfde rekening, dezelfde hash', one.hash === three.hash, true);

  /* En binnen één database moet hij wél stabiel zijn, anders herkent de klep
     nooit iets — de hash van vandaag zou niet op die van vorige maand lijken. */
  const env = { DB: fakeDb() };
  const x = await payerHash(env, ideal('NL91ABNA0417164300'));
  const y = await payerHash(env, ideal('NL91ABNA0417164300'));
  ok('maar binnen één database ligt hij vast', x.hash === y.hash, true);
}

console.log('\nde zachte laag: wat de bezoeker zelf invult');
{
  ok('plus-adressering is dezelfde inbox',
    normalizeEmail('klant+2@merk.nl'), 'klant@merk.nl');
  ok('gmail negeert puntjes',
    normalizeEmail('k.l.a.n.t@gmail.com'), 'klant@gmail.com');

  /* De andere kant op, en die is belangrijker dan hij lijkt: buiten Gmail zijn
     puntjes betekenisvol. jan.smit@ en jansmit@ bij een bedrijfsdomein zijn twee
     collega's, en de tweede onterecht weigeren kost een klant op het eerste scherm
     dat hij van je ziet. Bij twijfel doorlaten. */
  ok('buiten gmail blijven puntjes betekenisvol',
    normalizeEmail('jan.smit@merk.nl'), 'jan.smit@merk.nl');

  ok('+31 en 06 zijn hetzelfde nummer',
    normalizePhone('+31 6 12 34 56 78') === normalizePhone('06-12345678'), true);

  /* Een half nummer mag op NIETS matchen. Zonder deze regel zou iedereen die zijn
     nummer niet invult op iedereen anders matchen die dat ook niet deed, en dan
     weigert de klep zijn eigen klanten. */
  ok('een half nummer levert niets op', normalizePhone('06'), '');
  ok('en een leeg veld ook niet', normalizePhone(''), '');
}

console.log('\nen als er iets omvalt');
{
  /* Geen database betekent geen hash, en geen hash betekent dat de webhook de
     controle overslaat en de bestelling gewoon doorlaat. Eén proef te veel maken is
     een kleinere fout dan een betalende klant annuleren omdat een controle omviel. */
  ok('zonder database geen hash', await payerHash({}, ideal('NL91ABNA0417164300')), null);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
