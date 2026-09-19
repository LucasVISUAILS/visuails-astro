/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE PLANNING EN HET BREDE DASHBOARD — 3 september 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas vroeg om "een werkend interactief planningsschema waar alle orders in
 * staan voor welke datum", een aflopende lijst rechts, en "een optie om de datum
 * te verlengen wanneer het niet lukt en ik gelijk de klant contacteer". Dit is de
 * proef daarvan, met een echte database eronder (tests/lib/d1sqlite.mjs), zodat
 * het verlengen ook echt door handleWindowMove() en de agenda heen gaat.
 *
 * Wat hier bewaakt wordt:
 *   1. /admin/planning rendert veertien dagen, en elke open bestelling staat op
 *      de dag waarop hij af moet — een vastgelegd paar op allebei zijn dagen.
 *   2. De aflopende lijst staat op volgorde van die dag, met "te laat" bovenaan.
 *   3. Verlengen vanaf de planning (back=planning) verzet het venster én landt
 *      terug op de planning met de contactknoppen, met de nieuwe datum in de
 *      tekst en in de taal van de bestelling.
 *   4. Het dashboard is één regel per bestelling; de handelingen staan er nog
 *      (zelfde formulieren, zelfde routes), maar in een klapje.
 *   5. De bovenbalk staat op elk scherm en wijst het huidige scherm aan.
 *   6. De streefdag van een wachtrij-bestelling is binnenkomst + QUEUE_AIM_DAYS.
 */
import { adminGet, adminPost } from '../src/lib/admin.js';
import { hashToken } from '../src/lib/token.js';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { addDays, addOpenDays, QUEUE_AIM_DAYS, firstOfferableDay } from '../src/data/capacity.js';

