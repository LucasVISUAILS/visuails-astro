// VISUAILS — the client portal at /o/<token>. Section 10.
//
// Two surfaces come out of this file, and which one a client sees is decided by
// orders.tier, not by anything they type:
//
//   TIER 1 · attended  → "Your order".  The portal proper: the work so far, with
//                        per-image approve / request-revision, the order’s
//                        timeline, and the reserved window when one exists.
//   TIER 0 · unattended → "Your files". Dezelfde galerij zonder tijdlijn, zonder
//                        portaalomlijsting en zonder datum.
//
// EN SINDS 9 AUGUSTUS 2026 IS ER MAAR ÉÉN DOWNLOAD, in beide gevallen: de map van
// de hele bestelling. De beelden op het scherm zijn beoordeelbeelden — Lucas:
// *"de zichtbare foto’s zijn dus niet downloadbaar in het portaal en puur voor
// revisies aanvragen."* Zie de kop van src/lib/delivery.js voor wat daar allemaal
// bij kwam kijken; de korte versie is dat files.preview_key sinds migratie 0001
// bestond en door geen enkele regel code ooit was gevuld.
//
// THAT SPLIT IS NOT A DOWNGRADE, AND IT IS NOT COSMETIC. src/data/pricing.js says
// TIERS.unattended.portal === false and TIERS.attended.portal === true, and the
// site sells on that difference. A token still has to exist for Tier 0 — a
// private R2 object cannot be a public URL — but shipping the portal instrument
// to a tier that was not sold one would make the pricing page a lie. Section 13's
// other half is honoured too: same typography, same spacing, same care. Fewer
// controls because it is a different service model, not a worse product.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THE IMPLEMENTATION IS HERE AND NOT IN functions/o/
// Two routes need it — /o (bare, where /order-status redirects) and /o/<token> —
// and Cloudflare's [[catch-all]] does not reliably cover the bare parent. Two
// four-line route files importing one implementation beats one implementation
// copied twice. It also means this file runs under plain `node`, which is the
// only way anything here can be tested in an environment with no wrangler.
//
// WHY THERE IS NO JAVASCRIPT ON THE PAGE
// Every control is a form, every state change is POST-redirect-GET, and the
// revision box is a <details>. A client opens this link on a phone, in a hotel,
// on the worst wifi of their week, to look at photographs. Nothing here should
// wait on a bundle. It also means the Content-Security-Policy below can be
// default-src 'none' with no script source at all, which is a real security
// property rather than a header that looks like one.
//
// WHY THERE IS NO CSRF TOKEN
// Not an oversight, and not laziness. CSRF is an attack that borrows the
// victim's *ambient* credentials — a cookie the browser attaches to a request
// the attacker composed. There is no cookie here. The credential IS the URL, so
// an attacker who can compose a POST to /o/<token> already holds the token, and
// holding the token means they can approve images directly without involving the
// client at all. A hidden field would add ceremony and defend nothing.
//
// The real risk in a secret-in-the-URL design is the URL leaking outward, which
// is what Referrer-Policy on every response is for. It says `same-origin`
// rather than `no-referrer`, and the difference is not cosmetic — see the
// header block above seeOther() and admin.js's originIsSelf().
// ─────────────────────────────────────────────────────────────────────────────

import {
  TEST_SAMPLE, TIERS, aftercare, turnaround,
  canReviewOrder, canSeeReviewHistory, SAMPLE_SERVICE,
} from '../data/pricing.js';
import { serviceLabel } from '../data/services.js';
import { PORTAL_TTL_DAYS, hashToken, isExpired, isWellFormedToken } from './token.js';
import { notifyRevision } from './notify.js';
import { clearUploadRetention } from './retention.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from './ratelimit.js';
import { mailNote } from '../data/mailNote.js';
// Niet uit account.js: zie de kop van close.js voor waarom afronden een eigen
// bestand kreeg in plaats van dat dit bestand de dashboardmodule importeert.
import { maybeCloseOrder } from './close.js';
import { feedbackBlock, loadFeedback, handleFeedbackPost } from './feedback.js';
// Waarom een platformknop een tussenpagina krijgt en geen 303: zie de kop van
// offsite.js. form-action 'self' in de CSP hieronder geldt ook voor de redirect
// na de post, dus een 303 naar Google landt in een leeg tabblad.
import { offsitePage } from './offsite.js';
// Dezelfde bouwer als VISUAILS Studio gebruikt. Zie de kop van delivery.js: dit
// portaal had helemaal geen archief, en de query's van de twee schermen waren al
// uit elkaar gelopen op superseded_at.
import { loadDeliveryFiles, deliveryEntries, deliveryDocs, deliveryZipFiles, deliverySummary, humanBytes, orderProductNames } from './delivery.js';
import { zipStream, zipDisposition, ZIP_MAX_BYTES, ZIP_MAX_FILES } from './zip.js';

const STUDIO_EMAIL = 'hello@visuails.com';

/** Page views: generous for a person, tight for a script. */
const PAGE_LIMIT = 30;

/**
 * File views get their own, much larger, budget.
 *
 * A drop's portal renders twenty-odd <img> tags, so one page view is one page
 * request plus twenty file requests. Charging those to the same bucket as the
 * page would rate-limit a single legitimate client out of their own gallery on
 * the first load. Separate action, separate window, sized for the page it serves.
 */
const FILE_LIMIT = 300;

/** Writes are rarer than reads and cheaper to bound. */
const POST_LIMIT = 20;

/** Longest revision note we store. Long enough for a paragraph, short enough to bound the row. */
const NOTE_MAX = 2000;

// ─────────────────────────────────────────────────────────────────────────────
// COPY
//
// Both languages, because everything on this site is both languages. Which one
// renders is read from orders.lang — stored at order time precisely so this page
// does not have to guess three weeks later. The pages with no order behind them
// (bare /o, an unknown link) have nothing to read, so they fall back to
// Accept-Language.
//
// Nothing about tier promises is typed here. turnaround(), aftercare() and
// TIERS[...].queue come from src/data/pricing.js, which is the single place the
// site is allowed to make a timing claim.
// ─────────────────────────────────────────────────────────────────────────────

