// VISUAILS — /account, the client-facing customer dashboard. Task #257, 2026-07-27.
//
// WHAT THIS ANSWERS
// Lucas, verbatim: "Accounts regelen met een klanten dashboard wanneer ze zijn
// ingelogd waar ze hun vaste brand lock instellingen per style (catalog,
// lifestyle of video) kunnen kiezen en ze hun transacties en bestellingen
// kunnen bekijken/downloaden." Three things, all here: login, an order
// history with downloads, and a per-style brand-lock picker backed by
// customer_style_locks (migrations/0003).
//
// WHY THIS FILE EXISTS RATHER THAN LIVING IN functions/account/
// Same reason src/lib/portal.js and src/lib/admin.js exist outside functions/
// — one implementation, importable from a thin Pages Function AND runnable
// under plain `node` with a stubbed env, which is the only way any of this can
// be tested without wrangler or miniflare. See portal.js's header for the
// fuller argument.
//
// WHY MAGIC-LINK AND NOT A PASSWORD (compare admin.js)
// admin.js's header explains the opposite choice for the opposite population:
// one studio owner, one login, a password costs nothing extra for a single
// person who already trusts the device. Customers are dozens of brands who
// placed an order and never chose a VISUAILS password — there is no password
// to check, because there was never a signup form to set one on. A magic link
// reuses the one credential every customer already has: the email address the
// order was placed under. There is also, deliberately, no public "create an
// account" endpoint here, for the same reason admin.js has no signup route —
// an account is not created by visiting this file, it already exists the
// moment upsertCustomer() in functions/api/order.js runs on a first order.
//
// WHY THIS PAGE HAS A COOKIE (and why that changes the CSRF answer)
// portal.js has no cookie and, correctly, no CSRF token — the URL token IS the
// credential there. This file DOES set a cookie once a magic link is redeemed,
// which is an AMBIENT credential exactly like admin.js's session cookie, so
// the same defence applies: SameSite=Strict plus an Origin check on every
// state-changing POST once a session exists. /account/login itself is exempt
// from the Origin check — it requires no session to call, so there is no
// ambient credential for a forged request to ride on; the worst a forged POST
// there can do is make this endpoint send a login email to an address the
// attacker could have entered directly anyway.
//
// SAVED DETAILS (August 2026) — WHY THE ACCOUNT ROW IS THE SAVED RECORD
// Lucas, verbatim: "waarna hij zijn gegevens kan opslaan voor een volgende
// bestelling en veel stappen over kan slaan." The seven fields an order asks
// for that do not change between orders are name, brand, email, phone,
// website, VAT number and the background the brand orders against. Six of
// those are already columns on `customers` — upsertCustomer() in
// functions/api/order.js has written them since Phase 1 — so saving details
// adds three columns (migrations/0004) rather than a second table that would
// have to agree with this one about a brand's phone number.
//
// customers.details_saved_at is the whole hinge, and it is not decoration:
// having a phone number on file because you once ordered is not the same as
// asking us to keep it. Only an explicit save sets it, only a customer who set
// it gets /start's brief step collapsed, and only a customer who has NOT set it
// is offered the checkbox at the end of an order. That is what makes this
// opt-in rather than a default we turned on for everyone who ever ordered.
//
// THE ACCOUNT EMAIL IS NOT EDITABLE HERE, and that is a security decision, not
// an omission. customers.email is UNIQUE and it is the ONLY credential this
// file authenticates against — sendLoginLink() looks a customer up by it.
// Accepting a new email on this endpoint would let anyone holding one session
// point it at another brand's address (or take an address a future customer
// will order under) and then mail themselves a login link for it. The address
// is shown, it is returned by /account/me so the order form can fill it in,
// and it changes only where it always has: by placing an order under it.
//
// TWO TOKEN TABLES, ON PURPOSE
// account_tokens is the emailed link: minutes-scale TTL, single-use, dead the
// moment it is clicked. account_sessions is the resulting logged-in cookie:
// weeks-scale TTL, refreshed on every authenticated request. Collapsing them
// into one table would mean either the emailed link stays valid for weeks
// (a link sitting in an inbox becomes a standing credential) or the login
// cookie expires in minutes (logged out mid-session for no reason the
// customer can see). schema.sql's header for this section makes the same
// point; this file is where it turns into code.

import { hashToken, isWellFormedToken, mintToken, isExpired } from './token.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from './ratelimit.js';
import { sendMail } from './mail.js';
import { PER_PRODUCT } from '../data/pricing.js';
import { RECOMMENDED as BACKGROUNDS, CUSTOM_ID as BG_CUSTOM } from '../data/backgrounds.js';

/** account_tokens.expires_at — long enough to find the email on a phone, short enough that a stale inbox hit is dead. */
const LOGIN_TOKEN_TTL_MINUTES = 30;

/** account_sessions.expires_at — refreshed on every authenticated request; see the header. */
const ACCOUNT_SESSION_TTL_DAYS = 30;

const SESSION_COOKIE = 'vis_account';

/** Sending an email is rarer and more expensive to abuse than reading a page. */
const LOGIN_LIMIT = 10;
/** A token click, same shape-checked-first reasoning as portal.js's PAGE_LIMIT. */
const VERIFY_LIMIT = 20;
/** The dashboard itself. */
const PAGE_LIMIT = 60;
/** File reads get their own, larger budget — one dashboard view can trigger several. */
const FILE_LIMIT = 300;
/** Logout, the lock form, and per-file review actions. */
const POST_LIMIT = 20;

/** Longest revision note this file accepts — same cap as portal.js's NOTE_MAX, so a client typing the same note in either place never hits a different wall. */
const NOTE_MAX = 2000;

/**
 * Which styles a brand can lock a custom model to. Read off PER_PRODUCT rather
 * than typed again — those ids ('catalog' | 'lifestyle' | 'video') are exactly
 * what customer_style_locks.style is documented to hold (migrations/0003).
 * Typing a second list here would be a second place for the two to drift.
 */
const STYLES = PER_PRODUCT.en.map((p) => p.id);

/**
 * Every value customers.default_background may hold, read off backgrounds.js
 * for the same reason STYLES is read off pricing.js: a second list typed here
 * is a second thing to keep in step. The empty string is the fifth answer and
 * the default one — "no standing preference, ask me per order" — which is why
 * saveDetails() treats anything not in here as that rather than as an error.
 */
const BG_IDS = [...BACKGROUNDS.map((b) => b.id), BG_CUSTOM];

/**
 * Longest saved detail this file will store. Generous for a VAT number and a
 * shop URL, short enough that the endpoint cannot be used as free storage —
 * same reasoning as NOTE_MAX above, different number because these are single
 * lines and that is a paragraph.
 */
const DETAIL_MAX = 200;

// ─────────────────────────────────────────────────────────────────────────────
// COPY — bilingual, like every client-facing surface. See portal.js's own note:
// which language renders is read from data (the customer's most recent order),
// never guessed from the page itself, except on the pages reached before any
// order is known — login and a bad link — which fall back to Accept-Language,
// exactly as portal.js's plainPage() does for the same reason.
// ─────────────────────────────────────────────────────────────────────────────

