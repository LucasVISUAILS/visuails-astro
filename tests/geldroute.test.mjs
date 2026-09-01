/* ═══════════════════════════════════════════════════════════════════════════════
 * VISUAILS — DE GELDROUTE, VAN BESTELLING TOT FACTUUR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   npm run test:geld
 *
 * ── WAAROM DIT BESTAAT — 20 augustus 2026 ────────────────────────────────────
 *
 * Er waren al negentig assertions op de aanvraagkant (request-flow), achtenzeventig
 * op de bestelroute (order-api), en aparte tests op de factuur, de creditnota en de
 * btw. Elk stuk van de keten was gecontroleerd. De KETEN niet.
 *
 * Dat verschil is niet academisch. De duurste fout die dit project kan maken, is
 * niet dat één stap kapot is — het is dat twee stappen het allebei doen en een
 * ANDER BEDRAG bedoelen. De klant krijgt een offerte van € 1.950 te zien, Mollie
 * incasseert € 2.359,50, en de factuur zet er € 1.950 op met 21% eronder. Drie
 * getallen die stuk voor stuk verdedigbaar zijn, en waarvan er precies één klopt.
 * Zo'n fout valt niet om in een unittest, want elke functie doet wat hij belooft.
 * Hij valt om in de boekhouding, maanden later, bij iemand anders.
 *
 * ── WAT DEZE TEST DOET ──────────────────────────────────────────────────────
 *
 * Eén bestelling, één database, alle stappen achter elkaar:
 *
 *   1 · POST /api/order            — de bestelling en de betaallink
 *   2 · de webhook van Mollie      — betaald, en het bedrag dat terugkomt
 *   3 · issueInvoice()             — de factuur en haar nummer
 *   4 · de optelsom                — offerte = incasso = factuur, tot op de cent
 *
 * En daarna de randen: een tweede factuur op dezelfde bestelling, een webhook met
 * een onbekend id, een webhook die een ANDER bedrag meldt dan er besteld is.
 *
 * ── DE DATABASE IS ECHT ─────────────────────────────────────────────────────
 *
 * `verseDb(schema.sql)` en niet een lijst met SQL-strings, om de reden die in
 * tests/lib/d1sqlite.mjs staat: een fout die bestaat omdat de database iets
 * WEIGERT, vind je niet met een database die nooit iets weigert. Bij een test die
 * over vier tabellen loopt met vreemde sleutels ertussen, is dat het halve punt.
 *
 * ── WAT ER NIET IN ZIT, EN WAAROM ───────────────────────────────────────────
 *
 * Het portaal (/o/<token>) staat er niet in. Dat is 1467 regels zonder eigen test
 * en het hoort er te komen, maar het hangt aan R2 en aan echte bestanden, en een
 * halve controle daarop zou hier een groen vinkje geven voor iets dat niet
 * gecontroleerd is. Beter geen bewering dan een zwakke. Zie de noot onderaan.
 */

import { d1, verseDb, telling } from './lib/d1sqlite.mjs';
import { quoteOrder, VAT_RATE } from '../src/lib/quote.js';

let geslaagd = 0, gezakt = 0;
function ok(naam, waarde, verwacht = true) {
  const goed = JSON.stringify(waarde) === JSON.stringify(verwacht);
  if (goed) { geslaagd++; console.log(`  ok   ${naam}`); }
  else { gezakt++; console.log(`FAIL  ${naam}    verwacht ${JSON.stringify(verwacht)} kreeg ${JSON.stringify(waarde)}`); }
}

/* ── DE OMGEVING ─────────────────────────────────────────────────────────────
 * Eén plek waar alle nepdiensten aan hangen, zodat elke stap in deze test
 * DEZELFDE Mollie en DEZELFDE mailer ziet. Twee stappen die elk hun eigen stub
 * meebrengen, kunnen niet over hetzelfde bedrag oneens zijn — en juist die
 * onenigheid is wat hier gevonden moet worden. */
