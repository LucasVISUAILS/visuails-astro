/*
 * VISUAILS — ALLE MAILS, MET HUN ECHTE BOUWERS — 17 oktober 2026
 *
 * Lucas: *"Kijk even goed of de VISUAILS branding wel goed is bij alle mails"* en
 * *"ook controleren nadat je alles hebt aangepast en verbeterd of ze allemaal
 * consistent zijn en kloppen."* Dit roept elke mail op die zonder volledige
 * bestelling of databank te maken is (66 van de 71 soorten, plus tien in het Engels
 * en de vijf creditmails van de cron), met nepgegevens: een
 * nep-D1 die per zoekterm een rij teruggeeft, en een fetch die de verzending naar
 * Resend opvangt in plaats van verstuurt. Er gaat dus niets de deur uit.
 *
 * Gebruikt door tests/mails-merk.test.mjs (de regels voor alle mails) en
 * scripts/mail-render.mjs (alle mails als plaat, licht, Gmail-donker en 390).
 * Niet gevangen, en met de hand nagekeken: de studiomail van een nieuwe bestelling
 * (alleen via een volledige bestelling), "bestelling niet weggeschreven", de
 * btw-vraag, het antwoord op een revisie en de merkmodelmail (in een handler).
 * Het plan heet 'studio' (dat is het id van Pro, zie src/data/planNames.js).
 */
