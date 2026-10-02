/*
 * DE DOORLOOP VAN 23–24 SEPTEMBER 2026, ALS TOETS
 *
 * Lucas liet de hele site doorlopen als klant en als studio, in een echte
 * browser tegen de echte Worker met een nep-Mollie en een nep-Resend
 * (kladblok/_doorloop-worker.mjs). Wat daar stuk bleek, staat hieronder vast,
 * zodat het niet stil terugkomt:
 *
 *   1. het contactformulier stuurde nooit een mail (TDZ op `quote`);
 *   2. de klantentijdlijn kreeg Engelse interne regels;
 *   3. een abonnementsweek met alleen catalog heette 'drop';
 *   4. een betaalde abonnementsmaand gaf geen mail;
 *   5. pauzeren/hervatten/opzeggen gaf geen bevestiging;
 *   6. het merkmodelformulier werd door de ClientRouter onderschept;
 *   7. order-status kende 'mislukt' niet.
 *
 * Ronde twee (24 september) staat onder 8: betaallinks die verliepen, een
 * btw-lijst die '0% blijft staan' bood bij 21%, een abonnement dat na een
 * mislukte eerste betaling 'gelukt' zei en daarna vastzat, en meer.
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';
import { onRequestPost as orderPost } from '../functions/api/order.js';

let pass = 0;
let fail = 0;
function ok(name, got, want = true) {
  const good = got === want;
  if (good) pass++; else fail++;
  console.log(`${good ? ' ok  ' : ' FAIL'} ${name.padEnd(64)}${good ? '' : `verwacht ${JSON.stringify(want)}, kreeg ${JSON.stringify(got)}`}`);
}
const lees = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

console.log('\nVISUAILS — wat de doorloop vond\n');

/* ── 1 · HET CONTACTFORMULIER MAILT ÉCHT ─────────────────────────────────── */
console.log('het contactformulier');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const verstuurd = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.resend.com')) {
      verstuurd.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ id: 'em_1' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('{}', { status: 200 });
  };
  const fd = new FormData();
  for (const [k, v] of Object.entries({
    service: 'contact', redirect: '/nl/thank-you/?soort=contact', lang: 'nl', name: 'Henk', email: 'henk@zaak.test',
    phone: '0612345678', topic: 'custom-request', message: 'Doen jullie ook schoenen?', contact_preference: 'whatsapp',
  })) fd.append(k, v);
  const res = await orderPost({
    request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { Origin: 'https://visuails.com' } }),
    env: { DB: d1(db), RESEND_API_KEY: 're_x', NOTIFY_EMAIL: 'studio@visuails.test', FROM_EMAIL: 'x@y.z' },
    waitUntil: () => {},
  });
  globalThis.fetch = echteFetch;
  ok('het antwoord is een omleiding', res.status, 303);
  ok('naar de Nederlandse bedankpagina voor een bericht', /\/nl\/thank-you\/\?soort=contact/.test(res.headers.get('location') || ''), true);
  /* Twee mails sinds ronde 8: de studio, en een ontvangstbevestiging aan de
     bezoeker met een kopie van zijn bericht (M-C9). */
  ok('er gingen twee mails: studio en bezoeker', verstuurd.length, 2);
  ok('de tweede gaat naar de bezoeker, met zijn bericht', verstuurd[1]?.to === 'henk@zaak.test' && /Doen jullie ook schoenen/.test(verstuurd[1]?.html || ''), true);
  ok('en antwoorden op de studiomail gaat naar de bezoeker', verstuurd[0]?.reply_to, 'henk@zaak.test');
  ok('met het onderwerp in de onderwerpregel', /Iets op maat/.test(verstuurd[0]?.subject || ''), true);
  ok('en het gekozen kanaal in de mail', /WhatsApp/.test(verstuurd[0]?.html || ''), true);
  const rij = db.prepare('SELECT subject FROM messages').get();
  ok('het bericht staat met onderwerp in de database', rij?.subject, 'Iets op maat');
}

