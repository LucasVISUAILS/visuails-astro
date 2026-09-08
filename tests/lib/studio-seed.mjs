/**
 * De nepdata van Studio — één klant met werk, één zonder. 6 september 2026.
 *
 * Gedeeld door tests/studio-vorm.test.mjs (de zes schermen in de echte Worker)
 * en kladblok/studio-proef.mjs (dezelfde schermen als schermafdruk). Eén plek,
 * zodat wat de test bekijkt ook is wat Lucas op de afdrukken ziet.
 *
 *   VOLT  (klant 7007, Nederlands) — vier bestellingen in vier standen, een
 *          lopend Studio-abonnement met twaalf slots waarvan drie gebruikt,
 *          twee items op de lijst (één vastgezet, met foto's), geleverde
 *          beelden in R2.
 *   NOORD (klant 7008, Engels)     — niets: geen bestelling, geen abonnement.
 *
 * Verzonnen merken, verzonnen adressen; niets hiervan bestaat.
 */

export const VOLT = { id: 7007, email: 'studio@voltbrand.nl', token: 'proef-sessie-token-volt-0001' };
export const NOORD = { id: 7008, email: 'studio@noordlabel.nl', token: 'proef-sessie-token-noord-0002' };
export const ORDERS = { catalog: 7091, lifestyle: 7092, delivered: 7090, check: 7089, sample: 7088 };
export const SUB_ID = 7070;

/* De beelden die als levering dienen: bestaan in public/img; de aanroeper
   filtert op wat er op schijf staat. */
export const IMG = ['lifestyle-flash-01-w380.webp', 'lifestyle-glow-03-w380.webp', 'lifestyle-phone-made-03-w760.webp', 'lifestyle-flash-04-w760.webp', 'lifestyle-glow-06-w760.webp', 'lifestyle-phone-made-08-w760.webp', 'lifestyle-flash-03-w760.webp', 'lifestyle-phone-made-12-w760.webp'];

/**
 * @param {{ hash: string, hash2: string, img: string[] }} p — de gehashte
 *   sessiekenmerken (hashToken) en de beelden die er zijn.
 * @returns {{ sql: string[], r2: Array<[string, string]> }} — de statements, en
 *   per R2-sleutel het bestand uit public/img dat erin moet.
 */