function maakOmgeving() {
  const gezien = [];
  const betalingen = new Map();   // mollie-id → payload zoals Mollie hem teruggeeft
  let volgnummer = 0;

  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const body = opts.body ? String(opts.body) : '';
    gezien.push({ url: u, method: opts.method || 'GET', body });

    // Mollie: een betaling aanmaken.
    if (u.endsWith('/v2/payments') && (opts.method || '').toUpperCase() === 'POST') {
      const payload = JSON.parse(body);
      const id = `tr_${String(++volgnummer).padStart(10, '0')}`;
      const rec = {
        id,
        status: 'open',
        amount: payload.amount,
        description: payload.description,
        metadata: payload.metadata || {},
        redirectUrl: payload.redirectUrl,
        _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } },
      };
      betalingen.set(id, rec);
      return new Response(JSON.stringify(rec), { status: 201, headers: { 'content-type': 'application/json' } });
    }
    // Mollie: een betaling opvragen (dat doet de webhook).
    const m = u.match(/\/v2\/payments\/(tr_[0-9a-zA-Z]+)$/);
    if (m) {
      const rec = betalingen.get(m[1]);
      if (!rec) return new Response(JSON.stringify({ status: 404, title: 'Not Found' }), { status: 404, headers: { 'content-type': 'application/json' } });
      return new Response(JSON.stringify(rec), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    // Alles wat mail is, slikken we — met de inhoud, zodat we kunnen kijken.
    return new Response(JSON.stringify({ id: 'msg_test' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  return {
    gezien,
    betalingen,
    /* Een TWEEDE betaling op dezelfde bestelling, zoals Lucas er met de hand een
       aanmaakt in het Mollie-dashboard als iemand moet bijbetalen. Dezelfde vorm
       als wat de echte API teruggeeft: een id, een bedrag, en `order_ref` in de
       metadata — dat laatste is waar de webhook de bestelling aan herkent. */
    maakBetaling(orderRef, bedrag) {
      const id = `tr_${String(++volgnummer).padStart(10, '0')}`;
      betalingen.set(id, {
        id, status: 'open', amount: bedrag,
        description: 'bijbetaling',
        metadata: { order_ref: String(orderRef) },
        _links: { checkout: { href: `https://www.mollie.com/checkout/${id}` } },
      });
      return id;
    },
    /** Zet een betaling op betaald, zoals Mollie dat zou doen vóór hij de webhook stuurt. */
    zetBetaald(id, bedrag = null) {
      const rec = betalingen.get(id);
      if (!rec) throw new Error('onbekende betaling ' + id);
      rec.status = 'paid';
      rec.paidAt = '2026-08-20T10:00:00.000Z';
      if (bedrag) rec.amount = bedrag;
      return rec;
    },
    herstel() { globalThis.fetch = echteFetch; },
  };
}

/* ── EEN R2-EMMER DIE ONTHOUDT WAT ER IN GAAT ────────────────────────────────
 * issueInvoice() schrijft de PDF naar R2 vóór hij de factuur op `issued` zet. Een
 * omgeving zonder die binding laat de factuur halverwege staan — precies wat de
 * eerste run liet zien: de webhook meldde netjes "factuur niet uitgegeven, wordt
 * hersteld zodra de klant Studio opent" en ging door. Dat is goed gedrag en het is
 * de reden dat deze emmer er nu is: zonder hem test je de herstelweg in plaats van
 * de gewone weg.
 *
 * Hij onthoudt de sleutels, want "staat de PDF er echt" is een van de dingen die
 * deze test moet kunnen zeggen. */
function maakBucket() {
  const inhoud = new Map();
  return {
    _inhoud: inhoud,
    async put(key, body, opts) { inhoud.set(key, { body, opts, bytes: body?.length ?? 0 }); return { key }; },
    async get(key) { const v = inhoud.get(key); return v ? { body: v.body, size: v.bytes } : null; },
    async delete(key) { inhoud.delete(key); },
    async head(key) { const v = inhoud.get(key); return v ? { size: v.bytes } : null; },
  };
}

const ENV_BASIS = {
  MOLLIE_API_KEY: 'test_abcdefghijklmnopqrstuvwxyz0123',
  RESEND_API_KEY: 're_test',
  NOTIFY_EMAIL: 'hello@visuails.com',
  FROM_EMAIL: 'VISUAILS <orders@visuails.com>',
  SELLER_ADDRESS: 'VISUAILS\nVoorbeeldstraat 12\n1234 AB Rotterdam\nKVK 00000000\nBTW NL001234567B01',
  PUBLIC_ORIGIN: 'https://visuails.com',
};

/** Eén verse database met het echte schema, klaar om aan een route te geven. */
function verseOmgeving(omg) {
  const { db, mislukt } = verseDb(new URL('../schema.sql', import.meta.url));
  if (mislukt.length) throw new Error('schema laadt niet: ' + mislukt.slice(0, 3).join(' | '));
  const bucket = maakBucket();
  return { db, bucket, env: { ...ENV_BASIS, DB: d1(db), UPLOADS: bucket } };
}

/** Een bestelling posten zoals het formulier dat doet. */
async function bestel(env, velden) {
  const { onRequestPost } = await import('../functions/api/order.js');
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.append(k, String(v));
  return onRequestPost({
    request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd }),
    env,
    waitUntil: () => {},
  });
}

/** De webhook aanroepen zoals Mollie dat doet: form-encoded, alleen een id. */
async function webhook(env, id) {
  const { onRequestPost } = await import('../functions/api/webhook/mollie.js');
  const fd = new FormData();
  fd.append('id', id);
  return onRequestPost({
    request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: fd }),
    env,
  });
}

console.log('\nVISUAILS — de geldroute\n');

/* ══════════════════════════════════════════════════════════════════════════════
 * 1 · BESTELLEN, BETALEN, FACTUREREN — DE HELE KETEN OP ÉÉN DATABASE
 * ═════════════════════════════════════════════════════════════════════════════ */