const COPY = {
  en: {
    loginTitle: 'Sign in',
    loginLede: 'Enter the email you order under. We send a link — no password to remember.',
    loginEmailLabel: 'Email',
    loginSubmit: 'Send my link',
    loginTooMany: 'Too many attempts. Wait a minute and try again.',

    checkTitle: 'Check your email',
    checkBody: 'If that address has ordered with us before, a sign-in link is on its way. It works once, and for 30 minutes.',

    badLinkTitle: 'This link does not work',
    badLinkBody: 'It may have expired, already been used, or been mistyped. Request a new one below.',

    // Sits under the wordmark in the sidebar (shellBody) — dashTitle/dashLede
    // from the single-page dashboard are gone; Overview has its own welcome
    // copy now (ovWelcome/ovLede below) that says more than a static subtitle
    // could.
    dashSub: 'Studio Dashboard',

    // Doubles as the Orders sidebar nav label — see shellBody — so there is
    // one word for "Orders" in this file, not two that could drift apart.
    ordersHeading: 'Orders',
    emptyOrders: 'Nothing here yet — your first order will show up the moment it comes in.',
    fRef: 'Reference',
    fService: 'Service',
    fPlaced: 'Placed',
    fWindow: 'Window',
    fProducts: 'Products',
    windowPending: 'Being scheduled',

    filesHeading: 'Files',
    emptyFiles: 'Not delivered yet.',
    bView: 'View',
    bDownload: 'Download',

    // lockHeading ('Brand lock') from task #257 is gone — navBrandKit below
    // is now both the nav label AND the Brand kit page's <h1>. Lucas's own
    // brief for this rebuild named the section "Brand kit"; keeping a second,
    // older heading that said "Brand lock" one line down would have the page
    // disagree with its own nav item about what it is called.
    // Brand kit now has two panels — details, then this — so the lock half
    // needs a heading of its own. NOT "Brand kit" again (that is the page's
    // h1 and its nav label) and deliberately not the old "Brand lock" either,
    // for the reason the note below still gives. It names what the panel
    // does.
    lockH: 'Model per style',
    lockLede: 'Pick the custom model each style should always use. Leave a style unset and we ask per order, as usual.',
    lockNoModels: 'No custom models on your account yet — nothing to lock to. Ask us to set one up.',
    lockUnset: '— not locked —',
    lockSave: 'Save',

    // Saved order details, August 2026. Lives on Brand kit rather than on its
    // own nav item: these ARE the brand's standing answers, next to the
    // standing model choice, and a sixth sidebar entry for six text fields
    // would be a section a customer visits once.
    detH: 'Your details',
    detLede: 'Saved once, filled in on every order. Change anything here and the next order picks it up.',
    detName: 'Your name',
    detBrand: 'Brand or shop name',
    detEmail: 'Email',
    // Says WHY the field above it is not editable, in the customer's terms.
    // See the file header: this address is the login credential.
    detEmailNote: 'This is what you sign in with, so it changes only by ordering under a new address. Email us and we will move it.',
    detPhone: 'Phone or WhatsApp',
    detWebsite: 'Website or shop link',
    detVat: 'VAT number',
    detBg: 'Default background',
    detBgUnset: '— ask me per order —',
    detBgHex: 'Your own colour (hex)',
    detBgHexHint: 'Only used when “Your own colour” is picked above.',
    detSave: 'Save details',
    detSaved: 'Saved. Your next order starts filled in.',
    detOptional: 'optional',

    navOverview: 'Overview',
    navNewRequest: 'New request',
    navBrandKit: 'Brand kit',
    navPlan: 'Plan & billing',

    // Overview — the landing section. Counts are real, all-time totals, not
    // a monthly figure: there is no billing cycle to anchor "this month" to
    // (see planLede below), and a fabricated period reads as a promise this
    // site cannot keep.
    ovWelcome: 'Welcome back',
    ovLede: 'A quick look at your orders and files.',
    ovInProduction: 'In production',
    ovHumanCheck: 'In human check',
    ovDelivered: 'Delivered',
    ovTotal: 'Orders total',
    ovRecent: 'Recent activity',
    ovViewAll: 'View all orders',
    ovNewCta: 'New request',

    ordersLede: 'Every order, start to finish.',

    // Per-file review — same action, same copy, as the emailed order-status
    // link (portal.js's shot()). Reusing the exact wording rather than
    // rephrasing it: a client who has clicked "Approve" from an email should
    // not have to learn a second verb for the same action here.
    bApprove: 'Approve',
    bUndo: 'Undo',
    bCancel: 'Cancel this request',
    bSend: 'Send this',
    askSummary: 'Something is not right',
    askLabel: 'What should change?',
    askHint: 'In your own words. The more specific, the faster we get it right.',
    stApproved: 'Approved',
    stRevision: 'Revision requested',

    planHeading: 'Plan & billing',
    planLede: 'You are billed per order — there is no subscription to manage yet.',
    planAccountLabel: 'Account',
    planEmailLabel: 'Email',
    planBrandLabel: 'Brand',
    planNote: 'Questions about pricing or an invoice? Reply to any order email, or reach us at hello@visuails.com.',

    signOut: 'Sign out',
    footAsk: 'Anything else,',
    dbDown: 'We cannot reach your account right now. This is our end, not yours — try again in a few minutes.',
    notFound: 'Not found.',
  },

  nl: {
    loginTitle: 'Inloggen',
    loginLede: 'Vul het e-mailadres in waaronder je bestelt. We sturen een link — geen wachtwoord nodig.',
    loginEmailLabel: 'E-mail',
    loginSubmit: 'Stuur mijn link',
    loginTooMany: 'Te veel pogingen. Even wachten en opnieuw proberen.',

    checkTitle: 'Check je e-mail',
    checkBody: 'Als dat adres al eerder bij ons besteld heeft, is er een inloglink onderweg. Hij werkt één keer, en 30 minuten lang.',

    badLinkTitle: 'Deze link werkt niet',
    badLinkBody: 'Mogelijk is hij verlopen, al gebruikt, of verkeerd overgetypt. Vraag hieronder een nieuwe aan.',

    dashSub: 'Studio-dashboard',

    ordersHeading: 'Bestellingen',
    emptyOrders: 'Hier staat nog niets — je eerste bestelling verschijnt zodra hij binnenkomt.',
    fRef: 'Referentie',
    fService: 'Dienst',
    fPlaced: 'Geplaatst',
    fWindow: 'Venster',
    fProducts: 'Producten',
    windowPending: 'Wordt ingepland',

    filesHeading: 'Bestanden',
    emptyFiles: 'Nog niet geleverd.',
    bView: 'Bekijken',
    bDownload: 'Downloaden',

    lockH: 'Model per style',
    lockLede: 'Kies het merkmodel dat elke style altijd moet gebruiken. Laat een style leeg en we vragen het per bestelling, zoals gebruikelijk.',
    lockNoModels: 'Nog geen merkmodellen op je account — niets om aan vast te zetten. Vraag ons er een in te stellen.',
    lockUnset: '— niet vastgezet —',
    lockSave: 'Opslaan',

    // Zie de Engelse tak voor waarom dit op Brand kit staat en niet in een
    // eigen menu-item.
    detH: 'Je gegevens',
    detLede: 'Eén keer opslaan, daarna bij elke bestelling ingevuld. Pas hier iets aan en de volgende bestelling neemt het over.',
    detName: 'Je naam',
    detBrand: 'Merk- of winkelnaam',
    detEmail: 'E-mail',
    detEmailNote: 'Hiermee log je in, dus dit verandert alleen door onder een nieuw adres te bestellen. Mail ons en we zetten het om.',
    detPhone: 'Telefoon of WhatsApp',
    detWebsite: 'Website of winkellink',
    detVat: 'Btw-nummer',
    detBg: 'Standaardachtergrond',
    detBgUnset: '— vraag het per bestelling —',
    detBgHex: 'Je eigen kleur (hex)',
    detBgHexHint: 'Wordt alleen gebruikt als hierboven “Je eigen kleur” is gekozen.',
    detSave: 'Gegevens opslaan',
    detSaved: 'Opgeslagen. Je volgende bestelling begint ingevuld.',
    detOptional: 'optioneel',

    navOverview: 'Overzicht',
    navNewRequest: 'Nieuwe aanvraag',
    navBrandKit: 'Brand kit',
    navPlan: 'Abonnement & facturering',

    ovWelcome: 'Welkom terug',
    ovLede: 'Een snel overzicht van je bestellingen en bestanden.',
    ovInProduction: 'In productie',
    ovHumanCheck: 'In menselijke controle',
    ovDelivered: 'Geleverd',
    ovTotal: 'Bestellingen totaal',
    ovRecent: 'Recente activiteit',
    ovViewAll: 'Alle bestellingen bekijken',
    ovNewCta: 'Nieuwe aanvraag',

    ordersLede: 'Elke bestelling, van start tot levering.',

    bApprove: 'Goedkeuren',
    bUndo: 'Ongedaan maken',
    bCancel: 'Aanvraag intrekken',
    bSend: 'Versturen',
    askSummary: 'Er klopt iets niet',
    askLabel: 'Wat moet er anders?',
    askHint: 'In je eigen woorden. Hoe specifieker, hoe sneller het klopt.',
    stApproved: 'Goedgekeurd',
    stRevision: 'Revisie aangevraagd',

    planHeading: 'Abonnement & facturering',
    planLede: 'Je betaalt per bestelling — er is nog geen abonnement om te beheren.',
    planAccountLabel: 'Account',
    planEmailLabel: 'E-mail',
    planBrandLabel: 'Merk',
    planNote: 'Vragen over prijzen of een factuur? Reageer op een bestel-e-mail, of mail hello@visuails.com.',

    signOut: 'Uitloggen',
    footAsk: 'Verder iets,',
    dbDown: 'We kunnen je account nu niet bereiken. Dit ligt aan ons, niet aan jou — probeer het over een paar minuten opnieuw.',
    notFound: 'Niet gevonden.',
  },
};

/** Display names for orders.service — mirrors portal.js's SERVICE, duplicated for the same reason: this needs four words, not ui.js's whole dictionary. */
const SERVICE = {
  catalog: { en: 'Catalog', nl: 'Catalog' },
  lifestyle: { en: 'Lifestyle', nl: 'Lifestyle' },
  video: { en: 'Video', nl: 'Video' },
  custom: { en: 'Your Brand Model', nl: 'Jouw merkmodel' },
  'test-sample': { en: 'Test sample', nl: 'Proefvisual' },
  // Same gap portal.js's own SERVICE map had — found and fixed there in the
  // same audit pass. This copy had it too: 'drop' (StartPage.astro's
  // attended-tier door, ORDER_SERVICES in order.js) was never named, so
  // every Full Drop / Drop Pilot order showed no service label in the
  // dashboard's order list either.
  drop: { en: 'Full Drop', nl: 'Volledige drop' },
};

/** orders.status, in words. Mirrors portal.js's/admin.js's own copies. */
const STATUS = {
  received: { en: 'Received', nl: 'Ontvangen' },
  in_production: { en: 'In production', nl: 'In productie' },
  human_check: { en: 'In human check', nl: 'In menselijke controle' },
  delivered: { en: 'Delivered', nl: 'Geleverd' },
  cancelled: { en: 'Cancelled', nl: 'Geannuleerd' },
};

const STUDIO_EMAIL = 'hello@visuails.com';

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

export async function accountGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/account';

  // Routed before the generic DB-down branch below, on purpose: that branch
  // returns an HTML error page, and /account/me's one caller is a fetch()
  // expecting JSON (see handleMe()) — handing it an HTML body either way
  // would be a caller-visible content-type lie, not a graceful degradation.
  if (path === '/account/me') return handleMe(context);

  if (!env?.DB) {
    const lang = negotiate(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang]) }), 503);
  }

  const verifyMatch = path.match(/^\/account\/verify\/([^/]+)$/);
  if (verifyMatch) {
    let token;
    try {
      token = decodeURIComponent(verifyMatch[1]);
    } catch {
      token = verifyMatch[1];
    }
    return handleVerify(context, token);
  }

  const fileMatch = path.match(/^\/account\/files\/(\d+)\/(f|d)$/);
  if (fileMatch) {
    const gate = await checkRate(env, { ip: clientIp(request), action: 'account-file', limit: FILE_LIMIT });
    if (!gate.allowed) return new Response(null, { status: 429, headers: { ...fileHeaders(), 'retry-after': String(Math.max(1, gate.retryAfter || 60)) } });
    const customer = await currentCustomer(env, request);
    if (!customer) return seeOther('/account/login');
    return serveAccountFile(context, customer, Number(fileMatch[1]), fileMatch[2]);
  }

  if (path === '/account/login') {
    const customer = await currentCustomer(env, request);
    if (customer) return seeOther('/account');
    const lang = negotiate(request);
    return html(page({ lang, title: COPY[lang].loginTitle, body: loginBody(COPY[lang], lang) }));
  }

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-page', limit: PAGE_LIMIT });
  if (!gate.allowed) {
    const lang = negotiate(request);
    return new Response(null, { status: 429, headers: { 'retry-after': String(Math.max(1, gate.retryAfter || 60)), 'content-type': 'text/plain' } });
  }

  maybeSweep(context, env);

  const customer = await currentCustomer(env, request);
  if (!customer) return seeOther('/account/login');

  if (path === '/account') return sectionGet(context, customer, 'overview');
  if (path === '/account/orders') return sectionGet(context, customer, 'orders');
  if (path === '/account/brand-kit') return sectionGet(context, customer, 'brand');
  if (path === '/account/plan') return sectionGet(context, customer, 'plan');

  const lang = negotiate(request);
  return html(page({ lang, title: COPY[lang].notFound, body: errorBody(COPY[lang], COPY[lang].notFound) }), 404);
}

