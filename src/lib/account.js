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
import { ROSTER, modelId, TRAITS } from '../data/models.js';
import { mailNote } from '../data/mailNote.js';
import { serviceLabel } from '../data/services.js';
// Aliased on import: this file already has `esc`, `note` and a `p` of its own
// for the account SCREENS, and the mail template exports the same three names
// for the mail. Two `p`s in one module is a bug waiting for whichever one gets
// edited without looking up.
import {
  shell as mailShell,
  h1 as mailH1,
  p as mailP,
  button as mailButton,
  note as mailNote2,
  spamNote as mailSpamNote,
} from './mailTemplate.js';

/** account_tokens.expires_at — long enough to find the email on a phone, short enough that a stale inbox hit is dead. */
const LOGIN_TOKEN_TTL_MINUTES = 60;

/**
 * How long a sign-in link keeps working AFTER it has first been redeemed.
 *
 * WHY A LINK THAT IS SUPPOSED TO BE SINGLE-USE IS REDEEMABLE TWICE.
 *
 * The link was consumed by the first GET that touched it, and the first GET is
 * very often not the customer. Corporate mail security — Microsoft Defender
 * Safe Links, Proofpoint, Mimecast, Barracuda — fetches every URL in an inbound
 * message to see where it goes. Those products are exactly what a Dutch shop on
 * Microsoft 365 has switched on by default. The scanner's fetch burned the
 * token, and the customer, clicking it for the first time seconds later, was
 * shown "This link does not work. It may have expired, already been used…" —
 * a sentence that is true and reads as a lie, on the first click, with no way
 * forward except asking for another link that the scanner would also burn.
 *
 * A confirmation page with a button is the usual answer (a prefetcher will not
 * POST) and it was rejected here: it puts a click in front of every customer to
 * defend against a machine, which is the opposite of what was asked for.
 *
 * SO THE WINDOW IS THE ANSWER, AND ITS COST IS SMALL. What single-use buys is
 * that a link found later in an inbox is dead. Fifteen minutes after the first
 * redemption it still is. What it cannot buy — and never could — is safety from
 * whoever reads the mailbox, because the address IS the credential this file
 * authenticates against, and the first redemption already handed over a session.
 *
 * Measured from the FIRST use and never extended: used_at is written once and
 * later redemptions leave it alone, so a link fetched in a loop cannot roll its
 * own window forward.
 */
const LOGIN_TOKEN_GRACE_MINUTES = 15;

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
 * the default one — "no standing preference, ask me per order".
 *
 * Still here although the details FORM no longer offers a background: /start
 * posts one to the same endpoint when a customer saves their details mid-order.
 * See handleDetails() for why presence, not emptiness, decides whether the
 * column is written.
 */
const BG_IDS = [...BACKGROUNDS.map((b) => b.id), BG_CUSTOM];

/**
 * The value on the "no preference" face tile. A named constant because it is
 * compared against in three places in one function — the checked test, the
 * summary's "is anything set" test, and the tile's own value — and an empty
 * string typed three times is an empty string one of them can get wrong.
 */
