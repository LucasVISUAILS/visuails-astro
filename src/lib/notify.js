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
      mailP('Mollie heeft het bedrag van je saldo afgeschreven (plus hun kosten). De bestelling staat nog op betaald en loopt door: '
        + 'zet hem stil als je nog niet geleverd hebt, en neem contact op met de klant. In het Mollie-dashboard kun je de terugboeking betwisten.'),
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
 * Een abonnee heeft een ingeplande dag NAAR VOREN gehaald.
 *
 * Lucas, 19 september 2026: *"ze kunnen orders in de planning ook vooruit
 * slepen naar een andere datum (…) Zorg ervoor dat als dit gebeurt ik een
 * melding krijg en dat deze order ook in mijn planning is verplaatst."*
 *
 * Het tweede deel van die zin regelt zichzelf en het is goed om te weten
 * waarom: de dagen van een vastgezet item staan op `plan_queue.window_start`,
 * en src/lib/agenda.js leest diezelfde kolom voor de bezetting. Jouw planning
 * IS dus dezelfde rij — er valt niets te synchroniseren, alleen te melden.
 *
 * Waarom die melding er toch toe doet: de dag schuift naar VOREN en nooit naar
 * achteren, dus er komt werk dichter bij je toe dan je gisteren dacht. Dat is
 * precies het soort verandering waarvan je niet wilt dat hij alleen in een
 * kalender staat.
 */
export async function notifyPlanMoved(env, { subRef, brand, email, product, van, naar, vrijgekomen }) {
  try {
    const ref = subRef || '(zonder kenmerk)';
    await toStudio(
      env,
      `Dag naar voren · ${ref} · ${product} · ${van} → ${naar}`,
      [
        h1('Een abonnee haalde een dag naar voren', ref),
        mailRows([
          ['Abonnement', ref],
          ['Klant', brand || email || '—'],
          ['E-mail', email || ''],
          ['Product', product || '—'],
          ['Stond op', van || '—'],
          ['Staat nu op', naar || '—'],
          ['Komt vrij', vrijgekomen || '—'],
        ]),
        mailP('De klant deed dit zelf in Studio, en het kon alleen naar voren — '
          + 'een datum naar achteren schuiven kan hij niet. De planning is hiermee '
          + 'al bijgewerkt: een vastgezet item draagt zijn dagen zelf, en de agenda '
          + 'leest diezelfde rij. Er hoeft niets van jou, behalve weten dat dit werk '
          + 'eerder klaar moet zijn dan het gisteren stond.'),
      ].join('')
    );
  } catch (err) {
    console.error('[notify] verzetbericht niet verstuurd voor', subRef, '—', err?.message || err);
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
        for (const r of res.results || []) {
          namen.set(Number(r.id), [r.product_key, r.shot].filter(Boolean).join(' · ') || r.filename || '');
        }
      }
    } catch { /* dan zonder namen */ }

    const regels = items.map(({ fileId, note }) => {
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
export async function notifyFotosToegevoegd(env, { orderId, count }) {
  try {
    const o = await orderFor(env, orderId);
    const ref = o?.ref || `#${orderId}`;
    await toStudio(
      env,
      `Foto's binnen · ${ref} · ${count}`,
      [
        h1('De klant heeft foto\u2019s toegevoegd', ref),
        mailRows([
          ['Bestelling', ref],
          ['Klant', who(o)],
          ['Foto\u2019s', String(count)],
        ]),
        mailP('Ze staan bij de bestelling onder \u201cAangeleverd door de klant\u201d.'),
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
      ].join('')
    );
  } catch (err) {
    console.error('[notify] incassobericht niet verstuurd voor', subRef, '—', err?.message || err);
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
}) {
  try {
    const ref = subRef || '(zonder kenmerk)';
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
        ]),
        mailP(volledig
          ? 'De hele termijn is terug. Het abonnement staat op pauze, dus er komt geen '
            + 'volgende maand bij. De maand die al was toegekend is NIET ingetrokken — die kan '
            + 'half besteed zijn, en dan haal je slots weg onder een bestelling die al loopt.'
          : 'Een deel van de termijn is terug. Het abonnement loopt door; alleen het bedrag is '
            + 'vastgelegd. Klopt dat niet, dan is dit het moment om het met de hand recht te zetten.'),
        mailP('Twee dingen die JIJ moet doen: de creditnota uitschrijven (abonnementsfacturen '
          + 'hebben nog geen automatische creditnotaroute — zie de noot bij deze functie), en de '
          + 'klant laten weten wat er is gebeurd.'),
      ].join('')
    );
  } catch (err) {
    console.error('[notify] restitutiebericht niet verstuurd voor', subRef, '—', err?.message || err);
  }
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * EEN ABONNEE HEEFT ZIJN WEEK VERZET — RONDE 4, 19 SEPTEMBER 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lucas: *"Week verzetten door de klant zelf."* Tot vandaag zei het scherm
 * "antwoord op een van onze mails, dan schuiven we hem" — er was geen route.
 * Nu verzet de klant hem zelf op /account/plan; dit bericht is er zodat jij
 * het ziet, want jouw planning (checkPlanQueues, de weekmail vijf dagen vooraf)
 * rekent met de nieuwe dag vanaf de eerstvolgende keer dat hij loopt.
 */
