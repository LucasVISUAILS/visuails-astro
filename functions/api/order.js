// VISUAILS — order / signup / contact intake (Cloudflare Pages Function).
//
// One POST endpoint for every form on the site. The form's hidden `service`
// field selects the flow:
//   • subscribe               → lead-magnet email capture (briefing checklist)
//   • contact                 → contact-form message
//   • catalog|lifestyle|video|custom|test-sample → an order
//
// Design notes:
//   • Defensive by construction: a missing binding or a failing email must
//     never show the customer a broken page. Every side-effect is wrapped in
//     try/catch and we ALWAYS redirect to the (localized) thank-you page.
//   • No personal data in the redirect URL — only a generated order ref.
//   • The customer row is upserted by email on every order, so the account /
//     profile-prefill phase has data to work with from day one.
//
// Bindings (see wrangler.toml): env.DB (D1), env.UPLOADS (R2),
// env.RESEND_API_KEY (secret), env.NOTIFY_EMAIL, env.FROM_EMAIL.
//
// The confirmation email reads its timing from the tier model in
// src/data/pricing.js rather than typing it. It used to promise "within about
// 24 hours" — the exact claim the repositioning retired — and it survived every
// sweep because every sweep was scoped to src/. An email is the one surface a
// customer keeps, so it is the last place a stale promise should be allowed to
// live, and the only way to guarantee that is to stop it having its own copy.
//
// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 · THIS ENDPOINT IS NOW THE BOOKING PATH
//
// /start's pipeline posts here with { tier, products, window_start, window_end,
// upload_batch }. Three things follow from that, and they are the reason this
// file grew:
//
//  1. THE GATE RUNS AGAIN, HERE, SERVER-SIDE. /api/capacity is a cacheable
//     public read and cannot reserve anything — its own header says so: "Nothing
//     here is a reservation. The reservation is orders.window_start." Two people
//     can be looking at the same last window at the same instant, and the client
//     could have had that page open for an hour. So the window arriving in this
//     request is a REQUEST for a date, never a grant of one, and it is checked
//     against live rows before it is written.
//
//  2. A WINDOW IS WRITTEN ONLY IF clearedWindows() STILL RETURNS IT. Not "if it
//     looks close", not "if it used to fit". The brief's one absolute rule about
//     time is "never promise a delivery date the capacity gate hasn't cleared",
//     and the only way to make that a property of the database rather than of
//     our own discipline is for this to be the single place window_start is ever
//     assigned, from the single function allowed to produce a date.
//
//  3. FAILING CLOSED ON DATES IS NOT THE SAME AS FAILING THE ORDER. If D1 is
//     unreachable the window is not written — but the order still is, and the
//     confirmation says we will come back with the dates. Losing a client's
//     order to protect a calendar would be the wrong thing to protect.
// ─────────────────────────────────────────────────────────────────────────────

import { aftercare, turnaround, tierRow, shouldPromptUpgrade, upgradePrompt } from '../../src/data/pricing.js';
import {
  ATTENDED_PER_WINDOW,
  HORIZON_DAYS,
  addDays,
  bookedFromRows,
  clearedWindows,
} from '../../src/data/capacity.js';
import {
  ORDER_QUESTIONS, isProductQuestionId, productQuestion,
} from '../../src/data/attributes.js';
import { isWellFormedBatch, listBatch } from '../../src/lib/uploads.js';
import { normalizeEmail, normalizePhone } from '../../src/lib/payer.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from '../../src/lib/ratelimit.js';
import { mintToken, hashToken, portalUrl } from '../../src/lib/token.js';
import { sendMail, toBase64 } from '../../src/lib/mail.js';
import { serviceLabel } from '../../src/data/services.js';
import { shell, h1, p, rows, payPanel, note, spamNote, linkLine } from '../../src/lib/mailTemplate.js';
import { createTestSampleMolliePayment, createOrderMolliePayment } from '../../src/lib/mollie.js';
import {
  quoteOrder, quoteTestSample, centsToMollieValue, paymentDescription,
  PAYABLE_SERVICES, isPayableService, ladderKey,
} from '../../src/lib/quote.js';
import { businessCheck } from '../../src/data/business.js';
import {
  vatDecision, VAT_TREATMENT, normaliseVat, viesCode, vatShort, HOME_COUNTRY,
  vatGate, REVIEW, REVIEW_HOURS,
} from '../../src/data/vat.js';
import { checkVat, viesEvidence } from '../../src/lib/vies.js';
import { composeName, composeAddress } from '../../src/data/address.js';

const ORDER_SERVICES = new Set(['catalog', 'lifestyle', 'video', 'custom', 'test-sample', 'drop']);

// ─────────────────────────────────────────────────────────────────────────────
// HOW MUCH OF THE CLIENT'S UPLOAD RIDES ALONG IN THE STUDIO'S EMAIL
//
// The count was not enough. "3 uploaded files" told the studio that something
// arrived and nothing about what, so the only way to SEE a client's reference
// photographs was the R2 dashboard with a batch prefix typed in by hand. The
// photographs now travel with the notice.
//
// Not all of them, and that is deliberate. A batch may legally hold 80 files of
// 25 MB — two gigabytes — and Resend refuses a message over 40 MB outright, so
// an unbounded attach would turn a large order into NO notification at all.
// That is strictly worse than the count it replaces. So: a hard budget, the
// files that fit are attached, and EVERY file is listed by name, size and key
// whether it was attached or not. The email is never the only copy; R2 is.
//
// Base64 inflates by 4/3, so 8 MB of photographs is ~11 MB on the wire — well
// inside Resend's limit with room for a second thought later.
// ─────────────────────────────────────────────────────────────────────────────
const MAIL_ATTACH_MAX_BYTES = 8 * 1024 * 1024;
const MAIL_ATTACH_MAX_FILES = 10;

// Fields we lift into their own columns; everything else goes to details_json.
//
// `source` was always read into a column and was ALSO landing in details_json,
// which is the same duplication the section-10 fields would have caused. It is
// listed here now for the same reason they are.
const TOP_FIELDS = [
  'service', 'redirect', 'lang', 'name', 'brand', 'company', 'email', 'phone', 'vat', 'website',
  'company_hp', 'source',
  // ── section 15 · who the customer is, for VAT ──
  // `country` decides the VAT treatment and `address` is a formal invoice
  // requirement; both belong in their own column rather than buried in
  // details_json, where nothing could query them.
  'country', 'address',
  // Sinds migratie 0016 losse velden — zie src/data/address.js voor waarom
  // `name` en `billing_address` daarnaast blijven bestaan als samengestelde
  // weergave. 'address' staat hierboven nog in de lijst zodat een oud
  // formulier in een tab die al openstond niet ineens zijn adres in
  // details_json ziet belanden.
  'first_name', 'last_name', 'no_vat',
  'address_line1', 'address_line2', 'postal_code', 'city', 'region',
  // Het vinkje "bewaar deze gegevens" van een bezoeker die niet is ingelogd.
  // Een kolom en niet details_json, want er wordt op gestuurd bij het inloggen.
  'save_details',
  // ── section 10 · the pipeline's own fields ──
  'tier', 'products', 'window_start', 'window_end', 'upload_batch', 'mode',
];