const COPY = {
  en: {
    orderTitle: 'Your order',
    orderLede: 'Everything we have finished so far. Approve what works, and flag anything that does not.',
    filesTitle: 'Your files',
    // "ready to download" was the whole of it until 7 August 2026, when
    // approving stopped being a Tier 1 feature. The line has to say the second
    // thing too, or the buttons below it arrive unannounced.
    filesLede: 'Everything from this order. Download what you need, approve what works, and flag anything that does not.',
    sampleLede: 'Your test sample. Download it, and tell us what you think — we answer every one.',

    fRef: 'Reference',
    fOrder: 'Order',
    fProducts: 'Products',
    fWindow: 'Your delivery date',
    fStatus: 'Status',
    windowPending: 'Being scheduled — we confirm the dates with you before anything is fixed',

    workTitle: 'The work',
    filesHeading: 'Files',
    timelineTitle: 'What has happened',
    tally: (approved, total) => `${approved} of ${total} approved`,
    tallyRevisions: (n) => (n === 1 ? '1 revision requested' : `${n} revisions requested`),

    // Deliberately just the promise. The instruction that used to open this line
    // — "Approve what works, and flag anything that does not" — is orderLede,
    // eight lines up, and it was rendering twice on the same screen about 250px
    // apart. Saying it once is instruction; saying it twice is nagging, and the
    // aftercare sentence already presupposes it: "Anything you flag" only parses
    // if you have been told you can flag things.
    howAttended: (care) => `${care}.`,
    howUnattended: (care) => `${care}. Reply to the delivery email or message us — that is all it takes.`,

    stApproved: 'Approved',
    stRevision: 'Revision requested',
    on: (day) => `on ${day}`,

    bApprove: 'Approve',
    bDownload: 'Download the folder',
    folderH: 'Your files',
    folderBody: 'One folder per product, and in it the same visual as PNG, JPG and WebP — so a print shop, a shop page and a feed each get the file they want without anyone resizing anything.',
    folderReview: 'The photos above are review copies, at screen size. They are there to approve or to point at when something is wrong. The folder holds the real files.',
    folderMeta: (n, size) => `${n} files · ${size}`,
    bUndo: 'Undo',
    bCancel: 'Cancel this request',
    bSend: 'Send this note',
    askSummary: 'Something is not right',
    askLabel: 'What should change?',
    askHint: 'In your own words. The more specific, the faster we get it right.',

    emptyAttended: 'Nothing to review yet. The first visuals appear here the moment they are finished, and we email you when they do.',
    emptyUnattended: (timing) => `Your files are not ready yet. They appear here as soon as they are finished, and we email you when they do. ${timing}.`,
    fileGone: 'No longer available here — ask us and we will send it again.',
    closed: 'This order is closed, so the review controls are gone. The files stay on this page until the link expires.',

    footPrivate: (days) => `This link is private to your order. Anyone who has it can see these files, so treat it like a key. It stops working ${days} days after we close the order.`,
    footAsk: 'Anything else,',

    noneTitle: 'Your order lives at a private link',
    noneBody: 'Open the link from the email we sent you — it is the only way in, and it is private to your order.',
    noneAsk: 'Cannot find it? Email us and we will send a new one:',

    unknownTitle: 'This link does not work',
    unknownBody: 'It may have been mistyped, or replaced by a newer one. The most recent link we emailed you is the one that works.',

    expiredTitle: 'This link has expired',
    expiredBody: (days) => `Portal links stop working ${days} days after we close an order. If you still need these files, email us and we will look.`,

    replacedTitle: 'This link has been replaced',
    replacedBody: 'A newer link was issued for this order. Check the most recent email from us — that one works.',

    busyTitle: 'Too many requests',
    busyBody: 'Wait a minute and reload the page.',

    downTitle: 'We cannot reach your order right now',
    downBody: 'This is our end, not yours, and it is being looked at. Try again in a few minutes.',
  },

  nl: {
    orderTitle: 'Je bestelling',
    orderLede: 'Alles wat we tot nu toe af hebben. Keur goed wat klopt, en markeer wat niet klopt.',
    filesTitle: 'Je bestanden',
    filesLede: 'Alles uit deze bestelling. Download wat je nodig hebt, keur goed wat klopt, en markeer wat niet klopt.',
    sampleLede: 'Je proefvisual. Download hem, en laat weten wat je ervan vindt — we reageren op elke reactie.',

    fRef: 'Referentie',
    fOrder: 'Bestelling',
    fProducts: 'Producten',
    fWindow: 'Jouw leverdatum',
    fStatus: 'Status',
    windowPending: 'Wordt ingepland — we bevestigen de data met je voordat er iets vaststaat',

    workTitle: 'Het werk',
    filesHeading: 'Bestanden',
    timelineTitle: 'Wat er is gebeurd',
    tally: (approved, total) => `${approved} van ${total} goedgekeurd`,
    tallyRevisions: (n) => (n === 1 ? '1 revisie aangevraagd' : `${n} revisies aangevraagd`),

    // Zie de EN-kant: de instructie staat al in orderLede.
    howAttended: (care) => `${care}.`,
    howUnattended: (care) => `${care}. Stuur een reactie op de levermail of een bericht — meer is het niet.`,

    stApproved: 'Goedgekeurd',
    stRevision: 'Revisie aangevraagd',
    on: (day) => `op ${day}`,

    bApprove: 'Goedkeuren',
    bDownload: 'Download de map',
    folderH: 'Jouw bestanden',
    folderBody: 'Eén map per product, en daarin hetzelfde beeld als PNG, JPG en WebP — zo krijgt een drukker, een productpagina en een feed elk het bestand dat hij wil, zonder dat iemand nog iets bijschaalt.',
    folderReview: 'De foto\'s hierboven zijn beoordeelbeelden op schermformaat. Ze staan er om goed te keuren of om naar te wijzen als er iets niet klopt. De echte bestanden zitten in de map.',
    folderMeta: (n, size) => `${n} bestanden · ${size}`,
    bUndo: 'Ongedaan maken',
    bCancel: 'Aanvraag intrekken',
    bSend: 'Verstuur deze notitie',
    askSummary: 'Er klopt iets niet',
    askLabel: 'Wat moet er anders?',
    askHint: 'In je eigen woorden. Hoe specifieker, hoe sneller het klopt.',

    emptyAttended: 'Nog niets te beoordelen. De eerste visuals verschijnen hier zodra ze af zijn, en we mailen je als het zover is.',
    emptyUnattended: (timing) => `Je bestanden zijn nog niet klaar. Ze verschijnen hier zodra ze af zijn, en we mailen je als het zover is. ${timing}.`,
    fileGone: 'Niet meer beschikbaar hier — vraag het ons en we sturen hem opnieuw.',
    closed: 'Deze bestelling is afgesloten, dus de beoordelingsknoppen zijn weg. De bestanden blijven op deze pagina staan tot de link verloopt.',

    footPrivate: (days) => `Deze link is privé voor jouw bestelling. Iedereen die hem heeft kan deze bestanden zien, dus behandel hem als een sleutel. Hij werkt tot ${days} dagen nadat we de bestelling afsluiten.`,
    footAsk: 'Verder iets,',

    noneTitle: 'Je bestelling staat achter een privélink',
    noneBody: 'Open de link uit de mail die we je stuurden — dat is de enige ingang, en hij is privé voor jouw bestelling.',
    noneAsk: 'Kun je hem niet vinden? Mail ons en we sturen een nieuwe:',

    unknownTitle: 'Deze link werkt niet',
    unknownBody: 'Misschien is er een tikfout gemaakt, of is hij vervangen door een nieuwere. De laatste link die we je mailden is degene die werkt.',

    expiredTitle: 'Deze link is verlopen',
    expiredBody: (days) => `Portaallinks werken tot ${days} dagen nadat we een bestelling afsluiten. Heb je deze bestanden nog nodig? Mail ons, dan kijken we ernaar.`,

    replacedTitle: 'Deze link is vervangen',
    replacedBody: 'Voor deze bestelling is een nieuwere link uitgegeven. Kijk in de meest recente mail van ons — die werkt.',

    busyTitle: 'Te veel verzoeken',
    busyBody: 'Wacht een minuut en laad de pagina opnieuw.',

    downTitle: 'We kunnen je bestelling nu niet bereiken',
    downBody: 'Dit ligt aan ons, niet aan jou, en er wordt naar gekeken. Probeer het over een paar minuten opnieuw.',
  },
};

/**
 * Display names for the order line.
 *
 * These mirror src/i18n/ui.js — the `drops` labels and `nav_brandmodel` — and
 * TEST_SAMPLE from the price ladder. They are duplicated rather than imported
 * because ui.js is the site's whole nav dictionary and this needs three words;
 * if a second non-Astro surface ever needs them, they move to their own module.
 */
