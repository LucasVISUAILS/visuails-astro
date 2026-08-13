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
// the same defence applies: SameSite (Lax here — see setSessionCookie for why a
// magic link cannot use Strict) plus an Origin check on every
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
import { notifyRevision } from './notify.js';
import { clearUploadRetention } from './retention.js';
import { checkRate, clientIp, shouldSweep, sweepRateLimits } from './ratelimit.js';
import { sendMail } from './mail.js';
import {
  PER_PRODUCT,
  canReviewOrder,
  canSeeReviewHistory as historyAllowed,
  SAMPLE_SERVICE,
  TEST_SAMPLE,
} from '../data/pricing.js';
import { RECOMMENDED as BACKGROUNDS, CUSTOM_ID as BG_CUSTOM } from '../data/backgrounds.js';
import { ROSTER, modelId, TRAITS } from '../data/models.js';
// De kanaallijst staat op één plek. Hier alleen de ids om tegen te valideren
// en de namen om te tonen — welke kanalen wit eisen is de zaak van
// syncChannels() in pipeline.js, niet van dit bestand.
import { CHANNELS, CHANNEL_IDS, channelName } from '../data/channels.js';
import { mailNote } from '../data/mailNote.js';
// Afronden staat sinds 8 augustus 2026 in zijn eigen bestand omdat portal.js
// hem óók nodig heeft — zie de kop van close.js. Hier stond dezelfde functie
// als `maybeClose`; alleen dit bestand riep hem aan en dat was de bug.
import { maybeCloseOrder } from './close.js';
import { issueInvoice } from './invoice.js';
import { feedbackBlock, loadFeedback, handleFeedbackPost } from './feedback.js';
// Waarom een 303 naar buiten hier niet werkt en een tussenpagina wel: zie de kop
// van offsite.js. Kort: form-action 'self' in de CSP van deze pagina geldt óók
// voor de redirect ná de post, dus een 303 naar Mollie of Google wordt door de
// browser geblokkeerd — stil, met een lege pagina, en met een foutmelding die
// onze eigen url noemt.
import { offsitePage } from './offsite.js';
import { serviceLabel } from '../data/services.js';
import { WHATSAPP_NUMBER } from '../data/whatsapp.js';
import { countryOptions, vatShort, VAT_TREATMENT, REVIEW } from '../data/vat.js';
import { composeName, composeAddress, addressFromFields, ADDRESS_FIELDS } from '../data/address.js';
import { createOrderMolliePayment } from './mollie.js';
import { centsToMollieValue, paymentDescription, isPayableService, ladderKey, VAT_RATE } from './quote.js';
import { zipStream, zipDisposition, ZIP_MAX_BYTES, ZIP_MAX_FILES } from './zip.js';
// Eén bouwer voor het archief, gedeeld met portal.js. Zie de kop van delivery.js:
// deze twee schermen hadden elk hun eigen query over dezelfde levering en die
// waren al uit elkaar gelopen.
import { loadDeliveryFiles, deliveryEntries, deliverySummary, humanBytes } from './delivery.js';
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

/*
 * ── DE ZESCIJFERIGE CODE NAAST DE LINK — 7 augustus 2026 ────────────────────
 *
 * Lucas: *"Dan hoeft niemand van mailapp naar browser te springen, wat op
 * mobiel precies de plek is waar mensen afhaken."* Diezelfde mail draagt nu
 * bovenaan zes cijfers; de wachtpagina heeft een invoerveld, dus de klant blijft
 * staan waar hij al stond.
 *
 * DRIE GETALLEN, EN ZE DRAGEN SAMEN DE VEILIGHEID. Zes cijfers zijn maar twintig
 * bits — dat is op zichzelf niets. Wat het houdbaar maakt:
 *
 *   TIEN MINUTEN, korter dan het uur van de link. Die link moet een mailscanner
 *   en een omweg over de desktop overleven; de code wordt overgetypt terwijl je
 *   ernaar kijkt.
 *
 *   VIJF POGINGEN, en dan is de code dood. Niet het account, en niet de link in
 *   dezelfde mail — die is 128 bits en valt niet te raden, dus die laten
 *   sterven zou alleen de klant treffen. Vijf kansen op een miljoen binnen tien
 *   minuten is geen aanvalspad.
 *
 *   EN ELKE NIEUWE POGING KOST EEN MAIL in het postvak van het slachtoffer,
 *   bovenop de bestaande LOGIN_LIMIT per IP. Volhouden is luidruchtig.
 *
 * WAT DIT NADRUKKELIJK NIET IS: een pincode die de klant zelf kiest. Dat was
 * het eerste voorstel en het is een wachtwoord van zes cijfers — mensen kiezen
 * niet uit een miljoen maar uit een handvol, dus een aanvaller hoeft er een paar
 * honderd te proberen. Zie migrations/0017 voor het volledige argument.
 */
const LOGIN_CODE_TTL_MINUTES = 10;
const LOGIN_CODE_MAX_ATTEMPTS = 5;
/** Losser dan LOGIN_LIMIT: een verkeerd overgetypte code is normaal, een mail versturen niet. */
const CODE_LIMIT = 30;

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
const ZIP_LIMIT = 12;
const FILE_LIMIT = 300;
/** Logout, the lock form, and per-file review actions. */
const POST_LIMIT = 20;

/** Longest revision note this file accepts — same cap as portal.js's NOTE_MAX, so a client typing the same note in either place never hits a different wall. */
const NOTE_MAX = 2000;

/**
 * Het nummer waar een klant ons echt kan bereiken, zonder de +.
 *
 * Lucas: *"misschien ook link naar whatsapp voor persoonlijke support wanneer
 * nodig."* Dat hoort bij de revisie: een formulier is goed voor "de achtergrond
 * moet wit" en hopeloos voor "ik weet niet goed hoe ik het moet zeggen, kijk
 * even mee". Het staat daarom in de uitgeklapte productkaart en niet in de kop
 * van het dashboard — bij de foto waar het over gaat, niet als algemene
 * uitnodiging om te bellen.
 *
 * Het nummer stond hier los, met de noot "op termijn is één bron beter; die
 * staat in een datamap die deze Worker niet importeert". Dat argument was al
 * niet meer waar toen het werd opgeschreven — deze Worker importeert
 * ../data/pricing.js, ../data/models.js en ../data/services.js — en het is nu
 * helemaal weg: src/data/whatsapp.js is een kale ESM-module zonder afhankelijk-
 * heden, dus hij draait net zo goed in de Worker als in de build.
 */

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
    // "Enter the email you order under" — Lucas, 7 augustus: *"is die zin niet
    // heel raar onder sign in."* Ja. "Order under" is geen Engels dat iemand
    // spreekt, en de tweede helft was drie losse mededelingen achter elkaar. De
    // zin heeft maar twee dingen te doen: zeggen WELK adres, en wegnemen dat je
    // een wachtwoord staat te zoeken dat je nooit hebt gehad.
    // Noemt allebei sinds 7 augustus 2026, want de mail draagt allebei. Een
    // scherm dat een link belooft en een codeveld toont, is hetzelfde
    // verschil dat de mail zelf ook had.
    loginLede: 'Use the email address you ordered with and we\u2019ll send you a code and a link to sign in. There is no password.',
    // WIE HIER KAN INLOGGEN, EN WAAROM DAT ER STAAT. Er is geen aanmeldknop:
    // een account ontstaat bij een bestelling, en verder nergens. Wie dat niet
    // weet, vult zijn adres in, krijgt "check je e-mail", en wacht op een mail
    // die nooit komt — want het antwoord is met opzet hetzelfde of het adres nu
    // bestaat of niet (zie handleLoginPost over accountopsomming). Deze zin is
    // wat die stilte verklaarbaar maakt vóórdat hij valt.
    //
    // "Geplaatst", niet "betaald": de klantrij wordt aangemaakt op het moment
    // dat de bestelling binnenkomt (functions/api/order.js, upsertCustomer),
    // dus iemand met een openstaande betaling kán inloggen en hoort dat ook te
    // kunnen — daar staat zijn betaallink.
    loginWho: 'Your account is made when you place an order. There is no separate sign-up, so this only works with an address that has ordered with us.',
    loginEmailLabel: 'Email',
    loginSubmit: 'Send my code',
    loginTooMany: 'Too many attempts. Wait a minute and try again.',

    checkTitle: 'Check your email',
    // THE LIFETIME IN THIS SENTENCE WAS A LIE FOR ONE BUILD. It said "works
    // once, and for 30 minutes" while the token had already moved to an hour
    // with a fifteen-minute reuse window — the change that stopped corporate
    // mail scanners burning links before the customer clicked them. The mail
    // itself was updated and reads its wording from LOGIN_TOKEN_TTL_MINUTES;
    // this screen, which the customer is looking at while they wait, was not.
    // It is built from the constant now, so the two cannot disagree again.
    // Noemt allebei, want er staat allebei in de mail en het veld eronder vraagt
    // om de code. Hoe lang ze leven staat in de hint onder het veld, waar het
    // hoort bij de handeling in plaats van bij de mededeling.
    checkBody: 'If that address has ordered with us before, an email with a six-digit code and a sign-in link is on its way.',

    // ── DE ZESCIJFERIGE CODE ──────────────────────────────────────────────────
    // Elke zin hier moet hetzelfde zeggen tegen iemand die zich vertypte en
    // tegen iemand die aan het raden is: nergens staat of het adres bestaat.
    codeLabel: 'Type the code from that email',
    codeSubmit: 'Sign in',
    codeHint: (mins) => `The code is valid for ${mins} minutes. The link in the same email keeps working for an hour.`,
    codeShape: 'A code is six digits.',
    // ÉÉN ZIN VOOR ELKE MISSER, en dat is een besluit dat een test heeft
    // afgedwongen. Er stond eerst hoeveel pogingen er nog over waren, wat
    // vriendelijker leest — maar die teller verschijnt alleen bij een adres dat
    // BESTAAT. Typ een willekeurig adres met een willekeurige code, kijk of er
    // een teller komt, en je weet wie hier klant is. Dat is precies de
    // account-opsomming die de rest van dit bestand overal vermijdt. Nu zegt
    // deze zin hetzelfde tegen iedereen: onbekend adres, verkeerde code,
    // verlopen code, opgebruikte code.
    codeWrong: 'That code does not work. Use the link in the same email, or ask for a new one below.',
    codeAgain: 'Send a new email',
    codeAgainCta: 'Send a new code',
    codeTooMany: 'Too many attempts from here. Wait a minute, or use the link in the email.',
    codeUnavailable: 'Codes are not switched on yet — use the link in the email.',
    badLinkTitle: 'This link does not work',
    badLinkBody: 'It may have expired, already been used, or been mistyped. Request a new one below.',

    // Sits under the wordmark in the sidebar (shellBody) — dashTitle/dashLede
    // from the single-page dashboard are gone; Overview has its own welcome
    // copy now (ovWelcome/ovLede below) that says more than a static subtitle
    // could.
    // ── DE NAAM VAN DIT SCHERM (8 augustus 2026) ──────────────────────────
    // Lucas: *"Ik wil dat het dashboard de naam VISUAILS Studio krijgt."* Dit is
    // wat er onder het woordmerk in de zijbalk staat, dus dit IS de naam.
    //
    // Eén naam, niet drie. Hier stond 'Studio Dashboard', de homepage noemde het
    // 'Jouw portaal', de voettekst 'Het klantportaal' en de cookietekst 'het
    // klantenportaal' — vier namen voor één scherm.
    //
    // EN JOUW EIGEN KANT IS DAAROM OMGEDOOPT. 'Studiodashboard' was tot vandaag de
    // naam van het ADMINportaal, op vier plekken. Twee schermen met het woord
    // studio in hun naam is precies de verwarring die dit moest oplossen; die
    // heten nu Adminportaal. Zie StudioPage.astro en HomeV2.astro.
    dashSub: 'VISUAILS Studio',

    // Doubles as the Orders sidebar nav label — see shellBody — so there is
    // one word for "Orders" in this file, not two that could drift apart.
    ordersHeading: 'Orders',
    emptyOrders: 'Nothing here yet — your first order will show up the moment it comes in.',
    fRef: 'Reference',
    fService: 'Service',
    fPlaced: 'Placed',
    fWindow: 'Delivery',
    // Voor een bestelling onder de drempel: geen datum, want die bestaat niet
    // voor deze trede. Dezelfde belofte als TIERS.unattended.turnaround in
    // pricing.js, in één regel op de kaart.
    fQueue: 'Standard turnaround — usually 2–4 working days.',
    fProducts: 'Products',
    windowPending: 'Being scheduled',

    filesHeading: 'Files',
    emptyFiles: 'Not delivered yet.',
    sideDelivered: 'What we delivered',
    sideUploaded: 'What you uploaded',
    emptyUploads: 'No photos on file for this order.',
    bDownloadAll: 'Download the folder',
    // De kaart die de losse downloadknoppen vervangt. Wat erin zit staat erbij,
    // want een knop met "download" erop en niets eromheen laat de klant gokken of
    // hij het goede formaat krijgt.
    folderH: 'Your files',
    folderBody: 'One folder per product, and in it the same visual as PNG, JPG and WebP — so a print shop, a shop page and a feed each get the file they want without anyone resizing anything.',
    folderReview: 'The photos above are review copies, at screen size. They are there to approve or to point at when something is wrong. The folder holds the real files.',
    revokedNote: 'Revision requests are paused on this account. Message us and we will sort it out.',
    // Waarom er onder een proefvisual geen knoppen staan. Zie canReviewOrder()
    // in pricing.js: dit is de enige bestelling zonder, en dan hoort er een zin
    // te staan in plaats van een gat.
    //
    // Het bedrag komt uit TEST_SAMPLE en wordt hier niet getypt. Het stond hier
    // wél met de hand, en toen de prijs 8 augustus 2026 van € 0,99 naar € 1 ging
    // waren dit de twee plekken op de hele site die het mis hadden — precies het
    // soort fout dat geen build tegenhoudt, want een verkeerd bedrag is nog altijd
    // een geldige string.
    sampleNote: `This is the ${TEST_SAMPLE.en.price} test sample, so there is nothing to approve — but tell us what you think and we will answer.`,
    closedNote: 'You approved everything in this order. Changed your mind? Undo it below.',
    // Anders dan closedNote: die nodigt uit om iets terug te draaien. Deze zegt
    // dat dat niet meer aan de orde is — geen besluit op dit beeld, of de
    // bewaartermijn van de bestelling is voorbij. Zie reopenable().
    settledNote: 'This order is finished. Everything here stays downloadable — message us if something is still not right.',

    // Geld. Netto en btw apart, want dat is wat er op de factuur staat en het is
    // het enige wat een boekhouder zoekt.
    payNet: 'Excl. VAT',
    payVat: 'VAT',
    payTotal: 'Total',
    payRefunded: 'Refunded',
    payRefundedNote: 'This order was refunded.',
    payPaid: 'Paid.',
    payPaidOn: (day) => `Paid on ${day}.`,
    payDue: 'Not paid yet.',
    payDueBy: (day) => `Not paid yet — your slot is held until ${day}.`,
    payNow: 'Pay now',
    payFailed: 'We could not open the payment screen. Try again in a minute, or message us.',
    /* De melding als de btw-poort de bestelling vasthoudt. Geen woord over fraude
       of controle: voor de klant is dit een administratieve stap, en de meeste
       klanten die hier belanden hebben niets verkeerd gedaan — ze zitten alleen
       buiten de EU, waar geen register bestaat om hun opgave in na te kijken. */
    payHeld: 'We are checking the VAT details on this order before it can be paid. That is a manual step on orders outside the EU, because there is no register we can look them up in. You will hear from us within one working day.',
    shotNames: { front: 'Front', back: 'Back', detail: 'Detail', worn: 'On a model' },
    bView: 'View',
    bDownload: 'Download',

    // lockHeading ('Brand lock') from task #257 is gone — navBrandKit below
    // is now both the nav label AND the section page's <h1>.
    //
    // 2026-08-08: die sectie heette tot vandaag "Brand kit". Lucas: *"brand kit
    // ook aanpassen naar iets logisch"*. Twee dingen waren mis. Het was het
    // enige Engelse label in een Nederlandse navigatie naast Overzicht,
    // Bestellingen en Je gegevens. En het zei niet wat erachter zat — een
    // bezoeker moest de pagina openen om te weten dat het over het gezicht en
    // de achtergrond van zijn beelden gaat. De lede eronder zei het al goed
    // ("de look waar je bestellingen mee beginnen"), dus die woorden zijn nu de
    // naam: "Je vaste look" / "Your look".
    //
    // Het pad blijft /account/brand-kit. Dat staat in inloglinks in mails die
    // al verstuurd zijn, en een naam die verandert is geen reden om een link te
    // laten breken.
    //
    // De sectie heeft twee panelen — details, dan dit — dus de lock-helft heeft
    // een eigen kop nodig. NOT de naam van de pagina zelf (dat is de h1 en het
    // navlabel) en deliberately niet het oude "Brand lock" either, for the
    // reason the note below still gives. It names what the panel does.
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
    bkOwnEmptyCta: 'See what a brand model needs',
    bkOwnPending: 'In the making',
    bkOwnReady: 'Ready to use',
    bkOwnTag: 'Yours only',
    // On a folded service card: what this service currently starts from.
    bkAsk: 'Asked per order',
    bkChange: 'Change',
    bkFaceLede: 'Who wears it',
    bkBgLede: 'What it sits on',
    bkChLede: 'Where you sell it',
    bkChHint: 'Only on catalog for now. Pick a marketplace that requires a pure white main image and every order starts on white — Amazon and bol check that automatically on their side.',
    bkChNone: 'Asked per order',
    bkNoPref: 'No preference',
    bkNoPrefFace: 'Ask me per order',
    bkOwnFig: 'Your model',

    // Saved order details, August 2026 — and its own nav item since Lucas's
    // "maak er echt een dashboard van met logische indeling". It shared the
    // vaste-look-pagina for exactly as long as that section was two dropdowns:
    // once that page became a picture of the brand's faces and grounds, a
    // phone number and a VAT line sitting under it were a second, unrelated
    // settings screen wearing the first one's heading. Two concerns, two pages.
    detH: 'Your details',
    detLede: 'Saved once, filled in on every order. Change anything here and the next order picks it up.',
    detFirst: 'First name',
    detLast: 'Last name',
    detBrand: 'Brand or shop name',
    detEmail: 'Email',
    // Says WHY the field above it is not editable, in the customer's terms.
    // See the file header: this address is the login credential.
    detEmailNote: 'This is what you sign in with, so it changes only by ordering under a new address. Email us and we will move it.',
    detPhone: 'Phone or WhatsApp',
    detWebsite: 'Website or shop link',
    detVat: 'VAT number',
    detVatHint: 'A business in another EU country: we check it against VIES, and if it is valid no Dutch VAT is charged.',
    detNoVat: 'I do not have a VAT number',
    detMissing: 'One of the fields above is still empty. Everything except the ones marked optional has to be filled in — it all ends up on your invoice.',
    detFailed: 'We could not save that just now. Try again in a moment — nothing was changed.',
    // Zelfde woorden als op het bestelformulier (OrderFlow.astro) — twee
    // schermen die naar hetzelfde vragen, vragen het hetzelfde.
    detCountry: 'Country',
    detCountryPick: 'Choose a country',
    detCountryEu: 'European Union',
    detCountryOther: 'Elsewhere',
    detCountryHint: 'This decides the VAT on your invoice, so it is worth getting right.',
    // Vier velden sinds 7 augustus 2026 — zie migrations/0016. Dezelfde woorden
    // als op het bestelformulier, want twee schermen die naar hetzelfde vragen
    // horen het op dezelfde manier te vragen.
    detStreet: 'Street and number',
    // Voorbeeldtekst, geen bestaand adres. Hier stond het huisadres van de
    // eigenaar; zie de noot in FigDash.astro van 8 augustus 2026.
    detStreetPh: 'Voorbeeldstraat 12',
    detStreet2: 'Addition',
    detStreet2Ph: 'Unit, floor, c/o',
    detPostal: 'Postcode',
    detPostalPh: '1234 AB',
    detCity: 'City',
    detRegion: 'State or province',
    detRegionHint: 'Only where an address needs one — most of Europe does not.',
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
    navBrandKit: 'Your look',
    navDetails: 'Your details',
    navPlan: 'Plan & billing',

    // Overview — the landing section. Counts are real, all-time totals, not
    // a monthly figure: there is no billing cycle to anchor "this month" to
    // (see planLede below), and a fabricated period reads as a promise this
    // site cannot keep.
    ovWelcome: 'Welcome back',
    ovLede: 'A quick look at your orders and files.',
    ovInProduction: 'In production',
    ovHumanCheck: 'Being checked',
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
    bSend: 'Send this note',
    askSummary: 'Something is not right',
    askLabel: 'What should change?',
    askHint: 'In your own words. The more specific, the faster we get it right.',
    stApproved: 'Approved',
    stExpired: 'Removed after the storage period — ask us if you still need it',
    // Per product, sinds augustus 2026. prodLabel krijgt het nummer als string
    // binnen omdat product_key 'p3' is en niet 3 — het omzetten hoort bij de
    // sleutel, niet bij de zin.
    prodLabel: (n) => `Product ${n}`,
    prodOther: 'Other images',
    prodDelivered: (n) => (n === 1 ? '1 image delivered' : `${n} images delivered`),
    prodApproved: (n) => `${n} approved`,
    prodNothingYet: 'Nothing delivered for this one yet.',
    prodWeMade: 'What we delivered',
    prodYouSent: 'What you sent',
    prodOpen: 'See the photos',
    prodClose: 'Close',
    // De tijdlijn. Deze zinnen zijn wat de klant leest in plaats van de
    // kolomwaarde: 'human_check' is een woord uit onze werkverdeling.
    flowNowLabel: 'Right now:',
    flowNow: {
      received: 'We have your order and your files. We are scheduling it in.',
      in_production: 'Our studio is making your images.',
      human_check: 'Someone is going through every image before it reaches you.',
      delivered: 'Your images are ready. Look them over and tell us if anything is off.',
      cancelled: 'This order was cancelled. Nothing is being made for it.',
    },
    flowStep: { received: 'Received', in_production: 'In production', human_check: 'Checked by a person', delivered: 'Delivered' },
    flowWindow: (from, to) => (from === to ? `Planned for ${from}.` : `Planned for ${from} – ${to}.`),
    flowHistory: 'Everything that happened',
    noteFrom: 'From the studio',
    ovNowTitle: 'Your latest order',
    ovOthers: (n) => (n === 1 ? '1 more order in progress' : `${n} more orders in progress`),
    ovOpenOrder: 'Open this order',
    prodHelp: 'Hard to put in writing? Show us instead —',
    prodHelpCta: 'message us on WhatsApp',
    ovLatest: 'Latest visuals',
    // Geen eigen "bekijk alles" naast ovViewAll: twee links naar dezelfde
    // pagina met verschillende bewoording leest als twee bestemmingen.
    ovLatestEmpty: 'Your delivered visuals will appear here.',
    detPhoneHint: 'Add a WhatsApp number and we can reach you there about an order — a question about a photo answered in a minute instead of a mail thread.',
    waNudgeTitle: 'Get updates on WhatsApp',
    waNudgeBody: 'Add your number and we can send order updates and quick questions straight to WhatsApp. Nothing changes if you leave it empty — email keeps working.',
    waNudgeCta: 'Add your number',
    stRevision: 'Revision requested',
    // Kort, want deze twee staan als vlaggetje ÓP de foto en als knop ONDER
    // een tegel van 132 pixels. De lange vorm blijft in de kop van het
    // product staan, waar de ruimte er wel is.
    stRevisionShort: 'Revision',
    bCancelShort: 'Cancel',

    planHeading: 'Plan & billing',
    planLede: 'You are billed per order — there is no subscription to manage yet.',
    planAccountLabel: 'Account',
    planEmailLabel: 'Email',
    planBrandLabel: 'Brand',
    planNote: 'Questions about pricing or an invoice? Reply to any order email, or reach us at hello@visuails.com.',

    navInvoices: 'Invoices',
    invHeading: 'Invoices',
    invLede: 'Every paid order has an invoice here. Download it as a PDF for your own records.',
    invEmpty: 'There is nothing here yet. An invoice appears as soon as an order is paid.',
    invEmptyUnpaid: 'No invoices yet. Your order has one as soon as the payment comes through.',
    invNumber: 'Invoice',
    invDate: 'Date',
    invOrder: 'Order',
    invAmount: 'Amount',
    invDownload: 'Download PDF',
    invPending: 'Being prepared',
    invPendingNote: 'This invoice has its number and the document is still being made. Refresh in a minute; if it stays like this, send us a line.',
    invVoid: 'Withdrawn',
    invReverse: 'VAT reverse charged',
    /* Het merkteken naast het nummer. Zonder dit woord is een creditnota in dit
       overzicht niet van een factuur te onderscheiden, en dan lijkt een terugbetaling
       op een tweede rekening. */
    invCredit: 'Credit note',
    invOutside: 'Outside European VAT',
    invKeepNote: 'Invoices stay available here for as long as your account exists. Dutch law requires us to keep them for seven years, so they do not disappear with your files.',

    signOut: 'Sign out',
    footAsk: 'Anything else,',
    dbDown: 'We cannot reach your account right now. This is our end, not yours — try again in a few minutes.',
    notFound: 'This page does not exist. Go back to your overview.',
  },

  nl: {
    loginTitle: 'Inloggen',
    loginLede: 'Vul het e-mailadres in waarmee je hebt besteld, dan sturen we je een code en een inloglink. Een wachtwoord heb je niet nodig.',
    loginWho: 'Je account ontstaat zodra je een bestelling plaatst. Aanmelden kan niet apart, dus dit werkt alleen met een adres waarmee al besteld is.',
    loginEmailLabel: 'E-mail',
    loginSubmit: 'Stuur mijn code',
    loginTooMany: 'Te veel pogingen achter elkaar. Wacht een minuut en probeer het dan opnieuw.',

    checkTitle: 'Check je e-mail',
    // Zie de EN-regel: allebei genoemd, en de duur staat bij de handeling.
    checkBody: 'Als dat adres al eerder bij ons besteld heeft, is er een mail onderweg met een code van zes cijfers en een inloglink.',

    codeLabel: 'Vul de code uit die mail in',
    codeSubmit: 'Inloggen',
    codeHint: (mins) => `De code is ${mins} minuten geldig. De link in dezelfde mail blijft een uur werken.`,
    codeShape: 'Een code bestaat uit zes cijfers.',
    // Zie de Engelse tak: één zin voor elke misser, zodat er niets te lezen
    // valt over of het adres bestaat.
    codeWrong: 'Die code werkt niet. Gebruik de link in dezelfde mail, of vraag hieronder een nieuwe aan.',
    codeAgain: 'Nieuwe mail sturen',
    codeAgainCta: 'Stuur een nieuwe code',
    codeTooMany: 'Te veel pogingen vanaf hier. Wacht even, of gebruik de link in de mail.',
    codeUnavailable: 'Codes staan nog niet aan — gebruik de link in de mail.',
    badLinkTitle: 'Deze link werkt niet',
    badLinkBody: 'Mogelijk is hij verlopen, al gebruikt, of verkeerd overgetypt. Vraag hieronder een nieuwe aan.',

    dashSub: 'VISUAILS Studio',

    ordersHeading: 'Bestellingen',
    emptyOrders: 'Hier staat nog niets — je eerste bestelling verschijnt zodra hij binnenkomt.',
    fRef: 'Referentie',
    fService: 'Dienst',
    fPlaced: 'Geplaatst',
    fWindow: 'Levering',
    fQueue: 'Normale doorlooptijd — meestal 2–4 werkdagen.',
    fProducts: 'Producten',
    windowPending: 'Wordt ingepland',

    filesHeading: 'Bestanden',
    emptyFiles: 'Nog niet geleverd.',
    sideDelivered: 'Wat wij leverden',
    sideUploaded: 'Wat jij uploadde',
    emptyUploads: 'Geen foto’s bij deze bestelling.',
    bDownloadAll: 'Download de map',
    folderH: 'Jouw bestanden',
    folderBody: 'Eén map per product, en daarin hetzelfde beeld als PNG, JPG en WebP — zo krijgt een drukker, een productpagina en een feed elk het bestand dat hij wil, zonder dat iemand nog iets bijschaalt.',
    folderReview: 'De foto\'s hierboven zijn beoordeelbeelden op schermformaat. Ze staan er om goed te keuren of om naar te wijzen als er iets niet klopt. De echte bestanden zitten in de map.',
    revokedNote: 'Revisieaanvragen staan op dit account uit. Stuur ons een bericht, dan lossen we het samen op.',
    sampleNote: `Dit is de proefvisual van ${TEST_SAMPLE.nl.price}, dus er valt niets goed te keuren — maar laat gerust weten wat je ervan vindt, we reageren altijd.`,
    closedNote: 'Je hebt alles in deze bestelling goedgekeurd. Toch nog iets? Maak het hieronder ongedaan.',
    settledNote: 'Deze bestelling is afgerond. Alles blijft hier te downloaden — is er toch nog iets, stuur ons dan een bericht.',

    payNet: 'Excl. btw',
    payVat: 'Btw',
    payTotal: 'Totaal',
    payRefunded: 'Terugbetaald',
    payRefundedNote: 'Deze bestelling is terugbetaald.',
    payPaid: 'Betaald.',
    payPaidOn: (day) => `Betaald op ${day}.`,
    payDue: 'Nog niet betaald.',
    payDueBy: (day) => `Nog niet betaald — je plek staat vast tot ${day}.`,
    payNow: 'Nu betalen',
    payFailed: 'We konden het betaalscherm niet openen. Probeer het zo nog eens, of stuur ons een bericht.',
    payHeld: 'We kijken de btw-gegevens van deze bestelling na voordat er betaald kan worden. Dat is bij bestellingen buiten de EU een handmatige stap, omdat er geen register is waarin we ze kunnen nakijken. Je hoort binnen één werkdag van ons.',
    shotNames: { front: 'Voorkant', back: 'Achterkant', detail: 'Detail', worn: 'Op een model' },
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
    bkOwnEmptyBody: 'Een merkmodel is één gezicht, voor jou gemaakt, dat bij elke bestelling terugkomt — dezelfde persoon in jouw collectie, seizoen na seizoen, zonder shoot. Tot die tijd zit het standaardbibliotheek hieronder bij alles wat je bestelt.',
    bkOwnEmptyCta: 'Bekijk wat een merkmodel nodig heeft',
    bkOwnPending: 'In de maak',
    bkOwnReady: 'Klaar voor gebruik',
    bkOwnTag: 'Alleen van jou',
    bkAsk: 'Wordt per bestelling gevraagd',
    bkChange: 'Wijzigen',
    bkFaceLede: 'Wie het draagt',
    bkBgLede: 'Waar het op staat',
    bkChLede: 'Waar je het verkoopt',
    bkChHint: 'Voorlopig alleen bij catalog. Kies je een marktplaats die een zuiver wit hoofdbeeld eist, dan begint elke bestelling op wit — Amazon en bol controleren dat aan hun kant automatisch.',
    bkChNone: 'Wordt per bestelling gevraagd',
    bkNoPref: 'Geen voorkeur',
    bkNoPrefFace: 'Vraag het per bestelling',
    bkOwnFig: 'Jouw model',

    // Zie de Engelse tak voor waarom dit een eigen menu-item heeft gekregen.
    detH: 'Je gegevens',
    detLede: 'Eén keer opslaan, daarna bij elke bestelling ingevuld. Pas hier iets aan en de volgende bestelling neemt het over.',
    detFirst: 'Voornaam',
    detLast: 'Achternaam',
    detBrand: 'Merk- of winkelnaam',
    detEmail: 'E-mail',
    detEmailNote: 'Hiermee log je in, dus dit verandert alleen door onder een nieuw adres te bestellen. Mail ons en we zetten het om.',
    detPhone: 'Telefoon of WhatsApp',
    detWebsite: 'Website of winkellink',
    detVat: 'Btw-nummer',
    detVatHint: 'Een bedrijf in een ander EU-land: we controleren het bij VIES, en als het klopt rekenen we geen Nederlandse btw.',
    detNoVat: 'Ik heb geen btw-nummer',
    detMissing: 'Een van de velden hierboven is nog leeg. Alles behalve de velden met "optioneel" moet ingevuld zijn — het komt allemaal op je factuur.',
    detFailed: 'Opslaan lukte even niet. Probeer het zo nog eens — er is niets gewijzigd.',
    detCountry: 'Land',
    detCountryPick: 'Kies een land',
    detCountryEu: 'Europese Unie',
    detCountryOther: 'Elders',
    detCountryHint: 'Hiermee staat de btw op je factuur vast, dus het loont om dit te laten kloppen.',
    detStreet: 'Straat en huisnummer',
    detStreetPh: 'Voorbeeldstraat 12',
    detStreet2: 'Toevoeging',
    detStreet2Ph: 'Unit, verdieping, t.a.v.',
    detPostal: 'Postcode',
    detPostalPh: '1234 AB',
    detCity: 'Plaats',
    detRegion: 'Provincie of staat',
    detRegionHint: 'Alleen waar een adres er een heeft — in het grootste deel van Europa niet.',
    // detBg en de hex zijn eruit — zie de Engelse tak voor de reden.
    detSave: 'Gegevens opslaan',
    detSaved: 'Opgeslagen. Je volgende bestelling begint ingevuld.',
    detOptional: 'optioneel',

    flAll: 'Alle',
    flEmpty: 'Geen bestellingen met deze status.',
    flClear: 'Alle bestellingen tonen',

    navOverview: 'Overzicht',
    navNewRequest: 'Nieuwe aanvraag',
    navBrandKit: 'Je vaste look',
    navDetails: 'Je gegevens',
    navPlan: 'Abonnement & facturering',

    ovWelcome: 'Welkom terug',
    ovLede: 'Een snel overzicht van je bestellingen en bestanden.',
    ovInProduction: 'In productie',
    ovHumanCheck: 'Wordt nagekeken',
    ovDelivered: 'Geleverd',
    ovTotal: 'Bestellingen totaal',
    ovRecent: 'Recente activiteit',
    ovViewAll: 'Bekijk alle bestellingen',
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
    stExpired: 'Verwijderd na de bewaartermijn — vraag ons als je hem nog nodig hebt',
    prodLabel: (n) => `Product ${n}`,
    prodOther: 'Overige beelden',
    prodDelivered: (n) => (n === 1 ? '1 beeld geleverd' : `${n} beelden geleverd`),
    prodApproved: (n) => `${n} goedgekeurd`,
    prodNothingYet: 'Hier is nog niets voor geleverd.',
    prodWeMade: 'Wat wij leverden',
    prodYouSent: 'Wat jij stuurde',
    prodOpen: 'Bekijk de foto\u2019s',
    prodClose: 'Sluiten',
    flowNowLabel: 'Nu:',
    flowNow: {
      received: 'We hebben je bestelling en je bestanden binnen. We plannen hem in.',
      in_production: 'Onze studio maakt je beelden.',
      human_check: 'Een specialist loopt elk beeld na voordat het naar je toe gaat.',
      delivered: 'Je beelden staan klaar. Bekijk ze en laat het weten als er iets niet klopt.',
      cancelled: 'Deze bestelling is geannuleerd. Er wordt niets voor gemaakt.',
    },
    flowStep: { received: 'Ontvangen', in_production: 'In productie', human_check: 'Nagekeken door een specialist', delivered: 'Geleverd' },
    flowWindow: (from, to) => (from === to ? `Ingepland op ${from}.` : `Ingepland van ${from} tot ${to}.`),
    flowHistory: 'Alles wat er gebeurd is',
    noteFrom: 'Van de studio',
    ovNowTitle: 'Je laatste bestelling',
    ovOthers: (n) => (n === 1 ? 'nog 1 lopende bestelling' : `nog ${n} lopende bestellingen`),
    ovOpenOrder: 'Open deze bestelling',
    prodHelp: 'Lastig op te schrijven? Laat het ons zien \u2014',
    prodHelpCta: 'app ons op WhatsApp',
    ovLatest: 'Laatst geleverd',
    ovLatestEmpty: 'Hier verschijnen je geleverde visuals zodra ze klaar zijn.',
    detPhoneHint: 'Zet er een WhatsApp-nummer neer, dan kunnen we je daar bereiken over een bestelling — een vraag over een foto is dan in een minuut geregeld in plaats van in een mailwisseling.',
    waNudgeTitle: 'Updates via WhatsApp',
    waNudgeBody: 'Voeg je nummer toe, dan sturen we updates over je bestelling en korte vragen rechtstreeks via WhatsApp. Laat je het leeg, dan verandert er niets — mail blijft gewoon werken.',
    waNudgeCta: 'Nummer toevoegen',
    stRevision: 'Revisie aangevraagd',
    stRevisionShort: 'Revisie',
    bCancelShort: 'Intrekken',

    planHeading: 'Abonnement & facturering',
    planLede: 'Je betaalt per bestelling — er is nog geen abonnement om te beheren.',
    planAccountLabel: 'Account',
    planEmailLabel: 'E-mail',
    planBrandLabel: 'Merk',
    planNote: 'Vragen over prijzen of een factuur? Reageer op een bestel-e-mail, of mail hello@visuails.com.',

    navInvoices: 'Facturen',
    invHeading: 'Facturen',
    invLede: 'Bij elke betaalde bestelling staat hier de factuur. Download hem als pdf voor je eigen administratie.',
    invEmpty: 'Hier staat nog niets. Zodra een bestelling betaald is, komt de factuur erbij.',
    invEmptyUnpaid: 'Nog geen facturen. Je bestelling krijgt er een zodra de betaling binnen is.',
    invNumber: 'Factuur',
    invDate: 'Datum',
    invOrder: 'Bestelling',
    invAmount: 'Bedrag',
    invDownload: 'Download pdf',
    invPending: 'Wordt gemaakt',
    invPendingNote: 'Deze factuur heeft zijn nummer, het document wordt nog gemaakt. Vernieuw de pagina over een minuut; blijft het hierbij, laat het ons dan weten.',
    invVoid: 'Ingetrokken',
    invReverse: 'Btw verlegd',
    invCredit: 'Creditnota',
    invOutside: 'Buiten de Europese btw',
    invKeepNote: 'Je facturen blijven hier staan zolang je account bestaat. Wij moeten ze zeven jaar bewaren, dus ze verdwijnen niet samen met je bestanden.',

    signOut: 'Uitloggen',
    footAsk: 'Verder iets,',
    dbDown: 'We kunnen je account nu niet bereiken. Dit ligt aan ons, niet aan jou — probeer het over een paar minuten opnieuw.',
    notFound: 'Deze pagina bestaat niet. Ga terug naar je overzicht.',
  },
};

