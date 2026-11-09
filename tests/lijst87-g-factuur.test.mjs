/*
 * LIJST 87 · DE FACTUUR — 9 november 2026
 *
 *   B07  de factuur zegt wat er gekocht is: producten, looks, extra hoeken, 4K, eigen look en
 *        voorrang als eigen regels, uit de opbouw die quoteOrder() bij het bestellen maakte
 *        (details.opbouw). Telt het niet op, of is het een aanbetaling: één regel zoals voorheen.
 *   B08  een naam in een ander schrift: het formulier vraagt om Latijnse letters (pattern +
 *        eigen melding), en emoji vallen op de pdf stil weg in plaats van "?" te worden.
 *
 * Echte SQLite en de echte /api/order, nep-Mollie en nep-Resend.
 *   node tests/lijst87-g-factuur.test.mjs
 */
import { readFileSync } from 'node:fs';
import { d1, verseDb } from './lib/d1sqlite.mjs';

let goed = 0, fout = 0;
const ok = (naam, kreeg, wil = true) => {
  const p = JSON.stringify(kreeg) === JSON.stringify(wil);
  if (p) goed++; else fout++;
  console.log(`${p ? ' ok  ' : ' FAIL'} ${naam}${p ? '' : `\n       verwacht ${JSON.stringify(wil)}\n       kreeg    ${JSON.stringify(kreeg)}`}`);
};
const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
  if (u.endsWith('/v2/payments') && String(opts.method).toUpperCase() === 'POST') return json({ id: 'tr_L87', status: 'open', _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_L87' } } }, 201);
  return json({ id: 'msg_test' });
};

const { opbouwVan, quoteOrder } = await import('../src/lib/quote.js');
const { factuurRegels, snapshotFromOrder, creditSnapshotFrom } = await import('../src/lib/invoice.js');
const { renderInvoicePdf, winAnsi } = await import('../src/lib/invoicePdf.js');
const { mutatieVoorDocument } = await import('../src/lib/eboekhouden.js');
const { onRequestPost: bestelPost, SERVER_DETAIL_KEYS } = await import('../functions/api/order.js');
const { TELBARE_ANGLE_IDS } = await import('../src/data/angles.js');
const { HOOG_PER_PRODUCT, LOOK_PRIJS } = await import('../src/data/pricing.js');

console.log('B07 · de opbouw uit de offerte');
{
  const q = quoteOrder({ service: 'catalog', products: 5, extras: 5, voorrang: true });
  const o = opbouwVan(q);
  ok('catalog, 5 producten, 5 extra hoeken, voorrang: drie regels', o.map((r) => r.soort), ['producten', 'hoeken', 'voorrang']);
  ok('  die precies optellen tot het nettobedrag', o.reduce((s, r) => s + r.totalCents, 0), q.netCents);
  ok('  producten: 5 × het tarief', [o[0].qty, o[0].unitCents], [5, Math.round(q.rate * 100)]);
  ok('  voorrang: één regel met de toeslag', [o[2].qty, o[2].totalCents], [1, q.voorrangCents]);
  const l = quoteOrder({ service: 'lifestyle', products: 4, looks: 1, hoogRes: 2 });
  const lo = opbouwVan(l);
  ok('lifestyle met een look en 4K op 2 producten', lo.map((r) => `${r.soort}:${r.qty}x${r.unitCents}`), [`producten:4x${Math.round(l.rate * 100)}`, `looks:1x${LOOK_PRIJS * 100}`, `hoog:2x${HOOG_PER_PRODUCT * 100}`]);
  ok('  en ook die telt op', lo.reduce((s, r) => s + r.totalCents, 0), l.netCents);
  ok('een offerte zonder ladder (geen tarief): geen opbouw', opbouwVan({ products: 1, netCents: 100 }), null);
  ok('telt het niet op, dan geen opbouw', opbouwVan({ ...q, netCents: q.netCents + 1 }), null);
  ok('"opbouw" komt nooit uit het formulier', SERVER_DETAIL_KEYS.has('opbouw'), true);
}

console.log('\nB07 · de regels op de factuur');
{
  const d = { opbouw: [{ soort: 'producten', qty: 5, unitCents: 1900, totalCents: 9500 }, { soort: 'voorrang', qty: 1, unitCents: 4900, totalCents: 4900 }] };
  const r = factuurRegels({ d, net: 14400, svc: 'Catalog', basis: 'Catalog — 5 producten', lang: 'nl' });
  ok('NL: twee regels met aantal en prijs', r.map((x) => [x.description, x.qty, x.unitCents, x.totalCents]), [['Catalog, per product', 5, 1900, 9500], ['Voorrang', 1, 4900, 4900]]);
  const e = factuurRegels({ d, net: 14400, svc: 'Catalog', basis: 'Catalog — 5 products', lang: 'en' });
  ok('EN: "Priority"', e[1].description, 'Priority');
  ok('Lucas paste de prijs aan (telt niet op): één regel', factuurRegels({ d, net: 12000, svc: 'Catalog', basis: 'B', lang: 'nl' }).length, 1);
  ok('een aanbetaling: één regel', factuurRegels({ d, net: 14400, svc: 'Catalog', basis: 'B', lang: 'nl', aanbetaling: true }).length, 1);
  ok('geen opbouw (een oude bestelling): één regel zoals voorheen', factuurRegels({ d: {}, net: 14400, basis: 'Catalog — 5 producten' }), [{ description: 'Catalog — 5 producten', qty: 1, unitCents: 14400, totalCents: 14400 }]);
  ok('een kapotte regel (aantal 0): één regel', factuurRegels({ d: { opbouw: [{ soort: 'producten', qty: 0, unitCents: 1, totalCents: 0 }] }, net: 0, basis: 'B' }).length, 1);
  ok('de naam van de look blijft onder de eerste regel', factuurRegels({ d, net: 14400, svc: 'Lifestyle', basis: 'B', detail: 'Look: Glow', lang: 'nl' })[0].detail, 'Look: Glow');
}

console.log('\nB07 · een echte bestelling, van formulier tot pdf');
{
  const { db } = verseDb(new URL('../schema.sql', import.meta.url));
  const env = { MOLLIE_API_KEY: 'live_abcdefghijklmnopqrstuvwxyz0123', RESEND_API_KEY: 're_test', NOTIFY_EMAIL: 'studio@voorbeeld.test', FROM_EMAIL: 'VISUAILS <orders@visuails.com>', PUBLIC_ORIGIN: 'https://visuails.com', DB: d1(db),
    UPLOADS: { async put() {}, async get() { return null; }, async delete() {}, async head() { return null; } } };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ service: 'catalog', products: '5', name: 'Test Klant', first_name: 'Test', last_name: 'Klant', brand: 'TESTMERK', email: 'factuur@voorbeeld.test', phone: '+31 6 12345678', country: 'NL',
    address_line1: 'Teststraat 1', postal_code: '1234 AB', city: 'Teststad', lang: 'nl', business_declaration: 'yes', business_version: 'v1', no_vat: '1', reg_number: '12345678',
    voorrang: '1', [`angle_${TELBARE_ANGLE_IDS[0]}`]: '1' })) fd.append(k, v);
  await bestelPost({ request: new Request('https://visuails.com/api/order', { method: 'POST', body: fd, headers: { 'cf-connecting-ip': '10.87.7.1' } }), env, waitUntil() {} });
  const o = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 1').get();
  const d = JSON.parse(o.details_json || '{}');
  ok('de bestelling bewaart de opbouw', Array.isArray(d.opbouw) && d.opbouw.map((r) => r.soort), ['producten', 'hoeken', 'voorrang']);
  ok('  en die telt op tot total_cents', d.opbouw.reduce((s, r) => s + r.totalCents, 0), o.total_cents);
  const snap = snapshotFromOrder(o, {}, { number: 'VIS-2026-0087', date: '2026-11-09' });
  ok('de factuur heeft drie regels', snap.lines.length, 3);
  ok('  met de hele bestelling als omschrijving apart', snap.omschrijving, 'Catalog — 5 producten');
  let pdf = null;
  try { pdf = await renderInvoicePdf(snap); } catch (e) { pdf = String(e?.message || e); }
  ok('  en de pdf komt er (regels = subtotaal)', pdf instanceof Uint8Array && pdf.length > 1000, true);
  const cn = creditSnapshotFrom(snap, { number: 'VIS-C-2026-0001', date: '2026-11-10', netCents: o.total_cents });
  ok('de creditnota noemt de bestelling, niet de eerste regel', cn.lines[0].description, 'Catalog — 5 producten — volledig gecrediteerd');
  const m = mutatieVoorDocument({ snap, nummer: 'VIS-2026-0087', datum: '2026-11-09', relatieId: 1, debiteurenId: 2, omzetId: 3, btwCode: 'HOOG_VERK_21', omschrijving: 'Factuur VIS-2026-0087 · Catalog — 5 producten' });
  ok('e-Boekhouden: één mutatieregel per factuurregel', m.rows.length, 3);
}