export async function onRequestPost({ request, env, waitUntil }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect('/thank-you');
  }

  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * EEN RATELIMIET, EINDELIJK — 10 augustus 2026
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * functions/api/upload.js doet dit al sinds dag één; deze route niet, en dit is de
   * duurdere van de twee. Elke POST hier maakt een bestelling, twee Resend-mails en soms
   * een Mollie-betaling. Eén script maakt dus duizenden bestellingen, vervuilt de
   * capaciteitstelling waarop de agenda draait, en verbrandt het Resend-quotum — en dan
   * kan een echte klant geen bevestiging meer krijgen.
   *
   * De honeypot (`company_hp`, een paar regels lager) houdt alleen naïeve bots tegen: die
   * vult een script dat het formulier één keer heeft bekeken gewoon niet in. Met
   * advertentieverkeer komt er ook botverkeer; dat is geen aanname maar hoe het internet
   * werkt.
   *
   * ── DE GETALLEN ────────────────────────────────────────────────────────────
   *
   * 10 per 10 minuten per IP. Een mens die twijfelt tussen twee diensten en het formulier
   * twee of drie keer verstuurt, merkt hier niets van; een script dat er honderd wil
   * plaatsen, komt na tien tot stilstand. Ruimer dan de upload-limiet (40 per minuut) mag
   * niet: uploaden doe je per bestand en bestellen doe je per bestelling.
   *
   * VÓÓR ALLES, ook vóór de honeypot en vóór het lezen van het formulier — nee: ná het
   * formulier, want `clientIp()` heeft het verzoek nodig en niet de velden, en een 429
   * hoort niet af te hangen van of het formulier leesbaar was. De plek hier is de eerste
   * regel na het parsen en vóór élke schrijfactie.
   *
   * De sweep ruimt oude vensters op, dezelfde afspraak als in upload.js: één op de zoveel
   * verzoeken, in waitUntil, zodat de tabel niet oneindig groeit en niemand erop wacht.
   */
  const rate = await checkRate(env, { ip: clientIp(request), action: 'order', limit: 10, windowSeconds: 600 });
  if (shouldSweep() && typeof waitUntil === 'function') waitUntil(sweepRateLimits(env));
  if (!rate.allowed) {
    const retry = String(Math.max(1, rate.retryAfter || 60));
    if (form.get('mode') === 'json') {
      return json({ ok: false, error: 'rate', retryAfter: rate.retryAfter }, 429, { 'retry-after': retry });
    }
    return new Response(null, { status: 429, headers: { 'retry-after': retry } });
  }

  // A multipart field is either a string or a File, and toString() on a File
  // gives the literal "[object File]" — a value that would then be stored,
  // emailed and compared as if the client had typed it. The details loop below
  // guards the same way. Behaviour is unchanged for a string or a missing key.
  const get = (k) => { const v = form.get(k); return typeof v === 'string' ? v.trim() : ''; };

  const service = get('service') || 'catalog';
  const lang = get('lang') === 'nl' ? 'nl' : 'en';
  const back = safeRedirect(get('redirect'), lang);

  // The pipeline posts with fetch and wants an answer it can act on — "that
  // window has gone, here are the ones that are left" is useless as a 303 to a
  // thank-you page. Every other form on the site posts without JS and keeps the
  // redirect. One endpoint, two response shapes, chosen by the caller.
  const wantsJson = get('mode') === 'json';

  // Honeypot: a hidden field real users never see. Bots fill it. Pretend success.
  if (get('company_hp')) return wantsJson ? json({ ok: true, redirect: back }) : redirect(back);

  // ── LOWERCASED, BECAUSE THIS ADDRESS IS AN IDENTITY AND NOT JUST A FIELD ───
  //
  // customers.email is UNIQUE and it is the ONLY credential /account
  // authenticates against — src/lib/account.js looks a customer up by it and
  // mails them a link. That lookup lowercases what the visitor typed into the
  // sign-in box; this did not, so the address went into the database exactly as
  // typed. SQLite compares TEXT byte for byte and the column has no NOCASE
  // collation, so a brand that ordered as `Ana@Shop.com` could never sign in:
  // the lookup missed, sendLoginLink returned early, and the page still said
  // "check your email" — by design, to stop the form being used to test which
  // addresses have accounts. No mail, no error, nothing to diagnose.
  //
  // The same mismatch also split one brand across two rows: order once with a
  // capital and once without and UNIQUE(email) sees two different customers,
  // so half the order history disappears from the account.
  //
  // Lowercasing HERE rather than only at the lookup is what makes it one fact
  // instead of two conventions that have to agree forever. Addresses are
  // case-insensitive in every mail system anyone actually uses; the local part
  // is formally allowed to be case-sensitive, and no provider on earth treats
  // it that way. migrations/0008 normalises the rows written before today.
  const email = get('email').toLowerCase();
  if (!isEmail(email)) {
    if (wantsJson) return json({ ok: false, error: 'email' }, 400);
    // JS validation normally blocks this; for JS-off users, bounce back to the
    // form they came from (same-origin Referer), not the thank-you page.
    let dest = back;
    try {
      const ref = request.headers.get('Referer');
      if (ref) {
        const u = new URL(ref);
        if (u.origin === new URL(request.url).origin) dest = u.pathname + u.search;
      }
    } catch {}
    return redirect(dest + (dest.includes('?') ? '&' : '?') + 'error=email');
  }
  // `name` is de samengestelde weergave: uit de twee losse velden als het
  // formulier ze stuurt, en anders het oude enkele veld. Zie de noot bij
  // composeAddress hieronder.
  const name = composeName(get('first_name'), get('last_name')) || get('name');
  const brand = get('brand') || get('company');
  const phone = get('phone');
  const vat = get('vat');
  const website = get('website');
  // Uppercased and length-capped rather than trusted: this string picks the VAT
  // rate, so a value the form did not offer must not silently become a country.
  // vatDecision() treats anything it does not recognise as outside the EU, and
  // an empty string as domestic — both fail towards charging, not towards zero.
  const country = get('country').toUpperCase().slice(0, 2);

  /*
   * ── DE NAAM EN HET ADRES, UIT LOSSE VELDEN ─────────────────────────────────
   *
   * Sinds migratie 0016 vraagt het formulier apart naar voornaam, achternaam en
   * de vier adresregels. `name` en `billing_address` blijven bestaan en blijven
   * gevuld worden — als de SAMENGESTELDE weergave, die de bevestigingsmail en
   * het adminscherm als één blok lezen. Het samenstellen gebeurt op één plek,
   * in src/data/address.js, zodat "postcode vóór plaats" niet in drie bestanden
   * apart bedacht wordt.
   *
   * EEN OUD FORMULIER BLIJFT WERKEN. Een tab die vóór vandaag geopend is post
   * nog `name` en `address` als één veld; die vallen hieronder terug in de
   * samengestelde kolommen, met de losse velden leeg. Beter een bestelling met
   * een adres op één regel dan een bestelling die weigert.
   */
  const firstName = get('first_name');
  const lastName = get('last_name');
  const addressParts = {
    line1: get('address_line1'),
    line2: get('address_line2'),
    postal: get('postal_code'),
    city: get('city'),
    region: get('region'),
  };
  const address = (composeAddress(addressParts) || get('address')).slice(0, 500);

  // Het vinkje "ik heb geen btw-nummer". Het zegt alleen iets over het
  // formulier: vatDecision() kijkt naar het land en naar een bij VIES BEVESTIGD
  // nummer, en een vinkje kan daar geen 0% kopen.
  const noVat = !vat && ['1', 'on', 'true', 'yes'].includes(get('no_vat').toLowerCase());

  /*
   * "BEWAAR DEZE GEGEVENS" VAN IEMAND ZONDER SESSIE.
   *
   * Een ingelogde klant loopt langs /account/details (zie saveDetailsIfAsked in
   * pipeline.js) en is daarmee klaar. Wie niet is ingelogd kan dat niet, dus
   * reist zijn keuze mee met de bestelling — en wordt hier alleen VASTGELEGD,
   * niet uitgevoerd. Het effect valt bij de eerste keer inloggen, want dit
   * eindpunt is niet geauthenticeerd en het adres in het formulier is niet
   * bewezen van hem. Zie migrations/0017 en promoteSaveRequest() in
   * src/lib/account.js.
   */
  const saveRequested = ['1', 'on', 'true', 'yes'].includes(get('save_details').toLowerCase());

  // Everything not lifted to a column becomes the order detail record.
  const details = {};
  for (const [k, v] of form.entries()) {
    if (TOP_FIELDS.includes(k)) continue;
    // A FILE IS NOT AN ANSWER. Every order form carries <input type="file">, and
    // a browser submits an entry for it whether or not anything was picked. The
    // old line here was `(v || '').toString()`, which on a File yields the
    // literal string "[object File]" — so every order ever placed stored
    // photos:"[object File]" in details_json and printed it in the studio's
    // notification email. Files are handled by /api/upload and land in the files
    // table further down; they have no business in this record at all.
    if (typeof v !== 'string') continue;
    const cleaned = vetAnswer(k, v);
    if (cleaned) details[k] = cleaned;
  }

  // ---- subscribe (lead magnet) --------------------------------------------
  if (service === 'subscribe') {
    await safe(() => env.DB && env.DB
      .prepare('INSERT INTO subscribers (email, source) VALUES (?1, ?2) ON CONFLICT(email) DO NOTHING')
      .bind(email, get('subscribe') || 'lead-magnet').run());
    await safe(() => sendMail(env, {
      to: email,
      subject: lang === 'nl' ? 'Zo maak je de productfoto’s die wij nodig hebben' : 'How to shoot the product photos we need',
      html: subscriberEmail(lang),
    }));
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Checklist signup — ${email}`,
      html: `<p>New checklist signup:</p><p><strong>${esc(email)}</strong></p>`,
    }));
    const okUrl = back + (back.includes('?') ? '&' : '?') + 'ok=1';
    return wantsJson ? json({ ok: true, redirect: okUrl }) : redirect(okUrl);
  }

  // ---- contact -------------------------------------------------------------
  if (service === 'contact') {
    const body = details.message || details.notes || '';
    let customerId = null;
    await safe(async () => { customerId = await upsertCustomer(env, { email, name, brand, phone, website, vat, country, address, firstName, lastName, noVat, saveRequested, ...addressParts }); });
    await safe(() => env.DB && env.DB
      .prepare('INSERT INTO messages (customer_id, email, name, subject, body) VALUES (?1,?2,?3,?4,?5)')
      .bind(customerId, email, name || null, get('subject') || 'Contact form', body || null).run());
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `Contact — ${name || email}`,
      html: `<p>Contact message from <strong>${esc(name || email)}</strong> (${esc(email)}):</p><p>${esc(body).replace(/\n/g, '<br>')}</p>`,
    }));
    const okUrl = back + (back.includes('?') ? '&' : '?') + 'ok=1';
    return wantsJson ? json({ ok: true, redirect: okUrl }) : redirect(okUrl);
  }

  // ---- order ---------------------------------------------------------------
  const svc = ORDER_SERVICES.has(service) ? service : 'catalog';
  const ref = makeRef();

  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * ÉÉN PROEFVISUAL PER BEDRIJF — 11 AUGUSTUS 2026
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Dit stond als belofte in de algemene voorwaarden (§ "Test sample"), op
   * /pricing, op de homepage en in TEST_SAMPLE.unit ("one per business"), en werd
   * door niets afgedwongen. Doorzocht op `sample_used`, `test_sample_at` en elke
   * telling per klant: nul treffers. Eén merk kon zijn hele collectie voor € 1 per
   * product laten maken. Het enige punt uit de doorlichting van 10 augustus dat
   * direct geld kost.
   *
   * ── WAAROM E-MAIL, EN NIET IETS BETERS ────────────────────────────────────
   *
   * Het proefvisualformulier vraagt om naam, e-mail, telefoon en merknaam. Géén
   * btw-nummer, géén KVK. Wat overblijft om een "bedrijf" mee te herkennen:
   *
   *   e-mail   exact, en al genormaliseerd naar kleine letters (regel 178).
   *            Eenduidig, en voor de klant te begrijpen als hij geweigerd wordt.
   *   merknaam vrije tekst. "Merk", "merk b.v." en "MERK BV" zijn drie waarden.
   *   domein   ONBRUIKBAAR als hard criterium: bij gmail.com of hotmail.com zou
   *            de eerste aanvrager iedereen daarna buitensluiten. Dat is geen
   *            randgeval maar de meerderheid van een eerste aanvraag.
   *
   * Dus e-mail. Dat houdt niet tegen dat iemand een tweede adres pakt, en dat
   * hoeft ook niet: de € 1 is er "to prevent abuse", niet als slot. Wat dit wél
   * tegenhoudt is het geval uit de doorlichting — twintig producten achter elkaar
   * op één adres — en dat is precies het geval dat geld kost.
   *
   * Merknaam is bewust GEEN tweede blokkade. De twee fouten zijn niet gelijk: een
   * misgelopen proef kost een paar euro studiotijd, een ten onrechte geweigerde
   * klant kost de klant zelf — en dat op het eerste scherm dat hij ooit ziet, bij
   * een studio die er nul heeft. Bij twijfel dus doorlaten.
   *
   * ── ALLEEN BETAALD TELT ───────────────────────────────────────────────────
   *
   * `payment_status = 'paid'`, en niet "er bestaat een rij". Wie het formulier
   * invult en bij Mollie de tab sluit heeft niets gekregen; die zijn proef
   * afpakken zou een fout zijn die vaker voorkomt dan het misbruik dat we hier
   * afvangen. Betaald is ook het moment waarop de belofte is nagekomen: hij heeft
   * zijn proefvisual gehad.
   *
   * ── EN HET FAALT OPEN ─────────────────────────────────────────────────────
   *
   * Kan de database niet gelezen worden, dan gaat de bestelling gewoon door. Dat
   * is dezelfde kant op als de rest van dit bestand ("Failing OPEN, not closed",
   * de noot bij de Mollie-tak): een klant kwijtraken om een controle te redden is
   * de fout die dit bestand overal weigert te maken. De prijs van openvallen is
   * één proefvisual; de prijs van dichtvallen is een klant die op het eerste
   * scherm een foutmelding krijgt die nergens op slaat.
   */
  /*
   * ── UITGEBREID OP 11 AUGUSTUS 2026, LATER OP DEZELFDE DAG ──────────────────
   *
   * Dit vergeleek `lower(email)` en verder niets. Bij het nalopen bleek dat een
   * gat van vijf seconden: `lucas+2@merk.nl` komt aan in dezelfde inbox als
   * `lucas@merk.nl`, en telde hier als een ander bedrijf. Geen truc van
   * fraudeurs — plus-adressering is een standaardfunctie die mensen dagelijks
   * gebruiken — maar wel precies de bodem eronder.
   *
   * Er zijn nu twee herkenningspunten, en het adres wordt genormaliseerd voordat
   * het vergeleken wordt (normalizeEmail/normalizePhone in src/lib/payer.js, met
   * de afwegingen erbij). Het telefoonnummer komt erbij omdat mensen hun nummer
   * veel trouwer hergebruiken dan hun adres: een tweede mailadres is gratis, een
   * tweede telefoonnummer niet.
   *
   * ── WAAROM DE VERGELIJKING IN JS GEBEURT EN NIET IN SQL ────────────────────
   *
   * Omdat `lower(email) = ?` de normalisatie niet kan uitvoeren, en de regel in
   * SQLite nabouwen betekent dat dezelfde afweging op twee plekken moet blijven
   * kloppen — precies het soort dubbele conventie dat de noot bij `email` hierboven
   * afraadt. Dus komen de rijen hierheen en beslist één functie.
   *
   * Dat kan omdat deze verzameling klein is BY DESIGN: één betaalde proefvisual
   * per bedrijf, voor altijd. Bij duizend klanten zijn het duizend rijen met twee
   * korte kolommen, en de vraag draait alleen als er een proef besteld wordt. Zou
   * dat ooit veranderen, dan is dit de plek waar het opvalt — vandaar de LIMIT, die
   * er niet is om iets af te kappen maar om er niet stilletjes overheen te groeien.
   *
   * ── EN DIT IS DE ZACHTE LAAG ───────────────────────────────────────────────
   *
   * Alles hier vult de bezoeker zelf in, dus wie het echt wil omzeilen, omzeilt het.
   * Dat hoort ook: deze laag bestaat om de eerlijke herhaling een nette melding te
   * geven VOORDAT er geld is overgemaakt. De harde controle staat in de webhook en
   * kijkt naar de bankrekening, die niet van dit formulier komt.
   */
  if (svc === 'test-sample') {
    let used = 0;
    let checked = false;
    await safe(async () => {
      if (!env.DB) return;
      const wantMail = normalizeEmail(email);
      const wantPhone = normalizePhone(phone);

      const { results } = await env.DB
        .prepare(`SELECT email, phone FROM orders
                   WHERE service = 'test-sample'
                     AND payment_status = 'paid'
                   LIMIT 20000`)
        .all();

      used = (results || []).filter((r) => {
        if (wantMail && normalizeEmail(r.email) === wantMail) return true;
        // Alleen als BEIDE nummers bruikbaar zijn. normalizePhone() geeft leeg
        // terug bij minder dan acht cijfers, en twee lege waarden zijn gelijk —
        // zonder deze regel matcht een bestelling zonder nummer op elke andere
        // bestelling zonder nummer, en wordt iedereen geweigerd.
        const theirs = normalizePhone(r.phone);
        return !!wantPhone && theirs === wantPhone;
      }).length;

      checked = true;
    });

    if (checked && used > 0) {
      console.log('[order] tweede proefvisual geweigerd voor', email, `(${used} betaald)`);
      if (wantsJson) return json({ ok: false, error: 'sample-used' }, 409);
      /* Terug naar het formulier waar hij vandaan kwam, niet naar de
         bedankpagina — dezelfde Referer-route als de e-mailcontrole hierboven,
         en om dezelfde reden: `back` wijst naar "gelukt" en dat is dit niet. */
      let dest = back;
      try {
        const from = request.headers.get('Referer');
        if (from) {
          const u = new URL(from);
          if (u.origin === new URL(request.url).origin) dest = u.pathname + u.search;
        }
      } catch {}
      return redirect(dest + (dest.includes('?') ? '&' : '?') + 'error=sample-used');
    }
  }

  const products = countOf(get('products'));

  // DERIVED, NOT POSTED. This used to read `get('tier') === 'attended'`, which
  // let the browser tell the server which service level the order gets. Under
  // the ladder that is no longer a choice a customer makes — it follows from
  // the product count (tierFor() in src/data/pricing.js, WINDOW_THRESHOLD) —
  // so a posted `tier` is at best redundant and at worst a crafted
  // `products=30&tier=unattended`, which would book a full order into the
  // queue that reserves nothing AND miscount it in the upgrade-prompt query
  // further down, which selects on tier.
  //
  // The form still posts `tier`; it is ignored here on purpose rather than
  // removed there, because a hidden field that vanishes from the markup is a
  // change a future editor can make by accident, and one that is read and
  // discarded is a change they have to make deliberately.
  //
  // Falls to 'unattended' whenever the count is unknown — the tier that
  // reserves nothing is the direction a mistake should fall.
  const tier = tierForProducts(products, svc);

  // Staged reference material, if the client uploaded any. Read before the
  // insert so the count can go into details_json with everything else; the rows
  // themselves cannot exist until the order does (files.order_id is NOT NULL).
  const batch = get('upload_batch');
  const staged = isWellFormedBatch(batch) ? await listBatch(env, batch) : [];
  if (staged.length) {
    details.uploads = String(staged.length);
    details.upload_batch = batch;
  }

  // THE GATE, AGAIN, AGAINST LIVE ROWS. See note 1 at the top of this file.
  const asked = { start: get('window_start'), end: get('window_end') };
  const gate = await clearRequestedWindow(env, { tier, products, asked });

  // The window the client chose filled while they were filling in the form. In
  // the pipeline this is recoverable and worth recovering: their answers are
  // still on screen, so hand back the windows that ARE clear and let them pick
  // again rather than booking them onto nothing and emailing an apology. No
  // order row is written, so a second submit is a first order.
  //
  // Without JS there is nowhere to hand it back TO, so that path falls through
  // and creates the order undated — the confirmation then says we will come
  // back with the dates, which is true and is the same thing a human would say.
  if (wantsJson && gate.reason === 'gone') {
    return json({ ok: false, error: 'window-gone', windows: gate.windows, reason: gate.listReason }, 409);
  }

  let customerId = null;
  await safe(async () => { customerId = await upsertCustomer(env, { email, name, brand, phone, website, vat, country, address, firstName, lastName, noVat, saveRequested, ...addressParts }); });

  // `lang` is stored, not just used. This request is the last moment the client's
  // language is known for free — every later message (the portal, the delivery
  // mail, an aftercare check-in) arrives with no form attached and would have to
  // guess.
  //
  // window_start being non-null IS the reservation, and gate.window is the only
  // value that ever reaches it. Nothing else in this function may assign it.
  // ── THE PRICE, WORKED OUT HERE AND NOWHERE ELSE ────────────────────────────
  // August 2026: catalog and lifestyle became payable, and `orders.total_cents`
  // finally has a writer. Everything about the amount is recomputed from the
  // ladder against the order's own fields — the service, the product count, and
  // the two paid add-ons counted out of the posted form. NOTHING here reads an
  // amount the browser sent, because pipeline.js's running total is a preview
  // and a preview a customer can edit is not a price. See src/lib/quote.js.
  //
  // The add-on counts are read off the SAME fields the uploader posts, so a
  // customer who asked for two extra photos on product 3 is charged for two
  // extra photos. Counting them here rather than trusting a summary field means
  // there is no total to tamper with, only per-product answers to add up.
  const outfitCount = countOf(get('outfit_count'));
  let extraCount = 0;
  for (const [k, v] of form.entries()) {
    if (typeof k === 'string' && k.startsWith('extra_') && !k.startsWith('extra_note_')) {
      extraCount += Math.max(0, Math.floor(Number(v) || 0));
    }
  }

  // ── WHICH VAT, AND THE PROOF THAT IT IS THE RIGHT ONE ──────────────────────
  // Three outcomes and one rule: nothing goes to 0% without evidence. The whole
  // decision lives in vatDecision() (src/data/vat.js) so the checkout, the
  // invoice and the tests cannot each have their own version of it.
  //
  //   Dutch customer      → 21%, no VIES call at all. The domestic reverse
  //                         charge is a closed list and this trade is not on
  //                         it, so a Dutch VAT number changes nothing. This is
  //                         the branch that would quietly cost 21% of every
  //                         domestic B2B order if it were written the obvious
  //                         way.
  //   EU, number given    → ask VIES. Valid means 0% and "btw verlegd"; invalid
  //                         means 21%; UNREACHABLE ALSO MEANS 21%. Romania was
  //                         down the morning this was written, and treating an
  //                         outage as a pass is the single most expensive bug
  //                         available here.
  //   Outside the EU      → 0%, but not reverse charge — the supply is simply
  //                         not taxable in the Netherlands, which is a
  //                         different sentence on the invoice and no ICP line.
  //
  // The check runs INLINE and not in waitUntil, because its answer changes the
  // amount Mollie is asked for. Four seconds is the ceiling (see vies.js); past
  // that the order is priced at 21% rather than left hanging.
  // FALL BACK TO THE SAVED CUSTOMER RECORD when the form posted no country.
  // Two ways that happens and both are real: a hand-built POST, and the saved-
  // details collapse on /start, which hides step 3 for a returning customer —
  // a hidden <select> posts an empty string. pipeline.js prefills it now so it
  // should not be empty, but "should not" is not a guarantee, and the cost of
  // getting this wrong is charging a German business 21% it does not owe.
  //
  // Only ever fills a blank. A country the customer chose on this order always
  // wins over the one on file, because a brand that moved should not be priced
  // from last year's address.
  let effCountry = country;
  let effAddress = address;
  if ((!effCountry || !effAddress) && customerId) {
    await safe(async () => {
      // De losse velden komen mee sinds migratie 0016. Zonder dat zou een
      // bestelling die op het opgeslagen adres terugvalt wél billing_address
      // krijgen en de losse kolommen leeg laten — een factuur die de regels dan
      // niet onder elkaar kan zetten, precies waar 0016 voor is.
      const saved = await env.DB?.prepare(
        `SELECT country, billing_address, address_line1, address_line2, postal_code, city, region
           FROM customers WHERE id = ?1`
      ).bind(customerId).first();
      if (saved) {
        if (!effCountry && saved.country) effCountry = String(saved.country).toUpperCase().slice(0, 2);
        if (!effAddress && saved.billing_address) effAddress = String(saved.billing_address).slice(0, 500);
        if (!addressParts.line1) {
          addressParts.line1 = saved.address_line1 || '';
          addressParts.line2 = saved.address_line2 || '';
          addressParts.postal = saved.postal_code || '';
          addressParts.city = saved.city || '';
          addressParts.region = saved.region || '';
        }
      }
    });
  }

  // Het vinkje uit §4 van de specificatie: de klant verklaart dat het nummer van
  // zijn bedrijf is en dat het bedrijf buiten Nederland zit. Geen formaliteit —
  // bij een foutieve verlegging ligt de aansprakelijkheid bij de leverancier, en
  // dit is het enige bewijs dat de claim van de klant komt en niet van ons.
  //
  // Het formulier biedt 0% pas aan nádat dit is aangevinkt, dus in de praktijk
  // staat het er altijd als er 0% uit komt. Staat het er niet en komt er toch 0%
  // uit, dan is er langs het formulier heen gepost, en dat is precies wat de
  // poort hieronder tegenhoudt.
  const vatConfirmed = get('vat_confirmed') === 'yes';

  const vatParts = normaliseVat(vat);
  const vatCc = viesCode(effCountry);
  let vies = null;
  if (vatCc && effCountry !== HOME_COUNTRY && vatParts.number) {
    // The requester pair is what earns the consultation number — the only thing
    // that later proves the check happened. Without it the reply's identifier
    // field comes back empty.
    const own = normaliseVat(env.VISUAILS_VAT || 'NL005407575B96');
    vies = await checkVat(vatCc, vatParts.number, { country: own.country || 'NL', number: own.number });
  }
  const vatCall = vatDecision({ country: effCountry, vatValid: !!(vies && vies.valid) });

  // ── DE POORT ───────────────────────────────────────────────────────────────
  //
  // Uit `btwverleggingspecificatie.md`, augustus 2026. Het tarief hierboven is
  // belastingrecht en staat vast. Dit is iets anders: is deze claim geloofwaardig
  // genoeg om er meteen geld op te laten volgen?
  //
  // Let op de drie toestanden van `viesState`. `vies` is null als er niets te
  // controleren was (geen nummer, of een land buiten de EU), `vies.ok` is false
  // als de controle niet lúkte, en pas daarna zegt `vies.valid` iets. Migratie
  // 0015 gooide die drie op één INTEGER NOT NULL DEFAULT 0, waardoor "afgekeurd"
  // en "niet kunnen controleren" hetzelfde getal werden. Ze zijn hier weer los.
  const viesState = !vies ? null : (vies.ok ? vies.valid === true : null);
  const vatReview = vatGate({
    country: effCountry,
    treatment: vatCall.treatment,
    vatValid: viesState,
    vatError: vies && !vies.ok ? (vies.error || 'onbekend') : '',
    confirmed: vatConfirmed,
    hadNumber: !!vatParts.number,
  });

  /*
   * ── UITSLUITEND ZAKELIJK — 12 AUGUSTUS 2026 ────────────────────────────────
   *
   * De regel per land staat in src/data/business.js, met de reden waarom een
   * KVK-veld geen consumenten uitsluit maar buitenlanders. Hier gebeuren twee
   * dingen, en beide zijn met opzet mild:
   *
   *   1  DE UITKOMST WORDT VASTGELEGD, altijd, ook als hij goed is. Bij een
   *      geschil is de vraag niet "wat weet je nu" maar "wat wist je toen", en
   *      dan wil je de verklaring, de versie ervan en het bewijs waar wij op
   *      afgingen bij elkaar hebben staan.
   *
   *   2  ONTBREEKT HET BEWIJS, DAN GAAT DE BESTELLING NAAR DE BEOORDELINGSLIJST
   *      en niet in de prullenbak. Dat is de staande regel van dit bestand:
   *      nooit een bestelling verliezen om een secundaire stap te beschermen. En
   *      het is ook inhoudelijk juist -- "hard in de EU" betekent dat er niet
   *      zonder bewijs geproduceerd en gefactureerd wordt, niet dat een klant die
   *      een veld vergeet zijn hele briefing kwijt is.
   *
   * DE REDENEN WORDEN ALLEEN GEBRUIKT ALS HET NIET IN ORDE IS. businessCheck()
   * geeft ook bij een goede uitkomst soms een toelichting mee (een Nederlandse
   * klant met btw-nummer maar zonder KVK-nummer, bijvoorbeeld) en die hoort niet
   * op de beoordelingslijst te belanden als er niets te beoordelen valt.
   */
  const declared = get('business_declaration') === 'yes';
  const regNumber = get('reg_number').trim().slice(0, 40);
  const bizCheck = businessCheck({
    country: effCountry,
    vat: vatParts.number ? vat : '',
    viesValid: viesState,
    noVat,
    regNumber,
    declared,
  });
  details.business_declaration = declared
    ? (get('business_version') || 'unversioned')
    : 'MISSING';
  details.business_kind = bizCheck.kind;
  details.business_reg = regNumber || null;
  details.business_ok = bizCheck.ok;
  if (!bizCheck.ok && bizCheck.reasons.length) details.business_notes = bizCheck.reasons;

  const bizReasons = bizCheck.ok ? [] : bizCheck.reasons;
  const review = {
    needsReview: vatReview.needsReview || !bizCheck.ok,
    reasons: [...vatReview.reasons, ...bizReasons],
  };

  /*
   * ── DE PROEFVISUAL KRIJGT NU OOK EEN BEDRAG — 12 AUGUSTUS 2026 ─────────────
   *
   * quoteOrder() geeft null voor 'test-sample' (het staat niet in PAYABLE_SERVICES),
   * en dat betekende: `total_cents` NULL en `vat_cents` 0 op een bestelling waar wel
   * EUR 1 voor is afgeschreven. De webhook sloeg de factuur daarom over, want een
   * genummerde factuur die "Betaald EUR 0,00" zegt is erger dan geen factuur.
   *
   * Dat is nu opgelost aan de bron in plaats van bij de factuur. quoteTestSample()
   * rekent de btw uit het brutobedrag van EUR 1 en niet erbovenop -- de fiscale keuze
   * staat daar uitgeschreven. Vanaf hier is een proefvisual een gewone bestelling met
   * een bedrag, en de factuur volgt uit de plumbing die er al was.
   *
   * HET TARIEF KOMT UIT DEZELFDE vatCall. Een Nederlandse proefvisual is EUR 0,83 +
   * EUR 0,17; bij verlegging is het EUR 1,00 + EUR 0,00. Niet apart geregeld, want de
   * btw-behandeling van een klant hangt niet af van hoe groot zijn bestelling is.
   */
  const quote = svc === 'test-sample'
    ? quoteTestSample({ vatRate: vatCall.rate })
    : quoteOrder({
      service: svc, products, outfits: outfitCount, extras: extraCount,
      vatRate: vatCall.rate,
    });

  // ── THE WITHDRAWAL WAIVER, RECORDED ────────────────────────────────────────
  // A customer with no VAT number is a consumer, and a consumer buying at a
  // distance has fourteen days to withdraw while this studio delivers in
  // forty-eight hours. Step 5 asks for the two statements the exception needs
  // (see src/data/consent.js); this is where the answer is written down.
  //
  // Stored as the VERSION ID, not as a boolean: the evidence is not that a box
  // was ticked, it is which sentence was above it. consent.js maps the id back
  // to the wording, and old ids are never edited.
  //
  // A missing tick is RECORDED, not rejected. The checkbox is `required`, so
  // this only happens on a hand-built POST — and refusing the order there would
  // break this file's standing rule about never losing an order to protect a
  // secondary step. Writing 'MISSING' puts it in front of the studio in the
  // notification email instead, which is the outcome that can actually be acted
  // on. It is never written as consent.
  details.withdrawal_consent = get('withdrawal_consent') === 'yes'
    ? (get('consent_version') || 'unversioned')
    : 'MISSING';

  /*
   * ── DE BESTELLING WEGSCHRIJVEN, EN WAAROM DIT TWEE KOLOMMENSETS KENT ───────
   *
   * De losse naam- en adresvelden staan NAAST `name` en `billing_address`, niet
   * in plaats van. De losse zijn wat een factuur regel voor regel nodig heeft;
   * de samengestelde zijn wat elke bestaande lezer al gebruikt — de
   * bevestigingsmail, het adminscherm, het archief van de bewaarplicht — en die
   * hoeven daar niet allemaal voor herschreven te worden. Zie migrations/0016
   * en src/data/address.js.
   *
   * EN ER IS EEN TERUGVAL, want dit is de duurste regel in dit bestand.
   *
   * Een deploy komt in de praktijk soms eerder dan een migratie. Stond hier
   * alleen de brede INSERT, dan gooit D1 "no such column: first_name", vangt
   * safe() dat op, en gaat de rest van deze functie vrolijk verder: geen
   * orders-rij, geen order_events, geen portaaltoken — maar wél een
   * bevestigingsmail, wél een betaallink, en wél `ok: true` naar de klant. Een
   * bestelling die is betaald en niet bestaat, zonder één foutmelding
   * onderweg. Dat mag niet van één migratie afhangen.
   *
   * Dus: de brede INSERT, en bij een ontbrekende kolom nog één keer met de set
   * van vóór 0016. Dan mist de bestelling zijn losse adresregels — hersteld
   * zodra de migratie draait, want billing_address en name zijn wél geschreven
   * — en dat is oneindig veel beter dan geen bestelling.
   */
  const ORDER_COLS_BASE = `ref, customer_id, service, name, brand, email, phone, vat_number, details_json, source, lang,
                           tier, product_count, window_start, window_end, total_cents,
                           country, billing_address, vat_treatment, vat_rate, vat_cents,
                           vat_valid, vat_checked_at, vat_consultation, vat_check_name, vat_check_json`;
  const ORDER_COLS_0016 = `first_name, last_name, no_vat_number,
                           address_line1, address_line2, postal_code, city, region`;
  /*
   * Migratie 0018 — de beoordeling. Zelfde trap als 0016 hierboven: een deploy
   * die vóór de migratie live gaat, mag geen bestelling verliezen. Vandaar drie
   * niveaus in plaats van twee, van breed naar smal, en pas de smalste is de
   * bodem die er altijd is.
   *
   * `vat_valid_state` staat hier en `vat_valid` in de basis. Dat is geen
   * duplicaat: de eerste kan null zijn en betekent "niet kunnen controleren", de
   * tweede is de oude NOT NULL-kolom waar bestaande queries op lezen. Beide
   * worden geschreven zolang de tweede bestaat.
   */
  const ORDER_COLS_0018 = `review_state, review_reason, review_requested_at, review_deadline,
                           vat_confirmed, vat_confirmed_at, vat_valid_state, vat_check_error`;
  const placeholders = (n) => Array.from({ length: n }, (_, i) => `?${i + 1}`).join(',');

  const orderBinds = [
          ref, customerId, svc, name || null, brand || null, email, phone || null, vat || null,
          JSON.stringify(details), get('source') || null, lang,
          tier, products, gate.window?.start || null, gate.window?.end || null,
          // total_cents stays NET, as it always has — admin.js's column header
          // says "excl. VAT" and its comment explains why. What changes is that
          // the VAT beside it is no longer unrecorded: vat_cents plus
          // total_cents is now exactly what Mollie was asked for.
          quote ? quote.netCents : null,
          effCountry || null, effAddress || null,
          vatCall.treatment, vatCall.rate, quote ? quote.vatCents : 0,
          vies && vies.valid ? 1 : 0,
          vies ? vies.checkedAt : null,
          vies ? vies.consultation : null,
          vies ? vies.name : null,
          viesEvidence(vies),
  ];
  const orderBinds0016 = [
    firstName || null, lastName || null, noVat ? 1 : 0,
    addressParts.line1 || null, addressParts.line2 || null,
    addressParts.postal || null, addressParts.city || null, addressParts.region || null,
  ];

  const nowIso = new Date().toISOString();
  // De deadline is een belofte aan de klant ("binnen 24 uur"), dus wordt hij
  // uitgerekend en opgeslagen, niet elke keer opnieuw op een pagina berekend.
  /* `review` en niet `vatReview`: sinds 12 augustus 2026 kan ook een ontbrekend
     zakelijk bewijs een beoordeling opleveren, en die twee redenen horen in
     hetzelfde veld te komen. Stond hier `vatReview`, dan zou een bestelling
     zonder registratienummer wél op de lijst staan maar zonder te zeggen waarom
     -- en dan is de lijst een raadsel in plaats van een werklijst. */
  const reviewDeadline = review.needsReview
    ? new Date(Date.now() + REVIEW_HOURS * 3600 * 1000).toISOString()
    : null;
  const orderBinds0018 = [
    review.needsReview ? REVIEW.pending : null,
    review.reasons.length ? review.reasons.join('; ') : null,
    review.needsReview ? nowIso : null,
    reviewDeadline,
    vatConfirmed ? 1 : 0,
    vatConfirmed ? nowIso : null,
    viesState === null ? null : (viesState ? 1 : 0),
    vies && !vies.ok ? (vies.error || 'onbekend') : null,
  ];

  await safe(async () => {
    if (!env.DB) return;
    const widest = [...orderBinds, ...orderBinds0016, ...orderBinds0018];
    try {
      await env.DB.prepare(
        `INSERT INTO orders (${ORDER_COLS_BASE}, ${ORDER_COLS_0016}, ${ORDER_COLS_0018})`
        + ` VALUES (${placeholders(widest.length)})`
      ).bind(...widest).run();
      return;
    } catch (err) {
      if (!/no such column/i.test(String(err?.message || err))) throw err;
      console.error('[order] migratie 0018 ontbreekt — bestelling zonder beoordelingsvelden weggeschreven:', ref);
    }
    const wide = [...orderBinds, ...orderBinds0016];
    try {
      await env.DB.prepare(
        `INSERT INTO orders (${ORDER_COLS_BASE}, ${ORDER_COLS_0016}) VALUES (${placeholders(wide.length)})`
      ).bind(...wide).run();
      return;
    } catch (err) {
      if (!/no such column/i.test(String(err?.message || err))) throw err;
      console.error('[order] migratie 0016 ontbreekt — bestelling zonder losse adresvelden weggeschreven:', ref);
    }
    await env.DB.prepare(
      `INSERT INTO orders (${ORDER_COLS_BASE}) VALUES (${placeholders(orderBinds.length)})`
    ).bind(...orderBinds).run();
  });

  let orderId = null;
  await safe(async () => {
    const row = await env.DB?.prepare('SELECT id FROM orders WHERE ref = ?1').bind(ref).first();
    orderId = row?.id ?? null;
  });

  /*
   * ── EEN BESTELLING DIE NIET IS WEGGESCHREVEN MOET IEMAND HOREN — 11 AUG 2026 ─
   *
   * Tot vandaag was dit de stilste fout in het hele bestand. De INSERT hierboven
   * zit in safe(), safe() logt naar de console, en dit project heeft geen
   * logbewaring: `[observability]` staat in geen van beide wrangler.toml's. Een
   * mislukte insert was dus letterlijk onwaarneembaar — en de klant kreeg
   * ondertussen een bevestiging, want de rest van deze functie loopt gewoon door.
   *
   * Alles wat de klant net heeft ingevuld staat op dit moment nog in het geheugen
   * en nergens anders. Dit is het laatste punt waarop het te redden is, dus het
   * gaat integraal de mail in: met details_json erbij is de bestelling met de hand
   * na te maken in plaats van bij de klant terug te moeten vragen wat hij wilde.
   *
   * `env.DB &&` staat er zodat dit alleen afgaat als er een database is om in te
   * schrijven. Zonder binding — een lokale run, een test — is een ontbrekende rij
   * geen storing maar de bedoeling, en een alarm dat in de normale toestand afgaat
   * is een alarm dat niemand meer leest.
   *
   * De mail zelf staat óók in safe(): als Resend plat ligt is dat vervelend, maar
   * het mag deze functie niet alsnog laten struikelen over de fout die hij aan het
   * melden is.
   */
  const orderRowMissing = Boolean(env.DB) && !orderId;
  if (orderRowMissing) {
    console.error('[order] bestelling NIET weggeschreven —', ref, '(betaallink onderdrukt)');
    await safe(() => sendMail(env, {
      to: env.NOTIFY_EMAIL || 'hello@visuails.com',
      subject: `!! Bestelling niet weggeschreven — ${ref}`,
      html: `<p><strong>De rij in <code>orders</code> ontbreekt na het invoegen.</strong>
        De klant heeft wél een bevestiging gekregen; er is met opzet GEEN betaallink
        aangemaakt. Maak deze bestelling met de hand aan of neem contact op.</p>
        <p>Kenmerk: <strong>${esc(ref)}</strong><br>
        Dienst: ${esc(svc)}<br>
        Naam: ${esc(name || '—')}<br>
        Merk: ${esc(brand || '—')}<br>
        E-mail: ${esc(email)}<br>
        Telefoon: ${esc(phone || '—')}<br>
        Producten: ${esc(String(products ?? '—'))}<br>
        Land: ${esc(effCountry || country || '—')}<br>
        Btw-nummer: ${esc(vat || '—')}</p>
        <p>Volledige inhoud van het formulier:</p>
        <pre style="white-space:pre-wrap;font:12px/1.5 monospace">${esc(JSON.stringify(details, null, 2))}</pre>`,
    }));
  }

  /*
   * ── WAAR HET VERZOEK VANDAAN KWAM, 9 AUGUSTUS 2026 ─────────────────────────
   *
   * Lucas' vraag: hoe controleer je iemand die in Nederland zit en zegt dat hij uit
   * Amerika bestelt? Voor een land buiten de EU bestaat geen register — VIES dekt
   * alleen lidstaten — dus die opgave rustte volledig op zijn woord, en is 21% waard.
   *
   * Cloudflare geeft op elk verzoek gratis het land mee dat bij het ip hoort. Dat
   * werd hier nergens gebruikt. Nu staat het naast de claim in het adminscherm, en
   * kan een mens er één keer naar kijken.
   *
   * ── EEN APARTE UPDATE EN GEEN VIERDE INSERT-VARIANT ────────────────────────
   *
   * De INSERT hierboven heeft al drie niveaus (basis, +0016, +0018) om een
   * niet-gedraaide migratie te overleven. Een vierde toevoegen zou dit veld even
   * belangrijk maken als het bedrag en het adres, en dat is het niet: het is
   * aanvullend bewijsmateriaal. Valt deze regel weg omdat 0023 nog niet gedraaid is,
   * dan is de bestelling nog steeds volledig juist.
   *
   * ── ALLEEN DE LANDCODE, NIET HET IP ────────────────────────────────────────
   *
   * Twee letters. Het ip zelf wordt met opzet niet opgeslagen: voor het doel — een
   * fiscale opgave kunnen onderbouwen — is het land genoeg, en een ip is een
   * persoonsgegeven met een veel langere staart. Dit hoort in /privacy §4 te staan.
   *
   * GEEN AUTOMATISCHE AFKEURING. Een vpn, een zakenreis of een Nederlandse directeur
   * van een Amerikaanse vennootschap leveren allemaal een verschil op zonder dat er
   * iets mis is. Dit veld beslist dus niets; het staat er alleen naast.
   */
  const originCountry = String(request?.cf?.country || '').trim().toUpperCase().slice(0, 2);
  if (orderId && originCountry) {
    await safe(async () => {
      await env.DB.prepare('UPDATE orders SET origin_country = ?2 WHERE id = ?1')
        .bind(orderId, originCountry).run();
    });
  }

  // TWO PEOPLE, ONE LAST WINDOW, THE SAME INSTANT. Both passed the gate above,
  // because both read the calendar before either had written to it. Resolving it
  // here — after the write, when the rows exist — is what makes the outcome a
  // fact rather than a guess. See loseRaceIfOversold for why the lower id wins.
  let raced = false;
  if (gate.window && orderId) {
    raced = await loseRaceIfOversold(env, { orderId, products, window: gate.window });
  }
  const finalWindow = raced ? null : gate.window;

  // SECTION 13 · THE UPGRADE PATH. Only ever on a Tier 0 order — a brand that
  // has just booked a drop does not need to be told what a drop costs, and
  // asking would burn their once-a-quarter slot to say nothing. The claim runs
  // after the insert so the order in hand is part of the count it reports.
  const upgradeCount = tier === 'unattended' ? await claimUpgradePrompt(env, customerId) : null;
  const upgradeLine = upgradeCount ? upgradePrompt(upgradeCount, lang) : null;

  await safe(async () => {
    if (!orderId || !env.DB) return;
    await env.DB.prepare('INSERT INTO order_events (order_id, status, note) VALUES (?1, ?2, ?3)')
      .bind(orderId, 'received', eventNote({
        tier, window: finalWindow, raced, uploads: staged.length, upgrade: upgradeCount,
      })).run();
  });

  // The staged objects become rows now that there is an order to hang them on.
  // They keep the key they were uploaded under; nothing is copied or moved,
  // because a 25 MB copy per photograph to make a prefix prettier is a cost the
  // client pays in latency for no benefit at all.
  if (orderId && staged.length) await safe(() => attachUploads(env, orderId, staged));

  // ───────────────────────────────────────────────────────────────────────────
  // SECTION 10 · THE LINK THAT MAKES THE PORTAL REACHABLE.
  //
  // /o/<token> has been finished, rate-limited and tested since section 10, and
  // it had never once been reachable. Nothing in the shipping codebase wrote an
  // order_tokens row, so the table stayed permanently empty, every lookup
  // missed, portalUrl() had no callers, and no confirmation ever carried a
  // link. A portal nobody can open is the same thing as no portal.
  //
  // This is the only moment both halves exist at once: an order row to hang the
  // token on, and an address to send it to. The raw token lives in this scope
  // and in the client's inbox; what reaches the database is its SHA-256. See
  // src/lib/token.js — that asymmetry is the whole design, and it is why the
  // link cannot be re-derived later from the row. It goes out now or never.
  //
  // Wrapped in safe(), like every other side effect here. If the mint or the
  // insert fails, the client still gets a confirmation — without a link, which
  // is a worse email but is still an email. The order is what must survive.
  // ───────────────────────────────────────────────────────────────────────────
  let portalLink = null;
  if (orderId) {
    await safe(async () => {
      if (!env.DB) return;
      const token = mintToken();
      await env.DB.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?1, ?2)')
        .bind(orderId, await hashToken(token)).run();
      portalLink = portalUrl(token, requestOrigin(request));
    });
  }

  // The photographs themselves, not a count of them. Awaited rather than
  // deferred: the notice that an order exists is the one message in this
  // function that has no second delivery path, and a waitUntil that is dropped
  // by the runtime loses it silently. The cost is a bounded read from R2 in the
  // same network, and only on orders that actually carried files.
  const packed = staged.length ? await packAttachments(env, staged) : { attachments: [], keys: [] };

  await safe(async () => {
    const to = env.NOTIFY_EMAIL || 'hello@visuails.com';
    const subject = `${raced ? '[WINDOW LOST] ' : ''}New ${svc} order — ${ref}`;
    // The studio's copy gets the VAT verdict too. It is the only place a human
    // sees the order before the money moves, and "0% charged, VIES said yes,
    // here is the consultation number" is exactly the line an accountant asks
    // about three months later.
    const body = (attached) => notifyEmail(ref, svc, { name, brand, email, phone, vat, website, country: effCountry, address: effAddress }, details, {
      tier, products, window: finalWindow, raced, asked, uploads: staged.length,
      upgrade: upgradeCount, files: staged, attached, portal: portalLink,
      vat: vatCall, vies, quote,
    });
    try {
      await sendMail(env, { to, subject, html: body(packed.keys), attachments: packed.attachments });
    } catch (e) {
      // A REFUSED ATTACHMENT MUST NOT COST THE NOTIFICATION. Resend can reject
      // the whole message for a reason that belongs to the files — total size,
      // a type it will not carry — and losing the order notice to save the
      // photographs is exactly backwards. Retry once, plain, with copy that
      // matches what actually went: the second body says nothing was attached,
      // because nothing was, and the keys are in the table either way.
      //
      // ONLY when something was actually attached. A message with no files that
      // Resend refused was refused for a reason the retry cannot change — the
      // service is down, the key is wrong — and sending it a second time is one
      // more failed request and, on the day Resend is merely slow rather than
      // broken, one duplicate in the studio's inbox. Rethrow instead and let
      // safe() log it, which is what every other unattached send here does.
      if (!packed.attachments.length) throw e;
      console.error('[order] notify with attachments refused, retrying plain —', e && e.message ? e.message : e);
      await sendMail(env, { to, subject, html: body([]) });
    }
  });
  // ── THE PAYMENT LINK ───────────────────────────────────────────────────────
  // Lucas's choice, August 2026: "betaallink na bevestiging". The order is
  // confirmed exactly as it was before — step 5 still says you are confirming
  // rather than paying, and that sentence stays true — and the link to pay
  // arrives in this same confirmation email.
  //
  // WHY NOT A REDIRECT TO CHECKOUT. That is what the test sample does, and it
  // suits a €1 impulse. A catalog order is €89 to several thousand, and
  // sending somebody who has just filled in five steps straight into a payment
  // wall is where they close the tab. It also keeps the capacity gate's promise
  // intact: the window is confirmed before you pay, which is what TIERS has
  // said all along.
  //
  // FAILING OPEN, like everything else in this file. If Mollie is unreachable
  // or the key is missing, the order still exists and the client still gets
  // their confirmation — without a link this once. Losing an order to protect a
  // checkout step is the mistake this file refuses to make everywhere else.
  // ── THE RESERVATION COUNTDOWN ──────────────────────────────────────────────
  // Lucas's choice: hold the window, but let it expire if nobody pays. Written
  // only when there is BOTH a window to lose and something to pay — an
  // unattended order has no reservation to release, and an order with no quote
  // has nothing to wait for. The webhook clears this the moment payment lands.
  //
  // Seven days, and the number lives here rather than in a sweep query for the
  // reason migration 0006 gives: a policy recomputed at read time is a policy
  // that lives in whichever query ran last.
  if (finalWindow && quote) {
    await safe(() => env.DB && env.DB
      .prepare(`UPDATE orders SET window_expires_at = datetime('now', '+7 days') WHERE ref = ?1`)
      .bind(ref).run());
  }

  // Geen betaallink als de poort dichtstaat. Dit is het enige punt in de flow
  // waar dat kan: zodra er een link bestaat, kan iemand hem gebruiken, en dan is
  // het geld binnen op een claim die nog niemand heeft nagekeken.
  let payUrl = null;
  /*
   * isPayableService(svc) EN NIET PAYABLE_SERVICES.has(svc) — 10 AUGUSTUS 2026.
   *
   * `svc` komt uit ORDER_SERVICES (regel 80) en die bevat 'drop': dat is de wire-waarde
   * die de attended-deur post, en die staat zo in orders.service. PAYABLE_SERVICES kent
   * alleen de laddernaam 'complete'. Dus `PAYABLE_SERVICES.has('drop')` was false en de
   * duurste bestelling op de site kreeg geen betaallink in haar bevestigingsmail.
   *
   * Dit is de DERDE keer dat dezelfde val dichtklapt. quote.js:96-108 beschrijft de
   * tweede (7 augustus, het geldblok en de knop op het klantdashboard) en exporteert
   * sindsdien isPayableService() met de instructie: wie een dienst uit orders.service in
   * handen heeft, gebruikt die functie en niet de verzameling. Dit aanroeppunt deelt de
   * betaallink uit en las nog steeds de verzameling.
   */
  /*
   * ── `orderId &&` STOND HIER NIET — 11 AUGUSTUS 2026 ────────────────────────
   *
   * Dit was de duurste regel van de site: er werd een echte Mollie-betaling
   * aangemaakt zonder te controleren of de bestelling ook daadwerkelijk in de
   * database staat.
   *
   * De INSERT hierboven (regel ~598) zit in `safe()`, en safe() vangt álles af
   * behalve "no such column" en logt het weg. Een overbelaste D1, een timeout,
   * een constraint — allemaal stil. `orderId` blijft dan null (regel ~626), en
   * die poort keek daar niet naar. De klant kreeg dus een geldige betaalknop
   * voor een `ref` die nergens bestond.
   *
   * Wat er daarna gebeurde, maakte het onherstelbaar in plaats van alleen fout.
   * De webhook zoekt de bestelling op `ref` (functions/api/webhook/mollie.js
   * ~209), vindt niets, doet `console.error` en `return` — en dat is een 200
   * naar Mollie, dus Mollie stopt met opnieuw aanbieden. Netto: geld binnen,
   * geen bestelling, geen factuur, geen mail, en het enige spoor is een
   * consoleregel in een omgeving zonder logbewaring. De noot bij die plek zegt
   * "The order row is written before the payment is ever created, so this is
   * not a race" — dat is precies de aanname die hier niet gold.
   *
   * Vandaar de volgorde: éérst of de bestelling bestaat, dan pas of er een
   * prijs is. Er is geen enkele toestand waarin een betaallink zonder rij in
   * `orders` de goede uitkomst is — een betaling die nergens naar verwijst is
   * niet een halve bestelling maar een terugbetaling die nog moet gebeuren.
   *
   * De tweede helft van dezelfde reparatie zit in src/lib/quote.js: `quote` was
   * nooit null bij een onbekend productaantal, want clamp() maakte er één
   * product van. Zie de noot daar.
   *
   * Als `orderId` null is gaat er nu een alarmmail uit (zie hieronder) — zonder
   * die mail zou deze poort de fout alleen maar stiller maken dan hij al was.
   */
  /* `!review.needsReview` staat NAAST vatReview.payableNow en vervangt hem niet:
     payableNow is de btw-poort en zegt iets anders dan "er valt niets te
     beoordelen". Een bestelling die op de lijst staat omdat het zakelijk bewijs
     ontbreekt, hoort geen betaallink te krijgen -- dat is wat "hard in de EU"
     betekent op de plek waar het geld begint te lopen. */
  if (orderId && quote && isPayableService(svc) && env.MOLLIE_API_KEY
      && vatReview.payableNow && !review.needsReview) {
    const payment = await safe(() => createOrderMolliePayment(env, {
      ref,
      lang,
      valueEuros: centsToMollieValue(quote.grossCents),
      grossCents: quote.grossCents,
      description: paymentDescription(quote, lang),
      successUrl: requestOrigin(request) + back + (back.includes('?') ? '&' : '?') + 'paid=' + encodeURIComponent(ref),
      webhookUrl: requestOrigin(request) + '/api/webhook/mollie',
      // Bij 0% wordt iDEAL niet aangeboden — zie de toelichting in
      // src/lib/mollie.js. Voorkomen dat een Nederlandse bankrekening onder een
      // buitenlandse claim verschijnt, in plaats van het achteraf uitzoeken.
      excludeIdeal: vatCall.rate === 0,
    }));
    payUrl = payment?._links?.checkout?.href || null;
  }

  await safe(() => sendMail(env, {
    to: email,
    subject: lang === 'nl' ? `We hebben je aanvraag — ${ref}` : `We've got your request — ${ref}`,
    html: customerEmail(lang, ref, svc, name,
      { tier, window: finalWindow, upgrade: upgradeLine, portal: portalLink, pay: payUrl, quote, vat: vatCall }),
  }));

  /*
   * DE BETAALLINK REIST MEE NAAR DE BEDANKTPAGINA — 7 augustus 2026.
   *
   * Lucas: *"misschien ook handig om de betalingslink hier neer te zetten mocht
   * de betaling nog niet voldaan zijn."*
   *
   * Tot nu ging die link uitsluitend de mail in, en werd de browser naar
   * /thank-you gestuurd. De klant zat dus op een pagina die zei dat alles goed
   * was gegaan, met de enige handeling die nog van hem gevraagd werd in een
   * mail die nog moest aankomen — en met een spamfilter ertussen. Nu staat de
   * knop ook op het scherm waar hij toch al is.
   *
   * ALLEEN OP DEZE ENE OVERGANG. Mollie stuurt na het betalen terug naar
   * successUrl, en die draagt `pay` niet — dus wie betaald heeft, komt terug op
   * dezelfde pagina zónder betaalknop. Dat is precies het gedrag dat je wilt en
   * het kost geen enkele controle: de knop verschijnt als er nog iets te betalen
   * is en verdwijnt zodra dat niet meer zo is.
   *
   * De URL zelf is geen geheim — het is dezelfde link die in de mail staat, hij
   * is eenmalig en hij verloopt. Wel wordt hij hieronder gecontroleerd voordat
   * de pagina er een knop van maakt (zie initThankYou in interactions.js): een
   * `pay=` die niet naar Mollie wijst, wordt genegeerd.
   */
  const done = back + (back.includes('?') ? '&' : '?') + 'ref=' + encodeURIComponent(ref)
    + (payUrl ? `&pay=${encodeURIComponent(payUrl)}` : '');

  // ───────────────────────────────────────────────────────────────────────────
  // MOLLIE — TEST SAMPLE ONLY (see BACKEND-SETUP.md §9). The order row above
  // is already written with payment_status defaulting to whatever schema.sql
  // says; this branch sends the client to pay before they ever see the
  // thank-you page. Scoped deliberately to svc === 'test-sample': every other
  // service still has no server-side price to charge against, so they keep
  // going straight to the free-flow thank-you page below.
  //
  // This replaces an earlier Stripe integration: Checkout Session creation
  // from this Pages Function was coming back as a blank HTTP 400 specifically
  // when called from Cloudflare (never from Stripe's own CLI, never from a
  // local Node test) — a networking-layer failure between Cloudflare and
  // api.stripe.com that neither Stripe's nor Cloudflare's support had
  // resolved. See BACKEND-SETUP.md §9 for the history; src/lib/stripe.js is
  // left in place rather than deleted in case that gets resolved later.
  //
  // Failing OPEN, not closed: if Mollie or the env var is unavailable, the
  // order still exists and the client still gets a confirmation — they just
  // don't get a payment link this one time. Losing the order to protect the
  // checkout step would be exactly the mistake this file already refuses to
  // make everywhere else (see the file header).
  //
  // The webhook at the URL below now exists (functions/api/webhook/mollie.js)
  // and is what actually moves the order to paid. This branch still only sends
  // the customer to Mollie — reaching the checkout page is not paying, and the
  // redirect below fires whether they complete the payment or close the tab.
  // Nothing downstream should read "we redirected them" as "the order is
  // paid"; read orders.payment_status, which only the webhook writes.
  //
  // NOTE ON THE PATH: this used to say `/api/webhooks/mollie`, plural, while
  // the Stripe handler sat at `/api/webhook/stripe`, singular — two sibling
  // directories one letter apart, and the plural one had nothing in it. They
  // are one directory now. Nothing was live on the old path, so nothing broke;
  // if a test payment created before this change is still being retried by
  // Mollie it will 404 for its 26-hour window and then stop.
  // ───────────────────────────────────────────────────────────────────────────
  /*
   * ── `orderId &&` OOK HIER — 12 AUGUSTUS 2026 ───────────────────────────────
   *
   * De grote betaalpoort hierboven kreeg deze voorwaarde op 11 augustus; dit pad
   * niet, en het is dezelfde fout met hetzelfde gevolg. De webhook zoekt óók een
   * proefbetaling op `ref` en geeft óók 200 terug als hij niets vindt, dus is een
   * proefvisual zonder rij in `orders` net zo goed geld dat nergens naar verwijst —
   * alleen € 1 in plaats van € 2.359,50, wat het niet minder verkeerd maakt.
   *
   * Erger zelfs op één punt: hier hangt de klep tegen een tweede proefvisual per
   * bedrijf aan de betaler-hash die de webhook op de bestelling schrijft. Zonder rij
   * is er niets om die hash op te schrijven, dus ontbreekt de poging in de telling
   * en is de volgende poging weer de eerste.
   *
   * De alarmmail hierboven gaat al af als `orderId` null is, dus deze poort maakt de
   * fout niet stiller — hij houdt alleen de betaling tegen.
   */
  /*
   * ── EN WAAROM DE PROEFVISUAL NIET OP `review` WORDT GEPOORT ────────────────
   *
   * De betaalpoort hierboven kreeg op 12 augustus 2026 `!review.needsReview`
   * erbij, zodat een bestelling zonder zakelijk bewijs geen betaallink krijgt.
   * Hier staat die voorwaarde met opzet NIET, en dat is een afweging en geen
   * vergetelheid.
   *
   * Het gaat om één euro, en de verklaring — het dragende element van de hele
   * uitsluiting — is op dit formulier verplicht en dus aanwezig. Wat kan
   * ontbreken is het CORROBORERENDE bewijs, en de vaakste oorzaak daarvan is
   * niet een consument maar een VIES-storing: src/data/vat.js beschrijft de
   * ochtend dat Roemenië eruit lag. Een Duits merk zijn proefvisual weigeren
   * omdat een overheidsdienst even niet antwoordde, is de duurste manier om
   * nul euro te beschermen.
   *
   * De bestelling verdwijnt niet uit het zicht: hij staat op de
   * beoordelingslijst met de reden erbij, dus vóórdat er werk in gaat zitten is
   * het gezien. Dat is waar die lijst voor is.
   */
  if (svc === 'test-sample' && orderId && env.MOLLIE_API_KEY) {
    // createTestSampleMolliePayment() resolves the whole Mollie payment
    // object ({ id, status, _links, ... }), not a URL string —
    // _links.checkout.href is what the browser actually needs to go to. Same
    // [object Object] trap as the Stripe version had if this were redirected
    // to directly instead of pulling the URL out first.
    const payment = await safe(() => createTestSampleMolliePayment(env, {
      ref,
      lang,
      successUrl: requestOrigin(request) + done,
      webhookUrl: requestOrigin(request) + '/api/webhook/mollie',
    }));
    const checkoutUrl = payment?._links?.checkout?.href;
    if (checkoutUrl) {
      if (wantsJson) {
        return json({ ok: true, ref, tier, window: finalWindow, windowLost: raced, redirect: checkoutUrl });
      }
      return redirect(checkoutUrl);
    }
  }

  if (wantsJson) {
    return json({
      ok: true,
      ref,
      tier,
      window: finalWindow,
      // The client screen has to say something different when this is true, and
      // it must not be inferred from `window: null` — an attended order that
      // never asked for a date looks identical from the outside.
      windowLost: raced,
      redirect: done,
    });
  }
  return redirect(done);
}

