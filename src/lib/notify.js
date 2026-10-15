/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE DRIE BERICHTEN AAN DE STUDIO DIE ER NOG NIET WAREN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER MIS WAS, 9 AUGUSTUS 2026 ─────────────────────────────────────────
 *
 * Bij het nalopen van elke mailroute bleek er een scheve verdeling. Een geplaatste
 * bestelling mailt de studio wel (functions/api/order.js:700). Daarna niets meer:
 *
 *   · EEN GESLAAGDE BETALING mailde alleen de klant (src/lib/invoiceMail.js:193).
 *     Lucas hoorde niets, dus de enige manier om te weten dat er geld binnen was,
 *     was het dashboard openen.
 *   · EEN MISLUKTE OF VERLOPEN BETALING deed helemaal niets. De webhook logde het
 *     en liet het vallen — geen mail, geen markering. Een klant die afhaakte in het
 *     betaalscherm was onzichtbaar.
 *   · EEN REVISIEVERZOEK stuurde geen enkel bericht. Beide routes (portal.js en
 *     account.js) schreven netjes naar de database en zwegen. Een klant die om elf
 *     uur 's avonds een revisie aanvraagt, produceerde geen signaal.
 *
 * Op dit volume is dat te overzien. Bij tien bestellingen per week is het de manier
 * waarop je een betaalde bestelling drie dagen laat liggen — en dat is precies wat
 * /studio als pagina belooft dat niet gebeurt.
 *
 * ── DEZE DRIE EN NIET MEER ──────────────────────────────────────────────────
 *
 * De grens is: een bericht per gebeurtenis waarop JIJ moet handelen. Een statuswissel
 * die jij zelf net hebt gemaakt, hoort niet gemaild te worden; dat is een echo. Een
 * geslaagde betaling wél, want daarna mag het werk beginnen.
 *
 * ── ALLEEN NAAR DE STUDIO ───────────────────────────────────────────────────
 *
 * Geen van deze drie berichten gaat naar de klant. De klant heeft VISUAILS Studio,
 * waar dezelfde gebeurtenis op zijn tijdlijn staat op het moment dat hij gebeurt.
 * /studio en /portal zeggen met zoveel woorden dat er GEEN bericht naar de klant gaat
 * bij een statuswissel — dat is een bewuste belofte, en die blijft staan.
 *
 * ── MISLUKKEN MAG NOOIT DE HANDELING RAKEN ──────────────────────────────────
 *
 * Elk bericht zit in zijn eigen try en geeft niets terug. Een revisieverzoek van een
 * klant mag niet omvallen omdat Resend even niet bereikbaar is, en een betaling die
 * binnenkomt mag niet mislukken omdat de mail erover mislukt. Zelfde afspraak als
 * notifyStudio() in feedback.js, en om dezelfde reden.
 */

import { serviceLabel } from '../data/services.js';
import { sendMail } from './mail.js';
import { shell, h1, p as mailP, rows as rijenHtml, quote as quoteHtml, statusPil, bedrag as mailBedrag, datum, esc } from './mailTemplate.js';
/* De klant bereiken bij een open betaling of een mislukte incasso (punt 7.05,
   8 oktober 2026): de knop met de vaste tekst, Bellen voorop bij een
   Nederlandse klant. Zie src/lib/waLink.js. */
import { button as mailKnop, linkLine } from './mailTemplate.js';
import { waLink, contactMail } from './waLink.js';
import { CREDITS_GELDIG_MAANDEN } from '../data/pricing.js';
import { vakNaam } from '../data/levervakken.js';
import { SHOTS } from '../data/shots.js';

/* ── WAARDEN IN DE STUDIOMAIL WORDEN ONTSNAPT — 29 september 2026 ──────────
   rows() en quote() uit mailTemplate.js nemen HTML aan. Hier gingen merknamen,
   e-mailadressen, telefoonnummers, productnamen en de toelichting van de klant
   er rauw in: een merk dat "<b>" heet, of een toelichting met een link erin,
   kwam als opmaak in jouw mailbox. Nu is elke waarde tekst, tenzij hij als
   { html } wordt meegegeven (de statuspil). */
const mailRows = (pairs) => rijenHtml(pairs.map(([k, v]) => [k,
  v && typeof v === 'object' && 'html' in v ? v.html : (v === null || v === undefined || v === '' ? v : esc(v))]));
const mailQuote = (tekst) => quoteHtml(esc(tekst));

/** De bestelling erbij halen, zodat een mail bruikbaar is zonder eerst te zoeken. */
async function orderFor(env, orderId) {
  try {
    return await env.DB.prepare(
      /* `phone` staat er sinds 11 aug 2026 bij, voor het bericht over een
         tegengehouden tweede proefvisual: dat bericht is uitdrukkelijk bedoeld om
         Lucas te laten BELLEN, en een telefoonnummer dat je er zelf bij moet
         zoeken is een telefoonnummer dat niet gebeld wordt. */
      `SELECT id, ref, service, details_json, email, phone, brand, first_name, last_name, name,
              product_count, total_cents, vat_cents, country, window_start, window_end,
              /* Voor de vaste tekst aan de klant (7.05): taal, betaalklok en het
                 nummer van de klant als de bestelling er geen heeft. */
              lang, created_at, review_state, reviewed_at, payment_status, status,
              (SELECT c.phone FROM customers c WHERE c.id = orders.customer_id) AS c_phone,
              (SELECT c.country FROM customers c WHERE c.id = orders.customer_id) AS c_country
         FROM orders WHERE id = ?1`
    ).bind(orderId).first();
  } catch {
    return null;
  }
}

const who = (o) => o?.brand
  || [o?.first_name, o?.last_name].filter(Boolean).join(' ')
  || o?.name || o?.email || '—';

const cents = (v) => mailBedrag(v, 'nl');
/* Mollie's statuswoorden in het Nederlands, voor de studiomail. */
const mollieWoord = (w) => ({ expired: 'verlopen', canceled: 'afgebroken', cancelled: 'afgebroken', failed: 'mislukt', open: 'open', pending: 'in behandeling', paid: 'betaald', authorized: 'geautoriseerd' })[String(w || '').toLowerCase()] || w;