let n = 0; let fouten = 0;
const check = (label, got, want) => {
  n++;
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fouten++;
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${label}${ok ? '' : `\n      kreeg ${JSON.stringify(got)}, wilde ${JSON.stringify(want)}`}`);
};

const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
check('schema.sql laadt zonder fout', mislukt.length, 0);
const token = 'planning-proef';
db.exec(`INSERT INTO admin_users (id, email, password_hash) VALUES (1, 'x@visuails.com', 'x')`);
db.prepare(`INSERT INTO admin_sessions (id, admin_id, token_hash, expires_at) VALUES (1, 1, ?, '2099-01-01T00:00:00Z')`).run(await hashToken(token));

const vandaag = new Date().toISOString().slice(0, 10);
const d = (k) => addDays(vandaag, k);
db.prepare(`INSERT INTO customers (id, email, brand, name, phone, country) VALUES (1, 'a@voorbeeld.nl', 'VOLT', 'Mara Visser', '06 12345678', 'NL'), (2, 'b@example.com', 'NOORD', 'Joris', NULL, 'DE')`).run();
const ins = db.prepare(`INSERT INTO orders (id, ref, customer_id, service, status, tier, product_count, window_start, window_end, created_at, payment_status, name, brand, email, phone, total_cents, lang)
  VALUES (?, ?, ?, 'catalog', ?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?, 10000, ?)`);
ins.run(1, 'VIS-T-0001', 1, 'in_production', 'attended', 12, d(1), d(2), `${d(-3)} 10:00:00`, 'Mara Visser', 'VOLT', 'a@voorbeeld.nl', '06 12345678', 'nl');
ins.run(2, 'VIS-T-0002', 2, 'received', 'unattended', 3, null, null, `${d(-4)} 09:00:00`, 'Joris', 'NOORD', 'b@example.com', null, 'en');
ins.run(3, 'VIS-T-0003', 1, 'received', 'unattended', 2, null, null, `${vandaag} 08:00:00`, 'Mara Visser', 'VOLT', 'a@voorbeeld.nl', null, 'nl');
ins.run(4, 'VIS-T-0004', 2, 'delivered', 'attended', 10, d(-9), d(-8), `${d(-12)} 10:00:00`, 'Joris', 'NOORD', 'b@example.com', null, 'en');

const env = { DB: d1(db) };
const get = (path) => adminGet({ request: new Request(`https://visuails.com${path}`, { headers: { cookie: `vis_admin=${token}` } }), env, waitUntil() {} });
const post = (path, velden) => adminPost({
  request: new Request(`https://visuails.com${path}`, { method: 'POST', headers: { cookie: `vis_admin=${token}`, origin: 'https://visuails.com' }, body: new URLSearchParams(velden) }),
  env, waitUntil() {},
});

console.log('\n1 · het raster');
{
  const res = await get('/admin/planning');
  const h = await res.text();
  check('de planning rendert', res.status, 200);
  check('veertien dagen', (h.match(/class="pl-dag[ "]/g) || []).length, 14);
  check('vandaag is aangewezen', /pl-dag is-vandaag/.test(h), true);
  const chips1 = (h.match(/pl-chip[^"]*" href="\/admin\/orders\/1\/files"/g) || []).length;
  check('een vastgelegd paar staat op allebei zijn dagen', chips1, 2);
  check('de eerste dag van het paar is werk, de tweede is de dag dat het af moet', /is-werk[^"]*" href="\/admin\/orders\/1\/files"/.test(h) && /is-af[^"]*" href="\/admin\/orders\/1\/files"/.test(h), true);
  check('een geleverde bestelling staat er niet in', /orders\/4\/files/.test(h), false);
  check('de te late wachtrij-bestelling staat op vandaag als te laat', /is-laat[^"]*" href="\/admin\/orders\/2\/files"/.test(h), true);
}

console.log('\n2 · de aflopende lijst');
{
  const h = await (await get('/admin/planning')).text();
  const volgorde = [...h.matchAll(/<li class="pl-item[^"]*" id="order-(\d+)"/g)].map((m) => Number(m[1]));
  check('de lijst staat op volgorde van de dag: te laat, dan streefdag morgen, dan het paar', volgorde, [2, 3, 1]);
  check('het te late item zegt hoeveel dagen', /dagen te laat|gisteren — te laat/.test(h), true);
  check('de streefdag van een wachtrij-bestelling is binnenkomst + QUEUE_AIM_DAYS',
    new RegExp(`id="order-3"[\\s\\S]*?pl-item-rel">${addOpenDays(vandaag, QUEUE_AIM_DAYS) === d(1) ? 'morgen' : 'over'}`).test(h), true);
  check('elke regel heeft een klapje om te verlengen, met back=planning', (h.match(/name="back" value="planning"/g) || []).length, 3);
  check('het datumveld begint pas bij de eerste dag die te beloven is', h.includes(`min="${firstOfferableDay(vandaag, new Set())}"`), true);
  check('een klant zonder telefoonnummer krijgt geen WhatsApp-knop, wel mail', /Geen telefoonnummer bekend/.test(h) && /mailto:b%40example\.com|mailto:b@example\.com/.test(h), true);
  check('een 06-nummer wordt een wa.me-link met landcode', /https:\/\/wa\.me\/31612345678\?text=/.test(h), true);
  check('de Engelse klant krijgt Engelse tekst', /Hi%20Joris/.test(h), true);
}

console.log('\n3 · verlengen vanaf de planning');
{
  const nieuw = addDays(firstOfferableDay(vandaag, new Set()), 2);
  const res = await post('/admin/orders/1/window', { do: 'verzet', dag: nieuw, reason: 'materiaal te laat binnen', back: 'planning' });
  check('landt terug op de planning met ?verzet=', res.status === 303 && res.headers.get('location') === '/admin/planning?verzet=1', true);
  const rij = db.prepare('SELECT window_start, window_end FROM orders WHERE id = 1').get();
  check('het venster is verzet naar de gekozen dag', rij.window_start, nieuw);
  const h = await (await get('/admin/planning?verzet=1')).text();
  check('de contactkaart staat bovenaan met de nieuwe datum', new RegExp(`pl-verzet[\\s\\S]*?${nieuw} – ${rij.window_end}`).test(h), true);
  check('en de WhatsApp-tekst draagt de nieuwe datum', h.includes(encodeURIComponent(`${nieuw} – ${rij.window_end}`)), true);
  const gebeurtenis = db.prepare("SELECT note FROM order_events WHERE order_id = 1 ORDER BY id DESC LIMIT 1").get();
  check('de tijdlijn van de klant noemt het verzetten', /Venster verzet naar/.test(gebeurtenis?.note || ''), true);
  const zonder = await post('/admin/orders/1/window', { do: 'verzet', dag: addDays(nieuw, 3), reason: 'x' });
  check('zonder back=planning landt het nog steeds op de bestandenpagina', zonder.headers.get('location'), '/admin/orders/1/files');
}

console.log('\n4 · het dashboard: één regel per bestelling');
{
  const h = await (await get('/admin')).text();
  check('elke bestelling is een klapje met de regel als summary', (h.match(/<details class="or" id="order-\d+">/g) || []).length, 4);
  check('het statusformulier staat er nog, per bestelling', (h.match(/action="\/admin\/orders\/\d+\/status"/g) || []).length, 4);
  check('annuleren, verbergen en het merkmodel ook', /orders\/1\/cancel/.test(h) && /orders\/1\/hide/.test(h) && /orders\/1\/models/.test(h), true);
  check('de zijkolom toont wat eerst af moet', /db-aflopend/.test(h) && /Eerst af/.test(h), true);
  check('en linkt naar de planning', /href="\/admin\/planning"/.test(h), true);
  check('de kolomkoppen staan boven de lijst', /or-kop/.test(h), true);
}

console.log('\n5 · de bovenbalk');
{
  /* '/admin/agenda' stond hier tot 19 september 2026; die is in de planning
     opgegaan en stuurt nu door. */
  for (const [pad, key] of [['/admin', 'Dashboard'], ['/admin/planning', 'Planning'], ['/admin/customers', 'Klanten'], ['/admin/log', 'Log'], ['/admin/vat', 'Btw']]) {
    const h = await (await get(pad)).text();
    check(`${pad} draagt de balk en wijst "${key}" aan`, new RegExp(`bar-link is-active" aria-current="page">${key}<`).test(h), true);
  }
  const h = await (await get('/admin/orders/1/files')).text();
  check('de bestandenpagina draagt de balk zonder actief item', /bar-nav/.test(h) && !/is-active/.test(h), true);
}

/* ══ OPPAKKEN EN NEERZETTEN ══════════════════════════════════════════════════
 * 13 september 2026. Lucas: *"Ik zou in /admin de planning met de muis willen
 * aanpassen dus een datum van de klant interactief willen verplaatsen."*
 *
 * Slepen kan niet — dit paneel draait onder `default-src 'none'` en laadt geen
 * script; zie de noot bij `pakId` in admin.js. Wat er wel is: ?pak=<id> maakt
 * van elke dag een knop. Deze paragraaf controleert de drie dingen die daarbij
 * fout kunnen gaan, en alle drie zouden ze een datum kunnen verzetten die niet
 * had gemogen.
 */
console.log('\n5 · een bestelling oppakken en neerzetten');
{
  const zonder = await (await get('/admin/planning')).text();
  check('zonder ?pak staat er geen neerzetknop', /pl-zet-knop/.test(zonder), false);
  check('maar wel een oppak-pijltje per bestelling', /class="pl-pak"/.test(zonder), true);
  /* Een geleverde bestelling is niet op te pakken: verzetten zou een dag in de
     agenda zetten voor werk dat niet meer gaat gebeuren. handleWindowMove()
     weigert het ook, maar een knop die naar een weigering leidt hoort er niet
     te staan. */
  check('en niet bij de geleverde bestelling', (zonder.match(/pak=4\b/g) || []).length, 0);

  const met = await (await get('/admin/planning?pak=1')).text();
  check('met ?pak=1 staat de balk erboven', /pl-pakbalk/.test(met) && /VIS-T-0001/.test(met), true);
  check('en er staan neerzetknoppen', /pl-zet-knop/.test(met), true);
  check('die naar de verzetroute posten', /action="\/admin\/orders\/1\/window"/.test(met), true);
  check('met back=planning, zodat je hier terugkomt', /name="back" value="planning"/.test(met), true);

  /* De dag waar hij nu al begint, is geen bestemming. Zonder deze regel staat
     er een knop die niets doet en een regel in het logboek schrijft. */
  /* De startdag UIT DE DATABASE en niet uit de fixture: paragraaf 3 hierboven
     verzet deze bestelling twee keer, dus `d(1)` is hier allang niet meer waar.
     Een toets die zijn eigen beginwaarde aanneemt nadat een eerdere paragraaf
     hem heeft veranderd, meet iets anders dan hij zegt.

     En het raster moet de dag ook TONEN. Het raster is veertien dagen vanaf de
     maandag van deze week, en na twee keer verzetten ligt deze bestelling daar
     net buiten — dan staat er terecht geen "staat hier al", want de dag is niet
     in beeld. Vandaar ?van= op de maandag van die dag: dezelfde vraag, op het
     scherm waar het antwoord zichtbaar is. */
  const nu = db.prepare('SELECT window_start FROM orders WHERE id = 1').get();
  const staatOp = nu?.window_start || '';
  const maandag = addDays(staatOp, -((new Date(`${staatOp}T00:00:00Z`).getUTCDay() + 6) % 7));
  const opDeDag = await (await get(`/admin/planning?van=${maandag}&pak=1`)).text();
  check('de huidige startdag zegt "staat hier al"', /staat hier al/.test(opDeDag), true);

  /* En alles binnen de aanloop is geweigerd MET de reden erin. De aanloop is de
     reden dat de belofte te halen is; een venster dat morgen begint is een
     belofte waarvan het systeem al weet dat hij niet klopt. */
  const eerste = firstOfferableDay(vandaag, new Set());
  check('en dagen vóór de eerste te beloven dag zijn geweigerd', /te vroeg/.test(met), true);
  check('   met een reden in beeld en niet alleen een dode knop',
    /pl-zet is-nee/.test(met), true);
  check('   en die eerste dag ligt in de toekomst', eerste > vandaag, true);

  /* Een id dat niet op deze planning staat, verandert niets. Anders kan een
     verdwaalde link een scherm vol knoppen opleveren voor een bestelling die
     er niet ligt. */
  const onzin = await (await get('/admin/planning?pak=999')).text();
  check('een onbekend id laat het scherm met rust', /pl-zet-knop/.test(onzin), false);

  /* ── EN DE KNOP DOET HET OOK ECHT ────────────────────────────────────────
     Alles hierboven controleert wat er op het scherm STAAT. Dat een knop er
     staat en ergens naartoe wijst, is niet hetzelfde als dat hij werkt: de
     route kan de dag weigeren om een reden die dit scherm niet kende, en dan
     is elke knop een doodlopende weg met een nette opmaak.

     Dus: pak de dag die de eerste klikbare knop noemt, post hem, en kijk of
     het venster verschoven is. Datzelfde pad als een muisklik. */
  const eersteKnop = met.match(/<form class="pl-zet"[\s\S]*?<\/form>/);
  const gekozenDag = eersteKnop && eersteKnop[0].match(/name="dag" value="(\d{4}-\d{2}-\d{2})"/);
  check('er is een klikbare dag om te proberen', !!gekozenDag, true);
  if (gekozenDag) {
    const voor = db.prepare('SELECT window_start FROM orders WHERE id = 1').get();
    const res = await post('/admin/orders/1/window', {
      do: 'verzet', dag: gekozenDag[1], reason: 'verplaatst vanaf de planning', back: 'planning',
    });
    const na = db.prepare('SELECT window_start, window_end FROM orders WHERE id = 1').get();
    check('  klikken verzet het venster echt', na.window_start, gekozenDag[1]);
    check('  en het is een andere dag dan hij stond', na.window_start !== voor.window_start, true);
    check('  de tweede dag van het paar komt uit de agenda', !!na.window_end && na.window_end >= na.window_start, true);
    check('  en je landt terug op de planning', res.headers.get('location'), '/admin/planning?verzet=1');
    const ev = db.prepare("SELECT note FROM order_events WHERE order_id = 1 ORDER BY id DESC LIMIT 1").get();
    check('  met een regel op de tijdlijn van de klant', /Venster verzet naar/.test(ev?.note || ''), true);
  }
}

console.log(`\n${n - fouten}/${n} geslaagd`);
process.exit(fouten ? 1 : 0);
