// Ronde 9 · stap 2.9: twee tabbladen tegelijk, zelfde bezoeker — twee bestellingen, elk met zijn eigen foto's.
import { start, sql, sqlw } from './_dl.mjs';
import { bestel } from './_bestel.mjs';
const k = await start();
const a = k.page;
const b = await k.ctx.newPage();
await sqlw('DELETE FROM rate_limits');
const email = `tabs${Date.now() % 100000}@merk.test`;
const klant = { email, first_name: 'Tabitha', brand: 'Merk Tabs' };
/* Tegelijk: beide tabbladen lopen door het formulier, met verschillende aantallen. */
const [ra, rb] = await Promise.all([
  bestel(a, { pad: '/nl/start/catalog', aantal: 1, naam: 'Tab A', klant, land: 'NL', vat: null }),
  bestel(b, { pad: '/nl/start/catalog', aantal: 2, naam: 'Tab B', klant, land: 'NL', vat: null }),
]);
console.log('api', ra.apiStatus, rb.apiStatus);
const rijen = await sql(`SELECT o.ref, o.product_count, o.total_cents, (SELECT COUNT(*) FROM files f WHERE f.order_id = o.id AND f.kind = 'upload') AS fotos, o.details_json FROM orders o WHERE o.email='${email}' ORDER BY o.id`);
for (const r of rijen) {
  const d = JSON.parse(r.details_json || '{}');
  console.log(`${r.ref} · ${r.product_count} product(en) · ${r.total_cents} · ${r.fotos} foto's · namen: ${Object.keys(d).filter((x) => /^product_p\d+$/.test(x)).map((x) => d[x]).join(', ')}`);
}
process.exit(0);
