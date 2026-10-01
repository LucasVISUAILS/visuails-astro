// Ronde 5 · A2: tegoed automatisch verrekenen, in de echte browser.
import { start, foto, tekst, sql, sqlw, paneel, mails, SITE } from './_dl.mjs';
import { bestel, betaal } from './_bestel.mjs';
import { VOLT } from '../tests/lib/studio-seed.mjs';

const uit = (...a) => console.log(...a);
await sqlw(`DELETE FROM customer_credits WHERE customer_id = ${VOLT.id}`);
await sqlw(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${VOLT.id}, 5000, 'Tegoed na annulering van VIS-PROEF')`);

const s = await start({ cookie: VOLT.token });
const { page } = s;

uit('## 1 · deels met tegoed (€ 50 tegoed, catalog 1 product)');
const r1 = await bestel(page, {
  pad: '/nl/start/catalog', aantal: 1, fotos: 3, model: null, klant: { email: VOLT.email }, vat: 'NL005407575B96',
  stap3: async (p) => { await p.waitForTimeout(300); },
});
uit(r1.log.join('\n'));
uit('tegoedregel:', (r1.overzicht.match(/.*tegoed.*/gi) || []).join(' / '));
uit('api', r1.apiStatus, r1.url);
const o1 = await sql(`SELECT id, ref, total_cents, vat_cents, payment_status, details_json FROM orders WHERE customer_id = ${VOLT.id} ORDER BY id DESC LIMIT 1`);
uit(JSON.stringify(o1));
const betalingen = await paneel('/payments');
uit('laatste nep-betaling:', JSON.stringify(betalingen[betalingen.length - 1]).slice(0, 300));
if (/checkout/.test(page.url())) { uit('betalen →', await betaal(page)); }
await page.waitForTimeout(1500);
uit(await sql(`SELECT delta_cents, reason, order_id FROM customer_credits WHERE customer_id = ${VOLT.id} ORDER BY id`));
uit(await sql(`SELECT number, status, snapshot_json FROM invoices WHERE order_id = (SELECT MAX(id) FROM orders WHERE customer_id = ${VOLT.id})`).then((r) => JSON.stringify(r).slice(0, 500)));
await foto(page, 'r5-tegoed-na-betalen', { vol: true });

uit('\n## 2 · helemaal met tegoed (€ 500 tegoed erbij)');
await sqlw(`INSERT INTO customer_credits (customer_id, delta_cents, reason) VALUES (${VOLT.id}, 50000, 'Coulance proef')`);
const voorMails = (await mails()).length;
const r2 = await bestel(page, { pad: '/nl/start/catalog', aantal: 1, fotos: 3, model: null, klant: { email: VOLT.email }, vat: 'NL005407575B96' });
uit('tegoedregel:', (r2.overzicht.match(/.*tegoed.*/gi) || []).join(' / '));
uit('api', r2.apiStatus, r2.url);
uit((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').slice(0, 600));
uit(await sql(`SELECT id, ref, payment_status, payment_provider, details_json FROM orders WHERE customer_id = ${VOLT.id} ORDER BY id DESC LIMIT 1`));
uit(await sql(`SELECT delta_cents, reason FROM customer_credits WHERE customer_id = ${VOLT.id} ORDER BY id`));
for (const m of (await mails()).slice(voorMails)) uit(`MAIL → ${JSON.stringify(m.to)} "${m.subject}"`);
await foto(page, 'r5-tegoed-volledig', { vol: true });

uit('\n## 3 · Studio-tegel');
await page.goto(SITE + '/account', { waitUntil: 'load' });
uit((await tekst(page, 'main')).replace(/\n{2,}/g, '\n').match(/.{0,80}[Tt]egoed.{0,200}/g));
uit('fouten:', s.fouten);
await s.stop();