export async function notifyPlanWeekMoved(env, { subRef, brand, email, van, naar }) {
  try {
    const ref = subRef || '(zonder kenmerk)';
    await toStudio(
      env,
      (van ? `Week verzet · ${ref} · van de ${van}e naar de ${naar}e` : `Week gekozen · ${ref} · vanaf de ${naar}e`),
      [
        h1('Een abonnee verzette zijn week', ref),
        mailRows([
          ['Abonnement', ref],
          ['Klant', brand || email || '—'],
          ['E-mail', email || ''],
          ['Was', van ? `vanaf de ${van}e van de maand` : '—'],
          ['Wordt', `vanaf de ${naar}e van de maand`],
        ]),
        mailP('De klant deed dit zelf in Studio. Alles wat al vastgezet en op een dag '
          + 'gepland stond, blijft staan; de weekmail en het oppakken van de lijst '
          + 'volgen vanaf nu de nieuwe dag. Er hoeft niets van jou.'),
      ].join('')
    );
  } catch (err) {
    console.error('[notify] weekverzetbericht niet verstuurd voor', subRef, '—', err?.message || err);
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
        ['Vaste week rond dag', windowDay ? String(windowDay) : '—'],
      ]),
      mailP((term === 'prepaid'
        ? 'Het hele jaar is vooruitbetaald en de credits van de eerste maand staan op het account; elke volgende maand zet de nachtelijke taak erbij. '
        : 'De eerste maand is betaald en de credits staan op het account. ')
        + 'De klant kreeg een welkomstmail met een inlogknop. Hij vult zijn lijst in Studio; '
        + 'de week start jij vanuit /admin/customers zodra er genoeg op staat.'),
      twijfel
        ? mailP(`<strong>Even nakijken:</strong> dit abonnement staat op 0% (buiten de EU), maar ${esc(twijfel)}. `
          + 'Kijk of het echt een bedrijf buiten de EU is; klopt het niet, zeg het abonnement op en laat de klant opnieuw afsluiten met het juiste land.')
        : '',
    ].join(''));
  } catch (err) {
    console.error('[notify] abonnementsbericht niet verstuurd voor', subRef, '—', err?.message || err);
  }
}

/* ── PAUZEREN, HERVATTEN, OPZEGGEN — 24 september 2026 ──────────────────────
   Een klant die zijn abonnement stopt, is precies de klant waar je als studio
   iets over wilt horen — tot vandaag gebeurde het zonder bericht. */
export async function notifyAboWijziging(env, { soort, subRef, plan, brand, email, jaarDoor = null, prepaid = false }) {
  const woord = { pauze: 'gepauzeerd', hervat: 'hervat', opgezegd: 'opgezegd' }[soort] || soort;
  try {
    await toStudio(env, `Abonnement ${woord} · ${subRef || ''} · ${brand || email || ''}`, [
      h1(`Een abonnement is ${woord}`, subRef || ''),
      mailRows([
        ['Abonnement', subRef || ''],
        ['Klant', brand || email || '—'],
        ['E-mail', email || ''],
        ['Plan', plan || ''],
      ]),
      mailP(soort === 'opgezegd' && jaarDoor !== null
        ? `De klant heeft zelf opgezegd in Studio. Het is een <strong>vooruitbetaald jaar</strong>: dat loopt gewoon door${jaarDoor && jaarDoor !== 'onbekend' ? ` tot ${datum(jaarDoor, 'nl')}` : ' tot het einde'}, met elke maand de credits en de vaste week, en stopt daarna vanzelf. Er hoeft niets met de hand te gebeuren — geen tegoed, geen terugbetaling. Even vragen waarom is nu het meest waard.`
        : soort === 'opgezegd'
        ? 'De klant heeft zelf opgezegd in Studio. De incasso bij Mollie is gestopt; betaalde credits blijven tot het einde van de termijn te besteden. Even vragen waarom is nu het meest waard.'
        : soort === 'pauze'
          ? (prepaid
            ? 'De klant heeft zelf gepauzeerd in Studio. Het is een vooruitbetaald jaar, dus er is geen incasso: de nachtelijke taak kent geen nieuwe maanden toe tot hij hervat. Het saldo blijft staan.'
            : 'De klant heeft zelf gepauzeerd in Studio. De incasso bij Mollie is gestopt; het saldo blijft staan.')
          : (prepaid
            ? 'De klant heeft zelf hervat in Studio. Het is een vooruitbetaald jaar: de nachtelijke taak kent vanaf nu weer elke maand de credits toe.'
            : 'De klant heeft zelf hervat in Studio. Mollie incasseert weer volgens het gewone ritme.')),
    ].join(''));
  } catch (err) {
    console.error('[notify] abonnementswijziging niet gemeld voor', subRef, '—', err?.message || err);
  }
}
