/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE MAIL WAAR DE FACTUUR IN ZIT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM ER GEEN BESTAANDE MAIL WAS OM DE FACTUUR AAN TE HANGEN ────────────
 *
 * Het plan was "de pdf als bijlage bij dezelfde mail waarin de betaling wordt
 * bevestigd". Bij het aansluiten bleek die mail niet te bestaan. De site stuurt
 * er vier: de bevestiging van de aanvraag (met de betaallink erin), de
 * inloglink, de levermail en de checklist. Geen daarvan gaat uit op het moment
 * dat het geld binnenkomt.
 *
 * Dat is op zichzelf een gat. Iemand betaalt en hoort daarna niets tot het werk
 * klaar is — bij een test sample van €1 is dat een dag, bij een catalogorder van
 * een paar duizend euro is het stil op precies het verkeerde moment. Dus dit is
 * die mail: één bericht, verstuurd door de betaalwebhook, dat zegt dat het geld
 * binnen is en de factuur meestuurt.
 *
 * ── DE BIJLAGE KOMT UIT R2 EN NIET UIT HET GEHEUGEN ──────────────────────────
 *
 * issueInvoice() heeft de bytes net gemaakt en zou ze kunnen doorgeven. Toch
 * lezen we ze terug uit R2, en dat is met opzet: als het object er niet blijkt
 * te staan, dan klopt de belofte in deze mail niet. Liever de mail zonder
 * bijlage én zonder die belofte, dan een mail die zegt "de factuur zit
 * hierbij" bij een lege paperclip. Het kost één leesactie in hetzelfde netwerk.
 *
 * ── WAT ER NIET IN STAAT ─────────────────────────────────────────────────────
 *
 * Geen bedrag in de onderwerpregel, geen betaalknop, geen aansporing. Dit is een
 * ontvangstbevestiging: het geld is al binnen. Alles wat naar een actie wijst
 * maakt de mail langer en geeft een filter een reden om hem als marketing te
 * lezen — zie de noot in mailTemplate.js over waarom de merkzin in de voet staat
 * en niet in het onderwerp.
 */

import { sendMail, toBase64 } from './mail.js';
import { shell, h1, p, rows, note, linkLine, esc, button, greeting, vragen, spamNote } from './mailTemplate.js';
/* Punt 7.01 (8 oktober 2026): "Zo gaat het verder" uit één bron met de
   bedankpagina en de bestelmail, de privélink bovenaan, en wat er ontbreekt. */
import { verderBlokHtml, leveringVan } from './verder.js';
import { ontbrekendVoorOrder, ontbrekendRegels } from './ontbreekt.js';
import { mintToken, hashToken, portalUrl } from './token.js';
/* 6.03 (8 oktober 2026): credits blijven voor iedereen even lang geldig; de
   doorschuifregel per termijn (rolloverMonths) staat niet meer in deze mail. */
import { CREDITS_GELDIG_MAANDEN } from '../data/pricing.js';
import { VAT_TREATMENT } from '../data/vat.js';
import { formatDate } from './invoicePdf.js';

const SITE = 'https://visuails.com';

/** €1.101,10 — dezelfde vorm als de rest van de site, niet Intl (workerd-ICU verschilt per regio). */
/* In de tekens van de taal van de mail (24 september 2026): een Engelse mail
   zei "€ 1.101,10" terwijl de bijgevoegde pdf "€1,101.10" zegt. */
/* "je Abonnement op maat-abonnement" / "your Custom plan plan" (24 september 2026). */
const abo = (plan) => (/abonnement/i.test(plan) ? `je ${plan.charAt(0).toLowerCase()}${plan.slice(1)}` : `je ${plan}-abonnement`);
const planEn = (plan) => (/\bplan\b/i.test(plan) ? `your ${plan.charAt(0).toLowerCase()}${plan.slice(1)}` : `your ${plan} plan`);

function euro(cents, lang = 'nl') {
  const n = Math.round(Number(cents) || 0);
  const a = Math.abs(n);
  const en = lang === 'en';
  const whole = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, en ? ',' : '.');
  return `${n < 0 ? '-' : ''}€ ${whole}${en ? '.' : ','}${String(a % 100).padStart(2, '0')}`;
}

