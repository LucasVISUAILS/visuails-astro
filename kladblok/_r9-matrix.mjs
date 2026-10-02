// Ronde 9 · stap 2: de bestelmatrix in de testomgeving. Per cel: ordernummer, bedrag, btw, en of het klopt met pricing.js.
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { ladderRate, OUTFIT_SURCHARGE, HOOG_PER_PRODUCT, EXTRA_PHOTO_LADDER } from '../src/data/pricing.js';

const extraRate = (n) => EXTRA_PHOTO_LADDER.find(([lo, hi]) => n >= lo && (hi === null || n <= hi))[2];
const k = await start();
const { page } = k;
const rij = [];
let teller = 0;

async function cel(naam, o, verwacht) {
  teller += 1;
  await sqlw('DELETE FROM rate_limits').catch(() => {});
  const email = `matrix${Date.now() % 100000}${teller}@merk.test`;
  let r;
  try {
    r = await bestel(page, { land: 'NL', vat: null, ...o, klant: { email, first_name: 'Mats', brand: `Matrix ${teller}`, ...(o.klant || {}) } });
  } catch (e) {
    rij.push({ naam, uitkomst: 'FOUT: ' + String(e.message).slice(0, 140) });
    return null;
  }
  const [d] = await sql(`SELECT ref, service, product_count, total_cents, vat_cents, vat_treatment, review_state, tier, payment_status FROM orders WHERE email='${email}' ORDER BY id DESC LIMIT 1`);
  const stap4 = (r.log.find((l) => l.startsWith('stap4:')) || '').slice(0, 90);
  let klopt = '';
  if (d && verwacht) {
    const net = verwacht.net * 100;
    const okNet = d.total_cents === net;
    const okVat = verwacht.vat === undefined ? true : d.vat_cents === Math.round(net * verwacht.vat);
    klopt = okNet && okVat ? 'klopt' : `AFWIJKING (verwacht netto ${net}${verwacht.vat !== undefined ? `, btw ${Math.round(net * verwacht.vat)}` : ''})`;
  }
  rij.push({ naam, uitkomst: d ? `${d.ref} · ${d.product_count} · netto ${d.total_cents} · btw ${d.vat_cents} · ${d.vat_treatment || '-'}${d.review_state ? ' · btw-lijst ' + d.review_state : ''} · tier ${d.tier} · ${klopt}${stap4 ? ' · ' + stap4 : ''}` : `geen bestelling (api ${r.apiStatus}: ${String(r.apiBody || '').slice(0, 160)})` });
  return { r, d };
}

/* Aantallen: prijs per trede, en de datumstap vanaf 10. */
for (const n of [1, 4, 5, 9, 10, 19, 20]) {
  await cel(`catalog × ${n}`, { pad: '/nl/start/catalog', aantal: n, fotos: 3, wacht: 250 }, { net: n * ladderRate('catalog', n), vat: 0.21 });
}
/* Lifestyle per look. */
for (const look of ['dunes', 'flash', 'glow', 'phone-made']) {
  await cel(`lifestyle ${look} × 1`, { pad: `/nl/start/lifestyle/?style=${look}`, aantal: 1, look }, { net: ladderRate('lifestyle', 1), vat: 0.21 });
}
/* Toeslagen. */
await cel('catalog × 2 + outfit 1', { pad: '/nl/start/catalog', aantal: 2, outfit: 1 }, { net: 2 * 89 + OUTFIT_SURCHARGE, vat: 0.21 });
await cel('catalog × 1 + extra hoek (driekwart)', { pad: '/nl/start/catalog', aantal: 1, angles: ['three-quarter'] }, { net: 89 + extraRate(1), vat: 0.21 });
await cel('lifestyle × 1 + 4K', { pad: '/nl/start/lifestyle/?style=dunes', aantal: 1, look: 'dunes', hires: true }, { net: 109 + HOOG_PER_PRODUCT, vat: 0.21 });
await cel('catalog × 1 + voorrang', { pad: '/nl/start/catalog', aantal: 1, voorrang: true }, null);
/* Land en btw. */
await cel('NL zonder KVK', { pad: '/nl/start/catalog', aantal: 1, stap3: async (p) => { await p.fill('.pl-step.is-current input[name="reg_number"]', '').catch(() => {}); } }, { net: 89, vat: 0.21 });
await cel('DE met geldig btw-nummer', { pad: '/nl/start/catalog', aantal: 1, land: 'DE', vat: 'DE123456789' }, { net: 89 });
await cel('BE met fout btw-nummer', { pad: '/nl/start/catalog', aantal: 1, land: 'BE', vat: 'BE0000000000' }, { net: 89 });
await cel('US (buiten de EU)', { pad: '/nl/start/catalog', aantal: 1, land: 'US' }, { net: 89, vat: 0 });
await cel('particulier (geen zakelijke verklaring)', { pad: '/nl/start/catalog', aantal: 1, stap5: async (p) => { await p.evaluate(() => { const c = document.querySelector('.pl-step.is-current input[name="business_declaration"]'); if (c) { c.required = true; } }); } }, null);
/* Betaaluitkomsten. */
for (const st of ['failed', 'expired', 'canceled']) {
  const c = await cel(`betaling ${st}`, { pad: '/nl/start/catalog', aantal: 1 }, null);
  if (c && /4478|nep-mollie/.test(page.url())) {
    await betaal(page, st).catch(() => {});
    await page.waitForTimeout(3500);
    const kop = await page.evaluate(() => document.querySelector('h1')?.textContent.trim());
    const [d] = await sql(`SELECT payment_status, status FROM orders WHERE ref='${c.d.ref}'`);
    rij.push({ naam: `  → na ${st}`, uitkomst: `bedankpagina "${kop}" · ${d.status}/${d.payment_status}` });
  }
}
for (const x of rij) console.log(`${x.naam.padEnd(40)} ${x.uitkomst}`);
process.exit(0);
