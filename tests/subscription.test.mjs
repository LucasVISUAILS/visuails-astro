/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE SERVERKANT VAN HET ABONNEMENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * tests/plans.test.mjs bewaakt het CONTRACT: wat een plan kost, wat het toekent,
 * wanneer saldo vervalt. Dit bestand bewaakt de RIJEN — en het doet dat tegen een
 * echte SQLite met het echte schema, om de reden die in tests/lib/d1sqlite.mjs
 * staat: een fout die bestaat omdat de database iets weigert, vind je niet met
 * een database die nooit iets weigert.
 *
 * Wat hier bewezen moet worden en nergens anders kan:
 *
 *   · elke query in subscription.js is geldige SQL tegen dit schema. Een typefout
 *     in een kolomnaam is in productie een stille catch en hier een rode regel.
 *   · verbruikBoeken() kan niet over het toegekende heen. Dat is een WHERE en
 *     geen if, en het verschil is precies zichtbaar als twee bestellingen elkaar
 *     kruisen.
 *   · de wachtrij is van de KLANT. Een id van iemand anders mag er niet in, niet
 *     bij verwijderen en niet bij herschikken.
 *   · queueTake() pakt niets twee keer.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import {
  monthKey, makeSubRef, verbruikToestaan, verbruikBoeken,
  createSubscriptionRow, loadSubscription, subscriptionByRef,
  setMollieIds, activateSubscription, pauseSubscription, cancelSubscription,
  loadMonths, loadQueue, loadTaken, planState,
  queueAdd, queueRemove, queueReorder, queueTake, queueLinkOrder,
  bezetting, subscriptionShape,
} from '../src/lib/subscription.js';
import { productsFor, addMonths } from '../src/data/plans.js';

let ok_ = 0; let totaal = 0;
function ok(naam, kreeg, verwacht) {
  totaal += 1;
  const goed = JSON.stringify(kreeg) === JSON.stringify(verwacht);
  if (goed) ok_ += 1;
  console.log(` ${goed ? 'ok  ' : 'FAIL'} ${naam.padEnd(60)}${goed ? '' : ` verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(kreeg)}`}`);
}

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
console.log('het schema draait');
ok('schema.sql draait zonder mislukte statements', mislukt, []);
const env = { DB: d1(db) };

/* Twee klanten, want de helft van wat hier bewezen wordt, gaat over het verschil
   tussen "van mij" en "van iemand anders". */
db.exec("INSERT INTO customers (id, email) VALUES (1, 'een@voorbeeld.test'), (2, 'twee@voorbeeld.test')");

console.log('\neen aanvraag wordt een rij, en maar één');
const gemaakt = await createSubscriptionRow(env, { customerId: 1, planId: 'studio', termId: 'yearly', windowDay: 8 });
ok('de rij bestaat', Boolean(gemaakt.row?.id), true);
ok('en staat op pending', gemaakt.row.status, 'pending');
ok('met het gekozen plan', [gemaakt.row.plan, gemaakt.row.term], ['studio', 'yearly']);
ok('en de gekozen dag', gemaakt.row.window_day, 8);
ok('het kenmerk heeft de abonnementsvorm', /^SUB-[0-9A-Z]{4}-[0-9A-Z]{3}$/.test(gemaakt.row.ref), true);

/* DE DUBBELE KLIK. Dit is geen zeldzaam geval: een trage betaalpagina en een
   ongeduldige klant leveren hem elke week op. De partiële UNIQUE index in
   migratie 0030 hoort hem tegen te houden, en createSubscriptionRow hoort dat
   te vertalen naar "je hebt er al een" en niet naar een 500. */
const nogmaals = await createSubscriptionRow(env, { customerId: 1, planId: 'brand', termId: 'monthly' });
ok('een tweede aanvraag levert geen tweede abonnement', nogmaals.bestaat, true);
ok('en geeft het bestaande terug', nogmaals.row.id, gemaakt.row.id);
ok('het plan is niet stiekem veranderd', nogmaals.row.plan, 'studio');

ok('een onbekend plan gooit',
  await createSubscriptionRow(env, { customerId: 2, planId: 'goud', termId: 'monthly' }).then(() => false, () => true), true);
ok('een onbekende termijn ook',
  await createSubscriptionRow(env, { customerId: 2, planId: 'studio', termId: 'kwartaal' }).then(() => false, () => true), true);