const COPY = {
  nl: {
    subject: (ref) => `Betaling ontvangen — ${ref}`,
    pre: (n) => `Je factuur ${n} zit als pdf bij deze mail.`,
    head: 'Je betaling is binnen',
    /* Punt 7.07: één zin waar de bestelling staat, dan één knop. */
    lede: (bedrag, bij) => `Bedankt — je betaling van ${bedrag} is binnen. ${bij ? 'De factuur zit als pdf bij deze mail.' : 'Je factuur staat klaar in VISUAILS Studio, onder Facturen.'}`,
    knop: 'Bekijk je bestelling',
    rInvoice: 'Factuurnummer',
    rDate: 'Factuurdatum',
    rRef: 'Bestelling',
    rAmount: 'Betaald',
    attached: 'Je vindt de factuur ook altijd terug in VISUAILS Studio, onder <b>Facturen</b>.',
    noAttach: 'Je factuur staat klaar in VISUAILS Studio, onder <b>Facturen</b>. Lukt het downloaden niet, mail ons dan even.',
    portal: 'Naar VISUAILS Studio',
    reverse: 'Op deze factuur is de btw verlegd naar jou als afnemer. Je geeft hem zelf aan in je eigen land.',
    outside: 'Deze levering valt buiten de Europese btw.',
    keep: 'Bewaar deze factuur voor je eigen administratie.',
    nextH: 'Wat nu',
    /* Ronde 9 (F40): een offerte (video, eigen look) heeft geen uploadformulier
       gehad. Zonder deze zin wist de klant na betalen niet hoe zijn foto's bij
       ons komen. */
    nextModel: 'Je krijgt eerst een paar richtingen om op te reageren, met één correctieronde. Daarna bouwen we het gezicht, halen het door de uniciteitscontrole en leggen het vast op jouw merk. Je krijgt een mail zodra er iets te bekijken is.',
    nextOfferte: 'We gaan aan de slag zoals in de offerte staat. Heb je je productfoto’s nog niet gestuurd? Beantwoord dan deze mail met de foto’s, of stuur ze via WhatsApp. Je krijgt een mail zodra er iets klaarstaat om te bekijken.',
  },
  en: {
    subject: (ref) => `Payment received — ${ref}`,
    pre: (n) => `Your invoice ${n} is attached as a PDF.`,
    head: 'We have your payment',
    lede: (amount, att) => `Thank you — your payment of ${amount} is in. ${att ? 'The invoice is attached as a PDF.' : 'Your invoice is waiting in VISUAILS Studio, under Invoices.'}`,
    knop: 'See your order',
    rInvoice: 'Invoice number',
    rDate: 'Invoice date',
    rRef: 'Order',
    rAmount: 'Paid',
    attached: 'You can also find the invoice any time in VISUAILS Studio, under <b>Invoices</b>.',
    noAttach: 'Your invoice is waiting in VISUAILS Studio, under <b>Invoices</b>. If the download will not work, email us.',
    portal: 'Go to VISUAILS Studio',
    reverse: 'VAT on this invoice is reverse charged to you as the customer. You declare it yourself in your own country.',
    outside: 'This supply falls outside the scope of European VAT.',
    keep: 'Keep this invoice for your own records.',
    nextH: 'What happens next',
    nextModel: 'First you get a few directions to react to, with one correction round. Then we build the face, run it through the uniqueness check and tie it to your brand. You get an email as soon as there is something to look at.',
    nextOfferte: 'We start as set out in the quote. Not sent your product photos yet? Reply to this email with the photos, or send them on WhatsApp. You get an email as soon as there is something to look at.',
  },
};

/*
 * DE DATUM KOMT UIT invoicePdf.js EN WORDT HIER NIET OPNIEUW OPGEMAAKT.
 *
 * Deze mail heeft dat document als bijlage. '9-8-2026' in de mail en
 * '9 augustus 2026' op de pdf zijn twee schrijfwijzen voor dezelfde factuur in
 * één bericht — het soort verschil dat niemand een bug noemt en iedereen even
 * moet natrekken. Vandaar dezelfde functie, en niet een tweede tabel met
 * maandnamen die ooit uit elkaar loopt.
 *
 * Een cijferdatum zou bovendien de vorm zijn die een Amerikaanse lezer als
 * 8 september leest.
 */
const dateLine = (iso, lang) => formatDate(String(iso || ''), lang);

/**
 * De mail zelf, als losse functie: invoer erin, html eruit, niets erbuiten.
 *
 * ── WAAROM DIT NIET IN mailInvoice() ZIT ─────────────────────────────────────
 *
 * Om dezelfde reden dat customerEmail() en deliveryEmail() los staan van hun
 * verzendpad: scripts/mail-render.mjs zet alle klantmails naast elkaar op één
 * plaat, en dat kan alleen met een functie die html teruggeeft zonder een fetch
 * te doen. Een mail die je niet naast de andere kunt leggen, is een mail waarvan
 * niemand merkt dat hij uit de toon valt.
 *
 * @param {object} o
 * @param {'nl'|'en'} o.lang
 * @param {{ref?: string}} o.order
 * @param {{number: string}} o.invoice
 * @param {object} o.snap  de bewaarde momentopname
 * @param {boolean} o.attached  zit de pdf er echt bij? Bepaalt één alinea.
 */