// GET on this route → send people to the order hub rather than a blank 405.
// Points at /start, not /order: section 10 retires /order and its four siblings,
// and a redirect into a redirect is a loop.
export function onRequestGet() {
  return redirect('/start');
}

// ---------- the capacity gate, server side -----------------------------------

/**
 * Is the window this request asked for still clear, right now?
 *
 * Returns { window, reason, windows, listReason }:
 *   • window     the range that may be written to orders, or null. NEVER a range
 *                clearedWindows() did not just return.
 *   • reason     'queue' Tier 0, which has no window by definition
 *                'none'  nothing was asked for
 *                'ok'    asked for, and still clear
 *                'gone'  asked for, and no longer clear
 *                'unavailable' the calendar could not be read
 *   • windows    what IS clear, so a caller can offer them instead
 *
 * FAILING CLOSED ON DATES. If D1 cannot be read this returns no window. That is
 * the one place in this file that refuses rather than degrades, and it is the
 * same choice /api/capacity makes for the same reason: a date invented while the
 * calendar is unreadable is exactly the promise the gate exists to prevent. The
 * order itself is unaffected — see note 3 at the top.
 */
async function clearRequestedWindow(env, { tier, products, asked }) {
  const empty = { window: null, windows: [], listReason: null };
  if (tier !== 'attended') return { ...empty, reason: 'queue' };
  if (!asked?.start) return { ...empty, reason: 'none' };
  if (!env?.DB) return { ...empty, reason: 'unavailable' };
  // A count the gate cannot use costs no database read. Both verdicts about the
  // count alone are reached before clearedWindows looks at a calendar, so asking
  // it with none — `limit: 0` yields no windows and does no window work — is the
  // exact classification rather than an approximation of it.
  //
  // The classification is DELEGATED, never repeated. Re-deriving it here is what
  // flattened 'too-large' into 'invalid', which capacity.js's own docstring
  // forbids: the caller "must not flatten them into one 'sorry'". A count larger
  // than one window and a count that is not a number are different facts and
  // /start has a different panel for each. Only the "is this worth the I/O"
  // decision is local; if the classification ever moves, this follows it.
  const early = clearedWindows({ today: todayUTC(), products, limit: 0 }).reason;
  if (early === 'invalid' || early === 'too-large') {
    return { ...empty, reason: 'gone', listReason: early };
  }

  try {
    const today = todayUTC();
    const { blackouts, booked } = await readCalendar(env, today);

    // A wider limit than the six /api/capacity offers. The client can only have
    // chosen from those six, and windows never appear EARLIER than one already
    // offered — time does not run backwards — so six would in fact be enough.
    // Twelve costs one more loop iteration and removes that argument from the
    // list of things this correctness depends on.
    const { windows, reason } = clearedWindows({ today, products, booked, blackouts, limit: 12 });

    const match = windows.find(
      (w) => w.start === asked.start && (!asked.end || w.end === asked.end)
    );
    if (!match) return { window: null, windows, reason: 'gone', listReason: reason };

    // The stored pair is the gate's own answer, not the client's echo of it.
    return { window: { start: match.start, end: match.end }, windows, reason: 'ok', listReason: reason };
  } catch {
    return { ...empty, reason: 'unavailable' };
  }
}