console.log('\nterugvinden kan op twee manieren, en allebei moeten ze werken');
const geladen = await loadSubscription(env, 1);
ok('op klant', geladen.id, gemaakt.row.id);
ok('op kenmerk — hoe de eerste betaling thuiskomt', (await subscriptionByRef(env, gemaakt.row.ref)).id, gemaakt.row.id);
ok('een onbekend kenmerk geeft niets', await subscriptionByRef(env, 'SUB-XXXX-XXX'), null);
ok('en een leeg kenmerk ook', await subscriptionByRef(env, ''), null);
ok('een klant zonder abonnement geeft niets', await loadSubscription(env, 2), null);

console.log('\nde mollie-ids komen op verschillende momenten binnen');
await setMollieIds(env, gemaakt.row.id, { customerId: 'cst_1' });
await setMollieIds(env, gemaakt.row.id, { mandateId: 'mdt_1' });
/* COALESCE en niet een gewone SET: de tweede aanroep mag de eerste niet wissen.
   Zonder dat zou het mandaat de klant-id overschrijven met null en zou de
   maandelijkse afschrijving nergens meer heen kunnen. */
const naIds = await loadSubscription(env, 1);
ok('de eerste id blijft staan als de tweede komt', [naIds.mollie_customer_id, naIds.mollie_mandate_id], ['cst_1', 'mdt_1']);
await setMollieIds(env, gemaakt.row.id, { subscriptionId: 'sub_1' });
ok('en de derde komt erbij', (await loadSubscription(env, 1)).mollie_subscription_id, 'sub_1');

console.log('\nde levensloop kent één richting');
ok('pending wordt active', (await activateSubscription(env, gemaakt.row.id)).status, 'active');
ok('active wordt paused', (await pauseSubscription(env, gemaakt.row.id, 'payment_failed')).status, 'paused');
ok('paused wordt weer active', (await activateSubscription(env, gemaakt.row.id)).status, 'active');
ok('started_at blijft de eerste keer', Boolean((await loadSubscription(env, 1)).started_at), true);

console.log('\nhet saldo is een som over echte rijen');
const maand = monthKey();
const vorige = '2000-01';
db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used, clips_granted, clips_used) VALUES (?, ?, ?, ?, ?, ?)')
  .run(gemaakt.row.id, vorige, 12, 7, 2, 1);
db.prepare('INSERT INTO subscription_months (subscription_id, month, granted, used, clips_granted, clips_used) VALUES (?, ?, ?, ?, ?, ?)')
  .run(gemaakt.row.id, maand, 12, 0, 2, 0);

const maanden = await loadMonths(env, gemaakt.row.id, 'yearly');
ok('de maanden komen oudste-eerst terug — de volgorde die available() verwacht',
  maanden.map((m) => m.month), [vorige, maand]);

const st = await planState(env, 1);
ok('deze maand telt als betaald zodra de rij er is', st.betaald, true);
ok('vijf schuiven door en twaalf komen erbij', st.saldo, 17);
ok('het abonnement is actief', st.actief, true);
ok('en de vorm noemt het plan', st.plan, 'studio');

console.log('\nverbruik kan niet over het saldo heen — en het saldo is inclusief wat doorschoof');
/* HET PLAFOND IS 17 EN NIET 12. Twaalf van deze maand plus vijf die doorschoven.
   Met `granted` als grens waren die vijf zichtbaar op het dashboard en niet uit
   te geven — precies het soort verschil tussen scherm en werkelijkheid dat een
   klant terecht als bedrog leest. */
const plafond = st.toegekend;
ok('het plafond is de som en niet de maand', plafond, 17);
ok('binnen het saldo gaat door', await verbruikBoeken(env, gemaakt.row.id, maand, 5, plafond), 5);
/* Vijftien erbij zou twintig van zeventien maken. De WHERE weigert dat, en de
   functie geeft nul terug in plaats van stilletjes over de grens te schrijven —
   dan rekent de bestelling het meerdere op de ladder af, wat de bedoeling is. */
ok('over het saldo heen gaat niet', await verbruikBoeken(env, gemaakt.row.id, maand, 15, plafond), 0);
ok('en heeft niets veranderd',
  db.prepare('SELECT used FROM subscription_months WHERE subscription_id = ? AND month = ?').get(gemaakt.row.id, maand).used, 5);
/* WAT DOORSCHOOF, IS ECHT UIT TE GEVEN. Twaalf erbij komt op zeventien: boven de
   twaalf van deze maand, en precies op het saldo. */