/** orders.status, in words. The column's own comment lists the values. */
const STATUS = {
  received: { en: 'Received', nl: 'Ontvangen' },
  in_production: { en: 'In production', nl: 'In productie' },
  human_check: { en: 'Being checked', nl: 'Wordt nagekeken' },
  delivered: { en: 'Delivered', nl: 'Geleverd' },
  cancelled: { en: 'Cancelled', nl: 'Geannuleerd' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /o, /o/<token>, /o/<token>/f/<id> (het beoordeelbeeld, inline) en
 * /o/<token>/zip (de map van de hele bestelling).
 *
 * The order of the guards is the design. Shape check first, because it costs one
 * regex and stops /o/wp-admin before it can spend anything. Rate limit second,
 * because it costs one D1 write. The lookup last, because it costs the most.
 */
export async function portalGet(context) {
  const { request, env } = context;
  const route = parseRoute(new URL(request.url));

  if (route.kind === 'none') return plainPage(env, request, 'none', 200);
  // A path this file does not serve — /o/<token>/f/notanumber, or any junk
  // suffix. Without this the fall-through at the bottom renders the whole order
  // page for it: a 200 HTML body in answer to an <img> request, and every wrong
  // URL under a leaked link quietly resolving to something. 404 is the answer,
  // and it is the same one portalPost already gives for the same enum value.
  if (route.kind === 'unknown') return plainPage(env, request, 'unknown', 404);
  if (!isWellFormedToken(route.token)) return plainPage(env, request, 'unknown', 404);

  /*
   * Het archief valt onder de PAGINA-limiet en niet onder de bestandslimiet. Een
   * beeld wordt bij elke paginaweergave twaalf keer opgehaald (vandaar FILE_LIMIT
   * van driehonderd), maar de map haal je één keer per bestelling op. Onder de
   * ruime limiet zou een script honderden archieven van twee gigabyte kunnen
   * aanvragen, en dat is precies wat een limiet moet tegenhouden.
   */
  const isFile = route.kind === 'file';
  const gate = await checkRate(env, {
    ip: clientIp(request),
    action: isFile ? 'portal-file' : 'portal',
    limit: isFile ? FILE_LIMIT : PAGE_LIMIT,
  });
  if (!gate.allowed) return busy(env, request, gate.retryAfter);

  maybeSweep(context, env);

  if (!env?.DB) return plainPage(env, request, 'down', 503);

  let order;
  try {
    order = await loadOrder(env, route.token);
  } catch {
    return plainPage(env, request, 'down', 503);
  }
  if (!order) return plainPage(env, request, 'unknown', 404);

  // The client’s own language, from here on. An expired Dutch order gets a Dutch
  // expiry page — the link failing is no reason to switch language on them.
  const lang = order.lang === 'nl' ? 'nl' : 'en';
  if (order.revoked_at) return plainPage(env, request, 'replaced', 410, lang);
  if (isExpired(order.expires_at, order.closed_at)) return plainPage(env, request, 'expired', 410, lang);

  if (isFile) return serveFile(context, order, route);
  if (route.kind === 'zip') return serveOrderFolder(context, order, lang);

  later(context, bumpUse(env, order.token_id));
  return renderOrder(env, order, route.token, lang);
}

/**
 * POST /o/<token> — approve, request a revision, or undo either.
 *
 * Answers with a 303 back to the same URL, anchored at the image just acted on.
 * POST-redirect-GET, so a reload never repeats the action and the back button
 * behaves. No JSON, no fetch, no JavaScript.
 */
export async function portalPost(context) {
  const { request, env } = context;
  const route = parseRoute(new URL(request.url));

  if (route.kind !== 'order') return plainPage(env, request, 'unknown', 404);
  if (!isWellFormedToken(route.token)) return plainPage(env, request, 'unknown', 404);

  const gate = await checkRate(env, { ip: clientIp(request), action: 'portal-post', limit: POST_LIMIT });
  if (!gate.allowed) return busy(env, request, gate.retryAfter);

  if (!env?.DB) return plainPage(env, request, 'down', 503);

  let order;
  try {
    order = await loadOrder(env, route.token);
  } catch {
    return plainPage(env, request, 'down', 503);
  }
  if (!order) return plainPage(env, request, 'unknown', 404);

  const lang = order.lang === 'nl' ? 'nl' : 'en';
  if (order.revoked_at) return plainPage(env, request, 'replaced', 410, lang);
  if (isExpired(order.expires_at, order.closed_at)) return plainPage(env, request, 'expired', 410, lang);

  const home = `/o/${route.token}`;

  // Een proefvisual heeft geen knoppen om op te posten: stil terug naar dezelfde
  // pagina in plaats van een fout, want er stond niets op het scherm dat dit
  // aanbood. De regel zelf staat in pricing.js — dit bestand en account.js
  // hadden hem allebei apart, en dat is precies hoe ze uit elkaar konden gaan
  // lopen toen hij veranderde. De closed_at-helft van die regel staat verderop,
  // bij de actie: afgerond weigert een nieuw besluit maar laat terugdraaien toe.
  if (!canSeeReviewHistory(order)) return seeOther(home);

  let form;
  try {
    form = await request.formData();
  } catch {
    return seeOther(home);
  }

  /*
   * ── HET TEVREDENHEIDSBLOK, VÓÓR DE BEELDACTIES ────────────────────────────
   *
   * Een eigen tak en niet een vijfde `action`, omdat de bestaande controles
   * hieronder allemaal over een BEELD gaan: ze eisen een file-id en ze weigeren
   * een besluit op een afgeronde bestelling. Dit blok verschijnt juist alleen
   * wanneer de bestelling afgerond IS, en heeft geen beeld.
   *
   * Er is geen eigen eigendomscontrole nodig: wie hier komt heeft een geldig
   * token voor deze bestelling, en dat is hierboven al vastgesteld — zelfde
   * vertrouwensmodel als de goedkeurknoppen.
   *
   * Bij een platformknop is het antwoord een TUSSENPAGINA en geen 303 naar
   * Google. Dat is geen omslachtigheid: de CSP van deze pagina zegt form-action
   * 'self', en die richtlijn geldt ook voor de redirect ná de post — een 303 naar
   * buiten wordt door Chrome geblokkeerd en levert een leeg tabblad op. Zie de
   * kop van offsite.js, waar de meting staat, en account.js voor dezelfde
   * wijziging aan dezelfde knoppen in VISUAILS Studio.
   *
   * Het formulier heeft target="_blank", dus de tussenpagina en de reis erna
   * landen in het nieuwe tabblad en de bestelpagina blijft staan waar hij stond.
   */
  if (form.get('fb')) {
    const res = await handleFeedbackPost(env, {
      orderId: order.order_id,
      customerId: order.customer_id || null,
      form,
    });
    if (res.redirect) {
      const away = offsitePage({
        url: res.redirect,
        name: res.redirectName,
        lang,
        css: '/portal.css',
      });
      if (away) return html(away);
    }
    return seeOther(`${home}#fb-h`);
  }

  const action = String(form.get('action') || '');
  const fileId = Number.parseInt(String(form.get('file') || ''), 10);
  if (!Number.isInteger(fileId) || !['approve', 'revise', 'undo'].includes(action)) return seeOther(home);

  // Afgerond: geen nieuwe besluiten, terugdraaien wél. Zelfde regel als in
  // account.js's handleFileReview, en om dezelfde reden — de knop die dan nog op
  // het scherm staat moet ook echt iets doen.
  if (order.closed_at && action !== 'undo') return seeOther(home);

  // The file must belong to THIS order. Without this, a valid token for order A
  // could review order B's images by editing one number in a form.
  let owned;
  try {
    owned = await env.DB.prepare(
      `SELECT id FROM files WHERE id = ?1 AND order_id = ?2 AND kind = 'delivery'`
    )
      .bind(fileId, order.order_id)
      .first();
  } catch {
    return plainPage(env, request, 'down', 503);
  }
  if (!owned) return seeOther(home);

  const anchor = `${home}#f${fileId}`;

  try {
    if (action === 'approve') {
      await env.DB.prepare(
        `UPDATE files SET review_state = 'approved', review_note = NULL, reviewed_at = datetime('now') WHERE id = ?1`
      )
        .bind(fileId)
        .run();
      // ── WAS DIT DE LAATSTE? DAN IS DE BESTELLING AF ────────────────────────
      //
      // Dit ontbrak, en het was een echte bug: /account/review deed dit wel en
      // dit pad niet. Terwijl DIT het pad is dat de klant krijgt toegestuurd —
      // de /o/<token>-link uit de levermail. Wie hier zijn laatste beeld
      // goedkeurde, liet `closed_at` leeg en zijn bestelling gold verder als nog
      // open: geen afrondgebeurtenis op de tijdlijn, en de tevredenheidsvraag
      // uit reviewverzamelingspecificatie.md zou hier nooit afgaan.
      //
      // Gevonden op 8 augustus 2026 bij het uitwerken van die specificatie. Zie
      // close.js voor waarom dit een eigen bestand is en niet een import uit
      // account.js.
      await maybeCloseOrder(env, order.order_id);
    } else if (action === 'undo') {
      // Reversible on purpose. A mis-tapped Approve on a phone must not strand a
      // client with an image they never meant to sign off, and an approval that
      // cannot be taken back quietly teaches people not to press anything.
      //
      // Heropent de bestelling als hij hierdoor was afgerond — zie de langere
      // uitleg bij dezelfde stap in account.js's handleFileReview. Twee regels
      // SQL die in beide bestanden staan; dat is goedkoper dan dat dit bestand
      // de dashboardmodule gaat importeren voor een UPDATE.
      const undo = [
        env.DB.prepare(
          `UPDATE files SET review_state = 'pending', review_note = NULL, reviewed_at = NULL WHERE id = ?1`
        ).bind(fileId),
      ];
      if (order.closed_at) {
        undo.push(
          env.DB.prepare('UPDATE orders SET closed_at = NULL WHERE id = ?1').bind(order.order_id),
          /*
           * ── EN DE BEWAARKLOK VAN HET BRONMATERIAAL TERUG OP NUL ──────────
           *
           * 9 augustus 2026. De bestelling gaat weer open, dus de negentig dagen
           * die bij het afsluiten op het bronmateriaal zijn gestempeld moeten weg.
           * Zonder deze regel verdwijnen de productfoto's negentig dagen na de
           * EERSTE afronding — en dat is precies het materiaal dat nodig is om de
           * revisie te maken waar de bestelling nu voor open staat.
           *
           * Mag wél in dezelfde batch als de UPDATE hierboven: deze query leest
           * `closed_at` niet, hij wist alleen een kolom op files.
           */
          clearUploadRetention(env, order.order_id),
          env.DB.prepare(
            `INSERT INTO order_events (order_id, status, note, actor)
             VALUES (?1, 'delivered', ?2, 'system')`
          ).bind(order.order_id, 'Een goedkeuring is teruggedraaid — bestelling weer open.')
        );
      }
      await env.DB.batch(undo);
    } else {
      // Ingetrokken rechten worden op de server gehandhaafd en niet in de
      // opmaak — een POST die het formulier omzeilt hoort dezelfde muur te
      // vinden. Goedkeuren en terugdraaien blijven wél kunnen; zie dezelfde
      // afweging in account.js's handleFileReview.
      if (order.revisions_revoked_at) return seeOther(anchor);

      const note = String(form.get('note') || '').trim().slice(0, NOTE_MAX);
      if (!note) return seeOther(anchor); // nothing said, nothing changed

      /*
       * TWEE SCHRIJFACTIES, NIET ÉÉN — 7 augustus 2026.
       *
       * Dit schreef alleen `files.review_state`. account.js's kant van dezelfde
       * handeling schrijft daarnaast een rij in `revision_requests`, en dat is
       * niet dubbelop: files houdt de HUIDIGE toestand van één beeld bij, en
       * revision_requests is de geschiedenis waar het adminscherm op stuurt —
       * de openstaande-revisieteller, de lijst en het afhandelen komen daar
       * allemaal uit. Een revisie die via de gemailde link binnenkwam, kwam
       * daardoor in die lijst nooit voor.
       *
       * Zolang alleen tier 1 hier knoppen had was dat een klein gat. Sinds
       * elke bestelling ze heeft, is het de helft van de verzoeken.
       */
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE files SET review_state = 'revision_requested', review_note = ?2, reviewed_at = datetime('now') WHERE id = ?1`
        ).bind(fileId, note),
        env.DB.prepare(
          `INSERT INTO revision_requests (file_id, order_id, customer_id, note) VALUES (?1, ?2, ?3, ?4)`
        ).bind(fileId, order.order_id, order.customer_id, note),
      ]);
      /*
       * ── EN DE STUDIO KRIJGT ER BERICHT VAN, 9 AUGUSTUS 2026 ─────────────────
       *
       * Deze route schreef netjes naar de database en zweeg. Een klant die om elf uur
       * 's avonds een revisie aanvroeg, produceerde geen enkel signaal — je moest het
       * zelf gaan zoeken in het dashboard.
       *
       * De notitie gaat mee IN de mail. /studio belooft dat een revisieverzoek
       * binnenkomt "met de notitie die de klant schreef, in diens eigen woorden", en
       * een bericht dat alleen zegt "er is een revisie" dwingt je alsnog het dashboard
       * te openen om te weten of het dringend is.
       *
       * NA de batch, en de fouten blijven binnen notifyRevision(): het verzoek van de
       * klant mag niet omvallen omdat Resend even niet bereikbaar is.
       */
      await notifyRevision(env, {
        orderId: order.order_id,
        fileId,
        note,
        /* Geen bestandsgegevens meegegeven: notifyRevision() zoekt ze zelf op.
           Hier stond eerst `f?.filename`, met geen enkele `f` in deze scope — en
           optional chaining vángt een niet-bestaande variabele niet, die gooit een
           ReferenceError. Precies de fout die een revisieverzoek van een klant zou
           laten mislukken op het versturen van een mail erover. */
      });

    }
  } catch {
    return plainPage(env, request, 'down', 503);
  }

  later(context, bumpUse(env, order.token_id));
  return seeOther(anchor);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read the path rather than the framework's params.
 *
 * Cloudflare's [[catch-all]] hands back segments, but the same implementation is
 * mounted at two route files and has to run under plain node in tests. A URL is
 * the one input that means the same thing everywhere.
 */
function parseRoute(url) {
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'o') return { kind: 'none' };
  if (parts.length === 1) return { kind: 'none' };

  let token;
  try {
    token = decodeURIComponent(parts[1]);
  } catch {
    token = parts[1]; // a malformed escape is not a token; let the shape check say so
  }

  if (parts.length === 2) return { kind: 'order', token };
  /*
   * ── /d IS VERVALLEN, /zip IS ERBIJ GEKOMEN — 9 augustus 2026 ──────────────
   *
   * Lucas: *"de zichtbare foto’s zijn dus niet downloadbaar in het portaal en
   * puur voor revisies aanvragen. Alleen de map (het eindresultaat) kan
   * gedownload worden."*
   *
   * /o/<token>/d/<id> gaf hetzelfde bestand als /f maar met
   * content-disposition: attachment. Die route is weg, niet alleen de knop:
   * een url die blijft werken nadat de knop eruit is, is de knop verstoppen.
   *
   * /o/<token>/zip bestond hier nog helemaal niet — het archief zat alleen in
   * VISUAILS Studio, en dit is het scherm dat een klant zonder account per mail
   * krijgt. Wie via zijn link kwam, kon zijn levering dus alleen foto voor foto
   * ophalen. Precies de handeling die vanaf vandaag niet meer bestaat.
   */
  if (parts.length === 3 && parts[2] === 'zip') return { kind: 'zip', token };
  if (parts.length === 4 && parts[2] === 'f') {
    const fileId = Number.parseInt(parts[3], 10);
    if (Number.isInteger(fileId)) return { kind: 'file', token, fileId };
  }
  return { kind: 'unknown', token };
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

async function loadOrder(env, token) {
  const hash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT t.id           AS token_id,
            t.expires_at   AS expires_at,
            t.revoked_at   AS revoked_at,
            o.id           AS order_id,
            o.ref, o.service, o.status, o.tier, o.lang,
            o.product_count, o.window_start, o.window_end, o.closed_at,
            o.customer_id,
            -- brand, name en details_json staan er sinds 13 augustus 2026 bij voor
            -- de leesmij en de licentie in het archief. Zonder details_json heten de
            -- productmappen '01' in plaats van '01 - Zwarte hoodie', en dan geeft de
            -- gemailde link een ANDERE map dan het dashboard -- precies de
            -- constructie waar de kop van delivery.js over gaat.
            o.brand, o.name, o.details_json,
            -- Ingetrokken revisierechten hangen aan de KLANT en werden hier niet
            -- gelezen. Zolang dit scherm alleen tier 1 knoppen gaf viel dat niet
            -- op naast account.js, dat er wél op controleert; sinds 7 augustus
            -- 2026 heeft elke bestelling ze en zou een klant met ingetrokken
            -- rechten ze via de gemailde link gewoon blijven indienen.
            (SELECT c.revisions_revoked_at FROM customers c WHERE c.id = o.customer_id) AS revisions_revoked_at
       FROM order_tokens t
       JOIN orders o ON o.id = t.order_id
      WHERE t.token_hash = ?1`
  )
    .bind(hash)
    .first();
  return row || null;
}

/*
 * ── DIT SCHERM LIET VERVANGEN BEELDEN ZIEN, EN DAT WAS DE ERGSTE PLEK ───────
 *
 * Hier stond een eigen query, en die miste `superseded_at IS NULL`. account.js
 * filtert er sinds migratie 0012 op; dit bestand niet, en niemand had de twee ooit
 * naast elkaar gelegd.
 *
 * Gevolg: vroeg een klant een revisie aan, dan leverden wij een nieuw beeld, en
 * daarna stonden er in zijn portaal TWEE — het afgekeurde en het nieuwe. Op het
 * scherm waar hij naartoe gaat om te kijken of zijn opmerking iets heeft
 * opgeleverd. In VISUAILS Studio was dat al goed, dus wie beide schermen naast
 * elkaar had, zag twee versies van zijn eigen bestelling.
 *
 * De query staat nu in delivery.js en wordt door beide schermen gebruikt, zodat
 * dit niet nog een keer één kant op kan wijzigen. Dat is ook de reden dat deze
 * functie niet meer bestaat: hij was de tweede waarheid.
 */

async function loadEvents(env, orderId) {
  const res = await env.DB.prepare(
    `SELECT status, note, created_at FROM order_events WHERE order_id = ?1 ORDER BY id`
  )
    .bind(orderId)
    .all();
  return res.results || [];
}

/** Usage accounting, off the critical path. A failure here must never cost a page view. */
async function bumpUse(env, tokenId) {
  if (!env?.DB || !tokenId) return;
  try {
    await env.DB.prepare(
      `UPDATE order_tokens SET uses = uses + 1, last_used_at = datetime('now') WHERE id = ?1`
    )
      .bind(tokenId)
      .run();
  } catch {
    /* accounting, not access control */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One delivered object, out of R2, behind the same token check as the page.
 *
 * Range and conditional requests are honoured because these are photographs: a
 * client who opens the portal three times in a week should re-download nothing,
 * and a download manager that resumes should be able to.
 */
async function serveFile(context, order, route) {
  const { request, env } = context;

  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let file;
  try {
    file = await env.DB.prepare(
      `SELECT id, r2_key, preview_key, filename, expires_at
         FROM files
        WHERE id = ?1 AND order_id = ?2 AND kind = 'delivery'`
    )
      .bind(route.fileId, order.order_id)
      .first();
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!file) return new Response(null, { status: 404, headers: fileHeaders() });

  // The row's own download window, separate from the token's. Both have to be
  // open; the stricter one wins, which is what checking each in turn does.
  if (file.expires_at && isExpired(file.expires_at, null)) {
    return new Response(null, { status: 410, headers: fileHeaders() });
  }

  /*
   * ── ALTIJD HET BEOORDEELBEELD, EN NOOIT MEER DE LEVERING ──────────────────
   *
   * Hier koos `route.kind` tussen het beoordeelbeeld en het volledige bestand.
   * Er is nu maar één keuze, want /d bestaat niet meer.
   *
   * En de terugval `|| file.r2_key` was tot vandaag geen terugval maar de regel:
   * files.preview_key is sinds migratie 0001 door geen enkele regel code ooit
   * geschreven. Dit pad serveerde dus altijd het leveringsbestand — op het scherm
   * dat "alleen om te beoordelen" heet. scripts/deliver.mjs vult die kolom nu met
   * een verkleind beeld van 1400px. Voor een levering van vóór vandaag staat er
   * nog steeds het volledige bestand, en dat is de eerlijke stand van zaken: de
   * knop is weg, het bestand is voor die oude bestellingen niet verkleind.
   */
  const key = file.preview_key || file.r2_key;

  let object;
  try {
    object = await env.UPLOADS.get(key, { onlyIf: request.headers, range: request.headers });
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!object) return new Response(null, { status: 404, headers: fileHeaders() });

  const headers = new Headers(fileHeaders());
  if (typeof object.writeHttpMetadata === 'function') object.writeHttpMetadata(headers);
  if (object.httpEtag) headers.set('etag', object.httpEtag);
  headers.set('accept-ranges', 'bytes');

  // nosniff is on, so a wrong content-type is a blank <img> rather than a
  // guess. R2 often has none stored, so the filename decides.
  const type = mimeFor(file.filename || key, headers.get('content-type'));
  headers.set('content-type', type);

  // Altijd inline. De enige download in dit portaal is de map (serveOrderFolder).
  headers.set('content-disposition', 'inline');

  // A conditional request that matched. R2 returns the metadata with no body.
  if (!object.body) {
    return new Response(null, { status: request.headers.get('if-none-match') ? 304 : 412, headers });
  }

  const range = object.range;
  if (range && typeof range.offset === 'number') {
    const start = range.offset;
    const length = typeof range.length === 'number' ? range.length : object.size - start;
    headers.set('content-range', `bytes ${start}-${start + length - 1}/${object.size}`);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  if (typeof object.size === 'number') headers.set('content-length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

function fileHeaders() {
  return {
    // private, so a shared cache never holds one client’s photographs; long, so
    // a returning client re-downloads nothing. The page itself stays no-store.
    'cache-control': 'private, max-age=3600',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
  };
}

const MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  gif: 'image/gif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  pdf: 'application/pdf',
  zip: 'application/zip',
};

function mimeFor(name, stored) {
  const ext = String(name).toLowerCase().split('.').pop();
  return MIME[ext] || (stored && stored !== 'application/octet-stream' ? stored : 'application/octet-stream');
}

/**
 * A Content-Disposition filename that survives a Dutch product name.
 *
 * Two forms, per RFC 6266: an ASCII-only fallback for anything old, and
 * filename* for everything else. Quotes, backslashes, control characters and
 * path separators are stripped rather than escaped — none of them belong in a
 * downloaded filename, and a header injection is not worth being clever about.
 */
function dispositionFilename(name) {
  const clean = String(name).replace(/[\\/"\r\n\t\x00-\x1f]/g, '_').slice(0, 120) || 'file';
  const ascii = clean.replace(/[^\x20-\x7e]/g, '_');
  return `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

async function renderOrder(env, order, token, lang) {
  const t = COPY[lang];
  const attended = order.tier === 'attended';

  let files = [];
  let events = [];
  try {
    files = await loadDeliveryFiles(env, order.order_id);
    if (attended) events = await loadEvents(env, order.order_id);
  } catch {
    // The order exists and the client is authenticated; a failed second query is
    // not a reason to show them a locked door. Render what we have.
  }

  /*
   * Het antwoord op de tevredenheidsvraag, alleen opgehaald als er iets te vragen
   * is. Buiten de try hierboven, want loadFeedback() vangt zijn eigen fout al op
   * en geeft dan null — een ontbrekende tabel (migratie 0020 niet gedraaid) hoort
   * de beelden op deze pagina niet te kosten.
   */
  const fb = attended && order.closed_at ? await loadFeedback(env, order.order_id) : null;

  /*
   * De map wordt uit dezelfde rijen berekend als de tegels — zie loadDeliveryFiles.
   * `deliveryEntries` bepaalt de namen (en dus ook of er mappen in zitten) en
   * `deliverySummary` telt wat er op het scherm naast de knop komt te staan. Beide
   * zijn zuivere functies over de rijen die er al zijn: geen tweede query, en per
   * constructie hetzelfde archief als de route straks bouwt.
   */
  const folder = folderBlock(t, token, deliverySummary(deliveryEntries(files, lang)));

  const body = attended
    ? attendedBody(t, lang, order, token, files, events, fb, folder)
    : unattendedBody(t, lang, order, token, files, folder);

  return html(
    page({
      lang,
      title: attended ? t.orderTitle : t.filesTitle,
      body: masthead(order.ref) + body + foot(t),
    })
  );
}

function masthead(ref) {
  // A wordmark, not a link. This page is reached from an email and leads
  // nowhere: a nav here would walk a client mid-order back onto the sales pages.
  return `<header class="bar"><span class="mark">VISUAILS</span>${
    ref ? `<span class="ref">${esc(ref)}</span>` : ''
  }</header>`;
}

function foot(t) {
  return `<footer class="foot">
  <p>${esc(t.footPrivate(PORTAL_TTL_DAYS))}</p>
  <p>${esc(t.footAsk)} <a href="mailto:${STUDIO_EMAIL}">${STUDIO_EMAIL}</a></p>
</footer>`;
}

// ---- Tier 1 · the portal ----------------------------------------------------

/*
 * `fb` is de rij uit order_feedback, of null. Hij komt van buiten en wordt hier
 * niet opgehaald, om dezelfde reden als de rest van deze functie: attendedBody()
 * tekent en vraagt niets aan de database.
 */
function attendedBody(t, lang, order, token, files, events, fb = null, folder = '') {
  const approved = files.filter((f) => f.review_state === 'approved').length;
  const revisions = files.filter((f) => f.review_state === 'revision_requested').length;
  const readOnly = !!order.closed_at;

  const facts = [
    [t.fRef, order.ref],
    [t.fOrder, serviceLabel(order.service, lang) || '—'],
    order.product_count ? [t.fProducts, String(order.product_count)] : null,
    [t.fWindow, windowLine(t, lang, order)],
    [t.fStatus, statusLabel(order.status, lang) || '—'],
  ].filter(Boolean);

  const tally = files.length
    ? ` <span class="tally">· ${esc(t.tally(approved, files.length))}${
        revisions ? ` · ${esc(t.tallyRevisions(revisions))}` : ''
      }</span>`
    : '';

  const work = files.length
    ? `<ul class="shots">${files.map((f) => shot(t, lang, f, token, {
        review: canReviewOrder(order),
        history: canSeeReviewHistory(order),
      })).join('')}</ul>`
    : `<p class="note">${esc(t.emptyAttended)}</p>`;

  /*
   * ── DE TEVREDENHEIDSVRAAG, EN WANNEER HIJ VERSCHIJNT ──────────────────────
   *
   * Alleen bij een AFGERONDE bestelling. `closed_at` wordt gezet door
   * maybeCloseOrder() zodra élk levend beeld is goedgekeurd — dat is precies de
   * trigger uit §2 stap 1 van reviewverzamelingspecificatie.md, en het is de
   * reden dat close.js bestaat: dit pad riep die afronding niet aan, dus zou de
   * vraag hier nooit zijn afgegaan.
   *
   * Vragen halverwege zou iets anders meten. "Ben je tevreden met wat je hebt
   * gekregen" bij vier van de twaalf beelden is een vraag over een bestelling die
   * nog niet klaar is, en het antwoord daarop zegt niets over wat er straks staat.
   */
  const feedback = readOnly
    ? feedbackBlock({ lang, action: `/o/${token}`, feedback: fb })
    : '';

  return `<main>
<div class="head">
  <h1>${esc(t.orderTitle)}</h1>
  <p class="lede">${esc(t.orderLede)}</p>
</div>
${factList(facts)}
<p class="note">${esc(readOnly ? t.closed : t.howAttended(aftercare('attended', lang)))}</p>
<section class="work">
  <h2>${esc(t.workTitle)}${tally}</h2>
  ${work}
</section>
${folder}
${feedback}
${timeline(t, lang, events)}
</main>`;
}

/**
 * The window, and the one rule the whole capacity system exists to hold.
 *
 * orders.window_start only ever holds a range clearedWindows() returned, so
 * printing it is safe by construction. When it is null there is no date to
 * print and none is invented — "being scheduled" is the whole answer.
 */
function windowLine(t, lang, order) {
  if (order.window_start && order.window_end) {
    return `${formatDay(order.window_start, lang)} – ${formatDay(order.window_end, lang)}`;
  }
  if (order.window_start) return formatDay(order.window_start, lang);
  return t.windowPending;
}

// ---- Tier 0 · the delivery page ---------------------------------------------

function unattendedBody(t, lang, order, token, files, folder = '') {
  // No window, no date, no countdown — not because there is no room for one, but
  // because Tier 0 has a queue span rather than a delivery date, and section 13
  // is unambiguous: "NO named delivery date [...] never a date."
  const facts = [
    [t.fRef, order.ref],
    [t.fOrder, serviceLabel(order.service, lang) || '—'],
    order.product_count ? [t.fProducts, String(order.product_count)] : null,
    [t.fStatus, statusLabel(order.status, lang) || '—'],
  ].filter(Boolean);

  const timing = `${turnaround('unattended', lang)} — ${lower(TIERS.unattended.queue[lang])}`;

  // BEOORDELEN HOORT OOK HIER, sinds 7 augustus 2026. Deze pagina zette
  // `review: false, history: false` hard, uit de tijd dat per-beeld goedkeuren
  // bij de hogere trede hoorde. Nu beslist canReviewOrder() het, net als op het
  // dashboard, zodat dezelfde bestelling niet twee antwoorden geeft afhankelijk
  // van of de klant via de mail of via /account binnenkwam.
  const work = files.length
    ? `<ul class="shots">${files
        .map((f) => shot(t, lang, f, token, {
          review: canReviewOrder(order),
          history: canSeeReviewHistory(order),
        }))
        .join('')}</ul>`
    : `<p class="note">${esc(t.emptyUnattended(timing))}</p>`;

  // De proefvisual heeft geen beoordeelknoppen (zie canReviewOrder), dus hij
  // hoort ook niet aangekondigd te worden met een zin die zegt dat je kunt
  // goedkeuren. Eén lede per soort bestelling, in plaats van één zin die voor
  // de helft van de gevallen niet klopt.
  return `<main>
<div class="head">
  <h1>${esc(t.filesTitle)}</h1>
  <p class="lede">${esc(order.service === SAMPLE_SERVICE ? t.sampleLede : t.filesLede)}</p>
</div>
${factList(facts)}
<p class="note">${esc(t.howUnattended(aftercare('unattended', lang)))}</p>
<section class="work">
  <h2>${esc(t.filesHeading)}</h2>
  ${work}
</section>
${folder}
</main>`;
}

/*
 * ── DE MAP, OP HET SCHERM ──────────────────────────────────────────────────
 *
 * Dit blok is nieuw en het is het belangrijkste op de pagina, want het is het
 * enige dat de klant meeneemt. Tot vandaag stond er in dit portaal geen enkele
 * knop voor het geheel: wie via de gemailde link kwam, haalde zijn levering foto
 * voor foto op — en dat is precies de handeling die er nu niet meer is.
 *
 * De tweede alinea legt uit waarom de foto’s erboven geen knop meer hebben. Die
 * zin is niet vriendelijkheid: zonder uitleg lijkt een galerij zonder
 * downloadknoppen stuk, en dan mailt iemand ons met de vraag waar zijn bestanden
 * zijn. Dat is de mail die deze regel voorkomt.
 *
 * WAAROM ER GEEN AANTAL EN GEEN MAAT BIJ STAAT als er niets te zeggen is: die
 * twee komen uit de assets in de database, en bij een levering van vóór vandaag
 * zijn ze er niet. Een maat verzinnen op basis van wat we niet hebben, is de
 * enige manier om deze knop een leugen te laten worden.
 */
function folderBlock(t, token, summary) {
  if (!summary || !summary.files) return '';
  const meta = summary.bytes
    ? `<p class="folder-meta">${esc(t.folderMeta(summary.files, humanBytes(summary.bytes)))}</p>`
    : '';
  return `<section class="folder">
  <div class="folder-body">
    <h2>${esc(t.folderH)}</h2>
    <p class="folder-n">${esc(t.folderBody)}</p>
    ${meta}
    <p class="note folder-note">${esc(t.folderReview)}</p>
  </div>
  <a class="btn btn-primary" href="/o/${esc(token)}/zip">${esc(t.bDownload)}</a>
</section>`;
}

/*
 * GET /o/<token>/zip — het archief.
 *
 * Dezelfde functie als serveOrderZip in account.js op één ding na: daar is het
 * eigendomsbewijs een sessiecookie en hier een token dat portalGet hierboven al
 * heeft gecontroleerd. De rest — welke bestanden, welke mapnamen, welke grenzen —
 * komt uit delivery.js en uit zip.js, zodat de klant via zijn link exact hetzelfde
 * archief krijgt als via zijn account. Dat is geen netheid: het is het verschil
 * tussen één levering en twee versies van dezelfde levering.
 */
async function serveOrderFolder(context, order, lang) {
  const { env } = context;
  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let files;
  try {
    files = await loadDeliveryFiles(env, order.order_id);
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!files.length) return new Response(null, { status: 404, headers: fileHeaders() });

  const productNames = orderProductNames(order.details_json);
  const entries = deliveryEntries(files, lang, { ref: order.ref, productNames });
  if (!entries.length) return new Response(null, { status: 404, headers: fileHeaders() });

  const total = entries.reduce((n, e) => n + (e.bytes || 0), 0);
  if (entries.length > ZIP_MAX_FILES || total > ZIP_MAX_BYTES) {
    return new Response(null, { status: 413, headers: fileHeaders() });
  }

  /* ── GEEN TOKEN IN EEN TEKSTBESTAND ───────────────────────────────────────
     De eerste versie hiervan zette de portaallink in de leesmij, zodat wie via de
     mail binnenkomt de revisieknop terugvindt. Dat is een verkeerde ruil: die link
     IS de sleutel tot deze bestelling, en een zip is precies het soort bestand dat
     iemand doorstuurt naar zijn bureau of zijn leverancier. Dan reist het
     toegangsbewijs mee in een bestand dat niemand als geheim beschouwt.
     De leesmij verwijst dus naar /portal, waar de klant zelf om een verse link
     vraagt. Eén klik meer, en geen sleutel in een archief. */
  const docs = deliveryDocs({ order: { ...order, lang }, entries, productNames });

  const stream = zipStream(deliveryZipFiles(entries, docs, async (key) => {
    const obj = await env.UPLOADS.get(key);
    return obj ? obj.arrayBuffer() : null;
  }));

  const headers = new Headers(fileHeaders());
  headers.set('content-type', 'application/zip');
  headers.set('content-disposition', zipDisposition(`VISUAILS-${order.ref}.zip`));
  return new Response(stream, { status: 200, headers });
}

// ---- shared pieces ----------------------------------------------------------

function factList(pairs) {
  return `<dl class="facts">${pairs
    .map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('')}</dl>`;
}

/**
 * One delivered image.
 *
 * `review` decides whether the approve / request-revision controls render.
 * `history` decides whether the review STATE renders — the "approved on 12 July"
 * line and the note under a flagged image.
 *
 * They are two flags and not one because a closed order turns the first off and
 * leaves the second on: the client is done deciding, but what they decided is
 * the record of the job and deleting it on close would be a lie by omission.
 * Alleen de proefvisual zet allebei uit — daar is nooit iets te beslissen
 * geweest, dus "GOEDGEKEURD OP 12 JULI" zou een besluit beschrijven dat niemand
 * gevraagd heeft.
 *
 * BEIDE KOMEN UIT pricing.js. Ze stonden hier als `order.tier === 'attended'`,
 * en op 7 augustus 2026 verviel die grens; de aanroepers hierboven vragen het nu
 * aan canReviewOrder() / canSeeReviewHistory(), zodat het dashboard en deze
 * pagina niet twee antwoorden kunnen geven over dezelfde bestelling.
 *
 * Everything else about the two tiers' file lists is identical — same grid, same
 * type, same spacing — which is section 13's point: a different service model,
 * not a worse one.
 */
function shot(t, lang, f, token, { review, history }) {
  const gone = f.expires_at && isExpired(f.expires_at, null);
  const name = f.filename || `#${f.id}`;
  /*
   * DE BESTANDSGROOTTE STOND HIER EN IS WEG. Een maat naast een foto is nuttig als
   * je hem gaat downloaden — "18,4 MB" vertelt je of je dit op 4G moet doen. Nu er
   * per beeld niets meer te downloaden is, beschrijft die maat een handeling die
   * niet bestaat, en bovendien de maat van het MASTERBESTAND terwijl je naar een
   * beoordeelbeeld kijkt. De maat staat nu één keer op de pagina, bij de map, waar
   * hij over de download gaat die er wél is.
   */
  const meta = gone ? t.fileGone : '';   // wordt bij het uitschrijven ontsnapt, zie hieronder

  // alt is empty on purpose: the filename below is the only description that
  // exists, it is already on the page as text, and repeating it would make a
  // screen reader say it twice.
  const preview = gone
    ? ''
    : `<img src="/o/${token}/f/${f.id}" alt="" loading="lazy" decoding="async">`;

  let state = '';
  if (!history) {
    // Tier 0 — see the note above. No state, no note, no exceptions.
  } else if (f.review_state === 'approved') {
    state = `<span class="state approved">${esc(t.stApproved)}${reviewedOn(t, lang, f)}</span>`;
  } else if (f.review_state === 'revision_requested') {
    state = `<span class="state revision">${esc(t.stRevision)}${reviewedOn(t, lang, f)}</span>`;
    if (f.review_note) state += `<p class="said">${esc(f.review_note)}</p>`;
  }

  /*
   * ── DE DOWNLOADKNOP PER BEELD IS WEG ──────────────────────────────────────
   *
   * Lucas, 9 augustus 2026: *"de zichtbare foto’s zijn dus niet downloadbaar in
   * het portaal en puur voor revisies aanvragen."* Er stond hier een knop die
   * één formaat van één beeld gaf, met de naam die het bij ons toevallig had.
   * Wat de klant nodig heeft staat in de map: per product een png, een jpg en
   * een webp. Zie folderBlock() verderop.
   *
   * `${'$'}{download}` stond op DRIE plekken in deze functie — los, in het
   * ongedaan-formulier en in het goedkeurformulier. Alle drie zijn ze weg; wat
   * overblijft is één handeling per tegel, en dat is beoordelen.
   */
  let controls = '';

  // `review` is "mag er een NIEUW besluit vallen". Een besluit dat er al ligt
  // blijft terug te draaien zolang de bestelling überhaupt beoordeeld mag worden
  // (`history`) — anders haalt de laatste goedkeuring, die de bestelling
  // afrondt, ook zijn eigen ongedaan-knop weg. Zie handleFileReview in
  // account.js voor de volledige uitleg; de serverkant weigert hier hetzelfde.
  const decided = f.review_state === 'approved' || f.review_state === 'revision_requested';

  if ((review || (history && decided)) && !gone) {
    if (decided) {
      const label = f.review_state === 'approved' ? t.bUndo : t.bCancel;
      controls = `<form method="post" action="">
  <input type="hidden" name="file" value="${f.id}">
  <div class="acts"><button class="btn btn-quiet" type="submit" name="action" value="undo">${esc(label)}</button></div>
</form>`;
    } else {
      // One form, two submits. formnovalidate on Approve so the required note in
      // the <details> below cannot block it — they are alternatives, not steps.
      controls = `<form method="post" action="">
  <input type="hidden" name="file" value="${f.id}">
  <div class="acts">
    <button class="btn btn-primary" type="submit" name="action" value="approve" formnovalidate>${esc(t.bApprove)}</button>
  </div>
  <details class="ask">
    <summary>${esc(t.askSummary)}</summary>
    <label class="sr-only" for="n${f.id}">${esc(t.askLabel)}</label>
    <textarea id="n${f.id}" name="note" rows="3" maxlength="${NOTE_MAX}" placeholder="${esc(t.askHint)}" required></textarea>
    <div class="acts"><button class="btn btn-ghost" type="submit" name="action" value="revise">${esc(t.bSend)}</button></div>
  </details>
</form>`;
    }
  }

  return `<li class="shot" id="f${f.id}">
  ${preview}
  <span class="name">${esc(name)}</span>
  ${meta ? `<span class="meta">${esc(meta)}</span>` : ''}
  ${state}
  ${controls}
</li>`;
}

function reviewedOn(t, lang, f) {
  if (!f.reviewed_at) return '';
  return ` ${esc(t.on(formatDay(String(f.reviewed_at).slice(0, 10), lang)))}`;
}

function timeline(t, lang, events) {
  // An event this file cannot name is dropped rather than printed. See
  // statusLabel: the alternative is a dated row with an empty subject, which
  // reads as something deliberately withheld from the client.
  const named = events
    .map((e) => ({ ...e, what: statusLabel(e.status, lang) }))
    .filter((e) => e.what);
  if (!named.length) return '';
  const rows = named
    .map(
      (e) => `<li>
  <time>${esc(formatDay(String(e.created_at).slice(0, 10), lang))}</time>
  <span class="what">${esc(e.what)}</span>
  ${e.note ? `<span class="why">${esc(e.note)}</span>` : ''}
</li>`
    )
    .join('');
  return `<section class="work">
  <h2>${esc(t.timelineTitle)}</h2>
  <ul class="log">${rows}</ul>
</section>`;
}

/**
 * The pages with no order behind them.
 *
 * Same typography, same spacing, same care as the portal itself. A page that
 * says "this link has expired" is still the studio talking to a client, and the
 * moment it starts looking like a server error is the moment they assume their
 * photographs are gone.
 */
function plainPage(env, request, kind, status, lang = null) {
  const l = lang || negotiate(request);
  const t = COPY[l];

  const copy = {
    none: [t.noneTitle, t.noneBody, t.noneAsk],
    unknown: [t.unknownTitle, t.unknownBody, t.footAsk],
    expired: [t.expiredTitle, t.expiredBody(PORTAL_TTL_DAYS), t.footAsk],
    replaced: [t.replacedTitle, t.replacedBody, t.footAsk],
    busy: [t.busyTitle, t.busyBody, t.footAsk],
    down: [t.downTitle, t.downBody, t.footAsk],
  }[kind];

  const [title, lede, ask] = copy;

  const body = `${masthead('')}
<main class="plain">
  <h1>${esc(title)}</h1>
  <p class="lede">${esc(lede)}</p>
  ${/* Only `none`. That is the screen that says "open the link from the email
        we sent you", so it is the only one of the six where a reader's next
        move is to go and look in their inbox. On `expired` or `replaced` the
        mail exists and is not the problem, and telling someone to check their
        spam folder for a message they already read is the kind of help that
        makes a page feel automated. */ ''}
  ${kind === 'none' ? `<p class="mailnote">${esc(mailNote(l))}</p>` : ''}
  <p class="note">${esc(ask)} <a href="mailto:${STUDIO_EMAIL}">${STUDIO_EMAIL}</a></p>
</main>`;

  return html(page({ lang: l, title, body }), status);
}

function busy(env, request, retryAfter) {
  const res = plainPage(env, request, 'busy', 429);
  const headers = new Headers(res.headers);
  headers.set('retry-after', String(Math.max(1, retryAfter || 60)));
  return new Response(res.body, { status: 429, headers });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHELL
// ─────────────────────────────────────────────────────────────────────────────

function page({ lang, title, body }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light">
<title>${esc(title)} — VISUAILS</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/portal.css">
<!-- Het tevredenheidsblok, uit één stylesheet die ook VISUAILS Studio inlaadt.
     Zie de kop van public/feedback.css over waarom dat een derde bestand is en
     niet twee keer dezelfde regels. -->
<link rel="stylesheet" href="/feedback.css">
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

/**
 * The response headers, and why each one is load-bearing.
 *
 *   referrer-policy: same-origin   The token is in the URL path. Without a policy,
 *                                  every outbound click hands it to a third
 *                                  party in the Referer header. There are no
 *                                  outbound links on this page today, and this
 *                                  header is what keeps that from mattering the
 *                                  day somebody adds one.
 *   x-robots-tag + <meta robots>   Belt and braces. A portal URL in an index is
 *                                  a portal URL in a search result.
 *   cache-control: no-store        Shared caches, browser history restores and
 *                                  "back" must not resurrect one client’s page.
 *   content-security-policy        The page has no script, so 'none' is a fact
 *                                  rather than an aspiration. font-src is 'self'
 *                                  and not omitted so that the flagged fix in
 *                                  portal.css — self-hosting Archivo — works the
 *                                  day it is applied instead of failing quietly.
 */
function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
      'content-security-policy':
        "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}

function seeOther(location) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, 'cache-control': 'no-store', 'referrer-policy': 'same-origin' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL THINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A column value, in words — or null when this file has no words for it.
 *
 * These used to fall back to the raw column value, and a preview render with a
 * status of `in_human_check` (one word off from the schema's `human_check`) put
 * exactly that snake_case token on the client-facing page, in the timeline,
 * under "What has happened". A studio charging what this one charges does not
 * show a client a database enum.
 *
 * Returning null instead pushes the decision to the caller, which is the only
 * place that knows what to do with an unnameable value: a fact prints an em
 * dash, because a labelled row with nothing in it is still readable, and a
 * timeline row is dropped entirely, because "13 July — " reads as an event
 * being withheld. Neither is a good outcome; both beat leaking the column.
 *
 * The real fix for a missing key is to add it to the map above. This is what
 * happens until someone does.
 */
function statusLabel(status, lang) {
  const s = STATUS[status];
  return s ? s[lang] || s.en : null;
}

/** Lowercase a sentence fragment for mid-sentence use, leaving the rest alone. */
function lower(s) {
  return String(s).charAt(0).toLowerCase() + String(s).slice(1);
}

/** A date, written the way a person reads one. UTC, to match the capacity gate. */
function formatDay(iso, lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'nl' ? 'nl-NL' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  } catch {
    return String(iso);
  }
}

/* formatBytes() stond hier en had één aanroeper: de maat naast elke foto. Die is
   op 9 augustus 2026 vervallen (zie de noot in shot()). De maat die er nog is,
   hoort bij de map en komt uit humanBytes() in delivery.js — één functie voor de
   ene plek waar nog een bestandsgrootte op het scherm staat. Twee functies die
   bytes opmaken, is de tweede die ooit anders gaat afronden dan de eerste. */

/**
 * Language for a page with no order behind it. Order pages never call this —
 * they read orders.lang, which is the client’s actual choice rather than their
 * browser's.
 */
function negotiate(request) {
  const header = request?.headers?.get?.('accept-language') || '';
  return /(^|[,\s])nl\b/i.test(header) ? 'nl' : 'en';
}

/** Fire-and-forget, when the runtime offers it and harmlessly inline when it does not. */
function later(context, promise) {
  if (context && typeof context.waitUntil === 'function') context.waitUntil(promise);
}

function maybeSweep(context, env) {
  if (env?.DB && shouldSweep()) later(context, sweepRateLimits(env));
}

/**
 * Escape for both text and attribute positions.
 *
 * Everything rendered on this page came out of a database that a client can
 * write to — a filename they uploaded, a revision note they typed. There is one
 * escaper and it covers quotes as well as angle brackets, so there is no
 * "attribute version" for anybody to forget.
 */
function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}