/**
 * The calendar the gate reads. Mirrors readCalendar in functions/api/capacity.js
 * deliberately and exactly — same filters, same horizon — because a booking that
 * measured capacity differently from the page that offered it would clear
 * windows the page had already sold.
 *
 * `beforeId`, when set, counts only orders written before this one. That is the
 * race resolution and nothing else; see loseRaceIfOversold.
 */
async function readCalendar(env, today, beforeId = null) {
  const horizonEnd = addDays(today, HORIZON_DAYS + 14);
  const orderSql =
    `SELECT window_start, window_end, product_count
       FROM orders
      WHERE tier = 'attended'
        AND window_start IS NOT NULL
        AND status <> 'cancelled'
        AND COALESCE(window_end, window_start) >= ?1` + (beforeId ? ' AND id < ?2' : '');

  const orderStmt = beforeId
    ? env.DB.prepare(orderSql).bind(today, beforeId)
    : env.DB.prepare(orderSql).bind(today);

  const [blackoutRows, orderRows] = await Promise.all([
    env.DB.prepare('SELECT day FROM blackout_days WHERE day >= ?1 AND day <= ?2').bind(today, horizonEnd).all(),
    orderStmt.all(),
  ]);

  const blackouts = new Set((blackoutRows.results || []).map((r) => r.day));
  return { blackouts, booked: bookedFromRows(orderRows.results || [], blackouts) };
}