export async function accountPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  // ONE GUARD SEQUENCE, TWO REPLY SHAPES. /account/details (August 2026) is
  // posted from two places: the dashboard's own <form>, which is a browser
  // navigation and wants HTML plus a 303, and /start's fetch, which wants JSON.
  // The temptation was to dispatch the JSON route early with its own copy of
  // the checks below — which is exactly how a second, subtly weaker auth path
  // gets built. So the checks stay here, in one place, run in one order, for
  // every caller; only the FORM of the refusal is negotiated, and only from the
  // Accept header the browser or the fetch already sends. A caller cannot talk
  // its way past a check by asking for JSON, it can only be refused in JSON.
  const asJson = wantsJson(request);

  if (!env?.DB) {
    const lang = negotiate(request);
    if (asJson) return json({ error: 'unavailable' }, 503);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang]) }), 503);
  }

  // No Origin check here — see the file header. Sending a login email requires
  // no ambient credential, so there is nothing for a forged cross-site POST to
  // ride on.
  if (path === '/account/login') return handleLoginPost(context);

  const customer = await currentCustomer(env, request);
  // 401, not a redirect, for the fetch caller — for the same reason handleMe()
  // gives: a fetch that follows a 303 to /account/login gets a login PAGE's
  // markup and a 200, which is precisely the empty-but-successful shape a
  // caller could mistake for "signed in with nothing saved".
  if (!customer) return asJson ? json({ error: 'auth' }, 401) : seeOther('/account/login');
  if (!originIsSelf(request, env)) {
    const lang = negotiate(request);
    if (asJson) return json({ error: 'origin' }, 403);
    // Task #271e, 2026-07-29: appended the same raw Origin/host detail
    // admin.js now prints. This page is customer-facing, unlike admin's, but
    // the two values are just the requesting browser's own header and this
    // site's own hostname — nothing about another customer or the account
    // itself — so showing them here is what makes a real mismatch (as
    // opposed to a forged request, which this check still blocks) fixable by
    // whoever hits it instead of a dead end.
    const detail = originMismatchDetail(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang], (lang === 'nl'
      ? 'De herkomst van dit verzoek klopte niet. Probeer het opnieuw vanaf je accountpagina.'
      : 'Request origin did not match. Try again from your account page.') + ' ' + detail) }), 403);
  }

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-post', limit: POST_LIMIT });
  if (!gate.allowed) {
    if (asJson) return json({ error: 'rate' }, 429);
    return new Response(null, { status: 429, headers: { 'retry-after': String(Math.max(1, gate.retryAfter || 60)), 'content-type': 'text/plain' } });
  }

  if (path === '/account/logout') return handleLogout(context, customer);
  if (path === '/account/lock') return handleLockUpdate(context, customer);
  if (path === '/account/review') return handleFileReview(context, customer);
  if (path === '/account/details') return handleDetails(context, customer, asJson);

  const lang = negotiate(request);
  if (asJson) return json({ error: 'not-found' }, 404);
  return html(page({ lang, title: COPY[lang].notFound, body: errorBody(COPY[lang], COPY[lang].notFound) }), 404);
}

/**
 * Does this caller want JSON back? Read from Accept and nothing else.
 *
 * NOT from a `mode=json` form field, which is how functions/api/order.js makes
 * the same decision — and the difference is worth writing down rather than
 * looking like an inconsistency. That form has a no-JS path: the same <form>
 * element is posted by the browser AND by a fetch, so the distinction has to
 * travel in the body, where the fetch can add it to a FormData copy. Here the
 * two callers are different code — a dashboard <form> and pipeline.js's fetch
 * — and the Accept header is set by whichever one it is without either having
 * to say so. It is also read BEFORE the body, which is what lets the guards
 * above negotiate their replies without consuming a stream a handler still
 * needs.
 */
function wantsJson(request) {
  return /application\/json/i.test(request.headers.get('accept') || '');
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN / VERIFY / LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

async function handleLoginPost({ request, env }) {
  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-login', limit: LOGIN_LIMIT });
  const form = await request.formData().catch(() => null);
  const lang = form && String(form.get('lang') || '') === 'nl' ? 'nl' : negotiate(request);
  const t = COPY[lang];

  if (!gate.allowed) {
    return html(page({ lang, title: t.loginTitle, body: loginBody(t, lang, t.loginTooMany) }), 429);
  }

  const email = String(form?.get('email') || '').trim().toLowerCase();

  // Same response whether or not the address matches a customer — see the file
  // header on account enumeration. A Resend failure is swallowed for the same
  // reason: nothing about the reply may differ based on what happened server-side.
  if (isEmail(email)) {
    await sendLoginLink(env, request, email, lang).catch(() => {});
  }

  return html(page({ lang, title: t.checkTitle, body: checkEmailBody(t) }));
}

async function sendLoginLink(env, request, email, lang) {
  const customer = await env.DB.prepare('SELECT id FROM customers WHERE email = ?1').bind(email).first();
  if (!customer) return;

  const { token, tokenHash } = await mintCredential();
  await env.DB.prepare(
    'INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
  ).bind(customer.id, tokenHash, loginTokenExpiry()).run();

  const link = `${requestOrigin(request)}/account/verify/${token}`;
  await sendMail(env, {
    to: email,
    subject: lang === 'nl' ? 'Je inloglink voor VISUAILS' : 'Your VISUAILS sign-in link',
    html: magicLinkEmail(lang, link),
  });
}

// env.DB is guaranteed here — accountGet checks it before this is ever reached,
// same single-entry-guard pattern as admin.js's adminGet/handleLogin.
async function handleVerify(context, token) {
  const { request, env } = context;
  const lang = negotiate(request);
  const t = COPY[lang];

  if (!isWellFormedToken(token)) return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t) }), 404);

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-verify', limit: VERIFY_LIMIT });
  if (!gate.allowed) return new Response(null, { status: 429, headers: { 'retry-after': String(Math.max(1, gate.retryAfter || 60)), 'content-type': 'text/plain' } });

  const hash = await hashToken(token);
  let row;
  try {
    row = await env.DB.prepare(
      'SELECT id, customer_id, expires_at, used_at FROM account_tokens WHERE token_hash = ?1'
    ).bind(hash).first();
  } catch {
    return html(page({ lang, title: 'VISUAILS', body: errorBody(t) }), 503);
  }

  if (!row || row.used_at || isExpired(row.expires_at, null)) {
    return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t) }), 410);
  }

  const { token: sessionToken, tokenHash: sessionHash } = await mintCredential();
  await env.DB.batch([
    env.DB.prepare("UPDATE account_tokens SET used_at = datetime('now') WHERE id = ?1").bind(row.id),
    env.DB.prepare(
      'INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
    ).bind(row.customer_id, sessionHash, accountSessionExpiry()),
    // Clicking an emailed link IS proving control of the inbox — the same proof
    // a dedicated verification email would establish, so this piggybacks on it
    // rather than sending a second message nobody asked for.
    env.DB.prepare("UPDATE customers SET email_verified = 1 WHERE id = ?1").bind(row.customer_id),
  ]);

  return seeOther('/account', [setSessionCookie(sessionToken)]);
}

async function handleLogout({ env }, customer) {
  await env.DB.prepare('DELETE FROM account_sessions WHERE id = ?1').bind(customer.session_id).run().catch(() => {});
  return seeOther('/account/login', [clearSessionCookie()]);
}

/** A fresh { token, tokenHash } pair — used for both the emailed link and the session cookie; see the file header on why they are two tables. */
async function mintCredential() {
  const token = mintToken();
  return { token, tokenHash: await hashToken(token) };
}

function loginTokenExpiry(fromDate = new Date()) {
  return new Date(fromDate.getTime() + LOGIN_TOKEN_TTL_MINUTES * 60000).toISOString();
}

