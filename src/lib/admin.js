// VISUAILS — /admin, Lucas's own dashboard. 2026-07-27.
//
// WHAT THIS ANSWERS
// Task #256: an order overview with a working status control (nothing in this
// codebase ever wrote to orders.status after order creation before this file
// existed — see functions/api/order.js, which INSERTs 'received' once and
// touches it never again), and a revision inbox — the files clients flag with
// review_state = 'revision_requested' and a note, in the portal, which until
// now had nowhere to surface on the studio's side except a manual D1 query.
//
// WHY THIS FILE EXISTS RATHER THAN LIVING IN functions/admin/
// Same reason src/lib/portal.js exists rather than living in functions/o/: one
// implementation, importable from a thin Pages Function AND runnable under
// plain `node` with a stubbed env, which is the only way any of this can be
// tested in an environment with no wrangler. See portal.js's own header for
// the fuller argument; it applies here unchanged.
//
// WHY THIS PAGE HAS A COOKIE AND THE PORTAL DELIBERATELY DOES NOT
// portal.js's header explains, correctly, that the portal has no CSRF token
// because it has no cookie — the token IS the credential, so anyone who could
// forge a cross-site POST already holds it. That reasoning does not carry over
// here. /admin is a real login: a password proves who Lucas is once, and a
// cookie carries that proof on every later request — which is exactly the
// AMBIENT credential CSRF exploits. So every state-changing route below is
// guarded twice: the session cookie proves the caller is logged in, and an
// Origin check proves the request was actually composed by a page this site
// served, not assembled by a third-party site the browser attached the cookie
// to automatically. SameSite=Strict on the cookie is the first line of defence
// and covers ordinary browsers; the Origin check is the second, for anything
// that does not honour SameSite.
//
// WHY PASSWORD AUTH HERE AND A DIFFERENT DESIGN FOR CLIENTS (src/lib/account.js)
// One studio, one login, chosen once and typed from memory or a password
// manager on a device Lucas already trusts — a password costs nothing extra
// for that case. Clients are a different population entirely: dozens of
// brands who have never set a VISUAILS password and never should have to, so
// account.js uses a magic link instead. Two different credentials for two
// different relationships to the site, not an inconsistency.

import { hashToken, mintToken, portalUrl } from './token.js';
/* DELIVERY_MONTHS staat in de mail bij een nieuwe portaallink: die mail zegt hoe
   lang de klant er nog bij kan, en dat getal hoort uit dezelfde constante te
   komen als de nachtelijke opruiming en de juridische pagina's. */
import { stampDeliveryRetention, DELIVERY_MONTHS } from './retention.js';
import { serviceLabel } from '../data/services.js';
import { ENGINES, GEZICHTSZOEKERS, UITKOMSTEN, merkmodelControleCompleet } from '../data/modelChecks.js';
/* DE ABONNEMENTSWEEK. Zie de kop van planStart.js: deze twee functies zijn het
   stuk dat van een klantenlijst werk maakt, en Lucas' keuze was uitdrukkelijk
   dat een MENS daarop drukt. Vandaar dat ze hier binnenkomen en niet in cron/. */
import { startPlanWindow, klaarOmTeStarten } from './planStart.js';
import { kindLabel, slotsFor } from './slots.js';
import { planState, queueTerugNaAnnulering, loadSubscription, monthKey } from './subscription.js';
/* De beeldverhouding, voor de werkmap. `ratioById` met de dienst erbij, zodat een
   verhouding die deze dienst niet kent ook niet in de briefing komt; `ratioField`
   zodat de sleutel hier niet wordt overgetypt. Zie src/data/ratios.js. */
import { ratioById, ratioField } from '../data/ratios.js';
/* Hoeveel beelden er per product kunnen afwijken. Uit pricing.js zou preciezer
   zijn, maar dit is een LEESLUS over details_json en geen belofte: hoger dan het
   echte aantal kost een paar lege lookups, lager zou een gezette afwijking laten
   vallen. Zeven is het maximum dat een dienst vandaag levert (complete). */
const RATIO_IMAGES_MAX = 7;
import { hasProvenanceTag, isScannable } from './provenance.js';
import { checkRate, clientIp } from './ratelimit.js';
/* sendLoginLink() komt uit account.js en niet uit een eigen kopie hier — zie de noot
   daar. account.js importeert dit bestand niet, dus er is geen kringverwijzing. */
import { sendLoginLink } from './account.js';
import { zipStream, zipDisposition } from './zip.js';
import {
  scaffoldFiles, scaffoldFilename, parseScaffoldPath, isSourcePath, isScaffoldDoc,
  deliveryFilename,
} from './scaffold.js';
import {
  adminSessionExpiry,
  hashPassword,
  mintAdminSession,
  verifyPassword,
} from './adminAuth.js';

const LOGIN_LIMIT = 10; // attempts per minute per IP — a password login, not a token lookup
const SESSION_COOKIE = 'vis_admin';

/** orders.status, in the order the studio actually moves through them. */
import { sendMail } from './mail.js';
import { createOrderMolliePayment, refundMolliePayment, mollieKey, mollieKeyProblems, describeHeaders } from './mollie.js';
import { issueInvoice } from './invoice.js';
import { mailInvoice } from './invoiceMail.js';
/* De twee bedragen van de merkmodel-credit komen uit de prijslijst en niet uit een
   getal hier: /pricing en /custom-models rekenen met dezelfde bron, en een tweede
   kopie is hoe het scherm en de belofte uit elkaar gaan lopen. */
import { AMOUNT, VAT_RATE, vatPercent, ladderTotal } from '../data/pricing.js';
// Aliased for the same reason as in account.js: this module has its own `esc`
// and page-level helpers, and the mail template exports overlapping names.
import {
  shell as mailShell,
  h1 as mailH1,
  p as mailP,
  button as mailButton,
  note as mailNote,
  quote as mailQuote,
  spamNote as mailSpamNote,
  payPanel as mailPayPanel,
  linkLine as mailLinkLine,
  greeting as mailGreeting,
} from './mailTemplate.js';

const STATUSES = ['received', 'in_production', 'human_check', 'delivered', 'cancelled'];
const STATUS_LABEL = {
  received: 'Received',
  in_production: 'In production',
  human_check: 'Being checked',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY POINTS
// ─────────────────────────────────────────────────────────────────────────────

export async function adminGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/admin';

  if (!env?.DB) return html(page({ title: 'Admin', body: errorBody('The database is not reachable. Check the DB binding.') }), 503);

  if (path === '/admin/login') {
    const admin = await currentAdmin(context);
    if (admin) return seeOther('/admin');
    return html(page({ title: 'Sign in', body: loginBody() }));
  }

  const admin = await currentAdmin(context);
  if (!admin) return seeOther('/admin/login');

  // The two read-only routes added in August 2026. Both sit under /admin
  // deliberately — the session cookie is scoped there and the file header is
  // explicit that a route wanting to authenticate as the admin has to live
  // under this prefix rather than widening the cookie's path.
  const filesMatch = path.match(/^\/admin\/orders\/(\d+)\/files$/);
  if (filesMatch) return renderFiles(context, Number(filesMatch[1]));

  /* DE WERKMAP — 12 augustus 2026. Een zip met alleen de mapstructuur van deze
     bestelling, zodat de studio de beelden in de goede vakjes zet en de server ze
     daarna uit het PAD kan indelen. Zie src/lib/scaffold.js voor de hele
     redenering; hier is het een GET zonder bijwerking, dus hij hoort bij de
     leesroutes en niet bij de POST'ers verderop. */
  const scaffoldMatch = path.match(/^\/admin\/orders\/(\d+)\/scaffold$/);
  if (scaffoldMatch) return serveScaffold(context, Number(scaffoldMatch[1]));

  if (path === '/admin/customers') return renderCustomers(context);
  const customerMatch = path.match(/^\/admin\/customers\/(\d+)$/);
  if (customerMatch) return renderCustomer(context, Number(customerMatch[1]));

  const fileMatch = path.match(/^\/admin\/files\/(\d+)$/);
  if (fileMatch) return serveAdminFile(context, Number(fileMatch[1]));

  const modelImgMatch = path.match(/^\/admin\/models\/(\d+)\/image$/);
  if (modelImgMatch) return serveModelPreview(context, Number(modelImgMatch[1]));

  if (path === '/admin/log') return renderLog(context);
  if (path === '/admin/vat') return renderVatReview(context);
  /* De diagnose. LEESROUTE: alleen vormen van secrets en een methodelijst — geen
     enkele bijwerking. Wat wél iets aanmaakt bij Mollie zit achter de POST
     hieronder. Zie de kop van renderDiagnose(). */
  if (path === '/admin/diagnose') return renderDiagnose(context);
  /* De aanbevelingen. Een LEESROUTE, want goedkeuren gebeurt met een POST
     hieronder — zie de kop van renderTestimonials() voor waarom dit scherm er
     tot 14 augustus 2026 niet was en wat dat een klant kostte. */
  if (path === '/admin/testimonials') return renderTestimonials(context);
  if (path === '/admin/funnel') return renderFunnel(context, url);

  if (path === '/admin') {
    // ?status= narrows the order list — Lucas, August 2026: "als je op received
    // bijvoorbeeld klikt je alle orders ziet staan gesorteerd op received."
    // Checked against STATUSES rather than passed through: an unknown value
    // becomes no filter, because a dashboard showing nothing is the one failure
    // mode that reads as "there is no work" when there is.
    const wanted = url.searchParams.get('status') || '';
    const statusFilter = STATUSES.includes(wanted) ? wanted : '';
    // Zoekterm en vaste filters, allebei uit de URL zodat een gefilterde lijst
    // een link is die je kunt bewaren — en allebei gekortwiekt en gecontroleerd
    // voordat ze een query in gaan.
    const q = String(url.searchParams.get('q') || '').trim().slice(0, 80);
    const wantedFilter = String(url.searchParams.get('f') || '');
    const filter = ['revisions', 'unpaid', 'unannounced', 'paid_undelivered', 'delivered_unpaid'].includes(wantedFilter)
      ? wantedFilter : '';
    const hidden = url.searchParams.get('hidden') === '1';

    const [revisions, orders, counts, statusCounts, vatHeld, watch, tmWaiting] = await Promise.all([
      loadRevisionInbox(env),
      loadOrders(env, statusFilter, { q, filter, hidden }),
      loadTodayCounts(env),
      loadStatusCounts(env),
      loadVatHeld(env),
      loadWatchdogs(env),
      loadTestimonialsWaiting(env),
    ]);
    const modelsByCustomer = await loadCustomModelsByCustomer(env, orders.map((o) => o.customer_id));
    return html(page({
      title: statusFilter ? `Dashboard · ${STATUS_LABEL[statusFilter] || statusFilter}` : 'Dashboard',
      body: dashboardBody(revisions, orders, modelsByCustomer, counts, statusCounts, statusFilter, { q, filter, hidden }, vatHeld, watch, tmWaiting),
    }));
  }

  return html(page({ title: 'Not found', body: errorBody('Not found.') }), 404);
}

export async function adminPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');

  if (!env?.DB) return html(page({ title: 'Admin', body: errorBody('The database is not reachable.') }), 503);

  if (path === '/admin/login') return handleLogin(context);

  // Everything past this point changes state and requires both a live session
  // AND an Origin that matches this site — see the file header.
  const admin = await currentAdmin(context);
  if (!admin) return seeOther('/admin/login');
  if (!originIsSelf(request, env)) {
    // Task #271e, 2026-07-29: this used to say only "try again from the
    // dashboard itself" — true, but useless if the cause is a genuine host
    // mismatch, because there was nothing to look at to tell which one it
    // was. Only Lucas, already authenticated, ever sees this page, so the
    // raw values are safe to print — see originMismatchDetail()'s header.
    return html(page({ title: 'Admin', body: errorBody(
      `Request origin did not match. Try again from the dashboard itself. ${originMismatchDetail(request)}`
    ) }), 403);
  }

  if (path === '/admin/logout') return handleLogout(context, admin);

  /* De vier probes. Dit staat bij de POST'ers en niet bij de leesroutes omdat
     twee ervan een ECHTE betaling bij Mollie aanmaken — met een live sleutel
     zijn dat echte, onbetaalde regels van één euro in het dashboard. Iets dat
     aanmaakt, hoort geen GET te zijn, en achter deze poort staat bovendien de
     originIsSelf()-controle die een statisch routebestand niet krijgt. */
  if (path === '/admin/diagnose/probe') return handleDiagnoseProbe(context);

  const resolveMatch = path.match(/^\/admin\/revisions\/(\d+)\/resolve$/);
  if (resolveMatch) return handleRevisionResolve(context, Number(resolveMatch[1]));

  const revokeMatch = path.match(/^\/admin\/customers\/(\d+)\/revisions$/);
  if (revokeMatch) return handleRevisionRights(context, Number(revokeMatch[1]));

  const statusMatch = path.match(/^\/admin\/orders\/(\d+)\/status$/);
  if (statusMatch) return handleStatusUpdate(context, Number(statusMatch[1]));

  // De btw-beslissing. `admin` wordt meegegeven omdat dit de enige handeling in dit
  // dashboard is waar één klik 21% van een factuur verschuift, en dan hoort in het
  // logboek te staan wie erop klikte.
  const vatMatch = path.match(/^\/admin\/orders\/(\d+)\/vat$/);
  if (vatMatch) return handleVatDecision(context, Number(vatMatch[1]), admin);

  /* Het vinkje op een aanbeveling. `admin` gaat mee om dezelfde reden als bij de
     btw-beslissing hierboven: dit is de handeling die de tekst van een klant tot
     iets maakt wat wij mogen gebruiken, en dan hoort in het logboek te staan wie
     erop klikte. De sleutel is order_id — order_feedback heeft er één rij per
     bestelling, dat is de primaire sleutel van die tabel. */
  const tmMatch = path.match(/^\/admin\/testimonials\/(\d+)$/);
  if (tmMatch) return handleTestimonialDecision(context, Number(tmMatch[1]), admin);

  const modelMatch = path.match(/^\/admin\/orders\/(\d+)\/models$/);
  if (modelMatch) return handleAddCustomModel(context, Number(modelMatch[1]));

  /* DE WEEK VAN EEN ABONNEE STARTEN. Achter dezelfde poort als alles hierboven:
     een sessie én een Origin die klopt. Dat is hier geen formaliteit — dit is de
     enige knop in dit dashboard die saldo afschrijft én werk laat ontstaan. */
  const weekMatch = path.match(/^\/admin\/customers\/(\d+)\/week$/);
  if (weekMatch) return handleStartWeek(context, Number(weekMatch[1]), admin);

  /* SLOTS MET DE HAND BIJSTELLEN. Achter dezelfde poort, en met `admin` mee om
     dezelfde reden: dit is de tweede knop die aan het saldo van een klant komt. */
  const slotMatch = path.match(/^\/admin\/customers\/(\d+)\/slots$/);
  if (slotMatch) return handleSlotCorrectie(context, Number(slotMatch[1]), admin);

  // Delivery upload — August 2026. The studio's own files going the other way.
  const uploadMatch = path.match(/^\/admin\/orders\/(\d+)\/deliver$/);
  if (uploadMatch) return handleDeliveryUpload(context, Number(uploadMatch[1]));

  // Herlevering melden. Los van /deliver, want uploaden en aankondigen zijn
  // twee beslissingen — zie het blok boven handleAnnounceRedelivery().
  const announceMatch = path.match(/^\/admin\/orders\/(\d+)\/announce$/);
  if (announceMatch) return handleAnnounceRedelivery(context, Number(announceMatch[1]));

  /* Een nieuwe portaallink, zonder aankondiging. Een eigen route en niet een
     tweede knop op /announce, want die stopt bij "niets nieuws" — en dat is
     precies de situatie waarin deze knop nodig is. Zie de kop van
     handleFreshLink() voor de belofte die hij nakomt. */
  const freshLinkMatch = path.match(/^\/admin\/orders\/(\d+)\/fresh-link$/);
  if (freshLinkMatch) return handleFreshLink(context, Number(freshLinkMatch[1]));

  /* Het uniciteitslogboek van een merkmodel. Zie handleModelCheck() voor de
     belofte die hier wordt vastgelegd en migratie 0033 voor de kolommen. */
  const modelCheckMatch = path.match(/^\/admin\/orders\/(\d+)\/model-check$/);
  if (modelCheckMatch) return handleModelCheck(context, Number(modelCheckMatch[1]));

  /* ── BLOK 5, 12 AUGUSTUS 2026 ────────────────────────────────────────────────
     Vijf routes die het paneel van lezen naar corrigeren brengen. Ze staan bij
     elkaar omdat ze bij elkaar horen; de redenering per handeling staat bij de
     handlers zelf, boven renderCustomer(). */
  const modelManageMatch = path.match(/^\/admin\/models\/(\d+)\/manage$/);
  if (modelManageMatch) return handleModelManage(context, Number(modelManageMatch[1]));

  const custDetailsMatch = path.match(/^\/admin\/customers\/(\d+)\/details$/);
  if (custDetailsMatch) return handleCustomerDetails(context, Number(custDetailsMatch[1]));

  const custStatusMatch = path.match(/^\/admin\/customers\/(\d+)\/status$/);
  if (custStatusMatch) return handleCustomerStatus(context, Number(custStatusMatch[1]));

  const creditMatch = path.match(/^\/admin\/customers\/(\d+)\/credits$/);
  if (creditMatch) return handleCustomerCredit(context, Number(creditMatch[1]));

  const signinMatch = path.match(/^\/admin\/customers\/(\d+)\/signin-link$/);
  if (signinMatch) return handleCustomerSigninLink(context, Number(signinMatch[1]));

  // Welk beeld hoort bij welk product — de indeling die het klantdashboard in
  // groepen verdeelt in plaats van in twee losse stapels.
  const mapMatch = path.match(/^\/admin\/orders\/(\d+)\/map$/);
  if (mapMatch) return handleFileMapping(context, Number(mapMatch[1]));

  // Twee notitieroutes, en het verschil zit in de route zoals het in de tabel
  // zit: /note schrijft naar de bestelling en wordt door de klant gelezen,
  // /internal schrijft naar order_notes en wordt door niemand anders gelezen.
  const noteMatch = path.match(/^\/admin\/orders\/(\d+)\/note$/);
  if (noteMatch) return handleCustomerNote(context, Number(noteMatch[1]));

  const internalMatch = path.match(/^\/admin\/orders\/(\d+)\/internal$/);
  if (internalMatch) return handleInternalNote(context, Number(internalMatch[1]));

  // Drie soorten "weg", drie routes — zie het blok boven handleOrderCancel over
  // waarom dit geen één knop met een keuzelijstje is.
  const cancelMatch = path.match(/^\/admin\/orders\/(\d+)\/cancel$/);
  if (cancelMatch) return handleOrderCancel(context, Number(cancelMatch[1]));

  const hideMatch = path.match(/^\/admin\/orders\/(\d+)\/hide$/);
  if (hideMatch) return handleOrderHide(context, Number(hideMatch[1]));

  const deleteMatch = path.match(/^\/admin\/orders\/(\d+)\/delete$/);
  if (deleteMatch) return handleOrderDelete(context, Number(deleteMatch[1]));

  const wipeMatch = path.match(/^\/admin\/customers\/(\d+)\/wipe$/);
  if (wipeMatch) return handleCustomerWipe(context, Number(wipeMatch[1]));

  const invoiceMatch = path.match(/^\/admin\/orders\/(\d+)\/invoice$/);
  const previewMatch = path.match(/^\/admin\/models\/(\d+)\/preview$/);
  if (invoiceMatch) return handleInvoiceRepair(context, Number(invoiceMatch[1]));
  if (previewMatch) return handleModelPreview(context, Number(previewMatch[1]));

  const modelStatusMatch = path.match(/^\/admin\/models\/(\d+)\/status$/);
  if (modelStatusMatch) return handleModelStatus(context, Number(modelStatusMatch[1]));

  // Adding a model from the CUSTOMER page rather than from an order card. Same
  // handler, reached by customer id instead of by order id — the existing route
  // resolves the customer through an order, which is the wrong way round when
  // you are already looking at the brand.
  const custModelMatch = path.match(/^\/admin\/customers\/(\d+)\/models$/);
  if (custModelMatch) return handleAddCustomModelForCustomer(context, Number(custModelMatch[1]));

  return html(page({ title: 'Not found', body: errorBody('Not found.') }), 404);
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN / LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

async function handleLogin({ request, env }) {
  const gate = await checkRate(env, { ip: clientIp(request), action: 'admin-login', limit: LOGIN_LIMIT });
  if (!gate.allowed) {
    return html(page({ title: 'Sign in', body: loginBody('Too many attempts. Wait a minute and try again.') }), 429);
  }

  const form = await request.formData().catch(() => null);
  const email = String(form?.get('email') || '').trim().toLowerCase();
  const password = String(form?.get('password') || '');

  const row = email
    ? await env.DB.prepare('SELECT id, password_hash FROM admin_users WHERE email = ?1').bind(email).first()
    : null;

  // Verify against a hash even when no row matched, so the response time does
  // not tell an attacker whether the email exists. The dummy hash is a fixed,
  // never-matching PBKDF2 string — cheap to keep around, expensive to skip.
  const ok = row
    ? await verifyPassword(password, row.password_hash)
    : await verifyPassword(password, await dummyHash());

  if (!ok || !row) {
    return html(page({ title: 'Sign in', body: loginBody('Wrong email or password.') }), 401);
  }

  const { token, tokenHash } = await mintAdminSession();
  await env.DB.prepare(
    'INSERT INTO admin_sessions (admin_id, token_hash, expires_at) VALUES (?1, ?2, ?3)'
  ).bind(row.id, tokenHash, adminSessionExpiry()).run();

  return seeOther('/admin', [setSessionCookie(token)]);
}

async function handleLogout({ request, env }, admin) {
  await env.DB.prepare('DELETE FROM admin_sessions WHERE id = ?1').bind(admin.session_id).run().catch(() => {});
  return seeOther('/admin/login', [clearSessionCookie()]);
}

// A fixed PBKDF2 hash (100000 iterations) of a string nobody will ever type,
// so a login attempt against an unknown email still pays the same hashing
// cost as one against a real row.
//
// NOT precomputed at module load — that was the original shape of this and it
// shipped a real deploy failure: "Uncaught Error: Disallowed operation called
// within global scope... at hashPassword". Cloudflare Workers explicitly
// forbid asynchronous I/O, timers, and random-value generation while a module
// is still being evaluated — hashPassword() does both (crypto.getRandomValues
// for the salt, crypto.subtle.deriveBits to derive) — and a top-level `await`
// runs during that evaluation, before any request exists to run it inside of.
// Plain node has no such restriction, which is why test_admin.mjs never
// caught this: everything in this suite runs under node, and node was happy
// to await it at import time.
//
// ratelimit.js's getSalt() already solved this exact shape of problem, for
// the same reason (its salt is also crypto.getRandomValues output): a
// per-isolate cache, computed lazily on first USE — inside a request handler,
// where async work is allowed — rather than at load. This is that pattern.
let dummyHashCache = null;
async function dummyHash() {
  if (dummyHashCache) return dummyHashCache;
  dummyHashCache = await hashPassword('vis-admin-dummy-hash-constant-time-decoy');
  return dummyHashCache;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS UPDATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Een revisie afhandelen: het beeld gaat terug naar de klant ter beoordeling.
 *
 * review_state gaat naar 'pending' en niet naar 'approved'. Dat verschil is het
 * hele punt: wij hebben iets gedaan, de klant beslist of het klopt. Het op
 * 'approved' zetten zou namens de klant een oordeel vellen over werk dat zij
 * nog niet gezien hebben, en dat is precies het soort stille aanname waar een
 * discussie over "ik heb dit nooit goedgekeurd" uit ontstaat.
 *
 * DE NOTITIE WORDT NIET MEER GEWIST — 27 augustus 2026. Hier stond dat hij bij
 * de vorige ronde hoorde en dat revision_requests hem toch bewaart. Dat tweede
 * klopt, maar het eerste bleek in de praktijk een gat: elk scherm dat naar
 * files.review_note kijkt — de revisiekaart om te beginnen — meldde daarna
 * "Geen notitie achtergelaten" over een klant die wel degelijk iets had
 * opgeschreven. De toestand hoort terug naar 'pending'; de tekst hoort te
 * blijven staan. Zie tests/revisie-antwoord.test.mjs.
 *
 * EN DEZE ROUTE VERVANGT GEEN BEELD. Dat was de tweede helft van dezelfde
 * klacht. Wie een andere foto wil terugsturen, uploadt die op hetzelfde product
 * en dezelfde shot — dan zet resupersede() het oude beeld op superseded_at en
 * sluit closeReplacedRevisions() dit verzoek bij het aankondigen. Die knop staat
 * sinds vandaag op de revisiekaart zelf; deze route is wat overblijft voor
 * "er hoeft niets vervangen te worden, en dit is waarom".
 */
async function handleRevisionResolve({ request, env }, fileId) {
  const row = await env.DB.prepare(
    "SELECT id, order_id FROM files WHERE id = ?1 AND review_state = 'revision_requested'"
  ).bind(fileId).first().catch(() => null);
  if (!row) return seeOther('/admin');

  /*
   * ÉÉN REGEL TERUG — augustus 2026.
   *
   * Lucas: *"bij een afgehandelde revisie: één regel terug naar de klant over
   * wat er is aangepast."*
   *
   * VERPLICHT, om dezelfde reden als de notitie van de klant verplicht is. Hij
   * schreef op wat er mis was; "opgelost" zonder tekst is daar geen antwoord
   * op, het is een vinkje. En over drie maanden is dat vinkje precies het gat
   * waar niemand meer weet waarom er een extra ronde was.
   *
   * De regel gaat naar order_events, want dat is de tijdlijn die de klant
   * sinds deze week op zijn dashboard ziet — en hij blijft op de aanvraag zelf
   * staan als bewijs bij de vraag waar hij bij hoort.
   */
  const form = await request.formData().catch(() => null);
  const fixed = String(form?.get('fixed') || '').trim().slice(0, ANNOUNCE_NOTE_MAX);
  if (!fixed) {
    return html(page({ title: 'Admin', body: errorBody(
      'Say in one line what you changed. The customer wrote down what was wrong; "resolved" on its own is not an answer to that, and in three months it is the gap where nobody remembers why there was an extra round.'
    ) }), 400);
  }

  const status = await env.DB.prepare('SELECT status FROM orders WHERE id = ?1')
    .bind(row.order_id).first().catch(() => null);

  await env.DB.batch([
    /* DE NOTITIE VAN DE KLANT BLIJFT STAAN. Hier stond `review_note = NULL`, en
       dat wiste op het moment van afhandelen precies de zin waaróm er een ronde
       was. Alles wat daarna naar files.review_note kijkt — de revisiekaart
       hierboven om te beginnen — zei dan "Geen notitie achtergelaten" over een
       klant die wel degelijk iets had opgeschreven.

       De toestand hoort wel terug: 'pending' betekent "nog niet beoordeeld", en
       dat is na een antwoord de juiste stand. Maar de toestand en de tekst zijn
       twee dingen, en alleen de eerste hoorde te wijzigen. */
    env.DB.prepare(
      "UPDATE files SET review_state = 'pending', reviewed_at = NULL WHERE id = ?1"
    ).bind(fileId),
    // Alleen de nog openstaande regels, zodat een tweede ronde later niet de
    // afhandeldatum van de eerste overschrijft.
    env.DB.prepare(
      "UPDATE revision_requests SET resolved_at = datetime('now'), resolution_note = ?2 WHERE file_id = ?1 AND resolved_at IS NULL"
    ).bind(fileId, fixed),
    env.DB.prepare(
      "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'admin')"
    ).bind(row.order_id, status?.status || 'delivered', fixed),
  ]).catch(() => {});

  await logAdmin(env, await currentAdmin({ request, env }), 'revision.resolve', {
    orderId: row.order_id, detail: `bestand #${fileId}: ${fixed}`,
  });
  return seeOther('/admin');
}

/**
 * Revisierechten intrekken of teruggeven.
 *
 * Lucas: *"wanneer hier misbruik van wordt gemaakt kan de klant zijn
 * revisierechten verliezen."* Een handeling van een mens dus, en omkeerbaar —
 * want de volgende stap na intrekken is meestal een gesprek, en dat gesprek
 * loopt vaak goed af.
 *
 * De reden is verplicht bij intrekken en dat is geen formaliteit: over drie
 * maanden belt dit merk, en dan is "waarom staat dit uit" de eerste vraag. Bij
 * teruggeven wordt beide velden geleegd, zodat er geen reden blijft hangen bij
 * een account waar niets meer aan de hand is.
 */
async function handleRevisionRights(context, customerId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  const form = await request.formData().catch(() => null);
  const action = String(form?.get('action') || '');
  const back = `/admin/customers/${customerId}`;

  if (action === 'restore') {
    await env.DB.prepare(
      'UPDATE customers SET revisions_revoked_at = NULL, revisions_revoked_note = NULL WHERE id = ?1'
    ).bind(customerId).run().catch(() => {});
    await logAdmin(env, admin, 'revisions.restore', { customerId });
    return seeOther(back);
  }

  if (action !== 'revoke') return seeOther(back);
  const note = String(form?.get('note') || '').trim().slice(0, 500);
  if (!note) return seeOther(back);

  await env.DB.prepare(
    "UPDATE customers SET revisions_revoked_at = datetime('now'), revisions_revoked_note = ?2 WHERE id = ?1"
  ).bind(customerId, note).run().catch(() => {});
  // Dit is de handeling waar het logboek voor bedoeld is: hij neemt iets van
  // een klant af, hij is met één klik terug te draaien, en over drie maanden is
  // "wanneer en waarom is dit gebeurd" de eerste vraag.
  await logAdmin(env, admin, 'revisions.revoke', { customerId, detail: note });
  return seeOther(back);
}

/* ── HET SPOOR — augustus 2026 ─────────────────────────────────────────────────
 *
 * Lucas: *"er wordt nergens vastgelegd wie in admin wat heeft gedaan.
 * order_events.actor bestaat, maar alleen statuswijzigingen schrijven erin. Het
 * intrekken van revisierechten, een verwijdering, een prijscorrectie: allemaal
 * spoorloos."*
 *
 * WAAROM NIET ALLES IN order_events. Die tabel wordt door de klant gelezen —
 * portal.js, en sinds deze week ook zijn dashboard. Er hoort dus niets in te
 * staan wat hij niet mag zien, en "revisierechten ingetrokken wegens misbruik"
 * is precies zoiets. Dus: order_events blijft de tijdlijn die je deelt,
 * admin_log is het logboek dat je bijhoudt. Handelingen die de klant ook aangaan
 * (annuleren) schrijven in allebei — dezelfde gebeurtenis, twee publieken, twee
 * bewoordingen.
 *
 * NOOIT LOAD-BEARING. Een mislukte logregel mag geen mislukte handeling worden:
 * dan zou een kapotte tabel het hele dashboard onbruikbaar maken. Vandaar de
 * catch — het spoor is belangrijk, maar minder belangrijk dan het werk.
 */
async function logAdmin(env, admin, action, { orderId = null, customerId = null, detail = '' } = {}) {
  try {
    await env.DB.prepare(
      `INSERT INTO admin_log (admin_id, admin_email, action, order_id, customer_id, detail)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(admin?.admin_id ?? admin?.id ?? null, admin?.email || null, action, orderId, customerId, detail || null).run();
  } catch (err) {
    console.error('[admin] log niet weggeschreven:', action, err?.message || err);
  }
}

/* ── ANNULEREN, VERBERGEN, VERWIJDEREN — drie dingen, geen knop ───────────────
 *
 * Lucas: *"'orders verwijderen' klinkt als één knop, maar er zitten drie
 * verschillende situaties onder. Ze op één hoop gooien is hoe je per ongeluk
 * een betaalde bestelling weggooit die je zeven jaar moet bewaren."*
 *
 * ANNULEREN is het gewone geval: de bestelling gaat niet door. De rij blijft,
 * de reden is verplicht, de klant ziet het in zijn tijdlijn. En er moet gekozen
 * worden wat er met het geld gebeurt — terugbetalen, tegoed, of niets. Niet
 * omdat de software dat kan uitvoeren (terugbetalen gebeurt bij Mollie), maar
 * omdat het besluit vastgelegd hoort te zijn op het moment dat je het neemt.
 *
 * VERBERGEN is voor je eigen testbestellingen en dubbelingen: weg uit de
 * lijsten en de cijfers, niet weg uit de database.
 *
 * VERWIJDEREN mag alleen als er niet betaald is. Dat is geen beleefdheidsregel
 * maar een bewaarplicht, en de knop controleert het zelf in plaats van erop te
 * vertrouwen dat jij het om middernacht onthoudt.
 */
const CANCEL_PAYMENT = ['refund', 'credit', 'none'];

async function handleOrderCancel(context, orderId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  const order = await env.DB.prepare(
    'SELECT id, ref, status, payment_status, total_cents, vat_cents, refunded_cents, payment_ref, customer_id FROM orders WHERE id = ?1'
  ).bind(orderId).first().catch(() => null);
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  const form = await request.formData().catch(() => null);
  const reason = String(form?.get('reason') || '').trim().slice(0, 500);
  const payment = CANCEL_PAYMENT.includes(String(form?.get('payment') || '')) ? String(form.get('payment')) : '';

  if (!reason) {
    return html(page({ title: 'Admin', body: errorBody(
      'A cancellation needs a reason. It goes on the customer&rsquo;s timeline and it is the first thing anyone asks in three months.'
    ) }), 400);
  }
  // Betaald? Dan moet er iets over het geld gezegd zijn. Onbetaald? Dan is er
  // niets te kiezen en zou een keuze doen alsof er iets besloten is.
  const paid = order.payment_status === 'paid' && Number(order.total_cents || 0) > 0;
  /* ── EN EEN ABONNEMENTSWEEK IS GEEN VAN BEIDE — 29 augustus 2026 ────────────
   *
   * Een bestelling uit een abonnement draagt `payment_status = 'plan'` en
   * `total_cents = 0`, want de maandtermijn staat al in subscription_payments en
   * mag niet dubbel meegeteld worden. Het gevolg hier was dat `paid` onwaar werd
   * en de tijdlijn — die de KLANT leest — hem *"Nothing was paid"* vertelde over
   * werk waar hij wel degelijk voor betaald heeft. Alleen niet op deze rij.
   *
   * Er valt ook niets te kiezen over geld: restitueren zou de maandtermijn raken
   * en niet deze bestelling. Wat er teruggaat zijn zijn SLOTS, en dat gebeurt
   * hieronder. */
  const uitAbonnement = order.payment_status === 'plan';
  if (paid && !payment) {
    return html(page({ title: 'Admin', body: errorBody(
      'This order is paid, so say what happens with the money: refund, credit, or nothing. Leaving it implicit is how a refund gets forgotten.'
    ) }), 400);
  }

  const moneyLine = paid
    ? { refund: 'Refund to be issued', credit: 'Credit for a future order', none: 'No refund' }[payment]
    : uitAbonnement
      ? 'Paid from your subscription \u2014 the slots go back to your plan'
      : 'Nothing was paid';

  /*
   * GEEN STILLE MISLUKKING — 7 augustus 2026. Hier stond `.catch(() => {})`,
   * en daaronder werd onvoorwaardelijk "geannuleerd" gelogd en teruggeleid naar
   * het dashboard. Eén hapering van D1, of een database waar migratie 0014 nog
   * niet op gedraaid is, en de bestelling stond gewoon nog open terwijl alles
   * eromheen zei van niet. Een mislukte mail mag zwijgen; een mislukte
   * statuswijziging niet, want die is de handeling zelf.
   */
  try {
  await env.DB.batch([
    env.DB.prepare(
      /* 'refund to be issued' stond hier tot 11 augustus 2026 als label bij
         `cancel_payment = 'refund'`, en dat klopte zolang elke annulering met de
         hand gebeurde: jij vinkte aan dat je gíng terugbetalen. Sinds vandaag
         annuleert de webhook een tweede proefvisual zelf en stórt hij de euro ook
         zelf terug, dus voor die rijen zou "to be issued" je een taak voorspiegelen
         die al gedaan is. Het label zegt nu alleen nog WAT er geldt en niet
         WANNEER; de tijdlijn eronder vertelt of het automatisch ging. */
      `UPDATE orders SET status = 'cancelled', cancelled_at = datetime('now'),
                         cancel_reason = ?2, cancel_payment = ?3
        WHERE id = ?1`
    ).bind(orderId, reason, paid ? payment : null),
    // De klant leest dit. Daarom de reden zoals je hem zou uitspreken, plus wat
    // er met zijn geld gebeurt — dat is zijn eerste vraag.
    env.DB.prepare(
      "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'cancelled', ?2, 'admin')"
    ).bind(orderId, `${reason} — ${moneyLine}`),
  ]);
  } catch (err) {
    return html(page({ title: 'Admin', body: errorBody(
      `The cancellation did not go through: ${esc(err?.message || String(err))}. Nothing was changed.`
    ) }), 500);
  }

  await logAdmin(env, admin, 'order.cancel', {
    orderId, detail: `${order.ref}: ${reason} (${moneyLine})`,
  });

  /* ── DE SLOTS TERUG, EN DE PRODUCTEN OOK ───────────────────────────────────
     Zie de kop van queueTerugNaAnnulering(). Dit staat NA de annulering en met
     een eigen uitkomst, om dezelfde reden als de restitutie verderop: gaat het
     terugboeken mis, dan is de annulering nog steeds gedaan en vastgelegd, en
     hoort er een luide regel te staan in plaats van een omgevallen handeling.

     De klant leest de tijdlijnregel. Daarom staat er wat hij terugkrijgt en niet
     wat wij intern hebben bijgewerkt. */
  if (uitAbonnement) {
    const terug = await queueTerugNaAnnulering(env, orderId).catch((e) => {
      console.error('[admin] slots na annulering niet teruggeboekt —', e?.message || e);
      return null;
    });
    if (terug?.items) {
      const nProduct = `${terug.items} product${terug.items === 1 ? '' : 'en'}`;
      await env.DB.prepare(
        "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'cancelled', ?2, 'system')"
      ).bind(orderId, terug.abonnement
        ? `${nProduct} staan weer op je lijst en de slots zijn teruggezet op je abonnement. Je kunt ze opnieuw vastzetten wanneer je wilt.`
        : `${nProduct} staan weer op je lijst. Je abonnement liep al af, dus er zijn geen slots teruggezet.`
      ).run().catch(() => {});
      await logAdmin(env, admin, terug.abonnement && terug.slots === terug.items
        ? 'plan-slots-terug' : 'plan-slots-terug.deels', {
        orderId,
        detail: `${order.ref}: ${terug.items} item(s) terug op de lijst, ${terug.slots} slot(s) teruggeboekt`
          + `${terug.abonnement ? '' : ' — GEEN abonnement meer, slots niet terug te boeken'}`,
      }).catch(() => {});
    } else if (terug === null) {
      await logAdmin(env, admin, 'plan-slots-terug.mislukt', {
        orderId, detail: `${order.ref}: terugboeken mislukt — doe het met de hand via het abonnementspaneel`,
      }).catch(() => {});
    }
  }

  /* ── "CREDIT FOR A FUTURE ORDER" MOET OOK ECHT EEN TEGOED ZIJN ─────────────
     20 augustus 2026. De keuze "tegoed" schreef alleen `cancel_payment` en zette
     de regel *"Credit for a future order"* op de tijdlijn — die de klant leest.
     Er kwam geen rij in `customer_credits`. De klant had dus schriftelijk een
     tegoed en het bestond nergens: niet op zijn klantpagina, niet in het
     grootboek, en nergens waar iemand er over een half jaar aan zou denken.

     Twee dingen bewust zo:
     · HET BEDRAG IS WAT ER NOG OPENSTAAT, dus bruto min wat al terug is —
       dezelfde rekensom als bij een restitutie hierboven, en om dezelfde reden.
     · DE BESTELLING STAAT ER ALS KOLOM ÉN IN DE REDEN. `customer_credits` heeft
       een `order_id` — daar hoort hij, zodat de herkomst opzoekbaar is. In de
       reden staat de referentie er nóg een keer, want die kolom is SET NULL: gaat
       de bestelling ooit weg, dan blijft in tekst staan waar het tegoed vandaan
       kwam.

     Mislukt de boeking, dan valt de annulering niet om — die is al gedaan en
     vastgelegd — maar hij gaat wel luidruchtig naar `admin_log`, want dit is
     geld dat iemand beloofd is. */
  if (paid && payment === 'credit' && order.customer_id) {
    const openstaand = Math.max(0,
      (Number(order.total_cents) || 0) + (Number(order.vat_cents) || 0) - Math.max(0, Number(order.refunded_cents) || 0));
    if (openstaand > 0) {
      const geboekt = await env.DB.prepare(
        `INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id, admin_id)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(order.customer_id, openstaand, `Tegoed na annulering van ${order.ref}`, orderId, admin?.id || null)
        .run().then(() => true).catch((e) => {
          console.error('[admin] tegoed na annulering niet geboekt —', e?.message || e);
          return false;
        });
      await logAdmin(env, admin, geboekt ? 'order.credit' : 'order.credit.failed', {
        orderId,
        detail: `${order.ref}: ${openstaand} cent ${geboekt ? 'als tegoed geboekt' : 'NIET geboekt — doe het met de hand'}`,
      }).catch(() => {});
    }
  }

  /* ── EN HET GELD OOK ECHT TERUG — 20 AUGUSTUS 2026 ─────────────────────────
     Tot vandaag legde dit scherm alleen je BESLUIT vast: "Refund to be issued"
     op de tijdlijn, en daarna moest je zelf naar het Mollie-dashboard. De functie
     om het hier te doen bestond al — refundMolliePayment() in src/lib/mollie.js,
     geschreven voor de tweede proefvisual die de webhook zelf terugstort — maar
     dit scherm riep hem niet aan.

     De keten erna klopt al helemaal: Mollie stuurt de restitutie als webhook
     terug, die schrijft `refunded_cents` en geeft de creditnota uit. Er hoefde
     dus alleen een aanroep bij.

     NA de annulering en niet ervoor, en met een eigen foutafhandeling. Zo staat
     het ook in de noot bij refundMolliePayment(): mislukt de terugbetaling, dan
     is het antwoord "annuleer de bestelling toch, en meld dat het met de hand
     moet". Een annulering die niet doorgaat omdat Mollie even hikt, is de
     verkeerde uitkomst — de klant is dan afgewezen én niet geannuleerd. */
  if (paid && payment === 'refund') {
    /* ── HET RESTBEDRAG, NIET HET HELE BEDRAG ────────────────────────────────
       Hier stond het brutobedrag van de bestelling, zonder te kijken naar wat er
       al terug was. Een bestelling van € 1.210 waarop eerder € 200 coulance is
       teruggeboekt, blijft `payment_status = 'paid'` staan — de webhook zet die
       bij een gedeeltelijke restitutie bewust niet om — dus vraagt deze code
       Mollie om € 1.210 terwijl er nog € 1.010 openstaat. Mollie weigert dat,
       de catch schrijft "doe het met de hand", en de tijdlijn heeft de klant
       twee regels eerder al beloofd dat het geld terugkomt.

       `orders.refunded_cents` is precies het totaal dat al terug is (zie de noot
       bij de kolom in schema.sql: het totaal van de BESTELLING, en niet van één
       Mollie-betaling). Wat overblijft is wat we vragen; blijft er niets over,
       dan valt het hieronder in dezelfde tak als "geen betaal-id" en zegt de
       tijdlijn dat er niets te starten viel. */
    const betaald = (Number(order.total_cents) || 0) + (Number(order.vat_cents) || 0);
    const alTerug = Math.max(0, Number(order.refunded_cents) || 0);
    const bruto = Math.max(0, betaald - alTerug);
    const betaalId = order.payment_ref || (await env.DB.prepare(
      `SELECT external_id FROM payments
        WHERE order_id = ?1 AND status IN ('paid', 'refunded') AND provider = 'mollie'
        ORDER BY id DESC LIMIT 1`
    ).bind(orderId).first().catch(() => null))?.external_id || null;

    if (!betaalId || !env.MOLLIE_API_KEY || !(bruto > 0)) {
      await env.DB.prepare(
        "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'cancelled', ?2, 'system')"
      ).bind(orderId, 'De terugbetaling kon hier niet gestart worden — die moet met de hand in Mollie.').run().catch(() => {});
      console.error('[admin] restitutie voor', order.ref, 'niet gestart — geen betaal-id of geen sleutel');
    } else {
      try {
        await refundMolliePayment(env, betaalId, {
          cents: bruto,
          description: `VISUAILS ${order.ref} — geannuleerd`,
        });
        await env.DB.prepare(
          "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'cancelled', ?2, 'system')"
        ).bind(orderId, `Terugbetaling van € ${(bruto / 100).toFixed(2).replace('.', ',')} in gang gezet bij Mollie. De creditnota volgt zodra die bevestigd is.`).run().catch(() => {});
        await logAdmin(env, admin, 'order.refund', { orderId, detail: `${order.ref}: ${bruto} cent teruggestort` });
        console.log('[admin] restitutie gestart voor', order.ref, bruto, 'cent');
      } catch (e) {
        await env.DB.prepare(
          "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, 'cancelled', ?2, 'system')"
        ).bind(orderId, 'De terugbetaling is niet gelukt en moet met de hand in Mollie gedaan worden.').run().catch(() => {});
        console.error('[admin] restitutie voor', order.ref, 'mislukt —', e && e.message ? e.message : e);
      }
    }
  }

  return seeOther('/admin');
}

async function handleOrderHide(context, orderId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  const form = await request.formData().catch(() => null);
  const show = String(form?.get('action') || '') === 'show';

  const order = await env.DB.prepare('SELECT id, ref FROM orders WHERE id = ?1').bind(orderId).first().catch(() => null);
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  await env.DB.prepare(
    `UPDATE orders SET hidden_at = ${show ? 'NULL' : "datetime('now')"} WHERE id = ?1`
  ).bind(orderId).run().catch(() => {});
  await logAdmin(env, admin, show ? 'order.unhide' : 'order.hide', { orderId, detail: order.ref });
  return seeOther(show ? '/admin?hidden=1' : '/admin');
}

/**
 * Eén bestelling echt weg, en alleen als er niet betaald is.
 *
 * DE BEVESTIGING IS DE REFERENTIE OVERTYPEN. Een "weet je het zeker?" wordt
 * weggeklikt; een referentie overtypen kan niet per ongeluk. Het is dezelfde
 * maatregel die de klantwissing hieronder gebruikt, en om dezelfde reden.
 *
 * WAT ER MEEGAAT: de bestanden in R2 én hun rijen. Een verweesde R2-sleutel is
 * opslag waar je voor betaalt en die niemand ooit nog terugvindt. Faalt R2, dan
 * gaat de rest wél door — een bestand dat blijft hangen is beter dan een halve
 * verwijdering waarvan niemand weet hoe ver hij kwam; het staat in het logboek.
 */
async function handleOrderDelete(context, orderId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  const order = await env.DB.prepare(
    'SELECT id, ref, payment_status, total_cents FROM orders WHERE id = ?1'
  ).bind(orderId).first().catch(() => null);
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  if (order.payment_status === 'paid' && Number(order.total_cents || 0) > 0) {
    return html(page({ title: 'Admin', body: errorBody(
      'This order was paid, so it is not deletable — a paid order has to stay on file. Cancel it (with a reason) or hide it from your lists instead.'
    ) }), 400);
  }

  const form = await request.formData().catch(() => null);
  if (String(form?.get('confirm') || '').trim() !== order.ref) {
    return html(page({ title: 'Admin', body: errorBody(
      `To delete this order, type its reference exactly: <strong>${esc(order.ref)}</strong>.`
    ) }), 400);
  }

  const keys = await env.DB.prepare('SELECT r2_key, preview_key FROM files WHERE order_id = ?1')
    .bind(orderId).all().catch(() => ({ results: [] }));

  /*
   * EERST DE RIJEN, DAN DE BESTANDEN — 7 augustus 2026.
   *
   * Andersom stond hier, met een `.catch(() => {})` op de batch eronder: de
   * objecten waren dan al uit R2 weg terwijl de rijen bleven staan als een
   * hapering de batch trof, en het logboek meldde intussen een geslaagde
   * verwijdering. Rijen eerst betekent dat de enige uitkomst bij een fout een
   * bestelling is die er nog gewoon is — en die kun je nog een keer proberen.
   *
   * order_events, files, revision_requests en order_notes hangen met ON DELETE
   * CASCADE aan orders (zie schema.sql), maar D1 heeft foreign keys niet altijd
   * aan staan. Expliciet opruimen scheelt het soort weesrijen dat je pas een
   * jaar later vindt.
   */
  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM revision_requests WHERE order_id = ?1').bind(orderId),
      env.DB.prepare('DELETE FROM order_notes WHERE order_id = ?1').bind(orderId),
      env.DB.prepare('DELETE FROM order_events WHERE order_id = ?1').bind(orderId),
      env.DB.prepare('DELETE FROM order_tokens WHERE order_id = ?1').bind(orderId),
      env.DB.prepare('DELETE FROM files WHERE order_id = ?1').bind(orderId),
      env.DB.prepare('DELETE FROM orders WHERE id = ?1').bind(orderId),
    ]);
  } catch (err) {
    return html(page({ title: 'Admin', body: errorBody(
      `Nothing was deleted: ${esc(err?.message || String(err))}. The order and its files are untouched.`
    ) }), 500);
  }

  // Pas nu de objecten. Blijft er één hangen, dan is dat opslag die je betaalt
  // en geen gat in je administratie — het staat in het logboek.
  let removed = 0;
  for (const row of keys.results || []) {
    for (const key of [row.r2_key, row.preview_key].filter(Boolean)) {
      try { await env.UPLOADS?.delete(key); removed++; } catch { /* zie hierboven */ }
    }
  }

  await logAdmin(env, admin, 'order.delete', {
    orderId: null, detail: `${order.ref} verwijderd (onbetaald), ${removed} bestand(en) uit R2`,
  });
  return seeOther('/admin');
}

/**
 * Alles van één merk weg, op AVG-verzoek.
 *
 * Lucas: *"echt verwijderen — alleen voor een AVG-verzoek, en dan hoort het bij
 * de klant en niet bij de bestelling: alles van dat merk weg, inclusief de
 * bestanden in R2. Bewaart wat de belastingdienst wil zien: een geanonimiseerde
 * factuurregel met bedrag en datum."*
 *
 * DE VOLGORDE IS NIET WILLEKEURIG. Eerst de factuurregels wegschrijven, dan pas
 * verwijderen. Andersom zou een fout halverwege een klant zonder bestellingen
 * én zonder boekhouding opleveren, en dat is de enige uitkomst hier die je niet
 * meer kunt repareren.
 *
 * ── DEZE FUNCTIE FAALDE HALVERWEGE, EN DAT IS OP 12 AUGUSTUS 2026 GEREPAREERD ─
 *
 * WAT ER MIS WAS. De laatste batch deed `DELETE FROM orders WHERE customer_id = ?`.
 * Sinds migratie 0021 (facturen, 9 augustus) en 0026 (creditnota's, 12 augustus)
 * verwijzen `invoices.order_id` en `credit_notes.order_id` naar `orders` met
 * **ON DELETE RESTRICT** — en schema.sql zegt bij die regel zelf waarom: *"een
 * uitgereikt document verdwijnt niet omdat"* de bestelling verdwijnt. Met
 * `PRAGMA foreign_keys = ON` gooit die DELETE dus zodra er ooit één factuur is
 * uitgereikt.
 *
 * En dat gebeurde NA stap 2. De R2-objecten waren op dat moment al onherroepelijk
 * weg, de rijen stonden er nog, en de logregel werd nooit geschreven. Uitkomst:
 * de klant houdt zijn account en zijn bestellingen, maar al zijn beelden zijn
 * verdwenen — en er staat niets over in het logboek. Dat is de slechtst mogelijke
 * uitkomst van de enige knop op dit paneel die niet half mag falen.
 *
 * De test zag het niet: tests/admin.test.mjs gebruikt een neptabel-database die
 * SQL-strings opslaat en geen foreign keys afdwingt. Een fout die alleen in
 * productie bestaat, ziet een test met een nepdatabase per definitie niet.
 *
 * ── EN WAT DE REPARATIE VERANDERT, INHOUDELIJK ──────────────────────────────
 *
 * Die RESTRICT is geen obstakel maar een BESLISSING die al in het schema stond, en
 * hij klopt: art. 17 lid 3 sub b AVG zegt dat het recht op vergetelheid niet geldt
 * voor zover verwerking nodig is om een wettelijke verplichting na te komen. De
 * fiscale bewaarplicht (art. 52 lid 4 AWR) is zo’n verplichting, en die gaat over
 * de FACTUUR — met de naam en het adres erop, want zonder die gegevens is het geen
 * geldige factuur.
 *
 * Dus wordt er nu onderscheid gemaakt, en dat is het hele verschil:
 *
 *   BESTELLINGEN ZONDER FACTUUR   verdwijnen volledig, zoals hiervoor.
 *   BESTELLINGEN MÉT FACTUUR      blijven bestaan, maar worden UITGEKLEED: naam,
 *                                 e-mail, telefoon, adres, btw-nummer, merk en
 *                                 details_json gaan eruit. Wat overblijft is de
 *                                 rij waar de factuur aan hangt, en de factuur
 *                                 zelf met zijn momentopname en zijn pdf.
 *
 * Dat is minder dan "alles weg" en het is wat de wet toelaat. De klant hoort dat
 * ook te lezen op het paneel voordat hij op de knop drukt — zie wipePanel.
 *
 * WAT ER IN HET ARCHIEF KOMT: referentie, dienst, bedrag, btw, datum. Geen
 * naam, geen e-mail, geen merk. Precies genoeg om een aangifte te
 * onderbouwen en te weinig om iemand te herkennen. Alleen nog voor bestellingen
 * ZONDER factuur: bij een gefactureerde bestelling is de factuur zelf het
 * wettelijke bewijsstuk, en dan is een tweede geanonimiseerde regel over hetzelfde
 * geld dubbele boekhouding.
 *
 * BEVESTIGEN DOOR DE MERKNAAM OVER TE TYPEN. Er is geen ongedaan maken na deze
 * knop; dan hoort er ook geen enkele manier te zijn om hem per ongeluk in te
 * drukken.
 */
async function handleCustomerWipe(context, customerId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  const customer = await env.DB.prepare(
    'SELECT id, email, brand, name FROM customers WHERE id = ?1'
  ).bind(customerId).first().catch(() => null);
  if (!customer) return html(page({ title: 'Admin', body: errorBody('That customer does not exist.') }), 404);

  const expected = (customer.brand || customer.name || customer.email || '').trim();
  const form = await request.formData().catch(() => null);
  if (String(form?.get('confirm') || '').trim() !== expected) {
    return html(page({ title: 'Admin', body: errorBody(
      `To erase everything for this customer, type <strong>${esc(expected)}</strong> exactly. There is no undo, so there is no easy button either.`
    ) }), 400);
  }

  // DEZE QUERY SELECTEERDE EEN KOLOM DIE NIET BESTOND, en de vangnet-catch
  // eronder zorgde ervoor dat niemand het merkte. `orders.vat_cents` stond in
  // geen enkele migratie — alleen op invoice_archive — dus D1 gooide "no such
  // column", `.catch()` slikte het in, `rows` werd leeg, de INSERT hieronder
  // werd overgeslagen, en handleCustomerWipe() verwijderde vervolgens gewoon
  // de bestanden, de bestellingen en de klant. Het bewaarplicht-archief legde
  // stilzwijgend nul regels vast, zeven jaar bewaarplicht en al. De test zag
  // het niet omdat de fixture `vat_cents` netjes meegaf. migrations/0015 maakt
  // de kolom echt.
  //
  // De catch blijft, maar mag geen fout meer verbergen die het archief
  // leegmaakt: faalt deze query, dan faalt de wipe en is er niets verwijderd.
  const orders = await env.DB.prepare(
    'SELECT id, ref, service, total_cents, vat_cents, paid_at, created_at, payment_status FROM orders WHERE customer_id = ?1'
  ).bind(customerId).all().catch((err) => {
    throw new Error(`kon de bestellingen niet lezen, dus er is niets verwijderd: ${err?.message || err}`);
  });
  const rows = orders.results || [];
  const ids = rows.map((o) => o.id);

  /*
   * 0 · WELKE BESTELLINGEN DRAGEN EEN UITGEREIKT DOCUMENT?
   *
   * Dit moet vóór alles gebeuren, want het bepaalt wat er straks mag worden
   * verwijderd. Een `IN (...)`-lijst met gebonden waarden en niet met samengevoegde
   * getallen: `ids` komt uit onze eigen query en niet van een formulier, maar dit is
   * de plek waar iemand later een lijst uit een verzoek doorgeeft.
   *
   * Faalt deze query, dan faalt de wipe — net als bij de bestellingen hierboven, en
   * om dezelfde reden: niet weten wat er beschermd is, is geen grond om te gaan
   * verwijderen.
   */
  const billed = new Set();
  if (ids.length) {
    const plaats = ids.map((_, i) => `?${i + 1}`).join(',');
    for (const tabel of ['invoices', 'credit_notes']) {
      const res = await env.DB.prepare(
        `SELECT DISTINCT order_id FROM ${tabel} WHERE order_id IN (${plaats})`
      ).bind(...ids).all().catch((err) => {
        throw new Error(`kon ${tabel} niet lezen, dus er is niets verwijderd: ${err?.message || err}`);
      });
      for (const r of res.results || []) billed.add(Number(r.order_id));
    }
  }
  const wipeIds = ids.filter((id) => !billed.has(id));
  const keepIds = ids.filter((id) => billed.has(id));

  // 1 · Bewaren wat bewaard moet blijven.
  //
  // ALLEEN de betaalde bestellingen ZONDER factuur. Bij een gefactureerde bestelling
  // is de factuur zelf het wettelijke bewijsstuk en blijft die staan; een tweede
  // geanonimiseerde regel over hetzelfde geld zou dubbele boekhouding zijn.
  const paid = rows.filter((o) => o.payment_status === 'paid'
    && Number(o.total_cents || 0) > 0
    && !billed.has(o.id));
  if (paid.length) {
    await env.DB.batch(paid.map((o) => env.DB.prepare(
      `INSERT INTO invoice_archive (ref, service, total_cents, vat_cents, paid_at, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(o.ref, o.service || null, Number(o.total_cents || 0), Number(o.vat_cents || 0), o.paid_at || null, o.created_at || null)))
      .catch((err) => { throw new Error(`archief niet weggeschreven: ${err?.message || err}`); });
  }

  // 2 · De bestanden uit R2. Zowel wat de klant stuurde als wat wij leverden,
  //     plus de portretten van zijn eigen modellen — die staan onder models/.
  const fileKeys = await env.DB.prepare(
    'SELECT f.r2_key, f.preview_key FROM files f JOIN orders o ON o.id = f.order_id WHERE o.customer_id = ?1'
  ).bind(customerId).all().catch(() => ({ results: [] }));

  /*
   * ── DE AFGELEIDE FORMATEN, EN WAAROM ZE HIER ONTBRAKEN — 14 AUGUSTUS 2026 ──
   *
   * De query hierboven leest twee kolommen, en sinds migratie 0022 is een
   * geleverd beeld VIER objecten in R2: `<stem>.png` staat in files.r2_key,
   * `review/<stem>.webp` in files.preview_key, en `<stem>.jpg` en `<stem>.webp`
   * staan alleen als rijen in `file_assets` (zie scripts/deliver.mjs).
   *
   * Juist die twee zijn de bestanden die de klant publiceert — delivery.js haalt
   * ze op om zijn zip te bouwen. Bij een wisverzoek verdwenen dus de master en de
   * reviewkopie, en bleven de jpg en de webp staan. En omdat een paar regels
   * lager de `file_assets`-rijen wél worden verwijderd, wees er daarna NIETS in
   * D1 meer naar die objecten: geen tweede wis, geen cron, geen adminscherm kan
   * ze ooit nog vinden. Het logboek meldde ondertussen "80 bestand(en) uit R2"
   * en de wissing stond als voltooid geboekt.
   *
   * Bij een verzoek onder art. 17 AVG is dat het ergste soort fout: hij ziet er
   * afgerond uit en laat driekwart van de bytes staan.
   *
   * cron/index.js deed het al goed — purgeExpiredFiles() roept variantKeys() aan,
   * met de noot dat het zonder die stap "er netjes uitziet en drie kwart van de
   * bytes laat staan". Deze route heeft die reparatie nooit gekregen.
   *
   * `no such table` wordt hier verdragen om dezelfde reden als daar: zonder
   * migratie 0022 bestaat de tabel niet, en dan zijn er ook geen varianten.
   */
  const variantKeys = await env.DB.prepare(
    `SELECT a.r2_key
       FROM file_assets a
       JOIN files f ON f.id = a.file_id
       JOIN orders o ON o.id = f.order_id
      WHERE o.customer_id = ?1`
  ).bind(customerId).all().catch(() => ({ results: [] }));
  const modelKeys = await env.DB.prepare(
    'SELECT preview_key FROM custom_models WHERE customer_id = ?1 AND preview_key IS NOT NULL'
  ).bind(customerId).all().catch(() => ({ results: [] }));

  let removed = 0;
  let failed = 0;
  for (const row of [...(fileKeys.results || []), ...(variantKeys.results || []), ...(modelKeys.results || [])]) {
    for (const key of [row.r2_key, row.preview_key].filter(Boolean)) {
      try { await env.UPLOADS?.delete(key); removed++; } catch { failed++; }
    }
  }

  /*
   * 3 · DE RIJEN, van blad naar wortel zodat er nooit een rij naar een verdwenen
   *     ouder wijst — ook niet als foreign keys uit staan.
   *
   * VIER TABELLEN ZIJN HIER OP 12 AUGUSTUS 2026 BIJ GEKOMEN, en alle vier stonden
   * er niet omdat ze op ON DELETE CASCADE leunen. Deze codebase beargumenteert
   * elders (zie de noot bij de style locks) dat je in D1 niet op cascade moet
   * vertrouwen, en bij een AVG-verzoek is "het gaat vermoedelijk automatisch" geen
   * antwoord dat je aan een toezichthouder geeft:
   *
   *   file_assets      hangt aan files en draagt de afgeleide varianten
   *   payments         draagt `raw_payload`: de hele webhookbody van de betaling
   *   order_feedback   draagt `private_note` en `testimonial_name`
   *   messages         het contactformulier, met e-mailadres, naam en bericht.
   *                    Deze hangt aan de KLANT en niet aan een bestelling, en had
   *                    daarom ook met cascade nooit meegegaan: de FK is SET NULL.
   *
   * EN OP 17 AUGUSTUS 2026 VIER MEER, om exact dezelfde reden: het abonnement.
   * subscriptions, subscription_months, plan_queue en de abonnementsbetalingen —
   * die laatste hangen aan geen enkele bestelling, dus zag de regel hieronder ze
   * niet. Zie het blok in de batch zelf.
   *
   * En `subscribers` heeft helemaal geen koppeling aan een klant — alleen een
   * e-mailadres — dus die wordt op het adres opgeruimd. Zonder die regel blijft een
   * verwijderde klant op de nieuwsbrieflijst staan, en dat is precies het geval
   * waarin een verwijderverzoek zichtbaar niet is uitgevoerd.
   */
  const perOrder = (table, list) => list.map((id) =>
    env.DB.prepare(`DELETE FROM ${table} WHERE order_id = ?1`).bind(id));

  /* file_assets kan niet per bestelling: hij hangt aan `files`. Dus eerst de
     varianten van de bestanden van deze klant, en pas daarna de bestanden zelf. */
  const assetKills = ids.map((id) => env.DB.prepare(
    'DELETE FROM file_assets WHERE file_id IN (SELECT id FROM files WHERE order_id = ?1)'
  ).bind(id));

  /*
   * DE GEFACTUREERDE BESTELLINGEN BLIJVEN, UITGEKLEED. Alles wat een persoon
   * aanwijst gaat eruit; wat de factuur nodig heeft om aan iets te hangen blijft.
   * `customer_id` op NULL zetten doet de foreign key straks zelf, maar hier
   * expliciet — dezelfde reden als hierboven.
   */
  /*
   * `email` KAN NIET OP NULL. Die kolom is NOT NULL sinds schema.sql, en dat is
   * terecht: een bestelling zonder adres om iets naartoe te sturen is geen
   * bestelling. Gevonden door tests/wipe.test.mjs tegen een echte sqlite -- de eerste
   * versie van deze reparatie zette hem op NULL en liet de hele batch omvallen, wat
   * exact dezelfde soort halve mislukking zou zijn geweest als de bug die hij moest
   * verhelpen.
   *
   * Dus een adres dat naar niemand wijst en dat ook niet KAN. `.invalid` is daarvoor
   * bij RFC 2606 gereserveerd: dat topniveaudomein wordt nooit uitgegeven, dus er is
   * geen toekomst waarin dit adres bij een echt mens uitkomt. Een verzonnen
   * `gewist@example.com` zou dat niet garanderen.
   */
  const WEG = 'gewist@visuails.invalid';
  const strip = keepIds.map((id) => env.DB.prepare(
    `UPDATE orders SET customer_id = NULL, name = NULL, brand = NULL, email = ?2,
            phone = NULL, vat_number = NULL, details_json = NULL, billing_address = NULL,
            first_name = NULL, last_name = NULL, address_line1 = NULL, address_line2 = NULL,
            postal_code = NULL, city = NULL, region = NULL, customer_note = NULL,
            vat_check_name = NULL, vat_check_json = NULL, payer_hash = NULL
      WHERE id = ?1`
  ).bind(id, WEG));

  /* En de betaling van zo’n bestelling: de rij blijft staan, want die verbindt de
     factuur met het geld dat is ontvangen. Alleen de ruwe webhookbody gaat eruit —
     daar staan de gegevens van de betaler in. */
  const stripPay = keepIds.map((id) => env.DB.prepare(
    'UPDATE payments SET raw_payload = NULL WHERE order_id = ?1'
  ).bind(id));

  await env.DB.batch([
    ...assetKills,
    ...perOrder('revision_requests', ids),
    ...perOrder('order_notes', ids),
    ...perOrder('order_events', ids),
    ...perOrder('order_tokens', ids),
    ...perOrder('order_feedback', ids),
    ...perOrder('files', ids),
    ...perOrder('payments', wipeIds),
    ...stripPay,
    env.DB.prepare('DELETE FROM customer_style_locks WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM custom_models WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM account_sessions WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM account_tokens WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM messages WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM subscribers WHERE lower(email) = lower(?1)').bind(customer.email || ''),

    /*
     * ── HET ABONNEMENT, EN DE FOUT DIE HET BIJNA WERD — 17 AUGUSTUS 2026 ──────
     *
     * Vier rijen die er op 16 augustus bij kwamen en hier ontbraken. Dat is
     * precies de fout die deze functie op 12 augustus al ÉÉN keer had: vier
     * tabellen die "vermoedelijk via cascade" mee zouden gaan, en die dat niet
     * deden. Nu opnieuw, en met zwaarder gewicht, want er staan andere dingen in:
     *
     *   plan_queue           vrije tekst die de klant zelf heeft getypt over wat
     *                        hij gemaakt wil hebben. Zijn plannen, in zijn woorden.
     *   subscription_months  de boekhouding per maand.
     *   subscriptions        het mandaat en de Mollie-ids — de sleutels waarmee er
     *                        van zijn rekening kon worden afgeschreven.
     *   subscription_payments  de afschrijvingen. Deze hangen aan geen enkele
     *                        bestelling, dus zag de regel `DELETE FROM payments
     *                        WHERE order_id = ?` hierboven er geen enkele van —
     *                        en een abonnee die om verwijdering vroeg, hield zijn
     *                        betaalrijen. Wat daar niet meer in staat sinds
     *                        payloadZonderPersoon(): zijn naam en zijn IBAN.
     *
     * De volgorde is van blad naar wortel, zoals de rest van deze batch: de
     * betalingen en de maanden hangen aan het abonnement, dus die eerst.
     *
     * `subQuery` in plaats van een opgehaalde id: deze functie hoeft dan niet te
     * weten óf er een abonnement is, en het werkt ook voor een klant met een
     * opgezegd abonnement uit vorig jaar naast een lopend.
     */
    env.DB.prepare(
      `DELETE FROM subscription_payments
        WHERE subscription_id IN (SELECT id FROM subscriptions WHERE customer_id = ?1)`
    ).bind(customerId),
    env.DB.prepare(
      `DELETE FROM subscription_months
        WHERE subscription_id IN (SELECT id FROM subscriptions WHERE customer_id = ?1)`
    ).bind(customerId),
    env.DB.prepare('DELETE FROM plan_queue WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM subscriptions WHERE customer_id = ?1').bind(customerId),
    /* HET GROOTBOEK VAN DE KLANT. Ontbrak hier, en dat is dezelfde soort omissie
       als het abonnement hierboven: een tabel die er later bij kwam (migratie
       0027) en die niet mee is opgenomen in de opsomming. `reason` is vrije
       tekst die een beheerder zelf typt — "coulance na de mislukte levering van
       maart" — dus het is niet alleen een bedrag maar ook een aantekening over
       deze persoon. En hij hangt aan `customers` met SET NULL, dus zonder deze
       regel blijft hij als wees achter met de aantekening er nog in. */
    env.DB.prepare('DELETE FROM customer_credits WHERE customer_id = ?1').bind(customerId),

    ...strip,
    /* DE BESTELLINGEN, en nu alleen die zónder uitgereikt document. Dit was de regel
       die de hele functie halverwege liet omvallen zodra er één factuur bestond. */
    ...wipeIds.map((id) => env.DB.prepare('DELETE FROM orders WHERE id = ?1').bind(id)),
    env.DB.prepare('DELETE FROM customers WHERE id = ?1').bind(customerId),
  ]).catch((err) => { throw new Error(`wissen mislukt: ${err?.message || err}`); });

  /*
   * DE LOGREGEL DRAAGT GEEN MERKNAAM MEER. Hier stond `${expected}` erin — de naam
   * die de klant net had gevraagd te verwijderen — en die overleefde het verzoek dus
   * in `admin_log`. Wat er nu staat is het klantnummer en de aantallen: genoeg om te
   * kunnen aantonen DAT het verzoek is uitgevoerd en wanneer, zonder de persoon
   * opnieuw op te schrijven. Dat is precies wat een verantwoordingslogboek moet doen.
   */
  await logAdmin(env, admin, 'customer.wipe', {
    customerId: null,
    detail: `klant #${customerId}: ${wipeIds.length} bestelling(en) gewist, `
      + `${keepIds.length} met factuur bewaard en uitgekleed, `
      + `${paid.length} archiefregel(s), ${removed} bestand(en) uit R2`
      + `${failed ? `, ${failed} mislukt` : ''}`,
  });

  return seeOther('/admin/customers?wiped=1');
}

async function handleStatusUpdate(context, orderId) {
  const { request, env } = context;
  const form = await request.formData().catch(() => null);
  const status = String(form?.get('status') || '');
  const note = String(form?.get('note') || '').slice(0, 2000).trim() || null;

  if (!STATUSES.includes(status)) {
    return html(page({ title: 'Admin', body: errorBody(`"${esc(status)}" is not a known status.`) }), 400);
  }
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }

  const exists = await env.DB.prepare('SELECT id, ref FROM orders WHERE id = ?1').bind(orderId).first();
  if (!exists) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  // Two writes, not one — orders.status is what every other query in the
  // codebase reads (the capacity gate's idx_orders_status, the notify mail),
  // order_events is what the client’s own portal timeline reads (portal.js,
  // loadEvents()). A status change that only touched one would move Lucas's
  // view of the order out of step with the client’s, silently.
  await env.DB.batch([
    env.DB.prepare('UPDATE orders SET status = ?1 WHERE id = ?2').bind(status, orderId),
    env.DB.prepare(
      "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'admin')"
    ).bind(orderId, status, note),
  ]);

  // DELIVERED IS THE ONE STATUS THAT LEAVES THE BUILDING. Lucas asked for the
  // customer to be emailed a portal link at exactly this moment, so this is
  // where it hangs — off the status change itself rather than off the upload,
  // because uploading and announcing are different decisions. The studio
  // routinely puts files up before it is ready to say so.
  //
  // Not awaited into the response: the redirect back to the dashboard must not
  // wait on Resend, and a mail that fails must not turn a successful status
  // change into an error page. sendDeliveryMail() is idempotent on
  // delivery_mailed_at, so a retry cannot double-send.
  if (status === 'delivered') {
    await env.DB.prepare(
      "UPDATE orders SET delivered_at = COALESCE(delivered_at, datetime('now')) WHERE id = ?1"
    ).bind(orderId).run();
    await sendDeliveryMail(context, orderId).catch((err) => {
      console.error('[admin] delivery mail failed for order', orderId, '—', err && err.message ? err.message : err);
    });
  }

  // Back to the list this update was made from, filter and all. `back` came off
  // the form, so it is re-checked against STATUSES here rather than pasted into
  // a Location header — the same rule the filter itself follows on the way in.
  // Anything else redirects to the plain dashboard, which is where a form with
  // no `back` was always going.
  await logAdmin(env, await currentAdmin(context), 'order.status', {
    orderId, detail: `${exists.ref || `#${orderId}`} → ${status}${note ? ` (${note})` : ''}`,
  });

  const back = String(form?.get('back') || '');
  return seeOther(STATUSES.includes(back) ? `/admin?status=${encodeURIComponent(back)}` : '/admin');
}


// ─────────────────────────────────────────────────────────────────────────────
// FILES — August 2026.
//
// WHY THIS EXISTS. Lucas placed a 30-product test order and the studio
// notification said "10 of 60 attached to this email. The rest are in R2 under
// the keys below." Correct, and unusable: fifty object keys and no way to open
// one. functions/api/order.js caps attachments at 10 files and 8 MB on purpose
// — a mail provider that rejects an oversized message would cost the
// notification itself, and that email is how the studio learns an order exists.
// So the email stays a heads-up and this is where the files actually are.
//
// A LIST OF LINKS, NOT A ZIP. Streaming a zip out of a Worker means writing a
// zip encoder or carrying a library into the bundle, and it buys one click. The
// problem being solved is that the files were unreachable, not that they took
// two clicks. If a whole-order download is wanted later, scripts/fetch-order.mjs
// already does it from a terminal and is the cheaper place to grow that.
//
// BOTH DIRECTIONS ON ONE PAGE. Intake (kind='upload') is what the customer
// sent; delivery (kind='delivery') is what the studio sent back. Seeing them
// together is the whole point of a per-order workbench — the question is never
// "what did they upload", it is "what did they upload and what have we
// delivered against it".
// ─────────────────────────────────────────────────────────────────────────────

/*
 * TWEE QUERIES DIE ALLEBEI EEN OUDERE DATABASE OVERLEVEN.
 *
 * De kolommen van migratie 0011 (files.announced_at, orders.redelivery_*)
 * worden hier gelezen, en code komt bijna altijd eerder op productie dan een
 * migratie: een deploy is een druk op de knop, een migratie is een terminal.
 * Zou deze pagina daarop stukgaan, dan is de eerste ervaring met de nieuwe
 * functie een foutpagina op de plek waar de bestanden staan — de pagina die
 * juist niets met melden te maken heeft. Dus: probeer het ruime SELECT, val
 * terug op het krappe, en laat het herleverblok weg zolang de kolommen er niet
 * zijn.
 */
async function loadOrderFiles(env, orderId) {
  // De btw-kolommen komen uit migratie 0015 en horen bij de brede query, niet
  // bij de smalle: valt de brede om omdat 0015 nog niet gedraaid is, dan is de
  // narrow-variant precies wat je wilt — de pagina laadt zonder btw-blok in
  // plaats van helemaal niet te laden. Zelfde patroon als 0011 hierboven.
  /* `details_json` staat in BEIDE varianten en niet alleen in de brede: het is
     een kolom van de eerste migratie, dus hij kan niet de reden zijn dat de brede
     query omvalt. En hij is hier nodig sinds 13 augustus 2026, want een
     videoaanvraag zet zijn aantal clips daarin (zie HoldingPage.astro) en niet
     meer in `product_count`. Zonder deze kolom zou het aantal dat de klant
     opgaf op deze pagina helemaal niet meer te zien zijn — dan was het
     rechttrekken van dat veld voor jou een verslechtering geweest. */
  const wide = `SELECT id, ref, service, status, brand, name, email, lang, product_count,
                       details_json,
                       delivery_mailed_at, redelivery_mailed_at, redelivery_count,
                       customer_note, customer_note_at,
                       country, vat_number, vat_treatment, vat_rate, vat_cents, total_cents,
                       vat_valid, vat_checked_at, vat_consultation, vat_check_name,
                       icp_reported_at
                  FROM orders WHERE id = ?1`;
  const narrow = `SELECT id, ref, service, status, brand, name, email, lang, product_count,
                         details_json, delivery_mailed_at
                    FROM orders WHERE id = ?1`;
  let order = null;
  let migrated = true;
  try {
    order = await env.DB.prepare(wide).bind(orderId).first();
  } catch {
    migrated = false;
    order = await env.DB.prepare(narrow).bind(orderId).first();
  }
  if (!order) return null;

  const fileCols = migrated
    ? 'id, kind, filename, bytes, product_key, shot, created_at, review_state, announced_at, superseded_at'
    : 'id, kind, filename, bytes, product_key, shot, created_at, review_state';
  let results = [];
  try {
    ({ results } = await env.DB.prepare(
      `SELECT ${fileCols} FROM files WHERE order_id = ?1 ORDER BY kind, id`
    ).bind(orderId).all());
  } catch {
    migrated = false;
    ({ results } = await env.DB.prepare(
      `SELECT id, kind, filename, bytes, product_key, shot, created_at
       FROM files WHERE order_id = ?1 ORDER BY kind, id`
    ).bind(orderId).all());
  }
  /* De interne aantekeningen. Eigen query, eigen try/catch: dit is de tabel die
   * de klantkant NIET kent, en als hij er nog niet is hoort de werkpagina
   * gewoon te laden. */
  let notes = [];
  try {
    const r = await env.DB.prepare(
      'SELECT id, body, author, created_at FROM order_notes WHERE order_id = ?1 ORDER BY id DESC LIMIT 50'
    ).bind(orderId).all();
    notes = r.results || [];
  } catch { notes = []; }

  return { order, files: results || [], migrated, notes };
}

/*
 * ── DE WERKMAP ALS ZIP — 12 AUGUSTUS 2026 ────────────────────────────────────
 *
 * Lucas: *"ik wil het verzenden sneller maken door een soort mappenroute te kunnen
 * downloaden zodat ik alleen de foto’s in de juiste folders moet zetten"* — en op
 * de vraag hoe ver: *"Heen en terug, hernoemen helemaal weg."*
 *
 * Dit is de heenweg. De redenering, de mapnamen en de terugweg staan in
 * src/lib/scaffold.js; hier staat alleen wat deze route uit de database haalt.
 *
 * WAAROM DE PRODUCTNAMEN UIT details_json KOMEN en niet uit `files`. De klant typt
 * per product een naam in de bestelstroom (`product_p3`), en die is er dus al
 * voordat er ook maar één beeld bestaat. Uit `files` lezen zou betekenen dat de
 * werkmap pas bruikbaar is nadat er al geleverd is -- precies omgekeerd aan
 * waarvoor hij bedoeld is.
 *
 * WAAROM DE ZIP GESTREAMD WORDT terwijl er alleen tekst in zit. Omdat het niets
 * kost: zipStream() doet het al, en de dag dat het bronmateriaal er wel in gaat
 * (Lucas' derde optie, nu niet gekozen) verandert er hier niets aan.
 */
async function serveScaffold(context, orderId) {
  const { env } = context;
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const order = await env.DB.prepare(
    `SELECT id, ref, brand, name, service, lang, product_count, window_end, details_json
       FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  let details = {};
  try { details = JSON.parse(order.details_json || '{}') || {}; } catch { details = {}; }

  /* Het aantal producten komt uit de kolom en niet uit het tellen van sleutels in
     details_json: een klant die bij product 4 geen naam invulde, hoort nog steeds
     een map p4 te krijgen. Een gat in de werkmap is een gat in de levering. */
  const count = Math.max(1, Math.min(Number(order.product_count) || 1, 200));
  const tekst = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const products = [];
  for (let i = 1; i <= count; i++) {
    const key = `p${i}`;
    /* De extra foto’s van dit product: `extra_p3` is het AANTAL en
       `extra_note_p3_1..n` zijn de notities. Alleen de notities gaan mee -- het
       aantal staat in de briefing als de lijst zelf. */
    const extras = [];
    const n = Math.max(0, Math.min(Number(details[`extra_${key}`]) || 0, 20));
    for (let k = 1; k <= n; k++) {
      extras.push(tekst(details[`extra_note_${key}_${k}`]) || '');
    }
    /* ── DE BEELDVERHOUDING IN DE WERKMAP — 13 AUGUSTUS 2026 ────────────────
     *
     * `ratio` geldt voor de hele bestelling; `ratio_p3_2` is de afwijking voor
     * beeld 2 van product 3. effectiveRatio() lost dat op MET de dienst erbij,
     * zodat een opgeslagen 16:9 op een catalogbestelling niet alsnog in de map
     * belandt — de browsercontrole is dan omzeild of de bestelling is oud.
     *
     * DE LABEL EN NIET HET ID. In de map staat "4:5" en niet "portrait45": dit
     * is het bestand dat een mens in de studio leest voordat hij begint, en een
     * id is een woord dat je moet opzoeken.
     *
     * ALLEEN DE ECHTE AFWIJKINGEN. Een leeg veld betekent "volg de bestelling",
     * en drie regels die alle drie hetzelfde zeggen als de regel erboven, zijn
     * drie regels die niemand meer leest. */
    const orderRatio = ratioById(tekst(details.ratio) || '', order.service);
    const imageRatios = [];
    for (let k = 1; k <= RATIO_IMAGES_MAX; k++) {
      const gezet = ratioById(tekst(details[ratioField(key, k)]) || '', order.service);
      imageRatios.push(gezet && gezet.id !== (orderRatio && orderRatio.id) ? gezet.label : '');
    }

    products.push({
      index: i,
      name: tekst(details[`product_${key}`]),
      material: tekst(details[`material_${key}`]),
      colour: tekst(details[`colour_${key}`]),
      background: tekst(details.background_hex) || tekst(details.background),
      ratio: orderRatio ? orderRatio.label : null,
      imageRatios: imageRatios.some(Boolean) ? imageRatios : null,
      extras,
    });
  }

  const orderForText = { ...order, notes: tekst(details.message) || tekst(details.notes) };
  const files = scaffoldFiles(orderForText, products, {
    origin: new URL(context.request.url).origin,
  });

  return new Response(zipStream(files), {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': zipDisposition(scaffoldFilename(order.ref)),
      'cache-control': 'private, no-store',
    },
  });
}

async function renderFiles(context, orderId) {
  const { env, request } = context;
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const data = await loadOrderFiles(env, orderId);
  if (!data) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  const { order, files, migrated, notes } = data;

  /* ── DE FACTUUR, MET TWEE KNOPPEN ─────────────────────────────────────────
     Staat er geen factuur, dan staat hier ook niets: een factuur hoort bij de
     betaling en wordt niet vanaf dit scherm uit het niets gemaakt. Zie de noot
     bij handleInvoiceRepair(). */
  const factuur = await env.DB.prepare(
    'SELECT number, status, issued_at, pdf_bytes FROM invoices WHERE order_id = ?1'
  ).bind(orderId).first().catch(() => null);
  const factuurBlok = !factuur ? '' : `
  <h2>Invoice</h2>
  <p class="muted">
    <strong>${esc(factuur.number)}</strong> &mdash; ${esc(factuur.status)}${
      factuur.issued_at ? ` on ${esc(when(factuur.issued_at))}` : ''
    }${factuur.pdf_bytes ? ` &middot; ${Math.round(factuur.pdf_bytes / 1024)} kB` : ''}
  </p>
  ${factuur.status === 'issued'
    ? `<form class="controls" method="post" action="/admin/orders/${order.id}/invoice">
         <input type="hidden" name="action" value="resend">
         <button class="btn btn-ghost btn-sm" type="submit">Send it again</button>
         <span class="meta">Same document, same attachment &mdash; for a mail that got stuck in a filter.</span>
       </form>`
    : `<form class="controls" method="post" action="/admin/orders/${order.id}/invoice">
         <input type="hidden" name="action" value="render">
         <button class="btn btn-primary btn-sm" type="submit">Finish this invoice</button>
         <span class="meta">The number exists, the pdf does not. This renders it from the stored snapshot &mdash; same number, no gap in the series.</span>
       </form>`}`;

  /* ── HET UNICITEITSLOGBOEK ────────────────────────────────────────────────
     Alleen op een merkmodel, en met een eigen query in plaats van vijf kolommen
     erbij in loadOrderFiles(). Dat is met opzet: die functie valt bij een
     onbekende kolom terug op een smallere query, en dan zou een database zonder
     migratie 0033 ineens ook het btw-blok kwijt zijn. Zo is de prijs van een
     ontbrekende migratie precies dit ene paneel. Zelfde patroon als bij de
     factuur hierboven. */
  const controle = order.service !== 'brand-model' ? null : await env.DB.prepare(
    `SELECT model_check_at, model_check_engines, model_check_result,
            model_check_by, model_check_note FROM orders WHERE id = ?1`
  ).bind(orderId).first().catch(() => null);

  const controleBlok = !controle ? '' : (() => {
    const gedaan = String(controle.model_check_engines || '')
      .split(',').map((x) => x.trim()).filter(Boolean);
    const compleet = merkmodelControleCompleet({
      datum: controle.model_check_at,
      engines: gedaan,
      uitkomst: controle.model_check_result,
    });
    const opgeslagen = new URL(request.url).searchParams.get('check') === 'saved';
    const treffer = controle.model_check_result === 'treffer';

    /* De stand bovenaan, in één zin, en die zin verschilt echt van geval tot
       geval. "Nog niet gecontroleerd" en "gecontroleerd, treffer gevonden" zijn
       twee heel verschillende dingen om als eerste te lezen, en een gedeelde
       formulering met een vinkje ernaast zou ze op elkaar laten lijken. */
    const stand = !controle.model_check_at
      ? '<p class="muted">Not checked yet. Nothing here has been run against the search engines, '
        + 'and the guarantee on /custom-models has nothing behind it until it has.</p>'
      : `<p class="${treffer ? 'okline' : 'muted'}">
           Checked ${esc(controle.model_check_at)} by ${esc(controle.model_check_by || '&mdash;')}
           &middot; ${gedaan.length} ${gedaan.length === 1 ? 'search' : 'searches'}
           &middot; <strong>${treffer ? 'a match was found' : 'no match'}</strong>${
             compleet ? '' : ' &middot; <strong>incomplete</strong> &mdash; not every face search was run'}
         </p>${controle.model_check_note
           ? `<p class="muted">${esc(controle.model_check_note)}</p>` : ''}`;

    return `
  <h2>Uniqueness check</h2>
  ${opgeslagen ? '<p class="okline">Recorded.</p>' : ''}
  ${stand}
  <p class="muted">Run the searches on the source file at full resolution, not on a thumbnail.
    The face searches answer the question; the file searches catch a generator that handed back
    an existing photograph. See <code>src/data/modelChecks.js</code>.</p>
  <form method="post" action="/admin/orders/${order.id}/model-check">
    <label>Date it was run
      <input type="date" name="checked_at" value="${esc(controle.model_check_at || '')}" required />
    </label>
    <fieldset>
      <legend>Searches run</legend>
      ${ENGINES.map((e) => `<label><input type="checkbox" name="engines" value="${esc(e.id)}"${
        gedaan.includes(e.id) ? ' checked' : ''}> ${esc(e.naam)} <span class="meta">(${
        e.soort === 'gezicht' ? 'face &mdash; required' : 'file'})</span></label>`).join('\n      ')}
    </fieldset>
    <fieldset>
      <legend>Outcome</legend>
      ${UITKOMSTEN.map((u) => `<label><input type="radio" name="result" value="${esc(u)}"${
        controle.model_check_result === u ? ' checked' : ''} required> ${
        u === 'treffer' ? 'A match was found' : 'No match'}</label>`).join('\n      ')}
    </fieldset>
    <label>Who ran it
      <input type="text" name="by" maxlength="80" value="${esc(controle.model_check_by || '')}" required />
    </label>
    <label>Note <span class="meta">On a match: what you found and what you did about it.</span>
      <textarea name="note" maxlength="1000" rows="3">${esc(controle.model_check_note || '')}</textarea>
    </label>
    <button class="btn btn-primary" type="submit">Record this check</button>
  </form>
  <p class="muted">This goes on the customer&rsquo;s timeline as well &mdash; there is nothing about a check
    that was run that needs hiding, and it is exactly what was promised.</p>`;
  })();

  const intake = files.filter((f) => f.kind === 'upload');
  const delivery = files.filter((f) => f.kind === 'delivery');

  // Per bestand zichtbaar of het al gemeld is. Dit is de kolom die de vraag
  // "wat weet de klant?" beantwoordt zonder dat je je mailbox erbij hoeft te
  // pakken — en het is ook de controle op de knop hieronder: wat je meldt,
  // staat hier daarna als gemeld.
  const row = (f, showAnnounced) => `<tr>
    <td>${esc(f.product_key || '')}</td>
    <td>${esc(f.shot || '')}</td>
    <td><a href="/admin/files/${f.id}">${esc(f.filename || `file-${f.id}`)}</a></td>
    <td class="num">${f.bytes ? Math.round(f.bytes / 1024) + ' kB' : ''}</td>
    ${showAnnounced
      ? `<td>${f.announced_at
          ? `<span class="muted">${esc(when(f.announced_at))}</span>`
          : '<strong>not announced</strong>'}</td>`
      : ''}
  </tr>`;

  const table = (rows, empty, showAnnounced = false) => rows.length
    ? `<table class="files"><thead><tr><th>Product</th><th>Shot</th><th>File</th><th class="num">Size</th>${showAnnounced ? '<th>Announced</th>' : ''}</tr></thead>
       <tbody>${rows.map((f) => row(f, showAnnounced)).join('')}</tbody></table>`
    : `<p class="muted">${empty}</p>`;

  const showAnnounced = migrated && delivery.length > 0;
  const pending = migrated ? delivery.filter((f) => !f.announced_at) : [];

  /* ── DE BTW-BESLISSING, MET HET BEWIJS ERBIJ ────────────────────────────────
   *
   * Dit is geen sierstuk. Als de Belastingdienst over drie jaar vraagt waarom
   * bestelling VIS-XXXX-YYY op 0% stond, is dit het scherm waar het antwoord
   * staat: welk land, welk nummer, wat VIES zei, en het raadpleegnummer dat
   * bewijst dát er is gecontroleerd. Zonder dat laatste is een bevestiging
   * niet meer dan een bewering.
   *
   * De ICP-regel staat erbij omdat elke verlegde EU-dienst op de kwartaalopgaaf
   * moet en een bedrag in rubriek 3b zonder ICP-regel een staande rode vlag is.
   */
  const vatRow = migrated && order.vat_treatment ? (() => {
    const t = order.vat_treatment;
    const money = (c) => `€${((Number(c) || 0) / 100).toFixed(2)}`;
    const label = t === 'eu_reverse_charge' ? 'Btw verlegd (art. 196)'
      : t === 'outside_scope' ? 'Niet belastbaar in NL'
      : `Nederlandse btw ${Math.round((Number(order.vat_rate) || 0) * 100)}%`;
    const proof = order.vat_number
      ? (order.vat_valid
        ? `VIES: geldig${order.vat_checked_at ? ` op ${esc(when(order.vat_checked_at))}` : ''}${order.vat_consultation ? ` · raadpleegnummer ${esc(order.vat_consultation)}` : ' · <strong>geen raadpleegnummer opgeslagen</strong>'}${order.vat_check_name ? ` · ${esc(order.vat_check_name)}` : ''}`
        : `VIES: <strong>niet bevestigd</strong> — er is Nederlandse btw gerekend`)
      : 'Geen btw-nummer opgegeven';
    const icp = t === 'eu_reverse_charge'
      ? (order.icp_reported_at
        ? `<span class="muted">ICP opgegeven ${esc(when(order.icp_reported_at))}</span>`
        : '<strong>Nog niet op de opgaaf ICP</strong>')
      : '';
    return `<section class="card">
      <h2>Btw</h2>
      <p><strong>${esc(label)}</strong>${order.country ? ` · ${esc(order.country)}` : ''}${order.vat_number ? ` · ${esc(order.vat_number)}` : ''}</p>
      <p class="muted">Netto ${money(order.total_cents)} · btw ${money(order.vat_cents)} · in rekening gebracht ${money((Number(order.total_cents) || 0) + (Number(order.vat_cents) || 0))}</p>
      <p class="muted">${proof}</p>
      ${icp ? `<p>${icp}</p>` : ''}
    </section>`;
  })() : '';

  /* ── DE INDELING — augustus 2026 ────────────────────────────────────────────
   *
   * Eén tabel met per levering twee keuzelijstjes, allebei al op de gok uit de
   * bestandsnaam (zie guessProductShot). Bevestigen is één knop voor de hele
   * bestelling.
   *
   * WAAROM DIT DE BELANGRIJKSTE TABEL VAN DEZE PAGINA IS. Zolang een levering
   * geen product draagt, staan op het klantdashboard twee stapels beelden naast
   * elkaar zonder verband: dit stuurde je, dit kreeg je terug, zoek zelf maar
   * uit welke bij welke hoort. Bij dertig producten is dat geen ongemak maar
   * een onbruikbaar scherm — en het is precies de bestelling waar het geld in
   * zit. Wat hier wordt ingevuld, is wat daar de groepen maakt.
   *
   * DE AMBERKLEURIGE RIJ. Een beeld waar de klant een revisie op vroeg. Hij
   * blijft amber tot er een nieuw beeld voor dezelfde product+shot binnenkomt —
   * dan wordt deze vervangen (superseded_at) en verdwijnt hij uit het
   * klantdashboard én uit deze markering. Dat is de terugkoppeling die Lucas
   * vroeg: de gloed gaat weg omdat het werk gedaan is, niet omdat iemand een
   * vinkje heeft gezet.
   */
  const SHOT_KEYS = ['front', 'back', 'detail', 'worn'];
  const productOptions = (() => {
    const keys = new Set();
    for (const f of files) if (f.product_key) keys.add(f.product_key);
    const n = Number(order.product_count) || 0;
    for (let i = 1; i <= Math.min(n, 60); i++) keys.add(`p${i}`);
    return [...keys].sort((a, b) => (Number(a.slice(1)) || 0) - (Number(b.slice(1)) || 0));
  })();

  const select = (name, value, options, blank) =>
    `<select name="${name}">
       <option value=""${value ? '' : ' selected'}>${blank}</option>
       ${options.map(([v, label]) =>
         `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(label)}</option>`).join('')}
     </select>`;

  const mapRow = (f) => {
    const revising = f.review_state === 'revision_requested';
    const dead = !!f.superseded_at;
    const cls = [revising ? 'is-revising' : '', dead ? 'is-superseded' : ''].filter(Boolean).join(' ');
    return `<tr class="${cls}">
      <td class="thumbcell"><a href="/admin/files/${f.id}"><img class="thumb" src="/admin/files/${f.id}" alt=""></a></td>
      <td>${select(`p${f.id}`, f.product_key || '', productOptions.map((k) => [k, `Product ${k.slice(1)}`]), '— not set —')}</td>
      <td>${select(`s${f.id}`, f.shot || '', SHOT_KEYS.map((k) => [k, k]), '— not set —')}</td>
      <td><a href="/admin/files/${f.id}">${esc(f.filename || `file-${f.id}`)}</a>
        ${dead ? '<br><span class="muted">replaced</span>' : ''}
        ${revising ? '<br><strong>revision asked</strong>' : ''}</td>
      <td class="num">${f.bytes ? Math.round(f.bytes / 1024) + ' kB' : ''}</td>
      ${showAnnounced
        ? `<td>${f.announced_at ? `<span class="muted">${esc(when(f.announced_at))}</span>` : '<strong>not announced</strong>'}</td>`
        : ''}
    </tr>`;
  };

  /* ── HET WERKBORD — augustus 2026 ───────────────────────────────────────────
   *
   * Lucas: *"ik wil de order eerst visueel invullen op het admin account en dan
   * samen pushen naar de klant in 1 keer per product of order. Dus ik wil de
   * foto’s op kunnen slaan zodat ik er meerdere dagen over kan doen en dan
   * gelijk zie welke nog missen."*
   *
   * Een rooster van producten × shots. Elk vakje is óf een beeld óf een gat met
   * een uploadveld erin. Dat is de hele functie: er is geen aparte
   * "concept"-toestand nodig, want een geleverd bestand is al opgeslagen en de
   * klant hoort er pas van als er GEMELD wordt. Het scheiden van uploaden en
   * melden — dat bestond al voor de eerste levering en is met de meldknop
   * doorgetrokken naar herleveringen — is precies wat dit bord mogelijk maakt.
   *
   * WAAROM VIER VASTE SHOTS. Een catalogusset LEVERT er vier: voorkant,
   * achterkant, detail, op model (src/data/shots.js legt uit dat dat dezelfde
   * vier zijn die we van de klant vragen, en waarom). Een rooster met vaste
   * kolommen laat een gat een gat zijn; een lijst met wat er toevallig al is,
   * kan dat per definitie niet. Voor andere diensten dan catalog is het rooster
   * een hulpmiddel en geen norm — vandaar dat er onderaan altijd een vrij
   * uploadveld blijft en losse bestanden gewoon in de indeeltabel komen.
   */
  const SHOT_LABEL = { front: 'Front', back: 'Back', detail: 'Detail', worn: 'On model' };
  const liveByKey = new Map();
  for (const f of delivery) {
    if (f.superseded_at || !f.product_key || !f.shot) continue;
    liveByKey.set(`${f.product_key}|${f.shot}`, f);
  }

  const boardProducts = productOptions.length ? productOptions : [];
  const totalSlots = boardProducts.length * SHOT_KEYS.length;
  const filledSlots = boardProducts.reduce((n, key) =>
    n + SHOT_KEYS.filter((sh) => liveByKey.has(`${key}|${sh}`)).length, 0);

  const slot = (productKey, shotKey) => {
    const f = liveByKey.get(`${productKey}|${shotKey}`);
    if (!f) {
      return `<div class="slot is-empty">
        <span class="slot-label">${esc(SHOT_LABEL[shotKey] || shotKey)}</span>
        <form method="post" action="/admin/orders/${order.id}/deliver" enctype="multipart/form-data">
          <input type="hidden" name="product" value="${esc(productKey)}">
          <input type="hidden" name="shot" value="${esc(shotKey)}">
          <input type="file" name="files" required>
          <button class="btn btn-ghost btn-sm" type="submit">Upload</button>
        </form>
      </div>`;
    }
    const revising = f.review_state === 'revision_requested';
    const fresh = migrated && !f.announced_at;
    return `<div class="slot${revising ? ' is-revising' : ''}${fresh ? ' is-fresh' : ''}">
      <span class="slot-label">${esc(SHOT_LABEL[shotKey] || shotKey)}</span>
      <a href="/admin/files/${f.id}" target="_blank" rel="noopener"><img class="slot-img" src="/admin/files/${f.id}" alt="" loading="lazy"></a>
      <span class="slot-state">${revising ? 'revision asked' : fresh ? 'not announced' : 'announced'}</span>
      <!-- Vervangen gaat via hetzelfde vakje: een nieuw bestand op dezelfde
           product+shot maakt het vorige automatisch vervangen (resupersede),
           dus "opnieuw" is hier één handeling en geen opruimklus. -->
      <form method="post" action="/admin/orders/${order.id}/deliver" enctype="multipart/form-data">
        <input type="hidden" name="product" value="${esc(productKey)}">
        <input type="hidden" name="shot" value="${esc(shotKey)}">
        <input type="file" name="files" required>
        <button class="btn btn-quiet btn-sm" type="submit">Replace</button>
      </form>
    </div>`;
  };

  const productRow = (key) => {
    const done = SHOT_KEYS.filter((sh) => liveByKey.has(`${key}|${sh}`)).length;
    const fresh = SHOT_KEYS.filter((sh) => {
      const f = liveByKey.get(`${key}|${sh}`);
      return f && migrated && !f.announced_at;
    }).length;
    // Per product melden mag alleen als de bestelling al één keer aangekondigd
    // is — de eerste keer gaat via de status, met de mail die zegt dat de
    // bestelling klaar is. Zie handleAnnounceRedelivery.
    const push = fresh && order.delivery_mailed_at
      ? `<form method="post" action="/admin/orders/${order.id}/announce" class="board-push">
           <input type="hidden" name="product" value="${esc(key)}">
           <button class="btn btn-primary btn-sm" type="submit">Push ${fresh} to the customer</button>
         </form>`
      : '';
    return `<section class="board-row" id="${esc(key)}">
      <div class="board-head">
        <h3>Product ${esc(key.slice(1))}</h3>
        <span class="board-count${done === SHOT_KEYS.length ? ' is-full' : ''}">${done}/${SHOT_KEYS.length}</span>
        ${push}
      </div>
      <div class="slots">${SHOT_KEYS.map((sh) => slot(key, sh)).join('')}</div>
    </section>`;
  };

  const board = boardProducts.length
    ? `<p class="muted">${filledSlots} of ${totalSlots} slots filled. Files are saved as you go — the customer sees nothing until you press push.</p>
       ${boardProducts.map(productRow).join('')}`
    : '<p class="muted">This order has no product count on it, so there is no grid to fill. Upload below and map the files by hand.</p>';

  const unmapped = delivery.filter((f) => !f.superseded_at && (!f.product_key || !f.shot)).length;
  const mapForm = delivery.length
    ? `<form method="post" action="/admin/orders/${order.id}/map">
      <table class="files"><thead><tr><th></th><th>Product</th><th>Shot</th><th>File</th><th class="num">Size</th>${showAnnounced ? '<th>Announced</th>' : ''}</tr></thead>
      <tbody>${delivery.map(mapRow).join('')}</tbody></table>
      <div class="controls is-under">
        <button class="btn btn-primary" type="submit">Save mapping</button>
        <span class="muted">Guessed from the filenames — correct what is wrong, then save. Two files on the same product and shot: the newest one wins and the older is marked replaced.</span>
      </div>
    </form>
    ${unmapped
      ? `<p class="warnline">${unmapped} delivered ${unmapped === 1 ? 'file has' : 'files have'} no product or shot yet. Until they do, the customer sees them in a loose pile instead of beside the product they belong to.</p>`
      : ''}`
    : '<p class="muted">Nothing delivered yet.</p>';

  // ?announced= komt van de eigen redirect na het indrukken van de knop. Een
  // vlag in de URL en geen sessiebericht: deze pagina heeft geen state en dit
  // is één regel bevestiging, geen boodschap die een tweede opslagplaats waard
  // is. De waarde wordt als getal gelezen en nooit teruggeschreven.
  const flag = (() => {
    try { return new URL(request.url).searchParams.get('announced'); } catch { return null; }
  })();
  const notedFlag = (() => {
    try { return new URL(request.url).searchParams.get('noted') === '1'; } catch { return false; }
  })();
  const mappedFlag = (() => {
    try { return Number(new URL(request.url).searchParams.get('mapped')) || 0; } catch { return 0; }
  })();
  const flash = flag === 'none'
    ? '<p class="muted">Nothing new to announce — every delivered file on this order has already been mailed.</p>'
    : Number(flag) > 0
      ? `<p class="okline">Mailed. ${Number(flag)} ${Number(flag) === 1 ? 'image' : 'images'} announced to ${esc(order.email || 'the customer')}.</p>`
      : mappedFlag
        ? `<p class="okline">Mapping saved for ${mappedFlag} ${mappedFlag === 1 ? 'file' : 'files'}. The customer&rsquo;s dashboard now groups them per product.</p>`
        : notedFlag
          ? '<p class="okline">Note saved.</p>'
          : '';

  const announce = !migrated
    ? ''
    : !order.delivery_mailed_at
      ? `<p class="muted">This order has never been announced. Set its status to <strong>delivered</strong> on the dashboard — that sends the &ldquo;your order is ready&rdquo; mail.</p>`
      : `
  <p class="muted">
    First announced ${esc(when(order.delivery_mailed_at))}${
      order.redelivery_count
        ? ` &middot; ${order.redelivery_count} re-${order.redelivery_count === 1 ? 'delivery' : 'deliveries'} announced, last ${esc(when(order.redelivery_mailed_at))}`
        : ''}.
  </p>
  ${pending.length
    ? `<form class="controls" method="post" action="/admin/orders/${order.id}/announce">
         <input type="text" name="note" maxlength="${ANNOUNCE_NOTE_MAX}" placeholder="Optional: what changed (goes in the mail and on their timeline)" class="in-grow">
         <button class="btn btn-primary" type="submit">Announce ${pending.length} new ${pending.length === 1 ? 'image' : 'images'}</button>
       </form>
       <p class="muted">One mail for everything that is still unannounced — upload all of it first, then press once.</p>`
    : '<p class="muted">Everything delivered here has been announced.</p>'}
  ${order.delivery_mailed_at ? `
  <hr style="border:0;border-top:1px solid var(--line);margin:1.4rem 0">
  <form method="post" action="/admin/orders/${order.id}/fresh-link" class="controls">
    <button class="btn" type="submit">Mail a fresh portal link</button>
    <span class="muted">For "my link stopped working" — /terms and /privacy promise this. It issues a new link,
      revokes the old one, and announces nothing.</span>
  </form>` : ''}`;

  /* ── TWEE SOORTEN NOTITIES, ZICHTBAAR VERSCHILLEND ──────────────────────────
   *
   * Lucas: *"één notitieveld per bestelling in admin dat de klant óók ziet.
   * Interne notities apart, die de klant nooit ziet — het verschil moet in de
   * kolom zitten, niet in jouw hoofd."*
   *
   * De kolom doet het werk (orders.customer_note tegenover de tabel
   * order_notes, die door geen enkele klantquery wordt aangeraakt), maar het
   * scherm moet dat verschil ook laten zien. Vandaar: het klantveld heeft een
   * groene rand en zegt letterlijk dat de klant meeleest; het interne blok is
   * grijs en zegt letterlijk dat hij dat niet doet. Twee identieke tekstvakken
   * onder elkaar zijn één verkeerde klik van iets wat niet gelezen had mogen
   * worden. */
  const noteBlocks = `
  <h2>Notes</h2>
  <div class="notepanel is-shared">
    <h3>The customer reads this</h3>
    <p class="muted">One standing message on their order page. Not a chat — what is true now, not what was true last week.${
      order.customer_note_at ? ` Last changed ${esc(when(order.customer_note_at))}.` : ''}</p>
    <form method="post" action="/admin/orders/${order.id}/note">
      <textarea name="note" rows="3" maxlength="${CUSTOMER_NOTE_MAX}" placeholder="e.g. The fabric on product 4 came out darker than your photo, so we lifted the exposure a touch.">${esc(order.customer_note || '')}</textarea>
      <div class="controls is-under">
        <button class="btn btn-primary btn-sm" type="submit">Save${order.customer_note ? ' / clear' : ''}</button>
        <span class="muted">Empty saves as no message.</span>
      </div>
    </form>
  </div>

  <div class="notepanel is-internal">
    <h3>Only you see this</h3>
    <form method="post" action="/admin/orders/${order.id}/internal">
      <textarea name="body" rows="2" maxlength="${CUSTOMER_NOTE_MAX}" placeholder="Why this order took an extra round, what to watch for next time, what you agreed on the phone." required></textarea>
      <div class="controls is-under">
        <button class="btn btn-ghost btn-sm" type="submit">Add note</button>
      </div>
    </form>
    ${notes.length
      ? `<ul class="notelog">${notes.map((n) => `<li>
           <span class="notelog-when">${esc(when(n.created_at))}</span>
           <span class="notelog-body">${esc(n.body)}</span>
         </li>`).join('')}</ul>`
      : '<p class="muted">Nothing noted yet.</p>'}
  </div>`;

  /* ── WAT EEN AANVRAAG ZEGT — 13 augustus 2026 ────────────────────────────────
   *
   * De drie diensten zonder afrekenstroom (video, merkmodel, abonnement) posten
   * hun eigen antwoord in details_json: `clips`, `plan`, `request`. Dat kwam tot
   * nu toe alleen in de studiomail terecht — dus als je die mail kwijt was, was
   * het aantal clips waar de klant om vroeg alleen nog met SQL te vinden.
   *
   * Het staat op dezelfde regel als de dienst en de status, want het is precies
   * dat soort feit: wat dit is, niet wat ermee gebeurd is. `clips` mag ook een
   * tekst zijn — de keuzelijst heeft "Weet ik nog niet" als laatste optie, en dat
   * is een antwoord dat je wil zien staan in plaats van een leeg vakje.
   */
  const aanvraagRegel = (() => {
    let d = {};
    try { d = JSON.parse(order.details_json || '{}') || {}; } catch { d = {}; }
    const stukjes = [];
    if (d.clips) stukjes.push(`${esc(String(d.clips))} clips`);
    if (d.plan) stukjes.push(`abonnement ${esc(String(d.plan))}`);
    if (d.request && d.request !== 'video') stukjes.push(`aanvraag: ${esc(String(d.request))}`);
    return stukjes.length ? ` &middot; ${stukjes.join(' &middot; ')}` : '';
  })();

  const body = `
  <p><a href="/admin">&larr; Dashboard</a></p>
  <h1>${esc(order.ref)}</h1>
  <p class="muted">${esc(order.brand || order.name || '')} &middot; ${esc(order.service)} &middot; ${esc(order.status)}${order.product_count ? ` &middot; ${order.product_count} products` : ''}${aanvraagRegel}</p>
  ${flash}

  <h2>Client uploads (${intake.length})</h2>
  ${table(intake, 'Nothing was uploaded with this order.')}

  <h2>The board</h2>
  ${migrated ? board : '<p class="muted">Run migration 0012 to get the per-product board.</p>'}

  <h2>Every delivered file (${delivery.length})</h2>
  ${migrated ? mapForm : table(delivery, 'Nothing delivered yet.', showAnnounced)}

  <!-- ── DE WERKMAP, HEEN EN TERUG — 12 augustus 2026 ────────────────────────
       Lucas: "hernoemen helemaal weg, het moet zoveel mogelijk tijd schelen."

       Twee knoppen die bij elkaar horen en daarom naast elkaar staan. De eerste
       geeft de mapstructuur van DEZE bestelling; de tweede neemt dezelfde map
       gevuld weer aan en leest product en shot uit het PAD. Dat is de reden dat
       er niets hernoemd hoeft te worden — zie src/lib/scaffold.js. -->
  <h2>De werkmap</h2>
  <p class="muted">Download de mappen van deze bestelling, zet je afgewerkte beelden erin
  &mdash; de bestandsnaam maakt niet uit &mdash; en kies daarna de hele map hieronder.
  De server leest uit het pad welk product en welke shot het is, hernoemt het bestand
  naar <code>${esc(order.ref)}-p1-voorkant.jpg</code> en zet het in het juiste vakje.</p>
  <p><a class="btn" href="/admin/orders/${order.id}/scaffold">Mappen downloaden (.zip)</a></p>

  <form class="controls" method="post" action="/admin/orders/${order.id}/deliver" enctype="multipart/form-data">
    <!-- webkitdirectory is geen standaard maar wel wat Chrome, Edge, Firefox en
         Safari allemaal doen: de browser post de hele map en zet het relatieve pad
         in de bestandsnaam. Kent een browser het attribuut niet, dan negeert hij het
         en krijg je een gewone bestandskiezer — dan werkt het nog steeds, alleen valt
         de indeling terug op de gok uit de naam. Geen script nodig, en dat is hier
         een eis: deze pagina draait onder default-src 'none'. -->
    <label>De hele map in één keer
      <input type="file" name="files" webkitdirectory directory multiple required />
    </label>
    <button type="submit">Map uploaden</button>
  </form>

  <h2>Upload the finished work</h2>
  <p class="muted">Losse bestanden, zonder mappen. Files land against this order and appear in the client&rsquo;s portal. Setting the status to <strong>delivered</strong> on the dashboard is what emails them the link &mdash; uploading alone does not.</p>
  <form class="controls" method="post" action="/admin/orders/${order.id}/deliver" enctype="multipart/form-data">
    <input type="file" name="files" multiple required />
    <button type="submit">Upload</button>
  </form>

  <h2>Tell the customer</h2>
  ${announce}

  ${noteBlocks}

  ${vatRow}

  ${factuurBlok}

  ${controleBlok}
  `;
  return html(page({ title: order.ref, body }));
}

/** Langste notitie, aan beide kanten. Een alinea, geen dossier. */
const CUSTOMER_NOTE_MAX = 1200;

/**
 * De mededeling die de klant meeleest.
 *
 * LEEG OPSLAAN MAG, en dat is bewust: een mededeling die niet meer klopt moet
 * weg kunnen zonder omweg. Daarom is dit een UPDATE naar NULL en geen aparte
 * verwijderknop — de knop die hem plaatste is ook de knop die hem weghaalt.
 *
 * GEEN MAIL. Dit is een prikbord bij de bestelling, geen bericht. Wie wil dat
 * de klant het nú leest, gebruikt de meldknop hierboven of pakt de telefoon;
 * een mail per notitiewijziging maakt van elke tikfout een bericht.
 */
async function handleCustomerNote({ request, env }, orderId) {
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const form = await request.formData().catch(() => null);
  const note = String(form?.get('note') || '').trim().slice(0, CUSTOMER_NOTE_MAX);
  try {
    await env.DB.prepare(
      `UPDATE orders SET customer_note = ?2,
                         customer_note_at = CASE WHEN ?2 IS NULL THEN NULL ELSE datetime('now') END
        WHERE id = ?1`
    ).bind(orderId, note || null).run();
  } catch (err) {
    return html(page({ title: 'Admin', body: errorBody(
      `Could not save the note: ${esc(err?.message || String(err))}. Migration 0013 may not have run yet.`
    ) }), 500);
  }
  await logAdmin(env, await currentAdmin({ request, env }), 'order.note', {
    orderId, detail: note ? 'mededeling aan de klant bijgewerkt' : 'mededeling aan de klant gewist',
  });
  return seeOther(`/admin/orders/${orderId}/files?noted=1`);
}

/**
 * Een interne aantekening.
 *
 * Alleen toevoegen, niet bewerken en niet verwijderen. Een logboek waarin je
 * kunt terugschrijven is geen logboek meer, en het enige doel van dit ding is
 * dat over drie maanden nog te lezen is waarom die extra ronde er was.
 */
async function handleInternalNote({ request, env }, orderId) {
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const form = await request.formData().catch(() => null);
  const body = String(form?.get('body') || '').trim().slice(0, CUSTOMER_NOTE_MAX);
  if (!body) return seeOther(`/admin/orders/${orderId}/files`);
  try {
    await env.DB.prepare(
      'INSERT INTO order_notes (order_id, body) VALUES (?1, ?2)'
    ).bind(orderId, body).run();
  } catch (err) {
    return html(page({ title: 'Admin', body: errorBody(
      `Could not save the note: ${esc(err?.message || String(err))}. Migration 0013 may not have run yet.`
    ) }), 500);
  }
  return seeOther(`/admin/orders/${orderId}/files?noted=1`);
}

/**
 * De indeling opslaan: welk beeld hoort bij welk product en welke shot.
 *
 * ÉÉN FORMULIER VOOR DE HELE BESTELLING, want dat is hoe het werk gaat: dertig
 * bestanden komen in één keer binnen en worden in één keer nagelopen. Dertig
 * losse opslaanknoppen zijn dertig kansen om er één te vergeten.
 *
 * ALLES WORDT GECONTROLEERD, OOK AL KOMT HET UIT ONZE EIGEN KEUZELIJST. Een
 * product moet `p<getal>` zijn en een shot moet in SHOTS staan; wat daar niet
 * aan voldoet wordt leeg, niet overgeslagen. Een formulier is een verzoek en
 * geen bewijs, ook als het van deze pagina komt.
 */
const SHOTS = ['front', 'back', 'detail', 'worn'];

async function handleFileMapping({ request, env }, orderId) {
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const form = await request.formData().catch(() => null);
  if (!form) return seeOther(`/admin/orders/${orderId}/files`);

  const { results } = await env.DB.prepare(
    "SELECT id FROM files WHERE order_id = ?1 AND kind = 'delivery'"
  ).bind(orderId).all();
  const mine = new Set((results || []).map((r) => r.id));

  const updates = [];
  for (const [name, raw] of form.entries()) {
    const m = /^([ps])(\d+)$/.exec(name);
    if (!m) continue;
    const fileId = Number(m[2]);
    // Alleen bestanden van DEZE bestelling. Het id komt uit een formulier, dus
    // het is een wens; de set hierboven is het feit.
    if (!mine.has(fileId)) continue;
    if (m[1] === 's') continue;   // shots worden bij het product opgehaald, hieronder

    const product = /^p\d{1,3}$/.test(String(raw)) ? String(raw) : null;
    const shotRaw = String(form.get(`s${fileId}`) || '');
    const shot = SHOTS.includes(shotRaw) ? shotRaw : null;
    updates.push(
      env.DB.prepare('UPDATE files SET product_key = ?2, shot = ?3 WHERE id = ?1 AND order_id = ?4')
        .bind(fileId, product, shot, orderId)
    );
  }
  if (updates.length) await env.DB.batch(updates);

  await resupersede(env, orderId);
  await logAdmin(env, await currentAdmin({ request, env }), 'order.map', {
    orderId, detail: `${updates.length} bestand(en) ingedeeld`,
  });
  return seeOther(`/admin/orders/${orderId}/files?mapped=${updates.length}`);
}

/**
 * Bepaal opnieuw welke leveringen vervangen zijn.
 *
 * DE REGEL: binnen één bestelling is per product+shot het HOOGSTE id het
 * levende beeld en is al het oudere vervangen. Dat is precies wat er na een
 * revisie gebeurt — je uploadt de nieuwe versie van "product 3, achterkant" en
 * de vorige hoort uit het dashboard van de klant te verdwijnen, want daar kan
 * hij niets meer mee.
 *
 * EERST ALLES VRIJGEVEN, DAN OPNIEUW BEPALEN. Zonder die eerste stap is een
 * correctie in de indeling niet terug te draaien: verzet je een bestand per
 * ongeluk naar product 3 en daarna terug naar product 4, dan zou het "vervangen"
 * blijven omdat het stempel al stond. Nu is de uitkomst altijd een functie van
 * wat er nú in de kolommen staat, en niet van de volgorde waarin je het hebt
 * ingevuld.
 *
 * Zacht falen: draait migratie 0012 nog niet, dan bestaat superseded_at niet en
 * blijft alles zoals het was — één beeld meer in beeld is geen ramp, een
 * foutpagina midden in het indelen wel.
 */
async function resupersede(env, orderId) {
  try {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE files SET superseded_at = NULL WHERE order_id = ?1 AND kind = 'delivery'"
      ).bind(orderId),
      env.DB.prepare(
        `UPDATE files SET superseded_at = datetime('now')
          WHERE order_id = ?1 AND kind = 'delivery'
            AND product_key IS NOT NULL AND shot IS NOT NULL
            AND id < (SELECT MAX(f2.id) FROM files f2
                       WHERE f2.order_id = files.order_id AND f2.kind = 'delivery'
                         AND f2.product_key = files.product_key AND f2.shot = files.shot)`
      ).bind(orderId),
    ]);
  } catch (err) {
    console.error('[admin] supersede pass skipped for order', orderId, '—', err?.message || err);
  }
}

/**
 * Stream one file straight out of R2.
 *
 * The id is looked up rather than trusted, and the r2_key is never accepted
 * from the request — the same rule portal.js follows for a client. An admin
 * session is not a reason to let a path travel in a URL.
 */
async function serveAdminFile(context, fileId) {
  const { env } = context;
  if (!Number.isInteger(fileId)) return new Response('Bad id', { status: 400 });
  const row = await env.DB.prepare(
    'SELECT r2_key, filename FROM files WHERE id = ?1'
  ).bind(fileId).first();
  if (!row) return new Response('Not found', { status: 404 });
  if (!env.UPLOADS) return new Response('No bucket binding', { status: 503 });

  const obj = await env.UPLOADS.get(row.r2_key);
  if (!obj) return new Response('The object is not in the bucket', { status: 404 });

  const headers = new Headers();
  if (typeof obj.writeHttpMetadata === 'function') obj.writeHttpMetadata(headers);
  // attachment, not inline: this is a working file being collected, not
  // something to preview in a tab and then have to save again.
  headers.set('Content-Disposition', `attachment; filename="${(row.filename || 'file').replace(/"/g, '')}"`);
  headers.set('Cache-Control', 'private, no-store');
  return new Response(obj.body, { headers });
}

/**
 * The studio's finished files, going the other way.
 *
 * Writes kind='delivery' rows, which is what the client portal reads — see
 * portal.js's serveFile, which filters on exactly that. review_state defaults
 * to 'pending' in the schema, which is the honest starting point: an image
 * nobody has looked at yet is not an approved image.
 */
/* ── WELK PRODUCT, WELKE SHOT — augustus 2026 ─────────────────────────────────
 *
 * Lucas: *"bij het uploaden van een levering per bestand het product kiezen (of
 * afleiden uit de bestandsnaam met bevestiging)."*
 *
 * HET WERD AFLEIDEN MÉT BEVESTIGING, EN DAT IS EEN BEWUSTE KEUZE. Per bestand
 * kiezen vóór het uploaden vraagt om een formulier dat meegroeit met de
 * bestandskiezer, en dat kan niet zonder JavaScript — terwijl /admin net als het
 * klantportaal onder `default-src 'none'` draait en geen script laadt. Dat is
 * geen beperking om omheen te werken maar een eigenschap die deze pagina's
 * veilig en snel houdt.
 *
 * Dus: bij het uploaden wordt er geraden uit de bestandsnaam, en op de
 * bestandenpagina staat daarna één tabel waarin elke rij een keuzelijstje heeft
 * dat al op de gok staat. Klopt de gok — en met een fatsoenlijke exportnaam
 * klopt hij — dan is bevestigen één klik voor de hele bestelling. Klopt hij
 * niet, dan verzet je een lijstje. Dat is sneller dan dertig keer kiezen, en de
 * gok is nooit het laatste woord.
 *
 * WAT HET HERKENT. p3 / product3 / prod-3 / -03- ergens in de naam, en de
 * shotwoorden in beide talen. Er wordt NIETS geraden als er niets staat: leeg
 * blijft leeg, want "niemand heeft het gezegd" is een ander antwoord dan
 * "voorkant" — dezelfde regel die schema.sql bij deze kolom noteert.
 */
const SHOT_WORDS = [
  ['front', /\b(front|voor|voorkant|vk)\b/i],
  ['back', /\b(back|achter|achterkant|ak)\b/i],
  ['detail', /\b(detail|close|closeup|dtl)\b/i],
  ['worn', /\b(worn|model|onmodel|op-?model|lifestyle)\b/i],
];

export function guessProductShot(filename) {
  const base = String(filename || '').replace(/\.[a-z0-9]+$/i, '');
  // Scheidingstekens naar spaties, zodat \b in de shotwoorden werkt op
  // "VOLT_03-achterkant" net zo goed als op "volt 03 achterkant".
  const words = base.replace(/[_\-.]+/g, ' ');

  let product = null;
  const explicit = words.match(/\b(?:p|prod|product)\s*0*(\d{1,3})\b/i);
  if (explicit) product = `p${Number(explicit[1])}`;
  if (!product) {
    // Een los getal telt alleen als het niet het enige in de naam is dat een
    // volgnummer kan zijn. "01" in "VOLT 01 front" is het product; "4471" in
    // een referentie niet — vandaar de bovengrens van drie cijfers.
    const loose = words.match(/\b(\d{1,3})\b/);
    if (loose) product = `p${Number(loose[1])}`;
  }

  let shot = null;
  for (const [key, re] of SHOT_WORDS) {
    if (re.test(words)) { shot = key; break; }
  }
  return { product, shot };
}

async function handleDeliveryUpload({ request, env }, orderId) {
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const order = await env.DB.prepare('SELECT id, ref FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);
  if (!env.UPLOADS) return html(page({ title: 'Admin', body: errorBody('No R2 binding — cannot store files.') }), 503);

  const form = await request.formData().catch(() => null);
  const incoming = form ? form.getAll('files').filter((f) => f && typeof f === 'object' && f.size >= 0) : [];
  if (!incoming.length) return seeOther(`/admin/orders/${orderId}/files`);

  /*
   * IN EEN VAKJE UPLOADEN — augustus 2026.
   *
   * Lucas: *"ik wil de order eerst visueel invullen op het admin account (...)
   * zodat ik er meerdere dagen over kan doen en dan gelijk zie welke nog missen
   * en gedaan moeten worden, met voorkant, achterkant etc. labels erbij."*
   *
   * Komt de upload uit een vakje van het werkbord, dan staan het product en de
   * shot in het formulier en hoeft er niets geraden te worden — dat is per
   * definitie beter dan de beste gok uit een bestandsnaam. Komt hij uit het
   * losse veld onderaan (een stapel in één keer), dan blijft de gok staan en
   * corrigeer je hem in de indeeltabel.
   */
  const slotProduct = /^p\d{1,3}$/.test(String(form.get('product') || '')) ? String(form.get('product')) : null;
  const slotShot = SHOTS.includes(String(form.get('shot') || '')) ? String(form.get('shot')) : null;

  let stored = 0;
  const failed = [];
  /* Bestanden die wél gecontroleerd konden worden en geen herkomsttag bleken te
     dragen. Geen fout — ze zijn opgeslagen — maar wel iets dat je moet weten
     vóórdat je de levering aankondigt. */
  const untagged = [];
  /* Bestanden uit `_aangeleverd/` die zijn overgeslagen. Geen fout, maar het hoort
     op het scherm te komen: "twaalf bestanden opgeslagen" terwijl je er vijftien
     selecteerde is een verschil dat je wil kunnen verklaren. */
  let skippedSource = 0;
  /* En de tekstbestanden die de werkmap zelf uitdeelde. Aparte teller, want het is
     een ander soort overslaan: bronmateriaal is van de klant, dit is van ons. */
  let skippedOwn = 0;

  for (const file of incoming) {
    /*
     * ── HET PAD GAAT VOOR DE NAAM — 12 AUGUSTUS 2026 ─────────────────────────
     *
     * `file.name` is hier niet altijd een bestandsnaam. Kiest de studio een hele
     * MAP (het veld met `webkitdirectory` op de bestandenpagina), dan stuurt de
     * browser het RELATIEVE PAD mee als naam: `VIS-2608-4471/p1 - Hoodie/1
     * voorkant/upscaled_v3.png`. Dat pad is precies de structuur die
     * /admin/orders/:id/scaffold heeft uitgedeeld, dus staat er al in welk product
     * en welke shot dit is -- en hoeft er niets hernoemd of ingedeeld te worden.
     *
     * Dat is de hele opdracht van 12 augustus: *"Heen en terug, hernoemen
     * helemaal weg."* Zie src/lib/scaffold.js.
     *
     * DE VOLGORDE IS EEN RANGORDE EN GEEN VOORKEUR:
     *   1  het vakje van het bord   -- de studio heeft het aangewezen
     *   2  het pad uit de werkmap   -- de structuur die wij zelf uitdeelden
     *   3  de gok uit de naam       -- beter dan niets, en corrigeerbaar
     * Elk niveau is harder bewijs dan het volgende, dus mag een lager niveau een
     * hoger nooit overschrijven.
     */
    const relPath = String(file.name || 'file');
    const clean = relPath.split(/[\\/]/).pop().slice(0, 120) || 'file';

    /* HET BRONMATERIAAL VAN DE KLANT KOMT NIET TERUG ALS LEVERING. Staat de map
       `_aangeleverd/` per ongeluk in de selectie -- en bij "de hele map kiezen" is
       dat precies wat er gebeurt zodra die map ooit gevuld raakt -- dan zou de
       klant zijn eigen telefoonfoto's als afgewerkt beeld terugkrijgen. Stil
       overslaan is hier het juiste: het is geen fout van de studio, het is een map
       die niet mee had gemoeten. */
    if (isSourcePath(relPath)) { skippedSource += 1; continue; }

    /* EN DE WERKBESTANDEN VAN DE WERKMAP ZELF. LEESMIJ.txt en de briefings zijn voor
       de studio geschreven; als levering zouden ze in het portaal van de klant staan.
       Gevonden bij het naspelen van de terugweg -- niet bij het bedenken ervan. */
    if (isScaffoldDoc(relPath)) { skippedOwn += 1; continue; }

    const fromPath = parseScaffoldPath(relPath);
    // De gok gaat meteen mee de rij in. Hij staat daarna als voorselectie in
    // het indeelformulier, dus hij is een voorstel en geen bewering — maar hem
    // hier al opslaan scheelt dertig keuzelijstjes op leeg zetten. Komt de
    // upload uit een vakje van het bord, dan is er niets te raden.
    const guessed = guessProductShot(clean);
    const product = slotProduct || fromPath.product || guessed.product;
    const shot = slotShot || fromPath.shot || guessed.shot;
    /* En de naam die de KLANT straks ziet. Weten we product en shot, dan maken wij
       er `VIS-2608-4471-p1-voorkant.png` van in plaats van `upscaled_v3(2).png`.
       Dat is het tweede stuk van "hernoemen helemaal weg": niet alleen hoeft de
       studio niet te hernoemen, de uitkomst is ook beter dan wanneer hij het met de
       hand had gedaan. Zonder product of shot blijft de aangeleverde naam staan --
       verzinnen wij er dan een, dan liegt hij. */
    const shown = (product && shot)
      ? deliveryFilename(order.ref, product, shot, clean, order.lang)
      : clean;
    // Under delivery/<ref>/ rather than intake/: the two directions are never
    // mixed in the bucket, so a lifecycle rule or a manual clean-up can tell
    // what a customer sent from what we made.
    /*
     * DE SLEUTEL MOET UNIEK ZIJN, EN DAT WAS HIJ NIET — 7 augustus 2026.
     *
     * Hij was `delivery/<ref>/<volgnummer>-<bestandsnaam>`, en dat volgnummer
     * begint bij elke aanvraag opnieuw bij 1. Twee keer "front.jpg" in het vakje
     * van product 1 laten vallen — precies de vervangwerkwijze van het bord —
     * schreef dus twee keer naar `.../001-front.jpg`. Het oude beeld was weg, en
     * de vervangen rij wees vanaf dat moment naar de bytes van zijn eigen
     * opvolger. Twee rijen, één object, en het "ervoor" onherstelbaar.
     *
     * Nu draagt de sleutel waar het beeld hoort (product en shot) plus een
     * willekeurig stukje, zodat een tweede upload naar hetzelfde vakje ernaast
     * komt te staan in plaats van eroverheen. De rij wijst naar zijn eigen
     * object; superseded_at bepaalt wat er getoond wordt, niet de bucket.
     */
    const slotName = [product || null, shot || null].filter(Boolean).join('-');
    const unique = crypto.randomUUID().slice(0, 8);
    const key = `delivery/${order.ref}/${slotName ? `${slotName}-` : ''}${unique}-${clean}`;
    try {
      /*
       * ── DE HERKOMSTTAG NAKIJKEN, 9 AUGUSTUS 2026 ──────────────────────────
       *
       * /ai-act §6 belooft dat elk geleverd bestand een machine-leesbare
       * herkomsttag draagt. scripts/deliver.mjs schrijft die; dit bord is de
       * tweede weg naar de klant en schreef hem niet. Een Worker kan die tag niet
       * schrijven (exiftool is een binair programma) — zie de kop van
       * src/lib/provenance.js voor waarom een eigen writer hier een slecht idee
       * is. Wat wél kan is kijken, en het zeggen.
       *
       * Alleen als het bestand een tag KAN dragen en klein genoeg is om in te
       * kijken. Voor de rest gebeurt er niets: die worden niet gemeld als
       * ongetagd, want er is niet gekeken.
       *
       * Let op de gevolgen voor het geheugen: zodra we kijken, moeten de bytes
       * hier staan, dus gaat de buffer naar R2 in plaats van de stream. Dat is de
       * ruil, en hij is bewust begrensd op MAX_SCAN_BYTES.
       */
      let body = file.stream();
      if (isScannable(clean, file.size)) {
        const bytes = await file.arrayBuffer();
        if (!hasProvenanceTag(bytes)) untagged.push(clean);
        body = bytes;
      }

      await env.UPLOADS.put(key, body, {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });

      await env.DB.prepare(
        `INSERT INTO files (order_id, kind, r2_key, filename, bytes, product_key, shot)
         VALUES (?1, 'delivery', ?2, ?3, ?4, ?5, ?6)`
        /* `shown` en niet `clean`: dit is de naam die de klant in zijn portaal
           leest en in zijn download terugvindt. De R2-sleutel houdt de ruwe naam
           erin, dus het spoor terug naar het bestand op de machine van de studio
           blijft bestaan -- die twee dingen hebben verschillende lezers. */
      ).bind(orderId, key, shown, file.size ?? null, product, shot).run();
      stored++;
    } catch (err) {
      failed.push(`${clean}: ${err && err.message ? err.message : 'failed'}`);
    }
  }

  if (failed.length) {
    return html(page({
      title: 'Upload',
      body: errorBody(`${stored} stored, ${failed.length} failed:<br>${failed.map(esc).join('<br>')}`),
    }), 500);
  }
  /*
   * ── ELKE UPLOAD, EN NIET ALLEEN DIE UIT EEN VAKJE — 14 AUGUSTUS 2026 ───────
   *
   * Een upload in een gevulde plek is een vervanging, en dat moet meteen kloppen:
   * anders staan er twee beelden voor dezelfde plek in het dashboard van de klant.
   *
   * DE CONDITIE HIER WAS `slotProduct && slotShot`, EN DAT IS PRECIES ÉÉN VAN DE
   * TWEE MANIEREN WAAROP HIER GELEVERD WORDT. Het formulier "Map uploaden" post
   * geen product en geen shot — die haalt parseScaffoldPath() uit het pad, en de
   * rijen gaan volledig gemapt de database in. Dus draaide resupersede() niet, en
   * bleef het AFGEKEURDE beeld naast zijn vervanging staan.
   *
   * Wat dat oplevert: de klant ziet beide beelden in het portaal en krijgt ze
   * beide in zijn zip (alles daar filtert op `superseded_at IS NULL`). Het
   * revisieverzoek blijft open, want closeReplacedRevisions() heeft juist
   * `superseded_at IS NOT NULL` nodig. En maybeCloseOrder() eist approved ===
   * live, dus de bestelling sluit nooit — geen retentiestempel, geen
   * tevredenheidsvraag. De klant kán het losbreken door zijn revisieverzoek in te
   * trekken en het beeld goed te keuren dat hij net had afgewezen.
   *
   * En de studio ziet er niets van: liveByKey() houdt op het bord alleen de
   * hoogste id per product+shot over, dus daar staat één beeld waar de klant er
   * twee ziet.
   *
   * resupersede() werkt per BESTELLING en niet per vakje, dus hij kan gewoon
   * altijd draaien. De enige voorwaarde die overblijft is dat er iets is
   * weggeschreven om te vervangen.
   */
  if (stored) await resupersede(env, orderId);

  /*
   * ── DE WAARSCHUWING OVER DE HERKOMSTTAG ─────────────────────────────────────
   *
   * GEEN FOUT EN GEEN 500. De bestanden staan in R2 en de rijen staan in de
   * database; de upload is gelukt. Wat er mist is de tag die /ai-act §6 belooft, en
   * dat is iets om te weten vóórdat je op "aankondigen" drukt — daarna staat het
   * bestand bij de klant.
   *
   * OOK GEEN BLOKKADE. Een Worker kan die tag niet schrijven, dus tegenhouden zou
   * betekenen dat je een levering niet kunt doen die je wel moet doen. De keuze is
   * aan jou: taggen via het script, of bewust doorgaan.
   *
   * De pagina noemt het commando, want een waarschuwing zonder de volgende stap
   * erin is een waarschuwing die je de tweede keer wegklikt.
   */
  const heavy = await portalWeight(env, orderId);

  if (untagged.length || heavy) {
    const tagBlock = untagged.length ? `
        <h2>Geen herkomsttag</h2>
        <p>Deze bestanden staan klaar, maar er zit geen IPTC <code>DigitalSourceType</code> in:</p>
        <ul>${untagged.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
        <p>/ai-act §6 belooft dat elk geleverd bestand die tag draagt. Dit scherm kan
        hem niet schrijven — dat doet <code>exiftool</code>, en dat draait niet in een
        Worker.</p>` : '';

    const weightBlock = heavy ? `
        <h2>Geen beoordeelbeeld — de portaalpagina weegt ${heavy.mb} MB</h2>
        <p>${heavy.n} van de ${heavy.total} geleverde beelden hebben geen verkleinde
        versie, dus het portaal en VISUAILS Studio serveren het volledige bestand.
        Samen is dat <strong>${heavy.mb} MB op één pagina</strong>. Op een telefoon is
        dat niet langzaam maar stuk.</p>
        <p>Dit scherm kan die verkleining niet maken — daar is een beeldbibliotheek voor
        nodig die niet in een Worker draait. <code>npm run deliver</code> maakt hem wel,
        en vult <code>preview_key</code>.</p>` : '';

    /* Het verschil tussen wat hij selecteerde en wat er staat, in één regel. Zonder
       dit staat er "twaalf bestanden opgeslagen" terwijl hij er vijftien aanwees, en
       dan gaat hij zoeken naar drie bestanden die met opzet zijn overgeslagen. */
    const sourceBlock = (skippedSource || skippedOwn) ? `<p class="muted">${
      [skippedSource ? `${skippedSource} uit <code>_aangeleverd/</code> (materiaal van de klant)` : '',
       skippedOwn ? `${skippedOwn} werkbestand${skippedOwn === 1 ? '' : 'en'} van de werkmap (leesmij, briefing, licentie)` : '']
        .filter(Boolean).join(' en ')
    } overgeslagen — die horen niet als levering bij de klant.</p>` : '';

    return html(page({
      title: untagged.length && heavy ? 'Upload — twee dingen om te weten'
        : untagged.length ? 'Upload — geen herkomsttag' : 'Upload — geen beoordeelbeeld',
      body: `<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
        <h1>${stored} bestand${stored === 1 ? '' : 'en'} opgeslagen</h1>
        ${sourceBlock}${tagBlock}${weightBlock}
        <h2>Zo zet je het recht</h2>
        <p><strong>Lever via het script:</strong> <code>npm run deliver -- ${esc(order.ref)} ./de-map --go</code>
        — dat maakt png, jpg en webp, maakt het beoordeelbeeld, tagt alles en zet het er
        in één keer op.${untagged.length ? `<br><strong>Of tag alleen de map en upload opnieuw:</strong> <code>npm run tag:delivery -- ./de-map</code>` : ''}</p>
        <p>Doorgaan mag: de bestanden staan in R2 en de klant ziet ze. Er is nog geen
        mail uit — dat gebeurt pas bij aankondigen.</p>
        <p><a class="btn" href="/admin/orders/${orderId}/files">Verder naar de bestanden</a></p>`,
    }));
  }

  /* Is er niets te waarschuwen maar wel iets overgeslagen, dan mag dat niet in een
     redirect verdwijnen. Zonder deze tak zou "vijftien geselecteerd, twaalf
     opgeslagen" een verschil zijn dat nergens wordt uitgelegd. */
  if (skippedSource || skippedOwn) {
    return html(page({
      title: 'Upload — een paar bestanden overgeslagen',
      body: `<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
        <h1>${stored} bestand${stored === 1 ? '' : 'en'} opgeslagen</h1>
        ${skippedSource ? `<p>${skippedSource} bestand${skippedSource === 1 ? '' : 'en'} uit
        <code>_aangeleverd/</code> ${skippedSource === 1 ? 'is' : 'zijn'} overgeslagen. Die map bevat
        wat de klant heeft aangeleverd; die hoort niet als levering terug.</p>` : ''}
        ${skippedOwn ? `<p>${skippedOwn} werkbestand${skippedOwn === 1 ? '' : 'en'} van de werkmap
        ${skippedOwn === 1 ? 'is' : 'zijn'} overgeslagen: LEESMIJ.txt, de briefings en LICENTIE.txt zijn
        voor jou geschreven en niet voor het portaal van de klant.</p>` : ''}
        <p><a class="btn" href="/admin/orders/${orderId}/files">Verder naar de bestanden</a></p>`,
    }));
  }

  return seeOther(`/admin/orders/${orderId}/files${slotProduct ? `#${slotProduct}` : ''}`);
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * WEEGT DE PORTAALPAGINA VAN DEZE BESTELLING TE VEEL?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT DE METING OP 10 AUGUSTUS 2026 LIET ZIEN ─────────────────────────────
 *
 * De eerste volledige back-up gaf een inventaris van alle 33 bestanden in productie.
 * Daarin: `preview_key` is NULL op alle vijftien geleverde beelden, en drie afgeleverde
 * bestellingen wegen 33,1 / 24,6 / 18,4 MB aan volledige PNG's. Alle drie zijn
 * testbestellingen op een eigen adres, dus er heeft geen klant onder geleden — maar de
 * oorzaak is niet oud en niet weg.
 *
 * Er zijn TWEE wegen naar de klant. scripts/deliver.mjs maakt varianten én een
 * beoordeelbeeld en vult `preview_key`. Dit bord — de INSERT een paar honderd regels
 * hierboven — noemt die kolom niet, dus blijft hij NULL. En portal.js, account.js en
 * delivery.js lezen alle drie `preview_key || r2_key`: die terugval is precies zoals
 * bedoeld, maar hij betekent dat een levering via dit scherm het volledige bestand naar
 * een telefoon stuurt. Het commentaar bij die kolom in schema.sql zegt het zelf:
 * *"served at delivery resolution that page is hundreds of megabytes, which on a phone
 * is not slow, it is broken."*
 *
 * ── WAAROM EEN GRENS EN GEEN WAARSCHUWING BIJ ELKE UPLOAD ──────────────────
 *
 * Elke upload via dit bord levert een NULL op. Zou de melding daarop afgaan, dan komt
 * hij altijd — en een waarschuwing die altijd komt, is een knop die je wegklikt. Precies
 * wat er bij de herkomsttag hierboven al over staat.
 *
 * Dus meet het gevolg in plaats van de oorzaak: hoeveel weegt de pagina die de klant
 * opent? Onder de grens is het geen probleem en zwijgt het scherm. Erboven staat er een
 * getal, en een getal is geen nag.
 *
 * ── DE GRENS ────────────────────────────────────────────────────────────────
 *
 * 8 MB. Vier beelden van 2 MB haalt een telefoon op 4G binnen een paar seconden; de
 * 33 MB die hier gemeten is, niet. Het is een grens en geen wet: hij mag verschuiven
 * zodra er echte cijfers uit het portaal komen. Wat niet mag is hem weghalen, want dan
 * is het weer onzichtbaar.
 *
 * Alleen levende beelden (`superseded_at IS NULL`), want een vervangen beeld wordt niet
 * getoond en weegt dus niets voor de klant. Faalt de query, dan is er geen melding en
 * geen fout: het is een controle bovenop een geslaagde upload, geen deel ervan.
 */
const PORTAL_WEIGHT_WARN = 8 * 1024 * 1024;

async function portalWeight(env, orderId) {
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN preview_key IS NULL THEN 1 ELSE 0 END) AS zonder,
              SUM(CASE WHEN preview_key IS NULL THEN COALESCE(bytes, 0) ELSE 0 END) AS bytes
         FROM files
        WHERE order_id = ?1 AND kind = 'delivery' AND superseded_at IS NULL`
    ).bind(orderId).first();
    const bytes = Number(row?.bytes || 0);
    if (!Number(row?.zonder) || bytes < PORTAL_WEIGHT_WARN) return null;
    return { n: Number(row.zonder), total: Number(row.total), mb: (bytes / 1024 / 1024).toFixed(1) };
  } catch {
    return null;
  }
}

/**
 * The delivery email, sent when — and only when — an order becomes delivered.
 *
 * Lucas: "als ik een bestelling op geleverd zet [wil ik dat] de klant een mail
 * krijgt met deze info en een link naar zijn portaal waar hij ze kan
 * downloaden."
 *
 * A FRESH TOKEN IS MINTED rather than reusing the one from the confirmation.
 * Only the hash of that first token was ever stored (src/lib/token.js), so the
 * original cannot be recovered — by design. Minting a second one is not a
 * workaround for that, it is the correct behaviour: the delivery mail is the
 * link people actually keep, and issuing it fresh means a confirmation
 * forwarded to a colleague months ago is not the key to the finished work.
 *
 * delivery_mailed_at is what stops a second send. Setting a status to delivered
 * twice is a thing that happens — a mis-click, a correction, a second admin —
 * and a customer receiving "your order is ready" twice reads as a mistake in
 * the studio rather than in the software.
 */
async function sendDeliveryMail(context, orderId) {
  const { request, env } = context;
  const order = await env.DB.prepare(
    `SELECT id, ref, email, name, lang, delivery_mailed_at FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!order || !order.email) return;
  if (order.delivery_mailed_at) return;

  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM files WHERE order_id = ?1 AND kind = 'delivery'"
  ).bind(orderId).first();
  const n = Number(count?.n || 0);

  const origin = (() => {
    try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; }
  })();

  // ── REVOKE, THEN MINT. THIS ORDER CAN ONLY HAVE ONE LIVE TOKEN ─────────────
  //
  // This used to be a bare INSERT, and it meant the delivery mail NEVER WENT
  // OUT — not once, for any order. schema.sql:275 declares
  //
  //   CREATE UNIQUE INDEX idx_order_tokens_live
  //     ON order_tokens(order_id) WHERE revoked_at IS NULL
  //
  // and functions/api/order.js:379 already inserted a live token for this order
  // the moment it was placed. So the second insert hit "UNIQUE constraint
  // failed: order_tokens.order_id" and threw. handleStatusUpdate calls this
  // inside .catch(console.error) — deliberately, so a mail failure cannot turn
  // a successful status change into an error page — which meant the throw was
  // swallowed, delivered_at was already written, the dashboard showed success,
  // and the customer was simply never told their images were ready. Reproduced
  // against SQLite before this was changed.
  //
  // The fix is the one the schema was clearly built for: `revoked_at` exists,
  // portal.js:306 already renders a "this link has been replaced" page for a
  // token that has it, and nothing in the codebase had ever written it — a
  // column and a page waiting for the call that is now here.
  //
  // ONE batch, so the revoke and the insert cannot land apart. If they did, the
  // order would be left with either two live tokens (impossible — the index
  // refuses it) or none at all, and none means the customer's confirmation link
  // dies without a replacement being mailed.
  //
  // WHAT THE CUSTOMER SEES. The link in their confirmation email stops working
  // and the new one, in the mail below, takes over. That is a real cost — the
  // confirmation mail invites them to forward it to a colleague — and it is the
  // trade the one-live-token rule already chose. The replacement page names the
  // situation rather than 404ing, and the delivery mail goes to the same address
  // moments later.
  const link = await freshPortalLink(env, orderId, origin);

  const nl = order.lang === 'nl';
  const body = deliveryEmail({ order, link, n });

  await sendMail(env, {
    to: order.email,
    subject: nl ? `Je bestelling staat klaar — ${order.ref}` : `Your order is ready — ${order.ref}`,
    html: body,
  });

  await env.DB.prepare(
    "UPDATE orders SET delivery_mailed_at = datetime('now') WHERE id = ?1"
  ).bind(orderId).run();
  // Elk beeld dat in deze mail zit, is vanaf nu aangekondigd. Dit is wat de
  // herleverknop later leeg of vol maakt — zie markAnnounced()'s noot.
  await markAnnounced(env, orderId);
}

/**
 * Eén levend token per bestelling: het oude intrekken en meteen een nieuw
 * uitgeven, in één batch.
 *
 * Stond eerst als losse regels in sendDeliveryMail(). Nu de herleveringsmail
 * dezelfde link nodig heeft, moest dit één functie worden — want de valkuil
 * hierboven (een tweede INSERT die op de unieke index stukloopt en de mail in
 * stilte laat verdampen) is precies het soort ding dat je bij het overtypen
 * half meeneemt.
 */
async function freshPortalLink(env, orderId, origin) {
  const token = mintToken();
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE order_tokens SET revoked_at = datetime('now') WHERE order_id = ?1 AND revoked_at IS NULL"
    ).bind(orderId),
    env.DB.prepare('INSERT INTO order_tokens (order_id, token_hash) VALUES (?1, ?2)')
      .bind(orderId, await hashToken(token)),
  ]);
  return portalUrl(token, origin);
}

/*
 * ══════════════════════════════════════════════════════════════════════════════
 * "MAIL ONS EN WE STUREN EEN NIEUWE LINK" — 23 AUGUSTUS 2026
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ── DE BELOFTE, EN WAAROM NIEMAND HEM KON NAKOMEN ───────────────────────────
 *
 * /privacy en /terms zeggen het allebei, in beide talen: *"is je link verlopen,
 * mail ons dan — we sturen je een nieuwe."* De link leeft 90 dagen; het
 * opgeleverde werk twaalf maanden. Precies in dat gat van negen maanden is de
 * klant aangewezen op deze belofte.
 *
 * `freshPortalLink()` bestond en deed precies het goede — oude token intrekken,
 * nieuwe uitgeven, in één batch. Maar hij had twee aanroepers, en allebei zitten
 * ze achter een poort die NIEUWE BESTANDEN vereist: sendDeliveryMail() draait bij
 * een statuswissel, en de herleveringsknop stopt bij `if (!tally.files) return`.
 * Een klant die na vier maanden mailt, heeft per definitie geen nieuwe bestanden
 * — dus was er geen enkele route, en het antwoord op zijn mail was handwerk in
 * de database of niets.
 *
 * De knop op de klantpagina die er wél was, stuurt een ACCOUNT-inloglink. Dat is
 * iets anders: die geeft toegang tot VISUAILS Studio en niet tot het portaal van
 * één bestelling, en een klant die nooit een account heeft aangemaakt heeft er
 * niets aan.
 *
 * ── WAT DEZE KNOP NIET DOET ─────────────────────────────────────────────────
 *
 * Hij kondigt niets aan. `redelivery_count` gaat niet omhoog, `announced_at`
 * wordt niet gestempeld, en de mail zegt niet dat er iets nieuws is — want er is
 * niets nieuws. Dat onderscheid is de hele reden dat dit een eigen route is en
 * geen tweede knop op /announce: een mail die "nieuwe beelden" zegt terwijl er
 * niets nieuws is, is precies het soort bericht dat een klant één keer opent en
 * daarna niet meer vertrouwt.
 *
 * Hij trekt de oude link WEL in, en dat staat in de mail. Eén levend token per
 * bestelling is de regel van het schema; dat stilzwijgend laten gebeuren is hoe
 * je iemand laat denken dat er iets stuk is.
 */
/*
 * ═══════════════════════════════════════════════════════════════════════════
 * HET UNICITEITSLOGBOEK VAN EEN MERKMODEL — 23 AUGUSTUS 2026
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── WAT HIER WORDT VASTGELEGD, EN WAAROM DAT GEEN ADMINISTRATIE IS ─────────
 *
 * Op /custom-models en in de voorwaarden staat een belofte: blijkt een merkmodel
 * toch op een bestaand mens te lijken, dan wisselen wij alle bestelde content om
 * op onze kosten. Dat is een garantie, en een garantie zonder logboek is een
 * zin. Bij een claim — over een half jaar, met een advocaat erbij — is de vraag
 * niet wat we nu weten maar wat we tóen wisten: welke zoekmachines zijn er
 * gedraaid, op welke dag, met welke uitslag, en wie heeft dat gedaan.
 *
 * src/data/modelChecks.js houdt precies dat bij voor de tien gezichten van de
 * vaste roster, en zegt in zijn eigen kop dat een merkmodel "bij de levering
 * gecontroleerd hoort te worden en op de order te worden vastgelegd". Dit is
 * die vastlegging. De WOORDEN — welke machines er zijn, welke uitkomsten er
 * bestaan, wanneer een vastlegging compleet is — komen daarvandaan en worden
 * hier niet opnieuw bedacht.
 *
 * ── DRIE WEIGERINGEN, EN ALLE DRIE OM DEZELFDE REDEN ──────────────────────
 *
 * Dit is het enige adminscherm in dit bestand dat WEIGERT op onvolledigheid in
 * plaats van op te slaan wat er staat. Elders is dat verkeerd: een halve notitie
 * is beter dan geen notitie. Hier niet, want dit is geen notitie maar bewijs, en
 * een half bewijsstuk is in een geschil erger dan een leeg veld — het suggereert
 * dat er iets gecontroleerd is.
 *
 *   1  Zonder DATUM is er geen moment waarop het gebeurd is.
 *   2  Zonder alle GEZICHTSZOEKERS is de vraag niet beantwoord. Dat is dezelfde
 *      eis die rosterVolledigGecontroleerd() aan een gratis catalogusgezicht
 *      stelt; van een merkmodel van € 450 met een omruilbelofte eromheen minder
 *      vragen zou de verkeerde kant op zijn.
 *   3  Zonder NAAM is het een gerucht. Die formulering komt uit modelChecks.js
 *      en geldt hier woord voor woord.
 *
 * ── EN EEN TREFFER WORDT OPGESLAGEN, NIET TEGENGEHOUDEN ───────────────────
 *
 * `treffer` is een geldige uitkomst. Het is het geval waarvoor dit logboek
 * bestaat: er is iets gevonden, en dan wil je juist dat het opgeschreven staat —
 * met in de notitie wat er gevonden is en wat ermee gedaan is. Een scherm dat
 * alleen goed nieuws aanneemt, is een scherm dat je bij slecht nieuws omzeilt.
 */
async function handleModelCheck(context, orderId) {
  const { request, env } = context;

  const order = await env.DB.prepare(
    'SELECT id, ref, service, status FROM orders WHERE id = ?1'
  ).bind(orderId).first().catch(() => null);
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  /* Alleen op een merkmodel. Op een catalogusbestelling zou dit veld iets
     vastleggen over een gezicht dat uit de vaste roster komt en daar zijn eigen
     regel al heeft — twee logboeken over hetzelfde gezicht is precies hoe er
     later twee verschillende antwoorden op één vraag bestaan. */
  if (order.service !== 'brand-model') {
    return html(page({ title: 'Admin', body: errorBody(
      'This is not a Brand Model order. The uniqueness log for the standard roster lives in '
      + '<code>src/data/modelChecks.js</code>, not on an order.'
    ) }), 400);
  }

  const form = await request.formData().catch(() => null);
  const datum = String(form?.get('checked_at') || '').trim().slice(0, 10);
  const uitkomst = String(form?.get('result') || '').trim();
  const door = String(form?.get('by') || '').trim().slice(0, 80);
  const notitie = String(form?.get('note') || '').trim().slice(0, 1000);
  /* Alleen id's die ENGINES kent. Een naam die daar niet in staat, staat straks
     in een kolom die zegt dat er iets gedraaid is wat niet bestaat. */
  const gekozen = form
    ? form.getAll('engines').map((x) => String(x)).filter((id) => ENGINES.some((e) => e.id === id))
    : [];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
    return html(page({ title: 'Admin', body: errorBody(
      'A check needs the date it was run on, as YYYY-MM-DD. Without a date there is no moment to point at.'
    ) }), 400);
  }
  if (!UITKOMSTEN.includes(uitkomst)) {
    return html(page({ title: 'Admin', body: errorBody('Pick an outcome: no match, or a match.') }), 400);
  }
  if (!door) {
    return html(page({ title: 'Admin', body: errorBody(
      'Put a name on it. A log without a name is hearsay &mdash; the wording is from '
      + '<code>src/data/modelChecks.js</code> and it means it.'
    ) }), 400);
  }
  const ontbreekt = GEZICHTSZOEKERS.filter((e) => !gekozen.includes(e.id));
  if (ontbreekt.length) {
    return html(page({ title: 'Admin', body: errorBody(
      `Every face search has to be run before this can be recorded: ${
        esc(ontbreekt.map((e) => e.naam).join(', '))} ${ontbreekt.length === 1 ? 'is' : 'are'} missing. `
      + 'The file searches are optional; the face searches are the question.'
    ) }), 400);
  }

  const engines = gekozen.join(',');
  const geschreven = await env.DB.prepare(
    `UPDATE orders SET model_check_at = ?2, model_check_engines = ?3,
            model_check_result = ?4, model_check_by = ?5, model_check_note = ?6
       WHERE id = ?1`
  ).bind(orderId, datum, engines, uitkomst, door, notitie || null).run().catch((err) => {
    console.error('[admin] uniciteitslogboek niet weggeschreven —', order.ref, '—', err?.message || err);
    return null;
  });

  /* GEEN STILLE MISLUKKING. Draait migratie 0033 nog niet, dan gooit D1 hier
     "no such column" — en dan hoort er een foutmelding op het scherm te komen en
     niet een bevestiging dat het bewijsstuk vastligt. Dat is de fout die dit
     bestand op 7 augustus op drie andere plekken heeft rechtgezet. */
  if (!geschreven) {
    return html(page({ title: 'Admin', body: errorBody(
      'That did not save. If this database has not had migration 0033 yet, the columns do not exist here.'
    ) }), 500);
  }

  /* Op de tijdlijn, want een hercontrole overschrijft de kolommen en dan is dit
     het enige spoor dat er een eerdere ronde was. `order_events` is bovendien de
     tijdlijn die de klant ziet: dat is met opzet — er valt aan een gedraaide
     controle niets te verbergen, en dit is precies wat er beloofd is. */
  await env.DB.prepare(
    "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'admin')"
  ).bind(orderId, order.status || 'in-progress',
    uitkomst === 'treffer'
      ? `Uniqueness check run on ${datum}: a match was found. See the note on the order.`
      : `Uniqueness check run on ${datum}: no match across ${gekozen.length} searches.`)
    .run().catch(() => {});

  await logAdmin(env, await currentAdmin(context), 'order.model_check', { orderId, detail: `${order.ref} — ${uitkomst}` });

  return seeOther(`/admin/orders/${orderId}/files?check=saved`);
}

async function handleFreshLink(context, orderId) {
  const { request, env } = context;

  const order = await env.DB.prepare(
    'SELECT id, ref, email, name, lang, status, delivery_mailed_at FROM orders WHERE id = ?1'
  ).bind(orderId).first().catch(() => null);
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  if (!order.email) {
    return html(page({ title: 'Admin', body: errorBody(
      'This order has no email address on it, so there is nowhere to send a link.'
    ) }), 400);
  }

  /* NOOIT AANGEKONDIGD IS GEEN GELDIG GEVAL. Het portaal van een bestelling die
     de klant nog nooit gezien heeft, is leeg — en een link ernaartoe sturen zonder
     dat er ooit een "je bestelling staat klaar" is geweest, is een mail over iets
     waarvan de klant het bestaan niet kent. Zelfde controle en dezelfde reden als
     bij de herleveringsknop. */
  if (!order.delivery_mailed_at) {
    return html(page({ title: 'Admin', body: errorBody(
      'This order has never been announced, so its portal is empty. Set its status to '
      + '<strong>delivered</strong> first — that sends the "your order is ready" mail and its link.'
    ) }), 400);
  }

  const origin = (() => {
    try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; }
  })();
  const link = await freshPortalLink(env, orderId, origin);

  const nl = order.lang === 'nl';
  try {
    await sendMail(env, {
      to: order.email,
      subject: nl ? `Je nieuwe link — ${order.ref}` : `Your new link — ${order.ref}`,
      html: freshLinkEmail({ order, link }),
    });
  } catch (err) {
    /* HIER WORDT WÉL GEWACHT EN WÉL GETOOND, om dezelfde reden als bij de
       herleveringsknop: deze knop doet niets ánders dan mailen. Faalt de mail,
       dan is er niets gebeurd, en dat hoort op het scherm te staan in plaats van
       in een console die niemand opent.

       Het oude token is dan al ingetrokken. Dat is geen ongeluk maar de veilige
       kant: een klant die zijn oude link nog had, kan hem hierna niet meer
       gebruiken, en dat is beter dan twee levende links waarvan er één per mail
       is rondgestuurd die niet aankwam. Nog een keer drukken maakt gewoon een
       nieuwe. */
    return html(page({ title: 'Admin', body: errorBody(
      `The link was issued but the mail did not go out: ${esc(err && err.message ? err.message : String(err))}. `
      + 'The previous link is no longer valid. Press again to issue and send another.'
    ) }), 502);
  }

  /* OP DE TIJDLIJN DIE DE KLANT ZIET, en dat is met opzet. Hij heeft erom
     gevraagd en hij krijgt hem: dat mag hij terugzien, en het is meteen het
     antwoord op "heb ik die mail nou gekregen of niet". Geen aparte
     admin-notitie, want er valt niets te verbergen. */
  await env.DB.prepare(
    "INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'admin')"
  ).bind(orderId, order.status || 'delivered', nl
    ? 'Nieuwe link naar je bestelling gemaild. De vorige link werkt niet meer.'
    : 'A new link to your order was emailed. The previous link no longer works.')
    .run().catch(() => {});

  await logAdmin(env, await currentAdmin(context), 'order.fresh_link', { orderId, detail: order.ref });

  return seeOther(`/admin/orders/${orderId}/files?link=sent`);
}

/**
 * De mail bij die knop.
 *
 * KORT, EN HIJ BELOOFT NIETS NIEUWS. Dit is het antwoord op "mijn link doet het
 * niet meer" en verder niets: hier is je link, hij vervangt de vorige, en dit is
 * hoe lang je erbij kunt. Dat laatste komt uit retention.js en wordt niet
 * ingetypt — zie de noot bij UPLOAD_DAYS daar, en dezelfde afspraak als in
 * terms.astro.
 */
export function freshLinkEmail({ order, link }) {
  const nl = order.lang === 'nl';
  const hi = mailGreeting(order.name, order.lang);
  return mailShell({
    lang: nl ? 'nl' : 'en',
    preheader: nl
      ? `Je nieuwe link naar bestelling ${order.ref}.`
      : `Your new link to order ${order.ref}.`,
    body: [
      mailH1(
        nl ? 'Hier is je nieuwe link' : 'Here is your new link',
        nl ? `Referentie ${esc(order.ref)}` : `Reference ${esc(order.ref)}`,
      ),
      mailP(hi),
      mailP(nl
        ? 'Je vroeg om een nieuwe link naar je bestelling. Hieronder staat hij. Er is niets veranderd aan je beelden — dit is dezelfde bestelling, met een werkende ingang.'
        : 'You asked for a new link to your order. Here it is. Nothing about your images has changed — this is the same order, with a working way in.'),
      mailButton(link, nl ? 'Open je bestelling' : 'Open your order'),
      '<div style="height:22px;font-size:0;line-height:0">&nbsp;</div>',
      mailNote(nl
        ? `Deze link vervangt de vorige — gebruik vanaf nu deze. Je opgeleverde beelden blijven ${DELIVERY_MONTHS} maanden bij ons staan; download ze gerust nog een keer.<br><span style="color:#8A8F98;word-break:break-all">${esc(link)}</span>`
        : `This link replaces the previous one — use this from now on. Your delivered images stay with us for ${DELIVERY_MONTHS} months; download them again whenever you like.<br><span style="color:#8A8F98;word-break:break-all">${esc(link)}</span>`),
      '<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>',
      mailSpamNote(nl ? 'nl' : 'en'),
    ].join(''),
  });
}

/**
 * Stempel elk nog niet aangekondigd geleverd bestand van deze bestelling.
 *
 * WAAROM EEN STEMPEL PER BESTAND EN NIET EEN DATUM OP DE BESTELLING. De vraag
 * die de knop stelt is "wat heeft deze klant nog nooit aangekondigd gezien", en
 * dat is een eigenschap van een bestand. Met alleen datums op de bestelling
 * moet je created_at tegen mailed_at afzetten, en die vergelijking gaat mis op
 * het enige moment dat telt: een upload in dezelfde seconde als de mail.
 *
 * ZACHT FALEN, EXPRES. Draait de code al en migratie 0011 nog niet, dan bestaat
 * files.announced_at niet en gooit dit. Dat mag de mail die net verstuurd is
 * niet ongedaan maken — die is de deur al uit. Dus wordt het gelogd en gaat het
 * verder; het gevolg is hooguit dat de knop nog een keer werk aanbiedt dat al
 * gemeld is, en dat is te overzien tegenover een 500 na een geslaagde mail.
 */
async function markAnnounced(env, orderId, product = null) {
  try {
    await env.DB.prepare(
      `UPDATE files SET announced_at = datetime('now')
        WHERE order_id = ?1 AND kind = 'delivery' AND announced_at IS NULL
          AND superseded_at IS NULL
          AND (?2 IS NULL OR product_key = ?2)`
    ).bind(orderId, product).run();
    /*
     * ── EN METEEN DE BEWAARTERMIJN, 9 AUGUSTUS 2026 ────────────────────────
     *
     * /privacy §6 belooft dat geleverde visuals 12 maanden na LEVERING bewaard
     * blijven. Aankondigen is dat moment: hier gaat de mail met de link uit. Niet
     * bij het afsluiten van de bestelling — daartussen kan een maand
     * goedkeuringswerk zitten, en dan zou de klant meer krijgen dan de tekst zegt.
     *
     * In dezelfde functie en niet in een eigen stap, want de twee horen bij
     * elkaar: `announced_at` is de datum waar deze termijn vanaf loopt, en twee
     * losse paden zouden een beeld kunnen aankondigen zonder klok.
     */
    await stampDeliveryRetention(env, orderId).run();
  } catch (err) {
    console.error('[admin] announced_at not stamped for order', orderId, '—', err?.message || err);
  }
}

/**
 * Sluit de revisieaanvragen waarvan het beeld inmiddels vervangen is.
 *
 * ALLEEN DIE. Een aanvraag afvinken omdat er íets nieuws de deur uit gaat, zou
 * de aanvraag sluiten waar nog niets mee gedaan is — en dat is precies de
 * stilte die we vandaag aan het repareren zijn, alleen dan met een vinkje
 * eroverheen. `superseded_at IS NOT NULL` is het bewijs dat er een nieuw beeld
 * voor dezelfde product+shot ligt; zonder dat bewijs blijft de aanvraag open en
 * blijft de amberkleurige markering staan.
 */
async function closeReplacedRevisions(env, orderId, product = null) {
  try {
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE revision_requests SET resolved_at = datetime('now')
          WHERE order_id = ?1 AND resolved_at IS NULL
            AND file_id IN (SELECT id FROM files
                             WHERE order_id = ?1 AND kind = 'delivery' AND superseded_at IS NOT NULL
                               AND (?2 IS NULL OR product_key = ?2))`
      ).bind(orderId, product),
      /*
       * ÉN DE TOESTAND OP HET BESTAND ZELF — 7 augustus 2026.
       *
       * Dit sloot alleen de regel in revision_requests. files.review_state bleef
       * op 'revision_requested' staan, en dát is wat de revisie-inbox leest, wat
       * de teller in de bovenste strook telt en wat de rij amber kleurt. Gevolg:
       * de klantpagina zei "0 open" en het dashboard bleef de kaart tonen —
       * twee schermen die permanent iets anders beweren over hetzelfde werk.
       *
       * Alleen op beelden die daadwerkelijk vervangen zijn. Een revisie waar nog
       * niets mee is gedaan, hoort te blijven staan.
       */
      env.DB.prepare(
        `UPDATE files SET review_state = 'pending'
          WHERE order_id = ?1 AND kind = 'delivery' AND superseded_at IS NOT NULL
            AND review_state = 'revision_requested'
            AND (?2 IS NULL OR product_key = ?2)`
      ).bind(orderId, product),
    ]);
  } catch (err) {
    console.error('[admin] revision close skipped for order', orderId, '—', err?.message || err);
  }
}

/**
 * Hoeveel geleverde beelden van deze bestelling zijn nog nooit gemeld, en
 * hoeveel openstaande revisieaanvragen zouden ermee beantwoord worden.
 *
 * Beide in try/catch: draait de code vóór migratie 0011, dan bestaan
 * announced_at en revision_requests misschien nog niet, en dan hoort de
 * bestellingspagina gewoon te laden zonder herleverblok in plaats van te
 * breken. Nul is hier "niets te melden", wat het veilige antwoord is.
 */
async function unannouncedTally(env, orderId, product = null) {
  const one = async (sql) => {
    try {
      const row = await env.DB.prepare(sql).bind(orderId, product).first();
      return Number(row?.n || 0);
    } catch { return 0; }
  };
  const [files, revisions] = await Promise.all([
    // superseded_at erbij: een beeld dat vervangen is voordat het gemeld werd,
    // is geen nieuws meer. Zonder deze regel zei de knop "1" en de mail "2".
    one(`SELECT COUNT(*) AS n FROM files
          WHERE order_id = ?1 AND kind = 'delivery' AND announced_at IS NULL
            AND superseded_at IS NULL
            AND (?2 IS NULL OR product_key = ?2)`),
    // Openstaand, of net opgelost maar nog niet gemeld — allebei zijn ze wat
    // deze mail beantwoordt. Alleen op resolved_at IS NULL filteren zou de
    // revisies missen die met de knop "Opgelost" al zijn afgevinkt, en dat is
    // de normale volgorde van werken.
    one(`SELECT COUNT(*) AS n FROM revision_requests r
           JOIN orders o ON o.id = r.order_id
           JOIN files f ON f.id = r.file_id
          WHERE r.order_id = ?1
            AND (?2 IS NULL OR f.product_key = ?2)
            AND (r.resolved_at IS NULL
                 OR r.resolved_at > COALESCE(o.redelivery_mailed_at, o.delivery_mailed_at, '0000'))`),
  ]);
  return { files, revisions };
}

/**
 * The "your order is ready" mail.
 *
 * EXPORTED so scripts/mail-render.mjs can draw the real thing. The alternative
 * — a preview script that rebuilds the same blocks itself — is a second copy of
 * the design, and the whole point of src/lib/mailTemplate.js is that there is
 * only ever one. A preview that can drift from the mail is worse than no
 * preview, because it is trusted.
 */
export function deliveryEmail({ order, link, n }) {
  const nl = order.lang === 'nl';
  const hi = mailGreeting(order.name, order.lang);
  return mailShell({
    lang: nl ? 'nl' : 'en',
    preheader: nl
      ? `${order.ref} staat klaar in je portaal${n ? ` — ${n} ${n === 1 ? 'beeld' : 'beelden'}` : ''}.`
      : `${order.ref} is waiting in your portal${n ? ` — ${n} ${n === 1 ? 'image' : 'images'}` : ''}.`,
    body: [
      mailH1(
        nl ? 'Je bestelling staat klaar' : 'Your order is ready',
        nl ? `Referentie ${esc(order.ref)}` : `Reference ${esc(order.ref)}`,
      ),
      mailP(hi),
      mailP(nl
        ? `Je bestelling is klaar${n ? ` — ${n} ${n === 1 ? 'beeld' : 'beelden'}` : ''}. In je portaal kun je alles bekijken, downloaden, en per beeld goedkeuren of een revisie aanvragen.`
        : `Your order is ready${n ? ` — ${n} ${n === 1 ? 'image' : 'images'}` : ''}. Your portal has everything: view it, download it, and approve or ask for a revision image by image.`),
      mailButton(link, nl ? 'Open je portaal' : 'Open your portal'),
      '<div style="height:22px;font-size:0;line-height:0">&nbsp;</div>',
      // The URL in full under the button, for the same reason the sign-in mail
      // prints it: a client that strips anchors, or a phone-to-desktop hop.
      mailNote(nl
        ? `Deze link is de sleutel tot je bestelling — stuur hem gerust door aan een collega die mee moet kijken.<br><span style="color:#8A8F98;word-break:break-all">${esc(link)}</span>`
        : `That link is the key to the order — pass it on to a colleague who needs to look.<br><span style="color:#8A8F98;word-break:break-all">${esc(link)}</span>`),
      '<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>',
      mailSpamNote(nl ? 'nl' : 'en'),
    ].join(''),
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// DE HERLEVERING — augustus 2026.
//
// Lucas: *"een tweede mailsoort: 'je revisie staat klaar', los van de eerste
// levering. Niet automatisch bij elke upload versturen maar met een knop, zodat
// drie beelden achter elkaar één bericht zijn."*
//
// WAAROM DIT DE EERSTE REPARATIE WAS. De revisieknop die we vandaag bouwden
// eindigde in stilte: de klant vraagt een revisie, de studio lost hem op, en
// `orders.delivery_mailed_at` — dat er precies voor is om "je bestelling staat
// klaar" niet twee keer te versturen — zorgde ervoor dat er daarna nooit meer
// iets gemaild werd. Een functie waarvan de uitkomst niet aankomt, is geen
// halve functie maar een belofte die je niet nakomt.
//
// WAAROM EEN KNOP EN GEEN AUTOMATISME. Bij de eerste levering hangt de mail aan
// de STATUSWIJZIGING en niet aan de upload, met precies deze redenering in de
// commentaar hierboven: uploaden en aankondigen zijn verschillende beslissingen,
// en de studio zet routineus bestanden klaar voordat ze klaar zijn om het te
// zeggen. Bij een herlevering is er geen statuswijziging om aan te hangen — de
// bestelling stond al op geleverd — dus moet er iets anders zijn dat het moment
// markeert. Dat is deze knop. Drie beelden achter elkaar uploaden en dan één
// keer melden is niet een gemak, het is de bedoeling: drie mails over dezelfde
// revisie leest als een studio die niet weet wat hij aan het doen is.
//
// WAT DE KNOP NIET DOET. Hij raakt delivery_mailed_at niet aan. Die kolom blijft
// bewaken wat hij bewaakt — de eerste aankondiging — en herleveringen tellen in
// hun eigen kolommen. Zo blijft "is deze klant ooit verteld dat zijn bestelling
// klaar was" een vraag met één antwoord, ook na vier herleveringen.
// ─────────────────────────────────────────────────────────────────────────────

/** Langste toelichting die meegaat in de herleveringsmail. Een alinea, geen brief. */
const ANNOUNCE_NOTE_MAX = 400;

/*
 * ── EEN FACTUUR AFMAKEN OF NOG EENS VERSTUREN — 20 AUGUSTUS 2026 ────────────
 *
 * Twee handelingen die tot vandaag geen knop hadden.
 *
 * AFMAKEN. issueInvoice() doet drie dingen op een rij: een nummer uitgeven, de
 * pdf renderen, de pdf in R2 zetten. Breekt het halverwege, dan blijft de rij op
 * `pending` staan: nummer wel, pdf niet. Er waren twee vangnetten — het bezoek
 * van de klant aan VISUAILS Studio en de nachtelijke cron — en allebei hangen ze
 * ervan af dat er iemand of iets langskomt. Dit is de derde weg, en het is de
 * enige die JIJ zelf in gang kunt zetten op het moment dat je het ziet.
 *
 * Het is veilig omdat issueInvoice() erop gebouwd is: bestaat er al een nummer,
 * dan wordt DAT nummer opnieuw gebruikt en wordt de pdf uit de bewaarde
 * momentopname gerenderd. Geen tweede nummer, geen gat in de reeks.
 *
 * NOG EENS VERSTUREN. Een factuurmail die in een spamfilter is blijven hangen, of
 * een klant die zegt hem niet te hebben. Dezelfde mail, dezelfde bijlage, geen
 * nieuw document.
 *
 * Allebei alleen op een bestelling die er al een heeft. Er wordt hier geen factuur
 * uit het niets gemaakt: dat hoort bij de betaling en nergens anders, en een knop
 * die dat wél kan is een knop waarmee je een factuur uitgeeft voor geld dat niet
 * binnen is (zie betalingGedekt in src/lib/invoice.js).
 */
async function handleInvoiceRepair(context, orderId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  const form = await request.formData().catch(() => null);
  const actie = String(form?.get('action') || '');
  const back = `/admin/orders/${orderId}/files`;

  const order = await env.DB.prepare(
    'SELECT id, ref, email, lang FROM orders WHERE id = ?1'
  ).bind(orderId).first().catch(() => null);
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);

  const bestaand = await env.DB.prepare(
    'SELECT * FROM invoices WHERE order_id = ?1'
  ).bind(orderId).first().catch(() => null);
  if (!bestaand) {
    return html(page({ title: 'Admin', body: errorBody(
      'This order has no invoice yet. An invoice is issued when the payment comes in — there is deliberately no button that makes one out of nothing.'
    ) }), 400);
  }

  if (actie === 'render') {
    try {
      const factuur = await issueInvoice(env, orderId);
      await logAdmin(env, admin, 'invoice.render', { orderId, detail: `${order.ref}: ${factuur?.number || bestaand.number}` });
    } catch (e) {
      return html(page({ title: 'Admin', body: errorBody(
        `Rendering that invoice failed: ${esc(e?.message || String(e))}. The number is unchanged.`
      ) }), 500);
    }
    return seeOther(back);
  }

  if (actie === 'resend') {
    if (bestaand.status !== 'issued') {
      return html(page({ title: 'Admin', body: errorBody(
        'That invoice has no pdf yet — finish it first, then send it.'
      ) }), 400);
    }
    const ok = await mailInvoice(env, { order, invoice: bestaand });
    await logAdmin(env, admin, 'invoice.resend', {
      orderId, detail: `${order.ref}: ${bestaand.number}${ok ? '' : ' (mislukt)'}`,
    });
    if (!ok) {
      return html(page({ title: 'Admin', body: errorBody(
        'Sending that invoice failed. Check the mail key and try again.'
      ) }), 500);
    }
    return seeOther(back);
  }

  return seeOther(back);
}

async function handleAnnounceRedelivery(context, orderId) {
  const { request, env } = context;
  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  const order = await env.DB.prepare(
    `SELECT id, ref, email, name, lang, status, delivery_mailed_at FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);
  if (!order.email) return html(page({ title: 'Admin', body: errorBody('This order has no email address on it.') }), 400);

  // DE EERSTE AANKONDIGING IS NIET DEZE KNOP. Is er nooit een leveringsmail
  // geweest, dan hoort die eerst — met de tekst "je bestelling staat klaar", en
  // via de statuswijziging, zodat delivered_at en het tijdlijnbericht kloppen.
  // "Je revisie staat klaar" als allereerste bericht over een bestelling is een
  // mail die naar iets verwijst wat de klant nog nooit gezien heeft.
  if (!order.delivery_mailed_at) {
    return html(page({ title: 'Admin', body: errorBody(
      'This order has never been announced. Set its status to <strong>delivered</strong> first — that sends the "your order is ready" mail. This button is for what comes after.'
    ) }), 400);
  }

  const form = await request.formData().catch(() => null);
  const note = String(form?.get('note') || '').trim().slice(0, ANNOUNCE_NOTE_MAX);
  // PER PRODUCT OF PER BESTELLING. Lucas wilde allebei kunnen: een product dat
  // af is meteen de deur uit, of aan het eind alles in één bericht. Zonder
  // `product` gaat het over de hele bestelling — dat is de knop onderaan.
  const product = /^p\d{1,3}$/.test(String(form?.get('product') || '')) ? String(form.get('product')) : null;

  const tally = await unannouncedTally(env, orderId, product);
  // NIETS NIEUWS IS GEEN MAIL. Een knop die altijd verstuurt, verstuurt ook de
  // dubbelklik en de "ik wist even niet of ik hem al had ingedrukt" — en dat is
  // aan de kant van de klant niet te onderscheiden van een studio die twee keer
  // hetzelfde zegt. Er is geen foutmelding nodig: terug naar de pagina, waar
  // het blok dan zelf laat zien dat er niets klaarstaat.
  if (!tally.files) return seeOther(`/admin/orders/${orderId}/files?announced=none`);

  const origin = (() => {
    try { return new URL(request.url).origin; } catch { return 'https://visuails.com'; }
  })();
  const link = await freshPortalLink(env, orderId, origin);

  const nl = order.lang === 'nl';
  const isRevision = tally.revisions > 0;
  const subject = isRevision
    ? (nl ? `Je revisie staat klaar — ${order.ref}` : `Your revision is ready — ${order.ref}`)
    : (nl ? `Nieuwe beelden voor je bestelling — ${order.ref}` : `New images for your order — ${order.ref}`);

  // HIER WORDT WÉL GEWACHT, EN WÉL GETOOND. Bij de statuswijziging is de mail
  // bewust niet awaited: die knop verandert iets in de database en de mail is
  // een gevolg, dus een mailstoring mag geen mislukte statuswijziging worden.
  // Deze knop doet niets ánders dan mailen. Faalt de mail, dan is er niets
  // gebeurd, en dat moet op het scherm staan in plaats van in de console.
  try {
    await sendMail(env, {
      to: order.email,
      subject,
      html: redeliveryEmail({ order, link, n: tally.files, revisions: tally.revisions, note, product }),
    });
  } catch (err) {
    return html(page({ title: 'Admin', body: errorBody(
      `The mail did not go out: ${esc(err?.message || String(err))}. Nothing was marked as announced, so you can press the button again.`
    ) }), 502);
  }

  // Pas ná een geslaagde verzending. Andersom zou één mislukte mail de beelden
  // voorgoed als "gemeld" wegzetten en de klant met niets achterlaten.
  await markAnnounced(env, orderId, product);
  await closeReplacedRevisions(env, orderId, product);
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE orders SET redelivery_mailed_at = datetime('now'),
                         redelivery_count = COALESCE(redelivery_count, 0) + 1
        WHERE id = ?1`
    ).bind(orderId),
    // Ook op de tijdlijn van de klant, om dezelfde reden als bij een
    // statuswijziging: het portaal leest order_events, en een gebeurtenis die
    // alleen in een mailbox bestaat, bestaat niet meer zodra die mail
    // weggegooid is. De status blijft wat hij is — dit is geen nieuwe fase.
    env.DB.prepare(
      `INSERT INTO order_events (order_id, status, note, actor) VALUES (?1, ?2, ?3, 'admin')`
    ).bind(
      orderId,
      order.status || 'delivered',
      note || (isRevision
        ? `${tally.files} ${tally.files === 1 ? 'nieuw beeld' : 'nieuwe beelden'} geleverd na revisie`
        : `${tally.files} ${tally.files === 1 ? 'nieuw beeld' : 'nieuwe beelden'} geleverd`),
    ),
  ]);

  await logAdmin(env, await currentAdmin(context), 'order.announce', {
    orderId, detail: `${order.ref}: ${tally.files} beeld(en)${product ? ` van product ${product.replace(/^p/, '')}` : ''} gemeld`,
  });
  return seeOther(`/admin/orders/${orderId}/files?announced=${tally.files}`);
}

/**
 * De "je revisie staat klaar"-mail.
 *
 * WAAROM EEN EIGEN MAIL EN NIET DEZELFDE MET EEN ANDER ONDERWERP. "Je
 * bestelling staat klaar" voor de tweede keer is feitelijk onjuist — de
 * bestelling stond al klaar, dit is wat eraan veranderd is. En het is de mail
 * die na een klacht binnenkomt: hij moet als eerste zeggen dat er iets mee
 * gedaan is, niet opnieuw beginnen met "je bestelling is klaar".
 *
 * TWEE BEWOORDINGEN, ÉÉN SJABLOON. Stonden er revisieaanvragen open, dan gaat
 * dit over die revisie; is er zonder aanvraag iets bijgeleverd, dan zijn het
 * gewoon nieuwe beelden. Hetzelfde bericht met twee eerlijke openingen is beter
 * dan één zin die in het ene geval te veel belooft en in het andere te weinig.
 *
 * EXPORTED, om dezelfde reden als deliveryEmail: scripts/mail-render.mjs tekent
 * het echte ding, niet een tweede kopie van het ontwerp.
 */
export function redeliveryEmail({ order, link, n, revisions = 0, note = '', product = null }) {
  const nl = order.lang === 'nl';
  const hi = mailGreeting(order.name, order.lang);
  const isRevision = revisions > 0;
  // Gaat het over één product, dan staat dat in de zin. "3 nieuwe beelden" bij
  // een bestelling van dertig producten is waar en nutteloos; "3 nieuwe beelden
  // voor product 7" is waar en bruikbaar.
  const forProduct = product
    ? (nl ? ` voor product ${esc(product.replace(/^p/, ''))}` : ` for product ${esc(product.replace(/^p/, ''))}`)
    : '';
  const images = (nl
    ? `${n} ${n === 1 ? 'nieuw beeld' : 'nieuwe beelden'}`
    : `${n} new ${n === 1 ? 'image' : 'images'}`) + forProduct;

  return mailShell({
    lang: nl ? 'nl' : 'en',
    preheader: nl
      ? `${images} voor ${order.ref} staan klaar in je portaal.`
      : `${images} for ${order.ref} are waiting in your portal.`,
    body: [
      mailH1(
        isRevision
          ? (nl ? 'Je revisie staat klaar' : 'Your revision is ready')
          : (nl ? 'Er staan nieuwe beelden klaar' : 'New images are ready'),
        nl ? `Referentie ${esc(order.ref)}` : `Reference ${esc(order.ref)}`,
      ),
      mailP(hi),
      mailP(isRevision
        ? (nl
          ? `We hebben ${revisions === 1 ? 'je revisie' : `je ${revisions} revisies`} opgepakt en ${images} voor je klaargezet. Je kunt ze bekijken, downloaden en opnieuw goedkeuren of nog een keer laten aanpassen.`
          : `We picked up ${revisions === 1 ? 'your revision' : `your ${revisions} revisions`} and put ${images} up for you. View them, download them, and approve or ask again.`)
        : (nl
          ? `Er staan ${images} bij je bestelling. Je kunt ze bekijken, downloaden en per beeld goedkeuren of een revisie aanvragen.`
          : `There are ${images} with your order. View them, download them, and approve or request a revision image by image.`)),
      // De toelichting van de studio, als die er is. Tussen de begroeting en de
      // knop, want dit is waarom de mail er is — niet een voetnoot eronder.
      note
        ? mailQuote(esc(note).replace(/\n+/g, '<br>'))
        : '',
      note ? '<div style="height:18px;font-size:0;line-height:0">&nbsp;</div>' : '',
      mailButton(link, nl ? 'Bekijk de nieuwe beelden' : 'See the new images'),
      '<div style="height:22px;font-size:0;line-height:0">&nbsp;</div>',
      // DEZE LINK VERVANGT DE VORIGE, en dat staat er ook. Eén levend token per
      // bestelling is de regel van het schema (zie freshPortalLink); wie de
      // oude link nog geopend had, krijgt daar de "vervangen"-pagina. Dat
      // stilzwijgend laten gebeuren is hoe je iemand laat denken dat er iets
      // stuk is.
      mailNote(nl
        ? `Deze link vervangt de vorige — gebruik vanaf nu deze.<br><span style="color:#8A8F98;word-break:break-all">${esc(link)}</span>`
        : `This link replaces the previous one — use this from now on.<br><span style="color:#8A8F98;word-break:break-all">${esc(link)}</span>`),
      '<div style="height:14px;font-size:0;line-height:0">&nbsp;</div>',
      mailSpamNote(nl ? 'nl' : 'en'),
    ].join(''),
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// THE NUMBERS, AND THE CUSTOMER VIEW — August 2026.
//
// Lucas: "zorg dat admin meer kan doen want het voelt nu best leeg terwijl
// admin pagina veel gebruikt gaat worden."
//
// It felt empty because it answered one question — what is the status of each
// order — and a dashboard that is opened all day has to answer the two that
// come before it: what needs me today, and who is this brand.
//
// WHAT WENT IN, AND WHAT DID NOT.
//
//   · A TODAY STRIP. Six counts, each one a thing that can be acted on rather
//     than a metric. "Revisions waiting" is work; "total orders ever" is a
//     number to feel something about, so it is not here.
//   · A CUSTOMERS PAGE. Orders are the unit of work but a BRAND is the unit of
//     relationship, and until now nothing in the admin grouped by one. It is
//     also where a brand's standing preferences finally became visible to the
//     studio: the customer sets a brand kit in their portal, the studio
//     produces against it, and the studio could not see it.
//   · NO CHARTS. A count you can read in a second beats a sparkline of the
//     same count, and this dashboard is opened between jobs rather than
//     studied.
// ─────────────────────────────────────────────────────────────────────────────

/*
 * Hoeveel bestellingen op een btw-beslissing wachten.
 *
 * Eigen functie en niet in loadTodayCounts(), want die gaat over vandaag en dit is
 * een stapel die blijft staan tot iemand hem wegwerkt. Faalt de query — 0018 niet
 * gedraaid — dan is het antwoord nul en verschijnt de chip niet. Dat is juist: zonder
 * die migratie bestaat de poort niet en is er ook niets vastgehouden.
 */
/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DRAAIT DE NACHTELIJKE TAAK? — 10 augustus 2026
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * cron/index.js zegt bovenaan: "Geen mail betekent: er was niets te doen en er ging niets
 * mis." Dat is precies óók wat je krijgt als die Worker nooit gedeployd is, als de trigger
 * uitstaat, of als RESEND_API_KEY niet op dát project staat. Stilte betekende twee
 * tegengestelde dingen.
 *
 * De taak schrijft daarom elke nacht één rij in app_settings. Deze functie leest hem, en
 * het dashboard zet hem bovenaan. Ouder dan 48 uur is een waarschuwing: de taak draait
 * dagelijks, dus twee gemiste nachten is geen toeval meer.
 *
 * Geen rij is niet hetzelfde als een oude rij, en dat verschil staat in de tekst: "nog
 * nooit gedraaid" wijst naar de deploy, "3 dagen stil" wijst naar de trigger.
 */
/*
 * ── EN DE TWEEDE WACHTER: DE BACK-UP — 12 augustus 2026 ────────────────────
 *
 * Er staan nu twee datums in app_settings die hetzelfde soort vraag beantwoorden:
 * `cron_last_run` (draait de nachtelijke Worker?) en `backup_last_run` (draait de
 * wekelijkse back-up op de PC?). Beide worden ergens ANDERS geschreven dan waar ze
 * gelezen worden, en dat is precies waarom ze bestaan: stilte betekende bij beide twee
 * tegengestelde dingen, en de gevaarlijkste van de twee is de stille.
 *
 * Eén query voor beide. Het zijn twee rijen in dezelfde tabel; er twee vragen van maken
 * is een tweede rondje naar D1 voor een dashboard dat toch al op vijf queries wacht.
 *
 * DE DREMPELS VERSCHILLEN, EN DAT IS GEEN SLORDIGHEID. De cron draait dagelijks, dus
 * twee gemiste nachten (48 uur) is geen toeval meer. De back-up draait wekelijks, dus
 * daar is één gemiste zondag een uitgezette laptop en pas twee gemiste zondagen (tien
 * dagen) een taak die niet meer loopt. Dezelfde grens staat in cron/index.js, waar de
 * mail vandaan komt — verandert er één, dan hoort de ander mee.
 */
const WATCH = {
  cron: { key: 'cron_last_run', staleHours: 48, ok: 'Nacht ok', never: 'Nachtelijke taak: nog nooit gedraaid', label: 'Nachtelijke taak' },
  backup: { key: 'backup_last_run', staleHours: 10 * 24, ok: 'Back-up ok', never: 'Back-up: nog nooit gemaakt', label: 'Back-up' },
};

async function loadWatchdogs(env) {
  try {
    const res = await env.DB.prepare(
      "SELECT key, value FROM app_settings WHERE key IN ('cron_last_run', 'backup_last_run')"
    ).all();
    const rows = new Map((res.results || []).map((r) => [r.key, r.value]));
    /* DE VORM EERST, DAN PARSEN. `Date.parse('gisteren ergens')` geeft geen NaN maar
       een datum in 1999 — Date.parse valt bij onbekende tekst terug op een eigen
       lezing. Dat leverde in cron/index.js een chip op die "9720 dagen stil" zei over
       een waarde die simpelweg geen datum was. Alleen precies de vorm die
       scripts/backup.mjs en de hartslag schrijven telt hier als datum. */
    const SHAPE = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
    const read = (spec) => {
      const value = rows.get(spec.key);
      if (!value) return { state: 'never' };
      const text = String(value).slice(0, 16);
      /* Een onleesbare datum valt bij 'never' en niet bij 'ok': er staat iets, maar we
         weten niet wat, en dan is "we weten het niet" het eerlijke antwoord. */
      if (!SHAPE.test(text)) return { state: 'never', value: String(value) };
      const when = Date.parse(text.replace(' ', 'T') + ':00Z');
      if (!Number.isFinite(when)) return { state: 'never', value: String(value) };
      const hours = (Date.now() - when) / 36e5;
      return { state: hours > spec.staleHours ? 'stale' : 'ok', value: String(value), hours };
    };
    return { cron: read(WATCH.cron), backup: read(WATCH.backup) };
  } catch {
    /* Geen app_settings betekent een database die niet is opgezet; dat is elders al
       zichtbaar en hier geen reden om het dashboard te laten omvallen. */
    return null;
  }
}

/** Eén chip per wachter: rood-oranje als hij stilstaat, rustig als hij loopt. */
function watchChip(spec, w) {
  if (!w) return '';
  if (w.state === 'never') return `<span class="fl-chip is-warn">${spec.never}</span>`;
  if (w.state === 'stale') {
    const days = Math.floor((w.hours || 0) / 24);
    return `<span class="fl-chip is-warn">${spec.label}: ${days} ${days === 1 ? 'dag' : 'dagen'} stil</span>`;
  }
  return `<span class="fl-chip">${spec.ok} &middot; ${esc(w.value || '')}</span>`;
}

/**
 * Hoeveel aanbevelingen op een beslissing wachten.
 *
 * Zelfde vorm en zelfde reden als loadVatHeld() hieronder: een scherm dat niemand
 * kan bereiken is hetzelfde probleem als geen scherm, en een link zonder getal
 * vertelt je niet of je erop moet klikken. Nul betekent geen chip.
 *
 * Een tabel die er niet is, geeft nul en geen fout. Dit getal siert het dashboard
 * op; het mag het niet omver halen.
 */
async function loadTestimonialsWaiting(env) {
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n
         FROM order_feedback
        WHERE testimonial_consent = 1
          AND testimonial_approved = 0
          AND testimonial_text IS NOT NULL
          AND TRIM(testimonial_text) <> ''`
    ).first();
    return Number(row?.n) || 0;
  } catch {
    return 0;
  }
}

async function loadVatHeld(env) {
  try {
    const row = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM orders WHERE review_state = 'pending'"
    ).first();
    return Number(row?.n) || 0;
  } catch {
    return 0;
  }
}

async function loadTodayCounts(env) {
  const one = async (sql, ...bind) => {
    try {
      const row = await env.DB.prepare(sql).bind(...bind).first();
      return Number(row?.n || 0);
    } catch { return 0; }
  };
  const [newToday, inProduction, checking, undelivered, unpaid, revisions, owed, toAnnounce] = await Promise.all([
    // VERBORGEN TELT NERGENS MEE. Een testbestelling van jezelf hoort niet in
    // "vandaag binnengekomen" en niet in "onbetaald" — anders is verbergen een
    // halve maatregel die de cijfers laat liegen. one() vangt de fout af als
    // migratie 0014 nog niet gedraaid is, en dan telt hij 0 in plaats van te
    // breken.
    one("SELECT COUNT(*) AS n FROM orders WHERE date(created_at) = date('now') AND hidden_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM orders WHERE status = 'in_production' AND hidden_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM orders WHERE status = 'human_check' AND hidden_at IS NULL"),
    // Not "not delivered" — an order that is cancelled is not waiting on
    // anybody, and counting it as work is how a dashboard starts lying.
    one("SELECT COUNT(*) AS n FROM orders WHERE status IN ('received','in_production','human_check') AND hidden_at IS NULL"),
    // Only what is actually owed: the test sample and anything with no total
    // priced against it are not debts, they are rows.
    //
    // ── EN DAT MOEST 12 AUGUSTUS 2026 EXPLICIET WORDEN ────────────────────────
    //
    // De proefvisual viel hier buiten omdat `total_cents` NULL bleef -- de uitsluiting
    // stond in de BEDOELING van het commentaar hierboven en nergens in de query. Sinds
    // de EUR 1 als brutobedrag inclusief btw wordt weggeschreven (zie quoteTestSample())
    // is dat bedrag 83 cent, en dus > 0. Zonder de regel hieronder zou elke afgebroken
    // proefvisual-checkout in deze teller belanden -- en dat is elke bezoeker die op de
    // Mollie-pagina wegklikt, want de rij wordt voor de doorverwijzing geschreven. Dan
    // telt een strook die zegt "hier moet je geld ophalen" een groeiende stapel van een
    // euro die niemand gaat bellen. tests/sample-invoice.test.mjs houdt vast dat deze
    // uitsluiting en die in het filter hieronder hetzelfde zeggen.
    one("SELECT COUNT(*) AS n FROM orders WHERE payment_status = 'unpaid' AND total_cents > 0"
      + " AND service != 'test-sample' AND hidden_at IS NULL"),
    // Via orders, want een revisie op een verborgen testbestelling is geen werk.
    one(`SELECT COUNT(*) AS n FROM files f JOIN orders o ON o.id = f.order_id
          WHERE f.review_state = 'revision_requested' AND o.hidden_at IS NULL`),
    // PER BESTELLING, NIET PER BESTAND. Dit telt werk, en het werk is "een
    // klant bellen dat er iets klaarstaat" — dat is één handeling, ook als er
    // zes beelden onder hangen. Zes tellen zou de strook laten schreeuwen over
    // één druk op de knop. Faalt de query omdat migratie 0011 nog niet is
    // gedraaid, dan geeft one() 0 terug en verdwijnt de cel vanzelf.
    // ALLEEN BESTELLINGEN DIE AL EEN KEER AANGEKONDIGD ZIJN. Een bestelling
    // die nog in productie is heeft vaak al bestanden staan — de studio zet
    // routineus werk klaar voordat het klaar is — en die meetellen zou de
    // strook laten waarschuwen voor werk dat nog niet af is. Wat hier hoort te
    // staan is de bestelling waarvan de klant denkt dat hij alles heeft.
    one("SELECT COUNT(*) AS n FROM orders WHERE status = 'delivered' AND payment_status != 'paid' AND total_cents > 0 AND hidden_at IS NULL"),
    one(`SELECT COUNT(DISTINCT f.order_id) AS n FROM files f JOIN orders o ON o.id = f.order_id
          WHERE f.kind = 'delivery' AND f.announced_at IS NULL AND f.superseded_at IS NULL
            AND o.delivery_mailed_at IS NOT NULL AND o.hidden_at IS NULL`),
  ]);
  return { newToday, inProduction, checking, undelivered, unpaid, revisions, owed, toAnnounce };
}

function todayStrip(c) {
  const cell = (n, label, warn) =>
    `<div class="stat${warn && n ? ' is-warn' : ''}"><span class="stat-n">${n}</span><span class="stat-l">${esc(label)}</span></div>`;
  return `<div class="stats">
    ${cell(c.newToday, 'in today')}
    ${cell(c.inProduction, 'in production')}
    ${cell(c.checking, 'in review')}
    ${cell(c.undelivered, 'open')}
    ${cell(c.unpaid, 'unpaid', true)}
    ${cell(c.revisions, 'revisions', true)}
    ${cell(c.toAnnounce, 'to announce', true)}
    ${cell(c.owed, 'delivered, not paid', true)}
  </div>`;
}

async function loadCustomers(env) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.email, c.brand, c.name, c.created_at,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS orders,
            (SELECT COALESCE(SUM(o.total_cents),0) FROM orders o
              -- orders.total_cents holds the NET figure (functions/api/order.js
              -- binds quote.netCents), while Mollie collects the gross. The
              -- column header says "excl. VAT" for that reason: a column headed
              -- "Paid" showing a number 21% below what actually arrived in the
              -- account is a revenue figure that quietly disagrees with the
              -- bank. Summing net and labelling it net is the honest pair —
              -- deriving a gross here would hardcode a rate that quote.js owns.
              WHERE o.customer_id = c.id AND o.payment_status = 'paid') AS paid_cents,
            (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order
       FROM customers c
      ORDER BY last_order IS NULL, last_order DESC, c.id DESC
      LIMIT 300`
  ).all();
  return results || [];
}

async function renderCustomers(context) {
  const { env } = context;
  const rows = await loadCustomers(env);
  const body = `
  <p><a href="/admin">&larr; Dashboard</a></p>
  <h1>Customers</h1>
  <p class="lede">${rows.length} brand${rows.length === 1 ? '' : 's'}</p>
  ${rows.length ? `<table class="files">
    <thead><tr><th>Brand</th><th>Email</th><th class="num">Orders</th><th class="num">Paid excl. VAT</th><th>Last order</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td><a href="/admin/customers/${r.id}">${esc(r.brand || r.name || '—')}</a></td>
      <td>${esc(r.email)}</td>
      <td class="num">${r.orders}</td>
      <td class="num">${r.paid_cents ? '€' + (r.paid_cents / 100).toFixed(2) : '—'}</td>
      <td>${esc((r.last_order || '').slice(0, 10) || '—')}</td>
    </tr>`).join('')}</tbody></table>` : '<p class="empty">No customers yet.</p>'}
  `;
  return html(page({ title: 'Customers', body }));
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * BLOK 5 — HET PANEEL KAN NU OOK CORRIGEREN (12 AUGUSTUS 2026)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Lucas' lijst was zes wensen lang en kwam op één ding neer: dit paneel kon LEZEN en
 * nauwelijks iets rechtzetten. Een model dat per ongeluk was toegevoegd kon er niet
 * meer uit, een verkeerd btw-nummer bleef fout op elke volgende factuur, en een klant
 * die zijn inloglink kwijt was moest het publieke formulier gebruiken.
 *
 * De kolommen ervoor komen uit migrations/0027-admin-beheer.sql. Wat hier staat is de
 * bediening, en elke handler houdt zich aan dezelfde drie regels als de rest van dit
 * bestand: één route per handeling, een logregel bij alles wat een klant merkt, en
 * terug naar de pagina waar je vandaan kwam.
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * Eén model: hernoemen, verbergen, weer zichtbaar maken, of echt verwijderen.
 *
 * VIER HANDELINGEN IN ÉÉN ROUTE, en dat is hier de juiste maat: ze gaan alle vier
 * over hetzelfde model, ze zitten in dezelfde kaart op het scherm, en de knop zegt
 * welke het is. Vier routes zou vier bijna identieke handlers zijn.
 *
 * VERWIJDEREN IS DE ENIGE DIE ONOMKEERBAAR IS, en die vraagt daarom om de naam van
 * het model in het bevestigingsveld — dezelfde afspraak als bij het AVG-verzoek. En
 * hij ruimt het R2-object op: een portret dat in de bucket blijft staan terwijl de rij
 * weg is, is een gezicht dat niemand meer kan vinden en niemand meer kan verwijderen.
 */
async function handleModelManage(context, modelId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  if (!Number.isInteger(modelId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad model id.') }), 400);
  }
  const model = await env.DB.prepare(
    'SELECT id, customer_id, label, preview_key, hidden_at FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!model) return html(page({ title: 'Admin', body: errorBody('No such model.') }), 404);

  const form = await request.formData().catch(() => null);
  const action = String(form?.get('action') || '');
  const back = `/admin/customers/${model.customer_id}#model-${modelId}`;

  if (action === 'rename') {
    /* Leeg is geen naam. Een model zonder label is in het portaal van de klant een
       kaart met een gezicht en geen woord eronder, en dat is erger dan de oude naam. */
    const label = String(form?.get('label') || '').trim().slice(0, 80);
    if (!label) {
      return html(page({ title: 'Admin', body: errorBody('A model needs a name. Nothing was changed.') }), 400);
    }
    await env.DB.prepare('UPDATE custom_models SET label = ?1 WHERE id = ?2').bind(label, modelId).run();
    await logAdmin(env, admin, 'model.rename', {
      customerId: model.customer_id,
      detail: `#${modelId}: "${model.label}" → "${label}"`,
    });
    return seeOther(back);
  }

  if (action === 'hide' || action === 'unhide') {
    const verbergen = action === 'hide';
    /* De reden is verplicht bij verbergen en wordt gewist bij terugzetten: een
       verborgen model zonder reden is over drie maanden een raadsel, en een reden die
       blijft staan nadat het model weer zichtbaar is, is een onwaarheid. */
    const reason = String(form?.get('reason') || '').trim().slice(0, 300);
    if (verbergen && !reason) {
      return html(page({ title: 'Admin', body: errorBody(
        'Say why it is being hidden — that line is the only thing that explains it in three months. Nothing was changed.'
      ) }), 400);
    }
    await env.DB.prepare(
      `UPDATE custom_models SET hidden_at = ?1, hidden_reason = ?2 WHERE id = ?3`
    ).bind(verbergen ? new Date().toISOString() : null, verbergen ? reason : null, modelId).run();
    await logAdmin(env, admin, verbergen ? 'model.hide' : 'model.unhide', {
      customerId: model.customer_id,
      detail: `#${modelId} ${esc(model.label || '')}${verbergen ? `: ${reason}` : ''}`,
    });
    return seeOther(back);
  }

  if (action === 'delete') {
    if (String(form?.get('confirm') || '').trim() !== String(model.label || '').trim()) {
      return html(page({ title: 'Admin', body: errorBody(
        `To delete this model, type <strong>${esc(model.label || '')}</strong> exactly. Hiding it is reversible; this is not.`
      ) }), 400);
    }
    /*
     * DE STYLE LOCK EERST. `customer_style_locks.custom_model_id` verwijst hiernaar
     * met ON DELETE SET NULL, dus strikt genomen zou de database het zelf oplossen.
     * Deze codebase vertrouwt daar bewust niet op in D1 — zie de noot bij dezelfde
     * afweging in handleCustomerWipe — en er is hier nog een tweede reden: een lock
     * die zijn model kwijt is, is een voorkeur die naar niets wijst. Die hoort weg en
     * niet leeg.
     */
    await env.DB.batch([
      env.DB.prepare('UPDATE customer_style_locks SET custom_model_id = NULL WHERE custom_model_id = ?1').bind(modelId),
      env.DB.prepare('DELETE FROM custom_models WHERE id = ?1').bind(modelId),
    ]).catch(() => null);
    /* Het portret uit R2, ná de rij. Andersom zou een mislukte DELETE een rij
       achterlaten die naar een verdwenen object wijst — precies de fout die de
       AVG-knop vandaag had. */
    if (model.preview_key) {
      try { await env.UPLOADS?.delete(model.preview_key); } catch { /* een verdwenen object is geen fout */ }
    }
    await logAdmin(env, admin, 'model.delete', {
      customerId: model.customer_id,
      detail: `#${modelId} ${model.label || ''}`,
    });
    return seeOther(`/admin/customers/${model.customer_id}`);
  }

  return seeOther(back);
}

/**
 * De gegevens van de klant rechtzetten.
 *
 * WAAROM DIT ONTBRAK EN WAAROM HET UITMAAKT. De klant kan dit zelf in zijn portaal;
 * de studio kon het niet. Een verkeerd btw-nummer bleef dus fout op elke volgende
 * factuur, en de btw-reviewpagina helpt daar niet — die beslist de behandeling PER
 * BESTELLING en raakt het nummer van de klant niet aan.
 *
 * LEEG BETEKENT LEEGMAKEN, behalve bij het e-mailadres. Dat is het enige veld waar de
 * hele toegang aan hangt: het is de inlogsleutel én de plek waar de levering naartoe
 * gaat. Een leeg e-mailadres is dus geen correctie maar een account dat niemand meer
 * kan openen, en dat weigert deze handler.
 */
async function handleCustomerDetails(context, customerId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const before = await env.DB.prepare(
    'SELECT id, email, brand, name, phone, website, vat_number FROM customers WHERE id = ?1'
  ).bind(customerId).first();
  if (!before) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const form = await request.formData().catch(() => null);
  const veld = (naam, max) => {
    const v = String(form?.get(naam) ?? '').trim().slice(0, max);
    return v === '' ? null : v;
  };

  const email = veld('email', 200);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return html(page({ title: 'Admin', body: errorBody(
      'That is not an email address, and the email address is what this account signs in with. Nothing was changed.'
    ) }), 400);
  }
  /*
   * HET ADRES MAG NIET BOTSEN. Er staat een unieke index op lower(email), dus een
   * botsing zou de UPDATE laten omvallen — en dan staat er een foutpagina waar
   * "dat adres is al van een ander account" hoort te staan. Zelf kijken geeft het
   * juiste bericht, en de index blijft de vangrail eronder.
   */
  const bezet = await env.DB.prepare(
    'SELECT id, brand FROM customers WHERE lower(email) = lower(?1) AND id <> ?2'
  ).bind(email, customerId).first().catch(() => null);
  if (bezet) {
    return html(page({ title: 'Admin', body: errorBody(
      `That address already belongs to <a href="/admin/customers/${bezet.id}">customer #${bezet.id}${bezet.brand ? ` (${esc(bezet.brand)})` : ''}</a>. Nothing was changed — two accounts cannot share a sign-in address.`
    ) }), 400);
  }

  const na = {
    email,
    brand: veld('brand', 120),
    name: veld('name', 120),
    phone: veld('phone', 40),
    website: veld('website', 200),
    vat_number: veld('vat_number', 40),
  };

  /*
   * DE CATCH IS GEEN SIER. De controle hierboven kijkt of het adres bezet is, en tussen
   * die controle en deze UPDATE zit een moment waarin een tweede beheerder hetzelfde
   * adres kan pakken. Dan slaat de unieke index toe en zou de studio een stacktrace op
   * zijn scherm krijgen waar een leesbare regel hoort te staan.
   *
   * Dit is de vangrail onder de controle en niet de vervanging ervan: de controle geeft
   * het NUTTIGE bericht (met het klantnummer van de ander erin), deze geeft het
   * BEGRIJPELIJKE bericht als het toch misgaat.
   */
  const geschreven = await env.DB.prepare(
    `UPDATE customers SET email = ?1, brand = ?2, name = ?3, phone = ?4, website = ?5,
            vat_number = ?6, updated_at = datetime('now')
      WHERE id = ?7`
  ).bind(na.email, na.brand, na.name, na.phone, na.website, na.vat_number, customerId).run()
    .then(() => true)
    .catch((err) => {
      console.error('[admin] klantgegevens niet opgeslagen:', err?.message || err);
      return false;
    });
  if (!geschreven) {
    return html(page({ title: 'Admin', body: errorBody(
      'Saving failed — most likely that email address was just taken by another account. Nothing was changed.'
    ) }), 409);
  }

  /*
   * WAT ER VERANDERDE, en niet "de gegevens zijn bijgewerkt". Een logregel die alleen
   * zegt dát er iets is gewijzigd, is bij een vraag over een factuur van drie maanden
   * terug net zo nuttig als geen logregel.
   */
  const wijzigingen = Object.entries(na)
    .filter(([k, v]) => (before[k] ?? null) !== v)
    .map(([k, v]) => `${k}: ${before[k] ?? '—'} → ${v ?? '—'}`);
  if (wijzigingen.length) {
    await logAdmin(env, admin, 'customer.details', {
      customerId,
      detail: wijzigingen.join(' · ').slice(0, 900),
    });
  }
  return seeOther(`/admin/customers/${customerId}`);
}

/**
 * Een account op non-actief zetten, of weer aan.
 *
 * DIT IS GEEN VERWIJDERING en dat is het punt. De bestellingen, de facturen en de
 * geschiedenis blijven staan; wat er verdwijnt is de mogelijkheid om in te loggen en
 * te bestellen. Daarmee dekt het de drie gevallen die er werkelijk zijn: een dubbele
 * registratie ("gebruik het andere adres"), een klant die zijn account wil sluiten
 * zonder een AVG-verzoek te doen, en misbruik.
 *
 * WAAROM NIET SAMENVOEGEN. Lucas' keuze van 12 augustus 2026, en de juiste: dubbel op
 * hetzelfde e-mailadres is op databaseniveau al onmogelijk, dus dit gaat alleen over
 * één merk met twee adressen. Bestellingen en facturen verhangen is een onomkeerbare
 * operatie op de tabel waar de boekhouding aan hangt, en het probleem is op te lossen
 * door de klant naar het goede account te sturen. `merged_into` legt daarom alleen de
 * VERWIJZING vast: dit account hoort bij dat account. Er wordt niets verplaatst.
 *
 * DE SESSIES GAAN ERUIT. Zonder dat blijft een klant die al is ingelogd gewoon
 * doorwerken tot zijn sessie verloopt — en dan is "gedeactiveerd" een woord op een
 * adminscherm in plaats van een maatregel.
 */
async function handleCustomerStatus(context, customerId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const customer = await env.DB.prepare(
    'SELECT id, brand, name, email, deactivated_at FROM customers WHERE id = ?1'
  ).bind(customerId).first();
  if (!customer) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const form = await request.formData().catch(() => null);
  const action = String(form?.get('action') || '');
  const back = `/admin/customers/${customerId}`;

  if (action === 'reactivate') {
    await env.DB.prepare(
      `UPDATE customers SET deactivated_at = NULL, deactivated_reason = NULL, merged_into = NULL,
              updated_at = datetime('now') WHERE id = ?1`
    ).bind(customerId).run();
    await logAdmin(env, admin, 'customer.reactivate', { customerId, detail: 'weer actief' });
    return seeOther(back);
  }

  if (action !== 'deactivate') return seeOther(back);

  const reason = String(form?.get('reason') || '').trim().slice(0, 300);
  if (!reason) {
    return html(page({ title: 'Admin', body: errorBody(
      'Say why. This is the line the customer will be told, so it has to be a sentence you would say out loud. Nothing was changed.'
    ) }), 400);
  }
  /* Een verwijzing naar het account dat wél gebruikt wordt, als het om een dubbele
     registratie gaat. Optioneel, en gecontroleerd: een verwijzing naar een klant die
     niet bestaat is erger dan geen verwijzing. Naar zichzelf verwijzen ook. */
  const rauwMerge = String(form?.get('merged_into') || '').trim();
  let mergedInto = null;
  if (rauwMerge) {
    const kandidaat = Number.parseInt(rauwMerge, 10);
    if (!Number.isInteger(kandidaat) || kandidaat === customerId) {
      return html(page({ title: 'Admin', body: errorBody('That is not another customer id. Nothing was changed.') }), 400);
    }
    const bestaat = await env.DB.prepare('SELECT id FROM customers WHERE id = ?1').bind(kandidaat).first().catch(() => null);
    if (!bestaat) {
      return html(page({ title: 'Admin', body: errorBody(`Customer #${kandidaat} does not exist. Nothing was changed.`) }), 400);
    }
    mergedInto = kandidaat;
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE customers SET deactivated_at = datetime('now'), deactivated_reason = ?1,
              merged_into = ?2, updated_at = datetime('now') WHERE id = ?3`
    ).bind(reason, mergedInto, customerId),
    /* Sessies én openstaande inloglinks. Een token dat nog geldig is, is een sessie
       die nog gemaakt kan worden. */
    env.DB.prepare('DELETE FROM account_sessions WHERE customer_id = ?1').bind(customerId),
    env.DB.prepare('DELETE FROM account_tokens WHERE customer_id = ?1').bind(customerId),
  ]).catch((err) => { throw new Error(`deactiveren mislukt: ${err?.message || err}`); });

  await logAdmin(env, admin, 'customer.deactivate', {
    customerId,
    detail: `${reason}${mergedInto ? ` · hoort bij #${mergedInto}` : ''}`,
  });
  return seeOther(back);
}

/**
 * Een boeking in het tegoed van een klant.
 *
 * ALLEEN BIJSCHRIJVEN, NOOIT WIJZIGEN. Een verkeerde boeking corrigeer je met een
 * tegenboeking, zodat er een spoor blijft van wat er is toegezegd en wanneer. Vandaar
 * dat er geen UPDATE en geen DELETE op deze tabel bestaat en het saldo een SUM is.
 *
 * DIT VERREKENT NIETS. Lucas' keuze van 12 augustus: *"alleen een ledger, geen
 * verrekening."* Het bedrag verschijnt niet automatisch op een volgende factuur —
 * dat blijft handwerk, precies zoals het nu bij een annulering gaat. Een half
 * automatisch creditsysteem is erger dan een handmatig, want het rekent stil het
 * verkeerde bedrag af op de enige plek waar dat geld kost.
 */
async function handleCustomerCredit(context, customerId) {
  const { request, env } = context;
  const admin = await currentAdmin(context);
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const customer = await env.DB.prepare('SELECT id FROM customers WHERE id = ?1').bind(customerId).first();
  if (!customer) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const form = await request.formData().catch(() => null);
  const back = `/admin/customers/${customerId}#tegoed`;

  /*
   * HET BEDRAG KOMT IN EURO'S BINNEN EN GAAT IN CENTEN DE TABEL IN. De komma en de
   * punt zijn hier beide toegestaan: wie op een Nederlands toetsenbord "12,50" typt,
   * bedoelt twaalf euro vijftig, en dat afwijzen is een formulier dat de gebruiker
   * uitlegt hoe het toevallig is gebouwd.
   */
  const rauw = String(form?.get('amount') || '').trim().replace(',', '.');
  const euro = Number(rauw);
  if (!rauw || !Number.isFinite(euro) || euro === 0) {
    return html(page({ title: 'Admin', body: errorBody(
      'Fill in an amount other than zero. A negative amount books it off; a positive one books it on.'
    ) }), 400);
  }
  const cents = Math.round(euro * 100);
  /* Een bovengrens, want dit is een vrij tekstveld dat geld schrijft. Duizend euro per
     boeking is ruim voor goodwill en houdt een typefout van drie nullen tegen. */
  if (Math.abs(cents) > 100000) {
    return html(page({ title: 'Admin', body: errorBody(
      'That is more than € 1.000 in one booking. If it really has to be that much, book it in parts — the cap is there to catch a typo.'
    ) }), 400);
  }

  const reason = String(form?.get('reason') || '').trim().slice(0, 300);
  if (!reason) {
    return html(page({ title: 'Admin', body: errorBody(
      'A booking without a reason is an amount nobody remembers in three months, and then you will not dare to settle it. Nothing was booked.'
    ) }), 400);
  }

  /* De bestelling waar het over ging, als het over een bestelling ging. Gecontroleerd
     tegen DEZE klant: een boeking die naar de bestelling van iemand anders wijst, is
     een spoor dat de verkeerde kant op wijst. */
  const rauwOrder = String(form?.get('order_id') || '').trim();
  let orderId = null;
  if (rauwOrder) {
    const kandidaat = Number.parseInt(rauwOrder, 10);
    const rij = Number.isInteger(kandidaat)
      ? await env.DB.prepare('SELECT id FROM orders WHERE id = ?1 AND customer_id = ?2')
        .bind(kandidaat, customerId).first().catch(() => null)
      : null;
    if (!rij) {
      return html(page({ title: 'Admin', body: errorBody(
        'That order does not belong to this customer. Nothing was booked.'
      ) }), 400);
    }
    orderId = kandidaat;
  }

  await env.DB.prepare(
    `INSERT INTO customer_credits (customer_id, delta_cents, reason, order_id, admin_id)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  ).bind(customerId, cents, reason, orderId, admin?.admin_id ?? null).run()
    .catch((err) => { throw new Error(`boeking mislukt: ${err?.message || err}`); });

  await logAdmin(env, admin, 'customer.credit', {
    customerId,
    detail: `${cents > 0 ? '+' : ''}${(cents / 100).toFixed(2)} — ${reason}${orderId ? ` (bestelling #${orderId})` : ''}`,
  });
  return seeOther(back);
}

/**
 * Een nieuwe inloglink sturen, vanuit het paneel.
 *
 * DE INFRASTRUCTUUR LAG ER AL: `account_tokens`, sendLoginLink() in
 * src/lib/account.js, en een werkende mailweg. Er was alleen geen knop, dus een klant
 * die zijn link kwijt was moest naar het publieke formulier — en als hij daar zijn
 * eigen adres verkeerd typte, kwam hij in een lus terecht die de studio niet kon
 * doorbreken.
 *
 * DEZELFDE FUNCTIE ALS DE PUBLIEKE KANT en niet een eigen kopie. Een tweede plek die
 * tokens maakt, is een tweede plek waar de geldigheidsduur, het hashen en de mailtekst
 * uit elkaar kunnen lopen — en dat is precies het soort verschil dat niemand ziet tot
 * er een link niet werkt.
 *
 * EEN GEDEACTIVEERD ACCOUNT KRIJGT NIETS. Anders is deactiveren een woord op een
 * scherm: de link zou werken en de klant zou binnen zijn.
 */
/*
 * ── DE WEEK STARTEN ─────────────────────────────────────────────────────────
 *
 * Eén klik, en er ontstaat een bestelling. Het saldo ging er al af toen de klant
 * zijn slot vastzette — zie queueLock(). Al het rekenwerk
 * staat in startPlanWindow(); hier staat alleen wat er met de uitkomst gebeurt.
 *
 * WAAROM DE MELDING VOLUIT WORDT UITGESCHREVEN. De functie geeft een reden terug
 * als sleutel ('niets-klaar', 'abonnement-paused'). Die sleutel op
 * het scherm zetten zou Lucas laten raden waarom er niets gebeurde — en juist bij
 * een knop die soms terecht niets doet, is "waarom" het hele antwoord.
 *
 * `admin` gaat mee naar het logboek, om dezelfde reden als bij de btw-beslissing:
 * dit is een handeling met geld eraan vast.
 */
/*
 * ── SLOTS MET DE HAND BIJSTELLEN ────────────────────────────────────────────
 *
 * "Er gaat een keer iets mis en dan wil je het kunnen rechtzetten" stond al sinds
 * 6 augustus op de werklijst, en sinds het slotmodel is het geen luxe meer: een
 * mislukte incasso die later alsnog binnenkomt, een week die per ongeluk twee
 * keer gestart is, een klant die iets is toegezegd. Zonder deze knop is het
 * antwoord "log in op D1 en typ een UPDATE", en dat is precies het soort
 * handeling dat niemand vastlegt.
 *
 * ── ER WORDT AAN `granted` GEDRAAID EN NIET AAN `used` ──────────────────────
 *
 * Twee manieren om hetzelfde saldo te repareren, en maar één ervan is eerlijk.
 * `used` verlagen doet alsof er nooit iets is opgemaakt — het wist de
 * geschiedenis. `granted` verhogen zegt wat er werkelijk gebeurde: wij hebben er
 * eentje bijgegeven, en waarom staat erbij. Wie later de rij leest, ziet nog
 * steeds dat de klant zeven producten heeft laten maken.
 *
 * ── EN admin_log IS HET GROOTBOEK ───────────────────────────────────────────
 *
 * Er komt geen `slot_ledger`-tabel bij. Elke correctie schrijft één regel in
 * `admin_log` met wie, hoeveel, welke soort en waarom — dat is de alleen-
 * toevoegen administratie die werklijst §3 vraagt, en hij bestond al. Een tweede
 * tabel die hetzelfde bijhoudt, is een tweede waarheid.
 *
 * ── DE ONDERGRENS ZIT IN DE `WHERE` EN NIET IN JAVASCRIPT ───────────────────
 *
 * `granted` mag nooit onder `used` zakken: slots die al vastgezet zijn, kun je
 * niet meer afnemen — daar staat werk tegenover dat de klant beloofd is. Die
 * voorwaarde staat in de UPDATE zelf, om dezelfde reden als het plafond in
 * verbruikBoeken(): een lees-dan-schrijf in JavaScript is hier een race die je
 * pas ziet als er twee tabbladen open staan.
 */
const SLOT_CORRECTIE_MAX = 50;

async function handleSlotCorrectie(context, customerId, admin) {
  const { request, env } = context;
  const terug = `/admin/customers/${customerId}#week`;
  if (!Number.isInteger(customerId)) return seeOther('/admin/customers');

  const form = await request.formData().catch(() => null);
  const soort = String(form?.get('kind') || '').trim().slice(0, 40);
  const reden = String(form?.get('reason') || '').trim().slice(0, 200);
  const ruw = Number.parseInt(String(form?.get('delta') || ''), 10);

  /* Drie weigeringen met drie verschillende meldingen. Eén algemene zou Lucas
     laten gokken wat er mis was — en dit is een formulier dat hij misschien twee
     keer per jaar gebruikt, dus hij weet het niet uit zijn hoofd. */
  if (!soort) return html(page({ title: 'Admin', body: errorBody('Pick which kind of slot to adjust.') }), 400);
  if (!Number.isInteger(ruw) || ruw === 0 || Math.abs(ruw) > SLOT_CORRECTIE_MAX) {
    return html(page({ title: 'Admin', body: errorBody(
      `The adjustment has to be a whole number between -${SLOT_CORRECTIE_MAX} and ${SLOT_CORRECTIE_MAX}, and not zero.`
    ) }), 400);
  }
  if (!reden) {
    return html(page({ title: 'Admin', body: errorBody(
      'A slot adjustment needs a reason. It is the only record of why this customer has more or fewer slots than his plan gives, and in three months it is the first thing anyone asks.'
    ) }), 400);
  }

  const sub = await loadSubscription(env, customerId);
  if (!sub) return html(page({ title: 'Admin', body: errorBody('This customer has no subscription to adjust.') }), 400);

  const maand = monthKey();
  /* De rij van DEZE maand, en aanmaken als hij er nog niet is. Dat laatste is
     geen zeldzaam geval maar juist het gewone: een klant wiens incasso mislukte
     heeft geen rij voor deze maand, en dat is precies wanneer je hem met de hand
     iets wilt geven. INSERT OR IGNORE en daarna de UPDATE — dezelfde vorm als
     grantSlots(), zodat twee tabbladen samen niet twee rijen maken. */
  await env.DB.prepare(
    `INSERT OR IGNORE INTO subscription_slots (subscription_id, month, kind, granted, used)
     VALUES (?1, ?2, ?3, 0, 0)`
  ).bind(sub.id, maand, soort).run().catch(() => {});

  const gezet = await env.DB.prepare(
    `UPDATE subscription_slots SET granted = granted + ?4
      WHERE subscription_id = ?1 AND month = ?2 AND kind = ?3
        AND granted + ?4 >= used
        AND granted + ?4 >= 0
      RETURNING granted, used`
  ).bind(sub.id, maand, soort, ruw).first().catch((e) => {
    console.error('[admin] slotcorrectie mislukt —', e?.message || e);
    return null;
  });

  if (!gezet) {
    await logAdmin(env, admin, 'plan-slots-correctie.geweigerd', {
      customerId, detail: `${sub.ref}: ${ruw > 0 ? '+' : ''}${ruw} ${soort} — geweigerd (er staat al meer vastgezet dan dit toelaat)`,
    }).catch(() => {});
    return html(page({ title: 'Admin', body: errorBody(
      'That would put the balance below what is already locked. Slots that are locked have work promised against them, so they cannot be taken away.'
    ) }), 400);
  }

  await logAdmin(env, admin, 'plan-slots-correctie', {
    customerId,
    detail: `${sub.ref}: ${ruw > 0 ? '+' : ''}${ruw} ${soort} in ${maand} — ${reden} (nu ${gezet.granted} toegekend, ${gezet.used} vastgezet)`,
  });
  return seeOther(terug);
}

async function handleStartWeek(context, customerId, admin) {
  const { env } = context;
  const terug = `/admin/customers/${customerId}#week`;
  if (!Number.isInteger(customerId)) return seeOther('/admin/customers');

  const r = await startPlanWindow(env, customerId);
  if (r.ok) {
    await logAdmin(env, admin, 'plan-week-start', {
      customerId, orderId: r.orderId,
      detail: `${r.aantal} product(en) → ${r.ref}`,
    });
    return seeOther(terug);
  }
  await logAdmin(env, admin, 'plan-week-geen-start', { customerId, detail: r.reden || 'onbekend' });
  return seeOther(terug);
}

async function handleCustomerSigninLink(context, customerId) {
  const { env } = context;
  const admin = await currentAdmin(context);
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const customer = await env.DB.prepare(
    'SELECT id, email, brand, name, deactivated_at FROM customers WHERE id = ?1'
  ).bind(customerId).first();
  if (!customer) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);
  if (!customer.email) {
    return html(page({ title: 'Admin', body: errorBody('This customer has no email address on it.') }), 400);
  }
  if (customer.deactivated_at) {
    return html(page({ title: 'Admin', body: errorBody(
      'This account is deactivated, so a sign-in link would let them straight back in. Reactivate it first if that is what you want.'
    ) }), 400);
  }

  let verstuurd = false;
  let fout = '';
  try {
    /* De signatuur is (env, request, email, lang) — het adres wordt gebruikt om de
       klant op te zoeken, dus lowercase erin zoals de publieke kant het ook doet. */
    verstuurd = await sendLoginLink(env, context.request, String(customer.email).toLowerCase(), 'nl');
  } catch (err) {
    fout = err?.message || String(err);
  }

  await logAdmin(env, admin, 'customer.signin_link', {
    customerId,
    detail: verstuurd ? 'inloglink verstuurd' : `inloglink NIET verstuurd${fout ? `: ${fout}` : ''}`,
  });

  if (!verstuurd) {
    return html(page({ title: 'Admin', body: errorBody(
      `The sign-in link did not go out${fout ? `: ${esc(fout)}` : ''}. Nothing is broken on the customer's side — they can still use the sign-in form themselves.`
    ) }), 502);
  }
  return seeOther(`/admin/customers/${customerId}?signin=1`);
}

async function renderCustomer(context, customerId) {
  const { env } = context;
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const customer = await env.DB.prepare(
    `SELECT id, email, brand, name, phone, website, vat_number, created_at,
            deactivated_at, deactivated_reason, merged_into,
            revisions_revoked_at, revisions_revoked_note,
            (SELECT COUNT(*) FROM revision_requests rr WHERE rr.customer_id = customers.id) AS revisions_asked,
            (SELECT COUNT(*) FROM revision_requests rr WHERE rr.customer_id = customers.id AND rr.resolved_at IS NULL) AS revisions_open
       FROM customers WHERE id = ?1`
  ).bind(customerId).first();
  if (!customer) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const [orders, models, locks, credits] = await Promise.all([
    /* `has_invoice` erbij, 12 augustus 2026: het AVG-paneel onderaan moet kunnen
       zeggen wat er WEL blijft staan, en dat hangt hieraan. Een subselect en geen
       vierde query — het is één vlag per rij en die past in de query die er al was. */
    env.DB.prepare(
      `SELECT o.id, o.ref, o.service, o.status, o.payment_status, o.total_cents,
              o.product_count, o.created_at,
              (SELECT COUNT(*) FROM invoices i WHERE i.order_id = o.id)
              + (SELECT COUNT(*) FROM credit_notes c WHERE c.order_id = o.id) AS has_invoice
         FROM orders o WHERE o.customer_id = ?1 ORDER BY o.id DESC LIMIT 100`
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
    env.DB.prepare(
      `SELECT id, label, status, preview_key, hidden_at, hidden_reason
         FROM custom_models WHERE customer_id = ?1 ORDER BY id DESC`
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
    env.DB.prepare(
      `SELECT l.style, l.roster_model, l.background_hex, m.label AS custom_label
         FROM customer_style_locks l LEFT JOIN custom_models m ON m.id = l.custom_model_id
        WHERE l.customer_id = ?1`
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
    /* HET TEGOED, als lijst en niet als saldo. Het saldo is de som en die wordt
       hieronder geteld; wat de studio nodig heeft is de reden per boeking, want dat is
       de vraag die een klant stelt. `.catch(() => [])` omdat migratie 0027 later kan
       draaien dan deze deploy — dezelfde afspraak als bij elke andere jonge tabel hier:
       geen tabel betekent geen boekingen en niet een kapotte klantpagina. */
    env.DB.prepare(
      `SELECT c.id, c.delta_cents, c.reason, c.created_at, c.order_id, a.email AS admin_email,
              o.ref AS order_ref
         FROM customer_credits c
         LEFT JOIN admin_users a ON a.id = c.admin_id
         LEFT JOIN orders o ON o.id = c.order_id
        WHERE c.customer_id = ?1 ORDER BY c.id DESC LIMIT 100`
    ).bind(customerId).all().then((r) => r.results || []).catch(() => []),
  ]);

  // THE BRAND KIT, READ-ONLY AND ON PURPOSE. The customer owns these settings
  // in their own portal; the studio needs to SEE them before producing, not
  // edit them behind the customer's back. A studio that can silently change a
  // brand's standing preference is a studio that will get blamed for a change
  // nobody made.
  const lockRows = locks.length
    ? `<table class="files"><thead><tr><th>Service</th><th>Face</th><th>Background</th></tr></thead><tbody>
       ${locks.map((l) => `<tr><td>${esc(l.style)}</td>
         <td>${esc(l.custom_label || l.roster_model || '—')}</td>
         <td>${esc(l.background_hex || '—')}</td></tr>`).join('')}</tbody></table>`
    : '<p class="empty">No standing preferences set. Every order asks from scratch.</p>';

  // WHAT MAKES A MODEL ORDERABLE, spelled out on the card rather than left to
  // be learned. Two conditions, both visible here: it needs a picture, and it
  // has to be past 'in_design'. account.js's /account/me applies exactly that
  // filter, so a model failing either one is invisible to the customer — and a
  // studio that cannot see WHY is a studio that files a bug.
  const MODEL_STATUSES = ['in_design', 'approved', 'locked'];
  const modelRows = models.length
    ? models.map((m) => {
      /* VERBORGEN GAAT VOOR ALLES. Een model dat verborgen is, is voor de klant weg —
         ongeacht zijn status en of er een foto bij zit. Zou de status hier de
         bovenhand hebben, dan staat er "Live" bij een model dat niemand ziet. */
      const hidden = !!m.hidden_at;
      const live = !hidden && m.preview_key && m.status !== 'in_design';
      const missing = hidden
        ? 'Verborgen — de klant ziet dit model niet. Alles blijft bewaard.'
        : !m.preview_key
          ? 'No picture yet — the customer cannot pick it.'
          : m.status === 'in_design'
            ? 'Still in design — the customer cannot pick it.'
            : 'Live: the customer sees this as a tile when they order.';
      return `<div class="card modelcard${hidden ? ' is-superseded' : ''}" id="model-${m.id}">
        <div class="row-head"><span class="ref">${esc(m.label)}</span><span class="pill${live ? ' is-delivered' : ''}">${hidden ? 'verborgen' : esc(m.status)}</span></div>
        <div class="modelcard-body">
          <!-- THE PICTURE ITSELF, not just the fact that a key exists. Before
               this the studio uploaded a file and got back a sentence saying a
               file was there — no way to see WHICH file, whether it was the
               right crop, or whether it was the right person. The customer saw
               the face and the studio did not. /admin/models/:id/image is that
               view, admin-authenticated, reading the key off the row exactly
               like every other file route here. -->
          ${m.preview_key
            ? `<img class="modelcard-img" src="/admin/models/${m.id}/image" alt="${esc(m.label)}" width="300" height="400" loading="lazy" decoding="async">`
            : '<span class="modelcard-img is-blank">no picture</span>'}
          <div class="modelcard-side">
            <p class="meta">${esc(missing)}</p>
            <form class="stack" method="post" action="/admin/models/${m.id}/preview" enctype="multipart/form-data">
              <input type="file" name="preview" accept="image/*" required />
              <!-- ONE ACTION, NOT TWO. Uploading the picture and making the
                   model orderable used to be separate forms with an undeclared
                   dependency between them: a face could sit in the customer's
                   account invisible for days because the status was still
                   'in_design' and nothing said so at the moment of upload. It
                   ships checked because uploading the photograph IS the moment
                   the model becomes real; unticking it is how you stage one
                   that is not ready to be seen. -->
              <label class="checkline">
                <input type="checkbox" name="publish" value="1" checked>
                <span>Show it in the customer's account straight away${m.status === 'in_design' ? '' : ' (already visible)'}</span>
              </label>
              <button class="btn btn-ghost" type="submit">${m.preview_key ? 'Replace picture' : 'Add picture'}</button>
            </form>
          </div>
        </div>
        <form class="controls" method="post" action="/admin/models/${m.id}/status">
          <select name="status">${MODEL_STATUSES.map((st) =>
            `<option value="${st}"${st === m.status ? ' selected' : ''}>${st}</option>`).join('')}</select>
          <button class="btn btn-ghost" type="submit">Set status</button>
        </form>

        <!-- ── HERNOEMEN, VERBERGEN, VERWIJDEREN — 12 augustus 2026 ────────────
             Lucas' eigen voorbeeld: "nu kan een per ongeluk toegevoegd model er niet
             meer uit." Verwijderen kon inderdaad niet, hernoemen kon niet, en
             verbergen kon alleen door de STATUS op 'in_design' te zetten — wat de
             klant in zijn eigen portaal leest als "jullie zijn er nog mee bezig".
             Twee vragen die niets met elkaar te maken hebben, hoorden niet in één
             veld. Zie migrations/0027 en handleModelManage(). -->
        <form class="controls" method="post" action="/admin/models/${m.id}/manage">
          <label class="sr-only" for="mn-${m.id}">Naam</label>
          <input id="mn-${m.id}" name="label" type="text" maxlength="80" required class="in-grow"
                 value="${esc(m.label || '')}">
          <button class="btn btn-ghost" type="submit" name="action" value="rename">Hernoemen</button>
        </form>

        ${hidden
          ? `<form class="controls" method="post" action="/admin/models/${m.id}/manage">
               ${m.hidden_reason ? `<span class="meta">${esc(m.hidden_reason)}</span>` : ''}
               <button class="btn btn-primary" type="submit" name="action" value="unhide">Weer zichtbaar maken</button>
             </form>`
          : `<form class="controls" method="post" action="/admin/models/${m.id}/manage">
               <label class="sr-only" for="mh-${m.id}">Reden</label>
               <input id="mh-${m.id}" name="reason" type="text" maxlength="300" required class="in-grow"
                      placeholder="Waarom verbergen — verplicht, en dit is wat je over drie maanden leest">
               <button class="btn btn-ghost" type="submit" name="action" value="hide">Verbergen</button>
             </form>`}

        <details class="danger">
          <summary>Dit model verwijderen</summary>
          <div class="danger-body">
            <p class="meta">Verbergen is omkeerbaar, dit niet: de rij gaat weg en het portret gaat uit R2. Een vaste
            look die naar dit model wees, wordt losgelaten.</p>
            <form method="post" action="/admin/models/${m.id}/manage">
              <input type="text" name="confirm" required autocomplete="off"
                     placeholder="Type ${esc(m.label || '')} to confirm">
              <button class="btn btn-ghost btn-sm" type="submit" name="action" value="delete">Verwijderen</button>
            </form>
          </div>
        </details>
      </div>`;
    }).join('')
    : '<p class="empty">No models of their own yet. Every order still includes one of the ten standard faces.</p>';

  const orderRows = orders.length
    ? `<table class="files"><thead><tr><th>Ref</th><th>Service</th><th>Status</th><th>Payment</th><th class="num">Net</th><th>Placed</th></tr></thead><tbody>
       ${orders.map((o) => `<tr>
         <td><a href="/admin/orders/${o.id}/files">${esc(o.ref)}</a></td>
         <td>${esc(o.service)}${o.product_count ? ` · ${o.product_count}` : ''}</td>
         <td>${esc(o.status)}</td>
         <td>${esc(o.payment_status)}</td>
         <td class="num">${o.total_cents ? '€' + (o.total_cents / 100).toFixed(2) : '—'}</td>
         <td>${esc((o.created_at || '').slice(0, 10))}</td>
       </tr>`).join('')}</tbody></table>`
    : '<p class="empty">No orders yet.</p>';

  /*
   * REVISIERECHTEN — het enige knopje op deze pagina dat iets van de klant
   * afneemt, dus het staat er met zijn cijfers naast in plaats van kaal.
   *
   * Twee getallen: hoe vaak dit merk ooit een revisie vroeg, en hoeveel er nu
   * openstaan. Zonder die twee is intrekken een oordeel op gevoel, en dit is
   * precies het besluit waarvan je over drie maanden wilt kunnen uitleggen
   * waarom je het nam.
   *
   * De reden is verplicht bij intrekken; teruggeven kan met één klik, omdat de
   * stap na intrekken meestal een gesprek is en dat gesprek vaak goed afloopt.
   */
  /*
   * ── DE ABONNEMENTSWEEK ───────────────────────────────────────────────────
   *
   * Lucas: *"Hoe werkt 'jouw lijst' nou precies want hier zit toch helemaal geen
   * werkend systeem achter."* Hij had gelijk — zie de kop van planStart.js. Dit
   * paneel is de andere helft van die reparatie: zonder een plek waar hij ZIET
   * wat er op iemands lijst staat, is een knop om die lijst te starten een knop
   * in het donker.
   *
   * WAT ER STAAT, EN IN DEZE VOLGORDE: hoeveel er klaarstaat (met foto's),
   * hoeveel er wacht omdat het saldo op is, hoeveel er hangt omdat er geen
   * foto's zijn, en dan pas de knop. De uitzondering staat vóór de handeling,
   * want juist die twee getallen bepalen of drukken nu verstandig is.
   *
   * GEEN PANEEL ZONDER ABONNEMENT. Een lege doos met "geen abonnement" erin is
   * ruis op een pagina die Lucas dagelijks doorbladert.
   */
  const abo = await planState(env, customerId).catch(() => null);
  const weekPanel = !abo?.sub ? '' : (() => {
    const klaar = klaarOmTeStarten(abo);
    const open = (abo.wachtrij || []).filter((q) => !q.taken_at && !q.order_id);
    /* ── WAT HIER STAAT IS "VASTGEZET", EN NIET "HEEFT FOTO'S" — 0035 ────────
       De regel las het uploadveld en noemde dat klaar. Sinds het slotmodel is
       dat de halve waarheid: foto's zijn een VOORWAARDE om vast te zetten, maar
       pas het vastzetten door de klant betaalt het slot en geeft ons toestemming
       om het te maken. Een lijst die "foto's klaar" zegt bij een concept, laat
       Lucas werk starten waar de klant nog aan sleutelt. */
    const rijen = open.length
      ? `<ol class="qlist">${open.map((q) => `<li>
           <span>${esc(q.name || '')}</span>
           <span class="meta">${q.locked_at
             ? `vastgezet &middot; ${esc(kindLabel(q.kind, 'nl'))}`
             : (String(q.upload_batch || '').trim() ? 'concept, foto&rsquo;s klaar' : 'concept, nog geen foto&rsquo;s')}</span>
         </li>`).join('')}</ol>`
      : '<p class="empty">De lijst is leeg.</p>';
    /* Het saldo per soort, uit dezelfde slotBalans() die de klant op zijn eigen
       scherm ziet. Eén bron, twee schermen — anders gaan ze uit elkaar lopen. */
    const saldoRegel = (abo.slots || []).length
      /* `13 × complete bundel` en niet `13 complete bundel`. De labels in
         SLOT_KINDS staan in het enkelvoud omdat ze op de klantkant als KOP boven
         een regel staan; er een getal voor plakken maakt er een telling van die
         niet meer klopt. Het maalteken laat het label met rust en leest in een
         adminpaneel als wat het is. */
      ? (abo.slots || []).map((b) => `${b.saldo} &times; ${esc(kindLabel(b.kind, 'nl').toLowerCase())}${b.ouder ? ` (${b.ouder} doorgeschoven)` : ''}`).join(' &middot; ')
      : 'geen slots deze maand';
    const kan = abo.sub.status === 'active' && klaar.items.length > 0;

    /* ── DE CORRECTIEKNOP, DICHTGEKLAPT ────────────────────────────────────────
     *
     * In een <details> en niet open, want dit is de knop die je twee keer per
     * jaar nodig hebt en de rest van het jaar niet wilt zien. <details> werkt
     * zonder script en met een toetsenbord — hetzelfde als de accordeons op de
     * site.
     *
     * DE SOORTEN KOMEN UIT HET PLAN ÉN UIT DE BALANS, samengevoegd. Uit het plan
     * alleen zou een soort missen die ooit met de hand is bijgezet en niet meer
     * in het plan zit; uit de balans alleen zou een soort missen waarvoor deze
     * maand nog niets is toegekend — en dat is juist het geval waarin je hier
     * komt, want een mislukte incasso laat precies zo'n leegte achter. */
    const soorten = [...new Set([
      ...Object.keys(slotsFor(abo.plan)),
      ...(abo.slots || []).map((b) => b.kind),
    ])];
    const slotCorrectie = !soorten.length ? '' : `
    <details class="slotfix">
      <summary>Slots bijstellen</summary>
      <form method="post" action="/admin/customers/${customer.id}/slots">
        <label for="sf-kind">Soort</label>
        <select id="sf-kind" name="kind">${soorten.map((k) =>
          `<option value="${esc(k)}">${esc(kindLabel(k, 'nl'))}</option>`).join('')}</select>
        <label for="sf-delta">Erbij of eraf</label>
        <input id="sf-delta" name="delta" type="number" step="1" min="-50" max="50" value="1" required>
        <label for="sf-reason">Waarom</label>
        <input id="sf-reason" name="reason" type="text" maxlength="200" required
               placeholder="bv. incasso van juli kwam alsnog binnen">
        <button class="btn btn-sm" type="submit">Bijstellen</button>
      </form>
      <p class="meta">Past <code>granted</code> aan van de lopende maand &mdash; niet <code>used</code>, want wat al vastgezet is hoort zichtbaar te blijven. Eraf halen kan niet onder wat er vastgezet staat: daar is werk tegenover beloofd. Elke bijstelling komt met reden en al in het adminlogboek.</p>
    </details>`;

    return `
  <div class="card" id="week">
    <div class="row-head">
      <span class="ref">Abonnement &middot; ${esc(abo.sub.plan)}</span>
      <span class="meta">${esc(abo.sub.status)}${abo.sub.window_day ? ` &middot; week vanaf de ${abo.sub.window_day}e` : ''}
        &middot; ${saldoRegel} over</span>
    </div>
    ${rijen}
    <p class="meta">${klaar.items.length} vastgezet en klaar om te starten${
      klaar.concepten ? ` &middot; ${klaar.concepten} nog concept` : ''}</p>
    ${kan
      ? `<form method="post" action="/admin/customers/${customer.id}/week">
           <button class="btn btn-primary" type="submit">Start deze week &middot; ${klaar.items.length} product${klaar.items.length === 1 ? '' : 'en'}</button>
         </form>
         <p class="meta">Maakt &eacute;&eacute;n bestelling met ${klaar.items.length} product${klaar.items.length === 1 ? '' : 'en'}. De slots zijn al afgeschreven toen de klant ze vastzette, dus hier gaat er niets meer af. Twee keer drukken pakt niets dubbel.</p>`
      : `<p class="meta">Er valt nu niets te starten.${
          abo.sub.status !== 'active' ? ' Het abonnement staat niet op actief.' : ''}${
          abo.sub.status === 'active' && klaar.concepten ? ` Er staan ${klaar.concepten} concept${klaar.concepten === 1 ? '' : 'en'} op de lijst die de klant nog niet heeft vastgezet.` : ''}</p>`}
    ${slotCorrectie}
  </div>`;
  })();

  const revoked = Boolean(customer.revisions_revoked_at);
  const revisionsPanel = `
  <div class="card${revoked ? ' is-attention' : ''}">
    <div class="row-head">
      <span class="ref">Revisies</span>
      <span class="meta">${customer.revisions_asked}× aangevraagd${customer.revisions_open ? ` · ${customer.revisions_open} open` : ''}</span>
    </div>
    ${revoked
      ? `<p class="meta">Ingetrokken op ${esc(when(customer.revisions_revoked_at))}.</p>
         ${customer.revisions_revoked_note ? `<div class="note">${esc(customer.revisions_revoked_note)}</div>` : ''}
         <form method="post" action="/admin/customers/${customer.id}/revisions">
           <button class="btn btn-primary" type="submit" name="action" value="restore">Rechten teruggeven</button>
         </form>`
      : `<p class="meta">Deze klant kan revisies aanvragen. Duidelijke fouten van ons lossen we altijd op — intrekken is voor misbruik.</p>
         <form method="post" action="/admin/customers/${customer.id}/revisions" class="revoke-form">
           <label class="sr-only" for="revoke-note">Reden</label>
           <input id="revoke-note" name="note" type="text" maxlength="500" placeholder="Reden — komt hier te staan, niet bij de klant" required>
           <button class="btn btn-ghost" type="submit" name="action" value="revoke">Rechten intrekken</button>
         </form>`}
  </div>`;

  /*
   * HET AVG-VERZOEK. Lucas: *"eén knop op de klantpagina, met bevestiging
   * waarin je de merknaam moet overtypen."*
   *
   * Hij staat onderaan, dichtgeklapt, met uitgeschreven wat er weggaat en wat
   * er blijft — want dat laatste is waar de vraag over gaat als de klant later
   * belt.
   *
   * ── DE TEKST IS OP 12 AUGUSTUS 2026 ONWAAR GEWORDEN EN NU RECHTGEZET ───────
   *
   * Er stond "Everything of this brand, gone" met als enige uitzondering een
   * geanonimiseerde factuurregel. Sinds er echte facturen bestaan (migratie 0021) is
   * dat niet meer waar: een uitgereikte factuur blijft staan, met de naam en het
   * adres in zijn momentopname, omdat art. 17 lid 3 sub b AVG daar ruimte voor laat
   * en de fiscale bewaarplicht dat vraagt. Zie de noot bij handleCustomerWipe().
   *
   * Een paneel dat meer belooft dan de knop doet, is het paneel waar je op wordt
   * afgerekend — precies dezelfde regel als bij de beveiligingsparagraaf van de
   * verwerkersovereenkomst. Dus staat het er nu apart: wat verdwijnt, en wat blijft.
   */
  const billedCount = orders.filter((o) => Number(o.has_invoice || 0) > 0).length;
  const paidCount = orders.filter((o) => o.payment_status === 'paid'
    && Number(o.total_cents || 0) > 0 && !Number(o.has_invoice || 0)).length;
  const wipeName = (customer.brand || customer.name || customer.email || '').trim();
  const wipePanel = `
<details class="danger">
  <summary>Erase this customer (GDPR request)</summary>
  <div class="danger-body">
    <div class="danger-block is-worst">
      <h4>Alles van dit merk weg, op één uitzondering</h4>
      <p class="meta"><strong>Wat verdwijnt.</strong>
        ${orders.length - billedCount} bestelling${orders.length - billedCount === 1 ? '' : 'en'} volledig,
        elk aangeleverd en geleverd bestand in R2, de merkmodellen en hun portretten, de vaste voorkeuren,
        elke inlogsessie en elk token, de berichten uit het contactformulier, en de nieuwsbriefaanmelding.
      </p>
      <p class="meta"><strong>Wat blijft.</strong>
        ${billedCount
          ? `${billedCount} bestelling${billedCount === 1 ? '' : 'en'} met een uitgereikte factuur of creditnota.
             Die bestelling${billedCount === 1 ? '' : 'en'} word${billedCount === 1 ? 't' : 'en'} uitgekleed —
             naam, e-mail, telefoon, adres en btw-nummer eruit — maar de factuur zelf blijft, met de gegevens
             die erop staan. Dat is geen keuze: art. 17 lid 3 sub b AVG laat het recht op vergetelheid wijken
             voor een wettelijke bewaarplicht, en een factuur zonder naam is geen geldige factuur.`
          : 'Er is nooit een factuur uitgereikt, dus er blijft aan die kant niets staan.'}
        ${paidCount
          ? `Plus ${paidCount} geanonimiseerde archiefregel${paidCount === 1 ? '' : 's'} — referentie, bedrag,
             btw en datum, geen naam — voor betaald geld waar géén factuur bij hoort.`
          : ''}
      </p>
      <p class="meta">Er is geen ongedaan maken.</p>
      <form method="post" action="/admin/customers/${customer.id}/wipe">
        <input type="text" name="confirm" required autocomplete="off" placeholder="Type ${esc(wipeName)} to confirm">
        <button class="btn btn-ghost btn-sm" type="submit">Erase everything</button>
      </form>
    </div>
  </div>
</details>`;


  /* ── BLOK 5: DE PANELEN, 12 AUGUSTUS 2026 ──────────────────────────────────
     Vier stukken die het paneel van lezen naar corrigeren brengen. De redenering
     per handeling staat bij de handlers boven deze functie; hier staat alleen
     waarom het scherm er zo uitziet. */

  /*
   * HET AANMELDMOMENT. `customers.created_at` werd op twee plekken netjes
   * geselecteerd en daarna weggegooid — een dode SELECT. Het staat nu in de lede,
   * want "sinds wanneer is dit een klant" is de eerste vraag bij elk telefoontje.
   */
  const sinds = customer.created_at ? when(customer.created_at) : null;

  /*
   * GEDEACTIVEERD IS EEN TOESTAND DIE JE BOVENAAN WILT ZIEN en niet onderaan
   * moet vinden. Zonder deze strook zou je een klant kunnen zitten helpen die al
   * twee weken niet meer kan inloggen, en dat pas merken als hij het zegt.
   */
  const statusPanel = customer.deactivated_at
    ? `<div class="panel is-warn">
         <p><strong>Dit account is gedeactiveerd</strong> op ${esc(when(customer.deactivated_at))}. De klant kan niet
         inloggen en niet bestellen. De bestellingen, facturen en geschiedenis staan er nog.</p>
         ${customer.deactivated_reason ? `<div class="note">${esc(customer.deactivated_reason)}</div>` : ''}
         ${customer.merged_into
           ? `<p class="meta">Hoort bij <a href="/admin/customers/${customer.merged_into}">klant #${customer.merged_into}</a>
              — er is niets verplaatst, dit is alleen de verwijzing.</p>`
           : ''}
         <form method="post" action="/admin/customers/${customer.id}/status">
           <button class="btn btn-primary" type="submit" name="action" value="reactivate">Weer activeren</button>
         </form>
       </div>`
    : `<details>
         <summary>Account deactiveren</summary>
         <div class="danger-body">
           <p class="meta">Geen verwijdering: alles blijft staan, en het is met één klik terug te draaien. Wat er
           verdwijnt is inloggen en bestellen — en zijn openstaande sessies en inloglinks gaan er meteen uit,
           anders werkt hij door tot zijn sessie verloopt.</p>
           <form class="stack" method="post" action="/admin/customers/${customer.id}/status">
             <label for="deact-reason">Reden <span class="req">*</span></label>
             <input id="deact-reason" name="reason" type="text" maxlength="300" required
                    placeholder="Dubbele registratie — gebruikt het andere adres">
             <label for="deact-merge">Hoort bij klantnummer <span class="pl-opt">optioneel</span></label>
             <input id="deact-merge" name="merged_into" type="text" inputmode="numeric" maxlength="9"
                    placeholder="bijv. 42">
             <span class="hint">Alleen een verwijzing. Er worden geen bestellingen of facturen verplaatst.</span>
             <button class="btn btn-ghost" type="submit" name="action" value="deactivate">Deactiveren</button>
           </form>
         </div>
       </details>`;

  /*
   * DE GEGEVENS, ALS FORMULIER EN NIET ALS TEKST. Dit ontbrak volledig: de twee
   * UPDATE-statements op `customers` in dit bestand raakten uitsluitend de
   * revisierechten. Een verkeerd btw-nummer bleef dus fout op elke volgende factuur,
   * en de btw-reviewpagina helpt daar niet — die beslist per BESTELLING.
   *
   * Ingeklapt, want negen van de tien keer kom je hier om te kijken en niet om te
   * wijzigen. Het e-mailadres staat er als `required` bij: dat is de inlogsleutel.
   */
  const detailsPanel = `
<details>
  <summary>Gegevens corrigeren</summary>
  <div class="danger-body">
    <p class="meta">De klant kan dit zelf in zijn portaal; jij kon het tot vandaag niet. Leeg laten maakt een veld
    leeg — behalve het e-mailadres, want daarmee logt hij in.</p>
    <form class="stack" method="post" action="/admin/customers/${customer.id}/details">
      <label for="cd-email">E-mailadres <span class="req">*</span></label>
      <input id="cd-email" name="email" type="email" maxlength="200" required value="${esc(customer.email || '')}">
      <label for="cd-brand">Merknaam</label>
      <input id="cd-brand" name="brand" type="text" maxlength="120" value="${esc(customer.brand || '')}">
      <label for="cd-name">Naam</label>
      <input id="cd-name" name="name" type="text" maxlength="120" value="${esc(customer.name || '')}">
      <label for="cd-phone">Telefoon</label>
      <input id="cd-phone" name="phone" type="text" maxlength="40" value="${esc(customer.phone || '')}">
      <label for="cd-website">Website</label>
      <input id="cd-website" name="website" type="text" maxlength="200" value="${esc(customer.website || '')}">
      <label for="cd-vat">Btw-nummer</label>
      <input id="cd-vat" name="vat_number" type="text" maxlength="40" value="${esc(customer.vat_number || '')}">
      <span class="hint">Een fout btw-nummer staat op elke volgende factuur. Al uitgereikte facturen blijven zoals
      ze zijn — die corrigeer je met een creditnota, niet door de klantgegevens te wijzigen.</span>
      <button class="btn btn-primary" type="submit">Opslaan</button>
    </form>
  </div>
</details>`;

  /*
   * HET TEGOED. Lucas: *"alleen een ledger, geen verrekening."* Dus staat er een
   * saldo, een lijst met redenen, en een formulier — en nergens een belofte dat dit
   * bij het afrekenen automatisch verrekend wordt, want dat gebeurt niet.
   *
   * HET SALDO IS EEN SOM en geen kolom. Dat is precies waarom de reden per boeking
   * bestaat: "waar komt die vijfenveertig euro vandaan" is de vraag die je krijgt, en
   * een saldokolom kan die niet beantwoorden.
   */
  /* Geen `eur()` in dit bestand — de bedragen worden per plek geformatteerd (zie
     `money()` in renderFiles en de kolommen in de klantenlijst). Hier dus dezelfde
     vorm, één keer benoemd, in plaats van vier keer dezelfde uitdrukking. */
  const eur = (c) => `€${((Number(c) || 0) / 100).toFixed(2)}`;
  const creditTotal = (credits || []).reduce((n, c) => n + Number(c.delta_cents || 0), 0);
  const creditRows = (credits || []).length
    ? `<table class="tbl">
         <thead><tr><th>Wanneer</th><th class="num">Bedrag</th><th>Reden</th><th>Bestelling</th><th>Door</th></tr></thead>
         <tbody>${credits.map((c) => `
           <tr>
             <td>${esc(when(c.created_at))}</td>
             <td class="num">${Number(c.delta_cents) > 0 ? '+' : ''}${eur(c.delta_cents)}</td>
             <td>${esc(c.reason || '')}</td>
             <td>${c.order_ref ? `<a href="/admin/orders/${c.order_id}">${esc(c.order_ref)}</a>` : ''}</td>
             <td class="meta">${esc(c.admin_email || '')}</td>
           </tr>`).join('')}
         </tbody>
       </table>`
    : '<p class="meta">Nog geen boekingen.</p>';

  const creditPanel = `
<div id="tegoed">
  <p class="lede">Saldo: <strong>${eur(creditTotal)}</strong></p>
  <p class="meta">Dit wordt <strong>niet</strong> automatisch verrekend bij het afrekenen. Het is een boekhouding van wat
  je hebt toegezegd; verrekenen doe je met de hand op de factuur, zoals nu bij een annulering. Een verkeerde boeking
  corrigeer je met een tegenboeking — er is met opzet geen wijzigen en geen verwijderen, zodat het spoor blijft.</p>
  ${creditRows}
  <form class="controls" method="post" action="/admin/customers/${customer.id}/credits">
    <label class="sr-only" for="cr-amount">Bedrag in euro</label>
    <input id="cr-amount" name="amount" type="text" inputmode="decimal" maxlength="10" required
           placeholder="50 of -12,50" size="10">
    <label class="sr-only" for="cr-reason">Reden</label>
    <input id="cr-reason" name="reason" type="text" maxlength="300" required class="in-grow"
           placeholder="Reden — verplicht, en dit is wat je over drie maanden leest">
    <label class="sr-only" for="cr-order">Bestellingnummer</label>
    <input id="cr-order" name="order_id" type="text" inputmode="numeric" maxlength="9" placeholder="bestelling #" size="12">
    <button class="btn btn-primary" type="submit">Boeken</button>
  </form>
  <p class="meta">Positief is bijboeken, negatief is afboeken. Maximaal € 1.000 per boeking — die grens houdt een
  typefout van drie nullen tegen.</p>
</div>`;
  const body = `
  <p><a href="/admin/customers">&larr; Customers</a></p>
  <h1>${esc(customer.brand || customer.name || customer.email)}</h1>
  <p class="lede">${esc(customer.email)}${customer.vat_number ? ` · VAT ${esc(customer.vat_number)}` : ''}${customer.website ? ` · ${esc(customer.website)}` : ''}${sinds ? ` · klant sinds ${esc(sinds)}` : ''}</p>

  ${statusPanel}

  <h2>Gegevens</h2>
  ${detailsPanel}
  <!-- DE INLOGLINK. De infrastructuur lag er al (account_tokens, sendLoginLink, de
       mailweg); er was geen knop. Een klant die zijn link kwijt was moest het publieke
       formulier gebruiken, en als hij daar zijn eigen adres verkeerd typte, kwam hij in
       een lus terecht die de studio niet kon doorbreken. -->
  <form class="controls" method="post" action="/admin/customers/${customer.id}/signin-link">
    <button class="btn btn-ghost" type="submit">Nieuwe inloglink mailen</button>
  </form>
  <p class="meta">Gaat naar ${esc(customer.email || '')}. Dezelfde link als het publieke formulier maakt — geen tweede soort.</p>

  <h2>Tegoed</h2>
  ${creditPanel}

  ${weekPanel ? `<h2>Abonnementsweek</h2>${weekPanel}` : ''}

  <h2>Revisies</h2>
  ${revisionsPanel}

  <h2>Vaste look</h2>
  <p class="meta">Set by the customer in their own portal — the section they see as "Je vaste look". Read-only here, deliberately.</p>
  ${lockRows}

  <h2>Custom models</h2>
  ${modelRows}
  <!-- ONE FORM, NOT TWO. Lucas: "hier voeg ik dan de foto toe" — adding a
       model and giving it a face is one action in his head and it should be one
       action here. The photo is optional so a model can still be created before
       there is anything to show, but the common path is both at once. -->
  <form class="controls" method="post" action="/admin/customers/${customer.id}/models" enctype="multipart/form-data">
    <input type="text" name="label" placeholder="New brand model name (e.g. 'Nora')" class="in-grow" required>
    <input type="file" name="preview" accept="image/*">
    <button class="btn btn-primary" type="submit">Add brand model</button>
  </form>
  <p class="meta">Only you see this. The moment a model has a picture it appears as a tile the customer can pick when they place an order.</p>

  <h2>Orders</h2>
  ${orderRows}
  
  <h2>Danger zone</h2>
  ${wipePanel}
  `;
  return html(page({ title: customer.brand || customer.email, body }));
}

/**
 * A preview image for a custom model.
 *
 * custom_models.preview_key has existed since migration 0003 and nothing has
 * ever written to it — the same shape of gap orders.total_cents had. A brand
 * model with no picture is a label in a dropdown, which is exactly what the
 * customer's brand kit was reduced to before this.
 */
/**
 * Add a custom model from the customer page.
 *
 * The existing handler resolves a customer THROUGH an order, which is right
 * when you are looking at a job and wrong when you are looking at a brand — and
 * it cannot be used at all for a customer who has not ordered yet, which is
 * exactly when you would be setting one up.
 */
async function handleAddCustomModelForCustomer({ request, env }, customerId) {
  if (!Number.isInteger(customerId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad customer id.') }), 400);
  }
  const exists = await env.DB.prepare('SELECT id FROM customers WHERE id = ?1').bind(customerId).first();
  if (!exists) return html(page({ title: 'Admin', body: errorBody('No such customer.') }), 404);

  const form = await request.formData().catch(() => null);
  const label = String(form?.get('label') || '').trim().slice(0, 80);
  if (!label) return seeOther(`/admin/customers/${customerId}`);

  /*
   * ── RETURNING, EN NIET MEER TERUGLEZEN — 14 augustus 2026 ──────────────────
   *
   * Hier stond een INSERT, gevolgd door een SELECT ... ORDER BY id DESC LIMIT 1
   * op (customer, label), met de noot: *"D1 has no RETURNING here."* Dat is niet
   * waar — src/lib/ratelimit.js en src/lib/invoice.js draaien er allebei al op,
   * en die laatste doet er zijn factuurnummers mee.
   *
   * En het teruglezen was ook echt fout, niet alleen omslachtig. Twee modellen
   * met DEZELFDE naam voor dezelfde klant zijn toegestaan — er staat geen UNIQUE
   * op (customer_id, label) — en dan geeft `ORDER BY id DESC LIMIT 1` de nieuwste
   * terug. Dat is meestal de zojuist ingevoegde rij en niet altijd: staat er nog
   * een tabblad open, of wordt hetzelfde formulier twee keer verstuurd, dan
   * krijgt de tweede INSERT de foto van de eerste eroverheen — of preciezer, de
   * eerste rij blijft zonder afbeelding achter terwijl de tweede er twee sleutels
   * op ziet. Eén statement heeft dat gat niet.
   */
  const nieuw = await env.DB.prepare(
    "INSERT INTO custom_models (customer_id, label, status) VALUES (?1, ?2, 'in_design') RETURNING id"
  ).bind(customerId, label).first();

  /* ── HET MERKMODEL-TEGOED IS WEG MET DE CREDIT — 23 AUGUSTUS 2026 ─────────
     Hier stond boekMerkmodelTegoed(): één regel van € 1.250 in het grootboek op
     het moment dat het eerste merkmodel ontstond, zodat de belofte "€ 250 terug
     op elk van je eerste vijf bestellingen" niet van Lucas' geheugen afhing.

     Die belofte bestaat niet meer. Het merkmodel is sinds vandaag één bedrag van
     € 450 dat je één keer betaalt — zie de noot bij AMOUNT.brandModel in
     pricing.js. Een tegoed boeken voor iets wat niet verrekend wordt, is een
     grootboekregel die niemand kan verklaren.

     DE FUNCTIE IS VERWIJDERD EN NIET UITGESCHAKELD, om dezelfde reden als de
     export in pricing.js: code die blijft bestaan onder zijn oude naam, is code
     die over een half jaar per ongeluk weer wordt aangeroepen. Wie hem terug wil,
     vindt hem in git.

     BESTAANDE RIJEN BLIJVEN STAAN. Klanten die het tegoed al geboekt kregen,
     hebben het — het is een toezegging die is gedaan, en die intrekken omdat het
     aanbod veranderd is, is niet hoe dat werkt. Ze staan gewoon in
     customer_credits en verreken je met de hand, zoals elk ander tegoed. */

  const file = form && form.get('preview');
  if (file && typeof file === 'object' && file.size && env.UPLOADS) {
    const row = nieuw;
    if (row?.id) {
      const clean = String(file.name || 'preview').split(/[\\/]/).pop().slice(0, 100) || 'preview';
      const key = `models/${customerId}/${row.id}-${clean}`;
      await env.UPLOADS.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      });
      await env.DB.prepare('UPDATE custom_models SET preview_key = ?1 WHERE id = ?2')
        .bind(key, row.id).run();
    }
  }

  return seeOther(`/admin/customers/${customerId}`);
}

/**
 * Move a brand model between in_design, approved and locked.
 *
 * This is the switch that decides whether a customer can order against a face.
 * It exists because /account/me refuses to offer an 'in_design' model, and
 * without a control the studio could create a model, give it a picture, and
 * never understand why it did not appear.
 */
async function handleModelStatus({ request, env }, modelId) {
  if (!Number.isInteger(modelId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad model id.') }), 400);
  }
  const model = await env.DB.prepare(
    'SELECT id, customer_id FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!model) return html(page({ title: 'Admin', body: errorBody('No such model.') }), 404);

  const form = await request.formData().catch(() => null);
  const status = String(form?.get('status') || '');
  // The three the schema documents, checked rather than trusted: a status this
  // codebase does not know about would make the model invisible everywhere and
  // look like data loss.
  if (!['in_design', 'approved', 'locked'].includes(status)) {
    return seeOther(`/admin/customers/${model.customer_id}`);
  }

  await env.DB.prepare('UPDATE custom_models SET status = ?1 WHERE id = ?2')
    .bind(status, modelId).run();
  return seeOther(`/admin/customers/${model.customer_id}`);
}

/** Images only, and a ceiling. See handleModelPreview() for why both. */
const PREVIEW_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const PREVIEW_MAX_BYTES = 12 * 1024 * 1024;

async function handleModelPreview({ request, env }, modelId) {
  if (!Number.isInteger(modelId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad model id.') }), 400);
  }
  const model = await env.DB.prepare(
    'SELECT id, customer_id, status FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!model) return html(page({ title: 'Admin', body: errorBody('No such model.') }), 404);
  if (!env.UPLOADS) return html(page({ title: 'Admin', body: errorBody('No R2 binding.') }), 503);

  const form = await request.formData().catch(() => null);
  const file = form && form.get('preview');
  if (!file || typeof file !== 'object' || !file.size) {
    return seeOther(`/admin/customers/${model.customer_id}`);
  }

  // ── WHAT IS ALLOWED THROUGH, AND WHY IT IS CHECKED HERE ────────────────────
  //
  // `accept="image/*"` on the input is a file-picker filter and nothing more —
  // it is trivially bypassed and it is not a check. This IS the check, and it
  // matters more than usual because of where the bytes end up: on a tile in a
  // paying customer's own account. A PDF stored here renders as a broken image
  // in the brand kit, and addBrandModels() in pipeline.js REMOVES a tile whose
  // picture fails to load — so a bad upload becomes a face that silently is not
  // offered, which is precisely the class of bug this whole page exists to make
  // visible. An explicit list rather than a `startsWith('image/')`: image/svg+xml
  // is an image by that test and a script container in practice.
  const type = String(file.type || '').toLowerCase();
  if (!PREVIEW_TYPES.includes(type)) {
    return html(page({
      title: 'Admin',
      body: errorBody(
        `"${esc(String(file.name || 'that file'))}" is ${esc(type || 'of an unknown type')}. `
        + 'A brand model preview has to be a JPEG, PNG, WebP or AVIF — it is shown to the customer as a photograph.'
      ),
    }), 415);
  }
  if (file.size > PREVIEW_MAX_BYTES) {
    return html(page({
      title: 'Admin',
      body: errorBody(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The preview is drawn at about 400px wide in `
        + 'the customer\'s brand kit, so anything over 12 MB is bytes they wait for and never see.'
      ),
    }), 413);
  }

  const clean = String(file.name || 'preview').split(/[\\/]/).pop().slice(0, 100) || 'preview';
  const key = `models/${model.customer_id}/${modelId}-${clean}`;
  await env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: type },
  });

  // ── THE PICTURE AND THE PERMISSION, IN ONE WRITE ───────────────────────────
  //
  // A model is offered to the customer only when it has a preview AND its status
  // is past 'in_design' — /account/me applies both, and so does the brand kit's
  // own picker. Those were two forms on this page with an undeclared dependency
  // between them, which is a face uploaded on Monday and invisible until someone
  // remembers the dropdown on Thursday. The checkbox ships checked, so the
  // ordinary path is one action; unticking it stages a picture that is not ready
  // to be seen.
  //
  // Only ever 'in_design' -> 'approved'. A model already at 'locked' is left
  // where it is: locked is further along, and quietly walking it backwards
  // because someone replaced a photograph would be this handler deciding
  // something it was not asked to decide.
  const publish = form.get('publish') === '1';
  if (publish && model.status === 'in_design') {
    await env.DB.batch([
      env.DB.prepare('UPDATE custom_models SET preview_key = ?1, status = ?2 WHERE id = ?3')
        .bind(key, 'approved', modelId),
    ]);
  } else {
    await env.DB.prepare('UPDATE custom_models SET preview_key = ?1 WHERE id = ?2')
      .bind(key, modelId).run();
  }

  return seeOther(`/admin/customers/${model.customer_id}`);
}

/**
 * The brand model preview, served back to the studio.
 *
 * The customer has had this route since August 2026 (account.js's
 * handleModelPreviewImage) and the studio did not, which is backwards: the
 * people uploading the file could not see what they had uploaded. Same two
 * rules that route follows — the R2 key comes off the row and never from the
 * URL, and a miss is a 404 rather than a placeholder, so a broken preview looks
 * broken here rather than looking like a design decision.
 */
async function serveModelPreview({ env }, modelId) {
  if (!Number.isInteger(modelId)) return new Response('Bad id', { status: 400 });
  const row = await env.DB.prepare(
    'SELECT preview_key FROM custom_models WHERE id = ?1'
  ).bind(modelId).first();
  if (!row?.preview_key) return new Response('Not found', { status: 404 });
  if (!env.UPLOADS) return new Response('No bucket binding', { status: 503 });

  const obj = await env.UPLOADS.get(row.preview_key);
  if (!obj) return new Response('The object is not in the bucket', { status: 404 });

  return new Response(obj.body, {
    headers: {
      'content-type': obj.httpMetadata?.contentType || 'application/octet-stream',
      // Same as every other admin file route: never cached, never indexed.
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      'x-content-type-options': 'nosniff',
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM MODELS — task #271e, 2026-07-29
//
// custom_models had a reader (account.js's brand-lock picker, and the
// "owned?" check on the lock POST) but no writer anywhere in the codebase —
// grep for `INSERT INTO custom_models` before this change returns nothing.
// A brand could never have anything to lock a style to, and the portal's own
// "No custom models on your account yet — ask us to set one up" message had
// no admin-side action behind the "ask us" it names. This is that action:
// the smallest thing that unblocks it — a label, tied to the order’s
// customer — not a redesign of whatever the eventual "custom-models flow"
// (the one schema.sql's own comment on this table alludes to, that promotes
// a row from 'in_design' to 'approved' to 'locked') turns out to need.
// Every row created here starts 'in_design', schema.sql's own default;
// nothing here writes 'approved' or 'locked' — those two remain unreachable
// from any UI until that flow is actually designed, which is a separate,
// bigger decision than "let Lucas create the row" and is not made here.
// ─────────────────────────────────────────────────────────────────────────────

async function handleAddCustomModel({ request, env }, orderId) {
  const form = await request.formData().catch(() => null);
  const label = String(form?.get('label') || '').trim().slice(0, 200);

  if (!Number.isInteger(orderId)) {
    return html(page({ title: 'Admin', body: errorBody('Bad order id.') }), 400);
  }
  if (!label) {
    return html(page({ title: 'Admin', body: errorBody('A label is required to add a custom model.') }), 400);
  }

  const order = await env.DB.prepare('SELECT customer_id FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) return html(page({ title: 'Admin', body: errorBody('That order does not exist.') }), 404);
  if (!order.customer_id) {
    // Real, if rare: upsertCustomer() in functions/api/order.js runs inside a
    // safe() wrapper, so a DB hiccup at order time can leave orders.customer_id
    // NULL without failing the order itself. Nothing to attach a model to
    // until that’s fixed by hand — surfacing it beats a foreign-key 500.
    return html(page({ title: 'Admin', body: errorBody('This order has no linked customer account (customer_id is empty), so there is no brand to attach a custom model to.') }), 409);
  }

  await env.DB.prepare(
    "INSERT INTO custom_models (customer_id, label, status) VALUES (?1, ?2, 'in_design')"
  ).bind(order.customer_id, label).run();
  /* Hier stond de tweede aanroep van boekMerkmodelTegoed() — dit is de tweede
     plek waar een eerste merkmodel ontstaat. Weg met de credit zelf; zie de noot
     op de eerste plek, in handleAddCustomModel hierboven. */
  return seeOther('/admin');
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Is this request carrying a live admin session? Exported so a diagnostic
 * endpoint outside this file can stand behind the same login rather than
 * inventing a second, weaker gate — a debug route that reports on a payment
 * provider is not something to leave open to the internet, and a second shared
 * secret is one more thing to leak.
 *
 * Read-only by design: it deliberately does NOT touch last_used_at, because
 * hitting a debug page is not the admin using the dashboard and should not
 * extend a session's idle life.
 */
export async function hasAdminSession(context) {
  try {
    const { env, request } = context;
    if (!env?.DB) return false;
    const token = readSessionCookie(request);
    if (!token) return false;
    const row = await env.DB.prepare(
      'SELECT expires_at FROM admin_sessions WHERE token_hash = ?1'
    ).bind(await hashToken(token)).first();
    return !!row && Date.parse(normalizeStamp(row.expires_at)) > Date.now();
  } catch {
    return false;
  }
}

async function currentAdmin(context) {
  const { env, request, waitUntil } = context;
  const token = readSessionCookie(request);
  if (!token) return null;
  const hash = await hashToken(token);
  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.expires_at, a.id AS admin_id, a.email
       FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
      WHERE s.token_hash = ?1`
  ).bind(hash).first();
  if (!row) return null;
  if (Date.parse(normalizeStamp(row.expires_at)) <= Date.now()) return null;
  // Best-effort touch; a failed write here should not cost the request a 500,
  // hence the .catch() swallowing it. That alone was not enough: an unawaited
  // promise with nowhere else holding it can be dropped mid-flight the moment
  // this isolate finishes handing back the response — Workers make no promise
  // that a request handler's side effects outlive the response it returns.
  // portal.js's identical touch (bumpUse, in its own currentAdmin-equivalent
  // path) has always gone through `later(context, promise)` for exactly this
  // reason; this one didn't, found in the 2026-07-28 audit (task #263). Same
  // fix, same reasoning: register it with waitUntil so the runtime keeps the
  // isolate alive long enough for the UPDATE to actually land.
  later(waitUntil, env.DB.prepare('UPDATE admin_sessions SET last_used_at = datetime(\'now\') WHERE id = ?1')
    .bind(row.session_id).run().catch(() => {}));
  return row;
}

/** Fire-and-forget, when the runtime offers it. Mirrors portal.js's later(). */
function later(waitUntil, promise) {
  if (typeof waitUntil === 'function') waitUntil(promise);
}

/**
 * Files clients have flagged for a revision, most recent first — the inbox
 * Lucas asked for explicitly: "revisies binnen krijg wanneer klanten het in
 * hun portaal met een notitie aanvragen."
 */
/*
 * DE INBOX BLIJFT OP files.review_state STAAN, niet op revision_requests.
 *
 * Die laatste tabel (migrations/0010) is de geschiedenis en begint op de dag
 * dat hij is aangemaakt; review_state is de HUIDIGE toestand en geldt ook voor
 * elke aanvraag van daarvóór. Zou deze query op de log draaien, dan zou elke
 * openstaande revisie van vóór de migratie stilzwijgend uit het overzicht
 * verdwijnen — werk dat er is en dat niemand meer ziet. De log wordt er dus bij
 * gejoind in plaats van eroverheen gelegd.
 *
 * WAT DE LOG WÉL TOEVOEGT, en dat is het punt van Lucas' vraag: `asked` is hoe
 * vaak dit merk ooit een revisie heeft aangevraagd. Eén regel op een kaart, en
 * het verschil tussen "normale klant met een terecht punt" en "deze belt elke
 * levering" is af te lezen zonder ergens anders te gaan kijken.
 */
async function loadRevisionInbox(env) {
  const res = await env.DB.prepare(
    // product_key en shot komen sinds augustus 2026 mee: een revisie op
    // "IMG_8841.webp" is een zoekopdracht, een revisie op "product 3 ·
    // achterkant" is een opdracht. Dat is precies wat Lucas vroeg — meteen
    // weten welk bestand vervangen moet worden.
    `SELECT f.id AS file_id, f.filename, f.review_note, f.reviewed_at, f.preview_key,
            f.product_key, f.shot,
            o.id AS order_id, o.ref, o.brand, o.email, o.lang,
            o.customer_id,
            c.revisions_revoked_at,
            (SELECT COUNT(*) FROM revision_requests rr WHERE rr.customer_id = o.customer_id) AS asked,
            (SELECT COUNT(*) FROM revision_requests rr WHERE rr.file_id = f.id) AS asked_here
       FROM files f
       JOIN orders o ON o.id = f.order_id
       LEFT JOIN customers c ON c.id = o.customer_id
      WHERE f.review_state = 'revision_requested'
        AND o.hidden_at IS NULL AND f.superseded_at IS NULL
      ORDER BY f.reviewed_at DESC
      LIMIT 100`
  ).all();
  return res.results || [];
}

/**
 * Recent orders, active ones first — "duidelijk overzicht van wat er gedaan
 * moet worden."
 *
 * FILTERED IN SQL, NOT IN JS, and the difference matters here in a way it does
 * not in account.js. That page filters a customer's own orders in memory
 * because it already holds all of them. This query is capped at 200 rows across
 * every brand on the site, so filtering after the fact would mean "the received
 * orders among the 200 most recent" — which silently stops being "the received
 * orders" the moment the studio is busy. The cap has to apply to the filtered
 * set, so the WHERE has to be in the statement.
 *
 * `status` is validated by the caller against STATUSES before it arrives; this
 * function still treats anything falsy as "no filter" rather than binding it,
 * so a bug upstream shows up as an unfiltered list and never as a query with an
 * empty string in it.
 */
/**
 * De bestellingenlijst, met alles wat je erop kunt zoeken en filteren.
 *
 * Lucas: *"admin heeft geen zoekfunctie. Bij twintig bestellingen scroll je. Bij
 * tweehonderd niet."* En: *"vaste filters: openstaande revisies, onbetaald,
 * geleverd maar niet aangekondigd."*
 *
 * ALLES IN DE QUERY DIE OOK DE LIMIT DRAAGT. Dat was al de regel voor het
 * statusfilter en hij geldt hier net zo hard: na de LIMIT filteren betekent
 * "de onbetaalde bestellingen ónder de tweehonderd nieuwste", en dat houdt op
 * hetzelfde te zijn als "de onbetaalde bestellingen" op precies het moment dat
 * het druk is.
 *
 * VERBORGEN VALT WEG, TENZIJ JE ERNAAR VRAAGT. Een testbestelling van jezelf
 * hoort niet in de lijst en niet in de tellingen; hij hoort wél terug te vinden
 * te zijn, anders is verbergen hetzelfde als verwijderen met een omweg.
 */
async function loadOrders(env, status = '', { q = '', filter = '', hidden = false } = {}) {
  const clauses = [];
  const binds = [];
  if (status) { binds.push(status); clauses.push(`status = ?${binds.length}`); }
  if (!hidden) clauses.push('hidden_at IS NULL');

  // Zoeken op wat je in je hand hebt als je zoekt: een referentie uit een mail,
  // een merknaam uit een gesprek, of het e-mailadres waarmee iemand belt.
  if (q) {
    binds.push(`%${q}%`);
    const n = binds.length;
    clauses.push(`(ref LIKE ?${n} OR brand LIKE ?${n} OR email LIKE ?${n} OR name LIKE ?${n})`);
  }

  if (filter === 'revisions') {
    clauses.push("EXISTS (SELECT 1 FROM files f WHERE f.order_id = orders.id AND f.review_state = 'revision_requested')");
  } else if (filter === 'unpaid') {
    // Dezelfde uitsluiting als in de strook hierboven, en om dezelfde reden: een
    // afgebroken proefvisual is geen openstaande vordering. Staat de uitsluiting maar
    // op een van de twee plekken, dan wijst de chip een aantal aan en toont de lijst
    // erachter een ander -- wat erger is dan beide keuzes.
    clauses.push("payment_status = 'unpaid' AND total_cents > 0 AND service != 'test-sample'");
  } else if (filter === 'paid_undelivered') {
    // WAAR GELD DOORHEEN LOOPT, deel één: betaald en nog niet geleverd. Dat is
    // een belofte die openstaat, en de enige reden dat die lijst niet bestond
    // is dat je hem uit twee kolommen moet samenstellen die nooit naast elkaar
    // stonden.
    clauses.push("payment_status = 'paid' AND status IN ('received','in_production','human_check')");
  } else if (filter === 'delivered_unpaid') {
    // Deel twee, en de duurste: geleverd en nooit betaald. Dit is het enige
    // filter in dit dashboard dat over verlies gaat in plaats van over werk.
    clauses.push("status = 'delivered' AND payment_status != 'paid' AND total_cents > 0");
  } else if (filter === 'unannounced') {
    clauses.push(`delivery_mailed_at IS NOT NULL AND EXISTS (
      SELECT 1 FROM files f WHERE f.order_id = orders.id AND f.kind = 'delivery' AND f.announced_at IS NULL)`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = env.DB.prepare(
    // file_count added August 2026 so the Files link on each card can say how
    // many there are without a second query per order. A correlated subquery
    // rather than a join, because a join would multiply the order rows and
    // every column above would then need a GROUP BY it does not otherwise want.
    // delivered_at / delivery_mailed_at are read so the card can say whether
    // the customer was actually TOLD. They are two different facts and the
    // difference is not academic: the delivery mail is sent on a best-effort
    // path (see handleStatusUpdate's .catch), so "delivered" and "delivered and
    // announced" can and do come apart.
    `SELECT id, customer_id, ref, service, status, tier, brand, email, product_count,
            window_start, window_end, payment_status, total_cents, created_at,
            delivered_at, delivery_mailed_at, hidden_at, cancel_reason, cancel_payment,
            (SELECT COUNT(*) FROM files f WHERE f.order_id = orders.id) AS file_count
       FROM orders
      ${where}
      ORDER BY
        CASE status WHEN 'received' THEN 0 WHEN 'in_production' THEN 1
                    WHEN 'human_check' THEN 2 WHEN 'delivered' THEN 3
                    ELSE 4 END,
        id DESC
      LIMIT 200`
  );
  let res;
  try {
    res = await (binds.length ? stmt.bind(...binds) : stmt).all();
  } catch (err) {
    // hidden_at komt uit migratie 0014. Draait die nog niet, dan hoort de lijst
    // te laden zonder dat filter in plaats van helemaal niet te laden.
    if (!/hidden_at/.test(String(err?.message || err))) throw err;
    return loadOrdersLegacy(env, status, q);
  }
  const orders = res.results || [];

  /*
   * WAT IS ER GELEVERD MAAR NIET GEZEGD — als losse query, expres.
   *
   * Dit had een vijfde subquery in het SELECT hierboven kunnen zijn, en dan zou
   * de hele bestellingenlijst omvallen op een database waar migratie 0011 nog
   * niet gedraaid is: de lijst is het admin-dashboard, en dat mag niet stuk van
   * een kolom die er nog niet is. Nu is het één extra ronde die faalt in zijn
   * eentje, en dan is het gevolg precies wat het vóór vandaag was — geen regel
   * op de kaart.
   *
   * Eén query voor alle bestellingen samen, geen query per kaart: de lijst
   * toont er tot 200.
   */
  if (orders.length) {
    try {
      const { results } = await env.DB.prepare(
        // Zelfde afbakening als in de strook: alleen bestellingen waar de klant
        // al een keer "het staat klaar" over gehoord heeft. Bij de rest is een
        // geleverd bestand nog geen nieuws maar werk in uitvoering.
        `SELECT f.order_id AS order_id, COUNT(*) AS n
           FROM files f JOIN orders o ON o.id = f.order_id
          WHERE f.kind = 'delivery' AND f.announced_at IS NULL
            AND o.delivery_mailed_at IS NOT NULL
          GROUP BY f.order_id`
      ).all();
      const byOrder = new Map((results || []).map((r) => [r.order_id, Number(r.n) || 0]));
      for (const o of orders) o.unannounced = byOrder.get(o.id) || 0;
    } catch {
      for (const o of orders) o.unannounced = 0;
    }
  }
  return orders;
}

/** De lijst zoals hij was vóór migratie 0014 — alleen als die nog niet gedraaid is. */
async function loadOrdersLegacy(env, status = '', q = '') {
  const clauses = [];
  const binds = [];
  if (status) { binds.push(status); clauses.push(`status = ?${binds.length}`); }
  // Zoeken werkt ook zonder 0014 — de kolommen waarop gezocht wordt bestaan al
  // sinds het begin. Hem hier weglaten zou een zoekopdracht stilzwijgend
  // beantwoorden met "de tweehonderd nieuwste", en dat is een verkeerd antwoord
  // dat er goed uitziet.
  if (q) { binds.push(`%${q}%`); const n = binds.length;
    clauses.push(`(ref LIKE ?${n} OR brand LIKE ?${n} OR email LIKE ?${n} OR name LIKE ?${n})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const stmt = env.DB.prepare(
    // total_cents hoort erbij, ook hier: orderDanger() beslist er de knop
    // "verwijderen" op, en zonder de kolom leest elke bestelling als onbetaald.
    `SELECT id, customer_id, ref, service, status, tier, brand, email, product_count,
            window_start, window_end, payment_status, total_cents, created_at,
            delivered_at, delivery_mailed_at,
            (SELECT COUNT(*) FROM files f WHERE f.order_id = orders.id) AS file_count
       FROM orders ${where}
      ORDER BY id DESC LIMIT 200`
  );
  const res = await (binds.length ? stmt.bind(...binds) : stmt).all();
  return res.results || [];
}

/**
 * How many orders sit at each status, all of them, ignoring the 200-row cap
 * above — because the filter row has to be able to say "delivered 412" while
 * the list below it shows the newest 200. One grouped query rather than five
 * counts, and it returns a plain object so the renderer can read a status that
 * has no rows as 0 without testing for undefined.
 */
async function loadStatusCounts(env) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  // Verborgen bestellingen tellen hier ook niet mee — anders leest de chip
  // "Received 5" boven een lijst van vier, en dan vertrouw je geen van beide.
  const res = await env.DB.prepare(
    'SELECT status, COUNT(*) AS n FROM orders WHERE hidden_at IS NULL GROUP BY status'
  ).all().catch(() => env.DB.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all());
  for (const row of res.results || []) {
    if (Object.prototype.hasOwnProperty.call(counts, row.status)) counts[row.status] = row.n;
  }
  return counts;
}

/**
 * Every custom_models row for the customers behind this page's orders, keyed
 * by customer_id — one query, grouped in JS, the same shape account.js's
 * groupFilesByOrder() already uses for the identical "N orders, each with
 * their own child rows" problem. `customerIds` carries duplicates (several
 * orders can share a customer) and NULLs (orders.customer_id is nullable —
 * see handleAddCustomModel's comment); both are filtered before the query so
 * neither becomes a wasted IN() slot or, worse, a NULL bind.
 */
async function loadCustomModelsByCustomer(env, customerIds) {
  const ids = [...new Set(customerIds.filter((id) => Number.isInteger(id)))];
  const byCustomer = new Map();
  if (!ids.length) return byCustomer;

  const placeholders = ids.map((_, i) => `?${i + 1}`).join(',');
  const res = await env.DB.prepare(
    `SELECT customer_id, id, label, status FROM custom_models
      WHERE customer_id IN (${placeholders})
      ORDER BY created_at DESC`
  ).bind(...ids).all();

  for (const row of res.results || []) {
    if (!byCustomer.has(row.customer_id)) byCustomer.set(row.customer_id, []);
    byCustomer.get(row.customer_id).push(row);
  }
  return byCustomer;
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

// PATH=/admin IS LOAD-BEARING, AND IT CATCHES PEOPLE OUT.
// The browser attaches this cookie to `/admin/...` and to nothing else. That is
// the point — an ambient credential should travel as narrowly as it can — but
// it means **any new route that wants to authenticate as the admin has to live
// under /admin**. A route at `/api/whatever` will not receive this cookie, will
// see no session, and will tell a visibly-signed-in browser to sign in. That
// happened once already (functions/admin/debug-mollie.js, which started life at
// /api/debug-mollie). Move the route; do not widen the path.
/* ═══════════════════════════════════════════════════════════════════════════
 * DIAGNOSE — /admin/diagnose
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * VERHUISD UIT functions/admin/debug-mollie.js — 23 augustus 2026.
 *
 * ── WAAROM HET WEG MOEST DAAR ─────────────────────────────────────────────
 *
 * Dat bestand was een STATISCHE route in functions/admin/, en een statische
 * route wint in Pages Functions van de catch-all `[[path]].js`. Daarmee viel
 * hij buiten de padtabel hierboven — en dus buiten de ene centrale
 * `originIsSelf()`-controle die in adminPost() vóór de hele tabel staat. Het
 * bestand documenteerde die voorrang zelfs, als handigheid.
 *
 * Er was een sessiecontrole (`hasAdminSession`), en die deed zijn werk. Maar
 * het sessiecookie is `SameSite=Lax`, en dat wordt bij een gewone navigatie van
 * buitenaf WEL meegestuurd. Eén link naar /admin/debug-mollie die Lucas
 * aanklikt terwijl hij is ingelogd, en de GET vuurde twee betalingsaanmaken af
 * bij Mollie. Met een `live_`-sleutel zijn dat twee echte, onbetaalde regels
 * van één euro in het dashboard, plus een webhook-aanroep voor bestelling
 * `VIS-DIAG-000` die niet bestaat.
 *
 * ── WAT ER IS VERANDERD, EN WAT NIET ──────────────────────────────────────
 *
 * De probes zelf, de leesregels en de vormcontrole van de secrets zijn
 * ongewijzigd overgenomen; dit is een verhuizing en geen herontwerp. Twee
 * dingen zijn wél anders, en allebei omdat ze de reden waren dat het weg moest:
 *
 *   1 · De route staat in de padtabel, dus hij erft wat elke andere adminroute
 *       erft: de sessiecontrole in adminGet()/adminPost() en, voor de POST, de
 *       originIsSelf()-poort.
 *
 *   2 · HET IS GESPLITST NAAR WERKWOORD. Wat alleen kijkt — de vorm van elk
 *       secret, de problemen met de sleutel — is een GET. Wat bij Mollie iets
 *       AANMAAKT is een POST. Dat onderscheid stond er niet en had er altijd
 *       moeten staan: een GET die betalingen aanmaakt is een GET die een
 *       preloader, een linkchecker of een geopend tabblad kan afvuren.
 *
 * ── OF DIT NOG NODIG IS ───────────────────────────────────────────────────
 *
 * De aanleiding — de lege 400 — is opgehelderd: MOLLIE_API_KEY stond opgeslagen
 * als één U+0016, het SYN-teken dat cmd.exe invoegt bij Ctrl+V. Dat deel heeft
 * zijn werk gedaan. Wat is gebleven is de VORMCONTROLE VAN ELK SECRET, en die
 * is sindsdien pas echt nuttig geworden: twee secrets falen stil. Er is dus één
 * scherm dat "staat dit secret er, en is het een sleutel of een toetsaanslag"
 * beantwoordt zonder één waarde te tonen. Daarom blijft het, en daarom is de
 * GET-helft de helft die ertoe doet.
 */

const MOLLIE_API = 'https://api.mollie.com/v2';

/** Leesroute: wat er van de secrets te zeggen valt zonder er één te lezen. */
async function renderDiagnose(context) {
  const { env } = context;
  const namen = ['MOLLIE_API_KEY', 'RESEND_API_KEY', 'PORTAL_SALT', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const vormen = namen.map((naam) => [naam, secretShape(env?.[naam])]);
  const problemen = mollieKeyProblems(env);

  const rij = ([naam, v]) => {
    const staat = !v.set
      ? '<span class="pill is-warn">niet ingesteld</span>'
      : v.verdict
        ? `<span class="pill is-warn">${esc(v.verdict)}</span>`
        : '<span class="pill">in orde</span>';
    const detail = v.set
      ? `${v.length} tekens${v.prefix ? ` &middot; voorvoegsel <code>${esc(v.prefix)}</code>` : ''}`
        + `${v.controlChars ? ` &middot; bevat ${esc(v.controlChars.join(', '))}` : ''}`
      : '&mdash;';
    return `<tr><td><code>${esc(naam)}</code></td><td>${staat}</td><td class="meta">${detail}</td></tr>`;
  };

  const body = `
    <h1>Diagnose</h1>
    <p class="meta">De vorm van elk secret &mdash; nooit de waarde. Lengte, of elk teken afdrukbaar is, en
    het voorvoegsel alleen waar dat een openbaar merkteken is (<code>test_</code>, <code>live_</code>,
    <code>re_</code>). Dat is precies genoeg om "goed ingesteld" van "een losse toetsaanslag" te scheiden.</p>
    <table class="tbl">
      <thead><tr><th>Secret</th><th>Staat</th><th>Vorm</th></tr></thead>
      <tbody>${vormen.map(rij).join('')}</tbody>
    </table>
    ${problemen ? `<p class="meta is-warn">De Mollie-sleutel heeft een probleem vóór er iets wordt verstuurd: ${esc(problemen.join('; '))}</p>` : ''}
    <h2>De vier probes</h2>
    <p class="meta">Vier verzoeken aan Mollie, goedkoopste eerst, elk met één variabele erin: transport met een
    bewust verkeerde sleutel, dan de echte sleutel zonder body, dan de kleinste betaling, dan precies wat
    <code>functions/api/order.js</code> verstuurt. De eerste die zich misdraagt is het antwoord.</p>
    <p class="meta is-warn"><strong>Let op:</strong> de laatste twee MAKEN EEN BETALING AAN. Met een
    <code>test_</code>-sleutel zijn die gratis en verlopen ze vanzelf; met een <code>live_</code>-sleutel zijn het
    twee echte, onbetaalde betalingen van &euro;${esc(String(AMOUNT.testSample))} die niemand ooit voldoet. Daarom is dit een knop en geen pagina die
    vanzelf laadt.</p>
    <form method="post" action="/admin/diagnose/probe">
      <button class="btn" type="submit">Draai de vier probes</button>
    </form>`;
  return html(page({ title: 'Diagnose', body }));
}

/** De probes. POST, want twee ervan maken een echte betaling aan. */
async function handleDiagnoseProbe(context) {
  const { request, env } = context;
  const raw = env?.MOLLIE_API_KEY;
  const out = {
    when: new Date().toISOString(),
    origin: new URL(request.url).origin,
    key: {
      set: !!raw,
      rawLength: raw ? String(raw).length : 0,
      usableLength: raw ? String(raw).replace(/[^\x21-\x7E]/g, '').length : 0,
      prefix: raw ? String(raw).replace(/[^\x21-\x7E]/g, '').slice(0, 5) : null,
      mode: raw ? (String(raw).trim().startsWith('live_') ? 'LIVE' : String(raw).trim().startsWith('test_') ? 'test' : 'unrecognised') : null,
      problems: mollieKeyProblems(env),
    },
    secrets: Object.fromEntries(
      ['MOLLIE_API_KEY', 'RESEND_API_KEY', 'PORTAL_SALT', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']
        .map((naam) => [naam, secretShape(env?.[naam])])
    ),
    probes: {},
    reading: null,
  };

  if (!raw) {
    out.reading = 'MOLLIE_API_KEY is not set on this deployment. That is the whole problem — nothing else below ran.';
    return diagnoseJson(out);
  }

  let key;
  try {
    key = mollieKey(env);
  } catch (e) {
    out.reading = `The stored key is not usable: ${e.message}`;
    return diagnoseJson(out);
  }

  // A · transport. A syntactically valid key that is not ours.
  out.probes.A_transport = await mollieProbe('GET', '/methods', 'test_0000000000000000000000000000000000');
  // B · auth, no body.
  out.probes.B_auth = await mollieProbe('GET', '/methods', key);

  const origin = new URL(request.url).origin;
  // C · the smallest payment Mollie accepts.
  out.probes.C_minimalPayment = await mollieProbe('POST', '/payments', key, {
    amount: { currency: 'EUR', value: AMOUNT.testSample.toFixed(2) },
    description: 'VISUAILS DIAGNOSTIC — ignore',
    redirectUrl: `${origin}/thank-you`,
  });

  // D · exactly what order.js sends, including the three fields C leaves out.
  const fullBody = {
    amount: { currency: 'EUR', value: AMOUNT.testSample.toFixed(2) },
    description: 'VISUAILS DIAGNOSTIC — ignore',
    redirectUrl: `${origin}/thank-you?ref=VIS-DIAG-000`,
    webhookUrl: `${origin}/api/webhook/mollie`,
    locale: 'en_US',
    metadata: { order_ref: 'VIS-DIAG-000' },
  };
  out.probes.D_realPayment = await mollieProbe('POST', '/payments', key, fullBody);
  out.probes.D_realPayment.urlsSent = { redirectUrl: fullBody.redirectUrl, webhookUrl: fullBody.webhookUrl };

  out.methods = {
    note: 'Mollie filters methods by amount. The test sample is the smallest payment the site makes, so this is the shortest the list ever gets.',
    at_smallest: await mollieMethodList(key, AMOUNT.testSample.toFixed(2)),
    at_large_order: await mollieMethodList(key, ladderTotal('complete', 30).toFixed(2)),
  };

  out.reading = readDiagnose(out);
  return diagnoseJson(out);
}

/** The methods Mollie would actually offer for a payment of this size. */
async function mollieMethodList(key, value) {
  const res = await mollieProbe('GET', `/methods?amount%5Bvalue%5D=${value}&amount%5Bcurrency%5D=EUR`, key);
  if (res.threw || res.status !== 200) return { amount: value, error: res.error || `HTTP ${res.status}` };
  const full = await fetch(`${MOLLIE_API}/methods?amount%5Bvalue%5D=${value}&amount%5Bcurrency%5D=EUR`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  }).then((r) => r.json()).catch(() => null);
  const list = full?._embedded?.methods || [];
  return {
    amount: `€${value}`,
    count: list.length,
    methods: list.map((m) => `${m.description} (${m.id})`),
  };
}

async function mollieProbe(method, path, key, body) {
  const started = Date.now();
  try {
    const res = await fetch(MOLLIE_API + path, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch { /* not JSON — that is itself the finding */ }
    return {
      status: res.status,
      ms: Date.now() - started,
      bodyBytes: text.length,
      isJson: parsed !== null,
      body: parsed
        ? (parsed.title
          ? { title: parsed.title, detail: parsed.detail, field: parsed.field }
          : { id: parsed.id, status: parsed.status, mode: parsed.mode, count: parsed.count })
        : text.slice(0, 200),
      headers: describeHeaders(res),
    };
  } catch (e) {
    // A throw is a different finding from a 400 and must not be flattened into
    // one: it means the request never completed at all.
    return { threw: true, error: String(e && e.message ? e.message : e), ms: Date.now() - started };
  }
}

/** Turn the four probes into the one sentence that says what to do next. */
function readDiagnose(out) {
  const { A_transport: A, B_auth: B, C_minimalPayment: C, D_realPayment: D } = out.probes;

  if (out.key.problems) {
    const s = out.secrets?.MOLLIE_API_KEY;
    // The specific case, called by name, because the generic advice
    // ("re-paste it") is what put the wrong value there in the first place.
    if (s?.set && s.length <= 3 && s.controlChars?.length) {
      return `MOLLIE_API_KEY is ${s.length} character(s) long and contains ${s.controlChars.join(', ')}. ` +
        `That is not a truncated key — U+0016 is the SYN control character Windows cmd.exe inserts when Ctrl+V ` +
        `is pressed and the console is not set to treat it as paste. The key was never pasted; a control code was. ` +
        `Set it again from the Cloudflare dashboard (Settings → Variables and Secrets), where paste works normally, ` +
        `then redeploy. Check the other secrets in this response too — they were probably set the same way.`;
    }
    return `The stored key has a problem before anything is sent: ${out.key.problems.join('; ')}. ` +
      `Set it again — preferably from the Cloudflare dashboard rather than a terminal — then redeploy and reload this.`;
  }

  // WHAT MAKES A PROBE "GOOD" IS A STRUCTURED ANSWER, NOT A PARTICULAR STATUS.
  // Mollie answers a syntactically unacceptable key with 400 "Invalid
  // Authorization header" in JSON, not 401 — so the question is not the status
  // but WHETHER MOLLIE'S APPLICATION ANSWERED AT ALL. `isJson` is that question.
  const refused = (p) => p && !p.threw && !p.isJson;

  if (A && A.threw) return `Could not reach api.mollie.com from this Function at all (${A.error}). This is a connectivity problem, not a payment one.`;
  if (refused(A)) {
    return `Probe A was refused with a ${A.status} and no JSON, using a key that is deliberately wrong — so it is neither our key nor our payload. ` +
      `Requests from this Pages Function are being rejected before Mollie's application sees them. Headers: ${A.headers}. ` +
      `That is the same shape as the old Stripe failure; take the cf-ray to Cloudflare.`;
  }

  if (refused(B)) return `Transport is fine — A got a structured ${A.status} back — but the real key is refused with a ${B.status} and no JSON. The key is carrying a character the wire will not accept. Re-set it from the Cloudflare dashboard and redeploy.`;
  if (B && B.status === 401) return 'Mollie reached, but the key is not valid for this account. Check you copied the right one and that the account is activated.';
  if (B && B.status >= 400) return `Mollie refused the key: ${JSON.stringify(B.body)}.`;
  if (B && B.status !== 200) return `Unexpected ${B.status} on a plain authenticated read. Body: ${JSON.stringify(B.body)}.`;

  if (refused(C)) return 'Auth works, but even a minimal payment is refused with no JSON — the POST itself is the problem, not the key.';
  if (C && C.status >= 400) return `A minimal payment was refused: ${JSON.stringify(C.body)}. That is Mollie telling us what is wrong — read the field.`;
  if (refused(D)) return 'A minimal payment works; the real one is refused with no JSON. So it is one of the three fields the real one adds: webhookUrl, locale or metadata. The URLs actually sent are in D.urlsSent.';
  if (D && D.status >= 400) return `The real payload was refused: ${JSON.stringify(D.body)}. Field to look at: ${D.body?.field || 'see detail'}.`;

  if (C?.status === 201 && D?.status === 201) {
    return `All four probes pass and Mollie created both test payments (${C.body?.id}, ${D.body?.id}, mode ${D.body?.mode}). ` +
      `Payment creation works from this deployment. Those two are diagnostic payments — they sit "open" in your Mollie dashboard, ` +
      `nobody will pay them, and they expire on their own.`;
  }

  return 'Inconclusive — send the whole of this JSON over and I will read it.';
}

/**
 * A secret's shape, never its value. The verdict is the specific tell this
 * whole screen was built to catch: a value one or two characters long, made of
 * control characters, is not a truncated key — it is a terminal that typed a
 * control code instead of pasting.
 */
function secretShape(value) {
  if (value === undefined || value === null || value === '') return { set: false };
  const s = String(value);
  const control = [...s].filter((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f);
  const out = {
    set: true,
    length: s.length,
    allPrintable: control.length === 0 && s === s.trim(),
  };
  if (control.length) {
    out.controlChars = control.map((c) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'));
  }
  // Public prefixes only. Mollie and Resend both put the environment in the
  // clear at the front of the key precisely so it can be read at a glance.
  const m = s.match(/^(test_|live_|re_|sk_test_|sk_live_|whsec_)/);
  if (m) out.prefix = m[1];
  if (s.length <= 3) out.verdict = 'FAR too short — this is a stray keystroke, not a key';
  else if (control.length) out.verdict = 'contains control characters — re-set it';
  else if (s !== s.trim()) out.verdict = 'has leading or trailing whitespace';
  return out;
}

function diagnoseJson(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function setSessionCookie(token) {
  const maxAge = 14 * 86400; // ADMIN_SESSION_TTL_DAYS, in seconds — kept in step by hand, see adminAuth.js
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/admin; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * Is this request's Origin this site? The second line of CSRF defence — see
 * the file header. A same-site form POST always carries Origin in modern
 * browsers; its absence is treated as a mismatch rather than waved through,
 * because "no Origin" is also what a handful of ancient or misbehaving
 * clients send, and admitting that gap for their sake would reopen the one
 * this check exists to close.
 *
 * Task #271e, 2026-07-29: checked against request.url's own host first (the
 * original, and still the common, case), then against ALLOWED_ORIGIN_HOSTS —
 * a comma-separated env var — if that misses. This exists because a same-site
 * browser POST from a hostname this exact Worker legitimately answers under
 * is not a forged request, and Cloudflare Pages can legitimately put more
 * than one live hostname in front of the same deployment (an apex/www pair,
 * or the project's own *.pages.dev domain alongside a custom domain) — cases
 * request.url alone cannot see because it only ever reflects the ONE host the
 * current request happened to arrive on. Unset, this is byte-for-byte the
 * original behaviour: nothing here narrows what used to pass.
 */
function originIsSelf(request, env) {
  // Sec-Fetch-Site FIRST, and this ordering is the whole fix.
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

/** The two values behind an origin-mismatch 403 — same shape both call sites
 * need to build a message a human can act on instead of a dead end. */
function originMismatchDetail(request) {
  const origin = request.headers.get('Origin') || '(no Origin header sent)';
  let host = '(unreadable)';
  try { host = new URL(request.url).host; } catch { /* leave the placeholder */ }
  return `Seen Origin: ${origin}. Expected host: ${host}.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────

function loginBody(error = null) {
  return `
<div class="bar"><a class="mark" href="/">VISUAILS</a></div>
<form class="login" method="post" action="/admin/login">
  ${error ? `<p class="error">${esc(error)}</p>` : ''}
  <input type="email" name="email" placeholder="Email" autocomplete="username" required>
  <input type="password" name="password" placeholder="Password" autocomplete="current-password" required>
  <button class="btn btn-primary" type="submit">Sign in</button>
</form>`;
}

/**
 * Het logboek: wie deed wat, wanneer.
 *
 * ÉÉN PAGINA, GEEN FILTERS. Dit is geen werkscherm maar een geheugen — je komt
 * hier als je je afvraagt waarom iets is zoals het is, en dan wil je scrollen
 * en lezen, niet zoeken op iets waarvan je de naam niet meer weet. Tweehonderd
 * regels is ruim een maand werk.
 */
async function renderLog({ env }) {
  let rows = [];
  let missing = false;
  try {
    const res = await env.DB.prepare(
      `SELECT id, admin_email, action, order_id, customer_id, detail, created_at
         FROM admin_log ORDER BY id DESC LIMIT 200`
    ).all();
    rows = res.results || [];
  } catch { missing = true; }

  const body = `
<p><a href="/admin">&larr; Dashboard</a></p>
<h1>Activity log</h1>
<p class="lede">Every change made from this dashboard. The customer never sees this — their own timeline lives on the order.</p>
${missing
  ? '<p class="warnline">The log table is not there yet. Run migration 0014.</p>'
  : rows.length
    ? `<table class="files"><thead><tr><th>When</th><th>Who</th><th>What</th><th>Detail</th></tr></thead><tbody>
        ${rows.map((r) => `<tr>
          <td class="muted">${esc(when(r.created_at))}</td>
          <td class="muted">${esc(r.admin_email || '—')}</td>
          <td><code>${esc(r.action)}</code></td>
          <td>${esc(r.detail || '')}${r.order_id ? ` <a href="/admin/orders/${r.order_id}/files">order &rarr;</a>` : ''}${r.customer_id ? ` <a href="/admin/customers/${r.customer_id}">customer &rarr;</a>` : ''}</td>
        </tr>`).join('')}
      </tbody></table>`
    : '<p class="empty">Nothing logged yet.</p>'}`;
  return html(page({ title: 'Activity log', body }));
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE BTW-POORT, MET EEN SCHERM ERACHTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAAROM DIT ER OP 9 AUGUSTUS 2026 KOMT ───────────────────────────────────
 *
 * Lucas: *"ik was nog benieuwd hoe het nou gaat wanneer iemand in NL zegt dat hij
 * uit Amerika bestelt om belasting te ontduiken. Hoe check ik dit nou en wat is
 * hier tegen te doen of hebben we hier al iets voor gemaakt."*
 *
 * Er was al veel voor gemaakt, en het hield niets tegen. `vatGate()` in
 * src/data/vat.js zet zo’n bestelling op `review_state = 'pending'` en er wordt
 * geen betaallink gemaakt. Maar `orders.review_state` werd door NIETS gelezen —
 * elke treffer op die naam in dit bestand ging over `files.review_state`, een
 * andere kolom met dezelfde naam voor het goedkeuren van beelden. Een
 * vastgehouden bestelling was dus onzichtbaar, en alleen met SQL te vinden.
 *
 * ── WAT DIT SCHERM WEL EN NIET IS ───────────────────────────────────────────
 *
 * Het is GEEN fraudedetector. Er staat wat de klant opgaf naast waar het verzoek
 * vandaan kwam (migratie 0023), en dat verschil is geen bewijs: een vpn, een
 * zakenreis of een Nederlandse directeur van een Amerikaanse vennootschap leveren
 * alle drie een verschil op zonder dat er iets mis is.
 *
 * Wat het is: de plek waar één mens één keer kijkt. Dat is ook wat de zaak
 * juridisch vraagt — voor een dienst aan een zakelijke klant buiten de EU is 0%
 * juist, maar de bewijslast dat die klant daar echt gevestigd is ligt bij de
 * leverancier. Dit scherm is dus niet "wie ligt er", het is "wat heb ik in handen".
 *
 * ── DRIE KNOPPEN, EN WAAROM PRECIES DEZE DRIE ───────────────────────────────
 *
 * · GOEDKEUREN — de opgave klopt, 0% blijft, de klant kan betalen.
 * · BTW ALSNOG REKENEN — de opgave houdt geen stand. De NETTOPRIJS BLIJFT
 *   ONGEWIJZIGD; er komt 21% bovenop. Dat is precies wat er fiscaal gebeurt: je
 *   verandert niet de prijs, je stelt vast dat Nederlandse btw van toepassing is.
 * · AFWIJZEN — je wil er eerst over praten. De bestelling blijft onbetaalbaar en
 *   verdwijnt uit deze lijst, zodat hij je niet elke dag opnieuw aankijkt.
 *
 * Er is met opzet GEEN knop die het land wijzigt. Dan zou dit scherm de opgave van
 * de klant kunnen herschrijven, en dat is precies het soort administratie waarvan je
 * later niet meer weet wat de klant zelf heeft gezegd.
 */
/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE TRECHTER — WAAR IEMAND HET BESTELFORMULIER VERLAAT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Het bestelformulier is één pagina met vijf stappen die met JavaScript wisselen, dus
 * Web Analytics zag er niets van: bekend was wie een bestelling AFMAAKTE, niet wie op
 * stap 3 wegliep. functions/api/step.js telt sinds 12 augustus 2026 één getal per dag,
 * dienst, taal en stap; dit scherm zet die getallen naast elkaar.
 *
 * ── WAT DIT SCHERM WEL EN NIET BEWEERT ─────────────────────────────────────
 *
 * Er staat geen bezoekersaantal. Er staat GEEN bezoeker-id in die tabel — met opzet,
 * zie de noot in het endpoint — dus wie herlaadt en opnieuw tot stap 3 komt, staat er
 * twee keer in. De VERHOUDING tussen de stappen is wat bruikbaar is, en dat is precies
 * de vraag: waar valt het weg. Dat staat er ook zo boven, want een getal met de
 * verkeerde naam is erger dan geen getal.
 *
 * ── DE VOLGORDE IS DALEND EN DAT IS EEN AANNAME ────────────────────────────
 *
 * Stap 1 hoort het grootste getal te hebben. Is dat niet zo — meer op stap 2 dan op
 * stap 1 — dan is er iets met de meting en niet met de trechter, bijvoorbeeld een
 * directe link naar een halve stap. Het scherm markeert dat in plaats van het te
 * verbergen: een percentage van een verkeerde noemer is een conclusie waar je een
 * advertentiebudget op zet.
 */
const FUNNEL_DAYS = 30;

/* `url` komt er los bij en zit niet in `context`: adminGet() bouwt hem zelf uit
   request.url, en de Pages-context heeft geen url-veld. Meegeven in plaats van hier
   opnieuw parsen, want dan staat dezelfde ontleding twee keer in dit bestand. */
async function renderFunnel({ env }, url) {
  const wanted = Number(url?.searchParams?.get('days'));
  const days = [7, 30, 90].includes(wanted) ? wanted : FUNNEL_DAYS;

  let rows = [];
  let missing = false;
  try {
    const res = await env.DB.prepare(
      `SELECT flow, lang, step, SUM(hits) AS hits
         FROM funnel_hits
        WHERE day >= date('now', ?1)
        GROUP BY flow, lang, step
        ORDER BY flow, lang, step`
    ).bind(`-${days} days`).all();
    rows = res.results || [];
  } catch (err) {
    /* Zonder migratie 0025 bestaat de tabel niet. Dan hoort dit scherm te zeggen wat
       eraan scheelt in plaats van een lege trechter te tonen die eruitziet als
       "niemand begint aan een bestelling" — dezelfde terugval als renderVatReview. */
    missing = String(err?.message || '');
  }

  /* Per dienst optellen over de talen, en de talen apart houden voor de tweede tabel:
     een trechter die in één taal veel slechter loopt is een tekstprobleem en geen
     formulierprobleem, en dat verschil is het halve antwoord. */
  const byFlow = new Map();
  const byLang = new Map();
  let total = 0;
  for (const r of rows) {
    const hits = Number(r.hits) || 0;
    total += hits;
    const step = Number(r.step) || 0;
    if (!byFlow.has(r.flow)) byFlow.set(r.flow, new Map());
    const f = byFlow.get(r.flow);
    f.set(step, (f.get(step) || 0) + hits);
    const key = `${r.flow}|${r.lang}`;
    if (!byLang.has(key)) byLang.set(key, new Map());
    const l = byLang.get(key);
    l.set(step, (l.get(step) || 0) + hits);
  }

  const steps = (m) => [...m.keys()].sort((a, b) => a - b);
  const pct = (n, of) => (of > 0 ? `${Math.round((n / of) * 100)}%` : '—');

  /** Eén rij per stap, met het verlies ten opzichte van de vorige stap erbij. */
  const table = (label, m) => {
    const ks = steps(m);
    if (!ks.length) return '';
    const first = m.get(ks[0]) || 0;
    let prev = null;
    const body = ks.map((k) => {
      const n = m.get(k) || 0;
      /* Het verlies is het interessante getal, niet het aantal: "hier gaat 40% weg" is
         een taak, "hier waren 62 mensen" is een feit. */
      const drop = prev === null ? '' : (prev > 0 ? `&minus;${Math.round(((prev - n) / prev) * 100)}%` : '');
      const stijging = prev !== null && n > prev;
      const row = `
    <tr>
      <th>Stap ${k}</th>
      <td>${n}</td>
      <td>${pct(n, first)}</td>
      <td class="${stijging ? 'warnline' : ''}">${stijging
        ? 'meer dan de stap ervoor — kijk naar de meting, niet naar de trechter'
        : drop}</td>
    </tr>`;
      prev = n;
      return row;
    }).join('');
    return `
<h2>${esc(label)}</h2>
<table class="files">
  <thead><tr><th>Stap</th><th>Bereikt</th><th>Van stap ${ks[0]}</th><th>Verlies</th></tr></thead>
  <tbody>${body}</tbody>
</table>`;
  };

  const body = `
<p><a href="/admin">&larr; Dashboard</a></p>
<h1>Trechter</h1>
<p class="lede">Hoe vaak elke stap van het bestelformulier bereikt is, over de laatste
${days} dagen. Dit zijn <strong>geen bezoekersaantallen</strong>: er wordt geen bezoeker
vastgelegd — geen cookie, geen id, geen ip — dus wie het formulier herlaadt en opnieuw
tot stap 3 komt, staat er twee keer in. Wat je hier leest is de verhouding tussen de
stappen, en dat is de vraag: waar valt het weg.</p>
<p class="meta">
  ${[7, 30, 90].map((d) => d === days
    ? `<span class="fl-chip is-active">${d} dagen</span>`
    : `<a class="fl-chip" href="/admin/funnel?days=${d}">${d} dagen</a>`).join(' ')}
</p>
${missing
  ? `<p class="warnline">Dit scherm kan de trechter niet lezen (${esc(missing)}). Draai migratie 0025.</p>`
  : total === 0
    ? `<p class="empty">Nog niets gemeten in de laatste ${days} dagen. Dat is bij een nieuwe
       meting het normale begin — na het eerste bezoek aan /start staat hier een regel.
       Blijft het leeg terwijl er wél bestellingen binnenkomen, dan komt het bericht van
       de browser niet aan: kijk in het netwerktabblad naar een POST op <code>/api/step</code>.</p>`
    : [...byFlow.entries()]
        .sort((a, b) => (b[1].get(1) || 0) - (a[1].get(1) || 0))
        .map(([flow, m]) => table(serviceLabel(flow, 'nl') || flow, m))
        .join('')
      + `
<h2>Per taal</h2>
<p class="meta">Zelfde getallen, gesplitst. Loopt één taal duidelijk slechter, dan zit het
in de tekst van die stap en niet in het formulier.</p>
${[...byLang.entries()]
  .sort((a, b) => (b[1].get(1) || 0) - (a[1].get(1) || 0))
  .map(([key, m]) => {
    const [flow, lang] = key.split('|');
    return table(`${serviceLabel(flow, 'nl') || flow} · ${String(lang).toUpperCase()}`, m);
  }).join('')}`}`;

  return html(page({ title: 'Trechter', body }));
}

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * DE AANBEVELINGEN — HET SCHERM DAT ER NIET WAS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ── WAT ER STUK WAS, EN HOE STIL ────────────────────────────────────────────
 *
 * `order_feedback.testimonial_approved` bestaat sinds migratie 0020, met een
 * index erop en een view eroverheen. Het werd in de hele codebase NERGENS op 1
 * gezet. Niet in feedback.js, niet in admin.js, nergens — en er was ook geen
 * scherm dat de teksten kón lezen.
 *
 * Wat een klant dus deed: een bestelling afronden, de vraag krijgen of hij
 * tevreden was, een aanbeveling typen, EXPLICIET het vinkje zetten dat wij hem
 * mogen gebruiken — en dan verdween die tekst in een tabel die niemand opende.
 * De hele reviewlus liep dood op de laatste stap. Dat is erger dan een ontbrekende
 * functie: het is toestemming vragen voor iets wat je vervolgens niet doet.
 *
 * ── WAT DIT SCHERM WEL EN NIET DOET ─────────────────────────────────────────
 *
 * Het toont de aanbevelingen waarvoor toestemming is gegeven, en het zet het
 * vinkje om. Meer niet. PUBLICEREN IS EEN DERDE STAP en die zit hier bewust niet
 * in: welke aanbeveling op welke pagina komt te staan, is een redactionele keuze
 * en geen knop. Wat dit scherm oplost is dat de teksten nu bestaan voor de mens
 * die erover gaat.
 *
 * ── GOEDKEUREN IS OMKEERBAAR, EN DAT IS DE HELE VEILIGHEID ──────────────────
 *
 * Eén klik terug, in hetzelfde scherm. Een goedkeuring die je alleen in de
 * database kunt terugdraaien, is een goedkeuring die je niet durft te geven — en
 * dan blijft de lijst staan waar hij nu staat.
 *
 * WAT ER NIET GETOOND WORDT ZONDER TOESTEMMING. `testimonial_consent = 1` staat
 * in de WHERE en niet in een filter op het scherm. saveTestimonial() bewaart al
 * niets zonder vinkje (zie de kop daar: §3 eist expliciete, aparte toestemming),
 * en deze query is de tweede sluiting op dezelfde deur: een rij die er door een
 * oude import of een handmatige INSERT tóch in staat, komt hier niet in beeld.
 */
async function renderTestimonials({ env }) {
  let rows = [];
  let missing = false;
  try {
    const res = await env.DB.prepare(
      `SELECT f.order_id, f.testimonial_text, f.testimonial_name, f.testimonial_approved,
              f.updated_at, f.asked_at,
              o.ref, o.brand, o.service, o.lang, o.closed_at,
              c.email
         FROM order_feedback f
         JOIN orders o ON o.id = f.order_id
         LEFT JOIN customers c ON c.id = o.customer_id
        WHERE f.testimonial_consent = 1
          AND f.testimonial_text IS NOT NULL
          AND TRIM(f.testimonial_text) <> ''
        ORDER BY f.testimonial_approved ASC, f.updated_at DESC
        LIMIT 200`
    ).all();
    rows = res.results || [];
  } catch (err) {
    // Zelfde terugval als renderVatReview en renderLog: zonder migratie 0020 is er
    // niets te tonen, en dan hoort dit scherm te zeggen wat eraan scheelt.
    missing = String(err?.message || '');
  }

  const wachtend = rows.filter((r) => !Number(r.testimonial_approved));
  const goedgekeurd = rows.filter((r) => Number(r.testimonial_approved));

  const kaart = (r) => {
    const aan = !!Number(r.testimonial_approved);
    return `
<div class="card">
  <div class="row-head">
    <span class="ref">${esc(r.ref)}</span>
    <span class="muted">${esc(r.brand || '—')} · ${esc(serviceLabel(r.service, 'nl') || r.service || '')} · ${esc(String(r.lang || '').toUpperCase())}</span>
    <span class="muted">${esc(when(r.updated_at || r.asked_at))}</span>
  </div>
  <p class="meta">${esc(r.testimonial_name || 'geen naam opgegeven')}${r.email ? ` · ${esc(r.email)}` : ''}</p>
  <blockquote class="tm-text">${esc(r.testimonial_text)}</blockquote>
  <form method="post" action="/admin/testimonials/${encodeURIComponent(String(r.order_id))}">
    <input type="hidden" name="action" value="${aan ? 'unapprove' : 'approve'}">
    <button type="submit" class="${aan ? '' : 'primary'}">${aan ? 'Goedkeuring intrekken' : 'Goedkeuren'}</button>
    ${aan ? '<span class="pill">goedgekeurd</span>' : ''}
  </form>
</div>`;
  };

  const body = `
<p><a href="/admin">&larr; Dashboard</a></p>
<h1>Aanbevelingen</h1>
<p class="lede">Wat klanten over ons geschreven hebben, met het vinkje erbij dat wij het
mogen gebruiken. Goedkeuren zet alleen dat vinkje om — <strong>er wordt niets
gepubliceerd</strong>. Waar een aanbeveling komt te staan, blijft een keuze die je zelf
maakt; dit scherm zorgt er alleen voor dat je hem kunt lezen.</p>
${missing
  ? `<p class="warnline">Dit scherm kan de aanbevelingen niet lezen (${esc(missing)}). Draai migratie 0020.</p>`
  : rows.length
    ? `
${wachtend.length ? `<h2>Wacht op je (${wachtend.length})</h2>${wachtend.map(kaart).join('')}` : '<p class="empty">Niets wat op je wacht.</p>'}
${goedgekeurd.length ? `<h2>Goedgekeurd (${goedgekeurd.length})</h2>${goedgekeurd.map(kaart).join('')}` : ''}`
    : `<p class="empty">Nog geen aanbevelingen met toestemming. Ze verschijnen hier zodra een klant
       na een afgeronde bestelling iets schrijft <em>en</em> het vinkje zet. Zonder dat vinkje
       wordt de tekst niet bewaard — zie saveTestimonial() in src/lib/feedback.js.</p>`}`;

  return html(page({ title: 'Aanbevelingen', body }));
}

/**
 * Het vinkje om, en verder niets.
 *
 * ALLEEN MET TOESTEMMING, ook hier. De WHERE draagt `testimonial_consent = 1`, dus
 * een POST met een order_id waar geen toestemming aan hangt, raakt nul rijen en
 * komt zonder mededeling terug op de lijst. Dat is met opzet geen foutmelding: er
 * is niets aan de hand met het verzoek, er is alleen niets om goed te keuren.
 *
 * WIE HET DEED STAAT IN HET LOGBOEK. Een goedkeuring is de handeling die een tekst
 * van een klant tot iets maakt wat wij mogen gebruiken; dat hoort navolgbaar te
 * zijn, net als de btw-beslissing. Zelfde reden, zelfde vorm.
 */
async function handleTestimonialDecision({ request, env }, orderId, admin) {
  const back = '/admin/testimonials';
  if (!Number.isInteger(orderId)) return seeOther(back);
  const form = await request.formData();
  const action = String(form.get('action') || '');
  if (!['approve', 'unapprove'].includes(action)) return seeOther(back);

  const aan = action === 'approve' ? 1 : 0;
  try {
    await env.DB.prepare(
      `UPDATE order_feedback
          SET testimonial_approved = ?2, updated_at = datetime('now')
        WHERE order_id = ?1 AND testimonial_consent = 1`
    ).bind(orderId, aan).run();
  } catch (err) {
    console.error('[admin] aanbeveling niet bijgewerkt voor bestelling', orderId, '—', err && err.message);
    return html(page({ title: 'Aanbevelingen', body: errorBody(
      `De aanbeveling kon niet bijgewerkt worden (${esc(String(err?.message || err))}). Draai migratie 0020.`
    ) }), 500);
  }

  await logAdmin(env, admin, aan ? 'testimonial.approve' : 'testimonial.unapprove', {
    orderId,
    detail: `aanbeveling ${aan ? 'goedgekeurd voor gebruik' : 'niet langer goedgekeurd'}`,
  });
  return seeOther(back);
}

async function renderVatReview({ env }) {
  let rows = [];
  let missing = false;
  try {
    const res = await env.DB.prepare(
      `SELECT o.id, o.ref, o.created_at, o.service, o.product_count,
              o.country, o.origin_country, o.billing_address, o.brand,
              o.vat_treatment, o.vat_rate, o.vat_cents, o.total_cents,
              o.vat_valid, o.vat_check_name, o.review_state, o.review_reason,
              o.review_requested_at, o.payment_status,
              c.email
         FROM orders o
         LEFT JOIN customers c ON c.id = o.customer_id
        WHERE o.review_state = 'pending'
        ORDER BY o.id DESC
        LIMIT 100`
    ).all();
    rows = res.results || [];
  } catch (err) {
    // origin_country komt uit 0023 en de beoordelingsvelden uit 0018. Zonder die
    // migraties is er niets te tonen, en dan hoort dit scherm te zeggen wat eraan
    // scheelt in plaats van leeg te blijven — zelfde terugval als renderLog.
    missing = String(err?.message || '');
  }

  const cents = (v) => `€ ${((Number(v) || 0) / 100).toFixed(2).replace('.', ',')}`;

  const body = `
<p><a href="/admin">&larr; Dashboard</a></p>
<h1>Btw-controle</h1>
<p class="lede">Bestellingen die op een btw-opgave wachten die wij niet kunnen nakijken.
Voor landen buiten de EU bestaat geen register — VIES dekt alleen lidstaten — dus rust
0% daar volledig op wat de klant zelf opgeeft. Zolang een bestelling hier staat, kan
er niet betaald worden: niet via een link van ons en niet via VISUAILS Studio.</p>
${missing
  ? `<p class="warnline">Dit scherm kan de bestellingen niet lezen (${esc(missing)}). Draai migratie 0018 en 0023.</p>`
  : rows.length
    ? rows.map((o) => {
        const claim = String(o.country || '—').toUpperCase();
        const from = String(o.origin_country || '').toUpperCase();
        /* Het verschil wordt WEL gemarkeerd en NIET beoordeeld. Een gekleurde
           regel die zegt "let hier op" is bruikbaar; een regel die zegt "dit is
           fraude" is een conclusie die dit scherm niet mag trekken. */
        const mismatch = from && claim !== '—' && from !== claim;
        const net = Number(o.total_cents) || 0;
        /* VAT_RATE en niet 0.21: dit scherm rekende het tarief zelf uit en zou
           bij een tariefwijziging als enige op het oude blijven staan. */
        const withVat = Math.round(net * VAT_RATE);
        return `
<div class="card">
  <div class="row-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="muted">${esc(o.brand || '—')} · ${esc(o.service || '')} · ${esc(String(o.product_count || 0))} producten</span>
    <span class="muted">${esc(when(o.review_requested_at || o.created_at))}</span>
  </div>
  <p class="meta">${esc(o.email || 'geen e-mailadres')}</p>

  <table class="files"><tbody>
    <tr><th>Klant zegt</th><td><strong>${esc(claim)}</strong>${o.vat_check_name ? ` · ${esc(o.vat_check_name)}` : ''}</td></tr>
    <tr><th>Verzoek kwam uit</th><td>${from
      ? `<strong>${esc(from)}</strong>${mismatch ? ' <span class="pill danger">wijkt af</span>' : ' <span class="pill">gelijk</span>'}`
      : '<span class="muted">niet vastgelegd — bestelling van vóór migratie 0023</span>'}</td></tr>
    <tr><th>Factuuradres</th><td>${esc(o.billing_address || '—')}</td></tr>
    <tr><th>Reden dat hij hier staat</th><td>${esc(o.review_reason || 'niet vastgelegd')}</td></tr>
    <tr><th>Nu gerekend</th><td>${esc(o.vat_treatment || '—')} · btw ${cents(o.vat_cents)} over ${cents(net)}</td></tr>
  </tbody></table>

  <div class="rev-actions">
    <form method="post" action="/admin/orders/${o.id}/vat">
      <input type="hidden" name="action" value="approve">
      <button class="btn btn-primary" type="submit">Opgave klopt — 0% blijft staan</button>
    </form>
    <form method="post" action="/admin/orders/${o.id}/vat">
      <input type="hidden" name="action" value="charge_vat">
      <button class="btn" type="submit">Btw alsnog rekenen — ${cents(withVat)} erbij</button>
    </form>
    <form method="post" action="/admin/orders/${o.id}/vat">
      <input type="hidden" name="action" value="reject">
      <button class="btn btn-ghost" type="submit">Afwijzen, ik neem contact op</button>
    </form>
  </div>
  <p class="meta">De nettoprijs verandert bij geen van de drie. "Btw alsnog rekenen" zet er ${vatPercent()} bovenop en laat ${esc(cents(net))} staan.</p>
</div>`;
      }).join('')
    : '<p class="empty">Niets in behandeling. Elke bestelling met een btw-opgave die we konden nakijken, is gewoon doorgegaan.</p>'}`;

  return html(page({ title: 'Btw-controle', body }));
}

/*
 * De beslissing wegschrijven.
 *
 * ── ALLE DRIE DE UITKOMSTEN ZIJN TERUG TE LEZEN ────────────────────────────
 *
 * Elke handeling schrijft drie dingen: de nieuwe toestand op de bestelling, een
 * regel op de tijdlijn die de KLANT ziet, en een regel in het adminlogboek met wie
 * het deed. Dat laatste is niet paranoia: dit is de enige plek in dit dashboard waar
 * één klik 21% van een factuur verschuift, en dan hoort er te staan wie er op klikte.
 *
 * ── DE KLANT ZIET EEN NEUTRALE REGEL ───────────────────────────────────────
 *
 * Op zijn tijdlijn staat "btw-gegevens nagekeken" en niet "wij dachten dat je loog".
 * Het overgrote deel van de mensen dat hier langskomt heeft niets verkeerd gedaan —
 * ze zitten buiten de EU, waar geen register is. De reden die jij hebt gezien blijft
 * in `review_reason` staan en gaat niet mee naar de klant.
 */
async function handleVatDecision({ request, env }, orderId, admin) {
  const back = '/admin/vat';
  const form = await request.formData();
  const action = String(form.get('action') || '');
  if (!['approve', 'charge_vat', 'reject'].includes(action)) return seeOther(back);

  const order = await env.DB.prepare(
    'SELECT id, ref, total_cents, vat_cents, review_state FROM orders WHERE id = ?1'
  ).bind(orderId).first();
  if (!order) return seeOther(back);
  // Alleen wat nog in behandeling is. Twee tabbladen open hebben mag geen tweede
  // beslissing over dezelfde bestelling opleveren.
  if (String(order.review_state || '') !== 'pending') return seeOther(back);

  const net = Number(order.total_cents) || 0;
  const statements = [];
  let note;
  let detail;

  if (action === 'approve') {
    statements.push(env.DB.prepare(
      `UPDATE orders
          SET review_state = 'approved', reviewed_at = datetime('now'), reviewed_by = ?2
        WHERE id = ?1 AND review_state = 'pending'`
    ).bind(orderId, admin?.email || 'admin'));
    note = 'Btw-gegevens nagekeken en in orde. De bestelling kan betaald worden.';
    detail = `${order.ref}: opgave goedgekeurd, tarief ongewijzigd`;
  } else if (action === 'charge_vat') {
    /*
     * DE NETTOPRIJS BLIJFT STAAN, ER KOMT 21% BOVENOP.
     *
     * `total_cents` is het bedrag EXCLUSIEF btw (zie orderMoney() in account.js) en
     * `vat_cents` is de btw ernaast. Deze handeling raakt dus alleen de tweede.
     * Dat is precies wat er fiscaal gebeurt: de prijs van het werk verandert niet,
     * er wordt vastgesteld dat Nederlandse btw van toepassing is.
     *
     * Het land dat de klant opgaf blijft staan. Zie de kop hierboven: dit scherm
     * herschrijft de opgave van de klant niet.
     */
    const vat = Math.round(net * VAT_RATE);
    statements.push(env.DB.prepare(
      `UPDATE orders
          SET review_state = 'approved', reviewed_at = datetime('now'), reviewed_by = ?2,
              vat_treatment = 'nl_standard', vat_rate = ?4, vat_cents = ?3
        WHERE id = ?1 AND review_state = 'pending'`
    ).bind(orderId, admin?.email || 'admin', vat, VAT_RATE));
    note = 'Btw-gegevens nagekeken. Op deze bestelling wordt Nederlandse btw gerekend; het bedrag exclusief btw is niet veranderd.';
    detail = `${order.ref}: ${vatPercent()} btw alsnog gerekend (${vat} cent over ${net} cent)`;
  } else {
    statements.push(env.DB.prepare(
      `UPDATE orders
          SET review_state = 'rejected', reviewed_at = datetime('now'), reviewed_by = ?2
        WHERE id = ?1 AND review_state = 'pending'`
    ).bind(orderId, admin?.email || 'admin'));
    note = 'We hebben een vraag over de btw-gegevens van deze bestelling en nemen contact met je op.';
    detail = `${order.ref}: opgave afgewezen, wacht op contact`;
  }

  statements.push(env.DB.prepare(
    `INSERT INTO order_events (order_id, status, note, actor)
     VALUES (?1, 'pending', ?2, 'studio')`
  ).bind(orderId, note));

  await env.DB.batch(statements);
  await logAdmin(env, admin, `vat:${action}`, { orderId, detail });

  /* ── EN DAN DE BETAALLINK — 20 AUGUSTUS 2026 ───────────────────────────────
     Tot vandaag hield het hier op. De poort in functions/api/order.js houdt een
     bestelling met een twijfelachtige btw-opgave of van buiten de EU tegen: geen
     betaling aangemaakt, geen checkout, netjes op deze lijst. Jij keurde hem hier
     goed, er kwam een regel in de tijdlijn — en verder gebeurde er niets. De klant
     zat te wachten op een betaallink die jij met de hand moest maken, terwijl de
     bevestigingsmail hem belooft dat die binnen 24 uur komt.

     Alleen bij goedkeuring, en alleen als er iets te betalen is. Een afgewezen
     opgave krijgt geen link: daar hoort een gesprek bij en geen incasso. */
  if (action === 'approve' || action === 'charge_vat') {
    /* ── EN ALS DE LINK NIET WEGGAAT, MOET DAT ERGENS STAAN ─────────────────
       Dit was een `catch` met alleen een console.error erin, en stuurBetaallink()
       heeft daarnaast vier stille `return null`-uitgangen: geen sleutel, geen
       e-mailadres, al betaald, of een brutobedrag van nul. Op het scherm zag
       alle vijf er hetzelfde uit: de bestelling verdwijnt van de lijst en het
       lijkt gelukt. De klant wacht op een link die nooit komt, en zeven dagen
       later verviel zijn bestelling ook nog eens — zie cancelStaleApprovals().

       De uitkomst gaat nu naar `admin_log` en niet naar `order_events`: dit is
       een mededeling voor de beheerder over een verzending die niet lukte, en
       order_events is wat de KLANT te zien krijgt. */
    const uitkomst = await stuurBetaallink({ request, env }, orderId)
      .catch((e) => ({ mislukt: e && e.message ? e.message : String(e) }));
    if (!uitkomst || uitkomst.mislukt) {
      await logAdmin(env, admin, 'payment-link.failed', {
        orderId,
        detail: `${order.ref}: geen betaallink verstuurd — ${uitkomst?.mislukt || 'geen link aangemaakt (geen sleutel, geen e-mailadres, al betaald, of niets te betalen)'}`,
      }).catch(() => {});
      console.error('[admin] betaallink voor bestelling', orderId, 'niet verstuurd —', uitkomst?.mislukt || 'stille uitgang');
    }
  }
  return seeOther(back);
}

/*
 * ── DE BETAALLINK NA EEN GOEDKEURING ────────────────────────────────────────
 *
 * Dezelfde route als functions/api/order.js gebruikt bij een bestelling die
 * meteen door de poort komt: createOrderMolliePayment() met het BRUTO bedrag, en
 * een mail met de link erin. Eén verschil, en dat is het belangrijke: het bedrag
 * wordt hier opnieuw uit de bestelling gelezen en niet uit iets dat bij het
 * bestellen is uitgerekend. Bij `charge_vat` is `vat_cents` net veranderd, en een
 * link voor het oude bedrag zou het verschil stil laten verdwijnen.
 *
 * Er wordt niets weggeschreven over deze link. De webhook van Mollie is de enige
 * die `payment_status` aanraakt (zie de noot daar), en een tweede plek die dat
 * doet is precies hoe een betaalde bestelling onbetaald blijft staan.
 */
async function stuurBetaallink({ request, env }, orderId) {
  if (!env.MOLLIE_API_KEY) {
    console.warn('[admin] geen MOLLIE_API_KEY — geen betaallink voor bestelling', orderId);
    return null;
  }
  const o = await env.DB.prepare(
    `SELECT id, ref, email, lang, service, product_count, total_cents, vat_cents, vat_rate, payment_status
       FROM orders WHERE id = ?1`
  ).bind(orderId).first();
  if (!o || !o.email) return null;
  /* Al betaald? Dan is er niets te sturen. Kan gebeuren als iemand twee tabbladen
     open heeft, of als de klant in de tussentijd via een eerdere link betaald heeft. */
  if (String(o.payment_status || '') === 'paid') return null;

  const bruto = (Number(o.total_cents) || 0) + (Number(o.vat_cents) || 0);
  if (!(bruto > 0)) return null;

  const lang = o.lang === 'en' ? 'en' : 'nl';
  const origin = new URL(request.url).origin;
  const svcNaam = serviceLabel(o.service, lang) || o.service;

  const payment = await createOrderMolliePayment(env, {
    ref: o.ref,
    lang,
    valueEuros: (bruto / 100).toFixed(2),
    grossCents: bruto,
    description: `VISUAILS ${o.ref}`,
    /* IN DE TAAL VAN DE KLANT. Hier stond het Engelse pad vast ingebakken,
       terwijl `lang` drie regels hoger al bepaald is: een Nederlandse klant die
       op deze link betaalde, landde op de Engelse bedankpagina. De gewone
       bestelroute doet het wél goed (die neemt het pad uit het formulier). */
    successUrl: `${origin}${lang === 'nl' ? '/nl' : ''}/thank-you?paid=${encodeURIComponent(o.ref)}`,
    webhookUrl: `${origin}/api/webhook/mollie`,
    /* Bij 0% geen iDEAL, om dezelfde reden als bij een gewone bestelling: een
       Nederlandse bankrekening onder een buitenlandse claim is precies wat je
       niet achteraf wilt uitzoeken. Zie de toelichting in src/lib/mollie.js. */
    excludeIdeal: Number(o.vat_rate) === 0,
  });
  const url = payment?._links?.checkout?.href || null;
  if (!url) {
    console.error('[admin] Mollie gaf geen betaallink voor', o.ref);
    return null;
  }

  const bedrag = `€ ${(bruto / 100).toFixed(2).replace('.', ',')}`;
  await sendMail(env, {
    to: o.email,
    subject: lang === 'nl'
      ? `Je bestelling is nagekeken — ${o.ref}`
      : `Your order has been checked — ${o.ref}`,
    html: mailShell({
      lang,
      preheader: lang === 'nl' ? 'De betaallink staat erin.' : 'The payment link is inside.',
      body: [
        mailH1(lang === 'nl' ? 'Nagekeken en akkoord' : 'Checked and cleared'),
        mailP(lang === 'nl'
          ? `We hebben de gegevens bij <strong>${esc(o.ref)}</strong> nagekeken. Alles klopt, dus je kunt nu betalen — daarna begint de productie meteen.`
          : `We have checked the details on <strong>${esc(o.ref)}</strong>. Everything is in order, so you can pay now — production starts straight after.`),
        mailPayPanel({
          label: lang === 'nl' ? 'Te betalen' : 'To pay',
          amount: bedrag,
          sub: `${esc(svcNaam)}${o.product_count ? ` · ${o.product_count}` : ''}`,
          href: url,
          cta: lang === 'nl' ? 'Betalen' : 'Pay now',
        }),
        mailLinkLine(url, lang === 'nl' ? 'Werkt de knop niet? Gebruik deze link:' : 'Button not working? Use this link:'),
        mailSpamNote(lang),
      ].join(''),
    }),
  });

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, status, note, actor)
     VALUES (?1, 'pending', ?2, 'studio')`
  ).bind(orderId, lang === 'nl'
    ? `Betaallink verstuurd naar ${o.email} voor ${bedrag}.`
    : `Payment link sent to ${o.email} for ${bedrag}.`).run();

  console.log('[admin] betaallink verstuurd voor', o.ref);
  return url;
}

function dashboardBody(revisions, orders, modelsByCustomer, counts, statusCounts, statusFilter = '', view = {}, vatHeld = 0, watch = null, tmWaiting = 0) {
  const { q = '', filter = '', hidden = false } = view;

  /* Zoeken en filteren, in één rij boven de lijst.
   *
   * EEN GET-FORMULIER, geen POST: dan is het resultaat een URL die je kunt
   * bewaren, doorsturen en verversen. Dat is precies wat je wilt van "alle
   * onbetaalde bestellingen" — dat is geen handeling maar een plek. */
  const chip = (key, label) => {
    const on = filter === key;
    const url = new URLSearchParams();
    if (statusFilter) url.set('status', statusFilter);
    if (q) url.set('q', q);
    if (!on) url.set('f', key);
    if (hidden) url.set('hidden', '1');
    const qs = url.toString();
    return `<a class="fl-chip${on ? ' is-active' : ''}" href="/admin${qs ? `?${qs}` : ''}"${on ? ' aria-current="true"' : ''}>${esc(label)}</a>`;
  };

  const searchRow = `
<form class="searchrow" method="get" action="/admin">
  ${statusFilter ? `<input type="hidden" name="status" value="${esc(statusFilter)}">` : ''}
  ${filter ? `<input type="hidden" name="f" value="${esc(filter)}">` : ''}
  ${hidden ? '<input type="hidden" name="hidden" value="1">' : ''}
  <input type="search" name="q" value="${esc(q)}" placeholder="Reference, brand, email or name" aria-label="Search orders">
  <button class="btn btn-ghost btn-sm" type="submit">Search</button>
  ${q ? `<a class="fl-chip" href="/admin">Clear</a>` : ''}
</form>
<div class="fl-row">
  ${chip('revisions', 'Revisions open')}
  ${chip('unpaid', 'Unpaid')}
  ${chip('unannounced', 'Delivered, not announced')}
  ${chip('paid_undelivered', 'Paid, not delivered')}
  ${chip('delivered_unpaid', 'Delivered, not paid')}
  <a class="fl-chip${hidden ? ' is-active' : ''}" href="/admin?hidden=${hidden ? '0' : '1'}">${hidden ? 'Hiding hidden again' : 'Include hidden'}</a>
  <a class="fl-chip" href="/admin/log">Activity log &rarr;</a>
  ${/*
      DE LINK NAAR DE BTW-CONTROLE, MET HET AANTAL ERIN.

      Een scherm dat niemand kan bereiken is hetzelfde probleem als geen scherm — en
      dat was precies wat er met `orders.review_state` aan de hand was: de toestand
      bestond, er was geen weg ernaartoe. Het getal staat erbij omdat een link zonder
      getal je niet vertelt of je erop moet klikken.

      Staat er niets in behandeling, dan is de chip er ook niet. Een lege lijst is
      geen werk en hoort niet elke dag om aandacht te vragen.
   */''}${vatHeld > 0
    ? `<a class="fl-chip is-warn" href="/admin/vat">Btw-controle &middot; ${vatHeld} &rarr;</a>`
    : ''}${/*
      DE AANBEVELINGEN, om precies dezelfde reden als de regel hierboven en met
      precies dezelfde fout in de voorgeschiedenis: de kolom bestond, de toestand
      bestond, en er was geen weg ernaartoe. Zie de kop van renderTestimonials().

      GEEN is-warn. Een aanbeveling die nog niet nagekeken is, is geen bestelling
      die vastzit — er wacht niemand op. Een gewone chip dus, die alleen laat zien
      dat er iets te lezen valt.
   */''}${tmWaiting > 0
    ? `<a class="fl-chip" href="/admin/testimonials">Aanbevelingen &middot; ${tmWaiting} &rarr;</a>`
    : ''}${watch ? watchChip(WATCH.cron, watch.cron) : ''}${watch
    ? watchChip(WATCH.backup, watch.backup)
    : ''}
  <a class="fl-chip" href="/admin/funnel">Trechter &rarr;</a>
</div>`;

  return `
<div class="bar">
  <a class="mark" href="/">VISUAILS</a>
  <div class="bar-right">
    <span>Admin</span>
    <form method="post" action="/admin/logout"><button class="btn btn-ghost" type="submit">Sign out</button></form>
  </div>
</div>
<h1>Dashboard</h1>
<p class="lede"><a href="/admin/customers">Customers &rarr;</a></p>
${counts ? todayStrip(counts) : ''}

<h2>Revision requests</h2>
${revisions.length ? revisions.map(revisionCard).join('') : '<p class="empty">Nothing waiting. A client\'s "request a revision" in their portal lands here, with their note.</p>'}

<h2>Orders${statusFilter ? ` · ${esc(STATUS_LABEL[statusFilter] || statusFilter)}` : ''}${q ? ` · &ldquo;${esc(q)}&rdquo;` : ''}</h2>
${searchRow}
${statusFilterRow(statusCounts, statusFilter)}
${orders.length
  ? orders.map((o) => orderCard(o, modelsByCustomer.get(o.customer_id) || [], statusFilter)).join('')
  : statusFilter
    ? `<p class="empty">Nothing at "${esc(STATUS_LABEL[statusFilter] || statusFilter)}" right now. <a href="/admin">All orders</a></p>`
    : '<p class="empty">No orders yet.</p>'}`;
}

/**
 * The status filter — a row of links, one per status, each carrying its count.
 *
 * EVERY STATUS IS SHOWN HERE, including the ones with no orders, which is the
 * opposite of what account.js does with the same control and the difference is
 * deliberate. A customer's chip row is about their own history, so an empty
 * status is noise. This row is a tool Lucas uses all day, and a "cancelled"
 * link that appears and disappears depending on the week is a control whose
 * position he cannot learn. A 0 here is information: it says nothing is stuck.
 *
 * The active one is a <span> rather than a link to the page you are already on.
 */
function statusFilterRow(statusCounts, statusFilter) {
  if (!statusCounts) return '';
  const total = STATUSES.reduce((n, s) => n + (statusCounts[s] || 0), 0);
  const chip = (href, label, n, active) => active
    ? `<span class="fl-chip is-active" aria-current="true">${esc(label)} <span class="fl-n">${n}</span></span>`
    : `<a class="fl-chip" href="${esc(href)}">${esc(label)} <span class="fl-n">${n}</span></a>`;

  return `<nav class="fl" aria-label="Filter orders by status">
    ${chip('/admin', 'All', total, !statusFilter)}
    ${STATUSES.map((s) => chip(
      `/admin?status=${encodeURIComponent(s)}`,
      STATUS_LABEL[s] || s,
      statusCounts[s] || 0,
      statusFilter === s,
    )).join('')}
  </nav>`;
}

/*
 * WAAROM ER EEN THUMBNAIL OP MOET. Lucas: *"in /admin willen zien bij elke order
 * en foto waar een revisie voor is aangevraagd."* Een bestandsnaam plus een
 * notitie dwingt je om in een ander scherm te gaan zoeken welk beeld het is,
 * en dat is de stap waar dit overzicht juist vanaf moet. /admin/files/<id>
 * bestond al voor precies deze rij, dus het kost één <img>.
 *
 * `asked` staat er alleen bij als er meer dan één is. Bij een eerste aanvraag
 * is "1×" ruis; bij de zevende is het het enige wat je wilt weten.
 */
function revisionCard(r) {
  const repeat = r.asked_here > 1
    ? `<span class="pill is-attention">${r.asked_here}× dit beeld</span>` : '';
  const often = r.asked > 1 ? `<span class="meta">${r.asked}× door dit merk</span>` : '';
  const revoked = r.revisions_revoked_at
    ? `<span class="pill">revisierechten ingetrokken</span>` : '';

  return `
<div class="card is-attention" id="rev-${r.file_id}">
  <div class="row-head">
    <span class="ref"><a href="/admin/orders/${r.order_id}/files">${esc(r.ref)}</a></span>
    <span class="meta">${esc(r.brand || r.email)} · ${esc(when(r.reviewed_at))}</span>
  </div>
  <div class="rev-body">
    <a class="rev-shot" href="/admin/files/${r.file_id}" target="_blank" rel="noopener">
      <img src="/admin/files/${r.file_id}" alt="${esc(r.filename || 'beeld ' + r.file_id)}" loading="lazy" decoding="async">
    </a>
    <div class="rev-text">
      <!-- WAT MOET ER VERVANGEN WORDEN. Het product en de shot staan vóór de
           bestandsnaam, want dat is waar je op zoekt in je eigen map — en het
           is het antwoord op "welke moet ik opnieuw maken". Staat er nog geen
           indeling op dit beeld, dan zegt de regel dat ook: dan is het de
           bestandsnaam of niets, en dat is precies het gat dat de indeeltabel
           op de bestandenpagina dicht. -->
      <p class="rev-what">${r.product_key
        ? `<strong>Product ${esc(r.product_key.replace(/^p/, ''))}${r.shot ? ` &middot; ${esc(r.shot)}` : ''}</strong>`
        : '<strong class="muted">not mapped to a product</strong>'}</p>
      <p class="meta">${esc(r.filename || 'file #' + r.file_id)} ${repeat} ${often} ${revoked}</p>
      ${r.review_note ? `<div class="note">${esc(r.review_note)}</div>` : '<p class="meta">Geen notitie achtergelaten.</p>'}

      <!-- ── DE VERVANGENDE FOTO, HIER EN NIET DRIE SCHERMEN VERDEROP ────────
           Lucas, 27 augustus 2026: *"als de klant een revisie aanvraagt en een
           foto dus wil aanpassen kan ik niet de foto vervangen naar een andere
           foto (...) de klant krijgt dan dezelfde foto weer terug."*

           Dat klopte, en de oorzaak was niet dat het niet KON maar dat het hier
           niet stond. De juiste weg bestaat al helemaal: upload een nieuw beeld
           op hetzelfde product en dezelfde shot, dan zet resupersede() het oude
           op superseded_at, verdwijnt het uit het portaal van de klant, en sluit
           closeReplacedRevisions() bij het aankondigen het verzoek. Die weg
           begon alleen op de bestandenpagina, terwijl de knop hier stond.

           Deze knop stuurt naar precies diezelfde route, met product en shot al
           ingevuld — dus er valt niets meer te kiezen of te hernoemen. -->
      ${r.product_key && r.shot ? `
      <form method="post" action="/admin/orders/${r.order_id}/deliver"
            enctype="multipart/form-data" class="rev-vervang">
        <input type="hidden" name="product" value="${esc(r.product_key)}">
        <input type="hidden" name="shot" value="${esc(r.shot)}">
        <input type="file" name="files" accept="image/*" required>
        <button class="btn btn-primary" type="submit">Vervangende foto uploaden</button>
      </form>
      <p class="meta">Daarna aankondigen op de bestelling — dan gaat de mail eruit en sluit dit verzoek vanzelf.</p>
      ` : `
      <p class="meta">Dit beeld is nog niet ingedeeld op een product en een shot, dus een
      vervanging kan er niet automatisch overheen. Deel het eerst in op
      <a href="/admin/orders/${r.order_id}/files">de bestandenpagina</a>.</p>
      `}

      <!-- ── EN DE UITWEG VOOR "ER HOEFT NIETS VERVANGEN TE WORDEN" ──────────
           Deze knop heette "Opgelost — terug naar de klant" en dat was precies
           de val: hij klinkt als het einde van het werk terwijl hij het beeld
           niet aanraakt. Hij zet alleen de toestand terug, dus de klant kreeg
           dezelfde foto opnieuw ter beoordeling. Nu zegt hij wat hij doet. -->
      <form method="post" action="/admin/revisions/${r.file_id}/resolve" class="rev-actions">
        <input type="text" name="fixed" maxlength="${ANNOUNCE_NOTE_MAX}" required
               placeholder="Waarom hoeft er niets vervangen te worden? Dit komt op de tijdlijn van de klant."
               class="in-grow">
        <button class="btn btn-ghost" type="submit">Geen nieuw beeld nodig</button>
      </form>
      <p class="meta"><a href="/admin/customers/${r.customer_id}">Klant bekijken</a></p>
    </div>
  </div>
</div>`;
}

function orderCard(o, models, statusFilter = '') {
  const options = STATUSES.map(
    (s) => `<option value="${s}"${s === o.status ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`
  ).join('');
  const window = o.window_start ? `${esc(o.window_start)} → ${esc(o.window_end)}` : '—';
  // Task #271e: custom_models for this order’s customer, read-only, so Lucas
  // can see what a brand already has before adding another with the same
  // name by accident — see loadCustomModelsByCustomer()'s header.
  const modelList = models.length
    ? `<p class="meta">Custom models: ${models.map((m) => `${esc(m.label)} (${esc(m.status)})`).join(', ')}</p>`
    : '';

  // DELIVERED, BUT WAS THEY TOLD? The mail is deliberately not awaited into the
  // response and its failure is deliberately swallowed — a mail that fails must
  // not turn a successful status change into an error page. The cost of that
  // choice is silence, and this line is what pays it back: the one place the
  // studio can see that an order is marked delivered and the customer still
  // does not know. Pressing Update on 'delivered' again retries the send —
  // sendDeliveryMail is guarded on delivery_mailed_at, which is exactly the
  // column that is still empty here, so a retry is safe and cannot double-send.
  const unannounced = o.status === 'delivered' && !o.delivery_mailed_at
    ? '<p class="warnline">Delivered, but the customer has not been emailed. Set the status to <strong>delivered</strong> again to retry the mail.</p>'
    : '';

  // EN DE TWEEDE STILTE, sinds augustus 2026. Bovenstaande regel vangt de
  // bestelling die nooit is aangekondigd. Deze vangt de bestelling die wél is
  // aangekondigd en daarna nieuwe beelden kreeg — de revisie die is opgelost en
  // waar niemand iets over gezegd heeft. Zonder deze regel is dat alleen te
  // zien door elke geleverde bestelling één voor één open te klikken, en dus in
  // de praktijk niet.
  const pendingAnnounce = o.delivery_mailed_at && o.unannounced
    ? `<p class="warnline">${o.unannounced} delivered ${o.unannounced === 1 ? 'file has' : 'files have'} not been announced.
        <a href="/admin/orders/${o.id}/files">Tell the customer &rarr;</a></p>`
    : '';
  return `
<div class="card">
  <div class="row-head">
    <span class="ref">${esc(o.ref)}</span>
    <span class="pill is-${esc(o.status)}">${STATUS_LABEL[o.status] || esc(o.status)}</span>
    <!-- The way in to this order’s files, both directions. Added August 2026,
         when the 30-product test order made it clear the notification email is
         a heads-up and not a delivery mechanism. -->
    <a class="files-link" href="/admin/orders/${o.id}/files">Files${o.file_count ? ` (${o.file_count})` : ''}</a>
  </div>
  <p class="meta">${esc(o.brand || '—')} · ${esc(o.email)} · ${esc(o.service)}/${esc(o.tier)} ·
     ${o.product_count ? `${esc(o.product_count)} products · ` : ''}window ${window} ·
     payment ${esc(o.payment_status)} · ${esc(when(o.created_at))}</p>
  <form class="controls" method="post" action="/admin/orders/${o.id}/status">
    <!-- Where to go back to. Without this, moving one order out of a filtered
         list drops Lucas back on the unfiltered dashboard and he has to re-pick
         the filter after every single update — which is the whole working
         session, not an edge case. handleStatusUpdate re-validates it against
         STATUSES rather than trusting the round trip. -->
    ${statusFilter ? `<input type="hidden" name="back" value="${esc(statusFilter)}">` : ''}
    <select name="status">${options}</select>
    <input type="text" name="note" placeholder="Note (optional, goes on the client’s timeline too)" class="in-grow">
    <button class="btn btn-primary" type="submit">Update</button>
  </form>
  ${unannounced}
  ${pendingAnnounce}
  ${o.hidden_at ? `<p class="meta">Hidden since ${esc(when(o.hidden_at))} — it stays out of the lists and the counts.</p>` : ''}
  ${o.cancel_reason ? `<p class="warnline">Cancelled: ${esc(o.cancel_reason)}${o.cancel_payment ? ` · ${esc({ refund: 'refunded', credit: 'credit given', none: 'no refund' }[o.cancel_payment] || o.cancel_payment)}` : ''}</p>` : ''}
  ${modelList}
  ${orderDanger(o)}
  <form class="controls" method="post" action="/admin/orders/${o.id}/models">
    <input type="text" name="label" placeholder="New custom model label (e.g. 'Studio Look A')" class="in-grow" required>
    <button class="btn btn-ghost" type="submit">Add custom model</button>
  </form>
</div>`;
}

/**
 * De drie manieren om een bestelling weg te krijgen, achter één klapje.
 *
 * DICHTGEKLAPT, want dit zijn de knoppen die je een paar keer per maand nodig
 * hebt en nooit per ongeluk. Open staan ze naast elkaar mét hun verschil
 * uitgeschreven, zodat de keuze gemaakt wordt op wat er gebeurt en niet op
 * welke knop het dichtst bij de muis staat.
 *
 * VERWIJDEREN VERDWIJNT BIJ EEN BETAALDE BESTELLING. Niet grijs, niet met een
 * foutmelding achteraf: hij staat er niet. Een knop die je niet mag indrukken
 * is een knop die je op een dag toch indrukt.
 */
function orderDanger(o) {
  const paid = o.payment_status === 'paid' && Number(o.total_cents || 0) > 0;
  const cancelled = o.status === 'cancelled';
  return `
<details class="danger">
  <summary>Cancel, hide or delete</summary>
  <div class="danger-body">
    ${cancelled
      ? '<p class="meta">Already cancelled.</p>'
      : `<form method="post" action="/admin/orders/${o.id}/cancel" class="danger-block">
           <h4>Cancel</h4>
           <p class="meta">The order stays on file, the customer sees &ldquo;cancelled&rdquo; and your reason on their timeline.</p>
           <input type="text" name="reason" required maxlength="500" placeholder="Why is this not going ahead? The customer reads this.">
           ${paid
             ? `<label class="danger-money">What happens with the money?
                  <select name="payment" required>
                    <option value="">— choose —</option>
                    <option value="refund">Refund it</option>
                    <option value="credit">Credit for a future order</option>
                    <option value="none">Nothing, keep it</option>
                  </select>
                </label>
                <p class="meta">Choosing <strong>Refund it</strong> sends the money back through Mollie right here. The credit note follows by itself once Mollie confirms.</p>`
             : '<p class="meta">Nothing was paid, so there is nothing to decide about money.</p>'}
           <button class="btn btn-ghost btn-sm" type="submit">Cancel this order</button>
         </form>`}

    <form method="post" action="/admin/orders/${o.id}/hide" class="danger-block">
      <h4>${o.hidden_at ? 'Unhide' : 'Hide'}</h4>
      <p class="meta">${o.hidden_at
        ? 'Put it back in the lists and the counts.'
        : 'Your own test orders and accidental doubles. Out of the lists and the counts, still in the database.'}</p>
      <input type="hidden" name="action" value="${o.hidden_at ? 'show' : 'hide'}">
      <button class="btn btn-ghost btn-sm" type="submit">${o.hidden_at ? 'Show again' : 'Hide from my lists'}</button>
    </form>

    ${paid
      ? '<div class="danger-block"><h4>Delete</h4><p class="meta">Not available: this order was paid, and a paid order has to stay on file. Cancel or hide it instead.</p></div>'
      : `<form method="post" action="/admin/orders/${o.id}/delete" class="danger-block is-worst">
           <h4>Delete for good</h4>
           <p class="meta">Unpaid only. The row and its files in R2 go, and nothing brings them back. Type <strong>${esc(o.ref)}</strong> to confirm.</p>
           <input type="text" name="confirm" required placeholder="${esc(o.ref)}" autocomplete="off">
           <button class="btn btn-ghost btn-sm" type="submit">Delete this order</button>
         </form>`}
  </div>
</details>`;
}

/**
 * De foutpagina. `message` is HTML, en dat is een bewuste keuze.
 *
 * Hij escapete zijn argument, terwijl elke aanroeper hier opmaak doorgeeft —
 * `<strong>${esc(order.ref)}</strong>`, regeleindes tussen mislukte bestanden,
 * een `&rsquo;`. Het resultaat was een foutpagina die je letterlijk
 * `&lt;strong&gt;VIS-2608-4471&lt;/strong&gt;` liet lezen op het moment dat je al
 * iets verkeerd had gedaan. Elke aanroeper escapet zijn eigen variabelen (dat
 * is nagelopen), dus de opmaak mag hier door.
 */
function errorBody(message) {
  return `<div class="bar"><a class="mark" href="/">VISUAILS</a></div><p class="error is-page">${message}</p>`;
}

function page({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="color-scheme" content="light">
<title>${esc(title)} — VISUAILS admin</title>
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="stylesheet" href="/admin.css">
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>`;
}

/**
 * Response headers, matching portal.js's html()/security posture — this page
 * is even more sensitive (it changes state, not just approves photos), so
 * nothing here should be weaker than the portal's own defaults. See
 * portal.js's html() for what each header defends and why.
 */
function html(body, status = 200, extraSetCookies = []) {
  const headers = new Headers({
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'referrer-policy': 'same-origin',
    'x-robots-tag': 'noindex, nofollow',
    'x-content-type-options': 'nosniff',
    'content-security-policy':
      "default-src 'none'; img-src 'self'; style-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  for (const c of extraSetCookies) headers.append('Set-Cookie', c);
  return new Response(body, { status, headers });
}

function seeOther(location, setCookies = []) {
  const headers = new Headers({ Location: location, 'cache-control': 'no-store', 'referrer-policy': 'same-origin' });
  for (const c of setCookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 303, headers });
}

function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
}

/** SQLite's datetime('now') has no timezone marker and IS UTC — same fix as token.js's parseStamp. */
function normalizeStamp(value) {
  if (!value) return value;
  return /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
}

function when(stamp) {
  if (!stamp) return '—';
  const t = Date.parse(normalizeStamp(stamp));
  if (Number.isNaN(t)) return '—';
  return new Date(t).toISOString().slice(0, 16).replace('T', ' ');
}