export function invoiceEmail({ lang = 'nl', order = {}, invoice, snap = {}, attached = true, link = '', levering = null, ontbreekt = null, uitgesteld = null }) {
  const t = COPY[lang === 'en' ? 'en' : 'nl'];
  const gross = Number(snap.netCents || 0) + Number(snap.vatCents || 0);
  // Dezelfde drie waarden als vat.js en invoicePdf.js, uit de constante en niet
  // uit een substring: 'reverse' herkennen in een string is precies hoe een
  // vierde behandeling ooit stilzwijgend als verlegging op papier komt.
  const treatment = String(snap.treatment || '');
  const vatLine = treatment === VAT_TREATMENT.reverseCharge ? t.reverse
    : treatment === VAT_TREATMENT.outsideScope ? t.outside
      : '';

  /* ── ZO GAAT HET VERDER — 8 oktober 2026 (punt 7.01) ───────────────────────
     Hier stond sinds 1 oktober (ronde 8, M-C1) één "Wat nu"-zin met een eigen,
     getypte levertijd. Nu het vaste blok uit src/lib/verder.js, met de
     leverregel van déze bestelling (de gereserveerde dagen, voorrang, of
     turnaround()), het nakijken, en dat er tot de levering niets komt — behalve
     als er iets mis is. Ontbreken er foto's, dan noemt het blok welke (2.05).
     Ook bij de €1-proef: het blok belooft geen revisieronde, dus het klopt daar
     ook (`order.noNext` van de webhook wordt daarom niet meer gelezen).
     Een offerte (video, eigen look) en een merkmodel houden hun eigen zin: daar
     is geen foto-upload en geen gewone levering. */
  const offerte = order.service === 'video' || order.service === 'custom';
  const eigenZin = order.service === 'brand-model' ? t.nextModel : offerte ? t.nextOfferte : '';
  const watNu = !order.ref ? ''
    : eigenZin ? p(`<b>${esc(t.nextH)}.</b> ${esc(eigenZin)}`, { top: 4 })
      : verderBlokHtml({ lang, levering: levering || leveringVan(order), factuur: 'bijgevoegd', ontbreekt });
  const portaal = `${SITE}${lang === 'nl' ? '/nl' : ''}/account`;
  const body = [
    h1(t.head, esc(invoice.number)),
    /* De aanhef, zoals in elke andere klantmail (ronde 9, O21). Alleen met een
       naam: deze mail gaat ook uit voor een abonnementstermijn. */
    order.name ? p(greeting(order.name, lang)) : '',
    p(esc(t.lede(euro(gross, lang), attached))),
    /* De knop bovenaan (7.01): de privélink van deze bestelling. Zonder link
       (een oude bestelling, of het maken van de link lukte niet) gaat hij naar
       VISUAILS Studio, waar dezelfde bestelling staat. */
    order.ref ? button(link || `${portaal}/orders`, t.knop) : '',
    watNu,
    /* B04 (doorloop 27): wachtte de bevestiging op deze betaling, dan is dit de
       enige mail, en staat hier wat de klant bestelde (de rijen uit de
       bevestiging, al opgemaakt in functions/api/order.js). */
    uitgesteld?.samenvatting || '',
    rows([
      [t.rInvoice, esc(invoice.number)],
      [t.rDate, esc(dateLine(snap.date, lang))],
      [t.rRef, esc(order.ref || '')],
      [t.rAmount, esc(euro(gross, lang))],
    ]),
    p(attached ? t.attached : t.noAttach, { top: 4 }),
    attached ? '' : linkLine(portaal, t.portal),
    vatLine ? note(esc(vatLine)) : '',
    // GEEN spamNote() HIER. Die regel — "nog niets? kijk in je spam" — hoort in
    // een mail waarop de klant wácht: de inloglink, de levermelding. Dit bericht
    // komt ongevraagd binnen op het moment van betalen, en iemand vertellen dat
    // hij in zijn spam moet kijken naar de mail die hij aan het lezen is, is
    // precies het soort meegekopieerde alinea dat een transactionele mail
    // rommelig maakt.
    note(esc(t.keep)),
    order.ref ? vragen(lang, order.ref) : '',
    /* De contactenregel hoort in de eerste mail aan een nieuw adres (7.07); bij
       een uitgestelde bevestiging is dat deze. */
    uitgesteld?.nieuwAdres ? `<div style="height:18px;font-size:0;line-height:0">&nbsp;</div>${spamNote(lang)}` : '',
  ].join('');

  return {
    subject: t.subject(order.ref || invoice.number),
    html: shell({ lang, preheader: t.pre(invoice.number), body }),
  };
}