function accountSessionExpiry(fromDate = new Date()) {
  return new Date(fromDate.getTime() + ACCOUNT_SESSION_TTL_DAYS * 86400000).toISOString();
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One data load, four possible pages — task #259's second follow-up: Lucas
 * asked for the single-scroll dashboard to become a real sidebar app (a
 * "Studio Dashboard" shape, his own reference) with Overview / Orders /
 * Brand kit / Plan & billing as their own sections. All four need overlapping
 * slices of the same four queries (orders feed both Overview's counts and the
 * Orders list; files feed both), so this stays ONE Promise.all — same
 * reasoning dashboardGet always had — and only the render step branches on
 * `section`. Explicitly NOT a credits/subscription system: Lucas chose "the
 * shape, not the plan" when asked, so Plan & billing renders real account
 * facts and a per-order-billing note, never a fabricated quota.
 */
async function sectionGet(context, customer, section) {
  const { env, request } = context;
  let orders, files, models, locks, details;
  try {
    // `details` joins the same Promise.all rather than being fetched inside
    // brandKitBody(): one round of queries, four possible pages, is what this
    // function has always been — and a query issued from a render function is
    // one a future section reordering can accidentally run twice.
    [orders, files, models, locks, details] = await Promise.all([
      loadOrders(env, customer.customer_id),
      loadCustomerFiles(env, customer.customer_id),
      loadCustomModels(env, customer.customer_id),
      loadStyleLocks(env, customer.customer_id),
      detailsRow(env, customer.customer_id),
    ]);
  } catch {
    const lang = negotiate(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang]) }), 503);
  }

  // The customer's own most recent order decides the language, same as
  // portal.js reads orders.lang rather than guessing — a brand who ordered in
  // Dutch should not land on an English dashboard. A brand new to the account
  // system with zero orders yet (should not happen — accounts are never
  // created except by ordering — but nothing here assumes it) falls back to
  // Accept-Language, same as the pre-login pages.
  const lang = orders[0]?.lang === 'nl' ? 'nl' : orders[0]?.lang === 'en' ? 'en' : negotiate(request);
  const t = COPY[lang];

  const filesByOrder = groupFilesByOrder(files);
  const lockByStyle = Object.fromEntries(locks.map((l) => [l.style, l.custom_model_id]));

  let inner, title;
  if (section === 'orders') {
    inner = ordersBody(t, lang, orders, filesByOrder);
    title = t.ordersHeading;
  } else if (section === 'brand') {
    // ?saved=1 is set by handleDetails' own redirect and by nothing else. It
    // decides one sentence of confirmation and can decide nothing else — it is
    // a query string, i.e. anyone's to type.
    let justSaved = false;
    try { justSaved = new URL(request.url).searchParams.get('saved') === '1'; } catch { /* keep false */ }
    inner = brandKitBody(t, lang, models, lockByStyle, details, justSaved);
    title = t.navBrandKit;
  } else if (section === 'plan') {
    inner = planBody(t, customer);
    title = t.planHeading;
  } else {
    inner = overviewBody(t, lang, customer, orders, filesByOrder);
    title = t.navOverview;
  }

  // Every section gets the nonce and the style block, not just Brand kit: the
  // CSP header and the <style> it admits are set in two different functions,
  // and a per-section conditional is the shape where the two drift and the
  // panel silently loses its rules. One extra empty-ish <style> on three pages
  // is cheaper than that class of bug.
  const nonce = makeNonce();
  const body = shellBody(t, lang, customer, section, inner);
  return html(page({ lang, title, body, full: true, nonce }), 200, [], nonce);
}

async function currentCustomer(env, request) {
  const token = readSessionCookie(request);
  if (!token) return null;
  const hash = await hashToken(token);
  let row;
  try {
    row = await env.DB.prepare(
      `SELECT s.id AS session_id, s.expires_at, c.id AS customer_id, c.email, c.name, c.brand
         FROM account_sessions s JOIN customers c ON c.id = s.customer_id
        WHERE s.token_hash = ?1`
    ).bind(hash).first();
  } catch {
    return null;
  }
  if (!row) return null;
  if (isExpired(row.expires_at, null)) return null;

  // Refreshed on use — see the file header on why account_sessions is a
  // separate, sliding-expiry table from the single-use account_tokens. A
  // customer who opens the dashboard every week never gets signed out; one
  // who does not is signed out ACCOUNT_SESSION_TTL_DAYS after their last visit,
  // not after their first. Best-effort: a failed write here must not cost the
  // request a 500, same reasoning as admin.js's touch of admin_sessions.
  env.DB.prepare('UPDATE account_sessions SET last_used_at = datetime(\'now\'), expires_at = ?2 WHERE id = ?1')
    .bind(row.session_id, accountSessionExpiry()).run().catch(() => {});

  return row;
}

/**
 * GET /account/me — task #271e, 2026-07-29. JSON, not a page: the one caller
 * is /start's client-side prefill fetch (pipeline.js's bindPrefill()), not a
 * browser navigation. See that file's header for why this has to be a fetch
 * at all — /start is a static build, not a Pages Function, so there is no
 * per-request point on that page to read a cookie from.
 *
 * No Origin check: a GET changes nothing, same reasoning as every other GET
 * in this file and in admin.js. 401 with an empty body for "not signed in" —
 * not a redirect, and not currentCustomer()'s usual seeOther('/account/login')
 * — because the caller is a fetch(), and redirecting a fetch to an HTML login
 * page would hand pipeline.js a login page's markup as if it were JSON.
 *
 * customers.email/name/brand/phone/website/vat_number map directly onto
 * StartPage.astro step 3's six input[name] values (see pipeline.js's DOM
 * CONTRACT) — vat_number renamed to vat here so the response can be applied
 * with zero translation on the client, keyed by the same `name` the form
 * already uses. billing_address/country are real columns on this table
 * (schema.sql) but step 3 has no address field to fill, so they are not
 * queried — no benign extra data returned means no code says "why is that
 * column here" later.
 *
 * AUGUST 2026 — TWO MORE CALLERS AND THREE MORE KEYS. This is now also what
 * Layout.astro's chrome asks to find out whether the visitor is signed in (the
 * site is a static build; there is no other way for a page to know), and what
 * /start asks before deciding whether to collapse its brief step. It answers:
 *
 *   { email, name, brand, phone, website, vat,     — unchanged, #271e
 *     background, backgroundHex,                    — the saved default, or ''
 *     saved: true|false,                            — details_saved_at IS NOT NULL
 *     label }                                       — brand || name || email
 *
 * `label` is computed here rather than in three clients, because shellBody()
 * above already picks the same fallback chain for the sidebar and the nav must
 * not disagree with the dashboard about what this account is called.
 *
 * `saved` is a real boolean and not "are the fields non-empty", and the whole
 * opt-in rests on that: see the file header. A signed-in customer who never
 * saved anything gets saved:false with their fields populated — /start prefills
 * exactly as it did before and collapses nothing.
 *
 * STILL 401 ON NO SESSION, and now that the chrome reads this on every page,
 * that matters more than it did: the one thing this endpoint must never do is
 * answer 200 with an empty object, because a caller cannot tell that apart from
 * "signed in, nothing on file" without reading the status — and the difference
 * is whether a stranger's browser draws a signed-in nav bar.
 */
async function handleMe({ request, env }) {
  if (!env?.DB) return json({}, 503); // currentCustomer() would throw on env.DB.prepare — fail as JSON, not a 500

  // Same bucket, same limit, as every other GET in this file (see accountGet's
  // shared gate below) — this route sits outside that shared code only
  // because it must answer JSON even when env.DB is down (see accountGet's
  // routing comment), not because it should go unmetered. It runs
  // automatically on every /start page load, logged in or not, so it is if
  // anything a MORE likely target for the abuse this gate exists for, not
  // less.
  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-page', limit: PAGE_LIMIT });
  if (!gate.allowed) return json({}, 429);

  const customer = await currentCustomer(env, request);
  if (!customer) return json({}, 401);

  // ?1 is currentCustomer()'s id — the one the session cookie resolved to, never
  // anything the caller sent. There is no id in this request to trust: the URL
  // carries none and a query string naming one would be ignored.
  let row;
  try {
    row = await detailsRow(env, customer.customer_id);
  } catch {
    return json({ error: 'unavailable' }, 503); // a failed read is not "signed out"
  }
  if (!row) return json({}, 401); // the session outlived its own customer row — treat it as signed out, not a 500

  return json({
    email: row.email || '',
    name: row.name || '',
    brand: row.brand || '',
    phone: row.phone || '',
    website: row.website || '',
    vat: row.vat_number || '',
    background: row.default_background || '',
    backgroundHex: row.default_background_hex || '',
    saved: !!row.details_saved_at,
    label: row.brand || row.name || row.email || '',
  });
}