/** Eén plek voor de vraag "kan en mag ik mailen". */
function canMail(env) {
  return Boolean(env?.RESEND_API_KEY && (env.NOTIFY_EMAIL || 'hello@visuails.com'));
}

async function toStudio(env, subject, body, replyTo = '') {
  if (!canMail(env)) return;
  await sendMail(env, {
    to: env.NOTIFY_EMAIL || 'hello@visuails.com',
    replyTo,
    subject,
    /* Altijd Nederlands: deze drie berichten gaan naar één lezer en die is
       Nederlands. De taal van de KLANT hoort bij de mails aan de klant. */
    html: shell({ lang: 'nl', preheader: subject, body }),
  });
}

/**
 * Er is betaald.
 *
 * Het BEDRAG staat in de mail en niet alleen de referentie, want dit is het bericht
 * dat je 's ochtends op je telefoon leest en waarvan je wil weten of het de kleine of
 * de grote bestelling was. Het venster staat erbij als er een is: dan weet je meteen
 * of dit werk is dat een datum heeft.
 */
export async function notifyPaid(env, orderId) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    const gross = (Number(o?.total_cents) || 0) + (Number(o?.vat_cents) || 0);
    await toStudio(env, `Betaald · ${ref} · ${cents(gross)}`, [
      h1('Er is betaald', ref),
      mailRows([
        ['Bestelling', ref],
        ['Klant', who(o)],
        ['E-mail', o?.email || ''],
        ['Dienst', serviceLabel(o?.service, 'nl') || o?.service || ''],
        ['Producten', String(o?.product_count ?? '')],
        ['Bedrag', `${cents(o?.total_cents)} excl. btw · ${cents(gross)} totaal`],
        ['Venster', o?.window_start ? `${o.window_start}${o.window_end ? ` – ${o.window_end}` : ''}` : 'geen vastgelegde datum'],
      ]),
      mailP('Het werk kan beginnen. De klant krijgt de betaalbevestiging met factuur (of zonder, als die nog niet klaar is) apart.'),
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] betaald-bericht niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/**
 * De betaling is mislukt, afgebroken of verlopen.
 *
 * DIT IS GEEN FOUT EN DE MAIL ZEGT DAT OOK. Iemand die het betaalscherm sluit, is
 * meestal geen afhaker maar iemand die zijn zakelijke rekening niet bij de hand had.
 * Wat de mail doet is je de kans geven om er één keer achteraan te gaan, en dat is
 * precies de kans die er tot nu toe niet was — het viel stil in een log.
 *
 * `reason` is wat Mollie zei. Die gaat mee zoals hij is: 'expired' en 'canceled' zijn
 * verschillende gesprekken.
 */
export async function notifyPaymentFailed(env, orderId, reason = '') {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    await toStudio(env, `Betaling niet gelukt · ${ref}`, [
      h1('Een betaling is niet doorgegaan', ref),
      mailRows([
        ['Bestelling', ref],
        ['Klant', who(o)],
        ['E-mail', o?.email || ''],
        ['Wat Mollie zei', mollieWoord(reason) || 'onbekend'],
        ['Bedrag', cents((Number(o?.total_cents) || 0) + (Number(o?.vat_cents) || 0))],
      ]),
      mailP('De bestelling staat nog op onbetaald en de klant kan het opnieuw proberen '
        + 'in VISUAILS Studio. Meestal is dit geen afhaker maar iemand die zijn '
        + 'zakelijke rekening niet bij de hand had — één bericht lost het vaak op.'),
      /* 7.05, moment 1: de knop met de vaste tekst (betaling staat open). Niet bij
         een bestelling die inmiddels betaald of geannuleerd is. */
      o && o.payment_status !== 'paid' && o.status !== 'cancelled'
        ? contactMail(waLink('betaling', { ...o, country: o.country || o.c_country }), { wie: who(o), knop: mailKnop, regel: linkLine })
        : '',
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] mislukte-betaling-bericht niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/*
 * ── EEN BETALING DIE ER NIET HAD MOETEN ZIJN — 1 oktober 2026 (ronde 8) ──────
 *
 * Twee gevallen die de webhook tot vandaag stil liet gaan: een tweede betaling
 * op een bestelling die al betaald was (een open kaarttab plus de link uit de
 * mail), en een betaling op een bestelling die al geannuleerd was. Het geld is
 * binnen en wordt automatisch teruggestort; dit bericht zegt dat, of dat het
 * met de hand moet.
 */
export async function notifyOngewensteBetaling(env, { orderId, soort, betaalId, bedragCents, teruggestort }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    const wat = soort === 'geannuleerd' ? 'Betaling op een geannuleerde bestelling' : 'Dubbel betaald';
    await toStudio(env, `${wat} · ${ref} · ${cents(bedragCents)}`, [
      h1(wat, ref),
      mailRows([
        ['Bestelling', ref],
        ['Klant', who(o)],
        ['E-mail', o?.email || ''],
        ['Betaling', betaalId || ''],
        ['Bedrag', cents(bedragCents)],
        ['Terugstorting', teruggestort ? 'automatisch gestart' : 'NIET gelukt — doe het met de hand in Mollie'],
      ]),
      mailP(soort === 'geannuleerd'
        ? 'De bestelling blijft geannuleerd en staat niet op betaald. De klant heeft een mail gekregen dat het geld teruggaat.'
        : 'De bestelling was al betaald; deze tweede betaling hoort er niet bij. De klant heeft een mail gekregen dat het geld teruggaat.'),
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] bericht over ongewenste betaling niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/*
 * ── TERUGBOEKING (CHARGEBACK) — ronde 9, F62 ────────────────────────────────
 *
 * Mollie zet een betaling bij een chargeback NIET op een andere status: hij
 * blijft 'paid', met `amountChargedBack` erbij, en dezelfde webhook komt
 * opnieuw. Die viel hier als "dubbele aflevering" weg: geen regel, geen mail,
 * en een bestelling die gewoon doorliep. Nu hoor je het. Er gebeurt verder
 * niets vanzelf — een terugboeking kan een vergissing van de bank zijn, een
 * geschil dat je wint, of fraude; dat is een besluit, geen regel.
 */
export async function notifyChargeback(env, { orderId, betaalId, bedragCents, totaalCents }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    await toStudio(env, `Terugboeking (chargeback) · ${ref} · ${cents(bedragCents)}`, [
      h1('De klant heeft de betaling laten terugboeken', ref),
      mailRows([
        ['Bestelling', ref],
        ['Klant', who(o)],
        ['E-mail', o?.email || ''],
        ['Betaling', betaalId || ''],
        ['Teruggeboekt', `${cents(bedragCents)}${totaalCents ? ` van ${cents(totaalCents)}` : ''}`],
      ]),
      mailP('Mollie heeft het bedrag van je saldo afgeschreven (plus hun kosten). De bestelling staat in /admin met de rode pil '
        + '<strong>Betaling teruggeboekt — niet leveren</strong>; "Op geleverd zetten" vraagt dan om een extra bevestiging. '
        + 'Draait Mollie de terugboeking terug, dan verdwijnt de pil vanzelf. Neem contact op met de klant: het kan ook een bankfout zijn. '
        + 'In het Mollie-dashboard kun je de terugboeking betwisten.'),
      /* 8.11: Bel/App met de vaste tekst (waLink.js, moment terugboeking). */
      o ? contactMail(waLink('terugboeking', { ...o, tel: o.phone || o.c_phone, land: o.country || o.c_country }), { wie: who(o), knop: mailKnop, regel: linkLine }) : '',
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] bericht over terugboeking niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/*
 * ── 0% BUITEN DE EU, BETAALD MET IETS UIT DE EU — 29 september 2026 ─────────
 *
 * Bestellingen van buiten de EU betalen sinds vandaag meteen, zonder
 * beoordeling vooraf (zie vatGate() in src/data/vat.js). Dit bericht is wat
 * daarvoor in de plaats kwam: past het betaalmiddel niet bij het land, dan hoor
 * je het vóór je gaat produceren. Het is geen bewijs van fraude — een
 * Nederlander kan een Amerikaans bedrijf hebben — dus er wordt niets geblokkeerd.
 */
export async function notifyBtwTwijfel(env, orderId, reden) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    await toStudio(env, `Even nakijken: btw · ${ref}`, [
      h1('Betaald op 0%, maar het betaalmiddel komt uit de EU', ref),
      mailRows([
        ['Bestelling', ref],
        ['Klant', who(o)],
        ['E-mail', o?.email || ''],
        ['Wat er niet klopt', reden || ''],
      ]),
      mailP('De bestelling is betaald en staat gewoon in de rij. Kijk vóór je begint of het een bedrijf buiten de EU is — '
        + 'een adres, een website of een kort mailtje is genoeg. Klopt het niet, dan hoort er Nederlandse btw op: '
        + 'annuleer met terugbetalen en laat de klant opnieuw bestellen met het juiste land.'),
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] btw-twijfelbericht niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/*
 * ── EEN TWEEDE PROEFVISUAL, TEGENGEHOUDEN OP DE BANKREKENING ────────────────
 *
 * Dit bericht bestaat omdat de klep die het tegenhield ONZICHTBAAR is. De klant
 * heeft betaald, is teruggestuurd naar een pagina die zegt dat het geannuleerd is,
 * en heeft zijn euro terug — allemaal zonder dat er iemand aan te pas kwam. Zonder
 * dit bericht is de enige plek waar dat ooit terecht komt het adminoverzicht, en
 * dan alleen als je ernaar zoekt.
 *
 * Het staat er als melding en niet als alarm. Meestal is dit precies wat de bedoeling
 * is en hoeft er niets te gebeuren. Maar het is ook het enige moment waarop je ziet
 * dat een merk het nog eens probeerde — en dat is een verkoopsignaal, geen incident:
 * iemand die twee keer een proef wil, wil eigenlijk iets kopen. Vandaar dat de eerdere
 * bestelling erbij staat, met adres en al, zodat je hem kunt bellen.
 */
export async function notifySampleBlocked(env, { orderId, earlierRef, earlierAt, refunded }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    await toStudio(env, `Tweede proefvisual tegengehouden · ${ref}`, [
      h1('Een tweede proefvisual is geannuleerd', ref),
      mailRows([
        ['Nieuwe aanvraag', ref],
        ['Klant', who(o)],
        ['E-mail', o?.email || ''],
        ['Telefoon', o?.phone || ''],
        ['Eerdere proef', earlierRef || 'onbekend'],
        ['Toen', earlierAt || 'onbekend'],
        ['Proefbedrag (€ 1)', refunded ? 'automatisch teruggestort' : 'NIET teruggestort — met de hand doen'],
      ]),
      mailP('Dezelfde bankrekening als bij de eerdere proefvisual, dus dit is hetzelfde '
        + 'bedrijf onder een ander e-mailadres. De bestelling staat op geannuleerd en er '
        + 'hoeft geen werk te beginnen.'),
      mailP('De moeite waard om zelf even contact op te nemen. Iemand die voor de tweede '
        + 'keer een proef aanvraagt is aan het twijfelen over een echte bestelling, en dat '
        + 'is een gesprek dat je met een mailtje kunt openen in plaats van af te wachten.'),
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] bericht over tweede proefvisual niet verstuurd voor', orderId, '—', err?.message || err);
  }
}


/**
 * Een klant heeft een revisie aangevraagd.
 *
 * DE NOTITIE VAN DE KLANT STAAT ER LETTERLIJK IN, als citaat. Dat is de hele reden dat
 * dit bericht bestaat: /studio belooft dat een revisieverzoek binnenkomt "met de
 * notitie die de klant schreef, in diens eigen woorden". Een mail die alleen zegt "er
 * is een revisie" dwingt je alsnog het dashboard te openen om te weten of het dringend
 * is, en dan had de mail niets opgelost.
 */
export async function notifyRevision(env, { orderId, fileId, note }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;

    /*
     * Welk beeld het was, hier opgezocht en niet door de aanroeper meegegeven.
     *
     * Beide routes hebben alleen `fileId` bij de hand, en de eerste versie hiervan
     * liet de aanroeper de naam aanleveren — waarop ik in portal.js `f?.filename`
     * schreef terwijl er in die scope geen `f` bestaat. Optional chaining vangt een
     * niet-bestaande variabele niet: dat is een ReferenceError, en die zou het
     * revisieverzoek van de klant hebben laten mislukken op de mail erover.
     *
     * Eén query hier is dus niet alleen korter maar ook de veilige kant: het opzoeken
     * zit binnen de try van deze functie, waar een fout niets kan raken.
     */
    let f = null;
    try {
      f = await env.DB.prepare(
        'SELECT filename, product_key, shot FROM files WHERE id = ?1'
      ).bind(fileId).first();
    } catch { /* dan zonder — het bestandsnummer is genoeg om het terug te vinden */ }

    const what = [f?.product_key, f?.shot].filter(Boolean).join(' · ')
      || f?.filename
      || `bestand ${fileId}`;
    await toStudio(env, `Revisie gevraagd · ${ref} · ${what}`, [
      h1('Een klant vraagt een revisie', ref),
      mailRows([
        ['Bestelling', ref],
        ['Klant', who(o)],
        ['Beeld', what],
      ]),
      note ? mailQuote(note) : mailP('De klant heeft er geen toelichting bij gezet.'),
      mailP('Het verzoek staat bovenaan in het adminportaal, bij de bestelling.'),
    ].join(''), o?.email || '');
  } catch (err) {
    console.error('[notify] revisiebericht niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/*
 * ── DE HELE RONDE IN ÉÉN BERICHT — 25 AUGUSTUS 2026 ─────────────────────────
 *
 * notifyRevision() hierboven gaat over ÉÉN beeld, want zo werkte het scherm: elk
 * beeld was een eigen formulier dat meteen verzond. Sinds vandaag dient de klant
 * zijn revisieronde in één keer in — aanvinken wat er mis is, per beeld
 * opschrijven wat, en dan één knop.
 *
 * WAAROM NIET GEWOON notifyRevision() IN EEN LUS. Omdat vijf aangemerkte beelden
 * dan vijf mails geven, en dat is precies het tegenovergestelde van wat de
 * verandering oplevert. Erger: ze komen los binnen, dus de studio kan niet zien
 * of dit één ronde is of vijf losse klachten — terwijl dat nu juist het verschil
 * is dat ertoe doet, want een ronde is er één per bestelling.
 *
 * DE NOTITIES STAAN VOLUIT EN NIET GETELD. "Drie beelden aangemerkt" dwingt je
 * het dashboard te openen om te weten of het om een kleurzweem of om een
 * verkeerd product gaat. /studio belooft dat een revisieverzoek binnenkomt "met
 * de notitie die de klant schreef, in diens eigen woorden"; bij vijf beelden
 * geldt dat vijf keer.
 *
 * FOUTEN BLIJVEN BINNEN, net als bij notifyRevision(): de ronde van de klant is
 * al weggeschreven als dit draait, en die mag niet omvallen omdat de mail eruit
 * ligt.
 */
export async function notifyRevisionRound(env, { orderId, items = [] }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;

    /* De namen erbij zoeken, in één query in plaats van één per beeld. Lukt het
       niet, dan draagt elke regel nog altijd zijn bestandsnummer — genoeg om het
       terug te vinden, en dat is waarom dit de mail niet mag tegenhouden. */
    let namen = new Map();
    try {
      const ids = items.map((x) => Number(x.fileId)).filter(Number.isInteger);
      if (ids.length) {
        const gaten = ids.map((_, i) => `?${i + 1}`).join(', ');
        const res = await env.DB
          .prepare(`SELECT id, filename, product_key, shot FROM files WHERE id IN (${gaten})`)
          .bind(...ids).all();
        /* ── ZOALS OP HET WERKBORD — 14 oktober 2026 (doorloop 27, B08) ────────
           Hier stond "p2 · worn": de sleutels uit de database. Nu "Product 2 ·
           Op een model", de woorden van het werkbord (src/data/levervakken.js),
           met de bestandsnaam als het vak onbekend is. */
        const shotNaam = (shot) => vakNaam(o?.service, o?.details_json, shot, 'nl')
          || SHOTS.find((x) => x.id === shot)?.name?.nl || shot;
        for (const r of res.results || []) {
          const product = /^p(\d+)$/.exec(String(r.product_key || ''));
          const label = product && r.shot ? `Product ${product[1]} · ${shotNaam(r.shot)}` : '';
          namen.set(Number(r.id), label || [r.product_key, r.shot].filter(Boolean).join(' · ') || r.filename || '');
        }
      }
    } catch { /* dan zonder namen */ }

    /* Eén notitie voor de hele ronde (zo vraagt de privélink het: één veld) kwam
       onder elk beeld opnieuw te staan. Dezelfde notitie bij alle beelden: één
       keer bovenaan, daaronder de lijst. Verschillen ze, dan per beeld. */
    const notities = items.map((x) => String(x.note || '').trim());
    const eenNotitie = notities.length > 1 && notities[0] && notities.every((n) => n === notities[0]);
    const regels = eenNotitie
      ? mailQuote(notities[0]) + mailRows(items.map(({ fileId }) => ['Beeld', namen.get(Number(fileId)) || `bestand ${fileId}`]))
      : items.map(({ fileId, note }) => {
        const wat = namen.get(Number(fileId)) || `bestand ${fileId}`;
        return mailRows([['Beeld', wat]]) + (note ? mailQuote(note) : mailP('Geen toelichting.'));
      }).join('');

    const aantal = items.length;
    await toStudio(
      env,
      `Revisieronde · ${ref} · ${aantal} ${aantal === 1 ? 'beeld' : 'beelden'}`,
      [
        h1('Een klant heeft zijn revisieronde ingediend', ref),
        mailRows([
          ['Bestelling', ref],
          ['Klant', who(o)],
          ['Aangemerkt', `${aantal} ${aantal === 1 ? 'beeld' : 'beelden'}`],
        ]),
        /* Dit staat er met opzet bij. Het is de ENE ronde van deze bestelling:
           er komt geen tweede via het scherm, dus wat hier niet in staat, komt
           via WhatsApp of e-mail binnen en niet als verzoek. */
        mailP('Dit was de revisieronde van deze bestelling. Verdere opmerkingen komen via WhatsApp of e-mail binnen.'),
        regels,
        mailP('De verzoeken staan bovenaan op het admin-dashboard, en per beeld op het werkbord van de bestelling.'),
      ].join(''),
      o?.email || '',
    );
  } catch (err) {
    console.error('[notify] revisieronde niet verstuurd voor', orderId, '—', err?.message || err);
  }
}

/**
 * De klant zette foto's bij een bestaande bestelling, in Studio.
 *
 * Ronde 9 (F55): een bestelling die de studio namens de klant aanmaakt (WhatsApp,
 * telefoon) heeft vaak nog geen foto's, en de klant had nergens een plek om ze
 * neer te zetten. Nu wel — en dan hoort de studio dat ze er zijn, want daar
 * wacht het werk op.
 */
/* Punt 2.05 (8 oktober 2026): `vakken` noemt waar elke foto terechtkwam
   ("p3 achterkant, p5 detail"), `ontbreekt` wat er daarna nog mist (regels uit
   ontbrekendRegels(); null = onbekend, dan geen regel). Beide optioneel. */
export async function notifyFotosToegevoegd(env, { orderId, count, vakken = [], ontbreekt = null }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    const rijen = [
      ['Bestelling', ref],
      ['Klant', who(o)],
      ['Foto\u2019s', String(count)],
    ];
    const metVak = Array.isArray(vakken) && vakken.length > 0;
    if (metVak) rijen.push(['Vakken', vakken.join(', ')]);
    if (Array.isArray(ontbreekt)) rijen.push(['Ontbreekt nog', ontbreekt.length ? ontbreekt.join('; ') : 'niets']);
    await toStudio(
      env,
      `Foto's binnen · ${ref} · ${count}`,
      [
        h1('De klant heeft foto\u2019s toegevoegd', ref),
        mailRows(rijen),
        mailP(metVak
          ? 'Ze staan op het bord van de bestelling, elk in zijn vak, met \u201cnagestuurd\u201d erbij.'
          : 'Ze staan bij de bestelling onder \u201cAangeleverd door de klant\u201d.'),
      ].join(''),
      o?.email || '',
    );
  } catch (err) {
    console.error('[notify] foto-melding niet verstuurd voor', orderId, '\u2014', err?.message || err);
  }
}

/*
 * ── EEN INCASSO DIE NIET DOORGING — 23 AUGUSTUS 2026 ────────────────────────
 *
 * Dit bericht bestond niet, en het gat eromheen was groter dan één mail. De
 * webhook kende alleen het geslaagde pad voor een abonnement: een afschrijving die
 * mislukte, viel door dezelfde poort als een mislukte bestelbetaling, zocht daar
 * naar `metadata.order_ref` — die een abonnementsbetaling niet heeft — vond niets,
 * en gaf Mollie een 200. Niets vastgelegd, niemand op de hoogte.
 *
 * De gevolgen zaten verderop: `cron/index.js` meldt gepauzeerde abonnementen aan
 * Lucas en `src/lib/account.js` heeft een klanttekst voor "de laatste incasso
 * mislukte", maar niets in de hele codebase schreef ooit `pause_reason =
 * 'payment_failed'`. Twee schermen die wachtten op een toestand die niet kon
 * ontstaan.
 *
 * ── WAAROM ER TWEE SOORTEN BERICHT ZIJN ─────────────────────────────────────
 *
 * `gestopt` is het verschil tussen "Mollie probeert het morgen weer" en "Mollie is
 * ermee gestopt". Alleen het tweede is een ding waar jij iets mee moet, en dat
 * staat dan ook in de onderwerpregel — anders leest de derde herhaling van een
 * poging die vanzelf goed komt als een noodgeval.
 */
export async function notifySubscriptionFailed(env, {
  subRef, plan, brand, email, reason = '', bedragCents = 0, gestopt = false, molliestatus = '',
}) {
  try {
    const ref = subRef || '(zonder kenmerk)';
    await toStudio(
      env,
      gestopt
        ? `Abonnement gepauzeerd · ${ref} · incasso mislukt`
        : `Incasso niet gelukt · ${ref}`,
      [
        h1(gestopt ? 'Een abonnement staat stil' : 'Een incasso ging niet door', ref),
        mailRows([
          ['Abonnement', ref],
          ['Klant', brand || email || '—'],
          ['E-mail', email || ''],
          ['Plan', plan || ''],
          ['Bedrag', cents(bedragCents)],
          ['Wat Mollie zei', mollieWoord(reason) || 'onbekend'],
          ['Status bij Mollie', { html: molliestatus ? statusPil(molliestatus, mollieWoord(molliestatus)) : statusPil('unknown', 'onbekend') }],
        ]),
        gestopt
          ? mailP('Mollie probeert het niet meer, dus het abonnement is hier op pauze gezet. '
            + 'De klant kan intussen niets van zijn saldo besteden en heeft daar een mail over gekregen. '
            + 'Zodra er wél een afschrijving lukt, loopt het vanzelf weer — daar hoef jij niets voor te doen.')
          : mailP('Mollie probeert het binnenkort opnieuw. Het abonnement loopt gewoon door; de klant '
            + 'heeft een mail gekregen dat de afschrijving niet lukte. Komt dit bericht nog een keer, '
            + 'dan is er iets met de rekening van de klant.'),
        /* 7.05, moment 4: de knop met de vaste tekst (incasso mislukt). */
        await incassoContact(env, { email, brand }),
      ].join('')
    );
  } catch (err) {
    console.error('[notify] incassobericht niet verstuurd voor', subRef, '—', err?.message || err);
  }
}

/* De klant van een abonnement bereiken (7.05, moment 4). Het nummer, het land
   en de naam staan op `customers`; de taal is die van zijn laatste
   abonnementsfactuur, anders van zijn laatste bestelling (zoals KLANT_TAAL_SQL
   in cron/index.js). Lukt het lezen niet, dan geen knop: de mail gaat door. */
async function incassoContact(env, { email, brand }, moment = 'incasso', extra = {}) {
  if (!email || !env?.DB) return '';
  try {
    const k = await env.DB.prepare(
      `SELECT c.name, c.first_name, c.phone, c.country,
              COALESCE(
                (SELECT si.lang FROM subscription_invoices si JOIN subscriptions s ON s.id = si.subscription_id
                  WHERE s.customer_id = c.id ORDER BY si.id DESC LIMIT 1),
                (SELECT o.lang FROM orders o WHERE o.customer_id = c.id ORDER BY o.id DESC LIMIT 1),
                'nl') AS lang
         FROM customers c WHERE lower(c.email) = lower(?1) LIMIT 1`
    ).bind(email).first();
    if (!k) return '';
    return contactMail(waLink(moment, { ...k, email, ...(extra.o || {}) }, extra), { wie: brand || k.name || email, knop: mailKnop, regel: linkLine });
  } catch (err) {
    console.error('[notify] contactknop bij incasso niet gemaakt —', err?.message || err);
    return '';
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * ER IS GELD TERUG OP EEN ABONNEMENT — 17 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Een restitutie op een abonnementstermijn is zeldzaam en heeft altijd een
 * verhaal: een chargeback, een dubbele afschrijving, of een afspraak met de
 * klant. Er is geen enkele situatie waarin de goede afhandeling automatisch is
 * — vandaar dat de webhook hem vastlegt en STOPT, en dit bericht eruit gaat.
 *
 * Wat er NIET gebeurt en met opzet niet: de al toegekende maand intrekken. Die
 * kan half besteed zijn, en slots weghalen waar een klant al producten mee
 * heeft vastgezet, maakt van een boekhoudkundige correctie een kapotte
 * bestelling. Wat de webhook wél doet is het abonnement pauzeren, zodat er geen
 * volgende maand bij komt.
 *
 * ⚠ DE CREDITNOTA IS HANDWERK. issueCreditNote() in src/lib/invoice.js werkt op
 * `invoices` en `orders`; abonnementsfacturen staan in `subscription_invoices`
 * en hebben nog geen eigen creditnotaroute. Dat staat in dit bericht, zodat het
 * niet stil blijft liggen.
 */
export async function notifySubscriptionRefunded(env, {
  subRef, plan, brand, email, bedragCents = 0, terugCents = 0, maand = '', volledig = false, molliestatus = '',
  credits = null,
}) {
  try {
    const ref = subRef || '(zonder kenmerk)';
    /* V49 = a (8 oktober 2026): de credits van deze termijn. `credits` komt uit
       vervalTermijn() in src/lib/creditboek.js; null als er geen partij was. */
    const creditRegels = credits ? [
      ['Credits van deze termijn', `${credits.toegekend} toegekend · ${credits.gebruikt} gebruikt · ${credits.ongebruikt} ongebruikt`],
      ['Nu vervallen', `${credits.vervielNu} credits`],
      ['Creditnota (ongebruikt deel)', credits.ongebruiktCents === null ? '—' : cents(credits.ongebruiktCents)],
    ] : [];
    await toStudio(
      env,
      `Geld terug op een abonnement · ${ref}${volledig ? ' · volledig' : ' · gedeeltelijk'}`,
      [
        h1('Er is geld teruggegaan op een abonnement', ref),
        mailRows([
          ['Abonnement', ref],
          ['Klant', brand || email || '—'],
          ['E-mail', email || ''],
          ['Plan', plan || ''],
          ['Termijn', maand || '—'],
          ['Afgeschreven', cents(bedragCents)],
          ['Terugbetaald', cents(terugCents)],
          ['Status bij Mollie', { html: molliestatus ? statusPil(molliestatus, mollieWoord(molliestatus)) : statusPil('unknown', 'onbekend') }],
          ...creditRegels,
        ]),
        credits
          ? mailP('Volgens de regel van 8 oktober (V49): de creditnota is alleen voor het ongebruikte deel, '
            + 'en de ongebruikte credits van deze termijn zijn nu vervallen (regel "terugbetaald" in het creditboek). '
            + 'Wat al gebruikt is, blijft gebruikt.')
          : '',
        mailP(volledig
          ? 'De hele termijn is terug. Het abonnement staat op pauze, dus er komt geen '
            + 'volgende maand bij. Bestellingen die al met credits van deze termijn betaald zijn, '
            + 'blijven staan; alleen wat er ongebruikt van over was, is vervallen.'
          : 'Een deel van de termijn is terug. Het abonnement loopt door; het bedrag is vastgelegd '
            + 'en de ongebruikte credits van deze termijn zijn vervallen. Klopt dat niet, dan zet je '
            + 'ze terug met "Credits bijstellen" in /admin.'),
        mailP('Twee dingen die JIJ moet doen: de creditnota uitschrijven (abonnementsfacturen '
          + 'hebben nog geen automatische creditnotaroute — zie de noot bij deze functie), en de '
          + 'klant laten weten wat er is gebeurd.'),
      ].join('')
    );
  } catch (err) {
    console.error('[notify] restitutiebericht niet verstuurd voor', subRef, '—', err?.message || err);
  }
}


/* ── EEN NIEUW ABONNEMENT — 23 september 2026 ──────────────────────────────
   Uit de doorloop: de studio hoorde niets van een nieuwe machtiging. Eén
   bericht, bij de EERSTE betaalde maand; de termijnen daarna zijn routine en
   staan in het abonnementspaneel. */
export async function notifySubscriptionStarted(env, { subRef, plan, term, brand, email, credits, bedragCents = 0, windowDay, twijfel = null }) {
  try {
    const ref = subRef || '(zonder kenmerk)';
    await toStudio(env, `Nieuw abonnement · ${ref} · ${plan || ''}`, [
      h1('Een abonnement is gestart', ref),
      mailRows([
        ['Abonnement', ref],
        ['Klant', brand || email || '—'],
        ['E-mail', email || ''],
        ['Plan', `${plan || ''}${term ? ` · ${({ monthly: 'maandelijks', yearly: '12 maanden', prepaid: '12 maanden vooruit' })[term] || term}` : ''}`],
        ['Credits per maand', String(credits ?? '')],
        ['Eerste afschrijving', cents(bedragCents)],
      ]),
      mailP((term === 'prepaid'
        ? 'Het hele jaar is vooruitbetaald en de credits van de eerste maand staan op het account; elke volgende maand zet de nachtelijke taak erbij. '
        : 'De eerste maand is betaald en de credits staan op het account. ')
        + 'De klant kreeg een welkomstmail met een inlogknop. Hij bestelt via het gewone formulier en '
        + 'betaalt met credits; die bestellingen komen binnen zoals alle andere.'),
      twijfel
        ? mailP(`<strong>Even nakijken:</strong> dit abonnement staat op 0% (buiten de EU), maar ${esc(twijfel)}. `
          + 'Kijk of het echt een bedrijf buiten de EU is; klopt het niet, zeg het abonnement op en laat de klant opnieuw afsluiten met het juiste land.')
        : '',
    ].join(''));
  } catch (err) {
    console.error('[notify] abonnementsbericht niet verstuurd voor', subRef, '—', err?.message || err);
  }
}

/* ── EEN ABONNEMENT DAT OP JE WACHT: LAND BUITEN DE EU, IP IN DE EU — 8 oktober 2026 ──
   o16 uit de afvinklijst. Een bestelling met deze combinatie gaat op de btw-lijst
   in /admin; een abonnement heeft die lijst niet. Daarom dit bericht: er is
   niets afgeschreven en er staat nog geen abonnement, de klant las "we kijken je
   gegevens even na". Wat jij doet, staat in de mail zelf. */
export async function notifyAboBtwNakijken(env, { customerId, email, brand, phone, plan, term, land, ipLand }) {
  try {
    const origin = env.PUBLIC_ORIGIN || 'https://visuails.com';
    await toStudio(env, `Even nakijken: abonnement · ${brand || email || ''} · ${land} vanaf ${ipLand}`, [
      h1('Een abonnement wacht op je: land buiten de EU, ip in de EU', brand || email || ''),
      mailRows([
        ['Klant', brand || '—'],
        ['E-mail', email || ''],
        ['Telefoon', phone || ''],
        ['Plan', `${plan || ''}${term ? ` · ${({ monthly: 'maandelijks', yearly: '12 maanden', prepaid: '12 maanden vooruit' })[term] || term}` : ''}`],
        ['Gekozen land', land || ''],
        ['Land van het ip-adres', ipLand || ''],
        ['Klantpagina', { html: `<a href="${esc(`${origin}/admin/customers/${customerId}`)}">${esc(`/admin/customers/${customerId}`)}</a>` }],
      ]),
      mailP('Er is niets afgeschreven en er staat nog geen abonnement. De klant las dat we zijn gegevens eerst nakijken en dat hij meestal binnen het uur van ons hoort (buiten openingstijden de volgende ochtend). '
        + 'Klopt het land (een bedrijf buiten de EU, met iemand die nu in Europa is)? Druk dan op de klantpagina op "Land goedkeuren" en vraag de klant het formulier nog een keer te versturen; dan gaat hij gewoon door naar de betaling, met 0% btw. '
        + 'Klopt het niet, vraag hem dan opnieuw af te sluiten met het land waar zijn bedrijf echt zit (dan met btw).'),
    ].join(''), email || '');
  } catch (err) {
    console.error('[notify] nakijkbericht abonnement niet verstuurd voor', email, '—', err?.message || err);
  }
}

/* ── PAUZEREN, HERVATTEN, OPZEGGEN — 24 september 2026 ──────────────────────
   Een klant die zijn abonnement stopt, is precies de klant waar je als studio
   iets over wilt horen — tot vandaag gebeurde het zonder bericht. */
export async function notifyAboWijziging(env, { soort, subRef, plan, brand, email, jaarDoor = null, prepaid = false, reden = '', vanaf = null, creditsBespreken = false }) {
  const woord = { pauze: 'gepauzeerd', hervat: 'hervat', opgezegd: 'opgezegd' }[soort] || soort;
  try {
    await toStudio(env, `Abonnement ${woord} · ${subRef || ''} · ${brand || email || ''}`, [
      h1(`Een abonnement is ${woord}`, subRef || ''),
      mailRows([
        ['Abonnement', subRef || ''],
        ['Klant', brand || email || '—'],
        ['E-mail', email || ''],
        ['Plan', plan || ''],
        /* 2.07: de reden is verplicht bij pauzeren en opzeggen. */
        ...(reden ? [['Reden', reden]] : []),
        ...(vanaf ? [['Pauze gaat in op', datum(vanaf, 'nl')]] : []),
      ]),
      /* De klant weet niet wat hij met zijn credits moet: bellen of appen is
         nu het meest waard (Lucas bij 2.07). */
      creditsBespreken
        ? mailP('De klant gaf als reden dat het niet duidelijk is wat te doen met de overige credits. Even meekijken (website, kanalen) en een dienst voorstellen is nu het meest waard.')
          + await incassoContact(env, { email, brand }, 'credits')
        : '',
      mailP(soort === 'opgezegd' && jaarDoor !== null
        ? `De klant heeft zelf opgezegd in Studio. Het is een <strong>vooruitbetaald jaar</strong>: dat loopt gewoon door${jaarDoor && jaarDoor !== 'onbekend' ? ` tot ${datum(jaarDoor, 'nl')}` : ' tot het einde'}, met elke maand de credits, en stopt daarna vanzelf. Er hoeft niets met de hand te gebeuren — geen tegoed, geen terugbetaling.`
        : soort === 'opgezegd'
        ? `De klant heeft zelf opgezegd in Studio. De incasso bij Mollie is gestopt; de credits blijven geldig tot ${CREDITS_GELDIG_MAANDEN} maanden na de laatste termijn.`
        : soort === 'pauze'
          ? (prepaid
            ? 'De klant heeft zelf gepauzeerd in Studio. Het is een vooruitbetaald jaar, dus er is geen incasso: de nachtelijke taak kent geen nieuwe maanden toe tot hij hervat. Het saldo blijft staan.'
            : `De klant heeft zelf gepauzeerd in Studio. De incasso bij Mollie is gestopt${vanaf ? `; de lopende termijn loopt door en de pauze gaat in op ${datum(vanaf, 'nl')}` : ''}. De credits blijven geldig tot ${CREDITS_GELDIG_MAANDEN} maanden na de laatste termijn.`)
          : (prepaid
            ? 'De klant heeft zelf hervat in Studio. Het is een vooruitbetaald jaar: de nachtelijke taak kent vanaf nu weer elke maand de credits toe.'
            : 'De klant heeft zelf hervat in Studio. Mollie incasseert weer volgens het gewone ritme.')),
    ].join(''));
  } catch (err) {
    console.error('[notify] abonnementswijziging niet gemeld voor', subRef, '—', err?.message || err);
  }
}

/**
 * ── DE KLANT WIL BESPREKEN WAT HIJ MET ZIJN CREDITS KAN DOEN — 8 oktober 2026 ──
 *
 * Punt 2.07, Lucas: "Ik kijk dan echt met de klant mee en wanneer ik bijvoorbeeld
 * weinig website beelden op hun website zie staan dat ik aangeef wellicht daar
 * wat voor doen […]". De klant drukte op de knop op /account/plan. Hier: wie,
 * hoeveel credits, wanneer ze vervallen, de laatste reden als die er is, en
 * Bel/App met een kant-en-klare tekst (waLink.js, moment `credits`).
 */
export async function notifyCreditsBespreken(env, { klant = {}, lang = 'nl', saldo = 0, vervalt = [], abonnement = null, reden = '' }) {
  try {
    const naam = klant.brand || [klant.first_name].filter(Boolean).join(' ') || klant.name || klant.email || '—';
    const eerste = vervalt[0] || null;
    const vervaltRegel = vervalt.length
      ? vervalt.map((v) => `${v.aantal} op ${datum(v.op, 'nl')}`).join(' · ')
      : '—';
    const klantTaal = lang === 'en' ? 'en' : 'nl';
    const link = waLink('credits', { ...klant, lang: klantTaal }, {
      saldo, vervalt: eerste ? datum(eerste.op, klantTaal) : '',
    });
    await toStudio(env, `Credits bespreken · ${naam} · ${saldo} credits`, [
      h1('Een klant wil bespreken wat hij met zijn credits kan doen', naam),
      mailRows([
        ['Klant', naam],
        ['E-mail', klant.email || ''],
        ['Telefoon', klant.phone || '—'],
        ['Abonnement', abonnement ? `${abonnement.ref || ''} · ${abonnement.plan || ''} · ${abonnement.status || ''}` : '—'],
        ['Credits nu', String(saldo)],
        ['Vervallen', vervaltRegel],
        ...(reden ? [['Laatste reden bij stoppen', reden]] : []),
      ]),
      mailP('De klant ziet "We nemen contact met je op." Kijk vooraf even naar de website en kanalen van het merk: waar ontbreken beelden, en welke dienst en formaten passen daar het best bij?'),
      contactMail(link, { wie: naam, knop: mailKnop, regel: linkLine }),
    ].join(''), klant.email || '');
  } catch (err) {
    console.error('[notify] vraag over credits niet gemeld —', err?.message || err);
  }
}

/**
 * ── EEN TERMIJN IS TERUGGEBOEKT — 8 oktober 2026 (8.11, V50 = a) ────────────
 *
 * Een chargeback of storno op een abonnementstermijn. De webhook heeft het
 * abonnement op pauze gezet (pause_reason 'chargeback') en de credits van die
 * termijn bevroren; de factuur blijft staan. Draait Mollie de terugboeking
 * terug, dan gaat alles vanzelf terug (`terug: true`).
 */
export async function notifyTermijnTeruggeboekt(env, { subRef, plan, brand, email, bedragCents = 0, terugCents = 0, maand = '', bevroren = null, terug = false }) {
  try {
    const ref = subRef || '(zonder kenmerk)';
    await toStudio(env, terug
      ? `Terugboeking ongedaan · ${ref}`
      : `Termijn teruggeboekt · ${ref} · ${cents(terugCents)}`, [
      h1(terug ? 'Mollie heeft de terugboeking teruggedraaid' : 'Een termijn is via de bank teruggeboekt', ref),
      mailRows([
        ['Abonnement', ref],
        ['Klant', brand || email || '—'],
        ['E-mail', email || ''],
        ['Plan', plan || ''],
        ...(maand ? [['Termijn', maand]] : []),
        ...(terug ? [] : [['Teruggeboekt', `${cents(terugCents)}${bedragCents ? ` van ${cents(bedragCents)}` : ''}`]]),
        ...(bevroren !== null ? [[terug ? 'Credits weer vrij' : 'Credits bevroren', String(bevroren)]] : []),
      ]),
      terug
        ? mailP('De credits van die termijn zijn weer vrij, met hun eigen vervaldatum, en het abonnement loopt weer. De factuur stond al.')
        : mailP('Het abonnement staat op pauze en de credits van deze termijn zijn bevroren: niet bruikbaar, niet weg. De factuur blijft staan. '
          + 'Draait Mollie de terugboeking terug, dan gaat dat allemaal vanzelf terug. Bestellingen van deze klant staan niet stil; kijk of er nog iets in productie is. '
          + 'Neem contact op met de klant: het kan ook een bankfout zijn.'),
      terug ? '' : await incassoContact(env, { email, brand }, 'terugboeking', { o: { ref } }),
    ].join(''), email || '');
  } catch (err) {
    console.error('[notify] terugboeking op termijn niet gemeld voor', subRef, '—', err?.message || err);
  }
}
