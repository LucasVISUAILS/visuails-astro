// Ronde 9 · F52: ingelogde klant met tegoed — stap 5 noemt het bedrag dat Mollie echt vraagt.
import { start, SITE, sql, sqlw } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { studioLogin } from './_studio.mjs';
const email = `boos${Date.now() % 100000}@merk.test`;
const k = await start(); const { page } = k;
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Boris', brand: 'Merk Boos' }, land: 'NL', vat: null });
if (page.url().includes('nep-mollie')) await betaal(page);
const [c] = await sql(`SELECT id FROM customers WHERE email='${email}'`);
await sqlw(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${c.id}, 2500, 'TEST goodwill')`);
await studioLogin(page, email);
let rij = '';
await bestel(page, { pad: '/nl/start/catalog', aantal: 1, klant: { email, first_name: 'Boris', brand: 'Merk Boos' }, land: 'NL', vat: null, stap5: async (p) => {
  rij = await p.evaluate(() => [...document.querySelectorAll('.pl-step.is-current dt, .pl-step.is-current dd')].map((e) => e.textContent.trim()).join(' | ').match(/Je betaalt bij Mollie[^|]*\|[^|]*\|[^|]*\|[^|]*/)?.[0] || '(geen)');
} });
console.log('stap 5:', rij);
process.exit(0);
