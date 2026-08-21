/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * FACTUREN UITGEVEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De site belooft op vijf plekken een factuur en maakte er nooit één. Dit bestand
 * is de administratie: het geeft een nummer uit, bouwt de momentopname, laat
 * invoicePdf.js er een pdf van maken en legt die in R2.
 *
 * ── DE ENIGE REGEL DIE ECHT VASTSTAAT ────────────────────────────────────────
 *
 * Een factuurnummer wordt uitgegeven en daarna nooit meer teruggegeven. Niet bij
 * een mislukte pdf, niet bij een fout in R2, niet bij een klant die zijn
 * bestelling annuleert. De reeks mag geen gaten hebben, want een gat leest bij een
 * controle als een verdwenen factuur.
 *
 * Daarom staat het uitgeven van het nummer en het maken van de pdf niet in
 * dezelfde stap. Eerst een rij met status 'pending' — het nummer is dan van deze
 * bestelling en van geen andere. Daarna de pdf. Lukt die niet, dan blijft de rij
 * 'pending' staan en kan hij later met HETZELFDE nummer opnieuw. Zie migratie
 * 0021 voor de rest van dat argument.
 *
 * ── WAAROM DE MOMENTOPNAME WORDT BEWAARD ─────────────────────────────────────
 *
 * `snapshot_json` bevat de volledige invoer van renderInvoicePdf(). Een factuur is
 * een momentopname en geen berekening: verandert je staffel volgend jaar, dan moet
 * de factuur van vandaag nog steeds zeggen wat er vandaag is afgesproken. Zonder
 * die momentopname zou hij meebewegen met de prijslijst, en dan is het geen
 * factuur meer maar een rapport.
 */

import { renderInvoicePdf } from './invoicePdf.js';
import { composeAddress } from '../data/address.js';
import { VAT_TREATMENT } from '../data/vat.js';
import { VAT_RATE } from './quote.js';
import { planName } from '../data/planNames.js';
import { serviceLabel } from '../data/services.js';

/*
 * ── HOE SELLER_ADDRESS AANGELEVERD MAG WORDEN — 10 AUGUSTUS 2026 ────────────
 *
 * Dit splitste alleen op een echt regeleinde. Dat kán niet: een Pages-secret wordt
 * ingetypt achter `Enter a secret value: »`, één regel, geen enter — die beëindigt de
 * invoer. Een adres van vier regels was dus alleen via een omweg in te voeren, en het
 * gevolg van een mislukte poging is niet zichtbaar: de terugval hieronder springt in
 * en de factuur draagt een verzonnen adres zonder één foutmelding.
 *
 * Daarom worden drie schrijfwijzen geaccepteerd, allemaal met dezelfde uitkomst:
 *
 *   een echt regeleinde        (dashboard, textarea, een pipe uit een bestand)
 *   de twee tekens \n          (wat je intypt als je "nieuwe regel" bedoelt)
 *   een liggend streepje |     (het makkelijkst op een commandoregel)
 *
 * DE TERUGVAL BLIJFT MET OPZET EEN VERZONNEN ADRES. Het echte adres hier neerzetten
 * zou betekenen dat een ontbrekend secret onopgemerkt goed gaat — en dan merkt niemand
 * het op de dag dat de terugval iets anders is dan de werkelijkheid. Een factuur met
 * "Voorbeeldstraat 12" erop valt op; een die per ongeluk klopt, niet.
 */
