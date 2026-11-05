/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * KAN EEN KLANT GRATIS SLOTS KRIJGEN?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas, 30 augustus 2026: *"controleer de gehele betrouwbaarheid van het systeem
 * en dat klanten niet via code of een andere weg credits gratis erbij kunnen
 * krijgen. Uiteindelijk merk ik dat zelf natuurlijk op omdat het handwerk is,
 * maar het gaat me wel veel tijd en gedoe kosten."*
 *
 * Dat laatste is waarom dit bestand bestaat. Het gaat hier niet om een systeem
 * dat leeggeroofd wordt — het gaat om de uren die het kost om uit te zoeken
 * waarom de administratie niet klopt, en om het feit dat je een fout die één keer
 * per kwartaal gebeurt achteraf niet meer kunt reconstrueren.
 *
 * ── DE VIER WEGEN OMHOOG, EN WIE ZE MAG BELOPEN ────────────────────────────
 *
 *   grantSlots()               alleen de Mollie-webhook, op een betaling die
 *                              wij bij Mollie zelf ophalen
 *   geefSlotTerug()            losmaken, weghalen, en het annuleren van een
 *                              bestelling door de studio (die drie liepen over
 *                              de wachtrij; zie de noot hieronder)
 *   handleSlotCorrectie()      alleen /admin, achter sessie én Origin
 *   verbruikSlot() met -n      bestaat niet; het aantal wordt afgekapt op 0
 *
 * Wat hieronder wordt beproefd is niet of die functies kloppen — dat doet
 * tests/slots.test.mjs — maar of ze langs een omweg te bereiken zijn, en of de
 * RACE tussen klant en studio ergens een gat laat.
 *
 * ── HET GAT DAT DEZE RONDE OPLEVERDE ────────────────────────────────────────
 *
 * Ja, er was er een, en hij zat precies op de naad tussen die twee:
 *
 *   1 · de klant zet vijf items vast;
 *   2 · Lucas drukt op "start deze week" — de lijst is gelezen, taken_at staat
 *       nog niet;
 *   3 · de klant drukt in datzelfde ogenblik op "losmaken".
 *
 * De oude queueUnlock() peilde taken_at met een SELECT en gaf daarna het slot
 * terug. Een tel later stond het item in een bestelling die gemaakt ging worden:
 * product gemaakt, slot terug, en niets dat het meldt. Dezelfde weg lag open via
 * "weghalen", dat eerst losmaakte en pas daarna probeerde te verwijderen.
 *
 * Beide voorwaarden staan sinds vandaag IN de UPDATE, en queueTakeIds() pakt
 * alleen nog op wat op dát moment nog vastgezet is. De database beslist, niet
 * de peiling ervoor.
 *
 * ── EN DAT GAT BESTAAT NIET MEER — 5 november 2026 ──────────────────────────
 *
 * De wachtrij zelf is weg (levering 69, §17 punt 14): queueAdd, queueLock,
 * queueUnlock, queueRemove, queueTakeIds, queueUntakeIds en loadQueue. Het
 * weeksysteem bestaat sinds 8 oktober niet meer en niets riep ze nog aan. De
 * toetsen op losmaken, weghalen, oppakken en "de lijst van een ander" zijn
 * daarmee vervallen; wat hieronder blijft zijn de wegen die nog bestaan.
 */
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { createSubscriptionRow, activateSubscription } from '../src/lib/subscription.js';
import { grantSlots, slotBalans, verbruikSlot, geefSlotTerug } from '../src/lib/slots.js';
import { PLAN_PRODUCTS, PLAN_CREDITS } from '../src/data/pricing.js';
import { onRequestPost } from '../functions/api/webhook/mollie.js';

