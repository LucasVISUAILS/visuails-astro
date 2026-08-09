/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * FACTUREN UITGEVEN
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * De site belooft op vijf plekken een factuur en maakte er nooit één. Dit bestand
 * is de administratie: het geeft een nummer uit, bouwt de momentopname, laat
 * invoicePdf.js er een pdf van maken en legt die in R2.
 *
 * ── DE ENIGE REGEL DIE ECHT VASTSTAAT ────────────────────────────────────────
 *
 * Een factuurnummer wordt uitgegeven en daarna nooit meer teruggegeven. Niet bij
 * een mislukte pdf, niet bij een fout in R2, niet bij een klant die zijn
 * bestelling annuleert. De reeks mag geen gaten hebben, want een gat leest bij een
 * controle als een verdwenen factuur.
 *
 * Daarom staat het uitgeven van het nummer en het maken van de pdf niet in
 * dezelfde stap. Eerst een rij met status 'pending' — het nummer is dan van deze
 * bestelling en van geen andere. Daarna de pdf. Lukt die niet, dan blijft de rij
 * 'pending' staan en kan hij later met HETZELFDE nummer opnieuw. Zie migratie
 * 0021 voor de rest van dat argument.
 *
 * ── WAAROM DE MOMENTOPNAME WORDT BEWAARD ─────────────────────────────────────
 *
 * `snapshot_json` bevat de volledige invoer van renderInvoicePdf(). Een factuur is
 * een momentopname en geen berekening: verandert je staffel volgend jaar, dan moet
 * de factuur van vandaag nog steeds zeggen wat er vandaag is afgesproken. Zonder
 * die momentopname zou hij meebewegen met de prijslijst, en dan is het geen
 * factuur meer maar een rapport.
 */

import { renderInvoicePdf } from './invoicePdf.js';
import { composeAddress } from '../data/address.js';
import { VAT_TREATMENT } from '../data/vat.js';
import { serviceLabel } from '../data/services.js';

/** Ons eigen adres en onze nummers. Uit env waar dat kan, met een vaste terugval. */
function sellerOf(env) {
  return {
    name: 'VISUAILS',
    address: String(env?.SELLER_ADDRESS || 'Voorbeeldstraat 12\n1234 AB Rotterdam')
      .split('\n').map((l) => l.trim()).filter(Boolean),
    vat: env?.VISUAILS_VAT || 'NL005407575B96',
    kvk: env?.VISUAILS_KVK || '99742993',
    email: env?.FROM_EMAIL_ADDRESS || 'hello@visuails.com',
    iban: env?.VISUAILS_IBAN || null,
  };
}

/*
 * Het volgende nummer voor dit jaar.
 *
 * ÉÉN STATEMENT, met RETURNING. Lezen-dan-schrijven in twee stappen is precies
 * hoe twee gelijktijdige bestellingen hetzelfde nummer krijgen: beide lezen 41,
 * beide schrijven 42. SQLite voert een UPDATE als één transactie uit, dus de
 * tweede aanroep leest de waarde die de eerste al heeft verhoogd.
 *
 * De INSERT ervoor maakt de rij voor een nieuw jaar aan. ON CONFLICT DO NOTHING,
 * want twee bestellingen op 1 januari om 00:00 doen dit tegelijk.
 */
async function nextNumber(env, year) {
  await env.DB.prepare(
    'INSERT INTO invoice_series (year, last_number) VALUES (?1, 0) ON CONFLICT(year) DO NOTHING'
  ).bind(year).run();

  const row = await env.DB.prepare(
    `UPDATE invoice_series
        SET last_number = last_number + 1, updated_at = datetime('now')
      WHERE year = ?1
      RETURNING last_number`
  ).bind(year).first();

  if (!row || !Number.isInteger(row.last_number)) {
    throw new Error('invoice: kon geen nummer uitgeven voor ' + year);
  }
  return row.last_number;
}

/** 'VIS-2026-0001'. Vier cijfers, want een reeks die op 10000 komt is een luxeprobleem. */
export function formatNumber(year, seq) {
  return `VIS-${year}-${String(seq).padStart(4, '0')}`;
}

/*
 * De momentopname uit een bestelling.
 *
 * Alles komt uit de order zelf. De regels worden NIET opnieuw uitgerekend uit de
 * prijslijst — dat is het hele punt van een momentopname, en het is ook wat een
 * factuur juridisch onderscheidt van een pagina die een bedrag toont.
 */
