// VISUAILS — the client portal at /o/<token>. Section 10.
//
// Two surfaces come out of this file, and which one a client sees is decided by
// orders.tier, not by anything they type:
//
//   TIER 1 · attended  → "Your order".  The portal proper: the work so far, with
//                        per-image approve / request-revision, the order's
//                        timeline, and the reserved window when one exists.
//   TIER 0 · unattended → "Your files". An authenticated download page. No review
//                        controls, no timeline, no portal framing, and no date.
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

import { TEST_SAMPLE, TIERS, aftercare, turnaround } from '../data/pricing.js';
import { PORTAL_TTL_DAYS, hashToken, isExpired, isWellFormedToken } from './token.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from './ratelimit.js';

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
    filesLede: 'Everything from this order, ready to download.',

    fRef: 'Reference',
    fOrder: 'Order',
    fProducts: 'Products',
    fWindow: 'Your window',
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
    bDownload: 'Download',
    bUndo: 'Undo',
    bCancel: 'Cancel this request',
    bSend: 'Send this',
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
    busyBody: 'Give it a moment and reload the page.',

    downTitle: 'We cannot reach your order right now',
    downBody: 'This is our end, not yours, and it is being looked at. Try again in a few minutes.',
  },

  nl: {
    orderTitle: 'Je bestelling',
    orderLede: 'Alles wat we tot nu toe af hebben. Keur goed wat klopt, en markeer wat niet klopt.',
    filesTitle: 'Je bestanden',
    filesLede: 'Alles uit deze bestelling, klaar om te downloaden.',

    fRef: 'Referentie',
    fOrder: 'Bestelling',
    fProducts: 'Producten',
    fWindow: 'Jouw venster',
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
    bDownload: 'Downloaden',
    bUndo: 'Ongedaan maken',
    bCancel: 'Aanvraag intrekken',
    bSend: 'Versturen',
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
    busyBody: 'Even wachten en de pagina opnieuw laden.',

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
const SERVICE = {
  catalog: { en: 'Catalog', nl: 'Catalog' },
  lifestyle: { en: 'Lifestyle', nl: 'Lifestyle' },
  video: { en: 'Video', nl: 'Video' },
  custom: { en: 'Your Brand Model', nl: 'Jouw merkmodel' },
  'test-sample': { en: TEST_SAMPLE.en.name, nl: TEST_SAMPLE.nl.name },
  // Found missing in the 2026-07-28 site audit (task #263): functions/api/
  // order.js's ORDER_SERVICES has always included 'drop' — the value
  // StartPage.astro's attended-tier door posts (see its `value: 'drop'`) —
  // but this map never named it, so serviceLabel() fell through to its own
  // documented "the real fix is to add it to the map" case and every Full
  // Drop / Drop Pilot order showed no Order type at all on the portal. One
  // label for both: 'drop' covers the fixed 8-product Drop Pilot package and
  // a larger custom drop alike, which pricing.js's own AMOUNT.dropPilot
  // constant already treats as the same tier, not two different services.
  drop: { en: 'Full Drop', nl: 'Volledige drop' },
};

/** orders.status, in words. The column's own comment lists the values. */
const STATUS = {
  received: { en: 'Received', nl: 'Ontvangen' },
  in_production: { en: 'In production', nl: 'In productie' },
  human_check: { en: 'In human check', nl: 'In menselijke controle' },
  delivered: { en: 'Delivered', nl: 'Geleverd' },
  cancelled: { en: 'Cancelled', nl: 'Geannuleerd' },
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /o, /o/<token>, /o/<token>/f/<id> (inline) and /o/<token>/d/<id> (download).
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

  const isFile = route.kind === 'file' || route.kind === 'download';
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

  // The client's own language, from here on. An expired Dutch order gets a Dutch
  // expiry page — the link failing is no reason to switch language on them.
  const lang = order.lang === 'nl' ? 'nl' : 'en';
  if (order.revoked_at) return plainPage(env, request, 'replaced', 410, lang);
  if (isExpired(order.expires_at, order.closed_at)) return plainPage(env, request, 'expired', 410, lang);

  if (isFile) return serveFile(context, order, route);

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

  // Tier 0 has no review controls to post to, and a closed order has none left.
  // Both are silent no-ops rather than errors: nothing on the page they were
  // looking at offered this, so there is nothing to explain — just show it again.
  if (order.tier !== 'attended' || order.closed_at) return seeOther(home);

  let form;
  try {
    form = await request.formData();
  } catch {
    return seeOther(home);
  }

  const action = String(form.get('action') || '');
  const fileId = Number.parseInt(String(form.get('file') || ''), 10);
  if (!Number.isInteger(fileId) || !['approve', 'revise', 'undo'].includes(action)) return seeOther(home);

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
    } else if (action === 'undo') {
      // Reversible on purpose. A mis-tapped Approve on a phone must not strand a
      // client with an image they never meant to sign off, and an approval that
      // cannot be taken back quietly teaches people not to press anything.
      await env.DB.prepare(
        `UPDATE files SET review_state = 'pending', review_note = NULL, reviewed_at = NULL WHERE id = ?1`
      )
        .bind(fileId)
        .run();
    } else {
      const note = String(form.get('note') || '').trim().slice(0, NOTE_MAX);
      if (!note) return seeOther(anchor); // nothing said, nothing changed
      await env.DB.prepare(
        `UPDATE files SET review_state = 'revision_requested', review_note = ?2, reviewed_at = datetime('now') WHERE id = ?1`
      )
        .bind(fileId, note)
        .run();
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
  if (parts.length === 4 && (parts[2] === 'f' || parts[2] === 'd')) {
    const fileId = Number.parseInt(parts[3], 10);
    if (Number.isInteger(fileId)) {
      return { kind: parts[2] === 'f' ? 'file' : 'download', token, fileId };
    }
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
            o.product_count, o.window_start, o.window_end, o.closed_at
       FROM order_tokens t
       JOIN orders o ON o.id = t.order_id
      WHERE t.token_hash = ?1`
  )
    .bind(hash)
    .first();
  return row || null;
}

async function loadFiles(env, orderId) {
  const res = await env.DB.prepare(
    `SELECT id, r2_key, preview_key, filename, bytes, expires_at,
            review_state, review_note, reviewed_at
       FROM files
      WHERE order_id = ?1 AND kind = 'delivery'
      ORDER BY id`
  )
    .bind(orderId)
    .all();
  return res.results || [];
}

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

  // A preview is a smaller rendition of the same photograph, written by the
  // delivery pipeline. When there is none, the full file stands in — correct,
  // just heavy. See the note on previewKey() below.
  const key = route.kind === 'file' ? file.preview_key || file.r2_key : file.r2_key;

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

  headers.set(
    'content-disposition',
    route.kind === 'download'
      ? `attachment; ${dispositionFilename(file.filename || 'file')}`
      : 'inline'
  );

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
    // private, so a shared cache never holds one client's photographs; long, so
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
    files = await loadFiles(env, order.order_id);
    if (attended) events = await loadEvents(env, order.order_id);
  } catch {
    // The order exists and the client is authenticated; a failed second query is
    // not a reason to show them a locked door. Render what we have.
  }

  const body = attended
    ? attendedBody(t, lang, order, token, files, events)
    : unattendedBody(t, lang, order, token, files);

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

function attendedBody(t, lang, order, token, files, events) {
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
    ? `<ul class="shots">${files.map((f) => shot(t, lang, f, token, { review: !readOnly, history: true })).join('')}</ul>`
    : `<p class="note">${esc(t.emptyAttended)}</p>`;

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

function unattendedBody(t, lang, order, token, files) {
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

  const work = files.length
    ? `<ul class="shots">${files
        .map((f) => shot(t, lang, f, token, { review: false, history: false }))
        .join('')}</ul>`
    : `<p class="note">${esc(t.emptyUnattended(timing))}</p>`;

  return `<main>
<div class="head">
  <h1>${esc(t.filesTitle)}</h1>
  <p class="lede">${esc(t.filesLede)}</p>
</div>
${factList(facts)}
<p class="note">${esc(t.howUnattended(aftercare('unattended', lang)))}</p>
<section class="work">
  <h2>${esc(t.filesHeading)}</h2>
  ${work}
</section>
</main>`;
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
 * They are two flags and not one because a closed Tier 1 order turns the first
 * off and leaves the second on: the client is done deciding, but what they
 * decided is the record of the job and deleting it on close would be a lie by
 * omission. Tier 0 turns both off, and that is the real reason this pair exists.
 * Tier 0 has no review step, so a Tier 0 client cannot have approved anything —
 * rendering "APPROVED ON 12 JULY" to them describes a decision they were never
 * asked to make, and "REVISION REQUESTED" describes one they cannot cancel,
 * since the controls are not there. Nothing writes those values on a Tier 0 row
 * today; this makes it impossible for anything to start.
 *
 * Everything else about the two tiers' file lists is identical — same grid, same
 * type, same spacing — which is section 13's point: a different service model,
 * not a worse one.
 */
function shot(t, lang, f, token, { review, history }) {
  const gone = f.expires_at && isExpired(f.expires_at, null);
  const name = f.filename || `#${f.id}`;
  const meta = [f.bytes ? formatBytes(f.bytes) : null, gone ? t.fileGone : null].filter(Boolean).join(' · ');

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

  const download = gone
    ? ''
    : `<a class="btn btn-ghost" href="/o/${token}/d/${f.id}">${esc(t.bDownload)}</a>`;

  let controls = `<div class="acts">${download}</div>`;

  if (review && !gone) {
    if (f.review_state === 'approved' || f.review_state === 'revision_requested') {
      const label = f.review_state === 'approved' ? t.bUndo : t.bCancel;
      controls = `<form method="post" action="">
  <input type="hidden" name="file" value="${f.id}">
  <div class="acts">${download}<button class="btn btn-quiet" type="submit" name="action" value="undo">${esc(label)}</button></div>
</form>`;
    } else {
      // One form, two submits. formnovalidate on Approve so the required note in
      // the <details> below cannot block it — they are alternatives, not steps.
      controls = `<form method="post" action="">
  <input type="hidden" name="file" value="${f.id}">
  <div class="acts">
    <button class="btn btn-primary" type="submit" name="action" value="approve" formnovalidate>${esc(t.bApprove)}</button>
    ${download}
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
 *                                  "back" must not resurrect one client's page.
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
function serviceLabel(service, lang) {
  const s = SERVICE[service];
  return s ? s[lang] || s.en : null;
}

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

function formatBytes(n) {
  const b = Number(n);
  if (!Number.isFinite(b) || b <= 0) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Language for a page with no order behind it. Order pages never call this —
 * they read orders.lang, which is the client's actual choice rather than their
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
