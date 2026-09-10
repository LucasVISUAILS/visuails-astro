/* VISUAILS — het proefmerk, 10 september 2026.
 *
 *   npm run test:proefmerk
 *
 * ── WAT DIT BEWAAKT ─────────────────────────────────────────────────────────
 *
 * Lucas: *"Ik wil namelijk nog test bestellingen doen omdat niet alles nog
 * klopt en visuails studio ook nog vaker getest moet worden."*
 *
 * Alles aan een proefbestelling is terug te draaien behalve één ding: het
 * factuurnummer. Zie de kop van src/lib/invoice.js — een nummer wordt uitgegeven
 * en nooit meer teruggegeven, want een gat leest bij een controle als een
 * verdwenen factuur. Twintig proefbestellingen zijn dus twintig echte facturen
 * in de boekhouding, en de eerste échte klant begint op nummer 21.
 *
 * DAT de nummering klopt, wordt bewezen tegen een echte SQLite in
 * tests/invoice-issue.test.mjs ("de proefreeks loopt naast de echte"). Dit
 * bestand bewaakt de KETEN eromheen: dat de stand ergens vandaan komt, dat hij
 * op alle vier de plekken wordt vastgelegd, en dat hij op het scherm te zien is.
 * Een keten waarvan één schakel ontbreekt, is precies het soort fout dat pas
 * opvalt als de boekhouding al vervuild is.
 */
import { readFileSync } from 'node:fs';
import { isTestmodus } from '../src/lib/mollie.js';
import { formatNumber, isProefNummer } from '../src/lib/invoice.js';

let pass = 0, fail = 0;
function ok(naam, voorwaarde, verwacht = '', kreeg = '') {
  if (voorwaarde) { pass++; console.log(` ok   ${naam.padEnd(62)}`); }
  else { fail++; console.log(` FAIL ${naam.padEnd(62)} verwacht ${verwacht}  kreeg ${kreeg}`); }
}
const lees = (pad) => readFileSync(new URL(`../${pad}`, import.meta.url), 'utf8');

console.log('\nVISUAILS — het proefmerk\n');

/* ══ 1 · DE BRON VAN DE STAND ══════════════════════════════════════════════
   Er is er precies één, en dat is het voorvoegsel van de Mollie-sleutel. Een
   tweede schakelaar zou kunnen afwijken van de sleutel die het geld verwerkt,
   en dan is de vraag welke van de twee gelijk heeft. */
console.log('de sleutel bepaalt of er echt geld kan lopen');
{
  ok('een test_-sleutel is testmodus', isTestmodus({ MOLLIE_API_KEY: 'test_abc123' }) === true);
  ok('een live_-sleutel niet', isTestmodus({ MOLLIE_API_KEY: 'live_abc123' }) === false);
  /* Een ontbrekende sleutel is GEEN testmodus: die levert helemaal geen betaling
     op, en dat probleem hoort bij mollieKey() thuis. Zou hij hier als testmodus
     tellen, dan zou een vergeten secret stilletjes elke bestelling tot proef
     bestempelen — en dat is precies de fout die niemand opmerkt. */
  ok('geen sleutel is geen testmodus', isTestmodus({}) === false);
  ok('en null valt niet om', isTestmodus(null) === false);
  ok('spaties eromheen tellen niet mee', isTestmodus({ MOLLIE_API_KEY: '  test_abc  ' }) === true);
  ok('het woord test ergens midden in de sleutel telt niet',
    isTestmodus({ MOLLIE_API_KEY: 'live_zetest_abc' }) === false);
}

/* ══ 2 · HET NUMMER ════════════════════════════════════════════════════════ */
console.log('\nhet nummer zegt zelf uit welke reeks het komt');
{
  ok('een echt nummer heet VIS', formatNumber(2026, 7) === 'VIS-2026-0007', 'VIS-2026-0007', formatNumber(2026, 7));
  ok('een proefnummer heet PROEF', formatNumber(2026, 7, true) === 'PROEF-2026-0007', 'PROEF-2026-0007', formatNumber(2026, 7, true));
  /* Het woord staat VOORAAN, want een factuurnummer wordt overal afgekapt — in
     een lijst, in een bestandsnaam, in een mailonderwerp — en wat er dan
     overblijft is het begin. */
  ok('en het woord staat vooraan', formatNumber(2026, 7, true).startsWith('PROEF'));
  ok('isProefNummer herkent het', isProefNummer('PROEF-2026-0007') === true);
  ok('en laat een echt nummer met rust', isProefNummer('VIS-2026-0007') === false);
}

/* ══ 3 · DE MIGRATIE ═══════════════════════════════════════════════════════
   Vier tabellen, want er zijn vier soorten documenten die een nummer uit de
   reeks kunnen trekken of eraan hangen. Eén vergeten betekent dat precies dát
   soort alsnog een echt nummer opsoupeert. */
console.log('\nde migratie raakt alles wat een nummer kan trekken');
{
  const m = lees('migrations/0046-proefbestellingen.sql');
  for (const tabel of ['orders', 'invoices', 'subscriptions', 'subscription_invoices', 'credit_notes']) {
    ok(`0046 zet testmodus op ${tabel}`,
      new RegExp(`ALTER TABLE ${tabel}\\s+ADD COLUMN testmodus`).test(m), 'ALTER', 'ontbreekt');
  }
  ok('en de standaard is 0, niet NULL', !/testmodus INTEGER(?!\s+NOT NULL DEFAULT 0)/.test(m));

  /* schema.sql is het recept voor herstel na een storing. Loopt dat achter op de
     migraties, dan is de hersteldatabase stil anders dan de echte — dat gat is
     op 23 augustus 2026 al een keer gevonden en staat in de kop van schema.sql
     beschreven. Dus: wat 0046 doet, moet daar ook staan. */
  const schema = lees('schema.sql');
  for (const tabel of ['orders', 'invoices', 'subscriptions', 'subscription_invoices', 'credit_notes']) {
    ok(`  en schema.sql kent hem ook op ${tabel}`,
      new RegExp(`ALTER TABLE ${tabel}\\s+ADD COLUMN testmodus`).test(schema), 'ALTER', 'ontbreekt');
  }
}