ok('de doorgeschoven producten zijn uit te geven', await verbruikBoeken(env, gemaakt.row.id, maand, 12, plafond), 12);
ok('daarna niets meer', await verbruikBoeken(env, gemaakt.row.id, maand, 1, plafond), 0);
ok('nul boeken is geen fout', await verbruikBoeken(env, gemaakt.row.id, maand, 0, plafond), 0);
ok('een maand die niet bestaat, boekt niets', await verbruikBoeken(env, gemaakt.row.id, '1999-01', 3, plafond), 0);
/* Zonder plafond valt hij terug op `granted` — de veilige kant. Hij mag nooit
   ongelimiteerd afschrijven omdat een aanroeper een argument vergat. */
ok('zonder plafond schrijft hij niet ongelimiteerd af',
  await verbruikBoeken(env, gemaakt.row.id, maand, 1), 0);

const na = await planState(env, 1);
ok('het saldo is op', na.saldo, 0);
ok('en het verbruik staat er', na.verbruikt, 17);
ok('meer bestellen dan het saldo is geen fout maar een rest',
  verbruikToestaan(na, 4), { uitSaldo: 0, rest: 4, reden: '' });

console.log('\nclips zijn een tweede budget en geen deel van het eerste');
{
  /* Een clip is geen product en een product is geen clip. In één teller zou een
     merk zijn hele plan aan video kunnen opmaken, of zou een ongebruikte clip als
     product worden geteld. Zie de noot bij clips_granted in migratie 0030. */
  const st2 = await planState(env, 1);
  ok('de clips hebben hun eigen saldo', st2.clips.toegekend, 3);
  ok('en hun eigen verbruik', st2.clips.verbruikt, 0);
  /* Het productenbudget is intussen helemaal op — de clips staan daar los van. */
  ok('een leeg productensaldo raakt de clips niet', st2.saldo, 0);
  ok('en de clips zijn nog te besteden', st2.clips.saldo, 3);

  ok('een clip boeken raakt de producten niet',
    await verbruikBoeken(env, gemaakt.row.id, maand, 2, st2.clips.toegekend, 'clips'), 2);
  const st3 = await planState(env, 1);
  ok('de clips zijn geboekt', st3.clips.verbruikt, 2);
  ok('en het productenverbruik staat stil', st3.verbruikt, 17);
  ok('over het clipsaldo heen gaat niet',
    await verbruikBoeken(env, gemaakt.row.id, maand, 5, st3.clips.toegekend, 'clips'), 0);
  /* Een onbekende soort boekt NIETS. De kolomnamen komen uit een vaste tabel en
     niet uit het argument — een parameter die rechtstreeks in de SQL belandt, is
     een injectie die op een dag door een formulierveld wordt gevuld. */
  ok('een onbekende soort boekt niets',
    await verbruikBoeken(env, gemaakt.row.id, maand, 1, 99, 'granted = 0 --'), 0);
  ok('en heeft niets aangeraakt',
    db.prepare('SELECT used, clips_used FROM subscription_months WHERE subscription_id = ? AND month = ?')
      .get(gemaakt.row.id, maand).used, 17);

  ok('verbruikToestaan kent het clipsaldo',
    verbruikToestaan({ actief: true, betaald: true, saldo: 0, clips: { saldo: 1 } }, 2, 'clips'),
    { uitSaldo: 1, rest: 1, reden: '' });
}

console.log('\nwat doorschuift, vervalt op een zichtbare maand');
{
  /* Lucas koos op 17 augustus voor doorschuiven MÉT een zichtbare afloopmaand,
     tegenover een harde reset op de 1e. Een maand en geen afteller op de dag: een
     afteller maakt de laatste dag de drukste, en 94 producten in drie dagen is 31
     per dag terwijl er 15 begeleid kunnen. */
  const st4 = await planState(env, 1);
  ok('er is een vervalregel', st4.vervalt.length, 1);
  ok('hij noemt de maand van herkomst', st4.vervalt[0].from, vorige);
  ok('en hoeveel er uit die maand meedoet', st4.vervalt[0].left, 5);
  /* Jaartermijn: drie maanden doorschuiven, dus wat in maand M overblijft, is tot
     en met M+3 te gebruiken. */
  ok('en tot en met welke maand', st4.vervalt[0].until, addMonths(vorige, 3));
  ok('het doorgeschoven aantal is de som van de regels', st4.doorgeschoven, 5);
}

console.log('\nde wachtrij is van de klant');
const a = await queueAdd(env, 1, { name: 'Wintertrui zwart', note: 'op straat' });
const b = await queueAdd(env, 1, { name: 'Sjaal' });
const c = await queueAdd(env, 1, { name: 'Handschoenen' });
ok('drie items', (await loadQueue(env, 1)).length, 3);
ok('en ze staan achter elkaar', (await loadQueue(env, 1)).map((q) => q.name), ['Wintertrui zwart', 'Sjaal', 'Handschoenen']);
ok('een leeg item wordt niet toegevoegd', await queueAdd(env, 1, { name: '   ' }), null);