/** The saved-details row, one query, used by /account/me and by Brand kit. */
function detailsRow(env, customerId) {
  return env.DB.prepare(
    `SELECT email, name, brand, phone, website, vat_number,
            default_background, default_background_hex, details_saved_at
       FROM customers WHERE id = ?1`
  ).bind(customerId).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVED DETAILS — POST /account/details
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save the answers that do not change between orders. Two callers, one
 * handler: the Brand kit form (browser POST, 303 back to the section) and
 * /start's end-of-order opt-in (fetch, JSON). See wantsJson() for why the two
 * are told apart by Accept rather than by a field in the body.
 *
 * WHOSE RECORD THIS WRITES IS NOT NEGOTIABLE. `customer` is what the session
 * cookie resolved to in accountPost above, via the same currentCustomer() every
 * other authenticated route in this file uses. Nothing in the posted form names
 * a customer, and if a future field did it would still not be read here — the
 * bind below takes customer.customer_id and there is no branch that could take
 * anything else. Same rule handleLockUpdate() keeps when it checks a model is
 * this brand's before locking to it.
 *
 * EMAIL IS NOT AMONG THE FIELDS. See the file header: it is the login
 * credential, it is UNIQUE, and a session that could rewrite it is a session
 * that could point itself at another brand's inbox.
 *
 * EVERY FIELD IS OPTIONAL AND AN EMPTY ONE CLEARS. A customer removing their
 * phone number from the form means they want it gone, not that the field was
 * skipped — this is a settings screen, not the order form, and there is exactly
 * one way to read a blank box on a settings screen.
 */
async function handleDetails({ request, env }, customer, asJson) {
  const form = await request.formData().catch(() => null);
  const home = '/account/brand-kit';

  if (!form) return asJson ? json({ error: 'bad-request' }, 400) : seeOther(home);

  const one = (k) => {
    const v = String(form.get(k) ?? '').trim().slice(0, DETAIL_MAX);
    return v || null;
  };

  // Anything not on the list is the empty answer — "ask me per order" — rather
  // than a 400. BG_IDS comes from backgrounds.js, so a fifth recommended colour
  // becomes storable by adding it there and nowhere else.
  const rawBg = String(form.get('background') || '');
  const background = BG_IDS.includes(rawBg) ? rawBg : null;

  // The hex is kept only for the option that has no id to resolve from. A
  // recommended id already carries its own contract value in backgrounds.js;
  // storing a second, client-supplied hex beside it would be a way for the two
  // to disagree about what 'beige' means.
  const hex = background === BG_CUSTOM ? normalizeHex(form.get('background_custom') || form.get('background_hex')) : null;

  try {
    await env.DB.prepare(
      `UPDATE customers SET
         name = ?2, brand = ?3, phone = ?4, website = ?5, vat_number = ?6,
         default_background = ?7, default_background_hex = ?8,
         details_saved_at = datetime('now'),
         updated_at = datetime('now')
       WHERE id = ?1`
    ).bind(
      customer.customer_id,
      one('name'), one('brand'), one('phone'), one('website'), one('vat'),
      background, hex
    ).run();
  } catch {
    return asJson ? json({ error: 'unavailable' }, 503) : seeOther(home);
  }

  // 303 back to the section the form lives on, same rule handleLockUpdate and
  // handleFileReview follow. ?saved=1 is what draws the confirmation line —
  // a settings form that redirects to a page identical to the one it left is
  // a form the customer presses twice.
  return asJson ? json({ ok: true }) : seeOther(`${home}?saved=1#details`);
}

/**
 * A six-digit uppercase hex, or null. Mirrors normalizeHex() in
 * src/scripts/pipeline.js — including expanding #EEE, which a brand's own
 * style guide is perfectly likely to be written in — because the value this
 * stores and the value that form resolves have to be the same string. Anything
 * else (a colour name, half a paste, an empty box) is not an answer yet and is
 * stored as none rather than as itself.
 */
function normalizeHex(v) {
  const s = String(v || '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(s)) return `#${s.split('').map((ch) => ch + ch).join('').toUpperCase()}`;
  if (/^[0-9a-f]{6}$/i.test(s)) return `#${s.toUpperCase()}`;
  return null;
}

/** All orders this customer has placed, most recent first. */
async function loadOrders(env, customerId) {
  const res = await env.DB.prepare(
    `SELECT id, ref, service, status, tier, product_count, window_start, window_end, lang, created_at, closed_at
       FROM orders
      WHERE customer_id = ?1
      ORDER BY created_at DESC, id DESC
      LIMIT 200`
  ).bind(customerId).all();
  return res.results || [];
}

/**
 * Can this order's files be approved / flagged for revision from here?
 * Mirrors portal.js's own `review`/`history` split on the same two columns —
 * see shot()'s header there for the full reasoning. Tier 0 ('unattended')
 * never had a review step to begin with; a closed order still SHOWS what was
 * decided (history) but no longer accepts new decisions (review). Duplicated
 * rather than imported: this is two booleans over fields both files already
 * read, not enough shared logic to justify a cross-file dependency between
 * the token-authenticated portal and the cookie-authenticated dashboard.
 */
function canReview(o) {
  return o.tier === 'attended' && !o.closed_at;
}
function canSeeReviewHistory(o) {
  return o.tier === 'attended';
}

/**
 * Every delivered file across every one of this customer's orders, one query.
 * Grouped by order_id in JS afterward rather than queried per-order — a
 * dashboard with twenty orders would otherwise be twenty round trips for
 * exactly the rows this single join already returns.
 */
async function loadCustomerFiles(env, customerId) {
  const res = await env.DB.prepare(
    `SELECT f.id, f.order_id, f.filename, f.bytes, f.expires_at, f.review_state, f.review_note, f.reviewed_at
       FROM files f JOIN orders o ON o.id = f.order_id
      WHERE o.customer_id = ?1 AND f.kind = 'delivery'
      ORDER BY f.order_id, f.id`
  ).bind(customerId).all();
  return res.results || [];
}

function groupFilesByOrder(files) {
  const map = new Map();
  for (const f of files) {
    if (!map.has(f.order_id)) map.set(f.order_id, []);
    map.get(f.order_id).push(f);
  }
  return map;
}

async function loadCustomModels(env, customerId) {
  const res = await env.DB.prepare(
    'SELECT id, label, status FROM custom_models WHERE customer_id = ?1 ORDER BY created_at DESC'
  ).bind(customerId).all();
  return res.results || [];
}

async function loadStyleLocks(env, customerId) {
  const res = await env.DB.prepare(
    'SELECT style, custom_model_id FROM customer_style_locks WHERE customer_id = ?1'
  ).bind(customerId).all();
  return res.results || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// BRAND LOCK
// ─────────────────────────────────────────────────────────────────────────────

// Every redirect here lands back on /account/brand-kit, not the bare
// /account overview — task #259's second follow-up split the single-page
// dashboard into sections, and a form on one section should return the
// customer to that same section, not to the section that now happens to be
// first (see the same choice for handleFileReview, just below).
async function handleLockUpdate({ request, env }, customer) {
  const form = await request.formData().catch(() => null);
  const style = String(form?.get('style') || '');
  const raw = String(form?.get('custom_model_id') || '');
  const home = '/account/brand-kit';

  if (!STYLES.includes(style)) return seeOther(home);

  if (raw === '') {
    // Explicitly clearing the lock — back to "ask per order, as usual."
    await env.DB.prepare(
      'DELETE FROM customer_style_locks WHERE customer_id = ?1 AND style = ?2'
    ).bind(customer.customer_id, style).run();
    return seeOther(home);
  }

  const modelId = Number.parseInt(raw, 10);
  if (!Number.isInteger(modelId)) return seeOther(home);

  // The model must belong to THIS customer — without this, a forged form post
  // could lock a style to another brand's custom_models row. Same "owned?"
  // check portal.js runs before touching a file (files WHERE id AND order_id).
  const owned = await env.DB.prepare(
    'SELECT id FROM custom_models WHERE id = ?1 AND customer_id = ?2'
  ).bind(modelId, customer.customer_id).first();
  if (!owned) return seeOther(home);

  await env.DB.prepare(
    `INSERT INTO customer_style_locks (customer_id, style, custom_model_id, updated_at)
     VALUES (?1, ?2, ?3, datetime('now'))
     ON CONFLICT(customer_id, style) DO UPDATE SET
       custom_model_id = excluded.custom_model_id,
       updated_at = datetime('now')`
  ).bind(customer.customer_id, style, modelId).run();

  return seeOther(home);
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-FILE REVIEW — approve / request a revision / undo either.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /account/review — the cookie-authenticated twin of portal.js's
 * portalPost() review branch. Same three actions, same columns, same
 * reversible-undo reasoning (see portal.js's handler for the full argument);
 * the only real difference is how ownership is proven — a live session
 * checked against orders.customer_id here, a URL token checked against
 * order_tokens there — because this file's customer is already authenticated
 * by the time any POST reaches this far (see accountPost's shared Origin
 * check above every route past /account/login).
 */
async function handleFileReview({ request, env }, customer) {
  const home = '/account/orders';
  const form = await request.formData().catch(() => null);
  const fileId = Number.parseInt(String(form?.get('file') || ''), 10);
  const action = String(form?.get('action') || '');
  if (!Number.isInteger(fileId) || !['approve', 'revise', 'undo'].includes(action)) return seeOther(home);

  // The file must belong to an order THIS customer owns, that order must
  // still be under review (tier 'attended', not yet closed) — mirrors
  // canReview() above and portal.js's own ownership + tier + closed_at gate,
  // so a forged post cannot review another brand's files, and a stale form
  // left open in a tab cannot revive a decision on a job that already closed.
  let owned;
  try {
    owned = await env.DB.prepare(
      `SELECT f.id FROM files f JOIN orders o ON o.id = f.order_id
        WHERE f.id = ?1 AND o.customer_id = ?2 AND f.kind = 'delivery'
          AND o.tier = 'attended' AND o.closed_at IS NULL`
    ).bind(fileId, customer.customer_id).first();
  } catch {
    return seeOther(home);
  }
  if (!owned) return seeOther(home);

  const anchor = `${home}#f${fileId}`;

  try {
    if (action === 'approve') {
      await env.DB.prepare(
        `UPDATE files SET review_state = 'approved', review_note = NULL, reviewed_at = datetime('now') WHERE id = ?1`
      ).bind(fileId).run();
    } else if (action === 'undo') {
      // Reversible on purpose — same reasoning as portal.js: a mis-tapped
      // Approve must not strand a client with a decision they cannot take back.
      await env.DB.prepare(
        `UPDATE files SET review_state = 'pending', review_note = NULL, reviewed_at = NULL WHERE id = ?1`
      ).bind(fileId).run();
    } else {
      const note = String(form.get('note') || '').trim().slice(0, NOTE_MAX);
      if (!note) return seeOther(anchor); // nothing said, nothing changed
      await env.DB.prepare(
        `UPDATE files SET review_state = 'revision_requested', review_note = ?2, reviewed_at = datetime('now') WHERE id = ?1`
      ).bind(fileId, note).run();
    }
  } catch {
    return seeOther(home);
  }

  return seeOther(anchor);
}

// ─────────────────────────────────────────────────────────────────────────────
// FILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One delivered object out of R2, behind the account session rather than a
 * portal token. This is portal.js's serveFile() in shape — range/conditional
 * handling, the same MIME table, the same Content-Disposition rule — but NOT
 * imported from it: portal.js's version is reached by parsing a token out of
 * the URL and checking it against order_tokens, and this one is reached by an
 * already-authenticated customer_id checked against orders.customer_id. There
 * is no shared "verify, then serve" call it could be factored down to without
 * either function taking a parameter that means something different to each
 * caller. The genuinely shared, stateless part — the MIME table, the
 * Content-Disposition builder, the response headers — is duplicated below,
 * the same judgment call portal.js's own SERVICE dictionary makes about
 * ui.js: three small pure helpers are cheaper to keep in step by eye than to
 * add a third caller-agnostic module for.
 */
async function serveAccountFile(context, customer, fileId, mode) {
  const { request, env } = context;

  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let file;
  try {
    file = await env.DB.prepare(
      `SELECT f.id, f.r2_key, f.preview_key, f.filename, f.expires_at
         FROM files f JOIN orders o ON o.id = f.order_id
        WHERE f.id = ?1 AND o.customer_id = ?2 AND f.kind = 'delivery'`
    ).bind(fileId, customer.customer_id).first();
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!file) return new Response(null, { status: 404, headers: fileHeaders() });
  if (file.expires_at && isExpired(file.expires_at, null)) return new Response(null, { status: 410, headers: fileHeaders() });

  const key = mode === 'f' ? file.preview_key || file.r2_key : file.r2_key;

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

  const type = mimeFor(file.filename || key, headers.get('content-type'));
  headers.set('content-type', type);
  headers.set(
    'content-disposition',
    mode === 'd' ? `attachment; ${dispositionFilename(file.filename || 'file')}` : 'inline'
  );

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

function dispositionFilename(name) {
  const clean = String(name).replace(/[\\/"\r\n\t\x00-\x1f]/g, '_').slice(0, 120) || 'file';
  const ascii = clean.replace(/[^\x20-\x7e]/g, '_');
  return `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COOKIE
// ─────────────────────────────────────────────────────────────────────────────

function readSessionCookie(request) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    if (part.slice(0, i).trim() === SESSION_COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function setSessionCookie(token) {
  const maxAge = ACCOUNT_SESSION_TTL_DAYS * 86400;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/account; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/account; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Same check, same reasoning, as admin.js's originIsSelf() — see that file's
 * header, including task #271e's 2026-07-29 widening (request.url's own host,
 * then env.ALLOWED_ORIGIN_HOSTS if that misses — unset, this is unchanged).
 */
function originIsSelf(request, env) {
  // Same check, same reasoning, as admin.js's originIsSelf() — including
  // the 2026-08-01 Referrer-Policy fix documented there in full.
  //
  // THE BUG THIS REPLACES, because it is worth writing down: every response
  // from this file carried `Referrer-Policy: no-referrer`, for a good reason
  // (portal tokens live in the URL path and must not leak through Referer).
  // Under `no-referrer` Chrome does not merely strip Referer — it also sends
  // `Origin: null` on a same-origin form POST. So this function, whose entire
  // job is to compare Origin against our own host, was handed the string
  // "null", `new URL('null')` threw, and it returned false. Every
  // state-changing POST behind this gate answered 403 in production: sign out
  // on /admin and /account, the order status change, adding a custom model,
  // the brand lock, and file review. Login was unaffected because it is
  // dispatched before the gate — which is exactly why the dashboard could be
  // entered and then did nothing. Diagnosed 2026-08-01 by POSTing to a route
  // that matches nothing, which prints "Seen Origin: null" and changes no
  // state.
  //
  // The policy is now `same-origin`: full referrer to ourselves, nothing at
  // all cross-origin, so the token still cannot leak and Origin survives.
  //
  // Sec-Fetch-Site is checked first anyway, because it is the better signal.
  // It is set by the browser, script cannot forge it, and it is not affected
  // by Referrer-Policy — so it keeps working even if some future policy
  // change suppresses Origin again. `cross-site` is a hard reject; anything
  // else falls through to the Origin comparison, which still covers browsers
  // that send neither header.
  const site = request.headers.get('Sec-Fetch-Site');
  if (site === 'same-origin') return true;
  if (site === 'cross-site') return false;

  const origin = request.headers.get('Origin');
  if (!origin || origin === 'null') return false;
  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  if (originHost === new URL(request.url).host) return true;
  const allowed = String(env?.ALLOWED_ORIGIN_HOSTS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return allowed.includes(originHost);
}

/** Same shape as admin.js's originMismatchDetail() — see that file. */
function originMismatchDetail(request) {
  const origin = request.headers.get('Origin') || '(no Origin header sent)';
  let host = '(unreadable)';
  try { host = new URL(request.url).host; } catch { /* leave the placeholder */ }
  return `Seen Origin: ${origin}. Expected host: ${host}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────

// login/check-email/bad-link share one framed .authcard (account.css) rather
// than a bare form floating on the page — these are the first thing a
// customer sees of the account system, before there is a dashboard bar or
// any brand/order context to anchor the page, so the card itself has to do
// that job.
function loginBody(t, lang, error = null) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.loginTitle)}</h1>
  <p class="lede">${esc(t.loginLede)}</p>
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <form class="login" method="post" action="/account/login">
    <input type="hidden" name="lang" value="${esc(lang)}">
    <input type="email" name="email" placeholder="${esc(t.loginEmailLabel)}" autocomplete="email" required>
    <button class="btn btn-primary" type="submit">${esc(t.loginSubmit)}</button>
  </form>
</div>`;
}

function checkEmailBody(t) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.checkTitle)}</h1>
  <p class="lede">${esc(t.checkBody)}</p>
</div>`;
}

function badLinkBody(t) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.badLinkTitle)}</h1>
  <p class="lede">${esc(t.badLinkBody)}</p>
  <p class="note"><a href="/account/login">${esc(t.loginSubmit)}</a></p>
</div>`;
}

// Sidebar icons — 24x24, stroke-only, sharp joins: the same `.i` convention
// Layout.astro already uses for the site's own nav (see global.css's `.i`
// rule, duplicated into account.css for the reason account.css's own header
// gives for every token it duplicates). Five, one per nav item, kept as
// constants rather than a lookup built at render time — there are exactly
// five and that will not change without a design decision, not a data one.
const ICON_OVERVIEW = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
const ICON_NEW = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_ORDERS = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
const ICON_BRAND = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="12" height="12"/><rect x="8" y="8" width="12" height="12"/></svg>';
const ICON_PLAN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="13"/><path d="M2 11h20"/></svg>';

/**
 * The sidebar app shell — task #259's second follow-up. Wraps whichever
 * section's markup is passed in as `inner`; every section shares this one
 * shell rather than each re-drawing its own nav, which is the whole point of
 * a shell (see reference/product.md's "consistent affordances" rule: the
 * nav, the sign-out control, and the account identity must be the SAME
 * element regardless of which page put them on screen).
 *
 * "New request" points straight at /start — the site's existing intake
 * pipeline (Section 10) — rather than a page under /account. Lucas already
 * has one working intake flow; a second one living here would be two forms
 * answering the same question, and the one this project already hardened
 * (capacity gate, blackout days, rate limits) is the one that should run.
 */
function shellBody(t, lang, customer, active, inner) {
  const items = [
    { key: 'overview', href: '/account', label: t.navOverview, icon: ICON_OVERVIEW },
    { key: 'new', href: '/start', label: t.navNewRequest, icon: ICON_NEW },
    { key: 'orders', href: '/account/orders', label: t.ordersHeading, icon: ICON_ORDERS },
    { key: 'brand', href: '/account/brand-kit', label: t.navBrandKit, icon: ICON_BRAND },
    { key: 'plan', href: '/account/plan', label: t.navPlan, icon: ICON_PLAN },
  ];
  const nav = items.map((n) => {
    const isActive = n.key === active;
    return `<a class="navlink${isActive ? ' is-active' : ''}" href="${esc(n.href)}"${isActive ? ' aria-current="page"' : ''}>${n.icon}<span>${esc(n.label)}</span></a>`;
  }).join('');

  return `
<div class="shell">
  <aside class="sidebar">
    <div class="sidebrand">
      <a class="mark" href="/">VISUAILS</a>
      <span class="sidebrand-sub">${esc(t.dashSub)}</span>
    </div>
    <nav class="sidenav" aria-label="Account">${nav}</nav>
    <div class="sideuser">
      <span class="sideuser-name">${esc(customer.brand || customer.name || customer.email)}</span>
      <span class="sideuser-email">${esc(customer.email)}</span>
      <form method="post" action="/account/logout"><button class="btn btn-ghost btn-block" type="submit">${esc(t.signOut)}</button></form>
    </div>
  </aside>
  <main class="main">${inner}</main>
</div>`;
}

/**
 * Overview — the section that lands after login. Counts are real, all-time
 * totals read straight off `orders`, never a fabricated monthly figure: see
 * sectionGet's header on why this dashboard has no billing cycle to anchor
 * "this month" to. Recent activity is the five newest orders, each linking
 * to its full card on the Orders page rather than repeating that card here.
 */
function overviewBody(t, lang, customer, orders, filesByOrder) {
  const name = customer.brand || customer.name || customer.email;
  const stats = [
    [t.ovInProduction, orders.filter((o) => o.status === 'in_production').length],
    [t.ovHumanCheck, orders.filter((o) => o.status === 'human_check').length],
    [t.ovDelivered, orders.filter((o) => o.status === 'delivered').length],
    [t.ovTotal, orders.length],
  ];
  const recent = orders.slice(0, 5);

  return `
<div class="ovhead">
  <div>
    <h1>${esc(t.ovWelcome)}, ${esc(name)}</h1>
    <p class="lede">${esc(t.ovLede)}</p>
  </div>
  <a class="btn btn-primary" href="/start">${esc(t.ovNewCta)}</a>
</div>

<div class="statrow">
  ${stats.map(([label, n]) => `<div class="stat"><span class="stat-n">${n}</span><span class="stat-label">${esc(label)}</span></div>`).join('')}
</div>

<div class="section-head">
  <h2>${esc(t.ovRecent)}</h2>
  ${orders.length ? `<a class="viewall" href="/account/orders">${esc(t.ovViewAll)}</a>` : ''}
</div>
${recent.length
  ? `<ul class="activity">${recent.map((o) => activityRow(t, lang, o)).join('')}</ul>`
  : `<p class="empty">${esc(t.emptyOrders)}</p>`}`;
}

function activityRow(t, lang, o) {
  return `<li>
  <a class="activity-link" href="/account/orders#order-${o.id}">
    <span class="ref">${esc(o.ref)}</span>
    <span class="meta">${esc(serviceLabel(o.service, lang) || o.service)}${o.created_at ? ` · ${esc(String(o.created_at).slice(0, 10))}` : ''}</span>
  </a>
  <span class="pill is-${esc(o.status)}">${esc(statusLabel(o.status, lang) || o.status)}</span>
</li>`;
}

function ordersBody(t, lang, orders, filesByOrder) {
  return `
<h1>${esc(t.ordersHeading)}${orders.length ? ` <span class="h2-count">(${orders.length})</span>` : ''}</h1>
<p class="lede">${esc(t.ordersLede)}</p>
${orders.length ? orders.map((o) => orderCard(t, lang, o, filesByOrder.get(o.id) || [])).join('') : `<p class="empty">${esc(t.emptyOrders)}</p>`}`;
}

/**
 * Brand kit — the standing answers. Two panels, in the order a customer meets
 * them: the details every order asks for (August 2026), then the per-style
 * model lock (task #257). Details come FIRST because they are the ones every
 * customer has, whereas the lock panel is empty for a brand with no custom
 * models — leading a page with an empty state is how a section reads as
 * unfinished.
 *
 * Lucas's ask was that details be editable here and not only mid-order: a
 * customer whose VAT number changed should not have to start an order they do
 * not want in order to correct it.
 */
function brandKitBody(t, lang, models, lockByStyle, details, justSaved) {
  return `
<h1>${esc(t.navBrandKit)}</h1>
${detailsSection(t, lang, details, justSaved)}
<h2 class="det-h2">${esc(t.lockH)}</h2>
<p class="lede">${esc(t.lockLede)}</p>
${lockSection(t, models, lockByStyle)}`;
}

/**
 * The saved-details form. A plain <form method="post">, no script anywhere on
 * this page — same as every other control in this file, and the reason the CSP
 * in html() can keep saying default-src 'none' as a fact rather than a wish.
 *
 * Email is rendered as text, not as a disabled input: a disabled input looks
 * like a field that could be enabled, and this one never can. The line beneath
 * it says why, in the customer's terms. See the file header for the security
 * half of that answer.
 *
 * `details` can be null if the row vanished between the session check and this
 * query, which is a signed-out state one request late rather than a crash —
 * every value below is read off `d` with a fallback for exactly that reason.
 */
function detailsSection(t, lang, details, justSaved) {
  const d = details || {};
  const bg = d.default_background || '';
  const options = [`<option value=""${bg === '' ? ' selected' : ''}>${esc(t.detBgUnset)}</option>`]
    // Names come from backgrounds.js in the customer's own language — the same
    // words /start's swatches use, so the default set here and the option seen
    // there are recognisably the same choice.
    .concat(BACKGROUNDS.map((b) => `<option value="${esc(b.id)}"${bg === b.id ? ' selected' : ''}>${esc(b.name[lang] || b.name.en)} · ${esc(b.hex)}</option>`))
    .concat([`<option value="${esc(BG_CUSTOM)}"${bg === BG_CUSTOM ? ' selected' : ''}>${esc(t.detBgHex)}</option>`])
    .join('');

  const field = (name, label, value, opts = {}) => `
    <div class="det-field">
      <label for="det-${esc(name)}">${esc(label)}${opts.optional ? ` <span class="det-opt">${esc(t.detOptional)}</span>` : ''}</label>
      <input id="det-${esc(name)}" name="${esc(name)}" type="${esc(opts.type || 'text')}" value="${esc(value || '')}" maxlength="${DETAIL_MAX}"${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''} autocomplete="${esc(opts.auto || 'off')}">
      ${opts.hint ? `<span class="det-hint">${esc(opts.hint)}</span>` : ''}
    </div>`;

  return `
<section class="detpanel" id="details">
  <h2 class="det-h2">${esc(t.detH)}</h2>
  <p class="lede">${esc(t.detLede)}</p>
  ${justSaved ? `<p class="det-ok" role="status">${esc(t.detSaved)}</p>` : ''}
  <form class="detform" method="post" action="/account/details">
    <div class="det-grid">
      ${field('name', t.detName, d.name, { auto: 'name' })}
      ${field('brand', t.detBrand, d.brand, { auto: 'organization' })}
    </div>
    <div class="det-field">
      <span class="det-label">${esc(t.detEmail)}</span>
      <p class="det-fixed">${esc(d.email || '')}</p>
      <span class="det-hint">${esc(t.detEmailNote)}</span>
    </div>
    <div class="det-grid">
      ${field('phone', t.detPhone, d.phone, { type: 'tel', auto: 'tel', optional: true })}
      ${field('website', t.detWebsite, d.website, { type: 'url', placeholder: 'https://', auto: 'url', optional: true })}
    </div>
    <div class="det-grid">
      ${field('vat', t.detVat, d.vat_number, { placeholder: 'NL000000000B00', optional: true })}
      <div class="det-field">
        <label for="det-bg">${esc(t.detBg)}</label>
        <select id="det-bg" name="background">${options}</select>
      </div>
    </div>
    <div class="det-field">
      <label for="det-bghex">${esc(t.detBgHex)} <span class="det-opt">${esc(t.detOptional)}</span></label>
      <input id="det-bghex" name="background_custom" type="text" value="${esc(d.default_background_hex || '')}" placeholder="#RRGGBB" maxlength="7" pattern="#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})" autocomplete="off" spellcheck="false">
      <span class="det-hint">${esc(t.detBgHexHint)}</span>
    </div>
    <button class="btn btn-primary" type="submit">${esc(t.detSave)}</button>
  </form>
</section>`;
}

/**
 * Plan & billing — deliberately the thinnest section here. Lucas chose "the
 * shape, not a real credit system" when asked (task #259, second follow-up):
 * there is no subscription model behind this site, orders are billed one at
 * a time, and payments are not even wired up yet (task #258). Rendering a
 * fake "12 days until renewal" counter would be lying to a client with a
 * real invoice question. This shows what is real — the account identity —
 * and points anything else at a human, same as portal.js's own foot note does.
 */
function planBody(t, customer) {
  return `
<h1>${esc(t.planHeading)}</h1>
<p class="lede">${esc(t.planLede)}</p>
<div class="card">
  <h3>${esc(t.planAccountLabel)}</h3>
  <dl class="facts">
    <div class="fact"><dt>${esc(t.planEmailLabel)}</dt><dd>${esc(customer.email)}</dd></div>
    ${customer.brand ? `<div class="fact"><dt>${esc(t.planBrandLabel)}</dt><dd>${esc(customer.brand)}</dd></div>` : ''}
  </dl>
  <p class="meta">${esc(t.planNote)}</p>
</div>`;
}

// One panel, one row per style — was three separate .card+.controls forms
// stacked with their own margins, three visually distinct boxes for what is
// conceptually one settings list (see account.css's .lockpanel comment).
function lockSection(t, models, lockByStyle) {
  if (!models.length) return `<p class="empty">${esc(t.lockNoModels)}</p>`;

  const rows = STYLES.map((style) => {
    const current = lockByStyle[style] ?? '';
    const options =
      `<option value=""${current === '' ? ' selected' : ''}>${esc(t.lockUnset)}</option>` +
      models.map((m) => `<option value="${m.id}"${String(m.id) === String(current) ? ' selected' : ''}>${esc(m.label)}</option>`).join('');
    return `
<form class="lockrow" method="post" action="/account/lock">
  <input type="hidden" name="style" value="${esc(style)}">
  <span class="lockrow-name">${esc(styleLabel(style))}</span>
  <span class="lockrow-controls">
    <select name="custom_model_id">${options}</select>
    <button class="btn btn-primary" type="submit">${esc(t.lockSave)}</button>
  </span>
</form>`;
  }).join('');

  return `<div class="lockpanel">${rows}</div>`;
}

function styleLabel(style) {
  // A one-word label per style id, the same three ids SERVICE already names —
  // reused rather than re-typed for the two ('catalog','lifestyle') that
  // overlap with a service name; 'video' does too.
  return SERVICE[style]?.en || style;
}

function orderCard(t, lang, o, files) {
  const window = o.window_start ? `${esc(o.window_start)} → ${esc(o.window_end || '—')}` : t.windowPending;
  // Status is not repeated here — it already has the pill in row-head, and a
  // second plain-text copy of the same word two lines down read as clutter
  // rather than information. Placed (the order date) replaces it: real,
  // useful, and nowhere else on the card.
  const facts = [
    [t.fRef, o.ref],
    [t.fService, serviceLabel(o.service, lang) || o.service],
    o.product_count ? [t.fProducts, String(o.product_count)] : null,
    o.created_at ? [t.fPlaced, String(o.created_at).slice(0, 10)] : null,
  ].filter(Boolean);

  const fileList = files.length
    ? `<ul class="files">${files.map((f) => fileRow(t, f, o)).join('')}</ul>`
    : `<p class="meta">${esc(t.emptyFiles)}</p>`;

  return `
<div class="card" id="order-${o.id}">
  <div class="row-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="pill is-${esc(o.status)}">${esc(statusLabel(o.status, lang) || o.status)}</span>
  </div>
  <dl class="facts">${facts.map(([k, v]) => `<div class="fact"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  <p class="meta">${esc(t.fWindow)}: ${o.window_start ? window : esc(window)}</p>
  <h3>${esc(t.filesHeading)}</h3>
  ${fileList}
</div>`;
}

/**
 * One delivered file, with Approve / request-a-revision / Undo when its
 * order is eligible (see canReview/canSeeReviewHistory above — the same
 * tier + closed_at gate portal.js's shot() applies, so a client sees the
 * identical set of controls whether they got here from the emailed link or
 * from here). `o` is the file's own order, passed down from orderCard rather
 * than looked up again — the caller already has it.
 *
 * View/Download stay plain <a> links outside any <form>; the review actions
 * are their own <form method="post" action="/account/review"> sitting next
 * to them — two forms of control, not one form with mixed intents, same
 * "one form, two submits" shape portal.js's shot() uses for approve/revise.
 */
function fileRow(t, f, o) {
  const gone = f.expires_at && isExpired(f.expires_at, null);
  const size = f.bytes ? formatBytes(f.bytes) : '';
  const info = `<span class="file-info"><span class="name">${esc(f.filename || `#${f.id}`)}</span>${size ? `<span class="meta">${esc(size)}</span>` : ''}</span>`;

  if (gone) {
    return `<li id="f${f.id}">${info}</li>`;
  }

  const actions = `<span class="file-actions">
    <a class="btn btn-ghost" href="/account/files/${f.id}/f">${esc(t.bView)}</a>
    <a class="btn btn-ghost" href="/account/files/${f.id}/d">${esc(t.bDownload)}</a>
  </span>`;

  let state = '';
  if (canSeeReviewHistory(o)) {
    if (f.review_state === 'approved') {
      state = `<span class="state approved">${esc(t.stApproved)}</span>`;
    } else if (f.review_state === 'revision_requested') {
      state = `<span class="state revision">${esc(t.stRevision)}</span>${f.review_note ? `<p class="said">${esc(f.review_note)}</p>` : ''}`;
    }
  }

  let review = '';
  if (canReview(o)) {
    if (f.review_state === 'approved' || f.review_state === 'revision_requested') {
      const label = f.review_state === 'approved' ? t.bUndo : t.bCancel;
      review = `<form class="review-form" method="post" action="/account/review">
    <input type="hidden" name="file" value="${f.id}">
    <button class="btn btn-quiet" type="submit" name="action" value="undo">${esc(label)}</button>
  </form>`;
    } else {
      // formnovalidate on Approve so the required note in the <details> below
      // cannot block it — the two submits are alternatives, not steps.
      review = `<form class="review-form" method="post" action="/account/review">
    <input type="hidden" name="file" value="${f.id}">
    <button class="btn btn-primary" type="submit" name="action" value="approve" formnovalidate>${esc(t.bApprove)}</button>
    <details class="ask">
      <summary>${esc(t.askSummary)}</summary>
      <label class="sr-only" for="n${f.id}">${esc(t.askLabel)}</label>
      <textarea id="n${f.id}" name="note" rows="3" maxlength="${NOTE_MAX}" placeholder="${esc(t.askHint)}" required></textarea>
      <button class="btn btn-ghost" type="submit" name="action" value="revise">${esc(t.bSend)}</button>
    </details>
  </form>`;
    }
  }

  return `<li id="f${f.id}">
  ${info}
  ${state}
  ${actions}
  ${review}
</li>`;
}

function errorBody(t, message = null) {
  return `<div class="bar"><a class="mark" href="/">VISUAILS</a></div><p class="error" style="margin-top:2rem">${esc(message || (t && t.dbDown) || 'Something went wrong.')}</p>`;
}

// `full` swaps the centered 940px `.wrap` column for the edge-to-edge shell
// layout — shellBody() already draws its own sidebar + main flex frame with
// its own min-height:100vh, and nesting that inside `.wrap`'s max-width would
// squeeze the sidebar into the same narrow column as a login card. Login,
// check-email and the bad-link page keep `.wrap`: they are single centered
// cards, not the app shell, same distinction account.css's own header draws
// between .authcard and everything sectionGet renders.
function page({ lang, title, body, full = false, nonce = '' }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light">
<title>${esc(title)} — VISUAILS</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/account.css">
${nonce ? `<style nonce="${esc(nonce)}">${DETAILS_CSS}</style>` : ''}
</head>
<body${full ? ' class="has-shell"' : ''}>
${full ? body : `<div class="wrap">\n${body}\n</div>`}
</body>
</html>`;
}

/**
 * The saved-details panel's own rules, and WHY they are here rather than in
 * public/account.css where every other rule on this page lives.
 *
 * They are in this file because this file is the only one this task owns; the
 * stylesheet is not ours to edit. That is a constraint, not a design, and the
 * next person free to touch account.css should move this block there verbatim
 * and delete the nonce plumbing with it.
 *
 * WHAT THE NONCE IS FOR. style-src is 'self' — an inline <style> is refused,
 * silently, and the panel would render as unstyled boxes with no error anyone
 * would see. The fix is a per-response nonce, NOT 'unsafe-inline': a nonce
 * admits exactly this one block and still refuses every injected style
 * attribute, which is the property 'self' was there for in the first place.
 *
 * CORNERS. --r-lg on the panel, --r-md on the fields, --r-sm on nothing
 * smaller — the three tokens account.css defines at :root and applies per
 * primitive further down. Nothing here is square.
 */
const DETAILS_CSS = `
.detpanel { margin: 0 0 clamp(2.4rem,5vw,3.4rem); padding: clamp(1.3rem,3vw,1.8rem); border: 1px solid var(--line); background: var(--paper-lift); border-radius: var(--r-lg); }
.detpanel .lede { font-size: 1rem; }
.det-h2 { margin-top: 0; }
.detform { display: grid; gap: 1.1rem; margin-top: 1.4rem; }
.det-grid { display: grid; gap: 1.1rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.det-field { display: grid; gap: .35rem; min-width: 0; }
.det-field label, .det-label { font-size: .78rem; letter-spacing: .07em; text-transform: uppercase; font-weight: 600; color: var(--ink-3); }
.det-field input {
  width: 100%; padding: .7rem .8rem; font-size: .96rem;
  border: 1px solid var(--line-strong); border-radius: var(--r-md);
  background: var(--surface); color: var(--ink);
}
.det-field select { width: 100%; padding: .7rem 2.2rem .7rem .8rem; border-radius: var(--r-md); }
.det-opt { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--ink-3); }
.det-hint { font-size: .84rem; color: var(--ink-3); text-wrap: pretty; }
/* The account email, shown and not editable — see handleDetails(). It is
   deliberately not a disabled <input>: a greyed-out field reads as one that
   could be switched on, and this one never can. */
.det-fixed { margin: 0; padding: .7rem .8rem; border: 1px dashed var(--line-strong); border-radius: var(--r-md); background: var(--paper-2); color: var(--ink); font-size: .96rem; overflow-wrap: anywhere; }
.det-ok { margin: .9rem 0 0; padding: .7rem .9rem; border: 1px solid var(--line); border-radius: var(--r-md); background: var(--paper-2); color: var(--signal-ink); font-size: .92rem; }
.detform .btn { justify-self: start; }
`;

/** Same header set and reasoning as portal.js's html() — no script on this page, so default-src 'none' is a fact, not an aspiration. */
function html(body, status = 200, extraSetCookies = [], nonce = '') {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      `default-src 'none'; img-src 'self'; style-src 'self'${nonce ? ` 'nonce-${nonce}'` : ''}; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
  });
  for (const c of extraSetCookies) headers.append('Set-Cookie', c);
  return new Response(body, { status, headers });
}

/**
 * A fresh nonce per response. Must be unpredictable and must never be reused
 * across responses — a nonce that repeats is 'unsafe-inline' with extra steps.
 * crypto.getRandomValues is the same source mintToken() draws on (token.js).
 */
function makeNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '');
}

function seeOther(location, setCookies = []) {
  const headers = new Headers({ Location: location, 'cache-control': 'no-store', 'referrer-policy': 'same-origin' });
  for (const c of setCookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 303, headers });
}