/* ── 2 · DE KLANTENTIJDLIJN ──────────────────────────────────────────────── */
console.log('\nde tijdlijn van de klant');
{
  const order = lees('../functions/api/order.js');
  const webhook = lees('../functions/api/webhook/mollie.js');
  ok('bij het bestellen komt er een klantregel in order_events', /klantNote\(\{ lang, uploads: staged\.length, window: finalWindow \}\)/.test(order), true);
  ok('en de studioregel gaat naar admin_log', /'order\.created'/.test(order), true);
  ok('bij het betalen een regel in de taal van de klant', /Betaling ontvangen\$\{mode === 'test' \? ' \(testbetaling\)' : ''\}/.test(webhook), true);
  ok('en de Mollie-id alleen in admin_log', /'payment\.paid'/.test(webhook), true);
  ok('de import van quote is hernoemd (anders TDZ in onRequestPost)', /quote as mailQuote/.test(order), true);
}

/* ── 3 · DE ABONNEMENTSWEEK KRIJGT DE JUISTE DIENST ─────────────────────── */
console.log('\nde bestelling uit een abonnementsweek');
{
  const plan = lees('../src/lib/planStart.js');
  ok('één soort catalog of lifestyle wordt die dienst', /soorten\[0\] === 'catalog' \|\| soorten\[0\] === 'lifestyle'\) \? soorten\[0\] : 'drop'/.test(plan), true);
  ok('en de INSERT gebruikt die dienst', /VALUES \(\?1, \?2, \?12,/.test(plan), true);
  const admin = lees('../src/lib/admin.js');
  ok('het bord noemt zo’n bestelling niet onbetaald', /o\.payment_status === 'plan' \? ' · abonnement'/.test(admin), true);
}