export function studioSeed({ hash, hash2, img }) {
  const ids = Object.values(ORDERS).join(',');
  const sql = [
    `DELETE FROM files WHERE order_id IN (${ids})`,
    `DELETE FROM order_events WHERE order_id IN (${ids})`,
    `DELETE FROM orders WHERE id IN (${ids})`,
    `DELETE FROM customers WHERE email='${VOLT.email}'`,
    `INSERT INTO customers (id, email, name, brand, website, country, vat_number, details_saved_at) VALUES (${VOLT.id}, '${VOLT.email}', 'Mara', 'VOLT', 'https://voltbrand.nl', 'NL', 'NL001234567B01', '2026-07-20')`,
    `DELETE FROM account_sessions WHERE customer_id=${VOLT.id}`,
    `INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (${VOLT.id}, '${hash}', datetime('now'), datetime('now', '+30 days'))`,
    `DELETE FROM orders WHERE customer_id=${VOLT.id}`,
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, window_start, window_end, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, window_expires_at, customer_note, customer_note_at)
     VALUES (${ORDERS.catalog}, 'VIS-2609-4471', ${VOLT.id}, 'catalog', 'in_production', 'Mara', 'VOLT', '${VOLT.email}', 63000, 'nl', '2026-09-01 10:12', 'attended', 30, '2026-09-08', '2026-09-10', 'paid', 'mollie', '2026-09-01', 13230, 0.21, 'nl_standard', NULL, 'De achtergronden zetten we op #F2F2F0, zoals je vroeg. De draagfoto van product 12 gebruiken we niet: de mouw hangt daar scheef.', '2026-09-03 14:20')`,
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, vat_cents, vat_rate, vat_treatment, window_expires_at)
     VALUES (${ORDERS.lifestyle}, 'VIS-2609-5102', ${VOLT.id}, 'lifestyle', 'received', 'Mara', 'VOLT', '${VOLT.email}', 32400, 'nl', '2026-09-04 16:40', 'unattended', 12, 'unpaid', 6804, 0.21, 'nl_standard', '2026-09-08 12:00')`,
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, closed_at, delivered_at)
     VALUES (${ORDERS.delivered}, 'VIS-2608-9920', ${VOLT.id}, 'lifestyle', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 32400, 'nl', '2026-08-18', 'attended', 12, 'paid', 'mollie', '2026-08-18', 6804, 0.21, 'nl_standard', '2026-08-24 09:31', '2026-08-22')`,
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment)
     VALUES (${ORDERS.check}, 'VIS-2608-3312', ${VOLT.id}, 'catalog', 'human_check', 'Mara', 'VOLT', '${VOLT.email}', 20800, 'nl', '2026-08-28', 'attended', 8, 'paid', 'mollie', '2026-08-28', 0, 0, 'eu_reverse_charge')`,
    `INSERT INTO orders (id, ref, customer_id, service, status, name, brand, email, total_cents, lang, created_at, tier, product_count, payment_status, payment_provider, paid_at, vat_cents, vat_rate, vat_treatment, delivered_at)
     VALUES (${ORDERS.sample}, 'VIS-2607-1180', ${VOLT.id}, 'test-sample', 'delivered', 'Mara', 'VOLT', '${VOLT.email}', 100, 'nl', '2026-07-19', 'unattended', 1, 'paid', 'mollie', '2026-07-19', 0, 0, 'nl_standard', '2026-07-21')`,
    `INSERT INTO order_events (order_id, status, note, created_at) VALUES (${ORDERS.catalog}, 'received', NULL, '2026-09-01 10:12'), (${ORDERS.catalog}, 'in_production', 'Gestart: 30 producten, catalogusset', '2026-09-03 09:00'), (${ORDERS.check}, 'received', NULL, '2026-08-28'), (${ORDERS.check}, 'in_production', NULL, '2026-08-30'), (${ORDERS.check}, 'human_check', NULL, '2026-09-02'), (${ORDERS.delivered}, 'received', NULL, '2026-08-18'), (${ORDERS.delivered}, 'in_production', NULL, '2026-08-19'), (${ORDERS.delivered}, 'human_check', NULL, '2026-08-21'), (${ORDERS.delivered}, 'delivered', NULL, '2026-08-22'), (${ORDERS.lifestyle}, 'received', NULL, '2026-09-04 16:40')`,
    /* Een lopend Studio-abonnement met twee items op de lijst, zodat /account/plan
       de volle pagina toont en niet alleen het lege scherm. */
    `DELETE FROM plan_queue WHERE customer_id=${VOLT.id}`,
    `DELETE FROM subscription_slots WHERE subscription_id=${SUB_ID}`,
    `DELETE FROM subscriptions WHERE id=${SUB_ID} OR customer_id=${VOLT.id}`,
    `INSERT INTO subscriptions (id, customer_id, ref, plan, term, status, window_day, started_at, amount_cents) VALUES (${SUB_ID}, ${VOLT.id}, 'SUB-VOLT-7070', 'studio', 'monthly', 'active', 8, '2026-07-01', 79000)`,
    `INSERT INTO subscription_slots (subscription_id, month, kind, granted, used) VALUES (${SUB_ID}, strftime('%Y-%m','now'), 'complete', 12, 3)`,
    `INSERT INTO plan_queue (customer_id, position, name, note, upload_batch, kind, locked_at) VALUES (${VOLT.id}, 1, 'Grijze hoodie', 'Voorkant met logo', 'proef-batch-1', 'complete', datetime('now'))`,
    `INSERT INTO plan_queue (customer_id, position, name, note, upload_batch, kind) VALUES (${VOLT.id}, 2, 'Zwarte cargo', NULL, NULL, 'complete')`,
    /* Eén factuur per betaalde bestelling, al uitgegeven: anders probeert de
       facturenpagina ze te MAKEN (pdf renderen, R2) en dat hoort niet in een
       toets van de vorm. De 'in ontwerp' voor de nog onbetaalde komt vanzelf niet. */
    `DELETE FROM invoices WHERE order_id IN (${ids})`,
    ...[[ORDERS.sample, 1, 100, 0, '2026-07-19'], [ORDERS.delivered, 2, 32400, 6804, '2026-08-18'], [ORDERS.check, 3, 20800, 0, '2026-08-28'], [ORDERS.catalog, 4, 63000, 13230, '2026-09-01']].map(([oid, seq, net, vat, dag]) =>
      `INSERT INTO invoices (number, year, seq, order_id, customer_id, status, pdf_key, pdf_bytes, snapshot_json, lang, issued_at, created_at) VALUES ('VIS-2026-70${seq}', 2026, 70${seq}, ${oid}, ${VOLT.id}, 'issued', 'invoices/2026/VIS-2026-70${seq}.pdf', 2310, '${JSON.stringify({ number: `VIS-2026-70${seq}`, date: dag, lang: 'nl', netCents: net, vatCents: vat, grossCents: net + vat, vatRate: vat ? 0.21 : 0, treatment: vat ? 'nl_standard' : (oid === ORDERS.check ? 'eu_reverse_charge' : 'nl_standard'), customer: { name: 'Mara' }, lines: [] })}', 'nl', '${dag} 10:01:05', '${dag} 10:01:03')`),
    `DELETE FROM customers WHERE email='${NOORD.email}'`,
    `INSERT INTO customers (id, email, name, brand, country) VALUES (${NOORD.id}, '${NOORD.email}', 'Jens', 'NOORD', 'NL')`,
    `DELETE FROM account_sessions WHERE customer_id=${NOORD.id}`,
    `INSERT INTO account_sessions (customer_id, token_hash, issued_at, expires_at) VALUES (${NOORD.id}, '${hash2}', datetime('now'), datetime('now', '+30 days'))`,
  ];
  const r2 = [];
  let fid = 70400;
  const SHOTS = ['front', 'back', 'detail', 'worn'];
  for (const [oid, products] of [[ORDERS.delivered, 3], [ORDERS.sample, 1]]) {
    for (let p = 1; p <= products; p++) {
      for (const shot of SHOTS) {
        const key = `proef/${oid}/p${p}-${shot}.webp`;
        sql.push(`INSERT INTO files (id, order_id, kind, r2_key, filename, bytes, expires_at, review_state, product_key, shot) VALUES (${fid}, ${oid}, 'delivery', '${key}', 'VOLT-p${p}-${shot}.webp', 180000, '2026-12-31', '${p === 1 ? 'approved' : 'pending'}', 'p${p}', '${shot}')`);
        if (img.length) r2.push([key, img[(fid + p) % img.length]]);
        fid++;
      }
    }
  }
  return { sql, r2 };
}