/** Same shape as functions/api/order.js's json() — see handleMe() for the one caller. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'same-origin',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL THINGS
// ─────────────────────────────────────────────────────────────────────────────

function serviceLabel(service, lang) {
  const s = SERVICE[service];
  return s ? s[lang] || s.en : null;
}

function statusLabel(status, lang) {
  const s = STATUS[status];
  return s ? s[lang] || s.en : null;
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/** Same fallback reasoning as functions/api/order.js's requestOrigin() — a link that cannot be clicked in staging is untested until a client has it. */
function requestOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch {
    return 'https://visuails.com';
  }
}

/** Language for the pages reached before any order is known — same as portal.js's negotiate(). */
function negotiate(request) {
  const header = request?.headers?.get?.('accept-language') || '';
  return /(^|[,\s])nl\b/i.test(header) ? 'nl' : 'en';
}

function formatBytes(n) {
  const b = Number(n);
  if (!Number.isFinite(b) || b <= 0) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function later(context, promise) {
  if (context && typeof context.waitUntil === 'function') context.waitUntil(promise);
}

function maybeSweep(context, env) {
  if (env?.DB && shouldSweep()) later(context, sweepRateLimits(env));
}

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/**
 * The magic-link email itself. Plain, on purpose — a login email that looks
 * like a marketing template is the one a spam filter or a wary customer
 * distrusts most. No logo image, no styled button: one link, one sentence of
 * context, the studio's own signature.
 */
function magicLinkEmail(lang, link) {
  const copy = lang === 'nl'
    ? {
        h: 'Je inloglink',
        p: 'Klik op de link hieronder om in te loggen bij je VISUAILS-account. Deze link werkt één keer en verloopt over 30 minuten.',
        b: 'Inloggen',
        f: 'Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets aan je account.',
      }
    : {
        h: 'Your sign-in link',
        p: 'Click the link below to sign in to your VISUAILS account. It works once and expires in 30 minutes.',
        b: 'Sign in',
        f: 'Did not request this? You can ignore this email — nothing about your account changes.',
      };
  return `<div style="font-family:Arial,sans-serif;color:#222;max-width:480px;margin:0 auto">
<h2 style="margin:0 0 12px">${copy.h}</h2>
<p style="margin:0 0 20px">${copy.p}</p>
<p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none">${copy.b}</a></p>
<p style="margin:0;color:#666;font-size:13px">${copy.f}</p>
</div>`;
}