const FACE_NONE = '';

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
    // THE LIFETIME IN THIS SENTENCE WAS A LIE FOR ONE BUILD. It said "works
    // once, and for 30 minutes" while the token had already moved to an hour
    // with a fifteen-minute reuse window — the change that stopped corporate
    // mail scanners burning links before the customer clicked them. The mail
    // itself was updated and reads its wording from LOGIN_TOKEN_TTL_MINUTES;
    // this screen, which the customer is looking at while they wait, was not.
    // It is built from the constant now, so the two cannot disagree again.
    checkBody: `If that address has ordered with us before, a sign-in link is on its way. It stays valid for ${LOGIN_TOKEN_TTL_MINUTES % 60 === 0 ? (LOGIN_TOKEN_TTL_MINUTES / 60 === 1 ? 'an hour' : `${LOGIN_TOKEN_TTL_MINUTES / 60} hours`) : `${LOGIN_TOKEN_TTL_MINUTES} minutes`}.`,

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
    lockH: 'Defaults per service',
    lockLede: 'What each service starts with — a face and a background. These are defaults, not rules: every order still lets you change them, so you can run your own model on one order and a standard one on the next. Leave a service unset and we ask from scratch, as usual.',
    // lockNoModels / lockUnset / lockFace / lockBg / lockOwn / lockRoster came
    // out with the dropdowns they labelled (August 2026). Every one of them was
    // a <select>'s own furniture — a placeholder option, two field labels, two
    // <optgroup> headings — and the picker that replaced them says the same
    // things with a photograph, a tick and a per-tile tag. Their bk* successors
    // are grouped further down. lockH, lockLede and lockSave survive because the
    // section still has a heading, a lede and a save button.
    lockSave: 'Save',

    // The brand kit as a picture rather than as two dropdowns, August 2026.
    // Lucas: "ik wil dat de brand kit veel mooier wordt om in te stellen, dus
    // echt foto's toevoegen bij modellen, het voelt allemaal zo zielloos nu."
    bkLede: 'The look your orders start from — who wears your product, and what it sits on.',
    bkOwnH: 'Your own models',
    bkOwnLede: 'Faces made for your brand, and nobody else’s. Pick one below as the default for a service, or choose per order.',
    bkOwnEmptyH: 'No faces of your own yet',
    bkOwnEmptyBody: 'A brand model is one face, made for you, that comes back on every order — the same person wearing your range season after season, without a shoot. Until then the standard roster below is included in everything you order.',
    bkOwnEmptyCta: 'See what it takes',
    bkOwnPending: 'In the making',
    bkOwnReady: 'Ready to use',
    bkOwnTag: 'Yours only',
    // On a folded service card: what this service currently starts from.
    bkAsk: 'Asked per order',
    bkChange: 'Change',
    bkFaceLede: 'Who wears it',
    bkBgLede: 'What it sits on',
    bkNoPref: 'No preference',
    bkNoPrefFace: 'Ask me per order',
    bkOwnFig: 'Your model',

    // Saved order details, August 2026 — and its own nav item since Lucas's
    // "maak er echt een dashboard van met logische indeling". It shared the
    // Brand kit page for exactly as long as the brand kit was two dropdowns:
    // once that page became a picture of the brand's faces and grounds, a
    // phone number and a VAT line sitting under it were a second, unrelated
    // settings screen wearing the first one's heading. Two concerns, two pages.
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
    // detBg / detBgUnset / detBgHex / detBgHexHint are gone, August 2026, at
    // Lucas's direction: "Default background en Your own colour (hex) kan weg
    // omdat deze bedoeld zijn voor catalog brand kit." They asked the same
    // question the brand kit now answers per service, and per service is the
    // more specific answer — applyBrandKit() in pipeline.js already lets it
    // win. Two controls for one question is how a customer sets a background
    // here and sees a different one there. The COLUMNS stay (see
    // handleDetails) so a value set before today keeps working as a fallback.
    detSave: 'Save details',
    detSaved: 'Saved. Your next order starts filled in.',
    detOptional: 'optional',

    // Filtering the order list by status, August 2026. Lucas: "een optie die
    // alle statussen van een order kan sorteren. Dus als je op received
    // bijvoorbeeld klikt je alle orders ziet staan gesorteerd op received."
    flAll: 'All',
    flEmpty: 'No orders with this status.',
    flClear: 'Show all orders',

    navOverview: 'Overview',
    navNewRequest: 'New request',
    navBrandKit: 'Brand kit',
    navDetails: 'Your details',
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
    // Zie de EN-regel: de duur komt uit LOGIN_TOKEN_TTL_MINUTES, niet uit een
    // getal dat iemand hier ooit heeft ingetypt.
    checkBody: `Als dat adres al eerder bij ons besteld heeft, is er een inloglink onderweg. Hij blijft ${LOGIN_TOKEN_TTL_MINUTES % 60 === 0 ? (LOGIN_TOKEN_TTL_MINUTES / 60 === 1 ? 'een uur' : `${LOGIN_TOKEN_TTL_MINUTES / 60} uur`) : `${LOGIN_TOKEN_TTL_MINUTES} minuten`} geldig.`,

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

    lockH: 'Standaard per dienst',
    lockLede: 'Waar elke dienst mee begint — een gezicht en een achtergrond. Dit zijn standaardinstellingen en geen regels: bij elke bestelling kun je ze nog wijzigen, dus je kunt de ene bestelling met je eigen model draaien en de volgende met een standaardmodel. Laat een dienst leeg en we vragen het gewoon per bestelling.',
    // Zie de Engelse tak: de zes labels van de oude dropdowns zijn eruit.
    lockSave: 'Opslaan',

    bkLede: 'De look waar je bestellingen mee beginnen — wie je product draagt, en waar het op staat.',
    bkOwnH: 'Je eigen modellen',
    bkOwnLede: 'Gezichten die voor jouw merk zijn gemaakt en voor niemand anders. Kies er hieronder één als standaard voor een dienst, of kies per bestelling.',
    bkOwnEmptyH: 'Nog geen eigen gezichten',
    bkOwnEmptyBody: 'Een merkmodel is één gezicht, voor jou gemaakt, dat bij elke bestelling terugkomt — dezelfde persoon in jouw collectie, seizoen na seizoen, zonder shoot. Tot die tijd zit het standaardroster hieronder bij alles wat je bestelt.',
    bkOwnEmptyCta: 'Bekijk wat daarvoor nodig is',
    bkOwnPending: 'In de maak',
    bkOwnReady: 'Klaar voor gebruik',
    bkOwnTag: 'Alleen van jou',
    bkAsk: 'Wordt per bestelling gevraagd',
    bkChange: 'Wijzigen',
    bkFaceLede: 'Wie het draagt',
    bkBgLede: 'Waar het op staat',
    bkNoPref: 'Geen voorkeur',
    bkNoPrefFace: 'Vraag het per bestelling',
    bkOwnFig: 'Jouw model',

    // Zie de Engelse tak voor waarom dit een eigen menu-item heeft gekregen.
    detH: 'Je gegevens',
    detLede: 'Eén keer opslaan, daarna bij elke bestelling ingevuld. Pas hier iets aan en de volgende bestelling neemt het over.',
    detName: 'Je naam',
    detBrand: 'Merk- of winkelnaam',
    detEmail: 'E-mail',
    detEmailNote: 'Hiermee log je in, dus dit verandert alleen door onder een nieuw adres te bestellen. Mail ons en we zetten het om.',
    detPhone: 'Telefoon of WhatsApp',
    detWebsite: 'Website of winkellink',
    detVat: 'Btw-nummer',
    // detBg en de hex zijn eruit — zie de Engelse tak voor de reden.
    detSave: 'Gegevens opslaan',
    detSaved: 'Opgeslagen. Je volgende bestelling begint ingevuld.',
    detOptional: 'optioneel',

    flAll: 'Alle',
    flEmpty: 'Geen bestellingen met deze status.',
    flClear: 'Alle bestellingen tonen',

    navOverview: 'Overzicht',
    navNewRequest: 'Nieuwe aanvraag',
    navBrandKit: 'Brand kit',
    navDetails: 'Je gegevens',
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

  // A brand model's picture, for the brand that owns it. Ownership is checked
  // against the session's customer id and the r2_key is read from the row —
  // never from the URL, which carries only a numeric id.
  const previewMatch = path.match(/^\/account\/models\/(\d+)\/preview$/);
  if (previewMatch) return handleModelPreviewImage(context, Number(previewMatch[1]));

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
  // GET renders the form, POST (in accountPost) saves it — one path for one
  // resource, rather than a page at one URL posting to another. It is the same
  // URL handleDetails already redirected to, which is why the redirect target
  // stopped being a fragment on the brand kit and started being a page.
  if (path === '/account/details') return sectionGet(context, customer, 'details');
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

  return html(page({ lang, title: t.checkTitle, body: checkEmailBody(t, lang) }));
}