await queueAdd(env, 2, { name: 'Van iemand anders' });
ok('de rij van de andere klant staat los', (await loadQueue(env, 2)).map((q) => q.name), ['Van iemand anders']);

ok('herschikken werkt', await queueReorder(env, 1, [c.id, a.id, b.id]), 3);
ok('en de volgorde klopt', (await loadQueue(env, 1)).map((q) => q.name), ['Handschoenen', 'Wintertrui zwart', 'Sjaal']);

/* WAT NIET MEEGESTUURD IS, VERDWIJNT NIET. Een half gepost formulier mag geen
   item opeten; het belandt achteraan en dat is te zien. */
ok('een onvolledige volgorde laat de rest staan', await queueReorder(env, 1, [b.id]), 3);
ok('en zet hem vooraan', (await loadQueue(env, 1)).map((q) => q.name), ['Sjaal', 'Handschoenen', 'Wintertrui zwart']);

const vreemd = (await loadQueue(env, 2))[0];
ok('een id van een andere klant raakt de volgorde niet', await queueReorder(env, 1, [vreemd.id]), 3);
ok('en die klant houdt zijn eigen item', (await loadQueue(env, 2)).length, 1);
ok('verwijderen van een vreemd item lukt niet', await queueRemove(env, 1, vreemd.id), false);
ok('verwijderen van een eigen item wel', await queueRemove(env, 1, b.id), true);
ok('en dan zijn er twee over', (await loadQueue(env, 1)).length, 2);

console.log('\nophalen gebeurt één keer');
const gepakt = await queueTake(env, 1, 1);
ok('de bovenste is gepakt', gepakt.map((q) => q.name), ['Handschoenen']);
ok('en staat niet meer in de open rij', (await loadQueue(env, 1)).map((q) => q.name), ['Wintertrui zwart']);
/* Een taak die twee keer draait — een herstart, een handmatige aanroep — mag
   niet twee keer dezelfde bestelling opleveren. */
ok('een tweede keer pakt niet hetzelfde', (await queueTake(env, 1, 1)).map((q) => q.name), ['Wintertrui zwart']);
ok('en dan is de rij leeg', await queueTake(env, 1, 5), []);
ok('nul pakken is geen fout', await queueTake(env, 1, 0), []);

db.exec("INSERT INTO orders (id, ref, service, email, status) VALUES (900, 'VIS-TEST-001', 'complete', 'een@voorbeeld.test', 'received')");
ok('de bestelling wordt aan het item gehangen', await queueLinkOrder(env, [gepakt[0].id], 900), 1);
const opgehaald = await loadTaken(env, 1);
ok('en verschijnt in wat is opgebouwd', opgehaald.find((t) => t.id === gepakt[0].id).order_ref, 'VIS-TEST-001');

console.log('\nde bezetting wordt geteld en niet aangenomen');
const bez = await bezetting(env);
ok('één studio', bez.per.studio, 1);
ok('en de producten daarvan', bez.producten, productsFor('studio'));

console.log('\nopzeggen is het einde, en maakt plaats voor een nieuw');
ok('opzeggen lukt', (await cancelSubscription(env, gemaakt.row.id, 'customer')).status, 'cancelled');
ok('en dan is er geen lopend abonnement meer', await loadSubscription(env, 1), null);
/* De partiële index dekt alleen active/pending — een opgezegd abonnement mag een
   nieuw abonnement niet voor altijd blokkeren. */
const opnieuw = await createSubscriptionRow(env, { customerId: 1, planId: 'starter', termId: 'monthly' });
ok('een nieuw abonnement mag', opnieuw.bestaat, false);
ok('een late webhook zet een opgezegd abonnement niet terug aan',
  await activateSubscription(env, gemaakt.row.id), null);
ok('en een opgezegd abonnement pauzeert niet', await pauseSubscription(env, gemaakt.row.id), null);

console.log('\nde vorm die een mail of een paneel leest');
const vorm = subscriptionShape(opnieuw.row);
ok('kent het kenmerk', vorm.ref, opnieuw.row.ref);
ok('en het aantal producten', vorm.products, productsFor('starter'));
ok('en de dienst', vorm.service, 'complete');
ok('zonder abonnement is de vorm niets', subscriptionShape(null), null);