export function snapshotFromOrder(order, env, { number, date, dueDate = null } = {}) {
  const lang = order.lang === 'en' ? 'en' : 'nl';
  const net = Number(order.total_cents) || 0;
  const vat = Number(order.vat_cents) || 0;

  // composeAddress() verwacht losse velden, geen orderrij — die namen komen niet
  // overeen met de kolommen, dus hier expliciet omzetten. Eén bron voor de vorm
  // van een adres (drie regels, postcode en plaats samen), zie address.js.
  const address = String(composeAddress({
    line1: order.address_line1,
    line2: order.address_line2,
    postal: order.postal_code,
    city: order.city,
    region: order.region,
  }) || '').split('\n').map((l) => l.trim()).filter(Boolean);

  /*
   * Eén regel voor de bestelling. Een uitsplitsing per product zou een tweede
   * waarheid over de prijs zijn, en die staat al in de bestelling zelf.
   *
   * ── DE DIENSTNAAM UIT services.js, NIET UIT DE KOLOM (9 augustus 2026) ──────
   *
   * Hier stond `${order.service}`, en op VIS-2026-0001 kwam dat eruit als
   * "catalog — 1 product": het slug uit de database, kleine letter, op een
   * factuur. Precies de fout die de header van src/data/services.js bij naam
   * noemt — daar was het "Dienst: catalog" in de bestelbevestiging — met de
   * conclusie dat een derde eigen kopie van die namen is hoe de tweede ontstond.
   * Dit was de vierde aanroeper die eromheen ging.
   *
   * serviceLabel() geeft null bij een onbekende dienst en dan valt dit terug op de
   * kolom. Dat is de regel van dat bestand en hij blijft hier gelden: liever het
   * ruwe slug dan een naam die wij verzinnen, want een blanco of een slug is
   * zichtbaar mis en een gok niet.
   */
  const svc = serviceLabel(order.service, lang) || order.service;
  const n = order.product_count || 1;
  const label = lang === 'nl'
    ? `${svc} — ${n} product${n === 1 ? '' : 'en'}`
    : `${svc} — ${n} product${n === 1 ? '' : 's'}`;

  return {
    number,
    date,
    dueDate,
    lang,
    seller: sellerOf(env),
    customer: {
      name: [order.first_name, order.last_name].filter(Boolean).join(' ') || order.name || '',
      company: order.brand || null,
      address,
      country: order.country || null,
      vat: order.vat_number || null,
    },
    lines: [{ description: label, qty: 1, unitCents: net, totalCents: net }],
    netCents: net,
    vatRate: Number(order.vat_rate) || 0,
    vatCents: vat,
    grossCents: net + vat,
    treatment: order.vat_treatment || VAT_TREATMENT.standard,
    reference: order.ref,
    paidAt: order.paid_at ? String(order.paid_at).slice(0, 10) : null,
    viesConsultation: order.vat_consultation || null,
  };
}

/*
 * Geef een factuur uit voor deze bestelling, of geef de bestaande terug.
 *
 * IDEMPOTENT. Twee keer aanroepen levert één factuur op. Dat is niet netjesheid
 * maar noodzaak: dit wordt aangeroepen vanuit de betaalwebhook, en Mollie levert
 * dezelfde melding meer dan één keer af.
 *
 * `today` komt van buiten en niet uit new Date(), zodat dit te testen is en zodat
 * de factuurdatum die van de betaling kan zijn in plaats van die van de retry.
 */
export async function issueInvoice(env, orderId, { today } = {}) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?1').bind(orderId).first();
  if (!order) throw new Error('invoice: bestelling ' + orderId + ' bestaat niet');

  const existing = await env.DB.prepare(
    'SELECT * FROM invoices WHERE order_id = ?1'
  ).bind(orderId).first();

  // Al klaar? Dan niets. Geen tweede nummer, geen tweede pdf.
  if (existing && existing.status === 'issued') return existing;

  const date = String(today || order.paid_at || '').slice(0, 10) || null;
  if (!date) throw new Error('invoice: geen datum voor bestelling ' + orderId);
  const year = Number(date.slice(0, 4));

  // Bestaat er al een nummer maar geen pdf, dan gebruiken we DAT nummer opnieuw.
  // Een tweede uitgeven zou een gat in de reeks achterlaten op de plek van de
  // eerste poging.
  let row = existing;
  if (!row) {
    const seq = await nextNumber(env, year);
    const number = formatNumber(year, seq);
    const snap = snapshotFromOrder(order, env, { number, date });
    await env.DB.prepare(
      `INSERT INTO invoices (number, year, seq, order_id, customer_id, status, snapshot_json, lang)
       VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6, ?7)`
    ).bind(number, year, seq, orderId, order.customer_id || null,
           JSON.stringify(snap), snap.lang).run();
    row = await env.DB.prepare('SELECT * FROM invoices WHERE order_id = ?1').bind(orderId).first();
  }

  // De pdf uit de BEWAARDE momentopname, niet uit de order. Bij een tweede poging
  // moet er hetzelfde uitkomen, ook als de bestelling inmiddels is bijgewerkt.
  const snap = JSON.parse(row.snapshot_json);
  const pdf = await renderInvoicePdf(snap);
  const key = `invoices/${row.year}/${row.number}.pdf`;

  await env.UPLOADS.put(key, pdf, {
    httpMetadata: { contentType: 'application/pdf' },
    customMetadata: { invoice: row.number, order: String(orderId) },
  });

  await env.DB.prepare(
    `UPDATE invoices
        SET status = 'issued', pdf_key = ?1, pdf_bytes = ?2, issued_at = datetime('now')
      WHERE id = ?3 AND status = 'pending'`
  ).bind(key, pdf.length, row.id).run();

  return await env.DB.prepare('SELECT * FROM invoices WHERE id = ?1').bind(row.id).first();
}