/**
 * Did this order lose a race for the window it just wrote? If so, give it back.
 *
 * WHY LOWER ID WINS, AND WHY THAT IS THE WHOLE DESIGN
 * Two orders can both pass the gate and both write the same window: each read
 * the calendar before either had written to it. Detecting that afterwards is
 * easy; deciding WHICH one backs off is the part that has to be got right,
 * because the obvious implementations are all wrong in the same way. "Back off
 * if the window is oversold" makes both back off, and the window is now free and
 * nobody has it. "Back off if someone else is in it" is the same bug wearing a
 * different sentence.
 *
 * So the rule is a total order that every racer computes identically: measure
 * yourself against the orders written BEFORE you, and only those. The earlier
 * order sees a calendar without the later one and keeps its window. The later
 * order sees the earlier one and finds it no longer fits. Exactly one survives,
 * both agree on which, and neither needs a lock or a transaction to know it.
 *
 * The test is windowFits' own test — clearedWindows against a calendar that
 * excludes this order — and not a cheaper sum against ATTENDED_PER_WINDOW,
 * because capacity is per-day and a window's days are shared with its
 * neighbours' days. Re-asking the gate is the only check that cannot drift from
 * what the gate would have said.
 *
 * Returns true if the window was surrendered.
 */
async function loseRaceIfOversold(env, { orderId, products, window }) {
  if (!env?.DB || !orderId || !window?.start) return false;
  try {
    const today = todayUTC();
    const { blackouts, booked } = await readCalendar(env, today, orderId);
    const { windows } = clearedWindows({ today, products, booked, blackouts, limit: 12 });
    if (windows.some((w) => w.start === window.start && w.end === window.end)) return false;

    await env.DB.prepare('UPDATE orders SET window_start = NULL, window_end = NULL WHERE id = ?1')
      .bind(orderId).run();
    return true;
  } catch {
    // A failure here leaves the window written. That is the right way round: the
    // check is a correction to a rare double-book, and dropping a client's
    // reserved date because a follow-up query timed out would be a far more
    // common and far worse outcome than the double-book it is guarding.
    return false;
  }
}

/** The day the gate treats as today. UTC, matching every date in capacity.js. */
function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- section 13 · the upgrade path -------------------------------------