console.log('\nhet dashboard zegt niet wat er aan de beurt is, en tekent zijn meter');
{
  /* ALLEEN DE CODE, NIET DE UITLEG. Vijfde keer dit jaar dat een regex op de
     eigen verantwoording aansloeg: de kop van planQueueH LEGT UIT waarom er
     niet "wat er aan de beurt is" staat, en zet die zin dus letterlijk in het
     bestand. Dezelfde helper en dezelfde reden als in tests/ratio.test.mjs. */
  const zonderUitleg = (src) => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  const acc = zonderUitleg(readFileSync(new URL('../src/lib/account.js', import.meta.url), 'utf8'));

  /* Lucas, 17 augustus: "Ik wil niet dat VISUAILS zegt wat er aan de beurt is."
     De lijst is van de klant; een kop die anders klinkt, is een belofte die het
     systeem niet waarmaakt en niet wil waarmaken. */
  ok('geen kop die suggereert dat wij de volgorde bepalen',
    /aan de beurt/i.test(acc), false);

  /* DE SALDOMETER IS EEN TEKENING EN GEEN OPMAAK. Onder style-src 'self' valt
     style-src-attr terug op 'self' en weigert de browser het attribuut — dan
     staat er een lege doos waar het saldo hoort. Twee keer eerder dit jaar
     dezelfde val (swatch, de beeldverhoudingen). */
  ok('de meter zet geen breedte in een style-attribuut',
    /style="width/.test(acc), false);
  /* De meter is een rij vakjes geworden naar het voorbeeld van de mockup: vijf
     lege vakjes zijn vijf dingen die je nog kunt laten maken, waar een balk op
     58% een getal is waar niemand iets mee doet. */
  ok('en tekent vakjes', /class="\$\{klasse\}"/.test(acc), true);
  /* HET DERDE SOORT VAKJE IS HET HELE PUNT. Doorschuiven mét een zichtbare
     afloopmaand was de keuze van 17 augustus; zonder een eigen vakje is het
     verschil tussen "van deze maand" en "vervalt volgende maand" onzichtbaar. */
  ok('en kent een apart vakje voor wat doorgeschoven is', /pip-roll/.test(acc), true);
  /* Boven een bovengrens is tellen niet meer wat iemand doet: Brand kan met
     doorschuiven op 120 producten komen, en 120 vakjes zijn een muur. */
  ok('en valt boven een bovengrens terug op getallen', /PIP_MAX/.test(acc), true);

  /* De drie knoppen per regel zijn drie losse formulieren. In één formulier zou
     één submit alle drie de bedoelingen tegelijk versturen. */
  ok('elke lijstknop heeft zijn eigen formulier',
    (acc.match(/action="\/account\/plan\/queue"/g) || []).length >= 4, true);

  /* Opzeggen moet kunnen. Wie er niet uit kan, stapt naar zijn bank, en dan is
     het een stornering in plaats van een beëindiging. */
  ok('opzeggen staat op de pagina', /action="\/account\/plan\/cancel"/.test(acc), true);
  ok('en accepteert het woord in beide talen',
    /'CANCEL' && \w+ !== 'OPZEGGEN'/.test(acc), true);

  const css = zonderUitleg(readFileSync(new URL('../public/account.css', import.meta.url), 'utf8'));
  ok('de css kent de drie soorten vakje',
    /\.pip \{/.test(css) && /\.pip-op/.test(css) && /\.pip-roll/.test(css), true);

  /* DE BESTELKNOP NAAST HET GETAL. Uit de mockup: het getal roept een vraag op en
     het antwoord hoort op dezelfde kaart. */
  ok('het saldo heeft een bestelknop naast zich', /saldo-kop/.test(acc) && /saldo-kop/.test(css), true);
  /* TWEE METERS EN NIET DRIE. De mockup had catalog, lifestyle en video naast
     elkaar; een plan geeft complete producten (catalogset én carousel) plus clips,
     dus zijn er twee budgetten. Drie balken zouden suggereren dat je catalog kunt
     opmaken en lifestyle overhoudt. */
  ok('de clips hebben hun eigen meter', /planClipsH/.test(acc), true);
  /* De vaste look staat er als FEITEN en niet alleen als een link: het abonnement
     werkt omdat die look een afspraak is, en dan moet hij te lezen zijn. */
  ok('wat vastligt staat er uitgeschreven', /brandKitRegels/.test(acc), true);
  /* En de nudge verdwijnt zodra het af is — een nudge die blijft staan, is een
     banner. */
  ok('de nudge hangt aan wat er nog open is', /bkOnaf\.length/.test(acc), true);
}

console.log(`\n${ok_}/${totaal} geslaagd`);
if (ok_ !== totaal) process.exit(1);
