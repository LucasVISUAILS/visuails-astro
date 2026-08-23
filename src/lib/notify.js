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

import { sendMail } from './mail.js';
import { shell, h1, p as mailP, rows as mailRows, quote as mailQuote } from './mailTemplate.js';

/** De bestelling erbij halen, zodat een mail bruikbaar is zonder eerst te zoeken. */
async function orderFor(env, orderId) {
  try {
    return await env.DB.prepare(
      /* `phone` staat er sinds 11 aug 2026 bij, voor het bericht over een
         tegengehouden tweede proefvisual: dat bericht is uitdrukkelijk bedoeld om
         Lucas te laten BELLEN, en een telefoonnummer dat je er zelf bij moet
         zoeken is een telefoonnummer dat niet gebeld wordt. */
      `SELECT id, ref, service, email, phone, brand, first_name, last_name, name,
              product_count, total_cents, vat_cents, country, window_start, window_end
         FROM orders WHERE id = ?1`
    ).bind(orderId).first();
  } catch {
    return null;
  }
}

const who = (o) => o?.brand
  || [o?.first_name, o?.last_name].filter(Boolean).join(' ')
  || o?.name || o?.email || '—';

const cents = (v) => `€ ${((Number(v) || 0) / 100).toFixed(2).replace('.', ',')}`;

/** Eén plek voor de vraag "kan en mag ik mailen". */
function canMail(env) {
  return Boolean(env?.RESEND_API_KEY && (env.NOTIFY_EMAIL || 'hello@visuails.com'));
}

async function toStudio(env, subject, body) {
  if (!canMail(env)) return;
  await sendMail(env, {
    to: env.NOTIFY_EMAIL || 'hello@visuails.com',
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
        ['Dienst', o?.service || ''],
        ['Producten', String(o?.product_count ?? '')],
        ['Bedrag', `${cents(o?.total_cents)} excl. btw · ${cents(gross)} totaal`],
        ['Venster', o?.window_start ? `${o.window_start}${o.window_end ? ` – ${o.window_end}` : ''}` : 'geen vastgelegde datum'],
      ]),
      mailP('De factuur is al naar de klant. Het werk kan beginnen.'),
    ].join(''));
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
        ['Wat Mollie zei', reason || 'onbekend'],
        ['Bedrag', cents((Number(o?.total_cents) || 0) + (Number(o?.vat_cents) || 0))],
      ]),
      mailP('De bestelling staat nog op onbetaald en de klant kan het opnieuw proberen '
        + 'in VISUAILS Studio. Meestal is dit geen afhaker maar iemand die zijn '
        + 'zakelijke rekening niet bij de hand had — één bericht lost het vaak op.'),
    ].join(''));
  } catch (err) {
    console.error('[notify] mislukte-betaling-bericht niet verstuurd voor', orderId, '—', err?.message || err);
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
        ['De euro', refunded ? 'automatisch teruggestort' : 'NIET teruggestort — met de hand doen'],
      ]),
      mailP('Dezelfde bankrekening als bij de eerdere proefvisual, dus dit is hetzelfde '
        + 'bedrijf onder een ander e-mailadres. De bestelling staat op geannuleerd en er '
        + 'hoeft geen werk te beginnen.'),
      mailP('De moeite waard om zelf even contact op te nemen. Iemand die voor de tweede '
        + 'keer een proef aanvraagt is aan het twijfelen over een echte bestelling, en dat '
        + 'is een gesprek dat je met een mailtje kunt openen in plaats van af te wachten.'),
    ].join(''));
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
    ].join(''));
  } catch (err) {
    console.error('[notify] revisiebericht niet verstuurd voor', orderId, '—', err?.message || err);
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
          ['Wat Mollie zei', reason || 'onbekend'],
          ['Status bij Mollie', molliestatus || 'onbekend'],
        ]),
        gestopt
          ? mailP('Mollie probeert het niet meer, dus het abonnement is hier op pauze gezet. '
            + 'De klant kan zolang niets van zijn saldo besteden. Zodra er wél een afschrijving '
            + 'lukt, loopt het vanzelf weer — daar hoef jij niets voor te doen. Wat wél helpt: '
            + 'één bericht aan de klant dat zijn rekening het niet deed.')
          : mailP('Mollie probeert het binnenkort opnieuw. Het abonnement loopt gewoon door en '
            + 'de klant merkt hier niets van. Dit bericht is er zodat je het ziet aankomen — '
            + 'komt hij nog een keer, dan is er iets met de rekening van de klant.'),
      ].join('')
    );
  } catch (err) {
    console.error('[notify] incassobericht niet verstuurd voor', subRef, '—', err?.message || err);
  }
}