const W = new URL('../../', import.meta.url).href;
function mockDB(rows = {}) {
  const pick = (sql) => {
    for (const [k, v] of Object.entries(rows)) if (sql.includes(k)) return typeof v === 'function' ? v(sql) : v;
    return null;
  };
  return {
    prepare(sql) {
      const st = {
        bind() { return st; },
        first: async () => { const r = pick(sql); return Array.isArray(r) ? r[0] : r; },
        all: async () => { const r = pick(sql); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
        run: async () => ({ meta: { changes: 1 } }),
      };
      return st;
    },
    batch: async (arr) => arr.map(() => ({ meta: { changes: 1 } })),
  };
}
const ENV = (rows) => ({ RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', MOLLIE_API_KEY: 'test_x', PUBLIC_ORIGIN: 'https://visuails.com', DB: mockDB(rows) });

/** @returns {Promise<Array<{id: string, subject: string, html: string, to?: string|string[], fout?: string}>>} */
export async function alleMails() {
  const echteFetch = globalThis.fetch;
  const sent = [];
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).includes('api.resend.com/emails')) sent.push(JSON.parse(opts.body));
    return { ok: true, status: 200, text: async () => '', json: async () => ({ id: 'x', _links: {}, success: true }) };
  };
  const stil = console.error; const stilLog = console.log; const stilWarn = console.warn;
  console.error = () => {}; console.log = () => {}; console.warn = () => {};
  const out = [];
  try {
    const rec = (id, subject, html, to) => out.push({ id, subject, html, to });
    const last = (id) => { const m = sent[sent.length - 1]; rec(id, m?.subject, m?.html, m?.to); };
    const tryit = async (id, fn) => { try { await fn(); } catch (e) { out.push({ id, error: e.message }); } };

    const order = await import(`${W}functions/api/order.js`);
    const studiobrief = await import(`${W}functions/api/studiobrief.js`);
    const inv = await import(`${W}src/lib/invoiceMail.js`);
    const can = await import(`${W}src/lib/cancelMail.js`);
    const adm = await import(`${W}src/lib/admin.js`);
    const acc = await import(`${W}src/lib/account.js`);
    const proef = await import(`${W}src/lib/proefStand.js`);
    const notify = await import(`${W}src/lib/notify.js`);
    const bl = await import(`${W}src/lib/betaallink.js`);
    const form = await import(`${W}src/lib/formaten.js`);
    const tpl = await import(`${W}src/lib/mailTemplate.js`);
    const fb = await import(`${W}src/lib/feedback.js`);
    const cron = await import(`${W}cron/index.js`);

    const REF = 'VIS-2608-4471';
    const LINK = 'https://visuails.com/o/3f9a2c7d5e1b48a6';

    await tryit('order-confirmation', () => rec('order-confirmation', 'n/a', order.customerEmail('nl', REF, 'catalog', 'Sanne', {
      tier: 'unattended', portal: LINK, pay: `https://visuails.com/api/order-pay?ref=${REF}&lang=nl`,
      quote: { products: 3, netCents: 26700, vatCents: 5607, grossCents: 32307 }, vat: { treatment: 'nl_standard', rate: 0.21 },
      details: { style: '', ratio: '' }, nieuwAdres: true })));
    await tryit('request-confirmation', () => rec('request-confirmation', 'n/a', order.customerEmail('nl', REF, 'video', 'Sanne', { aanvraag: true, portal: LINK, details: { style: 'custom', clips: '2', request: 'video' } })));
    await tryit('order-confirmation-deferred', () => rec('order-confirmation-deferred', 'n/a', order.customerEmail('en', REF, 'catalog', 'Sanne Keten', { pay: `https://visuails.com/api/order-pay?ref=${REF}&lang=en`, naMislukking: true, quote: { products: 3, netCents: 26700, vatCents: 5607, grossCents: 32307 }, details: {} })));
    await tryit('checklist-subscriber', () => rec('checklist-subscriber', 'n/a', order.subscriberEmail('nl')));
    await tryit('studiobrief-welcome', () => rec('studiobrief-welcome', 'n/a', studiobrief.welkomMail('nl')));
    await tryit('payment-received-invoice', () => { const r = inv.invoiceEmail({ lang: 'nl', order: { ref: REF, name: 'Sanne', service: 'catalog' }, invoice: { number: 'VIS-2026-0031' }, snap: { date: '2026-08-09', netCents: 26700, vatCents: 5607, treatment: 'nl_standard' }, attached: true, link: LINK, levering: { soort: 'zsm' }, ontbreekt: [] }); rec('payment-received-invoice', r.subject, r.html); });
    await tryit('order-cancelled', () => { const r = can.cancelEmail({ order: { ref: REF, name: 'Sanne', lang: 'nl' }, reason: 'De lijn is uit de collectie gehaald.', money: 'refund', grossCents: 32307 }); rec('order-cancelled', r.subject, r.html); });
    await tryit('credit-note', () => { const r = can.creditNoteEmail({ lang: 'nl', order: { ref: REF }, note: { number: 'VIS-2026-0032' }, snap: { date: '2026-08-11', grossCents: 32307, creditsNumber: 'VIS-2026-0031' }, attached: true }); rec('credit-note', r.subject, r.html); });
    await tryit('delivery-ready', () => rec('delivery-ready', 'n/a', adm.deliveryEmail({ order: { ref: REF, name: 'Sanne', lang: 'nl', service: 'catalog', details_json: '{}' }, link: LINK, n: 12 })));
    await tryit('delivery-ready-sample', () => rec('delivery-ready-sample', 'n/a', adm.deliveryEmail({ order: { ref: REF, name: 'Sanne', lang: 'nl', service: 'test-sample', details_json: '{"sample_type":"catalog"}' }, link: LINK, n: 4 })));
    await tryit('redelivery-revision', () => rec('redelivery-revision', 'n/a', adm.redeliveryEmail({ order: { ref: REF, name: 'Sanne', lang: 'nl' }, link: LINK, n: 3, revisions: 2, note: 'De achtergrond op beeld 4 is nu egaal wit.' })));
    await tryit('redelivery-new-images', () => rec('redelivery-new-images', 'n/a', adm.redeliveryEmail({ order: { ref: REF, name: 'Sanne', lang: 'nl' }, link: LINK, n: 2, revisions: 0, product: 'p3' })));
    await tryit('fresh-portal-link', () => rec('fresh-portal-link', 'n/a', adm.freshLinkEmail({ order: { ref: REF, name: 'Sanne', lang: 'nl' }, link: LINK })));
    await tryit('credit-added', () => rec('credit-added', 'n/a', adm.tegoedMail({ naam: 'Sanne', lang: 'nl', cents: 2500, reden: 'Excuus voor de vertraging bij VIS-2608-4471.', saldoCents: 2500, studio: 'https://visuails.com/account' })));
    await tryit('test-sample-waitlist-open', () => { const r = proef.weerOpenMail('nl', 'open'); rec('test-sample-waitlist-open', r.subject, r.html); });
    await tryit('sign-in-code', () => { const r = acc.magicLinkEmail('nl', 'https://visuails.com/account/verify/7Kd2p9QbXm4Rt6Zv?lang=nl', '048210'); rec('sign-in-code', acc.inlogOnderwerp('nl', '048210'), r.html); });
    await tryit('email-change-confirm', () => { const r = acc.emailChangeConfirmEmail('nl', 'https://visuails.com/account/email/abc', 'sanne@nieuw-voorbeeld.test', 60); rec('email-change-confirm', 'n/a', r.html); });
    await tryit('email-changed-notice', () => { const r = acc.emailChangedEmail('nl', 'https://visuails.com/account/email/undo/abc', 'sanne@nieuw-voorbeeld.test', 14); rec('email-changed-notice', 'n/a', r.html); });

    // async senders, captured via mocked fetch
    const ORDER_ROW = { id: 7, ref: REF, email: 'sanne@voorbeeld.test', name: 'Sanne', brand: 'Merk Voorbeeld', lang: 'nl', service: 'catalog', product_count: 3, total_cents: 26700, vat_cents: 5607, vat_rate: 0.21, status: 'received', payment_status: 'unpaid', created_at: '2026-10-10 09:00:00', details_json: '{}', tier: 'unattended' };
    await tryit('payment-received-no-invoice', async () => { await can.mailBetalingOntvangen(ENV({ 'FROM orders': ORDER_ROW }), 7); last('payment-received-no-invoice'); });
    await tryit('unwanted-payment-refund', async () => { await can.mailOngewensteBetaling(ENV({ 'FROM orders': ORDER_ROW }), 7, 'dubbel', 32307); last('unwanted-payment-refund'); });
    await tryit('direct-debit-failed', async () => { await can.mailIncassoMislukt(ENV({ subscription_invoices: { lang: 'nl' } }), { subId: 3, ref: 'VIS-AB-0012', email: 'sanne@voorbeeld.test', name: 'Sanne', bedragCents: 95590, gestopt: false }); last('direct-debit-failed'); });
    await tryit('subscription-on-hold-debit-stopped', async () => { await can.mailIncassoMislukt(ENV({ subscription_invoices: { lang: 'nl' } }), { subId: 3, ref: 'VIS-AB-0012', email: 'sanne@voorbeeld.test', name: 'Sanne', bedragCents: 95590, gestopt: true }); last('subscription-on-hold-debit-stopped'); });
    await tryit('subscription-chargeback', async () => { await can.mailTermijnTeruggeboekt(ENV({ subscription_invoices: { lang: 'nl' } }), { subId: 3, ref: 'VIS-AB-0012', email: 'sanne@voorbeeld.test', name: 'Sanne', terugCents: 95590 }); last('subscription-chargeback'); });
    await tryit('revision-round-received', async () => { await can.mailRondeOntvangen(ENV({}), { ref: REF, email: 'sanne@voorbeeld.test', name: 'Sanne', lang: 'nl' }, 3); last('revision-round-received'); });
    await tryit('subscription-welcome', async () => { await inv.mailSubscriptionInvoice(ENV({}), { sub: { ref: 'VIS-AB-0012', plan: 'studio', term: 'monthly', window_day: 8 }, customer: { email: 'sanne@voorbeeld.test', lang: 'nl', name: 'Sanne Keten' }, invoice: { number: 'VIS-2026-0040', lang: 'nl', month: '2026-10', snapshot_json: JSON.stringify({ date: '2026-10-08', netCents: 79000, vatCents: 16590, treatment: 'nl_standard' }) }, planNaam: 'Pro', credits: 120, eerste: true, loginLink: 'https://visuails.com/account/verify/abc?lang=nl&naar=plan' }); last('subscription-welcome'); });
    await tryit('subscription-month-invoice', async () => { await inv.mailSubscriptionInvoice(ENV({}), { sub: { ref: 'VIS-AB-0012', plan: 'studio', term: 'monthly', window_day: 8 }, customer: { email: 'sanne@voorbeeld.test', lang: 'nl', name: 'Sanne Keten' }, invoice: { number: 'VIS-2026-0052', lang: 'nl', month: '2026-11', snapshot_json: JSON.stringify({ date: '2026-11-08', netCents: 79000, vatCents: 16590, treatment: 'nl_standard' }) }, planNaam: 'Pro', credits: 120, eerste: false }); last('subscription-month-invoice'); });
    await tryit('extra-credits-invoice', async () => { await inv.mailBijkoopFactuur(ENV({}), { customer: { email: 'sanne@voorbeeld.test' }, invoice: { number: 'VIS-2026-0053', lang: 'nl', snapshot_json: JSON.stringify({ date: '2026-10-12', netCents: 20000, vatCents: 4200 }) }, pakket: 25, tot: '2027-01-11', lang: 'nl' }); last('extra-credits-invoice'); });
    await tryit('payment-received-invoice(mailInvoice)', async () => { await inv.mailInvoice(ENV({ 'FROM orders': ORDER_ROW }), { order: { ref: REF, email: 'sanne@voorbeeld.test', name: 'Sanne', lang: 'nl' }, invoice: { number: 'VIS-2026-0031', lang: 'nl', snapshot_json: JSON.stringify({ date: '2026-08-09', netCents: 26700, vatCents: 5607 }) } }); last('payment-received-invoice(mailInvoice)'); });
    await tryit('payment-link-vat-approved', async () => { await bl.stuurBetaallink(ENV({ 'FROM orders': { ...ORDER_ROW, review_state: 'approved', reviewed_at: '2026-10-10 10:00:00' } }), 7, { origin: 'https://visuails.com' }); last('payment-link-vat-approved'); });
    await tryit('payment-link-vat-charged', async () => { await bl.stuurBetaallink(ENV({ 'FROM orders': { ...ORDER_ROW, review_state: 'approved', reviewed_at: '2026-10-10 10:00:00' } }), 7, { origin: 'https://visuails.com', btwErbij: true }); last('payment-link-vat-charged'); });
    await tryit('quote-payment-link', async () => { await bl.stuurBetaallink(ENV({ 'FROM orders': { ...ORDER_ROW, service: 'video', details_json: '{"quote_kind":"volledig","business_declaration":"MISSING"}' } }), 7, { origin: 'https://visuails.com', offerte: true }); last('quote-payment-link'); });
    await tryit('payment-reminder', async () => { await bl.stuurBetaallink(ENV({ 'FROM orders': ORDER_ROW }), 7, { origin: 'https://visuails.com', herinnering: true }); last('payment-reminder'); });
    await tryit('extra-format-ready', async () => { await form.formaatMail(ENV({ formaat_verzoeken: { formaat: 'png', klaar_at: '2026-10-15 10:00:00', order_id: 7, ref: REF, email: 'sanne@voorbeeld.test', name: 'Sanne', lang: 'nl' } }), 5, { origin: 'https://visuails.com', sendMail: (await import(`${W}src/lib/mail.js`)).sendMail, mail: { shell: tpl.shell, h1: tpl.h1, p: tpl.p, button: tpl.button, greeting: tpl.greeting, vragen: tpl.vragen, esc: tpl.esc, kenmerk: tpl.kenmerk } }); last('extra-format-ready'); });
    for (const [id, soort, extra] of [['subscription-paused', 'pauze', { vanaf: '2026-11-08' }], ['subscription-resumed', 'hervat', {}], ['subscription-cancelled', 'opgezegd', {}], ['subscription-switch', 'overstap', { vanaf: '2026-11-08', naar: { naam: 'Merk', naamNl: 'Merk', credits: 240, bruto: 158000, std: true } }], ['subscription-switch-undone', 'overstap-terug', { naar: { naam: 'Merk', credits: 240, bruto: 158000 } }]]) {
      await tryit(id, async () => { const n0 = sent.length; await acc.mailAboWijziging(ENV({ subscription_invoices: { lang: 'nl' } }), { soort, sub: { id: 3, ref: 'VIS-AB-0012', plan: 'studio', term: 'monthly' }, customer: { email: 'sanne@voorbeeld.test', brand: 'Merk Voorbeeld', name: 'Sanne Keten' }, lang: 'nl', ...extra }); const m = sent[n0]; rec(id, m?.subject, m?.html); const s = sent[n0 + 1]; rec(`studio:${id}`, s?.subject, s?.html); });
    }
    /* ── ENGELS — 17 oktober 2026 ─────────────────────────────────────────
       Een greep uit de mails die ook in het Engels uitgaan, zodat de Engelse
       labels ("Reference", "Plan", "Invoice"), de terugval-link en de aanhef
       "Hi" net zo worden nagekeken als de Nederlandse. */
    await tryit('order-cancelled-en', () => { const r = can.cancelEmail({ order: { ref: REF, name: 'Sanne', lang: 'en' }, reason: 'The line was taken out of the collection.', money: 'refund', grossCents: 32307 }); rec('order-cancelled-en', r.subject, r.html); });
    await tryit('credit-note-en', () => { const r = can.creditNoteEmail({ lang: 'en', order: { ref: REF, name: 'Sanne' }, note: { number: 'VIS-2026-0032' }, snap: { date: '2026-08-11', grossCents: 32307, creditsNumber: 'VIS-2026-0031' }, attached: true }); rec('credit-note-en', r.subject, r.html); });
    await tryit('payment-received-invoice-en', () => { const r = inv.invoiceEmail({ lang: 'en', order: { ref: REF, name: 'Sanne', service: 'catalog' }, invoice: { number: 'VIS-2026-0031' }, snap: { date: '2026-08-09', netCents: 26700, vatCents: 5607, treatment: 'nl_standard' }, attached: true, link: LINK, levering: { soort: 'zsm' }, ontbreekt: [] }); rec('payment-received-invoice-en', r.subject, r.html); });
    await tryit('delivery-ready-en', () => rec('delivery-ready-en', 'n/a', adm.deliveryEmail({ order: { ref: REF, name: 'Sanne', lang: 'en', service: 'catalog', details_json: '{}' }, link: LINK, n: 12 })));
    await tryit('sign-in-code-en', () => { const r = acc.magicLinkEmail('en', 'https://visuails.com/account/verify/7Kd2p9QbXm4Rt6Zv?lang=en', '048210'); rec('sign-in-code-en', acc.inlogOnderwerp('en', '048210'), r.html); });
    await tryit('email-changed-notice-en', () => { const r = acc.emailChangedEmail('en', 'https://visuails.com/account/email/undo/abc', 'sanne@nieuw-voorbeeld.test', 14); rec('email-changed-notice-en', 'n/a', r.html); });
    await tryit('direct-debit-failed-en', async () => { await can.mailIncassoMislukt(ENV({ subscription_invoices: { lang: 'en' } }), { subId: 3, ref: 'VIS-AB-0012', email: 'sanne@voorbeeld.test', name: 'Sanne', bedragCents: 95590, gestopt: false }); last('direct-debit-failed-en'); });
    await tryit('subscription-welcome-en', async () => { await inv.mailSubscriptionInvoice(ENV({}), { sub: { ref: 'VIS-AB-0012', plan: 'studio', term: 'monthly', window_day: 8 }, customer: { email: 'sanne@voorbeeld.test', lang: 'en', name: 'Sanne Keten' }, invoice: { number: 'VIS-2026-0040', lang: 'en', month: '2026-10', snapshot_json: JSON.stringify({ date: '2026-10-08', netCents: 79000, vatCents: 16590, treatment: 'nl_standard' }) }, planNaam: 'Pro', credits: 120, eerste: true, loginLink: 'https://visuails.com/account/verify/abc?lang=en&naar=plan' }); last('subscription-welcome-en'); });
    await tryit('payment-reminder-en', async () => { await bl.stuurBetaallink(ENV({ 'FROM orders': { ...ORDER_ROW, lang: 'en' } }), 7, { origin: 'https://visuails.com', herinnering: true }); last('payment-reminder-en'); });
    await tryit('subscription-paused-en', async () => { const n0 = sent.length; await acc.mailAboWijziging(ENV({ subscription_invoices: { lang: 'en' } }), { soort: 'pauze', sub: { id: 3, ref: 'VIS-AB-0012', plan: 'studio', term: 'monthly' }, customer: { email: 'sanne@voorbeeld.test', brand: 'Merk Voorbeeld', name: 'Sanne Keten' }, lang: 'en', vanaf: '2026-11-08' }); const m = sent[n0]; rec('subscription-paused-en', m?.subject, m?.html); });

    /* ── DE CREDITMAILS EN DE LAATSTE MAAND (cron) ──────────────────────── */
    const K = cron.KLANTMAILS;
    await tryit('credits-expiring', async () => { await K.mailCreditsVervallen(ENV({}), { email: 'sanne@voorbeeld.test', name: 'Sanne', ref: 'VIS-AB-0012', lang: 'nl', over: 48, bijgekocht: 0, vervalt: '2027-01-08', dagen: 14, geldigMaanden: 3 }); last('credits-expiring'); });
    await tryit('credits-expiring-en', async () => { await K.mailCreditsVervallen(ENV({}), { email: 'sanne@voorbeeld.test', name: 'Sanne', ref: 'VIS-AB-0012', lang: 'en', over: 25, bijgekocht: 25, vervalt: '2027-01-08', dagen: 14, geldigMaanden: 3 }); last('credits-expiring-en'); });
    await tryit('credits-limit-in-sight', async () => { await K.mailPlafondInZicht(ENV({}), { email: 'sanne@voorbeeld.test', name: 'Sanne', ref: 'VIS-AB-0012', lang: 'nl', saldo: 340, plafond: 360, nieuw: 120, boven: 100, op: '2026-11-08', dagen: 14, geldigMaanden: 3 }); last('credits-limit-in-sight'); });
    await tryit('prepaid-last-month', async () => { await K.mailLaatsteMaand(ENV({}), { email: 'sanne@voorbeeld.test', name: 'Sanne', ref: 'VIS-AB-0012', lang: 'nl', tot: '2026-11-08', cancelled_at: null }); last('prepaid-last-month'); });
    await tryit('prepaid-last-month-en', async () => { await K.mailLaatsteMaand(ENV({}), { email: 'sanne@voorbeeld.test', name: 'Sanne', ref: 'VIS-AB-0012', lang: 'en', tot: '2026-11-08', cancelled_at: '2026-09-01 10:00:00' }); last('prepaid-last-month-en'); });

    // studio notify
    const N = ENV({ 'FROM orders': ORDER_ROW, 'FROM files': { id: 11, filename: 'p1-front.jpg', product_key: 'p1', shot: 'front' }, 'FROM customers': { name: 'Sanne', first_name: 'Sanne', phone: '+31612345678', country: 'NL', lang: 'nl' } });
    await tryit('studio-paid', async () => { await notify.notifyPaid(N, 7); last('studio-paid'); });
    await tryit('studio-payment-failed', async () => { await notify.notifyPaymentFailed(N, 7, 'expired'); last('studio-payment-failed'); });
    await tryit('studio-unwanted-payment', async () => { await notify.notifyOngewensteBetaling(N, { orderId: 7, soort: 'dubbel', betaalId: 'tr_test123', bedragCents: 32307, teruggestort: true }); last('studio-unwanted-payment'); });
    await tryit('studio-chargeback', async () => { await notify.notifyChargeback(N, { orderId: 7, betaalId: 'tr_test123', bedragCents: 32307, totaalCents: 32307 }); last('studio-chargeback'); });
    await tryit('studio-vat-doubt', async () => { await notify.notifyBtwTwijfel(N, 7, 'kaart uit NL bij land US'); last('studio-vat-doubt'); });
    await tryit('studio-sample-blocked', async () => { await notify.notifySampleBlocked(N, { orderId: 7, earlierRef: 'VIS-2607-1180', earlierAt: '2026-07-14', refunded: true }); last('studio-sample-blocked'); });
    await tryit('studio-revision-single', async () => { await notify.notifyRevision(N, { orderId: 7, fileId: 11, note: 'Mouw is te lang.' }); last('studio-revision-single'); });
    await tryit('studio-revision-round', async () => { await notify.notifyRevisionRound(N, { orderId: 7, items: [{ fileId: 11, note: 'Mouw is te lang.' }, { fileId: 12, note: 'Kleur klopt niet.' }] }); last('studio-revision-round'); });
    await tryit('studio-photos-added', async () => { await notify.notifyFotosToegevoegd(N, { orderId: 7, count: 3, vakken: ['p1 voorkant', 'p1 achterkant'], ontbreekt: [] }); last('studio-photos-added'); });
    await tryit('studio-debit-failed', async () => { await notify.notifySubscriptionFailed(N, { subRef: 'VIS-AB-0012', plan: 'studio', brand: 'Merk Voorbeeld', email: 'sanne@voorbeeld.test', reason: 'failed', bedragCents: 95590, gestopt: false, molliestatus: 'failed' }); last('studio-debit-failed'); });
    await tryit('studio-subscription-refund', async () => { await notify.notifySubscriptionRefunded(N, { subRef: 'VIS-AB-0012', plan: 'studio', brand: 'Merk Voorbeeld', email: 'sanne@voorbeeld.test', bedragCents: 95590, terugCents: 95590, maand: '2026-10', volledig: true, molliestatus: 'paid' }); last('studio-subscription-refund'); });
    await tryit('studio-subscription-started', async () => { await notify.notifySubscriptionStarted(N, { subRef: 'VIS-AB-0012', plan: 'Pro', term: 'monthly', brand: 'Merk Voorbeeld', email: 'sanne@voorbeeld.test', credits: 120, bedragCents: 95590, windowDay: 8 }); last('studio-subscription-started'); });
    await tryit('studio-subscription-vat-check', async () => { await notify.notifyAboBtwNakijken(N, { customerId: 4, email: 'sanne@voorbeeld.test', brand: 'Merk Voorbeeld', phone: '+15555550100', plan: 'Pro', term: 'monthly', land: 'US', ipLand: 'NL' }); last('studio-subscription-vat-check'); });
    await tryit('studio-credits-discuss', async () => { await notify.notifyCreditsBespreken(N, { klant: { email: 'sanne@voorbeeld.test', brand: 'Merk Voorbeeld', phone: '+31612345678', country: 'NL' }, lang: 'nl', saldo: 48, vervalt: [{ aantal: 48, op: '2027-01-08' }], abonnement: { ref: 'VIS-AB-0012', plan: 'studio', status: 'paused' } }); last('studio-credits-discuss'); });
    await tryit('studio-subscription-chargeback', async () => { await notify.notifyTermijnTeruggeboekt(N, { subRef: 'VIS-AB-0012', plan: 'studio', brand: 'Merk Voorbeeld', email: 'sanne@voorbeeld.test', bedragCents: 95590, terugCents: 95590, maand: '2026-10', bevroren: 120, incasso: 'gestopt', klantId: 4 }); last('studio-subscription-chargeback'); });
    // feedback (via exported handleFeedbackPost)
    const fd = (o) => ({ get: (k) => (k in o ? o[k] : null) });
    /* Een score die verandert (2 → 1) en een toestemming die er was: anders stuurt de
       handler terecht niets, en viel de mail stil weg uit deze lijst. */
    const FB = ENV({ 'FROM orders': ORDER_ROW, order_feedback: { score: 2, private_note: 'De kleuren klopten niet.', testimonial_consent: 1, toon_tekst: 'ja' } });
    await tryit('studio-low-score', async () => { const n0 = sent.length; await fb.handleFeedbackPost(FB, { orderId: 7, customerId: 4, form: fd({ fb: 'score', score: '1' }) }); const m = sent[n0]; rec('studio-low-score', m?.subject, m?.html); });
    await tryit('studio-complaint-note', async () => { const n0 = sent.length; await fb.handleFeedbackPost(FB, { orderId: 7, customerId: 4, form: fd({ fb: 'note', note: 'De kleuren klopten niet.' }) }); const m = sent[n0]; rec('studio-complaint-note', m?.subject, m?.html); });
    await tryit('studio-consent-withdrawn', async () => { const n0 = sent.length; await fb.handleFeedbackPost(FB, { orderId: 7, customerId: 4, form: fd({ fb: 'intrekken' }) }); const m = sent[n0]; rec('studio-consent-withdrawn', m?.subject, m?.html); });
    // cron
    await tryit('studio-nightly-report', async () => { const r = await cron.RAPPORT.sendReport({ RESEND_API_KEY: 're', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', NOTIFY_EMAIL: 'studio@voorbeeld.test' }, ['1 onbetaalde bestelling vervallen: VIS-2608-4471.'], [], { regels: [] }); const m = sent[sent.length - 1]; out.push({ id: 'studio-nightly-report', subject: m?.subject, html: m?.html || ('<pre>' + (m?.text||'') + '</pre>'), tekst: m?.text }); });


    // cron
    const n0c = sent.length;

    function mockDB2(rows) {
      const pick = (sql) => { for (const [k, v] of rows) if (sql.includes(k)) return v; return null; };
      return {
        prepare(sql) {
          const st = { bind() { return st; }, first: async () => { const r = pick(sql); return Array.isArray(r) ? r[0] : r; },
            all: async () => { const r = pick(sql); return { results: Array.isArray(r) ? r : (r ? [r] : []) }; },
            run: async () => ({ meta: { changes: 1 } }) };
          return st;
        },
        batch: async (arr) => arr.map(() => ({ meta: { changes: 1 } })),
      };
    }

    const envC = (rows) => ({ RESEND_API_KEY: 're', NOTIFY_EMAIL: 'studio@voorbeeld.test', DB: mockDB2(rows) });
    try {
      await cron.tasks.cancelStaleApprovals(envC([
        ['COALESCE(payment_status', [{ id: 7, ref: 'VIS-2608-4471', email: 'sanne@voorbeeld.test', lang: 'nl', reviewed_at: null, total_cents: 26700, vat_cents: 5607, details_json: '{}', review_state: null, customer_id: 4 }]],
      ]));
    } catch (e) { console.log('cancelStaleApprovals error', e.message); }
    try {
      await cron.tasks.pauzeVraag(envC([
        ["s.status = 'paused'", [{ id: 3, ref: 'VIS-AB-0012', plan: 'studio', paused_at: '2026-07-01 10:00:00', email: 'sanne@voorbeeld.test', brand: 'Merk Voorbeeld', lang: 'nl' }]],
      ]));
    } catch (e) { console.log('pauzeVraag error', e.message); }

    for (const [i, m] of sent.slice(n0c).entries()) rec(['order-expired','pause-resume-or-cancel'][i] || ('cron-'+i), m.subject, m.html, m.to);

    // formulieren
    const n0p = sent.length;
    const dbP = {
      prepare(sql) { const st = { bind() { return st; }, first: async () => (/rate/i.test(sql) ? { n: 0, count: 0 } : null), all: async () => ({ results: [] }), run: async () => ({ meta: { changes: 1, last_row_id: 1 } }) }; return st; },
      batch: async (a) => a.map(() => ({ meta: { changes: 1 } })),
    };
    const envP = { RESEND_API_KEY: 're', NOTIFY_EMAIL: 'studio@voorbeeld.test', DB: dbP };
    const post = async (mod, fields) => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      const request = new Request('https://visuails.com/api/x', { method: 'POST', body: fd, headers: { Referer: 'https://visuails.com/nl/contact' } });
      try { await mod.onRequestPost({ request, env: envP, waitUntil: () => {} }); } catch (e) { console.log('error', e.message); }
    };


    await post(order, { service: 'contact', email: 'sanne@voorbeeld.test', first_name: 'Sanne', last_name: 'Keten', topic: 'order-support', message: 'Waar blijft mijn bestelling?', lang: 'nl', contact_preference: 'email' });
    await post(order, { service: 'subscribe', email: 'sanne@voorbeeld.test', lang: 'nl', subscribe: 'lead-magnet' });
    await post(studiobrief, { email: 'sanne@voorbeeld.test', lang: 'nl', bron: 'voet' });

    const naamP = (m) => (/^Contact — /.test(m.subject) ? 'studio-contact-form' : /bericht|message/i.test(m.subject) ? 'contact-copy'
      : /^Studiobrief — /.test(m.subject) ? 'studio-studiobrief-signup' : /Studiobrief|Studio letter/.test(m.subject) ? 'studiobrief-welcome-post'
      : /^Checklist-aanmelding/.test(m.subject) ? 'studio-checklist-signup' : `post-${m.subject}`);
    for (const m of sent.slice(n0p)) rec(naamP(m), m.subject, m.html, m.to);


  } finally {
    globalThis.fetch = echteFetch;
    console.error = stil; console.log = stilLog; console.warn = stilWarn;
  }
  return out;
}