/** orders.status, in words. Mirrors portal.js's/admin.js's own copies. */
const STATUS = {
  received: { en: 'Received', nl: 'Ontvangen' },
  in_production: { en: 'In production', nl: 'In productie' },
  human_check: { en: 'Being checked', nl: 'Wordt nagekeken' },
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

  const zipMatch = path.match(/^\/account\/orders\/(\d+)\/zip$/);
  if (zipMatch) {
    const gate = await checkRate(env, { ip: clientIp(request), action: 'account-zip', limit: ZIP_LIMIT });
    if (!gate.allowed) return new Response(null, { status: 429, headers: { ...fileHeaders(), 'retry-after': String(Math.max(1, gate.retryAfter || 60)) } });
    const customer = await currentCustomer(env, request);
    if (!customer) return seeOther('/account/login');
    return serveOrderZip(context, customer, Number(zipMatch[1]));
  }

  /*
   * ALLEEN NOG /f — 9 augustus 2026. De /d-variant (dezelfde bytes, maar met
   * content-disposition: attachment) is vervallen samen met de downloadknop per
   * beeld. Een route die blijft bestaan nadat de knop eruit is, is geen
   * opruiming maar een niet-gedocumenteerde achterdeur: wie de url één keer
   * gezien heeft, downloadt gewoon door.
   *
   * Een oude bladwijzer op /d krijgt hierdoor de 404 die onderaan deze functie
   * staat. Dat is de juiste uitkomst en niet een regressie: er is geen enkele
   * plek meer die zo'n link tekent.
   */
  const fileMatch = path.match(/^\/account\/files\/(\d+)\/f$/);
  if (fileMatch) {
    const gate = await checkRate(env, { ip: clientIp(request), action: 'account-file', limit: FILE_LIMIT });
    if (!gate.allowed) return new Response(null, { status: 429, headers: { ...fileHeaders(), 'retry-after': String(Math.max(1, gate.retryAfter || 60)) } });
    const customer = await currentCustomer(env, request);
    if (!customer) return seeOther('/account/login');
    return serveAccountFile(context, customer, Number(fileMatch[1]));
  }

  // Een factuur als pdf. Onder dezelfde limiet als de andere bestandsroutes en
  // met dezelfde eigendomscontrole: het id in de URL is een getal, en of het van
  // deze klant is beslist de query, niet de URL.
  const invMatch = path.match(/^\/account\/invoices\/(\d+)\/pdf$/);
  if (invMatch) {
    const gate = await checkRate(env, { ip: clientIp(request), action: 'account-file', limit: FILE_LIMIT });
    if (!gate.allowed) return new Response(null, { status: 429, headers: { ...fileHeaders(), 'retry-after': String(Math.max(1, gate.retryAfter || 60)) } });
    const customer = await currentCustomer(env, request);
    if (!customer) return seeOther('/account/login');
    return serveInvoicePdf(context, customer, Number(invMatch[1]));
  }

  /* Een creditnota, langs precies dezelfde weg als een factuur: eigen pad omdat het een
     eigen tabel is, dezelfde limiet, dezelfde eigendomscontrole via `orders`. Eén route
     voor beide zou betekenen dat het id uit de URL bepaalt in WELKE tabel gezocht wordt,
     en dan hangt de eigendomscontrole aan een raadspelletje over waar dat getal hoort. */
  const cnMatch = path.match(/^\/account\/credit-notes\/(\d+)\/pdf$/);
  if (cnMatch) {
    const gate = await checkRate(env, { ip: clientIp(request), action: 'account-file', limit: FILE_LIMIT });
    if (!gate.allowed) return new Response(null, { status: 429, headers: { ...fileHeaders(), 'retry-after': String(Math.max(1, gate.retryAfter || 60)) } });
    const customer = await currentCustomer(env, request);
    if (!customer) return seeOther('/account/login');
    return serveCreditPdf(context, customer, Number(cnMatch[1]));
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
  if (path === '/account/invoices') return sectionGet(context, customer, 'invoices');
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
  // Ook vóór de Origin-controle en vóór currentCustomer(), om dezelfde reden als
  // de regel hierboven: hier is nog geen sessie om op mee te liften, dus er is
  // niets wat een vervalste cross-site POST zou kunnen misbruiken. Wat er wél
  // is, is een rate limit en een pogingenteller — zie handleCodePost.
  if (path === '/account/code') return handleCodePost(context);

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
    //
    // 2026-08-08, tekstronde: die twee waarden bleven staan, maar de zin
    // ervoor niet. "Request origin did not match" is de naam van onze eigen
    // controle, geen melding — en de detailregel stond er los achter, zonder
    // te zeggen wat de lezer ermee moest. Nu staat er eerst wat er is en wat
    // hij kan doen, en dan de twee waarden mét de reden dat ze er staan.
    const detail = originMismatchDetail(request);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(COPY[lang], (lang === 'nl'
      ? 'Deze pagina is vanaf een andere site geopend, dus we hebben hem voor de zekerheid niet uitgevoerd. Ga terug naar je accountpagina en probeer het daar opnieuw. Blijft het gebeuren, stuur ons dan deze regel mee: '
      : 'This page was opened from another site, so we did not run it. Go back to your account page and try again there. If it keeps happening, send us this line: ') + detail) }), 403);
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

  if (path === '/account/feedback') return handleFeedback(context, customer);

  const pay = /^\/account\/orders\/(\d+)\/pay$/.exec(path);
  if (pay) return handleOrderPay(context, customer, Number(pay[1]));

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

  return html(page({ lang, title: t.checkTitle, body: checkEmailBody(t, lang, isEmail(email) ? email : '') }));
}

/**
 * Zes cijfers, uniform getrokken, met de nul voorop intact.
 *
 * `crypto.getRandomValues` en niet Math.random(): dit is een inloggeheim, en de
 * generator die een animatie mag aansturen is niet de generator die dat mag
 * doen. Rejection sampling in plaats van een modulo — 2^32 is niet deelbaar
 * door een miljoen, dus `% 1000000` zou de laagste 967.296 uitkomsten iets
 * waarschijnlijker maken dan de rest. Dat is een klein scheefje en het is
 * gratis om niet te hebben.
 *
 * padStart houdt "004821" zes tekens lang. Een code die soms vijf cijfers is,
 * is een code waarvan het invoerveld niet kan zeggen hoe lang hij hoort te zijn.
 */
function mintLoginCode() {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / 1000000) * 1000000;
  let n;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return String(n % 1000000).padStart(6, '0');
}

/**
 * Wat er in account_tokens.code_hash komt te staan.
 *
 * Het klant-id gaat mee de hash in zodat één tabel met een miljoen voorberekende
 * waarden niet alle rijen tegelijk opent. Zie migrations/0017 over wat dit wél
 * en niet oplost: tegen iemand die de database in handen heeft is het geen
 * bescherming — zes cijfers zijn zo teruggerekend — maar het houdt leesbare
 * inlogcodes uit een log, een backup of een half uitgevoerde query.
 */
function hashLoginCode(customerId, code) {
  return hashToken(`${customerId}:${String(code).trim()}`);
}

/** Alleen zes cijfers. Spaties en streepjes eruit, want mensen typen "048 210". */
function normaliseCode(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}

function loginCodeExpiry(fromDate = new Date()) {
  return new Date(fromDate.getTime() + LOGIN_CODE_TTL_MINUTES * 60000).toISOString();
}

/**
 * "Bewaar mijn gegevens", gevraagd bij een bestelling, ingelost bij het inloggen.
 *
 * ── WAAROM DIT TWEE MOMENTEN ZIJN ───────────────────────────────────────────
 *
 * Lucas: *"ook na het bestellen — bewaar dit zodat je het niet opnieuw hoeft in
 * te vullen."* Een ingelogde klant regelt dat via /account/details, achter zijn
 * sessie. Wie niet is ingelogd kan dat niet, dus reist zijn vinkje mee met de
 * bestelling — en /api/order is niet geauthenticeerd. Het adres in dat formulier
 * is niet bewezen van hem.
 *
 * Zou de bestelling `details_saved_at` direct zetten, dan kan iemand met een
 * bestelling op jouw adres jouw opgeslagen gegevens bevriezen: vanaf dat moment
 * wint de opgeslagen waarde in upsertCustomer() en kan geen enkele bestelling er
 * nog iets aan veranderen. Klein, maar het is een vreemde die aan jouw record
 * zit.
 *
 * Inloggen — via de link of via de code — bewijst wél dat het postvak van hem
 * is. Dat is exact hetzelfde bewijs waarop `email_verified` op 1 gaat, en dus
 * het moment waarop de wens mag gelden.
 *
 * ALLEEN ALS ER NOG NIETS OPGESLAGEN IS. `details_saved_at IS NULL` staat in de
 * WHERE en niet in een if hier: een klant die zijn gegevens al een keer heeft
 * opgeslagen, heeft die keuze zelf gemaakt en een oud vinkje van een bestelling
 * hoort daar niet overheen te lopen.
 *
 * Best effort. Mislukt dit, dan is het gevolg dat de klant het vakje op
 * /account/details nog een keer moet aanzetten — geen reden om een inlog te
 * laten stranden.
 */
function promoteSaveRequest(env, customerId) {
  return env.DB.prepare(
    `UPDATE customers
        SET details_saved_at = datetime('now'), save_requested_at = NULL, updated_at = datetime('now')
      WHERE id = ?1 AND save_requested_at IS NOT NULL AND details_saved_at IS NULL`
  ).bind(customerId).run().catch(() => {});
}

/*
 * GEËXPORTEERD SINDS 12 AUGUSTUS 2026, voor de knop "nieuwe inloglink" op het
 * adminpaneel. Dezelfde functie en niet een tweede kopie: een tweede plek die tokens
 * maakt is een tweede plek waar de geldigheidsduur, het hashen en de mailtekst uit
 * elkaar kunnen lopen -- en dat is precies het soort verschil dat niemand ziet tot er
 * een link niet werkt. Zie handleCustomerSigninLink() in src/lib/admin.js.
 */
export async function sendLoginLink(env, request, email, lang) {
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
    'SELECT id, deactivated_at FROM customers WHERE lower(email) = ?1'
  ).bind(email).first();
  /*
   * ── DE UITKOMST WORDT NU TERUGGEGEVEN — 12 AUGUSTUS 2026 ────────────────────
   *
   * Deze functie gaf niets terug: `undefined` bij een onbekend adres, `undefined` bij
   * een geslaagde verzending. Voor de publieke kant maakt dat niets uit — die zegt
   * altijd "kijk in je mail", met opzet, omdat elk ander antwoord een vreemde vertelt
   * of een bepaald adres een account heeft.
   *
   * Voor de knop op het adminpaneel maakt het wél uit: daar staat de studio ernaar te
   * kijken en die hoort te weten of er iets is uitgegaan. Vandaar `true` als de mail de
   * deur uit is en `false` als hij met opzet niet is verstuurd. Een echte storing
   * (Resend weigert) gooit nog steeds — sendMail() gooit bij een niet-ok antwoord — en
   * dat is de derde uitkomst die de aanroeper apart hoort te kunnen melden.
   */
  if (!customer) return false;
  /*
   * ── EEN GEDEACTIVEERD ACCOUNT KRIJGT GEEN LINK — 12 AUGUSTUS 2026 ──────────
   *
   * Zonder deze regel is deactiveren een woord op een adminscherm: de sessies gaan
   * eruit, en de klant vraagt tien seconden later een nieuwe inloglink aan en is weer
   * binnen. Zie handleCustomerStatus() in src/lib/admin.js.
   *
   * STIL TERUG EN GEEN FOUTMELDING, precies zoals bij een adres dat niet bestaat. De
   * publieke kant zegt altijd "kijk in je mail", en dat is met opzet: elk ander antwoord
   * vertelt een vreemde of een bepaald e-mailadres een account heeft. Dat een
   * gedeactiveerde klant daardoor op een mail wacht die niet komt, is de prijs — en de
   * reden dat er bij het deactiveren een reden verplicht is die je hem kunt vertellen.
   */
  if (customer.deactivated_at) {
    console.log('[account] inloglink niet verstuurd: account gedeactiveerd');
    return false;
  }

  const { token, tokenHash } = await mintCredential();
  const code = mintLoginCode();

  /*
   * EEN NIEUWE CODE DOODT DE VORIGE, en dat is geen opruiming maar de regel die
   * de vijf-pogingengrens betekenis geeft. Zou een oude code blijven leven, dan
   * koopt elke nieuwe aanvraag er vijf pogingen bij op een code die nog geldig
   * is — tien aanvragen zijn dan vijftig gokken tegelijk. Nu geldt er altijd
   * precies één code per klant, met precies vijf kansen.
   *
   * Alleen de CODE gaat dood, niet de link. Iemand die twee keer op "stuur een
   * link" drukt en dan de eerste mail opent, hoort gewoon binnen te komen.
   */
  /*
   * EN ALS MIGRATIE 0017 NOG NIET GEDRAAID HEEFT, GAAT DE MAIL TOCH UIT.
   *
   * Deze functie wordt aangeroepen met een .catch(() => {}) eromheen, omdat
   * niets in het antwoord mag verraden of het adres bestaat. Dat betekent ook
   * dat een fout hier volstrekt onzichtbaar is: één onbekende kolom en er komt
   * nooit meer een inlogmail aan, op elk account, zonder één foutmelding. Dat
   * is inloggen kapot, en dan is het slechtste antwoord "wacht op de migratie".
   *
   * Dus bij een ontbrekende kolom: dezelfde link, zonder de code. Precies wat
   * het gisteren was.
   */
  let withCode = true;
  try {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE account_tokens SET code_hash = NULL
          WHERE customer_id = ?1 AND code_hash IS NOT NULL`
      ).bind(customer.id),
      env.DB.prepare(
        `INSERT INTO account_tokens (customer_id, token_hash, expires_at, code_hash, code_expires_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(customer.id, tokenHash, loginTokenExpiry(), await hashLoginCode(customer.id, code), loginCodeExpiry()),
    ]);
  } catch (err) {
    if (!/no such column/i.test(String(err?.message || err))) throw err;
    console.error('[account] migratie 0017 ontbreekt — inlogmail zonder code verstuurd');
    withCode = false;
    await env.DB.prepare(
      'INSERT INTO account_tokens (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
    ).bind(customer.id, tokenHash, loginTokenExpiry()).run();
  }

  const link = `${requestOrigin(request)}/account/verify/${token}`;
  const { html, text } = magicLinkEmail(lang, link, withCode ? code : null);
  await sendMail(env, {
    to: email,
    // De onderwerpregel volgt de inhoud, net als de kop in de mail zelf: staat
    // er een code in, dan is dat het eerste wat iemand op zijn vergrendelscherm
    // ziet en hoort het onderwerp daar niet iets anders te beloven.
    subject: withCode
      ? (lang === 'nl' ? 'Je inlogcode voor VISUAILS' : 'Your VISUAILS sign-in code')
      : (lang === 'nl' ? 'Je inloglink voor VISUAILS' : 'Your VISUAILS sign-in link'),
    html,
    text,
  });
  /* De mail is de deur uit. sendMail() gooit bij een niet-ok antwoord van Resend, dus
     hier komen betekent verstuurd — met één uitzondering die eerlijk benoemd hoort te
     worden: zonder RESEND_API_KEY slaat sendMail() stil over. Dat is de configuratie
     van een omgeving die nog geen mail kan sturen, en niet iets waar deze functie een
     ander antwoord op moet verzinnen. */
  return true;
}

/**
 * POST /account/code — inloggen met de zes cijfers uit de mail.
 *
 * DEZELFDE UITKOMST ALS DE LINK, LANGS EEN ANDERE DEUR. Slaagt hij, dan gebeurt
 * exact wat handleVerify() doet: een sessie, de cookie, en email_verified op 1
 * — want een code uit een mail overtypen bewijst hetzelfde als een link uit die
 * mail openen, namelijk dat je bij dat postvak kunt.
 *
 * ── WAT ER NIET UIT MAG LEKKEN ──────────────────────────────────────────────
 *
 * Of het adres bestaat. Een onbekend adres heeft geen rij en dus geen code, en
 * dat moet er precies zo uitzien als een verkeerd overgetypte code: dezelfde
 * zin, dezelfde statuscode, geen verschil in wat er op het scherm komt. Vandaar
 * dat elk pad hieronder op hetzelfde antwoord uitkomt en er nergens "dit adres
 * kennen we niet" staat.
 *
 * Het aantal resterende pogingen wordt WEL getoond. Dat verraadt niets — wie de
 * code aan het raden is weet zelf hoe vaak hij gegokt heeft — en het is het
 * verschil tussen een formulier dat je nog een keer probeert en een formulier
 * dat ineens niets meer doet.
 */
async function handleCodePost({ request, env }) {
  /*
   * DE ORIGIN-CONTROLE STAAT HIER EN NIET IN accountPost, EN DAT IS GEEN
   * SLORDIGHEID. Deze route wordt afgehandeld vóór currentCustomer(), samen met
   * /account/login, omdat er nog geen sessie is om op te leunen — de gedeelde
   * controle verderop komt na een `if (!customer) return seeOther(login)` en
   * zou dit dus nooit bereiken.
   *
   * Maar hij is hier wél nodig, en op één punt méér dan bij /account/login.
   * Die route verstuurt alleen een mail; het ergste wat een vervalste POST daar
   * doet is iemand een mail bezorgen. Deze route MAAKT EEN SESSIE. Zonder deze
   * regel kan een andere site het formulier van buitenaf indienen met een code
   * die de aanvaller zelf heeft aangevraagd, en dan zit het slachtoffer in de
   * browser van zijn eigen computer ingelogd op het account van de aanvaller —
   * en uploadt hij zijn foto's daarin. Login-CSRF, en het is stil.
   */
  if (!originIsSelf(request, env)) {
    const lang = negotiate(request);
    return html(page({ lang, title: COPY[lang].loginTitle, body: loginBody(COPY[lang], lang, originMismatchDetail(request)) }), 403);
  }

  const gate = await checkRate(env, { ip: clientIp(request), action: 'account-code', limit: CODE_LIMIT });
  const form = await request.formData().catch(() => null);
  const lang = form && String(form.get('lang') || '') === 'nl' ? 'nl' : negotiate(request);
  const t = COPY[lang];

  const email = String(form?.get('email') || '').trim().toLowerCase();
  const code = normaliseCode(form?.get('code'));

  // Eén pagina voor elke afloop behalve de goede, met één zin die verschilt.
  const again = (message, status = 400) =>
    html(page({ lang, title: t.checkTitle, body: checkEmailBody(t, lang, email, message) }), status);

  if (!gate.allowed) return again(t.codeTooMany, 429);
  if (!isEmail(email)) return again(t.codeWrong);
  if (!code) return again(t.codeShape);

  let row;
  try {
    // De nieuwste levende code van deze klant. ORDER BY id DESC omdat een
    // tweede aanvraag de eerste doodt (zie sendLoginLink) maar de rij laat
    // staan — de link erin moet blijven werken.
    row = await env.DB.prepare(
      `SELECT at.id, at.customer_id, at.code_hash, at.code_expires_at, at.code_attempts, at.expires_at, at.used_at
         FROM account_tokens at
         JOIN customers c ON c.id = at.customer_id
        WHERE lower(c.email) = ?1 AND at.code_hash IS NOT NULL
        ORDER BY at.id DESC LIMIT 1`
    ).bind(email).first();
  } catch (err) {
    // Zonder migratie 0017 bestaat code_hash niet. Dan is er geen code om in te
    // vullen, en zegt het scherm dat — met de link ernaast die het wél doet.
    if (/no such column/i.test(String(err?.message || err))) return again(t.codeUnavailable);
    return html(page({ lang, title: 'VISUAILS', body: errorBody(t) }), 503);
  }

  if (!row || isExpired(row.code_expires_at, null)) return again(t.codeWrong);
  if (Number(row.code_attempts) >= LOGIN_CODE_MAX_ATTEMPTS) return again(t.codeWrong);

  const guess = await hashLoginCode(row.customer_id, code);
  if (guess !== row.code_hash) {
    // BIJ DE LAATSTE MISSER GAAT DE CODE DOOD, NIET HET ACCOUNT EN NIET DE LINK.
    // De link in dezelfde mail is 128 bits en valt niet te raden; die laten
    // sterven zou alleen de klant treffen die zich vertypt heeft. Daarom wijst
    // het antwoord hieronder terug naar diezelfde mail in plaats van dood te
    // lopen, en staat het formulier voor een nieuwe eronder.
    await env.DB.prepare(
      `UPDATE account_tokens
          SET code_attempts = code_attempts + 1,
              code_hash = CASE WHEN code_attempts + 1 >= ?2 THEN NULL ELSE code_hash END
        WHERE id = ?1`
    ).bind(row.id, LOGIN_CODE_MAX_ATTEMPTS).run().catch(() => {});
    return again(t.codeWrong);
  }

  // De code is goed. Hij mag nu niet nog eens: eenmalig is eenmalig, en de
  // volgende bezoeker van deze pagina — of dat nu dezelfde persoon is of
  // iemand die over zijn schouder meekeek — begint weer bij nul.
  const { token: sessionToken, tokenHash: sessionHash } = await mintCredential();
  try {
    await env.DB.batch([
      env.DB.prepare("UPDATE account_tokens SET code_hash = NULL, used_at = COALESCE(used_at, datetime('now')) WHERE id = ?1").bind(row.id),
      env.DB.prepare(
        'INSERT INTO account_sessions (customer_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
      ).bind(row.customer_id, sessionHash, accountSessionExpiry()),
      env.DB.prepare('UPDATE customers SET email_verified = 1 WHERE id = ?1').bind(row.customer_id),
    ]);
  } catch {
    return html(page({ lang, title: 'VISUAILS', body: errorBody(t) }), 503);
  }

  // Het vinkje van bij de bestelling, nu het bewezen is. Zie promoteSaveRequest.
  await promoteSaveRequest(env, row.customer_id);

  return seeOther('/account', [setSessionCookie(sessionToken)]);
}