async function sendLoginLink(env, request, email, lang) {
  // lower(email), not email. `email` is already lowercased by the caller, and
  // every row written since August 2026 is lowercase too (functions/api/order.js
  // normalises on the way in) — but rows written BEFORE that are stored exactly
  // as the customer typed them, and one capital letter made this lookup miss
  // silently. The customer saw "check your email" and no email ever came.
  //
  // This used to cost the index on customers.email — lower(email) cannot use a
  // plain column index, so the lookup was a scan. Deliberate at the time, and
  // cheap at this table's size, because the alternative was telling a paying
  // customer their account does not exist.
  //
  // migrations/0009 adds a UNIQUE INDEX on lower(email), and SQLite uses an
  // expression index when the indexed expression matches the WHERE clause
  // verbatim — which it does here, same function, same column. Verified against
  // SQLite: the plan reads `SEARCH customers USING INDEX idx_customers_email_lower`.
  // So this is an index read again, AND two spellings of one address can no
  // longer both exist. Keep the expression exactly as written: wrap it in a
  // TRIM() and the planner silently falls back to the scan.
  //
  // migrations/0008 normalises the historical rows; this line is what makes a
  // database that has run neither still let people in.
  const customer = await env.DB.prepare(
    'SELECT id FROM customers WHERE lower(email) = ?1'
  ).bind(email).first();
  if (!customer) return;

  const { token, tokenHash } = await mintCredential();
  await env.DB.prepare(
    'INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
  ).bind(customer.id, tokenHash, loginTokenExpiry()).run();

  const link = `${requestOrigin(request)}/account/verify/${token}`;
  const { html, text } = magicLinkEmail(lang, link);
  await sendMail(env, {
    to: email,
    subject: lang === 'nl' ? 'Je inloglink voor VISUAILS' : 'Your VISUAILS sign-in link',
    html,
    text,
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

  // Expiry is absolute and comes first: a link past its hour is dead however it
  // got here. Only the already-used case gets a window — see
  // LOGIN_TOKEN_GRACE_MINUTES for why, and why fifteen minutes gives up almost
  // nothing.
  if (!row || isExpired(row.expires_at, null)) {
    return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t) }), 410);
  }
  if (row.used_at && !withinGrace(row.used_at)) {
    return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t) }), 410);
  }

  const { token: sessionToken, tokenHash: sessionHash } = await mintCredential();
  await env.DB.batch([
    // `WHERE used_at IS NULL` is what keeps the window anchored to the FIRST
    // redemption. Without it every re-fetch would restamp used_at and a link
    // being polled by anything would stay alive indefinitely.
    env.DB.prepare("UPDATE account_tokens SET used_at = datetime('now') WHERE id = ?1 AND used_at IS NULL").bind(row.id),
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

/**
 * Is this first-use timestamp recent enough that the link may be redeemed again?
 *
 * account_tokens.used_at is written by D1 as `datetime('now')`, which is
 * "YYYY-MM-DD HH:MM:SS" in UTC with no zone marker — Date.parse() reads that as
 * LOCAL time in most runtimes, which on a Worker is UTC and on a developer's
 * laptop is not. The 'Z' is appended rather than assumed, so this answers the
 * same question in both places instead of quietly granting or refusing an extra
 * hour depending on where it runs.
 *
 * An unreadable stamp returns false — the closed door, same rule isExpired()
 * keeps for an unreadable clock.
 */
function withinGrace(usedAt, now = Date.now()) {
  const raw = String(usedAt || '').trim();
  if (!raw) return false;
  const iso = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) ? raw : `${raw.replace(' ', 'T')}Z`;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return false;
  return now - then <= LOGIN_TOKEN_GRACE_MINUTES * 60000;
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
  // The whole row now, not just the model id: a lock carries a face AND a
  // background since August 2026, and mapping it down to one column here is
  // what would make the background invisible to the renderer.
  const lockByStyle = Object.fromEntries(locks.map((l) => [l.style, l]));

  // Two query strings, read once, in one place. Both are anyone's to type, so
  // neither is trusted with more than it can carry: `saved` decides one
  // sentence of confirmation, and `status` is checked against STATUS's own keys
  // before it reaches a query — an unknown value falls back to "no filter"
  // rather than to an empty list, because a filter nobody can see the name of
  // looks exactly like a customer with no orders.
  let justSaved = false;
  let statusFilter = '';
  try {
    const params = new URL(request.url).searchParams;
    justSaved = params.get('saved') === '1';
    const wanted = String(params.get('status') || '');
    if (Object.prototype.hasOwnProperty.call(STATUS, wanted)) statusFilter = wanted;
  } catch { /* keep the defaults */ }

  let inner, title;
  if (section === 'orders') {
    inner = ordersBody(t, lang, orders, filesByOrder, statusFilter);
    title = t.ordersHeading;
  } else if (section === 'brand') {
    inner = brandKitBody(t, lang, models, lockByStyle);
    title = t.navBrandKit;
  } else if (section === 'details') {
    inner = detailsBody(t, lang, details, justSaved);
    title = t.detH;
  } else if (section === 'plan') {
    inner = planBody(t, customer);
    title = t.planHeading;
  } else {
    inner = overviewBody(t, lang, customer, orders, filesByOrder);
    title = t.navOverview;
  }

  // The per-response style nonce is gone, August 2026, and its absence is the
  // point: the rules it admitted now live in public/account.css, where the
  // stylesheet's own header always said they belonged. style-src is plain 'self'
  // again — one fewer moving part, and no inline <style> to keep in step with a
  // CSP set in a different function.
  const body = shellBody(t, lang, customer, section, inner);
  return html(page({ lang, title, body, full: true }), 200);
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

  // THE BRAND KIT RIDES ALONG, August 2026. Lucas: the standing preferences
  // should "bij een nieuwe bestelling automatisch aangevinkt/ingevuld" staan.
  // /account/me is already fetched by every /start page load, so the locks
  // travel on a request that is happening anyway rather than costing a second
  // round trip — and pipeline.js can fill the pickers from it before the
  // customer has touched anything.
  //
  // Keyed by style, because the order form knows which service it is and would
  // otherwise have to search a list. A failed read is not a failed page: locks
  // default to an empty object, and an order form with no preselection is the
  // behaviour everyone had last week.
  let brandModels = [];
  try {
    const { results } = await env.DB.prepare(
      // MULTIPLE MODELS, and status matters. A brand can have a whole cast —
      // Lucas, August 2026: "klanten kunnen meerdere modellen krijgen" — so
      // this is a list rather than a lookup, ordered oldest first because the
      // face a brand has had longest is the one they think of first.
      //
      // 'in_design' is excluded on purpose. That status means the studio has
      // started a model and it is not finished; offering it as a tile would let
      // a customer order against a face that does not exist yet. A picture is
      // required for the same reason a step further on — a tile with no image
      // is a choice nobody can judge.
      `SELECT id, label FROM custom_models
        WHERE customer_id = ?1
          AND status <> 'in_design'
          AND preview_key IS NOT NULL AND preview_key <> ''
        ORDER BY id ASC LIMIT 24`
    ).bind(customer.customer_id).all();
    brandModels = (results || []).map((m) => ({
      id: m.id,
      label: m.label,
      // A URL rather than a key. The key is an R2 path and never leaves the
      // server — the customer gets a route that checks ownership, the same rule
      // portal.js keeps for a delivered file.
      preview: `/account/models/${m.id}/preview`,
    }));
  } catch { brandModels = []; }

  let locks = {};
  try {
    const { results } = await env.DB.prepare(
      `SELECT l.style, l.roster_model, l.background_hex, l.custom_model_id, m.label AS custom_label
         FROM customer_style_locks l
         LEFT JOIN custom_models m ON m.id = l.custom_model_id
        WHERE l.customer_id = ?1`
    ).bind(customer.customer_id).all();
    for (const l of results || []) {
      locks[l.style] = {
        background: l.background_hex || '',
        model: l.roster_model || '',
        customModel: l.custom_model_id || null,
        customLabel: l.custom_label || '',
      };
    }
  } catch { locks = {}; }

  return json({
    email: row.email || '',
    name: row.name || '',
    brand: row.brand || '',
    phone: row.phone || '',
    website: row.website || '',
    vat: row.vat_number || '',
    background: row.default_background || '',
    backgroundHex: row.default_background_hex || '',
    locks,
    // The brand's own faces, so the order form can offer them beside the ten
    // standard ones. Only models that HAVE a picture: a tile with no image is
    // a grey box a customer has no way to judge, and the studio adding a label
    // before the face exists is a normal intermediate state rather than
    // something the customer should be asked to choose from.
    models: brandModels,
    saved: !!row.details_saved_at,
    label: row.brand || row.name || row.email || '',
  });
}

/**
 * Serve one brand model's preview image to the customer who owns it.
 *
 * Two things this deliberately does NOT do. It does not take an r2_key from
 * the URL — a numeric id is looked up and the key comes off the row, which is
 * the rule portal.js follows for delivered files and admin.js follows for
 * order files. And it does not fall back to a placeholder on a miss: a 404
 * makes a broken tile obvious in the studio's own testing, where a grey square
 * would look like a design decision.
 */
async function handleModelPreviewImage({ request, env }, modelId) {
  if (!env?.DB || !Number.isInteger(modelId)) return new Response('Not found', { status: 404 });
  const customer = await currentCustomer(env, request);
  if (!customer) return new Response('Not found', { status: 404 });

  const row = await env.DB.prepare(
    'SELECT preview_key FROM custom_models WHERE id = ?1 AND customer_id = ?2'
  ).bind(modelId, customer.customer_id).first();
  if (!row?.preview_key || !env.UPLOADS) return new Response('Not found', { status: 404 });

  const obj = await env.UPLOADS.get(row.preview_key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  if (typeof obj.writeHttpMetadata === 'function') obj.writeHttpMetadata(headers);
  // private: this is one brand's face and must never sit in a shared cache.
  headers.set('Cache-Control', 'private, max-age=300');
  return new Response(obj.body, { headers });
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
  const home = '/account/details';

  if (!form) return asJson ? json({ error: 'bad-request' }, 400) : seeOther(home);

  const one = (k) => {
    const v = String(form.get(k) ?? '').trim().slice(0, DETAIL_MAX);
    return v || null;
  };

  // ── THE BACKGROUND COLUMNS ARE WRITTEN ONLY BY A CALLER THAT SENT ONE ─────
  //
  // This endpoint has two callers and, since August 2026, they disagree about
  // whether backgrounds are any of their business. The details FORM no longer
  // asks — Lucas took the field off it because the brand kit answers the same
  // question per service, which is the more specific answer. But /start still
  // posts here when a customer ticks "save my details" at the end of an order
  // (bindSaveOffer in pipeline.js), and that request DOES carry the background
  // they just picked. Saving it is a real feature: it is what makes the next
  // order start on the same ground.
  //
  // An unconditional UPDATE would break one of those two. Keep the columns in
  // it and saving a phone number on this page silently clears a background set
  // during an order. Drop them and the order form's save quietly stops working.
  // So presence decides: a caller that sent a `background` field gets it
  // written, a caller that did not gets the column left exactly as it was.
  // Absent is not the same answer as empty, and this is the one place that
  // distinction is load-bearing.
  const hasBg = form.has('background');
  const rawBg = String(form.get('background') || '');
  // Anything not on the list is the empty answer — "ask me per order" — rather
  // than a 400. BG_IDS comes from backgrounds.js, so a fifth recommended colour
  // becomes storable by adding it there and nowhere else.
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
         ${hasBg ? 'default_background = ?7, default_background_hex = ?8,' : ''}
         details_saved_at = datetime('now'),
         updated_at = datetime('now')
       WHERE id = ?1`
    ).bind(
      customer.customer_id,
      one('name'), one('brand'), one('phone'), one('website'), one('vat'),
      ...(hasBg ? [background, hex] : [])
    ).run();
  } catch {
    return asJson ? json({ error: 'unavailable' }, 503) : seeOther(home);
  }

  // 303 back to the section the form lives on, same rule handleLockUpdate and
  // handleFileReview follow — which since August 2026 is this form's own page
  // rather than the brand kit it used to share. ?saved=1 is what draws the
  // confirmation line: a settings form that redirects to a page identical to
  // the one it left is a form the customer presses twice.
  return asJson ? json({ ok: true }) : seeOther(`${home}?saved=1#details`);
}

/**
 * A six-digit uppercase hex, or null. Mirrors normalizeHex() in
 * src/scripts/pipeline.js — including expanding #EEE, which a brand's own style
 * guide is perfectly likely to be written in — because the value this stores and
 * the value that form resolves have to be the same string. Anything else (a
 * colour name, half a paste, an empty box) is not an answer yet and is stored as
 * none rather than as itself.
 *
 * Reached only by the order form's save now: this page's own details form has no
 * hex field since August 2026, and a STANDING per-service preference is
 * restricted to a colour we offer rather than one a customer types — see
 * handleLockUpdate for why.
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

/**
 * The brand's own faces.
 *
 * preview_key joined the SELECT in August 2026 for one reason: the brand kit
 * now shows these as photographs rather than as names in a dropdown, and
 * whether a row HAS a picture decides two different things on that page — a
 * model with no preview yet is shown as a card that says the studio is still
 * building it, and it is not offered as a face to lock a service to. The key
 * itself never reaches the customer; only its presence does, as `has_preview`.
 * The bytes come from /account/models/:id/preview, which re-reads the row and
 * checks ownership — see handleModelPreviewImage().
 */
async function loadCustomModels(env, customerId) {
  const res = await env.DB.prepare(
    `SELECT id, label, status,
            (preview_key IS NOT NULL AND preview_key <> '') AS has_preview
       FROM custom_models WHERE customer_id = ?1 ORDER BY created_at DESC`
  ).bind(customerId).all();
  return res.results || [];
}

async function loadStyleLocks(env, customerId) {
  const res = await env.DB.prepare(
    'SELECT style, custom_model_id, roster_model, background_hex FROM customer_style_locks WHERE customer_id = ?1'
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
  const home = '/account/brand-kit';

  if (!STYLES.includes(style)) return seeOther(home);

  // AUGUST 2026 — a lock now carries a face and a background, and the face may
  // come from either of two places. The single `face` control encodes which:
  // 'c<id>' is one of this customer's own custom models, 'r<id>' is one of the
  // ten from the shared roster, '' is no preference. One control because from
  // the customer's side it is one question; the prefix is what keeps the two
  // sources apart on the way in.
  const face = String(form?.get('face') || '');
  const bgRaw = String(form?.get('background_hex') || '').trim().toUpperCase();

  let customModelId = null;
  let rosterModel = null;

  if (face.startsWith('c')) {
    const id = Number.parseInt(face.slice(1), 10);
    if (Number.isInteger(id)) {
      // The model must belong to THIS customer. Without this check a forged
      // post could lock a style to another brand's custom_models row — the
      // same "owned?" test portal.js runs before it will touch a file.
      const owned = await env.DB.prepare(
        'SELECT id FROM custom_models WHERE id = ?1 AND customer_id = ?2'
      ).bind(id, customer.customer_id).first();
      if (owned) customModelId = id;
    }
  } else if (face.startsWith('r')) {
    // The roster is a fixed list in our own code, so this is a membership test
    // rather than an ownership one: anything not in ROSTER is discarded rather
    // than stored, so a hand-built post cannot put an arbitrary string where
    // the studio expects a model name.
    const wanted = face.slice(1);
    if (ROSTER.some((m) => modelId(m.name) === wanted)) rosterModel = wanted;
  }

  // Only a background we actually offer. A free hex would be defensible on the
  // order form — the picker there allows one — but a standing preference is
  // read by a human weeks later, and a stored value nobody chose from a list is
  // a value nobody can check.
  const background = BACKGROUNDS.some((b) => b.hex.toUpperCase() === bgRaw) ? bgRaw : null;

  if (!customModelId && !rosterModel && !background) {
    // Everything cleared — back to "ask per order, as usual." Deleting rather
    // than storing three nulls keeps "no row" as the single meaning of "no
    // preference", so nothing downstream has to test for both.
    await env.DB.prepare(
      'DELETE FROM customer_style_locks WHERE customer_id = ?1 AND style = ?2'
    ).bind(customer.customer_id, style).run();
    return seeOther(home);
  }

  await env.DB.prepare(
    `INSERT INTO customer_style_locks (customer_id, style, custom_model_id, roster_model, background_hex, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
     ON CONFLICT(customer_id, style) DO UPDATE SET
       custom_model_id = excluded.custom_model_id,
       roster_model    = excluded.roster_model,
       background_hex  = excluded.background_hex,
       updated_at      = datetime('now')`
  ).bind(customer.customer_id, style, customModelId, rosterModel, background).run();

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

function checkEmailBody(t, lang) {
  // The spam line comes from src/data/mailNote.js — the same sentence the
  // thank-you page and the portal's no-link screen print. See that file for why
  // it is shared rather than written three times.
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.checkTitle)}</h1>
  <p class="lede">${esc(t.checkBody)}</p>
  <p class="mailnote">${esc(mailNote(lang))}</p>
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
// (Six since August 2026 — see the note on the details item in shellBody.)
const ICON_OVERVIEW = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
const ICON_NEW = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
const ICON_ORDERS = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>';
const ICON_BRAND = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="12" height="12"/><rect x="8" y="8" width="12" height="12"/></svg>';
const ICON_PLAN = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="6" width="20" height="13"/><path d="M2 11h20"/></svg>';
const ICON_DETAILS = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

/**
 * Two icons that are NOT nav items and so are not in the five above.
 *
 * ICON_FACE stands in wherever a portrait is missing: the "no preference" tile,
 * a brand model the studio has not photographed yet, and the folded summary of
 * a service with no face set. One glyph for all three on purpose — they are the
 * same fact ("there is no picture here") and drawing them differently would
 * imply three different states.
 *
 * ICON_TICK is the chosen-tile mark. A checked radio needs something a person
 * can see on a photograph: a border alone reads as a hover on a grid of faces,
 * and colour alone would be the sole carrier of state, which account.css's own
 * token notes rule out.
 */
const ICON_FACE = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="4.2"/><path d="M4.5 20.5c0-4 3.4-7.2 7.5-7.2s7.5 3.2 7.5 7.2"/></svg>';
const ICON_TICK = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';

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
    // Six now, not five. "Your details" left the brand kit page in August 2026
    // and a section with its own page needs its own way in — see detH's copy
    // note for why the two were split.
    { key: 'details', href: '/account/details', label: t.navDetails, icon: ICON_DETAILS },
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
  // Each tile now goes somewhere — the same status filter the Orders page
  // gained in August 2026. A count a customer can see and not act on is a
  // number they have to go and re-find by hand; "3 in production" and "show me
  // those 3" are the same intention one click apart. The total goes to the
  // unfiltered list, which is what "all orders" means.
  const stats = [
    [t.ovInProduction, orders.filter((o) => o.status === 'in_production').length, 'in_production'],
    [t.ovHumanCheck, orders.filter((o) => o.status === 'human_check').length, 'human_check'],
    [t.ovDelivered, orders.filter((o) => o.status === 'delivered').length, 'delivered'],
    [t.ovTotal, orders.length, ''],
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
  ${stats.map(([label, n, status]) => {
    const inner = `<span class="stat-n">${n}</span><span class="stat-label">${esc(label)}</span>`;
    // A tile with nothing behind it stays a tile. Linking "0 delivered" to a
    // list that says "no orders with this status" is a click that costs the
    // customer a page load to be told what the 0 already said.
    return n
      ? `<a class="stat is-link" href="/account/orders${status ? `?status=${encodeURIComponent(status)}` : ''}">${inner}</a>`
      : `<div class="stat">${inner}</div>`;
  }).join('')}
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

/**
 * Orders, optionally narrowed to one status — August 2026.
 *
 * Lucas: "een optie die alle statussen van een order kan sorteren. Dus als je
 * op received bijvoorbeeld klikt je alle orders ziet staan gesorteerd op
 * received." So the statuses became a row of links, and the filtering happens
 * HERE rather than in SQL: loadOrders already fetched every order this customer
 * has (the same rows Overview counts and this page lists), so a second,
 * narrower query would be a second round trip to answer a question the data in
 * hand already answers. Admin's list is the opposite case — 200-row cap, every
 * brand — and filters in the query for exactly that reason.
 *
 * EVERY STATUS THIS CUSTOMER HAS, AND NO OTHERS. A chip for a status with zero
 * orders is a dead end that looks like a feature; a customer who has never had
 * anything cancelled should not be invited to view their cancelled orders. The
 * counts are on the chips because a filter you can count before clicking is a
 * filter you can decide against clicking.
 *
 * The active chip is a <span>, not a link to the page you are on, and carries
 * aria-current. "All" is always first and is the way back.
 */
function ordersBody(t, lang, orders, filesByOrder, statusFilter = '') {
  const shown = statusFilter ? orders.filter((o) => o.status === statusFilter) : orders;

  // Insertion order follows STATUS, which is the order the studio moves through
  // them, not the order this customer's rows happen to arrive in.
  const counts = new Map();
  for (const key of Object.keys(STATUS)) {
    const n = orders.filter((o) => o.status === key).length;
    if (n) counts.set(key, n);
  }

  const chip = (href, label, n, active) => active
    ? `<span class="fl-chip is-active" aria-current="true">${esc(label)}${n === null ? '' : ` <span class="fl-n">${n}</span>`}</span>`
    : `<a class="fl-chip" href="${esc(href)}">${esc(label)}${n === null ? '' : ` <span class="fl-n">${n}</span>`}</a>`;

  const filters = counts.size > 1 ? `
<nav class="fl" aria-label="${esc(t.ordersHeading)}">
  ${chip('/account/orders', t.flAll, orders.length, !statusFilter)}
  ${[...counts].map(([key, n]) => chip(
    `/account/orders?status=${encodeURIComponent(key)}`,
    statusLabel(key, lang) || key,
    n,
    statusFilter === key,
  )).join('')}
</nav>` : '';

  const empty = statusFilter
    ? `<p class="empty">${esc(t.flEmpty)} <a href="/account/orders">${esc(t.flClear)}</a></p>`
    : `<p class="empty">${esc(t.emptyOrders)}</p>`;

  return `
<h1>${esc(t.ordersHeading)}${shown.length ? ` <span class="h2-count">(${shown.length})</span>` : ''}</h1>
<p class="lede">${esc(t.ordersLede)}</p>
${filters}
${shown.length ? shown.map((o) => orderCard(t, lang, o, filesByOrder.get(o.id) || [])).join('') : empty}`;
}

/**
 * Brand kit — August 2026, rebuilt as something a brand can look at.
 *
 * WHAT WAS WRONG WITH IT. Lucas, verbatim: "ik wil dat de brand kit veel
 * mooier wordt om in te stellen, dus echt foto's toevoegen bij modellen, het
 * voelt allemaal zo zielloos nu." He is describing a real defect, not a taste.
 * The page asked a brand to choose the face of their product line from a
 * <select> holding ten first names. Nobody can choose a model from a name —
 * the whole thing being decided is what someone looks like. Same for the
 * background: a dropdown reading "Off-white · #F7F5F1" is a colour you have to
 * imagine, on a page whose entire subject is not having to imagine.
 *
 * SO BOTH CONTROLS BECAME THE THING THEY CHOOSE. Faces are portraits, grounds
 * are the colour itself. The radio inputs underneath are unchanged, which is
 * why this is a re-render and not a migration: handleLockUpdate still receives
 * `face` as 'c<id>' | 'r<id>' | '' and `background_hex` as a hex, so the wire
 * format, the validation and the stored row are all exactly as they were.
 *
 * TWO SECTIONS, IN THIS ORDER. The brand's OWN faces first — they are what
 * makes this page theirs rather than ours, and a brand that has commissioned
 * one should see it before it sees our roster. Then the per-service defaults,
 * which is where a face (theirs or ours) and a ground get attached to catalog,
 * lifestyle and video.
 *
 * "YOUR DETAILS" IS NO LONGER HERE. It moved to its own nav item and its own
 * page — see the copy note on detH. A phone number and a VAT line under a
 * gallery of faces were two settings screens sharing one heading.
 */
function brandKitBody(t, lang, models, lockByStyle) {
  return `
<h1>${esc(t.navBrandKit)}</h1>
<p class="lede">${esc(t.bkLede)}</p>
${ownModelsSection(t, lang, models)}
<h2 class="bk-h2">${esc(t.lockH)}</h2>
<p class="lede">${esc(t.lockLede)}</p>
${lockSection(t, lang, models, lockByStyle)}`;
}

/**
 * The brand's own faces, as photographs.
 *
 * WHY A MODEL WITH NO PICTURE IS STILL SHOWN. It is shown, and it is not
 * offered. The studio adds a brand model as a label first and the face arrives
 * later (admin.js's handleAddCustomModel writes status 'in_design' with no
 * preview_key), so "we are building this" is a normal state of some length —
 * days, not seconds. Hiding the row would make a customer who was told their
 * model was underway open this page and see nothing at all. Showing it as a
 * card that says so answers the question the customer actually has. What it
 * must NOT do is appear in the picker below, because a face you cannot see is
 * not a face you can choose — handleMe() draws the same line for the order
 * form, and loadCustomModels' `has_preview` is what both read.
 *
 * THE EMPTY STATE SELLS, at Lucas's direction when asked what it should do for
 * a brand with none: an invitation with a route to the briefing, not a line of
 * regret. It is the only place in the customer dashboard that offers something
 * — which is why it stays one short paragraph and one link, and why the
 * paragraph says what a brand model IS rather than what it costs. The price
 * question belongs on the page the link goes to, where the answer is complete.
 */
function ownModelsSection(t, lang, models) {
  if (!models.length) {
    return `
<section class="bk-own is-empty">
  <div class="bk-empty">
    <span class="bk-empty-fig" aria-hidden="true">${ICON_FACE}</span>
    <div class="bk-empty-text">
      <h2>${esc(t.bkOwnEmptyH)}</h2>
      <p>${esc(t.bkOwnEmptyBody)}</p>
      <a class="btn btn-2nd" href="/${lang === 'nl' ? 'nl/' : ''}start/brand-model">${esc(t.bkOwnEmptyCta)}</a>
    </div>
  </div>
</section>`;
  }

  const cards = models.map((m) => {
    const ready = !!m.has_preview && m.status !== 'in_design';
    return `
<figure class="bk-model${ready ? ' is-ready' : ' is-pending'}">
  ${m.has_preview
    ? `<img class="bk-model-img" src="/account/models/${m.id}/preview" alt="${esc(m.label || '')}" loading="lazy" decoding="async" width="400" height="535">`
    : `<span class="bk-model-img is-blank" aria-hidden="true">${ICON_FACE}</span>`}
  <figcaption>
    <span class="bk-model-name">${esc(m.label || '')}</span>
    <span class="bk-model-state">${esc(ready ? t.bkOwnReady : t.bkOwnPending)}</span>
  </figcaption>
</figure>`;
  }).join('');

  return `
<section class="bk-own">
  <h2 class="bk-h2">${esc(t.bkOwnH)}</h2>
  <p class="lede">${esc(t.bkOwnLede)}</p>
  <div class="bk-models">${cards}</div>
</section>`;
}

/**
 * "Your details" as its own page — August 2026, Lucas's "maak er echt een
 * dashboard van met logische indeling".
 *
 * It is the same form it was inside the brand kit, moved rather than rewritten,
 * minus the two background fields. The #details id stays on the section because
 * handleDetails' redirect targets it and a fragment that resolves to nothing is
 * a scroll position silently lost.
 */
function detailsBody(t, lang, details, justSaved) {
  return `
<h1>${esc(t.detH)}</h1>
<p class="lede">${esc(t.detLede)}</p>
${detailsSection(t, lang, details, justSaved)}`;
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

  const field = (name, label, value, opts = {}) => `
    <div class="det-field">
      <label for="det-${esc(name)}">${esc(label)}${opts.optional ? ` <span class="det-opt">${esc(t.detOptional)}</span>` : ''}</label>
      <input id="det-${esc(name)}" name="${esc(name)}" type="${esc(opts.type || 'text')}" value="${esc(value || '')}" maxlength="${DETAIL_MAX}"${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''} autocomplete="${esc(opts.auto || 'off')}">
      ${opts.hint ? `<span class="det-hint">${esc(opts.hint)}</span>` : ''}
    </div>`;

  return `
<section class="detpanel" id="details">
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
/**
 * The brand kit — one card per service, August 2026.
 *
 * WHAT CHANGED AND WHY. This was a single dropdown per style holding one of the
 * customer's own custom_models rows, and it had a fatal practical problem: a
 * brand that has not commissioned a Brand Model has nothing to put in it, so
 * for almost every customer the whole panel rendered as "no custom models yet"
 * and did nothing at all.
 *
 * Lucas: "klant kan hier bijvoorbeeld achtergrond kleur, vaste/favoriete
 * modellen kiezen. Deze staan dan bij een nieuwe bestelling automatisch
 * aangevinkt/ingevuld." So it now holds three things per service and two of
 * them are available to everybody:
 *
 *   · a face — either one of this brand's own custom models, or one of the ten
 *     from the shared standard roster. One control, both sources, because from
 *     the customer's side it is one question ("who wears our clothes") and
 *     splitting it into two dropdowns would make them choose a category first.
 *   · a background — the ground this brand always uses.
 *
 * THREE SEPARATE FORMS, NOT ONE. Lucas asked for a button per service and this
 * is why that is right rather than merely requested: saving catalog must not
 * quietly rewrite lifestyle. One form per service means one submit changes one
 * row, and a half-filled card cannot overwrite a finished one.
 *
 * IT RENDERS FOR EVERYBODY NOW. The old early return on an empty model list is
 * gone — a brand with no custom models still has a roster and a background to
 * set, which is the whole point.
 */
function lockSection(t, lang, models, lockByStyle) {
  // Only faces a customer can actually see. See ownModelsSection's header: a
  // model still in the making is shown up there and withheld from here.
  const pickable = models.filter((m) => m.has_preview && m.status !== 'in_design');

  const rows = STYLES.map((style, i) => {
    const lock = lockByStyle[style] || {};
    const face = lock.custom_model_id ? `c${lock.custom_model_id}`
      : lock.roster_model ? `r${lock.roster_model}` : FACE_NONE;
    const bg = (lock.background_hex || '').toUpperCase();

    // ── WHAT THE FOLDED CARD SAYS ──────────────────────────────────────────
    // The summary has to answer "what does this service start from" without
    // being opened, or the accordion has hidden the only thing the page is for.
    // So it carries the same two answers the body sets, drawn the same way:
    // the chosen portrait as a thumbnail and the chosen ground as a chip of
    // that colour. An unset service says so in words rather than showing an
    // empty frame — "asked per order" is a real answer, not a missing one.
    const chosenOwn = face.startsWith('c') ? pickable.find((m) => `c${m.id}` === face) : null;
    const chosenRoster = face.startsWith('r') ? ROSTER.find((m) => `r${modelId(m.name)}` === face) : null;
    const faceThumb = chosenOwn
      ? `<img class="bk-sum-face" src="/account/models/${chosenOwn.id}/preview" alt="" loading="lazy" decoding="async" width="96" height="128">`
      : chosenRoster
        ? `<img class="bk-sum-face" src="${esc(chosenRoster.thumb)}" alt="" loading="lazy" decoding="async" width="96" height="128">`
        : '';
    const faceName = chosenOwn ? chosenOwn.label : chosenRoster ? chosenRoster.name : t.bkAsk;
    const bgChip = bg
      ? `<span class="bk-sum-bg" style="--sw:${esc(bg)}" aria-hidden="true"></span>`
      : '';
    const bgMatch = bg ? BACKGROUNDS.find((b) => b.hex.toUpperCase() === bg) : null;
    const bgName = bg ? (bgMatch?.name[lang] || bgMatch?.name.en || bg) : t.bkAsk;

    // A service with NEITHER answer set said "asked per order · asked per
    // order" — the same sentence twice, which reads as a rendering bug rather
    // than as an unset service. One phrase covers both when both are unset.
    const summaryNow = (!face && !bg) ? esc(t.bkAsk)
      : `${esc(faceName)} <span class="bk-sum-dot">·</span> ${esc(bgName)}`;

    // A radio tile. The <input> is first and visually hidden — the label is the
    // control, so the whole portrait is the hit area, and :checked styles the
    // frame around it. Not a <button>: a form with three services, two groups
    // and one submit is exactly what a radio group is, and building it out of
    // buttons would need script this page does not have.
    const faceTile = (value, imgHtml, name, sub, extraClass = '') => `
      <label class="bk-tile${extraClass}">
        <input type="radio" name="face" value="${esc(value)}"${face === value ? ' checked' : ''}>
        ${imgHtml}
        <span class="bk-tile-meta">
          <span class="bk-tile-name">${esc(name)}</span>
          ${sub ? `<span class="bk-tile-sub">${esc(sub)}</span>` : ''}
        </span>
        <span class="bk-tick" aria-hidden="true">${ICON_TICK}</span>
      </label>`;

    const noFaceTile = faceTile(
      FACE_NONE,
      `<span class="bk-tile-img is-blank" aria-hidden="true">${ICON_FACE}</span>`,
      t.bkNoPref,
      t.bkNoPrefFace,
      ' is-none'
    );

    const ownTiles = pickable.map((m) => faceTile(
      `c${m.id}`,
      `<img class="bk-tile-img" src="/account/models/${m.id}/preview" alt="" loading="lazy" decoding="async" width="400" height="535">`,
      m.label || t.bkOwnFig,
      t.bkOwnTag,
      ' is-own'
    )).join('');

    const rosterTiles = ROSTER.map((m) => faceTile(
      `r${modelId(m.name)}`,
      `<img class="bk-tile-img" src="${esc(m.thumb)}" alt="" loading="lazy" decoding="async" width="${m.tw}" height="${m.th}">`,
      m.name,
      (m.traits || []).map((k) => (TRAITS[lang] || TRAITS.en)[k] || k).join(' · ')
    )).join('');

    // The grounds. `--sw` carries the hex to CSS as a custom property rather
    // than as a background declaration, which is what keeps this inside the
    // style-src 'self' CSP: a `style` ATTRIBUTE setting a variable is allowed
    // where an inline <style> block is not, and the rule that consumes it lives
    // in account.css. The hex is also printed as text under the swatch — the
    // colour is the answer, but the value is the contract (see backgrounds.js).
    const bgTiles = [
      `<label class="bk-sw is-none">
         <input type="radio" name="background_hex" value=""${bg === '' ? ' checked' : ''}>
         <span class="bk-sw-chip is-blank" aria-hidden="true"></span>
         <span class="bk-sw-name">${esc(t.bkNoPref)}</span>
       </label>`,
    ].concat(BACKGROUNDS.map((b) => `
      <label class="bk-sw">
        <input type="radio" name="background_hex" value="${esc(b.hex)}"${bg === b.hex.toUpperCase() ? ' checked' : ''}>
        <span class="bk-sw-chip" style="--sw:${esc(b.hex)}" aria-hidden="true"></span>
        <span class="bk-sw-name">${esc(b.name[lang] || b.name.en)}</span>
        <span class="bk-sw-hex">${esc(b.hex)}</span>
      </label>`)).join('');

    // `name="bk"` makes the three cards an exclusive accordion: opening
    // lifestyle closes catalog. That is the difference between a page with one
    // grid of faces on it and a page with thirty-odd. The first card ships
    // open so the page opens ON the photographs rather than on three closed
    // rows — DESIGN.md's disclosure rule allows folding what only some readers
    // ask for, and it also says a page must not fold the thing it is for.
    return `
<details class="bk-card" name="bk"${i === 0 ? ' open' : ''}>
  <summary class="bk-sum">
    <span class="bk-sum-figs">
      ${faceThumb || `<span class="bk-sum-face is-blank" aria-hidden="true">${ICON_FACE}</span>`}
      ${bgChip || `<span class="bk-sum-bg is-blank" aria-hidden="true"></span>`}
    </span>
    <span class="bk-sum-text">
      <span class="bk-sum-h">${esc(styleLabel(style))}</span>
      <span class="bk-sum-now">${summaryNow}</span>
    </span>
    <span class="bk-sum-cta">${esc(t.bkChange)}</span>
  </summary>
  <form class="bk-form" method="post" action="/account/lock">
    <input type="hidden" name="style" value="${esc(style)}">
    <fieldset class="bk-group">
      <legend>${esc(t.bkFaceLede)}</legend>
      <div class="bk-tiles">${noFaceTile}${ownTiles}${rosterTiles}</div>
    </fieldset>
    <fieldset class="bk-group">
      <legend>${esc(t.bkBgLede)}</legend>
      <div class="bk-sws">${bgTiles}</div>
    </fieldset>
    <div class="bk-actions">
      <button class="btn btn-primary" type="submit">${esc(t.lockSave)}</button>
    </div>
  </form>
</details>`;
  }).join('');

  return `<div class="bk-cards">${rows}</div>`;
}

function styleLabel(style) {
  // A one-word label per style id. Three of the ids ('catalog', 'lifestyle',
  // 'video') are also service names, so the shared map in src/data/services.js
  // answers for them rather than the words being typed a second time; anything
  // else falls through to the id, which is what this did before that map moved
  // out of this file.
  return serviceLabel(style, 'en') || style;
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
function page({ lang, title, body, full = false }) {
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
</head>
<body${full ? ' class="has-shell"' : ''}>
${full ? body : `<div class="wrap">\n${body}\n</div>`}
</body>
</html>`;
}

// The saved-details panel's rules used to live here as an inline <style>,
// admitted by a per-response CSP nonce, because the task that wrote them did
// not own public/account.css. That block's own comment asked whoever was free
// to touch the stylesheet to move it there verbatim and delete the nonce
// plumbing with it. August 2026 did both: the rules are in account.css beside
// every other rule this page uses, page() has no <style>, and style-src is
// plain 'self'.

/** Same header set and reasoning as portal.js's html() — no script on this page, so default-src 'none' is a fact, not an aspiration. */
function html(body, status = 200, extraSetCookies = []) {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      `default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
  });
  for (const c of extraSetCookies) headers.append('Set-Cookie', c);
  return new Response(body, { status, headers });
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
/**
 * The sign-in link, as both halves of the message.
 *
 * RETURNS { html, text } RATHER THAN A STRING, since August 2026, after a
 * customer's link went to spam. sendMail() will derive a text part from HTML
 * when it has to, and for this one message it should not have to: this is the
 * mail whose whole content is one link, which is the exact shape a filter is
 * most suspicious of, and a hand-written text half that reads like a person
 * wrote it does more here than a derived one. It also prints the URL in full,
 * so a customer whose client strips the button still has something to copy.
 *
 * THE DURATION IS READ, NOT TYPED. This copy said "works once and expires in 30
 * minutes" while the token had already moved to an hour with a fifteen-minute
 * reuse window — so the mail was telling customers something the code no longer
 * did, on the one screen where being wrong costs a sign-in. "Once" is gone too:
 * it stopped being true when the grace window landed, and the honest line is
 * the one that names the hour.
 */
export function magicLinkEmail(lang, link) {
  const mins = LOGIN_TOKEN_TTL_MINUTES;
  const hours = mins % 60 === 0 ? mins / 60 : null;
  const copy = lang === 'nl'
    ? {
        h: 'Je inloglink',
        p: `Klik op de link hieronder om in te loggen bij je VISUAILS-account. De link blijft ${hours === 1 ? 'een uur' : `${mins} minuten`} geldig.`,
        b: 'Inloggen',
        f: 'Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets aan je account.',
        alt: 'Werkt de knop niet? Kopieer deze link in je browser:',
      }
    : {
        h: 'Your sign-in link',
        p: `Click the link below to sign in to your VISUAILS account. The link stays valid for ${hours === 1 ? 'an hour' : `${mins} minutes`}.`,
        b: 'Sign in',
        f: 'Did not request this? You can ignore this email — nothing about your account changes.',
        alt: 'Button not working? Copy this link into your browser:',
      };

  // THE URL APPEARS TWICE ON PURPOSE — once behind the button, once as copyable
  // text — and tests/account-signin.test.mjs asserts exactly that. A client that
  // strips the button, or a reader moving from phone to desktop, needs the
  // second one.
  const html = mailShell({
    lang,
    // Not the subject line again: the inbox prints the two next to each other.
    preheader: lang === 'nl'
      ? 'Eén klik en je bent binnen — de link verloopt vanzelf.'
      : 'One click and you are in — the link expires on its own.',
    body: [
      mailH1(copy.h),
      mailP(copy.p),
      mailButton(link, copy.b),
      '<div style="height:22px;font-size:0;line-height:0">&nbsp;</div>',
      mailP(`${copy.alt}<br><a href="${link}" style="color:#6B7078;word-break:break-all">${link}</a>`, { muted: true }),
      mailNote2(copy.f),
      '<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>',
      mailSpamNote(lang),
    ].join(''),
  });

  const text = `${copy.h}

${copy.p}

${link}

${copy.f}

VISUAILS · Enschede, NL · hello@visuails.com`;

  return { html, text };
}