console.log('de keten: bestelling → betaling → factuur');
{
  const omg = maakOmgeving();
  try {
    const { db, bucket, env } = verseOmgeving(omg);

    const PRODUCTEN = 12;
    const offerte = quoteOrder({ service: 'complete', products: PRODUCTEN, vatRate: VAT_RATE });

    /* `service=drop` en niet `complete`. Dat is geen slordigheid maar de wire-waarde
       die /start/complete al sinds jaar en dag post; quote.js heeft er een lange
       noot over staan omdat het één keer een bestelling van € 2.359,50 gratis heeft
       laten weggaan. Een test die hier `complete` post, test een pad dat de site
       niet gebruikt — en krijgt stilletjes `catalog` terug, want ORDER_SERVICES
       kent `complete` niet en valt terug. Precies dat gebeurde bij de eerste run. */
    const res = await bestel(env, {
      service: 'drop',
      products: PRODUCTEN,
      name: 'Voorbeeld Merk',
      brand: 'VOORBEELD',
      email: 'test@voorbeeld.nl',
      phone: '+31 6 12345678',
      country: 'NL',
      address_line1: 'Voorbeeldstraat 12',
      postal_code: '1234 AB',
      city: 'Rotterdam',
      lang: 'nl',
      style: 'classic',
      background: 'studio-white',
      /* ── HET ZAKELIJKE BEWIJS HOORT IN DE FIXTURE ────────────────────────
         Zonder deze drie velden zet order.js de bestelling op de beoordeellijst
         en geeft hij BEWUST geen betaallink — zie de noot bij payableNow. De
         eerste versie van deze test miste ze en concludeerde daaruit dat de
         betaalstap kapot was; hij was juist aan het werk. Een KVK-nummer en geen
         btw-nummer is de gewone Nederlandse eenmanszaak, en dat pad raakt VIES
         niet aan — precies wat je in een test wilt. Het nummer hieronder is
         onmiskenbaar nep. */
      business_declaration: 'yes',
      business_version: 'v1',
      no_vat_number: '1',
      reg_number: '99999999',
    });

    ok('de bestelroute antwoordt met een omleiding', res.status >= 300 && res.status < 400);

    const order = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    ok('er staat één bestelling in de database', telling(db, 'SELECT COUNT(*) FROM orders'), 1);
    ok('de dienst is opgeslagen als de wire-waarde', order.service, 'drop');
    ok('en het aantal producten', order.product_count, PRODUCTEN);

    /* ── DE EERSTE VAN DE DRIE GETALLEN ─────────────────────────────────────
       `total_cents` is NETTO en dat is een keuze die in order.js met zoveel
       woorden staat. Wie hem ooit op bruto zet, breekt de factuur én de
       adminkolom, en die twee klagen niet. Deze regel is het slot erop. */
    ok('total_cents is het NETTObedrag uit de offerte', order.total_cents, offerte.netCents);
    ok('en vat_cents de btw daarover', order.vat_cents, offerte.vatCents);

    /* ── DE TWEEDE ─────────────────────────────────────────────────────────
       Wat er daadwerkelijk aan Mollie is gevraagd. Mollie krijgt BRUTO, want
       dat is wat er van de rekening gaat. */
    const molliePost = omg.gezien.find(g => g.url.endsWith('/v2/payments') && g.method === 'POST');
    ok('er is één betaling aangemaakt', !!molliePost);
    const gevraagd = molliePost ? JSON.parse(molliePost.body) : null;
    const gevraagdCents = gevraagd ? Math.round(parseFloat(gevraagd.amount.value) * 100) : 0;
    ok('Mollie is om het BRUTObedrag gevraagd', gevraagdCents, offerte.grossCents);
    ok('in euro', gevraagd && gevraagd.amount.currency, 'EUR');

    /* ── ER STAAT NOG GEEN BETAALRIJ, EN DAT HOORT ZO ──────────────────────
       Gemeten bij het schrijven van deze test, en het is geen omissie: `payments`
       wordt door de WEBHOOK gevuld, niet door de bestelroute. Mollie is de bron
       van waarheid over of er betaald is, en een rij die wij aanmaken op het
       moment dat we het vrágen, zou een betaling beweren die nog niet bestaat.
       Deze regel legt dat vast, zodat een latere "we schrijven hem alvast weg"
       hier struikelt in plaats van in de reconciliatie. */
    ok('er staat vóór de webhook nog geen betaalrij', telling(db, 'SELECT COUNT(*) FROM payments'), 0);

    /* ── DE WEBHOOK ────────────────────────────────────────────────────────
       Mollie zet de betaling op `paid` en stuurt alleen een id. Alles wat daarna
       waar is, moet uit Mollie zelf komen — dat is de hele reden dat de webhook
       de betaling ophaalt in plaats van de body te geloven. */
    const id = [...omg.betalingen.keys()][0];
    omg.zetBetaald(id);
    const wres = await webhook(env, id);
    ok('de webhook accepteert de melding', wres.status, 200);

    const naBetaling = db.prepare('SELECT * FROM payments WHERE external_id = ?').get(id);
    ok('de betaling staat nu op betaald', naBetaling && naBetaling.status, 'paid');
    ok('en het bedrag is niet veranderd', naBetaling && naBetaling.amount_cents, offerte.grossCents);

    /* ── DE DERDE ──────────────────────────────────────────────────────────
       De factuur. Die wordt uit de BESTELLING opgebouwd en niet uit de betaling,
       dus dit is de plek waar de twee getallen elkaar voor het eerst tegenkomen. */
    const { issueInvoice } = await import('../src/lib/invoice.js');
    const factuur = await issueInvoice(env, order.id, { today: '2026-08-20' });
    ok('er is een factuur uitgereikt', !!factuur);

    const frow = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);
    ok('en hij staat in de database', !!frow);
    if (frow) {
      const snap = JSON.parse(frow.snapshot_json || '{}');
      const fNet = snap.netCents ?? frow.net_cents;
      const fVat = snap.vatCents ?? frow.vat_cents;
      const fBruto = snap.grossCents ?? frow.gross_cents ?? (fNet + fVat);

      /* ── DE OPTELSOM, EN DIT IS WAAR DEZE TEST VOOR BESTAAT ─────────────
         Drie plekken, één bedrag. Wijkt er één af, dan is er iemand die te veel
         of te weinig betaalt en niemand die het merkt. */
      ok('factuur netto  = offerte netto', fNet, offerte.netCents);
      ok('factuur btw    = offerte btw', fVat, offerte.vatCents);
      ok('factuur bruto  = wat Mollie incasseerde', fBruto, offerte.grossCents);
      ok('en netto + btw = bruto', fNet + fVat, fBruto);
    }

    /* Een tweede aanroep mag niets hernummeren. Een factuurnummer dat verspringt
       is in Nederland geen schoonheidsfoutje maar een administratieve fout. */
    const nummerVoor = frow && frow.number;
    await issueInvoice(env, order.id, { today: '2026-08-21' });
    const frow2 = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);
    ok('een tweede aanroep hernummert niet', frow2 && frow2.number, nummerVoor);
    ok('en maakt geen tweede factuur', telling(db, 'SELECT COUNT(*) FROM invoices WHERE order_id = ?', order.id), 1);
  } finally {
    omg.herstel();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 1b · DE PDF LANDT ECHT, EN HET NUMMER HEEFT EEN VORM
 * ═════════════════════════════════════════════════════════════════════════════ */
console.log('\nde factuur is een bestand en geen rij');
{
  const omg = maakOmgeving();
  try {
    const { db, bucket, env } = verseOmgeving(omg);
    await bestel(env, {
      service: 'drop', products: 5,
      name: 'Voorbeeld Merk', brand: 'VOORBEELD', email: 'pdf@voorbeeld.nl',
      country: 'NL', address_line1: 'Voorbeeldstraat 12', postal_code: '1234 AB', city: 'Rotterdam',
      lang: 'nl', style: 'classic', background: 'studio-white',
      business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
    });
    const order = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    const id = [...omg.betalingen.keys()][0];
    omg.zetBetaald(id);
    await webhook(env, id);

    const frow = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);
    ok('de factuur staat op uitgereikt', frow && frow.status, 'issued');
    /* De vorm komt uit formatNumber(): VIS-<jaar>-<vier cijfers>. Die vorm staat
       hier en niet alleen in invoice.js, omdat een factuurnummer dat van vorm
       verandert in Nederland geen stijlkwestie is — de reeks moet doorlopend en
       herkenbaar blijven, ook over een jaargrens heen. De eerste versie van deze
       test gokte op `jaar-volgnummer` zonder voorvoegsel en viel daarop om; dat
       is precies waarom hij nu tegen de echte functie ligt. */
    const { formatNumber } = await import('../src/lib/invoice.js');
    ok('het nummer heeft de vorm uit formatNumber()',
       String(frow && frow.number), formatNumber(frow && frow.year, frow && frow.seq));
    ok('en draagt het jaar van zijn reeks',
       String(frow && frow.number).includes(String(frow && frow.year)), true);

    /* En het bestand staat er ook echt. Een factuur die `issued` heet zonder PDF
       is een factuur die je niet kunt sturen. */
    ok('de PDF ligt in de emmer', bucket._inhoud.has(frow && frow.pdf_key), true);
    const bestand = bucket._inhoud.get(frow && frow.pdf_key);
    ok('en heeft inhoud', (bestand?.bytes || 0) > 500, true);
    ok('met het aantal bytes dat in de rij staat', bestand && bestand.bytes, frow && frow.pdf_bytes);
    ok('en het juiste contenttype', bestand && bestand.opts?.httpMetadata?.contentType, 'application/pdf');
  } finally {
    omg.herstel();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 1c · GEEN ZAKELIJK BEWIJS, GEEN BETAALLINK
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * De regel staat met zoveel woorden in order.js: een bestelling die op de
 * beoordeellijst komt omdat het zakelijke bewijs ontbreekt, hoort GEEN betaallink
 * te krijgen — "dat is wat hard in de EU betekent op de plek waar het geld begint
 * te lopen". Een regel die alleen in een commentaar staat, is een regel die de
 * volgende opschoonronde niet overleeft.
 */
console.log('\nzonder zakelijk bewijs begint er geen geld te lopen');
{
  const omg = maakOmgeving();
  try {
    const { db, env } = verseOmgeving(omg);
    const res = await bestel(env, {
      service: 'drop', products: 12,
      name: 'Voorbeeld Merk', brand: 'VOORBEELD', email: 'zonder@voorbeeld.nl',
      country: 'NL', address_line1: 'Voorbeeldstraat 12', postal_code: '1234 AB', city: 'Rotterdam',
      lang: 'nl', style: 'classic', background: 'studio-white',
      // geen business_declaration, geen KVK, geen btw-nummer
    });
    ok('de bestelling wordt wel aangenomen', telling(db, 'SELECT COUNT(*) FROM orders'), 1);
    const order = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    ok('en op de beoordeellijst gezet', order.review_state !== null && order.review_state !== 'none', true);
    ok('maar er is geen betaling aangemaakt',
       omg.gezien.filter(g => g.url.endsWith('/v2/payments') && g.method === 'POST').length, 0);
    ok('en de bezoeker gaat niet naar een checkout',
       /mollie\.com\/checkout/.test(res.headers?.get?.('Location') || ''), false);
  } finally {
    omg.herstel();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 2 · DE RANDEN VAN DE WEBHOOK
 * ═════════════════════════════════════════════════════════════════════════════ */
console.log('\nde webhook gelooft alleen Mollie');
{
  const omg = maakOmgeving();
  try {
    const { env } = verseOmgeving(omg);

    const leeg = await webhook(env, 'tr_bestaatniet00');
    ok('een onbekend id wordt netjes afgehandeld', leeg.status, 200);

    const { onRequestPost } = await import('../functions/api/webhook/mollie.js');
    const rommel = await onRequestPost({
      request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: 'geen formulier' }),
      env,
    });
    ok('een body die geen formulier is, geeft 400', rommel.status, 400);

    const zonderSleutel = await onRequestPost({
      request: new Request('https://visuails.com/api/webhook/mollie', { method: 'POST', body: new FormData() }),
      env: { ...env, MOLLIE_API_KEY: '' },
    });
    ok('zonder sleutel doet de webhook niets', zonderSleutel.status, 500);
  } finally {
    omg.herstel();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 2b · MOLLIE MELDT EEN ANDER BEDRAG DAN ER BESTELD IS
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Dit is de duurste variant van de fout waar deze hele test voor bestaat, en de
 * enige die niet uit onszelf komt: de bestelling zegt € 1.234,20 en de betaling
 * die terugkomt zegt € 1,00. Dat kan door een fout in de keten, door een
 * hergebruikt betaal-id, of doordat iemand een eigen betaling aan onze webhook
 * voert.
 *
 * WAT DEZE TEST BEWEERT, is niet dat de webhook zoiets weigert — dat doet hij
 * niet, en dat is verdedigbaar: Mollie is de bron van waarheid over wat er
 * daadwerkelijk geïncasseerd is, en een webhook die betalingen gaat weigeren
 * omdat hij het bedrag niet herkent, laat echt geld in de lucht hangen. Wat hij
 * WEL moet doen is het VERSCHIL vastleggen, zodat het terug te vinden is. Deze
 * test legt vast dat het bedrag dat wij opslaan het bedrag van MOLLIE is en niet
 * dat van onze eigen bestelling — want alleen dan is de afwijking later zichtbaar
 * in plaats van weggepoetst.
 */
console.log('\nals het bedrag afwijkt, wint Mollie en blijft het verschil zichtbaar');
{
  const omg = maakOmgeving();
  try {
    const { db, env } = verseOmgeving(omg);
    await bestel(env, {
      service: 'drop', products: 12,
      name: 'Voorbeeld Merk', brand: 'VOORBEELD', email: 'afwijking@voorbeeld.nl',
      country: 'NL', address_line1: 'Voorbeeldstraat 12', postal_code: '1234 AB', city: 'Rotterdam',
      lang: 'nl', style: 'classic', background: 'studio-white',
      business_declaration: 'yes', business_version: 'v1', no_vat_number: '1', reg_number: '99999999',
    });
    const order = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
    const id = [...omg.betalingen.keys()][0];
    const { issueInvoice } = await import('../src/lib/invoice.js');

    // Mollie meldt één euro op een bestelling van ruim twaalfhonderd.
    omg.zetBetaald(id, { currency: 'EUR', value: '1.00' });
    await webhook(env, id);

    const rij = db.prepare('SELECT * FROM payments WHERE external_id = ?').get(id);
    ok('de betaling is vastgelegd', !!rij);
    ok('met het bedrag dat MOLLIE meldde', rij && rij.amount_cents, 100);
    ok('en dus niet met dat van de bestelling', rij && rij.amount_cents !== order.total_cents, true);
    /* De ruwe payload wordt bewaard. Zonder dat is een afwijking achteraf niet te
       reconstrueren en heb je alleen twee getallen die elkaar tegenspreken. */
    ok('de ruwe melding is bewaard voor reconciliatie', !!(rij && rij.raw_payload));

    /* ── EN DIT IS DE VRAAG DIE ERTOE DOET ─────────────────────────────────
       Tot 20 augustus 2026 ging hier een factuur uit voor het VOLLE bedrag, met
       status `issued`, op een betaling van één euro. De vorige versie van deze
       test legde dat gedrag vast met de aantekening: "besluit iemand er een
       controle op te zetten — factureer niet meer dan er binnen is — dan valt
       deze test om en weet hij precies wat hij verandert."

       Dat is gebeurd. issueInvoice() telt nu op wat er in EUR is binnengekomen en
       weigert een factuur die daar bovenuit gaat; zie de noot bij
       FACTUUR_SPELING_CENT in src/lib/invoice.js. Wat hieronder staat is de
       nieuwe afspraak, en ze is scherper dan de oude: er wordt niets uitgegeven
       dat later teruggedraaid moet worden. */
    const f = db.prepare('SELECT * FROM invoices WHERE order_id = ?').get(order.id);
    ok('er gaat GEEN factuur uit op een bedrag dat niet binnen is', !f, true);

    /* Geen nummer verbruikt. Dat is de helft van de reden dat de controle vóór
       nextNumber() staat: de factuurreeks mag geen gaten hebben, en een gat is
       precies wat een teruggedraaide factuur achterlaat. */
    const reeks = db.prepare('SELECT COUNT(*) AS n FROM invoices').get();
    ok('en er is dus ook geen nummer verbruikt', reeks.n, 0);

    /* ── DE WEIGERING IS EEN STAP NAAR VOREN GESCHOVEN — 31 augustus 2026 ──
       Hier werd gezocht naar de regel van issueInvoice() ("de factuur wacht nog").
       Die wordt niet meer bereikt, en dat is beter: sinds Lucas koos om een
       betaling die het totaal niet dekt de bestelling niet op betaald te laten
       zetten, komt het nooit meer tot een factuurpoging. De weigering staat nu in
       de webhook zelf, één stap eerder.

       De AFSPRAAK is niet veranderd en dat is wat deze regel bewaakt: de klant
       moet in zijn eigen tijdlijn kunnen lezen dat er iets wordt nagekeken, in
       gewone taal en zonder bedragen. */
    const gebeurtenissen = db.prepare(
      "SELECT * FROM order_events WHERE order_id = ? AND note LIKE '%nagekeken%'"
    ).all(order.id);
    ok('de klant leest in zijn tijdlijn dat er iets wordt nagekeken', gebeurtenissen.length, 1);
    /* Zonder bedragen: order_events is óók de klantentijdlijn (portal.js en
       account.js lezen dezelfde tabel, zonder filter op actor). De getallen staan
       in admin_log, waar alleen Lucas kijkt. */
    ok('en zonder bedragen erin', /\d{3,}/.test(gebeurtenissen[0].note), false);
    /* En de bedragen staan in admin_log, onder de handeling die er nu bij hoort:
       'payment.short' in plaats van 'invoice.blocked', want er is geen factuur
       tegengehouden — er is een betaling niet geaccepteerd. */
    const logregel = db.prepare(
      "SELECT * FROM admin_log WHERE order_id = ? AND action = 'payment.short'"
    ).get(order.id);
    ok('en jij leest de twee bedragen in het adminlog',
       /binnengekomen 100 cent op een bestelling van 123420 cent/.test(logregel?.detail || ''), true);

    /* Nog een keer proberen — dat doet de inhaalslag in VISUAILS Studio bij ELK
       bezoek aan /account/invoices. Er mag geen tweede regel bij komen, anders is
       de tijdlijn na een week onleesbaar. */
    await issueInvoice(env, order.id);
    const nogmaals = db.prepare(
      "SELECT COUNT(*) AS n FROM order_events WHERE order_id = ? AND note LIKE '%wacht nog%'"
    ).get(order.id);
    ok('en een tweede poging schrijft geen tweede regel', nogmaals.n, 1);

    ok('het verschil is terug te vinden via de betaalrij',
       (order.total_cents + order.vat_cents) - (rij ? rij.amount_cents : 0), 123320);

    /* ── EN ALS ER ALSNOG WORDT BIJBETAALD ─────────────────────────────────
       De weigering is geen eindstation. Komt het bedrag alsnog binnen — een
       tweede betaling, met de hand aangemaakt in het Mollie-dashboard — dan telt
       issueInvoice() de rijen op en gaat de factuur alsnog uit, zonder dat er
       iemand iets hoeft te herstellen. Dat is wat een controle op het TOTAAL
       oplevert boven een controle per betaling. */
    const bij = omg.maakBetaling(order.ref, { currency: 'EUR', value: '1233.20' });
    omg.zetBetaald(bij);
    await webhook(env, bij);

    const na = db.prepare('SELECT COALESCE(SUM(amount_cents),0) AS n FROM payments WHERE order_id = ?').get(order.id);
    ok('er staan nu twee betalingen die samen het bruto dekken', na.n, order.total_cents + order.vat_cents);

    const f2 = await issueInvoice(env, order.id);
    ok('en dan gaat de factuur alsnog uit', f2 && f2.status, 'issued');
    const snap2 = f2 ? JSON.parse(f2.snapshot_json || '{}') : {};
    ok('op het volledige bedrag van de bestelling', snap2.grossCents, order.total_cents + order.vat_cents);
  } finally {
    omg.herstel();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 3 · DE PROEFVISUAL VAN € 1 LOOPT DEZELFDE ROUTE
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Hij kost één euro en gaat over dezelfde vier stappen, en juist daarom hoort hij
 * hier: het is het goedkoopste product dat de studio verkoopt en de enige plek
 * waar het bedrag INCLUSIEF btw is bedacht in plaats van eromheen gerekend. Als
 * er ergens een afronding stukgaat, gaat hij hier stuk.
 */
console.log('\nde proefvisual van € 1');
{
  const omg = maakOmgeving();
  try {
    const { db, env } = verseOmgeving(omg);
    const { quoteTestSample } = await import('../src/lib/quote.js');
    const offerte = quoteTestSample({ vatRate: VAT_RATE });

    await bestel(env, {
      service: 'test-sample',
      products: 1,
      name: 'Voorbeeld Merk',
      brand: 'VOORBEELD',
      email: 'proef@voorbeeld.nl',
      country: 'NL',
      address_line1: 'Voorbeeldstraat 12',
      postal_code: '1234 AB',
      city: 'Rotterdam',
      lang: 'nl',
      deliverable: 'catalog',
      style: 'classic',
      background: 'studio-white',
    });

    const order = db.prepare("SELECT * FROM orders WHERE service = 'test-sample' ORDER BY id DESC LIMIT 1").get();
    ok('de proefvisual is besteld', !!order);

    const post = omg.gezien.find(g => g.url.endsWith('/v2/payments') && g.method === 'POST');
    const gevraagdCents = post ? Math.round(parseFloat(JSON.parse(post.body).amount.value) * 100) : 0;
    ok('en Mollie is om precies één euro gevraagd', gevraagdCents, offerte.grossCents);
    ok('die één euro is inclusief btw', offerte.netCents + offerte.vatCents, offerte.grossCents);
    ok('en het is echt honderd cent', offerte.grossCents, 100);
  } finally {
    omg.herstel();
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * 4 · DE ABONNEMENTSTERMIJN KRIJGT EEN FACTUUR
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Tot 20 augustus 2026 landde een maandelijkse incasso in `subscription_payments`
 * en verder nergens: geen document, geen nummer, niets in de boekhouding. Voor een
 * terugkerende zakelijke afschrijving hoort daar een factuur tegenover, uit
 * DEZELFDE doorlopende reeks als een factuur op een bestelling — want dat is wat
 * de Belastingdienst vraagt en wat de vraag "waar is factuur 8" beantwoordbaar
 * houdt.
 *
 * Wat hier gecontroleerd wordt is precies dat: één incasso, één factuur, één
 * nummer uit de gedeelde reeks, en de btw uit het bruto gerekend zodat netto plus
 * btw optelt tot exact wat er geïncasseerd is.
 */
console.log('\neen abonnementstermijn levert een factuur op');
{
  const omg = maakOmgeving();
  try {
    const { db, env } = verseOmgeving(omg);
    const { issueSubscriptionInvoice, formatNumber } = await import('../src/lib/invoice.js');

    db.prepare("INSERT INTO customers (id, email, name, brand, country) VALUES (1, 'abo@voorbeeld.nl', 'Jan Jansen', 'Voorbeeld Merk', 'NL')").run();
    db.prepare(
      `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, vat_treatment, vat_rate, vat_country)
       VALUES (1, 1, 'ABO-0001', 'starter', 'monthly', 'active', 'nl_standard', 0.21, 'NL')`
    ).run();
    db.prepare(
      `INSERT INTO subscription_payments (id, subscription_id, external_id, status, amount_cents, currency, month)
       VALUES (1, 1, 'tr_abo_0001', 'paid', 39000, 'EUR', '2026-08')`
    ).run();

    const f = await issueSubscriptionInvoice(env, 1, { today: '2026-08-20' });
    ok('er komt een factuur', f && f.status, 'issued');
    ok('met een nummer uit de gedeelde reeks', f && f.number, formatNumber(2026, 1));
    ok('en een pdf in R2', !!(f && f.pdf_key), true);

    const snap = JSON.parse(f.snapshot_json);
    ok('het bruto is exact wat er geïncasseerd is', snap.grossCents, 39000);
    ok('netto plus btw telt daar precies naar op', snap.netCents + snap.vatCents, 39000);
    ok('de btw is uit het bruto gerekend, niet erbovenop', snap.netCents < 39000, true);
    ok('de maand staat op de regel', /augustus 2026/.test(snap.lines[0].description), true);
    ok('en de plannaam ook', /Starter/i.test(snap.lines[0].description), true);

    /* IDEMPOTENT. Mollie levert dezelfde melding meer dan één keer af, en dan mag
       er geen tweede nummer uit de reeks verdwijnen. */
    const nogmaals = await issueSubscriptionInvoice(env, 1, { today: '2026-08-20' });
    ok('twee keer aanroepen geeft dezelfde factuur', nogmaals && nogmaals.number, f.number);
    ok('en er is maar één rij', db.prepare('SELECT COUNT(*) AS n FROM subscription_invoices').get().n, 1);

    /* DE REEKS IS ÉÉN REEKS. Een factuur op een bestelling die hierna wordt
       uitgegeven, pakt het volgende nummer — niet opnieuw 0001. Dat is het hele
       argument om beide tabellen uit `invoice_series` te laten putten. */
    db.prepare(
      `INSERT INTO subscription_payments (id, subscription_id, external_id, status, amount_cents, currency, month)
       VALUES (2, 1, 'tr_abo_0002', 'paid', 39000, 'EUR', '2026-09')`
    ).run();
    const tweede = await issueSubscriptionInvoice(env, 2, { today: '2026-09-20' });
    ok('de volgende termijn krijgt 0002', tweede && tweede.number, formatNumber(2026, 2));

    /* Verlegd naar een EU-klant met een geldig nummer: 0% en geen btw-regel. */
    db.prepare("INSERT INTO customers (id, email, name, brand, country, vat_number) VALUES (2, 'de@voorbeeld.de', 'Klaus', 'Marke GmbH', 'DE', 'DE123456789')").run();
    db.prepare(
      `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, vat_treatment, vat_rate, vat_country, vat_number)
       VALUES (2, 2, 'ABO-0002', 'studio', 'monthly', 'active', 'eu_reverse_charge', 0, 'DE', 'DE123456789')`
    ).run();
    db.prepare(
      `INSERT INTO subscription_payments (id, subscription_id, external_id, status, amount_cents, currency, month)
       VALUES (3, 2, 'tr_abo_0003', 'paid', 79000, 'EUR', '2026-08')`
    ).run();
    const verlegd = await issueSubscriptionInvoice(env, 3, { today: '2026-08-20' });
    const vsnap = JSON.parse(verlegd.snapshot_json);
    ok('bij verlegging is er geen btw', vsnap.vatCents, 0);
    ok('en is netto gelijk aan bruto', vsnap.netCents, vsnap.grossCents);
    ok('het btw-nummer van de klant staat erop', vsnap.customer.vat, 'DE123456789');

    /* Een mislukte incasso levert geen factuur op — er is niets binnengekomen. */
    db.prepare(
      `INSERT INTO subscription_payments (id, subscription_id, external_id, status, amount_cents, currency, month)
       VALUES (4, 1, 'tr_abo_mislukt', 'failed', 39000, 'EUR', '2026-10')`
    ).run();
    const mislukt = await issueSubscriptionInvoice(env, 4, { today: '2026-10-20' });
    ok('een mislukte incasso geeft geen factuur', mislukt, null);
  } finally {
    omg.herstel();
  }
}

/* ── WAT HIERNA NOG HOORT TE KOMEN ───────────────────────────────────────────
 *
 * Het portaal op /o/<token> — 1467 regels, nul tests. Het hangt aan R2 en aan
 * echte bestanden, en dat is precies de reden dat het er nog niet in staat: een
 * halve controle zou hier een groen vinkje geven voor iets dat niet gecontroleerd
 * is, en dat is erger dan een gat dat je ziet. Wie het toevoegt, heeft een R2-stub
 * nodig die net als d1sqlite.mjs weigert wat de echte weigert.
 *
 * En de levering zelf (delivery.js, 779 regels): welke bestanden er in de zip
 * gaan, met welke naam, met welke herkomsttag. Zelfde verhaal, zelfde reden. */

console.log(`\n${geslaagd}/${geslaagd + gezakt} passed`);
if (gezakt) process.exitCode = 1;