// env.DB is guaranteed here — accountGet checks it before this is ever reached,
// same single-entry-guard pattern as admin.js's adminGet/handleLogin.
async function handleVerify(context, token) {
  const { request, env } = context;
  const lang = negotiate(request);
  const t = COPY[lang];

  if (!isWellFormedToken(token)) return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t, lang) }), 404);

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
    return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t, lang) }), 410);
  }
  if (row.used_at && !withinGrace(row.used_at)) {
    return html(page({ lang, title: t.badLinkTitle, body: badLinkBody(t, lang) }), 410);
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

  // Dezelfde stap als in handleCodePost: dit is het moment waarop bewezen is
  // dat het postvak van hem is, en dus waarop "bewaar mijn gegevens" mag gelden.
  await promoteSaveRequest(env, row.customer_id);

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
 * Je vaste look / Plan & billing as their own sections. All four need overlapping
 * slices of the same four queries (orders feed both Overview's counts and the
 * Orders list; files feed both), so this stays ONE Promise.all — same
 * reasoning dashboardGet always had — and only the render step branches on
 * `section`. Explicitly NOT a credits/subscription system: Lucas chose "the
 * shape, not the plan" when asked, so Plan & billing renders real account
 * facts and a per-order-billing note, never a fabricated quota.
 */
/**
 * De taalkeuze uit de cookie, of null.
 *
 * Eén cookie voor het hele accountgedeelte, met dezelfde vlaggen als de sessie
 * (zie COOKIE_FLAGS en de noot daar over SameSite=Lax en de inloglink). Geen
 * kolom op de klant: dit is een voorkeur van het APPARAAT waarop iemand kijkt,
 * niet van het merk. De inkoper en de eigenaar delen één account en hoeven niet
 * dezelfde taal te delen.
 */
function langCookie(request) {
  const raw = request.headers.get('cookie') || '';
  const m = /(?:^|;\s*)vis_lang=(nl|en)(?:;|$)/.exec(raw);
  return m ? m[1] : null;
}

async function sectionGet(context, customer, section) {
  const { env, request } = context;

  /* ?lang=nl of ?lang=en legt de keuze vast en stuurt je terug naar dezelfde
   * pagina zonder de parameter. Zonder die omleiding blijft hij in de URL
   * hangen en deelt iemand straks een link die de taal van de ontvanger
   * overschrijft. */
  try {
    const url = new URL(request.url);
    const wanted = url.searchParams.get('lang');
    if (wanted === 'nl' || wanted === 'en') {
      url.searchParams.delete('lang');
      const back = `${url.pathname}${url.search}${url.hash}`;
      return seeOther(back, [`vis_lang=${wanted}; Max-Age=${365 * 86400}; ${COOKIE_FLAGS}`]);
    }
  } catch { /* geen geldige URL: dan is er ook niets te kiezen */ }
  let orders, files, models, locks, details, events;
  try {
    // `details` joins the same Promise.all rather than being fetched inside
    // brandKitBody(): one round of queries, four possible pages, is what this
    // function has always been — and a query issued from a render function is
    // one a future section reordering can accidentally run twice.
    [orders, files, models, locks, details, events] = await Promise.all([
      loadOrders(env, customer.customer_id),
      loadCustomerFiles(env, customer.customer_id),
      loadCustomModels(env, customer.customer_id),
      loadStyleLocks(env, customer.customer_id),
      detailsRow(env, customer.customer_id),
      loadOrderEvents(env, customer.customer_id),
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
  /*
   * DE TAAL VAN HET DASHBOARD — en wie hem kiest. 7 augustus 2026.
   *
   * Hij kwam uit de laatste bestelling en verder nergens uit. Dat is een goede
   * gok en een slecht slot: een merk dat één keer in het Nederlands bestelde,
   * kon daarna nooit meer een Engels scherm krijgen — ook niet als degene die
   * inlogt de inkoper uit Berlijn is. Beide talen bestonden volledig; er was
   * alleen geen deur.
   *
   * De volgorde is nu: wat de klant zelf koos (cookie), anders zijn laatste
   * bestelling, anders zijn browser. Een keuze wint van een gok, en een gok
   * wint van niets — dezelfde volgorde als negotiate() zelf aanhoudt.
   */
  const chosen = langCookie(request);
  const lang = chosen
    || (orders[0]?.lang === 'nl' ? 'nl' : orders[0]?.lang === 'en' ? 'en' : negotiate(request));
  const t = COPY[lang];

  const filesByOrder = groupFilesByOrder(files);
  const eventsByOrder = groupEventsByOrder(events);
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
  // `pay=failed` zet handleOrderPay() als het betaalscherm niet openging. Zonder
  // deze regel zou de klant op precies dezelfde pagina terugkomen met precies
  // dezelfde knop — niet te onderscheiden van "er gebeurde niets toen ik klikte".
  let payFailed = false;
  let payHeld = false;
  // `missing=1` zet handleDetails() als er een verplicht veld leeg is
  // teruggekomen. Zonder deze regel keert de klant terug op een pagina die er
  // precies hetzelfde uitziet als voor het opslaan, zonder dat er iets bewaard
  // is — de stilste manier om iemand zijn gegevens te laten kwijtraken.
  let detailsMissing = false;
  /*
   * ── WELKE KAART OPEN MOET, KOMT UIT DE QUERY EN NIET UIT DE HASH ────────────
   *
   * De bestelkaarten zijn <details> geworden en staan dicht als er niets te doen is.
   * Elke link die naar één kaart wijst — de mails, de tegels op het overzicht, de
   * terugkeer na een mislukte betaling — eindigt op `#order-<id>`, en een hash bereikt
   * de server nooit. Een klant die op "betalen is mislukt" klikt zou dus op een dichte
   * kaart landen: precies de dode knop die vandaag op drie andere plekken is opgeruimd,
   * in een nieuwe vorm.
   *
   * CSS kan het niet oplossen. `details:target` bestaat als selector, maar `open` is een
   * attribuut en geen stijl, en een dichte <details> verbergt zijn inhoud via de
   * slot-machinerie van de browser en niet via `display`. Dus geen `display: revert`-truc.
   *
   * Vandaar dat elk van die links het id nu ÓÓK in de queryreeks meegeeft
   * (`?order=91#order-91`). De hash laat de browser naar de kaart springen, de query
   * vertelt de server welke er open moet. Twee keer hetzelfde getal, en dat is de prijs
   * voor nul javascript.
   */
  let openOrderId = 0;
  try {
    const params = new URL(request.url).searchParams;
    openOrderId = Number(params.get('order')) || 0;
    justSaved = params.get('saved') === '1';
    payFailed = params.get('pay') === 'failed';
    payHeld = params.get('pay') === 'held';
    detailsMissing = params.get('missing') === '1' ? 'missing' : (params.get('failed') === '1' ? 'failed' : false);
    const wanted = String(params.get('status') || '');
    if (Object.prototype.hasOwnProperty.call(STATUS, wanted)) statusFilter = wanted;
  } catch { /* keep the defaults */ }

  let inner, title;
  if (section === 'orders') {
    /*
     * ── DE ANTWOORDEN, IN ÉÉN QUERY VOOR ALLE BESTELLINGEN ──────────────────
     *
     * Niet in de Promise.all bovenaan, want die draait voor élke sectie van dit
     * dashboard en dit is alleen op de bestellingenpagina nodig. En niet per
     * bestelkaart, want dan is het één query per kaart — bij twintig
     * bestellingen twintig aanroepen voor een blok dat op de meeste niet eens
     * verschijnt.
     *
     * Eén IN-lijst dus, en alleen over de bestellingen die het blok kunnen
     * krijgen: afgerond. Zijn dat er nul, dan gaat er niets naar de database.
     */
    const closed = orders.filter((o) => o.closed_at).map((o) => o.id);
    const feedbackByOrder = closed.length
      ? await loadFeedbackFor(env, closed)
      : new Map();
    inner = ordersBody(t, lang, orders, filesByOrder, eventsByOrder, statusFilter, payFailed, feedbackByOrder, payHeld, openOrderId);
    title = t.ordersHeading;
  } else if (section === 'brand') {
    inner = brandKitBody(t, lang, models, lockByStyle);
    title = t.navBrandKit;
  } else if (section === 'details') {
    inner = detailsBody(t, lang, details, justSaved, detailsMissing);
    title = t.detH;
  } else if (section === 'invoices') {
    /*
     * DE ENIGE SECTIE DIE NIET IN DE Promise.all HIERBOVEN ZIT, en dat is met
     * opzet. Die zes queries draaien voor élke pagina van dit dashboard. Wat
     * deze sectie doet is duurder: hij haalt niet alleen facturen op, hij MAAKT
     * ze ook als ze ontbreken — een pdf renderen en in R2 leggen. Dat aan de
     * gezamenlijke laadstap toevoegen zou betekenen dat het overzicht, de brand
     * kit en de bestellingenlijst dat werk allemaal meedragen.
     *
     * Dus lui, hier, en alleen als iemand naar zijn facturen kijkt.
     */
    const list = await invoicesFor(env, customer.customer_id, orders);
    inner = invoicesBody(t, lang, list, orders);
    title = t.invHeading;
  } else if (section === 'plan') {
    inner = planBody(t, customer);
    title = t.planHeading;
  } else {
    inner = overviewBody(t, lang, customer, orders, filesByOrder, eventsByOrder);
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
      `SELECT s.id AS session_id, s.expires_at, c.id AS customer_id, c.email, c.name, c.brand,
              c.deactivated_at
         FROM account_sessions s JOIN customers c ON c.id = s.customer_id
        WHERE s.token_hash = ?1`
    ).bind(hash).first();
  } catch {
    return null;
  }
  if (!row) return null;
  if (isExpired(row.expires_at, null)) return null;
  /*
   * ── GEDEACTIVEERD IS GEDEACTIVEERD, OOK MIDDEN IN EEN SESSIE — 12 AUG 2026 ──
   *
   * handleCustomerStatus() gooit de sessies eruit bij het deactiveren, dus dit lijkt
   * dubbelop. Het is de vangrail eronder, en die is nodig om twee redenen: die DELETE
   * kan falen (hij zit in een batch met een catch die de fout doorgeeft, maar dan is
   * de klant al gedeactiveerd), en een sessiecookie die op een ander apparaat in een
   * bfcache-pagina hangt kan een verzoek doen dat de DELETE net gemist heeft.
   *
   * Deze regel maakt de maatregel onafhankelijk van of dat opruimen lukte. Dat is het
   * verschil tussen een maatregel en een gewoonte.
   */
  if (row.deactivated_at) return null;

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
      // `hidden_at IS NULL` erbij, 12 augustus 2026: de studio kan een model nu
      // VERBERGEN in plaats van de status ervoor te misbruiken. Zonder deze regel zou
      // dat verbergen niets doen op de enige plek waar het om gaat -- de tegels waar
      // de klant uit kiest.
      `SELECT id, label FROM custom_models
        WHERE customer_id = ?1
          AND status <> 'in_design'
          AND hidden_at IS NULL
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
    // SELECT l.* in plaats van een kolomlijst: dan werkt deze query ook op een
    // database waar 0019 nog niet gedraaid heeft, en is `l.channels` daar simpel
    // undefined in plaats van een SQL-fout die alle locks laat vervallen. De
    // catch hieronder zou dat opvangen door ALLE voorkeuren weg te gooien, en
    // dat is een veel duurdere terugval dan één ontbrekend veld.
    const { results } = await env.DB.prepare(
      `SELECT l.*, m.label AS custom_label
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
        // Gesplitst én opnieuw gefilterd tegen de lijst in onze eigen code: een
        // id dat sinds het opslaan uit channels.js is verdwenen mag geen vinkje
        // worden dat nergens meer bij hoort.
        channels: String(l.channels || '').split(',').map((v) => v.trim()).filter((v) => CHANNEL_IDS.includes(v)),
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
    noVat: !!row.no_vat_number,
    country: row.country || '',
    // De losse velden, want dat zijn de velden die het bestelformulier sinds
    // 7 augustus 2026 heeft. `address` blijft als samengesteld blok voor wie
    // het als één ding wil tonen; `first_name` valt terug op de oude `name`,
    // net als in detailsSection() en om dezelfde reden — bij "Van der Meer"
    // is niet te raden waar de voornaam ophoudt.
    first_name: row.first_name || (row.last_name ? '' : (row.name || '')),
    last_name: row.last_name || '',
    address_line1: row.address_line1 || '',
    address_line2: row.address_line2 || '',
    postal_code: row.postal_code || '',
    city: row.city || '',
    region: row.region || '',
    address: row.billing_address || '',
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

/**
 * The saved-details row, one query, used by /account/me and by Je vaste look.
 *
 * ── EN MET EEN TERUGVAL, OM EEN HELE GOEDE REDEN ───────────────────────────
 *
 * Deze query hangt in de Promise.all van sectionGet(), en die heeft één catch
 * om alle zes de queries heen die een 503 teruggeeft. Eén onbekende kolom hier
 * is dus niet "de gegevenspagina mist een veld" maar "het hele dashboard is
 * onbereikbaar" — op elke sectie, ook Bestellingen en Je vaste look.
 *
 * De kolommen uit migratie 0016 bestaan pas nadat die migratie gedraaid is, en
 * een deploy komt in de praktijk soms eerder dan een migratie. Zonder deze
 * terugval is dat gat een dashboard dat plat ligt tot iemand het doorheeft.
 * Zelfde afspraak als loadOrders() hierboven.
 */
async function detailsRow(env, customerId) {
  try {
    return await detailsRowFull(env, customerId);
  } catch (err) {
    if (!/no such column/i.test(String(err?.message || err))) throw err;
    // Zonder 0016: alleen de samengestelde naam en het samengestelde adres.
    // detailsSection() zet de oude naam dan in het voornaamveld en de losse
    // adresvelden blijven leeg — de klant vult ze aan, en dat is precies wat er
    // ná de migratie ook zou gebeuren.
    return env.DB.prepare(
      `SELECT email, name, brand, phone, website, vat_number, country, billing_address,
              default_background, default_background_hex, details_saved_at
         FROM customers WHERE id = ?1`
    ).bind(customerId).first();
  }
}

function detailsRowFull(env, customerId) {
  return env.DB.prepare(
    // country and billing_address joined the set in August 2026, when the order
    // form started asking for them. They matter more than the others here: the
    // saved-details collapse HIDES step 3 for a returning customer, and a
    // hidden country field posts empty — which vatDecision() reads as domestic
    // and prices at 21%. A German customer with a valid VAT number would have
    // been charged Dutch VAT because their own saved details were not sent
    // back to them. (functions/api/order.js also falls back to the customer row
    // server-side, so the two failures would have to happen together.)
    // De losse naam- en adresvelden komen uit migratie 0016; `name` en
    // `billing_address` blijven ernaast staan als de samengestelde weergave.
    // Beide worden gelezen: het formulier vult de losse velden, en een rij van
    // vóór 0016 heeft alleen de samengestelde — zie detailsSection(), dat de
    // oude naam in het voornaamveld zet zodat er niets zoekraakt.
    `SELECT email, name, first_name, last_name, brand, phone, website,
            vat_number, no_vat_number, country, billing_address,
            address_line1, address_line2, postal_code, city, region,
            default_background, default_background_hex, details_saved_at
       FROM customers WHERE id = ?1`
  ).bind(customerId).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVED DETAILS — POST /account/details
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save the answers that do not change between orders. Two callers, one
 * handler: the vaste-look form (browser POST, 303 back to the section) and
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
 * EEN LEEG VAKJE WIST — MAAR NIET MEER OVERAL. Dat was de regel: dit is een
 * instellingenscherm, geen bestelformulier, dus een leeggemaakt telefoonveld
 * betekent "haal weg". Voor telefoon, website en de toevoeging op het adres
 * geldt dat nog steeds. Voor de velden die op een factuur belanden niet meer,
 * sinds 7 augustus 2026 — zie REQUIRED hieronder.
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

  /*
   * LAND EN ADRES — dezelfde presentie-regel als de achtergrond hierboven.
   *
   * Twee aanroepers, en ze sturen niet hetzelfde. Het formulier op
   * /account/details vraagt sinds 7 augustus 2026 naar allebei, dus daar
   * betekent een leeg vakje "weghalen". /start's opslag-vinkje (bindSaveOffer in
   * pipeline.js) stuurt ze niet altijd mee, en een onvoorwaardelijke UPDATE zou
   * dan het land wissen dat de klant net bij zijn bestelling heeft opgegeven —
   * precies het veld waar de btw-beslissing op draait. Afwezig is een ander
   * antwoord dan leeg, en dat verschil is hier duur.
   *
   * Het land wordt teruggebracht tot twee hoofdletters. De database moet één
   * vocabulaire spreken (ISO 3166, zie migratie 0015); alles wat daar niet op
   * lijkt wordt null in plaats van opgeslagen zoals het binnenkwam.
   */
  const hasCountry = form.has('country');
  const rawCountry = String(form.get('country') || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  /*
   * ── WAT ER INGEVULD MOET ZIJN, EN WAT "MOET" HIER BETEKENT ─────────────────
   *
   * Lucas: *"Deze gegevens zijn ook verplicht inclusief btw-nummer met een
   * checkbox bij btw-nummer toch te skippen."* Dit scherm hield tot vandaag de
   * regel "elk veld optioneel, leeg wist" aan, en dat was juist zolang het een
   * geheugensteuntje was. Er komt nu een factuur uit, en daar hoort een
   * tenaamstelling en een adres op.
   *
   * DE CONTROLE KIJKT ALLEEN NAAR WAT ER GESTUURD IS. `form.has()` beslist,
   * precies zoals bij de achtergrond hierboven: een aanroeper die een veld niet
   * meestuurt, laat het met rust en wordt er niet op afgerekend. Een aanroeper
   * die het wél stuurt maar leeg, zegt "haal weg" — en dat mag bij een
   * verplicht veld niet, want dan staat er straks een factuur zonder adres.
   *
   * Zo blijft /start's opslag-vinkje werken (dat stuurt de velden die de klant
   * net heeft ingevuld) zonder dat dit scherm zijn eigen eisen laat vallen.
   */
  const REQUIRED = ['first_name', 'last_name', 'brand', 'country', 'address_line1', 'postal_code', 'city'];
  const emptyRequired = REQUIRED.some((k) => form.has(k) && !one(k));

  /*
   * HET BTW-NUMMER, EN HET VINKJE ERNAAST.
   *
   * Drie toestanden en ze zijn niet inwisselbaar:
   *
   *   nummer ingevuld          → bewaren, vinkje uit
   *   vinkje aan               → geen nummer, en dat is een ANTWOORD
   *   allebei leeg, wel gestuurd → niet ingevuld, dus geweigerd
   *
   * De middelste is waarom no_vat_number een kolom is en niet af te leiden uit
   * een leeg veld: zonder dat onderscheid zou een particulier bij elke
   * bestelling opnieuw langs een veld moeten dat hij nooit kan invullen.
   *
   * Een ingevuld nummer wint van het vinkje. Wie allebei doet, heeft er een —
   * en het formulier hoort niet te gokken welke van de twee hij meende.
   */
  const hasVat = form.has('vat');
  const vatNumber = one('vat');
  const noVat = !vatNumber && ['1', 'on', 'true', 'yes'].includes(String(form.get('no_vat') || '').toLowerCase());
  const vatMissing = hasVat && !vatNumber && !noVat;

  if (emptyRequired || vatMissing) {
    // Niets schrijven. Half opslaan zou de helft van een factuuradres
    // achterlaten en dat is erger dan niet opslaan, want het ziet eruit alsof
    // het gelukt is.
    return asJson
      ? json({ error: 'incomplete' }, 400)
      : seeOther(`${home}?missing=1#details`);
  }

  const hasAddress = ADDRESS_FIELDS.some((k) => form.has(k));
  const hasName = form.has('first_name') || form.has('last_name');

  /*
   * ELK VELD IS PRESENTIE-GESTUURD, ZONDER UITZONDERING.
   *
   * `brand`, `phone`, `website` en `vat_number` stonden hier onvoorwaardelijk
   * in de UPDATE, uit de tijd dat dit formulier de enige aanroeper was. Sinds
   * /start's opslag-vinkje meedoet is dat een gat: een POST met alleen
   * `{ phone: … }` schreef `brand = NULL` mee — en `brand` staat sinds vandaag
   * in de REQUIRED-set hierboven. Een deelaanroeper kon dus een verplicht veld
   * leegmaken zonder er ooit naar gevraagd te hebben, en de controle erboven
   * ziet dat niet, want die kijkt juist alleen naar wat er GESTUURD is.
   *
   * Nu bepaalt form.has() alles, en is er precies één regel: afwezig laat met
   * rust, aanwezig schrijft — leeg of niet.
   */
  const sets = [];
  const binds = [];
  const add = (sql, value) => { binds.push(value); sets.push(`${sql} = ?${binds.length + 1}`); };
  if (form.has('brand')) add('brand', one('brand'));
  if (form.has('phone')) add('phone', one('phone'));
  if (form.has('website')) add('website', one('website'));
  if (hasVat) { add('vat_number', vatNumber); add('no_vat_number', noVat ? 1 : 0); }
  if (hasBg) { add('default_background', background); add('default_background_hex', hex); }
  if (hasCountry) add('country', country);

  // `name` en `billing_address` blijven bestaan als de SAMENGESTELDE weergave —
  // zie migrations/0016 en src/data/address.js. Ze worden hier geschreven en
  // nergens anders afgeleid, zodat een mail of een adminscherm het adres als
  // één blok kan lezen zonder de regels zelf in de goede volgorde te zetten.
  if (hasName) {
    add('first_name', one('first_name'));
    add('last_name', one('last_name'));
    add('name', composeName(one('first_name'), one('last_name')));
  }
  if (hasAddress) {
    for (const k of ADDRESS_FIELDS) add(k, one(k));
    add('billing_address', composeAddress(addressFromFields(one)));
  }

  try {
    // Een POST zonder één bekend veld erin schrijft geen kolommen, maar zet nog
    // wel details_saved_at — dat is wat /start's vinkje bedoelt als de klant
    // niets heeft ingevuld: "onthou mij". Zonder deze tak zou `sets` leeg zijn
    // en de SET met een komma beginnen.
    await env.DB.prepare(
      `UPDATE customers SET
         ${sets.length ? `${sets.join(', ')},` : ''}
         details_saved_at = datetime('now'),
         updated_at = datetime('now')
       WHERE id = ?1`
    ).bind(customer.customer_id, ...binds).run();
  } catch (err) {
    // NIET STIL TERUG NAAR DEZELFDE PAGINA. Dat deed dit: de klant kreeg een
    // scherm dat er identiek uitzag, zonder dat er iets bewaard was — en de
    // meest waarschijnlijke oorzaak is een kolom uit migratie 0016 die er nog
    // niet is, dus precies het soort fout dat je wilt zien.
    console.error('[account] gegevens opslaan mislukt —', err?.message || err);
    return asJson ? json({ error: 'unavailable' }, 503) : seeOther(`${home}?failed=1#details`);
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

/**
 * Een vlakje in één kleur, zonder één regel inline CSS.
 *
 * ── DE BUG DIE DIT BESTAND OP 7 AUGUSTUS 2026 OPLEVERDE ─────────────────────
 *
 * De stalen in de brand kit werden getekend met `style="--sw:#C6F100"`, met een
 * commentaar erbij dat uitlegde waarom dat mocht: *"a `style` ATTRIBUTE setting
 * a variable is allowed where an inline <style> block is not."* Dat is niet
 * waar. De CSP van deze pagina zegt `style-src 'self'`, en `style-src-attr`
 * valt in CSP3 terug op `style-src` — dus het attribuut wordt óók geweigerd.
 * Gemeten in Chromium: `getPropertyValue('--sw')` komt leeg terug en de console
 * zegt *"Refused to apply inline style"*. Elk vakje in de brand kit stond dus
 * doorzichtig, op /account én in het adminscherm, en niemand kon zien welke
 * achtergrondkleur er nou eigenlijk vastlag.
 *
 * ── WAAROM SVG EN NIET 'unsafe-inline' ──────────────────────────────────────
 *
 * De makkelijke uitweg is `style-src 'self' 'unsafe-inline'`. Dat is één woord
 * en het werkt, en het is de verkeerde ruil: deze pagina's draaien op
 * `default-src 'none'` zonder één script, en dat is precies de reden dat een
 * ingeslopen stukje HTML hier nu niets kan. Dat opgeven voor een gekleurd
 * vierkantje is een slechte koers.
 *
 * `fill` op een <rect> is een PRESENTATIE-ATTRIBUUT uit SVG, geen CSS. Het gaat
 * niet door style-src, het werkt in elke browser die SVG kent, en het vraagt
 * geen enkele versoepeling. De SVG rekt zich met viewBox="0 0 1 1" en
 * preserveAspectRatio="none" naar elke maat die de CSS eromheen geeft, dus de
 * afmetingen blijven waar ze horen: in account.css.
 *
 * DE KLEUR WORDT HIER NOG EEN KEER GECONTROLEERD. normalizeHex() bewaakt de
 * ingang al, maar dit is de uitgang, en een `fill` die uit de database komt
 * hoort niet op vertrouwen te leunen. Alles wat geen #RRGGBB is, wordt een leeg
 * vakje in plaats van een attribuut met onbekende inhoud.
 *
 * @param {string} hex  '#RRGGBB'.
 * @param {string} cls  De klasse die de maat en de vorm bepaalt.
 */
function swatch(hex, cls) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(String(hex || '')) ? String(hex).toUpperCase() : null;
  if (!safe) return `<span class="${cls} is-blank" aria-hidden="true"></span>`;
  return `<span class="${cls}" aria-hidden="true"><svg viewBox="0 0 1 1" preserveAspectRatio="none" focusable="false" aria-hidden="true"><rect width="1" height="1" fill="${safe}"/></svg></span>`;
}

/** All orders this customer has placed, most recent first. */
async function loadOrders(env, customerId) {
  // customer_note komt uit migratie 0013 en wordt in een try/catch gelezen: de
  // bestellingenlijst is het dashboard, en dat mag niet omvallen op een kolom
  // die nog niet bestaat. Zonder kolom is er ook geen mededeling, dus de
  // uitkomst klopt in beide gevallen.
  try {
    const res = await env.DB.prepare(
      // DE BETAALKOLOMMEN ZIJN HIER OP 7 AUGUSTUS 2026 BIJ GEKOMEN. Dit scherm
      // wist niets van geld: payment_status, total_cents en window_expires_at
      // kwamen in het hele bestand niet voor. Een klant die de betaling afbrak
      // zag "Ontvangen" zonder bedrag en zonder knop, terwijl zijn reservering
      // afliep — en de enige betaallink zat in een mail die hij misschien niet
      // meer had. Zie paymentBlock() en handleOrderPay().
      //
      // vat_cents en vat_rate komen uit migratie 0015. Draait die nog niet, dan
      // gooit deze query "no such column" en vangt de catch hieronder hem op —
      // dezelfde afspraak als customer_note uit 0013.
      `SELECT id, ref, service, status, tier, product_count, window_start, window_end, lang, created_at, closed_at,
              customer_note, customer_note_at,
              payment_status, payment_provider, paid_at, total_cents, currency, refunded_cents,
              window_expires_at, vat_cents, vat_rate, vat_treatment,
              (SELECT revisions_revoked_at FROM customers c WHERE c.id = ?1) AS revisions_revoked_at
         FROM orders
        WHERE customer_id = ?1
        ORDER BY created_at DESC, id DESC
        LIMIT 200`
    ).bind(customerId).all();
    return res.results || [];
  } catch (err) {
    // Zelfde regel als hierboven: alleen wijken voor een kolom die er nog niet
    // is. Anders zou een hapering de mededeling van de studio stilzwijgend van
    // het scherm halen.
    if (!/no such column|customer_note/i.test(String(err?.message || err))) throw err;
  }

  const res = await env.DB.prepare(
    // revisions_revoked_at hangt aan de KLANT, niet aan de bestelling, maar
    // reviewControls() beslist per bestelling of de knoppen er staan — dus
    // reist het mee in dezelfde rij in plaats van als tweede query. Eén
    // subselect op een tabel met één rij is goedkoper dan een extra round trip
    // en het houdt de aanroep verderop op één ding: `o`.
    // De terugval kent alleen kolommen uit schema.sql en migratie 0003/0006 —
    // alles wat 0013 en 0015 toevoegen valt hier weg. paymentBlock() leest
    // vat_cents dan als undefined en rekent met het standaardtarief; zie daar.
    `SELECT id, ref, service, status, tier, product_count, window_start, window_end, lang, created_at, closed_at,
            payment_status, payment_provider, paid_at, total_cents, currency, refunded_cents, window_expires_at,
            (SELECT revisions_revoked_at FROM customers c WHERE c.id = ?1) AS revisions_revoked_at
       FROM orders
      WHERE customer_id = ?1
      ORDER BY created_at DESC, id DESC
      LIMIT 200`
  ).bind(customerId).all();
  return res.results || [];
}

/**
 * Mag er op de beelden van deze bestelling nog een besluit genomen worden?
 *
 * DE REGEL ZELF STAAT NIET MEER HIER. Hij stond hier én in portal.js, met een
 * commentaar dat de duplicatie verdedigde — en toen hij op 7 augustus 2026
 * veranderde ("voor iedere bestelling behalve 0,99 cent sample") waren het twee
 * plekken die uit elkaar konden lopen. Zie canReviewOrder() in
 * src/data/pricing.js voor de regel en voor waarom de proefvisual de
 * uitzondering is. De twee aliassen blijven staan omdat `canReview(o)` op de
 * plek waar hij gelezen wordt beter uitlegt wat de vraag is dan de importnaam.
 */
const canReview = canReviewOrder;
const canSeeReviewHistory = historyAllowed;

/** Een proefvisual — de enige bestelling zonder beoordeelknoppen. Prijs: TEST_SAMPLE. */
const isSample = (o) => o && o.service === SAMPLE_SERVICE;

/**
 * Mag een afgeronde bestelling nog heropend worden door een goedkeuring terug
 * te draaien?
 *
 * DE BEWAARTERMIJN HANGT AAN closed_at, en dat is precies waarom hier een grens
 * moet staan. order_tokens.expires_at wordt door geen enkele INSERT geschreven
 * (kijk maar: functions/api/order.js en src/lib/admin.js zetten alleen order_id
 * en token_hash), dus isExpired() in token.js leidt de negentig dagen volledig
 * af uit closed_at. Wist je dat veld, dan leeft de gemailde portaallink weer —
 * ook een die al lang dood hoorde te zijn, en zo vaak als iemand op de knop
 * drukt.
 *
 * Binnen het venster is heropenen wat de klant bedoelt: hij zit nog in de
 * nasleep van de opdracht. Daarbuiten is de opdracht klaar, en klaar is een
 * toestand die niet met één klik terug hoort te draaien.
 */
function reopenable(o) {
  if (!o || !o.closed_at) return true;
  return !isExpired(null, o.closed_at);
}

/**
 * Every delivered file across every one of this customer's orders, one query.
 * Grouped by order_id in JS afterward rather than queried per-order — a
 * dashboard with twenty orders would otherwise be twenty round trips for
 * exactly the rows this single join already returns.
 */
async function loadCustomerFiles(env, customerId) {
  // BEIDE KANTEN, sinds augustus 2026. Deze query las alleen kind='delivery',
  // dus het dashboard kon een klant wél laten zien wat hij terugkreeg en niet
  // wat hij had aangeleverd. Lucas: *"ze zien dan 2 kanten: de foto's die ze
  // hebben geüpload en foto's die ze hebben ontvangen."* Dat is niet alleen
  // symmetrie — het is hoe iemand controleert of zijn upload goed is
  // aangekomen, en waar hij naar wijst als hij een revisie aanvraagt.
  //
  // product_key en shot komen mee omdat een upload zonder die twee een
  // bestandsnaam is en met die twee "product 3 · achterkant".
  // VERVANGEN BEELDEN BLIJVEN HIER BUITEN, sinds migratie 0012. Levert de
  // studio na een revisie een nieuwe versie van "product 3 · achterkant", dan
  // krijgt de vorige een superseded_at en hoort hij niet meer op dit scherm:
  // de klant kan met de foto waar hij een revisie op vroeg niets meer, en hem
  // laten staan naast zijn opvolger maakt van elke revisieronde een extra
  // beeld dat genegeerd moet worden.
  //
  // De ORDER BY sorteert nu ook op product en shot, zodat de groepering in
  // orderCard() de volgorde van de database kan volgen in plaats van hem zelf
  // te bedenken. NULLS gaan achteraan — niet-ingedeelde beelden horen onder de
  // producten, niet ertussen.
  const cols = `f.id, f.order_id, f.kind, f.filename, f.bytes, f.expires_at,
                f.review_state, f.review_note, f.reviewed_at, f.product_key, f.shot`;
  const order = `ORDER BY f.order_id,
                          f.product_key IS NULL, f.product_key,
                          f.kind DESC, f.shot IS NULL, f.shot, f.id`;
  try {
    const res = await env.DB.prepare(
      `SELECT ${cols}
         FROM files f JOIN orders o ON o.id = f.order_id
        WHERE o.customer_id = ?1 AND f.kind IN ('upload', 'delivery')
          AND f.superseded_at IS NULL
        ${order}`
    ).bind(customerId).all();
    return res.results || [];
  } catch (err) {
    // ALLEEN op een ontbrekende kolom terugvallen. Een blinde catch zou bij een
    // hapering van D1 de tweede query draaien en dan vrolijk de vervangen
    // beelden terugzetten in het dashboard van de klant — een fout die eruitziet
    // als een geslaagde pagina.
    if (!/no such column|superseded_at/i.test(String(err?.message || err))) throw err;
    // Code vóór migratie: dan bestaat superseded_at niet, en is er ook nog
    // niets vervangen — dus is de oude vraag nog het goede antwoord.
    const res = await env.DB.prepare(
      `SELECT ${cols}
         FROM files f JOIN orders o ON o.id = f.order_id
        WHERE o.customer_id = ?1 AND f.kind IN ('upload', 'delivery')
        ${order}`
    ).bind(customerId).all();
    return res.results || [];
  }
}

/**
 * De tijdlijn van elke bestelling van deze klant, in één query.
 *
 * WAAROM DIT ER NIET WAS. `order_events` wordt gevuld bij elke statuswijziging
 * (zie admin.js: twee schrijfacties, nooit één) en werd tot nu toe alleen
 * gelezen door portal.js — en dáár ook nog eens alleen voor `attended`
 * bestellingen. Dat betekende dat een klant MET een account minder zag over
 * zijn eigen bestelling dan iemand met een doorgestuurd linkje, en dat een
 * klant op de goedkoopste trede helemaal niets zag. Precies verkeerd om: het
 * account is de plek waar je thuishoort, en de tijdlijn is het enige wat
 * antwoord geeft op de vraag waarmee iemand inlogt — waar is mijn bestelling.
 *
 * ÉÉN QUERY VOOR ALLE BESTELLINGEN, met een plafond. Per bestelling een query
 * is bij tien bestellingen tien rondes op een pagina die er al vijf doet. Het
 * plafond staat ruim boven wat een bestelling ooit aan gebeurtenissen krijgt
 * (vijf statussen plus wat handmatige notities) en beschermt tegen het geval
 * dat iemand een bestelling honderd keer heen en weer zet.
 */
async function loadOrderEvents(env, customerId) {
  try {
    const res = await env.DB.prepare(
      `SELECT e.order_id, e.status, e.note, e.created_at
         FROM order_events e JOIN orders o ON o.id = e.order_id
        WHERE o.customer_id = ?1
        ORDER BY e.order_id DESC, e.id
        LIMIT 400`
    ).bind(customerId).all();
    return res.results || [];
  } catch {
    // Een tijdlijn is context, geen dashboard. Valt deze query om, dan hoort de
    // rest van de pagina gewoon te laden — zonder tijdlijn, met alles erop wat
    // er wél is.
    return [];
  }
}

function groupEventsByOrder(events) {
  const map = new Map();
  for (const e of events || []) {
    if (!map.has(e.order_id)) map.set(e.order_id, []);
    map.get(e.order_id).push(e);
  }
  return map;
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
  /* Verborgen modellen komen hier niet uit. Dit is de lijst in de brand kit van de
     klant: staat er een model tussen dat hij niet kan kiezen, dan is dat een tegel die
     hem laat bellen over iets wat wij bewust hebben weggezet. */
  const res = await env.DB.prepare(
    `SELECT id, label, status,
            (preview_key IS NOT NULL AND preview_key <> '') AS has_preview
       FROM custom_models WHERE customer_id = ?1 AND hidden_at IS NULL
       ORDER BY created_at DESC`
  ).bind(customerId).all();
  return res.results || [];
}

/*
 * De vastgezette voorkeuren per dienst.
 *
 * ── WAAROM SELECT * EN GEEN KOLOMLIJST (9 augustus 2026) ─────────────────────
 *
 * Hier stond `SELECT style, custom_model_id, roster_model, background_hex`, en
 * migratie 0019 voegde er een vijfde kolom aan toe: `channels`. Die is er nooit
 * bij gezet. Het gevolg was stiller dan een fout: lockSection() leest
 * `lock.channels`, kreeg altijd undefined, en tekende de vinkjes dus altijd
 * leeg. Opslaan werkte wél — de waarde stond in de database en het bestelformulier
 * vulde hem netjes voor via /account/me, dat zijn eigen query met `l.*` heeft —
 * dus een klant die Amazon aanvinkte, opsloeg en terugkeerde zag lege vakjes bij
 * een instelling die gewoon aan stond. Dat is de duurste soort verkeerd beeld:
 * hij vinkt hem nog eens aan, of hij besluit dat het niet werkt.
 *
 * Vandaar `l.*`. Dezelfde afweging als in handleMe(): een sterretje werkt óók op
 * een database waar de migratie nog niet gedraaid heeft — `channels` is daar
 * simpelweg undefined in plaats van een SQL-fout — en er is geen zesde kolom
 * denkbaar die dit scherm wél moet weten en niet mag lezen. Een kolomlijst die
 * een migratie kan missen is hier duurder dan de paar bytes die hij spaart.
 */
/**
 * De feedbackrijen van een handvol bestellingen, als Map op order_id.
 *
 * De ids komen uit rijen die we net zelf uit `orders` hebben gelezen voor déze
 * klant, dus ze zijn per constructie van hem — vandaar dat ze rechtstreeks in de
 * IN mogen. Ze worden alsnog door Number() gehaald: een lijst die uit een query
 * komt hoort niet als tekst in een volgende query te belanden, ook niet als hij
 * vandaag alleen getallen bevat.
 *
 * Ontbreekt de tabel — migratie 0020 niet gedraaid — dan is de uitkomst een lege
 * Map en staat er op elke kaart gewoon de vraag. Zelfde afspraak als
 * loadFeedback() in feedback.js.
 */
/**
 * Het tevredenheidsblok, van deze kant.
 *
 * ── WAT HIER GECONTROLEERD WORDT, EN WAAROM PRECIES DIT ─────────────────────
 *
 * Eén ding: is deze bestelling van deze klant, en is hij afgerond. Dat tweede is
 * niet overbodig naast het eerste — het blok verschijnt alleen bij een afgeronde
 * bestelling, dus een POST voor een bestelling die dat niet is, komt niet van een
 * scherm dat wij hebben getekend.
 *
 * De Origin-controle, de rate limit en de sessie zijn hierboven in accountPost()
 * al gedaan, voor elke route. Ze hier nog eens doen zou een tweede, iets andere
 * kopie van diezelfde poort zijn — precies waar de noot bovenaan die functie
 * tegen waarschuwt.
 *
 * Bij een platformknop antwoorden we met een 303 naar Google of Trustpilot. Dat
 * formulier heeft target="_blank", dus die omleiding landt in het nieuwe tabblad
 * en het dashboard blijft staan.
 */
async function handleFeedback({ request, env }, customer) {
  const form = await request.formData().catch(() => null);
  const orderId = Number.parseInt(String(form?.get('order') || ''), 10);
  const home = '/account/orders';
  if (!Number.isInteger(orderId)) return seeOther(home);

  let order;
  try {
    order = await env.DB.prepare(
      'SELECT id, closed_at FROM orders WHERE id = ?1 AND customer_id = ?2'
    ).bind(orderId, customer.customer_id).first();
  } catch {
    return seeOther(home);
  }
  if (!order || !order.closed_at) return seeOther(home);

  const res = await handleFeedbackPost(env, {
    orderId,
    customerId: customer.customer_id,
    form,
  });

  /*
   * NIET seeOther(res.redirect). Dat stond hier, en dat is de bug die Lucas op
   * 9 augustus 2026 rapporteerde als *"deze knoppen verwijzen nergens naartoe"*:
   * de post kwam aan, de klik werd opgeslagen, en daarna blokkeerde Chrome de
   * 303 naar Google omdat form-action 'self' ook over redirects gaat. Zie de kop
   * van offsite.js, en csp-probe.mjs voor de meting.
   *
   * Komt de url niet door de https-toets van offsitePage(), dan gaat de klant
   * terug naar zijn bestelling in plaats van naar een url die wij niet kunnen
   * plaatsen.
   */
  if (res.redirect) {
    const lang = negotiate(request);
    const page = offsitePage({
      url: res.redirect,
      name: res.redirectName,
      lang,
      css: '/account.css',
    });
    if (page) return html(page);
  }
  return seeOther(`${home}?order=${orderId}#order-${orderId}`);
}

async function loadFeedbackFor(env, orderIds) {
  const ids = orderIds.map((n) => Number(n)).filter(Number.isInteger);
  if (!ids.length) return new Map();
  try {
    const res = await env.DB.prepare(
      `SELECT * FROM order_feedback WHERE order_id IN (${ids.map(() => '?').join(',')})`
    ).bind(...ids).all();
    return new Map((res?.results || []).map((r) => [r.order_id, r]));
  } catch (err) {
    console.warn('[account] feedback niet te lezen —', err && err.message, '— migratie 0020 gedraaid?');
    return new Map();
  }
}

async function loadStyleLocks(env, customerId) {
  const res = await env.DB.prepare(
    'SELECT l.* FROM customer_style_locks l WHERE l.customer_id = ?1'
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

  // ── WAAR DIT MERK VERKOOPT (migratie 0019) ─────────────────────────────────
  //
  // Meerdere vinkjes, dus getAll() en niet get(). Elke waarde wordt tegen
  // CHANNEL_IDS gehouden — dezelfde soort lidmaatschapstoets als bij de roster
  // hierboven, en om dezelfde reden: een zelfgebouwde post mag geen eigen string
  // zetten waar de studio een kanaal verwacht. Dubbelen eruit met een Set en de
  // volgorde van channels.js aanhouden, zodat de opgeslagen waarde niet afhangt
  // van de volgorde waarin de browser de velden meestuurt.
  //
  // WAT HIER NIET STAAT: de witregel. Amazon zet de achtergrond vast op wit,
  // maar dat gebeurt in syncChannels() in pipeline.js, waar het al gebeurde voor
  // een losse bestelling. Hier wit forceren zou betekenen dat twee plekken het
  // eens moeten blijven over welke kanalen wit eisen.
  const wanted = new Set(
    (typeof form?.getAll === 'function' ? form.getAll('channels') : [])
      .map((v) => String(v || '').trim().toLowerCase())
      .filter((v) => CHANNEL_IDS.includes(v))
  );
  const channels = CHANNEL_IDS.filter((id) => wanted.has(id)).join(',') || null;

  if (!customModelId && !rosterModel && !background && !channels) {
    // Everything cleared — back to "ask per order, as usual." Deleting rather
    // than storing nulls keeps "no row" as the single meaning of "no
    // preference", so nothing downstream has to test for both.
    await env.DB.prepare(
      'DELETE FROM customer_style_locks WHERE customer_id = ?1 AND style = ?2'
    ).bind(customer.customer_id, style).run();
    return seeOther(home);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO customer_style_locks (customer_id, style, custom_model_id, roster_model, background_hex, channels, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
       ON CONFLICT(customer_id, style) DO UPDATE SET
         custom_model_id = excluded.custom_model_id,
         roster_model    = excluded.roster_model,
         background_hex  = excluded.background_hex,
         channels        = excluded.channels,
         updated_at      = datetime('now')`
    ).bind(customer.customer_id, style, customModelId, rosterModel, background, channels).run();
  } catch (err) {
    // Terugval voor een database waar 0019 nog niet gedraaid heeft. Zelfde
    // patroon als de btw-INSERT in functions/api/order.js: een deploy die vóór
    // zijn migratie landt mag een voorkeur niet weggooien, hij mag alleen dat
    // ene nieuwe veld nog niet kunnen bewaren.
    if (!/channels/i.test(String(err && err.message))) throw err;
    await env.DB.prepare(
      `INSERT INTO customer_style_locks (customer_id, style, custom_model_id, roster_model, background_hex, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
       ON CONFLICT(customer_id, style) DO UPDATE SET
         custom_model_id = excluded.custom_model_id,
         roster_model    = excluded.roster_model,
         background_hex  = excluded.background_hex,
         updated_at      = datetime('now')`
    ).bind(customer.customer_id, style, customModelId, rosterModel, background).run();
  }

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
/**
 * Stap 6: afgerond.
 *
 * Lucas: *"alles goedgekeurd of het venster verlopen. closed_at gaat om,
 * revisieknoppen verdwijnen, de download blijft. closed_at bestaat maar wordt
 * nergens gezet."* Dus wordt hij hier gezet, op het enige moment waarop het
 * waar kan worden: de klant keurt zijn laatste beeld goed.
 *
 * WAAROM NIET OOK OP EEN TERMIJN. Dat vraagt om iets wat periodiek draait, en
 * dat is een cron met een eigen storingsmodus voor een gebeurtenis die zich in
 * de praktijk zelf aandient. Een afronding op tijd hoort bovendien vooraf
 * aangekondigd te worden ("we sluiten deze bestelling over een week") en dat is
 * een tweede mail; die staat op de lijst, deze niet.
 *
 * ALLEEN ALS ER ÉCHT NIETS MEER OPENSTAAT. Nul beelden telt niet als "alles
 * goedgekeurd" — dat is een lege bestelling, geen afgeronde. En verlopen of
 * vervangen beelden tellen niet mee, want daar kan de klant niets meer over
 * zeggen; ze zouden een bestelling voorgoed openhouden.
 *
 * WAT ER NIET GEBEURT: geen mail. Dit is een gevolg van een handeling die de
 * klant zojuist zélf deed, en "je hebt zojuist op goedkeuren geklikt" is geen
 * bericht. De gebeurtenis komt op zijn tijdlijn, waar hij hem terugvindt.
 */

async function handleFileReview({ request, env }, customer) {
  const home = '/account/orders';
  const form = await request.formData().catch(() => null);
  const fileId = Number.parseInt(String(form?.get('file') || ''), 10);
  const action = String(form?.get('action') || '');
  if (!Number.isInteger(fileId) || !['approve', 'revise', 'undo'].includes(action)) return seeOther(home);

  // Het bestand moet horen bij een bestelling van DEZE klant, en die bestelling
  // mag geen proefvisual zijn. De tier-eis is er op 7 augustus 2026 uit (zie
  // canReviewOrder in pricing.js), en closed_at is verhuisd van deze WHERE naar
  // de afhandeling per actie: een afgeronde bestelling weigert een nieuw besluit
  // maar laat het terugdraaien van het oude toe. Stond het hier, dan zou de
  // "Ongedaan maken"-knop die het scherm toont stil niets doen — een knop die
  // een 303 teruggeeft en verder niets is erger dan geen knop.
  let owned;
  try {
    owned = await env.DB.prepare(
      // order_id komt mee omdat revision_requests hem genormaliseerd opslaat,
      // en revisions_revoked_at omdat een ingetrokken recht ook moet gelden
      // voor een POST die het formulier omzeilt — de knoppen weghalen in de UI
      // is een presentatie, niet een regel.
      // ALLEEN EEN LEVEND BEELD. superseded_at en expires_at stonden hier niet
      // in, en dat is precies het gat waarlangs een afgeronde bestelling voor
      // altijd open te zetten was: maybeClose() telt alleen levende beelden, dus
      // een 'undo' op een vervangen of verlopen beeld wiste closed_at zonder dat
      // er ooit nog iets was dat de bestelling opnieuw kon afronden. Het scherm
      // toont die beelden trouwens ook niet — dit is de regel eronder.
      `SELECT f.id, f.order_id, o.closed_at, c.revisions_revoked_at
         FROM files f
         JOIN orders o ON o.id = f.order_id
         JOIN customers c ON c.id = o.customer_id
        WHERE f.id = ?1 AND o.customer_id = ?2 AND f.kind = 'delivery'
          AND o.service <> ?3
          AND f.superseded_at IS NULL
          AND (f.expires_at IS NULL OR f.expires_at > datetime('now'))`
    ).bind(fileId, customer.customer_id, SAMPLE_SERVICE).first();
  } catch {
    return seeOther(home);
  }
  if (!owned) return seeOther(home);

  const anchor = `${home}#f${fileId}`;

  // Nieuwe besluiten op een afgeronde bestelling: stil terug. Het scherm biedt
  // ze niet aan, dus dit is een formulier uit een tab die al open stond.
  if (owned.closed_at && action !== 'undo') return seeOther(anchor);
  // En terugdraaien alleen zolang de bestelling nog te heropenen is — zie
  // reopenable(): buiten dat venster zou het wissen van closed_at een
  // portaallink wekken die al verlopen hoorde te zijn.
  if (owned.closed_at && !reopenable(owned)) return seeOther(anchor);

  try {
    if (action === 'approve') {
      await env.DB.prepare(
        `UPDATE files SET review_state = 'approved', review_note = NULL, reviewed_at = datetime('now') WHERE id = ?1`
      ).bind(fileId).run();
      // Was dit de laatste? Dan is de bestelling af — zie maybeClose().
      await maybeCloseOrder(env, owned.order_id);
    } else if (action === 'undo') {
      // Reversible on purpose — same reasoning as portal.js: a mis-tapped
      // Approve must not strand a client with a decision they cannot take back.
      //
      // EN HET OPENT DE BESTELLING WEER. Was dit het beeld waarmee maybeClose()
      // hem afrondde, dan zou het terugdraaien anders een bestelling achterlaten
      // die "afgerond" heet met een beeld erin waar niemand meer iets over kan
      // zeggen: goedkeuren is dan geblokkeerd door closed_at, en er is geen weg
      // terug. Afronden is een gevolg van het laatste besluit, dus het volgt dat
      // besluit ook als het wordt teruggenomen. Eén batch, want een bestelling
      // die half heropend is bestaat niet.
      const undo = [
        env.DB.prepare(
          `UPDATE files SET review_state = 'pending', review_note = NULL, reviewed_at = NULL WHERE id = ?1`
        ).bind(fileId),
      ];
      if (owned.closed_at) {
        undo.push(
          env.DB.prepare('UPDATE orders SET closed_at = NULL WHERE id = ?1').bind(owned.order_id),
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
          clearUploadRetention(env, owned.order_id),
          env.DB.prepare(
            `INSERT INTO order_events (order_id, status, note, actor)
             VALUES (?1, 'delivered', ?2, 'system')`
          ).bind(owned.order_id, 'Een goedkeuring is teruggedraaid — bestelling weer open.')
        );
      }
      await env.DB.batch(undo);
    } else {
      // INGETROKKEN RECHTEN WORDEN HIER GEHANDHAAFD, niet in de UI. Goedkeuren
      // en terugdraaien blijven wél kunnen: die kosten ons niets en een klant
      // die zijn revisierechten kwijt is, moet nog steeds kunnen zeggen dat
      // iets goed is.
      if (owned.revisions_revoked_at) return seeOther(anchor);

      const note = String(form.get('note') || '').trim().slice(0, NOTE_MAX);
      if (!note) return seeOther(anchor);

      // TWEE SCHRIJFACTIES IN ÉÉN BATCH. files.review_state is de huidige
      // toestand van dit beeld; revision_requests is de geschiedenis waar admin
      // op stuurt en waaruit de telling komt. Zouden ze los gaan, dan bestaat er
      // een toestand waarin een beeld op 'revision_requested' staat zonder dat
      // iemand weet wanneer of waarom het gevraagd is — precies de situatie die
      // migration 0010 beschrijft.
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE files SET review_state = 'revision_requested', review_note = ?2, reviewed_at = datetime('now') WHERE id = ?1`
        ).bind(fileId, note),
        env.DB.prepare(
          `INSERT INTO revision_requests (file_id, order_id, customer_id, note) VALUES (?1, ?2, ?3, ?4)`
        ).bind(fileId, owned.order_id, customer.customer_id, note),
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
        orderId: owned.order_id,
        fileId,
        note,
      });

    }
  } catch {
    return seeOther(home);
  }

  return seeOther(anchor);
}

// ─────────────────────────────────────────────────────────────────────────────
// ALSNOG BETALEN — POST /account/orders/<id>/pay
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Een nieuwe betaallink voor een bestelling die nooit betaald is.
 *
 * WAAROM DIT ER NIET WAS, EN WAAROM DAT EEN GAT WAS. De betaling werd één keer
 * aangemaakt, tijdens het bestellen, in functions/api/order.js. Die link ging
 * de bevestigingsmail in en stond op /thank-you, en verder nergens. Wie de tab
 * sloot voordat hij betaalde, of de mail niet terugvond, had geen enkele manier
 * meer om het af te maken — behalve appen. Ondertussen loopt window_expires_at
 * door en geeft de reservering zijn plek terug.
 *
 * WAT ER GECONTROLEERD WORDT, IN DEZE VOLGORDE:
 *
 *   1 · Is dit een bestelling van DEZE klant. De sessie zegt wie hij is; het
 *       nummer in de URL zegt niets. De WHERE bindt allebei.
 *   2 · Staat hij op 'unpaid'. Alleen de webhook zet 'paid', dus dat is de
 *       enige bron die telt — niet dat er ooit een link is aangemaakt.
 *   3 · Is er een bedrag. Een bestelling zonder prijs (video, custom: die gaan
 *       via een gesprek) heeft hier niets te zoeken.
 *
 * HET BEDRAG KOMT UIT DE RIJ, niet uit een nieuwe offerte — zie orderMoney().
 * Wat er destijds is afgesproken is wat er betaald wordt, ook als de prijslijst
 * intussen veranderd is.
 *
 * TWEE KEER KLIKKEN GEEFT TWEE BETALINGEN BIJ MOLLIE. Dat is bewust niet
 * dichtgetimmerd: de webhook boekt de eerste die binnenkomt als betaald, de
 * tweede blijft open staan en vervalt vanzelf, en zou iemand ze allebei
 * afronden dan staat het verschil in het adminscherm met een terugbetaalknop
 * ernaast. Een lock hierop zou een klant die op een trage verbinding twee keer
 * drukt buitensluiten van betalen, en dat is de duurdere fout.
 */
async function handleOrderPay({ request, env }, customer, orderId) {
  const home = '/account/orders';
  const anchor = `${home}?order=${orderId}#order-${orderId}`;
  if (!Number.isInteger(orderId) || orderId <= 0) return seeOther(home);

  /*
   * TWEE QUERIES, OM DEZELFDE REDEN ALS loadOrders() HIERBOVEN. vat_cents komt
   * uit migratie 0015. Draait die nog niet, dan gooit de eerste "no such
   * column" — en de kaart die de knop toont valt dan óók terug op de smalle
   * kolommenset, dus hier stilletjes opgeven zou een knop opleveren die zichtbaar
   * niets doet. Dat is de vervelendste soort kapot: geen fout, geen melding,
   * geen betaling. De terugval rekent met het standaardtarief, precies zoals
   * orderMoney() en om dezelfde reden.
   */
  const COLS = 'id, ref, service, lang, product_count, total_cents, payment_status';
  const byId = (cols) => env.DB.prepare(
    `SELECT ${cols} FROM orders WHERE id = ?1 AND customer_id = ?2`
  ).bind(orderId, customer.customer_id).first();

  let order;
  try {
    order = await byId(`${COLS}, vat_cents, review_state`);
  } catch (err) {
    if (!/no such column/i.test(String(err?.message || err))) return seeOther(anchor);
    /*
     * Twee terugvallen in plaats van één, want er zijn twee migraties in het spel:
     * `vat_cents` komt uit 0015 en `review_state` uit 0018. Draaien ze beide niet,
     * dan is er ook geen poort om te respecteren en is de oude kolommenset juist.
     * Draait alleen 0015 niet, dan moet review_state er nog steeds bij — anders zou
     * een niet-gedraaide prijsmigratie de fraudecontrole uitzetten, en dat is de
     * stilste manier waarop dit kan mislukken.
     */
    try {
      order = await byId(`${COLS}, review_state`);
    } catch {
      try {
        order = await byId(COLS);
      } catch {
        return seeOther(anchor);
      }
    }
  }

  if (!order || String(order.payment_status || 'unpaid') !== 'unpaid') return seeOther(anchor);
  if (!(isPayableService(order.service) || order.service === SAMPLE_SERVICE)) return seeOther(anchor);

  /*
   * ── DE BTW-POORT GELDT OOK HIER, 9 AUGUSTUS 2026 ─────────────────────────────
   *
   * DIT WAS DE ACHTERDEUR. `vatGate()` in src/data/vat.js zet een bestelling op
   * `review_state = 'pending'` zodra een klant een land buiten de EU claimt — de
   * enige claim op de site die volledig op zijn woord rust, en 21% waard. Bij het
   * bestellen wordt er dan géén betaallink gemaakt (functions/api/order.js:769).
   *
   * Deze functie keek daar niet naar. Ze controleerde of er nog niet betaald was en
   * of er een bedrag stond, en maakte dan een Mollie-link aan. Een klant die de
   * controle had geraakt, logde dus in op VISUAILS Studio en rekende daar zelf af
   * tegen het tarief dat zijn onverifieerde claim had opgeleverd. De voordeur op
   * slot, de achterdeur open, en niets dat het verschil zag.
   *
   * ── WAAROM DIT EEN ZICHTBARE MELDING IS EN GEEN STILLE OMLEIDING ────────────
   *
   * De regels hierboven leiden stil om, en dat is daar juist: die gevallen kunnen
   * alleen ontstaan door aan de URL te sleutelen. Dit geval kan een echte klant
   * overkomen met een echte knop, en dan is een pagina die herlaadt zonder iets te
   * zeggen precies de dode knop die vandaag op twee andere plekken is opgeruimd.
   * Hij hoort te lezen dat wij ernaar kijken en dat hij bericht krijgt.
   *
   * WELKE TOESTANDEN TEGENHOUDEN — GECORRIGEERD 10 AUGUSTUS 2026.
   *
   * Hier stond "alleen 'pending' houdt tegen", met als redenering: 'approved' mag
   * betalen en een leeg veld ook. Die redenering vergat de derde uitkomst. `REVIEW` in
   * src/data/vat.js kent vier waarden — pending, approved, rejected, expired — en
   * admin.js:3480 zet er `'rejected'` in als jij op "Afwijzen, ik neem contact op"
   * drukt. Het commentaar bij die knop belooft met zoveel woorden dat de bestelling
   * daarna onbetaalbaar blijft.
   *
   * Wat er werkelijk gebeurde: een afgewezen bestelling glipte langs deze poort en was
   * met "Nu betalen" af te rekenen op precies het 0%-tarief dat jij net geweigerd had.
   * Dan is het geld binnen, de btw niet afgedragen, en de aansprakelijkheid ligt bij
   * ons — het scenario waarvoor deze hele poort op 9 augustus is gebouwd.
   *
   * Daarom staat er nu een LIJST VAN WAT MAG in plaats van een lijst van wat niet mag.
   * Een vijfde toestand die er ooit bij komt, valt dan stil aan de veilige kant.
   * 'approved' mag (dat is waar goedkeuren voor is) en leeg mag (dat is elke bestelling
   * die de poort nooit geraakt heeft, de overgrote meerderheid).
   */
  const reviewState = String(order.review_state || '');
  const PAYABLE_REVIEW = new Set(['', REVIEW.approved]);
  if (!PAYABLE_REVIEW.has(reviewState)) {
    return seeOther(`${home}?pay=held&order=${orderId}#order-${orderId}`);
  }

  const m = orderMoney(order);
  if (!m || m.gross < 1) return seeOther(anchor);

  const lang = order.lang === 'nl' ? 'nl' : 'en';
  const origin = (() => { try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; } })();

  let checkout = null;
  try {
    const payment = await createOrderMolliePayment(env, {
      ref: order.ref,
      lang,
      valueEuros: centsToMollieValue(m.gross),
      grossCents: m.gross,
      // ladderKey(), want paymentDescription() kent alleen de laddernamen —
      // 'drop' zou daar "VISUAILS — 30 producten, undefined" van maken, en dat
      // is de omschrijving die de klant op zijn bankafschrift terugziet.
      description: paymentDescription({ service: ladderKey(order.service), products: order.product_count || 1 }, lang),
      // Terug naar de bestelling zelf en niet naar /thank-you: hij komt hier
      // vandaan, en de kaart waar hij op stond is precies waar hij wil zien dat
      // het gelukt is.
      successUrl: `${origin}${anchor}`,
      webhookUrl: `${origin}/api/webhook/mollie`,
    });
    checkout = payment?._links?.checkout?.href || null;
  } catch (err) {
    // Mollie eruit, sleutel weg, bedrag geweigerd — allemaal hetzelfde voor de
    // klant, en allemaal het opschrijven waard voor ons. De klant hoort niet
    // wát er mis was; hij hoort dat het niet aan hem lag.
    console.error('[account] betaallink mislukt voor', order.ref, '—', err?.message || err);
  }

  // De query komt vóór het anker — andersom leest de browser 'pay=failed' als
  // deel van de fragmentnaam en komt hij nergens aan.
  if (!checkout || !/^https:\/\/[^/]*mollie\.com\//.test(checkout)) {
    return seeOther(`${home}?pay=failed&order=${orderId}#order-${orderId}`);
  }
  /*
   * ── DEZE KNOP WAS STIL STUK, EN DAT IS ERGER DAN DE REVIEWKNOP ────────────
   *
   * Hier stond `return seeOther(checkout)`. Dezelfde fout als bij de
   * reviewknoppen, gevonden bij het uitzoeken daarvan: de CSP van deze pagina
   * zegt form-action 'self', en die geldt ook voor de redirect ná de post. Dus
   * werd de betaling bij Mollie WEL aangemaakt en gebeurde er daarna zichtbaar
   * niets — de kaart bleef staan, zonder melding, met een aangemaakte betaling
   * die niemand ooit afrekende. Zie de kop van offsite.js voor de meting.
   *
   * De tussenpagina is hier bovendien beter dan de 303 die het had moeten zijn:
   * als Mollie traag is, leest de klant "we sturen je door naar Mollie" in
   * plaats van naar een pagina te kijken die niets doet.
   *
   * checkout is hierboven al tegen mollie.com getoetst; offsitePage() eist
   * daarnaast https en een absolute url. Faalt die toets alsnog, dan is dit
   * hetzelfde geval als een mislukte betaallink en gaat de klant naar ?pay=failed
   * in plaats van naar een url die twee controles niet haalde.
   */
  const away = offsitePage({ url: checkout, name: 'Mollie', lang, css: '/account.css' });
  if (!away) return seeOther(`${home}?pay=failed&order=${orderId}#order-${orderId}`);
  return html(away);
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
/**
 * De hele levering van één bestelling als één bestand.
 *
 * Lucas koos "per foto én alles in één zip". Bij twintig producten is los
 * downloaden tachtig keer klikken, en dat is precies het moment waarop iemand
 * jou mailt met de vraag of het ook anders kan.
 *
 * ALLEEN LEVERINGEN. Uploads zitten er niet in, om dezelfde reden dat ze geen
 * downloadknop hebben: het zijn de foto's van de klant.
 *
 * DE VERLOPEN RIJEN VALLEN ERBUITEN in de query, niet in de lus. Een bestand
 * waarvan het downloadvenster dicht is, hoort niet in een archief te zitten dat
 * langs die grens heen gebouwd wordt.
 */
async function serveOrderZip(context, customer, orderId) {
  const { env } = context;
  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let order;
  let files;
  try {
    order = await env.DB.prepare(
      'SELECT id, ref, lang FROM orders WHERE id = ?1 AND customer_id = ?2'
    ).bind(orderId, customer.customer_id).first();
    if (!order) return new Response(null, { status: 404, headers: fileHeaders() });

    /*
     * ── DE QUERY STOND HIER EN STAAT NU IN src/lib/delivery.js ───────────────
     *
     * Hier stond een eigen SELECT met de `superseded_at`-filter erin (7 augustus:
     * het archief bevatte na een revisieronde nog de oude versie, terwijl het
     * scherm alleen de nieuwe liet zien). Portal.js had zijn eigen versie van
     * dezelfde query, ZONDER die filter — dus liep dezelfde bug daar nog. Twee
     * query's over hetzelfde begrip lopen uit elkaar, en dat is hier precies wat
     * er gebeurd was.
     *
     * Nu is er één loadDeliveryFiles(), die ook de assets uit file_assets
     * meeneemt, en één deliveryEntries() die de mappenstructuur bepaalt. Wat de
     * klant hier downloadt en wat hij via zijn portaallink downloadt, is
     * daarmee per constructie hetzelfde archief.
     */
    files = await loadDeliveryFiles(env, orderId);
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }

  if (!files.length) return new Response(null, { status: 404, headers: fileHeaders() });

  const entries = deliveryEntries(files, order.lang === 'en' ? 'en' : 'nl');
  if (!entries.length) return new Response(null, { status: 404, headers: fileHeaders() });

  // De grens van zip.js, hier gehandhaafd omdat hier de maten bekend zijn. Een
  // 413 met een lege body is eerlijker dan een archief dat pas bij de klant
  // blijkt niet te openen.
  const total = entries.reduce((n, e) => n + (e.bytes || 0), 0);
  if (entries.length > ZIP_MAX_FILES || total > ZIP_MAX_BYTES) {
    return new Response(null, { status: 413, headers: fileHeaders() });
  }

  const stream = zipStream(entries.map((e) => ({
    name: e.name,
    get: async () => {
      const obj = await env.UPLOADS.get(e.key);
      return obj ? obj.arrayBuffer() : null;
    },
  })));

  const headers = new Headers(fileHeaders());
  headers.set('content-type', 'application/zip');
  headers.set('content-disposition', zipDisposition(`VISUAILS-${order.ref}.zip`));
  // Geen content-length: de lengte is pas bekend als het laatste bestand
  // geschreven is, en een geraden lengte is een afgekapte download.
  return new Response(stream, { status: 200, headers });
}

async function serveAccountFile(context, customer, fileId) {
  const { request, env } = context;

  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let file;
  try {
    file = await env.DB.prepare(
      `SELECT f.id, f.kind, f.r2_key, f.preview_key, f.filename, f.expires_at
         FROM files f JOIN orders o ON o.id = f.order_id
        WHERE f.id = ?1 AND o.customer_id = ?2 AND f.kind IN ('upload', 'delivery')`
    ).bind(fileId, customer.customer_id).first();
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!file) return new Response(null, { status: 404, headers: fileHeaders() });
  if (file.expires_at && isExpired(file.expires_at, null)) return new Response(null, { status: 410, headers: fileHeaders() });

  /*
   * ── NIETS IS HIER MEER TE DOWNLOADEN, OOK GEEN LEVERING ───────────────────
   *
   * Hier stond een uitzondering voor uploads (die mochten al niet gedownload
   * worden) en daaronder koos `mode` tussen het beoordeelbeeld en het volledige
   * bestand. Sinds 9 augustus 2026 is er maar één modus: bekijken. De route
   * accepteert /d niet meer, dus is `mode` altijd 'f' — dit is de plek die dat
   * hardmaakt in plaats van erop te vertrouwen.
   *
   * `preview_key || r2_key` blijft staan en die terugval is nu wél echt een
   * terugval: scripts/deliver.mjs vult preview_key met een verkleind beeld van
   * 1400px. Tot vandaag vulde niets die kolom en serveerde dit pad dus altijd
   * het volledige leveringsbestand — het scherm dat "alleen om te beoordelen"
   * heet, gaf de levering weg. Een oude levering zonder beoordeelbeeld doet dat
   * nog steeds; dat is bekend en het is de reden dat het script bestaat.
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

  const type = mimeFor(file.filename || key, headers.get('content-type'));
  headers.set('content-type', type);
  // Altijd inline. Er is geen attachment-variant meer; de enige download op dit
  // scherm is het archief van de hele bestelling (serveOrderZip).
  headers.set('content-disposition', 'inline');

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

/**
 * Een factuur als pdf, voor de klant van wie hij is.
 *
 * ── DRIE DINGEN DIE HIER ANDERS ZIJN DAN BIJ serveAccountFile() ──────────────
 *
 * 1 · GEEN RANGE, GEEN onlyIf. Een factuur is een paar kilobyte. Het bereik- en
 *     conditionele-verzoekapparaat hierboven bestaat voor beelden van tientallen
 *     megabytes en zou hier alleen extra takken opleveren die niemand raakt.
 *
 * 2 · GEEN 410. Beelden verlopen — dat is de afspraak op /terms — maar een
 *     factuur verloopt niet. Wij moeten hem zeven jaar bewaren en de klant mag
 *     hem al die tijd ophalen. Er is dus geen `expires_at` om te controleren en
 *     dat is geen vergeten controle.
 *
 * 3 · ALTIJD ALS DOWNLOAD, nooit inline. Dit is een document voor de boekhouding
 *     en niet iets om even te bekijken; de bestandsnaam is het factuurnummer,
 *     zodat wat er in de map belandt te herkennen is zonder hem te openen.
 *
 * De eigendomscontrole loopt via `orders`, niet via `invoices.customer_id`. Die
 * kolom is ON DELETE SET NULL — een verwijderd klantaccount laat de factuur staan
 * met een leeg klantveld, en een controle daarop zou dan van "niet van jou"
 * ongemerkt naar "van niemand, dus van iedereen" schuiven.
 */
async function serveInvoicePdf(context, customer, invoiceId) {
  const { env } = context;
  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let inv;
  try {
    inv = await env.DB.prepare(
      `SELECT i.number, i.status, i.pdf_key
         FROM invoices i JOIN orders o ON o.id = i.order_id
        WHERE i.id = ?1 AND o.customer_id = ?2`
    ).bind(invoiceId, customer.customer_id).first();
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!inv) return new Response(null, { status: 404, headers: fileHeaders() });
  // 'pending' heeft een nummer en nog geen document. 404 en niet 500: er is niets
  // te leveren, en het overzicht toont voor deze rij ook geen knop.
  if (inv.status !== 'issued' || !inv.pdf_key) return new Response(null, { status: 404, headers: fileHeaders() });

  let object;
  try {
    object = await env.UPLOADS.get(inv.pdf_key);
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!object || !object.body) return new Response(null, { status: 404, headers: fileHeaders() });

  const headers = new Headers(fileHeaders());
  headers.set('content-type', 'application/pdf');
  headers.set('content-disposition', `attachment; ${dispositionFilename(`${inv.number}.pdf`)}`);
  if (typeof object.size === 'number') headers.set('content-length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

/*
 * Een creditnota als pdf.
 *
 * Regel voor regel dezelfde vorm als serveInvoicePdf() hierboven, en met opzet een eigen
 * functie in plaats van een gedeelde met een tabelnaam als parameter: een tabelnaam die
 * uit een aanroep komt, is een tabelnaam die ooit uit een URL komt.
 *
 * DE EIGENDOMSCONTROLE LOOPT OOK HIER VIA `orders`, en dat is hier nog scherper dan bij
 * een factuur: `credit_notes.customer_id` is ON DELETE SET NULL, dus een verwijderd
 * klantaccount laat de nota staan met een leeg klantveld. Een controle op die kolom zou
 * dan van "niet van jou" ongemerkt naar "van niemand, dus van iedereen" schuiven — precies
 * het lek dat een klant nooit mag kunnen vinden.
 */
async function serveCreditPdf(context, customer, creditId) {
  const { env } = context;
  if (!env.UPLOADS) return new Response(null, { status: 503, headers: fileHeaders() });

  let note;
  try {
    note = await env.DB.prepare(
      `SELECT c.number, c.status, c.pdf_key
         FROM credit_notes c JOIN orders o ON o.id = c.order_id
        WHERE c.id = ?1 AND o.customer_id = ?2`
    ).bind(creditId, customer.customer_id).first();
  } catch {
    /* Geen tabel (migratie 0026 nog niet gedraaid) valt hier samen met een onbereikbare
       database: in beide gevallen is er niets te leveren en is 503 het eerlijke antwoord. */
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!note) return new Response(null, { status: 404, headers: fileHeaders() });
  if (note.status !== 'issued' || !note.pdf_key) return new Response(null, { status: 404, headers: fileHeaders() });

  let object;
  try {
    object = await env.UPLOADS.get(note.pdf_key);
  } catch {
    return new Response(null, { status: 503, headers: fileHeaders() });
  }
  if (!object || !object.body) return new Response(null, { status: 404, headers: fileHeaders() });

  const headers = new Headers(fileHeaders());
  headers.set('content-type', 'application/pdf');
  headers.set('content-disposition', `attachment; ${dispositionFilename(`${note.number}.pdf`)}`);
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

/*
 * SameSite=Lax, NOT Strict — and this is the whole sign-in bug, August 2026.
 *
 * Lucas: *"als ik op die link klik dan moet ik nog een keer mijn email invullen
 * en dan krijg ik nog een mail met inloglink en dan geeft weer aan dat ik mijn
 * mail in moet voeren."* An endless loop, and nothing in the database was wrong:
 * the token was found, the session row was written, email_verified was set, and
 * the 303 to /account went out with a correct Set-Cookie. The browser then threw
 * the cookie away on the very next request.
 *
 * WHY. A magic link is clicked from a mail client, so the request to
 * /account/verify/… is a CROSS-SITE navigation. A SameSite=Strict cookie is set
 * fine by that response, but it is not SENT on the redirected request that
 * follows, because the browser still counts the whole navigation chain as
 * cross-site-initiated. So /account received no cookie, decided nobody was
 * signed in, and rendered the email form again. Ask for a new link and the same
 * thing happens forever. The one credential this site gives to customers was
 * unusable in every browser that implements SameSite correctly.
 *
 * WHAT Lax GIVES UP, precisely: nothing that matters here. Lax withholds the
 * cookie on cross-site POSTs and on cross-site subresource requests — which is
 * the entire CSRF surface — and sends it only on top-level cross-site GET
 * navigations, which is exactly the magic-link case and which changes no state
 * in this file. The Origin check on every state-changing POST that the header of
 * this file describes stays in place and is untouched.
 *
 * ADMIN KEEPS Strict, and the two files must not be made to match. admin.js
 * authenticates a PASSWORD typed into a form on this origin: its login is
 * same-site by nature, so Strict costs it nothing and buys the stronger
 * guarantee. The credential decides the attribute, not consistency between two
 * lines that happen to look alike.
 *
 * Path=/account stays. Everything that reads this session lives under /account,
 * including the /account/me probe the layout paints the header from, and a
 * narrower path is a smaller surface.
 */
const COOKIE_FLAGS = `Path=/account; HttpOnly; Secure; SameSite=Lax`;

function setSessionCookie(token) {
  const maxAge = ACCOUNT_SESSION_TTL_DAYS * 86400;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; ${COOKIE_FLAGS}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; ${COOKIE_FLAGS}`;
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
  <p class="loginwho">${esc(t.loginWho)}</p>
</div>`;
}

/**
 * "Kijk in je mail" — en sinds 7 augustus 2026 hoeft dat niet meer weg te leiden.
 *
 * WAT HIER VERANDERDE. Deze pagina was een doodlopende mededeling: lees dit,
 * ga weg, kom terug via je mailapp. Op een telefoon is dat de sprong waar
 * mensen afhaken — de mailapp opent zijn eigen browser, soms zonder de cookie
 * die hier gezet moet worden. Nu staat het invoerveld voor de zes cijfers uit
 * diezelfde mail er meteen onder: switchen naar je mail, zes cijfers lezen,
 * terugswitchen, klaar. Geen nieuw tabblad, geen tweede pagina.
 *
 * HET E-MAILADRES REIST MEE ALS HIDDEN FIELD. Het moet, want de code alleen
 * wijst geen klant aan — en het is het adres dat de bezoeker zojuist zelf heeft
 * ingetypt, dus er komt niets in beeld wat hij niet al wist. Bij een fout
 * antwoord wordt hij teruggezet, zodat niemand hem hoeft over te typen om nog
 * één poging te doen.
 *
 * `inputmode="numeric"` en `autocomplete="one-time-code"`: dat eerste geeft een
 * cijfertoetsenbord, het tweede laat iOS en Android de code uit de binnenkomende
 * mail als suggestie boven het toetsenbord zetten. Dan is de sprong helemaal
 * weg.
 */
function checkEmailBody(t, lang, email = '', message = null) {
  // The spam line comes from src/data/mailNote.js — the same sentence the
  // thank-you page and the portal's no-link screen print. See that file for why
  // it is shared rather than written three times.
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.checkTitle)}</h1>
  <p class="lede">${esc(t.checkBody)}</p>
  ${message ? `<p class="error" role="alert">${esc(message)}</p>` : ''}
  <form class="login codeform" method="post" action="/account/code">
    <input type="hidden" name="lang" value="${esc(lang)}">
    <input type="hidden" name="email" value="${esc(email)}">
    <label for="login-code">${esc(t.codeLabel)}</label>
    <input id="login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code"
           pattern="[0-9 ]{6,9}" maxlength="9" required autofocus
           placeholder="000000" aria-describedby="login-code-hint">
    <button class="btn btn-primary" type="submit">${esc(t.codeSubmit)}</button>
  </form>
  <p class="det-hint" id="login-code-hint">${esc(t.codeHint(LOGIN_CODE_TTL_MINUTES))}</p>
  <p class="mailnote">${esc(mailNote(lang))}</p>
  ${/*
     EN EEN WEG VOORUIT ALS DE CODE OP IS. Dezelfde les als op de
     dode-link-pagina hieronder: het scherm dat iemand alleen bereikt als hij
     vastzit, mag geen doodlopende weg zijn. De zin bij een mislukte poging
     verwijst naar "hieronder", en dan moet daar ook echt iets staan — hetzelfde
     formulier als /account/login, uit dezelfde functie, want twee e-mailvelden
     die het eens moeten zijn over hun naam en hun actie zijn twee dingen om
     verkeerd te doen.
  */ ''}
  <details class="codeagain"${message ? ' open' : ''}>
    <summary>${esc(t.codeAgain)}</summary>
    <form class="login" method="post" action="/account/login">
      <input type="hidden" name="lang" value="${esc(lang)}">
      <label class="sr-only" for="again-email">${esc(t.loginEmailLabel)}</label>
      <input id="again-email" name="email" type="email" autocomplete="email" required
             value="${esc(email)}" placeholder="${esc(t.loginEmailLabel)}">
      <button class="btn btn-ghost" type="submit">${esc(t.codeAgainCta)}</button>
    </form>
  </details>
  <!-- Hier valt de stilte als het adres niet bestaat: geen mail, geen uitleg.
       Dezelfde zin als op het inlogscherm, want dit is de plek waar iemand hem
       nodig heeft in plaats van waar hij hem las. -->
  <p class="loginwho">${esc(t.loginWho)}</p>
</div>`;
}

/*
 * A DEAD LINK IS THE ONE PAGE THAT MUST NOT BE A DEAD END.
 *
 * This page told the truth and then failed to act on it: the copy said "Vraag
 * hieronder een nieuwe aan" / "Request a new one below", and below it was a
 * small `.note` link to another page. Nothing to fill in, and the way forward
 * was the quietest thing on the screen — on the one screen a customer reaches
 * only when they are already stuck, and only after their link has expired.
 *
 * The form is rendered here now, so "below" is literally true and the fix is one
 * action instead of a page hop. It is the SAME form as /account/login, from the
 * same function, because two email fields that must agree about their name,
 * their autocomplete hint and their action is two things to get wrong.
 */
function badLinkBody(t, lang) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<div class="authcard">
  <h1>${esc(t.badLinkTitle)}</h1>
  <p class="lede">${esc(t.badLinkBody)}</p>
  <form class="login" method="post" action="/account/login">
    <input type="hidden" name="lang" value="${esc(lang)}">
    <input type="email" name="email" placeholder="${esc(t.loginEmailLabel)}" autocomplete="email" required>
    <button class="btn btn-primary" type="submit">${esc(t.loginSubmit)}</button>
  </form>
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
// Een blad met regels en een omgeslagen hoek. Bewust géén euroteken: dat staat
// naast ICON_PLAN ("Abonnement & facturering") en twee geldglyphs onder elkaar
// zeggen niet welke van de twee de documenten heeft.
const ICON_INVOICE = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/></svg>';

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
    // Facturen staat direct boven "Abonnement & facturering" en niet erin. Die
    // pagina gaat over wat je betaalt; deze over de documenten die je moet
    // bewaren. Ze samenvoegen zou de factuur onder een kop zetten waar hij niet
    // gezocht wordt — en op vijf plekken belooft de site "je factuur", niet "je
    // factureringsinstellingen".
    { key: 'invoices', href: '/account/invoices', label: t.navInvoices, icon: ICON_INVOICE },
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
      <!-- De taalknop. Eén link naar de andere taal en niet twee links waarvan
           er één de huidige is: "Nederlands · English" met de actieve grijs is
           twee dingen om te lezen voor een keuze met twee uitkomsten. -->
      <a class="sidelang" href="?lang=${lang === 'nl' ? 'en' : 'nl'}">${lang === 'nl' ? 'English' : 'Nederlands'}</a>
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
function overviewBody(t, lang, customer, orders, filesByOrder, eventsByOrder = new Map()) {
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

  /*
   * DE STROOK MET LAATST GELEVERDE BEELDEN.
   *
   * Lucas: *"op het klantenportaal begin dashboard alle recent geleverde
   * visuals tonen (alleen visueel niet downloadbaar) met een link erbij."*
   *
   * WAAROM ALLEEN KIJKEN HIER. Downloaden hoort bij de bestelling, want daar
   * staat de context: welk product, welke shot, goedgekeurd of niet. Een
   * losse strook met downloadknoppen zou dat allemaal weglaten en tóch de
   * eindhandeling aanbieden — dan download je iets zonder te weten waarvan.
   * Deze strook heeft één taak: laten zien dat er iets moois klaarstaat, en de
   * weg wijzen. Elke tegel linkt daarom naar zijn eigen bestelling.
   *
   * TWAALF, EN NIET ALLES. Dit is een overzicht, geen galerij. Twaalf vult twee
   * rijen op een breed scherm en blijft op een telefoon binnen één veegbeweging;
   * wie meer wil, klikt door — en dat is precies de link die hij vroeg.
   */
  const latest = [];
  for (const o of orders) {
    for (const f of (filesByOrder.get(o.id) || [])) {
      if (f.kind === 'upload') continue;
      if (f.expires_at && isExpired(f.expires_at, null)) continue;
      // Een strook met een gebroken plaatje erin leest als een kapot dashboard.
      // Een videobestand hoort bij zijn bestelling, niet in een beeldenstrook.
      if (!isViewable(f)) continue;
      latest.push({ f, o });
      if (latest.length >= 12) break;
    }
    if (latest.length >= 12) break;
  }

  const latestBlock = `
<div class="section-head">
  <h2>${esc(t.ovLatest)}</h2>
  ${orders.length ? `<a class="viewall" href="/account/orders">${esc(t.ovViewAll)}</a>` : ''}
</div>
${latest.length
  ? `<ul class="latest">${latest.map(({ f, o }) => `
      <li class="latest-item">
        <a href="/account/orders?order=${o.id}#order-${o.id}" title="${esc(o.ref)}">
          <img src="/account/files/${f.id}/f" alt="${esc(o.ref)}" loading="lazy" decoding="async">
        </a>
      </li>`).join('')}</ul>`
  : `<p class="empty">${esc(t.ovLatestEmpty)}</p>`}`;

  /*
   * ÉÉN BESTELLING BOVENAAN, DE REST ACHTER EEN KLAPJE — augustus 2026.
   *
   * Lucas: *"ik zou graag de oudste of nieuwste bestelling getoond willen
   * hebben op het dashboard, en wanneer de klant meerdere bestellingen heeft
   * geplaatst deze met een dropdown laten openen. Bedenk wat het beste is."*
   *
   * DE NIEUWSTE LOPENDE, en dat is de afweging. Nieuwste is voorspelbaar en
   * bijna altijd waar de aandacht zit; oudste is alleen beter als je "wat duurt
   * het langst" wilt beantwoorden, en dat is een vraag van een studio, niet van
   * een klant. Maar nieuwste-zonder-meer zou een net geleverde bestelling boven
   * een bestelling zetten die nog in productie is, en dan staat er "klaar"
   * bovenaan terwijl er nog iets loopt. Dus: de nieuwste LOPENDE bestelling, en
   * pas als er niets meer loopt de nieuwste van allemaal.
   *
   * De rest zit in een <details> die zegt hoeveel het er zijn. Geen echte
   * dropdown met een keuzelijst: dat vraagt om script en om een keuze die
   * niemand wil maken. Uitklappen laat ze alle drie zien, met hun eigen tijdlijn.
   */
  const active = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const featured = active[0] || orders[0] || null;
  // Alleen de andere LOPENDE bestellingen in het klapje. Geleverde bestellingen
  // horen hier niet: die staan al in de strook eronder en in de activiteitlijst,
  // en een klapje dat "nog 1 lopende bestelling" zegt en er vervolgens drie
  // toont waarvan twee klaar zijn, telt iets anders dan het belooft.
  const rest = active.filter((o) => o !== featured);

  const orderBlock = featured
    ? `
<div class="section-head"><h2>${esc(t.ovNowTitle)}</h2></div>
${featuredOrder(t, lang, featured, eventsByOrder.get(featured.id) || [])}
${rest.length
  ? `<details class="more-orders">
       <summary>${esc(t.ovOthers(rest.length))}</summary>
       <div class="more-orders-list">
         ${rest.slice(0, 6).map((o) => featuredOrder(t, lang, o, eventsByOrder.get(o.id) || [])).join('')}
       </div>
       ${rest.length > 6 ? `<p class="meta"><a class="viewall" href="/account/orders">${esc(t.ovViewAll)}</a></p>` : ''}
     </details>`
  : ''}`
    : '';

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

${orderBlock}

${latestBlock}

<div class="section-head">
  <h2>${esc(t.ovRecent)}</h2>
  ${orders.length ? `<a class="viewall" href="/account/orders">${esc(t.ovViewAll)}</a>` : ''}
</div>
${recent.length
  ? `<ul class="activity">${recent.map((o) => activityRow(t, lang, o)).join('')}</ul>`
  : `<p class="empty">${esc(t.emptyOrders)}</p>`}`;
}

/**
 * Eén bestelling op het overzicht: de kop, de tijdlijn, en de weg erheen.
 *
 * BEWUST NIET DE HELE ORDERKAART. Die bevat de productkaarten met knoppen om
 * goed te keuren, en dat hoort op de bestellingenpagina — een overzicht dat
 * alles herhaalt is geen overzicht meer. Hier staat wat je wilt weten zonder
 * te klikken (waar is het, wanneer) plus één link naar de plek waar je iets
 * kunt dóén.
 */
function featuredOrder(t, lang, o, events) {
  return `
<div class="ovorder">
  <div class="ovorder-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="pill is-${esc(o.status)}">${esc(statusLabel(o.status, lang) || o.status)}</span>
    <span class="meta">${esc(serviceLabel(o.service, lang) || o.service)}${o.product_count ? ` · ${esc(String(o.product_count))} ${esc(t.fProducts.toLowerCase())}` : ''}</span>
    <a class="viewall" href="/account/orders?order=${o.id}#order-${o.id}">${esc(t.ovOpenOrder)}</a>
  </div>
  ${progressBlock(t, lang, o, events)}
  ${studioNote(t, o)}
</div>`;
}

/**
 * De mededeling van de studio bij deze bestelling.
 *
 * Lucas: *"één notitieveld per bestelling in admin dat de klant óók ziet."*
 * Hier is dat veld, aan de kant waar het gelezen wordt. Eén staand bericht,
 * geen gesprek — wat er nu geldt over deze bestelling. Er staat bij van wie het
 * komt, want een zin zonder afzender op een dashboard leest als systeemtekst,
 * en dit is juist het tegenovergestelde: iemand die iets tegen je zegt.
 */
function studioNote(t, o) {
  if (!o.customer_note) return '';
  return `<div class="studionote">
  <span class="studionote-who">${esc(t.noteFrom)}</span>
  <p>${esc(o.customer_note)}</p>
</div>`;
}

function activityRow(t, lang, o) {
  return `<li>
  <a class="activity-link" href="/account/orders?order=${o.id}#order-${o.id}">
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
function ordersBody(t, lang, orders, filesByOrder, eventsByOrder = new Map(), statusFilter = '', payFailed = false, feedbackByOrder = new Map(), payHeld = false, openOrderId = 0) {
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
${payFailed ? `<p class="det-ok is-warn" role="status">${esc(t.payFailed)}</p>` : ''}
${payHeld ? `<p class="det-ok is-warn" role="status">${esc(t.payHeld)}</p>` : ''}
${filters}
${shown.length ? shown.map((o, i) => orderCard(t, lang, o, filesByOrder.get(o.id) || [], eventsByOrder.get(o.id) || [], feedbackByOrder.get(o.id) || null, i, openOrderId)).join('') : empty}`;
}

/**
 * Je vaste look (tot 8 augustus 2026: "Brand kit") — rebuilt as something a
 * brand can look at.
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
function detailsBody(t, lang, details, justSaved, missing = false) {
  return `
<h1>${esc(t.detH)}</h1>
<p class="lede">${esc(t.detLede)}</p>
${detailsSection(t, lang, details, justSaved, missing)}`;
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
function detailsSection(t, lang, details, justSaved, missing = false) {
  const d = details || {};
  const COUNTRIES = countryOptions(lang);

  /*
   * WAT VERPLICHT IS, EN WAAROM DAT HIER OMDRAAIT — 7 augustus 2026.
   *
   * Dit scherm had één regel: elk veld optioneel, en een leeg vakje betekent
   * "haal weg". Dat was juist zolang het een geheugensteuntje was. Nu er een
   * factuur uit komt is het dat niet meer: een factuur zonder tenaamstelling,
   * zonder adres of zonder land is geen factuur, en het land bepaalt bovendien
   * of er 21% of "btw verlegd" op staat.
   *
   * Lucas: *"Deze gegevens zijn ook verplicht inclusief btw-nummer met een
   * checkbox bij btw-nummer toch te skippen als de klant geen btw-nummer heeft
   * of buiten de eu komt."*
   *
   * Optioneel blijven alleen de twee die op een echt adres ook echt kunnen
   * ontbreken: de toevoeging, en de provincie — die staat in het grootste deel
   * van Europa niet op een adres. Telefoon en website blijven optioneel omdat
   * ze niet op de factuur horen.
   *
   * `required` in de markup is de eerste laag; handleDetails() controleert het
   * daarna nog eens, want een formulier is een verzoek en geen belofte.
   */
  const field = (name, label, value, opts = {}) => `
    <div class="det-field">
      <label for="det-${esc(name)}">${esc(label)}${opts.optional ? ` <span class="det-opt">${esc(t.detOptional)}</span>` : ''}</label>
      <input id="det-${esc(name)}" name="${esc(name)}" type="${esc(opts.type || 'text')}" value="${esc(value || '')}" maxlength="${DETAIL_MAX}"${opts.placeholder ? ` placeholder="${esc(opts.placeholder)}"` : ''} autocomplete="${esc(opts.auto || 'off')}"${opts.optional ? '' : ' required'}>
      ${opts.hint ? `<span class="det-hint">${esc(opts.hint)}</span>` : ''}
    </div>`;

  return `
<section class="detpanel" id="details">
  ${justSaved ? `<p class="det-ok" role="status">${esc(t.detSaved)}</p>` : ''}
  ${missing ? `<p class="det-ok is-warn" role="alert">${esc(missing === 'failed' ? t.detFailed : t.detMissing)}</p>` : ''}
  ${/*
     DE AANSPORING STAAT ER ALLEEN ALS ER NOG GEEN NUMMER IS. Lucas: *"wij raden
     aan telefoonnummer voor whatsapp toe te voegen om sneller updates te
     krijgen."* Een aanbeveling die blijft staan nadat je hem hebt opgevolgd, is
     geen aanbeveling meer maar ruis — en het is precies de reden dat mensen dit
     soort blokken wegleren te kijken. Zodra het veld gevuld is, verdwijnt hij.

     Hij belooft ook niets wat we niet doen: er staat dat we je dáár kunnen
     bereiken, niet dat er automatisch iets verstuurd wordt. Zolang er geen
     WhatsApp-verzending bestaat, zou dat laatste een toezegging zijn die
     niemand nakomt.
  */ ''}
  ${d.phone ? '' : `<div class="wa-nudge">
    <h3>${esc(t.waNudgeTitle)}</h3>
    <p>${esc(t.waNudgeBody)}</p>
    <p><a class="btn btn-quiet btn-sm" href="#det-phone">${esc(t.waNudgeCta)}</a></p>
  </div>`}
  <form class="detform" method="post" action="/account/details">
    ${/*
       VOORNAAM EN ACHTERNAAM. Lucas, 7 augustus 2026: *"Aanpassen naar naam en
       achternaam."* Er stond één veld met "Je naam" erboven, en dat levert
       "Mara" op — genoeg voor een aanhef in een mail, te weinig voor de
       tenaamstelling op een factuur.

       EEN LEGE ACHTERNAAM VALT TERUG OP DE OUDE WAARDE. Wie zijn gegevens vóór
       vandaag heeft opgeslagen, heeft alleen `name`; splitsen bij de spatie
       zou bij "Van der Meer" of "de Jong" het verkeerde antwoord geven, en een
       gok die één op de tien namen verminkt is erger dan een veld dat de klant
       zelf even rechtzet. Dus komt de bestaande naam in het voornaamveld te
       staan en vult hij de achternaam zelf aan.
    */ ''}
    <div class="det-grid">
      ${field('first_name', t.detFirst, d.first_name || (d.last_name ? '' : d.name), { auto: 'given-name' })}
      ${field('last_name', t.detLast, d.last_name, { auto: 'family-name' })}
    </div>
    ${/*
       ELKE RIJ IS TWEE VELDEN OF ÉÉN OVER DE VOLLE BREEDTE — 7 augustus 2026.

       Lucas: *"sommige invul velden staan heel random geplaatst."* Dat kwam
       niet alleen uit de CSS: het merkveld stond alleen op een rij, e-mail stond
       los buiten het raster, en het btw-veld stond weer alleen. Drie
       verschillende breedtes op één formulier, in een volgorde die er geen
       reden voor gaf.

       Nu is het gegroepeerd naar wat het is — wie je bent, hoe we je bereiken,
       waar je zit, en de fiscale gegevens — en heeft elk veld een van twee
       breedtes. `is-wide` is een besluit dat in de markup staat, niet iets wat
       een rij overkomt omdat er toevallig één veld in zit.
    */ ''}
    <div class="det-grid">
      ${field('brand', t.detBrand, d.brand, { auto: 'organization' })}
      ${field('website', t.detWebsite, d.website, { type: 'url', placeholder: 'https://', auto: 'url', optional: true })}
    </div>
    <div class="det-grid">
      <div class="det-field is-wide">
        <span class="det-label">${esc(t.detEmail)}</span>
        <p class="det-fixed">${esc(d.email || '')}</p>
        <span class="det-hint">${esc(t.detEmailNote)}</span>
      </div>
    </div>
    <div class="det-grid">
      ${field('phone', t.detPhone, d.phone, { type: 'tel', auto: 'tel', optional: true, hint: t.detPhoneHint })}
    </div>
    ${/*
       LAND EN FACTUURADRES, sinds 7 augustus 2026.

       Ze werden hier al GELEZEN — detailsRow() haalt ze op, /account/me geeft ze
       terug, en /start vult er stap 3 mee voor — maar ze stonden niet in dit
       formulier. Een merk dat verhuist of dat bij de eerste bestelling het
       verkeerde land koos, kon dat dus nergens meer rechtzetten:
       upsertCustomer() in functions/api/order.js overschrijft een land dat er al
       staat met opzet niet, en dit scherm bood het niet aan. De lede erboven
       zegt intussen "pas hier iets aan en de volgende bestelling neemt het
       over".

       En het is niet cosmetisch. Sinds de btw-beslissing (src/data/vat.js)
       bepaalt dit ene veld of er 21% bij komt of dat er verlegd wordt. Een land
       dat niet klopt is een factuur die niet klopt.

       DEZELFDE WOORDEN ALS OP HET BESTELFORMULIER. De labels, de groepen en de
       plaatsaanduiding komen letterlijk overeen met OrderFlow.astro, en de
       landenlijst komt uit dezelfde countryOptions() — twee schermen die naar
       hetzelfde vragen horen het op dezelfde manier te vragen.
    */ ''}
    <div class="det-grid">
      ${field('address_line1', t.detStreet, d.address_line1, { placeholder: t.detStreetPh, auto: 'address-line1' })}
      ${field('address_line2', t.detStreet2, d.address_line2, { placeholder: t.detStreet2Ph, optional: true, auto: 'address-line2' })}
    </div>
    ${/*
       VIER VELDEN IN PLAATS VAN ÉÉN, sinds 7 augustus 2026. Lucas: *"Is
       factuuradres in 1 regel wel handig, dit doen ze toch vaak apart."* Zie
       migrations/0016 voor de drie redenen; de belangrijkste is dat een factuur
       de regels onder elkaar moet kunnen zetten en dat uit één vrij ingetypt
       veld niet te halen is.

       autocomplete per veld is de tweede reden en hij is hier zichtbaar:
       address-line1, postal-code en address-level2 worden door browsers
       herkend en ingevuld, `street-address` op één input is de slechtst
       ondersteunde van het stel.
    */ ''}
    <div class="det-grid">
      ${field('postal_code', t.detPostal, d.postal_code, { placeholder: t.detPostalPh, auto: 'postal-code' })}
      ${field('city', t.detCity, d.city, { auto: 'address-level2' })}
    </div>
    <div class="det-grid">
      <div class="det-field">
        <label for="det-country">${esc(t.detCountry)}</label>
        <select id="det-country" name="country" autocomplete="country">
          <option value="">${esc(t.detCountryPick)}</option>
          ${COUNTRIES.home.map((c) => `<option value="${esc(c.id)}"${d.country === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          <optgroup label="${esc(t.detCountryEu)}">
            ${COUNTRIES.eu.map((c) => `<option value="${esc(c.id)}"${d.country === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          </optgroup>
          <optgroup label="${esc(t.detCountryOther)}">
            ${COUNTRIES.other.map((c) => `<option value="${esc(c.id)}"${d.country === c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
          </optgroup>
        </select>
        <span class="det-hint">${esc(t.detCountryHint)}</span>
      </div>
      ${field('region', t.detRegion, d.region, { optional: true, hint: t.detRegionHint, auto: 'address-level1' })}
    </div>
    ${/*
       HET BTW-NUMMER IS VERPLICHT, TENZIJ JE ZEGT DAT JE ER GEEN HEBT.

       Lucas: *"inclusief btw-nummer met een checkbox bij btw-nummer toch te
       skippen als de klant geen btw-nummer heeft of buiten de eu komt."*

       WAAROM EEN VINKJE EN NIET GEWOON "OPTIONEEL". Een leeg veld is
       dubbelzinnig: het betekent óf "nog niet ingevuld" óf "die heb ik niet",
       en dat verschil is precies wat je wilt weten. Een particulier en een
       Amerikaans bedrijf hebben er geen — en horen niet elke keer opnieuw langs
       een veld te moeten dat rood kleurt. Een Duits bedrijf dat het vergeet
       hoort dat wél te merken, want zonder nummer betaalt het 21% dat het had
       kunnen laten verleggen.

       HET VINKJE KOOPT GEEN 0%. Het zegt alleen iets over dit formulier.
       vatDecision() in src/data/vat.js kijkt naar het land en naar een bij VIES
       bevestigd nummer, en verder naar niets.

       GEEN `required` OP DIT ENE VELD, EN DAT IS EEN BESLUIT. Deze pagina heeft
       geen script — default-src 'none', zie html() — dus een vinkje kan het
       attribuut niet weghalen. Stond het er wel, dan kon iemand die het vinkje
       aanzet zijn formulier niet meer versturen: de browser weigert, wijst naar
       een leeg veld, en er is niets dat dat kan opheffen. De eis staat dus op de
       server, in handleDetails(), waar hij het vinkje kan meewegen. Het
       uitgrijzen is puur `.det-vat:has(input:checked)` in account.css.
    */ ''}
    <div class="det-grid det-vat">
      <div class="det-field">
        <label for="det-vat">${esc(t.detVat)}${d.no_vat_number ? ` <span class="det-opt">${esc(t.detOptional)}</span>` : ''}</label>
        <input id="det-vat" name="vat" type="text" value="${esc(d.vat_number || '')}" maxlength="${DETAIL_MAX}" placeholder="NL000000000B00" autocomplete="off">
        <label class="det-check">
          <input type="checkbox" name="no_vat" value="1"${d.no_vat_number ? ' checked' : ''}>
          <span>${esc(t.detNoVat)}</span>
        </label>
        <span class="det-hint">${esc(t.detVatHint)}</span>
      </div>
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
/*
 * ─────────────────────────────────────────────────────────────────────────────
 * FACTUREN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * De site belooft op vijf plekken een factuur — /terms §9, de btw-noot op
 * /pricing, de FAQ, de bestelbevestiging, en /demo zegt zelfs dat de factuur
 * automatisch volgt. Tot 9 augustus 2026 werd er geen enkele gemaakt en had de
 * klant nergens een plek om te kijken. Dit is die plek.
 */

/**
 * De facturen van deze klant, en wat er ontbreekt alsnog aanmaken.
 *
 * ── WAAROM DIT SCHERM FACTUREN MAG MAKEN ────────────────────────────────────
 *
 * De betaalwebhook geeft de factuur normaal uit op het moment van betalen. Dat
 * is één pad, en het is een pad dat kan mislukken op een manier die niemand
 * merkt: Mollie krijgt zijn 200, de betaling staat goed, en alleen het document
 * ontbreekt. Zonder een tweede pad zou dat betekenen dat een klant een factuur
 * mist en dat wij het pas horen als hij erom vraagt.
 *
 * Dus haalt dit scherm de achterstand in. Voor elke betaalde bestelling zonder
 * factuur wordt issueInvoice() aangeroepen, met de BETAALDATUM als factuurdatum
 * en niet met vandaag — een factuur die te laat is gemaakt is nog steeds een
 * factuur van de dag dat er betaald werd.
 *
 * Dat is veilig omdat issueInvoice() idempotent is: hij geeft geen tweede nummer
 * uit voor dezelfde bestelling, en een halve poging (nummer wel, pdf niet) wordt
 * met hetzelfde nummer afgemaakt. Twee tabbladen tegelijk leveren dus één
 * factuur op.
 *
 * ── BEGRENSD, EN WAAROM ─────────────────────────────────────────────────────
 *
 * Maximaal CATCHUP_MAX per paginabezoek. Een klant met vijftig onbefactureerde
 * bestellingen zou anders vijftig pdf's in één request renderen en de pagina
 * laten aflopen — en dan krijgt hij er nul. Vijf per keer betekent dat de eerste
 * vijf er wel staan en de rest bij het volgende bezoek volgt, wat een langzame
 * inhaalslag is in plaats van een pagina die niet laadt. In de praktijk is de
 * achterstand nul of één.
 *
 * Fouten worden gelogd en genegeerd: het overzicht van de facturen die er WEL
 * zijn mag niet omvallen op eentje die niet gemaakt kan worden.
 */
const CATCHUP_MAX = 5;

/**
 * Welke betaalde bestellingen nog een factuur missen, in de volgorde waarin ze een
 * nummer horen te krijgen: oudste betaling eerst.
 *
 * Geëxporteerd om één reden: dit is te testen zonder een halve database na te bouwen,
 * en de vorige versie van deze regel is precies het soort fout dat je niet ziet
 * zolang er één bestelling per keer langskomt.
 *
 * @param {Array<{ref: string, id: number, payment_status: string, paid_at: string}>} orders
 * @param {Set<string>} have  refs die al een factuur hebben
 */
/**
 * De refs die een AFGERONDE factuur hebben. Een halve factuur (nummer wel, pdf niet)
 * hoort er niet in, want die moet opnieuw geprobeerd worden — zie de noot in
 * invoicesFor(). Apart en geëxporteerd zodat die regel te testen is zonder een
 * dashboard te renderen.
 */
export function issuedRefs(list) {
  return new Set((list || []).filter((r) => r && r.status === 'issued').map((r) => r.ref));
}

export function catchupOrder(orders, have) {
  return (orders || [])
    .filter((o) => o.payment_status === 'paid' && o.paid_at && !have.has(o.ref)
      /*
       * ── EN EEN BEDRAG, WANT ANDERS IS HET GEEN FACTUUR — 12 AUGUSTUS 2026 ──
       *
       * Vanaf vandaag krijgt de proefvisual van EUR 1 een echte factuur: het bedrag
       * staat nu in `total_cents` en de btw is eruit gerekend in plaats van erbovenop
       * (zie quoteTestSample() in src/lib/quote.js).
       *
       * Alleen: de proefvisuals die voor vandaag zijn betaald hebben `total_cents`
       * NULL, want quoteOrder() gaf null en niemand schreef er iets. Zonder deze regel
       * maakt de inhaalslag daar bij het eerstvolgende bezoek een genummerde factuur
       * van die "Subtotaal EUR 0,00 - btw EUR 0,00 - Betaald EUR 0,00" zegt, terwijl er
       * EUR 1 is afgeschreven, en die verbruikt een nummer in een reeks die geen gaten
       * mag hebben. Het is dus niet terug te draaien.
       *
       * Het is geen uitzondering voor de proefvisual maar een regel over facturen: een
       * factuur van nul euro is nooit een geldig document. Dezelfde controle staat in de
       * webhook, en dat is met opzet twee keer -- dit is de tweede weg naar
       * issueInvoice() en die moet zelfstandig kloppen.
       *
       * Wil je voor die oude bestellingen alsnog een factuur, dan is dat handwerk:
       * `total_cents` en `vat_cents` bijschrijven met de tariefverdeling van de
       * betaaldatum, en dan opent de klant zijn dashboard. Dat is bewust geen
       * automatische migratie -- een bedrag achteraf invullen in een boekhouding is iets
       * wat je zelf wilt hebben gezien.
       */
      && Number(o.total_cents) > 0)
    .sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)) || (a.id - b.id));
}

async function invoicesFor(env, customerId, orders) {
  const read = async () => {
    try {
      const res = await env.DB.prepare(
        `SELECT i.id, i.number, i.status, i.pdf_bytes, i.snapshot_json, i.lang, i.issued_at, i.created_at,
                o.ref, o.service, o.paid_at
           FROM invoices i JOIN orders o ON o.id = i.order_id
          WHERE o.customer_id = ?1
          ORDER BY i.year DESC, i.seq DESC
          LIMIT 200`
      ).bind(customerId).all();
      return res?.results || [];
    } catch (err) {
      // Migratie 0021 nog niet gedraaid: "no such table: invoices". Dezelfde
      // afspraak als loadOrders() met de kolommen uit 0013 en 0015 — geen tabel
      // betekent geen facturen, niet een kapot dashboard.
      console.warn('[account] facturen niet te lezen —', err && err.message,
        '— migratie 0021 gedraaid?');
      return null;
    }
  };

  /*
   * ── EN DE CREDITNOTA'S ERBIJ — 12 augustus 2026 ────────────────────────────
   *
   * Een klant die geld terug heeft gekregen, heeft een document dat dat zegt, en dat
   * document hoort in hetzelfde overzicht als de factuur die het intrekt. Op twee plekken
   * kijken is precies wat een klant niet doet: dan mailt hij jou.
   *
   * TWEE TABELLEN EN GEEN UNION IN SQL. Dat is de prijs van de keuze voor een eigen tabel
   * (zie migrations/0026), en het is hier de goedkoopste vorm: twee kleine queries en één
   * sorteeropdracht in JS zijn leesbaarder dan een UNION met tien kolommen die aan
   * weerszijden dezelfde naam moeten hebben — en een UNION waarvan één kant een kolom
   * mist, valt stil om.
   *
   * Geen tabel betekent geen nota's en géén waarschuwing in de log: migratie 0026 kan nog
   * niet gedraaid zijn terwijl 0021 dat wel is, en dan is een leeg antwoord het juiste
   * antwoord in plaats van een regel die elke paginaweergave herhaalt.
   */
  const readCredits = async () => {
    try {
      const res = await env.DB.prepare(
        `SELECT c.id, c.number, c.status, c.pdf_bytes, c.snapshot_json, c.lang, c.issued_at, c.created_at,
                o.ref, o.service, o.paid_at
           FROM credit_notes c JOIN orders o ON o.id = c.order_id
          WHERE o.customer_id = ?1
          ORDER BY c.year DESC, c.seq DESC
          LIMIT 200`
      ).bind(customerId).all();
      return (res?.results || []).map((r) => ({ ...r, kind: 'credit' }));
    } catch {
      return [];
    }
  };

  /*
   * De nota's worden PAS BIJ HET ANTWOORD toegevoegd en niet aan `list`, en dat is niet
   * willekeurig: de inhaalslag hieronder kijkt met issuedRefs() en catchupOrder() naar
   * FACTUREN. Zouden de nota's al in `list` zitten, dan zou een bestelling met een nota
   * als "heeft al een factuur" gelden en zou de inhaalslag hem overslaan.
   *
   * BOVENAAN GEDEFINIEERD, VÓÓR ELKE `return` DIE HEM GEBRUIKT. Dit stond eerst onderaan
   * de functie, en de vroege `return list` bij "niets in te halen" zat daarmee in de
   * temporal dead zone van deze const — of, wat er feitelijk gebeurde, hij liep om de
   * toevoeging heen en de creditnota verscheen niet in het overzicht. Dezelfde val als
   * bij `chain` in src/scripts/pipeline.js, met de noot daar.
   *
   * Sorteren op documentnummer en niet op datum: het is één doorlopende reeks, dus het
   * hoogste nummer is het nieuwste document. Een nota staat daarmee direct boven de
   * factuur die hij intrekt, wat precies de leesorde is die je wil.
   */
  const withCredits = async (invoices) => {
    const credits = await readCredits();
    if (!credits.length) return invoices;
    return [...invoices, ...credits].sort((a, b) => String(b.number).localeCompare(String(a.number)));
  };

  let list = await read();
  if (list === null) return [];

  // Wat is betaald en heeft nog geen factuur? Uit de lijst die sectionGet al
  // heeft geladen, dus zonder extra query.
  /*
   * ── ALLEEN UITGEGEVEN FACTUREN GELDEN ALS "HEEFT ER EEN" — 10 AUGUSTUS 2026 ──
   *
   * WAT LUCAS ZAG. Van de vier facturen die de inhaalslag maakte, bleef VIS-2026-0004
   * op "Wordt gemaakt" staan: nummer wel, pdf niet. En de tekst eronder zei
   * *"Vernieuw de pagina over een minuut"* — wat niet waar was. Deze verzameling werd
   * gevuld met ELKE factuur die er stond, ook een halve, dus bij het verversen viel die
   * bestelling buiten `behind` en werd er niets opnieuw geprobeerd. De pagina beloofde
   * iets wat de pagina zelf niet deed.
   *
   * WAAROM DIT VEILIG IS. issueInvoice() is hier expliciet op gebouwd: bestaat er al een
   * rij met een nummer maar zonder pdf, dan gebruikt hij DAT nummer opnieuw en rendert
   * hij uit de bewaarde momentopname. Geen tweede nummer, geen gat in de reeks, en
   * dezelfde pdf als de eerste poging had opgeleverd. De UPDATE erna staat op
   * `status = 'pending'`, dus twee gelijktijdige pogingen kunnen elkaar niet overschrijven.
   *
   * De nachtelijke cron (issuePendingInvoices) blijft het net eronder: die pakt wat na
   * een kwartier nog steeds hangt. Wat hier verandert is dat de klant niet tot de
   * volgende ochtend hoeft te wachten voor iets dat één render kost.
   *
   * EN HET IS TEGELIJK DE DIAGNOSE. Blijft een factuur na een keer verversen nóg op
   * "wordt gemaakt" staan, dan is het geen incident maar een fout die elke keer
   * terugkomt — en dan zegt dat meer dan een rij die stil blijft liggen.
   */
  const have = issuedRefs(list);
  /*
   * ── OP BETAALDATUM, OUDSTE EERST — 10 AUGUSTUS 2026 ───────────────────────
   *
   * WAT LUCAS ZAG. Na het opruimen van de testfacturen maakte deze inhaalslag er vier
   * nieuwe, en in het overzicht stond:
   *
   *   VIS-2026-0001   9 aug        VIS-2026-0003   7 aug
   *   VIS-2026-0002   9 aug        VIS-2026-0004   7 aug
   *
   * Het nummer loopt dus tegen de datum in. De oorzaak zit niet hier maar in de lijst
   * die binnenkomt: loadOrders() sorteert `ORDER BY created_at DESC` omdat een klant
   * zijn nieuwste bestelling bovenaan wil zien. Die volgorde werd hier ongewijzigd
   * doorgegeven aan issueInvoice(), en dat is de plek die het volgende nummer uitdeelt.
   * De nieuwste bestelling kreeg dus 0001, en `paid_at` werd de factuurdatum.
   *
   * WAAROM DAT NIET MAG BLIJVEN. De nummers zijn wél opeenvolgend en zonder gaten, dus
   * de eis van de Belastingdienst is niet geschonden. Maar een reeks waarin factuur
   * 0003 twee dagen vóór 0001 gedateerd is, is het eerste wat een boekhouder eruit
   * haalt, en bij een kwartaalaangifte moet je gaan uitleggen wat er niet uit te leggen
   * is. Bovendien gebeurt het opnieuw bij elke inhaalslag van meer dan één bestelling —
   * dit is geen eenmalige verschuiving maar het gedrag.
   *
   * De sortering staat HIER en niet in loadOrders(), want die volgorde is goed voor wat
   * hij doet: het dashboard van de klant. Twee lezers met twee verschillende eisen aan
   * dezelfde lijst, en de eis van de factuurreeks is de striktere van de twee.
   *
   * `id` als tweede sleutel omdat twee bestellingen op dezelfde seconde betaald kunnen
   * zijn — dan bepaalt de volgorde van aanmaak wie het lagere nummer krijgt, en niet
   * hoe de database die dag toevallig teruggeeft.
   */
  const behind = catchupOrder(orders, have);
  if (!behind.length) return await withCredits(list);

  let made = 0;
  for (const o of behind.slice(0, CATCHUP_MAX)) {
    try {
      await issueInvoice(env, o.id, { today: o.paid_at });
      made++;
    } catch (err) {
      console.error('[account] factuur voor', o.ref, 'niet uitgegeven —', err && err.message ? err.message : err);
    }
  }
  if (behind.length > CATCHUP_MAX) {
    console.log('[account] nog', behind.length - CATCHUP_MAX, 'facturen achterstand voor klant', customerId,
      '— volgen bij het volgende bezoek');
  }
  if (!made) return await withCredits(list);

  const again = await read();
  return await withCredits(again === null ? list : again);
}

/** '9 aug 2026' / '9 Aug 2026' — als shortDate(), maar met het jaar erbij, want een factuur zonder jaartal is geen factuur. */
function invoiceDate(value, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!m) return String(value || '');
  const months = MONTHS[lang] || MONTHS.en;
  return `${Number(m[3])} ${months[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}

/**
 * Het overzicht.
 *
 * ÉÉN RIJ PER FACTUUR, MET DE DOWNLOAD ALS ENIGE ACTIE. Geen kaart per factuur
 * zoals bij een bestelling: een bestelling heeft een verloop en een tijdlijn, een
 * factuur is één document met vier feiten eraan. Wat iemand hier komt doen is
 * hem downloaden, en alles wat daar tussen staat is in de weg.
 *
 * DE LEGE STAAT ZEGT TWEE VERSCHILLENDE DINGEN. Iemand zonder betaalde
 * bestellingen hoort te lezen dat het er nog niet is; iemand die net betaald
 * heeft en wél iets verwacht, hoort te lezen dat het eraan komt. Eén tekst voor
 * beide zou voor de tweede lezen als "die van jou is er niet".
 */
function invoicesBody(t, lang, list, orders) {
  if (!list.length) {
    const anyPaid = orders.some((o) => o.payment_status === 'paid');
    return `
<h1>${esc(t.invHeading)}</h1>
<p class="lede">${esc(t.invLede)}</p>
<div class="card"><p class="meta">${esc(anyPaid ? t.invEmptyUnpaid : t.invEmpty)}</p></div>`;
  }

  const rows = list.map((inv) => {
    let snap = {};
    try { snap = JSON.parse(inv.snapshot_json || '{}'); } catch { /* dan zonder */ }
    const gross = Number(snap.netCents || 0) + Number(snap.vatCents || 0);
    const treatment = String(snap.treatment || '');
    const flag = treatment === VAT_TREATMENT.reverseCharge ? t.invReverse
      : treatment === VAT_TREATMENT.outsideScope ? t.invOutside
        : '';

    // 'pending' betekent: het nummer is uitgegeven, de pdf nog niet gemaakt. Dat
    // hoort niet als downloadknop te verschijnen die 404 geeft — zie migratie
    // 0021 over waarom het nummer er dan al is.
    //
    // GEEN .pill VOOR DE TWEE TOESTANDEN ZONDER KNOP. Een pill heeft in dit
    // dashboard een rand en een hoek, en in deze kolom staat verder alleen een
    // knop — dan leest "Wordt gemaakt" als iets waarop je kunt drukken, precies
    // in het geval dat je niets kunt doen. Vandaar gedempte tekst zonder rand:
    // een mededeling ziet eruit als een mededeling.
    /* Een creditnota heeft een eigen tabel en dus een eigen pad. Het pad uit de SOORT
       halen en niet uit het id: één route die zelf moet raden in welke tabel het getal
       hoort, is een route waar de eigendomscontrole aan een gok hangt. */
    const isCredit = inv.kind === 'credit';
    const href = isCredit
      ? `/account/credit-notes/${inv.id}/pdf`
      : `/account/invoices/${inv.id}/pdf`;
    const action = inv.status === 'issued'
      ? `<a class="btn btn-ghost" href="${href}">${esc(t.invDownload)}</a>`
      : `<span class="invstate">${esc(inv.status === 'void' ? t.invVoid : t.invPending)}</span>`;

    // data-label draagt de kolomkop mee naar de cel. Onder 40rem verdwijnt de
    // koprij en wordt elke rij een blok met label-waardeparen — zie account.css.
    // Een cel zonder label zou daar een los getal zijn.
    return `<tr>
      <td><b>${esc(inv.number)}</b>${isCredit
        ? `<span class="invflag">${esc(t.invCredit)}</span>`
        : ''}${flag ? `<span class="invflag">${esc(flag)}</span>` : ''}</td>
      <td data-label="${esc(t.invDate)}">${esc(invoiceDate(snap.date || inv.created_at, lang))}</td>
      <td data-label="${esc(t.invOrder)}">${esc(inv.ref || '')}</td>
      <td class="invamount" data-label="${esc(t.invAmount)}">${esc(money(gross, lang))}</td>
      <td class="invact">${action}</td>
    </tr>`;
  }).join('');

  const anyPending = list.some((inv) => inv.status === 'pending');

  return `
<h1>${esc(t.invHeading)}</h1>
<p class="lede">${esc(t.invLede)}</p>
<div class="card">
  <table class="invtable">
    <thead><tr>
      <th>${esc(t.invNumber)}</th><th>${esc(t.invDate)}</th><th>${esc(t.invOrder)}</th>
      <th class="invamount">${esc(t.invAmount)}</th><th></th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  ${anyPending ? `<p class="meta">${esc(t.invPendingNote)}</p>` : ''}
  <p class="meta">${esc(t.invKeepNote)}</p>
</div>`;
}

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

    // ── DE KANALEN, ALLEEN BIJ CATALOG ─────────────────────────────────────────
    //
    // Lucas, 8 augustus 2026: *"Doe het voor nu alleen bij catalog want
    // lifestyle, complete en video klopt ook nog niet."*
    //
    // Dus niet: de kolom per dienst begrenzen (zie migratie 0019 — dat zou een
    // tweede waarheid zijn zodra de andere stromen wél kloppen). Wel: dit blok
    // hier alleen tekenen, en applyBrandKit() in pipeline.js alleen op catalog
    // laten toepassen. Twee plekken, en ze noemen elkaar, zodat het opheffen van
    // deze beperking één zoekopdracht is en geen archeologie.
    const chOn = String(lock.channels || '').split(',')
      .map((v) => v.trim())
      .filter((v) => CHANNEL_IDS.includes(v));
    const chApplies = style === 'catalog';
    const chBoxes = !chApplies ? '' : CHANNELS.map((ch) => `
      <label class="bk-ch">
        <input type="checkbox" name="channels" value="${esc(ch.id)}"${chOn.includes(ch.id) ? ' checked' : ''}>
        <span class="bk-ch-name">${esc(channelName(ch, lang))}</span>
        ${ch.requiresWhite ? '<span class="bk-ch-flag">#FFFFFF</span>' : ''}
      </label>`).join('');
    const chGroup = !chApplies ? '' : `
    <fieldset class="bk-group">
      <legend>${esc(t.bkChLede)}</legend>
      <div class="bk-chs">${chBoxes}</div>
      <p class="bk-hint">${esc(t.bkChHint)}</p>
    </fieldset>`;

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
    const bgChip = bg ? swatch(bg, 'bk-sum-bg') : '';
    const bgMatch = bg ? BACKGROUNDS.find((b) => b.hex.toUpperCase() === bg) : null;
    const bgName = bg ? (bgMatch?.name[lang] || bgMatch?.name.en || bg) : t.bkAsk;

    // A service with NEITHER answer set said "asked per order · asked per
    // order" — the same sentence twice, which reads as a rendering bug rather
    // than as an unset service. One phrase covers both when both are unset.
    const chNames = chApplies && chOn.length
      ? CHANNELS.filter((c) => chOn.includes(c.id)).map((c) => channelName(c, lang)).join(', ')
      : '';
    const summaryNow = (!face && !bg && !chNames) ? esc(t.bkAsk)
      : [esc(faceName), esc(bgName)].concat(chNames ? [esc(chNames)] : [])
          .join(' <span class="bk-sum-dot">·</span> ');

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

    // The grounds. De kleur komt uit swatch() hierboven — zie daar waarom het
    // geen `style`-attribuut meer is. De hex staat er als tekst ónder: de kleur
    // is het antwoord, maar de waarde is het contract (zie backgrounds.js).
    const bgTiles = [
      `<label class="bk-sw is-none">
         <input type="radio" name="background_hex" value=""${bg === '' ? ' checked' : ''}>
         <span class="bk-sw-chip is-blank" aria-hidden="true"></span>
         <span class="bk-sw-name">${esc(t.bkNoPref)}</span>
       </label>`,
    ].concat(BACKGROUNDS.map((b) => `
      <label class="bk-sw">
        <input type="radio" name="background_hex" value="${esc(b.hex)}"${bg === b.hex.toUpperCase() ? ' checked' : ''}>
        ${swatch(b.hex, 'bk-sw-chip')}
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
    </fieldset>${chGroup}
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

/*
 * ── WAT EEN BESTELLING KOST, EN OF HET BETAALD IS — 7 augustus 2026 ─────────
 *
 * Dit scherm zei er niets over. Niet "onbetaald", niet het bedrag, niet dat de
 * reservering afloopt, en geen knop om het alsnog te doen. De enige betaallink
 * werd één keer aangemaakt bij het bestellen en reisde mee in de bevestigingsmail
 * en op /thank-you; wie de tab sloot of de mail kwijtraakte, kon nergens meer
 * betalen — terwijl `window_expires_at` gewoon doorliep.
 *
 * ── HET BEDRAG WORDT NIET OPNIEUW BEREKEND ──────────────────────────────────
 *
 * orders.total_cents is NETTO en is wat er destijds is geoffreerd. Opnieuw door
 * quoteOrder() halen zou betekenen dat een prijswijziging met terugwerkende
 * kracht op een bestaande bestelling landt, en dat is precies de fout die je
 * niet wilt maken op een scherm met een betaalknop eronder. De btw komt uit
 * vat_cents (migratie 0015).
 *
 * DRAAIT 0015 NOG NIET, dan bestaat vat_cents niet en valt dit terug op het
 * standaardtarief. Dat is geen gok: elke rij van vóór die migratie is een
 * Nederlandse bestelling met 21% erover — dat is letterlijk wat er tot dan toe
 * gebeurde, en het is dezelfde aanname die 0015 zelf als DEFAULT vastlegt. Naar
 * BENEDEN afronden zou hier gratis btw weggeven.
 */
function orderMoney(o) {
  const net = Number(o.total_cents);
  if (!Number.isFinite(net) || net <= 0) return null;
  const vat = Number.isFinite(Number(o.vat_cents)) && o.vat_cents !== null
    ? Number(o.vat_cents)
    : Math.round(net * VAT_RATE);
  const refunded = Number(o.refunded_cents) || 0;
  return { net, vat, gross: net + vat, refunded, known: o.vat_cents !== null && o.vat_cents !== undefined };
}

/** Centen als '€ 1.234,56' / '€1,234.56' — dezelfde vorm als euro() in pricing.js. */
function money(cents, lang) {
  const v = (Number(cents) || 0) / 100;
  return lang === 'nl'
    ? `€ ${v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `€${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Het geldblok op de bestelkaart.
 *
 * DE KNOP STAAT ER ALLEEN ALS ER ÉCHT NOG IETS TE BETALEN IS: een bedrag boven
 * nul, payment_status 'unpaid', en een dienst waarvoor er überhaupt een prijs
 * bestaat. Een "Nu betalen" onder een bestelling die al betaald is, is de ergste
 * knop die dit scherm kan hebben.
 */
function paymentBlock(t, lang, o) {
  const m = orderMoney(o);
  if (!m) return '';

  const state = String(o.payment_status || 'unpaid');
  // "€ 0,00" onder Btw is een correct bedrag en een nietszeggend antwoord. Bij
  // een verlegde of buiten-scope bestelling staat er wát er op de factuur staat
  // — "Btw verlegd" — want dat is de reden dat er nul staat, en die reden is
  // precies wat een boekhouder hier zoekt. vatShort() is dezelfde bron die de
  // factuur en het adminscherm gebruiken.
  const zeroWhy = o.vat_treatment && o.vat_treatment !== VAT_TREATMENT.standard
    ? vatShort(o.vat_treatment, lang)
    : null;
  /*
   * ── EEN BETAALDE BESTELLING KRIJGT ÉÉN REGEL, GEEN UITSPLITSING ─────────────
   *
   * Hier stonden altijd drie regels (excl. btw / btw / totaal) plus soms een vierde
   * voor terugbetaald, ook op een bestelling die maanden geleden betaald is. Op de
   * bestellingenpagina van Lucas stond die uitsplitsing tien keer onder elkaar, en
   * dat is het grootste deel van waarom die pagina onoverzichtelijk las.
   *
   * De uitsplitsing hoort ergens: op de FACTUUR. Die is per bestelling met één klik
   * te downloaden in Studio → Facturen, hij is het document waar een boekhouder naar
   * kijkt, en hij is bevroren — daar kan het bedrag niet meer bewegen. Een tweede
   * plek waar hetzelfde staat is geen service maar ruis.
   *
   * BIJ EEN ONBETAALDE BESTELLING BLIJFT HIJ WEL STAAN. Daar is de uitsplitsing geen
   * naslag maar de vraag zelf: dit is wat je gaat betalen, en dan hoort te staan
   * waaruit dat bedrag bestaat vóórdat iemand op de knop drukt. Een terugbetaling
   * blijft ook altijd zichtbaar; dat is nieuws en geen naslag.
   */
  const settled = state === 'paid' && !(m.refunded > 0);
  const rows = settled
    ? [[t.payTotal, money(m.gross, lang)]]
    : [
      [t.payNet, money(m.net, lang)],
      [t.payVat, m.vat === 0 && zeroWhy ? zeroWhy : money(m.vat, lang)],
      [t.payTotal, money(m.gross, lang)],
    ];
  if (m.refunded > 0) rows.push([t.payRefunded, money(m.refunded, lang)]);

  let line;
  let cls;
  if (state === 'paid') {
    cls = 'is-paid';
    line = o.paid_at ? t.payPaidOn(shortDate(o.paid_at, lang)) : t.payPaid;
  } else if (state === 'refunded') {
    cls = 'is-refunded';
    line = t.payRefundedNote;
  } else {
    cls = 'is-unpaid';
    // Het venster verloopt, en dat is de reden dat dit dringend is. Alleen
    // zeggen als er ook echt een datum staat — een dreiging zonder datum is
    // alleen maar onrust.
    line = o.window_expires_at
      ? t.payDueBy(shortDate(o.window_expires_at, lang))
      : t.payDue;
  }

  // isPayableService() en niet PAYABLE_SERVICES: orders.service bewaart 'drop'
  // waar de ladder 'complete' heet, en dat rechtstreeks toetsen laat de duurste
  // bestelling op de site zonder betaalknop staan. Zie LADDER_KEY in quote.js.
  const payable = isPayableService(o.service) || o.service === SAMPLE_SERVICE;
  const button = state === 'unpaid' && payable
    ? `<form class="pay-form" method="post" action="/account/orders/${o.id}/pay">
         <button class="btn btn-primary btn-sm" type="submit">${esc(t.payNow)}</button>
       </form>`
    : '';

  return `
<div class="paybox ${cls}">
  <dl class="pay-rows">${rows.map(([k, v]) => `<div class="pay-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  <p class="pay-state">${esc(line)}</p>
  ${button}
</div>`;
}

/*
 * `fb` is de rij uit order_feedback voor DEZE bestelling, of null. Meegegeven en
 * niet hier opgehaald: deze functie tekent, en een query in een renderfunctie is
 * er één die per bestelling opnieuw afgaat.
 */
function orderCard(t, lang, o, files, events = [], fb = null, index = 0, openOrderId = 0) {
  const feedback = feedbackFor(t, lang, o, fb);
  const window = o.window_start ? `${esc(o.window_start)} → ${esc(o.window_end || '—')}` : t.windowPending;
  // Status is not repeated here — it already has the pill in row-head, and a
  // second plain-text copy of the same word two lines down read as clutter
  // rather than information. Placed (the order date) replaces it: real,
  // useful, and nowhere else on the card.
  /* De feitenlijst is op 10 augustus 2026 van de kaart verdwenen omdat de samenvatting
     van de ingeklapte kaart dezelfde vier waarden draagt; zie de noot verderop. De
     labels t.fRef/t.fService/t.fProducts/t.fPlaced blijven in de vertalingen staan —
     admin.js en het overzicht gebruiken ze ook. */

  // TWEE KANTEN. `files` komt gesorteerd binnen op kind DESC, dus upload vóór
  // delivery; hier wordt het gesplitst omdat de twee stapels niet hetzelfde
  // zijn en niet hetzelfde mogen kunnen. Een levering is te downloaden en te
  // beoordelen; een upload is er om te bekijken.
  const delivered = files.filter((f) => f.kind !== 'upload');
  const uploaded = files.filter((f) => f.kind === 'upload');

  const side = (heading, list, empty, extra = '') => `
  <section class="side">
    <div class="side-head"><h3>${esc(heading)}</h3>${extra}</div>
    ${list.length
      ? `<ul class="shots">${list.join('')}</ul>`
      : `<p class="meta">${esc(empty)}</p>`}
  </section>`;

  /*
   * ── DE MAP IS EEN KAART GEWORDEN, GEEN KNOP IN EEN HOEK ───────────────────
   *
   * Hier stond één ghost-knopje "Alles downloaden" boven het fotorooster. Dat
   * paste toen elke foto zijn eigen downloadknop had: de zip was toen een
   * gemak, geen levering.
   *
   * Sinds 9 augustus 2026 is dit archief het ENIGE dat de klant meeneemt, en dan
   * is een klein knopje ernaast de verkeerde maat voor het belangrijkste ding op
   * het scherm. Het staat nu in een eigen kaart, met erin wat hij krijgt (per
   * product, drie formaten) en de zin die uitlegt waarom de foto's erboven geen
   * downloadknop meer hebben.
   *
   * Die tweede zin is niet opsmuk. Zonder uitleg is een galerij zonder
   * downloadknoppen een scherm dat stuk lijkt, en dan mailt iemand ons met de
   * vraag waar zijn foto's zijn — precies de mail die deze regel voorkomt.
   */
  const folder = delivered.length
    ? `<section class="folder">
    <div class="folder-body">
      <h3>${esc(t.folderH)}</h3>
      <p class="folder-n">${esc(t.folderBody)}</p>
      <p class="meta folder-note">${esc(t.folderReview)}</p>
    </div>
    <a class="btn btn-primary btn-sm folder-btn" href="/account/orders/${o.id}/zip">${esc(t.bDownloadAll)}</a>
  </section>`
    : '';

  /*
   * PER PRODUCT, NIET PER STAPEL — augustus 2026.
   *
   * Lucas: *"op het dashboard staan de twee kanten naast elkaar zonder dat
   * iemand kan zien welk beeld bij welk product hoort. Bij één product valt dat
   * niet op. Bij dertig is het onbruikbaar, en het is precies de bestelling
   * waar het uitmaakt."*
   *
   * Dus: één kaart per product, met wat de klant stuurde en wat wij leverden
   * bij elkaar. Uitklappen laat de losse foto's zien, en pas dáár staan de
   * beoordeelknoppen — een revisie vraag je op een foto, niet op een stapel.
   *
   * WAAROM DE OUDE TWEE KOLOMMEN BLIJVEN BESTAAN. Draagt geen enkel bestand een
   * product (elke bestelling van vóór deze week, en elke levering die nog
   * ingedeeld moet worden), dan is groeperen een kaart met de naam "overige"
   * eromheen — pure omhaal. In dat geval doet dit scherm wat het deed. De
   * groepering verschijnt zodra er iets te groeperen valt.
   */
  const grouped = groupByProduct(delivered, uploaded);
  const fileList = grouped
    ? `
  <div class="prods">${grouped.map((g) => productCard(t, lang, o, g)).join('')}</div>
  ${folder}`
    : `
  ${folder}
  <div class="sides">
    ${side(t.sideDelivered, delivered.map((f) => shotTile(t, f, o)), t.emptyFiles)}
    ${side(t.sideUploaded, uploaded.map((f) => shotTile(t, f, o)), t.emptyUploads)}
  </div>`;

  /*
   * ═══════════════════════════════════════════════════════════════════════════
   * DE KAART KLAPT IN — 10 AUGUSTUS 2026
   * ═══════════════════════════════════════════════════════════════════════════
   *
   * Lucas: "ik zou willen dat je bestellingen in de studio kan inklappen om het wat
   * overzichtelijker te maken." Elke kaart draagt de feiten, het geldblok, de
   * voortgang, de studionoot, de tevredenheidsvraag én alle bestanden per product.
   * Bij tien bestellingen is dat een pagina waar je in scrolt om te zoeken.
   *
   * ── NATIVE <details>, GEEN JAVASCRIPT ──────────────────────────────────────
   *
   * Zelfde keuze als bij het vraagteken op de startpagina. Het werkt zonder script,
   * het is met het toetsenbord te openen, Ctrl+F van de browser vindt tekst in een
   * dicht paneel (en opent het), en een schermlezer kondigt de toestand aan. Een
   * eigen knop met aria-expanded is meer code voor minder.
   *
   * ── WELKE OPEN STAAN, EN WAAROM NIET "ALLEEN DE NIEUWSTE" ──────────────────
   *
   * Dicht betekent: hier hoef je niets. Dus staat een kaart open zodra er wél iets
   * is — een openstaande betaling, een gevraagde revisie, een afgeronde bestelling
   * die nog geen beoordeling heeft. Dat is bruikbaarder dan "de bovenste", want de
   * bovenste is de nieuwste en juist een nieuwe bestelling is vaak degene waar je
   * even niets mee moet.
   *
   * De eerste kaart staat er los van altijd open. Een lijst die volledig dicht
   * opent leest als een lege pagina, en dan is het eerste wat iemand doet: alles
   * openklikken om te zien wat er staat.
   *
   * ── DE SAMENVATTING MOET IETS ZEGGEN ──────────────────────────────────────
   *
   * Een dichte kaart die alleen de referentie toont, dwingt je hem te openen om te
   * zien of hij je nodig heeft — en dan is inklappen niets waard. Daarom staan de
   * dienst, het aantal producten en de datum in de samenvatting zelf, naast de
   * statuspil die er al stond.
   *
   * ── EN DE ANKERS BLIJVEN WERKEN ───────────────────────────────────────────
   *
   * `?pay=held#order-91` en de links in onze eigen mails wijzen naar één kaart. Het
   * id staat daarom op het <details>-element zelf, en account.css opent een kaart
   * die :target is. Zonder die regel zou een klant die op "betalen mislukt" klikt
   * op een dichte kaart landen — de dode knop van vandaag in een nieuwe vorm.
   */
  const needsAttention = Boolean(
    (String(o.payment_status || 'unpaid') !== 'paid' && orderMoney(o))
    || files.some((f) => f.review_state === 'revision_requested')
    || (o.closed_at && !isSample(o) && !fb)
  );
  const openNow = index === 0 || needsAttention || Number(openOrderId) === Number(o.id);

  /*
   * ── DE SAMENVATTING DRAAGT NU OOK WAAR DE BESTELLING IS ────────────────────
   *
   * Lucas: "ik zou wel de tijdlijn van waar de order op dat moment is erop willen en
   * wellicht nog wat kleine belangrijke details."
   *
   * Vier stipjes, dezelfde vier stappen als de rail in de open kaart en uit dezelfde
   * FLOW-array — niet een tweede lijstje dat kan gaan afwijken. Gevuld tot en met de
   * huidige stap, de huidige met een ring erom. Bij een geannuleerde bestelling staan
   * ze er niet: er is geen weg meer om op te zijn.
   *
   * `aria-label` geeft de stand in woorden, want vier stipjes zijn voor een schermlezer
   * niets. Het label komt uit STATUS, dezelfde bron als de pil ernaast.
   *
   * ── EN ÉÉN DETAIL, NIET DRIE ──────────────────────────────────────────────
   *
   * Het bedrag staat erbij zodra er iets te betalen is, want dat is het enige feit op
   * een dichte kaart waar iemand naar hándelt. Bij een betaalde bestelling niet: dan is
   * het naslag, en naslag hoort achter de klik. Zo blijft de balk één regel.
   *
   * "1 items" STOND ER, EN DAT WAS FOUT. Het meervoud werd hard aangeplakt, dus een
   * bestelling van één product las in het Engels als "1 items". Nu enkelvoud bij één.
   */
  const unpaidMoney = String(o.payment_status || 'unpaid') !== 'paid' ? orderMoney(o) : null;
  const items = o.product_count
    ? (lang === 'nl'
      ? `${o.product_count} ${Number(o.product_count) === 1 ? 'product' : 'prod.'}`
      : `${o.product_count} ${Number(o.product_count) === 1 ? 'item' : 'items'}`)
    : null;
  /* De scheidingstekens worden met een VASTE spatie aan het vorige woord geplakt
     ('woord\u00A0· woord'). Op een telefoon breekt deze regel, en met een gewone spatie
     ervoor belandde de punt aan het BEGIN van de tweede regel: "Catalog · 30 prod. ·
     2026-08-01" / "· € 762,30". Nu kan de regel alleen ná de punt breken. */
  /*
   * ELK FEIT IN ZIJN EIGEN SPAN, MET EEN KLASSE — 10 augustus 2026.
   *
   * Ze stonden als één samengevoegde tekst in de balk, en op 390 px paste die niet: eerst
   * belandde het scheidingsteken aan het begin van de tweede regel, en na een vaste spatie
   * brak de regel middenin de datum ("2026-08-" / "01 · € 762,30"). Een vaste spatie lost
   * op waar hij MAG breken, niet dát hij moet breken.
   *
   * Op een telefoon moet er dus een waarde af, en dat kan alleen als elk feit apart te
   * benoemen is. De datum gaat: die is het minst bruikbare van de vier op een dichte
   * kaart — hij verandert nooit meer, terwijl het bedrag zegt of je nog iets moet en de
   * dienst en het aantal zeggen waar het over gaat. Op een breed scherm staat hij er wel.
   *
   * Het scheidingsteken zit in het ::before van de span en niet in de tekst, zodat het
   * verdwijnt met de waarde erbij en er nooit twee punten naast elkaar staan.
   */
  const bits = [
    ['svc', serviceLabel(o.service, lang) || o.service],
    ['num', items],
    ['date', o.created_at ? String(o.created_at).slice(0, 10) : null],
    ['money', unpaidMoney && unpaidMoney.gross > 0 ? money(unpaidMoney.gross, lang) : null],
  ].filter(([, v]) => v);
  const summaryBits = bits.map(([k, v]) => `<span class="ord-b ord-b-${k}">${esc(v)}</span>`).join('');

  const stepIdx = FLOW.indexOf(o.status || 'received');
  const miniFlow = o.status === 'cancelled'
    ? ''
    : `<span class="ord-mini" role="img" aria-label="${esc(statusLabel(o.status, lang) || o.status)}">${
      FLOW.map((key, i) => `<i class="ord-mini-dot${i < stepIdx ? ' is-done' : i === stepIdx ? ' is-now' : ''}"></i>`).join('')
    }</span>`;

  return `
<details class="card ord" id="order-${o.id}"${openNow ? ' open' : ''}>
  <summary class="row-head ord-sum">
    <span class="ref">${esc(o.ref)}</span>
    <span class="ord-sum-meta">${summaryBits}</span>
    ${miniFlow}
    <span class="pill is-${esc(o.status)}">${esc(statusLabel(o.status, lang) || o.status)}</span>
    <span class="ord-chev" aria-hidden="true"></span>
  </summary>
  ${
    /*
     * DE FEITENRIJ IS WEG — 10 AUGUSTUS 2026.
     *
     * Lucas: "ik wou dat je alleen de belangrijke info op de order kaart ziet omdat dit
     * nogal onoverzichtelijk is." Hier stond een <dl class="facts"> met vier cellen:
     * REFERENTIE, DIENST, PRODUCTEN, GEPLAATST.
     *
     * Alle vier staan sinds vandaag ÓÓK in de samenvatting van de ingeklapte kaart — de
     * referentie zelfs twee keer op één kaart, één keer in de kop en één keer als eerste
     * cel eronder. Toen de kaart niet inklapte was die rij het enige plekje waar die
     * feiten stonden; nu is het een tweede kopie die alleen maar tussen jou en de
     * voortgang in staat.
     *
     * Wat er BLIJFT is wat de samenvatting niet kan dragen: het venster of de wachtrij,
     * het geld, de voortgang, en de bestanden. Dat is per definitie de belangrijke
     * informatie, want het is de informatie die verandert.
     */
    ''
  }
  ${
    /* "Venster: Wordt ingepland" stond hier altijd, en bij een bestelling onder
       de drempel is dat een belofte die nooit ingelost wordt: schema.sql zegt
       met zoveel woorden dat een unattended bestelling window_start voorgoed
       leeg laat — die heeft een wachtrij, geen datum. De regel hoort er dus
       alleen te staan als er een venster ís, of als er een op komt. */
    o.window_start || o.tier === 'attended'
      ? `<p class="meta">${esc(t.fWindow)}: ${o.window_start ? window : esc(window)}</p>`
      : `<p class="meta">${esc(t.fQueue)}</p>`
  }
  ${paymentBlock(t, lang, o)}
  ${progressBlock(t, lang, o, events)}
  ${studioNote(t, o)}
  ${
    /* Afgerond, en dat hoort ergens te staan. maybeClose() zet closed_at zodra
       het laatste beeld is goedgekeurd; tot vandaag was het enige zichtbare
       gevolg dat de knoppen verdwenen. Eén zin op de kaart in plaats van onder
       elke foto: het is een feit over de bestelling, niet over een beeld. */
    o.closed_at && !isSample(o) ? `<p class="meta closed">${esc(t.closedNote)}</p>` : ''
  }
  ${feedback}
  ${fileList}
</details>`;
}

/*
 * ── WANNEER DE TEVREDENHEIDSVRAAG OP EEN BESTELKAART STAAT ───────────────────
 *
 * Alleen bij een AFGERONDE bestelling die geen proefvisual is.
 *
 * `closed_at` is de trigger uit §2 stap 1 van reviewverzamelingspecificatie.md:
 * élk levend beeld goedgekeurd. Halverwege vragen zou iets anders meten — "ben je
 * tevreden met wat je hebt gekregen" bij vier van de twaalf beelden gaat over een
 * bestelling die nog niet klaar is.
 *
 * De proefvisual valt erbuiten om dezelfde reden dat hij geen beoordeelknoppen
 * heeft (zie canReview): het is één product voor €1 om te kijken of het klopt, en
 * iemand om een openbare review vragen over een proef is vragen naar een oordeel
 * over iets wat nog geen bestelling was.
 */
function feedbackFor(t, lang, o, fb) {
  if (!o.closed_at || isSample(o)) return '';
  return feedbackBlock({
    lang,
    action: '/account/feedback',
    hidden: `<input type="hidden" name="order" value="${o.id}">`,
    feedback: fb,
  });
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
/* ── DE TIJDLIJN — augustus 2026 ──────────────────────────────────────────────
 *
 * Lucas: *"tijdlijn naar het dashboard, voor elke trede. Klantvriendelijke
 * tekst per status, niet de databasewaarde. 'Wat gebeurt er nu' bovenaan, in
 * plaats van een lijst die je zelf moet interpreteren."*
 *
 * DRIE DINGEN IN ÉÉN BLOK, IN DEZE VOLGORDE.
 *
 *   1 · Eén zin over wat er nú gebeurt. Dat is het antwoord op de vraag
 *       waarmee iemand inlogt. Een lijst gebeurtenissen is een antwoord op
 *       "wat is er gebeurd", en dat is een andere vraag — interessant nadat
 *       de eerste beantwoord is, nooit ervoor.
 *   2 · Vier stappen als spoor. Waar zit ik, hoeveel komt er nog. Zonder
 *       percentages: een balk die 62% zegt over werk dat in dagen loopt, is
 *       een precisie die niet bestaat.
 *   3 · De gebeurtenissen zelf, dichtgeklapt. Wie de datums wil, klapt uit;
 *       wie ze niet wil, ziet ze niet — en dat is de meerderheid.
 *
 * STATUSTEKST IS COPY, GEEN KOLOMWAARDE. "human_check" is een woord uit onze
 * werkverdeling; "een mens loopt elk beeld na" is wat het voor de klant
 * betekent. STATUS[].nl geeft nog steeds het korte label voor de pil bovenaan
 * de kaart — dit zijn de zinnen eronder.
 */
const FLOW = ['received', 'in_production', 'human_check', 'delivered'];

/**
 * "2026-08-10" → "10 aug" / "10 Aug".
 *
 * NIET Intl.DateTimeFormat. Die vraagt om een Date, en een Date maken van een
 * kale datum zonder tijdzone is de klassieke manier om er een dag naast te
 * zitten: '2026-08-10' wordt als UTC-middernacht gelezen en in een westelijke
 * tijdzone is dat 9 augustus. Hier wordt niets gerekend — de drie stukken
 * worden uit de string geknipt, want dat is precies wat er getoond moet worden.
 * Onbekende vorm gaat ongewijzigd terug: liever een ruwe datum dan een verkeerde.
 */
const MONTHS = {
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
function shortDate(value, lang) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!m) return String(value || '');
  const months = MONTHS[lang] || MONTHS.en;
  return `${Number(m[3])} ${months[Number(m[2]) - 1] || m[2]}`;
}

function progressBlock(t, lang, o, events = []) {
  const status = o.status || 'received';
  const cancelled = status === 'cancelled';
  const idx = FLOW.indexOf(status);

  // Wat er nu gebeurt, plus het venster als dat bekend is — een belofte met een
  // datum eraan is een ander bericht dan dezelfde belofte zonder.
  const now = t.flowNow[status] || t.flowNow.received;
  const when = !cancelled && status !== 'delivered' && o.window_start
    ? ` ${t.flowWindow(shortDate(o.window_start, lang), shortDate(o.window_end || o.window_start, lang))}`
    : '';

  const steps = cancelled
    ? ''
    : `<ol class="flow">${FLOW.map((key, i) => {
        const state = i < idx ? 'is-done' : i === idx ? 'is-now' : 'is-todo';
        return `<li class="flow-step ${state}"><span class="flow-dot"></span><span class="flow-label">${esc(t.flowStep[key])}</span></li>`;
      }).join('')}</ol>`;

  /* De gebeurtenissen. Alleen de statuswijzigingen die iets betekenen, en de
   * notities die er met de hand bij getypt zijn — want dat is het enige wat
   * niet uit de status af te leiden is. Nieuwste bovenaan: de laatste
   * gebeurtenis is de enige die iemand echt zoekt. */
  const rows = [...events].reverse().map((e) => `<li>
    <span class="tl-when">${esc(String(e.created_at || '').slice(0, 10))}</span>
    <span class="tl-what">${esc(statusLabel(e.status, lang) || e.status)}${e.note ? `<span class="tl-note">${esc(e.note)}</span>` : ''}</span>
  </li>`).join('');

  return `
<div class="flowbox${cancelled ? ' is-cancelled' : ''}">
  <p class="flow-now"><strong>${esc(t.flowNowLabel)}</strong> ${esc(now)}${esc(when)}</p>
  ${steps}
  ${rows
    ? `<details class="tl">
         <summary>${esc(t.flowHistory)}</summary>
         <ul class="tl-list">${rows}</ul>
       </details>`
    : ''}
</div>`;
}

/**
 * De bestanden van één bestelling gegroepeerd per product.
 *
 * Geeft `null` terug als er niets te groeperen valt — geen enkel bestand draagt
 * een product_key — zodat de aanroeper terug kan vallen op de twee kolommen.
 * Dat is geen randgeval maar de normale toestand van elke bestelling van vóór
 * augustus 2026, en van elke levering die nog ingedeeld moet worden.
 *
 * NIET-INGEDEELDE BESTANDEN VERDWIJNEN NIET. Ze krijgen een eigen groep,
 * onderaan, zonder productnummer. Een bestand weglaten omdat het geen etiket
 * draagt is de ergste van de mogelijke keuzes: dan is er een foto waarvoor
 * betaald is die nergens meer te zien is.
 */
function groupByProduct(delivered, uploaded) {
  const all = [...delivered, ...uploaded];
  if (!all.some((f) => f.product_key)) return null;

  const map = new Map();
  const take = (f, kind) => {
    const key = f.product_key || '';
    if (!map.has(key)) map.set(key, { key, delivered: [], uploaded: [] });
    map.get(key)[kind].push(f);
  };
  for (const f of delivered) take(f, 'delivered');
  for (const f of uploaded) take(f, 'uploaded');

  return [...map.values()].sort((a, b) => {
    if (!a.key) return 1;           // "overig" onderaan
    if (!b.key) return -1;
    return (Number(a.key.slice(1)) || 0) - (Number(b.key.slice(1)) || 0);
  });
}

/**
 * Eén product: wat je stuurde, wat wij leverden, en de knoppen per foto.
 *
 * DICHT, TENZIJ ER IETS AAN DE HAND IS. Dertig producten opengeklapt is een
 * scherm van tien meter; dertig dichte kaarten met een voorbeeldje erop is een
 * overzicht. Eén uitzondering: een product waarop een revisie loopt staat open,
 * want dat is het product waar de klant naartoe kwam.
 *
 * GEEN JAVASCRIPT, EN DAT IS GEEN CONCESSIE. Dit dashboard draait onder
 * `default-src 'none'` — er is geen script en er kan er geen komen zonder die
 * regel te verzwakken. <details>/<summary> doet het uitklappen zelf, en de
 * animatie zit in account.css (::details-content waar de browser het kent, een
 * keyframe waar niet). Werkt dus ook op een oude telefoon, zonder laadtijd, en
 * blijft werken als er iets misgaat met het netwerk.
 *
 * DE AMBERKLEURIGE RAND. Lucas: *"als een revisie is aangevraagd een amber rand
 * om het product heen."* Hij hangt aan een levend beeld met
 * review_state='revision_requested'. Levert de studio een vervanging voor
 * dezelfde product+shot, dan wordt het oude beeld vervangen (superseded_at) en
 * valt het uit deze lijst — dus de rand verdwijnt doordat het werk gedaan is.
 */
function productCard(t, lang, o, g) {
  const label = g.key ? t.prodLabel(g.key.replace(/^p/, '')) : t.prodOther;
  const live = g.delivered.filter((f) => !(f.expires_at && isExpired(f.expires_at, null)));
  // Op de LEVENDE beelden, niet op alles. Een verlopen beeld met een openstaande
  // revisie zou de kaart anders amber kleuren én opengeklapt tonen, met als
  // enige inhoud "niet meer beschikbaar" — een rand om een leegte.
  const revising = live.some((f) => f.review_state === 'revision_requested');
  const approved = live.filter((f) => f.review_state === 'approved').length;

  // De omslag is het eerste geleverde beeld, en anders wat de klant zelf
  // stuurde. Een lege tegel zou zeggen "er is niets", terwijl er wél iets is:
  // zijn eigen foto, in afwachting.
  // Een verlopen levering is geen omslag: /account/files/<id>/f geeft daar 410
  // terug, dus die tegel zou als gebroken beeld renderen. Liever de eigen upload
  // van de klant — die bestaat nog en zegt ook iets.
  const cover = live.find(isViewable) || g.uploaded.find(isViewable) || null;
  const coverImg = cover
    ? `<img src="/account/files/${cover.id}/f" alt="" loading="lazy" decoding="async">`
    : '';

  const facts = [
    live.length ? t.prodDelivered(live.length) : t.prodNothingYet,
    live.length && approved ? t.prodApproved(approved) : null,
  ].filter(Boolean).join(' · ');

  const waText = encodeURIComponent(
    lang === 'nl'
      ? `Hoi VISUAILS, over bestelling ${o.ref} (${label}):`
      : `Hi VISUAILS, about order ${o.ref} (${label}):`
  );

  return `
<details class="prod${revising ? ' is-revising' : ''}"${revising ? ' open' : ''}>
  <summary class="prod-head">
    <span class="prod-cover">${coverImg}</span>
    <span class="prod-text">
      <span class="prod-title">${esc(label)}</span>
      <span class="prod-facts">${esc(facts)}</span>
      ${revising ? `<span class="prod-flag">${esc(t.stRevision)}</span>` : ''}
    </span>
    <!-- Twee etiketten, waarvan er altijd één verborgen is. Zonder script kan
         de tekst van een <summary> niet veranderen bij het openklappen, en
         "Bekijk de foto's" laten staan terwijl ze al openstaan is een knop die
         iets anders belooft dan hij doet. -->
    <span class="prod-cta"><span class="on-closed">${esc(t.prodOpen)}</span><span class="on-open">${esc(t.prodClose)}</span></span>
  </summary>
  <div class="prod-panel">
    <div class="prod-inner">
      <div class="prod-col">
        <h4>${esc(t.prodWeMade)}</h4>
        ${g.delivered.length
          ? `<ul class="shots">${g.delivered.map((f) => shotTile(t, f, o, true)).join('')}</ul>`
          : `<p class="meta">${esc(t.prodNothingYet)}</p>`}
      </div>
      ${g.uploaded.length
        ? `<div class="prod-col is-ref">
             <h4>${esc(t.prodYouSent)}</h4>
             <ul class="shots is-ref">${g.uploaded.map((f) => shotTile(t, f, o)).join('')}</ul>
           </div>`
        : ''}
    </div>
    <p class="prod-help">${esc(t.prodHelp)}
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waText}" target="_blank" rel="noopener">${esc(t.prodHelpCta)}</a>
    </p>
  </div>
</details>`;
}

/**
 * Eén foto als foto, met zijn knoppen eronder.
 *
 * DIT WAS EEN REGEL TEKST. `fileRow()` zette een bestandsnaam, een grootte en
 * twee knoppen op een <li> — correct, en onbruikbaar voor waar het scherm voor
 * is. Lucas: *"ik zou willen dat klanten foto's letterlijk qua beeld kunnen
 * zien."* Een klant die twintig producten heeft besteld en wil weten of shot
 * drie klopt, kan dat niet aflezen aan `IMG_4471.jpg`.
 *
 * DE PREVIEW IS EEN AANVRAAG AAN DEZELFDE ROUTE die de knop "Bekijken" al
 * gebruikte: /account/files/<id>/f levert preview_key || r2_key, achter de
 * sessie. Er komt dus geen publieke URL bij en er wordt niets nieuws
 * blootgesteld — het beeld dat er altijd al doorheen kon, wordt nu ook echt
 * getoond. loading="lazy" omdat een bestelling van dertig producten anders
 * honderdtwintig gelijktijdige verzoeken opent.
 *
 * GEEN width/height. Bij de rest van de site staan die er wel, omdat de
 * intrinsieke maat daar bekend is; hier is het een klantfoto van onbekende
 * verhouding. De tegel is een vaste 4/5-box met object-fit: cover, dus de
 * layout ligt vast zonder dat er een maat geraden hoeft te worden.
 */
/**
 * Is dit bestand als beeld te tonen?
 *
 * WAAROM DIT NODIG IS — 7 augustus 2026. Elke levering werd als `<img>`
 * neergezet, en de videodienst levert mp4's. Die renderden als een gebroken
 * plaatje, op de bestellingenpagina én in de strook op het overzicht — voor de
 * klant niet te onderscheiden van "er is iets stuk". Onbekende extensie telt
 * als beeld: dat is wat het bijna altijd is, en een tegel die het probeert en
 * faalt is beter dan een tegel die het niet probeert.
 */
const NOT_IMAGE = /\.(mp4|webm|mov|m4v|avi|mkv|zip|pdf|psd|ai|tiff?)$/i;
const isViewable = (f) => !NOT_IMAGE.test(String(f?.filename || ''));

function shotTile(t, f, o, inProduct = false) {
  const gone = f.expires_at && isExpired(f.expires_at, null);
  const isUpload = f.kind === 'upload';

  // "Product 3 · Achterkant" leest beter dan een bestandsnaam, maar alleen als
  // beide bekend zijn — en shot mag NOOIT geraden worden (zie de kolomnotitie
  // in schema.sql: "nobody said" is niet hetzelfde antwoord als "front").
  const shotName = f.shot && t.shotNames[f.shot] ? t.shotNames[f.shot] : null;
  // Binnen een productkaart staat het productnummer al in de kop. Het per foto
  // herhalen maakt van vier bijschriften vier keer hetzelfde woord met één
  // verschil erachter, en dat verschil is juist wat je moet kunnen scannen.
  const product = (!inProduct && f.product_key) ? f.product_key.replace(/^p/, '#') : null;
  const caption = [product, shotName].filter(Boolean).join(' · ') || f.filename || `#${f.id}`;

  /*
   * DE TOESTAND STAAT OP DE FOTO, NIET IN DE RIJ KNOPPEN — augustus 2026.
   *
   * Lucas, bij het zien van de eerste versie: *"de knoppen zijn soms wat uit
   * balans."* Dat kwam hier vandaan. "Goedgekeurd" en "Revisie aangevraagd"
   * stonden als tekstregel tussen het bijschrift en de knoppen, dus een tegel
   * mét toestand duwde zijn knoppen een regel lager dan de tegel ernaast. Vier
   * foto's naast elkaar en de knoppen stonden op drie verschillende hoogtes —
   * en juist bij vier gelijke dingen ziet een oog elke afwijking meteen.
   *
   * Als vlaggetje op het beeld kost het geen hoogte in de kolom, staat het
   * dichter bij waar het over gaat, en beginnen alle knoppenrijen op dezelfde
   * lijn. De notitie blijft eronder staan, ná de knoppen, waar extra hoogte
   * niemand meer scheeftrekt.
   */
  let badge = '';
  let said = '';
  if (!isUpload && canSeeReviewHistory(o)) {
    if (f.review_state === 'approved') {
      badge = `<span class="shot-badge is-approved">${esc(t.stApproved)}</span>`;
    } else if (f.review_state === 'revision_requested') {
      badge = `<span class="shot-badge is-revision">${esc(t.stRevisionShort)}</span>`;
      if (f.review_note) said = `<p class="said">${esc(f.review_note)}</p>`;
    }
  }

  const media = gone
    ? `<div class="shot-media is-gone"><span>${esc(t.stExpired)}</span></div>`
    : `<a class="shot-media${isViewable(f) ? '' : ' is-file'}" href="/account/files/${f.id}/f" target="_blank" rel="noopener">
         ${isViewable(f)
           ? `<img src="/account/files/${f.id}/f" alt="${esc(caption)}" loading="lazy" decoding="async">`
           : `<span class="shot-filetype">${esc((String(f.filename || '').split('.').pop() || 'file').toUpperCase())}</span>`}
         ${badge}
       </a>`;

  /*
   * ── HIER STOND EEN DOWNLOADKNOP PER BEELD, EN DIE IS WEG ──────────────────
   *
   * Lucas, 9 augustus 2026: *"de zichtbare foto's zijn dus niet downloadbaar in
   * het portaal en puur voor revisies aanvragen. Alleen de map (het
   * eindresultaat) kan gedownload worden."*
   *
   * Dat is geen beperking maar een opruiming. Wat hier per beeld te downloaden
   * was, is één van de drie formaten van één foto, met de naam die hij bij ons
   * toevallig had. Wat de klant nodig heeft is een png voor de drukker en een
   * webp voor de webshop, in een map die zegt bij welk product ze horen. Twaalf
   * losse knoppen die elk het verkeerde bestand geven, zijn geen twaalf keuzes.
   *
   * De tegel houdt precies één taak over: beoordelen. Zie ook serveAccountFile,
   * waar de /d-route om dezelfde reden is vervallen — een knop weghalen terwijl
   * de route blijft, is de knop verstoppen.
   */

  return `<li class="shot" id="f${f.id}">
  ${media}
  <div class="shot-body">
    <span class="shot-cap">${esc(caption)}</span>
    <div class="shot-actions">${isUpload || gone ? '' : reviewControls(t, f, o)}</div>
    ${said}
  </div>
</li>`;
}

/**
 * De beoordeelknoppen, losgetrokken uit het oude fileRow().
 *
 * Zelfde formulier, zelfde acties, zelfde verplichte notitie — alleen niet
 * langer verweven met het tonen van een bestandsnaam. Dat scheelt niet vier
 * regels maar een tweede plek waar de regels over wie mag beoordelen zouden
 * kunnen gaan afwijken van deze.
 *
 * DE NOTITIE IS VERPLICHT en dat is geen formaliteit: zonder wat er mis is, is
 * een revisie een opdracht om te raden. `required` houdt het tegen in de
 * browser, accountPost() controleert het op de server, en migrations/0010 zet
 * er een CHECK op de kolom omheen — drie lagen, omdat alleen de derde nog staat
 * als iemand het formulier omzeilt.
 *
 * INGETROKKEN RECHTEN. Lucas: *"wanneer hier misbruik van wordt gemaakt kan de
 * klant zijn revisierechten verliezen."* Dan verdwijnen de knoppen en komt er
 * een zin voor in de plaats die zegt wat er aan de hand is en hoe je het
 * oplost. Niet zwijgend weglaten: een knop die er zonder uitleg niet meer is,
 * is een bug voor degene die hem zoekt.
 */
function reviewControls(t, f, o) {
  // DE PROEFVISUAL, EN WAAROM HIER EEN ZIN STAAT IN PLAATS VAN NIETS. Dit is de
  // enige bestelling zonder beoordeelknoppen (zie canReviewOrder in pricing.js).
  // Precies die stilte was de melding van 7 augustus: Lucas bestelde één product,
  // zag alleen "Downloaden", en las het als kapotte knoppen. Een lege plek waar
  // een knop hoort is niet neutraal — hij ziet eruit als een fout.
  if (isSample(o)) return `<p class="meta revoked">${esc(t.sampleNote)}</p>`;

  /*
   * TERUGDRAAIEN BLIJFT ALTIJD KUNNEN — 7 augustus 2026.
   *
   * Dit stond boven de regel hieronder: `if (!canReview(o)) return ''`, en
   * canReview() is onwaar zodra closed_at staat. maybeClose() zet closed_at op
   * het moment dat de klant zijn LAATSTE beeld goedkeurt. Eén klik haalde dus in
   * één keer alle knoppen van de hele bestelling weg — ook de "Ongedaan
   * maken"-knop van precies die klik. Wie zich verklikt op de laatste foto zat
   * vast, zonder melding, met een scherm dat er hetzelfde uitzag als een
   * bestelling waar nooit iets mee gebeurd was.
   *
   * Een besluit dat je niet kunt terugnemen leert mensen niets meer aan te
   * raken. Dus: een afgeronde bestelling accepteert geen NIEUWE besluiten meer,
   * maar het besluit dat hem afrondde blijft omkeerbaar — en dat terugdraaien
   * opent de bestelling weer (zie handleFileReview).
   *
   * NIET VOOR ALTIJD, en dat is geen zuinigheid. order_tokens.expires_at wordt
   * nergens geschreven, dus isExpired() in token.js leidt de bewaartermijn van
   * de portaallink volledig af uit closed_at. Zou terugdraaien dat veld op
   * eender welk moment mogen wissen, dan wekt een klik op deze knop een
   * gemailde link die negentig dagen geleden had moeten sterven — en herhaalbaar
   * ook. Binnen het venster is heropenen wat de klant bedoelt; daarbuiten staat
   * het besluit, en zegt de zin eronder dat.
   */
  if (f.review_state === 'approved' || f.review_state === 'revision_requested') {
    if (o.closed_at && !reopenable(o)) return `<p class="meta revoked">${esc(t.settledNote)}</p>`;
    const label = f.review_state === 'approved' ? t.bUndo : t.bCancelShort;
    return `<form class="review-form" method="post" action="/account/review">
    <input type="hidden" name="file" value="${f.id}">
    <button class="btn btn-line btn-sm" type="submit" name="action" value="undo">${esc(label)}</button>
  </form>`;
  }

  // Geen besluit op dit beeld en de bestelling is afgerond. Dat kan bij een beeld
  // dat ná het afronden geleverd is; dan hoort er te staan waarom er niets te
  // kiezen valt in plaats van een lege plek. Andere zin dan closedNote op de
  // kaart: die nodigt uit om iets ongedaan te maken, en hier is er niets.
  if (!canReview(o)) return `<p class="meta revoked">${esc(t.settledNote)}</p>`;

  // formnovalidate op Goedkeuren, zodat de verplichte notitie in de <details>
  // hem niet blokkeert — de twee knoppen zijn alternatieven, geen stappen.
  //
  // INGETROKKEN RECHTEN HALEN ALLEEN DE REVISIEHELFT WEG. Deze controle stond
  // bovenaan de functie en verving daarmee álle knoppen — óók goedkeuren, en
  // óók ongedaan maken. handleFileReview() staat die twee juist wél toe (zie
  // daar: "een klant die zijn revisierechten kwijt is, moet nog steeds kunnen
  // zeggen dat iets goed is"), dus het scherm was strenger dan de regel. Erger:
  // zonder goedkeurknop kan zo'n bestelling nooit meer afgerond raken.
  const ask = o.revisions_revoked_at
    ? `<p class="meta revoked">${esc(t.revokedNote)}</p>`
    : `<details class="ask">
      <!-- De samenvatting is de tweede knop, en ziet er ook zo uit. Als
           onderstreepte tekstregel onder een gevulde knop leek dit een voetnoot
           in plaats van het alternatief dat het is: goedkeuren of aanmerken
           zijn twee even geldige antwoorden op dezelfde foto. -->
      <summary class="btn btn-line btn-sm">${esc(t.askSummary)}</summary>
      <label class="sr-only" for="n${f.id}">${esc(t.askLabel)}</label>
      <textarea id="n${f.id}" name="note" rows="3" maxlength="${NOTE_MAX}" placeholder="${esc(t.askHint)}" required></textarea>
      <button class="btn btn-ghost btn-sm" type="submit" name="action" value="revise">${esc(t.bSend)}</button>
    </details>`;

  return `<form class="review-form" method="post" action="/account/review">
    <input type="hidden" name="file" value="${f.id}">
    <button class="btn btn-primary btn-sm" type="submit" name="action" value="approve" formnovalidate>${esc(t.bApprove)}</button>
    ${ask}
  </form>`;
}

function errorBody(t, message = null) {
  return `<div class="bar"><a class="mark" href="/">VISUAILS</a></div><p class="error is-page">${esc(message || (t && t.dbDown) || 'We cannot show this page right now. Go back to your account and try again in a few minutes — nothing has changed in the meantime.')}</p>`;
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
<!-- Het tevredenheidsblok, uit dezelfde stylesheet die het portaal inlaadt.
     Zie de kop van public/feedback.css. -->
<link rel="stylesheet" href="/feedback.css">
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
/*
 * DE TAAL VAN DIT SCHERM, augustus 2026 — en accept-language is het LAATSTE
 * waar naar gekeken wordt, niet het eerste.
 *
 * Lucas: *"het inlogscherm is standaard Nederlands."* Klopte, en niet alleen
 * voor hem: deze functie las alleen de browserkop, dus iedereen met een
 * Nederlandse browser kreeg Nederlands — ook wie net op de Engelse site zat en
 * daar op "Log in" klikte. De site heeft twee taalversies waar de bezoeker zelf
 * tussen kiest, en die keuze werd hier weggegooid ten gunste van een instelling
 * die diezelfde bezoeker misschien jaren geleden op zijn laptop heeft gezet.
 *
 * De volgorde is nu van "wat heeft deze persoon zojuist gedaan" naar "wat staat
 * er in zijn systeem":
 *
 *   1 · ?lang= in de URL — de nav-link draagt hem mee, dus dit is letterlijk de
 *       taal van de pagina waar vandaan geklikt is. Alleen 'nl' of 'en' wordt
 *       geaccepteerd; iets anders is geen taal maar invoer.
 *   2 · de Referer — kwam je van een /nl/-pagina, dan las je Nederlands. Werkt
 *       ook als de link geen parameter draagt, en kost niets als hij er niet is.
 *   3 · accept-language — de oude regel, nu als terugval voor wie hier
 *       rechtstreeks binnenkomt via een bookmark of de mail.
 */
function negotiate(request) {
  const known = (v) => (v === 'nl' || v === 'en' ? v : null);

  try {
    const fromQuery = known(new URL(request.url).searchParams.get('lang'));
    if (fromQuery) return fromQuery;
  } catch { /* geen bruikbare URL — door naar de volgende bron */ }

  try {
    const ref = request?.headers?.get?.('referer');
    if (ref) {
      const p = new URL(ref).pathname;
      // /nl of /nl/... — maar niet /nlsomething.
      if (/^\/nl(\/|$)/.test(p)) return 'nl';
      if (p.startsWith('/')) return 'en';
    }
  } catch { /* rommelige referer is geen fout, alleen geen signaal */ }

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
export function magicLinkEmail(lang, link, code = null) {
  const mins = LOGIN_TOKEN_TTL_MINUTES;
  const hours = mins % 60 === 0 ? mins / 60 : null;
  /*
   * ── DE KOP VOLGT WAT ER ONDER STAAT — 7 augustus 2026 ──────────────────────
   *
   * Lucas, bij het zien van de eerste versie: *"zou de link niet boven de code
   * moeten staan omdat de tekst dit op die manier laat zien."* Hij heeft
   * gelijk over de tegenstrijdigheid en niet over de oplossing: de kop zei "Je
   * inloglink" en er kwam een code, dus de tekst en de volgorde spraken elkaar
   * tegen. Maar de code hoort bovenaan te blijven — dat is de hele reden dat
   * hij bestaat (zie hieronder), en hem onder de knop zetten is hem verstoppen
   * achter precies de sprong die hij moest wegnemen.
   *
   * Dus de TEKST is omgedraaid in plaats van de volgorde. De kop noemt nu geen
   * van beide, de code komt eerst met zijn eigen zin, en de link volgt als het
   * alternatief dat hij is. Zodra er geen code is — migratie 0017 nog niet
   * gedraaid — valt alles terug op de oude woorden, want dan klopt "Je
   * inloglink" weer precies.
   */
  const copy = lang === 'nl'
    ? {
        h: code ? 'Inloggen bij VISUAILS' : 'Je inloglink',
        p: code
          ? `Liever klikken? Deze link doet hetzelfde en blijft ${hours === 1 ? 'een uur' : `${mins} minuten`} geldig.`
          : `Klik op de link hieronder om in te loggen bij je VISUAILS-account. De link blijft ${hours === 1 ? 'een uur' : `${mins} minuten`} geldig.`,
        b: 'Inloggen',
        f: 'Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — er verandert niets aan je account.',
        alt: 'Werkt de knop niet? Kopieer deze link in je browser:',
        codeH: 'Vul deze code in op het scherm waar je vandaan komt:',
        codeF: `${LOGIN_CODE_TTL_MINUTES} minuten geldig, één keer te gebruiken.`,
      }
    : {
        h: code ? 'Sign in to VISUAILS' : 'Your sign-in link',
        p: code
          ? `Rather click? This link does the same and stays valid for ${hours === 1 ? 'an hour' : `${mins} minutes`}.`
          : `Click the link below to sign in to your VISUAILS account. The link stays valid for ${hours === 1 ? 'an hour' : `${mins} minutes`}.`,
        b: 'Sign in',
        f: 'Did not request this? You can ignore this email — nothing about your account changes.',
        alt: 'Button not working? Copy this link into your browser:',
        codeH: 'Type this code on the screen you came from:',
        codeF: `Valid for ${LOGIN_CODE_TTL_MINUTES} minutes, single use.`,
      };

  /*
   * ── DE CODE STAAT BOVENAAN, VÓÓR DE KNOP ───────────────────────────────────
   *
   * Niet uit netheid maar omdat dit de reden is dat hij bestaat: wie op zijn
   * telefoon zit, wil de zes cijfers zien zonder te scrollen en zonder de mail
   * open te klappen. Een voorbeeldweergave in een inbox toont de eerste regels,
   * en dat zijn nu precies de cijfers.
   *
   * Met spatie ertussen — "048 210" — omdat zes losse cijfers in één blok
   * verkeerd overgetypt worden. normaliseCode() haalt de spatie er aan de
   * andere kant weer uit, dus plakken werkt ook.
   *
   * Geen <table> of custom HTML: mailTemplate.js's shell bepaalt hoe deze mails
   * eruitzien, en een tweede opmaaktaal in één mail is hoe de ene helft er in
   * Outlook anders uit gaat zien dan de andere.
   */
  const spaced = code ? `${code.slice(0, 3)} ${code.slice(3)}` : null;
  const codeBlock = code
    ? [
        mailP(copy.codeH),
        mailP(`<span style="font-size:30px;line-height:1.2;letter-spacing:.16em;font-weight:700;color:#0B0C0E">${spaced}</span>`),
        mailP(copy.codeF, { muted: true }),
        '<div style="height:22px;font-size:0;line-height:0">&nbsp;</div>',
      ].join('')
    : '';

  // THE URL APPEARS TWICE ON PURPOSE — once behind the button, once as copyable
  // text — and tests/account-signin.test.mjs asserts exactly that. A client that
  // strips the button, or a reader moving from phone to desktop, needs the
  // second one.
  const html = mailShell({
    lang,
    // Not the subject line again: the inbox prints the two next to each other.
    preheader: lang === 'nl'
      ? (code ? `Je code is ${spaced} — of gebruik de link.` : 'Eén klik en je bent binnen — de link verloopt vanzelf.')
      : (code ? `Your code is ${spaced} — or use the link.` : 'One click and you are in — the link expires on its own.'),
    body: [
      mailH1(copy.h),
      codeBlock,
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
${code ? `
${copy.codeH}

  ${spaced}

${copy.codeF}
` : ''}
${copy.p}

${link}

${copy.f}

VISUAILS · Enschede, NL · hello@visuails.com`;

  return { html, text };
}