console.log('\nB08 · andere schriften en emoji');
ok('emoji vallen stil weg', winAnsi('Merk 💖 Shop'), 'Merk Shop');
ok('  ook met huidskleur, ZWJ en vlag', winAnsi('👍🏽 Team 👨‍👩‍👧 🇳🇱'), 'Team');
ok('een letter die we niet kunnen drukken blijft "?"', winAnsi('李华'), '??');
ok('Å, Ø en ß blijven', winAnsi('Åse Øster Straße'), 'Åse Øster Straße');
ok('© blijft (WinAnsi heeft hem)', winAnsi('© Merk'), '© Merk');
const flow = lees('src/components/order/OrderFlow.astro');
const m = flow.match(/const LATIJNS = '([^']+)';/);
ok('OrderFlow: één pattern voor Latijnse letters', !!m, true);
for (const veld of ['first_name', 'last_name', 'brand', 'address_line1', 'address_line2', 'city', 'region']) {
  ok(`  ${veld}: pattern en eigen melding`, new RegExp(`name="${veld}"[^>]*pattern=\\{LATIJNS\\} data-pl-err-vorm=\\{f\\.s3\\.latijnsVorm\\}`).test(flow), true);
}
ok('  de melding in beide talen', /latijnsVorm: 'Schrijf dit in Latijnse letters \(a tot z\): het komt op de factuur\.'/.test(flow) && /latijnsVorm: 'Please use Latin letters \(a to z\) here: this goes on the invoice\.'/.test(flow), true);
if (m) {
  /* De browser compileert een pattern met de v-vlag (nieuw) of de u-vlag (ouder), en zet er ^(?: )$ omheen. */
  const bron = m[1].replace(/\\\\/g, '\\');
  for (const vlag of ['v', 'u']) {
    let re = null;
    try { re = new RegExp(`^(?:${bron})$`, vlag); } catch { re = null; }
    ok(`  het pattern compileert met de ${vlag}-vlag`, !!re, true);
    if (!re) continue;
    ok(`  ${vlag}: Latijn, accenten, cijfers, leestekens en emoji mogen`, ['Müller & Zoon', "O'Brien, c/o 2e", 'Łódź 12-B', 'Café ☕️', 'Straße 5'].every((s) => re.test(s)), true);
    ok(`  ${vlag}: Arabisch, Chinees en Cyrillisch niet`, ['محمد', '李华', 'Иван'].some((s) => re.test(s)), false);
  }
}

console.log(`\n${goed} goed, ${fout} fout`);
if (fout) process.exit(1);