function addressFrom(value) {
  return String(value)
    .replace(/\\n/g, '\n')
    .split(/[\n|]/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Ons eigen adres en onze nummers. Uit env waar dat kan, met een vaste terugval. */
function sellerOf(env) {
  return {
    name: 'VISUAILS',
    address: addressFrom(env?.SELLER_ADDRESS || 'Voorbeeldstraat 12\n1234 AB Rotterdam'),
    vat: env?.VISUAILS_VAT || 'NL005407575B96',
    kvk: env?.VISUAILS_KVK || '99742993',
    email: env?.FROM_EMAIL_ADDRESS || 'hello@visuails.com',
    iban: env?.VISUAILS_IBAN || null,
  };
}

/*
 * Het volgende nummer voor dit jaar.
 *
 * ÉÉN STATEMENT, met RETURNING. Lezen-dan-schrijven in twee stappen is precies
 * hoe twee gelijktijdige bestellingen hetzelfde nummer krijgen: beide lezen 41,
 * beide schrijven 42. SQLite voert een UPDATE als één transactie uit, dus de
 * tweede aanroep leest de waarde die de eerste al heeft verhoogd.
 *
 * De INSERT ervoor maakt de rij voor een nieuw jaar aan. ON CONFLICT DO NOTHING,
 * want twee bestellingen op 1 januari om 00:00 doen dit tegelijk.
 */
/*
 * ── EEN NUMMER DAT NIET GEBRUIKT IS, TERUGGEVEN ─────────────────────────────
 *
 * 20 augustus 2026. Het nummer wordt toegekend VÓÓR de INSERT, en dat moet ook:
 * `number` is NOT NULL, dus er valt geen rij te schrijven zonder er eerst een te
 * hebben. Verliezen twee gelijktijdige aanroepen het van elkaar op de UNIQUE
 * sleutel, dan heeft de verliezer wél een nummer verbruikt en niets geschreven —
 * en dat gat leest bij een controle als een verdwenen factuur.
 *
 * De voorwaarde `last_number = ?2` is wat dit veilig maakt. Alleen als de teller
 * nog exact op óns nummer staat, zetten we hem terug; heeft iemand er inmiddels
 * overheen genummerd, dan raakt de UPDATE niets en blijft het gat staan. Liever
 * een gat dan twee facturen met hetzelfde nummer.
 */
async function geefNummerTerug(env, year, seq) {
  await env.DB.prepare(
    'UPDATE invoice_series SET last_number = last_number - 1 WHERE year = ?1 AND last_number = ?2'
  ).bind(year, seq).run().catch(() => {});
}

async function nextNumber(env, year) {
  await env.DB.prepare(
    'INSERT INTO invoice_series (year, last_number) VALUES (?1, 0) ON CONFLICT(year) DO NOTHING'
  ).bind(year).run();

  const row = await env.DB.prepare(
    `UPDATE invoice_series
        SET last_number = last_number + 1, updated_at = datetime('now')
      WHERE year = ?1
      RETURNING last_number`
  ).bind(year).first();

  if (!row || !Number.isInteger(row.last_number)) {
    throw new Error('invoice: kon geen nummer uitgeven voor ' + year);
  }
  return row.last_number;
}

/** 'VIS-2026-0001'. Vier cijfers, want een reeks die op 10000 komt is een luxeprobleem. */
export function formatNumber(year, seq) {
  return `VIS-${year}-${String(seq).padStart(4, '0')}`;
}

/*
 * De momentopname uit een bestelling.
 *
 * Alles komt uit de order zelf. De regels worden NIET opnieuw uitgerekend uit de
 * prijslijst — dat is het hele punt van een momentopname, en het is ook wat een
 * factuur juridisch onderscheidt van een pagina die een bedrag toont.
 */
export function snapshotFromOrder(order, env, { number, date, dueDate = null } = {}) {
  const lang = order.lang === 'en' ? 'en' : 'nl';
  const net = Number(order.total_cents) || 0;
  const vat = Number(order.vat_cents) || 0;

  // composeAddress() verwacht losse velden, geen orderrij — die namen komen niet
  // overeen met de kolommen, dus hier expliciet omzetten. Eén bron voor de vorm
  // van een adres (drie regels, postcode en plaats samen), zie address.js.
  const address = String(composeAddress({
    line1: order.address_line1,
    line2: order.address_line2,
    postal: order.postal_code,
    city: order.city,
    region: order.region,
  }) || '').split('\n').map((l) => l.trim()).filter(Boolean);

  /*
   * Eén regel voor de bestelling. Een uitsplitsing per product zou een tweede
   * waarheid over de prijs zijn, en die staat al in de bestelling zelf.
   *
   * ── DE DIENSTNAAM UIT services.js, NIET UIT DE KOLOM (9 augustus 2026) ──────
   *
   * Hier stond `${order.service}`, en op VIS-2026-0001 kwam dat eruit als
   * "catalog — 1 product": het slug uit de database, kleine letter, op een
   * factuur. Precies de fout die de header van src/data/services.js bij naam
   * noemt — daar was het "Dienst: catalog" in de bestelbevestiging — met de
   * conclusie dat een derde eigen kopie van die namen is hoe de tweede ontstond.
   * Dit was de vierde aanroeper die eromheen ging.
   *
   * serviceLabel() geeft null bij een onbekende dienst en dan valt dit terug op de
   * kolom. Dat is de regel van dat bestand en hij blijft hier gelden: liever het
   * ruwe slug dan een naam die wij verzinnen, want een blanco of een slug is
   * zichtbaar mis en een gok niet.
   */
  const svc = serviceLabel(order.service, lang) || order.service;
  const n = order.product_count || 1;
  const label = lang === 'nl'
    ? `${svc} — ${n} product${n === 1 ? '' : 'en'}`
    : `${svc} — ${n} product${n === 1 ? '' : 's'}`;

  return {
    number,
    date,
    dueDate,
    lang,
    seller: sellerOf(env),
    customer: {
      name: [order.first_name, order.last_name].filter(Boolean).join(' ') || order.name || '',
      company: order.brand || null,
      address,
      country: order.country || null,
      vat: order.vat_number || null,
    },
    lines: [{ description: label, qty: 1, unitCents: net, totalCents: net }],
    netCents: net,
    vatRate: Number(order.vat_rate) || 0,
    vatCents: vat,
    grossCents: net + vat,
    treatment: order.vat_treatment || VAT_TREATMENT.standard,
    reference: order.ref,
    paidAt: order.paid_at ? String(order.paid_at).slice(0, 10) : null,
    viesConsultation: order.vat_consultation || null,
  };
}

/*
 * Geef een factuur uit voor deze bestelling, of geef de bestaande terug.
 *
 * IDEMPOTENT. Twee keer aanroepen levert één factuur op. Dat is niet netjesheid
 * maar noodzaak: dit wordt aangeroepen vanuit de betaalwebhook, en Mollie levert
 * dezelfde melding meer dan één keer af.
 *
 * `today` komt van buiten en niet uit new Date(), zodat dit te testen is en zodat
 * de factuurdatum die van de betaling kan zijn in plaats van die van de retry.
 */
/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * NIET MEER FACTUREREN DAN ER BINNEN IS — 20 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER ZONDER DEZE CONTROLE GEBEURDE ────────────────────────────────────
 *
 * Gemeten in tests/geldroute.test.mjs: een bestelling van 123.420 cent kreeg een
 * melding van 100 cent binnen, en er ging een factuur uit voor het VOLLE bedrag,
 * met status `issued`. Het verschil van 123.320 cent stond nergens; het was alleen
 * te vinden door de betaalrij naast de factuur te leggen, en dat doet niemand uit
 * zichzelf. Een uitgereikte factuur pas je bovendien niet aan en gooi je niet weg —
 * de enige weg terug is een creditnota, voor geld dat nooit is binnengekomen.
 *
 * ── WAAROM HET NIET IN DE WEBHOOK STAAT MAAR HIER ───────────────────────────
 *
 * Er zijn twee wegen naar issueInvoice(): de webhook van Mollie, en de inhaalslag
 * in VISUAILS Studio (catchupOrder in src/lib/account.js, die draait zodra een klant
 * /account/invoices opent). De nachtelijke cron is de derde. Een controle bij één
 * aanroeper is een controle die de andere twee niet heeft — en die derde weg is
 * precies de weg die niemand voor ogen heeft als hij er een vierde bij bouwt.
 *
 * De vraag "is er genoeg binnengekomen om dit document te rechtvaardigen" hoort
 * bij de FACTUUR en niet bij de aanleiding. Dus staat hij hier, één keer.
 *
 * ── WAT ER GETELD WORDT ─────────────────────────────────────────────────────
 *
 * De som van `payments.amount_cents` voor deze bestelling, in euro's, tegenover
 * `total_cents + vat_cents` — het bruto bedrag waar Mollie ook om gevraagd is.
 * Opgeteld en niet per rij, want een bestelling kan meer dan één betaling hebben:
 * een eerste poging die mislukte en een tweede die slaagde staan er dan allebei,
 * en na een handmatige bijbetaling in het Mollie-dashboard ook.
 *
 * `refunded` telt mee als binnengekomen. Het geld ÍS geweest; dat het daarna terug
 * is gegaan, is wat de creditnota vastlegt (zie issueCreditNote hieronder). Een
 * factuur weigeren omdat er later is terugbetaald, zou de creditnota een document
 * geven om naar te verwijzen dat niet bestaat.
 *
 * Alleen EUR telt mee. Cent van een andere munt is niet dezelfde cent, en optellen
 * zou een verschil verstoppen in plaats van tonen.
 *
 * ── WAAROM ER TWEE CENT SPELING IS EN NIET NUL ──────────────────────────────
 *
 * De twee fouten zijn niet even erg. Te ruim: er gaat een factuur uit terwijl er
 * twee cent te weinig binnen is — dat merkt niemand en het kost niemand iets. Te
 * streng: een geldige factuur gaat NIET uit, de klant wacht, en Lucas ziet het pas
 * als iemand erom vraagt. Bij die verhouding hoort speling aan de ruime kant.
 *
 * Twee cent en niet meer, want de normale route klopt exact — geldroute.test.mjs
 * legt vast dat het factuurbruto gelijk is aan wat Mollie incasseerde, tot op de
 * cent. Deze speling is er voor afronding die later ergens ingeslopen zou kunnen
 * zijn, niet voor een verschil dat vandaag bestaat.
 *
 * ── WAT ER GEBEURT ALS HET NIET KLOPT ───────────────────────────────────────
 *
 * Geen factuur, geen nummer, geen pdf — en dat is met opzet de minst ingrijpende
 * uitkomst. Er wordt niets uitgegeven dat later teruggedraaid moet worden, en de
 * factuurreeks houdt geen gat over voor een document dat er nooit had moeten zijn.
 *
 * Wel een regel in `order_events`, want een console.error leest niemand terug. Die
 * regel staat in de tijdlijn van de bestelling in het adminportaal, met beide
 * bedragen erin. Eén keer: deze functie wordt bij elk bezoek aan /account/invoices
 * opnieuw geprobeerd, en een tijdlijn die elke pagina-verversing een nieuwe regel
 * krijgt is geen tijdlijn meer.
 *
 * Het herstel is handwerk, en dat hoort ook zo: iemand moet kijken wat er is
 * gebeurd. Klopt het bedrag alsnog (bijbetaling, of een betaling die alsnog is
 * binnengekomen), dan geeft de eerstvolgende inhaalslag de factuur vanzelf uit.
 */
const FACTUUR_SPELING_CENT = 2;

export async function betalingGedekt(env, order) {
  const bruto = Number(order.total_cents || 0) + Number(order.vat_cents || 0);
  const rij = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount_cents), 0) AS binnen
       FROM payments
      WHERE order_id = ?1
        AND UPPER(COALESCE(currency, 'EUR')) = 'EUR'
        AND status IN ('paid', 'refunded')`
  ).bind(order.id).first();
  const binnen = Number((rij && rij.binnen) || 0);
  return { bruto, binnen, gedekt: binnen + FACTUUR_SPELING_CENT >= bruto };
}

export async function issueInvoice(env, orderId, { today } = {}) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) throw new Error('invoice: bestelling ' + orderId + ' bestaat niet');

  const existing = await env.DB.prepare(
    'SELECT * FROM invoices WHERE order_id = ?1'
  ).bind(orderId).first();

  // Al klaar? Dan niets. Geen tweede nummer, geen tweede pdf.
  if (existing && existing.status === 'issued') return existing;

  /* ── DE DEKKINGSCONTROLE — zie de noot hierboven ─────────────────────────
     ALLEEN ALS ER NOG GEEN RIJ IS, en dat is een correctie op de eerste versie.
     Die controleerde ook bij een HERSTEL: een factuur die al een nummer heeft maar
     nog geen pdf, wordt hieronder afgemaakt uit de bewaarde momentopname. Daar is
     de vraag "is er genoeg binnen" al beantwoord, namelijk toen het nummer werd
     uitgedeeld — en een herstel weigeren laat een genummerde factuur voor altijd
     half staan en dus een gat in een reeks die geen gaten mag hebben.

     De test in tests/invoice-issue.test.mjs verhoogt tussen de twee pogingen
     `total_cents` naar 999999 om te bewijzen dat de pdf uit de momentopname komt
     en niet uit de bestelling. Precies die opzet liep hierop stuk, en dat was het
     goede signaal: de controle hoort bij het UITDELEN van een nummer.

     Vóór nextNumber(), want een geweigerde factuur mag geen nummer verbruiken. */
  const dekking = existing ? { gedekt: true } : await betalingGedekt(env, order);
  if (!dekking.gedekt) {
    const intern = `factuur tegengehouden: binnengekomen ${dekking.binnen} cent op een bestelling van ${dekking.bruto} cent`;
    console.error('[factuur] bestelling', order.ref || orderId, '—', intern);

    /* ── TWEE LEZERS, TWEE TEKSTEN ─────────────────────────────────────────
       `order_events` staat NIET alleen in het adminportaal: het klantenportaal
       (/o/<token>) en VISUAILS Studio lezen dezelfde tabel, zonder filter op
       `actor`. Wat hier komt te staan, leest de klant dus mee.

       De eerste versie zette er "factuur tegengehouden: binnengekomen 100 cent op
       een bestelling van 123420 cent" neer. Voor Lucas is dat precies de goede
       regel; voor de klant is het een alarm in vaktaal over zijn eigen betaling,
       en het eerste wat hij doet is bellen.

       Dus twee regels op twee plekken. De tijdlijn krijgt wat er aan de hand is
       in gewone taal en zonder bedragen — de klant weet dan waarom zijn factuur
       er nog niet is en dat wij het oppakken. `admin_log` krijgt de getallen,
       want daar kijkt alleen jij. */
    const zichtbaar = 'De factuur voor deze bestelling wacht nog: het betaalde bedrag komt niet overeen met het bedrag van de bestelling. We zoeken het uit en nemen contact op als dat nodig is.';
    /* Eén keer per bestelling. Deze functie wordt bij elk bezoek aan
       /account/invoices opnieuw geprobeerd, en een tijdlijn die bij elke
       pagina-verversing een regel krijgt is geen tijdlijn meer. */
    const al = await env.DB.prepare(
      'SELECT id FROM order_events WHERE order_id = ?1 AND note = ?2 LIMIT 1'
    ).bind(order.id, zichtbaar).first();
    if (!al) {
      await env.DB.prepare(
        'INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, ?4)'
      ).bind(order.id, order.status || 'received', zichtbaar, 'system').run();
      await env.DB.prepare(
        `INSERT INTO admin_log (admin_id, admin_email, action, order_id, customer_id, detail)
         VALUES (NULL, NULL, 'invoice.blocked', ?1, ?2, ?3)`
      ).bind(order.id, order.customer_id || null, intern).run().catch(() => {});
    }
    return null;
  }

  const date = String(today || order.paid_at || '').slice(0, 10) || null;
  if (!date) throw new Error('invoice: geen datum voor bestelling ' + orderId);
  const year = Number(date.slice(0, 4));

  // Bestaat er al een nummer maar geen pdf, dan gebruiken we DAT nummer opnieuw.
  // Een tweede uitgeven zou een gat in de reeks achterlaten op de plek van de
  // eerste poging.
  let row = existing;
  if (!row) {
    const seq = await nextNumber(env, year);
    const number = formatNumber(year, seq);
    const snap = snapshotFromOrder(order, env, { number, date });
    try {
      await env.DB.prepare(
        `INSERT INTO invoices (number, year, seq, order_id, customer_id, status, snapshot_json, lang)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6, ?7)`
      ).bind(number, year, seq, orderId, order.customer_id || null,
             JSON.stringify(snap), snap.lang).run();
    } catch (e) {
      /* `invoices.order_id` is UNIQUE, en dat is precies de bedoeling: twee
         gelijktijdige aanroepen — twee tabbladen op /account/invoices, allebei
         catchupOrder() — leveren één factuur op. De verliezer gooide hier echter,
         en dat is de verkeerde uitkomst: de winnaar heeft een geldige factuur
         gemaakt, dus hoort de verliezer díé terug te geven in plaats van een
         fout. Zijn eigen nummer gaat terug in de reeks. */
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
      await geefNummerTerug(env, year, seq);
      console.log('[factuur] gelijktijdige uitgifte voor bestelling', orderId, '— nummer', number, 'teruggegeven');
    }
    row = await env.DB.prepare('SELECT * FROM invoices WHERE order_id = ?1').bind(orderId).first();
  }

  // De pdf uit de BEWAARDE momentopname, niet uit de order. Bij een tweede poging
  // moet er hetzelfde uitkomen, ook als de bestelling inmiddels is bijgewerkt.
  const snap = JSON.parse(row.snapshot_json);
  const pdf = await renderInvoicePdf(snap);
  const key = `invoices/${row.year}/${row.number}.pdf`;

  await env.UPLOADS.put(key, pdf, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { invoice: row.number, order: String(orderId) },
  });

  await env.DB.prepare(
    `UPDATE invoices
        SET status = 'issued', pdf_key = ?1, pdf_bytes = ?2, issued_at = datetime('now')
      WHERE id = ?3 AND status = 'pending'`
  ).bind(key, pdf.length, row.id).run();

  return await env.DB.prepare('SELECT * FROM invoices WHERE id = ?1').bind(row.id).first();
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE FACTUUR VOOR EEN ABONNEMENTSTERMIJN — 20 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Een maandelijkse incasso landde in `subscription_payments` en verder nergens.
 * Geen document, geen nummer, niets in de boekhouding — terwijl een terugkerende
 * zakelijke afschrijving in Nederland net zo goed een factuur nodig heeft als een
 * losse bestelling. Zie de kop van migrations/0032-abonnementsfacturen.sql voor
 * waarom dit een eigen tabel is met een nummer uit dezelfde reeks.
 *
 * ── WAT ER ANDERS IS DAN BIJ EEN BESTELLING ─────────────────────────────────
 *
 * Drie dingen, en alle drie maken het EENVOUDIGER:
 *
 *   1  Er is geen dekkingsvraag. Bij een bestelling kan het bedrag dat Mollie
 *      meldt afwijken van wat er besteld is (zie betalingGedekt hierboven). Hier
 *      niet: het factuurbedrag ÍS wat er geïncasseerd is. Er valt niets te
 *      vergelijken, dus staat er ook geen controle.
 *
 *   2  De btw wordt uit het bruto gerekend en niet eroverheen. Het bedrag dat de
 *      klant ziet en betaalt is het planbedrag; dat is dus inclusief. Dezelfde
 *      rekenwijze als quoteTestSample() in quote.js, met het afronden op het
 *      NETTO zodat netto + btw altijd optelt tot precies het geïncasseerde bedrag.
 *      Een factuur waarvan de regels niet optellen tot het totaal is een factuur
 *      die je opnieuw moet maken.
 *
 *   3  De behandeling komt van het ABONNEMENT en niet van deze termijn. Vastgelegd
 *      toen het abonnement werd afgesloten, want dat is het moment dat de klant
 *      door de VIES-controle en de poort ging. Zie de noot in de migratie over
 *      waarom er niet elke maand opnieuw gekeken wordt.
 *
 * ── IDEMPOTENT, EN DE DATABASE BEWAAKT HET ──────────────────────────────────
 *
 * `subscription_invoices.subscription_payment_id` is UNIQUE. Twee facturen op één
 * incasso kan dus niet, ook niet als Mollie dezelfde melding drie keer aflevert en
 * twee daarvan tegelijk binnenkomen. De controle hieronder vangt het gewone geval
 * af; de sleutel vangt de race.
 */

/** De momentopname voor één abonnementstermijn. Zelfde vorm als snapshotFromOrder(). */
export function snapshotFromSubscription({ sub, customer, payment, month, lang: taal }, env, { number, date } = {}) {
  /* DE TAAL KOMT NIET VAN `customer.lang` — die kolom bestaat niet. `customers`
     heeft e-mail, naam, merk, adres, land en btw-nummer, en verder niets over
     taal (zie schema.sql). De vergelijking was daarmee altijd
     `undefined === 'en'`, dus stond er op élke abonnementsfactuur Nederlands,
     ook voor een klant die de hele site in het Engels gebruikt en van wie de
     bestelfacturen wél Engels zijn — uit dezelfde nummerreeks.

     De aanroeper geeft de taal nu mee; die haalt hem uit de laatste bestelling
     van deze klant, want `orders.lang` is de enige plek waar de site de
     taalkeuze van een klant echt vastlegt. */
  const lang = taal === 'en' ? 'en' : 'nl';
  const gross = Math.max(0, Math.round(Number(payment && payment.amount_cents) || 0));

  /* Het tarief van het abonnement, met 21% Nederlands als terugval. NULL betekent
     "nog niet vastgelegd" — een abonnement van vóór migratie 0032 — en dan is de
     veilige kant het hoge tarief: te weinig btw rekenen is een naheffing, te veel
     is een correctie. */
  const treatment = (sub && sub.vat_treatment) || VAT_TREATMENT.standard;
  /* Alleen het standaardtarief draagt btw; verlegd (art. 196) en buiten de
     EU-heffing zijn allebei 0%. Op de behandeling vergelijken en niet op het
     tarief: een `vat_rate` van 0 op een standaardbehandeling is een lege kolom
     en geen fiscaal standpunt, en dan hoort 21% te gelden.

     LET OP DE WAARDE. VAT_TREATMENT.standard is de string 'nl_standard' en niet
     'standard' — dat verschil kostte hier een testronde: de vergelijking faalde
     stil, het tarief werd 0 en er kwam een factuur zonder btw uit. Vandaar dat
     hier de constante staat en nooit een letterlijke tekst. */
  const draagtBtw = treatment === VAT_TREATMENT.standard;
  const rate = draagtBtw
    ? (Number(sub && sub.vat_rate) > 0 ? Number(sub.vat_rate) : VAT_RATE)
    : 0;

  const net = rate > 0 ? Math.round(gross / (1 + rate)) : gross;
  const vat = gross - net;

  /* ── NIET composeAddress(addressFrom(...)) ────────────────────────────────
     Dat was een typefout met een stille uitkomst. addressFrom() geeft een
     ARRAY van regels terug (hij is er voor SELLER_ADDRESS, één tekstveld met
     scheidingstekens); composeAddress() verwacht een object met line1, line2,
     postal, city en region. Een array heeft die velden niet, dus werden ze
     allemaal undefined, gaf composeAddress() null terug, en ging élke
     abonnementsfactuur de deur uit zonder adresregel — met alleen een naam.
     Een Nederlandse factuur hoort het adres van de ontvanger te dragen.

     `customers.billing_address` IS al een samengesteld adres van meerdere
     regels (zie de kolom in schema.sql en account.js, dat hem met \n opbouwt),
     dus hier hoeft er niets samengesteld te worden: alleen gesplitst. */
  const address = String((customer && customer.billing_address) || '')
    .split('\n').map((l) => l.trim()).filter(Boolean);

  /* "Starter — abonnement augustus 2026". De maand staat erop omdat dat is waar
     een boekhouder op zoekt; een nummer zegt hem niets over de periode. */
  const naam = planName(sub && sub.plan, lang) || (sub && sub.plan) || 'Abonnement';
  const periode = maandLabel(month, lang);
  const label = lang === 'nl'
    ? `${naam} — abonnement${periode ? ` ${periode}` : ''}`
    : `${naam} — subscription${periode ? ` ${periode}` : ''}`;

  return {
    number,
    date,
    dueDate: null,
    lang,
    seller: sellerOf(env),
    customer: {
      name: (customer && customer.name) || '',
      company: (customer && customer.brand) || null,
      address,
      country: (customer && (customer.country || sub?.vat_country)) || null,
      vat: (customer && customer.vat_number) || (sub && sub.vat_number) || null,
    },
    lines: [{ description: label, qty: 1, unitCents: net, totalCents: net }],
    netCents: net,
    vatRate: rate,
    vatCents: vat,
    grossCents: gross,
    treatment,
    reference: (sub && sub.ref) || null,
    paidAt: date,
    viesConsultation: null,
  };
}

/** 'augustus 2026' / 'August 2026' uit 'YYYY-MM'. Leeg als er geen maand bekend is. */
function maandLabel(month, lang) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
  if (!m) return '';
  const nl = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const en = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const namen = lang === 'en' ? en : nl;
  return `${namen[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

/**
 * Geef een factuur uit voor één abonnementsafschrijving, of geef de bestaande terug.
 *
 * `today` komt van buiten en niet uit new Date(), om dezelfde reden als bij
 * issueInvoice(): dan is het te testen en is de factuurdatum die van de incasso.
 */
export async function issueSubscriptionInvoice(env, subscriptionPaymentId, { today } = {}) {
  const betaling = await env.DB.prepare(
    'SELECT * FROM subscription_payments WHERE id = ?1'
  ).bind(subscriptionPaymentId).first();
  if (!betaling) throw new Error('factuur: abonnementsbetaling ' + subscriptionPaymentId + ' bestaat niet');

  /* Alleen geld dat binnen is. `refunded` telt mee om dezelfde reden als bij een
     bestelling: het geld ÍS geweest, en de weg terug is een creditnota die naar
     een bestaande factuur moet kunnen verwijzen. */
  if (betaling.status !== 'paid' && betaling.status !== 'refunded') return null;
  if (!(Number(betaling.amount_cents) > 0)) {
    console.log('[factuur] abonnementsbetaling', betaling.external_id, 'heeft geen bedrag — geen factuur');
    return null;
  }
  if (String(betaling.currency || 'EUR').toUpperCase() !== 'EUR') {
    console.error('[factuur] abonnementsbetaling', betaling.external_id, 'in', betaling.currency, '— geen factuur, dit is handwerk');
    return null;
  }

  const bestaand = await env.DB.prepare(
    'SELECT * FROM subscription_invoices WHERE subscription_payment_id = ?1'
  ).bind(subscriptionPaymentId).first();
  if (bestaand && bestaand.status === 'issued') return bestaand;

  const sub = await env.DB.prepare(
    'SELECT * FROM subscriptions WHERE id = ?1'
  ).bind(betaling.subscription_id).first();
  if (!sub) throw new Error('factuur: abonnement ' + betaling.subscription_id + ' bestaat niet');

  const customer = await env.DB.prepare(
    'SELECT * FROM customers WHERE id = ?1'
  ).bind(sub.customer_id).first();

  /* De taal van de klant, uit zijn laatste bestelling. `customers` heeft geen
     taalkolom en het abonnement ook niet; `orders.lang` is de enige plek waar
     de keuze van de bezoeker bewaard blijft. Geen bestelling gevonden — bij een
     abonnee vrijwel uitgesloten, want er gaat er altijd één aan vooraf — dan
     Nederlands, net als overal elders in dit bestand. */
  const taalRij = sub.customer_id
    ? await env.DB.prepare(
        `SELECT lang FROM orders
          WHERE customer_id = ?1 AND lang IS NOT NULL
          ORDER BY id DESC LIMIT 1`
      ).bind(sub.customer_id).first().catch(() => null)
    : null;
  const taal = (taalRij && taalRij.lang) === 'en' ? 'en' : 'nl';

  const date = String(today || betaling.created_at || '').slice(0, 10) || null;
  if (!date) throw new Error('factuur: geen datum voor abonnementsbetaling ' + subscriptionPaymentId);
  const year = Number(date.slice(0, 4));

  let row = bestaand;
  if (!row) {
    const seq = await nextNumber(env, year);
    const number = formatNumber(year, seq);
    const snap = snapshotFromSubscription(
      { sub, customer, payment: betaling, month: betaling.month, lang: taal }, env, { number, date }
    );
    try {
      await env.DB.prepare(
        `INSERT INTO subscription_invoices
           (number, year, seq, subscription_id, subscription_payment_id, customer_id, month, status, snapshot_json, lang)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', ?8, ?9)`
      ).bind(number, year, seq, sub.id, subscriptionPaymentId, sub.customer_id || null,
             betaling.month || null, JSON.stringify(snap), snap.lang).run();
    } catch (e) {
      /* Zie de gelijkluidende noot in issueInvoice(): de UNIQUE sleutel op
         subscription_payment_id is de idempotentie, en de verliezer van een race
         hoort de factuur van de winnaar terug te geven — niet te gooien en zijn
         nummer mee te nemen. */
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
      await geefNummerTerug(env, year, seq);
      console.log('[factuur] gelijktijdige uitgifte voor abonnementsbetaling', subscriptionPaymentId, '— nummer', number, 'teruggegeven');
    }
    row = await env.DB.prepare(
      'SELECT * FROM subscription_invoices WHERE subscription_payment_id = ?1'
    ).bind(subscriptionPaymentId).first();
  }

  const snap = JSON.parse(row.snapshot_json);
  const pdf = await renderInvoicePdf(snap);
  const key = `invoices/${row.year}/${row.number}.pdf`;

  await env.UPLOADS.put(key, pdf, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { invoice: row.number, subscription: String(sub.ref || sub.id) },
  });

  await env.DB.prepare(
    `UPDATE subscription_invoices
        SET status = 'issued', pdf_key = ?1, pdf_bytes = ?2, issued_at = datetime('now')
      WHERE id = ?3 AND status = 'pending'`
  ).bind(key, pdf.length, row.id).run();

  return await env.DB.prepare('SELECT * FROM subscription_invoices WHERE id = ?1').bind(row.id).first();
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE CREDITNOTA — 12 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Dit bestand kende het woord "refund" niet. De webhook boekte een terugbetaling wel
 * (`orders.refunded_cents`), maar de uitgereikte factuur bleef op het volle bedrag
 * staan. Vanaf de eerste terugbetaling stond er dus een factuur van bijvoorbeeld
 * € 1.101,10 tegenover geld dat terug is.
 *
 * Een uitgereikte factuur pas je niet aan en gooi je niet weg. De weg terug is een
 * creditnota: een eigen document, met een eigen nummer uit DEZELFDE reeks, dat naar de
 * originele factuur verwijst. Zie migrations/0026-credit-notes.sql voor waarom dat een
 * eigen tabel is en niet een kolom in `invoices`.
 *
 * ── DE INHOUD IS AFGELEID EN NIET BEDACHT ───────────────────────────────────
 *
 * De nota komt volledig uit de BEWAARDE momentopname van de originele factuur,
 * geschaald naar het terugbetaalde deel. Dat is geen gemak maar de enige verdedigbare
 * bron: het btw-tarief, de behandeling (standaard, verlegd, buiten de EU-btw), het
 * adres en de dienstnaam zijn wat er op de factuur stónd, niet wat de prijslijst er
 * vandaag van zou maken.
 *
 * Daarmee is dit ook géén nieuw fiscaal standpunt. Was de factuur 21%, dan wordt de
 * btw proportioneel meegecrediteerd. Was hij 0% verlegd, dan blijft de creditnota 0%
 * verlegd. Dat volgt uit de factuur zelf.
 *
 * ── DE BEWAKING TEGEN DUBBEL CREDITEREN STAAT OP HET BEDRAG ─────────────────
 *
 * `credit_notes` heeft met opzet GEEN unieke sleutel op invoice_id: een bestelling kan
 * twee keer gedeeltelijk terugbetaald worden — eerst € 200, later nog € 100 — en dan
 * zijn dat twee nota's op één factuur. De bewaking is dus niet "bestaat er al een
 * nota" maar "hoeveel is er al gecrediteerd": deze functie telt dat op en geeft alleen
 * het VERSCHIL uit.
 *
 * Dat is precies de vorm die de webhook nodig heeft. Mollie's `amountRefunded` is een
 * doorlopend totaal en dezelfde melding komt meer dan één keer aan; twee keer
 * aanroepen met hetzelfde totaal levert daarom één nota op, en een verhoging van dat
 * totaal levert een tweede nota op voor alleen de verhoging. Dezelfde afspraak als
 * issueInvoice() hierboven, om dezelfde reden.
 */

/**
 * De momentopname voor een creditnota, uit die van de factuur.
 *
 * `netCents` is het bedrag dat deze nota crediteert, exclusief btw. De btw wordt in
 * dezelfde verhouding gecrediteerd als op de factuur, en het afronden gebeurt op de
 * BTW en niet op het totaal: dan telt netto + btw altijd op tot het bruto dat er staat.
 * Een creditnota waarvan de regels niet optellen tot het totaal is een creditnota die
 * je opnieuw moet maken.
 */
export function creditSnapshotFrom(invoiceSnap, { number, date, netCents, grossCents = null, reason = null }) {
  const src = invoiceSnap || {};
  const net = Math.max(0, Math.round(Number(netCents) || 0));
  const rate = Number(src.vatRate) || 0;
  /*
   * ── DE BTW IS HET VERSCHIL EN NIET EEN TWEEDE BEREKENING — 12 augustus 2026 ──
   *
   * Dit stond hier als `Math.round(net * rate)`, en de test met een terugbetaling van
   * € 123,45 kwam terug met een nota van € 123,44: netto werd afgerond uit de
   * verhouding, de btw werd daarna nóg eens afgerond, en de som miste een cent.
   *
   * Eén cent klinkt onschuldig en is het niet. issueCreditNote() telt op wat er al
   * gecrediteerd is om te bepalen wat er nog mag; is de som van de nota's structureel
   * een cent lager dan wat er terugbetaald is, dan blijft er per bestelling een restje
   * "nog te crediteren" open staan. En op het document zelf tellen de regels dan niet
   * op tot het totaal, wat de eerste vraag is die een boekhouder stelt.
   *
   * Dus: als de aanroeper het brutobedrag weet — en dat weet hij, want dat is precies
   * wat er is terugbetaald — dan is de btw het VERSCHIL. Dan klopt netto + btw = bruto
   * per definitie, en zit de afronding op één plek in plaats van op twee. Zonder bruto
   * valt hij terug op de berekening uit het tarief; dat pad is er voor aanroepers die
   * alleen een nettobedrag hebben.
   */
  const vat = grossCents === null
    ? Math.round(net * rate)
    : Math.max(0, Math.round(Number(grossCents) || 0) - net);
  const lang = src.lang === 'en' ? 'en' : 'nl';
  /* Het hele bedrag terug of een deel? Dat staat in de omschrijving, want een regel
     "Catalog — 12 producten" op een creditnota van € 200 terwijl de factuur € 1.100 was,
     leest als een fout. */
  const full = net >= (Number(src.netCents) || 0);
  const first = (src.lines && src.lines[0]) || {};
  const base = String(first.description || src.reference || '').trim();
  const suffix = lang === 'nl'
    ? (full ? ' — volledig gecrediteerd' : ' — gedeeltelijk gecrediteerd')
    : (full ? ' — credited in full' : ' — partially credited');

  return {
    ...src,
    kind: 'credit',
    number,
    date,
    /* Een creditnota is geen betalingsverzoek, dus geen vervaldatum. Die staat er wel
       bij een factuur, en een lege vervaldatum op een creditnota is niet "vergeten"
       maar het juiste antwoord. */
    dueDate: null,
    /* `paidAt` van de FACTUUR mag hier niet blijven staan. Dat is de datum waarop de
       klant betaalde, en op een creditnota leest die als de datum waarop hij zijn geld
       terugkreeg — een datum die er geloofwaardig uitziet en het verkeerde ding zegt.
       De terugbetaaldatum is de datum van deze nota zelf, en die staat er al. */
    paidAt: null,
    creditsNumber: src.number || null,
    creditsDate: src.date || null,
    reason: reason || null,
    lines: [{ description: base + suffix, qty: 1, unitCents: net, totalCents: net }],
    netCents: net,
    vatCents: vat,
    grossCents: net + vat,
  };
}

/**
 * Geef een creditnota uit voor wat er van deze bestelling is terugbetaald.
 *
 * `refundedGrossCents` is het doorlopende TOTAAL dat is terugbetaald — precies wat
 * Mollie's amountRefunded zegt en wat in orders.refunded_cents staat. Deze functie
 * rekent zelf uit wat daar nog niet voor gecrediteerd is.
 *
 * Geeft de nieuwe nota terug, of null als er niets te crediteren was. Een null is dus
 * een geldige, veelvoorkomende uitkomst en geen fout: de tweede aflevering van
 * dezelfde webhookmelding komt hier ook langs.
 */
export async function issueCreditNote(env, orderId, { refundedGrossCents, reason = null, today } = {}) {
  const wantGross = Math.max(0, Math.floor(Number(refundedGrossCents) || 0));
  if (!wantGross) return null;

  const invoice = await env.DB.prepare(
    "SELECT * FROM invoices WHERE order_id = ?1 AND status = 'issued'"
  ).bind(orderId).first();
  /*
   * GEEN FACTUUR, GEEN CREDITNOTA, en dat is geen tekortkoming.
   *
   * Je kunt niet crediteren wat nooit is uitgereikt. Bij een proefvisual van € 1 gebeurt
   * dit standaard: de webhook slaat het factureren daar over omdat het fiscale standpunt
   * over die euro nog niet genomen is. Een creditnota op een factuur die niet bestaat zou
   * een document met een nummer zijn dat naar niets verwijst — erger dan geen document.
   *
   * De terugbetaling zelf is niet onzichtbaar: die staat in orders.refunded_cents, op de
   * tijdlijn en in het adminscherm.
   */
  if (!invoice) return null;

  const snap = JSON.parse(invoice.snapshot_json || '{}');
  const invNet = Math.max(0, Math.floor(Number(snap.netCents) || 0));
  const invGross = Math.max(0, Math.floor(Number(snap.grossCents) || invNet));
  if (!invGross) return null;

  /* Wat er al gecrediteerd is — over ALLE nota's op deze factuur, ook de nota's die nog
     op 'pending' staan. Een nota zonder pdf heeft zijn nummer al en crediteert dus al;
     hem hier niet meetellen zou bij een mislukte pdf een tweede nota voor hetzelfde geld
     opleveren. 'void' telt niet mee, want dat is een ingetrokken nota. */
  const done = await env.DB.prepare(
    "SELECT COALESCE(SUM(gross_cents), 0) AS g FROM credit_notes WHERE invoice_id = ?1 AND status <> 'void'"
  ).bind(invoice.id).first();
  const already = Math.max(0, Math.floor(Number(done?.g) || 0));

  /* Nooit meer crediteren dan er op de factuur stond. Mollie kan in theorie niet meer
     terugbetalen dan er betaald is, maar een factuur en een betaling zijn twee
     verschillende bedragen zodra er ooit met de hand iets is bijgeboekt. Een creditnota
     die de factuur overschrijdt is een negatief resultaat uit het niets. */
  const room = Math.max(0, Math.min(wantGross, invGross) - already);
  if (!room) return null;

  /* Van bruto naar netto met de verhouding van de factuur zelf, en niet met het
     btw-tarief: bij een verlegde factuur is de btw 0 en zijn netto en bruto gelijk, en
     bij 21% is de verhouding precies wat er op de factuur staat. Zo klopt een volledige
     creditnota tot op de cent met de factuur. */
  const net = room >= invGross ? invNet : Math.round((room * invNet) / invGross);

  const date = String(today || '').slice(0, 10) || new Date().toISOString().slice(0, 10);
  const year = Number(date.slice(0, 4));
  const seq = await nextNumber(env, year);
  const number = formatNumber(year, seq);
  const creditSnap = creditSnapshotFrom(snap, { number, date, netCents: net, grossCents: room, reason });

  await env.DB.prepare(
    `INSERT INTO credit_notes
       (number, year, seq, invoice_id, order_id, customer_id, net_cents, vat_cents, gross_cents,
        reason, status, snapshot_json, lang)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pending', ?11, ?12)`
  ).bind(
    number, year, seq, invoice.id, orderId, invoice.customer_id || null,
    creditSnap.netCents, creditSnap.vatCents, creditSnap.grossCents,
    reason || null, JSON.stringify(creditSnap), creditSnap.lang
  ).run();

  const row = await env.DB.prepare('SELECT * FROM credit_notes WHERE number = ?1').bind(number).first();
  return await renderCreditPdf(env, row);
}

/**
 * De pdf van een creditnota maken en wegzetten. Losse functie, want de nachtelijke taak
 * gebruikt hem ook: blijft een nota op 'pending' staan omdat R2 even niet meewerkte, dan
 * pakt cron/index.js hem op met HETZELFDE nummer.
 */
export async function renderCreditPdf(env, row) {
  if (!row) return null;
  const snap = JSON.parse(row.snapshot_json || '{}');
  const pdf = await renderInvoicePdf(snap);
  const key = `credit-notes/${row.year}/${row.number}.pdf`;

  await env.UPLOADS.put(key, pdf, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { credit: row.number, invoice: String(row.invoice_id), order: String(row.order_id) },
  });

  await env.DB.prepare(
    `UPDATE credit_notes
        SET status = 'issued', pdf_key = ?1, pdf_bytes = ?2, issued_at = datetime('now')
      WHERE id = ?3 AND status = 'pending'`
  ).bind(key, pdf.length, row.id).run();

  return await env.DB.prepare('SELECT * FROM credit_notes WHERE id = ?1').bind(row.id).first();
}