/**
 * Has this brand ordered enough individual products this quarter to be told what
 * a Full Drop costs — and is this the first time they would be told this
 * quarter? Returns the product count to name in the line, or null for "say
 * nothing".
 *
 * Section 13: "Track per-brand per-product order volume in D1. When a brand
 * crosses 12 individual products in a rolling quarter, surface a one-line prompt
 * in their confirmation [...] Factual, no pressure, once per quarter maximum."
 * And, on why the tier earns its place at all: "Tier 0's job is not revenue. It
 * is portfolio material, catching brands before they grow, and filling gaps
 * between committed drops."
 *
 * THE VOLUME IS SUMMED, NOT COUNTED, and there is no counter column. The orders
 * table already holds every fact the sum needs; a stored total is a second
 * source of truth that goes wrong the first time an order is cancelled by hand,
 * and it would go wrong silently, in the direction of nagging a client who has
 * spent less than the number claims. One read on idx_orders_customer is cheaper
 * than being wrong about that.
 *
 * A NULL product_count CONTRIBUTES NOTHING, which is the right direction to be
 * wrong in. countOf() deliberately refuses to guess at "More than 10", so some
 * genuine Tier 0 orders carry no count — those brands reach the threshold later
 * than their real volume, or not at all. Under-prompting is a missed
 * conversation; over-prompting is a sentence with a number in it the client
 * knows is wrong.
 *
 * ONCE PER QUARTER IS ENFORCED BY THE WRITE, NOT BY THE READ. The UPDATE is a
 * compare-and-set — it touches the row only if the last prompt is older than a
 * quarter, and `changes` says whether we were the ones who claimed it. Two
 * orders arriving in the same second therefore cannot both print the line, with
 * no lock and no transaction. Same shape, and the same reason, as
 * loseRaceIfOversold above: make the outcome a fact rather than a guess.
 *
 * THE SLOT IS CLAIMED BEFORE THE EMAIL IS SENT, deliberately. If the send then
 * fails the brand does not see the prompt this quarter — which is what happened
 * every quarter before this existed, so it costs nothing anyone had. Claiming
 * afterwards would risk printing it twice, and "once per quarter maximum" is the
 * constraint section 13 actually wrote down.
 *
 * A FAILURE HERE IS SILENT AND THE ORDER IS UNAFFECTED. This is a marketing
 * line; nothing about it is worth risking a confirmation email over.
 */
async function claimUpgradePrompt(env, customerId) {
  if (!env?.DB || !customerId) return null;
  try {
    // test-sample is excluded on purpose: it is one per business, charged
    // upfront, and explicitly a trial rather than volume. It sends no count
    // today, so this changes nothing today — it is here so that the day that
    // form gains a quantity, a free trial does not start pushing brands over a
    // threshold about what they have bought.
    const row = await env.DB.prepare(
      `SELECT COALESCE(SUM(product_count), 0) AS n
         FROM orders
        WHERE customer_id = ?1
          AND tier = 'unattended'
          AND service <> 'test-sample'
          AND status <> 'cancelled'
          AND created_at >= datetime('now', '-3 months')`
    ).bind(customerId).first();

    const products = Number(row?.n) || 0;
    // The threshold lives in pricing.js with the arithmetic it belongs to, so
    // this file never has a number in it that could disagree with the sentence.
    if (!shouldPromptUpgrade(products)) return null;

    const claimed = await env.DB.prepare(
      `UPDATE customers
          SET upgrade_prompt_at = datetime('now')
        WHERE id = ?1
          AND (upgrade_prompt_at IS NULL
               OR upgrade_prompt_at < datetime('now', '-3 months'))`
    ).bind(customerId).run();

    return claimed?.meta?.changes ? products : null;
  } catch {
    return null;
  }
}

/**
 * A product count, or null.
 *
 * Deliberately strict about what a number is, and deliberately quiet when it is
 * not one. The pipeline sends an integer; the older forms send a <select> whose
 * last option is "More than 10", which is not a count and must not be guessed at
 * — an invented count is capacity the gate would then reserve against.
 */
function countOf(raw) {
  const n = Number.parseInt(String(raw || '').trim(), 10);
  return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
}

// ---------- the questions in src/data/attributes.js --------------------------

/**
 * The per-product questions post as `<question>_<product key>` — today that is
 * `material_p3` — beside the product name the uploader already posts as
 * `product_p3`. NO SCHEMA CHANGE IS NEEDED and none was made:
 * they are answers about the order, so they land in details_json with
 * everything else the customer typed, and `p3` is the key that joins them to
 * the files rows attachUploads() writes. The studio's email prints
 * details_json verbatim, so each answer arrives under its own product's key
 * with no code in the mail path at all. The single order-level question
 * (`audience`) is an ordinary field and needs nothing beyond the cap below.
 *
 * WHAT IS CHECKED, AND WHY ONLY THIS MUCH. details_json is a record of what a
 * customer told us, not an input to anything that executes, so the job here is
 * to stop it becoming a place to store arbitrary volume or an invented
 * vocabulary — not to argue with prose:
 *
 *   · LENGTH. Every text question declares a maxLength and the browser applies
 *     it; a posted field is not a browser, so it is applied again here. Cut
 *     rather than rejected: an over-long answer is a client with a long
 *     sentence, not an attack, and dropping their material entirely to punish
 *     the twenty-first word would be the wrong trade.
 *   · A CLOSED LIST STAYS CLOSED. No question is a <select> today, but the
 *     branch stays: attributes.js may declare one, and its ids would be read
 *     by the studio as an instruction, so anything outside its own option list
 *     is dropped rather than truncated. Half of a closed-list word is worse
 *     than none of it.
 *   · `material` is open text on purpose. attributes.js's `examples` are a
 *     datalist — suggestions, never a closed list — so a fabric nobody thought
 *     of has to survive this function.
 *
 * Anything that is not one of these keys is returned untouched, so every other
 * field on every other form behaves exactly as it did.
 */
const PRODUCT_ANSWER_KEY = /^([a-z]+)_(p[0-9]{1,3})$/;

function vetAnswer(key, value) {
  const orderQ = ORDER_QUESTIONS.find((x) => x.id === key);
  if (orderQ) return capAnswer(value, orderQ.maxLength);

  const m = PRODUCT_ANSWER_KEY.exec(key);
  if (!m || !isProductQuestionId(m[1])) return value;

  const q = productQuestion(m[1]);
  const v = String(value).trim();
  if (q.type === 'select') {
    return q.options.some((o) => o.id && o.id === v) ? v : '';
  }
  return capAnswer(v, q.maxLength);
}

function capAnswer(value, max) {
  const v = String(value).trim();
  return Number.isInteger(max) && max > 0 ? v.slice(0, max) : v;
}

// ---------- uploads ----------------------------------------------------------

/**
 * Turn a staged batch into files rows.
 *
 * kind='upload' matters: the portal's serveFile filters on kind='delivery', so
 * a client's own reference photographs are recorded against the order and are
 * not re-served from it. They are input, not output.
 *
 * WHERE THE PER-PRODUCT MAPPING LANDS, AUGUST 2026. product_key and shot come
 * off the R2 object's customMetadata by way of listBatch(), and this insert is
 * the only place they are written. They are deliberately NOT also folded into
 * details_json: the mapping is a fact about one file and this is the row that
 * already names that file, whereas details_json holds the ORDER's answers —
 * including 'product_p1', the name the customer typed for that card, which
 * arrives as an ordinary form field and needs no code here at all. One fact,
 * one home; the key 'p1' is what joins them.
 *
 * `|| null` rather than `|| ''` on both: listBatch returns '' for an object
 * nobody placed, and a column full of empty strings is a column that has to be
 * checked two ways forever.
 */
async function attachUploads(env, orderId, staged) {
  if (!env?.DB || !staged.length) return;
  const sql = `INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot)
               VALUES (?1, 'upload', ?2, ?3, ?4, ?5, ?6)`;
  const rows = staged.map((f) => [orderId, f.key, f.name || null, f.bytes || null, f.product || null, f.shot || null]);

  if (typeof env.DB.batch === 'function') {
    const stmt = env.DB.prepare(sql);
    await env.DB.batch(rows.map((r) => stmt.bind(...r)));
    return;
  }
  for (const r of rows) await env.DB.prepare(sql).bind(...r).run();
}

/**
 * The client's uploads, ready for Resend's attachments array, under a hard budget.
 *
 * Returns { attachments, keys } — `keys` is the r2_key of everything that
 * actually travelled, so the email can mark each row of its file table rather
 * than assume the first N fit. They are not always the first N: a 20 MB file is
 * stepped over and a 200 kB one after it still rides along, which is the right
 * use of a fixed budget and the wrong thing to describe with a count.
 *
 * Order is listBatch's order, oldest first — the four angles arrive in the
 * order they were shot, not sorted by size.
 *
 * Never throws, and never lets one unreadable object stop the rest. An R2
 * outage here costs the studio the pictures in that one email, not the notice
 * that there is an order at all; the objects and the files rows both survive it.
 */
async function packAttachments(env, staged) {
  const out = { attachments: [], keys: [] };
  if (!env?.UPLOADS || typeof env.UPLOADS.get !== 'function') return out;

  let budget = MAIL_ATTACH_MAX_BYTES;
  for (const f of staged) {
    if (out.attachments.length >= MAIL_ATTACH_MAX_FILES) break;
    if (!f || !f.key) continue;
    // Cheap rejection first, on the size R2 already told us, so a file that
    // cannot fit is never pulled across the network to find that out.
    if (Number(f.bytes) > budget) continue;

    const obj = await safe(() => env.UPLOADS.get(f.key));
    if (!obj || typeof obj.arrayBuffer !== 'function') continue;
    const buf = await safe(() => obj.arrayBuffer());
    // The measured length is the authority, not customMetadata and not the
    // listing: `bytes` can arrive as 0 from a bucket that did not report a size,
    // and a budget checked against 0 is not a budget.
    if (!buf || buf.byteLength > budget) continue;

    budget -= buf.byteLength;
    out.attachments.push({ filename: mailFilename(f.name, out.attachments.length), content: toBase64(buf) });
    out.keys.push(f.key);
  }
  return out;
}

/**
 * A filename an email client can be handed.
 *
 * The source is customMetadata.original, which is whatever the visitor's browser
 * put in the multipart part — client-controlled, so path separators, control
 * characters and quotes come off before it is written into a MIME header. The
 * tail is kept rather than the head, because the extension is the part a mail
 * client reads.
 */