/* ══ 4 · WAAR DE STAND WORDT VASTGELEGD ════════════════════════════════════ */
console.log('\nde stand wordt vastgelegd bij het aannemen, niet bij het lezen');
{
  const order = lees('functions/api/order.js');
  ok('order.js haalt isTestmodus binnen', /import \{[^}]*isTestmodus[^}]*\} from '\.\.\/\.\.\/src\/lib\/mollie\.js'/.test(order));
  ok('en zet het merk op de bestelling',
    /UPDATE orders SET testmodus = 1 WHERE id = \?1/.test(order), 'UPDATE', 'ontbreekt');
  /* ALLEEN IN TESTMODUS. Met een live_-sleutel hoort er geen tweede schrijfactie
     te zijn — geen extra ronde naar D1 op de drukste route van de site. */
  ok('  alleen als de sleutel dat zegt', /if \(orderId && isTestmodus\(env\)\) \{/.test(order));
  /* EN NIET IN DE INSERT. Die heeft drie lagen terugval voor ontbrekende
     migraties; er een vierde bij bouwen betekent dat het invoegen van een ECHTE
     bestelling kan struikelen over een kolom die alleen voor proeven bestaat. */
  ok('  en niet in de INSERT zelf', !/INSERT INTO orders[^`]*testmodus/.test(order));

  const sub = lees('src/lib/subscription.js');
  ok('een abonnement krijgt het merk bij het afsluiten',
    /INSERT INTO subscriptions[\s\S]{0,400}testmodus/.test(sub), 'in de INSERT', 'ontbreekt');
  ok('  uit dezelfde bron', /isTestmodus\(env\) \? 1 : 0/.test(sub));
}

/* ══ 5 · DE CREDITNOTA ERFT ════════════════════════════════════════════════
   Geen eigen bron, en dat is met opzet: een creditnota op een proeffactuur kán
   niet echt zijn, en een die dat wél beweert zou een negatief bedrag in een
   echte boekhouding zetten dat nergens een tegenboeking heeft. */
console.log('\neen creditnota erft de reeks van zijn factuur');
{
  const inv = lees('src/lib/invoice.js');
  ok('de nota leest de stand van de factuur',
    /const proef = Number\(invoice\.testmodus\) === 1;/.test(inv), 'invoice.testmodus', 'ontbreekt');
  ok('en trekt zijn nummer uit diezelfde reeks',
    /const seq = await nextNumber\(env, year, proef\);[\s\S]{0,300}INSERT INTO credit_notes/.test(inv),
    'nextNumber met proef', 'de reeks wordt niet doorgegeven');
  /* En het merk komt ook op de rij terecht, zodat een lijst van creditnota's niet
     hoeft te joinen om te weten wat ze in handen heeft. */
  ok('  en zet het merk op de nota', /INSERT INTO credit_notes[\s\S]{0,400}testmodus/.test(inv));
}

/* ══ 6 · OP HET SCHERM ═════════════════════════════════════════════════════
   Een merk dat alleen in de database staat, is geen merk: de hele reden dat het
   bestaat is dat Lucas straks door tientallen proefbestellingen heen kijkt. */
console.log('\nje ziet het zonder te klikken');
{
  const admin = lees('src/lib/admin.js');
  ok('de lijst leest de kolom mee', /COALESCE\(testmodus, 0\) AS testmodus/.test(admin));
  /* COALESCE, want een database die achterloopt op 0046 hoort een lege lijst te
     tonen en geen foutpagina. */
  ok('de regel draagt een proefmerk', /or-let is-proef/.test(admin));
  ok('en dat merk staat NAAST de andere, niet in plaats ervan',
    /\$\{proefmerk\}\$\{merkteken\}/.test(admin), 'allebei', 'één van de twee');
  ok('admin.css kent het merk', /\.or-let\.is-proef/.test(lees('public/admin.css')));

  ok('er is een opruimroute', /path === '\/admin\/proef\/opruimen'/.test(admin));
  /* VERBERGEN EN NIET VERWIJDEREN. Een proefbestelling staat op 'paid' — met
     testgeld, maar de kolom zegt betaald — dus zou een opruimknop die verwijdert
     precies de bewaarplichtcontrole omzeilen die er staat om een échte betaalde
     bestelling te beschermen. Zie het blok boven handleOrderCancel(). */
  ok('en die VERBERGT, hij verwijdert niet',
    /handleProefOpruimen[\s\S]{0,1800}UPDATE orders SET hidden_at = datetime\('now'\) WHERE testmodus = 1/.test(admin),
    'UPDATE hidden_at', 'ontbreekt');
  ok('  en raakt geen enkele DELETE aan',
    !/handleProefOpruimen[\s\S]{0,1800}DELETE FROM/.test(admin), 'geen DELETE', 'er staat een DELETE');
  ok('de knop telt wat er op te ruimen valt', /const proefZichtbaar = /.test(admin));
  ok('  en verschijnt niet als dat er niet is', /\$\{proefZichtbaar \? `<form/.test(admin));
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
