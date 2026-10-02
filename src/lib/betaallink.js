/* VISUAILS — de betaallinkmail, op één plek.
 *
 * Tot 4 september 2026 stond stuurBetaallink() in admin.js: de mail die na een
 * btw-goedkeuring (en sinds vandaag na een offerte) de klant zijn Mollie-link
 * geeft. De nachtelijke taak heeft hem nu ook nodig, voor de HERINNERING aan een
 * bestelling die drie dagen onbetaald staat — en cron/index.js hoort niet heel
 * admin.js in te laden voor één functie. Dus staat hij hier, en admin.js roept
 * hem aan.
 *
 * Dezelfde regels als altijd: het bedrag wordt opnieuw uit de bestelling gelezen
 * (bruto = netto + btw zoals ze nú op de rij staan), er wordt niets aan
 * payment_status geschreven — dat doet alleen de webhook — en al betaald, geen
 * adres of niets te betalen geeft stil null terug; de aanroeper logt dat.
 */
import { tegoedOpBestelling, teBetalenCents } from './tegoedVerrekening.js';
import { sendMail } from './mail.js';
import { serviceLabel } from '../data/services.js';
import {
  shell as mailShell,
  h1 as mailH1,
  p as mailP,
  spamNote as mailSpamNote,
  payPanel as mailPayPanel,
  linkLine as mailLinkLine,
  bedrag as mailBedrag,
  greeting as mailGreeting,
} from './mailTemplate.js';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export async function stuurBetaallink(env, orderId, { origin, offerte = false, herinnering = false, btwErbij = false } = {}) {
  if (!env.MOLLIE_API_KEY) {
    console.warn('[admin] geen MOLLIE_API_KEY — geen betaallink voor bestelling', orderId);
    return null;
  }
  const o = await env.DB.prepare(
    `SELECT id, ref, email, name, vat_number, address_line1, lang, service, product_count, total_cents, vat_cents, vat_rate, vat_treatment, payment_status, status, window_start, details_json
       FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!o || !o.email) return null;
  /* Al betaald? Dan is er niets te sturen. Kan gebeuren als iemand twee tabbladen
     open heeft, of als de klant in de tussentijd via een eerdere link betaald heeft. */
  if (String(o.payment_status || '') === 'paid') return null;
  /* Geannuleerd is niet meer te betalen (ronde 8, A-K7). */
  if (String(o.status || '') === 'cancelled') return null;

  const bruto = (Number(o.total_cents) || 0) + (Number(o.vat_cents) || 0);
  if (!(bruto > 0)) return null;
  /* Het verrekende tegoed (29 september 2026) gaat eraf; zie
     src/lib/tegoedVerrekening.js. Dekt het alles, dan valt er niets te betalen. */
  const tegoed = tegoedOpBestelling(o);
  const teBetalen = teBetalenCents(o);
  if (!(teBetalen > 0)) return null;

  const lang = o.lang === 'en' ? 'en' : 'nl';
  if (!origin) throw new Error('stuurBetaallink: origin ontbreekt');
  /* Een eigen look heette hier "Aanvraag op maat" (de labelnaam van de dienst
     'custom', die ook andere aanvragen draagt). Ronde 9, O23. */
  let svcNaam = serviceLabel(o.service, lang) || o.service;
  try {
    const dj = JSON.parse(o.details_json || '{}') || {};
    if (o.service === 'custom' && dj.request === 'custom-look') svcNaam = lang === 'nl' ? 'Eigen look' : 'Custom look';
  } catch { /* dan het label */ }

  /* ── DE LINK IN DE MAIL IS ONZE EIGEN, NIET DIE VAN MOLLIE — 24 september 2026
     Hier werd een Mollie-betaling aangemaakt en ging de checkout-link zelf de
     mail in. Die link hoort bij één betaling, en een open betaling verloopt:
     iDEAL na 15 minuten, creditcard na 30, de rest binnen een paar uur. Een
     klant die de mail 's avonds of de volgende ochtend opent, landde op een
     dode Mollie-pagina. /api/order-pay maakt bij elke klik een verse betaling
     voor het bedrag zoals het dan op de rij staat — dezelfde route als de
     knop "Opnieuw betalen" op de bedankpagina. De webhook koppelt op `ref`,
     dus welke betaling slaagt maakt niet uit. */
  const url = `${origin}/api/order-pay?ref=${encodeURIComponent(o.ref)}&lang=${lang}`;

  const euro = (c) => mailBedrag(c, lang);
  const bedrag = euro(teBetalen);
  const btw = Number(o.vat_cents) || 0;

  /* ── BIJ EEN OFFERTE: WAT HET BEDRAG IS, EN DE ZAKELIJKE VERKLARING ────────
     24 september 2026. Lucas: *"beide vermelden."* Een aanvraag (eigen look,
     video) krijgt pas hier een bedrag, en de klant hoort te lezen of dat de
     volledige prijs is of een aanbetaling. En een aanvraag vraagt niet naar de
     zakelijke verklaring (zie business_notes in functions/api/order.js); die
     staat dan hier, met wat betalen betekent. */
  let d = {};
  try { d = JSON.parse(o.details_json || '{}') || {}; } catch { d = {}; }
  const aanbetaling = offerte && d.quote_kind === 'aanbetaling';
  const restant = offerte && d.quote_kind === 'restant';
  const verklaringOntbreekt = offerte && d.business_declaration === 'MISSING';
  const opgegevenBtw = String(o.vat_number || '').trim();
  const euBtwNietBevestigd = !offerte && !herinnering && !btwErbij && (Number(o.vat_cents) || 0) > 0
    && !!opgegevenBtw && !/^NL/i.test(opgegevenBtw);
  const offerteSoort = !offerte ? '' : restant
    ? (lang === 'nl'
      ? `<strong>Dit is het restant</strong> van ${esc(d.restant_van || '')}, na je aanbetaling. Daarna is alles betaald.`
      : `<strong>This is the remainder</strong> of ${esc(d.restant_van || '')}, after your deposit. After this everything is paid.`)
    : aanbetaling
    ? (lang === 'nl'
      ? `<strong>Dit is een aanbetaling</strong>, niet de volledige prijs. Het restant spreken we met je af zodra we weten wat het wordt, en daarvoor krijg je een aparte betaallink. Blijkt je idee niet te maken met onze werkwijze, dan krijg je de aanbetaling terug.`
      : `<strong>This is a deposit</strong>, not the full price. We agree the rest with you once we know what it will be, and you get a separate payment link for it. If your idea turns out not to be possible with our way of working, the deposit is refunded.`)
    : (lang === 'nl'
      ? `<strong>Dit is de volledige prijs</strong> — er komt niets meer bij.`
      : `<strong>This is the full price</strong> — nothing is added later.`);
  /* Ronde 9 (F44): een aanvraag vraagt geen adres. Zonder adres staat op de
     factuur alleen een naam; Studio (Je gegevens) is waar hij het kwijt kan. */
  const adresVraag = offerte && !String(o.address_line1 || '').trim()
    ? (lang === 'nl'
      ? `Wil je je factuuradres op de factuur? Vul het in bij <a href="${origin}/nl/account/details">VISUAILS Studio → Je gegevens</a> vóór je betaalt.`
      : `Want your billing address on the invoice? Fill it in at <a href="${origin}/account/details">VISUAILS Studio → Your details</a> before you pay.`)
    : '';
  const verklaring = !verklaringOntbreekt ? '' : (lang === 'nl'
    ? `VISUAILS levert uitsluitend aan bedrijven. Met je betaling bevestig je dat je deze opdracht als bedrijf geeft, en dat we meteen mogen beginnen. Bestel je vanuit een ander EU-land met een btw-nummer? Stuur het ons vóór je betaalt; dan passen we de btw aan.`
    : `VISUAILS supplies businesses only. By paying you confirm you place this order as a business, and that we may start straight away. Ordering from another EU country with a VAT number? Send it to us before you pay and we adjust the VAT.`);
  await sendMail(env, {
    to: o.email,
    subject: herinnering
      ? (lang === 'nl' ? `Je bestelling wacht nog op betaling — ${o.ref}` : `Your order is still waiting for payment — ${o.ref}`)
      : offerte
        ? (lang === 'nl' ? `Je offerte — ${o.ref}` : `Your quote — ${o.ref}`)
        : (lang === 'nl' ? `Je bestelling is nagekeken — ${o.ref}` : `Your order has been checked — ${o.ref}`),
    html: mailShell({
      lang,
      preheader: lang === 'nl' ? 'De betaallink staat erin.' : 'The payment link is inside.',
      body: [
        mailH1(herinnering
          ? (lang === 'nl' ? 'Nog niet betaald' : 'Not paid yet')
          : offerte
            ? (lang === 'nl' ? 'Je offerte' : 'Your quote')
            : btwErbij
              ? (lang === 'nl' ? 'Nagekeken — met btw' : 'Checked — with VAT')
              : (lang === 'nl' ? 'Nagekeken en akkoord' : 'Checked — ready to pay')),
        /* De aanhef met voornaam, zoals in elke andere klantmail (ronde 9, O21). */
        mailP(mailGreeting(o.name, lang)),
        /* Bij een OFFERTE (eigen look, video) is dit de eerste keer dat de klant
           een bedrag ziet; de tekst zegt dus wat het is en dat betalen het akkoord
           is. Niets begint voordat er betaald is — dezelfde belofte als op de
           aanvraagpagina ("Nothing is charged ... until you say yes in writing"). */
        mailP(herinnering
          ? (lang === 'nl'
            ? `Je bestelling <strong>${esc(o.ref)}</strong> staat nog open: er is nog niet betaald. Wil je hem nog? Dan is dit de link. Wil je hem niet meer, dan hoef je niets te doen: er wordt niets in rekening gebracht${o.window_start ? ', en een gereserveerde leverdatum komt na zeven dagen weer vrij voor anderen' : ''}.`
            : `Your order <strong>${esc(o.ref)}</strong> is still open: it has not been paid yet. Still want it? This is the link. If not, there is nothing to do: nothing is charged${o.window_start ? ', and a reserved delivery date is released to others after seven days' : ''}.`)
          : offerte
          ? (lang === 'nl'
            ? `Hieronder staat de prijs voor <strong>${esc(o.ref)}</strong>, zoals besproken. ${offerteSoort} Betalen is je akkoord — daarna gaan we voor je aan het werk. Vragen? Beantwoord gewoon deze mail.`
            : `Below is the price for <strong>${esc(o.ref)}</strong>, as discussed. ${offerteSoort} Paying is your go-ahead — we start on it straight after. Questions? Just reply to this mail.`)
          : btwErbij
          ? (lang === 'nl'
            ? `We hebben de gegevens bij <strong>${esc(o.ref)}</strong> nagekeken. Op basis van wat we konden controleren, rekenen we toch ${Math.round(Number(o.vat_rate) * 100) || 21}% btw: ${euro(btw)} bovenop het bedrag dat je bij het bestellen zag. Klopt dat niet — heb je bijvoorbeeld een geldig btw-nummer? Beantwoord deze mail, dan kijken we het na en passen we het aan vóór je betaalt.`
            : `We have checked the details on <strong>${esc(o.ref)}</strong>. Based on what we could verify, we do charge ${Math.round(Number(o.vat_rate) * 100) || 21}% VAT: ${euro(btw)} on top of the amount you saw when ordering. Not right — do you have a valid VAT number, for example? Reply to this mail and we check it and adjust it before you pay.`)
          /* RONDE 9 (F37) — een EU-klant met een btw-nummer dat VIES niet bevestigde,
             las hier "Alles klopt" en kreeg € 323,07 te betalen waar hij € 267
             verwachtte (btw verlegd). Dan zegt de mail waarom er btw op staat, en
             wat hij kan doen. */
          : euBtwNietBevestigd
          ? (lang === 'nl'
            ? `We hebben de gegevens bij <strong>${esc(o.ref)}</strong> nagekeken. Je btw-nummer konden we bij de Europese controle (VIES) niet bevestigen, dus op deze bestelling staat Nederlandse btw (${Math.round(Number(o.vat_rate) * 100) || 21}%). Is je nummer wel geldig? Beantwoord deze mail vóór je betaalt, dan controleren we het opnieuw en wordt de btw verlegd. Anders kun je nu betalen — daarna begint de productie meteen.`
            : `We have checked the details on <strong>${esc(o.ref)}</strong>. We could not confirm your VAT number with the European check (VIES), so Dutch VAT (${Math.round(Number(o.vat_rate) * 100) || 21}%) is on this order. Is your number valid? Reply to this mail before you pay and we check it again and reverse-charge the VAT. Otherwise you can pay now — production starts straight after.`)
          : (lang === 'nl'
            ? `We hebben de gegevens bij <strong>${esc(o.ref)}</strong> nagekeken. Alles klopt, dus je kunt nu betalen — daarna begint de productie meteen.`
            : `We have checked the details on <strong>${esc(o.ref)}</strong>. Everything is in order, so you can pay now — production starts straight after.`)),
        verklaring ? mailP(verklaring) : '',
        adresVraag ? mailP(adresVraag) : '',
        mailPayPanel({
          label: aanbetaling ? (lang === 'nl' ? 'Aanbetaling' : 'Deposit') : restant ? (lang === 'nl' ? 'Restant' : 'Remainder') : (lang === 'nl' ? 'Te betalen' : 'To pay'),
          amount: bedrag,
          /* Het bruto bedrag alleen zegt een zakelijke klant weinig; de btw erbij
             laat zien waarom het bedrag hoger is dan de nettoprijs op de site. */
          /* Met de eenheid bij het aantal ("3 producten", niet "· 3"), en bij 0%
             waaróm (verlegd of buiten de EU) — 29 september 2026. */
          sub: `${esc(svcNaam)}${o.product_count ? ` · ${o.product_count} ${lang === 'nl' ? (o.product_count === 1 ? 'product' : 'producten') : (o.product_count === 1 ? 'product' : 'products')}` : ''}`
            + (btw > 0
              ? (lang === 'nl' ? ` · incl. ${euro(btw)} btw` : ` · incl. ${euro(btw)} VAT`)
              : (o.vat_treatment === 'eu_reverse_charge'
                ? (lang === 'nl' ? ' · btw verlegd' : ' · VAT reverse-charged')
                : (lang === 'nl' ? ' · geen btw' : ' · no VAT')))
            + (tegoed > 0 ? (lang === 'nl' ? `<br>Totaal ${euro(bruto)} · min ${euro(tegoed)} tegoed` : `<br>Total ${euro(bruto)} · minus ${euro(tegoed)} credit`) : ''),
          href: url,
          cta: lang === 'nl' ? 'Betalen' : 'Pay now',
        }),
        mailLinkLine(url, lang === 'nl' ? 'Werkt de knop niet? Gebruik deze link:' : 'Button not working? Use this link:'),
        mailSpamNote(lang),
      ].join(''),
    }),
  });

  /* ── 'pending' IS GEEN BESTELSTATUS — 17 september 2026 ───────────────────
         `order_events.status` draagt de status waarin de bestelling stond toen
         dit gebeurde, en de klanttijdlijn vertaalt die met statusLabel(). Die
         lijst kent received / in_production / human_check / delivered /
         cancelled — 'pending' staat er niet in, en account.js valt dan terug op
         `|| e.status`: op een Nederlandse tijdlijn stond letterlijk het kale
         Engelse woord "pending".
         De eigen status van de bestelling, met dezelfde terugval als in
         invoice.js. Er verandert niets aan de bestelling; er wordt alleen
         vastgelegd wat er gebeurde. */
  await env.DB.prepare(
    `INSERT INTO order_events (order_id, status, note, actor)
     VALUES (?1, ?3, ?2, 'studio')`
  ).bind(orderId, lang === 'nl'
    ? `${herinnering ? 'Betaalherinnering' : 'Betaallink'} verstuurd naar ${o.email} voor ${bedrag}.`
    : `${herinnering ? 'Payment reminder' : 'Payment link'} sent to ${o.email} for ${bedrag}.`, o.status || 'received').run();

  console.log('[admin] betaallink verstuurd voor', o.ref);
  return url;
}