function mailFilename(name, index) {
  const cleaned = String(name || '')
    .replace(/[/\\]/g, '-')
    .replace(/[\u0000-\u001f\u007f"']/g, '')
    .trim()
    .slice(-120);
  return cleaned || `upload-${index + 1}`;
}

// toBase64() verhuisde 9 augustus 2026 naar src/lib/mail.js, samen met de
// factuurmail die hem als tweede aanroeper nodig had — zie de noot daar.

// ---------- helpers ----------------------------------------------------------

/**
 * The origin the request actually arrived on, for links read outside a browser.
 *
 * Not hardcoded: a preview deployment then mails preview links and a local
 * `wrangler pages dev` mails localhost ones, so the portal link is followable
 * from the environment that sent it. A link you cannot click in staging is a
 * link nobody tests until a client has it. Falls back to the canonical host,
 * which is what portalUrl() would have used on its own.
 */
function requestOrigin(request) {
  try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; }
}

/** A file size a person reads at a glance. '' for nothing, so the cell stays empty. */
function fileSize(bytes) {
  const n = Number(bytes) || 0;
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The customer row behind an order. Created on a first order and topped up on
 * every one after — this is why /account has anything to show and why
 * /account/me has anything to prefill.
 *
 * WHOSE VALUE WINS, AND WHY IT DEPENDS ON details_saved_at (August 2026).
 *
 * The old rule was "the newest order wins": COALESCE(excluded.x, customers.x)
 * overwrites any field this order supplied and leaves alone any it did not.
 * That is still exactly what happens for a customer who has never saved their
 * details — the behaviour below is unchanged for them, and they are everyone
 * who existed before this column did.
 *
 * For a customer who HAS saved their details, it inverts: the saved value wins
 * and the order can only fill a blank. The reason is a specific, reachable bug
 * rather than a preference. /start now collapses its brief step for these
 * customers and offers an edit affordance labelled "change for this order" —
 * so a brand that ships one order to a different contact name would, under the
 * old rule, silently rewrite the standing default they explicitly asked us to
 * keep, and every later order would then be prefilled with the exception. A
 * setting a form can overwrite from the side is not a setting.
 *
 * Changing a saved detail for good is therefore one place only: POST
 * /account/details, behind the session cookie, from the dashboard or from the
 * end-of-order opt-in. See src/lib/account.js's handleDetails().
 */
async function upsertCustomer(env, c) {
  if (!env.DB) return null;
  /*
   * TWEE POGINGEN, OM DEZELFDE REDEN ALS DE INSERT INTO orders HIERBOVEN. Deze
   * aanroep bepaalt `customerId`, en die hangt aan de bestelling, aan het
   * portaal en aan het dashboard. Mislukt hij op een kolom die migratie 0016
   * nog moet aanmaken, dan is de bestelling van niemand — en safe() eromheen
   * zou dat inslikken. Dus bij "no such column" nog één keer zonder de nieuwe
   * kolommen; de klant bestaat dan wel, met alleen de samengestelde naam en
   * het samengestelde adres.
   */
  try {
    await upsertWide(env, c);
  } catch (err) {
    if (!/no such column/i.test(String(err?.message || err))) throw err;
    console.error('[order] migratie 0016 ontbreekt — klant zonder losse adresvelden bijgewerkt:', c.email);
    await env.DB.prepare(
      `INSERT INTO customers (email, name, brand, phone, website, vat_number, country, billing_address)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
       ON CONFLICT(email) DO UPDATE SET
         name=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.name, customers.name)
                   ELSE COALESCE(customers.name, excluded.name) END,
         brand=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.brand, customers.brand)
                   ELSE COALESCE(customers.brand, excluded.brand) END,
         phone=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.phone, customers.phone)
                   ELSE COALESCE(customers.phone, excluded.phone) END,
         website=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.website, customers.website)
                   ELSE COALESCE(customers.website, excluded.website) END,
         vat_number=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.vat_number, customers.vat_number)
                   ELSE COALESCE(customers.vat_number, excluded.vat_number) END,
         country=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.country, customers.country)
                   ELSE COALESCE(customers.country, excluded.country) END,
         billing_address=CASE WHEN customers.details_saved_at IS NULL
                   THEN COALESCE(excluded.billing_address, customers.billing_address)
                   ELSE COALESCE(customers.billing_address, excluded.billing_address) END,
         updated_at=datetime('now')`
    ).bind(c.email, c.name || null, c.brand || null, c.phone || null, c.website || null, c.vat || null,
           c.country || null, c.address || null).run();
  }
  const row = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(c.email).first();
  return row?.id ?? null;
}

/** De brede variant, met de kolommen uit migratie 0016. Zie upsertCustomer(). */
async function upsertWide(env, c) {
  await env.DB.prepare(
    // country and billing_address have existed on this table since the first
    // schema and had never been written by anything — no INSERT or UPDATE in
    // src/ or functions/ touched either, because no form asked for them. They
    // are written now, under exactly the same details_saved_at rule as every
    // other field: a customer who has saved their details keeps them, and an
    // order can only fill a blank.
    // De losse naam- en adresvelden uit migratie 0016 gaan mee onder exact
    // dezelfde details_saved_at-regel als de rest: heeft de klant zijn gegevens
    // opgeslagen, dan wint wat er staat en kan een bestelling alleen een leeg
    // veld vullen. no_vat_number valt daarbuiten en heeft zijn eigen regel —
    // zie hieronder.
    `INSERT INTO customers (email, name, brand, phone, website, vat_number, country, billing_address,
                            first_name, last_name, address_line1, address_line2, postal_code, city, region,
                            no_vat_number, save_requested_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17)
     ON CONFLICT(email) DO UPDATE SET
       name=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.name, customers.name)
                 ELSE COALESCE(customers.name, excluded.name) END,
       brand=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.brand, customers.brand)
                 ELSE COALESCE(customers.brand, excluded.brand) END,
       phone=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.phone, customers.phone)
                 ELSE COALESCE(customers.phone, excluded.phone) END,
       website=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.website, customers.website)
                 ELSE COALESCE(customers.website, excluded.website) END,
       vat_number=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.vat_number, customers.vat_number)
                 ELSE COALESCE(customers.vat_number, excluded.vat_number) END,
       country=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.country, customers.country)
                 ELSE COALESCE(customers.country, excluded.country) END,
       billing_address=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.billing_address, customers.billing_address)
                 ELSE COALESCE(customers.billing_address, excluded.billing_address) END,
       -- ── DE LOSSE VELDEN VOLGEN DE SAMENGESTELDE, NIET ANDERSOM ──────────
       --
       -- Naïef zou hier hetzelfde CASE staan als hierboven, en dat is precies
       -- fout voor een klant die zijn gegevens vóór migratie 0016 heeft
       -- opgeslagen. Die heeft name en billing_address gevuld en de losse
       -- kolommen leeg. Een gewone COALESCE ziet die leegte als "nog niets" en
       -- vult hem met het adres van DEZE bestelling — terwijl name en
       -- billing_address beschermd blijven en het OUDE adres houden. Uitkomst:
       -- de factuurkolommen wijzen naar Enschede en de samengestelde regel die
       -- elke mail leest naar Amsterdam. Twee waarheden over één klant.
       --
       -- Dus is de vraag niet "is dit veld leeg" maar "weten we deze naam / dit
       -- adres al ergens". Zo lang de samengestelde kolom gevuld is, blijft de
       -- hele set staan zoals hij staat, en verandert hij alleen via
       -- /account/details — waar naam, losse velden en samenstelling in één
       -- keer worden geschreven.
       first_name=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.first_name, customers.first_name)
                 WHEN customers.name IS NULL AND customers.first_name IS NULL
                 THEN excluded.first_name
                 ELSE customers.first_name END,
       last_name=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.last_name, customers.last_name)
                 WHEN customers.name IS NULL AND customers.last_name IS NULL
                 THEN excluded.last_name
                 ELSE customers.last_name END,
       address_line1=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.address_line1, customers.address_line1)
                 WHEN customers.billing_address IS NULL AND customers.address_line1 IS NULL
                 THEN excluded.address_line1
                 ELSE customers.address_line1 END,
       address_line2=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.address_line2, customers.address_line2)
                 WHEN customers.billing_address IS NULL AND customers.address_line1 IS NULL
                 THEN excluded.address_line2
                 ELSE customers.address_line2 END,
       postal_code=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.postal_code, customers.postal_code)
                 WHEN customers.billing_address IS NULL AND customers.address_line1 IS NULL
                 THEN excluded.postal_code
                 ELSE customers.postal_code END,
       city=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.city, customers.city)
                 WHEN customers.billing_address IS NULL AND customers.address_line1 IS NULL
                 THEN excluded.city
                 ELSE customers.city END,
       region=CASE WHEN customers.details_saved_at IS NULL
                 THEN COALESCE(excluded.region, customers.region)
                 WHEN customers.billing_address IS NULL AND customers.address_line1 IS NULL
                 THEN excluded.region
                 ELSE customers.region END,
       -- "Ik heb geen btw-nummer" wordt alleen AANgezet, nooit uit. Een klant
       -- die vandaag zegt dat hij er geen heeft, zegt dat over zichzelf; een
       -- bestelling waarbij hij het vinkje gewoon niet aanraakte zegt niets, en
       -- dat mag een eerder antwoord niet wissen. Uitzetten gebeurt op één
       -- plek: het invullen van een echt nummer, in handleDetails().
       no_vat_number=CASE WHEN excluded.no_vat_number = 1 THEN 1
                 WHEN excluded.vat_number IS NOT NULL THEN 0
                 ELSE customers.no_vat_number END,
       -- Alleen zetten, nooit wissen, en nooit als er al opgeslagen is. Een
       -- volgende bestelling zonder vinkje betekent niet "haal weg" — het
       -- betekent dat er niets gevraagd is.
       save_requested_at=CASE
                 WHEN customers.details_saved_at IS NOT NULL THEN NULL
                 WHEN excluded.save_requested_at IS NOT NULL THEN COALESCE(customers.save_requested_at, excluded.save_requested_at)
                 ELSE customers.save_requested_at END,
       updated_at=datetime('now')`
  ).bind(c.email, c.name || null, c.brand || null, c.phone || null, c.website || null, c.vat || null,
         c.country || null, c.address || null,
         c.firstName || null, c.lastName || null,
         c.line1 || null, c.line2 || null, c.postal || null, c.city || null, c.region || null,
         c.noVat ? 1 : 0,
         c.saveRequested ? new Date().toISOString() : null).run();
}

// sendMail() moved to src/lib/mail.js on 2026-07-27 — see that file's header
// for why. Imported above, alongside token.js/uploads.js.

async function safe(fn) { try { return await fn(); } catch (e) { console.error('[order]', e && e.message ? e.message : e); } }

function makeRef() {
  const t = Date.now().toString(36).toUpperCase().slice(-4);
  const r = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
  return `VIS-${t}-${r}`;
}

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

// The server's copy of pricing.js's tierFor(). NOT an import: this file runs as
// a Cloudflare Pages Function and pulling in the whole pricing module — with its
// build-time assertions and its bilingual copy tables — to read one threshold
// would be a lot of module for one comparison. The threshold is duplicated on
// purpose and named here so a grep for WINDOW_THRESHOLD finds both halves.
// pricing.js: export const WINDOW_THRESHOLD = 10.
const WINDOW_THRESHOLD = 10;
/*
 * ── DE DIENST DOET MEE, SINDS 12 AUGUSTUS 2026 ───────────────────────────────
 *
 * Zie de noot bij tierFor() in src/data/pricing.js voor de fout die dit verhelpt:
 * het video-aanvraagformulier post zijn aantal clips in `products`, en tien clips
 * leverden een bestelling op met de belofte van een gereserveerd 48-uursvenster dat
 * niemand had ingepland.
 *
 * PAYABLE_SERVICES is hier de juiste verzameling en niet een eigen lijst: dat is
 * precies de set diensten die quoteOrder() kan prijzen en waarvoor er dus een
 * capaciteitspoort en een betaallink bestaan. Video staat er niet in (het is een
 * aanvraag, geen bestelling) en 'custom' ook niet.
 *
 * ladderKey() eromheen omdat de wire-waarde niet de laddernaam is: /start/complete
 * post `service=drop`. Diezelfde val kostte eerder een bestelling van EUR 2.359,50
 * die gratis de deur uit ging — zie de noot bij LADDER_KEY in src/lib/quote.js.
 */
function tierForProducts(products, service) {
  const n = Number(products);
  if (service !== undefined && !PAYABLE_SERVICES.has(ladderKey(service))) return 'unattended';
  return Number.isFinite(n) && Math.floor(n) >= WINDOW_THRESHOLD ? 'attended' : 'unattended';
}

function redirect(location, status = 303) { return new Response(null, { status, headers: { Location: location } }); }

/* `extra` is er sinds 12 augustus 2026 voor één kop: retry-after bij een 429. Een 429
   zonder die kop is een weigering zonder afspraak — dan probeert een cliënt het meteen
   opnieuw, en dat is precies het verkeer dat de limiet moet dempen. */
function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

// Only allow same-site thank-you targets, and match the language.
/*
 * ── EEN BACKSLASH IS GEEN VEILIG BEGIN — 10 AUGUSTUS 2026 ───────────────────
 *
 * De test was `startsWith('/') && !startsWith('//')`, en die laat `/\evil.com/thank-you`
 * door: begint met één schuine streep, niet met twee, en bevat 'thank-you'. Volgens de
 * WHATWG-URL-regels behandelt een browser bij een https-URL een backslash daar
 * hetzelfde als een schuine streep, dus lost hij dit op als https://evil.com/thank-you.
 *
 * Dat maakte dit een open redirect op visuails.com, en erger: dezelfde waarde wordt
 * in de successUrl voor Mollie gezet, dus ook de terugkeer ná betaling landde op de
 * host van een ander — met de ref in de queryreeks.
 *
 * De controle is nu niet meer "hoe begint de tekst" maar "waar wijst hij heen": de
 * waarde wordt opgelost tegen onze eigen oorsprong en moet daar ook uitkomen. Dat is
 * dezelfde vraag die de browser straks stelt, en dan hoeft dit niet te weten hoeveel
 * tekens er nog als scheidingsteken meedoen.
 */
export function safeRedirect(raw, lang) {
  const fallback = lang === 'nl' ? '/nl/thank-you' : '/thank-you';
  if (!raw || typeof raw !== 'string') return fallback;
  let url;
  try {
    url = new URL(raw, 'https://visuails.com');
  } catch {
    return fallback;
  }
  if (url.origin !== 'https://visuails.com') return fallback;
  if (!url.pathname.includes('thank-you')) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

function esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); }

// PALETTE, HAND-CARRIED. Every hex in the mail HTML below is a literal on
// purpose: a mail client cannot resolve a custom property, and half of them
// strip <style> too, so var(--warn-ink) in an inline style is a dead
// declaration and the text renders in whatever the client's default is. That
// makes this file a generated-asset dependency on global.css in the same way
// the logo raster and the shader's vec3 are — when a token moves, these move
// by hand or the studio mail keeps the old palette.
//
// The live set, and what each one is:
//   #8F4023  --warn-ink   the lost-window banner and the no-window line
//   #0F5F6F  --signal-ink "attached", the affirmative state in the file table
//   #8F8C87  muted label  keys in the detail table, "R2 only", the R2 key
// #666, #333 and #f4f4f8 elsewhere are generic mail greys with no token
// behind them and are deliberately left alone. #8F8C87 is NOT one of those:
// it used to be #8a8aa0, a grey-VIOLET tinted toward the old blue-black ink,
// which is now the one wrong temperature on the page. It was retinted to the
// warm ink hue at the same luminance (Y 0.261 -> 0.264), so nothing about its
// legibility changed — only which family it belongs to.
/**
 * What to call a product in the studio's email.
 *
 * The two halves of the mapping meet here and nowhere else: the file row knows
 * its product KEY ('p3', off customMetadata) and details_json knows what the
 * customer typed for that card ('product_p3'). Neither stores the other, so
 * this is a join, not a lookup of a duplicated value.
 *
 * Falls back to the bare key, then to an em dash. A photograph nobody placed is
 * a photograph nobody placed — it is listed, unlabelled, with everything else,
 * because it is still in the batch and still the client's material.
 */
function productLabel(key, details) {
  if (!key) return '—';
  const typed = details && typeof details[`product_${key}`] === 'string' ? details[`product_${key}`].trim() : '';
  return typed ? `${typed} (${key})` : key;
}

function detailRows(obj) {
  return Object.entries(obj).map(([k, v]) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#8F8C87">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`
  ).join('');
}

/**
 * What went into order_events. Short, and true about what was actually reserved.
 *
 * `upgrade` is the product count claimPromptUpgrade() decided to name, or null.
 * It is recorded because customers.upgrade_prompt_at only remembers WHEN the
 * quarter was claimed, never at what volume, and "why did this brand get the
 * line at 12 when the next got it at 19" is the first question anyone asks of a
 * prompt that fired. The event log is the only place that answer can live.
 */
function eventNote({ tier, window, raced, uploads, upgrade }) {
  const bits = [`Order submitted via website (${tier})`];
  if (window) bits.push(`window ${window.start}→${window.end}`);
  else if (tier === 'attended') bits.push(raced ? 'window lost to a concurrent booking' : 'no window reserved');
  if (uploads) bits.push(`${uploads} file${uploads === 1 ? '' : 's'} uploaded`);
  if (upgrade) bits.push(`upgrade prompt shown (${upgrade} products this quarter)`);
  return bits.join(' · ');
}

/**
 * The studio's copy. This one is allowed to say things the client's must not —
 * what was asked for versus what was cleared, and loudly when those differ.
 */
function notifyEmail(ref, service, top, details, gate = {}) {
  const rows = detailRows({ ...top, ...details });
  const { tier, products, window, raced, asked, uploads, upgrade, portal } = gate;
  const files = gate.files || [];
  const attached = gate.attached || [];

  // ── THE VAT VERDICT, IN FRONT OF A HUMAN ───────────────────────────────────
  // Amber rather than red for the unconfirmed case: it is not an error, it is
  // an order that was charged 21% where the customer may have expected 0%, and
  // the studio is the only party who can put that right before the invoice.
  const v = gate.vat;
  const vies = gate.vies;
  const vatBlock = v
    ? `<p style="margin:0 0 16px;padding:12px;background:${v.treatment === 'nl_standard' ? '#1F2229' : '#23301C'};color:#fff;font-size:13px;line-height:1.6">
         <strong>VAT: ${esc(v.treatment)}</strong> at ${Math.round(v.rate * 100)}%${gate.quote ? ` — net ${(gate.quote.netCents / 100).toFixed(2)}, VAT ${(gate.quote.vatCents / 100).toFixed(2)}, charged ${(gate.quote.grossCents / 100).toFixed(2)}` : ''}<br>
         Reason: ${esc(v.reason)}${top.country ? ` · country ${esc(top.country)}` : ''}
         ${vies ? `<br>VIES: ${vies.ok ? (vies.valid ? 'valid' : 'INVALID') : `unreachable (${esc(vies.error || '?')})`}${vies.consultation ? ` · consultation ${esc(vies.consultation)}` : ''}${vies.name ? ` · ${esc(vies.name)}` : ''}` : ''}
         ${v.reason === 'eu-unconfirmed' ? '<br><strong>Charged 21% to an EU customer who gave a number we could not confirm. Worth a look before the invoice.</strong>' : ''}
       </p>`
    : '';

  const banner = raced
    ? `<p style="margin:0 0 16px;padding:12px;background:#8F4023;color:#fff;font-size:14px">
         <strong>Window lost.</strong> This order asked for
         ${esc(asked?.start || '?')}&nbsp;→&nbsp;${esc(asked?.end || '?')} and passed the gate, but a
         concurrent booking took it first, so no date is reserved. The client has been told we will
         come back with the dates. <strong>Call them.</strong>
       </p>`
    : '';

  const reserved = window
    ? `<p style="margin:0 0 16px">Window reserved: <strong>${esc(window.start)} → ${esc(window.end)}</strong></p>`
    : tier === 'attended'
      ? `<p style="margin:0 0 16px;color:#8F4023">Attended order with <strong>no reserved window</strong>.</p>`
      : `<p style="margin:0 0 16px;color:#666">Standard queue — no window, by design.</p>`;

  // SECTION 13 · the upgrade path, from the studio's side. Deliberately its own
  // line rather than a fact buried in `meta`: a brand that has put 12+ products
  // through the queue in a quarter is the exact brand section 13 built Tier 0 to
  // catch — "catching brands before they grow" — and that is a conversation, not
  // a statistic. It is also the only notice that the client's once-a-quarter
  // slot has now been spent, so a second nudge this quarter has to be a human one.
  //
  // NOT styled as an alert. The raced banner above is an emergency and looks like
  // one; this is an opportunity, and dressing it the same way would train the eye
  // to skip both.
  const upgradeNote = upgrade
    ? `<p style="margin:0 0 16px;padding:10px 12px;background:#f4f4f8;color:#333;font-size:14px">
         <strong>Upgrade prompt sent.</strong> ${esc(upgrade)} individual products in the last
         rolling quarter, so the confirmation names what a Full Drop covers. Their once-a-quarter
         slot is now spent — anything further this quarter is a conversation, not an automation.
       </p>`
    : '';

  // THE LINK, ON THE STUDIO'S COPY TOO. Same URL the client got, and there is no
  // second copy of it anywhere: the database holds a hash, so if this email is
  // deleted the only way back into that order is to issue a new token. Worth
  // saying once, here, rather than discovering it the first time it matters.
  const portalNote = portal
    ? `<p style="margin:0 0 16px">
         <a href="${esc(portal)}">Open the client's order page →</a><br>
         <span style="color:#666;font-size:12px">
           The same link the client received, and the only copy — the database stores a hash of it.
         </span>
       </p>`
    : '';

  // WHAT THE CLIENT SENT, NOT HOW MANY THINGS THEY SENT.
  //
  // This was one clause in `meta` reading "3 uploaded files". The photographs
  // were in R2 and in the files table the whole time; the studio's only route to
  // them was the R2 dashboard with a batch prefix typed in by hand, which is not
  // a route, it is a scavenger hunt. Every file is named, sized and keyed here
  // whether or not it fit in the attachment budget, so the row is useful even
  // when the picture did not travel.
  const fileTable = files.length
    ? `<h3 style="margin:20px 0 6px;font-size:14px">Client uploads (${files.length})</h3>
       <p style="margin:0 0 8px;color:#666;font-size:12px">${
         attached.length
           ? `${esc(attached.length)} of ${esc(files.length)} attached to this email. The rest are in R2 under the keys below.`
           : 'Nothing attached — over the mail budget, or the bucket was unreachable. All of them are in R2 under the keys below.'
       }</p>
       <table style="border-collapse:collapse;font-size:13px">${
         files.map((f) => `<tr>
           <td style="padding:3px 12px 3px 0;color:${attached.includes(f.key) ? '#0F5F6F' : '#8F8C87'}">${
             attached.includes(f.key) ? 'attached' : 'R2 only'
           }</td>
           <td style="padding:3px 12px 3px 0;white-space:nowrap">${esc(productLabel(f.product, details))}</td>
           <td style="padding:3px 12px 3px 0;color:#666;white-space:nowrap">${esc(f.shot || '—')}</td>
           <td style="padding:3px 12px 3px 0"><strong>${esc(f.name || '—')}</strong></td>
           <td style="padding:3px 12px 3px 0;color:#666;white-space:nowrap">${esc(fileSize(f.bytes))}</td>
           <td style="padding:3px 0;color:#8F8C87;font-family:ui-monospace,Menlo,monospace;font-size:11px">${esc(f.key || '')}</td>
         </tr>`).join('')
       }</table>`
    : '';

  const meta = [
    tier ? `tier <strong>${esc(tier)}</strong>` : null,
    products ? `${esc(products)} products` : null,
    uploads ? `${esc(uploads)} uploaded file${uploads === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(' · ');

  return `<div style="font-family:system-ui,Arial,sans-serif;color:#111">
    ${banner}
    ${vatBlock}
    <h2 style="margin:0 0 8px">New ${esc(service)} order</h2>
    <p style="margin:0 0 4px">Reference <strong>${esc(ref)}</strong></p>
    ${meta ? `<p style="margin:0 0 12px;color:#666;font-size:13px">${meta}</p>` : ''}
    ${reserved}
    ${portalNote}
    ${upgradeNote}
    <table style="border-collapse:collapse;font-size:14px">${rows}</table>
    ${fileTable}
  </div>`;
}

/**
 * The order confirmation.
 *
 * The timing paragraph is assembled from TIERS in src/data/pricing.js and is
 * never typed here. That is the whole point: this email said "within about 24
 * hours" for months after the site stopped saying it, because an email is the
 * one surface nobody greps.
 *
 * THE DATE RULE, IN THE PLACE IT MATTERS MOST. A window is named only when one
 * was actually reserved — `window` is written from orders.window_start /
 * window_end, which only ever hold a range clearedWindows() returned. An
 * attended order without a reserved window says so and names nothing. An
 * unattended order can never reach the date branch at all, because Tier 0 has a
 * queue span, not a date: "NO named delivery date — show 'typically 2-4 working
 * days,' never a date."
 *
 * `upgrade` is section 13's upgrade prompt — one already-composed sentence, or
 * null. This function does not decide whether to send it, what it says, or which
 * language it is in; upgradePrompt() in pricing.js owns all three, and
 * claimUpgradePrompt() owns whether the quarter was free. All that happens here
 * is placement, which is the one thing the copy cannot carry itself.
 */
export function customerEmail(lang, ref, service, name,
  { tier = 'unattended', window = null, upgrade = null, portal = null, pay = null, quote = null, vat = null } = {}) {
  const nl = lang === 'nl';
  const hi = name ? `Hi ${esc(name)},` : 'Hi,';
  const attended = tier === 'attended';
  const dated = attended && window && window.start && window.end;

  // THE REFERENCE IS NOT REPEATED HERE. It used to close this sentence, back
  // when the mail opened straight into body copy and this was the first place it
  // could appear. The letterhead template prints it under the headline now, two
  // lines above — and a reference stated twice in three lines reads like a
  // template that lost track of itself rather than like emphasis.
  // serviceLabel(), not the raw column. This sentence used to print the slug —
  // "we hebben je catalog-aanvraag ontvangen" — in the first message a paying
  // customer gets. src/data/services.js has the words.
  const svcName = serviceLabel(service, lang) || service;
  const received = nl
    ? `Bedankt — we hebben je aanvraag voor ${esc(svcName)} ontvangen.`
    : `Thanks — we've received your ${esc(svcName)} request.`;

  let timing;
  if (dated) {
    const from = formatDay(window.start, lang);
    const to = formatDay(window.end, lang);
    timing = nl
      ? `Je leverdatum staat gereserveerd: ${esc(from)} tot en met ${esc(to)}.`
      : `Your delivery date is reserved: ${esc(from)} to ${esc(to)}.`;
  } else if (attended) {
    timing = nl
      ? `${turnaround('attended', 'nl')}. We komen bij je terug met de exacte data — zolang die niet bevestigd zijn, noemen we er geen.`
      : `${turnaround('attended', 'en')}. We'll come back with the exact dates — until they're confirmed, we won't name one.`;
  } else {
    // THIS WAS TWO STRING LITERALS, and the docstring above already claimed it
    // was not. They happened to match TIERS.unattended byte-for-byte — verified
    // before the swap, in both languages — so this changes nothing a client
    // reads. It changes who owns the sentence. Every other timing branch in this
    // file already goes through pricing.js; this one being copy meant the tier's
    // only sanctioned timing language existed in two places, and the second one
    // was inside an email, which is precisely the surface the docstring above
    // names as "the one surface nobody greps".
    timing = `${tierRow('unattended', 'queue', lang)}. ${turnaround('unattended', lang)}.`;
  }

  const care = nl
    ? `Een mens controleert elke visual voordat hij bij je komt. ${aftercare(tier, 'nl')}.`
    : `A person checks every visual before it reaches you. ${aftercare(tier, 'en')}.`;

  // SECTION 13 · "Factual, no pressure, once per quarter maximum." The styling
  // IS the "no pressure" half, and it is the half a copy review cannot enforce:
  // the same true sentence set at body weight directly under the confirmation
  // reads as an upsell, and the client is right to read it that way. Below a rule,
  // smaller and muted, it reads as what it is — a note that the cheaper door
  // exists, placed where someone looking for it will find it and someone who only
  // wanted their order confirmed will not trip over it.
  //
  // AFTER `care`, not before. The last thing a confirmation should say is that a
  // person checks the work; a price comparison must not be allowed to take that
  // position.
  const upgradeNote = upgrade
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0"><tr>
         <td style="padding-top:14px;border-top:1px solid #E6E7EB;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#6B7078">${esc(upgrade)}</td>
       </tr></table>`
    : '';

  // THE PORTAL LINK. After the timing and before the aftercare line, because it
  // answers the question the timing sentence just raised — so where do I watch
  // this happen — and because the last thing a confirmation should say is still
  // that a person checks the work.
  //
  // The warning under it is not boilerplate and is not legal cover. This URL is
  // the only thing between the order and the internet: there is no password to
  // add later, and a client who forwards it to a supplier has handed over the
  // gallery. They can only weigh that if we tell them, in the message that
  // carries the link, at the moment they first have it.
  //
  // The URL is printed as well as linked. Mail clients that strip anchors, and
  // people who read on a phone and continue on a desktop, both need the text.
  const portalNote = portal
    ? linkLine(portal, nl ? 'Volg je bestelling in je portaal' : 'Follow your order in your portal')
      + note(nl
        ? `Deze link is de sleutel tot je order — iedereen die hem heeft, kan meekijken. Houd hem binnen je team.<br><span style="color:#8A8F98">${esc(portal)}</span>`
        : `This link is the key to your order — anyone who has it can see it. Keep it inside your team.<br><span style="color:#8A8F98">${esc(portal)}</span>`)
    : '';

  // THE AMOUNT AND THE LINK, in that order and never one without the other. A
  // "pay now" button with no figure beside it asks somebody to click through to
  // find out what they owe, and the figure has to name which side of VAT it is
  // on — BRIEF-14's hardest rule, and an email is the one surface a copy sweep
  // scoped to src/ never reaches.
  //
  // ── DE BTW-REGEL VOLGT DE BESLISSING, NIET DE AANNAME (9 augustus 2026) ────
  //
  // Hier stond hard "incl. 21% btw", met eronder de belofte dat een geldig
  // EU-btw-nummer "achteraf op je factuur wordt rechtgezet". Beide waren onwaar
  // geworden. Sinds migratie 0015 wordt de verlegging BIJ HET AFREKENEN
  // toegepast: een Duits bedrijf met een door VIES bevestigd nummer betaalt 0%,
  // en het bedrag in deze mail is dat 0%-bedrag.
  //
  // Wat de klant dus las: hetzelfde getal twee keer, één keer met "excl. btw" en
  // één keer met "incl. 21% btw" erachter — plus de aankondiging van een
  // correctie die al was doorgevoerd en dus nooit meer zou komen. In de enige
  // mail die zijn bestelling bevestigt.
  //
  // `vat` (de uitkomst van vatDecision()) werd al aan deze functie meegegeven en
  // nergens gelezen. Nu bepaalt hij de regel. Drie behandelingen, drie teksten,
  // en de standaardtekst blijft 21% noemen als losse regel in plaats van hem
  // stil in het totaal te vouwen — dat is wat er dan ook echt gebeurt.
  // The figure keeps its own currency formatting per language — a Dutch reader
  // gets 1.234,00 and an English one 1234.00 — because the two halves of the
  // sentence ("€ x incl." / "€ y excl.") have to agree with each other, and the
  // easiest way to get that wrong is to format them in two places.
  // Intl, not toFixed().replace('.', ','). The old line produced "1234,20" for
  // a four-figure order — the decimal comma was right and the thousands
  // separator was simply absent, which in Dutch reads as a typo in the one
  // number the customer is being asked to pay. formatDay() in this same file
  // already reaches for Intl for exactly this reason.
  const money = cents => `€ ${new Intl.NumberFormat(nl ? 'nl-NL' : 'en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)}`;

  const treatment = vat?.treatment || VAT_TREATMENT.standard;
  const vatSub = () => {
    const net = money(quote.netCents);
    if (treatment === VAT_TREATMENT.reverseCharge) {
      return nl
        ? `${net} excl. btw &middot; 0% btw, verlegd<br>Je btw-nummer is bevestigd, dus we rekenen geen btw. Je geeft hem zelf aan in je eigen land.`
        : `${net} excl. VAT &middot; 0% VAT, reverse charged<br>Your VAT number checked out, so we charge no VAT. You declare it yourself in your own country.`;
    }
    if (treatment === VAT_TREATMENT.outsideScope) {
      return nl
        ? `${net} excl. btw &middot; geen Europese btw<br>Je zit buiten de EU, dus deze levering valt buiten de Europese btw.`
        : `${net} excl. VAT &middot; no European VAT<br>You are outside the EU, so this supply falls outside European VAT.`;
    }
    return nl
      ? `${net} excl. btw &middot; incl. 21% btw`
      : `${net} excl. VAT &middot; incl. 21% VAT`;
  };

  const payBlock = (pay && quote)
    ? payPanel({
      label: nl ? 'Te betalen' : 'To pay',
      amount: money(quote.grossCents),
      sub: vatSub(),
      href: pay,
      cta: nl ? 'Betaal je bestelling' : 'Pay for your order',
    })
    : '';

  // THE SUMMARY TABLE carries only what the prose does not already say. The
  // reserved window in particular stays out of it: `timing` names those dates in
  // a sentence, under the date rule documented above, and a table row repeating
  // them is a second place for a promise to be made — which is exactly the shape
  // of mistake that rule exists to prevent.
  // Only facts this function is already certain of. Nothing is invented for the
  // sake of a fuller table: a tier is not given a display name here, because
  // pricing.js does not have one — TIERS[].label is a scope ("Under 30
  // products"), not a name, and printing it against a row headed "Tier" would
  // read as a promise about size that nobody made.
  const summary = rows([
    [nl ? 'Dienst' : 'Service', esc(svcName)],
    quote ? [nl ? 'Producten' : 'Products', String(quote.products)] : null,
  ].filter(Boolean));

  return shell({
    lang,
    // The inbox preview line. It names the reference rather than repeating the
    // subject, because the two are printed next to each other and saying the
    // same thing twice wastes the only two lines a closed message gets.
    preheader: nl
      ? `Referentie ${ref} — we hebben je aanvraag en houden je op de hoogte.`
      : `Reference ${ref} — we have your request and will keep you posted.`,
    body: [
      h1(nl ? 'Je bestelling staat genoteerd' : 'Your order is in',
        nl ? `Referentie ${esc(ref)}` : `Reference ${esc(ref)}`),
      p(hi),
      p(received),
      summary,
      p(timing, { top: summary ? 8 : 0 }),
      payBlock,
      payBlock ? '<div style="height:22px;font-size:0;line-height:0">&nbsp;</div>' : '',
      portalNote,
      p(care, { top: 20 }),
      upgradeNote,
      `<div style="height:18px;font-size:0;line-height:0">&nbsp;</div>`,
      spamNote(lang),
    ].filter(Boolean).join(''),
  });
}

/** A reserved date, written the way a person reads one. UTC, to match the gate. */
function formatDay(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'nl' ? 'nl-NL' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return iso;
  }
}

export function subscriberEmail(lang) {
  const url = 'https://visuails.com' + (lang === 'nl' ? '/nl/upload-guidelines' : '/upload-guidelines');
  const nl = lang === 'nl';
  return shell({
    lang,
    preheader: nl
      ? 'De vier hoeken, het licht en de achtergrond — in één pagina.'
      : 'The four angles, the light and the background — on one page.',
    body: [
      h1(nl ? 'Zo maak je de productfoto’s die wij nodig hebben' : 'How to shoot the product photos we need'),
      p('Hi,'),
      p(nl
        ? 'Hier staat het in vier punten — de hoeken, het licht en de achtergrond die van een telefoonfoto een campagnebeeld maken.'
        : "Here it is in four points — the angles, lighting and background that turn a phone photo into a campaign image."),
      linkLine(url, nl ? 'Bekijk de checklist' : 'Read the checklist'),
      spamNote(lang),
    ].join(''),
  });
}
