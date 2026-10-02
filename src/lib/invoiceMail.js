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
import { shell, h1, p, rows, note, linkLine, esc, button, greeting } from './mailTemplate.js';
import { rolloverMonths } from '../data/plans.js';
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
    lede: 'Bedankt. We hebben je betaling ontvangen en zijn met je bestelling aan de slag.',
    rInvoice: 'Factuurnummer',
    rDate: 'Factuurdatum',
    rRef: 'Bestelling',
    rAmount: 'Betaald',
    attached: 'De factuur zit als pdf bij deze mail. Je vindt hem ook altijd terug in VISUAILS Studio, onder <b>Facturen</b>.',
    noAttach: 'Je factuur staat klaar in VISUAILS Studio, onder <b>Facturen</b>. Lukt het downloaden niet, mail ons dan even.',
    portal: 'Naar VISUAILS Studio',
    reverse: 'Op deze factuur is de btw verlegd naar jou als afnemer. Je geeft hem zelf aan in je eigen land.',
    outside: 'Deze levering valt buiten de Europese btw.',
    keep: 'Bewaar deze factuur voor je eigen administratie.',
    nextH: 'Wat nu',
    next: (wanneer) => `Een specialist maakt je beelden en loopt elk beeld na. Je krijgt een mail zodra ze klaarstaan${wanneer}. Daarna keur je ze per beeld goed, of vraag je één gratis revisieronde aan.`,
    /* Ronde 9 (F40): een offerte (video, eigen look) heeft geen uploadformulier
       gehad. Zonder deze zin wist de klant na betalen niet hoe zijn foto's bij
       ons komen. */
    nextModel: 'Je krijgt eerst een paar richtingen om op te reageren, met één correctieronde. Daarna bouwen we het gezicht, halen het door de uniciteitscontrole en leggen het vast op jouw merk. Je krijgt een mail zodra er iets te bekijken is.',
    nextOfferte: 'We gaan aan de slag zoals in de offerte staat. Heb je je productfoto’s nog niet gestuurd? Beantwoord dan deze mail met de foto’s, of stuur ze via WhatsApp. Je krijgt een mail zodra er iets klaarstaat om te bekijken.',
    asap: ' (vaak binnen een dag, soms een paar dagen)',
    window: (van, tot) => ` — op de gereserveerde datum, ${van}${tot && tot !== van ? ` tot en met ${tot}` : ''}`,
  },
  en: {
    subject: (ref) => `Payment received — ${ref}`,
    pre: (n) => `Your invoice ${n} is attached as a PDF.`,
    head: 'We have your payment',
    lede: 'Thank you. Your payment came through and we have started on your order.',
    rInvoice: 'Invoice number',
    rDate: 'Invoice date',
    rRef: 'Order',
    rAmount: 'Paid',
    attached: 'The invoice is attached as a PDF. You can also find it any time in VISUAILS Studio, under <b>Invoices</b>.',
    noAttach: 'Your invoice is waiting in VISUAILS Studio, under <b>Invoices</b>. If the download will not work, email us.',
    portal: 'Go to VISUAILS Studio',
    reverse: 'VAT on this invoice is reverse charged to you as the customer. You declare it yourself in your own country.',
    outside: 'This supply falls outside the scope of European VAT.',
    keep: 'Keep this invoice for your own records.',
    nextH: 'What happens next',
    next: (when) => `A specialist makes your images and checks every one. You get an email as soon as they are ready${when}. Then you approve them image by image, or ask for one free revision round.`,
    nextModel: 'First you get a few directions to react to, with one correction round. Then we build the face, run it through the uniqueness check and tie it to your brand. You get an email as soon as there is something to look at.',
    nextOfferte: 'We start as set out in the quote. Not sent your product photos yet? Reply to this email with the photos, or send them on WhatsApp. You get an email as soon as there is something to look at.',
    asap: ' (often within a day, sometimes a few days)',
    window: (from, to) => ` — on the reserved date, ${from}${to && to !== from ? ` to ${to}` : ''}`,
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
export function invoiceEmail({ lang = 'nl', order = {}, invoice, snap = {}, attached = true }) {
  const t = COPY[lang === 'en' ? 'en' : 'nl'];
  const gross = Number(snap.netCents || 0) + Number(snap.vatCents || 0);
  // Dezelfde drie waarden als vat.js en invoicePdf.js, uit de constante en niet
  // uit een substring: 'reverse' herkennen in een string is precies hoe een
  // vierde behandeling ooit stilzwijgend als verlegging op papier komt.
  const treatment = String(snap.treatment || '');
  const vatLine = treatment === VAT_TREATMENT.reverseCharge ? t.reverse
    : treatment === VAT_TREATMENT.outsideScope ? t.outside
      : '';

  /* ── WAT NU — 1 oktober 2026 (ronde 8, M-C1) ──────────────────────────────
     Na het betalen was het stil tot de levering. Eén zin over wat er gebeurt en
     wanneer — dezelfde tijdszin als op de site, nooit een belofte. Niet bij een
     abonnementstermijn of een proef (daar geldt dit niet). */
  const wanneer = order.window_start
    ? t.window(dateLine(order.window_start, lang), order.window_end ? dateLine(order.window_end, lang) : '')
    : t.asap;
  const offerte = order.service === 'video' || order.service === 'custom';
  const watNu = order.ref && !order.noNext ? p(`<b>${esc(t.nextH)}.</b> ${esc(order.service === 'brand-model' ? t.nextModel : offerte ? t.nextOfferte : t.next(wanneer))}`, { top: 4 }) : '';
  const body = [
    h1(t.head, esc(invoice.number)),
    /* De aanhef, zoals in elke andere klantmail (ronde 9, O21). Alleen met een
       naam: deze mail gaat ook uit voor een abonnementstermijn. */
    order.name ? p(greeting(order.name, lang)) : '',
    p(esc(t.lede)),
    watNu,
    rows([
      [t.rInvoice, esc(invoice.number)],
      [t.rDate, esc(dateLine(snap.date, lang))],
      [t.rRef, esc(order.ref || '')],
      [t.rAmount, esc(euro(gross, lang))],
    ]),
    p(attached ? t.attached : t.noAttach, { top: 4 }),
    linkLine(`${SITE}${lang === 'nl' ? '/nl' : ''}/account`, t.portal),
    vatLine ? note(esc(vatLine)) : '',
    // GEEN spamNote() HIER. Die regel — "nog niets? kijk in je spam" — hoort in
    // een mail waarop de klant wácht: de inloglink, de levermelding. Dit bericht
    // komt ongevraagd binnen op het moment van betalen, en iemand vertellen dat
    // hij in zijn spam moet kijken naar de mail die hij aan het lezen is, is
    // precies het soort meegekopieerde alinea dat een transactionele mail
    // rommelig maakt.
    note(esc(t.keep)),
  ].join('');

  return {
    subject: t.subject(order.ref || invoice.number),
    html: shell({ lang, preheader: t.pre(invoice.number), body }),
  };
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
export async function mailInvoice(env, { order, invoice }) {
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

    const { subject, html } = invoiceEmail({ lang, order, invoice, snap, attached: !!attachment });
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
    ledeFirst: (plan, credits, dag) => `Bedankt. Je eerste maand is betaald en ${abo(plan)} loopt: ${credits} credits per maand, die je in VISUAILS Studio besteedt aan catalog, lifestyle en video. Je vaste week begint elke maand rond dag ${dag}.`,
    /* Vooruitbetaald (24 september 2026): de mail zei "je eerste maand is betaald"
       boven een afschrijving van een heel jaar. */
    ledeFirstPrepaid: (plan, credits, dag) => `Bedankt. Je jaar is vooruitbetaald en ${abo(plan)} loopt: twaalf maanden lang ${credits} credits per maand, die je in VISUAILS Studio besteedt aan catalog, lifestyle en video. Er wordt dit jaar niets meer afgeschreven. Je vaste week begint elke maand rond dag ${dag}.`,
    ledeNext: (maand, credits) => `De termijn voor ${maand} is binnen. Je ${credits} credits voor deze maand staan klaar in VISUAILS Studio; wat je vorige maand niet gebruikte, is doorgeschoven.`,
    rPlan: 'Abonnement',
    rCredits: 'Credits per maand',
    rInvoice: 'Factuurnummer',
    rDate: 'Factuurdatum',
    rAmount: 'Afgeschreven',
    attached: 'De factuur zit als pdf bij deze mail. Je vindt hem ook terug in VISUAILS Studio, onder <b>Abonnement &amp; facturering</b>.',
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
      ['Plan je producten', `Zet je producten met foto's op je lijst en klik onder <b>Planning</b> op een dag. We maken ze in je vaste week, rond dag ${dag} van elke maand.`],
    ],
    rollover: (n) => `Credits die je in een maand niet gebruikt, schuiven ${n === 1 ? 'één maand' : `${n} maanden`} door.`,
    loginBtn: 'Direct naar VISUAILS Studio',
    loginNote: 'Deze knop logt je meteen in en werkt twee dagen. Later log je in via visuails.com/account met je e-mailadres.',
    invoiceH: 'Je eerste factuur',
  },
  en: {
    subjectNext: (ref, maand) => `Your credits for ${maand} are ready — ${ref}`,
    headNext: 'This month is paid',
    ledeFirst: (plan, credits, dag) => `Thank you. Your first month is paid and ${planEn(plan)} is running: ${credits} credits a month, which you spend in VISUAILS Studio on catalog, lifestyle and video. Your fixed week starts around day ${dag} of each month.`,
    ledeFirstPrepaid: (plan, credits, dag) => `Thank you. Your year is paid in advance and ${planEn(plan)} is running: twelve months of ${credits} credits a month, which you spend in VISUAILS Studio on catalog, lifestyle and video. Nothing else is charged this year. Your fixed week starts around day ${dag} of each month.`,
    ledeNext: (maand, credits) => `The payment for ${maand} came through. Your ${credits} credits for this month are ready in VISUAILS Studio; whatever you did not use last month has rolled over.`,
    rPlan: 'Plan',
    rCredits: 'Credits per month',
    rInvoice: 'Invoice number',
    rDate: 'Invoice date',
    rAmount: 'Charged',
    attached: 'The invoice is attached as a PDF. You can also find it in VISUAILS Studio, under <b>Plan &amp; billing</b>.',
    noAttach: 'Your invoice is waiting in VISUAILS Studio, under <b>Plan &amp; billing</b>.',
    portal: 'Go to your plan in VISUAILS Studio',
    stop: 'Pausing or cancelling is something you do yourself in Studio, under Plan — no email, no waiting.',
    subjectWelcome: (ref) => `Welcome to VISUAILS — your plan is running (${ref})`,
    headWelcome: 'Welcome — your plan is running',
    stepsH: 'How to start',
    steps: (dag) => [
      ['Sign in to VISUAILS Studio', 'The button below takes you straight in. After that you sign in with your email address: you get a code by email, there is no password.'],
      ['Set your look', 'Under <b>Your look</b> you choose your style, background and model once per service. That look goes with everything you order, so every month fits together.'],
      ['Plan your products', `Put your products with photos on your list and click a day under <b>Planning</b>. We make them in your fixed week, around day ${dag} of each month.`],
    ],
    rollover: (n) => `Credits you do not use in a month roll over for ${n === 1 ? 'one month' : `${n} months`}.`,
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
      p(esc(t.rollover(rolloverMonths(sub.term || 'monthly'))), { muted: true }),
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