let goed = 0; let totaal = 0;
function ok(naam, kreeg, verwacht = true) {
  totaal += 1;
  const isGoed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (isGoed) goed += 1;
  console.log(` ${isGoed ? 'ok  ' : 'FAIL'} ${String(naam).padEnd(62)}${isGoed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
if (mislukt.length) { console.error('schema kon niet geladen worden:', mislukt); process.exit(1); }
const env = { DB: d1(db) };

db.exec("INSERT INTO customers (id, email, brand) VALUES (1, 'mara@volt.test', 'VOLT')");
db.exec("INSERT INTO customers (id, email, brand) VALUES (2, 'dief@ander.test', 'ANDER')");
/* Hier stond zetLook() voor beide klanten: queueLock() weigerde zonder vaste
   look. Die is weg (levering 69), en niets hieronder leest de look. */
const { row: sub } = await createSubscriptionRow(env, { customerId: 1, planId: 'starter', termId: 'monthly', windowDay: 8 });
await activateSubscription(env, sub.id);
const maand = new Date().toISOString().slice(0, 7);
await grantSlots(env, sub.id, maand, 'starter');

/* Sinds 19 september 2026 is er één creditsaldo en niet meer een rij per soort
   — zie de kop bij CREDIT_KIND in slots.js. De misbruikvragen die deze toets
   stelt zijn woordelijk dezelfde gebleven; alleen de eenheid is fijner. */
const saldo = async () => (await slotBalans(env, sub.id, 1)).find((b) => b.kind === 'credits');

console.log('de klant kan het aantal niet zelf opdrijven');
{
  const start = (await saldo()).toegekend;
  /* Nul en negatief. `verbruikSlot(-3)` zou, als het aantal niet werd afgekapt,
     `used = used + -3` doen en dus SLOTS TERUGGEVEN via de verbruikkant. */
  ok('nul verbruiken doet niets', await verbruikSlot(env, sub.id, 1, 'credits', 0), 0);
  ok('een negatief aantal ook niet', await verbruikSlot(env, sub.id, 1, 'credits', -3), 0);
  ok('en het saldo staat er ongewijzigd bij', (await saldo()).verbruikt, 0);

  /* En de andere kant: teruggeven wat nooit is uitgegeven. De UPDATE draagt
     `used >= ?4`, dus dit kan het verbruik niet onder nul duwen. */
  ok('teruggeven zonder verbruik geeft niets terug', await geefSlotTerug(env, sub.id, 1, 'credits', 5), 0);
  ok('het verbruik blijft nul', (await saldo()).verbruikt, 0);
  ok('en het toegekende is niet gegroeid', (await saldo()).toegekend, start);

  /* Meer vastzetten dan er is. De UPDATE draagt `used + ?4 <= granted`. */
  ok('meer verbruiken dan er is, boekt alleen wat er is',
    await verbruikSlot(env, sub.id, 1, 'credits', PLAN_CREDITS.starter + 5), PLAN_CREDITS.starter);
  ok('en daarna is er niets meer', (await saldo()).saldo, 0);
  await geefSlotTerug(env, sub.id, 1, 'credits', PLAN_CREDITS.starter);
}

/* ── LOSMAKEN, WEGHALEN, OPPAKKEN EN "DE LIJST VAN EEN ANDER" STONDEN HIER ──
   Dat losmaken en weghalen maar één keer credits teruggeven, dat een concept
   niet opgepakt wordt, en dat klant 2 niet bij de lijst van klant 1 kan
   (queueUnlock, queueRemove, queueTakeIds, queueUntakeIds, queueLock, loadQueue).
   Weg sinds 5 november 2026 (levering 69, §17 punt 14), met de functies zelf:
   het weeksysteem bestaat sinds 8 oktober niet meer en niets riep ze nog aan.
   Dat teruggeven niet onder nul kan, staat hierboven op geefSlotTerug() zelf.

   "De race tussen losmaken en de week starten" was al weg met het weeksysteem
   (ronde 10, 8 oktober 2026): er is geen week meer om te starten. */

console.log('\neen verzonnen betaling levert geen slots op');
{
  /* De webhook krijgt alleen een ID binnen en haalt de betaling daarna ZELF bij
     Mollie op met onze sleutel. Wie een POST verzint, verzint dus hooguit een id
     dat bij ons niets oplevert. Hier geeft de nep-Mollie een 404 terug. */
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"status":404}', { status: 404 });
  const webhookEnv = { DB: d1(db), MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123' };
  const voor = (await saldo()).toegekend;
  const res = await onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'id=tr_VERZONNEN0000000000000',
    }), env: webhookEnv, waitUntil() {},
  });
  ok('de webhook kent hem niet', res.status >= 400 || res.status === 200, true);
  ok('en er is niets toegekend', (await saldo()).toegekend, voor);

  /* En een POST zonder geldig id komt niet eens bij Mollie. */
  const res2 = await onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'id=<script>',
    }), env: webhookEnv, waitUntil() {},
  });
  ok('een onzin-id wordt geweigerd voordat er iets gebeurt', res2.status, 400);
  ok('en ook dan is er niets toegekend', (await saldo()).toegekend, voor);
  globalThis.fetch = echteFetch;
}

console.log('\nde adminknoppen zitten achter de adminpoort');
{
  const { adminPost } = await import('../src/lib/admin.js');
  const voor = (await saldo()).toegekend;
  /* Geen sessiecookie: de router hoort af te slaan vóór de handler. */
  const res = await adminPost({
    request: new Request('https://visuails.com/admin/customers/1/slots', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', origin: 'https://visuails.com' },
      body: new URLSearchParams({ kind: 'complete', delta: '50', reason: 'gratis' }).toString(),
    }), env, waitUntil() {},
  });
  /* 303 naar /admin/login en NIET naar de klantpagina. Het verschil telt: een
     303 terug naar #week zou betekenen dat de handler gelopen heeft. */
  ok('zonder admin-sessie gaat het naar de inlogpagina',
    [res.status, res.headers.get('location')], [303, '/admin/login']);
  ok('en het aantal is niet gegroeid', (await saldo()).toegekend, voor);
  ok('er staat ook geen regel in het adminlogboek',
    db.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE action LIKE 'plan-slots-correctie%'").get().n, 0);
}

console.log('\nde voorwaarden staan in de UPDATE zelf, niet alleen in de peiling ervoor');
{
  /* ── WAAROM DIT EEN BRONCONTROLE IS EN GEEN GEDRAGSCONTROLE ───────────────
   *
   * Gevonden op 30 augustus 2026 met een mutatieronde: draai de drie
   * voorwaarden hieronder uit de SQL en ALLE 81 suites blijven groen. Dat is
   * geen tekort van die suites — het is de aard van wat hier beschermd wordt.
   * Boven elke UPDATE staat een SELECT die hetzelfde nagaat, dus in één draad
   * gedraagt de code zich identiek. Het verschil bestaat alleen in het ogenblik
   * tussen die twee stappen, en dat ogenblik is met een test niet na te bootsen
   * zonder de database te laten wachten.
   *
   * Dus wordt hier vastgelegd waar de voorwaarde STAAT. Haalt iemand hem later
   * weg omdat "de SELECT hierboven het al doet" — precies de redenering die het
   * gat de eerste keer maakte — dan valt dit om en staat in de naam waarom.
   *
   * Het commentaar gaat er eerst af: de reden dat deze regels er staan, staat
   * in dat commentaar beschreven, en een test die daarop matcht toetst of
   * iemand het heeft opgeschreven in plaats van of het er staat. Dat is in dit
   * project al acht keer misgegaan. */
  const zonderUitleg = (t) => t
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
  const { readFileSync } = await import('node:fs');
  const lees = (r) => zonderUitleg(readFileSync(new URL(r, import.meta.url), 'utf8'));
  const slt = lees('../src/lib/slots.js');
  const adm = lees('../src/lib/admin.js');

  /* De drie voorwaarden uit de mutatieronde (losmaken toetst taken_at in de
     UPDATE, oppakken eist locked_at, weghalen is een DELETE … RETURNING) stonden
     op plan_queue in subscription.js. Die SQL is weg met de wachtrij (levering 69,
     5 november 2026, §17 punt 14): het weeksysteem bestaat sinds 8 oktober niet
     meer en niets riep hem aan. Wat blijft zijn de voorwaarden op het saldo. */
  ok('verbruiken kan in de database niet over het toegekende heen',
    /UPDATE subscription_slots SET used = used \+ \?4[\s\S]{0,200}?used \+ \?4 <= granted/.test(slt), true);
  ok('teruggeven kan niet onder nul',
    /UPDATE subscription_slots SET used = used - \?4[\s\S]{0,200}?used >= \?4/.test(slt), true);
  /* Sinds het creditboek (ronde B, 8 oktober 2026): de bijstelling is een
     regel in credit_boek. Eraf gaat via boekAf() (oudste eerst, in één batch),
     en de tabel zelf houdt elke partij op nul of meer (CHECK rest >= 0). */
  ok('de adminbijstelling haalt eraf via het creditboek',
    /boekAf\(env, \{ customerId, aantal: -ruw/.test(adm), true);
  ok('en de database laat een partij niet onder nul zakken',
    /CHECK \(\(aantal > 0 AND rest IS NOT NULL AND rest >= 0 AND rest <= aantal/.test(lees('../schema.sql')), true);
}

/* ── EN DE VIJFDE WEG: EEN BETALING DIE DE TERMIJN NIET DEKT ───────────────
 *
 * 17 september 2026. Hierboven staat dat grantSlots() alleen bereikbaar is via
 * de Mollie-webhook, "op een betaling die wij bij Mollie zelf ophalen". Dat
 * klopte, en het was niet genoeg: de webhook keek naar het KENMERK en niet naar
 * het BEDRAG. Een betaling van € 1 die met de hand in het Mollie-dashboard wordt
 * gemaakt met `metadata.sub_ref` erin, leverde een volle maand Brand op.
 *
 * Voor bestellingen was dat gat in augustus gedicht met betalingGedekt(); voor
 * abonnementen bestond die vraag niet. Deze toets leest de bron, want de
 * uitkomst is "er gebeurt NIETS" en dat is precies wat je met een draaiende
 * webhook moeilijk kunt aanwijzen zonder de hele keten op te tuigen —
 * abo-keten.test.mjs doet dat wél, met een bedrag dat sindsdien afgeleid is in
 * plaats van ingetypt.
 */
console.log('\neen betaling die de termijn niet dekt, kent niets toe');
{
  const { readFileSync: lezen } = await import('node:fs');
  const wh = lezen(new URL('../functions/api/webhook/mollie.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  ok('het verwachte bedrag wordt bruto uitgerekend',
    /const verwacht = subRef \? subEersteBetalingBruto\(sub\) : subMaandBruto\(sub\)/.test(wh), true);
  ok('en een te lage betaling keert terug vóór de toekenning',
    /if \(verwacht > 0 && cents \+ TERMIJN_SPELING_CENT < verwacht\)[\s\S]{0,900}?return;/.test(wh), true);
  /* De volgorde is het halve punt: de controle moet vóór de INSERT in
     subscription_months staan, anders moet er iets teruggedraaid worden. */
  ok('de controle staat vóór de maandtoekenning',
    wh.indexOf('const verwacht = subRef') < wh.indexOf('INSERT INTO subscription_months'), true);
}

console.log(`\n${goed}/${totaal} geslaagd`);
process.exit(goed === totaal ? 0 : 1);