/* ── 4 · DE MAIL BIJ EEN BETAALDE MAAND ─────────────────────────────────── */
console.log('\nde abonnementsmail');
{
  const { mailSubscriptionInvoice } = await import('../src/lib/invoiceMail.js');
  const verstuurd = [];
  const echteFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { verstuurd.push(JSON.parse(init.body)); return new Response('{"id":"x"}', { status: 200 }); };
  const snap = { date: '2026-09-24', netCents: 79000, vatCents: 16590, grossCents: 95590, treatment: 'nl_standard' };
  const gelukt = await mailSubscriptionInvoice({ RESEND_API_KEY: 're_x', FROM_EMAIL: 'x@y.z' }, {
    sub: { ref: 'SUB-TEST-1', window_day: 10 },
    customer: { email: 'yara@merk.test', lang: 'nl' },
    invoice: { number: 'VIS-2026-0100', lang: 'nl', month: '2026-09', snapshot_json: JSON.stringify(snap) },
    planNaam: 'Pro', credits: 120, eerste: true,
  });
  /* Mislukt de factuur bij de eerste maand, dan komt de welkomstmail toch —
     zonder factuurzinnen. (Hier werd invoice.lang gelezen voordat er op null
     getoetst was; de mail ging dan stil niet weg.) */
  const zonder = await mailSubscriptionInvoice({ RESEND_API_KEY: 're_x', FROM_EMAIL: 'x@y.z' }, {
    sub: { ref: 'SUB-TEST-2', window_day: 10, term: 'monthly' },
    customer: { email: 'zonder@merk.test', lang: 'nl' },
    invoice: null, planNaam: 'Pro', credits: 120, eerste: true, loginLink: 'https://visuails.com/account/verify/abc?lang=nl&naar=plan',
  });
  globalThis.fetch = echteFetch;
  ok('welkomstmail zonder factuur gaat ook weg', zonder && verstuurd.length === 2, true);
  ok('en noemt dan geen factuur', /factuur/i.test(verstuurd[1]?.html || ''), false);
  ok('maar wel de inlogknop', /naar=plan/.test(verstuurd[1]?.html || ''), true);
  ok('de eerste maand geeft een mail', gelukt && /SUB-TEST-1/.test(verstuurd[0]?.subject || ''), true);
  /* Sinds 24 september 2026 is de eerste maand de welkomstmail. */
  ok('met "Welkom bij VISUAILS — je abonnement loopt" in het onderwerp', /Welkom bij VISUAILS — je abonnement loopt/.test(verstuurd[0]?.subject || ''), true);
  ok('met de credits per maand erin', /120 credits per maand/.test(verstuurd[0]?.html || ''), true);
  ok('en het bruto bedrag', /€ 955,90/.test(verstuurd[0]?.html || ''), true);
  const webhook = lees('../functions/api/webhook/mollie.js');
  ok('de webhook roept de mail aan na de factuur', /mailSubscriptionInvoice\(env, \{ sub: wie/.test(webhook), true);
  ok('en meldt een nieuw abonnement bij de studio', /notifySubscriptionStarted\(env/.test(webhook), true);
}

/* ── 5 · PAUZEREN, HERVATTEN, OPZEGGEN ──────────────────────────────────── */
console.log('\npauzeren, hervatten en opzeggen');
{
  const acc = lees('../src/lib/account.js');
  const pauze = acc.slice(acc.indexOf('async function handlePlanPause'));
  const pauzeBody = pauze.slice(0, pauze.indexOf('\n}\n'));
  ok('pauzeren landt op Facturering met een bevestiging', /terugOk\('pauze'\)/.test(pauzeBody), true);
  ok('hervatten ook', /terugOk\('hervat'\)/.test(pauzeBody), true);
  const opzeg = acc.slice(acc.indexOf('async function handlePlanCancel'));
  const opzegBody = opzeg.slice(0, opzeg.indexOf('\n}\n'));
  ok('opzeggen landt op Facturering met een bevestiging', /ok=opgezegd/.test(opzegBody), true);
  ok('en mailt de klant en de studio', /mailAboWijziging\(env, \{ soort: 'opgezegd'/.test(opzegBody), true);
  ok('de bevestigingen hebben tekst', /pauze: jaar \? t\.planPauseOkPrepaid : t\.planPauseOk, hervat: jaar \? t\.planResumeOkPrepaid : t\.planResumeOk, opgezegd: t\.planCancelOk/.test(acc), true);
  /* Een vooruitbetaald jaar heeft geen incasso: pauze en hervatten zeggen dan niets over afschrijven. */
  ok('  en bij een vooruitbetaald jaar zonder "afschrijving"', /planPauseOkPrepaid: 'Je jaar staat op pauze\. Er komen geen nieuwe maanden bij/.test(acc) && /soort === 'pauze'\) \{\n\s+koppen\[1\] = nl\n\s+\? `\$\{hoofd\(jeJaar\)\} staat op pauze\. Het is al betaald, dus er wordt niets afgeschreven/.test(acc), true);
}

/* ── 6 · HET MERKMODELFORMULIER POST ZONDER ROUTER ──────────────────────── */
console.log('\nhet merkmodelformulier');
{
  const bm = lees('../src/components/BrandModelBrief.astro');
  ok('de form draagt data-astro-reload (anders geen Mollie)', /<form action="\/api\/order" method="post" class="bm-form" data-bm-form novalidate data-astro-reload>/.test(bm), true);
}

/* ── 7 · EEN MISLUKTE BETALING IS METEEN TE ZIEN ────────────────────────── */
console.log('\nde bedankpagina na een mislukte betaling');
{
  const status = lees('../functions/api/order-status.js');
  const inter = lees('../src/scripts/interactions.js');
  ok('order-status geeft failed terug', /failed: !paid && failed/.test(status), true);
  ok('de bedankpagina wacht dan niet verder', /if \(!s\.failed && attempt \+ 1 < DELAYS\.length\)/.test(inter), true);
  const webhook = lees('../functions/api/webhook/mollie.js');
  ok('de webhook legt de mislukte betaling vast', /INSERT OR IGNORE INTO payments \(order_id, provider, external_id, status, amount_cents, currency\)/.test(webhook), true);
}

/* ── 8 · RONDE TWEE (24 september 2026) ─────────────────────────────────── */
console.log('\nronde twee: betaallinks, btw-lijst, abonnement, formulieren');
{
  const { bedrag } = await import('../src/lib/mailTemplate.js');
  ok('bedragen met duizendtal, nl', bedrag(151250, 'nl'), '€ 1.512,50');
  ok('en in het Engels met Engelse tekens', bedrag(151250, 'en'), '€ 1,512.50');
  const bl = lees('../src/lib/betaallink.js');
  ok('de betaallinkmail linkt naar /api/order-pay, niet naar een verlopende Mollie-link', /\/api\/order-pay\?ref=/.test(bl) && !/createOrderMolliePayment\(/.test(bl), true);
  ok('na "btw alsnog rekenen" zegt de mail dat er btw bij kwam', /btwErbij/.test(bl) && /Nagekeken — met btw/.test(bl), true);
  const order = lees('../functions/api/order.js');
  ok('ook de bevestigingsmail linkt naar /api/order-pay', /pay: payUrl \? `\$\{requestOrigin\(request\)\}\/api\/order-pay/.test(order), true);
  ok('een bestelling met prijs heet in het onderwerp geen aanvraag', /We hebben je bestelling — \$\{ref\}/.test(order), true);
  const pay = lees('../functions/api/order-pay.js');
  ok('order-pay laat een betaalde offerte op een eigen look door', /o\.service === 'custom' && String\(o\.review_state \|\| ''\) === REVIEW\.approved/.test(pay), true);
  const admin = lees('../src/lib/admin.js');
  ok('de btw-lijst biedt geen "0% blijft staan" bij een order die al btw draagt', /const alBtw = \(Number\(o\.vat_cents\) \|\| 0\) > 0;/.test(admin), true);
  ok('bestellen namens een klant kan de btw-bevestiging meegeven', /form\?\.get\('vat_confirmed'\) === 'yes' && c\.vat_number/.test(admin), true);
  const acc = lees('../src/lib/account.js');
  ok('een betaalde offerte heet in Studio geen aanvraag meer', /requestPaid: 'Je offerte is betaald/.test(acc), true);
  ok('geannuleerd: eigen uploads blijven zichtbaar, alleen ons werk 410', /file\.kind === 'delivery' && leveringIngetrokken\(file\)/.test(acc), true);
  ok('terug van Mollie zonder betaalde eerste maand: geen "gelukt"', /na = loopt \? '\?na=abonnement' : '\?na=abonnement-open'/.test(acc), true);
  const sub = lees('../src/lib/subscribe.js');
  ok('een nooit betaalde aanmelding staat een nieuwe poging niet in de weg', /eerste betaling niet afgerond — opnieuw aangemeld/.test(sub), true);
  const wh = lees('../functions/api/webhook/mollie.js');
  ok('de webhook sluit een mislukte eerste abonnementsbetaling af', /cancel_reason = \?2, updated_at = datetime\('now'\)[\s\S]{0,200}status = 'pending' AND mollie_subscription_id IS NULL/.test(wh), true);
  ok('een tweede tabblad binnen een half uur maakt geen tweede abonnement', /created_at > datetime\('now', '-30 minutes'\)/.test(sub), true);
  /* De telling staat sinds 24 september 2026 in bezetting() (subscription.js),
     die de poort én /api/plan-plek allebei lezen. */
  ok('en houdt na een etmaal geen capaciteit meer vast', /status = 'pending' AND created_at > datetime\('now', '-1 day'\)/.test(lees('../src/lib/subscription.js')) && /await bezetting\(env\)/.test(sub), true);
  const sb = lees('../src/components/Studiobrief.astro');
  ok('de studiobrief-aanmelding draagt data-astro-reload', /data-studiobrief\s+data-astro-reload/.test(sb), true);
  const up = await import('../functions/api/upload.js');
  ok('upload: een tekstbestand met .jpg is geen beeld', up.isBeeldHandtekening(new TextEncoder().encode('dit is geen jpeg!')), false);
  ok('upload: een echte jpeg-kop wel', up.isBeeldHandtekening(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])), true);
  const flow = lees('../src/components/order/OrderFlow.astro');
  ok('Nederlandse klant ziet KVK-nummer met 8-cijfercontrole', /regKvk: 'KVK-nummer'/.test(flow) && /data-err-kvk=/.test(flow), true);
  const mail = lees('../src/lib/invoiceMail.js');
  ok('een vooruitbetaald jaar krijgt geen "eerste maand is betaald"', /sub\.term === 'prepaid' \? t\.ledeFirstPrepaid/.test(mail), true);
}

/* ── 9 · RONDE DRIE (24 september 2026, avond) ───────────────────────────── */
console.log('\nronde drie: cronmails, portaal, gegevens, terugknop, video');
{
  const bron = lees('../cron/index.js');
  const knip = (naam) => {
    const start = bron.indexOf(`async function ${naam}(`) >= 0 ? bron.indexOf(`async function ${naam}(`) : bron.indexOf(`function ${naam}(`);
    let diep = 0; let i = bron.indexOf('{', start);
    for (; i < bron.length; i += 1) { if (bron[i] === '{') diep += 1; else if (bron[i] === '}') { diep -= 1; if (!diep) break; } }
    return bron.slice(start, i + 1);
  };
  const tpl = await import('../src/lib/mailTemplate.js');
  const { SERVICE_CREDITS } = await import('../src/data/pricing.js');
  const { kindLabel } = await import('../src/lib/slots.js');
  const verstuurd = [];
  const sendMail = async (_env, m) => { verstuurd.push(m); };
  const maak = new Function('sendMail', 'mailShell', 'mailH1', 'mailP', 'mailSpamNote', 'mailDatum', 'mailButton', 'SERVICE_CREDITS', 'kindLabel', 'QUEUE_WARN_DAYS', 'mailGreeting',
    `${knip('creditTips')}\n${knip('mailCreditsVervallen')}\n${knip('mailLegeWachtrij')}\nreturn { mailCreditsVervallen, mailLegeWachtrij };`);
  const f = maak(sendMail, tpl.shell, tpl.h1, tpl.p, tpl.spamNote, tpl.datum, tpl.button, SERVICE_CREDITS, kindLabel, 5, tpl.greeting);
  const env = { RESEND_API_KEY: 're_x', FROM_EMAIL: 'x@y.z' };
  await f.mailCreditsVervallen(env, { email: 'a@b.c', ref: 'SUB-X', over: 12, vervalt: '2026-10-10', dagen: 7, lang: 'en' });
  await f.mailCreditsVervallen(env, { email: 'a@b.c', ref: 'SUB-X', over: 12, vervalt: '2026-10-10', dagen: 7, lang: 'nl' });
  ok('creditherinnering in het Engels voor een Engelse abonnee', /You still have 12 credits/.test(verstuurd[0]?.subject || ''), true);
  ok('  met een leesbare datum', /10 October 2026/.test(verstuurd[0]?.html || '') && /10 oktober 2026/.test(verstuurd[1]?.html || ''), true);
  ok('  en geen ruwe ISO-datum meer', /2026-10-10/.test(verstuurd[1]?.html || ''), false);
  const wachtrijNl = verstuurd.length;
  await f.mailLegeWachtrij(env, { email: 'a@b.c', brand: 'Merk', lang: 'nl' });
  await f.mailLegeWachtrij(env, { email: 'a@b.c', brand: 'Brand', lang: 'en' });
  ok('lege-wachtrijmail in de huisstijl (html) en niet meer platte tekst', !!verstuurd[wachtrijNl]?.html, true);
  ok('  spreekt van credits en niet meer van "één slot"', /credits van die dienst/.test(verstuurd[wachtrijNl]?.html || '') && !/één slot/.test(verstuurd[wachtrijNl]?.html || ''), true);
  ok('  en in het Engels met de knoptekst uit Studio', /click Lock in/.test(verstuurd[wachtrijNl + 1]?.html || ''), true);
  ok('cron leest de taal van de abonnee', /KLANT_TAAL_SQL/.test(bron) && /subscription_invoices si WHERE si.subscription_id = s.id/.test(bron), true);

  const portal = lees('../src/lib/portal.js');
  ok('portaal: tevredenheidsvraag ook bij een gewone bestelling', /const vraagFeedback = !!order.closed_at && order.service !== SAMPLE_SERVICE;/.test(portal), true);
  ok('portaal: geen inline script meer (CSP weigerde het)', /<script>/.test(portal.slice(portal.indexOf('function roundBlock'), portal.indexOf('function attendedBody'))), false);
  const details = lees('../src/pages/account/details.astro');
  ok('Studio › gegevens: een POST gaat naar de opslaghandler', /if \(Astro\.request\.method === 'POST'\) return accountPost\(pagesContext\(Astro\)\);/.test(details), true);
  const acc = lees('../src/lib/account.js');
  ok('Studio › gegevens: btw-nummer wordt op vorm getoetst', /vatFormatOk\(landVoorBtw, vatNumber\) === false/.test(acc), true);
  const pipe = lees('../src/scripts/pipeline.js');
  ok('terug van Mollie: het formulier kent de open bestelling', /function checkOpenOrder\(\)/.test(pipe) && /sessionStorage\.setItem\('vis-open-order'/.test(pipe), true);
  ok('overzicht: eigen cataloglook is dé stijl', /kindOf\(\) === 'catalog' && eigen/.test(pipe), true);
  const order = lees('../functions/api/order.js');
  ok('video: de gekozen stijl blijft bewaard', /k === 'style' && service === 'video'/.test(order), true);
  ok('video: zolang op aanvraag geen prijs', /VIDEO_OP_AANVRAAG \? null : quoteVideo/.test(order), true);
  ok('studiomail: Nederlands onderwerp', /'Nieuwe bestelling' : 'Nieuwe aanvraag'/.test(order), true);
  const admin = lees('../src/lib/admin.js');
  ok('admin: geen Engelse foutmeldingen meer', /errorBody\('(That order does not exist|No such customer|Bad order id)/.test(admin), false);
  ok('admin: videostijl op de bestelpagina', /VIDEO_STIJLEN_NL\.find/.test(admin), true);
  const inter = lees('../src/scripts/interactions.js');
  ok('bedankpagina: betaalknop maakt een verse betaling', /knop\.href = `\/api\/order-pay\?ref=/.test(inter), true);
  const sub = lees('../src/lib/subscribe.js');
  const acc2 = lees('../src/lib/account.js');
  ok('vooruitbetaald: facturering zegt niet "per maand"', /planBillingAmountPrepaid/.test(acc2), true);
  const bl = lees('../src/lib/betaallink.js');
  ok('btw-mail noemt geen reden die niet hoeft te kloppen', /geen geldig KVK- of btw-nummer vinden/.test(bl), false);
}

/* ── 10 · RONDE 4 — de keuzes van Lucas (24 september 2026) ─────────────── */
console.log('\nronde 4');
{
  /* 1 · Een vooruitbetaald jaar opzeggen: de status blijft lopen, er komt geen tegoed. */
  const acc = lees('../src/lib/account.js');
  const cancel = acc.slice(acc.indexOf('async function handlePlanCancel'), acc.indexOf('function styleLabel'));
  ok('opzeggen vooruitbetaald: markeert en zegt niet op', /markeerJaarOpgezegd\(env, state\.sub\.id\)/.test(cancel), true);
  ok('  en er wordt nergens meer tegoed beloofd', /zetten we om in tegoed|become credit — we let you know/.test(acc), false);
  const { jaarLooptTot } = await import('../src/lib/subscription.js');
  ok('  tot wanneer: 3 van 12 maanden, laatste 2026-11, dag 20 → 20 september 2027',
    jaarLooptTot({ started_at: '2026-09-20' }, { aantal: 3, laatste: '2026-11' }), '2027-09-20');
  ok('  zonder maanden geen datum', jaarLooptTot({ started_at: '2026-09-20' }, { aantal: 0, laatste: '' }), '');

  /* 2 · De beschikbaarheid vóór het formulier. */
  const { planPlek, maatRuimte } = await import('../functions/api/plan-plek.js');
  const leeg = { DB: { prepare: () => ({ all: async () => ({ results: [] }), bind() { return this; } }) } };
  const plek = await planPlek(leeg);
  ok('plan-plek: bij een lege agenda past alles', Object.values(plek.plannen).every(Boolean) && plek.maat.past && plek.iets, true);
  ok('  en een volle agenda laat niets toe', maatRuimte(1e9), 0);
  const picker = lees('../src/components/order/PlanPicker.astro');
  ok('  de pagina vraagt het op vóór het invullen', /fetch\('\/api\/plan-plek'/.test(picker), true);

  /* 3 · Het tegoed in Studio. */
  const planPagina = lees('../src/pages/account/plan.astro');
  ok('Studio: het tegoed staat op het eerste tabblad', /v\.tegoed && \(/.test(planPagina) && /st-saldo-tegel is-tegoed/.test(planPagina), true);
  ok('  en de balk toont wat er over is', /Math\.max\(0, cb\.saldo\) \/ cb\.toegekend/.test(acc), true);

  /* 4 · De welkomstmail, met een inlogknop die op het abonnement landt. */
  ok('welkomstlink landt op /account/plan', /naar=plan/.test(acc) && /searchParams\.get\('naar'\) === 'plan'/.test(acc), true);

  /* 5 · De offertemail zegt of het een aanbetaling is, en vraagt de verklaring. */
  const bl = lees('../src/lib/betaallink.js');
  ok('offerte: aanbetaling of volledige prijs', /Dit is een aanbetaling/.test(bl) && /Dit is de volledige prijs/.test(bl), true);
  ok('  en de zakelijke verklaring als die ontbrak', /business_declaration === 'MISSING'/.test(bl), true);

  /* 6 · De kop in Studio zonder abonnement. */
  ok('Studio zonder abonnement: de nieuwe kop', /planNoneH: 'Elke maand nieuwe beelden, zonder elke keer te bestellen'/.test(acc), true);

  /* 7 · De eigen look als tweede factuurregel. */
  const { snapshotFromOrder } = await import('../src/lib/invoice.js');
  const snap = snapshotFromOrder({ lang: 'nl', total_cents: 10000, vat_cents: 2100, service: 'catalog', product_count: 1,
    details_json: JSON.stringify({ style: 'cs-4', style_name: 'Betondak' }) }, {}, { number: 'X', date: '2026-09-24' });
  ok('factuur: de naam van de eigen look op regel twee', snap.lines[0].detail, 'Eigen look: Betondak');
  const snap2 = snapshotFromOrder({ lang: 'nl', total_cents: 10000, vat_cents: 0, service: 'custom', product_count: 1,
    details_json: JSON.stringify({ quote_kind: 'aanbetaling' }) }, {}, { number: 'X', date: '2026-09-24' });
  ok('  en een aanbetaling zegt dat in de omschrijving', /^Aanbetaling · /.test(snap2.lines[0].description), true);

  /* B7 · Een formulier dat naar Mollie moet, krijgt de tussenpagina. */
  const order = lees('../functions/api/order.js');
  ok('B7: geen 303 naar Mollie na een formulier', /return redirect\(payUrl\)|return redirect\(checkoutUrl\)/.test(order), false);
  /* E6 · Een termijn zonder incasso komt in het nachtrapport. */
  ok('E6: machtiging verlopen of ingetrokken', /machtiging verlopen of ingetrokken/.test(lees('../cron/index.js')), true);
}

console.log(`\n${pass}/${pass + fail} geslaagd`);
if (fail) process.exit(1);