/**
 * Wat de betaalmail over de bestelling zelf moet weten — 8 oktober 2026 (7.01).
 *
 * De webhook geeft de factuurmail alleen kenmerk, adres, naam en taal mee. Voor
 * de knop bovenaan is een privélink nodig, en die kan niet uit de database
 * komen: daar staat alleen de hash (zie de kop van order_tokens in schema.sql).
 * Dus maken we er hier een, zoals elke aankondigingsmail dat doet sinds
 * migratie 0044 — de vorige links blijven werken. En de leverregel en wat er
 * aan foto's ontbreekt (src/lib/ontbreekt.js, punt 2.05).
 *
 * Alles best effort: lukt een stap niet, dan gaat de mail zonder dat stuk.
 * Ook gebruikt door mailBetalingOntvangen() in cancelMail.js.
 *
 * @returns {Promise<{ link: string, levering: object|null, ontbreekt: string[] }>}
 */
export async function betaalMailContext(env, ref, lang = 'nl') {
  const uit = { link: '', levering: null, ontbreekt: [] };
  if (!env?.DB || !ref) return uit;
  let o = null;
  try {
    o = await env.DB.prepare(
      'SELECT id, tier, window_start, window_end, details_json FROM orders WHERE ref = ?1'
    ).bind(ref).first();
  } catch { return uit; }
  if (!o) return uit;
  uit.levering = leveringVan(o);
  try {
    const token = mintToken();
    await env.DB.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?1, ?2)')
      .bind(o.id, await hashToken(token)).run();
    uit.link = portalUrl(token, env.PUBLIC_ORIGIN || SITE);
  } catch (err) {
    console.warn('[invoice-mail] geen privélink voor', ref, '—', err && err.message);
  }
  try {
    uit.ontbreekt = ontbrekendRegels(await ontbrekendVoorOrder(env.DB, o.id), lang);
  } catch { /* onbekend: dan niets tonen */ }
  return uit;
}

/**
 * De bevestigingsmail met de factuur eraan.
 *
 * BEST EFFORT, EN DAAROM MET EEN EIGEN try. Dit wordt aangeroepen vanuit de
 * betaalwebhook. Gooit hij daar, dan antwoordt die met 500, levert Mollie
 * opnieuw af en wordt de hele betaling nog een keer verwerkt — een mislukte
 * mail mag geen tweede boeking veroorzaken. De factuur zelf staat op dat moment
 * al in R2 en in VISUAILS Studio; deze mail is het gemak, niet het document.
 *
 * @returns {Promise<boolean>} of er iets is verstuurd.
 */
export async function mailInvoice(env, { order, invoice, uitgesteld = null }) {
  try {
    if (!order?.email || !invoice) return false;
    const lang = invoice.lang === 'en' ? 'en' : (order.lang === 'en' ? 'en' : 'nl');

    let snap = {};
    try { snap = JSON.parse(invoice.snapshot_json || '{}'); } catch { /* dan zonder */ }

    // De bijlage. Ontbreekt hij, dan verandert de tekst mee — zie de header.
    let attachment = null;
    if (invoice.pdf_key && env?.UPLOADS) {
      try {
        const obj = await env.UPLOADS.get(invoice.pdf_key);
        const buf = obj && typeof obj.arrayBuffer === 'function' ? await obj.arrayBuffer() : null;
        if (buf && buf.byteLength) {
          attachment = { filename: `${invoice.number}.pdf`, content: toBase64(buf) };
        }
      } catch (err) {
        console.warn('[invoice-mail] pdf niet leesbaar voor', invoice.number, '—', err && err.message);
      }
    }

    const ctx = await betaalMailContext(env, order.ref, lang);
    const { subject, html } = invoiceEmail({ lang, order, invoice, snap, attached: !!attachment, ...ctx, uitgesteld });
    await sendMail(env, {
      to: order.email,
      /* ── EN EEN KOPIE VOOR DE EIGEN ADMINISTRATIE — 20 augustus 2026 ───────
         De factuur ging alleen naar de klant. De bron blijft `invoices` plus de
         pdf in R2 — dat is de administratie en dat verandert niet — maar een
         factuur die langskomt in de mailbox is wat je bij een kwartaalaangifte
         terugvindt zonder ergens in te loggen, en het is de snelste manier om te
         zien dát er een uitgegaan is.

         Uit `INVOICE_BCC` en niet uit een adres hier: de eigen administratie kan
         morgen een boekhouder zijn en dat is een instelling, geen code. Staat de
         variabele niet, dan gaat de mail gewoon alleen naar de klant — een
         ontbrekende kopie mag een factuur nooit tegenhouden. */
      bcc: env.INVOICE_BCC || undefined,
      subject,
      html,
      attachments: attachment ? [attachment] : undefined,
    });
    return true;
  } catch (err) {
    console.error('[invoice-mail] versturen mislukt voor bestelling', order?.ref, '—', err && err.message ? err.message : err);
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
 * DE MAIL BIJ EEN BETAALDE ABONNEMENTSMAAND — 23 september 2026
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Uit de doorloop: een klant sloot een Studio-abonnement af, betaalde de eerste
 * maand bij Mollie, kreeg een factuur in Studio — en geen enkele mail. Geen
 * "je abonnement loopt", geen factuur in de mailbox, en de studio hoorde het
 * ook niet. Een bestelling van € 89 krijgt vier mails; een machtiging van
 * € 790 per maand kreeg er nul.
 *
 * Eén mail per betaalde maand, met de factuur als bijlage: de eerste keer
 * zegt hij dat het abonnement loopt en wat de klant elke maand krijgt, elke
 * volgende keer dat de credits voor die maand klaarstaan. Dezelfde vorm als
 * de factuurmail bij een bestelling, met dezelfde bcc naar de administratie.
 */
const SUB_COPY = {
  nl: {
    subjectNext: (ref, maand) => `Je credits voor ${maand} staan klaar — ${ref}`,
    headNext: 'Je maandtermijn is betaald',
    ledeFirst: (plan, credits, dag) => `Bedankt. Je eerste maand is betaald en ${abo(plan)} loopt: ${credits} credits per maand, die je besteedt aan catalog, lifestyle en video. Je bestelt wanneer je wilt, via het gewone formulier.`,
    /* Vooruitbetaald (24 september 2026): de mail zei "je eerste maand is betaald"
       boven een afschrijving van een heel jaar. */
    ledeFirstPrepaid: (plan, credits, dag) => `Bedankt. Je jaar is vooruitbetaald en ${abo(plan)} loopt: twaalf maanden lang ${credits} credits per maand, die je in VISUAILS Studio besteedt aan catalog, lifestyle en video. Er wordt dit jaar niets meer afgeschreven. Je bestelt wanneer je wilt, via het gewone formulier.`,
    ledeNext: (maand, credits) => `De termijn voor ${maand} is binnen. Je ${credits} credits voor deze maand staan klaar in VISUAILS Studio. Zolang je abonnement loopt, vervallen je credits niet; in Studio zie je hoeveel je er kunt sparen.`,
    rPlan: 'Abonnement',
    rCredits: 'Credits per maand',
    rInvoice: 'Factuurnummer',
    rDate: 'Factuurdatum',
    rAmount: 'Afgeschreven',
    attached: 'De factuur zit als pdf bij deze mail. Je vindt hem ook terug in VISUAILS Studio, onder <b>Facturen</b>.',
    noAttach: 'Je factuur staat klaar in VISUAILS Studio, onder <b>Abonnement &amp; facturering</b>.',
    portal: 'Naar je abonnement in VISUAILS Studio',
    stop: 'Pauzeren of opzeggen doe je zelf in Studio, onder Abonnement — zonder mailtje, zonder wachttijd.',
    /* De welkomstmail (24 september 2026) — zie de kop van mailSubscriptionInvoice(). */
    subjectWelcome: (ref) => `Welkom bij VISUAILS — je abonnement loopt (${ref})`,
    headWelcome: 'Welkom — je abonnement loopt',
    stepsH: 'Zo begin je',
    steps: (dag) => [
      ['Log in op VISUAILS Studio', 'Met de knop hieronder ben je direct binnen. Daarna log je in met je e-mailadres: je krijgt een code per mail, een wachtwoord is er niet.'],
      ['Zet je vaste look', 'Onder <b>Je vaste look</b> kies je per dienst één keer je stijl, achtergrond en model. Die look gaat vanzelf mee met alles wat je laat maken, zodat elke maand bij elkaar past.'],
      /* Ronde 10 (8 oktober 2026): geen lijst en geen vaste week meer. */
      ['Bestel wanneer je wilt', 'Kies op visuails.com een look en bestel via het gewone formulier, zoals iedereen. Ben je ingelogd, dan betaal je met je credits.'],
    ],
    rollover: (n) => `Zolang je abonnement loopt, vervallen je credits niet: je kunt tot ${n} maanden aan credits sparen. Komt er een termijn bij die je daarboven brengt, dan vervalt alleen wat erboven komt, en we waarschuwen je vooraf. Pauzeer of stop je, dan blijven je credits geldig tot ${n} maanden na je laatste termijn.`,
    loginBtn: 'Direct naar VISUAILS Studio',
    loginNote: 'Deze knop logt je meteen in en werkt twee dagen. Later log je in via visuails.com/account met je e-mailadres.',
    invoiceH: 'Je eerste factuur',
  },
  en: {
    subjectNext: (ref, maand) => `Your credits for ${maand} are ready — ${ref}`,
    headNext: 'This month is paid',
    ledeFirst: (plan, credits, dag) => `Thank you. Your first month is paid and ${planEn(plan)} is running: ${credits} credits a month, which you spend on catalog, lifestyle and video. You order whenever you like, through the regular form.`,
    ledeFirstPrepaid: (plan, credits, dag) => `Thank you. Your year is paid in advance and ${planEn(plan)} is running: twelve months of ${credits} credits a month, which you spend in VISUAILS Studio on catalog, lifestyle and video. Nothing else is charged this year. You order whenever you like, through the regular form.`,
    ledeNext: (maand, credits) => `The payment for ${maand} came through. Your ${credits} credits for this month are ready in VISUAILS Studio. While your plan runs, your credits do not expire; Studio shows how many you can save.`,
    rPlan: 'Plan',
    rCredits: 'Credits per month',
    rInvoice: 'Invoice number',
    rDate: 'Invoice date',
    rAmount: 'Charged',
    attached: 'The invoice is attached as a PDF. You can also find it in VISUAILS Studio, under <b>Invoices</b>.',
    noAttach: 'Your invoice is waiting in VISUAILS Studio, under <b>Plan &amp; billing</b>.',
    portal: 'Go to your plan in VISUAILS Studio',
    stop: 'Pausing or cancelling is something you do yourself in Studio, under Plan — no email, no waiting.',
    subjectWelcome: (ref) => `Welcome to VISUAILS — your plan is running (${ref})`,
    headWelcome: 'Welcome — your plan is running',
    stepsH: 'How to start',
    steps: (dag) => [
      ['Sign in to VISUAILS Studio', 'The button below takes you straight in. After that you sign in with your email address: you get a code by email, there is no password.'],
      ['Set your look', 'Under <b>Your look</b> you choose your style, background and model once per service. That look goes with everything you order, so every month fits together.'],
      ['Order whenever you like', 'Pick a look on visuails.com and order through the regular form, like everyone else. When you are signed in, you pay with your credits.'],
    ],
    rollover: (n) => `While your plan runs, your credits do not expire: you can save up to ${n} months of credits. If a payment takes you above that, only what goes above it lapses, and we warn you beforehand. If you pause or stop, your credits stay valid until ${n} months after your last monthly credits came in.`,
    loginBtn: 'Go straight to VISUAILS Studio',
    loginNote: 'This button signs you in straight away and works for two days. Later you sign in at visuails.com/account with your email address.',
    invoiceH: 'Your first invoice',
  },
};

function maandNaam(month, lang) {
  const m = /^(\d{4})-(\d{2})/.exec(String(month || ''));
  if (!m) return String(month || '');
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'nl-NL', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${m[1]}-${m[2]}-15T00:00:00Z`));
}

/**
 * @param {object} o
 * @param {object} o.sub        de rij uit subscriptions (ref, plan, window_day)
 * @param {object} o.customer   { email, lang }
 * @param {object} o.invoice    de rij uit subscription_invoices
 * @param {string} o.planNaam   de naam van het plan in de taal van de klant
 * @param {number} o.credits    credits per maand
 * @param {boolean} o.eerste    de eerste betaalde maand (dan de welkomsttekst)
 */
export async function mailSubscriptionInvoice(env, { sub, customer, invoice, planNaam, credits, eerste, loginLink = '' }) {
  try {
    /* De eerste maand is ook zonder factuur een mail waard: dat is de welkomst-
       mail, en die hoort er te zijn ook als het papier even niet lukt. */
    if (!customer?.email || (!invoice && !eerste)) return false;
    const lang = invoice?.lang === 'en' ? 'en' : (customer.lang === 'en' ? 'en' : 'nl');
    const t = SUB_COPY[lang];
    let snap = {};
    try { snap = JSON.parse(invoice?.snapshot_json || '{}'); } catch { /* dan zonder */ }

    let attachment = null;
    if (invoice?.pdf_key && env?.UPLOADS) {
      try {
        const obj = await env.UPLOADS.get(invoice.pdf_key);
        const buf = obj && typeof obj.arrayBuffer === 'function' ? await obj.arrayBuffer() : null;
        if (buf && buf.byteLength) attachment = { filename: `${invoice.number}.pdf`, content: toBase64(buf) };
      } catch (err) {
        console.warn('[invoice-mail] pdf niet leesbaar voor', invoice.number, '—', err && err.message);
      }
    }

    const maand = maandNaam(invoice?.month, lang);
    const gross = Number(snap.grossCents ?? (Number(snap.netCents || 0) + Number(snap.vatCents || 0)));
    const treatment = String(snap.treatment || '');
    const vatLine = treatment === VAT_TREATMENT.reverseCharge ? COPY[lang].reverse
      : treatment === VAT_TREATMENT.outsideScope ? COPY[lang].outside
        : '';
    const dag = Number(sub.window_day) || 1;
    const ref = sub.ref || invoice?.number || '';
    const studio = `${SITE}${lang === 'nl' ? '/nl' : ''}/account/plan`;
    const factuurRijen = invoice ? rows([
      [t.rPlan, esc(planNaam)],
      [t.rCredits, String(credits)],
      [t.rInvoice, esc(invoice.number)],
      [t.rDate, esc(dateLine(snap.date, lang))],
      [t.rAmount, esc(euro(gross, lang))],
    ]) : rows([[t.rPlan, esc(planNaam)], [t.rCredits, String(credits)]]);

    /* ── DE WELKOMSTMAIL — 24 september 2026 ──────────────────────────────
       Lucas koos voor een welkomstmail na het afsluiten. Het is deze mail, bij
       de eerste betaalde maand, en niet een tweede ernaast: twee mails op
       dezelfde minuut ("je abonnement loopt" en "welkom") lezen als een
       storing. Dus: welkom, de drie stappen om te beginnen, een knop die direct
       inlogt (een gewone inloglink, een uur geldig — zie welkomLink() in
       account.js), en daaronder de factuur. */
    const welkom = eerste ? [
      p(`<b>${esc(t.stepsH)}</b>`, { top: 8, bottom: 8 }),
      ...t.steps(dag).map(([kop, tekst], i) => p(`<b>${i + 1}. ${esc(kop)}</b><br>${tekst}`, { bottom: 12 })),
      p(esc(t.rollover(CREDITS_GELDIG_MAANDEN)), { muted: true }),
      loginLink ? button(loginLink, t.loginBtn) : button(studio, t.portal),
      loginLink ? note(esc(t.loginNote)) : '',
      invoice ? p(`<b>${esc(t.invoiceH)}</b>`, { top: 16, bottom: 8 }) : '',
    ] : [];

    const body = [
      h1(eerste ? t.headWelcome : t.headNext, esc(ref)),
      p(esc(eerste ? (sub.term === 'prepaid' ? t.ledeFirstPrepaid : t.ledeFirst)(planNaam, credits, dag) : t.ledeNext(maand, credits))),
      ...welkom,
      factuurRijen,
      /* Zonder factuur (het maken mislukte bij de eerste maand): geen zin over
         een factuur die er niet is. De studio ziet de fout in de log. */
      invoice ? p(attachment ? t.attached : t.noAttach, { top: 4 }) : '',
      eerste ? '' : linkLine(studio, t.portal),
      vatLine ? note(esc(vatLine)) : '',
      note(esc(t.stop)),
      invoice ? note(esc(COPY[lang].keep)) : '',
    ].join('');

    await sendMail(env, {
      to: customer.email,
      bcc: invoice ? (env.INVOICE_BCC || undefined) : undefined,
      subject: eerste ? t.subjectWelcome(ref) : t.subjectNext(ref, maand),
      html: shell({ lang, preheader: invoice ? COPY[lang].pre(invoice.number) : t.headWelcome, body }),
      attachments: attachment ? [attachment] : undefined,
    });
    return true;
  } catch (err) {
    console.error('[invoice-mail] abonnementsmail mislukt voor', sub?.ref, '—', err && err.message ? err.message : err);
    return false;
  }
}

/*
 * ── EXTRA CREDITS BIJGEKOCHT — 12 oktober 2026 (ab-v3 = c, ab-v4 = b) ─────────
 *
 * De mail na een betaalde bijkoop, met de factuur erbij ("Extra credits · 25 ·
 * Pro", uit dezelfde reeks als een termijnfactuur). Eén keer: de aanroeper
 * (src/lib/bijkopen.js) stuurt hem alleen op de overgang naar 'paid'.
 */
const BIJKOOP_COPY = {
  nl: {
    subject: (n, nummer) => `Je ${n} extra credits staan klaar${nummer ? ` — ${nummer}` : ''}`,
    head: 'Je extra credits staan klaar',
    lede: (n, tot) => `Bedankt. Je betaling is binnen en er staan ${n} extra credits op je saldo in VISUAILS Studio. Ze gaan als eerste op, tellen niet mee voor je spaarplafond en blijven ${CREDITS_GELDIG_MAANDEN} maanden geldig${tot ? `, tot en met ${tot}` : ''}.`,
    rPakket: 'Extra credits',
    rInvoice: 'Factuurnummer',
    rDate: 'Factuurdatum',
    rAmount: 'Betaald',
    attached: 'De factuur zit als pdf bij deze mail. Je vindt hem ook terug in VISUAILS Studio, onder <b>Facturen</b>.',
    noAttach: 'Je factuur staat klaar in VISUAILS Studio, onder <b>Facturen</b>.',
    portal: 'Naar je abonnement in VISUAILS Studio',
  },
  en: {
    subject: (n, nummer) => `Your ${n} extra credits are ready${nummer ? ` — ${nummer}` : ''}`,
    head: 'Your extra credits are ready',
    lede: (n, tot) => `Thank you. Your payment came through and there are ${n} extra credits on your balance in VISUAILS Studio. They are used first, do not count towards your savings limit and stay valid for ${CREDITS_GELDIG_MAANDEN} months${tot ? `, up to and including ${tot}` : ''}.`,
    rPakket: 'Extra credits',
    rInvoice: 'Invoice number',
    rDate: 'Invoice date',
    rAmount: 'Paid',
    attached: 'The invoice is attached as a PDF. You can also find it in VISUAILS Studio, under <b>Invoices</b>.',
    noAttach: 'Your invoice is waiting in VISUAILS Studio, under <b>Invoices</b>.',
    portal: 'Go to your plan in VISUAILS Studio',
  },
};

/**
 * @param {object} o
 * @param {{ email: string }} o.customer
 * @param {object|null} o.invoice  de rij uit subscription_invoices (of null als het papier niet lukte)
 * @param {number} o.pakket        het aantal credits
 * @param {string} o.tot           'YYYY-MM-DD', de laatste dag dat ze gelden ("tot en met")
 * @param {string} o.lang
 */
export async function mailBijkoopFactuur(env, { customer, invoice = null, pakket, tot = '', lang = 'nl' }) {
  try {
    if (!customer?.email) return false;
    const L = invoice?.lang === 'en' ? 'en' : (lang === 'en' ? 'en' : 'nl');
    const t = BIJKOOP_COPY[L];
    let snap = {};
    try { snap = JSON.parse(invoice?.snapshot_json || '{}'); } catch { /* dan zonder */ }
    let attachment = null;
    if (invoice?.pdf_key && env?.UPLOADS) {
      try {
        const obj = await env.UPLOADS.get(invoice.pdf_key);
        const buf = obj && typeof obj.arrayBuffer === 'function' ? await obj.arrayBuffer() : null;
        if (buf && buf.byteLength) attachment = { filename: `${invoice.number}.pdf`, content: toBase64(buf) };
      } catch (err) {
        console.warn('[invoice-mail] pdf niet leesbaar voor', invoice.number, '—', err && err.message);
      }
    }
    const gross = Number(snap.grossCents ?? (Number(snap.netCents || 0) + Number(snap.vatCents || 0)));
    const treatment = String(snap.treatment || '');
    const vatLine = treatment === VAT_TREATMENT.reverseCharge ? COPY[L].reverse
      : treatment === VAT_TREATMENT.outsideScope ? COPY[L].outside
        : '';
    const studio = `${SITE}${L === 'nl' ? '/nl' : ''}/account/plan`;
    const totTekst = tot ? formatDate(String(tot), L) : '';
    const body = [
      h1(t.head, invoice ? esc(invoice.number) : ''),
      p(esc(t.lede(Number(pakket) || 0, totTekst))),
      invoice ? rows([
        [t.rPakket, String(Number(pakket) || 0)],
        [t.rInvoice, esc(invoice.number)],
        [t.rDate, esc(dateLine(snap.date, L))],
        [t.rAmount, esc(euro(gross, L))],
      ]) : rows([[t.rPakket, String(Number(pakket) || 0)]]),
      p(invoice && attachment ? t.attached : t.noAttach, { top: 4 }),
      linkLine(studio, t.portal),
      vatLine ? note(esc(vatLine)) : '',
      invoice ? note(esc(COPY[L].keep)) : '',
    ].join('');
    await sendMail(env, {
      to: customer.email,
      bcc: invoice ? (env.INVOICE_BCC || undefined) : undefined,
      subject: t.subject(Number(pakket) || 0, invoice?.number || ''),
      html: shell({ lang: L, preheader: invoice ? COPY[L].pre(invoice.number) : t.head, body }),
      attachments: attachment ? [attachment] : undefined,
    });
    return true;
  } catch (err) {
    console.error('[invoice-mail] bijkoopmail mislukt —', err && err.message ? err.message : err);
    return false;
  }
}
